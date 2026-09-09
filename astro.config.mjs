import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://bombobombone.github.io',
  output: 'static',
  compressHTML: true,
  integrations: [sitemap()],
});
