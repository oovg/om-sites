import type { APIRoute } from 'astro'
import { shopJson } from '@om/content'
import { donateUrl, om } from '../lib/shop'

/** /shop.json (PROTOCOL.md §3), generated from site.md. */
export const GET: APIRoute = () =>
  new Response(JSON.stringify(shopJson(om(), donateUrl()), null, 2) + '\n', { headers: { 'Content-Type': 'application/json' } })
