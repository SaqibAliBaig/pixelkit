const fs = require('fs');
let code = fs.readFileSync('src/components/converter/FileList.astro', 'utf8');

const target = `<span class="pk-file-status-badge text-[11px] font-medium px-2 py-0.5 rounded-full bg-surface border border-border text-muted shrink-0">
                Queued
              </span>`;

const replacement = `<span class="pk-file-selected-badge hidden text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent/15 border border-accent/30 text-accent shrink-0">
                ● Selected
              </span>
              <span class="pk-file-status-badge text-[11px] font-medium px-2 py-0.5 rounded-full bg-surface border border-border text-muted shrink-0">
                Queued
              </span>`;

code = code.replace(target, replacement);
fs.writeFileSync('src/components/converter/FileList.astro', code, 'utf8');
console.log('Added pk-file-selected-badge to FileList.astro');
