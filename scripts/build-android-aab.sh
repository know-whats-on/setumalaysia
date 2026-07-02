#!/bin/zsh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DEFAULT_JAVA_HOME="/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home"
ARTIFACT_DIR="$ROOT_DIR/mobile-artifacts/android"
APP_VARIANT_RAW="${APP_VARIANT:-ghar}"

case "$APP_VARIANT_RAW" in
  setu_china|setu-china|setuchina|china)
    GRADLE_TASK="bundleSetuChinaRelease"
    AAB_SOURCE="$ROOT_DIR/android/app/build/outputs/bundle/setuChinaRelease/app-setuChina-release.aab"
    ARTIFACT_PATH="$ARTIFACT_DIR/SETU-China-android-release.aab"
    ;;
  jom_settle|jom-settle|jomsettle|malaysia)
    GRADLE_TASK="bundleJomSettleRelease"
    AAB_SOURCE="$ROOT_DIR/android/app/build/outputs/bundle/jomSettleRelease/app-jomSettle-release.aab"
    ARTIFACT_PATH="$ARTIFACT_DIR/Senang-AU-android-release.aab"
    ;;
  wheres_wolli|wheres-wolli|whereswolli|wolli)
    GRADLE_TASK="bundleWheresWolliRelease"
    AAB_SOURCE="$ROOT_DIR/android/app/build/outputs/bundle/wheresWolliRelease/app-wheresWolli-release.aab"
    ARTIFACT_PATH="$ARTIFACT_DIR/Wheres-Wolli-android-release.aab"
    ;;
  burb_mate|burb-mate|burbmate)
    GRADLE_TASK="bundleBurbMateRelease"
    AAB_SOURCE="$ROOT_DIR/android/app/build/outputs/bundle/burbMateRelease/app-burbMate-release.aab"
    ARTIFACT_PATH="$ARTIFACT_DIR/Hoodie-by-Whats-On-android-release.aab"
    ;;
  *)
    GRADLE_TASK="bundleGharRelease"
    AAB_SOURCE="$ROOT_DIR/android/app/build/outputs/bundle/gharRelease/app-ghar-release.aab"
    ARTIFACT_PATH="$ARTIFACT_DIR/SETU-India-AU-android-release.aab"
    ;;
esac

if [[ -z "${JAVA_HOME:-}" && -d "$DEFAULT_JAVA_HOME" ]]; then
  export JAVA_HOME="$DEFAULT_JAVA_HOME"
fi

if [[ -n "${JAVA_HOME:-}" ]]; then
  export PATH="$JAVA_HOME/bin:$PATH"
fi

cd "$ROOT_DIR"
APP_VARIANT="$APP_VARIANT_RAW" CAP_PLATFORM=android zsh scripts/sync-mobile-variant.sh

cd "$ROOT_DIR/android"
./gradlew "$GRADLE_TASK"

mkdir -p "$ARTIFACT_DIR"
cp "$AAB_SOURCE" "$ARTIFACT_PATH"

echo "Android App Bundle ready at $ARTIFACT_PATH"
