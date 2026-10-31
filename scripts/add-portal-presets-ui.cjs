const fs = require('fs');

const path = 'src/components/converter/SettingsPanel.astro';
let content = fs.readFileSync(path, 'utf8');

// Add import
if (!content.includes("from '@lib/portal-presets';")) {
  content = content.replace(
    "import type {",
    "import { PORTAL_PRESETS } from '@lib/portal-presets';\nimport type {"
  );
  if (!content.includes("from '@lib/portal-presets';")) {
    content = content.replace(
      "---",
      "---\nimport { PORTAL_PRESETS } from '@lib/portal-presets';"
    );
  }
}

const portalPresetsHtml = `
    <!-- 1-Click Government & Visa Portal Presets -->
    <div class="rounded-xl border border-accent/25 bg-accent/5 p-3 relative shadow-xs" id="pk-portal-preset-wrapper">
      <div class="flex items-center justify-between">
        <span id="pk-portal-preset-label" class="text-xs font-bold text-fg flex items-center gap-1.5 uppercase tracking-wider">
          <span>🏛️ Portal &amp; Visa Presets</span>
          <span class="inline-flex items-center rounded-full bg-accent text-accent-fg px-1.5 py-0.2 text-[9px] font-extrabold tracking-normal">1-CLICK</span>
        </span>
        <button
          type="button"
          id="pk-portal-preset-reset"
          class="text-[11px] text-muted hover:text-accent transition-colors hidden cursor-pointer font-medium"
        >
          Reset to manual
        </button>
      </div>

      <!-- Hidden standard select for form / test compatibility -->
      <select id="pk-portal-preset-select" class="sr-only" tabindex="-1" aria-hidden="true">
        {PORTAL_PRESETS.map((p) => (
          <option value={p.id}>{p.name}</option>
        ))}
      </select>

      <!-- Custom High-End Trigger Button -->
      <div class="mt-2 relative">
        <button
          type="button"
          id="pk-portal-preset-trigger"
          aria-haspopup="listbox"
          aria-expanded="false"
          aria-labelledby="pk-portal-preset-label pk-portal-preset-trigger"
          class="group/trigger relative flex w-full items-center justify-between rounded-xl border border-border bg-surface px-3 py-2 text-left text-sm text-fg shadow-xs transition-all hover:border-accent hover:bg-surface/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent cursor-pointer"
        >
          <div class="flex items-center gap-2.5 min-w-0">
            <span
              id="pk-selected-portal-flag"
              class="text-lg shrink-0 leading-none"
            >
              🏛️
            </span>
            <div class="min-w-0 flex-1">
              <span id="pk-selected-portal-title" class="block font-semibold text-fg text-xs sm:text-sm truncate">
                Select Portal / Visa Preset…
              </span>
              <span id="pk-selected-portal-desc" class="block text-[11px] text-muted truncate">
                Auto crop, dimensions &amp; exact KB limit
              </span>
            </div>
          </div>
          <svg
            id="pk-portal-preset-chevron"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="text-muted group-hover/trigger:text-fg transition-transform duration-200 shrink-0 ml-2"
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>

        <!-- Custom Dropdown Popover Menu -->
        <div
          id="pk-portal-preset-menu"
          role="listbox"
          tabindex="-1"
          class="absolute left-0 right-0 top-full mt-1.5 z-50 hidden rounded-2xl border border-border bg-surface/98 backdrop-blur-xl shadow-2xl p-1.5 space-y-1 transition-all max-h-80 overflow-y-auto"
        >
          <div class="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted">Government &amp; Consular Presets</div>
          {PORTAL_PRESETS.map((preset) => (
            <button
              type="button"
              role="option"
              data-id={preset.id}
              data-flag={preset.flag}
              data-name={preset.name}
              data-desc={preset.desc}
              data-badge={preset.badge}
              data-target-kb={preset.targetKb ?? ''}
              data-crop-aspect={preset.cropAspect}
              data-crop-anchor={preset.cropAnchor}
              data-width={preset.width ?? ''}
              data-height={preset.height ?? ''}
              class="pk-portal-preset-option group flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left transition-colors cursor-pointer hover:bg-bg/80 border border-transparent"
            >
              <div class="flex items-center gap-2.5 min-w-0">
                <span class="text-base shrink-0">{preset.flag}</span>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-1.5">
                    <span class="font-semibold text-fg text-xs group-hover:text-accent transition-colors truncate">
                      {preset.name}
                    </span>
                    {preset.badge && (
                      <span class="font-mono text-[9px] px-1.5 py-0.5 rounded bg-bg border border-border text-muted shrink-0 font-bold">
                        {preset.badge}
                      </span>
                    )}
                  </div>
                  <span class="block text-[11px] text-muted truncate">
                    {preset.desc}
                  </span>
                </div>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="pk-portal-check text-accent shrink-0 ml-2 hidden">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </button>
          ))}
        </div>
      </div>

      <!-- Quick Fast-Action Chips below the dropdown -->
      <div class="mt-2.5 flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
        <button type="button" class="pk-quick-portal-chip text-[11px] font-medium px-2 py-1 rounded-lg border border-border bg-surface hover:border-accent/40 text-fg whitespace-nowrap cursor-pointer transition-colors" data-id="us-visa">🇺🇸 US Visa</button>
        <button type="button" class="pk-quick-portal-chip text-[11px] font-medium px-2 py-1 rounded-lg border border-border bg-surface hover:border-accent/40 text-fg whitespace-nowrap cursor-pointer transition-colors" data-id="in-passport">🇮🇳 Passport</button>
        <button type="button" class="pk-quick-portal-chip text-[11px] font-medium px-2 py-1 rounded-lg border border-border bg-surface hover:border-accent/40 text-fg whitespace-nowrap cursor-pointer transition-colors" data-id="schengen-visa">🇪🇺 Schengen</button>
        <button type="button" class="pk-quick-portal-chip text-[11px] font-medium px-2 py-1 rounded-lg border border-border bg-surface hover:border-accent/40 text-fg whitespace-nowrap cursor-pointer transition-colors" data-id="exam-upsc">🎓 Exam 50K</button>
        <button type="button" class="pk-quick-portal-chip text-[11px] font-medium px-2 py-1 rounded-lg border border-border bg-surface hover:border-accent/40 text-fg whitespace-nowrap cursor-pointer transition-colors" data-id="signature">✍️ Signature</button>
        <button type="button" class="pk-quick-portal-chip text-[11px] font-medium px-2 py-1 rounded-lg border border-border bg-surface hover:border-accent/40 text-fg whitespace-nowrap cursor-pointer transition-colors" data-id="ca-visa">🇨🇦 Canada</button>
      </div>

      <p id="pk-portal-applied-summary" class="mt-2 text-[11px] text-accent font-medium hidden">
      </p>
    </div>
`;

if (!content.includes('pk-portal-preset-wrapper')) {
  content = content.replace(
    '<!-- Output format -->',
    portalPresetsHtml + '\n    <!-- Output format -->'
  );
  fs.writeFileSync(path, content, 'utf8');
  console.log('Successfully inserted Portal Presets into SettingsPanel.astro');
}
