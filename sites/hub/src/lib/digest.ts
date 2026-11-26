/**
 * Reads a quarterly's digest (the part after `<!-- digest … -->`), in the shape the outer mind's
 * CLAUDE.md defines: `## <Project>`, an optional `*Status: <s>*` line, then one list line per item:
 *   - 2026-07-14: text. *(project update)*          (bold when it is a status change)
 *   - [[slug|Title]]: type, facts
 * Lines in any other shape are kept and rendered as markdown.
 */
import type { Entry, OuterMind } from '@om/content'
import { entriesOf, renderMarkdown, splitDigest } from '@om/content'

export type DigestItem =
  | { kind: 'update'; date: string; text: string; statusChange: boolean }
  | { kind: 'entry'; entry?: Entry; title: string; type: string; facts: string }
  | { kind: 'other'; html: string }

export interface DigestSection {
  title: string
  project?: Entry<'project'>
  status?: string
  items: DigestItem[]
}

export function parseDigest(q: Entry<'quarterly'>, o: OuterMind): { intro: string; sections: DigestSection[] } {
  const { intro, digest } = splitDigest(q.body)
  const projects = entriesOf(o, 'project')
  const sections: DigestSection[] = []
  let cur: DigestSection | undefined
  for (const raw of digest.split('\n')) {
    const line = raw.trimEnd()
    if (!line.trim()) continue
    const h = line.match(/^##\s+(.*)$/)
    if (h) {
      const title = h[1].trim()
      cur = { title, project: projects.find((p) => p.data.title === title), items: [] }
      sections.push(cur)
      continue
    }
    if (!cur) continue
    const st = line.match(/^\*Status:\s*([^*]+)\*$/)
    if (st) {
      cur.status = st[1].trim()
      continue
    }
    const up = line.match(/^-\s+(\*\*)?(\d{4}-\d{2}-\d{2}):\s+(.*?)(\*\*)?\s*\*\(project update\)\*\s*$/)
    if (up) {
      cur.items.push({ kind: 'update', date: up[2], text: up[3].replace(/\*\*$/, ''), statusChange: Boolean(up[1]) })
      continue
    }
    const en = line.match(/^-\s+\[\[([^\]|]+)(?:\|([^\]]+))?\]\]:\s*([^,]+)(?:,\s*(.*))?$/)
    if (en) {
      const entry = o.bySlug.get(en[1].trim())
      cur.items.push({ kind: 'entry', entry, title: en[2] ?? entry?.data.title ?? en[1], type: en[3].trim(), facts: en[4] ?? '' })
      continue
    }
    cur.items.push({ kind: 'other', html: renderMarkdown(line.replace(/^-\s+/, ''), { om: o, site: 'hub' }) })
  }
  return { intro, sections }
}
