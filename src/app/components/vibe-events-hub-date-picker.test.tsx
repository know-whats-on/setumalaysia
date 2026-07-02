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
  createItineraryPlanMock,
  deletePublicPlanMock,
  createNetworkingCardMock,
  deleteNetworkingCardMock,
  fetchOfficialEventsMock,
  fetchOfficialEventUniversitiesMock,
  fetchItineraryWalkingRouteMock,
  fetchMyItineraryMock,
  fetchNetworkingCardsMock,
  fetchProfileMock,
  fetchPublicPlansMock,
  getCurrentAppPositionMock,
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
  createItineraryPlanMock: vi.fn(),
  deletePublicPlanMock: vi.fn(),
  createNetworkingCardMock: vi.fn(),
  deleteNetworkingCardMock: vi.fn(),
  fetchOfficialEventsMock: vi.fn(),
  fetchOfficialEventUniversitiesMock: vi.fn(),
  fetchItineraryWalkingRouteMock: vi.fn(),
  fetchMyItineraryMock: vi.fn(),
  fetchNetworkingCardsMock: vi.fn(),
  fetchProfileMock: vi.fn(),
  fetchPublicPlansMock: vi.fn(),
  getCurrentAppPositionMock: vi.fn(),
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

function getAllButtons(container: HTMLElement) {
  return Array.from(container.querySelectorAll('button'));
}

function getButtonByText(container: HTMLElement, text: string) {
  const normalizedText = text.trim().toLowerCase();
  const button = getAllButtons(container).find((candidate) => {
    const candidateText = candidate.textContent?.replace(/\s+/g, ' ').trim().toLowerCase() || '';
    return candidateText.includes(normalizedText);
  });
  if (!button) {
    throw new Error(`Could not find button containing text "${text}".`);
  }
  return button as HTMLButtonElement;
}

function getDayButton(container: HTMLElement, dayNumber: string) {
  const button = getAllButtons(container).find((candidate) => {
    const text = candidate.textContent?.trim() || '';
    return text === dayNumber && !candidate.className.includes('day-outside');
  });
  if (!button) {
    throw new Error(`Could not find day button ${dayNumber}.`);
  }
  return button as HTMLButtonElement;
}

function getBoundaryValue(container: HTMLElement, label: 'Start date' | 'End date') {
  const labelNode = Array.from(container.querySelectorAll('p')).find(
    (candidate) => candidate.textContent?.trim().toLowerCase() === label.toLowerCase(),
  );
  if (!labelNode) {
    throw new Error(`Could not find "${label}" label.`);
  }
  const card = labelNode.closest('button');
  const value = card?.querySelectorAll('p')[1]?.textContent?.trim();
  if (!value) {
    throw new Error(`Could not find value for "${label}".`);
  }
  return value;
}

async function openWhenPicker(container: HTMLElement) {
  await click(getButtonByText(container, 'When'));
}

async function renderHub() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  mountedHubs.push({ container, root });

  await act(async () => {
    root.render(
      <MemoryRouter>
        <VibeEventsHub eventTab="whatson" onEventTabChange={() => {}} />
      </MemoryRouter>,
    );
    await Promise.resolve();
  });

  await flushEffects();
  return container;
}

async function renderControlledHub({
  onStateChange = () => {},
}: {
  onStateChange?: (updates: Record<string, unknown>) => void;
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
          officialEventWhen={{ startDay: '2026-05-03', endDay: '2026-05-11' }}
          officialEventTypes={['performance']}
          officialEventCategories={['nightlife']}
          officialEventsSourceMode="university"
          selectedUniversityId="unsw"
          onEventTabChange={() => {}}
          onStateChange={onStateChange}
        />
      </MemoryRouter>,
    );
    await Promise.resolve();
  });

  await flushEffects();
  return container;
}

describe('vibe events when picker', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-22T10:00:00+10:00'));
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    clearVibeEventsHubOfficialEventsCacheForTest();

    window.localStorage.clear();

    createItineraryPlanMock.mockReset();
    deletePublicPlanMock.mockReset();
    fetchOfficialEventsMock.mockReset();
    fetchOfficialEventUniversitiesMock.mockReset();
    fetchItineraryWalkingRouteMock.mockReset();
    fetchMyItineraryMock.mockReset();
    fetchProfileMock.mockReset();
    fetchPublicPlansMock.mockReset();
    getCurrentAppPositionMock.mockReset();
    joinPublicPlanMock.mockReset();
    leavePublicPlanMock.mockReset();
    rejectPublicPlanMock.mockReset();
    removeEventFromItineraryMock.mockReset();
    reorderItineraryDayMock.mockReset();

    fetchOfficialEventsMock.mockResolvedValue({
      data: [],
      meta: {
        available_categories: [],
        available_tags: [],
        bootstrapping: false,
      },
    });
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
    removeEventFromItineraryMock.mockResolvedValue(undefined);
    reorderItineraryDayMock.mockResolvedValue([]);
    createItineraryPlanMock.mockResolvedValue({ id: 'itinerary-plan' });
    getCurrentAppPositionMock.mockRejectedValue(new Error('No GPS in tests'));
  });

  afterEach(async () => {
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
    vi.useRealTimers();
  });

  it('updates the visible draft range immediately when a new start and end date are tapped', async () => {
    const container = await renderHub();

    await openWhenPicker(container);
    expect(getButtonByText(container, 'Apply').textContent).toContain('Apply');
    expect(getBoundaryValue(container, 'Start date')).toBe('22 Apr');
    expect(getBoundaryValue(container, 'End date')).toBe('21 May');

    await click(getDayButton(container, '24'));
    expect(getBoundaryValue(container, 'Start date')).toBe('24 Apr');
    expect(getBoundaryValue(container, 'End date')).toBe('24 Apr');

    await click(getDayButton(container, '29'));
    expect(getBoundaryValue(container, 'Start date')).toBe('24 Apr');
    expect(getBoundaryValue(container, 'End date')).toBe('29 Apr');
  });

  it('keeps reversed end selections ordered and discards uncommitted edits on close', async () => {
    const container = await renderHub();

    await openWhenPicker(container);
    await click(getDayButton(container, '24'));
    await click(getDayButton(container, '22'));

    expect(getBoundaryValue(container, 'Start date')).toBe('22 Apr');
    expect(getBoundaryValue(container, 'End date')).toBe('24 Apr');

    await click(getButtonByText(container, 'Close'));
    expect(getButtonByText(container, 'When').textContent).toContain('22 Apr-21 May');

    await openWhenPicker(container);
    expect(getBoundaryValue(container, 'Start date')).toBe('22 Apr');
    expect(getBoundaryValue(container, 'End date')).toBe('21 May');
  });

  it('commits the range on apply and reseeds from the default range after clear', async () => {
    const container = await renderHub();

    await openWhenPicker(container);
    await click(getDayButton(container, '24'));
    await click(getDayButton(container, '29'));
    await click(getButtonByText(container, 'Apply'));

    expect(getButtonByText(container, 'When').textContent).toContain('24 Apr-29 Apr');

    await openWhenPicker(container);
    await click(getButtonByText(container, 'Clear'));

    expect(getButtonByText(container, 'When').textContent).toContain('22 Apr-21 May');

    await openWhenPicker(container);
    expect(getBoundaryValue(container, 'Start date')).toBe('22 Apr');
    expect(getBoundaryValue(container, 'End date')).toBe('21 May');
  });

  it('uses controlled URL-backed filters on mount and emits date changes to the host', async () => {
    const onStateChange = vi.fn();
    const container = await renderControlledHub({ onStateChange });

    expect(fetchOfficialEventsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        categories: ['performance'],
        endDay: '2026-05-11',
        sourceGroup: 'campus',
        startDay: '2026-05-03',
        tags: ['nightlife'],
        universityId: 'unsw',
      }),
    );
    expect(getButtonByText(container, 'When').textContent).toContain('3 May-11 May');

    await openWhenPicker(container);
    await click(getButtonByText(container, 'Clear'));

    expect(onStateChange).toHaveBeenCalledWith({
      officialEventWhen: { startDay: '', endDay: '' },
    });

    await renderControlledHub();
    expect(fetchOfficialEventsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        categories: ['performance'],
        endDay: '2026-05-11',
        sourceGroup: 'campus',
        startDay: '2026-05-03',
        tags: ['nightlife'],
        universityId: 'unsw',
      }),
    );
  });
});
