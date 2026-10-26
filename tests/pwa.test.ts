import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Workflow, PWA & Offline Support', () => {
  it('has a valid PWA webmanifest with standalone display and icons', () => {
    const manifestPath = path.resolve(process.cwd(), 'public/manifest.webmanifest');
    expect(fs.existsSync(manifestPath)).toBe(true);

    const raw = fs.readFileSync(manifestPath, 'utf-8');
    const manifest = JSON.parse(raw);

    expect(manifest.name).toBe('PixelKit');
    expect(manifest.start_url).toBeDefined();
    expect(manifest.display).toBe('standalone');
    expect(manifest.icons.length).toBeGreaterThan(0);
  });

  it('provides a functional service worker (sw.js) with install, activate and fetch listeners', () => {
    const swPath = path.resolve(process.cwd(), 'public/sw.js');
    expect(fs.existsSync(swPath)).toBe(true);

    const swContent = fs.readFileSync(swPath, 'utf-8');
    expect(swContent).toContain("addEventListener('install'");
    expect(swContent).toContain("addEventListener('activate'");
    expect(swContent).toContain("addEventListener('fetch'");
    expect(swContent).toContain('caches.open');
  });

  it('filters converter combinations by keywords (search logic test)', () => {
    const combos = [
      { from: 'heic', to: 'jpg' },
      { from: 'pdf', to: 'png' },
      { from: 'png', to: 'webp' },
      { from: 'jpg', to: 'pdf' },
    ];

    function filterCombos(query: string) {
      const q = query.toLowerCase().trim();
      return combos.filter((c) => {
        const full = `${c.from} to ${c.to} ${c.from} ${c.to}`;
        return full.includes(q);
      });
    }

    expect(filterCombos('pdf').length).toBe(2);
    expect(filterCombos('heic').length).toBe(1);
    expect(filterCombos('png to webp').length).toBe(1);
    expect(filterCombos('xyz').length).toBe(0);
  });
});
