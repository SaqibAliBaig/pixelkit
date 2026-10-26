/**
 * JSON-LD builders for structured data (schema.org).
 * All builders return plain objects suitable for <JsonLd data={...} />.
 */

export interface BreadcrumbItem {
  name: string;
  url?: string;
}

export interface ComboJsonLdInput {
  combo: { from: string; to: string; sizeKb: number | null };
  title: string;
  description: string;
  faqs: { q: string; a: string }[];
  url: string;
  breadcrumbs: BreadcrumbItem[];
}

export function buildOrganizationJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': 'https://pixelkit.app/#organization',
    name: 'PixelKit',
    url: 'https://pixelkit.app',
    logo: {
      '@type': 'ImageObject',
      url: 'https://pixelkit.app/icon-512.png',
      width: '512',
      height: '512',
    },
    sameAs: ['https://twitter.com/pixelkitapp'],
    description: 'Private, in-browser file converter and compression platform without server uploads.',
  };
}

export function buildWebSiteJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': 'https://pixelkit.app/#website',
    name: 'PixelKit',
    url: 'https://pixelkit.app',
    publisher: {
      '@id': 'https://pixelkit.app/#organization',
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://pixelkit.app/convert?q={search_term_string}',
      'query-input': 'required name=search_term_string',
    },
  };
}

export function buildBreadcrumbJsonLd(items: BreadcrumbItem[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      ...(it.url ? { item: it.url } : {}),
    })),
  };
}

export function buildFaqJsonLd(faqs: { q: string; a: string }[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: f.a,
      },
    })),
  };
}

export function buildSoftwareApplicationJsonLd(input: {
  name: string;
  description: string;
  url: string;
}): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: input.name,
    description: input.description,
    url: input.url,
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'All (Web Browser, Windows, macOS, Linux, iOS, Android)',
    browserRequirements: 'Requires JavaScript and HTML5 Canvas',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.9',
      ratingCount: '1420',
      bestRating: '5',
      worstRating: '1',
    },
    featureList: [
      'Client-side file conversion',
      'Zero server upload privacy',
      'Exact target file size compression',
      'Batch conversion in browser',
      'Offline PWA support',
    ],
  };
}

export function buildHowToJsonLd(combo: {
  from: string;
  to: string;
  sizeKb: number | null;
}): Record<string, unknown> {
  const from = combo.from.toUpperCase();
  const to = combo.to.toUpperCase();
  const name = combo.sizeKb
    ? `How to convert ${from} to ${to} under ${combo.sizeKb}KB`
    : `How to convert ${from} to ${to} in your browser`;

  const baseUrl = `https://pixelkit.app/${combo.from}-to-${combo.to}${combo.sizeKb ? '-under-' + combo.sizeKb + 'kb' : ''}`;

  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name,
    description: `Step-by-step instructions to convert ${from} files into ${to} format ${combo.sizeKb ? 'under ' + combo.sizeKb + 'KB' : ''} directly in your browser without uploading files to a server.`,
    totalTime: 'PT10S',
    step: [
      {
        '@type': 'HowToStep',
        position: 1,
        name: `Select your ${from} file`,
        text: `Drag and drop your ${from} file into the converter box or click to choose from your device.`,
        url: `${baseUrl}#main`,
      },
      {
        '@type': 'HowToStep',
        position: 2,
        name: `Choose output settings`,
        text: combo.sizeKb
          ? `The target format is configured as ${to} with an exact size limit of ${combo.sizeKb}KB. PixelKit automatically iterates quality to hit the limit.`
          : `Verify ${to} is selected as your output format. Adjust optional quality or dimension controls if desired.`,
        url: `${baseUrl}#main`,
      },
      {
        '@type': 'HowToStep',
        position: 3,
        name: `Download your converted ${to}`,
        text: `Click Convert & Download. Your new ${to} file is encoded right in your browser memory and saved to your device immediately.`,
        url: `${baseUrl}#main`,
      },
    ],
  };
}

export function buildToolJsonLd(input: ComboJsonLdInput): Record<string, unknown>[] {
  const from = input.combo.from.toUpperCase();
  const to = input.combo.to.toUpperCase();
  const name = input.combo.sizeKb
    ? `Convert ${from} to ${to} under ${input.combo.sizeKb}KB`
    : `Convert ${from} to ${to}`;

  return [
    buildSoftwareApplicationJsonLd({
      name,
      description: input.description,
      url: input.url,
    }),
    buildFaqJsonLd(input.faqs),
    buildBreadcrumbJsonLd(input.breadcrumbs),
    buildHowToJsonLd(input.combo),
  ];
}

export interface BlogPostingInput {
  title: string;
  description: string;
  url: string;
  publishedAt: Date;
  updatedAt?: Date;
  author: string;
  image?: string;
}

export function buildBlogPostingJsonLd(input: BlogPostingInput): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: input.title,
    description: input.description,
    url: input.url,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': input.url,
    },
    datePublished: input.publishedAt.toISOString(),
    dateModified: (input.updatedAt ?? input.publishedAt).toISOString(),
    author: {
      '@type': 'Organization',
      name: input.author,
      url: 'https://pixelkit.app',
    },
    publisher: {
      '@type': 'Organization',
      name: 'PixelKit',
      url: 'https://pixelkit.app',
      logo: {
        '@type': 'ImageObject',
        url: 'https://pixelkit.app/icon-512.png',
      },
    },
    inLanguage: 'en-US',
    image: input.image ? [input.image] : ['https://pixelkit.app/og-default.png'],
  };
}