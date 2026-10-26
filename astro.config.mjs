import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

// NOTE: replace with your real production URL before launch.
const SITE = 'https://pixelkit.app';

export default defineConfig({
  site: SITE,
  output: 'static',
  trailingSlash: 'never',
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
      filter: (page) => !page.includes('/404'),
      serialize(item) {
        const url = item.url.replace(/\/$/, '');
        // Homepage
        if (url === SITE) {
          item.priority = 1.0;
          item.changefreq = 'daily';
        }
        // Conversion directory
        else if (url === `${SITE}/convert`) {
          item.priority = 0.9;
          item.changefreq = 'daily';
        }
        // High-volume popular tool combinations
        else if (
          url.endsWith('/heic-to-jpg') ||
          url.endsWith('/png-to-jpg') ||
          url.endsWith('/jpg-to-pdf') ||
          url.endsWith('/jpg-to-webp') ||
          url.endsWith('/png-to-webp')
        ) {
          item.priority = 0.9;
          item.changefreq = 'weekly';
        }
        // Blog pages
        else if (url === `${SITE}/blog`) {
          item.priority = 0.8;
          item.changefreq = 'daily';
        } else if (url.includes('/blog/')) {
          item.priority = 0.8;
          item.changefreq = 'monthly';
        }
        // Trust and legal pages (E-E-A-T)
        else if (
          url.endsWith('/about') ||
          url.endsWith('/privacy') ||
          url.endsWith('/terms')
        ) {
          item.priority = 0.5;
          item.changefreq = 'monthly';
        }
        // All other tool and size-targeted pages
        else {
          item.priority = 0.75;
          item.changefreq = 'weekly';
        }

        item.lastmod = new Date();
        return item;
      },
    }),
  ],
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'viewport',
  },
});