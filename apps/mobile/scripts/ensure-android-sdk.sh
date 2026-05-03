#!/usr/bin/env bash
# Set ANDROID_HOME/PATH so adb and emulator are available in non-IDE shells.
# Intended to be sourced after ensure-java-home.sh.

_vex_sdk_has_adb() {
  [[ -n "${1:-}" && -x "${1}/platform-tools/adb" ]]
}

if _vex_sdk_has_adb "${ANDROID_HOME:-}"; then
  :
elif _vex_sdk_has_adb "${ANDROID_SDK_ROOT:-}"; then
  export ANDROID_HOME="${ANDROID_SDK_ROOT}"
else
  _vex_sdk_candidates=(
    "$HOME/Android/Sdk"
    "$HOME/Library/Android/sdk"
  )
  _vex_sdk_home=""
  for _vex_dir in "${_vex_sdk_candidates[@]}"; do
    if _vex_sdk_has_adb "$_vex_dir"; then
      _vex_sdk_home="$_vex_dir"
      break
    fi
  done

  if [[ -z "$_vex_sdk_home" ]]; then
    echo "ANDROID_HOME is not set and no Android SDK with platform-tools was found." >&2
    echo "Install Android SDK via Android Studio or set ANDROID_HOME." >&2
    exit 1
  fi
  export ANDROID_HOME="$_vex_sdk_home"
fi

export ANDROID_SDK_ROOT="${ANDROID_HOME}"
export ANDROID_AVD_HOME="${ANDROID_AVD_HOME:-${XDG_CONFIG_HOME:-$HOME/.config}/.android/avd}"
mkdir -p "${ANDROID_AVD_HOME}"

_vex_prepend_path() {
  local dir="$1"
  [[ ! -d "$dir" ]] && return 0
  case ":${PATH:-}:" in *":${dir}:"*) ;; *)
    export PATH="${dir}:${PATH}"
    ;;
  esac
}

_vex_prepend_path "${ANDROID_HOME}/platform-tools"
_vex_prepend_path "${ANDROID_HOME}/emulator"
if [[ -d "${ANDROID_HOME}/cmdline-tools/latest/bin" ]]; then
  _vex_prepend_path "${ANDROID_HOME}/cmdline-tools/latest/bin"
fi

unset -f _vex_sdk_has_adb _vex_prepend_path
unset _vex_sdk_candidates _vex_sdk_home _vex_dir
