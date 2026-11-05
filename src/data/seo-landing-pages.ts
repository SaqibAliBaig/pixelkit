import type { CropAspectPreset } from '@lib/worker/types';

export interface SeoLandingToolProps {
  from?: string;
  to?: string;
  fromMime?: string;
  toMime?: string;
  targetKb?: number | null;
  initialTool: 'all' | 'compress' | 'convert' | 'resize' | 'crop' | 'passport' | 'dpi' | 'exif';
  initialSizeMode?: 'max' | 'exact' | 'range' | 'quality';
  minKb?: number | null;
  maxKb?: number | null;
  initialCropAspect?: CropAspectPreset;
  initialUnit?: 'px' | 'cm' | 'mm' | 'in';
  initialWidth?: number | null;
  initialHeight?: number | null;
  initialDpi?: number | null;
  preserveMetadata?: boolean;
  initialMergePdf?: boolean;
  preset?: string;
  category?: 'all' | 'visa' | 'exam' | 'id' | 'social';
}

export interface SeoLandingPage {
  slug: string;
  title: string; // 30-60 chars including " | PixelKit"
  description: string; // 70-160 chars
  keywords: string[];
  badge: string;
  ogTitle: string;
  ogBadge: string;
  ogSubtitle: string;
  breadcrumbParent: { label: string; href: string };
  breadcrumbLabel: string;
  h1: string;
  heroSubtitle: string;
  directAnswer: {
    title: string;
    portalName?: string;
    summaryText: string;
    specs: { label: string; value: string; highlight?: boolean }[];
  };
  calculatorProps?: {
    mode: 'px-to-cm' | 'cm-to-px';
    defaultUnit?: 'cm' | 'mm' | 'in';
    defaultDpi?: number;
  };
  toolProps: SeoLandingToolProps;
  specTable: {
    heading: string;
    subheading: string;
    columns: [string, string, string, string];
    rows: [string, string, string, string][];
  };
  guideSection: {
    heading: string;
    paragraphs: string[];
    cards: { title: string; body: string }[];
  };
  faqs: { q: string; a: string }[];
  relatedLinks: { title: string; meta: string; desc: string; href: string }[];
}

export const SEO_LANDING_PAGES: SeoLandingPage[] = [
  // ==========================================================
  // 1. OFFICIAL VISA, PASSPORT & EXAM PRESETS (7 PAGES)
  // ==========================================================
  {
    slug: 'china-visa-photo-resizer',
    title: 'China Visa Photo Resizer (33×48mm, 40–120KB) | PixelKit',
    description:
      'Resize photos to exact China COVA visa specs: 390×567 px (33×48 mm) and 40KB–120KB JPG. 100% private in-browser biometric cropper with zero uploads.',
    keywords: [
      'china visa photo resizer',
      'cova photo size',
      '33x48mm photo online',
      'china visa photo 40kb to 120kb',
      '390x567 pixels china visa',
      'chinese passport photo maker',
    ],
    badge: 'Chinese Embassy COVA · 33 × 48 mm · 40–120 KB Strict',
    ogTitle: 'China Visa Photo Resizer',
    ogBadge: '390×567 PX (40–120KB)',
    ogSubtitle: 'Official Chinese COVA online visa & passport biometric standard',
    breadcrumbParent: { label: 'Passport & Visa Tools', href: '/passport-photo-resizer/' },
    breadcrumbLabel: 'China Visa Photo Resizer',
    h1: 'China Visa Photo Resizer & COVA Compressor',
    heroSubtitle:
      'Crop to official 33 × 48 mm (390 × 567 px) dimensions and calibrate file weight strictly inside the 40 KB to 120 KB COVA portal bracket in your browser.',
    directAnswer: {
      title: 'Official China Visa (COVA) Photo Specification (2026 Direct Answer)',
      portalName: 'China Online Visa Application (cova.mfa.gov.cn)',
      summaryText:
        'The China Online Visa Application (COVA) portal and Chinese Consular Service require a recent digital color photograph in JPEG format measuring 33 × 48 mm, which corresponds to 354 × 472 px minimum up to 420 × 560 px (calibrated at 390 × 567 px at 300 DPI). File size must fall strictly between 40 KB and 120 KB against a pure white (#FFFFFF) background with full ear visibility.',
      specs: [
        { label: 'Digital Resolution', value: '390 × 567 px (33 × 48 mm)', highlight: true },
        { label: 'File Size Bracket', value: '40 KB to 120 KB JPEG', highlight: true },
        { label: 'Head Width & Height', value: '15–22 mm W · 28–33 mm H' },
        { label: 'Background & Ears', value: 'Pure White, Both Ears Visible' },
      ],
    },
    toolProps: {
      from: 'jpg',
      to: 'jpg',
      fromMime: 'image/jpeg',
      toMime: 'image/jpeg',
      targetKb: 120,
      initialTool: 'passport',
      preset: 'cn-visa',
      category: 'visa',
      initialSizeMode: 'range',
      minKb: 40,
      maxKb: 120,
    },
    specTable: {
      heading: 'Chinese Embassy COVA Digital Upload Standards',
      subheading: 'Automated biometric rules verified by the COVA online form checker:',
      columns: ['Parameter', 'Official COVA Requirement', 'Common Rejection Cause', 'PixelKit Calibration'],
      rows: [
        ['Dimensions', '354×472 px to 420×560 px (33×48 mm)', 'Standard 2×2" square US photo uploaded', 'Locks 390 × 567 px portrait aspect'],
        ['File Weight', '40 KB minimum to 120 KB maximum', 'Over-compressed (<40 KB) or heavy (>120 KB)', 'Targets ~90 KB sweet spot automatically'],
        ['Color Space', '24-bit True Color sRGB JPEG', 'CMYK or iPhone Display P3 HEIC container', 'Normalizes to standard sRGB baseline JPG'],
        ['Head Margins', '3–5 mm top crown gap, ≥ 7 mm chin-to-bottom', 'Cropped too tight at top of hair', 'Top-anchored biometric head framing'],
      ],
    },
    guideSection: {
      heading: 'How to Pass the COVA Automated Photo Validator on First Upload',
      paragraphs: [
        'China’s COVA portal runs one of the strictest automated biometric geometry checks among global consular systems. Even when a photo looks clear to the human eye, COVA rejects images if file bytes fall under 40 KB, exceed 120 KB, or carry unstripped EXIF orientation tags.',
        'PixelKit pre-selects the China Visa (33×48 mm) preset together with the 40 KB – 120 KB range compressor. Your photo is cropped, resampled with high-sharpness Lanczos/bicubic filtering, stripped of conflicting camera EXIF rotations, and encoded strictly inside the accepted kilobyte window without leaving your device.',
      ],
      cards: [
        { title: 'Strict 40–120 KB Range Engine', body: 'Prevents both "file too large" (>120 KB) and "file too small" (<40 KB) COVA upload errors automatically.' },
        { title: 'No Glasses or Jewelry', body: 'Chinese consular rules prohibit eyeglass frames (even clear lenses), hats, and reflective earrings.' },
        { title: '100% Local Biometric Privacy', body: 'Visa portraits never touch remote cloud servers—processing executes entirely in local browser RAM.' },
      ],
    },
    faqs: [
      {
        q: 'Why does the China COVA portal say my photo is under 40KB or over 120KB?',
        a: 'COVA enforces a two-sided file size bracket (40 KB minimum to 120 KB maximum). WhatsApp-forwarded photos often drop below 35 KB, while smartphone camera shots exceed 2 MB. PixelKit’s range mode lands your JPEG safely around 85–110 KB every time.',
      },
      {
        q: 'Can I use a standard 35×45 mm or 2×2 inch passport photo for a China visa?',
        a: 'No. China uses a narrower 33 × 48 mm biometric ratio. Submitting a 1:1 square (2×2") photo fails the COVA aspect-ratio check immediately. Our preset crops directly to the compliant Chinese consular framing.',
      },
      {
        q: 'What clothes should I wear for a China visa digital photo?',
        a: 'Wear dark or contrasting solid-colored clothing (such as navy, charcoal, or black) so your shoulders remain clearly distinct from the mandatory pure white background.',
      },
      {
        q: 'Does PixelKit upload my passport or visa photo to a server?',
        a: 'Never. All cropping, pixel scaling, and JPEG binary-search compression run locally inside your browser via Web Workers.',
      },
    ],
    relatedLinks: [
      { title: 'Passport Photo Resizer', meta: '30+ Global Presets', desc: 'All-in-one biometric studio for global passports and visas.', href: '/passport-photo-resizer/' },
      { title: 'Japan Visa Photo Resizer', meta: '413×531 px · <200KB', desc: 'Official JAPAN eVISA & COE photo resizer.', href: '/japan-visa-photo-resizer/' },
      { title: 'Singapore Visa Resizer', meta: '400×514 px · <150KB', desc: 'Singapore ICA passport & SG Arrival Card standard.', href: '/singapore-visa-photo-resizer/' },
      { title: 'US Visa Photo Resizer', meta: '600×600 px · <240KB', desc: 'US Department of State DS-160 2×2 inch square crop.', href: '/us-visa-photo-resizer/' },
      { title: 'Schengen Visa Resizer', meta: '35×45 mm · <200KB', desc: 'European VFS Global & TLScontact biometric spec.', href: '/schengen-visa-photo-resizer/' },
      { title: 'Portal Photo Size Chart', meta: '50+ Official Specs', desc: 'Searchable 2026 dimension and KB reference directory.', href: '/portal-photo-size-chart/' },
    ],
  },

  {
    slug: 'japan-visa-photo-resizer',
    title: 'Japan Visa Photo Resizer (45×35mm, Under 200KB) | PixelKit',
    description:
      'Resize photos for JAPAN eVISA and COE portals: 413×531 px (45×35 mm) under 200KB JPG. 100% private client-side passport & visa photo tool.',
    keywords: [
      'japan visa photo resizer',
      'japan evisa photo size',
      '45x35mm photo pixels',
      'certificate of eligibility japan photo',
      'mofa japan visa photo online',
    ],
    badge: 'MOFA JAPAN eVISA & COE · 45 × 35 mm · Under 200 KB',
    ogTitle: 'Japan Visa Photo Resizer',
    ogBadge: '413×531 PX UNDER 200KB',
    ogSubtitle: 'Official MOFA JAPAN eVISA & Certificate of Eligibility standard',
    breadcrumbParent: { label: 'Passport & Visa Tools', href: '/passport-photo-resizer/' },
    breadcrumbLabel: 'Japan Visa Photo Resizer',
    h1: 'Japan e-Visa & COE Photo Resizer',
    heroSubtitle:
      'Format your portrait to Japan MOFA’s 45 mm × 35 mm (413 × 531 px at 300 DPI) biometric standard and compress cleanly under 200 KB JPG with zero server uploads.',
    directAnswer: {
      title: 'Official Japan Visa & JAPAN eVISA Photo Specification (2026)',
      portalName: 'Ministry of Foreign Affairs of Japan (evisa.mofa.go.jp)',
      summaryText:
        'Japan’s Ministry of Foreign Affairs (MOFA) updated its visa specification to 45 mm tall by 35 mm wide (matching ICAO 35×45 mm portrait geometry, or 413 × 531 pixels at 300 DPI). For JAPAN eVISA and digital Certificate of Eligibility (COE) submissions, upload a borderless sRGB JPG file under 200 KB taken within the last 6 months against a plain white background.',
      specs: [
        { label: 'Print & Pixel Size', value: '35 × 45 mm (413 × 531 px)', highlight: true },
        { label: 'Digital File Ceiling', value: 'Under 200 KB JPG', highlight: true },
        { label: 'Crown-to-Chin Height', value: '32–36 mm (70–80% height)' },
        { label: 'Validity Window', value: 'Taken within last 6 months' },
      ],
    },
    toolProps: {
      from: 'jpg',
      to: 'jpg',
      fromMime: 'image/jpeg',
      toMime: 'image/jpeg',
      targetKb: 200,
      initialTool: 'passport',
      preset: 'jp-visa',
      category: 'visa',
    },
    specTable: {
      heading: 'Japan Visa vs Legacy 45×45 mm Square Specification',
      subheading: 'Ensure you use the current MOFA 35×45 mm standard rather than outdated 2×2" templates:',
      columns: ['Application Type', 'Physical Size', '300 DPI Pixels', 'Max Digital Size'],
      rows: [
        ['JAPAN eVISA Tourist Portal', '35 × 45 mm (W × H)', '413 × 531 px', 'Under 200 KB JPG'],
        ['Digital COE (Immigration Services)', '35 × 45 mm (W × H)', '413 × 531 px', 'Under 200 KB JPG'],
        ['Consular Paper Visa Form', '35 × 45 mm at 300 DPI', '413 × 531 px', '300 DPI Print Ready'],
        ['Japanese Residence Card (Zairyu)', '30 × 40 mm', '354 × 472 px', 'Under 200 KB JPG'],
      ],
    },
    guideSection: {
      heading: 'Preparing Compliant Photos for JAPAN eVISA & Immigration',
      paragraphs: [
        'Japanese consular officers write dimensions height-first ("45 mm × 35 mm"), which often confuses applicants into cropping sideways landscape images. In standard width × height notation, the required canvas is 35 mm wide by 45 mm tall (413 × 531 px at 300 DPI).',
        'PixelKit locks the exact 35:45 portrait ratio, embeds clean 300 DPI JFIF density headers for crisp physical printing if needed at VFS, and keeps the output file under 200 KB with crisp facial detail.',
      ],
      cards: [
        { title: 'Height-First Clarity', body: 'Automatically sets width = 413 px and height = 531 px so you never accidentally invert MOFA’s 45×35 mm notation.' },
        { title: 'Zero Background Shadows', body: 'Use even front-facing window light against a plain white wall; shadows behind the neck trigger eVISA rejection.' },
        { title: 'iPhone HEIC Ready', body: 'Drop raw iPhone .heic portraits directly—PixelKit converts to standard .jpg and strips metadata locally.' },
      ],
    },
    faqs: [
      {
        q: 'Is a Japan visa photo still 2×2 inches (45×45 mm) or 35×45 mm?',
        a: 'Japan standardized its visa application photo to 45 mm vertical by 35 mm horizontal (35 × 45 mm width × height), aligning with international ICAO passport dimensions rather than the older 45 × 45 mm square.',
      },
      {
        q: 'What is the pixel size for JAPAN eVISA?',
        a: 'At 300 DPI print resolution, 35 × 45 mm equals 413 × 531 pixels. This meets both online JAPAN eVISA resolution minimums and physical consular print accuracy.',
      },
      {
        q: 'Are bangs or hair covering eyebrows allowed on a Japan visa photo?',
        a: 'Hair may lightly touch the forehead, provided both eyes, pupils, and eyebrows remain clearly visible without heavy shadows across the eye sockets.',
      },
      {
        q: 'Can I process family visa photos in bulk?',
        a: 'Yes. Drop multiple portraits at once into PixelKit; each image is cropped and compressed under 200 KB simultaneously in parallel Web Workers.',
      },
    ],
    relatedLinks: [
      { title: 'China Visa Photo Resizer', meta: '390×567 px · 40–120KB', desc: 'Chinese Embassy COVA online visa photo cropper.', href: '/china-visa-photo-resizer/' },
      { title: 'Singapore Visa Resizer', meta: '400×514 px · <150KB', desc: 'Singapore ICA passport & Arrival Card preset.', href: '/singapore-visa-photo-resizer/' },
      { title: 'Malaysia Passport Resizer', meta: '413×591 px · <100KB', desc: 'MyOnline Passport & Malaysia eVisa 35×50 mm spec.', href: '/malaysia-passport-photo-resizer/' },
      { title: 'Passport Photo Resizer', meta: 'All Countries', desc: 'Complete 30-preset biometric passport photo hub.', href: '/passport-photo-resizer/' },
      { title: 'Resize 35×45 mm', meta: '413×531 px @ 300 DPI', desc: 'Dedicated 35×45 mm millimeter resizer.', href: '/resize-image-35x45-mm/' },
      { title: 'Change Image DPI to 300', meta: 'Print Calibration', desc: 'Embed lossless 300 DPI headers for photo lab printing.', href: '/change-image-dpi-to-300/' },
    ],
  },

  {
    slug: 'singapore-visa-photo-resizer',
    title: 'Singapore ICA Passport & Visa Photo Resizer | PixelKit',
    description:
      'Resize photos to exact Singapore ICA specs: 400×514 px (35×45 mm) under 150KB JPG. Instant private browser cropper for Singapore passport, EP & visa.',
    keywords: [
      'singapore visa photo resizer',
      'ica passport photo size pixels',
      '400x514 pixels singapore photo',
      'singapore ica photo 150kb',
      'mom employment pass photo size',
    ],
    badge: 'Singapore ICA & MOM · 400 × 514 px · Under 150 KB',
    ogTitle: 'Singapore ICA Photo Resizer',
    ogBadge: '400×514 PX UNDER 150KB',
    ogSubtitle: 'Official Singapore ICA Passport, e-Visa & MOM pass specification',
    breadcrumbParent: { label: 'Passport & Visa Tools', href: '/passport-photo-resizer/' },
    breadcrumbLabel: 'Singapore Visa Photo Resizer',
    h1: 'Singapore ICA Passport & Visa Photo Resizer',
    heroSubtitle:
      'Automatically crop and scale your portrait to Singapore ICA’s exact 400 × 514 pixel standard and compress under 150 KB JPG in your browser.',
    directAnswer: {
      title: 'Official Singapore ICA Digital Photo Specification (2026)',
      portalName: 'Immigration & Checkpoints Authority Singapore (ica.gov.sg)',
      summaryText:
        'Singapore’s Immigration & Checkpoints Authority (ICA) and Ministry of Manpower (MOM) require digital photos measuring 400 × 514 pixels (matching the 35 × 45 mm aspect ratio) in JPEG format under 150 KB (ICA online visa/Student’s Pass accepts up to 150 KB–1 MB depending on form; 150 KB passes every ICA and MOM portal). Background must be pure matte white with shoulders and hair fully visible.',
      specs: [
        { label: 'Exact Pixel Dimensions', value: '400 × 514 pixels', highlight: true },
        { label: 'File Size Ceiling', value: 'Under 150 KB JPEG', highlight: true },
        { label: 'Physical Equivalent', value: '35 × 45 mm Portrait' },
        { label: 'Recency Rule', value: 'Taken within last 3 months' },
      ],
    },
    toolProps: {
      from: 'jpg',
      to: 'jpg',
      fromMime: 'image/jpeg',
      toMime: 'image/jpeg',
      targetKb: 150,
      initialTool: 'passport',
      preset: 'sg-visa',
      category: 'visa',
    },
    specTable: {
      heading: 'Singapore Government Portal Photo Specifications',
      subheading: 'Verified dimensions across ICA, MyICA Mobile, and MOM Employment Pass systems:',
      columns: ['Singapore Portal', 'Pixel Dimensions', 'Max File Size', 'Key Requirement'],
      rows: [
        ['ICA Online Visa (SAVE Portal)', '400 × 514 px', 'Under 60–150 KB JPG', 'Pure white backdrop, dark attire'],
        ['Singapore Biometric Passport (APPLES)', '400 × 514 px (35×45 mm)', 'Under 150 KB–1 MB', 'No eyeglasses or colored contact lenses'],
        ['Student’s Pass / LTVP (ICA)', '400 × 514 px', 'Under 150 KB JPG', 'Taken within 3 months, both ears visible'],
        ['MOM Employment Pass / S Pass', '400 × 514 px', 'Under 150 KB JPG', 'Even lighting without specular forehead glare'],
      ],
    },
    guideSection: {
      heading: 'Why ICA Rejects Standard 413×531 px Photos on SAVE Uploads',
      paragraphs: [
        'Unlike European portals that accept flexible pixel counts around 300 DPI, Singapore’s legacy SAVE visa system and MOM pass uploaders explicitly check for 400 × 514 pixel geometry. Uploading a 413 × 531 px image or an uncompressed smartphone JPEG triggers an immediate dimension mismatch warning.',
        'PixelKit’s Singapore ICA preset resamples directly to 400 × 514 pixels and caps output bytes safely below 150 KB (or you can click 60 KB / 100 KB in Stage 3 if submitting through an authorized visa agent portal with tighter caps).',
      ],
      cards: [
        { title: 'Exact 400 × 514 px Lock', body: 'Matches Singapore SAVE, APPLES passport renewal, and MOM pass portals pixel-for-pixel.' },
        { title: '3-Month Recency Alert', body: 'ICA cross-checks previously used passport/pass photos—never reuse a photo older than 3 months.' },
        { title: 'Zero Server Retention', body: 'Your biometric face scan stays 100% inside your device’s browser sandbox.' },
      ],
    },
    faqs: [
      {
        q: 'Why does Singapore ICA specify 400 × 514 pixels?',
        a: '400 × 514 pixels preserves the exact 35:45 passport aspect ratio (400 / 514 ≈ 0.778, matching 35 / 45 ≈ 0.778) at ~290 DPI, which Singapore’s SAVE and APPLES biometric servers standardize on.',
      },
      {
        q: 'Are spectacles allowed in Singapore passport or ICA visa photos?',
        a: 'No. ICA strictly prohibits wearing spectacles/eyeglasses in passport and visa photos unless medically required with documentation, because lens rims obscure iris landmarks.',
      },
      {
        q: 'What if my authorized Singapore visa agent asks for under 60KB?',
        a: 'Simply type 60 in the Custom KB input inside Stage 3 while keeping the Singapore ICA preset active—PixelKit keeps 400 × 514 px and compresses strictly under 60 KB.',
      },
      {
        q: 'Can I wear white clothes against the white background?',
        a: 'Avoid white shirts or headscarves; ICA’s edge detector requires clear contrast between your shoulders/headgear and the plain white background.',
      },
    ],
    relatedLinks: [
      { title: 'Malaysia Passport Resizer', meta: '413×591 px · <100KB', desc: 'Malaysian Immigration MyOnline 35×50 mm preset.', href: '/malaysia-passport-photo-resizer/' },
      { title: 'Australia Passport Resizer', meta: '413×531 px · <200KB', desc: 'ImmiAccount & Australian passport standard.', href: '/australia-passport-photo-resizer/' },
      { title: 'China Visa Photo Resizer', meta: '390×567 px · 40–120KB', desc: 'Chinese COVA online visa photo tool.', href: '/china-visa-photo-resizer/' },
      { title: 'Japan Visa Photo Resizer', meta: '413×531 px · <200KB', desc: 'MOFA JAPAN eVISA & COE photo tool.', href: '/japan-visa-photo-resizer/' },
      { title: 'Compress Image to 150KB', meta: 'Strictly ≤ 150KB', desc: 'Dedicated 150KB binary-search compressor.', href: '/compress-image-to-150kb/' },
      { title: 'Passport Photo Resizer', meta: '30+ Global Presets', desc: 'Browse all consular and passport presets.', href: '/passport-photo-resizer/' },
    ],
  },

  {
    slug: 'malaysia-passport-photo-resizer',
    title: 'Malaysia Passport & eVisa Photo Resizer (35×50mm) | PixelKit',
    description:
      'Resize photos to official Malaysia MyOnline Passport & eVisa specs: 413×591 px (35×50 mm) under 100KB JPG. Free, 100% private in-browser photo tool.',
    keywords: [
      'malaysia passport photo resizer',
      'malaysia evisa photo size',
      '35x50mm photo in pixels',
      'myonline passport photo size',
      '413x591 pixels malaysia photo',
    ],
    badge: 'Jabatan Imigresen Malaysia · 35 × 50 mm · Under 100 KB',
    ogTitle: 'Malaysia Passport Photo Resizer',
    ogBadge: '413×591 PX (35×50 MM)',
    ogSubtitle: 'Official MyOnline Passport & Malaysia eVisa biometric standard',
    breadcrumbParent: { label: 'Passport & Visa Tools', href: '/passport-photo-resizer/' },
    breadcrumbLabel: 'Malaysia Passport Photo Resizer',
    h1: 'Malaysia Passport & eVisa Photo Resizer (35 × 50 mm)',
    heroSubtitle:
      'Crop to Malaysia’s taller 35 × 50 mm (413 × 591 px at 300 DPI) biometric frame and compress strictly under 100 KB JPG without uploading to any server.',
    directAnswer: {
      title: 'Official Malaysia MyOnline Passport & eVisa Photo Specs (2026)',
      portalName: 'Immigration Department of Malaysia (imigresen-online.imi.gov.my)',
      summaryText:
        'The Immigration Department of Malaysia (Jabatan Imigresen Malaysia) requires digital photographs measuring 35 mm wide by 50 mm tall (413 × 591 pixels at 300 DPI) in JPEG format under 100 KB (200 KB max on select eVisa forms; <100 KB clears both MyOnline Passport and eVisa). Applicants must wear dark clothing covering shoulders against a pure plain white background.',
      specs: [
        { label: 'Physical & Pixel Size', value: '35 × 50 mm (413 × 591 px)', highlight: true },
        { label: 'File Size Ceiling', value: 'Under 100 KB JPG', highlight: true },
        { label: 'Face Height Crown-Chin', value: '25–30 mm (Centered)' },
        { label: 'Dress Code Rule', value: 'Dark Clothing & Pure White BG' },
      ],
    },
    toolProps: {
      from: 'jpg',
      to: 'jpg',
      fromMime: 'image/jpeg',
      toMime: 'image/jpeg',
      targetKb: 100,
      initialTool: 'passport',
      preset: 'my-visa',
      category: 'visa',
    },
    specTable: {
      heading: 'Malaysia Immigration Digital Photo Rules',
      subheading: 'Key requirements enforced on MyOnline Passport and Malaysia eVisa portals:',
      columns: ['Specification', 'Official Malaysian Standard', 'Typical Mistake', 'How PixelKit Fixes It'],
      rows: [
        ['Canvas Size', '35 mm × 50 mm (413 × 591 px)', 'Using shorter 35 × 45 mm photo', 'Scales to exact 413 × 591 px frame'],
        ['Top Head Margin', '10 mm space from top edge to crown', 'Head cropped too close to top', 'Top-aware portrait crop alignment'],
        ['File Weight', 'Under 100 KB (JPG/JPEG)', '2–5 MB smartphone original', 'Binary-search encoding under 100 KB'],
        ['Attire & Hijab', 'Dark shirt / dark hijab (no white)', 'Light pastel shirt blending into wall', 'Preserves high tonal contrast in sRGB'],
      ],
    },
    guideSection: {
      heading: 'Why 35 × 50 mm Matters for Malaysian MyOnline Passport Renewals',
      paragraphs: [
        'Malaysia is one of the few countries whose passport frame is 35 × 50 mm rather than 35 × 45 mm, providing extra 10 mm headroom above the crown and clear shoulder visibility at the bottom. MyOnline Passport’s automated facial scanner frequently rejects standard 35 × 45 mm photos with "face position out of bounds" errors.',
        'With the Malaysia Passport & eVisa preset pre-selected, PixelKit exports exact 413 × 591 px dimensions at 300 DPI and keeps file weight below 100 KB—all inside your browser memory.',
      ],
      cards: [
        { title: 'Exact 35 × 50 mm Geometry', body: 'Outputs 413 × 591 px at 300 DPI to satisfy Jabatan Imigresen Malaysia’s taller portrait frame.' },
        { title: 'Hijab & Forehead Guidelines', body: 'Dark-colored hijabs are permitted provided eyebrows, eyes, chin, and full facial oval are unobstructed.' },
        { title: 'Instant Mobile Workflow', body: 'Snap a photo against a white wall on Android or iPhone and format it in seconds without installing apps.' },
      ],
    },
    faqs: [
      {
        q: 'What is 35 × 50 mm in pixels at 300 DPI for Malaysia passport?',
        a: 'Using Pixels = (mm ÷ 25.4) × 300, 35 mm equals 413 pixels and 50 mm equals 591 pixels. PixelKit outputs exact 413 × 591 px images automatically.',
      },
      {
        q: 'Why did MyOnline Passport Malaysia reject my photo?',
        a: 'The top three causes are wearing light-colored clothing instead of dark attire, insufficient 10 mm white margin above the hair crown, or uploading a 35 × 45 mm crop instead of 35 × 50 mm.',
      },
      {
        q: 'Does this preset also work for Malaysia eVisa and MDAC?',
        a: 'Yes. Malaysia eVisa accepts 35 × 50 mm studio-grade JPEG portraits under 100–200 KB, so this 413 × 591 px under-100 KB output passes cleanly.',
      },
      {
        q: 'Are my passport photos uploaded anywhere?',
        a: 'No. PixelKit runs 100% locally in your browser via Web Workers—zero files or facial biometrics ever leave your device.',
      },
    ],
    relatedLinks: [
      { title: 'Singapore Visa Resizer', meta: '400×514 px · <150KB', desc: 'Singapore ICA passport & SAVE visa preset.', href: '/singapore-visa-photo-resizer/' },
      { title: 'UAE & Dubai Visa Resizer', meta: '413×531 px · <100KB', desc: 'UAE ICP & GDRFA Dubai biometric photo resizer.', href: '/uae-visa-photo-resizer/' },
      { title: 'New Zealand Visa Resizer', meta: '450×600 px · 3:4', desc: 'Immigration New Zealand & NZeTA photo tool.', href: '/new-zealand-visa-photo-resizer/' },
      { title: 'MM to Pixels Converter', meta: '35×50 mm & 35×45 mm', desc: 'Convert any millimeter spec to 300 DPI pixels.', href: '/mm-to-pixels-converter/' },
      { title: 'Compress Image to 100KB', meta: 'Strictly ≤ 100KB', desc: 'Binary-search photo compressor under 100KB.', href: '/compress-image-to-100kb/' },
      { title: 'Passport Photo Resizer', meta: '30+ Global Presets', desc: 'Explore all official country passport presets.', href: '/passport-photo-resizer/' },
    ],
  },

  {
    slug: 'new-zealand-visa-photo-resizer',
    title: 'New Zealand Visa & NZeTA Photo Resizer (3:4) | PixelKit',
    description:
      'Resize photos to Immigration New Zealand & NZeTA 3:4 portrait specs (450×600 px / 900×1200 px, under 250KB JPG). 100% private in-browser resizer.',
    keywords: [
      'new zealand visa photo resizer',
      'nzeta photo size',
      'immigration new zealand photo requirements',
      '3:4 passport photo online',
      'nz passport photo resizer',
    ],
    badge: 'Immigration New Zealand & NZeTA · 3:4 Aspect · Under 250 KB',
    ogTitle: 'New Zealand Visa Photo Resizer',
    ogBadge: '3:4 PORTRAIT · UNDER 250KB',
    ogSubtitle: 'Immigration New Zealand online visa & NZeTA digital photo standard',
    breadcrumbParent: { label: 'Passport & Visa Tools', href: '/passport-photo-resizer/' },
    breadcrumbLabel: 'New Zealand Visa Photo Resizer',
    h1: 'New Zealand Visa & NZeTA Photo Resizer',
    heroSubtitle:
      'Format portraits to New Zealand’s mandatory 3:4 width-to-height aspect ratio and compress cleanly under 250 KB JPG for NZeTA and Immigration New Zealand.',
    directAnswer: {
      title: 'Official New Zealand Visa & NZeTA Photo Specification (2026)',
      portalName: 'Immigration New Zealand (immigration.govt.nz)',
      summaryText:
        'Immigration New Zealand (INZ) and the NZeTA travel authority require portrait-oriented JPEG images in a strict 3:4 aspect ratio. NZeTA accepts lightweight digital portraits under 250 KB–500 KB (450 × 600 px minimum), while full INZ online visa/passport portals accept 3:4 photos up to 900 × 1200 px. Contrast-rich light backgrounds (light grey, cream, or off-white—not harsh overexposed white) work best.',
      specs: [
        { label: 'Aspect Ratio', value: 'Strict 3:4 Portrait', highlight: true },
        { label: 'Preset Dimensions', value: '450 × 600 px (or 900 × 1200 px)' },
        { label: 'File Weight', value: 'Under 250 KB sRGB JPG', highlight: true },
        { label: 'Background Tone', value: 'Light Plain (No Shadows)' },
      ],
    },
    toolProps: {
      from: 'jpg',
      to: 'jpg',
      fromMime: 'image/jpeg',
      toMime: 'image/jpeg',
      targetKb: 250,
      initialTool: 'passport',
      preset: 'nz-visa',
      category: 'visa',
    },
    specTable: {
      heading: 'NZeTA vs Immigration New Zealand Full Online Visa',
      subheading: 'Choose the right pixel scale while maintaining the mandatory 3:4 ratio:',
      columns: ['Submission Portal', 'Aspect Ratio', 'Pixel Dimensions', 'Accepted File Size'],
      rows: [
        ['NZeTA Web & Mobile Upload', '3:4 Portrait', '450 × 600 px+', 'Under 250 KB – 10 MB JPG'],
        ['INZ Visitor / Student / Work Visa', '3:4 Portrait', '900 × 1200 px to 2250 × 3000 px', '500 KB to 3 MB JPG'],
        ['NZ Online Passport Renewal', '3:4 Portrait', '900 × 1200 px minimum', '250 KB to 10 MB JPG'],
        ['Printed Consular Paper Form', '35 × 45 mm', '413 × 531 px @ 300 DPI', 'Physical Matte Print'],
      ],
    },
    guideSection: {
      heading: 'Avoiding New Zealand’s 3:4 Aspect Ratio & Background Errors',
      paragraphs: [
        'New Zealand’s automated photo checker rejects standard 1:1 US square crops and 4:5 smartphone portraits because its validator strictly enforces a 3:4 width-to-height ratio. Additionally, INZ advises standing 0.5 meters in front of a light-colored wall to prevent harsh shadow halos behind the ears.',
        'PixelKit pre-locks the 3:4 New Zealand preset (450 × 600 px under 250 KB for instant NZeTA clearance). Need 900 × 1200 px above 500 KB for a full INZ residence visa? Switch to Stage 2 (900 × 1200 px) and set Exact 600 KB in Stage 3 in two clicks.',
      ],
      cards: [
        { title: 'Locked 3:4 Portrait Frame', body: 'Eliminates aspect-ratio rejection errors on both NZeTA and RealMe Immigration Online portals.' },
        { title: 'EXIF & Selfie Flip Check', body: 'Automatically normalizes EXIF orientation tags; make sure your front camera did not mirror facial moles.' },
        { title: '100% On-Device Processing', body: 'Travel documents and visa portraits remain completely private inside local browser memory.' },
      ],
    },
    faqs: [
      {
        q: 'Why does New Zealand require a 3:4 photo instead of 35×45 mm?',
        a: 'Digital New Zealand visa and passport systems standardized on the native 3:4 digital camera sensor ratio (e.g., 450×600 px or 900×1200 px) rather than metric print paper ratios.',
      },
      {
        q: 'What if Immigration New Zealand asks for a file larger than 500KB?',
        a: 'Full INZ visa applications sometimes enforce a 500 KB minimum at 900 × 1200 px. Simply open Stage 2 to enter 900 × 1200 px and choose Exact Size 600 KB in Stage 3.',
      },
      {
        q: 'Can I wear prescription glasses in an NZeTA photo?',
        a: 'New Zealand strongly recommends removing glasses; if worn for medical reasons, frames must not touch the eyes or cast any lens glare.',
      },
      {
        q: 'Does PixelKit work with iPhone HEIC photos for NZeTA?',
        a: 'Yes. Drop your .heic file straight into PixelKit; it converts locally to standard baseline .jpg in the 3:4 aspect ratio.',
      },
    ],
    relatedLinks: [
      { title: 'Australia Passport Resizer', meta: '413×531 px · <200KB', desc: 'Australian ImmiAccount & passport photo resizer.', href: '/australia-passport-photo-resizer/' },
      { title: 'UK Passport Photo Resizer', meta: 'HMPO & UKVI', desc: 'British passport & UKVI biometric photo studio.', href: '/uk-passport-photo-resizer/' },
      { title: 'Canada Visa Photo Resizer', meta: '420×540 px · <240KB', desc: 'IRCC Canada Express Entry & study permit preset.', href: '/canada-visa-photo-resizer/' },
      { title: 'Crop Image 3:4 Ratio', meta: 'Exact 3:4 Portrait', desc: 'Dedicated 3:4 portrait aspect ratio cropper.', href: '/crop-image-3-4/' },
      { title: 'Passport Photo Resizer', meta: '30+ Global Presets', desc: 'All official global passport and visa presets.', href: '/passport-photo-resizer/' },
      { title: 'Portal Photo Size Chart', meta: '50+ Official Specs', desc: 'Master specification table for visas and exams.', href: '/portal-photo-size-chart/' },
    ],
  },

  {
    slug: 'upsc-photo-resizer',
    title: 'UPSC Photo Resizer (350×450 px, 20KB–50KB JPG) | PixelKit',
    description:
      'Resize candidate photos for UPSC IAS, NDA, CDS & OTR portals: 350×450 px and strictly 20KB to 50KB JPG. 100% private in-browser exam photo tool.',
    keywords: [
      'upsc photo resizer',
      'upsc otr photo size 20kb to 50kb',
      'upsc ias photo compressor',
      '350x450 pixels upsc photo',
      'upsc civil services photo resizer online',
    ],
    badge: 'UPSC CSE · NDA · CDS · OTR · 20 KB to 50 KB Strict',
    ogTitle: 'UPSC Photo Resizer & Compressor',
    ogBadge: '350×450 PX · 20–50KB JPG',
    ogSubtitle: 'Pre-calibrated for UPSC Civil Services, NDA, CDS & OTR portals',
    breadcrumbParent: { label: 'Exam & Visa Tools', href: '/passport-photo-resizer/' },
    breadcrumbLabel: 'UPSC Photo Resizer',
    h1: 'UPSC Photo Resizer & OTR Compressor (20KB–50KB)',
    heroSubtitle:
      'Crop to 350 × 450 px (3.5 × 4.5 cm), lock the 20 KB to 50 KB file size bracket, and generate compliant JPG uploads for UPSC Civil Services, NDA, CDS, and OTR.',
    directAnswer: {
      title: 'Official UPSC Photograph Upload Specification (2026 Direct Answer)',
      portalName: 'Union Public Service Commission (upsconline.nic.in)',
      summaryText:
        'Union Public Service Commission (UPSC Civil Services IAS/IPS, NDA, CDS, CAPF, CMS, and One-Time Registration OTR) requires a recent candidate photograph in JPG/JPEG format taken within 10 days of application, featuring the candidate’s name and date printed at the bottom. Standard portal dimensions are 350 × 450 pixels (or 350 × 350 px to 1000 × 1000 px on select forms) with file size between 20 KB and 50 KB (up to 300 KB on OTR). Targeting 350 × 450 px inside 20–50 KB satisfies both strict 50 KB notices and 20–300 KB OTR slots.',
      specs: [
        { label: 'Preset Resolution', value: '350 × 450 px (3.5 × 4.5 cm)', highlight: true },
        { label: 'File Size Bracket', value: '20 KB to 50 KB JPG', highlight: true },
        { label: 'Face Occupancy', value: '75% of Canvas Area' },
        { label: 'Mandatory Slate', value: 'Candidate Name & Date at Bottom' },
      ],
    },
    toolProps: {
      from: 'jpg',
      to: 'jpg',
      fromMime: 'image/jpeg',
      toMime: 'image/jpeg',
      targetKb: 50,
      initialTool: 'passport',
      preset: 'exam-upsc',
      category: 'exam',
      initialSizeMode: 'range',
      minKb: 20,
      maxKb: 50,
    },
    specTable: {
      heading: 'Complete UPSC Online Application Upload Matrix',
      subheading: 'All three mandatory uploads on upsconline.nic.in:',
      columns: ['Upload Slot', 'Accepted Dimensions', 'File Size Window', 'Special UPSC Rule'],
      rows: [
        ['Candidate Photograph', '350 × 450 px (350–1000 px)', '20 KB – 50 KB (or 300 KB)', 'Name + Date of Photo printed clearly at bottom'],
        ['Candidate Signature', '280 × 140 px (350–1000 px)', '10 KB – 20 KB (or 300 KB)', 'Black ink on white paper; no capital-letter block sign'],
        ['Photo ID Proof PDF', 'A4 / ID Card Document', '20 KB – 300 KB PDF', 'Aadhaar, Voter ID, PAN, or Passport in PDF format'],
        ['Left Thumb Impression', '200 × 200 px (select forms)', '10 KB – 20 KB JPG', 'Blue/black stamp pad without smudged ridges'],
      ],
    },
    guideSection: {
      heading: 'Clearing UPSC OTR’s 75% Face Coverage & KB Range Checks',
      paragraphs: [
        'Recent UPSC notifications require the candidate’s face (including both ears) to occupy roughly three-fourths (75%) of the photograph area, along with a clean white strip at the bottom showing your full name and the date on which the photo was clicked.',
        'PixelKit pre-loads the UPSC Civil Services preset (`350 × 450 px`) paired with the `20 KB – 50 KB` range encoder so your JPG never drops below the 20 KB floor (even with a clean white background) and never breaches 50 KB.',
      ],
      cards: [
        { title: 'Dual-Bound 20–50 KB Safety', body: 'Automatically pads ultra-clean studio portraits above 20 KB while keeping detailed photos strictly ≤ 50 KB.' },
        { title: 'Crisp Name & Date Text', body: 'Chroma-aware JPEG encoding keeps small printed text at the bottom of your UPSC photo sharp and readable.' },
        { title: 'Zero Server Exposure', body: 'Your UPSC admit card portrait and identity documents stay 100% private in browser memory.' },
      ],
    },
    faqs: [
      {
        q: 'What if UPSC OTR asks for minimum 350×350 px and 20KB to 300KB?',
        a: '350 × 450 px at 35–48 KB satisfies both 350×350+ minimum pixel rules AND both 20–50 KB and 20–300 KB byte brackets simultaneously, so one file works everywhere.',
      },
      {
        q: 'Why did upsconline.nic.in reject my photo as less than 20KB?',
        a: 'Plain white backgrounds compress heavily in JPEG, sometimes shrinking a 350×450 px portrait to 14–18 KB. PixelKit’s 20–50 KB range mode boosts quality or adds compliant ISO padding so the file safely exceeds 20 KB.',
      },
      {
        q: 'How do I resize my UPSC signature and PDF ID card too?',
        a: 'Use our dedicated UPSC Signature Resizer for the 10–20 KB signature slot and Photo to PDF 200KB for your Aadhaar/PAN identity PDF.',
      },
      {
        q: 'Is my photo saved on PixelKit?',
        a: 'Never. Everything runs client-side in your browser tab with zero network uploads.',
      },
    ],
    relatedLinks: [
      { title: 'UPSC Signature Resizer', meta: '280×140 px · 10–20KB', desc: 'Dedicated UPSC CSE & OTR signature crop studio.', href: '/upsc-signature-resizer/' },
      { title: 'SSC Photo Resizer', meta: '350×450 px · 20–50KB', desc: 'SSC CGL, CHSL, MTS & GD photo resizer.', href: '/ssc-photo-resizer/' },
      { title: 'Resize Image 20KB to 50KB', meta: 'Exact 20–50KB Bracket', desc: 'Two-sided bracket compressor for all PSC exams.', href: '/resize-image-to-20kb-to-50kb/' },
      { title: 'Thumb Impression Resizer', meta: '200×200 px · 10–20KB', desc: 'Left Thumb Impression (LTI) resizer for exams.', href: '/thumb-impression-resizer/' },
      { title: 'Photo to PDF 200KB', meta: 'UPSC ID Card PDF', desc: 'Convert Aadhaar/PAN ID proof into <200KB PDF.', href: '/photo-to-pdf-200kb/' },
      { title: 'Increase Size to 50KB', meta: 'Fix <20KB Error', desc: 'Safely increase under-sized exam JPG files.', href: '/increase-image-size-to-50kb/' },
    ],
  },

  {
    slug: 'thumb-impression-resizer',
    title: 'Thumb Impression Resizer (10KB–20KB, 20–50KB) | PixelKit',
    description:
      'Resize Left Thumb Impression (LTI) scans to 200×200 px or 240×240 px and 10KB–20KB / 20KB–50KB JPG for IBPS, SBI, SSC & NEET. 100% private in browser.',
    keywords: [
      'left thumb impression resizer',
      'thumb impression size 20kb to 50kb',
      'thumbprint resizer 10kb to 20kb',
      'ibps thumb impression resizer',
      'neet thumb and finger impression resizer',
    ],
    badge: 'IBPS · SBI · SSC · RRB · NEET · 10–20 KB & 20–50 KB LTI',
    ogTitle: 'Thumb Impression Resizer (LTI)',
    ogBadge: '200×200 PX · 10–20KB JPG',
    ogSubtitle: 'Biometric Left Thumb Impression resizer for IBPS, SBI, SSC & NEET',
    breadcrumbParent: { label: 'Exam & Visa Tools', href: '/passport-photo-resizer/' },
    breadcrumbLabel: 'Thumb Impression Resizer',
    h1: 'Left Thumb Impression (LTI) Resizer & Compressor',
    heroSubtitle:
      'Crop excess paper margins, scale to 200 × 200 px (or 240 × 240 px), and lock file weight between 10 KB and 20 KB (or 20–50 KB) JPG with sharp ridge lines.',
    directAnswer: {
      title: 'Official Left Thumb Impression (LTI) Upload Specs (2026)',
      portalName: 'IBPS / SBI / SSC / RRB / NTA Recruitment Portals',
      summaryText:
        'Government and banking exam portals require a clean Left Thumb Impression (LTI) pressed in blue or black stamp ink on white paper in JPG/JPEG format. Standard dimensions are 200 × 200 px (1:1 square, 10 KB to 20 KB for SSC/RRB/police exams) or 240 × 240 px / 3 × 3 cm (20 KB to 50 KB at 200 DPI for IBPS PO, Clerk, and SBI). If a candidate does not have a left thumb, the right thumb impression may be used per official notification rules.',
      specs: [
        { label: 'Default LTI Preset', value: '200 × 200 px (1:1 Square)', highlight: true },
        { label: 'File Size Bracket', value: '10 KB to 20 KB JPG (Switchable)', highlight: true },
        { label: 'IBPS / SBI Option', value: '240 × 240 px · 20–50 KB' },
        { label: 'Ink Color', value: 'Blue or Black Stamp Pad on White' },
      ],
    },
    toolProps: {
      from: 'jpg',
      to: 'jpg',
      fromMime: 'image/jpeg',
      toMime: 'image/jpeg',
      targetKb: 20,
      initialTool: 'passport',
      preset: 'thumbprint',
      category: 'exam',
      initialSizeMode: 'range',
      minKb: 10,
      maxKb: 20,
    },
    specTable: {
      heading: 'Thumb Impression Specifications Across Indian Exams',
      subheading: 'Verify whether your notification mandates 10–20 KB or 20–50 KB:',
      columns: ['Exam / Authority', 'Pixel Dimensions', 'File Size Bracket', 'Ink & Scan Rule'],
      rows: [
        ['SSC / State Police / Defence', '200 × 200 px (1:1)', '10 KB – 20 KB JPG', 'Clear whorl/ridge lines on white paper'],
        ['IBPS PO, Clerk, SO & RRB', '240 × 240 px (3 × 3 cm)', '20 KB – 50 KB JPG', '200 DPI blue or black ink, not smudged'],
        ['SBI PO & SBI Junior Associates', '240 × 240 px (3 × 3 cm)', '20 KB – 50 KB JPG', 'Left thumb rolled lightly without blotches'],
        ['NTA NEET-UG Fingers & Thumb', 'Full 10-Finger Panel', '10 KB – 200 KB JPG', 'All left & right fingers + thumbs clearly visible'],
      ],
    },
    guideSection: {
      heading: 'How to Capture a Clean, Non-Smudged Thumbprint on Your Phone',
      paragraphs: [
        'Pressing too hard onto a wet ink pad fills the fine friction ridges of your thumb, producing a solid dark blob that biometric verification software rejects as an invalid scan. Tap your thumb lightly onto the pad, do a test press on scrap paper first, and press the second lighter impression onto clean unruled white paper.',
        'Photograph the impression under bright daylight without phone shadow, drop it into PixelKit, and crop tightly around the print. Our 10–20 KB range compressor keeps fine ridge contrast intact while guaranteeing exact byte compliance.',
      ],
      cards: [
        { title: 'Switch to 20–50 KB in 1 Click', body: 'Applying for IBPS or SBI? Change Min–Max in Stage 3 to 20 KB – 50 KB and width/height to 240 × 240 px.' },
        { title: 'Zero Biometric Data Risk', body: 'Fingerprint scans are permanent biometric identifiers—never upload them to cloud servers. PixelKit runs 100% locally.' },
        { title: 'Optional Grayscale Mode', body: 'Toggle B&W Document mode in Fine-Tune settings to boost contrast on faint phone photos.' },
      ],
    },
    faqs: [
      {
        q: 'Why is my cropped thumb impression coming out at only 6KB?',
        a: 'Small 200 × 200 px white-paper images contain very little color entropy, often compressing below 10 KB. PixelKit’s 10–20 KB range mode automatically keeps the file safely between 12 KB and 19 KB.',
      },
      {
        q: 'Should I use blue ink or black ink for IBPS and SBI thumb impressions?',
        a: 'Both blue and black stamp pad inks are officially accepted by IBPS and SBI notifications, provided the impression is made on clean white paper and is not smudged.',
      },
      {
        q: 'How do I switch from 10–20KB to IBPS 20–50KB?',
        a: 'In Stage 3 (Target File Size), type 20 in Min KB and 50 in Max KB, and optionally set 240 × 240 px in Stage 2.',
      },
      {
        q: 'Is it safe to process my biometric thumbprint here?',
        a: 'Yes—100% of pixel decoding and encoding happens inside your local browser memory with zero network transmissions.',
      },
    ],
    relatedLinks: [
      { title: 'IBPS Photo & Signature Studio', meta: 'Photo · Sign · LTI', desc: 'Complete IBPS PO/Clerk upload suite.', href: '/ibps-photo-signature-resizer/' },
      { title: 'SBI PO Photo Resizer', meta: '200×230 px · 20–50KB', desc: 'State Bank of India recruitment upload tool.', href: '/sbi-po-photo-resizer/' },
      { title: 'Signature Resizer 10–20KB', meta: '280×140 px · 10–20KB', desc: 'Strict 10KB–20KB signature crop & compressor.', href: '/signature-resizer-10kb-to-20kb/' },
      { title: 'Increase Size to 20KB', meta: 'Fix <10KB Scans', desc: 'Boost tiny thumbprint/signature files to 20KB.', href: '/increase-image-size-to-20kb/' },
      { title: 'Compress Image to 20KB', meta: 'Strictly ≤ 20KB', desc: 'Binary-search 20KB image compressor.', href: '/compress-image-to-20kb/' },
      { title: 'UPSC Photo Resizer', meta: '350×450 px · 20–50KB', desc: 'UPSC Civil Services & OTR photo studio.', href: '/upsc-photo-resizer/' },
    ],
  },

  // ==========================================================
  // 2. PRINT & SCREEN DPI CONVERTERS (4 PAGES)
  // ==========================================================
  {
    slug: 'change-image-dpi-to-200',
    title: 'Change Image DPI to 200 Online (Free & Lossless) | PixelKit',
    description:
      'Convert JPG and PNG images to exact 200 DPI online without blur or server uploads. Ideal for PAN card (NSDL/UTIITSL), IBPS, SBI & NTA portal forms.',
    keywords: [
      'change image dpi to 200',
      'convert image to 200 dpi online',
      '200 dpi converter for pan card',
      'ibps 200 dpi photo converter',
      'set jpg dpi to 200',
    ],
    badge: '200 DPI Header Calibration · PAN Card, IBPS & SBI Standard',
    ogTitle: 'Change Image DPI to 200',
    ogBadge: 'LOSSLESS 200 DPI HEADER',
    ogSubtitle: 'Exact JFIF & PNG pHYs 200 DPI calibration for PAN, IBPS & SBI',
    breadcrumbParent: { label: 'Print & DPI Tools', href: '/change-image-dpi-to-300/' },
    breadcrumbLabel: 'Change Image DPI to 200',
    h1: 'Change Image DPI to 200 Online',
    heroSubtitle:
      'Write exact 200 DPI density metadata into JPG (JFIF APP0) and PNG (pHYs) files locally in milliseconds—pre-selected for NSDL/UTIITSL PAN cards, IBPS, and SBI portals.',
    directAnswer: {
      title: 'How to Convert an Image to 200 DPI for Online Portals (Direct Answer)',
      summaryText:
        'Many Indian government and banking portals—including Protean NSDL & UTIITSL PAN Card, IBPS PO/Clerk, SBI Recruitment, and NTA JEE/NEET—explicitly mandate 200 DPI scanner resolution. PixelKit injects exact 200 × 200 DPI JFIF byte markers (0x00, 0xC8) into JPGs and 7,874 pixels-per-meter pHYs chunks into PNGs directly inside your browser without blurring pixels.',
      specs: [
        { label: 'Pre-Selected Density', value: '200 × 200 DPI (Dots Per Inch)', highlight: true },
        { label: 'Supported Headers', value: 'JPEG JFIF APP0 & PNG pHYs' },
        { label: 'Portal Compatibility', value: 'NSDL PAN, UTIITSL, IBPS, SBI, GATE', highlight: true },
        { label: 'Privacy Architecture', value: '100% Client-Side RAM Execution' },
      ],
    },
    toolProps: {
      from: 'jpg',
      to: 'jpg',
      fromMime: 'image/jpeg',
      toMime: 'image/jpeg',
      targetKb: null,
      initialTool: 'dpi',
      initialDpi: 200,
    },
    specTable: {
      heading: 'Portals Explicitly Requiring 200 DPI Resolution',
      subheading: 'Official upload validators that inspect embedded 200 DPI density headers:',
      columns: ['Portal / Agency', 'Document Slot', 'Required Dimensions', 'Required DPI & Size'],
      rows: [
        ['Protean NSDL & UTIITSL PAN', 'Photo & Signature', '213×213 px (2.5×3.5 cm @ 200 DPI)', '200 DPI · Under 50 KB JPG'],
        ['IBPS PO / Clerk / RRB', 'Photo, Sign, LTI & Declaration', '200×230 px / 140×60 px', '200 DPI · 20–50 KB / 10–20 KB'],
        ['SBI PO & Junior Associates', 'Photo, Sign & Thumbprint', '200×230 px / 240×240 px', '200 DPI · 20–50 KB JPG'],
        ['Sarathi Parivahan (Driving Licence)', 'Applicant Photo & Sign', '413×531 px', '200 DPI · 10–20 KB JPG'],
      ],
    },
    guideSection: {
      heading: 'Why Smartphone Photos Fail 200 DPI Portal Checks',
      paragraphs: [
        'Smartphones save camera photos at a default metadata tag of 72 DPI or 96 DPI even when the image has 12 megapixels of sharpness. Strict Java/.NET validation scripts on NSDL, UTIITSL, and IBPS portals inspect the 14-byte JFIF header and reject files whose Xdensity/Ydensity fields do not read 200.',
        'With 200 DPI pre-selected above, simply drop your JPG, PNG, or HEIC file. You can keep original pixel dimensions or simultaneously lock a KB cap (like 50 KB for PAN or 20 KB for signatures) in one pass.',
      ],
      cards: [
        { title: 'Exact Binary Header Stamp', body: 'Writes Xdensity = 200 and Ydensity = 200 directly into the JPEG JFIF segment.' },
        { title: 'Combine DPI + KB Cap', body: 'Need 200 DPI AND under 50 KB? Turn on a KB limit in Stage 3 while 200 DPI stays locked.' },
        { title: 'Zero Server Uploads', body: 'PAN cards, signatures, and KYC scans stay 100% private on your computer or phone.' },
      ],
    },
    faqs: [
      {
        q: 'Does changing an image from 72 DPI to 200 DPI make it blurry?',
        a: 'No. Updating the DPI header alone leaves pixel width and height untouched—only the physical print scale metadata changes unless you also choose physical cm/mm resizing in Stage 2.',
      },
      {
        q: 'What is 3.5 × 2.5 cm at 200 DPI in pixels for UTIITSL PAN?',
        a: 'At 200 DPI, 2.5 cm wide equals 197 pixels and 3.5 cm tall equals 276 pixels (while NSDL digital crops use 213 × 213 px at 200/300 DPI). Both can be set in Stage 2.',
      },
      {
        q: 'How can I verify that my downloaded JPG is now 200 DPI?',
        a: 'On Windows, right-click the downloaded JPG → Properties → Details tab: Horizontal resolution and Vertical resolution will both display "200 dpi".',
      },
      {
        q: 'Can I batch-convert multiple documents to 200 DPI at once?',
        a: 'Yes. Drag and drop your photo, signature, and thumbprint together and export all 200 DPI files in a single click.',
      },
    ],
    relatedLinks: [
      { title: 'Change Image DPI to 300', meta: '300 DPI Print Standard', desc: 'Standard 300 DPI passport & offset print converter.', href: '/change-image-dpi-to-300/' },
      { title: 'Change Image DPI to 600', meta: '600 DPI Archival', desc: 'High-density 600 DPI line-art and OCR converter.', href: '/change-image-dpi-to-600/' },
      { title: 'Change Image DPI to 150', meta: '150 DPI Document Scan', desc: 'Compact A4 PDF & office document DPI preset.', href: '/change-image-dpi-to-150/' },
      { title: 'PAN Card Photo Resizer', meta: '213×213 px · <50KB', desc: 'Pre-calibrated NSDL & UTIITSL PAN studio.', href: '/pan-card-photo-resizer/' },
      { title: 'IBPS Photo & Signature', meta: '200 DPI Pre-Tuned', desc: 'All 4 IBPS application uploads in one tool.', href: '/ibps-photo-signature-resizer/' },
      { title: 'Change Image DPI to 72', meta: '72 DPI Web Screen', desc: 'Web & email screen density converter.', href: '/change-image-dpi-to-72/' },
    ],
  },

  {
    slug: 'change-image-dpi-to-600',
    title: 'Change Image DPI to 600 Online (High-Res Print) | PixelKit',
    description:
      'Convert images to 600 DPI online for archival scanning, patent line art, medical journals & fine print. 100% client-side JFIF/PNG pHYs calibration.',
    keywords: [
      'change image dpi to 600',
      'convert image to 600 dpi online',
      '600 dpi converter',
      'scientific journal figure 600 dpi',
      'patent drawing 600 dpi jpg png',
    ],
    badge: '600 DPI Archival & Journal Publishing Standard · Zero Upload',
    ogTitle: 'Change Image DPI to 600',
    ogBadge: '600 DPI ARCHIVAL GRADE',
    ogSubtitle: 'Academic journals, USPTO/EPO line art & fine-print DPI stamp',
    breadcrumbParent: { label: 'Print & DPI Tools', href: '/change-image-dpi-to-300/' },
    breadcrumbLabel: 'Change Image DPI to 600',
    h1: 'Change Image DPI to 600 Online',
    heroSubtitle:
      'Stamp exact 600 DPI print metadata into scientific figures, monochrome line-art diagrams, OCR scans, and fine-art prints directly inside your browser.',
    directAnswer: {
      title: 'When & How to Set Image Resolution to 600 DPI (Direct Answer)',
      summaryText:
        'Peer-reviewed academic publishers (Elsevier, Springer Nature, IEEE), patent offices (USPTO, EPO, Indian Patent Office), and archival print houses require 600 DPI metadata for line-art schematics, vector diagrams rasterized to PNG/JPG, and monochrome text scans. PixelKit embeds exact 600 DPI JFIF (0x02, 0x58) and PNG pHYs (23,622 px/m) headers locally in browser RAM.',
      specs: [
        { label: 'Target Density', value: '600 × 600 DPI (236.22 px/cm)', highlight: true },
        { label: 'Supported Formats', value: 'PNG (Lossless pHYs) & JPG (JFIF)' },
        { label: 'Primary Use Cases', value: 'Journals, Patents, Line Art & OCR', highlight: true },
        { label: 'Confidentiality', value: '100% Local — Safe for Unpublished IP' },
      ],
    },
    toolProps: {
      from: 'png',
      to: 'png',
      fromMime: 'image/png',
      toMime: 'image/png',
      targetKb: null,
      initialTool: 'dpi',
      initialDpi: 600,
    },
    specTable: {
      heading: '600 DPI Pixel Equivalents for Standard Print Sizes',
      subheading: 'Required pixel dimensions when preparing true 600 DPI physical artwork:',
      columns: ['Print Format', 'Physical Size', 'Pixels at 300 DPI', 'Pixels at 600 DPI'],
      rows: [
        ['Single-Column Journal Figure', '8.5 cm (3.35 in) wide', '1004 px wide', '2008 px wide'],
        ['Full-Width Journal Figure', '17.5 cm (6.89 in) wide', '2067 px wide', '4134 px wide'],
        ['Passport / ID Archival Scan', '35 × 45 mm', '413 × 531 px', '827 × 1063 px'],
        ['A4 Archival Document Page', '210 × 297 mm (8.27 × 11.69 in)', '2480 × 3508 px', '4961 × 7016 px'],
      ],
    },
    guideSection: {
      heading: 'Submitting Unpublished Research & Patent Figures Privately',
      paragraphs: [
        'Matplotlib, R ggplot2, Illustrator, and Figma exports frequently default to 72 or 96 DPI metadata even when exported at 4000+ pixels wide, causing Editorial Manager and ScholarOne manuscript portals to flag figures as "low resolution".',
        'Because unpublished manuscripts and pre-filing patent drawings are confidential intellectual property, uploading them to ad-supported cloud converters risks premature disclosure. PixelKit updates the 600 DPI header 100% inside your local browser memory.',
      ],
      cards: [
        { title: 'PNG Lossless pHYs Support', body: 'Preserves crisp 100% lossless PNG edges for charts and plots while embedding 23,622 pixels/meter (600 DPI).' },
        { title: 'SVG to 600 DPI PNG Ready', body: 'Drop an SVG plot directly and convert to PNG with 600 DPI metadata in one clean step.' },
        { title: 'Zero IP Leakage', body: 'Zero bytes leave your workstation—safe for embargoed clinical, academic, and patent figures.' },
      ],
    },
    faqs: [
      {
        q: 'Why did Editorial Manager flag my 4000 px PNG plot as 72 DPI?',
        a: 'Submission portals divide pixel width by the embedded PNG pHYs density tag to verify physical print width. Stamping 600 DPI tells the portal your 4000 px figure prints crisply at 6.67 inches wide at 600 DPI.',
      },
      {
        q: 'Should I use PNG or JPG for 600 DPI scientific line art?',
        a: 'Use PNG whenever allowed—lossless DEFLATE encoding keeps black text, axes, and thin curves completely free of JPEG ringing artifacts.',
      },
      {
        q: 'Does setting 600 DPI upsample my pixels automatically?',
        a: 'By default, Stage 5 updates the DPI metadata losslessly without altering pixel dimensions. If you also want to rescale to a physical cm/inch width at 600 DPI, enter your target cm or inches in Stage 2.',
      },
      {
        q: 'What is 1 millimeter in pixels at 600 DPI?',
        a: 'At 600 DPI, 1 inch (25.4 mm) equals 600 pixels, so 1 mm equals 23.622 pixels (twice the density of 300 DPI).',
      },
    ],
    relatedLinks: [
      { title: 'Change Image DPI to 300', meta: '300 DPI Standard', desc: 'Standard 300 DPI color photo & print calibration.', href: '/change-image-dpi-to-300/' },
      { title: 'Change Image DPI to 200', meta: '200 DPI Portal Spec', desc: 'PAN card, IBPS, and SBI 200 DPI converter.', href: '/change-image-dpi-to-200/' },
      { title: 'Change Image DPI to 150', meta: '150 DPI Office Scan', desc: 'Balanced 150 DPI document scan converter.', href: '/change-image-dpi-to-150/' },
      { title: 'SVG to PNG Converter', meta: 'Vector Rasterizer', desc: 'Render crisp high-resolution PNGs from SVG plots.', href: '/svg-to-png/' },
      { title: 'CM to Pixels at 300 DPI', meta: 'Print Math Calculator', desc: 'Calculate exact pixel widths for any DPI.', href: '/cm-to-pixels-at-300-dpi/' },
      { title: 'MM to Pixels Converter', meta: 'Millimeter Calculator', desc: 'Convert journal column widths in mm to pixels.', href: '/mm-to-pixels-converter/' },
    ],
  },

  {
    slug: 'change-image-dpi-to-150',
    title: 'Change Image DPI to 150 Online (Document Scans) | PixelKit',
    description:
      'Convert JPG and PNG scans to 150 DPI online in browser. Ideal for lightweight A4 document scans, Aadhaar/KYC attachments, and office PDFs.',
    keywords: [
      'change image dpi to 150',
      'convert image to 150 dpi online',
      '150 dpi document scan converter',
      'set jpg to 150 dpi',
      'aadhaar scan 150 dpi',
    ],
    badge: '150 DPI Document & KYC Scan Standard · 100% Client-Side',
    ogTitle: 'Change Image DPI to 150',
    ogBadge: '150 DPI DOCUMENT SCAN',
    ogSubtitle: 'Lightweight A4 certificate, marksheet & KYC density calibration',
    breadcrumbParent: { label: 'Print & DPI Tools', href: '/change-image-dpi-to-300/' },
    breadcrumbLabel: 'Change Image DPI to 150',
    h1: 'Change Image DPI to 150 Online',
    heroSubtitle:
      'Calibrate certificates, marksheets, and A4 document scans to 150 DPI—the official middle-ground standard for UIDAI Aadhaar, scholarship portals, and compact PDFs.',
    directAnswer: {
      title: 'Why 150 DPI Is the Sweet Spot for Full-Page Document Uploads',
      summaryText:
        'Scanning an A4 page at 300 DPI produces an 8.7-megapixel canvas (2480 × 3508 px) that struggles to fit under strict 100 KB or 200 KB portal limits without heavy JPEG artifacts. At 150 DPI (1240 × 1754 px for A4), 10-point body text and QR codes remain 100% readable while cutting raw pixel count by 75%. PixelKit stamps exact 150 DPI headers locally in your browser.',
      specs: [
        { label: 'Pre-Selected Density', value: '150 × 150 DPI (59.06 px/cm)', highlight: true },
        { label: 'A4 Canvas at 150 DPI', value: '1240 × 1754 pixels' },
        { label: 'Ideal Target Size', value: '100 KB – 300 KB Certificates', highlight: true },
        { label: 'Execution', value: 'Zero-Upload Browser Web Workers' },
      ],
    },
    toolProps: {
      from: 'jpg',
      to: 'jpg',
      fromMime: 'image/jpeg',
      toMime: 'image/jpeg',
      targetKb: null,
      initialTool: 'dpi',
      initialDpi: 150,
    },
    specTable: {
      heading: '150 DPI vs 300 DPI for Multi-Page & Full-Sheet Documents',
      subheading: 'How 150 DPI keeps full-page certificates crisp inside tight KB limits:',
      columns: ['Document Size', 'Pixels at 150 DPI', 'Pixels at 300 DPI', 'Recommended KB Cap'],
      rows: [
        ['A4 Marksheet / Degree (21×29.7 cm)', '1240 × 1754 px', '2480 × 3508 px', '150 KB – 300 KB'],
        ['US Letter Tax / Visa Form (8.5×11")', '1275 × 1650 px', '2550 × 3300 px', '150 KB – 300 KB'],
        ['Aadhaar / Voter ID Card Scan', '500 × 318 px (CR80)', '1011 × 638 px', '50 KB – 100 KB'],
        ['4 × 6 Inch Postcard / Receipt', '600 × 900 px', '1200 × 1800 px', '80 KB – 150 KB'],
      ],
    },
    guideSection: {
      heading: 'Combining 150 DPI Metadata with PDF or KB Compression',
      paragraphs: [
        'UIDAI myAadhaar, National Scholarship Portal (NSP), and university counseling portals routinely recommend "scan original documents in color at 150–200 DPI". If you photographed your marksheet with a smartphone, updating its DPI header to 150 DPI ensures automated intake checks pass.',
        'Need the output as a PDF under 200 KB instead of a JPG? Simply switch Output Format in Stage 1 to PDF and select 200 KB in Stage 3 while 150 DPI remains active.',
      ],
      cards: [
        { title: '75% Fewer Raw Pixels than 300 DPI', body: 'When paired with physical cm/mm resizing in Stage 2, 150 DPI produces crisp, ultra-compact document scans.' },
        { title: 'Instant Header Update', body: 'Updates JFIF APP0 and PNG pHYs headers in under 10 milliseconds without cloud uploads.' },
        { title: 'Safe for Marksheets & IDs', body: 'Academic transcripts, caste certificates, and income proofs never leave your browser.' },
      ],
    },
    faqs: [
      {
        q: 'Is 150 DPI clear enough for A4 marksheets and QR codes?',
        a: 'Yes. At 150 DPI an A4 sheet measures 1240 × 1754 pixels, rendering standard 8pt–12pt printed text and Aadhaar QR codes cleanly while easily compressing under 200 KB.',
      },
      {
        q: 'How do I resize an A4 smartphone photo to true 150 DPI pixels?',
        a: 'Open Stage 2 (Resize Dimensions), select "cm", enter 21 × 29.7 cm at 150 DPI, and PixelKit automatically resamples the canvas to 1240 × 1754 px with a 150 DPI header.',
      },
      {
        q: 'Does changing DPI to 150 alone reduce file size in KB?',
        a: 'Changing metadata alone keeps byte size virtually identical; to also shrink file weight, pick a KB ceiling (such as 100 KB or 200 KB) in Stage 3.',
      },
      {
        q: 'Can I export 150 DPI PNG as well as JPG?',
        a: 'Yes. PixelKit writes standard PNG pHYs density chunks (5,906 pixels/meter = 150 DPI) and JPEG JFIF headers alike.',
      },
    ],
    relatedLinks: [
      { title: 'Change Image DPI to 200', meta: '200 DPI Portal Standard', desc: 'PAN card, IBPS & SBI 200 DPI converter.', href: '/change-image-dpi-to-200/' },
      { title: 'Change Image DPI to 300', meta: '300 DPI Print Standard', desc: 'High-resolution 300 DPI passport & print tool.', href: '/change-image-dpi-to-300/' },
      { title: 'Aadhaar PDF Compressor', meta: 'Under 100KB / 2MB', desc: 'Compress UIDAI POI/POA scans privately.', href: '/aadhaar-pdf-compressor/' },
      { title: 'Image to PDF 200KB', meta: 'Certificate to PDF', desc: 'Convert marksheet photos into <200KB PDFs.', href: '/image-to-pdf-200kb/' },
      { title: 'Change Image DPI to 72', meta: '72 DPI Web Screen', desc: 'Standard web & email display DPI preset.', href: '/change-image-dpi-to-72/' },
      { title: 'Change Image DPI to 600', meta: '600 DPI Archival', desc: 'Academic journal & line-art 600 DPI preset.', href: '/change-image-dpi-to-600/' },
    ],
  },

  {
    slug: 'change-image-dpi-to-72',
    title: 'Change Image DPI to 72 Online (Web & Screen DPI) | PixelKit',
    description:
      'Convert images from 300 DPI to 72 DPI online for websites, Shopify, WordPress, newsletters & UI assets. Instant lossless browser DPI calibration.',
    keywords: [
      'change image dpi to 72',
      'convert 300 dpi to 72 dpi online',
      '72 dpi image converter',
      'web resolution 72 dpi jpg png',
      'email signature 72 dpi fix',
    ],
    badge: '72 DPI Web, CMS & Email Display Standard · Instant Client-Side',
    ogTitle: 'Change Image DPI to 72',
    ogBadge: '72 DPI WEB & EMAIL',
    ogSubtitle: 'Normalize 300 DPI scans to 72 DPI for Outlook, CMS & web assets',
    breadcrumbParent: { label: 'Print & DPI Tools', href: '/change-image-dpi-to-300/' },
    breadcrumbLabel: 'Change Image DPI to 72',
    h1: 'Change Image DPI to 72 Online (300 DPI to 72 DPI)',
    heroSubtitle:
      'Normalize print-grade 300 DPI or 600 DPI images to standard 72 DPI screen density so Outlook email signatures, Word documents, and legacy CMS tools render at 1:1 pixel scale.',
    directAnswer: {
      title: 'Why Convert 300 DPI Images to 72 DPI for Web & Email?',
      summaryText:
        'While modern CSS browsers render images by pixel width, Microsoft Outlook desktop clients, Word/PDF generators, and legacy e-commerce CMS validators calculate display size using embedded DPI metadata—causing a 300 DPI logo to appear tiny or a 72 DPI check to fail. PixelKit sets exact 72 × 72 DPI headers (2,835 px/m) locally in milliseconds.',
      specs: [
        { label: 'Pre-Selected Density', value: '72 × 72 DPI (Screen Standard)', highlight: true },
        { label: 'Header Formats', value: 'JPEG JFIF APP0 & PNG pHYs' },
        { label: 'Fixes Display Bugs In', value: 'Outlook Signatures, PDFs & CMS', highlight: true },
        { label: 'Privacy', value: '100% In-Browser · Zero Uploads' },
      ],
    },
    toolProps: {
      from: 'jpg',
      to: 'jpg',
      fromMime: 'image/jpeg',
      toMime: 'image/jpeg',
      targetKb: null,
      initialTool: 'dpi',
      initialDpi: 72,
    },
    specTable: {
      heading: '72 DPI vs 300 DPI Behaviour Across Digital Platforms',
      subheading: 'Where 72 DPI metadata makes a real difference in layout rendering:',
      columns: ['Platform / Software', '300 DPI Image Behaviour', '72 DPI Image Behaviour', 'Best Workflow'],
      rows: [
        ['Classic Outlook Email Signature', 'Scales logo down or blows up layout', 'Renders cleanly at intended 1:1 size', 'Set 72 DPI + exact px width'],
        ['HTML-to-PDF / wkhtmltopdf', 'Interprets physical inch width from DPI', 'Matches CSS pixel dimensions predictably', 'Normalize assets to 72/96 DPI'],
        ['Webflow / Shopify / WordPress', 'Displays by px, carries extra EXIF', 'Clean baseline asset with stripped EXIF', 'Set 72 DPI + WebP/JPG optimize'],
        ['Legacy Stock & Ad Portals', 'Flags non-72 DPI display banners', 'Clears automated banner spec check', 'Lock 72 DPI + KB cap'],
      ],
    },
    guideSection: {
      heading: 'Optimize Both 72 DPI Metadata & Core Web Vitals Byte Weight',
      paragraphs: [
        'Designers exporting banners from Photoshop or InDesign print templates often leave 300 DPI metadata and bulky ICC color profiles attached. In desktop email clients like Windows Outlook, DPI mismatches are the #1 cause of giant or shrunken company signature logos.',
        'Drop your PNG or JPG banner above with 72 DPI pre-selected. To also slash page-load kilobytes for Core Web Vitals (LCP), combine 72 DPI with Lossless Quality or WebP output in a single local pass.',
      ],
      cards: [
        { title: 'Fixes Outlook Signature Scaling', body: 'Prevents Windows Outlook from rescaling 300 DPI PNG company logos using Word’s point-to-inch engine.' },
        { title: 'Strips Bloated Print Profiles', body: 'Re-encodes clean sRGB web assets without multi-megabyte CMYK/print metadata.' },
        { title: 'Batch Asset Pipeline', body: 'Drop an entire folder of product thumbnails or email graphics and export a single ZIP.' },
      ],
    },
    faqs: [
      {
        q: 'Does changing 300 DPI to 72 DPI shrink file size automatically?',
        a: 'Updating the 14-byte DPI header alone does not discard pixels. To reduce file size for faster web loading, also enable Lossless Quality or a KB target in Stage 3 or resize pixel width in Stage 2.',
      },
      {
        q: 'Why does my PNG email signature look huge or tiny in Outlook?',
        a: 'Windows Outlook uses Microsoft Word’s rendering engine, which reads the PNG pHYs DPI chunk to compute physical points. Stamping 72 DPI (or 96 DPI) alongside exact pixel dimensions fixes this.',
      },
      {
        q: 'Can I convert 300 DPI TIFF or PSD exports to 72 DPI JPG/PNG?',
        a: 'Yes! Drop TIFF, PNG, WebP, or JPG files straight into PixelKit and export clean 72 DPI JPG or PNG files locally.',
      },
      {
        q: 'Are client brand assets uploaded to any external server?',
        a: 'Never. All image processing runs inside local browser Web Workers on your machine.',
      },
    ],
    relatedLinks: [
      { title: 'Change Image DPI to 300', meta: '300 DPI Print Standard', desc: 'Convert 72 DPI web images to 300 DPI print.', href: '/change-image-dpi-to-300/' },
      { title: 'Change Image DPI to 150', meta: '150 DPI Document Scan', desc: 'Balanced 150 DPI density for PDF scans.', href: '/change-image-dpi-to-150/' },
      { title: 'Change Image DPI to 200', meta: '200 DPI Portal Standard', desc: 'PAN card, IBPS & SBI 200 DPI preset.', href: '/change-image-dpi-to-200/' },
      { title: 'Compress Without Quality Loss', meta: 'SSIM > 0.98 Web', desc: 'Shrink web images 70–85% with zero blur.', href: '/compress-image-without-losing-quality/' },
      { title: 'EXIF Metadata Remover', meta: 'Strip Hidden Tags', desc: 'Remove GPS, camera serials & bloat from web assets.', href: '/exif-metadata-remover/' },
      { title: 'Resize Image in Pixels', meta: 'Exact W × H Pixels', desc: 'Scale web banners and thumbnails to exact pixels.', href: '/resize-image-in-pixels/' },
    ],
  },

  // ==========================================================
  // 3. PHYSICAL & PIXEL RESIZE + UNIT CALCULATORS (13 PAGES)
  // ==========================================================
  {
    slug: 'image-resizer-in-mm',
    title: 'Image Resizer in MM Online (35×45mm at 300 DPI) | PixelKit',
    description:
      'Resize images in millimeters (mm) online at 300 DPI. Pre-set to 35×45 mm (413×531 px) with KB compression for passports, visas & ID cards. Zero uploads.',
    keywords: [
      'image resizer in mm',
      'resize photo in mm online',
      '35x45 mm photo resizer',
      'photo resizer in millimeter at 300 dpi',
      'millimeter image resizer',
    ],
    badge: 'Millimeter (MM) Print & Biometric Resizer · 300 DPI Calibrated',
    ogTitle: 'Image Resizer in MM',
    ogBadge: '35×45 MM AT 300 DPI',
    ogSubtitle: 'Resize photos to exact millimeter dimensions & KB limits locally',
    breadcrumbParent: { label: 'Resize Image', href: '/resize-image/' },
    breadcrumbLabel: 'Image Resizer in MM',
    h1: 'Image Resizer in Millimeters (MM) Online',
    heroSubtitle:
      'Enter any width and height in millimeters (mm)—pre-loaded with the global 35 × 45 mm ICAO passport standard at 300 DPI—and resize + compress in one browser pass.',
    directAnswer: {
      title: 'How Millimeter (MM) Image Resizing Works at 300 DPI',
      summaryText:
        'International biometric standards (ICAO Doc 9303, Schengen, UK, Australia, India, Singapore, Malaysia, China) define photo sizes in millimeters rather than centimeters or inches. PixelKit converts millimeters to exact pixels via Pixels = round((mm ÷ 25.4) × DPI) and stamps matching 300 DPI headers so your photo prints and uploads at exact physical scale.',
      specs: [
        { label: 'Pre-Selected Size', value: '35 × 45 mm (413 × 531 px @ 300 DPI)', highlight: true },
        { label: 'Conversion Formula', value: 'px = (mm ÷ 25.4) × DPI' },
        { label: 'Target File Cap', value: '100 KB Default (Adjustable)', highlight: true },
        { label: 'Privacy', value: '100% Local Browser Processing' },
      ],
    },
    toolProps: {
      from: 'jpg',
      to: 'jpg',
      fromMime: 'image/jpeg',
      toMime: 'image/jpeg',
      targetKb: 100,
      initialTool: 'resize',
      initialUnit: 'mm',
      initialWidth: 35,
      initialHeight: 45,
      initialDpi: 300,
    },
    specTable: {
      heading: 'Common Millimeter Photo Sizes & 300 DPI Pixel Equivalents',
      subheading: 'Reference chart for global visas, IDs, and print stationery:',
      columns: ['Standard / Country', 'Millimeters (W × H)', 'Pixels at 300 DPI', 'Pixels at 200 DPI'],
      rows: [
        ['ICAO Standard Passport (EU/IN/UK/AU)', '35 × 45 mm', '413 × 531 px', '276 × 354 px'],
        ['China COVA Visa & Passport', '33 × 48 mm', '390 × 567 px', '260 × 378 px'],
        ['Malaysia Passport & eVisa', '35 × 50 mm', '413 × 591 px', '276 × 394 px'],
        ['Canada IRCC Visa & PR Photo', '50 × 70 mm', '591 × 827 px (420×540 digital)', '394 × 551 px'],
      ],
    },
    guideSection: {
      heading: 'Precision Millimeter Scaling Without Manual Math',
      paragraphs: [
        'Typing millimeter fractions into basic pixel editors requires dividing by 25.4, multiplying by 300, and remembering to update the JFIF DPI tag separately. A single rounding mistake can trigger automated consular portal rejections.',
        'Above, PixelKit opens with "mm" already selected in Stage 2 (`35 × 45 mm` at `300 DPI` and `≤ 100 KB`). Change `35` and `45` to any millimeter specification—like `33 × 48`, `35 × 50`, `25 × 35`, or `210 × 297` (A4)—and download your exact print-calibrated image.',
      ],
      cards: [
        { title: 'Sub-Millimeter Accuracy', body: 'Supports decimal millimeter entries (e.g., 50.8 × 50.8 mm) with IEEE-accurate rounding.' },
        { title: 'Embedded Print DPI Header', body: 'Writes matching 300 DPI (or 200/600 DPI) metadata so photo kiosks print exact millimeter borders.' },
        { title: 'Simultaneous KB Control', body: 'Hits 20 KB, 50 KB, 100 KB, or 200 KB limits in the same Web Worker pass.' },
      ],
    },
    faqs: [
      {
        q: 'How many pixels is 35 × 45 mm at 300 DPI?',
        a: '35 mm ÷ 25.4 × 300 = 413.39 px (413 px), and 45 mm ÷ 25.4 × 300 = 531.50 px (531 px). So 35 × 45 mm at 300 DPI is 413 × 531 pixels.',
      },
      {
        q: 'What is the difference between resizing in mm vs cm?',
        a: '1 cm equals 10 mm (3.5 × 4.5 cm = 35 × 45 mm). Millimeter mode lets you enter integer specs like 33 × 48 mm (China) or 50 × 70 mm (Canada) directly without decimal conversions.',
      },
      {
        q: 'Can I switch from 300 DPI to 200 DPI while resizing in mm?',
        a: 'Yes! Use the DPI selector right next to the mm inputs in Stage 2 (or Stage 5) to recalculate pixels at 72, 150, 200, 300, or 600 DPI.',
      },
      {
        q: 'Are my ID photos uploaded to the cloud?',
        a: 'Never. All millimeter-to-pixel resampling happens locally inside your browser.',
      },
    ],
    relatedLinks: [
      { title: 'MM to Pixels Converter', meta: 'Interactive MM Calculator', desc: 'Instant mm-to-px calculator at 72–600 DPI.', href: '/mm-to-pixels-converter/' },
      { title: 'Pixels to MM Converter', meta: 'Reverse PX → MM', desc: 'Check physical millimeter print size of any image.', href: '/pixels-to-mm-converter/' },
      { title: 'Resize 35×45 mm Photo', meta: '413×531 px Preset', desc: 'Dedicated 35×45 mm biometric passport resizer.', href: '/resize-image-35x45-mm/' },
      { title: 'Image Resizer in CM', meta: '3.5×4.5 cm @ 300 DPI', desc: 'Resize photos in centimeters online.', href: '/image-resizer-in-cm/' },
      { title: 'Image Resizer in Inches', meta: '2×2" & 4×6" @ 300 DPI', desc: 'Resize photos in inches for US visas & prints.', href: '/image-resizer-in-inches/' },
      { title: 'Resize Image in Pixels', meta: 'Exact W × H px', desc: 'Direct pixel width and height resizer.', href: '/resize-image-in-pixels/' },
    ],
  },

  {
    slug: 'image-resizer-in-inches',
    title: 'Image Resizer in Inches Online (300 DPI) | PixelKit',
    description:
      'Resize images in inches online at 300 DPI. Pre-set to 2×2 inches (600×600 px) for US Visa/Passport, 4×6 postcards & 8.5×11 prints. 100% private in browser.',
    keywords: [
      'image resizer in inches',
      'resize image in inches online',
      '2x2 inch photo resizer',
      '4x6 inch photo resizer 300 dpi',
      'resize photo in inches without losing quality',
    ],
    badge: 'Inch Print & US Biometric Resizer · 2×2", 4×6", 5×7" at 300 DPI',
    ogTitle: 'Image Resizer in Inches',
    ogBadge: '2×2" & 4×6" AT 300 DPI',
    ogSubtitle: 'Scale photos to exact inch measurements with embedded 300 DPI',
    breadcrumbParent: { label: 'Resize Image', href: '/resize-image/' },
    breadcrumbLabel: 'Image Resizer in Inches',
    h1: 'Image Resizer in Inches Online (300 DPI)',
    heroSubtitle:
      'Resize photographs to exact inch dimensions—pre-configured to 2 × 2 inches (600 × 600 px at 300 DPI, under 240 KB)—for US visas, 4×6 postcards, Walgreens/CVS prints, and frames.',
    directAnswer: {
      title: 'How to Resize an Image in Inches for Print & Portals',
      summaryText:
        'Converting inches to digital pixels is governed by the exact relationship Pixels = Inches × DPI. At the 300 DPI photographic print standard, a 2 × 2 inch US passport/visa photo equals 600 × 600 pixels, and a 4 × 6 inch NEET/photo-lab postcard equals 1200 × 1800 pixels. PixelKit resamples your image and embeds the matching DPI tag locally.',
      specs: [
        { label: 'Pre-Selected Size', value: '2 × 2 Inches (600 × 600 px @ 300 DPI)', highlight: true },
        { label: 'Conversion Formula', value: 'Pixels = Inches × Target DPI' },
        { label: 'Default File Cap', value: 'Under 240 KB (US DS-160 Ready)', highlight: true },
        { label: 'Privacy', value: '100% Client-Side Browser Engine' },
      ],
    },
    toolProps: {
      from: 'jpg',
      to: 'jpg',
      fromMime: 'image/jpeg',
      toMime: 'image/jpeg',
      targetKb: 240,
      initialTool: 'resize',
      initialUnit: 'in',
      initialWidth: 2,
      initialHeight: 2,
      initialDpi: 300,
    },
    specTable: {
      heading: 'Standard Inch Photo Sizes in Pixels at 300 DPI',
      subheading: 'Exact pixel dimensions for US documents, NEET postcards, and framing:',
      columns: ['Print / Portal Standard', 'Size in Inches', 'Pixels at 300 DPI', 'Common Use Case'],
      rows: [
        ['US Passport, DS-160 & OCI Visa', '2 × 2 in', '600 × 600 px', 'US State Dept, Green Card Lottery, Saudi Visa'],
        ['Wallet Print', '2.5 × 3.5 in', '750 × 1050 px', 'ID wallets, trading cards, school portraits'],
        ['4R Postcard Print', '4 × 6 in', '1200 × 1800 px', 'NTA NEET postcard upload, CVS/Walgreens print'],
        ['5R / 8×10 Frame & US Letter', '5 × 7 in / 8.5 × 11 in', '1500×2100 / 2550×3300 px', 'Framed portraits and full-page documents'],
      ],
    },
    guideSection: {
      heading: 'Why Embedded DPI Matters When Printing in Inches',
      paragraphs: [
        'If you resize an image to 1200 × 1800 pixels in a basic web tool that leaves the header at 72 DPI, desktop layout programs interpret the file as 16.67 × 25 inches instead of 4 × 6 inches. By selecting "in" (inches) at 300 DPI in PixelKit, both the pixel matrix AND the binary JFIF/PNG density header match your exact inch target.',
        'Need a non-square print like 4 × 6 in or 3.5 × 5 in without squishing faces? Keep Cover Crop or Aspect Lock enabled in Stage 2 so proportions stay completely natural.',
      ],
      cards: [
        { title: 'Exact Inches × DPI Math', body: 'Supports fractional inches like 1.38 × 1.77 in, 2.5 × 3.5 in, or 8.5 × 11 in at any DPI.' },
        { title: 'Photo Kiosk Ready', body: 'Produces crisp 300 DPI sRGB JPEGs ready for Fuji, Kodak, CVS, Walgreens, and home inkjet printers.' },
        { title: 'Private Family & ID Photos', body: 'Personal portraits and visa photos never leave your device.' },
      ],
    },
    faqs: [
      {
        q: 'How many pixels is 2 × 2 inches at 300 DPI?',
        a: '2 inches × 300 DPI = 600 pixels wide by 600 pixels tall. This is the exact baseline requirement for US DS-160 visas, US passports, and Indian OCI applications.',
      },
      {
        q: 'How do I resize a photo to 4 × 6 inches for NEET or photo printing?',
        a: 'Change Width to 4 and Height to 6 in Stage 2 (keeping unit = "in" and DPI = 300). PixelKit outputs a crisp 1200 × 1800 px image; set 200 KB in Stage 3 if uploading to NTA NEET.',
      },
      {
        q: 'What if I don’t want the 240KB cap for a large 8×10 inch print?',
        a: 'In Stage 3 (Target File Size), switch to "Lossless / Max Quality" or clear the KB limit to export maximum photographic detail for large prints.',
      },
      {
        q: 'Does PixelKit support iPhone HEIC photos?',
        a: 'Yes—drop .heic camera shots directly and export print-ready 300 DPI .jpg or .png files in inches.',
      },
    ],
    relatedLinks: [
      { title: 'Inches to Pixels Converter', meta: 'Interactive IN → PX', desc: 'Convert any inch measurement to pixels at any DPI.', href: '/inches-to-pixels-converter/' },
      { title: 'Pixels to Inches Converter', meta: 'Check Print Size in IN', desc: 'Calculate how many inches your image prints cleanly.', href: '/pixels-to-inches-converter/' },
      { title: 'Resize 2×2 Inch Photo', meta: '600×600 px US Spec', desc: 'Dedicated 2×2 inch square photo resizer.', href: '/resize-image-2x2-inch/' },
      { title: 'US Visa Photo Resizer', meta: 'DS-160 & DV Lottery', desc: 'Official US Department of State 2×2" preset.', href: '/us-visa-photo-resizer/' },
      { title: 'Image Resizer in CM', meta: 'Centimeter Resizer', desc: 'Resize images in centimeters at 300 DPI.', href: '/image-resizer-in-cm/' },
      { title: 'Image Resizer in MM', meta: 'Millimeter Resizer', desc: 'Resize images in millimeters (35×45 mm).', href: '/image-resizer-in-mm/' },
    ],
  },

  {
    slug: 'resize-image-in-pixels',
    title: 'Resize Image in Pixels Online (Exact W × H) | PixelKit',
    description:
      'Resize JPG, PNG, WebP & HEIC images to exact pixel width and height (e.g. 600×600, 1080×1080, 1920×1080 px) online with zero blur and zero uploads.',
    keywords: [
      'resize image in pixels',
      'pixel image resizer online',
      'change image width and height in pixels',
      'resize photo to exact pixels',
      'lanczos bicubic pixel resizer',
    ],
    badge: 'Exact Width × Height Pixel Resampler · Aspect Lock & Cover Crop',
    ogTitle: 'Resize Image in Pixels',
    ogBadge: 'EXACT WIDTH × HEIGHT PX',
    ogSubtitle: 'Scale images to exact pixel dimensions with zero distortion locally',
    breadcrumbParent: { label: 'Resize Image', href: '/resize-image/' },
    breadcrumbLabel: 'Resize Image in Pixels',
    h1: 'Resize Image in Pixels Online (Exact W × H)',
    heroSubtitle:
      'Dial in exact integer pixel width and height—pre-opened in Pixel mode (`600 × 600 px`)—with aspect-ratio lock, cover-crop, or fit padding and optional KB caps.',
    directAnswer: {
      title: 'How to Resize an Image to Exact Pixel Dimensions Without Stretching',
      summaryText:
        'To resize an image to exact pixel dimensions without squishing or stretching subjects, choose "Cover (Smart Crop)" when changing aspect ratios (e.g., turning a 4000 × 3000 px photo into 600 × 600 px), or keep Aspect Ratio Locked to scale proportionally. PixelKit executes multi-step high-quality canvas resampling 100% locally in Web Workers.',
      specs: [
        { label: 'Unit Mode', value: 'Exact Integer Pixels (px)', highlight: true },
        { label: 'Fit Modes', value: 'Cover Crop · Contain Pad · Stretch' },
        { label: 'Supported Formats', value: 'JPG, PNG, WebP, AVIF, HEIC, BMP, TIFF', highlight: true },
        { label: 'Privacy', value: '100% In-Browser · Batch ZIP Ready' },
      ],
    },
    toolProps: {
      from: 'jpg',
      to: 'jpg',
      fromMime: 'image/jpeg',
      toMime: 'image/jpeg',
      targetKb: null,
      initialTool: 'resize',
      initialUnit: 'px',
      initialWidth: 600,
      initialHeight: 600,
      initialDpi: 300,
    },
    specTable: {
      heading: 'Popular Exact Pixel Resolutions Across Web, Social & Portals',
      subheading: 'Common pixel targets you can enter directly in Stage 2:',
      columns: ['Category', 'Pixel Dimensions (W × H)', 'Aspect Ratio', 'Typical Platform / Portal'],
      rows: [
        ['US Visa / Avatar Square', '600 × 600 px', '1:1 Square', 'US DS-160, Saudi Visa, WhatsApp DP, Profiles'],
        ['Passport / Exam Portrait', '413 × 531 px / 350 × 450 px', '3.5:4.5', 'Indian/UK/EU Passport, SSC, UPSC, RRB'],
        ['Social Feed & E-Commerce', '1080 × 1080 px / 1080 × 1350 px', '1:1 / 4:5', 'Instagram, Shopify, Amazon, Etsy listings'],
        ['Full HD Banner & Video', '1920 × 1080 px / 1280 × 720 px', '16:9 HD', 'YouTube thumbnails, hero headers, slides'],
      ],
    },
    guideSection: {
      heading: 'Multi-Step Downsampling Prevents Jagged Aliasing',
      paragraphs: [
        'Dropping a 48-megapixel (8000 × 6000 px) smartphone image straight into a single-pass browser canvas draw at 300 × 300 px introduces stair-stepped moiré patterns on hair, eyeglasses, and clothing fabric.',
        'PixelKit’s Web Worker resampler steps down large dimensions cleanly with high smoothing quality, preserves sharp edges, and lets you prevent accidental upscaling ("Don’t upscale smaller images") when batch-processing mixed folders.',
      ],
      cards: [
        { title: 'Zero Stretching (Cover Mode)', body: 'Automatically center-crops or top-crops excess edges when resizing rectangular photos into square pixel boxes.' },
        { title: 'Pixel + KB Combo', body: 'Need 350 × 450 px AND under 50 KB? Set both Stage 2 pixels and Stage 3 KB in one pass.' },
        { title: 'Unlimited Batch Queue', body: 'Resize 1 or 100 product photos to uniform pixel dimensions and download a single ZIP.' },
      ],
    },
    faqs: [
      {
        q: 'How do I resize an image to exact pixels without distorting faces?',
        a: 'Keep Fit Mode set to "Cover (Crop)" rather than "Stretch". Cover scales the image until both target dimensions are filled and trims only the excess edges.',
      },
      {
        q: 'Can I resize by 50% or 25% percentage instead of typing pixels?',
        a: 'Yes—inside Stage 2 you can click quick percentage scale pills or lock the aspect ratio so typing a new width calculates the exact proportional height automatically.',
      },
      {
        q: 'What happens if my original photo is smaller than the target pixels?',
        a: 'PixelKit scales to your exact requested pixel dimensions by default so strict portal validators pass, or you can toggle "No Upscale" to preserve native resolution.',
      },
      {
        q: 'Does resizing PNGs in pixels keep transparent backgrounds?',
        a: 'Yes! Keep Output Format set to PNG or WebP and full alpha-channel transparency is preserved cleanly.',
      },
    ],
    relatedLinks: [
      { title: 'Resize 600×600 Pixels', meta: '1:1 Square Preset', desc: 'Instant 600×600 px resizer for visas & avatars.', href: '/resize-image-600x600/' },
      { title: 'Resize 1080×1080 Pixels', meta: 'Instagram & Store', desc: '1080×1080 px HD square image resizer.', href: '/resize-image-1080x1080/' },
      { title: 'Resize 1920×1080 Pixels', meta: '16:9 Full HD', desc: '1920×1080 px widescreen HD image resizer.', href: '/resize-image-1920x1080/' },
      { title: 'Pixels to CM Converter', meta: 'PX → CM Calculator', desc: 'Convert pixel dimensions to physical centimeters.', href: '/pixels-to-cm-converter/' },
      { title: 'Bulk Image Resizer', meta: 'Parallel Batch ZIP', desc: 'Resize dozens of images at once locally.', href: '/bulk-image-resizer/' },
      { title: 'Image Resizer in CM', meta: 'CM Print Resizer', desc: 'Resize by physical centimeters at 300 DPI.', href: '/image-resizer-in-cm/' },
    ],
  },

  {
    slug: 'mm-to-pixels-converter',
    title: 'MM to Pixels Converter (At 300 DPI & Any DPI) | PixelKit',
    description:
      'Convert millimeters (mm) to pixels instantly at 72, 150, 200, 300, or 600 DPI—plus resize your image to exact mm dimensions in 1 click. 100% private.',
    keywords: [
      'mm to pixels converter',
      'millimeters to pixels at 300 dpi',
      '35x45 mm in pixels',
      'convert mm to px online',
      'a4 size in pixels 300 dpi',
    ],
    badge: 'Interactive MM → Pixels Calculator + Live 300 DPI Resizer',
    ogTitle: 'MM to Pixels Converter',
    ogBadge: '35×45 MM = 413×531 PX',
    ogSubtitle: 'Interactive millimeter-to-pixel calculator & 1-click photo resizer',
    breadcrumbParent: { label: 'Resize Image', href: '/resize-image/' },
    breadcrumbLabel: 'MM to Pixels Converter',
    h1: 'MM to Pixels Converter (300 DPI & Custom DPI)',
    heroSubtitle:
      'Convert any millimeter width and height (such as 35 × 45 mm, 33 × 48 mm, or 210 × 297 mm A4) to exact integer pixels across 72–600 DPI, then resize your photo in one click.',
    directAnswer: {
      title: 'MM to Pixels Conversion Formula & 300 DPI Quick Answer',
      summaryText:
        'Because 1 inch equals exactly 25.4 millimeters, the universal formula to convert millimeters to pixels is: Pixels = round((Millimeters ÷ 25.4) × DPI). At 300 DPI print resolution, 1 mm = 11.811 pixels, so a standard 35 × 45 mm passport photo equals 413 × 531 pixels, and an A4 sheet (210 × 297 mm) equals 2480 × 3508 pixels.',
      specs: [
        { label: 'Exact Formula', value: 'px = (mm ÷ 25.4) × DPI', highlight: true },
        { label: '1 mm at 300 DPI', value: '11.811 pixels (10 mm = 118 px)' },
        { label: '35 × 45 mm @ 300 DPI', value: '413 × 531 pixels', highlight: true },
        { label: 'A4 (210×297 mm) @ 300 DPI', value: '2480 × 3508 pixels' },
      ],
    },
    calculatorProps: {
      mode: 'cm-to-px',
      defaultUnit: 'mm',
      defaultDpi: 300,
    },
    toolProps: {
      from: 'jpg',
      to: 'jpg',
      fromMime: 'image/jpeg',
      toMime: 'image/jpeg',
      targetKb: null,
      initialTool: 'resize',
      initialUnit: 'mm',
      initialWidth: 35,
      initialHeight: 45,
      initialDpi: 300,
    },
    specTable: {
      heading: 'Millimeters to Pixels Conversion Table (72, 150, 200 & 300 DPI)',
      subheading: 'Pre-calculated pixel counts for common ISO paper and biometric sizes:',
      columns: ['Size in MM', 'At 72 DPI (Web)', 'At 200 DPI (Portal)', 'At 300 DPI (Print)'],
      rows: [
        ['25 × 35 mm (PAN / Stamp)', '71 × 99 px', '197 × 276 px', '295 × 413 px'],
        ['35 × 45 mm (ICAO Passport)', '99 × 128 px', '276 × 354 px', '413 × 531 px'],
        ['50 × 70 mm (Canada Visa)', '142 × 198 px', '394 × 551 px', '591 × 827 px'],
        ['148 × 210 mm (ISO A5)', '420 × 595 px', '1165 × 1654 px', '1748 × 2480 px'],
        ['210 × 297 mm (ISO A4)', '595 × 842 px', '1654 × 2339 px', '2480 × 3508 px'],
      ],
    },
    guideSection: {
      heading: 'From Calculator Readout Straight Into Pixel-Accurate Resizing',
      paragraphs: [
        'Use the interactive MM → Pixels calculator above to test any custom millimeter dimension and DPI, copy the pixel output in one click, or press the "Resize Photo" button to push those exact measurements directly into the studio below.',
        'Every resized file receives both the calculated integer pixel dimensions and the matching JFIF/pHYs DPI header, ensuring Illustrator, InDesign, Acrobat, and government upload portals agree 100% on your millimeter size.',
      ],
      cards: [
        { title: '1-Click Studio Sync', body: 'Sending calculator values updates Stage 2 width, height, and DPI automatically.' },
        { title: 'Supports Any Custom DPI', body: 'Switch between 72, 96, 150, 200, 300, 600 DPI or type any custom scanner DPI up to 2400.' },
        { title: '100% Private Local Tool', body: 'All math and image resampling execute locally in your browser.' },
      ],
    },
    faqs: [
      {
        q: 'How many pixels is 1 mm?',
        a: 'It depends on DPI: at 96 DPI (CSS standard), 1 mm = 3.78 px; at 200 DPI, 1 mm = 7.87 px; at 300 DPI (print quality), 1 mm = 11.81 px.',
      },
      {
        q: 'What is 35 × 45 mm in pixels at 300 DPI?',
        a: '413 × 531 pixels. This is the exact digital resolution for Indian, UK, Schengen, Australian, and UAE passport/visa photos.',
      },
      {
        q: 'What is A4 size (210 × 297 mm) in pixels?',
        a: 'At 300 DPI, A4 is 2480 × 3508 pixels. At 150 DPI (ideal for email/portal PDF scans), A4 is 1240 × 1754 pixels.',
      },
      {
        q: 'Can I convert pixels back to millimeters?',
        a: 'Yes! Toggle "Pixels → CM / MM / IN" at the top of the calculator above, or visit our dedicated Pixels to MM Converter.',
      },
    ],
    relatedLinks: [
      { title: 'Pixels to MM Converter', meta: 'PX → MM Calculator', desc: 'Convert pixel dimensions into millimeters.', href: '/pixels-to-mm-converter/' },
      { title: 'Image Resizer in MM', meta: '35×45 mm Studio', desc: 'Resize photos directly in millimeters.', href: '/image-resizer-in-mm/' },
      { title: 'CM to Pixels at 300 DPI', meta: 'CM → PX Calculator', desc: 'Centimeter to pixel converter and resizer.', href: '/cm-to-pixels-at-300-dpi/' },
      { title: 'Inches to Pixels Converter', meta: 'IN → PX Calculator', desc: 'Convert inches to pixels at 300 DPI.', href: '/inches-to-pixels-converter/' },
      { title: 'Resize 35×45 mm Photo', meta: '413×531 px Preset', desc: 'One-click 35×45 mm passport photo resizer.', href: '/resize-image-35x45-mm/' },
      { title: 'Change Image DPI to 300', meta: '300 DPI Header Tool', desc: 'Set lossless 300 DPI metadata on any photo.', href: '/change-image-dpi-to-300/' },
    ],
  },

  {
    slug: 'inches-to-pixels-converter',
    title: 'Inches to Pixels Converter (At 300 DPI & Any DPI) | PixelKit',
    description:
      'Convert inches to pixels instantly at 72, 150, 200, 300, or 600 DPI (2×2", 4×6", 8.5×11") and resize your photo in 1 click. Free & 100% private.',
    keywords: [
      'inches to pixels converter',
      'convert inches to pixels at 300 dpi',
      '2x2 inches in pixels',
      '4x6 inches in pixels 300 dpi',
      '8.5x11 in pixels',
    ],
    badge: 'Interactive Inches → Pixels Calculator + 300 DPI Photo Resizer',
    ogTitle: 'Inches to Pixels Converter',
    ogBadge: '2×2 IN = 600×600 PX',
    ogSubtitle: 'Convert inches to exact pixels at any DPI & resize locally',
    breadcrumbParent: { label: 'Resize Image', href: '/resize-image/' },
    breadcrumbLabel: 'Inches to Pixels Converter',
    h1: 'Inches to Pixels Converter (300 DPI & Custom DPI)',
    heroSubtitle:
      'Calculate exact pixel dimensions for any inch measurement (2 × 2", 4 × 6", 5 × 7", 8 × 10", 8.5 × 11") across web and print DPIs, then resize your photo below.',
    directAnswer: {
      title: 'Inches to Pixels Formula & Standard 300 DPI Chart',
      summaryText:
        'To convert inches to pixels, multiply physical inches by the target resolution in Dots Per Inch: Pixels = round(Inches × DPI). At 300 DPI print quality, 2 × 2 inches = 600 × 600 px, 4 × 6 inches = 1200 × 1800 px, 5 × 7 inches = 1500 × 2100 px, and US Letter (8.5 × 11 inches) = 2550 × 3300 px.',
      specs: [
        { label: 'Exact Formula', value: 'Pixels = Inches × DPI', highlight: true },
        { label: '2 × 2 in @ 300 DPI', value: '600 × 600 pixels (US Visa)' },
        { label: '4 × 6 in @ 300 DPI', value: '1200 × 1800 pixels (Postcard)', highlight: true },
        { label: '8.5 × 11 in @ 300 DPI', value: '2550 × 3300 pixels (US Letter)' },
      ],
    },
    calculatorProps: {
      mode: 'cm-to-px',
      defaultUnit: 'in',
      defaultDpi: 300,
    },
    toolProps: {
      from: 'jpg',
      to: 'jpg',
      fromMime: 'image/jpeg',
      toMime: 'image/jpeg',
      targetKb: null,
      initialTool: 'resize',
      initialUnit: 'in',
      initialWidth: 2,
      initialHeight: 2,
      initialDpi: 300,
    },
    specTable: {
      heading: 'Inches to Pixels Reference Chart (72, 150 & 300 DPI)',
      subheading: 'Exact pixel equivalents for US photo labs, visa forms, and stationery:',
      columns: ['Print Size (Inches)', 'At 72 DPI (Screen)', 'At 150 DPI (Draft/PDF)', 'At 300 DPI (Photo Lab)'],
      rows: [
        ['2 × 2 in (US Visa / Passport)', '144 × 144 px', '300 × 300 px', '600 × 600 px'],
        ['3.5 × 2 in (US Business Card)', '252 × 144 px', '525 × 300 px', '1050 × 600 px'],
        ['4 × 6 in (Postcard / 4R)', '288 × 432 px', '600 × 900 px', '1200 × 1800 px'],
        ['5 × 7 in / 8 × 10 in', '360×504 / 576×720 px', '750×1050 / 1200×1500 px', '1500×2100 / 2400×3000 px'],
        ['8.5 × 11 in (US Letter)', '612 × 792 px', '1275 × 1650 px', '2550 × 3300 px'],
      ],
    },
    guideSection: {
      heading: 'Design & Print Without Blurry Upscaling Surprises',
      paragraphs: [
        'Whether you are preparing a 2 × 2 inch US passport portrait, a 4 × 6 inch NTA NEET postcard upload, or a 3.5 × 2 inch business card with bleed, matching exact pixel count at 300 DPI guarantees tack-sharp edges.',
        'Enter any fractional inch width and height in the calculator above (for example, `3.75 × 2.25 in` for a business card with `0.125"` bleed), click "Resize Photo", and drop your image below to export a calibrated 300 DPI file.',
      ],
      cards: [
        { title: 'Fractional Inch Precision', body: 'Handles 0.125" print bleeds, 2.5 × 3.5" wallet cards, and custom frame sizes accurately.' },
        { title: 'Live Equivalent Units', body: 'Shows simultaneous pixel, centimeter, and millimeter equivalents as you type.' },
        { title: 'Zero Server Uploads', body: 'Every calculation and image resize runs privately on your device.' },
      ],
    },
    faqs: [
      {
        q: 'How many pixels is 1 inch?',
        a: 'In CSS web layout, 1 inch is defined as 96 pixels. For commercial photo and offset printing, 1 inch equals 300 pixels (at 300 DPI).',
      },
      {
        q: 'What is 4 × 6 inches in pixels at 300 DPI?',
        a: '4 × 300 = 1200 pixels wide, and 6 × 300 = 1800 pixels tall (1200 × 1800 px, or 2.16 megapixels).',
      },
      {
        q: 'What is 8.5 × 11 inches in pixels?',
        a: 'At 72 DPI (PDF point scale), 8.5 × 11" is 612 × 792 px. At 150 DPI it is 1275 × 1650 px, and at 300 DPI it is 2550 × 3300 px.',
      },
      {
        q: 'Can I also cap the file size in KB after converting inches to pixels?',
        a: 'Yes! Select any KB target (such as 200 KB or 240 KB) in Stage 3 of the resizer below.',
      },
    ],
    relatedLinks: [
      { title: 'Pixels to Inches Converter', meta: 'PX → IN Calculator', desc: 'Convert pixel dimensions to physical inches.', href: '/pixels-to-inches-converter/' },
      { title: 'Image Resizer in Inches', meta: '2×2" & 4×6" Resizer', desc: 'Resize images directly in inches at 300 DPI.', href: '/image-resizer-in-inches/' },
      { title: 'Resize 2×2 Inch Photo', meta: '600×600 px US Spec', desc: 'Dedicated 2×2 inch passport & visa resizer.', href: '/resize-image-2x2-inch/' },
      { title: 'CM to Pixels at 300 DPI', meta: 'CM → PX Calculator', desc: 'Convert centimeters to 300 DPI pixels.', href: '/cm-to-pixels-at-300-dpi/' },
      { title: 'MM to Pixels Converter', meta: 'MM → PX Calculator', desc: 'Convert millimeters to pixels at any DPI.', href: '/mm-to-pixels-converter/' },
      { title: 'US Visa Photo Resizer', meta: 'DS-160 2×2" Preset', desc: 'Official US DS-160 & passport photo tool.', href: '/us-visa-photo-resizer/' },
    ],
  },

  {
    slug: 'pixels-to-mm-converter',
    title: 'Pixels to MM Converter (At 300 DPI & Any DPI) | PixelKit',
    description:
      'Convert pixels (px) to millimeters (mm) online at 72, 96, 150, 200, or 300 DPI—and resize images to exact mm print dimensions locally in your browser.',
    keywords: [
      'pixels to mm converter',
      'convert px to mm at 300 dpi',
      '413x531 pixels in mm',
      'pixel to millimeter calculator',
      'px to mm online',
    ],
    badge: 'Interactive Pixels → Millimeters Calculator + 300 DPI Resizer',
    ogTitle: 'Pixels to MM Converter',
    ogBadge: '413×531 PX = 35×45 MM',
    ogSubtitle: 'Check exact millimeter print dimensions at 72, 200 & 300 DPI',
    breadcrumbParent: { label: 'Resize Image', href: '/resize-image/' },
    breadcrumbLabel: 'Pixels to MM Converter',
    h1: 'Pixels to MM Converter (300 DPI & Web 96 DPI)',
    heroSubtitle:
      'Find out the exact physical millimeter (mm) size of any pixel resolution at 300 DPI print density or 96 DPI screen scale—and resize photos to exact mm targets below.',
    directAnswer: {
      title: 'How to Convert Pixels to Millimeters (Direct Formula)',
      summaryText:
        'To convert pixels (px) into physical millimeters (mm), multiply pixel count by 25.4 (millimeters per inch) and divide by the resolution in DPI: Millimeters = (Pixels × 25.4) ÷ DPI. At 300 DPI print density, 413 × 531 pixels equals 35.0 × 45.0 mm (standard passport size), and 1000 pixels equals 84.67 mm.',
      specs: [
        { label: 'Exact Formula', value: 'mm = (px × 25.4) ÷ DPI', highlight: true },
        { label: '100 px at 300 DPI', value: '8.47 mm (0.85 cm)' },
        { label: '413 × 531 px @ 300 DPI', value: '35 × 45 mm', highlight: true },
        { label: '100 px at 96 DPI (CSS)', value: '26.46 mm (2.65 cm)' },
      ],
    },
    calculatorProps: {
      mode: 'px-to-cm',
      defaultUnit: 'mm',
      defaultDpi: 300,
    },
    toolProps: {
      from: 'jpg',
      to: 'jpg',
      fromMime: 'image/jpeg',
      toMime: 'image/jpeg',
      targetKb: null,
      initialTool: 'resize',
      initialUnit: 'px',
      initialWidth: 413,
      initialHeight: 531,
      initialDpi: 300,
    },
    specTable: {
      heading: 'Pixels to Millimeters Lookup Table (96 DPI vs 300 DPI)',
      subheading: 'Verify how big your digital image can print cleanly without pixelation:',
      columns: ['Pixel Resolution', 'At 96 DPI (CSS Screen)', 'At 200 DPI (Portal)', 'At 300 DPI (Sharp Print)'],
      rows: [
        ['213 × 213 px', '56.4 × 56.4 mm', '27.1 × 27.1 mm', '18.0 × 18.0 mm'],
        ['413 × 531 px', '109.3 × 140.5 mm', '52.5 × 67.4 mm', '35.0 × 45.0 mm'],
        ['600 × 600 px', '158.8 × 158.8 mm', '76.2 × 76.2 mm', '50.8 × 50.8 mm'],
        ['1920 × 1080 px (Full HD)', '508.0 × 285.8 mm', '243.8 × 137.2 mm', '162.6 × 91.4 mm'],
        ['2480 × 3508 px', '656.2 × 928.2 mm', '315.0 × 445.5 mm', '210.0 × 297.0 mm (A4)'],
      ],
    },
    guideSection: {
      heading: 'Checking Print Sharpness Before Sending Artwork to Press',
      paragraphs: [
        'Before ordering custom stickers, ID badges, packaging labels, or passport prints measured in millimeters, enter your image’s pixel width and height into the calculator above at 300 DPI. If the resulting millimeter width is smaller than your physical print target, printing it larger will look soft unless you supply a higher-resolution original.',
        'Need to lock an existing high-res photo to exact millimeter print bounds? Switch Stage 2 below to "mm" or click the preset buttons in the calculator to configure the resizer instantly.',
      ],
      cards: [
        { title: 'Instant 4-Unit Readout', body: 'Displays mm, cm, inches, and megapixels side-by-side as you type.' },
        { title: 'Print Quality Check', body: 'Quickly verify whether a 1920×1080 px image covers an A4 (210×297 mm) sheet at 300 DPI.' },
        { title: '100% Client-Side', body: 'Zero uploads, zero tracking, instant browser calculations.' },
      ],
    },
    faqs: [
      {
        q: 'How many millimeters is 1 pixel?',
        a: 'At 96 DPI (web CSS), 1 pixel = 0.2646 mm. At 300 DPI (print standard), 1 pixel = 0.0847 mm.',
      },
      {
        q: 'How many mm is 1920 × 1080 pixels at 300 DPI?',
        a: 'At 300 DPI, 1920 × 1080 px prints sharply at 162.56 × 91.44 mm (about 16.3 × 9.1 cm).',
      },
      {
        q: 'Why does the same pixel image measure different mm at 72 DPI vs 300 DPI?',
        a: 'Pixels have no fixed physical size on their own; DPI defines how densely those pixels are packed onto each inch (25.4 mm) of paper.',
      },
      {
        q: 'Can I resize my photo directly in mm on this page?',
        a: 'Yes! Scroll right below the calculator to the interactive resizer or click our dedicated Image Resizer in MM.',
      },
    ],
    relatedLinks: [
      { title: 'MM to Pixels Converter', meta: 'MM → PX Calculator', desc: 'Convert millimeters to exact integer pixels.', href: '/mm-to-pixels-converter/' },
      { title: 'Image Resizer in MM', meta: '35×45 mm Resizer', desc: 'Resize photos in millimeters at 300 DPI.', href: '/image-resizer-in-mm/' },
      { title: 'Pixels to CM Converter', meta: 'PX → CM Calculator', desc: 'Convert pixels to physical centimeters.', href: '/pixels-to-cm-converter/' },
      { title: 'Pixels to Inches Converter', meta: 'PX → IN Calculator', desc: 'Convert pixels to physical inches.', href: '/pixels-to-inches-converter/' },
      { title: 'Resize Image in Pixels', meta: 'Exact W × H px', desc: 'Scale photos to exact pixel dimensions.', href: '/resize-image-in-pixels/' },
      { title: 'Change Image DPI to 300', meta: '300 DPI Print Stamp', desc: 'Embed lossless 300 DPI metadata headers.', href: '/change-image-dpi-to-300/' },
    ],
  },

  {
    slug: 'pixels-to-inches-converter',
    title: 'Pixels to Inches Converter (300 DPI Print Size) | PixelKit',
    description:
      'Convert pixels to inches online at 72, 96, 150, 200, or 300 DPI. Check maximum sharp print size for 4×6, 8×10, or poster prints and resize in 1 click.',
    keywords: [
      'pixels to inches converter',
      'convert px to inches at 300 dpi',
      'how many inches is 1920x1080 pixels',
      '600x600 pixels in inches',
      'pixel to inch print calculator',
    ],
    badge: 'Interactive Pixels → Inches Print Size Calculator + Resizer',
    ogTitle: 'Pixels to Inches Converter',
    ogBadge: '600×600 PX = 2×2 IN',
    ogSubtitle: 'Calculate sharp inch print sizes at 72, 150 & 300 DPI locally',
    breadcrumbParent: { label: 'Resize Image', href: '/resize-image/' },
    breadcrumbLabel: 'Pixels to Inches Converter',
    h1: 'Pixels to Inches Converter (Print & Web DPI)',
    heroSubtitle:
      'Divide any pixel width and height by target DPI to see exact physical print inches—pre-set to 600 × 600 px (2 × 2 in @ 300 DPI)—and resize images directly below.',
    directAnswer: {
      title: 'How to Convert Pixels to Inches (Direct Formula)',
      summaryText:
        'To convert pixels to inches, divide the pixel dimension by the resolution in Dots Per Inch: Inches = Pixels ÷ DPI. At 300 DPI photo-lab print density, 600 × 600 pixels = 2 × 2 inches, 1200 × 1800 pixels = 4 × 6 inches, and 2400 × 3000 pixels = 8 × 10 inches. At 96 DPI web CSS density, 96 pixels = 1 inch.',
      specs: [
        { label: 'Exact Formula', value: 'Inches = Pixels ÷ DPI', highlight: true },
        { label: '600 × 600 px @ 300 DPI', value: '2.00 × 2.00 inches' },
        { label: '1200 × 1800 px @ 300 DPI', value: '4.00 × 6.00 inches', highlight: true },
        { label: '3000 × 2400 px @ 300 DPI', value: '10.00 × 8.00 inches' },
      ],
    },
    calculatorProps: {
      mode: 'px-to-cm',
      defaultUnit: 'in',
      defaultDpi: 300,
    },
    toolProps: {
      from: 'jpg',
      to: 'jpg',
      fromMime: 'image/jpeg',
      toMime: 'image/jpeg',
      targetKb: null,
      initialTool: 'resize',
      initialUnit: 'px',
      initialWidth: 600,
      initialHeight: 600,
      initialDpi: 300,
    },
    specTable: {
      heading: 'Pixels to Inches Print Sharpness Chart',
      subheading: 'See how large popular camera and screen resolutions print at 300 DPI vs 150 DPI:',
      columns: ['Image Resolution', 'Megapixels', 'Sharp Print @ 300 DPI', 'Large Wall Print @ 150 DPI'],
      rows: [
        ['600 × 600 px', '0.36 MP', '2.0 × 2.0 in', '4.0 × 4.0 in'],
        ['1200 × 1800 px', '2.16 MP', '4.0 × 6.0 in', '8.0 × 12.0 in'],
        ['1920 × 1080 px (1080p)', '2.07 MP', '6.4 × 3.6 in', '12.8 × 7.2 in'],
        ['3840 × 2160 px (4K UHD)', '8.29 MP', '12.8 × 7.2 in', '25.6 × 14.4 in'],
        ['4032 × 3024 px (12MP Phone)', '12.19 MP', '13.4 × 10.1 in', '26.9 × 20.2 in'],
      ],
    },
    guideSection: {
      heading: 'Picking 300 DPI vs 150 DPI for Framed Photo Prints',
      paragraphs: [
        'Handheld prints viewed at reading distance (2 × 2" passports, 4 × 6" albums, 5 × 7" invitations, magazines) require 300 pixels per inch so individual ink dots remain invisible to the naked eye.',
        'Large wall canvases and posters (16 × 20" or 24 × 36") are viewed from several feet away, so 150–200 DPI looks crisp. Test both DPI pills in the calculator above to verify your image’s safe print envelope before ordering prints.',
      ],
      cards: [
        { title: 'Instant Megapixel Readout', body: 'Shows exact MP count alongside inches, centimeters, and millimeters.' },
        { title: 'Direct Inch Resizing', body: 'Switch Stage 2 to "in" anytime to lock an exact inch print frame at 300 DPI.' },
        { title: 'Zero Cloud Upload', body: 'Personal family portraits and high-res RAW exports stay 100% private.' },
      ],
    },
    faqs: [
      {
        q: 'How many inches is 1080 × 1920 pixels?',
        a: 'At 300 DPI print resolution, 1080 × 1920 px measures 3.6 × 6.4 inches. At 96 DPI screen resolution, it equals 11.25 × 20 inches.',
      },
      {
        q: 'How many pixels do I need for a sharp 8 × 10 inch print?',
        a: 'At 300 DPI, multiply 8 × 300 and 10 × 300: you need 2400 × 3000 pixels (7.2 megapixels).',
      },
      {
        q: 'What is 300 pixels in inches?',
        a: 'At 300 DPI, 300 pixels equals exactly 1.00 inch. At 150 DPI it equals 2.00 inches, and at 72 DPI it equals 4.17 inches.',
      },
      {
        q: 'Can I stamp 300 DPI metadata onto my photo after checking its inch size?',
        a: 'Yes! Drop your photo into the studio below—300 DPI is already pre-selected so your downloaded file carries accurate print density tags.',
      },
    ],
    relatedLinks: [
      { title: 'Inches to Pixels Converter', meta: 'IN → PX Calculator', desc: 'Convert inches to exact pixels at any DPI.', href: '/inches-to-pixels-converter/' },
      { title: 'Image Resizer in Inches', meta: '2×2" & 4×6" Resizer', desc: 'Resize photos directly in inches.', href: '/image-resizer-in-inches/' },
      { title: 'Pixels to CM Converter', meta: 'PX → CM Calculator', desc: 'Convert pixels to physical centimeters.', href: '/pixels-to-cm-converter/' },
      { title: 'Pixels to MM Converter', meta: 'PX → MM Calculator', desc: 'Convert pixels to millimeters.', href: '/pixels-to-mm-converter/' },
      { title: 'Resize 2×2 Inch Photo', meta: '600×600 px Preset', desc: 'Instant 2×2 inch passport & visa resizer.', href: '/resize-image-2x2-inch/' },
      { title: 'Change Image DPI to 300', meta: '300 DPI Print Stamp', desc: 'Embed lossless 300 DPI metadata.', href: '/change-image-dpi-to-300/' },
    ],
  },

  {
    slug: 'resize-image-3-5x4-5-cm',
    title: 'Resize Image to 3.5×4.5 cm Online (300 DPI) | PixelKit',
    description:
      'Resize photos to exact 3.5 × 4.5 cm (413×531 px at 300 DPI or 350×450 px) and compress under 50KB JPG for SSC, UPSC, NEET & Indian Passport. Zero uploads.',
    keywords: [
      'resize image 3.5x4.5 cm',
      '3.5 x 4.5 cm photo converter online',
      '3.5cm x 4.5cm in pixels',
      'resize photo to 3.5x4.5 cm 50kb',
      'passport size photo 3.5x4.5 cm maker',
    ],
    badge: '3.5 × 4.5 cm Pre-Selected · 413 × 531 px @ 300 DPI · ≤ 50 KB',
    ogTitle: 'Resize Image to 3.5 × 4.5 cm',
    ogBadge: '413×531 PX · UNDER 50KB',
    ogSubtitle: 'Pre-set 3.5×4.5 cm at 300 DPI for Passport, SSC, UPSC & NEET',
    breadcrumbParent: { label: 'Image Resizer in CM', href: '/image-resizer-in-cm/' },
    breadcrumbLabel: 'Resize 3.5 × 4.5 cm',
    h1: 'Resize Image to 3.5 × 4.5 cm Online (300 DPI)',
    heroSubtitle:
      'Pre-calibrated to exact 3.5 cm width × 4.5 cm height (413 × 531 pixels at 300 DPI) and ≤ 50 KB JPG—ready in one drop for Indian Passports, SSC, UPSC, NEET, and Schengen visas.',
    directAnswer: {
      title: 'What Is 3.5 × 4.5 cm in Pixels & How to Resize Instantly',
      summaryText:
        '3.5 × 4.5 cm is the #1 international passport and Indian competitive exam photograph size. At 300 DPI print resolution, 3.5 × 4.5 cm equals exactly 413 × 531 pixels (at 200 DPI it equals 276 × 354 px; SSC/UPSC digital forms also accept 350 × 450 px). PixelKit opens with 3.5 × 4.5 cm at 300 DPI and under 50 KB pre-selected.',
      specs: [
        { label: 'Physical Dimensions', value: '3.5 cm W × 4.5 cm H (35 × 45 mm)', highlight: true },
        { label: '300 DPI Pixel Output', value: '413 × 531 pixels' },
        { label: 'Pre-Selected File Cap', value: 'Under 50 KB JPG (Adjustable)', highlight: true },
        { label: 'Privacy', value: '100% Local Browser RAM' },
      ],
    },
    toolProps: {
      from: 'jpg',
      to: 'jpg',
      fromMime: 'image/jpeg',
      toMime: 'image/jpeg',
      targetKb: 50,
      initialTool: 'resize',
      initialUnit: 'cm',
      initialWidth: 3.5,
      initialHeight: 4.5,
      initialDpi: 300,
    },
    specTable: {
      heading: '3.5 × 4.5 cm Across Major Exam & Passport Portals',
      subheading: 'All portals below use the exact 3.5:4.5 portrait ratio:',
      columns: ['Portal / Authority', 'Physical Spec', 'Pixel Equivalent', 'File Size Limit'],
      rows: [
        ['Passport Seva India', '3.5 × 4.5 cm', '413 × 531 px @ 300 DPI', '20 KB – 100 KB JPG'],
        ['SSC CGL / CHSL / MTS / GD', '3.5 × 4.5 cm', '350 × 450 px / 413 × 531 px', '20 KB – 50 KB JPG'],
        ['NTA NEET-UG / JEE Main / CUET', '3.5 × 4.5 cm', '413 × 531 px', '10 KB – 200 KB JPG'],
        ['Schengen / UK / Australia Visa', '35 × 45 mm', '413 × 531 px @ 300 DPI', 'Under 200 KB JPG'],
      ],
    },
    guideSection: {
      heading: 'One-Drop 3.5 × 4.5 cm Framing Without Face Distortion',
      paragraphs: [
        'When you drop a tall 9:16 smartphone portrait onto a 3.5 × 4.5 cm (7:9 ratio) canvas, basic editors stretch the image vertically and make faces look unnatural. PixelKit uses Cover-Crop framing with interactive visual crop handles so facial proportions stay 100% authentic.',
        'Need 20 KB – 50 KB strict minimum-and-maximum enforcement for SSC or State PSC? Switch Stage 3 from "Max KB" to "Min–Max Range (20–50 KB)" with one click.',
      ],
      cards: [
        { title: 'Exact 413 × 531 px + 300 DPI', body: 'Satisfies both digital pixel intake filters and physical 300 DPI JFIF header checks.' },
        { title: 'Interactive Face Cropper', body: 'Click Crop on any uploaded card to fine-tune crown and shoulder margins.' },
        { title: 'Zero Server Uploads', body: 'Your passport and exam portraits stay completely private on your device.' },
      ],
    },
    faqs: [
      {
        q: 'How many pixels is 3.5 cm × 4.5 cm?',
        a: 'At 300 DPI, 3.5 × 4.5 cm is 413 × 531 pixels. At 200 DPI it is 276 × 354 pixels, and at 96 DPI it is 132 × 170 pixels.',
      },
      {
        q: 'Is 3.5 × 4.5 cm the same as 35 × 45 mm?',
        a: 'Yes—1 centimeter equals 10 millimeters, so 3.5 × 4.5 cm and 35 × 45 mm are identical physical dimensions.',
      },
      {
        q: 'What if my portal allows up to 100KB or 200KB?',
        a: 'Simply click 100 KB or 200 KB in Stage 3 (Target File Size) to preserve even higher JPEG detail while keeping 3.5 × 4.5 cm locked.',
      },
      {
        q: 'Can I convert an iPhone HEIC selfie to 3.5 × 4.5 cm JPG?',
        a: 'Yes! Drop your .heic file straight in—PixelKit decodes it locally, crops to 3.5 × 4.5 cm, and outputs a compliant .jpg.',
      },
    ],
    relatedLinks: [
      { title: 'Image Resizer in CM', meta: 'Custom CM Resizer', desc: 'Resize to any custom centimeter width and height.', href: '/image-resizer-in-cm/' },
      { title: 'Resize 35×45 mm Photo', meta: 'Millimeter Equivalent', desc: '35×45 mm passport photo resizer at 300 DPI.', href: '/resize-image-35x45-mm/' },
      { title: 'Crop 35×45mm Passport', meta: '3.5:4.5 Aspect Crop', desc: 'Crop photos to exact 3.5:4.5 ratio without scaling.', href: '/crop-passport-photo-35x45mm/' },
      { title: 'SSC Photo Resizer', meta: '20KB–50KB Bracket', desc: 'Official SSC CGL/CHSL photo resizer.', href: '/ssc-photo-resizer/' },
      { title: 'UPSC Photo Resizer', meta: 'UPSC CSE & OTR', desc: 'Official UPSC Civil Services photo resizer.', href: '/upsc-photo-resizer/' },
      { title: 'CM to Pixels at 300 DPI', meta: 'CM → PX Calculator', desc: 'Calculate pixel equivalents for any cm spec.', href: '/cm-to-pixels-at-300-dpi/' },
    ],
  },

  {
    slug: 'resize-image-35x45-mm',
    title: 'Resize Image to 35×45 mm Online (413×531 px) | PixelKit',
    description:
      'Resize photos to exact 35×45 mm (413×531 pixels at 300 DPI) under 100KB JPG for Schengen, UK, Australian, Indian & UAE passports/visas. 100% private.',
    keywords: [
      'resize image 35x45 mm',
      '35x45mm photo converter online',
      '35x45mm in pixels 300 dpi',
      'passport photo 35x45mm free',
      'biometric photo 35x45mm resizer',
    ],
    badge: 'ICAO 35 × 45 mm Pre-Selected · 413 × 531 px @ 300 DPI · ≤ 100 KB',
    ogTitle: 'Resize Image to 35 × 45 mm',
    ogBadge: 'ICAO 35×45 MM (413×531)',
    ogSubtitle: 'Global biometric passport standard for UK, EU, AU, IN & UAE',
    breadcrumbParent: { label: 'Image Resizer in MM', href: '/image-resizer-in-mm/' },
    breadcrumbLabel: 'Resize 35 × 45 mm',
    h1: 'Resize Image to 35 × 45 mm Online (ICAO Passport)',
    heroSubtitle:
      'Pre-locked to the international ICAO Doc 9303 35 × 45 mm biometric standard (413 × 531 px at 300 DPI, under 100 KB JPG) for global passports and visas.',
    directAnswer: {
      title: 'Official 35 × 45 mm Biometric Passport Photo Specification',
      summaryText:
        'Over 120 countries—including the Schengen Area, United Kingdom, Australia, India, UAE, Japan, and Singapore—follow the ICAO 35 mm × 45 mm passport specification. At 300 DPI, 35 × 45 mm equals 413 × 531 pixels, with the crown-to-chin facial height occupying 32 to 36 mm (70%–80% of canvas height).',
      specs: [
        { label: 'Millimeter Dimensions', value: '35 mm Width × 45 mm Height', highlight: true },
        { label: '300 DPI Pixel Matrix', value: '413 × 531 pixels' },
        { label: 'Biometric Head Height', value: '32–36 mm (70–80% Face)', highlight: true },
        { label: 'Default Byte Ceiling', value: 'Under 100 KB sRGB JPG' },
      ],
    },
    toolProps: {
      from: 'jpg',
      to: 'jpg',
      fromMime: 'image/jpeg',
      toMime: 'image/jpeg',
      targetKb: 100,
      initialTool: 'resize',
      initialUnit: 'mm',
      initialWidth: 35,
      initialHeight: 45,
      initialDpi: 300,
    },
    specTable: {
      heading: 'Countries Using the 35 × 45 mm Biometric Standard',
      subheading: 'One 413 × 531 px (<100 KB) file satisfies all of these portals:',
      columns: ['Region / Authority', 'Millimeter Size', 'Accepted KB Limit', 'Background Color'],
      rows: [
        ['Schengen Visa (VFS / TLScontact)', '35 × 45 mm', 'Under 200 KB JPG', 'Light Grey or Plain White'],
        ['UK HMPO & UKVI Visa', '35 × 45 mm', '50 KB – 10 MB JPG', 'Cream or Light Grey'],
        ['Australia ImmiAccount & Passport', '35 × 45 mm', 'Under 200–500 KB JPG', 'Plain White / Light'],
        ['India Passport Seva & UAE ICP', '35 × 45 mm', 'Under 100 KB JPG', 'Pure White (#FFFFFF)'],
      ],
    },
    guideSection: {
      heading: 'Calibrated for Both Online Visa Portals & 300 DPI Photo Labs',
      paragraphs: [
        'Because PixelKit sets both the 413 × 531 pixel geometry AND the 300 DPI JFIF header while capping size under 100 KB, the downloaded JPG clears strict online visa portals (like UAE ICP’s 100 KB ceiling) and prints at exact 35 × 45 mm physical scale.',
        'Use the interactive Crop button on your uploaded preview card if you want to nudge headroom so your crown-to-chin height sits cleanly inside the 70–80% biometric window.',
      ],
      cards: [
        { title: 'Clears Strict 100 KB Portals', body: '100 KB default clears UAE, India, Schengen, UK, and Australia simultaneously.' },
        { title: '300 DPI Header Included', body: 'Prints at exact 35 × 45 mm without manual scaling in photo kiosk software.' },
        { title: '100% On-Device Privacy', body: 'No cloud storage, no face databases, zero server uploads.' },
      ],
    },
    faqs: [
      {
        q: 'What is 35 × 45 mm in inches?',
        a: '35 × 45 mm equals 1.38 × 1.77 inches (note: this is smaller and narrower than a US 2 × 2 inch square passport photo).',
      },
      {
        q: 'Can I use a 35 × 45 mm photo for a US visa?',
        a: 'No—US DS-160 and US passports strictly require a 2 × 2 inch (51 × 51 mm / 600 × 600 px) 1:1 square photo. Use our Resize 2×2 Inch tool for US documents.',
      },
      {
        q: 'How much space should be above my head in a 35 × 45 mm photo?',
        a: 'Leave approximately 3 to 5 mm of plain background above the top of your hair/crown so your face occupies 70%–80% of the vertical height.',
      },
      {
        q: 'Does this tool strip smartphone GPS location tags?',
        a: 'Yes! PixelKit strips private EXIF/GPS camera metadata by default while writing clean 300 DPI JFIF headers.',
      },
    ],
    relatedLinks: [
      { title: 'Image Resizer in MM', meta: 'Custom MM Studio', desc: 'Resize to any millimeter specification.', href: '/image-resizer-in-mm/' },
      { title: 'Resize 3.5×4.5 cm Photo', meta: 'Centimeter Equivalent', desc: '3.5×4.5 cm resizer under 50KB for exams.', href: '/resize-image-3-5x4-5-cm/' },
      { title: 'Crop 35×45mm Passport', meta: 'Aspect-Only Crop', desc: 'Crop high-res photos to 3.5:4.5 ratio.', href: '/crop-passport-photo-35x45mm/' },
      { title: 'Schengen Visa Resizer', meta: 'EU VFS Standard', desc: 'Dedicated European Schengen visa studio.', href: '/schengen-visa-photo-resizer/' },
      { title: 'UK Passport Resizer', meta: 'HMPO & UKVI', desc: 'Dedicated UK passport & visa photo resizer.', href: '/uk-passport-photo-resizer/' },
      { title: 'UAE & Dubai Visa Resizer', meta: 'ICP & GDRFA <100KB', desc: 'Official Dubai & UAE visa photo resizer.', href: '/uae-visa-photo-resizer/' },
    ],
  },

  {
    slug: 'resize-image-2x2-inch',
    title: 'Resize Image to 2×2 Inch Online (600×600 px) | PixelKit',
    description:
      'Resize photos to exact 2×2 inches (600×600 px at 300 DPI, under 240KB JPG) for US Visa DS-160, US Passport, OCI & Green Card Lottery. 100% private.',
    keywords: [
      'resize image 2x2 inch',
      '2x2 photo converter online free',
      '2x2 inch photo in pixels',
      'us passport 2x2 photo resizer',
      'oci photo resizer 2x2 inch',
    ],
    badge: '2 × 2 Inch Square Pre-Selected · 600 × 600 px @ 300 DPI · ≤ 240 KB',
    ogTitle: 'Resize Image to 2 × 2 Inch',
    ogBadge: '600×600 PX · UNDER 240KB',
    ogSubtitle: 'Exact 2×2" square at 300 DPI for US Visa, Passport, OCI & Saudi Visa',
    breadcrumbParent: { label: 'Image Resizer in Inches', href: '/image-resizer-in-inches/' },
    breadcrumbLabel: 'Resize 2 × 2 Inch',
    h1: 'Resize Image to 2 × 2 Inch Online (600 × 600 px)',
    heroSubtitle:
      'Pre-configured to exact 2 × 2 inches (51 × 51 mm / 600 × 600 pixels at 300 DPI) and under 240 KB JPG—compliant with US DS-160, US Passport, Indian OCI, and Saudi eVisa.',
    directAnswer: {
      title: 'Official 2 × 2 Inch Photo Specification in Pixels & KB',
      summaryText:
        'A standard 2 × 2 inch (51 × 51 mm) biometric square photo equals exactly 600 × 600 pixels at 300 DPI (and up to 1200 × 1200 px at 600 DPI). The US Department of State (CEAC DS-160, DS-260, DV Lottery, Online Passport Renewal) enforces 600 × 600 px minimum in sRGB JPEG under 240 KB, while Indian OCI and Saudi eVisa require 2 × 2" under 200 KB / 100 KB.',
      specs: [
        { label: 'Physical Print Size', value: '2.0 × 2.0 Inches (51 × 51 mm)', highlight: true },
        { label: '300 DPI Pixel Output', value: '600 × 600 pixels (1:1 Square)' },
        { label: 'Pre-Selected File Cap', value: 'Under 240 KB JPG (Adjustable)', highlight: true },
        { label: 'Head Height Rule', value: '1" to 1-3/8" (50%–69% of Height)' },
      ],
    },
    toolProps: {
      from: 'jpg',
      to: 'jpg',
      fromMime: 'image/jpeg',
      toMime: 'image/jpeg',
      targetKb: 240,
      initialTool: 'resize',
      initialUnit: 'in',
      initialWidth: 2,
      initialHeight: 2,
      initialDpi: 300,
    },
    specTable: {
      heading: 'Portals Requiring 2 × 2 Inch (1:1 Square) Photos',
      subheading: 'Verify the exact kilobyte cap for your specific 2 × 2" submission:',
      columns: ['Portal / Document', 'Inch & MM Size', 'Pixel Dimensions', 'Max File Size'],
      rows: [
        ['US Visa (DS-160 / DS-260) & Passport', '2 × 2 in (51×51 mm)', '600 × 600 px', 'Under 240 KB JPG'],
        ['US Diversity Visa (Green Card Lottery)', '2 × 2 in (51×51 mm)', '600 × 600 px strictly', 'Under 240 KB JPG'],
        ['Indian OCI Card & Renunciation', '2 × 2 in (51×51 mm)', '600 × 600 px (min 200×200)', 'Under 200–500 KB JPG'],
        ['Saudi Arabia eVisa & Umrah (Nusuk)', '2 × 2 in (51×51 mm)', '600 × 600 px', 'Under 100 KB JPG'],
      ],
    },
    guideSection: {
      heading: 'Center-Square Cropping Without Squishing Rectangular Photos',
      paragraphs: [
        'Smartphones shoot in 4:3 or 16:9 rectangular ratios. Dropping a phone portrait into PixelKit’s 2 × 2 inch resizer automatically applies smart 1:1 Cover-Cropping rather than squishing your face horizontally, and embeds genuine 300 DPI JFIF headers.',
        'Applying for a Saudi eVisa (<100 KB) or Indian OCI (<200 KB)? Just click `100 KB` or `200 KB` in Stage 3 while `2 × 2 in` remains locked in Stage 2.',
      ],
      cards: [
        { title: 'Exact 600 × 600 px @ 300 DPI', body: 'Passes CEAC DS-160 photo validator and prints cleanly on 2×2" pharmacy templates.' },
        { title: 'No Eyeglasses Since 2016', body: 'Remember: US State Department rules strictly ban eyeglasses in all 2×2" visa and passport photos.' },
        { title: '100% Private Local Studio', body: 'Visa and OCI photos are processed entirely on your own device.' },
      ],
    },
    faqs: [
      {
        q: 'What is 2 × 2 inches in cm and mm?',
        a: '2 × 2 inches equals exactly 5.08 × 5.08 cm, or roughly 51 × 51 mm.',
      },
      {
        q: 'Why did the US DS-160 checker reject my 2×2 photo for compression ratio?',
        a: 'CEAC requires JPEG compression ratios to stay ≤ 20:1 (typically 40 KB to 240 KB at 600 × 600 px). Over-compressed 12 KB images are rejected; PixelKit’s 240 KB ceiling keeps rich ~90–180 KB quality.',
      },
      {
        q: 'Can I output 1200 × 1200 pixels for a 2 × 2 inch photo?',
        a: 'Yes! Change DPI from 300 to 600 in Stage 2 (2 in × 600 DPI = 1200 × 1200 px), which is the maximum resolution accepted by US State Department portals.',
      },
      {
        q: 'Is this tool free and watermark-free?',
        a: '100% free, unlimited, no signup, no watermarks, and zero server uploads.',
      },
    ],
    relatedLinks: [
      { title: 'US Visa Photo Resizer', meta: 'DS-160 & DV Lottery', desc: 'Dedicated US Department of State biometric preset.', href: '/us-visa-photo-resizer/' },
      { title: 'Saudi Visa Photo Resizer', meta: '600×600 px · <100KB', desc: 'Saudi eVisa & Umrah 2×2" under-100KB preset.', href: '/saudi-visa-photo-resizer/' },
      { title: 'Resize 600×600 Pixels', meta: 'Exact 600×600 px', desc: 'Direct 600×600 pixel square resizer.', href: '/resize-image-600x600/' },
      { title: 'Image Resizer in Inches', meta: 'Custom Inch Sizes', desc: 'Resize to 4×6", 5×7", or any inch dimension.', href: '/image-resizer-in-inches/' },
      { title: 'Crop 1:1 Square', meta: 'Aspect-Only 1:1', desc: 'Crop photos to a 1:1 square at full resolution.', href: '/crop-image-1-1-square/' },
      { title: 'Inches to Pixels Converter', meta: 'IN → PX Calculator', desc: 'Calculate pixel counts for any inch print.', href: '/inches-to-pixels-converter/' },
    ],
  },

  {
    slug: 'resize-image-600x600',
    title: 'Resize Image to 600×600 Pixels Online (Free) | PixelKit',
    description:
      'Resize JPG, PNG, WebP & HEIC images to exact 600×600 pixels (1:1 square) online with smart crop, optional KB limit & 300 DPI. 100% private in browser.',
    keywords: [
      'resize image 600x600',
      '600x600 image converter',
      'convert image to 600x600 pixels',
      '600x600 square photo resizer',
      '600 x 600 px image online',
    ],
    badge: 'Exact 600 × 600 px Pre-Selected · 1:1 Smart Cover Crop',
    ogTitle: 'Resize Image to 600 × 600 px',
    ogBadge: 'EXACT 600 × 600 PIXELS',
    ogSubtitle: 'Instant 1:1 square resizer for US visas, avatars & e-commerce',
    breadcrumbParent: { label: 'Resize Image in Pixels', href: '/resize-image-in-pixels/' },
    breadcrumbLabel: '600 × 600 Pixels',
    h1: 'Resize Image to 600 × 600 Pixels Online',
    heroSubtitle:
      'Convert any photo or graphic into a crisp 600 × 600 pixel square in one drop—ideal for US DS-160 visas, WhatsApp/team avatars, Spotify/podcast covers, and store thumbnails.',
    directAnswer: {
      title: 'How to Resize Any Photo to 600 × 600 Pixels Without Distortion',
      summaryText:
        '600 × 600 pixels is a 1:1 square resolution equivalent to 2 × 2 inches at 300 DPI. PixelKit pre-locks Width = 600 px and Height = 600 px using smart Cover-Cropping so non-square camera photos are framed cleanly without squishing faces or product shapes.',
      specs: [
        { label: 'Locked Output Canvas', value: '600 × 600 pixels (0.36 MP)', highlight: true },
        { label: 'Aspect Ratio', value: '1:1 Exact Square' },
        { label: 'Print Equivalent', value: '2 × 2 in @ 300 DPI (5.08 × 5.08 cm)', highlight: true },
        { label: 'Privacy', value: '100% Local Browser Web Workers' },
      ],
    },
    toolProps: {
      from: 'jpg',
      to: 'jpg',
      fromMime: 'image/jpeg',
      toMime: 'image/jpeg',
      targetKb: null,
      initialTool: 'resize',
      initialUnit: 'px',
      initialWidth: 600,
      initialHeight: 600,
      initialDpi: 300,
    },
    specTable: {
      heading: 'Common Uses for 600 × 600 Pixel Images',
      subheading: 'Where 600 × 600 px is the recommended or mandatory specification:',
      columns: ['Use Case', 'Resolution', 'Recommended Format', 'Suggested File Size'],
      rows: [
        ['US Visa (DS-160) & DV Lottery', '600 × 600 px', 'JPG (sRGB)', 'Under 240 KB'],
        ['Saudi eVisa & Indian OCI', '600 × 600 px', 'JPG (sRGB)', 'Under 100 KB / 200 KB'],
        ['WooCommerce / Store Catalog Tile', '600 × 600 px', 'WebP or PNG', '30 KB – 80 KB'],
        ['Corporate Directory / Slack Avatar', '600 × 600 px', 'JPG or PNG', 'Under 200 KB'],
      ],
    },
    guideSection: {
      heading: 'Cover Crop vs White Padding for Product Thumbnails',
      paragraphs: [
        'For portraits and avatars, Cover mode fills the entire 600 × 600 px frame edge-to-edge. For tall or wide e-commerce products (like bottles, shoes, or watches) where trimming edges would cut off the product, switch Fit Mode in Stage 2 to "Contain (Fit Inside)" to center the entire item cleanly inside a 600 × 600 square.',
        'Drop dozens of catalog images at once—PixelKit processes the entire batch in parallel Web Workers and bundles a clean ZIP download.',
      ],
      cards: [
        { title: 'Cover or Contain Fit', body: 'Fill the 600×600 frame edge-to-edge for portraits or letterbox whole products cleanly.' },
        { title: 'WebP, PNG & JPG Output', body: 'Keep transparent PNG/WebP backgrounds for store icons or export sRGB JPGs for portals.' },
        { title: 'Optional Exact KB Cap', body: 'Add a 50 KB, 100 KB, or 240 KB cap in Stage 3 anytime.' },
      ],
    },
    faqs: [
      {
        q: 'How do I adjust which part of my photo stays inside the 600×600 square?',
        a: 'Click the Crop button on your uploaded image card to drag the 1:1 square selection box anywhere on your photo before downloading.',
      },
      {
        q: 'Can I keep a transparent background on a 600×600 PNG?',
        a: 'Yes! Switch Output Format in Stage 1 to PNG or WebP and transparency is preserved.',
      },
      {
        q: 'How big is a 600×600 JPG in kilobytes?',
        a: 'At high quality (85%–92%), a 600 × 600 px JPG typically weighs 45 KB to 140 KB—lightweight for fast web pages and well under 240 KB visa caps.',
      },
      {
        q: 'Can I resize 50 images to 600×600 px at the same time?',
        a: 'Yes. Drag all 50 images into the dropzone and click Download All as ZIP.',
      },
    ],
    relatedLinks: [
      { title: 'Resize 1080×1080 Pixels', meta: 'HD 1:1 Square', desc: 'High-res 1080×1080 px square resizer.', href: '/resize-image-1080x1080/' },
      { title: 'Resize 1920×1080 Pixels', meta: 'Full HD 16:9', desc: 'Widescreen 1920×1080 px banner resizer.', href: '/resize-image-1920x1080/' },
      { title: 'Resize 2×2 Inch Photo', meta: 'US Visa 240KB', desc: '2×2 inch resizer with 240KB cap pre-set.', href: '/resize-image-2x2-inch/' },
      { title: 'Resize Image in Pixels', meta: 'Custom W × H px', desc: 'Enter any custom pixel width and height.', href: '/resize-image-in-pixels/' },
      { title: 'Crop 1:1 Square', meta: 'Full-Res 1:1 Crop', desc: 'Crop to 1:1 square without downscaling.', href: '/crop-image-1-1-square/' },
      { title: 'WhatsApp DP Cropper', meta: '640×640 px Circle', desc: 'Profile photo cropper with circular preview.', href: '/whatsapp-dp-cropper/' },
    ],
  },

  {
    slug: 'resize-image-1080x1080',
    title: 'Resize Image to 1080×1080 Pixels Online (HD 1:1) | PixelKit',
    description:
      'Resize images to exact 1080×1080 pixels (1:1 HD square) online for Instagram posts, Shopify, Amazon, carousels & album art. 100% private in browser.',
    keywords: [
      'resize image 1080x1080',
      '1080x1080 image converter',
      '1080 x 1080 px resizer online',
      'instagram 1080x1080 photo resizer',
      'shopify product photo 1080x1080',
    ],
    badge: 'Exact 1080 × 1080 px HD Square · Instagram & E-Commerce Standard',
    ogTitle: 'Resize Image to 1080 × 1080',
    ogBadge: '1080 × 1080 HD SQUARE',
    ogSubtitle: 'Crisp 1:1 HD square resizer for Instagram, Shopify & carousels',
    breadcrumbParent: { label: 'Resize Image in Pixels', href: '/resize-image-in-pixels/' },
    breadcrumbLabel: '1080 × 1080 Pixels',
    h1: 'Resize Image to 1080 × 1080 Pixels Online',
    heroSubtitle:
      'Pre-set to 1080 × 1080 pixels—the universal high-DPI 1:1 square standard for Instagram carousels, LinkedIn feed graphics, Shopify/Amazon listings, and digital lookbooks.',
    directAnswer: {
      title: 'Why 1080 × 1080 Pixels Is the Universal Web & Social Square Standard',
      summaryText:
        'Instagram, LinkedIn, Threads, Facebook, and modern e-commerce storefronts downsample oversized uploads to 1080 px wide using aggressive server-side encoders. Pre-resizing locally to exact 1080 × 1080 pixels in PixelKit bypasses platform re-scaling blur and keeps text, logos, and product textures razor-sharp.',
      specs: [
        { label: 'Locked Output Canvas', value: '1080 × 1080 pixels (1.17 MP)', highlight: true },
        { label: 'Aspect Ratio', value: '1:1 High-DPI Square' },
        { label: 'Print Equivalent', value: '3.6 × 3.6 in @ 300 DPI', highlight: true },
        { label: 'Batch Support', value: 'Unlimited Parallel Files + ZIP' },
      ],
    },
    toolProps: {
      from: 'jpg',
      to: 'jpg',
      fromMime: 'image/jpeg',
      toMime: 'image/jpeg',
      targetKb: null,
      initialTool: 'resize',
      initialUnit: 'px',
      initialWidth: 1080,
      initialHeight: 1080,
      initialDpi: 72,
    },
    specTable: {
      heading: 'Platforms Standardized on 1080 × 1080 Pixels',
      subheading: 'Recommended format and target byte range for fast loading and zero platform blur:',
      columns: ['Platform', 'Placement', 'Best Format', 'Ideal File Weight'],
      rows: [
        ['Instagram & Threads', 'Square Feed Post & Carousel', 'JPG (sRGB)', '200 KB – 800 KB'],
        ['LinkedIn & Facebook', 'Square Link/Carousel Card', 'JPG or PNG', '150 KB – 600 KB'],
        ['Shopify / WooCommerce', 'Main Product Gallery Zoom', 'WebP or JPG', '80 KB – 200 KB'],
        ['Amazon / Marketplace', 'Secondary Lifestyle Square', 'JPG (Pure White BG)', '150 KB – 500 KB'],
      ],
    },
    guideSection: {
      heading: 'Batch-Prepare Entire Carousels & Product Catalogs Locally',
      paragraphs: [
        'Uploading 10-slide Instagram carousels or 40 SKU product shots to cloud editors wastes upload bandwidth and often adds watermarks or paywalls on bulk exports.',
        'Drop your entire shoot into PixelKit: every image is resized to 1080 × 1080 px in local Web Workers. Switch Output Format to WebP in Stage 1 if you are publishing directly to Shopify or Next.js/Astro storefronts for instant Core Web Vitals gains.',
      ],
      cards: [
        { title: 'Bypasses Instagram Blur', body: 'Matching 1080 px exact width prevents harsh server-side downsampling artifacts.' },
        { title: 'WebP Storefront Mode', body: 'Convert 1080×1080 product shots straight to WebP under 100 KB for sub-second LCP.' },
        { title: 'Zero Watermarks Ever', body: 'Unlimited free exports processed 100% locally in browser memory.' },
      ],
    },
    faqs: [
      {
        q: 'Should I use 1080×1080 or 1080×1350 for Instagram?',
        a: '1080 × 1080 px (1:1) is ideal for square grids, cross-posting to LinkedIn, and album art. For taller vertical feed real estate, check out our Crop 4:5 Portrait tool (1080 × 1350 px).',
      },
      {
        q: 'How do I fit a wide product inside 1080×1080 without cropping the sides?',
        a: 'In Stage 2, change Fit Mode from "Cover" to "Contain" so the entire product sits centered inside the 1080 × 1080 square.',
      },
      {
        q: 'Can I convert PNGs or iPhone HEICs directly to 1080×1080 WebP?',
        a: 'Yes! Select WebP in Stage 1 while 1080 × 1080 px stays active in Stage 2.',
      },
      {
        q: 'Are unpublished campaign visuals uploaded to any server?',
        a: 'Never—all pixel scaling happens strictly inside your local browser.',
      },
    ],
    relatedLinks: [
      { title: 'Instagram Photo Resizer', meta: '1080×1080 & <1MB', desc: 'Pre-set Instagram square & avatar studio.', href: '/instagram-photo-resizer/' },
      { title: 'Crop 4:5 Portrait', meta: 'Instagram 4:5 Feed', desc: 'Vertical 4:5 portrait cropper for social feeds.', href: '/crop-image-4-5-portrait/' },
      { title: 'Resize 1920×1080 Pixels', meta: '16:9 Full HD', desc: 'Widescreen 1920×1080 px HD banner resizer.', href: '/resize-image-1920x1080/' },
      { title: 'Resize 600×600 Pixels', meta: '600×600 Square', desc: 'Compact square resizer for avatars & visas.', href: '/resize-image-600x600/' },
      { title: 'Social Media Resizer', meta: 'All 2026 Platforms', desc: 'YouTube, LinkedIn, X, IG & Facebook presets.', href: '/social-media-image-resizer/' },
      { title: 'Bulk Image Resizer', meta: 'Parallel ZIP Export', desc: 'Batch-resize full product catalogs locally.', href: '/bulk-image-resizer/' },
    ],
  },

  {
    slug: 'resize-image-1920x1080',
    title: 'Resize Image to 1920×1080 Pixels (1080p) | PixelKit',
    description:
      'Resize images to exact 1920×1080 pixels (16:9 Full HD 1080p) online for hero banners, YouTube, slides, Zoom backgrounds & wallpapers. Zero uploads.',
    keywords: [
      'resize image 1920x1080',
      '1920x1080 image converter',
      'convert image to 1920x1080 hd',
      '1080p wallpaper resizer online',
      '16:9 1920x1080 photo resizer',
    ],
    badge: 'Exact 1920 × 1080 px (1080p Full HD · 16:9 Widescreen)',
    ogTitle: 'Resize Image to 1920 × 1080',
    ogBadge: '1920 × 1080 FULL HD 16:9',
    ogSubtitle: 'Widescreen 1080p resizer for hero banners, slides & video overlays',
    breadcrumbParent: { label: 'Resize Image in Pixels', href: '/resize-image-in-pixels/' },
    breadcrumbLabel: '1920 × 1080 Pixels',
    h1: 'Resize Image to 1920 × 1080 Pixels (Full HD 16:9)',
    heroSubtitle:
      'Scale high-resolution photos and graphics to exact 1920 × 1080 pixels (1080p 16:9 widescreen) for website hero headers, PowerPoint/Keynote decks, OBS overlays, and wallpapers.',
    directAnswer: {
      title: '1920 × 1080 Pixels (Full HD 1080p) Technical Specification',
      summaryText:
        '1920 × 1080 pixels has an exact 16:9 widescreen aspect ratio (2.07 megapixels). Downscaling oversized 4K/12MP camera photos to 1920 × 1080 px reduces slide deck sizes, improves website Largest Contentful Paint (LCP), and matches native 1080p video timelines in Premiere, DaVinci Resolve, and OBS.',
      specs: [
        { label: 'Locked Output Canvas', value: '1920 × 1080 pixels (2.07 MP)', highlight: true },
        { label: 'Aspect Ratio', value: '16:9 Widescreen HD' },
        { label: 'Web Hero Target Weight', value: '120 KB – 300 KB (WebP/JPG)', highlight: true },
        { label: 'Privacy', value: '100% Local Browser Processing' },
      ],
    },
    toolProps: {
      from: 'jpg',
      to: 'jpg',
      fromMime: 'image/jpeg',
      toMime: 'image/jpeg',
      targetKb: null,
      initialTool: 'resize',
      initialUnit: 'px',
      initialWidth: 1920,
      initialHeight: 1080,
      initialDpi: 72,
    },
    specTable: {
      heading: 'Where 1920 × 1080 Pixels Performs Best',
      subheading: 'Recommended output formats and byte budgets by workflow:',
      columns: ['Workflow', 'Resolution', 'Recommended Codec', 'Target File Size'],
      rows: [
        ['Website Full-Bleed Hero', '1920 × 1080 px', 'WebP or AVIF', '100 KB – 250 KB'],
        ['PowerPoint / Google Slides BG', '1920 × 1080 px', 'JPG (85% Quality)', '200 KB – 400 KB'],
        ['YouTube / Twitch Stream Overlay', '1920 × 1080 px', 'PNG (Transparent) / JPG', 'Under 2 MB'],
        ['Zoom / Teams Virtual Background', '1920 × 1080 px', 'JPG or PNG', 'Under 1 MB'],
      ],
    },
    guideSection: {
      heading: 'Shrink Bloated Slide Decks & Hero Images Without Softness',
      paragraphs: [
        'Dropping ten raw 8-megabyte Unsplash or DSLR photos into a presentation turns a lightweight deck into an 80 MB email bounce. Pre-resizing all slide backgrounds to 1920 × 1080 px in PixelKit cuts deck size by over 90% with zero visible loss on 1080p projectors and monitors.',
        'Building a fast landing page? Switch Output Format in Stage 1 to `WebP` and set `200 KB` in Stage 3 to generate an ultra-fast 1920 × 1080 hero image.',
      ],
      cards: [
        { title: 'Smart 16:9 Framing', body: 'Center-crops 4:3 or 3:2 camera photos cleanly to 16:9 without stretching.' },
        { title: 'WebP & AVIF Ready', body: 'Export modern next-gen web formats directly alongside classic JPG and PNG.' },
        { title: 'Zero Upload Delay', body: 'Even 50 MB raw exports resize in sub-second local Web Worker memory.' },
      ],
    },
    faqs: [
      {
        q: 'Is 1920 × 1080 the same as 1080p and Full HD (FHD)?',
        a: 'Yes—1080p, Full HD, and FHD all refer to 1920 pixels horizontal width by 1080 pixels vertical height in a 16:9 widescreen ratio.',
      },
      {
        q: 'How do I choose whether to keep the top, middle, or bottom of a tall photo when cropping to 1920×1080?',
        a: 'Click the visual Crop button on your uploaded image card to position the 16:9 frame wherever you want before downloading.',
      },
      {
        q: 'Can I use 1920×1080 for YouTube thumbnails?',
        a: 'Yes! YouTube accepts any 16:9 thumbnail from 1280×720 up to 1920×1080 provided the file is strictly under 2 MB (use Stage 3 to cap at 2000 KB if needed).',
      },
      {
        q: 'Does PixelKit compress my 1920×1080 wallpaper if I want lossless quality?',
        a: 'Choose PNG in Stage 1 or select "Lossless / Max Quality" in Stage 3 for maximum uncompressed desktop wallpaper fidelity.',
      },
    ],
    relatedLinks: [
      { title: 'Crop Image 16:9 Ratio', meta: 'Full-Res 16:9 Crop', desc: 'Crop 4K/8K photos to 16:9 without downscaling.', href: '/crop-image-16-9/' },
      { title: 'YouTube Thumbnail Under 2MB', meta: '1280×720 · <2MB', desc: 'Dedicated YouTube Studio thumbnail compressor.', href: '/youtube-thumbnail-compressor-under-2mb/' },
      { title: 'Resize 1080×1080 Pixels', meta: '1:1 HD Square', desc: 'Instagram & storefront 1080×1080 resizer.', href: '/resize-image-1080x1080/' },
      { title: 'Resize Image in Pixels', meta: 'Custom W × H px', desc: 'Resize to 4K, 720p, or any custom resolution.', href: '/resize-image-in-pixels/' },
      { title: 'Compress WebP Online', meta: 'Core Web Vitals', desc: 'Optimize WebP hero banners for fast LCP.', href: '/compress-webp/' },
      { title: 'Bulk Image Resizer', meta: 'Batch Slide Prep', desc: 'Resize all presentation images at once.', href: '/bulk-image-resizer/' },
    ],
  },

  // ==========================================================
  // 4. ASPECT-RATIO CROP LANDING PAGES (8 PAGES)
  // ==========================================================
  {
    slug: 'crop-image-1-1-square',
    title: 'Crop Image to 1:1 Square Online (Free & Lossless) | PixelKit',
    description:
      'Crop photos to an exact 1:1 square aspect ratio online at full original resolution. Ideal for profile pictures, Instagram, album covers & US visas.',
    keywords: [
      'crop image 1:1',
      'square image cropper online',
      'crop photo to square free',
      '1:1 aspect ratio cropper',
      'square profile picture cropper',
    ],
    badge: '1:1 Square Aspect Ratio Pre-Selected · Full Resolution Retained',
    ogTitle: 'Crop Image to 1:1 Square',
    ogBadge: 'EXACT 1:1 SQUARE CROP',
    ogSubtitle: 'Interactive rule-of-thirds square cropper at full native quality',
    breadcrumbParent: { label: 'Crop Image', href: '/crop-image/' },
    breadcrumbLabel: 'Crop 1:1 Square',
    h1: 'Crop Image to 1:1 Square Online',
    heroSubtitle:
      'Trim rectangular photos into an exact 1:1 square aspect ratio at full camera sharpness—pre-selected for avatars, Instagram carousels, album art, and 2×2" passports.',
    directAnswer: {
      title: 'How 1:1 Square Cropping Preserves Full Sharpness',
      summaryText:
        'A 1:1 crop sets output width equal to output height (e.g., cropping a 4000 × 3000 px photo yields a crisp 3000 × 3000 px square without downscaling). PixelKit pre-selects the 1:1 Square aspect ratio with top/center/bottom anchor controls and an interactive drag-and-zoom crop modal.',
      specs: [
        { label: 'Pre-Selected Ratio', value: '1:1 Exact Square (Width = Height)', highlight: true },
        { label: 'Resolution Policy', value: 'Full Native Pixel Sharpness' },
        { label: 'Interactive Controls', value: 'Drag Handles + Top/Center/Bottom Anchor', highlight: true },
        { label: 'Privacy', value: '100% Client-Side Browser Execution' },
      ],
    },
    toolProps: {
      from: 'jpg',
      to: 'jpg',
      fromMime: 'image/jpeg',
      toMime: 'image/jpeg',
      targetKb: null,
      initialTool: 'crop',
      initialCropAspect: '1:1',
    },
    specTable: {
      heading: 'Common 1:1 Square Use Cases & Optional Pixel Targets',
      subheading: 'Crop at native resolution or pair with Stage 2 pixel dimensions:',
      columns: ['Destination', 'Aspect Ratio', 'Optional Pixel Size', 'Best Format'],
      rows: [
        ['Instagram / Threads Feed', '1:1 Square', '1080 × 1080 px', 'JPG (sRGB)'],
        ['Spotify / Apple Music Cover Art', '1:1 Square', '3000 × 3000 px', 'JPG or PNG'],
        ['WhatsApp / Discord / LinkedIn DP', '1:1 Square', '640 × 640 px+', 'JPG or PNG'],
        ['US Visa / PAN Card Square', '1:1 Square', '600×600 / 213×213 px', 'JPG (<240KB / <50KB)'],
      ],
    },
    guideSection: {
      heading: 'Auto-Square Batch Cropping + Per-Photo Visual Fine-Tuning',
      paragraphs: [
        'Need to square-crop 30 team headshots or product thumbnails fast? Drop them all at once—PixelKit applies the 1:1 Square ratio across the entire queue automatically (choose "Top" anchor for headshots so foreheads are never cut, or "Center" for products).',
        'Want custom composition on specific shots? Click the Crop icon on any preview card to position the rule-of-thirds 1:1 frame interactively.',
      ],
      cards: [
        { title: 'Headshot-Safe Top Anchor', body: 'Switch Crop Anchor to "Top / Head" when batch-cropping portraits into 1:1 avatars.' },
        { title: 'Zero Quality Loss', body: 'Retains native pixel density unless you explicitly choose a pixel width in Stage 2.' },
        { title: 'Transparent PNG Support', body: 'Crops transparent logos and UI icons cleanly without adding white borders.' },
      ],
    },
    faqs: [
      {
        q: 'Does cropping to 1:1 reduce the resolution of my image?',
        a: 'Only the excess side edges are trimmed—the shorter dimension stays at 100% of your original pixel count (e.g., 3024 × 4032 px crops to 3024 × 3024 px).',
      },
      {
        q: 'Can I crop to 1:1 AND resize to 600×600 or 1080×1080 at the same time?',
        a: 'Yes! Open Stage 2 (Resize Dimensions) to enter 600 × 600 px or 1080 × 1080 px while 1:1 stays locked.',
      },
      {
        q: 'How do I preview how my 1:1 square looks inside a circular DP mask?',
        a: 'Keep key facial features inside the central 80% of the 1:1 grid, or visit our dedicated WhatsApp DP Cropper.',
      },
      {
        q: 'Are my personal photos uploaded to a server?',
        a: 'Never. All cropping runs 100% locally in your browser via HTML5 Canvas and Web Workers.',
      },
    ],
    relatedLinks: [
      { title: 'Crop Image Studio', meta: 'All Aspect Ratios', desc: 'Freeform and preset aspect-ratio cropper.', href: '/crop-image/' },
      { title: 'Crop 4:5 Portrait', meta: 'Instagram 4:5', desc: 'Vertical 4:5 social feed portrait cropper.', href: '/crop-image-4-5-portrait/' },
      { title: 'Crop 16:9 Widescreen', meta: 'YouTube & HD 16:9', desc: 'Widescreen 16:9 banner and thumbnail cropper.', href: '/crop-image-16-9/' },
      { title: 'Resize 1080×1080 Pixels', meta: 'HD Square Resizer', desc: 'Crop and scale directly to 1080×1080 px.', href: '/resize-image-1080x1080/' },
      { title: 'Resize 600×600 Pixels', meta: '600×600 Square', desc: 'Crop and scale directly to 600×600 px.', href: '/resize-image-600x600/' },
      { title: 'WhatsApp DP Cropper', meta: 'Circular Safe Zone', desc: 'Square profile picture cropper under 200KB.', href: '/whatsapp-dp-cropper/' },
    ],
  },

  {
    slug: 'crop-image-16-9',
    title: 'Crop Image to 16:9 Widescreen Online (Free HD) | PixelKit',
    description:
      'Crop images to an exact 16:9 widescreen aspect ratio online at full resolution for YouTube thumbnails, 1080p/4K slides, hero banners & video.',
    keywords: [
      'crop image 16:9',
      '16:9 aspect ratio cropper online',
      'widescreen photo cropper',
      'crop photo for youtube thumbnail 16:9',
      '16 by 9 image cropper',
    ],
    badge: '16:9 Widescreen Pre-Selected · YouTube, Slides & 4K Hero Standard',
    ogTitle: 'Crop Image to 16:9 Ratio',
    ogBadge: 'EXACT 16:9 WIDESCREEN',
    ogSubtitle: 'Full-resolution 16:9 framing for YouTube, presentations & web heroes',
    breadcrumbParent: { label: 'Crop Image', href: '/crop-image/' },
    breadcrumbLabel: 'Crop 16:9 Widescreen',
    h1: 'Crop Image to 16:9 Widescreen Online',
    heroSubtitle:
      'Frame 4:3 smartphone photos and 3:2 DSLR shots into a clean 16:9 widescreen canvas—pre-selected for YouTube thumbnails, Keynote/PowerPoint slides, and hero banners.',
    directAnswer: {
      title: '16:9 Aspect Ratio Cropping Explained',
      summaryText:
        '16:9 (1.778:1) is the global widescreen standard for HDTV, YouTube videos, Twitch streams, and modern presentation decks (1280×720, 1920×1080, 2560×1440, 3840×2160). PixelKit pre-locks the 16:9 crop frame at full horizontal resolution so you never get black pillarbox bars on video timelines or slides.',
      specs: [
        { label: 'Locked Aspect Ratio', value: '16:9 Widescreen (1.778 : 1)', highlight: true },
        { label: 'Native 4K / HD Support', value: 'Preserves Full Source Width' },
        { label: 'Anchor & Drag Framing', value: 'Interactive Rule-of-Thirds Modal', highlight: true },
        { label: 'Privacy', value: '100% Local Browser Processing' },
      ],
    },
    toolProps: {
      from: 'jpg',
      to: 'jpg',
      fromMime: 'image/jpeg',
      toMime: 'image/jpeg',
      targetKb: null,
      initialTool: 'crop',
      initialCropAspect: '16:9',
    },
    specTable: {
      heading: 'Standard 16:9 Widescreen Pixel Tiers',
      subheading: 'Native 16:9 resolutions from HD thumbnails up to 4K Ultra HD:',
      columns: ['Tier Name', '16:9 Pixel Dimensions', 'Megapixels', 'Primary Application'],
      rows: [
        ['720p HD (YouTube Min)', '1280 × 720 px', '0.92 MP', 'YouTube custom thumbnails (<2 MB), OG cards'],
        ['1080p Full HD (FHD)', '1920 × 1080 px', '2.07 MP', 'Slide decks, web hero banners, Zoom backgrounds'],
        ['1440p QHD (2K)', '2560 × 1440 px', '3.69 MP', 'Desktop monitors, retina blog headers'],
        ['2160p 4K UHD', '3840 × 2160 px', '8.29 MP', '4K video B-roll stills, TV signage, wallpapers'],
      ],
    },
    guideSection: {
      heading: 'Eliminate Black Bars on YouTube, Video Timelines & Hero Sections',
      paragraphs: [
        'DSLR sensors capture 3:2 images and smartphones shoot 4:3 stills. Dropping those raw stills onto a 16:9 video track or blog card either leaves black sidebars or unpredictably slices off subjects’ foreheads with CSS `object-fit: cover`.',
        'Pre-cropping in PixelKit gives you complete creative control over vertical framing—and you can optionally cap output under 2 MB for YouTube Studio or export ultra-light WebP for websites.',
      ],
      cards: [
        { title: 'Interactive Horizon Control', body: 'Drag the 16:9 window vertically to keep eyes on the upper rule-of-thirds line.' },
        { title: '4K & RAW Export Friendly', body: 'Processes 24MP–60MP camera exports smoothly in local device RAM.' },
        { title: 'Batch Widescreen Queue', body: 'Crop an entire folder of event stills to 16:9 in seconds.' },
      ],
    },
    faqs: [
      {
        q: 'How do I crop to 16:9 for a YouTube thumbnail under 2MB?',
        a: 'Drop your image above (16:9 is already selected), position the crop if needed, and optionally set 2000 KB in Stage 3—or use our dedicated YouTube Thumbnail Under 2MB preset.',
      },
      {
        q: 'Does cropping a 4000 × 3000 px photo to 16:9 keep 4000 px width?',
        a: 'Yes! At 16:9, a 4000 px wide image crops cleanly to 4000 × 2250 pixels with zero horizontal downscaling.',
      },
      {
        q: 'What is the opposite vertical ratio of 16:9 for Reels and Shorts?',
        a: '9:16 is the vertical 1080 × 1920 story/reel ratio—check out our dedicated Crop 9:16 Story tool.',
      },
      {
        q: 'Can I export cropped 16:9 images as WebP or PNG?',
        a: 'Yes—select JPG, PNG, WebP, AVIF, or PDF in Stage 1.',
      },
    ],
    relatedLinks: [
      { title: 'Resize 1920×1080 Pixels', meta: '1080p Full HD', desc: 'Crop and downscale directly to 1920×1080 px.', href: '/resize-image-1920x1080/' },
      { title: 'YouTube Thumbnail Under 2MB', meta: '1280×720 · <2MB', desc: 'Pre-set YouTube thumbnail studio.', href: '/youtube-thumbnail-compressor-under-2mb/' },
      { title: 'Crop 9:16 Vertical Story', meta: 'Reels · Shorts · TikTok', desc: 'Vertical 9:16 full-screen mobile cropper.', href: '/crop-image-9-16-story/' },
      { title: 'Crop 4:3 Standard', meta: 'Classic 4:3 Ratio', desc: '4:3 presentation & catalog photo cropper.', href: '/crop-image-4-3/' },
      { title: 'Crop 1:1 Square', meta: 'Exact Square Crop', desc: '1:1 square aspect ratio cropper.', href: '/crop-image-1-1-square/' },
      { title: 'Crop Image Studio', meta: 'All Ratios & Freeform', desc: 'Full aspect-ratio and freeform cropping hub.', href: '/crop-image/' },
    ],
  },

  {
    slug: 'crop-image-4-3',
    title: 'Crop Image to 4:3 Aspect Ratio Online (Free) | PixelKit',
    description:
      'Crop photos to an exact 4:3 aspect ratio online at full resolution for e-commerce listings, tablets, blog thumbnails, slides & print frames. Zero uploads.',
    keywords: [
      'crop image 4:3',
      '4:3 aspect ratio cropper',
      'crop photo to 4 by 3 online',
      '4:3 landscape image cropper',
      'ecommerce 4:3 product photo crop',
    ],
    badge: '4:3 Classic Landscape Ratio Pre-Selected · Full Resolution',
    ogTitle: 'Crop Image to 4:3 Ratio',
    ogBadge: 'EXACT 4:3 ASPECT RATIO',
    ogSubtitle: 'Clean 4:3 framing for marketplaces, iPads, blogs & classic slides',
    breadcrumbParent: { label: 'Crop Image', href: '/crop-image/' },
    breadcrumbLabel: 'Crop 4:3 Ratio',
    h1: 'Crop Image to 4:3 Aspect Ratio Online',
    heroSubtitle:
      'Frame widescreen 16:9 screenshots or 3:2 DSLR photos into the balanced 4:3 aspect ratio used by Etsy, eBay, real-estate MLS galleries, iPads, and editorial cards.',
    directAnswer: {
      title: 'When to Use the 4:3 Aspect Ratio',
      summaryText:
        'The 4:3 (1.333:1) aspect ratio provides 33% more vertical breathing room than cramped 16:9 banners while remaining wider than 1:1 squares. It is the preferred listing ratio for Etsy thumbnails, real estate MLS property photos (1024×768, 1600×1200, 2048×1536), Substack/Medium cards, and iPad viewports.',
      specs: [
        { label: 'Locked Aspect Ratio', value: '4:3 Landscape (1.333 : 1)', highlight: true },
        { label: 'Common Pixel Scales', value: '1600×1200 · 1200×900 · 800×600' },
        { label: 'Quality Retention', value: 'Full Native Sensor Resolution', highlight: true },
        { label: 'Privacy', value: '100% Client-Side Browser Engine' },
      ],
    },
    toolProps: {
      from: 'jpg',
      to: 'jpg',
      fromMime: 'image/jpeg',
      toMime: 'image/jpeg',
      targetKb: null,
      initialTool: 'crop',
      initialCropAspect: '4:3',
    },
    specTable: {
      heading: 'Platforms & Workflows Using 4:3 Images',
      subheading: 'Standard 4:3 pixel sizes across e-commerce, publishing, and photography:',
      columns: ['Industry / Platform', '4:3 Pixel Size', 'Format', 'Why 4:3 Works Best'],
      rows: [
        ['Etsy & Handmade Marketplaces', '2000 × 1500 px+', 'JPG / WebP', 'Prevents grid thumbnail edge clipping'],
        ['Real Estate MLS / Airbnb', '1600 × 1200 px / 2048 × 1536 px', 'JPG (<2 MB)', 'Shows both floor and ceiling height naturally'],
        ['SaaS Docs & Blog Feature Cards', '1200 × 900 px', 'WebP / PNG', 'Clean UI screenshot framing without tiny text'],
        ['Micro Four Thirds & Print 18×24"', 'Full Sensor Resolution', 'JPG / PNG', 'Matches native 4:3 camera framing'],
      ],
    },
    guideSection: {
      heading: 'Consistent 4:3 Grids Across Mixed Camera Sources',
      paragraphs: [
        'Combining 16:9 desktop screenshots, 3:2 Sony/Canon DSLR photos, and 4:3 iPhone shots on the same portfolio or property listing page creates jagged, uneven masonry rows.',
        'Drop your entire gallery into PixelKit with `4:3` pre-selected to unify every image instantaneously—and optionally convert to WebP or cap file size for instant page loads.',
      ],
      cards: [
        { title: 'Etsy & MLS Compliant', body: 'Matches exact 4:3 search-result card geometry on major marketplaces.' },
        { title: 'Interactive Fine-Tune', body: 'Click Crop on any card to pan horizontally or vertically before export.' },
        { title: 'Batch ZIP Download', body: 'Standardize 50+ listing photos in one local browser pass.' },
      ],
    },
    faqs: [
      {
        q: 'What is the difference between 4:3 and 3:4?',
        a: '4:3 is horizontal landscape (4 units wide by 3 units tall, e.g., 1600 × 1200 px), whereas 3:4 is vertical portrait (3 units wide by 4 units tall, e.g., 1200 × 1600 px). Need vertical? Use our Crop 3:4 Portrait page.',
      },
      {
        q: 'What pixel dimensions match a 4:3 ratio?',
        a: 'Popular exact 4:3 resolutions include 800 × 600, 1024 × 768, 1200 × 900, 1600 × 1200, 2000 × 1500, and 4000 × 3000 pixels.',
      },
      {
        q: 'Can I crop a 16:9 screenshot into 4:3 without blurring UI text?',
        a: 'Yes! Keep Output Format set to PNG or Lossless WebP—PixelKit trims only the left/right edges at 1:1 pixel sharpness.',
      },
      {
        q: 'Is there any limit on file count or megabytes?',
        a: 'No limits—everything runs in your own device RAM with zero server quotas.',
      },
    ],
    relatedLinks: [
      { title: 'Crop 3:4 Portrait', meta: 'Vertical 3:4 Ratio', desc: 'Portrait 3:4 cropper for visas & vertical cards.', href: '/crop-image-3-4/' },
      { title: 'Crop 16:9 Widescreen', meta: '16:9 HD Ratio', desc: 'Widescreen 16:9 cropper for video & banners.', href: '/crop-image-16-9/' },
      { title: 'Crop 4:5 Portrait', meta: 'Instagram 4:5', desc: 'Social feed 4:5 vertical portrait cropper.', href: '/crop-image-4-5-portrait/' },
      { title: 'Crop 1:1 Square', meta: 'Exact 1:1 Square', desc: 'Square cropper for avatars & carousels.', href: '/crop-image-1-1-square/' },
      { title: 'Compress Image to 2MB', meta: 'MLS & Listing Cap', desc: 'Keep high-res property photos under 2MB.', href: '/compress-image-to-2mb/' },
      { title: 'Crop Image Studio', meta: 'All Aspect Ratios', desc: 'Explore all preset and custom crop ratios.', href: '/crop-image/' },
    ],
  },

  {
    slug: 'crop-image-4-5-portrait',
    title: 'Crop Image to 4:5 Portrait Online (Instagram) | PixelKit',
    description:
      'Crop photos to an exact 4:5 vertical portrait ratio (1080×1350) online for Instagram feed posts, LinkedIn mobile cards & print 8×10 frames. Zero uploads.',
    keywords: [
      'crop image 4:5',
      '4:5 aspect ratio cropper',
      'instagram 4:5 photo cropper online',
      '1080x1350 cropper',
      '8x10 print aspect ratio crop 4:5',
    ],
    badge: '4:5 Portrait Pre-Selected · Instagram 1080×1350 & 8×10" Print Ratio',
    ogTitle: 'Crop Image to 4:5 Portrait',
    ogBadge: 'EXACT 4:5 PORTRAIT CROP',
    ogSubtitle: 'Maximum Instagram feed height (1080×1350) & 8×10" frame ratio',
    breadcrumbParent: { label: 'Crop Image', href: '/crop-image/' },
    breadcrumbLabel: 'Crop 4:5 Portrait',
    h1: 'Crop Image to 4:5 Portrait Online (Instagram & 8×10")',
    heroSubtitle:
      'Maximize mobile screen space on Instagram, Threads, Facebook, and LinkedIn feeds—or prepare exact 8 × 10 inch / 16 × 20 inch fine-art print compositions—with locked 4:5 cropping.',
    directAnswer: {
      title: 'Why 4:5 Portrait Gets Maximum Engagement & Matches 8×10 Prints',
      summaryText:
        'A 4:5 vertical ratio (0.8:1, such as 1080 × 1350 px) is the tallest portrait photo Instagram and Facebook feeds display without automatic edge truncation—giving you 25% more vertical screen area than a 1:1 square. Physically, 4:5 also matches standard 8 × 10 inch and 16 × 20 inch picture frames.',
      specs: [
        { label: 'Locked Aspect Ratio', value: '4:5 Vertical Portrait (0.80 : 1)', highlight: true },
        { label: 'Instagram HD Target', value: '1080 × 1350 pixels' },
        { label: 'Physical Frame Match', value: '8 × 10 in · 16 × 20 in', highlight: true },
        { label: 'Privacy', value: '100% Client-Side Browser Studio' },
      ],
    },
    toolProps: {
      from: 'jpg',
      to: 'jpg',
      fromMime: 'image/jpeg',
      toMime: 'image/jpeg',
      targetKb: null,
      initialTool: 'crop',
      initialCropAspect: '4:5',
    },
    specTable: {
      heading: '4:5 Portrait Dimensions Across Social & Print',
      subheading: 'Exact 4:5 pixel dimensions for crisp social feeds and gallery frames:',
      columns: ['Destination', '4:5 Pixel Dimensions', 'Physical Ratio', 'Pro Tip'],
      rows: [
        ['Instagram Feed & Carousel', '1080 × 1350 px (or 1440 × 1800 px)', '4:5 Vertical', 'Prevents Instagram’s auto-crop from cutting shoes/heads'],
        ['Facebook & LinkedIn Mobile Ad', '1080 × 1350 px', '4:5 Vertical', 'Highest thumb-stopping mobile viewport height'],
        ['8 × 10 Inch Framed Portrait', '2400 × 3000 px (@ 300 DPI)', '8:10 = 4:5', 'Pre-crop DSLR 2:3 shots so print labs don’t chop edges'],
        ['16 × 20 Inch Wall Poster', '4800 × 6000 px (@ 300 DPI)', '16:20 = 4:5', 'Keep full camera resolution with Stage 2 untouched'],
      ],
    },
    guideSection: {
      heading: 'Stop Instagram & Print Labs From Chopping 2:3 Camera Portraits',
      paragraphs: [
        'Full-frame cameras shoot vertical portraits in a tall 2:3 ratio, and phones shoot 3:4 or 9:16. Uploading those directly to an Instagram carousel or ordering an 8 × 10" wedding print forces automated center-cropping that often slices off the top of heads or ankles.',
        'With `4:5` pre-selected in PixelKit, you frame every shot intentionally at full sensor quality—and if you want exact `1080 × 1350 px` for Instagram, just enter `1080` × `1350` in Stage 2.',
      ],
      cards: [
        { title: '25% Taller Than 1:1 Square', body: 'Captures maximum vertical feed attention on Instagram, Threads, and LinkedIn.' },
        { title: 'Exact 8×10" Print Ratio', body: '4 ÷ 5 equals 8 ÷ 10—preview and lock exact 8×10 frame borders yourself.' },
        { title: 'Batch Carousel Sync', body: 'Crop all 10 slides of an Instagram photo dump to uniform 4:5 dimensions at once.' },
      ],
    },
    faqs: [
      {
        q: 'Why does Instagram cut off the top and bottom of my vertical photos?',
        a: 'Instagram caps vertical feed posts at the 4:5 ratio (1080 × 1350 px). Taller 9:16 or 2:3 photos get center-cropped automatically unless you pre-crop them to 4:5 yourself.',
      },
      {
        q: 'How do I export exact 1080 × 1350 pixels after cropping to 4:5?',
        a: 'Open Stage 2 (Resize Dimensions), set Width = 1080 and Height = 1350 px, and download your crisp Instagram-ready JPG.',
      },
      {
        q: 'Is 4:5 the same aspect ratio as an 8 × 10 inch print?',
        a: 'Yes! Dividing 8 × 10 by 2 gives 4 × 5—so cropping to 4:5 guarantees zero unexpected cropping at the photo lab.',
      },
      {
        q: 'Does PixelKit add watermarks or compress my photographer portfolio?',
        a: 'Zero watermarks, zero server uploads, and full high-bitrate quality control.',
      },
    ],
    relatedLinks: [
      { title: 'Instagram Photo Resizer', meta: 'Feed & Avatar Studio', desc: 'Dedicated Instagram compression & crop tool.', href: '/instagram-photo-resizer/' },
      { title: 'Crop 9:16 Vertical Story', meta: 'Reels & Stories 9:16', desc: 'Full-screen 9:16 cropper for Reels & TikTok.', href: '/crop-image-9-16-story/' },
      { title: 'Crop 1:1 Square', meta: '1:1 Square Ratio', desc: 'Classic square cropper for grids & avatars.', href: '/crop-image-1-1-square/' },
      { title: 'Crop 3:4 Portrait', meta: '3:4 Vertical Ratio', desc: '3:4 portrait cropper for Pinterest & visas.', href: '/crop-image-3-4/' },
      { title: 'Resize 1080×1080 Pixels', meta: '1080×1080 Square', desc: 'HD 1080×1080 pixel resizer.', href: '/resize-image-1080x1080/' },
      { title: 'Social Media Resizer', meta: 'All Platforms', desc: 'Complete social media sizing suite.', href: '/social-media-image-resizer/' },
    ],
  },

  {
    slug: 'crop-image-9-16-story',
    title: 'Crop Image to 9:16 Vertical Online (Stories) | PixelKit',
    description:
      'Crop images to an exact 9:16 vertical ratio (1080×1920) online for Instagram Stories, Reels, YouTube Shorts, and TikTok. 100% private in-browser tool.',
    keywords: [
      'crop image 9:16',
      '9:16 aspect ratio cropper',
      'instagram story 9:16 photo cropper',
      'youtube shorts thumbnail cropper 9:16',
      'phone wallpaper 9:16 cropper',
    ],
    badge: '9:16 Full-Screen Vertical Pre-Selected · Stories, Reels & Shorts',
    ogTitle: 'Crop Image to 9:16 Story',
    ogBadge: 'EXACT 9:16 VERTICAL',
    ogSubtitle: 'Full-screen framing for Stories, Reels, Shorts, TikTok & wallpapers',
    breadcrumbParent: { label: 'Crop Image', href: '/crop-image/' },
    breadcrumbLabel: 'Crop 9:16 Story',
    h1: 'Crop Image to 9:16 Vertical Online (Stories, Reels & Shorts)',
    heroSubtitle:
      'Transform camera photos and horizontal graphics into edge-to-edge 9:16 vertical canvases for Instagram Stories, Reels covers, TikTok, YouTube Shorts, and mobile lockscreens.',
    directAnswer: {
      title: '9:16 Vertical Aspect Ratio Specification',
      summaryText:
        '9:16 (0.5625:1) is the vertical counterpart to 16:9 HD video, filling modern smartphone screens edge-to-edge at 1080 × 1920 pixels (or 2160 × 3840 px in 4K). Pre-cropping Reels covers, Shorts thumbnails, and Stories in PixelKit eliminates ugly blurred background bars and keeps text inside safe UI zones.',
      specs: [
        { label: 'Locked Aspect Ratio', value: '9:16 Vertical Fullscreen', highlight: true },
        { label: 'Standard HD Canvas', value: '1080 × 1920 pixels' },
        { label: 'Platforms', value: 'IG Stories/Reels, Shorts, TikTok', highlight: true },
        { label: 'Privacy', value: '100% Local Browser RAM' },
      ],
    },
    toolProps: {
      from: 'jpg',
      to: 'jpg',
      fromMime: 'image/jpeg',
      toMime: 'image/jpeg',
      targetKb: null,
      initialTool: 'crop',
      initialCropAspect: '9:16',
    },
    specTable: {
      heading: '9:16 Vertical Specifications & UI Safe Zones',
      subheading: 'Keep titles and faces clear of top/bottom app overlays:',
      columns: ['Platform', '9:16 Resolution', 'Center Grid Preview', 'Safe Text Margin'],
      rows: [
        ['Instagram Stories & Reels Cover', '1080 × 1920 px', '1:1 / 4:5 Center Grid', 'Leave 250 px top & 320 px bottom clear'],
        ['YouTube Shorts Custom Cover', '1080 × 1920 px', '9:16 Shelf Card', 'Avoid bottom 350 px title/channel bar'],
        ['TikTok Cover & Photo Mode', '1080 × 1920 px', '3:4 Profile Grid', 'Keep key text in center 1080 × 1350 box'],
        ['Smartphone Lockscreen Wallpaper', '1080×1920 / 1440×2560 px', 'Full Screen', 'Leave upper third calm for lockscreen clock'],
      ],
    },
    guideSection: {
      heading: 'Craft Crisp Reels Covers & Mobile Wallpapers in Seconds',
      paragraphs: [
        'When you upload a 4:3 iPhone photo straight to Stories or TikTok without pre-cropping to 9:16, apps either pinch-zoom uncontrollably or surround your image with an auto-generated color gradient.',
        'Drop your high-res shot into PixelKit with `9:16` pre-selected, drag the vertical crop window to spotlight your subject, and optionally enter `1080 × 1920` in Stage 2 for pixel-exact delivery.',
      ],
      cards: [
        { title: 'Reels & Shorts Ready', body: 'Matches exact 9:16 vertical video timelines in CapCut, Premiere, and Final Cut.' },
        { title: 'Lossless Phone Wallpapers', body: 'Export crisp PNG or high-bitrate JPG lockscreens with zero cloud compression.' },
        { title: 'Instant Batch Stories', body: 'Prepare a 10-part Story sequence in one drag-and-drop batch.' },
      ],
    },
    faqs: [
      {
        q: 'What is 9:16 in pixels?',
        a: 'Standard Full HD 9:16 is 1080 pixels wide by 1920 pixels tall (1080 × 1920 px). 720p is 720 × 1280 px, and 4K vertical is 2160 × 3840 px.',
      },
      {
        q: 'How do I make sure my 9:16 Reels cover also looks good in my 1:1 or 4:5 Instagram profile grid?',
        a: 'Center your subject’s face and headline inside the middle 4:5 region of the 9:16 crop box so both fullscreen Reels viewers and profile visitors see a balanced frame.',
      },
      {
        q: 'Can I convert iPhone HEIC photos directly to 9:16 JPG?',
        a: 'Yes! Drop any .heic photo in—PixelKit decodes it locally and exports a 9:16 .jpg or .png.',
      },
      {
        q: 'Is my media uploaded anywhere?',
        a: 'Never. All cropping happens locally inside your browser.',
      },
    ],
    relatedLinks: [
      { title: 'Crop 4:5 Portrait', meta: 'Instagram Feed 4:5', desc: '4:5 vertical portrait cropper for feed posts.', href: '/crop-image-4-5-portrait/' },
      { title: 'Crop 16:9 Widescreen', meta: 'Horizontal 16:9', desc: '16:9 widescreen cropper for YouTube & slides.', href: '/crop-image-16-9/' },
      { title: 'Crop 1:1 Square', meta: 'Square 1:1 Crop', desc: '1:1 square cropper for avatars & carousels.', href: '/crop-image-1-1-square/' },
      { title: 'Instagram Photo Resizer', meta: 'IG Studio', desc: 'Instagram post & profile photo resizer.', href: '/instagram-photo-resizer/' },
      { title: 'Social Media Resizer', meta: 'All Social Specs', desc: '2026 presets for YT, IG, X, LinkedIn & FB.', href: '/social-media-image-resizer/' },
      { title: 'Crop Image Studio', meta: 'All Crop Ratios', desc: 'Interactive aspect-ratio and freeform cropper.', href: '/crop-image/' },
    ],
  },

  {
    slug: 'crop-image-3-4',
    title: 'Crop Image to 3:4 Portrait Ratio Online (Free) | PixelKit',
    description:
      'Crop photos to an exact 3:4 vertical portrait aspect ratio online for UK/NZ visas, ID badges, fashion e-commerce, books & Pinterest cards. Zero uploads.',
    keywords: [
      'crop image 3:4',
      '3:4 aspect ratio cropper',
      'portrait 3:4 photo cropper online',
      '600x800 900x1200 cropper',
      'fashion ecommerce 3:4 crop',
    ],
    badge: '3:4 Classic Portrait Pre-Selected · Fashion, ID Cards & Visas',
    ogTitle: 'Crop Image to 3:4 Portrait',
    ogBadge: 'EXACT 3:4 PORTRAIT',
    ogSubtitle: 'Balanced 3:4 framing for apparel catalogs, ID cards & NZ/UK visas',
    breadcrumbParent: { label: 'Crop Image', href: '/crop-image/' },
    breadcrumbLabel: 'Crop 3:4 Portrait',
    h1: 'Crop Image to 3:4 Portrait Ratio Online',
    heroSubtitle:
      'Crop photos into a clean 3:4 vertical portrait (0.75:1)—the standard ratio for apparel e-commerce (Zara/ASOS style grids), corporate ID badges, New Zealand visas, and 6×8" frames.',
    directAnswer: {
      title: 'Where the 3:4 Portrait Aspect Ratio Is Required',
      summaryText:
        'A 3:4 ratio measures 3 units wide by 4 units tall (e.g., 450 × 600 px, 600 × 800 px, 900 × 1200 px, or 1500 × 2000 px). It is mandatory for Immigration New Zealand / NZeTA visas, widely adopted across fashion/apparel Shopify themes, and matches physical 6 × 8 inch, 9 × 12 inch, and 18 × 24 inch frames.',
      specs: [
        { label: 'Locked Aspect Ratio', value: '3:4 Vertical Portrait (0.75 : 1)', highlight: true },
        { label: 'Standard Resolutions', value: '450×600 · 900×1200 · 1500×2000' },
        { label: 'Print Frame Match', value: '6×8" · 9×12" · 18×24"', highlight: true },
        { label: 'Privacy', value: '100% Local Browser Processing' },
      ],
    },
    toolProps: {
      from: 'jpg',
      to: 'jpg',
      fromMime: 'image/jpeg',
      toMime: 'image/jpeg',
      targetKb: null,
      initialTool: 'crop',
      initialCropAspect: '3:4',
    },
    specTable: {
      heading: '3:4 Portrait Applications & Recommended Pixel Sizes',
      subheading: 'Common 3:4 resolutions you can pair in Stage 2 if needed:',
      columns: ['Use Case', '3:4 Pixel Dimensions', 'Recommended Format', 'Notes'],
      rows: [
        ['New Zealand Visa & NZeTA', '450×600 px / 900×1200 px', 'JPG (sRGB)', 'Mandatory 3:4 biometric check'],
        ['Fashion & Apparel Storefront', '1200×1600 px / 1500×2000 px', 'WebP or JPG', 'Shows full outfit silhouette cleanly'],
        ['Employee / Student ID Card', '300×400 px / 600×800 px', 'JPG (<100 KB)', 'Matches CR80 badge portrait slots'],
        ['6 × 8" & 18 × 24" Poster Print', '1800×2400 / 5400×7200 px', 'JPG / PNG (300 DPI)', 'Exact 3:4 print frame geometry'],
      ],
    },
    guideSection: {
      heading: 'Uniform 3:4 Product & Portrait Grids in One Batch',
      paragraphs: [
        'Apparel and lifestyle storefronts look dramatically cleaner when every product card shares an identical 3:4 portrait aspect ratio. Use Top Anchor or interactive Crop handles to align model headroom consistently across dozens of SKU photos.',
        'Exporting directly to WebP in Stage 1 keeps 1200 × 1600 px fashion catalog images crisp at under 120 KB.',
      ],
      cards: [
        { title: 'Headroom-Aware Anchors', body: 'Choose Top, Center, or Bottom anchor—or drag custom crop handles per photo.' },
        { title: 'Visa & ID Ready', body: 'Pair 3:4 crop with Stage 3 KB limits for instant ID portal compliance.' },
        { title: 'Zero Cloud Upload', body: 'Unpublished lookbooks and employee badge portraits stay 100% local.' },
      ],
    },
    faqs: [
      {
        q: 'How is 3:4 different from 3.5:4.5 passport ratio?',
        a: '3:4 equals 0.750 width-to-height, whereas 3.5:4.5 (35×45 mm) equals 0.778. Portals like Immigration New Zealand specifically check for 3:4 (0.75), while Schengen/India check for 35×45 mm.',
      },
      {
        q: 'What pixels are 3:4 aspect ratio?',
        a: 'Multiply any base number by 3 and 4: 300×400, 450×600, 600×800, 750×1000, 900×1200, 1200×1600, and 1500×2000 px are all exact 3:4.',
      },
      {
        q: 'Can I batch-crop 40 lookbook photos to 3:4 WebP?',
        a: 'Yes! Select WebP in Stage 1, drop all 40 images in, and click Download All as ZIP.',
      },
      {
        q: 'Does cropping to 3:4 blur my image?',
        a: 'Not at all—cropping at native scale trims excess edges cleanly without resampling interior pixels.',
      },
    ],
    relatedLinks: [
      { title: 'New Zealand Visa Resizer', meta: '3:4 Official Preset', desc: 'Immigration New Zealand & NZeTA photo studio.', href: '/new-zealand-visa-photo-resizer/' },
      { title: 'Crop 4:3 Landscape', meta: 'Horizontal 4:3', desc: '4:3 landscape cropper for Etsy & MLS.', href: '/crop-image-4-3/' },
      { title: 'Crop 4:5 Portrait', meta: 'Instagram 4:5', desc: '4:5 vertical portrait cropper for feeds.', href: '/crop-image-4-5-portrait/' },
      { title: 'Crop 35×45mm Passport', meta: '3.5:4.5 Biometric', desc: 'ICAO 35×45 mm passport aspect cropper.', href: '/crop-passport-photo-35x45mm/' },
      { title: 'Bulk Image Resizer', meta: 'Catalog Batch ZIP', desc: 'Batch resize & convert e-commerce shoots.', href: '/bulk-image-resizer/' },
      { title: 'Crop Image Studio', meta: 'All Crop Ratios', desc: 'Full aspect-ratio and custom cropping tool.', href: '/crop-image/' },
    ],
  },

  {
    slug: 'crop-image-2-1-signature',
    title: 'Crop Signature Image (2:1 Wide Ratio Online) | PixelKit',
    description:
      'Crop scanned or photographed signatures to a clean 2:1 horizontal banner aspect ratio online—remove messy paper borders for UPSC, SSC, IBPS & PAN forms.',
    keywords: [
      'crop signature online',
      '2:1 aspect ratio cropper',
      'crop handwritten signature photo',
      'remove paper margin from signature',
      'signature crop tool 10kb to 20kb',
    ],
    badge: '2:1 Horizontal Signature Crop Pre-Selected · 100% Private',
    ogTitle: 'Crop Signature (2:1 Ratio)',
    ogBadge: '2:1 HORIZONTAL SIGNATURE',
    ogSubtitle: 'Trim excess paper borders & keep sharp ink strokes in browser',
    breadcrumbParent: { label: 'Crop Image', href: '/crop-image/' },
    breadcrumbLabel: 'Crop 2:1 Signature',
    h1: 'Crop Signature Image Online (2:1 Horizontal Ratio)',
    heroSubtitle:
      'Trim away desk clutter, notebook lines, and dark phone shadows around your handwritten signature using a pre-selected 2:1 horizontal crop box—100% privately.',
    directAnswer: {
      title: 'Why Tight 2:1 Cropping Is Critical for Digital Signature Uploads',
      summaryText:
        'When candidates upload an uncropped full-page photo of a tiny signature, the portal shrinks the entire sheet into a 140 × 60 px or 280 × 140 px box—rendering the actual ink signature microscopic and unreadable, leading to admit-card rejection. Cropping tightly to a 2:1 horizontal box keeps your handwriting bold and legible.',
      specs: [
        { label: 'Locked Aspect Ratio', value: '2:1 Horizontal Strip (Width = 2× Height)', highlight: true },
        { label: 'Portal Equivalents', value: '280×140 px · 140×60 px · 400×200 px' },
        { label: 'Optional B&W Mode', value: 'High-Contrast Ink Enhancement', highlight: true },
        { label: 'Zero Upload Security', value: 'Signatures Never Leave Your Device' },
      ],
    },
    toolProps: {
      from: 'jpg',
      to: 'jpg',
      fromMime: 'image/jpeg',
      toMime: 'image/jpeg',
      targetKb: null,
      initialTool: 'crop',
      initialCropAspect: '2:1',
    },
    specTable: {
      heading: 'Signature Aspect Ratios Across Government & Banking Portals',
      subheading: 'Crop tightly around the ink strokes first, then optionally cap KB in Stage 3:',
      columns: ['Portal / Authority', 'Box Dimensions', 'Ratio', 'File Size Window'],
      rows: [
        ['UPSC / State PSC Signature', '280 × 140 px (or 3.5 × 1.5 cm)', '2:1 Wide', '10 KB – 20 KB JPG'],
        ['SSC / IBPS / SBI Signature', '140 × 60 px (4.0 × 2.0 cm)', '~2:1 Wide', '10 KB – 20 KB JPG'],
        ['NSDL / UTIITSL PAN Signature', '400 × 200 px (4.5 × 2.0 cm)', '2:1 Wide', 'Under 30–50 KB JPG'],
        ['PDF Contract / e-Sign Stamp', 'Native High-Res PNG/JPG', '2:1 Wide', 'Transparent or White BG'],
      ],
    },
    guideSection: {
      heading: 'Protect Your Legal Signature From Cloud Storage Harvesting',
      paragraphs: [
        'Your handwritten signature is used on bank cheques, PAN cards, tax filings, and legal deeds—uploading raw signature photos to unknown remote servers is a serious identity-theft risk.',
        'PixelKit crops your signature 100% inside your browser’s local RAM. Click the Crop button on your uploaded card to drag the 2:1 box snugly around your pen strokes (leaving ~10% clean white margin on all four sides), and optionally set 20 KB in Stage 3 if uploading to an exam portal.',
      ],
      cards: [
        { title: 'Interactive Box Handles', body: 'Drag the 2:1 crop frame directly over your signature on a full-page phone photo.' },
        { title: 'B&W Contrast Toggle', body: 'Enable Grayscale in Fine-Tune settings to neutralize warm indoor yellow lighting.' },
        { title: '100% Zero-Knowledge', body: 'Zero bytes transmitted over the network—safe for banking and KYC signatures.' },
      ],
    },
    faqs: [
      {
        q: 'How tight should I crop my signature for SSC, IBPS, or UPSC?',
        a: 'Crop close enough that your signature fills roughly 75%–85% of the horizontal 2:1 box, leaving a thin, clean white paper border without touching any pen loops.',
      },
      {
        q: 'Can I both crop my signature AND compress it to 10KB–20KB?',
        a: 'Yes! Either enable 10–20 KB Range in Stage 3 right here, or jump to our pre-configured Signature Resizer 10KB to 20KB.',
      },
      {
        q: 'Why should I sign on unruled white paper with black ink?',
        a: 'Ruled notebook lines fail automated portal background checks, and black ballpoint/gel ink retains highest contrast after JPEG quantization.',
      },
      {
        q: 'Can I export a cropped signature as PNG for Word or PDF documents?',
        a: 'Yes—select PNG in Stage 1 for lossless crisp strokes when placing your signature onto digital documents.',
      },
    ],
    relatedLinks: [
      { title: 'Signature Resizer Studio', meta: '280×140 px · 10–20KB', desc: 'Complete signature resizer & KB compressor.', href: '/signature-resizer/' },
      { title: 'Signature 10KB to 20KB', meta: 'Strict 10–20KB Bracket', desc: 'Dual-threshold signature compressor.', href: '/signature-resizer-10kb-to-20kb/' },
      { title: 'UPSC Signature Resizer', meta: 'UPSC CSE & OTR', desc: 'Official UPSC signature calibration tool.', href: '/upsc-signature-resizer/' },
      { title: 'Thumb Impression Resizer', meta: '200×200 px LTI', desc: 'Crop & compress Left Thumb Impressions.', href: '/thumb-impression-resizer/' },
      { title: 'PAN Card Photo Resizer', meta: 'NSDL & UTIITSL', desc: 'PAN card photo and signature specifications.', href: '/pan-card-photo-resizer/' },
      { title: 'Crop Image Studio', meta: 'All Aspect Ratios', desc: 'Freeform and preset image cropper.', href: '/crop-image/' },
    ],
  },

  {
    slug: 'crop-passport-photo-35x45mm',
    title: 'Crop Passport Photo to 35×45 mm Online (Free) | PixelKit',
    description:
      'Crop any portrait photo to the official 35×45 mm (3.5:4.5) passport aspect ratio online with biometric head framing & zero server uploads.',
    keywords: [
      'crop passport photo 35x45mm',
      '3.5:4.5 aspect ratio cropper',
      'passport photo cropper online free',
      'crop photo to passport size',
      'biometric passport crop tool',
    ],
    badge: '35 × 45 mm (3.5:4.5) Biometric Passport Crop Pre-Selected',
    ogTitle: 'Crop Passport Photo 35×45mm',
    ogBadge: '3.5 : 4.5 BIOMETRIC RATIO',
    ogSubtitle: 'Frame smartphone portraits to exact 35×45 mm passport proportions',
    breadcrumbParent: { label: 'Crop Image', href: '/crop-image/' },
    breadcrumbLabel: 'Crop 35 × 45 mm Passport',
    h1: 'Crop Passport Photo to 35 × 45 mm Ratio Online',
    heroSubtitle:
      'Frame any home smartphone portrait to the international 35 × 45 mm (3.5:4.5) passport aspect ratio with top-aware head alignment—retaining full camera clarity.',
    directAnswer: {
      title: 'How to Crop a Smartphone Photo to 35 × 45 mm Biometric Framing',
      summaryText:
        'Standard ICAO passports (India, UK, Schengen, Australia, UAE, Japan, Singapore) use a 35:45 (7:9 or 0.778:1) portrait ratio. Unlike resizing tools that immediately downscale pixels, this tool pre-locks the exact 3.5:4.5 crop ratio at full resolution so you can frame head-and-shoulder margins cleanly—or optionally add 413 × 531 px and KB limits in Stages 2 & 3.',
      specs: [
        { label: 'Locked Aspect Ratio', value: '3.5 : 4.5 (35 × 45 mm / 7 : 9)', highlight: true },
        { label: 'Biometric Head Rule', value: '70%–80% Crown-to-Chin Height' },
        { label: 'Default Resolution', value: 'Full High-Res Print Sharpness', highlight: true },
        { label: 'Privacy', value: '100% Client-Side · Zero Uploads' },
      ],
    },
    toolProps: {
      from: 'jpg',
      to: 'jpg',
      fromMime: 'image/jpeg',
      toMime: 'image/jpeg',
      targetKb: null,
      initialTool: 'crop',
      initialCropAspect: '3.5:4.5',
    },
    specTable: {
      heading: '35 × 45 mm Biometric Framing Landmarks',
      subheading: 'Align your portrait inside the 3.5:4.5 crop window using these official rules:',
      columns: ['Landmark', 'Physical Measure (on 45mm)', 'Percentage of Height', 'Visual Check'],
      rows: [
        ['Top Margin (Above Hair)', '3 mm – 5 mm', '7% – 11% from top', 'Thin even white gap above crown'],
        ['Head Height (Crown to Chin)', '32 mm – 36 mm', '70% – 80% of frame', 'Face fills most of center area'],
        ['Eye Line Position', '25 mm – 30 mm from bottom', '55% – 65% from bottom', 'Eyes sit slightly above vertical center'],
        ['Shoulder Visibility', 'Bottom 6 mm – 8 mm', 'Bottom 15%', 'Both shoulders squared to camera'],
      ],
    },
    guideSection: {
      heading: 'High-Resolution Print Crops vs Portal-Sized Crops',
      paragraphs: [
        'If you are sending your passport photo to a commercial photo printer (like Walgreens, Boots, Max Photo, or a home Canon Selphy), keeping full megapixel resolution in a 3.5:4.5 crop delivers ultra-crisp 600+ DPI lab prints.',
        'If you are uploading directly to a government portal that enforces `413 × 531 px` and `< 50 KB` or `< 100 KB`, simply turn on Stage 2 / Stage 3 or pick your country in our Passport Photo Resizer.',
      ],
      cards: [
        { title: 'Interactive Rule-of-Thirds Grid', body: 'Click Crop on your uploaded card to position eye level and crown gap with precision.' },
        { title: 'Full Megapixel Print Quality', body: 'Keeps 100% of cropped sensor pixels for tack-sharp pharmacy or studio sheet printing.' },
        { title: 'Zero Biometric Tracking', body: 'Your face scan never leaves your phone or laptop.' },
      ],
    },
    faqs: [
      {
        q: 'How far should I stand from the camera before cropping to 35×45 mm?',
        a: 'Have someone take your photo from 1.2 to 1.5 meters (4–5 feet) away at eye level. Close-up arm’s-length selfies cause wide-angle nose distortion and hide ears, which fails biometric checks.',
      },
      {
        q: 'Does this crop also resize to 413 × 531 pixels?',
        a: 'By default on this page, Stage 4 crops to the exact 3.5:4.5 ratio at full native resolution. To also scale to exact 413 × 531 px at 300 DPI, use our Resize 35×45 mm tool or open Stage 2.',
      },
      {
        q: 'What if I need a 2 × 2 inch US passport crop instead?',
        a: 'US passports use a 1:1 square ratio—switch Crop Ratio to "1:1 Square" or visit our Crop 1:1 Square / Resize 2×2 Inch page.',
      },
      {
        q: 'Can I crop an iPhone HEIC photo into a 35×45 mm JPG?',
        a: 'Yes! Drop your .heic file straight into PixelKit and download a clean .jpg.',
      },
    ],
    relatedLinks: [
      { title: 'Passport Photo Resizer', meta: '30+ Country Presets', desc: 'Crop + resize + compress for 30+ portals.', href: '/passport-photo-resizer/' },
      { title: 'Resize 35×45 mm Photo', meta: '413×531 px @ 300 DPI', desc: 'Scale directly to 35×45 mm & <100KB.', href: '/resize-image-35x45-mm/' },
      { title: 'Resize 3.5×4.5 cm Photo', meta: 'Under 50KB Exam Spec', desc: '3.5×4.5 cm resizer for SSC, UPSC & NEET.', href: '/resize-image-3-5x4-5-cm/' },
      { title: 'Crop 1:1 Square', meta: '2×2" US Visa Ratio', desc: '1:1 square cropper for US visas & avatars.', href: '/crop-image-1-1-square/' },
      { title: 'Schengen Visa Resizer', meta: '35×45 mm EU Spec', desc: 'European Schengen visa photo resizer.', href: '/schengen-visa-photo-resizer/' },
      { title: 'Crop Image Studio', meta: 'All Aspect Ratios', desc: 'Complete aspect-ratio cropping studio.', href: '/crop-image/' },
    ],
  },

  // ==========================================================
  // 5. EXACT KB / INCREASE IMAGE SIZE PAGES (3 PAGES)
  // ==========================================================
  {
    slug: 'increase-image-size-to-20kb',
    title: 'Increase Image Size to 20KB Online (No Blur) | PixelKit',
    description:
      'Increase JPG or PNG file size to exact 20KB online without blurring. Fix "file smaller than 10KB/20KB" errors on SSC, UPSC, and banking portals.',
    keywords: [
      'increase image size to 20kb',
      'convert 5kb image to 20kb',
      'increase signature size to 20kb online',
      'make image 20kb exact',
      'increase photo kb without losing quality',
    ],
    badge: 'Exact 20 KB Target Pre-Selected · Fixes <10KB / <20KB Portal Errors',
    ogTitle: 'Increase Image Size to 20KB',
    ogBadge: 'EXACT 20 KB CALIBRATION',
    ogSubtitle: 'Safely expand 4KB–15KB signatures & photos to 20KB without blur',
    breadcrumbParent: { label: 'Increase Size in KB', href: '/increase-image-size-in-kb/' },
    breadcrumbLabel: 'Increase to 20KB',
    h1: 'Increase Image Size to 20KB Online (Exact KB)',
    heroSubtitle:
      'Turn tiny 4 KB, 8 KB, or 12 KB signature and thumbprint scans into an exact ~19–20 KB JPEG—clearing minimum KB thresholds on SSC, UPSC, IBPS, and State PSC portals without pixel blur.',
    directAnswer: {
      title: 'How PixelKit Increases Tiny Images to 20KB Safely',
      summaryText:
        'Small 140 × 60 px signatures and 200 × 200 px thumbprints on plain white paper often compress down to just 4–9 KB, triggering "File size must be at least 10 KB / 20 KB" rejections. PixelKit pre-selects Exact Size Mode at 20 KB—maximizing 98%–100% JPEG chroma/luma fidelity first and appending standard ISO/IEC 10918-1 compliant JPEG segment padding if needed so dimensions and sharpness remain 100% intact.',
      specs: [
        { label: 'Pre-Selected Mode', value: 'Exact Size: 20 KB Target', highlight: true },
        { label: 'Pixel Dimensions', value: 'Unchanged (Zero Blurry Upscaling)' },
        { label: 'Compliant Standard', value: 'ISO/IEC 10918-1 Baseline JPEG', highlight: true },
        { label: 'Privacy', value: '100% Client-Side RAM Execution' },
      ],
    },
    toolProps: {
      from: 'jpg',
      to: 'jpg',
      fromMime: 'image/jpeg',
      toMime: 'image/jpeg',
      targetKb: 20,
      initialTool: 'compress',
      initialSizeMode: 'exact',
    },
    specTable: {
      heading: 'Portals Where Increasing Size to ~20KB Solves Rejections',
      subheading: 'When your file is rejected for being below the minimum KB floor:',
      columns: ['Portal / Exam', 'Document Type', 'Required Bracket', 'Result With Exact 20KB'],
      rows: [
        ['SSC CGL, CHSL, MTS, GD', 'Signature (140×60 px)', '10 KB – 20 KB', 'Lands right inside upper 18–20 KB ceiling'],
        ['IBPS PO, Clerk & SBI', 'Signature / LTI', '10 KB – 20 KB / 20–50 KB', 'Clears 10 KB & 20 KB minimum checks'],
        ['SSC / UPSC / State PSC', 'Candidate Photo', '20 KB – 50 KB', 'Raises 14 KB white-BG photos ≥ 20 KB'],
        ['Sarathi Parivahan DL', 'Photo & Signature', '10 KB – 20 KB', 'Passes strict NIC byte check'],
      ],
    },
    guideSection: {
      heading: 'Exact 20KB vs Strict 10KB–20KB Range Note',
      paragraphs: [
        'If your portal requires **at least 20 KB** (for example, `20 KB – 50 KB` photo brackets where your photo is currently `14 KB`), Exact `20 KB` mode (or `25 KB` / `50 KB`) pushes your file right onto the threshold cleanly.',
        'If your portal enforces **strictly under 20 KB** (`10 KB – 20 KB` signature slots where `20.1 KB` is rejected), you can either dial Custom KB to `18 KB` right here or use `Min–Max Range (10–20 KB)` so the output lands safely around `17–19.5 KB`!',
      ],
      cards: [
        { title: 'Zero Screenshot Degradation', body: 'Never zoom-and-screenshot signatures—our ISO stream calibration keeps ink razor-sharp.' },
        { title: 'Works Upward & Downward', body: 'Expands 5 KB files up to ~20 KB and compresses 2 MB files down to ~20 KB alike.' },
        { title: '100% Private Signatures', body: 'Handwritten signatures stay completely private inside your browser.' },
      ],
    },
    faqs: [
      {
        q: 'Will portals accept an image increased to 20KB using PixelKit?',
        a: 'Yes! PixelKit outputs 100% standard baseline JFIF JPEGs using valid quantization tables and ISO/IEC 10918-1 comment segments—accepted by NIC, TCS iON, NTA, IBPS, and UPSC validators.',
      },
      {
        q: 'What if my signature slot rejects 20.1 KB and requires 10KB to 20KB?',
        a: 'Set Target KB to 18 KB (or switch Mode to "Min–Max Range: 10 to 20 KB") so your file sits safely around 18 KB—well above 10 KB and strictly below 20.0 KB.',
      },
      {
        q: 'Does increasing KB change my 140×60 or 350×450 pixel dimensions?',
        a: 'No! Unless you turn on Stage 2 resizing, your exact pixel width and height stay 100% untouched.',
      },
      {
        q: 'Can I increase PNG or HEIC files to 20KB JPG?',
        a: 'Yes—drop PNG, WebP, or HEIC files directly and download a calibrated 20 KB JPG.',
      },
    ],
    relatedLinks: [
      { title: 'Increase Size in KB Hub', meta: 'Any Exact KB Target', desc: 'Increase image size to any custom KB value.', href: '/increase-image-size-in-kb/' },
      { title: 'Increase Size to 50KB', meta: 'Exact 50KB Target', desc: 'Expand 15KB–35KB photos to 50KB.', href: '/increase-image-size-to-50kb/' },
      { title: 'Increase Size to 100KB', meta: 'Exact 100KB Target', desc: 'Expand documents & portraits to 100KB.', href: '/increase-image-size-to-100kb/' },
      { title: 'Signature 10KB to 20KB', meta: '10–20KB Range Mode', desc: 'Pre-calibrated 10–20KB signature resizer.', href: '/signature-resizer-10kb-to-20kb/' },
      { title: 'Compress Image to 20KB', meta: 'Strictly ≤ 20KB', desc: 'Shrink heavy images strictly under 20KB.', href: '/compress-image-to-20kb/' },
      { title: 'Thumb Impression Resizer', meta: '10–20KB LTI', desc: 'Left Thumb Impression resizer & compressor.', href: '/thumb-impression-resizer/' },
    ],
  },

  {
    slug: 'increase-image-size-to-50kb',
    title: 'Increase Image Size to 50KB Online (Exact KB) | PixelKit',
    description:
      'Increase JPG or PNG image size from 10KB/20KB up to exact 50KB online without losing sharpness. Ideal for SSC, UPSC, IBPS & university admission forms.',
    keywords: [
      'increase image size to 50kb',
      'convert 20kb image to 50kb',
      'make photo 50kb online',
      'increase jpg size to 50kb without blur',
      'exact 50kb image converter',
    ],
    badge: 'Exact 50 KB Target Pre-Selected · Zero Pixel Distortion',
    ogTitle: 'Increase Image Size to 50KB',
    ogBadge: 'EXACT 50 KB CALIBRATION',
    ogSubtitle: 'Expand under-sized WhatsApp & studio photos to 50KB cleanly',
    breadcrumbParent: { label: 'Increase Size in KB', href: '/increase-image-size-in-kb/' },
    breadcrumbLabel: 'Increase to 50KB',
    h1: 'Increase Image Size to 50KB Online (No Blur)',
    heroSubtitle:
      'Safely elevate WhatsApp-compressed 12 KB – 25 KB portraits or small document crops to an exact ~48–50 KB JPEG without enlarging or blurring pixel dimensions.',
    directAnswer: {
      title: 'Why Photos Drop Below Portal Minimums & How Exact 50KB Fixes It',
      summaryText:
        'Photos shared via WhatsApp or cropped to 200 × 230 px / 350 × 450 px against a clean white studio wall frequently weigh only 11–19 KB—failing portals with 20 KB, 30 KB, or 40 KB minimum limits. PixelKit pre-selects Exact 50 KB mode, encoding maximum perceptual JPEG fidelity plus compliant ISO stream padding to hit ~48–50 KB locally.',
      specs: [
        { label: 'Pre-Selected Mode', value: 'Exact Size: 50 KB Target', highlight: true },
        { label: 'Dimensions', value: 'Preserves Original Width × Height' },
        { label: 'Works Both Ways', value: 'Expands <50KB & Shrinks >50KB', highlight: true },
        { label: 'Privacy', value: '100% In-Browser · Zero Uploads' },
      ],
    },
    toolProps: {
      from: 'jpg',
      to: 'jpg',
      fromMime: 'image/jpeg',
      toMime: 'image/jpeg',
      targetKb: 50,
      initialTool: 'compress',
      initialSizeMode: 'exact',
    },
    specTable: {
      heading: 'Portals Cleared by Calibrating File Weight Near 45–50KB',
      subheading: 'Ideal for minimum-size brackets across exams, visas, and admissions:',
      columns: ['Portal / Form', 'Required File Bracket', 'Problem Input', 'Calibrated Output'],
      rows: [
        ['China Visa (COVA Portal)', '40 KB – 120 KB JPG', '28 KB studio headshot', '~50 KB (safely >40 KB min)'],
        ['UK Passport / State PSC', '50 KB minimum / 30–50 KB', '22 KB WhatsApp photo', '~50 KB exact baseline JPG'],
        ['IBPS Handwritten Declaration', '50 KB – 100 KB JPG', '32 KB cropped white sheet', 'Use 55–60 KB custom or Exact 50 KB'],
        ['JEE / NEET / University Category Cert', '50 KB – 300 KB', '35 KB scan', 'Boost to 55–100 KB cleanly'],
      ],
    },
    guideSection: {
      heading: 'Fine-Tune Between 48KB (Under 50KB) and 55KB (Above 50KB)',
      paragraphs: [
        'Check your official notification wording carefully: if the form says **"20 KB to 50 KB"**, type `45` in Target KB (or pick `Min–Max Range: 20 to 50 KB`) so the file stays strictly ≤ 50.0 KB while comfortably clearing 20 KB.',
        'If the form says **"Minimum 50 KB to 100 KB"** (such as IBPS handwritten declarations or UKVI 50 KB minimums), type `60` in Target KB so every byte sits safely above the 50 KB floor!',
      ],
      cards: [
        { title: '1-KB Precision Dial', body: 'Set 45 KB, 50 KB, or 60 KB with single-kilobyte precision in Stage 3.' },
        { title: 'Preserves Exact Pixels', body: 'Your 350×450 px or 413×531 px dimensions remain untouched unless you enable Stage 2.' },
        { title: 'Zero Cloud Uploads', body: 'Candidate photos and handwritten declarations never leave your device.' },
      ],
    },
    faqs: [
      {
        q: 'Why did my photo shrink to 15KB after cropping on my phone?',
        a: 'Mobile gallery editors re-save cropped photos at ~75% JPEG quality, and smooth white backgrounds contain very few high-frequency DCT coefficients—dropping file size under 20 KB.',
      },
      {
        q: 'Should I pick 45KB or 50KB for SSC and UPSC?',
        a: 'For SSC/UPSC (20–50 KB limit), targeting 45 KB or using our Resize Image 20KB to 50KB range preset guarantees your file is well above 20 KB and strictly under the 50.0 KB ceiling.',
      },
      {
        q: 'What if I need 50KB to 100KB for an IBPS handwritten declaration?',
        a: 'Simply type 65 in the Custom KB input above (keeping Exact mode selected) to generate a ~65 KB JPG right in the middle of the 50–100 KB window.',
      },
      {
        q: 'Does increasing KB add visible noise or artifacts?',
        a: 'Zero artifacts! PixelKit uses higher luminance/chrominance precision plus standard non-visual JPEG metadata padding.',
      },
    ],
    relatedLinks: [
      { title: 'Increase Size in KB Hub', meta: 'Custom Exact KB', desc: 'Increase image size to any KB requirement.', href: '/increase-image-size-in-kb/' },
      { title: 'Increase Size to 20KB', meta: 'Exact 20KB Target', desc: 'Expand tiny 5KB signatures up to 20KB.', href: '/increase-image-size-to-20kb/' },
      { title: 'Increase Size to 100KB', meta: 'Exact 100KB Target', desc: 'Expand documents & scans to 100KB.', href: '/increase-image-size-to-100kb/' },
      { title: 'Resize 20KB to 50KB', meta: 'SSC & UPSC Bracket', desc: 'Dedicated 20KB–50KB range resizer.', href: '/resize-image-to-20kb-to-50kb/' },
      { title: 'Compress Image to 50KB', meta: 'Strictly ≤ 50KB', desc: 'Compress larger photos strictly under 50KB.', href: '/compress-image-to-50kb/' },
      { title: 'IBPS Photo & Signature', meta: 'Declaration 50–100KB', desc: 'Complete IBPS PO/Clerk upload suite.', href: '/ibps-photo-signature-resizer/' },
    ],
  },

  {
    slug: 'increase-image-size-to-100kb',
    title: 'Increase Image Size to 100KB Online (Exact KB) | PixelKit',
    description:
      'Increase JPG or PNG file size to exact 100KB online without blurring pixels—meet 50KB–100KB or min 100KB document & visa upload rules privately in browser.',
    keywords: [
      'increase image size to 100kb',
      'convert 30kb image to 100kb',
      'make image 100kb exact online',
      'increase photo size to 100kb without losing quality',
      'increase document jpg to 100kb',
    ],
    badge: 'Exact 100 KB Target Pre-Selected · Certificates, Visas & Declarations',
    ogTitle: 'Increase Image Size to 100KB',
    ogBadge: 'EXACT 100 KB CALIBRATION',
    ogSubtitle: 'Safely expand 20KB–70KB scans & portraits to 100KB locally',
    breadcrumbParent: { label: 'Increase Size in KB', href: '/increase-image-size-in-kb/' },
    breadcrumbLabel: 'Increase to 100KB',
    h1: 'Increase Image Size to 100KB Online (Exact KB)',
    heroSubtitle:
      'Calibrate lightweight 25 KB – 70 KB scans, visa portraits, and handwritten declarations to an exact ~98–100 KB JPEG with zero pixel stretching and 100% browser privacy.',
    directAnswer: {
      title: 'When Portals Require Increasing Image Size to ~100KB',
      summaryText:
        'Several admission, scholarship, consular, and recruitment portals enforce minimum document byte floors—such as "50 KB to 100 KB" (IBPS handwritten declarations), "50 KB to 300 KB" (JEE/NEET certificates), "60 KB to 240 KB" (Canada IRCC), or "minimum 100 KB" (select university & state portals). PixelKit’s pre-selected Exact 100 KB mode hits ~100 KB cleanly in browser Web Workers.',
      specs: [
        { label: 'Pre-Selected Mode', value: 'Exact Size: 100 KB Target', highlight: true },
        { label: 'Quality Preservation', value: '98%–100% Chroma + ISO Padding' },
        { label: 'Bidirectional Engine', value: 'Expands <100KB & Shrinks >100KB', highlight: true },
        { label: 'Confidentiality', value: '100% Local RAM — Zero Uploads' },
      ],
    },
    toolProps: {
      from: 'jpg',
      to: 'jpg',
      fromMime: 'image/jpeg',
      toMime: 'image/jpeg',
      targetKb: 100,
      initialTool: 'compress',
      initialSizeMode: 'exact',
    },
    specTable: {
      heading: 'Common Upload Slots Requiring 60KB–100KB+ Minimums',
      subheading: 'How Exact 100KB mode resolves "file size too small" errors:',
      columns: ['Portal / Document', 'Allowable KB Range', 'Typical Rejection', 'PixelKit Fix'],
      rows: [
        ['Canada Visa / PR (IRCC)', '60 KB – 240 KB JPG', '42 KB studio portrait rejected', 'Exact 100 KB lands cleanly inside 60–240 KB'],
        ['China COVA Online Visa', '40 KB – 120 KB JPG', '34 KB white-background photo', 'Exact 100 KB clears COVA validator'],
        ['IBPS / SBI Declaration', '50 KB – 100 KB JPG', '38 KB cropped scan rejected', 'Set 85–95 KB (or 50–100 KB Range)'],
        ['College / Scholarship Marksheet', 'Min 100 KB – Max 500 KB', '65 KB WhatsApp forward', 'Set 110–150 KB to clear 100 KB floor'],
      ],
    },
    guideSection: {
      heading: 'Non-Destructive Byte Calibration for Certificates & Visas',
      paragraphs: [
        'Artificially enlarging a 600 × 600 px photo to 3000 × 3000 px just to push its file size over 100 KB breaks portal pixel limits and makes text fuzzy. PixelKit leaves your pixel dimensions untouched while calibrating the encoded JPEG byte stream directly.',
        'Need strictly **under** 100 KB (e.g., `95 KB`) vs **above** 100 KB (e.g., `115 KB`)? Adjust the Custom KB box in Stage 3 by a few kilobytes to sit comfortably inside your portal’s exact window.',
      ],
      cards: [
        { title: 'Exact Pixel Preservation', body: 'Keeps mandatory 420×540, 390×567, or 800×400 px dimensions intact while boosting KB.' },
        { title: 'PDF Output Available', body: 'Need a 100 KB–200 KB PDF certificate instead? Switch Stage 1 output to PDF.' },
        { title: '100% Private Documents', body: 'Marksheets, caste certificates, and visas never touch external servers.' },
      ],
    },
    faqs: [
      {
        q: 'How do I increase a 40KB JPG to above 100KB (e.g., 120KB) for a minimum-100KB portal?',
        a: 'Simply type 120 into the Custom KB field in Stage 3 while Exact Size Mode stays active—PixelKit outputs an exact ~120 KB file safely above the 100 KB minimum.',
      },
      {
        q: 'What if my portal cap is 50KB to 100KB max?',
        a: 'Type 90 in Custom KB (or switch to "Min–Max Range: 50 to 100 KB") so the file lands around 85–95 KB without crossing 100.0 KB.',
      },
      {
        q: 'Can I batch-increase multiple certificate pages to 100KB?',
        a: 'Yes! Drop multiple files at once and download each calibrated image individually or as a single ZIP.',
      },
      {
        q: 'Does this work offline on mobile and desktop?',
        a: 'Yes—once loaded, PixelKit processes everything locally in your browser without sending a single byte over the internet.',
      },
    ],
    relatedLinks: [
      { title: 'Increase Size in KB Hub', meta: 'Any Custom KB', desc: 'Increase image size to any exact KB number.', href: '/increase-image-size-in-kb/' },
      { title: 'Increase Size to 50KB', meta: 'Exact 50KB Target', desc: 'Expand under-sized photos to 50KB.', href: '/increase-image-size-to-50kb/' },
      { title: 'Increase Size to 20KB', meta: 'Exact 20KB Target', desc: 'Expand tiny signatures & LTI scans to 20KB.', href: '/increase-image-size-to-20kb/' },
      { title: 'Compress Image to 100KB', meta: 'Strictly ≤ 100KB', desc: 'Compress heavy photos strictly under 100KB.', href: '/compress-image-to-100kb/' },
      { title: 'Canada Visa Resizer', meta: '60KB–240KB IRCC', desc: 'Official Canada visa 420×540 px studio.', href: '/canada-visa-photo-resizer/' },
      { title: 'China Visa Resizer', meta: '40KB–120KB COVA', desc: 'Official China COVA visa photo studio.', href: '/china-visa-photo-resizer/' },
    ],
  },
];

export function getSeoLandingPageBySlug(slug: string): SeoLandingPage | undefined {
  return SEO_LANDING_PAGES.find((p) => p.slug === slug);
}
