import fs from 'fs-extra';
import crypto from 'crypto';
import { CacheData } from './types';

/**
 * 计算文件的 MD5 哈希值
 */
export async function getFileHash(filePath: string): Promise<string> {
  const buffer = await fs.readFile(filePath);
  const hashSum = crypto.createHash('md5');
  hashSum.update(buffer);
  return hashSum.digest('hex');
}

/**
 * 从文件加载缓存
 */
export async function loadCache(cacheFilePath: string): Promise<CacheData> {
  if (await fs.pathExists(cacheFilePath)) {
    try {
      return await fs.readJson(cacheFilePath);
    } catch (error) {
      console.warn('加载缓存文件失败，将使用空缓存。');
      return {};
    }
  }
  return {};
}

/**
 * 将缓存保存到文件
 */
export async function saveCache(cacheFilePath: string, cache: CacheData): Promise<void> {
  await fs.writeJson(cacheFilePath, cache, { spaces: 2 });
}
