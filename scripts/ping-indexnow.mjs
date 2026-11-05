#!/usr/bin/env node
/**
 * ping-indexnow.mjs
 * ------------------------------------------------------------------
 * Automated IndexNow ping script for Cloudflare Pages / GitHub Actions.
 *
 * Automatically detects which URLs changed in the latest Git commit,
 * formats an IndexNow payload for https://api.indexnow.org/indexnow,
 * and notifies Bing, Yandex, Naver, Seznam, ChatGPT Search, and Perplexity
 * within minutes of deployment.
 *
 * Usage:
 *   node scripts/ping-indexnow.mjs           # Pings changed URLs
 *   node scripts/ping-indexnow.mjs --all     # Pings all canonical URLs
 *   node scripts/ping-indexnow.mjs --dry-run # Tests URL detection without network POST
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const HOST = process.env.INDEXNOW_HOST || 'pixelkit.app';
const KEY = process.env.INDEXNOW_KEY || 'e2a48f93b1c04d8e95712fa6b301c89e';
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;
const ENDPOINT = 'https://api.indexnow.org/indexnow';

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const submitAll = args.includes('--all');

// Core flagship hubs to submit if shared global components or layouts change
const FLAGSHIP_HUBS = [
  `https://${HOST}/`,
  `https://${HOST}/convert/`,
  `https://${HOST}/compress-image/`,
  `https://${HOST}/resize-image/`,
  `https://${HOST}/crop-image/`,
  `https://${HOST}/passport-photo-resizer/`,
  `https://${HOST}/portal-photo-size-chart/`,
  `https://${HOST}/ssc-photo-resizer/`,
  `https://${HOST}/signature-resizer/`,
  `https://${HOST}/signature-resizer-10kb-to-20kb/`,
  `https://${HOST}/ibps-photo-signature-resizer/`,
  `https://${HOST}/sbi-po-photo-resizer/`,
  `https://${HOST}/gate-photo-resizer/`,
  `https://${HOST}/jee-main-photo-resizer/`,
  `https://${HOST}/cuet-photo-resizer/`,
  `https://${HOST}/rrb-photo-resizer/`,
  `https://${HOST}/neet-photo-resizer/`,
  `https://${HOST}/pan-card-photo-resizer/`,
  `https://${HOST}/us-visa-photo-resizer/`,
  `https://${HOST}/schengen-visa-photo-resizer/`,
  `https://${HOST}/uk-passport-photo-resizer/`,
  `https://${HOST}/canada-visa-photo-resizer/`,
  `https://${HOST}/australia-passport-photo-resizer/`,
  `https://${HOST}/uae-visa-photo-resizer/`,
  `https://${HOST}/saudi-visa-photo-resizer/`,
  `https://${HOST}/social-media-image-resizer/`,
  `https://${HOST}/instagram-photo-resizer/`,
  `https://${HOST}/twitter-header-resizer/`,
  `https://${HOST}/facebook-cover-photo-resizer/`,
  `https://${HOST}/linkedin-banner-resizer/`,
  `https://${HOST}/whatsapp-dp-cropper/`,
  `https://${HOST}/youtube-thumbnail-compressor-under-2mb/`,
  `https://${HOST}/change-image-dpi-to-300/`,
  `https://${HOST}/pixels-to-cm-converter/`,
  `https://${HOST}/cm-to-pixels-at-300-dpi/`,
  `https://${HOST}/exif-metadata-remover/`,
  `https://${HOST}/aadhaar-pdf-compressor/`,
  `https://${HOST}/compress-image-to-50kb/`,
  `https://${HOST}/compress-image-to-20kb/`,
  `https://${HOST}/compress-image-to-100kb/`,
  `https://${HOST}/image-to-pdf/`,
  `https://${HOST}/image-to-pdf-200kb/`,
  `https://${HOST}/blog/`,
];

/**
 * Reads all canonical HTML URLs from dist/ directory if present
 */
function getAllBuiltUrls() {
  const distDir = path.resolve(ROOT, 'dist');
  if (!fs.existsSync(distDir)) {
    return FLAGSHIP_HUBS;
  }
  const urls = [];
  function walk(dir, currentPath = '') {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        walk(path.join(dir, entry.name), `${currentPath}/${entry.name}`);
      } else if (entry.name === 'index.html') {
        const urlPath = currentPath === '' ? '/' : `${currentPath}/`;
        urls.push(`https://${HOST}${urlPath}`);
      }
    }
  }
  walk(distDir);
  return Array.from(new Set(urls)).sort();
}

/**
 * Gets list of changed files from recent Git commit(s)
 */
function getChangedFiles() {
  try {
    const diff = execSync('git diff --name-only HEAD~1 HEAD', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
    if (diff) return diff.split(/\r?\n/).filter(Boolean);
  } catch {
    // If shallow or first commit, fallback to git log
    try {
      const log = execSync('git log -1 --name-only --pretty=""', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
      if (log) return log.split(/\r?\n/).filter(Boolean);
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Maps changed Git file paths to actual canonical site URLs
 */
function mapFilesToUrls(files) {
  const urls = new Set();
  let hasGlobalChange = false;

  for (const file of files) {
    const normalized = file.replace(/\\/g, '/');

    // Global components, layouts, configs, styles affect all or flagship pages
    if (
      normalized.startsWith('src/components/') ||
      normalized.startsWith('src/layouts/') ||
      normalized.startsWith('src/lib/') ||
      normalized.startsWith('src/styles/') ||
      normalized === 'astro.config.mjs' ||
      normalized === 'package.json'
    ) {
      hasGlobalChange = true;
      continue;
    }

    // Direct static pages in src/pages/
    if (normalized.startsWith('src/pages/')) {
      const pageRel = normalized.replace('src/pages/', '');

      if (pageRel === 'index.astro') {
        urls.add(`https://${HOST}/`);
      } else if (pageRel === 'convert/index.astro') {
        urls.add(`https://${HOST}/convert/`);
      } else if (pageRel === 'blog/index.astro') {
        urls.add(`https://${HOST}/blog/`);
      } else if (pageRel.startsWith('blog/') && pageRel.endsWith('.astro')) {
        const slug = pageRel.replace('blog/', '').replace('.astro', '');
        urls.add(`https://${HOST}/blog/${slug}/`);
      } else if (pageRel === 'compress-[format].astro') {
        ['jpg', 'png', 'webp', 'pdf'].forEach((f) => urls.add(`https://${HOST}/compress-${f}/`));
      } else if (pageRel === 'compress-image-to-[size]kb.astro') {
        [10, 15, 20, 30, 40, 50, 80, 100, 150, 200, 256, 300, 500].forEach((s) =>
          urls.add(`https://${HOST}/compress-image-to-${s}kb/`)
        );
      } else if (pageRel === 'compress-jpg-to-[size]kb.astro') {
        [10, 15, 20, 30, 40, 50, 80, 100, 150, 200, 256, 300, 500].forEach((s) =>
          urls.add(`https://${HOST}/compress-jpg-to-${s}kb/`)
        );
      } else if (pageRel === 'compress-image-to-[size]mb.astro') {
        [1, 2, 5, 10].forEach((s) => urls.add(`https://${HOST}/compress-image-to-${s}mb/`));
      } else if (pageRel === 'photo-to-pdf-[size]kb.astro') {
        [50, 100, 200, 300, 500].forEach((s) => urls.add(`https://${HOST}/photo-to-pdf-${s}kb/`));
      } else if (pageRel === '[from]-to-[to].astro' || pageRel === '[from]-to-[to]-under-[size]kb.astro') {
        // High priority conversions
        urls.add(`https://${HOST}/convert/`);
        urls.add(`https://${HOST}/heic-to-jpg/`);
        urls.add(`https://${HOST}/png-to-jpg/`);
        urls.add(`https://${HOST}/jpg-to-pdf/`);
      } else if (pageRel.endsWith('.astro') && !pageRel.includes('[')) {
        const slug = pageRel.replace('.astro', '');
        urls.add(`https://${HOST}/${slug}/`);
      }
    }

    // Blog markdown articles
    if (normalized.startsWith('src/content/blog/') && normalized.endsWith('.md')) {
      const slug = path.basename(normalized, '.md');
      urls.add(`https://${HOST}/blog/${slug}/`);
      urls.add(`https://${HOST}/blog/`);
    }

    // Combinations matrix data change
    if (normalized === 'src/data/combinations.json') {
      urls.add(`https://${HOST}/convert/`);
      urls.add(`https://${HOST}/heic-to-jpg/`);
      urls.add(`https://${HOST}/jpg-to-pdf/`);
    }
  }

  // If global change occurred, ensure flagship hubs are included
  if (hasGlobalChange) {
    FLAGSHIP_HUBS.forEach((u) => urls.add(u));
  }

  return Array.from(urls).sort();
}

async function main() {
  console.log(`[IndexNow] Initializing for host: ${HOST}`);

  let targetUrls = [];

  if (submitAll) {
    targetUrls = getAllBuiltUrls();
    console.log(`[IndexNow] --all flag specified: Submitting ${targetUrls.length} canonical URLs.`);
  } else {
    const changedFiles = getChangedFiles();
    console.log(`[IndexNow] Detected ${changedFiles.length} modified files in recent commit.`);
    if (changedFiles.length > 0) {
      targetUrls = mapFilesToUrls(changedFiles);
    }

    // Fallback: if no files mapped or outside git, submit flagship hubs
    if (targetUrls.length === 0) {
      console.log(`[IndexNow] No specific page changes detected. Using top ${FLAGSHIP_HUBS.length} flagship hubs.`);
      targetUrls = FLAGSHIP_HUBS;
    }
  }

  // Ensure unique list & IndexNow cap (max 10,000 URLs per post)
  targetUrls = Array.from(new Set(targetUrls)).slice(0, 10000);

  console.log(`[IndexNow] Preparing to submit ${targetUrls.length} URLs to IndexNow:`);
  targetUrls.slice(0, 10).forEach((u) => console.log(`  · ${u}`));
  if (targetUrls.length > 10) {
    console.log(`  ... and ${targetUrls.length - 10} more.`);
  }

  const payload = {
    host: HOST,
    key: KEY,
    keyLocation: KEY_LOCATION,
    urlList: targetUrls,
  };

  if (isDryRun) {
    console.log('\n[IndexNow] --dry-run enabled: Payload preview:');
    console.log(JSON.stringify(payload, null, 2));
    console.log('\n✔ Dry run finished successfully. No HTTP request sent.');
    return;
  }

  try {
    console.log(`\n[IndexNow] Sending POST request to ${ENDPOINT}...`);
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'User-Agent': 'PixelKit-IndexNow-Notifier/1.0',
      },
      body: JSON.stringify(payload),
    });

    if (res.status === 200 || res.status === 202) {
      console.log(`✔ [IndexNow] Success! Status ${res.status} (${res.statusText || 'Accepted'}).`);
      console.log(`  ${targetUrls.length} URLs submitted to Bing, Yandex, Naver, Seznam, Perplexity & ChatGPT Search.`);
    } else {
      const errText = await res.text().catch(() => '');
      console.warn(`⚠ [IndexNow] Response status ${res.status}: ${errText || res.statusText}`);
      // Do not exit with non-zero in production so CI/CD deployment is not disrupted
    }
  } catch (err) {
    console.warn('⚠ [IndexNow] Network warning (deployment unaffected):', err.message);
  }
}

main().catch((err) => {
  console.warn('⚠ [IndexNow] Unexpected error:', err.message);
  process.exit(0);
});

