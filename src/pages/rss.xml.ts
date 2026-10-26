import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { SITE } from '@lib/constants';

export const GET: APIRoute = async (context) => {
  const posts = (await getCollection('blog'))
    .filter((post) => !post.data.draft)
    .sort(
      (a, b) => b.data.publishedAt.getTime() - a.data.publishedAt.getTime()
    );

  const siteUrl = context.site?.href.replace(/\/$/, '') || SITE.url;

  const rssItems = posts
    .map((post) => {
      const link = `${siteUrl}/blog/${post.slug}`;
      const pubDate = post.data.publishedAt.toUTCString();
      const categories = (post.data.tags || [])
        .map((tag) => `<category>${escapeXml(tag)}</category>`)
        .join('');

      return `    <item>
      <title>${escapeXml(post.data.title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <description>${escapeXml(post.data.description)}</description>
      <pubDate>${pubDate}</pubDate>
      <author>${escapeXml(SITE.twitterHandle)} (${escapeXml(post.data.author || SITE.name)})</author>
      ${categories}
    </item>`;
    })
    .join('\n');

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(SITE.name)} Blog</title>
    <link>${siteUrl}/blog</link>
    <description>${escapeXml(SITE.defaultDescription)}</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${siteUrl}/rss.xml" rel="self" type="application/rss+xml" />
    <image>
      <url>${siteUrl}/icon-512.png</url>
      <title>${escapeXml(SITE.name)}</title>
      <link>${siteUrl}</link>
    </image>
${rssItems}
  </channel>
</rss>`;

  return new Response(rss.trim(), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
