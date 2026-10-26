/**
 * Client-side ZIP archive creator using fflate.
 *
 * Bundles multiple converted Blobs into a single .zip download in the browser.
 * Uses level 0 (store) which is ultra-fast and avoids double-compressing
 * images that are already compressed.
 */

import { zipSync } from 'fflate';

export interface ZipFileInput {
  name: string;
  blob: Blob;
}

export async function createZipArchive(files: ZipFileInput[]): Promise<Blob> {
  const zipData: Record<string, Uint8Array> = {};
  const namesUsed = new Set<string>();

  for (const file of files) {
    let filename = file.name;

    // Avoid duplicate filenames in the zip archive
    if (namesUsed.has(filename)) {
      const extIndex = filename.lastIndexOf('.');
      const base = extIndex > -1 ? filename.slice(0, extIndex) : filename;
      const ext = extIndex > -1 ? filename.slice(extIndex) : '';
      let counter = 1;
      while (namesUsed.has(`${base}_${counter}${ext}`)) {
        counter++;
      }
      filename = `${base}_${counter}${ext}`;
    }
    namesUsed.add(filename);

    const buffer = await file.blob.arrayBuffer();
    zipData[filename] = new Uint8Array(buffer);
  }

  // Level 0 (store mode) is instantaneous and optimal for media files
  const zipped = zipSync(zipData, { level: 0 });
  return new Blob([zipped], { type: 'application/zip' });
}
