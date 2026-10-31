const fs = require('fs');

// File 1: [from]-to-[to].astro
let f1 = fs.readFileSync('src/pages/[from]-to-[to].astro', 'utf8');
f1 = f1.replace(/href: `\/\$\{c\.from\}-to-\$\{c\.to\}`/g, 'href: `/${c.from}-to-${c.to}/`');
f1 = f1.replace(/href: `\/\$\{c\.from\}-to-\$\{c\.to\}-under-\$\{c\.sizeKb\}kb`/g, 'href: `/${c.from}-to-${c.to}-under-${c.sizeKb}kb/`');
fs.writeFileSync('src/pages/[from]-to-[to].astro', f1, 'utf8');

// File 2: [from]-to-[to]-under-[size]kb.astro
let f2 = fs.readFileSync('src/pages/[from]-to-[to]-under-[size]kb.astro', 'utf8');
f2 = f2.replace(/href: `\/\$\{c\.from\}-to-\$\{c\.to\}`/g, 'href: `/${c.from}-to-${c.to}/`');
f2 = f2.replace(/href: `\/\$\{c\.from\}-to-\$\{c\.to\}-under-\$\{c\.sizeKb\}kb`/g, 'href: `/${c.from}-to-${c.to}-under-${c.sizeKb}kb/`');
fs.writeFileSync('src/pages/[from]-to-[to]-under-[size]kb.astro', f2, 'utf8');

console.log('Fixed trailing slashes in both combo astro files');
