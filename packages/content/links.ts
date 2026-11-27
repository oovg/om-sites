/**
 * Where each entry lives, and `[[slug|text]]` → URL on the right site. Backlinks.
 *
 * Cross-site links are written as the canonical URL from site.md. A small script on each site
 * (`packages/ui/SiteLinks.astro`) retargets them, when the page is viewed, at the sibling
 * deployment: localhost ports from each site's dev script, or the same host with the site name
 * swapped (`hub.vercel.app` → `mediashop.vercel.app`). Production hosts are left as published.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { WORKSPACE } from './config.ts'
import type { Entry, OuterMind } from './load.ts'
import { notebookList } from './bespoke.ts'

export type SiteId = 'hub' | 'mediashop' | 'wiki' | 'notebooks'
export const SITE_IDS: SiteId[] = ['hub', 'mediashop', 'wiki', 'notebooks']

/** "Media shop" → "mediashop"; used to match site.md names and nav `to:` values. */
export function siteIdOf(name: string): SiteId | undefined {
  const id = name.toLowerCase().replace(/[^a-z]/g, '')
  return (SITE_IDS as string[]).includes(id) ? (id as SiteId) : undefined
}

/**
 * Base URL of a site. From site.md, unless `OM_URL_<SITE>` is set (e.g. OM_URL_MEDIASHOP=http://localhost:4402).
 * Pages also retarget these in the browser; see `siteHosts`.
 */
export function siteBase(om: OuterMind, site: SiteId): string {
  const env = process.env[`OM_URL_${site.toUpperCase()}`]
  if (env) return env.replace(/\/$/, '')
  return canonicalOrigin(om, site)
}

/** URL published in site.md, without an `OM_URL_*` override. */
export function canonicalOrigin(om: OuterMind, site: SiteId): string {
  const s = om.site?.data.sites.find((x) => siteIdOf(x.name) === site)
  return (s?.url ?? '').replace(/\/$/, '')
}

const devPorts = new Map<SiteId, number>()

/** Port from `sites/<id>/package.json` `dev` script (`astro dev --port N`). 0 if it can't be read. */
export function devPort(site: SiteId): number {
  const cached = devPorts.get(site)
  if (cached !== undefined) return cached
  let port = 0
  try {
    const pkg = JSON.parse(readFileSync(join(WORKSPACE, 'sites', site, 'package.json'), 'utf8')) as {
      scripts?: { dev?: string; preview?: string }
    }
    const m = (pkg.scripts?.dev ?? pkg.scripts?.preview ?? '').match(/--port(?:\s+|=)(\d+)/)
    if (m) port = Number(m[1])
  } catch {
    port = 0
  }
  devPorts.set(site, port)
  return port
}

export interface SiteHost {
  /** Canonical origin from site.md, no trailing slash. */
  origin: string
  /** Local dev/preview port. */
  port: number
}

/** What the browser needs to retarget a cross-site link at the deployment being viewed. */
export function siteHosts(om: OuterMind): Record<SiteId, SiteHost> {
  return Object.fromEntries(SITE_IDS.map((id) => [id, { origin: canonicalOrigin(om, id), port: devPort(id) }])) as Record<
    SiteId,
    SiteHost
  >
}

/** True when `href` points at one of the four sites (its published host, or its local port). */
export function isSiblingHref(om: OuterMind, href: string): boolean {
  let url: URL
  try {
    url = new URL(href)
  } catch {
    return false
  }
  for (const id of SITE_IDS) {
    const origin = canonicalOrigin(om, id)
    if (origin) {
      try {
        if (new URL(origin).hostname === url.hostname) return true
      } catch {
        /* a bad site.md url just doesn't match */
      }
    }
    const port = devPort(id)
    if (port && (url.hostname === 'localhost' || url.hostname === '127.0.0.1') && url.port === String(port)) return true
  }
  return false
}

export function hasNotebooks(om: OuterMind): boolean {
  return notebookList(om).length > 0
}

/** The wiki path of any entry: its path in public/ without `.md` (a notebook: its folder). */
export function wikiPath(e: Entry): string {
  const p = e.file.replace(/\.md$/, '').replace(/\/index$/, '')
  return `/${p}`
}

export interface Location {
  site: SiteId
  path: string
}

/** The entry's main page: the site that shows it, and where. */
export function locate(om: OuterMind, e: Entry): Location {
  switch (e.type) {
    case 'page': {
      const site = siteIdOf((e as Entry<'page'>).data.site) ?? 'hub'
      return { site, path: (e as Entry<'page'>).data.path }
    }
    case 'project':
      return { site: 'hub', path: `/projects/${e.slug}` }
    case 'quarterly':
      return { site: 'hub', path: `/updates/${e.slug}` }
    case 'transmission':
      return { site: 'hub', path: `/transmissions/${e.slug}` }
    case 'collection':
      return { site: 'hub', path: `/collections/${e.slug}` }
    case 'media':
      return { site: 'mediashop', path: `/media/${e.slug}` }
    case 'concept':
      return hasNotebooks(om) ? { site: 'notebooks', path: `/glossary#${e.slug}` } : { site: 'wiki', path: wikiPath(e) }
    case 'notebook':
      return { site: 'notebooks', path: `/${e.slug}` }
    case 'section':
      return { site: 'notebooks', path: `/${(e as Entry<'section'>).data.notebook}#${e.slug}` }
    default:
      // events and settings have no page of their own outside the wiki
      return { site: 'wiki', path: wikiPath(e) }
  }
}

/** A URL for `loc`, relative when it is on `from`, absolute otherwise. */
export function hrefTo(om: OuterMind, loc: Location, from: SiteId): string {
  return loc.site === from ? loc.path : `${siteBase(om, loc.site)}${loc.path}`
}

/** URL of an entry's page, as seen from `from`. A transmission with no body links to its `url`. */
export function hrefOf(om: OuterMind, e: Entry, from: SiteId): string {
  if (e.type === 'transmission') {
    const t = e as Entry<'transmission'>
    if (t.data.url && !t.body.trim()) return t.data.url
  }
  return hrefTo(om, locate(om, e), from)
}

/** `/assets/<name>` for `assets/<name>`; remote URLs pass through. */
export function assetUrl(ref: string | undefined): string | undefined {
  if (!ref) return undefined
  if (/^[a-z]+:/i.test(ref) || ref.startsWith('/')) return ref
  return `/${ref.replace(/^\.?\//, '')}`
}

export const WIKILINK = /\[\[([^\]|#]+)(#[^\]|]*)?(?:\|([^\]]+))?\]\]/g

/** Every `[[slug]]` target in a markdown string. */
export function wikilinkTargets(md: string): string[] {
  return [...md.matchAll(WIKILINK)].map((m) => m[1].trim())
}

/** Slugs an entry links to: body wikilinks plus slug-valued fields. */
export function outgoing(e: Entry): string[] {
  const d = e.data as Record<string, unknown>
  const fields = ['project', 'collection', 'in_mediashop', 'edition_of', 'notebook']
    .map((k) => d[k])
    .filter((v): v is string => typeof v === 'string')
  const lists = ['related', 'sources', 'essays', 'sections'].flatMap((k) => (Array.isArray(d[k]) ? (d[k] as string[]) : []))
  return [...new Set([...wikilinkTargets(e.body), ...fields, ...lists])]
}

/** slug → entries that link to it. */
export function backlinks(om: OuterMind): Map<string, Entry[]> {
  const map = new Map<string, Entry[]>()
  for (const e of om.entries) {
    for (const target of outgoing(e)) {
      if (target === e.slug) continue
      const list = map.get(target) ?? []
      list.push(e)
      map.set(target, list)
    }
  }
  return map
}
