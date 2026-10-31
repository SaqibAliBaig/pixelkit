const fs = require('fs');

// 1. Fix dark mode logo in Header.astro
let header = fs.readFileSync('src/components/ui/Header.astro', 'utf8');
header = header.replace(
  'class="h-7 w-7 rounded-lg shrink-0 object-contain shadow-sm"',
  'class="h-7 w-7 rounded-lg shrink-0 object-contain shadow-sm dark:invert"'
);
fs.writeFileSync('src/components/ui/Header.astro', header, 'utf8');
console.log('Fixed Header logo dark mode');

// 2. Fix dark mode logo in Footer.astro
let footer = fs.readFileSync('src/components/ui/Footer.astro', 'utf8');
footer = footer.replace(
  'class="h-6 w-6 rounded-md shrink-0 object-contain shadow-xs"',
  'class="h-6 w-6 rounded-md shrink-0 object-contain shadow-xs dark:invert"'
);
fs.writeFileSync('src/components/ui/Footer.astro', footer, 'utf8');
console.log('Fixed Footer logo dark mode');
