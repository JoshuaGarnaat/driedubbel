import { defineCollection, z } from 'astro:content';

const articles = defineCollection({
    schema: z.object({
        title: z.string(),
        description: z.string(),
        pubDate: z.string(),
        tags: z.array(z.string()),
    }),
});

export const collections = {
    articles,
};