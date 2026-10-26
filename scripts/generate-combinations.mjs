#!/usr/bin/env node
/**
 * generate-combinations.mjs
 * ------------------------------------------------------------------
 * Reads src/data/formats.json and produces src/data/combinations.json —
 * the matrix of {from, to, size} tuples consumed by Astro's dynamic
 * routes to generate the 500+ programmatic SEO pages.
 *
 * Rules:
 *   - Only lossy / raster targets can hit a KB target.
 *   - PDF is allowed as a target but sizes are limited (25–500 KB).
 *   - Skip identity combos (jpg → jpg).
 *   - Deduplicate, sort deterministically, write stable output so git
 *     diffs stay clean.
 *
 * Usage:   node scripts/generate-combinations.mjs
 * Exit:    0 on success, 1 on validation failure.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const FORMATS_PATH = resolve(ROOT, 'src/data/formats.json');
const OUT_PATH = resolve(ROOT, 'src/data/combinations.json');

const KIB = 1024;
const MIN_KB = 10;
const MAX_KB = 2048;

// Size ladder — every target that a combo can ask for.
// Chosen to match real-world portal limits (passport, aadhaar, exam portals).
const SIZE_LADDER = [
  10, 20, 25, 30, 40, 50, 75, 100, 150, 200, 250, 300, 500, 1000,
];

// PDF caps: PDFs aren't photos — huge PDF targets don't make sense.
const PDF_SIZE_LADDER = [25, 50, 100, 150, 200, 250, 300, 500];

const MIME = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heif',
  avif: 'image/avif',
  gif: 'image/gif',
  bmp: 'image/bmp',
  svg: 'image/svg+xml',
  tiff: 'image/tiff',
  tif: 'image/tiff',
  pdf: 'application/pdf',
};

function normalizeExt(ext) {
  const e = String(ext).toLowerCase().trim().replace(/^\./, '');
  return e === 'jpeg' ? 'jpg' : e;
}

function validateFormat(fmt) {
  if (!fmt || typeof fmt !== 'object') return false;
  if (typeof fmt.ext !== 'string' || !fmt.ext.length) return false;
  if (!MIME[normalizeExt(fmt.ext)]) return false;
  return true;
}

async function main() {
  let formatsRaw;
  try {
    formatsRaw = JSON.parse(await readFile(FORMATS_PATH, 'utf8'));
  } catch (err) {
    console.error(`✖ Cannot read ${FORMATS_PATH}`);
    console.error(err.message);
    process.exit(1);
  }

  const formats = Array.isArray(formatsRaw)
    ? formatsRaw
    : Array.isArray(formatsRaw.formats)
    ? formatsRaw.formats
    : null;

  if (!formats) {
    console.error('✖ formats.json must be an array or { formats: [...] }');
    process.exit(1);
  }

  const bad = formats.filter((f) => !validateFormat(f));
  if (bad.length) {
    console.error(`✖ Invalid format entries:`, bad.map((b) => b?.ext ?? b));
    process.exit(1);
  }

  // Index by normalised ext for quick lookup.
  const byExt = new Map();
  for (const f of formats) {
    const ext = normalizeExt(f.ext);
    byExt.set(ext, {
      ext,
      mime: f.mime || MIME[ext],
      lossy: Boolean(f.lossy),
      lossless: Boolean(f.lossless),
      canTargetKB: Boolean(f.canTargetKB ?? (f.lossy || ext === 'pdf')),
      kind: f.kind || (ext === 'pdf' ? 'doc' : 'image'),
    });
  }

  const combos = [];
  const seen = new Set();

  for (const from of byExt.values()) {
    for (const to of byExt.values()) {
      if (from.ext === to.ext) continue;             // skip identity
      if (from.kind !== 'image') continue;           // only image sources
      if (!to.canTargetKB) continue;                 // target must hit a size

      // ---- plain conversion page:  /{from}-to-{to}
      const plainKey = `${from.ext}>${to.ext}`;
      if (!seen.has(plainKey)) {
        seen.add(plainKey);
        combos.push({
          from: from.ext,
          fromMime: from.mime,
          to: to.ext,
          toMime: to.mime,
          sizeKb: null,
          kind: 'convert',
        });
      }

      // ---- size-targeted pages:    /{from}-to-{to}-under-{size}kb
      const ladder =
        to.ext === 'pdf'
          ? PDF_SIZE_LADDER
          : SIZE_LADDER.filter((k) => k >= MIN_KB && k <= MAX_KB);

      for (const kb of ladder) {
        const key = `${from.ext}>${to.ext}@${kb}`;
        if (seen.has(key)) continue;
        seen.add(key);
        combos.push({
          from: from.ext,
          fromMime: from.mime,
          to: to.ext,
          toMime: to.mime,
          sizeKb: kb,
          kind: 'compress',
        });
      }
    }
  }

  // Deterministic order so git diffs stay clean.
  combos.sort((a, b) => {
    if (a.from !== b.from) return a.from.localeCompare(b.from);
    if (a.to !== b.to) return a.to.localeCompare(b.to);
    return (a.sizeKb ?? 0) - (b.sizeKb ?? 0);
  });

  const output = {
    generatedAt: new Date().toISOString(),
    count: combos.length,
    ladder: SIZE_LADDER,
    pdfLadder: PDF_SIZE_LADDER,
    combos,
  };

  await writeFile(OUT_PATH, JSON.stringify(output, null, 2) + '\n', 'utf8');

  const plainCount = combos.filter((c) => c.kind === 'convert').length;
  const sizeCount = combos.filter((c) => c.kind === 'compress').length;
  const totalKb = (combos.length * KIB).toFixed(0);

  console.log(`✔ Wrote ${OUT_PATH}`);
  console.log(`  ${plainCount} plain conversion pages`);
  console.log(`  ${sizeCount} size-targeted pages`);
  console.log(`  ${combos.length} total combos (~${totalKb} bytes)`);
}

main().catch((err) => {
  console.error('✖ Unexpected error:', err);
  process.exit(1);
});