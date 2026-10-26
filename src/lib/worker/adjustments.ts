/**
 * Image editing and adjustment utilities for Web Workers.
 *
 * Implements:
 *   - Aspect ratio crop presets (1:1, 3.5:4.5 passport, 4:3, 16:9, etc.)
 *   - Resize controls (scale percentage, custom width/height with aspect ratio lock)
 *   - Quick rotation (90°, 180°, 270°) and flip (horizontal/vertical)
 *   - Grayscale / Black & White filter
 */

import type { CropAnchor, CropAspectPreset, CustomCropBox, DimensionOptions } from './types';

export interface AdjustmentOptions {
  cropAspect?: CropAspectPreset;
  cropAnchor?: CropAnchor;
  customCropBox?: CustomCropBox;
  dimensions?: DimensionOptions;
  rotate?: number; // 0, 90, 180, 270
  flipH?: boolean;
  flipV?: boolean;
  grayscale?: boolean;
}

export const ASPECT_RATIOS: Record<string, number> = {
  '1:1': 1.0,
  '3.5:4.5': 3.5 / 4.5, // ~0.7778 (Passport photo ratio)
  '4:3': 4 / 3,
  '16:9': 16 / 9,
  '9:16': 9 / 16,
  '3:2': 3 / 2,
};

/**
 * Applies all geometric and color adjustments to an ImageBitmap.
 * Returns a new adjusted ImageBitmap.
 */
export async function applyAdjustments(
  source: ImageBitmap,
  opts: AdjustmentOptions
): Promise<ImageBitmap> {
  let current: ImageBitmap = source;

  // 1. Custom Box Crop or Aspect Ratio Crop
  if (opts.customCropBox) {
    current = await applyCustomCrop(current, opts.customCropBox);
  } else if (opts.cropAspect && opts.cropAspect !== 'original') {
    current = await applyCrop(current, opts.cropAspect, opts.cropAnchor ?? 'center');
  }

  // 2. Dimensions & Scaling
  if (opts.dimensions && opts.dimensions.mode !== 'original') {
    current = await applyDimensions(current, opts.dimensions);
  }

  // 3. Rotation, Flip & Grayscale
  const rotate = opts.rotate ? ((opts.rotate % 360) + 360) % 360 : 0;
  const flipH = !!opts.flipH;
  const flipV = !!opts.flipV;
  const grayscale = !!opts.grayscale;

  if (rotate !== 0 || flipH || flipV || grayscale) {
    current = await applyTransformAndFilter(current, {
      rotate,
      flipH,
      flipV,
      grayscale,
    });
  }

  return current;
}

/**
 * Crops the image to match the target aspect ratio and focal anchor (top/face, center, bottom).
 */
async function applyCrop(
  bitmap: ImageBitmap,
  preset: CropAspectPreset,
  anchor: CropAnchor = 'center'
): Promise<ImageBitmap> {
  const targetRatio = ASPECT_RATIOS[preset];
  if (!targetRatio) return bitmap;

  const srcW = bitmap.width;
  const srcH = bitmap.height;
  const srcRatio = srcW / srcH;

  let cropW = srcW;
  let cropH = srcH;
  let cropX = 0;
  let cropY = 0;

  if (srcRatio > targetRatio) {
    // Source is wider than target: crop left & right
    cropW = Math.round(srcH * targetRatio);
    cropX = Math.round((srcW - cropW) / 2);
  } else {
    // Source is taller than target: crop top & bottom based on focal anchor
    cropH = Math.round(srcW / targetRatio);
    if (anchor === 'top') {
      cropY = 0; // Focus on top: head/face/document header preserved
    } else if (anchor === 'bottom') {
      cropY = Math.max(0, srcH - cropH); // Focus on bottom
    } else {
      cropY = Math.round((srcH - cropH) / 2); // Center
    }
  }

  const canvas = new OffscreenCanvas(cropW, cropH);
  const ctx = canvas.getContext('2d');
  if (!ctx) return bitmap;

  ctx.drawImage(bitmap, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
  return await createImageBitmap(canvas);
}

/**
 * Applies a custom normalized bounding box crop (x, y, width, height from 0 to 1).
 */
async function applyCustomCrop(
  bitmap: ImageBitmap,
  box: CustomCropBox
): Promise<ImageBitmap> {
  const srcW = bitmap.width;
  const srcH = bitmap.height;

  const cropX = Math.max(0, Math.min(srcW - 1, Math.round(box.x * srcW)));
  const cropY = Math.max(0, Math.min(srcH - 1, Math.round(box.y * srcH)));
  const cropW = Math.max(10, Math.min(srcW - cropX, Math.round(box.width * srcW)));
  const cropH = Math.max(10, Math.min(srcH - cropY, Math.round(box.height * srcH)));

  const canvas = new OffscreenCanvas(cropW, cropH);
  const ctx = canvas.getContext('2d');
  if (!ctx) return bitmap;

  ctx.drawImage(bitmap, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
  return await createImageBitmap(canvas);
}

/**
 * Resizes the image based on dimension options, percentage scale, or custom dimensions.
 * Supports:
 *   - fit modes: 'contain' (fit inside without crop), 'cover' (fill & center crop), 'fill' (exact stretch)
 *   - noUpscale: prevents accidental enlargement of small images into blurry pixels
 */
async function applyDimensions(
  bitmap: ImageBitmap,
  dims: DimensionOptions
): Promise<ImageBitmap> {
  const srcW = bitmap.width;
  const srcH = bitmap.height;
  let targetW = srcW;
  let targetH = srcH;
  const fit = dims.fit || (dims.lockAspectRatio !== false ? 'contain' : 'fill');
  const noUpscale = !!dims.noUpscale;

  // 1. Percentage scaling
  if (dims.scalePercent && dims.scalePercent > 0 && dims.scalePercent !== 100) {
    let scale = dims.scalePercent / 100;
    if (noUpscale && scale > 1.0) scale = 1.0;
    targetW = Math.max(10, Math.round(srcW * scale));
    targetH = Math.max(10, Math.round(srcH * scale));
    if (noUpscale && (targetW > srcW || targetH > srcH)) {
      targetW = srcW;
      targetH = srcH;
    }
  } else if (dims.mode === 'passport') {
    targetW = 413;
    targetH = 531;
  } else if (dims.mode === 'square') {
    targetW = 600;
    targetH = 600;
  } else if (dims.mode === 'custom') {
    const reqW = dims.width;
    const reqH = dims.height;

    if (reqW && reqH) {
      if (fit === 'cover') {
        // Fill & crop: canvas is exact reqW x reqH, image scaled to cover
        let scale = Math.max(reqW / srcW, reqH / srcH);
        if (noUpscale && scale > 1.0) scale = 1.0;
        const scaledW = Math.round(srcW * scale);
        const scaledH = Math.round(srcH * scale);
        const outW = noUpscale ? Math.min(reqW, scaledW) : reqW;
        const outH = noUpscale ? Math.min(reqH, scaledH) : reqH;
        const offsetX = Math.round((outW - scaledW) / 2);
        const offsetY = Math.round((outH - scaledH) / 2);

        const canvas = new OffscreenCanvas(outW, outH);
        const ctx = canvas.getContext('2d');
        if (!ctx) return bitmap;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(bitmap, offsetX, offsetY, scaledW, scaledH);
        return await createImageBitmap(canvas);
      } else if (fit === 'fill') {
        // Exact stretch without ratio constraint
        targetW = noUpscale ? Math.min(srcW, Math.round(reqW)) : Math.round(reqW);
        targetH = noUpscale ? Math.min(srcH, Math.round(reqH)) : Math.round(reqH);
      } else {
        // 'contain': fit inside reqW x reqH bounding box proportionally
        let scale = Math.min(reqW / srcW, reqH / srcH);
        if (noUpscale && scale > 1.0) scale = 1.0;
        const scaledW = Math.max(10, Math.round(srcW * scale));
        const scaledH = Math.max(10, Math.round(srcH * scale));

        const canvas = new OffscreenCanvas(scaledW, scaledH);
        const ctx = canvas.getContext('2d');
        if (!ctx) return bitmap;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(bitmap, 0, 0, scaledW, scaledH);
        return await createImageBitmap(canvas);
      }
    } else if (reqW) {
      let scale = reqW / srcW;
      if (noUpscale && scale > 1.0) scale = 1.0;
      targetW = Math.max(10, Math.round(srcW * scale));
      targetH = Math.max(10, Math.round(srcH * scale));
    } else if (reqH) {
      let scale = reqH / srcH;
      if (noUpscale && scale > 1.0) scale = 1.0;
      targetW = Math.max(10, Math.round(srcW * scale));
      targetH = Math.max(10, Math.round(srcH * scale));
    }
  } else {
    return bitmap;
  }

  const canvas = new OffscreenCanvas(targetW, targetH);
  const ctx = canvas.getContext('2d');
  if (!ctx) return bitmap;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  ctx.drawImage(bitmap, 0, 0, targetW, targetH);
  return await createImageBitmap(canvas);
}

/**
 * Handles rotation (90°, 180°, 270°), horizontal/vertical flipping, and grayscale filter.
 */
async function applyTransformAndFilter(
  bitmap: ImageBitmap,
  opts: { rotate: number; flipH: boolean; flipV: boolean; grayscale: boolean }
): Promise<ImageBitmap> {
  const { rotate, flipH, flipV, grayscale } = opts;
  const isSwap = rotate === 90 || rotate === 270;
  const outW = isSwap ? bitmap.height : bitmap.width;
  const outH = isSwap ? bitmap.width : bitmap.height;

  const canvas = new OffscreenCanvas(outW, outH);
  const ctx = canvas.getContext('2d');
  if (!ctx) return bitmap;

  // Handle transformation matrix
  ctx.save();
  ctx.translate(outW / 2, outH / 2);

  if (rotate !== 0) {
    ctx.rotate((rotate * Math.PI) / 180);
  }

  const sx = flipH ? -1 : 1;
  const sy = flipV ? -1 : 1;
  if (flipH || flipV) {
    ctx.scale(sx, sy);
  }

  ctx.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2);
  ctx.restore();

  // Apply Grayscale / Black & White
  if (grayscale) {
    applyGrayscale(ctx, outW, outH);
  }

  return await createImageBitmap(canvas);
}

/**
 * Converts canvas pixels to high-contrast monochrome/grayscale.
 */
function applyGrayscale(ctx: OffscreenCanvasRenderingContext2D, width: number, height: number): void {
  try {
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      // ITU-R BT.601 luma formula
      const gray = Math.round(0.299 * data[i]! + 0.587 * data[i + 1]! + 0.114 * data[i + 2]!);
      data[i] = gray;
      data[i + 1] = gray;
      data[i + 2] = gray;
      // Alpha data[i + 3] is preserved
    }
    ctx.putImageData(imgData, 0, 0);
  } catch {
    // If getImageData fails, fallback
  }
}
