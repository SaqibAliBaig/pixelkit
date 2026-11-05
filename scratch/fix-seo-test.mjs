import fs from 'node:fs';
import path from 'node:path';

const filePath = path.resolve('tests/seo.test.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Update imports
content = content.replace(
  `import { readFileSync } from 'node:fs';`,
  `import { readFileSync, existsSync } from 'node:fs';`
);

// Replace path.resolve and fs.readFileSync in the suite
content = content.replace(
  `const keyPath = path.resolve('public', \`\${key}.txt\`);
    expect(fs.existsSync(keyPath)).toBe(true);
    const content = fs.readFileSync(keyPath, 'utf8').trim();`,
  `const keyPath = resolve('public', \`\${key}.txt\`);
    expect(existsSync(keyPath)).toBe(true);
    const content = readFileSync(keyPath, 'utf8').trim();`
);

content = content.replace(
  `const llmsPath = path.resolve('public/llms.txt');
    expect(fs.existsSync(llmsPath)).toBe(true);
    const text = fs.readFileSync(llmsPath, 'utf8');`,
  `const llmsPath = resolve('public/llms.txt');
    expect(existsSync(llmsPath)).toBe(true);
    const text = readFileSync(llmsPath, 'utf8');`
);

content = content.replace(
  `const fullPath = path.resolve('public/llms-full.txt');
    expect(fs.existsSync(fullPath)).toBe(true);
    const text = fs.readFileSync(fullPath, 'utf8');`,
  `const fullPath = resolve('public/llms-full.txt');
    expect(existsSync(fullPath)).toBe(true);
    const text = readFileSync(fullPath, 'utf8');`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed imports in tests/seo.test.ts');

