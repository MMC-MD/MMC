#!/usr/bin/env bash
# Recompress oversized JPG/PNG/WEBP assets for the web.
#
# Outputs go to images/optimized/ first so the originals stay intact.
# After review, copy/move them over the originals (or update the HTML
# to point at images/optimized/...).
#
# Requires: cwebp (brew install webp), sips (built into macOS), or
# ImageMagick (brew install imagemagick) — falls back gracefully.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/images"
OUT="$ROOT/images/optimized"
mkdir -p "$OUT"

# Target dimensions for hero/wide images.
HERO_WIDTH=1920
PORTRAIT_WIDTH=900
WEBP_QUALITY=78
JPEG_QUALITY=82

shopt -s nullglob

# Resize + recompress to WebP for files over 500KB.
for f in "$SRC"/*.jpeg "$SRC"/*.jpg "$SRC"/*.png "$SRC"/*.webp; do
  [ -e "$f" ] || continue
  name=$(basename "$f")
  size_kb=$(($(stat -f%z "$f") / 1024))
  [ "$size_kb" -lt 500 ] && continue

  # Pick a target width based on filename heuristics.
  case "$name" in
    NewImage*|PhotoWide*|imageinside*|welcome*|office*|Clinic*|Logo*) width=$HERO_WIDTH ;;
    *) width=$PORTRAIT_WIDTH ;;
  esac

  base="${name%.*}"
  target_webp="$OUT/${base}.webp"
  target_jpg="$OUT/${base}.jpg"

  echo "→ $name (${size_kb}KB) → width=${width}"

  # Resize via sips into a temp PNG, then encode.
  tmp="$(mktemp -t mmc-img).png"
  sips --resampleWidth "$width" "$f" --out "$tmp" >/dev/null 2>&1 || cp "$f" "$tmp"

  if command -v cwebp >/dev/null 2>&1; then
    cwebp -q "$WEBP_QUALITY" -m 6 "$tmp" -o "$target_webp" >/dev/null 2>&1 || true
  fi

  # Always emit a JPEG fallback for <picture> sources.
  sips -s format jpeg -s formatOptions "$JPEG_QUALITY" "$tmp" --out "$target_jpg" >/dev/null 2>&1 || true

  rm -f "$tmp"
done

echo
echo "Done. Optimized files are in: $OUT"
echo "Review them, then replace the originals or update HTML paths."
