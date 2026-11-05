import fs from 'fs';

let testContent = fs.readFileSync('tests/exif.test.ts', 'utf8');

const additionalTests = `
  it('sets JPEG DPI to 300 via JFIF marker', async () => {
    const { setJpegDpi } = await import('../src/lib/worker/exif');
    const dummyJpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xda, 0x00, 0x02, 0xff, 0xd9]);
    const blob = setJpegDpi(dummyJpeg.buffer, 300);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBe(dummyJpeg.length + 18);
  });

  it('strips EXIF segments from JPEG buffers', async () => {
    const { stripExifFromJpeg } = await import('../src/lib/worker/exif');
    const dummyJpegWithExif = new Uint8Array([
      0xff, 0xd8,
      0xff, 0xe1, 0x00, 0x06, 0x45, 0x78, 0x69, 0x66,
      0xff, 0xda, 0x00, 0x02,
      0xff, 0xd9
    ]);
    const stripped = stripExifFromJpeg(dummyJpegWithExif.buffer);
    expect(stripped.size).toBe(8); // SOI + SOS + EOI
  });
`;

testContent = testContent.replace(/\}\);\s*$/, additionalTests + '});\n');
fs.writeFileSync('tests/exif.test.ts', testContent, 'utf8');
console.log('Appended tests to tests/exif.test.ts');

