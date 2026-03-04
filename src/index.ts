import tinify from 'tinify';
import fg from 'fast-glob';
import fs from 'fs-extra';
import path from 'path';
import micromatch from 'micromatch';
import pLimit from 'p-limit';
import chalk from 'chalk';
import cliProgress from 'cli-progress';
import { ResizeOptions, CompressOptions, CacheData } from './types';
import { getFileHash, loadCache, saveCache } from './utils';

export * from './types';

export class TinifyWrapper {
  private cacheFilePath: string;
  private cache: CacheData = {};

  constructor(apiKey: string) {
    tinify.key = apiKey;
    // 默认路径逻辑修改：尝试获取执行脚本的目录
    const entryScript = process.argv[1];
    const baseDir = entryScript ? path.dirname(entryScript) : process.cwd();
    this.cacheFilePath = path.resolve(baseDir, '.tinify-cache.json');
  }

  /**
   * 验证 API 密钥
   */
  async validate(): Promise<void> {
    return tinify.validate();
  }

  /**
   * 获取当前月份的压缩次数
   */
  get compressionCount(): number | undefined {
    return tinify.compressionCount;
  }

  /**
   * 压缩本地文件并保存到另一个路径
   */
  async compressFile(sourcePath: string, destinationPath: string): Promise<void> {
    const source = tinify.fromFile(sourcePath);
    await source.toFile(destinationPath);
  }

  /**
   * 压缩 Buffer 并返回压缩后的 Buffer
   */
  async compressBuffer(buffer: Buffer): Promise<Buffer> {
    const source = tinify.fromBuffer(buffer);
    const result = await source.toBuffer();
    return Buffer.from(result);
  }

  /**
   * 从 URL 压缩图片并返回压缩后的 Buffer
   */
  async compressUrl(url: string): Promise<Buffer> {
    const source = tinify.fromUrl(url);
    const result = await source.toBuffer();
    return Buffer.from(result);
  }

  /**
   * 调整文件大小并保存到目标路径
   */
  async resizeFile(sourcePath: string, destinationPath: string, options: ResizeOptions): Promise<void> {
    const source = tinify.fromFile(sourcePath);
    const resized = source.resize(options);
    await resized.toFile(destinationPath);
  }

  /**
   * 调整 Buffer 大小并返回调整后的 Buffer
   */
  async resizeBuffer(buffer: Buffer, options: ResizeOptions): Promise<Buffer> {
    const source = tinify.fromBuffer(buffer);
    const resized = source.resize(options);
    const result = await resized.toBuffer();
    return Buffer.from(result);
  }

  /**
   * 保留文件元数据并保存到目标路径
   */
  async preserveMetadataFile(sourcePath: string, destinationPath: string, preserve: string[]): Promise<void> {
    const source = tinify.fromFile(sourcePath);
    const preserved = source.preserve(...preserve);
    await preserved.toFile(destinationPath);
  }

  /**
   * 保留 Buffer 元数据并返回 Buffer
   */
  async preserveMetadataBuffer(buffer: Buffer, preserve: string[]): Promise<Buffer> {
    const source = tinify.fromBuffer(buffer);
    const preserved = source.preserve(...preserve);
    const result = await preserved.toBuffer();
    return Buffer.from(result);
  }

  /**
   * 根据配置压缩目录中的所有图片
   */
  async compressDirectory(options: CompressOptions): Promise<void> {
    const { targetDir, whitelist = [], outputDir, concurrency = 5, minSize = 20 * 1024, dryRun = false, backup = false } = options;
    const absTargetDir = path.resolve(targetDir);
    const cwd = process.cwd();
    
    // 查找所有图片
    const images = await fg(['**/*.{png,jpg,jpeg,webp}'], {
      cwd: absTargetDir,
      absolute: true,
    });

    if (images.length === 0) {
      console.log(chalk.yellow('目标目录中未找到图片。'));
      return;
    }

    console.log(chalk.blue(`在 ${absTargetDir} 中找到 ${images.length} 张图片`));
    if (dryRun) {
        console.log(chalk.magenta('=== 空跑模式 (Dry Run) 已启用 ==='));
    }

    this.cache = await loadCache(this.cacheFilePath);
    
    let processedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    const limit = pLimit(concurrency);
    const tasks = [];

    // 创建进度条
    const bar = new cliProgress.SingleBar({
        format: '进度 |' + chalk.cyan('{bar}') + '| {percentage}% || {value}/{total} 文件 || 正在处理: {file}',
        barCompleteChar: '\u2588',
        barIncompleteChar: '\u2591',
        hideCursor: true,
        clearOnComplete: false
    });

    bar.start(images.length, 0, {
        file: '准备中...'
    });

    for (const imagePath of images) {
      tasks.push(limit(async () => {
        // 获取相对于 CWD 的路径，用于匹配白名单
        const relativeToCwd = path.relative(cwd, imagePath);
        // 获取相对于 targetDir 的路径，用于显示和输出结构
        const relativeToTarget = path.relative(absTargetDir, imagePath);
        
        // 更新进度条上的文件名 (不增加进度)
        bar.increment(0, {
            file: relativeToTarget
        });

        // 检查白名单 (使用 micromatch 支持通配符)
        const isWhitelisted = micromatch.isMatch(relativeToCwd, whitelist) || 
                              micromatch.isMatch(relativeToTarget, whitelist) ||
                              micromatch.isMatch(imagePath, whitelist);

        if (isWhitelisted) {
          skippedCount++;
          bar.increment(1);
          return;
        }

        try {
          // 检查文件大小
          const stats = await fs.stat(imagePath);
          if (stats.size < minSize) {
            skippedCount++;
            bar.increment(1);
            return;
          }

          const currentHash = await getFileHash(imagePath);
          
          // 检查是否已压缩
          // 只要当前文件哈希在缓存中（无论是作为源文件还是压缩文件），就跳过
          if (this.cache[currentHash]) {
            skippedCount++;
            bar.increment(1);
            return;
          }

          // 如果是空跑模式，直接跳过实际压缩
          if (dryRun) {
            processedCount++;
            bar.increment(1);
            return;
          }

          const destinationPath = outputDir 
            ? path.join(path.resolve(outputDir), relativeToTarget)
            : imagePath;

          // 自动备份逻辑
          if (backup) {
            const backupDir = path.resolve(cwd, '.tinify-backup');
            const backupPath = path.join(backupDir, relativeToCwd);
            await fs.ensureDir(path.dirname(backupPath));
            await fs.copy(imagePath, backupPath, { overwrite: true });
          }

          // 确保目标目录存在
          await fs.ensureDir(path.dirname(destinationPath));

          await this.compressFile(imagePath, destinationPath);
          
          // 更新缓存
          // 1. 记录源文件哈希
          this.cache[currentHash] = "source";

          // 2. 记录压缩后文件哈希
          const newHash = await getFileHash(destinationPath);
          this.cache[newHash] = "compressed";
          
          processedCount++;
          bar.increment(1);
          
        } catch (err: any) {
          errorCount++;
          errors.push(`${relativeToTarget}: ${err.message || err}`);
          bar.increment(1);
        }
      }));
    }

    await Promise.all(tasks);
    bar.stop();

    if (!dryRun) {
        await saveCache(this.cacheFilePath, this.cache);
    }
    
    console.log(chalk.green('\n压缩完成！'));
    if (dryRun) {
        console.log(chalk.magenta(`[空跑] 预计处理: ${processedCount}`));
    } else {
        console.log(chalk.green(`已处理: ${processedCount}`));
    }
    console.log(chalk.yellow(`已跳过: ${skippedCount}`));
    
    if (errorCount > 0) {
        console.log(chalk.red(`错误: ${errorCount}`));
        console.log(chalk.red('错误详情:'));
        errors.forEach(err => console.log(chalk.red(`- ${err}`)));
    } else {
        console.log(chalk.gray(`错误: ${errorCount}`));
    }

    if (backup && processedCount > 0 && !dryRun) {
        console.log(chalk.cyan(`已备份 ${processedCount} 个文件到 .tinify-backup 目录`));
    }
  }
}

export default TinifyWrapper;
