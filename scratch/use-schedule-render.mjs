import fs from 'node:fs';
import path from 'node:path';

const filePath = path.resolve('src/components/converter/islands/ConverterApp.tsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  `syncSidebarToSelectedJob(null);\n    renderFiles();\n    updateButtons();`,
  `syncSidebarToSelectedJob(null);\n    scheduleRenderFiles();\n    updateButtons();`
);
if (!content.includes('syncSidebarToSelectedJob(null);\n    scheduleRenderFiles();')) {
  content = content.replace(
    `syncSidebarToSelectedJob(null);\r\n    renderFiles();\r\n    updateButtons();`,
    `syncSidebarToSelectedJob(null);\r\n    scheduleRenderFiles();\r\n    updateButtons();`
  );
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Updated clearBtn to use scheduleRenderFiles');

