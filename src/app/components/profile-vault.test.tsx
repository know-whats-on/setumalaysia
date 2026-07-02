// @vitest-environment jsdom

import { act, type HTMLAttributes, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, useLocation } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const appConfigState = vi.hoisted(() => ({
  config: {
    variant: 'ghar',
    experienceMode: 'hoodie',
    displayName: 'SETU India AU',
    supportEmail: 'ghar@example.com',
    webIcon: '/setu-icon.png',
    useSharedResourcesShell: true,
    showPartnershipBadge: false,
  },
}));

const helpTourState = vi.hoisted(() => ({
  enabled: false,
  activeMode: null as string | null,
  activeStepId: null as string | null,
  restartTour: vi.fn(),
}));

const platformState = vi.hoisted(() => ({
  nativeShell: false,
}));

vi.mock('../lib/app-config', () => ({
  APP_CONFIG: appConfigState.config,
}));

vi.mock('../lib/api', () => ({
  fetchRentalHistory: vi.fn(),
  createRentalEntry: vi.fn(),
  updateRentalEntry: vi.fn(),
  deleteRentalEntry: vi.fn(),
  fetchProfile: vi.fn(),
  updateProfile: vi.fn(),
  createEvidence: vi.fn(),
  uploadEvidenceFile: vi.fn(),
  deleteEvidence: vi.fn(),
  deleteProfile: vi.fn(),
  adminInit: vi.fn(),
  adminCheck: vi.fn(),
  adminSendOtp: vi.fn(),
  adminVerifyOtp: vi.fn(),
  deletePublicPlan: vi.fn(),
  fetchPublicPlans: vi.fn(),
  joinPublicPlan: vi.fn(),
  leavePublicPlan: vi.fn(),
  fetchMyHousehold: vi.fn(),
  createHousehold: vi.fn(),
}));

vi.mock('../lib/household', () => ({
  getHouseholdAttentionSummary: () => ({ billsDue: 0, choresDue: 0 }),
  getHouseholdAddressLabel: () => 'Saved address',
  getHouseholdHeaderDisplay: () => ({ title: 'Saved address', subtitle: '' }),
  hasAcknowledgedLatestHouseholdRules: vi.fn(() => true),
  sortTimelineEntriesForHousehold: (entries: unknown[]) => entries,
}));

vi.mock('./address-search-field', () => ({
  VerifiedAddressInput: ({ className = '', placeholder = '' }: { className?: string; placeholder?: string }) => (
    <input className={className} placeholder={placeholder} readOnly value="" />
  ),
}));

vi.mock('./setu-partnership-badge', () => ({
  SetuPartnershipBadge: () => <div>Partnership badge</div>,
}));

vi.mock('./risk-assessment-modal', () => ({
  RiskAssessmentModal: () => null,
}));

vi.mock('./admin-panel', () => ({
  AdminPanel: () => null,
}));

vi.mock('./users-panel', () => ({
  UsersPanel: () => null,
}));

vi.mock('../lib/platform', () => ({
  isNativeShell: () => platformState.nativeShell,
}));

vi.mock('../lib/native-media', () => ({
  captureEvidencePhoto: vi.fn(),
}));

vi.mock('./household-panel', () => ({
  HouseholdPanel: ({ profileFullName = '' }: { profileFullName?: string }) => (
    <div>
      <button type="button">Household section</button>
      <div>Household panel</div>
      <div data-testid="household-profile-full-name">{profileFullName}</div>
    </div>
  ),
}));

vi.mock('./ui/drawer', () => ({
  Drawer: ({
    open,
    children,
  }: {
    open?: boolean;
    children: ReactNode;
  }) => (open ? <div data-testid="mock-drawer">{children}</div> : null),
  DrawerContent: ({ children, className = '' }: { children: ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  DrawerHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DrawerTitle: ({ children, className = '' }: { children: ReactNode; className?: string }) => (
    <h2 className={className}>{children}</h2>
  ),
}));

vi.mock('./hoodie-help-tour', () => ({
  HoodieHelpTrigger: ({ title }: { title?: string }) => (
    <button type="button" aria-label={title || 'Open onboarding video'}>
      ?
    </button>
  ),
  useHoodieHelpTour: () => ({
    enabled: helpTourState.enabled,
    restartTour: helpTourState.restartTour,
    activeMode: helpTourState.activeMode,
    activeStepId: helpTourState.activeStepId,
  }),
}));

vi.mock('motion/react', () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  },
}));

import { ProfileVault } from './profile-vault';
import {
  adminCheck,
  adminInit,
  adminSendOtp,
  createHousehold,
  createRentalEntry,
  fetchMyHousehold,
  fetchProfile,
  fetchPublicPlans,
  fetchRentalHistory,
} from '../lib/api';
import { hasAcknowledgedLatestHouseholdRules } from '../lib/household';

type MountedComponent = {
  container: HTMLDivElement;
  root: Root;
};

const mountedComponents: MountedComponent[] = [];

function normalizeText(value: string | null | undefined) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function getButtonTexts() {
  return Array.from(document.querySelectorAll('button')).map((button) => normalizeText(button.textContent));
}

function getButtonByText(fragment: string) {
  return Array.from(document.querySelectorAll('button')).find((button) =>
    normalizeText(button.textContent).includes(fragment),
  );
}

function getElementByExactText(text: string) {
  return Array.from(document.querySelectorAll('body *')).find((element) =>
    normalizeText(element.textContent) === text,
  );
}

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location-probe">{`${location.pathname}${location.search}`}</div>;
}

async function flushPromises() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

async function renderProfileVault(options?: {
  initialTab?: 'overview' | 'timeline' | 'household' | 'evidence';
  initialEntry?: string;
  autoAddAddress?: boolean;
  autoAddEvidence?: boolean;
  shellVariant?: 'default' | 'setu-china' | 'setu-india' | 'setu-malaysia';
}) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  mountedComponents.push({ container, root });

  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={[options?.initialEntry || '/profile']}>
        <ProfileVault
          evidence={[]}
          listings={[]}
          onLogout={vi.fn()}
          initialTab={options?.initialTab}
          autoAddAddress={options?.autoAddAddress}
          autoAddEvidence={options?.autoAddEvidence}
          shellVariant={options?.shellVariant}
        />
        <LocationProbe />
      </MemoryRouter>,
    );
  });

  await flushPromises();
}

async function clickButton(fragment: string) {
  const button = getButtonByText(fragment);
  expect(button).toBeTruthy();
  await act(async () => {
    button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

describe('ProfileVault profile navigation', () => {
  beforeEach(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    document.body.innerHTML = '';
    window.localStorage.clear();
    window.localStorage.setItem('ghar_email', 'rushi@hoodie.app');
    window.localStorage.setItem('ghar_first_name', 'Setu');
    window.localStorage.setItem('ghar_last_name', 'Member');
    vi.mocked(adminInit).mockResolvedValue({ is_admin: false } as any);
    vi.mocked(adminCheck).mockResolvedValue({ is_admin: false } as any);
    vi.mocked(adminSendOtp).mockResolvedValue({ ok: true } as any);
    vi.mocked(fetchProfile).mockResolvedValue(null);
    vi.mocked(fetchRentalHistory).mockResolvedValue([]);
    vi.mocked(hasAcknowledgedLatestHouseholdRules).mockReturnValue(true);
    vi.mocked(fetchPublicPlans).mockResolvedValue([]);
    vi.mocked(fetchMyHousehold).mockResolvedValue({
      household: {
        id: 'household-1',
        name: 'Saved address',
        status: 'active',
        app_variant: 'ghar',
        created_by_email: 'rushi@hoodie.app',
        created_at: '2026-04-01T00:00:00.000Z',
        address_snapshot: {
          timeline_entry_id: 'timeline-1',
          address: '12 Hoodie Street',
          display_address: '12 Hoodie Street',
          unit_number: '',
          suburb: 'Sydney',
          state: 'NSW',
          postcode: '2000',
          is_current: true,
        },
        members: [],
        invites: [],
        bills: [],
        chores: [],
        notifications: [],
        email_notifications: [],
        activity: [],
      },
      pending_invites: [],
      shared_bills: [],
      bill_contacts: [],
    });
    vi.mocked(createHousehold).mockResolvedValue({
      household: {
        id: 'household-created',
        name: 'Created household',
      },
      invite: null,
      share_url: '',
    } as any);
    vi.mocked(createRentalEntry).mockResolvedValue({
      id: 'timeline-new',
      email: 'rushi@hoodie.app',
      address: '12 Hoodie Street',
      display_address: '12 Hoodie Street',
      unit_number: '',
      building_id: '',
      state: 'NSW',
      postcode: '2000',
      start_date: '2026-04-26',
      end_date: '',
      is_current: true,
      landlord_name: '',
      monthly_rent: null,
      lat: null,
      lng: null,
      address_verified: true,
    } as any);
    Object.assign(appConfigState.config, {
      variant: 'ghar',
      experienceMode: 'hoodie',
      displayName: 'SETU India AU',
      supportEmail: 'ghar@example.com',
      webIcon: '/setu-icon.png',
      useSharedResourcesShell: true,
      showPartnershipBadge: false,
    });
    helpTourState.enabled = false;
    helpTourState.activeMode = null;
    helpTourState.activeStepId = null;
    helpTourState.restartTour.mockReset();
    platformState.nativeShell = false;
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

    document.body.innerHTML = '';
    window.localStorage.clear();
  });

  it('renders the Hoodie-style profile selector for SETU in hoodie mode', async () => {
    await renderProfileVault();

    expect(document.body.textContent).toContain('Profile section');
    expect(getButtonTexts().some((text) => text.includes('Evidence'))).toBe(false);

    await clickButton('Profile section');

    expect(document.body.textContent).toContain('Profile sections');
    expect(document.body.textContent).not.toContain('Featured section');
    expect(document.body.textContent).toContain('Expense Tracker');
    expect(getButtonTexts().some((text) => text.includes('Evidence'))).toBe(true);
  });

  it('keeps Timeline available in the SETU China profile drawer', async () => {
    Object.assign(appConfigState.config, {
      variant: 'setu_china',
      displayName: '留澳助手 AU',
      webIcon: '/setu-china-icon.png',
    });

    await renderProfileVault({ shellVariant: 'setu-china' });

    expect(document.body.textContent).toContain('Profile 我的');
    expect(document.body.textContent).toContain('Profile tool');

    await clickButton('Profile tool');

    expect(document.body.textContent).toContain('Profile tools');
    expect(getButtonTexts().some((text) => text.includes('Timeline'))).toBe(true);
    expect(getButtonTexts().some((text) => text.includes('Evidence'))).toBe(true);
  });

  it('renders the unframed MASCA acknowledgement in the Malaysia profile overview', async () => {
    await renderProfileVault({ initialTab: 'overview', shellVariant: 'setu-malaysia' });

    const acknowledgement = document.querySelector('[data-testid="masca-acknowledgement"]');
    expect(acknowledgement).toBeTruthy();
    expect(acknowledgement?.textContent).not.toContain('MASCA collaboration');
    expect(acknowledgement?.textContent).not.toContain(
      "This was made possible with the endless support and collaboration with the Malaysian Students' Council of Australia (MASCA).",
    );

    const link = acknowledgement?.querySelector('a') as HTMLAnchorElement | null;
    expect(link?.getAttribute('href')).toBe('https://www.ema.org.au/masca');
    expect(link?.getAttribute('target')).toBe('_blank');
    expect(link?.getAttribute('rel')).toContain('noopener');
    expect(link?.getAttribute('rel')).toContain('noreferrer');
    expect(link?.getAttribute('aria-label')).toBe('Learn more about MASCA');

    const lockup = acknowledgement?.querySelector('[data-testid="masca-partnership-lockup"]') as HTMLImageElement | null;
    expect(lockup).toBeTruthy();
    expect(lockup?.tagName).toBe('IMG');
    expect(lockup?.alt).toBe("In strategic partnership with MASCA, Malaysian Students' Council of Australia");

    const deleteButton = getButtonByText('Delete Account');
    const dataSources = getElementByExactText('Data & API Sources');
    expect(deleteButton?.compareDocumentPosition(acknowledgement!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(acknowledgement!.compareDocumentPosition(dataSources!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    expect(acknowledgement?.className).not.toMatch(/(?:^|\s)(?:bg-|border|rounded|shadow|ring)/);
  });

  it.each([
    ['default', undefined],
    ['SETU India', 'setu-india'],
    ['SETU China', 'setu-china'],
  ] as const)('does not render the MASCA acknowledgement for the %s profile shell', async (_label, shellVariant) => {
    await renderProfileVault({ initialTab: 'overview', shellVariant });

    expect(document.querySelector('[data-testid="masca-acknowledgement"]')).toBeNull();
    expect(document.querySelector('[data-testid="masca-partnership-lockup"]')).toBeNull();
    expect(document.body.textContent).not.toContain('MASCA collaboration');
  });

  it('renders profile drawer options as compact rows of three with Expense Tracker near the household entry', async () => {
    await renderProfileVault();

    await clickButton('Profile section');

    const drawerGrid = document.querySelector('.grid.grid-cols-3');
    const buttonTexts = getButtonTexts();
    const householdIndex = buttonTexts.findIndex((text) => text.includes('Household'));
    const expenseIndex = buttonTexts.findIndex((text) => text.includes('Expense Tracker'));

    expect(drawerGrid).toBeTruthy();
    expect(householdIndex).toBeGreaterThanOrEqual(0);
    expect(expenseIndex).toBe(householdIndex + 1);
  });

  it('places Expense Tracker next to Users for admin profile drawers', async () => {
    window.localStorage.setItem('ghar_admin', '1');
    await renderProfileVault();

    await clickButton('Profile section');

    const buttonTexts = getButtonTexts();
    const usersIndex = buttonTexts.findIndex((text) => text.includes('Users'));
    const expenseIndex = buttonTexts.findIndex((text) => text.includes('Expense Tracker'));

    expect(usersIndex).toBeGreaterThanOrEqual(0);
    expect(expenseIndex).toBe(usersIndex + 1);
  });

  it('opens Expense Tracker directly from the profile drawer when a household exists', async () => {
    await renderProfileVault();

    await clickButton('Profile section');
    await clickButton('Expense Tracker');
    await flushPromises();

    expect(document.querySelector('[data-testid="location-probe"]')?.textContent).toBe('/household/expenses');
  });

  it.each([
    ['household-bills', '/profile?tab=household&household_tab=bills'],
    ['household-chores', '/profile?tab=household&household_tab=chores'],
  ])('opens %s directly when a household exists', async (nextParam, expectedRoute) => {
    await renderProfileVault({
      initialEntry: `/profile?tab=household&household_tab=${nextParam === 'household-bills' ? 'bills' : 'chores'}&next=${nextParam}`,
    });
    await flushPromises();

    expect(document.querySelector('[data-testid="location-probe"]')?.textContent).toBe(expectedRoute);
  });

  it('brings existing members with pending house rules to the House Rules section on profile open', async () => {
    vi.mocked(hasAcknowledgedLatestHouseholdRules).mockReturnValue(false);

    await renderProfileVault({ initialEntry: '/profile?tab=evidence' });
    await flushPromises();

    expect(document.querySelector('[data-testid="location-probe"]')?.textContent).toBe('/profile?tab=household&household_tab=rules');
    expect(vi.mocked(hasAcknowledgedLatestHouseholdRules)).toHaveBeenCalledWith(expect.anything(), 'rushi@hoodie.app', 'Setu Member');
    expect(document.querySelector('[data-testid="household-profile-full-name"]')?.textContent).toBe('Setu Member');
  });

  it('starts household creation from Expense Tracker when only Timeline addresses exist', async () => {
    vi.mocked(fetchMyHousehold).mockResolvedValue({
      household: null,
      pending_invites: [],
      shared_bills: [],
      bill_contacts: [],
    });
    vi.mocked(fetchRentalHistory).mockResolvedValue([
      {
        id: 'timeline-1',
        email: 'rushi@hoodie.app',
        address: '12 Hoodie Street',
        display_address: '12 Hoodie Street',
        unit_number: '',
        building_id: '',
        state: 'NSW',
        postcode: '2000',
        start_date: '2026-04-01',
        end_date: '',
        is_current: true,
        landlord_name: '',
        monthly_rent: null,
        lat: null,
        lng: null,
        address_verified: true,
      } as any,
    ]);
    await renderProfileVault();

    await clickButton('Profile section');
    await clickButton('Expense Tracker');
    await flushPromises();

    expect(document.body.textContent).toContain('Create household');
    expect(document.body.textContent).toContain('12 Hoodie Street');
  });

  it('starts household creation from Bills when only Timeline addresses exist', async () => {
    vi.mocked(fetchMyHousehold).mockResolvedValue({
      household: null,
      pending_invites: [],
      shared_bills: [],
      bill_contacts: [],
    });
    vi.mocked(fetchRentalHistory).mockResolvedValue([
      {
        id: 'timeline-1',
        email: 'rushi@hoodie.app',
        address: '12 Hoodie Street',
        display_address: '12 Hoodie Street',
        unit_number: '',
        building_id: '',
        state: 'NSW',
        postcode: '2000',
        start_date: '2026-04-01',
        end_date: '',
        is_current: true,
        landlord_name: '',
        monthly_rent: null,
        lat: null,
        lng: null,
        address_verified: true,
      } as any,
    ]);

    await renderProfileVault({
      initialEntry: '/profile?tab=household&household_tab=bills&next=household-bills',
    });
    await flushPromises();

    expect(document.body.textContent).toContain('Create household');
    expect(document.body.textContent).toContain('12 Hoodie Street');
  });

  it('sends users without a Timeline address to add one for Expense Tracker setup', async () => {
    vi.mocked(fetchMyHousehold).mockResolvedValue({
      household: null,
      pending_invites: [],
      shared_bills: [],
      bill_contacts: [],
    });
    vi.mocked(fetchRentalHistory).mockResolvedValue([]);
    await renderProfileVault();

    await clickButton('Profile section');
    await clickButton('Expense Tracker');
    await flushPromises();

    expect(document.querySelector('[data-testid="location-probe"]')?.textContent).toBe('/profile?action=add-address&next=household-expenses');

    await renderProfileVault({
      initialEntry: '/profile?action=add-address&next=household-expenses',
      autoAddAddress: true,
    });
    expect(document.body.textContent).toContain('Add your home address first so Hoodie can create your household');
  });

  it('sends users without a Timeline address to add one before Chores setup', async () => {
    vi.mocked(fetchMyHousehold).mockResolvedValue({
      household: null,
      pending_invites: [],
      shared_bills: [],
      bill_contacts: [],
    });
    vi.mocked(fetchRentalHistory).mockResolvedValue([]);

    await renderProfileVault({
      initialEntry: '/profile?tab=household&household_tab=chores&next=household-chores',
    });
    await flushPromises();

    expect(document.querySelector('[data-testid="location-probe"]')?.textContent).toBe('/profile?action=add-address&next=household-chores');

    await renderProfileVault({
      initialEntry: '/profile?action=add-address&next=household-chores',
      autoAddAddress: true,
    });

    expect(document.body.textContent).toContain('Add your home address first so Hoodie can create your household and unlock Chores');
  });

  it('keeps the legacy tab strip in classic mode', async () => {
    appConfigState.config.experienceMode = 'classic';

    await renderProfileVault();

    expect(document.body.textContent).not.toContain('Profile section');
    expect(getButtonTexts().some((text) => text.includes('Evidence'))).toBe(true);
    expect(document.body.textContent).not.toContain('Profile sections');
  });

  it('auto-opens the profile drawer for SETU first-run onboarding in hoodie mode', async () => {
    helpTourState.enabled = true;
    helpTourState.activeMode = 'first_run';
    helpTourState.activeStepId = 'profile';

    await renderProfileVault();
    await flushPromises();

    expect(document.body.textContent).toContain('Profile sections');
    expect(document.body.textContent).toContain('Restart onboarding');
  });

  it('renders the household sub-section trigger directly after the profile selector in household mode', async () => {
    await renderProfileVault({ initialTab: 'household' });

    const buttonTexts = getButtonTexts();
    const profileSectionIndex = buttonTexts.findIndex((text) => text.includes('Profile section'));
    const householdSectionIndex = buttonTexts.findIndex((text) => text.includes('Household section'));

    expect(profileSectionIndex).toBeGreaterThanOrEqual(0);
    expect(householdSectionIndex).toBe(profileSectionIndex + 1);
  });

  it('opens the Hoodie admin verification modal without throwing', async () => {
    vi.mocked(adminCheck).mockResolvedValue({ is_admin: true } as any);

    await renderProfileVault({ initialTab: 'overview' });

    const adminTrigger = document.querySelector('button[aria-label="Hidden admin access trigger"]');
    expect(adminTrigger).toBeTruthy();

    for (let tap = 0; tap < 7; tap += 1) {
      await act(async () => {
        adminTrigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });
    }
    await flushPromises();

    expect(document.body.textContent).toContain('Admin Access');
    expect(document.body.textContent).toContain('Verification Code');
    expect(vi.mocked(adminSendOtp)).toHaveBeenCalledWith('rushi@hoodie.app');

    const adminModalOverlay = document.querySelector('[data-testid="admin-access-modal-overlay"]');
    expect(adminModalOverlay?.className).toContain('z-[10020]');
    expect(adminModalOverlay?.getAttribute('style')).toContain('app-bottom-nav-clearance');

    const adminModal = document.querySelector('[data-testid="admin-access-modal"]');
    expect(adminModal?.getAttribute('style')).toContain('app-bottom-nav-clearance');
  });

  it('keeps the auto-open evidence upload form scrollable above the bottom nav in native shell', async () => {
    platformState.nativeShell = true;

    await renderProfileVault({
      initialEntry: '/profile?action=add-evidence',
      autoAddEvidence: true,
    });

    expect(document.body.textContent).toContain('New Evidence Item');
    expect(document.body.textContent).toContain('Camera / Photos');

    const evidenceScroll = document.querySelector('[data-testid="evidence-list-scroll"]');
    expect(evidenceScroll?.getAttribute('style')).toContain('app-bottom-nav-clearance');
    expect(evidenceScroll?.getAttribute('style')).toContain('app-keyboard-inset');

    const uploadGrid = document.querySelector('[data-testid="evidence-upload-options"]');
    expect(uploadGrid?.className).toContain('grid-cols-[minmax(0,1fr)_minmax(0,1fr)]');

    const uploadFileButton = getButtonByText('Upload File');
    const cameraButton = getButtonByText('Camera / Photos');
    expect(uploadFileButton?.className).toContain('min-h-[64px]');
    expect(uploadFileButton?.className).toContain('min-w-0');
    expect(cameraButton?.className).toContain('min-h-[64px]');
    expect(cameraButton?.className).toContain('min-w-0');
  });

  it('uses mobile-safe date inputs in the add residence form', async () => {
    await renderProfileVault({
      initialEntry: '/profile?action=add-address',
      autoAddAddress: true,
    });

    const dateInputs = Array.from(document.querySelectorAll('input[type="date"]')) as HTMLInputElement[];
    expect(dateInputs).toHaveLength(2);
    expect(dateInputs[0].parentElement?.parentElement?.className).toContain('grid-cols-[minmax(0,1fr)_minmax(0,1fr)]');

    for (const input of dateInputs) {
      expect(input.className).toContain('min-w-0');
      expect(input.className).toContain('max-w-full');
      expect(input.className).toContain('h-11');
      expect(input.className).toContain('px-2.5');
    }
  });

  it('uses mobile-safe date inputs in the edit residence form', async () => {
    vi.mocked(fetchRentalHistory).mockResolvedValue([
      {
        id: 'timeline-1',
        email: 'rushi@hoodie.app',
        address: '12 Hoodie Street',
        display_address: '12 Hoodie Street',
        unit_number: '',
        building_id: '',
        state: 'NSW',
        postcode: '2000',
        start_date: '2026-04-01',
        end_date: '',
        is_current: true,
        landlord_name: '',
        monthly_rent: null,
        lat: null,
        lng: null,
        address_verified: true,
      } as any,
    ]);

    await renderProfileVault({ initialTab: 'timeline' });

    const editButton = document.querySelector('button[title="Edit residence"]');
    expect(editButton).toBeTruthy();
    await act(async () => {
      editButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const dateInputs = Array.from(document.querySelectorAll('input[type="date"]')) as HTMLInputElement[];
    expect(dateInputs).toHaveLength(2);
    expect(dateInputs[0].parentElement?.parentElement?.className).toContain('grid-cols-[minmax(0,1fr)_minmax(0,1fr)]');

    for (const input of dateInputs) {
      expect(input.className).toContain('min-w-0');
      expect(input.className).toContain('max-w-full');
      expect(input.className).toContain('h-11');
      expect(input.className).toContain('px-2.5');
    }
  });
});
