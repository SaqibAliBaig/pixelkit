/**
 * HEIC / HEIF decode via heic2any. Loaded lazily — only pages with HEIC
 * input pay for this dependency.
 */

import heic2any from 'heic2any';

/**
 * Convert a HEIC/HEIF file to a JPEG Blob at max quality, then return it
 * so the engine can route it into the normal canvas pipeline.
 */
export async function heicToJpeg(file: Blob): Promise<Blob> {
  try {
    const result = await heic2any({
      blob: file,
      toType: 'image/jpeg',
      quality: 0.95,
    });
    // heic2any returns Blob | Blob[]
    return Array.isArray(result) ? result[0]! : result;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`HEIC decode failed: ${msg}`);
  }
}

/**
 * Convert a HEIC/HEIF file to a PNG Blob (lossless intermediate).
 * Useful when target format is PNG and we want to avoid double JPEG loss.
 */
export async function heicToPng(file: Blob): Promise<Blob> {
  try {
    const result = await heic2any({
      blob: file,
      toType: 'image/png',
    });
    return Array.isArray(result) ? result[0]! : result;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`HEIC decode failed: ${msg}`);
  }
}