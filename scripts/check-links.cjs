const fs = require('fs');
const path = require('path');

function walk(d) {
  let r = [];
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) r.push(...walk(p));
    else if (p.endsWith('.astro') || p.endsWith('.ts')) r.push(p);
  }
  return r;
}

const targets = [
  '/convert',
  '/privacy',
  '/blog',
  '/passport-photo-resizer',
  '/compress-image-to-50kb',
  '/compress-image-to-100kb',
  '/compress-image-to-200kb',
  '/compress-image-to-500kb',
  '/compress-jpg',
  '/compress-png',
  '/compress-webp',
  '/compress-pdf',
  '/compress-image-to-20kb',
  '/about',
  '/compress-image',
  '/resize-image',
  '/crop-image',
  '/terms',
];

for (const f of walk('src')) {
  const c = fs.readFileSync(f, 'utf8');
  for (const t of targets) {
    const regex = new RegExp(`href=["']${t}["']`, 'g');
    if (regex.test(c)) {
      console.log(f, t);
    }
  }
}
