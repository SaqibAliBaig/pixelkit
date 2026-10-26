import { describe, it, expect } from 'vitest';
import { applyAdjustments } from '../src/lib/worker/adjustments';

describe('Image Adjustments module', () => {
// Polyfill / mock OffscreenCanvas and createImageBitmap for Node vitest runner
class MockOffscreenCanvas {
  width: number;
  height: number;
  imageSmoothingEnabled = false;
  imageSmoothingQuality = 'low';
  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }
  getContext(_type: string) {
    return {
      imageSmoothingEnabled: false,
      imageSmoothingQuality: 'low',
      drawImage: () => {},
      save: () => {},
      restore: () => {},
      translate: () => {},
      rotate: () => {},
      scale: () => {},
      getImageData: (_x: number, _y: number, w: number, h: number) => ({
        data: new Uint8ClampedArray(w * h * 4),
      }),
      putImageData: () => {},
      fillRect: () => {},
    };
  }
}

// @ts-expect-error Node mock
globalThis.OffscreenCanvas = MockOffscreenCanvas;
(globalThis as unknown as { createImageBitmap: unknown }).createImageBitmap = (source: { width: number; height: number }) => {
  return Promise.resolve({
    width: source.width,
    height: source.height,
    close: () => {},
  } as ImageBitmap);
};

// Helper to create an ImageBitmap with test dimensions
function createTestBitmap(width: number, height: number): Promise<ImageBitmap> {
  return Promise.resolve({
    width,
    height,
    close: () => {},
  } as ImageBitmap);
}

  it('applies 1:1 square crop correctly', async () => {
    const src = await createTestBitmap(1000, 500); // 2:1 ratio
    const adjusted = await applyAdjustments(src, { cropAspect: '1:1' });

    // Square crop of 1000x500 should be 500x500
    expect(adjusted.width).toBe(500);
    expect(adjusted.height).toBe(500);
    src.close?.();
    adjusted.close?.();
  });

  it('applies 3.5:4.5 passport crop correctly', async () => {
    const src = await createTestBitmap(1000, 1000); // 1:1 ratio
    const adjusted = await applyAdjustments(src, { cropAspect: '3.5:4.5' });

    // Target ratio ~0.7778
    const ratio = adjusted.width / adjusted.height;
    expect(Math.abs(ratio - (3.5 / 4.5))).toBeLessThan(0.01);
    src.close?.();
    adjusted.close?.();
  });

  it('applies percentage scaling correctly (50%)', async () => {
    const src = await createTestBitmap(800, 600);
    const adjusted = await applyAdjustments(src, {
      dimensions: { mode: 'custom', scalePercent: 50 },
    });

    expect(adjusted.width).toBe(400);
    expect(adjusted.height).toBe(300);
    src.close?.();
    adjusted.close?.();
  });

  it('applies rotation by 90 degrees and swaps dimensions', async () => {
    const src = await createTestBitmap(800, 400);
    const adjusted = await applyAdjustments(src, { rotate: 90 });

    expect(adjusted.width).toBe(400);
    expect(adjusted.height).toBe(800);
    src.close?.();
    adjusted.close?.();
  });

  it('applies rotation by 180 degrees without dimension swap', async () => {
    const src = await createTestBitmap(800, 400);
    const adjusted = await applyAdjustments(src, { rotate: 180 });

    expect(adjusted.width).toBe(800);
    expect(adjusted.height).toBe(400);
    src.close?.();
    adjusted.close?.();
  });

  it('applies rotation by 270 degrees and swaps dimensions', async () => {
    const src = await createTestBitmap(800, 400);
    const adjusted = await applyAdjustments(src, { rotate: 270 });

    expect(adjusted.width).toBe(400);
    expect(adjusted.height).toBe(800);
    src.close?.();
    adjusted.close?.();
  });

  it('applies horizontal flip and grayscale without errors', async () => {
    const src = await createTestBitmap(400, 400);
    const adjusted = await applyAdjustments(src, { flipH: true, grayscale: true });

    expect(adjusted.width).toBe(400);
    expect(adjusted.height).toBe(400);
    src.close?.();
    adjusted.close?.();
  });

  it('applies cropAnchor (top, center, bottom) properly on portrait ratios', async () => {
    const src = await createTestBitmap(1000, 2000); // Taller than 1:1
    const adjustedTop = await applyAdjustments(src, { cropAspect: '1:1', cropAnchor: 'top' });
    const adjustedBottom = await applyAdjustments(src, { cropAspect: '1:1', cropAnchor: 'bottom' });

    expect(adjustedTop.width).toBe(1000);
    expect(adjustedTop.height).toBe(1000);
    expect(adjustedBottom.width).toBe(1000);
    expect(adjustedBottom.height).toBe(1000);
    src.close?.();
    adjustedTop.close?.();
    adjustedBottom.close?.();
  });

  it('applies customCropBox normalized coordinates accurately', async () => {
    const src = await createTestBitmap(1000, 1000);
    const adjusted = await applyAdjustments(src, {
      customCropBox: { x: 0.1, y: 0.2, width: 0.5, height: 0.6 },
    });

    expect(adjusted.width).toBe(500);
    expect(adjusted.height).toBe(600);
    src.close?.();
    adjusted.close?.();
  });

  it('applies "contain" fit mode to fit proportionally within bounding box', async () => {
    // 1000x1000 square inside 1200x800 box -> constrained by height to 800x800
    const src = await createTestBitmap(1000, 1000);
    const adjusted = await applyAdjustments(src, {
      dimensions: { mode: 'custom', width: 1200, height: 800, fit: 'contain' },
    });

    expect(adjusted.width).toBe(800);
    expect(adjusted.height).toBe(800);
    src.close?.();
    adjusted.close?.();
  });

  it('applies "cover" fit mode to fill exact target box', async () => {
    // 1000x1000 square covering 1200x800 box -> canvas is exactly 1200x800
    const src = await createTestBitmap(1000, 1000);
    const adjusted = await applyAdjustments(src, {
      dimensions: { mode: 'custom', width: 1200, height: 800, fit: 'cover' },
    });

    expect(adjusted.width).toBe(1200);
    expect(adjusted.height).toBe(800);
    src.close?.();
    adjusted.close?.();
  });

  it('applies "fill" fit mode for direct unconstrained stretch', async () => {
    const src = await createTestBitmap(1000, 500);
    const adjusted = await applyAdjustments(src, {
      dimensions: { mode: 'custom', width: 1200, height: 800, fit: 'fill' },
    });

    expect(adjusted.width).toBe(1200);
    expect(adjusted.height).toBe(800);
    src.close?.();
    adjusted.close?.();
  });

  it('prevents upscaling when noUpscale is true', async () => {
    // 400x300 image targeting 1920x1080 with downscale-only guardrail
    const src = await createTestBitmap(400, 300);
    const adjusted = await applyAdjustments(src, {
      dimensions: { mode: 'custom', width: 1920, height: 1080, fit: 'contain', noUpscale: true },
    });

    // Stays at original dimensions
    expect(adjusted.width).toBe(400);
    expect(adjusted.height).toBe(300);
    src.close?.();
    adjusted.close?.();
  });

  it('allows upscaling when noUpscale is false', async () => {
    const src = await createTestBitmap(400, 300);
    const adjusted = await applyAdjustments(src, {
      dimensions: { mode: 'custom', width: 800, height: 600, fit: 'contain', noUpscale: false },
    });

    expect(adjusted.width).toBe(800);
    expect(adjusted.height).toBe(600);
    src.close?.();
    adjusted.close?.();
  });
});


