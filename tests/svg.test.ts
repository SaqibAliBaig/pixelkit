import { describe, it, expect } from 'vitest';
import { encodeSvg } from '../src/lib/worker/svg';

// Mock OffscreenCanvas for Node test environment
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
    };
  }

  convertToBlob() {
    return Promise.resolve(new Blob(['fake-png-bytes'], { type: 'image/png' }));
  }
}

// @ts-expect-error Node environment mock
globalThis.OffscreenCanvas = MockOffscreenCanvas;

function createTestBitmap(width: number, height: number): ImageBitmap {
  return {
    width,
    height,
    close: () => {},
  } as ImageBitmap;
}

describe('SVG Vector Conversion & Scaling (1x, 2x, 3x, 4x)', () => {
  it('encodes SVG at 1x resolution (96 DPI)', async () => {
    const bmp = createTestBitmap(100, 80);
    const result = await encodeSvg(bmp, 1.0);

    expect(result.width).toBe(100);
    expect(result.height).toBe(80);
    expect(result.svgText).toContain('width="100" height="80"');
    expect(result.svgText).toContain('viewBox="0 0 100 80"');
    expect(result.svgText).toContain('<image width="100" height="80"');
    expect(result.blob.type).toBe('image/svg+xml');
  });

  it('encodes SVG at 2x resolution (192 DPI)', async () => {
    const bmp = createTestBitmap(100, 80);
    const result = await encodeSvg(bmp, 2.0);

    expect(result.width).toBe(200);
    expect(result.height).toBe(160);
    expect(result.svgText).toContain('width="200" height="160"');
    expect(result.svgText).toContain('viewBox="0 0 200 160"');
    expect(result.svgText).toContain('<image width="200" height="160"');
  });

  it('encodes SVG at 3x resolution (300 DPI)', async () => {
    const bmp = createTestBitmap(100, 80);
    const result = await encodeSvg(bmp, 3.0);

    expect(result.width).toBe(300);
    expect(result.height).toBe(240);
    expect(result.svgText).toContain('width="300" height="240"');
    expect(result.svgText).toContain('viewBox="0 0 300 240"');
    expect(result.svgText).toContain('<image width="300" height="240"');
  });

  it('encodes SVG at 4x resolution (600 DPI)', async () => {
    const bmp = createTestBitmap(100, 80);
    const result = await encodeSvg(bmp, 4.0);

    expect(result.width).toBe(400);
    expect(result.height).toBe(320);
    expect(result.svgText).toContain('width="400" height="320"');
    expect(result.svgText).toContain('viewBox="0 0 400 320"');
    expect(result.svgText).toContain('<image width="400" height="320"');
  });

  it('handles fractional and custom scale multipliers gracefully', async () => {
    const bmp = createTestBitmap(200, 100);
    const result = await encodeSvg(bmp, 1.5);

    expect(result.width).toBe(300);
    expect(result.height).toBe(150);
    expect(result.svgText).toContain('width="300" height="150"');
  });

  it('clamps extreme scale multipliers within safety bounds', async () => {
    const bmp = createTestBitmap(1000, 1000);
    // scale multiplier capped at max 8.0, and canvas dim capped at 8192px
    const result = await encodeSvg(bmp, 10.0);
    expect(result.width).toBeLessThanOrEqual(8192);
    expect(result.height).toBeLessThanOrEqual(8192);
  });
});
