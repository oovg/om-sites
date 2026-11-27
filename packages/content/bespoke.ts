/**
 * Notebooks that live in om-sites rather than in the outer mind (decided by vengi, 2026-11-26):
 * the IES framework is an exact copy of the old om-ies page and is always published. Its listing
 * details are kept here; if the outer mind publishes a notebook with the same slug, that entry's
 * details are used instead. The page itself is in sites/notebooks/src/bespoke/.
 */
import type { Entry, OuterMind } from './load.ts'
import { entriesOf } from './load.ts'

export const BESPOKE_NOTEBOOKS = [
  {
    slug: 'institutions-extitutions-substrates',
    title: 'Institutions, Extitutions, & Substrates',
    summary:
      'An organizational framework for understanding the attributes of institutions, extitutions, substrates, and the relationship between them.',
    framework: true,
    date: '2026-07-15', // first commit of om-ies
    /** White diagram from the notebook page, served by the notebooks site. Shown on the hub until a cover is set. */
    image: '/openEndedIntelligence.svg',
  },
] as const

/** Every notebook: the outer mind's, plus bespoke ones it doesn't publish itself. */
export function notebookList(om: OuterMind): Entry<'notebook'>[] {
  const published = entriesOf(om, 'notebook')
  const extra = BESPOKE_NOTEBOOKS.filter((b) => !published.some((n) => n.slug === b.slug)).map(
    (b): Entry<'notebook'> => ({
      type: 'notebook',
      slug: b.slug,
      file: `(om-sites)/notebooks/${b.slug}`,
      body: '',
      data: { type: 'notebook', title: b.title, slug: b.slug, date: b.date, summary: b.summary, tags: [], framework: b.framework, sections: [] },
    }),
  )
  return [...published, ...extra]
}
