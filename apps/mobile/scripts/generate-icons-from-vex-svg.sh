#!/usr/bin/env bash
set -euo pipefail

UI_ROOT_DIR="$(cd "$(dirname "$0")/../../.." && pwd)"
MOBILE_DIR="$UI_ROOT_DIR/apps/mobile"
SVG_SRC="$UI_ROOT_DIR/assets/vex_icon.svg"
ASSETS_DIR="$MOBILE_DIR/assets"
ANDROID_FOREGROUND_SIZE="700x700"
DEV_ICON_FILL="#a8c8df" # COLORS ICE BLUE

if [ ! -f "$SVG_SRC" ]; then
    echo "Source SVG not found: $SVG_SRC" >&2
    exit 1
fi

cp "$SVG_SRC" "$ASSETS_DIR/app-icon.svg"

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT
DEV_SVG="$TMP_DIR/vex-dev-icon.svg"
ANDROID_FOREGROUND="$TMP_DIR/vex-android-foreground.png"
ANDROID_DEV_FOREGROUND="$TMP_DIR/vex-android-dev-foreground.png"

sed "s/#E70000/$DEV_ICON_FILL/g; s/#e70000/$DEV_ICON_FILL/g" \
    "$ASSETS_DIR/app-icon.svg" > "$DEV_SVG"

magick -background "#000000" \
    "$ASSETS_DIR/app-icon.svg" \
    -alpha remove \
    -strip \
    PNG24:"$ASSETS_DIR/icon-prod.png"

magick -background "#000000" \
    "$DEV_SVG" \
    -alpha remove \
    -strip \
    PNG24:"$ASSETS_DIR/icon-dev.png"

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

magick -background none \
    "$DEV_SVG" \
    -alpha on \
    -strip \
    -resize "$ANDROID_FOREGROUND_SIZE" \
    +repage \
    PNG32:"$ANDROID_DEV_FOREGROUND"

magick -size 1024x1024 xc:"#000000" \
    "$ANDROID_DEV_FOREGROUND" \
    -gravity center \
    -compose over \
    -composite \
    PNG24:"$ASSETS_DIR/icon-dev-android.png"

echo "Regenerated mobile icons from: $SVG_SRC"
