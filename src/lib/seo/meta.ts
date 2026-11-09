/**
 * Meta generators for programmatic SEO pages. Produces <title>, meta
 * description, and Open Graph descriptions that are unique per combo.
 *
 * Used at build time by dynamic routes. The scripts/validate-content.mjs
 * validator uses a mirrored copy of these — keep in sync.
 */

export interface ComboForMeta {
  from: string;
  to: string;
  sizeKb: number | null;
}

export interface MetaResult {
  title: string;
  description: string;
  ogTitle: string;
  ogDescription: string;
}

const fmt = (s: string) => s.toUpperCase();

export function buildMeta(combo: ComboForMeta): MetaResult {
  const from = fmt(combo.from);
  const to = fmt(combo.to);
  const fromKey = combo.from.toLowerCase();
  const toKey = combo.to.toLowerCase();

  const title = combo.sizeKb
    ? `Convert ${from} to ${to} Under ${combo.sizeKb}KB Online (Free)`
    : `${from} to ${to} Converter — Convert ${from} to ${to} Free`;

  let description: string;
  if (combo.sizeKb) {
    description = `Convert and compress ${from} to ${to} strictly under ${combo.sizeKb}KB online free. Auto-calibrates quality for passport, visa & exam portals—no blur, no upload.`;
  } else if (toKey === 'pdf') {
    description = `Free online ${from} to PDF converter. Convert ${from} to PDF or merge multiple ${from} files into one compact PDF (100KB/200KB). Instant, no watermark, no upload.`;
  } else if (fromKey === 'svg') {
    description = `Free online SVG to ${to} converter. Render vector SVG to crisp 300/600 DPI ${to} images with custom scaling. 100% lossless quality, batch ZIP & no upload.`;
  } else if (fromKey === 'heic') {
    description = `Free online iPhone HEIC to ${to} converter. Convert Apple .heic/.heif photos to ${to} in 1 click—batch ZIP download, exact KB limits & zero server uploads.`;
  } else if (fromKey === 'pdf') {
    description = `Free online PDF to ${to} converter. Extract multi-page PDF documents into high-res 300 DPI ${to} images in 1 click. Batch ZIP download, private & no upload.`;
  } else if (toKey === 'avif' || toKey === 'webp') {
    description = `Free online ${from} to ${to} converter. Convert ${from} to ${to} with up to 50% smaller file size, full transparency, batch ZIP download & zero server uploads.`;
  } else {
    description = `Free online ${from} to ${to} converter. Convert ${from} to ${to} in 1 click with lossless quality, optional crop/resize, batch ZIP & zero server uploads.`;
  }

  return {
    title,
    description,
    ogTitle: title,
    ogDescription: description,
  };
}