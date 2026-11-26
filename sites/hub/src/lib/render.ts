import type { RootContent } from 'mdast'
import { mdToString, nodesToHtml } from '@om/content'

/** A paragraph that is only a link whose text ends with "→" is a call-to-action button, as on the old site. */
export function ctaify(html: string): string {
  return html.replace(/<p><a href="([^"]*)">([^<]*→)<\/a><\/p>/g, (_m, href: string, text: string) => {
    const ext = /^https?:/.test(href) ? ' target="_blank" rel="noopener"' : ''
    return `<p><a class="btn btn--cta" href="${href}"${ext}>${text}</a></p>`
  })
}

export const html = (nodes: RootContent[]) => ctaify(nodesToHtml(nodes))

export function isLinkOnly(n: RootContent): boolean {
  if (n.type !== 'paragraph') return false
  const kids = n.children.filter((c) => !(c.type === 'text' && !c.value.trim()))
  return kids.length === 1 && kids[0].type === 'link'
}

export function isImageOnly(n: RootContent): boolean {
  if (n.type !== 'paragraph') return false
  const kids = n.children.filter((c) => !(c.type === 'text' && !c.value.trim()))
  return kids.length > 0 && kids.every((c) => c.type === 'image')
}

/** id for a heading, like rehype-slug. */
export const slugify = (s: string) =>
  s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

/** Splits nodes at `###` headings: text before, then one group per subsection. */
export function subsections(nodes: RootContent[]) {
  const before: RootContent[] = []
  const subs: { title: string; nodes: RootContent[] }[] = []
  for (const n of nodes) {
    if (n.type === 'heading' && n.depth === 3) subs.push({ title: mdToString(n), nodes: [] })
    else if (subs.length) subs[subs.length - 1].nodes.push(n)
    else before.push(n)
  }
  return { before, subs }
}
