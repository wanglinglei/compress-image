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
  /**
   * 最小文件大小（单位：字节），默认为 20KB (20 * 1024)。
   * 小于此大小的文件将被跳过。
   */
  minSize?: number;
  /**
   * 是否启用空跑模式。
   * 如果为 true，将只打印将要压缩的文件，不执行实际压缩。
   */
  dryRun?: boolean;
  /**
   * 是否启用自动备份。
   * 如果为 true，将在压缩前备份源文件。仅备份被压缩的文件。
   * 备份文件将存储在项目根目录下的 .tinify-backup 目录中。
   */
  backup?: boolean;
}

export interface CacheData {
  [filepath: string]: string; // filepath -> md5 hash
}
