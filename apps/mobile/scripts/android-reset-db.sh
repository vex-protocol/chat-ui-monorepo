#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=ensure-android-sdk.sh
source "$SCRIPT_DIR/ensure-android-sdk.sh"

USERNAME=""
SERVER=""
APP_PACKAGE=""
ENVIRONMENT="development"
DEVICE=""
ASSUME_YES=0
ALLOW_CLEAR_APP_DATA=0

usage() {
  cat <<EOF
Delete one Vex mobile SQLite database from a connected Android device.

Usage:
  pnpm android:reset-db -- --username blood [--env development|production]

Options:
  --username, --user USER       Vex username whose local DB should be deleted.
  --env ENV                    development/dev or production/prod. Default: development.
  --server HOST                Override server host used in the DB name.
  --package PACKAGE            Override Android app package.
  --device SERIAL              adb device serial. Required when multiple devices are attached.
  --yes, -y                    Skip the y/N confirmation for the targeted DB delete.
  --clear-app-data-fallback    If targeted delete is blocked, offer adb pm clear as a fallback.
  --help, -h                   Show this help.

Examples:
  pnpm android:reset-db -- --username blood --env dev
  pnpm android:reset-db -- --username blood --env prod --clear-app-data-fallback
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --username|--user)
      USERNAME="${2:-}"
      shift 2
      ;;
    --env)
      ENVIRONMENT="${2:-}"
      shift 2
      ;;
    --server|--host)
      SERVER="${2:-}"
      shift 2
      ;;
    --package|--app-id)
      APP_PACKAGE="${2:-}"
      shift 2
      ;;
    --device)
      DEVICE="${2:-}"
      shift 2
      ;;
    --yes|-y)
      ASSUME_YES=1
      shift
      ;;
    --clear-app-data-fallback)
      ALLOW_CLEAR_APP_DATA=1
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

case "$ENVIRONMENT" in
  dev|development)
    ENVIRONMENT="development"
    DEFAULT_SERVER="dev.vex.wtf"
    DEFAULT_PACKAGE="chat.vex.mobile.dev"
    ;;
  prod|production)
    ENVIRONMENT="production"
    DEFAULT_SERVER="api.vex.wtf"
    DEFAULT_PACKAGE="chat.vex.mobile"
    ;;
  *)
    echo "--env must be development/dev or production/prod." >&2
    exit 1
    ;;
esac

if [[ -z "$USERNAME" ]]; then
  echo "--username is required." >&2
  usage >&2
  exit 1
fi

SERVER="${SERVER:-$DEFAULT_SERVER}"
APP_PACKAGE="${APP_PACKAGE:-$DEFAULT_PACKAGE}"

DB_NAME="$(
  node - "$SERVER" "$USERNAME" <<'NODE'
const [server, username] = process.argv.slice(2);
function sanitize(value) {
  return value
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-");
}
console.log(`vex-client.${sanitize(server)}.${sanitize(username)}.db`);
NODE
)"

DEVICES=()
while IFS= read -r device; do
  if [[ -n "$device" ]]; then
    DEVICES+=("$device")
  fi
done < <(adb devices | awk 'NR > 1 && $2 == "device" { print $1 }')
if [[ ${#DEVICES[@]} -eq 0 ]]; then
  echo "No connected Android devices found via adb." >&2
  exit 1
fi

if [[ -z "$DEVICE" ]]; then
  if [[ ${#DEVICES[@]} -gt 1 ]]; then
    echo "Multiple Android devices are connected. Pick one with --device:" >&2
    printf '  %s\n' "${DEVICES[@]}" >&2
    exit 1
  fi
  DEVICE="${DEVICES[0]}"
fi

if ! printf '%s\n' "${DEVICES[@]}" | grep -qx "$DEVICE"; then
  echo "Device '$DEVICE' is not connected." >&2
  exit 1
fi

if ! adb -s "$DEVICE" shell pm path "$APP_PACKAGE" >/dev/null 2>&1; then
  echo "Package '$APP_PACKAGE' is not installed on $DEVICE." >&2
  exit 1
fi

ANDROID_DB_PATH="/data/user/0/$APP_PACKAGE/files/SQLite/$DB_NAME"

cat <<EOF
Target Android device: $DEVICE
Environment:           $ENVIRONMENT
Package:               $APP_PACKAGE
Server:                $SERVER
Username:              $USERNAME
Database name:         $DB_NAME
Android path:          $ANDROID_DB_PATH

This deletes only the local encrypted SQLite cache for this account/server.
It does not delete the server account.
EOF

confirm() {
  local prompt="$1"
  local answer
  read -r -p "$prompt [y/N] " answer
  case "$answer" in
    y|Y|yes|YES) return 0 ;;
    *) return 1 ;;
  esac
}

if [[ "$ASSUME_YES" != "1" ]]; then
  if ! confirm "Delete this database from $DEVICE?"; then
    echo "Aborted."
    exit 0
  fi
fi

if adb -s "$DEVICE" shell run-as "$APP_PACKAGE" test -d files/SQLite >/dev/null 2>&1; then
  adb -s "$DEVICE" shell run-as "$APP_PACKAGE" rm -f \
    "files/SQLite/$DB_NAME" \
    "files/SQLite/$DB_NAME-wal" \
    "files/SQLite/$DB_NAME-shm" \
    "files/SQLite/$DB_NAME-journal"
  echo "Deleted local DB files for $USERNAME from $APP_PACKAGE on $DEVICE."
  exit 0
fi

cat >&2 <<EOF
Targeted delete was blocked by Android sandbox access.

This usually means the installed APK is not debuggable, so 'adb shell run-as
$APP_PACKAGE' cannot enter the app sandbox. A debug/dev build should allow the
targeted delete.
EOF

if [[ "$ALLOW_CLEAR_APP_DATA" != "1" ]]; then
  cat >&2 <<EOF

To clear all local app data instead, rerun with:
  pnpm android:reset-db -- --username $USERNAME --env $ENVIRONMENT --clear-app-data-fallback
EOF
  exit 1
fi

cat <<EOF

Fallback will clear ALL local data for $APP_PACKAGE on $DEVICE:
  - SecureStore credentials
  - every local SQLite database
  - Expo update/cache data
EOF

if [[ "$ASSUME_YES" != "1" ]]; then
  if ! confirm "Clear all local app data for $APP_PACKAGE?"; then
    echo "Aborted."
    exit 0
  fi
fi

adb -s "$DEVICE" shell pm clear "$APP_PACKAGE" >/dev/null
echo "Cleared all local app data for $APP_PACKAGE on $DEVICE."
