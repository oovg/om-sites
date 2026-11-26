/**
 * Media editions: for every `media` entry with `edition_of`, generate `<slug>.md`, `<slug>.epub` and
 * `<slug>.pdf` (pandoc; PDF via typst) from the transmission, or from a whole book (intro, contents,
 * every essay in `essays` order) — one file per format. Covers missing from the entry are generated
 * (typst → SVG → PNG with sharp). Results are cached under `.cache/editions/` by a hash of every
 * input, including the templates, the design tokens, the fonts and the tool versions.
 */
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { stringify as yamlStringify } from 'yaml'
import { assetRefs } from './assets.ts'
import { collectionIntro } from './collections.ts'
import { WORKSPACE } from './config.ts'
import type { Entry, OuterMind } from './load.ts'
import { siteBase } from './links.ts'
import { resolveWikilinks } from './markdown.ts'

// Paths from the workspace root, so they hold inside Astro's bundle too.
const HERE = join(WORKSPACE, 'packages/content')
const TEMPLATES = join(HERE, 'templates')
const TOKENS = join(WORKSPACE, 'packages/ui/tokens.css')
const FONTS = join(WORKSPACE, 'packages/ui/fonts/mediashop')
const CACHE = process.env.OM_EDITIONS_CACHE || join(WORKSPACE, '.cache/editions')

/** Default edition language: the content model has no language field yet. */
export const EDITION_LANGUAGE = 'en'

export type Format = 'epub' | 'pdf' | 'md'
export const FORMAT_TYPES: Record<Format, string> = {
  epub: 'application/epub+zip',
  pdf: 'application/pdf',
  md: 'text/markdown',
}

export interface EditionFile {
  format: Format
  /** Absolute path on disk (in the cache). */
  path: string
  /** URL path on the mediashop, e.g. /media/<slug>/<slug>.epub */
  href: string
}

export interface Edition {
  media: Entry<'media'>
  source: Entry<'transmission'> | Entry<'collection'>
  files: EditionFile[]
  /** Generated cover (absent when the entry has its own `cover`). */
  cover?: { path: string; href: string }
  dir: string
}

/** `--ed-*` values from packages/ui/tokens.css. */
export function editionTokens(): Record<string, string> {
  const css = readFileSync(TOKENS, 'utf8')
  const out: Record<string, string> = {}
  for (const m of css.matchAll(/--(ed-[a-z0-9-]+)\s*:\s*([^;]+);/g)) out[m[1]] = m[2].trim().replace(/^'|'$/g, '')
  return out
}

const sha = (s: string | Buffer) => createHash('sha256').update(s).digest('hex')

function dirHash(dir: string): string {
  if (!existsSync(dir)) return ''
  return sha(
    readdirSync(dir)
      .sort()
      .map((f) => `${f}:${sha(readFileSync(join(dir, f)))}`)
      .join('|'),
  )
}

let toolVersions: string | undefined
function tools(): string {
  toolVersions ??= [
    execFileSync('pandoc', ['--version']).toString().split('\n')[0],
    execFileSync('typst', ['--version']).toString().trim(),
  ].join(' | ')
  return toolVersions
}

/** The transmission or collection an edition is made from. */
export function editionSource(om: OuterMind, m: Entry<'media'>) {
  const s = m.data.edition_of ? om.bySlug.get(m.data.edition_of) : undefined
  return s && (s.type === 'transmission' || s.type === 'collection')
    ? (s as Entry<'transmission'> | Entry<'collection'>)
    : undefined
}

function pieces(om: OuterMind, src: Entry<'transmission'> | Entry<'collection'>): Entry<'transmission'>[] {
  if (src.type !== 'collection') return []
  return (src as Entry<'collection'>).data.essays
    .map((s) => om.bySlug.get(s))
    .filter((e): e is Entry<'transmission'> => e?.type === 'transmission')
}

/** Shift every markdown heading down a level (outside code), so book chapters are the top level. */
function demote(md: string): string {
  return md
    .split(/(```[\s\S]*?```)/g)
    .map((part, i) => (i % 2 ? part : part.replace(/^(#{1,5})(\s)/gm, '#$1$2')))
    .join('')
}

/**
 * Markdown prepared for pandoc: links resolved to absolute URLs, local images kept as `assets/…`
 * (found through --resource-path), remote images turned into links so the build never fetches them.
 */
function prepare(om: OuterMind, md: string): string {
  const base = siteBase(om, 'mediashop')
  return resolveWikilinks(md, { om, site: 'mediashop' })
    .replace(/\]\(<(\/[^>]*)>\)/g, (_m, p: string) => `](<${base}${p}>)`)
    .replace(/!\[([^\]]*)\]\((https?:[^)\s]+)\)/g, (_m, alt: string, url: string) => `[${alt || 'Image'}](${url})`)
}

function authors(m: Entry<'media'>, src: Entry, om: OuterMind): string[] {
  const a = m.data.author ?? (src.data as { author?: string[] }).author
  if (a?.length) return a
  const hub = om.site?.data.sites.find((s) => s.name.toLowerCase() === 'hub')
  return [hub?.title ?? 'The Open Machine']
}

/** The one markdown document every format is made from. */
function sourceMarkdown(om: OuterMind, m: Entry<'media'>, src: Entry<'transmission'> | Entry<'collection'>) {
  const meta = {
    title: m.data.title,
    ...(m.data.subtitle ? { subtitle: m.data.subtitle } : {}),
    author: authors(m, src, om),
    date: src.data.date,
    lang: EDITION_LANGUAGE,
    ...(m.data.licence || om.site?.data.licence ? { rights: m.data.licence ?? om.site?.data.licence } : {}),
    identifier: `urn:om:${m.slug}`,
  }
  let body: string
  if (src.type === 'collection') {
    const list = pieces(om, src)
    const intro = prepare(om, collectionIntro(src as Entry<'collection'>)).trim()
    const toc = ['# Contents {.unnumbered}', '', ...list.map((p, i) => `${i + 1}. [${p.data.title}](#${p.slug})`)].join('\n')
    const chapters = list.map((p) => `# ${p.data.title} {#${p.slug}}\n\n${demote(prepare(om, p.body)).trim()}`)
    body = [intro, toc, ...chapters].filter(Boolean).join('\n\n')
  } else {
    body = prepare(om, src.body).trim()
  }
  return { meta, md: `---\n${yamlStringify(meta)}---\n\n${body}\n` }
}

/** Every input that can change the files, hashed. */
function cacheKey(om: OuterMind, m: Entry<'media'>, src: Entry<'transmission'> | Entry<'collection'>): string {
  const entries: Entry[] = [m, src, ...pieces(om, src)]
  const assets = [...new Set(entries.flatMap(assetRefs))].sort().map((r) => {
    const f = join(om.publicDir, r)
    return `${r}:${existsSync(f) ? sha(readFileSync(f)) : 'missing'}`
  })
  return sha(
    JSON.stringify({
      entries: entries.map((e) => [e.file, e.data, e.body]),
      assets,
      base: siteBase(om, 'mediashop'),
      templates: dirHash(TEMPLATES),
      tokens: sha(readFileSync(TOKENS)),
      fonts: dirHash(FONTS),
      code: sha(readFileSync(join(HERE, 'editions.ts'))),
      tools: tools(),
    }),
  ).slice(0, 16)
}

function run(cmd: string, args: string[], env: Record<string, string>) {
  try {
    execFileSync(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, ...env } })
  } catch (e) {
    const err = e as { stderr?: Buffer; message: string }
    throw new Error(`${cmd} failed: ${err.stderr?.toString().trim() || err.message}`)
  }
}

/** @font-face rules for the embedded fonts (pandoc puts them in the EPUB's fonts/ folder). */
function fontFaces(): string {
  const families: Record<string, string> = { 'instrument-sans': 'Instrument Sans', newsreader: 'Newsreader' }
  return readdirSync(FONTS)
    .filter((f) => f.endsWith('.ttf'))
    .map((f) => {
      const m = f.match(/^(.*?)-latin-(\d+)-(normal|italic)\.ttf$/)
      if (!m || !families[m[1]]) return ''
      return `@font-face { font-family: '${families[m[1]]}'; font-weight: ${m[2]}; font-style: ${m[3]}; src: url('../fonts/${f}'); }`
    })
    .filter(Boolean)
    .join('\n')
}

function epubCss(t: Record<string, string>): string {
  const css = readFileSync(join(TEMPLATES, 'epub.css'), 'utf8').replace(/var\(--(ed-[a-z0-9-]+)\)/g, (_m, k) => t[k] ?? '')
  return `${fontFaces()}\n${css}`
}

function typstHeader(t: Record<string, string>): string {
  return readFileSync(join(TEMPLATES, 'edition-header.typ'), 'utf8').replace(/\{\{(ed-[a-z0-9-]+)\}\}/g, (_m, k) => t[k] ?? '')
}

async function makeCover(dir: string, m: Entry<'media'>, who: string[], t: Record<string, string>, om: OuterMind, epoch: string) {
  const svg = join(dir, 'cover.svg')
  const kicker = om.site?.data.sites.find((s) => s.name.toLowerCase() === 'hub')?.title ?? 'The Open Machine'
  const inputs: Record<string, string> = {
    title: m.data.title,
    subtitle: m.data.subtitle ?? '',
    author: who.join(', '),
    kicker,
    bg: t['ed-cover-bg'],
    fg: t['ed-cover-fg'],
    muted: t['ed-cover-muted'],
    rule: t['ed-cover-rule'],
    heading: t['ed-font-heading'],
    body: t['ed-font-body'],
  }
  run(
    'typst',
    [
      'compile',
      '--format', 'svg',
      '--font-path', FONTS,
      '--ignore-system-fonts',
      ...Object.entries(inputs).flatMap(([k, v]) => ['--input', `${k}=${v}`]),
      join(TEMPLATES, 'cover.typ'),
      svg,
    ],
    { SOURCE_DATE_EPOCH: epoch },
  )
  const sharp = (await import('sharp')).default
  // The cover page is 288 × 432 pt. librsvg scales pt units by the density twice, so render at
  // a density that lands just above 1600 px wide, then resize to exactly 1600 × 2400 px.
  await sharp(readFileSync(svg), { density: 170 })
    .resize(1600, 2400, { fit: 'fill' })
    .png({ compressionLevel: 9 })
    .toFile(join(dir, 'cover.png'))
}

/** Builds (or reuses from cache) one edition. */
export async function buildEdition(om: OuterMind, m: Entry<'media'>): Promise<Edition> {
  const src = editionSource(om, m)
  if (!src) throw new Error(`media/${m.slug}: edition_of "${m.data.edition_of}" is not a transmission or collection`)
  const key = cacheKey(om, m, src)
  const dir = join(CACHE, `${m.slug}-${key}`)
  const formats = m.data.formats as Format[]
  const done = existsSync(join(dir, '.done'))

  if (!done) {
    const tmp = `${dir}.tmp`
    rmSync(tmp, { recursive: true, force: true })
    mkdirSync(tmp, { recursive: true })
    const t = editionTokens()
    const { meta, md } = sourceMarkdown(om, m, src)
    const epoch = String(Date.parse(`${src.data.date}T00:00:00Z`) / 1000)
    const env = { SOURCE_DATE_EPOCH: epoch }
    const srcFile = join(tmp, 'source.md')
    writeFileSync(srcFile, md)

    let coverPath = m.data.cover ? join(om.publicDir, m.data.cover) : undefined
    if (!coverPath) {
      await makeCover(tmp, m, meta.author, t, om, epoch)
      coverPath = join(tmp, 'cover.png')
    }
    const common = ['--from', 'markdown-citations', '--resource-path', `${om.publicDir}:${tmp}`, '--standalone', '--lua-filter', join(TEMPLATES, 'anchors.lua')]

    if (formats.includes('md')) {
      // The Markdown edition: frontmatter (title, author, date, licence) and the text, images pointing at the shop.
      const base = siteBase(om, 'mediashop')
      writeFileSync(join(tmp, `${m.slug}.md`), md.replace(/\]\(assets\//g, `](${base}/assets/`))
    }
    if (formats.includes('epub')) {
      writeFileSync(join(tmp, 'epub.css'), epubCss(t))
      const fonts = readdirSync(FONTS).filter((f) => f.endsWith('.ttf')).map((f) => `--epub-embed-font=${join(FONTS, f)}`)
      run('pandoc', [srcFile, ...common, '--to', 'epub3', '--css', join(tmp, 'epub.css'), '--epub-cover-image', coverPath, ...fonts, '--output', join(tmp, `${m.slug}.epub`)], env)
    }
    if (formats.includes('pdf')) {
      writeFileSync(join(tmp, 'header.typ'), typstHeader(t))
      run(
        'pandoc',
        [
          srcFile,
          ...common,
          '--pdf-engine', 'typst',
          `--pdf-engine-opt=--font-path=${FONTS}`,
          '--pdf-engine-opt=--ignore-system-fonts',
          '--include-in-header', join(tmp, 'header.typ'),
          '-V', `mainfont=${t['ed-font-body']}`,
          '-V', `fontsize=${t['ed-size-body']}`,
          '-V', 'papersize=a5',
          '--output', join(tmp, `${m.slug}.pdf`),
        ],
        env,
      )
    }
    writeFileSync(join(tmp, '.done'), key)
    rmSync(dir, { recursive: true, force: true })
    renameSync(tmp, dir)
  }

  const files = formats
    .filter((f) => existsSync(join(dir, `${m.slug}.${f}`)))
    .map((f) => ({ format: f, path: join(dir, `${m.slug}.${f}`), href: `/media/${m.slug}/${m.slug}.${f}` }))
  const generated = join(dir, 'cover.png')
  return {
    media: m,
    source: src,
    files,
    cover: !m.data.cover && existsSync(generated) ? { path: generated, href: `/media/${m.slug}/cover.png` } : undefined,
    dir,
  }
}

const memo = new Map<string, Promise<Edition>>()
/** Builds every edition once per process (and per cache key). */
export function edition(om: OuterMind, m: Entry<'media'>): Promise<Edition> {
  const k = `${m.slug}:${cacheKey(om, m, editionSource(om, m)!)}`
  if (!memo.has(k)) memo.set(k, buildEdition(om, m))
  return memo.get(k)!
}

/** Copies an edition's files (and generated cover) to `<outDir>/media/<slug>/`. */
export function copyEdition(ed: Edition, outDir: string) {
  const dest = join(outDir, 'media', ed.media.slug)
  mkdirSync(dest, { recursive: true })
  for (const f of ed.files) copyFileSync(f.path, join(dest, `${ed.media.slug}.${f.format}`))
  if (ed.cover) copyFileSync(ed.cover.path, join(dest, 'cover.png'))
}
