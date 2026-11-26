/**
 * The media shop's view of the outer mind: one item per `media` entry (works and editions alike),
 * with cover, files and the online reading link resolved. Feeds the mediashop pages, the OPDS
 * catalog (/index.json, the path the old shop used), RSS and /shop.json.
 */
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { mediaType } from './assets.ts'
import { EDITION_LANGUAGE, edition, type Edition, FORMAT_TYPES, type Format } from './editions.ts'
import type { Entry, OuterMind } from './load.ts'
import { byDateDesc, entriesOf } from './load.ts'
import { assetUrl, hrefOf, siteBase } from './links.ts'

export interface ShopFile {
  format: Format
  label: string
  /** URL path on the shop. */
  href: string
  type: string
}

export interface ShopItem {
  media: Entry<'media'>
  slug: string
  title: string
  subtitle?: string
  author: string
  descriptor?: string
  description?: string
  /** Markdown body of the media entry (the longer text), if any. */
  abstract?: string
  date: string
  language: string
  licence?: string
  cover?: { href: string; path: string; type: string }
  files: ShopFile[]
  /** Where the piece can be read in a browser (the hub page of the transmission or book). */
  readOnline?: string
  edition?: Edition
}

const LABELS: Record<Format, string> = { epub: 'EPUB', pdf: 'PDF', md: 'Markdown' }
const ORDER: Format[] = ['epub', 'pdf', 'md']

function formatOf(file: string): Format | undefined {
  const ext = file.split('.').pop()?.toLowerCase()
  return ext === 'epub' || ext === 'pdf' || ext === 'md' ? ext : undefined
}

export async function shopItem(om: OuterMind, m: Entry<'media'>): Promise<ShopItem> {
  const ed = m.data.edition_of ? await edition(om, m) : undefined
  const src = ed?.source
  const author = (m.data.author ?? (src?.data as { author?: string[] } | undefined)?.author ?? []).join(', ')

  let files: ShopFile[]
  if (ed) {
    files = ed.files.map((f) => ({ format: f.format, label: `Download ${LABELS[f.format]}`, href: f.href, type: FORMAT_TYPES[f.format] }))
  } else {
    files = Object.entries(m.data.files ?? {})
      .filter((e): e is [string, string] => typeof e[1] === 'string')
      .map(([k, ref]) => {
        const format = (formatOf(ref) ?? k) as Format
        return { format, label: `Download ${LABELS[format]}`, href: assetUrl(ref)!, type: FORMAT_TYPES[format] ?? mediaType(ref) }
      })
  }
  files.sort((a, b) => ORDER.indexOf(a.format) - ORDER.indexOf(b.format))

  let cover: ShopItem['cover']
  if (m.data.cover) {
    const path = join(om.publicDir, m.data.cover)
    if (existsSync(path)) cover = { href: assetUrl(m.data.cover)!, path, type: mediaType(path) }
  } else if (ed?.cover) {
    cover = { href: ed.cover.href, path: ed.cover.path, type: 'image/png' }
  }

  // A transmission with a body (or a book) can be read on the hub.
  let readOnline: string | undefined
  if (src && (src.type === 'collection' || src.body.trim())) readOnline = hrefOf(om, src, 'mediashop')
  else if (src && (src.data as { url?: string }).url) readOnline = (src.data as { url?: string }).url

  return {
    media: m,
    slug: m.slug,
    title: m.data.title,
    subtitle: m.data.subtitle,
    author,
    descriptor: m.data.descriptor,
    description: m.data.summary,
    abstract: m.body.trim() || undefined,
    date: m.data.date,
    language: EDITION_LANGUAGE,
    licence: m.data.licence ?? om.site?.data.licence,
    cover,
    files,
    readOnline,
    edition: ed,
  }
}

/** Every shop item, newest first. */
export async function shopItems(om: OuterMind): Promise<ShopItem[]> {
  const media = entriesOf(om, 'media').sort(byDateDesc)
  const out: ShopItem[] = []
  for (const m of media) out.push(await shopItem(om, m)) // sequential: editions shell out to pandoc
  return out
}

export function shopName(om: OuterMind): string {
  return om.site?.data.sites.find((s) => s.name.toLowerCase().replace(/\s/g, '') === 'mediashop')?.title ?? 'Media Shop'
}

const abs = (om: OuterMind, href: string) => (href.startsWith('/') ? `${siteBase(om, 'mediashop')}${href}` : href)

/** OPDS 2.0 catalog in the old shop's shape (PROTOCOL.md §4). */
export async function opds(om: OuterMind, items: ShopItem[]): Promise<object> {
  const sharp = (await import('sharp')).default
  const publications = []
  for (const it of items) {
    const page = abs(om, `/media/${it.slug}`)
    const links: object[] = []
    if (it.readOnline) links.push({ rel: 'alternate', href: abs(om, it.readOnline), type: 'text/html', title: 'View in Browser' })
    for (const f of it.files) {
      links.push({
        rel: 'http://opds-spec.org/acquisition/open-access',
        href: page,
        type: 'text/html',
        properties: { indirectAcquisition: [{ href: abs(om, f.href), type: f.type }] },
      })
    }
    const images = []
    if (it.cover) {
      const meta = await sharp(it.cover.path).metadata()
      images.push({ href: abs(om, it.cover.href), type: it.cover.type, height: meta.height, width: meta.width })
    }
    publications.push({
      metadata: {
        '@type': 'http://schema.org/Book',
        title: it.title,
        ...(it.subtitle ? { alternativeHeadline: it.subtitle } : {}),
        ...(it.author ? { author: it.author } : {}),
        ...(it.description ? { description: it.description } : {}),
        ...(it.abstract ? { abstract: it.abstract } : {}),
        language: it.language,
        modified: `${it.date}T00:00:00Z`,
      },
      links,
      ...(images.length ? { images } : {}),
    })
  }
  return {
    metadata: { title: shopName(om) },
    links: [{ rel: 'self', href: abs(om, '/index.json'), type: 'application/opds+json' }],
    publications,
  }
}

/** /shop.json (PROTOCOL.md §3), from site.md. */
export function shopJson(om: OuterMind, donateUrl?: string): object {
  const hub = om.site?.data.sites.find((s) => s.name.toLowerCase() === 'hub')
  return {
    name: shopName(om),
    baseUrl: siteBase(om, 'mediashop'),
    ...(hub?.url ? { aboutUrl: hub.url } : {}),
    language: EDITION_LANGUAGE,
    ...(om.site?.data.tagline ? { description: om.site.data.tagline } : {}),
    ...(donateUrl ? { donate: { url: donateUrl } } : {}),
  }
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')

/** RSS in the old shop's shape (PROTOCOL.md §7). */
export function shopRss(om: OuterMind, items: ShopItem[]): string {
  const base = siteBase(om, 'mediashop')
  const body = items
    .map((it) => {
      const link = `${base}/media/${it.slug}`
      const description = it.description ?? it.subtitle ?? ''
      return `    <item>
      <title>${esc(it.title)}</title>
      <link>${esc(link)}</link>
      <guid isPermaLink="true">${esc(link)}</guid>
      <pubDate>${new Date(`${it.date}T00:00:00Z`).toUTCString()}</pubDate>
      <dc:creator>${esc(it.author)}</dc:creator>
      <description>${esc(description)}</description>
    </item>`
    })
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${esc(shopName(om))}</title>
    <link>${esc(base)}</link>
    <description>${esc(om.site?.data.tagline ?? shopName(om))}</description>
    <language>${EDITION_LANGUAGE}</language>
    <atom:link href="${esc(`${base}/rss.xml`)}" rel="self" type="application/rss+xml"/>
${body}
  </channel>
</rss>
`
}
