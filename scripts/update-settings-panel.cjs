const fs = require('fs');
let code = fs.readFileSync('src/components/converter/SettingsPanel.astro', 'utf8');

// 1. Update header to prevent truncation: "🏛️ Portals" instead of "🏛️ Portal Presets" and clean buttons
const oldHeaderRegex = /<!-- Header with Segmented Mode Tabs -->[\s\S]*?<!-- PANEL 1: Custom Pipeline Settings/;
const newHeader = `<!-- Header with Segmented Mode Tabs -->
  <div class="flex items-center justify-between pb-3 border-b border-border/60">
    <div class="flex items-center gap-2">
      <h2 class="text-xs uppercase tracking-wider text-muted font-bold">
        Settings
      </h2>
      <span id="pk-settings-mode-badge" class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-surface border border-border text-muted font-semibold">
        {initialTool === 'all' ? 'All-in-One' : initialTool.toUpperCase()}
      </span>
    </div>
    <div class="flex items-center gap-1" role="tablist" aria-label="Settings Mode">
      <button
        type="button"
        id="pk-tab-custom"
        role="tab"
        aria-selected={initialTool !== 'passport'}
        aria-controls="pk-panel-custom"
        class={\`rounded-lg px-2.5 py-1 text-xs transition-all cursor-pointer font-medium \${
          initialTool !== 'passport'
            ? 'font-semibold bg-surface text-fg border border-border/60 shadow-2xs'
            : 'text-muted hover:text-fg'
        }\`}
      >
        Custom
      </button>
      <button
        type="button"
        id="pk-tab-portal"
        role="tab"
        aria-selected={initialTool === 'passport'}
        aria-controls="pk-panel-portal"
        class={\`rounded-lg px-2.5 py-1 text-xs transition-all cursor-pointer flex items-center gap-1 font-medium \${
          initialTool === 'passport'
            ? 'font-semibold bg-surface text-fg border border-border/60 shadow-2xs'
            : 'text-muted hover:text-fg'
        }\`}
      >
        <span>🏛️ Portals</span>
        <span id="pk-portal-active-dot" class="hidden h-1.5 w-1.5 rounded-full bg-accent"></span>
      </button>
    </div>
  </div>

  <!-- PANEL 1: Custom Pipeline Settings`;

code = code.replace(oldHeaderRegex, newHeader);

// 2. Add pk-stage-num to stage 1, 2, 3, 4 badges and make them conditional on initialTool === 'all'
// Stage 1
code = code.replace(
  '<span class="flex h-5 w-5 items-center justify-center rounded-md bg-accent/15 text-accent text-[11px] font-mono font-bold">1</span>\n          <span>Output Format</span>',
  '<span class={`pk-stage-num flex h-5 w-5 items-center justify-center rounded-md bg-accent/15 text-accent text-[11px] font-mono font-bold ${initialTool === \'all\' ? \'\' : \'hidden\'}`}>1</span>\n          <span class="text-sm">🔄</span>\n          <span>Output Format</span>'
);

// Stage 2
code = code.replace(
  '<span class="flex h-5 w-5 items-center justify-center rounded-md bg-accent/15 text-accent text-[11px] font-mono font-bold">2</span>\n          <span>Compression &amp; Target Size</span>',
  '<span class={`pk-stage-num flex h-5 w-5 items-center justify-center rounded-md bg-accent/15 text-accent text-[11px] font-mono font-bold ${initialTool === \'all\' ? \'\' : \'hidden\'}`}>2</span>\n          <span class="text-sm">🗜️</span>\n          <span>Compression &amp; Target Size</span>'
);

// Stage 3
code = code.replace(
  '<span class="flex h-5 w-5 items-center justify-center rounded-md bg-accent/15 text-accent text-[11px] font-mono font-bold">3</span>\n          <span>Crop &amp; Aspect Ratio</span>',
  '<span class={`pk-stage-num flex h-5 w-5 items-center justify-center rounded-md bg-accent/15 text-accent text-[11px] font-mono font-bold ${initialTool === \'all\' ? \'\' : \'hidden\'}`}>3</span>\n          <span class="text-sm">✂️</span>\n          <span>Crop &amp; Aspect Ratio</span>'
);

// Stage 4
code = code.replace(
  '<span class="flex h-5 w-5 items-center justify-center rounded-md bg-accent/15 text-accent text-[11px] font-mono font-bold">4</span>\n          <span>Resize Dimensions</span>',
  '<span class={`pk-stage-num flex h-5 w-5 items-center justify-center rounded-md bg-accent/15 text-accent text-[11px] font-mono font-bold ${initialTool === \'all\' ? \'\' : \'hidden\'}`}>4</span>\n          <span class="text-sm">📐</span>\n          <span>Resize Dimensions</span>'
);

// 3. Move discovery card outside pk-stages-list so it is always at the very end
const discoveryCardRegex = /<!-- Quick Discovery Card for Portal Presets -->[\s\S]*?Browse 20 Official Portal Presets →[\s\S]*?<\/div>[\s\S]*?<\/div>[\s\S]*?<\/div>/;
// Let's inspect exact lines at line 1070
fs.writeFileSync('src/components/converter/SettingsPanel.astro', code, 'utf8');
console.log('SettingsPanel.astro updated (header and badges)');
