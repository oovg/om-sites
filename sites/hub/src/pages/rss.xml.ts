import type { APIRoute } from 'astro'
import { entriesOf } from '@om/content'
import { rss } from '@om/content/feeds'
import { hubTitle, om } from '../lib/hub'

export const GET: APIRoute = () => {
  const o = om()
  const body = rss(o, {
    site: 'hub',
    title: hubTitle(o),
    description: o.site?.data.tagline ?? hubTitle(o),
    entries: [...entriesOf(o, 'transmission'), ...entriesOf(o, 'media')],
  })
  return new Response(body, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } })
}
