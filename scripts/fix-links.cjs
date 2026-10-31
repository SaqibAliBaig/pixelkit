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
  'convert',
  'privacy',
  'blog',
  'passport-photo-resizer',
  'compress-image-to-50kb',
  'compress-image-to-100kb',
  'compress-image-to-200kb',
  'compress-image-to-500kb',
  'compress-jpg',
  'compress-png',
  'compress-webp',
  'compress-pdf',
  'compress-image-to-20kb',
  'about',
  'compress-image',
  'resize-image',
  'crop-image',
  'terms',
];

for (const file of walk('src')) {
  let c = fs.readFileSync(file, 'utf8');
  let changed = false;

  for (const t of targets) {
    // href="/target" -> href="/target/"
    const regDouble = new RegExp(`href="/${t}"`, 'g');
    if (regDouble.test(c)) {
      c = c.replace(regDouble, `href="/${t}/"`);
      changed = true;
    }
    const regSingle = new RegExp(`href='/(${t})'`, 'g');
    if (regSingle.test(c)) {
      c = c.replace(regSingle, `href='/$1/'`);
      changed = true;
    }
    const regObj = new RegExp(`href:\\s*['"]/${t}['"]`, 'g');
    if (regObj.test(c)) {
      c = c.replace(regObj, `href: '/${t}/'`);
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(file, c, 'utf8');
    console.log('Fixed trailing slashes in:', file);
  }
}
