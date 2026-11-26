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
  hrefOf,
  loadOuterMind,
  locate,
  mdToString,
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

export const folderHref = (f: Folder) => (f.notebook ? wikiPath(f.notebook) : `/${f.path}/`)

/** Breadcrumb: Home › folder › … for a public/ path. */
export function crumbs(path: string, o: OuterMind = om()) {
  const t = tree(o)
  const out: { label: string; href: string }[] = [{ label: 'Home', href: '/' }]
  let cur = t
  for (const p of path.split('/').filter(Boolean)) {
    const next = cur.folders.find((f) => f.name === p)
    if (!next) break
    out.push({ label: next.notebook ? next.notebook.data.title : next.name, href: folderHref(next) })
    cur = next
  }
  return out
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
    if (!(loc.site === 'notebooks' && !o.entries.some((x) => x.type === 'notebook'))) {
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
