/**
 * SVG to ImageBitmap decoder and encoder with configurable DPI / scale multipliers.
 * Normalizes SVG viewBox and dimensions to rasterize crisp vector output, and
 * creates scaled SVG vector containers for raster images.
 */

export async function svgToImageBitmap(
  blob: Blob,
  scale = 1.0
): Promise<ImageBitmap> {
  const text = await blob.text();
  let w = 800;
  let h = 800;

  // Extract dimensions from viewBox or width/height attributes (supports comma and space separators)
  const viewBoxMatch = text.match(/viewBox=["']\s*([0-9.-]+)[\s,]+([0-9.-]+)[\s,]+([0-9.-]+)[\s,]+([0-9.-]+)\s*["']/i);
  if (viewBoxMatch && viewBoxMatch[3] && viewBoxMatch[4]) {
    w = Math.max(10, Math.round(parseFloat(viewBoxMatch[3])));
    h = Math.max(10, Math.round(parseFloat(viewBoxMatch[4])));
  } else {
    const wMatch = text.match(/\bwidth=["']\s*([0-9.]+)(?:px)?["']/i);
    const hMatch = text.match(/\bheight=["']\s*([0-9.]+)(?:px)?["']/i);
    if (wMatch && wMatch[1]) {
      w = Math.max(10, Math.round(parseFloat(wMatch[1])));
    }
    if (hMatch && hMatch[1]) {
      h = Math.max(10, Math.round(parseFloat(hMatch[1])));
    }
  }

  const multiplier = Math.max(0.25, Math.min(8.0, Number(scale) || 1.0));
  const targetW = Math.round(w * multiplier);
  const targetH = Math.round(h * multiplier);

  let normalized = text;
  // If no viewBox exists, add one based on original dimensions so scaling works properly
  if (!viewBoxMatch) {
    normalized = normalized.replace(/<svg\b/i, `<svg viewBox="0 0 ${w} ${h}" `);
  }

  // Update or inject width & height attributes with the scaled pixel size
  if (/<svg[^>]*\b(width)=/i.test(normalized)) {
    normalized = normalized.replace(/\bwidth=["'][^"']*["']/i, `width="${targetW}"`);
  } else {
    normalized = normalized.replace(/<svg\b/i, `<svg width="${targetW}" `);
  }

  if (/<svg[^>]*\b(height)=/i.test(normalized)) {
    normalized = normalized.replace(/\bheight=["'][^"']*["']/i, `height="${targetH}"`);
  } else {
    normalized = normalized.replace(/<svg\b/i, `<svg height="${targetH}" `);
  }

  const fixedBlob = new Blob([normalized], { type: 'image/svg+xml' });
  try {
    return await createImageBitmap(fixedBlob, { resizeWidth: targetW, resizeHeight: targetH });
  } catch {
    return await createImageBitmap(fixedBlob);
  }
}

export interface EncodeSvgResult {
  blob: Blob;
  width: number;
  height: number;
  svgText: string;
}

/**
 * SVG encoder for raster-to-SVG vector conversion.
 * Wraps pixel data into a scalable XML SVG document with configurable DPI / scale multipliers (1x, 2x, 3x, 4x).
 */
export async function encodeSvg(
  bitmap: ImageBitmap,
  scaleMultiplier: number = 1.0
): Promise<EncodeSvgResult> {
  const scale = Math.max(0.25, Math.min(8.0, Number(scaleMultiplier) || 1.0));

  // Cap max dimensions to 8192px to prevent canvas memory allocation issues on ultra-high scales
  const MAX_CANVAS_DIM = 8192;
  let targetW = Math.round(bitmap.width * scale);
  let targetH = Math.round(bitmap.height * scale);
  if (targetW > MAX_CANVAS_DIM || targetH > MAX_CANVAS_DIM) {
    const s = Math.min(MAX_CANVAS_DIM / targetW, MAX_CANVAS_DIM / targetH);
    targetW = Math.max(10, Math.round(targetW * s));
    targetH = Math.max(10, Math.round(targetH * s));
  }

  const canvas = new OffscreenCanvas(targetW, targetH);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D context unavailable');

  // High quality interpolation for scaled vectors
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, targetW, targetH);

  const pngBlob = await canvas.convertToBlob({ type: 'image/png' });
  const { blobToDataUrl } = await import('./pdf');
  const dataUrl = await blobToDataUrl(pngBlob);
  const svgText = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
     width="${targetW}" height="${targetH}" viewBox="0 0 ${targetW} ${targetH}">
  <image width="${targetW}" height="${targetH}" xlink:href="${dataUrl}" href="${dataUrl}"/>
</svg>`;

  const blob = new Blob([svgText], { type: 'image/svg+xml' });
  return { blob, width: targetW, height: targetH, svgText };
}
