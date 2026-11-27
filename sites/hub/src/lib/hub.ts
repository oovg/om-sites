/**
 * Hub data: everything the hub's pages need from the outer mind, through @om/content.
 */
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import {
  assetUrl,
  BESPOKE_NOTEBOOKS,
  byDateDesc,
  type Entry,
  entriesOf,
  hrefOf,
  hrefTo,
  imagesIn,
  isSiblingHref,
  loadOuterMind,
  MEDIA_FILES,
  notebookList,
  type OuterMind,
  parseMarkdown,
  PROJECT_STATUSES,
  renderMarkdown,
  type RenderOptions,
  siteBase,
  siteIdOf,
  splitSections,
} from '@om/content'

export const SITE = 'hub' as const

export function om(): OuterMind {
  return loadOuterMind()
}

export function opts(o: OuterMind = om()): RenderOptions {
  return { om: o, site: SITE }
}

export const md = (text: string, o: OuterMind = om()) => renderMarkdown(text, opts(o))

export interface NavLink {
  label: string
  href: string
  external: boolean
}

/** site.md `nav`: `path` → hub page, `to` → another site, `url` → external. */
export function nav(o: OuterMind = om()): NavLink[] {
  return (o.site?.data.nav ?? []).map((n) => {
    if (n.path) return { label: n.label, href: n.path, external: false }
    if (n.to) {
      const id = siteIdOf(n.to)
      // Sibling sites stay in the same tab; SiteLinks points the URL at this deployment.
      return { label: n.label, href: id ? `${siteBase(o, id)}/` : '#', external: false }
    }
    return { label: n.label, href: n.url!, external: true }
  })
}

export function hubTitle(o: OuterMind = om()): string {
  return o.site?.data.sites.find((s) => siteIdOf(s.name) === 'hub')?.title ?? 'The Open Machine'
}

export const pages = (o: OuterMind = om()) => entriesOf(o, 'page').filter((p) => siteIdOf(p.data.site) === 'hub')

export const transmissions = (o: OuterMind = om()) => entriesOf(o, 'transmission').sort(byDateDesc)

export const href = (e: Entry, o: OuterMind = om()) => hrefOf(o, e, SITE)

/** A new tab for a link that leaves the four sites (Substack, Collective, …). Sibling sites stay put. */
export function opensNewTab(link: string, o: OuterMind = om()): boolean {
  return /^https?:/i.test(link) && !isSiblingHref(o, link)
}

export { assetUrl, hrefTo, splitSections }

/** Media shop items, newest first. */
export const mediaItems = (o: OuterMind = om()) => entriesOf(o, 'media').sort(byDateDesc)

/**
 * Cover for a media item. A supplied `cover` is an asset on this site. A generated cover
 * lives on the media shop (`/media/<slug>/cover.png`); SiteLinks points that at the shop
 * you're viewing. Otherwise the edition's own image.
 */
export function mediaCover(m: Entry<'media'>, o: OuterMind = om()): string | undefined {
  if (m.data.cover) return assetUrl(m.data.cover)
  if (existsSync(join(MEDIA_FILES, m.slug, 'cover.png'))) return `${siteBase(o, 'mediashop')}/media/${m.slug}/cover.png`
  const src = m.data.edition_of ? o.bySlug.get(m.data.edition_of) : undefined
  const img = src && (src.data as { image?: string }).image
  return assetUrl(img)
}

/** Author for a shop preview: the media entry, else the piece it editions, else the hub's name. */
export function mediaByline(m: Entry<'media'>, o: OuterMind = om()): string {
  if (m.data.author?.length) return m.data.author.join(', ')
  const src = m.data.edition_of ? o.bySlug.get(m.data.edition_of) : undefined
  const author = src && (src.data as { author?: string[] }).author
  if (author?.length) return author.join(', ')
  return hubTitle(o)
}

function shopCover(slug: string | undefined, o: OuterMind): string | undefined {
  if (!slug) return undefined
  const m = o.bySlug.get(slug)
  return m?.type === 'media' ? mediaCover(m, o) : undefined
}

/**
 * Picture for a transmission card. The first image in the piece, otherwise its `image`,
 * otherwise the shop cover (its own, else its book's).
 */
export function transmissionImage(t: Entry<'transmission'>, o: OuterMind = om()): string | undefined {
  const embedded = imagesIn(parseMarkdown(t.body).children)[0]?.src
  if (embedded) return embedded
  const own = assetUrl(t.data.image)
  if (own) return own
  const shop = shopCover(t.data.in_mediashop, o)
  if (shop) return shop
  const book = t.data.collection ? o.bySlug.get(t.data.collection) : undefined
  if (book?.type !== 'collection') return undefined
  return assetUrl(book.data.image) ?? shopCover(book.data.in_mediashop, o)
}

/** Preview for a notebook card: a prepared image, else the first image in the notebook or its sections. */
export function notebookImage(n: Entry<'notebook'>, o: OuterMind = om()): string | undefined {
  const prepared = BESPOKE_NOTEBOOKS.find((b) => b.slug === n.slug)
  if (prepared && 'image' in prepared && prepared.image) return `${siteBase(o, 'notebooks')}${prepared.image}`
  const from = (body: string) => imagesIn(parseMarkdown(body).children)[0]?.src
  const own = from(n.body)
  if (own) return own.startsWith('/') ? `${siteBase(o, 'notebooks')}${own}` : own
  for (const slug of n.data.sections) {
    const section = o.bySlug.get(slug)
    if (!section?.body) continue
    const img = from(section.body)
    if (img) return img.startsWith('/') ? `${siteBase(o, 'notebooks')}${img}` : img
  }
  return undefined
}

export const events = (o: OuterMind = om()) => entriesOf(o, 'event').sort(byDateDesc)

export function notebooks(o: OuterMind = om()) {
  const all = notebookList(o).sort((a, b) => a.data.title.localeCompare(b.data.title))
  return { frameworks: all.filter((n) => n.data.framework), working: all.filter((n) => !n.data.framework) }
}

export function projectsByStatus(o: OuterMind = om()) {
  const all = entriesOf(o, 'project').sort((a, b) => a.data.title.localeCompare(b.data.title))
  return PROJECT_STATUSES.map((status) => ({ status, projects: all.filter((p) => p.data.status === status) })).filter(
    (g) => g.projects.length,
  )
}

export const quarterlies = (o: OuterMind = om()) =>
  entriesOf(o, 'quarterly')
    .filter((q) => siteIdOf(q.data.site) === 'hub')
    .sort((a, b) => b.data.quarter.localeCompare(a.data.quarter))

/** `## Updates` lines of a project: `- YYYY-MM-DD: text`, with status changes marked. */
export function projectUpdates(p: Entry<'project'>) {
  const out: { date: string; text: string; statusChange: boolean }[] = []
  const m = p.body.match(/^##\s+Updates\s*$([\s\S]*?)(?=^##\s|(?![\s\S]))/im)
  if (!m) return out
  for (const line of m[1].split('\n')) {
    const u = line.match(/^\s*-\s+(\d{4}-\d{2}-\d{2}):\s+(.*)$/)
    if (u) out.push({ date: u[1], text: u[2], statusChange: u[2].includes('Status →') })
  }
  return out
}

/** A project's body split into description, `## Outputs` and the rest (Updates handled separately). */
export function projectParts(p: Entry<'project'>, o: OuterMind = om()) {
  const sections = splitSections(p.body, opts(o))
  const description = sections.filter((s) => !s.heading)
  const outputs = sections.find((s) => s.heading.toLowerCase() === 'outputs')
  const other = sections.filter((s) => s.heading && !['outputs', 'updates'].includes(s.heading.toLowerCase()))
  return { description, outputs, other }
}

/** Entries that join a project, grouped by type. */
export function projectMembers(p: Entry<'project'>, o: OuterMind = om()) {
  const members = o.entries.filter((e) => (e.data as { project?: string }).project === p.slug).sort(byDateDesc)
  const groups = new Map<string, Entry[]>()
  for (const e of members) groups.set(e.type, [...(groups.get(e.type) ?? []), e])
  return [...groups.entries()]
}

export const TYPE_LABEL: Record<string, string> = {
  transmission: 'Transmissions',
  media: 'Media',
  collection: 'Books',
  event: 'Events',
  concept: 'Concepts',
  notebook: 'Notebooks',
  section: 'Notebook sections',
  quarterly: 'Updates',
}

/** Authors as "A, B". */
export const authorLine = (e: Entry) => ((e.data as { author?: string[] }).author ?? []).join(', ')

export { collectionIntro } from '@om/content'
