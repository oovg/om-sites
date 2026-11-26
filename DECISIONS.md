# Decisions

Non-obvious choices, and differences from the old sites, with the reason for each.

## Workspace

- **Earlier build lost.** The previous `packages/content` and `pnpm check` were gone when the `scaffold` work started (only `.cache/` remained). Both were rebuilt from CLAUDE.md.
- **`OUTER_MIND`** comes from the environment, else from `.env` in the workspace root (found by walking up to `pnpm-workspace.yaml`, so bundled Astro code finds it too). `pnpm *:fixture` scripts point it at `fixtures/outer-mind`.
- **Cross-site links** use the URLs in `site.md`; set `OM_URL_HUB`, `OM_URL_MEDIASHOP`, … to point them at local servers.
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
- **Hero:** first image in `## Hero` = album front, second = album back with the text laid over it (desktop); on mobile the text shows under "What we do". With fewer than two images the text block shows at every width. A trailing link-only paragraph becomes the full-width white banner. The mobile text keeps the content's bold words (the old site hard-coded an unbolded copy).
- **Copy sections** render in the old two-column layout (Research/Process). `###` subsections become the old bordered Process cards. **Differences:** the four hand-drawn SVG icons are gone (not content), and the five "These technologies" statements render as a bulleted list rather than bordered boxes (markdown can't tell the two list styles apart).
- **Call-to-action links:** a paragraph that is only a link whose text ends in "→" renders as the old bordered uppercase button.
- **Donate band:** on a page with a hero, a copy section headed exactly `## Donate` renders as the old untitled inverted band (DonateBlock): its text, and its "→" link as the band's button. The heading itself is not shown. Decided by vengi, 2026-11-26.
- **Research slot:** frameworks (old "Research Topics" card grid), then working notebooks (old "Past Research" stacked cards), linking to the notebooks site. The old hand-written topic and past-research cards are not in the content model.
- **Transmissions slot:** every transmission newest first (the old site showed a hand-picked nine). Essays carry "From *Book*".
- **Media slot:** every media item, newest first; "Descriptor - *Role*"; links to the mediashop item page in the same tab.
- **Events list:** `Format - *Title*, Location YYYY`. Free-text dates such as "monthly beginning April 2026" are not in the model.
- **Pages without a hero** use the old /donate layout: first section = title + lead paragraph, later sections titled blocks. **Differences on /donate:** no "Copy" buttons for the ENS name and address; the address block is not in small mono text.
- **Transmission pages** keep the old label "View in Media Shop" (CLAUDE.md suggests "Also in the media shop"). *Pending decision.* Like the old page they have no footer. A transmission with a `url` and no body has no page; cards link to the `url`.
- **/transmissions** list kept from the old site (old TransmissionsPost cards, no footer).
- **Quarterly pages** (`/updates/<q>`) use the old /q3-2026 hero, Section and Item components. One section per digest project; status line as the section intro; update lines as cards with a "Project update" / "Status change" badge; entry lines as cards with their type as badge, cover beside for transmissions/media/books. **Not in the data model, so not shown:** the "Q3 2026 at a glance" panel (phase marks, counts, category summaries), the Published/Preparing/Brewing… status vocabulary, per-item prose and images for items that aren't entries, and the `noindex` meta tag.
- **/updates/**, **/projects/<slug>**, **/collections/<slug>** are new; they reuse the q3 and transmission-page components.
- **Old pages dropped for now:** /earth-computer, /ethereum-localism-book, /inverted-city, /friends-of-the-outside, /undercapital, /gfel, /library, /surveys, /outside, /abstract-machines (outside the content model; decided by vengi, 2026-11-26).
- **Redirects:** /programme → /updates/, /q3-2026 → /updates/2026-q3 (static meta-refresh pages).

## Fixture

- Images copied from the hub repo, downscaled to 1600px. Large PDFs (Assembly poster, Inverted City) replaced by small typst placeholders; Friends of the Outside and Undercapital PDFs are the real ones.
- Old post dates use the date the old site displayed (it converted midnight UTC to local time).
- `toward-a-nomad-web`: `<strong id="cite-N">` anchors became plain bold (no HTML allowed in entries).
