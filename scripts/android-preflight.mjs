import { access, readFile, readdir } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";

const cwd = process.cwd();
const rawVariant = String(process.env.APP_VARIANT || "ghar").trim().toLowerCase();
const appVariant = normalizeAppVariant(rawVariant);
const variantLabel = variantConfig(appVariant).label;

const checks = [];

function normalizeAppVariant(variant) {
  if (["burb_mate", "burb-mate", "burbmate"].includes(variant)) return "burb_mate";
  if (["setu_china", "setu-china", "setuchina", "china"].includes(variant)) return "setu_china";
  if (["jom_settle", "jom-settle", "jomsettle", "malaysia"].includes(variant)) return "jom_settle";
  if (["wheres_wolli", "wheres-wolli", "whereswolli", "wolli"].includes(variant)) return "wheres_wolli";
  return "ghar";
}

function variantConfig(variant) {
  if (variant === "burb_mate") {
    return {
      label: "Hoodie by What's On!",
      firebasePath: "android/app/src/burbMate/google-services.json",
      packageName: "com.burbmate.app",
      bundleArtifact: "mobile-artifacts/android/Hoodie-by-Whats-On-android-release.aab",
      screenshotDir: "mobile/android-device-screenshots/burb-mate",
      metadataPath: "fastlane/metadata/android/burb-mate",
      storeConfigPath: "mobile/store-config/burb-mate.json",
      scriptSuffix: "burb-mate",
    };
  }
  if (variant === "setu_china") {
    return {
      label: "留澳助手 AU",
      firebasePath: "android/app/src/setuChina/google-services.json",
      packageName: "com.setuchina.mobile",
      bundleArtifact: "mobile-artifacts/android/SETU-China-android-release.aab",
      screenshotDir: "mobile/android-device-screenshots/setu-china",
      metadataPath: "fastlane/metadata/android/setu-china",
      storeConfigPath: "mobile/store-config/setu-china.json",
      scriptSuffix: "setu-china",
    };
  }
  if (variant === "jom_settle") {
    return {
      label: "Senang AU",
      firebasePath: "android/app/src/jomSettle/google-services.json",
      packageName: "com.setumalaysia.mobile",
      bundleArtifact: "mobile-artifacts/android/Senang-AU-android-release.aab",
      screenshotDir: "mobile/android-device-screenshots/jom-settle",
      metadataPath: "fastlane/metadata/android/jom-settle",
      storeConfigPath: "mobile/store-config/jom-settle.json",
      scriptSuffix: "jom-settle",
    };
  }
  if (variant === "wheres_wolli") {
    return {
      label: "Where's Wolli",
      firebasePath: "android/app/src/wheresWolli/google-services.json",
      packageName: "com.whereswolli.mobile",
      bundleArtifact: "mobile-artifacts/android/Wheres-Wolli-android-release.aab",
      screenshotDir: "mobile/android-device-screenshots/wheres-wolli",
      metadataPath: "fastlane/metadata/android/wheres-wolli",
      storeConfigPath: "mobile/store-config/wheres-wolli.json",
      scriptSuffix: "wheres-wolli",
    };
  }
  return {
    label: "SETU India AU",
    firebasePath: "android/app/src/ghar/google-services.json",
    packageName: "com.ghar.mobile",
    bundleArtifact: "mobile-artifacts/android/SETU-India-AU-android-release.aab",
    screenshotDir: "mobile/android-device-screenshots/ghar",
    metadataPath: "fastlane/metadata/android/ghar",
    storeConfigPath: "mobile/store-config/ghar.json",
    scriptSuffix: "ghar",
  };
}

const selectedVariant = variantConfig(appVariant);
const gharVariant = variantConfig("ghar");

async function exists(relativePath) {
  try {
    const targetPath = path.isAbsolute(relativePath) ? relativePath : path.join(cwd, relativePath);
    await access(targetPath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function readText(relativePath) {
  return readFile(path.join(cwd, relativePath), "utf8");
}

async function readJson(relativePath) {
  return JSON.parse(await readText(relativePath));
}

function addCheck(status, title, detail) {
  checks.push({ status, title, detail });
}

async function pathExists(targetPath) {
  try {
    await access(targetPath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function resolveTool(tool, fallbacks = []) {
  const candidates = [tool, ...fallbacks];
  for (const candidate of candidates) {
    try {
      const result = execFileSync("sh", ["-lc", `command -v ${candidate}`], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim();
      if (result) return result;
    } catch {
      // Keep trying.
    }
  }
  return null;
}

function extractFirebaseAndroidClient(contents, packageName) {
  try {
    const parsed = JSON.parse(contents);
    const clients = Array.isArray(parsed?.client) ? parsed.client : [];
    return clients.find((client) => {
      return String(client?.client_info?.android_client_info?.package_name || "").trim() === packageName;
    }) || null;
  } catch {
    return null;
  }
}

function extractFirebaseAndroidAppId(contents, packageName) {
  const client = extractFirebaseAndroidClient(contents, packageName);
  return String(client?.client_info?.mobilesdk_app_id || "").trim();
}

function extractFirebaseAndroidPackage(contents, packageName) {
  const client = extractFirebaseAndroidClient(contents, packageName);
  return String(client?.client_info?.android_client_info?.package_name || "").trim();
}

function isConfiguredUrl(value) {
  const normalized = String(value || "").trim();
  if (!/^https?:\/\//.test(normalized)) return false;
  return !/replace-before-submit|example\.com/i.test(normalized);
}

async function hasFiles(relativePath) {
  try {
    const entries = await readdir(path.join(cwd, relativePath));
    return entries.length > 0;
  } catch {
    return false;
  }
}

async function main() {
  const homebrewJavaHome = "/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home";
  const javaHome = process.env.JAVA_HOME || (await pathExists(homebrewJavaHome) ? homebrewJavaHome : "");
  addCheck(
    javaHome.includes("openjdk@21") ? "pass" : "warn",
    "Java 21",
    javaHome.includes("openjdk@21")
      ? "JAVA_HOME points at OpenJDK 21."
      : "Set JAVA_HOME to OpenJDK 21 before running Gradle or Fastlane."
  );

  const adb = resolveTool("adb", ["/opt/homebrew/share/android-commandlinetools/platform-tools/adb"]);
  addCheck(
    adb ? "pass" : "fail",
    "ADB available",
    adb ? `adb found at ${adb}.` : "Install or expose Android platform-tools so adb is on PATH."
  );

  const emulator = resolveTool("emulator", ["/opt/homebrew/share/android-commandlinetools/emulator/emulator"]);
  addCheck(
    emulator ? "pass" : "warn",
    "Android emulator",
    emulator
      ? `emulator found at ${emulator}.`
      : "Install the Android emulator package if you want local device demo screenshots."
  );

  const systemImageDir =
    "/opt/homebrew/share/android-commandlinetools/system-images/android-35/google_apis/arm64-v8a/package.xml";
  addCheck(
    (await pathExists(systemImageDir)) ? "pass" : "warn",
    "Demo system image",
    (await pathExists(systemImageDir))
      ? "Android 35 Google APIs ARM system image is installed for local emulator demos."
      : "Install the Android 35 Google APIs ARM system image before running the Android demo flow."
  );

  const sdkManager = resolveTool("sdkmanager", ["/opt/homebrew/share/android-commandlinetools/cmdline-tools/latest/bin/sdkmanager"]);
  addCheck(
    sdkManager ? "pass" : "fail",
    "SDK manager",
    sdkManager
      ? `sdkmanager found at ${sdkManager}.`
      : "Install Android command line tools so sdkmanager is available."
  );

  const localProperties = await exists("android/local.properties");
  addCheck(
    localProperties ? "pass" : "fail",
    "Android SDK path",
    localProperties
      ? "android/local.properties exists."
      : "Create android/local.properties with sdk.dir before opening the Android project."
  );

  const keyProperties = await exists("android/key.properties");
  addCheck(
    keyProperties ? "pass" : "fail",
    "Release signing file",
    keyProperties
      ? "android/key.properties is present."
      : "Create android/key.properties from android/key.properties.example before Play upload."
  );

  const fastlaneEnvExists = await exists(".fastlane.env");
  let playUploadReady = false;
  if (fastlaneEnvExists) {
    const fastlaneEnv = await readText(".fastlane.env");
    playUploadReady = /SUPPLY_JSON_KEY=.+/.test(fastlaneEnv);
  }
  addCheck(
    playUploadReady ? "pass" : "fail",
    "Play upload credentials",
    playUploadReady
      ? "Play Console service account credentials are configured for Fastlane."
      : "Set SUPPLY_JSON_KEY in .fastlane.env before Play internal/production uploads."
  );

  const gradle = await exists("android/gradlew");
  addCheck(
    gradle ? "pass" : "fail",
    "Gradle wrapper",
    gradle ? "android/gradlew is present." : "Android Gradle wrapper is missing."
  );

  const firebaseExists = await exists(selectedVariant.firebasePath);
  if (!firebaseExists) {
    addCheck(
      "fail",
      `${selectedVariant.label} Firebase config`,
      `Missing ${selectedVariant.firebasePath}.`
    );
  } else {
    const selectedJson = await readText(selectedVariant.firebasePath);
    const selectedPackage = extractFirebaseAndroidPackage(selectedJson, selectedVariant.packageName);
    const selectedAppId = extractFirebaseAndroidAppId(selectedJson, selectedVariant.packageName);
    const gharJson = await readText(gharVariant.firebasePath);
    const gharAppId = extractFirebaseAndroidAppId(gharJson, gharVariant.packageName);
    const appIdLooksDistinct = appVariant === "ghar" ? Boolean(selectedAppId) : Boolean(selectedAppId && selectedAppId !== gharAppId);
    addCheck(
      selectedPackage === selectedVariant.packageName && appIdLooksDistinct ? "pass" : "fail",
      `${selectedVariant.label} Firebase config`,
      selectedPackage === selectedVariant.packageName && appIdLooksDistinct
        ? `${selectedVariant.label} google-services.json targets ${selectedVariant.packageName} with a distinct app ID.`
        : `Replace ${selectedVariant.firebasePath} with a real Firebase app registration for ${selectedVariant.packageName}.`
    );
  }

  addCheck(
    (await exists(selectedVariant.metadataPath)) ? "pass" : "fail",
    `${selectedVariant.label} Play metadata`,
    (await exists(selectedVariant.metadataPath))
      ? `Play metadata exists at ${selectedVariant.metadataPath}.`
      : `Add Play listing metadata for ${selectedVariant.label} at ${selectedVariant.metadataPath}.`
  );

  const storeConfigExists = await exists(selectedVariant.storeConfigPath);
  if (!storeConfigExists) {
    addCheck(
      "fail",
      `${selectedVariant.label} store config`,
      `Missing ${selectedVariant.storeConfigPath}.`
    );
  } else {
    const storeConfig = await readJson(selectedVariant.storeConfigPath);
    addCheck(
      isConfiguredUrl(storeConfig.privacyPolicyUrl) && isConfiguredUrl(storeConfig.supportUrl) ? "pass" : "fail",
      "Hosted privacy/support URLs",
      isConfiguredUrl(storeConfig.privacyPolicyUrl) && isConfiguredUrl(storeConfig.supportUrl)
        ? `${selectedVariant.label} store config includes real hosted privacy and support URLs.`
        : `Replace placeholder URLs in ${selectedVariant.storeConfigPath} before Play submission.`
    );
  }

  const bundle = await exists(selectedVariant.bundleArtifact);
  addCheck(
    bundle ? "pass" : "warn",
    "Release bundle artifact",
    bundle
      ? `Release AAB already exists at ${selectedVariant.bundleArtifact}.`
      : `Run APP_VARIANT=${appVariant} npm run fastlane:android:bundle:${selectedVariant.scriptSuffix} or the Gradle release task to generate the Play upload artifact.`
  );

  const screenshotsDir = await exists(selectedVariant.screenshotDir);
  const screenshotsDirHasFiles = screenshotsDir ? await hasFiles(selectedVariant.screenshotDir) : false;
  addCheck(
    screenshotsDirHasFiles ? "pass" : "warn",
    "Device screenshot captures",
    screenshotsDirHasFiles
      ? `Android device screenshots exist at ${selectedVariant.screenshotDir}.`
      : `Generate Android captures with APP_VARIANT=${appVariant} npm run mobile:android:screenshots once a device is connected.`
  );

  const failures = checks.filter((check) => check.status === "fail").length;
  const warnings = checks.filter((check) => check.status === "warn").length;

  console.log(`${variantLabel} Android preflight\n`);
  for (const check of checks) {
    const prefix =
      check.status === "pass"
        ? "[pass]"
        : check.status === "warn"
          ? "[warn]"
          : "[fail]";
    console.log(`${prefix} ${check.title}`);
    console.log(`       ${check.detail}`);
  }

  console.log("\nSuggested demo flow");
  console.log("- `adb devices`");
  console.log(`- \`APP_VARIANT=${appVariant} npm run fastlane:android:bundle:${selectedVariant.scriptSuffix}\``);
  console.log("- `npm run mobile:android:demo` or `adb install -r android/app/build/outputs/apk/debug/app-debug.apk`");
  console.log(`- \`APP_VARIANT=${appVariant} npm run mobile:android:screenshots\``);

  console.log("\nSummary");
  console.log(`- Fails: ${failures}`);
  console.log(`- Warnings: ${warnings}`);

  if (failures > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
