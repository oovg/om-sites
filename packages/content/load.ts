/**
 * The only code that reads the outer mind. Reads `$OUTER_MIND/public`, parses frontmatter,
 * validates each entry against its schema and applies defaults.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { basename, join, relative, sep } from 'node:path'
import { parse as parseYaml } from 'yaml'
import { outerMindPath } from './config.ts'
import { type EntryType, type Fields, schemas } from './schemas.ts'

export interface Issue {
  level: 'error' | 'warning'
  /** Path relative to the outer mind, e.g. `public/media/x.md`. */
  file: string
  field?: string
  message: string
}

export interface Entry<T extends EntryType = EntryType> {
  type: T
  slug: string
  /** Path relative to `public/`, with forward slashes. */
  file: string
  data: Fields<T>
  /** Markdown body, verbatim (frontmatter removed). */
  body: string
}

export interface OuterMind {
  root: string
  publicDir: string
  assetsDir: string
  schemaVersion: number | undefined
  entries: Entry[]
  bySlug: Map<string, Entry>
  site: Entry<'site'> | undefined
  issues: Issue[]
}

/** Folder → type, and the slug a file there must carry. */
function expected(rel: string): { type: EntryType; slug: string } | { error: string } {
  const parts = rel.split('/')
  const name = basename(rel, '.md')
  if (rel === 'site.md') return { type: 'site', slug: 'site' }
  const [top] = parts
  const flat: Record<string, EntryType> = {
    projects: 'project',
    updates: 'quarterly',
    transmissions: 'transmission',
    media: 'media',
    collections: 'collection',
    events: 'event',
    concepts: 'concept',
  }
  if (flat[top] && parts.length === 2) return { type: flat[top], slug: name }
  if (top === 'pages' && parts.length === 3) return { type: 'page', slug: name }
  if (top === 'notebooks' && parts.length === 3) {
    return name === 'index' ? { type: 'notebook', slug: parts[1] } : { type: 'section', slug: name }
  }
  return { error: `unexpected location: no entry type lives at public/${rel}` }
}

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir).sort()) {
    if (name.startsWith('.')) continue
    const full = join(dir, name)
    if (statSync(full).isDirectory()) walk(full, out)
    else out.push(full)
  }
  return out
}

/** Splits `---\nyaml\n---\nbody`. */
function splitFrontmatter(text: string): { yaml: string; body: string } | undefined {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  return m ? { yaml: m[1], body: m[2] } : undefined
}

/** Drops `key: null` (e.g. `field:  # TODO`) so optional fields read as absent. */
function dropNulls(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== null && v !== undefined))
}

let cache: { key: string; value: OuterMind } | undefined

/** Loads and validates the outer mind. Cached until a file in `public/` changes. */
export function loadOuterMind(): OuterMind {
  const root = outerMindPath()
  const publicDir = join(root, 'public')
  const assetsDir = join(publicDir, 'assets')
  if (!existsSync(publicDir)) throw new Error(`No public/ folder in OUTER_MIND (${root}).`)

  const files = walk(publicDir).filter((f) => !f.startsWith(assetsDir + sep))
  const schemasFile = join(root, 'schemas.md')
  const key = [root, ...[...files, schemasFile].map((f) => (existsSync(f) ? `${f}:${statSync(f).mtimeMs}` : f))].join('|')
  if (cache?.key === key) return cache.value

  const issues: Issue[] = []
  const entries: Entry[] = []
  const bySlug = new Map<string, Entry>()

  let schemaVersion: number | undefined
  if (existsSync(schemasFile)) {
    const first = readFileSync(schemasFile, 'utf8').split('\n')[0]
    const m = first.match(/^schema_version:\s*(\d+)\s*$/)
    if (m) schemaVersion = Number(m[1])
    else issues.push({ level: 'error', file: 'schemas.md', message: 'first line must be `schema_version: <n>`' })
  } else issues.push({ level: 'error', file: 'schemas.md', message: 'missing' })

  for (const full of files) {
    const rel = relative(publicDir, full).split(sep).join('/')
    const file = `public/${rel}`
    if (!rel.endsWith('.md')) {
      issues.push({ level: 'error', file, message: 'only .md entries (and files under assets/) may live in public/' })
      continue
    }
    const exp = expected(rel)
    if ('error' in exp) {
      issues.push({ level: 'error', file, message: exp.error })
      continue
    }
    const split = splitFrontmatter(readFileSync(full, 'utf8'))
    if (!split) {
      issues.push({ level: 'error', file, message: 'no YAML frontmatter' })
      continue
    }
    let raw: unknown
    try {
      raw = parseYaml(split.yaml, { schema: 'core' })
    } catch (e) {
      issues.push({ level: 'error', file, message: `invalid YAML: ${(e as Error).message.split('\n')[0]}` })
      continue
    }
    if (!raw || typeof raw !== 'object') {
      issues.push({ level: 'error', file, message: 'frontmatter is empty' })
      continue
    }
    const fm = dropNulls(raw as Record<string, unknown>)
    if (fm.type !== exp.type) {
      issues.push({ level: 'error', file, field: 'type', message: `is "${fm.type}", but files in this folder are "${exp.type}"` })
      continue
    }
    const result = schemas[exp.type].safeParse(fm)
    if (!result.success) {
      for (const iss of result.error.issues) {
        issues.push({ level: 'error', file, field: iss.path.join('.') || undefined, message: iss.message })
      }
      continue
    }
    const data = result.data as Fields<EntryType>
    if (data.slug !== exp.slug) {
      issues.push({ level: 'error', file, field: 'slug', message: `is "${data.slug}", but the file name says "${exp.slug}"` })
    }
    const prior = bySlug.get(data.slug)
    if (prior) {
      issues.push({ level: 'error', file, field: 'slug', message: `"${data.slug}" is also used by public/${prior.file}` })
      continue
    }
    const entry: Entry = { type: exp.type, slug: data.slug, file: rel, data, body: split.body }
    entries.push(entry)
    bySlug.set(entry.slug, entry)
  }

  const site = entries.find((e) => e.type === 'site') as Entry<'site'> | undefined
  if (!site) issues.push({ level: 'error', file: 'public/site.md', message: 'missing' })

  const value: OuterMind = { root, publicDir, assetsDir, schemaVersion, entries, bySlug, site, issues }
  cache = { key, value }
  return value
}

/** All entries of one type. */
export function entriesOf<T extends EntryType>(om: OuterMind, type: T): Entry<T>[] {
  return om.entries.filter((e): e is Entry<T> => e.type === type)
}

/** Newest first, by `date`, then title. */
export function byDateDesc<E extends Entry>(a: E, b: E): number {
  return b.data.date.localeCompare(a.data.date) || a.data.title.localeCompare(b.data.title)
}
