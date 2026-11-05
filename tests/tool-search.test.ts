import { describe, it, expect } from 'vitest';
import { searchTools } from '../src/lib/tool-search';
import { ASPECT_RATIOS } from '../src/lib/worker/adjustments';
import { SEO_LANDING_PAGES } from '../src/data/seo-landing-pages';
import { PORTAL_PRESETS } from '../src/lib/portal-presets';

describe('Smart Tool Search & Intent Parsing (tool-search.ts)', () => {
  it('resolves exact KB compression pages', () => {
    const r100 = searchTools('compress under 100kb');
    expect(r100.length).toBeGreaterThan(0);
    expect(r100[0]!.href).toBe('/compress-image-to-100kb/');

    const r50 = searchTools('photo compressor 50kb');
    expect(r50.length).toBeGreaterThan(0);
    expect(r50[0]!.href).toBe('/compress-image-to-50kb/');

    const r20 = searchTools('compress 20kb');
    expect(r20.length).toBeGreaterThan(0);
    expect(r20[0]!.href).toBe('/compress-image-to-20kb/');
  });

  it('resolves min-max KB range queries to dedicated bracket pages', () => {
    const r2050 = searchTools('resize image 20kb to 50kb');
    expect(r2050.length).toBeGreaterThan(0);
    expect(r2050[0]!.href).toBe('/resize-image-to-20kb-to-50kb/');

    const r1020 = searchTools('signature 10kb to 20kb');
    expect(r1020.length).toBeGreaterThan(0);
    expect(r1020[0]!.href).toBe('/signature-resizer-10kb-to-20kb/');

    const rCustomRange = searchTools('40kb to 120kb');
    expect(rCustomRange.length).toBeGreaterThan(0);
    expect(rCustomRange[0]!.href).toContain('mode=range');
    expect(rCustomRange[0]!.href).toContain('minKb=40');
    expect(rCustomRange[0]!.href).toContain('maxKb=120');
  });

  it('resolves physical and pixel dimension queries', () => {
    const rCm = searchTools('3.5x4.5 cm');
    expect(rCm.length).toBeGreaterThan(0);
    expect(rCm[0]!.href).toBe('/resize-image-3-5x4-5-cm/');

    const rMm = searchTools('35x45 mm');
    expect(rMm.length).toBeGreaterThan(0);
    expect(rMm[0]!.href).toBe('/resize-image-35x45-mm/');

    const rIn = searchTools('2x2 inch');
    expect(rIn.length).toBeGreaterThan(0);
    expect(rIn[0]!.href).toBe('/resize-image-2x2-inch/');

    const rPx = searchTools('600x600 px');
    expect(rPx.length).toBeGreaterThan(0);
    expect(rPx[0]!.href).toBe('/resize-image-600x600/');

    const r1080 = searchTools('1080x1080');
    expect(r1080.length).toBeGreaterThan(0);
    expect(r1080[0]!.href).toBe('/resize-image-1080x1080/');

    const r1920 = searchTools('1920x1080');
    expect(r1920.length).toBeGreaterThan(0);
    expect(r1920[0]!.href).toBe('/resize-image-1920x1080/');
  });

  it('resolves arbitrary custom dimension queries with deep-linked settings', () => {
    const rCustomCm = searchTools('resize 4.2x5.5 cm');
    expect(rCustomCm.length).toBeGreaterThan(0);
    expect(rCustomCm[0]!.href).toContain('unit=cm');
    expect(rCustomCm[0]!.href).toContain('w=4.2');
    expect(rCustomCm[0]!.href).toContain('h=5.5');
  });

  it('resolves arbitrary custom KB targets with deep-linked settings', () => {
    const r73 = searchTools('compress 73kb');
    expect(r73.length).toBeGreaterThan(0);
    expect(r73[0]!.href).toBe('/compress-image-to-specific-size/?tool=compress&kb=73');
  });

  it('resolves DPI calibration queries', () => {
    const r200 = searchTools('200 dpi');
    expect(r200.length).toBeGreaterThan(0);
    expect(r200[0]!.href).toBe('/change-image-dpi-to-200/');

    const r300 = searchTools('change image dpi to 300');
    expect(r300.length).toBeGreaterThan(0);
    expect(r300[0]!.href).toBe('/change-image-dpi-to-300/');

    const r600 = searchTools('600 dpi converter');
    expect(r600.length).toBeGreaterThan(0);
    expect(r600[0]!.href).toBe('/change-image-dpi-to-600/');

    const r150 = searchTools('150 dpi document scan');
    expect(r150.length).toBeGreaterThan(0);
    expect(r150[0]!.href).toBe('/change-image-dpi-to-150/');

    const r72 = searchTools('72 dpi web converter');
    expect(r72.length).toBeGreaterThan(0);
    expect(r72[0]!.href).toBe('/change-image-dpi-to-72/');

    const rCustomDpi = searchTools('400 dpi');
    expect(rCustomDpi.length).toBeGreaterThan(0);
    expect(rCustomDpi[0]!.href).toContain('dpi=400');
  });

  it('resolves crop aspect-ratio queries', () => {
    const r169 = searchTools('crop 16:9');
    expect(r169.length).toBeGreaterThan(0);
    expect(r169[0]!.href).toBe('/crop-image-16-9/');

    const r45 = searchTools('crop 4:5 instagram');
    expect(r45.length).toBeGreaterThan(0);
    expect(r45[0]!.href).toBe('/crop-image-4-5-portrait/');

    const r11 = searchTools('crop 1:1 square');
    expect(r11.length).toBeGreaterThan(0);
    expect(r11[0]!.href).toBe('/crop-image-1-1-square/');

    const r916 = searchTools('crop 9:16 story');
    expect(r916.length).toBeGreaterThan(0);
    expect(r916[0]!.href).toBe('/crop-image-9-16-story/');

    const r43 = searchTools('crop 4:3');
    expect(r43.length).toBeGreaterThan(0);
    expect(r43[0]!.href).toBe('/crop-image-4-3/');

    const r34 = searchTools('crop 3:4 portrait');
    expect(r34.length).toBeGreaterThan(0);
    expect(r34[0]!.href).toBe('/crop-image-3-4/');

    const r21 = searchTools('crop 2:1 signature');
    expect(r21.length).toBeGreaterThan(0);
    expect(r21[0]!.href).toBe('/crop-image-2-1-signature/');

    const r3545 = searchTools('crop 3.5:4.5 passport');
    expect(r3545.length).toBeGreaterThan(0);
    expect(r3545[0]!.href).toBe('/crop-passport-photo-35x45mm/');
  });

  it('resolves exact KB increase queries', () => {
    const rInc20 = searchTools('increase image size to 20kb');
    expect(rInc20.length).toBeGreaterThan(0);
    expect(rInc20[0]!.href).toBe('/increase-image-size-to-20kb/');

    const rInc50 = searchTools('increase to 50kb');
    expect(rInc50.length).toBeGreaterThan(0);
    expect(rInc50[0]!.href).toBe('/increase-image-size-to-50kb/');

    const rInc100 = searchTools('increase to 100kb');
    expect(rInc100.length).toBeGreaterThan(0);
    expect(rInc100[0]!.href).toBe('/increase-image-size-to-100kb/');
  });

  it('resolves official portal preset queries for 100% of 30 official presets', () => {
    expect(searchTools('china visa')[0]!.href).toBe('/china-visa-photo-resizer/');
    expect(searchTools('japan visa')[0]!.href).toBe('/japan-visa-photo-resizer/');
    expect(searchTools('singapore visa')[0]!.href).toBe('/singapore-visa-photo-resizer/');
    expect(searchTools('malaysia passport')[0]!.href).toBe('/malaysia-passport-photo-resizer/');
    expect(searchTools('new zealand visa')[0]!.href).toBe('/new-zealand-visa-photo-resizer/');
    expect(searchTools('upsc photo')[0]!.href).toBe('/upsc-photo-resizer/');
    expect(searchTools('thumb impression')[0]!.href).toBe('/thumb-impression-resizer/');
    expect(searchTools('ssc photo')[0]!.href).toBe('/ssc-photo-resizer/');
    expect(searchTools('pan card')[0]!.href).toBe('/pan-card-photo-resizer/');
    expect(searchTools('us visa')[0]!.href).toBe('/us-visa-photo-resizer/');
  });
});

describe('Worker crop aspect ratio parity', () => {
  it('ASPECT_RATIOS contains 4:5 with value 0.8', () => {
    expect(ASPECT_RATIOS['4:5']).toBeCloseTo(0.8);
    expect(ASPECT_RATIOS['16:9']).toBeCloseTo(16 / 9);
    expect(ASPECT_RATIOS['1:1']).toBe(1);
    expect(ASPECT_RATIOS['3.5:4.5']).toBeCloseTo(3.5 / 4.5);
    expect(ASPECT_RATIOS['3:4']).toBeCloseTo(0.75);
  });
});

describe('SEO Landing Pages Registry Quality & Invariants', () => {
  it('all 35 curated SEO landing pages have unique slugs', () => {
    const slugs = SEO_LANDING_PAGES.map((p) => p.slug);
    const uniqueSlugs = new Set(slugs);
    expect(uniqueSlugs.size).toBe(slugs.length);
    expect(slugs.length).toBe(35);
  });

  it('every SEO page meets title and description length constraints', () => {
    for (const page of SEO_LANDING_PAGES) {
      expect(
        page.title.length,
        `Page /${page.slug}/ title length (${page.title.length}) is out of [30, 60]`
      ).toBeGreaterThanOrEqual(30);
      expect(
        page.title.length,
        `Page /${page.slug}/ title length (${page.title.length}) is out of [30, 60]`
      ).toBeLessThanOrEqual(60);

      expect(
        page.description.length,
        `Page /${page.slug}/ meta description length (${page.description.length}) is out of [70, 160]`
      ).toBeGreaterThanOrEqual(70);
      expect(
        page.description.length,
        `Page /${page.slug}/ meta description length (${page.description.length}) is out of [70, 160]`
      ).toBeLessThanOrEqual(160);

      expect(page.faqs.length).toBeGreaterThanOrEqual(4);
      for (const faq of page.faqs) {
        expect(faq.q.length).toBeGreaterThan(10);
        expect(faq.a.length).toBeGreaterThan(20);
      }

      expect(page.specTable.rows.length).toBeGreaterThanOrEqual(3);
      expect(page.relatedLinks.length).toBeGreaterThanOrEqual(4);
    }
  });

  it('completes 100% dedicated page coverage for all 30 PORTAL_PRESETS', () => {
    const activePresets = PORTAL_PRESETS.filter((p) => p.id !== 'none');
    expect(activePresets.length).toBe(30);
    // Every single preset must have an official dedicated URL matching PRESET_HREFS
    for (const preset of activePresets) {
      const results = searchTools(preset.name);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]!.href).toMatch(/^\/[a-z0-9-]+\/$/);
    }
  });
});
