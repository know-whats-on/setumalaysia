import { mkdir, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const outputDir = path.join(rootDir, 'public', 'pitch-deck', 'captures');
const tempDir = path.join(rootDir, '.tmp', 'pitch-deck-captures');
const localBaseUrl = process.env.PITCH_DECK_APP_URL || 'http://127.0.0.1:5174';
const governmentBaseUrl = 'https://govt.knowwhatson.com';

const setuSession = {
  ghar_onboarded: 'true',
  ghar_email: 'delete-demo@ghar.app',
  ghar_first_name: 'App',
  ghar_last_name: 'Reviewer',
  ghar_au_state: 'VIC',
  ghar_audience_mode: 'migrant',
  ghar_university: '',
};

const setuClips = [
  {
    id: 'setu-yatri',
    route: '/arrival',
    viewport: { width: 390, height: 844 },
    run: async (page) => {
      await page.waitForTimeout(1200);
      await askAssistantQuestion(page, 'Is this rental listing a scam if they ask for a deposit before inspection?');
      await page.waitForTimeout(1400);
      await optionalClick(page.getByRole('button', { name: /send|submit/i }));
      await page.waitForTimeout(3000);
    },
  },
  {
    id: 'setu-map',
    route: '/dashboard',
    viewport: { width: 390, height: 844 },
    run: async (page) => {
      await page.waitForTimeout(2200);
      await page.mouse.wheel(0, 280);
      await page.waitForTimeout(1200);
      await page.mouse.wheel(0, -160);
      await page.waitForTimeout(900);
    },
  },
  {
    id: 'setu-profile',
    route: '/profile',
    viewport: { width: 390, height: 844 },
    run: async (page) => {
      await page.waitForTimeout(1300);
      await optionalClick(page.getByRole('button', { name: /Later/i }));
      await page.waitForTimeout(900);
      await page.mouse.wheel(0, 420);
      await page.waitForTimeout(1100);
    },
  },
  {
    id: 'setu-resources',
    route: '/setu',
    viewport: { width: 390, height: 844 },
    run: async (page) => {
      await page.waitForTimeout(1200);
      await page.mouse.wheel(0, 480);
      await page.waitForTimeout(1200);
      await page.mouse.wheel(0, -220);
      await page.waitForTimeout(800);
    },
  },
  {
    id: 'setu-vibe',
    route: '/vibe',
    viewport: { width: 390, height: 844 },
    run: async (page) => {
      await page.waitForTimeout(1200);
      await optionalClick(page.getByRole('button', { name: /Events/i }));
      await page.waitForTimeout(900);
      await optionalClick(page.getByRole('button', { name: /Alerts/i }));
      await page.waitForTimeout(1000);
    },
  },
];

const governmentClips = [
  {
    id: 'gov-overview',
    route: '/overview',
    posterDelay: 5000,
    run: async (page) => {
      await page.waitForTimeout(1200);
      await page.mouse.wheel(0, 540);
      await page.waitForTimeout(1200);
      await page.mouse.wheel(0, -300);
      await page.waitForTimeout(800);
    },
  },
  {
    id: 'gov-map',
    route: '/map',
    posterDelay: 5000,
    run: async (page) => {
      await page.waitForTimeout(1800);
      await optionalClick(page.getByText(/Melbourne/i).first());
      await page.waitForTimeout(900);
      await page.mouse.wheel(0, 360);
      await page.waitForTimeout(900);
    },
  },
  {
    id: 'gov-risk',
    route: '/risk-escalation',
    posterDelay: 5000,
    run: async (page) => {
      await page.waitForTimeout(1300);
      await page.mouse.wheel(0, 520);
      await page.waitForTimeout(1200);
    },
  },
  {
    id: 'gov-predictive',
    route: '/predictive-insights',
    posterDelay: 5000,
    run: async (page) => {
      await page.waitForTimeout(1300);
      await page.mouse.wheel(0, 520);
      await page.waitForTimeout(1200);
    },
  },
  {
    id: 'gov-interventions',
    route: '/interventions',
    posterDelay: 5000,
    run: async (page) => {
      await page.waitForTimeout(1300);
      await page.mouse.wheel(0, 520);
      await page.waitForTimeout(1200);
    },
  },
];

async function optionalClick(locator, timeout = 1200) {
  await locator.click({ timeout }).catch(() => {});
}

async function optionalFill(locator, value, timeout = 1200) {
  await locator.fill(value, { timeout }).catch(() => {});
}

async function askAssistantQuestion(page, question) {
  const input = page.locator('textarea, input[placeholder*="Ask"], input[type="text"], input:not([type])').last();
  await optionalFill(input, question, 1800);
  await page.keyboard.press('Enter').catch(() => {});
}

async function waitForSetuReady(page) {
  await page.waitForFunction(
    () => {
      const text = document.body?.innerText || '';
      return Boolean(text.trim()) && !/LOADING SETU INDIA AU/i.test(text);
    },
    null,
    { timeout: 16000 },
  ).catch(() => {});
  await page.waitForTimeout(5000);
}

async function ensureServer(url) {
  const response = await fetch(url).catch(() => null);
  if (!response?.ok) {
    throw new Error(`Cannot reach ${url}. Start the local app first, for example: npm run dev -- --host 127.0.0.1 --port 5174`);
  }
}

async function saveVideo(page, context, id) {
  const video = page.video();
  await context.close();
  if (!video) return;
  await copyFile(await video.path(), path.join(outputDir, `${id}.webm`));
}

async function captureSetuClip(browser, clip) {
  const context = await browser.newContext({
    viewport: clip.viewport,
    isMobile: true,
    deviceScaleFactor: 2,
    recordVideo: {
      dir: tempDir,
      size: clip.viewport,
    },
  });

  await context.addInitScript((session) => {
    for (const [key, value] of Object.entries(session)) {
      window.localStorage.setItem(key, value);
    }
  }, setuSession);

  const page = await context.newPage();
  await page.goto(`${localBaseUrl}${clip.route}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await waitForSetuReady(page);
  await clip.run(page);
  await page.screenshot({ path: path.join(outputDir, `${clip.id}.png`), fullPage: false });
  await saveVideo(page, context, clip.id);
}

async function buildGovernmentStorageState(browser) {
  const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  const page = await context.newPage();
  await page.goto(`${governmentBaseUrl}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.getByRole('button', { name: /Continue to MFA/i }).click();
  await page.getByLabel(/MFA CODE/i).fill('123456');
  await page.getByRole('button', { name: /Enter dashboard/i }).click();
  await page.waitForURL('**/overview', { timeout: 30000 }).catch(() => {});
  await page.waitForLoadState('load', { timeout: 10000 }).catch(() => {});
  const storageState = await context.storageState();
  await context.close();
  return storageState;
}

async function captureGovernmentClip(browser, storageState, clip) {
  const context = await browser.newContext({
    viewport: { width: 1600, height: 1000 },
    deviceScaleFactor: 1,
    storageState,
    recordVideo: {
      dir: tempDir,
      size: { width: 1600, height: 1000 },
    },
  });

  const page = await context.newPage();
  await page.goto(`${governmentBaseUrl}${clip.route}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForLoadState('load', { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(clip.posterDelay || 1800);
  await page.screenshot({ path: path.join(outputDir, `${clip.id}.png`), fullPage: false });
  await clip.run(page);
  await saveVideo(page, context, clip.id);
}

async function main() {
  await mkdir(outputDir, { recursive: true });
  await mkdir(tempDir, { recursive: true });
  await ensureServer(`${localBaseUrl}/arrival`);

  const browser = await chromium.launch({ headless: true });
  try {
    for (const clip of setuClips) {
      console.log(`Capturing ${clip.id}`);
      await captureSetuClip(browser, clip);
    }

    console.log('Authenticating government dashboard demo');
    const governmentStorageState = await buildGovernmentStorageState(browser);

    for (const clip of governmentClips) {
      console.log(`Capturing ${clip.id}`);
      await captureGovernmentClip(browser, governmentStorageState, clip);
    }
  } finally {
    await browser.close();
  }

  console.log(`Pitch deck captures written to ${path.relative(rootDir, outputDir)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
