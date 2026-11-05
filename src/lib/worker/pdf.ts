/**
 * Wrap JPEG images into single or multi-page PDFs using jsPDF.
 *
 * Strategy:
 *   1. Images are compressed or scaled to JPEG.
 *   2. Layout is computed according to orientation (auto/portrait/landscape),
 *      page size (A4/Letter/Fit to image), and margins (none/small/big).
 *   3. jsPDF embeds the images into compliant PDF documents client-side.
 */

import { jsPDF } from 'jspdf';
import type { PdfOrientation, PdfPageSize, PdfMargin, PdfOptionsConfig } from './types';

export interface PdfOptions {
  jpegBlob: Blob;
  widthPx: number;
  heightPx: number;
  title?: string;
  dpi?: number;
  orientation?: PdfOrientation;
  pageSize?: PdfPageSize;
  margin?: PdfMargin;
}

export interface PdfPageLayout {
  pageW: number;
  pageH: number;
  drawX: number;
  drawY: number;
  drawW: number;
  drawH: number;
  orientation: 'portrait' | 'landscape';
}

const OVERHEAD_BYTES = 3 * 1024; // conservative PDF wrapper overhead

/**
 * Computes exact page geometry, image coordinates and scaling for PDF export.
 */
export function computePdfPageLayout(
  widthPx: number,
  heightPx: number,
  options?: {
    orientation?: PdfOrientation;
    pageSize?: PdfPageSize;
    margin?: PdfMargin;
    dpi?: number;
  }
): PdfPageLayout {
  const orientationSetting = options?.orientation ?? 'auto';
  const pageSizeSetting = options?.pageSize ?? 'a4';
  const marginSetting = options?.margin ?? 'none';
  const dpi = options?.dpi;

  // Margin in points (72 pt / inch)
  // small = 5mm (~14.17 pt), big = 12mm (~34.02 pt), none = 0
  let marginPt = 0;
  if (marginSetting === 'small') {
    marginPt = 14.17;
  } else if (marginSetting === 'big') {
    marginPt = 34.02;
  }

  // 1. Fit to Image (page matches photo dimensions + margin)
  if (pageSizeSetting === 'fit') {
    const effectiveDpi = dpi && dpi > 0 ? dpi : 96;
    const imgWPt = Math.max(18, (widthPx / effectiveDpi) * 72);
    const imgHPt = Math.max(18, (heightPx / effectiveDpi) * 72);
    const pageW = imgWPt + 2 * marginPt;
    const pageH = imgHPt + 2 * marginPt;
    const orientation = pageW >= pageH ? 'landscape' : 'portrait';

    return {
      pageW,
      pageH,
      drawX: marginPt,
      drawY: marginPt,
      drawW: imgWPt,
      drawH: imgHPt,
      orientation,
    };
  }

  // 2. Fixed Paper Sizes (A4 or US Letter)
  // A4: 210 x 297 mm -> 595.28 x 841.89 pt
  // US Letter: 8.5 x 11 in -> 612.00 x 792.00 pt
  const [baseShort, baseLong] = pageSizeSetting === 'letter' ? [612.0, 792.0] : [595.28, 841.89];

  let pageW: number;
  let pageH: number;
  let orientation: 'portrait' | 'landscape';

  if (orientationSetting === 'portrait') {
    pageW = baseShort;
    pageH = baseLong;
    orientation = 'portrait';
  } else if (orientationSetting === 'landscape') {
    pageW = baseLong;
    pageH = baseShort;
    orientation = 'landscape';
  } else {
    // 'auto': auto-detect based on image aspect ratio
    if (widthPx >= heightPx) {
      pageW = baseLong;
      pageH = baseShort;
      orientation = 'landscape';
    } else {
      pageW = baseShort;
      pageH = baseLong;
      orientation = 'portrait';
    }
  }

  // Printable area inside margins
  const availW = Math.max(1, pageW - 2 * marginPt);
  const availH = Math.max(1, pageH - 2 * marginPt);

  // Preserve image aspect ratio inside printable area
  const imgRatio = widthPx / heightPx;
  const availRatio = availW / availH;
  let drawW: number;
  let drawH: number;

  if (imgRatio > availRatio) {
    drawW = availW;
    drawH = availW / imgRatio;
  } else {
    drawH = availH;
    drawW = availH * imgRatio;
  }

  // Center image inside printable area
  const drawX = marginPt + (availW - drawW) / 2;
  const drawY = marginPt + (availH - drawH) / 2;

  return {
    pageW,
    pageH,
    drawX,
    drawY,
    drawW,
    drawH,
    orientation,
  };
}

export async function blobToDataUrl(blob: Blob): Promise<string> {
  if (typeof FileReader !== 'undefined') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error ?? new Error('FileReader error'));
      reader.readAsDataURL(blob);
    });
  }

  // Worker / Node fallback using ArrayBuffer + chunked base64 encoding
  const buf = await blob.arrayBuffer();
  if (typeof Buffer !== 'undefined') {
    const base64 = Buffer.from(buf).toString('base64');
    return `data:${blob.type || 'image/jpeg'};base64,${base64}`;
  }

  const bytes = new Uint8Array(buf);
  const CHUNK_SIZE = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK_SIZE) as unknown as number[]);
  }
  return `data:${blob.type || 'image/jpeg'};base64,${btoa(binary)}`;
}

export async function jpegToPdf(opts: PdfOptions): Promise<Blob> {
  const { jpegBlob, widthPx, heightPx, title, dpi, orientation, pageSize, margin } = opts;
  const layout = computePdfPageLayout(widthPx, heightPx, { orientation, pageSize, margin, dpi });

  const dataUrl = await blobToDataUrl(jpegBlob);

  const pdf = new jsPDF({
    orientation: layout.orientation,
    unit: 'pt',
    format: [layout.pageW, layout.pageH],
    compress: false,
  });

  pdf.addImage(
    dataUrl,
    'JPEG',
    layout.drawX,
    layout.drawY,
    layout.drawW,
    layout.drawH,
    undefined,
    'FAST'
  );

  if (title) {
    pdf.setProperties({ title });
  }

  return pdf.output('blob');
}

export function pdfOverheadBytes(): number {
  return OVERHEAD_BYTES;
}

export interface MergedPdfPage {
  jpegBlob: Blob;
  widthPx: number;
  heightPx: number;
}

/**
 * Merges multiple images sequentially into a single multi-page PDF document.
 */
export async function mergeImagesToPdf(
  pages: MergedPdfPage[],
  title?: string,
  options?: PdfOptionsConfig
): Promise<Blob> {
  if (pages.length === 0) {
    throw new Error('No pages to merge');
  }

  let pdf: jsPDF | null = null;

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i]!;
    const layout = computePdfPageLayout(page.widthPx, page.heightPx, options);
    const dataUrl = await blobToDataUrl(page.jpegBlob);

    if (i === 0) {
      pdf = new jsPDF({
        orientation: layout.orientation,
        unit: 'pt',
        format: [layout.pageW, layout.pageH],
        compress: false,
      });
    } else {
      pdf!.addPage([layout.pageW, layout.pageH], layout.orientation);
    }

    pdf!.addImage(
      dataUrl,
      'JPEG',
      layout.drawX,
      layout.drawY,
      layout.drawW,
      layout.drawH,
      undefined,
      'FAST'
    );
  }

  if (title && pdf) {
    pdf.setProperties({ title });
  }

  return pdf!.output('blob');
}
