#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=ios-dev-env.sh
source "$SCRIPT_DIR/ios-dev-env.sh"
# shellcheck source=ios-common.sh
source "$SCRIPT_DIR/ios-common.sh"

cd "$ROOT_DIR"
run_ios_flavor "$@"
