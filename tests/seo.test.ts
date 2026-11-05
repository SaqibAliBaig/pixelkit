/**
 * seo.test.ts — anti-thin-content + structured-data guarantees.
 *
 * Mirrors scripts/validate-content.mjs but runs in vitest so every CI
 * push verifies: unique titles, unique descriptions, intro word count,
 * unique intro hashes, and JSON-LD correctness.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { buildMeta } from '../src/lib/seo/meta';
import { SITE } from '../src/lib/constants';
import { PORTAL_PRESETS } from '../src/lib/portal-presets';
import { buildIntro, buildFaqs, getTechnicalReference } from '../src/lib/seo/copy';
import {
  buildBreadcrumbJsonLd,
  buildFaqJsonLd,
  buildSoftwareApplicationJsonLd,
  buildToolJsonLd,
  buildBlogPostingJsonLd,
  buildSiteSchemaGraph,
  buildConnectedGraph,
} from '../src/lib/seo/jsonld';

interface Combo {
  from: string;
  fromMime: string;
  to: string;
  toMime: string;
  sizeKb: number | null;
  kind: 'convert' | 'compress';
}

const combinationsPath = resolve(
  __dirname,
  '../src/data/combinations.json'
);
const combinationsFile = JSON.parse(
  readFileSync(combinationsPath, 'utf8')
) as { combos: Combo[] };

const combos = combinationsFile.combos;

describe('combinations data', () => {
  it('loads a non-empty matrix', () => {
    expect(combos.length).toBeGreaterThan(0);
  });

  it('every combo has from, to, kind', () => {
    for (const c of combos) {
      expect(typeof c.from).toBe('string');
      expect(c.from.length).toBeGreaterThan(0);
      expect(typeof c.to).toBe('string');
      expect(c.to.length).toBeGreaterThan(0);
      expect(['convert', 'compress']).toContain(c.kind);
    }
  });

  it('compress combos have a positive sizeKb', () => {
    for (const c of combos.filter((x) => x.kind === 'compress')) {
      expect(c.sizeKb).not.toBeNull();
      expect(c.sizeKb!).toBeGreaterThan(0);
    }
  });

  it('convert combos have sizeKb === null', () => {
    for (const c of combos.filter((x) => x.kind === 'convert')) {
      expect(c.sizeKb).toBeNull();
    }
  });

  it('avoids doorway bloat and unsupported output formats', () => {
    expect(combos.length).toBeLessThan(200);
    const supportedOutputs = new Set(['jpg', 'png', 'webp', 'avif', 'pdf', 'svg']);
    for (const c of combos) {
      expect(supportedOutputs.has(c.to)).toBe(true);
    }
  });
});

describe('meta uniqueness', () => {
  it('site default title and description obey Bing & Google length bounds (25–160 chars)', () => {
    expect(SITE.defaultTitle.length).toBeGreaterThanOrEqual(25);
    expect(SITE.defaultTitle.length).toBeLessThanOrEqual(70);
    expect(SITE.defaultDescription.length).toBeGreaterThanOrEqual(50);
    expect(SITE.defaultDescription.length).toBeLessThanOrEqual(160);
  });

  it('every title is between 30 and 50 chars (under 60 with site suffix)', () => {
    for (const c of combos) {
      const m = buildMeta(c);
      expect(m.title.length).toBeGreaterThanOrEqual(30);
      expect(m.title.length).toBeLessThanOrEqual(50);
    }
  });

  it('every description is between 70 and 160 chars', () => {
    for (const c of combos) {
      const m = buildMeta(c);
      expect(m.description.length).toBeGreaterThanOrEqual(70);
      expect(m.description.length).toBeLessThanOrEqual(160);
    }
  });

  it('all titles are unique', () => {
    const seen = new Map<string, Combo>();
    for (const c of combos) {
      const m = buildMeta(c);
      const prev = seen.get(m.title);
      expect(
        prev,
        `Duplicate title for ${c.from}-to-${c.to}-${c.sizeKb ?? 'x'}: ${m.title}`
      ).toBeUndefined();
      seen.set(m.title, c);
    }
  });

  it('all descriptions are unique', () => {
    const seen = new Map<string, Combo>();
    for (const c of combos) {
      const m = buildMeta(c);
      const prev = seen.get(m.description);
      expect(
        prev,
        `Duplicate description for ${c.from}-to-${c.to}-${c.sizeKb ?? 'x'}`
      ).toBeUndefined();
      seen.set(m.description, c);
    }
  });
});

describe('intro uniqueness + length', () => {
  it('every intro has at least 140 words', () => {
    for (const c of combos) {
      const intro = buildIntro(c);
      const words = intro.trim().split(/\s+/).length;
      expect(
        words,
        `Intro for ${c.from}-to-${c.to}-${c.sizeKb ?? 'x'} has only ${words} words`
      ).toBeGreaterThanOrEqual(140);
    }
  });

  it('all intros are unique (by SHA-256 hash)', () => {
    const seen = new Map<string, Combo>();
    for (const c of combos) {
      const intro = buildIntro(c);
      const hash = createHash('sha256').update(intro).digest('hex');
      const prev = seen.get(hash);
      expect(
        prev,
        `Duplicate intro hash for ${c.from}-to-${c.to}-${c.sizeKb ?? 'x'}`
      ).toBeUndefined();
      seen.set(hash, c);
    }
  });
});

describe('FAQs', () => {
  it('every combo has at least 2 FAQs', () => {
    for (const c of combos) {
      const faqs = buildFaqs(c);
      expect(faqs.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('every FAQ has a question and an answer', () => {
    for (const c of combos) {
      for (const f of buildFaqs(c)) {
        expect(f.q.length).toBeGreaterThan(5);
        expect(f.a.length).toBeGreaterThan(10);
      }
    }
  });

  it('compress combos include the target-specific first FAQ', () => {
    for (const c of combos.filter((x) => x.kind === 'compress')) {
      const faqs = buildFaqs(c);
      expect(faqs[0]!.q).toContain(`${c.sizeKb}KB`);
    }
  });
});

describe('JSON-LD builders', () => {
  it('breadcrumb contains @context and @type', () => {
    const ld = buildBreadcrumbJsonLd([
      { name: 'Home', url: 'https://example.com/' },
      { name: 'Convert' },
    ]);
    expect(ld['@context']).toBe('https://schema.org');
    expect(ld['@type']).toBe('BreadcrumbList');
    expect(Array.isArray(ld.itemListElement)).toBe(true);
  });

  it('FAQPage has mainEntity array of Questions', () => {
    const ld = buildFaqJsonLd([
      { q: 'Q1?', a: 'A1.' },
      { q: 'Q2?', a: 'A2.' },
    ]);
    expect(ld['@type']).toBe('FAQPage');
    const me = ld.mainEntity as unknown[];
    expect(me.length).toBe(2);
  });

  it('SoftwareApplication has a free offer and omits unverified aggregateRating to protect against Google spam penalties', () => {
    const ld = buildSoftwareApplicationJsonLd({
      name: 'X',
      description: 'Y',
      url: 'https://example.com/',
    });
    const offers = ld.offers as Record<string, unknown>;
    expect(offers['@type']).toBe('Offer');
    expect(offers.price).toBe('0');
    // Ensure no unverified aggregateRating is emitted by default
    expect(ld.aggregateRating).toBeUndefined();

    // Verify rating is only added when authentic reviews are provided
    const ldWithRating = buildSoftwareApplicationJsonLd({
      name: 'X',
      description: 'Y',
      url: 'https://example.com/',
      rating: { ratingValue: '4.9', reviewCount: '128' },
    });
    const rating = ldWithRating.aggregateRating as Record<string, unknown>;
    expect(rating['@type']).toBe('AggregateRating');
    expect(rating.ratingValue).toBe('4.9');
  });

  it('buildToolJsonLd composes SoftwareApplication, FAQPage, and BreadcrumbList without deprecated HowTo', () => {
    const arr = buildToolJsonLd({
      combo: { from: 'heic', to: 'jpg', sizeKb: 50 },
      title: 'T',
      description: 'D',
      faqs: [{ q: 'Q?', a: 'A.' }],
      url: 'https://example.com/heic-to-jpg-under-50kb',
      breadcrumbs: [{ name: 'Home', url: 'https://example.com/' }],
    });
    expect(arr.length).toBe(3);
    expect(arr[0]!['@type']).toEqual(['SoftwareApplication', 'WebApplication']);
    expect(arr[1]!['@type']).toBe('FAQPage');
    expect(arr[2]!['@type']).toBe('BreadcrumbList');



  });

  it('BlogPosting has headline and dates', () => {
    const ld = buildBlogPostingJsonLd({
      title: 'Hello',
      description: 'World',
      url: 'https://example.com/blog/hello',
      publishedAt: new Date('2026-01-01'),
      author: 'PixelKit',
    });
    expect(ld['@type']).toBe('BlogPosting');
    expect(ld.headline).toBe('Hello');
    expect(typeof ld.datePublished).toBe('string');
  });

  it('buildSiteSchemaGraph consolidates Organization, WebSite, and WebApplication', () => {
    const graph = buildSiteSchemaGraph() as { '@context': string; '@graph': Record<string, unknown>[] };
    expect(graph['@context']).toBe('https://schema.org');
    expect(Array.isArray(graph['@graph'])).toBe(true);
    expect(graph['@graph'].length).toBe(3);

    const org = graph['@graph'].find((item) => item['@type'] === 'Organization') as Record<string, unknown>;
    expect(org).toBeDefined();
    expect((org.founder as Record<string, unknown>).name).toBe('Saqib Ali Baig');

    const app = graph['@graph'].find((item) => item['@type'] === 'WebApplication') as Record<string, unknown>;
    expect(app).toBeDefined();
    expect(app.name).toBe('PixelKit Image Studio');
    expect(app.operatingSystem).toBe('Any (Web Browser)');
  });

  it('buildConnectedGraph links WebPage to WebSite, Organization, Breadcrumb, and SoftwareApplication via @id', () => {
    const canonicalUrl = 'https://pixelkit.app/compress-image-to-50kb/';
    const result = buildConnectedGraph({
      canonicalUrl,
      title: 'Compress Image to 50KB Online Free',
      description: 'Compress image under 50KB privately.',
      items: [
        buildSoftwareApplicationJsonLd({
          name: 'Compress Image to 50KB',
          description: 'Compress image under 50KB.',
          url: canonicalUrl,
        }),
        buildBreadcrumbJsonLd([
          { label: 'Home', href: '/' },
          { label: '50KB' },
        ]),
        {
          '@type': 'HowTo',
          name: 'Deprecated step',
        },
      ],
    }) as { '@context': string; '@graph': Record<string, unknown>[] };

    expect(result['@context']).toBe('https://schema.org');
    expect(Array.isArray(result['@graph'])).toBe(true);

    const webpage = result['@graph'].find((item) => item['@type'] === 'WebPage') as Record<string, unknown>;
    expect(webpage).toBeDefined();
    expect(webpage['@id']).toBe('https://pixelkit.app/compress-image-to-50kb/#webpage');
    expect(webpage.isPartOf).toEqual({ '@id': 'https://pixelkit.app/#website' });
    expect(webpage.publisher).toEqual({ '@id': 'https://pixelkit.app/#organization' });
    expect(webpage.mainEntity).toEqual({ '@id': 'https://pixelkit.app/compress-image-to-50kb/#app' });
    expect(webpage.breadcrumb).toEqual({ '@id': 'https://pixelkit.app/compress-image-to-50kb/#breadcrumb' });

    // Ensure deprecated HowTo is purged
    const howTo = result['@graph'].find((item) => String(item['@type']).includes('HowTo'));
    expect(howTo).toBeUndefined();
  });

  it('buildConnectedGraph connects CollectionPage and Blog entities via mainEntity @id', () => {
    const convertGraph = buildConnectedGraph({
      canonicalUrl: 'https://pixelkit.app/convert/',
      title: 'Convert Hub',
      description: 'Convert formats.',
      items: [{ '@type': 'CollectionPage', name: 'Convert Hub' }],
    }) as { '@graph': Record<string, unknown>[] };
    const convertWebPage = convertGraph['@graph'].find((item) => item['@type'] === 'WebPage') as Record<string, unknown>;
    expect(convertWebPage.mainEntity).toEqual({ '@id': 'https://pixelkit.app/convert/#collection' });

    const blogGraph = buildConnectedGraph({
      canonicalUrl: 'https://pixelkit.app/blog/',
      title: 'Blog Hub',
      description: 'Guides.',
      items: [{ '@type': 'Blog', name: 'Blog' }],
    }) as { '@graph': Record<string, unknown>[] };
    const blogWebPage = blogGraph['@graph'].find((item) => item['@type'] === 'WebPage') as Record<string, unknown>;
    expect(blogWebPage.mainEntity).toEqual({ '@id': 'https://pixelkit.app/blog/#blog' });
  });
});

describe('technical reference data', () => {
  it('every combo generates valid comparison rows and engine note', () => {
    for (const c of combos) {
      const ref = getTechnicalReference(c);
      expect(ref.engineNote.length).toBeGreaterThan(20);
      expect(ref.comparisonRows.length).toBe(5);
      for (const row of ref.comparisonRows) {
        expect(row.property.length).toBeGreaterThan(0);
        expect(row.sourceValue.length).toBeGreaterThan(0);
        expect(row.targetValue.length).toBeGreaterThan(0);
      }
    }
  });
});

describe('IndexNow and LLM automated synchronization', () => {
  it('public IndexNow key verification file exists and matches key', () => {
    const key = 'e2a48f93b1c04d8e95712fa6b301c89e';
    const keyPath = resolve('public', `${key}.txt`);
    expect(existsSync(keyPath)).toBe(true);
    const content = readFileSync(keyPath, 'utf8').trim();
    expect(content).toBe(key);
  });

  it('public/llms.txt contains privacy guarantees and official portal presets', () => {
    const llmsPath = resolve('public/llms.txt');
    expect(existsSync(llmsPath)).toBe(true);
    const text = readFileSync(llmsPath, 'utf8');
    expect(text).toContain('# PixelKit');
    expect(text).toContain('Zero Server Uploads');
    expect(text).toContain('Official Government & Consular Exam Presets');
    expect(text).toContain('https://pixelkit.app/ssc-photo-resizer/');
    expect(text).toContain('https://pixelkit.app/signature-resizer/');
  });

  it('public/llms-full.txt contains master requirements matrix and query instructions', () => {
    const fullPath = resolve('public/llms-full.txt');
    expect(existsSync(fullPath)).toBe(true);
    const text = readFileSync(fullPath, 'utf8');
    expect(text).toContain('Official Portal Requirements Master Matrix');
    expect(text).toContain('Step-by-Step Instructions for AI Agent Queries');
    expect(text).toContain('Codec & Processing Engine Specifications');
  });

  it('every preset in PORTAL_PRESETS has an explicit mapping in generate-llms.mjs and appears in llms.txt', () => {
    const llmsScript = readFileSync(resolve('scripts/generate-llms.mjs'), 'utf8');
    const llmsTxt = readFileSync(resolve('public/llms.txt'), 'utf8');
    for (const preset of PORTAL_PRESETS.filter((p) => p.id !== 'none')) {
      expect(llmsScript, `Missing PRESET_URL_MAP key '${preset.id}' in generate-llms.mjs`).toContain(`'${preset.id}':`);
      expect(llmsTxt, `Missing preset '${preset.name}' in public/llms.txt`).toContain(`[${preset.name}]`);
    }
  });

  it('every static .astro page in src/pages has a matching OG image in public/og/', () => {
    const pageEntries = readdirSync(resolve('src/pages'), { withFileTypes: true });
    for (const entry of pageEntries) {
      if (!entry.isFile() || !entry.name.endsWith('.astro')) continue;
      if (entry.name === 'index.astro' || entry.name.includes('[')) continue;
      const slug = entry.name.replace(/\.astro$/, '');
      const ogFile = resolve('public/og', `${slug}.png`);
      expect(existsSync(ogFile), `Missing OG image for /${slug}/ at public/og/${slug}.png`).toBe(true);
    }
  });
});
