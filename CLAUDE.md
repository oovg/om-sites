# om-sites: brief for Claude Code

Static sites for The Open Machine (OM), all built from one content source, the **outer mind**: **hub, mediashop, wiki** and **research notebooks**. The notebooks site is built only once the outer mind has at least one notebook; until then `pnpm build` skips it with a note.

The sites are built. Their design was ported from the old sites and **the code in `sites/` is now the design reference**. The old repos are no longer used, so don't look for them. Keep each site's look as it is unless the person asks for a change.

This folder (`om-sites/`) holds code, plus the media files `pnpm media` generates. Content lives in the outer mind.

## Paths

`OUTER_MIND` (in `.env`) is the path to `om-outer-mind`. It is read-only: use its `public/` folder. For design work, `fixtures/outer-mind/` is a test outer mind with placeholder entries (`pnpm dev:fixture`).

## Hard rules

1. **Never write outside `om-sites/`.** The outer mind is read-only. Never open the inner mind or any `airlock/` folder, even if you can reach it.
2. **All content comes from `$OUTER_MIND/public/`.** No site may contain its own copy of entry text, lists or hard-coded items. Fixed UI labels ("Available publications", "Transmissions") are fine.
3. **The build is deterministic and offline.** No network requests, no LLM calls, no analytics, no third-party fonts or scripts at runtime. Fonts are self-hosted.
4. **Astro only.** No Quartz, no Next.js.
5. **All presentation lives here, none in content.** Layout, styles, fonts and templates are code in `om-sites`. Never read styling from the outer mind, and never require content to carry classes, HTML or layout hints. A redesign must reach every entry, old and new, by rebuilding alone.
6. **`pnpm build` never generates media files.** Generating covers, PDFs and EPUBs is `pnpm media`'s job; the build only copies files.
7. Keep dependencies few. Record every non-obvious decision in `DECISIONS.md`.

## Content model

Read `$OUTER_MIND/schemas.md`: it defines every entry type, its folder and fields. Its first line is `schema_version: <n>`; `packages/content` declares the version it supports, and `pnpm check` fails if they differ, so a content-model change can't render wrongly. Summary:

| Type | Path in `public/` | Default sites |
|---|---|---|
| `page` | `pages/<site>/<slug>.md` | its `site` at its `path` (only hub rendered for now) |
| `project` | `projects/<slug>.md` | hub |
| `quarterly` | `updates/<yyyy>-q<n>.md` | hub (a finished page: intro + digest) |
| `transmission` | `media/<slug>.md` | hub |
| `media` | `media/<slug>-edition.md` | hub, mediashop |
| `collection` | `media/<slug>.md` | hub (a book of essays; in the Media section and shop when it has a media entry) |
| `event` | `events/<slug>.md` | hub |
| `concept` | `concepts/<slug>.md` | wiki and notebooks (glossary) |
| `notebook` | `notebooks/<slug>/index.md` | notebooks (a framework if `framework: true`) |
| `section` | `notebooks/<slug>/<section>.md` | notebooks, inside its notebook |
| `site` | `site.md` | settings for all sites |

**`public/media/` is one flat folder** holding transmissions, collections and shop (`media`) entries side by side: read each file's `type`, never infer type from the folder or file name. Where entries are stored doesn't change any site URL (`/collections/<slug>`, transmission pages, `/media/<slug>` in the shop stay as they are).

**Transmissions are everything written or made**: every essay and every media piece. **The media shop is a subset**: a `media` entry exists only for pieces published with `mediashop: true`, with `edition_of: <transmission or collection slug>`. Its `cover` and `files` (`pdf`, `epub`) are custom files the person supplied, in `assets/`. `formats` (default `[pdf, epub, md]`) says what the shop offers. `pnpm media` generates every offered format and the cover that weren't supplied. A transmission that is in the shop has `in_mediashop: <media slug>`.

**Collections are books of essays.** A `collection` lists its `essays` (transmission slugs, in order); each essay is a transmission with `collection: <slug>`. In the shop a book is **one** item (`edition_of: <collection slug>`): its generated files join the introduction and every essay in order, one file per format.

Every entry also appears on the wiki. `site.md` holds shared settings (names, nav, footer, licence). `assets/` holds images and files referenced as `assets/<name>`. Links between entries are `[[slug|text]]` or `[[slug]]`.

## Workspace layout

```
om-sites/
  package.json              pnpm workspace; scripts: check, media, build, dev, preview, dev:fixture, build:fixture
  pnpm-workspace.yaml
  .env.example              OUTER_MIND=/path/to/om-outer-mind
  packages/
    content/                the only code that reads the outer mind
      schemas.ts            Zod schema per type (from schemas.md); site defaults
      load.ts               reads $OUTER_MIND/public, parses frontmatter, applies defaults
      links.ts              resolves [[slug|text]] → URL on the right site; backlinks
      assets.ts             copies referenced assets into each site's output
      feeds.ts              OPDS 2.0 (media) and RSS (transmissions, media)
      shopfiles.ts          for each media entry: which files are supplied, which `pnpm media` must generate, and where each lives
      check.ts              `pnpm check`: validate everything, print file + field on error
      version.ts            SUPPORTED_SCHEMA = the schemas.md version this code renders
    ui/                     shared pieces: notebooks header, footers, base reset
      tokens.css            the design tokens (fonts, colours, type scale, spacing) per site: the one place to restyle
  scripts/
    media.ts                `pnpm media`: generates missing covers, PDFs, EPUBs and Markdown (pandoc + typst + sharp)
  media-files/<media slug>/ generated shop files + manifest.json (committed to git, so any build can copy them)
  fixtures/outer-mind/      test outer mind with placeholder entries, for design work
  sites/
    hub/  mediashop/  notebooks/  wiki/     Astro, static output
  dist/                     build output: dist/hub, dist/mediashop, dist/notebooks, dist/wiki
```

Each site's Astro config reads entries through `packages/content` (an Astro content loader or a plain module), never by globbing the outer mind itself.

## The sites

### Hub

The hub is built from **pages**, plus generated lists and quarterly updates. There is no hard-coded page layout.

**Pages.** Pages live in `public/pages/<site>/`. Render only `site: hub` pages for now, each at its `path` (`/` is the home page). Pages for other sites are kept for later: `pnpm check` validates them but no site renders them yet. Structure the loader so another site can render its own `home` page later with one small change. Its `##` sections render in order:
- `## Hero` as the first section renders as the hero: image, lead text, and links as call-to-action buttons, styled as the hero is now;
- a section whose heading is a slot name is filled by the build, with any text under the heading shown first as its intro;
- any other section is copy, rendered as written in the hub's style.

Slot names:

| Slot | Renders |
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
- `/updates/<yyyy>-q<n>`: render the entry in the quarterly layout as built, with the digest's project headings, status lines and item lines styled to match.
- `/updates/`: every quarterly, newest first, with current project statuses at the top.

**Redirects** (static HTML redirect pages, so old links keep working): `/programme` → `/updates/`, and `/q3-2026` → `/updates/2026-q3`.

Also: a page per transmission that has a body, and `/rss.xml`. An essay's page shows "From *<Book>*" with a link to the book, and previous/next essay links in book order. `/collections/<slug>`: the book's name, its introduction (the index text, without its table-of-contents list, which is rendered from `essays` instead), its pieces in order (title, summary, link), and its shop link if it has one. In the `Transmissions` slot, essays from a book carry the book's name.

### Mediashop

- `/`: title, menu (About → hub, Media, Donate), "Available publications" as a single-column list: cover, title, subtitle, author, descriptor, summary, "View book" link. Feed links: OPDS and RSS.
- `/media/<slug>`: same fields, body, one download link per offered format, licence.
- The OPDS 2.0 catalog, generated from the `media` entries, at the path and in the shape it has now (don't move it: reading apps are subscribed to it). `images` from the cover, one acquisition link per offered format with its media type.
- `/rss.xml`.
- A transmission page with `in_mediashop` shows an "Also in the media shop" link to its item page.

### Shop files: supplied first, generated only when missing

For each media entry, the shop offers the formats in `formats` (default `pdf`, `epub`, `md`) and one cover:
- **Supplied** (in the entry's `cover` or `files`): used as-is from `$OUTER_MIND/public/assets/`. Never regenerate, convert or overwrite a supplied file.
- **Missing**: generated by `pnpm media` into `media-files/<media slug>/` (`cover.png`, `<slug>.pdf`, `<slug>.epub`, `<slug>.md`).

`pnpm media`:
- Reads the source text: the transmission (title, author or `site.md`'s name, date, body, images from `public/assets/`), or for a collection the whole book joined into **one file per format** (title, introduction without the contents list, a generated table of contents, then every piece in `essays` order as a chapter). Never one file per piece.
- Generates `<slug>.md` (frontmatter: title, author, date, licence + body), `<slug>.epub` and `<slug>.pdf` with **pandoc** (PDF via `--pdf-engine=typst`), with EPUB metadata from the entry (title, author, date, language, identifier `urn:om:<slug>`). A generated EPUB uses the supplied cover if there is one, else the generated cover.
- Generates a typographic cover only when no cover is supplied (title, author, "The Open Machine", in the mediashop's fonts and colours; SVG rendered to PNG with sharp).
- Records each generated file's input hash (source text, entry fields, cover, the edition templates and their styles, the design tokens) in `media-files/<slug>/manifest.json`, and regenerates only what's stale. After a style change, every generated file is stale.
- Removes generated files that are no longer needed: the entry is gone, a custom file now replaces it, or the format was dropped from `formats`.
- `pnpm media <slug>…` does only those entries; `--force` regenerates even when up to date. Prints what it generated, what was up to date and what it removed.
- It is the only command that needs pandoc and typst. If either is missing, it stops with the install command.

`pnpm build` copies, for each offered format and the cover, the supplied file or else the generated one, into `dist/mediashop/media/<slug>/` with friendly names (`<slug>.pdf`, …). It never runs pandoc. `pnpm check` reports:
- **error**: an offered format or the cover is neither supplied nor generated ("run `pnpm media`");
- **warning**: a generated file is stale (the build still uses it; run `pnpm media` to refresh).

### Concepts (wiki)

Concept pages on the wiki show the body, `aliases`, `related` concepts as links, `sources` as links, and backlinks. Add a `/concepts/` index listing every concept with its summary, and include concepts in `llms.txt` and `index.json`.

### Notebooks

Research notebooks explain OM's current thinking on core concepts. There are two standings, from the same template:
- **Frameworks** (`framework: true`): stable, shown first (primary).
- **Working notebooks**: still living or changing often, shown after (secondary).

**Shared header on every page:** "The Open Machine" → hub; a **Frameworks** group, then a **Notebooks** group (working notebooks, perhaps under a "More" menu once there are many), each listing notebooks by title, with the current one marked; a link to the glossary. It collapses to a menu on narrow screens.

**Pages:**
- `/`: index. Frameworks first (title, summary), then working notebooks, then a link to the glossary.
- `/<notebook>`: one long page, in the notebook layout as built:
  - label "THE OPEN MACHINE", title, summary as the tagline, a scroll cue;
  - the main text (the notebook's `index.md` body);
  - each section in `sections` order, with its title as a heading and an in-page table of contents;
  - the concepts the notebook links to, as cards (title, summary, link to the glossary entry);
  - footer from `site.md` (`notebooks_footer`).

  Images render inline. `[[concept]]` links go to the glossary anchor, and other `[[links]]` to the entry's page on its site.
- `/glossary`: every concept, alphabetical: title, aliases, body, related concepts, and the notebooks that use it.

Bespoke per-notebook layouts are out of scope for now; leave room for a notebook to opt into its own layout later.

### Wiki

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
- **Fixture.** `pnpm dev:fixture` runs the sites against `fixtures/outer-mind/` (placeholder entries covering every type and slot, long and short titles, missing images, empty optional fields, a book, a project with outputs and updates, a quarterly, and shop items with and without custom files). Keep it passing `pnpm check`, and add to it when a new type, field or slot appears. Fixture text lives only under `fixtures/`.
- **Checking a change** is done by the person in the browser: run `pnpm dev` (or `pnpm dev:fixture`), give them the localhost addresses and the pages to look at, and leave the servers running.
- **Shop files restyle too.** The PDF and EPUB templates read the same tokens, so after a token change `pnpm media` regenerates every generated file. Supplied files are never touched.

## Commands

| Command | Does |
|---|---|
| `pnpm check` | Validate every entry against its schema; check slugs match file names, folders match types (`media/` may hold `transmission`, `collection` and `media`), every `[[link]]`, asset, `edition_of`, `in_mediashop`, `related`, `sources`, `collection` and `essays` slug resolves; every media entry has `edition_of`, pointing to a transmission or a collection; `cover` and `files` point to files in `assets/`; `formats` lists only pdf, epub, md; every offered format and the cover is supplied or generated (stale generated files are a warning); no essay in a collection has its own media entry; slugs are unique across `public/`; each site's page paths are unique and the hub has a page at `/`; empty page headings are slot names; `project:` values resolve to a project; `quarter` values look like `2026-Q3`; project `status` is one of proposed, active, paused, done; project update lines are `- YYYY-MM-DD: text` (warning otherwise); `schemas.md`'s `schema_version` matches `SUPPORTED_SCHEMA`; no entry body or field contains HTML tags, `class=`/`style=` attributes or inline CSS (HTML comments such as the digest marker are allowed). Exit 1 with file and field on any error. Notebook `sections` resolve to section files in the same folder; `framework` is true or false; every section's `notebook` matches its folder. Print a per-site count of entries |
| `pnpm media [slug…] [--force]` | Generate the shop files that aren't supplied and are missing or stale; remove ones no longer needed. Needs pandoc and typst |
| `pnpm build` | `check`, then build hub, mediashop, wiki and, once a notebook exists, notebooks into `dist/` with feeds and search index. Copies shop files; never generates them |
| `pnpm dev` | All sites with live reload on content changes (notebooks only once a notebook exists) |
| `pnpm dev:fixture`, `pnpm build:fixture` | The same, against `fixtures/outer-mind/` |
| `pnpm preview` | Serve `dist/*` locally |

The everyday flow, after Claude has processed the landing folder and the branch is merged: `pnpm media` (only does work when shop items changed), then `pnpm build`. Commit `media-files/` with the rest of `om-sites`.

## Always true

- `pnpm build` passes from a clean clone with only `OUTER_MIND` set, makes no network requests and doesn't need pandoc.
- Each site shows exactly the entries the content model assigns to it; changing a file in the outer mind and rebuilding changes every site that shows it.
- Deleting an entry removes it everywhere; a remaining link to it fails `pnpm check`.
- `/llms.txt`, raw `.md` pages and the mediashop catalog are valid and complete.
- Every shop item offers each of its formats and a cover: supplied files exactly as supplied, the rest generated. Generated text matches its transmission (or, for a book, its introduction and every essay in order).
- A book appears in the shop once; each of its essays appears in the hub's transmissions with the book's name.
- Searching `om-sites/` for any sentence from an entry finds nothing outside `fixtures/` and `media-files/`.
- Changing one token and rebuilding changes every page that uses it, old and new entries alike; `pnpm media` then regenerates every generated PDF and EPUB, and no supplied one.
- Changing `schema_version` in `schemas.md` makes `pnpm check` fail until `SUPPORTED_SCHEMA` matches.
