import fs from 'fs';

const additions = `
## Official Exam, ID & Visa Presets (New High-Intent Expansion)
- [Signature Resizer](https://pixelkit.app/signature-resizer/): Rescales candidate signatures to 140 × 60 px or 280 × 140 px and compresses strictly between 10 KB and 20 KB JPG.
- [Signature Resizer 10KB to 20KB](https://pixelkit.app/signature-resizer-10kb-to-20kb/): Target dual-threshold limits for SSC, UPSC, IBPS, and State PSCs with zero over/under-compression.
- [IBPS Photo & Signature Resizer](https://pixelkit.app/ibps-photo-signature-resizer/): All-in-one studio for all 4 IBPS uploads (Photo 20–50KB, Signature 10–20KB, Left Thumb 20–50KB, Declaration 50–100KB).
- [SBI PO Photo & Signature Resizer](https://pixelkit.app/sbi-po-photo-resizer/): Standard 200 × 230 px photo (20–50KB) and signature (10–20KB) for State Bank of India online recruitment.
- [GATE Photo & Signature Resizer](https://pixelkit.app/gate-photo-resizer/): Pre-calibrated for IIT GATE GOAPS (Photo 480 × 640 px, Signature 160 × 560 px, 5KB–200KB).
- [JEE Main Photo & Signature Resizer](https://pixelkit.app/jee-main-photo-resizer/): NTA JEE Main candidate photo (10–200KB, 80% face coverage) and signature (4–30KB).
- [CUET Photo & Signature Resizer](https://pixelkit.app/cuet-photo-resizer/): NTA CUET UG/PG applicant photo (10–200KB, white background) and signature (4–30KB).
- [RRB Photo Resizer](https://pixelkit.app/rrb-photo-resizer/): Indian Railways RRB NTPC, ALP, and Group D photo (320 × 400 px, 20–50KB) and signature (10–40KB).
- [Aadhaar PDF Compressor](https://pixelkit.app/aadhaar-pdf-compressor/): Compress password-free supporting POA/POI document PDFs under 100KB, 200KB, or 2MB for UIDAI.
- [Schengen Visa Photo Resizer](https://pixelkit.app/schengen-visa-photo-resizer/): Official 35 × 45 mm (413 × 531 px) framing with 70–80% face height and under 200KB JPG for European visas.
- [UK Passport Photo Resizer](https://pixelkit.app/uk-passport-photo-resizer/): 35 × 45 mm (413 × 531 px) crop with eye-line guide and under 200KB for HMPO renewal and UKVI.
- [Canada Visa Photo Resizer](https://pixelkit.app/canada-visa-photo-resizer/): IRCC Express Entry PR and study permit standard (420 × 540 px, 5:7 ratio, max 240KB JPG).
- [Australia Passport Photo Resizer](https://pixelkit.app/australia-passport-photo-resizer/): Australian Passport Office & ImmiAccount standard (35 × 45 mm, 32–36 mm face height, under 200KB).

## Advanced Utility & Creator Workflows
- [Change Image DPI to 300](https://pixelkit.app/change-image-dpi-to-300/): Lossless metadata modification (JFIF APP0 and PNG pHYs chunks) to convert photos to 300 DPI print quality in 5ms without blur.
- [Pixels to CM Converter](https://pixelkit.app/pixels-to-cm-converter/): Interactive DPI calculator to convert pixels to centimeters and millimeters with 1-click image resizing.
- [CM to Pixels at 300 DPI](https://pixelkit.app/cm-to-pixels-at-300-dpi/): Instant print calculator for 3.5×4.5 cm, 2×2 inch, and A4 document dimensions.
- [EXIF Metadata Remover](https://pixelkit.app/exif-metadata-remover/): Strips GPS coordinates, camera serial numbers, and device timestamps locally in browser memory.
- [WhatsApp DP Cropper](https://pixelkit.app/whatsapp-dp-cropper/): 1:1 square crop (640 × 640 px) with live circular preview to prevent WhatsApp compression blur.
- [LinkedIn Banner Resizer](https://pixelkit.app/linkedin-banner-resizer/): Rescales personal banners to 1584 × 396 px (4:1) with mobile avatar safe-zone guidelines.
- [YouTube Thumbnail Compressor Under 2MB](https://pixelkit.app/youtube-thumbnail-compressor-under-2mb/): Compresses custom 1280 × 720 HD thumbnails strictly under 2.0 MB to pass YouTube Studio upload limits.
`;

for (const file of ['public/llms.txt', 'public/llms-full.txt']) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    if (!content.includes('IBPS Photo & Signature Resizer')) {
      content += additions;
      fs.writeFileSync(file, content, 'utf8');
      console.log(`Updated ${file}`);
    }
  }
}
