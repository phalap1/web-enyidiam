// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import serviceWorker from './integrations/service-worker.mjs';

// github pages: SITE_URL=https://<user>.github.io BASE_PATH=/<repo>/ (set in the workflow)
const SITE = process.env.SITE_URL ?? 'https://enyidia-nwosu.pages.dev';
const BASE = process.env.BASE_PATH ?? '/';

export default defineConfig({
  site: SITE,
  base: BASE,
  output: 'static',
  trailingSlash: 'ignore',

  build: {
    format: 'directory',
    // css is small, inline it to save a request
    inlineStylesheets: 'always',
    assets: '_astro',
  },

  compressHTML: true,

  prefetch: { prefetchAll: false, defaultStrategy: 'hover' },

  image: {
    service: { entrypoint: 'astro/assets/services/sharp' },
  },

  // self-hosted fonts
  fonts: [
    {
      provider: fontProviders.local(),
      name: 'Cormorant Garamond',
      cssVariable: '--font-display',
      fallbacks: ['Georgia', 'serif'],
      options: {
        variants: [
          {
            src: ['@fontsource/cormorant-garamond/files/cormorant-garamond-latin-600-normal.woff2'],
            weight: '600',
            style: 'normal',
            display: 'swap',
          },
          {
            src: ['@fontsource/cormorant-garamond/files/cormorant-garamond-latin-500-italic.woff2'],
            weight: '500',
            style: 'italic',
            display: 'swap',
          },
        ],
      },
    },
    {
      // only used for the praise name
      provider: fontProviders.local(),
      name: 'Pinyon Script',
      cssVariable: '--font-script',
      fallbacks: ['cursive'],
      optimizedFallbacks: false,
      options: {
        variants: [
          {
            src: ['@fontsource/pinyon-script/files/pinyon-script-latin-400-normal.woff2'],
            weight: '400',
            style: 'normal',
            display: 'optional',
          },
        ],
      },
    },
  ],

  integrations: [serviceWorker()],
});
