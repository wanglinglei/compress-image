# compress-image

[English](README.md) | [中文](README.zh-CN.md)

A TypeScript wrapper for the Tinify API (TinyPNG/TinyJPG), designed for frontend static asset compression.

## Features

- **Directory Compression**: Compress all images in a directory recursively.
- **Whitelist**: Skip specific files or directories using glob patterns.
- **Incremental Compression**: Skip files that have already been compressed (based on content hash).
- **Output Control**: Overwrite source files or output to a new directory.
- **Metadata Preservation**: Preserve copyright, creation date, and location data.

## Installation

```bash
npm install compress-image
```

## Usage

First, you need to get an API key from [Tinify](https://tinify.com/developers).

### Compress a Directory

This is the main feature for compressing frontend assets.

```typescript
import { TinifyWrapper } from 'compress-image';
import path from 'path';

const tinify = new TinifyWrapper('YOUR_API_KEY');

// Compress all images in 'src/assets'
await tinify.compressDirectory({
  targetDir: 'src/assets',
  // Optional: whitelist files or directories to skip
  // Supports glob patterns (e.g. '**/*.min.png', 'assets/ignore/**')
  whitelist: [
    'src/assets/icons/skip-this.png',
    'src/assets/large-images/**',
    '**/*.min.png'
  ],
  // Optional: output to a different directory. If omitted, source files will be overwritten.
  // outputDir: 'dist/assets' 
});
```

The tool will automatically create a `.tinify-cache.json` file in your project root to track compressed files. Subsequent runs will skip files that haven't changed.

### Basic Usage (Single File)

```typescript
// Compress a file
await tinify.compressFile('input.png', 'output.png');

// Compress a buffer
const inputBuffer = fs.readFileSync('input.png');
const compressedBuffer = await tinify.compressBuffer(inputBuffer);
fs.writeFileSync('output_buffer.png', compressedBuffer);

// Compress from URL
const compressedUrlBuffer = await tinify.compressUrl('https://tinypng.com/images/panda-happy.png');
fs.writeFileSync('output_url.png', compressedUrlBuffer);
```

### Resizing

```typescript
// Resize a file
await tinify.resizeFile('input.png', 'resized.png', {
  method: 'fit',
  width: 150,
  height: 100
});
```

### Preserving Metadata

```typescript
// Preserve metadata (copyright, creation, location)
await tinify.preserveMetadataFile('input.jpg', 'output_meta.jpg', ['copyright', 'creation']);
```

### Validation and Compression Count

```typescript
// Validate API key
try {
  await tinify.validate();
  console.log('API key is valid');
} catch (err) {
  console.error('Validation failed:', err);
}

// Get compression count
const count = tinify.compressionCount;
console.log(`Compressions this month: ${count}`);
```

## License

ISC
