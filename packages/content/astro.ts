/**
 * Astro integration shared by every site: serves `/assets/*` from the outer mind in dev, reloads
 * the browser when an outer-mind file changes, injects the dev-only `/_styleguide` route, and
 * copies the assets the site's entries reference into its output after a build.
 */
import { fileURLToPath } from 'node:url'
import type { AstroIntegration } from 'astro'
import { assetsMiddleware, copyAssets } from './assets.ts'
import type { Entry } from './load.ts'
import { loadOuterMind } from './load.ts'

export interface OmSiteOptions {
  name: string
  /** Entries whose assets this site needs. */
  entries: (all: Entry[]) => Entry[]
  /** Dev-only style guide page (an .astro file), served at /_styleguide. */
  styleguide?: string
}

export function omSite(opts: OmSiteOptions): AstroIntegration {
  return {
    name: `om-${opts.name}`,
    hooks: {
      'astro:config:setup': ({ command, injectRoute }) => {
        if (command === 'dev' && opts.styleguide) {
          injectRoute({ pattern: '/_styleguide', entrypoint: opts.styleguide, prerender: true })
        }
      },
      'astro:server:setup': ({ server }) => {
        server.middlewares.use(assetsMiddleware(loadOuterMind))
        const om = loadOuterMind()
        server.watcher.add([om.publicDir, `${om.root}/schemas.md`])
        server.watcher.on('all', (_event, file) => {
          if (file.startsWith(om.root)) server.ws.send({ type: 'full-reload', path: '*' })
        })
      },
      'astro:build:done': ({ dir, logger }) => {
        const om = loadOuterMind()
        const n = copyAssets(om, opts.entries(om.entries), fileURLToPath(dir))
        logger.info(`copied ${n} assets from the outer mind`)
      },
    },
  }
}
