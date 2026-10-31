const fs = require('fs');

const convertPath = 'src/pages/convert/index.astro';
let convert = fs.readFileSync(convertPath, 'utf8');

const workflowsSection = `
      <!-- Frequently Converted Workflows -->
      <div class="mt-8 border-t border-border pt-6">
        <h4 class="text-sm font-semibold text-fg">
          High-Demand Conversion Workflows &amp; Technical Tips
        </h4>
        <div class="mt-3 grid gap-4 sm:grid-cols-2 text-xs text-muted leading-relaxed">
          <div class="rounded-xl border border-border/60 bg-bg/40 p-4">
            <h5 class="font-semibold text-fg">iPhone HEIC to JPG for Visa and Exam Uploads</h5>
            <p class="mt-1">
              Apple iOS devices capture photos in high-efficiency HEIC files by default. While HEIC offers excellent dynamic range, almost all international consular systems, university portals, and state government verification services immediately fail with unsupported format errors when uploading .heic files. Converting to standardized JPG guarantees 100% acceptance without losing facial sharpness or color fidelity.
            </p>
          </div>
          <div class="rounded-xl border border-border/60 bg-bg/40 p-4">
            <h5 class="font-semibold text-fg">PNG to WebP for Maximum Page Speed</h5>
            <p class="mt-1">
              Heavy PNG graphics such as UI wireframes, software screenshots, and transparent brand marks frequently bloat website bundles. Converting to lossy or lossless WebP maintains complete transparent alpha channel cutouts and crisp vector typography while reducing HTTP payload weight by an average of 35% to 45%, directly improving Core Web Vitals LCP benchmarks.
            </p>
          </div>
          <div class="rounded-xl border border-border/60 bg-bg/40 p-4">
            <h5 class="font-semibold text-fg">SVG to Raster PNG for Print &amp; Legacy Platforms</h5>
            <p class="mt-1">
              Scalable Vector Graphics (SVG) scale infinitely in modern browsers, but email marketing clients, document processors, and social media platforms require raster bitmap images. PixelKit's SVG converter allows you to specify custom scale multipliers (1x, 2x, 4x) to render ultra-sharp high-DPI Retina PNG or JPG assets with crystal-clear edges.
            </p>
          </div>
          <div class="rounded-xl border border-border/60 bg-bg/40 p-4">
            <h5 class="font-semibold text-fg">PDF Page Extraction &amp; Archival Image Packaging</h5>
            <p class="mt-1">
              Extract high-resolution raster images from multi-page PDF documents without installing bloated desktop software or compromising confidential financial or medical reports. PixelKit decodes individual PDF pages at full 300 DPI clarity directly in your local browser sandbox, preserving crisp document legibility for official re-use.
            </p>
          </div>
        </div>
      </div>
`;

if (!convert.includes('High-Demand Conversion Workflows & Technical Tips')) {
  convert = convert.replace(
    '</section>\n\n    <div class="mt-12 sm:mt-16"><FAQSection',
    workflowsSection + '\n    </section>\n\n    <div class="mt-12 sm:mt-16"><FAQSection'
  );
  fs.writeFileSync(convertPath, convert, 'utf8');
  console.log('Successfully appended workflowsSection');
}
