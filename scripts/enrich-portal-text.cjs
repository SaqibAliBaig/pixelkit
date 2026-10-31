const fs = require('fs');

// 1. ToolIntro.astro
let toolIntro = fs.readFileSync('src/components/seo/ToolIntro.astro', 'utf8');
const portalIntroSection = `
  <!-- Built-In One-Click Government & Consular Presets -->
  <div class="mt-10 rounded-2xl border border-border bg-surface p-5 sm:p-6">
    <h3 class="text-base font-semibold text-fg">
      Built-In 1-Click Government &amp; Consular Presets
    </h3>
    <p class="mt-1 text-xs text-muted leading-relaxed">
      Instead of calculating millimeter-to-pixel ratios and adjusting quality sliders by hand, PixelKit features dedicated 1-click presets configured to match official biometric compliance specifications:
    </p>
    <div class="mt-4 grid gap-3 sm:grid-cols-2 text-xs text-fg/80 leading-relaxed">
      <div class="rounded-xl border border-border/70 bg-bg/40 p-3.5">
        <strong class="text-fg font-semibold block">🇺🇸 US Visa / DS-160 / DV Lottery:</strong>
        <p class="mt-1 text-muted">Automatically frames a 1:1 square ratio with head-to-chin facial proportions, resamples to 600×600 px (2×2 inches at 300 DPI), and executes binary search compression under the strict 240 KB JPG ceiling.</p>
      </div>
      <div class="rounded-xl border border-border/70 bg-bg/40 p-3.5">
        <strong class="text-fg font-semibold block">🇮🇳 Indian Passport / PAN / Aadhaar:</strong>
        <p class="mt-1 text-muted">Applies the official 35×45 mm biometric portrait crop (413×531 px) and compresses under 100 KB (or 50 KB for PAN card portals) without blur.</p>
      </div>
      <div class="rounded-xl border border-border/70 bg-bg/40 p-3.5">
        <strong class="text-fg font-semibold block">🇪🇺 Schengen / European Visa:</strong>
        <p class="mt-1 text-muted">Enforces European consular dimensions (35×45 mm / 413×531 px) and stays reliably underneath the 200 KB upload limit for VFS Global and TLScontact.</p>
      </div>
      <div class="rounded-xl border border-border/70 bg-bg/40 p-3.5">
        <strong class="text-fg font-semibold block">🎓 Civil Service / Exams (UPSC, SSC, NEET):</strong>
        <p class="mt-1 text-muted">Pre-configures 350×450 px portrait dimensions and optimizes bytes into the narrow 20 KB to 50 KB band required by online examination portals.</p>
      </div>
      <div class="rounded-xl border border-border/70 bg-bg/40 p-3.5">
        <strong class="text-fg font-semibold block">✍️ Official Signature &amp; Thumbprint:</strong>
        <p class="mt-1 text-muted">Crops to standard 2:1 horizontal aspect (280×140 px) and applies contrast enhancement under the tight 20 KB limit for admission admit cards.</p>
      </div>
      <div class="rounded-xl border border-border/70 bg-bg/40 p-3.5">
        <strong class="text-fg font-semibold block">🇨🇦 Canada Visa / PR / Express Entry:</strong>
        <p class="mt-1 text-muted">Frames 50×70 mm (5:7 aspect / 420×540 px) meeting Immigration, Refugees and Citizenship Canada (IRCC) specifications under 240 KB.</p>
      </div>
    </div>
  </div>
`;

if (!toolIntro.includes('Built-In 1-Click Government & Consular Presets')) {
  toolIntro = toolIntro.replace(
    '<!-- Best Practices for Strict Portal Submissions -->',
    portalIntroSection + '\n  <!-- Best Practices for Strict Portal Submissions -->'
  );
  fs.writeFileSync('src/components/seo/ToolIntro.astro', toolIntro, 'utf8');
  console.log('Updated ToolIntro.astro with Government Presets');
}

// 2. PortalRequirementsGuide.astro
let portalGuide = fs.readFileSync('src/components/seo/PortalRequirementsGuide.astro', 'utf8');
const canadaRow = `
        <tr>
          <td class="py-2.5 font-medium text-fg">Canada Visa, PR &amp; Express Entry (IRCC)</td>
          <td class="py-2.5">JPEG / JPG</td>
          <td class="py-2.5">420 × 540 px (50 × 70 mm, 5:7 aspect)</td>
          <td class="py-2.5 font-medium text-accent">Under 240 KB</td>
        </tr>`;

if (!portalGuide.includes('Canada Visa, PR &amp; Express Entry')) {
  portalGuide = portalGuide.replace(
    '<tr>\n          <td class="py-2.5 font-medium text-fg">Official Digital Signature',
    canadaRow + '\n        <tr>\n          <td class="py-2.5 font-medium text-fg">Official Digital Signature'
  );
  // CRLF check
  portalGuide = portalGuide.replace(
    '<tr>\r\n          <td class="py-2.5 font-medium text-fg">Official Digital Signature',
    canadaRow + '\r\n        <tr>\r\n          <td class="py-2.5 font-medium text-fg">Official Digital Signature'
  );
  fs.writeFileSync('src/components/seo/PortalRequirementsGuide.astro', portalGuide, 'utf8');
  console.log('Updated PortalRequirementsGuide.astro with Canada PR row');
}
