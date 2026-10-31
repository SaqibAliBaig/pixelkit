const fs = require('fs');

const files = [
  'src/pages/compress-image.astro',
  'src/pages/compress-[format].astro',
  'src/pages/compress-image-to-[size]kb.astro',
  'src/pages/crop-image.astro',
  'src/pages/resize-image.astro',
  'src/pages/passport-photo-resizer.astro',
];

for (const file of files) {
  let c = fs.readFileSync(file, 'utf8');
  if (!c.includes('PortalRequirementsGuide')) {
    // Add import
    c = c.replace(
      /import FAQSection from '@components\/seo\/FAQSection\.astro';/,
      "import FAQSection from '@components/seo/FAQSection.astro';\nimport PortalRequirementsGuide from '@components/seo/PortalRequirementsGuide.astro';"
    );
    // Add component before FAQSection container
    c = c.replace(
      /(<div class="mt-12 sm:mt-16">\s*<FAQSection)/,
      "<PortalRequirementsGuide />\n\n    $1"
    );
    fs.writeFileSync(file, c, 'utf8');
    console.log('Added PortalRequirementsGuide to', file);
  }
}
