#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORKSPACE_PATH="$ROOT_DIR/ios/Vex.xcworkspace"
SCHEME_NAME="Vex"
DERIVED_DATA_PATH="$ROOT_DIR/ios/build-install-release"
APP_PATH="$DERIVED_DATA_PATH/Build/Products/Release-iphoneos/Vex.app"

if ! command -v xcodebuild >/dev/null 2>&1; then
  echo "xcodebuild is not available. Install Xcode command line tools first."
  exit 1
fi

if ! command -v xcrun >/dev/null 2>&1; then
  echo "xcrun is not available."
  exit 1
fi

DEVICE_ID="${1:-${IOS_DEVICE_ID:-}}"

if [[ -z "${DEVICE_ID}" ]]; then
  DEVICE_CANDIDATES="$(
    xcrun xctrace list devices 2>/dev/null \
      | /usr/bin/sed -nE '/\(iOS/!d;/Simulator/d;s/.*\(([0-9A-Fa-f-]{12,})\)[[:space:]]*$/\1/p'
  )"
  DEVICE_ID="${DEVICE_CANDIDATES%%$'\n'*}"
fi

if [[ -z "${DEVICE_ID}" ]]; then
  echo "No connected physical iOS device found."
  echo "Connect your iPhone via USB and trust this computer, then retry."
  echo "You can also pass a specific device id: pnpm run install:ios -- <device-id>"
  exit 1
fi

echo "Building Release for device ${DEVICE_ID}..."
xcodebuild \
  -workspace "$WORKSPACE_PATH" \
  -scheme "$SCHEME_NAME" \
  -configuration Release \
  -destination "id=$DEVICE_ID" \
  -derivedDataPath "$DERIVED_DATA_PATH" \
  -allowProvisioningUpdates \
  build

if [[ ! -d "$APP_PATH" ]]; then
  echo "Built app not found at: $APP_PATH"
  exit 1
fi

echo "Installing Release app onto ${DEVICE_ID}..."
xcrun devicectl device install app --device "$DEVICE_ID" "$APP_PATH"

echo "Install complete."

