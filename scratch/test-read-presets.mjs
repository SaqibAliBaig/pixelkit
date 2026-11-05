import fs from 'node:fs';

const content = fs.readFileSync('src/lib/portal-presets.ts', 'utf8');

// Extract the array literal inside PORTAL_PRESETS = [ ... ];
const match = content.match(/export const PORTAL_PRESETS:[^=]*=\s*(\[[\s\S]*?\n\];)/);
if (match) {
  // Replace trailing semicolons or single quotes if evaluating
  const arrayCode = match[1].replace(/;\s*$/, '');
  const presets = eval(arrayCode);
  console.log('Successfully extracted presets:', presets.length);
  console.log('First preset:', presets[0].name);
  console.log('Last preset:', presets[presets.length - 1].name);
} else {
  console.error('Could not match PORTAL_PRESETS array');
}

