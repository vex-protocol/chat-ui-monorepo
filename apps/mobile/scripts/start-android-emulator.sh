#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=ensure-java-home.sh
source "$SCRIPT_DIR/ensure-java-home.sh"
# shellcheck source=ensure-android-sdk.sh
source "$SCRIPT_DIR/ensure-android-sdk.sh"

export QT_QPA_PLATFORM="${QT_QPA_PLATFORM:-xcb}"

_args=("$@")
while [[ ${#_args[@]} -gt 0 && "${_args[0]}" == "--" ]]; do
  _args=("${_args[@]:1}")
done

_has_avd=false
for _a in "${_args[@]}"; do
  if [[ "$_a" == @* || "$_a" == -avd || "$_a" == -avd=* ]]; then
    _has_avd=true
    break
  fi
done

if [[ "$_has_avd" == false ]]; then
  _default_avd="${ANDROID_EMULATOR_AVD:-vex_stable}"
  if ! emulator -list-avds | awk -v avd="$_default_avd" 'BEGIN { found=0 } $0==avd { found=1 } END { exit(found ? 0 : 1) }'; then
    _first_avd="$(emulator -list-avds | awk 'NR==1 { print $0 }')"
    if [[ -z "${_first_avd:-}" ]]; then
      echo "No Android AVD found. Create one in Android Studio Device Manager first." >&2
      exit 1
    fi
    _default_avd="$_first_avd"
  fi
  set -- -avd "$_default_avd" -no-snapshot-load -no-snapshot-save -no-boot-anim -gpu host "${_args[@]}"
else
  set -- "${_args[@]}"
fi

exec "${ANDROID_HOME}/emulator/emulator" "$@"
