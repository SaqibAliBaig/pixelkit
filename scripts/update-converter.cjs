const fs = require('fs');
let code = fs.readFileSync('src/components/converter/Converter.astro', 'utf8');

const oldBlockStart = code.indexOf('<div class="mb-4 sm:mb-5 flex flex-wrap');
const oldBlockEnd = code.indexOf('<div class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]');

const newModeBar = `<div class="mb-4 sm:mb-5 flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3 sm:pb-3.5">
    <div
      id="pk-top-mode-bar"
      class="inline-flex items-center gap-1 p-1 rounded-xl bg-bg/80 border border-border text-xs font-semibold overflow-x-auto max-w-full scrollbar-none"
      role="tablist"
      aria-label="Processing Mode"
    >
      <a
        href="/"
        data-mode="all"
        class={\`pk-mode-tab flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer font-medium \${
          initialTool === 'all' ? 'bg-surface text-fg shadow-xs border border-border/40 font-semibold' : 'text-muted hover:text-fg'
        }\`}
      >
        <span>✨</span> <span>All-in-One</span>
      </a>
      <a
        href="/convert/"
        data-mode="convert"
        class={\`pk-mode-tab flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer font-medium \${
          initialTool === 'convert' ? 'bg-surface text-fg shadow-xs border border-border/40 font-semibold' : 'text-muted hover:text-fg'
        }\`}
      >
        <span>🔄</span> <span>Convert</span>
      </a>
      <a
        href="/compress-image/"
        data-mode="compress"
        class={\`pk-mode-tab flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer font-medium \${
          initialTool === 'compress' ? 'bg-surface text-fg shadow-xs border border-border/40 font-semibold' : 'text-muted hover:text-fg'
        }\`}
      >
        <span>🗜️</span> <span>Compress</span>
      </a>
      <a
        href="/crop-image/"
        data-mode="crop"
        class={\`pk-mode-tab flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer font-medium \${
          initialTool === 'crop' ? 'bg-surface text-fg shadow-xs border border-border/40 font-semibold' : 'text-muted hover:text-fg'
        }\`}
      >
        <span>✂️</span> <span>Crop</span>
      </a>
      <a
        href="/resize-image/"
        data-mode="resize"
        class={\`pk-mode-tab flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer font-medium \${
          initialTool === 'resize' ? 'bg-surface text-fg shadow-xs border border-border/40 font-semibold' : 'text-muted hover:text-fg'
        }\`}
      >
        <span>📐</span> <span>Resize</span>
      </a>
      <a
        href="/passport-photo-resizer/"
        data-mode="passport"
        class={\`pk-mode-tab flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer font-medium \${
          initialTool === 'passport' ? 'bg-surface text-fg shadow-xs border border-border/40 font-semibold' : 'text-muted hover:text-fg'
        }\`}
      >
        <span>🏛️</span> <span>Portal Presets</span>
      </a>
    </div>

    <div class="hidden md:inline-flex items-center gap-1.5 text-[11px] text-muted">
      <span class="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
      <span>100% in-browser · Zero uploads</span>
    </div>
  </div>\n\n  `;

code = code.substring(0, oldBlockStart) + newModeBar + code.substring(oldBlockEnd);
fs.writeFileSync('src/components/converter/Converter.astro', code, 'utf8');
console.log('Converter.astro mode bar successfully updated!');
