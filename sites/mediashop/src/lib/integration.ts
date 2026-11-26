/**
 * Editions in the mediashop: served from the edition cache in dev (/media/<slug>/<file>), and
 * copied into dist/mediashop/media/<slug>/ after a build.
 */
import { createReadStream, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { AstroIntegration } from 'astro'
import { copyEdition, edition, entriesOf, loadOuterMind, mediaType } from '@om/content'

export function shopIntegration(): AstroIntegration {
  return {
    name: 'om-mediashop-editions',
    hooks: {
      'astro:server:setup': ({ server }) => {
        server.middlewares.use(async (req: any, res: any, next: () => void) => {
          const m = decodeURIComponent((req.url ?? '').split('?')[0]).match(/^\/media\/([^/]+)\/([^/]+\.(?:epub|pdf|md|png))$/)
          if (!m) return next()
          const om = loadOuterMind()
          const media = entriesOf(om, 'media').find((x) => x.slug === m[1] && x.data.edition_of)
          if (!media) return next()
          try {
            const ed = await edition(om, media)
            const file = m[2] === 'cover.png' ? ed.cover?.path : ed.files.find((f) => f.path.endsWith(`/${m[2]}`))?.path
            if (!file || !existsSync(file)) return next()
            res.setHeader('Content-Type', mediaType(file))
            createReadStream(file).pipe(res)
          } catch (e) {
            res.statusCode = 500
            res.end(String(e))
          }
        })
      },
      'astro:build:done': async ({ dir, logger }) => {
        const om = loadOuterMind()
        const out = fileURLToPath(dir)
        let n = 0
        for (const media of entriesOf(om, 'media').filter((x) => x.data.edition_of)) {
          copyEdition(await edition(om, media), out)
          n++
        }
        logger.info(`wrote ${n} editions`)
      },
    },
  }
}
