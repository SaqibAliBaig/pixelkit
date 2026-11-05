import fs from 'node:fs';
import path from 'node:path';

function checkFile(relPath) {
  const fullPath = path.resolve('dist', relPath);
  if (!fs.existsSync(fullPath)) {
    console.error(`File not found: ${relPath}`);
    return;
  }
  const html = fs.readFileSync(fullPath, 'utf8');
  console.log(`\n=== Checking ${relPath} ===`);

  // Check top mode bar
  const hasNavModeBar = html.includes('<nav id="pk-top-mode-bar"');
  const hasRoleTablist = html.includes('id="pk-top-mode-bar"') && html.includes('role="tablist"');
  console.log(`- <nav id="pk-top-mode-bar">: ${hasNavModeBar}`);
  console.log(`- Erroneous role="tablist" on mode bar: ${hasRoleTablist}`);

  // Check locked preset badge
  const badgeMatch = html.match(/id="pk-locked-preset-badge"[^>]*>([\s\S]*?)<\/div>/);
  if (badgeMatch) {
    const text = badgeMatch[1].replace(/<[^>]+>/g, '').trim().replace(/\s+/g, ' ');
    console.log(`- Locked Preset Badge: "${text}"`);
  } else {
    console.log(`- Locked Preset Badge: [None]`);
  }

  // Check Try Sample button
  const hasSampleBtn = html.includes('id="pk-try-sample-btn"');
  console.log(`- Try with Sample Photo button: ${hasSampleBtn}`);
}

checkFile('ssc-photo-resizer/index.html');
checkFile('compress-image-to-50kb/index.html');
checkFile('convert/index.html');
checkFile('index.html');

