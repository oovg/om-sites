import type { APIRoute } from 'astro'
import { indexJson, om } from '../lib/wiki'
export const GET: APIRoute = () => new Response(JSON.stringify(indexJson(om()), null, 2) + '\n', { headers: { 'Content-Type': 'application/json' } })
