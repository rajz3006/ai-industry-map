#!/usr/bin/env bash
# Manual production deploy (no CI/CD is wired up for this repo — see AGENTS.md).
#
# What it does:
#   1. Shows what's about to ship (branch, commit, any uncommitted local changes —
#      `vercel --prod` deploys whatever's on disk right now, not necessarily HEAD).
#   2. Builds + deploys to Vercel production (`vercel --prod`).
#   3. Points myaiprobe.vercel.app at the new deployment (`vercel alias set`).
#
# Usage:
#   ./scripts/deploy-prod.sh          # asks for confirmation first
#   ./scripts/deploy-prod.sh --yes    # skips the confirmation prompt

set -euo pipefail
cd "$(dirname "$0")/.."

ALIAS_DOMAIN="myaiprobe.vercel.app"
AUTO_YES=false
[[ "${1:-}" == "--yes" ]] && AUTO_YES=true

echo "Branch:  $(git rev-parse --abbrev-ref HEAD)"
echo "Commit:  $(git log -1 --oneline)"
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "⚠ Uncommitted local changes are present and WILL be included in this deploy:"
  git status --short
fi
echo

if [[ "$AUTO_YES" != true ]]; then
  read -r -p "Deploy to Vercel production and alias to ${ALIAS_DOMAIN}? [y/N] " reply
  [[ "$reply" =~ ^[Yy]$ ]] || { echo "Aborted."; exit 1; }
fi

echo "Deploying to Vercel production..."
# vercel writes build/progress logs to stderr and the final deployment URL to stdout,
# so this captures just the URL while you still see the build log live.
DEPLOY_URL=$(vercel --prod --yes)

if [[ -z "$DEPLOY_URL" ]]; then
  echo "✗ Deploy did not return a URL — check the output above." >&2
  exit 1
fi
echo "Deployed: $DEPLOY_URL"

echo "Aliasing ${ALIAS_DOMAIN} -> ${DEPLOY_URL}..."
vercel alias set "$DEPLOY_URL" "$ALIAS_DOMAIN"

echo
echo "✓ Live at https://${ALIAS_DOMAIN}"
