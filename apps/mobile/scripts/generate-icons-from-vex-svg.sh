#!/usr/bin/env bash
set -euo pipefail

UI_ROOT_DIR="$(cd "$(dirname "$0")/../../.." && pwd)"
MOBILE_DIR="$UI_ROOT_DIR/apps/mobile"
SVG_SRC="$UI_ROOT_DIR/assets/vex_icon.svg"
ASSETS_DIR="$MOBILE_DIR/assets"
ANDROID_FOREGROUND_SIZE="700x700"

if [ ! -f "$SVG_SRC" ]; then
    echo "Source SVG not found: $SVG_SRC" >&2
    exit 1
fi

cp "$SVG_SRC" "$ASSETS_DIR/app-icon.svg"

magick -background "#000000" \
    "$ASSETS_DIR/app-icon.svg" \
    -alpha remove \
    -strip \
    PNG24:"$ASSETS_DIR/icon-prod.png"

cp "$ASSETS_DIR/icon-prod.png" "$ASSETS_DIR/icon-dev.png"

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT
ANDROID_FOREGROUND="$TMP_DIR/vex-android-foreground.png"

magick -background none \
    "$ASSETS_DIR/app-icon.svg" \
    -alpha on \
    -strip \
    -resize "$ANDROID_FOREGROUND_SIZE" \
    +repage \
    PNG32:"$ANDROID_FOREGROUND"

magick -size 1024x1024 xc:"#000000" \
    "$ANDROID_FOREGROUND" \
    -gravity center \
    -compose over \
    -composite \
    PNG24:"$ASSETS_DIR/icon-prod-android.png"

cp "$ASSETS_DIR/icon-prod-android.png" "$ASSETS_DIR/icon-dev-android.png"

echo "Regenerated mobile icons from: $SVG_SRC"
