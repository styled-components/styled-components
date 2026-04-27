#!/usr/bin/env bash
# Fetch a curated subset of Web Platform Tests CSS parsing / computed-value
# tests into `raw/`. Re-run after bumping PIN to update the corpus; then
# re-run `node extract.mjs` to regenerate `corpus.json`.
#
# SPDX-License-Identifier: BSD-3-Clause

set -euo pipefail

PIN=${1:-e18ee881f51ec9beca2702345c0869a0aa69cdc5}
BASE="https://raw.githubusercontent.com/web-platform-tests/wpt/$PIN/css"
DEST="$(cd "$(dirname "$0")/.." && pwd)/raw"

mkdir -p "$DEST"
echo "Fetching WPT corpus @ $PIN → $DEST"

FILES=(
  "css-color/parsing/color-computed-hsl.html"
  "css-color/parsing/color-computed-hwb.html"
  "css-color/parsing/color-computed-lab.html"
  "css-color/parsing/color-computed-color-function.html"
  "css-color/parsing/color-computed-color-mix-function.html"
  "css-color/parsing/color-computed-hex-color.html"
  "css-color/parsing/color-computed-named-color.html"
  "css-color/parsing/color-computed-rgb.html"
  "css-values/calc-infinity-nan-computed.html"
  "css-values/minmax-length-computed.html"
  "css-values/minmax-length-invalid.html"
  "css-values/minmax-length-percent-computed.html"
  "css-values/clamp-length-computed.html"
  "css-transforms/parsing/transform-computed.html"
  "css-transforms/parsing/transform-origin-computed.html"
  "css-transforms/parsing/transform-box-computed.html"
  "css-backgrounds/parsing/background-image-computed.sub.html"
  "css-backgrounds/parsing/background-image-valid.html"
  "css-backgrounds/parsing/background-image-invalid.html"
  "css-fonts/parsing/font-computed.html"
  "css-flexbox/parsing/flex-computed.html"
  "css-flexbox/parsing/flex-basis-computed.html"
  "css-logical/parsing/margin-block-inline-computed.html"
  "css-logical/parsing/padding-block-inline-computed.html"
  "css-cascade/parsing/layer.html"
)

for f in "${FILES[@]}"; do
  mkdir -p "$DEST/$(dirname "$f")"
  out="$DEST/$f"
  curl -sfL -o "$out" "$BASE/$f"
  size=$(wc -c < "$out")
  if [ "$size" -lt 100 ]; then
    echo "  FAIL $f ($size bytes) — likely 404; removing"
    rm "$out"
  else
    printf "  ok   %-70s (%7d bytes)\n" "$f" "$size"
  fi
done

echo
echo "Next: node scripts/extract.mjs"
