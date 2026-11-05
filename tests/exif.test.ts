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

  it('sets JPEG DPI to 300 via JFIF marker and updates EXIF IFD0 resolution tags', async () => {
    const { setJpegDpi, readImageDpi } = await import('../src/lib/worker/exif');
    const dummyJpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xda, 0x00, 0x02, 0xff, 0xd9]);
    const blob = setJpegDpi(dummyJpeg.buffer, 300);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBe(dummyJpeg.length + 18);
    expect(readImageDpi(await blob.arrayBuffer())).toBe(300);

    // Also test JPEG with EXIF IFD0 XResolution (0x011A), YResolution (0x011B), ResolutionUnit (0x0128) = 72 DPI
    // Little-endian TIFF header at offset 10 (after FF E1 len Exif\0\0)
    // IFD0 at offset 8 from TIFF start: 3 entries (3 * 12 = 36 bytes) + 4 bytes nextIFD = 42 bytes -> rat1 at 50, rat2 at 58 (total TIFF = 66 bytes, APP1 len = 2 + 6 + 66 = 74 = 0x4A)
    const app1 = new Uint8Array(2 + 74);
    const v = new DataView(app1.buffer);
    app1[0] = 0xff;
    app1[1] = 0xe1;
    v.setUint16(2, 74, false);
    app1.set([0x45, 0x78, 0x69, 0x66, 0x00, 0x00], 4); // Exif\0\0
    const tiff = 10;
    app1.set([0x49, 0x49, 0x2a, 0x00], tiff); // II, 42
    v.setUint32(tiff + 4, 8, true); // IFD0 offset = 8
    v.setUint16(tiff + 8, 3, true); // 3 entries
    // Entry 0: XResolution (0x011A), RATIONAL (5), count 1, offset 50
    v.setUint16(tiff + 10, 0x011a, true);
    v.setUint16(tiff + 12, 5, true);
    v.setUint32(tiff + 14, 1, true);
    v.setUint32(tiff + 18, 50, true);
    // Entry 1: YResolution (0x011B), RATIONAL (5), count 1, offset 58
    v.setUint16(tiff + 22, 0x011b, true);
    v.setUint16(tiff + 24, 5, true);
    v.setUint32(tiff + 26, 1, true);
    v.setUint32(tiff + 30, 58, true);
    // Entry 2: ResolutionUnit (0x0128), SHORT (3), count 1, val 3 (cm) -> should become 2 (inches)
    v.setUint16(tiff + 34, 0x0128, true);
    v.setUint16(tiff + 36, 3, true);
    v.setUint32(tiff + 38, 1, true);
    v.setUint16(tiff + 42, 3, true);
    // Rationals initially 72 / 1
    v.setUint32(tiff + 50, 72, true);
    v.setUint32(tiff + 54, 1, true);
    v.setUint32(tiff + 58, 72, true);
    v.setUint32(tiff + 62, 1, true);

    const jpegWithExif = new Uint8Array(2 + app1.length + 6);
    jpegWithExif.set([0xff, 0xd8], 0);
    jpegWithExif.set(app1, 2);
    jpegWithExif.set([0xff, 0xda, 0x00, 0x02, 0xff, 0xd9], 2 + app1.length);

    const updated = setJpegDpi(jpegWithExif.buffer, 300);
    const outBuf = await updated.arrayBuffer();
    expect(readImageDpi(outBuf)).toBe(300);
    // Verify EXIF IFD0 XResolution numerator was also updated to 300 (shifted by +18 bytes for JFIF APP0)
    const outView = new DataView(outBuf);
    expect(outView.getUint32(2 + 18 + tiff + 50, true)).toBe(300);
    expect(outView.getUint32(2 + 18 + tiff + 58, true)).toBe(300);
    expect(outView.getUint16(2 + 18 + tiff + 42, true)).toBe(2);
  });

  it('sets and reads PNG DPI via pHYs chunk losslessly', async () => {
    const { setPngDpi, readImageDpi } = await import('../src/lib/worker/exif');
    // Minimal synthetic PNG: 8-byte signature + 25-byte IHDR + 12-byte IEND
    const pngSig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    const ihdr = new Uint8Array(25);
    new DataView(ihdr.buffer).setUint32(0, 13, false);
    ihdr.set([0x49, 0x48, 0x44, 0x52], 4); // 'IHDR'
    const iend = new Uint8Array([0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82]);
    const rawPng = new Uint8Array(pngSig.length + ihdr.length + iend.length);
    rawPng.set(pngSig, 0);
    rawPng.set(ihdr, 8);
    rawPng.set(iend, 33);

    const dpi300Blob = setPngDpi(rawPng.buffer, 300);
    const dpi300Buf = await dpi300Blob.arrayBuffer();
    expect(readImageDpi(dpi300Buf)).toBe(300);

    // Updating existing pHYs chunk to 200 DPI should replace in-place without duplicating chunks
    const dpi200Blob = setPngDpi(dpi300Buf, 200);
    const dpi200Buf = await dpi200Blob.arrayBuffer();
    expect(dpi200Buf.byteLength).toBe(dpi300Buf.byteLength);
    expect(readImageDpi(dpi200Buf)).toBe(200);
  });

  it('pads JPEG, PNG, and WebP losslessly with spec-valid chunk/segment headers', async () => {
    const {
      padJpegToTargetBytes,
      padPngToTargetBytes,
      padWebpToTargetBytes,
    } = await import('../src/lib/worker/exif');

    // 1. JPEG padding: test both tricky small delta (+6 bytes) and multi-segment (> 70KB) delta
    const baseJpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xda, 0x00, 0x02, 0x00, 0xff, 0xd9]);
    for (const targetSize of [baseJpeg.length + 6, 75_000]) {
      const paddedJpeg = padJpegToTargetBytes(baseJpeg.buffer, targetSize);
      expect(paddedJpeg.size).toBe(targetSize);
      const bytes = new Uint8Array(await paddedJpeg.arrayBuffer());
      const view = new DataView(bytes.buffer);
      expect(bytes[0]).toBe(0xff);
      expect(bytes[1]).toBe(0xd8);
      // Walk all JPEG markers before SOS (0xFFDA) to verify every segment length field is exact
      let offset = 2;
      while (offset < bytes.length) {
        expect(bytes[offset]).toBe(0xff);
        const marker = bytes[offset + 1];
        if (marker === 0xda) break; // reached SOS cleanly!
        expect(marker).toBe(0xfe); // COM marker
        const segLen = view.getUint16(offset + 2, false);
        expect(segLen).toBeGreaterThanOrEqual(2);
        offset += 2 + segLen;
      }
      expect(bytes[offset + 1]).toBe(0xda);
      expect(bytes[bytes.length - 2]).toBe(0xff);
      expect(bytes[bytes.length - 1]).toBe(0xd9);
    }

    // 2. PNG padding: inserts valid tEXt chunk(s) before IEND
    const pngSig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    const ihdr = new Uint8Array(25);
    new DataView(ihdr.buffer).setUint32(0, 13, false);
    ihdr.set([0x49, 0x48, 0x44, 0x52], 4);
    const iend = new Uint8Array([0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82]);
    const basePng = new Uint8Array(pngSig.length + ihdr.length + iend.length);
    basePng.set(pngSig, 0);
    basePng.set(ihdr, 8);
    basePng.set(iend, 33);

    const paddedPng = padPngToTargetBytes(basePng.buffer, 50 * 1024);
    expect(paddedPng.size).toBe(50 * 1024);
    const pngOut = new Uint8Array(await paddedPng.arrayBuffer());
    // Final 12 bytes must still be the intact IEND chunk
    expect(Array.from(pngOut.slice(-12))).toEqual(Array.from(iend));

    // 3. WebP padding: appends valid RIFF JUNK chunk and updates RIFF header length
    const baseWebp = new Uint8Array(20);
    baseWebp.set([0x52, 0x49, 0x46, 0x46], 0); // 'RIFF'
    new DataView(baseWebp.buffer).setUint32(4, 12, true);
    baseWebp.set([0x57, 0x45, 0x42, 0x50], 8); // 'WEBP'
    baseWebp.set([0x56, 0x50, 0x38, 0x20], 12); // 'VP8 '
    new DataView(baseWebp.buffer).setUint32(16, 0, true);

    const paddedWebp = padWebpToTargetBytes(baseWebp.buffer, 20 * 1024);
    expect(paddedWebp.size).toBe(20 * 1024);
    const webpOut = new Uint8Array(await paddedWebp.arrayBuffer());
    const webpView = new DataView(webpOut.buffer);
    expect(webpView.getUint32(4, true)).toBe(webpOut.byteLength - 8);
    expect(String.fromCharCode(webpOut[20]!, webpOut[21]!, webpOut[22]!, webpOut[23]!)).toBe('JUNK');
  });

  it('strips EXIF segments from JPEG buffers', async () => {
    const { stripExifFromJpeg } = await import('../src/lib/worker/exif');
    const dummyJpegWithExif = new Uint8Array([
      0xff, 0xd8,
      0xff, 0xe1, 0x00, 0x06, 0x45, 0x78, 0x69, 0x66,
      0xff, 0xda, 0x00, 0x02,
      0xff, 0xd9
    ]);
    const stripped = stripExifFromJpeg(dummyJpegWithExif.buffer);
    expect(stripped.size).toBe(8); // SOI + SOS + EOI
  });
});
