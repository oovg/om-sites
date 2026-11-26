import { defineConfig } from 'astro/config'
import { omSite } from '@om/content/astro'

const HUB_TYPES = ['page', 'project', 'quarterly', 'transmission', 'collection', 'media', 'event']

export default defineConfig({
  outDir: '../../dist/hub',
  build: { format: 'directory' },
  trailingSlash: 'ignore',
  devToolbar: { enabled: false },
  redirects: {
    '/programme': '/updates/',
    '/q3-2026': '/updates/2026-q3',
  },
  integrations: [
    omSite({
      name: 'hub',
      entries: (all) => all.filter((e) => HUB_TYPES.includes(e.type)),
      styleguide: './src/dev/styleguide.astro',
    }),
  ],
})
