import { describe, it, expect } from 'vitest';
import { mergeImagesToPdf, jpegToPdf } from '../src/lib/worker/pdf';
import { svgToImageBitmap } from '../src/lib/worker/svg';

// Mock createImageBitmap for Node vitest runner
class MockOffscreenCanvas {
  width: number;
  height: number;
  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }
  getContext(_type: string) {
    return {
      drawImage: () => {},
      fillRect: () => {},
      getImageData: (_x: number, _y: number, w: number, h: number) => ({
        data: new Uint8ClampedArray(w * h * 4),
      }),
      putImageData: () => {},
    };
  }
  convertToBlob(opts: { type: string }) {
    return Promise.resolve(new Blob([new Uint8Array(200)], { type: opts.type }));
  }
}

// @ts-expect-error Node mock
globalThis.OffscreenCanvas = MockOffscreenCanvas;
(globalThis as unknown as { createImageBitmap: unknown }).createImageBitmap = (source: { width?: number; height?: number; text?: () => Promise<string> }) => {
  return Promise.resolve({
    width: source.width || 800,
    height: source.height || 600,
    close: () => {},
  } as ImageBitmap);
};

describe('Document Expansion & Multi-Page PDF', () => {
  it('creates single-page PDF with valid PDF header', async () => {
    const dummyJpeg = new Blob([new Uint8Array(100)], { type: 'image/jpeg' });
    const pdfBlob = await jpegToPdf({
      jpegBlob: dummyJpeg,
      widthPx: 800,
      heightPx: 600,
      title: 'Single Page',
    });

    expect(pdfBlob).toBeDefined();
    expect(pdfBlob.type).toBe('application/pdf');
    expect(pdfBlob.size).toBeGreaterThan(100);

    const buf = await pdfBlob.arrayBuffer();
    const header = new TextDecoder().decode(new Uint8Array(buf.slice(0, 5)));
    expect(header).toBe('%PDF-');
  });

  it('merges multiple images into a multi-page PDF document', async () => {
    const dummyJpeg1 = new Blob([new Uint8Array(100)], { type: 'image/jpeg' });
    const dummyJpeg2 = new Blob([new Uint8Array(100)], { type: 'image/jpeg' });
    const dummyJpeg3 = new Blob([new Uint8Array(100)], { type: 'image/jpeg' });

    const pages = [
      { jpegBlob: dummyJpeg1, widthPx: 1200, heightPx: 800 },
      { jpegBlob: dummyJpeg2, widthPx: 800, heightPx: 1200 },
      { jpegBlob: dummyJpeg3, widthPx: 1000, heightPx: 1000 },
    ];

    const mergedBlob = await mergeImagesToPdf(pages, 'Test Merged Document');

    expect(mergedBlob).toBeDefined();
    expect(mergedBlob.type).toBe('application/pdf');
    expect(mergedBlob.size).toBeGreaterThan(300);

    const buf = await mergedBlob.arrayBuffer();
    const text = new TextDecoder().decode(new Uint8Array(buf));
    expect(text.startsWith('%PDF-')).toBe(true);
    // jsPDF creates pages with /Type /Page
    expect(text).toContain('/Type /Page');
  });

  it('embeds valid JPEG images into multi-page PDF without empty pages', async () => {
    // Valid 1x1 JPEG bytes
    const validJpeg = Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=', 'base64');
    const jpegBlob = new Blob([validJpeg], { type: 'image/jpeg' });

    const merged = await mergeImagesToPdf([
      { jpegBlob, widthPx: 600, heightPx: 400 },
      { jpegBlob, widthPx: 400, heightPx: 600 },
    ]);

    const buf = Buffer.from(await merged.arrayBuffer());
    const content = buf.toString('utf-8');
    expect(content).toContain('/Type /XObject');
    expect(content).toContain('/Subtype /Image');
    expect(content).toContain('/Filter /DCTDecode');
    // Ensure image width/height are greater than 0
    expect(content).toContain('/Width 1');
    expect(content).toContain('/Height 1');
  });

  it('rasterizes vector SVG with configurable DPI scale multiplier', async () => {
    const svgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 200"><rect width="100" height="200" fill="red"/></svg>`;
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml' });

    // Spy or mock scale
    let parsedWidth = 0;
    let parsedHeight = 0;
    const origCreateBitmap = (globalThis as unknown as { createImageBitmap: unknown }).createImageBitmap;
    (globalThis as unknown as { createImageBitmap: unknown }).createImageBitmap = async (source: Blob) => {
      const text = await source.text();
      const wMatch = text.match(/width=["'](\d+)["']/);
      const hMatch = text.match(/height=["'](\d+)["']/);
      if (wMatch && hMatch && wMatch[1] && hMatch[1]) {
        parsedWidth = parseInt(wMatch[1], 10);
        parsedHeight = parseInt(hMatch[1], 10);
      }
      return { width: parsedWidth, height: parsedHeight, close: () => {} } as ImageBitmap;
    };

    // 2x scale: 100x200 -> 200x400
    await svgToImageBitmap(svgBlob, 2.0);
    expect(parsedWidth).toBe(200);
    expect(parsedHeight).toBe(400);

    // 3x scale (300 DPI): 100x200 -> 300x600
    await svgToImageBitmap(svgBlob, 3.0);
    expect(parsedWidth).toBe(300);
    expect(parsedHeight).toBe(600);

    (globalThis as unknown as { createImageBitmap: unknown }).createImageBitmap = origCreateBitmap;
  });
});
