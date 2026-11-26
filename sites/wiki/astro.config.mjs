import { defineConfig } from 'astro/config'
import { omSite } from '@om/content/astro'

export default defineConfig({
  outDir: '../../dist/wiki',
  build: { format: 'directory' },
  trailingSlash: 'ignore',
  devToolbar: { enabled: false },
  integrations: [
    omSite({ name: 'wiki', entries: (all) => all, allAssets: true, styleguide: './src/dev/styleguide.astro' }),
  ],
})
