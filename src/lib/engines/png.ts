/**
 * png.ts — UPNG-based PNG encoder. Thin wrapper around worker/upng.ts
 * that fetches ImageData from a Blob. Used in tests and main-thread
 * fallback; the worker calls worker/upng.ts directly.
 */

import { decodePng, encodePng } from '../worker/upng';

export interface PngEngineOptions {
  targetBytes: number | null;
}

export async function convertToPng(
  input: Blob,
  opts: PngEngineOptions
): Promise<Blob> {
  if (input.type === 'image/png') {
    const buf = await input.arrayBuffer();
    const imageData = decodePng(buf);
    return encodePng(imageData, { targetBytes: opts.targetBytes });
  }

  const bitmap = await createImageBitmap(input);
  try {
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D context unavailable');
    ctx.drawImage(bitmap, 0, 0);
    const data = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
    return encodePng(data, { targetBytes: opts.targetBytes });
  } finally {
    bitmap.close?.();
  }
}