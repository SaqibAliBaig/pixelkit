import fs from 'fs';
import path from 'path';

function getAllHtmlFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getAllHtmlFiles(filePath, fileList);
    } else if (file.endsWith('.html')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const htmlFiles = getAllHtmlFiles('dist');
console.log(`Auditing ${htmlFiles.length} generated HTML pages in dist/...`);

let brokenInternalLinks = 0;
let jsonLdErrors = 0;
let overlongTitles = 0;
let overlongDescriptions = 0;
let missingOgImages = 0;

for (const file of htmlFiles) {
  const content = fs.readFileSync(file, 'utf8');

  // Title check
  const titleMatch = content.match(/<title>(.*?)<\/title>/);
  if (titleMatch) {
    const title = titleMatch[1];
    if (title.length > 60) {
      console.log(`[OVERLONG TITLE] (${title.length} chars) in ${file}: "${title}"`);
      overlongTitles++;
    }
  }

  // Description check
  const descMatch = content.match(/<meta name="description" content="(.*?)"/);
  if (descMatch) {
    const desc = descMatch[1];
    if (desc.length > 160) {
      console.log(`[OVERLONG DESC] (${desc.length} chars) in ${file}: "${desc}"`);
      overlongDescriptions++;
    }
  }

  // OG Image check
  const ogImageMatch = content.match(/<meta property="og:image" content="(.*?)"/);
  if (ogImageMatch) {
    const ogUrl = ogImageMatch[1];
    if (ogUrl.startsWith('https://pixelkit.app/og/')) {
      const relPath = ogUrl.replace('https://pixelkit.app/', '');
      const localOg = path.join('dist', relPath);
      if (!fs.existsSync(localOg)) {
        console.log(`[MISSING OG IMAGE] ${localOg} referenced in ${file}`);
        missingOgImages++;
      }
    }
  }

  // JSON-LD check
  const jsonLdMatches = content.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g);
  if (jsonLdMatches) {
    for (const tag of jsonLdMatches) {
      const jsonStr = tag.replace(/<script type="application\/ld\+json">/, '').replace(/<\/script>/, '');
      try {
        const parsed = JSON.parse(jsonStr);
        if (parsed['@graph']) {
          for (const node of parsed['@graph']) {
            if (node['@type'] === 'BreadcrumbList') {
              for (const elem of node.itemListElement || []) {
                if (!elem.name) {
                  console.log(`[JSON-LD EMPTY BREADCRUMB NAME] in ${file}`);
                  jsonLdErrors++;
                }
              }
            }
          }
        }
      } catch (err) {
        console.log(`[JSON-LD PARSE ERROR] in ${file}:`, err.message);
        jsonLdErrors++;
      }
    }
  }

  // Internal link check
  const hrefMatches = content.match(/href="(\/[^"#?]*)"/g);
  if (hrefMatches) {
    for (const hrefAttr of hrefMatches) {
      const link = hrefAttr.match(/href="([^"]*)"/)[1];
      if (link.startsWith('/_astro') || link.startsWith('/fonts') || link.startsWith('/favicon') || link.startsWith('/icons')) continue;
      
      // Target file should be dist/link/index.html or dist/link
      let targetPath = path.join('dist', link.endsWith('/') ? link + 'index.html' : link);
      if (!fs.existsSync(targetPath)) {
        targetPath = path.join('dist', link, 'index.html');
      }
      if (!fs.existsSync(targetPath)) {
        console.log(`[BROKEN INTERNAL LINK] "${link}" in ${file}`);
        brokenInternalLinks++;
      }
    }
  }
}

console.log('=== AUDIT SUMMARY ===');
console.log(`Total Pages: ${htmlFiles.length}`);
console.log(`Broken Internal Links: ${brokenInternalLinks}`);
console.log(`JSON-LD Schema Errors: ${jsonLdErrors}`);
console.log(`Overlong Titles (>60): ${overlongTitles}`);
console.log(`Overlong Descriptions (>160): ${overlongDescriptions}`);
console.log(`Missing OG Images: ${missingOgImages}`);

