/**
 * Wiki data: a raw view of everything in the outer mind's public/ folder, through @om/content.
 * Every entry has a page at its path in public/ (without .md; a notebook at its folder), and the
 * same text raw at <path>.md.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import GithubSlugger from 'github-slugger'
import {
  backlinks,
  byDateDesc,
  type Entry,
  entriesOf,
  hasNotebooks,
  hrefOf,
  loadOuterMind,
  locate,
  mdToString,
  notebookList,
  type OuterMind,
  outgoing,
  parseMarkdown,
  readingMinutes,
  renderMarkdown,
  siteBase,
  siteIdOf,
  splitDigest,
  wikiPath,
} from '@om/content'

export const om = () => loadOuterMind()
export const SITE = 'wiki' as const

/** Markdown for the wiki: every [[link]] goes to the linked entry's wiki page. */
export const md = (text: string, o: OuterMind = om()) =>
  renderMarkdown(text, { om: o, site: SITE, linkFor: (e) => wikiPath(e) })

export function names(o: OuterMind = om()) {
  const sites = o.site?.data.sites ?? []
  const find = (id: string) => sites.find((s) => siteIdOf(s.name) === id)
  return {
    hub: find('hub')?.title ?? 'The Open Machine',
    hubUrl: siteBase(o, 'hub'),
    wiki: find('wiki')?.title ?? 'Outer Mind',
    base: siteBase(o, 'wiki'),
  }
}

// ---------------------------------------------------------------- folders

export interface Folder {
  /** Path in public/, e.g. "pages/hub" ('' = the root). */
  path: string
  name: string
  folders: Folder[]
  entries: Entry[]
  /** A notebook folder is shown as its notebook (index.md) page. */
  notebook?: Entry
}

/** The folder tree of public/ (entries only; assets are listed on /assets/). */
export function tree(o: OuterMind = om()): Folder {
  const root: Folder = { path: '', name: '', folders: [], entries: [] }
  const get = (path: string): Folder => {
    if (!path) return root
    const parts = path.split('/')
    let cur = root
    let acc = ''
    for (const p of parts) {
      acc = acc ? `${acc}/${p}` : p
      let next = cur.folders.find((f) => f.name === p)
      if (!next) {
        next = { path: acc, name: p, folders: [], entries: [] }
        cur.folders.push(next)
      }
      cur = next
    }
    return cur
  }
  for (const e of o.entries) {
    const dir = e.file.includes('/') ? e.file.slice(0, e.file.lastIndexOf('/')) : ''
    if (e.type === 'notebook') get(dir).notebook = e
    else get(dir).entries.push(e)
  }
  const sort = (f: Folder) => {
    f.folders.sort((a, b) => a.name.localeCompare(b.name))
    f.entries.sort((a, b) => a.data.title.localeCompare(b.data.title, 'en', { sensitivity: 'base' }))
    f.folders.forEach(sort)
  }
  sort(root)
  return root
}

export function allFolders(f: Folder, out: Folder[] = []): Folder[] {
  for (const c of f.folders) {
    out.push(c)
    allFolders(c, out)
  }
  return out
}

/** Folder pages: every folder except notebook folders (those are the notebook's page). */
export const folderPages = (o: OuterMind = om()) => allFolders(tree(o)).filter((f) => !f.notebook)

/** Wiki path, with bespoke notebooks (their file is not under public/) at /notebooks/<slug>. */
export function notePath(e: Entry): string {
  if (e.type === 'notebook' && !e.file.startsWith('notebooks/')) return `/notebooks/${e.slug}`
  return wikiPath(e)
}

export const folderHref = (f: Folder) => (f.notebook ? notePath(f.notebook) : `/${f.path}/`)

/**
 * The folders the wiki lists. These are presentation groups, not the raw public/ folders:
 * Settings (site.md), Assets and Pages are not listed. About is the page entries; Research
 * is the notebooks. Order is fixed.
 */
export const SECTIONS = [
  { id: 'about', label: 'About', href: '/about/' },
  { id: 'concepts', label: 'Concepts', href: '/concepts/' },
  { id: 'events', label: 'Events', href: '/events/' },
  { id: 'media', label: 'Media', href: '/media/' },
  { id: 'research', label: 'Research', href: '/research/' },
  { id: 'projects', label: 'Projects', href: '/projects/' },
] as const

export type SectionId = (typeof SECTIONS)[number]['id']

export interface WikiSection {
  id: SectionId
  label: string
  href: string
  /** Notes listed on the section's index. */
  entries: Entry[]
  /** Nested folders for the explorer (a notebook, with its sections inside). */
  folders: Folder[]
}

const byTitle = (a: Entry, b: Entry) => a.data.title.localeCompare(b.data.title, 'en', { sensitivity: 'base' })

/** Notebooks as the wiki sees them. A bespoke notebook gets a real wiki path. */
export function wikiNotebooks(o: OuterMind = om()): Entry<'notebook'>[] {
  return notebookList(o)
    .map((n) => (n.file.startsWith('notebooks/') ? n : { ...n, file: `notebooks/${n.slug}/index.md` }))
    .sort((a, b) => Number(b.data.framework) - Number(a.data.framework) || byTitle(a, b))
}

export function sectionIdOf(e: Entry): SectionId | undefined {
  switch (e.type) {
    case 'page':
      return 'about'
    case 'concept':
      return 'concepts'
    case 'event':
      return 'events'
    case 'transmission':
    case 'collection':
    case 'media':
      return 'media'
    case 'notebook':
    case 'section':
      return 'research'
    case 'project':
      return 'projects'
    default:
      return undefined
  }
}

export function wikiSections(o: OuterMind = om()): WikiSection[] {
  const notebooks = wikiNotebooks(o)
  const researchFolders: Folder[] = notebooks.map((n) => ({
    path: `notebooks/${n.slug}`,
    name: n.data.title,
    folders: [],
    entries: n.data.sections.map((s) => o.bySlug.get(s)).filter((e): e is Entry => !!e),
    notebook: n,
  }))
  const byId = new Map<SectionId, WikiSection>([
    ['about', { id: 'about', label: 'About', href: '/about/', entries: entriesOf(o, 'page').sort(byTitle), folders: [] }],
    ['concepts', { id: 'concepts', label: 'Concepts', href: '/concepts/', entries: entriesOf(o, 'concept').sort(byTitle), folders: [] }],
    ['events', { id: 'events', label: 'Events', href: '/events/', entries: entriesOf(o, 'event').sort(byTitle), folders: [] }],
    [
      'media',
      {
        id: 'media',
        label: 'Media',
        href: '/media/',
        entries: [...entriesOf(o, 'transmission'), ...entriesOf(o, 'collection'), ...entriesOf(o, 'media')].sort(byTitle),
        folders: [],
      },
    ],
    ['research', { id: 'research', label: 'Research', href: '/research/', entries: notebooks, folders: researchFolders }],
    ['projects', { id: 'projects', label: 'Projects', href: '/projects/', entries: entriesOf(o, 'project').sort(byTitle), folders: [] }],
  ])
  return SECTIONS.map((s) => byId.get(s.id)!)
}

export function sectionCount(s: WikiSection): number {
  const nest = (f: Folder): number => (f.notebook ? 1 : 0) + f.entries.length + f.folders.reduce((n, c) => n + nest(c), 0)
  // Research lists its notebooks as entries and again as folders; count the folders, which include sections.
  if (s.id === 'research') return s.folders.reduce((n, f) => n + nest(f), 0)
  return s.entries.length + s.folders.reduce((n, f) => n + nest(f), 0)
}

/** Display name of a public/ folder: a section label where one matches, else the folder's own name. */
export function folderLabel(f: Folder, o: OuterMind = om()): string {
  if (f.notebook) return f.notebook.data.title
  return wikiSections(o).find((s) => s.href === `/${f.path}/`)?.label ?? f.name
}

/** Breadcrumb: Home › folder › … for a public/ path. */
export function crumbs(path: string, o: OuterMind = om()) {
  const t = tree(o)
  const out: { label: string; href: string }[] = [{ label: 'Home', href: '/' }]
  let cur = t
  for (const p of path.split('/').filter(Boolean)) {
    const next = cur.folders.find((f) => f.name === p)
    if (!next) break
    out.push({ label: folderLabel(next, o), href: folderHref(next) })
    cur = next
  }
  return out
}

/** Breadcrumb for a note: Home › its section › its notebook, when it has one. */
export function entryCrumbs(e: Entry, o: OuterMind = om()) {
  const id = sectionIdOf(e)
  const section = id && wikiSections(o).find((s) => s.id === id)
  if (!section) return crumbs(dirOf(e), o)
  const out = [
    { label: 'Home', href: '/' },
    { label: section.label, href: section.href },
  ]
  if (e.type === 'section') {
    const nb = wikiNotebooks(o).find((n) => n.slug === (e as Entry<'section'>).data.notebook)
    if (nb) out.push({ label: nb.data.title, href: notePath(nb) })
  }
  return out
}

// ---------------------------------------------------------------- graph

export interface GraphNode {
  id: string
  title: string
  href: string
  group: SectionId
}
export interface GraphLink {
  source: string
  target: string
}
export interface GraphData {
  nodes: GraphNode[]
  links: GraphLink[]
}

const graphs = new WeakMap<OuterMind, GraphData>()

/** Every note in the six sections, and an undirected link wherever one resolves an outgoing slug. */
export function fullGraph(o: OuterMind = om()): GraphData {
  const cached = graphs.get(o)
  if (cached) return cached
  const sections = wikiSections(o)
  const group = new Map<string, SectionId>()
  const entries: Entry[] = []
  const seen = new Set<string>()
  const add = (e: Entry, id: SectionId) => {
    if (seen.has(e.slug)) return
    seen.add(e.slug)
    group.set(e.slug, id)
    entries.push(e)
  }
  for (const s of sections) {
    for (const e of s.entries) add(e, s.id)
    const walk = (folders: Folder[]) => {
      for (const f of folders) {
        if (f.notebook) add(f.notebook, s.id)
        for (const e of f.entries) add(e, s.id)
        walk(f.folders)
      }
    }
    walk(s.folders)
  }
  const nodes: GraphNode[] = entries.map((e) => ({
    id: e.slug,
    title: e.data.title,
    href: notePath(e),
    group: group.get(e.slug)!,
  }))
  const linked = new Set<string>()
  const links: GraphLink[] = []
  for (const e of entries) {
    for (const target of outgoing(e)) {
      if (!seen.has(target) || target === e.slug) continue
      const [a, b] = e.slug < target ? [e.slug, target] : [target, e.slug]
      const key = `${a}\0${b}`
      if (linked.has(key)) continue
      linked.add(key)
      links.push({ source: a, target: b })
    }
  }
  const data = { nodes, links }
  graphs.set(o, data)
  return data
}

/** The focus note, the notes it shares a link with, and the links among them. */
export function localGraph(focus: string, g: GraphData): GraphData | undefined {
  if (!g.nodes.some((n) => n.id === focus)) return undefined
  const keep = new Set<string>([focus])
  for (const l of g.links) {
    if (l.source === focus) keep.add(l.target)
    if (l.target === focus) keep.add(l.source)
  }
  return {
    nodes: g.nodes.filter((n) => keep.has(n.id)),
    links: g.links.filter((l) => keep.has(l.source) && keep.has(l.target)),
  }
}

export const dirOf = (e: Entry) => (e.type === 'notebook' ? e.file.split('/').slice(0, 1).join('/') : e.file.split('/').slice(0, -1).join('/'))

// ---------------------------------------------------------------- pages

export function rawFile(e: Entry, o: OuterMind = om()): string {
  return readFileSync(join(o.publicDir, e.file), 'utf8')
}

/** Headings (h2–h4) of a body, with the ids rehype-slug gives them. */
export function toc(body: string) {
  const slugger = new GithubSlugger()
  const out: { depth: number; text: string; id: string }[] = []
  for (const n of parseMarkdown(splitDigest(body).intro + '\n' + splitDigest(body).digest).children) {
    if (n.type !== 'heading') continue
    const text = mdToString(n)
    const id = slugger.slug(text)
    if (n.depth >= 2 && n.depth <= 4) out.push({ depth: n.depth, text, id })
  }
  return out
}

export const minutes = (e: Entry) => readingMinutes(e.body)

/** Where else the entry is shown: its page on the hub, media shop or notebooks site. */
export function seenOn(e: Entry, o: OuterMind = om()): { site: string; href: string }[] {
  const out: { site: string; href: string }[] = []
  const label: Record<string, string> = { hub: 'the hub', mediashop: 'the media shop', notebooks: 'the notebooks' }
  const loc = locate(o, e)
  if (loc.site !== 'wiki' && !(e.type === 'page' && siteIdOf((e as Entry<'page'>).data.site) !== 'hub')) {
    if (!(loc.site === 'notebooks' && !hasNotebooks(o))) {
      out.push({ site: label[loc.site], href: hrefOf(o, e, 'wiki') })
    }
  }
  if (e.type === 'event') out.push({ site: 'the hub', href: `${siteBase(o, 'hub')}/#events` })
  if (e.type === 'media') out.push({ site: 'the hub', href: `${siteBase(o, 'hub')}/#media` })
  return out
}

/** Every frontmatter field, for the facts table. Slugs link to wiki pages, assets to files. */
export function facts(e: Entry, o: OuterMind = om()) {
  const skip = new Set(['title', 'summary', 'tags', 'date', 'updated', 'type'])
  const link = (v: string): { text: string; href?: string } => {
    const target = o.bySlug.get(v)
    if (target) return { text: target.data.title, href: wikiPath(target) }
    if (v.startsWith('assets/')) return { text: v, href: `/${v}` }
    if (/^https?:|^mailto:/.test(v)) return { text: v, href: v }
    return { text: v }
  }
  const rows: { key: string; values: { text: string; href?: string }[] }[] = []
  for (const [key, value] of Object.entries(e.data as Record<string, unknown>)) {
    if (skip.has(key) || value === undefined) continue
    if (key === 'slug') {
      rows.push({ key, values: [{ text: String(value) }] })
      continue
    }
    const vals: { text: string; href?: string }[] = []
    const add = (v: unknown, prefix = '') => {
      if (v === null || v === undefined) return
      if (Array.isArray(v)) v.forEach((x) => add(x, prefix))
      else if (typeof v === 'object') for (const [k, x] of Object.entries(v)) add(x, `${prefix}${k}: `)
      else {
        const l = link(String(v))
        vals.push({ text: prefix + l.text, href: l.href })
      }
    }
    add(value)
    if (vals.length) rows.push({ key, values: vals })
  }
  return rows
}

export function backlinksOf(e: Entry, o: OuterMind = om()) {
  return (backlinks(o).get(e.slug) ?? []).sort((a, b) => a.data.title.localeCompare(b.data.title))
}

// ---------------------------------------------------------------- tags

export function tags(o: OuterMind = om()) {
  const map = new Map<string, Entry[]>()
  for (const e of o.entries) for (const t of e.data.tags) map.set(t, [...(map.get(t) ?? []), e])
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([tag, list]) => ({ tag, entries: list.sort(byDateDesc) }))
}

// ---------------------------------------------------------------- LLM files

/** /llms.txt: every page (title, summary, URL of its raw markdown), grouped by folder. */
export function llmsTxt(o: OuterMind = om()): string {
  const n = names(o)
  const lines = [`# ${n.wiki}`, '', `> ${o.site?.data.tagline ?? n.hub}. Every entry of the outer mind, as markdown.`, '']
  lines.push(`Full text of every entry: ${n.base}/llms-full.txt`, `Index (JSON): ${n.base}/index.json`, '')
  const groups = new Map<string, Entry[]>()
  for (const e of o.entries) {
    const g = dirOf(e) || '(root)'
    groups.set(g, [...(groups.get(g) ?? []), e])
  }
  for (const g of [...groups.keys()].sort()) {
    lines.push(`## ${g}`, '')
    for (const e of groups.get(g)!.sort((a, b) => a.data.title.localeCompare(b.data.title))) {
      lines.push(`- [${e.data.title}](${n.base}${wikiPath(e)}.md)${e.data.summary ? `: ${e.data.summary.replace(/\s+/g, ' ')}` : ''}`)
    }
    lines.push('')
  }
  return lines.join('\n')
}

/** /llms-full.txt: every entry's file, concatenated. */
export function llmsFull(o: OuterMind = om()): string {
  const entries = [...o.entries].sort((a, b) => a.file.localeCompare(b.file))
  return entries.map((e) => `<!-- public/${e.file} · ${names(o).base}${wikiPath(e)} -->\n${rawFile(e, o).trim()}\n`).join('\n')
}

/** /index.json: path, type, title, summary, date and links of every entry. */
export function indexJson(o: OuterMind = om()) {
  return [...o.entries]
    .sort((a, b) => a.file.localeCompare(b.file))
    .map((e) => ({
      path: wikiPath(e),
      type: e.type,
      title: e.data.title,
      ...(e.data.summary ? { summary: e.data.summary } : {}),
      date: e.data.date,
      ...(e.data.updated ? { updated: e.data.updated } : {}),
      links: outgoing(e).filter((s) => o.bySlug.has(s)).map((s) => wikiPath(o.bySlug.get(s)!)),
    }))
}

/** How many kinds of markdown element a body uses (for the style guide's "richest body"). */
export function richness(body: string): number {
  const kinds = [/^#{1,6}\s/m, /^>\s/m, /^```/m, /^\s*[-*]\s/m, /^\s*\d+\.\s/m, /!\[/, /\[\^/, /^\|/m]
  return kinds.filter((r) => r.test(body)).length
}
