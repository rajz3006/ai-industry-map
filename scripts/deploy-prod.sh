#!/usr/bin/env bash
# Manual production deploy (no CI/CD is wired up for this repo — see AGENTS.md).
#
# What it does:
#   1. Shows what's about to ship (branch, commit, any uncommitted local changes —
#      `vercel --prod` deploys whatever's on disk right now, not necessarily HEAD).
#   2. Builds + deploys to Vercel production (`vercel --prod`).
#   3. Confirms myaiprobe.vercel.app now points at the deployment that just shipped.
#      No separate `vercel alias set` step is needed: myaiprobe.vercel.app is already
#      assigned to this project's Production environment in Vercel, and `vercel --prod`
#      re-aliases every domain assigned to Production on each successful deploy.
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
  read -r -p "Deploy to Vercel production (${ALIAS_DOMAIN})? [y/N] " reply
  [[ "$reply" =~ ^[Yy]$ ]] || { echo "Aborted."; exit 1; }
fi

echo "Deploying to Vercel production..."
# Streamed directly (not captured into a variable) — some environments wrap `vercel`'s
# output (e.g. a CLI-integration plugin), so parsing its stdout for the deployment URL
# isn't reliable. We confirm success below via a fresh `vercel inspect` instead.
vercel --prod --yes

echo
echo "Confirming ${ALIAS_DOMAIN} points at the deployment that just shipped..."
INSPECT_OUT=$(vercel inspect "$ALIAS_DOMAIN" 2>&1)
DEPLOYED_AT=$(echo "$INSPECT_OUT" | grep -m1 '^\s*created' || true)
STATUS_LINE=$(echo "$INSPECT_OUT" | grep -m1 '^\s*status' || true)

echo "$STATUS_LINE"
echo "$DEPLOYED_AT"

if ! echo "$STATUS_LINE" | grep -q "Ready"; then
  echo "✗ ${ALIAS_DOMAIN} isn't showing as Ready — check 'vercel inspect ${ALIAS_DOMAIN}' manually." >&2
  exit 1
fi

echo
echo "✓ Live at https://${ALIAS_DOMAIN}"
