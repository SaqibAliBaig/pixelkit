import fs from 'node:fs';
import path from 'node:path';

function getHtmlFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      results = results.concat(getHtmlFiles(full));
    } else if (file.endsWith('.html')) {
      results.push(full);
    }
  }
  return results;
}

const htmlFiles = getHtmlFiles('dist');
console.log('Total HTML pages in dist:', htmlFiles.length);

const issues = [];
const seenCanonicalUrls = new Map();
const badLinks = new Set();
const hierarchyIssues = [];

for (const file of htmlFiles) {
  const relPath = path.relative('dist', file).replace(/\\/g, '/');
  const html = fs.readFileSync(file, 'utf8');

  // 1. Title
  const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
  if (!titleMatch) {
    issues.push({ file: relPath, type: 'MISSING_TITLE' });
  } else {
    const title = titleMatch[1];
    if (title.length < 25 || title.length > 70) {
      issues.push({ file: relPath, type: 'TITLE_LENGTH', detail: `${title.length} chars: "${title}"` });
    }
  }

  // 2. Meta description
  const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]*)"/i) ||
                    html.match(/<meta\s+content="([^"]*)"\s+name="description"/i);
  if (!descMatch) {
    issues.push({ file: relPath, type: 'MISSING_DESCRIPTION' });
  } else {
    const desc = descMatch[1];
    if (desc.length < 50 || desc.length > 180) {
      issues.push({ file: relPath, type: 'DESC_LENGTH', detail: `${desc.length} chars: "${desc}"` });
    }
  }

  // 3. Canonical
  const canonMatch = html.match(/<link\s+rel="canonical"\s+href="([^"]*)"/i) ||
                     html.match(/<link\s+href="([^"]*)"\s+rel="canonical"/i);
  const is404 = relPath === '404.html';
  const isNoIndex = html.includes('content="noindex');

  if (!canonMatch && !is404 && !isNoIndex) {
    issues.push({ file: relPath, type: 'MISSING_CANONICAL' });
  } else if (canonMatch) {
    const canon = canonMatch[1];
    if (!canon.startsWith('https://pixelkit.app/')) {
      issues.push({ file: relPath, type: 'INVALID_CANONICAL_HOST', detail: canon });
    }
    if (!canon.endsWith('/') && !canon.includes('.')) {
      issues.push({ file: relPath, type: 'CANONICAL_TRAILING_SLASH', detail: canon });
    }
    if (seenCanonicalUrls.has(canon)) {
      issues.push({ file: relPath, type: 'DUPLICATE_CANONICAL', detail: `${canon} also in ${seenCanonicalUrls.get(canon)}` });
    } else {
      seenCanonicalUrls.set(canon, relPath);
    }
  }

  // 4. OpenGraph tags
  const ogTitle = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]*)"/i);
  const ogDesc = html.match(/<meta[^>]*property="og:description"[^>]*content="([^"]*)"/i);
  const ogUrl = html.match(/<meta[^>]*property="og:url"[^>]*content="([^"]*)"/i);
  const ogImage = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]*)"/i);

  if (!ogTitle) issues.push({ file: relPath, type: 'MISSING_OG_TITLE' });
  if (!ogDesc) issues.push({ file: relPath, type: 'MISSING_OG_DESC' });
  if (!ogUrl && !is404 && !isNoIndex) issues.push({ file: relPath, type: 'MISSING_OG_URL' });
  if (!ogImage) issues.push({ file: relPath, type: 'MISSING_OG_IMAGE' });

  // 5. Twitter Card tags
  const twCard = html.match(/<meta[^>]*name="twitter:card"[^>]*content="([^"]*)"/i);
  const twTitle = html.match(/<meta[^>]*name="twitter:title"[^>]*content="([^"]*)"/i);
  const twDesc = html.match(/<meta[^>]*name="twitter:description"[^>]*content="([^"]*)"/i);
  const twImage = html.match(/<meta[^>]*name="twitter:image"[^>]*content="([^"]*)"/i);

  if (!twCard) issues.push({ file: relPath, type: 'MISSING_TW_CARD' });
  if (!twTitle) issues.push({ file: relPath, type: 'MISSING_TW_TITLE' });
  if (!twDesc) issues.push({ file: relPath, type: 'MISSING_TW_DESC' });
  if (!twImage) issues.push({ file: relPath, type: 'MISSING_TW_IMAGE' });

  // 6. H1 check
  const h1Matches = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi) || [];
  if (h1Matches.length === 0) {
    issues.push({ file: relPath, type: 'MISSING_H1' });
  } else if (h1Matches.length > 1) {
    issues.push({ file: relPath, type: 'MULTIPLE_H1', detail: `${h1Matches.length} H1 tags` });
  }

  // Heading hierarchy check
  const headingMatches = [...html.matchAll(/<(h[1-6])\b[^>]*>([\s\S]*?)<\/\1>/gi)];
  let lastLevel = 0;
  for (const m of headingMatches) {
    const level = parseInt(m[1].charAt(1), 10);
    if (lastLevel > 0 && level > lastLevel + 1) {
      hierarchyIssues.push({
        file: relPath,
        from: 'h' + lastLevel,
        to: 'h' + level,
        text: m[2].trim().replace(/<[^>]*>/g, '').slice(0, 40)
      });
    }
    lastLevel = level;
  }

  // 7. JSON-LD scripts
  const jsonLdMatches = html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi);
  for (const m of jsonLdMatches) {
    try {
      const parsed = JSON.parse(m[1]);
      if (!parsed['@context']) {
        issues.push({ file: relPath, type: 'JSONLD_NO_CONTEXT' });
      }
    } catch (e) {
      issues.push({ file: relPath, type: 'JSONLD_INVALID_SYNTAX', detail: e.message });
    }
  }

  // 8. Collect all internal href links
  const hrefMatches = html.matchAll(/<a\b[^>]*href="([^"]*)"[^>]*>/gi);
  for (const m of hrefMatches) {
    const href = m[1];
    if (href.startsWith('/') && !href.startsWith('//') && !href.startsWith('/#') && !href.includes('.') && !href.endsWith('/')) {
      badLinks.add(href);
      issues.push({ file: relPath, type: 'LINK_MISSING_TRAILING_SLASH', detail: href });
    }
  }

  // 9. Images alt check
  const imgMatches = html.matchAll(/<img\b([^>]*)>/gi);
  for (const m of imgMatches) {
    const attrs = m[1];
    if (!attrs.includes('alt=')) {
      issues.push({ file: relPath, type: 'IMAGE_MISSING_ALT', detail: m[0] });
    }
  }
}

console.log('Audit completed. Found issues:', issues.length);
const grouped = {};
for (const iss of issues) {
  grouped[iss.type] = (grouped[iss.type] || 0) + 1;
}
console.log('Issues by type:', JSON.stringify(grouped, null, 2));
console.log('Unique internal links missing trailing slashes:', [...badLinks]);
console.log('Heading hierarchy issues count:', hierarchyIssues.length);
if (hierarchyIssues.length > 0) {
  console.log('Heading hierarchy issues sample:', JSON.stringify(hierarchyIssues.slice(0, 10), null, 2));
}
