import { mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { chromium, devices } from "playwright";

const rawVariant = String(process.env.APP_VARIANT || "ghar").trim().toLowerCase();
const appVariant = normalizeAppVariant(rawVariant);
const variantDir = appVariant === "burb_mate" ? "burb-mate" : appVariant === "setu_china" ? "setu-china" : appVariant === "jom_settle" ? "jom-settle" : "ghar";
const baseURL = process.env.GHAR_BASE_URL || process.env.BASE_URL || "http://127.0.0.1:4173";
const outputDir = path.resolve(process.cwd(), "mobile", "listing-screenshots", variantDir);
const device = devices["iPhone 15 Pro"];

const captures = appVariant === "setu_china"
  ? [
      { route: "/vibe?section=vibe&vibe_tab=suburb-score", file: "01-suburbs.png", waitMs: 5000 },
      { route: "/legal?section=prepare&prepare_tab=checklist", file: "02-arrival-checklist.png", waitMs: 5000 },
      { route: "/legal?section=prepare&prepare_tab=application-kit", file: "03-application-kit.png", waitMs: 5000 },
      { route: "/vibe?section=events", file: "04-events.png", waitMs: 5000 },
      { route: "/games", file: "05-games.png", waitMs: 5000 },
    ]
  : appVariant === "burb_mate" || appVariant === "jom_settle"
  ? [
      { route: "/dashboard", file: "01-dashboard-map.png", waitMs: 2500, flatMap: true, afterActionWaitMs: 4200 },
      { route: "/arrival", file: "02-rent-safety-assistant.png", waitMs: 4500 },
      { route: "/noticeboard", file: "03-noticeboard.png", waitMs: 4000 },
      { route: "/profile?tab=evidence", file: "04-evidence-vault.png", waitMs: 5000 },
      { route: "/legal", file: "05-legal-center.png", waitMs: 5000 },
      { route: "/profile?tab=household", file: "06-household.png", waitMs: 5000 },
    ]
  : [
      { route: "/dashboard", file: "01-dashboard-map.png", waitMs: 5000 },
      { route: "/triage", file: "02-triage-center.png", waitMs: 4000 },
      { route: "/noticeboard", file: "03-noticeboard.png", waitMs: 4000 },
      { route: "/profile", file: "04-profile-vault.png", waitMs: 5000 },
      { route: "/legal", file: "05-legal-center.png", waitMs: 5000 },
    ];

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const setuChinaScreenshotBannedTerms = [
  /\bfree\b/i,
  /免费/,
  /\bdiscount(?:ed|s)?\b/i,
  /\bprice\b/i,
  /\boffer(?:s|ed|ing)?\b/i,
  /\$\s*\d/,
];

function normalizeAppVariant(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (["burb_mate", "burb-mate", "burbmate"].includes(normalized)) return "burb_mate";
  if (["setu_china", "setu-china", "setuchina", "china"].includes(normalized)) return "setu_china";
  if (["jom_settle", "jom-settle", "jomsettle", "malaysia"].includes(normalized)) return "jom_settle";
  return "ghar";
}

async function main() {
  await mkdir(outputDir, { recursive: true });
  const existingOutputEntries = await readdir(outputDir, { withFileTypes: true });
  await Promise.all(
    existingOutputEntries
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".png"))
      .map((entry) => rm(path.join(outputDir, entry.name))),
  );

  const browser = await chromium.launch({
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: true,
  });

  const context = await browser.newContext({
    ...device,
    viewport: { width: 393, height: 852 },
    screen: { width: 393, height: 852 },
    colorScheme: "light",
    geolocation: { latitude: -33.9173, longitude: 151.2313, accuracy: 35 },
    permissions: ["geolocation"],
  });

  await context.addInitScript(({ authenticate }) => {
    if (!authenticate) {
      localStorage.removeItem("ghar_onboarded");
      localStorage.removeItem("ghar_email");
      localStorage.removeItem("ghar_first_name");
      localStorage.removeItem("ghar_last_name");
      return;
    }

    localStorage.setItem("ghar_onboarded", "true");
    localStorage.setItem("ghar_email", "member@hoodie.app");
    localStorage.setItem("ghar_first_name", "Hoodie");
    localStorage.setItem("ghar_last_name", "Member");
    localStorage.setItem("ghar_au_state", "NSW");
    localStorage.setItem("ghar_university", "University of New South Wales");
    localStorage.setItem("ghar_audience_mode", "student");
    localStorage.setItem("ghar_gps_granted", "true");
    sessionStorage.setItem("ghar_current_address_prompt_dismissed:member@hoodie.app", "1");
  }, { authenticate: appVariant !== "setu_china" });

  for (const capture of captures) {
    const page = await context.newPage();
    await page.goto(`${baseURL}${capture.route}`, { waitUntil: "load" });
    await wait(capture.waitMs);
    if (capture.flatMap) {
      const flatMapToggle = page.locator('button[title="Switch to Flat Map"]');
      await flatMapToggle.click({ timeout: 7000 });
      await wait(capture.afterActionWaitMs || 3500);
    }
    if (appVariant === "setu_china") {
      const visibleText = await page.locator("body").innerText({ timeout: 7000 });
      const matchedTerm = setuChinaScreenshotBannedTerms.find((term) => term.test(visibleText));
      if (matchedTerm) {
        throw new Error(`SETU China screenshot route ${capture.route} contains pricing-sensitive text matching ${matchedTerm}`);
      }
    }
    console.log(`Capturing ${capture.route} -> ${capture.file}`);
    await page.screenshot({
      path: path.join(outputDir, capture.file),
      fullPage: false,
    });
    await page.close();
  }

  await context.close();
  await browser.close();
  console.log(`Saved ${appVariant} screenshots to ${outputDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
