/**
 * Runs a command only when the outer mind has at least one notebook; otherwise prints a note and
 * exits 0. Used by the notebooks site's scripts: `tsx ../../packages/content/gate.ts astro build`.
 */
import { spawnSync } from 'node:child_process'
import { rmSync } from 'node:fs'
import { join } from 'node:path'
import { WORKSPACE } from './config.ts'
import { notebookList } from './bespoke.ts'
import { loadOuterMind } from './load.ts'

const om = loadOuterMind()
if (notebookList(om).length === 0) {
  console.log('notebooks: skipped (no notebook in the outer mind yet)')
  // A build that skips must not leave an earlier build's pages behind.
  if (process.argv.includes('build')) rmSync(join(WORKSPACE, 'dist/notebooks'), { recursive: true, force: true })
  process.exit(0)
}
const [cmd, ...args] = process.argv.slice(2)
const r = spawnSync(cmd, args, { stdio: 'inherit', shell: false })
process.exit(r.status ?? 1)
