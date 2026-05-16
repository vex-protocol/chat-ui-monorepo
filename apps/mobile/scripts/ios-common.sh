#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

IOS_WORKSPACE_PATH="$ROOT_DIR/ios/Vex.xcworkspace"
IOS_SCHEME_NAME="${VEX_IOS_SCHEME:-Vex}"
IOS_CONFIGURATION="${VEX_IOS_CONFIGURATION:-Release}"

: "${EXPECTED_IOS_BUNDLE_IDENTIFIER:?EXPECTED_IOS_BUNDLE_IDENTIFIER must be set by an iOS flavor env script}"
: "${VEX_IOS_DEVELOPMENT_TEAM:?VEX_IOS_DEVELOPMENT_TEAM must be set by an iOS flavor env script}"

require_ios_tools() {
  if ! command -v xcodebuild >/dev/null 2>&1; then
    echo "xcodebuild is not available. Install Xcode command line tools first."
    exit 1
  fi

  if ! command -v xcrun >/dev/null 2>&1; then
    echo "xcrun is not available."
    exit 1
  fi
}

detect_ios_device_id() {
  local requested_device_id="${1:-${IOS_DEVICE_ID:-}}"

  if [[ -n "$requested_device_id" ]]; then
    echo "$requested_device_id"
    return 0
  fi

  xcrun xctrace list devices 2>/dev/null \
    | /usr/bin/sed -nE '/^== Devices ==/,/^== /{/^==/d;/Simulator/d;s/.*\([0-9][^)]*\) \(([0-9A-Fa-f-]{12,})\)[[:space:]]*$/\1/p;}' \
    | /usr/bin/head -n 1
}

validate_ios_prebuild() {
  local project_file="$ROOT_DIR/ios/Vex.xcodeproj/project.pbxproj"

  if [[ ! -f "$project_file" ]]; then
    echo "iOS prebuild did not generate $project_file."
    exit 1
  fi

  if ! grep -q "PRODUCT_BUNDLE_IDENTIFIER = ${EXPECTED_IOS_BUNDLE_IDENTIFIER};" "$project_file"; then
    cat >&2 <<EOF
iOS prebuild did not generate bundle id '${EXPECTED_IOS_BUNDLE_IDENTIFIER}'.
Check VEX_ENABLE_DEV_BUILD, EAS_BUILD_PROFILE, and VEX_IOS_BUNDLE_IDENTIFIER.
EOF
    exit 1
  fi

  if ! grep -q "DEVELOPMENT_TEAM = ${VEX_IOS_DEVELOPMENT_TEAM};" "$project_file"; then
    cat >&2 <<EOF
iOS prebuild did not generate LogicBite development team '${VEX_IOS_DEVELOPMENT_TEAM}'.
Check VEX_IOS_DEVELOPMENT_TEAM.
EOF
    exit 1
  fi
}

prebuild_ios() {
  echo "Prebuilding iOS ${VEX_IOS_FLAVOR_NAME:-flavor} (${EXPECTED_IOS_BUNDLE_IDENTIFIER})..."
  pnpm exec expo prebuild --clean --platform ios
  validate_ios_prebuild
}

run_ios_flavor() {
  require_ios_tools
  prebuild_ios

  echo "Launching iOS ${VEX_IOS_FLAVOR_NAME:-flavor} (${EXPECTED_IOS_BUNDLE_IDENTIFIER}) against ${EXPO_PUBLIC_SERVER_URL}..."
  pnpm exec expo run:ios "$@"
}

install_ios_flavor() {
  require_ios_tools
  prebuild_ios

  local device_id
  device_id="$(detect_ios_device_id "${1:-}")"

  if [[ -z "$device_id" ]]; then
    cat >&2 <<EOF
No connected physical iOS device found.
Connect your iPhone via USB and trust this computer, then retry.
You can also pass a specific device id: pnpm ios:${VEX_IOS_FLAVOR}:install -- <device-id>
EOF
    exit 1
  fi

  local derived_data_path="${IOS_DERIVED_DATA_PATH:-$ROOT_DIR/ios/build-install-${VEX_IOS_FLAVOR}}"
  local products_path="$derived_data_path/Build/Products/${IOS_CONFIGURATION}-iphoneos"
  local app_path="$products_path/Vex.app"

  echo "Building signed ${IOS_CONFIGURATION} iOS ${VEX_IOS_FLAVOR_NAME:-flavor} for device ${device_id}..."
  xcodebuild \
    -workspace "$IOS_WORKSPACE_PATH" \
    -scheme "$IOS_SCHEME_NAME" \
    -configuration "$IOS_CONFIGURATION" \
    -destination "id=$device_id" \
    -derivedDataPath "$derived_data_path" \
    -allowProvisioningUpdates \
    DEVELOPMENT_TEAM="$VEX_IOS_DEVELOPMENT_TEAM" \
    CODE_SIGN_STYLE=Automatic \
    CODE_SIGN_IDENTITY="${VEX_IOS_CODE_SIGN_IDENTITY:-Apple Development}" \
    PRODUCT_BUNDLE_IDENTIFIER="$EXPECTED_IOS_BUNDLE_IDENTIFIER" \
    build

  if [[ ! -d "$app_path" ]]; then
    app_path="$(find "$products_path" -maxdepth 1 -name "*.app" -print -quit 2>/dev/null || true)"
  fi

  if [[ -z "$app_path" || ! -d "$app_path" ]]; then
    echo "Built app not found under: $products_path"
    exit 1
  fi

  echo "Installing ${app_path} onto ${device_id}..."
  xcrun devicectl device install app --device "$device_id" "$app_path"

  echo "Installed ${VEX_APP_DISPLAY_NAME:-Vex} on ${device_id}."
}
