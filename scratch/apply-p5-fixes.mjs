import fs from 'node:fs';
import path from 'node:path';

const filePath = path.resolve('src/components/converter/islands/ConverterApp.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Update modeTabs.forEach with aria-current
content = content.replace(
  /modeTabs\.forEach\(\(tab\) => \{[\r\n\s]+const isSelected = tab\.dataset\.mode === mode;[\r\n\s]+if \(isSelected\) \{[\r\n\s]+tab\.className =[\r\n\s]+'pk-mode-tab[^']*';[\r\n\s]+\} else \{[\r\n\s]+tab\.className =[\r\n\s]+'pk-mode-tab[^']*';[\r\n\s]+\}[\r\n\s]+\}\);/,
  `modeTabs.forEach((tab) => {
      const isSelected = tab.dataset.mode === mode;
      if (isSelected) {
        tab.className =
          'pk-mode-tab shrink-0 whitespace-nowrap touch-manipulation px-3 py-1.5 rounded-lg transition-all cursor-pointer font-semibold bg-surface text-fg shadow-xs border border-border/50';
        tab.setAttribute('aria-current', 'page');
      } else {
        tab.className =
          'pk-mode-tab shrink-0 whitespace-nowrap touch-manipulation px-3 py-1.5 rounded-lg transition-all cursor-pointer font-medium text-muted hover:text-fg';
        tab.removeAttribute('aria-current');
      }
    });`
);

// Update dropzone click check to ignore button clicks
content = content.replace(
  /if \(\(e\.target as HTMLElement\)\.closest\('input'\)\) return;/,
  `if ((e.target as HTMLElement).closest('input, button')) return;`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('ConverterApp regex replacements finished');
