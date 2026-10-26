/**
 * Meta generators for programmatic SEO pages. Produces <title>, meta
 * description, and Open Graph descriptions that are unique per combo.
 *
 * Used at build time by dynamic routes. The scripts/validate-content.mjs
 * validator uses a mirrored copy of these — keep in sync.
 */

export interface ComboForMeta {
  from: string;
  to: string;
  sizeKb: number | null;
}

export interface MetaResult {
  title: string;
  description: string;
  ogTitle: string;
  ogDescription: string;
}

const fmt = (s: string) => s.toUpperCase();

export function buildMeta(combo: ComboForMeta): MetaResult {
  const from = fmt(combo.from);
  const to = fmt(combo.to);

  const title = combo.sizeKb
    ? `Convert ${from} to ${to} Under ${combo.sizeKb}KB — Free, Private, Instant`
    : `Convert ${from} to ${to} — Free, Private, Instant`;

  const description = combo.sizeKb
    ? `Convert ${from} to ${to} and hit exactly ${combo.sizeKb}KB — no upload, no signup, 100% in your browser. Works for passport portals, exam forms and email limits.`
    : `Convert ${from} to ${to} instantly in your browser. Private by design — your files never leave your device. Free, no signup.`;

  return {
    title,
    description,
    ogTitle: title,
    ogDescription: description,
  };
}