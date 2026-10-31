const fs = require('fs');

// 1. CropModal.astro
let cropCode = fs.readFileSync('src/components/converter/CropModal.astro', 'utf8');
const searchCrop = 'data-ratio="3.5:4.5">3.5:4.5 ID</button>';
const replaceCrop = 'data-ratio="3.5:4.5">3.5:4.5 ID</button>\n        <button type="button" class="pk-modal-ratio-btn h-8 px-3 rounded-lg font-medium border border-border bg-surface text-fg hover:border-accent/40 cursor-pointer shrink-0 text-xs whitespace-nowrap flex items-center justify-center transition-colors" data-ratio="2:1">2:1 Signature</button>\n        <button type="button" class="pk-modal-ratio-btn h-8 px-3 rounded-lg font-medium border border-border bg-surface text-fg hover:border-accent/40 cursor-pointer shrink-0 text-xs whitespace-nowrap flex items-center justify-center transition-colors" data-ratio="5:7">5:7 Canada</button>';

if (!cropCode.includes('2:1 Signature')) {
  cropCode = cropCode.replace(searchCrop, replaceCrop);
  fs.writeFileSync('src/components/converter/CropModal.astro', cropCode, 'utf8');
  console.log('Updated CropModal.astro with 2:1 and 5:7');
}

// 2. ResizeModal.astro
let resizeCode = fs.readFileSync('src/components/converter/ResizeModal.astro', 'utf8');
const searchResize = 'data-preset="passport" data-w="413" data-h="531">';
const extraResizePresets = `
            <button type="button" class="pk-modal-dim-preset p-2 rounded-lg border border-border bg-surface text-fg hover:border-accent/40 transition-colors text-left cursor-pointer" data-preset="exam" data-w="350" data-h="450">
              <span class="block font-semibold text-xs truncate">🎓 Exam / UPSC</span>
              <span class="block text-[10px] text-muted truncate">350 × 450 px</span>
            </button>
            <button type="button" class="pk-modal-dim-preset p-2 rounded-lg border border-border bg-surface text-fg hover:border-accent/40 transition-colors text-left cursor-pointer" data-preset="sign" data-w="280" data-h="140">
              <span class="block font-semibold text-xs truncate">✍️ Signature</span>
              <span class="block text-[10px] text-muted truncate">280 × 140 px (2:1)</span>
            </button>
            <button type="button" class="pk-modal-dim-preset p-2 rounded-lg border border-border bg-surface text-fg hover:border-accent/40 transition-colors text-left cursor-pointer" data-preset="canada" data-w="420" data-h="540">
              <span class="block font-semibold text-xs truncate">🇨🇦 Canada PR</span>
              <span class="block text-[10px] text-muted truncate">420 × 540 px</span>
            </button>`;

if (!resizeCode.includes('Exam / UPSC')) {
  resizeCode = resizeCode.replace(
    '</button>\n            <button type="button" class="pk-modal-dim-preset p-2 rounded-lg border border-border bg-surface text-fg hover:border-accent/40 transition-colors text-left cursor-pointer" data-preset="webhd"',
    '</button>' + extraResizePresets + '\n            <button type="button" class="pk-modal-dim-preset p-2 rounded-lg border border-border bg-surface text-fg hover:border-accent/40 transition-colors text-left cursor-pointer" data-preset="webhd"'
  );
  // CRLF check
  resizeCode = resizeCode.replace(
    '</button>\r\n            <button type="button" class="pk-modal-dim-preset p-2 rounded-lg border border-border bg-surface text-fg hover:border-accent/40 transition-colors text-left cursor-pointer" data-preset="webhd"',
    '</button>' + extraResizePresets + '\r\n            <button type="button" class="pk-modal-dim-preset p-2 rounded-lg border border-border bg-surface text-fg hover:border-accent/40 transition-colors text-left cursor-pointer" data-preset="webhd"'
  );
  fs.writeFileSync('src/components/converter/ResizeModal.astro', resizeCode, 'utf8');
  console.log('Updated ResizeModal.astro with Exam, Signature, and Canada PR presets');
}
