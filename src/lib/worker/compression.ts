/**
 * Binary-search compression for lossy formats (JPG, WEBP, AVIF, PDF-embedded JPG).
 *
 * Given a canvas and a target byte size, it converges in ~12 iterations to
 * the highest quality that still fits under the target. Falls back to
 * returning the smallest achievable blob if the target is impossibly small.
 *
 * Pure function; no DOM access beyond what the caller passes in. Runs in
 * a Web Worker in production.
 */

const DEFAULT_QUALITY = 0.85;
const MIN_QUALITY = 0.05;
const MAX_QUALITY = 0.98;
const MAX_ITERATIONS = 12;
const SAFETY_MARGIN = 0.97; // leave 3% headroom so the result is *under* target

export interface CompressOptions {
  targetBytes: number | null;
  mime: string;
  initialQuality?: number;
}

export interface CompressResult {
  blob: Blob;
  quality: number;
  iterations: number;
  hitTarget: boolean;
}

function canvasToBlob(canvas: HTMLCanvasElement | OffscreenCanvas, mime: string, quality: number): Promise<Blob> {
  if ('convertToBlob' in canvas) {
    return canvas.convertToBlob({ type: mime, quality });
  }
  return new Promise((resolve, reject) => {
    (canvas as HTMLCanvasElement).toBlob(
      (b) => (b ? resolve(b) : reject(new Error('canvas.toBlob returned null'))),
      mime,
      quality
    );
  });
}

/**
 * If no target, encode once at the default quality (or user-provided).
 */
async function encodeOnce(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  mime: string,
  quality: number
): Promise<CompressResult> {
  const blob = await canvasToBlob(canvas, mime, quality);
  return { blob, quality, iterations: 1, hitTarget: true };
}

/**
 * Binary-search encode to hit `targetBytes`.
 */
export async function compressToTarget(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  opts: CompressOptions
): Promise<CompressResult> {
  const { targetBytes, mime, initialQuality = DEFAULT_QUALITY } = opts;

  if (!targetBytes || targetBytes <= 0) {
    return encodeOnce(canvas, mime, initialQuality);
  }

  // Account for the target being too small for even the lowest quality —
  // we still try, then return the smallest achievable result.
  let lo = MIN_QUALITY;
  let hi = MAX_QUALITY;
  let best: Blob | null = null;
  let bestQuality = lo;
  let iterations = 0;
  const goal = targetBytes * SAFETY_MARGIN;

  // Fast path: if default-quality already fits, try to preserve more quality.
  const probe = await canvasToBlob(canvas, mime, MAX_QUALITY);
  iterations++;
  if (probe.size <= goal) {
    return { blob: probe, quality: MAX_QUALITY, iterations, hitTarget: true };
  }

  while (iterations < MAX_ITERATIONS && hi - lo > 0.0005) {
    const mid = (lo + hi) / 2;
    const blob = await canvasToBlob(canvas, mime, mid);
    iterations++;
    if (blob.size <= goal) {
      best = blob;
      bestQuality = mid;
      lo = mid;
    } else {
      hi = mid;
    }
  }

  if (!best) {
    // Couldn't hit target even at MIN_QUALITY — return smallest possible.
    const smallest = await canvasToBlob(canvas, mime, MIN_QUALITY);
    iterations++;
    return {
      blob: smallest,
      quality: MIN_QUALITY,
      iterations,
      hitTarget: false,
    };
  }

  return { blob: best, quality: bestQuality, iterations, hitTarget: true };
}

/**
 * Optional: try a dimension downscale if the quality search failed and
 * the caller is willing to trade resolution for size. Caller supplies
 * the factor; this module just uses canvas.createImageBitmap.
 */
export async function compressWithDownscale(
  source: ImageBitmap,
  opts: CompressOptions & {
    mime: string;
    minScale?: number;
    scaleStep?: number;
  }
): Promise<CompressResult> {
  const { targetBytes, mime, minScale = 0.3, scaleStep = 0.1 } = opts;
  if (!targetBytes) {
    const canvas = makeCanvas(source, mime);
    return encodeOnce(canvas, mime, DEFAULT_QUALITY);
  }

  let scale = 1;
  let lastResult: CompressResult | null = null;
  while (scale >= minScale) {
    const w = Math.max(1, Math.round(source.width * scale));
    const h = Math.max(1, Math.round(source.height * scale));
    const canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('OffscreenCanvas 2D context unavailable');
    if (mime === 'image/jpeg') {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, w, h);
    }
    ctx.drawImage(source, 0, 0, w, h);

    const result = await compressToTarget(canvas, { targetBytes, mime });
    lastResult = result;
    if (result.hitTarget) return result;

    scale -= scaleStep;
  }

  if (!lastResult) {
    throw new Error('Compression failed: no result');
  }
  return lastResult;
}

function makeCanvas(source: ImageBitmap, mime?: string): OffscreenCanvas {
  const c = new OffscreenCanvas(source.width, source.height);
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('OffscreenCanvas 2D context unavailable');
  if (mime === 'image/jpeg') {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, source.width, source.height);
  }
  ctx.drawImage(source, 0, 0);
  return c;
}