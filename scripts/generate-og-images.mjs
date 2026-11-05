#!/usr/bin/env node
/**
 * generate-og-images.mjs
 * ------------------------------------------------------------------
 * Generates per-page Open Graph images (1200×630) so every tool page
 * and combination has a high-contrast branded social share card.
 *
 * Output:
 *   public/og/[slug].png
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
    return await import('@napi-rs/canvas');
  } catch {
    console.error(
      '✖ @napi-rs/canvas not installed.\n' +
        '  Run:  npm i -D @napi-rs/canvas'
    );
    process.exit(1);
  }
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

async function drawCard(ctx, item) {
  // background
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // subtle grid texture
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

  // Brand mark (top-left)
  const bx = 80;
  const by = 75;
  ctx.fillStyle = FG;
  ctx.beginPath();
  ctx.arc(bx + 18, by + 18, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = BG;
  ctx.beginPath();
  ctx.arc(bx + 18, by + 18, 8, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = FG;
  ctx.font = '600 28px Inter, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText('PixelKit', bx + 52, by + 18);

  // Top-right pill
  const pillText = item.pillText || '100% Client-Side · Private';
  ctx.font = '500 20px Inter, sans-serif';
  const pillW = ctx.measureText(pillText).width + 36;
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 1.5;
  roundRect(ctx, WIDTH - 80 - pillW, by - 6, pillW, 44, 22);
  ctx.stroke();
  ctx.fillStyle = MUTED;
  ctx.textBaseline = 'middle';
  ctx.fillText(pillText, WIDTH - 80 - pillW + 18, by + 16);

  // Main title
  ctx.fillStyle = FG;
  const title = item.title;
  const fontSize = title.length > 25 ? (title.length > 35 ? 64 : 76) : 88;
  ctx.font = `700 ${fontSize}px Inter, sans-serif`;
  ctx.textBaseline = 'alphabetic';
  const titleY = HEIGHT / 2 - 20;
  ctx.fillText(title, 80, titleY);

  // Badge (e.g. "UNDER 50 KB" or "350 × 450 PX")
  if (item.badge) {
    const badgeText = item.badge.toUpperCase();
    ctx.font = '700 22px Inter, sans-serif';
    const bw = ctx.measureText(badgeText).width + 36;
    ctx.fillStyle = ACCENT;
    roundRect(ctx, 80, titleY + 28, bw, 46, 12);
    ctx.fill();
    ctx.fillStyle = BG;
    ctx.textBaseline = 'middle';
    ctx.fillText(badgeText, 98, titleY + 51);
  }

  // Subtitle
  ctx.fillStyle = MUTED;
  ctx.font = '400 28px Inter, sans-serif';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(item.subtitle, 80, HEIGHT - 105);

  // Footer divider rule + security stamp
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(80, HEIGHT - 150.5);
  ctx.lineTo(WIDTH - 80, HEIGHT - 150.5);
  ctx.stroke();

  ctx.fillStyle = MUTED;
  ctx.font = '500 20px Inter, sans-serif';
  ctx.fillText('100% in-browser Web Workers · Zero server uploads · Open source', 80, HEIGHT - 55);
}

const STANDALONE_PAGES = [
  // Core Studios
  { slug: 'compress-image', title: 'Image Compressor Online', badge: 'EXACT KB TARGETS', subtitle: 'Shrink JPG, PNG, WebP & PDF with zero server upload' },
  { slug: 'convert', title: 'Online Image Converter', badge: '100% PRIVATE', subtitle: 'Convert HEIC, JPG, PNG, WebP, AVIF & PDF in browser' },
  { slug: 'resize-image', title: 'Online Image Resizer', badge: 'PIXELS & CM PRESETS', subtitle: 'Scale dimensions & compress to KB limits with zero blur' },
  { slug: 'crop-image', title: 'Aspect Ratio Image Cropper', badge: 'FREE CROP STUDIO', subtitle: 'Crop passport photos, social cards & custom ratios locally' },
  { slug: 'bulk-image-resizer', title: 'Bulk Image Resizer', badge: 'PARALLEL WORKERS', subtitle: 'Resize multiple images at once with instant ZIP export' },
  { slug: 'portal-photo-size-chart', title: 'Portal Photo Size Chart', badge: '50+ OFFICIAL SPECS', subtitle: 'Complete 2026 size reference table for exams, visas & IDs' },
  { slug: 'image-resizer-in-cm', title: 'Image Resizer in CM', badge: '3.5×4.5 CM AT 300 DPI', subtitle: 'Convert centimeters and millimeters to exact digital pixels' },
  { slug: 'reduce-image-size-in-kb', title: 'Reduce Image Size in KB', badge: '20KB · 50KB · 100KB', subtitle: 'Decrease photo & document weight strictly under portal limits' },
  { slug: 'increase-image-size-in-kb', title: 'Increase Image Size in KB', badge: 'MEET MINIMUM LIMITS', subtitle: 'Safely expand file size for portals requiring min 20KB or 50KB' },

  // Portals & Exam Tools
  { slug: 'passport-photo-resizer', title: 'Passport Photo Resizer', badge: '413×531 PX & 50KB', subtitle: 'Official passport crop & size standard for 50+ countries' },
  { slug: 'ssc-photo-resizer', title: 'SSC Photo Resizer', badge: '20KB–50KB STRICT', subtitle: 'Pre-calibrated 350×450 px framing for SSC CGL, CHSL & MTS' },
  { slug: 'upsc-signature-resizer', title: 'UPSC Signature Resizer', badge: '10KB–20KB STRICT', subtitle: 'Calibrated 140×60 px signature crop for Civil Services portal' },
  { slug: 'neet-photo-resizer', title: 'NEET Photo Resizer', badge: '10KB–200KB STRICT', subtitle: 'Passport & 4×6 postcard photo specs for NTA NEET & JEE Main' },
  { slug: 'pan-card-photo-resizer', title: 'PAN Card Photo Resizer', badge: '213×213 PX UNDER 50KB', subtitle: 'Exact pixel resolution for NSDL & UTIITSL application cards' },
  { slug: 'us-visa-photo-resizer', title: 'US Visa & DS-160 Resizer', badge: '2×2" SQUARE (600×600)', subtitle: 'Compliant US Department of State DS-160 & DV Lottery standard' },
  { slug: 'resize-image-to-20kb-to-50kb', title: 'Resize Image 20KB to 50KB', badge: 'SSC & UPSC BRACKET', subtitle: 'Simultaneously scales dimensions and lands strictly in 20-50KB' },
  // Info & Blog Pages
  { slug: '404', title: 'Page Not Found', badge: 'PIXELKIT UTILITY', subtitle: 'Explore free client-side image compressors, resizers & converters' },
  { slug: 'about', title: 'About PixelKit', badge: '100% PRIVATE & OPEN', subtitle: 'Zero-upload client-side image studio built by Saqib Ali Baig' },
  { slug: 'privacy', title: 'Privacy Guarantee', badge: 'ZERO SERVER UPLOADS', subtitle: 'All image processing occurs strictly in client device RAM' },
  { slug: 'terms', title: 'Terms of Service', badge: 'FREE WEB UTILITY', subtitle: 'Browser-based image and PDF transformation terms of use' },
  { slug: 'blog', title: 'PixelKit Engineering Blog', badge: 'TECHNICAL GUIDES', subtitle: 'Codec comparisons, DPI benchmarks & portal photo standards' },
  { slug: 'blog/compress-aadhaar-to-100kb-pdf', title: 'Compress Aadhaar to 100KB PDF', badge: 'UIDAI COMPLIANT', subtitle: 'Remove passwords and shrink Aadhaar PDF under 100KB for portals' },
  { slug: 'blog/how-to-crop-image-to-exact-aspect-ratio', title: 'Crop to Exact Aspect Ratio', badge: 'PHOTO CROP GUIDE', subtitle: 'Aspect ratio framing without stretching or quality loss' },
  { slug: 'blog/how-to-resize-image-to-passport-size', title: 'Resize to Passport Size', badge: '35×45MM & 2×2 INCH', subtitle: 'Convert smartphone photos to biometric passport standards' },
  { slug: 'blog/iphone-heic-explained', title: 'iPhone HEIC Format Explained', badge: 'HEIC VS JPEG', subtitle: 'Why Apple uses HEIC and how to convert it locally in browser' },
  { slug: 'blog/why-portals-reject-200kb-photos', title: 'Why Portals Reject Photos', badge: 'EXAM PORTAL GUIDE', subtitle: 'Common intake validation errors and how to clear them in 1 click' },

  // P4 New High-Intent Portals & Workflows
  { slug: 'signature-resizer', title: 'Signature Resizer Online', badge: '10KB–20KB & 2:1 RATIO', subtitle: 'Scale signature to 140×60 px or 280×140 px strictly in 10-20KB' },
  { slug: 'signature-resizer-10kb-to-20kb', title: 'Signature Resizer 10KB to 20KB', badge: 'EXACT 10–20KB BRACKET', subtitle: 'Target dual-threshold limits for SSC, UPSC, IBPS and State exams' },
  { slug: 'ibps-photo-signature-resizer', title: 'IBPS Photo & Signature Studio', badge: 'PHOTO · SIGN · LTI · TEXT', subtitle: 'All 4 IBPS application uploads pre-calibrated on one private studio' },
  { slug: 'sbi-po-photo-resizer', title: 'SBI PO Photo & Signature Resizer', badge: '200×230 PX & 20–50KB', subtitle: 'Crop photo and signature for State Bank of India online recruitment' },
  { slug: 'gate-photo-resizer', title: 'GATE Photo & Signature Resizer', badge: 'GOAPS 5KB–200KB STRICT', subtitle: 'IIT GATE 480×640 px photo and 160×560 px signature standards' },
  { slug: 'jee-main-photo-resizer', title: 'JEE Main Photo & Signature Resizer', badge: 'NTA 10KB–200KB STRICT', subtitle: 'Prepare 80% face coverage photo & signature for NTA JEE portal' },
  { slug: 'cuet-photo-resizer', title: 'CUET Photo & Signature Resizer', badge: 'NTA UG/PG COMPLIANT', subtitle: 'Crop and compress photo & signature for university admissions' },
  { slug: 'rrb-photo-resizer', title: 'Railway RRB Photo Resizer', badge: '320×400 PX (20–50KB)', subtitle: 'Pre-calibrated photo and signature for Railway NTPC, ALP & Group D' },
  { slug: 'aadhaar-pdf-compressor', title: 'Aadhaar PDF Compressor Online', badge: 'UNDER 100KB · 2MB', subtitle: 'Compress Aadhaar POA/POI supporting PDFs for myAadhaar uploads' },
  { slug: 'schengen-visa-photo-resizer', title: 'Schengen Visa Photo Resizer', badge: '35×45 MM (70–80% FACE)', subtitle: 'European consular standard for France, Germany, Italy & Switzerland' },
  { slug: 'uk-passport-photo-resizer', title: 'UK Passport Photo Resizer', badge: 'HMPO & UKVI 35×45 MM', subtitle: 'HM Passport Office & UKVI biometric photo crop under 200KB' },
  { slug: 'canada-visa-photo-resizer', title: 'Canada Visa Photo Resizer', badge: 'IRCC 420×540 PX (5:7)', subtitle: 'IRCC Express Entry PR and study permit digital photo standard' },
  { slug: 'australia-passport-photo-resizer', title: 'Australia Passport Photo Resizer', badge: '35×45 MM IMMIACCOUNT', subtitle: 'Australian passport renewal and Department of Home Affairs standard' },
  { slug: 'change-image-dpi-to-300', title: 'Change Image DPI to 300', badge: 'LOSSLESS METADATA UPDATE', subtitle: 'Convert photos to 300 DPI print standard in 5ms without blur' },
  { slug: 'pixels-to-cm-converter', title: 'Pixels to CM Converter', badge: 'AT 300 DPI & ANY DPI', subtitle: 'Interactive centimeter calculator with 1-click image resizing' },
  { slug: 'cm-to-pixels-at-300-dpi', title: 'CM to Pixels at 300 DPI', badge: 'PRINT CALCULATOR & RESIZER', subtitle: 'Exact pixel dimension table for 3.5×4.5 cm, 2×2 inch, and A4 print' },
  { slug: 'exif-metadata-remover', title: 'EXIF Metadata Remover Online', badge: 'STRIP GPS & CAMERA TAGS', subtitle: 'Remove hidden GPS location and camera serials with 100% privacy' },
  { slug: 'whatsapp-dp-cropper', title: 'WhatsApp DP Cropper Online', badge: '1:1 SQUARE & CIRCLE MASK', subtitle: 'Crop profile picture without WhatsApp auto-compression blur' },
  { slug: 'linkedin-banner-resizer', title: 'LinkedIn Banner Resizer', badge: '1584×396 PX SAFE ZONES', subtitle: 'Resize profile cover banner avoiding mobile profile avatar overlap' },
  { slug: 'youtube-thumbnail-compressor-under-2mb', title: 'YouTube Thumbnail Compressor', badge: 'UNDER 2MB (1280×720 HD)', subtitle: 'Compress custom thumbnails strictly under 2.0 MB without blur' },
  { slug: 'social-media-image-resizer', title: 'Social Media Image Resizer', badge: 'YT · IG · X · LINKEDIN · FB', subtitle: 'Crop and compress social graphics to verified 2026 platform specs' },
  { slug: 'instagram-photo-resizer', title: 'Instagram Photo Resizer', badge: '1080×1080 PX SQUARE & DP', subtitle: 'Crop 1:1 posts & avatars under 1MB without Instagram blur' },
  { slug: 'twitter-header-resizer', title: 'Twitter / X Header Resizer', badge: '1500×500 PX (3:1 BANNER)', subtitle: 'Frame widescreen headers with safe zones strictly under 2MB' },
  { slug: 'facebook-cover-photo-resizer', title: 'Facebook Cover Resizer', badge: '820×312 PX SAFE ZONE', subtitle: 'Resize desktop & mobile cover banners cleanly under 500KB' },
  { slug: 'uae-visa-photo-resizer', title: 'UAE & Dubai Visa Resizer', badge: '413×531 PX UNDER 100KB', subtitle: 'Official UAE ICP, GDRFA Dubai & Golden Visa biometric standard' },
  { slug: 'saudi-visa-photo-resizer', title: 'Saudi Visa & Umrah Resizer', badge: '600×600 PX (2×2") · 100KB', subtitle: 'Saudi MOFA eVisa & Nusuk platform square photo specification' },

  // PDF & Conversion Tools
  { slug: 'compress-image-to-pdf', title: 'Compress Image to PDF', badge: 'UNDER 100KB · 200KB', subtitle: 'Bundle and compress JPG, PNG & HEIC photos into compact PDF' },
  { slug: 'compress-jpg-to-pdf', title: 'Compress JPG to PDF', badge: 'UNDER 100KB · 200KB', subtitle: 'Convert JPG photos into compressed, portal-accepted PDF files' },
  { slug: 'compress-image-without-losing-quality', title: 'Compress Without Losing Quality', badge: 'ZERO BLUR', subtitle: 'Smart psycho-visual quantization preserves edges & skin tones' },
  { slug: 'heic-to-pdf', title: 'HEIC to PDF Converter', badge: 'IPHONE TO PDF', subtitle: 'Convert Apple camera photos into single or multi-page PDF' },
  { slug: 'image-to-pdf', title: 'Image to PDF Converter', badge: 'MULTI-IMAGE PDF', subtitle: 'Combine JPG, PNG, WebP & HEIC into single or multi-page PDF' },
  { slug: 'photo-to-pdf', title: 'Photo to PDF Converter', badge: 'DOCUMENT SCANNER', subtitle: 'Convert camera pictures and ID cards into PDF privately' },
  { slug: 'merge-jpg-to-pdf', title: 'Merge JPG to PDF', badge: 'REORDER & COMBINE', subtitle: 'Merge multiple JPG photos into one compact PDF document' },
  { slug: 'image-to-pdf-200kb', title: 'Image to PDF Under 200KB', badge: 'NEET & VISA CEILING', subtitle: 'Compress images into PDF documents strictly under 200KB' },
  { slug: 'jpg-to-jpeg', title: 'JPG to JPEG Converter', badge: 'MIME STANDARDIZATION', subtitle: 'Instant local format alignment for government and job forms' },
  { slug: 'compress-image-to-specific-size', title: 'Compress to Specific Size', badge: 'CUSTOM KB / MB', subtitle: 'Dial in any exact kilobyte limit with binary search accuracy' },

  // Guides
  { slug: 'how-to-convert-heic-to-jpg-on-windows', title: 'HEIC to JPG on Windows', badge: 'NO CODECS NEEDED', subtitle: 'Free offline in-browser HEIC decoding without Windows extensions' },
  { slug: 'how-to-convert-image-to-pdf', title: 'How to Convert Image to PDF', badge: 'FREE GUIDE & TOOL', subtitle: 'Step-by-step conversion on Windows, Mac, iPhone and Android' },
  { slug: 'how-to-convert-photo-to-pdf-on-iphone', title: 'Photo to PDF on iPhone', badge: 'ZERO APPS REQUIRED', subtitle: 'Instant client-side Safari conversion without installing apps' },

  // Format Compression
  { slug: 'compress-jpg', title: 'Compress JPG Online', badge: 'JPEG OPTIMIZER', subtitle: 'Shrink JPG photos to exact KB limits without blocky artifacts' },
  { slug: 'compress-png', title: 'Compress PNG Online', badge: 'UPNG QUANTIZATION', subtitle: 'Shrink transparent PNGs, screenshots & graphics losslessly' },
  { slug: 'compress-webp', title: 'Compress WebP Online', badge: 'NEXT-GEN CODEC', subtitle: 'Optimize WebP images for green Core Web Vitals page loads' },
  { slug: 'compress-pdf', title: 'Compress PDF Online', badge: 'PDF SHRINKER', subtitle: 'Reduce PDF document file size privately in your browser' },

  // MB Presets
  { slug: 'compress-image-to-1mb', title: 'Compress Image to 1MB', badge: 'UNDER 1 MB', subtitle: 'Shrink photos for email attachments & job application portals' },
  { slug: 'compress-image-to-2mb', title: 'Compress Image to 2MB', badge: 'UNDER 2 MB', subtitle: 'Target 2MB ceilings on civil service & university upload forms' },
  { slug: 'compress-image-to-5mb', title: 'Compress Image to 5MB', badge: 'UNDER 5 MB', subtitle: 'Compress high-res camera photos under 5MB for fast upload' },
  { slug: 'compress-image-to-10mb', title: 'Compress Image to 10MB', badge: 'UNDER 10 MB', subtitle: 'Fit Discord, Slack, and cloud storage upload thresholds' },

  // Dedicated Global Visa & Exam Preset Studios (30/30 Coverage)
  { slug: 'china-visa-photo-resizer', title: 'China Visa Photo Resizer', badge: '390×567 PX (40–120KB)', subtitle: 'Official Chinese COVA online visa & passport biometric standard' },
  { slug: 'japan-visa-photo-resizer', title: 'Japan Visa Photo Resizer', badge: '413×531 PX UNDER 200KB', subtitle: 'Official MOFA JAPAN eVISA & Certificate of Eligibility standard' },
  { slug: 'singapore-visa-photo-resizer', title: 'Singapore ICA Photo Resizer', badge: '400×514 PX UNDER 150KB', subtitle: 'Official Singapore ICA Passport, e-Visa & MOM pass specification' },
  { slug: 'malaysia-passport-photo-resizer', title: 'Malaysia Passport Resizer', badge: '413×591 PX (35×50 MM)', subtitle: 'Official MyOnline Passport & Malaysia eVisa biometric standard' },
  { slug: 'new-zealand-visa-photo-resizer', title: 'New Zealand Visa Resizer', badge: '3:4 PORTRAIT · UNDER 250KB', subtitle: 'Immigration New Zealand online visa & NZeTA digital photo standard' },
  { slug: 'upsc-photo-resizer', title: 'UPSC Photo Resizer', badge: '350×450 PX · 20–50KB JPG', subtitle: 'Pre-calibrated for UPSC Civil Services, NDA, CDS & OTR portals' },
  { slug: 'thumb-impression-resizer', title: 'Thumb Impression Resizer', badge: '200×200 PX · 10–20KB JPG', subtitle: 'Biometric Left Thumb Impression resizer for IBPS, SBI, SSC & NEET' },

  // Print & Screen DPI Calibration Studios
  { slug: 'change-image-dpi-to-200', title: 'Change Image DPI to 200', badge: 'LOSSLESS 200 DPI HEADER', subtitle: 'Exact JFIF & PNG pHYs 200 DPI calibration for PAN, IBPS & SBI' },
  { slug: 'change-image-dpi-to-600', title: 'Change Image DPI to 600', badge: '600 DPI ARCHIVAL GRADE', subtitle: 'Academic journals, USPTO/EPO line art & fine-print DPI stamp' },
  { slug: 'change-image-dpi-to-150', title: 'Change Image DPI to 150', badge: '150 DPI DOCUMENT SCAN', subtitle: 'Lightweight A4 certificate, marksheet & KYC density calibration' },
  { slug: 'change-image-dpi-to-72', title: 'Change Image DPI to 72', badge: '72 DPI WEB & EMAIL', subtitle: 'Normalize 300 DPI scans to 72 DPI for Outlook, CMS & web assets' },

  // Physical, Pixel & Unit Conversion Studios
  { slug: 'image-resizer-in-mm', title: 'Image Resizer in MM', badge: '35×45 MM AT 300 DPI', subtitle: 'Resize photos to exact millimeter dimensions & KB limits locally' },
  { slug: 'image-resizer-in-inches', title: 'Image Resizer in Inches', badge: '2×2" & 4×6" AT 300 DPI', subtitle: 'Scale photos to exact inch measurements with embedded 300 DPI' },
  { slug: 'resize-image-in-pixels', title: 'Resize Image in Pixels', badge: 'EXACT WIDTH × HEIGHT PX', subtitle: 'Scale images to exact pixel dimensions with zero distortion locally' },
  { slug: 'mm-to-pixels-converter', title: 'MM to Pixels Converter', badge: '35×45 MM = 413×531 PX', subtitle: 'Interactive millimeter-to-pixel calculator & 1-click photo resizer' },
  { slug: 'inches-to-pixels-converter', title: 'Inches to Pixels Converter', badge: '2×2 IN = 600×600 PX', subtitle: 'Convert inches to exact pixels at any DPI & resize locally' },
  { slug: 'pixels-to-mm-converter', title: 'Pixels to MM Converter', badge: '413×531 PX = 35×45 MM', subtitle: 'Check exact millimeter print dimensions at 72, 200 & 300 DPI' },
  { slug: 'pixels-to-inches-converter', title: 'Pixels to Inches Converter', badge: '600×600 PX = 2×2 IN', subtitle: 'Calculate sharp inch print sizes at 72, 150 & 300 DPI locally' },
  { slug: 'resize-image-3-5x4-5-cm', title: 'Resize Image 3.5×4.5 cm', badge: '413×531 PX · UNDER 50KB', subtitle: 'Pre-set 3.5×4.5 cm at 300 DPI for Passport, SSC, UPSC & NEET' },
  { slug: 'resize-image-35x45-mm', title: 'Resize Image 35×45 mm', badge: 'ICAO 35×45 MM (413×531)', subtitle: 'Global biometric passport standard for UK, EU, AU, IN & UAE' },
  { slug: 'resize-image-2x2-inch', title: 'Resize Image 2×2 Inch', badge: '600×600 PX · UNDER 240KB', subtitle: 'Exact 2×2" square at 300 DPI for US Visa, Passport, OCI & Saudi' },
  { slug: 'resize-image-600x600', title: 'Resize Image 600×600 px', badge: 'EXACT 600 × 600 PIXELS', subtitle: 'Instant 1:1 square resizer for US visas, avatars & e-commerce' },
  { slug: 'resize-image-1080x1080', title: 'Resize Image 1080×1080', badge: '1080 × 1080 HD SQUARE', subtitle: 'Crisp 1:1 HD square resizer for Instagram, Shopify & carousels' },
  { slug: 'resize-image-1920x1080', title: 'Resize Image 1920×1080', badge: '1920 × 1080 FULL HD 16:9', subtitle: 'Widescreen 1080p resizer for hero banners, slides & video overlays' },

  // Aspect-Ratio Crop Studios
  { slug: 'crop-image-1-1-square', title: 'Crop Image 1:1 Square', badge: 'EXACT 1:1 SQUARE CROP', subtitle: 'Interactive rule-of-thirds square cropper at full native quality' },
  { slug: 'crop-image-16-9', title: 'Crop Image 16:9 Ratio', badge: 'EXACT 16:9 WIDESCREEN', subtitle: 'Full-resolution 16:9 framing for YouTube, presentations & heroes' },
  { slug: 'crop-image-4-3', title: 'Crop Image 4:3 Ratio', badge: 'EXACT 4:3 ASPECT RATIO', subtitle: 'Clean 4:3 framing for marketplaces, iPads, blogs & classic slides' },
  { slug: 'crop-image-4-5-portrait', title: 'Crop Image 4:5 Portrait', badge: 'EXACT 4:5 PORTRAIT CROP', subtitle: 'Maximum Instagram feed height (1080×1350) & 8×10" frame ratio' },
  { slug: 'crop-image-9-16-story', title: 'Crop Image 9:16 Story', badge: 'EXACT 9:16 VERTICAL', subtitle: 'Full-screen framing for Stories, Reels, Shorts, TikTok & wallpapers' },
  { slug: 'crop-image-3-4', title: 'Crop Image 3:4 Portrait', badge: 'EXACT 3:4 PORTRAIT', subtitle: 'Balanced 3:4 framing for apparel catalogs, ID cards & NZ visas' },
  { slug: 'crop-image-2-1-signature', title: 'Crop Signature (2:1)', badge: '2:1 HORIZONTAL SIGNATURE', subtitle: 'Trim excess paper borders & keep sharp ink strokes in browser' },
  { slug: 'crop-passport-photo-35x45mm', title: 'Crop Passport 35×45mm', badge: '3.5 : 4.5 BIOMETRIC RATIO', subtitle: 'Frame smartphone portraits to exact 35×45 mm passport proportions' },

  // Exact KB / Increase Size Studios
  { slug: 'increase-image-size-to-20kb', title: 'Increase Size to 20KB', badge: 'EXACT 20 KB CALIBRATION', subtitle: 'Safely expand 4KB–15KB signatures & photos to 20KB without blur' },
  { slug: 'increase-image-size-to-50kb', title: 'Increase Size to 50KB', badge: 'EXACT 50 KB CALIBRATION', subtitle: 'Expand under-sized WhatsApp & studio photos to 50KB cleanly' },
  { slug: 'increase-image-size-to-100kb', title: 'Increase Size to 100KB', badge: 'EXACT 100 KB CALIBRATION', subtitle: 'Safely expand 20KB–70KB scans & portraits to 100KB locally' },
];

// Add compress-image-to-[size]kb presets
const KB_SIZES = [10, 15, 20, 30, 40, 50, 80, 100, 150, 200, 256, 300, 500];
for (const size of KB_SIZES) {
  STANDALONE_PAGES.push({
    slug: `compress-image-to-${size}kb`,
    title: `Compress Image to ${size}KB`,
    badge: `UNDER ${size} KB STRICT`,
    subtitle: `Client-side binary-search compression · 100% private in browser`,
  });
  STANDALONE_PAGES.push({
    slug: `compress-jpg-to-${size}kb`,
    title: `Compress JPG to ${size}KB`,
    badge: `UNDER ${size} KB JPG`,
    subtitle: `Optimized JPEG quantization for exams, passports & KYC`,
  });
}

// Add photo-to-pdf-[size]kb presets
const PDF_SIZES = [50, 100, 200, 300, 500];
for (const size of PDF_SIZES) {
  STANDALONE_PAGES.push({
    slug: `photo-to-pdf-${size}kb`,
    title: `Photo to PDF ${size}KB`,
    badge: `PDF UNDER ${size} KB`,
    subtitle: `Convert and shrink photos into compact PDF files locally`,
  });
}

async function main() {
  const { createCanvas, GlobalFonts } = await loadCanvasLib();

  try {
    const regular = resolve(ROOT, 'public/fonts/Inter-Variable.woff2');
    await readFile(regular);
    GlobalFonts.registerFromPath(regular, 'Inter');
  } catch {
    /* optional font fallback */
  }

  let data;
  try {
    data = JSON.parse(await readFile(COMBOS_PATH, 'utf8'));
  } catch {
    console.error(`✖ Cannot read ${COMBOS_PATH}`);
    process.exit(1);
  }

  const combos = data.combos || [];
  await mkdir(OUT_DIR, { recursive: true });

  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');

  let written = 0;

  // 1. Generate for all combo pages
  for (const combo of combos) {
    const slug = combo.sizeKb
      ? `${combo.from}-to-${combo.to}-under-${combo.sizeKb}kb`
      : `${combo.from}-to-${combo.to}`;
    const title = combo.sizeKb
      ? `Convert ${combo.from.toUpperCase()} to ${combo.to.toUpperCase()}`
      : `${combo.from.toUpperCase()} → ${combo.to.toUpperCase()}`;
    const badge = combo.sizeKb ? `UNDER ${combo.sizeKb} KB` : `${combo.from.toUpperCase()} TO ${combo.to.toUpperCase()}`;
    const subtitle = combo.sizeKb
      ? `Under ${combo.sizeKb} KB · In your browser · Zero server uploads`
      : `Fast · Private · Free · No uploads required`;

    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    await drawCard(ctx, { title, badge, subtitle });
    const buf = await canvas.encode('png');
    await writeFile(resolve(OUT_DIR, `${slug}.png`), buf);
    written++;
  }

  // 2. Generate for all standalone & preset tool pages
  for (const item of STANDALONE_PAGES) {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    await drawCard(ctx, item);
    const buf = await canvas.encode('png');
    const targetFile = resolve(OUT_DIR, `${item.slug}.png`);
    await mkdir(dirname(targetFile), { recursive: true });
    await writeFile(targetFile, buf);
    written++;
  }

  console.log(`✔ Generated ${written} high-contrast OG images (1200×630) → ${OUT_DIR}`);
}

main().catch((err) => {
  console.error('✖ Unexpected error:', err);
  process.exit(1);
});
