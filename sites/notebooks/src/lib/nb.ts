/** Notebooks data, through @om/content. */
import { type Entry, entriesOf, loadOuterMind, type OuterMind, outgoing, renderMarkdown, siteBase, siteIdOf } from '@om/content'

export const om = () => loadOuterMind()
export const SITE = 'notebooks' as const

export function notebooks(o: OuterMind = om()) {
  const all = entriesOf(o, 'notebook').sort((a, b) => a.data.title.localeCompare(b.data.title))
  return { frameworks: all.filter((n) => n.data.framework), working: all.filter((n) => !n.data.framework) }
}

export function sectionsOf(n: Entry<'notebook'>, o: OuterMind = om()): Entry<'section'>[] {
  return n.data.sections.map((s) => o.bySlug.get(s)).filter((e): e is Entry<'section'> => e?.type === 'section')
}

export const concepts = (o: OuterMind = om()) =>
  entriesOf(o, 'concept').sort((a, b) => a.data.title.localeCompare(b.data.title, 'en', { sensitivity: 'base' }))

/** Concepts a notebook links to (from its main text and its sections), in order of first mention. */
export function conceptsUsed(n: Entry<'notebook'>, o: OuterMind = om()): Entry<'concept'>[] {
  const seen = new Set<string>()
  const out: Entry<'concept'>[] = []
  for (const e of [n, ...sectionsOf(n, o)]) {
    for (const s of outgoing(e)) {
      const c = o.bySlug.get(s)
      if (c?.type === 'concept' && !seen.has(s)) {
        seen.add(s)
        out.push(c as Entry<'concept'>)
      }
    }
  }
  return out
}

/** Notebooks that use a concept. */
export function notebooksUsing(c: Entry<'concept'>, o: OuterMind = om()) {
  return entriesOf(o, 'notebook').filter((n) => conceptsUsed(n, o).some((x) => x.slug === c.slug))
}

/** Markdown for the notebooks site: [[concept]] → /glossary#slug, other links to their site. */
export const md = (text: string, o: OuterMind = om()) => renderMarkdown(text, { om: o, site: SITE })

/** Section bodies sit under the section title (h2), so their own headings move down a level. */
export function demote(text: string): string {
  return text
    .split(/(```[\s\S]*?```)/g)
    .map((part, i) => (i % 2 ? part : part.replace(/^(#{1,5})(\s)/gm, '#$1$2')))
    .join('')
}

export function names(o: OuterMind = om()) {
  const sites = o.site?.data.sites ?? []
  const hub = sites.find((s) => siteIdOf(s.name) === 'hub')
  const self = sites.find((s) => siteIdOf(s.name) === 'notebooks')
  return { hub: hub?.title ?? 'The Open Machine', hubUrl: siteBase(o, 'hub'), title: self?.title ?? 'Research Notebooks' }
}

/** How many kinds of markdown element a body uses (for the style guide's "richest body"). */
export function richness(body: string): number {
  const kinds = [/^#{1,6}\s/m, /^>\s/m, /^```/m, /^\s*[-*]\s/m, /^\s*\d+\.\s/m, /!\[/, /\[\^/, /^\|/m]
  return kinds.filter((r) => r.test(body)).length
}
