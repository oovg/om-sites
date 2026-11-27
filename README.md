# om-sites

The four Open Machine sites, built from the outer mind: the **hub** (theopenmachine.net), the **media shop**, the **wiki** and the **research notebooks**. Astro, static output, no content of its own: every page comes from the outer mind's `public/` folder.

How publishing works overall is in `om-publishing/README.md`; day to day, `om build` and `om ship` run the commands here for you. `CLAUDE.md` is the brief Claude Code follows when it works in this folder.

## Commands

```sh
pnpm install                 # once, and after pulling dependency changes
pnpm media                   # make the shop files the notes didn't supply (needs pandoc and typst)
pnpm check                   # validate the outer mind
pnpm build                   # check, then build every site into dist/
pnpm preview                 # serve dist/ locally
pnpm dev                     # every site with live reload, for design work
pnpm dev:fixture             # the same on placeholder content (also check:fixture, build:fixture, media:fixture)
```

`pnpm media [slug…] --force` remakes shop files even when they're up to date.

## Where things are

```
sites/hub, mediashop, notebooks, wiki    each site (Astro)
packages/content                         the only code that reads the outer mind: schemas, loading, links, shop files, checks
packages/ui/tokens.css                   fonts, colours, type scale, spacing for every site: most design changes start here
packages/content/templates               the PDF, EPUB and cover templates pnpm media uses
media-files/                             shop files made by pnpm media: committed, so any build can use them
fixtures/outer-mind                      placeholder content covering every kind of entry, for design work
scripts/media.ts                         pnpm media
scripts/vercel-build.sh                  how Vercel builds one site
DECISIONS.md                             why things are the way they are
.env                                     OUTER_MIND=<path to om-outer-mind> (not committed)
```

## Changing the design

On a branch, run `pnpm dev`, edit (most often `packages/ui/tokens.css`), and check each site's `/_styleguide` page, which shows every kind of entry on one page. Then run `pnpm media` so generated PDFs and EPUBs pick up the new style, commit everything including `media-files/`, and merge into `main`. Nothing needs republishing.

## Deploys

Each site is a Vercel project that runs `bash scripts/vercel-build.sh <site>`. It fetches the outer mind from GitHub (`OUTER_MIND_REPO`), then runs `pnpm check` and builds that one site. Pushing to `main` here, or to the outer mind's `main`, redeploys all four. Settings: `om-publishing/README.md`, section 8.
