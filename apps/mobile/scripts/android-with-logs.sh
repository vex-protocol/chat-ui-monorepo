#!/usr/bin/env bash
set -euo pipefail

# Runs Android app launch + multi-device log tail together.
# Usage:
#   pnpm -F mobile android:with-logs
# Optional:
#   LOG_FILTER='ReactNativeJS|vex-msg|vex-auth' pnpm -F mobile android:with-logs

LOG_SCRIPT="./scripts/logcat-all-devices.sh"
APP_PACKAGE="${APP_PACKAGE:-chat.vex.mobile}"
APK_PATH="./android/app/build/outputs/apk/debug/app-debug.apk"
START_METRO="${START_METRO:-1}"
METRO_FORCE_RESTART="${METRO_FORCE_RESTART:-1}"

if [ ! -x "$LOG_SCRIPT" ]; then
    chmod +x "$LOG_SCRIPT"
fi

if ! command -v adb >/dev/null 2>&1; then
    echo "adb not found in PATH."
    exit 1
fi

cleanup() {
    trap - EXIT INT TERM
    if [ -n "${LOG_PID:-}" ] && kill -0 "$LOG_PID" >/dev/null 2>&1; then
        kill "$LOG_PID" >/dev/null 2>&1 || true
    fi
    # Final safety net for orphan per-device logcat readers.
    pkill -f "adb -s .* logcat -v time" >/dev/null 2>&1 || true
    if [ -n "${METRO_PID:-}" ] && kill -0 "$METRO_PID" >/dev/null 2>&1; then
        kill "$METRO_PID" >/dev/null 2>&1 || true
    fi
}
trap cleanup EXIT INT TERM

echo "Starting multi-device logs..."
bash "$LOG_SCRIPT" &
LOG_PID=$!

echo "Building debug APK..."
pnpm run android:clean-autolinking
(
    cd android
    ./gradlew --console=plain app:assembleDebug
)

if [ ! -f "$APK_PATH" ]; then
    echo "Debug APK not found at: $APK_PATH"
    exit 1
fi

DEVICES=()
while IFS= read -r serial; do
    if [ -n "$serial" ]; then
        DEVICES+=("$serial")
    fi
done < <(adb devices | awk 'NR > 1 && $2 == "device" { print $1 }')

if [ "${#DEVICES[@]}" -eq 0 ]; then
    echo "No connected Android devices/emulators found."
    exit 1
fi

if [ "$START_METRO" = "1" ]; then
    if [ "$METRO_FORCE_RESTART" = "1" ]; then
        OLD_METRO_PIDS="$(lsof -ti tcp:8081 -sTCP:LISTEN || true)"
        if [ -n "$OLD_METRO_PIDS" ]; then
            echo "Stopping existing process(es) on tcp:8081: $OLD_METRO_PIDS"
            for pid in $OLD_METRO_PIDS; do
                kill "$pid" >/dev/null 2>&1 || true
            done
            sleep 1
        fi
    fi
    echo "Starting Metro dev server on tcp:8081..."
    EXPO_NO_INTERACTIVE=1 pnpm exec expo start --dev-client --port 8081 --host lan >/tmp/vex-mobile-metro.log 2>&1 &
    METRO_PID=$!
    for _ in $(seq 1 25); do
        if lsof -ti tcp:8081 >/dev/null 2>&1; then
            break
        fi
        sleep 1
    done
    if ! lsof -ti tcp:8081 >/dev/null 2>&1; then
        echo "Metro did not start on tcp:8081."
        echo "Check /tmp/vex-mobile-metro.log for details."
        exit 1
    fi
    echo "Metro ready on tcp:8081 (logs: /tmp/vex-mobile-metro.log)."
fi

echo "Installing and launching on ${#DEVICES[@]} device(s)..."
for serial in "${DEVICES[@]}"; do
    echo "[$serial] adb reverse tcp:8081"
    adb -s "$serial" reverse tcp:8081 tcp:8081 >/dev/null 2>&1 || true
    echo "[$serial] install"
    adb -s "$serial" install -r -d "$APK_PATH" >/dev/null
    echo "[$serial] launch"
    adb -s "$serial" shell monkey -p "$APP_PACKAGE" -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1
done

echo
echo "Android install/launch completed on all connected devices. Keeping logs attached."
echo "Press Ctrl+C to stop log streaming."
wait "$LOG_PID"
