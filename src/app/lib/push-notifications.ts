import { PushNotifications, type PushNotificationSchema, type Token } from '@capacitor/push-notifications';
import { fetchRentalHistory, registerPushDevice, unregisterPushDevice } from './api';
import { getNativePlatform, isNativeShell } from './platform';
import { APP_CONFIG } from './app-config';
import { isApprovedHoodieShareUrl, resolveHoodieShareAppRouteFromPath } from './hoodie-share';

let listenersRegistered = false;
let registrationInFlight: Promise<boolean> | null = null;
let latestEmail = '';
let latestState = '';
let latestUniversity = '';
let latestSuburb = '';
let latestPermission = '';
let pushTapHandler: ((route: string) => void) | null = null;
const PENDING_PUSH_ROUTE_KEY = 'ghar_pending_push_route';
const KNOWN_INTERNAL_ROUTE_EXACT_PATHS = new Set([
  '/arrival',
  '/dashboard',
  '/delete-account',
  '/execution',
  '/fuel',
  '/household/expenses',
  '/legal',
  '/noticeboard',
  '/notifications',
  '/privacy',
  '/profile',
  '/setu',
  '/shopping',
  '/support',
  '/terms',
  '/triage',
  '/vibe',
]);
const KNOWN_INTERNAL_ROUTE_PREFIXES = [
  '/events/',
  '/guides/',
  '/guide/',
  '/invite/plan/',
  '/invite/private-plan/',
  '/legal/',
  '/plans/',
  '/share/',
  '/suburb/',
];
const TRUSTED_APP_LINK_HOSTS = [
  'ghar.knowwhatson.com',
  'china.knowwhatson.com',
  'suburb.knowwhatson.com',
  'malaysia.knowwhatson.com',
  'wolli.knowwhatson.com',
];
const TRUSTED_APP_URL_SCHEMES = [
  'com.ghar.mobile:',
  'com.setuchina.mobile:',
  'com.burbmate.app:',
  'com.setumalaysia.mobile:',
  'com.whereswolli.mobile:',
];

function isNativePushEnabled() {
  return true;
}

function getConfigHostname(value: unknown) {
  try {
    const url = new URL(String(value || '').trim());
    return url.hostname;
  } catch {
    return '';
  }
}

function getAppOwnedHosts() {
  return new Set([
    ...TRUSTED_APP_LINK_HOSTS,
    getConfigHostname(APP_CONFIG.shareBaseUrl),
    getConfigHostname(APP_CONFIG.inviteBaseUrl),
    getConfigHostname(APP_CONFIG.marketingUrl),
  ].filter(Boolean));
}

function getAppUrlSchemes() {
  const appScheme = `${String(APP_CONFIG.urlScheme || '').trim()}:`;
  return new Set([...TRUSTED_APP_URL_SCHEMES, appScheme].filter((scheme) => scheme.length > 1));
}

function isKnownInternalRoutePath(pathname: string) {
  const normalizedPath = normalizeInternalRoutePath(pathname);
  if (KNOWN_INTERNAL_ROUTE_EXACT_PATHS.has(normalizedPath)) return true;
  return KNOWN_INTERNAL_ROUTE_PREFIXES.some((prefix) => normalizedPath.startsWith(prefix));
}

function normalizeInternalRoutePath(pathname: string) {
  const withLeadingSlash = pathname.startsWith('/') ? pathname : `/${pathname.replace(/^\/+/, '')}`;
  return withLeadingSlash.length > 1 ? withLeadingSlash.replace(/\/+$/, '') : withLeadingSlash;
}

function buildKnownInternalRoute(pathname: string, search = '', hash = '') {
  const normalizedPath = normalizeInternalRoutePath(pathname);

  if (normalizedPath.startsWith('/share/')) {
    const mappedShareRoute = resolveHoodieShareAppRouteFromPath(normalizedPath);
    if (mappedShareRoute) return mappedShareRoute;
  }

  if (!isKnownInternalRoutePath(normalizedPath)) return '';
  return `${normalizedPath}${search || ''}${hash || ''}`;
}

export function normalizeIncomingRoute(rawRoute: unknown) {
  if (!rawRoute || typeof rawRoute !== 'string') return '';
  const trimmed = rawRoute.trim();
  if (!trimmed) return '';
  const lowerTrimmed = trimmed.toLowerCase();

  if (
    lowerTrimmed.startsWith('http://') ||
    lowerTrimmed.startsWith('https://') ||
    Array.from(getAppUrlSchemes()).some((scheme) => lowerTrimmed.startsWith(scheme))
  ) {
    try {
      const url = new URL(trimmed);
      if (getAppUrlSchemes().has(url.protocol)) {
        const host = url.hostname ? `/${url.hostname}` : '';
        const pathname = url.pathname === '/' ? '' : url.pathname || '';
        const internalPath = `${host}${pathname}` || '/dashboard';
        return buildKnownInternalRoute(internalPath, url.search, url.hash);
      }
      if (isApprovedHoodieShareUrl(url)) {
        const mappedShareRoute = resolveHoodieShareAppRouteFromPath(url.pathname);
        if (mappedShareRoute) return mappedShareRoute;
      }
      if (getAppOwnedHosts().has(url.hostname)) {
        return buildKnownInternalRoute(url.pathname || '/', url.search, url.hash);
      }
      return '';
    } catch {
      return '';
    }
  }

  const normalizedRelativeRoute = trimmed.startsWith('/') ? trimmed : `/${trimmed.replace(/^\/+/, '')}`;
  try {
    const url = new URL(normalizedRelativeRoute, 'https://app.local');
    return buildKnownInternalRoute(url.pathname || '/', url.search, url.hash);
  } catch {
    return '';
  }
}

export function readPushRoute(notification: any) {
  const candidates = [
    notification?.data?.route,
    notification?.data?.link,
    notification?.data?.deep_link,
    notification?.data?.deeplink,
    notification?.data?.path,
    notification?.data?.data?.route,
    notification?.data?.data?.link,
    notification?.route,
    notification?.link,
  ];

  for (const candidate of candidates) {
    const route = normalizeIncomingRoute(candidate);
    if (route) return route;
  }

  return '';
}

function emitPushRoute(notification: PushNotificationSchema | { data?: Record<string, any> }) {
  if (typeof window === 'undefined') return;
  const route = readPushRoute(notification);
  if (!route) return;
  try {
    localStorage.setItem(PENDING_PUSH_ROUTE_KEY, route);
  } catch {}
  console.log('GHAR push tap route:', route);
  pushTapHandler?.(route);
  const dispatchRoute = () => {
    window.dispatchEvent(new CustomEvent('ghar-open-route', { detail: { route } }));
  };
  dispatchRoute();
  window.setTimeout(dispatchRoute, 250);
  window.setTimeout(dispatchRoute, 1000);
}

export function consumePendingPushRoute() {
  if (typeof window === 'undefined') return '';
  try {
    const route = String(localStorage.getItem(PENDING_PUSH_ROUTE_KEY) || '').trim();
    if (route) {
      localStorage.removeItem(PENDING_PUSH_ROUTE_KEY);
    }
    return route;
  } catch {
    return '';
  }
}

export function setPushTapRouteHandler(handler: ((route: string) => void) | null) {
  pushTapHandler = handler;
}

function getDeviceName() {
  if (typeof navigator === 'undefined') return getNativePlatform();
  return String((navigator as any).userAgentData?.platform || navigator.platform || navigator.userAgent || getNativePlatform()).trim();
}

function getDeviceModel() {
  if (typeof navigator === 'undefined') return getNativePlatform();
  return String(navigator.userAgent || navigator.platform || getNativePlatform()).trim();
}

function getAppVersion() {
  return String(import.meta.env.VITE_APP_VERSION || '').trim();
}

function getPushCacheKey() {
  return `ghar_push_token_${APP_VARIANT}_${getNativePlatform()}`;
}

function getPushSyncKey() {
  return `ghar_push_sync_${APP_VARIANT}_${getNativePlatform()}`;
}

function getPushSuburbKey() {
  return `ghar_push_suburb_${APP_VARIANT}_${getNativePlatform()}`;
}

async function resolveSuburb(email: string) {
  if (latestSuburb) return latestSuburb;
  const cachedSuburb = String(localStorage.getItem(getPushSuburbKey()) || '').trim();
  if (cachedSuburb) {
    latestSuburb = cachedSuburb;
    return cachedSuburb;
  }
  try {
    const rentals = await fetchRentalHistory(email);
    const current = Array.isArray(rentals)
      ? rentals.find((entry: any) => String(entry?.is_current || '').toLowerCase() === 'true' && String(entry?.suburb || '').trim()) ||
        rentals.find((entry: any) => String(entry?.suburb || '').trim())
      : null;
    latestSuburb = String(current?.suburb || '').trim();
    if (latestSuburb) {
      localStorage.setItem(getPushSuburbKey(), latestSuburb);
    }
    return latestSuburb;
  } catch (err) {
    console.warn('GHAR push suburb lookup failed:', err);
    return latestSuburb;
  }
}

async function syncToken(token: Token, force = false) {
  const email = latestEmail.trim().toLowerCase();
  if (!email) return;

  const currentToken = String(token.value || '').trim();
  if (!currentToken) return;

  const cacheKey = getPushCacheKey();
  const syncKey = getPushSyncKey();
  const nextContext = {
    email,
    token: currentToken,
    platform: getNativePlatform(),
    permission: latestPermission,
    app_version: getAppVersion(),
    device_name: getDeviceName(),
    device_model: getDeviceModel(),
    state: latestState,
    university: latestUniversity,
    suburb: await resolveSuburb(email),
    app_variant: APP_VARIANT,
    app_identifier: APP_CONFIG.urlScheme,
    app_display_name: APP_CONFIG.displayName,
  };
  const previous = localStorage.getItem(cacheKey);
  const previousSync = localStorage.getItem(syncKey);
  const nextSync = JSON.stringify(nextContext);
  if (!force && previous === currentToken && previousSync === nextSync) return;

  console.log('GHAR push token:', currentToken);
  await registerPushDevice(nextContext);
  localStorage.setItem(cacheKey, currentToken);
  localStorage.setItem(syncKey, nextSync);
}

function registerListeners() {
  if (listenersRegistered) return;
  listenersRegistered = true;

  void PushNotifications.addListener('registration', (token) => {
    void syncToken(token, true).catch((err) => {
      console.error('GHAR push token sync failed:', err);
    });
  });

  void PushNotifications.addListener('registrationError', (error) => {
    console.error('GHAR push registration error:', error);
  });

  void PushNotifications.addListener('pushNotificationReceived', (notification) => {
    console.log('GHAR push received:', notification);
  });

  void PushNotifications.addListener('pushNotificationActionPerformed', (event) => {
    emitPushRoute(event.notification);
  });
}

export function initializePushNotifications() {
  if (!isNativeShell()) return;
  registerListeners();
}

export async function ensurePushNotificationsRegistered(email: string) {
  if (!isNativeShell()) return false;
  if (!isNativePushEnabled()) return false;

  const normalizedEmail = email.trim().toLowerCase();
  if (normalizedEmail !== latestEmail) {
    latestState = '';
    latestUniversity = '';
    latestSuburb = '';
    latestPermission = '';
  }

  latestEmail = normalizedEmail;
  if (!latestEmail) return false;

  if (registrationInFlight) return registrationInFlight;

  registrationInFlight = (async () => {
    registerListeners();

    const permission = await PushNotifications.checkPermissions();
    latestPermission = permission.receive;
    if (permission.receive !== 'granted') {
      const requested = await PushNotifications.requestPermissions();
      latestPermission = requested.receive;
      if (requested.receive !== 'granted') {
        const existingToken = localStorage.getItem(getPushCacheKey()) || '';
        if (existingToken) {
          try {
            await unregisterPushDevice({ email: latestEmail, token: existingToken });
          } catch (err) {
            console.error('GHAR push unregister after denied permission error:', err);
          }
        }
        localStorage.removeItem(getPushCacheKey());
        localStorage.removeItem(getPushSyncKey());
        localStorage.removeItem(getPushSuburbKey());
        return false;
      }
    }

    latestState = String(localStorage.getItem('ghar_au_state') || '').trim();
    latestUniversity = String(localStorage.getItem('ghar_university') || '').trim();

    const cacheKey = getPushCacheKey();
    const cachedToken = String(localStorage.getItem(cacheKey) || '').trim();
    if (cachedToken) {
      await syncToken({ value: cachedToken } as Token, true);
    }

    await PushNotifications.register();
    return true;
  })();

  try {
    return await registrationInFlight;
  } finally {
    registrationInFlight = null;
  }
}

export async function clearPushRegistration(email?: string) {
  if (!isNativeShell()) return false;

  const resolvedEmail = String(email || latestEmail || '').trim().toLowerCase();
  const cacheKey = getPushCacheKey();
  const syncKey = getPushSyncKey();
  const token = String(localStorage.getItem(cacheKey) || '').trim();

  if (token) {
    try {
      await unregisterPushDevice({ email: resolvedEmail, token });
    } catch (err) {
      console.error('GHAR push unregister error:', err);
    }
  }

  localStorage.removeItem(cacheKey);
  localStorage.removeItem(syncKey);
  localStorage.removeItem(getPushSuburbKey());
  latestEmail = '';
  latestState = '';
  latestUniversity = '';
  latestSuburb = '';
  latestPermission = '';
  return true;
}
