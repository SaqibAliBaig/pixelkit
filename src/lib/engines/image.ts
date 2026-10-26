/**
 * image.ts — pure canvas-based raster conversion.
 *
 * Exposed for tests and for any future non-worker usage. The worker itself
 * uses OffscreenCanvas directly (see convert.worker.ts) — this module is
 * the DOM-canvas variant for pages that want conversion on the main
 * thread (e.g., for testing or fallback).
 */

import { compressToTarget } from '../worker/compression';

export interface ImageEngineOptions {
  targetBytes: number | null;
  toMime: string;
  quality?: number;
}

export async function convertImageBlob(
  input: Blob,
  opts: ImageEngineOptions
): Promise<Blob> {
  const bitmap = await createImageBitmap(input);
  try {
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D context unavailable');
    ctx.drawImage(bitmap, 0, 0);
    const result = await compressToTarget(canvas, {
      targetBytes: opts.targetBytes,
      mime: opts.toMime,
      initialQuality: opts.quality,
    });
    return result.blob;
  } finally {
    bitmap.close?.();
  }
}