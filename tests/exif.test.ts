import { describe, it, expect } from 'vitest';
import {
  extractExifSegment,
  insertExifIntoJpeg,
  normalizeExifOrientation,
} from '../src/lib/worker/exif';

describe('EXIF utility', () => {
  it('gracefully returns null for non-JPEG or short buffers', () => {
    const emptyBuf = new ArrayBuffer(0);
    expect(extractExifSegment(emptyBuf)).toBeNull();

    const pngHeader = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).buffer;
    expect(extractExifSegment(pngHeader)).toBeNull();
  });

  it('extracts and injects EXIF segment in JPEG buffers', () => {
    // Construct a synthetic JPEG with SOI and APP1 Exif segment
    // SOI: FF D8
    // APP1: FF E1, length: 00 0E (14 bytes including length)
    // Exif\0\0: 45 78 69 66 00 00
    // TIFF header mock: 49 49 2A 00 08 00
    const exifBytes = [
      0xff, 0xe1, 0x00, 0x0e,
      0x45, 0x78, 0x69, 0x66, 0x00, 0x00,
      0x49, 0x49, 0x2a, 0x00, 0x08, 0x00,
    ];

    // Dummy source JPEG: SOI + APP1 + SOS + EOI
    const sourceJpeg = new Uint8Array([
      0xff, 0xd8,
      ...exifBytes,
      0xff, 0xda, 0x00, 0x02,
      0xff, 0xd9,
    ]);

    const extracted = extractExifSegment(sourceJpeg.buffer);
    expect(extracted).not.toBeNull();
    expect(extracted?.length).toBe(exifBytes.length);
    expect(extracted?.[0]).toBe(0xff);
    expect(extracted?.[1]).toBe(0xe1);

    // Dummy destination JPEG without EXIF
    const destJpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xda, 0x00, 0x02, 0xff, 0xd9]);
    const resultBlob = insertExifIntoJpeg(destJpeg.buffer, extracted!, false);

    expect(resultBlob).toBeInstanceOf(Blob);
    expect(resultBlob.type).toBe('image/jpeg');
    expect(resultBlob.size).toBe(destJpeg.length + extracted!.length);
  });

  it('normalizes EXIF orientation to 1 safely', () => {
    // APP1 segment with orientation 6 (Rotate 90 CW)
    // TIFF header at offset 10: II (49 49), 42 (2A 00), offset to IFD0 (08 00 00 00)
    // IFD0 at offset 18: entry count = 1 (01 00)
    // Entry 1: tag = 0x0112 (12 01), type = 3 (03 00), count = 1 (01 00 00 00), val = 6 (06 00 00 00)
    const app1 = new Uint8Array([
      0xff, 0xe1, 0x00, 0x20, // 32 bytes
      0x45, 0x78, 0x69, 0x66, 0x00, 0x00, // Exif\0\0
      0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, // TIFF header
      0x01, 0x00, // 1 entry in IFD0
      0x12, 0x01, 0x03, 0x00, 0x01, 0x00, 0x00, 0x00, 0x06, 0x00, 0x00, 0x00, // Tag 0x0112 val=6
      0x00, 0x00, // next IFD offset
    ]);

    normalizeExifOrientation(app1);

    // Orientation value at offset 28 should now be 1
    const view = new DataView(app1.buffer, app1.byteOffset, app1.byteLength);
    expect(view.getUint16(28, true)).toBe(1);
  });
});
