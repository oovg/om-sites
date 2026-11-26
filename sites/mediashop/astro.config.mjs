import { defineConfig } from 'astro/config'
import { omSite } from '@om/content/astro'
import { shopIntegration } from './src/lib/integration.ts'

export default defineConfig({
  outDir: '../../dist/mediashop',
  build: { format: 'directory' },
  trailingSlash: 'ignore',
  devToolbar: { enabled: false },
  integrations: [
    omSite({
      name: 'mediashop',
      entries: (all) => all.filter((e) => e.type === 'media'),
      styleguide: './src/dev/styleguide.astro',
    }),
    shopIntegration(),
  ],
})
