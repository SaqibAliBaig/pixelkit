/**
 * pdf.ts — wrap an image into a single-page PDF. Thin wrapper around
 * worker/pdf.ts + compression.
 */

import { jpegToPdf, pdfOverheadBytes } from '../worker/pdf';
import { compressToTarget } from '../worker/compression';

export interface PdfEngineOptions {
  targetBytes: number | null;
}

export async function convertToPdf(
  input: Blob,
  opts: PdfEngineOptions
): Promise<Blob> {
  const bitmap = await createImageBitmap(input);
  try {
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D context unavailable');
    ctx.drawImage(bitmap, 0, 0);

    const overhead = pdfOverheadBytes();
    const jpegTarget = opts.targetBytes
      ? Math.max(1024, opts.targetBytes - overhead)
      : null;

    const jpeg = await compressToTarget(canvas, {
      targetBytes: jpegTarget,
      mime: 'image/jpeg',
      initialQuality: 0.9,
    });

    return jpegToPdf({
      jpegBlob: jpeg.blob,
      widthPx: bitmap.width,
      heightPx: bitmap.height,
    });
  } finally {
    bitmap.close?.();
  }
}