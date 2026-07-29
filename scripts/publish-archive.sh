#!/bin/zsh

set -e

cd "$(dirname "$0")/.."

git add -- archive-data.json images

if ! git diff --cached --quiet -- archive-data.json images; then
  git commit -m "archive: publish updates" -- archive-data.json images
fi

git push origin HEAD
echo ""
echo "Archive published to GitHub."
