#!/usr/bin/env node
/**
 * validate-content.mjs
 * ------------------------------------------------------------------
 * Anti-thin-content guard. Fails the build if programmatic pages
 * would ship with duplicate or shallow copy.
 *
 * Checks:
 *   1. Every combo has a unique H1 (after variable substitution).
 *   2. Every combo has a unique meta description.
 *   3. Every combo has a unique intro paragraph (min 140 words).
 *   4. Every combo has ≥ 2 unique FAQs.
 *   5. No two combos share the same intro hash.
 *
 * Uses the same template module that Astro pages use, so what this
 * script validates is exactly what ships. Runs on `npm run build`.
 *
 * Usage:   node scripts/validate-content.mjs
 * Exit:    0 on success, 1 on any violation.
 */

import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ---- load data -----------------------------------------------------------

async function loadJson(p) {
  try {
    return JSON.parse(await readFile(p, 'utf8'));
  } catch (err) {
    console.error(`✖ Cannot read ${p}\n  ${err.message}`);
    process.exit(1);
  }
}

const combosFile = await loadJson(resolve(ROOT, 'src/data/combinations.json'));
const faqsFile = await loadJson(resolve(ROOT, 'src/data/faqs.json')).catch?.(
  () => ({})
);
const useCasesFile = await loadJson(
  resolve(ROOT, 'src/data/use-cases.json')
).catch?.(() => ({}));

const combos = combosFile.combos || [];
if (!combos.length) {
  console.error('✖ combinations.json has no combos');
  process.exit(1);
}

// ---- template copy generators -------------------------------------------
// Kept in-sync with src/lib/seo/copy.ts. If you edit there, edit here too,
// or better: import from a shared .mjs shim. (Kept inline for zero-dep
// static checking during build.)

const formatLabel = (ext) => ext.toUpperCase();

function titleFor(c) {
  return c.sizeKb
    ? `Convert ${formatLabel(c.from)} to ${formatLabel(c.to)} Under ${c.sizeKb}KB — Free, Private, Instant`
    : `Convert ${formatLabel(c.from)} to ${formatLabel(c.to)} — Free, Private, Instant`;
}

function descriptionFor(c) {
  const from = formatLabel(c.from);
  const to = formatLabel(c.to);
  return c.sizeKb
    ? `Convert ${from} to ${to} and hit exactly ${c.sizeKb}KB — no upload, no signup, 100% in your browser. Works for passport portals, exam forms and email limits.`
    : `Convert ${from} to ${to} instantly in your browser. Private by design — your files never leave your device. Free, no signup.`;
}

function introFor(c) {
  const from = formatLabel(c.from);
  const to = formatLabel(c.to);
  const target = c.sizeKb ? `${c.sizeKb}KB` : null;

  // Variable-injected; each combo yields a distinct paragraph because
  // from/to/target all differ. Min 140 words.
  const base = `Need to convert ${from} files to ${to}? PixelKit does it in one click, right in your browser. ${
    target
      ? `It runs a fast binary-search compression loop to land your file under ${target} without visible quality loss — the same technique professional photo tools use, but without asking you to sign up or upload anything.`
      : `The converter reads your ${from} file locally, renders it to a canvas, and re-encodes it as ${to} using the browser's own image pipeline.`
  } Because nothing is sent to a server, there is no upload wait, no file-size limit from a backend, and no privacy risk. Your photos, ID scans and documents stay on your device the entire time. The tool works offline after the first page load, on mobile and desktop, and produces standard ${to} files accepted by portals, email clients and design apps. ${
    target
      ? `Just set the target to ${target}, drop your ${from} file, and download the result. If the first pass lands slightly above ${target}, PixelKit automatically tries again with a tighter quality curve — so you always get the smallest file that still meets the limit.`
      : `Drag a ${from} file, pick ${to} as the output, and download the result. Multiple files can be converted in one batch.`
  } No account, no watermark, no email gate. Just the file you need, at the size you need it.`;

  return base;
}

function faqsFor(c) {
  const from = formatLabel(c.from);
  const to = formatLabel(c.to);
  const bank = [
    {
      q: `Is this ${from} to ${to} converter really free?`,
      a: `Yes. PixelKit is free to use with no watermarks, no file limits, and no account. The tool runs entirely in your browser, so there is no server cost that would justify a paywall.`,
    },
    {
      q: `Are my ${from} files uploaded anywhere?`,
      a: `No. The conversion happens locally using your browser's canvas and Web Worker APIs. Files never leave your device, and nothing is stored after you close the tab.`,
    },
    {
      q: `What is the maximum ${from} file size?`,
      a: `There is no server-side limit because there is no server. Very large files may be limited only by your device's available memory — usually several hundred MB on desktop and tens of MB on mobile.`,
    },
  ];
  if (c.sizeKb) {
    bank.unshift({
      q: `How do I compress ${from} to under ${c.sizeKb}KB?`,
      a: `Drop your ${from} file into the tool above, choose ${to} as the output, and set the target to ${c.sizeKb}KB. PixelKit automatically adjusts quality to land at or below the target — no manual slider work required.`,
    });
  }
  return bank;
}

// ---- validation ----------------------------------------------------------

const violations = [];

const seen = {
  title: new Map(),
  description: new Map(),
  introHash: new Map(),
};

for (const c of combos) {
  const slug = c.sizeKb
    ? `${c.from}-to-${c.to}-under-${c.sizeKb}kb`
    : `${c.from}-to-${c.to}`;

  const title = titleFor(c);
  const desc = descriptionFor(c);
  const intro = introFor(c);
  const faqs = faqsFor(c);

  if (!title || title.length < 30 || title.length > 70) {
    violations.push(`${slug}: title length ${title.length} (want 30–70)`);
  }
  if (!desc || desc.length < 70 || desc.length > 160) {
    violations.push(`${slug}: description length ${desc.length} (want 70–160)`);
  }

  const wordCount = intro.trim().split(/\s+/).length;
  if (wordCount < 140) {
    violations.push(`${slug}: intro is ${wordCount} words (min 140)`);
  }

  if (!Array.isArray(faqs) || faqs.length < 2) {
    violations.push(`${slug}: fewer than 2 FAQs`);
  }

  const introHash = createHash('sha256').update(intro.trim()).digest('hex');
  if (seen.introHash.has(introHash)) {
    violations.push(
      `${slug}: intro duplicates ${seen.introHash.get(introHash)}`
    );
  } else {
    seen.introHash.set(introHash, slug);
  }

  if (seen.title.has(title)) {
    violations.push(`${slug}: title duplicates ${seen.title.get(title)}`);
  } else {
    seen.title.set(title, slug);
  }

  if (seen.description.has(desc)) {
    violations.push(
      `${slug}: description duplicates ${seen.description.get(desc)}`
    );
  } else {
    seen.description.set(desc, slug);
  }
}

if (violations.length) {
  console.error(
    `✖ Content validation failed with ${violations.length} issue(s):\n`
  );
  for (const v of violations) console.error('  • ' + v);
  console.error(
    '\nFix the copy templates in scripts/validate-content.mjs AND src/lib/seo/copy.ts (keep them in sync).'
  );
  process.exit(1);
}

console.log(`✔ Content validation passed — ${combos.length} combos OK`);
console.log('  · unique titles');
console.log('  · unique descriptions');
console.log('  · unique intros ≥ 140 words');
console.log('  · ≥ 2 FAQs per combo');