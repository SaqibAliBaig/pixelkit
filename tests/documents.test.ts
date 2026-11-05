import { describe, it, expect } from 'vitest';
import { mergeImagesToPdf, jpegToPdf, computePdfPageLayout } from '../src/lib/worker/pdf';
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


  it('computes smart layout: auto orientation detects aspect ratio', () => {
    // Landscape photo (1200 x 800)
    const landscapeLayout = computePdfPageLayout(1200, 800, { orientation: 'auto', pageSize: 'a4' });
    expect(landscapeLayout.orientation).toBe('landscape');
    expect(landscapeLayout.pageW).toBeCloseTo(841.89, 1);
    expect(landscapeLayout.pageH).toBeCloseTo(595.28, 1);

    // Portrait photo (800 x 1200)
    const portraitLayout = computePdfPageLayout(800, 1200, { orientation: 'auto', pageSize: 'a4' });
    expect(portraitLayout.orientation).toBe('portrait');
    expect(portraitLayout.pageW).toBeCloseTo(595.28, 1);
    expect(portraitLayout.pageH).toBeCloseTo(841.89, 1);
  });

  it('computes smart layout: forced portrait and landscape with aspect ratio preservation', () => {
    // Wide photo forced to Portrait A4
    const forcedPortrait = computePdfPageLayout(1600, 900, { orientation: 'portrait', pageSize: 'a4', margin: 'none' });
    expect(forcedPortrait.orientation).toBe('portrait');
    expect(forcedPortrait.pageW).toBeCloseTo(595.28, 1);
    expect(forcedPortrait.pageH).toBeCloseTo(841.89, 1);
    expect(forcedPortrait.drawW).toBeCloseTo(595.28, 1);
    expect(forcedPortrait.drawH).toBeLessThan(forcedPortrait.pageH);
    expect(forcedPortrait.drawY).toBeGreaterThan(0); // centered vertically

    // Tall photo forced to Landscape A4
    const forcedLandscape = computePdfPageLayout(900, 1600, { orientation: 'landscape', pageSize: 'a4', margin: 'none' });
    expect(forcedLandscape.orientation).toBe('landscape');
    expect(forcedLandscape.pageW).toBeCloseTo(841.89, 1);
    expect(forcedLandscape.pageH).toBeCloseTo(595.28, 1);
    expect(forcedLandscape.drawH).toBeCloseTo(595.28, 1);
    expect(forcedLandscape.drawW).toBeLessThan(forcedLandscape.pageW);
    expect(forcedLandscape.drawX).toBeGreaterThan(0); // centered horizontally
  });

  it('computes smart layout: page sizes (A4, US Letter, Fit to image)', () => {
    // US Letter (8.5 x 11 in -> 612 x 792 pt)
    const letterLayout = computePdfPageLayout(800, 1000, { pageSize: 'letter', orientation: 'portrait' });
    expect(letterLayout.pageW).toBe(612);
    expect(letterLayout.pageH).toBe(792);

    // Fit to image (at 96 DPI: 960x480 -> 720x360 pt) with 0 margin
    const fitLayout = computePdfPageLayout(960, 480, { pageSize: 'fit', margin: 'none' });
    expect(fitLayout.pageW).toBeCloseTo(720, 1);
    expect(fitLayout.pageH).toBeCloseTo(360, 1);
    expect(fitLayout.drawX).toBe(0);
    expect(fitLayout.drawY).toBe(0);
  });

  it('computes smart layout: margins (none, small 5mm, big 12mm)', () => {
    // Fit with small margin (5mm -> 14.17 pt each side)
    const smallMarginLayout = computePdfPageLayout(960, 480, { pageSize: 'fit', margin: 'small' });
    expect(smallMarginLayout.pageW).toBeCloseTo(720 + 2 * 14.17, 1);
    expect(smallMarginLayout.pageH).toBeCloseTo(360 + 2 * 14.17, 1);
    expect(smallMarginLayout.drawX).toBeCloseTo(14.17, 1);
    expect(smallMarginLayout.drawY).toBeCloseTo(14.17, 1);

    // Fit with big margin (12mm -> 34.02 pt each side)
    const bigMarginLayout = computePdfPageLayout(960, 480, { pageSize: 'fit', margin: 'big' });
    expect(bigMarginLayout.pageW).toBeCloseTo(720 + 2 * 34.02, 1);
    expect(bigMarginLayout.pageH).toBeCloseTo(360 + 2 * 34.02, 1);
    expect(bigMarginLayout.drawX).toBeCloseTo(34.02, 1);
    expect(bigMarginLayout.drawY).toBeCloseTo(34.02, 1);
  });

  it('creates single-page PDF with US Letter and custom margin', async () => {
    const dummyJpeg = new Blob([new Uint8Array(100)], { type: 'image/jpeg' });
    const pdfBlob = await jpegToPdf({
      jpegBlob: dummyJpeg,
      widthPx: 1200,
      heightPx: 800,
      pageSize: 'letter',
      orientation: 'landscape',
      margin: 'small',
      title: 'US Letter Document',
    });

    expect(pdfBlob).toBeDefined();
    expect(pdfBlob.type).toBe('application/pdf');
    expect(pdfBlob.size).toBeGreaterThan(100);
  });

  it('merges multi-page PDF with custom options suite', async () => {
    const dummyJpeg1 = new Blob([new Uint8Array(100)], { type: 'image/jpeg' });
    const dummyJpeg2 = new Blob([new Uint8Array(100)], { type: 'image/jpeg' });

    const pages = [
      { jpegBlob: dummyJpeg1, widthPx: 1200, heightPx: 800 },
      { jpegBlob: dummyJpeg2, widthPx: 800, heightPx: 1200 },
    ];

    const mergedBlob = await mergeImagesToPdf(pages, 'Custom Suite Merged Document', {
      orientation: 'auto',
      pageSize: 'a4',
      margin: 'small',
    });

    expect(mergedBlob).toBeDefined();
    expect(mergedBlob.type).toBe('application/pdf');
    const buf = await mergedBlob.arrayBuffer();
    const text = new TextDecoder().decode(new Uint8Array(buf));
    expect(text.startsWith('%PDF-')).toBe(true);
    expect(text).toContain('/Type /Page');
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
