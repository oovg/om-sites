import { defineConfig } from 'astro/config'
import { omSite } from '@om/content/astro'

export default defineConfig({
  outDir: '../../dist/notebooks',
  build: { format: 'directory' },
  trailingSlash: 'ignore',
  devToolbar: { enabled: false },
  integrations: [
    omSite({
      name: 'notebooks',
      entries: (all) => all.filter((e) => ['notebook', 'section', 'concept'].includes(e.type)),
      styleguide: './src/dev/styleguide.astro',
    }),
  ],
})
