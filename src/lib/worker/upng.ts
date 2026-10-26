/**
 * PNG output via UPNG.js, with quantization if needed to hit a target size.
 *
 * UPNG (by @photopea) is a pure-JS PNG encoder/decoder. It supports
 * lossy quantization via `UPNG.encode(imgs, w, h, cnum, [dels])` where
 * `cnum` is the color count (palette size). We use that to hit a KB target
 * when needed.
 *
 * Loaded lazily by the worker so pages that never produce PNG don't pay
 * for it.
 */

import upngModule from 'upng-js';
const UPNG = (upngModule as unknown as { default?: typeof upngModule }).default || upngModule;

export interface PngOptions {
  targetBytes: number | null;
}

/**
 * Encode ImageData → PNG Blob. If `targetBytes` is set, we iterate the
 * palette size downward until the output fits or we hit 2 colors.
 */
export async function encodePng(
  imageData: ImageData,
  opts: PngOptions
): Promise<Blob> {
  const { data, width, height } = imageData;
  const rgba = data.buffer.slice(
    data.byteOffset,
    data.byteOffset + data.byteLength
  );

  if (!opts.targetBytes || opts.targetBytes <= 0) {
    const buf = UPNG.encode([rgba], width, height, 0);
    return new Blob([buf], { type: 'image/png' });
  }

  // Binary search on palette color count. Higher count = larger file but
  // better quality. We try a handful of power-of-2 stops, then refine.
  const stops = [0, 256, 128, 64, 32, 16, 8, 4, 2];
  let best: ArrayBuffer | null = null;
  const goal = opts.targetBytes * 0.97;

  for (const colors of stops) {
    const buf = UPNG.encode([rgba], width, height, colors);
    if (buf.byteLength <= goal) {
      best = buf;
      // If a higher-fidelity stop already fits, keep it and stop.
      break;
    }
  }

  if (!best) {
    // Even 2-color doesn't fit — return the smallest achievable.
    const buf = UPNG.encode([rgba], width, height, 2);
    return new Blob([buf], { type: 'image/png' });
  }

  return new Blob([best], { type: 'image/png' });
}

/**
 * Decode a PNG into raw ImageData. Used when the engine needs to
 * re-encode an incoming PNG at a different palette size.
 */
export function decodePng(buffer: ArrayBuffer): ImageData {
  const decoded = UPNG.decode(buffer);
  const rgba = UPNG.toRGBA8(decoded)[0];
  if (!rgba) throw new Error('UPNG: failed to decode PNG');
  return new ImageData(new Uint8ClampedArray(rgba), decoded.width, decoded.height);
}