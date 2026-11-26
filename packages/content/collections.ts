import type { Entry } from './load.ts'

/**
 * A book's introduction: the collection body without its table of contents (a "Contents" heading
 * and lines that are only `[[links]]`) and without a leading `# Title` that repeats the book's name.
 */
export function collectionIntro(c: Entry<'collection'>): string {
  const out: string[] = []
  let skipping = false
  for (const line of c.body.split('\n')) {
    if (/^#{1,6}\s+(table of )?contents\s*$/i.test(line)) {
      skipping = true
      continue
    }
    if (skipping && /^#{1,6}\s/.test(line)) skipping = false
    if (/^\s*(?:[-*+]\s+|\d+\.\s+)?\[\[[^\]]+\]\]\s*$/.test(line)) continue
    if (skipping && line.trim()) skipping = false
    out.push(line)
  }
  return out.join('\n').replace(/^\s*#\s+.*\n/, '')
}
