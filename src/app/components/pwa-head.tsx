import { useEffect } from 'react';
import { getNativePlatform, isNativeShell } from '../lib/platform';
import { APP_CONFIG } from '../lib/app-config';
import { APP_VARIANT } from '../lib/app-variant';

/**
 * PWA Head — Injects all Progressive Web App meta tags, manifest,
 * icons, and service worker registration into <head> at runtime.
 *
 * Since Figma Make has no editable index.html, everything is done
 * programmatically on first mount.
 */

const SERVICE_WORKER_VERSION = 'static-v3';
const SERVICE_WORKER_RELOAD_KEY = `ghar_sw_reloaded_${SERVICE_WORKER_VERSION}`;
let serviceWorkerHadController = false;
let serviceWorkerControllerChangeListenerInstalled = false;
let serviceWorkerReloading = false;

// ─── MANIFEST (generated as Blob URL) ────────────────────────────
function createManifestBlob(iconUrl: string): string {
  const manifest = {
    name: APP_CONFIG.ogTitle,
    short_name: APP_CONFIG.shortName,
    description: APP_CONFIG.description,
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#FFFFFF',
    theme_color: '#1E40AF',
    categories: ['lifestyle', 'utilities', 'social'],
    icons: [
      {
        src: iconUrl,
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: iconUrl,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
  const blob = new Blob([JSON.stringify(manifest)], {
    type: 'application/json',
  });
  return URL.createObjectURL(blob);
}

// ─── HELPER: inject a tag only once ──────────────────────────────
function ensureTag(
  tag: string,
  attrs: Record<string, string>,
  identifyBy: string,
) {
  const selector = `${tag}[${identifyBy}="${attrs[identifyBy]}"]`;
  if (document.head.querySelector(selector)) return;
  const el = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
  document.head.appendChild(el);
}

function upsertTag(
  tag: string,
  attrs: Record<string, string>,
  identifyBy: string,
) {
  const selector = `${tag}[${identifyBy}="${attrs[identifyBy]}"]`;
  const existing = document.head.querySelector(selector);
  if (existing) {
    Object.entries(attrs).forEach(([k, v]) => existing.setAttribute(k, v));
    return;
  }
  ensureTag(tag, attrs, identifyBy);
}

// ─── SERVICE WORKER ──────────────────────────────────────────────
function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  if (window.location.protocol === 'blob:' || window.location.href.includes('figmaiframepreview')) return;

  serviceWorkerHadController = serviceWorkerHadController || Boolean(navigator.serviceWorker.controller);
  if (!serviceWorkerControllerChangeListenerInstalled) {
    serviceWorkerControllerChangeListenerInstalled = true;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!serviceWorkerHadController || serviceWorkerReloading) return;
      if (sessionStorage.getItem(SERVICE_WORKER_RELOAD_KEY) === '1') return;
      serviceWorkerReloading = true;
      sessionStorage.setItem(SERVICE_WORKER_RELOAD_KEY, '1');
      window.location.reload();
    });
  }

  const swUrl = `/app-service-worker.js?variant=${encodeURIComponent(APP_VARIANT)}&v=${encodeURIComponent(SERVICE_WORKER_VERSION)}`;
  navigator.serviceWorker
    .register(swUrl, { scope: '/', updateViaCache: 'none' })
    .then((registration) => registration.update().catch(() => undefined))
    .catch((err) => {
      console.warn('App SW registration failed:', err);
    });
}

// ─── COMPONENT ───────────────────────────────────────────────────
export function PwaHead() {
  useEffect(() => {
    const nativeShell = isNativeShell();

    // 1. Manifest
    const manifestUrl = nativeShell ? null : createManifestBlob(APP_CONFIG.webIcon);
    if (manifestUrl) {
      ensureTag('link', { rel: 'manifest', href: manifestUrl }, 'rel');
    }

    // 2. Theme color
    ensureTag('meta', { name: 'theme-color', content: '#1E40AF' }, 'name');

    // 2a. Description — override platform default
    const existingDesc = document.head.querySelector('meta[name="description"]');
    if (existingDesc) {
      existingDesc.setAttribute('content', APP_CONFIG.description);
    } else {
      ensureTag('meta', { name: 'description', content: APP_CONFIG.description }, 'name');
    }

    // 2b. Viewport — prevent input zoom on mobile
    // Override any existing viewport tag
    const existingViewport = document.head.querySelector('meta[name="viewport"]');
    if (existingViewport) {
      existingViewport.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0, viewport-fit=cover');
    } else {
      ensureTag('meta', { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0, viewport-fit=cover' }, 'name');
    }

    // 3. Apple PWA meta tags
    ensureTag(
      'meta',
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      'name',
    );
    ensureTag(
      'meta',
      {
        name: 'apple-mobile-web-app-status-bar-style',
        content: 'black-translucent',
      },
      'name',
    );
    ensureTag(
      'meta',
      { name: 'apple-mobile-web-app-title', content: APP_CONFIG.shortName },
      'name',
    );

    // 4. Apple touch icon
    ensureTag(
      'link',
      { rel: 'apple-touch-icon', href: APP_CONFIG.webIcon },
      'rel',
    );

    // 5. Favicon (32x32)
    ensureTag(
      'link',
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '32x32',
        href: APP_CONFIG.webIcon,
      },
      'rel',
    );

    // 6. Microsoft tile
    ensureTag(
      'meta',
      { name: 'msapplication-TileColor', content: '#1E40AF' },
      'name',
    );
    ensureTag(
      'meta',
      { name: 'msapplication-TileImage', content: APP_CONFIG.webIcon },
      'name',
    );

    // 7. Open Graph / Social meta
    upsertTag(
      'meta',
      {
        property: 'og:title',
        content: APP_CONFIG.ogTitle,
      },
      'property',
    );
    upsertTag(
      'meta',
      {
        property: 'og:description',
        content: APP_CONFIG.description,
      },
      'property',
    );
    upsertTag(
      'meta',
      { property: 'og:image', content: APP_CONFIG.socialImageUrl },
      'property',
    );
    upsertTag(
      'meta',
      { property: 'og:url', content: APP_CONFIG.marketingUrl },
      'property',
    );
    upsertTag(
      'meta',
      { property: 'og:type', content: 'website' },
      'property',
    );

    upsertTag(
      'meta',
      { name: 'twitter:card', content: 'summary_large_image' },
      'name',
    );
    upsertTag(
      'meta',
      { name: 'twitter:title', content: APP_CONFIG.ogTitle },
      'name',
    );
    upsertTag(
      'meta',
      { name: 'twitter:description', content: APP_CONFIG.description },
      'name',
    );
    upsertTag(
      'meta',
      { name: 'twitter:image', content: APP_CONFIG.socialImageUrl },
      'name',
    );

    // 8. Document title
    document.title = APP_CONFIG.title;
    document.documentElement.dataset.platform = getNativePlatform();
    if (nativeShell) {
      document.body.classList.add('native-shell');
    } else {
      document.body.classList.remove('native-shell');
    }

    // 9. Service Worker
    if (!nativeShell) {
      registerServiceWorker();
    }

    return () => {
      // Revoke the manifest blob on unmount (unlikely but clean)
      if (manifestUrl) {
        URL.revokeObjectURL(manifestUrl);
      }
    };
  }, []);

  // This component renders nothing — it only manages <head>
  return null;
}
