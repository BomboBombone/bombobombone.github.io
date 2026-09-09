import { defineCollection, z } from 'astro:content';

const posts = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    readingTime: z.string(),
    category: z.string(),
    published: z.boolean().default(false),
    socialImage: z.string().optional(),
    socialImageAlt: z.string().optional(),
  }),
});

export const collections = { posts };
