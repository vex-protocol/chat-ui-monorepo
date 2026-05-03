#!/usr/bin/env bash
# Resolve JAVA_HOME for Gradle when it is unset or invalid.
# Intended to be sourced: source "$(dirname "$0")/ensure-java-home.sh"

if [[ -n "${VEX_ANDROID_JAVA_HOME:-}" && -x "${VEX_ANDROID_JAVA_HOME}/bin/java" ]]; then
  export JAVA_HOME="${VEX_ANDROID_JAVA_HOME}"
elif [[ -n "${JAVA_HOME:-}" && -x "${JAVA_HOME}/bin/java" ]]; then
  :
else
  _vex_java_home=""

  if command -v java >/dev/null 2>&1; then
    _vex_java_bin="$(readlink -f "$(command -v java)" 2>/dev/null || true)"
    if [[ -n "$_vex_java_bin" ]]; then
      _vex_java_home="$(dirname "$(dirname "$_vex_java_bin")")"
    fi
  fi

  if [[ -z "$_vex_java_home" ]]; then
    _vex_java_candidates=(
      "$HOME/.jdks/jdk-17.0.19+10"
      "$HOME/.jdks/jdk-17"
      "$HOME/bin/android-studio-panda4-linux/android-studio/jbr"
      "$HOME/android-studio/jbr"
      "/opt/android-studio/jbr"
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

unset _vex_java_home _vex_java_bin _vex_java_candidates _vex_dir
