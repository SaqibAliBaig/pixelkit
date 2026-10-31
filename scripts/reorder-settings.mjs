import fs from 'node:fs';

let content = fs.readFileSync('src/components/converter/SettingsPanel.astro', 'utf8');

const cropStart = content.indexOf('<!-- STAGE 1: ✂️ Crop & Framing -->');
const resizeStart = content.indexOf('<!-- STAGE 2: 📐 Resize & Dimensions -->');
const formatStart = content.indexOf('<!-- STAGE 3: 🔄 Output Format -->');
const compressStart = content.indexOf('<!-- STAGE 4: 🗜️ Compression & Target Size -->');
const advancedStart = content.indexOf('<!-- STAGE 5: ⚙️ Advanced Options & Filters -->');

let beforeCrop = content.slice(0, cropStart);
let cropBlock = content.slice(cropStart, resizeStart);
let resizeBlock = content.slice(resizeStart, formatStart);
let formatBlock = content.slice(formatStart, compressStart);
let compressBlock = content.slice(compressStart, advancedStart);
let advancedAndRest = content.slice(advancedStart);

// 1. Update Props in beforeCrop
beforeCrop = beforeCrop.replace(
  "initialTool?: 'compress' | 'convert' | 'resize' | 'crop' | 'passport';",
  "initialTool?: 'all' | 'compress' | 'convert' | 'resize' | 'crop' | 'passport';"
).replace(
  "initialTool = 'compress'",
  "initialTool = 'all'"
);

// Update Header in beforeCrop
beforeCrop = beforeCrop.replace(
  /<div class="flex items-center gap-1\.5">[\s\S]*?<\/div>\s*<div class="inline-flex items-center rounded-lg/m,
  `<div class="flex items-center gap-2 min-w-0">
      <h2 class="text-xs uppercase tracking-wider text-muted font-bold truncate">
        Settings
      </h2>
      <span id="pk-settings-mode-badge" class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface border border-border text-muted shrink-0">
        {initialTool === 'all' ? 'All-in-One' : initialTool.toUpperCase()}
      </span>
    </div>
    <div class="inline-flex items-center rounded-lg`
);

// Add pk-stages-list wrapper after custom active banner
beforeCrop = beforeCrop + '    <!-- ALL-IN-ONE PIPELINE STAGES (1. Format, 2. Compress, 3. Crop, 4. Resize) -->\n    <div id="pk-stages-list" class="space-y-3.5 flex flex-col">\n';

// 2. Format Block: change badge to 1, update classes
formatBlock = formatBlock.replace(
  '<!-- STAGE 3: 🔄 Output Format -->',
  '<!-- STAGE 1: 🔄 Output Format -->'
).replace(
  /<div\s+id="pk-stage-format"[\s\S]*?>/m,
  `<div
      id="pk-stage-format"
      class={\`rounded-xl border transition-all p-3 space-y-2.5 \${
        initialTool === 'convert'
          ? 'border-accent bg-accent/5 shadow-xs ring-1 ring-accent/20'
          : 'border-border bg-surface/40'
      } \${['compress', 'crop', 'resize'].includes(initialTool) ? 'hidden' : ''}\`}
    >`
).replace(
  /<span class="flex h-5 w-5 items-center justify-center rounded-md bg-accent\/15 text-accent text-\[11px\] font-mono font-bold">3<\/span>/,
  '<span class="flex h-5 w-5 items-center justify-center rounded-md bg-accent/15 text-accent text-[11px] font-mono font-bold">1</span>'
);

// 3. Compress Block: change badge to 2, update classes
compressBlock = compressBlock.replace(
  '<!-- STAGE 4: 🗜️ Compression & Target Size -->',
  '<!-- STAGE 2: 🗜️ Compression & Target Size -->'
).replace(
  /<div\s+id="pk-stage-compress"[\s\S]*?>/m,
  `<div
      id="pk-stage-compress"
      class={\`rounded-xl border transition-all p-3 space-y-2.5 \${
        initialTool === 'compress'
          ? 'border-accent bg-accent/5 shadow-xs ring-1 ring-accent/20'
          : 'border-border bg-surface/40'
      } \${['convert', 'crop', 'resize'].includes(initialTool) ? 'hidden' : ''}\`}
    >`
).replace(
  /<span class="flex h-5 w-5 items-center justify-center rounded-md bg-accent\/15 text-accent text-\[11px\] font-mono font-bold">4<\/span>/,
  '<span class="flex h-5 w-5 items-center justify-center rounded-md bg-accent/15 text-accent text-[11px] font-mono font-bold">2</span>'
);

// 4. Crop Block: change badge to 3, update classes
cropBlock = cropBlock.replace(
  '<!-- STAGE 1: ✂️ Crop & Framing -->',
  '<!-- STAGE 3: ✂️ Crop & Aspect Ratio -->'
).replace(
  /<div\s+id="pk-stage-crop"[\s\S]*?>/m,
  `<div
      id="pk-stage-crop"
      class={\`rounded-xl border transition-all p-3 space-y-2.5 \${
        initialTool === 'crop'
          ? 'border-accent bg-accent/5 shadow-xs ring-1 ring-accent/20'
          : 'border-border bg-surface/40'
      } \${['convert', 'compress', 'resize'].includes(initialTool) ? 'hidden' : ''}\`}
    >`
).replace(
  /<span class="flex h-5 w-5 items-center justify-center rounded-md bg-accent\/15 text-accent text-\[11px\] font-mono font-bold">1<\/span>/,
  '<span class="flex h-5 w-5 items-center justify-center rounded-md bg-accent/15 text-accent text-[11px] font-mono font-bold">3</span>'
);

// 5. Resize Block: change badge to 4, update classes
resizeBlock = resizeBlock.replace(
  '<!-- STAGE 2: 📐 Resize & Dimensions -->',
  '<!-- STAGE 4: 📐 Resize Dimensions -->'
).replace(
  /<div\s+id="pk-stage-resize"[\s\S]*?>/m,
  `<div
      id="pk-stage-resize"
      class={\`rounded-xl border transition-all p-3 space-y-2.5 \${
        initialTool === 'resize'
          ? 'border-accent bg-accent/5 shadow-xs ring-1 ring-accent/20'
          : 'border-border bg-surface/40'
      } \${['convert', 'compress', 'crop'].includes(initialTool) ? 'hidden' : ''}\`}
    >`
).replace(
  /<span class="flex h-5 w-5 items-center justify-center rounded-md bg-accent\/15 text-accent text-\[11px\] font-mono font-bold">2<\/span>/,
  '<span class="flex h-5 w-5 items-center justify-center rounded-md bg-accent/15 text-accent text-[11px] font-mono font-bold">4</span>'
);

const toggleButtonHtml = `    <!-- Toggle More Tools Button (Hidden on Home 'all', visible on dedicated tools) -->
    <div id="pk-more-tools-toggle-wrapper" class={initialTool === 'all' ? 'hidden' : 'pt-0.5'}>
      <button
        type="button"
        id="pk-toggle-more-tools-btn"
        class="w-full flex items-center justify-between rounded-xl border border-dashed border-border/80 bg-surface/60 hover:bg-surface px-3.5 py-2.5 text-xs font-medium text-muted hover:text-fg hover:border-accent/40 transition-all cursor-pointer group shadow-2xs"
        aria-expanded="false"
      >
        <span class="flex items-center gap-2">
          <span class="flex h-5 w-5 items-center justify-center rounded-md bg-accent/15 text-accent font-bold text-xs group-hover:scale-105 transition-transform">+</span>
          <span id="pk-more-tools-btn-label">
            {initialTool === 'convert' ? 'Add Compression, Crop, or Resize (Optional)' :
             initialTool === 'compress' ? 'Add Format, Crop, or Resize (Optional)' :
             initialTool === 'crop' ? 'Add Resize, Format, or Compression (Optional)' :
             initialTool === 'resize' ? 'Add Crop, Format, or Compression (Optional)' :
             'Additional Editing & Compression Tools'}
          </span>
          <span id="pk-more-tools-active-badge" class="hidden text-[10px] font-mono px-1.5 py-0.2 rounded bg-accent/20 text-accent font-bold">1 active</span>
        </span>
        <span class="text-[11px] text-accent font-semibold flex items-center gap-1 group-hover:underline">
          <span id="pk-more-tools-action-text">Show</span>
          <svg id="pk-more-tools-chevron" class="w-3.5 h-3.5 transition-transform duration-200" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </span>
      </button>
    </div>
`;

// Close pk-stages-list before panel-custom closing div
advancedAndRest = advancedAndRest.replace(
  '  </div>\n\n  <!-- PANEL 2: Portal Presets Mode',
  '    </div>\n  </div>\n\n  <!-- PANEL 2: Portal Presets Mode'
);

const newContent = beforeCrop + formatBlock + '\n' + compressBlock + '\n' + cropBlock + '\n' + resizeBlock + '\n' + toggleButtonHtml + '\n' + advancedAndRest;
fs.writeFileSync('src/components/converter/SettingsPanel.astro', newContent, 'utf8');
console.log('Successfully wrote reordered SettingsPanel.astro! Length:', newContent.length);
