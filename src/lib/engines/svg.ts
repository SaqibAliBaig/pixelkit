/**
 * svg.ts — SVG → raster. Optional engine; not wired into the MVP worker
 * because SVG support requires a DOMParser + <img> pipeline and is rarely
 * what users of KB-target compression want.
 *
 * Kept as a building block for a future "SVG → PNG" page.
 */

export interface SvgEngineOptions {
  width: number;
  height: number;
  background?: string;
}

export async function rasterizeSvg(
  svgSource: Blob,
  opts: SvgEngineOptions
): Promise<Blob> {
  const text = await svgSource.text();
  const encoded = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(text)}`;

  const img = await loadImage(encoded);
  const canvas = new OffscreenCanvas(opts.width, opts.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D context unavailable');

  if (opts.background) {
    ctx.fillStyle = opts.background;
    ctx.fillRect(0, 0, opts.width, opts.height);
  }
  ctx.drawImage(img, 0, 0, opts.width, opts.height);

  return canvas.convertToBlob({ type: 'image/png' });
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('SVG load failed'));
    img.src = url;
  });
}