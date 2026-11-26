import type { APIRoute } from 'astro'
import { opds } from '@om/content'
import { items, om } from '../lib/shop'

/** OPDS 2.0 catalog at /index.json, the path the old shop served (PROTOCOL.md §2). */
export const GET: APIRoute = async () => {
  const doc = await opds(om(), await items())
  return new Response(JSON.stringify(doc, null, 2) + '\n', { headers: { 'Content-Type': 'application/opds+json' } })
}
