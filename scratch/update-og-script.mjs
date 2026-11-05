import fs from 'fs';

let content = fs.readFileSync('scripts/generate-og-images.mjs', 'utf8');

const newOgPages = `  // P4 New High-Intent Portals & Workflows
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
`;

content = content.replace(
  "  { slug: 'resize-image-to-20kb-to-50kb', title: 'Resize Image 20KB to 50KB', badge: 'SSC & UPSC BRACKET', subtitle: 'Simultaneously scales dimensions and lands strictly in 20-50KB' },\n",
  "  { slug: 'resize-image-to-20kb-to-50kb', title: 'Resize Image 20KB to 50KB', badge: 'SSC & UPSC BRACKET', subtitle: 'Simultaneously scales dimensions and lands strictly in 20-50KB' },\n" +
    newOgPages
);

fs.writeFileSync('scripts/generate-og-images.mjs', content, 'utf8');
console.log('Added 20 new P4 entries to scripts/generate-og-images.mjs');

