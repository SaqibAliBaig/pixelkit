import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

const SITE = 'https://pixelkit.app';

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
      filter: (page) => !page.includes('/404'),
      serialize(item) {
        if (!item.url.endsWith('/') && !item.url.includes('.')) {
          item.url = `${item.url}/`;
        }
        const url = item.url.replace(/\/$/, '');

        // Homepage
        if (url === SITE) {
          item.priority = 1.0;
          item.changefreq = 'weekly';
        }
        // Core pillar hubs (Compress, Convert, Resize, Crop, Passport Workflow)
        else if (
          url === `${SITE}/compress-image` ||
          url === `${SITE}/convert` ||
          url === `${SITE}/resize-image` ||
          url === `${SITE}/crop-image` ||
          url === `${SITE}/passport-photo-resizer`
        ) {
          item.priority = 0.95;
          item.changefreq = 'weekly';
        }
        // High-volume standalone compressors & flagship conversions
        else if (
          url.includes('/compress-image-to-') ||
          url.endsWith('/compress-jpg') ||
          url.endsWith('/compress-png') ||
          url.endsWith('/compress-webp') ||
          url.endsWith('/compress-pdf') ||
          url.endsWith('/heic-to-jpg') ||
          url.endsWith('/png-to-jpg') ||
          url.endsWith('/jpg-to-pdf') ||
          url.endsWith('/pdf-to-jpg') ||
          url.endsWith('/svg-to-png') ||
          url.endsWith('/jpg-to-webp') ||
          url.endsWith('/png-to-webp')
        ) {
          item.priority = 0.9;
          item.changefreq = 'weekly';
        }
        // Blog hub & articles
        else if (url === `${SITE}/blog`) {
          item.priority = 0.85;
          item.changefreq = 'weekly';
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
        // Curated conversion & KB-targeted pages
        else {
          item.priority = 0.75;
          item.changefreq = 'monthly';
        }

        return item;
      },
    }),
  ],
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'viewport',
  },
});
