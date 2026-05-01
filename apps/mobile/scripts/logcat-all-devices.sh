#!/usr/bin/env bash
set -euo pipefail

# Multi-device Android log tail for React Native + Vex message traces.
# Usage:
#   bash ./scripts/logcat-all-devices.sh
#   LOG_FILTER='ReactNativeJS|vex-msg|vex-ws|some-other-tag' bash ./scripts/logcat-all-devices.sh

LOG_FILTER="${LOG_FILTER:-ReactNativeJS|vex-msg|vex-ws}"

if ! command -v adb >/dev/null 2>&1; then
    echo "adb not found in PATH."
    exit 1
fi

mapfile -t DEVICES < <(adb devices | awk 'NR > 1 && $2 == "device" { print $1 }')

if [ "${#DEVICES[@]}" -eq 0 ]; then
    echo "No connected Android devices/emulators found."
    exit 1
fi

echo "Streaming logs from ${#DEVICES[@]} target(s): ${DEVICES[*]}"
echo "Filter: ${LOG_FILTER}"
echo "Press Ctrl+C to stop."

PIDS=()

cleanup() {
    for pid in "${PIDS[@]:-}"; do
        kill "$pid" >/dev/null 2>&1 || true
    done
}
trap cleanup INT TERM EXIT

for serial in "${DEVICES[@]}"; do
    (
        adb -s "$serial" logcat -v time 2>/dev/null |
            sed -u "s/^/[${serial}] /" |
            awk -v re="$LOG_FILTER" '($0 ~ re) { print; fflush() }'
    ) &
    PIDS+=("$!")
done

for pid in "${PIDS[@]}"; do
    wait "$pid"
done
