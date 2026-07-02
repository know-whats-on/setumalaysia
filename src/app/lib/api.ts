import { CapacitorHttp } from '@capacitor/core';
import { gunzipSync } from 'fflate';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import initSqlJs from 'sql.js';
import { isNativeShell } from './platform';
import { APP_CONFIG } from './app-config';
import { APP_VARIANT, type AppVariant, type TargetableAppVariant, normalizeTargetableVariant } from './app-variant';
import { optimizeCityGuideCoverImageUrl, optimizeCityGuidePlaceImageUrl } from './city-guide-images';
import {
  countMatchingCuratedSydneyEvents,
  getCuratedSydneyOfficialEvent,
  isCuratedSydneyEventSource,
  mergeCuratedSydneyOfficialEvents,
} from './curated-sydney-events';
import { sanitizeOfficialEventsPayload } from './official-events-feed';
import type {
  ApplicationKitDraft,
  NswRentCheckCreatePayload,
  NswRentCheckSavedRecord,
  ScamCheckAiReport,
  ScamCheckDraft,
  ScamCheckResult,
} from './prepare-types';
import type {
  PrPointsAnswers,
  PrPointsCalculationResult,
  PrPointsSchema,
} from './pr-points-calculator';
import {
  normalizePrPointsCalculationResult,
  normalizePrPointsSchema,
} from './pr-points-calculator';
import type {
  FetchSkilledOccupationsInput,
  SkilledOccupationsResult,
} from './occupations';
import { normalizeSkilledOccupationsResult } from './occupations';
import { normalizeApplicationKitDraft } from './application-kit';
import type {
  HouseholdBillContact,
  HouseholdBillParticipantType,
  HouseholdCadence,
  HouseholdCreateResponse,
  HouseholdDashboardResponse,
  HouseholdExpenseGoals,
  HouseholdExpenseInsights,
  HouseholdExpenseReportData,
  HouseholdInvite,
  HouseholdMediaAttachment,
  HouseholdNotificationTemplateType,
  HouseholdRecord,
  HouseholdRulesAcknowledgement,
  HouseholdRulesAcknowledgementInput,
  HouseholdRulesDraft,
  HouseholdRulesState,
  HouseholdRulesVersion,
  HouseholdSplitType,
} from './household';
import { normalizeScamCheckDraft } from './scam-checker';
import { normalizeNswRentCheckRecord } from './nsw-rent-check';
import type {
  SuburbShareEnrichmentRequest,
  SuburbShareEnrichmentResponse,
} from './suburb-share-enrichment';

const BASE = `https://${projectId}.supabase.co/functions/v1/make-server-1d591b90`;
const MIRRORED_SERVER_BASE = `https://${projectId}.supabase.co/functions/v1/server/make-server-1d591b90`;
export const HOODIE_SPONSOR_COMPANIES_OFFICIAL_PDF_URL = 'https://www.homeaffairs.gov.au/foi/files/2025/fa-250101229-document-released.PDF';
export const HOODIE_SPONSOR_COMPANIES_PDF_FILE_NAME = 'home-affairs-sponsor-companies-list.pdf';
const ACT_TRANSPORT_BASE = (import.meta.env.VITE_ACT_TRANSPORT_BASE || '').trim().replace(/\/$/, '');
const ACT_TRANSPORT_ANON_KEY = (import.meta.env.VITE_ACT_TRANSPORT_ANON_KEY || publicAnonKey).trim();
const TRANSLINK_BASE = 'https://jp.translink.com.au';
const TRANSLINK_REFERER = `${TRANSLINK_BASE}/plan-your-journey/journey-planner`;
const SOUTH_AUSTRALIA_SQL_JS_VERSION = '1.14.1';
const SOUTH_AUSTRALIA_ROUTE_SEARCH_WINDOW_SECONDS = 4 * 60 * 60;
const SOUTH_AUSTRALIA_DEFAULT_TRANSFER_BUFFER_SECONDS = 5 * 60;
const SOUTH_AUSTRALIA_DEFAULT_PLATFORM_TRANSFER_SECONDS = 3 * 60;
const SOUTH_AUSTRALIA_COORD_ORIGIN_FETCH_LIMIT = 20;
const SOUTH_AUSTRALIA_COORD_DESTINATION_FETCH_LIMIT = 48;
const SOUTH_AUSTRALIA_COORD_ORIGIN_MAX_WALK_KM = 0.75;
const SOUTH_AUSTRALIA_COORD_DESTINATION_MAX_WALK_KM = 1.6;
const SOUTH_AUSTRALIA_COORD_ORIGIN_RESULT_LIMIT = 12;
const SOUTH_AUSTRALIA_COORD_DESTINATION_RESULT_LIMIT = 28;
const SOUTH_AUSTRALIA_CACHE_DB_NAME = 'ghar-transport-sa-cache';
const SOUTH_AUSTRALIA_CACHE_DB_VERSION = 1;
const SOUTH_AUSTRALIA_CACHE_PARTS_STORE = 'parts';
const REVIEWER_EMAIL = (import.meta.env.VITE_REVIEWER_EMAIL || '').trim().toLowerCase();
const REVIEWER_OTP = (import.meta.env.VITE_REVIEWER_OTP || '').trim();
const DELETE_DEMO_EMAIL = 'delete-demo@ghar.app';
const DELETE_DEMO_OTP = 'DEL123';

export interface ApplicationLetterDraftResponse {
  letter: string;
  letter_template: string;
  generated_at: string;
  source_signature: string;
}

type SouthAustraliaCacheManifest = {
  provider: 'transport_sa';
  cacheKey: string;
  expiresInSeconds: number;
  partUrls: string[];
};

type SouthAustraliaDbDriver = {
  cacheKey: string;
  all: (sql: string, params?: unknown[]) => any[];
  get: (sql: string, params?: unknown[]) => any | null;
};

let southAustraliaSqlJsPromise: Promise<any> | null = null;
let southAustraliaDbPromise: Promise<SouthAustraliaDbDriver> | null = null;

function supportsSouthAustraliaIndexedDb() {
  return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
}

function openSouthAustraliaCacheDb(): Promise<IDBDatabase> {
  if (!supportsSouthAustraliaIndexedDb()) {
    return Promise.reject(new Error('IndexedDB is unavailable.'));
  }
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(SOUTH_AUSTRALIA_CACHE_DB_NAME, SOUTH_AUSTRALIA_CACHE_DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(SOUTH_AUSTRALIA_CACHE_PARTS_STORE)) {
        database.createObjectStore(SOUTH_AUSTRALIA_CACHE_PARTS_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open Adelaide Metro cache.'));
  });
}

function readSouthAustraliaCachedParts(cacheKey: string, partCount: number): Promise<Uint8Array[] | null> {
  if (!supportsSouthAustraliaIndexedDb()) return Promise.resolve(null);
  return openSouthAustraliaCacheDb()
    .then((database) =>
      new Promise<Uint8Array[] | null>((resolve, reject) => {
        const transaction = database.transaction(SOUTH_AUSTRALIA_CACHE_PARTS_STORE, 'readonly');
        const store = transaction.objectStore(SOUTH_AUSTRALIA_CACHE_PARTS_STORE);
        const requests = Array.from({ length: partCount }, (_value, index) => {
          const request = store.get(`${cacheKey}:${index + 1}`);
          return new Promise<ArrayBuffer | null>((partResolve, partReject) => {
            request.onsuccess = () => partResolve((request.result as ArrayBuffer | null) || null);
            request.onerror = () => partReject(request.error || new Error('Failed to read Adelaide Metro cache part.'));
          });
        });
        Promise.all(requests)
          .then((parts) => {
            database.close();
            if (parts.some((part) => !(part instanceof ArrayBuffer))) {
              resolve(null);
              return;
            }
            resolve(parts.map((part) => new Uint8Array(part as ArrayBuffer)));
          })
          .catch((error) => {
            database.close();
            reject(error);
          });
      }),
    )
    .catch(() => null);
}

function persistSouthAustraliaCachedParts(cacheKey: string, parts: Uint8Array[]) {
  if (!supportsSouthAustraliaIndexedDb()) return Promise.resolve();
  return openSouthAustraliaCacheDb()
    .then((database) =>
      new Promise<void>((resolve, reject) => {
        const transaction = database.transaction(SOUTH_AUSTRALIA_CACHE_PARTS_STORE, 'readwrite');
        const store = transaction.objectStore(SOUTH_AUSTRALIA_CACHE_PARTS_STORE);
        for (let index = 0; index < parts.length; index += 1) {
          store.put(parts[index].buffer.slice(0), `${cacheKey}:${index + 1}`);
        }
        transaction.oncomplete = () => {
          database.close();
          resolve();
        };
        transaction.onerror = () => {
          database.close();
          reject(transaction.error || new Error('Failed to store Adelaide Metro cache.'));
        };
      }),
    )
    .catch(() => undefined);
}

const reviewerBypassAccounts = [
  ...(REVIEWER_EMAIL && REVIEWER_OTP ? [{ email: REVIEWER_EMAIL, code: REVIEWER_OTP }] : []),
  { email: DELETE_DEMO_EMAIL, code: DELETE_DEMO_OTP },
];

function buildAuthHeaders(options?: { includeContentType?: boolean }) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${publicAnonKey}`,
  };

  if (options?.includeContentType !== false) {
    headers['Content-Type'] = 'application/json';
  }

  // Supabase CORS for these functions allows Authorization but rejects apikey on browser preflight.
  if (isNativeShell()) {
    headers.apikey = publicAnonKey;
  }

  return headers;
}

const headers = () => ({
  ...buildAuthHeaders(),
});

const authHeaders = () => ({
  ...buildAuthHeaders({ includeContentType: false }),
});

export function isReviewerAccessConfigured() {
  return reviewerBypassAccounts.length > 0;
}

export function isReviewerBypassEmail(email: string) {
  const cleanEmail = email.trim().toLowerCase();
  return reviewerBypassAccounts.some((account) => account.email === cleanEmail);
}

function getReviewerBypassCode(email: string) {
  const cleanEmail = email.trim().toLowerCase();
  return reviewerBypassAccounts.find((account) => account.email === cleanEmail)?.code || null;
}

async function readJsonResponse(res: Response) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function getBillServiceErrorMessage(
  payload: Record<string, unknown>,
  status: number,
  fallback: string,
) {
  const raw = String(payload.raw || '').trim();
  const message = String(payload.error || payload.message || '').trim();

  if (message) return message;
  if (status === 404 && /^not found$/i.test(raw)) {
    return 'Hoodie needs the latest bill service before adding friends. Please update the backend service and try again.';
  }
  if (raw) return raw;
  return fallback;
}

function getHouseRulesServiceErrorMessage(payload: Record<string, unknown>, fallback: string) {
  const message = String(payload.error || payload.message || payload.raw || '').trim();
  if (message) return message.replace(/^Failed to respond to household invite:\s*Error:\s*/i, '');
  return fallback;
}

function normalizeNativeJsonPayload(payload: unknown) {
  if (typeof payload === 'string') {
    try {
      return JSON.parse(payload);
    } catch {
      return { raw: payload };
    }
  }
  if (payload && typeof payload === 'object') return payload as Record<string, unknown>;
  return {};
}

type InternalFunctionTarget = 'primary' | 'mirror';

type ApiFetchOptions = {
  allow404?: boolean;
  timeoutMs?: number;
  useMirror?: boolean;
  responseType?: 'json' | 'text' | 'arraybuffer';
};

const INTERNAL_FUNCTION_BASES: Record<InternalFunctionTarget, string> = {
  primary: BASE,
  mirror: MIRRORED_SERVER_BASE,
};

const MIRROR_BOOT_ERROR_COOLDOWN_MS = 5 * 60 * 1000;
let mirrorSkipUntil = 0;

function createAbortError() {
  if (typeof DOMException !== 'undefined') {
    return new DOMException('The operation was aborted.', 'AbortError');
  }
  const error = new Error('The operation was aborted.') as Error & { name: string };
  error.name = 'AbortError';
  return error;
}

function isAbortError(error: unknown) {
  return Boolean(error && typeof error === 'object' && 'name' in error && (error as { name?: string }).name === 'AbortError');
}

function makeNativeRequestAbortable<T>(promise: Promise<T>, signal?: AbortSignal) {
  if (!signal) return promise;
  if (signal.aborted) return Promise.reject(createAbortError());

  return new Promise<T>((resolve, reject) => {
    const handleAbort = () => reject(createAbortError());

    signal.addEventListener('abort', handleAbort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener('abort', handleAbort);
        resolve(value);
      },
      (error) => {
        signal.removeEventListener('abort', handleAbort);
        reject(error);
      },
    );
  });
}

function buildInternalFunctionUrl(pathOrUrl: string, target: InternalFunctionTarget) {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const normalizedPath = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
  return `${INTERNAL_FUNCTION_BASES[target]}${normalizedPath}`;
}

function getInternalFunctionTargets(pathOrUrl: string, useMirror: boolean, method: string) {
  const targets: InternalFunctionTarget[] = ['primary'];
  if (
    useMirror &&
    /^(GET|HEAD)$/i.test(method) &&
    Date.now() >= mirrorSkipUntil &&
    !/^https?:\/\//i.test(pathOrUrl)
  ) {
    targets.push('mirror');
  }
  return targets;
}

function shouldSkipNativeTransport(init: RequestInit, options: ApiFetchOptions) {
  if (!isNativeShell()) return true;
  if (options.responseType === 'arraybuffer') return true;

  const body = init.body;
  if (!body) return false;

  if (typeof FormData !== 'undefined' && body instanceof FormData) return true;
  if (typeof Blob !== 'undefined' && body instanceof Blob) return true;
  if (typeof URLSearchParams !== 'undefined' && body instanceof URLSearchParams) return true;
  if (typeof ArrayBuffer !== 'undefined' && body instanceof ArrayBuffer) return true;
  if (ArrayBuffer.isView(body)) return true;
  if (typeof ReadableStream !== 'undefined' && body instanceof ReadableStream) return true;

  return false;
}

function normalizeHeadersRecord(headersInit?: HeadersInit) {
  const normalized: Record<string, string> = {};
  if (!headersInit) return normalized;

  const appendHeader = (key: string, value: string) => {
    normalized[key] = value;
  };

  if (headersInit instanceof Headers) {
    headersInit.forEach((value, key) => appendHeader(key, value));
    return normalized;
  }

  if (Array.isArray(headersInit)) {
    headersInit.forEach(([key, value]) => appendHeader(key, value));
    return normalized;
  }

  Object.entries(headersInit).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      appendHeader(key, value.join(', '));
      return;
    }
    if (value !== undefined) {
      appendHeader(key, String(value));
    }
  });

  return normalized;
}

function getNativeRequestData(init: RequestInit, headerRecord: Record<string, string>) {
  const body = init.body;
  if (body == null) return undefined;
  if (typeof body === 'string') {
    const contentType = Object.entries(headerRecord).find(([key]) => key.toLowerCase() === 'content-type')?.[1] || '';
    if (contentType.toLowerCase().includes('application/json')) {
      try {
        return JSON.parse(body);
      } catch {
        return body;
      }
    }
    return body;
  }
  return body;
}

function markMirrorBootError(payload: unknown, status?: number) {
  const message = extractCityGuidesErrorMessage(payload, status).toLowerCase();
  if (message.includes('boot_error') || message.includes('function failed to start')) {
    mirrorSkipUntil = Date.now() + MIRROR_BOOT_ERROR_COOLDOWN_MS;
  }
}

async function nativeRequestAsResponse(url: string, init: RequestInit, options: ApiFetchOptions) {
  const headerRecord = normalizeHeadersRecord(init.headers);
  const response = await CapacitorHttp.request({
    url,
    method: String(init.method || 'GET').toUpperCase(),
    headers: headerRecord,
    data: getNativeRequestData(init, headerRecord),
    responseType: options.responseType === 'arraybuffer' ? 'arraybuffer' : 'text',
    connectTimeout: options.timeoutMs ?? 15000,
    readTimeout: options.timeoutMs ?? 15000,
  });

  const responseHeaders = new Headers();
  Object.entries((response.headers || {}) as Record<string, string>).forEach(([key, value]) => {
    if (value !== undefined) responseHeaders.set(key, String(value));
  });

  let body: BodyInit | null = null;
  if (options.responseType === 'arraybuffer') {
    if (typeof response.data === 'string') {
      body = base64ToUint8Array(response.data);
    } else if (response.data instanceof ArrayBuffer) {
      body = response.data;
    } else if (Array.isArray(response.data)) {
      body = new Uint8Array(response.data);
    }
  } else if (typeof response.data === 'string') {
    body = response.data;
  } else if (response.data != null) {
    body = JSON.stringify(response.data);
    if (!responseHeaders.has('content-type')) {
      responseHeaders.set('content-type', 'application/json');
    }
  }

  return new Response(body, {
    status: response.status,
    headers: responseHeaders,
  });
}

function mergeAbortSignals(signal?: AbortSignal, fallbackSignal?: AbortSignal) {
  if (!signal) return fallbackSignal;
  if (!fallbackSignal) return signal;

  const controller = new AbortController();
  const abort = () => controller.abort();

  if (signal.aborted || fallbackSignal.aborted) {
    controller.abort();
    return controller.signal;
  }

  signal.addEventListener('abort', abort, { once: true });
  fallbackSignal.addEventListener('abort', abort, { once: true });
  return controller.signal;
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), timeoutMs);
  const signal = mergeAbortSignals(init.signal, controller.signal);

  try {
    return await fetch(url, {
      ...init,
      signal,
    });
  } finally {
    globalThis.clearTimeout(timeout);
  }
}

async function apiFetch(pathOrUrl: string, init: RequestInit = {}, options: ApiFetchOptions = {}) {
  const method = String(init.method || 'GET').toUpperCase();
  const targets = getInternalFunctionTargets(pathOrUrl, options.useMirror ?? true, method);
  let lastError: Error | null = null;
  let sawNotFound = false;

  for (const target of targets) {
    const url = buildInternalFunctionUrl(pathOrUrl, target);

    const attempts = shouldSkipNativeTransport(init, options)
      ? [() => fetchWithTimeout(url, init, options.timeoutMs ?? 15000)]
      : [() => makeNativeRequestAbortable(nativeRequestAsResponse(url, init, options), init.signal)];

    for (const attempt of attempts) {
      try {
        const response = await attempt();
        if (response.status === 404) {
          sawNotFound = true;
          if (options.allow404) {
            return response;
          }
        }

        if (!response.ok && target === 'mirror') {
          try {
            const payload = await readJsonResponse(response.clone());
            markMirrorBootError(payload, response.status);
          } catch {
            // ignore payload parsing errors when deciding mirror health
          }
        }

        if (
          !response.ok &&
          target === 'primary' &&
          targets.length > 1 &&
          response.status >= 500
        ) {
          lastError = new Error(`Request failed (${response.status})`);
          break;
        }

        return response;
      } catch (error) {
        const normalized = error instanceof Error ? error : new Error(String(error || 'Request failed'));
        if (isAbortError(normalized)) {
          throw normalized;
        }
        if (target === 'mirror') {
          markMirrorBootError(normalized.message);
        }
        lastError = normalized;
      }
    }
  }

  if (options.allow404 && sawNotFound) {
    return new Response(null, { status: 404 });
  }

  throw lastError || new Error('Request failed');
}

async function requestJsonWithMirrors<T>(
  path: string,
  options: {
    allow404?: boolean;
    timeoutMs?: number;
  } = {},
): Promise<T | null> {
  const res = await apiFetch(path, {
    headers: authHeaders(),
  }, {
    allow404: options.allow404,
    timeoutMs: options.timeoutMs,
    useMirror: true,
  });

  if (res.status === 404 && options.allow404) {
    return null;
  }

  const json = await readJsonResponse(res);
  if (!res.ok) {
    throw new Error(
      String((json as any).error || (json as any).message || (json as any).raw || `Request failed (${res.status})`),
    );
  }

  return ((json as any).data ?? json) as T;
}

function extractCityGuidesErrorMessage(payload: unknown, status?: number) {
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    const parts = [record.error, record.message, record.code, record.raw, status ? `HTTP ${status}` : '']
      .map((value) => String(value || '').trim())
      .filter(Boolean);
    if (parts.length > 0) return parts.join(' · ');
  }

  return status ? `HTTP ${status}` : 'Request failed';
}

function isRecoverableCityGuideReadError(error: unknown) {
  const message = String(error instanceof Error ? error.message : error || '').toLowerCase();
  return (
    message.includes('404') ||
    message.includes('not found') ||
    message.includes('boot_error') ||
    message.includes('function failed to start') ||
    message.includes('unauthorized_no_auth_header') ||
    message.includes('missing authorization header')
  );
}

function base64ToUint8Array(base64Value: string) {
  const normalized = String(base64Value || '').replace(/^data:.*;base64,/, '');
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

async function fetchOfficialSponsorCompaniesPdfFromNativeShell() {
  const response = await CapacitorHttp.get({
    url: HOODIE_SPONSOR_COMPANIES_OFFICIAL_PDF_URL,
    headers: {
      Accept: 'application/pdf,*/*',
    },
    connectTimeout: 30000,
    readTimeout: 30000,
    responseType: 'arraybuffer',
  });

  if (response.status < 200 || response.status >= 300) {
    throw new Error(`Official sponsor companies PDF request failed with status ${response.status}`);
  }

  const pdfBytes = typeof response.data === 'string'
    ? base64ToUint8Array(response.data)
    : response.data instanceof ArrayBuffer
      ? new Uint8Array(response.data)
      : Array.isArray(response.data)
        ? new Uint8Array(response.data)
        : null;

  if (!pdfBytes || pdfBytes.byteLength === 0) {
    throw new Error('Official sponsor companies PDF response was empty');
  }

  return new Blob([pdfBytes], {
    type: response.headers?.['content-type'] || 'application/pdf',
  });
}

// ─── OTP ────────────────────────────────────────────────────────

export async function sendOtp(email: string) {
  if (isReviewerBypassEmail(email) && isReviewerAccessConfigured()) {
    return { sent: true, email: email.trim().toLowerCase(), reviewer_bypass: true };
  }

  const res = await apiFetch(`/send-otp`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ email }),
  });
  const json = await res.json();
  if (!res.ok) {
    console.error('GHAR sendOtp error:', json);
    throw new Error(json.error || 'Failed to send verification code');
  }
  return json.data ?? json;
}

export async function verifyOtp(email: string, code: string) {
  if (isReviewerBypassEmail(email) && isReviewerAccessConfigured()) {
    const bypassCode = getReviewerBypassCode(email);
    if (!bypassCode || code.trim().toUpperCase() !== bypassCode.toUpperCase()) {
      throw new Error('Invalid reviewer access code');
    }
    return { verified: true, email: email.trim().toLowerCase(), reviewer_bypass: true };
  }

  const res = await apiFetch(`/verify-otp`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ email, code }),
  });
  const json = await res.json();
  if (!res.ok) {
    console.error('GHAR verifyOtp error:', json);
    throw new Error(json.error || 'Failed to verify code');
  }
  return json.data ?? json;
}

// ─── LISTINGS ────────────────────────────────────────────────

export async function fetchListings() {
  try {
    const data = await requestJsonWithMirrors<any[]>('/listings');
    return data || [];
  } catch (error) {
    console.error('GHAR fetchListings error:', error);
    throw error instanceof Error ? error : new Error('Failed to fetch listings');
  }
}

export async function fetchHoodieSponsorCompaniesPdf(download = false) {
  if (isNativeShell()) {
    try {
      return await fetchOfficialSponsorCompaniesPdfFromNativeShell();
    } catch (nativeError) {
      console.error('GHAR official sponsor companies PDF native fetch error:', nativeError);
    }
  }

  const res = await apiFetch(
    `/hoodie-sponsor-companies-pdf${download ? '?download=1' : ''}`,
    {
      headers: authHeaders(),
    },
    {
      responseType: 'arraybuffer',
      useMirror: false,
    },
  );

  if (!res.ok) {
    const json = await readJsonResponse(res);
    console.error('GHAR sponsor companies PDF fetch error:', json);
    throw new Error((json as { error?: string }).error || 'Failed to fetch sponsor companies PDF');
  }

  return res.blob();
}

export async function fetchPrPointsSchema(): Promise<PrPointsSchema> {
  const res = await apiFetch('/pr-points/schema', {
    headers: authHeaders(),
  }, {
    timeoutMs: 30000,
    useMirror: false,
  });

  const json = await readJsonResponse(res);
  if (!res.ok) {
    console.error('GHAR PR points schema fetch error:', json);
    throw new Error((json as { error?: string }).error || 'Failed to load PR points calculator');
  }

  return normalizePrPointsSchema((json as { data?: unknown }).data ?? json);
}

export async function calculatePrPoints(input: {
  subclassId: string;
  answers: PrPointsAnswers;
}): Promise<PrPointsCalculationResult> {
  const res = await apiFetch('/pr-points/calculate', {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      subclassId: input.subclassId,
      answers: input.answers,
    }),
  }, {
    timeoutMs: 30000,
    useMirror: false,
  });

  const json = await readJsonResponse(res);
  if (!res.ok) {
    console.error('GHAR PR points calculation error:', json);
    throw new Error((json as { error?: string }).error || 'Failed to calculate PR points');
  }

  return normalizePrPointsCalculationResult((json as { data?: unknown }).data ?? json);
}

export async function fetchSkilledOccupations(input: FetchSkilledOccupationsInput = {}): Promise<SkilledOccupationsResult> {
  const params = new URLSearchParams();
  if (input.q) params.set('q', input.q);
  if (input.visa) params.set('visa', input.visa);
  if (input.list) params.set('list', input.list);
  if (input.authority) params.set('authority', input.authority);
  if (input.sort) params.set('sort', input.sort);
  if (input.page) params.set('page', String(input.page));
  if (input.pageSize) params.set('pageSize', String(input.pageSize));

  const query = params.toString();
  const res = await apiFetch(`/occupations${query ? `?${query}` : ''}`, {
    headers: authHeaders(),
  }, {
    timeoutMs: 30000,
    useMirror: false,
  });

  const json = await readJsonResponse(res);
  if (!res.ok) {
    console.error('GHAR occupations fetch error:', json);
    throw new Error((json as { error?: string }).error || 'Failed to load skilled occupations');
  }

  return normalizeSkilledOccupationsResult((json as { data?: unknown }).data ?? json);
}

export async function createListing(listing: {
  address: string;
  suburb?: string;
  postcode: string;
  lat: number;
  lng: number;
  category: string;
  confidence_score: number;
  description: string;
  reported_by: string;
  nearest_transit?: { name: string; type: string; distance_m: number; walk_min: number }[];
}) {
  const res = await apiFetch(`/listings`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(listing),
  });
  const json = await res.json();
  if (!res.ok) {
    console.error('GHAR createListing error:', json);
    throw new Error(json.error || 'Failed to create listing');
  }
  return json.data ?? json;
}

export async function updateListing(id: string, updates: Record<string, any>) {
  const res = await apiFetch(`/listings/${id}`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify(updates),
  });
  const json = await res.json();
  if (!res.ok) {
    console.error('GHAR updateListing error:', json);
    throw new Error(json.error || 'Failed to update listing');
  }
  return json.data ?? json;
}

export async function deleteListing(id: string, email: string) {
  const res = await apiFetch(`/listings/${id}`, {
    method: 'DELETE',
    headers: headers(),
    body: JSON.stringify({ email }),
  });
  const json = await res.json();
  if (!res.ok) {
    console.error('GHAR deleteListing error:', json);
    throw new Error(json.error || 'Failed to delete listing');
  }
  return json;
}

// ─── BULLETINS ──────────────────────────────────────────────────

export async function fetchBulletins() {
  try {
    const data = await requestJsonWithMirrors<any[]>(`/bulletins?app_variant=${encodeURIComponent(APP_VARIANT)}`);
    return data || [];
  } catch (error) {
    console.error('GHAR fetchBulletins error:', error);
    throw error instanceof Error ? error : new Error('Failed to fetch bulletins');
  }
}

export type BannerPlacement = 'noticeboard' | 'official_events';

export interface BannerRecord {
  id: string;
  url: string;
  link?: string;
  app_variant?: TargetableAppVariant;
  placement?: BannerPlacement;
  position?: number;
}

function normalizeBannerPlacement(value: unknown): BannerPlacement {
  return String(value || '').trim().toLowerCase() === 'official_events'
    ? 'official_events'
    : 'noticeboard';
}

function normalizeBannerRecord(value: any): BannerRecord | null {
  const url = String(value?.url || '').trim();
  if (!url) return null;
  return {
    id: String(value?.id || ''),
    url,
    link: String(value?.link || '').trim() || undefined,
    app_variant: normalizeTargetableVariant(value?.app_variant, 'all'),
    placement: normalizeBannerPlacement(value?.placement),
    position: Number.isFinite(Number(value?.position)) ? Number(value.position) : undefined,
  };
}

export async function fetchBanners(): Promise<BannerRecord[]> {
  try {
    const data = await requestJsonWithMirrors<any[]>(`/banners?app_variant=${encodeURIComponent(APP_VARIANT)}`);
    return (Array.isArray(data) ? data : [])
      .map((banner) => normalizeBannerRecord(banner))
      .filter((banner): banner is BannerRecord => Boolean(banner));
  } catch (error) {
    console.error('GHAR fetchBanners error:', error);
    throw error instanceof Error ? error : new Error('Failed to fetch banners');
  }
}

export type InAppPopupCampaignFrequency = 'once' | 'daily' | 'every_open';
export type InAppPopupCampaignStatus = 'scheduled' | 'active' | 'paused' | 'expired';

export interface InAppPopupCampaignRecord {
  id: string;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  app_variant: TargetableAppVariant;
  title: string;
  image_url: string;
  click_url: string;
  alt_text: string;
  frequency: InAppPopupCampaignFrequency;
  starts_at?: string;
  ends_at?: string;
  priority: number;
  is_paused: boolean;
  status?: InAppPopupCampaignStatus;
  target_states?: string[];
  target_universities?: string[];
  target_suburbs?: string[];
  target_postcodes?: string[];
  target_emails?: string[];
  impression_count?: number;
  click_count?: number;
  last_impression_at?: string;
  last_click_at?: string;
}

export type InAppPopupCampaignSaveInput = {
  adminEmail: string;
  title: string;
  imageUrl: string;
  clickUrl: string;
  altText?: string;
  frequency: InAppPopupCampaignFrequency;
  appVariant: TargetableAppVariant;
  startsAt?: string;
  endsAt?: string;
  priority?: number;
  isPaused?: boolean;
  filters?: {
    states?: string[];
    universities?: string[];
    suburbs?: string[];
    postcodes?: string[];
    emails?: string[];
  };
};

function normalizeInAppPopupCampaignFrequency(value: unknown): InAppPopupCampaignFrequency {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'daily') return 'daily';
  if (normalized === 'every_open' || normalized === 'every-open' || normalized === 'everyopen') return 'every_open';
  return 'once';
}

function normalizeInAppPopupCampaignStatus(value: unknown): InAppPopupCampaignStatus | undefined {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'scheduled' || normalized === 'active' || normalized === 'paused' || normalized === 'expired') {
    return normalized;
  }
  return undefined;
}

function normalizeStringList(value: unknown): string[] {
  if (!value) return [];
  const raw = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : [];
  return [...new Set(raw.map((item) => String(item || '').trim()).filter(Boolean))];
}

function normalizeInAppPopupCampaignRecord(value: any): InAppPopupCampaignRecord | null {
  const id = String(value?.id || '').trim();
  const imageUrl = String(value?.image_url || value?.imageUrl || '').trim();
  const clickUrl = String(value?.click_url || value?.clickUrl || value?.link || '').trim();
  if (!id || !imageUrl || !clickUrl) return null;

  const title = String(value?.title || 'Campaign').trim();
  return {
    id,
    created_at: String(value?.created_at || ''),
    updated_at: String(value?.updated_at || ''),
    created_by: String(value?.created_by || ''),
    app_variant: normalizeTargetableVariant(value?.app_variant, 'all'),
    title,
    image_url: imageUrl,
    click_url: clickUrl,
    alt_text: String(value?.alt_text || value?.alt || title || 'Campaign poster').trim(),
    frequency: normalizeInAppPopupCampaignFrequency(value?.frequency),
    starts_at: String(value?.starts_at || ''),
    ends_at: String(value?.ends_at || ''),
    priority: Number.isFinite(Number(value?.priority)) ? Number(value.priority) : 0,
    is_paused: Boolean(value?.is_paused),
    status: normalizeInAppPopupCampaignStatus(value?.status),
    target_states: normalizeStringList(value?.target_states),
    target_universities: normalizeStringList(value?.target_universities),
    target_suburbs: normalizeStringList(value?.target_suburbs),
    target_postcodes: normalizeStringList(value?.target_postcodes),
    target_emails: normalizeStringList(value?.target_emails),
    impression_count: Number(value?.impression_count || 0),
    click_count: Number(value?.click_count || 0),
    last_impression_at: String(value?.last_impression_at || ''),
    last_click_at: String(value?.last_click_at || ''),
  };
}

function buildInAppPopupCampaignPayload(params: InAppPopupCampaignSaveInput) {
  return {
    admin_email: params.adminEmail,
    title: params.title,
    image_url: params.imageUrl,
    click_url: params.clickUrl,
    alt_text: params.altText || params.title,
    frequency: params.frequency,
    app_variant: normalizeTargetableVariant(params.appVariant, APP_VARIANT),
    starts_at: params.startsAt || '',
    ends_at: params.endsAt || '',
    priority: Number.isFinite(Number(params.priority)) ? Number(params.priority) : 0,
    is_paused: Boolean(params.isPaused),
    target_states: params.filters?.states || [],
    target_universities: params.filters?.universities || [],
    target_suburbs: params.filters?.suburbs || [],
    target_postcodes: params.filters?.postcodes || [],
    target_emails: params.filters?.emails || [],
  };
}

export async function fetchActiveInAppPopupCampaigns(email = ''): Promise<InAppPopupCampaignRecord[]> {
  try {
    const search = new URLSearchParams({ app_variant: APP_VARIANT });
    const normalizedEmail = email.trim().toLowerCase();
    if (normalizedEmail) search.set('email', normalizedEmail);
    const data = await requestJsonWithMirrors<any[]>(`/in-app-popup-campaigns/active?${search.toString()}`, {
      timeoutMs: 8000,
    });
    return (Array.isArray(data) ? data : [])
      .map((campaign) => normalizeInAppPopupCampaignRecord(campaign))
      .filter((campaign): campaign is InAppPopupCampaignRecord => Boolean(campaign));
  } catch (error) {
    console.error('GHAR fetchActiveInAppPopupCampaigns error:', error);
    throw error instanceof Error ? error : new Error('Failed to fetch popup campaigns');
  }
}

export async function recordInAppPopupCampaignImpression(id: string) {
  const res = await apiFetch(`/in-app-popup-campaigns/${encodeURIComponent(id)}/impression`, {
    method: 'POST',
    headers: headers(),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error('GHAR recordInAppPopupCampaignImpression error:', json);
    throw new Error(json.error || 'Failed to record popup impression');
  }
  return normalizeInAppPopupCampaignRecord(json.data ?? json);
}

export async function recordInAppPopupCampaignClick(id: string) {
  const res = await apiFetch(`/in-app-popup-campaigns/${encodeURIComponent(id)}/click`, {
    method: 'POST',
    headers: headers(),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error('GHAR recordInAppPopupCampaignClick error:', json);
    throw new Error(json.error || 'Failed to record popup click');
  }
  return normalizeInAppPopupCampaignRecord(json.data ?? json);
}

export type PoliceFeedPost = {
  id: string;
  title: string;
  body: string;
  link: string;
  published_at: string;
  image_url?: string;
};

export type HciAlertPost = {
  id: string;
  title: string;
  link: string;
  source: string;
  scraped_at: string;
};

export type MalaysianHighCommissionPost = {
  id: string;
  title: string;
  link: string;
  published_at: string;
  source: string;
  scraped_at: string;
  summary?: string;
};

export async function fetchPoliceFeed(handle: string): Promise<PoliceFeedPost[]> {
  const cleanHandle = String(handle || '').trim().replace(/^@/, '');
  if (!cleanHandle) return [];
  const res = await apiFetch(`/police-feed?handle=${encodeURIComponent(cleanHandle)}`, { headers: headers() });
  const json = await res.json();
  if (!res.ok) {
    console.error('GHAR fetchPoliceFeed error:', json);
    throw new Error(json.error || 'Failed to fetch police feed');
  }
  return json.data || [];
}

export async function fetchHciAlerts(): Promise<HciAlertPost[]> {
  const res = await apiFetch(`/hci-alerts`, { headers: headers() });
  const json = await res.json();
  if (!res.ok) {
    console.error('GHAR fetchHciAlerts error:', json);
    throw new Error(json.error || 'Failed to fetch Indian High Commission alerts');
  }
  return json.data || [];
}

export async function fetchMalaysianHighCommissionAlerts(): Promise<MalaysianHighCommissionPost[]> {
  const res = await apiFetch(`/malaysia-high-commission-alerts`, { headers: headers() });
  const json = await res.json();
  if (!res.ok) {
    console.error('GHAR fetchMalaysianHighCommissionAlerts error:', json);
    throw new Error(json.error || 'Failed to fetch Malaysian High Commission alerts');
  }
  return json.data || [];
}

// ─── EVIDENCE ───────────────────────────────────────────────────

export async function fetchEvidence(email: string) {
  try {
    const data = await requestJsonWithMirrors<any[]>(`/evidence?email=${encodeURIComponent(email)}`);
    return data || [];
  } catch (error) {
    console.error('GHAR fetchEvidence error:', error);
    throw error instanceof Error ? error : new Error('Failed to fetch evidence');
  }
}

export async function uploadEvidenceFile(file: File): Promise<{
  storage_path: string;
  file_url: string;
  file_type: string;
  file_size: number;
  original_name: string;
}> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await apiFetch(`/evidence/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${publicAnonKey}` },
    body: formData,
  });
  const json = await res.json();
  if (!res.ok) {
    console.error('GHAR uploadEvidenceFile error:', json);
    throw new Error(json.error || 'Failed to upload file');
  }
  return json.data ?? json;
}

export async function createEvidence(evidence: {
  email: string;
  listing_id: string;
  filename: string;
  file_url?: string;
  file_type?: string;
  file_size?: number;
  storage_path?: string;
  associated_address?: string;
  associated_address_label?: string;
  external_link?: string;
  notes: string;
}) {
  const res = await apiFetch(`/evidence`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(evidence),
  });
  const json = await res.json();
  if (!res.ok) {
    console.error('GHAR createEvidence error:', json);
    throw new Error(json.error || 'Failed to create evidence');
  }
  return json.data;
}

export async function deleteEvidence(id: string, email: string) {
  const res = await apiFetch(`/evidence/${id}?email=${encodeURIComponent(email)}`, {
    method: 'DELETE',
    headers: headers(),
  });
  const json = await res.json();
  if (!res.ok) {
    console.error('GHAR deleteEvidence error:', json);
    throw new Error(json.error || 'Failed to delete evidence');
  }
  return json.data;
}

// ─── PROFILES ───────────────────────────────────────────────────

export interface ProfilePayload {
  first_name: string;
  last_name: string;
  dob: string;
  phone: string;
  email: string;
  citizenship: string;
  home_state: string;
  australian_state: string;
  audience_mode?: 'student' | 'newcomer';
  university?: string;
  university_id?: string;
  email_type: 'edu_au' | 'standard';
  course_name?: string;
  student_id?: string;
  visa_status?: string;
  work_status?: string;
  employer_name?: string;
  weekly_income?: number | null;
  graduation_year?: number | null;
  postcode: string;
  work_address?: string;
  work_display_address?: string;
  work_state?: string;
  work_postcode?: string;
  work_lat?: number | null;
  work_lng?: number | null;
  work_address_verified?: boolean;
  migration_status?: 'needs_profile_completion' | 'completed';
  migrated_at?: string;
  app_variant_imported_for?: TargetableAppVariant;
  legacy_firebase?: {
    project_id?: string;
    uid?: string;
    display_name?: string;
    phone_number?: string;
    email_verified?: boolean;
    providers?: Array<Record<string, unknown>>;
    created_at?: string;
    last_sign_in_at?: string;
  };
  is_verified?: boolean;
}

export async function createProfile(profile: ProfilePayload) {
  const res = await apiFetch(`/profiles`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(profile),
  });
  const json = await res.json();
  if (!res.ok) {
    console.error('GHAR createProfile error:', json);
    throw new Error(json.error || 'Failed to create profile');
  }
  return json.data;
}

export async function fetchProfile(email: string) {
  try {
    return await requestJsonWithMirrors(`/profiles/${encodeURIComponent(email)}`, { allow404: true });
  } catch (error) {
    console.error('GHAR fetchProfile error:', error);
    throw error instanceof Error ? error : new Error('Failed to fetch profile');
  }
}

export async function updateProfile(email: string, updates: Partial<ProfilePayload> & Record<string, any>) {
  const res = await apiFetch(`/profiles/${encodeURIComponent(email)}`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify(updates),
  });
  const json = await res.json();
  if (!res.ok) {
    console.error('GHAR updateProfile error:', json);
    throw new Error(json.error || 'Failed to update profile');
  }
  return json.data;
}

export async function deleteProfile(email: string) {
  const res = await apiFetch(`/profiles/${encodeURIComponent(email)}`, {
    method: 'DELETE',
    headers: headers(),
  });
  const json = await res.json();
  if (!res.ok) {
    console.error('GHAR deleteProfile error:', json);
    throw new Error(json.error || 'Failed to delete profile');
  }
  return json.data;
}

// ─── PUSH NOTIFICATIONS ────────────────────────────────────────

export interface PushSubscriptionPayload {
  email: string;
  token: string;
  platform?: string;
  permission?: string;
  app_version?: string;
  device_name?: string;
  device_model?: string;
  state?: string;
  university?: string;
  suburb?: string;
  postcode?: string;
  app_variant?: AppVariant;
  app_identifier?: string;
  app_display_name?: string;
}

export async function registerPushSubscription(payload: PushSubscriptionPayload) {
  const res = await apiFetch(`/push/register`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(payload),
  });

  let json: any = {};
  try {
    json = await res.json();
  } catch {
    json = {};
  }

  if (!res.ok) {
    console.error('GHAR registerPushSubscription error:', json);
    throw new Error(json.error || 'Failed to register push subscription');
  }

  return json.data;
}

export async function unregisterPushSubscription(payload: { email?: string; token: string }) {
  const res = await apiFetch(`/push/register`, {
    method: 'DELETE',
    headers: headers(),
    body: JSON.stringify(payload),
  });

  let json: any = {};
  try {
    json = await res.json();
  } catch {
    json = {};
  }

  if (!res.ok) {
    console.error('GHAR unregisterPushSubscription error:', json);
    throw new Error(json.error || 'Failed to unregister push subscription');
  }

  return json.data;
}

// ─── PURGE DEMO DATA ────────────────────────────────────────────

export async function purgeData() {
  const res = await apiFetch(`/seed`, {
    method: 'POST',
    headers: headers(),
  });
  const json = await res.json();
  if (!res.ok) {
    console.error('GHAR purge error:', json);
    throw new Error(json.error || 'Failed to purge data');
  }
  return json;
}

// ─── SYNC BLIPS (re-create map listings from rental reviews) ────

export async function syncBlips() {
  const res = await apiFetch(`/sync-blips`, {
    method: 'POST',
    headers: headers(),
  });
  const json = await res.json();
  if (!res.ok) {
    console.error('GHAR sync-blips error:', json);
    throw new Error(json.error || 'Failed to sync blips');
  }
  return json;
}

// ─── AI TRIAGE ──────────────────────────────────────────────────

export async function sendTriageMessage(
  messages: { role: string; text: string }[],
  category?: string,
  context?: {
    known_addresses: string[];
    uploaded_evidence: number;
    state: string | null;
    user_name: string;
    risk_assessment?: any;
    risk_score?: string | null;
    surface?: 'legal' | 'arrival';
    preferred_language?: string;
    locale?: string;
    audience?: string;
    app_variant?: string;
    intent_hint?: string;
    support_context?: string;
    academic_context?: {
      university?: string;
      course_name?: string;
      graduation_year?: number | string | null;
      visa_status?: string;
    };
    official_events?: Array<{
      title: string;
      humanized_date: string;
      venue_name: string;
      address: string;
      source_url: string;
    }>;
    itinerary_context?: {
      active: boolean;
      signed_in: boolean;
      data_scope: string;
      today: string;
      total_spots: number;
      present: Array<{
        day: string;
        label: string;
        spot_count: number;
        route_summary: string;
        spots: Array<{
          number: number;
          event_key: string;
          kind: 'event' | 'custom_stop';
          title: string;
          time: string;
          venue_name: string;
          suburb: string;
          address: string;
          summary: string;
          maps_url: string;
          source_url: string;
          lat: number | null;
          lng: number | null;
        }>;
      }>;
      past: Array<{
        day: string;
        label: string;
        spot_count: number;
        route_summary: string;
        spots: Array<{
          number: number;
          event_key: string;
          kind: 'event' | 'custom_stop';
          title: string;
          time: string;
          venue_name: string;
          suburb: string;
          address: string;
          summary: string;
          maps_url: string;
          source_url: string;
          lat: number | null;
          lng: number | null;
        }>;
      }>;
      error?: string;
    };
    networking_cards_context?: Array<{
      display_name: string;
      headline?: string;
      company?: string;
      role?: string;
      location?: string;
      met_at?: string;
      met_context?: string;
      met_event_title?: string;
      notes?: string;
      display_tags?: string[];
      tags?: string[];
      search_terms?: string[];
      linkedin_url?: string;
    }>;
    address_lookup?: {
      query: string;
      matched_address: string;
      lat: number;
      lng: number;
      summary: string;
    };
    household_context?: {
      active: boolean;
      household_name?: string;
      household_address?: string;
      viewer_role?: string;
      you_owe?: number;
      youre_owed?: number;
      open_bills?: Array<{
        title: string;
        amount_owed: number;
        due_at: string;
        payer_name: string;
        status: string;
      }>;
      assigned_chores?: Array<{
        title: string;
        due_at: string;
        status: string;
        cadence: string;
      }>;
      pending_invites?: Array<{
        household_name: string;
        address_label: string;
        invited_by: string;
      }>;
      pending_confirmations?: Array<{
        bill_title: string;
        payer_name: string;
        amount: number;
      }>;
      recent_notifications?: Array<{
        title: string;
        body: string;
        sent_at: string;
        deep_link?: string;
      }>;
    };
    expense_tracker_context?: {
      active: boolean;
      data_scope: string;
      report_month?: string;
      report_month_label?: string;
      household_name?: string;
      currency?: 'AUD';
      personal_week?: unknown;
      personal_month?: unknown;
      personal_goal_progress?: unknown;
      personal_mom_trend?: unknown;
      personal_yoy_comparison?: unknown;
      recent_personal_transactions?: Array<{
        title: string;
        category: string;
        amount: number;
        due_at: string;
        status: string;
        source: string;
      }>;
      household_week?: unknown;
      household_month?: unknown;
      household_mom_trend?: unknown;
      household_yoy_comparison?: unknown;
      recent_household_transactions?: Array<{
        title: string;
        category: string;
        amount: number;
        due_at: string;
        status: string;
        source: string;
      }>;
    };
    timeline_context?: {
      active: boolean;
      data_scope: string;
      current_home?: {
        address: string;
        suburb?: string;
        state?: string;
        postcode?: string;
        start_date?: string;
        is_current?: boolean;
      } | null;
      known_address_count?: number;
      recent_homes?: Array<{
        address: string;
        suburb?: string;
        state?: string;
        start_date?: string;
        end_date?: string;
        is_current?: boolean;
      }>;
    };
  },
) {
  const requestVariant = String(context?.app_variant || APP_VARIANT || '').trim() || APP_VARIANT;
  const res = await apiFetch(`/triage`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      messages,
      category,
      context,
      app_variant: requestVariant,
      assistant_name: APP_CONFIG.assistantName,
    }),
  });
  const json = await readJsonResponse(res) as Record<string, any>;
  if (!res.ok) {
    const detail = String(json.error || json.message || json.raw || `HTTP ${res.status}`).trim();
    console.error('GHAR triage error:', {
      status: res.status,
      app_variant: requestVariant,
      detail,
      payload: json,
    });
    throw new Error(`Triage request failed (${res.status}): ${detail || 'Failed to get triage response'}`);
  }
  const responseText = [
    json.data?.text,
    json.data?.response,
    json.text,
    json.response,
  ].find((value) => typeof value === 'string' && value.trim().length > 0);
  if (!responseText) {
    console.error('GHAR triage malformed response:', {
      status: res.status,
      app_variant: requestVariant,
      payload: json,
    });
    throw new Error('Triage response missing data.text');
  }
  return responseText;
}

// ─── NETWORKING CARDS ───────────────────────────────────────────

export type NetworkingCard = {
  id: string;
  owner_email: string;
  linkedin_url: string;
  display_name: string;
  headline: string;
  company: string;
  role: string;
  location: string;
  met_at: string;
  met_context: string;
  met_event_title: string;
  notes: string;
  display_tags?: string[];
  tags: string[];
  search_terms?: string[];
  created_at: string;
  updated_at: string;
  created_app_variant: AppVariant | 'all' | string;
  archived_at: string;
};

export type NetworkingCardPayload = {
  email: string;
  linkedin_url: string;
  display_name?: string;
  headline?: string;
  company?: string;
  role?: string;
  location?: string;
  met_at?: string;
  met_context?: string;
  met_event_title?: string;
  notes?: string;
  tags?: string[];
};

export type NetworkingCardListResponse = {
  data: NetworkingCard[];
  meta: {
    returned_count: number;
    total_count: number;
    has_more: boolean;
    next_offset: number | null;
  };
};

export type MyLinkedInProfile = {
  owner_email: string;
  linkedin_url: string;
  display_name: string;
  created_at: string;
  updated_at: string;
  created_app_variant: AppVariant | 'all' | string;
};

export type MyLinkedInProfilePayload = {
  email: string;
  linkedin_url: string;
  display_name?: string;
};

export async function fetchMyLinkedInProfile(email: string): Promise<MyLinkedInProfile | null> {
  const search = new URLSearchParams({ email });
  const res = await apiFetch(`/networking/my-linkedin?${search.toString()}`, {
    headers: headers(),
  }, {
    useMirror: false,
  });
  const json = await readJsonResponse(res);
  if (!res.ok) {
    console.error('GHAR fetchMyLinkedInProfile error:', json);
    throw new Error((json as any).error || 'Failed to fetch LinkedIn QR profile');
  }
  return ((json as any).data || null) as MyLinkedInProfile | null;
}

export async function saveMyLinkedInProfile(
  payload: MyLinkedInProfilePayload,
): Promise<MyLinkedInProfile> {
  const res = await apiFetch('/networking/my-linkedin', {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify({
      ...payload,
      app_variant: APP_VARIANT,
    }),
  }, {
    useMirror: false,
  });
  const json = await readJsonResponse(res);
  if (!res.ok) {
    console.error('GHAR saveMyLinkedInProfile error:', json);
    throw new Error((json as any).error || 'Failed to save LinkedIn QR profile');
  }
  return (json as any).data;
}

export async function fetchNetworkingCards(params: {
  email: string;
  q?: string;
  limit?: number;
  offset?: number;
}): Promise<NetworkingCardListResponse> {
  const search = new URLSearchParams({
    email: params.email,
  });
  if (params.q) search.set('q', params.q);
  if (params.limit != null) search.set('limit', String(params.limit));
  if (params.offset != null) search.set('offset', String(params.offset));
  const res = await apiFetch(`/networking/cards?${search.toString()}`, {
    headers: headers(),
  }, {
    useMirror: false,
  });
  const json = await readJsonResponse(res);
  if (!res.ok) {
    console.error('GHAR fetchNetworkingCards error:', json);
    throw new Error((json as any).error || 'Failed to fetch networking cards');
  }
  return {
    data: ((json as any).data || []) as NetworkingCard[],
    meta: ((json as any).meta || {
      returned_count: 0,
      total_count: 0,
      has_more: false,
      next_offset: null,
    }) as NetworkingCardListResponse['meta'],
  };
}

export async function createNetworkingCard(payload: NetworkingCardPayload): Promise<NetworkingCard> {
  const res = await apiFetch('/networking/cards', {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      ...payload,
      app_variant: APP_VARIANT,
    }),
  }, {
    useMirror: false,
  });
  const json = await readJsonResponse(res);
  if (!res.ok) {
    console.error('GHAR createNetworkingCard error:', json);
    throw new Error((json as any).error || 'Failed to save networking card');
  }
  return (json as any).data;
}

export async function updateNetworkingCard(
  id: string,
  payload: NetworkingCardPayload,
): Promise<NetworkingCard> {
  const res = await apiFetch(`/networking/cards/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify({
      ...payload,
      app_variant: APP_VARIANT,
    }),
  }, {
    useMirror: false,
  });
  const json = await readJsonResponse(res);
  if (!res.ok) {
    console.error('GHAR updateNetworkingCard error:', json);
    throw new Error((json as any).error || 'Failed to update networking card');
  }
  return (json as any).data;
}

export async function deleteNetworkingCard(id: string, email: string): Promise<void> {
  const res = await apiFetch(`/networking/cards/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: headers(),
    body: JSON.stringify({ email }),
  }, {
    useMirror: false,
  });
  const json = await readJsonResponse(res);
  if (!res.ok) {
    console.error('GHAR deleteNetworkingCard error:', json);
    throw new Error((json as any).error || 'Failed to delete networking card');
  }
}

// ─── RENTAL HISTORY ─────────────────────────────────────────────

export async function fetchRentalHistory(email: string) {
  try {
    const data = await requestJsonWithMirrors<any[]>(`/rental-history/${encodeURIComponent(email)}`);
    return data || [];
  } catch (error) {
    console.error('GHAR fetchRentalHistory error:', error);
    throw error instanceof Error ? error : new Error('Failed to fetch rental history');
  }
}

export async function createRentalEntry(entry: {
  email: string;
  address: string;
  display_address?: string;
  unit_number?: string;
  building_id?: string;
  suburb?: string;
  postcode?: string;
  state?: string;
  lat?: number | null;
  lng?: number | null;
  address_verified?: boolean;
  start_date: string;
  end_date?: string;
  is_current?: boolean;
  landlord_name?: string;
  landlord_contact?: string;
  monthly_rent?: number | null;
  review_category?: string | null;
  review_text?: string;
  review_rating?: number | null;
}) {
  const res = await apiFetch(`/rental-history`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(entry),
  });
  const json = await res.json();
  if (!res.ok) {
    console.error('GHAR createRentalEntry error:', json);
    throw new Error(json.error || 'Failed to create rental entry');
  }
  return json.data;
}

export async function updateRentalEntry(id: string, updates: Record<string, any>) {
  const res = await apiFetch(`/rental-history/${id}`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify(updates),
  });
  const json = await res.json();
  if (!res.ok) {
    console.error('GHAR updateRentalEntry error:', json);
    throw new Error(json.error || 'Failed to update rental entry');
  }
  return json.data;
}

export async function deleteRentalEntry(email: string, id: string) {
  const res = await apiFetch(`/rental-history/${encodeURIComponent(email)}/${id}`, {
    method: 'DELETE',
    headers: headers(),
  });
  const json = await res.json();
  if (!res.ok) {
    console.error('GHAR deleteRentalEntry error:', json);
    throw new Error(json.error || 'Failed to delete rental entry');
  }
  return json;
}

// ─── LEGAL CASES ────────────────────────────────────────────────

export async function fetchLegalCases(email: string) {
  const res = await apiFetch(`/cases/${encodeURIComponent(email)}`, {
    headers: headers(),
  });
  const json = await res.json();
  if (!res.ok) {
    console.error('GHAR fetchLegalCases error:', json);
    throw new Error(json.error || 'Failed to fetch legal cases');
  }
  return json.data || [];
}

export async function createLegalCase(caseData: {
  email: string;
  case_title: string;
  associated_listing_id?: string | null;
  associated_listing_public_id?: string | null;
  vault_item_ids?: string[];
  rental_history_id?: string | null;
  case_notes?: string;
  applicable_law?: string;
}) {
  const res = await apiFetch(`/cases`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(caseData),
  });
  const json = await res.json();
  if (!res.ok) {
    console.error('GHAR createLegalCase error:', json);
    throw new Error(json.error || 'Failed to create legal case');
  }
  return json.data;
}

export async function updateLegalCase(id: string, updates: Record<string, any>) {
  const res = await apiFetch(`/cases/${id}`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify(updates),
  });
  const json = await res.json();
  if (!res.ok) {
    console.error('GHAR updateLegalCase error:', json);
    throw new Error(json.error || 'Failed to update legal case');
  }
  return json.data;
}

export async function deleteLegalCase(id: string, email: string) {
  const res = await apiFetch(`/cases/${id}?email=${encodeURIComponent(email)}`, {
    method: 'DELETE',
    headers: headers(),
  });
  const json = await res.json();
  if (!res.ok) {
    console.error('GHAR deleteLegalCase error:', json);
    throw new Error(json.error || 'Failed to delete legal case');
  }
  return json.data;
}

// ─── PREPARE HUB ────────────────────────────────────────────────

export async function fetchApplicationKits(email: string): Promise<ApplicationKitDraft[]> {
  const res = await apiFetch(`/application-kits?email=${encodeURIComponent(email)}`, {
    headers: headers(),
  });
  const json = await res.json();
  if (!res.ok) {
    console.error('GHAR fetchApplicationKits error:', json);
    throw new Error(json.error || 'Failed to fetch application kits');
  }
  return Array.isArray(json.data)
    ? json.data.map((draft: ApplicationKitDraft) => normalizeApplicationKitDraft(draft, email))
    : [];
}

export async function createApplicationKit(kitData: Omit<ApplicationKitDraft, 'id' | 'kit_number' | 'status' | 'created_at' | 'updated_at'>) {
  const res = await apiFetch(`/application-kits`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(kitData),
  });
  const json = await res.json();
  if (!res.ok) {
    console.error('GHAR createApplicationKit error:', json);
    throw new Error(json.error || 'Failed to create application kit');
  }
  return normalizeApplicationKitDraft(json.data as ApplicationKitDraft, kitData.email);
}

export async function updateApplicationKit(id: string, updates: Partial<ApplicationKitDraft> & { email: string }) {
  const res = await apiFetch(`/application-kits/${id}`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify(updates),
  });
  const json = await res.json();
  if (!res.ok) {
    console.error('GHAR updateApplicationKit error:', json);
    throw new Error(json.error || 'Failed to update application kit');
  }
  return normalizeApplicationKitDraft(json.data as ApplicationKitDraft, updates.email);
}

export async function deleteApplicationKit(id: string, email: string) {
  const res = await apiFetch(`/application-kits/${id}?email=${encodeURIComponent(email)}`, {
    method: 'DELETE',
    headers: headers(),
  });
  const json = await res.json();
  if (!res.ok) {
    console.error('GHAR deleteApplicationKit error:', json);
    throw new Error(json.error || 'Failed to delete application kit');
  }
  return json.data;
}

export async function generateApplicationLetter(payload: {
  email: string;
  applicant: Record<string, unknown>;
  housing: Record<string, unknown>;
  strengths: Record<string, unknown>;
  supporting_document_labels: string[];
  reference_summaries: string[];
  source_signature: string;
}) {
  const res = await apiFetch(`/application-kits/generate-letter`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok) {
    console.error('GHAR generateApplicationLetter error:', json);
    throw new Error(json.error || 'Failed to generate application letter');
  }
  return json.data as ApplicationLetterDraftResponse;
}

export async function fetchScamChecks(email: string): Promise<ScamCheckDraft[]> {
  const res = await apiFetch(`/scam-checks?email=${encodeURIComponent(email)}`, {
    headers: headers(),
  });
  const json = await res.json();
  if (!res.ok) {
    console.error('GHAR fetchScamChecks error:', json);
    throw new Error(json.error || 'Failed to fetch scam checks');
  }
  return Array.isArray(json.data)
    ? json.data.map((draft: ScamCheckDraft) => normalizeScamCheckDraft(draft, email))
    : [];
}

export async function createScamCheck(draft: Omit<ScamCheckDraft, 'id' | 'check_number' | 'created_at' | 'updated_at'>) {
  const res = await apiFetch(`/scam-checks`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(draft),
  });
  const json = await res.json();
  if (!res.ok) {
    console.error('GHAR createScamCheck error:', json);
    throw new Error(json.error || 'Failed to create scam check');
  }
  return normalizeScamCheckDraft(json.data as ScamCheckDraft, draft.email);
}

export async function updateScamCheck(id: string, updates: Partial<ScamCheckDraft> & { email: string }) {
  const res = await apiFetch(`/scam-checks/${id}`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify(updates),
  });
  const json = await res.json();
  if (!res.ok) {
    console.error('GHAR updateScamCheck error:', json);
    throw new Error(json.error || 'Failed to update scam check');
  }
  return normalizeScamCheckDraft(json.data as ScamCheckDraft, updates.email);
}

export async function deleteScamCheck(id: string, email: string) {
  const res = await apiFetch(`/scam-checks/${id}?email=${encodeURIComponent(email)}`, {
    method: 'DELETE',
    headers: headers(),
  });
  const json = await res.json();
  if (!res.ok) {
    console.error('GHAR deleteScamCheck error:', json);
    throw new Error(json.error || 'Failed to delete scam check');
  }
  return json.data;
}

export async function analyzeScamCheck(draft: ScamCheckDraft, evaluation: ScamCheckResult) {
  const res = await apiFetch(`/scam-checks/analyze`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ draft, evaluation }),
  });
  const json = await res.json();
  if (!res.ok) {
    console.error('GHAR analyzeScamCheck error:', json);
    throw new Error(json.error || 'Failed to analyze scam check');
  }
  return json.data as ScamCheckAiReport;
}

export async function fetchNswRentChecks(email: string): Promise<NswRentCheckSavedRecord[]> {
  const res = await apiFetch(`/nsw-rent-checks?email=${encodeURIComponent(email)}`, {
    headers: headers(),
  });
  const json = await res.json();
  if (!res.ok) {
    console.error('GHAR fetchNswRentChecks error:', json);
    throw new Error(json.error || 'Failed to fetch NSW rent checks');
  }
  return Array.isArray(json.data)
    ? json.data.map((record: NswRentCheckSavedRecord) => normalizeNswRentCheckRecord(record, email))
    : [];
}

export async function createNswRentCheck(payload: NswRentCheckCreatePayload): Promise<NswRentCheckSavedRecord> {
  const res = await apiFetch(`/nsw-rent-checks`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok) {
    console.error('GHAR createNswRentCheck error:', json);
    throw new Error(json.error || 'Failed to create NSW rent check');
  }
  return normalizeNswRentCheckRecord(json.data as NswRentCheckSavedRecord, payload.email);
}

export async function deleteNswRentCheck(id: string, email: string) {
  const res = await apiFetch(`/nsw-rent-checks/${id}?email=${encodeURIComponent(email)}`, {
    method: 'DELETE',
    headers: headers(),
  });
  const json = await res.json();
  if (!res.ok) {
    console.error('GHAR deleteNswRentCheck error:', json);
    throw new Error(json.error || 'Failed to delete NSW rent check');
  }
  return json.data;
}

export interface CityGuidePlace {
  id: string;
  name: string;
  description: string;
  image_url: string;
  navigation_link: string;
  lat: number;
  lng: number;
  position: number;
}

export interface CityGuide {
  id: string;
  slug: string;
  city: string;
  city_slug?: string;
  state: string;
  title: string;
  cover_image_url: string;
  intro: string;
  app_variant: TargetableAppVariant;
  position: number;
  expires_at?: string;
  created_at: string;
  updated_at: string;
  places: CityGuidePlace[];
}

export interface CityGuideDraftPayload {
  city: string;
  state: string;
  title: string;
  guide_slug?: string;
  cover_image_url: string;
  intro: string;
  app_variant: TargetableAppVariant;
  position: number;
  expires_at?: string;
  places: CityGuidePlace[];
}

export interface CityGuideCsvImportPreview {
  guide: CityGuideDraftPayload;
  row_count: number;
  warnings: string[];
  matched_guide: Pick<CityGuide, 'id' | 'slug' | 'title' | 'city' | 'state'> | null;
}

function normalizeCityGuidePlace(place: any, index: number): CityGuidePlace {
  const normalizedLat = typeof place?.lat === 'string' ? place.lat.trim() : place?.lat;
  const normalizedLng = typeof place?.lng === 'string' ? place.lng.trim() : place?.lng;
  return {
    id: String(place?.id || `place-${index + 1}`),
    name: String(place?.name || '').trim(),
    description: String(place?.description || '').trim(),
    image_url: optimizeCityGuidePlaceImageUrl(place?.image_url),
    navigation_link: String(place?.navigation_link || '').trim(),
    lat: normalizedLat === '' || normalizedLat === null || normalizedLat === undefined ? Number.NaN : Number(normalizedLat),
    lng: normalizedLng === '' || normalizedLng === null || normalizedLng === undefined ? Number.NaN : Number(normalizedLng),
    position: Number.isFinite(Number(place?.position)) ? Number(place.position) : index,
  };
}

function normalizeCityGuideExpiresAt(value: any) {
  const raw = String(value || '').trim();
  if (!raw) return undefined;
  const timestamp = Date.parse(raw);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : undefined;
}

function normalizeCityGuide(guide: any): CityGuide {
  const expiresAt = normalizeCityGuideExpiresAt(guide?.expires_at);
  return {
    id: String(guide?.id || ''),
    slug: String(guide?.slug || ''),
    city: String(guide?.city || '').trim(),
    city_slug: String(guide?.city_slug || '').trim(),
    state: String(guide?.state || '').trim(),
    title: String(guide?.title || '').trim(),
    cover_image_url: optimizeCityGuideCoverImageUrl(guide?.cover_image_url),
    intro: String(guide?.intro || '').trim(),
    app_variant: normalizeTargetableVariant(guide?.app_variant || APP_VARIANT),
    position: Number.isFinite(Number(guide?.position)) ? Number(guide.position) : 0,
    ...(expiresAt ? { expires_at: expiresAt } : {}),
    created_at: String(guide?.created_at || ''),
    updated_at: String(guide?.updated_at || ''),
    places: Array.isArray(guide?.places)
      ? guide.places
          .map((place: any, index: number) => normalizeCityGuidePlace(place, index))
          .sort((left, right) => left.position - right.position)
      : [],
  };
}

function normalizeCityGuideDraftPayload(guide: any): CityGuideDraftPayload {
  const expiresAt = normalizeCityGuideExpiresAt(guide?.expires_at);
  return {
    city: String(guide?.city || '').trim(),
    state: String(guide?.state || '').trim(),
    title: String(guide?.title || '').trim(),
    guide_slug: String(guide?.guide_slug || guide?.slug || '').trim() || undefined,
    cover_image_url: optimizeCityGuideCoverImageUrl(guide?.cover_image_url),
    intro: String(guide?.intro || '').trim(),
    app_variant: normalizeTargetableVariant(guide?.app_variant || APP_VARIANT),
    position: Number.isFinite(Number(guide?.position)) ? Number(guide.position) : 0,
    ...(expiresAt ? { expires_at: expiresAt } : {}),
    places: Array.isArray(guide?.places)
      ? guide.places
          .map((place: any, index: number) => normalizeCityGuidePlace(place, index))
          .sort((left, right) => left.position - right.position)
      : [],
  };
}

function normalizeCityGuideCsvImportPreview(payload: any): CityGuideCsvImportPreview {
  const matchedGuide = payload?.matched_guide && typeof payload.matched_guide === 'object'
    ? {
        id: String(payload.matched_guide.id || ''),
        slug: String(payload.matched_guide.slug || ''),
        title: String(payload.matched_guide.title || ''),
        city: String(payload.matched_guide.city || ''),
        state: String(payload.matched_guide.state || ''),
      }
    : null;

  return {
    guide: normalizeCityGuideDraftPayload(payload?.guide || {}),
    row_count: Number.isFinite(Number(payload?.row_count)) ? Number(payload.row_count) : 0,
    warnings: Array.isArray(payload?.warnings)
      ? payload.warnings.map((warning: any) => String(warning || '').trim()).filter(Boolean)
      : [],
    matched_guide: matchedGuide,
  };
}

async function requestCityGuidesJson(path: string, init: RequestInit, errorLabel: string) {
  try {
    const res = await apiFetch(path, init, { useMirror: true });
    const json = await readJsonResponse(res);
    if (!res.ok) {
      console.error(`${errorLabel}:`, path, json);
      throw new Error(extractCityGuidesErrorMessage(json, res.status));
    }
    return json;
  } catch (error) {
    console.error(`${errorLabel} transport error:`, path, error);
    throw new Error(String(error instanceof Error ? error.message : error || 'Request failed'));
  }
}

export async function fetchCityGuides(params?: {
  city?: string;
  appVariant?: TargetableAppVariant;
}) {
  const search = new URLSearchParams();
  if (params?.city) search.set('city', params.city);
  if (params?.appVariant) {
    search.set('app_variant', params.appVariant);
  }

  const suffix = search.toString() ? `?${search.toString()}` : '';
  try {
    const json = await requestCityGuidesJson(
      `/city-guides${suffix}`,
      { headers: headers() },
      'GHAR fetchCityGuides error',
    );
    return Array.isArray(json.data) ? json.data.map(normalizeCityGuide) : [];
  } catch (error) {
    if (isRecoverableCityGuideReadError(error)) {
      return [];
    }
    throw error;
  }
}

export async function fetchSuburbShareEnrichment(payload: SuburbShareEnrichmentRequest) {
  const res = await apiFetch('/suburb-share-enrichment', {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(payload),
  }, {
    useMirror: false,
    timeoutMs: 30000,
  });

  const json = await readJsonResponse(res);
  if (!res.ok) {
    throw new Error(
      String((json as any)?.error || (json as any)?.message || (json as any)?.raw || `Request failed (${res.status})`),
    );
  }

  const data = ((json as any)?.data || json || {}) as Partial<SuburbShareEnrichmentResponse>;
  return {
    summary: String(data.summary || '').trim(),
    hostedBackgroundImageUrl: String(data.hostedBackgroundImageUrl || '').trim() || undefined,
    sourcePageUrl: String(data.sourcePageUrl || '').trim() || undefined,
    sourceLabel: String(data.sourceLabel || '').trim() || undefined,
  } satisfies SuburbShareEnrichmentResponse;
}

export async function createCityGuide(payload: {
  admin_email: string;
  city: string;
  state: string;
  title: string;
  cover_image_url?: string;
  intro?: string;
  app_variant?: TargetableAppVariant;
  position?: number;
  expires_at?: string | null;
  places?: Array<Partial<CityGuidePlace>>;
}) {
  const json = await requestCityGuidesJson('/admin/city-guides', {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(payload),
  }, 'GHAR createCityGuide error');
  return normalizeCityGuide(json.data);
}

export async function updateCityGuide(id: string, payload: {
  admin_email: string;
  city?: string;
  state?: string;
  title?: string;
  cover_image_url?: string;
  intro?: string;
  app_variant?: TargetableAppVariant;
  position?: number;
  expires_at?: string | null;
  places?: Array<Partial<CityGuidePlace>>;
}) {
  const json = await requestCityGuidesJson(`/admin/city-guides/${id}`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify(payload),
  }, 'GHAR updateCityGuide error');
  return normalizeCityGuide(json.data);
}

export async function deleteCityGuide(id: string, adminEmail: string) {
  const json = await requestCityGuidesJson(`/admin/city-guides/${id}`, {
    method: 'DELETE',
    headers: headers(),
    body: JSON.stringify({ admin_email: adminEmail }),
  }, 'GHAR deleteCityGuide error');
  return json.data;
}

export async function generateCityGuideBlog(payload: {
  admin_email: string;
  city: string;
  state: string;
  title: string;
  places: Array<{
    name: string;
    description: string;
    image_url?: string;
    navigation_link?: string;
    lat?: number;
    lng?: number;
  }>;
}) {
  const json = await requestCityGuidesJson('/admin/city-guides/generate-blog', {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(payload),
  }, 'GHAR generateCityGuideBlog error');
  return {
    intro: String(json?.data?.intro || '').trim(),
  };
}

export async function previewCityGuideCsvImport(payload: {
  admin_email: string;
  csv_text: string;
  guide_id?: string;
  intro_override?: string;
  app_variant?: TargetableAppVariant;
}) {
  const json = await requestCityGuidesJson('/admin/city-guides/import-csv', {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      admin_email: payload.admin_email,
      csv_text: payload.csv_text,
      guide_id: payload.guide_id || '',
      intro_override: payload.intro_override || '',
      app_variant: normalizeTargetableVariant(payload.app_variant, 'all'),
      mode: 'preview',
    }),
  }, 'GHAR previewCityGuideCsvImport error');
  return normalizeCityGuideCsvImportPreview(json.data);
}

export async function commitCityGuideCsvImport(payload: {
  admin_email: string;
  csv_text: string;
  guide_id?: string;
  intro_override?: string;
  app_variant?: TargetableAppVariant;
}) {
  const json = await requestCityGuidesJson('/admin/city-guides/import-csv', {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      admin_email: payload.admin_email,
      csv_text: payload.csv_text,
      guide_id: payload.guide_id || '',
      intro_override: payload.intro_override || '',
      app_variant: normalizeTargetableVariant(payload.app_variant, 'all'),
      mode: 'commit',
    }),
  }, 'GHAR commitCityGuideCsvImport error');
  return {
    guide: normalizeCityGuide(json?.data?.guide || json.data),
    preview: json?.data?.preview ? normalizeCityGuideCsvImportPreview(json.data.preview) : null,
  };
}

// ─── ADMIN ──────────────────────────────────────────────────────

export async function adminInit(email: string) {
  const res = await apiFetch(`/admin/init`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ email }),
  });
  const json = await res.json();
  if (!res.ok) {
    console.error('GHAR adminInit error:', json);
    throw new Error(json.error || 'Failed to init admin');
  }
  return json.data;
}

export async function adminCheck(email: string) {
  const res = await apiFetch(`/admin/check`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ email }),
  });
  const json = await res.json();
  if (!res.ok) {
    console.error('GHAR adminCheck error:', json);
    throw new Error(json.error || 'Failed to check admin');
  }
  return json.data;
}

export async function adminSendOtp(email: string) {
  const res = await apiFetch(`/admin/send-otp`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ email }),
  });
  const json = await res.json();
  if (!res.ok) {
    console.error('GHAR adminSendOtp error:', json);
    throw new Error(json.error || 'Failed to send admin OTP');
  }
  return json.data;
}

export async function adminVerifyOtp(email: string, code: string) {
  const res = await apiFetch(`/admin/verify-otp`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ email, code }),
  });
  const json = await res.json();
  if (!res.ok) {
    console.error('GHAR adminVerifyOtp error:', json);
    throw new Error(json.error || 'Failed to verify admin OTP');
  }
  return json.data;
}

export async function fetchAdmins() {
  const res = await apiFetch(`/admin/admins`, { headers: headers() });
  const json = await res.json();
  if (!res.ok) {
    console.error('GHAR fetchAdmins error:', json);
    throw new Error(json.error || 'Failed to fetch admins');
  }
  return json.data || [];
}

export async function addAdmin(email: string, addedBy: string) {
  const res = await apiFetch(`/admin/admins`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ email, added_by: addedBy }),
  });
  const json = await res.json();
  if (!res.ok) {
    console.error('GHAR addAdmin error:', json);
    throw new Error(json.error || 'Failed to add admin');
  }
  return json.data;
}

export async function removeAdmin(email: string, requesterEmail: string) {
  const res = await apiFetch(`/admin/admins/${encodeURIComponent(email)}`, {
    method: 'DELETE',
    headers: headers(),
    body: JSON.stringify({ requester_email: requesterEmail }),
  });
  const json = await res.json();
  if (!res.ok) {
    console.error('GHAR removeAdmin error:', json);
    throw new Error(json.error || 'Failed to remove admin');
  }
  return json.data;
}

export async function adminDeleteMarker(id: string, adminEmail: string) {
  const res = await apiFetch(`/admin/delete-marker/${id}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ admin_email: adminEmail }),
  });
  const json = await res.json();
  if (!res.ok) {
    console.error('GHAR adminDeleteMarker error:', json);
    throw new Error(json.error || 'Failed to delete marker');
  }
  return json.data;
}

export async function adminRestoreMarker(id: string, adminEmail: string) {
  const res = await apiFetch(`/admin/restore-marker/${id}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ admin_email: adminEmail }),
  });
  const json = await res.json();
  if (!res.ok) {
    console.error('GHAR adminRestoreMarker error:', json);
    throw new Error(json.error || 'Failed to restore marker');
  }
  return json.data;
}

export async function adminUpdateMarker(id: string, adminEmail: string, updates: {
  address?: string;
  suburb?: string;
  postcode?: string;
  category?: string;
  description?: string;
  status?: string;
}) {
  const res = await apiFetch(`/admin/update-marker/${id}`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify({ admin_email: adminEmail, ...updates }),
  });
  const json = await res.json();
  if (!res.ok) {
    console.error('GHAR adminUpdateMarker error:', json);
    throw new Error(json.error || 'Failed to update marker');
  }
  return json.data;
}

export async function fetchDeletedMarkers() {
  const res = await apiFetch(`/admin/deleted-markers`, { headers: headers() });
  const json = await res.json();
  if (!res.ok) {
    console.error('GHAR fetchDeletedMarkers error:', json);
    throw new Error(json.error || 'Failed to fetch deleted markers');
  }
  return json.data || [];
}

export async function createBulletin(bulletin: {
  title: string;
  body: string;
  postcode_target?: string;
  is_urgent?: boolean;
  app_variant?: AppVariant | 'all';
}) {
  const res = await apiFetch(`/bulletins`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(bulletin),
  });
  const json = await res.json();
  if (!res.ok) {
    console.error('GHAR createBulletin error:', json);
    throw new Error(json.error || 'Failed to create bulletin');
  }
  return json.data;
}

export async function updateBulletin(id: string, updates: Record<string, any>) {
  const res = await apiFetch(`/bulletins/${id}`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify(updates),
  });
  const json = await res.json();
  if (!res.ok) {
    console.error('GHAR updateBulletin error:', json);
    throw new Error(json.error || 'Failed to update bulletin');
  }
  return json.data;
}

export async function deleteBulletin(id: string, adminEmail: string) {
  const res = await apiFetch(`/bulletins/${id}`, {
    method: 'DELETE',
    headers: headers(),
    body: JSON.stringify({ admin_email: adminEmail }),
  });
  const json = await res.json();
  if (!res.ok) {
    console.error('GHAR deleteBulletin error:', json);
    throw new Error(json.error || 'Failed to delete bulletin');
  }
  return json.data;
}

export async function updateBanners(
  adminEmail: string,
  banners: BannerRecord[],
) {
  const res = await apiFetch(`/admin/banners`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ admin_email: adminEmail, banners }),
  });
  const json = await res.json();
  if (!res.ok) {
    console.error('GHAR updateBanners error:', json);
    throw new Error(json.error || 'Failed to update banners');
  }
  return json.data || [];
}

// ─── ADMIN EMAIL SYSTEM ─────────────────────────────────────────

export async function uploadEmailHeaderSvg(svgContent: string, variant: 'light' | 'dark' = 'light'): Promise<string> {
  const res = await apiFetch(`/admin/upload-email-header`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ svg_content: svgContent, variant }),
  });
  const json = await res.json();
  if (!res.ok) {
    console.error('GHAR uploadEmailHeaderSvg error:', json);
    throw new Error(json.error || 'Failed to upload email header');
  }
  return json.data?.url || '';
}

export async function getEmailHeaderUrl(): Promise<{ light: string; dark: string }> {
  const res = await apiFetch(`/admin/email-header-url`, { headers: headers() });
  const json = await res.json();
  if (!res.ok) {
    console.error('GHAR getEmailHeaderUrl error:', json);
    return { light: '', dark: '' };
  }
  return {
    light: json.data?.light_url || json.data?.url || '',
    dark: json.data?.dark_url || '',
  };
}

export async function adminEmailSendOtp(adminEmail: string) {
  const res = await apiFetch(`/admin/email-send-otp`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ admin_email: adminEmail, app_variant: APP_VARIANT }),
  });
  const json = await res.json();
  if (!res.ok) {
    console.error('GHAR adminEmailSendOtp error:', json);
    throw new Error(json.error || 'Failed to send verification code');
  }
  return json.data;
}

export async function adminEmailSend(params: {
  adminEmail: string;
  code: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  bodyHtml: string;
  bodyPlain?: string;
  headerImageUrl?: string;
  headerImageUrlDark?: string;
  isMailMerge?: boolean;
}) {
  const res = await apiFetch(`/admin/email-send`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      admin_email: params.adminEmail,
      app_variant: APP_VARIANT,
      code: params.code,
      to: params.to,
      cc: params.cc || [],
      bcc: params.bcc || [],
      subject: params.subject,
      body_html: params.bodyHtml,
      body_plain: params.bodyPlain || '',
      header_image_url: params.headerImageUrl || '',
      header_image_url_dark: params.headerImageUrlDark || '',
      is_mail_merge: params.isMailMerge || false,
    }),
  });
  const json = await res.json();
  if (!res.ok) {
    console.error('GHAR adminEmailSend error:', json);
    throw new Error(json.error || 'Failed to send email');
  }
  return json.data;
}

export async function fetchEmailLogs() {
  const res = await apiFetch(`/admin/email-logs`, { headers: headers() });
  const json = await res.json();
  if (!res.ok) {
    console.error('GHAR fetchEmailLogs error:', json);
    throw new Error(json.error || 'Failed to fetch email logs');
  }
  return json.data || [];
}

export async function deleteEmailLog(id: string, adminEmail: string) {
  const res = await apiFetch(`/admin/email-logs/${id}`, {
    method: 'DELETE',
    headers: headers(),
    body: JSON.stringify({ admin_email: adminEmail }),
  });
  const json = await res.json();
  if (!res.ok) {
    console.error('GHAR deleteEmailLog error:', json);
    throw new Error(json.error || 'Failed to delete email log');
  }
  return json.data;
}

// ─── ADMIN IN-APP POPUP CAMPAIGNS ─────────────────────────────

export async function fetchAdminInAppPopupCampaigns(adminEmail: string): Promise<InAppPopupCampaignRecord[]> {
  const res = await apiFetch(`/admin/in-app-popup-campaigns?admin_email=${encodeURIComponent(adminEmail)}`, {
    headers: headers(),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error('GHAR fetchAdminInAppPopupCampaigns error:', json);
    throw new Error(json.error || 'Failed to fetch popup campaigns');
  }

  const campaigns = Array.isArray(json) ? json : json.data || [];
  return campaigns
    .map((campaign: any) => normalizeInAppPopupCampaignRecord(campaign))
    .filter((campaign: InAppPopupCampaignRecord | null): campaign is InAppPopupCampaignRecord => Boolean(campaign));
}

export async function createInAppPopupCampaign(params: InAppPopupCampaignSaveInput) {
  const res = await apiFetch('/admin/in-app-popup-campaigns', {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(buildInAppPopupCampaignPayload(params)),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error('GHAR createInAppPopupCampaign error:', json);
    throw new Error(json.error || 'Failed to create popup campaign');
  }

  return normalizeInAppPopupCampaignRecord(json.data ?? json);
}

export async function updateInAppPopupCampaign(id: string, params: InAppPopupCampaignSaveInput) {
  const res = await apiFetch(`/admin/in-app-popup-campaigns/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify(buildInAppPopupCampaignPayload(params)),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error('GHAR updateInAppPopupCampaign error:', json);
    throw new Error(json.error || 'Failed to update popup campaign');
  }

  return normalizeInAppPopupCampaignRecord(json.data ?? json);
}

export async function deleteInAppPopupCampaign(id: string, adminEmail: string) {
  const res = await apiFetch(`/admin/in-app-popup-campaigns/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: headers(),
    body: JSON.stringify({ admin_email: adminEmail }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error('GHAR deleteInAppPopupCampaign error:', json);
    throw new Error(json.error || 'Failed to delete popup campaign');
  }

  return json.data ?? json;
}

// ─── ADMIN NOTIFICATION CAMPAIGNS ───────────────────────────────

export async function sendNotificationCampaign(params: {
  adminEmail: string;
  title: string;
  body: string;
  link?: string;
  states: string[];
  universities: string[];
  suburbs: string[];
  postcodes: string[];
  emails: string[];
  appVariant?: TargetableAppVariant;
}) {
  const res = await apiFetch(`/admin/notification-campaigns`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      admin_email: params.adminEmail,
      title: params.title,
      body: params.body,
      message: params.body,
      link: params.link || '',
      target_states: params.states,
      target_universities: params.universities,
      target_suburbs: params.suburbs,
      target_postcodes: params.postcodes,
      target_emails: params.emails,
      app_variant: normalizeTargetableVariant(params.appVariant, APP_VARIANT),
    }),
  });

  let json: any = {};
  try {
    json = await res.json();
  } catch {
    json = {};
  }

  if (!res.ok) {
    const message = json.error || (res.status === 404
      ? 'Notification campaign endpoint is not available yet'
      : 'Failed to send notification campaign');
    console.error('GHAR sendNotificationCampaign error:', json);
    throw new Error(message);
  }

  return json.data ?? json;
}

export async function adminSendCampaign(params: {
  title: string;
  message: string;
  link?: string;
  admin_email: string;
  app_variant?: TargetableAppVariant;
  filters?: {
    states?: string[];
    universities?: string[];
    suburbs?: string[];
    postcodes?: string[];
    emails?: string[];
  };
}) {
  const raw = await sendNotificationCampaign({
    adminEmail: params.admin_email,
    title: params.title,
    body: params.message,
    link: params.link,
    states: params.filters?.states || [],
    universities: params.filters?.universities || [],
    suburbs: params.filters?.suburbs || [],
    postcodes: params.filters?.postcodes || [],
    emails: params.filters?.emails || [],
    appVariant: params.app_variant || APP_VARIANT,
  });
  const data = raw?.data ?? raw ?? {};

  return {
    success: true,
    target_users: Number(data?.target_users ?? data?.recipient_count ?? 0),
    target_devices: Number(data?.target_devices ?? data?.recipient_token_count ?? 0),
    status: data?.status ?? data?.delivery_status ?? 'queued',
    delivery_status: data?.delivery_status ?? data?.status ?? 'queued',
    delivery_mode: data?.delivery_mode ?? 'queue',
    delivered_token_count: Number(data?.delivered_token_count ?? 0),
    delivery_error: data?.delivery_error ?? '',
  };
}

export async function fetchAdminCampaigns(adminEmail: string) {
  const res = await apiFetch(`/admin/notification-campaigns?admin_email=${encodeURIComponent(adminEmail)}`, {
    headers: headers(),
  });

  let json: any = {};
  try {
    json = await res.json();
  } catch {
    json = {};
  }

  if (!res.ok) {
    console.error('GHAR fetchAdminCampaigns error:', json);
    throw new Error(json.error || 'Failed to fetch notification campaigns');
  }

  const campaigns = Array.isArray(json) ? json : json.data || [];
  return campaigns.map((campaign: any) => ({
    ...campaign,
    body: campaign.body ?? campaign.message ?? '',
    delivery_status: campaign.delivery_status ?? campaign.status ?? 'queued',
    app_variant: normalizeTargetableVariant(campaign.app_variant, 'ghar'),
    target_states: campaign.target_states ?? campaign.filters?.states ?? [],
    target_universities: campaign.target_universities ?? campaign.filters?.universities ?? [],
    target_suburbs: campaign.target_suburbs ?? campaign.filters?.suburbs ?? [],
    target_postcodes: campaign.target_postcodes ?? campaign.filters?.postcodes ?? [],
    target_emails: campaign.target_emails ?? campaign.filters?.emails ?? [],
  }));
}

export async function fetchAdminPushStats(adminEmail: string, appVariant: TargetableAppVariant = 'all') {
  const res = await apiFetch(`/admin/push/subscriptions`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ admin_email: adminEmail, app_variant: appVariant }),
  });

  let json: any = {};
  try {
    json = await res.json();
  } catch {
    json = {};
  }

  if (!res.ok) {
    console.error('GHAR fetchAdminPushStats error:', json);
    throw new Error(json.error || 'Failed to fetch push subscription stats');
  }

  const payload = json.data ?? json ?? {};
  const subscriptions = payload.subscriptions || [];
  const byPlatform = subscriptions.reduce((acc: Record<string, number>, record: any) => {
    const platform = String(record?.platform || 'unknown').trim().toLowerCase() || 'unknown';
    acc[platform] = (acc[platform] || 0) + 1;
    return acc;
  }, {});
  const byAppVariant = subscriptions.reduce((acc: Record<TargetableAppVariant, number>, record: any) => {
    const variant = normalizeTargetableVariant(record?.app_variant, 'ghar');
    acc[variant] = (acc[variant] || 0) + 1;
    return acc;
  }, { all: 0, ghar: 0, burb_mate: 0, setu_china: 0, jom_settle: 0, wheres_wolli: 0 } as Record<TargetableAppVariant, number>);

  const uniqueUsers = new Set(
    subscriptions
      .map((record: any) => String(record?.email || '').trim().toLowerCase())
      .filter(Boolean),
  );

  return {
    total_devices: Number(payload.count ?? payload.total_devices ?? subscriptions.length ?? 0),
    unique_users: Number(payload.unique_users ?? uniqueUsers.size),
    by_platform: payload.by_platform ?? byPlatform,
    by_app_variant: payload.by_app_variant ?? byAppVariant,
  };
}

export async function registerPushDevice(params: {
  email: string;
  token: string;
  platform: string;
  permission?: string;
  app_version?: string;
  device_name?: string;
  device_model?: string;
  state?: string;
  university?: string;
  suburb?: string;
  postcode?: string;
  app_variant?: AppVariant;
  app_identifier?: string;
  app_display_name?: string;
}) {
  return registerPushSubscription({
    email: params.email,
    token: params.token,
    platform: params.platform,
    permission: params.permission,
    app_version: params.app_version,
    device_name: params.device_name,
    device_model: params.device_model,
    state: params.state,
    university: params.university,
    suburb: params.suburb,
    postcode: params.postcode,
    app_variant: params.app_variant ?? APP_VARIANT,
    app_identifier: params.app_identifier ?? APP_CONFIG.urlScheme,
    app_display_name: params.app_display_name ?? APP_CONFIG.displayName,
  });
}

export async function unregisterPushDevice(params: {
  email?: string;
  token: string;
}) {
  return unregisterPushSubscription(params);
}

// ─── ADMIN USERS MANAGEMENT ─────────────────────────────────────

export async function fetchAllUsers(adminEmail: string) {
  const res = await apiFetch(`/admin/users`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ admin_email: adminEmail }),
  });
  const json = await res.json();
  if (!res.ok) {
    console.error('GHAR fetchAllUsers error:', json);
    throw new Error(json.error || 'Failed to fetch users');
  }
  return json.data || [];
}

export async function adminUpdateUser(targetEmail: string, adminEmail: string, updates: Record<string, any>) {
  const res = await apiFetch(`/admin/users/${encodeURIComponent(targetEmail)}`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify({ admin_email: adminEmail, updates }),
  });
  const json = await res.json();
  if (!res.ok) {
    console.error('GHAR adminUpdateUser error:', json);
    throw new Error(json.error || 'Failed to update user');
  }
  return json.data;
}

export async function adminDeleteUser(targetEmail: string, adminEmail: string) {
  const res = await apiFetch(`/admin/users/${encodeURIComponent(targetEmail)}`, {
    method: 'DELETE',
    headers: headers(),
    body: JSON.stringify({ admin_email: adminEmail }),
  });
  const json = await res.json();
  if (!res.ok) {
    console.error('GHAR adminDeleteUser error:', json);
    throw new Error(json.error || 'Failed to delete user');
  }
  return json.data;
}

export async function fetchUserStats(adminEmail: string) {
  const res = await apiFetch(`/admin/users/stats`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ admin_email: adminEmail }),
  });
  const json = await res.json();
  if (!res.ok) {
    console.error('GHAR fetchUserStats error:', json);
    throw new Error(json.error || 'Failed to fetch user stats');
  }
  return json.data || {};
}

// ─── REFERRALS ─────────────────────────────────────────────────

export type ReferralInviteStatus = 'invited' | 'joined' | 'joined_no_credit' | 'already_joined';

export interface ReferralInvite {
  id: string;
  inviter_email: string;
  invited_email: string;
  source_app_variant?: AppVariant;
  status: ReferralInviteStatus;
  joined_at?: string | null;
  credited_at?: string | null;
  ineligible_reason?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface ReferralInviteSummary {
  total: number;
  invited: number;
  joined: number;
  joined_no_credit: number;
  already_joined: number;
  points: number;
}

export interface ReferralLeaderboardRow {
  inviter_email: string;
  display_name: string;
  points: number;
  credited_count: number;
  pending_count: number;
  joined_count: number;
  joined_no_credit_count: number;
  already_joined_count: number;
  total_invites: number;
  first_invited_at?: string | null;
  latest_invited_at?: string | null;
}

export interface ReferralLeaderboardTotals {
  inviter_count: number;
  points: number;
  credited_count: number;
  pending_count: number;
  joined_count: number;
  total_invites: number;
}

export async function createReferralInvite(params: {
  inviterEmail: string;
  invitedEmail: string;
  sourceAppVariant?: AppVariant;
}): Promise<ReferralInvite> {
  const res = await apiFetch('/referrals/invites', {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      inviter_email: params.inviterEmail,
      invited_email: params.invitedEmail,
      source_app_variant: params.sourceAppVariant || APP_VARIANT,
    }),
  }, {
    useMirror: false,
  });
  const json = await readJsonResponse(res);
  if (!res.ok) {
    console.error('GHAR createReferralInvite error:', json);
    throw new Error(String((json as any).error || 'Failed to create referral invite'));
  }
  return (json as any).data;
}

export async function fetchMyReferralInvites(email: string): Promise<{
  invites: ReferralInvite[];
  summary: ReferralInviteSummary;
}> {
  const res = await apiFetch(`/referrals/me?email=${encodeURIComponent(email)}`, {
    headers: headers(),
  }, {
    useMirror: false,
  });
  const json = await readJsonResponse(res);
  if (!res.ok) {
    console.error('GHAR fetchMyReferralInvites error:', json);
    throw new Error(String((json as any).error || 'Failed to fetch referral invites'));
  }
  const data = (json as any).data || {};
  return {
    invites: Array.isArray(data.invites) ? data.invites : [],
    summary: {
      total: Number(data.summary?.total || 0),
      invited: Number(data.summary?.invited || 0),
      joined: Number(data.summary?.joined || 0),
      joined_no_credit: Number(data.summary?.joined_no_credit || 0),
      already_joined: Number(data.summary?.already_joined || 0),
      points: Number(data.summary?.points || 0),
    },
  };
}

export async function deleteReferralInvite(id: string, email: string): Promise<{ id: string; deleted: boolean }> {
  const res = await apiFetch(`/referrals/invites/${encodeURIComponent(id)}?email=${encodeURIComponent(email)}`, {
    method: 'DELETE',
    headers: headers(),
  }, {
    useMirror: false,
  });
  const json = await readJsonResponse(res);
  if (!res.ok) {
    console.error('GHAR deleteReferralInvite error:', json);
    throw new Error(String((json as any).error || 'Failed to delete referral invite'));
  }
  return (json as any).data || { id, deleted: true };
}

export async function fetchAdminReferralLeaderboard(adminEmail: string): Promise<{
  leaderboard: ReferralLeaderboardRow[];
  totals: ReferralLeaderboardTotals;
}> {
  const res = await apiFetch('/admin/referrals/leaderboard', {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ admin_email: adminEmail }),
  }, {
    useMirror: false,
  });
  const json = await readJsonResponse(res);
  if (!res.ok) {
    console.error('GHAR fetchAdminReferralLeaderboard error:', json);
    throw new Error(String((json as any).error || 'Failed to fetch referral leaderboard'));
  }
  const data = (json as any).data || {};
  return {
    leaderboard: Array.isArray(data.leaderboard)
      ? data.leaderboard.map((row: any) => ({
        ...row,
        points: Number(row?.points ?? row?.credited_count ?? 0),
        credited_count: Number(row?.credited_count || 0),
        pending_count: Number(row?.pending_count || 0),
        joined_count: Number(row?.joined_count || 0),
        joined_no_credit_count: Number(row?.joined_no_credit_count || 0),
        already_joined_count: Number(row?.already_joined_count || 0),
        total_invites: Number(row?.total_invites || 0),
      }))
      : [],
    totals: {
      inviter_count: Number(data.totals?.inviter_count || 0),
      points: Number(data.totals?.points || data.totals?.credited_count || 0),
      credited_count: Number(data.totals?.credited_count || 0),
      pending_count: Number(data.totals?.pending_count || 0),
      joined_count: Number(data.totals?.joined_count || 0),
      total_invites: Number(data.totals?.total_invites || 0),
    },
  };
}

// ─── PROPERTY PEDIGREE ──────────────────────────────────────────

export interface PropertyPedigree {
  address: string;
  total_flags: number;
  alerts: any[];
  units: Record<string, any[]>;
}

export async function fetchPropertyPedigree(lat: number, lng: number): Promise<PropertyPedigree | null> {
  const res = await apiFetch(`/property-pedigree?lat=${lat}&lng=${lng}`, {
    headers: headers(),
  });
  const json = await res.json();
  if (!res.ok) {
    console.error('GHAR fetchPropertyPedigree error:', json);
    return null;
  }
  return json.data;
}

// ─── NOMINATIM ADDRESS SEARCH ───────────────────────────────────

export interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  class?: string;
  type?: string;
  address?: {
    suburb?: string;
    postcode?: string;
    state?: string;
    city?: string;
    town?: string;
    road?: string;
    county?: string;
    neighbourhood?: string;
    house_number?: string;
  };
}

export type PublicToiletBounds = {
  west: number;
  south: number;
  east: number;
  north: number;
};

export type PublicToiletLocation = {
  id: string;
  objectId: number | null;
  facilityId: number | null;
  name: string;
  facilityType: string;
  address: string;
  town: string;
  state: string;
  lat: number;
  lng: number;
  openingHours: string;
  openingHoursNote: string;
  accessible: boolean | null;
  ambulant: boolean | null;
  unisex: boolean | null;
  allGender: boolean | null;
  babyChange: boolean | null;
  babyCareRoom: boolean | null;
  adultChange: boolean | null;
  changingPlaces: boolean | null;
  drinkingWater: boolean | null;
  shower: boolean | null;
  dumpPoint: boolean | null;
  sharpsDisposal: boolean | null;
  sanitaryDisposal: boolean | null;
  parkingAccessible: boolean | null;
  keyRequired: boolean | null;
  mlak24: boolean | null;
  mlakAfterHours: boolean | null;
  paymentRequired: boolean | null;
  accessNote: string;
  addressNote: string;
  toiletNote: string;
  url: string;
};

export type PublicToiletsResponse = {
  data: PublicToiletLocation[];
  count: number;
  truncated: boolean;
  source: string;
};

type ArcgisPublicToiletFeature = {
  attributes?: Record<string, unknown>;
  geometry?: {
    x?: unknown;
    y?: unknown;
  };
};

type OpenMapSearchOptions = {
  state?: string;
  lat?: number;
  lng?: number;
  limit?: number;
};

type OpenMapQueryVariant = {
  kind: 'raw' | 'stripped' | 'university';
  query: string;
};

type OpenMapCandidate = {
  score: number;
  result: NominatimResult;
};

const OPEN_MAP_BASE = 'https://photon.komoot.io/api/';
export const PUBLIC_TOILET_ARCGIS_QUERY_URL =
  'https://portal.data.nsw.gov.au/arcgis/rest/services/Hosted/National_Public_Toilet_Map/FeatureServer/0/query';
const PUBLIC_TOILET_ARCGIS_OUT_FIELDS = [
  'objectid',
  'facilityid',
  'url',
  'name',
  'facilitytype',
  'address1',
  'town',
  'state',
  'addressnote',
  'latitude',
  'longitude',
  'parkingaccessible',
  'keyrequired',
  'mlak24',
  'mlakafterhours',
  'paymentrequired',
  'accessnote',
  'adultchange',
  'changingplaces',
  'babychange',
  'babycareroom',
  'dumppoint',
  'openinghours',
  'openinghoursnote',
  'unisex',
  'allgender',
  'ambulant',
  'accessible',
  'toiletnote',
  'sharpsdisposal',
  'drinkingwater',
  'sanitarydisposal',
  'shower',
].join(',');
const OPEN_MAP_SEARCH_LIMIT = 8;
const PUBLIC_TOILETS_MAX_LIMIT = 30000;
const PUBLIC_TOILETS_ARCGIS_FALLBACK_LIMIT = 2000;
const OPEN_MAP_ROAD_PATTERN = /\b(street|st|road|rd|avenue|ave|highway|hwy|drive|dr|boulevard|blvd|lane|ln|way|circuit|crescent|place|pl|parade|close|terrace|court|ct)\b/i;
const OPEN_MAP_STATE_BIAS: Record<string, { label: string; lat: number; lng: number }> = {
  NSW: { label: 'New South Wales', lat: -33.8688, lng: 151.2093 },
  VIC: { label: 'Victoria', lat: -37.8136, lng: 144.9631 },
  QLD: { label: 'Queensland', lat: -27.4705, lng: 153.026 },
  WA: { label: 'Western Australia', lat: -31.9505, lng: 115.8605 },
  SA: { label: 'South Australia', lat: -34.9285, lng: 138.6007 },
  TAS: { label: 'Tasmania', lat: -42.8821, lng: 147.3272 },
  ACT: { label: 'Australian Capital Territory', lat: -35.2809, lng: 149.13 },
  NT: { label: 'Northern Territory', lat: -12.4634, lng: 130.8456 },
};

function normalizeAustralianSearchState(value: string | undefined) {
  const normalized = String(value || '').trim().toLowerCase().replace(/\./g, '');
  const map: Record<string, string> = {
    nsw: 'NSW',
    'new south wales': 'NSW',
    vic: 'VIC',
    victoria: 'VIC',
    qld: 'QLD',
    queensland: 'QLD',
    wa: 'WA',
    'western australia': 'WA',
    sa: 'SA',
    'south australia': 'SA',
    tas: 'TAS',
    tasmania: 'TAS',
    act: 'ACT',
    'australian capital territory': 'ACT',
    nt: 'NT',
    'northern territory': 'NT',
  };
  return map[normalized] || '';
}

function normalizeOpenMapText(value: unknown) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function toPublicToiletFiniteNumber(value: unknown) {
  if (value === null || value === undefined) return null;
  const raw = typeof value === 'number' ? value : String(value).trim();
  if (raw === '') return null;
  const numberValue = typeof raw === 'number' ? raw : Number(raw);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function toPublicToiletString(value: unknown) {
  return String(value || '').trim();
}

export function parsePublicToiletBoolean(value: unknown): boolean | null {
  const normalized = toPublicToiletString(value).toLowerCase();
  if (!normalized) return null;
  if (['true', 'yes', 'y', '1'].includes(normalized)) return true;
  if (['false', 'no', 'n', '0'].includes(normalized)) return false;
  return null;
}

function hasValidPublicToiletCoordinatePair(lat: unknown, lng: unknown) {
  const latitude = Number(lat);
  const longitude = Number(lng);
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180 &&
    !(latitude === 0 && longitude === 0)
  );
}

export function normalizePublicToiletLocation(raw: any): PublicToiletLocation | null {
  if (!raw || !hasValidPublicToiletCoordinatePair(raw.lat, raw.lng)) return null;
  const lat = Number(raw.lat);
  const lng = Number(raw.lng);
  const id = String(raw.id || raw.facilityId || raw.objectId || `${lat.toFixed(6)}-${lng.toFixed(6)}`).trim();
  if (!id) return null;
  return {
    id,
    objectId: Number.isFinite(Number(raw.objectId)) ? Number(raw.objectId) : null,
    facilityId: Number.isFinite(Number(raw.facilityId)) ? Number(raw.facilityId) : null,
    name: String(raw.name || 'Public toilet').trim() || 'Public toilet',
    facilityType: String(raw.facilityType || '').trim(),
    address: String(raw.address || '').trim(),
    town: String(raw.town || '').trim(),
    state: String(raw.state || '').trim(),
    lat,
    lng,
    openingHours: String(raw.openingHours || '').trim(),
    openingHoursNote: String(raw.openingHoursNote || '').trim(),
    accessible: typeof raw.accessible === 'boolean' ? raw.accessible : null,
    ambulant: typeof raw.ambulant === 'boolean' ? raw.ambulant : null,
    unisex: typeof raw.unisex === 'boolean' ? raw.unisex : null,
    allGender: typeof raw.allGender === 'boolean' ? raw.allGender : null,
    babyChange: typeof raw.babyChange === 'boolean' ? raw.babyChange : null,
    babyCareRoom: typeof raw.babyCareRoom === 'boolean' ? raw.babyCareRoom : null,
    adultChange: typeof raw.adultChange === 'boolean' ? raw.adultChange : null,
    changingPlaces: typeof raw.changingPlaces === 'boolean' ? raw.changingPlaces : null,
    drinkingWater: typeof raw.drinkingWater === 'boolean' ? raw.drinkingWater : null,
    shower: typeof raw.shower === 'boolean' ? raw.shower : null,
    dumpPoint: typeof raw.dumpPoint === 'boolean' ? raw.dumpPoint : null,
    sharpsDisposal: typeof raw.sharpsDisposal === 'boolean' ? raw.sharpsDisposal : null,
    sanitaryDisposal: typeof raw.sanitaryDisposal === 'boolean' ? raw.sanitaryDisposal : null,
    parkingAccessible: typeof raw.parkingAccessible === 'boolean' ? raw.parkingAccessible : null,
    keyRequired: typeof raw.keyRequired === 'boolean' ? raw.keyRequired : null,
    mlak24: typeof raw.mlak24 === 'boolean' ? raw.mlak24 : null,
    mlakAfterHours: typeof raw.mlakAfterHours === 'boolean' ? raw.mlakAfterHours : null,
    paymentRequired: typeof raw.paymentRequired === 'boolean' ? raw.paymentRequired : null,
    accessNote: String(raw.accessNote || '').trim(),
    addressNote: String(raw.addressNote || '').trim(),
    toiletNote: String(raw.toiletNote || '').trim(),
    url: String(raw.url || '').trim(),
  };
}

export function normalizeArcgisPublicToiletFeature(feature: ArcgisPublicToiletFeature): PublicToiletLocation | null {
  const attributes = feature?.attributes || {};
  const objectId = toPublicToiletFiniteNumber(attributes.objectid);
  const facilityId = toPublicToiletFiniteNumber(attributes.facilityid);
  const lng = toPublicToiletFiniteNumber(feature?.geometry?.x) ?? toPublicToiletFiniteNumber(attributes.longitude);
  const lat = toPublicToiletFiniteNumber(feature?.geometry?.y) ?? toPublicToiletFiniteNumber(attributes.latitude);
  if (!hasValidPublicToiletCoordinatePair(lat, lng)) return null;

  return normalizePublicToiletLocation({
    id: facilityId != null ? `toilet-${facilityId}` : `toilet-object-${objectId ?? `${Number(lat).toFixed(6)}-${Number(lng).toFixed(6)}`}`,
    objectId,
    facilityId,
    name: toPublicToiletString(attributes.name) || 'Public toilet',
    facilityType: toPublicToiletString(attributes.facilitytype),
    address: toPublicToiletString(attributes.address1),
    town: toPublicToiletString(attributes.town),
    state: toPublicToiletString(attributes.state),
    lat,
    lng,
    openingHours: toPublicToiletString(attributes.openinghours),
    openingHoursNote: toPublicToiletString(attributes.openinghoursnote),
    accessible: parsePublicToiletBoolean(attributes.accessible),
    ambulant: parsePublicToiletBoolean(attributes.ambulant),
    unisex: parsePublicToiletBoolean(attributes.unisex),
    allGender: parsePublicToiletBoolean(attributes.allgender),
    babyChange: parsePublicToiletBoolean(attributes.babychange),
    babyCareRoom: parsePublicToiletBoolean(attributes.babycareroom),
    adultChange: parsePublicToiletBoolean(attributes.adultchange),
    changingPlaces: parsePublicToiletBoolean(attributes.changingplaces),
    drinkingWater: parsePublicToiletBoolean(attributes.drinkingwater),
    shower: parsePublicToiletBoolean(attributes.shower),
    dumpPoint: parsePublicToiletBoolean(attributes.dumppoint),
    sharpsDisposal: parsePublicToiletBoolean(attributes.sharpsdisposal),
    sanitaryDisposal: parsePublicToiletBoolean(attributes.sanitarydisposal),
    parkingAccessible: parsePublicToiletBoolean(attributes.parkingaccessible),
    keyRequired: parsePublicToiletBoolean(attributes.keyrequired),
    mlak24: parsePublicToiletBoolean(attributes.mlak24),
    mlakAfterHours: parsePublicToiletBoolean(attributes.mlakafterhours),
    paymentRequired: parsePublicToiletBoolean(attributes.paymentrequired),
    accessNote: toPublicToiletString(attributes.accessnote),
    addressNote: toPublicToiletString(attributes.addressnote),
    toiletNote: toPublicToiletString(attributes.toiletnote),
    url: toPublicToiletString(attributes.url),
  });
}

export function buildPublicToiletsQueryParams(bounds: PublicToiletBounds, limit?: number) {
  const west = Number(bounds.west);
  const south = Number(bounds.south);
  const east = Number(bounds.east);
  const north = Number(bounds.north);
  if (
    !Number.isFinite(west) ||
    !Number.isFinite(south) ||
    !Number.isFinite(east) ||
    !Number.isFinite(north) ||
    west < -180 ||
    east > 180 ||
    south < -90 ||
    north > 90 ||
    west >= east ||
    south >= north
  ) {
    throw new Error('Invalid public toilet map bounds.');
  }
  const params = new URLSearchParams({
    west: String(west),
    south: String(south),
    east: String(east),
    north: String(north),
  });
  if (limit !== undefined) {
    const normalizedLimit = Math.max(1, Math.min(Math.floor(Number(limit) || PUBLIC_TOILETS_MAX_LIMIT), PUBLIC_TOILETS_MAX_LIMIT));
    params.set('limit', String(normalizedLimit));
  }
  return params;
}

export function buildPublicToiletArcgisQueryUrl(bounds: PublicToiletBounds, limit?: number) {
  const params = buildPublicToiletsQueryParams(bounds, limit);
  const geometry = {
    xmin: Number(params.get('west')),
    ymin: Number(params.get('south')),
    xmax: Number(params.get('east')),
    ymax: Number(params.get('north')),
    spatialReference: { wkid: 4326 },
  };
  const recordCount = Math.max(
    1,
    Math.min(Math.floor(Number(params.get('limit')) || PUBLIC_TOILETS_ARCGIS_FALLBACK_LIMIT), PUBLIC_TOILETS_ARCGIS_FALLBACK_LIMIT),
  );
  const arcgisParams = new URLSearchParams({
    where: '1=1',
    geometry: JSON.stringify(geometry),
    geometryType: 'esriGeometryEnvelope',
    inSR: '4326',
    spatialRel: 'esriSpatialRelIntersects',
    outFields: PUBLIC_TOILET_ARCGIS_OUT_FIELDS,
    returnGeometry: 'true',
    outSR: '4326',
    orderByFields: 'objectid',
    resultOffset: '0',
    resultRecordCount: String(recordCount),
    f: 'json',
  });
  return `${PUBLIC_TOILET_ARCGIS_QUERY_URL}?${arcgisParams.toString()}`;
}

function isRecoverablePublicToiletProxyError(error: unknown) {
  const message = String(error instanceof Error ? error.message : error || '').toLowerCase();
  return (
    message.includes('404') ||
    message.includes('not found') ||
    message.includes('502') ||
    message.includes('failed to fetch') ||
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('timed out') ||
    message.includes('request failed')
  );
}

async function fetchPublicToiletsFromArcgis(
  bounds: PublicToiletBounds,
  options: { limit?: number; signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<PublicToiletsResponse> {
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), options.timeoutMs ?? 25000);
  const signal = mergeAbortSignals(options.signal, controller.signal);
  try {
    const res = await fetch(buildPublicToiletArcgisQueryUrl(bounds, options.limit), {
      headers: { Accept: 'application/json' },
      signal,
    });
    const json = await readJsonResponse(res);
    if (!res.ok || (json as any)?.error?.message) {
      throw new Error(String((json as any)?.error?.message || (json as any)?.raw || `ArcGIS public toilet request failed (${res.status})`));
    }
    const features = Array.isArray((json as any).features) ? (json as any).features : [];
    const data = features
      .map(normalizeArcgisPublicToiletFeature)
      .filter(Boolean) as PublicToiletLocation[];
    return {
      data,
      count: data.length,
      truncated: Boolean((json as any).exceededTransferLimit),
      source: 'National Public Toilet Map',
    };
  } finally {
    globalThis.clearTimeout(timeout);
  }
}

function stripAdministrativeAreaPrefix(value: string) {
  return String(value || '')
    .trim()
    .replace(/^(?:city|shire|town|district|municipality|region|regional council)\s+of\s+/i, '')
    .replace(/\b(?:regional council|city council|shire council)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildOpenMapQueryVariants(query: string) {
  const cleanQuery = String(query || '').trim();
  const strippedQuery = stripAdministrativeAreaPrefix(cleanQuery);
  const variants: OpenMapQueryVariant[] = [];
  const seen = new Set<string>();
  const pushVariant = (kind: OpenMapQueryVariant['kind'], value: string) => {
    const normalized = normalizeOpenMapText(value);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    variants.push({ kind, query: value.trim() });
  };
  pushVariant('raw', cleanQuery);
  pushVariant('stripped', strippedQuery);
  if (
    strippedQuery &&
    !/\b(university|college|campus|school)\b/i.test(strippedQuery) &&
    !/\d/.test(strippedQuery) &&
    !OPEN_MAP_ROAD_PATTERN.test(strippedQuery) &&
    strippedQuery.split(/\s+/).length <= 3
  ) {
    pushVariant('university', `${strippedQuery} university`);
  }
  return variants;
}

function buildOpenMapDisplayName(properties: Record<string, any>) {
  const road = [properties.housenumber, properties.street].map((value) => String(value || '').trim()).filter(Boolean).join(' ');
  return [
    properties.name,
    road,
    properties.suburb || properties.district || properties.county,
    properties.city || properties.town || properties.locality,
    properties.state,
    properties.postcode,
    properties.country,
  ]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .filter((value, index, array) => array.indexOf(value) === index)
    .join(', ');
}

function getOpenMapTypeWeight(type: string, addressLikeQuery: boolean) {
  switch (type) {
    case 'station':
    case 'halt':
    case 'stop':
    case 'bus_stop':
    case 'tram_stop':
    case 'platform':
      return 110;
    case 'university':
    case 'college':
      return 105;
    case 'suburb':
    case 'neighbourhood':
    case 'quarter':
    case 'locality':
    case 'village':
    case 'town':
    case 'city':
      return 95;
    case 'municipality':
    case 'administrative':
      return 80;
    case 'school':
    case 'hospital':
    case 'library':
    case 'mall':
      return 60;
    case 'residential':
    case 'tertiary':
    case 'service':
    case 'road':
    case 'house':
    case 'building':
    case 'apartments':
      return addressLikeQuery ? 70 : -70;
    default:
      return addressLikeQuery ? 20 : 0;
  }
}

function scoreOpenMapFeature(
  properties: Record<string, any>,
  displayName: string,
  query: string,
  variant: OpenMapQueryVariant['kind'],
  targetState: string,
) {
  const normalizedQuery = normalizeOpenMapText(stripAdministrativeAreaPrefix(query) || query);
  const normalizedName = normalizeOpenMapText(properties.name || displayName);
  const normalizedDisplay = normalizeOpenMapText(displayName);
  const resultState = normalizeAustralianSearchState(properties.state);
  const resultType = normalizeOpenMapText(properties.osm_value || properties.type || properties.osm_key);
  const addressLikeQuery = /\d/.test(query) || OPEN_MAP_ROAD_PATTERN.test(query);
  const queryWantsAdministrativeArea = /^(?:city|shire|town|district|municipality|region)\s+of\b/i.test(query);

  let score = 0;
  if (targetState) {
    score += resultState === targetState ? 280 : -120;
  }
  if (normalizedName === normalizedQuery) score += 180;
  else if (normalizedName.startsWith(normalizedQuery)) score += 130;
  else if (normalizedDisplay.includes(normalizedQuery)) score += 70;

  if (variant === 'raw') score += 30;
  if (variant === 'stripped') score += 18;
  if (variant === 'university') score += /\b(university|college|campus)\b/.test(resultType) ? 24 : -10;

  if (queryWantsAdministrativeArea && /^(city|municipality|administrative)$/.test(resultType)) {
    score += 40;
  }
  if (!addressLikeQuery && /\d/.test(displayName)) score -= 25;

  score += getOpenMapTypeWeight(resultType, addressLikeQuery);
  return score;
}

function hashOpenMapId(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash) || 1;
}

async function fetchOpenMapPhotonCandidates(
  query: string,
  variant: OpenMapQueryVariant['kind'],
  options: OpenMapSearchOptions = {},
): Promise<OpenMapCandidate[]> {
  const stateCode = normalizeAustralianSearchState(options.state);
  const stateBias = stateCode ? OPEN_MAP_STATE_BIAS[stateCode] : null;
  const limit = Math.max(Number(options.limit || OPEN_MAP_SEARCH_LIMIT), OPEN_MAP_SEARCH_LIMIT);
  const params = new URLSearchParams({
    q: query,
    limit: String(Math.max(limit * 2, 10)),
    lang: 'en',
  });
  const biasLat = Number.isFinite(options.lat) ? options.lat : stateBias?.lat;
  const biasLng = Number.isFinite(options.lng) ? options.lng : stateBias?.lng;
  if (Number.isFinite(biasLat) && Number.isFinite(biasLng)) {
    params.set('lat', String(biasLat));
    params.set('lon', String(biasLng));
  }

  let json: any;
  if (isNativeShell()) {
    const response = await CapacitorHttp.get({
      url: OPEN_MAP_BASE,
      params: Object.fromEntries(params.entries()),
      headers: {
        Accept: 'application/json',
      },
      responseType: 'json',
      connectTimeout: 12000,
      readTimeout: 12000,
    });
    if (response.status < 200 || response.status >= 300) {
      throw new Error(`Open map search failed (${response.status})`);
    }
    json = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
  } else {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12000);
    try {
      const res = await fetch(`${OPEN_MAP_BASE}?${params.toString()}`, {
        signal: controller.signal,
      });
      if (!res.ok) {
        throw new Error(`Open map search failed (${res.status})`);
      }
      json = await res.json();
    } finally {
      window.clearTimeout(timeout);
    }
  }

  const features = Array.isArray(json?.features) ? json.features : [];
  return features
    .map((feature: any) => {
      const properties = feature?.properties || {};
      const coordinates = Array.isArray(feature?.geometry?.coordinates) ? feature.geometry.coordinates : [];
      const lng = Number(coordinates[0]);
      const lat = Number(coordinates[1]);
      const country = String(properties.country || '').trim();
      if (!country || country.toLowerCase() !== 'australia') return null;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      const displayName = buildOpenMapDisplayName(properties);
      if (!displayName) return null;
      const score = scoreOpenMapFeature(properties, displayName, query, variant, stateCode);
      return {
        score,
        result: {
          place_id: hashOpenMapId(`${properties.osm_id || displayName}|${lat.toFixed(6)}|${lng.toFixed(6)}`),
          display_name: displayName,
          lat: String(lat),
          lon: String(lng),
          class: String(properties.osm_key || '').trim() || undefined,
          type: String(properties.osm_value || properties.type || '').trim() || undefined,
          address: {
            suburb: String(properties.suburb || properties.neighbourhood || properties.district || '').trim() || undefined,
            postcode: String(properties.postcode || '').trim() || undefined,
            state: String(properties.state || '').trim() || undefined,
            city: String(properties.city || properties.locality || '').trim() || undefined,
            town: String(properties.town || '').trim() || undefined,
            road: String(properties.street || '').trim() || undefined,
            county: String(properties.county || '').trim() || undefined,
            neighbourhood: String(properties.neighbourhood || '').trim() || undefined,
            house_number: String(properties.housenumber || '').trim() || undefined,
          },
        },
      };
    })
    .filter(Boolean) as OpenMapCandidate[];
}

export type CanonicalFuelCategory =
  | 'unleaded_up'
  | 'premium_up'
  | 'diesel'
  | 'brand_diesel'
  | 'lpg'
  | 'e85';

export type FuelStateCode =
  | 'NSW'
  | 'VIC'
  | 'QLD'
  | 'TAS'
  | 'WA'
  | 'SA'
  | 'ACT'
  | 'NT';

export type FuelInsightTool =
  | 'overview'
  | 'forecast'
  | 'trends'
  | 'timing'
  | 'savings'
  | 'news';

export interface FuelStationResult {
  id: string;
  brand: string;
  name: string;
  address: string;
  suburb?: string;
  state: string;
  fuel_category: CanonicalFuelCategory;
  fuel_type: string;
  price_cpl: number | null;
  drive_distance_km: number | null;
  drive_minutes: number | null;
  straight_distance_km: number | null;
  lat: number;
  lng: number;
  source: 'nsw-fuel-api-v2' | 'tas-fuelcheck-api' | 'wa-fuelwatch-rss' | 'vic-fair-fuel-open-data' | 'qld-fuel-prices-direct' | 'sa-fuel-prices-direct';
}

export interface NearbyFuelResponse {
  supported: boolean;
  state: string;
  targetLabel: string;
  message?: string;
  results: FuelStationResult[];
}

export interface FuelTrendPoint {
  dayKey: string;
  label: string;
  averageCpl: number | null;
  minCpl: number | null;
  maxCpl: number | null;
  stationCount: number;
}

export interface FuelTrendInsight {
  status: 'ready' | 'building' | 'coming_soon';
  currentAverageCpl: number | null;
  deltaCpl: number | null;
  deltaPercent: number | null;
  stationCount: number;
  lastUpdated: string;
  message?: string;
  points: FuelTrendPoint[];
}

export interface FuelOverviewInsight {
  currentAverageCpl: number | null;
  cheapestPriceCpl: number | null;
  spreadCpl: number | null;
  stationCount: number;
  stateRank: number | null;
  statesCompared: number;
  marketPositionLabel: string;
  volatilityIndex: number | null;
  volatilityLabel: string;
  summary: string;
}

export interface FuelBestTimeInsight {
  status: 'ready' | 'building' | 'coming_soon';
  bestDay: string | null;
  worstDay: string | null;
  estimatedSaveCpl: number | null;
  message?: string;
  weekdaySeries: Array<{
    day: string;
    averageCpl: number | null;
  }>;
}

export interface FuelSavingsDefaults {
  averagePriceCpl: number | null;
  cheapestPriceCpl: number | null;
  stationCount: number;
  sourceNote?: string;
}

export interface FuelForecastPoint {
  dayKey: string;
  label: string;
  predictedCpl: number | null;
  lowerCpl: number | null;
  upperCpl: number | null;
  actualCpl?: number | null;
}

export interface FuelForecastModelSummary {
  methodologySummary: string;
  explanation: string;
  disclaimer: string;
  drivers: string[];
  newsSummary?: string;
  trainedOnDays?: number;
  trainingWindowDays?: number;
  trainedAt?: string;
  retentionNote?: string;
}

export interface FuelForecastAccuracy {
  status: 'ready' | 'building';
  accuracyPercent: number | null;
  directionAccuracyPercent: number | null;
  meanAbsoluteErrorCpl: number | null;
  evaluatedPoints: number;
  confidenceScore: number;
  confidenceLabel: string;
  message?: string;
}

export interface FuelForecastResponse {
  status: 'ready' | 'building' | 'coming_soon';
  generatedAt: string;
  daysHorizon: number;
  points: FuelForecastPoint[];
  summary: FuelForecastModelSummary;
  accuracy: FuelForecastAccuracy;
}

export interface FuelCoverageInsight {
  daysCollected: number;
  daysNeeded: number;
  historyStatus: 'building' | 'partial' | 'ready';
  lastUpdated: string;
}

export interface FuelStateComparisonPoint {
  state: FuelStateCode;
  averagePriceCpl: number | null;
  rank: number | null;
}

export interface FuelInsightsResponse {
  state: FuelStateCode;
  fuel: CanonicalFuelCategory;
  tool: FuelInsightTool;
  supportedStates: FuelStateCode[];
  comingSoonStates: FuelStateCode[];
  sourceNote?: string;
  coverage: FuelCoverageInsight;
  overview: FuelOverviewInsight;
  comparison: FuelStateComparisonPoint[];
  forecast: FuelForecastResponse;
  featuredNews: FuelNewsItem[];
  trend: FuelTrendInsight;
  bestTime: FuelBestTimeInsight;
  savings: FuelSavingsDefaults;
}

export interface FuelNewsItem {
  id: string;
  title: string;
  link: string;
  source: string;
  publishedAt: string;
  summary?: string;
}

export type ShoppingRetailer = 'woolworths' | 'coles' | 'aldi';
export type ShoppingStoreRefKind = 'woolworths_store' | 'coles_store' | 'aldi_merchant';
export type ShoppingStoreSource = 'official' | 'osm_fallback';

export type RetailerSearchStatus = 'ready' | 'unavailable' | 'error';

export interface ShoppingProductResult {
  retailer: ShoppingRetailer;
  name: string;
  brand?: string;
  price: number | null;
  wasPrice?: number | null;
  unit?: string;
  packageSize?: string;
  imageUrl?: string;
  productUrl?: string;
  inStock?: boolean;
  aisleLocation?: string;
  sourceCategory?: string;
  sourceDepartment?: string;
}

export interface ShoppingStoreSummary {
  id: string;
  name: string;
  address: string;
  suburb?: string;
  state?: string;
  postcode?: string;
  lat: number;
  lng: number;
  distanceKm?: number | null;
  storeRef: string | null;
  storeRefKind: ShoppingStoreRefKind;
  source: ShoppingStoreSource;
}

export type ShoppingStoreSearchResult = ShoppingStoreSummary;

export type ShoppingListCategory =
  | 'Fresh Produce'
  | 'Dairy & Eggs'
  | 'Bakery'
  | 'Meat & Seafood'
  | 'Pantry'
  | 'Frozen'
  | 'Fridge'
  | 'Snacks'
  | 'Drinks'
  | 'Health & Beauty'
  | 'Household'
  | 'Baby'
  | 'Other';

export interface ShoppingListItem {
  id: string;
  productKey: string;
  storeId: string;
  storeName: string;
  retailer?: ShoppingRetailer;
  name: string;
  brand?: string;
  price: number | null;
  wasPrice?: number | null;
  quantity: number;
  checked: boolean;
  category: ShoppingListCategory;
  packageSize?: string;
  unit?: string;
  imageUrl?: string;
  productUrl?: string;
  inStock?: boolean;
  aisleLocation?: string;
  sourceCategory?: string;
  sourceDepartment?: string;
  addedAt: string;
}

export interface ShoppingListState {
  selectedStore: ShoppingStoreSummary | null;
  items: ShoppingListItem[];
  updatedAt: string;
}

export interface ShoppingRetailerResults {
  retailer: ShoppingRetailer;
  status: RetailerSearchStatus;
  message?: string;
  results: ShoppingProductResult[];
}

export interface ShoppingSearchResponse {
  query: string;
  limit: number;
  retailers: Record<ShoppingRetailer, ShoppingRetailerResults>;
}

type ShoppingStoreSearchResponse = {
  retailer: ShoppingRetailer;
  results: ShoppingStoreSearchResult[];
};

const SHOPPING_RETAILER_LABELS: Record<ShoppingRetailer, string> = {
  woolworths: 'Woolworths',
  coles: 'Coles',
  aldi: 'ALDI',
};
const SHOPPING_RETAILER_NAME_PATTERNS: Record<ShoppingRetailer, RegExp> = {
  woolworths: /\b(woolworths|woolies|woolworths metro)\b/i,
  coles: /\bcoles\b/i,
  aldi: /\baldi\b/i,
};

function normalizeShoppingUnit(value: unknown) {
  const text = String(value || '').trim();
  if (!text) return undefined;
  const lowered = text.toLowerCase();
  if (lowered.includes('kg')) return 'kg';
  if (lowered.includes('g') && !lowered.includes('kg')) return 'g';
  if (lowered.includes('ml')) return 'ml';
  if (lowered.includes('l') && !lowered.includes('ml')) return 'L';
  if (lowered.includes('each') || lowered === 'ea') return 'each';
  if (lowered.includes('pack') || lowered.includes('pk')) return 'pack';
  return undefined;
}

function parseShoppingCurrency(value: unknown, divisor = 1) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value / divisor;
  }

  const text = String(value || '').trim();
  if (!text) return null;
  const normalized = text.replace(/[^0-9.-]+/g, '');
  if (!normalized) return null;
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount / divisor : null;
}

function buildWoolworthsProductUrl(product: any) {
  const stockcode = String(product?.Stockcode || '').trim();
  const slug = String(product?.UrlFriendlyName || '').trim();
  if (!stockcode || !slug) return undefined;
  return `https://www.woolworths.com.au/shop/productdetails/${stockcode}/${slug}`;
}

function collectWoolworthsProducts(payload: any): any[] {
  const groups = Array.isArray(payload?.Products) ? payload.Products : [];
  const products: any[] = [];

  groups.forEach((group: any) => {
    const nestedProducts = Array.isArray(group?.Products)
      ? group.Products
      : group && typeof group === 'object' && 'Stockcode' in group
        ? [group]
        : [];
    nestedProducts.forEach((product: any) => products.push(product));
  });

  return products;
}

function safeParseJsonArray(value: unknown) {
  const text = String(value || '').trim();
  if (!text) return [];
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function firstTextValue(values: unknown[]) {
  for (const value of values) {
    const text = String(value || '').trim();
    if (text) return text;
  }
  return undefined;
}

function extractWoolworthsCategoryMeta(product: any) {
  const attributes = product?.AdditionalAttributes && typeof product.AdditionalAttributes === 'object'
    ? product.AdditionalAttributes
    : {};

  const departmentNodes = safeParseJsonArray(
    attributes.PiesProductDepartmentsjson || attributes.piesdepartmentnamesjson,
  );
  const categoryNodes = safeParseJsonArray(
    attributes.piescategorynamesjson || attributes.PiesCategoryNamesjson,
  );
  const subcategoryNodes = safeParseJsonArray(
    attributes.piessubcategorynamesjson || attributes.PiesSubCategoryNamesjson,
  );

  const sourceDepartment = firstTextValue([
    departmentNodes[0]?.Description,
    departmentNodes[0],
    attributes.sapdepartmentname,
  ]);
  const sourceCategory = firstTextValue([
    categoryNodes[0],
    subcategoryNodes[0],
    attributes.sapcategoryname,
    attributes.sapsubcategoryname,
  ]);

  return {
    sourceDepartment,
    sourceCategory,
  };
}

function extractWoolworthsAisleLocation(product: any) {
  const attributes = product?.AdditionalAttributes && typeof product.AdditionalAttributes === 'object'
    ? product.AdditionalAttributes
    : {};

  return firstTextValue([
    product?.Aisle,
    product?.Location,
    product?.Shelf,
    attributes.aisle,
    attributes.location,
    attributes.shelf,
  ]);
}

function normalizeWoolworthsProduct(product: any): ShoppingProductResult | null {
  const name = String(product?.DisplayName || product?.Name || '').trim();
  if (!name) return null;

  const packageSize = String(product?.PackageSize || '').trim() || undefined;
  const unit =
    normalizeShoppingUnit(packageSize) ||
    normalizeShoppingUnit(product?.CupMeasure) ||
    normalizeShoppingUnit(product?.CupString) ||
    normalizeShoppingUnit(product?.Unit);
  const rawPrice = Number(product?.Price ?? product?.InstorePrice ?? product?.WasPrice);
  const rawWasPrice = Number(product?.WasPrice ?? product?.InstoreWasPrice);
  const imageUrl =
    String(product?.MediumImageFile || product?.LargeImageFile || product?.SmallImageFile || '').trim() || undefined;
  const brand = String(product?.Brand || '').trim() || undefined;
  const { sourceCategory, sourceDepartment } = extractWoolworthsCategoryMeta(product);
  const aisleLocation = extractWoolworthsAisleLocation(product);

  return {
    retailer: 'woolworths',
    name,
    brand,
    price: Number.isFinite(rawPrice) ? rawPrice : null,
    wasPrice: Number.isFinite(rawWasPrice) ? rawWasPrice : undefined,
    unit,
    packageSize,
    imageUrl,
    productUrl: buildWoolworthsProductUrl(product),
    inStock: typeof product?.IsInStock === 'boolean' ? product.IsInStock : undefined,
    aisleLocation,
    sourceCategory,
    sourceDepartment,
  };
}

function buildAldiProductUrl(product: any) {
  const slug = String(product?.urlSlugText || '').trim();
  const sku = String(product?.sku || '').trim();
  if (!slug || !sku) return undefined;
  return `https://www.aldi.com.au/product/${slug}-${sku}`;
}

function buildAldiImageUrl(product: any) {
  const asset = Array.isArray(product?.assets)
    ? product.assets.find((item: any) => String(item?.url || '').trim())
    : null;
  const template = String(asset?.url || '').trim();
  if (!template) return undefined;
  return template.replace('{width}', '640').replace('{slug}', String(product?.urlSlugText || '').trim());
}

function normalizeAldiProduct(product: any): ShoppingProductResult | null {
  const name = String(product?.name || '').trim();
  if (!name) return null;

  const categories = Array.isArray(product?.categories) ? product.categories : [];
  const packageSize = String(product?.sellingSize || '').trim() || undefined;
  const comparisonDisplay = firstTextValue([
    product?.price?.comparisonDisplay,
    product?.price?.perUnitDisplay,
  ]);
  const wasPrice = parseShoppingCurrency(product?.price?.wasPriceDisplay);

  return {
    retailer: 'aldi',
    name,
    brand: String(product?.brandName || '').trim() || undefined,
    price: parseShoppingCurrency(product?.price?.amountRelevant ?? product?.price?.amount, 100),
    wasPrice: wasPrice ?? undefined,
    unit:
      normalizeShoppingUnit(comparisonDisplay) ||
      normalizeShoppingUnit(packageSize) ||
      normalizeShoppingUnit(product?.quantityUnit),
    packageSize,
    imageUrl: buildAldiImageUrl(product),
    productUrl: buildAldiProductUrl(product),
    inStock: product?.discontinued === true ? false : undefined,
    sourceDepartment: String(categories[0]?.name || '').trim() || undefined,
    sourceCategory:
      String(categories[categories.length - 1]?.name || '').trim() ||
      String(categories[0]?.name || '').trim() ||
      undefined,
  };
}

function normalizeColesProductUrl(value: unknown) {
  const text = String(value || '').trim();
  if (!text) return undefined;
  if (text.startsWith('http://') || text.startsWith('https://')) return text;
  return `https://www.coles.com.au${text.startsWith('/') ? text : `/${text}`}`;
}

function normalizeColesProduct(product: any): ShoppingProductResult | null {
  const name = firstTextValue([
    product?.name,
    product?.displayName,
    product?.productDisplayName,
    product?.description,
    product?.title,
  ]);
  if (!name) return null;

  const packageSize = firstTextValue([
    product?.packageSize,
    product?.size,
    product?.sizeDisplay,
    product?.sellingSize,
    product?.details?.size,
  ]);
  const pricing = product?.pricing && typeof product.pricing === 'object' ? product.pricing : {};
  const availability =
    typeof product?.availability === 'boolean'
      ? product.availability
      : typeof pricing?.availability === 'boolean'
        ? pricing.availability
        : undefined;

  return {
    retailer: 'coles',
    name,
    brand: firstTextValue([product?.brand, product?.brandName, product?.details?.brand]),
    price:
      parseShoppingCurrency(pricing?.now) ??
      parseShoppingCurrency(pricing?.price) ??
      parseShoppingCurrency(pricing?.currentPrice) ??
      parseShoppingCurrency(pricing?.offerPrice) ??
      parseShoppingCurrency(product?.price),
    wasPrice:
      parseShoppingCurrency(pricing?.was) ??
      parseShoppingCurrency(pricing?.wasPrice) ??
      parseShoppingCurrency(pricing?.originalPrice) ??
      undefined,
    unit:
      normalizeShoppingUnit(pricing?.unitPrice) ||
      normalizeShoppingUnit(pricing?.comparison) ||
      normalizeShoppingUnit(packageSize),
    packageSize: packageSize || undefined,
    imageUrl: firstTextValue([
      product?.imageUrl,
      product?.imageUri,
      product?.imageUris?.[0]?.uri,
      product?.imageUris?.[0],
      product?.details?.imageUrl,
    ]),
    productUrl: normalizeColesProductUrl(
      firstTextValue([
        product?.productUrl,
        product?.detailsUrl,
        product?.url,
        product?.seoUrl,
      ]),
    ),
    inStock: availability,
    aisleLocation: firstTextValue([product?.aisle, product?.location]),
    sourceCategory: firstTextValue([product?.categoryName, product?.category]),
    sourceDepartment: firstTextValue([product?.departmentName, product?.department]),
  };
}

export type OverpassElement = {
  id: number;
  type: 'node' | 'way' | 'relation';
  lat?: number;
  lon?: number;
  center?: { lat?: number; lon?: number };
  tags?: Record<string, string>;
};

type OverpassPayload = {
  elements: OverpassElement[];
  error?: string;
};

const DIRECT_OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

function extractOverpassErrorMessage(payload: unknown, status?: number) {
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    const parts = [record.error, record.message, record.remark, record.raw, status ? `HTTP ${status}` : '']
      .map((value) => String(value || '').trim())
      .filter(Boolean);
    if (parts.length > 0) return parts.join(' · ');
  }

  return status ? `Request failed (${status})` : 'Request failed';
}

function normalizeOverpassPayload(payload: unknown): OverpassPayload {
  const normalized = normalizeNativeJsonPayload(payload);
  const elements = Array.isArray(normalized.elements) ? (normalized.elements as OverpassElement[]) : [];
  const error = extractOverpassErrorMessage(normalized);
  return {
    elements,
    error: error === 'Request failed' ? undefined : error,
  };
}

function shouldUseDirectOverpassFallback(errorOrMessage: unknown, status?: number) {
  if (typeof status === 'number' && status >= 500) return true;

  const message = String(
    errorOrMessage instanceof Error
      ? errorOrMessage.message
      : errorOrMessage && typeof errorOrMessage === 'object'
        ? extractOverpassErrorMessage(errorOrMessage)
        : errorOrMessage || '',
  ).toLowerCase();

  return (
    message.includes('all overpass mirrors failed') ||
    message.includes('bad gateway') ||
    message.includes('service unavailable') ||
    message.includes('gateway timeout') ||
    message.includes('request failed (5') ||
    message.includes('network') ||
    message.includes('failed to fetch')
  );
}

async function fetchDirectOverpassViaNative(query: string, timeoutMs: number) {
  let lastError: Error | null = null;

  for (const url of DIRECT_OVERPASS_ENDPOINTS) {
    try {
      const response = await CapacitorHttp.request({
        url,
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        },
        data: new URLSearchParams({ data: query }).toString(),
        responseType: 'json',
        connectTimeout: timeoutMs,
        readTimeout: timeoutMs,
      });
      const payload = normalizeOverpassPayload(response.data);
      if (response.status >= 200 && response.status < 300) {
        return { elements: payload.elements };
      }
      lastError = new Error(payload.error || `Overpass mirror failed (${response.status})`);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error || 'Overpass mirror failed'));
    }
  }

  throw lastError || new Error('All Overpass mirrors failed');
}

async function fetchDirectOverpassViaFetch(
  query: string,
  timeoutMs: number,
  signal?: AbortSignal,
) {
  let lastError: Error | null = null;
  const body = new URLSearchParams({ data: query }).toString();

  for (const url of DIRECT_OVERPASS_ENDPOINTS) {
    try {
      const response = await fetchWithTimeout(url, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        },
        body,
        signal,
      }, timeoutMs);
      const payload = normalizeOverpassPayload(await readJsonResponse(response));
      if (response.status >= 200 && response.status < 300) {
        return { elements: payload.elements };
      }
      lastError = new Error(payload.error || `Overpass mirror failed (${response.status})`);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error || 'Overpass mirror failed'));
    }
  }

  throw lastError || new Error('All Overpass mirrors failed');
}

async function fetchDirectOverpass(
  query: string,
  timeoutMs: number,
  signal?: AbortSignal,
) {
  try {
    return await fetchDirectOverpassViaFetch(query, timeoutMs, signal);
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }
    if (!isNativeShell()) {
      throw error;
    }
    return makeNativeRequestAbortable(fetchDirectOverpassViaNative(query, timeoutMs), signal);
  }
}

export async function fetchOverpassData(
  query: string,
  options: {
    timeoutMs?: number;
    directNativeFallback?: boolean;
  } = {},
): Promise<OverpassPayload> {
  const timeoutMs = options.timeoutMs ?? 15000;
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), timeoutMs);
  const directNativeFallback = options.directNativeFallback ?? true;
  let fallbackAttempted = false;

  const tryDirectFallback = async (reason: unknown, status?: number) => {
    if (!directNativeFallback || fallbackAttempted) return null;
    if (!shouldUseDirectOverpassFallback(reason, status)) return null;
    fallbackAttempted = true;
    return fetchDirectOverpass(query, timeoutMs, controller.signal);
  };

  try {
    const res = await apiFetch(`/overpass`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ query }),
      signal: controller.signal,
    }, {
      timeoutMs,
    });
    const json = await readJsonResponse(res);
    const payload = normalizeOverpassPayload(json);
    if (res.ok) {
      return { elements: payload.elements };
    }

    const fallback = await tryDirectFallback(payload, res.status);
    if (fallback) return fallback;

    throw new Error(payload.error || `Failed to find nearby stores (${res.status})`);
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }

    const fallback = await tryDirectFallback(error);
    if (fallback) return fallback;

    throw error;
  } finally {
    globalThis.clearTimeout(timeout);
  }
}

type WoolworthsStoreRank = {
  storeDetail?: {
    no?: string;
    name?: string;
    addressLine1?: string;
    addressLine2?: string;
    suburb?: string;
    postcode?: string;
    state?: string;
    latitude?: string | number;
    longtitude?: string | number;
  };
  distance?: string | number;
};

type WoolworthsStoreLocatorResponse = {
  locationList?: {
    storeList?: {
      storeRank?: WoolworthsStoreRank[] | WoolworthsStoreRank;
    };
  };
};

type WoolworthsSuburbLookup = {
  suburbName: string;
  postcode?: string;
  state?: string;
};

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function buildStoreAddress(parts: Array<string | undefined>) {
  return parts
    .map((part) => String(part || '').trim())
    .filter((part) => part && part.toLowerCase() !== 'null')
    .join(', ');
}

function normalizeShoppingStateLabel(value: string | undefined) {
  return String(value || '').trim().toUpperCase() || undefined;
}

async function fetchTextWithTimeout(url: string, headers: Record<string, string> = {}, timeoutMs = 15000) {
  if (isNativeShell()) {
    try {
      const response = await CapacitorHttp.get({
        url,
        headers,
        responseType: 'text',
        connectTimeout: timeoutMs,
        readTimeout: timeoutMs,
      });
      if (response.status < 200 || response.status >= 300) {
        throw new Error(`HTTP ${response.status} from ${url}`);
      }
      return typeof response.data === 'string' ? response.data : String(response.data ?? '');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error || '');
      if (/timed out|timeout/i.test(message)) {
        throw new Error('Store lookup timed out. Please try again.');
      }
      throw error;
    }
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      headers,
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} from ${url}`);
    }
    return await res.text();
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Store lookup timed out. Please try again.');
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

function getWoolworthsStoreLocatorUrl(path: string) {
  return `https://contact.woolworths.com.au/storelocator/service/${path.replace(/^\/+/, '')}`;
}

function readWoolworthsStoreRanks(payload: WoolworthsStoreLocatorResponse) {
  const ranks = payload.locationList?.storeList?.storeRank;
  if (Array.isArray(ranks)) return ranks;
  return ranks ? [ranks] : [];
}

function normalizeWoolworthsStoreRank(
  rank: WoolworthsStoreRank,
  origin?: { lat: number; lng: number },
): ShoppingStoreSearchResult | null {
  const detail = rank.storeDetail || {};
  const lat = Number(detail.latitude);
  const lng = Number(detail.longtitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const name = String(detail.name || '').trim();
  const suburb = String(detail.suburb || '').trim() || undefined;
  const state = normalizeShoppingStateLabel(detail.state ? String(detail.state) : undefined);
  const postcode = String(detail.postcode || '').trim() || undefined;
  const address = buildStoreAddress([
    String(detail.addressLine1 || '').trim() || undefined,
    String(detail.addressLine2 || '').trim() || undefined,
    suburb,
    state,
    postcode,
  ]);
  const distanceKm = Number(rank.distance);

  return {
    id: `woolworths-${String(detail.no || `${lat}-${lng}`).trim()}`,
    name: name || 'Woolworths',
    address: address || [suburb, state, postcode].filter(Boolean).join(', ') || 'Australia',
    suburb,
    state,
    postcode,
    lat,
    lng,
    distanceKm: Number.isFinite(distanceKm)
      ? distanceKm
      : origin
        ? haversineKm(origin.lat, origin.lng, lat, lng)
        : null,
    storeRef: String(detail.no || '').trim() || null,
    storeRefKind: 'woolworths_store',
    source: 'official',
  };
}

async function fetchWoolworthsStoreLocatorJson(path: string) {
  const text = await fetchTextWithTimeout(
    getWoolworthsStoreLocatorUrl(path),
    {
      Accept: 'application/json, text/plain, */*',
      'Accept-Language': 'en-AU,en;q=0.9',
    },
    15000,
  );
  try {
    return JSON.parse(text) as WoolworthsStoreLocatorResponse;
  } catch {
    throw new Error('Woolworths store data could not be read.');
  }
}

function parseWoolworthsLookupXml(xmlText: string): WoolworthsSuburbLookup[] {
  const parser = new DOMParser();
  const xml = parser.parseFromString(xmlText, 'application/xml');
  const parserError = xml.querySelector('parsererror');
  if (parserError) return [];

  return Array.from(xml.getElementsByTagName('suburbRank'))
    .map((node) => {
      const suburbName = node.getElementsByTagName('suburbName')[0]?.textContent?.trim() || '';
      const postcode = node.getElementsByTagName('postcode')[0]?.textContent?.trim() || undefined;
      const state = normalizeShoppingStateLabel(
        node.getElementsByTagName('state')[0]?.textContent?.trim() || undefined,
      );
      if (!suburbName) return null;
      return { suburbName, postcode, state };
    })
    .filter(Boolean) as WoolworthsSuburbLookup[];
}

function scoreWoolworthsSuburbMatch(entry: WoolworthsSuburbLookup, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  const normalizedSuburb = entry.suburbName.trim().toLowerCase();
  if (normalizedSuburb === normalizedQuery) return 0;
  if (normalizedSuburb.startsWith(normalizedQuery)) return 1;
  return 2;
}

async function lookupWoolworthsSuburbs(query: string) {
  const text = await fetchTextWithTimeout(
    getWoolworthsStoreLocatorUrl(`lookup/${encodeURIComponent(query.trim().toUpperCase())}`),
    {
      Accept: 'application/xml, text/xml, */*',
      'Accept-Language': 'en-AU,en;q=0.9',
    },
    15000,
  );
  return parseWoolworthsLookupXml(text)
    .sort((a, b) => scoreWoolworthsSuburbMatch(a, query) - scoreWoolworthsSuburbMatch(b, query))
    .slice(0, 3);
}

function normalizeOverpassStore(
  element: OverpassElement,
  origin?: { lat: number; lng: number },
): Omit<ShoppingStoreSearchResult, 'storeRef' | 'storeRefKind' | 'source'> | null {
  const lat = Number(element.lat ?? element.center?.lat);
  const lng = Number(element.lon ?? element.center?.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const tags = element.tags || {};
  const name = String(tags.name || tags.brand || '').trim() || 'Woolworths';
  const suburb = String(tags['addr:suburb'] || tags['addr:city'] || '').trim() || undefined;
  const state = normalizeShoppingStateLabel(tags['addr:state']);
  const postcode = String(tags['addr:postcode'] || '').trim() || undefined;
  const address =
    buildStoreAddress([
      buildStoreAddress([tags['addr:housenumber'], tags['addr:street']]),
      suburb,
      state,
      postcode,
    ]) || `${name}, Australia`;

  return {
    id: `overpass-${element.type}-${element.id}`,
    name,
    address,
    suburb,
    state,
    postcode,
    lat,
    lng,
    distanceKm: origin ? haversineKm(origin.lat, origin.lng, lat, lng) : null,
  };
}

function normalizeNominatimStore(
  result: NominatimResult,
  origin?: { lat: number; lng: number },
): Omit<ShoppingStoreSearchResult, 'storeRef' | 'storeRefKind' | 'source'> | null {
  const lat = Number(result.lat);
  const lng = Number(result.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const displayName = String(result.display_name || '').trim();
  if (!displayName) return null;

  const primaryName = displayName.split(',')[0]?.trim() || 'Woolworths';
  const suburb = result.address?.suburb || result.address?.city || result.address?.town || undefined;
  const state = normalizeShoppingStateLabel(result.address?.state);
  const postcode = result.address?.postcode || undefined;

  return {
    id: `nominatim-${result.place_id}`,
    name: primaryName,
    address: displayName,
    suburb,
    state,
    postcode,
    lat,
    lng,
    distanceKm: origin ? haversineKm(origin.lat, origin.lng, lat, lng) : null,
  };
}

function dedupeShoppingStores(stores: ShoppingStoreSearchResult[]) {
  const seen = new Set<string>();
  return stores.filter((store) => {
    const key = `${store.name.toLowerCase()}|${store.lat.toFixed(4)}|${store.lng.toFixed(4)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function fetchOverpassElements(query: string): Promise<OverpassElement[]> {
  try {
    const payload = await fetchOverpassData(query);
    return payload.elements;
  } catch (error) {
    if (isAbortError(error)) {
      throw new Error('Store lookup timed out. Please try again.');
    }
    throw error;
  }
}

async function fetchBackendRetailerStoreSearch(
  path: string,
  params: Record<string, string>,
): Promise<ShoppingStoreSearchResult[]> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 15000);
  const search = new URLSearchParams(params);

  try {
    const res = await apiFetch(`${path}?${search.toString()}`, {
      headers: headers(),
      signal: controller.signal,
    });
    const json = await readJsonResponse(res);
    if (!res.ok) {
      throw new Error(
        (typeof json.error === 'string' && json.error) ||
        (typeof json.raw === 'string' && json.raw) ||
        `Failed to fetch stores (${res.status})`,
      );
    }
    return Array.isArray((json as ShoppingStoreSearchResponse)?.results)
      ? ((json as ShoppingStoreSearchResponse).results as ShoppingStoreSearchResult[])
      : [];
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Store lookup timed out. Please try again.');
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function fetchNearbyWoolworthsStores(params: {
  lat: number;
  lng: number;
  limit?: number;
  radiusMeters?: number;
}): Promise<ShoppingStoreSearchResult[]> {
  const limit = Math.min(Math.max(Number(params.limit || 8), 1), 20);
  const radiusKm = Math.min(Math.max(Math.round(Number(params.radiusMeters || 15000) / 1000), 5), 50);
  const payload = await fetchWoolworthsStoreLocatorJson(
    `proximitydetail/supermarkets/latitude/${encodeURIComponent(String(params.lat))}/longitude/${encodeURIComponent(
      String(params.lng),
    )}/range/${radiusKm}/max/${limit}/json`,
  );

  return dedupeShoppingStores(
    readWoolworthsStoreRanks(payload)
      .map((rank) => normalizeWoolworthsStoreRank(rank, { lat: params.lat, lng: params.lng }))
      .filter(Boolean) as ShoppingStoreSearchResult[],
  )
    .sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity))
    .slice(0, limit);
}

export async function searchWoolworthsStores(params: {
  q: string;
  limit?: number;
  originLat?: number;
  originLng?: number;
}): Promise<ShoppingStoreSearchResult[]> {
  const query = String(params.q || '').trim();
  const limit = Math.min(Math.max(Number(params.limit || 8), 1), 20);
  if (query.length < 2) return [];

  const origin =
    Number.isFinite(Number(params.originLat)) && Number.isFinite(Number(params.originLng))
      ? { lat: Number(params.originLat), lng: Number(params.originLng) }
      : undefined;
  const postcodeMatch = query.match(/\b\d{4}\b/);

  if (postcodeMatch) {
    const payload = await fetchWoolworthsStoreLocatorJson(
      `proximitydetail/supermarkets/postcode/${encodeURIComponent(postcodeMatch[0])}/range/25/max/${limit}/json`,
    );

    return dedupeShoppingStores(
      readWoolworthsStoreRanks(payload)
        .map((rank) => normalizeWoolworthsStoreRank(rank, origin))
        .filter(Boolean) as ShoppingStoreSearchResult[],
    )
      .sort((a, b) => {
        const distanceDelta = (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity);
        if (Number.isFinite(distanceDelta) && distanceDelta !== 0) return distanceDelta;
        return a.name.localeCompare(b.name);
      })
      .slice(0, limit);
  }

  const suburbMatches = await lookupWoolworthsSuburbs(query);
  const payloads = await Promise.all(
    suburbMatches.map((match) =>
      fetchWoolworthsStoreLocatorJson(
        `proximitydetail/supermarkets/state/${encodeURIComponent(match.state || 'NSW')}/suburb/${encodeURIComponent(
          match.suburbName,
        )}/range/25/max/${limit}/json`,
      ),
    ),
  );

  return dedupeShoppingStores(
    payloads
      .flatMap((payload) => readWoolworthsStoreRanks(payload))
      .map((rank) => normalizeWoolworthsStoreRank(rank, origin))
      .filter(Boolean) as ShoppingStoreSearchResult[],
  )
    .sort((a, b) => {
      const distanceDelta = (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity);
      if (Number.isFinite(distanceDelta) && distanceDelta !== 0) return distanceDelta;
      const suburbScoreDelta =
        scoreWoolworthsSuburbMatch({ suburbName: a.suburb || a.name }, query) -
        scoreWoolworthsSuburbMatch({ suburbName: b.suburb || b.name }, query);
      if (suburbScoreDelta !== 0) return suburbScoreDelta;
      return a.name.localeCompare(b.name);
    })
    .slice(0, limit);
}

function matchesShoppingRetailerText(retailer: ShoppingRetailer, value: unknown) {
  const text = String(value || '').trim();
  return text ? SHOPPING_RETAILER_NAME_PATTERNS[retailer].test(text) : false;
}

function getShoppingRetailerLabel(retailer: ShoppingRetailer) {
  return SHOPPING_RETAILER_LABELS[retailer];
}

function getShoppingStoreRefKind(retailer: ShoppingRetailer): ShoppingStoreRefKind {
  if (retailer === 'woolworths') return 'woolworths_store';
  if (retailer === 'coles') return 'coles_store';
  return 'aldi_merchant';
}

function escapeOverpassRegex(value: string) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildRetailerStoreOverpassQuery(retailer: ShoppingRetailer, lat: number, lng: number, radiusMeters: number) {
  const pattern =
    retailer === 'woolworths'
      ? 'Woolworths|Woolies|Woolworths Metro'
      : retailer === 'coles'
        ? 'Coles'
        : 'ALDI|Aldi';
  const escapedPattern = escapeOverpassRegex(pattern).replace(/\\\|/g, '|');
  const shopPattern = 'supermarket|grocery|convenience';
  return [
    '[out:json][timeout:20];(',
    `node["shop"~"${shopPattern}",i]["name"~"${escapedPattern}",i](around:${radiusMeters},${lat},${lng});`,
    `way["shop"~"${shopPattern}",i]["name"~"${escapedPattern}",i](around:${radiusMeters},${lat},${lng});`,
    `node["shop"~"${shopPattern}",i]["brand"~"${escapedPattern}",i](around:${radiusMeters},${lat},${lng});`,
    `way["shop"~"${shopPattern}",i]["brand"~"${escapedPattern}",i](around:${radiusMeters},${lat},${lng});`,
    `node["shop"~"${shopPattern}",i]["operator"~"${escapedPattern}",i](around:${radiusMeters},${lat},${lng});`,
    `way["shop"~"${shopPattern}",i]["operator"~"${escapedPattern}",i](around:${radiusMeters},${lat},${lng});`,
    ');out center 80;',
  ].join('');
}

function normalizeRetailerOverpassStore(
  retailer: ShoppingRetailer,
  element: OverpassElement,
  origin?: { lat: number; lng: number },
): ShoppingStoreSearchResult | null {
  const tags = element.tags || {};
  if (
    !matchesShoppingRetailerText(retailer, tags.name) &&
    !matchesShoppingRetailerText(retailer, tags.brand) &&
    !matchesShoppingRetailerText(retailer, tags.operator)
  ) {
    return null;
  }

  const normalized = normalizeOverpassStore(element, origin);
  if (!normalized) return null;
  const matchedName =
    String(tags.name || tags.brand || tags.operator || '').trim() || getShoppingRetailerLabel(retailer);

  return {
    ...normalized,
    name: matchedName,
    storeRef: null,
    storeRefKind: getShoppingStoreRefKind(retailer),
    source: 'osm_fallback',
  };
}

function normalizeRetailerNominatimStore(
  retailer: ShoppingRetailer,
  result: NominatimResult,
  origin?: { lat: number; lng: number },
): ShoppingStoreSearchResult | null {
  if (
    !matchesShoppingRetailerText(retailer, result.display_name) &&
    !matchesShoppingRetailerText(retailer, result.address?.road) &&
    !matchesShoppingRetailerText(retailer, result.address?.neighbourhood)
  ) {
    return null;
  }

  const normalized = normalizeNominatimStore(result, origin);
  if (!normalized) return null;

  const nameMatch = String(result.display_name || '')
    .split(',')
    .map((part) => part.trim())
    .find((part) => matchesShoppingRetailerText(retailer, part));

  return {
    ...normalized,
    name: nameMatch || normalized.name || getShoppingRetailerLabel(retailer),
    storeRef: null,
    storeRefKind: getShoppingStoreRefKind(retailer),
    source: 'osm_fallback',
  };
}

function sortShoppingStoreResults(
  stores: ShoppingStoreSearchResult[],
  origin?: { lat: number; lng: number },
) {
  return stores.sort((left, right) => {
    const leftDistance =
      left.distanceKm ??
      (origin ? haversineKm(origin.lat, origin.lng, left.lat, left.lng) : Number.POSITIVE_INFINITY);
    const rightDistance =
      right.distanceKm ??
      (origin ? haversineKm(origin.lat, origin.lng, right.lat, right.lng) : Number.POSITIVE_INFINITY);
    if (leftDistance !== rightDistance) return leftDistance - rightDistance;
    return left.name.localeCompare(right.name);
  });
}

async function fetchNearbyGenericRetailerStores(params: {
  retailer: ShoppingRetailer;
  lat: number;
  lng: number;
  limit?: number;
  radiusMeters?: number;
  origin?: { lat: number; lng: number };
}) {
  const limit = Math.min(Math.max(Number(params.limit || 8), 1), 20);
  const radiusMeters = Math.min(Math.max(Number(params.radiusMeters || 15000), 3000), 30000);
  const origin = params.origin || { lat: params.lat, lng: params.lng };
  const elements = await fetchOverpassElements(
    buildRetailerStoreOverpassQuery(params.retailer, params.lat, params.lng, radiusMeters),
  );

  return sortShoppingStoreResults(
    dedupeShoppingStores(
      elements
        .map((element) => normalizeRetailerOverpassStore(params.retailer, element, origin))
        .filter(Boolean) as ShoppingStoreSearchResult[],
    ),
    origin,
  ).slice(0, limit);
}

export async function fetchNearbyRetailerStores(params: {
  retailer: ShoppingRetailer;
  lat: number;
  lng: number;
  limit?: number;
  radiusMeters?: number;
}): Promise<ShoppingStoreSearchResult[]> {
  try {
    const results = await fetchBackendRetailerStoreSearch('/shopping/stores/nearby', {
      retailer: params.retailer,
      lat: String(params.lat),
      lng: String(params.lng),
      limit: String(Math.min(Math.max(Number(params.limit || 8), 1), 20)),
      radiusMeters: String(Math.min(Math.max(Number(params.radiusMeters || 15000), 3000), 30000)),
    });
    if (results.length > 0) {
      return sortShoppingStoreResults(results, { lat: params.lat, lng: params.lng });
    }
  } catch (error) {
    console.warn(`GHAR ${params.retailer} nearby store lookup fallback:`, error);
  }

  if (params.retailer === 'woolworths') {
    try {
      return await fetchNearbyWoolworthsStores(params);
    } catch (error) {
      console.warn('GHAR woolworths nearby store direct fallback:', error);
    }
  }

  try {
    return await fetchNearbyGenericRetailerStores(params);
  } catch (error) {
    console.warn(`GHAR ${params.retailer} nearby store map fallback:`, error);
  }

  const nearbyMatches = await searchOpenMapLocations(getShoppingRetailerLabel(params.retailer), {
    lat: params.lat,
    lng: params.lng,
    limit: Math.min(Math.max(Number(params.limit || 8), 1), 20),
  }).catch((error) => {
    console.warn(`GHAR ${params.retailer} nearby place fallback:`, error);
    return [] as NominatimResult[];
  });

  return sortShoppingStoreResults(
    dedupeShoppingStores(
      nearbyMatches
        .map((result) => normalizeRetailerNominatimStore(params.retailer, result, { lat: params.lat, lng: params.lng }))
        .filter(Boolean) as ShoppingStoreSearchResult[],
    ),
    { lat: params.lat, lng: params.lng },
  ).slice(0, Math.min(Math.max(Number(params.limit || 8), 1), 20));
}

export async function searchRetailerStores(params: {
  retailer: ShoppingRetailer;
  q: string;
  limit?: number;
  originLat?: number;
  originLng?: number;
}): Promise<ShoppingStoreSearchResult[]> {
  const retailer = params.retailer;
  const query = String(params.q || '').trim();
  const limit = Math.min(Math.max(Number(params.limit || 8), 1), 20);
  if (query.length < 2) return [];

  const origin =
    Number.isFinite(Number(params.originLat)) && Number.isFinite(Number(params.originLng))
      ? { lat: Number(params.originLat), lng: Number(params.originLng) }
      : undefined;

  try {
    const results = await fetchBackendRetailerStoreSearch('/shopping/stores/search', {
      retailer,
      q: query,
      limit: String(limit),
      ...(origin ? { originLat: String(origin.lat), originLng: String(origin.lng) } : {}),
    });
    if (results.length > 0) {
      return sortShoppingStoreResults(results, origin);
    }
  } catch (error) {
    console.warn(`GHAR ${retailer} store search fallback:`, error);
  }

  if (retailer === 'woolworths') {
    try {
      return await searchWoolworthsStores(params);
    } catch (error) {
      console.warn('GHAR woolworths store direct fallback:', error);
    }
  }

  const retailerLabel = getShoppingRetailerLabel(retailer);
  const [directMatches, anchors] = await Promise.all([
    searchOpenMapLocations(`${retailerLabel} ${query}`, {
      lat: origin?.lat,
      lng: origin?.lng,
      limit,
    }).catch((error) => {
      console.warn(`GHAR ${retailer} store direct place fallback:`, error);
      return [] as NominatimResult[];
    }),
    searchOpenMapLocations(query, {
      lat: origin?.lat,
      lng: origin?.lng,
      limit: 4,
    }).catch((error) => {
      console.warn(`GHAR ${retailer} store anchor place fallback:`, error);
      return [] as NominatimResult[];
    }),
  ]);

  const anchorStores = await Promise.all(
    anchors
      .slice(0, 3)
      .map((anchor) =>
        (async () => {
          const anchorLat = Number(anchor.lat);
          const anchorLng = Number(anchor.lon);
          const anchorOrigin = origin || { lat: anchorLat, lng: anchorLng };
          const stores = await fetchNearbyRetailerStores({
            retailer,
            lat: anchorLat,
            lng: anchorLng,
            limit,
            radiusMeters: 18000,
          });
          return stores.map((store) => ({
            ...store,
            distanceKm:
              origin?.lat != null && origin?.lng != null
                ? haversineKm(origin.lat, origin.lng, store.lat, store.lng)
                : store.distanceKm ?? haversineKm(anchorOrigin.lat, anchorOrigin.lng, store.lat, store.lng),
          }));
        })().catch((error) => {
          console.warn(`GHAR ${retailer} anchor nearby store fallback:`, error);
          return [] as ShoppingStoreSearchResult[];
        }),
      ),
  );

  return sortShoppingStoreResults(
    dedupeShoppingStores([
      ...(directMatches
        .map((result) => normalizeRetailerNominatimStore(retailer, result, origin))
        .filter(Boolean) as ShoppingStoreSearchResult[]),
      ...anchorStores.flat(),
    ]),
    origin,
  ).slice(0, limit);
}

export interface TransportEligibility {
  eligible: boolean;
  state: string;
  suburb: string;
  label: string;
  provider?: TransportProvider | '';
}

export type TransportProvider =
  | 'tfnsw'
  | 'transport_vic'
  | 'transport_qld'
  | 'transport_sa'
  | 'transport_tas'
  | 'transport_wa'
  | 'transport_act'
  | 'transport_nt';

export interface TransportLocationReference {
  ref: string;
  requestType: 'any' | 'coord';
  name?: string;
  subtitle?: string;
  lat?: number | null;
  lng?: number | null;
  provider?: TransportProvider;
}

export interface TransportLocationSuggestion extends TransportLocationReference {
  id: string;
  type: string;
  matchQuality: number | null;
  isBest: boolean;
  modes: string[];
  provider?: TransportProvider;
}

export interface TransportAlert {
  id: string;
  title: string;
  subtitle?: string;
  content?: string;
  priority: string;
  provider?: string;
  url?: string;
  lineIds: string[];
  stopIds: string[];
  tripIds?: string[];
}

export interface TransportTripLeg {
  id: string;
  mode: string;
  modeLabel: string;
  lineName: string;
  lineNumber: string;
  destinationLabel: string;
  operator?: string;
  originName: string;
  originSubtitle: string;
  originStopId: string;
  originPlatform: string;
  originLat: number | null;
  originLng: number | null;
  destinationName: string;
  destinationSubtitle: string;
  destinationStopId: string;
  destinationPlatform: string;
  destinationLat: number | null;
  destinationLng: number | null;
  departureTimePlanned?: string;
  departureTimeEstimated?: string;
  arrivalTimePlanned?: string;
  arrivalTimeEstimated?: string;
  durationMinutes: number;
  distanceKm: number | null;
  realtime: boolean;
  accessible: boolean;
  alerts: TransportAlert[];
  pathDescriptions: string[];
  provider?: TransportProvider;
  serviceDate?: string;
  tripId?: string;
  routeId?: string;
  shapeId?: string;
  vehiclePosition?: {
    lat: number;
    lng: number;
    bearing?: number | null;
    occupancyStatus?: string;
  };
}

export interface TransportTripOption {
  id: string;
  provider?: TransportProvider;
  providerNotice?: string;
  durationMinutes: number;
  departureTime?: string;
  arrivalTime?: string;
  transferCount: number;
  fareText?: string;
  hasRealtime: boolean;
  summary: string;
  legModes: string[];
  alerts: TransportAlert[];
  legs: TransportTripLeg[];
}

export interface TransportDeparture {
  id: string;
  provider?: TransportProvider;
  providerNotice?: string;
  stopName: string;
  platformName: string;
  stopId: string;
  lineName: string;
  lineNumber: string;
  destination: string;
  mode: string;
  modeLabel: string;
  departureTimePlanned?: string;
  departureTimeEstimated?: string;
  realtime: boolean;
  wheelchair: boolean;
  alerts: TransportAlert[];
}

export interface TransportTripQuery {
  provider?: TransportProvider;
  origin: TransportLocationReference;
  destination: TransportLocationReference;
  when: 'leave_now' | 'depart_at' | 'arrive_by';
  date?: string;
  time?: string;
  modes?: string[];
  wheelchair?: boolean;
  maxTrips?: number;
}

export interface TransportStatusItem {
  id: string;
  provider?: TransportProvider;
  title: string;
  description: string;
  mode: string;
  region: string;
  priority: string;
  url?: string;
  publishedAt?: string;
}

export interface TransportRetailer {
  id: string;
  provider?: TransportProvider;
  name: string;
  address: string;
  lat: number | null;
  lng: number | null;
  capabilities: string[];
  url?: string;
  distanceKm?: number | null;
}

export type OpalEligibility = TransportEligibility;
export type OpalLocationReference = TransportLocationReference;
export type OpalLocationSuggestion = TransportLocationSuggestion;
export type OpalAlert = TransportAlert;
export type OpalTripLeg = TransportTripLeg;
export type OpalTripOption = TransportTripOption;
export type OpalDeparture = TransportDeparture;
export type OpalTripQuery = TransportTripQuery;

function normalizeFuelCategoryFromType(rawFuelType: string): FuelStationResult['fuel_category'] {
  const value = String(rawFuelType || '').trim().toLowerCase();
  if (!value) return 'unleaded_up';
  if (/e85/i.test(value)) return 'e85';
  if (/(premium|pulp|u95|u98|98|95)/i.test(value)) return 'premium_up';
  if (/(brand diesel|vortex diesel|supreme diesel|premium diesel)/i.test(value)) return 'brand_diesel';
  if (/(diesel|b20|b5)/i.test(value)) return 'diesel';
  if (/lpg/i.test(value)) return 'lpg';
  if (/(^|[^a-z])(u91|e10|unleaded|regular)/i.test(value)) return 'unleaded_up';
  return 'unleaded_up';
}

export async function searchAddress(query: string): Promise<NominatimResult[]> {
  if (!query || query.length < 2) return [];
  const params = new URLSearchParams({
    q: query,
    format: 'json',
    countrycodes: 'au',
    addressdetails: '1',
    limit: '10',
  });
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: { 'User-Agent': 'GHAR-App/1.0' },
  });
  if (!res.ok) return [];
  return res.json();
}

export async function searchOpenMapLocations(
  query: string,
  options: OpenMapSearchOptions = {},
): Promise<NominatimResult[]> {
  const cleanQuery = String(query || '').trim();
  if (cleanQuery.length < 2) return [];
  try {
    const variants = buildOpenMapQueryVariants(cleanQuery);
    const limit = Math.max(1, Math.min(Number(options.limit || OPEN_MAP_SEARCH_LIMIT), 10));
    const candidateGroups = await Promise.all(
      variants.map((variant) =>
        fetchOpenMapPhotonCandidates(variant.query, variant.kind, {
          ...options,
          limit,
        }),
      ),
    );
    const byKey = new Map<string, OpenMapCandidate>();
    for (const candidate of candidateGroups.flat()) {
      const key = `${normalizeOpenMapText(candidate.result.display_name)}|${Number(candidate.result.lat).toFixed(5)}|${Number(candidate.result.lon).toFixed(5)}`;
      const existing = byKey.get(key);
      if (!existing || candidate.score > existing.score) {
        byKey.set(key, candidate);
      }
    }
    return [...byKey.values()]
      .sort((left, right) => right.score - left.score || left.result.display_name.localeCompare(right.result.display_name))
      .slice(0, limit)
      .map((candidate) => candidate.result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error || '');
    if (/timed out|timeout/i.test(message)) {
      throw new Error('Place search timed out. Please try again.');
    }
    throw error instanceof Error ? error : new Error('Failed to search map places.');
  }
}

export async function fetchPublicToilets(
  bounds: PublicToiletBounds,
  options: { limit?: number; signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<PublicToiletsResponse> {
  try {
    const search = buildPublicToiletsQueryParams(bounds, options.limit);
    const res = await apiFetch(`/public-toilets?${search.toString()}`, {
      headers: headers(),
      signal: options.signal,
    }, {
      timeoutMs: options.timeoutMs ?? 25000,
    });
    const json = await readJsonResponse(res);
    if (!res.ok) {
      throw new Error(
        (typeof json.error === 'string' && json.error) ||
        (typeof json.raw === 'string' && json.raw) ||
        `Failed to fetch public toilets (${res.status})`,
      );
    }
    const data = Array.isArray(json.data)
      ? json.data.map(normalizePublicToiletLocation).filter(Boolean) as PublicToiletLocation[]
      : [];
    return {
      data,
      count: Number.isFinite(Number(json.count)) ? Number(json.count) : data.length,
      truncated: Boolean(json.truncated),
      source: String(json.source || 'National Public Toilet Map'),
    };
  } catch (error) {
    if (!isRecoverablePublicToiletProxyError(error)) {
      throw error;
    }
    console.warn('GHAR public toilet proxy failed; using ArcGIS fallback:', error);
    return fetchPublicToiletsFromArcgis(bounds, options);
  }
}

export async function fetchNearbyFuelStations(params: {
  lat: number;
  lng: number;
  state?: string;
  suburb?: string;
  targetLabel?: string;
  products?: string[];
}): Promise<NearbyFuelResponse> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 15000);
  const search = new URLSearchParams({
    lat: String(params.lat),
    lng: String(params.lng),
  });
  if (params.state) search.set('state', params.state);
  if (params.suburb) search.set('suburb', params.suburb);
  if (params.targetLabel) search.set('targetLabel', params.targetLabel);
  if (params.products?.length) search.set('products', params.products.join(','));
  try {
    const res = await apiFetch(`/fuel/nearby?${search}`, { headers: headers(), signal: controller.signal });
    const json = await readJsonResponse(res);
    if (!res.ok) {
      console.error('GHAR fetchNearbyFuelStations error:', json);
      throw new Error(
        (typeof json.error === 'string' && json.error) ||
        (typeof json.raw === 'string' && json.raw) ||
        `Failed to fetch nearby fuel (${res.status})`,
      );
    }
    return {
      ...json,
      results: Array.isArray(json.results)
        ? json.results.map((station: any) => ({
            ...station,
            fuel_category: station.fuel_category || normalizeFuelCategoryFromType(station.fuel_type),
          }))
        : [],
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Fuel lookup timed out. Please try again.');
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function fetchFuelInsights(
  state: FuelStateCode,
  fuel: CanonicalFuelCategory,
  tool: FuelInsightTool = 'overview',
): Promise<FuelInsightsResponse> {
  const params = new URLSearchParams({
    state,
    fuel,
    tool,
  });
  const res = await apiFetch(`/fuel/insights?${params.toString()}`, {
    headers: headers(),
  });
  const json = await readJsonResponse(res);
  if (!res.ok) {
    console.error('GHAR fetchFuelInsights error:', json);
    throw new Error(
      (typeof json.error === 'string' && json.error) ||
      (typeof json.raw === 'string' && json.raw) ||
      `Failed to fetch fuel insights (${res.status})`,
    );
  }
  return json as FuelInsightsResponse;
}

export async function fetchFuelNews(): Promise<FuelNewsItem[]> {
  const res = await apiFetch(`/fuel/news`, {
    headers: headers(),
  });
  const json = await readJsonResponse(res);
  if (!res.ok) {
    console.error('GHAR fetchFuelNews error:', json);
    throw new Error(
      (typeof json.error === 'string' && json.error) ||
      (typeof json.raw === 'string' && json.raw) ||
      `Failed to fetch fuel news (${res.status})`,
    );
  }
  return Array.isArray(json.data) ? json.data : [];
}

export async function fetchShoppingSearch(params: {
  q: string;
  limit?: number;
  retailers?: ShoppingRetailer[];
  mode?: 'default' | 'compare';
  storesByRetailer?: Partial<Record<ShoppingRetailer, ShoppingStoreSummary | null>>;
}): Promise<ShoppingSearchResponse> {
  const query = String(params.q || '').trim();
  const limit = Math.min(Math.max(Number(params.limit || 10), 1), 20);
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 15000);
  const search = new URLSearchParams({
    q: query,
    limit: String(limit),
  });
  const requestedRetailers = Array.isArray(params.retailers) ? params.retailers.filter(Boolean) : [];
  const effectiveRetailers = requestedRetailers.length > 0
    ? Array.from(new Set(requestedRetailers))
    : (['woolworths', 'coles', 'aldi'] as ShoppingRetailer[]);
  if (requestedRetailers.length > 0) {
    search.set('retailers', Array.from(new Set(requestedRetailers)).join(','));
  }
  if (params.mode === 'compare') {
    search.set('mode', 'compare');
  }
  const storesByRetailer = params.storesByRetailer || {};

  (Object.keys(storesByRetailer) as ShoppingRetailer[]).forEach((retailer) => {
    const store = storesByRetailer[retailer];
    if (!store?.storeRef) return;
    search.set(`${retailer}StoreRef`, store.storeRef);
    search.set(`${retailer}StoreRefKind`, store.storeRefKind);
  });

  try {
    const res = await apiFetch(`/shopping/search?${search.toString()}`, {
      headers: headers(),
      signal: controller.signal,
    });
    const json = await readJsonResponse(res);
    if (!res.ok) {
      console.error('GHAR fetchShoppingSearch error:', json);
      throw new Error(
        (typeof json.error === 'string' && json.error) ||
        (typeof json.raw === 'string' && json.raw) ||
        `Failed to search groceries (${res.status})`,
      );
    }
    return await applyShoppingSearchClientFallbacks(json as ShoppingSearchResponse, {
      query,
      limit,
      requestedRetailers: effectiveRetailers,
    });
  } catch (error) {
    const woolworthsFallback = await buildWoolworthsOnlyFallbackResponse({
      query,
      limit,
      requestedRetailers: effectiveRetailers,
    });
    if (woolworthsFallback) {
      return woolworthsFallback;
    }
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Grocery search timed out. Please try again.');
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

function createUnavailableRetailerResult(
  retailer: ShoppingRetailer,
  status: RetailerSearchStatus,
  message: string,
): ShoppingRetailerResults {
  return {
    retailer,
    status,
    message,
    results: [],
  };
}

function buildReadyRetailerResult(
  retailer: ShoppingRetailer,
  query: string,
  results: ShoppingProductResult[],
): ShoppingRetailerResults {
  return {
    retailer,
    status: 'ready',
    message: results.length === 0 ? `No ${getShoppingRetailerLabel(retailer)} products found for "${query}".` : undefined,
    results,
  };
}

function buildEmptyShoppingSearchResponse(
  query: string,
  limit: number,
  requestedRetailers: ShoppingRetailer[],
): ShoppingSearchResponse {
  const includes = new Set(requestedRetailers);
  return {
    query,
    limit,
    retailers: {
      woolworths: includes.has('woolworths')
        ? createUnavailableRetailerResult('woolworths', 'unavailable', 'Woolworths search is unavailable right now.')
        : createUnavailableRetailerResult('woolworths', 'unavailable', 'Woolworths was not included in this search.'),
      coles: includes.has('coles')
        ? createUnavailableRetailerResult('coles', 'unavailable', 'Coles search is unavailable right now.')
        : createUnavailableRetailerResult('coles', 'unavailable', 'Coles was not included in this search.'),
      aldi: includes.has('aldi')
        ? createUnavailableRetailerResult('aldi', 'unavailable', 'ALDI search is unavailable right now.')
        : createUnavailableRetailerResult('aldi', 'unavailable', 'ALDI was not included in this search.'),
    },
  };
}

async function applyShoppingSearchClientFallbacks(
  response: ShoppingSearchResponse,
  params: {
    query: string;
    limit: number;
    requestedRetailers: ShoppingRetailer[];
  },
): Promise<ShoppingSearchResponse> {
  if (!params.requestedRetailers.includes('woolworths')) {
    return response;
  }

  const currentWoolworths = readRetailerSearchResult(response, 'woolworths');
  if (currentWoolworths.status === 'ready') {
    return response;
  }

  try {
    const fallbackResults = await fetchWoolworthsShoppingSearch({
      q: params.query,
      limit: params.limit,
    });
    return {
      ...response,
      retailers: {
        ...response.retailers,
        woolworths: buildReadyRetailerResult('woolworths', params.query, fallbackResults),
      },
    };
  } catch (fallbackError) {
    console.warn('GHAR Woolworths client fallback error:', fallbackError);
    return response;
  }
}

async function buildWoolworthsOnlyFallbackResponse(params: {
  query: string;
  limit: number;
  requestedRetailers: ShoppingRetailer[];
}): Promise<ShoppingSearchResponse | null> {
  if (!params.requestedRetailers.includes('woolworths')) {
    return null;
  }

  try {
    const woolworthsResults = await fetchWoolworthsShoppingSearch({
      q: params.query,
      limit: params.limit,
    });
    const response = buildEmptyShoppingSearchResponse(params.query, params.limit, params.requestedRetailers);
    response.retailers.woolworths = buildReadyRetailerResult('woolworths', params.query, woolworthsResults);
    return response;
  } catch (fallbackError) {
    console.warn('GHAR Woolworths emergency fallback error:', fallbackError);
    return null;
  }
}

function readRetailerSearchResult(
  response: ShoppingSearchResponse,
  retailer: ShoppingRetailer,
): ShoppingRetailerResults {
  return (
    response?.retailers?.[retailer] ||
    createUnavailableRetailerResult(retailer, 'unavailable', `${getShoppingRetailerLabel(retailer)} search is unavailable right now.`)
  );
}

export async function fetchWoolworthsShoppingSearch(params: {
  q: string;
  limit?: number;
}): Promise<ShoppingProductResult[]> {
  const query = String(params.q || '').trim();
  const limit = Math.min(Math.max(Number(params.limit || 10), 1), 20);
  if (query.length < 2) return [];

  const search = new URLSearchParams({
    searchTerm: query,
    pageNumber: '1',
    pageSize: String(limit),
    sortType: 'TraderRelevance',
  });
  const woolworthsHeaders = {
    Accept: 'application/json, text/plain, */*',
    'Accept-Language': 'en-AU,en;q=0.9',
    Origin: 'https://www.woolworths.com.au',
    Referer: `https://www.woolworths.com.au/shop/search/products?searchTerm=${encodeURIComponent(query)}`,
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
    'User-Agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
  };

  const getHeaderValue = (headersLike: unknown, name: string) => {
    if (!headersLike || typeof headersLike !== 'object') return '';
    const entries = Object.entries(headersLike as Record<string, unknown>);
    const match = entries.find(([key]) => key.toLowerCase() === name.toLowerCase());
    return String(match?.[1] || '').trim();
  };

  const parseWoolworthsPayload = (raw: unknown, contentType?: string) => {
    if (raw && typeof raw === 'object') return raw;
    const text = String(raw || '').trim();
    if (!text) {
      throw new Error('Woolworths returned an empty response.');
    }
    const looksJson = text.startsWith('{') || text.startsWith('[') || /json/i.test(String(contentType || ''));
    if (!looksJson) {
      throw new Error('Woolworths returned a non-JSON response.');
    }
    return JSON.parse(text);
  };

  const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

  const bootstrapNativeWoolworthsSession = async () => {
    await CapacitorHttp.get({
      url: `https://www.woolworths.com.au/shop/search/products?searchTerm=${encodeURIComponent(query)}`,
      headers: {
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-AU,en;q=0.9',
        Referer: 'https://www.woolworths.com.au/',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'same-origin',
        'User-Agent': woolworthsHeaders['User-Agent'],
      },
      responseType: 'text',
      connectTimeout: 15000,
      readTimeout: 15000,
    });
  };

  const requestWoolworthsFromNativeShell = async () => {
    let lastError: unknown = null;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        if (attempt > 0) {
          try {
            await bootstrapNativeWoolworthsSession();
          } catch (bootstrapError) {
            console.warn('GHAR Woolworths bootstrap warning:', bootstrapError);
          }
          await sleep(250 * attempt);
        }

        const response = await CapacitorHttp.get({
          url: 'https://www.woolworths.com.au/apis/ui/Search/products',
          params: Object.fromEntries(search.entries()),
          headers: woolworthsHeaders,
          responseType: 'text',
          connectTimeout: 15000,
          readTimeout: 15000,
        });

        if (response.status < 200 || response.status >= 300) {
          throw new Error(`Failed to fetch Woolworths products (${response.status})`);
        }

        return parseWoolworthsPayload(response.data, getHeaderValue(response.headers, 'content-type'));
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError instanceof Error ? lastError : new Error('Failed to fetch Woolworths products.');
  };

  const requestWoolworthsFromWeb = async () => {
    let lastError: unknown = null;

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 15000);

      try {
        if (attempt > 0) {
          await sleep(250 * attempt);
        }

        const res = await fetch(`https://www.woolworths.com.au/apis/ui/Search/products?${search.toString()}`, {
          headers: woolworthsHeaders,
          signal: controller.signal,
        });
        const json = await readJsonResponse(res);
        if (!res.ok) {
          throw new Error(
            (typeof json.error === 'string' && json.error) ||
            (typeof json.raw === 'string' && json.raw) ||
            `Failed to fetch Woolworths products (${res.status})`,
          );
        }
        return json;
      } catch (error) {
        lastError = error;
      } finally {
        window.clearTimeout(timeout);
      }
    }

    throw lastError instanceof Error ? lastError : new Error('Failed to fetch Woolworths products.');
  };

  try {
    const json = isNativeShell()
      ? await requestWoolworthsFromNativeShell()
      : await requestWoolworthsFromWeb();

    return collectWoolworthsProducts(json)
      .map((product: any) => normalizeWoolworthsProduct(product))
      .filter(Boolean)
      .slice(0, limit) as ShoppingProductResult[];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error || '');
    if ((error instanceof DOMException && error.name === 'AbortError') || /timed out|timeout/i.test(message)) {
      throw new Error('Woolworths search timed out. Please try again.');
    }
    throw error instanceof Error ? error : new Error('Failed to search Woolworths.');
  }
}

export async function fetchRetailerShoppingSearch(
  retailer: ShoppingRetailer,
  params: {
    q: string;
    limit?: number;
    store?: ShoppingStoreSummary | null;
  },
): Promise<ShoppingRetailerResults> {
  if (retailer === 'woolworths') {
    try {
      const results = await fetchWoolworthsShoppingSearch({
        q: params.q,
        limit: params.limit,
      });
      return buildReadyRetailerResult('woolworths', String(params.q || '').trim(), results);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error || '');
      return createUnavailableRetailerResult(
        'woolworths',
        'error',
        /timed out|timeout/i.test(message)
          ? 'Woolworths search timed out. Please try again.'
          : 'Woolworths search is unavailable right now.',
      );
    }
  }

  const response = await fetchShoppingSearch({
    q: params.q,
    limit: params.limit,
    retailers: [retailer],
    mode: 'default',
    storesByRetailer: {
      [retailer]: params.store || null,
    },
  });
  return readRetailerSearchResult(response, retailer);
}

function transportFirstNonEmptyString(...values: unknown[]) {
  for (const value of values) {
    const raw = String(value || '').trim();
    if (raw) return raw;
  }
  return '';
}

function transportUniqueStrings(values: Array<string | null | undefined>) {
  return [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))];
}

function transportToFiniteNumber(value: unknown) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function stripTransportHtml(input: string) {
  return String(input || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function normalizeTransportText(value: string) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function escapeTransportRegExp(value: string) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hasTransportPhraseMatch(text: string, query: string) {
  const normalizedText = normalizeTransportText(text);
  const normalizedQuery = normalizeTransportText(query);
  if (!normalizedText || !normalizedQuery) return false;
  const pattern = new RegExp(`(^|\\b)${escapeTransportRegExp(normalizedQuery)}(\\b|$)`, 'i');
  return pattern.test(normalizedText);
}

function hashTransportString(value: string) {
  return value.split('').reduce((acc, char) => ((acc << 5) - acc + char.charCodeAt(0)) & 0, 0);
}

function parseTransportCoordReference(value: string) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const tfnswMatch = raw.match(/^(-?\d+(?:\.\d+)?):(-?\d+(?:\.\d+)?)(?::EPSG:\d+)?$/);
  if (tfnswMatch) {
    return { lng: Number(tfnswMatch[1]), lat: Number(tfnswMatch[2]) };
  }
  const gpMatch = raw.match(/^GP:(-?\d+(?:\.\d+)?)\^(-?\d+(?:\.\d+)?)$/i);
  if (gpMatch) {
    return { lat: Number(gpMatch[1]), lng: Number(gpMatch[2]) };
  }
  const commaParts = raw.split(',').map((part) => Number(part.trim()));
  if (commaParts.length === 2 && commaParts.every(Number.isFinite)) {
    return { lat: commaParts[0], lng: commaParts[1] };
  }
  return null;
}

function getSouthAustraliaWeekdayColumn(dateKey: string) {
  const date = new Date(`${dateKey.slice(0, 4)}-${dateKey.slice(4, 6)}-${dateKey.slice(6, 8)}T12:00:00Z`);
  return ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][date.getUTCDay()];
}

function getSouthAustraliaOffsetSuffix(dateKey: string) {
  const value = `${dateKey.slice(0, 4)}-${dateKey.slice(4, 6)}-${dateKey.slice(6, 8)}T12:00:00Z`;
  const formatter = new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Adelaide',
    timeZoneName: 'shortOffset',
    hour: '2-digit',
  });
  const offsetPart = formatter.formatToParts(new Date(value)).find((part) => part.type === 'timeZoneName')?.value || 'GMT+09:30';
  const match = offsetPart.match(/GMT([+-]\d{1,2})(?::?(\d{2}))?/i);
  if (!match) return '+09:30';
  const hours = match[1].startsWith('+') || match[1].startsWith('-') ? match[1] : `+${match[1]}`;
  const paddedHours = `${hours[0]}${hours.slice(1).padStart(2, '0')}`;
  return `${paddedHours}:${match[2] || '00'}`;
}

function southAustraliaServiceSecondsToIso(dateKey: string, seconds: number | null | undefined) {
  if (!dateKey || !Number.isFinite(Number(seconds))) return '';
  const totalSeconds = Number(seconds);
  const dayOffset = Math.floor(totalSeconds / 86400);
  const remainder = ((totalSeconds % 86400) + 86400) % 86400;
  const hours = String(Math.floor(remainder / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((remainder % 3600) / 60)).padStart(2, '0');
  const secs = String(remainder % 60).padStart(2, '0');
  const localDate = new Date(`${dateKey.slice(0, 4)}-${dateKey.slice(4, 6)}-${dateKey.slice(6, 8)}T12:00:00Z`);
  localDate.setUTCDate(localDate.getUTCDate() + dayOffset);
  const yyyy = localDate.getUTCFullYear();
  const mm = String(localDate.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(localDate.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hours}:${minutes}:${secs}${getSouthAustraliaOffsetSuffix(`${yyyy}${mm}${dd}`)}`;
}

function listTransportSqlPlaceholders(values: unknown[]) {
  return values.map(() => '?').join(', ');
}

function fetchBytesWithTimeout(url: string, timeoutMs = 30000): Promise<Uint8Array> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { signal: controller.signal })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`Failed to download Adelaide Metro data (${response.status})`);
      }
      return new Uint8Array(await response.arrayBuffer());
    })
    .catch((error) => {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new Error('Adelaide Metro data download timed out. Please try again.');
      }
      throw error instanceof Error ? error : new Error('Failed to download Adelaide Metro data.');
    })
    .finally(() => {
      window.clearTimeout(timeout);
    });
}

function concatUint8Arrays(chunks: Uint8Array[]) {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const combined = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.length;
  }
  return combined;
}

async function loadSouthAustraliaSqlJs() {
  if (!southAustraliaSqlJsPromise) {
    southAustraliaSqlJsPromise = initSqlJs({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/sql.js@${SOUTH_AUSTRALIA_SQL_JS_VERSION}/dist/${file}`,
    });
  }
  return southAustraliaSqlJsPromise;
}

async function fetchSouthAustraliaCacheManifest(): Promise<SouthAustraliaCacheManifest> {
  const params = new URLSearchParams({ provider: 'transport_sa' });
  return fetchTransportJson<SouthAustraliaCacheManifest>('/transport/cache-manifest', params, 15000, 'transport_sa');
}

async function ensureSouthAustraliaDb(): Promise<SouthAustraliaDbDriver> {
  if (!southAustraliaDbPromise) {
    southAustraliaDbPromise = (async () => {
      const manifest = await fetchSouthAustraliaCacheManifest();
      if (!Array.isArray(manifest.partUrls) || manifest.partUrls.length === 0) {
        throw new Error('Adelaide Metro cache manifest did not include any downloadable data.');
      }
      const cachedParts = await readSouthAustraliaCachedParts(manifest.cacheKey, manifest.partUrls.length);
      const [SQL, compressedParts] = await Promise.all([
        loadSouthAustraliaSqlJs(),
        cachedParts ? Promise.resolve(cachedParts) : Promise.all(manifest.partUrls.map((url) => fetchBytesWithTimeout(url))),
      ]);
      if (!cachedParts) {
        void persistSouthAustraliaCachedParts(manifest.cacheKey, compressedParts);
      }
      const inflatedParts = compressedParts.map((part) => gunzipSync(part));
      const db = new SQL.Database(concatUint8Arrays(inflatedParts));
      return {
        cacheKey: manifest.cacheKey,
        all(sql: string, params: unknown[] = []) {
          const statement = db.prepare(sql);
          try {
            statement.bind(params as any);
            const rows: any[] = [];
            while (statement.step()) rows.push(statement.getAsObject());
            return rows;
          } finally {
            statement.free();
          }
        },
        get(sql: string, params: unknown[] = []) {
          const rows = this.all(sql, params);
          return rows[0] || null;
        },
      };
    })().catch((error) => {
      southAustraliaDbPromise = null;
      throw error;
    });
  }
  return southAustraliaDbPromise;
}

export function warmTransportProvider(provider?: TransportProvider) {
  if (provider === 'transport_sa') {
    void ensureSouthAustraliaDb().catch((error) => {
      console.error('GHAR Adelaide Metro warm error:', error);
    });
  }
}

function buildSouthAustraliaActiveServiceCte(dateKey: string) {
  const weekday = getSouthAustraliaWeekdayColumn(dateKey);
  return {
    sql: `
      WITH active_services AS (
        SELECT service_id FROM calendar
        WHERE start_date <= ? AND end_date >= ? AND ${weekday} = 1
        UNION
        SELECT service_id FROM calendar_dates WHERE date = ? AND exception_type = 1
        EXCEPT
        SELECT service_id FROM calendar_dates WHERE date = ? AND exception_type = 2
      )
    `,
    params: [dateKey, dateKey, dateKey, dateKey],
  };
}

function buildSouthAustraliaModeFilterSql(modes: string[] | undefined, alias = 'r') {
  const validModes = transportUniqueStrings(modes).filter((mode) => ['train', 'light_rail', 'bus'].includes(mode));
  if (!validModes.length) return { sql: '', params: [] as string[] };
  return {
    sql: ` AND ${alias}.route_mode IN (${listTransportSqlPlaceholders(validModes)})`,
    params: validModes,
  };
}

function buildSouthAustraliaStopLabel(code: unknown) {
  const cleanCode = String(code || '').trim();
  return cleanCode ? `Stop ${cleanCode}` : '';
}

function computeSouthAustraliaQuerySeconds(when: string, dateInput?: string, timeInput?: string) {
  const now = new Date();
  const dateKey = (dateInput || now.toISOString().slice(0, 10)).replace(/-/g, '');
  if (when === 'leave_now') {
    const adelaideNow = new Intl.DateTimeFormat('en-AU', {
      timeZone: 'Australia/Adelaide',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).formatToParts(now);
    const hour = Number(adelaideNow.find((part) => part.type === 'hour')?.value || '0');
    const minute = Number(adelaideNow.find((part) => part.type === 'minute')?.value || '0');
    const second = Number(adelaideNow.find((part) => part.type === 'second')?.value || '0');
    return { dateKey, seconds: hour * 3600 + minute * 60 + second };
  }
  const timeValue = String(timeInput || '09:00').trim();
  const [hours, minutes] = timeValue.split(':').map((value) => Number(value || 0));
  const seconds = (Number.isFinite(hours) ? hours : 0) * 3600 + (Number.isFinite(minutes) ? minutes : 0) * 60;
  return { dateKey, seconds };
}

function resolveSouthAustraliaStopCandidates(
  driver: SouthAustraliaDbDriver,
  ref: string,
  requestType: string,
  role: 'origin' | 'destination' | 'stop' = 'origin',
) {
  if (requestType === 'coord') {
    const coord = parseTransportCoordReference(ref);
    if (!coord) return [];
    const fetchLimit = role === 'destination'
      ? SOUTH_AUSTRALIA_COORD_DESTINATION_FETCH_LIMIT
      : SOUTH_AUSTRALIA_COORD_ORIGIN_FETCH_LIMIT;
    const resultLimit = role === 'destination'
      ? SOUTH_AUSTRALIA_COORD_DESTINATION_RESULT_LIMIT
      : SOUTH_AUSTRALIA_COORD_ORIGIN_RESULT_LIMIT;
    const maxWalkKm = role === 'destination'
      ? SOUTH_AUSTRALIA_COORD_DESTINATION_MAX_WALK_KM
      : SOUTH_AUSTRALIA_COORD_ORIGIN_MAX_WALK_KM;
    const nearbyRows = driver.all(
      `
      SELECT stop_id, stop_name, stop_lat, stop_lon, parent_station, location_type, stop_code
      FROM stops
      WHERE stop_lat IS NOT NULL AND stop_lon IS NOT NULL
      ORDER BY ((stop_lat - ?) * (stop_lat - ?)) + ((stop_lon - ?) * (stop_lon - ?))
      LIMIT ?
      `,
      [coord.lat, coord.lat, coord.lng, coord.lng, fetchLimit],
    );
    const expandedRows: any[] = [];
    for (const row of nearbyRows) {
      const childStops = Number(row.location_type || 0) === 1
        ? driver.all(
            `
            SELECT stop_id, stop_name, stop_lat, stop_lon, parent_station, location_type, stop_code
            FROM stops
            WHERE parent_station = ?
            `,
            [String(row.stop_id)],
          )
        : [];
      if (childStops.length) {
        expandedRows.push(...childStops);
      } else {
        expandedRows.push(row);
      }
    }
    const dedupedRows = [...new Map(expandedRows.map((row) => [String(row.stop_id), row])).values()];
    const rankedStops = dedupedRows
      .map((row: any) => ({
        ...row,
        walkDistanceKm: haversineKm(coord.lat, coord.lng, Number(row.stop_lat), Number(row.stop_lon)),
        requestCoord: coord,
      }))
      .sort((left: any, right: any) => {
        if (left.walkDistanceKm !== right.walkDistanceKm) return left.walkDistanceKm - right.walkDistanceKm;
        return String(left.stop_name || '').localeCompare(String(right.stop_name || ''));
      });
    const withinWalkRange = rankedStops.filter((row: any) => row.walkDistanceKm <= maxWalkKm);
    return (withinWalkRange.length ? withinWalkRange : rankedStops).slice(0, resultLimit);
  }

  const selectedStop = driver.get(
    `SELECT stop_id, stop_name, stop_lat, stop_lon, parent_station, location_type, stop_code FROM stops WHERE stop_id = ?`,
    [ref],
  );
  if (!selectedStop) return [];

  const siblingStops = selectedStop.parent_station
    ? driver.all(
        `SELECT stop_id, stop_name, stop_lat, stop_lon, parent_station, location_type, stop_code FROM stops WHERE parent_station = ?`,
        [String(selectedStop.parent_station)],
      )
    : [];
  const childStops = !selectedStop.parent_station && Number(selectedStop.location_type || 0) === 1
    ? driver.all(
        `SELECT stop_id, stop_name, stop_lat, stop_lon, parent_station, location_type, stop_code FROM stops WHERE parent_station = ?`,
        [String(selectedStop.stop_id)],
      )
    : [];
  const results = siblingStops.length ? siblingStops : childStops.length ? childStops : [selectedStop];
  return results.map((row: any) => ({
    ...row,
    walkDistanceKm: 0,
    requestCoord: null,
  }));
}

function buildSouthAustraliaDirectTripQuery(
  originStops: string[],
  destinationStops: string[],
  dateKey: string,
  startSeconds: number,
  maxResults: number,
  when: string,
  modes?: string[],
  wheelchair?: boolean,
) {
  const activeServices = buildSouthAustraliaActiveServiceCte(dateKey);
  const modeFilter = buildSouthAustraliaModeFilterSql(modes);
  const wheelchairSql = wheelchair ? ` AND COALESCE(t.wheelchair_accessible, 0) != 2 ` : '';
  const lowerBound = Math.max(0, startSeconds - SOUTH_AUSTRALIA_ROUTE_SEARCH_WINDOW_SECONDS);
  const timeSql = when === 'arrive_by'
    ? ` AND d.arrival_sec <= ? AND d.arrival_sec >= ? `
    : ` AND o.departure_sec >= ? AND o.departure_sec <= ? `;
  const orderSql = when === 'arrive_by' ? ` ORDER BY o.departure_sec DESC ` : ` ORDER BY d.arrival_sec ASC `;
  const params = [
    ...activeServices.params,
    ...originStops,
    ...destinationStops,
    startSeconds,
    when === 'arrive_by' ? lowerBound : startSeconds + SOUTH_AUSTRALIA_ROUTE_SEARCH_WINDOW_SECONDS,
    ...modeFilter.params,
    maxResults,
  ];
  const sql = `
    ${activeServices.sql}
    SELECT
      o.trip_id,
      o.stop_id AS origin_stop_id,
      d.stop_id AS destination_stop_id,
      o.stop_sequence AS origin_sequence,
      d.stop_sequence AS destination_sequence,
      o.departure_sec,
      d.arrival_sec,
      t.route_id,
      t.trip_headsign,
      t.shape_id,
      t.wheelchair_accessible,
      r.agency_name,
      r.route_short_name,
      r.route_long_name,
      r.route_mode,
      r.route_mode_label,
      os.stop_name AS origin_stop_name,
      os.stop_code AS origin_stop_code,
      ds.stop_name AS destination_stop_name,
      ds.stop_code AS destination_stop_code,
      os.stop_lat AS origin_stop_lat,
      os.stop_lon AS origin_stop_lon,
      ds.stop_lat AS destination_stop_lat,
      ds.stop_lon AS destination_stop_lon
    FROM stop_times o
    JOIN stop_times d
      ON d.trip_id = o.trip_id
     AND d.stop_sequence > o.stop_sequence
    JOIN trips t ON t.trip_id = o.trip_id
    JOIN active_services active ON active.service_id = t.service_id
    JOIN routes r ON r.route_id = t.route_id
    JOIN stops os ON os.stop_id = o.stop_id
    JOIN stops ds ON ds.stop_id = d.stop_id
    WHERE o.stop_id IN (${listTransportSqlPlaceholders(originStops)})
      AND d.stop_id IN (${listTransportSqlPlaceholders(destinationStops)})
      ${timeSql}
      ${modeFilter.sql}
      ${wheelchairSql}
    ${orderSql}
    LIMIT ?
  `;
  return { sql, params };
}

function buildSouthAustraliaTransferTripQuery(
  originStops: string[],
  destinationStops: string[],
  dateKey: string,
  startSeconds: number,
  maxResults: number,
  when: string,
  modes?: string[],
  wheelchair?: boolean,
) {
  const activeServices = buildSouthAustraliaActiveServiceCte(dateKey);
  const modeFilterFirst = buildSouthAustraliaModeFilterSql(modes, 'r1');
  const modeFilterSecond = buildSouthAustraliaModeFilterSql(modes, 'r2');
  const wheelchairFirstSql = wheelchair ? ` AND COALESCE(t1.wheelchair_accessible, 0) != 2 ` : '';
  const wheelchairSecondSql = wheelchair ? ` AND COALESCE(t2.wheelchair_accessible, 0) != 2 ` : '';
  const lowerBound = Math.max(0, startSeconds - SOUTH_AUSTRALIA_ROUTE_SEARCH_WINDOW_SECONDS);
  const upperBound = startSeconds + SOUTH_AUSTRALIA_ROUTE_SEARCH_WINDOW_SECONDS;
  const firstLegTimeSql = when === 'arrive_by'
    ? ` AND a.departure_sec >= ? AND a.departure_sec <= ? `
    : ` AND a.departure_sec >= ? AND a.departure_sec <= ? `;
  const secondLegTimeSql = when === 'arrive_by'
    ? ` AND z.arrival_sec <= ? AND z.arrival_sec >= ? `
    : ` AND b.departure_sec >= ? AND b.departure_sec <= ? `;
  const firstLegOrderSql = when === 'arrive_by' ? ` ORDER BY a.departure_sec DESC ` : ` ORDER BY a.departure_sec ASC `;
  const secondLegOrderSql = when === 'arrive_by' ? ` ORDER BY z.arrival_sec DESC ` : ` ORDER BY b.departure_sec ASC `;
  const orderSql = when === 'arrive_by'
    ? ` ORDER BY first_departure_sec DESC `
    : ` ORDER BY final_arrival_sec ASC `;
  const candidateLimit = Math.max(80, maxResults * 24);
  const selectColumns = `
    SELECT
      first_legs.first_trip_id,
      second_legs.second_trip_id,
      first_legs.origin_stop_id,
      first_legs.transfer_stop_id,
      second_legs.destination_stop_id,
      first_legs.origin_sequence,
      first_legs.first_transfer_sequence,
      second_legs.second_transfer_sequence,
      second_legs.destination_sequence,
      first_legs.first_departure_sec,
      first_legs.first_arrival_sec,
      second_legs.second_departure_sec,
      second_legs.final_arrival_sec,
      first_legs.first_route_id,
      second_legs.second_route_id,
      first_legs.first_headsign,
      second_legs.second_headsign,
      first_legs.first_shape_id,
      second_legs.second_shape_id,
      first_legs.first_wheelchair_accessible,
      second_legs.second_wheelchair_accessible,
      first_legs.first_agency_name,
      second_legs.second_agency_name,
      first_legs.first_route_short_name,
      first_legs.first_route_long_name,
      first_legs.first_route_mode,
      first_legs.first_route_mode_label,
      second_legs.second_route_short_name,
      second_legs.second_route_long_name,
      second_legs.second_route_mode,
      second_legs.second_route_mode_label,
      first_legs.origin_stop_name,
      first_legs.origin_stop_code,
      first_legs.transfer_stop_name,
      first_legs.transfer_stop_code,
      second_legs.destination_stop_name,
      second_legs.destination_stop_code,
      first_legs.origin_stop_lat,
      first_legs.origin_stop_lon,
      first_legs.transfer_stop_lat,
      first_legs.transfer_stop_lon,
      second_legs.destination_stop_lat,
      second_legs.destination_stop_lon
  `;
  const ctes = `
    first_legs AS (
      SELECT
        a.trip_id AS first_trip_id,
        a.stop_id AS origin_stop_id,
        x.stop_id AS transfer_stop_id,
        a.stop_sequence AS origin_sequence,
        x.stop_sequence AS first_transfer_sequence,
        a.departure_sec AS first_departure_sec,
        x.arrival_sec AS first_arrival_sec,
        t1.route_id AS first_route_id,
        t1.trip_headsign AS first_headsign,
        t1.shape_id AS first_shape_id,
        t1.wheelchair_accessible AS first_wheelchair_accessible,
        r1.agency_name AS first_agency_name,
        r1.route_short_name AS first_route_short_name,
        r1.route_long_name AS first_route_long_name,
        r1.route_mode AS first_route_mode,
        r1.route_mode_label AS first_route_mode_label,
        os.stop_name AS origin_stop_name,
        os.stop_code AS origin_stop_code,
        ts.stop_name AS transfer_stop_name,
        ts.stop_code AS transfer_stop_code,
        os.stop_lat AS origin_stop_lat,
        os.stop_lon AS origin_stop_lon,
        ts.stop_lat AS transfer_stop_lat,
        ts.stop_lon AS transfer_stop_lon
      FROM stop_times a
      JOIN stop_times x
        ON x.trip_id = a.trip_id
       AND x.stop_sequence > a.stop_sequence
      JOIN trips t1 ON t1.trip_id = a.trip_id
      JOIN active_services active1 ON active1.service_id = t1.service_id
      JOIN routes r1 ON r1.route_id = t1.route_id
      JOIN stops os ON os.stop_id = a.stop_id
      JOIN stops ts ON ts.stop_id = x.stop_id
      WHERE a.stop_id IN (${listTransportSqlPlaceholders(originStops)})
        ${firstLegTimeSql}
        ${modeFilterFirst.sql}
        ${wheelchairFirstSql}
      ${firstLegOrderSql}
      LIMIT ${candidateLimit}
    ),
    second_legs AS (
      SELECT
        b.trip_id AS second_trip_id,
        b.stop_id AS transfer_stop_id,
        transfer_stop.parent_station AS transfer_parent_station,
        z.stop_id AS destination_stop_id,
        b.stop_sequence AS second_transfer_sequence,
        z.stop_sequence AS destination_sequence,
        b.departure_sec AS second_departure_sec,
        z.arrival_sec AS final_arrival_sec,
        t2.route_id AS second_route_id,
        t2.trip_headsign AS second_headsign,
        t2.shape_id AS second_shape_id,
        t2.wheelchair_accessible AS second_wheelchair_accessible,
        r2.agency_name AS second_agency_name,
        r2.route_short_name AS second_route_short_name,
        r2.route_long_name AS second_route_long_name,
        r2.route_mode AS second_route_mode,
        r2.route_mode_label AS second_route_mode_label,
        ds.stop_name AS destination_stop_name,
        ds.stop_code AS destination_stop_code,
        ds.stop_lat AS destination_stop_lat,
        ds.stop_lon AS destination_stop_lon
      FROM stop_times b
      JOIN trips t2 ON t2.trip_id = b.trip_id
      JOIN active_services active2 ON active2.service_id = t2.service_id
      JOIN routes r2 ON r2.route_id = t2.route_id
      JOIN stop_times z
        ON z.trip_id = b.trip_id
       AND z.stop_sequence > b.stop_sequence
      JOIN stops transfer_stop ON transfer_stop.stop_id = b.stop_id
      JOIN stops ds ON ds.stop_id = z.stop_id
      WHERE z.stop_id IN (${listTransportSqlPlaceholders(destinationStops)})
        ${secondLegTimeSql}
        ${modeFilterSecond.sql}
        ${wheelchairSecondSql}
      ${secondLegOrderSql}
      LIMIT ${candidateLimit}
    )
  `;
  const firstLegParams = [
    ...activeServices.params,
    ...originStops,
    when === 'arrive_by' ? lowerBound : startSeconds,
    when === 'arrive_by' ? startSeconds : upperBound,
    ...modeFilterFirst.params,
  ];
  const secondLegParams = [
    ...destinationStops,
    startSeconds,
    when === 'arrive_by' ? lowerBound : upperBound,
    ...modeFilterSecond.params,
  ];
  const sameStopBranch = `
    ${selectColumns}
    FROM first_legs
    JOIN second_legs
      ON second_legs.transfer_stop_id = first_legs.transfer_stop_id
     AND second_legs.second_departure_sec >= first_legs.first_arrival_sec
    WHERE first_legs.first_trip_id != second_legs.second_trip_id
  `;
  const explicitTransferBranch = `
    ${selectColumns}
    FROM first_legs
    JOIN transfers transfer_rule
      ON transfer_rule.from_stop_id = first_legs.transfer_stop_id
    JOIN second_legs
      ON second_legs.transfer_stop_id = transfer_rule.to_stop_id
     AND second_legs.second_departure_sec >= first_legs.first_arrival_sec + COALESCE(transfer_rule.min_transfer_time, ?)
    WHERE first_legs.first_trip_id != second_legs.second_trip_id
  `;
  const siblingPlatformBranch = `
    ${selectColumns}
    FROM first_legs
    JOIN stops transfer_origin_stop
      ON transfer_origin_stop.stop_id = first_legs.transfer_stop_id
    JOIN second_legs
      ON transfer_origin_stop.parent_station IS NOT NULL
     AND transfer_origin_stop.parent_station != ''
     AND second_legs.transfer_parent_station = transfer_origin_stop.parent_station
     AND second_legs.transfer_stop_id != first_legs.transfer_stop_id
     AND second_legs.second_departure_sec >= first_legs.first_arrival_sec + ?
    WHERE first_legs.first_trip_id != second_legs.second_trip_id
  `;
  const params = [
    ...firstLegParams,
    ...secondLegParams,
    SOUTH_AUSTRALIA_DEFAULT_TRANSFER_BUFFER_SECONDS,
    SOUTH_AUSTRALIA_DEFAULT_PLATFORM_TRANSFER_SECONDS,
    maxResults,
  ];
  const sql = `
    ${activeServices.sql},
    ${ctes}
    SELECT * FROM (
      ${sameStopBranch}
      UNION ALL
      ${explicitTransferBranch}
      UNION ALL
      ${siblingPlatformBranch}
    ) transfer_candidates
    ${orderSql}
    LIMIT ?
  `;
  return { sql, params };
}

function buildSouthAustraliaWalkLeg(
  id: string,
  originName: string,
  destinationName: string,
  originLat: number | null,
  originLng: number | null,
  destinationLat: number | null,
  destinationLng: number | null,
  dateKey: string,
  departureSec: number,
  arrivalSec: number,
): TransportTripLeg {
  const distanceKm =
    originLat != null && originLng != null && destinationLat != null && destinationLng != null
      ? haversineKm(originLat, originLng, destinationLat, destinationLng)
      : null;
  return {
    id,
    mode: 'walk',
    modeLabel: 'Walk',
    lineName: 'Walk',
    lineNumber: '',
    destinationLabel: destinationName,
    operator: '',
    originName,
    originSubtitle: '',
    originStopId: '',
    originPlatform: '',
    originLat,
    originLng,
    destinationName,
    destinationSubtitle: '',
    destinationStopId: '',
    destinationPlatform: '',
    destinationLat,
    destinationLng,
    departureTimePlanned: southAustraliaServiceSecondsToIso(dateKey, departureSec),
    departureTimeEstimated: '',
    arrivalTimePlanned: southAustraliaServiceSecondsToIso(dateKey, arrivalSec),
    arrivalTimeEstimated: '',
    durationMinutes: Math.max(1, Math.round((arrivalSec - departureSec) / 60)),
    distanceKm,
    realtime: false,
    accessible: true,
    alerts: [],
    pathDescriptions: [`Walk to ${destinationName}`],
    provider: 'transport_sa',
    serviceDate: dateKey,
  };
}

function createSouthAustraliaTransitLegFromRow(row: any, prefix: 'first' | 'second' | ''): TransportTripLeg {
  const tripPrefix = prefix ? `${prefix}_` : '';
  const originCode = row[`${tripPrefix}origin_stop_code`] || row.origin_stop_code || row.transfer_stop_code || '';
  const destinationCode = row[`${tripPrefix}destination_stop_code`] || row.destination_stop_code || row.transfer_stop_code || '';
  return {
    id: `${row[`${tripPrefix}trip_id`]}:${row[`${tripPrefix}origin_sequence`] || row.origin_sequence || ''}`,
    mode: String(row[`${tripPrefix}route_mode`] || row.route_mode || 'bus'),
    modeLabel: String(row[`${tripPrefix}route_mode_label`] || row.route_mode_label || 'Transit'),
    lineName: String(row[`${tripPrefix}route_short_name`] || row[`${tripPrefix}route_long_name`] || row.route_long_name || 'Transit'),
    lineNumber: String(row[`${tripPrefix}route_short_name`] || row.route_short_name || ''),
    destinationLabel: String(row[`${tripPrefix}headsign`] || row.trip_headsign || row.destination_stop_name || ''),
    operator: String(row[`${tripPrefix}agency_name`] || row.agency_name || 'Adelaide Metro'),
    originName: String(row.origin_stop_name || row.transfer_stop_name || ''),
    originSubtitle: buildSouthAustraliaStopLabel(originCode),
    originStopId: String(row[`${tripPrefix}origin_stop_id`] || row.origin_stop_id || row.transfer_stop_id || ''),
    originPlatform: buildSouthAustraliaStopLabel(originCode),
    originLat: transportToFiniteNumber(row[`${tripPrefix}origin_stop_lat`] || row.origin_stop_lat || row.transfer_stop_lat),
    originLng: transportToFiniteNumber(row[`${tripPrefix}origin_stop_lon`] || row.origin_stop_lon || row.transfer_stop_lon),
    destinationName: String(row[`${tripPrefix}destination_stop_name`] || row.destination_stop_name || row.transfer_stop_name || ''),
    destinationSubtitle: buildSouthAustraliaStopLabel(destinationCode),
    destinationStopId: String(row[`${tripPrefix}destination_stop_id`] || row.destination_stop_id || row.transfer_stop_id || ''),
    destinationPlatform: buildSouthAustraliaStopLabel(destinationCode),
    destinationLat: transportToFiniteNumber(row[`${tripPrefix}destination_stop_lat`] || row.destination_stop_lat || row.transfer_stop_lat),
    destinationLng: transportToFiniteNumber(row[`${tripPrefix}destination_stop_lon`] || row.destination_stop_lon || row.transfer_stop_lon),
    departureTimePlanned: '',
    departureTimeEstimated: '',
    arrivalTimePlanned: '',
    arrivalTimeEstimated: '',
    durationMinutes: 0,
    distanceKm: null,
    realtime: false,
    accessible: Number(row[`${tripPrefix}wheelchair_accessible`] || row.wheelchair_accessible || 0) !== 2,
    alerts: [],
    pathDescriptions: [],
    provider: 'transport_sa',
    serviceDate: '',
    tripId: String(row[`${tripPrefix}trip_id`] || row.trip_id || ''),
    routeId: String(row[`${tripPrefix}route_id`] || row.route_id || ''),
    shapeId: String(row[`${tripPrefix}shape_id`] || row.shape_id || ''),
  };
}

async function searchTransportSouthAustraliaLocationsDirect(query: string): Promise<TransportLocationSuggestion[]> {
  const cleanQuery = String(query || '').trim().toLowerCase();
  if (cleanQuery.length < 2) return [];
  const driver = await ensureSouthAustraliaDb();
  const rows = driver.all(
    `
    SELECT stop_id, stop_name, stop_lat, stop_lon, parent_station, location_type, stop_code
    FROM stops
    WHERE stop_search LIKE ?
    ORDER BY
      CASE WHEN stop_search = ? THEN 0 ELSE 1 END,
      CASE WHEN stop_search LIKE ? THEN 0 ELSE 1 END,
      location_type DESC,
      LENGTH(stop_name),
      stop_name
    LIMIT 10
    `,
    [`%${cleanQuery}%`, cleanQuery, `${cleanQuery}%`],
  );
  return rows.map((row: any, index: number) => ({
    id: String(row.stop_id),
    ref: String(row.stop_id),
    requestType: 'any',
    type: Number(row.location_type || 0) === 1 ? 'station' : 'stop',
    name: String(row.stop_name || 'Stop'),
    subtitle: buildSouthAustraliaStopLabel(row.stop_code) || (Number(row.location_type || 0) === 1 ? 'Station' : 'Stop'),
    lat: transportToFiniteNumber(row.stop_lat),
    lng: transportToFiniteNumber(row.stop_lon),
    matchQuality: null,
    isBest: index === 0,
    modes: [],
    provider: 'transport_sa',
  }));
}

async function fetchTransportSouthAustraliaTripsDirect(query: TransportTripQuery): Promise<TransportTripOption[]> {
  const driver = await ensureSouthAustraliaDb();
  const originCandidates = resolveSouthAustraliaStopCandidates(
    driver,
    query.origin.ref,
    query.origin.requestType || 'any',
    'origin',
  );
  const destinationCandidates = resolveSouthAustraliaStopCandidates(
    driver,
    query.destination.ref,
    query.destination.requestType || 'any',
    'destination',
  );
  if (!originCandidates.length || !destinationCandidates.length) return [];

  const { dateKey, seconds } = computeSouthAustraliaQuerySeconds(query.when || 'leave_now', query.date, query.time);
  const originStops = transportUniqueStrings(originCandidates.map((stop: any) => String(stop.stop_id)));
  const destinationStops = transportUniqueStrings(destinationCandidates.map((stop: any) => String(stop.stop_id)));
  const directQuery = buildSouthAustraliaDirectTripQuery(
    originStops,
    destinationStops,
    dateKey,
    seconds,
    Math.max(6, Number(query.maxTrips || 6)),
    query.when || 'leave_now',
    query.modes,
    query.wheelchair,
  );
  const transferQuery = buildSouthAustraliaTransferTripQuery(
    originStops,
    destinationStops,
    dateKey,
    seconds,
    Math.max(6, Number(query.maxTrips || 6)),
    query.when || 'leave_now',
    query.modes,
    query.wheelchair,
  );
  const directRows = driver.all(directQuery.sql, directQuery.params);
  const transferRows = driver.all(transferQuery.sql, transferQuery.params);
  const originCoord = originCandidates[0]?.requestCoord || null;
  const destinationCoord = destinationCandidates[0]?.requestCoord || null;
  const results: TransportTripOption[] = [];

  for (const row of directRows) {
    const transitLeg = createSouthAustraliaTransitLegFromRow(row, '');
    const departureSec = Number(row.departure_sec || 0);
    const arrivalSec = Number(row.arrival_sec || 0);
    transitLeg.serviceDate = dateKey;
    transitLeg.departureTimePlanned = southAustraliaServiceSecondsToIso(dateKey, departureSec);
    transitLeg.arrivalTimePlanned = southAustraliaServiceSecondsToIso(dateKey, arrivalSec);
    transitLeg.durationMinutes = Math.max(1, Math.round((arrivalSec - departureSec) / 60));

    const legs: TransportTripLeg[] = [];
    if (originCoord && transitLeg.originLat != null && transitLeg.originLng != null) {
      const walkMinutes = Math.max(1, Math.round((haversineKm(originCoord.lat, originCoord.lng, transitLeg.originLat, transitLeg.originLng) / 4.5) * 60));
      const walkArrivalSec = Math.max(0, departureSec - walkMinutes * 60);
      legs.push(
        buildSouthAustraliaWalkLeg(
          `sa-walk-origin-${row.trip_id}`,
          query.origin.name || 'Origin',
          transitLeg.originName,
          originCoord.lat,
          originCoord.lng,
          transitLeg.originLat,
          transitLeg.originLng,
          dateKey,
          walkArrivalSec,
          departureSec,
        ),
      );
    }
    legs.push(transitLeg);
    if (destinationCoord && transitLeg.destinationLat != null && transitLeg.destinationLng != null) {
      const walkMinutes = Math.max(1, Math.round((haversineKm(transitLeg.destinationLat, transitLeg.destinationLng, destinationCoord.lat, destinationCoord.lng) / 4.5) * 60));
      legs.push(
        buildSouthAustraliaWalkLeg(
          `sa-walk-destination-${row.trip_id}`,
          transitLeg.destinationName,
          query.destination.name || 'Destination',
          transitLeg.destinationLat,
          transitLeg.destinationLng,
          destinationCoord.lat,
          destinationCoord.lng,
          dateKey,
          arrivalSec,
          arrivalSec + walkMinutes * 60,
        ),
      );
    }
    const firstTransitLeg = legs.find((leg) => leg.mode !== 'walk');
    const lastLeg = legs[legs.length - 1];
    const departureTime = transportFirstNonEmptyString(firstTransitLeg?.departureTimePlanned, legs[0]?.departureTimePlanned);
    const arrivalTime = transportFirstNonEmptyString(lastLeg?.arrivalTimePlanned, firstTransitLeg?.arrivalTimePlanned);
    results.push({
      id: `sa-direct-${row.trip_id}`,
      provider: 'transport_sa',
      durationMinutes: Math.max(1, Math.round((new Date(arrivalTime).getTime() - new Date(departureTime).getTime()) / 60000)) || transitLeg.durationMinutes,
      departureTime,
      arrivalTime,
      transferCount: Math.max(0, legs.filter((leg) => leg.mode !== 'walk').length - 1),
      fareText: '',
      hasRealtime: false,
      summary: transportUniqueStrings(legs.filter((leg) => leg.mode !== 'walk').map((leg) => leg.lineNumber || leg.lineName || leg.modeLabel)).slice(0, 3).join(' · '),
      legModes: transportUniqueStrings(legs.map((leg) => leg.mode)),
      alerts: [],
      legs,
    });
  }

  for (const row of transferRows) {
    const firstDepartureSec = Number(row.first_departure_sec || 0);
    const firstArrivalSec = Number(row.first_arrival_sec || 0);
    const secondDepartureSec = Number(row.second_departure_sec || 0);
    const finalArrivalSec = Number(row.final_arrival_sec || 0);
    const firstLeg = createSouthAustraliaTransitLegFromRow({
      ...row,
      first_origin_stop_id: row.origin_stop_id,
      first_destination_stop_id: row.transfer_stop_id,
      first_origin_sequence: row.origin_sequence,
      first_destination_sequence: row.first_transfer_sequence,
      first_departure_sec: row.first_departure_sec,
      first_arrival_sec: row.first_arrival_sec,
      first_destination_stop_name: row.transfer_stop_name,
      first_origin_stop_code: row.origin_stop_code,
      first_destination_stop_code: row.transfer_stop_code,
      first_origin_stop_lat: row.origin_stop_lat,
      first_origin_stop_lon: row.origin_stop_lon,
      first_destination_stop_lat: row.transfer_stop_lat,
      first_destination_stop_lon: row.transfer_stop_lon,
    }, 'first');
    const secondLeg = createSouthAustraliaTransitLegFromRow({
      ...row,
      second_origin_stop_id: row.transfer_stop_id,
      second_destination_stop_id: row.destination_stop_id,
      second_origin_sequence: row.second_transfer_sequence,
      second_destination_sequence: row.destination_sequence,
      second_departure_sec: row.second_departure_sec,
      second_arrival_sec: row.final_arrival_sec,
      second_origin_stop_name: row.transfer_stop_name,
      second_destination_stop_name: row.destination_stop_name,
      second_origin_stop_code: row.transfer_stop_code,
      second_destination_stop_code: row.destination_stop_code,
      second_origin_stop_lat: row.transfer_stop_lat,
      second_origin_stop_lon: row.transfer_stop_lon,
      second_destination_stop_lat: row.destination_stop_lat,
      second_destination_stop_lon: row.destination_stop_lon,
    }, 'second');
    firstLeg.serviceDate = dateKey;
    firstLeg.departureTimePlanned = southAustraliaServiceSecondsToIso(dateKey, firstDepartureSec);
    firstLeg.arrivalTimePlanned = southAustraliaServiceSecondsToIso(dateKey, firstArrivalSec);
    firstLeg.durationMinutes = Math.max(1, Math.round((firstArrivalSec - firstDepartureSec) / 60));
    secondLeg.serviceDate = dateKey;
    secondLeg.departureTimePlanned = southAustraliaServiceSecondsToIso(dateKey, secondDepartureSec);
    secondLeg.arrivalTimePlanned = southAustraliaServiceSecondsToIso(dateKey, finalArrivalSec);
    secondLeg.durationMinutes = Math.max(1, Math.round((finalArrivalSec - secondDepartureSec) / 60));

    const legs: TransportTripLeg[] = [firstLeg];
    legs.push({
      ...buildSouthAustraliaWalkLeg(
        `sa-walk-transfer-${row.first_trip_id}-${row.second_trip_id}`,
        firstLeg.destinationName,
        secondLeg.originName,
        firstLeg.destinationLat,
        firstLeg.destinationLng,
        secondLeg.originLat,
        secondLeg.originLng,
        dateKey,
        firstArrivalSec,
        secondDepartureSec,
      ),
      pathDescriptions: [`Transfer at ${row.transfer_stop_name}`],
    });
    legs.push(secondLeg);

    results.push({
      id: `sa-transfer-${row.first_trip_id}-${row.second_trip_id}`,
      provider: 'transport_sa',
      durationMinutes: Math.max(1, Math.round((finalArrivalSec - firstDepartureSec) / 60)),
      departureTime: firstLeg.departureTimePlanned,
      arrivalTime: secondLeg.arrivalTimePlanned,
      transferCount: 1,
      fareText: '',
      hasRealtime: false,
      summary: transportUniqueStrings([firstLeg.lineNumber || firstLeg.lineName, secondLeg.lineNumber || secondLeg.lineName]).join(' · '),
      legModes: transportUniqueStrings(legs.map((leg) => leg.mode)),
      alerts: [],
      legs,
    });
  }

  const deduped = [...new Map(results.map((result) => [result.id, result])).values()];
  return deduped
    .sort((left, right) => {
      if ((query.when || 'leave_now') === 'arrive_by') {
        return new Date(right.departureTime || 0).getTime() - new Date(left.departureTime || 0).getTime();
      }
      return new Date(left.arrivalTime || 0).getTime() - new Date(right.arrivalTime || 0).getTime();
    })
    .slice(0, Math.max(1, Number(query.maxTrips || 5)));
}

async function fetchTransportSouthAustraliaDeparturesDirect(params: {
  stopId: string;
  date?: string;
  time?: string;
  modes?: string[];
}): Promise<TransportDeparture[]> {
  const driver = await ensureSouthAustraliaDb();
  const stopRows = resolveSouthAustraliaStopCandidates(driver, params.stopId, 'any');
  if (!stopRows.length) return [];
  const stopIds = transportUniqueStrings(stopRows.map((row: any) => String(row.stop_id)));
  const { dateKey, seconds } = computeSouthAustraliaQuerySeconds('depart_at', params.date, params.time);
  const modeFilter = buildSouthAustraliaModeFilterSql(params.modes);
  const activeServices = buildSouthAustraliaActiveServiceCte(dateKey);
  const rows = driver.all(
    `
    ${activeServices.sql}
    SELECT
      st.trip_id,
      st.stop_id,
      st.stop_sequence,
      st.departure_sec,
      st.arrival_sec,
      t.route_id,
      t.trip_headsign,
      t.wheelchair_accessible,
      r.route_short_name,
      r.route_long_name,
      r.route_mode,
      r.route_mode_label,
      s.stop_name,
      s.stop_code
    FROM stop_times st
    JOIN trips t ON t.trip_id = st.trip_id
    JOIN active_services active ON active.service_id = t.service_id
    JOIN routes r ON r.route_id = t.route_id
    JOIN stops s ON s.stop_id = st.stop_id
    WHERE st.stop_id IN (${listTransportSqlPlaceholders(stopIds)})
      AND st.departure_sec >= ?
      AND st.departure_sec <= ?
      ${modeFilter.sql}
    ORDER BY st.departure_sec
    LIMIT 10
    `,
    [...activeServices.params, ...stopIds, seconds, seconds + SOUTH_AUSTRALIA_ROUTE_SEARCH_WINDOW_SECONDS, ...modeFilter.params],
  );
  return rows.map((row: any, index: number) => ({
    id: `sa-departure-${index}-${row.trip_id}`,
    provider: 'transport_sa',
    stopName: String(row.stop_name || 'Stop'),
    platformName: buildSouthAustraliaStopLabel(row.stop_code),
    stopId: String(row.stop_id),
    lineName: String(row.route_short_name || row.route_long_name || 'Transit'),
    lineNumber: String(row.route_short_name || ''),
    destination: String(row.trip_headsign || row.route_long_name || ''),
    mode: String(row.route_mode || 'bus'),
    modeLabel: String(row.route_mode_label || 'Transit'),
    departureTimePlanned: southAustraliaServiceSecondsToIso(dateKey, Number(row.departure_sec || 0)),
    departureTimeEstimated: '',
    realtime: false,
    wheelchair: Number(row.wheelchair_accessible || 0) !== 2,
    alerts: [],
  }));
}

function normalizeQldMode(rawMode: unknown) {
  const normalized = String(rawMode || '').trim().toLowerCase();
  if (!normalized) return 'other';
  if (normalized === 'bus') return 'bus';
  if (normalized === 'train') return 'train';
  if (normalized === 'ferry') return 'ferry';
  if (normalized === 'tram' || normalized === 'light_rail' || normalized === 'light rail') return 'light_rail';
  if (normalized === 'walk') return 'walk';
  return 'other';
}

function getQldModeLabel(mode: string) {
  switch (mode) {
    case 'bus':
      return 'Bus';
    case 'train':
      return 'Train';
    case 'ferry':
      return 'Ferry';
    case 'light_rail':
      return 'Light Rail';
    case 'walk':
      return 'Walk';
    default:
      return 'Transit';
  }
}

function mapModeIdsToTranslinkModes(modes: string[] | undefined) {
  const mapped = transportUniqueStrings(
    (modes || []).map((mode) => {
      switch (String(mode || '').trim()) {
        case 'bus':
          return 'Bus';
        case 'train':
          return 'Train';
        case 'ferry':
          return 'Ferry';
        case 'light_rail':
          return 'Tram';
        default:
          return '';
      }
    }),
  );
  return mapped.length ? mapped : ['Bus', 'Ferry', 'Train', 'Tram'];
}

function toTranslinkTime(value: string) {
  const raw = String(value || '').trim();
  const twelveHourMatch = raw.match(/^(\d{1,2}):(\d{2})(am|pm)$/i);
  if (twelveHourMatch) return `${Number(twelveHourMatch[1])}:${twelveHourMatch[2]}${twelveHourMatch[3].toLowerCase()}`;
  const twentyFourHourMatch = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (!twentyFourHourMatch) return raw;
  let hours = Number(twentyFourHourMatch[1]);
  const minutes = twentyFourHourMatch[2];
  const suffix = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12 || 12;
  return `${hours}:${minutes}${suffix}`;
}

function formatBrisbaneDateAndTime(date?: string, time?: string) {
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date) && time && /^\d{2}:\d{2}$/.test(time)) {
    return {
      searchDate: date,
      searchTime: toTranslinkTime(time),
    };
  }

  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Brisbane',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  const parts = Object.fromEntries(
    formatter
      .formatToParts(now)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  );
  const minute = Math.floor(Number(parts.minute || '0') / 5) * 5;
  const hour = Number(parts.hour || '12');
  const dayPeriod = String(parts.dayPeriod || 'am').toLowerCase();
  return {
    searchDate: `${parts.year}-${parts.month}-${parts.day}`,
    searchTime: `${hour}:${String(minute).padStart(2, '0')}${dayPeriod}`,
  };
}

async function fetchExternalJson<T>(
  url: string,
  options: {
    method?: 'GET' | 'POST';
    headers?: Record<string, string>;
    body?: string;
    timeoutMs?: number;
  } = {},
): Promise<T> {
  const timeoutMs = Math.max(5000, Number(options.timeoutMs || 15000));
  if (isNativeShell()) {
    try {
      const response = await CapacitorHttp.request({
        url,
        method: options.method || 'GET',
        headers: options.headers,
        data: options.body,
        responseType: 'json',
        connectTimeout: timeoutMs,
        readTimeout: timeoutMs,
      });
      const json =
        typeof response.data === 'string'
          ? JSON.parse(response.data)
          : (response.data ?? {});
      if (response.status < 200 || response.status >= 300) {
        throw new Error(
          transportFirstNonEmptyString(
            (json as Record<string, unknown>)?.error,
            (json as Record<string, unknown>)?.message,
            `Request failed (${response.status})`,
          ),
        );
      }
      return json as T;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error || '');
      if (/timed out|timeout/i.test(message)) {
        throw new Error('Transport planner request timed out. Please try again.');
      }
      throw error instanceof Error ? error : new Error('Transport planner request failed.');
    }
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: options.method || 'GET',
      headers: options.headers,
      body: options.body,
      signal: controller.signal,
    });
    const text = await res.text();
    let json: any = {};
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      json = { error: text };
    }
    if (!res.ok) {
      throw new Error(transportFirstNonEmptyString(json?.error, json?.message, `Request failed (${res.status})`));
    }
    return json as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Transport planner request timed out. Please try again.');
    }
    throw error instanceof Error ? error : new Error('Transport planner request failed.');
  } finally {
    window.clearTimeout(timeout);
  }
}

function getQldLocationType(locationId: string) {
  if (locationId.startsWith('SI:')) return 'stop';
  if (locationId.startsWith('ST:')) return 'station';
  if (locationId.startsWith('PL:')) return 'place';
  return 'location';
}

function scoreQldLocationSuggestion(item: any, query: string, index: number) {
  const locationId = transportFirstNonEmptyString(item?.LocationId);
  const description = transportFirstNonEmptyString(item?.Description);
  const [namePart, ...restParts] = description.split(/[,;]\s*/);
  const name = transportFirstNonEmptyString(namePart, description);
  const subtitle = restParts.join(', ').trim();
  const type = getQldLocationType(locationId);
  let score = 0;
  if (hasTransportPhraseMatch(name, query)) score += 300;
  if (hasTransportPhraseMatch(description, query)) score += 180;
  if (hasTransportPhraseMatch(subtitle, query)) score += 80;
  if (type === 'station') score += 24;
  if (type === 'stop') score += 20;
  if (type === 'place') score += 12;
  return score - index / 1000;
}

function normalizeQldLocationSuggestion(item: any, index: number): TransportLocationSuggestion {
  const description = transportFirstNonEmptyString(item?.Description);
  const [namePart, ...restParts] = description.split(/[,;]\s*/);
  const locationId = transportFirstNonEmptyString(item?.LocationId, `qld-location-${index}`);
  return {
    id: locationId,
    ref: locationId,
    requestType: 'any',
    type: getQldLocationType(locationId),
    name: namePart || description || 'Location',
    subtitle: restParts.join(', ').trim(),
    lat: null,
    lng: null,
    matchQuality: null,
    isBest: index === 0,
    modes: [],
    provider: 'transport_qld',
  };
}

async function searchTransportQueenslandLocationsDirect(query: string): Promise<TransportLocationSuggestion[]> {
  const cleanQuery = String(query || '').trim();
  if (cleanQuery.length < 2) return [];
  const json = await fetchExternalJson<any[]>(
    `${TRANSLINK_BASE}/api/location/search?location=${encodeURIComponent(cleanQuery)}`,
    {
      headers: {
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        Referer: TRANSLINK_REFERER,
      },
      timeoutMs: 12000,
    },
  );
  const items = Array.isArray(json) ? json : [];
  return items
    .map((item, index) => ({
      score: scoreQldLocationSuggestion(item, cleanQuery, index),
      item,
      index,
    }))
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .slice(0, 8)
    .map(({ item }, index) => normalizeQldLocationSuggestion(item, index));
}

function buildQldPlannerLocation(reference: TransportLocationReference) {
  const coord = reference.requestType === 'coord' ? parseTransportCoordReference(reference.ref) : null;
  if (coord) {
    const lat = Number(coord.lat.toFixed(6));
    const lng = Number(coord.lng.toFixed(6));
    return {
      id: `GP:${lat.toFixed(6)}^${lng.toFixed(6)}`,
      description: `${lat.toFixed(6)},${lng.toFixed(6)}`,
      lat,
      lng,
    };
  }
  const description = [reference.name, reference.subtitle].map((value) => String(value || '').trim()).filter(Boolean).join(', ');
  return {
    id: reference.ref,
    description: transportFirstNonEmptyString(description, reference.ref),
    lat: null,
    lng: null,
  };
}

function extractQldStopDetails(stop: any, fallbackName: string, fallbackLat?: number | null, fallbackLng?: number | null) {
  const stationName = transportFirstNonEmptyString(stop?.station?.name);
  const stopName = transportFirstNonEmptyString(stop?.name, fallbackName);
  const primaryName = stationName || stopName || fallbackName;
  const subtitleParts = [];
  if (stopName && stopName !== primaryName) subtitleParts.push(stopName);
  if (stop?.platform) subtitleParts.push(`Platform ${stop.platform}`);
  if (stop?.zone) subtitleParts.push(`Zone ${stop.zone}`);
  return {
    id: transportFirstNonEmptyString(stop?.id),
    name: primaryName,
    subtitle: subtitleParts.join(' · '),
    platform: stop?.platform ? `Platform ${stop.platform}` : '',
    lat: transportToFiniteNumber(stop?.position?.lat) ?? fallbackLat ?? null,
    lng: transportToFiniteNumber(stop?.position?.lng) ?? fallbackLng ?? null,
  };
}

function parseQldRouteId(routeId: string, fallbackMode = 'other') {
  const parts = String(routeId || '').split(':').filter(Boolean);
  const vehicle = normalizeQldMode(parts[1] || fallbackMode);
  return {
    mode: vehicle,
    lineNumber: transportFirstNonEmptyString(parts[2]),
  };
}

function getQldLineNumber(route: any, mode: string) {
  if (mode === 'bus') return transportFirstNonEmptyString(route?.code, route?.headsignShort);
  if (mode === 'train') return transportFirstNonEmptyString(route?.lines?.[0]?.name, route?.headsignShort, route?.code);
  if (mode === 'ferry') return transportFirstNonEmptyString(route?.headsignShort, route?.code);
  if (mode === 'light_rail') return transportFirstNonEmptyString(route?.code, route?.headsignShort, route?.name);
  return transportFirstNonEmptyString(route?.code, route?.headsignShort, route?.name);
}

function formatQldFareText(fares: any[]) {
  const preferred = (Array.isArray(fares) ? fares : []).find((fare) => /adult/i.test(String(fare?.type || fare?.name || ''))) ||
    (Array.isArray(fares) ? fares[0] : null);
  const price = Number(preferred?.price);
  if (!Number.isFinite(price)) return '';
  return `$${price.toFixed(2)}`;
}

function normalizeTransportAlertPriority(rawSeverity: unknown, rawDescription: unknown) {
  const combined = `${String(rawSeverity || '')} ${String(rawDescription || '')}`.toLowerCase();
  if (combined.includes('major')) return 'major';
  if (combined.includes('minor')) return 'minor';
  if (combined.includes('maintenance')) return 'maintenance';
  if (combined.includes('inform')) return 'informative';
  return 'normal';
}

function normalizeQldAlert(notice: any): TransportAlert {
  const title = transportFirstNonEmptyString(notice?.title, notice?.description, 'Service update');
  return {
    id: transportFirstNonEmptyString(String(notice?.id || ''), title),
    title,
    subtitle: '',
    content: stripTransportHtml(String(notice?.description || '')),
    priority: normalizeTransportAlertPriority(notice?.severity, notice?.description),
    provider: 'Translink',
    url: '',
    lineIds: [],
    stopIds: [],
    tripIds: [],
  };
}

function dedupeTransportAlerts(alerts: TransportAlert[]) {
  const seen = new Set<string>();
  return alerts.filter((alert) => {
    if (!alert) return false;
    const key = `${alert.id}|${alert.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeQldLeg(
  leg: any,
  index: number,
  context: {
    fallbackOrigin: { name: string; lat: number | null; lng: number | null };
    fallbackDestination: { name: string; lat: number | null; lng: number | null };
  },
): TransportTripLeg {
  const route = leg?.legRoute || {};
  const mode = normalizeQldMode(route?.vehicle || leg?.travelMode);
  const modeLabel = getQldModeLabel(mode);
  const routeInfo = parseQldRouteId(route?.id, mode);
  const fallbackOriginName = index === 0 ? context.fallbackOrigin.name : 'Transfer';
  const fallbackDestinationName = index === 0 ? 'Transfer' : context.fallbackDestination.name;
  const origin = extractQldStopDetails(
    leg?.origin,
    fallbackOriginName,
    index === 0 ? context.fallbackOrigin.lat : null,
    index === 0 ? context.fallbackOrigin.lng : null,
  );
  const destination = extractQldStopDetails(
    leg?.destination,
    fallbackDestinationName,
    index === 0 && !leg?.origin && !leg?.destination ? context.fallbackDestination.lat : null,
    index === 0 && !leg?.origin && !leg?.destination ? context.fallbackDestination.lng : null,
  );
  const lineNumber = getQldLineNumber(route, mode) || routeInfo.lineNumber;
  const walkStep = mode === 'walk' ? `Walk to ${destination.name || 'your destination'}` : '';
  return {
    id: `qld-leg-${index}-${transportFirstNonEmptyString(leg?.tripId, route?.id, leg?.travelMode) || crypto.randomUUID()}`,
    mode,
    modeLabel,
    lineName: transportFirstNonEmptyString(route?.name, route?.headsign, lineNumber, modeLabel),
    lineNumber,
    destinationLabel: transportFirstNonEmptyString(route?.headsignShort, route?.headsign, destination.name),
    operator: transportFirstNonEmptyString(route?.operator),
    originName: origin.name || 'Origin',
    originSubtitle: origin.subtitle,
    originStopId: origin.id,
    originPlatform: origin.platform,
    originLat: origin.lat,
    originLng: origin.lng,
    destinationName: destination.name || 'Destination',
    destinationSubtitle: destination.subtitle,
    destinationStopId: destination.id,
    destinationPlatform: destination.platform,
    destinationLat: destination.lat,
    destinationLng: destination.lng,
    departureTimePlanned: transportFirstNonEmptyString(leg?.departureTimeUtc),
    departureTimeEstimated: '',
    arrivalTimePlanned: transportFirstNonEmptyString(leg?.arrivalTimeUtc),
    arrivalTimeEstimated: '',
    durationMinutes: Number(leg?.durationMins || 0) || 0,
    distanceKm: Number.isFinite(Number(leg?.distanceM)) ? Number(leg.distanceM) / 1000 : null,
    realtime: false,
    accessible: false,
    alerts: dedupeTransportAlerts((Array.isArray(leg?.notices) ? leg.notices : []).map(normalizeQldAlert)),
    pathDescriptions: walkStep ? [walkStep] : [],
    provider: 'transport_qld',
    tripId: transportFirstNonEmptyString(leg?.tripId),
    routeId: transportFirstNonEmptyString(route?.id),
  };
}

async function fetchTransportQueenslandTripsDirect(query: TransportTripQuery): Promise<TransportTripOption[]> {
  const origin = buildQldPlannerLocation(query.origin);
  const destination = buildQldPlannerLocation(query.destination);
  const { searchDate, searchTime } = formatBrisbaneDateAndTime(query.date, query.time);
  const timeSearchMode = query.when === 'arrive_by' ? 'ArriveBefore' : 'LeaveAfter';
  const body = new URLSearchParams({
    searchDate,
    searchTime,
    startLocationId: origin.id,
    start: origin.description,
    endLocationId: destination.id,
    end: destination.description,
    timeSearchMode,
    maximumWalkingDistance: '4000',
    walkingSpeed: 'Normal',
  });
  ['Free', 'Prepaid', 'Standard'].forEach((fareType) => body.append('fareTypes', fareType));
  ['Regular', 'Express', 'NightLink', 'School'].forEach((serviceType) => body.append('serviceTypes', serviceType));
  mapModeIdsToTranslinkModes(query.modes).forEach((mode) => body.append('transportModes', mode));

  const json = await fetchExternalJson<any>(
    `${TRANSLINK_BASE}/api/plan?id=${hashTransportString(body.toString())}`,
    {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest',
        Referer: TRANSLINK_REFERER,
      },
      body: body.toString(),
      timeoutMs: 20000,
    },
  );
  const itineraries = Array.isArray(json?.itineraries) ? json.itineraries : [];
  return itineraries
    .map((itinerary: any, index: number) => {
      const legs = Array.isArray(itinerary?.legs)
        ? itinerary.legs.map((leg: any, legIndex: number) =>
            normalizeQldLeg(leg, legIndex, {
              fallbackOrigin: {
                name: query.origin.name || 'Origin',
                lat: origin.lat,
                lng: origin.lng,
              },
              fallbackDestination: {
                name: query.destination.name || 'Destination',
                lat: destination.lat,
                lng: destination.lng,
              },
            }),
          )
        : [];
      const nonWalkLegs = legs.filter((leg) => leg.mode !== 'walk');
      const departureTime = transportFirstNonEmptyString(
        nonWalkLegs[0]?.departureTimeEstimated,
        nonWalkLegs[0]?.departureTimePlanned,
        itinerary?.firstDepartureTimeUtc,
        legs[0]?.departureTimePlanned,
      );
      const arrivalTime = transportFirstNonEmptyString(
        nonWalkLegs[nonWalkLegs.length - 1]?.arrivalTimeEstimated,
        nonWalkLegs[nonWalkLegs.length - 1]?.arrivalTimePlanned,
        itinerary?.lastArrivalTimeUtc,
        itinerary?.endTimeUtc,
        legs[legs.length - 1]?.arrivalTimePlanned,
      );
      return {
        id: `qld-trip-${index}-${departureTime || crypto.randomUUID()}`,
        provider: 'transport_qld' as const,
        durationMinutes: Number(itinerary?.durationMins || 0) || 0,
        departureTime,
        arrivalTime,
        transferCount: Math.max(0, nonWalkLegs.length - 1),
        fareText: formatQldFareText(itinerary?.fares),
        hasRealtime: false,
        summary: transportUniqueStrings(nonWalkLegs.map((leg) => transportFirstNonEmptyString(leg.lineNumber, leg.lineName, leg.modeLabel))).slice(0, 3).join(' · '),
        legModes: transportUniqueStrings(legs.map((leg) => leg.mode)),
        alerts: dedupeTransportAlerts(legs.flatMap((leg) => leg.alerts || [])),
        legs,
      };
    })
    .slice(0, Math.max(1, Number(query.maxTrips || 5)));
}

async function fetchTransportQueenslandDeparturesDirect(params: {
  stopId: string;
  modes?: string[];
}): Promise<TransportDeparture[]> {
  const json = await fetchExternalJson<any>(
    `${TRANSLINK_BASE}/api/stop/timetable/${encodeURIComponent(params.stopId)}`,
    {
      headers: {
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        Referer: TRANSLINK_REFERER,
      },
      timeoutMs: 15000,
    },
  );
  const departures = Array.isArray(json?.departures) ? json.departures : [];
  const serviceAlerts = dedupeTransportAlerts(
    [
      ...(Array.isArray(json?.serviceAlerts?.current) ? json.serviceAlerts.current : []),
      ...(Array.isArray(json?.serviceAlerts?.upcoming) ? json.serviceAlerts.upcoming : []),
    ].map(normalizeQldAlert),
  );
  const allowedModes = new Set(transportUniqueStrings((params.modes || []).map((mode) => normalizeQldMode(mode))));
  return departures
    .map((departure: any, index: number) => {
      const routeInfo = parseQldRouteId(transportFirstNonEmptyString(departure?.routeId), normalizeQldMode(json?.serviceType));
      const mode = routeInfo.mode === 'other' ? normalizeQldMode(json?.serviceType) : routeInfo.mode;
      const modeLabel = getQldModeLabel(mode);
      const lineNumber = routeInfo.lineNumber;
      return {
        id: `qld-departure-${index}-${transportFirstNonEmptyString(departure?.id, departure?.routeId)}`,
        provider: 'transport_qld' as const,
        stopName: transportFirstNonEmptyString(json?.name, 'Stop'),
        platformName: transportFirstNonEmptyString((String(json?.name || '').match(/platform\s+([^\s,]+)/i) || [])[0]),
        stopId: transportFirstNonEmptyString(json?.id, params.stopId),
        lineName: transportFirstNonEmptyString(departure?.headsign, lineNumber, modeLabel),
        lineNumber,
        destination: transportFirstNonEmptyString(departure?.headsign, lineNumber, modeLabel),
        mode,
        modeLabel,
        departureTimePlanned: transportFirstNonEmptyString(departure?.scheduledDepartureUtc),
        departureTimeEstimated: transportFirstNonEmptyString(departure?.realtime?.expectedDepartureUtc),
        realtime: Boolean(transportFirstNonEmptyString(departure?.realtime?.expectedDepartureUtc)),
        wheelchair: true,
        alerts: serviceAlerts,
      };
    })
    .filter((departure) => !allowedModes.size || allowedModes.has(departure.mode));
}

function getTransportBase(provider?: TransportProvider) {
  if (provider === 'transport_act' && ACT_TRANSPORT_BASE) {
    return ACT_TRANSPORT_BASE;
  }
  return BASE;
}

function transportHeaders(provider?: TransportProvider) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${provider === 'transport_act' ? ACT_TRANSPORT_ANON_KEY : publicAnonKey}`,
  };
}

async function fetchTransportJson<T>(
  path: string,
  params: URLSearchParams,
  timeoutMs = 15000,
  provider?: TransportProvider,
): Promise<T> {
  const baseUrl = getTransportBase(provider);
  if (isNativeShell()) {
    try {
      const response = await CapacitorHttp.get({
        url: `${baseUrl}${path}`,
        params: Object.fromEntries(params.entries()),
        headers: transportHeaders(provider),
        responseType: 'json',
        connectTimeout: timeoutMs,
        readTimeout: timeoutMs,
      });
      const json =
        typeof response.data === 'string'
          ? JSON.parse(response.data)
          : (response.data ?? {});
      if (response.status < 200 || response.status >= 300) {
        throw new Error(
          (typeof json?.error === 'string' && json.error) ||
          (typeof json?.raw === 'string' && json.raw) ||
          `Request failed (${response.status})`,
        );
      }
      return json as T;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error || '');
      if (/timed out|timeout/i.test(message)) {
        throw new Error('Transport planner request timed out. Please try again.');
      }
      throw error instanceof Error ? error : new Error('Transport planner request failed.');
    }
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${baseUrl}${path}?${params.toString()}`, {
      headers: transportHeaders(provider),
      signal: controller.signal,
    });
    const json = await res.json();
    if (!res.ok) {
      console.error(`GHAR ${path} error:`, json);
      throw new Error(json.error || 'Request failed');
    }
    return json as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Transport planner request timed out. Please try again.');
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function fetchTransportEligibility(lat: number, lng: number): Promise<TransportEligibility> {
  const params = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
  });
  return fetchTransportJson<TransportEligibility>('/transport/eligibility', params, 12000);
}

export async function searchTransportLocations(
  query: string,
  provider?: TransportProvider,
): Promise<TransportLocationSuggestion[]> {
  const cleanQuery = query.trim();
  if (cleanQuery.length < 2) return [];
  if (provider === 'transport_sa') {
    try {
      return await searchTransportSouthAustraliaLocationsDirect(cleanQuery);
    } catch (error) {
      console.error('GHAR direct Adelaide Metro location search error:', error);
    }
  }
  if (provider === 'transport_qld') {
    try {
      return await searchTransportQueenslandLocationsDirect(cleanQuery);
    } catch (error) {
      console.error('GHAR direct Translink location search error:', error);
    }
  }
  const params = new URLSearchParams({ q: cleanQuery });
  if (provider) params.set('provider', provider);
  const json = await fetchTransportJson<{ results: TransportLocationSuggestion[] }>(
    '/transport/locations',
    params,
    12000,
    provider,
  );
  const results = Array.isArray(json.results) ? json.results : [];
  return provider
    ? results.filter((result) => !result.provider || result.provider === provider)
    : results;
}

export async function fetchTransportTrips(query: TransportTripQuery): Promise<TransportTripOption[]> {
  if (query.provider === 'transport_sa') {
    return fetchTransportSouthAustraliaTripsDirect(query);
  }
  if (query.provider === 'transport_qld') {
    try {
      return await fetchTransportQueenslandTripsDirect(query);
    } catch (error) {
      console.error('GHAR direct Translink trip error:', error);
    }
  }
  const params = new URLSearchParams({
    from: query.origin.ref,
    fromType: query.origin.requestType,
    to: query.destination.ref,
    toType: query.destination.requestType,
    when: query.when,
  });
  if (query.provider) params.set('provider', query.provider);
  if (query.date) params.set('date', query.date);
  if (query.time) params.set('time', query.time);
  if (query.modes?.length) params.set('modes', query.modes.join(','));
  if (query.wheelchair) params.set('wheelchair', 'true');
  if (query.maxTrips) params.set('maxTrips', String(query.maxTrips));
  const json = await fetchTransportJson<{ results: TransportTripOption[] }>(
    '/transport/trips',
    params,
    20000,
    query.provider,
  );
  const results = Array.isArray(json.results) ? json.results : [];
  return query.provider
    ? results.filter((result) => !result.provider || result.provider === query.provider)
    : results;
}

export async function fetchTransportDepartures(params: {
  provider?: TransportProvider;
  stopId: string;
  type?: 'stop' | 'platform';
  usePlatformKey?: boolean;
  date?: string;
  time?: string;
  modes?: string[];
}): Promise<TransportDeparture[]> {
  if (params.provider === 'transport_sa') {
    return fetchTransportSouthAustraliaDeparturesDirect({
      stopId: params.stopId,
      date: params.date,
      time: params.time,
      modes: params.modes,
    });
  }
  if (params.provider === 'transport_qld') {
    try {
      return await fetchTransportQueenslandDeparturesDirect({
        stopId: params.stopId,
        modes: params.modes,
      });
    } catch (error) {
      console.error('GHAR direct Translink departures error:', error);
    }
  }
  const search = new URLSearchParams({
    stopId: params.stopId,
  });
  if (params.provider) search.set('provider', params.provider);
  if (params.type) search.set('type', params.type);
  if (params.usePlatformKey) search.set('usePlatformKey', 'true');
  if (params.date) search.set('date', params.date);
  if (params.time) search.set('time', params.time);
  if (params.modes?.length) search.set('modes', params.modes.join(','));
  const json = await fetchTransportJson<{ results: TransportDeparture[] }>(
    '/transport/departures',
    search,
    15000,
    params.provider,
  );
  const results = Array.isArray(json.results) ? json.results : [];
  return params.provider
    ? results.filter((result) => !result.provider || result.provider === params.provider)
    : results;
}

export async function fetchTransportStatus(provider?: TransportProvider): Promise<TransportStatusItem[]> {
  const params = new URLSearchParams();
  if (provider) params.set('provider', provider);
  const json = await fetchTransportJson<{ results: TransportStatusItem[] }>('/transport/status', params, 15000, provider);
  return Array.isArray(json.results) ? json.results : [];
}

export async function fetchTransportRetailers(params: {
  provider?: TransportProvider;
  lat?: number;
  lng?: number;
  limit?: number;
}): Promise<TransportRetailer[]> {
  const search = new URLSearchParams();
  if (params.provider) search.set('provider', params.provider);
  if (Number.isFinite(params.lat)) search.set('lat', String(params.lat));
  if (Number.isFinite(params.lng)) search.set('lng', String(params.lng));
  if (Number.isFinite(params.limit)) search.set('limit', String(params.limit));
  const json = await fetchTransportJson<{ results: TransportRetailer[] }>(
    '/transport/retailers',
    search,
    15000,
    params.provider,
  );
  return Array.isArray(json.results) ? json.results : [];
}

export async function fetchOpalEligibility(lat: number, lng: number): Promise<OpalEligibility> {
  return fetchTransportEligibility(lat, lng);
}

export async function searchOpalLocations(query: string): Promise<OpalLocationSuggestion[]> {
  return searchTransportLocations(query, 'tfnsw');
}

export async function fetchOpalTrips(query: OpalTripQuery): Promise<OpalTripOption[]> {
  return fetchTransportTrips({ ...query, provider: query.provider || 'tfnsw' });
}

export async function fetchOpalDepartures(params: {
  stopId: string;
  type?: 'stop' | 'platform';
  usePlatformKey?: boolean;
  date?: string;
  time?: string;
  modes?: string[];
}): Promise<OpalDeparture[]> {
  return fetchTransportDepartures({ ...params, provider: 'tfnsw' });
}

export type OfficialEventDatePreset = 'today' | 'weekend' | 'week' | 'next_week' | 'next_thirty';

export interface OfficialEventFacet {
  id: string;
  label: string;
  count: number;
}

export interface OfficialEvent {
  id: string;
  source: string;
  source_label: string;
  canonical_source?: string;
  canonical_slug?: string;
  event_source?: string;
  event_slug?: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  image_url: string;
  hero_image_url: string;
  instagram_post_image_url?: string;
  instagram_story_image_url?: string;
  categories: string[];
  tags: string[];
  dates: string[];
  venue_name: string;
  suburb: string;
  regions: string[];
  free_event: boolean;
  upcoming_date: string;
  upcoming_time: string;
  event_type: string[];
  source_url: string;
  lat: number | null;
  lng: number | null;
  address: string;
  location_additional_information: string;
  booking_url: string;
  website_url: string;
  contact_email: string;
  contact_phone: string;
  organiser: string;
  dates_humanized: string;
  accessibilities: string[];
  refreshed_at: string;
  stale?: boolean;
  distance_km?: number | null;
  university_id?: string;
  university_name?: string;
  university_state?: string;
  university_shortname?: string;
}

export interface ItineraryEvent {
  id: string;
  app_variant: string;
  email: string;
  kind?: 'event' | 'custom_stop';
  event_source: string;
  event_slug: string;
  event_key: string;
  source_label: string;
  title: string;
  summary: string;
  image_url: string;
  hero_image_url: string;
  booking_url: string;
  source_url: string;
  venue_name: string;
  suburb: string;
  address: string;
  dates_humanized: string;
  event_day: string;
  upcoming_time: string;
  maps_url?: string;
  lat: number | null;
  lng: number | null;
  order: number;
  attended_at: string;
  updated_at: string;
}

export interface OfficialEventsMeta {
  preset?: OfficialEventDatePreset;
  timezone?: string;
  bootstrapping?: boolean;
  requested_range?: {
    start_day: string;
    end_day: string;
  };
  available_categories: OfficialEventFacet[];
  available_tags: OfficialEventFacet[];
  refreshed_at?: string;
  stale?: boolean;
  total_candidates?: number;
  has_more?: boolean;
  next_offset?: number | null;
  returned_count?: number;
  disabled?: boolean;
  legacy_records_filtered?: number;
  legacy_feed_detected?: boolean;
  legacy_feed_only?: boolean;
  source_group?: string;
  university?: OfficialEventUniversity;
}

export interface OfficialEventUniversity {
  id: string;
  name: string;
  shortname: string;
  state: string;
  logo_url: string;
  lat: number | null;
  lng: number | null;
  upcoming_count?: number;
}

export interface OfficialNewsItem {
  source: string;
  slug: string;
  title: string;
  summary?: string;
  published_at?: string;
  image_url?: string;
  source_url: string;
  tags?: string[];
}

export async function fetchOfficialNews(params: {
  source?: 'bayside' | string;
  limit?: number;
  offset?: number;
} = {}): Promise<{ data: OfficialNewsItem[]; meta: { source?: string; refreshed_at?: string } }> {
  const search = new URLSearchParams();
  search.set('source', params.source || 'bayside');
  if (params.limit != null) search.set('limit', String(Math.max(0, Math.floor(params.limit))));
  if (params.offset != null) search.set('offset', String(Math.max(0, Math.floor(params.offset))));

  const res = await apiFetch(`/official-news?${search.toString()}`, { headers: headers() });
  const json = await readJsonResponse(res);
  if (!res.ok) {
    console.error('GHAR fetchOfficialNews error:', json);
    throw new Error((json as any).error || 'Failed to fetch official news');
  }

  const rawItems = Array.isArray((json as any).data) ? (json as any).data : [];
  return {
    data: rawItems
      .map((item: any) => ({
        source: String(item?.source || ''),
        slug: String(item?.slug || ''),
        title: String(item?.title || '').trim(),
        summary: String(item?.summary || '').trim(),
        published_at: String(item?.published_at || '').trim(),
        image_url: String(item?.image_url || '').trim(),
        source_url: String(item?.source_url || '').trim(),
        tags: Array.isArray(item?.tags) ? item.tags.map((tag: unknown) => String(tag || '').trim()).filter(Boolean) : [],
      }))
      .filter((item: OfficialNewsItem) => item.title && item.source_url),
    meta: ((json as any).meta || {}) as { source?: string; refreshed_at?: string },
  };
}

export interface PublicPlanEventSnapshot {
  id: string;
  title: string;
  summary: string;
  url: string;
  image_url: string;
  instagram_post_image_url?: string;
  instagram_story_image_url?: string;
  booking_url: string;
  venue_name: string;
  suburb: string;
  dates_humanized: string;
}

export type PublicPlanStatus = 'active' | 'full' | 'ended' | 'cancelled';
export type PublicPlanVisibility = 'public' | 'invite_only';
export type PublicPlanSourceType = 'official_event' | 'custom' | 'itinerary';

export type ItineraryRouteGeometryStatus = 'walking' | 'fallback' | 'unavailable';

export interface ItineraryWalkingRouteStop {
  event_key: string;
  lat: number;
  lng: number;
}

export interface ItineraryWalkingRoute {
  status: ItineraryRouteGeometryStatus;
  distance_m: number | null;
  duration_s: number | null;
  geometry: {
    type: 'FeatureCollection';
    features: Array<Record<string, unknown>>;
  };
  stop_count: number;
  cached?: boolean;
  error?: string;
}

export interface ItineraryPlanStop {
  kind?: 'event' | 'custom_stop';
  event_key: string;
  event_source: string;
  event_slug: string;
  title: string;
  summary: string;
  image_url: string;
  hero_image_url: string;
  booking_url: string;
  source_url: string;
  venue_name: string;
  suburb: string;
  address: string;
  dates_humanized: string;
  event_day: string;
  upcoming_time: string;
  maps_url?: string;
  lat: number | null;
  lng: number | null;
  order: number;
}

export interface PublicPlanAttendee {
  id: string;
  display_name: string;
  joined_at: string;
  is_creator: boolean;
}

export interface PublicPlan {
  id: string;
  visibility?: PublicPlanVisibility;
  source_type?: PublicPlanSourceType;
  invite_token?: string;
  event_source: string;
  event_slug: string;
  title: string;
  note: string;
  meeting_point: string;
  meetup_at: string;
  attendee_cap: number | null;
  attendee_count: number;
  attendees: PublicPlanAttendee[];
  status: PublicPlanStatus;
  is_full: boolean;
  creator_name: string;
  viewer_joined: boolean;
  viewer_invited?: boolean;
  is_creator: boolean;
  can_join: boolean;
  can_leave: boolean;
  can_delete: boolean;
  can_reject?: boolean;
  can_comment: boolean;
  comment_count: number;
  invitee_count?: number;
  source_event: PublicPlanEventSnapshot;
  itinerary_owner_email?: string;
  itinerary_day?: string;
  itinerary_sync_status?: 'live' | 'snapshot_stale' | '';
  itinerary_stops?: ItineraryPlanStop[];
  itinerary_route_distance_m?: number | null;
  itinerary_route_duration_s?: number | null;
  itinerary_route_geometry_status?: ItineraryRouteGeometryStatus | '';
  created_at: string;
  updated_at: string;
}

export interface PublicPlanComment {
  id: string;
  plan_id: string;
  body: string;
  author_name: string;
  created_at: string;
  updated_at: string;
  can_delete: boolean;
}

export async function fetchOfficialEvents(params: {
  appVariant?: TargetableAppVariant;
  sourceGroup?: 'networking' | 'campus';
  councilSlug?: string;
  universityId?: string;
  preset?: OfficialEventDatePreset;
  categories?: string[];
  tags?: string[];
  minLat?: number;
  minLng?: number;
  maxLat?: number;
  maxLng?: number;
  centerLat?: number;
  centerLng?: number;
  limit?: number;
  offset?: number;
  startDay?: string;
  endDay?: string;
}): Promise<{ data: OfficialEvent[]; meta: OfficialEventsMeta }> {
  const normalizedOffset = Math.max(0, Math.floor(Number(params.offset) || 0));
  const reservedCuratedCount =
    !params.sourceGroup && normalizedOffset === 0 && typeof params.limit === 'number' && params.limit > 0
      ? countMatchingCuratedSydneyEvents(params)
      : 0;
  const serverLimit =
    typeof params.limit === 'number'
      ? normalizedOffset === 0
        ? Math.max(0, params.limit - reservedCuratedCount)
        : params.limit
      : undefined;
  const appVariant = normalizeTargetableVariant(params.appVariant, APP_VARIANT);
  const search = new URLSearchParams({
    app_variant: appVariant,
  });
  search.set('source_response', 'canonical');
  if (params.preset) search.set('preset', params.preset);
  if (params.sourceGroup) search.set('source_group', params.sourceGroup);
  if (params.councilSlug) search.set('council_slug', params.councilSlug);
  if (params.universityId) search.set('university_id', params.universityId);
  if (params.categories?.length) search.set('categories', params.categories.join(','));
  if (params.tags?.length) search.set('tags', params.tags.join(','));
  if (serverLimit != null) search.set('limit', String(serverLimit));
  if (normalizedOffset > 0 || (params.offset != null && normalizedOffset === 0)) {
    search.set('offset', String(normalizedOffset));
  }
  if (params.minLat != null) search.set('min_lat', String(params.minLat));
  if (params.minLng != null) search.set('min_lng', String(params.minLng));
  if (params.maxLat != null) search.set('max_lat', String(params.maxLat));
  if (params.maxLng != null) search.set('max_lng', String(params.maxLng));
  if (params.centerLat != null) search.set('center_lat', String(params.centerLat));
  if (params.centerLng != null) search.set('center_lng', String(params.centerLng));
  if (params.startDay) search.set('start_day', params.startDay);
  if (params.endDay) search.set('end_day', params.endDay);

  const res = await apiFetch(`/official-events?${search.toString()}`, { headers: authHeaders() });
  const json = await readJsonResponse(res);
  if (!res.ok) {
    console.error('GHAR fetchOfficialEvents error:', json);
    throw new Error((json as any).error || 'Failed to fetch official events');
  }
  const rawResponse = {
    data: ((json as any).data || []) as OfficialEvent[],
    meta: ((json as any).meta || { available_categories: [], available_tags: [] }) as OfficialEventsMeta,
  };
  if (params.sourceGroup === 'networking' || params.sourceGroup === 'campus') {
    return rawResponse;
  }
  const sanitized = sanitizeOfficialEventsPayload(rawResponse.data, rawResponse.meta);
  return mergeCuratedSydneyOfficialEvents(sanitized, {
    ...params,
    offset: normalizedOffset,
  });
}

export async function fetchOfficialEventUniversities(params: {
  appVariant?: TargetableAppVariant;
} = {}): Promise<OfficialEventUniversity[]> {
  const appVariant = normalizeTargetableVariant(params.appVariant, APP_VARIANT);
  const search = new URLSearchParams({ app_variant: appVariant });
  const res = await apiFetch(`/official-events/universities?${search.toString()}`, {
    headers: headers(),
  });
  const json = await readJsonResponse(res);
  if (!res.ok) {
    console.error('GHAR fetchOfficialEventUniversities error:', json);
    throw new Error((json as any).error || 'Failed to fetch universities');
  }
  return (((json as any).data || []) as OfficialEventUniversity[])
    .filter((item) => item && item.id && item.name);
}

export async function fetchOfficialEvent(
  source: string,
  slug: string,
  options?: { appVariant?: TargetableAppVariant },
): Promise<OfficialEvent> {
  const curatedEvent = getCuratedSydneyOfficialEvent(source, slug);
  if (curatedEvent) {
    return curatedEvent;
  }

  const primaryVariant = normalizeTargetableVariant(options?.appVariant, APP_VARIANT);
  const variants =
    options?.appVariant || (primaryVariant !== 'setu_china' && primaryVariant !== 'jom_settle')
      ? [primaryVariant]
      : [primaryVariant, 'burb_mate' as const, 'ghar' as const, 'all' as const];
  let lastError: unknown = null;

  for (const variant of variants) {
    const search = new URLSearchParams({
      app_variant: variant,
      source_response: 'canonical',
    });
    const res = await apiFetch(`/official-events/${encodeURIComponent(source)}/${encodeURIComponent(slug)}?${search.toString()}`, {
      headers: headers(),
    });
    const json = await readJsonResponse(res);
    if (res.ok) {
      return (json as any).data;
    }
    lastError = json;
  }

  console.error('GHAR fetchOfficialEvent error:', lastError);
  throw new Error((lastError as any)?.error || 'Failed to fetch official event');
}

export async function fetchMyItinerary(params: {
  email: string;
  appVariant?: TargetableAppVariant;
}): Promise<ItineraryEvent[]> {
  const appVariant = normalizeTargetableVariant(params.appVariant, APP_VARIANT);
  const search = new URLSearchParams({
    email: params.email,
    app_variant: appVariant,
  });
  const res = await apiFetch(`/itinerary?${search.toString()}`, { headers: headers() });
  const json = await readJsonResponse(res);
  if (!res.ok) {
    console.error('GHAR fetchMyItinerary error:', json);
    throw new Error((json as any).error || 'Failed to fetch itinerary');
  }
  return ((json as any).data || []) as ItineraryEvent[];
}

export async function addEventToItinerary(payload: {
  email: string;
  event: OfficialEvent;
  appVariant?: TargetableAppVariant;
}): Promise<ItineraryEvent> {
  const appVariant = normalizeTargetableVariant(payload.appVariant, APP_VARIANT);
  const eventSnapshot = payload.event;
  const res = await apiFetch('/itinerary/events', {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      email: payload.email,
      app_variant: appVariant,
      event_source: eventSnapshot.source,
      event_slug: eventSnapshot.slug,
      event_snapshot: eventSnapshot,
    }),
  });
  const json = await readJsonResponse(res);
  if (!res.ok) {
    console.error('GHAR addEventToItinerary error:', json);
    throw new Error((json as any).error || 'Failed to add event to itinerary');
  }
  return (json as any).data as ItineraryEvent;
}

export async function removeEventFromItinerary(params: {
  email: string;
  eventSource: string;
  eventSlug: string;
  appVariant?: TargetableAppVariant;
}): Promise<void> {
  const appVariant = normalizeTargetableVariant(params.appVariant, APP_VARIANT);
  const search = new URLSearchParams({
    email: params.email,
    app_variant: appVariant,
  });
  const res = await apiFetch(
    `/itinerary/events/${encodeURIComponent(params.eventSource)}/${encodeURIComponent(params.eventSlug)}?${search.toString()}`,
    {
      method: 'DELETE',
      headers: headers(),
    },
  );
  const json = await readJsonResponse(res);
  if (!res.ok) {
    console.error('GHAR removeEventFromItinerary error:', json);
    throw new Error((json as any).error || 'Failed to remove itinerary event');
  }
}

export interface CustomItineraryStopPayload {
  title: string;
  summary?: string;
  event_day: string;
  upcoming_time: string;
  venue_name?: string;
  location_name?: string;
  address?: string;
  maps_url?: string;
  image_url?: string;
  hero_image_url?: string;
  lat?: number | null;
  lng?: number | null;
}

export interface ResolvedItineraryLocation {
  title: string;
  place_name: string;
  venue_name: string;
  address: string;
  maps_url: string;
  lat: number | null;
  lng: number | null;
}

export async function resolveItineraryLocationFromMapUrl(params: {
  email: string;
  appVariant?: TargetableAppVariant;
  title?: string;
  venue_name?: string;
  location_name?: string;
  address?: string;
  maps_url?: string;
  lat?: number | null;
  lng?: number | null;
}): Promise<ResolvedItineraryLocation> {
  const appVariant = normalizeTargetableVariant(params.appVariant, APP_VARIANT);
  const res = await apiFetch('/itinerary/custom-stops/resolve-location', {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      ...params,
      app_variant: appVariant,
    }),
  });
  const json = await readJsonResponse(res);
  if (!res.ok) {
    console.error('GHAR resolveItineraryLocationFromMapUrl error:', json);
    throw new Error((json as any).error || 'Failed to resolve itinerary location');
  }
  return (json as any).data as ResolvedItineraryLocation;
}

export async function addCustomItineraryStop(payload: {
  email: string;
  appVariant?: TargetableAppVariant;
  stop: CustomItineraryStopPayload;
}): Promise<ItineraryEvent> {
  const appVariant = normalizeTargetableVariant(payload.appVariant, APP_VARIANT);
  const res = await apiFetch('/itinerary/custom-stops', {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      ...payload.stop,
      email: payload.email,
      app_variant: appVariant,
    }),
  });
  const json = await readJsonResponse(res);
  if (!res.ok) {
    console.error('GHAR addCustomItineraryStop error:', json);
    throw new Error((json as any).error || 'Failed to add custom itinerary stop');
  }
  return (json as any).data as ItineraryEvent;
}

export async function updateCustomItineraryStop(payload: {
  email: string;
  eventSlug: string;
  appVariant?: TargetableAppVariant;
  stop: Partial<CustomItineraryStopPayload>;
}): Promise<ItineraryEvent> {
  const appVariant = normalizeTargetableVariant(payload.appVariant, APP_VARIANT);
  const res = await apiFetch(`/itinerary/custom-stops/${encodeURIComponent(payload.eventSlug)}`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify({
      ...payload.stop,
      email: payload.email,
      app_variant: appVariant,
    }),
  });
  const json = await readJsonResponse(res);
  if (!res.ok) {
    console.error('GHAR updateCustomItineraryStop error:', json);
    throw new Error((json as any).error || 'Failed to update custom itinerary stop');
  }
  return (json as any).data as ItineraryEvent;
}

export async function removeCustomItineraryStop(params: {
  email: string;
  eventSlug: string;
  appVariant?: TargetableAppVariant;
}): Promise<void> {
  const appVariant = normalizeTargetableVariant(params.appVariant, APP_VARIANT);
  const search = new URLSearchParams({
    email: params.email,
    app_variant: appVariant,
  });
  const res = await apiFetch(
    `/itinerary/custom-stops/${encodeURIComponent(params.eventSlug)}?${search.toString()}`,
    {
      method: 'DELETE',
      headers: headers(),
    },
  );
  const json = await readJsonResponse(res);
  if (!res.ok) {
    console.error('GHAR removeCustomItineraryStop error:', json);
    throw new Error((json as any).error || 'Failed to remove custom itinerary stop');
  }
}

export async function reorderItineraryDay(params: {
  email: string;
  eventDay: string;
  eventKeys: string[];
  appVariant?: TargetableAppVariant;
}): Promise<ItineraryEvent[]> {
  const appVariant = normalizeTargetableVariant(params.appVariant, APP_VARIANT);
  const res = await apiFetch('/itinerary/events/reorder', {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify({
      email: params.email,
      app_variant: appVariant,
      event_day: params.eventDay,
      event_keys: params.eventKeys,
    }),
  });
  const json = await readJsonResponse(res);
  if (!res.ok) {
    console.error('GHAR reorderItineraryDay error:', json);
    throw new Error((json as any).error || 'Failed to reorder itinerary');
  }
  return ((json as any).data || []) as ItineraryEvent[];
}

export async function fetchItineraryWalkingRoute(params: {
  email: string;
  eventDay: string;
  stops: ItineraryWalkingRouteStop[];
  appVariant?: TargetableAppVariant;
}): Promise<ItineraryWalkingRoute> {
  const appVariant = normalizeTargetableVariant(params.appVariant, APP_VARIANT);
  const res = await apiFetch('/itinerary/routes/walking', {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      email: params.email,
      app_variant: appVariant,
      event_day: params.eventDay,
      stops: params.stops,
    }),
  });
  const json = await readJsonResponse(res);
  if (!res.ok) {
    console.error('GHAR fetchItineraryWalkingRoute error:', json);
    throw new Error((json as any).error || 'Failed to fetch itinerary walking route');
  }
  return (json as any).data as ItineraryWalkingRoute;
}

export async function fetchPublicPlansForEvent(params: {
  eventSource: string;
  eventSlug: string;
  viewerEmail?: string;
  appVariant?: TargetableAppVariant;
}): Promise<PublicPlan[]> {
  return fetchPublicPlans({
    eventSource: params.eventSource,
    eventSlug: params.eventSlug,
    viewerEmail: params.viewerEmail,
    appVariant: params.appVariant,
  });
}

export async function fetchPublicPlans(params?: {
  eventSource?: string;
  eventSlug?: string;
  viewerEmail?: string;
  scope?: 'my';
  appVariant?: TargetableAppVariant;
}): Promise<PublicPlan[]> {
  if (
    params?.eventSource &&
    params?.eventSlug &&
    isCuratedSydneyEventSource(params.eventSource)
  ) {
    return [];
  }

  const appVariant = normalizeTargetableVariant(params?.appVariant, APP_VARIANT);
  const requestPlansForVariant = async (variant: TargetableAppVariant) => {
    const search = new URLSearchParams({
      app_variant: variant,
    });
    if (params?.eventSource) search.set('event_source', params.eventSource);
    if (params?.eventSlug) search.set('event_slug', params.eventSlug);
    if (params?.viewerEmail) search.set('viewer_email', params.viewerEmail);
    if (params?.scope) search.set('scope', params.scope);
    const res = await apiFetch(`/public-plans?${search.toString()}`, { headers: headers() });
    const json = await readJsonResponse(res);
    if (!res.ok) {
      console.error('GHAR fetchPublicPlans error:', json);
      throw new Error((json as any).error || 'Failed to fetch public plans');
    }
    return (json as any).data || [];
  };

  const primaryPlans = await requestPlansForVariant(appVariant);
  if (!params?.appVariant && (appVariant === 'setu_china' || appVariant === 'jom_settle') && primaryPlans.length === 0) {
    const hoodiePlans = await requestPlansForVariant('burb_mate');
    if (hoodiePlans.length > 0) return hoodiePlans;
    const setuPlans = await requestPlansForVariant('ghar');
    if (setuPlans.length > 0) return setuPlans;
    return requestPlansForVariant('all');
  }
  return primaryPlans;
}

export async function fetchPublicPlan(params: {
  id: string;
  viewerEmail?: string;
  inviteToken?: string;
}): Promise<PublicPlan> {
  const search = new URLSearchParams();
  if (params.viewerEmail) search.set('viewer_email', params.viewerEmail);
  if (params.inviteToken) search.set('invite_token', params.inviteToken);
  const suffix = search.toString() ? `?${search.toString()}` : '';
  const res = await apiFetch(`/public-plans/${encodeURIComponent(params.id)}${suffix}`, { headers: headers() });
  const json = await readJsonResponse(res);
  if (!res.ok) {
    console.error('GHAR fetchPublicPlan error:', json);
    throw new Error((json as any).error || 'Failed to fetch public plan');
  }
  return (json as any).data;
}

export async function createPublicPlan(payload: {
  email: string;
  appVariant?: TargetableAppVariant;
  event_source?: string;
  event_slug?: string;
  source_type?: PublicPlanSourceType;
  event_day?: string;
  itinerary_day?: string;
  visibility?: PublicPlanVisibility;
  title: string;
  note?: string;
  meeting_point: string;
  meetup_at: string;
  attendee_cap?: number | null;
  invitee_emails?: string[];
}): Promise<PublicPlan> {
  const { appVariant: requestedAppVariant, ...body } = payload;
  const appVariant = normalizeTargetableVariant(requestedAppVariant, APP_VARIANT);
  const res = await apiFetch(`/public-plans`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      ...body,
      app_variant: appVariant,
    }),
  });
  const json = await readJsonResponse(res);
  if (!res.ok) {
    console.error('GHAR createPublicPlan error:', json);
    throw new Error((json as any).error || 'Failed to create public plan');
  }
  return (json as any).data;
}

export async function createItineraryPlan(payload: {
  email: string;
  appVariant?: TargetableAppVariant;
  eventDay: string;
  visibility?: PublicPlanVisibility;
  title: string;
  note?: string;
  meeting_point: string;
  meetup_at: string;
  attendee_cap?: number | null;
  invitee_emails?: string[];
}): Promise<PublicPlan> {
  return createPublicPlan({
    email: payload.email,
    appVariant: payload.appVariant,
    source_type: 'itinerary',
    event_day: payload.eventDay,
    itinerary_day: payload.eventDay,
    visibility: payload.visibility,
    title: payload.title,
    note: payload.note,
    meeting_point: payload.meeting_point,
    meetup_at: payload.meetup_at,
    attendee_cap: payload.attendee_cap,
    invitee_emails: payload.invitee_emails,
  });
}

export async function updatePublicPlan(
  id: string,
  payload: {
    email: string;
    title?: string;
    note?: string;
    meeting_point?: string;
    meetup_at?: string;
    attendee_cap?: number | null;
    status?: 'cancelled';
  },
): Promise<PublicPlan> {
  const res = await apiFetch(`/public-plans/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify(payload),
  });
  const json = await readJsonResponse(res);
  if (!res.ok) {
    console.error('GHAR updatePublicPlan error:', json);
    throw new Error((json as any).error || 'Failed to update public plan');
  }
  return (json as any).data;
}

export async function joinPublicPlan(id: string, email: string, inviteToken?: string): Promise<PublicPlan> {
  const res = await apiFetch(`/public-plans/${encodeURIComponent(id)}/join`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ email, invite_token: inviteToken }),
  });
  const json = await readJsonResponse(res);
  if (!res.ok) {
    console.error('GHAR joinPublicPlan error:', json);
    throw new Error((json as any).error || 'Failed to join public plan');
  }
  return (json as any).data;
}

export async function leavePublicPlan(id: string, email: string): Promise<PublicPlan> {
  const res = await apiFetch(`/public-plans/${encodeURIComponent(id)}/join?email=${encodeURIComponent(email)}`, {
    method: 'DELETE',
    headers: headers(),
  });
  const json = await readJsonResponse(res);
  if (!res.ok) {
    console.error('GHAR leavePublicPlan error:', json);
    throw new Error((json as any).error || 'Failed to leave public plan');
  }
  return (json as any).data;
}

export async function rejectPublicPlan(id: string, email: string): Promise<void> {
  const res = await apiFetch(`/public-plans/${encodeURIComponent(id)}/reject`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ email }),
  });
  const json = await readJsonResponse(res);
  if (!res.ok) {
    console.error('GHAR rejectPublicPlan error:', json);
    throw new Error((json as any).error || 'Failed to reject public plan');
  }
}

export async function deletePublicPlan(id: string, email: string): Promise<void> {
  const res = await apiFetch(`/public-plans/${encodeURIComponent(id)}?email=${encodeURIComponent(email)}`, {
    method: 'DELETE',
    headers: headers(),
  });
  const json = await readJsonResponse(res);
  if (!res.ok) {
    console.error('GHAR deletePublicPlan error:', json);
    throw new Error((json as any).error || 'Failed to delete public plan');
  }
}

export async function fetchPublicPlanComments(planId: string, viewerEmail?: string, inviteToken?: string): Promise<PublicPlanComment[]> {
  const search = new URLSearchParams();
  if (viewerEmail) search.set('viewer_email', viewerEmail);
  if (inviteToken) search.set('invite_token', inviteToken);
  const suffix = search.toString() ? `?${search.toString()}` : '';
  const res = await apiFetch(`/public-plans/${encodeURIComponent(planId)}/comments${suffix}`, {
    headers: headers(),
  });
  const json = await readJsonResponse(res);
  if (!res.ok) {
    console.error('GHAR fetchPublicPlanComments error:', json);
    throw new Error((json as any).error || 'Failed to fetch plan comments');
  }
  return (json as any).data || [];
}

export async function createPublicPlanComment(planId: string, payload: {
  email: string;
  body: string;
}): Promise<void> {
  const res = await apiFetch(`/public-plans/${encodeURIComponent(planId)}/comments`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(payload),
  });
  const json = await readJsonResponse(res);
  if (!res.ok) {
    console.error('GHAR createPublicPlanComment error:', json);
    throw new Error((json as any).error || 'Failed to create plan comment');
  }
}

export async function deletePublicPlanComment(planId: string, commentId: string, email: string): Promise<void> {
  const res = await fetch(
    `${BASE}/public-plans/${encodeURIComponent(planId)}/comments/${encodeURIComponent(commentId)}?email=${encodeURIComponent(email)}`,
    {
      method: 'DELETE',
      headers: headers(),
    },
  );
  const json = await readJsonResponse(res);
  if (!res.ok) {
    console.error('GHAR deletePublicPlanComment error:', json);
    throw new Error((json as any).error || 'Failed to delete plan comment');
  }
}

export async function reportPublicPlanContent(payload: {
  email: string;
  target_type: 'plan' | 'comment';
  plan_id: string;
  comment_id?: string;
  reason: string;
}): Promise<void> {
  const res = await apiFetch(`/public-plan-reports`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(payload),
  });
  const json = await readJsonResponse(res);
  if (!res.ok) {
    console.error('GHAR reportPublicPlanContent error:', json);
    throw new Error((json as any).error || 'Failed to create moderation report');
  }
}

// ─── BROWSER-NATIVE VOICE (GHAR Guardian — SpeechSynthesis) ────

/**
 * A lightweight handle returned by `speakBrowser()` that lets callers
 * stop playback and react to completion — mirrors the subset of
 * HTMLAudioElement the Triage Center already uses.
 */
export interface VoiceHandle {
  stop: () => void;
  /** Resolves when speech finishes or is cancelled. */
  finished: Promise<void>;
}

/** Preferred voice names in priority order (Indian-English first). */
// ─── HOUSEHOLDS ────────────────────────────────────────────────

export async function fetchMyHousehold(email: string): Promise<HouseholdDashboardResponse> {
  const res = await apiFetch(`/households?email=${encodeURIComponent(email)}`, {
    headers: headers(),
  }, {
    allow404: true,
    useMirror: false,
  });
  if (res.status === 404) {
    return {
      household: null,
      pending_invites: [],
      shared_bills: [],
      bill_contacts: [],
    };
  }
  const json = await res.json();
  if (!res.ok) {
    console.error('GHAR fetchMyHousehold error:', json);
    throw new Error(json.error || 'Failed to fetch household');
  }
  return {
    household: json.data?.household || null,
    pending_invites: json.data?.pending_invites || [],
    shared_bills: json.data?.shared_bills || [],
    bill_contacts: json.data?.bill_contacts || [],
  };
}

export async function fetchHouseholdExpenseGoals(params: {
  householdId: string;
  actorEmail: string;
  month: string;
}): Promise<HouseholdExpenseGoals> {
  const query = new URLSearchParams({
    actor_email: params.actorEmail,
    month: params.month,
  });
  const res = await apiFetch(
    `/households/${encodeURIComponent(params.householdId)}/expense-goals?${query.toString()}`,
    { headers: headers() },
    { allow404: true, useMirror: false },
  );
  if (res.status === 404) {
    return {
      month: params.month,
      total_monthly_cap: 0,
      category_goals: {},
    };
  }
  const json = await readJsonResponse(res);
  if (!res.ok) {
    console.error('GHAR fetchHouseholdExpenseGoals error:', json);
    throw new Error((json as any).error || 'Failed to fetch expense goals');
  }
  return json.data?.goals || json.data;
}

export async function updateHouseholdExpenseGoals(params: {
  householdId: string;
  actorEmail: string;
  month: string;
  goals: Pick<HouseholdExpenseGoals, 'total_monthly_cap' | 'category_goals'>;
}): Promise<HouseholdExpenseGoals> {
  const res = await apiFetch(`/households/${encodeURIComponent(params.householdId)}/expense-goals`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify({
      actor_email: params.actorEmail,
      month: params.month,
      goals: params.goals,
    }),
  }, {
    useMirror: false,
  });
  const json = await readJsonResponse(res);
  if (!res.ok) {
    console.error('GHAR updateHouseholdExpenseGoals error:', json);
    throw new Error((json as any).error || 'Failed to update expense goals');
  }
  return json.data?.goals || json.data;
}

export interface HouseholdReceiptAnalysisResult {
  title: string;
  merchant: string;
  amount_total: number | null;
  category: string;
  transaction_date: string;
  notes: string;
  confidence: number;
  fallback?: boolean;
  fallback_reason?: string;
}

export async function analyzeHouseholdReceipt(params: {
  householdId: string;
  actorEmail: string;
  image: {
    base64Data: string;
    mimeType: string;
    fileName?: string;
  };
}): Promise<HouseholdReceiptAnalysisResult> {
  const res = await apiFetch(`/households/${encodeURIComponent(params.householdId)}/receipts/analyze`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      actor_email: params.actorEmail,
      image_base64: params.image.base64Data,
      mime_type: params.image.mimeType,
      file_name: params.image.fileName || '',
    }),
  }, {
    useMirror: false,
    timeoutMs: 90000,
  });
  const json = await readJsonResponse(res);
  if (!res.ok) {
    console.error('GHAR analyzeHouseholdReceipt error:', json);
    throw new Error((json as any).error || 'Failed to scan receipt');
  }
  return json.data?.receipt || json.data;
}

export async function generateHouseholdExpenseInsights(params: {
  householdId: string;
  actorEmail: string;
  reportData: HouseholdExpenseReportData;
}): Promise<HouseholdExpenseInsights> {
  const res = await apiFetch(`/households/${encodeURIComponent(params.householdId)}/expense-reports/insights`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      actor_email: params.actorEmail,
      report_data: params.reportData,
    }),
  }, {
    useMirror: false,
  });
  const json = await readJsonResponse(res);
  if (!res.ok) {
    console.error('GHAR generateHouseholdExpenseInsights error:', json);
    throw new Error((json as any).error || 'Failed to generate spending insights');
  }
  return json.data?.insights || json.data;
}

type HouseholdBillSplitPayload = {
  member_email: string;
  amount_owed: number;
  shares?: number;
  participant_type?: HouseholdBillParticipantType;
  participant_display_name?: string;
};

export async function fetchHouseholdBillContacts(email: string): Promise<HouseholdBillContact[]> {
  const res = await apiFetch(`/household-bill-contacts?email=${encodeURIComponent(email)}`, {
    headers: headers(),
  }, {
    useMirror: false,
  });
  const json = await readJsonResponse(res);
  if (!res.ok) {
    console.error('GHAR fetchHouseholdBillContacts error:', json);
    throw new Error(getBillServiceErrorMessage(json, res.status, 'Failed to fetch bill contacts'));
  }
  return json.data?.contacts || json.data || [];
}

export async function resolveHouseholdBillContact(params: {
  actorEmail: string;
  email: string;
}): Promise<HouseholdBillContact> {
  const res = await apiFetch(
    `/household-bill-contacts/resolve?actor_email=${encodeURIComponent(params.actorEmail)}&email=${encodeURIComponent(params.email)}`,
    {
      headers: headers(),
    },
    {
      useMirror: false,
    },
  );
  const json = await readJsonResponse(res);
  if (!res.ok) {
    console.error('GHAR resolveHouseholdBillContact error:', json);
    throw new Error(getBillServiceErrorMessage(json, res.status, 'That email has not logged into Hoodie yet.'));
  }
  return json.data?.contact || json.data;
}

export async function createHousehold(params: {
  email: string;
  timelineEntryId: string;
  appVariant?: AppVariant;
}): Promise<HouseholdCreateResponse> {
  const res = await apiFetch('/households', {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      email: params.email,
      timeline_entry_id: params.timelineEntryId,
      app_variant: params.appVariant || APP_VARIANT,
    }),
  }, {
    useMirror: false,
  });
  const json = await res.json();
  if (!res.ok) {
    console.error('GHAR createHousehold error:', json);
    throw new Error(json.error || 'Failed to create household');
  }
  return {
    household: json.data?.household || json.data,
    invite: json.data?.invite,
    share_url: json.data?.share_url,
    share_path: json.data?.share_path,
  };
}

export async function inviteHouseholdMembers(params: {
  householdId: string;
  senderEmail: string;
  recipientEmails?: string[];
  appVariant?: AppVariant;
}) {
  const res = await apiFetch(`/households/${encodeURIComponent(params.householdId)}/invites`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      sender_email: params.senderEmail,
      recipient_emails: params.recipientEmails || [],
      app_variant: params.appVariant || APP_VARIANT,
    }),
  }, {
    useMirror: false,
  });
  const json = await res.json();
  if (!res.ok) {
    console.error('GHAR inviteHouseholdMembers error:', json);
    throw new Error(json.error || 'Failed to invite household members');
  }
  return json.data as {
    household: HouseholdRecord | null;
    invite?: HouseholdInvite;
    invites?: HouseholdInvite[];
    invalid_recipient_emails?: string[];
    existing_recipient_emails?: string[];
    share_url?: string;
    share_path?: string;
  };
}

export async function resendHouseholdInvite(params: {
  householdId: string;
  token: string;
  senderEmail: string;
  appVariant?: AppVariant;
}) {
  const res = await apiFetch(`/households/${encodeURIComponent(params.householdId)}/invites/${encodeURIComponent(params.token)}/resend`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      sender_email: params.senderEmail,
      app_variant: params.appVariant || APP_VARIANT,
    }),
  }, {
    useMirror: false,
  });
  const json = await res.json();
  if (!res.ok) {
    console.error('GHAR resendHouseholdInvite error:', json);
    throw new Error(json.error || 'Failed to resend invite');
  }
  return json.data as {
    household: HouseholdRecord | null;
    invite: HouseholdInvite;
    share_url?: string;
    share_path?: string;
  };
}

export async function cancelHouseholdInvite(params: {
  householdId: string;
  token: string;
  actorEmail: string;
}) {
  const res = await apiFetch(`/households/${encodeURIComponent(params.householdId)}/invites/${encodeURIComponent(params.token)}?actor_email=${encodeURIComponent(params.actorEmail)}`, {
    method: 'DELETE',
    headers: headers(),
  }, {
    useMirror: false,
  });
  const json = await res.json();
  if (!res.ok) {
    console.error('GHAR cancelHouseholdInvite error:', json);
    throw new Error(json.error || 'Failed to cancel invite');
  }
  return json.data;
}

export async function respondToHouseholdInvite(params: {
  token: string;
  email: string;
  action: 'accept' | 'decline';
  forceLeaveCurrent?: boolean;
  appVariant?: AppVariant;
  rulesAcknowledgement?: HouseholdRulesAcknowledgementInput;
}) {
  const res = await apiFetch(`/households/invites/${encodeURIComponent(params.token)}/respond`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      email: params.email,
      action: params.action,
      force_leave_current: Boolean(params.forceLeaveCurrent),
      app_variant: params.appVariant || APP_VARIANT,
      rules_acknowledgement: params.rulesAcknowledgement,
    }),
  }, {
    useMirror: false,
  });
  const json = await readJsonResponse(res);
  if (!res.ok) {
    console.error('GHAR respondToHouseholdInvite error:', json);
    const responseMessage = getHouseRulesServiceErrorMessage(json, 'Failed to respond to invite');
    const error = new Error(
      json.current_household_name
        ? `${responseMessage} (${json.current_household_name})`
        : responseMessage,
    ) as Error & { status?: number; currentHouseholdName?: string };
    error.status = res.status;
    if (json.current_household_name) {
      error.currentHouseholdName = json.current_household_name;
    }
    throw error;
  }
  return json.data as {
    household: HouseholdRecord | null;
    acknowledgement?: HouseholdRulesAcknowledgement;
    current_household_name?: string;
  };
}

export async function fetchHouseholdInvitePreview(params: {
  token: string;
  email?: string;
}): Promise<HouseholdInvite> {
  const suffix = params.email
    ? `?email=${encodeURIComponent(params.email)}`
    : '';
  const res = await apiFetch(`/households/invites/${encodeURIComponent(params.token)}${suffix}`, {
    headers: headers(),
  }, {
    allow404: true,
    useMirror: false,
  });
  if (res.status === 404) {
    throw new Error('Invite not found');
  }
  const json = await res.json();
  if (!res.ok) {
    console.error('GHAR fetchHouseholdInvitePreview error:', json);
    throw new Error(json.error || 'Failed to fetch household invite');
  }
  return json.data?.invite || json.data;
}

export async function updateHouseholdRules(params: {
  householdId: string;
  actorEmail: string;
  rulesDraft: HouseholdRulesDraft;
  acknowledgement: Omit<HouseholdRulesAcknowledgementInput, 'version_id'> & { version_id?: string };
  appVariant?: AppVariant;
}): Promise<{
  household: HouseholdRecord | null;
  house_rules: HouseholdRulesState;
  version?: HouseholdRulesVersion;
  acknowledgement: HouseholdRulesAcknowledgement;
}> {
  const res = await apiFetch(`/households/${encodeURIComponent(params.householdId)}/rules`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify({
      actor_email: params.actorEmail,
      rules_draft: params.rulesDraft,
      acknowledgement: params.acknowledgement,
      app_variant: params.appVariant || APP_VARIANT,
    }),
  }, {
    useMirror: false,
  });
  const json = await readJsonResponse(res);
  if (!res.ok) {
    console.error('GHAR updateHouseholdRules error:', json);
    throw new Error(getHouseRulesServiceErrorMessage(json, 'Failed to update house rules'));
  }
  return json.data;
}

export async function acknowledgeHouseholdRules(params: {
  householdId: string;
  actorEmail: string;
  versionId: string;
  acknowledgement: HouseholdRulesAcknowledgementInput;
}): Promise<{
  household: HouseholdRecord | null;
  acknowledgement: HouseholdRulesAcknowledgement;
}> {
  const res = await apiFetch(`/households/${encodeURIComponent(params.householdId)}/rules/${encodeURIComponent(params.versionId)}/acknowledgements`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      actor_email: params.actorEmail,
      acknowledgement: params.acknowledgement,
    }),
  }, {
    useMirror: false,
  });
  const json = await readJsonResponse(res);
  if (!res.ok) {
    console.error('GHAR acknowledgeHouseholdRules error:', json);
    throw new Error(getHouseRulesServiceErrorMessage(json, 'Failed to acknowledge house rules'));
  }
  return json.data;
}

export async function removeHouseholdMember(params: {
  householdId: string;
  actorEmail: string;
  targetEmail: string;
}) {
  const res = await apiFetch(`/households/${encodeURIComponent(params.householdId)}/members/remove`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      actor_email: params.actorEmail,
      target_email: params.targetEmail,
    }),
  }, {
    useMirror: false,
  });
  const json = await res.json();
  if (!res.ok) {
    console.error('GHAR removeHouseholdMember error:', json);
    throw new Error(json.error || 'Failed to remove household member');
  }
  return json.data;
}

export async function leaveHousehold(params: {
  householdId: string;
  email: string;
}) {
  const res = await apiFetch(`/households/${encodeURIComponent(params.householdId)}/leave`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      email: params.email,
    }),
  }, {
    useMirror: false,
  });
  const json = await res.json();
  if (!res.ok) {
    console.error('GHAR leaveHousehold error:', json);
    throw new Error(json.error || 'Failed to leave household');
  }
  return json.data;
}

export async function deleteHousehold(params: {
  householdId: string;
  email: string;
}) {
  const res = await apiFetch(`/households/${encodeURIComponent(params.householdId)}?email=${encodeURIComponent(params.email)}`, {
    method: 'DELETE',
    headers: headers(),
  }, {
    useMirror: false,
  });
  const json = await res.json();
  if (!res.ok) {
    console.error('GHAR deleteHousehold error:', json);
    throw new Error(json.error || 'Failed to delete household');
  }
  return json.data;
}

export async function sendHouseholdNotification(params: {
  householdId: string;
  senderEmail: string;
  recipientEmails: string[];
  title: string;
  body: string;
  templateType?: HouseholdNotificationTemplateType;
  appVariant?: AppVariant;
  entityType?: string;
  entityId?: string;
  deepLink?: string;
  metadata?: Record<string, unknown>;
}) {
  const res = await apiFetch(`/households/${encodeURIComponent(params.householdId)}/notifications`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      sender_email: params.senderEmail,
      recipient_emails: params.recipientEmails,
      title: params.title,
      body: params.body,
      template_type: params.templateType || 'custom',
      app_variant: params.appVariant || APP_VARIANT,
      entity_type: params.entityType || '',
      entity_id: params.entityId || '',
      deep_link: params.deepLink || '',
      metadata: params.metadata || undefined,
    }),
  }, {
    useMirror: false,
  });
  const json = await res.json();
  if (!res.ok) {
    console.error('GHAR sendHouseholdNotification error:', json);
    throw new Error(json.error || 'Failed to send household notification');
  }
  const notification = json.data?.notification || json.data || {};
  return {
    household: json.data?.household || null,
    notification,
    delivery_status: notification.delivery_status ?? 'queued',
    delivered_device_count: Number(notification.delivered_device_count ?? 0),
    targeted_recipient_count: Number(notification.targeted_recipient_count ?? params.recipientEmails.length),
    delivery_error: notification.delivery_error ?? '',
  };
}

export async function deleteHouseholdNotification(params: {
  householdId: string;
  notificationId: string;
  actorEmail: string;
}) {
  const res = await apiFetch(`/households/${encodeURIComponent(params.householdId)}/notifications/${encodeURIComponent(params.notificationId)}?actor_email=${encodeURIComponent(params.actorEmail)}`, {
    method: 'DELETE',
    headers: headers(),
  }, {
    useMirror: false,
  });
  const json = await res.json();
  if (!res.ok) {
    console.error('GHAR deleteHouseholdNotification error:', json);
    throw new Error(json.error || 'Failed to delete household notification');
  }
  return json.data;
}

export async function createHouseholdBill(params: {
  householdId: string;
  actorEmail: string;
  title: string;
  category: string;
  amountTotal: number;
  dueAt: string;
  paidByEmail: string;
  splitType: HouseholdSplitType;
  notes?: string;
  notifyMembers?: boolean;
  splits: HouseholdBillSplitPayload[];
  attachments?: HouseholdMediaAttachment[];
  appVariant?: AppVariant;
}) {
  const res = await apiFetch(`/households/${encodeURIComponent(params.householdId)}/bills`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      actor_email: params.actorEmail,
      title: params.title,
      category: params.category,
      amount_total: params.amountTotal,
      due_at: params.dueAt,
      paid_by_email: params.paidByEmail,
      split_type: params.splitType,
      notes: params.notes || '',
      notify_members: Boolean(params.notifyMembers),
      splits: params.splits,
      attachments: params.attachments || [],
      app_variant: params.appVariant || APP_VARIANT,
    }),
  }, {
    useMirror: false,
  });
  const json = await res.json();
  if (!res.ok) {
    console.error('GHAR createHouseholdBill error:', json);
    throw new Error(json.error || 'Failed to create household bill');
  }
  return json.data;
}

export async function createSharedBill(params: {
  actorEmail: string;
  title: string;
  category: string;
  amountTotal: number;
  dueAt: string;
  paidByEmail: string;
  splitType: HouseholdSplitType;
  billScope?: 'shared' | 'personal';
  notes?: string;
  notifyMembers?: boolean;
  splits: HouseholdBillSplitPayload[];
  attachments?: HouseholdMediaAttachment[];
  appVariant?: AppVariant;
}) {
  const res = await apiFetch('/shared-bills', {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      actor_email: params.actorEmail,
      title: params.title,
      category: params.category,
      amount_total: params.amountTotal,
      due_at: params.dueAt,
      paid_by_email: params.paidByEmail,
      split_type: params.splitType,
      notes: params.notes || '',
      notify_members: Boolean(params.notifyMembers),
      bill_scope: params.billScope || 'shared',
      splits: params.splits,
      attachments: params.attachments || [],
      app_variant: params.appVariant || APP_VARIANT,
    }),
  }, {
    useMirror: false,
  });
  const json = await readJsonResponse(res);
  if (!res.ok) {
    console.error('GHAR createSharedBill error:', json);
    throw new Error(getBillServiceErrorMessage(json, res.status, 'Failed to create shared bill'));
  }
  return json.data;
}

export async function updateHouseholdBill(params: {
  householdId: string;
  billId: string;
  actorEmail: string;
  title: string;
  category: string;
  amountTotal: number;
  dueAt: string;
  paidByEmail: string;
  splitType: HouseholdSplitType;
  notes?: string;
  notifyMembers?: boolean;
  splits: HouseholdBillSplitPayload[];
  attachments?: HouseholdMediaAttachment[];
  appVariant?: AppVariant;
}) {
  const res = await apiFetch(`/households/${encodeURIComponent(params.householdId)}/bills/${encodeURIComponent(params.billId)}`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify({
      actor_email: params.actorEmail,
      title: params.title,
      category: params.category,
      amount_total: params.amountTotal,
      due_at: params.dueAt,
      paid_by_email: params.paidByEmail,
      split_type: params.splitType,
      notes: params.notes || '',
      notify_members: Boolean(params.notifyMembers),
      splits: params.splits,
      attachments: params.attachments || [],
      app_variant: params.appVariant || APP_VARIANT,
    }),
  }, {
    useMirror: false,
  });
  const json = await res.json();
  if (!res.ok) {
    console.error('GHAR updateHouseholdBill error:', json);
    throw new Error(json.error || 'Failed to update household bill');
  }
  return json.data;
}

export async function deleteHouseholdBill(params: {
  householdId: string;
  billId: string;
  actorEmail: string;
}) {
  const res = await apiFetch(`/households/${encodeURIComponent(params.householdId)}/bills/${encodeURIComponent(params.billId)}?actor_email=${encodeURIComponent(params.actorEmail)}`, {
    method: 'DELETE',
    headers: headers(),
  }, {
    useMirror: false,
  });
  const json = await res.json();
  if (!res.ok) {
    console.error('GHAR deleteHouseholdBill error:', json);
    throw new Error(json.error || 'Failed to delete household bill');
  }
  return json.data;
}

export async function markHouseholdBillPayment(params: {
  householdId: string;
  billId: string;
  actorEmail: string;
  amount: number;
  note?: string;
  targetSplitId?: string;
  targetMemberEmail?: string;
  attachments?: HouseholdMediaAttachment[];
  appVariant?: AppVariant;
}) {
  const res = await apiFetch(`/households/${encodeURIComponent(params.householdId)}/bills/${encodeURIComponent(params.billId)}/payments`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      actor_email: params.actorEmail,
      amount: params.amount,
      note: params.note || '',
      target_split_id: params.targetSplitId || '',
      target_member_email: params.targetMemberEmail || '',
      attachments: params.attachments || [],
      app_variant: params.appVariant || APP_VARIANT,
    }),
  }, {
    useMirror: false,
  });
  const json = await res.json();
  if (!res.ok) {
    console.error('GHAR markHouseholdBillPayment error:', json);
    throw new Error(json.error || 'Failed to mark bill payment');
  }
  return json.data;
}

export async function markBillPayment(params: {
  billId: string;
  actorEmail: string;
  amount: number;
  note?: string;
  targetSplitId?: string;
  targetMemberEmail?: string;
  attachments?: HouseholdMediaAttachment[];
  appVariant?: AppVariant;
}) {
  const res = await apiFetch(`/bills/${encodeURIComponent(params.billId)}/payments`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      actor_email: params.actorEmail,
      amount: params.amount,
      note: params.note || '',
      target_split_id: params.targetSplitId || '',
      target_member_email: params.targetMemberEmail || '',
      attachments: params.attachments || [],
      app_variant: params.appVariant || APP_VARIANT,
    }),
  }, {
    useMirror: false,
  });
  const json = await readJsonResponse(res);
  if (!res.ok) {
    console.error('GHAR markBillPayment error:', json);
    throw new Error(getBillServiceErrorMessage(json, res.status, 'Failed to mark bill payment'));
  }
  return json.data;
}

export async function confirmHouseholdBillPayment(params: {
  householdId: string;
  billId: string;
  paymentId: string;
  actorEmail: string;
  appVariant?: AppVariant;
}) {
  const res = await apiFetch(`/households/${encodeURIComponent(params.householdId)}/bills/${encodeURIComponent(params.billId)}/payments/${encodeURIComponent(params.paymentId)}/confirm`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      actor_email: params.actorEmail,
      app_variant: params.appVariant || APP_VARIANT,
    }),
  }, {
    useMirror: false,
  });
  const json = await res.json();
  if (!res.ok) {
    console.error('GHAR confirmHouseholdBillPayment error:', json);
    throw new Error(json.error || 'Failed to confirm household payment');
  }
  return json.data;
}

export async function confirmBillPayment(params: {
  billId: string;
  paymentId: string;
  actorEmail: string;
  appVariant?: AppVariant;
}) {
  const res = await apiFetch(`/bills/${encodeURIComponent(params.billId)}/payments/${encodeURIComponent(params.paymentId)}/confirm`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      actor_email: params.actorEmail,
      app_variant: params.appVariant || APP_VARIANT,
    }),
  }, {
    useMirror: false,
  });
  const json = await readJsonResponse(res);
  if (!res.ok) {
    console.error('GHAR confirmBillPayment error:', json);
    throw new Error(getBillServiceErrorMessage(json, res.status, 'Failed to confirm bill payment'));
  }
  return json.data;
}

export async function createHouseholdChore(params: {
  householdId: string;
  actorEmail: string;
  title: string;
  cadence: HouseholdCadence;
  assignmentMode: 'assigned' | 'rotation' | 'claimable';
  dueAt: string;
  assignedToEmail?: string;
  notes?: string;
  notifyMembers?: boolean;
  rotationOrder?: string[];
  attachments?: HouseholdMediaAttachment[];
  appVariant?: AppVariant;
}) {
  const res = await apiFetch(`/households/${encodeURIComponent(params.householdId)}/chores`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      actor_email: params.actorEmail,
      title: params.title,
      cadence: params.cadence,
      assignment_mode: params.assignmentMode,
      due_at: params.dueAt,
      assigned_to_email: params.assignedToEmail || '',
      notes: params.notes || '',
      notify_members: Boolean(params.notifyMembers),
      rotation_order: params.rotationOrder || [],
      attachments: params.attachments || [],
      app_variant: params.appVariant || APP_VARIANT,
    }),
  }, {
    useMirror: false,
  });
  const json = await res.json();
  if (!res.ok) {
    console.error('GHAR createHouseholdChore error:', json);
    throw new Error(json.error || 'Failed to create household chore');
  }
  return json.data;
}

export async function updateHouseholdChore(params: {
  householdId: string;
  choreId: string;
  actorEmail: string;
  title: string;
  cadence: HouseholdCadence;
  assignmentMode: 'assigned' | 'rotation' | 'claimable';
  dueAt: string;
  assignedToEmail?: string;
  notes?: string;
  notifyMembers?: boolean;
  rotationOrder?: string[];
  attachments?: HouseholdMediaAttachment[];
  appVariant?: AppVariant;
}) {
  const res = await apiFetch(`/households/${encodeURIComponent(params.householdId)}/chores/${encodeURIComponent(params.choreId)}`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify({
      actor_email: params.actorEmail,
      title: params.title,
      cadence: params.cadence,
      assignment_mode: params.assignmentMode,
      due_at: params.dueAt,
      assigned_to_email: params.assignedToEmail || '',
      notes: params.notes || '',
      notify_members: Boolean(params.notifyMembers),
      rotation_order: params.rotationOrder || [],
      attachments: params.attachments || [],
      app_variant: params.appVariant || APP_VARIANT,
    }),
  }, {
    useMirror: false,
  });
  const json = await res.json();
  if (!res.ok) {
    console.error('GHAR updateHouseholdChore error:', json);
    throw new Error(json.error || 'Failed to update household chore');
  }
  return json.data;
}

export async function deleteHouseholdChore(params: {
  householdId: string;
  choreId: string;
  actorEmail: string;
}) {
  const res = await apiFetch(`/households/${encodeURIComponent(params.householdId)}/chores/${encodeURIComponent(params.choreId)}?actor_email=${encodeURIComponent(params.actorEmail)}`, {
    method: 'DELETE',
    headers: headers(),
  }, {
    useMirror: false,
  });
  const json = await res.json();
  if (!res.ok) {
    console.error('GHAR deleteHouseholdChore error:', json);
    throw new Error(json.error || 'Failed to delete household chore');
  }
  return json.data;
}

export async function completeHouseholdChore(params: {
  householdId: string;
  choreId: string;
  actorEmail: string;
  note?: string;
  attachments?: HouseholdMediaAttachment[];
  appVariant?: AppVariant;
}) {
  const res = await apiFetch(`/households/${encodeURIComponent(params.householdId)}/chores/${encodeURIComponent(params.choreId)}/complete`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      actor_email: params.actorEmail,
      note: params.note || '',
      attachments: params.attachments || [],
      app_variant: params.appVariant || APP_VARIANT,
    }),
  }, {
    useMirror: false,
  });
  const json = await res.json();
  if (!res.ok) {
    console.error('GHAR completeHouseholdChore error:', json);
    throw new Error(json.error || 'Failed to complete household chore');
  }
  return json.data;
}

const PREFERRED_VOICES = [
  'Google हिन्दी',        // Hindi
  'Rishi',                // Apple Indian-English
  'Veena',                // Apple Indian-English
  'Microsoft Ravi',       // Windows Indian-English
  'Microsoft Hemant',
  'Google UK English Female',
  'Google UK English Male',
];

let cachedVoice: SpeechSynthesisVoice | null = null;

function pickVoice(): SpeechSynthesisVoice | null {
  if (cachedVoice) return cachedVoice;
  const voices = speechSynthesis.getVoices();
  if (!voices.length) return null;

  // Try preferred list first
  for (const pref of PREFERRED_VOICES) {
    const match = voices.find(v => v.name.includes(pref));
    if (match) { cachedVoice = match; return match; }
  }

  // Fallback: any en-IN voice
  const enIN = voices.find(v => v.lang === 'en-IN');
  if (enIN) { cachedVoice = enIN; return enIN; }

  // Fallback: any English voice
  const en = voices.find(v => v.lang.startsWith('en'));
  if (en) { cachedVoice = en; return en; }

  cachedVoice = voices[0];
  return cachedVoice;
}

// Pre-load voices (Chrome loads them async)
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  speechSynthesis.onvoiceschanged = () => { cachedVoice = null; pickVoice(); };
  pickVoice();
}

/**
 * Speaks text using the browser SpeechSynthesis API.
 * Returns a VoiceHandle with `stop()` and a `finished` promise.
 * Returns `null` only if the browser doesn't support speech synthesis.
 */
export function speakBrowser(text: string): VoiceHandle | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    console.warn('GHAR Voice: SpeechSynthesis not supported in this browser');
    return null;
  }

  // Cancel any in-progress speech
  speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  const voice = pickVoice();
  if (voice) utterance.voice = voice;

  utterance.lang = 'en-IN';
  utterance.rate = 1.0;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;

  const finished = new Promise<void>((resolve) => {
    utterance.onend = () => resolve();
    utterance.onerror = (e) => {
      if (e.error !== 'canceled' && e.error !== 'interrupted') {
        console.error('GHAR Voice utterance error:', e.error);
      }
      resolve();
    };
  });

  speechSynthesis.speak(utterance);

  return {
    stop: () => speechSynthesis.cancel(),
    finished,
  };
}
