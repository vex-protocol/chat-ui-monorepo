#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APK_PATH="$ROOT_DIR/android/app/build/outputs/apk/release/app-release.apk"

echo "Building release APK..."
(
  cd "$ROOT_DIR/android"
  ./gradlew assembleRelease
)

if [[ ! -f "$APK_PATH" ]]; then
  echo "Release APK not found at: $APK_PATH"
  exit 1
fi

if ! command -v adb >/dev/null 2>&1; then
  echo "adb is not installed or not on PATH."
  exit 1
fi

DEVICES=()
while IFS= read -r device; do
  if [[ -n "$device" ]]; then
    DEVICES+=("$device")
  fi
done < <(adb devices | awk 'NR > 1 && $2 == "device" { print $1 }')

if [[ ${#DEVICES[@]} -eq 0 ]]; then
  echo "No connected Android devices found via adb."
  exit 1
fi

for device in "${DEVICES[@]}"; do
  echo "Installing on $device..."
  adb -s "$device" install -r "$APK_PATH"
done

echo "Installed release APK on ${#DEVICES[@]} device(s)."

