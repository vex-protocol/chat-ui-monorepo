#!/usr/bin/env bash
set -euo pipefail

UI_ROOT_DIR="$(cd "$(dirname "$0")/../../.." && pwd)"
VEX_ROOT_DIR="$(cd "$UI_ROOT_DIR/.." && pwd)"
MOBILE_DIR="$UI_ROOT_DIR/apps/mobile"
SVG_SRC="$VEX_ROOT_DIR/vex.wtf/src/assets/vex_icon.svg"
ASSETS_DIR="$MOBILE_DIR/assets"

if [ ! -f "$SVG_SRC" ]; then
    echo "Source SVG not found: $SVG_SRC" >&2
    exit 1
fi

cp "$SVG_SRC" "$ASSETS_DIR/app-icon.svg"

magick "$ASSETS_DIR/app-icon.svg" \
    -alpha remove \
    -background "#000000" \
    -strip \
    PNG24:"$ASSETS_DIR/icon-prod.png"

cp "$ASSETS_DIR/icon-prod.png" "$ASSETS_DIR/icon-dev.png"

magick "$ASSETS_DIR/icon-prod.png" \
    -resize 78% \
    -gravity center \
    -background "#0a0a0a" \
    -extent 1024x1024 \
    "$ASSETS_DIR/icon-prod-android.png"

cp "$ASSETS_DIR/icon-prod-android.png" "$ASSETS_DIR/icon-dev-android.png"

echo "Regenerated mobile icons from: $SVG_SRC"
