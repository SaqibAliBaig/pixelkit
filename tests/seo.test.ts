/**
 * seo.test.ts — anti-thin-content + structured-data guarantees.
 *
 * Mirrors scripts/validate-content.mjs but runs in vitest so every CI
 * push verifies: unique titles, unique descriptions, intro word count,
 * unique intro hashes, and JSON-LD correctness.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { buildMeta } from '../src/lib/seo/meta';
import { SITE } from '../src/lib/constants';
import { buildIntro, buildFaqs } from '../src/lib/seo/copy';
import {
  buildBreadcrumbJsonLd,
  buildFaqJsonLd,
  buildSoftwareApplicationJsonLd,
  buildToolJsonLd,
  buildBlogPostingJsonLd,
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

  it('every title is between 30 and 70 chars', () => {
    for (const c of combos) {
      const m = buildMeta(c);
      expect(m.title.length).toBeGreaterThanOrEqual(30);
      expect(m.title.length).toBeLessThanOrEqual(70);
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

  it('SoftwareApplication has a free offer and no fake aggregateRating', () => {
    const ld = buildSoftwareApplicationJsonLd({
      name: 'X',
      description: 'Y',
      url: 'https://example.com/',
    });
    const offers = ld.offers as Record<string, unknown>;
    expect(offers['@type']).toBe('Offer');
    expect(offers.price).toBe('0');
    expect(ld.aggregateRating).toBeUndefined();
  });

  it('buildToolJsonLd composes 4 JSON-LD objects including HowTo', () => {
    const arr = buildToolJsonLd({
      combo: { from: 'heic', to: 'jpg', sizeKb: 50 },
      title: 'T',
      description: 'D',
      faqs: [{ q: 'Q?', a: 'A.' }],
      url: 'https://example.com/heic-to-jpg-under-50kb',
      breadcrumbs: [{ name: 'Home', url: 'https://example.com/' }],
    });
    expect(arr.length).toBe(4);
    expect(arr[0]!['@type']).toBe('SoftwareApplication');
    expect(arr[1]!['@type']).toBe('FAQPage');
    expect(arr[2]!['@type']).toBe('BreadcrumbList');
    expect(arr[3]!['@type']).toBe('HowTo');
    const steps = (arr[3]! as Record<string, unknown>).step as unknown[];
    expect(steps.length).toBe(3);
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
});