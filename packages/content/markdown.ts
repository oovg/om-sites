/**
 * Markdown → HTML for every site: GFM (tables, footnotes), `[[links]]` resolved per site,
 * `assets/…` images and files served from `/assets/…`, heading ids. Raw HTML is dropped
 * (entries must not carry any; `pnpm check` reports it).
 */
import type { Heading, Root, RootContent } from 'mdast'
import { toString as mdToString } from 'mdast-util-to-string'
import rehypeSlug from 'rehype-slug'
import rehypeStringify from 'rehype-stringify'
import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import { unified } from 'unified'
import { visit } from 'unist-util-visit'
import type { Entry, OuterMind } from './load.ts'
import { assetUrl, hrefOf, type SiteId, WIKILINK } from './links.ts'

export interface RenderOptions {
  om: OuterMind
  site: SiteId
  /** Override the URL of a linked entry (e.g. concepts → glossary anchors on the notebooks site). */
  linkFor?: (e: Entry) => string | undefined
}

/** Replaces `[[slug|text]]` with markdown links, outside code. Unknown slugs become plain text. */
export function resolveWikilinks(md: string, opts: RenderOptions): string {
  const parts = md.split(/(```[\s\S]*?```|`[^`\n]*`)/g)
  return parts
    .map((part, i) => {
      if (i % 2 === 1) return part
      return part.replace(WIKILINK, (_all, slug: string, hash: string | undefined, text: string | undefined) => {
        const target = opts.om.bySlug.get(slug.trim())
        const label = (text ?? target?.data.title ?? slug).trim()
        if (!target) return label
        const href = (opts.linkFor?.(target) ?? hrefOf(opts.om, target, opts.site)) + (hash ?? '')
        return `[${label.replace(/([[\]])/g, '\\$1')}](<${href}>)`
      })
    })
    .join('')
}

function rehypeAssets() {
  return (tree: any) => {
    visit(tree, 'element', (node: any) => {
      if (node.tagName === 'img' && typeof node.properties?.src === 'string') {
        node.properties.src = assetUrl(node.properties.src)
        node.properties.loading = 'lazy'
      }
      if (node.tagName === 'a' && typeof node.properties?.href === 'string' && node.properties.href.startsWith('assets/')) {
        node.properties.href = assetUrl(node.properties.href)
      }
    })
  }
}

const parser = unified().use(remarkParse).use(remarkGfm)

export function parseMarkdown(md: string): Root {
  return parser.parse(md) as Root
}

/** Renders mdast nodes (already wikilink-resolved) to HTML. */
export function nodesToHtml(nodes: RootContent[]): string {
  const root: Root = { type: 'root', children: nodes }
  const proc = unified()
    .use(remarkGfm)
    .use(remarkRehype, { footnoteLabel: 'Footnotes' })
    .use(rehypeSlug)
    .use(rehypeAssets)
    .use(rehypeStringify)
  const hast = proc.runSync(root as any)
  return proc.stringify(hast as any)
}

export function renderMarkdown(md: string, opts: RenderOptions): string {
  return nodesToHtml(parseMarkdown(resolveWikilinks(md, opts)).children)
}

export interface MdSection {
  heading: string
  /** Children below the heading, up to the next heading of the same depth. */
  nodes: RootContent[]
}

/** Splits a document at its headings of `depth` (default `##`). Text before the first is `heading: ''`. */
export function splitSections(md: string, opts: RenderOptions, depth = 2): MdSection[] {
  const tree = parseMarkdown(resolveWikilinks(md, opts))
  const out: MdSection[] = []
  let cur: MdSection = { heading: '', nodes: [] }
  for (const node of tree.children) {
    if (node.type === 'heading' && (node as Heading).depth === depth) {
      if (cur.heading || cur.nodes.length) out.push(cur)
      cur = { heading: mdToString(node).trim(), nodes: [] }
    } else cur.nodes.push(node)
  }
  if (cur.heading || cur.nodes.length) out.push(cur)
  return out
}

/** Quarterly bodies: the intro above the `<!-- digest` marker, and the digest below it. */
export function splitDigest(body: string): { intro: string; digest: string } {
  const i = body.search(/^<!--\s*digest\b.*-->\s*$/m)
  if (i < 0) return { intro: body, digest: '' }
  const rest = body.slice(i)
  const nl = rest.indexOf('\n')
  return { intro: body.slice(0, i), digest: nl < 0 ? '' : rest.slice(nl + 1) }
}

/** Plain text of the first paragraph of a markdown string. */
export function firstParagraph(md: string): RootContent | undefined {
  return parseMarkdown(md).children.find((n) => n.type === 'paragraph')
}

/** Images in a node list, in order (src, alt). */
export function imagesIn(nodes: RootContent[]): { src: string; alt: string }[] {
  const out: { src: string; alt: string }[] = []
  for (const n of nodes) visit(n as any, 'image', (img: any) => void out.push({ src: assetUrl(img.url)!, alt: img.alt ?? '' }))
  return out
}

export { mdToString }

/** Rough reading time in minutes (200 words a minute). */
export function readingMinutes(md: string): number {
  const words = md.replace(/```[\s\S]*?```/g, '').split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / 200))
}
