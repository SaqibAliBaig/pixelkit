import fs from 'fs';

const fixes = [
  {
    file: 'src/pages/aadhaar-pdf-compressor.astro',
    target: "const pageTitle = 'Aadhaar PDF Compressor Online (Under 100KB & 2MB)';",
    replacement: "const pageTitle = 'Aadhaar PDF Compressor (< 100KB & 2MB) | PixelKit';"
  },
  {
    file: 'src/pages/change-image-dpi-to-300.astro',
    target: "const pageTitle = 'Change Image DPI to 300 Online (Lossless & Fast)';",
    replacement: "const pageTitle = 'Change Image DPI to 300 Online (Fast) | PixelKit';"
  },
  {
    file: 'src/pages/gate-photo-resizer.astro',
    target: "const pageTitle = 'GATE Photo & Signature Resizer (GOAPS 5–200KB)';",
    replacement: "const pageTitle = 'GATE Photo & Signature Resizer Online | PixelKit';"
  },
  {
    file: 'src/pages/jee-main-photo-resizer.astro',
    target: "const pageTitle = 'JEE Main Photo & Signature Resizer (NTA 10–200KB)';",
    replacement: "const pageTitle = 'JEE Main Photo & Signature Resizer | PixelKit';"
  },
  {
    file: 'src/pages/sbi-po-photo-resizer.astro',
    target: "const pageTitle = 'SBI PO Photo & Signature Resizer Online (20-50KB)';",
    replacement: "const pageTitle = 'SBI PO Photo & Signature Resizer | PixelKit';"
  },
  {
    file: 'src/pages/signature-resizer.astro',
    target: "const pageTitle = 'Signature Resizer Online (10–20 KB & 2:1) — Free';",
    replacement: "const pageTitle = 'Signature Resizer Online (10–20KB & 2:1) | PixelKit';"
  },
  {
    file: 'src/pages/whatsapp-dp-cropper.astro',
    target: "const pageTitle = 'WhatsApp DP Cropper Online (Square & Circle Mask)';",
    replacement: "const pageTitle = 'WhatsApp DP Cropper Online (1:1 Square) | PixelKit';"
  },
];

for (const { file, target, replacement } of fixes) {
  let c = fs.readFileSync(file, 'utf8');
  if (c.includes(target)) {
    c = c.replace(target, replacement);
    fs.writeFileSync(file, c, 'utf8');
    console.log(`Updated title in ${file}`);
  } else {
    console.log(`Target not found in ${file}`);
  }
}

