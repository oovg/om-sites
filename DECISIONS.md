# Decisions

Non-obvious choices, and differences from the old sites, with the reason for each.

## Workspace

- **Earlier build lost.** The previous `packages/content` and `pnpm check` were gone when the `scaffold` work started (only `.cache/` remained). Both were rebuilt from CLAUDE.md.
- **`OUTER_MIND`** comes from the environment, else from `.env` in the workspace root (found by walking up to `pnpm-workspace.yaml`, so bundled Astro code finds it too). `pnpm *:fixture` scripts point it at `fixtures/outer-mind`.
- **Cross-site links** are written as the canonical URLs in `site.md` (`OM_URL_HUB`, `OM_URL_MEDIASHOP`, … still override that at build time, for feeds and for a fixed preview). Each site then runs `packages/ui/SiteLinks.astro`, which retargets those links — and images — at the deployment you're viewing: the port in that site's `dev` script when the host is localhost, or the same host with the site name swapped (`hub.vercel.app` and `hub-git-branch-….vercel.app` → `mediashop.…`). On the published host the link is left as written. Sibling links open in the same tab.
- **Tokens:** `packages/ui/tokens.css` holds one block per site (`:root[data-site=…]`). The designs stay separate; it is still the one place to restyle.

## Content model (packages/content)

- `summary` is required on every type except `page`, `quarterly` and `site`: schemas.md lists it for all, but real pages and settings carry none.
- Optional fields set to nothing (`field:  # TODO`) count as absent.
- Raw HTML in markdown is dropped when rendering (and `pnpm check` reports it).
- **Slug clash for per-site home pages:** slugs must be unique across `public/` and equal the file name, so `pages/hub/home.md` and `pages/mediashop/home.md` cannot both exist. The fixture uses `pages/mediashop/mediashop-home.md`. Open question for the content model.

## Hub (from the-open-template)

- **Fonts:** the old site's Typekit kit (`use.typekit.net/ulo1dho.css`: polymath-display, adobe-caslon-pro) is still loaded at runtime. This is a deliberate exception to "no third-party fonts at runtime": Adobe Fonts may not be self-hosted. Decided by vengi, 2026-11-26.
- **Colour mode:** the old site followed the system (dark default) through Chakra; here a `prefers-color-scheme` media query does the same, without JS.
- **Client JS:** only the mobile menu (toggle, Escape, scroll lock), as on the old header.
- **Header:** the last `nav` item renders as the bordered button (old: Donate).
- **Footer contact icons** are chosen by link target (mailto → email, x.com → X, substack.com → Substack), as on the old footer.
- **Hero** (matched to theopenmachine.net, 2026-11-27): the first image in `## Hero` is the album front, full width. From 48em it is the left half, and the text is set on the blank album back (`sites/hub/public/album-back.jpg`, a design plate, not content) at the live sizes (`1.45vw` / `1.16vw`, padding `6vw 6.2vw 0 5.3vw`). Below 48em the back is hidden and the same text is the "What we do" block. A trailing link-only paragraph is still the full-width banner.
- **Copy sections** render in the old two-column layout (Research/Process). `###` subsections become the old bordered Process cards. **Differences:** the four hand-drawn SVG icons are gone (not content), and the five "These technologies" statements render as a bulleted list rather than bordered boxes (markdown can't tell the two list styles apart).
- **Call-to-action links:** a paragraph that is only a link whose text ends in "→" renders as the old bordered uppercase button.
- **Donate band:** on a page with a hero, a copy section headed exactly `## Donate` renders as the old untitled inverted band. A donate-only link (`/donate`) in that section or in an earlier copy section (the home page's is at the end of Process) is drawn once in the band, labeled "Support our Mission". The heading itself is not shown. Decided by vengi, 2026-11-26; the label and the move, 2026-11-27.
- **Projects slot** is labeled "Current Projects" and lists only `active` and `proposed`. Paused and done stay on each project's own page.
- **Latest update** is omitted when there is no quarterly yet.
- **Research slot:** one list on the right, labeled "Notebooks". A framework carries a Framework tag. The card image is a prepared image when the notebook has one (the IES diagram, served by the notebooks site), otherwise the first image in the notebook or its sections.
- **Transmissions slot:** the 8 newest on the home page (the full list stays at `/transmissions`). The card image is the first image embedded in the piece, else its `image`, else the shop cover (its own, else its book's). Essays carry "From *Book*".
- **Media slot:** every media item, newest first, in a 6×9 cover frame (a standard book). Each preview shows the date, the author (the entry's, else the piece's, else the hub's name) and the summary. Links to the mediashop item page in the same tab.
- **Events list:** `Format - *Title*, Location YYYY`. Free-text dates such as "monthly beginning April 2026" are not in the model.
- **Pages without a hero** use the old /donate layout: first section = title + lead paragraph, later sections titled blocks. **Differences on /donate:** no "Copy" buttons for the ENS name and address; the address block is not in small mono text.
- **Transmission pages** keep the old label "View in Media Shop" (CLAUDE.md suggests "Also in the media shop"), shown only when `in_mediashop` resolves to a media entry. Decided by vengi, 2026-11-26. Like the old page they have no footer. A transmission with a `url` and no body has no page; cards link to the `url`.
- **/transmissions** list kept from the old site (old TransmissionsPost cards, no footer).
- **Quarterly pages** (`/updates/<q>`) use the old /q3-2026 hero, Section and Item components. One section per digest project; status line as the section intro; update lines as cards with a "Project update" / "Status change" badge; entry lines as cards with their type as badge, cover beside for transmissions/media/books. **Not in the data model, so not shown:** the "Q3 2026 at a glance" panel (phase marks, counts, category summaries), the Published/Preparing/Brewing… status vocabulary, per-item prose and images for items that aren't entries, and the `noindex` meta tag.
- **/updates/**, **/projects/<slug>**, **/collections/<slug>** are new; they reuse the q3 and transmission-page components.
- **Old pages dropped for now:** /earth-computer, /ethereum-localism-book, /inverted-city, /friends-of-the-outside, /undercapital, /gfel, /library, /surveys, /outside, /abstract-machines (outside the content model; decided by vengi, 2026-11-26).
- **Redirects:** /programme → /updates/, /q3-2026 → /updates/2026-q3 (static meta-refresh pages).

## Fixture

- Images copied from the hub repo, downscaled to 1600px; large opaque PNGs converted to JPEG (quality 82), PNGs with transparency kept. Large PDFs (Assembly poster, Inverted City) replaced by small typst placeholders; Friends of the Outside and Undercapital PDFs are the real ones.
- Old post dates use the date the old site displayed (it converted midnight UTC to local time).
- `toward-a-nomad-web`: `<strong id="cite-N">` anchors became plain bold (no HTML allowed in entries).

## Mediashop (from om-mediashop)

- **Fonts:** Instrument Sans and Newsreader (OFL), self-hosted. Pages use `@fontsource` woff2 files bundled at build. Typst needs TTF, so `packages/ui/fonts/mediashop/*.ttf` were converted once from the fontsource woff2 files with fonttools (licences alongside). Typst names Newsreader "Newsreader 16pt 16pt".
- **Styles:** Tailwind v4 utilities converted to plain CSS with the same values (`sites/mediashop/src/styles/mediashop.css`); colours and type in `packages/ui/tokens.css`.
- **Client JS:** only the old behaviours: mobile Menu/Close toggle, the OPDS/RSS copy buttons, and the donation popup before a download (without JS, downloads work directly).
- **Catalog** at `/index.json` (the old path), in the old shape: `alternate` "View in Browser" link, one open-access acquisition link per file with `indirectAcquisition`, `images` with real width and height. **`/shop.json`** (PROTOCOL.md §3) is new, generated from `site.md`. RSS follows PROTOCOL.md §7 (description is the summary, else the subtitle).
- **Order:** newest first by `date`; the old list followed `index.json` order.
- **Dates** are shown as entered; the old shop shifted midnight-UTC dates into local time (e.g. "July 6" for 2026-07-07).
- **Language:** the content model has no language field; editions and the item page use `en` ("English").
- **Card:** the old 2-column grid, plus the `descriptor` as one muted line under the author when set (decided by vengi, 2026-11-26).
- **Item page:** adds a "Licence" row (entry `licence`, else `site.md`'s). The media entry's body is the longer text (old "abstract"), rendered as markdown. "View in Browser" goes to the hub page of the transmission or book.
- **Covers:** an item without `cover` gets a generated typographic cover (instead of the old title-on-black placeholder).
- **URLs:** item pages at `/media/<media slug>`, edition files at `/media/<slug>/<slug>.<ext>`, works' files at `/assets/<name>`. No redirects from the old `/media/<title slug>` or `/assets/<slug>.<ext>` URLs (decided by vengi, 2026-11-26).
- **Donate:** the old x402 wallet flow needs server routes and stays on a separate server (decided by vengi, 2026-11-26). For now the shop's Donate links go to the hub's `/donate` page (decided by vengi, 2026-11-26); setting `OM_SHOP_DONATE_URL` points them at the x402 server later.

## Editions

- Built by `packages/content/editions.ts`: one markdown source per edition; EPUB 3 and Markdown with pandoc, PDF with pandoc + typst (A5). A book is one file per format: title page, introduction, a generated "Contents" list, then each essay as a chapter (its headings shifted down one level).
- **Templates** in `packages/content/templates/` (EPUB CSS, typst header, cover). Their colours and fonts are the `--ed-*` tokens in `packages/ui/tokens.css` (new values: the old shop's files were made by hand). Embedded fonts in EPUBs.
- **Cache:** `.cache/editions/<slug>-<hash>/`, keyed by the entries, the referenced asset files, the templates, the tokens, the fonts, `editions.ts` itself and the pandoc/typst versions. `OM_EDITIONS_CACHE` moves it.
- **Deterministic:** `SOURCE_DATE_EPOCH` is set from the piece's date, so two builds give byte-identical files (checked).
- **Offline:** remote images in entries become links in editions (pandoc would otherwise fetch them). Pandoc's citation syntax is off (`markdown-citations`), so a bare `@name` in a URL stays text. Links to in-page anchors that don't exist become plain text (`anchors.lua`; typst refuses dangling labels).
- **Generated covers:** laid out in typst (title, subtitle, author, the hub's name), exported as SVG, rendered to a 1600 × 2400 PNG with sharp.

## Fixture (mediashop)

- Media entries now mirror the old shop's catalog (titles, subtitles, authors, descriptions, abstracts, dates and its 2:3 covers). Because one `cover` and one `date` serve both sites, the hub's Media rail shows the shop covers in shop date order, and shop titles ("Ethereum Localism", "Ethereum - Earth Computer") instead of the old hub's hand-written ones.
- Real EPUB and Markdown files for Friends of the Outside and Ethereum Localism; placeholder PDFs where the real ones are too large (Ethereum Localism 13 MB, Earth Computer 33 MB).
- `on-edition`: sparse edge case (no cover, author, subtitle or licence; Markdown only).

## Notebooks (from om-ies)

- **IES framework = an exact copy of the om-ies page** (decided by vengi, 2026-11-26): `sites/notebooks/src/bespoke/institutions-extitutions-substrates/index.html` is om-ies' `index.html` byte for byte, with `openEndedIntelligence.svg` and `substrate.svg` served at `/` and at `/institutions-extitutions-substrates/` (so the page's relative link works with or without a trailing slash). The build changes exactly two things: the Google Fonts `<link>`s become the same fonts self-hosted (hard rule 3), and the shared dropdown header is inserted after `<body>` with its CSS in `<head>`. IES is **always published** (decided by vengi, 2026-11-26): its title, summary, framework standing and date (2026-07-15, om-ies' first commit) are in `packages/content/bespoke.ts`, and `notebookList()` adds it to the outer mind's notebooks for every site (notebooks header, index and gate; the hub's Research section; concept links to the glossary). If the outer mind publishes a notebook with the same slug, that entry's details are used. This keeps a copy of content in om-sites, an accepted exception to hard rule 2. `src/bespoke/index.ts` maps slugs to such pages.
- **Other notebooks** (markdown: `index.md` + sections) use the shared om-ies-style template below.
- **Template, kept from om-ies:** colours, grid background, Space Grotesk + IBM Plex Mono (self-hosted woff2 from @fontsource in `public/fonts`), the hero (eyebrow, title, italic summary, animated "SCROLL ↓"), the glossary rows and two-column list, the dark footer band and the "built with <3" credit (now with the hub's name).
- **New, using the same type styles:** the shared header (hub link, then one `<details>` dropdown at every width — Frameworks, Notebooks, Glossary — because notebook names are long; decided by vengi, 2026-11-26), the text column, the numbered contents list, sections, "Concepts in this notebook" (full width, as the old glossary), the index page and `/glossary` (aliases, related concepts, the notebooks that use each one).
- **No client JS in the template.** The IES copy keeps its own script (diagram drawing, toggles, reveal on scroll).
- **URLs:** the old site's `/` was the IES page; now `/` is the index and IES is at `/institutions-extitutions-substrates`.
- **Gate:** `packages/content/gate.ts` runs the site's dev/build/preview only when there is a notebook (IES counts, so the site is always built now); a skipped build removes `dist/notebooks`.
- **Fixture:** an IES notebook entry (metadata for the header, index and hub; its markdown sections are only seen on the wiki), its 16 glossary terms as concepts, and the Metacogsec working notebook for the template.

## Wiki (replaces om-quartz; no Quartz code)

- **New design on the hub's base** (decided by vengi, 2026-11-26): hub fonts (the same Typekit kit, already the old wiki's fonts) and colours, 1px rules, uppercase letter-spaced labels, grow-underline links, the hub's markdown sizes with Polymath headings. Dark by default following the system; the toggle stores the choice (`data-theme`). Simple three columns: explorer · text · contents and backlinks; one column on narrow screens; reader mode hides the side columns.
- **Kept from the old wiki:** title → home, search, light/dark, reader mode, folder explorer, breadcrumbs, title, date and reading time, tags, contents, backlinks, footer. **Dropped:** the AI chat (calls a model and a server at runtime) and link popovers (decided by vengi, 2026-11-26). The graph is drawn again, below.
- **Shows the whole outer mind:** a page per entry at its path in `public/` (a notebook at its folder), every frontmatter field in a "Fields" table (slugs link to their pages, assets to their files), "See it on the hub / media shop / notebooks" when the entry appears there, a page per folder (`/concepts/` is the concept index), `/assets/` listing every asset (all are copied), `/tags/` and a page per tag. `[[links]]` on the wiki go to wiki pages. Quarterly digests show in full.
- **For LLMs:** `<path>.md` is the entry's file verbatim; `/llms.txt` (title, summary and raw-markdown URL per entry, grouped by folder); `/llms-full.txt` (every file, concatenated, each headed by an HTML comment with its path and URL); `/index.json` (path, type, title, summary, date, updated, links as wiki paths).
- **Search:** Pagefind runs after `astro build` (offline). In `pnpm dev` there is no index, so the box says "Search is built with the site". Page titles are marked with `data-pagefind-meta`.
- **Explorer and home folders** (2026-11-27): About, Concepts, Events, Media, Research, Projects, in that order. About is the `page` entries; the Pages folder is not listed. Research is the notebooks, including the bespoke IES notebook, at `/research/`; a notebook's own page stays at its wiki path. Settings (`site.md`) and Assets are not listed. `/site` and `/assets/` still exist, they are just absent from the explorer and the home grid. Tags stay at `/tags/`, linked from the home page's small print.
- **Graph** (2026-11-27): a force-directed graph of those notes, drawn on a canvas with no added dependency. A link is an entry's resolved outgoing slug (a body wikilink or a slug field), drawn once, in either direction. The home page shows every note in a preview that expands to the screen. A note's page shows that note and the notes it shares a link with, the note starting in the center. Scroll or the buttons zoom, dragging empty space pans, dragging a node moves it, and a click opens a tooltip with a link to the note. Settings is not a node.
- **Client JS:** the theme and reader toggles (with an inline pre-paint script), the graph, and loading Pagefind's own UI.

## Schema 3, flat media folder and `pnpm media` (2026-11-26)

- **The old site repos are no longer a reference.** The sections above record where each design came from; the code in `sites/` is now the reference, and nothing reads the old repos.
- **`public/media/` is one flat folder** of transmissions, collections and shop entries; `load.ts` allows those three types there and tells them apart by `type`. Hub URLs are unchanged (`/transmissions/<slug>`, `/collections/<slug>`). Wiki paths follow the outer mind's folders, so those entries now sit under `/media/` on the wiki.
- **Every media entry has `edition_of`.** `cover` and `files` are custom files the note supplied; `formats` is what the shop offers. The fixture's old shop "works" (posters, zines, the printed books) got small source transmissions (`<slug>-poster`, `-zine`, `-booklet`, `-anthology`) and `formats` matching what they supply.
- **Generation moved out of the build** into `pnpm media` (`scripts/media.ts`), writing `media-files/<slug>/` (committed) with a `manifest.json`. The input hash covers the source text, entries, assets, templates, tokens, fonts and `editions.ts`, but not tool versions (recorded in the manifest only), so `pnpm check` and `pnpm build` need neither pandoc nor typst. The old `.cache/editions/` is unused and can be deleted.
- **Download names**: every offered format is served as `/media/<slug>/<slug>.<ext>`, supplied or generated. A supplied cover keeps its asset URL; a generated one is `/media/<slug>/cover.png`.
- **`pnpm check`**: a missing cover or format is an error ("run pnpm media"); a stale generated file is a warning, and the build ships the old file until `pnpm media` runs.
- The fixture's generated files go to `fixtures/media-files/` (`OM_MEDIA_FILES`), so `pnpm media:fixture` never touches the real `media-files/`.
