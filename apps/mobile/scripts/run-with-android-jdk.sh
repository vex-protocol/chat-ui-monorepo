#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Prefer a dedicated JDK 17 when available (stable Gradle toolchain
# behavior). On the maintainer's Linux box that lives at the path
# below; on macOS we fall through to /usr/libexec/java_home or
# Android Studio's bundled JBR via ensure-java-home.sh.
if [[ -z "${VEX_ANDROID_JAVA_HOME:-}" && -x "${HOME}/.jdks/jdk-17.0.19+10/bin/java" ]]; then
  export VEX_ANDROID_JAVA_HOME="${HOME}/.jdks/jdk-17.0.19+10"
fi
# shellcheck source=ensure-java-home.sh
source "$SCRIPT_DIR/ensure-java-home.sh"
# shellcheck source=ensure-android-sdk.sh
source "$SCRIPT_DIR/ensure-android-sdk.sh"

exec "$@"
