#!/bin/zsh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ARCHIVE_DIR="$ROOT_DIR/mobile-artifacts/ios"
APP_VARIANT_RAW="${APP_VARIANT:-ghar}"
STORE_CONFIG_PATH=""

case "$APP_VARIANT_RAW" in
  setu_china|setu-china|setuchina|china)
    SYNC_SCRIPT="mobile:release:sync:setu-china"
    APP_INSTALL_NAME="留澳助手 AU"
    APP_MARKETING_NAME="留澳助手 AU"
    CUSTOM_URL_SCHEME="com.setuchina.mobile"
    APP_BUNDLE_IDENTIFIER="com.setuchina.mobile"
    APP_ICON_NAME="SetuChinaAppIcon"
    MESSAGES_APP_ICON_NAME="SETU China iMessage App Icon"
    APP_ENTITLEMENTS_FILE="App/SetuChinaAssociatedDomains.entitlements"
    INCLUDE_HOODIE_MESSAGES_EXTENSION="YES"
    SPLASH_VARIANT_DIR="setu-china"
    FIREBASE_VARIANT_DIR="setu-china"
    STORE_CONFIG_PATH="$ROOT_DIR/mobile/store-config/setu-china.json"
    ARCHIVE_PATH="$ARCHIVE_DIR/SETU-China.xcarchive"
    DERIVED_DATA_PATH="$ROOT_DIR/ios/build/app-store-derived-setu-china"
    ;;
  jom_settle|jom-settle|jomsettle|malaysia)
    SYNC_SCRIPT="mobile:release:sync:jom-settle"
    APP_INSTALL_NAME="Senang AU"
    APP_MARKETING_NAME="Senang AU"
    CUSTOM_URL_SCHEME="com.setumalaysia.mobile"
    APP_BUNDLE_IDENTIFIER="com.setumalaysia.mobile"
    APP_ICON_NAME="JomSettleAppIcon"
    MESSAGES_APP_ICON_NAME="iMessage App Icon"
    APP_ENTITLEMENTS_FILE="App/JomSettleAssociatedDomains.entitlements"
    INCLUDE_HOODIE_MESSAGES_EXTENSION="YES"
    SPLASH_VARIANT_DIR="jom-settle"
    FIREBASE_VARIANT_DIR="jom-settle"
    STORE_CONFIG_PATH="$ROOT_DIR/mobile/store-config/jom-settle.json"
    ARCHIVE_PATH="$ARCHIVE_DIR/Senang-AU.xcarchive"
    DERIVED_DATA_PATH="$ROOT_DIR/ios/build/app-store-derived-jom-settle"
    ;;
  wheres_wolli|wheres-wolli|whereswolli|wolli)
    SYNC_SCRIPT="mobile:release:sync:wheres-wolli"
    APP_INSTALL_NAME="Where's Wolli"
    APP_MARKETING_NAME="Where's Wolli"
    CUSTOM_URL_SCHEME="com.whereswolli.mobile"
    APP_BUNDLE_IDENTIFIER="com.whereswolli.mobile"
    APP_ICON_NAME="WheresWolliAppIcon"
    MESSAGES_APP_ICON_NAME="iMessage App Icon"
    APP_ENTITLEMENTS_FILE="App/WheresWolliAssociatedDomains.entitlements"
    INCLUDE_HOODIE_MESSAGES_EXTENSION="YES"
    SPLASH_VARIANT_DIR="wheres-wolli"
    FIREBASE_VARIANT_DIR="wheres-wolli"
    STORE_CONFIG_PATH="$ROOT_DIR/mobile/store-config/wheres-wolli.json"
    ARCHIVE_PATH="$ARCHIVE_DIR/Wheres-Wolli.xcarchive"
    DERIVED_DATA_PATH="$ROOT_DIR/ios/build/app-store-derived-wheres-wolli"
    ;;
  burb_mate|burb-mate|burbmate)
    SYNC_SCRIPT="mobile:release:sync:burb-mate"
    APP_INSTALL_NAME="Hoodie"
    APP_MARKETING_NAME="Hoodie: Safer Renting AU"
    CUSTOM_URL_SCHEME="com.burbmate.app"
    APP_BUNDLE_IDENTIFIER="com.burbmate.app"
    APP_ICON_NAME="BurbMateAppIcon"
    MESSAGES_APP_ICON_NAME="iMessage App Icon"
    APP_ENTITLEMENTS_FILE="App/HoodieAssociatedDomains.entitlements"
    INCLUDE_HOODIE_MESSAGES_EXTENSION="YES"
    SPLASH_VARIANT_DIR="burb-mate"
    FIREBASE_VARIANT_DIR="burb-mate"
    STORE_CONFIG_PATH="$ROOT_DIR/mobile/store-config/burb-mate.json"
    ARCHIVE_PATH="$ARCHIVE_DIR/Hoodie-by-Whats-On.xcarchive"
    DERIVED_DATA_PATH="$ROOT_DIR/ios/build/app-store-derived-burb-mate"
    ;;
  *)
    SYNC_SCRIPT="mobile:release:sync:ghar"
    APP_INSTALL_NAME="SETU India AU"
    APP_MARKETING_NAME="SETU India AU"
    CUSTOM_URL_SCHEME="com.ghar.mobile"
    APP_BUNDLE_IDENTIFIER="com.ghar.mobile"
    APP_ICON_NAME="AppIcon"
    MESSAGES_APP_ICON_NAME="SETU iMessage App Icon"
    APP_ENTITLEMENTS_FILE="App/App.entitlements"
    INCLUDE_HOODIE_MESSAGES_EXTENSION="YES"
    SPLASH_VARIANT_DIR="ghar"
    FIREBASE_VARIANT_DIR="ghar"
    STORE_CONFIG_PATH="$ROOT_DIR/mobile/store-config/ghar.json"
    ARCHIVE_PATH="$ARCHIVE_DIR/SETU-India-AU.xcarchive"
    DERIVED_DATA_PATH="$ROOT_DIR/ios/build/app-store-derived"
    ;;
esac

function read_store_config_value() {
  local KEY="$1"
  if [[ ! -f "$STORE_CONFIG_PATH" ]]; then
    return 0
  fi

  node - "$STORE_CONFIG_PATH" "$KEY" <<'NODE'
const fs = require("fs");
const [configPath, key] = process.argv.slice(2);
const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
const value = config[key];
if (value !== undefined && value !== null && String(value).trim()) {
  process.stdout.write(String(value));
}
NODE
}

cd "$ROOT_DIR"
APP_VARIANT="$APP_VARIANT_RAW" CAP_PLATFORM=ios zsh "$ROOT_DIR/scripts/sync-mobile-variant.sh"

mkdir -p "$ARCHIVE_DIR"
rm -rf "$ARCHIVE_PATH"

APP_MARKETING_VERSION="$(read_store_config_value iosMarketingVersion)"
APP_BUILD_NUMBER="$(read_store_config_value iosBuildNumber)"
VERSION_OVERRIDES=()

if [[ -n "$APP_MARKETING_VERSION" ]]; then
  VERSION_OVERRIDES+=(MARKETING_VERSION="$APP_MARKETING_VERSION")
fi

if [[ -n "$APP_BUILD_NUMBER" ]]; then
  VERSION_OVERRIDES+=(CURRENT_PROJECT_VERSION="$APP_BUILD_NUMBER")
fi

xcodebuild \
  -workspace "$ROOT_DIR/ios/App/App.xcworkspace" \
  -scheme App \
  -configuration Release \
  -destination "generic/platform=iOS" \
  -derivedDataPath "$DERIVED_DATA_PATH" \
  -archivePath "$ARCHIVE_PATH" \
  APP_INSTALL_NAME="$APP_INSTALL_NAME" \
  CUSTOM_URL_SCHEME="$CUSTOM_URL_SCHEME" \
  APP_BUNDLE_IDENTIFIER="$APP_BUNDLE_IDENTIFIER" \
  CODE_SIGN_ENTITLEMENTS="$APP_ENTITLEMENTS_FILE" \
  INCLUDE_HOODIE_MESSAGES_EXTENSION="$INCLUDE_HOODIE_MESSAGES_EXTENSION" \
  APP_PRIMARY_ICON_NAME="$APP_ICON_NAME" \
  MESSAGES_APP_ICON_NAME="$MESSAGES_APP_ICON_NAME" \
  "${VERSION_OVERRIDES[@]}" \
  -allowProvisioningUpdates \
  clean archive

ensure_embedded_framework_dsym() {
  local FRAMEWORK_NAME="$1"
  local FRAMEWORK_BINARY="$ARCHIVE_PATH/Products/Applications/App.app/Frameworks/$FRAMEWORK_NAME.framework/$FRAMEWORK_NAME"
  local DSYM_PATH="$ARCHIVE_PATH/dSYMs/$FRAMEWORK_NAME.framework.dSYM"

  if [[ ! -f "$FRAMEWORK_BINARY" ]]; then
    return 0
  fi

  mkdir -p "$ARCHIVE_PATH/dSYMs"
  rm -rf "$DSYM_PATH"
  xcrun dsymutil "$FRAMEWORK_BINARY" -o "$DSYM_PATH"

  if ! dwarfdump --uuid "$DSYM_PATH" >/dev/null 2>&1; then
    echo "Failed to create a valid dSYM for $FRAMEWORK_NAME.framework" >&2
    exit 1
  fi

  echo "Added dSYM for $FRAMEWORK_NAME.framework"
}

ensure_embedded_framework_dsym "FirebaseAnalytics"
ensure_embedded_framework_dsym "GoogleAppMeasurement"
ensure_embedded_framework_dsym "GoogleAppMeasurementIdentitySupport"

EXTENSION_PATH="$ARCHIVE_PATH/Products/Applications/App.app/PlugIns/HoodieMessagesExtension.appex"
if [[ "$INCLUDE_HOODIE_MESSAGES_EXTENSION" == "YES" && ! -e "$EXTENSION_PATH" ]]; then
  echo "$APP_MARKETING_NAME archive expected HoodieMessagesExtension.appex but it was not found at $EXTENSION_PATH" >&2
  exit 1
fi

if [[ "$INCLUDE_HOODIE_MESSAGES_EXTENSION" == "YES" ]]; then
  EXTENSION_INFO_PLIST="$EXTENSION_PATH/Info.plist"
  EXPECTED_EXTENSION_BUNDLE_ID="$APP_BUNDLE_IDENTIFIER.messages"
  ACTUAL_EXTENSION_BUNDLE_ID="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$EXTENSION_INFO_PLIST")"
  ACTUAL_EXTENSION_DISPLAY_NAME="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleDisplayName' "$EXTENSION_INFO_PLIST")"

  if [[ "$ACTUAL_EXTENSION_BUNDLE_ID" != "$EXPECTED_EXTENSION_BUNDLE_ID" ]]; then
    echo "$APP_MARKETING_NAME archive has unexpected Messages extension bundle id: $ACTUAL_EXTENSION_BUNDLE_ID (expected $EXPECTED_EXTENSION_BUNDLE_ID)" >&2
    exit 1
  fi

  if [[ "$ACTUAL_EXTENSION_DISPLAY_NAME" != "$APP_INSTALL_NAME" ]]; then
    echo "$APP_MARKETING_NAME archive has unexpected Messages extension display name: $ACTUAL_EXTENSION_DISPLAY_NAME (expected $APP_INSTALL_NAME)" >&2
    exit 1
  fi
fi

echo "iOS archive ready at $ARCHIVE_PATH for $APP_MARKETING_NAME (installed label: $APP_INSTALL_NAME)"
