/**
 * heic.ts — HEIC/HEIF decode. Thin wrapper that returns an ImageBitmap.
 */

import { heicToJpeg, heicToPng } from '../worker/heic';

export async function decodeHeic(
  file: Blob,
  preferLossless = false
): Promise<ImageBitmap> {
  const intermediate = preferLossless
    ? await heicToPng(file)
    : await heicToJpeg(file);
  return createImageBitmap(intermediate);
}