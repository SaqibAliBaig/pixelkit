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
  MergePdfRequest,
  WorkerMessage,
} from './types';
import { mimeToOutputFormat, buildFilename, mimeForExtension } from '../engines';
import { detectMimeFromMagicBytes } from '../utils/mime';
import { compressToTarget, compressWithDownscale } from './compression';
import {
  extractExifSegment,
  insertExifIntoJpeg,
  padJpegToTargetBytes,
  padPngToTargetBytes,
  padWebpToTargetBytes,
  readExifOrientation,
  setJpegDpi,
  setPngDpi,
  stripExifFromJpeg,
  stripMetadataFromPng,
} from './exif';
import { applyAdjustments } from './adjustments';
import { jpegToPdf, mergeImagesToPdf, pdfOverheadBytes } from './pdf';

const ctx = self as unknown as DedicatedWorkerGlobalScope;

ctx.addEventListener('message', async (event: MessageEvent<ConvertRequest | MergePdfRequest>) => {
  const req = event.data;
  if ('type' in req && req.type === 'merge-pdf') {
    try {
      const pages = req.pages.map((p) => ({
        jpegBlob: p.blob,
        widthPx: p.width,
        heightPx: p.height,
      }));
      const blob = await mergeImagesToPdf(pages, req.title || 'PixelKit Merged Document');
      const filename = `PixelKit-merged-${Date.now()}.pdf`;
      const originalSize = req.pages.reduce((acc, p) => acc + p.blob.size, 0);
      const msg: ConvertSuccess = {
        type: 'result',
        id: req.id,
        blob,
        filename,
        originalSize,
        resultSize: blob.size,
      };
      ctx.postMessage(msg);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      ctx.postMessage({ type: 'error', id: req.id, message });
    }
    return;
  }
  const convertReq = req as ConvertRequest;
  try {
    const result = await handleConvert(convertReq);
    const filename =
      convertReq.pdfPageNumber && convertReq.pdfTotalPages && convertReq.pdfTotalPages > 1 && !convertReq.file.name.includes(`_page_${convertReq.pdfPageNumber}`) && !convertReq.file.name.includes(`-page-${convertReq.pdfPageNumber}`)
        ? buildFilename(convertReq.file.name.replace(/\.pdf$/i, `-page-${convertReq.pdfPageNumber}.pdf`), convertReq.to)
        : buildFilename(convertReq.file.name, convertReq.to);
    const msg: ConvertSuccess = {
      type: 'result',
      id: convertReq.id,
      blob: result.blob,
      filename,
      originalSize: convertReq.file.size,
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
    const msg: WorkerMessage = { type: 'error', id: (req as ConvertRequest).id, message };
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

  // 4. Calculate target bytes and minimum/padding target bytes based on targetOptions / targetKb
  let targetBytes: number | null = null;
  let minBytesRequired: number | null = null;
  let padTargetBytes: number | null = null;

  if (req.targetOptions?.mode === 'range') {
    const maxB = req.targetOptions.maxKb && req.targetOptions.maxKb > 0 ? Math.round(req.targetOptions.maxKb * 1024) : null;
    const minB = req.targetOptions.minKb && req.targetOptions.minKb > 0 ? Math.round(req.targetOptions.minKb * 1024) : 0;
    if (maxB) {
      targetBytes = Math.round(minB + (maxB - minB) * 0.85);
    }
    if (minB > 0) {
      minBytesRequired = minB;
      padTargetBytes = maxB && maxB > minB ? Math.min(maxB - 64, minB + 256) : minB + 256;
    }
  } else if (req.targetKb && req.targetKb > 0) {
    targetBytes = Math.round(req.targetKb * 1024);
    if (req.targetOptions?.mode === 'exact') {
      minBytesRequired = targetBytes;
      padTargetBytes = targetBytes;
    }
  }

  const effectiveDpi =
    req.dpi && req.dpi > 0
      ? Math.round(req.dpi)
      : req.dimensions?.dpi && req.dimensions.dpi > 0
        ? Math.round(req.dimensions.dpi)
        : null;

  const hasCrop = !!req.customCropBox || (!!req.cropAspect && req.cropAspect !== 'original');
  const hasResize = !!(
    req.dimensions &&
    req.dimensions.mode !== 'original' &&
    (req.dimensions.scalePercent !== 100 || Boolean(req.dimensions.width || req.dimensions.height))
  );
  const hasTransform = (req.rotate ?? 0) !== 0 || !!req.flipH || !!req.flipV || !!req.grayscale;
  const hasQualityOverride = req.quality !== undefined && req.quality > 0 && req.quality < 1;

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
    // Lossless byte-level fast-paths for pure DPI header updates or pure EXIF removal (zero pixel re-encoding)
    const canLosslessBypass =
      !hasCrop && !hasResize && !hasTransform && !targetBytes && !minBytesRequired && !hasQualityOverride;

    if (
      canLosslessBypass &&
      effectiveFromMime === 'image/jpeg' &&
      outFormat === 'jpg' &&
      (effectiveDpi !== null || req.preserveMetadata === false)
    ) {
      const rawBuf = await req.file.arrayBuffer();
      const orient = readExifOrientation(rawBuf);
      if (req.preserveMetadata !== false) {
        blob = setJpegDpi(rawBuf, effectiveDpi!);
        return {
          blob,
          originalWidth,
          originalHeight,
          resultWidth: originalWidth,
          resultHeight: originalHeight,
          originalPreviewBlob,
        };
      } else if (orient === 1 || req.autoOrient === false) {
        blob = stripExifFromJpeg(rawBuf);
        if (effectiveDpi !== null) {
          blob = setJpegDpi(await blob.arrayBuffer(), effectiveDpi);
        }
        return {
          blob,
          originalWidth,
          originalHeight,
          resultWidth: originalWidth,
          resultHeight: originalHeight,
          originalPreviewBlob,
        };
      }
    }

    if (
      canLosslessBypass &&
      effectiveFromMime === 'image/png' &&
      outFormat === 'png' &&
      (effectiveDpi !== null || req.preserveMetadata === false)
    ) {
      const rawBuf = await req.file.arrayBuffer();
      blob = new Blob([rawBuf], { type: 'image/png' });
      if (req.preserveMetadata === false) {
        blob = stripMetadataFromPng(await blob.arrayBuffer());
      }
      if (effectiveDpi !== null) {
        blob = setPngDpi(await blob.arrayBuffer(), effectiveDpi);
      }
      return {
        blob,
        originalWidth,
        originalHeight,
        resultWidth: originalWidth,
        resultHeight: originalHeight,
        originalPreviewBlob,
      };
    }

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
        blob = await encodePdfOutput(
          workingBitmap,
          targetBytes,
          req.file.name,
          effectiveDpi,
          minBytesRequired ? padTargetBytes : null
        );
        break;
      case 'webp':
        blob = await encodeCanvasOutput(
          workingBitmap,
          'image/webp',
          targetBytes,
          true,
          false,
          req.quality,
          Boolean(minBytesRequired)
        );
        break;
      case 'avif':
        blob = await encodeCanvasOutput(
          workingBitmap,
          'image/avif',
          targetBytes,
          true,
          false,
          req.quality,
          Boolean(minBytesRequired)
        );
        break;
      case 'jpg':
      default:
        blob = await encodeCanvasOutput(
          workingBitmap,
          'image/jpeg',
          targetBytes,
          true,
          req.stripTransparency !== false,
          req.quality,
          Boolean(minBytesRequired)
        );
        break;
    }

    // 7. Inject preserved EXIF metadata into output JPEG (only when not cropped/resized/transformed)
    if (exifSegment && outFormat === 'jpg' && !hasCrop && !hasResize && !hasTransform) {
      try {
        const outBuf = await blob.arrayBuffer();
        blob = insertExifIntoJpeg(outBuf, exifSegment, req.autoOrient);
      } catch (err) {
        console.warn('[PixelKit] EXIF insertion skipped:', err);
      }
    }

    // 7b. Inject Print DPI metadata (JFIF APP0 & EXIF IFD0 for JPEG, pHYs chunk for PNG)
    if (effectiveDpi !== null) {
      try {
        if (outFormat === 'jpg') {
          blob = setJpegDpi(await blob.arrayBuffer(), effectiveDpi);
        } else if (outFormat === 'png') {
          blob = setPngDpi(await blob.arrayBuffer(), effectiveDpi);
        }
      } catch (err) {
        console.warn('[PixelKit] DPI header injection skipped:', err);
      }
    }

    // 8. Safely elevate file size when output is smaller than required exact or minimum target (Increase Image Size in KB)
    if (minBytesRequired && padTargetBytes && blob.size < minBytesRequired) {
      try {
        const outBuf = await blob.arrayBuffer();
        if (outFormat === 'jpg') {
          blob = padJpegToTargetBytes(outBuf, padTargetBytes);
        } else if (outFormat === 'png') {
          blob = padPngToTargetBytes(outBuf, padTargetBytes);
        } else if (outFormat === 'webp') {
          blob = padWebpToTargetBytes(outBuf, padTargetBytes);
        }
      } catch (err) {
        console.warn('[PixelKit] Size elevation padding skipped:', err);
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
  quality?: number,
  preferMaxFidelityWhenUnder = false
): Promise<Blob> {
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx2d = canvas.getContext('2d', {
    alpha: mime !== 'image/jpeg',
    willReadFrequently: false,
  });
  if (!ctx2d) throw new Error('2D context unavailable');

  // Strip transparency with clean white background for JPEG if enabled
  if (mime === 'image/jpeg' && stripTransparency) {
    ctx2d.fillStyle = '#FFFFFF';
    ctx2d.fillRect(0, 0, bitmap.width, bitmap.height);
  }

  ctx2d.drawImage(bitmap, 0, 0);

  if (preferMaxFidelityWhenUnder && targetBytes && targetBytes > 0) {
    const q100 = await canvas.convertToBlob({ type: mime, quality: 1.0 });
    if (q100.size <= targetBytes) {
      return q100;
    }
  }

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
  const ctx2d = canvas.getContext('2d', { willReadFrequently: false });
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
  originalName: string,
  dpi: number | null = null,
  padTargetBytes: number | null = null
): Promise<Blob> {
  const overhead = pdfOverheadBytes();
  const jpegTarget = targetBytes ? Math.max(1024, targetBytes - overhead) : null;

  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx2d = canvas.getContext('2d', { alpha: false, willReadFrequently: false });
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

  let jpegBlob = jpeg.blob;
  if (dpi && dpi > 0) {
    jpegBlob = setJpegDpi(await jpegBlob.arrayBuffer(), dpi);
  }

  let pdfBlob = await jpegToPdf({
    jpegBlob,
    widthPx: bitmap.width,
    heightPx: bitmap.height,
    title: originalName,
    dpi: dpi ?? undefined,
  });

  if (padTargetBytes && pdfBlob.size < padTargetBytes) {
    const actualOverhead = Math.max(256, pdfBlob.size - jpegBlob.size);
    const desiredJpegBytes = padTargetBytes - actualOverhead;
    if (desiredJpegBytes > jpegBlob.size + 4) {
      const paddedJpeg = padJpegToTargetBytes(await jpegBlob.arrayBuffer(), desiredJpegBytes);
      pdfBlob = await jpegToPdf({
        jpegBlob: paddedJpeg,
        widthPx: bitmap.width,
        heightPx: bitmap.height,
        title: originalName,
        dpi: dpi ?? undefined,
      });
    }
  }

  return pdfBlob;
}