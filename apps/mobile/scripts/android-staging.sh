#!/usr/bin/env bash
set -euo pipefail

export EXPO_PUBLIC_ENABLE_DEV_SERVER=1
export EXPO_PUBLIC_SERVER_URL=dev.vex.wtf
export VEX_ENABLE_DEV_BUILD=1
export EAS_BUILD_PROFILE=development
export VEX_ANDROID_GOOGLE_SERVICES_FILE=./google-services.staging.json

if [[ ! -f "$VEX_ANDROID_GOOGLE_SERVICES_FILE" ]]; then
  cat >&2 <<EOF
Missing $VEX_ANDROID_GOOGLE_SERVICES_FILE

Download Firebase google-services.json for Android package chat.vex.mobile.dev
and save it at:

  apps/mobile/google-services.staging.json

Then rerun:

  pnpm android:staging
EOF
  exit 1
fi

expo prebuild --clean --platform android
pnpm run android
