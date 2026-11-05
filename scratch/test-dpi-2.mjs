// Correct length for APP1:
// FF E1 (marker: 2 bytes)
// 00 06 (length: 2 bytes + 4 bytes 'Exif' = 6 bytes)
// 45 78 69 66 ('Exif': 4 bytes)
const dummyJpegWithExif = new Uint8Array([
  0xff, 0xd8,
  0xff, 0xe1, 0x00, 0x06, 0x45, 0x78, 0x69, 0x66,
  0xff, 0xda, 0x00, 0x02,
  0xff, 0xd9
]);

import { stripExifFromJpeg, setJpegDpi } from './test-dpi.mjs';

const stripped = stripExifFromJpeg(dummyJpegWithExif.buffer);
console.log('Stripped JPEG size:', stripped.size, 'vs original', dummyJpegWithExif.length);
// Original = 14 bytes (2 SOI + 6 APP1 + 4 SOS + 2 EOI)
// Stripped should be = 8 bytes (2 SOI + 4 SOS + 2 EOI)
