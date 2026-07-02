import { CapacitorHttp } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { toBlob } from 'html-to-image';
import { createRoot } from 'react-dom/client';
import { isNativeShell } from './platform';
import type { HoodieShareCardData } from './hoodie-share';
import {
  HOODIE_SHARE_CARD_SPECS,
  HoodieShareCard,
  type HoodieShareCardFormat,
} from '../components/share/hoodie-share-card';

function sanitizeFileName(name: string) {
  return String(name || 'hoodie-share')
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
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

function waitForPaint() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

async function waitForImages(container: HTMLElement) {
  const images = Array.from(container.querySelectorAll('img'));
  await Promise.all(images.map((image) => {
    if (image.complete) {
      if (typeof image.decode === 'function') {
        return image.decode().catch(() => undefined);
      }
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      image.addEventListener('load', () => {
        if (typeof image.decode === 'function') {
          image.decode().catch(() => undefined).finally(() => resolve());
          return;
        }
        resolve();
      }, { once: true });
      image.addEventListener('error', () => resolve(), { once: true });
    });
  }));
}

function toErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (typeof error === 'string' && error.trim()) return error;
  if (error && typeof error === 'object' && 'message' in error) {
    const message = String((error as { message?: unknown }).message || '').trim();
    if (message) return message;
  }
  return fallback;
}

async function writeBlobToCache(blob: Blob, fileName: string) {
  const safeFileName = sanitizeFileName(fileName) || 'hoodie-share.png';
  const result = await Filesystem.writeFile({
    path: `hoodie-share/${Date.now()}-${safeFileName}`,
    data: arrayBufferToBase64(await blob.arrayBuffer()),
    directory: Directory.Cache,
    recursive: true,
  });

  return result.uri;
}

type HoodieShareResolvedBackground = {
  originalUrl?: string;
  resolvedUrl?: string;
  fallbackReason?: string;
  revoke: () => void;
};

type NativeBackgroundResponse = {
  status: number;
  data: unknown;
  headers?: Record<string, string | undefined>;
};

type ResolveHoodieShareBackgroundOptions = {
  nativeShell?: boolean;
  fetchImpl?: typeof fetch;
  nativeGet?: (url: string) => Promise<NativeBackgroundResponse>;
  createObjectUrl?: (blob: Blob) => string;
  revokeObjectUrl?: (url: string) => void;
  targetWidth?: number;
  targetHeight?: number;
  backgroundPosition?: string;
};

const noopRevoke = () => undefined;

async function blobToDataUrl(blob: Blob) {
  const contentType = String(blob.type || 'image/jpeg').trim() || 'image/jpeg';
  return `data:${contentType};base64,${arrayBufferToBase64(await blob.arrayBuffer())}`;
}

function normalizeTargetDimension(value: number | undefined, fallback: number) {
  const rounded = Math.round(Number(value));
  if (!Number.isFinite(rounded) || rounded <= 0) return fallback;
  return Math.max(1, rounded);
}

function parsePositionValue(value: string | undefined, axis: 'x' | 'y') {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return undefined;

  if (normalized.endsWith('%')) {
    const parsed = Number(normalized.slice(0, -1));
    if (Number.isFinite(parsed)) return Math.max(0, Math.min(1, parsed / 100));
  }

  if (axis === 'x') {
    if (normalized === 'left') return 0;
    if (normalized === 'right') return 1;
  }

  if (axis === 'y') {
    if (normalized === 'top') return 0;
    if (normalized === 'bottom') return 1;
  }

  if (normalized === 'center') return 0.5;
  return undefined;
}

function parseBackgroundPosition(position: string | undefined) {
  const tokens = String(position || 'center center')
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  let x = 0.5;
  let y = 0.5;

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    const xValue = parsePositionValue(token, 'x');
    const yValue = parsePositionValue(token, 'y');

    if ((token === 'left' || token === 'right') && xValue !== undefined) {
      x = xValue;
    } else if ((token === 'top' || token === 'bottom') && yValue !== undefined) {
      y = yValue;
    } else if (token.endsWith('%')) {
      if (index === 0) {
        x = xValue ?? x;
      } else {
        y = yValue ?? y;
      }
    } else if (token === 'center') {
      if (tokens.length === 1) {
        x = 0.5;
        y = 0.5;
      }
    }
  }

  return { x, y };
}

function getCoverCrop(input: {
  sourceWidth: number;
  sourceHeight: number;
  targetWidth: number;
  targetHeight: number;
  backgroundPosition?: string;
}) {
  const sourceRatio = input.sourceWidth / input.sourceHeight;
  const targetRatio = input.targetWidth / input.targetHeight;
  const position = parseBackgroundPosition(input.backgroundPosition);

  if (sourceRatio > targetRatio) {
    const width = input.sourceHeight * targetRatio;
    return {
      sx: (input.sourceWidth - width) * position.x,
      sy: 0,
      sw: width,
      sh: input.sourceHeight,
    };
  }

  const height = input.sourceWidth / targetRatio;
  return {
    sx: 0,
    sy: (input.sourceHeight - height) * position.y,
    sw: input.sourceWidth,
    sh: height,
  };
}

function loadImageForCanvas(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Background image could not be decoded'));
    image.src = source;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

async function prepareBackgroundBlobForShare(
  blob: Blob,
  objectUrl: string,
  options: Pick<ResolveHoodieShareBackgroundOptions, 'targetWidth' | 'targetHeight' | 'backgroundPosition'>,
) {
  if (
    typeof document === 'undefined' ||
    typeof Image === 'undefined' ||
    !objectUrl ||
    blob.type.toLowerCase().includes('svg')
  ) {
    return blob;
  }

  const targetWidth = normalizeTargetDimension(options.targetWidth, 1080);
  const targetHeight = normalizeTargetDimension(options.targetHeight, 1920);

  try {
    const image = await loadImageForCanvas(objectUrl);
    const sourceWidth = image.naturalWidth || image.width;
    const sourceHeight = image.naturalHeight || image.height;

    if (!Number.isFinite(sourceWidth) || !Number.isFinite(sourceHeight) || sourceWidth <= 0 || sourceHeight <= 0) {
      return blob;
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const context = canvas.getContext('2d');
    if (!context) return blob;

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    const crop = getCoverCrop({
      sourceWidth,
      sourceHeight,
      targetWidth,
      targetHeight,
      backgroundPosition: options.backgroundPosition,
    });
    context.drawImage(
      image,
      crop.sx,
      crop.sy,
      crop.sw,
      crop.sh,
      0,
      0,
      targetWidth,
      targetHeight,
    );

    return (await canvasToBlob(canvas, 'image/jpeg', 0.88)) || blob;
  } catch {
    return blob;
  }
}

function getHeaderValue(headers: Record<string, string | undefined> | undefined, key: string) {
  const expectedKey = key.trim().toLowerCase();
  for (const [headerKey, value] of Object.entries(headers || {})) {
    if (headerKey.trim().toLowerCase() === expectedKey) {
      return String(value || '').trim();
    }
  }

  return '';
}

function toNativeResponseBytes(data: unknown) {
  if (typeof data === 'string') {
    return base64ToUint8Array(data);
  }

  if (data instanceof ArrayBuffer) {
    return new Uint8Array(data);
  }

  if (ArrayBuffer.isView(data)) {
    return new Uint8Array(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength));
  }

  if (Array.isArray(data)) {
    return new Uint8Array(data);
  }

  return null;
}

async function defaultNativeBackgroundGet(url: string): Promise<NativeBackgroundResponse> {
  return CapacitorHttp.get({
    url,
    headers: {
      Accept: 'image/*,*/*',
    },
    connectTimeout: 30000,
    readTimeout: 30000,
    responseType: 'arraybuffer',
  });
}

async function fetchNativeBackgroundBlob(
  source: string,
  nativeGet: NonNullable<ResolveHoodieShareBackgroundOptions['nativeGet']>,
) {
  const response = await nativeGet(source);
  if (response.status < 200 || response.status >= 300) {
    throw new Error(`Background image request failed (${response.status})`);
  }

  const bytes = toNativeResponseBytes(response.data);
  if (!bytes || bytes.byteLength === 0) {
    throw new Error('Background image response was empty');
  }

  return new Blob([bytes], {
    type: getHeaderValue(response.headers, 'content-type') || 'image/jpeg',
  });
}

async function fetchBrowserBackgroundBlob(
  source: string,
  fetchImpl: NonNullable<ResolveHoodieShareBackgroundOptions['fetchImpl']>,
) {
  const response = await fetchImpl(source, {
    mode: 'cors',
    credentials: 'omit',
  });

  if (!response.ok) {
    throw new Error(`Background image request failed (${response.status})`);
  }

  const blob = await response.blob();
  if (!blob.size) {
    throw new Error('Background image response was empty');
  }

  return blob;
}

async function createResolvedBackground(
  originalUrl: string,
  blob: Blob,
  createObjectUrl: NonNullable<ResolveHoodieShareBackgroundOptions['createObjectUrl']>,
  revokeObjectUrl: NonNullable<ResolveHoodieShareBackgroundOptions['revokeObjectUrl']>,
  options: Pick<ResolveHoodieShareBackgroundOptions, 'targetWidth' | 'targetHeight' | 'backgroundPosition'> = {},
): Promise<HoodieShareResolvedBackground> {
  let resolvedUrl: string;
  let revoke = noopRevoke;

  try {
    const objectUrl = createObjectUrl(blob);
    const preparedBlob = await prepareBackgroundBlobForShare(blob, objectUrl, options);
    resolvedUrl = await blobToDataUrl(preparedBlob);
    revoke = () => revokeObjectUrl(objectUrl);
  } catch {
    resolvedUrl = await blobToDataUrl(blob);
  }

  return {
    originalUrl,
    resolvedUrl,
    revoke,
  };
}

function createFallbackBackground(originalUrl: string | undefined, fallbackReason: string): HoodieShareResolvedBackground {
  return {
    originalUrl,
    resolvedUrl: undefined,
    fallbackReason,
    revoke: noopRevoke,
  };
}

export async function resolveHoodieShareBackgroundImage(
  backgroundImageUrl: string | undefined,
  options: ResolveHoodieShareBackgroundOptions = {},
) {
  const source = String(backgroundImageUrl || '').trim();
  if (!source) {
    return createFallbackBackground(undefined, 'missing background image');
  }

  if (source.startsWith('blob:') || source.startsWith('data:')) {
    return {
      originalUrl: source,
      resolvedUrl: source,
      revoke: noopRevoke,
    };
  }

  const nativeShell = options.nativeShell ?? isNativeShell();
  const createObjectUrl = options.createObjectUrl ?? ((blob: Blob) => URL.createObjectURL(blob));
  const revokeObjectUrl = options.revokeObjectUrl ?? ((url: string) => URL.revokeObjectURL(url));
  const fetchImpl = options.fetchImpl ?? (typeof fetch === 'function' ? fetch.bind(globalThis) : undefined);
  const nativeGet = options.nativeGet ?? defaultNativeBackgroundGet;
  const fallbackReasons: string[] = [];

  if (nativeShell) {
    try {
      const blob = await fetchNativeBackgroundBlob(source, nativeGet);
      return createResolvedBackground(source, blob, createObjectUrl, revokeObjectUrl, options);
    } catch (error) {
      fallbackReasons.push(`native fetch failed: ${toErrorMessage(error, 'request failed')}`);
    }
  }

  if (fetchImpl) {
    try {
      const blob = await fetchBrowserBackgroundBlob(source, fetchImpl);
      return createResolvedBackground(source, blob, createObjectUrl, revokeObjectUrl, options);
    } catch (error) {
      fallbackReasons.push(`browser fetch failed: ${toErrorMessage(error, 'request failed')}`);
    }
  } else {
    fallbackReasons.push('browser fetch unavailable');
  }

  return createFallbackBackground(
    source,
    fallbackReasons.join('; ') || 'background image could not be resolved',
  );
}

export async function renderHoodieShareCardAsset(options: {
  cardData: HoodieShareCardData;
  format: HoodieShareCardFormat;
  fileName: string;
}) {
  if (typeof document === 'undefined') {
    throw new Error('Share cards can only be rendered in the browser.');
  }

  const host = document.createElement('div');
  host.style.position = 'fixed';
  host.style.left = '-20000px';
  host.style.top = '0';
  host.style.pointerEvents = 'none';
  host.style.opacity = '0';
  host.style.zIndex = '-1';
  document.body.appendChild(host);

  const root = createRoot(host);
  let revokeBackgroundImage = () => undefined;

  try {
    const renderBlob = async (cardData: HoodieShareCardData) => {
      root.render(<HoodieShareCard data={cardData} format={options.format} />);
      await waitForPaint();
      if (document.fonts?.ready) {
        await document.fonts.ready;
      }
      await waitForImages(host);
      await waitForPaint();

      const target = host.firstElementChild as HTMLElement | null;
      if (!target) {
        throw new Error('Share card did not render.');
      }

      const blob = await toBlob(target, {
        cacheBust: true,
        pixelRatio: 1,
      });

      if (!blob) {
        throw new Error('Share card export failed.');
      }

      return blob;
    };

    const cardSpec = HOODIE_SHARE_CARD_SPECS[options.format];
    const resolvedBackground = await resolveHoodieShareBackgroundImage(options.cardData.backgroundImageUrl, {
      targetWidth: cardSpec.width,
      targetHeight: cardSpec.height,
      backgroundPosition: options.cardData.backgroundPosition,
    });
    revokeBackgroundImage = resolvedBackground.revoke;

    if (!resolvedBackground.resolvedUrl && options.cardData.renderStyle === 'photo') {
      console.warn(
        'Hoodie share background image could not be materialized for export, using brand fallback:',
        resolvedBackground.fallbackReason || 'background image unavailable',
      );
    }

    const preparedCardData: HoodieShareCardData = resolvedBackground.resolvedUrl
      ? {
          ...options.cardData,
          backgroundImageUrl: resolvedBackground.resolvedUrl,
        }
      : {
          ...options.cardData,
          backgroundImageUrl: undefined,
          renderStyle: 'brand',
        };

    let blob: Blob;
    try {
      blob = await renderBlob(preparedCardData);
    } catch (error) {
      const shouldRetryWithBrandFallback =
        preparedCardData.renderStyle === 'photo' || Boolean(preparedCardData.backgroundImageUrl);

      if (!shouldRetryWithBrandFallback) {
        throw error;
      }

      console.warn('Hoodie share export failed with the media-led card, retrying with a branded fallback:', error);
      blob = await renderBlob({
        ...preparedCardData,
        backgroundImageUrl: undefined,
        renderStyle: 'brand',
      });
    }

    return {
      blob,
      uri: isNativeShell() ? await writeBlobToCache(blob, options.fileName) : '',
    };
  } catch (error) {
    throw new Error(toErrorMessage(error, 'Share card export failed.'));
  } finally {
    revokeBackgroundImage();
    root.unmount();
    host.remove();
  }
}
