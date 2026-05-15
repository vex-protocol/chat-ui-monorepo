#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=android-prod-env.sh
source "$SCRIPT_DIR/android-prod-env.sh"

validate_android_prod_google_services

expo prebuild --clean --platform android
validate_android_prod_prebuild

echo "Launching Android prod flavor (${APP_PACKAGE}) against ${EXPO_PUBLIC_SERVER_URL}..."
enable_installed_android_prod_packages
pnpm run android:clean-autolinking
bash ./scripts/run-with-android-jdk.sh bash ./scripts/android-run.sh --app-id "$APP_PACKAGE"
