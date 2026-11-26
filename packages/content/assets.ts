/**
 * Assets: which files in `public/assets/` entries reference, copying them into a site's output,
 * and serving them in dev.
 */
import { copyFileSync, createReadStream, existsSync, mkdirSync, statSync } from 'node:fs'
import { extname, join } from 'node:path'
import type { Entry, OuterMind } from './load.ts'

const ASSET_REF = /(?:^|[\s("'<[])(?:\.\/)?(assets\/[^\s)"'<>\]]+)/g

/** `assets/<name>` references in an entry: body plus image, cover and files fields. */
export function assetRefs(e: Entry): string[] {
  const d = e.data as Record<string, any>
  const fields = [d.image, d.cover, ...(d.files ? Object.values(d.files) : [])].filter(
    (v): v is string => typeof v === 'string' && v.replace(/^\.?\//, '').startsWith('assets/'),
  )
  const body = [...e.body.matchAll(ASSET_REF)].map((m) => m[1])
  return [...new Set([...fields, ...body].map((r) => r.replace(/^\.?\//, '').replace(/[.,;:]$/, '')))]
}

/** Copies the assets referenced by `entries` into `<outDir>/assets/`. Returns the count. */
export function copyAssets(om: OuterMind, entries: Entry[], outDir: string): number {
  const names = new Set(entries.flatMap(assetRefs).map((r) => r.slice('assets/'.length)))
  mkdirSync(join(outDir, 'assets'), { recursive: true })
  let n = 0
  for (const name of names) {
    const src = join(om.assetsDir, name)
    if (!existsSync(src)) continue
    const dest = join(outDir, 'assets', name)
    mkdirSync(join(dest, '..'), { recursive: true })
    copyFileSync(src, dest)
    n++
  }
  return n
}

const TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
  '.epub': 'application/epub+zip',
  '.md': 'text/markdown; charset=utf-8',
}

export function mediaType(file: string): string {
  return TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream'
}

/** Connect/Vite middleware that serves `/assets/*` from the outer mind in dev. */
export function assetsMiddleware(getOm: () => OuterMind) {
  return (req: any, res: any, next: () => void) => {
    const url: string = decodeURIComponent((req.url ?? '').split('?')[0])
    if (!url.startsWith('/assets/') || url.includes('..')) return next()
    const file = join(getOm().assetsDir, url.slice('/assets/'.length))
    if (!existsSync(file) || !statSync(file).isFile()) return next()
    res.setHeader('Content-Type', mediaType(file))
    createReadStream(file).pipe(res)
  }
}
