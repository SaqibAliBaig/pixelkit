import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import fs from 'node:fs';
import path from 'node:path';

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

        // Accurate lastmod: accurate article date or build timestamp
        const blogMatch = item.url.match(/\/blog\/([^/]+)\/$/);
        if (blogMatch && blogDates.has(blogMatch[1])) {
          item.lastmod = blogDates.get(blogMatch[1]);
        } else {
          item.lastmod = new Date();
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
    prefetchAll: true,
    defaultStrategy: 'viewport',
  },
});
