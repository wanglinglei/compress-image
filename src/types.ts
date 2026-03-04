export interface ResizeOptions {
  method: 'scale' | 'fit' | 'cover' | 'thumb';
  width?: number;
  height?: number;
}

export interface CompressOptions {
  /**
   * 目标目录路径
   */
  targetDir: string;
  /**
   * 白名单路径数组。支持 glob 通配符模式（例如：'**\/*.min.png', 'assets/ignore/**'）。
   * 匹配的文件或目录将被跳过。
   */
  whitelist?: string[];
  /**
   * 输出目录。如果未设置，将覆盖源文件
   */
  outputDir?: string;
  /**
   * 并发数，默认为 5
   */
  concurrency?: number;
}

export interface CacheData {
  [filepath: string]: string; // filepath -> md5 hash
}
