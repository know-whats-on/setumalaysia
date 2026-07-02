import { Geolocation } from '@capacitor/geolocation';
import { isNativeShell } from './platform';

export const GEO_ERROR_CODES = {
  PERMISSION_DENIED: 1,
  POSITION_UNAVAILABLE: 2,
  TIMEOUT: 3,
} as const;

export interface AppGeolocationError extends Error {
  code: number;
}

export interface AppGeolocationPosition {
  coords: {
    latitude: number;
    longitude: number;
    accuracy?: number | null;
  };
}

interface AppGeolocationOptions {
  timeout?: number;
  maximumAge?: number;
  enableHighAccuracy?: boolean;
}

function createGeoError(message: string, code: number): AppGeolocationError {
  const error = new Error(message) as AppGeolocationError;
  error.code = code;
  return error;
}

function normalizeGeoError(error: unknown): AppGeolocationError {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as { code?: unknown }).code === 'number'
  ) {
    const source = error as { code: number; message?: string };
    return createGeoError(source.message || 'Location unavailable', source.code);
  }

  const message = error instanceof Error ? error.message : 'Location unavailable';
  const lower = message.toLowerCase();

  if (lower.includes('permission') || lower.includes('denied')) {
    return createGeoError(message, GEO_ERROR_CODES.PERMISSION_DENIED);
  }
  if (lower.includes('timeout')) {
    return createGeoError(message, GEO_ERROR_CODES.TIMEOUT);
  }

  return createGeoError(message, GEO_ERROR_CODES.POSITION_UNAVAILABLE);
}

async function getNativePosition(options: AppGeolocationOptions): Promise<AppGeolocationPosition> {
  const permissionStatus = await Geolocation.checkPermissions();
  const locationState = permissionStatus.location;

  if (locationState === 'denied') {
    throw createGeoError('Location permission denied', GEO_ERROR_CODES.PERMISSION_DENIED);
  }

  if (locationState === 'prompt' || locationState === 'prompt-with-rationale') {
    const requested = await Geolocation.requestPermissions();
    if (requested.location !== 'granted') {
      throw createGeoError('Location permission denied', GEO_ERROR_CODES.PERMISSION_DENIED);
    }
  }

  try {
    const position = await Geolocation.getCurrentPosition({
      timeout: options.timeout,
      maximumAge: options.maximumAge,
      enableHighAccuracy: options.enableHighAccuracy ?? true,
    });

    return {
      coords: {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      },
    };
  } catch (error) {
    throw normalizeGeoError(error);
  }
}

async function getBrowserPosition(options: AppGeolocationOptions): Promise<AppGeolocationPosition> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    throw createGeoError('Geolocation unavailable', GEO_ERROR_CODES.POSITION_UNAVAILABLE);
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          coords: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          },
        });
      },
      (error) => reject(normalizeGeoError(error)),
      options,
    );
  });
}

export async function getCurrentAppPosition(
  options: AppGeolocationOptions = {},
): Promise<AppGeolocationPosition> {
  if (isNativeShell()) {
    return getNativePosition(options);
  }

  return getBrowserPosition(options);
}
