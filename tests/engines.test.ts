/**
 * engines.test.ts — verify the registry and MIME helpers.
 */

import { describe, it, expect } from 'vitest';
import {
  mimeToOutputFormat,
  mimeForExtension,
  buildFilename,
} from '../src/lib/engines';
import {
  detectMimeFromMagicBytes,
  mimeFromExt,
  extFromMime,
} from '../src/lib/utils/mime';
import { formatBytes, parseTargetKb } from '../src/lib/utils/filesize';

describe('engines/mimeToOutputFormat', () => {
  it('maps known MIME types to output formats', () => {
    expect(mimeToOutputFormat('image/jpeg')).toBe('jpg');
    expect(mimeToOutputFormat('image/png')).toBe('png');
    expect(mimeToOutputFormat('image/webp')).toBe('webp');
    expect(mimeToOutputFormat('image/avif')).toBe('avif');
    expect(mimeToOutputFormat('application/pdf')).toBe('pdf');
    expect(mimeToOutputFormat('image/svg+xml')).toBe('svg');
  });

  it('throws on unsupported MIME', () => {
    expect(() => mimeToOutputFormat('image/tiff')).toThrow();
    expect(() => mimeToOutputFormat('')).toThrow();
  });
});

describe('engines/mimeForExtension', () => {
  it('resolves extension → MIME', () => {
    expect(mimeForExtension('jpg')).toBe('image/jpeg');
    expect(mimeForExtension('JPEG')).toBe('image/jpeg');
    expect(mimeForExtension('.png')).toBe('image/png');
    expect(mimeForExtension('heic')).toBe('image/heic');
  });

  it('returns undefined for unknown extensions', () => {
    expect(mimeForExtension('xyz')).toBeUndefined();
  });
});

describe('engines/buildFilename', () => {
  it('replaces extension', () => {
    expect(buildFilename('photo.HEIC', 'jpg')).toBe('photo.jpg');
    expect(buildFilename('scan.png', 'pdf')).toBe('scan.pdf');
  });

  it('handles multi-dot names', () => {
    expect(buildFilename('my.photo.v2.heic', 'jpg')).toBe('my.photo.v2.jpg');
  });

  it('handles names without extension', () => {
    expect(buildFilename('noext', 'png')).toBe('noext.png');
  });
});

describe('utils/mime', () => {
  it('detects JPEG', () => {
    const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]);
    expect(detectMimeFromMagicBytes(bytes)).toBe('image/jpeg');
  });

  it('detects PNG', () => {
    const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(detectMimeFromMagicBytes(bytes)).toBe('image/png');
  });

  it('detects GIF', () => {
    const bytes = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0]);
    expect(detectMimeFromMagicBytes(bytes)).toBe('image/gif');
  });

  it('detects WEBP', () => {
    const bytes = new Uint8Array([
      0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50,
    ]);
    expect(detectMimeFromMagicBytes(bytes)).toBe('image/webp');
  });

  it('detects PDF', () => {
    const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]);
    expect(detectMimeFromMagicBytes(bytes)).toBe('application/pdf');
  });

  it('detects HEIC by ftyp brand', () => {
    const bytes = new Uint8Array([
      0, 0, 0, 0, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63,
    ]);
    expect(detectMimeFromMagicBytes(bytes)).toBe('image/heic');
  });

  it('detects AVIF by ftyp brand', () => {
    const bytes = new Uint8Array([
      0, 0, 0, 0, 0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66,
    ]);
    expect(detectMimeFromMagicBytes(bytes)).toBe('image/avif');
  });

  it('returns null for unknown bytes', () => {
    expect(detectMimeFromMagicBytes(new Uint8Array([1, 2, 3, 4]))).toBeNull();
    expect(detectMimeFromMagicBytes(new Uint8Array([]))).toBeNull();
  });

  it('mimeFromExt and extFromMime round-trip', () => {
    expect(mimeFromExt('jpg')).toBe('image/jpeg');
    expect(extFromMime('image/jpeg')).toBe('jpg');
    expect(mimeFromExt('heic')).toBe('image/heic');
    expect(extFromMime('image/heic')).toBe('heic');
  });
});

describe('utils/filesize', () => {
  it('formatBytes', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1024)).toBe('1.0 KB');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(1024 * 1024)).toBe('1.0 MB');
    expect(formatBytes(-5)).toBe('—');
    expect(formatBytes(NaN)).toBe('—');
  });

  it('parseTargetKb', () => {
    expect(parseTargetKb('100')).toBe(100);
    expect(parseTargetKb(50)).toBe(50);
    expect(parseTargetKb('')).toBeNull();
    expect(parseTargetKb('abc')).toBeNull();
    expect(parseTargetKb('-5')).toBeNull();
    expect(parseTargetKb(null)).toBeNull();
    expect(parseTargetKb(undefined)).toBeNull();
  });
});