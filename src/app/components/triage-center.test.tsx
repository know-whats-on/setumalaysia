// @vitest-environment jsdom

import { act } from 'react';
import { Browser } from '@capacitor/browser';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fetchEvidence,
  fetchMyItinerary,
  fetchMyHousehold,
  fetchNetworkingCards,
  fetchOfficialEvents,
  fetchProfile,
  fetchPublicToilets,
  fetchRentalHistory,
  sendTriageMessage,
} from '../lib/api';
import { getCurrentAppPosition } from '../lib/geolocation';
import {
  AER_SOLAR_SHARER_SOURCE_URL,
  FREE_ELECTRICITY_GUIDE_ROUTE,
  VICTORIA_FREE_POWER_SOURCE_URL,
} from '../lib/free-electricity-guide';
import { TriageCenter } from './triage-center';

const appConfigState = vi.hoisted(() => ({
  config: {
    variant: 'burb_mate',
    experienceMode: 'hoodie',
    displayName: 'Hoodie',
    assistantName: 'Hoodienie',
    resourcesLabel: 'Hoodienie',
    resourcesRoute: '/arrival',
    shareBaseUrl: '',
    showSetuFeatures: false,
    useSharedResourcesShell: true,
  },
}));

vi.mock('../lib/app-config', () => ({
  APP_CONFIG: appConfigState.config,
}));

vi.mock('../lib/api', () => ({
  fetchEvidence: vi.fn(),
  fetchMyItinerary: vi.fn(),
  fetchMyHousehold: vi.fn(),
  fetchNetworkingCards: vi.fn(),
  fetchOfficialEvents: vi.fn(),
  fetchProfile: vi.fn(),
  fetchPropertyPedigree: vi.fn(),
  fetchPublicToilets: vi.fn(),
  fetchRentalHistory: vi.fn(),
  searchAddress: vi.fn(),
  sendTriageMessage: vi.fn(),
  speakBrowser: vi.fn(() => null),
}));

vi.mock('@capacitor/browser', () => ({
  Browser: {
    open: vi.fn(() => Promise.resolve()),
  },
}));

vi.mock('../lib/geolocation', () => ({
  getCurrentAppPosition: vi.fn(),
}));

vi.mock('../assets/hoodienie.svg', () => ({
  default: '/hoodienie.svg',
}));

vi.mock('./hoodie-help-tour', () => ({
  HoodieHelpTrigger: ({ title }: { title?: string }) => (
    <button type="button" aria-label={title || 'Open onboarding video'}>?</button>
  ),
}));

vi.mock('./share/hoodie-share-actions', () => ({
  HoodieShareActions: () => <div data-testid="share-actions" />,
}));

vi.mock('../lib/hoodienie-launch-context', () => ({
  useHoodienieLaunchContext: () => ({ launchActive: false }),
}));

type MountedComponent = {
  container: HTMLDivElement;
  root: Root;
};

const mountedComponents: MountedComponent[] = [];

function LocationDisplay() {
  const location = useLocation();
  return (
    <div
      data-testid="location-display"
      data-location-state={JSON.stringify(location.state ?? null)}
    >
      {`${location.pathname}${location.search}`}
    </div>
  );
}

function currentMonthDate(day: number) {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${String(day).padStart(2, '0')}T00:00:00.000Z`;
}

function createRentalEntries() {
  return [
    {
      id: 'rental-current',
      email: 'rushi@hoodie.app',
      address: '1 King Street',
      display_address: '1 King Street',
      unit_number: '12',
      building_id: 'building-1',
      suburb: 'Sydney',
      postcode: '2000',
      state: 'NSW',
      lat: -33.86,
      lng: 151.2,
      start_date: '2026-02-01',
      end_date: '',
      is_current: true,
      landlord_name: '',
      landlord_contact: '',
      monthly_rent: 1200,
      review_category: null,
      review_text: '',
      review_rating: null,
      created_at: '2026-02-01T00:00:00.000Z',
    },
    {
      id: 'rental-past',
      email: 'rushi@hoodie.app',
      address: '4 Old Road',
      display_address: '4 Old Road',
      unit_number: '',
      building_id: 'building-2',
      suburb: 'Parramatta',
      postcode: '2150',
      state: 'NSW',
      start_date: '2025-01-01',
      end_date: '2026-01-20',
      is_current: false,
      landlord_name: '',
      landlord_contact: '',
      monthly_rent: 900,
      review_category: null,
      review_text: '',
      review_rating: null,
      created_at: '2025-01-01T00:00:00.000Z',
    },
  ];
}

function createHouseholdDashboard() {
  return {
    household: {
      id: 'household-1',
      name: 'King Street House',
      address_snapshot: {
        display_address: '1 King Street, Sydney NSW 2000',
        address: '1 King Street',
        suburb: 'Sydney',
        state: 'NSW',
        postcode: '2000',
      },
      created_by_email: 'roomie@hoodie.app',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-04-01T00:00:00.000Z',
      members: [
        {
          id: 'member-rushi',
          email_normalized: 'rushi@hoodie.app',
          display_name: 'Rushi',
          role: 'member',
          status: 'active',
        },
        {
          id: 'member-roomie',
          email_normalized: 'roomie@hoodie.app',
          display_name: 'Roomie',
          role: 'owner',
          status: 'active',
        },
      ],
      invites: [],
      chores: [],
      notifications: [],
      email_notifications: [],
      activity: [],
      bills: [
        {
          id: 'rent-april',
          household_id: 'household-1',
          bill_scope: 'household',
          app_variant: 'burb_mate',
          title: 'April Rent',
          category: 'Rent',
          amount_total: 2400,
          due_at: currentMonthDate(28),
          created_by_email: 'roomie@hoodie.app',
          paid_by_email: 'roomie@hoodie.app',
          split_type: 'equal',
          notes: '',
          status: 'open',
          email_members: true,
          created_at: currentMonthDate(2),
          splits: [
            {
              id: 'split-rushi',
              member_email: 'rushi@hoodie.app',
              participant_type: 'household_member',
              participant_display_name: 'Rushi',
              amount_owed: 1200,
              amount_paid: 0,
              shares: 1,
              status: 'open',
            },
            {
              id: 'split-roomie',
              member_email: 'roomie@hoodie.app',
              participant_type: 'household_member',
              participant_display_name: 'Roomie',
              amount_owed: 1200,
              amount_paid: 1200,
              shares: 1,
              status: 'settled',
            },
          ],
          payments: [],
        },
      ],
    },
    pending_invites: [],
    shared_bills: [],
    bill_contacts: [],
  };
}

async function flushAsync() {
  for (let index = 0; index < 8; index += 1) {
    await act(async () => {
      await Promise.resolve();
    });
  }
}

async function renderTriageCenter() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  mountedComponents.push({ container, root });

  await act(async () => {
    root.render(
      <MemoryRouter>
        <TriageCenter surface="arrival" />
      </MemoryRouter>,
    );
  });
  await flushAsync();

  return container;
}

async function renderRoutedTriageCenter() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  mountedComponents.push({ container, root });

  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={['/arrival']}>
        <LocationDisplay />
        <Routes>
          <Route path="/arrival" element={<TriageCenter surface="arrival" />} />
          <Route path="/dashboard" element={<div>Dashboard</div>} />
          <Route path="/shopping" element={<div>Shopping</div>} />
          <Route path="*" element={<div>Route target</div>} />
        </Routes>
      </MemoryRouter>,
    );
  });
  await flushAsync();

  return container;
}

function useSetuChinaAppConfig() {
  Object.assign(appConfigState.config, {
    variant: 'setu_china',
    experienceMode: 'hoodie',
    displayName: 'Chinese Student Hub AU',
    assistantName: '智能助手',
    resourcesLabel: 'Resources',
    resourcesRoute: '/legal?section=prepare&prepare_tab=checklist',
    shareBaseUrl: 'https://china.knowwhatson.com',
    showSetuFeatures: true,
    useSharedResourcesShell: true,
  });
}

function useWolliAppConfig() {
  Object.assign(appConfigState.config, {
    variant: 'wheres_wolli',
    experienceMode: 'hoodie',
    displayName: "Where's Wolli",
    assistantName: 'Wolli',
    resourcesLabel: 'Services',
    resourcesRoute: '/setu',
    shareBaseUrl: 'https://wolli.knowwhatson.com',
    showSetuFeatures: true,
    useSharedResourcesShell: true,
    defaultCouncilSlug: 'bayside-council',
    localSourceUrls: {
      councilHome: 'https://www.bayside.nsw.gov.au/',
      news: 'https://www.bayside.nsw.gov.au/your-council/latest-news',
      events: 'https://www.bayside.nsw.gov.au/whats-on',
      waste: 'https://www.bayside.nsw.gov.au/services/waste-recycling',
      reportIssue: 'https://www.bayside.nsw.gov.au/report-it',
      contact: 'https://www.bayside.nsw.gov.au/your-council/contact-us',
    },
    assistantProfile: {
      audience: 'Bayside Council locals, newcomers, and residents staying in the area',
      persona: 'A grey-headed flying fox local companion called Wolli',
      supportContext: 'Answer inside the relevant app section first, then direct people to official Bayside Council pages.',
    },
  });
}

function getButtonByText(container: ParentNode, label: string) {
  return Array.from(container.querySelectorAll('button, a')).find(
    (button) => button.textContent?.trim() === label,
  );
}

function getButtonContainingText(container: ParentNode, label: string) {
  return Array.from(container.querySelectorAll('button, a')).find(
    (button) => button.textContent?.includes(label),
  );
}

async function clickButtonByText(container: ParentNode, label: string) {
  const button = getButtonByText(container, label);
  expect(button).toBeTruthy();
  await act(async () => {
    button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await Promise.resolve();
  });
  await flushAsync();
}

async function submitPrompt(container: HTMLElement, prompt: string) {
  const input = container.querySelector('input') as HTMLInputElement;
  expect(input).toBeTruthy();
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value',
  )?.set;
  await act(async () => {
    nativeInputValueSetter?.call(input, prompt);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await Promise.resolve();
  });
  await act(async () => {
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await Promise.resolve();
  });
  await flushAsync();
}

function getLastSentTriageText() {
  const sentMessages = vi.mocked(sendTriageMessage).mock.calls.at(-1)?.[0] as any[] | undefined;
  return sentMessages?.at(-1)?.text;
}

beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  Object.assign(appConfigState.config, {
    variant: 'burb_mate',
    experienceMode: 'hoodie',
    displayName: 'Hoodie',
    assistantName: 'Hoodienie',
    resourcesLabel: 'Hoodienie',
    resourcesRoute: '/arrival',
    shareBaseUrl: '',
    showSetuFeatures: false,
    useSharedResourcesShell: true,
  });
  window.localStorage.clear();
  window.localStorage.setItem('ghar_email', 'rushi@hoodie.app');
  window.localStorage.setItem('ghar_first_name', 'Rushi');
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn(() => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
  Object.defineProperty(window.HTMLElement.prototype, 'scrollTo', {
    configurable: true,
    value: vi.fn(),
  });
  window.requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
    callback(0);
    return 1;
  });
  window.cancelAnimationFrame = vi.fn();
  vi.spyOn(window, 'open').mockReturnValue({ closed: false } as Window);
  vi.mocked(fetchRentalHistory).mockResolvedValue(createRentalEntries() as any);
  vi.mocked(fetchProfile).mockResolvedValue({ australian_state: 'NSW' } as any);
  vi.mocked(fetchEvidence).mockResolvedValue([{ id: 'evidence-1' }] as any);
  vi.mocked(fetchMyItinerary).mockResolvedValue([]);
  vi.mocked(fetchMyHousehold).mockResolvedValue(createHouseholdDashboard() as any);
  vi.mocked(getCurrentAppPosition).mockResolvedValue({
    coords: {
      latitude: -33.8688,
      longitude: 151.2093,
      accuracy: 20,
    },
  });
  vi.mocked(fetchPublicToilets).mockResolvedValue({
    data: [
      {
        id: 'toilet-3',
        name: 'Far Park Toilet',
        address: '20 Park Street',
        town: 'Sydney',
        state: 'NSW',
        lat: -33.8755,
        lng: 151.216,
        openingHours: '24 hours',
        accessible: false,
      },
      {
        id: 'toilet-1',
        name: 'Town Hall amenities',
        address: '1 George Street',
        town: 'Sydney',
        state: 'NSW',
        lat: -33.869,
        lng: 151.2096,
        openingHours: '24 hours',
        accessible: true,
        babyChange: true,
        drinkingWater: true,
      },
      {
        id: 'toilet-2',
        name: 'Library public toilet',
        address: '4 Library Lane',
        town: 'Sydney',
        state: 'NSW',
        lat: -33.871,
        lng: 151.211,
        openingHours: 'Mon-Fri 08:00-18:00',
        shower: true,
      },
      {
        id: 'toilet-4',
        name: 'Invalid toilet',
        address: '',
        town: '',
        state: 'NSW',
        lat: 0,
        lng: 0,
      },
    ],
    count: 4,
    truncated: false,
    source: 'National Public Toilet Map',
  } as any);
  vi.mocked(fetchNetworkingCards).mockResolvedValue({
    data: [],
    meta: {
      returned_count: 0,
      total_count: 0,
      has_more: false,
      next_offset: null,
    },
  } as any);
  vi.mocked(sendTriageMessage).mockResolvedValue(
    'I can use the saved tracker data in the app.\nSource: Hoodie Expense Tracker.\n[TRIGGER:OPEN_EXPENSE_TRACKER]\nConfidence score: 91%',
  );
});

afterEach(() => {
  for (const mounted of mountedComponents.splice(0)) {
    act(() => mounted.root.unmount());
    mounted.container.remove();
  }
  vi.useRealTimers();
  vi.clearAllMocks();
  window.localStorage.clear();
});

describe('TriageCenter expense and timeline assistant cards', () => {
  it('renders one rotating landing question with four section menu buttons', async () => {
    const container = await renderTriageCenter();

    const sectionGrid = container.querySelector('[data-testid="arrival-landing-sections"]');
    expect(sectionGrid).toBeTruthy();

    const sectionButtons = Array.from(sectionGrid?.querySelectorAll('button[aria-haspopup="menu"]') || []);
    expect(sectionButtons).toHaveLength(4);
    expect(sectionButtons.map((button) => button.textContent?.trim())).toEqual([
      'Explore',
      'Vibe',
      'Resources',
      'Household',
    ]);
    expect(container.textContent).toContain('Where should I start today?');
    expect(container.textContent).toContain("Hoodienie's job is to help you find the right resource.");
    expect(getButtonByText(container, 'Rental Check')).toBeFalsy();
    expect(getButtonByText(container, 'Sponsor Companies')).toBeFalsy();
    expect(container.textContent).not.toContain('Upload Docs');
    expect(container.textContent).not.toContain('Upload Evidence');
    expect(container.textContent).not.toContain("Hey Hoodie! I'm Hoodienie.");
    expect(
      sectionButtons.some((button) => button.textContent?.includes('Where should I start today?')),
    ).toBe(false);

    const input = container.querySelector('input');
    expect(input?.parentElement?.querySelectorAll('button')).toHaveLength(1);
    expect(input?.placeholder).toBe('Ask me about fuel prices');
    expect(container.querySelector('[data-testid="triage-input-bar"]')?.className).not.toContain('border-t');
  });

  it('opens Explore as a top-starting burst and submits Transport as a preprompt', async () => {
    const container = await renderRoutedTriageCenter();

    await clickButtonByText(container, 'Explore');

    const menu = container.ownerDocument.querySelector('[role="menu"][aria-label="Explore options"]');
    expect(menu).toBeTruthy();
    expect(menu?.className).toContain('z-40');
    expect(container.querySelector('[data-testid="arrival-landing-section-buttons"]')?.className).toContain('z-20');
    expect(getButtonByText(menu!, 'Fuel')).toBeTruthy();
    expect(getButtonByText(menu!, 'Groceries')).toBeTruthy();
    expect(getButtonByText(menu!, 'Toilet')).toBeTruthy();
    expect(getButtonByText(menu!, 'Transport')).toBeTruthy();
    expect((getButtonByText(menu!, 'Fuel') as HTMLButtonElement).style.transform).toContain('calc(-50% + 0px), calc(-50% + -84px)');

    await clickButtonByText(menu!, 'Transport');

    const sentMessages = vi.mocked(sendTriageMessage).mock.calls.at(-1)?.[0] as any[];
    expect(sentMessages.at(-1)?.text).toBe('Help me understand nearby public transport options and what network or route I should check.');
    expect(container.querySelector('[data-testid="location-display"]')?.textContent).toBe('/arrival');
    expect(container.ownerDocument.querySelector('[role="menu"][aria-label="Explore options"]')).toBeFalsy();
  });

  it('shows a Find Toilet Nearby option in Explore and renders top nearby toilet cards', async () => {
    const container = await renderRoutedTriageCenter();

    await clickButtonByText(container, 'Explore');
    const menu = container.ownerDocument.querySelector('[role="menu"][aria-label="Explore options"]');
    expect(menu).toBeTruthy();

    await clickButtonByText(menu!, 'Toilet');

    const locationDisplay = container.querySelector('[data-testid="location-display"]');
    expect(locationDisplay?.textContent).toBe('/arrival');
    expect(getCurrentAppPosition).toHaveBeenCalled();
    expect(fetchPublicToilets).toHaveBeenCalled();
    expect(getButtonByText(container, 'Town Hall amenities')).toBeFalsy();
    expect(container.textContent).toContain('Town Hall amenities');
    expect(container.textContent).toContain('Library public toilet');
    expect(container.textContent).toContain('Far Park Toilet');
    expect(container.textContent).not.toContain('Invalid toilet');
    expect(getButtonByText(container, 'Hoodie Public Toilets')).toBeFalsy();
    expect(getButtonByText(container, 'See all nearby toilets')).toBeTruthy();
    expect(sendTriageMessage).not.toHaveBeenCalled();

    await clickButtonByText(container, 'Directions');
    expect(getButtonContainingText(container, 'Apple Maps')).toBeTruthy();
    expect(getButtonContainingText(container, 'Google Maps')).toBeTruthy();
    expect(getButtonContainingText(container, 'Waze')).toBeTruthy();

    await act(async () => {
      getButtonContainingText(container, 'Google Maps')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
    await flushAsync();
    expect(window.open).toHaveBeenCalledWith(
      'https://www.google.com/maps/dir/?api=1&destination=-33.869,151.2096&travelmode=driving',
      '_blank',
      'noopener,noreferrer',
    );

    await clickButtonByText(container, 'See all nearby toilets');
    expect(locationDisplay?.textContent).toBe('/dashboard');
    expect(locationDisplay?.getAttribute('data-location-state')).toContain('"initialAction":"find-nearby-toilet"');
  });

  it('opens Vibe menu options from the assistant landing section', async () => {
    const container = await renderTriageCenter();

    await clickButtonByText(container, 'Vibe');

    const menu = container.ownerDocument.querySelector('[role="menu"][aria-label="Vibe options"]');
    expect(menu).toBeTruthy();
    expect(['Guides', 'Stats', 'Events', 'Plans', 'Alerts'].map((label) => Boolean(getButtonByText(menu!, label)))).toEqual([
      true,
      true,
      true,
      true,
      true,
    ]);
  });

  it('opens Resources menu options and submits resource sub-icons as preprompts', async () => {
    vi.mocked(sendTriageMessage).mockResolvedValue(
      'PR points depend on your age, English, work, study, partner factors, nomination and the exact subclass.\n[TRIGGER:OPEN_PR_CALCULATOR]\nConfidence score: 90%',
    );
    const container = await renderRoutedTriageCenter();

    await clickButtonByText(container, 'Resources');

    const menu = container.ownerDocument.querySelector('[role="menu"][aria-label="Resources options"]');
    expect(menu).toBeTruthy();
    expect(menu?.querySelectorAll('[role="menuitem"]')).toHaveLength(6);
    expect(getButtonByText(menu!, 'Scam Checker')).toBeTruthy();
    expect(getButtonByText(menu!, 'Free Power')).toBeTruthy();
    expect(getButtonByText(menu!, 'Application Kit')).toBeFalsy();
    expect(getButtonByText(menu!, 'Sponsor Companies')).toBeTruthy();
    expect(getButtonByText(menu!, 'PR Calculator')).toBeTruthy();
    expect(getButtonByText(menu!, 'Visa Occupations')).toBeTruthy();
    expect(getButtonByText(menu!, 'Legal')).toBeTruthy();

    await clickButtonByText(menu!, 'PR Calculator');

    const sentMessages = vi.mocked(sendTriageMessage).mock.calls.at(-1)?.[0] as any[];
    expect(sentMessages.at(-1)?.text).toBe('Help me understand PR points at a high level and what official calculator details I should check.');
    expect(container.querySelector('[data-testid="location-display"]')?.textContent).toBe('/arrival');
    expect(getButtonByText(container, 'PR Calculator')).toBeTruthy();

    await clickButtonByText(container, 'PR Calculator');

    expect(container.querySelector('[data-testid="location-display"]')?.textContent).toBe('/legal?section=jobs&jobs_tab=pr-points');
  });

  it('opens the Free Power guide directly from Resources', async () => {
    const container = await renderRoutedTriageCenter();

    await clickButtonByText(container, 'Resources');

    const menu = container.ownerDocument.querySelector('[role="menu"][aria-label="Resources options"]');
    expect(menu).toBeTruthy();

    await clickButtonByText(menu!, 'Free Power');

    expect(sendTriageMessage).not.toHaveBeenCalled();
    expect(container.querySelector('[data-testid="location-display"]')?.textContent).toBe('/guides/free-electricity-australia-2026');
    expect(container.ownerDocument.querySelector('[role="menu"][aria-label="Resources options"]')).toBeFalsy();
  });

  it('opens Household menu options and submits Bills as a preprompt', async () => {
    const container = await renderRoutedTriageCenter();

    await clickButtonByText(container, 'Household');

    const menu = container.ownerDocument.querySelector('[role="menu"][aria-label="Household options"]');
    expect(menu).toBeTruthy();
    expect(getButtonByText(menu!, 'Bills')).toBeTruthy();
    expect(getButtonByText(menu!, 'Chores')).toBeTruthy();
    expect(getButtonByText(menu!, 'Timeline')).toBeTruthy();
    expect(getButtonByText(menu!, 'Profile')).toBeTruthy();

    await clickButtonByText(menu!, 'Bills');

    const sentMessages = vi.mocked(sendTriageMessage).mock.calls.at(-1)?.[0] as any[];
    expect(sentMessages.at(-1)?.text).toBe('Help me set up or manage household bills with my housemates.');
    expect(container.querySelector('[data-testid="location-display"]')?.textContent).toBe('/arrival');
    expect(container.ownerDocument.querySelector('[role="menu"][aria-label="Household options"]')).toBeFalsy();
  });

  it('submits SETU China lifestyle map tiles as assistant prompts without navigating', async () => {
    useSetuChinaAppConfig();
    const container = await renderRoutedTriageCenter();

    await clickButtonByText(container, '生活');

    const menu = container.ownerDocument.querySelector('[role="menu"][aria-label="生活支持 options"]');
    expect(menu).toBeTruthy();

    await clickButtonByText(menu!, '地图');

    expect(getLastSentTriageText()).toBe('请用中文说明在澳洲租房前，如何用地图查看周边交通、学校距离、生活设施和安全提醒。');
    expect(container.querySelector('[data-testid="location-display"]')?.textContent).toBe('/arrival');
    expect(container.ownerDocument.querySelector('[role="menu"][aria-label="生活支持 options"]')).toBeFalsy();
  });

  it('submits SETU China Vibe trigger tiles as assistant prompts without navigating', async () => {
    useSetuChinaAppConfig();
    const container = await renderRoutedTriageCenter();

    const cases = [
      ['活动', '帮我找近期适合中国留学生的活动。'],
      ['社交', '帮我找近期 networking 或社交活动。'],
      ['计划', '帮我查看可以加入的公开计划。'],
    ] as const;

    for (const [label, prompt] of cases) {
      await clickButtonByText(container, '发现');
      const menu = container.ownerDocument.querySelector('[role="menu"][aria-label="发现 options"]');
      expect(menu).toBeTruthy();

      await clickButtonByText(menu!, label);

      expect(getLastSentTriageText()).toBe(prompt);
      expect(container.querySelector('[data-testid="location-display"]')?.textContent).toBe('/arrival');
    }
  });

  it('submits SETU China Resources route tiles as assistant prompts without navigating', async () => {
    useSetuChinaAppConfig();
    const container = await renderRoutedTriageCenter();

    const cases = [
      ['清单', '请用中文说明中国留学生抵澳后应该先做哪些事，以及到达清单可以怎么使用。'],
      ['提醒', '请用中文说明中国留学生在澳洲应该关注哪些官方提醒、安全更新和诈骗预警。'],
    ] as const;

    for (const [label, prompt] of cases) {
      await clickButtonByText(container, '清单');
      const menu = container.ownerDocument.querySelector('[role="menu"][aria-label="到达清单 options"]');
      expect(menu).toBeTruthy();

      await clickButtonByText(menu!, label);

      expect(getLastSentTriageText()).toBe(prompt);
      expect(container.querySelector('[data-testid="location-display"]')?.textContent).toBe('/arrival');
    }
  });

  it('submits SETU China support route and trigger tiles as assistant prompts without navigating', async () => {
    useSetuChinaAppConfig();
    const container = await renderRoutedTriageCenter();

    const cases = [
      ['Scamwatch', '收到疑似诈骗短信或微信消息怎么办？什么时候应该联系 Scamwatch？'],
      ['证据', '我应该保存哪些租房、诈骗或纠纷证据？'],
      ['我的', '请用中文说明个人资料和偏好设置如何帮助我获得更相关的活动、清单和安全提醒。'],
    ] as const;

    for (const [label, prompt] of cases) {
      await clickButtonByText(container, '求助');
      const menu = container.ownerDocument.querySelector('[role="menu"][aria-label="求助渠道 options"]');
      expect(menu).toBeTruthy();

      await clickButtonByText(menu!, label);

      expect(getLastSentTriageText()).toBe(prompt);
      expect(container.querySelector('[data-testid="location-display"]')?.textContent).toBe('/arrival');
    }
  });

  it('closes an active assistant burst on backdrop, outside tap, or input focus', async () => {
    const container = await renderTriageCenter();

    await clickButtonByText(container, 'Resources');
    expect(container.ownerDocument.querySelector('[role="menu"][aria-label="Resources options"]')).toBeTruthy();

    const closeButton = container.ownerDocument.querySelector('button[aria-label="Close Resources menu"]');
    expect(closeButton).toBeTruthy();
    await act(async () => {
      closeButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
    await flushAsync();
    expect(container.ownerDocument.querySelector('[role="menu"][aria-label="Resources options"]')).toBeFalsy();
    expect(getButtonByText(container, 'Explore')).toBeTruthy();

    await clickButtonByText(container, 'Vibe');
    expect(container.ownerDocument.querySelector('[role="menu"][aria-label="Vibe options"]')).toBeTruthy();
    await act(async () => {
      document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
      await Promise.resolve();
    });
    await flushAsync();
    expect(container.ownerDocument.querySelector('[role="menu"][aria-label="Vibe options"]')).toBeFalsy();

    await clickButtonByText(container, 'Household');
    expect(container.ownerDocument.querySelector('[role="menu"][aria-label="Household options"]')).toBeTruthy();
    const input = container.querySelector('input') as HTMLInputElement;
    await act(async () => {
      input.dispatchEvent(new Event('focusin', { bubbles: true }));
      await Promise.resolve();
    });
    await flushAsync();
    expect(container.ownerDocument.querySelector('[role="menu"][aria-label="Household options"]')).toBeFalsy();
  });

  it('switches the carousel copy to the active section and restores the default copy after close', async () => {
    const container = await renderTriageCenter();
    expect(container.textContent).toContain('Where should I start today?');

    await clickButtonByText(container, 'Vibe');
    expect(container.textContent).toContain('Show me local guides and weekend ideas');

    const closeButton = container.ownerDocument.querySelector('button[aria-label="Close Vibe menu"]');
    await act(async () => {
      closeButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
    await flushAsync();

    expect(container.textContent).toContain('Where should I start today?');
  });

  it('rotates the arrival input placeholder without submitting placeholder text', async () => {
    vi.useFakeTimers();
    try {
      const container = await renderTriageCenter();
      const input = container.querySelector('input') as HTMLInputElement;
      expect(input.placeholder).toBe('Ask me about fuel prices');

      await act(async () => {
        vi.advanceTimersByTime(2200);
        await Promise.resolve();
      });
      expect(input.placeholder).toBe('Ask me about suburb crime ratings');

      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      )?.set;
      await act(async () => {
        nativeInputValueSetter?.call(input, 'I need fuel help');
        input.dispatchEvent(new Event('input', { bubbles: true }));
        await Promise.resolve();
      });

      const frozenPlaceholder = input.placeholder;
      await act(async () => {
        vi.advanceTimersByTime(4400);
        await Promise.resolve();
      });
      expect(input.value).toBe('I need fuel help');
      expect(input.placeholder).toBe(frozenPlaceholder);

      await act(async () => {
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        await Promise.resolve();
      });
      await flushAsync();

      const sentMessages = vi.mocked(sendTriageMessage).mock.calls.at(-1)?.[0] as any[];
      expect(sentMessages.at(-1)?.text).toBe('I need fuel help');
      expect(sentMessages.at(-1)?.text).not.toBe(input.placeholder);
    } finally {
      vi.useRealTimers();
    }
  });

  it('submits typed prompts and renders route/source pills from the answer', async () => {
    vi.mocked(sendTriageMessage).mockResolvedValue(
      'I can point you to nearby fuel prices and cheaper options.\nSource: Hoodie Fuel Prices.\n[TRIGGER:OPEN_FUEL]\nConfidence score: 90%',
    );
    const container = await renderTriageCenter();

    await submitPrompt(container, 'Help me find cheaper fuel nearby');

    const sentMessages = vi.mocked(sendTriageMessage).mock.calls.at(-1)?.[0] as any[];
    expect(sentMessages.at(-1)?.text).toBe('Help me find cheaper fuel nearby');
    expect(container.textContent).toContain('nearby fuel prices');
    expect(container.textContent).toContain('Hoodie Fuel Prices');
    expect(container.textContent).not.toContain('Open Fuel Prices');
  });

  it('shows a chevron to jump back to the latest assistant message after scrolling up', async () => {
    const container = await renderTriageCenter();

    await submitPrompt(container, 'Help me understand bills');

    const scroller = container.querySelector('[data-testid="triage-messages-scroller"]') as HTMLDivElement;
    expect(scroller).toBeTruthy();
    Object.defineProperty(scroller, 'scrollHeight', { configurable: true, value: 1400 });
    Object.defineProperty(scroller, 'clientHeight', { configurable: true, value: 600 });
    Object.defineProperty(scroller, 'scrollTop', { configurable: true, writable: true, value: 120 });

    await act(async () => {
      scroller.dispatchEvent(new Event('scroll', { bubbles: true }));
      await Promise.resolve();
    });
    await flushAsync();

    const jumpButton = container.querySelector('button[aria-label="Jump to latest assistant message"]');
    expect(jumpButton).toBeTruthy();

    await act(async () => {
      jumpButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(window.HTMLElement.prototype.scrollTo).toHaveBeenCalledWith({ top: 1400, behavior: 'smooth' });
  });

  it('navigates from assistant route pills to existing app sections', async () => {
    vi.mocked(sendTriageMessage).mockResolvedValue(
      'The map is the right next section.\nSource: Hoodie Map.\n[TRIGGER:OPEN_MAP]\nConfidence score: 90%',
    );
    const container = await renderRoutedTriageCenter();

    await submitPrompt(container, 'Open the map');
    expect(container.querySelector('[data-testid="location-display"]')?.textContent).toBe('/arrival');

    const mapSourceButton = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === 'Hoodie Map',
    );
    expect(mapSourceButton).toBeTruthy();
    expect(
      Array.from(container.querySelectorAll('button')).some((button) => button.textContent?.trim() === 'Open Map'),
    ).toBe(false);

    await act(async () => {
      mapSourceButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
    await flushAsync();

    expect(container.querySelector('[data-testid="location-display"]')?.textContent).toBe('/dashboard');
  });

  it('keeps the voice controls for the default Hoodie arrival assistant', async () => {
    const container = await renderRoutedTriageCenter();

    expect(container.querySelector('button[title="Enable Hoodienie voice"]')).toBeTruthy();
    expect(container.textContent).toContain('Awaiting Input');
  });

  it('hides toilet source pills from assistant replies', async () => {
    vi.mocked(sendTriageMessage).mockResolvedValue(
      'I can open the map and use your location after you approve it.\nSource: Hoodie Public Toilets.\nConfidence score: 90%',
    );
    const container = await renderRoutedTriageCenter();

    await submitPrompt(container, 'Show me a nearby amenity');

    const toiletSourceButton = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === 'Hoodie Public Toilets',
    );
    expect(toiletSourceButton).toBeFalsy();
    expect(container.textContent).toContain('I can open the map and use your location after you approve it.');
    expect(getCurrentAppPosition).not.toHaveBeenCalled();
    expect(fetchPublicToilets).not.toHaveBeenCalled();
  });

  it('shows the location permission message when nearby toilet lookup is denied', async () => {
    vi.mocked(getCurrentAppPosition).mockRejectedValue(new Error('Location permission denied'));
    const container = await renderRoutedTriageCenter();

    await clickButtonByText(container, 'Explore');
    const menu = container.ownerDocument.querySelector('[role="menu"][aria-label="Explore options"]');
    expect(menu).toBeTruthy();

    await clickButtonByText(menu!, 'Toilet');

    expect(fetchPublicToilets).not.toHaveBeenCalled();
    expect(sendTriageMessage).not.toHaveBeenCalled();
    expect(container.textContent).toContain('I need location permission to find public toilets nearby.');
    expect(getButtonByText(container, 'Hoodie Public Toilets')).toBeFalsy();
    expect(container.querySelector('[data-testid="location-display"]')?.textContent).toBe('/arrival');
  });

  it('shows a toilet data message when location succeeds but toilet lookup fails', async () => {
    vi.mocked(fetchPublicToilets).mockRejectedValue(new Error('404 Not Found'));
    const container = await renderRoutedTriageCenter();

    await clickButtonByText(container, 'Explore');
    const menu = container.ownerDocument.querySelector('[role="menu"][aria-label="Explore options"]');
    expect(menu).toBeTruthy();

    await clickButtonByText(menu!, 'Toilet');

    expect(getCurrentAppPosition).toHaveBeenCalled();
    expect(fetchPublicToilets).toHaveBeenCalled();
    expect(sendTriageMessage).not.toHaveBeenCalled();
    expect(container.textContent).toContain('I found your location, but could not load public toilet data right now.');
    expect(container.textContent).not.toContain('I could not get your current location right now.');
    expect(getButtonByText(container, 'Hoodie Public Toilets')).toBeFalsy();
    expect(container.querySelector('[data-testid="location-display"]')?.textContent).toBe('/arrival');
  });

  it('renders resource route pills for sponsor companies, PR calculator, and visa occupations', async () => {
    vi.mocked(sendTriageMessage).mockResolvedValue(
      'These are good next checks after the overview.\nSource: Sponsor Companies; PR Calculator; Visa Occupations.\n[TRIGGER:OPEN_SPONSOR_COMPANIES]\n[TRIGGER:OPEN_PR_CALCULATOR]\n[TRIGGER:OPEN_VISA_OCCUPATIONS]\nConfidence score: 90%',
    );
    const container = await renderRoutedTriageCenter();

    await submitPrompt(container, 'Show sponsor companies, PR points, and visa occupations');

    expect(getButtonByText(container, 'Sponsor Companies')).toBeTruthy();
    expect(getButtonByText(container, 'PR Calculator')).toBeTruthy();
    expect(getButtonByText(container, 'Visa Occupations')).toBeTruthy();

    await clickButtonByText(container, 'Visa Occupations');

    expect(container.querySelector('[data-testid="location-display"]')?.textContent).toBe('/legal?section=jobs&jobs_tab=occupations');
  });

  it('normalizes broad jobs triggers into the precise sponsor companies route pill', async () => {
    vi.mocked(sendTriageMessage).mockResolvedValue(
      'Check that the role is genuine and that the sponsor history is relevant.\nSource: Hoodie Jobs Resources.\n[TRIGGER:VIEW_RESOURCES]\nConfidence score: 89%',
    );
    const container = await renderRoutedTriageCenter();

    await submitPrompt(container, 'Help me understand sponsor companies and what I should verify before applying.');

    expect(getButtonByText(container, 'Hoodie Jobs Resources')).toBeTruthy();
    expect(getButtonByText(container, 'Open Jobs')).toBeFalsy();

    await clickButtonByText(container, 'Hoodie Jobs Resources');

    expect(container.querySelector('[data-testid="location-display"]')?.textContent).toBe('/legal?section=jobs&jobs_tab=sponsor-companies');
  });

  it('routes grocery source pills to price compare and does not render duplicate action buttons', async () => {
    vi.mocked(sendTriageMessage).mockResolvedValue(
      'Compare your basket across the major supermarkets.\nSource: Woolies.\n[TRIGGER:OPEN_GROCERIES]\nConfidence score: 90%',
    );
    const container = await renderRoutedTriageCenter();

    await submitPrompt(container, 'Compare grocery options near me');

    expect(container.textContent).toContain('Hoodie Price Compare');
    expect(container.textContent).not.toContain('Woolies');
    expect(
      Array.from(container.querySelectorAll('button')).some((button) => button.textContent?.trim() === 'Open Price Compare'),
    ).toBe(false);

    const priceCompareButton = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === 'Hoodie Price Compare',
    );
    expect(priceCompareButton).toBeTruthy();

    await act(async () => {
      priceCompareButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
    await flushAsync();

    expect(container.querySelector('[data-testid="location-display"]')?.textContent).toBe('/shopping?retailer=compare');
  });

  it('adds academic context and guarded guidance for degree-to-PR occupation questions', async () => {
    vi.mocked(fetchProfile).mockResolvedValue({
      australian_state: 'NSW',
      university: 'University of Sydney',
      course_name: 'Master of Information Technology',
      graduation_year: 2026,
      visa_status: 'Student visa',
    } as any);
    vi.mocked(sendTriageMessage).mockResolvedValue(
      'Software and ICT occupations may be worth investigating from your saved course context.',
    );
    const container = await renderTriageCenter();

    await submitPrompt(container, 'What skilled occupations can my degree help me for PR?');

    const context = vi.mocked(sendTriageMessage).mock.calls.at(-1)?.[2] as any;
    expect(context.academic_context).toEqual({
      university: 'University of Sydney',
      course_name: 'Master of Information Technology',
      graduation_year: 2026,
      visa_status: 'Student visa',
    });
    expect(container.textContent).toContain('areas to investigate');
    expect(container.textContent).toContain('ANZSCO duties');
    expect(container.textContent).toContain('university, course coordinator, or careers team');
    expect(container.textContent).toContain('program outcomes');
    expect(container.textContent).toContain('Home Affairs/immi');
    expect(container.textContent).toContain('Visa Occupations');
    expect(container.textContent).toContain('PR Calculator');
    expect(container.textContent).not.toMatch(/guaranteed PR eligibility/i);
  });

  it('injects matching My Network context only for networking contact questions', async () => {
    vi.mocked(fetchNetworkingCards).mockResolvedValue({
      data: [
        {
          id: 'card-priya',
          owner_email: 'rushi@hoodie.app',
          linkedin_url: 'https://www.linkedin.com/in/priya-founder',
          display_name: 'Priya Founder',
          headline: 'Startup mentor',
          company: 'Atlassian',
          role: 'Product Lead',
          location: 'Sydney',
          met_at: 'June 2026',
          met_context: 'Networking night',
          met_event_title: 'Founder Demo Night',
          notes: 'Offered to review product resumes.',
          display_tags: ['Product', 'Mentor'],
          tags: ['product', 'mentor'],
          search_terms: ['product management', 'resume review'],
          created_at: '2026-06-07T00:00:00.000Z',
          updated_at: '2026-06-07T00:00:00.000Z',
          created_app_variant: 'burb_mate',
          archived_at: '',
        },
        ...Array.from({ length: 5 }, (_, index) => ({
          id: `card-extra-${index}`,
          owner_email: 'rushi@hoodie.app',
          linkedin_url: `https://www.linkedin.com/in/extra-${index}`,
          display_name: `Extra ${index}`,
          headline: '',
          company: 'OtherCo',
          role: 'Engineer',
          location: '',
          met_at: '',
          met_context: '',
          met_event_title: '',
          notes: `Extra note ${index}`,
          display_tags: ['Extra'],
          tags: ['extra'],
          search_terms: ['extra'],
          created_at: '2026-06-07T00:00:00.000Z',
          updated_at: '2026-06-07T00:00:00.000Z',
          created_app_variant: 'burb_mate',
          archived_at: '',
        })),
      ],
      meta: {
        returned_count: 6,
        total_count: 6,
        has_more: false,
        next_offset: null,
      },
    } as any);
    vi.mocked(sendTriageMessage).mockResolvedValue(
      'Priya Founder is the closest saved match for Atlassian.\nSource: My Network.\n[TRIGGER:OPEN_NETWORKING_CARDS]\nConfidence score: 91%',
    );
    const container = await renderRoutedTriageCenter();

    await submitPrompt(container, 'Do I know someone from Atlassian who can help with product jobs?');

    expect(fetchNetworkingCards).toHaveBeenCalledWith({
      email: 'rushi@hoodie.app',
      q: 'Do I know someone from Atlassian who can help with product jobs?',
      limit: 10,
    });
    const context = vi.mocked(sendTriageMessage).mock.calls.at(-1)?.[2] as any;
    expect(context.networking_cards_context).toHaveLength(5);
    expect(context.networking_cards_context[0]).toEqual(expect.objectContaining({
      display_name: 'Priya Founder',
      company: 'Atlassian',
      role: 'Product Lead',
      notes: 'Offered to review product resumes.',
      display_tags: ['Product', 'Mentor'],
      search_terms: ['product management', 'resume review'],
      linkedin_url: 'https://www.linkedin.com/in/priya-founder',
    }));
    expect(context.networking_cards_context.map((card: any) => card.display_name)).not.toContain('Extra 4');
    expect(container.textContent).toContain('Priya Founder is the closest saved match');
    expect(getButtonByText(container, 'My Network')).toBeTruthy();
    expect(container.textContent).not.toContain('My Card');
  });

  it('answers itinerary questions from account itinerary context and opens My Itinerary', async () => {
    vi.mocked(fetchMyItinerary).mockResolvedValue([
      {
        id: 'future-stop',
        app_variant: 'burb_mate',
        email: 'rushi@hoodie.app',
        kind: 'custom_stop',
        event_source: 'custom',
        event_slug: 'world-square',
        event_key: 'custom:world-square',
        source_label: 'Custom stop',
        title: 'Black Diamondz Property Concierge',
        summary: 'Meet at the concierge desk.',
        image_url: '',
        hero_image_url: '',
        booking_url: '',
        source_url: '',
        venue_name: 'Black Diamondz Property Concierge',
        suburb: 'Sydney',
        address: 'World Square, Suite 31, Level 2/650 George St, Sydney NSW 2000',
        dates_humanized: '12 Jul 2099',
        event_day: '2099-07-12',
        upcoming_time: '10:00 AM',
        maps_url: 'https://maps.google.com/?q=-33.8772934,151.2072602',
        lat: -33.8772934,
        lng: 151.2072602,
        order: 1,
        attended_at: '2099-07-01T00:00:00.000Z',
        updated_at: '2099-07-01T00:00:00.000Z',
      },
      {
        id: 'past-stop',
        app_variant: 'burb_mate',
        email: 'rushi@hoodie.app',
        kind: 'event',
        event_source: 'cityofsydney',
        event_slug: 'old-event',
        event_key: 'cityofsydney:old-event',
        source_label: 'City of Sydney',
        title: 'Past Gallery Visit',
        summary: 'Older itinerary stop.',
        image_url: '',
        hero_image_url: '',
        booking_url: '',
        source_url: 'https://example.com/past',
        venue_name: 'Old Gallery',
        suburb: 'Sydney',
        address: '1 Past Street, Sydney NSW 2000',
        dates_humanized: '2 Jan 2001',
        event_day: '2001-01-02',
        upcoming_time: '2:00 PM',
        lat: -33.86,
        lng: 151.21,
        order: 1,
        attended_at: '2001-01-01T00:00:00.000Z',
        updated_at: '2001-01-01T00:00:00.000Z',
      },
    ] as any);
    vi.mocked(sendTriageMessage).mockResolvedValue(
      'You have one upcoming itinerary and one past itinerary. Upcoming: Sunday 12 July 2099, 1 spot. Past: Tuesday 2 January 2001, 1 spot. Which one do you want to inspect?\nSource: My Itinerary.\n[TRIGGER:OPEN_MY_ITINERARY]\nConfidence score: 92%',
    );
    const container = await renderRoutedTriageCenter();

    await submitPrompt(container, 'Do I have any itineraries?');

    expect(fetchMyItinerary).toHaveBeenCalledWith({
      email: 'rushi@hoodie.app',
      appVariant: 'burb_mate',
    });
    const context = vi.mocked(sendTriageMessage).mock.calls.at(-1)?.[2] as any;
    expect(context.itinerary_context).toEqual(expect.objectContaining({
      active: true,
      signed_in: true,
      total_spots: 2,
    }));
    expect(context.itinerary_context.present[0]).toEqual(expect.objectContaining({
      day: '2099-07-12',
      spot_count: 1,
    }));
    expect(context.itinerary_context.present[0].spots[0]).toEqual(expect.objectContaining({
      title: 'Black Diamondz Property Concierge',
      address: 'World Square, Suite 31, Level 2/650 George St, Sydney NSW 2000',
    }));
    expect(context.itinerary_context.past[0]).toEqual(expect.objectContaining({
      day: '2001-01-02',
      spot_count: 1,
    }));
    expect(container.textContent).toContain('Which one do you want to inspect?');
    expect(getButtonByText(container, 'My Itinerary')).toBeTruthy();

    await clickButtonByText(container, 'My Itinerary');
    expect(container.querySelector('[data-testid="location-display"]')?.textContent).toBe(
      '/vibe?section=events&events_tab=plans&plans_view=itinerary',
    );
  });

  it('does not send My Network context for ordinary assistant questions', async () => {
    vi.mocked(sendTriageMessage).mockResolvedValue(
      'I can help explain the shared expense tracker.\nSource: Hoodie Expense Tracker.\n[TRIGGER:OPEN_EXPENSE_TRACKER]\nConfidence score: 88%',
    );
    const container = await renderTriageCenter();

    await submitPrompt(container, 'Can you explain my expense tracker?');

    expect(fetchNetworkingCards).not.toHaveBeenCalled();
    const context = vi.mocked(sendTriageMessage).mock.calls.at(-1)?.[2] as any;
    expect(context.networking_cards_context).toBeUndefined();
    expect(container.textContent).not.toContain('My Network');
  });

  it('suppresses Open Hoodienie trigger buttons while already on the assistant surface', async () => {
    vi.mocked(sendTriageMessage).mockResolvedValue(
      'You are already here with Hoodienie.\nSource: Hoodie Assistant.\n[TRIGGER:OPEN_ARRIVAL]\nConfidence score: 88%',
    );
    const container = await renderTriageCenter();

    await submitPrompt(container, 'Open Hoodienie');

    expect(container.textContent).toContain('You are already here with Hoodienie.');
    expect(
      Array.from(container.querySelectorAll('button')).some((button) => button.textContent?.trim() === 'Open Hoodienie'),
    ).toBe(false);
  });

  it('routes fuel price week questions to fuel without attaching event cards', async () => {
    vi.mocked(sendTriageMessage).mockResolvedValue(
      'The best place to check this week is Fuel Prices.\nSource: Hoodie Events; Hoodie Fuel Prices.\n[TRIGGER:OPEN_EVENTS]\n[TRIGGER:OPEN_FUEL]\nConfidence score: 89%',
    );
    vi.mocked(fetchOfficialEvents).mockResolvedValue({
      data: [
        {
          id: 'event-1',
          slug: 'student-art-tour',
          source: 'whatson',
          title: 'Student Art Tour',
          start_at: '2026-04-28T12:30:00.000Z',
          end_at: '2026-04-28T14:30:00.000Z',
          venue_name: 'Museum',
          suburb: 'Camperdown',
          source_url: 'https://example.com/event',
        },
      ],
    } as any);
    const container = await renderTriageCenter();

    await submitPrompt(container, "What's the fuel price this week?");

    expect(fetchOfficialEvents).not.toHaveBeenCalled();
    expect(container.textContent).toContain('Hoodie Fuel Prices');
    expect(container.textContent).not.toContain('Open Fuel Prices');
    expect(container.textContent).not.toContain("What's On");
    expect(container.textContent).not.toContain('Student Art Tour');
    expect(container.textContent).not.toContain('Open Events');
  });

  it('answers Hoodie free electricity questions from the shared guide data', async () => {
    const container = await renderRoutedTriageCenter();

    await submitPrompt(container, 'When is free electricity in Sydney?');

    expect(sendTriageMessage).not.toHaveBeenCalled();
    expect(container.textContent).toContain('Sydney / NSW');
    expect(container.textContent).toContain('1 July 2026');
    expect(container.textContent).toContain('11am-2pm');
    expect(container.textContent).toContain('24 kWh');
    expect(getButtonByText(container, 'Free electricity guide')).toBeTruthy();
    expect(getButtonByText(container, 'AER Solar Sharer fact sheet')).toBeTruthy();

    await clickButtonByText(container, 'AER Solar Sharer fact sheet');
    expect(Browser.open).toHaveBeenCalledWith({ url: AER_SOLAR_SHARER_SOURCE_URL });

    await clickButtonByText(container, 'Free electricity guide');
    expect(Browser.open).not.toHaveBeenCalledWith({ url: FREE_ELECTRICITY_GUIDE_ROUTE });
    expect(container.querySelector('[data-testid="location-display"]')?.textContent).toBe(
      FREE_ELECTRICITY_GUIDE_ROUTE,
    );
  });

  it('answers casual 3-hour free power phrasing without the remote assistant', async () => {
    const container = await renderTriageCenter();

    await submitPrompt(container, 'What about the 3-hour free power thing?');

    expect(sendTriageMessage).not.toHaveBeenCalled();
    expect(container.textContent).toContain('Confirmed 2026 free-electricity windows');
    expect(container.textContent).toContain('NSW and South-East Queensland 11am-2pm');
    expect(container.textContent).toContain('WA, TAS, NT, and ACT are not confirmed');
    expect(container.textContent).toContain('Free electricity guide');
    expect(container.textContent).toContain('AER Solar Sharer fact sheet');
  });

  it('answers get-free-electricity-at-my-place phrasing with guide sources', async () => {
    const container = await renderTriageCenter();

    await submitPrompt(container, 'Can I gte free electricity at my place?');

    expect(sendTriageMessage).not.toHaveBeenCalled();
    expect(container.textContent).toContain('Confirmed 2026 free-electricity windows');
    expect(container.textContent).toContain('Victoria 11am-2pm from 1 October');
    expect(getButtonByText(container, 'Free electricity guide')).toBeTruthy();
    expect(getButtonByText(container, 'AER Solar Sharer fact sheet')).toBeTruthy();
  });

  it('answers Gendu free power eligibility questions without the remote assistant', async () => {
    Object.assign(appConfigState.config, {
      variant: 'ghar',
      displayName: 'SETU India AU',
      assistantName: 'Gendu',
      resourcesLabel: 'Gendu',
      showSetuFeatures: true,
    });
    const container = await renderTriageCenter();

    await submitPrompt(container, 'Do I need solar for free power?');

    expect(sendTriageMessage).not.toHaveBeenCalled();
    expect(container.textContent).toContain('No rooftop solar is required');
    expect(container.textContent).toContain('smart meter');
    expect(container.textContent).toContain('opt-in retailer plan');
    expect(container.textContent).toContain('24 kWh');
    expect(container.textContent).toContain('Free electricity guide');
    expect(container.textContent).toContain('AER Solar Sharer fact sheet');
  });

  it('uses the correct official source for Victorian free electricity questions', async () => {
    const container = await renderTriageCenter();

    await submitPrompt(container, 'When does free electricity start in Melbourne?');

    expect(sendTriageMessage).not.toHaveBeenCalled();
    expect(container.textContent).toContain('Melbourne / VIC');
    expect(container.textContent).toContain('1 October 2026');
    expect(container.textContent).toContain('11am-2pm');
    expect(container.textContent).toContain('Victorian Government free power');

    await clickButtonByText(container, 'Victorian Government free power');
    expect(Browser.open).toHaveBeenCalledWith({ url: VICTORIA_FREE_POWER_SOURCE_URL });
  });

  it('answers not-confirmed free power locations from the guide data', async () => {
    const container = await renderTriageCenter();

    await submitPrompt(container, 'Is free power confirmed in Perth WA?');

    expect(sendTriageMessage).not.toHaveBeenCalled();
    expect(container.textContent).toContain('Perth / WA');
    expect(container.textContent).toContain('not confirmed');
    expect(container.textContent).toContain('Check your retailer');
    expect(container.textContent).toContain('AER DMO 2026-27 final determination');
  });

  it('does not treat ordinary electricity bill split questions as free power guide questions', async () => {
    vi.mocked(sendTriageMessage).mockResolvedValue(
      'I can help with the shared bill workflow.\nSource: Hoodie Household.\n[TRIGGER:OPEN_HOUSEHOLD_BILLS]\nConfidence score: 86%',
    );
    const container = await renderTriageCenter();

    await submitPrompt(container, 'Can you help split the electricity bill with my housemates?');

    expect(sendTriageMessage).toHaveBeenCalled();
    expect(container.textContent).toContain('shared bill workflow');
    expect(container.textContent).toContain('Hoodie Household');
    expect(container.textContent).not.toContain('Solar Sharer');
    expect(getButtonByText(container, 'Free electricity guide')).toBeFalsy();
  });

  it('passes self and household expense tracker context and renders a monthly spending card', async () => {
    const container = await renderTriageCenter();

    await submitPrompt(container, "What's my spending this month?");

    const context = vi.mocked(sendTriageMessage).mock.calls.at(-1)?.[2] as any;
    expect(context.expense_tracker_context.active).toBe(true);
    expect(context.expense_tracker_context.data_scope).toContain('self split amounts');
    expect(context.expense_tracker_context.data_scope).toContain('No bank, card, or external transaction feed');
    expect(context.expense_tracker_context.personal_month.total).toBe(1200);
    expect(context.expense_tracker_context.household_month.total).toBe(2400);

    const expenseCard = container.querySelector('[data-testid="triage-expense-card"]');
    expect(expenseCard).toBeTruthy();
    expect(expenseCard?.textContent).toContain('Self + household only');
    expect(expenseCard?.textContent).toContain('$1,200.00');
    expect(expenseCard?.textContent).toContain('$2,400.00');
    expect(expenseCard?.textContent).toContain('Open expense tracker');
  });

  it('keeps the same shared assistant behavior for Gendu timeline questions', async () => {
    Object.assign(appConfigState.config, {
      variant: 'ghar',
      displayName: 'SETU India AU',
      assistantName: 'Gendu',
      resourcesLabel: 'Gendu',
      showSetuFeatures: true,
    });
    vi.mocked(sendTriageMessage).mockResolvedValue(
      'Your current home is saved in the timeline.\nSource: SETU India AU Timeline.\n[TRIGGER:OPEN_TIMELINE]\nConfidence score: 90%',
    );
    const container = await renderTriageCenter();

    await submitPrompt(container, 'Show my timeline and current home');

    const context = vi.mocked(sendTriageMessage).mock.calls.at(-1)?.[2] as any;
    expect(context.timeline_context.active).toBe(true);
    expect(context.timeline_context.current_home.address).toContain('1 King Street');
    expect(context.timeline_context.known_address_count).toBe(2);

    const timelineCard = container.querySelector('[data-testid="triage-timeline-card"]');
    expect(container.textContent).toContain('Gendu');
    expect(timelineCard).toBeTruthy();
    expect(timelineCard?.textContent).toContain('Timeline snapshot');
    expect(timelineCard?.textContent).toContain('Current home');
    expect(timelineCard?.textContent).toContain('Open timeline');
  });

  it('lets Gendu launch the games shelf from a typed prompt', async () => {
    Object.assign(appConfigState.config, {
      variant: 'ghar',
      displayName: 'SETU India AU',
      assistantName: 'Gendu',
      resourcesLabel: 'Gendu',
      showSetuFeatures: true,
    });
    const container = await renderRoutedTriageCenter();

    await submitPrompt(container, 'Open mini games for a study break');

    expect(sendTriageMessage).not.toHaveBeenCalled();
    expect(container.textContent).toContain('Open Play Games');
    expect(getButtonByText(container, 'Play Games')).toBeTruthy();

    await clickButtonByText(container, 'Play Games');

    expect(container.querySelector('[data-testid="location-display"]')?.textContent).toBe('/games');
  });

  it('lets Gendu launch games from the assistant landing menu', async () => {
    Object.assign(appConfigState.config, {
      variant: 'ghar',
      displayName: 'SETU India AU',
      assistantName: 'Gendu',
      resourcesLabel: 'Gendu',
      showSetuFeatures: true,
    });
    const container = await renderRoutedTriageCenter();
    const sectionGrid = container.querySelector('[data-testid="arrival-landing-sections"]');
    const vibeButton = Array.from(sectionGrid?.querySelectorAll('button[aria-haspopup="menu"]') || []).find(
      (button) => button.textContent?.trim() === 'Vibe',
    );

    expect(vibeButton).toBeTruthy();
    await act(async () => {
      vibeButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
    await flushAsync();

    await clickButtonByText(container, 'Games');

    expect(container.querySelector('[data-testid="location-display"]')?.textContent).toBe('/games');
  });

  it('answers SETU Gendu Indian student welfare questions from official consulate data', async () => {
    Object.assign(appConfigState.config, {
      variant: 'ghar',
      displayName: 'SETU India AU',
      assistantName: 'Gendu',
      resourcesLabel: 'Gendu',
      showSetuFeatures: true,
    });
    const container = await renderTriageCenter();

    await submitPrompt(container, 'Who is the Indian student welfare contact for Tasmania?');

    expect(sendTriageMessage).not.toHaveBeenCalled();
    expect(container.textContent).toContain('For Tasmania');
    expect(container.textContent).toContain('Consulate General of India, Melbourne');
    expect(container.textContent).toContain('Mr. H.K. Pandey');
    expect(container.textContent).toContain('com1.melbourne@mea.gov.in');

    await clickButtonByText(container, 'Consulate General of India, Melbourne');

    expect(Browser.open).toHaveBeenCalledWith({ url: 'https://www.cgimelbourne.gov.in' });
  });

  it('keeps Hoodie Indian mission questions on the normal assistant path', async () => {
    vi.mocked(sendTriageMessage).mockResolvedValue(
      'I can help you find the right official resource.\nSource: Hoodie Resources.\n[TRIGGER:OPEN_RESOURCES]\nConfidence score: 78%',
    );
    const container = await renderTriageCenter();

    await submitPrompt(container, 'Who is the Indian student welfare contact for Tasmania?');

    expect(sendTriageMessage).toHaveBeenCalled();
    expect(container.textContent).toContain('I can help you find the right official resource.');
    expect(container.textContent).not.toContain('Mr. H.K. Pandey');
  });
});

describe('SETU China triage assistant', () => {
  it('submits China panda menu prompts without navigating before the answer', async () => {
    useSetuChinaAppConfig();
    vi.mocked(sendTriageMessage).mockResolvedValue(
      '你可以先用地图查看学校通勤、公共交通、超市、GP 和租房区域，再结合安全提醒判断是否适合居住。\nSource: 地图 / Map.\n[TRIGGER:OPEN_MAP]\nConfidence score: 88%',
    );
    const container = await renderRoutedTriageCenter();

    await clickButtonByText(container, '生活');
    await clickButtonByText(container, '地图');

    expect(sendTriageMessage).toHaveBeenCalledTimes(1);
    expect(getLastSentTriageText()).toContain('如何用地图查看周边交通');
    expect(container.querySelector('[data-testid="location-display"]')?.textContent).toBe('/arrival');
    expect(container.textContent).toContain('你可以先用地图查看学校通勤');
    expect(container.textContent).toContain('地图 / Map');
    expect(container.textContent).toContain('Confidence score: 88%');
  });

  it('passes China arrival context and renders distinct successful AI answers', async () => {
    useSetuChinaAppConfig();
    vi.mocked(sendTriageMessage).mockResolvedValue(
      '学生签证打工限制需要按 Home Affairs 最新规则确认；同时用 Fair Work 查看最低工资、工资单和不合理扣薪处理方式。\nSource: 资源 / Resources.\n[TRIGGER:OPEN_RESOURCES]\nConfidence score: 91%',
    );
    const container = await renderRoutedTriageCenter();

    await submitPrompt(container, '学生签证打工时间有什么规定？Fair Work 有哪些基本权益？');

    const context = vi.mocked(sendTriageMessage).mock.calls.at(-1)?.[2] as any;
    expect(context.preferred_language).toBe('zh-CN');
    expect(context.app_variant).toBe('setu_china');
    expect(context.surface).toBe('arrival');
    expect(context.intent_hint).toContain('资源 / Resources');
    expect(container.textContent).toContain('学生签证打工限制需要按 Home Affairs 最新规则确认');
    expect(container.textContent).toContain('资源 / Resources');
    expect(container.textContent).toContain('Confidence score: 91%');
  });

  it('renders varied successful China answers instead of reusing fallback text', async () => {
    useSetuChinaAppConfig();
    vi.mocked(sendTriageMessage)
      .mockResolvedValueOnce(
        'TFN 是澳洲 Tax File Number，兼职、报税和雇主 payroll 通常会用到。你可以通过 ATO 官方渠道申请，注意不要把 TFN 发给可疑中介或陌生人。\nSource: ATO - https://www.ato.gov.au/\n[TRIGGER:OPEN_RESOURCES]\nConfidence score: 90%',
      )
      .mockResolvedValueOnce(
        'OSHC 是海外学生健康保险。看 GP 前先确认你的保险公司、等待期和 direct billing 网络；紧急情况仍然拨打 000。\nSource: Study Australia - https://www.studyaustralia.gov.au/en\n[TRIGGER:OPEN_RESOURCES]\nConfidence score: 88%',
      );
    const container = await renderRoutedTriageCenter();

    await submitPrompt(container, 'TFN 是什么，怎么申请？');
    await submitPrompt(container, 'OSHC 怎么用？哪里可以找 GP？');

    expect(sendTriageMessage).toHaveBeenCalledTimes(2);
    expect(container.textContent).toContain('TFN 是澳洲 Tax File Number');
    expect(container.textContent).toContain('OSHC 是海外学生健康保险');
    expect(container.textContent).toContain('Confidence score: 90%');
    expect(container.textContent).toContain('Confidence score: 88%');
    expect(container.textContent).not.toContain('我现在连接智能助手不稳定');
  });

  it('uses the China fallback only on actual triage failure', async () => {
    useSetuChinaAppConfig();
    vi.mocked(sendTriageMessage).mockRejectedValueOnce(new Error('triage unavailable'));
    const container = await renderRoutedTriageCenter();

    await submitPrompt(container, 'OSHC 怎么使用？哪里可以找会说中文的 GP？');

    expect(sendTriageMessage).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain('我现在连接智能助手不稳定');
    expect(container.textContent).toContain('TFN、OSHC、GP、Fair Work');
    expect(container.textContent).toContain('资源 / Resources');
    expect(container.textContent).toContain('Confidence score: 68%');
    expect(container.textContent).not.toContain('Confidence score: 55%');
  });
});

describe('Where’s Wolli triage assistant', () => {
  it('removes voice controls and status from Ask Wolli', async () => {
    useWolliAppConfig();
    vi.mocked(sendTriageMessage).mockResolvedValue(
      'Use Explore for local Bayside events and Resources for council service links.\nConfidence score: 88%',
    );
    const container = await renderRoutedTriageCenter();

    expect(container.querySelector('button[title="Enable Wolli voice"]')).toBeNull();
    expect(container.textContent).not.toContain('Awaiting Input');
    expect(container.querySelector('[data-testid="triage-messages-scroller"]')?.className).toContain('pt-[calc(var(--native-safe-area-top)+1rem)]');

    await submitPrompt(container, 'What can Wolli help with?');

    expect(container.querySelector('button[title="Replay this message"]')).toBeNull();
    expect(container.textContent).not.toContain('WOLLI VOICE ACTIVE');
  });

  it('submits Wolli landing menu tiles through AI with official links', async () => {
    useWolliAppConfig();
    vi.mocked(sendTriageMessage).mockResolvedValue(
      'Use the Where\'s Wolli map for nearby Bayside places, public toilets, transport, and services. For official facility details, follow the linked Bayside Council pages.\nSource: Wolli Map.\n[TRIGGER:OPEN_MAP]\nConfidence score: 89%',
    );
    const container = await renderRoutedTriageCenter();

    await clickButtonByText(container, 'Explore');

    const menu = container.ownerDocument.querySelector('[role="menu"][aria-label="Explore Bayside options"]');
    expect(menu).toBeTruthy();

    await clickButtonByText(menu!, 'Map');

    expect(sendTriageMessage).toHaveBeenCalledTimes(1);
    expect(container.querySelector('[data-testid="location-display"]')?.textContent).toBe('/arrival');
    expect(container.textContent).toContain('Use the Where\'s Wolli map');
    expect(container.textContent).toContain('Bayside Council');
    expect(container.textContent).toContain('Bayside Council places');
    expect(container.textContent).toContain('Confidence score: 89%');
  });

  it('passes Bayside assistant context for open-ended local questions', async () => {
    useWolliAppConfig();
    vi.mocked(sendTriageMessage).mockResolvedValue(
      'Start with Explore for local context, then use Bayside Council pages for official details.\nConfidence score: 88%',
    );
    const container = await renderRoutedTriageCenter();

    await submitPrompt(container, 'How can I settle into Bayside as a new local?');

    const context = vi.mocked(sendTriageMessage).mock.calls.at(-1)?.[2] as any;
    expect(context.app_variant).toBe('wheres_wolli');
    expect(context.default_council_slug).toBe('bayside-council');
    expect(context.official_source_urls.events).toBe('https://www.bayside.nsw.gov.au/whats-on');
    expect(context.assistant_profile.persona).toContain('Wolli');
    expect(context.intent_hint).toContain('General Bayside local support');
    expect(context.support_context).toContain('Use AI to answer the user\'s exact question');
    expect(context.support_context).toContain('Do not present as an official council representative');
    expect(container.textContent).toContain('Where\'s Wolli Explore');
  });

  it('answers event questions with AI and renders official Bayside event cards', async () => {
    useWolliAppConfig();
    vi.mocked(fetchOfficialEvents).mockResolvedValueOnce({
      data: [
        {
          id: 'bayside-event-1',
          source: 'bayside',
          slug: 'library-calligraphy-group',
          title: '2026 Bayside Library Chinese Calligraphy Group',
          venue_name: 'Rockdale Library',
          suburb: 'Rockdale',
          address: '444-446 Princes Highway, Rockdale',
          source_url: 'https://www.bayside.nsw.gov.au/whats-on/2026-bayside-library-chinese-calligraphy-group',
          image_url: 'https://www.bayside.nsw.gov.au/sites/default/files/styles/event_card/public/event.jpg',
          dates_humanized: 'Fri, 26 Jun',
          upcoming_date: '2026-06-26',
          upcoming_time: '10:00 AM',
          tags: ['Bayside', 'Council'],
        },
      ],
      meta: {
        source: 'bayside',
        returned_count: 1,
      },
    } as any);
    vi.mocked(sendTriageMessage).mockResolvedValue(
      'Here are official Bayside activities from What\'s On. Open Explore > What\'s On for the live list, and use the official Bayside Council listing for final times and bookings.\nSource: Bayside Council What\'s On.\n[TRIGGER:OPEN_EVENTS]\nConfidence score: 90%',
    );
    const container = await renderRoutedTriageCenter();

    await submitPrompt(container, 'What events are on in Bayside this weekend?');

    expect(fetchOfficialEvents).toHaveBeenCalledWith(expect.objectContaining({
      appVariant: 'wheres_wolli',
      councilSlug: 'bayside-council',
      limit: 4,
    }));
    expect(sendTriageMessage).toHaveBeenCalledTimes(1);
    const context = vi.mocked(sendTriageMessage).mock.calls.at(-1)?.[2] as any;
    expect(context.official_events?.[0]?.title).toBe('2026 Bayside Library Chinese Calligraphy Group');
    expect(context.support_context).toContain('summarize any provided official_events');
    expect(container.textContent).toContain('Here are official Bayside activities');
    expect(container.textContent).toContain('2026 Bayside Library Chinese Calligraphy Group');
    expect(container.textContent).toContain("Bayside Council What's On");
    expect(container.textContent).toContain('Confidence score: 90%');
  });

  it('routes service questions through AI while adding official Bayside links', async () => {
    useWolliAppConfig();
    vi.mocked(sendTriageMessage).mockResolvedValue(
      'Start in Resources, then use Bayside Council Report It to lodge pothole, tree, and maintenance requests with the council.\nSource: Bayside Council Report It.\n[TRIGGER:OPEN_RESOURCES]\nConfidence score: 91%',
    );
    const container = await renderRoutedTriageCenter();

    await submitPrompt(container, 'How do I report a pothole or tree issue to Bayside Council?');

    expect(sendTriageMessage).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain('Start in Resources, then use Bayside Council Report It');
    expect(container.textContent).toContain('Bayside Council Services');
    expect(container.textContent).toContain('Bayside Council Report It');
    expect(container.textContent).toContain('Confidence score: 91%');
  });

  it('adds precise official Bayside service links for AI local task answers', async () => {
    useWolliAppConfig();
    vi.mocked(sendTriageMessage).mockResolvedValue(
      'Use Resources for the app shortcuts, then open the official Bayside pages for parking permits, rates, pets, and the DA tracker.\nSource: Bayside Council Services.\n[TRIGGER:OPEN_RESOURCES]\nConfidence score: 90%',
    );
    const container = await renderRoutedTriageCenter();

    await submitPrompt(container, 'Where do I check parking permits, rates, pets and the DA tracker?');

    expect(sendTriageMessage).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain('Use Resources for the app shortcuts');
    expect(container.textContent).toContain('Bayside Council Parking');
    expect(container.textContent).toContain('Bayside Council Rates & payments');
    expect(container.textContent).toContain('Bayside Council Pets & animals');
    expect(container.textContent).toContain('Bayside Council Planning & DA tracker');
  });

  it('prioritizes emergency guidance before council follow-up', async () => {
    useWolliAppConfig();
    const container = await renderRoutedTriageCenter();

    await submitPrompt(container, 'There is a fire and someone is injured');

    expect(sendTriageMessage).not.toHaveBeenCalled();
    expect(container.textContent).toContain('call 000 now');
    expect(container.textContent).toContain('Triple Zero 000');
  });
});
