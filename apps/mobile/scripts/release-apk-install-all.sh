#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=ensure-java-home.sh
source "$SCRIPT_DIR/ensure-java-home.sh"
# shellcheck source=ensure-android-sdk.sh
source "$SCRIPT_DIR/ensure-android-sdk.sh"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APK_PATH="$ROOT_DIR/android/app/build/outputs/apk/release/app-release.apk"

detect_architectures_from_connected_devices() {
  local abi
  local -a serials=()
  local -a archs=()

  while IFS= read -r serial; do
    [[ -n "$serial" ]] && serials+=("$serial")
  done < <(adb devices | awk 'NR > 1 && $2 == "device" { print $1 }')

  if [[ ${#serials[@]} -eq 0 ]]; then
    echo "arm64-v8a"
    return 0
  fi

  for serial in "${serials[@]}"; do
    abi="$(adb -s "$serial" shell getprop ro.product.cpu.abi 2>/dev/null | tr -d '\r')"
    case "$abi" in
      arm64-v8a|armeabi-v7a|x86|x86_64)
        if [[ " ${archs[*]} " != *" ${abi} "* ]]; then
          archs+=("$abi")
        fi
        ;;
    esac
  done

  if [[ ${#archs[@]} -eq 0 ]]; then
    echo "arm64-v8a"
    return 0
  fi

  (IFS=,; echo "${archs[*]}")
}

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

if [[ -z "${ORG_GRADLE_PROJECT_reactNativeArchitectures:-}" ]]; then
  export ORG_GRADLE_PROJECT_reactNativeArchitectures="$(detect_architectures_from_connected_devices)"
fi
echo "Using reactNativeArchitectures=${ORG_GRADLE_PROJECT_reactNativeArchitectures}"

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

