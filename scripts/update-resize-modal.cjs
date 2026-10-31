const fs = require('fs');
let code = fs.readFileSync('src/components/converter/ResizeModal.astro', 'utf8');

const target = `<!-- Close Button with comfortable touch target -->
      <button
        id="pk-resize-close-btn"`;

const replacement = `<!-- Multi-photo Stepper (visible when multiple images are loaded) -->
      <div id="pk-resize-modal-stepper" class="hidden items-center gap-1.5 px-2 py-1 rounded-lg bg-bg border border-border text-xs shrink-0 mr-2">
        <button
          type="button"
          id="pk-resize-modal-prev-btn"
          class="p-1 rounded text-muted hover:text-fg hover:bg-surface disabled:opacity-30 cursor-pointer transition-colors"
          title="Previous photo"
          aria-label="Previous photo"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        <span id="pk-resize-modal-counter" class="font-mono text-[11px] font-bold text-fg px-1">1 / 3</span>
        <button
          type="button"
          id="pk-resize-modal-next-btn"
          class="p-1 rounded text-muted hover:text-fg hover:bg-surface disabled:opacity-30 cursor-pointer transition-colors"
          title="Next photo"
          aria-label="Next photo"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
      </div>

      <!-- Close Button with comfortable touch target -->
      <button
        id="pk-resize-close-btn"`;

code = code.replace(target, replacement);
fs.writeFileSync('src/components/converter/ResizeModal.astro', code, 'utf8');
console.log('Added stepper to ResizeModal.astro');
