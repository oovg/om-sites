/**
 * `pnpm check`: validates every entry in the outer mind. Prints file + field for each problem,
 * a per-site count, and exits 1 on any error.
 */
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { assetRefs } from './assets.ts'
import { type Entry, entriesOf, type Issue, loadOuterMind, type OuterMind } from './load.ts'
import { wikilinkTargets } from './links.ts'
import { splitSections } from './markdown.ts'
import { SLOTS } from './slots.ts'
import { SUPPORTED_SCHEMA } from './version.ts'

function hasTool(cmd: string): boolean {
  try {
    execFileSync('which', [cmd], { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

const HTML_TAG = /<\/?[a-zA-Z][a-zA-Z0-9-]*(?:\s[^<>]*)?\/?>/
const STYLE_ATTR = /\b(?:class|style)\s*=/

/** Body with code spans, code blocks and HTML comments removed. */
function proseOnly(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`\n]*`/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
}

function stringsIn(v: unknown, path: string, out: [string, string][] = []): [string, string][] {
  if (typeof v === 'string') out.push([path, v])
  else if (Array.isArray(v)) v.forEach((x, i) => stringsIn(x, `${path}.${i}`, out))
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) stringsIn(x, path ? `${path}.${k}` : k, out)
  return out
}

export function runChecks(om: OuterMind): Issue[] {
  const issues: Issue[] = [...om.issues]
  const err = (e: Entry, field: string | undefined, message: string) =>
    issues.push({ level: 'error', file: `public/${e.file}`, field, message })
  const warn = (e: Entry, field: string | undefined, message: string) =>
    issues.push({ level: 'warning', file: `public/${e.file}`, field, message })
  const get = (slug: string) => om.bySlug.get(slug)

  if (om.schemaVersion !== undefined && om.schemaVersion !== SUPPORTED_SCHEMA) {
    issues.push({
      level: 'error',
      file: 'schemas.md',
      field: 'schema_version',
      message: `is ${om.schemaVersion}, but om-sites renders version ${SUPPORTED_SCHEMA}. Update packages/content (and SUPPORTED_SCHEMA in version.ts) for the new content model first.`,
    })
  }

  if (!hasTool('pandoc')) issues.push({ level: 'error', file: '(system)', message: 'pandoc is not installed: brew install pandoc typst' })
  if (!hasTool('typst')) issues.push({ level: 'error', file: '(system)', message: 'typst is not installed: brew install pandoc typst' })

  const pagePaths = new Map<string, Entry>()
  const opts = { om, site: 'wiki' as const }

  for (const e of om.entries) {
    const d = e.data as Record<string, any>

    // Links and assets
    for (const slug of wikilinkTargets(e.body)) if (!get(slug)) err(e, 'body', `[[${slug}]] links to no entry`)
    for (const ref of assetRefs(e)) {
      if (!existsSync(join(om.publicDir, ref))) err(e, undefined, `${ref} does not exist in public/`)
    }

    // No presentation in content
    const prose = proseOnly(e.body)
    const tag = prose.match(HTML_TAG)
    if (tag) err(e, 'body', `contains HTML (${tag[0].slice(0, 40)}); entries hold content only`)
    else if (STYLE_ATTR.test(prose)) err(e, 'body', 'contains a class= or style= attribute')
    for (const [path, s] of stringsIn(d, '')) {
      if (HTML_TAG.test(s) || STYLE_ATTR.test(s)) err(e, path, 'contains HTML or a class=/style= attribute')
    }

    // Slug-valued fields
    if (d.project && get(d.project)?.type !== 'project') err(e, 'project', `"${d.project}" is not a project`)
    if (d.in_mediashop && get(d.in_mediashop)?.type !== 'media') err(e, 'in_mediashop', `"${d.in_mediashop}" is not a media entry`)
    if (d.collection && get(d.collection)?.type !== 'collection') err(e, 'collection', `"${d.collection}" is not a collection`)
    for (const s of d.related ?? []) if (get(s)?.type !== 'concept') err(e, 'related', `"${s}" is not a concept`)
    for (const s of d.sources ?? []) if (!get(s)) err(e, 'sources', `"${s}" links to no entry`)

    switch (e.type) {
      case 'media': {
        if (d.files && d.edition_of) err(e, 'files', 'a media entry has files (a work) or edition_of (an edition), not both')
        if (!d.files && !d.edition_of) err(e, undefined, 'a media entry needs files (a work) or edition_of (an edition)')
        if (d.edition_of) {
          const t = get(d.edition_of)
          if (!t || (t.type !== 'transmission' && t.type !== 'collection')) {
            err(e, 'edition_of', `"${d.edition_of}" is not a transmission or a collection`)
          } else if (t.type === 'transmission' && (t.data as any).collection) {
            err(e, 'edition_of', `"${d.edition_of}" is an essay in a collection; only the book gets a media entry`)
          }
        }
        break
      }
      case 'collection': {
        for (const s of d.essays) {
          const t = get(s)
          if (t?.type !== 'transmission') err(e, 'essays', `"${s}" is not a transmission`)
          else if ((t.data as any).collection !== e.slug) err(e, 'essays', `"${s}" does not have collection: ${e.slug}`)
        }
        break
      }
      case 'transmission': {
        if (d.collection) {
          const c = get(d.collection)
          if (c?.type === 'collection' && !(c.data as any).essays.includes(e.slug)) {
            warn(e, 'collection', `not listed in ${d.collection}'s essays`)
          }
          if (d.in_mediashop) err(e, 'in_mediashop', 'an essay in a collection has no media entry of its own')
        }
        break
      }
      case 'project': {
        const updates = splitSections(e.body, opts).find((s) => s.heading.toLowerCase() === 'updates')
        if (updates) {
          const raw = e.body.slice(e.body.search(/^##\s+Updates\s*$/im)).split('\n').slice(1)
          for (const line of raw) {
            if (/^##\s/.test(line)) break
            if (line.trim().startsWith('-') && !/^\s*-\s+\d{4}-\d{2}-\d{2}:\s+\S/.test(line)) {
              warn(e, 'body', `update line should be "- YYYY-MM-DD: text": ${line.trim().slice(0, 60)}`)
            }
          }
        }
        break
      }
      case 'page': {
        const key = `${d.site} ${d.path}`
        const prior = pagePaths.get(key)
        if (prior) err(e, 'path', `"${d.path}" on ${d.site} is also used by public/${prior.file}`)
        else pagePaths.set(key, e)
        for (const s of splitSections(e.body, opts)) {
          if (s.heading && s.nodes.length === 0 && !SLOTS.includes(s.heading as any) && s.heading !== 'Hero') {
            err(e, 'body', `"## ${s.heading}" is empty but is not a slot name (${SLOTS.join(', ')})`)
          }
        }
        break
      }
      case 'notebook': {
        const folder = e.file.split('/')[1]
        for (const s of d.sections) {
          const sec = get(s)
          if (sec?.type !== 'section' || sec.file.split('/')[1] !== folder) {
            err(e, 'sections', `"${s}" is not a section file in notebooks/${folder}/`)
          }
        }
        break
      }
      case 'section': {
        const folder = e.file.split('/')[1]
        if (d.notebook !== folder) err(e, 'notebook', `is "${d.notebook}", but the section lives in notebooks/${folder}/`)
        break
      }
    }
  }

  if (!pagePaths.has('hub /')) issues.push({ level: 'error', file: 'public/pages/hub/', message: 'the hub has no page with path: /' })

  return issues
}

/** Entries shown per site, for the summary line. */
export function siteCounts(om: OuterMind): Record<string, number> {
  const n = (t: Parameters<typeof entriesOf>[1]) => entriesOf(om, t).length
  const hubPages = entriesOf(om, 'page').filter((p) => p.data.site === 'hub').length
  return {
    hub: hubPages + n('project') + n('quarterly') + n('transmission') + n('media') + n('collection') + n('event'),
    mediashop: n('media'),
    wiki: om.entries.length,
    notebooks: n('notebook') + n('section') + n('concept'),
  }
}

function main() {
  const om = loadOuterMind()
  const issues = runChecks(om)
  const errors = issues.filter((i) => i.level === 'error')
  const warnings = issues.filter((i) => i.level === 'warning')
  for (const i of [...errors, ...warnings]) {
    const where = i.field ? `${i.file} [${i.field}]` : i.file
    console.log(`${i.level === 'error' ? 'error  ' : 'warning'} ${where}: ${i.message}`)
  }
  const counts = siteCounts(om)
  const nb = entriesOf(om, 'notebook').length ? '' : ' (not built: no notebook yet)'
  console.log(`\nOUTER_MIND ${om.root}`)
  console.log(
    `entries: ${om.entries.length} · hub ${counts.hub} · mediashop ${counts.mediashop} · wiki ${counts.wiki} · notebooks ${counts.notebooks}${nb}`,
  )
  console.log(`${errors.length} error(s), ${warnings.length} warning(s)`)
  if (errors.length) process.exit(1)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main()
