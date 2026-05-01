#!/usr/bin/env bash
set -euo pipefail

# Runs Android app launch + multi-device log tail together.
# Usage:
#   pnpm -F mobile android:with-logs
# Optional:
#   LOG_FILTER='ReactNativeJS|vex-msg|vex-ws' pnpm -F mobile android:with-logs

LOG_SCRIPT="./scripts/logcat-all-devices.sh"

if [ ! -x "$LOG_SCRIPT" ]; then
    chmod +x "$LOG_SCRIPT"
fi

cleanup() {
    if [ -n "${LOG_PID:-}" ] && kill -0 "$LOG_PID" >/dev/null 2>&1; then
        kill "$LOG_PID" >/dev/null 2>&1 || true
    fi
}
trap cleanup EXIT INT TERM

echo "Starting multi-device logs..."
bash "$LOG_SCRIPT" &
LOG_PID=$!

echo "Launching Android app..."
if ! pnpm run android; then
    echo "Android launch failed."
    exit 1
fi

echo
echo "Android launch completed. Keeping logs attached."
echo "Press Ctrl+C to stop log streaming."
wait "$LOG_PID"
