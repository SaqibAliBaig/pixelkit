/**
 * Wrap a JPEG image into a single-page PDF using jsPDF.
 *
 * Strategy:
 *   1. The caller already compressed the image to `targetBytes - overhead`.
 *   2. We convert the JPEG Blob to a data URL.
 *   3. jsPDF embeds the JPEG in a PDF sized to the image's dimensions.
 *
 * Overhead is tiny (a few hundred bytes for a single-page PDF), so the
 * caller subtracts ~2 KB before compressing.
 */

import { jsPDF } from 'jspdf';

export interface PdfOptions {
  jpegBlob: Blob;
  widthPx: number;
  heightPx: number;
  title?: string;
}

const OVERHEAD_BYTES = 3 * 1024; // conservative PDF wrapper overhead

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
  const { jpegBlob, widthPx, heightPx, title } = opts;

  // PDF page size in points (72 dpi). Keep aspect ratio.
  const targetWidthPt = 595; // A4 width in points (approx)
  const ratio = heightPx / widthPx;
  const targetHeightPt = targetWidthPt * ratio;

  const dataUrl = await blobToDataUrl(jpegBlob);

  const pdf = new jsPDF({
    orientation: targetWidthPt >= targetHeightPt ? 'landscape' : 'portrait',
    unit: 'pt',
    format: [targetWidthPt, targetHeightPt],
    compress: false,
  });

  pdf.addImage(
    dataUrl,
    'JPEG',
    0,
    0,
    targetWidthPt,
    targetHeightPt,
    undefined,
    'FAST'
  );

  if (title) {
    pdf.setProperties({ title });
  }

  const blob = pdf.output('blob');
  return blob;
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
  title?: string
): Promise<Blob> {
  if (pages.length === 0) {
    throw new Error('No pages to merge');
  }

  let pdf: jsPDF | null = null;

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i]!;
    const targetWidthPt = 595; // Standard A4 width in points (72 DPI)
    const ratio = page.heightPx / page.widthPx;
    const targetHeightPt = targetWidthPt * ratio;
    const orientation = targetWidthPt >= targetHeightPt ? 'landscape' : 'portrait';

    const dataUrl = await blobToDataUrl(page.jpegBlob);

    if (i === 0) {
      pdf = new jsPDF({
        orientation,
        unit: 'pt',
        format: [targetWidthPt, targetHeightPt],
        compress: false,
      });
    } else {
      pdf!.addPage([targetWidthPt, targetHeightPt], orientation);
    }

    pdf!.addImage(
      dataUrl,
      'JPEG',
      0,
      0,
      targetWidthPt,
      targetHeightPt,
      undefined,
      'FAST'
    );
  }

  if (title && pdf) {
    pdf.setProperties({ title });
  }

  return pdf!.output('blob');
}