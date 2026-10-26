/**
 * MIME detection: extension fallback + magic-byte sniffing.
 *
 * `detectMimeFromMagicBytes` reads the first ~32 bytes and returns a MIME
 * string when it recognizes the signature. Returns null when the input is
 * ambiguous (e.g., PDFs whose sig spans 4 bytes we may not have).
 */

export const EXT_TO_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  avif: 'image/avif',
  heic: 'image/heic',
  heif: 'image/heif',
  gif: 'image/gif',
  bmp: 'image/bmp',
  pdf: 'application/pdf',
  svg: 'image/svg+xml',
  tiff: 'image/tiff',
  tif: 'image/tiff',
};

export const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'image/gif': 'gif',
  'image/bmp': 'bmp',
  'application/pdf': 'pdf',
  'image/svg+xml': 'svg',
  'image/tiff': 'tiff',
};

export function mimeFromExt(ext: string): string | undefined {
  return EXT_TO_MIME[ext.toLowerCase().replace(/^\./, '')];
}

export function extFromMime(mime: string): string | undefined {
  return MIME_TO_EXT[mime.toLowerCase()];
}

/**
 * Magic-byte sniffing. Returns a MIME if recognized, else null.
 */
export function detectMimeFromMagicBytes(bytes: Uint8Array): string | null {
  const b = bytes;
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    b.length >= 8 &&
    b[0] === 0x89 &&
    b[1] === 0x50 &&
    b[2] === 0x4e &&
    b[3] === 0x47 &&
    b[4] === 0x0d &&
    b[5] === 0x0a &&
    b[6] === 0x1a &&
    b[7] === 0x0a
  ) {
    return 'image/png';
  }
  if (
    b.length >= 6 &&
    b[0] === 0x47 &&
    b[1] === 0x49 &&
    b[2] === 0x46 &&
    b[3] === 0x38
  ) {
    return 'image/gif';
  }
  if (b.length >= 2 && b[0] === 0x42 && b[1] === 0x4d) {
    return 'image/bmp';
  }
  // TIFF: little-endian (II*\0) or big-endian (MM\0*)
  if (
    b.length >= 4 &&
    ((b[0] === 0x49 && b[1] === 0x49 && b[2] === 0x2a && b[3] === 0x00) ||
      (b[0] === 0x4d && b[1] === 0x4d && b[2] === 0x00 && b[3] === 0x2a))
  ) {
    return 'image/tiff';
  }
  // RIFF....WEBP
  if (
    b.length >= 12 &&
    b[0] === 0x52 &&
    b[1] === 0x49 &&
    b[2] === 0x46 &&
    b[3] === 0x46 &&
    b[8] === 0x57 &&
    b[9] === 0x45 &&
    b[10] === 0x42 &&
    b[11] === 0x50
  ) {
    return 'image/webp';
  }
  // ftyp....{heic|heix|mif1|hevc|avif}
  if (
    b.length >= 12 &&
    b[4] === 0x66 &&
    b[5] === 0x74 &&
    b[6] === 0x79 &&
    b[7] === 0x70
  ) {
    const brand = String.fromCharCode(b[8]!, b[9]!, b[10]!, b[11]!);
    if (brand.startsWith('heic') || brand.startsWith('heix') || brand === 'mif1' || brand === 'hevc') {
      return 'image/heic';
    }
    if (brand === 'avif' || brand === 'avis') {
      return 'image/avif';
    }
  }
  // %PDF
  if (
    b.length >= 4 &&
    b[0] === 0x25 &&
    b[1] === 0x50 &&
    b[2] === 0x44 &&
    b[3] === 0x46
  ) {
    return 'application/pdf';
  }
  // SVG: starts with <svg or <?xml or contains <svg
  if (b.length >= 4) {
    const text = new TextDecoder('utf-8').decode(b.slice(0, 64)).trim().toLowerCase();
    if (text.startsWith('<svg') || text.startsWith('<?xml') || text.includes('<svg')) {
      return 'image/svg+xml';
    }
  }
  return null;
}