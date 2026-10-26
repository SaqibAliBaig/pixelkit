import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: ({ image }) =>
    z.object({
      title: z.string().min(10).max(120),
      description: z.string().min(60).max(200),
      publishedAt: z.coerce.date(),
      updatedAt: z.coerce.date().optional(),
      author: z.string().default('PixelKit'),
      cover: image().optional(),
      coverAlt: z.string().optional(),
      tags: z.array(z.string()).default([]),
      /** Internal combo links this post should surface, e.g. ["heic-to-jpg"] */
      relatedCombos: z.array(z.string()).default([]),
      /** Hide from index listing (still built) */
      draft: z.boolean().default(false),
      /** Canonical URL override, rarely needed */
      canonical: z.string().url().optional(),
    }),
});

export const collections = { blog };