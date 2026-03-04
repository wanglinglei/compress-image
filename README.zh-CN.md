# compress-image

[English](README.en.md) | [中文](README.md)

一个基于 [Tinify API](https://tinify.com/developers)（TinyPNG / TinyJPG）的 TypeScript 封装库，专为前端静态资源批量压缩而设计。

---

## 目录

- [特性](#特性)
- [安装](#安装)
- [快速开始](#快速开始)
- [核心功能：压缩目录](#核心功能压缩目录)
  - [CompressOptions 配置项详解](#compressoptions-配置项详解)
  - [完整示例](#完整示例)
- [单文件操作](#单文件操作)
  - [压缩文件](#压缩文件)
  - [压缩 Buffer](#压缩-buffer)
  - [从 URL 压缩](#从-url-压缩)
- [调整图片尺寸](#调整图片尺寸)
  - [ResizeOptions 配置项详解](#resizeoptions-配置项详解)
- [保留元数据](#保留元数据)
- [验证与用量统计](#验证与用量统计)
- [缓存机制](#缓存机制)
- [团队协作](#团队协作)
- [许可证](#许可证)

---

## 特性

- **目录批量压缩**：递归扫描并压缩指定目录下的所有 PNG / JPG / JPEG / WebP 图片。
- **白名单跳过**：支持使用 glob 通配符，灵活跳过不需要压缩的文件或目录。
- **增量压缩（智能缓存）**：基于文件内容的 MD5 哈希，自动跳过已压缩且内容未变更的文件，节省 API 调用次数。
- **输出目录控制**：支持覆盖源文件，也支持将压缩结果输出到独立目录，保持源文件不变。
- **并发控制**：可设置并行压缩的最大数量，在速度与 API 限制之间取得平衡。
- **文件大小阈值**：自动跳过小于指定大小的文件，避免对本就很小的图片浪费 API 次数。
- **空跑模式（Dry Run）**：在不实际调用 API 的情况下，预览哪些文件将被压缩。
- **自动备份**：压缩前自动将源文件备份到 `.tinify-backup` 目录，防止意外覆盖。
- **交互式进度条**：压缩过程中提供可视化进度反馈，并实时显示当前处理的文件名。
- **共享缓存**：缓存文件 `.tinify-cache.json` 可提交到 Git，供团队成员共享，避免重复压缩。

---

## 安装

```bash
npm install compress-image
```

---

## 快速开始

### 第一步：获取 API Key

前往 [Tinify 开发者页面](https://tinify.com/developers) 注册并获取免费 API Key。  
> **注意**：Tinify 免费账户每月限制压缩 **500 张**图片。超出后需要付费。

### 第二步：安装并初始化

```typescript
import { TinifyWrapper } from 'compress-image';

const tinify = new TinifyWrapper('YOUR_API_KEY');
```

### 第三步：压缩目录

```typescript
await tinify.compressDirectory({
  targetDir: 'src/assets',
});
```

执行后，工具会：
1. 递归扫描 `src/assets` 目录下所有 `.png`、`.jpg`、`.jpeg`、`.webp` 文件。
2. 跳过小于 20KB（默认）的文件。
3. 通过缓存跳过已压缩且未修改的文件。
4. 用压缩结果**原地覆盖**源文件。
5. 在当前目录生成/更新 `.tinify-cache.json` 缓存文件。

---

## 核心功能：压缩目录

`compressDirectory` 是本库最核心的方法，适合在构建脚本或 CI 流程中批量处理前端静态资源。

```typescript
await tinify.compressDirectory(options: CompressOptions): Promise<void>
```

### CompressOptions 配置项详解

#### `targetDir` (必填)

- **类型**：`string`
- **说明**：要压缩的目标目录路径，支持相对路径和绝对路径。工具会**递归**扫描该目录下所有子目录的图片。

```typescript
// 相对路径（相对于执行脚本的位置）
targetDir: 'src/assets'

// 绝对路径
targetDir: '/Users/me/project/src/assets'
```

---

#### `whitelist` (可选)

- **类型**：`string[]`
- **默认值**：`[]`（不跳过任何文件）
- **说明**：白名单列表，**匹配到的文件将被跳过**，不参与压缩。支持 [glob 通配符](https://github.com/micromatch/micromatch#matching-features)语法，由 [micromatch](https://github.com/micromatch/micromatch) 提供支持。

| 通配符 | 含义 |
|--------|------|
| `*` | 匹配单层目录中的任意字符（不含路径分隔符） |
| `**` | 匹配任意层级的目录 |
| `?` | 匹配单个任意字符 |
| `{a,b}` | 匹配 a 或 b |

```typescript
whitelist: [
  // 跳过某个具体文件（相对于 targetDir 或 cwd 都可以）
  'src/assets/logo.png',

  // 跳过某个目录下的所有文件
  'src/assets/icons/**',

  // 跳过所有以 .min.png 结尾的文件（任意目录层级）
  '**/*.min.png',

  // 跳过所有文件名包含 "original" 的图片
  '**/*original*',

  // 跳过特定扩展名（所有层级）
  '**/*.webp',
]
```

---

#### `outputDir` (可选)

- **类型**：`string`
- **默认值**：`undefined`（覆盖源文件）
- **说明**：压缩结果的输出目录。设置后，压缩后的文件将按照**原有目录结构**输出到此目录，源文件保持不变。若不设置，则直接**覆盖原文件**。

```typescript
// 不设置 outputDir：直接覆盖 src/assets 中的源文件
await tinify.compressDirectory({
  targetDir: 'src/assets',
});

// 设置 outputDir：源文件不变，压缩结果输出到 dist/assets
// src/assets/images/banner.png → dist/assets/images/banner.png
await tinify.compressDirectory({
  targetDir: 'src/assets',
  outputDir: 'dist/assets',
});
```

---

#### `concurrency` (可选)

- **类型**：`number`
- **默认值**：`5`
- **说明**：并发压缩的最大文件数量。提高并发数可加快处理速度，但要注意 Tinify API 的频率限制。建议根据网络状况和图片数量酌情调整，一般设置为 `3`～`10`。

```typescript
concurrency: 3   // 保守设置，适合网络不稳定的环境
concurrency: 5   // 默认值，适合大多数场景
concurrency: 10  // 激进设置，图片数量较多时可加速
```

---

#### `minSize` (可选)

- **类型**：`number`（单位：字节）
- **默认值**：`20480`（即 20KB = 20 × 1024）
- **说明**：文件大小阈值，**小于此大小的文件将被自动跳过**，不消耗 API 次数。对于本就很小的图片（如图标），压缩收益微乎其微，建议跳过。

```typescript
minSize: 0              // 压缩所有文件，不论大小（测试时使用）
minSize: 10 * 1024      // 10KB
minSize: 20 * 1024      // 20KB（默认）
minSize: 100 * 1024     // 100KB，只压缩较大的图片
minSize: 1024 * 1024    // 1MB，只压缩大图
```

---

#### `dryRun` (可选)

- **类型**：`boolean`
- **默认值**：`false`
- **说明**：空跑模式。设置为 `true` 时，工具会**模拟执行**整个流程：扫描文件、检查白名单、检查缓存、检查文件大小，但**不会实际调用 Tinify API**，也不会修改任何文件或更新缓存。

**使用场景**：在真正执行压缩前，先确认哪些文件会被处理，以防误操作。

```typescript
// 第一步：空跑，预览效果
await tinify.compressDirectory({
  targetDir: 'src/assets',
  dryRun: true,  // 不消耗 API 次数，不修改文件
});

// 确认无误后，第二步：正式执行
await tinify.compressDirectory({
  targetDir: 'src/assets',
  dryRun: false,
});
```

---

#### `backup` (可选)

- **类型**：`boolean`
- **默认值**：`false`
- **说明**：自动备份模式。设置为 `true` 时，**在压缩每个文件之前**，会将源文件备份到项目根目录的 `.tinify-backup` 目录中，目录结构与源目录保持一致。

**适用场景**：当 `outputDir` 未设置（即覆盖源文件）时，备份可以保留原始文件，以便在需要时还原。

```typescript
await tinify.compressDirectory({
  targetDir: 'src/assets',
  backup: true,  // 压缩前备份到 .tinify-backup/src/assets/...
});
```

> **注意**：建议将 `.tinify-backup` 添加到 `.gitignore`，避免备份文件被提交到版本库。

---

### 完整示例

```typescript
import { TinifyWrapper } from 'compress-image';

const tinify = new TinifyWrapper(process.env.TINIFY_API_KEY!);

// 验证 API Key
await tinify.validate();
console.log(`本月已压缩：${tinify.compressionCount} 张`);

// 正式压缩
await tinify.compressDirectory({
  // 必填：目标目录
  targetDir: 'src/assets',

  // 可选：白名单（跳过 icons 目录和所有 .min.* 文件）
  whitelist: [
    'src/assets/icons/**',
    '**/*.min.png',
    '**/*.min.jpg',
  ],

  // 可选：输出到独立目录（不覆盖源文件）
  outputDir: 'dist/assets',

  // 可选：并发数
  concurrency: 5,

  // 可选：只压缩大于 20KB 的文件
  minSize: 20 * 1024,

  // 可选：压缩前备份源文件
  backup: true,
});
```

---

## 单文件操作

除了批量目录压缩，本库也提供了单文件级别的操作方法。

### 压缩文件

读取本地文件，压缩后保存到目标路径。

```typescript
await tinify.compressFile(sourcePath: string, destinationPath: string): Promise<void>
```

```typescript
// 压缩 input.png，保存为 output.png
await tinify.compressFile('input.png', 'output.png');

// 覆盖源文件
await tinify.compressFile('assets/banner.png', 'assets/banner.png');
```

---

### 压缩 Buffer

接受图片的 `Buffer` 数据，压缩后返回新的 `Buffer`。适合在内存中处理图片，无需写入临时文件。

```typescript
await tinify.compressBuffer(buffer: Buffer): Promise<Buffer>
```

```typescript
import fs from 'fs';

const inputBuffer = fs.readFileSync('input.png');
const compressedBuffer = await tinify.compressBuffer(inputBuffer);
fs.writeFileSync('output.png', compressedBuffer);
```

---

### 从 URL 压缩

通过图片的 URL 直接拉取并压缩，返回压缩后的 `Buffer`。Tinify 服务器会直接从指定 URL 下载图片，不经过本机。

```typescript
await tinify.compressUrl(url: string): Promise<Buffer>
```

```typescript
const buffer = await tinify.compressUrl('https://example.com/image.png');
fs.writeFileSync('compressed.png', buffer);
```

---

## 调整图片尺寸

Tinify API 支持在压缩的同时调整图片尺寸。

### 调整文件尺寸

```typescript
await tinify.resizeFile(sourcePath: string, destinationPath: string, options: ResizeOptions): Promise<void>
```

```typescript
await tinify.resizeFile('input.png', 'resized.png', {
  method: 'fit',
  width: 300,
  height: 200,
});
```

### 调整 Buffer 尺寸

```typescript
await tinify.resizeBuffer(buffer: Buffer, options: ResizeOptions): Promise<Buffer>
```

```typescript
const inputBuffer = fs.readFileSync('input.png');
const resizedBuffer = await tinify.resizeBuffer(inputBuffer, {
  method: 'scale',
  width: 200,
});
fs.writeFileSync('resized.png', resizedBuffer);
```

### ResizeOptions 配置项详解

#### `method` (必填)

- **类型**：`'scale' | 'fit' | 'cover' | 'thumb'`
- **说明**：调整尺寸的方法。

| 方法 | 说明 |
|------|------|
| `scale` | 按比例缩放。只需提供 `width` 或 `height` 其中之一，另一边自动等比计算。 |
| `fit` | 等比缩放以适应指定尺寸，不裁剪，可能会有留白（不超过指定的宽高）。需同时提供 `width` 和 `height`。 |
| `cover` | 裁剪并缩放以完全覆盖指定尺寸，无留白但可能有内容被裁剪。需同时提供 `width` 和 `height`。 |
| `thumb` | 智能裁剪，自动识别图片中的重要内容区域（如人脸），裁剪时优先保留该区域。需同时提供 `width` 和 `height`。 |

#### `width` (可选)

- **类型**：`number`（单位：像素）
- **说明**：目标宽度。`scale` 模式下 `width` 和 `height` 二选一即可；其他模式需同时提供。

#### `height` (可选)

- **类型**：`number`（单位：像素）
- **说明**：目标高度。`scale` 模式下 `width` 和 `height` 二选一即可；其他模式需同时提供。

```typescript
// 等比缩放，宽度设为 300px，高度自动计算
{ method: 'scale', width: 300 }

// 等比缩放，高度设为 200px，宽度自动计算
{ method: 'scale', height: 200 }

// 缩放以适应 300×200 的区域，保持比例，不裁剪
{ method: 'fit', width: 300, height: 200 }

// 裁剪并缩放，使图片完全覆盖 300×200
{ method: 'cover', width: 300, height: 200 }

// 智能裁剪到 200×200（适合头像等场景）
{ method: 'thumb', width: 200, height: 200 }
```

---

## 保留元数据

默认情况下，Tinify 压缩会删除图片中的所有元数据（EXIF 信息）以减小体积。如需保留特定元数据，可使用以下方法。

### 保留文件元数据

```typescript
await tinify.preserveMetadataFile(
  sourcePath: string,
  destinationPath: string,
  preserve: string[]
): Promise<void>
```

### 保留 Buffer 元数据

```typescript
await tinify.preserveMetadataBuffer(
  buffer: Buffer,
  preserve: string[]
): Promise<Buffer>
```

### 可保留的元数据类型

| 值 | 说明 |
|----|------|
| `'copyright'` | 版权信息（EXIF 中的 Copyright 字段） |
| `'creation'` | 创建日期（EXIF 中的 DateTimeOriginal 等字段） |
| `'location'` | GPS 地理位置信息（仅 JPEG 支持） |

```typescript
// 保留版权和创建时间
await tinify.preserveMetadataFile('input.jpg', 'output.jpg', ['copyright', 'creation']);

// 保留所有支持的元数据
await tinify.preserveMetadataFile('input.jpg', 'output.jpg', ['copyright', 'creation', 'location']);

// 使用 Buffer 方式
const inputBuffer = fs.readFileSync('photo.jpg');
const result = await tinify.preserveMetadataBuffer(inputBuffer, ['copyright']);
fs.writeFileSync('photo_preserved.jpg', result);
```

---

## 验证与用量统计

### 验证 API Key

```typescript
await tinify.validate(): Promise<void>
```

建议在执行批量压缩前先验证 API Key 是否有效，以便及早发现问题。

```typescript
try {
  await tinify.validate();
  console.log('API Key 有效');
} catch (err) {
  console.error('API Key 无效或网络异常：', err);
  process.exit(1);
}
```

### 获取本月压缩次数

```typescript
tinify.compressionCount: number | undefined
```

Tinify 免费账户每月限制 500 次压缩（每个文件计一次）。可通过此属性查看当月已使用的次数，在调用 `validate()` 或任意压缩操作后该值会更新。

```typescript
await tinify.validate();
console.log(`本月已压缩：${tinify.compressionCount} / 500 张`);
```

---

## 缓存机制

为避免重复压缩相同文件，本库引入了基于 **MD5 哈希值**的缓存机制。

### 工作原理

1. **首次压缩**：压缩文件前，计算源文件的 MD5 哈希值，压缩完成后，同时记录源文件哈希和压缩后文件的哈希。
2. **再次运行**：再次扫描到同一文件时，计算其当前哈希值，若已在缓存中，则跳过（无论是作为源文件记录的还是压缩后记录的）。
3. **文件修改后**：如果文件内容被修改，MD5 哈希值会变化，不在缓存中，工具会重新压缩该文件。

### 缓存文件位置

缓存文件 `.tinify-cache.json` 默认创建在**执行脚本所在目录**。

```json
{
  "d41d8cd98f00b204e9800998ecf8427e": "source",
  "098f6bcd4621d373cade4e832627b4f6": "compressed"
}
```

### 缓存文件的 `.gitignore` 配置

- ✅ **推荐**：将 `.tinify-cache.json` **提交到 Git**，团队成员共享缓存，避免协作时重复消耗 API 次数。
- ❌ **不推荐**：将其加入 `.gitignore`，这样每次在新环境或新成员的机器上运行都会重新压缩所有文件。

---

## 团队协作

在多人协作的项目中，推荐以下最佳实践：

### 推荐配置

```gitignore
# .gitignore

# 备份目录不提交
.tinify-backup/

# 缓存文件建议提交（不要加入 .gitignore）
# .tinify-cache.json  ← 不要忽略这个文件
```

### 推荐脚本

在 `package.json` 中添加脚本，方便团队统一执行：

```json
{
  "scripts": {
    "compress": "tsx scripts/compress.ts",
    "compress:dry": "tsx scripts/compress.ts --dry-run"
  }
}
```

创建 `scripts/compress.ts`：

```typescript
import { TinifyWrapper } from 'compress-image';

const apiKey = process.env.TINIFY_API_KEY;
if (!apiKey) {
  console.error('请设置环境变量 TINIFY_API_KEY');
  process.exit(1);
}

const tinify = new TinifyWrapper(apiKey);

await tinify.validate();
console.log(`当前已使用：${tinify.compressionCount} / 500 次`);

await tinify.compressDirectory({
  targetDir: 'src/assets',
  whitelist: ['src/assets/icons/**'],
  minSize: 20 * 1024,
  concurrency: 5,
  backup: false,
});
```

### 使用环境变量管理 API Key

不要将 API Key 硬编码在脚本中，推荐通过环境变量传入：

```bash
# 临时设置（当次终端会话有效）
export TINIFY_API_KEY=your_api_key_here
npm run compress

# 或使用 .env 文件（配合 dotenv 等工具）
```

```gitignore
# .gitignore
.env
.env.local
```

---

## 许可证

ISC
