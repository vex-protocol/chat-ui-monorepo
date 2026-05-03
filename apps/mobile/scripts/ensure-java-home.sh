#!/usr/bin/env bash
# Resolve JAVA_HOME for Gradle when it is unset or invalid.
# Intended to be sourced: source "$(dirname "$0")/ensure-java-home.sh"

if [[ -n "${VEX_ANDROID_JAVA_HOME:-}" && -x "${VEX_ANDROID_JAVA_HOME}/bin/java" ]]; then
  export JAVA_HOME="${VEX_ANDROID_JAVA_HOME}"
elif [[ -n "${JAVA_HOME:-}" && -x "${JAVA_HOME}/bin/java" ]]; then
  :
else
  _vex_java_home=""

  # macOS ships /usr/libexec/java_home which prints the canonical
  # JDK home for a requested major version. Use that first so we
  # don't need GNU readlink (BSD readlink lacks `-f`).
  if [[ -x /usr/libexec/java_home ]]; then
    if _candidate="$(/usr/libexec/java_home -v 17 2>/dev/null)" && [[ -n "$_candidate" && -x "$_candidate/bin/java" ]]; then
      _vex_java_home="$_candidate"
    elif _candidate="$(/usr/libexec/java_home 2>/dev/null)" && [[ -n "$_candidate" && -x "$_candidate/bin/java" ]]; then
      _vex_java_home="$_candidate"
    fi
    unset _candidate
  fi

  # Linux / fallback: derive JAVA_HOME from the resolved `java`
  # binary. Prefer GNU `readlink -f` when available; fall back to a
  # portable shell loop so this works on macOS too.
  if [[ -z "$_vex_java_home" ]] && command -v java >/dev/null 2>&1; then
    _vex_java_bin=""
    if readlink -f / >/dev/null 2>&1; then
      _vex_java_bin="$(readlink -f "$(command -v java)" 2>/dev/null || true)"
    else
      _vex_java_bin="$(command -v java)"
      while [[ -L "$_vex_java_bin" ]]; do
        _link="$(readlink "$_vex_java_bin")"
        case "$_link" in
          /*) _vex_java_bin="$_link" ;;
          *)  _vex_java_bin="$(cd "$(dirname "$_vex_java_bin")" && cd "$(dirname "$_link")" && pwd)/$(basename "$_link")" ;;
        esac
      done
    fi
    if [[ -n "$_vex_java_bin" ]]; then
      _vex_java_home="$(dirname "$(dirname "$_vex_java_bin")")"
    fi
    unset _vex_java_bin _link
  fi

  if [[ -z "$_vex_java_home" ]]; then
    _vex_java_candidates=(
      "$HOME/.jdks/jdk-17.0.19+10"
      "$HOME/.jdks/jdk-17"
      "$HOME/bin/android-studio-panda4-linux/android-studio/jbr"
      "$HOME/android-studio/jbr"
      "/opt/android-studio/jbr"
      "/Applications/Android Studio.app/Contents/jbr/Contents/Home"
    )
    shopt -s nullglob
    _vex_java_candidates+=("$HOME"/.jdks/jdk-17*)
    _vex_java_candidates+=("/usr/lib/jvm/java-17-openjdk-amd64")
    _vex_java_candidates+=("/usr/lib/jvm/java-21-openjdk-amd64")
    shopt -u nullglob

    for _vex_dir in "${_vex_java_candidates[@]}"; do
      [[ -z "$_vex_dir" ]] && continue
      if [[ -x "${_vex_dir}/bin/java" ]]; then
        _vex_java_home="$_vex_dir"
        break
      fi
    done
  fi

  if [[ -z "$_vex_java_home" ]]; then
    echo "JAVA_HOME is not set and no JDK was found for Android builds." >&2
    echo "Install OpenJDK 17+ or set VEX_ANDROID_JAVA_HOME/JAVA_HOME." >&2
    exit 1
  fi
  export JAVA_HOME="$_vex_java_home"
fi

case ":${PATH:-}:" in *":${JAVA_HOME}/bin:"*) ;; *)
  export PATH="${JAVA_HOME}/bin:${PATH}"
  ;;
esac

unset _vex_java_home _vex_java_candidates _vex_dir
