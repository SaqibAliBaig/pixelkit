import { describe, it, expect } from 'vitest';
import { parseDimensionsFromBytes } from '../src/lib/utils/image-dims';

describe('Fast Image Dimension Sniffer', () => {
  it('parses PNG dimensions from IHDR chunk', () => {
    // Standard 8-byte PNG signature + IHDR chunk (13 bytes)
    const pngHeader = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG Signature
      0x00, 0x00, 0x00, 0x0d, // IHDR chunk length (13)
      0x49, 0x48, 0x44, 0x52, // 'IHDR'
      0x00, 0x00, 0x07, 0x80, // Width: 1920
      0x00, 0x00, 0x04, 0x38, // Height: 1080
      0x08, 0x06, 0x00, 0x00, 0x00, // bit depth, color type, compression, filter, interlace
    ]);
    const dims = parseDimensionsFromBytes(pngHeader);
    expect(dims).toEqual({ width: 1920, height: 1080 });
  });

  it('parses GIF dimensions', () => {
    // 'GIF89a' followed by width (800) and height (600) in little-endian
    const gifHeader = new Uint8Array([
      0x47, 0x49, 0x46, 0x38, 0x39, 0x61, // 'GIF89a'
      0x20, 0x03, // 800
      0x58, 0x02, // 600
    ]);
    const dims = parseDimensionsFromBytes(gifHeader);
    expect(dims).toEqual({ width: 800, height: 600 });
  });

  it('parses BMP dimensions', () => {
    const bmpHeader = new Uint8Array(30);
    bmpHeader[0] = 0x42; // 'B'
    bmpHeader[1] = 0x4d; // 'M'
    // Width at offset 18: 1024
    bmpHeader[18] = 0x00;
    bmpHeader[19] = 0x04;
    // Height at offset 22: 768
    bmpHeader[22] = 0x00;
    bmpHeader[23] = 0x03;
    const dims = parseDimensionsFromBytes(bmpHeader);
    expect(dims).toEqual({ width: 1024, height: 768 });
  });

  it('parses JPEG SOF0 baseline dimensions', () => {
    // 0xFF 0xD8 (SOI), then APP0 marker (length 4), then SOF0 marker (0xFF 0xC0)
    const jpegHeader = new Uint8Array([
      0xff, 0xd8, // SOI
      0xff, 0xe0, 0x00, 0x04, 0x00, 0x00, // APP0
      0xff, 0xc0, 0x00, 0x11, 0x08, // SOF0, length 17, precision 8
      0x0f, 0xa0, // Height: 4000
      0x17, 0x70, // Width: 6000
      0x03, // 3 components
    ]);
    const dims = parseDimensionsFromBytes(jpegHeader);
    expect(dims).toEqual({ width: 6000, height: 4000 });
  });

  it('parses WebP VP8X extended dimensions', () => {
    // RIFF .... WEBP VP8X
    const webpHeader = new Uint8Array(35);
    // 'RIFF'
    webpHeader[0] = 0x52; webpHeader[1] = 0x49; webpHeader[2] = 0x46; webpHeader[3] = 0x46;
    // 'WEBP'
    webpHeader[8] = 0x57; webpHeader[9] = 0x45; webpHeader[10] = 0x42; webpHeader[11] = 0x50;
    // 'VP8X'
    webpHeader[12] = 0x56; webpHeader[13] = 0x50; webpHeader[14] = 0x38; webpHeader[15] = 0x58;
    // Width (24 bits - 1): 2559 (so actual = 2560)
    webpHeader[24] = 0xff;
    webpHeader[25] = 0x09;
    webpHeader[26] = 0x00;
    // Height (24 bits - 1): 1439 (so actual = 1440)
    webpHeader[27] = 0x9f;
    webpHeader[28] = 0x05;
    webpHeader[29] = 0x00;
    const dims = parseDimensionsFromBytes(webpHeader);
    expect(dims).toEqual({ width: 2560, height: 1440 });
  });
});
