import { access, copyFile, mkdir, readFile } from "node:fs/promises";
import { renameSync } from "node:fs";
import { constants } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { chromium } from "playwright";

const rootDir = process.cwd();
const captureDir = path.join(rootDir, "mobile", "listing-screenshots", "burb-mate");
const outputRoot = path.join(rootDir, "mobile", "store-assets", "hoodie-promos");
const appStoreDir = path.join(outputRoot, "app-store");
const playPhoneDir = path.join(outputRoot, "play-phone");
const socialDir = path.join(outputRoot, "social");
const publicSocialDir = path.join(rootDir, "public", "social");
const featureGraphicPath = path.join(outputRoot, "play-feature-graphic-1024x500.png");
const logoPath = path.join(rootDir, "mobile", "app-icons", "burb-mate-app-icon-512.png");
const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const storyFrames = [
  {
    order: 1,
    slug: "check-the-hood-before-you-move",
    title: "Check the hood before you move",
    body: "See suburb context, nearby alerts, and reported issues before you inspect or sign.",
    screenCandidates: ["01-dashboard-map.png"],
    accent: "#FBD433",
    warm: "#FFF3C4",
  },
  {
    order: 2,
    slug: "spot-rental-red-flags-early",
    title: "Spot rental red flags early",
    body: "Ask Hoodienie to sense-check listings, messages, and scam warning signs.",
    screenCandidates: ["02-rent-safety-assistant.png", "02-arrival.png"],
    accent: "#EE811A",
    warm: "#FFE4C7",
  },
  {
    order: 3,
    slug: "watch-the-alerts-around-you",
    title: "Watch the alerts around you",
    body: "Keep community, police, and safety updates close while you settle in.",
    screenCandidates: ["03-noticeboard.png"],
    accent: "#2DD4BF",
    warm: "#DDFBF5",
  },
  {
    order: 4,
    slug: "keep-every-receipt-and-screenshot",
    title: "Keep every receipt and screenshot",
    body: "Store leases, bond details, photos, and conversations in one evidence vault.",
    screenCandidates: ["04-evidence-vault.png", "04-profile-vault.png"],
    accent: "#1E40AF",
    warm: "#DBEAFE",
  },
  {
    order: 5,
    slug: "know-what-to-do-next",
    title: "Know what to do next",
    body: "Turn messy rental issues into organised tenancy notes and next steps.",
    screenCandidates: ["05-legal-center.png"],
    accent: "#7C3AED",
    warm: "#EDE9FE",
  },
  {
    order: 6,
    slug: "share-the-house-admin-clearly",
    title: "Share the house admin clearly",
    body: "Track shared bills, chores, rules, and reminders without losing the thread.",
    screenCandidates: ["06-household.png", "04-evidence-vault.png", "04-profile-vault.png"],
    accent: "#10B981",
    warm: "#DDFCEB",
  },
];

const socialFrames = [
  {
    order: 1,
    slug: "before-you-send-money",
    title: "Before you send money, check the signs.",
    body: "Slow down, spot odd requests, and keep proof before a rental deal gets messy.",
    screenCandidates: ["02-rent-safety-assistant.png", "02-arrival.png"],
    accent: "#EE811A",
    warm: "#FFE4C7",
  },
  {
    order: 2,
    slug: "evidence-in-one-place",
    title: "Your lease, receipts, and messages belong in one place.",
    body: "Build a private evidence trail you can actually find later.",
    screenCandidates: ["04-evidence-vault.png", "04-profile-vault.png"],
    accent: "#1E40AF",
    warm: "#DBEAFE",
  },
  {
    order: 3,
    slug: "rent-safer-with-hoodie",
    title: "Rent safer in Australia with Hoodie.",
    body: "Know the hood, save the proof, and take the next step with more confidence.",
    screenCandidates: ["05-legal-center.png"],
    accent: "#10B981",
    warm: "#DDFCEB",
  },
];

const specs = {
  appStore: { kind: "app-store", width: 1320, height: 2868, dir: appStoreDir },
  playPhone: { kind: "play-phone", width: 1080, height: 1920, dir: playPhoneDir },
  social: { kind: "social-story", width: 1080, height: 1920, dir: socialDir },
};

async function exists(filePath) {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function imageDataUrl(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mime = ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : "image/png";
  const data = await readFile(filePath);
  return `data:${mime};base64,${data.toString("base64")}`;
}

function outputName(frame) {
  return `${String(frame.order).padStart(2, "0")}-${frame.slug}.png`;
}

async function resolveScreen(frame) {
  for (const candidate of frame.screenCandidates) {
    const candidatePath = path.join(captureDir, candidate);
    if (await exists(candidatePath)) return candidatePath;
  }

  throw new Error(
    `Missing source capture for "${frame.title}". Tried: ${frame.screenCandidates
      .map((candidate) => path.join(captureDir, candidate))
      .join(", ")}`
  );
}

async function launchBrowser() {
  const launchOptions = { headless: true };
  if (await exists(chromePath)) {
    launchOptions.executablePath = chromePath;
  }
  return chromium.launch(launchOptions);
}

function baseStyles() {
  return `
    * { box-sizing: border-box; }
    html, body {
      width: 100%;
      height: 100%;
      margin: 0;
      background: #050505;
      font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      color: #050505;
    }
    .poster {
      position: relative;
      width: 100vw;
      height: 100vh;
      overflow: hidden;
      isolation: isolate;
      background: #050505;
    }
    .poster::before {
      content: "";
      position: absolute;
      inset: 0;
      z-index: 0;
      opacity: 0.18;
      background-image:
        linear-gradient(90deg, rgba(255,250,242,0.18) 1px, transparent 1px),
        linear-gradient(0deg, rgba(255,250,242,0.12) 1px, transparent 1px);
      background-size: 74px 74px;
      mask-image: linear-gradient(to bottom, black 0%, black 66%, transparent 86%);
    }
    .poster::after {
      content: "";
      position: absolute;
      left: -4%;
      right: -4%;
      bottom: -1px;
      height: 39%;
      z-index: 0;
      background: #fff7e8;
      clip-path: polygon(0 16%, 100% 0, 100% 100%, 0 100%);
      box-shadow: 0 -26px 70px rgba(0,0,0,0.4);
    }
    .checker {
      position: absolute;
      z-index: 1;
      right: -120px;
      top: 248px;
      width: 540px;
      height: 540px;
      opacity: 0.1;
      transform: rotate(-8deg);
      background:
        linear-gradient(45deg, #fffaf2 25%, transparent 25% 75%, #fffaf2 75%),
        linear-gradient(45deg, #fffaf2 25%, transparent 25% 75%, #fffaf2 75%);
      background-position: 0 0, 44px 44px;
      background-size: 88px 88px;
      mask-image: linear-gradient(90deg, transparent 0%, black 28%, black 80%, transparent 100%);
    }
    .accent-rule {
      position: absolute;
      z-index: 2;
      left: -7%;
      right: -7%;
      height: 9px;
      border-radius: 999px;
      background: linear-gradient(90deg, var(--accent), #FBD433, #fff7e8);
      transform: rotate(-3deg);
    }
    .brand {
      position: absolute;
      z-index: 4;
      display: flex;
      align-items: center;
      gap: 20px;
    }
    .brand img {
      width: 82px;
      height: 82px;
      border-radius: 23px;
      box-shadow: 0 22px 56px rgba(5,5,5,0.18);
    }
    .brand strong {
      display: block;
      font-size: 38px;
      line-height: 0.95;
      font-weight: 900;
      letter-spacing: 0;
      color: #fffaf2;
    }
    .brand span {
      display: block;
      margin-top: 7px;
      font-size: 18px;
      line-height: 1.2;
      font-weight: 760;
      color: rgba(255,250,242,0.72);
    }
    .copy {
      position: absolute;
      z-index: 4;
    }
    h1 {
      margin: 0;
      font-weight: 950;
      letter-spacing: 0;
      color: #fffaf2;
      text-wrap: balance;
    }
    .body-copy {
      margin: 28px 0 0;
      font-weight: 780;
      color: rgba(255,250,242,0.74);
      text-wrap: balance;
    }
    .phone-wrap {
      position: absolute;
      z-index: 5;
      display: grid;
      place-items: center;
    }
    .phone-wrap::before {
      content: "";
      position: absolute;
      top: -22px;
      left: 50%;
      width: calc(var(--phone-width) * 0.28);
      height: 12px;
      transform: translateX(-50%);
      border-radius: 999px;
      background: #05070b;
      box-shadow: 0 10px 24px rgba(5,5,5,0.22);
    }
    .phone {
      box-sizing: content-box;
      position: relative;
      overflow: hidden;
      width: var(--phone-width);
      aspect-ratio: 393 / 852;
      border: var(--bezel) solid #05070b;
      border-radius: var(--phone-radius);
      background: #fff;
      box-shadow:
        0 58px 112px rgba(5,5,5,0.5),
        0 0 0 1px rgba(255,255,255,0.28) inset;
    }
    .phone::before {
      display: none;
    }
    .phone img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: top center;
      filter: saturate(1.02) contrast(1.01);
    }
    .float-card {
      position: absolute;
      z-index: 6;
      width: max-content;
      max-width: 360px;
      border: 2px solid rgba(5,5,5,0.08);
      border-radius: 999px;
      padding: 18px 24px;
      background: #fffaf2;
      box-shadow: 0 24px 70px rgba(5,5,5,0.2);
      color: #050505;
      font-size: 18px;
      line-height: 1.18;
      font-weight: 950;
    }
    .float-card b {
      color: var(--accent);
      font-weight: 950;
    }
    .app-store .brand { top: 94px; left: 88px; }
    .app-store .copy {
      top: 318px;
      left: 88px;
      right: 88px;
    }
    .app-store h1 {
      max-width: 1080px;
      font-size: 124px;
      line-height: 0.9;
    }
    .app-store .body-copy {
      max-width: 980px;
      font-size: 39px;
      line-height: 1.12;
    }
    .app-store .accent-rule {
      bottom: 1196px;
    }
    .app-store .phone-wrap {
      left: 50%;
      bottom: 128px;
      transform: translateX(-50%) rotate(var(--tilt));
    }
    .app-store .phone {
      --phone-width: 690px;
      --bezel: 14px;
      --phone-radius: 70px;
    }
    .app-store .float-card {
      right: 74px;
      bottom: 1018px;
    }
    .play-phone .brand { top: 62px; left: 58px; }
    .play-phone .brand img { width: 70px; height: 70px; border-radius: 20px; }
    .play-phone .brand strong { font-size: 32px; }
    .play-phone .brand span { font-size: 16px; }
    .play-phone .copy {
      top: 214px;
      left: 58px;
      right: 58px;
    }
    .play-phone h1 {
      max-width: 900px;
      font-size: 82px;
      line-height: 0.9;
    }
    .play-phone .body-copy {
      max-width: 780px;
      font-size: 26px;
      line-height: 1.12;
    }
    .play-phone .accent-rule {
      bottom: 790px;
      height: 7px;
    }
    .play-phone .phone-wrap {
      left: 50%;
      bottom: 60px;
      transform: translateX(-50%) rotate(var(--tilt));
    }
    .play-phone .phone {
      --phone-width: 545px;
      --bezel: 11px;
      --phone-radius: 56px;
    }
    .play-phone .float-card {
      right: 44px;
      bottom: 684px;
      max-width: 284px;
      padding: 14px 20px;
      font-size: 15px;
    }
    .social-story .brand { top: 68px; left: 58px; }
    .social-story .copy {
      top: 236px;
      left: 58px;
      right: 58px;
    }
    .social-story h1 {
      max-width: 870px;
      font-size: 82px;
      line-height: 0.92;
    }
    .social-story .body-copy {
      max-width: 560px;
      font-size: 31px;
      line-height: 1.12;
    }
    .social-story .accent-rule {
      bottom: 805px;
      height: 7px;
    }
    .social-story .phone-wrap {
      left: 50%;
      bottom: -130px;
      transform: translateX(-50%) rotate(var(--tilt));
    }
    .social-story .phone {
      --phone-width: 635px;
      --bezel: 12px;
      --phone-radius: 64px;
    }
    .social-story .float-card {
      left: 58px;
      right: auto;
      bottom: 540px;
      max-width: 320px;
      padding: 15px 21px;
      font-size: 16px;
    }
  `;
}

function posterHtml(frame, spec, screen, logo) {
  const tilt = frame.order % 2 === 0 ? "2.5deg" : "-2.5deg";

  return `<!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=${spec.width}, initial-scale=1" />
        <style>${baseStyles()}</style>
      </head>
      <body>
        <section
          class="poster poster-ready ${spec.kind}"
          style="--accent:${frame.accent};--warm:${frame.warm};--tilt:${tilt};"
          aria-label="${escapeHtml(frame.title)}"
        >
          <div class="checker"></div>
          <div class="accent-rule"></div>
          <div class="brand">
            <img src="${logo}" alt="Hoodie" />
            <div>
              <strong>Hoodie</strong>
              <span>Rent safety in Australia</span>
            </div>
          </div>
          <div class="copy">
            <h1>${escapeHtml(frame.title)}</h1>
            <p class="body-copy">${escapeHtml(frame.body)}</p>
          </div>
          <div class="phone-wrap">
            <div class="phone">
              <img src="${screen}" alt="" />
            </div>
          </div>
          <div class="float-card"><b>Check.</b> Save. Act.</div>
        </section>
      </body>
    </html>`;
}

function featureGraphicHtml(logo) {
  return `<!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=1024, initial-scale=1" />
        <style>
          * { box-sizing: border-box; }
          html, body {
            width: 100%;
            height: 100%;
            margin: 0;
            background: #fff7e8;
            font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            color: #050505;
          }
          .feature {
            position: relative;
            width: 1024px;
            height: 500px;
            overflow: hidden;
            background: #050505;
          }
          .feature::before {
            content: "";
            position: absolute;
            inset: 0;
            opacity: 0.16;
            background-image:
              linear-gradient(90deg, rgba(255,255,255,0.18) 1px, transparent 1px),
              linear-gradient(0deg, rgba(255,255,255,0.13) 1px, transparent 1px);
            background-size: 54px 54px;
          }
          .feature-panel {
            position: absolute;
            left: 0;
            right: 0;
            bottom: 0;
            height: 150px;
            background: #fff7e8;
            clip-path: polygon(0 38%, 100% 0, 100% 100%, 0 100%);
            box-shadow: 0 -24px 70px rgba(0,0,0,0.42);
          }
          .feature-rule {
            position: absolute;
            left: -60px;
            right: -60px;
            bottom: 132px;
            height: 7px;
            border-radius: 999px;
            background: linear-gradient(90deg, #FBD433, #1E40AF, #fff7e8);
            transform: rotate(-3deg);
          }
          .feature-checker {
            position: absolute;
            right: -46px;
            top: 36px;
            width: 356px;
            height: 356px;
            opacity: 0.1;
            transform: rotate(-8deg);
            background:
              linear-gradient(45deg, #fffaf2 25%, transparent 25% 75%, #fffaf2 75%),
              linear-gradient(45deg, #fffaf2 25%, transparent 25% 75%, #fffaf2 75%);
            background-position: 0 0, 34px 34px;
            background-size: 68px 68px;
          }
          .brand {
            position: absolute;
            left: 72px;
            top: 74px;
            display: flex;
            align-items: center;
            gap: 18px;
          }
          .brand img {
            width: 72px;
            height: 72px;
            border-radius: 20px;
            box-shadow: 0 20px 42px rgba(5,5,5,0.18);
          }
          .brand strong {
            display: block;
            font-size: 34px;
            line-height: 1;
            font-weight: 950;
            color: #fffaf2;
          }
          .brand span {
            display: block;
            margin-top: 5px;
            font-size: 16px;
            font-weight: 780;
            color: rgba(255,250,242,0.72);
          }
          h1 {
            position: absolute;
            left: 72px;
            top: 154px;
            width: 620px;
            margin: 0;
            font-size: 78px;
            line-height: 0.89;
            font-weight: 950;
            letter-spacing: 0;
            color: #fffaf2;
          }
          p {
            position: absolute;
            left: 76px;
            top: 314px;
            width: 585px;
            margin: 0;
            font-size: 25px;
            line-height: 1.1;
            font-weight: 780;
            color: rgba(255,250,242,0.72);
          }
          .chips {
            position: absolute;
            left: 72px;
            bottom: 52px;
            display: flex;
            gap: 14px;
          }
          .chip {
            padding: 12px 16px;
            border: 1px solid rgba(5,5,5,0.12);
            border-radius: 18px;
            background: rgba(255,250,242,0.94);
            box-shadow: 0 16px 40px rgba(0,0,0,0.18);
            font-size: 14px;
            font-weight: 880;
            color: #050505;
          }
          .stack {
            position: absolute;
            right: 78px;
            top: 62px;
            width: 278px;
            display: grid;
            gap: 18px;
            transform: rotate(3deg);
          }
          .note {
            border-radius: 26px;
            padding: 22px 24px;
            background: #fffaf2;
            border: 1px solid rgba(5,5,5,0.08);
            box-shadow: 0 22px 62px rgba(0,0,0,0.22);
            backdrop-filter: blur(18px);
          }
          .note b {
            display: block;
            font-size: 18px;
            line-height: 1.08;
            color: #0F172A;
          }
          .note span {
            display: block;
            margin-top: 8px;
            font-size: 13px;
            line-height: 1.22;
            font-weight: 700;
            color: #64748B;
          }
        </style>
      </head>
      <body>
        <section class="feature poster-ready" aria-label="Rent safer in Australia with Hoodie">
          <div class="feature-checker"></div>
          <div class="feature-rule"></div>
          <div class="feature-panel"></div>
          <div class="brand">
            <img src="${logo}" alt="Hoodie" />
            <div>
              <strong>Hoodie</strong>
              <span>Australia rental support</span>
            </div>
          </div>
          <h1>Rent safer in Australia</h1>
          <p>Check the hood, save the proof, and know the next step before issues grow.</p>
          <div class="chips">
            <div class="chip">Suburb context</div>
            <div class="chip">Evidence vault</div>
            <div class="chip">Tenancy prep</div>
          </div>
          <div class="stack">
            <div class="note"><b>Check the hood</b><span>Read local context before you commit.</span></div>
            <div class="note"><b>Save the proof</b><span>Keep receipts, photos, and messages tidy.</span></div>
            <div class="note"><b>Know next steps</b><span>Organise the path when rent issues start.</span></div>
          </div>
        </section>
      </body>
    </html>`;
}

async function waitForImages(page) {
  await page.waitForSelector(".poster-ready");
  await page.evaluate(async () => {
    const images = Array.from(document.images);
    await Promise.race(
      [
        Promise.all(
          images.map((image) => {
            if (image.complete) return Promise.resolve();
            return new Promise((resolve) => {
              image.addEventListener("load", resolve, { once: true });
              image.addEventListener("error", resolve, { once: true });
            });
          })
        ),
        new Promise((_, reject) => {
          window.setTimeout(() => reject(new Error("Timed out waiting for poster images")), 10000);
        }),
      ]
    );
    const broken = images.filter((image) => image.naturalWidth <= 0).map((image) => image.currentSrc || image.src);
    if (broken.length) throw new Error(`Poster image failed to load: ${broken.join(", ")}`);
    if (document.fonts?.ready) await document.fonts.ready;
  });
}

async function renderHtml(browser, html, size, outputPath) {
  const page = await browser.newPage({
    viewport: { width: size.width, height: size.height },
    deviceScaleFactor: 1,
    colorScheme: "light",
  });

  await page.setContent(html, { waitUntil: "load" });
  await waitForImages(page);
  await page.screenshot({
    path: outputPath,
    fullPage: false,
    omitBackground: false,
  });
  await page.close();
  stripAlpha(outputPath);
}

function stripAlpha(outputPath) {
  const tempPath = outputPath.replace(/\.png$/i, ".flat.png");
  try {
    execFileSync("magick", [
      outputPath,
      "-background",
      "#fffaf2",
      "-alpha",
      "remove",
      "-alpha",
      "off",
      tempPath,
    ], { stdio: "ignore" });
    renameSync(tempPath, outputPath);
  } catch {
    // The page is rendered on an opaque background. If ImageMagick is absent,
    // validation can still confirm whether Chromium produced a no-alpha PNG.
  }
}

async function renderStoreFrames(browser, spec, logo) {
  await mkdir(spec.dir, { recursive: true });

  for (const frame of storyFrames) {
    const screenPath = await resolveScreen(frame);
    const screen = await imageDataUrl(screenPath);
    const outPath = path.join(spec.dir, outputName(frame));
    await renderHtml(browser, posterHtml(frame, spec, screen, logo), spec, outPath);
    console.log(`Saved ${path.relative(rootDir, outPath)}`);
  }
}

async function renderSocialFrames(browser, logo) {
  await mkdir(socialDir, { recursive: true });
  await mkdir(publicSocialDir, { recursive: true });

  for (const frame of socialFrames) {
    const screenPath = await resolveScreen(frame);
    const screen = await imageDataUrl(screenPath);
    const outPath = path.join(socialDir, outputName(frame));
    await renderHtml(browser, posterHtml(frame, specs.social, screen, logo), specs.social, outPath);

    const publicOutPath = path.join(publicSocialDir, `hoodie-${outputName(frame)}`);
    await copyFile(outPath, publicOutPath);
    console.log(`Saved ${path.relative(rootDir, outPath)}`);
    console.log(`Copied ${path.relative(rootDir, publicOutPath)}`);
  }
}

async function renderFeatureGraphic(browser, logo) {
  await mkdir(outputRoot, { recursive: true });
  await renderHtml(browser, featureGraphicHtml(logo), { width: 1024, height: 500 }, featureGraphicPath);
  console.log(`Saved ${path.relative(rootDir, featureGraphicPath)}`);
}

async function main() {
  if (!(await exists(logoPath))) {
    throw new Error(`Missing Hoodie logo at ${logoPath}`);
  }

  await mkdir(outputRoot, { recursive: true });
  const logo = await imageDataUrl(logoPath);

  const browser = await launchBrowser();
  try {
    await renderStoreFrames(browser, specs.appStore, logo);
    await renderStoreFrames(browser, specs.playPhone, logo);
    await renderFeatureGraphic(browser, logo);
    await renderSocialFrames(browser, logo);
  } finally {
    await browser.close();
  }

  console.log(`Hoodie promo posters saved to ${path.relative(rootDir, outputRoot)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
