import type { APIRoute } from 'astro'
import { shopRss } from '@om/content'
import { items, om } from '../lib/shop'

export const GET: APIRoute = async () =>
  new Response(shopRss(om(), await items()), { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } })
