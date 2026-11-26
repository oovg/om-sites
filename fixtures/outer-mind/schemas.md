schema_version: 2

# Entry types

Every file in `public/` is one entry with a `type` that matches its folder. `pnpm check` in `om-sites` enforces these rules.

**Content only.** Entries hold text and fields, never presentation: no HTML tags, no `class` or `style` attributes, no colours, sizes or layout hints. All presentation lives in `om-sites`, so a redesign reaches every entry by rebuilding alone. (HTML comments, like the digest marker, are fine.)

**`schema_version`** (first line) changes only when the content model changes: a new type, field or slot, not a restyle. `om-sites` declares which version it renders, and `pnpm check` fails on a mismatch.

Each type comes from one folder in the inner mind. The airlock passes that as `route` in `handoff.json`:

| Inner-mind folder | `route.type` | Entry type | Path in `public/` |
|---|---|---|---|
| `02-research/<Notebook>/<Notebook>.md` | `notebook` | `notebook` | `notebooks/<notebook>/index.md` |
| `02-research/<Notebook>/<other>.md` | `notebook-section` | `section` | `notebooks/<notebook>/<section>.md` |
| `03-concepts/` | `concept` | `concept` | `concepts/<slug>.md` |
| `04-projects/<Project> index.md` | `project` | `project` | `projects/<slug>.md` |
| `05-media/` | `transmission` | `transmission` (+ `media` if `mediashop`) | `transmissions/<slug>.md` (+ `media/<slug>-edition.md`) |
| `05-media/<Book> - Index.md` | `collection` | `collection` (+ `media` if `mediashop`) | `collections/<slug>.md` (+ `media/<slug>-edition.md`) |
| `05-media/<Book> - <title>.md` | `transmission` with `route.collection` | `transmission` with `collection` | `transmissions/<book>-<title>.md` |
| `06-events/` | `event` | `event` | `events/<slug>.md` |
| `Sites/<site>/<page>.md` | `page` | `page` | `pages/<site>/<slug>.md` |
| `Sites/<site>/updates/<YYYY>-Q<n>.md` | `quarterly` | `quarterly` | `updates/<yyyy>-q<n>.md` |
| `Sites/settings.md` | `site` | `site` | `site.md` |

## Fields every entry has

| Field | Required | Notes |
|---|---|---|
| `type` | yes | Must match the folder |
| `title` | yes | |
| `slug` | yes | The file name without `.md` (for a notebook: its folder name); lowercase, hyphens; unique across all of `public/` |
| `date` | yes | `YYYY-MM-DD`. The airlock always sets it: the note's `date`, else `created`, else the day it first crossed. For an event, the day it happens |
| `updated` | no | `YYYY-MM-DD`: when the piece was last revised (from the note's `updated`) |
| `summary` | yes | One or two plain sentences; used in lists and feeds |
| `tags` | no | Only `topic/…` and `theme/…` tags |

Every entry also appears on the wiki.

## Types

| Type | Shown on | Extra fields |
|---|---|---|
| `notebook` | notebooks site | `framework` (`true` = a framework: stable, shown first; otherwise a working notebook), `sections` (section slugs in reading order). Body = the notebook's main text, verbatim |
| `section` | notebooks site (inside its notebook) | `notebook` (notebook slug). Body = verbatim |
| `concept` | wiki glossary, notebooks glossary | `aliases`, `related` (concept slugs), `sources` (entry slugs it appears in). Body = the concept in OM's words, verbatim |
| `project` | hub | `status` (`proposed`, `active`, `paused`, `done`). Body = the public version the airlock built, verbatim: description, then optional `## Outputs` (links) and `## Updates` (dated lines) |
| `transmission` | hub | Every finished piece from `05-media`: essays and media pieces. `project` (project slug, optional), `collection` (the book it belongs to, optional), `url` (if hosted elsewhere, e.g. Substack), `image` (optional), `in_mediashop` (the media slug, when it is also in the shop; never set on essays in a collection) |
| `collection` | hub (Media section if in the shop), mediashop | A book of essays. `essays` (transmission slugs in reading order), `project` (optional), `in_mediashop`. Body = the book's own text (intro), verbatim |
| `media` | hub (Media section), mediashop | Only for pieces published with `mediashop: true`. See "Two kinds of media" |
| `event` | hub | `project` (optional), `format` (Movie Club, Gathering, Salon, Workshop, Lecture Series), `location`, `end` (optional), `image` (optional; hub gallery) |
| `page` | its `site` (only the hub for now) | `site`, `path` (`/` = that site's home page). Body = sections as `##` headings; see "Pages and slots" |
| `quarterly` | hub | `site`, `quarter` (e.g. `2026-Q3`). Body = the hand-written intro, verbatim, then the digest Claude builds when it lands |
| `site` | all sites (settings) | `sites` (name + url per site), `nav` (list of `{ label, path \| to \| url }`), `contact`, `licence`, `tagline`, `notebooks_footer` |

## Research notebooks and frameworks

A notebook is one folder in the inner mind: a main note (the notebook's opening text, usually linking its sections in order) plus section notes. Each note is published only if it has `publish: true`; a link to an unpublished section stays plain text.

- `sections` lists published sections in the order the main note links them, followed by any others alphabetically.
- `framework: true` marks a stable framework. The notebooks site shows frameworks first (primary) and working notebooks after (secondary). Changing the flag changes the notebook's standing, and nothing else.
- Concepts are linked from notebooks with `[[concept-slug|text]]` and resolve to the glossary.

## Pages and slots

A page's body is a list of `##` sections, rendered in order:

- **`## Hero`** first: rendered as the page's hero (image, lead text, call-to-action links).
- **A slot heading** (below) is filled by the build. Any text under it is shown first, as that section's intro.
- **Any other heading** is copy, rendered as written. An empty non-slot heading is an error (usually a typo).

| Slot heading | Filled with |
|---|---|
| `Transmissions` | Every transmission, newest first |
| `Media` | Media shop items |
| `Events` | Gallery, then the event list |
| `Research` | Frameworks, then working notebooks, linking to the notebooks site |
| `Projects` | Projects grouped by status (active, proposed, paused, done) |
| `Latest update` | The newest quarterly: its intro's first paragraph and a link |
| `Updates` | All quarterly updates, newest first |

## Collections (books of essays)

In the inner mind, a book is `05-media/<Book> - Index.md`: it gives the book's name and a table of contents linking its pieces in reading order, optionally with an introduction. Its pieces are the notes named `05-media/<Book> - <title>.md`. A dash in a title only makes a book when the index exists.

- Each essay is a `transmission` with `collection: <book slug>`, titled without the book name, and listed on the hub like any transmission.
- The book is one `collection` entry, titled with the book's name. `essays` lists the published pieces in table-of-contents order, then any pieces named for the book but missing from the contents (by date). The body is the index text, verbatim.
- With `mediashop: true` (only on the book, never on an essay), the book becomes **one** media item: an edition with `edition_of: <collection slug>`, whose files join the whole book into **one file per format** (one EPUB, one PDF, one Markdown): title, introduction if any, a generated table of contents, then every piece in `essays` order. Or, if the index brought its own PDF/EPUB, a media work with those files.

## Projects

A project index is the only part of `04-projects` that is ever published. Working documents stay private. Entries from `05-media` and `06-events` join a project with `project:` (stored as the project's slug).

Optional dated updates in the index, one per line, newest last:

```markdown
## Updates
- 2026-07-14: First Extitutions salon in Istanbul.
- 2026-09-20: Status → paused while the book is finished.
```

A line containing `Status →` marks a status change.

## Quarterly updates

A quarterly exists once its note is published. When it lands, Claude builds the digest below the intro, from `public/` only:
- entries dated in that quarter, grouped by `project` (and "Other");
- project update lines dated in that quarter, with status changes marked.

The digest starts with a `<!-- digest: … -->` line; everything above it is the person's intro, verbatim. Re-publishing the note rebuilds the digest.

## Two kinds of media

**A work**: a zine, book, poster or booklet with its own files.

| Field | Notes |
|---|---|
| `subtitle`, `author`, `role`, `descriptor` | `role` e.g. "Research, Writing and Design"; `descriptor` one line, e.g. "A poster visualizing…" |
| `cover` | Path in `assets/` |
| `files` | `pdf`, `epub`, `md` → paths in `assets/` |
| `licence` | |

**An edition**: a shop edition of a transmission, generated by the build.

| Field | Notes |
|---|---|
| `edition_of` | The slug of a transmission, or of a collection (then the edition is the book: intro, then every essay in `essays` order). Never copy text into the media entry |
| `formats` | Default `[epub, pdf, md]`; the build generates these files |
| `author`, `subtitle`, `descriptor` | Optional |
| `cover` | Optional; if missing, the build generates a typographic cover |

An entry has either `files` (a work) or `edition_of` (an edition), never both.

## Links and assets

- Links between entries: `[[slug|text]]` or `[[slug]]`, where `slug` exists in `public/`.
- Images and files live in `public/assets/` with content-hash names; reference them as `assets/<name>`.
