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
console.log(`Found ${htmlFiles.length} HTML files in dist/`);

// Map of canonical route -> incoming link count
const incomingCount = {};
for (const file of htmlFiles) {
  let route = file.replace(/^dist/, '').replace(/\\/g, '/');
  route = route.replace(/index\.html$/, '');
  if (!route.endsWith('/')) route += '/';
  if (route !== '/404.html/') {
    incomingCount[route] = 0;
  }
}

for (const file of htmlFiles) {
  const content = fs.readFileSync(file, 'utf8');
  // Match href="/..."
  const matches = content.matchAll(/href=["'](\/[^"']*)["']/g);
  const seenOnThisPage = new Set();
  for (const m of matches) {
    let target = m[1].split('#')[0].split('?')[0];
    if (!target.endsWith('/') && !target.includes('.')) target += '/';
    if (incomingCount[target] !== undefined && !seenOnThisPage.has(target)) {
      seenOnThisPage.add(target);
      incomingCount[target]++;
    }
  }
}

const singleIncoming = [];
const zeroIncoming = [];
for (const [route, count] of Object.entries(incomingCount)) {
  if (count === 1) singleIncoming.push(route);
  if (count === 0) zeroIncoming.push(route);
}

console.log(`Single incoming links (${singleIncoming.length}):`, singleIncoming);
console.log(`Zero incoming links (${zeroIncoming.length}):`, zeroIncoming);

