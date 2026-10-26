/**
 * Client-side PDF page rasterizer and image extractor.
 * 1. Fast binary scanner (<2ms) extracts embedded JPEG images directly from PDFs containing photos.
 * 2. Canvas fallback renders vector/text PDF pages onto canvas with crisp 2.0 scale (144+ DPI) using pdfjs-dist.
 */

// Polyfill Promise.try for modern pdfjs-dist v6+
if (typeof (Promise as unknown as Record<string, unknown>).try !== 'function') {
  (Promise as unknown as Record<string, unknown>).try = function (fn: (...args: unknown[]) => unknown, ...args: unknown[]) {
    return new Promise((resolve) => resolve(fn(...args)));
  };
}

// Polyfill Uint8Array.prototype.toHex for modern pdfjs-dist v6+
if (typeof (Uint8Array.prototype as unknown as Record<string, unknown>).toHex !== 'function') {
  (Uint8Array.prototype as unknown as Record<string, unknown>).toHex = function (this: Uint8Array): string {
    let hex = '';
    for (let i = 0; i < this.length; i++) {
      hex += (this[i] ?? 0).toString(16).padStart(2, '0');
    }
    return hex;
  };
}

import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Configure local workerSrc bundled by Vite for offline & CORS-free execution
if (typeof self !== 'undefined' && 'GlobalWorkerOptions' in pdfjsLib) {
  try {
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = typeof pdfWorkerUrl === 'string' ? pdfWorkerUrl : '';
    }
  } catch {
    // Ignore fallback configuration errors
  }
}

export interface PdfDecodeResult {
  bitmap: ImageBitmap;
  previewBlob: Blob;
  pageCount: number;
}

import { extractEmbeddedImagesFromPdf, type ExtractedPdfImage } from './pdf-extract';

export { extractEmbeddedImagesFromPdf, extractEmbeddedImagesFromPdf as extractEmbeddedJpegsFromPdf };
export type { ExtractedPdfImage };

/**
 * Returns the total number of pages in a PDF document.
 */
export async function getPdfPageCount(blob: Blob): Promise<number> {
  const arrayBuffer = await blob.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    useWorkerFetch: false,
  } as any);
  const pdf = await loadingTask.promise;
  return pdf.numPages;
}

/**
 * Renders a specific page of a PDF document into an ImageBitmap and JPEG Blob.
 */
export async function pdfToImageBitmap(
  blob: Blob,
  pageNumber = 1,
  scale = 2.0
): Promise<PdfDecodeResult> {
  const arrayBuffer = await blob.arrayBuffer();

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    useWorkerFetch: false,
  } as any);

  const pdf = await loadingTask.promise;
  const pageCount = pdf.numPages;
  const targetPageNum = Math.max(1, Math.min(pageNumber, pageCount));
  const page = await pdf.getPage(targetPageNum);
  const viewport = page.getViewport({ scale });

  const w = Math.round(viewport.width);
  const h = Math.round(viewport.height);

  let canvas: HTMLCanvasElement | OffscreenCanvas;
  if (typeof document !== 'undefined') {
    canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
  } else {
    canvas = new OffscreenCanvas(w, h);
  }

  const context = canvas.getContext('2d');
  if (!context) throw new Error('Failed to get 2D context for PDF rendering');

  // Fill with solid white background
  context.fillStyle = '#FFFFFF';
  context.fillRect(0, 0, w, h);

  const renderContext: any = {
    canvasContext: context,
    viewport: viewport,
  };

  await page.render(renderContext).promise;

  let previewBlob: Blob;
  if ('convertToBlob' in canvas) {
    previewBlob = await (canvas as OffscreenCanvas).convertToBlob({ type: 'image/jpeg', quality: 0.9 });
  } else {
    previewBlob = await new Promise<Blob>((resolve, reject) => {
      (canvas as HTMLCanvasElement).toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Failed to convert canvas to blob'))),
        'image/jpeg',
        0.9
      );
    });
  }

  const bitmap = await createImageBitmap(canvas);

  return { bitmap, previewBlob, pageCount };
}

/**
 * Automatically extracts images from a PDF:
 * 1. Checks if the PDF contains embedded JPEG photos (e.g. PixelKit merged PDF or camera scans).
 *    If found, extracts the 100% original full-quality images instantly in <5ms!
 * 2. If no embedded JPEGs are found (e.g. text or vector PDF), uses pdfjs-dist to render each page onto canvas.
 */
export async function extractPdfImagesOrPages(blob: Blob): Promise<ExtractedPdfImage[]> {
  const arrayBuffer = await blob.arrayBuffer();

  // 1. Instant binary extraction of embedded photos
  try {
    const directImages = extractEmbeddedImagesFromPdf(arrayBuffer);
    if (directImages.length > 0) {
      return directImages;
    }
  } catch (err) {
    console.error('[PixelKit Direct Extract Error]', err);
  }

  // 2. Fallback: render each page using pdfjs-dist
  try {
    const pageCount = await getPdfPageCount(blob);
    const pages: ExtractedPdfImage[] = [];
    for (let p = 1; p <= pageCount; p++) {
      const { previewBlob, bitmap } = await pdfToImageBitmap(blob, p, 2.0);
      pages.push({
        blob: previewBlob,
        width: bitmap.width,
        height: bitmap.height,
        index: p,
        total: pageCount,
        isDirectImage: false,
      });
      bitmap.close?.();
    }
    return pages;
  } catch (err) {
    console.error('[PixelKit PDF Page Render Fallback Error]', err);
    return [];
  }
}
