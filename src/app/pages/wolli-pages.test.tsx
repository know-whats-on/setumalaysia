// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Browser } from '@capacitor/browser';
import {
  createRentalEntry,
  deleteRentalEntry,
  fetchCityGuides,
  fetchOfficialEvents,
  fetchOfficialNews,
  fetchRentalHistory,
  updateRentalEntry,
} from '../lib/api';
import { BAYSIDE_WARD_BOUNDARY_URL } from '../lib/wolli-content';
import { getWolliSuburbStatsBySlug } from '../lib/wolli-suburb-stats';
import { WolliHomePage, WolliProfilePage, WolliResourcesPage, WolliSuburbStatsPage, WolliVibePage } from './wolli-pages';

const appConfigState = vi.hoisted(() => ({
  config: {
    variant: 'wheres_wolli',
    displayName: "Where's Wolli",
    assistantName: 'Wolli',
    defaultCouncilSlug: 'bayside-council',
    showOfficialEventsFeature: true,
    launchArt: {
      headerBg: '/wolli-home-hero.png',
      mascot: '/wolli-mascot.png',
    },
  },
}));

const gharDataState = vi.hoisted(() => ({
  value: {
    banners: [] as Array<{
      id: string;
      url: string;
      link?: string;
      app_variant?: 'all' | 'burb_mate' | 'ghar' | 'setu_china' | 'wheres_wolli';
      placement?: 'noticeboard' | 'official_events';
      position?: number;
    }>,
    bulletins: [],
  },
}));

vi.mock('../lib/app-config', () => ({
  APP_CONFIG: appConfigState.config,
}));

vi.mock('../lib/app-variant', () => ({
  APP_VARIANT: 'wheres_wolli',
}));

vi.mock('../lib/api', () => ({
  createRentalEntry: vi.fn(),
  deleteRentalEntry: vi.fn(),
  fetchCityGuides: vi.fn(),
  fetchOfficialEvents: vi.fn(),
  fetchOfficialNews: vi.fn(),
  fetchRentalHistory: vi.fn(),
  updateRentalEntry: vi.fn(),
}));

vi.mock('@capacitor/browser', () => ({
  Browser: {
    open: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../components/layout', () => ({
  useGharData: () => gharDataState.value,
}));

vi.mock('../components/vibe-events-hub', () => ({
  VibeEventsHub: ({ councilParam, eventTab }: { councilParam?: string; eventTab: string }) => (
    <div data-testid="events-hub">{`${eventTab}:${councilParam}`}</div>
  ),
}));

vi.mock('../components/city-guides-hub', () => ({
  CityGuidesHub: ({
    cityParam,
    guideParam,
  }: {
    cityParam: string;
    guideParam: string;
  }) => <div data-testid="city-guides-hub">{`${cityParam}:${guideParam}`}</div>,
}));

type MountedComponent = {
  container: HTMLDivElement;
  root: Root;
};

const mountedComponents: MountedComponent[] = [];

function renderRoute(path: string, element: React.ReactElement) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  mountedComponents.push({ container, root });

  act(() => {
    root.render(
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/dashboard" element={element} />
          <Route path="/profile" element={element} />
          <Route path="/setu" element={element} />
          <Route path="/suburb-stats" element={element} />
          <Route path="/vibe" element={element} />
        </Routes>
      </MemoryRouter>,
    );
  });

  return container;
}

async function flushPromises() {
  for (let index = 0; index < 6; index += 1) {
    await act(async () => {
      await Promise.resolve();
    });
  }
}

function clickButtonByText(container: ParentNode, text: string) {
  const button = Array.from(container.querySelectorAll('button')).find((item) => item.textContent?.includes(text));
  expect(button).toBeTruthy();
  act(() => {
    button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  return button as HTMLButtonElement;
}

function changeField(field: HTMLInputElement | HTMLTextAreaElement, value: string) {
  act(() => {
    const prototype = field instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const valueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
    valueSetter?.call(field, value);
    field.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

function changeSelect(field: HTMLSelectElement, value: string) {
  act(() => {
    const valueSetter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set;
    valueSetter?.call(field, value);
    field.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  gharDataState.value = { banners: [], bulletins: [] };
  Object.defineProperty(globalThis, 'Image', {
    writable: true,
    value: class {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;

      set src(_value: string) {
        queueMicrotask(() => this.onload?.());
      }
    },
  });
  vi.mocked(fetchOfficialNews).mockResolvedValue({
    data: [
      {
        source: 'bayside',
        slug: 'news-one',
        title: 'Bayside update',
        source_url: 'https://www.bayside.nsw.gov.au/your-council/latest-news/news-one',
      },
    ],
    meta: { source: 'bayside' },
  });
  vi.mocked(fetchOfficialEvents).mockResolvedValue({
    data: [
      {
        id: 'event-one',
        source: 'bayside',
        source_label: 'Bayside Council',
        slug: 'event-one',
        title: 'Bayside community day',
        summary: 'A local event.',
        description: '',
        image_url: '',
        hero_image_url: '',
        categories: [],
        tags: [],
        dates: [],
        venue_name: 'Bayside venue',
        suburb: 'Rockdale',
        regions: [],
        free_event: true,
        upcoming_date: '',
        upcoming_time: '',
        event_type: [],
        source_url: 'https://www.bayside.nsw.gov.au/whats-on/event-one',
        lat: null,
        lng: null,
        address: '',
        location_additional_information: '',
        booking_url: '',
        website_url: '',
        contact_email: '',
        contact_phone: '',
        organiser: '',
        dates_humanized: 'This week',
        accessibilities: [],
        refreshed_at: '',
      },
    ],
    meta: { available_categories: [], available_tags: [] },
  });
  vi.mocked(fetchCityGuides).mockResolvedValue([
    {
      id: 'guide-one',
      slug: 'sydney-guide',
      city: 'Sydney',
      city_slug: 'sydney',
      state: 'NSW',
      title: 'Sydney starter guide',
      cover_image_url: '',
      intro: 'Guide intro.',
      app_variant: 'all',
      position: 1,
      created_at: '',
      updated_at: '',
      places: [],
    },
  ]);
  vi.mocked(fetchRentalHistory).mockResolvedValue([]);
  vi.mocked(createRentalEntry).mockResolvedValue({
    id: 'created-entry',
  });
  vi.mocked(updateRentalEntry).mockResolvedValue({
    id: 'updated-entry',
  });
  vi.mocked(deleteRentalEntry).mockResolvedValue({});
});

afterEach(() => {
  for (const mounted of mountedComponents.splice(0)) {
    act(() => mounted.root.unmount());
    mounted.container.remove();
  }
  vi.clearAllMocks();
  localStorage.clear();
  vi.mocked(Browser.open).mockClear();
});

describe('Where’s Wolli pages', () => {
  it('renders the SETU-style home controls, map CTA, event rail, and Sydney guides', async () => {
    const container = renderRoute('/dashboard', <WolliHomePage />);

    await flushPromises();

    expect(container.textContent).toContain("Where's Wolli");
    expect(container.textContent).toContain('News & alerts');
    expect(container.textContent).toContain("What's on");
    expect(container.textContent).toContain('Play Games');
    expect(container.textContent).toContain('Resources');
    expect(container.textContent).toContain('Open Map');
    expect(container.textContent).toContain('Bayside Council Wards & LGA');
    expect(container.textContent).toContain('Bayside community day');
    expect(container.textContent).toContain('Sydney starter guide');
    const heroBackground = container.querySelector('img[src="/wolli-home-hero.png"]') as HTMLImageElement | null;
    expect(heroBackground).toBeTruthy();
    expect(heroBackground?.className).not.toContain('wolli-drift');
    expect(heroBackground?.getAttribute('style') || '').not.toContain('wolliHeroDrift');
    const heroMascot = container.querySelector('img[src="/wolli-mascot.png"]') as HTMLImageElement | null;
    expect(heroMascot?.className).toContain('w-[52%]');
    expect(heroMascot?.className).toContain('max-w-[260px]');
    expect(heroMascot?.className).toContain('sm:w-[36%]');
    expect(heroMascot?.className).toContain('sm:max-w-[360px]');
    expect(heroMascot?.getAttribute('style') || '').toContain('wolliHeroFloat');
    expect(vi.mocked(fetchCityGuides)).toHaveBeenCalledWith({ city: 'sydney', appVariant: 'all' });
    expect(vi.mocked(fetchOfficialEvents)).toHaveBeenCalledWith(expect.objectContaining({ councilSlug: 'city-of-sydney', limit: 16 }));
    expect(vi.mocked(fetchOfficialEvents)).toHaveBeenCalledWith(expect.objectContaining({ councilSlug: 'bayside-council', limit: 16 }));
  });

  it('opens Explore What’s On with the City of Sydney event hub by default', async () => {
    const container = renderRoute('/vibe', <WolliVibePage />);

    await flushPromises();

    expect(container.textContent).toContain("What's On");
    expect(container.querySelector('[data-testid="events-hub"]')?.textContent).toBe('whatson:city-of-sydney');
  });

  it('supports Sydney guide deep links in Explore', async () => {
    const container = renderRoute('/vibe?section=guides&city=sydney&guide=sydney-guide', <WolliVibePage />);

    await flushPromises();

    expect(container.textContent).toContain('Sydney Guides');
    expect(container.querySelector('[data-testid="city-guides-hub"]')?.textContent).toBe('sydney:sydney-guide');
  });

  it('renders noticeboard banners on Wolli News without official-events promo banners', async () => {
    gharDataState.value = {
      banners: [
        {
          id: 'curated-mechelle-bounpraseuth-sou-sou-2026',
          url: 'https://example.com/mechelle-banner.gif',
          link: '/events/artgallerynsw/mechelle-bounpraseuth-sou-sou-2026',
          app_variant: 'all',
          placement: 'noticeboard',
          position: -10360,
        },
        {
          id: 'official-events-only',
          url: 'https://example.com/official-events-banner.png',
          link: '/events/cityofsydney/official-events-only',
          app_variant: 'all',
          placement: 'official_events',
          position: -20000,
        },
      ],
      bulletins: [],
    };

    const container = renderRoute('/vibe?section=alerts', <WolliVibePage />);

    await flushPromises();

    expect(container.textContent).toContain('Latest News');
    expect(container.querySelector('img[src="https://example.com/mechelle-banner.gif"]')).toBeTruthy();
    expect(container.querySelector('img[src="https://example.com/official-events-banner.png"]')).toBeNull();
  });

  it('renders Wolli Me as a timeline-first profile and supports timeline deep links', async () => {
    localStorage.setItem('ghar_first_name', 'Rushi');
    localStorage.setItem('ghar_email', 'rushi@example.com');
    vi.mocked(fetchRentalHistory).mockResolvedValue([
      {
        id: 'home-current',
        email: 'rushi@example.com',
        address: '1 Wolli Creek Road',
        display_address: '1 Wolli Creek Road',
        unit_number: '',
        building_id: '',
        suburb: 'Wolli Creek',
        postcode: '2205',
        state: 'NSW',
        start_date: '2026-01-10',
        end_date: '',
        is_current: true,
        landlord_name: '',
        landlord_contact: '',
        monthly_rent: null,
        review_category: null,
        review_text: 'Close to the station.',
        review_rating: null,
        created_at: '',
      },
    ]);

    const container = renderRoute('/profile?tab=timeline', <WolliProfilePage onLogout={vi.fn()} />);

    await flushPromises();

    expect(fetchRentalHistory).toHaveBeenCalledWith('rushi@example.com');
    expect(container.textContent).toContain('My Timeline');
    expect(container.textContent).toContain('Homes and local notes');
    expect(container.textContent).toContain('1 Wolli Creek Road');
    expect(container.textContent).toContain('Current');
    expect(container.textContent).toContain('10 Jan 2026 - now');
    expect(container.textContent).toContain('Close to the station.');
    expect(container.textContent).not.toContain('Keep moving in Wolli');
    expect(container.textContent).not.toContain('Bayside setup checklist');
  });

  it('creates, edits, and deletes Wolli timeline entries through the existing timeline APIs', async () => {
    localStorage.setItem('ghar_email', 'rushi@example.com');
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.mocked(fetchRentalHistory).mockResolvedValue([
      {
        id: 'home-current',
        email: 'rushi@example.com',
        address: '1 Wolli Creek Road',
        display_address: '1 Wolli Creek Road',
        unit_number: '',
        building_id: '',
        suburb: 'Wolli Creek',
        postcode: '2205',
        state: 'NSW',
        start_date: '2026-01-10',
        end_date: '',
        is_current: true,
        landlord_name: '',
        landlord_contact: '',
        monthly_rent: null,
        review_category: null,
        review_text: '',
        review_rating: null,
        created_at: '',
      },
    ]);

    const container = renderRoute('/profile', <WolliProfilePage onLogout={vi.fn()} />);
    await flushPromises();

    clickButtonByText(container, 'Add home');
    changeField(container.querySelector('input[placeholder="Apartment, street, or home address"]') as HTMLInputElement, '2 Bay Street');
    changeField(container.querySelector('input[placeholder="Wolli Creek"]') as HTMLInputElement, 'Rockdale');
    changeField(container.querySelector('input[placeholder="2205"]') as HTMLInputElement, '2216');
    changeField(container.querySelector('input[type="date"]') as HTMLInputElement, '2026-02-01');
    changeField(container.querySelector('textarea') as HTMLTextAreaElement, 'Remember bin night.');
    clickButtonByText(container, 'Add to timeline');
    await flushPromises();

    expect(createRentalEntry).toHaveBeenCalledWith(expect.objectContaining({
      email: 'rushi@example.com',
      address: '2 Bay Street',
      display_address: '2 Bay Street',
      suburb: 'Rockdale',
      postcode: '2216',
      start_date: '2026-02-01',
      is_current: false,
      review_text: 'Remember bin night.',
    }));

    clickButtonByText(container, 'Edit');
    changeField(container.querySelector('input[placeholder="Apartment, street, or home address"]') as HTMLInputElement, '3 Bay Street');
    clickButtonByText(container, 'Save changes');
    await flushPromises();

    expect(updateRentalEntry).toHaveBeenCalledWith('home-current', expect.objectContaining({
      address: '3 Bay Street',
    }));

    clickButtonByText(container, 'Delete');
    await flushPromises();

    expect(confirmSpy).toHaveBeenCalled();
    expect(deleteRentalEntry).toHaveBeenCalledWith('rushi@example.com', 'home-current');
    confirmSpy.mockRestore();
  });

  it('shows the Bayside ward boundary lookup in Wolli Resources and opens it in app', async () => {
    const container = renderRoute('/setu', <WolliResourcesPage />);

    clickButtonByText(container, 'Boundaries & wards');

    expect(container.textContent).toContain('Boundaries & wards');
    expect(Browser.open).toHaveBeenCalledWith({ url: BAYSIDE_WARD_BOUNDARY_URL });
  });

  it('links from Wolli Resources to suburb stats', () => {
    const container = renderRoute('/setu', <WolliResourcesPage />);
    const statsLink = Array.from(container.querySelectorAll('a')).find((link) => link.textContent?.includes('Suburb stats'));

    expect(statsLink?.getAttribute('href')).toBe('/suburb-stats');
    expect(container.textContent).toContain('Select a Bayside suburb and explore its diversity mix.');
  });

  it('shows the default Wolli suburb diversity mix with all non-zero countries', () => {
    const container = renderRoute('/suburb-stats', <WolliSuburbStatsPage />);
    const wolliStats = getWolliSuburbStatsBySlug('wolli-creek');
    const rows = Array.from(container.querySelectorAll('[data-testid="wolli-country-row"]'));

    expect(container.textContent).toContain('Wolli Creek has 7,512 residents');
    expect(container.textContent).toContain('7,512 Total');
    expect(container.textContent).toContain('2,054 Locals');
    expect(container.textContent).toContain('5,458 Internationals');
    expect(container.textContent).toContain("Wolli Creek's diversity mix is below:");
    expect(container.textContent).not.toContain('source table');
    expect(rows).toHaveLength(wolliStats.mixes.all.length);
    expect(rows[0].textContent).toContain('China');
    expect(rows[0].textContent).toContain('2,151');
    expect(rows[1].textContent).toContain('Mongolia');
  });

  it('switches the Wolli suburb diversity mix between Locals and Internationals', () => {
    const container = renderRoute('/suburb-stats', <WolliSuburbStatsPage />);
    const wolliStats = getWolliSuburbStatsBySlug('wolli-creek');

    clickButtonByText(container, 'Locals');

    let rows = Array.from(container.querySelectorAll('[data-testid="wolli-country-row"]'));
    expect(container.textContent).toContain('Showing 70 non-zero countries for Locals.');
    expect(rows).toHaveLength(wolliStats.mixes.locals.length);
    expect(rows[0].textContent).toContain('China');
    expect(rows[0].textContent).toContain('492');
    expect(rows[1].textContent).toContain('Hong Kong (SAR of China)');
    expect(rows[1].textContent).toContain('162');

    clickButtonByText(container, 'Internationals');

    rows = Array.from(container.querySelectorAll('[data-testid="wolli-country-row"]'));
    expect(container.textContent).toContain('Showing 69 non-zero countries for Internationals.');
    expect(rows).toHaveLength(wolliStats.mixes.internationals.length);
    expect(rows[0].textContent).toContain('China');
    expect(rows[0].textContent).toContain('1,659');
    expect(rows[1].textContent).toContain('Mongolia');
    expect(rows[1].textContent).toContain('508');
  });

  it('updates the diversity mix when a different suburb is selected', () => {
    const container = renderRoute('/suburb-stats', <WolliSuburbStatsPage />);
    const mascotStats = getWolliSuburbStatsBySlug('mascot');
    const select = container.querySelector('select[aria-label="Select suburb"]') as HTMLSelectElement | null;

    expect(select).toBeTruthy();
    changeSelect(select as HTMLSelectElement, 'mascot');

    const rows = Array.from(container.querySelectorAll('[data-testid="wolli-country-row"]'));
    expect(container.textContent).toContain('Mascot has 12,660 residents');
    expect(container.textContent).toContain('12,660 Total');
    expect(container.textContent).toContain('4,299 Locals');
    expect(container.textContent).toContain('8,361 Internationals');
    expect(rows).toHaveLength(mascotStats.mixes.all.length);
    expect(rows[0].textContent).toContain('China');
    expect(rows[0].textContent).toContain('2,451');
    expect(rows[1].textContent).toContain('Indonesia');
    expect(rows[1].textContent).toContain('2,104');
  });
});
