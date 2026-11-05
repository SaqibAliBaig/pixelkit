import fs from 'fs';

const functionsToAdd = `
// CRC32 table for PNG chunk checksum calculation
const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC_TABLE[n] = c;
}

function crc32(buf: Uint8Array, offset: number, length: number): number {
  let c = 0xffffffff;
  for (let i = 0; i < length; i++) {
    c = CRC_TABLE[(c ^ buf[offset + i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

/**
 * Sets DPI metadata in a JPEG buffer (JFIF APP0 segment).
 * Does not re-encode or degrade image pixels.
 */
export function setJpegDpi(jpegBuffer: ArrayBuffer, dpi = 300): Blob {
  const view = new DataView(jpegBuffer);
  if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) {
    return new Blob([jpegBuffer], { type: 'image/jpeg' });
  }

  // Check if marker at offset 2 is APP0 (JFIF)
  if (view.getUint16(2) === 0xffe0) {
    const len = view.getUint16(4);
    if (len >= 16 && view.byteLength >= 18) {
      if (
        view.getUint8(6) === 0x4a &&
        view.getUint8(7) === 0x46 &&
        view.getUint8(8) === 0x49 &&
        view.getUint8(9) === 0x46 &&
        view.getUint8(10) === 0x00
      ) {
        const copy = new Uint8Array(jpegBuffer.slice(0));
        const copyView = new DataView(copy.buffer);
        copyView.setUint8(13, 1); // 1 = dots per inch (DPI)
        copyView.setUint16(14, dpi, false); // Xdensity
        copyView.setUint16(16, dpi, false); // Ydensity
        return new Blob([copy], { type: 'image/jpeg' });
      }
    }
  }

  // If no APP0 JFIF marker exists, synthesize standard 18-byte JFIF APP0 segment
  const jfif = new Uint8Array(18);
  const jfifView = new DataView(jfif.buffer);
  jfifView.setUint16(0, 0xffe0); // APP0 marker
  jfifView.setUint16(2, 16);     // Length (includes length bytes)
  jfif.set([0x4a, 0x46, 0x49, 0x46, 0x00], 4); // 'JFIF\\0'
  jfifView.setUint8(9, 1);       // Major version 1
  jfifView.setUint8(10, 1);      // Minor version 1
  jfifView.setUint8(11, 1);      // Units: 1 = dots per inch
  jfifView.setUint16(12, dpi, false); // Xdensity
  jfifView.setUint16(14, dpi, false); // Ydensity
  jfifView.setUint8(16, 0);      // Xthumbnail
  jfifView.setUint8(17, 0);      // Ythumbnail

  const combined = new Uint8Array(jpegBuffer.byteLength + jfif.byteLength);
  combined.set(new Uint8Array(jpegBuffer.slice(0, 2)), 0);
  combined.set(jfif, 2);
  combined.set(new Uint8Array(jpegBuffer.slice(2)), 2 + jfif.byteLength);

  return new Blob([combined], { type: 'image/jpeg' });
}

/**
 * Sets DPI metadata in a PNG buffer via pHYs chunk.
 * Does not re-encode or degrade image pixels.
 */
export function setPngDpi(pngBuffer: ArrayBuffer, dpi = 300): Blob {
  const bytes = new Uint8Array(pngBuffer);
  if (
    bytes.length < 8 ||
    bytes[0] !== 0x89 ||
    bytes[1] !== 0x50 ||
    bytes[2] !== 0x4e ||
    bytes[3] !== 0x47 ||
    bytes[4] !== 0x0d ||
    bytes[5] !== 0x0a ||
    bytes[6] !== 0x1a ||
    bytes[7] !== 0x0a
  ) {
    return new Blob([pngBuffer], { type: 'image/png' });
  }

  const ppm = Math.round(dpi / 0.0254);
  const chunk = new Uint8Array(21);
  const view = new DataView(chunk.buffer);
  view.setUint32(0, 9);
  chunk.set([0x70, 0x48, 0x59, 0x73], 4); // 'pHYs'
  view.setUint32(8, ppm);
  view.setUint32(12, ppm);
  view.setUint8(16, 1);
  const chunkCrc = crc32(chunk, 4, 13);
  view.setUint32(17, chunkCrc);

  let offset = 8;
  let physStart = -1;
  let physLen = 0;
  let firstIdat = -1;

  while (offset + 8 <= bytes.length) {
    const chunkView = new DataView(pngBuffer, offset, 8);
    const len = chunkView.getUint32(0);
    const type = String.fromCharCode(
      bytes[offset + 4],
      bytes[offset + 5],
      bytes[offset + 6],
      bytes[offset + 7]
    );

    if (type === 'pHYs') {
      physStart = offset;
      physLen = 12 + len;
      break;
    }
    if (type === 'IDAT' && firstIdat === -1) {
      firstIdat = offset;
    }

    offset += 12 + len;
  }

  if (physStart !== -1) {
    const combined = new Uint8Array(bytes.length - physLen + chunk.length);
    combined.set(bytes.subarray(0, physStart), 0);
    combined.set(chunk, physStart);
    combined.set(bytes.subarray(physStart + physLen), physStart + chunk.length);
    return new Blob([combined], { type: 'image/png' });
  }

  const insertAt = firstIdat !== -1 ? firstIdat : 33;
  const combined = new Uint8Array(bytes.length + chunk.length);
  combined.set(bytes.subarray(0, insertAt), 0);
  combined.set(chunk, insertAt);
  combined.set(bytes.subarray(insertAt), insertAt + chunk.length);
  return new Blob([combined], { type: 'image/png' });
}

/**
 * Strips all EXIF, GPS, camera metadata, and COM markers from JPEG buffers.
 */
export function stripExifFromJpeg(jpegBuffer: ArrayBuffer): Blob {
  const view = new DataView(jpegBuffer);
  if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) {
    return new Blob([jpegBuffer], { type: 'image/jpeg' });
  }

  const parts: Uint8Array[] = [];
  parts.push(new Uint8Array(jpegBuffer.slice(0, 2))); // SOI

  let offset = 2;
  while (offset + 4 <= view.byteLength) {
    const marker = view.getUint16(offset);
    if ((marker & 0xff00) !== 0xff00) break;

    if (marker === 0xffda) {
      parts.push(new Uint8Array(jpegBuffer.slice(offset)));
      break;
    }

    const length = view.getUint16(offset + 2);
    if (length < 2 || offset + 2 + length > view.byteLength) break;

    const isExifOrMeta =
      (marker >= 0xffe1 && marker <= 0xffef) ||
      marker === 0xfffe;

    if (!isExifOrMeta) {
      parts.push(new Uint8Array(jpegBuffer.slice(offset, offset + 2 + length)));
    }

    offset += 2 + length;
  }

  const totalLen = parts.reduce((acc, p) => acc + p.byteLength, 0);
  const combined = new Uint8Array(totalLen);
  let pos = 0;
  for (const part of parts) {
    combined.set(part, pos);
    pos += part.byteLength;
  }

  return new Blob([combined], { type: 'image/jpeg' });
}

/**
 * Strips ancillary metadata chunks (eXIf, tEXt, zTXt, iTXt) from PNG buffers.
 */
export function stripMetadataFromPng(pngBuffer: ArrayBuffer): Blob {
  const bytes = new Uint8Array(pngBuffer);
  if (bytes.length < 8 || bytes[0] !== 0x89) {
    return new Blob([pngBuffer], { type: 'image/png' });
  }

  const parts: Uint8Array[] = [bytes.subarray(0, 8)];
  let offset = 8;

  while (offset + 8 <= bytes.length) {
    const chunkView = new DataView(pngBuffer, offset, 8);
    const len = chunkView.getUint32(0);
    const type = String.fromCharCode(
      bytes[offset + 4],
      bytes[offset + 5],
      bytes[offset + 6],
      bytes[offset + 7]
    );

    const isMeta = ['eXIf', 'tEXt', 'zTXt', 'iTXt'].includes(type);
    if (!isMeta) {
      parts.push(bytes.subarray(offset, offset + 12 + len));
    }

    offset += 12 + len;
  }

  const totalLen = parts.reduce((acc, p) => acc + p.byteLength, 0);
  const combined = new Uint8Array(totalLen);
  let pos = 0;
  for (const part of parts) {
    combined.set(part, pos);
    pos += part.byteLength;
  }

  return new Blob([combined], { type: 'image/png' });
}
`;

let content = fs.readFileSync('src/lib/worker/exif.ts', 'utf8');
content += functionsToAdd;
fs.writeFileSync('src/lib/worker/exif.ts', content, 'utf8');
console.log('Appended DPI and metadata strip functions to src/lib/worker/exif.ts');

