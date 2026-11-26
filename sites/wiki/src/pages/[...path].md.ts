import type { APIRoute } from 'astro'
import { wikiPath } from '@om/content'
import { om, rawFile } from '../lib/wiki'

/** Every page as raw markdown at <path>.md: the entry's file, verbatim. */
export function getStaticPaths() {
  return om().entries.map((e) => ({ params: { path: wikiPath(e).slice(1) }, props: { slug: e.slug } }))
}
export const GET: APIRoute = ({ props }) => {
  const o = om()
  return new Response(rawFile(o.bySlug.get(props.slug as string)!, o), { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } })
}
