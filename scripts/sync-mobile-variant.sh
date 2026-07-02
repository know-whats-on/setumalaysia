#!/bin/zsh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
APP_VARIANT_RAW="${APP_VARIANT:-ghar}"
CAP_PLATFORM="${CAP_PLATFORM:-all}"
STORE_CONFIG_PATH=""

case "$APP_VARIANT_RAW" in
  setu_china|setu-china|setuchina|china)
    APP_VARIANT_KEY="setu_china"
    BUILD_SCRIPT="build:setu-china"
    FIREBASE_VARIANT_DIR="setu-china"
    ANDROID_SOURCE_SET="setuChina"
    SPLASH_VARIANT_DIR="setu-china"
    EXPECTED_BUNDLE_ID="com.setuchina.mobile"
    EXPECTED_ANDROID_PACKAGE="com.setuchina.mobile"
    CAPACITOR_APP_NAME="留澳助手 AU"
    STORE_CONFIG_PATH="$ROOT_DIR/mobile/store-config/setu-china.json"
    ;;
  jom_settle|jom-settle|jomsettle|malaysia)
    APP_VARIANT_KEY="jom_settle"
    BUILD_SCRIPT="build:jom-settle"
    FIREBASE_VARIANT_DIR="jom-settle"
    ANDROID_SOURCE_SET="jomSettle"
    SPLASH_VARIANT_DIR="jom-settle"
    EXPECTED_BUNDLE_ID="com.setumalaysia.mobile"
    EXPECTED_ANDROID_PACKAGE="com.setumalaysia.mobile"
    CAPACITOR_APP_NAME="Senang AU"
    STORE_CONFIG_PATH="$ROOT_DIR/mobile/store-config/jom-settle.json"
    ;;
  wheres_wolli|wheres-wolli|whereswolli|wolli)
    APP_VARIANT_KEY="wheres_wolli"
    BUILD_SCRIPT="build:wheres-wolli"
    FIREBASE_VARIANT_DIR="wheres-wolli"
    ANDROID_SOURCE_SET="wheresWolli"
    SPLASH_VARIANT_DIR="wheres-wolli"
    EXPECTED_BUNDLE_ID="com.whereswolli.mobile"
    EXPECTED_ANDROID_PACKAGE="com.whereswolli.mobile"
    CAPACITOR_APP_NAME="Where's Wolli"
    STORE_CONFIG_PATH="$ROOT_DIR/mobile/store-config/wheres-wolli.json"
    ;;
  burb_mate|burb-mate|burbmate)
    APP_VARIANT_KEY="burb_mate"
    BUILD_SCRIPT="build:burb-mate"
    FIREBASE_VARIANT_DIR="burb-mate"
    ANDROID_SOURCE_SET="burbMate"
    SPLASH_VARIANT_DIR="burb-mate"
    EXPECTED_BUNDLE_ID="com.burbmate.app"
    EXPECTED_ANDROID_PACKAGE="com.burbmate.app"
    CAPACITOR_APP_NAME="Hoodie"
    STORE_CONFIG_PATH="$ROOT_DIR/mobile/store-config/burb-mate.json"
    ;;
  *)
    APP_VARIANT_KEY="ghar"
    BUILD_SCRIPT="build:ghar"
    FIREBASE_VARIANT_DIR="ghar"
    ANDROID_SOURCE_SET="ghar"
    SPLASH_VARIANT_DIR="ghar"
    EXPECTED_BUNDLE_ID="com.ghar.mobile"
    EXPECTED_ANDROID_PACKAGE="com.ghar.mobile"
    CAPACITOR_APP_NAME="SETU India AU"
    STORE_CONFIG_PATH="$ROOT_DIR/mobile/store-config/ghar.json"
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

function read_plist_value() {
  local plist_path="$1"
  local key="$2"
  plutil -extract "$key" raw -o - "$plist_path" 2>/dev/null | tr -d '\n'
}

function read_android_json_value() {
  local json_path="$1"
  local expression="$2"
  node -e "const fs=require('fs'); const json=JSON.parse(fs.readFileSync(process.argv[1],'utf8')); const value=${expression}; if (value) process.stdout.write(String(value));" "$json_path"
}

cd "$ROOT_DIR"
CONFIG_REVIEWER_EMAIL="$(read_store_config_value reviewerEmail)"
CONFIG_REVIEWER_OTP="$(read_store_config_value reviewerOtp)"

if [[ -n "$CONFIG_REVIEWER_EMAIL" && -n "$CONFIG_REVIEWER_OTP" ]]; then
  if [[ -z "${VITE_REVIEWER_EMAIL:-}" ]]; then
    export VITE_REVIEWER_EMAIL="$CONFIG_REVIEWER_EMAIL"
  fi

  if [[ -z "${VITE_REVIEWER_OTP:-}" ]]; then
    export VITE_REVIEWER_OTP="$CONFIG_REVIEWER_OTP"
  fi

  echo "Reviewer access configured for $VITE_REVIEWER_EMAIL"
fi

npm run "$BUILD_SCRIPT"

node - "$EXPECTED_BUNDLE_ID" "$CAPACITOR_APP_NAME" <<'NODE'
const fs = require('fs');
const configPath = 'capacitor.config.json';
const appId = process.argv[2];
const appName = process.argv[3];
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
config.appId = appId;
config.appName = appName;
fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
NODE

SPLASH_SOURCE_DIR="$ROOT_DIR/mobile/app-icons/ios/splash/$SPLASH_VARIANT_DIR"
SPLASH_TARGET_DIR="$ROOT_DIR/ios/App/App/Assets.xcassets/Splash.imageset"
if [[ -d "$SPLASH_SOURCE_DIR" ]]; then
  cp "$SPLASH_SOURCE_DIR"/splash-2732x2732*.png "$SPLASH_TARGET_DIR"/
fi

FIREBASE_SOURCE_PLIST="$ROOT_DIR/mobile/ios/firebase/$FIREBASE_VARIANT_DIR/GoogleService-Info.plist"
FIREBASE_TARGET_PLIST="$ROOT_DIR/ios/App/App/GoogleService-Info.plist"
GHAR_FIREBASE_PLIST="$ROOT_DIR/mobile/ios/firebase/ghar/GoogleService-Info.plist"
ANDROID_FIREBASE_JSON="$ROOT_DIR/android/app/src/$ANDROID_SOURCE_SET/google-services.json"
GHAR_ANDROID_FIREBASE_JSON="$ROOT_DIR/android/app/src/ghar/google-services.json"

if [[ -f "$FIREBASE_SOURCE_PLIST" ]]; then
  SELECTED_BUNDLE_ID="$(read_plist_value "$FIREBASE_SOURCE_PLIST" "BUNDLE_ID")"
  SELECTED_IOS_APP_ID="$(read_plist_value "$FIREBASE_SOURCE_PLIST" "GOOGLE_APP_ID")"
  if [[ "$SELECTED_BUNDLE_ID" != "$EXPECTED_BUNDLE_ID" || -z "$SELECTED_IOS_APP_ID" ]]; then
    echo "Invalid Firebase iOS plist for $APP_VARIANT_KEY: expected bundle $EXPECTED_BUNDLE_ID." >&2
    exit 1
  fi

  if [[ "$APP_VARIANT_KEY" == "burb_mate" ]]; then
    GHAR_IOS_APP_ID="$(read_plist_value "$GHAR_FIREBASE_PLIST" "GOOGLE_APP_ID")"
    if [[ "$SELECTED_IOS_APP_ID" == "$GHAR_IOS_APP_ID" ]]; then
      echo "Refusing to sync Hoodie with a placeholder iOS Firebase app ID copied from SETU India AU." >&2
      exit 1
    fi
  fi
fi

if [[ -f "$ANDROID_FIREBASE_JSON" ]]; then
  SELECTED_ANDROID_PACKAGE="$(read_android_json_value "$ANDROID_FIREBASE_JSON" "json?.client?.find((client) => client?.client_info?.android_client_info?.package_name === '$EXPECTED_ANDROID_PACKAGE')?.client_info?.android_client_info?.package_name")"
  SELECTED_ANDROID_APP_ID="$(read_android_json_value "$ANDROID_FIREBASE_JSON" "json?.client?.find((client) => client?.client_info?.android_client_info?.package_name === '$EXPECTED_ANDROID_PACKAGE')?.client_info?.mobilesdk_app_id")"
  if [[ "$SELECTED_ANDROID_PACKAGE" != "$EXPECTED_ANDROID_PACKAGE" || -z "$SELECTED_ANDROID_APP_ID" ]]; then
    echo "Invalid Android Firebase config for $APP_VARIANT_KEY: expected package $EXPECTED_ANDROID_PACKAGE." >&2
    exit 1
  fi

  if [[ "$APP_VARIANT_KEY" == "burb_mate" ]]; then
    GHAR_ANDROID_APP_ID="$(read_android_json_value "$GHAR_ANDROID_FIREBASE_JSON" "json?.client?.find((client) => client?.client_info?.android_client_info?.package_name === 'com.ghar.mobile')?.client_info?.mobilesdk_app_id")"
    if [[ "$SELECTED_ANDROID_APP_ID" == "$GHAR_ANDROID_APP_ID" ]]; then
      echo "Refusing to sync Hoodie with a placeholder Android Firebase app ID copied from SETU India AU." >&2
      exit 1
    fi
  fi
fi

if [[ -f "$FIREBASE_SOURCE_PLIST" ]]; then
  cp "$FIREBASE_SOURCE_PLIST" "$FIREBASE_TARGET_PLIST"
fi

case "$CAP_PLATFORM" in
  android)
    npx cap sync android
    ;;
  ios)
    npx cap sync ios
    ;;
  *)
    npx cap sync
    ;;
esac
