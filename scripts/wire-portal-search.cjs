const fs = require('fs');

let code = fs.readFileSync('src/components/converter/islands/ConverterApp.tsx', 'utf8');

// 1. Add elements
const elemTarget = '  const portalPresetCards = document.querySelectorAll<HTMLButtonElement>(\'.pk-portal-preset-card\');';
const elemAddition = `  const portalPresetCards = document.querySelectorAll<HTMLButtonElement>('.pk-portal-preset-card');
  const portalSearchInput = document.getElementById('pk-portal-search') as HTMLInputElement | null;
  const portalCatFilters = document.querySelectorAll<HTMLButtonElement>('.pk-cat-filter');
  const portalNoMatches = document.getElementById('pk-portal-no-matches');
  let activePortalCat = 'all';`;

code = code.replace(elemTarget, elemAddition);

// 2. Add filter function before switchSettingsTab
const switchTarget = '  function switchSettingsTab(mode: \'custom\' | \'portal\'): void {';
const filterFunc = `  function filterPortalCards(): void {
    const query = (portalSearchInput?.value || '').trim().toLowerCase();
    let visibleCount = 0;

    portalPresetCards.forEach((card) => {
      const cat = card.dataset.cat || '';
      const searchData = card.dataset.search || '';
      const matchesCat = activePortalCat === 'all' || cat === activePortalCat;
      const matchesQuery = !query || searchData.includes(query);

      const show = matchesCat && matchesQuery;
      card.classList.toggle('hidden', !show);
      if (show) visibleCount++;
    });

    if (portalNoMatches) {
      portalNoMatches.classList.toggle('hidden', visibleCount > 0);
    }
  }

  function switchSettingsTab(mode: 'custom' | 'portal'): void {`;

code = code.replace(switchTarget, filterFunc);

// 3. Update bannerFlag in syncPortalPresetUi
code = code.replace(
  "if (bannerFlag) bannerFlag.textContent = preset.flag;",
  "if (bannerFlag) bannerFlag.textContent = preset.countryCode || preset.flag;"
);

// 4. Update card classes in syncPortalPresetUi
code = code.replace(
  "'pk-portal-preset-card group relative w-full rounded-xl border border-accent bg-accent/10 p-3 text-left transition-all cursor-pointer shadow-xs'",
  "'pk-portal-preset-card group relative w-full rounded-xl border border-accent bg-accent/10 p-2.5 text-left transition-all cursor-pointer shadow-xs'"
);
code = code.replace(
  "'pk-portal-preset-card group relative w-full rounded-xl border border-border bg-surface p-3 text-left transition-all cursor-pointer hover:border-accent/60 hover:bg-surface/90 shadow-2xs'",
  "'pk-portal-preset-card group relative w-full rounded-xl border border-border bg-surface p-2.5 text-left transition-all cursor-pointer hover:border-accent/60 hover:bg-surface/90 shadow-2xs'"
);

// 5. Add search & filter event listeners
const listenerTarget = `  // Select Portal Preset Card
  portalPresetCards.forEach((card) => {`;

const listenerAddition = `  // Filter and Category Event Listeners
  portalSearchInput?.addEventListener('input', () => {
    filterPortalCards();
  });

  portalCatFilters.forEach((btn) => {
    btn.addEventListener('click', () => {
      activePortalCat = btn.dataset.cat || 'all';
      portalCatFilters.forEach((b) => {
        const isSelected = b === btn;
        if (isSelected) {
          b.className =
            'pk-cat-filter active rounded-md border border-accent bg-accent/15 px-2 py-0.5 font-semibold text-accent cursor-pointer transition-colors';
        } else {
          b.className =
            'pk-cat-filter rounded-md border border-border bg-surface px-2 py-0.5 font-medium text-muted hover:text-fg cursor-pointer transition-colors';
        }
      });
      filterPortalCards();
    });
  });

  // Select Portal Preset Card
  portalPresetCards.forEach((card) => {`;

code = code.replace(listenerTarget, listenerAddition);

fs.writeFileSync('src/components/converter/islands/ConverterApp.tsx', code, 'utf8');
console.log('Successfully wired portal search & filters in ConverterApp.tsx');
