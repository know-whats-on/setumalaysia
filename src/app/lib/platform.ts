declare global {
  interface Window {
    Capacitor?: {
      isNativePlatform?: () => boolean;
      getPlatform?: () => string;
    };
  }
}

function getCapacitor() {
  if (typeof window === 'undefined') return null;
  return window.Capacitor ?? null;
}

export function isNativeShell() {
  const capacitor = getCapacitor();
  return Boolean(capacitor?.isNativePlatform?.());
}

export function getNativePlatform() {
  if (!isNativeShell()) return 'web';
  return getCapacitor()?.getPlatform?.() ?? 'native';
}
