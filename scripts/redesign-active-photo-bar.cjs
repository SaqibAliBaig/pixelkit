const fs = require('fs');
let code = fs.readFileSync('src/components/converter/SettingsPanel.astro', 'utf8');

const targetOld = `    <!-- Target Photo Selector for Multi-Image Queue -->
    <div id="pk-active-photo-bar" class="hidden rounded-xl border border-accent/40 bg-accent/5 p-2.5 transition-all mb-3.5">
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-2 min-w-0">
          <span class="flex h-6 w-6 items-center justify-center rounded-lg bg-accent/15 text-accent text-xs shrink-0">🎯</span>
          <div class="min-w-0">
            <div class="flex items-center gap-1.5">
              <span class="text-[10px] font-bold text-accent uppercase tracking-wider">Active Photo</span>
              <span id="pk-active-photo-counter" class="text-[10px] font-mono px-1.5 py-0.2 rounded bg-surface border border-border text-muted font-bold shrink-0">1 of 1</span>
            </div>
            <p id="pk-active-photo-name" class="text-xs font-semibold text-fg truncate">filename.jpg</p>
          </div>
        </div>
        <div class="flex items-center gap-1 shrink-0">
          <button
            type="button"
            id="pk-target-prev-btn"
            class="p-1.5 rounded-lg bg-surface hover:bg-surface/80 border border-border text-muted hover:text-fg transition-colors disabled:opacity-30 cursor-pointer"
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
            class="p-1.5 rounded-lg bg-surface hover:bg-surface/80 border border-border text-muted hover:text-fg transition-colors disabled:opacity-30 cursor-pointer"
            title="Next photo"
            aria-label="Next photo"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        </div>
      </div>
      <div class="mt-2 pt-2 border-t border-accent/15 flex items-center justify-between text-[11px] text-muted">
        <span>Click any photo card to select it</span>
        <button type="button" id="pk-apply-to-all-btn" class="text-accent hover:underline font-semibold cursor-pointer">
          Apply Settings to All Photos
        </button>
      </div>
    </div>`;

const targetNew = `    <!-- Active Photo Bar (Visible ONLY when a specific photo is selected) -->
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

code = code.replace(targetOld, targetNew);
fs.writeFileSync('src/components/converter/SettingsPanel.astro', code, 'utf8');
console.log('SettingsPanel.astro active photo bar redesigned to slim pill with Done button!');
