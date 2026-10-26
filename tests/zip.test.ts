import { describe, it, expect } from 'vitest';
import { createZipArchive } from '../src/lib/utils/zip';
import { unzipSync } from 'fflate';

describe('ZIP utility', () => {
  it('bundles multiple files into a valid ZIP archive', async () => {
    const file1 = {
      name: 'photo1.jpg',
      blob: new Blob(['hello world from photo 1'], { type: 'image/jpeg' }),
    };
    const file2 = {
      name: 'photo2.png',
      blob: new Blob(['hello world from photo 2'], { type: 'image/png' }),
    };

    const zipBlob = await createZipArchive([file1, file2]);
    expect(zipBlob).toBeInstanceOf(Blob);
    expect(zipBlob.type).toBe('application/zip');
    expect(zipBlob.size).toBeGreaterThan(0);

    // Verify unzipping restores the exact content
    const zipArrayBuffer = await zipBlob.arrayBuffer();
    const unzipped = unzipSync(new Uint8Array(zipArrayBuffer));

    expect(unzipped['photo1.jpg']).toBeDefined();
    expect(unzipped['photo2.png']).toBeDefined();

    const text1 = new TextDecoder().decode(unzipped['photo1.jpg']);
    const text2 = new TextDecoder().decode(unzipped['photo2.png']);
    expect(text1).toBe('hello world from photo 1');
    expect(text2).toBe('hello world from photo 2');
  });

  it('deduplicates identical filenames in zip archive', async () => {
    const file1 = {
      name: 'photo.jpg',
      blob: new Blob(['first'], { type: 'image/jpeg' }),
    };
    const file2 = {
      name: 'photo.jpg',
      blob: new Blob(['second'], { type: 'image/jpeg' }),
    };

    const zipBlob = await createZipArchive([file1, file2]);
    const zipArrayBuffer = await zipBlob.arrayBuffer();
    const unzipped = unzipSync(new Uint8Array(zipArrayBuffer));

    expect(unzipped['photo.jpg']).toBeDefined();
    expect(unzipped['photo_1.jpg']).toBeDefined();
  });
});
