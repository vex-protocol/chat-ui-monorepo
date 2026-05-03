#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=ensure-java-home.sh
source "$SCRIPT_DIR/ensure-java-home.sh"
# shellcheck source=ensure-android-sdk.sh
source "$SCRIPT_DIR/ensure-android-sdk.sh"

ANDROID_EMULATOR_AVD="${ANDROID_EMULATOR_AVD:-vex_stable}"
export ORG_GRADLE_PROJECT_reactNativeArchitectures="${ORG_GRADLE_PROJECT_reactNativeArchitectures:-x86_64}"

has_ready_device() {
  adb devices | awk 'NR > 1 && $2 == "device" { found=1 } END { exit(found ? 0 : 1) }'
}

emulator_avd_exists() {
  emulator -list-avds | awk -v avd="$ANDROID_EMULATOR_AVD" 'BEGIN { found=0 } $0==avd { found=1 } END { exit(found ? 0 : 1) }'
}

target_emulator_running() {
  local serial running_name
  while IFS= read -r serial; do
    [[ -z "$serial" ]] && continue
    running_name="$(adb -s "$serial" emu avd name 2>/dev/null | awk 'NR==1 { print $0 }' | tr -d '\r')"
    if [[ "$running_name" == "$ANDROID_EMULATOR_AVD" ]]; then
      return 0
    fi
  done < <(adb devices | awk '/^emulator-/ && $2 == "device" { print $1 }')
  return 1
}

start_emulator_if_requested() {
  if [[ "${ANDROID_AUTO_START_EMULATOR:-1}" != "1" ]]; then
    return 0
  fi

  if ! emulator_avd_exists || target_emulator_running; then
    return 0
  fi

  echo "Starting emulator '${ANDROID_EMULATOR_AVD}'..."
  QT_QPA_PLATFORM="xcb" bash "$SCRIPT_DIR/start-android-emulator.sh" -- -avd "$ANDROID_EMULATOR_AVD" -no-snapshot-load -no-snapshot-save -no-boot-anim -gpu host >/tmp/vex-mobile-emulator.log 2>&1 &
  local emu_pid=$!

  for _ in $(seq 1 120); do
    if target_emulator_running; then
      return 0
    fi
    if ! kill -0 "$emu_pid" >/dev/null 2>&1; then
      echo "Emulator process exited before becoming ready." >&2
      echo "Last emulator log lines:" >&2
      awk 'NR>0{lines[NR%20]=$0} END{start=(NR>20?NR-19:1); for(i=start;i<=NR;i++) print lines[i%20]}' /tmp/vex-mobile-emulator.log >&2 || true
      exit 1
    fi
    sleep 2
  done

  echo "Emulator did not come online in time." >&2
  echo "Check /tmp/vex-mobile-emulator.log for details." >&2
  exit 1
}

start_emulator_if_needed() {
  start_emulator_if_requested
  if has_ready_device; then
    return 0
  fi

  echo "No connected Android devices found. Starting emulator '${ANDROID_EMULATOR_AVD}'..."
  QT_QPA_PLATFORM="xcb" bash "$SCRIPT_DIR/start-android-emulator.sh" -- -avd "$ANDROID_EMULATOR_AVD" -no-snapshot-load -no-snapshot-save -no-boot-anim -gpu host >/tmp/vex-mobile-emulator.log 2>&1 &
  local emu_pid=$!

  for _ in $(seq 1 120); do
    if has_ready_device; then
      return 0
    fi
    if ! kill -0 "$emu_pid" >/dev/null 2>&1; then
      echo "Emulator process exited before becoming ready." >&2
      echo "Last emulator log lines:" >&2
      awk 'NR>0{lines[NR%20]=$0} END{start=(NR>20?NR-19:1); for(i=start;i<=NR;i++) print lines[i%20]}' /tmp/vex-mobile-emulator.log >&2 || true
      exit 1
    fi
    sleep 2
  done

  echo "Emulator did not come online in time." >&2
  echo "Check /tmp/vex-mobile-emulator.log for details." >&2
  exit 1
}

start_emulator_if_needed

exec expo run:android "$@"
