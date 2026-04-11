#!/usr/bin/env bash
set -euo pipefail

# Idempotent Android SDK setup. Runs via mise postinstall hook.
# Exits cleanly if the android-sdk plugin isn't installed yet
# (first-ever `mise install` before bootstrap).

if ! command -v sdkmanager >/dev/null 2>&1; then
    echo "[android:setup] sdkmanager not on PATH — run ./scripts/bootstrap.sh first"
    exit 0
fi

: "${ANDROID_HOME:?ANDROID_HOME not set (expected from mise.toml)}"

API_LEVEL="35"
BUILD_TOOLS="35.0.0"
SYSTEM_IMAGE="system-images;android-${API_LEVEL};google_apis;arm64-v8a"
AVD_NAME="vex_pixel"
AVD_DEVICE="pixel_9a"

echo "[android:setup] accepting SDK licenses"
yes | sdkmanager --licenses >/dev/null 2>&1 || true

echo "[android:setup] installing SDK packages (idempotent)"
sdkmanager \
    "platform-tools" \
    "platforms;android-${API_LEVEL}" \
    "build-tools;${BUILD_TOOLS}" \
    "emulator" \
    "${SYSTEM_IMAGE}"

if avdmanager list avd 2>/dev/null | grep -qE "^\s*Name:\s+${AVD_NAME}\b"; then
    echo "[android:setup] AVD '${AVD_NAME}' already exists"
else
    echo "[android:setup] creating AVD '${AVD_NAME}'"
    echo no | avdmanager create avd \
        --name "${AVD_NAME}" \
        --package "${SYSTEM_IMAGE}" \
        --device "${AVD_DEVICE}"
fi

echo "[android:setup] done. Start emulator: emulator -avd ${AVD_NAME}"
