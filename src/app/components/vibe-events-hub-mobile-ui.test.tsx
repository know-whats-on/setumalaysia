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
  appConfigMock,
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
  appConfigMock: {
    displayName: 'Hoodie',
    showOfficialEventsFeature: true,
    showPublicPlansFeature: true,
    variant: 'ghar',
  },
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
  APP_CONFIG: appConfigMock,
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

function buildEvent(index: number) {
  return {
    id: `cityofsydney:event-${index}`,
    source: 'cityofsydney',
    source_label: "City of Sydney What's On",
    slug: `event-${index}`,
    title: `City Event ${index}`,
    summary: `Event ${index} summary.`,
    description: `Event ${index} description.`,
    image_url: `https://images.example.com/event-${index}.jpg`,
    hero_image_url: `https://images.example.com/event-${index}.jpg`,
    categories: ['Exhibitions'],
    tags: ['Campus Life'],
    dates: ['2026-04-25'],
    venue_name: `Venue ${index}`,
    suburb: 'Sydney',
    regions: ['city-centre'],
    free_event: false,
    upcoming_date: '2026-04-25',
    upcoming_time: '7pm to 9pm',
    event_type: ['Performance'],
    source_url: `https://whatson.cityofsydney.nsw.gov.au/events/event-${index}`,
    lat: null,
    lng: null,
    address: `${index} George Street, Sydney NSW 2000`,
    location_additional_information: '',
    booking_url: '',
    website_url: '',
    contact_email: '',
    contact_phone: '',
    organiser: '',
    dates_humanized: 'Sat 25 Apr 2026',
    accessibilities: [],
    refreshed_at: '2026-04-22T00:00:00.000Z',
    fetched_at_ms: index,
  };
}

function buildPlan(overrides: Record<string, unknown> = {}) {
  return {
    id: 'plan-1',
    visibility: 'invite_only',
    source_type: 'custom',
    invite_token: '',
    event_source: 'custom',
    event_slug: 'plan-1',
    title: 'House dinner',
    note: '',
    meeting_point: 'Living room',
    meetup_at: '2026-05-01T09:00:00.000Z',
    attendee_cap: null,
    attendee_count: 1,
    attendees: [{
      id: 'attendee-1',
      display_name: 'Rushi V.',
      joined_at: '2026-04-30T00:00:00.000Z',
      is_creator: true,
    }],
    status: 'active',
    is_full: false,
    creator_name: 'Rushi V.',
    viewer_joined: false,
    viewer_invited: false,
    is_creator: false,
    can_join: true,
    can_leave: false,
    can_delete: false,
    can_reject: false,
    can_comment: false,
    comment_count: 0,
    invitee_count: 0,
    source_event: {
      id: 'custom:plan-1',
      title: 'House dinner',
      summary: '',
      url: '',
      image_url: '',
      booking_url: '',
      venue_name: 'Living room',
      suburb: '',
      dates_humanized: '',
    },
    created_at: '2026-04-30T00:00:00.000Z',
    updated_at: '2026-04-30T00:00:00.000Z',
    ...overrides,
  };
}

function buildItineraryEvent(overrides: Record<string, unknown> = {}) {
  const slug = String(overrides.event_slug || overrides.slug || 'event-1');
  const source = String(overrides.event_source || overrides.source || 'cityofsydney');
  return {
    id: `itinerary:${source}:${slug}`,
    app_variant: 'ghar',
    email: 'receiver@example.com',
    event_source: source,
    event_slug: slug,
    event_key: `${source}:${slug}`,
    source_label: "City of Sydney What's On",
    title: `Itinerary ${slug}`,
    summary: '',
    image_url: '',
    hero_image_url: '',
    booking_url: '',
    source_url: `https://events.example.com/${slug}`,
    venue_name: 'Town Hall',
    suburb: 'Sydney',
    address: '483 George Street, Sydney NSW 2000',
    dates_humanized: 'Sat 25 Apr 2026',
    event_day: '2026-04-25',
    upcoming_time: '7pm',
    lat: null,
    lng: null,
    order: 0,
    attended_at: '2026-04-22T00:00:00.000Z',
    updated_at: '2026-04-22T00:00:00.000Z',
    ...overrides,
  };
}

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

async function setFieldValue(element: Element | null, value: string) {
  if (!(element instanceof HTMLInputElement) && !(element instanceof HTMLTextAreaElement)) {
    throw new Error('Expected an input or textarea.');
  }

  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(
      element instanceof HTMLInputElement ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype,
      'value',
    )?.set;
    setter?.call(element, value);
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
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

function getButtonsByText(container: HTMLElement, text: string) {
  const normalizedText = text.trim().toLowerCase();
  return Array.from(container.querySelectorAll('button')).filter((candidate) => {
    const candidateText = candidate.textContent?.replace(/\s+/g, ' ').trim().toLowerCase() || '';
    return candidateText.includes(normalizedText);
  }) as HTMLButtonElement[];
}

function getOpenDrawerContentByTitle(title: string) {
  const normalizedTitle = title.trim().toLowerCase();
  const titleElement = Array.from(document.body.querySelectorAll('[data-slot="drawer-title"]')).find((candidate) => {
    const candidateText = candidate.textContent?.replace(/\s+/g, ' ').trim().toLowerCase() || '';
    return candidateText === normalizedTitle;
  });
  const drawerContent = titleElement?.closest('[data-slot="drawer-content"]');
  if (!(drawerContent instanceof HTMLElement)) {
    throw new Error(`Could not find open drawer titled "${title}".`);
  }
  return drawerContent;
}

function expectMobileFilterDrawerLayout(title: string) {
  const drawerContent = getOpenDrawerContentByTitle(title);
  const drawerOverlay = document.body.querySelector('[data-slot="drawer-overlay"]') as HTMLElement | null;
  const drawerBody = drawerContent.querySelector('[data-slot="drawer-body"]') as HTMLElement | null;
  const drawerFooter = drawerContent.querySelector('[data-slot="drawer-footer"]') as HTMLElement | null;
  const doneButton = getButtonByText(drawerContent, 'Done');

  expect(drawerOverlay?.className).toContain('z-[5000]');
  expect(drawerContent.className).toContain('z-[5010]');
  expect(drawerContent.className).toContain('overflow-hidden');
  expect(drawerContent.className).toContain('max-h-[calc(100dvh-var(--native-safe-area-top)-1rem)]');
  expect(drawerBody?.className).toContain('min-h-0');
  expect(drawerBody?.className).toContain('overflow-y-auto');
  expect(drawerBody?.className).toContain('max-h-[52vh]');
  expect(drawerFooter?.className).toContain('pb-[calc(var(--native-safe-area-bottom)+16px)]');
  expect(drawerFooter?.contains(doneButton)).toBe(true);
}

function hasButtonText(container: HTMLElement, text: string) {
  const normalizedText = text.trim().toLowerCase();
  return Array.from(container.querySelectorAll('button')).some((candidate) => {
    const candidateText = candidate.textContent?.replace(/\s+/g, ' ').trim().toLowerCase() || '';
    return candidateText.includes(normalizedText);
  });
}

function getHubScroller(container: HTMLElement) {
  const scroller = container.querySelector('[data-testid="vibe-events-hub-scroll"]');
  if (!(scroller instanceof HTMLDivElement)) {
    throw new Error('Could not find VibeEventsHub scroller.');
  }
  return scroller;
}

function mockQueuedAnimationFrames() {
  const callbacks: FrameRequestCallback[] = [];
  const spy = vi
    .spyOn(window, 'requestAnimationFrame')
    .mockImplementation((callback: FrameRequestCallback) => {
      callbacks.push(callback);
      return callbacks.length;
    });
  const flush = async () => {
    await act(async () => {
      const pending = callbacks.splice(0);
      pending.forEach((callback) => callback(0));
      await Promise.resolve();
    });
  };
  return { spy, flush, callbacks };
}

async function renderHub(eventTab: 'whatson' | 'networking' | 'plans' = 'whatson') {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  mountedHubs.push({ container, root });

  await act(async () => {
    root.render(
      <MemoryRouter>
        <VibeEventsHub eventTab={eventTab} onEventTabChange={() => {}} />
      </MemoryRouter>,
    );
    await Promise.resolve();
  });

  await flushEffects();
  return container;
}

async function unmountHub(container: HTMLElement) {
  const index = mountedHubs.findIndex((mounted) => mounted.container === container);
  if (index === -1) return;
  const [mounted] = mountedHubs.splice(index, 1);
  await act(async () => {
    mounted.root.unmount();
    await Promise.resolve();
  });
  mounted.container.remove();
}

describe('vibe events mobile feed', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-22T10:00:00+10:00'));
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    clearVibeEventsHubOfficialEventsCacheForTest();
    appConfigMock.displayName = 'Hoodie';
    appConfigMock.showOfficialEventsFeature = true;
    appConfigMock.showPublicPlansFeature = true;
    appConfigMock.variant = 'ghar';
    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      value: 0,
    });

    window.localStorage.clear();

    addCustomItineraryStopMock.mockReset();
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
    removeCustomItineraryStopMock.mockReset();
    removeEventFromItineraryMock.mockReset();
    resolveItineraryLocationFromMapUrlMock.mockReset();
    reorderItineraryDayMock.mockReset();
    updateCustomItineraryStopMock.mockReset();

    fetchOfficialEventsMock.mockResolvedValue({
      data: [{
        id: 'cityofsydney:nudenight-life-drawing',
        source: 'cityofsydney',
        source_label: "City of Sydney What's On",
        slug: 'nudenight-life-drawing',
        title: 'Nudenight Life Drawing at Doodler',
        summary: 'An evening drawing session.',
        description: 'An evening drawing session.',
        image_url: 'https://images.example.com/nudenight.jpg',
        hero_image_url: 'https://images.example.com/nudenight.jpg',
        categories: ['Exhibitions'],
        tags: ['Arts', 'Nightlife'],
        dates: ['2026-04-25'],
        venue_name: 'Doodler',
        suburb: 'Marrickville',
        regions: ['inner-west'],
        free_event: false,
        upcoming_date: '2026-04-25',
        upcoming_time: '7pm to 9pm',
        event_type: ['Performance'],
        source_url: 'https://whatson.cityofsydney.nsw.gov.au/events/nudenight-life-drawing',
        lat: null,
        lng: null,
        address: '9 Fitzroy St, Marrickville NSW 2204',
        location_additional_information: '',
        booking_url: '',
        website_url: '',
        contact_email: '',
        contact_phone: '',
        organiser: '',
        dates_humanized: 'Sat 25 Apr 2026',
        accessibilities: [],
        refreshed_at: '2026-04-22T00:00:00.000Z',
        fetched_at_ms: 1,
      }],
      meta: {
        available_categories: [{ id: 'performance', label: 'Performance', count: 1 }],
        available_tags: [{ id: 'community', label: 'Community', count: 1 }],
        bootstrapping: false,
        returned_count: 1,
        has_more: false,
        next_offset: null,
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
    getCurrentAppPositionMock.mockRejectedValue(new Error('No GPS in tests'));
    joinPublicPlanMock.mockResolvedValue(buildPlan({ viewer_joined: true }));
    leavePublicPlanMock.mockResolvedValue(buildPlan());
    rejectPublicPlanMock.mockResolvedValue(undefined);
    removeEventFromItineraryMock.mockResolvedValue(undefined);
    reorderItineraryDayMock.mockImplementation(async () => []);
    createItineraryPlanMock.mockResolvedValue(buildPlan({ id: 'itinerary-plan' }));
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

  it('renders compact filter summaries in a two-row mobile layout with slimmer cards', async () => {
    const container = await renderHub();

    const whenButton = getButtonByText(container, 'When');
    const typesButton = getButtonByText(container, 'Types');
    const categoriesButton = getButtonByText(container, 'Categories');

    expect(whenButton.textContent).toContain('22 Apr-21 May');
    expect(typesButton.textContent).toContain('All');
    expect(categoriesButton.textContent).toContain('All');
    expect(categoriesButton.parentElement?.className).toContain('col-span-2');

    const eventCard = getButtonByText(container, 'Nudenight Life Drawing at Doodler');
    expect(eventCard.className).toContain('rounded-[20px]');
    expect(container.textContent).toContain('Sat, 25 Apr');
    expect(container.textContent).toContain('7pm to 9pm');

    const eventImage = container.querySelector('img[alt="Nudenight Life Drawing at Doodler"]');
    expect(eventImage?.className).toContain('h-20');
  });

  it('renders mobile filter drawers above the bottom nav with scrollable content and visible actions', async () => {
    const container = await renderHub();

    await click(getButtonByText(container, 'Types'));
    expectMobileFilterDrawerLayout('Types');
    await click(getButtonByText(document.body, 'Done'));

    await click(getButtonByText(container, 'Categories'));
    expectMobileFilterDrawerLayout('Categories');
    await click(getButtonByText(document.body, 'Done'));

    await unmountHub(container);
    const networkingContainer = await renderHub('networking');
    await click(getButtonByText(networkingContainer, 'Tags'));
    expectMobileFilterDrawerLayout('Tags');
  });

  it('restores official event results and scroll after returning from event detail', async () => {
    fetchOfficialEventsMock.mockResolvedValueOnce({
      data: [buildEvent(1), buildEvent(2)],
      meta: {
        available_categories: [{ id: 'performance', label: 'Performance', count: 2 }],
        available_tags: [{ id: 'community', label: 'Community', count: 2 }],
        bootstrapping: false,
        returned_count: 2,
        has_more: false,
        next_offset: null,
      },
    });
    const windowScrollToSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    const requestAnimationFrameSpy = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((callback: FrameRequestCallback) => {
        callback(0);
        return 0;
      });

    const firstContainer = await renderHub();
    expect(firstContainer.textContent).toContain('City Event 1');
    expect(firstContainer.textContent).toContain('City Event 2');

    const firstScroller = getHubScroller(firstContainer);
    Object.defineProperty(firstScroller, 'scrollHeight', {
      configurable: true,
      value: 1400,
    });
    firstScroller.scrollTop = 640;
    await click(getButtonByText(firstContainer, 'City Event 2'));
    await unmountHub(firstContainer);

    fetchOfficialEventsMock.mockImplementation(() => new Promise(() => {}));
    const secondContainer = await renderHub();
    const secondScroller = getHubScroller(secondContainer);

    expect(secondContainer.textContent).toContain('City Event 1');
    expect(secondContainer.textContent).toContain('City Event 2');
    expect(secondContainer.textContent).not.toContain('Loading nearby events');
    expect(fetchOfficialEventsMock).toHaveBeenCalled();
    expect(secondScroller.scrollTop).toBe(640);
    expect(windowScrollToSpy).not.toHaveBeenCalled();

    requestAnimationFrameSpy.mockRestore();
    windowScrollToSpy.mockRestore();
  });

  it("renders Networking between What's On and Plans with tag-only filters", async () => {
    fetchOfficialEventsMock.mockReset();
    fetchOfficialEventsMock.mockResolvedValue({
      data: [{
        id: 'foundersunion:founder-demo-night',
        source: 'foundersunion',
        source_label: 'The Founders Union',
        slug: 'founder-demo-night',
        title: 'Founder Demo Night',
        summary: 'Meet builders and investors.',
        description: 'Meet builders and investors.',
        image_url: '',
        hero_image_url: '',
        categories: ['The Founders Union'],
        tags: ['Building', 'Raising', 'Sydney'],
        dates: ['2026-04-25'],
        venue_name: 'Sydney Startup Hub',
        suburb: 'Sydney',
        regions: ['Sydney'],
        free_event: true,
        upcoming_date: '2026-04-25',
        upcoming_time: '6pm',
        event_type: ['Building'],
        source_url: 'https://luma.com/founder-demo-night',
        lat: null,
        lng: null,
        address: 'Sydney Startup Hub',
        location_additional_information: '',
        booking_url: 'https://luma.com/founder-demo-night',
        website_url: 'https://luma.com/founder-demo-night',
        contact_email: '',
        contact_phone: '',
        organiser: 'The Founders Union',
        dates_humanized: 'Sat 25 Apr 2026',
        accessibilities: [],
        refreshed_at: '2026-04-22T00:00:00.000Z',
        fetched_at_ms: 1,
      }],
      meta: {
        available_categories: [{ id: 'the-founders-union', label: 'The Founders Union', count: 1 }],
        available_tags: [{ id: 'building', label: 'Building', count: 1 }],
        bootstrapping: false,
        returned_count: 1,
        has_more: false,
        next_offset: null,
      },
    });

    const container = await renderHub('networking');

    const tabLabels = Array.from(container.querySelectorAll('button'))
      .slice(0, 3)
      .map((button) => button.textContent?.replace(/\s+/g, ' ').trim());
    expect(tabLabels).toEqual(["What's On", 'Networking', 'Plans']);
    expect(container.querySelector('#council-whats-on-select')).toBeNull();
    expect(hasButtonText(container, 'Sources')).toBe(false);
    expect(getButtonByText(container, 'Tags')).toBeTruthy();
    expect(container.textContent).toContain('Events');
    expect(container.textContent).toContain('My Network');
    expect(container.textContent).toContain('Founder Demo Night');
    expect(container.textContent).toContain('Upcoming networking');
    expect(fetchOfficialEventsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceGroup: 'networking',
        categories: [],
        tags: [],
        limit: 24,
      }),
    );
  });

  it('renders the council picker with City of Sydney as the native feed default', async () => {
    const onCouncilChange = vi.fn();
    const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    mountedHubs.push({ container, root });

    await act(async () => {
      root.render(
        <MemoryRouter>
          <VibeEventsHub
            eventTab="whatson"
            councilParam=""
            onEventTabChange={() => {}}
            onCouncilChange={onCouncilChange}
          />
        </MemoryRouter>,
      );
      await Promise.resolve();
    });
    await flushEffects();

    const select = container.querySelector<HTMLSelectElement>(
      '#council-whats-on-select',
    );
    expect(select).toBeTruthy();
    expect(select?.value).toBe('city-of-sydney');
    expect(select?.options[0]?.value).toBe('city-of-sydney');
    expect(select?.selectedOptions[0]?.textContent).toBe('City of Sydney');
    expect(container.querySelector('iframe')).toBeNull();
    expect(container.textContent).toContain('Nudenight Life Drawing at Doodler');
    expect(fetchOfficialEventsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        councilSlug: 'city-of-sydney',
      }),
    );

    await act(async () => {
      if (!select) throw new Error('Missing council selector.');
      select.value = 'city-of-sydney';
      select.dispatchEvent(new Event('change', { bubbles: true }));
      await Promise.resolve();
    });

    expect(onCouncilChange).toHaveBeenCalledWith('');
    expect(fetchOfficialEventsMock).toHaveBeenCalledTimes(2);
    expect(windowOpenSpy).not.toHaveBeenCalled();
    windowOpenSpy.mockRestore();
  });

  it('switches from City/Area to University events and sends the selected university', async () => {
    fetchOfficialEventUniversitiesMock.mockResolvedValue([
      {
        id: '5',
        name: 'University of New South Wales',
        shortname: 'UNSW',
        state: 'NSW',
        lat: -33.9173,
        lng: 151.2313,
        upcoming_count: 3,
      },
      {
        id: '19',
        name: 'Deakin University',
        shortname: 'Deakin',
        state: 'VIC',
        lat: -38.197,
        lng: 144.2952,
        upcoming_count: 2,
      },
    ]);

    const container = await renderHub();
    await flushEffects();
    await flushEffects();

    expect(container.textContent).toContain('City/Area');
    expect(container.textContent).not.toContain('LGA');
    expect(container.querySelector('#council-whats-on-select')).toBeTruthy();

    await click(getButtonByText(container, 'University'));
    await flushEffects();
    await flushEffects();

    const universitySelect = container.querySelector<HTMLSelectElement>(
      '#university-events-select',
    );
    expect(universitySelect).toBeTruthy();
    expect(universitySelect?.value).toBe('5');
    expect(container.querySelector('#council-whats-on-select')).toBeNull();
    expect(container.textContent).toContain('NSW · 3 upcoming');

    expect(fetchOfficialEventsMock.mock.calls.some(([params]) =>
      params.sourceGroup === 'campus' &&
      params.universityId === '5' &&
      params.councilSlug === undefined
    )).toBe(true);

    await act(async () => {
      if (!universitySelect) throw new Error('Missing university selector.');
      universitySelect.value = '19';
      universitySelect.dispatchEvent(new Event('change', { bubbles: true }));
      await Promise.resolve();
    });
    await flushEffects();
    await flushEffects();

    expect(fetchOfficialEventsMock.mock.calls.some(([params]) =>
      params.sourceGroup === 'campus' &&
      params.universityId === '19' &&
      params.councilSlug === undefined &&
      params.categories.length === 0 &&
      params.tags.length === 0
    )).toBe(true);
  });

  it('shows 24 events first and appends the next page when Show more is tapped', async () => {
    const firstPage = Array.from({ length: 24 }, (_value, index) =>
      buildEvent(index + 1),
    );
    const secondPage = Array.from({ length: 6 }, (_value, index) =>
      buildEvent(index + 25),
    );

    fetchOfficialEventsMock.mockReset();
    fetchOfficialEventsMock
      .mockResolvedValueOnce({
        data: firstPage,
        meta: {
          available_categories: [{ id: 'performance', label: 'Performance', count: 30 }],
          available_tags: [{ id: 'community', label: 'Community', count: 30 }],
          bootstrapping: false,
          total_candidates: 30,
          returned_count: 24,
          has_more: true,
          next_offset: 24,
        },
      })
      .mockResolvedValueOnce({
        data: secondPage,
        meta: {
          available_categories: [{ id: 'performance', label: 'Performance', count: 30 }],
          available_tags: [{ id: 'community', label: 'Community', count: 30 }],
          bootstrapping: false,
          total_candidates: 30,
          returned_count: 6,
          has_more: false,
          next_offset: null,
        },
      });

    const container = await renderHub();

    expect(container.textContent).toContain('City Event 1');
    expect(container.textContent).toContain('City Event 24');
    expect(container.textContent).not.toContain('City Event 25');
    expect(getButtonByText(container, 'Show more')).toBeTruthy();

    await click(getButtonByText(container, 'Show more'));
    await flushEffects();

    expect(container.textContent).toContain('City Event 25');
    expect(container.textContent).toContain('City Event 30');
    expect(container.textContent).not.toContain('Show more');
    expect(fetchOfficialEventsMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        limit: 24,
        offset: 24,
      }),
    );
  });

  it('keeps loaded pages after returning from event detail while refreshing the first page', async () => {
    const requestAnimationFrameSpy = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((callback: FrameRequestCallback) => {
        callback(0);
        return 0;
      });
    const firstPage = Array.from({ length: 24 }, (_value, index) =>
      buildEvent(index + 1),
    );
    const secondPage = Array.from({ length: 6 }, (_value, index) =>
      buildEvent(index + 25),
    );

    fetchOfficialEventsMock.mockReset();
    fetchOfficialEventsMock
      .mockResolvedValueOnce({
        data: firstPage,
        meta: {
          available_categories: [{ id: 'performance', label: 'Performance', count: 30 }],
          available_tags: [{ id: 'community', label: 'Community', count: 30 }],
          bootstrapping: false,
          total_candidates: 30,
          returned_count: 24,
          has_more: true,
          next_offset: 24,
        },
      })
      .mockResolvedValueOnce({
        data: secondPage,
        meta: {
          available_categories: [{ id: 'performance', label: 'Performance', count: 30 }],
          available_tags: [{ id: 'community', label: 'Community', count: 30 }],
          bootstrapping: false,
          total_candidates: 30,
          returned_count: 6,
          has_more: false,
          next_offset: null,
        },
      });

    const firstContainer = await renderHub();
    await click(getButtonByText(firstContainer, 'Show more'));
    await flushEffects();
    expect(firstContainer.textContent).toContain('City Event 30');

    const firstScroller = getHubScroller(firstContainer);
    Object.defineProperty(firstScroller, 'scrollHeight', {
      configurable: true,
      value: 2400,
    });
    firstScroller.scrollTop = 720;
    await click(getButtonByText(firstContainer, 'City Event 30'));
    await unmountHub(firstContainer);

    fetchOfficialEventsMock.mockReset();
    fetchOfficialEventsMock.mockResolvedValue({
      data: firstPage,
      meta: {
        available_categories: [{ id: 'performance', label: 'Performance', count: 30 }],
        available_tags: [{ id: 'community', label: 'Community', count: 30 }],
        bootstrapping: false,
        total_candidates: 30,
        returned_count: 24,
        has_more: true,
        next_offset: 24,
      },
    });

    const secondContainer = await renderHub();
    await flushEffects();
    const secondScroller = getHubScroller(secondContainer);

    expect(secondContainer.textContent).toContain('City Event 1');
    expect(secondContainer.textContent).toContain('City Event 30');
    expect(secondContainer.textContent).not.toContain('Loading nearby events');
    expect(secondContainer.textContent).not.toContain('Show more');
    expect(secondScroller.scrollTop).toBe(720);
    expect(fetchOfficialEventsMock).toHaveBeenCalledTimes(1);
    requestAnimationFrameSpy.mockRestore();
  });

  it('does not erase cached scroll when background refresh resolves before restore runs', async () => {
    const animationFrames = mockQueuedAnimationFrames();
    fetchOfficialEventsMock.mockResolvedValueOnce({
      data: [buildEvent(1), buildEvent(2)],
      meta: {
        available_categories: [{ id: 'performance', label: 'Performance', count: 2 }],
        available_tags: [{ id: 'community', label: 'Community', count: 2 }],
        bootstrapping: false,
        returned_count: 2,
        has_more: false,
        next_offset: null,
      },
    });

    const firstContainer = await renderHub();
    const firstScroller = getHubScroller(firstContainer);
    Object.defineProperty(firstScroller, 'scrollHeight', {
      configurable: true,
      value: 1600,
    });
    firstScroller.scrollTop = 680;
    await click(getButtonByText(firstContainer, 'City Event 2'));
    await unmountHub(firstContainer);

    fetchOfficialEventsMock.mockReset();
    fetchOfficialEventsMock.mockResolvedValue({
      data: [buildEvent(1), buildEvent(2)],
      meta: {
        available_categories: [{ id: 'performance', label: 'Performance', count: 2 }],
        available_tags: [{ id: 'community', label: 'Community', count: 2 }],
        bootstrapping: false,
        returned_count: 2,
        has_more: false,
        next_offset: null,
      },
    });

    const secondContainer = await renderHub();
    expect(getHubScroller(secondContainer).scrollTop).toBe(0);
    expect(window.sessionStorage.getItem('ghar_vibe_official_events_nav_cache_v2')).toContain('"scrollTop":680');

    await animationFrames.flush();
    await animationFrames.flush();
    expect(getHubScroller(secondContainer).scrollTop).toBe(680);
    animationFrames.spy.mockRestore();
  });

  it('falls back to the last opened event card when restored content height changes', async () => {
    const animationFrames = mockQueuedAnimationFrames();
    fetchOfficialEventsMock.mockResolvedValueOnce({
      data: [buildEvent(1), buildEvent(2)],
      meta: {
        available_categories: [{ id: 'performance', label: 'Performance', count: 2 }],
        available_tags: [{ id: 'community', label: 'Community', count: 2 }],
        bootstrapping: false,
        returned_count: 2,
        has_more: false,
        next_offset: null,
      },
    });

    const firstContainer = await renderHub();
    const firstScroller = getHubScroller(firstContainer);
    Object.defineProperty(firstScroller, 'scrollHeight', {
      configurable: true,
      value: 1800,
    });
    firstScroller.scrollTop = 640;
    await click(getButtonByText(firstContainer, 'City Event 2'));
    await unmountHub(firstContainer);

    fetchOfficialEventsMock.mockReset();
    fetchOfficialEventsMock.mockImplementation(() => new Promise(() => {}));
    const secondContainer = await renderHub();
    const secondScroller = getHubScroller(secondContainer);
    Object.defineProperty(secondScroller, 'scrollHeight', {
      configurable: true,
      value: 700,
    });
    const openedCard = secondContainer.querySelector('[data-official-event-key="cityofsydney:event-2"]');
    if (!(openedCard instanceof HTMLElement)) {
      throw new Error('Expected cached event card for fallback restore.');
    }
    Object.defineProperty(openedCard, 'offsetTop', {
      configurable: true,
      value: 920,
    });

    await animationFrames.flush();
    await animationFrames.flush();
    expect(secondScroller.scrollTop).toBe(904);
    animationFrames.spy.mockRestore();
  });

  it('resets the events list to the first page when filters change after loading more', async () => {
    fetchOfficialEventsMock.mockReset();
    fetchOfficialEventsMock
      .mockResolvedValueOnce({
        data: Array.from({ length: 24 }, (_value, index) =>
          buildEvent(index + 1),
        ),
        meta: {
          available_categories: [{ id: 'performance', label: 'Performance', count: 30 }],
          available_tags: [{ id: 'community', label: 'Community', count: 30 }],
          bootstrapping: false,
          total_candidates: 30,
          returned_count: 24,
          has_more: true,
          next_offset: 24,
        },
      })
      .mockResolvedValueOnce({
        data: Array.from({ length: 6 }, (_value, index) =>
          buildEvent(index + 25),
        ),
        meta: {
          available_categories: [{ id: 'performance', label: 'Performance', count: 30 }],
          available_tags: [{ id: 'community', label: 'Community', count: 30 }],
          bootstrapping: false,
          total_candidates: 30,
          returned_count: 6,
          has_more: false,
          next_offset: null,
        },
      })
      .mockResolvedValueOnce({
        data: [buildEvent(101), buildEvent(102)],
        meta: {
          available_categories: [{ id: 'performance', label: 'Performance', count: 2 }],
          available_tags: [{ id: 'community', label: 'Community', count: 2 }],
          bootstrapping: false,
          total_candidates: 2,
          returned_count: 2,
          has_more: false,
          next_offset: null,
        },
      });

    const container = await renderHub();

    await click(getButtonByText(container, 'Show more'));
    await flushEffects();
    expect(container.textContent).toContain('City Event 30');

    await click(getButtonByText(container, 'Categories'));
    await click(getButtonByText(document.body, 'Community'));
    await flushEffects();

    expect(container.textContent).toContain('City Event 101');
    expect(container.textContent).toContain('City Event 102');
    expect(container.textContent).not.toContain('City Event 30');
    expect(fetchOfficialEventsMock).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        categories: [],
        tags: ['community'],
        limit: 24,
      }),
    );
    expect(fetchOfficialEventsMock.mock.calls[2]?.[0]).not.toHaveProperty('offset');
  });

  it('shows selected facet labels in the compact filter summaries', async () => {
    const container = await renderHub();

    await click(getButtonByText(container, 'Types'));
    await click(getButtonByText(document.body, 'Performance'));
    await click(getButtonByText(document.body, 'Done'));
    expect(getButtonByText(container, 'Types').textContent).toContain('Performance');

    await click(getButtonByText(container, 'Categories'));
    await click(getButtonByText(document.body, 'Community'));
    await click(getButtonByText(document.body, 'Done'));
    expect(getButtonByText(container, 'Categories').textContent).toContain('Community');
  });

  it('renders pending custom plan invites with accept and reject actions', async () => {
    window.localStorage.setItem('ghar_email', 'receiver@example.com');
    fetchPublicPlansMock.mockResolvedValue([
      buildPlan({
        id: 'plan-private',
        event_slug: 'plan-private',
        title: 'House dinner',
        viewer_invited: true,
        viewer_joined: false,
        can_reject: true,
        can_comment: false,
      }),
    ]);

    const container = await renderHub('plans');
    await click(getButtonByText(container, 'My Plans'));
    await flushEffects();

    expect(container.textContent).toContain('You were invited');
    expect(container.textContent).toContain('Open Plan Thread');
    expect(container.textContent).not.toContain('Open Event');
    expect(getButtonByText(container, 'Accept Plan')).toBeTruthy();
    expect(getButtonByText(container, 'Reject Plan')).toBeTruthy();

    await click(getButtonByText(container, 'Accept Plan'));
    expect(joinPublicPlanMock).toHaveBeenCalledWith('plan-private', 'receiver@example.com');

    await click(getButtonByText(container, 'Reject Plan'));
    expect(rejectPublicPlanMock).toHaveBeenCalledWith('plan-private', 'receiver@example.com');
  });

  it('groups My Itinerary by day and supports same-day reorder and remove', async () => {
    window.localStorage.setItem('ghar_email', 'receiver@example.com');
    const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    const first = buildItineraryEvent({
      event_slug: 'event-1',
      event_key: 'cityofsydney:event-1',
      title: 'Morning market',
      order: 0,
      upcoming_time: '9am',
      lat: -33.873,
      lng: 151.206,
    });
    const second = buildItineraryEvent({
      event_slug: 'event-2',
      event_key: 'cityofsydney:event-2',
      title: 'Lunch meetup',
      order: 1,
      upcoming_time: '12pm',
      lat: -33.865,
      lng: 151.21,
    });
    const nextDay = buildItineraryEvent({
      event_slug: 'event-3',
      event_key: 'cityofsydney:event-3',
      title: 'Sunday gallery',
      event_day: '2026-04-26',
      dates_humanized: 'Sun 26 Apr 2026',
      order: 0,
    });
    fetchMyItineraryMock
      .mockResolvedValueOnce([first, second, nextDay])
      .mockResolvedValueOnce([first, nextDay]);
    reorderItineraryDayMock.mockResolvedValue([
      { ...second, order: 0 },
      { ...first, order: 1 },
      nextDay,
    ]);

    const container = await renderHub('plans');
    await click(getButtonByText(container, 'My Itinerary'));
    await flushEffects();

    expect(fetchMyItineraryMock).toHaveBeenCalledWith({
      email: 'receiver@example.com',
      appVariant: 'ghar',
    });
    expect(container.textContent).toContain('Saturday 25 April 2026');
    expect(container.textContent).toContain('Sunday 26 April 2026');
    expect(container.textContent).toContain('Morning market');
    expect(container.textContent).toContain('Lunch meetup');
    expect(container.textContent).toContain('Sunday gallery');
    expect(container.textContent).toContain('Trip Route');
    expect(container.textContent).toContain('Route map');
    expect(container.textContent).toContain('2 stops · Sydney');
    expect(getButtonByText(container, 'Create Itinerary')).toBeTruthy();
    expect(getButtonByText(container, 'Add Stop')).toBeTruthy();
    expect(getButtonsByText(container, 'Add Stop')).toHaveLength(4);
    expect(container.querySelector('[data-testid="itinerary-map"]')).toBeTruthy();
    expect(container.querySelectorAll('[data-testid="marker"]')).toHaveLength(2);
    expect(container.querySelector('[data-testid="source-itinerary-route-line"]')).toBeTruthy();
    const secondStopMarker = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === '#2',
    );
    expect(secondStopMarker?.className).toContain('rounded-full');
    expect(fetchItineraryWalkingRouteMock).toHaveBeenCalledWith({
      email: 'receiver@example.com',
      eventDay: '2026-04-25',
      stops: [
        { event_key: 'cityofsydney:event-1', lat: -33.873, lng: 151.206 },
        { event_key: 'cityofsydney:event-2', lat: -33.865, lng: 151.21 },
      ],
      appVariant: 'ghar',
    });
    expect(getButtonByText(container, 'Directions')).toBeTruthy();

    await click(getButtonByText(container, 'Directions'));
    expect(windowOpenSpy).toHaveBeenCalledWith(
      expect.stringContaining('https://www.google.com/maps/search/'),
      '_blank',
      'noopener,noreferrer',
    );

    await click(getButtonByText(container, 'Move Down'));
    expect(reorderItineraryDayMock).toHaveBeenCalledWith({
      email: 'receiver@example.com',
      eventDay: '2026-04-25',
      eventKeys: ['cityofsydney:event-2', 'cityofsydney:event-1'],
      appVariant: 'ghar',
    });

    await click(getButtonByText(container, 'Delete'));
    expect(removeEventFromItineraryMock).toHaveBeenCalledWith({
      email: 'receiver@example.com',
      eventSource: 'cityofsydney',
      eventSlug: 'event-2',
      appVariant: 'ghar',
    });
    await flushEffects();
    expect(container.textContent).not.toContain('Lunch meetup');
    expect(container.textContent).toContain('Morning market');
    windowOpenSpy.mockRestore();
  });

  it('adds a bottom Add Stop action per itinerary day and prefills that day', async () => {
    window.localStorage.setItem('ghar_email', 'receiver@example.com');
    fetchMyItineraryMock.mockResolvedValue([
      buildItineraryEvent({
        event_slug: 'event-1',
        event_key: 'cityofsydney:event-1',
        title: 'Morning market',
        event_day: '2026-04-25',
        order: 0,
      }),
      buildItineraryEvent({
        event_slug: 'event-2',
        event_key: 'cityofsydney:event-2',
        title: 'Sunday gallery',
        event_day: '2026-04-26',
        dates_humanized: 'Sun 26 Apr 2026',
        order: 0,
      }),
    ]);

    const container = await renderHub('plans');
    await click(getButtonByText(container, 'My Itinerary'));
    await flushEffects();

    const addStopButtons = getButtonsByText(container, 'Add Stop');
    expect(addStopButtons).toHaveLength(4);

    await click(addStopButtons[addStopButtons.length - 1]);
    await flushEffects();

    expect(document.body.textContent).toContain('Add Itinerary Stop');
    expect((document.body.querySelector('input[type="date"]') as HTMLInputElement).value)
      .toBe('2026-04-26');
  });

  it('hides past itinerary days by default and toggles them on demand', async () => {
    window.localStorage.setItem('ghar_email', 'receiver@example.com');
    fetchMyItineraryMock.mockResolvedValue([
      buildItineraryEvent({
        event_slug: 'past-event',
        event_key: 'cityofsydney:past-event',
        title: 'Past breakfast',
        event_day: '2026-04-21',
        dates_humanized: 'Tue 21 Apr 2026',
      }),
      buildItineraryEvent({
        event_slug: 'future-event',
        event_key: 'cityofsydney:future-event',
        title: 'Future lunch',
        event_day: '2026-04-25',
      }),
    ]);

    const container = await renderHub('plans');
    await click(getButtonByText(container, 'My Itinerary'));
    await flushEffects();

    expect(container.textContent).toContain('Future lunch');
    expect(container.textContent).not.toContain('Past breakfast');
    expect(getButtonByText(container, 'Show Past Itineraries (1)')).toBeTruthy();

    await click(getButtonByText(container, 'Show Past Itineraries'));
    await flushEffects();

    expect(container.textContent).toContain('Past Itineraries');
    expect(container.textContent).toContain('Past breakfast');
    expect(getButtonByText(container, 'Hide Past Itineraries')).toBeTruthy();

    await click(getButtonByText(container, 'Hide Past Itineraries'));
    await flushEffects();

    expect(container.textContent).not.toContain('Past breakfast');
  });

  it('shows an upcoming-empty note when only past itinerary days are hidden', async () => {
    window.localStorage.setItem('ghar_email', 'receiver@example.com');
    fetchMyItineraryMock.mockResolvedValue([
      buildItineraryEvent({
        event_slug: 'past-event',
        event_key: 'cityofsydney:past-event',
        title: 'Past breakfast',
        event_day: '2026-04-21',
        dates_humanized: 'Tue 21 Apr 2026',
      }),
    ]);

    const container = await renderHub('plans');
    await click(getButtonByText(container, 'My Itinerary'));
    await flushEffects();

    expect(container.textContent).not.toContain('Past breakfast');
    expect(container.textContent).toContain('No upcoming itinerary stops');

    await click(getButtonByText(container, 'Show Past Itineraries'));
    await flushEffects();

    expect(container.textContent).toContain('Past breakfast');
  });

  it('renders SETU China itinerary route labels bilingually', async () => {
    appConfigMock.displayName = '留澳助手 AU';
    appConfigMock.variant = 'setu_china';
    window.localStorage.setItem('ghar_email', 'receiver@example.com');
    fetchMyItineraryMock.mockResolvedValue([
      buildItineraryEvent({
        title: 'Rainforest exhibition',
        lat: -33.864,
        lng: 151.216,
      }),
      buildItineraryEvent({
        event_slug: 'old-stop',
        event_key: 'cityofsydney:old-stop',
        title: 'Old stop',
        event_day: '2026-04-21',
        dates_humanized: 'Tue 21 Apr 2026',
      }),
    ]);

    const container = await renderHub('plans');
    await click(getButtonByText(container, 'My Itinerary'));
    await flushEffects();

    expect(container.textContent).toContain('我的行程');
    expect(container.textContent).toContain('路线行程');
    expect(container.textContent).toContain('路线地图');
    expect(container.textContent).toContain('1 站');
    expect(container.textContent).toContain('View Event 活动');
    expect(container.textContent).toContain('Directions 导航');
    expect(container.textContent).toContain('Share 分享');
    expect(container.textContent).toContain('Move Up 上移');
    expect(container.textContent).toContain('Move Down 下移');
    expect(container.textContent).toContain('Delete 删除');
    expect(container.textContent).toContain('Add Stop 添加');
    expect(container.textContent).toContain('Show Past Itineraries 显示过往行程 (1)');
    expect(container.textContent).not.toContain('Old stop');
    expect(container.querySelector('[data-testid="itinerary-map"]')).toBeTruthy();
  });

  it('creates a public plan from an itinerary day', async () => {
    window.localStorage.setItem('ghar_email', 'receiver@example.com');
    fetchMyItineraryMock.mockResolvedValue([
      buildItineraryEvent({
        event_slug: 'event-1',
        event_key: 'cityofsydney:event-1',
        title: 'Morning market',
        venue_name: 'Town Hall',
        order: 0,
        lat: -33.873,
        lng: 151.206,
      }),
      buildItineraryEvent({
        event_slug: 'event-2',
        event_key: 'cityofsydney:event-2',
        title: 'Lunch meetup',
        order: 1,
        lat: -33.865,
        lng: 151.21,
      }),
    ]);

    const container = await renderHub('plans');
    await click(getButtonByText(container, 'My Itinerary'));
    await flushEffects();
    await click(getButtonByText(container, 'Create Plan'));
    await flushEffects();

    const createButtons = Array.from(document.body.querySelectorAll('button')).filter((button) =>
      button.textContent?.replace(/\s+/g, ' ').trim().toLowerCase().includes('create plan')
    );
    await click(createButtons[createButtons.length - 1]);
    await flushEffects();

    expect(createItineraryPlanMock).toHaveBeenCalledWith(expect.objectContaining({
      email: 'receiver@example.com',
      appVariant: 'ghar',
      eventDay: '2026-04-25',
      visibility: 'public',
      meeting_point: 'Town Hall',
    }));
    expect(fetchPublicPlansMock).toHaveBeenCalledWith({
      viewerEmail: 'receiver@example.com',
      scope: 'my',
      appVariant: undefined,
    });
  });

  it('creates an itinerary from a Google Maps link and imports clean location details', async () => {
    window.localStorage.setItem('ghar_email', 'receiver@example.com');
    const suppliedGoogleMapsLink = 'https://maps.app.goo.gl/DgkZadQpk6igAm387?g_st=ic';
    const customStop = buildItineraryEvent({
      kind: 'custom_stop',
      event_source: 'custom_stop',
      event_slug: 'custom-1',
      event_key: 'custom_stop:custom-1',
      title: 'Black Diamondz Property Concierge',
      event_day: '2026-04-25',
      upcoming_time: '10AM',
      venue_name: 'Black Diamondz Property Concierge',
      address: 'World Square, Suite 31, Level 2/650 George St, Sydney NSW 2000',
      maps_url: suppliedGoogleMapsLink,
      lat: -33.8773,
      lng: 151.2073,
    });
    fetchMyItineraryMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([customStop]);
    addCustomItineraryStopMock.mockResolvedValue(customStop);
    resolveItineraryLocationFromMapUrlMock.mockResolvedValue({
      title: 'Black Diamondz Property Concierge',
      place_name: 'Black Diamondz Property Concierge',
      venue_name: 'Black Diamondz Property Concierge',
      address: 'World Square, Suite 31, Level 2/650 George St, Sydney NSW 2000',
      maps_url: suppliedGoogleMapsLink,
      lat: -33.8773,
      lng: 151.2073,
    });

    const container = await renderHub('plans');
    await click(getButtonByText(container, 'My Itinerary'));
    await flushEffects();
    await click(getButtonByText(container, 'Create Itinerary'));
    await flushEffects();

    await setFieldValue(document.body.querySelector('input[type="date"]'), '2026-04-25');
    await setFieldValue(document.body.querySelector('input[placeholder="e.g. 10AM TO 11AM"]'), '10AM');
    await setFieldValue(document.body.querySelector('input[placeholder="https://maps.app.goo.gl/..."]'), suppliedGoogleMapsLink);
    const drawerScrollBody = document.body.querySelector('[data-keyboard-aware-scroll]');
    expect(drawerScrollBody).toBeTruthy();
    const drawerContent = drawerScrollBody?.closest('[data-slot="drawer-content"]') as HTMLElement | null;
    expect(drawerContent?.getAttribute('style')).toContain('app-bottom-nav-clearance');
    expect(drawerContent?.getAttribute('style')).toContain('app-keyboard-inset');
    const createItineraryButtons = getButtonsByText(document.body, 'Create Itinerary');
    expect(drawerScrollBody?.contains(createItineraryButtons[createItineraryButtons.length - 1])).toBe(false);

    await click(getButtonByText(document.body, 'Fetch'));
    await flushEffects();

    expect(resolveItineraryLocationFromMapUrlMock).toHaveBeenCalledWith({
      email: 'receiver@example.com',
      appVariant: 'ghar',
      title: '',
      venue_name: '',
      address: '',
      maps_url: suppliedGoogleMapsLink,
      lat: null,
      lng: null,
    });
    expect((document.body.querySelector('input[placeholder="e.g. Museum visit"]') as HTMLInputElement).value)
      .toBe('Black Diamondz Property Concierge');
    expect((document.body.querySelector('input[placeholder="Place or venue"]') as HTMLInputElement).value)
      .toBe('Black Diamondz Property Concierge');
    expect((document.body.querySelector('input[placeholder="Street address"]') as HTMLInputElement).value)
      .toBe('World Square, Suite 31, Level 2/650 George St, Sydney NSW 2000');
    const coordinateInputs = Array.from(document.body.querySelectorAll('input[inputmode="decimal"]')) as HTMLInputElement[];
    expect(coordinateInputs[0].value).toBe('-33.8773');
    expect(coordinateInputs[1].value).toBe('151.2073');

    const createButtons = getButtonsByText(document.body, 'Create Itinerary');
    await click(createButtons[createButtons.length - 1]);
    await flushEffects();

    expect(addCustomItineraryStopMock).toHaveBeenCalledWith({
      email: 'receiver@example.com',
      appVariant: 'ghar',
      stop: expect.objectContaining({
        title: 'Black Diamondz Property Concierge',
        event_day: '2026-04-25',
        upcoming_time: '10AM',
        venue_name: 'Black Diamondz Property Concierge',
        address: 'World Square, Suite 31, Level 2/650 George St, Sydney NSW 2000',
        maps_url: suppliedGoogleMapsLink,
        lat: -33.8773,
        lng: 151.2073,
      }),
    });
    expect(container.textContent).toContain('Black Diamondz Property Concierge');
  });

  it('refreshes My Itinerary on foreground so shared-account changes appear across apps', async () => {
    appConfigMock.variant = 'burb_mate';
    window.localStorage.setItem('ghar_email', 'receiver@example.com');
    const sharedEvent = buildItineraryEvent({
      event_slug: 'china-shared-event',
      event_key: 'cityofsydney:china-shared-event',
      title: 'China shared event',
      lat: -33.864,
      lng: 151.216,
    });
    fetchMyItineraryMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([sharedEvent]);

    const container = await renderHub('plans');
    await click(getButtonByText(container, 'My Itinerary'));
    await flushEffects();

    expect(container.textContent).toContain('No stops in your itinerary yet');
    expect(container.querySelector('[data-testid="itinerary-empty-map"]')).toBeTruthy();

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    });
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
      await Promise.resolve();
    });
    await flushEffects();

    expect(fetchMyItineraryMock).toHaveBeenNthCalledWith(1, {
      email: 'receiver@example.com',
      appVariant: 'burb_mate',
    });
    expect(fetchMyItineraryMock).toHaveBeenNthCalledWith(2, {
      email: 'receiver@example.com',
      appVariant: 'burb_mate',
    });
    expect(container.textContent).toContain('China shared event');
    expect(container.querySelector('[data-testid="itinerary-map"]')).toBeTruthy();
  });

  it('shows itinerary plan spot counts and suppresses legacy route notes', async () => {
    appConfigMock.variant = 'setu_china';
    fetchPublicPlansMock.mockResolvedValue([
      buildPlan({
        id: 'plan-itinerary',
        visibility: 'public',
        source_type: 'itinerary',
        event_source: 'itinerary',
        event_slug: 'plan-itinerary',
        title: '21 Jun 2026 itinerary',
        note: '3 stop route from my itinerary.',
        meeting_point: 'Town Hall',
        source_event: {
          id: 'itinerary:plan-itinerary',
          title: '21 Jun 2026 itinerary',
          summary: '',
          url: '',
          image_url: '',
          booking_url: '',
          venue_name: 'Town Hall',
          suburb: 'Sydney',
          dates_humanized: '2026-06-21',
        },
        itinerary_stops: [
          buildItineraryEvent({ event_key: 'cityofsydney:event-1' }),
          buildItineraryEvent({ event_key: 'cityofsydney:event-2' }),
          buildItineraryEvent({ event_key: 'cityofsydney:event-3' }),
        ],
      }),
    ]);

    const container = await renderHub('plans');

    expect(container.textContent).toContain('3 spots · 3 个地点');
    expect(container.textContent).not.toContain('3 stop route from my itinerary.');
  });

  it('keeps the official event route for official-event plan cards', async () => {
    window.localStorage.setItem('ghar_email', 'receiver@example.com');
    fetchPublicPlansMock.mockResolvedValue([
      buildPlan({
        id: 'plan-official',
        visibility: 'public',
        source_type: 'official_event',
        event_source: 'cityofsydney',
        event_slug: 'nudenight-life-drawing',
        source_event: {
          id: 'cityofsydney:nudenight-life-drawing',
          title: 'Nudenight Life Drawing at Doodler',
          summary: '',
          url: 'https://whatson.cityofsydney.nsw.gov.au/events/nudenight-life-drawing',
          image_url: '',
          booking_url: '',
          venue_name: 'Doodler',
          suburb: 'Marrickville',
          dates_humanized: 'Sat 25 Apr 2026',
        },
      }),
    ]);

    const container = await renderHub('plans');

    expect(container.textContent).toContain('Open Event');
    expect(container.textContent).not.toContain('Open Plan Thread');
  });
});
