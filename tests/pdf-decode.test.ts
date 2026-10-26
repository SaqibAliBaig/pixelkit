import { describe, it, expect } from 'vitest';
import { jpegToPdf, mergeImagesToPdf } from '../src/lib/worker/pdf';
import { getPdfPageCount, extractEmbeddedJpegsFromPdf, extractPdfImagesOrPages } from '../src/lib/worker/pdf-decode';

describe('PDF Decoder and Image Extraction Test', () => {
  it('reads page count from generated PDF', async () => {
    const dummyJpeg = new Blob([new Uint8Array(100)], { type: 'image/jpeg' });
    const pdfBlob = await jpegToPdf({
      jpegBlob: dummyJpeg,
      widthPx: 800,
      heightPx: 600,
      title: 'Single Page',
    });

    const pages = await getPdfPageCount(pdfBlob);
    expect(pages).toBe(1);
  });

  it('extracts embedded images from a merged PDF and lines them up', async () => {
    // Valid minimal baseline JPEG with SOF0 (width: 100, height: 80)
    const validJpeg1 = new Uint8Array([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
      0xff, 0xc0, 0x00, 0x11, 0x08, 0x00, 0x50, 0x00, 0x64, 0x03, 0x01, 0x11, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01,
      ...new Array(300).fill(0xaa),
      0xff, 0xd9,
    ]);
    const validJpeg2 = new Uint8Array([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x01,
      0xff, 0xc0, 0x00, 0x11, 0x08, 0x00, 0x50, 0x00, 0x64, 0x03, 0x01, 0x11, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01,
      ...new Array(300).fill(0xbb),
      0xff, 0xd9,
    ]);

    const blob1 = new Blob([validJpeg1], { type: 'image/jpeg' });
    const blob2 = new Blob([validJpeg2], { type: 'image/jpeg' });

    const mergedPdf = await mergeImagesToPdf([
      { jpegBlob: blob1, widthPx: 100, heightPx: 80 },
      { jpegBlob: blob2, widthPx: 100, heightPx: 80 },
    ], 'PixelKit Merged Document');

    const arrayBuf = await mergedPdf.arrayBuffer();
    const images = extractEmbeddedJpegsFromPdf(arrayBuf);
    expect(images.length).toBe(2);
    expect(images[0]!.width).toBe(100);
    expect(images[0]!.height).toBe(80);
    expect(images[0]!.isDirectImage).toBe(true);
    expect(images[1]!.width).toBe(100);
    expect(images[1]!.height).toBe(80);

    const extracted = await extractPdfImagesOrPages(mergedPdf);
    expect(extracted.length).toBe(2);
    expect(extracted[0]!.width).toBe(100);
    expect(extracted[1]!.width).toBe(100);
  });

  it('correctly extracts embedded photos with EXIF metadata without stopping early', async () => {
    // JPEG with EXIF header that contains an internal FF D9 marker
    const exifJpeg = new Uint8Array([
      0xff, 0xd8,
      0xff, 0xe1, 0x00, 0x14, // APP1 20 bytes (2 length bytes + 18 payload)
      0x45, 0x78, 0x69, 0x66, 0x00, 0x00,
      0x00, 0x01, 0xff, 0xd9, // Internal FF D9
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0xff, 0xc0, 0x00, 0x11, 0x08, 0x02, 0x58, 0x03, 0x20, 0x03, 0x01, 0x11, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01, // 800w x 600h
      0xff, 0xda, 0x00, 0x0c, 0x03, 0x01, 0x00, 0x02, 0x11, 0x03, 0x11, 0x00, 0x3f, 0x00,
      ...new Array(100).fill(0xcc),
      0xff, 0xd9,
    ]);

    const blob = new Blob([exifJpeg], { type: 'image/jpeg' });
    const pdfBlob = await jpegToPdf({
      jpegBlob: blob,
      widthPx: 800,
      heightPx: 600,
      title: 'EXIF Image PDF',
    });

    const buf = await pdfBlob.arrayBuffer();
    const extracted = extractEmbeddedJpegsFromPdf(buf);
    expect(extracted.length).toBe(1);
    expect(extracted[0]!.width).toBe(800);
    expect(extracted[0]!.height).toBe(600);
  });
});
