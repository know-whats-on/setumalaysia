import { spawn, execFileSync } from "node:child_process";
import { access } from "node:fs/promises";
import { constants } from "node:fs";
import process from "node:process";

const sdkRoot = process.env.ANDROID_SDK_ROOT || "/opt/homebrew/share/android-commandlinetools";
const javaHome = process.env.JAVA_HOME || "/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home";
const avdName = process.env.GHAR_AVD_NAME || "ghar-api35";
const systemImage = process.env.GHAR_SYSTEM_IMAGE || "system-images;android-35;google_apis;arm64-v8a";
const packageName = "com.ghar.mobile";
const apkPath = "android/app/build/outputs/apk/debug/app-debug.apk";

const adb = `${sdkRoot}/platform-tools/adb`;
const emulator = `${sdkRoot}/emulator/emulator`;
const avdmanager = `${sdkRoot}/cmdline-tools/latest/bin/avdmanager`;

async function exists(targetPath) {
  try {
    await access(targetPath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    stdio: ["pipe", "pipe", "pipe"],
    encoding: "utf8",
    env: {
      ...process.env,
      ANDROID_SDK_ROOT: sdkRoot,
      JAVA_HOME: javaHome,
      PATH: `${javaHome}/bin:${process.env.PATH || ""}`,
    },
    ...options,
  }).trim();
}

async function ensurePrereq(targetPath, label) {
  if (!(await exists(targetPath))) {
    throw new Error(`${label} is missing at ${targetPath}`);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForBoot(timeoutMs = 240000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const value = run(adb, ["shell", "getprop", "sys.boot_completed"]);
      if (value.trim() === "1") return;
    } catch {
      // Emulator may not be ready for adb yet.
    }
    await sleep(5000);
  }
  throw new Error("Timed out waiting for Android emulator boot.");
}

async function ensureAvd() {
  const list = run(avdmanager, ["list", "avd"]);
  if (list.includes(`Name: ${avdName}`)) {
    return;
  }

  execFileSync(
    "sh",
    [
      "-lc",
      `printf 'no\n' | "${avdmanager}" create avd --force --name "${avdName}" --package "${systemImage}" --device pixel_8`,
    ],
    {
      stdio: ["ignore", "pipe", "pipe"],
      encoding: "utf8",
      env: {
        ...process.env,
        ANDROID_SDK_ROOT: sdkRoot,
        JAVA_HOME: javaHome,
        PATH: `${javaHome}/bin:${process.env.PATH || ""}`,
      },
    }
  );
}

async function main() {
  await ensurePrereq(adb, "adb");
  await ensurePrereq(emulator, "emulator");
  await ensurePrereq(avdmanager, "avdmanager");
  await ensurePrereq(apkPath, "debug APK");

  console.log(`Preparing AVD ${avdName}...`);
  await ensureAvd();

  console.log("Starting emulator...");
  const emulatorProcess = spawn(
    emulator,
    ["-avd", avdName, "-no-snapshot-save", "-no-boot-anim"],
    {
      detached: true,
      stdio: "ignore",
      env: {
        ...process.env,
        ANDROID_SDK_ROOT: sdkRoot,
        JAVA_HOME: javaHome,
        PATH: `${javaHome}/bin:${process.env.PATH || ""}`,
      },
    }
  );
  emulatorProcess.unref();

  console.log("Waiting for adb...");
  run(adb, ["wait-for-device"]);
  await waitForBoot();

  console.log("Installing app...");
  run(adb, ["install", "-r", apkPath]);

  console.log("Launching GHAR...");
  run(adb, ["shell", "monkey", "-p", packageName, "-c", "android.intent.category.LAUNCHER", "1"]);

  console.log("Android demo is ready on the emulator.");
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
