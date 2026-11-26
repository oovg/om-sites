import type { APIRoute } from 'astro'
import { llmsFull, om } from '../lib/wiki'
export const GET: APIRoute = () => new Response(llmsFull(om()), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
