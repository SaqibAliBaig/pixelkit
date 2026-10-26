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
