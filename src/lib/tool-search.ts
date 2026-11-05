import { PORTAL_PRESETS } from './portal-presets';

export interface ToolSearchResult {
  title: string;
  subtitle: string;
  badge: string;
  href: string;
  category: 'compress' | 'convert' | 'resize' | 'crop' | 'preset' | 'dpi' | 'privacy';
  score: number;
}

interface CatalogEntry {
  title: string;
  subtitle: string;
  badge: string;
  href: string;
  category: ToolSearchResult['category'];
  keywords: string[];
}

const PRESET_HREFS: Record<string, string> = {
  'us-visa': '/us-visa-photo-resizer/',
  'in-passport': '/passport-photo-resizer/',
  'schengen-visa': '/schengen-visa-photo-resizer/',
  'uk-visa': '/uk-passport-photo-resizer/',
  'ca-visa': '/canada-visa-photo-resizer/',
  'au-visa': '/australia-passport-photo-resizer/',
  'cn-visa': '/china-visa-photo-resizer/',
  'jp-visa': '/japan-visa-photo-resizer/',
  'ae-visa': '/uae-visa-photo-resizer/',
  'sa-visa': '/saudi-visa-photo-resizer/',
  'sg-visa': '/singapore-visa-photo-resizer/',
  'my-visa': '/malaysia-passport-photo-resizer/',
  'nz-visa': '/new-zealand-visa-photo-resizer/',
  'exam-upsc': '/upsc-photo-resizer/',
  'exam-ssc': '/ssc-photo-resizer/',
  'exam-neet': '/neet-photo-resizer/',
  'exam-ibps': '/ibps-photo-signature-resizer/',
  'exam-sbi': '/sbi-po-photo-resizer/',
  'exam-gate': '/gate-photo-resizer/',
  'exam-rrb': '/rrb-photo-resizer/',
  signature: '/signature-resizer/',
  thumbprint: '/thumb-impression-resizer/',
  'pan-card': '/pan-card-photo-resizer/',
  'aadhaar-doc': '/aadhaar-pdf-compressor/',
  'social-yt-thumb': '/youtube-thumbnail-compressor-under-2mb/',
  'social-linkedin-banner': '/linkedin-banner-resizer/',
  'social-whatsapp-dp': '/whatsapp-dp-cropper/',
  'social-instagram-post': '/instagram-photo-resizer/',
  'social-twitter-header': '/twitter-header-resizer/',
  'social-facebook-cover': '/facebook-cover-photo-resizer/',
};

const STATIC_KB_PAGES = new Set([10, 15, 20, 30, 40, 50, 80, 100, 150, 200, 256, 300, 500]);
const STATIC_MB_PAGES = new Set([1, 2, 5, 10]);
const STATIC_PDF_KB_PAGES = new Set([50, 100, 200, 300, 500]);
const STATIC_DPI_PAGES = new Set([72, 150, 200, 300, 600]);
const COMBO_KB_SIZES = new Set([20, 50, 100, 200, 500]);

const VALID_INPUT_FORMATS = new Set([
  'jpg',
  'jpeg',
  'png',
  'webp',
  'heic',
  'avif',
  'gif',
  'bmp',
  'pdf',
  'svg',
  'tiff',
]);
const VALID_OUTPUT_FORMATS = new Set(['jpg', 'jpeg', 'png', 'webp', 'pdf', 'avif', 'svg']);

const CORE_CATALOG: CatalogEntry[] = [
  // Compressors
  {
    title: 'Compress Image Online',
    subtitle: 'Binary-search KB & MB image compressor',
    badge: 'COMPRESS',
    href: '/compress-image/',
    category: 'compress',
    keywords: ['compress', 'compressor', 'shrink image', 'reduce file size', 'optimize photo'],
  },
  {
    title: 'Compress Without Losing Quality',
    subtitle: 'SSIM > 0.98 perceptual lossless optimizer',
    badge: 'LOSSLESS',
    href: '/compress-image-without-losing-quality/',
    category: 'compress',
    keywords: ['without losing quality', 'lossless', 'high quality', 'no blur', 'perceptual'],
  },
  {
    title: 'Reduce Image Size in KB',
    subtitle: 'Shrink photos strictly under 20KB, 50KB, 100KB or 200KB',
    badge: 'MAX KB',
    href: '/reduce-image-size-in-kb/',
    category: 'compress',
    keywords: ['reduce size in kb', 'kb reducer', 'decrease kb', 'photo under kb'],
  },
  {
    title: 'Increase Image Size in KB',
    subtitle: 'Expand under-sized photos to meet minimum KB limits',
    badge: 'EXACT KB',
    href: '/increase-image-size-in-kb/',
    category: 'compress',
    keywords: ['increase size in kb', 'increase kb', 'expand kb', 'minimum kb', 'exact kb'],
  },
  {
    title: 'Increase Image Size to 20KB',
    subtitle: 'Expand tiny 5KB–15KB signatures & thumbprints to 20KB',
    badge: '20 KB EXACT',
    href: '/increase-image-size-to-20kb/',
    category: 'compress',
    keywords: ['increase to 20kb', 'exact 20kb', 'make 20kb'],
  },
  {
    title: 'Increase Image Size to 50KB',
    subtitle: 'Expand under-sized WhatsApp & studio portraits to 50KB',
    badge: '50 KB EXACT',
    href: '/increase-image-size-to-50kb/',
    category: 'compress',
    keywords: ['increase to 50kb', 'exact 50kb', 'make 50kb'],
  },
  {
    title: 'Increase Image Size to 100KB',
    subtitle: 'Calibrate lightweight scans & declarations to 100KB',
    badge: '100 KB EXACT',
    href: '/increase-image-size-to-100kb/',
    category: 'compress',
    keywords: ['increase to 100kb', 'exact 100kb', 'make 100kb'],
  },
  {
    title: 'Resize Image to 20KB to 50KB',
    subtitle: 'Strict 20–50KB bracket preset for SSC, UPSC & State PSC',
    badge: '20–50 KB',
    href: '/resize-image-to-20kb-to-50kb/',
    category: 'compress',
    keywords: ['20kb to 50kb', '20-50kb', 'between 20kb and 50kb'],
  },
  {
    title: 'Signature Resizer 10KB to 20KB',
    subtitle: 'Strict 10–20KB horizontal signature crop & compressor',
    badge: '10–20 KB',
    href: '/signature-resizer-10kb-to-20kb/',
    category: 'preset',
    keywords: ['10kb to 20kb', '10-20kb', 'signature 10kb 20kb'],
  },
  {
    title: 'JEE Main Photo & Signature Resizer',
    subtitle: 'NTA JEE Main 10KB–200KB photo & signature studio',
    badge: 'JEE MAIN',
    href: '/jee-main-photo-resizer/',
    category: 'preset',
    keywords: ['jee', 'jee main', 'jee advanced', 'nta jee'],
  },
  {
    title: 'CUET Photo & Signature Resizer',
    subtitle: 'NTA CUET UG/PG admission photo & signature resizer',
    badge: 'CUET NTA',
    href: '/cuet-photo-resizer/',
    category: 'preset',
    keywords: ['cuet', 'cuet ug', 'cuet pg'],
  },

  // Resize & Physical Units
  {
    title: 'Resize Image Studio',
    subtitle: 'Scale dimensions in pixels, cm, mm, or inches',
    badge: 'RESIZE',
    href: '/resize-image/',
    category: 'resize',
    keywords: ['resize', 'resizer', 'scale image', 'change dimensions'],
  },
  {
    title: 'Resize Image in Pixels',
    subtitle: 'Exact width × height pixel resampler with smart crop',
    badge: 'PIXELS',
    href: '/resize-image-in-pixels/',
    category: 'resize',
    keywords: ['resize in pixels', 'pixel resizer', 'width height px'],
  },
  {
    title: 'Image Resizer in CM',
    subtitle: '3.5 × 4.5 cm & custom centimeters at 300 DPI',
    badge: 'CM · 300 DPI',
    href: '/image-resizer-in-cm/',
    category: 'resize',
    keywords: ['resizer in cm', 'resize in cm', 'centimeter', 'cm resizer', '3.5x4.5 cm'],
  },
  {
    title: 'Image Resizer in MM',
    subtitle: '35 × 45 mm & custom millimeters at 300 DPI',
    badge: 'MM · 300 DPI',
    href: '/image-resizer-in-mm/',
    category: 'resize',
    keywords: ['resizer in mm', 'resize in mm', 'millimeter', 'mm resizer', '35x45 mm'],
  },
  {
    title: 'Image Resizer in Inches',
    subtitle: '2 × 2", 4 × 6" & custom inches at 300 DPI',
    badge: 'IN · 300 DPI',
    href: '/image-resizer-in-inches/',
    category: 'resize',
    keywords: ['resizer in inches', 'resize in inches', 'inch resizer', '2x2 inch', '4x6 inch'],
  },
  {
    title: 'Pixels to CM Converter',
    subtitle: 'Interactive px → cm calculator & photo resizer',
    badge: 'PX → CM',
    href: '/pixels-to-cm-converter/',
    category: 'resize',
    keywords: ['pixels to cm', 'px to cm', 'pixel to centimeter'],
  },
  {
    title: 'CM to Pixels at 300 DPI',
    subtitle: 'Interactive cm → px print calculator & resizer',
    badge: 'CM → PX',
    href: '/cm-to-pixels-at-300-dpi/',
    category: 'resize',
    keywords: ['cm to pixels', 'cm to px', 'centimeter to pixel'],
  },
  {
    title: 'MM to Pixels Converter',
    subtitle: 'Interactive mm → px calculator at 72–600 DPI',
    badge: 'MM → PX',
    href: '/mm-to-pixels-converter/',
    category: 'resize',
    keywords: ['mm to pixels', 'mm to px', 'millimeters to pixels'],
  },
  {
    title: 'Inches to Pixels Converter',
    subtitle: 'Interactive inches → px calculator at 72–600 DPI',
    badge: 'IN → PX',
    href: '/inches-to-pixels-converter/',
    category: 'resize',
    keywords: ['inches to pixels', 'in to px', 'inch to pixel'],
  },
  {
    title: 'Pixels to MM Converter',
    subtitle: 'Check millimeter print dimensions from pixels',
    badge: 'PX → MM',
    href: '/pixels-to-mm-converter/',
    category: 'resize',
    keywords: ['pixels to mm', 'px to mm', 'pixel to millimeter'],
  },
  {
    title: 'Pixels to Inches Converter',
    subtitle: 'Check sharp inch print size at 72–300 DPI',
    badge: 'PX → IN',
    href: '/pixels-to-inches-converter/',
    category: 'resize',
    keywords: ['pixels to inches', 'px to in', 'pixel to inch'],
  },
  {
    title: 'Bulk Image Resizer',
    subtitle: 'Parallel batch resizer with instant ZIP export',
    badge: 'BATCH ZIP',
    href: '/bulk-image-resizer/',
    category: 'resize',
    keywords: ['bulk', 'batch', 'multiple images', 'zip'],
  },

  // Crop Studios
  {
    title: 'Crop Image Studio',
    subtitle: 'Interactive rule-of-thirds & aspect-ratio cropper',
    badge: 'CROP',
    href: '/crop-image/',
    category: 'crop',
    keywords: ['crop', 'cropper', 'trim image', 'aspect ratio'],
  },
  {
    title: 'Crop Image 1:1 Square',
    subtitle: 'Exact 1:1 square crop at full native resolution',
    badge: '1:1 SQUARE',
    href: '/crop-image-1-1-square/',
    category: 'crop',
    keywords: ['crop 1:1', '1:1 square', 'square crop'],
  },
  {
    title: 'Crop Image 16:9 Widescreen',
    subtitle: 'Exact 16:9 widescreen crop for YouTube & HD slides',
    badge: '16:9 HD',
    href: '/crop-image-16-9/',
    category: 'crop',
    keywords: ['crop 16:9', '16:9', 'widescreen crop'],
  },
  {
    title: 'Crop Image 4:5 Portrait',
    subtitle: 'Instagram 4:5 vertical feed & 8×10" frame crop',
    badge: '4:5 FEED',
    href: '/crop-image-4-5-portrait/',
    category: 'crop',
    keywords: ['crop 4:5', '4:5', 'instagram portrait', '1080x1350'],
  },
  {
    title: 'Crop Image 9:16 Vertical Story',
    subtitle: 'Full-screen 9:16 crop for Stories, Reels & Shorts',
    badge: '9:16 STORY',
    href: '/crop-image-9-16-story/',
    category: 'crop',
    keywords: ['crop 9:16', '9:16', 'story crop', 'reels', 'shorts', 'tiktok'],
  },
  {
    title: 'Crop Image 4:3 Landscape',
    subtitle: 'Classic 4:3 ratio for marketplaces, iPads & MLS',
    badge: '4:3 RATIO',
    href: '/crop-image-4-3/',
    category: 'crop',
    keywords: ['crop 4:3', '4:3'],
  },
  {
    title: 'Crop Image 3:4 Portrait',
    subtitle: '3:4 vertical portrait for apparel, IDs & NZ visas',
    badge: '3:4 RATIO',
    href: '/crop-image-3-4/',
    category: 'crop',
    keywords: ['crop 3:4', '3:4'],
  },
  {
    title: 'Crop Signature (2:1 Wide)',
    subtitle: 'Trim excess paper margins around handwritten signatures',
    badge: '2:1 SIGN',
    href: '/crop-image-2-1-signature/',
    category: 'crop',
    keywords: ['crop signature', '2:1'],
  },
  {
    title: 'Crop Passport Photo 35×45mm',
    subtitle: 'Biometric 3.5:4.5 passport framing at full resolution',
    badge: '3.5:4.5',
    href: '/crop-passport-photo-35x45mm/',
    category: 'crop',
    keywords: ['crop passport', '3.5:4.5', 'crop 35x45'],
  },

  // DPI & Privacy & PDF Specials
  {
    title: 'Change Image DPI to 300',
    subtitle: 'Lossless 300 DPI JFIF & PNG pHYs print calibration',
    badge: '300 DPI',
    href: '/change-image-dpi-to-300/',
    category: 'dpi',
    keywords: ['300 dpi', 'dpi converter', 'change dpi', 'print dpi'],
  },
  {
    title: 'Change Image DPI to 200',
    subtitle: '200 DPI calibration for PAN card, IBPS & SBI portals',
    badge: '200 DPI',
    href: '/change-image-dpi-to-200/',
    category: 'dpi',
    keywords: ['200 dpi', 'pan dpi', 'ibps 200 dpi'],
  },
  {
    title: 'Change Image DPI to 600',
    subtitle: '600 DPI archival stamp for journals & patent line art',
    badge: '600 DPI',
    href: '/change-image-dpi-to-600/',
    category: 'dpi',
    keywords: ['600 dpi', 'journal 600 dpi', 'high dpi'],
  },
  {
    title: 'Change Image DPI to 150',
    subtitle: '150 DPI calibration for A4 certificates & KYC scans',
    badge: '150 DPI',
    href: '/change-image-dpi-to-150/',
    category: 'dpi',
    keywords: ['150 dpi', 'document scan dpi'],
  },
  {
    title: 'Change Image DPI to 72',
    subtitle: '72 DPI web, CMS & Outlook signature calibration',
    badge: '72 DPI',
    href: '/change-image-dpi-to-72/',
    category: 'dpi',
    keywords: ['72 dpi', 'web dpi', 'screen dpi'],
  },
  {
    title: 'EXIF Metadata Remover',
    subtitle: 'Strip GPS coordinates, camera serials & hidden tags',
    badge: 'PRIVACY',
    href: '/exif-metadata-remover/',
    category: 'privacy',
    keywords: ['exif', 'remove metadata', 'strip gps', 'remove location'],
  },
  {
    title: 'Merge JPG to PDF',
    subtitle: 'Combine multiple images into a single ordered PDF',
    badge: 'MERGE PDF',
    href: '/merge-jpg-to-pdf/',
    category: 'convert',
    keywords: ['merge pdf', 'combine jpg to pdf', 'multiple images to pdf'],
  },
  {
    title: 'JPG to JPEG Converter',
    subtitle: 'Output strict .jpeg file extension for portal forms',
    badge: 'JPG → JPEG',
    href: '/jpg-to-jpeg/',
    category: 'convert',
    keywords: ['jpg to jpeg', '.jpeg extension'],
  },
  {
    title: 'Portal Photo Size Chart (50+ Specs)',
    subtitle: 'Complete 2026 official size directory + 30-preset studio',
    badge: '50+ SPECS',
    href: '/portal-photo-size-chart/',
    category: 'preset',
    keywords: ['portal chart', 'size chart', 'all presets', 'exam specs'],
  },
];

// Append all 30 official presets from PORTAL_PRESETS dynamically
for (const p of PORTAL_PRESETS) {
  if (p.id === 'none') continue;
  const href = PRESET_HREFS[p.id] || `/?tool=passport&preset=${p.id}`;
  CORE_CATALOG.push({
    title: p.name,
    subtitle: p.desc,
    badge: p.badge,
    href,
    category: 'preset',
    keywords: [
      p.id,
      p.name.toLowerCase(),
      p.badge.toLowerCase(),
      p.dimLabel.toLowerCase(),
      ...(p.keywords || []),
    ],
  });
}

function normalizeFormatToken(raw: string): string {
  const clean = raw.toLowerCase().replace(/^\./, '');
  if (clean === 'tif') return 'tiff';
  if (clean === 'heif') return 'heic';
  return clean;
}

/**
 * Synthesizes exact pre-configured tool destinations from natural-language
 * user queries (e.g. "compress under 100kb", "3.5x4.5 cm", "200 dpi",
 * "heic to jpg 50kb", "crop 16:9", "75kb", "4.2x5.5 cm").
 */
function parseIntentResults(rawQuery: string): ToolSearchResult[] {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return [];

  const results: ToolSearchResult[] = [];
  const wantsIncrease = /\b(increase|expand|boost|enlarge|exact|minimum|min\b)/.test(q) && !/\bto\b.*\bkb\b/.test(q.replace(/increase\s+.*?to/, ''));

  // 1. Min–Max KB Range: e.g. "20kb to 50kb", "10 - 20 kb", "40 to 120kb"
  const rangeMatch = q.match(/(\d+(?:\.\d+)?)\s*(?:kb)?\s*(?:to|-|–)\s*(\d+(?:\.\d+)?)\s*kb\b/);
  if (rangeMatch) {
    const minVal = Math.round(Number(rangeMatch[1]));
    const maxVal = Math.round(Number(rangeMatch[2]));
    if (minVal > 0 && maxVal > minVal && maxVal <= 20480) {
      let href = `/compress-image-to-specific-size/?tool=compress&mode=range&minKb=${minVal}&maxKb=${maxVal}`;
      if (minVal === 20 && maxVal === 50) href = '/resize-image-to-20kb-to-50kb/';
      else if (minVal === 10 && maxVal === 20) href = '/signature-resizer-10kb-to-20kb/';

      results.push({
        title: `Compress / Resize Image: ${minVal}KB to ${maxVal}KB Range`,
        subtitle: `Pre-selected Min ${minVal} KB – Max ${maxVal} KB two-sided bracket`,
        badge: `${minVal}–${maxVal} KB`,
        href,
        category: 'compress',
        score: 520,
      });
    }
  }

  // 2. Format-to-Format (+ optional KB): e.g. "heic to jpg 100kb", "photo to pdf 200kb", "png to webp"
  const fmtMatch = q.match(
    /\b(jpg|jpeg|png|webp|heic|heif|avif|gif|bmp|pdf|svg|tiff|tif|photo|image)\s*(?:to|->|→|into)\s*(jpg|jpeg|png|webp|pdf|avif|svg)\b/
  );
  if (fmtMatch && fmtMatch[1] && fmtMatch[2]) {
    const rawFrom = normalizeFormatToken(fmtMatch[1]);
    const rawTo = normalizeFormatToken(fmtMatch[2]);
    const kbInQuery = q.match(/(\d+)\s*kb\b/);
    const kb = kbInQuery ? Number(kbInQuery[1]) : null;

    if (rawFrom === 'jpg' && rawTo === 'jpeg' && !kb) {
      results.push({
        title: 'JPG to JPEG Converter (.jpeg Extension)',
        subtitle: 'Pre-selected JPG → JPEG format conversion',
        badge: 'JPG → JPEG',
        href: '/jpg-to-jpeg/',
        category: 'convert',
        score: 525,
      });
    } else if ((rawFrom === 'photo' || rawFrom === 'image') && rawTo === 'pdf') {
      const href =
        kb && STATIC_PDF_KB_PAGES.has(kb)
          ? `/photo-to-pdf-${kb}kb/`
          : kb
          ? `/photo-to-pdf/?tool=compress&to=pdf&kb=${kb}`
          : rawFrom === 'photo'
          ? '/photo-to-pdf/'
          : '/image-to-pdf/';
      results.push({
        title: kb ? `Convert ${rawFrom === 'photo' ? 'Photo' : 'Image'} to PDF Under ${kb}KB` : `${rawFrom === 'photo' ? 'Photo' : 'Image'} to PDF Converter`,
        subtitle: kb ? `Pre-selected PDF output + strictly ≤ ${kb} KB` : 'Pre-selected multi-image to PDF studio',
        badge: kb ? `PDF ≤ ${kb}KB` : 'TO PDF',
        href,
        category: 'convert',
        score: 515,
      });
    } else if (VALID_INPUT_FORMATS.has(rawFrom) && VALID_OUTPUT_FORMATS.has(rawTo)) {
      const fromNorm = rawFrom === 'jpeg' ? 'jpg' : rawFrom;
      const toNorm = rawTo === 'jpeg' ? 'jpg' : rawTo;
      if (fromNorm !== toNorm) {
        const href =
          kb && COMBO_KB_SIZES.has(kb) && !['bmp', 'gif', 'tiff', 'avif'].includes(fromNorm)
            ? `/${fromNorm}-to-${toNorm}-under-${kb}kb/`
            : kb
            ? `/${fromNorm}-to-${toNorm}/?tool=compress&kb=${kb}`
            : `/${fromNorm}-to-${toNorm}/`;
        results.push({
          title: kb
            ? `${fromNorm.toUpperCase()} to ${toNorm.toUpperCase()} Under ${kb}KB`
            : `${fromNorm.toUpperCase()} to ${toNorm.toUpperCase()} Converter`,
          subtitle: kb
            ? `Pre-selected ${fromNorm.toUpperCase()} → ${toNorm.toUpperCase()} + ≤ ${kb} KB`
            : `Pre-selected ${fromNorm.toUpperCase()} → ${toNorm.toUpperCase()} studio`,
          badge: kb ? `${toNorm.toUpperCase()} ≤ ${kb}KB` : `${fromNorm.toUpperCase()} → ${toNorm.toUpperCase()}`,
          href,
          category: 'convert',
          score: 515,
        });
      }
    }
  }

  // 3. Physical or Pixel Dimensions (W × H in cm, mm, in, px): e.g. "3.5x4.5 cm", "35x45mm", "2x2 inch", "600x600"
  const dimMatch = q.match(
    /(\d+(?:\.\d+)?)\s*(?:x|×|\*|by)\s*(\d+(?:\.\d+)?)\s*(cm|centimeters?|mm|millimeters?|in|inch|inches|"|px|pixels?)?/
  );
  // Avoid matching aspect ratios with colons like 16:9
  if (dimMatch && !q.includes(`${dimMatch[1]}:${dimMatch[2]}`)) {
    const w = Number(dimMatch[1]);
    const h = Number(dimMatch[2]);
    const rawUnit = (dimMatch[3] || '').toLowerCase();
    let unit: 'px' | 'cm' | 'mm' | 'in' = 'px';
    if (rawUnit.startsWith('cm') || rawUnit.startsWith('centi')) unit = 'cm';
    else if (rawUnit.startsWith('mm') || rawUnit.startsWith('milli')) unit = 'mm';
    else if (rawUnit === '"' || rawUnit.startsWith('in')) unit = 'in';
    else if (!rawUnit && w <= 10 && h <= 10) unit = w === 2 && h === 2 ? 'in' : 'cm';
    else if (!rawUnit && w >= 20 && w <= 60 && h >= 20 && h <= 80) unit = 'mm';

    const dpiMatch = q.match(/(\d{2,4})\s*dpi\b/);
    const dpi = dpiMatch ? Number(dpiMatch[1]) : unit === 'px' ? 300 : 300;
    const kbMatch = q.match(/(\d+)\s*kb\b/);
    const kbParam = kbMatch ? `&kb=${Number(kbMatch[1])}` : '';

    let href = `/resize-image-in-pixels/?tool=resize&unit=${unit}&w=${w}&h=${h}&dpi=${dpi}${kbParam}`;
    if (unit === 'cm') {
      href =
        w === 3.5 && h === 4.5 && !kbMatch && !dpiMatch
          ? '/resize-image-3-5x4-5-cm/'
          : `/image-resizer-in-cm/?tool=resize&unit=cm&w=${w}&h=${h}&dpi=${dpi}${kbParam}`;
    } else if (unit === 'mm') {
      href =
        w === 35 && h === 45 && !kbMatch && !dpiMatch
          ? '/resize-image-35x45-mm/'
          : `/image-resizer-in-mm/?tool=resize&unit=mm&w=${w}&h=${h}&dpi=${dpi}${kbParam}`;
    } else if (unit === 'in') {
      href =
        w === 2 && h === 2 && !kbMatch && !dpiMatch
          ? '/resize-image-2x2-inch/'
          : `/image-resizer-in-inches/?tool=resize&unit=in&w=${w}&h=${h}&dpi=${dpi}${kbParam}`;
    } else {
      if (w === 600 && h === 600 && !kbMatch) href = '/resize-image-600x600/';
      else if (w === 1080 && h === 1080 && !kbMatch) href = '/resize-image-1080x1080/';
      else if (w === 1920 && h === 1080 && !kbMatch) href = '/resize-image-1920x1080/';
    }

    results.push({
      title: `Resize Image to ${w} × ${h} ${unit}${unit !== 'px' ? ` (${dpi} DPI)` : ''}`,
      subtitle: `Pre-selected ${w} × ${h} ${unit} dimensions${kbMatch ? ` + ≤ ${kbMatch[1]} KB` : ''}`,
      badge: `${w}×${h} ${unit.toUpperCase()}`,
      href,
      category: 'resize',
      score: 510,
    });
  }

  // 4. DPI Target: e.g. "300 dpi", "change dpi to 200", "400 dpi"
  const dpiOnlyMatch = q.match(/\b(\d{2,4})\s*dpi\b/);
  if (dpiOnlyMatch && !dimMatch) {
    const dpiVal = Number(dpiOnlyMatch[1]);
    if (dpiVal >= 10 && dpiVal <= 2400) {
      const href = STATIC_DPI_PAGES.has(dpiVal)
        ? `/change-image-dpi-to-${dpiVal}/`
        : `/change-image-dpi-to-300/?tool=dpi&dpi=${dpiVal}`;
      results.push({
        title: `Change Image DPI to ${dpiVal} DPI`,
        subtitle: `Pre-selected ${dpiVal} DPI JFIF & PNG pHYs density calibration`,
        badge: `${dpiVal} DPI`,
        href,
        category: 'dpi',
        score: 505,
      });
    }
  }

  // 5. Aspect Ratio Crop: e.g. "crop 16:9", "1:1", "4:5", "9:16", "4:3", "3:4", "2:1", "3.5:4.5"
  const ratioMatch = q.match(/\b(1:1|16:9|9:16|4:5|4:3|3:4|3:2|5:7|2:1|3:1|4:1|3\.5:4\.5)\b/);
  if (ratioMatch && ratioMatch[1]) {
    const ratio = ratioMatch[1];
    const ratioHrefMap: Record<string, string> = {
      '1:1': '/crop-image-1-1-square/',
      '16:9': '/crop-image-16-9/',
      '9:16': '/crop-image-9-16-story/',
      '4:5': '/crop-image-4-5-portrait/',
      '4:3': '/crop-image-4-3/',
      '3:4': '/crop-image-3-4/',
      '2:1': '/crop-image-2-1-signature/',
      '3.5:4.5': '/crop-passport-photo-35x45mm/',
    };
    const href = ratioHrefMap[ratio] || `/crop-image/?tool=crop&crop=${encodeURIComponent(ratio)}`;
    results.push({
      title: `Crop Image to ${ratio} Aspect Ratio`,
      subtitle: `Pre-selected ${ratio} aspect-ratio framing studio`,
      badge: `CROP ${ratio}`,
      href,
      category: 'crop',
      score: 505,
    });
  }

  // 6. Single KB or MB Target: e.g. "compress under 100kb", "50kb", "increase to 50kb", "75kb", "under 2mb"
  if (!rangeMatch && !fmtMatch) {
    const kbSingle = q.match(/\b(\d+(?:\.\d+)?)\s*kb\b/);
    const mbSingle = q.match(/\b(\d+(?:\.\d+)?)\s*mb\b/);

    if (kbSingle) {
      const kbVal = Math.round(Number(kbSingle[1]));
      if (kbVal >= 1 && kbVal <= 20480) {
        const isIncrease = /\b(increase|expand|boost|enlarge|exact)\b/.test(q) || wantsIncrease;
        if (isIncrease) {
          const incStatic = new Set([20, 50, 100]);
          const href = incStatic.has(kbVal)
            ? `/increase-image-size-to-${kbVal}kb/`
            : `/increase-image-size-in-kb/?tool=compress&mode=exact&kb=${kbVal}`;
          results.push({
            title: `Increase / Set Exact Image Size to ${kbVal}KB`,
            subtitle: `Pre-selected Exact ${kbVal} KB target without pixel blur`,
            badge: `EXACT ${kbVal}KB`,
            href,
            category: 'compress',
            score: 508,
          });
        } else {
          const isJpgSpecific = /\b(jpg|jpeg)\b/.test(q);
          const href = STATIC_KB_PAGES.has(kbVal)
            ? isJpgSpecific
              ? `/compress-jpg-to-${kbVal}kb/`
              : `/compress-image-to-${kbVal}kb/`
            : `/compress-image-to-specific-size/?tool=compress&kb=${kbVal}`;
          results.push({
            title: isJpgSpecific ? `Compress JPG Under ${kbVal}KB` : `Compress Image Under ${kbVal}KB`,
            subtitle: `Pre-selected strictly ≤ ${kbVal} KB binary-search compressor`,
            badge: `≤ ${kbVal} KB`,
            href,
            category: 'compress',
            score: 508,
          });
        }
      }
    } else if (mbSingle) {
      const mbNum = Number(mbSingle[1]);
      if (mbNum > 0 && mbNum <= 50) {
        const kbEquiv = Math.round(mbNum * 1000);
        const href =
          Number.isInteger(mbNum) && STATIC_MB_PAGES.has(mbNum)
            ? `/compress-image-to-${mbNum}mb/`
            : `/compress-image-to-specific-size/?tool=compress&kb=${kbEquiv}`;
        results.push({
          title: `Compress Image Under ${mbNum}MB`,
          subtitle: `Pre-selected ≤ ${mbNum} MB (${kbEquiv} KB) compressor`,
          badge: `≤ ${mbNum} MB`,
          href,
          category: 'compress',
          score: 500,
        });
      }
    }
  }

  return results;
}

/**
 * Searches PixelKit's full tool & preset catalog AND parses natural-language
 * settings queries, returning ranked destinations with exact pre-selected state.
 */
export function searchTools(query: string, limit = 8): ToolSearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return CORE_CATALOG.slice(0, limit).map((item, idx) => ({
      title: item.title,
      subtitle: item.subtitle,
      badge: item.badge,
      href: item.href,
      category: item.category,
      score: 100 - idx,
    }));
  }

  const results = parseIntentResults(q);
  const seenHrefs = new Set(results.map((r) => r.href));

  const tokens = q.split(/\s+/).filter(Boolean);

  for (const entry of CORE_CATALOG) {
    if (seenHrefs.has(entry.href)) continue;
    const haystackTitle = entry.title.toLowerCase();
    const haystackSub = entry.subtitle.toLowerCase();
    const haystackKw = entry.keywords.join(' ').toLowerCase();

    let score = 0;
    if (haystackTitle === q) score += 160;
    else if (haystackTitle.includes(q)) score += 110;

    if (entry.keywords.some((kw) => kw.toLowerCase() === q)) score += 140;
    else if (haystackKw.includes(q)) score += 85;

    let matchedTokens = 0;
    for (const tok of tokens) {
      if (haystackTitle.includes(tok)) {
        score += 25;
        matchedTokens++;
      } else if (haystackKw.includes(tok) || haystackSub.includes(tok)) {
        score += 15;
        matchedTokens++;
      }
    }

    if (tokens.length > 1 && matchedTokens === tokens.length) {
      score += 45;
    } else if (matchedTokens === 0) {
      score = 0;
    }

    if (score > 0) {
      seenHrefs.add(entry.href);
      results.push({
        title: entry.title,
        subtitle: entry.subtitle,
        badge: entry.badge,
        href: entry.href,
        category: entry.category,
        score,
      });
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}

