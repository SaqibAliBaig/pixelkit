const fs = require('fs');
let c = fs.readFileSync('src/pages/compress-image-to-[size]kb.astro', 'utf8');

c = c.replace(/url: new URL\(`\/compress-image-to-\${spec\.size}kb`, SITE\.url\)\.href/g, 'url: new URL(`/compress-image-to-${spec.size}kb/`, SITE.url).href');
c = c.replace(/href={`\/compress-image-to-\${s}kb`}/g, 'href={`/compress-image-to-${s}kb/`}');

const extraGuide = `
    <!-- Comprehensive Portal Compression Guide -->
    <section class="mt-12 sm:mt-16 rounded-2xl border border-border bg-surface p-5 sm:p-8">
      <h2 class="text-lg sm:text-2xl font-bold tracking-tight text-fg">
        Technical Strategies for Passing Strict {spec.size}KB Portal Uploads
      </h2>
      <div class="mt-4 space-y-4 text-sm text-fg/85 leading-relaxed">
        <p>
          Online admissions, immigration forms, and job recruitment portals employ automated server-side verification scripts that immediately fail uploads if the file size exceeds {spec.size}KB by even a single byte. Conversely, attempting to shrink large 10MB phone captures down to {spec.size}KB solely through extreme lossy compression often produces muddy, illegible facial features or pixelated signatures that fail biometric review.
        </p>
        <p>
          PixelKit solves this dual constraint by combining client-side dimension rescaling with binary search quantization. If your raw photo is high resolution (such as 3000×4000 pixels), open the Scale &amp; Resize panel to downscale to portal-recommended dimensions (like 350×450 px or 413×531 px). Once dimensions are optimized, PixelKit's iterative binary search finds the exact sweet spot that retains maximum contrast and crisp edges while landing safely under {spec.size}KB.
        </p>
      </div>
    </section>

    <!-- Related Articles & Companion Tools -->
    <section class="mt-12 sm:mt-16 rounded-2xl border border-border bg-surface/50 p-5 sm:p-8">
      <h2 class="text-lg sm:text-xl font-semibold tracking-tight text-fg">
        Related Guides &amp; Verification Workflows
      </h2>
      <div class="mt-4 grid gap-3 sm:grid-cols-3 text-sm">
        <a href="/blog/why-portals-reject-200kb-photos/" class="group rounded-xl border border-border bg-bg/60 p-4 hover:border-accent transition-colors">
          <span class="text-xs font-semibold text-accent uppercase tracking-wider">Troubleshooting</span>
          <h3 class="font-medium text-fg group-hover:text-accent mt-1">Why Portals Reject Photos &amp; Fixes</h3>
          <p class="text-xs text-muted mt-1.5">Comprehensive breakdown of common automated validation errors and how to pass.</p>
        </a>
        <a href="/blog/how-to-resize-image-to-passport-size/" class="group rounded-xl border border-border bg-bg/60 p-4 hover:border-accent transition-colors">
          <span class="text-xs font-semibold text-accent uppercase tracking-wider">Dimensions</span>
          <h3 class="font-medium text-fg group-hover:text-accent mt-1">How to Resize to Passport Size</h3>
          <p class="text-xs text-muted mt-1.5">Official pixel standards and 300 DPI millimeter measurements for 30+ countries.</p>
        </a>
        <a href="/passport-photo-resizer/" class="group rounded-xl border border-border bg-bg/60 p-4 hover:border-accent transition-colors">
          <span class="text-xs font-semibold text-accent uppercase tracking-wider">All-In-One</span>
          <h3 class="font-medium text-fg group-hover:text-accent mt-1">Passport Photo Resizer</h3>
          <p class="text-xs text-muted mt-1.5">Crop, resize to 413×531 px, and compress under 50KB in one browser execution.</p>
        </a>
      </div>
    </section>
`;

c = c.replace(/<\/section>(\s*<div class="mt-12 sm:mt-16">\s*<FAQSection)/, '</section>' + extraGuide + '$1');
fs.writeFileSync('src/pages/compress-image-to-[size]kb.astro', c, 'utf8');
console.log('Successfully updated compress-image-to-[size]kb.astro');
