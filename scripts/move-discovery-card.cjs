const fs = require('fs');
let code = fs.readFileSync('src/components/converter/SettingsPanel.astro', 'utf8');

const targetOld = `    <!-- Quick Discovery Card for Portal Presets -->
    <div class="rounded-xl border border-border/70 bg-surface/50 p-3 hover:border-accent/40 transition-colors">
      <div class="flex items-start gap-2.5">
        <span class="text-lg shrink-0 leading-none mt-0.5">🏛️</span>
        <div class="min-w-0 flex-1">
          <span class="text-xs font-bold text-fg block">Official Visa &amp; Passport Profiles</span>
          <p class="text-[11px] text-muted mt-0.5 leading-snug">
            Need 1-click verified specs for US Visa, Indian Passport, Schengen, Exam 50KB or Canada PR?
          </p>
          <button
            type="button"
            id="pk-btn-switch-to-portal"
            class="mt-2 text-xs font-bold text-accent hover:underline inline-flex items-center gap-1 cursor-pointer"
          >
            Browse 20 Official Portal Presets →
          </button>
        </div>
      </div>
    </div>
    </div>
  </div>`;

const targetNew = `    </div>

    <!-- Quick Discovery Card for Portal Presets (Pinned to the very end) -->
    <div id="pk-card-portal-discovery" class={\`rounded-xl border border-border/70 bg-surface/50 p-3 hover:border-accent/40 transition-colors \${initialTool === 'all' ? '' : 'hidden'}\`}>
      <div class="flex items-start gap-2.5">
        <span class="text-lg shrink-0 leading-none mt-0.5">🏛️</span>
        <div class="min-w-0 flex-1">
          <span class="text-xs font-bold text-fg block">Official Visa &amp; Passport Profiles</span>
          <p class="text-[11px] text-muted mt-0.5 leading-snug">
            Need 1-click verified specs for US Visa, Indian Passport, Schengen, Exam 50KB or Canada PR?
          </p>
          <button
            type="button"
            id="pk-btn-switch-to-portal"
            class="mt-2 text-xs font-bold text-accent hover:underline inline-flex items-center gap-1 cursor-pointer"
          >
            Browse 20 Official Portal Presets →
          </button>
        </div>
      </div>
    </div>
  </div>`;

if (!code.includes(targetOld)) {
  console.error('Target old block not found! Searching substring...');
  const idx = code.indexOf('<!-- Quick Discovery Card for Portal Presets -->');
  console.log(code.substring(idx - 50, idx + 800));
  process.exit(1);
}

code = code.replace(targetOld, targetNew);
fs.writeFileSync('src/components/converter/SettingsPanel.astro', code, 'utf8');
console.log('Moved discovery card outside stagesList and pinned to end!');
