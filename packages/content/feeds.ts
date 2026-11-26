/**
 * Feeds: RSS 2.0 (hub transmissions, mediashop media). OPDS 2.0 is added with the mediashop.
 */
import type { Entry, OuterMind } from './load.ts'
import { byDateDesc } from './load.ts'
import { hrefOf, siteBase, type SiteId } from './links.ts'

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** RFC 822 date at 00:00 UTC, so builds are deterministic. */
function rfc822(day: string): string {
  return new Date(`${day}T00:00:00Z`).toUTCString()
}

export function rss(om: OuterMind, opts: { site: SiteId; title: string; description: string; entries: Entry[] }): string {
  const base = siteBase(om, opts.site)
  const items = [...opts.entries].sort(byDateDesc).map((e) => {
    const href = hrefOf(om, e, opts.site)
    const link = href.startsWith('/') ? `${base}${href}` : href
    return [
      '    <item>',
      `      <title>${esc(e.data.title)}</title>`,
      `      <link>${esc(link)}</link>`,
      `      <guid isPermaLink="false">urn:om:${e.slug}</guid>`,
      `      <pubDate>${rfc822(e.data.date)}</pubDate>`,
      e.data.summary ? `      <description>${esc(e.data.summary)}</description>` : '',
      '    </item>',
    ]
      .filter(Boolean)
      .join('\n')
  })
  const newest = [...opts.entries].sort(byDateDesc)[0]?.data.date
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0">',
    '  <channel>',
    `    <title>${esc(opts.title)}</title>`,
    `    <link>${esc(base)}/</link>`,
    `    <description>${esc(opts.description)}</description>`,
    newest ? `    <lastBuildDate>${rfc822(newest)}</lastBuildDate>` : '',
    ...items,
    '  </channel>',
    '</rss>',
    '',
  ]
    .filter(Boolean)
    .join('\n')
}
