const fs = require('fs');
const path = require('path');

function getHtmlFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      results = results.concat(getHtmlFiles(full));
    } else if (file.endsWith('.html')) {
      results.push(full);
    }
  }
  return results;
}

const files = getHtmlFiles('dist');
let failed = 0;
for (const f of files) {
  if (f.endsWith('404.html')) continue; // 404 is intentionally non-indexable
  const html = fs.readFileSync(f, 'utf8');
  const text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                   .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
                   .replace(/<[^>]+>/g, ' ')
                   .replace(/\s+/g, ' ')
                   .trim();
  const ratio = (text.length / html.length) * 100;
  if (ratio < 10) {
    console.error(`FAIL: ${f} ratio: ${ratio.toFixed(2)}%`);
    failed++;
  }
}
if (failed === 0) {
  console.log(`PASS: All ${files.length - 1} indexable pages exceed 10% text-to-HTML ratio.`);
} else {
  process.exit(1);
}
