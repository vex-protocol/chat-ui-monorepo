#!/usr/bin/env bash
# Installs @vex-chat packages from local Verdaccio into a target project.
#
# Usage:
#   pnpm install:local spire              # install types + crypto into spire
#   pnpm install:local libvex             # install types + crypto into libvex-js
#   pnpm install:local crypto             # install types into crypto-js
#   pnpm install:local store              # install libvex into packages/store
#   pnpm install:local desktop            # install libvex into apps/desktop
#   pnpm install:local mobile             # install libvex into apps/mobile
#   pnpm install:local spire types        # install only types into spire
#   pnpm install:local libvex crypto      # install only crypto into libvex-js

set -euo pipefail

REGISTRY="${VERDACCIO_URL:-http://localhost:4873}"

if [ $# -lt 1 ]; then
  echo "Usage: $0 <target> [packages...]"
  echo ""
  echo "Targets:"
  echo "  spire, libvex, crypto           (sibling repos)"
  echo "  store, desktop, mobile, website (monorepo packages)"
  echo ""
  echo "Packages (optional — defaults based on target's actual deps):"
  echo "  types, crypto, libvex"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# ── Resolve target directory ──
TARGET="$1"; shift
case "$TARGET" in
  spire)    DIR="$ROOT_DIR/../spire" ;;
  libvex)   DIR="$ROOT_DIR/../libvex-js" ;;
  crypto)   DIR="$ROOT_DIR/../crypto-js" ;;
  store)    DIR="$ROOT_DIR/packages/store" ;;
  desktop)  DIR="$ROOT_DIR/apps/desktop" ;;
  mobile)   DIR="$ROOT_DIR/apps/mobile" ;;
  website)  DIR="$ROOT_DIR/apps/website" ;;
  *)        echo "Unknown target: $TARGET"; exit 1 ;;
esac

if [ ! -f "$DIR/package.json" ]; then
  echo "ERROR: $DIR/package.json not found"
  exit 1
fi

# ── Resolve which packages to install ──
PKGS=()
if [ $# -gt 0 ]; then
  # Explicit packages from args
  for arg in "$@"; do
    case "$arg" in
      types)  PKGS+=("@vex-chat/types@local") ;;
      crypto) PKGS+=("@vex-chat/crypto@local") ;;
      libvex) PKGS+=("@vex-chat/libvex@local") ;;
      *)      echo "Unknown package: $arg"; exit 1 ;;
    esac
  done
else
  # Auto-detect from package.json deps
  deps=$(node -p "
    const p = require('$DIR/package.json');
    const all = {...(p.dependencies||{}), ...(p.devDependencies||{}), ...(p.peerDependencies||{})};
    Object.keys(all).filter(k => k.startsWith('@vex-chat/')).join(',')
  ")
  IFS=',' read -ra found <<< "$deps"
  for dep in "${found[@]}"; do
    case "$dep" in
      @vex-chat/types)  PKGS+=("@vex-chat/types@local") ;;
      @vex-chat/crypto) PKGS+=("@vex-chat/crypto@local") ;;
      @vex-chat/libvex) PKGS+=("@vex-chat/libvex@local") ;;
      @vex-chat/store)  ;; # workspace package, skip
      *)                ;; # unknown, skip
    esac
  done
fi

if [ ${#PKGS[@]} -eq 0 ]; then
  echo "No @vex-chat packages to install in $TARGET"
  exit 0
fi

# ── Ensure .npmrc ──
NPMRC_LINE="@vex-chat:registry=$REGISTRY"
rc="$DIR/.npmrc"
if [ ! -f "$rc" ] || ! grep -qF "$NPMRC_LINE" "$rc"; then
  echo "$NPMRC_LINE" >> "$rc"
fi

echo "Installing into $TARGET ($DIR):"
echo "  ${PKGS[*]}"
echo ""

cd "$DIR"
npm install "${PKGS[@]}"
