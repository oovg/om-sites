#!/usr/bin/env bash
# Build one site on Vercel (or anywhere): bash scripts/vercel-build.sh <hub|mediashop|notebooks|wiki>
# If OUTER_MIND_REPO is set (owner/repo on GitHub), the outer mind is cloned into .outer-mind first,
# using OUTER_MIND_TOKEN (a read-only token) when the repo is private. Otherwise OUTER_MIND / .env is used.
# Output: dist/<site>. Needs no pandoc or typst: shop files come from the committed media-files/.
set -euo pipefail
SITE="${1:?usage: scripts/vercel-build.sh <hub|mediashop|notebooks|wiki>}"

if [ -n "${OUTER_MIND_REPO:-}" ]; then
  if [ -n "${OUTER_MIND_TOKEN:-}" ]; then
    URL="https://x-access-token:${OUTER_MIND_TOKEN}@github.com/${OUTER_MIND_REPO}.git"
  else
    URL="https://github.com/${OUTER_MIND_REPO}.git"
  fi
  rm -rf .outer-mind
  git clone --quiet --depth 1 --branch "${OUTER_MIND_BRANCH:-main}" "$URL" .outer-mind
  export OUTER_MIND="$PWD/.outer-mind"
  echo "outer mind: ${OUTER_MIND_REPO}@$(git -C .outer-mind rev-parse --short HEAD)"
fi

pnpm check
pnpm --filter "@om/${SITE}" build
