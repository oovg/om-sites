/**
 * Bespoke notebook pages: a notebook slug → a hand-built HTML page kept in om-sites, served instead
 * of the shared template (decided by vengi, 2026-11-26). The page is an exact copy of its source;
 * the build changes only two things (see DECISIONS.md):
 *   1. a Google Fonts <link> is replaced by the same fonts, self-hosted (no third-party fonts at runtime);
 *   2. the shared dropdown header is inserted at the top of <body>, with its CSS in <head>.
 */
import fontsCss from '../styles/fonts.css?raw'
import headerCss from '../styles/header.css?raw'
import ies from './institutions-extitutions-substrates/index.html?raw'

export const bespokePages: Record<string, string> = {
  'institutions-extitutions-substrates': ies,
}

/** Variables the header CSS uses that a bespoke page may not define. */
const HEADER_VARS = ":root{--font-mono:'IBM Plex Mono',monospace;--wide-col:1100px;}"

/** The page split around the point where the header goes, with fonts and header CSS in place. */
export function bespokeParts(html: string): { before: string; after: string } {
  const page = html
    .replace(/<link[^>]+fonts\.googleapis\.com[^>]*>\s*/g, '')
    .replace(/<link[^>]+fonts\.gstatic\.com[^>]*>\s*/g, '')
    .replace('</head>', `<style>${fontsCss}\n${HEADER_VARS}\n${headerCss}</style>\n</head>`)
  const m = page.match(/<body[^>]*>/)
  if (!m || m.index === undefined) return { before: page, after: '' }
  const at = m.index + m[0].length
  return { before: page.slice(0, at), after: page.slice(at) }
}
