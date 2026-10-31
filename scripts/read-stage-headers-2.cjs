const fs = require('fs');
const code = fs.readFileSync('src/components/converter/SettingsPanel.astro', 'utf8');
['pk-stage-format', 'pk-stage-compress', 'pk-stage-crop', 'pk-stage-resize'].forEach(id => {
  const idx = code.indexOf(`id="${id}"`);
  const headerIdx = code.indexOf('<div class="flex items-center justify-between">', idx);
  console.log(`=== ${id} HEADER ===`);
  console.log(code.substring(headerIdx, headerIdx + 300));
});
