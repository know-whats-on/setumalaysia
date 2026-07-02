const NATIVE_OPEN_ROUTE_KEY = 'ghar_native_open_route';

export function rememberNativeOpenRoute(route: string) {
  try {
    sessionStorage.setItem(NATIVE_OPEN_ROUTE_KEY, route);
  } catch {
    // Session storage can be unavailable in restricted webviews.
  }
}

export function clearNativeOpenRoute() {
  try {
    sessionStorage.removeItem(NATIVE_OPEN_ROUTE_KEY);
  } catch {
    // Session storage can be unavailable in restricted webviews.
  }
}

export function consumeNativeOpenRouteIfCurrent(route: string) {
  try {
    if (sessionStorage.getItem(NATIVE_OPEN_ROUTE_KEY) !== route) return false;
    sessionStorage.removeItem(NATIVE_OPEN_ROUTE_KEY);
    return true;
  } catch {
    return false;
  }
}

export function isExternalRouteSource(value: string | null | undefined) {
  const cleanValue = String(value || '').trim().toLowerCase();
  return cleanValue === 'imessage' || cleanValue === 'push';
}
