// @vitest-environment jsdom

import { act, useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mediaPlayMock } = vi.hoisted(() => ({
  mediaPlayMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../lib/app-config', () => ({
  APP_CONFIG: {
    variant: 'ghar',
    experienceMode: 'hoodie',
    showVideoOnboarding: true,
    urlScheme: 'com.ghar.mobile',
  },
  getAppConfig: (variant: 'burb_mate' | 'ghar') => ({
    variant,
    experienceMode: 'hoodie',
    showVideoOnboarding: true,
    urlScheme: variant === 'ghar' ? 'com.ghar.mobile' : 'com.burbmate.app',
  }),
}));

import { HoodieHelpTourProvider, useHoodieHelpTour } from './hoodie-help-tour';
import { buildHoodieHelpCompletionStorageKey } from '../lib/hoodie-help-tour';

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

function ProfileHarness() {
  const { restartTour } = useHoodieHelpTour();

  return (
    <button type="button" aria-label="Restart onboarding" onClick={restartTour}>
      Restart onboarding
    </button>
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
            <Route path="/vibe" element={<div>Vibe</div>} />
            <Route path="/arrival" element={<div>Arrival</div>} />
            <Route path="/legal" element={<div>Resources</div>} />
            <Route path="/profile" element={<ProfileHarness />} />
          </Routes>
        </HoodieHelpTourProvider>
      </MemoryRouter>,
    );
    await Promise.resolve();
  });
}

function getLocationText() {
  return document.querySelector('[data-testid="location-display"]')?.textContent || '';
}

async function clickButton(label: string) {
  const button = document.querySelector(`button[aria-label="${label}"]`);
  expect(button).toBeTruthy();
  await act(async () => {
    button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await Promise.resolve();
  });
}

describe('HoodieHelpTourProvider in SETU variant', () => {
  beforeEach(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    document.body.innerHTML = '';
    window.localStorage.clear();
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

  it('restarts onboarding from profile using the SETU completion key', async () => {
    const email = 'setu-restart@example.com';
    const completionKey = buildHoodieHelpCompletionStorageKey(email, 'ghar');
    window.localStorage.setItem('ghar_email', email);
    window.localStorage.setItem(completionKey, 'true');

    await renderHelpTour(['/profile']);

    await clickButton('Restart onboarding');

    expect(getLocationText()).toBe('/arrival');
    expect(document.querySelector('button[aria-label="Skip onboarding"]')).toBeTruthy();
    expect(document.querySelector('button[aria-label="Next onboarding step"]')).toBeTruthy();
    expect(window.localStorage.getItem(completionKey)).toBe('true');
  });

  it('uses the local assistant video and SETU-specific label for the shared assistant step', async () => {
    const email = 'setu-yatri@example.com';
    window.localStorage.setItem('ghar_email', email);

    await renderHelpTour(['/arrival']);

    expect(getLocationText()).toBe('/arrival');
    expect(document.querySelector('[role="dialog"]')?.getAttribute('aria-label')).toBe(
      'Gendu onboarding video',
    );
    const video = document.querySelector<HTMLVideoElement>('[data-testid="hoodie-help-video"]');
    expect(video?.src).toContain('/onboarding-videos/assistant.mp4');
    expect(mediaPlayMock).toHaveBeenCalled();
  });
});
