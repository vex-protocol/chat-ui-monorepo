#!/usr/bin/env bash
set -euo pipefail

export EXPO_PUBLIC_ENABLE_DEV_SERVER=1
export EXPO_PUBLIC_SERVER_URL=dev.vex.wtf
export VEX_ENABLE_DEV_BUILD=1
export EAS_BUILD_PROFILE=development
export VEX_ANDROID_GOOGLE_SERVICES_FILE=./google-services.staging.json
export APP_PACKAGE=chat.vex.mobile.dev

EXPECTED_ANDROID_PACKAGE="chat.vex.mobile.dev"

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

GOOGLE_SERVICES_PACKAGE="$(
  node -e '
    const fs = require("node:fs");
    const path = process.argv[1];
    const data = JSON.parse(fs.readFileSync(path, "utf8"));
    const clients = Array.isArray(data.client) ? data.client : [];
    const packageNames = clients
      .map((client) => client.client_info?.android_client_info?.package_name)
      .filter(Boolean);
    console.log(packageNames.join("\n"));
  ' "$VEX_ANDROID_GOOGLE_SERVICES_FILE"
)"

if ! grep -qx "$EXPECTED_ANDROID_PACKAGE" <<<"$GOOGLE_SERVICES_PACKAGE"; then
  cat >&2 <<EOF
$VEX_ANDROID_GOOGLE_SERVICES_FILE does not contain Android package $EXPECTED_ANDROID_PACKAGE.

Found package(s):
$GOOGLE_SERVICES_PACKAGE
EOF
  exit 1
fi

expo prebuild --clean --platform android

if ! grep -q "applicationId '$EXPECTED_ANDROID_PACKAGE'" ./android/app/build.gradle; then
  cat >&2 <<EOF
Android prebuild did not generate applicationId '$EXPECTED_ANDROID_PACKAGE'.
Check VEX_ENABLE_DEV_BUILD and EAS_BUILD_PROFILE before running staging.
EOF
  exit 1
fi

pnpm run android
