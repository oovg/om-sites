# om-sites: build brief for Claude Code

Build static sites for The Open Machine (OM) from one content source: the **outer mind**: **hub, mediashop, wiki** and **research notebooks**. The notebooks site is built only once the outer mind has at least one notebook; until then `pnpm build` skips it with a note. This folder (`om-sites/`) holds code only. Content lives in the outer mind; current designs live in the existing site repos, which you read for styles and layout only.

## Paths (fill these in before starting)

```
OUTER_MIND   = ~/Documents/environments/om-publishing/om-outer-mind        # read-only: content source (use its public/ folder)
HUB_REPO     = ~/Documents/environments/the-open-template         # read-only: theopenmachine.net design
MEDIA_REPO   = ~/Documents/environments/om-mediashop     # read-only: media.theopenmachine.net design + OPDS shape
NOTEBOOK_REPO= ~/Documents/environments/om-ies          # read-only: om-ies.vercel.app notebook design
WIKI_REPO    = ~/Documents/environments/om-quartz     # read-only: mind.theopenmachine.net look (Quartz; copy the look, not Quartz)
```

## Hard rules

1. **Never write outside `om-sites/`.** The outer mind and the four repos are read-only. Never open the inner mind or any `airlock/` folder, even if you can reach it.
2. **All content comes from `$OUTER_MIND/public/`.** No site may contain its own copy of entry text, lists or hard-coded items. Fixed UI labels ("Available publications", "Transmissions") are fine.
3. **The build is deterministic and offline.** No network requests, no LLM calls, no analytics, no third-party fonts or scripts at runtime. Self-host fonts copied from the existing repos.
4. **Don't import or depend on Quartz, Next.js or the old repos' code at runtime.** Copy CSS values, markup structure and assets (fonts, logos) where useful; rebuild in Astro.
5. **All presentation lives here, none in content.** Layout, styles, fonts and templates are code in `om-sites`. Never read styling from the outer mind, and never require content to carry classes, HTML or layout hints. A redesign must reach every entry, old and new, by rebuilding alone.
6. Keep dependencies few. Record every non-obvious decision in `DECISIONS.md`.

## Content model

Read `$OUTER_MIND/schemas.md`: it defines every entry type, its folder and fields. Its first line is `schema_version: <n>`; `packages/content` declares the version it supports, and `pnpm check` fails if they differ, so a content-model change can't render wrongly. Summary:

| Type | Path in `public/` | Default sites |
|---|---|---|
| `page` | `pages/<site>/<slug>.md` | its `site` at its `path` (only hub rendered for now) |
| `project` | `projects/<slug>.md` | hub |
| `quarterly` | `updates/<yyyy>-q<n>.md` | hub (a finished page: intro + digest) |
| `transmission` | `transmissions/<slug>.md` | hub |
| `media` | `media/<slug>.md` | hub, mediashop |
| `collection` | `collections/<slug>.md` | hub (a book of essays; in the Media section and shop when it has a media entry) |
| `event` | `events/<slug>.md` | hub |
| `concept` | `concepts/<slug>.md` | wiki and notebooks (glossary) |
| `notebook` | `notebooks/<slug>/index.md` | notebooks (a framework if `framework: true`) |
| `section` | `notebooks/<slug>/<section>.md` | notebooks, inside its notebook |
| `site` | `site.md` | settings for all sites |

**Transmissions are everything written or made**: every essay and every media piece. **The media shop is a subset**: a `media` entry exists only for pieces published with `mediashop: true`. It is either a *work* with its own `files` in `assets/`, or an *edition* with `edition_of: <transmission slug>`, whose EPUB, PDF and Markdown files the build generates from the transmission's text. A transmission that is in the shop has `in_mediashop: <media slug>`.

**Collections are books of essays.** A `collection` lists its `essays` (transmission slugs, in order); each essay is a transmission with `collection: <slug>`. In the shop a book is **one** item: its edition (`edition_of: <collection slug>`) contains the intro and every essay in order.

Every entry also appears on the wiki. `site.md` holds shared settings (names, nav, footer, licence). `assets/` holds images and files referenced as `assets/<name>`. Links between entries are `[[slug|text]]` or `[[slug]]`.

## Workspace layout

```
om-sites/
  package.json              pnpm workspace; scripts: check, build, dev, preview
  pnpm-workspace.yaml
  .env.example              OUTER_MIND=/path/to/om-outer-mind
  packages/
    content/                the only code that reads the outer mind
      schemas.ts            Zod schema per type (from schemas.md); site defaults
      load.ts               reads $OUTER_MIND/public, parses frontmatter, applies defaults
      links.ts              resolves [[slug|text]] → URL on the right site; backlinks
      assets.ts             copies referenced assets into each site's output
      feeds.ts              OPDS 2.0 (media) and RSS (transmissions, media)
      editions.ts           generates EPUB, PDF and Markdown for media editions, and typographic covers
      check.ts              `pnpm check`: validate everything, print file + field on error
      version.ts            SUPPORTED_SCHEMA = the schemas.md version this code renders
    ui/                     shared pieces: notebooks header, footers, base reset
      tokens.css            the design tokens (fonts, colours, type scale, spacing) per site: the one place to restyle
  scripts/
    snap.ts                 screenshots of key pages for before/after comparison
  sites/
    hub/  mediashop/  notebooks/  wiki/     Astro, static output
  dist/                     build output: dist/hub, dist/mediashop, dist/notebooks, dist/wiki
  snapshots/<label>/        page screenshots from `pnpm snap` (git-ignored)
```

Each site's Astro config reads entries through `packages/content` (an Astro content loader or a plain module), never by globbing the outer mind itself.

## The sites

### Hub (mirror theopenmachine.net, see HUB_REPO)

The hub is built from **pages**, plus generated lists and quarterly updates. There is no hard-coded page layout.

**Pages.** Pages live in `public/pages/<site>/`. Render only `site: hub` pages for now, each at its `path` (`/` is the home page). Pages for other sites are kept for later: `pnpm check` validates them but no site renders them yet. Structure the loader so another site can render its own `home` page later with one small change. Its `##` sections render in order:
- `## Hero` as the first section renders as the hero: image, lead text, and links as call-to-action buttons, styled like the current hero;
- a section whose heading is a slot name is filled by the build, with any text under the heading shown first as its intro;
- any other section is copy, rendered as written in the hub's style.

Slot names:

| Slot | Renders (mirror the matching section on the current site) |
|---|---|
| `Transmissions` | Every transmission, newest first: title, date, summary; link to `url` if set, else to the hosted page |
| `Media` | Media shop items: title, role, link to the item's mediashop page |
| `Events` | Gallery (entries with `image`), then the list: format, title, location, date |
| `Research` | Frameworks, then working notebooks: title, summary, link to the notebooks site |
| `Projects` | Projects grouped by status (active, proposed, paused, done): title, summary, latest update line |
| `Latest update` | The newest quarterly: its intro's first paragraph and a link |
| `Updates` | All quarterlies, newest first |

An empty heading that isn't a slot name is a `pnpm check` error, which catches typos in slot names.

**Header and footer** come from `site.md`: the nav (items with `path` go to hub pages, `to` to another site, `url` external), licence, tagline and contact links.

**Projects.** `/projects/<slug>`: the description, its status, the `## Outputs` links, the `## Updates` lines as a timeline, and every entry with `project: <slug>`, grouped by type.

**Quarterly updates.** Each `quarterly` entry is a finished page: the hand-written intro, then a digest Claude wrote when it was published (it starts at a `<!-- digest -->` line, then `##` per project). The build only renders it; it doesn't generate digests.
- `/updates/<yyyy>-q<n>`: render the entry, **mirroring the structure and style of the current `/q3-2026` page in HUB_REPO**. Style the digest's project headings, status lines and item lines to match.
- `/updates/`: every quarterly, newest first, with current project statuses at the top.
- If the current `/q3-2026` page shows things the data model doesn't carry (numbers, quotes, photos), list them in `DECISIONS.md` rather than hard-coding them.

**Redirects** (static HTML redirect pages, so old links keep working): `/programme` → `/updates/`, and `/q3-2026` → `/updates/2026-q3`.

Also: a page per transmission that has a body, and `/rss.xml`. An essay's page shows "From *<Book>*" with a link to the book, and previous/next essay links in book order. `/collections/<slug>`: the book's name, its introduction (the index text, without its table-of-contents list, which is rendered from `essays` instead), its pieces in order (title, summary, link), and its shop link if it has one. In the `Transmissions` slot, essays from a book carry the book's name.

### Mediashop (mirror media.theopenmachine.net, see MEDIA_REPO)

- `/`: title, menu (About → hub, Media, Donate), "Available publications" as a single-column list: cover, title, subtitle, author, descriptor, summary, "View book" link. Feed links: OPDS and RSS.
- `/media/<slug>`: same fields, body, one download link per file in `files`, licence.
- The OPDS 2.0 catalog, generated from `media/*`, served at **the same path the current mediashop uses** (read MEDIA_REPO: if it's `/index.json`, use that, so reading apps already subscribed keep working; only if it has none, `/opds.json`). Match the existing repo's OPDS shape if it has one; otherwise: `metadata.title/subtitle/author/description/published/identifier`, `images` from `cover`, one acquisition link per file with its media type.
- `/rss.xml`.

### Media editions (part of the mediashop build)

For every `media` entry with `edition_of`:

- Read the transmission's title, author (or `site.md`'s name), date and body, with images resolved from `public/assets/`. For a collection, join the whole book into **one file per format**: one `<slug>.md`, one `<slug>.epub` and one `<slug>.pdf`, each with the book's title, its introduction (index text without the contents list), a generated table of contents, then every piece in `essays` order as a chapter (its title as the chapter heading). Never one file per piece.
- Generate `<slug>.md` (frontmatter: title, author, date, licence + body), `<slug>.epub` and `<slug>.pdf` with **pandoc** (`brew install pandoc typst`; PDF via `--pdf-engine=typst`). Set EPUB metadata from the entry (title, author, date, language, identifier `urn:om:<slug>`), so the same input gives the same output.
- If `cover` is empty, generate a typographic cover (title, author, "The Open Machine", in the mediashop's fonts and colours) as SVG, render it to PNG with sharp, and use it for the EPUB cover, the list page and OPDS.
- Write the files to `dist/mediashop/media/<slug>/`. Cache by a hash of the inputs (for a book, every essay's text too) **including the edition templates, their styles and the design tokens**, so unchanged editions aren't regenerated but every edition is regenerated after a style change.
- If pandoc or typst is missing, `pnpm check` fails with the install command, rather than building a shop with broken downloads.
- Editions appear in the mediashop list, item pages, `opds.json` and RSS exactly like works, and in the hub's Media section. Wherever this brief says `opds.json`, read it as the catalog path above.
- A transmission page with `in_mediashop` shows an "Also in the media shop" link to its item page.

### Concepts (wiki)

Concept pages on the wiki show the body, `aliases`, `related` concepts as links, `sources` as links, and backlinks. Add a `/concepts/` index listing every concept with its summary, and include concepts in `llms.txt` and `index.json`.

### Notebooks (mirror om-ies.vercel.app, see NOTEBOOK_REPO)

Research notebooks explain OM's current thinking on core concepts. There are two standings, from the same template:
- **Frameworks** (`framework: true`): stable, shown first (primary).
- **Working notebooks**: still living or changing often, shown after (secondary).

**Shared header on every page:** "The Open Machine" → hub; a **Frameworks** group, then a **Notebooks** group (working notebooks, perhaps under a "More" menu once there are many), each listing notebooks by title, with the current one marked; a link to the glossary. It collapses to a menu on narrow screens.

**Pages:**
- `/`: index. Frameworks first (title, summary), then working notebooks, then a link to the glossary.
- `/<notebook>`: one long page in the om-ies style:
  - label "THE OPEN MACHINE", title, summary as the tagline, a scroll cue;
  - the main text (the notebook's `index.md` body);
  - each section in `sections` order, with its title as a heading and an in-page table of contents;
  - the concepts the notebook links to, as cards (title, summary, link to the glossary entry);
  - footer from `site.md` (`notebooks_footer`).

  Images render inline. `[[concept]]` links go to the glossary anchor, and other `[[links]]` to the entry's page on its site.
- `/glossary`: every concept, alphabetical: title, aliases, body, related concepts, and the notebooks that use it.

Bespoke per-notebook layouts are out of scope for now; leave room for a notebook to opt into its own layout later.

### Wiki (mirror the look of mind.theopenmachine.net, see WIKI_REPO; do not use Quartz)

Minimal raw view of everything in `public/`.

- Header: title → home, search, light/dark toggle, reader-mode toggle.
- Left: folder-tree explorer of `public/`.
- Main: breadcrumb, title, date (plus "Updated <date>" when `updated` is set and later), reading time, tags, rendered markdown with images inline and `[[links]]` resolved; "see it on the hub / mediashop / notebooks" link when the entry appears there.
- Right: table of contents, backlinks.
- `/tags/` index. Home page: the site name, the home page's hero text, and links into each folder.
- For LLMs: every page also served as raw markdown at `<path>.md`; `/llms.txt` (every page: title, summary, URL, grouped by folder); `/llms-full.txt` (all entries concatenated); `/index.json` (path, type, title, summary, date, links).
- Search: Pagefind (static). No client framework.

## Designing and redesigning

The sites will keep changing after content is published, so restyling must be cheap and safe:

- **Tokens first.** Fonts, colours, type scale and spacing for each site live in `packages/ui/tokens.css`, and components use the tokens rather than raw values. Most restyles are token edits.
- **Style guide.** Each site has a dev-only page at `/_styleguide` (`pnpm dev`) rendering one real entry of every type and every slot it shows, with every heading level, lists, quotes, images, code, long titles and empty optional fields, from the real outer mind. A redesign can be checked on one page. It is never built into `dist/`.
- **Snapshots.** `pnpm snap <label>` builds, serves `dist/` locally, and screenshots a fixed list of pages per site at desktop and mobile widths into `snapshots/<label>/`:
  - home pages, one page of each type and each slot;
  - one notebook and the glossary;
  - an edition's item page.

  `pnpm snap:diff <a> <b>` writes an HTML page showing each pair side by side with changed pixels highlighted. Use Playwright, run offline against the local preview.
- **Editions restyle too.** The PDF and EPUB templates read the same tokens, and their cache key includes them.

## Commands

| Command | Does |
|---|---|
| `pnpm check` | Validate every entry against its schema; check slugs match file names, folders match types, every `[[link]]`, asset, `edition_of`, `in_mediashop`, `related`, `sources`, `collection` and `essays` slug resolves; `edition_of` points to a transmission or a collection; no essay in a collection has its own media entry; slugs are unique across `public/`; each site's page paths are unique and the hub has a page at `/`; empty page headings are slot names; `project:` values resolve to a project; `quarter` values look like `2026-Q3`; project `status` is one of proposed, active, paused, done; project update lines are `- YYYY-MM-DD: text` (warning otherwise); a media entry has `files` or `edition_of`, not both; pandoc and typst are installed; `schemas.md`'s `schema_version` matches `SUPPORTED_SCHEMA`; no entry body or field contains HTML tags, `class=`/`style=` attributes or inline CSS (HTML comments such as the digest marker are allowed). Exit 1 with file and field on any error. Notebook `sections` resolve to section files in the same folder; `framework` is true or false; every section's `notebook` matches its folder. Print a per-site count of entries |
| `pnpm dev` | All sites with live reload on content changes (notebooks only once a notebook exists) |
| `pnpm build` | `check`, then build hub, mediashop (including editions), wiki and, once a notebook exists, notebooks into `dist/` with feeds and search index |
| `pnpm preview` | Serve `dist/*` locally |
| `pnpm snap <label>` | Build, then screenshot the fixed page list into `snapshots/<label>/` |
| `pnpm snap:diff <a> <b>` | Side-by-side comparison of two snapshot sets, with changes highlighted |

## Build order

Stop after each stage, run it, and report to the person before going on.

1. **Workspace + content package + `pnpm check`.** Run it against the real outer mind. Report every error it finds in the entries; **don't fix entries yourself** (the outer mind is read-only). The person decides whether the schema or the entry changes.
2. **Wiki.** Simplest renderer; proves loading, links, assets, backlinks and the LLM files.
3. **Hub.**
4. **Mediashop** + OPDS + RSS + editions.
5. **Notebooks** (frameworks and working notebooks, glossary).
6. **Styles pass.** For each site, open its repo and copy fonts, colours, spacing, type scale and key markup patterns into `packages/ui/tokens.css` and the components. Add the `/_styleguide` pages and `pnpm snap`. Compare side by side with the live site and list remaining differences.

## Done when

- `pnpm build` passes from a clean clone with only `OUTER_MIND` set, and makes no network requests.
- Each site shows exactly the entries the content model assigns to it; changing a file in the outer mind and rebuilding changes every site that shows it.
- Deleting an entry removes it everywhere; a remaining link to it fails `pnpm check`.
- `/llms.txt`, raw `.md` pages and the mediashop `opds.json` are valid and complete.
- Every media edition has working EPUB, PDF and Markdown downloads whose text matches its transmission (or, for a book, its intro and every essay in order); editing any of them and rebuilding changes all three.
- A book appears in the shop once; each of its essays appears in the hub's transmissions with the book's name.
- Searching `om-sites/` for any sentence from an entry finds nothing.
- Each site, side by side with its live version, has the same structure, order and visual feel; differences are listed in `DECISIONS.md`.
- Changing one token (e.g. the hub's accent colour) and rebuilding changes every page that uses it, old and new entries alike, and regenerates every edition's PDF and EPUB; `pnpm snap:diff` shows exactly those pages changed.
- Changing `schema_version` in `schemas.md` makes `pnpm check` fail until `SUPPORTED_SCHEMA` matches.
