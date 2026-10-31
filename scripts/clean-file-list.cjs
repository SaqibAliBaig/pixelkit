const fs = require('fs');
let code = fs.readFileSync('src/components/converter/FileList.astro', 'utf8');

// 1. Remove #pk-header-add-btn from files header
const oldHeader = `<div id="pk-files-header" class="hidden flex items-center justify-between gap-2 px-1 text-xs">
    <div class="flex items-center gap-2">
      <span class="font-semibold text-fg" id="pk-files-count">0 files selected</span>
      <span class="text-muted text-[11px]">· No size cap limit · Add unlimited photos</span>
    </div>
    <button
      id="pk-header-add-btn"
      type="button"
      class="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:text-accent/80 transition-colors cursor-pointer"
      title="Add more photos"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>
      <span>+ Add More</span>
    </button>
  </div>`;

const newHeader = `<div id="pk-files-header" class="hidden flex items-center justify-between gap-2 px-1 text-xs">
    <div class="flex items-center gap-2">
      <span class="font-semibold text-fg" id="pk-files-count">0 files selected</span>
      <span class="text-muted text-[11px]">· No size cap limit · Add unlimited photos</span>
    </div>
  </div>`;

code = code.replace(oldHeader, newHeader);

// 2. Remove #pk-add-more-btn from actions bar
const oldAddMoreBtn = `  <button
    id="pk-add-more-btn"
    type="button"
    class="hidden w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-surface px-4 py-3 sm:py-2.5 text-sm font-medium text-fg hover:bg-surface/80 hover:border-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent transition-all cursor-pointer"
  >
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
    <span>Add More Photos</span>
  </button>`;

code = code.replace(oldAddMoreBtn, '');

// 3. Make selected badge an interactive chip with ✕ to deselect
const oldBadge = `<span class="pk-file-selected-badge hidden text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent/15 border border-accent/30 text-accent shrink-0">
                ● Selected
              </span>`;

const newBadge = `<button
                type="button"
                class="pk-file-selected-badge hidden text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent text-accent-fg shrink-0 inline-flex items-center gap-1 hover:opacity-90 transition-opacity cursor-pointer"
                title="Click to deselect photo"
              >
                <span>● Selected</span>
                <span class="text-[9px] opacity-80">✕</span>
              </button>`;

code = code.replace(oldBadge, newBadge);

fs.writeFileSync('src/components/converter/FileList.astro', code, 'utf8');
console.log('FileList.astro updated: add buttons removed, badge made deselectable!');
