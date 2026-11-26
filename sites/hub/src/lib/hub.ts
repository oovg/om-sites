/**
 * Hub data: everything the hub's pages need from the outer mind, through @om/content.
 */
import {
  assetUrl,
  byDateDesc,
  type Entry,
  entriesOf,
  hrefOf,
  hrefTo,
  loadOuterMind,
  type OuterMind,
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
      return { label: n.label, href: id ? `${siteBase(o, id)}/` : '#', external: true }
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

export { assetUrl, hrefTo, splitSections }

/** Media shop items, newest first. */
export const mediaItems = (o: OuterMind = om()) => entriesOf(o, 'media').sort(byDateDesc)

/** Cover for a media item: its `cover`, else the edition's source image. Generated covers come with the mediashop. */
export function mediaCover(m: Entry<'media'>, o: OuterMind = om()): string | undefined {
  if (m.data.cover) return assetUrl(m.data.cover)
  const src = m.data.edition_of ? o.bySlug.get(m.data.edition_of) : undefined
  const img = src && (src.data as { image?: string }).image
  return assetUrl(img)
}

export const events = (o: OuterMind = om()) => entriesOf(o, 'event').sort(byDateDesc)

export function notebooks(o: OuterMind = om()) {
  const all = entriesOf(o, 'notebook').sort((a, b) => a.data.title.localeCompare(b.data.title))
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

/** A collection's intro: its body without the table-of-contents heading and link-only lines. */
export function collectionIntro(c: Entry<'collection'>): string {
  const lines = c.body.split('\n')
  const out: string[] = []
  let skipping = false
  for (const line of lines) {
    if (/^#{1,6}\s+(table of )?contents\s*$/i.test(line)) {
      skipping = true
      continue
    }
    if (skipping && /^#{1,6}\s/.test(line)) skipping = false
    const linkOnly = /^\s*(?:[-*+]\s+|\d+\.\s+)?\[\[[^\]]+\]\]\s*$/.test(line)
    if (linkOnly) continue
    if (skipping && line.trim()) skipping = false
    out.push(line)
  }
  // drop a leading `# Title` that repeats the book's name
  return out.join('\n').replace(/^\s*#\s+.*\n/, '')
}
