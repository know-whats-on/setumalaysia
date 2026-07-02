// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  VibeEventsHub,
  clearVibeEventsHubOfficialEventsCacheForTest,
} from './vibe-events-hub';

const {
  addCustomItineraryStopMock,
  browserOpenMock,
  createItineraryPlanMock,
  createNetworkingCardMock,
  deletePublicPlanMock,
  deleteNetworkingCardMock,
  fetchOfficialEventsMock,
  fetchOfficialEventUniversitiesMock,
  fetchItineraryWalkingRouteMock,
  fetchMyItineraryMock,
  fetchNetworkingCardsMock,
  fetchProfileMock,
  fetchPublicPlansMock,
  getCurrentAppPositionMock,
  isNativeShellMock,
  joinPublicPlanMock,
  leavePublicPlanMock,
  rejectPublicPlanMock,
  removeCustomItineraryStopMock,
  removeEventFromItineraryMock,
  resolveItineraryLocationFromMapUrlMock,
  reorderItineraryDayMock,
  updateCustomItineraryStopMock,
  updateNetworkingCardMock,
} = vi.hoisted(() => ({
  addCustomItineraryStopMock: vi.fn(),
  browserOpenMock: vi.fn(),
  createItineraryPlanMock: vi.fn(),
  createNetworkingCardMock: vi.fn(),
  deletePublicPlanMock: vi.fn(),
  deleteNetworkingCardMock: vi.fn(),
  fetchOfficialEventsMock: vi.fn(),
  fetchOfficialEventUniversitiesMock: vi.fn(),
  fetchItineraryWalkingRouteMock: vi.fn(),
  fetchMyItineraryMock: vi.fn(),
  fetchNetworkingCardsMock: vi.fn(),
  fetchProfileMock: vi.fn(),
  fetchPublicPlansMock: vi.fn(),
  getCurrentAppPositionMock: vi.fn(),
  isNativeShellMock: vi.fn(() => false),
  joinPublicPlanMock: vi.fn(),
  leavePublicPlanMock: vi.fn(),
  rejectPublicPlanMock: vi.fn(),
  removeCustomItineraryStopMock: vi.fn(),
  removeEventFromItineraryMock: vi.fn(),
  resolveItineraryLocationFromMapUrlMock: vi.fn(),
  reorderItineraryDayMock: vi.fn(),
  updateCustomItineraryStopMock: vi.fn(),
  updateNetworkingCardMock: vi.fn(),
}));

vi.mock('@capacitor/browser', () => ({
  Browser: {
    open: browserOpenMock,
  },
}));

vi.mock('../lib/api', () => ({
  addCustomItineraryStop: addCustomItineraryStopMock,
  createItineraryPlan: createItineraryPlanMock,
  createNetworkingCard: createNetworkingCardMock,
  deletePublicPlan: deletePublicPlanMock,
  deleteNetworkingCard: deleteNetworkingCardMock,
  fetchOfficialEvents: fetchOfficialEventsMock,
  fetchOfficialEventUniversities: fetchOfficialEventUniversitiesMock,
  fetchItineraryWalkingRoute: fetchItineraryWalkingRouteMock,
  fetchMyItinerary: fetchMyItineraryMock,
  fetchNetworkingCards: fetchNetworkingCardsMock,
  fetchProfile: fetchProfileMock,
  fetchPublicPlans: fetchPublicPlansMock,
  joinPublicPlan: joinPublicPlanMock,
  leavePublicPlan: leavePublicPlanMock,
  rejectPublicPlan: rejectPublicPlanMock,
  removeCustomItineraryStop: removeCustomItineraryStopMock,
  removeEventFromItinerary: removeEventFromItineraryMock,
  resolveItineraryLocationFromMapUrl: resolveItineraryLocationFromMapUrlMock,
  reorderItineraryDay: reorderItineraryDayMock,
  updateCustomItineraryStop: updateCustomItineraryStopMock,
  updateNetworkingCard: updateNetworkingCardMock,
}));

vi.mock('../lib/app-config', () => ({
  APP_CONFIG: {
    displayName: 'Hoodie',
    showOfficialEventsFeature: true,
    showPublicPlansFeature: true,
    variant: 'ghar',
  },
}));

vi.mock('../lib/geolocation', () => ({
  getCurrentAppPosition: getCurrentAppPositionMock,
}));

vi.mock('../lib/platform', () => ({
  isNativeShell: isNativeShellMock,
}));

vi.mock('./layout', () => ({
  useGharData: () => ({ banners: [] }),
}));

vi.mock('./ui/use-mobile', () => ({
  useIsMobile: () => true,
}));

vi.mock('react-map-gl/maplibre', async () => {
  const React = await import('react');
  const fakeMapTarget = {
    fitBounds: vi.fn(),
    resize: vi.fn(),
  };
  const MapGL = React.forwardRef(function MockMapGL(
    props: React.PropsWithChildren<{
      mapStyle?: string;
      onLoad?: (event: { target: typeof fakeMapTarget }) => void;
    }>,
    ref,
  ) {
    React.useImperativeHandle(ref, () => ({
      getMap: () => fakeMapTarget,
    }));
    React.useEffect(() => {
      props.onLoad?.({ target: fakeMapTarget });
    }, [props]);
    return (
      <div data-testid="itinerary-map" data-map-style={props.mapStyle || ''}>
        {props.children}
      </div>
    );
  });
  const Source = ({ id, children }: React.PropsWithChildren<{ id: string }>) => (
    <div data-testid={`source-${id}`}>{children}</div>
  );
  const Layer = ({ id }: { id: string }) => <div data-testid={`layer-${id}`} />;
  const Marker = ({ children }: React.PropsWithChildren) => <div data-testid="marker">{children}</div>;
  const NavigationControl = () => <div data-testid="navigation-control" />;
  return { default: MapGL, Layer, Marker, NavigationControl, Source };
});

type MountedHub = {
  container: HTMLDivElement;
  root: Root;
};

const mountedHubs: MountedHub[] = [];

async function flushEffects() {
  await act(async () => {
    await Promise.resolve();
  });
}

async function click(element: Element | null) {
  if (!(element instanceof HTMLElement)) {
    throw new Error('Expected an HTML element to click.');
  }

  await act(async () => {
    element.click();
    await Promise.resolve();
  });
}

function getButtonByText(container: HTMLElement, text: string) {
  const normalizedText = text.trim().toLowerCase();
  const button = Array.from(container.querySelectorAll('button')).find((candidate) => {
    const candidateText = candidate.textContent?.replace(/\s+/g, ' ').trim().toLowerCase() || '';
    return candidateText.includes(normalizedText);
  });
  if (!button) {
    throw new Error(`Could not find button containing text "${text}".`);
  }
  return button as HTMLButtonElement;
}

async function renderHub({
  councilParam = '',
  onCouncilChange = () => {},
}: {
  councilParam?: string;
  onCouncilChange?: (councilSlug: string) => void;
} = {}) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  mountedHubs.push({ container, root });

  await act(async () => {
    root.render(
      <MemoryRouter>
        <VibeEventsHub
          eventTab="whatson"
          councilParam={councilParam}
          onEventTabChange={() => {}}
          onCouncilChange={onCouncilChange}
        />
      </MemoryRouter>,
    );
    await Promise.resolve();
  });

  await flushEffects();
  return container;
}

async function selectCouncil(container: HTMLElement, councilSlug: string) {
  const select = container.querySelector<HTMLSelectElement>(
    '#council-whats-on-select',
  );
  if (!select) {
    throw new Error('Missing council selector.');
  }

  await act(async () => {
    select.value = councilSlug;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    await Promise.resolve();
  });
}

describe('vibe events fallback state', () => {
  let windowOpenSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    clearVibeEventsHubOfficialEventsCacheForTest();

    window.localStorage.clear();

    browserOpenMock.mockReset();
    createItineraryPlanMock.mockReset();
    deletePublicPlanMock.mockReset();
    fetchOfficialEventsMock.mockReset();
    fetchOfficialEventUniversitiesMock.mockReset();
    fetchItineraryWalkingRouteMock.mockReset();
    fetchMyItineraryMock.mockReset();
    fetchProfileMock.mockReset();
    fetchPublicPlansMock.mockReset();
    getCurrentAppPositionMock.mockReset();
    isNativeShellMock.mockReset();
    joinPublicPlanMock.mockReset();
    leavePublicPlanMock.mockReset();
    rejectPublicPlanMock.mockReset();
    removeEventFromItineraryMock.mockReset();
    reorderItineraryDayMock.mockReset();

    isNativeShellMock.mockReturnValue(false);
    fetchOfficialEventsMock.mockRejectedValue(new Error('Failed to fetch official events'));
    fetchOfficialEventUniversitiesMock.mockResolvedValue([]);
    fetchItineraryWalkingRouteMock.mockResolvedValue({
      status: 'walking',
      distance_m: 650,
      duration_s: 520,
      stop_count: 2,
      geometry: { type: 'FeatureCollection', features: [] },
    });
    fetchMyItineraryMock.mockResolvedValue([]);
    fetchProfileMock.mockResolvedValue(null);
    fetchPublicPlansMock.mockResolvedValue([]);
    getCurrentAppPositionMock.mockRejectedValue(new Error('No GPS in tests'));
    removeEventFromItineraryMock.mockResolvedValue(undefined);
    reorderItineraryDayMock.mockResolvedValue([]);
    createItineraryPlanMock.mockResolvedValue({ id: 'itinerary-plan' });

    windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
  });

  afterEach(async () => {
    windowOpenSpy.mockRestore();

    while (mountedHubs.length > 0) {
      const mounted = mountedHubs.pop();
      if (!mounted) break;
      await act(async () => {
        mounted.root.unmount();
        await Promise.resolve();
      });
      mounted.container.remove();
    }

    document.body.innerHTML = '';
    clearVibeEventsHubOfficialEventsCacheForTest();
  });

  it('shows a What’s On fallback card and retries the feed', async () => {
    const container = await renderHub();

    expect(container.textContent).toContain('The in-app event feed is having a moment.');
    expect(container.textContent).toContain("Open the live What's On page");

    await click(getButtonByText(container, "Open What's On page"));
    expect(windowOpenSpy).toHaveBeenCalledWith(
      'https://whatson.cityofsydney.nsw.gov.au/events',
      '_blank',
      'noopener,noreferrer',
    );

    await click(getButtonByText(container, 'Try again'));
    await flushEffects();

    expect(fetchOfficialEventsMock).toHaveBeenCalledTimes(2);
  });

  it('uses the native browser handoff in the app shell', async () => {
    isNativeShellMock.mockReturnValue(true);
    const container = await renderHub();

    await click(getButtonByText(container, "Open What's On page"));

    expect(browserOpenMock).toHaveBeenCalledWith({
      url: 'https://whatson.cityofsydney.nsw.gov.au/events',
    });
    expect(windowOpenSpy).not.toHaveBeenCalled();
  });

  it('opens a newly selected non-Sydney council page with a web browser handoff', async () => {
    const onCouncilChange = vi.fn();
    const container = await renderHub({ onCouncilChange });

    await selectCouncil(container, 'blacktown-city-council');

    expect(onCouncilChange).toHaveBeenCalledWith('blacktown-city-council');
    expect(windowOpenSpy).toHaveBeenCalledWith(
      'https://www.blacktown.nsw.gov.au/Events-and-activities',
      '_blank',
      'noopener,noreferrer',
    );
  });

  it('opens a newly selected non-Sydney council page with the native browser handoff', async () => {
    isNativeShellMock.mockReturnValue(true);
    const onCouncilChange = vi.fn();
    const container = await renderHub({ onCouncilChange });

    await selectCouncil(container, 'blacktown-city-council');

    expect(onCouncilChange).toHaveBeenCalledWith('blacktown-city-council');
    expect(browserOpenMock).toHaveBeenCalledWith({
      url: 'https://www.blacktown.nsw.gov.au/Events-and-activities',
    });
    expect(windowOpenSpy).not.toHaveBeenCalled();
  });

  it('does not auto-open a browser from an existing non-Sydney council param', async () => {
    const container = await renderHub({ councilParam: 'blacktown-city-council' });
    const select = container.querySelector<HTMLSelectElement>(
      '#council-whats-on-select',
    );

    expect(select?.value).toBe('blacktown-city-council');
    expect(windowOpenSpy).not.toHaveBeenCalled();
    expect(browserOpenMock).not.toHaveBeenCalled();
    expect(container.querySelector('iframe')).toBeNull();
  });
});
