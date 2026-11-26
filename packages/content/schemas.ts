/**
 * Zod schema per entry type, from `$OUTER_MIND/schemas.md` (schema_version 2).
 * Defaults are applied here, so every site sees the same normalised entry.
 */
import { z } from 'zod'

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'must be YYYY-MM-DD')
const slugRef = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'must be a lowercase, hyphenated slug')
const slugList = z.array(slugRef).default([])
/** `author: "A"` or `author: ["A", "B"]` → always a list. */
const authors = z
  .union([z.string(), z.array(z.string())])
  .transform((v) => (Array.isArray(v) ? v : [v]))
  .optional()

const base = {
  title: z.string().min(1),
  slug: slugRef,
  date: day,
  updated: day.optional(),
  summary: z.string().min(1),
  tags: z
    .array(z.string().regex(/^(topic|theme)\//, 'only topic/… and theme/… tags are allowed'))
    .default([]),
}

export const PROJECT_STATUSES = ['active', 'proposed', 'paused', 'done'] as const

export const schemas = {
  notebook: z.object({
    ...base,
    type: z.literal('notebook'),
    framework: z.boolean().default(false),
    sections: slugList,
  }),
  section: z.object({ ...base, type: z.literal('section'), notebook: slugRef }),
  concept: z.object({
    ...base,
    type: z.literal('concept'),
    aliases: z.array(z.string()).default([]),
    related: slugList,
    sources: slugList,
  }),
  project: z.object({ ...base, type: z.literal('project'), status: z.enum(PROJECT_STATUSES) }),
  transmission: z.object({
    ...base,
    type: z.literal('transmission'),
    author: authors,
    project: slugRef.optional(),
    collection: slugRef.optional(),
    url: z.string().url().optional(),
    image: z.string().optional(),
    in_mediashop: slugRef.optional(),
  }),
  collection: z.object({
    ...base,
    type: z.literal('collection'),
    author: authors,
    essays: slugList,
    project: slugRef.optional(),
    in_mediashop: slugRef.optional(),
    image: z.string().optional(),
  }),
  media: z.object({
    ...base,
    type: z.literal('media'),
    subtitle: z.string().optional(),
    author: authors,
    role: z.string().optional(),
    descriptor: z.string().optional(),
    cover: z.string().optional(),
    files: z
      .object({ pdf: z.string().optional(), epub: z.string().optional(), md: z.string().optional() })
      .optional(),
    licence: z.string().optional(),
    edition_of: slugRef.optional(),
    formats: z.array(z.enum(['epub', 'pdf', 'md'])).default(['epub', 'pdf', 'md']),
    project: slugRef.optional(),
  }),
  event: z.object({
    ...base,
    type: z.literal('event'),
    project: slugRef.optional(),
    format: z.string().optional(),
    location: z.string().optional(),
    end: day.optional(),
    image: z.string().optional(),
  }),
  page: z.object({
    ...base,
    // Pages are site copy; schemas.md lists no summary for them, and real pages have none.
    summary: z.string().optional(),
    type: z.literal('page'),
    site: z.string().min(1),
    path: z.string().regex(/^\//, 'must start with /'),
  }),
  quarterly: z.object({
    ...base,
    summary: z.string().optional(),
    type: z.literal('quarterly'),
    site: z.string().min(1),
    quarter: z.string().regex(/^\d{4}-Q[1-4]$/, 'must look like 2026-Q3'),
  }),
  site: z.object({
    ...base,
    summary: z.string().optional(),
    type: z.literal('site'),
    sites: z.array(z.object({ name: z.string(), title: z.string().optional(), url: z.string().url() })),
    nav: z.array(
      z
        .object({
          label: z.string(),
          path: z.string().optional(),
          to: z.string().optional(),
          url: z.string().optional(),
        })
        .refine((n) => [n.path, n.to, n.url].filter(Boolean).length === 1, 'needs exactly one of path, to, url'),
    ),
    contact: z.array(z.object({ label: z.string(), url: z.string() })).default([]),
    licence: z.string().optional(),
    tagline: z.string().optional(),
    notebooks_footer: z.string().optional(),
  }),
} as const

export type EntryType = keyof typeof schemas
export const ENTRY_TYPES = Object.keys(schemas) as EntryType[]
export type Fields<T extends EntryType> = z.output<(typeof schemas)[T]>
