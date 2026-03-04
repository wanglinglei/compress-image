# compress-image

[English](README.md) | [中文](README.zh-CN.md)

一个基于 Tinify API (TinyPNG/TinyJPG) 的 TypeScript 封装库，专为前端静态资源压缩设计。

## 特性

- **目录压缩**：递归压缩指定目录下的所有图片。
- **白名单**：支持使用 glob 通配符跳过指定的文件或目录。
- **增量压缩**：基于文件内容哈希，自动跳过已压缩且未修改的文件。
- **输出控制**：支持覆盖源文件或输出到新目录。
- **元数据保留**：支持保留版权、创建日期和地理位置信息。
- **并发控制**：支持并行压缩多张图片。
- **文件大小阈值**：跳过小于指定大小的文件。
- **交互式进度条**：提供可视化的压缩进度反馈。

## 安装

```bash
npm install compress-image
```

## 使用方法

首先，你需要从 [Tinify](https://tinify.com/developers) 获取一个 API Key。

### 压缩目录

这是用于压缩前端资源的核心功能。

```typescript
import { TinifyWrapper } from 'compress-image';
import path from 'path';

const tinify = new TinifyWrapper('YOUR_API_KEY');

// 压缩 'src/assets' 目录下的所有图片
await tinify.compressDirectory({
  targetDir: 'src/assets',
  // 可选：白名单，跳过指定文件或目录
  // 支持 glob 通配符 (例如: '**/*.min.png', 'assets/ignore/**')
  whitelist: [
    'src/assets/icons/skip-this.png',
    'src/assets/large-images/**',
    '**/*.min.png'
  ],
  // 可选：输出目录。如果未设置，将覆盖源文件
  // outputDir: 'dist/assets',
  
  // 可选：并发数（默认：5）
  concurrency: 5,
  
  // 可选：最小文件大小，单位字节（默认：20KB）
  // 小于此大小的文件将被跳过
  minSize: 10 * 1024
});
```

工具会在项目根目录自动生成 `.tinify-cache.json` 文件来记录已压缩的文件。后续运行将自动跳过未变更的文件。

### 基本使用（单文件）

```typescript
// 压缩文件
await tinify.compressFile('input.png', 'output.png');

// 压缩 Buffer
const inputBuffer = fs.readFileSync('input.png');
const compressedBuffer = await tinify.compressBuffer(inputBuffer);
fs.writeFileSync('output_buffer.png', compressedBuffer);

// 从 URL 压缩
const compressedUrlBuffer = await tinify.compressUrl('https://tinypng.com/images/panda-happy.png');
fs.writeFileSync('output_url.png', compressedUrlBuffer);
```

### 调整大小

```typescript
// 调整文件大小
await tinify.resizeFile('input.png', 'resized.png', {
  method: 'fit',
  width: 150,
  height: 100
});
```

### 保留元数据

```typescript
// 保留元数据（版权、创建时间、位置）
await tinify.preserveMetadataFile('input.jpg', 'output_meta.jpg', ['copyright', 'creation']);
```

### 验证和压缩统计

```typescript
// 验证 API Key
try {
  await tinify.validate();
  console.log('API key is valid');
} catch (err) {
  console.error('Validation failed:', err);
}

// 获取本月压缩次数
const count = tinify.compressionCount;
console.log(`Compressions this month: ${count}`);
```

## 许可证

ISC
