# compress-image

[English](README.en.md) | [中文](README.md)

A TypeScript wrapper for the [Tinify API](https://tinify.com/developers) (TinyPNG / TinyJPG), designed for batch compression of frontend static assets.

---

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Core Feature: Compress Directory](#core-feature-compress-directory)
  - [CompressOptions Reference](#compressoptions-reference)
  - [Full Example](#full-example)
- [Single File Operations](#single-file-operations)
- [Resizing Images](#resizing-images)
  - [ResizeOptions Reference](#resizeoptions-reference)
- [Preserving Metadata](#preserving-metadata)
- [Validation & Usage Stats](#validation--usage-stats)
- [Cache Mechanism](#cache-mechanism)
- [Team Collaboration](#team-collaboration)
- [License](#license)

---

## Features

- **Directory Batch Compression**: Recursively scan and compress all PNG / JPG / JPEG / WebP images in a directory.
- **Whitelist**: Skip specific files or directories using glob patterns.
- **Incremental Compression (Smart Cache)**: Based on MD5 content hash, automatically skip files that have already been compressed and haven't changed, saving API calls.
- **Output Directory Control**: Overwrite source files in-place, or output compressed results to a separate directory.
- **Concurrency Control**: Set the maximum number of files to compress in parallel.
- **File Size Threshold**: Automatically skip files smaller than a specified size.
- **Dry Run Mode**: Preview which files would be processed without actually calling the API.
- **Auto Backup**: Backup source files to `.tinify-backup` before compression.
- **Interactive Progress Bar**: Real-time visual feedback showing the current file being processed.
- **Shared Cache**: The `.tinify-cache.json` file can be committed to Git for team-wide cache sharing.

---

## Installation

```bash
npm install compress-image
```

---

## Quick Start

### Step 1: Get an API Key

Go to the [Tinify developer page](https://tinify.com/developers) to register and get a free API key.  
> **Note**: The free Tinify account allows **500 compressions** per month. Additional compressions require a paid plan.

### Step 2: Initialize

```typescript
import { TinifyWrapper } from 'compress-image';

const tinify = new TinifyWrapper('YOUR_API_KEY');
```

### Step 3: Compress a Directory

```typescript
await tinify.compressDirectory({
  targetDir: 'src/assets',
});
```

This will:
1. Recursively scan all `.png`, `.jpg`, `.jpeg`, `.webp` files in `src/assets`.
2. Skip files smaller than 20KB (default).
3. Skip already-compressed files via cache.
4. **Overwrite** the source files with compressed versions.
5. Create/update `.tinify-cache.json` in the current directory.

---

## Core Feature: Compress Directory

`compressDirectory` is the primary method of this library, ideal for use in build scripts or CI pipelines.

```typescript
await tinify.compressDirectory(options: CompressOptions): Promise<void>
```

### CompressOptions Reference

#### `targetDir` (required)

- **Type**: `string`
- **Description**: Path to the target directory. Supports both relative and absolute paths. The tool **recursively** scans all subdirectories.

```typescript
targetDir: 'src/assets'           // relative path
targetDir: '/Users/me/src/assets' // absolute path
```

---

#### `whitelist` (optional)

- **Type**: `string[]`
- **Default**: `[]` (skip nothing)
- **Description**: A list of glob patterns. **Matched files will be skipped** and not compressed. Powered by [micromatch](https://github.com/micromatch/micromatch).

| Pattern | Meaning |
|---------|---------|
| `*` | Matches any characters in a single path segment (no `/`) |
| `**` | Matches any number of path segments including none |
| `?` | Matches any single character |
| `{a,b}` | Matches either `a` or `b` |

```typescript
whitelist: [
  'src/assets/logo.png',        // skip a specific file
  'src/assets/icons/**',        // skip an entire directory
  '**/*.min.png',               // skip all .min.png files anywhere
  '**/*original*',              // skip files with "original" in the name
  '**/*.webp',                  // skip all webp files
]
```

---

#### `outputDir` (optional)

- **Type**: `string`
- **Default**: `undefined` (overwrite source files)
- **Description**: Output directory for compressed files. When set, compressed files are written here preserving the **original directory structure**, and source files remain untouched.

```typescript
// Without outputDir: overwrites files in src/assets
await tinify.compressDirectory({ targetDir: 'src/assets' });

// With outputDir: source unchanged, results go to dist/assets
// src/assets/images/banner.png → dist/assets/images/banner.png
await tinify.compressDirectory({
  targetDir: 'src/assets',
  outputDir: 'dist/assets',
});
```

---

#### `concurrency` (optional)

- **Type**: `number`
- **Default**: `5`
- **Description**: Maximum number of files to compress in parallel. Higher values speed up processing but may hit Tinify API rate limits. Recommended range: `3`–`10`.

```typescript
concurrency: 3   // conservative, for unstable networks
concurrency: 5   // default, works for most cases
concurrency: 10  // aggressive, for large batches
```

---

#### `minSize` (optional)

- **Type**: `number` (bytes)
- **Default**: `20480` (20KB = 20 × 1024)
- **Description**: File size threshold. **Files smaller than this value are skipped** and do not consume API calls. Small images like icons typically have negligible compression gains.

```typescript
minSize: 0              // compress all files regardless of size (for testing)
minSize: 10 * 1024      // 10KB
minSize: 20 * 1024      // 20KB (default)
minSize: 100 * 1024     // 100KB, only compress larger images
minSize: 1024 * 1024    // 1MB, only compress very large images
```

---

#### `dryRun` (optional)

- **Type**: `boolean`
- **Default**: `false`
- **Description**: Dry run mode. When `true`, the tool simulates the full process (scanning, whitelist check, cache check, size check) but **does not call the Tinify API**, modify any files, or update the cache.

**Use case**: Preview what would be processed before committing to real compression.

```typescript
// Step 1: dry run to preview
await tinify.compressDirectory({ targetDir: 'src/assets', dryRun: true });

// Step 2: actual compression
await tinify.compressDirectory({ targetDir: 'src/assets', dryRun: false });
```

---

#### `backup` (optional)

- **Type**: `boolean`
- **Default**: `false`
- **Description**: Auto-backup mode. When `true`, the source file is copied to `.tinify-backup` **before** each compression. The backup preserves the original directory structure relative to the project root.

**Use case**: Useful when overwriting source files (no `outputDir` set), allowing you to recover originals if needed.

```typescript
await tinify.compressDirectory({
  targetDir: 'src/assets',
  backup: true, // backup to .tinify-backup/src/assets/...
});
```

> **Note**: Add `.tinify-backup/` to your `.gitignore` to avoid committing backup files.

---

### Full Example

```typescript
import { TinifyWrapper } from 'compress-image';

const tinify = new TinifyWrapper(process.env.TINIFY_API_KEY!);

await tinify.validate();
console.log(`Compressions this month: ${tinify.compressionCount}`);

await tinify.compressDirectory({
  targetDir: 'src/assets',
  whitelist: [
    'src/assets/icons/**',
    '**/*.min.png',
    '**/*.min.jpg',
  ],
  outputDir: 'dist/assets',
  concurrency: 5,
  minSize: 20 * 1024,
  backup: true,
});
```

---

## Single File Operations

### Compress a File

Read a local file, compress it, and save to destination.

```typescript
await tinify.compressFile(sourcePath: string, destinationPath: string): Promise<void>
```

```typescript
await tinify.compressFile('input.png', 'output.png');

// Overwrite the source file
await tinify.compressFile('assets/banner.png', 'assets/banner.png');
```

---

### Compress a Buffer

Accept image data as a `Buffer`, compress it, and return the compressed `Buffer`. Useful for in-memory processing without writing temporary files.

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

### Compress from URL

Fetch and compress an image from a URL, returning the compressed `Buffer`. Tinify's servers fetch the image directly from the URL.

```typescript
await tinify.compressUrl(url: string): Promise<Buffer>
```

```typescript
const buffer = await tinify.compressUrl('https://example.com/image.png');
fs.writeFileSync('compressed.png', buffer);
```

---

## Resizing Images

Tinify API supports resizing images while compressing them.

### Resize a File

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

### Resize a Buffer

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

### ResizeOptions Reference

#### `method` (required)

- **Type**: `'scale' | 'fit' | 'cover' | 'thumb'`

| Method | Description |
|--------|-------------|
| `scale` | Proportional scaling. Provide only `width` or `height`; the other dimension is calculated automatically. |
| `fit` | Scale proportionally to fit within the given dimensions without cropping (may have empty space). Requires both `width` and `height`. |
| `cover` | Crop and scale to exactly fill the given dimensions. Requires both `width` and `height`. |
| `thumb` | Intelligent cropping that detects important regions (e.g., faces) and prioritizes them. Requires both `width` and `height`. |

#### `width` (optional)

- **Type**: `number` (pixels)
- **Description**: Target width. For `scale`, either `width` or `height` is sufficient; other methods require both.

#### `height` (optional)

- **Type**: `number` (pixels)
- **Description**: Target height. For `scale`, either `width` or `height` is sufficient; other methods require both.

```typescript
{ method: 'scale', width: 300 }          // scale to 300px wide, auto height
{ method: 'scale', height: 200 }         // scale to 200px tall, auto width
{ method: 'fit', width: 300, height: 200 }   // fit within 300×200
{ method: 'cover', width: 300, height: 200 } // crop to exactly 300×200
{ method: 'thumb', width: 200, height: 200 } // smart crop to 200×200
```

---

## Preserving Metadata

By default, Tinify removes all metadata (EXIF data) to minimize file size. Use these methods to preserve specific metadata.

### Preserve File Metadata

```typescript
await tinify.preserveMetadataFile(sourcePath, destinationPath, preserve): Promise<void>
```

### Preserve Buffer Metadata

```typescript
await tinify.preserveMetadataBuffer(buffer, preserve): Promise<Buffer>
```

### Supported Metadata Types

| Value | Description |
|-------|-------------|
| `'copyright'` | Copyright information (EXIF Copyright field) |
| `'creation'` | Creation date (EXIF DateTimeOriginal, etc.) |
| `'location'` | GPS location data (JPEG only) |

```typescript
await tinify.preserveMetadataFile('input.jpg', 'output.jpg', ['copyright', 'creation']);

// Preserve all supported metadata
await tinify.preserveMetadataFile('input.jpg', 'output.jpg', ['copyright', 'creation', 'location']);

// Buffer-based
const inputBuffer = fs.readFileSync('photo.jpg');
const result = await tinify.preserveMetadataBuffer(inputBuffer, ['copyright']);
fs.writeFileSync('photo_preserved.jpg', result);
```

---

## Validation & Usage Stats

### Validate API Key

```typescript
await tinify.validate(): Promise<void>
```

```typescript
try {
  await tinify.validate();
  console.log('API key is valid');
} catch (err) {
  console.error('Invalid API key or network error:', err);
  process.exit(1);
}
```

### Get Compression Count

```typescript
tinify.compressionCount: number | undefined
```

The free Tinify account allows 500 compressions per month (one per file). This value is updated after calling `validate()` or any compression operation.

```typescript
await tinify.validate();
console.log(`Compressions this month: ${tinify.compressionCount} / 500`);
```

---

## Cache Mechanism

To avoid re-compressing unchanged files, this library uses an **MD5 hash-based** cache.

### How It Works

1. **First run**: Before compressing, the source file's MD5 hash is calculated. After compression, both the source hash and the compressed file's hash are recorded in the cache.
2. **Subsequent runs**: When a file is encountered again, its current hash is checked against the cache. If found (either as a source or compressed hash), the file is skipped.
3. **After modification**: If a file's content changes, its hash changes and won't be in the cache, so it will be re-compressed.

### Cache File Format

The `.tinify-cache.json` file is created in the **directory where the script is executed**:

```json
{
  "d41d8cd98f00b204e9800998ecf8427e": "source",
  "098f6bcd4621d373cade4e832627b4f6": "compressed"
}
```

---

## Team Collaboration

### Recommended `.gitignore`

```gitignore
# Backup directory should not be committed
.tinify-backup/

# Cache file SHOULD be committed (do NOT ignore it)
# .tinify-cache.json  ← do not ignore this file
```

### Recommended `package.json` Scripts

```json
{
  "scripts": {
    "compress": "tsx scripts/compress.ts"
  }
}
```

### Use Environment Variables for API Keys

Never hardcode API keys in scripts. Use environment variables instead:

```bash
export TINIFY_API_KEY=your_api_key_here
npm run compress
```

```typescript
// scripts/compress.ts
import { TinifyWrapper } from 'compress-image';

const apiKey = process.env.TINIFY_API_KEY;
if (!apiKey) {
  console.error('Please set the TINIFY_API_KEY environment variable');
  process.exit(1);
}

const tinify = new TinifyWrapper(apiKey);
await tinify.validate();
console.log(`Usage this month: ${tinify.compressionCount} / 500`);

await tinify.compressDirectory({
  targetDir: 'src/assets',
  whitelist: ['src/assets/icons/**'],
  minSize: 20 * 1024,
  concurrency: 5,
});
```

---

## License

ISC
