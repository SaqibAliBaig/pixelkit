import UTIF from 'utif';

/**
 * Decode a TIFF file into an ImageData object using UTIF.js.
 */
export async function tiffToImageData(blob: Blob): Promise<ImageData> {
  const buffer = await blob.arrayBuffer();
  const ifds = UTIF.decode(buffer);
  if (!ifds || !ifds.length) {
    throw new Error('Failed to decode TIFF: no image directories found');
  }
  const firstPage = ifds[0]!;
  UTIF.decodeImage(buffer, firstPage);
  const rgba = UTIF.toRGBA8(firstPage);
  return new ImageData(new Uint8ClampedArray(rgba), firstPage.width, firstPage.height);
}
