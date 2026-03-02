import tinify from 'tinify';
import fg from 'fast-glob';
import fs from 'fs-extra';
import path from 'path';
import micromatch from 'micromatch';
import { ResizeOptions, CompressOptions, CacheData } from './types';
import { getFileHash, loadCache, saveCache } from './utils';

export * from './types';

export class TinifyWrapper {
  private cacheFilePath: string;
  private cache: CacheData = {};

  constructor(apiKey: string) {
    tinify.key = apiKey;
    this.cacheFilePath = path.resolve(process.cwd(), '.tinify-cache.json');
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
    const { targetDir, whitelist = [], outputDir } = options;
    const absTargetDir = path.resolve(targetDir);
    const cwd = process.cwd();
    
    // 查找所有图片
    const images = await fg(['**/*.{png,jpg,jpeg,webp}'], {
      cwd: absTargetDir,
      absolute: true,
    });

    if (images.length === 0) {
      console.log('目标目录中未找到图片。');
      return;
    }

    console.log(`在 ${absTargetDir} 中找到 ${images.length} 张图片`);

    this.cache = await loadCache(this.cacheFilePath);
    let processedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const imagePath of images) {
      // 获取相对于 CWD 的路径，用于匹配白名单
      const relativeToCwd = path.relative(cwd, imagePath);
      // 获取相对于 targetDir 的路径，用于显示和输出结构
      const relativeToTarget = path.relative(absTargetDir, imagePath);
      
      // 检查白名单 (使用 micromatch 支持通配符)
      // 我们同时检查相对于 CWD 的路径和相对于 targetDir 的路径，以提供灵活性
      const isWhitelisted = micromatch.isMatch(relativeToCwd, whitelist) || 
                            micromatch.isMatch(relativeToTarget, whitelist) ||
                            micromatch.isMatch(imagePath, whitelist);

      if (isWhitelisted) {
        console.log(`跳过白名单文件: ${relativeToTarget}`);
        skippedCount++;
        continue;
      }

      try {
        const currentHash = await getFileHash(imagePath);
        
        // 检查是否已压缩
        // 我们使用相对于 CWD 的路径作为键，以保持跨机器（如果 CWD 是项目根目录）的一致性
        const cacheKey = relativeToCwd;

        if (this.cache[cacheKey] === currentHash) {
          console.log(`跳过已压缩文件: ${relativeToTarget}`);
          skippedCount++;
          continue;
        }

        console.log(`正在压缩: ${relativeToTarget}...`);
        
        const destinationPath = outputDir 
          ? path.join(path.resolve(outputDir), relativeToTarget)
          : imagePath;

        // 确保目标目录存在
        await fs.ensureDir(path.dirname(destinationPath));

        await this.compressFile(imagePath, destinationPath);
        
        // 更新缓存
        let newHash = currentHash;
        if (!outputDir || path.resolve(outputDir) === absTargetDir) {
            // 覆盖模式：计算新文件的哈希值
            newHash = await getFileHash(destinationPath);
        }
        
        this.cache[cacheKey] = newHash;
        processedCount++;
        
      } catch (err) {
        console.error(`压缩 ${relativeToTarget} 时出错:`, err);
        errorCount++;
      }
    }

    await saveCache(this.cacheFilePath, this.cache);
    
    console.log('\n压缩完成。');
    console.log(`已处理: ${processedCount}`);
    console.log(`已跳过: ${skippedCount}`);
    console.log(`错误: ${errorCount}`);
  }
}

export default TinifyWrapper;
