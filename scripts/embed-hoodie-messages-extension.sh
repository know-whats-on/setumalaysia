#!/bin/sh
set -eu

EXTENSION_NAME="HoodieMessagesExtension.appex"
APP_BUNDLE_PATH="${TARGET_BUILD_DIR}/${WRAPPER_NAME}"
PLUGINS_DIR="${APP_BUNDLE_PATH}/PlugIns"
EXTENSION_SOURCE_PATH="${BUILT_PRODUCTS_DIR}/${EXTENSION_NAME}"
EXTENSION_DESTINATION_PATH="${PLUGINS_DIR}/${EXTENSION_NAME}"

INCLUDE_EXTENSION="${INCLUDE_HOODIE_MESSAGES_EXTENSION:-}"

if [ -z "${INCLUDE_EXTENSION}" ]; then
  INCLUDE_EXTENSION="YES"
fi

if [ "${INCLUDE_EXTENSION}" != "YES" ]; then
  rm -rf "${EXTENSION_DESTINATION_PATH}"
  exit 0
fi

if [ ! -d "${EXTENSION_SOURCE_PATH}" ]; then
  echo "error: Expected ${EXTENSION_NAME} at ${EXTENSION_SOURCE_PATH}" >&2
  exit 1
fi

mkdir -p "${PLUGINS_DIR}"
rm -rf "${EXTENSION_DESTINATION_PATH}"
/usr/bin/ditto "${EXTENSION_SOURCE_PATH}" "${EXTENSION_DESTINATION_PATH}"

if [ "${CODE_SIGNING_ALLOWED:-NO}" = "YES" ] && [ -n "${EXPANDED_CODE_SIGN_IDENTITY:-}" ]; then
  /usr/bin/codesign \
    --force \
    --sign "${EXPANDED_CODE_SIGN_IDENTITY}" \
    --preserve-metadata=identifier,entitlements,flags \
    --generate-entitlement-der \
    "${EXTENSION_DESTINATION_PATH}"
fi
