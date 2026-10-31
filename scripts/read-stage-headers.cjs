const fs = require('fs');
const code = fs.readFileSync('src/components/converter/SettingsPanel.astro', 'utf8');
['pk-stage-format', 'pk-stage-compress', 'pk-stage-crop', 'pk-stage-resize'].forEach(id => {
  const idx = code.indexOf(`id="${id}"`);
  console.log(`=== ${id} ===`);
  console.log(code.substring(idx, idx + 400));
});
