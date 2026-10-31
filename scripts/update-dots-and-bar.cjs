const fs = require('fs');
let code = fs.readFileSync('src/components/converter/SettingsPanel.astro', 'utf8');

// 1. Redesign pk-active-photo-bar with Apply to All Photos button
const oldBar = `    <!-- Active Photo Bar (Visible ONLY when a specific photo is selected) -->
    <div id="pk-active-photo-bar" class="hidden items-center justify-between gap-2 rounded-xl bg-surface border border-accent/40 px-3 py-2 text-xs shadow-xs transition-all mb-3.5">
      <div class="flex items-center gap-2 min-w-0">
        <span class="inline-block h-2 w-2 rounded-full bg-accent animate-pulse shrink-0"></span>
        <div class="min-w-0 flex items-center gap-1.5 truncate">
          <span class="text-muted text-[11px]">Editing:</span>
          <span id="pk-active-photo-name" class="font-bold text-fg truncate">filename.jpg</span>
          <span id="pk-active-photo-counter" class="text-[10px] font-mono text-muted shrink-0">(1 of 3)</span>
        </div>
      </div>
      <div class="flex items-center gap-1 shrink-0">
        <button
          type="button"
          id="pk-target-prev-btn"
          class="p-1 rounded text-muted hover:text-fg hover:bg-bg border border-border/60 transition-colors disabled:opacity-30 cursor-pointer"
          title="Previous photo"
          aria-label="Previous photo"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        <button
          type="button"
          id="pk-target-next-btn"
          class="p-1 rounded text-muted hover:text-fg hover:bg-bg border border-border/60 transition-colors disabled:opacity-30 cursor-pointer"
          title="Next photo"
          aria-label="Next photo"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
        <button
          type="button"
          id="pk-deselect-photo-btn"
          class="ml-1 inline-flex items-center gap-1 rounded bg-bg px-2 py-0.5 text-[11px] font-semibold text-muted hover:text-fg border border-border transition-colors cursor-pointer"
          title="Deselect photo and return to all photos"
        >
          <span>Done</span>
          <span class="text-[9px]">✕</span>
        </button>
      </div>
    </div>`;

const newBar = `    <!-- Active Photo Bar (Visible ONLY when a specific photo is selected) -->
    <div id="pk-active-photo-bar" class="hidden flex-col gap-2 rounded-xl border border-border/80 bg-surface/90 p-2.5 text-xs shadow-xs transition-all mb-3.5">
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-2 min-w-0">
          <span class="inline-block h-2 w-2 rounded-full bg-accent animate-pulse shrink-0"></span>
          <span class="text-xs font-semibold text-fg truncate" id="pk-active-photo-name">filename.jpg</span>
          <span id="pk-active-photo-counter" class="text-[10px] font-mono text-muted shrink-0">(1 of 4)</span>
        </div>
        <div class="flex items-center gap-1 shrink-0">
          <button
            type="button"
            id="pk-target-prev-btn"
            class="p-1 rounded text-muted hover:text-fg hover:bg-bg border border-border/60 transition-colors disabled:opacity-30 cursor-pointer"
            title="Previous photo"
            aria-label="Previous photo"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
          <button
            type="button"
            id="pk-target-next-btn"
            class="p-1 rounded text-muted hover:text-fg hover:bg-bg border border-border/60 transition-colors disabled:opacity-30 cursor-pointer"
            title="Next photo"
            aria-label="Next photo"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
          <button
            type="button"
            id="pk-deselect-photo-btn"
            class="ml-1 rounded-md bg-bg px-2 py-0.5 text-[11px] font-semibold text-muted hover:text-fg border border-border transition-colors cursor-pointer"
            title="Deselect photo and return to all photos"
          >
            Done ✕
          </button>
        </div>
      </div>
      <div class="pt-1.5 border-t border-border/60 flex items-center justify-between text-[11px]">
        <span class="text-muted">Editing only this photo</span>
        <button
          type="button"
          id="pk-apply-to-all-btn"
          class="font-semibold text-accent hover:underline cursor-pointer transition-colors"
        >
          Apply to All Photos →
        </button>
      </div>
    </div>`;

code = code.replace(oldBar, newBar);

// 2. Stage 1: Replace number & icon with simple dot
const oldStage1Header = `<span class="text-xs font-bold text-fg flex items-center gap-1.5">
          <span class={\`pk-stage-num flex h-5 w-5 items-center justify-center rounded-md bg-accent/15 text-accent text-[11px] font-mono font-bold \${initialTool === 'all' ? '' : 'hidden'}\`}>1</span>
          <span class="text-sm">🔄</span>
          <span>Output Format</span>
        </span>`;

const newStage1Header = `<span class="text-xs font-bold text-fg flex items-center gap-2">
          <span id="pk-dot-format" class="pk-stage-dot inline-block h-2 w-2 rounded-full bg-accent ring-2 ring-accent/20 transition-all shrink-0"></span>
          <span>Output Format</span>
        </span>`;

code = code.replace(oldStage1Header, newStage1Header);

// 3. Stage 2: Replace number & icon with simple dot
const oldStage2Header = `<span class="text-xs font-bold text-fg flex items-center gap-1.5">
          <span class={\`pk-stage-num flex h-5 w-5 items-center justify-center rounded-md bg-accent/15 text-accent text-[11px] font-mono font-bold \${initialTool === 'all' ? '' : 'hidden'}\`}>2</span>
          <span class="text-sm">🗜️</span>
          <span>Compression &amp; Target Size</span>
        </span>`;

const newStage2Header = `<span class="text-xs font-bold text-fg flex items-center gap-2">
          <span id="pk-dot-compress" class={\`pk-stage-dot inline-block h-2 w-2 rounded-full transition-all shrink-0 \${targetKb ? 'bg-accent ring-2 ring-accent/20' : 'bg-muted/40'}\`}></span>
          <span>Compression &amp; Target Size</span>
        </span>`;

code = code.replace(oldStage2Header, newStage2Header);

// 4. Stage 3: Replace number & icon with simple dot
const oldStage3Header = `<span class="text-xs font-bold text-fg flex items-center gap-1.5">
          <span class={\`pk-stage-num flex h-5 w-5 items-center justify-center rounded-md bg-accent/15 text-accent text-[11px] font-mono font-bold \${initialTool === 'all' ? '' : 'hidden'}\`}>3</span>
          <span class="text-sm">✂️</span>
          <span>Crop &amp; Aspect Ratio</span>
        </span>`;

const newStage3Header = `<span class="text-xs font-bold text-fg flex items-center gap-2">
          <span id="pk-dot-crop" class="pk-stage-dot inline-block h-2 w-2 rounded-full bg-muted/40 transition-all shrink-0"></span>
          <span>Crop &amp; Aspect Ratio</span>
        </span>`;

code = code.replace(oldStage3Header, newStage3Header);

// 5. Stage 4: Replace number & icon with simple dot
const oldStage4Header = `<span class="text-xs font-bold text-fg flex items-center gap-1.5">
          <span class={\`pk-stage-num flex h-5 w-5 items-center justify-center rounded-md bg-accent/15 text-accent text-[11px] font-mono font-bold \${initialTool === 'all' ? '' : 'hidden'}\`}>4</span>
          <span class="text-sm">📐</span>
          <span>Resize Dimensions</span>
        </span>`;

const newStage4Header = `<span class="text-xs font-bold text-fg flex items-center gap-2">
          <span id="pk-dot-resize" class="pk-stage-dot inline-block h-2 w-2 rounded-full bg-muted/40 transition-all shrink-0"></span>
          <span>Resize Dimensions</span>
        </span>`;

code = code.replace(oldStage4Header, newStage4Header);

fs.writeFileSync('src/components/converter/SettingsPanel.astro', code, 'utf8');
console.log('SettingsPanel.astro updated: simple dots added, icons removed, active bar redesigned!');
