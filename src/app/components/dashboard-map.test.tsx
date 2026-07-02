// @vitest-environment jsdom

import { Browser } from '@capacitor/browser';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, useLocation } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchPublicToilets } from '../lib/api';
import { BAYSIDE_WARD_BOUNDARY_URL } from '../lib/wolli-content';
import { getCurrentAppPosition } from '../lib/geolocation';
import { DashboardMap } from './dashboard-map';

const WOLLI_PUBLIC_SOURCE_TEXT = `This website is publicly available on ${BAYSIDE_WARD_BOUNDARY_URL}`;
const GENERIC_MAP_DISCLAIMER_TEXT = 'All alerts and scams are marked by verified students and alumni';

const appConfigState = vi.hoisted(() => ({
  config: {
    variant: 'burb_mate',
    experienceMode: 'hoodie',
    displayName: 'Hoodie',
    assistantName: 'Hoodienie',
    resourcesLabel: 'Hoodienie',
    resourcesRoute: '/arrival',
    shareBaseUrl: '',
    showHciAlerts: false,
    showSetuFeatures: false,
    useSharedResourcesShell: true,
  },
}));

const mapMockState = vi.hoisted(() => ({
  easeTo: vi.fn(),
  fitBounds: vi.fn(),
  flyTo: vi.fn(),
  getZoom: vi.fn(() => 13),
  zoomIn: vi.fn(),
  zoomOut: vi.fn(),
}));

vi.mock('../lib/app-config', () => ({
  APP_CONFIG: appConfigState.config,
}));

vi.mock('@capacitor/browser', () => ({
  Browser: {
    open: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../lib/api', () => ({
  deleteListing: vi.fn(() => Promise.resolve()),
  fetchNearbyFuelStations: vi.fn(() => Promise.resolve([])),
  fetchOverpassData: vi.fn(() => Promise.resolve({ elements: [] })),
  fetchProfile: vi.fn(() => Promise.resolve(null)),
  fetchPropertyPedigree: vi.fn(() => Promise.resolve(null)),
  fetchPublicToilets: vi.fn(),
  fetchRentalHistory: vi.fn(() => Promise.resolve([])),
  fetchTransportDepartures: vi.fn(() => Promise.resolve({ departures: [] })),
  fetchTransportEligibility: vi.fn(() => Promise.resolve(null)),
  fetchTransportRetailers: vi.fn(() => Promise.resolve([])),
  fetchTransportStatus: vi.fn(() => Promise.resolve([])),
  fetchTransportTrips: vi.fn(() => Promise.resolve({ trips: [] })),
  searchAddress: vi.fn(() => Promise.resolve([])),
  searchOpenMapLocations: vi.fn(() => Promise.resolve([])),
  warmTransportProvider: vi.fn(() => Promise.resolve()),
}));

vi.mock('../lib/geolocation', () => ({
  GEO_ERROR_CODES: { PERMISSION_DENIED: 1 },
  getCurrentAppPosition: vi.fn(() => Promise.reject(new Error('Location disabled in tests'))),
}));

vi.mock('./hoodie-help-tour', () => ({
  HoodieHelpTrigger: ({ title }: { title?: string }) => (
    <button type="button" aria-label={title || 'Open onboarding video'}>?</button>
  ),
  useHoodieHelpTour: () => ({
    registerStep: vi.fn(),
    reportTripPlannerOpen: vi.fn(),
    shouldAutoOpenTripPlanner: false,
    unregisterStep: vi.fn(),
  }),
}));

vi.mock('react-map-gl/maplibre', async () => {
  const React = await import('react');
  const fakeBounds = {
    getWest: () => 150.9,
    getEast: () => 151.4,
    getSouth: () => -34,
    getNorth: () => -33.7,
    getSouthWest: () => ({ lat: -34, lng: 150.9 }),
    getNorthEast: () => ({ lat: -33.7, lng: 151.4 }),
    contains: () => true,
  };
  const fakeMap = {
    easeTo: mapMockState.easeTo,
    fitBounds: mapMockState.fitBounds,
    flyTo: mapMockState.flyTo,
    getBounds: () => fakeBounds,
    getCanvas: () => ({ style: {} }),
    getCenter: () => ({ lat: -33.86, lng: 151.2 }),
    getStyle: () => ({ layers: [] }),
    getZoom: mapMockState.getZoom,
    off: vi.fn(),
    on: vi.fn(),
    queryRenderedFeatures: () => [],
    resize: vi.fn(),
    setCenter: vi.fn(),
    zoomIn: mapMockState.zoomIn,
    zoomOut: mapMockState.zoomOut,
  };
  const MapGL = React.forwardRef(function MockMapGL(
    props: React.PropsWithChildren<{ interactiveLayerIds?: string[] }>,
    ref,
  ) {
    React.useImperativeHandle(ref, () => ({ getMap: () => fakeMap }));
    return (
      <div
        data-testid="map"
        data-interactive-layer-ids={(props.interactiveLayerIds || []).join(',')}
      >
        {props.children}
      </div>
    );
  });
  const Source = ({ id, children }: React.PropsWithChildren<{ id: string }>) => (
    <div data-testid={`source-${id}`}>{children}</div>
  );
  const Layer = ({ id }: { id: string }) => <div data-testid={`layer-${id}`} />;
  const Marker = ({ children }: React.PropsWithChildren) => <div data-testid="marker">{children}</div>;
  const Popup = ({ children }: React.PropsWithChildren) => <div data-testid="popup">{children}</div>;
  const NavigationControl = () => <div data-testid="navigation-control" />;
  return { default: MapGL, Layer, Marker, NavigationControl, Popup, Source };
});

type MountedComponent = {
  container: HTMLDivElement;
  root: Root;
};

const mountedComponents: MountedComponent[] = [];

async function flushAsync() {
  for (let index = 0; index < 8; index += 1) {
    await act(async () => {
      await Promise.resolve();
    });
  }
}

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location-probe">{`${location.pathname}${location.search}`}</div>;
}

async function renderDashboardMap(initialEntry = '/dashboard?view=map') {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  mountedComponents.push({ container, root });

  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={[initialEntry]}>
        <DashboardMap
          listings={[]}
          onDeleteListing={vi.fn()}
          onNewReport={vi.fn()}
          onSelectListing={vi.fn()}
        />
        <LocationProbe />
      </MemoryRouter>,
    );
  });
  await flushAsync();

  return container;
}

function getButtonByTitle(container: ParentNode, title: string) {
  return container.querySelector(`button[title="${title}"]`) as HTMLButtonElement | null;
}

function getButtonByAria(container: ParentNode, label: string) {
  return container.querySelector(`button[aria-label="${label}"]`) as HTMLButtonElement | null;
}

function getButtonByText(container: ParentNode, text: string) {
  return Array.from(container.querySelectorAll('button')).find(
    (button) => button.textContent?.trim() === text,
  ) as HTMLButtonElement | undefined;
}

function getSourceLinks(container: ParentNode) {
  return Array.from(container.querySelectorAll('a')).filter(
    (link) => link.getAttribute('href') === BAYSIDE_WARD_BOUNDARY_URL,
  ) as HTMLAnchorElement[];
}

async function clickButton(button: Element | null) {
  expect(button).toBeTruthy();
  await act(async () => {
    button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await Promise.resolve();
  });
  await flushAsync();
}

describe('DashboardMap public toilets FAB', () => {
  beforeEach(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    appConfigState.config.variant = 'burb_mate';
    localStorage.clear();
    vi.mocked(getCurrentAppPosition).mockRejectedValue(new Error('Location disabled in tests'));
    mapMockState.easeTo.mockClear();
    mapMockState.fitBounds.mockClear();
    mapMockState.flyTo.mockClear();
    mapMockState.getZoom.mockReset();
    mapMockState.getZoom.mockReturnValue(13);
    mapMockState.zoomIn.mockClear();
    mapMockState.zoomOut.mockClear();
    vi.mocked(fetchPublicToilets).mockResolvedValue({
      data: [
        {
          id: 'toilet-1',
          name: 'Town Hall amenities',
          address: '1 George Street',
          town: 'Sydney',
          state: 'NSW',
          lat: -33.86,
          lng: 151.21,
          openingHours: '24 hours',
          accessible: true,
        },
      ],
      count: 1,
      source: 'fallback',
    });
    vi.mocked(Browser.open).mockClear();
  });

  afterEach(async () => {
    while (mountedComponents.length > 0) {
      const mounted = mountedComponents.pop();
      if (!mounted) break;
      await act(async () => {
        mounted.root.unmount();
      });
      mounted.container.remove();
    }
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('shows the official Bayside ward lookup only for Wolli maps', async () => {
    const defaultContainer = await renderDashboardMap();
    expect(defaultContainer.textContent).not.toContain('Wards & LGA');

    appConfigState.config.variant = 'wheres_wolli';
    const wolliContainer = await renderDashboardMap();
    expect(wolliContainer.textContent).toContain('Wards & LGA');
    expect(wolliContainer.querySelector('[data-testid="source-public-toilets"]')).toBeFalsy();

    await clickButton(getButtonByText(wolliContainer, 'Wards & LGA') || null);

    const iframe = wolliContainer.querySelector('iframe[title="Bayside Council Wards and LGA map"]') as HTMLIFrameElement | null;
    expect(iframe?.src).toBe(BAYSIDE_WARD_BOUNDARY_URL);
    expect(wolliContainer.textContent).toContain('Bayside Council Wards & LGA');

    await clickButton(getButtonByText(wolliContainer, 'Open official') || null);
    expect(Browser.open).toHaveBeenCalledWith({ url: BAYSIDE_WARD_BOUNDARY_URL });

    await clickButton(getButtonByAria(wolliContainer, 'Close Bayside Council Wards and LGA'));
    expect(wolliContainer.querySelector('iframe[title="Bayside Council Wards and LGA map"]')).toBeFalsy();
    expect(wolliContainer.querySelector('[data-testid="location-probe"]')?.textContent).toBe('/dashboard');
  });

  it('uses a clickable public-source marquee for Wolli and keeps the generic disclaimer elsewhere', async () => {
    const defaultContainer = await renderDashboardMap();
    expect(defaultContainer.textContent).toContain(GENERIC_MAP_DISCLAIMER_TEXT);
    expect(defaultContainer.textContent).not.toContain(WOLLI_PUBLIC_SOURCE_TEXT);
    expect(getSourceLinks(defaultContainer)).toHaveLength(0);

    appConfigState.config.variant = 'wheres_wolli';
    const wolliContainer = await renderDashboardMap();
    expect(wolliContainer.textContent).toContain(WOLLI_PUBLIC_SOURCE_TEXT);
    expect(wolliContainer.textContent).not.toContain(GENERIC_MAP_DISCLAIMER_TEXT);

    const sourceLinks = getSourceLinks(wolliContainer);
    expect(sourceLinks).toHaveLength(2);

    await act(async () => {
      sourceLinks[0].dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      await Promise.resolve();
    });
    await flushAsync();

    expect(Browser.open).toHaveBeenCalledWith({ url: BAYSIDE_WARD_BOUNDARY_URL });
  });

  it('keeps Public Toilets out of the layers drawer by default', async () => {
    const container = await renderDashboardMap();
    expect(container.textContent).not.toContain('Public Toilets');

    await clickButton(getButtonByTitle(container, 'Map Layers'));

    expect(container.textContent).toContain('MAP LAYERS');
    expect(container.textContent).toContain('Police Stations');
    expect(container.textContent).toContain('Hospitals');
    expect(container.textContent).not.toContain('Public Toilets');
  });

  it('opens, minimizes, and reopens the toilet panel without clearing markers', async () => {
    const container = await renderDashboardMap();

    await clickButton(getButtonByAria(container, 'Show public toilets'));

    expect(fetchPublicToilets).toHaveBeenCalled();
    expect(container.textContent).toContain('Public Toilets');
    expect(container.textContent).toContain('Town Hall amenities');
    expect(container.textContent).not.toContain('Source');
    expect(container.querySelector('[data-testid="source-public-toilets"]')).toBeTruthy();
    expect(getButtonByTitle(container, 'Zoom in')?.parentElement?.className).toContain('pointer-events-none');
    expect(getButtonByTitle(container, 'Zoom in')?.parentElement?.className).toContain('opacity-0');

    await clickButton(getButtonByAria(container, 'Minimize public toilet results'));

    expect(container.querySelector('[data-testid="source-public-toilets"]')).toBeTruthy();
    expect(container.textContent).toContain('1 of 1 facilities shown');
    expect(getButtonByAria(container, 'Open public toilet results')).toBeTruthy();
    expect(container.textContent).not.toContain('Town Hall amenities');
    expect(getButtonByTitle(container, 'Zoom in')?.parentElement?.className).toContain('opacity-100');

    await clickButton(getButtonByAria(container, 'Open public toilet results'));

    expect(container.querySelector('[data-testid="source-public-toilets"]')).toBeTruthy();
    expect(container.textContent).toContain('Town Hall amenities');
  });

  it('uses current location on first FAB open without hard-zooming to a house-level view', async () => {
    vi.mocked(getCurrentAppPosition).mockResolvedValue({
      coords: {
        latitude: -33.87,
        longitude: 151.2,
        accuracy: 25,
      },
    } as GeolocationPosition);
    mapMockState.getZoom.mockReturnValue(14.8);
    const container = await renderDashboardMap();

    await clickButton(getButtonByAria(container, 'Show public toilets'));
    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 450));
    });
    await flushAsync();

    expect(getCurrentAppPosition).toHaveBeenCalled();
    const [bounds] = vi.mocked(fetchPublicToilets).mock.calls.at(-1)!;
    expect(bounds.west).toBeLessThan(151.1);
    expect(bounds.east).toBeGreaterThan(151.3);
    expect(bounds.south).toBeLessThan(-33.95);
    expect(bounds.north).toBeGreaterThan(-33.79);
    const lastFlyTo = mapMockState.flyTo.mock.calls.at(-1)?.[0];
    expect(lastFlyTo?.zoom).not.toBe(15);
    expect(lastFlyTo?.zoom).toBeLessThanOrEqual(13);
  });

  it('keeps active filters on current-location search and explains filtered-empty results', async () => {
    const container = await renderDashboardMap();

    await clickButton(getButtonByAria(container, 'Show public toilets'));
    await clickButton(getButtonByText(container, 'Shower') || null);

    expect(container.textContent).toContain('No facilities match these filters');
    expect(container.textContent).toContain('1 nearby facility is loaded, but hidden by the selected filters.');
    expect(getButtonByText(container, 'Clear filters')).toBeTruthy();

    vi.mocked(getCurrentAppPosition).mockResolvedValue({
      coords: {
        latitude: -33.92,
        longitude: 151.12,
        accuracy: 20,
      },
    } as GeolocationPosition);

    await clickButton(getButtonByText(container, 'Current location') || null);
    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 450));
    });
    await flushAsync();

    expect(getCurrentAppPosition).toHaveBeenCalled();
    expect(container.textContent).toContain('0 of 1 facilities shown');
    expect(container.textContent).toContain('No facilities match these filters');
  });

  it('closes the toilet panel by disabling the toilet layer and clearing markers', async () => {
    const container = await renderDashboardMap();

    await clickButton(getButtonByAria(container, 'Show public toilets'));
    expect(container.querySelector('[data-testid="source-public-toilets"]')).toBeTruthy();

    await clickButton(getButtonByAria(container, 'Close public toilet results'));

    expect(container.querySelector('[data-testid="source-public-toilets"]')).toBeFalsy();
    expect(getButtonByAria(container, 'Show public toilets')).toBeTruthy();
    expect(container.textContent).not.toContain('Town Hall amenities');
  });
});
