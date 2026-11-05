/**
 * Lightweight EXIF preservation utility for Web Workers.
 *
 * Extracts and injects the APP1 EXIF segment (0xFF 0xE1) into JPEG blobs
 * without requiring heavy third-party dependencies.
 */

/**
 * Extracts the raw APP1 EXIF segment from a JPEG or HEIC-derived JPEG buffer.
 * Returns the entire segment starting with 0xFF 0xE1 up to length.
 */
export function extractExifSegment(jpegBuffer: ArrayBuffer): Uint8Array | null {
  const view = new DataView(jpegBuffer);
  // Must begin with JPEG SOI marker: 0xFF 0xD8
  if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) {
    return null;
  }

  let offset = 2;
  while (offset + 4 <= view.byteLength) {
    const marker = view.getUint16(offset);

    // Stop if we hit SOS (Start of Scan) or an invalid non-marker byte
    if (marker === 0xffda || (marker & 0xff00) !== 0xff00) {
      break;
    }

    const length = view.getUint16(offset + 2);
    if (length < 2 || offset + 2 + length > view.byteLength) {
      break;
    }

    // Check for APP1 marker (0xFF 0xE1)
    if (marker === 0xffe1) {
      // Check for Exif header: 'Exif\0\0' (0x45, 0x78, 0x69, 0x66, 0x00, 0x00)
      if (
        offset + 10 <= view.byteLength &&
        view.getUint8(offset + 4) === 0x45 &&
        view.getUint8(offset + 5) === 0x78 &&
        view.getUint8(offset + 6) === 0x69 &&
        view.getUint8(offset + 7) === 0x66 &&
        view.getUint8(offset + 8) === 0x00 &&
        view.getUint8(offset + 9) === 0x00
      ) {
        return new Uint8Array(jpegBuffer.slice(offset, offset + 2 + length));
      }
    }

    offset += 2 + length;
  }

  return null;
}

/**
 * Resets the EXIF Orientation tag (0x0112) in an APP1 segment to 1 (Top-Left / Normal).
 * This prevents double-rotation when the image bitmap was already rotated during canvas rendering.
 */
export function normalizeExifOrientation(app1Segment: Uint8Array): void {
  // app1Segment:
  // [0..1] = 0xFF 0xE1
  // [2..3] = length
  // [4..9] = 'Exif\0\0'
  // [10..] = TIFF header
  if (app1Segment.byteLength < 18) return;

  const view = new DataView(
    app1Segment.buffer,
    app1Segment.byteOffset,
    app1Segment.byteLength
  );

  const tiffStart = 10;
  const byteOrder = view.getUint16(tiffStart);
  let littleEndian = false;

  if (byteOrder === 0x4949) {
    // 'II' (Intel / Little Endian)
    littleEndian = true;
  } else if (byteOrder === 0x4d4d) {
    // 'MM' (Motorola / Big Endian)
    littleEndian = false;
  } else {
    return;
  }

  // Forty-two check
  if (view.getUint16(tiffStart + 2, littleEndian) !== 0x002a) {
    return;
  }

  const ifd0Offset = view.getUint32(tiffStart + 4, littleEndian);
  if (ifd0Offset < 8 || tiffStart + ifd0Offset + 2 > app1Segment.byteLength) {
    return;
  }

  const ifd0Start = tiffStart + ifd0Offset;
  const entryCount = view.getUint16(ifd0Start, littleEndian);

  let current = ifd0Start + 2;
  for (let i = 0; i < entryCount; i++) {
    if (current + 12 > app1Segment.byteLength) break;
    const tag = view.getUint16(current, littleEndian);

    if (tag === 0x0112) {
      // Orientation tag found! Set value to 1
      // For SHORT type (0x0003), count = 1, value is in first 2 bytes of the 4-byte value field
      view.setUint16(current + 8, 1, littleEndian);
      break;
    }
    current += 12;
  }
}

/**
 * Injects an APP1 EXIF segment into a JPEG buffer immediately after SOI (0xFF 0xD8).
 * If an APP0 (JFIF) marker exists, it places APP1 right after APP0 per JFIF/Exif conventions.
 */
export function insertExifIntoJpeg(
  jpegBuffer: ArrayBuffer,
  exifSegment: Uint8Array,
  resetOrientation = true
): Blob {
  const view = new DataView(jpegBuffer);
  if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) {
    return new Blob([jpegBuffer], { type: 'image/jpeg' });
  }

  // Clone segment if we mutate orientation
  const segmentToInsert = new Uint8Array(exifSegment);
  if (resetOrientation) {
    normalizeExifOrientation(segmentToInsert);
  }

  let insertOffset = 2; // Right after SOI (0xFF 0xD8)

  // If there is an APP0 (JFIF) marker, place APP1 right after it
  if (view.getUint16(2) === 0xffe0) {
    const app0Len = view.getUint16(4);
    insertOffset = 4 + app0Len;
  }

  // Assemble: [Header to insertOffset] + [EXIF Segment] + [Rest of JPEG]
  const combined = new Uint8Array(jpegBuffer.byteLength + segmentToInsert.byteLength);
  combined.set(new Uint8Array(jpegBuffer.slice(0, insertOffset)), 0);
  combined.set(segmentToInsert, insertOffset);
  combined.set(
    new Uint8Array(jpegBuffer.slice(insertOffset)),
    insertOffset + segmentToInsert.byteLength
  );

  return new Blob([combined], { type: 'image/jpeg' });
}

/**
 * Safely increases a JPEG file's byte size up to targetBytes by injecting
 * standard JPEG COM (Comment: 0xFF 0xFE) segments.
 * Conforms to ISO/IEC 10918-1: ignored by all image decoders and portal validators
 * while elevating the physical file size to meet portal minimum size requirements.
 */
export function padJpegToTargetBytes(
  jpegBuffer: ArrayBuffer,
  targetBytes: number
): Blob {
  const view = new DataView(jpegBuffer);
  if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8 || jpegBuffer.byteLength >= targetBytes) {
    return new Blob([jpegBuffer], { type: 'image/jpeg' });
  }

  let insertOffset = 2; // Right after SOI (0xFF 0xD8)
  if (view.getUint16(2) === 0xffe0) {
    const app0Len = view.getUint16(4);
    insertOffset = 4 + app0Len;
  }

  let bytesNeeded = targetBytes - jpegBuffer.byteLength;
  const segments: Uint8Array[] = [];

  while (bytesNeeded > 0) {
    // A COM marker needs 2 bytes for 0xFF 0xFE + 2 bytes for length = 4 bytes min.
    // Avoid leaving a 1..3 byte remainder after a 65535-byte segment.
    let segLen = Math.max(4, Math.min(65535, bytesNeeded));
    if (bytesNeeded > 65535 && bytesNeeded - segLen < 4) {
      segLen = 65530;
    }
    const seg = new Uint8Array(segLen);
    const segView = new DataView(seg.buffer);
    segView.setUint16(0, 0xfffe); // COM marker
    segView.setUint16(2, segLen - 2); // JPEG segment length includes the 2 length bytes (not the 2 marker bytes)
    // Payload bytes seg[4..segLen-1] default to 0x20 (ASCII space)
    seg.fill(0x20, 4);
    segments.push(seg);
    bytesNeeded -= segLen;
  }

  const totalPadding = segments.reduce((sum, s) => sum + s.byteLength, 0);
  const combined = new Uint8Array(jpegBuffer.byteLength + totalPadding);
  combined.set(new Uint8Array(jpegBuffer.slice(0, insertOffset)), 0);

  let currentOffset = insertOffset;
  for (const seg of segments) {
    combined.set(seg, currentOffset);
    currentOffset += seg.byteLength;
  }

  combined.set(new Uint8Array(jpegBuffer.slice(insertOffset)), currentOffset);

  return new Blob([combined], { type: 'image/jpeg' });
}


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
    c = (CRC_TABLE[(c ^ (buf[offset + i] ?? 0)) & 0xff] ?? 0) ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

/**
 * Updates XResolution (0x011A), YResolution (0x011B), and ResolutionUnit (0x0128)
 * inside any APP1 EXIF segment in a JPEG byte array in place.
 */
function updateExifDpiInJpegBytes(jpegBytes: Uint8Array, dpi: number): void {
  const view = new DataView(jpegBytes.buffer, jpegBytes.byteOffset, jpegBytes.byteLength);
  if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) return;

  let offset = 2;
  while (offset + 4 <= view.byteLength) {
    const marker = view.getUint16(offset);
    if (marker === 0xffda || (marker & 0xff00) !== 0xff00) break;
    const length = view.getUint16(offset + 2);
    if (length < 2 || offset + 2 + length > view.byteLength) break;

    if (
      marker === 0xffe1 &&
      offset + 18 <= view.byteLength &&
      view.getUint8(offset + 4) === 0x45 &&
      view.getUint8(offset + 5) === 0x78 &&
      view.getUint8(offset + 6) === 0x69 &&
      view.getUint8(offset + 7) === 0x66 &&
      view.getUint8(offset + 8) === 0x00 &&
      view.getUint8(offset + 9) === 0x00
    ) {
      const segEnd = offset + 2 + length;
      const tiffStart = offset + 10;
      const byteOrder = view.getUint16(tiffStart);
      if (byteOrder === 0x4949 || byteOrder === 0x4d4d) {
        const littleEndian = byteOrder === 0x4949;
        if (view.getUint16(tiffStart + 2, littleEndian) === 0x002a) {
          const ifd0Offset = view.getUint32(tiffStart + 4, littleEndian);
          const ifd0Start = tiffStart + ifd0Offset;
          if (ifd0Offset >= 8 && ifd0Start + 2 <= segEnd) {
            const entryCount = view.getUint16(ifd0Start, littleEndian);
            let current = ifd0Start + 2;
            for (let i = 0; i < entryCount; i++) {
              if (current + 12 > segEnd) break;
              const tag = view.getUint16(current, littleEndian);
              const type = view.getUint16(current + 2, littleEndian);
              if ((tag === 0x011a || tag === 0x011b) && type === 5) {
                const valOffset = view.getUint32(current + 8, littleEndian);
                if (tiffStart + valOffset + 8 <= segEnd) {
                  view.setUint32(tiffStart + valOffset, dpi, littleEndian);
                  view.setUint32(tiffStart + valOffset + 4, 1, littleEndian);
                }
              } else if (tag === 0x0128 && type === 3) {
                view.setUint16(current + 8, 2, littleEndian); // 2 = inches (DPI)
              }
              current += 12;
            }
          }
        }
      }
    }

    offset += 2 + length;
  }
}

/**
 * Sets DPI metadata in a JPEG buffer (both JFIF APP0 and EXIF IFD0 segments).
 * Does not re-encode or degrade image pixels.
 */
export function setJpegDpi(jpegBuffer: ArrayBuffer, dpi = 300): Blob {
  const safeDpi = Math.max(1, Math.min(65535, Math.round(dpi)));
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
        copyView.setUint16(14, safeDpi, false); // Xdensity
        copyView.setUint16(16, safeDpi, false); // Ydensity
        updateExifDpiInJpegBytes(copy, safeDpi);
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
  jfifView.setUint16(12, safeDpi, false); // Xdensity
  jfifView.setUint16(14, safeDpi, false); // Ydensity
  jfifView.setUint8(16, 0);      // Xthumbnail
  jfifView.setUint8(17, 0);      // Ythumbnail

  const combined = new Uint8Array(jpegBuffer.byteLength + jfif.byteLength);
  combined.set(new Uint8Array(jpegBuffer.slice(0, 2)), 0);
  combined.set(jfif, 2);
  combined.set(new Uint8Array(jpegBuffer.slice(2)), 2 + jfif.byteLength);
  updateExifDpiInJpegBytes(combined, safeDpi);

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
      (bytes[offset + 4] ?? 0), (bytes[offset + 5] ?? 0), (bytes[offset + 6] ?? 0), (bytes[offset + 7] ?? 0)
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
      (bytes[offset + 4] ?? 0), (bytes[offset + 5] ?? 0), (bytes[offset + 6] ?? 0), (bytes[offset + 7] ?? 0)
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

/**
 * Safely increases a PNG file's byte size up to targetBytes by inserting valid
 * ancillary tEXt chunk(s) right before the IEND chunk.
 * 100% lossless and compliant with ISO/IEC 15948.
 */
export function padPngToTargetBytes(pngBuffer: ArrayBuffer, targetBytes: number): Blob {
  const bytes = new Uint8Array(pngBuffer);
  if (
    bytes.length < 20 ||
    bytes[0] !== 0x89 ||
    bytes[1] !== 0x50 ||
    bytes[2] !== 0x4e ||
    bytes[3] !== 0x47 ||
    bytes.byteLength >= targetBytes
  ) {
    return new Blob([pngBuffer], { type: 'image/png' });
  }

  // Locate IEND chunk
  let offset = 8;
  let iendOffset = -1;
  while (offset + 8 <= bytes.length) {
    const chunkView = new DataView(pngBuffer, offset, 8);
    const len = chunkView.getUint32(0);
    const type = String.fromCharCode(
      bytes[offset + 4] ?? 0,
      bytes[offset + 5] ?? 0,
      bytes[offset + 6] ?? 0,
      bytes[offset + 7] ?? 0
    );
    if (type === 'IEND') {
      iendOffset = offset;
      break;
    }
    if (offset + 12 + len > bytes.length) break;
    offset += 12 + len;
  }

  if (iendOffset === -1) {
    return new Blob([pngBuffer], { type: 'image/png' });
  }

  let bytesNeeded = targetBytes - bytes.byteLength;
  const chunks: Uint8Array[] = [];

  // Each PNG chunk has 12 bytes overhead (4 len + 4 type + 4 CRC) + min 2 bytes data ('P\0') = 14 bytes min
  while (bytesNeeded > 0) {
    let totalChunkBytes = Math.max(14, Math.min(65536, bytesNeeded));
    if (bytesNeeded > 65536 && bytesNeeded - totalChunkBytes < 14) {
      totalChunkBytes = bytesNeeded - 14;
    }
    const dataLen = totalChunkBytes - 12;
    const chunk = new Uint8Array(totalChunkBytes);
    const view = new DataView(chunk.buffer);
    view.setUint32(0, dataLen);
    // 'tEXt' = 0x74, 0x45, 0x58, 0x74
    chunk.set([0x74, 0x45, 0x58, 0x74], 4);
    // Keyword 'P\0' followed by space padding (0x20)
    chunk[8] = 0x50; // 'P'
    chunk[9] = 0x00; // null separator
    if (dataLen > 2) {
      chunk.fill(0x20, 10, 8 + dataLen);
    }
    const c = crc32(chunk, 4, 4 + dataLen);
    view.setUint32(8 + dataLen, c);
    chunks.push(chunk);
    bytesNeeded -= totalChunkBytes;
  }

  const totalPad = chunks.reduce((sum, ch) => sum + ch.byteLength, 0);
  const combined = new Uint8Array(bytes.byteLength + totalPad);
  combined.set(bytes.subarray(0, iendOffset), 0);
  let pos = iendOffset;
  for (const ch of chunks) {
    combined.set(ch, pos);
    pos += ch.byteLength;
  }
  combined.set(bytes.subarray(iendOffset), pos);

  return new Blob([combined], { type: 'image/png' });
}

/**
 * Safely increases a WebP file's byte size up to targetBytes by appending a valid
 * RIFF 'JUNK' chunk and updating the RIFF container length header.
 */
export function padWebpToTargetBytes(webpBuffer: ArrayBuffer, targetBytes: number): Blob {
  const bytes = new Uint8Array(webpBuffer);
  if (
    bytes.length < 12 ||
    bytes[0] !== 0x52 || // 'R'
    bytes[1] !== 0x49 || // 'I'
    bytes[2] !== 0x46 || // 'F'
    bytes[3] !== 0x46 || // 'F'
    bytes[8] !== 0x57 || // 'W'
    bytes[9] !== 0x45 || // 'E'
    bytes[10] !== 0x42 || // 'B'
    bytes[11] !== 0x50 || // 'P'
    bytes.byteLength >= targetBytes
  ) {
    return new Blob([webpBuffer], { type: 'image/webp' });
  }

  // Ensure existing RIFF length is even-padded if needed
  const alignPad = bytes.byteLength % 2 === 1 ? 1 : 0;
  const remaining = targetBytes - (bytes.byteLength + alignPad);
  // RIFF chunk header is 8 bytes ('JUNK' + uint32 little-endian payload size)
  if (remaining < 8) {
    return new Blob([webpBuffer], { type: 'image/webp' });
  }

  let payloadLen = remaining - 8;
  // RIFF chunks must be even-aligned
  if (payloadLen % 2 === 1) {
    payloadLen += 1;
  }

  const totalLen = bytes.byteLength + alignPad + 8 + payloadLen;
  const combined = new Uint8Array(totalLen);
  combined.set(bytes, 0);
  const junkOffset = bytes.byteLength + alignPad;
  // 'JUNK' = 0x4A, 0x55, 0x4E, 0x4B
  combined.set([0x4a, 0x55, 0x4e, 0x4b], junkOffset);
  const view = new DataView(combined.buffer);
  view.setUint32(junkOffset + 4, payloadLen, true);
  // Update RIFF total size = totalLen - 8 (little-endian)
  view.setUint32(4, totalLen - 8, true);

  return new Blob([combined], { type: 'image/webp' });
}

/**
 * Reads EXIF Orientation tag (1..8) from a JPEG buffer. Returns 1 if normal or absent.
 */
export function readExifOrientation(jpegBuffer: ArrayBuffer): number {
  const seg = extractExifSegment(jpegBuffer);
  if (!seg || seg.byteLength < 18) return 1;
  const view = new DataView(seg.buffer, seg.byteOffset, seg.byteLength);
  const tiffStart = 10;
  const byteOrder = view.getUint16(tiffStart);
  if (byteOrder !== 0x4949 && byteOrder !== 0x4d4d) return 1;
  const le = byteOrder === 0x4949;
  if (view.getUint16(tiffStart + 2, le) !== 0x002a) return 1;
  const ifd0Offset = view.getUint32(tiffStart + 4, le);
  const ifd0Start = tiffStart + ifd0Offset;
  if (ifd0Offset < 8 || ifd0Start + 2 > seg.byteLength) return 1;
  const count = view.getUint16(ifd0Start, le);
  let cur = ifd0Start + 2;
  for (let i = 0; i < count; i++) {
    if (cur + 12 > seg.byteLength) break;
    if (view.getUint16(cur, le) === 0x0112) {
      return view.getUint16(cur + 8, le) || 1;
    }
    cur += 12;
  }
  return 1;
}

/**
 * Reads DPI metadata from JPEG (JFIF APP0) or PNG (pHYs) buffer. Returns null if unspecified.
 */
export function readImageDpi(buffer: ArrayBuffer): number | null {
  const view = new DataView(buffer);
  if (view.byteLength >= 18 && view.getUint16(0) === 0xffd8 && view.getUint16(2) === 0xffe0) {
    if (
      view.getUint8(6) === 0x4a &&
      view.getUint8(7) === 0x46 &&
      view.getUint8(8) === 0x49 &&
      view.getUint8(9) === 0x46 &&
      view.getUint8(10) === 0x00
    ) {
      const units = view.getUint8(13);
      const xDensity = view.getUint16(14, false);
      if (units === 1 && xDensity > 0) return xDensity;
      if (units === 2 && xDensity > 0) return Math.round(xDensity * 2.54);
    }
  }
  const bytes = new Uint8Array(buffer);
  if (bytes.length >= 29 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    let offset = 8;
    while (offset + 8 <= bytes.length) {
      const len = view.getUint32(offset);
      const type = String.fromCharCode(
        bytes[offset + 4] ?? 0,
        bytes[offset + 5] ?? 0,
        bytes[offset + 6] ?? 0,
        bytes[offset + 7] ?? 0
      );
      if (type === 'pHYs' && len === 9 && offset + 17 <= bytes.length) {
        const ppmX = view.getUint32(offset + 8);
        const unit = bytes[offset + 16];
        if (unit === 1 && ppmX > 0) return Math.round(ppmX * 0.0254);
        break;
      }
      if (type === 'IDAT' || type === 'IEND' || offset + 12 + len > bytes.length) break;
      offset += 12 + len;
    }
  }
  return null;
}
