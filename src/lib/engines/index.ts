/**
 * Engine registry — maps a target MIME to an engine name and provides
 * filename helper for the worker.
 */

import type { OutputFormat } from '../worker/types';

const MIME_TO_OUTPUT: Record<string, OutputFormat> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'application/pdf': 'pdf',
  'image/svg+xml': 'svg',
};

const EXT_TO_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  avif: 'image/avif',
  heic: 'image/heic',
  heif: 'image/heif',
  gif: 'image/gif',
  bmp: 'image/bmp',
  svg: 'image/svg+xml',
  tiff: 'image/tiff',
  tif: 'image/tiff',
  pdf: 'application/pdf',
};

export function mimeToOutputFormat(mime: string): OutputFormat {
  const fmt = MIME_TO_OUTPUT[mime];
  if (!fmt) {
    throw new Error(`Unsupported output MIME: ${mime}`);
  }
  return fmt;
}

export function mimeForExtension(ext: string): string | undefined {
  return EXT_TO_MIME[ext.toLowerCase().replace(/^\./, '')];
}

/**
 * Replace the extension in a filename with the target format extension.
 * Handles multi-dot names (foo.bar.png → foo.bar.jpg).
 */
export function buildFilename(originalName: string, toExt: string): string {
  const dot = originalName.lastIndexOf('.');
  const base = dot >= 0 ? originalName.slice(0, dot) : originalName;
  const normalized = toExt.toLowerCase() === 'jpeg' ? 'jpg' : toExt.toLowerCase();
  return `${base}.${normalized}`;
}