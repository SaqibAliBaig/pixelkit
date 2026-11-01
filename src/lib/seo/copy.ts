/**
 * Programmatic copy generators for tool pages.
 * Combines source-format mechanics, target-format benefits, portal KB context,
 * benchmark size expectations, and pitfall prevention so every route provides
 * genuinely distinct, helpful technical guidance compliant with Google's
 * Helpful Content System and anti-scaled-content policies.
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

const TARGET_FACTS: Record<string, string> = {
  jpg: 'Outputting to JPG ensures universal compatibility across all operating systems, consular visa systems, job recruitment portals, and print labs. Transparent input areas automatically receive a clean white background fill, and optional EXIF camera metadata preservation remains configurable.',
  png: 'Outputting to PNG guarantees pixel-perfect lossless reproduction, preserving sharp text typography, high-contrast borders, and complete 8-bit alpha-channel transparency for design assets, signatures, and UI elements.',
  webp: 'Outputting to WebP provides cutting-edge predictive compression that shrinks file weight by 25% to 45% relative to JPEG while maintaining transparent alpha channels, directly accelerating page load speeds and boosting Core Web Vitals.',
  avif: 'Outputting to AVIF harnesses state-of-the-art AV1 compression algorithms to generate the smallest possible byte footprints on modern browsers without visible banding or compression artifacts.',
  pdf: 'Outputting to PDF bundles one or multiple images into standardized, printable document packages. Users can reorder pages by dragging, adjust page margins, and produce compact document submissions accepted by banking, tax, and government agencies.',
  svg: 'Outputting to SVG encapsulates your graphic in an XML-based vector wrapper, allowing smooth resolution scaling from 96 DPI up to 600 DPI across responsive layouts.',
};

const PAIR_INSIGHTS: Record<string, string> = {
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

const SIZE_PORTAL_DETAILS: Record<number, { title: string; useCase: string; pitfall: string }> = {
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

export function buildIntro(combo: ComboForMeta): string {
  const fromKey = combo.from.toLowerCase();
  const toKey = combo.to.toLowerCase();
  const from = fmt(combo.from);
  const to = fmt(combo.to);
  const pairKey = `${fromKey}>${toKey}`;

  // 1. Technical Format Transition Mechanics
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

  // 2. Real-World Constraints, Benchmark Sizes & Portal Requirements
  let p2 = '';
  if (combo.sizeKb) {
    const sizeData = SIZE_PORTAL_DETAILS[combo.sizeKb] ?? {
      title: `${combo.sizeKb}KB Target Limit`,
      useCase: `Meeting an exact ${combo.sizeKb}KB ceiling ensures strict compliance with automated portal upload validators.`,
      pitfall: `Always verify dimension guidelines alongside byte limits to ensure crisp output resolution.`,
    };

    p2 = `To meet ${sizeData.title}, PixelKit runs an automated binary-search compression algorithm inside client-side Web Workers. Rather than forcing you to guess quality percentages through trial and error, the encoder tests multiple quantization matrices within milliseconds to land your ${to} file safely under ${combo.sizeKb}KB while preserving maximum visual sharpness. ${sizeData.useCase} ${sizeData.pitfall}`;
  } else {
    p2 = `Beyond raw format conversion, PixelKit integrates an interactive Crop Studio and Scale & Resize Engine directly into the transformation pipeline. Before downloading your ${to} file, you can frame official aspect ratios (such as 1:1 square for visas, 3:4 for passport ID, or 16:9 widescreen), configure exact pixel dimensions (such as 413×531 px or 1920×1080 px), rotate orientations, and verify image clarity with the live Before/After comparison slider.`;
  }

  // 3. Client-Side Browser Engine & Zero-Upload Privacy
  const p3 = `Every conversion step executes 100% locally on your computer, smartphone, or tablet using HTML5 Canvas, WebAssembly, and isolated background Web Workers. Your ${from} files are never transmitted to cloud servers, stored in remote databases, or logged on external disks. This architectural approach guarantees complete data privacy for biometric passport photos, confidential tax records, Aadhaar cards, and private snapshots, while providing full offline PWA support and zero daily usage restrictions.`;

  return [p1, p2, p3].join('\n\n');
}

export function buildFaqs(combo: ComboForMeta): FAQItem[] {
  const fromKey = combo.from.toLowerCase();
  const toKey = combo.to.toLowerCase();
  const from = fmt(combo.from);
  const to = fmt(combo.to);

  const bank: FAQItem[] = [];

  // 1. Size-targeted or format-conversion FAQ
  if (combo.sizeKb) {
    const sizeData = SIZE_PORTAL_DETAILS[combo.sizeKb];
    bank.push({
      q: `How do I compress and convert ${from} to ${to} under ${combo.sizeKb}KB?`,
      a: `Drop your ${from} file into PixelKit above—${to} and the ${combo.sizeKb}KB ceiling are pre-configured. PixelKit executes an automated binary-search compression routine in your browser memory to land your file just underneath ${combo.sizeKb}KB without manual slider guesswork. ${sizeData ? sizeData.pitfall : ''}`,
    });
  } else {
    bank.push({
      q: `How do I convert ${from} to ${to} in my web browser?`,
      a: `Simply drag and drop your ${from} file into the converter box above, verify ${to} is selected as the output format, and click "Convert Image Now". Your new ${to} file is decoded and re-encoded locally in browser memory and ready for immediate download.`,
    });
  }

  // 2. Format-specific technical nuance FAQ
  if (toKey === 'pdf') {
    bank.push({
      q: `Can I merge multiple ${from} files into a single multi-page PDF document?`,
      a: `Yes! You can drop multiple ${from} images simultaneously, drag cards to arrange the exact page sequence, and check "Merge Files into Single PDF". PixelKit compiles all pages into a single organized PDF document${combo.sizeKb ? ` optimized toward your ${combo.sizeKb}KB budget` : ''}.`,
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

  // 3. Portal rejection / quality FAQ
  if (combo.sizeKb) {
    bank.push({
      q: `Why was my ${to} photo rejected by an online portal even when under ${combo.sizeKb}KB?`,
      a: `Portals often enforce strict pixel dimension or aspect ratio rules alongside file weight (for instance, 350×450 px or 600×600 px). If your file is rejected, check the portal guidelines and use PixelKit's Scale & Resize Studio to set the exact required pixel dimensions before compressing.`,
    });
  } else {
    bank.push({
      q: `Will converting ${from} to ${to} reduce my image quality?`,
      a: `PixelKit employs high-precision color subsampling and adaptive quantization to maximize visual fidelity. Where mathematically possible (such as lossless PNG or WebP modes), the conversion is 100% lossless. For lossy formats, structural similarity algorithms preserve clean text edges and realistic skin tones.`,
    });
  }

  // 4. Privacy & Client-Side Execution FAQ
  bank.push({
    q: `Are my ${from} files uploaded to any remote server or cloud database?`,
    a: `No—never. All decoding, resizing, quantization, and encoding operations execute strictly inside your local browser sandbox via WebAssembly and Web Workers. Confidential documents, biometric passport photos, and sensitive IDs never leave your computer or mobile device.`,
  });

  return bank;
}

export interface FormatComparisonRow {
  property: string;
  sourceValue: string;
  targetValue: string;
}

export interface TechnicalReferenceData {
  engineNote: string;
  comparisonRows: FormatComparisonRow[];
}

interface RawFormatSpec {
  name: string;
  mime: string;
  compressionType: string;
  alphaTransparency: string;
  typicalCompressionRatio: string;
  colorSpace: string;
  engine: string;
}

const FORMAT_TECHNICAL_SPECS: Record<string, RawFormatSpec> = {
  jpg: {
    name: 'JPEG (Joint Photographic Experts Group)',
    mime: 'image/jpeg',
    compressionType: 'Lossy Discrete Cosine Transform (DCT) with quantization',
    alphaTransparency: 'No (Opaque; transparent layers filled with white canvas)',
    typicalCompressionRatio: '10%–25% of uncompressed raw bitmap (75%–90% reduction)',
    colorSpace: '24-bit sRGB (YCbCr chroma subsampling 4:2:0)',
    engine: 'Hardware-accelerated browser Canvas 2D JPEG encoder with Web Workers',
  },
  png: {
    name: 'PNG (Portable Network Graphics)',
    mime: 'image/png',
    compressionType: 'Lossless 2D predictive filter + DEFLATE byte-stream (UPNG.js)',
    alphaTransparency: 'Supported (Full 8-bit alpha transparency channel)',
    typicalCompressionRatio: '100% pixel-perfect baseline (lossless RGBA array)',
    colorSpace: '32-bit RGBA (sRGB true color)',
    engine: 'HTML5 Canvas API + UPNG.js lossless quantization engine',
  },
  webp: {
    name: 'WebP Image Container',
    mime: 'image/webp',
    compressionType: 'Lossy VP8 predictive intra-frame or lossless VP8L',
    alphaTransparency: 'Supported (Full 8-bit alpha channel supported)',
    typicalCompressionRatio: '25%–35% smaller than JPEG at equal visual clarity',
    colorSpace: '24-bit sRGB / 32-bit RGBA',
    engine: 'Native browser WebP encoding engine via Canvas API',
  },
  avif: {
    name: 'AVIF (AV1 Image File Format)',
    mime: 'image/avif',
    compressionType: 'Lossy & lossless AV1 intra-frame video codec',
    alphaTransparency: 'Supported (Full 8-bit alpha transparency channel)',
    typicalCompressionRatio: '40%–50% smaller than JPEG at equivalent structural fidelity',
    colorSpace: '10-bit / 12-bit HDR wide color gamut & 8-bit sRGB',
    engine: 'Native browser AV1 Canvas encoder in background threads',
  },
  heic: {
    name: 'HEIC (High Efficiency Image Container)',
    mime: 'image/heic',
    compressionType: 'High Efficiency Video Coding (HEVC / H.265 intra-frame)',
    alphaTransparency: 'Supported (Alpha channels and depth map layers)',
    typicalCompressionRatio: '40%–50% smaller byte footprint than standard JPEG',
    colorSpace: '10-bit / 16-bit Apple Wide Color (Display P3) & sRGB',
    engine: 'WebAssembly libheif v1.17 intra-frame decoder',
  },
  svg: {
    name: 'SVG (Scalable Vector Graphics)',
    mime: 'image/svg+xml',
    compressionType: 'Resolution-independent XML vector mathematical paths',
    alphaTransparency: 'Supported (Full vector layer transparency)',
    typicalCompressionRatio: 'Resolution-independent scalable vector coordinates',
    colorSpace: 'CSS sRGB vector color gamut',
    engine: 'DOMParser XML vector renderer & off-screen Canvas rasterizer',
  },
  pdf: {
    name: 'PDF (Portable Document Format)',
    mime: 'application/pdf',
    compressionType: 'PostScript stream / Flate / JPEG embedded stream',
    alphaTransparency: 'Opaque document pages with embedded raster transparency',
    typicalCompressionRatio: 'Document wrapper (depends on embedded image compression)',
    colorSpace: 'sRGB / DeviceRGB / CMYK document profile',
    engine: 'jsPDF v2.5 document builder & Mozilla PDF.js v4.x worker',
  },
  tiff: {
    name: 'TIFF (Tagged Image File Format)',
    mime: 'image/tiff',
    compressionType: 'Uncompressed raster bitmap or LZW / ZIP lossless',
    alphaTransparency: 'Supported (Multi-channel alpha layers)',
    typicalCompressionRatio: 'Heavy uncompressed baseline (often 10×–20× heavier than JPEG)',
    colorSpace: '8-bit / 16-bit sRGB, Adobe RGB, CMYK',
    engine: 'UTIF.js WebAssembly & pure TypeScript TIFF decoder',
  },
  bmp: {
    name: 'BMP (Windows Bitmap)',
    mime: 'image/bmp',
    compressionType: 'Raw uncompressed RGB raster pixel array',
    alphaTransparency: 'Basic 1-bit or none (uncompressed 24-bit RGB)',
    typicalCompressionRatio: '100% uncompressed raw pixel payload (maximum byte weight)',
    colorSpace: '24-bit RGB',
    engine: 'Native Canvas 2D image bitmap decoder',
  },
  gif: {
    name: 'GIF (Graphics Interchange Format)',
    mime: 'image/gif',
    compressionType: 'LZW 8-bit indexed palette compression (max 256 colors)',
    alphaTransparency: 'Supported (1-bit binary on/off transparency mask)',
    typicalCompressionRatio: 'Palette-indexed (limited 256-color reproduction)',
    colorSpace: '8-bit indexed palette',
    engine: 'Native Canvas 2D frame parser & decoder',
  },
};

export function getTechnicalReference(combo: ComboForMeta): TechnicalReferenceData {
  const fromKey = combo.from.toLowerCase();
  const toKey = combo.to.toLowerCase();
  const from = fmt(combo.from);
  const to = fmt(combo.to);

  const src = FORMAT_TECHNICAL_SPECS[fromKey] || {
    name: from,
    mime: `image/${fromKey}`,
    compressionType: 'Standard raster container',
    alphaTransparency: 'Container dependent',
    typicalCompressionRatio: 'Standard baseline',
    colorSpace: 'sRGB',
    engine: 'Native browser image decoder',
  };

  const tgt = FORMAT_TECHNICAL_SPECS[toKey] || {
    name: to,
    mime: `image/${toKey}`,
    compressionType: 'Standard raster container',
    alphaTransparency: 'Container dependent',
    typicalCompressionRatio: 'Standard baseline',
    colorSpace: 'sRGB',
    engine: 'Native browser image encoder',
  };

  // Dynamic Alpha Transparency Behavior
  let alphaTarget = tgt.alphaTransparency;
  if (toKey === 'jpg') {
    alphaTarget = fromKey === 'png' || fromKey === 'svg' || fromKey === 'webp' || fromKey === 'heic'
      ? 'Replaced with solid white background canvas (JPG lacks alpha)'
      : 'No (JPG does not support alpha transparency)';
  } else if (toKey === 'png' || toKey === 'webp' || toKey === 'avif') {
    alphaTarget = 'Full 8-bit alpha transparency channel preserved';
  }

  // Dynamic Relative Compression Ratio
  let ratioTarget = tgt.typicalCompressionRatio;
  if (combo.sizeKb) {
    ratioTarget = `Targeted under ${combo.sizeKb}KB via iterative binary search`;
  } else if (toKey === 'jpg') {
    ratioTarget = '70%–85% reduction vs uncompressed bitmap (DCT quantized)';
  } else if (toKey === 'webp') {
    ratioTarget = '25%–35% smaller than JPEG at equal visual clarity';
  } else if (toKey === 'avif') {
    ratioTarget = '40%–50% smaller than JPEG with minimal edge ringing';
  } else if (toKey === 'pdf') {
    ratioTarget = 'Packaged into standardized, printable single or multi-page PDF';
  } else if (toKey === 'png') {
    ratioTarget = '100% lossless pixel reconstruction (DEFLATE compressed)';
  }

  // Engine & Privacy Note
  let engineNote = '';
  if (fromKey === 'heic') {
    engineNote = `Decoded locally using WebAssembly libheif v1.17, color-corrected to sRGB, and encoded to ${to} via HTML5 Canvas API in a background Web Worker without cloud upload.`;
  } else if (fromKey === 'pdf') {
    engineNote = `Decoded locally using Mozilla PDF.js v4.x in an isolated Web Worker, rasterized to Canvas, and exported to ${to} without transmitting any document bytes to a server.`;
  } else if (fromKey === 'svg') {
    engineNote = `Parsed locally via DOMParser XML vector engine, rasterized onto an off-screen HTML5 Canvas at selected DPI (96–600 DPI), and encoded to ${to} with 100% client-side privacy.`;
  } else if (fromKey === 'tiff') {
    engineNote = `Decoded locally using UTIF.js in a background Web Worker, converted to an RGBA pixel buffer, and re-encoded to ${to} via browser Canvas API without server upload.`;
  } else if (toKey === 'pdf') {
    engineNote = `Decoded locally in browser memory, iteratively quantized to your size target in Web Workers, and compiled into a valid PDF document stream using jsPDF v2.5 with zero cloud uploads.`;
  } else {
    engineNote = `Decoded locally in browser memory using HTML5 Canvas API and WebAssembly, processed via background Web Workers, and saved directly to your device with zero cloud uploads.`;
  }

  const comparisonRows: FormatComparisonRow[] = [
    {
      property: 'Compression Type',
      sourceValue: src.compressionType,
      targetValue: tgt.compressionType,
    },
    {
      property: 'Alpha Transparency',
      sourceValue: src.alphaTransparency,
      targetValue: alphaTarget,
    },
    {
      property: 'Typical Compression Ratio',
      sourceValue: src.typicalCompressionRatio,
      targetValue: ratioTarget,
    },
    {
      property: 'Color Space Support',
      sourceValue: src.colorSpace,
      targetValue: tgt.colorSpace,
    },
    {
      property: 'Execution Engine',
      sourceValue: src.engine,
      targetValue: tgt.engine,
    },
  ];

  return {
    engineNote,
    comparisonRows,
  };
}
