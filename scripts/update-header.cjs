const fs = require('fs');
let code = fs.readFileSync('src/components/ui/Header.astro', 'utf8');
code = code.replace(
  '<nav class="hidden md:flex items-center gap-1"',
  '<nav class="hidden md:flex items-center gap-0.5 lg:gap-1"'
);
code = code.replace(
  "'rounded-md px-3 py-2 text-sm transition-colors',",
  "'rounded-md px-2.5 py-1.5 lg:px-3 lg:py-2 text-xs lg:text-sm transition-colors font-medium',"
);
fs.writeFileSync('src/components/ui/Header.astro', code, 'utf8');
console.log('Updated Header.astro');
