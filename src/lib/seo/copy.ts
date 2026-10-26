/**
 * Programmatic copy generators for tool pages. Every paragraph here must
 * be **variable-injected** so each combo yields unique output — otherwise
 * scripts/validate-content.mjs fails the build.
 *
 * If you edit here, mirror the change in scripts/validate-content.mjs.
 */

import type { ComboForMeta } from './meta';

const fmt = (s: string) => s.toUpperCase();

export interface FAQItem {
  q: string;
  a: string;
}

export function buildIntro(combo: ComboForMeta): string {
  const from = fmt(combo.from);
  const to = fmt(combo.to);
  const target = combo.sizeKb ? `${combo.sizeKb}KB` : null;

  const p1 = `Need to convert ${from} files to ${to}? PixelKit does it in one click, right in your browser. ${
    target
      ? `It runs a fast binary-search compression loop to land your file under ${target} without visible quality loss — the same technique professional photo tools use, but without asking you to sign up or upload anything.`
      : `The converter reads your ${from} file locally, renders it to a canvas, and re-encodes it as ${to} using the browser's own image pipeline.`
  } Because nothing is sent to a server, there is no upload wait, no file-size limit from a backend, and no privacy risk. Your photos, ID scans and documents stay on your device the entire time.`;

  const p2 = `The tool works offline after the first page load, on mobile and desktop, and produces standard ${to} files accepted by portals, email clients and design apps. ${
    target
      ? `Just set the target to ${target}, drop your ${from} file, and download the result. If the first pass lands slightly above ${target}, PixelKit automatically tries again with a tighter quality curve — so you always get the smallest file that still meets the limit.`
      : `Drag a ${from} file, pick ${to} as the output, and download the result. Multiple files can be converted in one batch, and results appear side by side for easy comparison.`
  }`;

  const p3 = `No account, no watermark, no email gate. Just the file you need, at the size you need it.`;

  return [p1, p2, p3].join('\n\n');
}

export function buildFaqs(combo: ComboForMeta): FAQItem[] {
  const from = fmt(combo.from);
  const to = fmt(combo.to);
  const bank: FAQItem[] = [
    {
      q: `Is this ${from} to ${to} converter really free?`,
      a: `Yes. PixelKit is free to use with no watermarks, no file limits, and no account. The tool runs entirely in your browser, so there is no server cost that would justify a paywall.`,
    },
    {
      q: `Are my ${from} files uploaded anywhere?`,
      a: `No. The conversion happens locally using your browser's canvas and Web Worker APIs. Files never leave your device, and nothing is stored after you close the tab.`,
    },
    {
      q: `What is the maximum ${from} file size?`,
      a: `There is no server-side limit because there is no server. Very large files may be limited only by your device's available memory — usually several hundred MB on desktop and tens of MB on mobile.`,
    },
  ];

  if (combo.sizeKb) {
    bank.unshift({
      q: `How do I compress ${from} to under ${combo.sizeKb}KB?`,
      a: `Drop your ${from} file into the tool above, choose ${to} as the output, and set the target to ${combo.sizeKb}KB. PixelKit automatically adjusts quality to land at or below the target — no manual slider work required.`,
    });
  }

  return bank;
}