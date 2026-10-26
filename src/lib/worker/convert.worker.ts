/// <reference lib="webworker" />
/**
 * convert.worker.ts — main Web Worker entry.
 *
 * Protocol:
 *   Receives ConvertRequest via postMessage.
 *   Responds with { type: 'result' | 'error' | 'progress' }.
 *
 * Supports 10 formats (HEIC, WEBP, PNG, JPG, AVIF, SVG, BMP, TIFF, GIF, PDF),
 * exact-KB binary search, dimension presets (Passport, Square, Custom),
 * and transparent-to-white background stripping for JPEG.
 */

import type {
  ConvertRequest,
  ConvertSuccess,
  WorkerMessage,
} from './types';
import { mimeToOutputFormat, buildFilename, mimeForExtension } from '../engines';
import { detectMimeFromMagicBytes } from '../utils/mime';
import { compressToTarget, compressWithDownscale } from './compression';
import { extractExifSegment, insertExifIntoJpeg } from './exif';
import { applyAdjustments } from './adjustments';

const ctx = self as unknown as DedicatedWorkerGlobalScope;

ctx.addEventListener('message', async (event: MessageEvent<ConvertRequest>) => {
  const req = event.data;
  try {
    const result = await handleConvert(req);
    const filename =
      req.pdfPageNumber && req.pdfTotalPages && req.pdfTotalPages > 1 && !req.file.name.includes(`_page_${req.pdfPageNumber}`) && !req.file.name.includes(`-page-${req.pdfPageNumber}`)
        ? buildFilename(req.file.name.replace(/\.pdf$/i, `-page-${req.pdfPageNumber}.pdf`), req.to)
        : buildFilename(req.file.name, req.to);
    const msg: ConvertSuccess = {
      type: 'result',
      id: req.id,
      blob: result.blob,
      filename,
      originalSize: req.file.size,
      resultSize: result.blob.size,
      originalWidth: result.originalWidth,
      originalHeight: result.originalHeight,
      resultWidth: result.resultWidth,
      resultHeight: result.resultHeight,
      originalPreviewBlob: result.originalPreviewBlob,
    };
    ctx.postMessage(msg);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const msg: WorkerMessage = { type: 'error', id: req.id, message };
    ctx.postMessage(msg);
  }
});

interface ConvertInternalResult {
  blob: Blob;
  originalWidth: number;
  originalHeight: number;
  resultWidth: number;
  resultHeight: number;
  originalPreviewBlob?: Blob;
}

async function handleConvert(req: ConvertRequest): Promise<ConvertInternalResult> {
  // 1. Detect actual MIME type from magic bytes or extension fallback (universal input support)
  const head = await req.file.slice(0, 64).arrayBuffer();
  const detected = detectMimeFromMagicBytes(new Uint8Array(head));
  const ext = req.file.name.split('.').pop() || '';
  const extMime = mimeForExtension(ext);
  const effectiveFromMime = detected || extMime || req.fromMime;

  // 2. Decode input → ImageBitmap
  let sourceBitmap: ImageBitmap;
  let originalPreviewBlob: Blob | undefined;
  try {
    const decoded = await decodeToBitmap(req.file, effectiveFromMime, req);
    sourceBitmap = decoded.bitmap;
    originalPreviewBlob = decoded.previewBlob;
  } catch (err) {
    const m = err instanceof Error ? err.message : String(err);
    throw new Error(`Could not decode input (${effectiveFromMime}): ${m}`);
  }

  const originalWidth = sourceBitmap.width;
  const originalHeight = sourceBitmap.height;

  // 3. Apply editing adjustments (crop presets, crop anchor, custom box, dimensions/scale, rotation, flip, grayscale)
  const workingBitmap = await applyAdjustments(sourceBitmap, {
    cropAspect: req.cropAspect,
    cropAnchor: req.cropAnchor,
    customCropBox: req.customCropBox,
    dimensions: req.dimensions,
    rotate: req.rotate,
    flipH: req.flipH,
    flipV: req.flipV,
    grayscale: req.grayscale,
  });

  let resultWidth = workingBitmap.width;
  let resultHeight = workingBitmap.height;

  // 4. Calculate target bytes based on targetOptions / targetKb
  let targetBytes: number | null = null;
  if (req.targetOptions?.mode === 'range' && req.targetOptions.maxKb) {
    const maxB = req.targetOptions.maxKb * 1024;
    const minB = (req.targetOptions.minKb ?? 0) * 1024;
    // Aim safely in the upper half of the range
    targetBytes = Math.round(minB + (maxB - minB) * 0.85);
  } else if (req.targetKb && req.targetKb > 0) {
    targetBytes = req.targetKb * 1024;
  }

  // 5. Extract EXIF if metadata preservation is enabled
  let exifSegment: Uint8Array | null = null;
  if (req.preserveMetadata !== false) {
    try {
      // EXIF APP1 is located in the first 128KB of the JPEG header
      const headBuf = await req.file.slice(0, 128 * 1024).arrayBuffer();
      exifSegment = extractExifSegment(headBuf);
    } catch {
      // Ignore EXIF read errors
    }
  }

  // 6. Dispatch to the correct encoder based on target format
  const outFormat = mimeToOutputFormat(req.toMime);
  let blob: Blob;

  try {
    switch (outFormat) {
      case 'png':
        blob = await encodePngOutput(workingBitmap, targetBytes);
        break;
      case 'svg': {
        const { encodeSvg } = await import('./svg');
        const svgRes = await encodeSvg(workingBitmap, req.svgScale);
        blob = svgRes.blob;
        resultWidth = svgRes.width;
        resultHeight = svgRes.height;
        break;
      }
      case 'pdf':
        blob = await encodePdfOutput(workingBitmap, targetBytes, req.file.name);
        break;
      case 'webp':
        blob = await encodeCanvasOutput(workingBitmap, 'image/webp', targetBytes, true, false, req.quality);
        break;
      case 'avif':
        blob = await encodeCanvasOutput(workingBitmap, 'image/avif', targetBytes, true, false, req.quality);
        break;
      case 'jpg':
      default:
        blob = await encodeCanvasOutput(
          workingBitmap,
          'image/jpeg',
          targetBytes,
          true,
          req.stripTransparency !== false,
          req.quality
        );
        break;
    }

    // 7. Inject preserved EXIF metadata into output JPEG (only when not cropped/resized/transformed to prevent stale geometry and thumbnail overriding)
    const hasCrop = !!req.customCropBox || (!!req.cropAspect && req.cropAspect !== 'original');
    const hasResize = !!(req.dimensions && req.dimensions.mode !== 'original' && req.dimensions.scalePercent !== 100);
    const hasTransform = (req.rotate ?? 0) !== 0 || !!req.flipH || !!req.flipV;
    if (exifSegment && outFormat === 'jpg' && !hasCrop && !hasResize && !hasTransform) {
      try {
        const outBuf = await blob.arrayBuffer();
        blob = insertExifIntoJpeg(outBuf, exifSegment, req.autoOrient);
      } catch (err) {
        console.warn('[PixelKit] EXIF insertion skipped:', err);
      }
    }
  } finally {
    sourceBitmap.close?.();
    if (workingBitmap !== sourceBitmap) {
      workingBitmap.close?.();
    }
  }

  return {
    blob,
    originalWidth,
    originalHeight,
    resultWidth,
    resultHeight,
    originalPreviewBlob,
  };
}

interface DecodedSource {
  bitmap: ImageBitmap;
  previewBlob?: Blob;
}

async function decodeToBitmap(file: File, mime: string, req?: ConvertRequest): Promise<DecodedSource> {
  // Apple HEIC / HEIF
  if (mime === 'image/heic' || mime === 'image/heif') {
    const { heicToJpeg } = await import('./heic');
    const jpeg = await heicToJpeg(file);
    const bitmap = await createImageBitmap(jpeg);
    return { bitmap, previewBlob: jpeg };
  }

  // TIFF / TIF
  if (mime === 'image/tiff') {
    const { tiffToImageData } = await import('./tiff');
    const imageData = await tiffToImageData(file);
    const bitmap = await createImageBitmap(imageData);
    return { bitmap };
  }

  // PDF page decoding via pdfjs-dist fallback
  if (mime === 'application/pdf') {
    try {
      const { pdfToImageBitmap } = await import('./pdf-decode');
      const pageNum = req?.pdfPageNumber || 1;
      const { bitmap, previewBlob } = await pdfToImageBitmap(file, pageNum);
      return { bitmap, previewBlob };
    } catch (pdfErr) {
      throw new Error(`PDF decoding in Web Worker failed (${pdfErr instanceof Error ? pdfErr.message : String(pdfErr)}). Pre-rendered page image should be provided by main thread.`);
    }
  }

  // SVG with configurable DPI / scale multipliers
  if (mime === 'image/svg+xml') {
    const { svgToImageBitmap } = await import('./svg');
    const scale = req?.svgScale ?? 2.0;
    const bitmap = await svgToImageBitmap(file, scale);
    return { bitmap, previewBlob: file };
  }

  // Standard path: JPEG, PNG, WEBP, GIF, BMP, AVIF
  const imageOrientation = req?.autoOrient !== false ? 'from-image' : 'none';
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation });
    return { bitmap, previewBlob: file };
  } catch {
    const bitmap = await createImageBitmap(file);
    return { bitmap, previewBlob: file };
  }
}



/**
 * Canvas encoder for JPG, WEBP, and AVIF.
 * Solid white background is always drawn before drawing pixels for JPG to strip transparency cleanly.
 */
async function encodeCanvasOutput(
  bitmap: ImageBitmap,
  mime: string,
  targetBytes: number | null,
  allowDownscale: boolean,
  stripTransparency = true,
  quality?: number
): Promise<Blob> {
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx2d = canvas.getContext('2d');
  if (!ctx2d) throw new Error('2D context unavailable');

  // Strip transparency with clean white background for JPEG if enabled
  if (mime === 'image/jpeg' && stripTransparency) {
    ctx2d.fillStyle = '#FFFFFF';
    ctx2d.fillRect(0, 0, bitmap.width, bitmap.height);
  }

  ctx2d.drawImage(bitmap, 0, 0);

  const initialQuality =
    quality !== undefined && quality > 0
      ? Math.min(0.98, Math.max(0.05, quality))
      : undefined;

  const result = await compressToTarget(canvas, {
    targetBytes,
    mime,
    initialQuality,
  });
  if (result.hitTarget || !allowDownscale || !targetBytes) return result.blob;

  // Try downscaling as a fallback to hit tight targets
  const fallback = await compressWithDownscale(bitmap, {
    targetBytes,
    mime,
  });
  return fallback.blob;
}

async function encodePngOutput(
  bitmap: ImageBitmap,
  targetBytes: number | null
): Promise<Blob> {
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx2d = canvas.getContext('2d');
  if (!ctx2d) throw new Error('2D context unavailable');
  ctx2d.drawImage(bitmap, 0, 0);

  // If no target KB compression is requested (e.g. "Best quality (no limit)"),
  // use the native OffscreenCanvas PNG encoder: instantaneous, zero dependencies, lossless!
  if (!targetBytes || targetBytes <= 0) {
    return await canvas.convertToBlob({ type: 'image/png' });
  }

  // If specific KB target is requested, attempt UPNG quantization with fallback
  try {
    const imageData = ctx2d.getImageData(0, 0, bitmap.width, bitmap.height);
    const { encodePng } = await import('./upng');
    return await encodePng(imageData, { targetBytes });
  } catch (err) {
    console.warn('[PixelKit] UPNG compression error, falling back to standard PNG:', err);
    return await canvas.convertToBlob({ type: 'image/png' });
  }
}

async function encodePdfOutput(
  bitmap: ImageBitmap,
  targetBytes: number | null,
  originalName: string
): Promise<Blob> {
  const { jpegToPdf, pdfOverheadBytes } = await import('./pdf');
  const overhead = pdfOverheadBytes();
  const jpegTarget = targetBytes ? Math.max(1024, targetBytes - overhead) : null;

  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx2d = canvas.getContext('2d');
  if (!ctx2d) throw new Error('2D context unavailable');

  // Fill with solid white background for clean PDF page rendering
  ctx2d.fillStyle = '#FFFFFF';
  ctx2d.fillRect(0, 0, bitmap.width, bitmap.height);
  ctx2d.drawImage(bitmap, 0, 0);

  const jpeg = await compressToTarget(canvas, {
    targetBytes: jpegTarget,
    mime: 'image/jpeg',
    initialQuality: 0.9,
  });

  return await jpegToPdf({
    jpegBlob: jpeg.blob,
    widthPx: bitmap.width,
    heightPx: bitmap.height,
    title: originalName,
  });
}