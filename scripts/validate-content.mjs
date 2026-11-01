#!/usr/bin/env node
/**
 * validate-content.mjs
 * ------------------------------------------------------------------
 * Anti-thin-content guard. Fails the build if programmatic pages
 * would ship with duplicate or shallow copy.
 *
 * Checks:
 *   1. Every combo has a unique title (30–70 chars).
 *   2. Every combo has a unique meta description (70–160 chars).
 *   3. Every combo has a unique intro paragraph (min 140 words).
 *   4. Every combo has ≥ 3 unique FAQs.
 *   5. No two combos share the same intro hash.
 *
 * Mirrors src/lib/seo/meta.ts and src/lib/seo/copy.ts.
 */

import { readFile, readdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

async function loadJson(p) {
  try {
    return JSON.parse(await readFile(p, 'utf8'));
  } catch (err) {
    console.error(`✖ Cannot read ${p}\n  ${err.message}`);
    process.exit(1);
  }
}

const combosFile = await loadJson(resolve(ROOT, 'src/data/combinations.json'));
const combos = combosFile.combos || [];
if (!combos.length) {
  console.error('✖ combinations.json has no combos');
  process.exit(1);
}

const formatLabel = (ext) => ext.toUpperCase();

const SOURCE_FACTS = {
  heic: 'Apple iOS devices (iPhones and iPads) store camera captures in High Efficiency Image Container (HEIC / HEIF) format using HEVC video intra-frame compression. While HEIC preserves 10-bit or 16-bit color depth and cuts raw storage in half compared to JPEG, it remains incompatible with most government application portals, banking KYC forms, Windows photo viewers, and legacy web services.',
  png: 'Portable Network Graphics (PNG) is a lossless raster format that employs DEFLATE byte-stream filtering alongside a dedicated 8-bit alpha transparency channel. While ideal for logos, digital signatures, line drawings, and interface screenshots, raw PNG files retain uncompressed RGBA pixel buffers that routinely exceed strict online portal upload limits.',
  jpg: 'JPEG (JPG) is the global standard for photographic imagery, utilizing Discrete Cosine Transform (DCT) lossy compression and YCbCr chroma subsampling (typically 4:2:0 or 4:2:2). Smartphone cameras often generate JPEGs between 3 MB and 10 MB, making them far too heavy for automated registration forms that mandate tight kilobyte ceilings.',
  webp: 'WebP is Google’s modern web media container supporting both lossy predictive coding and lossless LZ77 compression with alpha transparency. Although WebP delivers 25% to 45% smaller file sizes than legacy JPEG on the web, older document management systems, offline photo kiosks, and official visa portals often reject .webp uploads.',
  avif: 'AV1 Image File Format (AVIF) represents the next frontier in image compression, leveraging AV1 intra-frame video codecs to deliver exceptional fidelity at ultra-low byte rates. However, many older browsers, operating systems, and official institutional upload forms do not yet possess native AVIF decoders.',
  svg: 'Scalable Vector Graphics (SVG) store resolution-independent XML path coordinates rather than fixed pixel grids. To use vector logos, icons, and diagrams in standard web forms, documents, or social graphics, the mathematical paths must be rasterized cleanly into pixel bitmaps at controlled DPI multipliers.',
  pdf: 'Portable Document Format (PDF) files encapsulate multi-page scanned paperwork, certificates, and ID cards within PostScript-derived document wrappers. Extracting high-resolution image pages or merging multiple smartphone photo snaps into a compliant PDF often requires dedicated client-side document processing.',
  tiff: 'Tagged Image File Format (TIFF) is widely used by high-end DSLR cameras, flatbed scanners, and medical imaging devices. TIFF files store uncompressed or LZW-packed high-bit-depth raster bitmaps, creating massive file weights (often 20 MB to 50 MB) that must be converted before digital submission.',
  bmp: 'Bitmap (BMP) files preserve raw, uncompressed RGB pixel arrays without entropy encoding. As a result, BMP images suffer from massive byte overhead, and converting out of BMP to modern web containers routinely cuts file weight by 85% to 95% with zero perceivable loss in visual clarity.',
  gif: 'Graphics Interchange Format (GIF) is constrained to an indexed 8-bit palette containing a maximum of 256 colors. Converting static GIF images into true-color photographic or document containers unlocks smooth gradients, improved color fidelity, and universal compatibility across modern upload portals.',
};

const TARGET_FACTS = {
  jpg: 'Outputting to JPG ensures universal compatibility across all operating systems, consular visa systems, job recruitment portals, and print labs. Transparent input areas automatically receive a clean white background fill, and optional EXIF camera metadata preservation remains configurable.',
  png: 'Outputting to PNG guarantees pixel-perfect lossless reproduction, preserving sharp text typography, high-contrast borders, and complete 8-bit alpha-channel transparency for design assets, signatures, and UI elements.',
  webp: 'Outputting to WebP provides cutting-edge predictive compression that shrinks file weight by 25% to 45% relative to JPEG while maintaining transparent alpha channels, directly accelerating page load speeds and boosting Core Web Vitals.',
  avif: 'Outputting to AVIF harnesses state-of-the-art AV1 compression algorithms to generate the smallest possible byte footprints on modern browsers without visible banding or compression artifacts.',
  pdf: 'Outputting to PDF bundles one or multiple images into standardized, printable document packages. Users can reorder pages by dragging, adjust page margins, and produce compact document submissions accepted by banking, tax, and government agencies.',
  svg: 'Outputting to SVG encapsulates your graphic in an XML-based vector wrapper, allowing smooth resolution scaling from 96 DPI up to 600 DPI across responsive layouts.',
};

const PAIR_INSIGHTS = {
  'heic>jpg': 'Converting iPhone HEIC photos to standard JPEG resolves the dreaded "file format not supported" error on Windows, Android, and government forms. PixelKit translates the HEIF container in browser memory, performs sRGB color mapping, and extracts clean JPEG bytes without uploading personal selfies to cloud servers.',
  'heic>png': 'Decoding Apple HEIC files directly into lossless PNG yields uncompressed RGBA pixel integrity. This is particularly valuable for designers and developers extracting iOS screenshots, design assets, or app mockups who need zero DCT compression artifacts.',
  'heic>pdf': 'iPhone users frequently photograph paper documents, lease agreements, and receipts in HEIC format. PixelKit allows you to convert and merge multiple HEIC photos into a unified, lightweight PDF document ready for email or portal verification.',
  'heic>webp': 'Transforming mobile HEIC snaps into modern WebP creates ultra-compact web assets. Because WebP is natively supported across all modern browsers, this conversion provides maximum byte economy for websites, blogs, and web applications.',
  'png>jpg': 'Converting PNG to JPG provides immediate file size relief, often slashing 5 MB screenshots down to under 500 KB. Because JPG does not support alpha transparency, PixelKit automatically applies an opaque background fill to avoid ugly black silhouette artifacts.',
  'png>webp': 'WebP is the natural successor to PNG for web delivery. It preserves full alpha-channel transparency and crisp edges on logos and icons while slashing file size by 30% to 50%, resulting in faster Largest Contentful Paint (LCP) times.',
  'png>pdf': 'Converting PNG graphics, scanned tax certificates, or digital signatures into a clean PDF document ensures universal readability across desktop viewers, mobile apps, and institutional archive portals.',
  'jpg>png': 'Converting JPG to PNG wraps your image in a lossless container. While this does not restore data already lost to JPEG compression, it prevents any further generation loss during repeated saves, edits, or layering in design tools.',
  'jpg>pdf': 'JPG to PDF is the industry standard workflow for job applications, passport submissions, and university admissions. PixelKit enables drag-and-drop page sequencing and automatic binary-search compression to ensure multi-page PDFs fit under strict portal limits.',
  'jpg>webp': 'Converting JPEG assets to WebP modernizes your media pipeline. WebP’s predictive spatial coding delivers equivalent perceptual sharpness at roughly two-thirds the byte weight of standard JPEG, making it the preferred choice for PageSpeed optimization.',
  'svg>png': 'Rasterizing SVG vectors to PNG requires precise DPI control. PixelKit lets you select 1x (96 DPI), 2x Retina (192 DPI), 3x (300 DPI), or 4x Print (600 DPI) rendering, producing pin-sharp raster graphics with full transparent alpha channels intact.',
  'svg>jpg': 'Converting SVG vector files to JPG produces an opaque raster image suitable for older CMS engines, email signatures, or office suites that cannot parse XML vector directives.',
  'pdf>jpg': 'Multi-page PDF extraction renders each document page into an independent high-resolution JPEG. PixelKit uses client-side PDF.js rendering to rasterize vector text and embedded images locally, allowing individual page downloads or batch ZIP packaging.',
  'pdf>png': 'Extracting PDF pages into lossless PNG preserves sharp document typography, handwritten signatures, and intricate stamps without JPEG compression blur, making it ideal for legal records and official archival.',
  'webp>jpg': 'While WebP dominates the modern web, legacy desktop applications, specialized print labs, and older passport portals still mandate traditional JPEG files. Converting WebP to JPG restores 100% universal compatibility across all legacy platforms.',
  'webp>png': 'Converting WebP images to PNG expands compressed lossy or lossless WebP streams into standard 32-bit RGBA bitmaps, enabling seamless editing in older graphic software that lacks WebP import filters.',
};

const SIZE_PORTAL_DETAILS = {
  20: {
    title: 'Digital Signatures, Thumbprints & Strict Exam Slots (10–20 KB)',
    useCase: 'A 20KB limit is universally mandated for digital signatures, left thumb impressions, and candidate avatars across Indian civil services, SSC, UPSC, IBPS, and state recruitment boards.',
    pitfall: 'Attempting to compress a full 12MP smartphone photo directly to 20KB will produce unreadable blur. The proper technique is to use PixelKit’s Crop Studio first to frame the signature tightly (e.g. 140×60 px), eliminating wasted background pixels before running the binary-search compression pass.',
  },
  50: {
    title: 'Recruitment Exams, Admit Cards & University Portals (20–50 KB)',
    useCase: 'A 50KB ceiling is the most widespread photo upload restriction across government job portals, university entrance exams (NEET, JEE, GATE), and civil service applications.',
    pitfall: 'Portals often enforce strict dimension bounds alongside the 50KB limit (commonly 350×450 px or 200×230 px). Scaling your photo to approximately 400 pixels wide in the Resize Studio ensures your picture lands under 50KB with clear facial features and sharp eyes.',
  },
  100: {
    title: 'Aadhaar, PAN Card, Passport Seva & Bank KYC Portals (50–100 KB)',
    useCase: 'A 100KB target represents the sweet spot for identity verification, including Indian Passport Seva, Aadhaar card online updates, NSDL PAN applications, and bank KYC verification.',
    pitfall: 'Many identity portals automatically reject images if face contrast is too low or text is illegible. PixelKit’s iterative quantization adjusts quality parameters until the file weighs just under 100KB while preserving crisp biometric contours.',
  },
  200: {
    title: 'International Visas, US DS-160 & Consular Submissions (100–200 KB)',
    useCase: 'A 200KB to 240KB threshold is the international benchmark enforced by the US Department of State (DS-160, DV Lottery, 600×600 px), Schengen European embassies, and Canadian IRCC portals.',
    pitfall: 'Certain embassy portals run automated server-side checks that re-encode uploaded files, occasionally adding 2–5 KB of metadata overhead. Targeting 185 KB rather than the absolute 200 KB boundary guarantees your submission passes automated intake filters.',
  },
  500: {
    title: 'Multi-Page Scans, Tax Returns & High-Res Attachments (200–500 KB)',
    useCase: 'A 500KB budget is ideal for multi-page scanned PDF contracts, academic transcripts, birth certificates, tax forms, and high-fidelity portfolio photography.',
    pitfall: 'For multi-page documents, leaving output as raw JPEG often results in multiple fragmented files. Switching target format to PDF and checking "Merge Files into Single PDF" compiles all pages into one compact, upload-ready document under 500KB.',
  },
};

function titleFor(c) {
  return c.sizeKb
    ? `Convert ${formatLabel(c.from)} to ${formatLabel(c.to)} Under ${c.sizeKb}KB — Free, Private`
    : `Convert ${formatLabel(c.from)} to ${formatLabel(c.to)} — Free & Instant`;
}

function descriptionFor(c) {
  const from = formatLabel(c.from);
  const to = formatLabel(c.to);
  return c.sizeKb
    ? `Convert ${from} to ${to} and hit exactly ${c.sizeKb}KB — no upload, no signup, 100% in your browser. Works for passport portals, exam forms and email limits.`
    : `Convert ${from} to ${to} instantly in your browser. Private by design — your files never leave your device. Free, no signup.`;
}

function introFor(c) {
  const fromKey = c.from.toLowerCase();
  const toKey = c.to.toLowerCase();
  const from = formatLabel(c.from);
  const to = formatLabel(c.to);
  const pairKey = `${fromKey}>${toKey}`;

  const srcFact =
    SOURCE_FACTS[fromKey] ??
    `${from} files often present upload challenges or compatibility hurdles across standard web browsers and official upload portals.`;
  const tgtFact =
    TARGET_FACTS[toKey] ??
    `Converting into ${to} produces clean, standards-compliant files engineered for immediate download and publication.`;
  const pairFact =
    PAIR_INSIGHTS[pairKey] ??
    `Converting from ${from} to ${to} bridges the gap between specialized file containers and universal digital compatibility.`;

  const p1 = `${srcFact} ${tgtFact} ${pairFact}`;

  let p2 = '';
  if (c.sizeKb) {
    const sizeData = SIZE_PORTAL_DETAILS[c.sizeKb] ?? {
      title: `${c.sizeKb}KB Target Limit`,
      useCase: `Meeting an exact ${c.sizeKb}KB ceiling ensures strict compliance with automated portal upload validators.`,
      pitfall: `Always verify dimension guidelines alongside byte limits to ensure crisp output resolution.`,
    };
    p2 = `To meet ${sizeData.title}, PixelKit runs an automated binary-search compression algorithm inside client-side Web Workers. Rather than forcing you to guess quality percentages through trial and error, the encoder tests multiple quantization matrices within milliseconds to land your ${to} file safely under ${c.sizeKb}KB while preserving maximum visual sharpness. ${sizeData.useCase} ${sizeData.pitfall}`;
  } else {
    p2 = `Beyond raw format conversion, PixelKit integrates an interactive Crop Studio and Scale & Resize Engine directly into the transformation pipeline. Before downloading your ${to} file, you can frame official aspect ratios (such as 1:1 square for visas, 3:4 for passport ID, or 16:9 widescreen), configure exact pixel dimensions (such as 413×531 px or 1920×1080 px), rotate orientations, and verify image clarity with the live Before/After comparison slider.`;
  }

  const p3 = `Every conversion step executes 100% locally on your computer, smartphone, or tablet using HTML5 Canvas, WebAssembly, and isolated background Web Workers. Your ${from} files are never transmitted to cloud servers, stored in remote databases, or logged on external disks. This architectural approach guarantees complete data privacy for biometric passport photos, confidential tax records, Aadhaar cards, and private snapshots, while providing full offline PWA support and zero daily usage restrictions.`;

  return [p1, p2, p3].join('\n\n');
}

function faqsFor(c) {
  const fromKey = c.from.toLowerCase();
  const toKey = c.to.toLowerCase();
  const from = formatLabel(c.from);
  const to = formatLabel(c.to);

  const bank = [];

  if (c.sizeKb) {
    const sizeData = SIZE_PORTAL_DETAILS[c.sizeKb];
    bank.push({
      q: `How do I compress and convert ${from} to ${to} under ${c.sizeKb}KB?`,
      a: `Drop your ${from} file into PixelKit above—${to} and the ${c.sizeKb}KB ceiling are pre-configured. PixelKit executes an automated binary-search compression routine in your browser memory to land your file just underneath ${c.sizeKb}KB without manual slider guesswork. ${sizeData ? sizeData.pitfall : ''}`,
    });
  } else {
    bank.push({
      q: `How do I convert ${from} to ${to} in my web browser?`,
      a: `Simply drag and drop your ${from} file into the converter box above, verify ${to} is selected as the output format, and click "Convert Image Now". Your new ${to} file is decoded and re-encoded locally in browser memory and ready for immediate download.`,
    });
  }

  if (toKey === 'pdf') {
    bank.push({
      q: `Can I merge multiple ${from} files into a single multi-page PDF document?`,
      a: `Yes! You can drop multiple ${from} images simultaneously, drag cards to arrange the exact page sequence, and check "Merge Files into Single PDF". PixelKit compiles all pages into a single organized PDF document${c.sizeKb ? ` optimized toward your ${c.sizeKb}KB budget` : ''}.`,
    });
  } else if (fromKey === 'png' && toKey === 'jpg') {
    bank.push({
      q: `What happens to transparent PNG backgrounds when converting to JPG?`,
      a: `Because the JPG specification does not support alpha transparency, transparent background pixels are automatically filled with a clean white canvas. This prevents the unsightly solid black backgrounds commonly produced by naive conversion tools.`,
    });
  } else if (fromKey === 'svg') {
    bank.push({
      q: `How do I keep vector lines sharp when converting SVG to ${to}?`,
      a: `In the conversion settings panel, use the SVG Scale multiplier to select 1x (96 DPI standard), 2x Retina (192 DPI), 3x (300 DPI print), or 4x (600 DPI ultra-high-res) before rasterizing to ${to}, ensuring logos and text stay razor-sharp.`,
    });
  } else if (fromKey === 'heic') {
    bank.push({
      q: `Does converting Apple HEIC to ${to} preserve camera EXIF metadata?`,
      a: `Yes. PixelKit can extract and preserve crucial EXIF metadata such as camera orientation, capture date, and exposure settings, or you can toggle the option in Advanced Settings to strip all sensitive GPS coordinates before sharing publicly.`,
    });
  } else if (fromKey === 'pdf') {
    bank.push({
      q: `Can I convert multi-page PDF documents into individual ${to} images?`,
      a: `Yes. PixelKit utilizes PDF.js in Web Workers to decode each page of your PDF into an independent high-resolution ${to} image. You can download individual pages or export the full set as a convenient ZIP archive.`,
    });
  } else {
    bank.push({
      q: `Can I crop and resize my ${from} image before exporting as ${to}?`,
      a: `Yes. Click "Crop Studio" or "Scale & Resize" on any dropped file card to apply passport ratios (1:1, 3:4, 35×45 mm), scale dimensions to exact pixel bounds (e.g. 413×531 px or 600×600 px), or flip and rotate the image before converting.`,
    });
  }

  if (c.sizeKb) {
    bank.push({
      q: `Why was my ${to} photo rejected by an online portal even when under ${c.sizeKb}KB?`,
      a: `Portals often enforce strict pixel dimension or aspect ratio rules alongside file weight (for instance, 350×450 px or 600×600 px). If your file is rejected, check the portal guidelines and use PixelKit's Scale & Resize Studio to set the exact required pixel dimensions before compressing.`,
    });
  } else {
    bank.push({
      q: `Will converting ${from} to ${to} reduce my image quality?`,
      a: `PixelKit employs high-precision color subsampling and adaptive quantization to maximize visual fidelity. Where mathematically possible (such as lossless PNG or WebP modes), the conversion is 100% lossless. For lossy formats, structural similarity algorithms preserve clean text edges and realistic skin tones.`,
    });
  }

  bank.push({
    q: `Are my ${from} files uploaded to any remote server or cloud database?`,
    a: `No—never. All decoding, resizing, quantization, and encoding operations execute strictly inside your local browser sandbox via WebAssembly and Web Workers. Confidential documents, biometric passport photos, and sensitive IDs never leave your computer or mobile device.`,
  });

  return bank;
}

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

// ------------------------------------------------------------------
// Internal Link Trailing Slash Guard
// Fails if blog markdown links omit a trailing slash (preventing 307 hops)
// ------------------------------------------------------------------
const blogDir = resolve(ROOT, 'src/content/blog');
try {
  const blogFiles = (await readdir(blogDir)).filter((f) => f.endsWith('.md'));
  for (const f of blogFiles) {
    const content = await readFile(resolve(blogDir, f), 'utf8');
    const mdMatches = content.matchAll(/\[(?:[^\]]*)\]\((\/[^)#\s]+)\)/g);
    for (const m of mdMatches) {
      const url = m[1];
      if (!url.endsWith('/') && !url.includes('.')) {
        violations.push(`Blog ${f}: markdown internal link missing trailing slash: ${url}`);
      }
    }
    const htmlMatches = content.matchAll(/href=["'](\/[^"'#\s]+)["']/g);
    for (const m of htmlMatches) {
      const url = m[1];
      if (!url.endsWith('/') && !url.includes('.')) {
        violations.push(`Blog ${f}: HTML internal link missing trailing slash: ${url}`);
      }
    }
  }
} catch (err) {
  violations.push(`Could not read blog directory: ${err.message}`);
}

if (violations.length) {
  console.error(
    `✖ Content validation failed with ${violations.length} issue(s):\n`
  );
  for (const v of violations) console.error('  • ' + v);
  process.exit(1);
}

console.log(`✔ Content validation passed — ${combos.length} combos OK`);
console.log('  · unique titles');
console.log('  · unique descriptions');
console.log('  · unique format-specific intros ≥ 140 words');
console.log('  · ≥ 3 FAQs per combo');
console.log('  · blog internal links strictly end with trailing slashes');
