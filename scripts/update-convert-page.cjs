const fs = require('fs');

const convertPath = 'src/pages/convert/index.astro';
let code = fs.readFileSync(convertPath, 'utf8');

const convertFaqs = `
const convertFaqs = [
  {
    q: 'How does client-side format conversion work without uploading files?',
    a: 'PixelKit leverages modern browser capabilities including HTML5 Canvas, WebAssembly (Wasm), and background Web Workers. When you drop an image, the browser decodes the binary file directly into an in-memory pixel buffer, applies any requested resizing, cropping, or quantization, and re-encodes it into your chosen target format (like JPG, WebP, PNG, or PDF). The entire lifecycle happens locally inside your browser process.',
  },
  {
    q: 'Why should I convert HEIC images to JPG or PNG?',
    a: 'Apple devices capture photos in High Efficiency Image Container (HEIC) format by default to save storage space. However, many government application portals, banking verification forms, academic portals, and older operating systems (like Windows 10 without codecs) cannot open or preview HEIC files. Converting to JPG or PNG provides universal compatibility across all operating systems, web browsers, and upload forms.',
  },
  {
    q: 'When should I convert PNG to WebP instead of JPG?',
    a: 'If your image contains crisp typography, sharp line art, screenshots, or transparent alpha backgrounds, converting PNG to WebP is ideal. WebP maintains transparent cutouts and crisp borders while reducing file weight by 25% to 40% compared to PNG. If you do not require transparency and are converting continuous-tone photographs, JPG offers maximum universal compatibility.',
  },
  {
    q: 'Can I convert multiple images and combine them into a single PDF document?',
    a: 'Yes! Using PixelKit JPG to PDF or PNG to PDF converters, you can upload multiple photos or document pages, arrange them in your preferred sequence, adjust page orientations, and export a compact, multi-page PDF document optimized for upload under strict portal limits such as 100KB, 200KB, or 500KB.',
  },
  {
    q: 'Will converting between image formats degrade picture quality?',
    a: 'PixelKit provides lossless conversion wherever mathematically possible (such as SVG vector rendering, PNG quantization, and lossless WebP). When converting to lossy formats like JPG or lossy WebP, PixelKit uses high-precision 4:4:4 or 4:2:0 chroma subsampling and adaptive quantization matrices to preserve fine details, text legibility, and realistic skin tones without creating distracting blocky compression artifacts.',
  },
];
`;

if (!code.includes('convertFaqs')) {
  code = code.replace(
    "import {",
    "import FAQSection from '@components/seo/FAQSection.astro';\nimport {\n  buildFaqJsonLd,"
  );

  code = code.replace(
    "const jsonLd = [",
    convertFaqs + "\nconst jsonLd = [\n  buildFaqJsonLd(convertFaqs),"
  );

  code = code.replace(
    "    </section>\n  </div>",
    "    </section>\n\n    <div class=\"mt-12 sm:mt-16\"><FAQSection faqs={convertFaqs} heading=\"Image Conversion Frequently Asked Questions\" /></div>\n  </div>"
  );

  fs.writeFileSync(convertPath, code, 'utf8');
  console.log('Successfully added FAQs to convert/index.astro');
}
