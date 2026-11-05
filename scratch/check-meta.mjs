import fs from 'fs';
import path from 'path';

const files = fs.readdirSync('src/pages').filter((f) => f.endsWith('.astro'));
let overlongTitles = 0;
let overlongDescs = 0;

for (const file of files) {
  const content = fs.readFileSync(path.join('src/pages', file), 'utf8');

  // Match title in frontmatter: const pageTitle = '...'; or title: '...'
  const titleMatch = content.match(/pageTitle\s*=\s*['"`](.*?)['"`]/) || content.match(/title\s*=\s*['"`](.*?)['"`]/);
  const descMatch = content.match(/pageDesc\s*=\s*['"`](.*?)['"`]/) || content.match(/description\s*=\s*['"`](.*?)['"`]/);

  if (titleMatch) {
    const rawTitle = titleMatch[1];
    // Emulate SEOHead.astro logic:
    // const siteSuffix = ` — PixelKit`;
    // const fullTitle = rawTitle.includes('PixelKit') ? rawTitle : rawTitle.length + siteSuffix.length <= 60 ? `${rawTitle}${siteSuffix}` : rawTitle;
    const siteSuffix = ' — PixelKit';
    const fullTitle = rawTitle.includes('PixelKit')
      ? rawTitle
      : rawTitle.length + siteSuffix.length <= 60
        ? `${rawTitle}${siteSuffix}`
        : rawTitle;

    if (fullTitle.length > 60) {
      console.log(`[OVERLONG TITLE] (${fullTitle.length} chars) ${file}: "${fullTitle}"`);
      overlongTitles++;
    }
  }

  if (descMatch) {
    const desc = descMatch[1];
    if (desc.length > 160) {
      console.log(`[OVERLONG DESC] (${desc.length} chars) ${file}: "${desc}"`);
      overlongDescs++;
    }
  }
}

console.log(`Audit complete: ${overlongTitles} overlong titles (>60), ${overlongDescs} overlong descriptions (>160).`);

