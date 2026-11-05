import fs from 'node:fs';
import path from 'node:path';

const html = fs.readFileSync(path.resolve('dist/ssc-photo-resizer/index.html'), 'utf8');
const match = html.match(/<nav id="pk-top-mode-bar"[\s\S]*?<\/nav>/);
if (match) {
  console.log('=== Mode bar tag in HTML ===');
  const tagOpen = match[0].split('>')[0] + '>';
  console.log('Opening tag:', tagOpen);
  console.log('Contains role="tablist"?', match[0].includes('role="tablist"'));
  console.log('Contains aria-label="Processing Mode"?', match[0].includes('aria-label="Processing Mode"'));

  const links = match[0].match(/<a[^>]*>/g) || [];
  console.log('Links in mode bar:');
  links.forEach(l => console.log(' ', l));
} else {
  console.log('Mode bar not found!');
}

