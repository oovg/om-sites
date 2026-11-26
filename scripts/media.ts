/**
 * `pnpm media [slug…] [--force]`: makes the shop files that the outer mind doesn't supply.
 * For each media entry: a cover if none is supplied, and each offered format (`formats`) that
 * isn't in `files`. Writes media-files/<slug>/ (commit it); regenerates only what's out of date;
 * removes generated files a custom file now replaces, and folders of entries that are gone.
 * Supplied files are never touched. Needs pandoc (3.1.2+) and typst; `pnpm build` needs neither.
 */
import { entriesOf, generateMedia, hasTool, loadOuterMind, MEDIA_FILES, pruneMediaFiles } from '../packages/content/index.ts'

const args = process.argv.slice(2)
const force = args.includes('--force')
const only = args.filter((a) => !a.startsWith('--'))

const missing = ['pandoc', 'typst'].filter((t) => !hasTool(t))
if (missing.length) {
  console.error(`✖ ${missing.join(' and ')} not installed: brew install pandoc typst (pandoc 3.1.2 or newer)`)
  process.exit(1)
}

const om = loadOuterMind()
const all = entriesOf(om, 'media')
const unknown = only.filter((s) => !all.some((m) => m.slug === s))
if (unknown.length) {
  console.error(`✖ no media entry: ${unknown.join(', ')}`)
  process.exit(1)
}
const todo = only.length ? all.filter((m) => only.includes(m.slug)) : all

let failed = 0
for (const m of todo) {
  if (process.stdout.isTTY) process.stdout.write(`… ${m.slug}`)
  try {
    const r = await generateMedia(om, m, { force })
    const parts = [r.status]
    if (r.generated.length) parts.push(`made ${r.generated.join(', ')}`)
    if (r.removed.length) parts.push(`removed ${r.removed.join(', ')} (no longer needed)`)
    process.stdout.write(`${process.stdout.isTTY ? '\r' : ''}✓ ${m.slug}  ${parts.join('; ')}\n`)
  } catch (e) {
    failed++
    process.stdout.write(`${process.stdout.isTTY ? '\r' : ''}✖ ${m.slug}  ${(e as Error).message}\n`)
  }
}
if (!only.length) for (const d of pruneMediaFiles(om)) console.log(`✓ removed media-files/${d} (its media entry is gone)`)
console.log(`\n${todo.length - failed} of ${todo.length} shop items ready in ${MEDIA_FILES}. Commit media-files/, then pnpm build.`)
process.exit(failed ? 1 : 0)
