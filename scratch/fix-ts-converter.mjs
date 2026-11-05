import fs from 'node:fs';
import path from 'node:path';

const filePath = path.resolve('src/components/converter/islands/ConverterApp.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Fix unused PortalPreset import
content = content.replace(
  `import { PORTAL_PRESETS, type PortalPreset } from '@lib/portal-presets';`,
  `import { PORTAL_PRESETS } from '@lib/portal-presets';`
);

// Fix addFiles loop: use for (const file of arr) with counter to avoid noUncheckedIndexedAccess
content = content.replace(
  /for \(let fileIdx = 0; fileIdx < arr\.length; fileIdx\+\+\) \{[\r\n\s]+const file = arr\[fileIdx\];[\r\n\s]+\/\/ Protect INP \(< 200ms\) on batch mobile uploads by yielding to the browser event loop[\r\n\s]+if \(fileIdx > 0 && fileIdx % 2 === 0\) \{[\r\n\s]+await yieldToMain\(\);[\r\n\s]+\}/,
  `let fileCount = 0;
    for (const file of arr) {
      fileCount++;
      // Protect INP (< 200ms) on batch mobile uploads by yielding to the browser event loop
      if (fileCount > 1 && fileCount % 2 === 0) {
        await yieldToMain();
      }`
);

// Fix startConversion loop: use for (const job of pendingJobs) with counter
content = content.replace(
  /for \(let jobIdx = 0; jobIdx < pendingJobs\.length; jobIdx\+\+\) \{[\r\n\s]+const job = pendingJobs\[jobIdx\];[\r\n\s]+\/\/ Protect INP \(< 200ms\) by yielding between batch job configurations[\r\n\s]+if \(jobIdx > 0 && jobIdx % 3 === 0\) \{[\r\n\s]+await yieldToMain\(\);[\r\n\s]+\}/,
  `let jobCount = 0;
    for (const job of pendingJobs) {
      jobCount++;
      // Protect INP (< 200ms) by yielding between batch job configurations
      if (jobCount > 1 && jobCount % 3 === 0) {
        await yieldToMain();
      }`
);

// Use scheduleUpdateProgress in handleWorkerMessage
content = content.replace(
  /handleWorkerMessage\(w: Worker, msg: WorkerMessage\): void \{([\s\S]*?updateProgress\(\);[\s\S]*?updateButtons\(\);[\s\S]*?updateProgress\(\);[\s\S]*?updateButtons\(\);)/,
  (match) => match.replaceAll('updateProgress();', 'scheduleUpdateProgress();')
);

// Use scheduleRenderFiles in addFiles
content = content.replace(
  `    renderFiles();\n    updateLiveDimensionsAndCardPreviews();\n    updateButtons();`,
  `    scheduleRenderFiles();\n    updateLiveDimensionsAndCardPreviews();\n    updateButtons();`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed TypeScript loops and schedule calls');

