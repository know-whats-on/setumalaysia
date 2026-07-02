import { access, mkdir } from "node:fs/promises";
import { constants } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import process from "node:process";

const cwd = process.cwd();
const sdkRoot = process.env.ANDROID_SDK_ROOT || "/opt/homebrew/share/android-commandlinetools";
const adb = `${sdkRoot}/platform-tools/adb`;
const rawVariant = String(process.env.APP_VARIANT || "ghar").trim().toLowerCase();
const appVariant = normalizeAppVariant(rawVariant);
const variantDir = appVariant === "burb_mate" ? "burb-mate" : appVariant === "setu_china" ? "setu-china" : appVariant === "jom_settle" ? "jom-settle" : "ghar";
const outputDir = path.join(cwd, "mobile", "android-device-screenshots", variantDir);

const captures = [
  { file: "01-dashboard.png", note: "Capture dashboard manually before running." },
  { file: "02-triage.png", note: "Navigate to triage before running again if needed." },
  { file: "03-noticeboard.png", note: "Navigate to noticeboard before running again if needed." },
];

async function exists(targetPath) {
  try {
    await access(targetPath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function run(args) {
  return execFileSync(adb, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function normalizeAppVariant(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (["burb_mate", "burb-mate", "burbmate"].includes(normalized)) return "burb_mate";
  if (["setu_china", "setu-china", "setuchina", "china"].includes(normalized)) return "setu_china";
  if (["jom_settle", "jom-settle", "jomsettle", "malaysia"].includes(normalized)) return "jom_settle";
  return "ghar";
}

async function main() {
  if (!(await exists(adb))) {
    throw new Error(`adb not found at ${adb}`);
  }

  const devices = run(["devices"])
    .split("\n")
    .slice(1)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => line.endsWith("\tdevice"));

  if (devices.length === 0) {
    throw new Error("No connected Android device or emulator found.");
  }

  await mkdir(outputDir, { recursive: true });

  for (const capture of captures) {
    const remotePath = `/sdcard/${capture.file}`;
    run(["shell", "screencap", "-p", remotePath]);
    run(["pull", remotePath, path.join(outputDir, capture.file)]);
    run(["shell", "rm", remotePath]);
    console.log(`Saved ${capture.file}`);
    console.log(`Note: ${capture.note}`);
  }

  console.log(`Saved Android screenshots to ${outputDir}`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
