// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ShoppingPage } from './shopping-page';

vi.mock('../components/hoodie-help-tour', () => ({
  HoodieHelpTrigger: ({ title }: { title: string }) => (
    <button type="button" aria-label={title}>
      ?
    </button>
  ),
}));

vi.mock('../lib/api', () => ({
  fetchNearbyRetailerStores: vi.fn(),
  fetchRetailerShoppingSearch: vi.fn(),
  fetchShoppingSearch: vi.fn(),
  searchRetailerStores: vi.fn(),
}));

vi.mock('../lib/geolocation', () => ({
  GEO_ERROR_CODES: {
    PERMISSION_DENIED: 1,
    POSITION_UNAVAILABLE: 2,
    TIMEOUT: 3,
  },
  getCurrentAppPosition: vi.fn(),
}));

type MountedComponent = {
  container: HTMLDivElement;
  root: Root;
};

const mountedComponents: MountedComponent[] = [];

function buildStoredStore(name: string, distanceKm: number) {
  return {
    id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    name,
    address: `${name}, 123 Very Long Retail Arcade Address, Sydney NSW 2000`,
    suburb: 'Sydney',
    state: 'NSW',
    postcode: '2000',
    lat: -33.8688,
    lng: 151.2093,
    distanceKm,
    storeRef: null,
    storeRefKind: 'coles_store',
    source: 'osm_fallback',
  };
}

async function renderShoppingPage(path = '/shopping?retailer=compare') {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  mountedComponents.push({ container, root });

  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/shopping" element={<ShoppingPage />} />
          <Route path="/dashboard" element={<div>Dashboard</div>} />
        </Routes>
      </MemoryRouter>,
    );
    await Promise.resolve();
  });

  return container;
}

async function flushEffects() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

function getButtonContaining(container: HTMLElement, text: string) {
  return Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find((button) =>
    button.textContent?.includes(text),
  );
}

describe('ShoppingPage price compare layout', () => {
  beforeEach(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    window.localStorage.clear();
  });

  afterEach(async () => {
    while (mountedComponents.length > 0) {
      const mounted = mountedComponents.pop();
      if (!mounted) break;
      await act(async () => {
        mounted.root.unmount();
        await Promise.resolve();
      });
      mounted.container.remove();
    }

    document.body.innerHTML = '';
    window.localStorage.clear();
  });

  it('keeps compare store cards mobile-safe for long store names and badges', async () => {
    window.localStorage.setItem(
      'ghar_shopping_compare_selected_stores_v2',
      JSON.stringify({
        woolworths: buildStoredStore('Woolworths Metro Extremely Long Sydney Harbour Arcade', 11930),
        coles: buildStoredStore('Coles Local Sydney Cbd - York Street With A Very Long Name', 0.068),
        aldi: null,
      }),
    );

    const container = await renderShoppingPage();
    await flushEffects();

    const woolworthsCard = getButtonContaining(container, 'Woolworths Metro Extremely Long Sydney Harbour Arcade');
    const colesCard = getButtonContaining(container, 'Coles Local Sydney Cbd - York Street With A Very Long Name');
    const aldiCard = getButtonContaining(container, 'Tap to pick a ALDI store');

    expect(woolworthsCard?.className).toContain('min-w-0');
    expect(woolworthsCard?.className).toContain('max-w-full');
    expect(woolworthsCard?.className).toContain('overflow-hidden');
    expect(colesCard?.querySelector('p:nth-of-type(2)')?.className).toContain('truncate');
    expect(colesCard?.querySelector('p:nth-of-type(3)')?.className).toContain('truncate');
    expect(aldiCard?.querySelector('span')?.className).toContain('whitespace-nowrap');
    expect(aldiCard?.querySelector('span')?.className).toContain('self-start');
    expect(container.textContent).toContain('2/3 stores selected');
  });
});
