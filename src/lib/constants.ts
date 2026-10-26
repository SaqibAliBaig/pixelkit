/**
 * Site-wide constants. Single source of truth for nav, footer, and
 * metadata defaults. Importing this in layouts and components keeps
 * everything in sync with the sitemap and structured data.
 */

export interface NavItem {
  label: string;
  href: string;
}

export interface SiteConfig {
  name: string;
  url: string;
  defaultTitle: string;
  defaultDescription: string;
  defaultOgImage: string;
  twitterHandle: string;
  author: string;
  contactEmail: string;
  keywords: string[];
}

export const SITE: SiteConfig = {
  name: 'PixelKit',
  url: 'https://pixelkit.app',
  defaultTitle: 'Image Compressor, Converter, Crop & Resizer — PixelKit',
  defaultDescription:
    'Free online image compressor, converter, crop & resize tool. Compress JPG, PNG, WebP, HEIC & PDF to exact KB targets or pixel dimensions. 100% private in-browser tool with zero server uploads.',
  defaultOgImage: '/og-default.png',
  twitterHandle: '@pixelkitapp',
  author: 'PixelKit Team',
  contactEmail: 'saqibbaig110@gmail.com',
  keywords: [
    'image compressor',
    'image converter',
    'image resizer',
    'crop image',
    'image cropper',
    'resize image',
    'scale image resolution',
    'photo cropper online',
    'aspect ratio crop',
    'passport photo resize',
    'file converter',
    'heic to jpg',
    'png to jpg',
    'jpg to pdf',
    'compress image to 50kb',
    'compress image to 100kb',
    'compress image to 200kb',
    'private image converter',
    'client-side converter',
    'online photo converter no upload',
  ],
};

export const NAV: NavItem[] = [
  { label: 'Compress', href: '/compress-image' },
  { label: 'Resize', href: '/resize-image' },
  { label: 'Crop', href: '/crop-image' },
  { label: 'Convert', href: '/convert' },
  { label: 'Blog', href: '/blog' },
  { label: 'About', href: '/about' },
];

export const FOOTER_LINKS: {
  tools: NavItem[];
  targets: NavItem[];
  site: NavItem[];
} = {
  tools: [
    { label: 'Compress Image', href: '/compress-image' },
    { label: 'Resize Image', href: '/resize-image' },
    { label: 'Crop Image', href: '/crop-image' },
    { label: 'HEIC → JPG', href: '/heic-to-jpg' },
    { label: 'PNG → JPG', href: '/png-to-jpg' },
    { label: 'JPG → PDF', href: '/jpg-to-pdf' },
    { label: 'All conversions', href: '/convert' },
  ],
  targets: [
    { label: 'HEIC to JPG under 50KB', href: '/heic-to-jpg-under-50kb' },
    { label: 'HEIC to JPG under 100KB', href: '/heic-to-jpg-under-100kb' },
    { label: 'JPG to PDF under 100KB', href: '/jpg-to-pdf-under-100kb' },
    { label: 'PNG to JPG under 200KB', href: '/png-to-jpg-under-200kb' },
    { label: 'JPG to WEBP under 100KB', href: '/jpg-to-webp-under-100kb' },
  ],
  site: [
    { label: 'Blog', href: '/blog' },
    { label: 'About', href: '/about' },
    { label: 'Privacy', href: '/privacy' },
    { label: 'Terms', href: '/terms' },
    { label: 'RSS Feed', href: '/rss.xml' },
    { label: 'XML Sitemap', href: '/sitemap-index.xml' },
  ],
};