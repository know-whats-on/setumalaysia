import process from 'node:process';

const appVariant = normalizeAppVariant(process.env.APP_VARIANT);
const defaultBaseUrl =
  appVariant === 'ghar'
    ? 'https://ghar.knowwhatson.com'
    : appVariant === 'setu_china'
      ? 'https://china.knowwhatson.com'
      : appVariant === 'jom_settle'
        ? 'https://malaysia.knowwhatson.com'
        : 'https://suburb.knowwhatson.com';
const baseUrl = normalizeBaseUrl(
  process.env.HOODIE_LINK_BASE_URL || process.argv[2] || defaultBaseUrl,
);
const isProductionDomain = ['suburb.knowwhatson.com', 'china.knowwhatson.com', 'malaysia.knowwhatson.com'].includes(new URL(baseUrl).hostname);
const isLocalBaseUrl = ['localhost', '127.0.0.1', '::1'].includes(new URL(baseUrl).hostname);
const smokeLabel =
  appVariant === 'ghar'
    ? 'SETU link smoke'
    : appVariant === 'setu_china'
      ? 'SETU China link smoke'
      : appVariant === 'jom_settle'
        ? 'Senang AU link smoke'
        : 'Hoodie link smoke';
const expectedAppTitle =
  appVariant === 'ghar'
    ? 'SETU India AU — Student Housing Safety'
    : appVariant === 'setu_china'
      ? '留澳助手 AU — Chinese Student Life in Australia'
      : appVariant === 'jom_settle'
        ? 'Senang AU — Kehidupan Pelajar Malaysia di Australia'
        : 'Hoodie - Your Australia Suburb Mate';
const expectedAppleAppId =
  appVariant === 'ghar'
    ? 'DRNJ459F42.com.ghar.mobile'
    : appVariant === 'setu_china'
      ? 'DRNJ459F42.com.setuchina.mobile'
      : appVariant === 'jom_settle'
        ? 'DRNJ459F42.com.setumalaysia.mobile'
        : 'DRNJ459F42.com.burbmate.app';
const expectedAndroidPackage =
  appVariant === 'ghar'
    ? 'com.ghar.mobile'
    : appVariant === 'setu_china'
      ? 'com.setuchina.mobile'
      : appVariant === 'jom_settle'
        ? 'com.setumalaysia.mobile'
        : 'com.burbmate.app';

const appShellPaths = [
  '/share/guide/sydney/sydneys-10-best-historical-places',
  '/share/guide/melbourne/10-best-hidden-bars-in-melbourne',
  '/share/event/cityofsydney/laneway-festival',
  '/share/plan/cityofsydney/laneway-festival/plan-42',
  '/invite/plan/cityofsydney/laneway-festival/plan-42',
  '/invite/private-plan/private-plan-42',
  '/share/suburb/haymarket',
  '/share/address-check',
  '/share/scam-check',
  '/share/household-invite/smoke-token',
  '/events/cityofsydney/laneway-festival',
  '/guides/free-electricity-australia-2026',
  '/guide/melbourne/10-best-hidden-bars-in-melbourne',
  '/suburb/haymarket',
  '/household/expenses',
  '/vibe',
  '/arrival',
  '/profile',
  '/notifications',
];

if (appVariant === 'ghar') {
  appShellPaths.push('/plans/private-plan-42');
}

const associationChecks = [
  {
    label: 'iOS app association',
    path: '/apple-app-site-association',
    validate: (payload) => {
      return hasExpectedAppleAssociation(payload);
    },
  },
  {
    label: 'iOS well-known association',
    path: '/.well-known/apple-app-site-association',
    validate: (payload) => {
      return hasExpectedAppleAssociation(payload);
    },
  },
  {
    label: 'Android asset links',
    path: '/.well-known/assetlinks.json',
    validate: (payload) =>
      Array.isArray(payload) &&
      payload.some((entry) => entry?.target?.package_name === expectedAndroidPackage),
  },
];

let failures = 0;

for (const path of appShellPaths) {
  await checkAppShell(path);
}

for (const check of associationChecks) {
  await checkAssociationFile(check);
}

await checkLandingPage();

if (failures > 0) {
  console.error(`FAIL  ${smokeLabel} failed with ${failures} issue${failures === 1 ? '' : 's'}.`);
  process.exitCode = 1;
} else {
  console.log(`PASS  ${smokeLabel} passed for ${baseUrl}`);
}

function normalizeAppVariant(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'burb_mate' || normalized === 'burb-mate' || normalized === 'burbmate') return 'burb_mate';
  if (normalized === 'setu_china' || normalized === 'setu-china' || normalized === 'setuchina' || normalized === 'china') return 'setu_china';
  if (normalized === 'jom_settle' || normalized === 'jom-settle' || normalized === 'jomsettle' || normalized === 'malaysia') return 'jom_settle';
  return 'ghar';
}

function normalizeBaseUrl(value) {
  const url = new URL(String(value || defaultBaseUrl).trim());
  url.pathname = url.pathname.replace(/\/+$/, '');
  url.search = '';
  url.hash = '';
  return url.toString().replace(/\/$/, '');
}

function buildUrl(path) {
  return new URL(path, `${baseUrl}/`).toString();
}

async function fetchWithText(path) {
  const res = await fetch(buildUrl(path), {
    headers: {
      Accept: 'text/html,application/json;q=0.9,*/*;q=0.8',
    },
  });
  const text = await res.text();
  return { res, text };
}

async function checkAppShell(path) {
  try {
    const { res, text } = await fetchWithText(path);
    const poweredBy = res.headers.get('x-powered-by') || '';
    const matchedPath = res.headers.get('x-matched-path') || '';
    const isViteShell =
      res.ok &&
      /<div id="root"><\/div>/.test(text) &&
      text.includes(expectedAppTitle) &&
      !/Next\.js/i.test(poweredBy) &&
      matchedPath !== '/[...slug]';

    if (isViteShell) {
      console.log(`PASS  App shell ${path} [${res.status}]`);
      return;
    }

    failures += 1;
    console.error(
      `FAIL  App shell ${path} [${res.status}] matched=${matchedPath || 'n/a'} powered=${poweredBy || 'n/a'}`,
    );
  } catch (error) {
    failures += 1;
    console.error(`FAIL  App shell ${path}`, error);
  }
}

async function checkAssociationFile(check) {
  try {
    const { res, text } = await fetchWithText(check.path);
    const contentType = res.headers.get('content-type') || '';
    let payload = null;
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }

    const hasJsonContentType = contentType.includes('application/json') || (isLocalBaseUrl && payload);
    if (res.ok && hasJsonContentType && check.validate(payload)) {
      console.log(`PASS  ${check.label} ${check.path} [${res.status}]`);
      return;
    }

    failures += 1;
    console.error(
      `FAIL  ${check.label} ${check.path} [${res.status}] content-type=${contentType || 'n/a'}`,
    );
  } catch (error) {
    failures += 1;
    console.error(`FAIL  ${check.label} ${check.path}`, error);
  }
}

function hasExpectedAppleAssociation(payload) {
  const details = payload?.applinks?.details || [];
  const requiredPaths = appVariant === 'ghar' ? ['/share/*', '/plans/*', '/guides/*'] : ['/share/*', '/guides/*'];
  return details.some((entry) => {
    const paths = entry?.paths || [];
    return (
      entry?.appID === expectedAppleAppId &&
      requiredPaths.every((path) => paths.includes(path))
    );
  });
}

async function checkLandingPage() {
  try {
    const { res, text } = await fetchWithText('/');
    if (!res.ok) {
      failures += 1;
      console.error(`FAIL  Landing page / [${res.status}]`);
      return;
    }

    if (appVariant === 'ghar') {
      const isSetuShell =
        /<div id="root"><\/div>/.test(text) &&
        text.includes(expectedAppTitle);
      if (isSetuShell) {
        console.log(`PASS  SETU app shell landing page / [${res.status}]`);
        return;
      }

      failures += 1;
      console.error('FAIL  SETU landing page / did not return app shell');
      return;
    }

    if (!isProductionDomain) {
      console.log(`PASS  Landing page / [${res.status}]`);
      return;
    }

    if (appVariant === 'jom_settle') {
      const isSenangShell =
        /<div id="root"><\/div>/.test(text) &&
        text.includes(expectedAppTitle);
      if (isSenangShell) {
        console.log(`PASS  Senang AU app shell landing page / [${res.status}]`);
        return;
      }

      failures += 1;
      console.error('FAIL  Senang AU landing page / did not return app shell');
      return;
    }

    if (text.includes('Burb Mate | Arrive with local context')) {
      console.log(`PASS  Burb Mate landing page / [${res.status}]`);
      return;
    }

    failures += 1;
    console.error('FAIL  Burb Mate landing page / did not contain expected title');
  } catch (error) {
    failures += 1;
    console.error('FAIL  Landing page /', error);
  }
}
