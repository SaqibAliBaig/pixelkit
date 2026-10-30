const fs = require('fs');
const path = require('path');

function getHtmlFiles(dir) {
  let files = [];
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    if (fs.statSync(full).isDirectory()) {
      files.push(...getHtmlFiles(full));
    } else if (item.endsWith('.html')) {
      files.push(full);
    }
  }
  return files;
}

const htmlFiles = getHtmlFiles('dist');
const lowRatioPages = [];

for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf8');
  // Strip scripts, styles, svg
  const stripped = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const textLength = stripped.length;
  const htmlLength = html.length;
  const ratio = (textLength / htmlLength) * 100;

  let route = file.replace(/^dist/, '').replace(/\\/g, '/').replace(/index\.html$/, '');
  if (!route.endsWith('/')) route += '/';

  if (ratio < 10) {
    lowRatioPages.push({ route, ratio: ratio.toFixed(2) + '%', textLength, htmlLength });
  }
}

console.log(`Pages with <10% text-to-HTML ratio: ${lowRatioPages.length}`);
console.log(lowRatioPages.slice(0, 40));

