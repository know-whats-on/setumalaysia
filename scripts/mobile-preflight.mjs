import { access, readFile, readdir } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import process from "node:process";

const cwd = process.cwd();
const rawVariant = String(process.env.APP_VARIANT || "ghar").trim().toLowerCase();
const appVariant = normalizeAppVariant(rawVariant);

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
      expectedBundleId: "com.burbmate.app",
      expectedAndroidPackage: "com.burbmate.app",
      iosFirebasePath: "mobile/ios/firebase/burb-mate/GoogleService-Info.plist",
      androidFirebasePath: "android/app/src/burbMate/google-services.json",
      iosIconPath: "ios/App/App/Assets.xcassets/BurbMateAppIcon.appiconset/Contents.json",
      screenshotDir: "mobile/listing-screenshots/burb-mate",
      storeConfigPath: "mobile/store-config/burb-mate.json",
      androidMetadataPath: "fastlane/metadata/android/burb-mate",
      iosMetadataPath: "fastlane/metadata/ios/burb-mate",
      reviewNotesPath: "mobile/review-notes/burb-mate.md",
    };
  }

  if (variant === "setu_china") {
    return {
      label: "留澳助手 AU",
      expectedBundleId: "com.setuchina.mobile",
      expectedAndroidPackage: "com.setuchina.mobile",
      iosFirebasePath: "mobile/ios/firebase/setu-china/GoogleService-Info.plist",
      androidFirebasePath: "android/app/src/setuChina/google-services.json",
      iosIconPath: "ios/App/App/Assets.xcassets/SetuChinaAppIcon.appiconset/Contents.json",
      screenshotDir: "mobile/listing-screenshots/setu-china",
      storeConfigPath: "mobile/store-config/setu-china.json",
      androidMetadataPath: "fastlane/metadata/android/setu-china",
      iosMetadataPath: "fastlane/metadata/ios/setu-china",
      reviewNotesPath: "mobile/review-notes/setu-china.md",
    };
  }

  if (variant === "jom_settle") {
    return {
      label: "Senang AU",
      expectedBundleId: "com.setumalaysia.mobile",
      expectedAndroidPackage: "com.setumalaysia.mobile",
      iosFirebasePath: "mobile/ios/firebase/jom-settle/GoogleService-Info.plist",
      androidFirebasePath: "android/app/src/jomSettle/google-services.json",
      iosIconPath: "ios/App/App/Assets.xcassets/JomSettleAppIcon.appiconset/Contents.json",
      screenshotDir: "mobile/listing-screenshots/jom-settle",
      storeConfigPath: "mobile/store-config/jom-settle.json",
      androidMetadataPath: "fastlane/metadata/android/jom-settle",
      iosMetadataPath: "fastlane/metadata/ios/jom-settle",
      reviewNotesPath: "mobile/review-notes/jom-settle.md",
    };
  }

  if (variant === "wheres_wolli") {
    return {
      label: "Where's Wolli",
      expectedBundleId: "com.whereswolli.mobile",
      expectedAndroidPackage: "com.whereswolli.mobile",
      iosFirebasePath: "mobile/ios/firebase/wheres-wolli/GoogleService-Info.plist",
      androidFirebasePath: "android/app/src/wheresWolli/google-services.json",
      iosIconPath: "ios/App/App/Assets.xcassets/WheresWolliAppIcon.appiconset/Contents.json",
      screenshotDir: "mobile/listing-screenshots/wheres-wolli",
      storeConfigPath: "mobile/store-config/wheres-wolli.json",
      androidMetadataPath: "fastlane/metadata/android/wheres-wolli",
      iosMetadataPath: "fastlane/metadata/ios/wheres-wolli",
      reviewNotesPath: "mobile/review-notes/wheres-wolli.md",
      requiredAssetPaths: [
        "mobile/app-icons/wheres-wolli-app-icon-1024.png",
        "mobile/app-icons/wheres-wolli-app-icon-512.png",
        "mobile/app-icons/ios/splash/wheres-wolli/splash-2732x2732.png",
        "android/app/src/wheresWolli/res/mipmap-xxxhdpi/ic_launcher.png",
        "android/app/src/wheresWolli/res/drawable-port-xxxhdpi/splash.png",
      ],
    };
  }

  return {
    label: "SETU India AU",
    expectedBundleId: "com.ghar.mobile",
    expectedAndroidPackage: "com.ghar.mobile",
    iosFirebasePath: "mobile/ios/firebase/ghar/GoogleService-Info.plist",
    androidFirebasePath: "android/app/src/ghar/google-services.json",
    iosIconPath: "ios/App/App/Assets.xcassets/AppIcon.appiconset/Contents.json",
    screenshotDir: "mobile/listing-screenshots/ghar",
    storeConfigPath: "mobile/store-config/ghar.json",
    androidMetadataPath: "fastlane/metadata/android/ghar",
    iosMetadataPath: "fastlane/metadata/ios/ghar",
    reviewNotesPath: "mobile/review-notes/ghar.md",
  };
}

const selectedVariant = variantConfig(appVariant);
const gharVariant = variantConfig("ghar");
const variantLabel = selectedVariant.label;

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

function extractPlistValue(contents, key) {
  const pattern = new RegExp(`<key>${key}</key>\\s*<string>([^<]+)</string>`, "m");
  const match = contents.match(pattern);
  return match?.[1]?.trim() || "";
}

function extractPlistBoolean(contents, key) {
  const pattern = new RegExp(`<key>${key}</key>\\s*<(true|false)\\s*/>`, "m");
  const match = contents.match(pattern);
  if (!match) return undefined;
  return match[1] === "true";
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasFirebasePodfileDeclaration(contents) {
  return /^\s*pod\s+["']Firebase\//m.test(contents);
}

function hasFirebasePodLockEntry(contents) {
  return (
    /^\s*-\s+Firebase(?:\/|[A-Za-z]| \()/m.test(contents) ||
    /^\s+Firebase(?:\/|[A-Za-z]|:)/m.test(contents)
  );
}

function hasSwiftPackageProduct(projectText, productName) {
  const escaped = escapeRegex(productName);
  return new RegExp(`productName = "?${escaped}"?;`, "m").test(projectText);
}

function findFirebaseAndroidClient(contents, expectedPackage) {
  try {
    const parsed = JSON.parse(contents);
    const clients = Array.isArray(parsed?.client) ? parsed.client : [];
    return (
      clients.find(
        (client) =>
          client?.client_info?.android_client_info?.package_name === expectedPackage
      ) ||
      clients[0] ||
      {}
    );
  } catch {
    return {};
  }
}

function extractFirebaseAndroidAppId(contents, expectedPackage) {
  try {
    const client = findFirebaseAndroidClient(contents, expectedPackage);
    return String(client?.client_info?.mobilesdk_app_id || "").trim();
  } catch {
    return "";
  }
}

function extractFirebaseAndroidPackage(contents, expectedPackage) {
  try {
    const client = findFirebaseAndroidClient(contents, expectedPackage);
    return String(client?.client_info?.android_client_info?.package_name || "").trim();
  } catch {
    return "";
  }
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

function inspectPngTransparency(buffer) {
  const pngSignature = "89504e470d0a1a0a";
  if (buffer.length < 33 || buffer.subarray(0, 8).toString("hex") !== pngSignature) {
    return { valid: false, detail: "is not a PNG file" };
  }

  let offset = 8;
  let colorType;
  let hasTrnsChunk = false;

  while (offset + 8 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    const dataOffset = offset + 8;
    const nextOffset = dataOffset + length + 4;

    if (nextOffset > buffer.length) {
      return { valid: false, detail: "has a truncated PNG chunk" };
    }

    if (type === "IHDR") {
      colorType = buffer[dataOffset + 9];
    } else if (type === "tRNS") {
      hasTrnsChunk = true;
    } else if (type === "IEND") {
      break;
    }

    offset = nextOffset;
  }

  if (colorType === undefined) {
    return { valid: false, detail: "is missing the PNG IHDR chunk" };
  }

  return {
    valid: true,
    hasTransparency: colorType === 4 || colorType === 6 || hasTrnsChunk,
    colorType,
    hasTrnsChunk,
  };
}

async function inspectIosIconSetAlpha(contentsJsonPath) {
  const contents = await readJson(contentsJsonPath);
  const iconSetDir = path.dirname(contentsJsonPath);
  const filenames = (contents.images || []).map((image) => image?.filename).filter(Boolean);
  const issues = [];

  for (const filename of filenames) {
    const iconPath = path.join(iconSetDir, filename);
    if (!(await exists(iconPath))) {
      issues.push(`Missing ${iconPath}.`);
      continue;
    }

    const buffer = await readFile(path.join(cwd, iconPath));
    const pngInfo = inspectPngTransparency(buffer);
    if (!pngInfo.valid) {
      issues.push(`${iconPath} ${pngInfo.detail}.`);
    } else if (pngInfo.hasTransparency) {
      const reason = pngInfo.hasTrnsChunk ? "uses PNG transparency" : `uses PNG color type ${pngInfo.colorType}`;
      issues.push(`${iconPath} ${reason}; iOS large app icons must be opaque RGB PNGs.`);
    }
  }

  return issues;
}

async function main() {
  const xcodePath = "/Applications/Xcode.app";
  addCheck(
    (await exists(xcodePath)) ? "pass" : "fail",
    "Full Xcode app",
    (await exists(xcodePath))
      ? "Full Xcode is installed."
      : "Install the full Xcode app before attempting iOS archive/TestFlight upload."
  );

  const androidLocalProperties = await exists("android/local.properties");
  if (!androidLocalProperties) {
    addCheck(
      "fail",
      "Android SDK config",
      "Create android/local.properties or export ANDROID_HOME / ANDROID_SDK_ROOT."
    );
  } else {
    const localProperties = await readText("android/local.properties");
    addCheck(
      /sdk\.dir=/.test(localProperties) ? "pass" : "fail",
      "Android SDK config",
      /sdk\.dir=/.test(localProperties)
        ? "android/local.properties includes sdk.dir."
        : "android/local.properties exists but does not define sdk.dir."
    );
  }

  const keyPropertiesExists = await exists("android/key.properties");
  addCheck(
    keyPropertiesExists ? "pass" : "fail",
    "Android release signing",
    keyPropertiesExists
      ? "android/key.properties is present for signed release builds."
      : "Create android/key.properties from android/key.properties.example before Play upload."
  );

  const reviewerEnvExists = await exists(".env");
  let reviewerReady = false;
  if (reviewerEnvExists) {
    const envText = await readText(".env");
    reviewerReady =
      /VITE_REVIEWER_EMAIL=.+/.test(envText) &&
      /VITE_REVIEWER_OTP=.+/.test(envText);
  }
  addCheck(
    reviewerReady ? "pass" : "fail",
    "Reviewer bypass env",
    reviewerReady
      ? "Reviewer OTP bypass env vars are configured in .env."
      : "Configure VITE_REVIEWER_EMAIL and VITE_REVIEWER_OTP in .env for review builds."
  );

  const fastlaneEnvExists = await exists(".fastlane.env");
  let iosUploadReady = false;
  if (fastlaneEnvExists) {
    const fastlaneEnv = await readText(".fastlane.env");
    const hasAppleIdFlow = /FASTLANE_APPLE_ID=.+/.test(fastlaneEnv) && /FASTLANE_TEAM_ID=.+/.test(fastlaneEnv);
    const hasApiKeyFlow =
      /APP_STORE_CONNECT_KEY_ID=.+/.test(fastlaneEnv) &&
      /APP_STORE_CONNECT_KEY_FILE=.+/.test(fastlaneEnv);
    iosUploadReady = hasAppleIdFlow || hasApiKeyFlow;
  }
  addCheck(
    iosUploadReady ? "pass" : "fail",
    "iOS upload credentials",
    iosUploadReady
      ? "Fastlane/App Store Connect upload credentials are configured."
      : "Add Apple upload credentials to .fastlane.env before TestFlight/App Store upload."
  );

  const podfilePath = "ios/App/Podfile";
  const podfileLockPath = "ios/App/Podfile.lock";
  const xcodeProjectPath = "ios/App/App.xcodeproj/project.pbxproj";
  const podfileExists = await exists(podfilePath);
  const podfileLockExists = await exists(podfileLockPath);
  const xcodeProjectExists = await exists(xcodeProjectPath);
  const podfile = podfileExists ? await readText(podfilePath) : "";
  const podfileLock = podfileLockExists ? await readText(podfileLockPath) : "";
  const xcodeProject = xcodeProjectExists ? await readText(xcodeProjectPath) : "";
  const requiredFirebaseSpmProducts = [
    "FirebaseCore",
    "FirebaseInstallations",
    "FirebaseMessaging",
    "FirebaseInAppMessaging-Beta",
    "FirebaseAnalyticsCore",
  ];
  const missingFirebaseSpmProducts = requiredFirebaseSpmProducts.filter(
    (productName) => !hasSwiftPackageProduct(xcodeProject, productName)
  );
  const firebaseCocoaPodsClean =
    podfileExists &&
    podfileLockExists &&
    !hasFirebasePodfileDeclaration(podfile) &&
    !hasFirebasePodLockEntry(podfileLock);
  const firebaseSpmReady =
    xcodeProjectExists &&
    xcodeProject.includes("https://github.com/firebase/firebase-ios-sdk.git") &&
    xcodeProject.includes("minimumVersion = 12.12.1;") &&
    missingFirebaseSpmProducts.length === 0;
  const firebaseSdkManagerIssues = [];
  if (!podfileExists) firebaseSdkManagerIssues.push(`Missing ${podfilePath}.`);
  if (!podfileLockExists) firebaseSdkManagerIssues.push(`Missing ${podfileLockPath}; run pod install for Capacitor pods.`);
  if (hasFirebasePodfileDeclaration(podfile)) firebaseSdkManagerIssues.push("Remove Firebase pod declarations from ios/App/Podfile.");
  if (hasFirebasePodLockEntry(podfileLock)) firebaseSdkManagerIssues.push("Run pod install so ios/App/Podfile.lock drops Firebase pods.");
  if (!xcodeProjectExists) firebaseSdkManagerIssues.push(`Missing ${xcodeProjectPath}.`);
  if (xcodeProjectExists && !xcodeProject.includes("https://github.com/firebase/firebase-ios-sdk.git")) {
    firebaseSdkManagerIssues.push("Add firebase-ios-sdk as a Swift Package.");
  }
  if (xcodeProjectExists && !xcodeProject.includes("minimumVersion = 12.12.1;")) {
    firebaseSdkManagerIssues.push("Set firebase-ios-sdk SPM minimum version to 12.12.1.");
  }
  if (missingFirebaseSpmProducts.length > 0) {
    firebaseSdkManagerIssues.push(`Link missing Firebase SPM products: ${missingFirebaseSpmProducts.join(", ")}.`);
  }
  addCheck(
    firebaseCocoaPodsClean && firebaseSpmReady ? "pass" : "fail",
    "Firebase iOS SDK manager",
    firebaseCocoaPodsClean && firebaseSpmReady
      ? "Firebase Apple SDKs are SPM-managed; CocoaPods is only managing Capacitor/native pods."
      : firebaseSdkManagerIssues.join(" ")
  );

  const noIdfaIssues = [];
  const usesAnalyticsCore = hasSwiftPackageProduct(xcodeProject, "FirebaseAnalyticsCore");
  const usesAnalytics = hasSwiftPackageProduct(xcodeProject, "FirebaseAnalytics");
  const usesAnalyticsIdentitySupport = /FirebaseAnalyticsIdentitySupport/.test(xcodeProject);
  const linksAdSupport = /AdSupport\.framework/.test(xcodeProject);
  const hasObjCLinkerFlag = /-ObjC/.test(xcodeProject);
  if (!usesAnalyticsCore) noIdfaIssues.push("Link FirebaseAnalyticsCore for Firebase In-App Messaging.");
  if (usesAnalytics) noIdfaIssues.push("Do not link FirebaseAnalytics; use FirebaseAnalyticsCore for no-IDFA Analytics.");
  if (usesAnalyticsIdentitySupport) noIdfaIssues.push("Remove FirebaseAnalyticsIdentitySupport.");
  if (linksAdSupport) noIdfaIssues.push("Remove AdSupport.framework.");
  if (!hasObjCLinkerFlag) noIdfaIssues.push("Keep -ObjC in Other Linker Flags for Firebase/Objective-C categories.");
  addCheck(
    xcodeProjectExists &&
      usesAnalyticsCore &&
      !usesAnalytics &&
      !usesAnalyticsIdentitySupport &&
      !linksAdSupport &&
      hasObjCLinkerFlag
      ? "pass"
      : "fail",
    "Firebase no-IDFA Analytics",
    noIdfaIssues.length === 0
      ? "Firebase In-App Messaging uses AnalyticsCore without FirebaseAnalytics, identity support, or AdSupport.framework."
      : noIdfaIssues.join(" ")
  );

  const iosFirebaseExists = await exists(selectedVariant.iosFirebasePath);
  if (!iosFirebaseExists) {
    addCheck(
      "fail",
      `${selectedVariant.label} iOS Firebase plist`,
      `Missing ${selectedVariant.iosFirebasePath}.`
    );
  } else {
    const selectedPlist = await readText(selectedVariant.iosFirebasePath);
    const selectedBundleId = extractPlistValue(selectedPlist, "BUNDLE_ID");
    const selectedAppId = extractPlistValue(selectedPlist, "GOOGLE_APP_ID");
    const selectedAnalyticsEnabled = extractPlistBoolean(selectedPlist, "IS_ANALYTICS_ENABLED");
    const selectedAdsEnabled = extractPlistBoolean(selectedPlist, "IS_ADS_ENABLED");
    const expectedBundleId = selectedVariant.expectedBundleId;
    const gharPlist = await readText(gharVariant.iosFirebasePath);
    const gharAppId = extractPlistValue(gharPlist, "GOOGLE_APP_ID");
    const appIdLooksDistinct = appVariant === "ghar" ? Boolean(selectedAppId) : Boolean(selectedAppId && selectedAppId !== gharAppId);
    addCheck(
      selectedBundleId === expectedBundleId && appIdLooksDistinct ? "pass" : "fail",
      `${selectedVariant.label} iOS Firebase plist`,
      selectedBundleId === expectedBundleId && appIdLooksDistinct
        ? `${selectedVariant.label} iOS Firebase config targets ${expectedBundleId} with a distinct app ID.`
        : `Replace ${selectedVariant.iosFirebasePath} with a real Firebase app registration for ${expectedBundleId}.`
    );
    addCheck(
      selectedAnalyticsEnabled === true && selectedAdsEnabled === false ? "pass" : "fail",
      `${selectedVariant.label} Firebase IAM Analytics`,
      selectedAnalyticsEnabled === true && selectedAdsEnabled === false
        ? "Google Analytics is enabled for Firebase In-App Messaging while Ads support remains disabled."
        : `Enable Google Analytics for ${expectedBundleId} in Firebase and re-download ${selectedVariant.iosFirebasePath} with IS_ANALYTICS_ENABLED=true and IS_ADS_ENABLED=false.`
    );
  }

  const syncedIosPlistPath = "ios/App/App/GoogleService-Info.plist";
  if (await exists(syncedIosPlistPath)) {
    const syncedPlist = await readText(syncedIosPlistPath);
    const syncedBundleId = extractPlistValue(syncedPlist, "BUNDLE_ID");
    const syncedAnalyticsEnabled = extractPlistBoolean(syncedPlist, "IS_ANALYTICS_ENABLED");
    const syncedAdsEnabled = extractPlistBoolean(syncedPlist, "IS_ADS_ENABLED");
    const syncedBundleMatches = syncedBundleId === selectedVariant.expectedBundleId;
    addCheck(
      syncedBundleMatches ? "pass" : "warn",
      "Synced iOS Firebase plist",
      syncedBundleMatches
        ? "The checked-in iOS GoogleService-Info.plist already matches the selected variant."
        : "Run the variant sync command before opening Xcode so ios/App/App/GoogleService-Info.plist matches the selected app."
    );
    addCheck(
      !syncedBundleMatches
        ? "warn"
        : syncedAnalyticsEnabled === true && syncedAdsEnabled === false
          ? "pass"
          : "fail",
      "Synced iOS Firebase IAM Analytics",
      !syncedBundleMatches
        ? "Run the variant sync command so the native iOS plist can be checked for IAM Analytics readiness."
        : syncedAnalyticsEnabled === true && syncedAdsEnabled === false
          ? "The native iOS plist is Analytics-enabled for IAM and keeps Ads support disabled."
          : "Run variant sync with an Analytics-enabled no-IDFA Firebase plist before testing In-App Messaging."
    );
  }

  const androidFirebaseExists = await exists(selectedVariant.androidFirebasePath);
  if (!androidFirebaseExists) {
    addCheck(
      "fail",
      `${selectedVariant.label} Android Firebase config`,
      `Missing ${selectedVariant.androidFirebasePath}.`
    );
  } else {
    const selectedJson = await readText(selectedVariant.androidFirebasePath);
    const expectedPackage = selectedVariant.expectedAndroidPackage;
    const selectedPackage = extractFirebaseAndroidPackage(selectedJson, expectedPackage);
    const selectedAppId = extractFirebaseAndroidAppId(selectedJson, expectedPackage);
    const gharJson = await readText(gharVariant.androidFirebasePath);
    const gharAppId = extractFirebaseAndroidAppId(gharJson, gharVariant.expectedAndroidPackage);
    const appIdLooksDistinct = appVariant === "ghar" ? Boolean(selectedAppId) : Boolean(selectedAppId && selectedAppId !== gharAppId);
    addCheck(
      selectedPackage === expectedPackage && appIdLooksDistinct ? "pass" : "fail",
      `${selectedVariant.label} Android Firebase config`,
      selectedPackage === expectedPackage && appIdLooksDistinct
        ? `${selectedVariant.label} Android google-services.json targets ${expectedPackage} with a distinct app ID.`
        : `Replace ${selectedVariant.androidFirebasePath} with a real Firebase app registration for ${expectedPackage}.`
    );
  }

  const iosIconSetExists = await exists(selectedVariant.iosIconPath);
  addCheck(
    iosIconSetExists ? "pass" : "fail",
    `${selectedVariant.label} app icon set`,
    iosIconSetExists
      ? `${selectedVariant.label} iOS icon set is present.`
      : `Missing ${selectedVariant.iosIconPath}.`
  );
  if (iosIconSetExists) {
    const iconAlphaIssues = await inspectIosIconSetAlpha(selectedVariant.iosIconPath);
    addCheck(
      iconAlphaIssues.length === 0 ? "pass" : "fail",
      `${selectedVariant.label} iOS app icon alpha`,
      iconAlphaIssues.length === 0
        ? "The iOS app icon PNGs are opaque RGB PNGs with no alpha channel."
        : iconAlphaIssues.join(" ")
    );
  }

  const requiredAssetPaths = selectedVariant.requiredAssetPaths || [];
  for (const assetPath of requiredAssetPaths) {
    addCheck(
      (await exists(assetPath)) ? "pass" : "fail",
      `${selectedVariant.label} generated asset`,
      (await exists(assetPath))
        ? `${assetPath} exists.`
        : `Missing ${assetPath}; regenerate app icons/splash assets before release.`
    );
  }

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
        : `Replace placeholder URLs in ${selectedVariant.storeConfigPath} before submission.`
    );

    addCheck(
      isConfiguredUrl(storeConfig.marketingUrl) ? "pass" : "warn",
      "Marketing URL",
      isConfiguredUrl(storeConfig.marketingUrl)
        ? `${selectedVariant.label} marketing URL is configured.`
        : `Marketing URL is still placeholder or missing in ${selectedVariant.storeConfigPath}.`
    );
  }

  addCheck(
    (await exists(selectedVariant.androidMetadataPath)) ? "pass" : "fail",
    `${selectedVariant.label} Android metadata`,
    (await exists(selectedVariant.androidMetadataPath))
      ? `Android metadata exists at ${selectedVariant.androidMetadataPath}.`
      : `Add ${selectedVariant.label} Play metadata under ${selectedVariant.androidMetadataPath}.`
  );

  addCheck(
    (await exists(selectedVariant.iosMetadataPath)) ? "pass" : "fail",
    `${selectedVariant.label} iOS metadata`,
    (await exists(selectedVariant.iosMetadataPath))
      ? `iOS metadata exists at ${selectedVariant.iosMetadataPath}.`
      : `Add ${selectedVariant.label} App Store metadata under ${selectedVariant.iosMetadataPath}.`
  );

  addCheck(
    (await exists(selectedVariant.reviewNotesPath)) ? "pass" : "fail",
    `${selectedVariant.label} reviewer notes`,
    (await exists(selectedVariant.reviewNotesPath))
      ? `Reviewer notes exist at ${selectedVariant.reviewNotesPath}.`
      : `Add reviewer notes for ${selectedVariant.label} at ${selectedVariant.reviewNotesPath}.`
  );

  const screenshotDirExists = await exists(selectedVariant.screenshotDir);
  const screenshotDirHasFiles = screenshotDirExists ? await hasFiles(selectedVariant.screenshotDir) : false;
  addCheck(
    screenshotDirHasFiles ? "pass" : "warn",
    `${selectedVariant.label} screenshot pack`,
    screenshotDirHasFiles
      ? `Variant screenshots exist at ${selectedVariant.screenshotDir}.`
      : `Generate ${selectedVariant.label} screenshots with APP_VARIANT=${appVariant} npm run mobile:screenshots.`
  );

  const failures = checks.filter((check) => check.status === "fail").length;
  const warnings = checks.filter((check) => check.status === "warn").length;

  console.log(`${variantLabel} mobile preflight\n`);
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
