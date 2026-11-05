import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const SITE = 'https://pixelkit.app';

// Index blog dates for accurate sitemap lastmod
const blogDates = new Map();
try {
  const blogDir = path.resolve('src/content/blog');
  if (fs.existsSync(blogDir)) {
    for (const file of fs.readdirSync(blogDir)) {
      if (file.endsWith('.md')) {
        const slug = file.replace(/\.md$/, '');
        const text = fs.readFileSync(path.join(blogDir, file), 'utf8');
        const updatedMatch = text.match(/updatedAt:\s*([^\n\r]+)/);
        const publishedMatch = text.match(/publishedAt:\s*([^\n\r]+)/);
        const dateStr = updatedMatch?.[1]?.trim() || publishedMatch?.[1]?.trim();
        if (dateStr) {
          blogDates.set(slug, new Date(dateStr));
        }
      }
    }
  }
} catch (_) {}

// Deterministic Git commit date cache for static & programmatic routes
const gitDateCache = new Map();
const getGitDate = (filePath) => {
  if (gitDateCache.has(filePath)) return gitDateCache.get(filePath);
  try {
    const stdout = execSync(`git log -1 --format=%cI -- "${filePath}"`, { encoding: 'utf8' });
    const d = stdout.trim() ? new Date(stdout.trim()) : new Date('2026-11-01');
    gitDateCache.set(filePath, d);
    return d;
  } catch {
    const fallback = new Date('2026-11-01');
    gitDateCache.set(filePath, fallback);
    return fallback;
  }
};

export default defineConfig({
  site: SITE,
  output: 'static',
  trailingSlash: 'always',
  compressHTML: true,
  build: {
    inlineStylesheets: 'auto',
    format: 'directory',
  },
  vite: {
    build: {
      cssCodeSplit: true,
      target: 'es2020',
    },
    worker: {
      format: 'es',
    },
    optimizeDeps: {
      include: ['upng-js', 'jspdf', 'pdfjs-dist', 'heic2any', 'utif', 'fflate'],
    },
  },
  integrations: [
    tailwind({ applyBaseStyles: false }),
    sitemap({
      filter: (page) =>
        !page.includes('/404') && !page.match(/\/(bmp|gif|tiff|avif)-to-/),
      serialize(item) {
        if (!item.url.endsWith('/') && !item.url.includes('.')) {
          item.url = `${item.url}/`;
        }

        // Accurate lastmod: accurate article date or source file git commit timestamp
        const blogMatch = item.url.match(/\/blog\/([^/]+)\/$/);
        if (item.url.match(/\/blog\/$/)) {
          if (blogDates.size > 0) {
            item.lastmod = new Date(Math.max(...Array.from(blogDates.values()).map((d) => d.getTime())));
          } else {
            item.lastmod = getGitDate('src/pages/blog/index.astro');
          }
        } else if (blogMatch && blogDates.has(blogMatch[1])) {
          item.lastmod = blogDates.get(blogMatch[1]);
        } else if (item.url.match(/\/[a-z]+-to-[a-z]+-under-\d+kb\/$/)) {
          item.lastmod = getGitDate('src/pages/[from]-to-[to]-under-[size]kb.astro');
        } else if (item.url.match(/\/[a-z]+-to-[a-z]+\/$/)) {
          item.lastmod = getGitDate('src/pages/[from]-to-[to].astro');
        } else if (item.url.match(/\/compress-image-to-\d+kb\/$/)) {
          item.lastmod = getGitDate('src/pages/compress-image-to-[size]kb.astro');
        } else if (item.url.match(/\/compress-jpg-to-\d+kb\/$/)) {
          item.lastmod = getGitDate('src/pages/compress-jpg-to-[size]kb.astro');
        } else if (item.url.match(/\/photo-to-pdf-\d+kb\/$/)) {
          item.lastmod = getGitDate('src/pages/photo-to-pdf-[size]kb.astro');
        } else if (item.url.match(/\/compress-image-to-\d+mb\/$/)) {
          item.lastmod = getGitDate('src/pages/compress-image-to-[size]mb.astro');
        } else if (item.url.match(/\/compress-[a-z]+\/$/)) {
          item.lastmod = getGitDate('src/pages/compress-[format].astro');
        } else {
          const slug = item.url.replace(/^https?:\/\/[^/]+\//, '').replace(/\/$/, '');
          const candidates = [
            `src/pages/${slug}.astro`,
            `src/pages/${slug}/index.astro`,
            `src/pages/${slug}.html`,
          ];
          let matchedDate = null;
          for (const cand of candidates) {
            if (fs.existsSync(path.resolve(cand))) {
              matchedDate = getGitDate(cand);
              break;
            }
          }
          item.lastmod = matchedDate || getGitDate('src/pages/[seoSlug].astro');
        }

        // Priority and changefreq are officially ignored by Google in 2024–2026.
        // Google exclusively utilizes accurate lastmod dates.
        delete item.priority;
        delete item.changefreq;

        return item;
      },
    }),
  ],
  prefetch: {
    prefetchAll: false,
    defaultStrategy: 'hover',
  },
});
