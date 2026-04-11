#!/usr/bin/env bash
set -euo pipefail

# One-time Android toolchain bootstrap for vex-chat (macOS).
# Installs the Android command-line tools via homebrew-cask, then delegates
# to scripts/mise-android-postinstall.sh to accept licenses, install SDK
# packages, and create the emulator AVD.

if ! command -v mise >/dev/null 2>&1; then
    echo "error: mise is not installed. See https://mise.jdx.dev/getting-started.html" >&2
    exit 1
fi

if ! command -v brew >/dev/null 2>&1; then
    echo "error: Homebrew is required for android-commandlinetools. Install from https://brew.sh" >&2
    exit 1
fi

if brew list --cask android-commandlinetools >/dev/null 2>&1; then
    echo "[bootstrap] android-commandlinetools cask already installed"
else
    echo "[bootstrap] installing android-commandlinetools cask"
    brew install --cask android-commandlinetools
fi

echo "[bootstrap] running mise install"
mise install

echo "[bootstrap] running android post-install (licenses, packages, AVD)"
mise exec -- ./scripts/mise-android-postinstall.sh

echo
echo "[bootstrap] done."
echo "  Start emulator:  emulator -avd vex_pixel"
echo "  Run mobile app:  pnpm -C apps/mobile android"
