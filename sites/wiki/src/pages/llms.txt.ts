import type { APIRoute } from 'astro'
import { llmsTxt, om } from '../lib/wiki'
export const GET: APIRoute = () => new Response(llmsTxt(om()), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
