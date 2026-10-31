const fs = require('fs');

const indexAstroPath = 'src/pages/index.astro';
let code = fs.readFileSync(indexAstroPath, 'utf8');

const homeFaqs = `
const homeFaqs = [
  {
    q: 'Is PixelKit truly 100% free with no file limits, watermarks, or signups?',
    a: 'Yes, completely free forever. PixelKit has no subscriptions, no file size throttles, no artificial watermarks, and requires no account registration. Because all conversion and compression algorithms execute entirely on your own device through browser WebAssembly and Web Workers, we incur virtually zero cloud server compute costs, allowing us to keep this service completely free and open to everyone.',
  },
  {
    q: 'How does client-side in-browser processing guarantee 100% privacy for ID cards and sensitive files?',
    a: 'Unlike traditional online converters that upload your confidential documents, tax forms, passports, and personal family photos to remote cloud servers (where they may sit in temporary buckets or be logged), PixelKit processes everything strictly within your browser sandbox. Your images and documents never leave your laptop, tablet, or phone, making it completely compliant with strict data confidentiality standards and GDPR requirements.',
  },
  {
    q: 'How does PixelKit hit exact file size targets like 20KB, 50KB, 100KB, or 200KB?',
    a: 'Rather than forcing you to guess random quality percentages or undergo tedious trial-and-error, PixelKit utilizes an intelligent binary-search algorithm. It automatically iterates compression parameters and quantization matrices within milliseconds until your output file lands just underneath your specified KB threshold without unnecessary loss of clarity.',
  },
  {
    q: 'Can I convert Apple iPhone HEIC photos directly to JPG, PNG, or WebP?',
    a: 'Yes! PixelKit features a dedicated WebAssembly-powered libheif decoder that parses modern Apple iOS High Efficiency Image Container (HEIC) files right in your web browser. You can seamlessly convert HEIC photos to standard JPEG, PNG, or PDF formats for immediate compatibility with job applications, government portals, and legacy software.',
  },
  {
    q: 'Does PixelKit preserve or strip EXIF metadata and GPS location tags?',
    a: 'You have complete control. By default, PixelKit can preserve crucial EXIF data such as camera orientation and capture settings, or you can check the option to sanitize all sensitive GPS coordinates, device serial numbers, and camera timestamps to protect your personal privacy before sharing photos online.',
  },
  {
    q: 'Can I crop or resize photos to exact passport and visa specifications?',
    a: 'Yes. PixelKit includes built-in photo cropping and resizing studios with one-click presets for US Visa (2x2 inches / 600x600 px), Schengen Visa (35x45 mm), Indian Passport, Pan Card, and civil service recruitment portals (SSC, UPSC). You can crop, resize, and compress your image to exact portal dimensions and KB limits simultaneously.',
  },
];
`;

if (!code.includes('homeFaqs')) {
  code = code.replace(
    "import PortalRequirementsGuide from '@components/seo/PortalRequirementsGuide.astro';",
    "import PortalRequirementsGuide from '@components/seo/PortalRequirementsGuide.astro';\nimport FAQSection from '@components/seo/FAQSection.astro';\nimport { buildFaqJsonLd } from '@lib/seo/jsonld';"
  );

  code = code.replace(
    "const jsonLd = [",
    homeFaqs + "\nconst jsonLd = [\n  buildFaqJsonLd(homeFaqs),"
  );

  code = code.replace(
    "<PortalRequirementsGuide /></div>",
    "<PortalRequirementsGuide />\n      <div class=\"mt-16 sm:mt-24\"><FAQSection faqs={homeFaqs} heading=\"Frequently Asked Questions About PixelKit\" /></div>\n    </div>"
  );

  fs.writeFileSync(indexAstroPath, code, 'utf8');
  console.log('Successfully added FAQs to index.astro');
}
