// @vitest-environment jsdom

import { act, useEffect, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { fetchCityGuidesMock, fetchProfileMock, fetchRentalHistoryMock, mediaPlayMock } = vi.hoisted(() => ({
  fetchCityGuidesMock: vi.fn(),
  fetchProfileMock: vi.fn(),
  fetchRentalHistoryMock: vi.fn(),
  mediaPlayMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../lib/api', () => ({
  fetchCityGuides: fetchCityGuidesMock,
  fetchProfile: fetchProfileMock,
  fetchRentalHistory: fetchRentalHistoryMock,
}));

vi.mock('../lib/app-config', () => ({
  APP_CONFIG: {
    variant: 'burb_mate',
    experienceMode: 'hoodie',
    showVideoOnboarding: true,
    shareBaseUrl: 'https://share.example.com',
    showVibeGuides: true,
    defaultVibeTab: 'my-hood',
    vibeGuidesLabel: "My 'hood",
    urlScheme: 'com.burbmate.app',
  },
  getAppConfig: (variant: 'burb_mate' | 'ghar') => ({
    variant,
    experienceMode: 'hoodie',
    showVideoOnboarding: true,
    shareBaseUrl: 'https://share.example.com',
    showVibeGuides: true,
    defaultVibeTab: 'my-hood',
    vibeGuidesLabel: "My 'hood",
    urlScheme: variant === 'ghar' ? 'com.ghar.mobile' : 'com.burbmate.app',
  }),
}));

vi.mock('../lib/app-variant', () => ({
  APP_VARIANT: 'burb_mate',
}));

vi.mock('../components/layout', () => ({
  useGharData: () => ({
    bulletins: [],
    banners: [],
  }),
}));

vi.mock('./share/hoodie-share-actions', () => ({
  HoodieShareActions: () => <div data-testid="guide-share-actions" />,
}));

vi.mock('./figma/ImageWithFallback', () => ({
  ImageWithFallback: ({ alt, ...props }: any) => <img alt={alt} {...props} />,
}));

vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

import {
  HoodieHelpTourProvider,
  HoodieHelpTrigger,
  useHoodieHelpTour,
} from './hoodie-help-tour';
import { buildHoodieHelpCompletionStorageKey } from '../lib/hoodie-help-tour';
import { VibePage } from '../pages/vibe-page';

type MountedComponent = {
  container: HTMLDivElement;
  root: Root;
};

const mountedComponents: MountedComponent[] = [];

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location-display">{`${location.pathname}${location.search}`}</div>;
}

function DashboardHarness() {
  const { reportTripPlannerOpen, shouldAutoOpenTripPlanner } = useHoodieHelpTour();

  useEffect(() => {
    reportTripPlannerOpen(shouldAutoOpenTripPlanner);
    return () => {
      reportTripPlannerOpen(false);
    };
  }, [reportTripPlannerOpen, shouldAutoOpenTripPlanner]);

  return <div>Dashboard</div>;
}

function DelayedTripPlannerDashboardHarness() {
  const { reportTripPlannerOpen, shouldAutoOpenTripPlanner } = useHoodieHelpTour();

  useEffect(() => {
    reportTripPlannerOpen(false);
    return () => {
      reportTripPlannerOpen(false);
    };
  }, [reportTripPlannerOpen]);

  return (
    <div>
      <div data-testid="trip-planner-auto-open">
        {shouldAutoOpenTripPlanner ? 'pending-open' : 'idle'}
      </div>
      <button
        type="button"
        aria-label="Open trip planner surface"
        onClick={() => reportTripPlannerOpen(true)}
      >
        Open trip planner surface
      </button>
    </div>
  );
}

function VibeHarness() {
  return (
    <div>
      <span>Vibe Screen</span>
      <HoodieHelpTrigger stepId="vibe" title="Replay vibe help" />
    </div>
  );
}

function ProfileHarness() {
  const { restartTour } = useHoodieHelpTour();

  return (
    <div>
      <span>Profile Screen</span>
      <HoodieHelpTrigger stepId="profile" title="Replay profile help" />
      <button type="button" aria-label="Restart onboarding" onClick={restartTour}>
        Restart onboarding
      </button>
    </div>
  );
}

async function renderHelpTour(initialEntries: string[]) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  mountedComponents.push({ container, root });

  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={initialEntries}>
        <HoodieHelpTourProvider>
          <LocationDisplay />
          <Routes>
            <Route path="/dashboard" element={<DashboardHarness />} />
            <Route path="/shopping" element={<div>Shopping</div>} />
            <Route path="/fuel" element={<div>Fuel</div>} />
            <Route path="/vibe" element={<VibeHarness />} />
            <Route path="/arrival" element={<div>Arrival</div>} />
            <Route path="/legal" element={<div>Resources</div>} />
            <Route path="/profile" element={<ProfileHarness />} />
          </Routes>
        </HoodieHelpTourProvider>
      </MemoryRouter>,
    );
    await Promise.resolve();
  });

  return container;
}

async function renderHelpTourWithDashboard(
  initialEntries: string[],
  dashboardElement: ReactNode,
) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  mountedComponents.push({ container, root });

  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={initialEntries}>
        <HoodieHelpTourProvider>
          <LocationDisplay />
          <Routes>
            <Route path="/dashboard" element={dashboardElement} />
            <Route path="/shopping" element={<div>Shopping</div>} />
            <Route path="/fuel" element={<div>Fuel</div>} />
            <Route path="/vibe" element={<VibeHarness />} />
            <Route path="/arrival" element={<div>Arrival</div>} />
            <Route path="/legal" element={<div>Resources</div>} />
            <Route path="/profile" element={<ProfileHarness />} />
          </Routes>
        </HoodieHelpTourProvider>
      </MemoryRouter>,
    );
    await Promise.resolve();
  });

  return container;
}

async function renderHelpTourWithRealVibe(initialEntries: string[]) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  mountedComponents.push({ container, root });

  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={initialEntries}>
        <HoodieHelpTourProvider>
          <LocationDisplay />
          <Routes>
            <Route path="/dashboard" element={<DashboardHarness />} />
            <Route path="/shopping" element={<div>Shopping</div>} />
            <Route path="/fuel" element={<div>Fuel</div>} />
            <Route path="/vibe" element={<VibePage />} />
            <Route path="/arrival" element={<div>Arrival</div>} />
            <Route path="/legal" element={<div>Resources</div>} />
            <Route path="/profile" element={<ProfileHarness />} />
          </Routes>
        </HoodieHelpTourProvider>
      </MemoryRouter>,
    );
    await Promise.resolve();
  });

  return container;
}

function getLocationText() {
  return document.querySelector('[data-testid="location-display"]')?.textContent || '';
}

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

async function flushPromises() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

async function clickButton(label: string) {
  const button = document.querySelector(`button[aria-label="${label}"]`);
  expect(button).toBeTruthy();
  await act(async () => {
    button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await Promise.resolve();
  });
}

describe('HoodieHelpTourProvider', () => {
  beforeEach(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    document.body.innerHTML = '';
    window.localStorage.clear();
    fetchCityGuidesMock.mockReset();
    fetchProfileMock.mockReset();
    fetchRentalHistoryMock.mockReset();
    fetchCityGuidesMock.mockResolvedValue([]);
    fetchProfileMock.mockResolvedValue({});
    fetchRentalHistoryMock.mockResolvedValue([]);
    mediaPlayMock.mockReset();
    mediaPlayMock.mockResolvedValue(undefined);
    Object.defineProperty(HTMLMediaElement.prototype, 'play', {
      configurable: true,
      writable: true,
      value: mediaPlayMock,
    });
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

  it('runs the first-run onboarding from the assistant through map subsections and finishes on household', async () => {
    const email = 'tour@example.com';
    window.localStorage.setItem('ghar_email', email);

    await renderHelpTour(['/arrival']);

    expect(document.querySelector('button[aria-label="Skip onboarding"]')).toBeTruthy();
    expect(document.querySelector('button[aria-label="Next onboarding step"]')).toBeTruthy();
    expect(getLocationText()).toBe('/arrival');
    expect(document.querySelector<HTMLVideoElement>('[data-testid="hoodie-help-video"]')?.src).toContain(
      '/onboarding-videos/assistant.mp4',
    );

    await clickButton('Next onboarding step');
    expect(getLocationText()).toBe('/dashboard');

    await clickButton('Next onboarding step');
    expect(getLocationText()).toBe('/shopping?retailer=compare');

    await clickButton('Next onboarding step');
    expect(getLocationText()).toBe('/dashboard');

    await clickButton('Next onboarding step');
    expect(getLocationText()).toBe('/fuel');

    await clickButton('Next onboarding step');
    expect(getLocationText()).toBe('/vibe');

    await clickButton('Next onboarding step');
    expect(getLocationText()).toBe('/legal?section=legal');

    await clickButton('Next onboarding step');
    expect(getLocationText()).toBe('/profile');
    expect(document.querySelector('button[aria-label="Next onboarding step"]')).toBeTruthy();

    await clickButton('Next onboarding step');
    expect(getLocationText()).toBe('/profile?tab=household');
    expect(document.querySelector('button[aria-label="Finish onboarding"]')).toBeTruthy();

    await clickButton('Finish onboarding');

    expect(document.querySelector('[data-testid="hoodie-help-bubble"]')).toBeNull();
    expect(window.localStorage.getItem(buildHoodieHelpCompletionStorageKey(email, 'burb_mate'))).toBe('true');
  });

  it('opens replay mode with mute and close buttons and lets the bubble move', async () => {
    const email = 'replay@example.com';
    window.localStorage.setItem('ghar_email', email);
    window.localStorage.setItem(buildHoodieHelpCompletionStorageKey(email, 'burb_mate'), 'true');

    await renderHelpTour(['/vibe']);

    await clickButton('Replay vibe help');
    await flushPromises();

    expect(document.querySelector('button[aria-label="Mute video"]')).toBeTruthy();
    expect(document.querySelector('button[aria-label="Close video"]')).toBeTruthy();
    expect(document.querySelector('button[aria-label="Next onboarding step"]')).toBeNull();
    expect(document.querySelector('button[aria-label="Finish onboarding"]')).toBeNull();

    const bubble = document.querySelector<HTMLElement>('[data-testid="hoodie-help-bubble"]');
    const draggableSurface = bubble?.querySelector<HTMLElement>('[role="dialog"]');
    expect(bubble).toBeTruthy();
    expect(draggableSurface).toBeTruthy();
    expect(draggableSurface?.getAttribute('data-video-format')).toBe('short');
    const video = document.querySelector<HTMLVideoElement>('[data-testid="hoodie-help-video"]');
    expect(video).toBeTruthy();
    expect(video?.src).toContain('/onboarding-videos/vibe.mp4');
    expect(document.querySelector('[data-testid="hoodie-help-video-iframe"]')).toBeNull();
    const initialTransform = bubble?.style.transform;

    await act(async () => {
      draggableSurface?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 240, clientY: 200 }));
      window.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 180, clientY: 260 }));
      window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
      await Promise.resolve();
    });

    expect(bubble?.style.transform).not.toBe(initialTransform);

    await clickButton('Close video');
    expect(document.querySelector('[data-testid="hoodie-help-bubble"]')).toBeNull();
  });

  it('mounts the onboarding player immediately with unmuted audio, close, and next controls', async () => {
    const email = 'immediate-player@example.com';
    window.localStorage.setItem('ghar_email', email);

    await renderHelpTour(['/arrival']);
    await flushPromises();

    const video = document.querySelector<HTMLVideoElement>('[data-testid="hoodie-help-video"]');
    expect(video).toBeTruthy();
    expect(document.querySelector('[data-testid="hoodie-help-countdown"]')).toBeNull();
    expect(document.querySelector('[data-testid="hoodie-help-video-iframe"]')).toBeNull();
    expect(document.querySelector('button[aria-label="Mute video"]')).toBeTruthy();
    expect(document.querySelector('button[aria-label="Skip onboarding"]')).toBeTruthy();
    expect(document.querySelector('button[aria-label="Next onboarding step"]')).toBeTruthy();
    expect(video?.src).toContain('/onboarding-videos/assistant.mp4');
    expect(video?.hasAttribute('controls')).toBe(false);
    expect(video?.loop).toBe(false);
    expect(video?.muted).toBe(false);
    expect(document.querySelector('[role="dialog"]')?.getAttribute('data-video-format')).toBe('short');
    expect(mediaPlayMock).toHaveBeenCalled();
  });

  it('keeps the player mounted and updates the step video immediately when onboarding advances', async () => {
    const email = 'step-player-reset@example.com';
    window.localStorage.setItem('ghar_email', email);

    await renderHelpTour(['/arrival']);
    await flushPromises();

    await clickButton('Next onboarding step');

    expect(getLocationText()).toBe('/dashboard');
    const video = document.querySelector<HTMLVideoElement>('[data-testid="hoodie-help-video"]');
    expect(video).toBeTruthy();
    expect(video?.src).toContain('/onboarding-videos/map.mp4');
  });

  it('toggles mute through the external action dock on the local video element', async () => {
    const email = 'mute-toggle@example.com';
    window.localStorage.setItem('ghar_email', email);

    await renderHelpTour(['/arrival']);
    await flushPromises();

    const video = document.querySelector<HTMLVideoElement>('[data-testid="hoodie-help-video"]');
    expect(video?.muted).toBe(false);

    await clickButton('Mute video');
    expect(document.querySelector('button[aria-label="Unmute video"]')).toBeTruthy();
    expect(document.querySelector<HTMLVideoElement>('[data-testid="hoodie-help-video"]')?.muted).toBe(true);

    await clickButton('Unmute video');
    expect(document.querySelector('button[aria-label="Mute video"]')).toBeTruthy();
    expect(document.querySelector<HTMLVideoElement>('[data-testid="hoodie-help-video"]')?.muted).toBe(false);
  });

  it('shows an in-bubble replay button after the local video ends', async () => {
    const email = 'video-ended@example.com';
    window.localStorage.setItem('ghar_email', email);

    await renderHelpTour(['/arrival']);
    await flushPromises();

    const video = document.querySelector<HTMLVideoElement>('[data-testid="hoodie-help-video"]');
    expect(video).toBeTruthy();

    await act(async () => {
      video?.dispatchEvent(new Event('ended', { bubbles: true }));
      await Promise.resolve();
    });

    expect(document.querySelector('button[aria-label="Replay onboarding video"]')).toBeTruthy();
    const callsBeforeReplay = mediaPlayMock.mock.calls.length;

    await clickButton('Replay onboarding video');

    expect(document.querySelector('button[aria-label="Replay onboarding video"]')).toBeNull();
    expect(mediaPlayMock.mock.calls.length).toBeGreaterThan(callsBeforeReplay);
  });

  it('keeps the onboarding bubble active when advancing from assistant to map', async () => {
    const email = 'vibe-next@example.com';
    window.localStorage.setItem('ghar_email', email);

    await renderHelpTour(['/arrival']);

    expect(getLocationText()).toBe('/arrival');
    expect(document.querySelector('[data-testid="hoodie-help-bubble"]')).toBeTruthy();
    expect(document.querySelector('button[aria-label="Next onboarding step"]')).toBeTruthy();
    expect(document.querySelector<HTMLVideoElement>('[data-testid="hoodie-help-video"]')?.src).toContain(
      '/onboarding-videos/assistant.mp4',
    );

    await clickButton('Next onboarding step');

    expect(getLocationText()).toBe('/dashboard');
    expect(document.querySelector('[data-testid="hoodie-help-bubble"]')).toBeTruthy();
    expect(document.querySelector('button[aria-label="Next onboarding step"]')).toBeTruthy();
    expect(document.querySelector<HTMLVideoElement>('[data-testid="hoodie-help-video"]')?.src).toContain(
      '/onboarding-videos/map.mp4',
    );
  });

  it('does not let late guide-loading URL updates block the vibe to resources transition', async () => {
    const email = 'vibe-guides-race@example.com';
    const profileDeferred = createDeferred<{ australian_state: string }>();
    window.localStorage.setItem('ghar_email', email);
    fetchProfileMock.mockReturnValue(profileDeferred.promise);
    fetchRentalHistoryMock.mockResolvedValue([]);
    fetchCityGuidesMock.mockResolvedValue([]);

    await renderHelpTourWithRealVibe(['/arrival']);

    await clickButton('Next onboarding step');
    await clickButton('Next onboarding step');
    await clickButton('Next onboarding step');
    await clickButton('Next onboarding step');
    await clickButton('Next onboarding step');

    expect(getLocationText()).toBe('/vibe');
    expect(document.body.textContent).toContain('Suburb Stats');
    expect(document.body.textContent).not.toContain('Vibe Matchmaker');
    expect(document.body.textContent).not.toContain('Suburb Score');

    await clickButton('Next onboarding step');
    expect(getLocationText()).toBe('/legal?section=legal');

    await act(async () => {
      profileDeferred.resolve({ australian_state: 'NSW' });
      await profileDeferred.promise;
    });
    await flushPromises();

    expect(getLocationText()).toBe('/legal?section=legal');
    expect(document.querySelector('[data-testid="hoodie-help-bubble"]')).toBeTruthy();
  });

  it('waits for the trip planner surface before switching the onboarding bubble', async () => {
    const email = 'trip-planner-pending@example.com';
    window.localStorage.setItem('ghar_email', email);

    await renderHelpTourWithDashboard(['/arrival'], <DelayedTripPlannerDashboardHarness />);

    await clickButton('Next onboarding step');
    expect(getLocationText()).toBe('/dashboard');

    await clickButton('Next onboarding step');
    expect(getLocationText()).toBe('/shopping?retailer=compare');

    await clickButton('Next onboarding step');

    expect(getLocationText()).toBe('/dashboard');
    expect(document.querySelector('[data-testid="trip-planner-auto-open"]')?.textContent).toBe('pending-open');
    expect(document.querySelector('[data-testid="hoodie-help-bubble"]')).toBeNull();

    await clickButton('Open trip planner surface');

    expect(document.querySelector('[data-testid="hoodie-help-bubble"]')).toBeTruthy();
    expect(document.querySelector('[role="dialog"]')?.getAttribute('aria-label')).toBe(
      'Trip Planner onboarding video',
    );
    expect(document.querySelector<HTMLVideoElement>('[data-testid="hoodie-help-video"]')?.src).toContain(
      '/onboarding-videos/trip-planner.mp4',
    );
  });

  it('restarts the full tour from profile without clearing the completion key', async () => {
    const email = 'restart@example.com';
    const completionKey = buildHoodieHelpCompletionStorageKey(email, 'burb_mate');
    window.localStorage.setItem('ghar_email', email);
    window.localStorage.setItem(completionKey, 'true');

    await renderHelpTour(['/profile']);

    await clickButton('Restart onboarding');

    expect(getLocationText()).toBe('/arrival');
    expect(document.querySelector('button[aria-label="Skip onboarding"]')).toBeTruthy();
    expect(document.querySelector('button[aria-label="Next onboarding step"]')).toBeTruthy();
    expect(window.localStorage.getItem(completionKey)).toBe('true');

    await clickButton('Next onboarding step');
    expect(getLocationText()).toBe('/dashboard');

    await clickButton('Next onboarding step');
    expect(getLocationText()).toBe('/shopping?retailer=compare');
    expect(document.querySelector('[data-testid="hoodie-help-bubble"]')).toBeTruthy();
  });

  it('keeps the profile trigger as a section-only replay', async () => {
    const email = 'profile-replay@example.com';
    window.localStorage.setItem('ghar_email', email);
    window.localStorage.setItem(buildHoodieHelpCompletionStorageKey(email, 'burb_mate'), 'true');

    await renderHelpTour(['/profile']);

    await clickButton('Replay profile help');

    expect(getLocationText()).toBe('/profile');
    expect(document.querySelector('button[aria-label="Close video"]')).toBeTruthy();
    expect(document.querySelector('button[aria-label="Next onboarding step"]')).toBeNull();
    expect(document.querySelector('button[aria-label="Finish onboarding"]')).toBeNull();
    expect(document.querySelector<HTMLVideoElement>('[data-testid="hoodie-help-video"]')?.src).toContain(
      '/onboarding-videos/profile.mp4',
    );
  });
});
