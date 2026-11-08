import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const tributes = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/tributes' }),
  schema: ({ image }) =>
    z.object({
      name: z.string(),
      relation: z.string(), // "Granddaughter", "Parish priest", "Neighbour"
      location: z.string().optional(),
      photo: image().optional(),
      photoAlt: z.string().optional(),
      // short quote for the spotlights, defaults to first sentence
      pullQuote: z.string().max(240).optional(),
      featured: z.boolean().default(false),
      order: z.number().default(100),
    }),
});

const chapters = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/chapters' }),
  schema: ({ image }) =>
    z.object({
      order: z.number(),
      title: z.string(),
      period: z.coerce.string(), // "1948 – 1966"
      image: image().optional(),
      imageAlt: z.string().optional(),
      imageCaption: z.string().optional(),
    }),
});

export const collections = { tributes, chapters };
