#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=ensure-java-home.sh
source "$SCRIPT_DIR/ensure-java-home.sh"
# shellcheck source=ensure-android-sdk.sh
source "$SCRIPT_DIR/ensure-android-sdk.sh"

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
GRACEFUL_STOP=0

if [ ! -x "$LOG_SCRIPT" ]; then
    chmod +x "$LOG_SCRIPT"
fi

if ! command -v adb >/dev/null 2>&1; then
    echo "adb not found in PATH."
    exit 1
fi

if ! command -v emulator >/dev/null 2>&1; then
    echo "emulator not found in PATH."
    exit 1
fi

detect_architectures_from_connected_devices() {
    local abi
    local -a serials=()
    local -a archs=()

    while IFS= read -r serial; do
        [[ -n "$serial" ]] && serials+=("$serial")
    done < <(adb devices | awk 'NR > 1 && $2 == "device" { print $1 }')

    if [[ ${#serials[@]} -eq 0 ]]; then
        echo "x86_64"
        return 0
    fi

    for serial in "${serials[@]}"; do
        abi="$(adb -s "$serial" shell getprop ro.product.cpu.abi 2>/dev/null | tr -d '\r')"
        case "$abi" in
            arm64-v8a|armeabi-v7a|x86|x86_64)
                if [[ " ${archs[*]} " != *" ${abi} "* ]]; then
                    archs+=("$abi")
                fi
                ;;
        esac
    done

    if [[ ${#archs[@]} -eq 0 ]]; then
        echo "x86_64"
        return 0
    fi

    (IFS=,; echo "${archs[*]}")
}

emulator_avd_exists() {
    local avd="${ANDROID_EMULATOR_AVD:-vex_stable}"
    emulator -list-avds | awk -v target="$avd" 'BEGIN { found=0 } $0==target { found=1 } END { exit(found ? 0 : 1) }'
}

target_emulator_running() {
    local serial running_name
    local avd="${ANDROID_EMULATOR_AVD:-vex_stable}"
    while IFS= read -r serial; do
        [[ -z "$serial" ]] && continue
        running_name="$(adb -s "$serial" emu avd name 2>/dev/null | awk 'NR==1 { print $0 }' | tr -d '\r')"
        if [[ "$running_name" == "$avd" ]]; then
            return 0
        fi
    done < <(adb devices | awk '/^emulator-/ && $2 == "device" { print $1 }')
    return 1
}

start_emulator_if_requested() {
    local emu_pid
    local avd="${ANDROID_EMULATOR_AVD:-vex_stable}"
    if [[ "${ANDROID_AUTO_START_EMULATOR:-1}" != "1" ]]; then
        return 0
    fi
    if ! emulator_avd_exists || target_emulator_running; then
        return 0
    fi

    echo "Starting emulator '${avd}'..."
    QT_QPA_PLATFORM="xcb" bash "$SCRIPT_DIR/start-android-emulator.sh" -- -avd "$avd" -no-snapshot-load -no-snapshot-save -no-boot-anim -gpu host >/tmp/vex-mobile-emulator.log 2>&1 &
    emu_pid=$!
    for _ in $(seq 1 120); do
        if target_emulator_running; then
            return 0
        fi
        if ! kill -0 "$emu_pid" >/dev/null 2>&1; then
            echo "Emulator process exited before becoming ready." >&2
            echo "Check /tmp/vex-mobile-emulator.log for details." >&2
            exit 1
        fi
        sleep 2
    done
    echo "Emulator did not come online in time." >&2
    echo "Check /tmp/vex-mobile-emulator.log for details." >&2
    exit 1
}

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
on_interrupt() {
    GRACEFUL_STOP=1
    cleanup
    exit 0
}
trap cleanup EXIT
trap on_interrupt INT TERM

start_emulator_if_requested

if [[ -z "${ORG_GRADLE_PROJECT_reactNativeArchitectures:-}" ]]; then
    export ORG_GRADLE_PROJECT_reactNativeArchitectures="$(detect_architectures_from_connected_devices)"
fi
echo "Using reactNativeArchitectures=${ORG_GRADLE_PROJECT_reactNativeArchitectures}"

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
