#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=ios-prod-env.sh
source "$SCRIPT_DIR/ios-prod-env.sh"
# shellcheck source=ios-common.sh
source "$SCRIPT_DIR/ios-common.sh"

cd "$ROOT_DIR"
run_ios_flavor "$@"
