#!/usr/bin/env node
/**
 * generate-og-images.mjs
 * ------------------------------------------------------------------
 * OPTIONAL. Generates per-page Open Graph images (1200×630) so every
 * tool page has a unique share card. Falls back gracefully if the
 * @napi-rs/canvas dependency isn't installed.
 *
 * Output:
 *   public/og/heic-to-jpg.png
 *   public/og/heic-to-jpg-under-50kb.png
 *   ...
 *
 * The build doesn't require these — SEOHead falls back to /og-default.png
 * when a page-specific card is missing. Run manually before launch:
 *
 *   npm i -D @napi-rs/canvas
 *   node scripts/generate-og-images.mjs
 *
 * To keep the repo lean, add `public/og/` to .gitignore if you prefer
 * to generate at deploy time.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const COMBOS_PATH = resolve(ROOT, 'src/data/combinations.json');
const OUT_DIR = resolve(ROOT, 'public/og');

const WIDTH = 1200;
const HEIGHT = 630;
const BG = '#0A0A0A';
const FG = '#FFFFFF';
const MUTED = '#A1A1AA';
const ACCENT = '#FFFFFF';

async function loadCanvasLib() {
  try {
    // Optional dependency — not required for the site to build.
    return await import('@napi-rs/canvas');
  } catch {
    console.error(
      '✖ @napi-rs/canvas not installed.\n' +
        '  Run:  npm i -D @napi-rs/canvas'
    );
    process.exit(1);
  }
}

function slugFor(combo) {
  return combo.sizeKb
    ? `${combo.from}-to-${combo.to}-under-${combo.sizeKb}kb`
    : `${combo.from}-to-${combo.to}`;
}

function titleFor(combo) {
  if (combo.sizeKb) {
    return `Convert ${combo.from.toUpperCase()} to ${combo.to.toUpperCase()}`;
  }
  return `${combo.from.toUpperCase()} → ${combo.to.toUpperCase()}`;
}

function subtitleFor(combo) {
  if (combo.sizeKb) {
    return `Under ${combo.sizeKb} KB · In your browser · Free`;
  }
  return `Fast · Private · Free · No upload`;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

async function draw(ctx, combo) {
  // background
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // subtle grid ticks (brand texture)
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= WIDTH; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, HEIGHT);
    ctx.stroke();
  }
  for (let y = 0; y <= HEIGHT; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(WIDTH, y + 0.5);
    ctx.stroke();
  }

  // brand mark (top-left)
  const bx = 80;
  const by = 80;
  ctx.fillStyle = FG;
  ctx.beginPath();
  ctx.arc(bx + 18, by + 18, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = BG;
  ctx.beginPath();
  ctx.arc(bx + 18, by + 18, 8, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = FG;
  ctx.font = '600 26px Inter, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText('PixelKit', bx + 52, by + 18);

  // main title
  ctx.fillStyle = FG;
  ctx.font = '700 96px Inter, sans-serif';
  ctx.textBaseline = 'alphabetic';

  const title = titleFor(combo);
  const titleY = HEIGHT / 2 - 10;
  ctx.fillText(title, 80, titleY);

  // size badge (only for compress pages)
  if (combo.sizeKb) {
    const badge = `UNDER ${combo.sizeKb} KB`;
    ctx.font = '600 22px Inter, sans-serif';
    const bw = ctx.measureText(badge).width + 40;
    ctx.fillStyle = ACCENT;
    roundRect(ctx, 80, titleY + 30, bw, 48, 24);
    ctx.fill();
    ctx.fillStyle = BG;
    ctx.textBaseline = 'middle';
    ctx.fillText(badge, 100, titleY + 54);
  }

  // subtitle
  ctx.fillStyle = MUTED;
  ctx.font = '400 30px Inter, sans-serif';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(subtitleFor(combo), 80, HEIGHT - 100);

  // footer rule + tag
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(80, HEIGHT - 160.5);
  ctx.lineTo(WIDTH - 80, HEIGHT - 160.5);
  ctx.stroke();

  ctx.fillStyle = MUTED;
  ctx.font = '500 22px Inter, sans-serif';
  ctx.fillText('100% client-side · no upload', 80, HEIGHT - 60);
}

async function main() {
  const { createCanvas, GlobalFonts } = await loadCanvasLib();

  // Try to register Inter if present in public/fonts; otherwise the
  // system falls back to sans-serif (fine for OG images).
  try {
    const regular = resolve(ROOT, 'public/fonts/Inter-Variable.woff2');
    await readFile(regular);
    GlobalFonts.registerFromPath(regular, 'Inter');
  } catch {
    /* optional */
  }

  let data;
  try {
    data = JSON.parse(await readFile(COMBOS_PATH, 'utf8'));
  } catch {
    console.error(
      `✖ Cannot read ${COMBOS_PATH}\n  Run 'npm run gen:data' first.`
    );
    process.exit(1);
  }

  const combos = data.combos || [];
  if (!combos.length) {
    console.error('✖ No combos found in combinations.json');
    process.exit(1);
  }

  await mkdir(OUT_DIR, { recursive: true });

  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');

  let written = 0;
  for (const combo of combos) {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    await draw(ctx, combo);
    const buf = await canvas.encode('png');
    const file = resolve(OUT_DIR, `${slugFor(combo)}.png`);
    await writeFile(file, buf);
    written++;
    if (written % 50 === 0) {
      console.log(`  … ${written}/${combos.length}`);
    }
  }

  console.log(`✔ Wrote ${written} OG images → ${OUT_DIR}`);
}

main().catch((err) => {
  console.error('✖ Unexpected error:', err);
  process.exit(1);
});