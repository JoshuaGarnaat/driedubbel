// @ts-check
import { defineConfig } from 'astro/config';

import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import sitemap from '@astrojs/sitemap';

export default defineConfig({
	markdown: {
		remarkPlugins: [remarkMath],
		rehypePlugins: [
			[
				rehypeKatex,
				{
					// Katex plugin options
				}
			]
		]
	},
	site: 'https://driedubbel.com',
	integrations: [
		sitemap()
  	],
})