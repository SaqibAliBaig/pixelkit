const fs = require('fs');

// 1. Enrich src/pages/compress-image-to-[size]kb.astro
let compressSizeFile = fs.readFileSync('src/pages/compress-image-to-[size]kb.astro', 'utf8');
const searchCompress = `        <p>
          PixelKit solves this dual constraint by combining client-side dimension rescaling with binary search quantization. If your raw photo is high resolution (such as 3000×4000 pixels), open the Scale &amp; Resize panel to downscale to portal-recommended dimensions (like 350×450 px or 413×531 px). Once dimensions are optimized, PixelKit's iterative binary search finds the exact sweet spot that retains maximum contrast and crisp edges while landing safely under {spec.size}KB.
        </p>`;

const replaceCompress = `        <p>
          PixelKit solves this dual constraint by combining client-side dimension rescaling with binary search quantization. If your raw photo is high resolution (such as 3000×4000 pixels), open the Scale &amp; Resize panel to downscale to portal-recommended dimensions (like 350×450 px or 413×531 px). Once dimensions are optimized, PixelKit's iterative binary search finds the exact sweet spot that retains maximum contrast and crisp edges while landing safely under {spec.size}KB.
        </p>
        <p>
          To make compliance effortless, PixelKit features 20 built-in 1-Click Government &amp; Visa Portal Presets. Whether submitting a DS-160 for the US Embassy (600×600 px, 240KB), an Indian Passport Seva Kendra or NRI renewal form (413×531 px, 100KB), a Schengen biometric filing for France, Germany, or Italy (413×531 px, 200KB), a UKVI British visa (413×531 px, 200KB), a Canadian IRCC PR card (420×540 px, 240KB), an Australian ImmiAccount application (413×531 px, 200KB), or competitive recruitment exams such as UPSC Civil Services, SSC CGL, and NEET (350×450 px, 50KB), selecting any preset automatically locks the exact aspect ratio, head-and-shoulders anchor, resolution, and target file weight.
        </p>
        <p>
          Our client-side processing pipeline guarantees strict privacy. Because all image decoding, aspect ratio cropping, coordinate resampling, and byte quantization execute locally within your browser's Web Workers using WebAssembly, zero personal data or confidential identification scans are transmitted across public networks or stored on external cloud infrastructure.
        </p>`;

if (compressSizeFile.includes(searchCompress)) {
  compressSizeFile = compressSizeFile.replace(searchCompress, replaceCompress);
  fs.writeFileSync('src/pages/compress-image-to-[size]kb.astro', compressSizeFile, 'utf8');
  console.log('Enriched compress-image-to-[size]kb.astro');
}

// 2. Enrich src/pages/passport-photo-resizer.astro
let passportFile = fs.readFileSync('src/pages/passport-photo-resizer.astro', 'utf8');
const searchPassport = `        <p>
          PixelKit's workflow solves all three in a single execution: start with the Crop Studio to frame head-and-shoulders with balanced margins, click the 413×531 px or 600×600 px dimension preset in the Resize panel, and set your target ceiling (e.g. 50KB or 100KB). The output JPG is guaranteed to pass automated validation.
        </p>`;

const replacePassport = `        <p>
          PixelKit's workflow solves all three in a single execution: start with the Crop Studio to frame head-and-shoulders with balanced margins, click the 413×531 px or 600×600 px dimension preset in the Resize panel, and set your target ceiling (e.g. 50KB or 100KB). The output JPG is guaranteed to pass automated validation.
        </p>
        <p>
          With our comprehensive library of 20 1-Click Official Portal Presets, you can instantly configure verified specifications for major consular authorities worldwide. Presets include US Visa &amp; DS-160 (600×600 px, 240KB), Indian Passport Seva Kendra (413×531 px, 100KB), Schengen European Visa (413×531 px, 200KB), UK Visas &amp; Immigration (413×531 px, 200KB), Canada IRCC PR &amp; Study Permit (420×540 px, 240KB), Australia ImmiAccount (413×531 px, 200KB), China Visa (390×567 px, 120KB), Japan MOFA eVisa (413×531 px, 200KB), UAE ICP/GDRFA (413×531 px, 100KB), Saudi Arabia eVisa (600×600 px, 100KB), Singapore ICA (400×514 px, 150KB), Malaysia MyOnline Passport (413×591 px, 100KB), and New Zealand NZeTA (450×600 px, 250KB), alongside Indian national exams (UPSC, SSC, NEET, 350×450 px, 50KB), candidate signatures (280×140 px, 20KB), and thumbprint scans (200×200 px, 20KB).
        </p>
        <p>
          Every biometric capture is handled with bank-grade privacy. Web Workers process all pixels in ephemeral device memory, ensuring your face photos, identification cards, and personal records remain 100% private and never touch remote servers.
        </p>`;

if (passportFile.includes(searchPassport)) {
  passportFile = passportFile.replace(searchPassport, replacePassport);
  fs.writeFileSync('src/pages/passport-photo-resizer.astro', passportFile, 'utf8');
  console.log('Enriched passport-photo-resizer.astro');
}

// 3. Enrich src/pages/index.astro
let indexFile = fs.readFileSync('src/pages/index.astro', 'utf8');
const searchIndex = `<h2 class="text-3xl font-bold tracking-tight sm:text-4xl text-fg">
        Zero Uploads. Zero Servers. Total Privacy.
      </h2>`;

const replaceIndex = `<h2 class="text-3xl font-bold tracking-tight sm:text-4xl text-fg">
        Zero Uploads. Zero Servers. Total Privacy.
      </h2>
      <p class="mt-3 text-sm text-muted leading-relaxed max-w-2xl mx-auto">
        PixelKit delivers 185+ client-side image and document processing tools running entirely inside your local browser memory via WebAssembly and Web Workers. From batch format conversions to our 20 official 1-Click Government &amp; Visa Portal Presets (covering US, India, Schengen, UK, Canada, Australia, civil service exams, and official signatures), your sensitive documents and photographs never touch external cloud servers.
      </p>`;

if (indexFile.includes(searchIndex)) {
  indexFile = indexFile.replace(searchIndex, replaceIndex);
  fs.writeFileSync('src/pages/index.astro', indexFile, 'utf8');
  console.log('Enriched index.astro');
}
