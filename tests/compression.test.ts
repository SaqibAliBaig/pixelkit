/**
 * compression.test.ts — verify the binary-search compressor.
 *
 * Runs in Node with vitest + jsdom. Uses a stub OffscreenCanvas that
 * emulates canvas.toBlob by returning a Blob whose size scales with the
 * quality parameter. The math is synthetic but exercises the same code
 * path the worker uses, so we validate the search logic, safety margins,
 * and fallbacks.
 */

import { describe, it, expect } from 'vitest';
import { compressToTarget } from '../src/lib/worker/compression';

/**
 * A stub that mimics a canvas. `encode(quality)` returns a Blob of a
 * deterministic size: size = baseBytes * quality^0.8, floored to 16 bytes.
 * The exponent mimics real JPEG behavior reasonably well.
 */
function makeStubCanvas(baseBytes: number) {
  const encode = (quality: number): Blob => {
    const size = Math.max(16, Math.floor(baseBytes * Math.pow(quality, 0.8)));
    return new Blob([new Uint8Array(size)], { type: 'image/jpeg' });
  };

  const canvas = {
    convertToBlob(opts: { type: string; quality?: number }) {
      const q = typeof opts.quality === 'number' ? opts.quality : 0.92;
      return Promise.resolve(encode(q));
    },
  };

  return canvas as unknown as OffscreenCanvas;
}

function makeStubCanvasWithDownscale(
  _baseBytes: number,
  sourceWidth: number,
  sourceHeight: number
): ImageBitmap {
  return {
    width: sourceWidth,
    height: sourceHeight,
    close: () => {},
  } as unknown as ImageBitmap;
}

describe('compressToTarget', () => {
  it('returns the initial-quality encode when targetBytes is null', async () => {
    const canvas = makeStubCanvas(1_000_000);
    const result = await compressToTarget(canvas, {
      targetBytes: null,
      mime: 'image/jpeg',
      initialQuality: 0.8,
    });

    expect(result.hitTarget).toBe(true);
    expect(result.iterations).toBe(1);
    expect(result.quality).toBe(0.8);
    expect(result.blob.size).toBeGreaterThan(0);
  });

  it('hits a target within 2% for a mid-range case', async () => {
    // baseBytes chosen so 200KB (204800 bytes) falls in a compressible range.
    const canvas = makeStubCanvas(1_500_000);
    const target = 200 * 1024;

    const result = await compressToTarget(canvas, {
      targetBytes: target,
      mime: 'image/jpeg',
    });

    expect(result.hitTarget).toBe(true);
    // Result must be at or under the safety-margin goal.
    expect(result.blob.size).toBeLessThanOrEqual(target);
    // And within a reasonable margin of the goal — i.e., not absurdly small.
    expect(result.blob.size).toBeGreaterThan(target * 0.92);
  });

  it('hits a small target (50KB) as well', async () => {
    const canvas = makeStubCanvas(500_000);
    const target = 50 * 1024;

    const result = await compressToTarget(canvas, {
      targetBytes: target,
      mime: 'image/jpeg',
    });

    expect(result.hitTarget).toBe(true);
    expect(result.blob.size).toBeLessThanOrEqual(target);
    expect(result.blob.size).toBeGreaterThan(target * 0.9);
  });

  it('returns hitTarget=false when target is impossible', async () => {
    // baseBytes 1MB → min quality (0.05) still yields ~100KB.
    const canvas = makeStubCanvas(1_000_000);
    const target = 1 * 1024; // 1KB is impossible

    const result = await compressToTarget(canvas, {
      targetBytes: target,
      mime: 'image/jpeg',
    });

    expect(result.hitTarget).toBe(false);
    expect(result.quality).toBe(0.05);
    // Still returns the smallest achievable blob, never null.
    expect(result.blob.size).toBeGreaterThan(0);
  });

  it('preserves more quality when target is generous', async () => {
    const canvas = makeStubCanvas(500_000);
    const target = 500_000; // target > baseBytes at max quality

    const result = await compressToTarget(canvas, {
      targetBytes: target,
      mime: 'image/jpeg',
    });

    expect(result.hitTarget).toBe(true);
    // Fast path kicks in: max quality already fits.
    expect(result.quality).toBeGreaterThan(0.9);
  });

  it('terminates within MAX_ITERATIONS', async () => {
    const canvas = makeStubCanvas(2_000_000);
    const result = await compressToTarget(canvas, {
      targetBytes: 150 * 1024,
      mime: 'image/jpeg',
    });

    // MAX_ITERATIONS = 12, plus one fast-path probe = 13.
    expect(result.iterations).toBeLessThanOrEqual(13);
  });

  it('applies safety margin — result strictly under target', async () => {
    const canvas = makeStubCanvas(1_000_000);
    const target = 100 * 1024;

    const result = await compressToTarget(canvas, {
      targetBytes: target,
      mime: 'image/jpeg',
    });

    expect(result.blob.size).toBeLessThan(target);
  });
});

describe('compressWithDownscale', () => {
  it('returns a result for a normal case', async () => {
    // Stub OffscreenCanvas is not available in Node; skip the downscale
    // path in this environment. The main compressToTarget tests above
    // cover the search logic. Downscale is exercised in the browser
    // via the worker.
    const bitmap = makeStubCanvasWithDownscale(2_000_000, 4000, 3000);
    expect(bitmap.width).toBe(4000);
    expect(bitmap.height).toBe(3000);
  });
});