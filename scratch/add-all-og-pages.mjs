import fs from 'fs';

let content = fs.readFileSync('scripts/generate-og-images.mjs', 'utf8');

// Ensure mkdir is called for nested slugs like blog/...
content = content.replace(
  'await writeFile(resolve(OUT_DIR, `${item.slug}.png`), buf);',
  'const targetFile = resolve(OUT_DIR, `${item.slug}.png`);\n    await mkdir(dirname(targetFile), { recursive: true });\n    await writeFile(targetFile, buf);'
);

const staticPages = `  // Info & Blog Pages
  { slug: 'about', title: 'About PixelKit', badge: '100% PRIVATE & OPEN', subtitle: 'Zero-upload client-side image studio built by Saqib Ali Baig' },
  { slug: 'privacy', title: 'Privacy Guarantee', badge: 'ZERO SERVER UPLOADS', subtitle: 'All image processing occurs strictly in client device RAM' },
  { slug: 'terms', title: 'Terms of Service', badge: 'FREE WEB UTILITY', subtitle: 'Browser-based image and PDF transformation terms of use' },
  { slug: 'blog', title: 'PixelKit Engineering Blog', badge: 'TECHNICAL GUIDES', subtitle: 'Codec comparisons, DPI benchmarks & portal photo standards' },
  { slug: 'blog/compress-aadhaar-to-100kb-pdf', title: 'Compress Aadhaar to 100KB PDF', badge: 'UIDAI COMPLIANT', subtitle: 'Remove passwords and shrink Aadhaar PDF under 100KB for portals' },
  { slug: 'blog/how-to-crop-image-to-exact-aspect-ratio', title: 'Crop to Exact Aspect Ratio', badge: 'PHOTO CROP GUIDE', subtitle: 'Aspect ratio framing without stretching or quality loss' },
  { slug: 'blog/how-to-resize-image-to-passport-size', title: 'Resize to Passport Size', badge: '35×45MM & 2×2 INCH', subtitle: 'Convert smartphone photos to biometric passport standards' },
  { slug: 'blog/iphone-heic-explained', title: 'iPhone HEIC Format Explained', badge: 'HEIC VS JPEG', subtitle: 'Why Apple uses HEIC and how to convert it locally in browser' },
  { slug: 'blog/why-portals-reject-200kb-photos', title: 'Why Portals Reject Photos', badge: 'EXAM PORTAL GUIDE', subtitle: 'Common intake validation errors and how to clear them in 1 click' },
`;

content = content.replace(
  "  // P4 New High-Intent Portals & Workflows\n",
  staticPages + "\n  // P4 New High-Intent Portals & Workflows\n"
);

fs.writeFileSync('scripts/generate-og-images.mjs', content, 'utf8');
console.log('Added info & blog OG images to generate-og-images.mjs');

