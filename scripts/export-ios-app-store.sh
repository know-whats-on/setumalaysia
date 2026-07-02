#!/bin/zsh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
APP_VARIANT_RAW="${APP_VARIANT:-ghar}"

case "$APP_VARIANT_RAW" in
  setu_china|setu-china|setuchina|china)
    ARCHIVE_PATH="$ROOT_DIR/mobile-artifacts/ios/SETU-China.xcarchive"
    EXPORT_PATH="$ROOT_DIR/mobile-artifacts/ios/export-setu-china"
    DESIRED_IPA_NAME="SETU-China.ipa"
    ;;
  jom_settle|jom-settle|jomsettle|malaysia)
    ARCHIVE_PATH="$ROOT_DIR/mobile-artifacts/ios/Senang-AU.xcarchive"
    EXPORT_PATH="$ROOT_DIR/mobile-artifacts/ios/export-jom-settle"
    DESIRED_IPA_NAME="Senang-AU.ipa"
    ;;
  wheres_wolli|wheres-wolli|whereswolli|wolli)
    ARCHIVE_PATH="$ROOT_DIR/mobile-artifacts/ios/Wheres-Wolli.xcarchive"
    EXPORT_PATH="$ROOT_DIR/mobile-artifacts/ios/export-wheres-wolli"
    DESIRED_IPA_NAME="Wheres-Wolli.ipa"
    ;;
  burb_mate|burb-mate|burbmate)
    ARCHIVE_PATH="$ROOT_DIR/mobile-artifacts/ios/Hoodie-by-Whats-On.xcarchive"
    EXPORT_PATH="$ROOT_DIR/mobile-artifacts/ios/export-burb-mate"
    DESIRED_IPA_NAME="Hoodie-by-Whats-On.ipa"
    ;;
  *)
    ARCHIVE_PATH="$ROOT_DIR/mobile-artifacts/ios/SETU-India-AU.xcarchive"
    EXPORT_PATH="$ROOT_DIR/mobile-artifacts/ios/export-setu-india-au"
    DESIRED_IPA_NAME="SETU-India-AU.ipa"
    ;;
esac

EXPORT_OPTIONS_PLIST="$ROOT_DIR/ios/exportOptions-app-store.plist"

if [[ ! -d "$ARCHIVE_PATH" ]]; then
  "$ROOT_DIR/scripts/build-ios-app-store-archive.sh"
fi

rm -rf "$EXPORT_PATH"

xcodebuild \
  -exportArchive \
  -archivePath "$ARCHIVE_PATH" \
  -exportOptionsPlist "$EXPORT_OPTIONS_PLIST" \
  -exportPath "$EXPORT_PATH" \
  -allowProvisioningUpdates

IPA_PATH="$(find "$EXPORT_PATH" -maxdepth 1 -name '*.ipa' -print -quit)"

if [[ -n "$IPA_PATH" ]]; then
  DESIRED_IPA_PATH="$EXPORT_PATH/$DESIRED_IPA_NAME"
  if [[ "$IPA_PATH" != "$DESIRED_IPA_PATH" ]]; then
    mv "$IPA_PATH" "$DESIRED_IPA_PATH"
    IPA_PATH="$DESIRED_IPA_PATH"
  fi
  echo "iOS App Store IPA ready at $IPA_PATH"
else
  echo "iOS export completed at $EXPORT_PATH"
fi
