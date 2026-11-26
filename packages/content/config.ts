import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, isAbsolute, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Root of the om-sites workspace. */
export const WORKSPACE = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

function readDotEnv(): Record<string, string> {
  const file = join(WORKSPACE, '.env')
  if (!existsSync(file)) return {}
  const out: Record<string, string> = {}
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/)
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
  return out
}

/** Absolute path of the outer mind: `OUTER_MIND` from the environment, else from `.env`. */
export function outerMindPath(): string {
  const raw = process.env.OUTER_MIND || readDotEnv().OUTER_MIND
  if (!raw) throw new Error('OUTER_MIND is not set. Copy .env.example to .env and set it, or export OUTER_MIND.')
  const expanded = raw.startsWith('~') ? join(homedir(), raw.slice(1)) : raw
  return isAbsolute(expanded) ? expanded : resolve(WORKSPACE, expanded)
}
