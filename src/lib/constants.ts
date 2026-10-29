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
  defaultTitle: 'Image Compressor, Converter, Resizer & Cropper — PixelKit',
  defaultDescription:
    'Free online image compressor, converter, resizer and cropper. Shrink JPG, PNG, WebP, HEIC, SVG and PDF to exact KB or pixel sizes in your browser.',
  defaultOgImage: '/og-preview.png',
  twitterHandle: '@SaqibBaig1100',
  author: 'PixelKit Team',
  contactEmail: 'saqibbaig110@gmail.com',
  keywords: [
    'image compressor',
    'image converter',
    'image resizer',
    'crop image',
    'image cropper',
    'resize image',
    'compress jpg',
    'compress png',
    'compress pdf',
    'passport photo resizer',
    'scale image resolution',
    'photo cropper online',
    'aspect ratio crop',
    'heic to jpg',
    'png to jpg',
    'jpg to pdf',
    'svg to png',
    'pdf to jpg',
    'compress image to 50kb',
    'compress image to 100kb',
    'compress image to 200kb',
    'private image converter',
    'online photo compressor no upload',
  ],
};

export const NAV: NavItem[] = [
  { label: 'Compress', href: '/compress-image' },
  { label: 'Convert', href: '/convert' },
  { label: 'Resize', href: '/resize-image' },
  { label: 'Crop', href: '/crop-image' },
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
    { label: 'Image Converter', href: '/convert' },
    { label: 'Resize Image', href: '/resize-image' },
    { label: 'Crop Image', href: '/crop-image' },
    { label: 'Passport Photo Maker', href: '/passport-photo-resizer' },
    { label: 'Compress JPG', href: '/compress-jpg' },
    { label: 'Compress PNG', href: '/compress-png' },
    { label: 'Compress PDF', href: '/compress-pdf' },
  ],
  targets: [
    { label: 'Compress Image to 20KB', href: '/compress-image-to-20kb' },
    { label: 'Compress Image to 50KB', href: '/compress-image-to-50kb' },
    { label: 'Compress Image to 100KB', href: '/compress-image-to-100kb' },
    { label: 'Compress Image to 200KB', href: '/compress-image-to-200kb' },
    { label: 'HEIC to JPG under 100KB', href: '/heic-to-jpg-under-100kb' },
    { label: 'JPG to PDF under 100KB', href: '/jpg-to-pdf-under-100kb' },
    { label: 'SVG to PNG Converter', href: '/svg-to-png' },
    { label: 'PDF to JPG Converter', href: '/pdf-to-jpg' },
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
