/**
 * Programmatic copy generators for tool pages.
 * Combines source-format mechanics, target-format benefits, portal KB context,
 * and PixelKit's built-in Crop & Resize workflow so every route provides
 * genuinely distinct, helpful technical guidance rather than thin boilerplate.
 *
 * Keep mirrored with scripts/validate-content.mjs.
 */

import type { ComboForMeta } from './meta';

const fmt = (s: string) => s.toUpperCase();

export interface FAQItem {
  q: string;
  a: string;
}

const SOURCE_FACTS: Record<string, string> = {
  heic: 'Apple iPhones and iPads capture photos in HEIC (High Efficiency Image Container) by default, which saves storage on iOS but fails validation on Windows viewers and most government, visa, and job portals.',
  png: 'PNG files store lossless RGBA pixel data and crisp alpha transparency, making screenshots and graphics sharp—but often far too heavy for strict portal limits or fast web pages.',
  jpg: 'JPG (JPEG) is the universal camera and web photo standard using lossy DCT compression, though raw smartphone JPEGs routinely weigh 3 MB to 10 MB before optimization.',
  webp: 'WebP delivers modern lossy and lossless web compression, yet many legacy desktop apps, print shops, and official upload portals still require traditional formats.',
  avif: 'AVIF uses next-generation AV1 compression for tiny file sizes, but older browsers, office suites, and document portals frequently reject .avif uploads.',
  svg: 'SVG files store resolution-independent XML vector paths; PixelKit rasterizes them locally at selectable 1x (96 DPI), 2x Retina (192 DPI), 3x (300 DPI), or 4x print (600 DPI) clarity.',
  pdf: 'Multi-page PDF documents often lock away scanned pages or graphics; PixelKit decodes each PDF page locally in your browser via PDF.js without uploading sensitive paperwork.',
  tiff: 'TIFF archives uncompressed or LZW-encoded high-bit-depth scans from flatbed scanners and DSLRs, resulting in massive files that need clean browser-based conversion.',
  bmp: 'BMP stores raw uncompressed bitmap pixels with huge byte overhead; converting out of BMP routinely cuts file size by 85% to 95% with zero visible loss.',
  gif: 'GIF is limited to an 8-bit 256-color palette; converting static GIF graphics into modern true-color or document containers improves compatibility and print clarity.',
};

const TARGET_FACTS: Record<string, string> = {
  jpg: 'Outputting to JPG guarantees universal compatibility across passport portals, exam forms, email clients, and CMS uploads, with automatic white-background fill for transparent inputs and optional EXIF preservation.',
  png: 'Outputting to PNG preserves pixel-exact lossless edges and full alpha-channel transparency—ideal for logos, UI screenshots, signatures, and design assets.',
  webp: 'Outputting to WebP typically shrinks byte weight by 25% to 45% compared to legacy formats while preserving sharp detail and transparency for green Core Web Vitals.',
  avif: 'Outputting to AVIF unlocks cutting-edge royalty-free compression up to 50% smaller than standard JPEG for modern web performance.',
  pdf: 'Outputting to PDF packages one or multiple images into clean, printable documents—complete with drag-to-reorder multi-page merging for Aadhaar, KYC, visa, and academic submissions.',
  svg: 'Outputting to SVG wraps your graphic in a clean scalable vector viewport with configurable DPI scaling from 96 DPI up to 600 DPI.',
};

const SIZE_CONTEXT: Record<number, string> = {
  20: 'A strict 20KB ceiling is standard for digital signatures, thumbprints, and compact state-exam slots (such as SSC, IBPS, and UPSC signature uploads).',
  50: 'A 50KB limit is one of the most common thresholds for online exam photographs, university registrations, and government recruitment portals.',
  100: 'A 100KB cap hits the sweet spot required by Aadhaar updates, PAN card portals, bank KYC forms, and fast-loading ecommerce thumbnails.',
  200: 'A 200KB maximum matches international visa applications (including DS-160), passport renewals, embassy portals, and HR onboarding systems.',
  500: 'A 500KB budget is ideal for multi-page scanned PDFs, academic certificates, email attachments, and crisp CMS blog imagery.',
};

export function buildIntro(combo: ComboForMeta): string {
  const fromKey = combo.from.toLowerCase();
  const toKey = combo.to.toLowerCase();
  const from = fmt(combo.from);
  const to = fmt(combo.to);
  const target = combo.sizeKb ? `${combo.sizeKb}KB` : null;

  const srcFact =
    SOURCE_FACTS[fromKey] ??
    `${from} files often require fast format conversion to meet browser, portal, or publishing requirements.`;
  const tgtFact =
    TARGET_FACTS[toKey] ??
    `Converting into ${to} produces clean, standards-compliant files ready for immediate download.`;
  const sizeFact = combo.sizeKb
    ? SIZE_CONTEXT[combo.sizeKb] ??
      `Hitting an exact ${combo.sizeKb}KB cap ensures your file passes strict automated portal upload checks on the first attempt.`
    : '';

  const p1 = `${srcFact} ${tgtFact}${
    target
      ? ` ${sizeFact} PixelKit's in-browser binary-search encoder tests multiple quantization passes in Web Workers to land your ${to} file safely under ${target} while retaining maximum visual sharpness.`
      : ` PixelKit decodes your ${from} input and encodes ${to} directly inside browser Web Workers—delivering instant results with zero server round-trips.`
  }`;

  const p2 = `More than a basic ${from} to ${to} converter, PixelKit includes an integrated Crop Studio and Scale & Resize Engine in the same workflow. Before downloading${
    target ? ` your under-${target} ${to}` : ` your ${to} file`
  }, you can frame exact aspect ratios (1:1 square, 4:5 portrait, 16:9 widescreen, or 3:4 passport), resize to exact pixel dimensions (such as 413×531 px or 1920×1080 px), and inspect sharpness with the live Before/After comparison slider.`;

  const p3 = `Every byte stays 100% on your device. There are no server uploads, no daily file caps, no watermarks, and full offline PWA support once the page loads—making it safe for personal photos, confidential IDs, medical scans, and client assets.`;

  return [p1, p2, p3].join('\n\n');
}

export function buildFaqs(combo: ComboForMeta): FAQItem[] {
  const fromKey = combo.from.toLowerCase();
  const toKey = combo.to.toLowerCase();
  const from = fmt(combo.from);
  const to = fmt(combo.to);

  const bank: FAQItem[] = [];

  if (combo.sizeKb) {
    bank.push({
      q: `How do I compress and convert ${from} to ${to} under ${combo.sizeKb}KB?`,
      a: `Drop your ${from} file into PixelKit above—${to} and the ${combo.sizeKb}KB ceiling are already pre-selected. PixelKit runs an automated binary-search compression loop in your browser to land at or just below ${combo.sizeKb}KB without manual slider guesswork.`,
    });
  }

  // Format-specific technical FAQ
  if (toKey === 'pdf') {
    bank.push({
      q: `Can I combine multiple ${from} files into a single PDF${combo.sizeKb ? ` under ${combo.sizeKb}KB` : ''}?`,
      a: `Yes. Drop multiple ${from} images, enable "Merge Files into Single PDF" in the settings panel, drag cards to reorder pages, and export one combined PDF${combo.sizeKb ? ` optimized toward your ${combo.sizeKb}KB budget` : ''}.`,
    });
  } else if (fromKey === 'svg') {
    bank.push({
      q: `How do I keep ${from} vector edges sharp when converting to ${to}?`,
      a: `Use the SVG Scale (DPI Multiplier) selector in the settings panel to rasterize at 2x (192 DPI), 3x (300 DPI), or 4x (600 DPI) before encoding to ${to}, keeping logos, icons, and typography razor-sharp.`,
    });
  } else if (fromKey === 'png' && toKey === 'jpg') {
    bank.push({
      q: `What happens to transparent PNG backgrounds when converting to JPG?`,
      a: `Because JPG does not support alpha transparency, PixelKit automatically fills transparent areas with a clean white background by default (configurable in Advanced Options) instead of turning transparent pixels black.`,
    });
  } else if (fromKey === 'pdf') {
    bank.push({
      q: `Does PixelKit convert multi-page PDF files to ${to} images?`,
      a: `Yes. PixelKit decodes every page of your PDF locally in the browser and exports crisp ${to} images for each page—or lets you download the entire batch as a ZIP archive.`,
    });
  } else {
    bank.push({
      q: `Can I crop or resize my ${from} image while converting to ${to}?`,
      a: `Yes. Click "Crop Studio" or "Scale & Resize" on any dropped ${from} card to apply aspect ratios (1:1, 4:5, 16:9) or exact pixel dimensions (like 413×531 px passport size) before exporting as ${to}.`,
    });
  }

  bank.push(
    {
      q: `Are my ${from} files uploaded to any external server?`,
      a: `Never. PixelKit processes ${from} to ${to} 100% locally inside your browser using HTML5 Canvas and Web Workers. Confidential IDs, passports, and personal photos never leave your device.`,
    },
    {
      q: `Is this ${from} to ${to} tool completely free for batch files?`,
      a: `Yes. You can drop multiple ${from} files at once, convert them in parallel across CPU cores, and download individual ${to} files or a single ZIP with zero watermarks, paywalls, or signups.`,
    }
  );

  return bank;
}
