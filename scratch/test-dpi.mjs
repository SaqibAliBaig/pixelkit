// CRC32 table for PNG chunk checksum calculation
const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC_TABLE[n] = c;
}

function crc32(buf, offset, length) {
  let c = 0xffffffff;
  for (let i = 0; i < length; i++) {
    c = CRC_TABLE[(c ^ buf[offset + i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

export function setJpegDpi(jpegBuffer, dpi = 300) {
  const view = new DataView(jpegBuffer);
  if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) {
    return new Blob([jpegBuffer], { type: 'image/jpeg' });
  }

  // Check if marker at offset 2 is APP0 (JFIF)
  if (view.getUint16(2) === 0xffe0) {
    const len = view.getUint16(4);
    if (len >= 16 && view.byteLength >= 18) {
      // Check for 'JFIF\0'
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
  jfif.set([0x4a, 0x46, 0x49, 0x46, 0x00], 4); // 'JFIF\0'
  jfifView.setUint8(9, 1);       // Major version 1
  jfifView.setUint8(10, 1);      // Minor version 1
  jfifView.setUint8(11, 1);      // Units: 1 = dots per inch
  jfifView.setUint16(12, dpi, false); // Xdensity
  jfifView.setUint16(14, dpi, false); // Ydensity
  jfifView.setUint8(16, 0);      // Xthumbnail
  jfifView.setUint8(17, 0);      // Ythumbnail

  // Insert right after SOI (offset 2)
  const combined = new Uint8Array(jpegBuffer.byteLength + jfif.byteLength);
  combined.set(new Uint8Array(jpegBuffer.slice(0, 2)), 0);
  combined.set(jfif, 2);
  combined.set(new Uint8Array(jpegBuffer.slice(2)), 2 + jfif.byteLength);

  return new Blob([combined], { type: 'image/jpeg' });
}

export function setPngDpi(pngBuffer, dpi = 300) {
  const bytes = new Uint8Array(pngBuffer);
  // PNG signature check
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

  // 300 DPI in pixels per metre: Math.round(dpi / 0.0254)
  const ppm = Math.round(dpi / 0.0254);

  // Build pHYs chunk: 4 len (9) + 4 type ('pHYs') + 9 data + 4 crc = 21 bytes
  const chunk = new Uint8Array(21);
  const view = new DataView(chunk.buffer);
  view.setUint32(0, 9); // data length
  chunk.set([0x70, 0x48, 0x59, 0x73], 4); // 'pHYs'
  view.setUint32(8, ppm);  // X pixels per unit
  view.setUint32(12, ppm); // Y pixels per unit
  view.setUint8(16, 1);    // unit: 1 = metre
  const chunkCrc = crc32(chunk, 4, 13); // CRC over type (4) + data (9)
  view.setUint32(17, chunkCrc);

  // Scan chunks to see if pHYs already exists
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
    // Replace existing pHYs chunk
    const combined = new Uint8Array(bytes.length - physLen + chunk.length);
    combined.set(bytes.subarray(0, physStart), 0);
    combined.set(chunk, physStart);
    combined.set(bytes.subarray(physStart + physLen), physStart + chunk.length);
    return new Blob([combined], { type: 'image/png' });
  }

  // Insert before first IDAT, or after IHDR (33 bytes: 8 header + 25 IHDR chunk)
  const insertAt = firstIdat !== -1 ? firstIdat : 33;
  const combined = new Uint8Array(bytes.length + chunk.length);
  combined.set(bytes.subarray(0, insertAt), 0);
  combined.set(chunk, insertAt);
  combined.set(bytes.subarray(insertAt), insertAt + chunk.length);
  return new Blob([combined], { type: 'image/png' });
}

export function stripExifFromJpeg(jpegBuffer) {
  const view = new DataView(jpegBuffer);
  if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) {
    return new Blob([jpegBuffer], { type: 'image/jpeg' });
  }

  const parts = [];
  parts.push(new Uint8Array(jpegBuffer.slice(0, 2))); // SOI

  let offset = 2;
  while (offset + 4 <= view.byteLength) {
    const marker = view.getUint16(offset);
    if ((marker & 0xff00) !== 0xff00) break;

    // SOS (Start of Scan: 0xFFDA) indicates beginning of image data to EOI
    if (marker === 0xffda) {
      parts.push(new Uint8Array(jpegBuffer.slice(offset)));
      break;
    }

    const length = view.getUint16(offset + 2);
    if (length < 2 || offset + 2 + length > view.byteLength) break;

    // Omit APP1 (Exif: 0xFFE1), APP2..APP15 (0xFFE2-0xFFEF), and COM (0xFFFE)
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

// Verification test
const dummyJpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xda, 0x00, 0x02, 0xff, 0xd9]);
const withDpi = setJpegDpi(dummyJpeg.buffer, 300);
console.log('Dummy JPEG with DPI 300 size:', withDpi.size);

const dummyJpegWithExif = new Uint8Array([
  0xff, 0xd8,
  0xff, 0xe1, 0x00, 0x08, 0x45, 0x78, 0x69, 0x66,
  0xff, 0xda, 0x00, 0x02,
  0xff, 0xd9
]);
const stripped = stripExifFromJpeg(dummyJpegWithExif.buffer);
console.log('Stripped JPEG size:', stripped.size, 'vs original', dummyJpegWithExif.length);

