#!/bin/zsh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
APP_VARIANT_RAW="${APP_VARIANT:-ghar}"
XCODE_DEVICE_ID="${IOS_XCODE_DEVICE_ID:-00008150-00127C9826FB801C}"
DEVICE_ID="${IOS_DEVICE_ID:-iPhone}"
DEVICE_LABEL="${IOS_DEVICE_NAME:-iPhone}"

case "$APP_VARIANT_RAW" in
  setu_china|setu-china|setuchina|china)
    APP_VARIANT_KEY="setu_china"
    APP_INSTALL_NAME="留澳助手 AU"
    APP_MARKETING_NAME="留澳助手 AU"
    CUSTOM_URL_SCHEME="com.setuchina.mobile"
    APP_BUNDLE_IDENTIFIER="com.setuchina.mobile"
    APP_ICON_NAME="SetuChinaAppIcon"
    MESSAGES_APP_ICON_NAME="SETU China iMessage App Icon"
    APP_ENTITLEMENTS_FILE="App/SetuChinaAssociatedDomains.entitlements"
    INCLUDE_HOODIE_MESSAGES_EXTENSION="YES"
    STORE_CONFIG_PATH="$ROOT_DIR/mobile/store-config/setu-china.json"
    DERIVED_DATA_PATH="$ROOT_DIR/ios/build/device-derived-setu-china"
    ;;
  jom_settle|jom-settle|jomsettle|malaysia)
    APP_VARIANT_KEY="jom_settle"
    APP_INSTALL_NAME="Senang AU"
    APP_MARKETING_NAME="Senang AU"
    CUSTOM_URL_SCHEME="com.setumalaysia.mobile"
    APP_BUNDLE_IDENTIFIER="com.setumalaysia.mobile"
    APP_ICON_NAME="JomSettleAppIcon"
    MESSAGES_APP_ICON_NAME="iMessage App Icon"
    APP_ENTITLEMENTS_FILE="App/JomSettleAssociatedDomains.entitlements"
    INCLUDE_HOODIE_MESSAGES_EXTENSION="YES"
    STORE_CONFIG_PATH="$ROOT_DIR/mobile/store-config/jom-settle.json"
    DERIVED_DATA_PATH="$ROOT_DIR/ios/build/device-derived-jom-settle"
    ;;
  wheres_wolli|wheres-wolli|whereswolli|wolli)
    APP_VARIANT_KEY="wheres_wolli"
    APP_INSTALL_NAME="Where's Wolli"
    APP_MARKETING_NAME="Where's Wolli"
    CUSTOM_URL_SCHEME="com.whereswolli.mobile"
    APP_BUNDLE_IDENTIFIER="com.whereswolli.mobile"
    APP_ICON_NAME="WheresWolliAppIcon"
    MESSAGES_APP_ICON_NAME="iMessage App Icon"
    APP_ENTITLEMENTS_FILE="App/WheresWolliAssociatedDomains.entitlements"
    INCLUDE_HOODIE_MESSAGES_EXTENSION="YES"
    STORE_CONFIG_PATH="$ROOT_DIR/mobile/store-config/wheres-wolli.json"
    DERIVED_DATA_PATH="$ROOT_DIR/ios/build/device-derived-wheres-wolli"
    ;;
  burb_mate|burb-mate|burbmate)
    APP_VARIANT_KEY="burb_mate"
    APP_INSTALL_NAME="Hoodie"
    APP_MARKETING_NAME="hoodie by What's On"
    CUSTOM_URL_SCHEME="com.burbmate.app"
    APP_BUNDLE_IDENTIFIER="com.burbmate.app"
    APP_ICON_NAME="BurbMateAppIcon"
    MESSAGES_APP_ICON_NAME="iMessage App Icon"
    APP_ENTITLEMENTS_FILE="App/HoodieAssociatedDomains.entitlements"
    INCLUDE_HOODIE_MESSAGES_EXTENSION="YES"
    STORE_CONFIG_PATH="$ROOT_DIR/mobile/store-config/burb-mate.json"
    DERIVED_DATA_PATH="$ROOT_DIR/ios/build/device-derived-burb-mate"
    ;;
  *)
    APP_VARIANT_KEY="ghar"
    APP_INSTALL_NAME="SETU India AU"
    APP_MARKETING_NAME="SETU India AU"
    CUSTOM_URL_SCHEME="com.ghar.mobile"
    APP_BUNDLE_IDENTIFIER="com.ghar.mobile"
    APP_ICON_NAME="AppIcon"
    MESSAGES_APP_ICON_NAME="SETU iMessage App Icon"
    APP_ENTITLEMENTS_FILE="App/App.entitlements"
    INCLUDE_HOODIE_MESSAGES_EXTENSION="YES"
    STORE_CONFIG_PATH="$ROOT_DIR/mobile/store-config/ghar.json"
    DERIVED_DATA_PATH="$ROOT_DIR/ios/build/device-derived"
    ;;
esac

CONFIGURATION="${IOS_CONFIGURATION:-Release}"
APS_ENVIRONMENT_VALUE="${IOS_APS_ENVIRONMENT:-development}"

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

rm -rf "$DERIVED_DATA_PATH"

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
  -configuration "$CONFIGURATION" \
  -destination "id=$XCODE_DEVICE_ID" \
  -derivedDataPath "$DERIVED_DATA_PATH" \
  APP_INSTALL_NAME="$APP_INSTALL_NAME" \
  CUSTOM_URL_SCHEME="$CUSTOM_URL_SCHEME" \
  APP_BUNDLE_IDENTIFIER="$APP_BUNDLE_IDENTIFIER" \
  APP_ENTITLEMENTS_FILE="$APP_ENTITLEMENTS_FILE" \
  INCLUDE_HOODIE_MESSAGES_EXTENSION="$INCLUDE_HOODIE_MESSAGES_EXTENSION" \
  APP_PRIMARY_ICON_NAME="$APP_ICON_NAME" \
  MESSAGES_APP_ICON_NAME="$MESSAGES_APP_ICON_NAME" \
  APS_ENVIRONMENT="$APS_ENVIRONMENT_VALUE" \
  "${VERSION_OVERRIDES[@]}" \
  -allowProvisioningUpdates \
  clean build

APP_PATH="$(find "$DERIVED_DATA_PATH/Build/Products" -path "*${CONFIGURATION}-iphoneos/App.app" -print -quit)"

if [[ -z "$APP_PATH" || ! -d "$APP_PATH" ]]; then
  echo "Unable to find built app bundle under $DERIVED_DATA_PATH/Build/Products." >&2
  exit 1
fi

xcrun devicectl device install app --device "$DEVICE_ID" "$APP_PATH"

LAUNCH_ARGS=()
if [[ "${IOS_FIREBASE_IAM_DEBUG:-0}" == "1" ]]; then
  if [[ "$APP_VARIANT_KEY" == "burb_mate" ]]; then
    LAUNCH_ARGS=("-GHARResetIAMState" "-FIRDebugEnabled" "-FIRAnalyticsDebugEnabled")
    LOG_DIR="$ROOT_DIR/mobile-artifacts/ios/logs"
    LOG_PATH="$LOG_DIR/hoodie-fiam-$(date +%Y%m%d-%H%M%S).log"
    LOG_SECONDS="${IOS_FIREBASE_IAM_LOG_SECONDS:-45}"
    mkdir -p "$LOG_DIR"

    echo "Launching Hoodie with Firebase In-App Messaging debug flags for ${LOG_SECONDS}s..."
    set +e
    xcrun devicectl \
      --timeout "$LOG_SECONDS" \
      device process launch \
      --device "$DEVICE_ID" \
      --terminate-existing \
      --console \
      -- \
      "$APP_BUNDLE_IDENTIFIER" \
      "${LAUNCH_ARGS[@]}" \
      2>&1 | tee "$LOG_PATH"
    DEBUG_LAUNCH_STATUS="${pipestatus[1]}"
    set -e

    echo "Firebase In-App Messaging debug log saved to $LOG_PATH"
    if [[ "$DEBUG_LAUNCH_STATUS" != "0" ]]; then
      echo "Debug console capture ended with status $DEBUG_LAUNCH_STATUS after the bounded capture window; relaunching normally."
    fi
  else
    echo "IOS_FIREBASE_IAM_DEBUG=1 is only wired for Hoodie installs; launching $APP_INSTALL_NAME normally."
  fi
fi

xcrun devicectl device process launch \
  --device "$DEVICE_ID" \
  --terminate-existing \
  -- \
  "$APP_BUNDLE_IDENTIFIER" \
  "${LAUNCH_ARGS[@]}"

echo "Installed $APP_INSTALL_NAME on $DEVICE_LABEL from $APP_PATH ($APP_MARKETING_NAME $CONFIGURATION build)"
