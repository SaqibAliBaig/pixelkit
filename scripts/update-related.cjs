const fs = require('fs');
let f = fs.readFileSync('src/pages/[from]-to-[to].astro', 'utf8');

const oldBlock = `// Related combos — same from or same to, but not this one, capped at 6.
const related = allCombos
  .filter((c) => c.kind === 'convert')
  .filter((c) => c.from === combo.from || c.to === combo.to)
  .filter((c) => !(c.from === combo.from && c.to === combo.to))
  .slice(0, 6)
  .map((c) => ({
    label: \`\${c.from.toUpperCase()} to \${c.to.toUpperCase()}\`,
    href: \`/\${c.from}-to-\${c.to}/\`,
  }));`;

const newBlock = `// Prioritize combos sharing the SAME source format (e.g., other TIFF or SVG conversions)
const sameSource = allCombos
  .filter((c) => c.kind === 'convert' && c.from === combo.from && c.to !== combo.to);

// Then combos sharing the SAME target format (e.g., other conversions to JPG or PNG)
const sameTarget = allCombos
  .filter((c) => c.kind === 'convert' && c.to === combo.to && c.from !== combo.from);

const related = [...sameSource, ...sameTarget]
  .slice(0, 6)
  .map((c) => ({
    label: \`\${c.from.toUpperCase()} to \${c.to.toUpperCase()}\`,
    href: \`/\${c.from}-to-\${c.to}/\`,
  }));`;

// Normalize line breaks for matching
const normF = f.replace(/\r\n/g, '\n');
const normOld = oldBlock.replace(/\r\n/g, '\n');

if (normF.includes(normOld)) {
  const updated = normF.replace(normOld, newBlock.replace(/\r\n/g, '\n'));
  fs.writeFileSync('src/pages/[from]-to-[to].astro', updated, 'utf8');
  console.log('Successfully updated related logic in [from]-to-[to].astro');
} else {
  console.error('Could not find oldBlock in file');
}
