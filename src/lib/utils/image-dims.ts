/**
 * Fast image dimension extractor.
 * Parses headers from the first ~64KB of an image file to determine
 * natural width & height in <0.1ms without decoding full pixel bitmaps into memory.
 */

export interface ImageDimensions {
  width: number;
  height: number;
}

const u = (arr: Uint8Array, i: number): number => arr[i] ?? 0;

/**
 * Sniffs dimensions directly from raw file bytes without decoding pixels.
 */
export function parseDimensionsFromBytes(bytes: Uint8Array): ImageDimensions | null {
  if (bytes.length < 10) return null;

  // 1. PNG: 8-byte signature + IHDR chunk (starts at byte 8)
  // Bytes 16-19 = Width (big-endian), Bytes 20-23 = Height (big-endian)
  if (
    bytes.length >= 24 &&
    u(bytes, 0) === 0x89 &&
    u(bytes, 1) === 0x50 &&
    u(bytes, 2) === 0x4e &&
    u(bytes, 3) === 0x47
  ) {
    const width = (u(bytes, 16) << 24) | (u(bytes, 17) << 16) | (u(bytes, 18) << 8) | u(bytes, 19);
    const height = (u(bytes, 20) << 24) | (u(bytes, 21) << 16) | (u(bytes, 22) << 8) | u(bytes, 23);
    if (width > 0 && height > 0) {
      return { width: width >>> 0, height: height >>> 0 };
    }
  }

  // 2. GIF: 'GIF87a' or 'GIF89a'
  // Bytes 6-7 = Width (little-endian), Bytes 8-9 = Height (little-endian)
  if (
    bytes.length >= 10 &&
    u(bytes, 0) === 0x47 &&
    u(bytes, 1) === 0x49 &&
    u(bytes, 2) === 0x46
  ) {
    const width = u(bytes, 6) | (u(bytes, 7) << 8);
    const height = u(bytes, 8) | (u(bytes, 9) << 8);
    if (width > 0 && height > 0) {
      return { width, height };
    }
  }

  // 3. BMP: 'BM'
  // Bytes 18-21 = Width (little-endian), Bytes 22-25 = Height (little-endian)
  if (bytes.length >= 26 && u(bytes, 0) === 0x42 && u(bytes, 1) === 0x4d) {
    const width = u(bytes, 18) | (u(bytes, 19) << 8) | (u(bytes, 20) << 16) | (u(bytes, 21) << 24);
    const rawHeight = u(bytes, 22) | (u(bytes, 23) << 8) | (u(bytes, 24) << 16) | (u(bytes, 25) << 24);
    const height = Math.abs(rawHeight);
    if (width > 0 && height > 0) {
      return { width, height };
    }
  }

  // 4. WebP: 'RIFF'....'WEBP'
  if (
    bytes.length >= 30 &&
    u(bytes, 0) === 0x52 &&
    u(bytes, 1) === 0x49 &&
    u(bytes, 2) === 0x46 &&
    u(bytes, 3) === 0x46 &&
    u(bytes, 8) === 0x57 &&
    u(bytes, 9) === 0x45 &&
    u(bytes, 10) === 0x42 &&
    u(bytes, 11) === 0x50
  ) {
    const chunkType = String.fromCharCode(u(bytes, 12), u(bytes, 13), u(bytes, 14), u(bytes, 15));
    // Lossy VP8
    if (chunkType === 'VP8 ' && bytes.length >= 30) {
      if (u(bytes, 23) === 0x9d && u(bytes, 24) === 0x01 && u(bytes, 25) === 0x2a) {
        const width = (u(bytes, 26) | (u(bytes, 27) << 8)) & 0x3fff;
        const height = (u(bytes, 28) | (u(bytes, 29) << 8)) & 0x3fff;
        if (width > 0 && height > 0) return { width, height };
      }
    }
    // Lossless VP8L
    if (chunkType === 'VP8L' && bytes.length >= 25 && u(bytes, 20) === 0x2f) {
      const b1 = u(bytes, 21), b2 = u(bytes, 22), b3 = u(bytes, 23), b4 = u(bytes, 24);
      const width = 1 + (((b2 & 0x3f) << 8) | b1);
      const height = 1 + (((b4 & 0x0f) << 10) | (b3 << 2) | ((b2 & 0xc0) >> 6));
      if (width > 0 && height > 0) return { width, height };
    }
    // Extended VP8X
    if (chunkType === 'VP8X' && bytes.length >= 30) {
      const width = 1 + (u(bytes, 24) | (u(bytes, 25) << 8) | (u(bytes, 26) << 16));
      const height = 1 + (u(bytes, 27) | (u(bytes, 28) << 8) | (u(bytes, 29) << 16));
      if (width > 0 && height > 0) return { width, height };
    }
  }

  // 5. JPEG: starts with 0xFF 0xD8
  if (bytes.length >= 4 && u(bytes, 0) === 0xff && u(bytes, 1) === 0xd8) {
    let offset = 2;
    while (offset < bytes.length - 8) {
      if (u(bytes, offset) !== 0xff) {
        offset++;
        continue;
      }
      const marker = u(bytes, offset + 1);
      if (
        marker === 0xff ||
        marker === 0x00 ||
        marker === 0xd8 ||
        marker === 0xd9 ||
        (marker >= 0xd0 && marker <= 0xd7)
      ) {
        offset += 2;
        continue;
      }
      const len = (u(bytes, offset + 2) << 8) | u(bytes, offset + 3);
      if (len < 2) break;

      const isSof =
        (marker >= 0xc0 && marker <= 0xc3) ||
        (marker >= 0xc5 && marker <= 0xc7) ||
        (marker >= 0xc9 && marker <= 0xcb) ||
        (marker >= 0xcd && marker <= 0xcf);

      if (isSof && offset + 8 < bytes.length) {
        const height = (u(bytes, offset + 5) << 8) | u(bytes, offset + 6);
        const width = (u(bytes, offset + 7) << 8) | u(bytes, offset + 8);
        if (width > 0 && height > 0) {
          return { width, height };
        }
      }
      offset += 2 + len;
    }
  }

  // 6. SVG
  if (bytes.length >= 10) {
    const textSample = new TextDecoder().decode(bytes.slice(0, Math.min(bytes.length, 4096)));
    if (textSample.includes('<svg')) {
      const vb = textSample.match(/viewBox=["']\s*([0-9.-]+)[\s,]+([0-9.-]+)[\s,]+([0-9.-]+)[\s,]+([0-9.-]+)\s*["']/i);
      if (vb && vb[3] && vb[4]) {
        const width = Math.round(parseFloat(vb[3]));
        const height = Math.round(parseFloat(vb[4]));
        if (width > 0 && height > 0) return { width, height };
      }
      const wm = textSample.match(/\bwidth=["']\s*([0-9.]+)/i);
      const hm = textSample.match(/\bheight=["']\s*([0-9.]+)/i);
      if (wm && hm && wm[1] && hm[1]) {
        const width = Math.round(parseFloat(wm[1]));
        const height = Math.round(parseFloat(hm[1]));
        if (width > 0 && height > 0) return { width, height };
      }
    }
  }

  return null;
}

/**
 * Extracts image dimensions without blocking the main UI thread.
 * 1. Checks file header in first 64KB (instant, zero memory allocation).
 * 2. Falls back to async Image decoder without holding full RGBA bitmaps in JS.
 */
export async function readImageDimensionsFast(file: File): Promise<ImageDimensions | null> {
  // 1. Instant header inspection
  try {
    const slice = await file.slice(0, 65536).arrayBuffer();
    const dims = parseDimensionsFromBytes(new Uint8Array(slice));
    if (dims && dims.width > 0 && dims.height > 0) {
      return dims;
    }
  } catch {
    // continue to fallback
  }

  // 2. Fallback: browser Image object with decoding="async" (off-thread)
  if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
    return new Promise((resolve) => {
      let resolved = false;
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => {
        if (resolved) return;
        resolved = true;
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        URL.revokeObjectURL(url);
        resolve(w > 0 && h > 0 ? { width: w, height: h } : null);
      };
      img.onerror = () => {
        if (resolved) return;
        resolved = true;
        URL.revokeObjectURL(url);
        resolve(null);
      };
      img.src = url;
    });
  }

  return null;
}
