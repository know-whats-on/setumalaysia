// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchLegalCases, fetchProfile, fetchRentalHistory } from '../lib/api';
import { LegalCenter } from './legal-center';

const appConfigState = vi.hoisted(() => ({
  config: {
    variant: 'burb_mate',
    experienceMode: 'hoodie',
    displayName: 'Hoodie',
    assistantName: 'Hoodienie',
    resourcesLabel: 'Hoodienie',
    resourcesRoute: '/arrival',
    useSharedResourcesShell: true,
    showSetuFeatures: false,
  },
}));

vi.mock('../lib/app-config', () => ({
  APP_CONFIG: appConfigState.config,
}));

vi.mock('../lib/api', () => ({
  fetchLegalCases: vi.fn(),
  createLegalCase: vi.fn(),
  updateLegalCase: vi.fn(),
  deleteLegalCase: vi.fn(),
  fetchRentalHistory: vi.fn(),
  fetchProfile: vi.fn(),
}));

vi.mock('../lib/setu-pdf', () => ({
  downloadSetuPdf: vi.fn(),
}));

vi.mock('../assets/hoodienie.svg', () => ({
  default: '/hoodienie.svg',
}));

vi.mock('./triage-center', () => ({
  TriageCenter: () => <div data-testid="stale-triage-modal">Stale assistant modal</div>,
}));

vi.mock('./sponsor-companies-directory', () => ({
  SponsorCompaniesDirectory: () => <div data-testid="sponsor-companies-viewer" />,
}));

vi.mock('./pr-points-calculator-tool', () => ({
  PrPointsCalculatorTool: () => <div data-testid="pr-points-tool" />,
}));

vi.mock('./occupations-tool', () => ({
  OccupationsTool: () => <div data-testid="occupations-tool" />,
}));

vi.mock('./application-kit-tool', () => ({
  ApplicationKitTool: () => <div data-testid="application-kit-tool" />,
}));

vi.mock('./scam-checker-tool', () => ({
  ScamCheckerTool: () => <div data-testid="scam-checker-tool" />,
}));

vi.mock('./nsw-rent-check-tool', () => ({
  NswRentCheckTool: () => <div data-testid="nsw-rent-check-tool" />,
}));

vi.mock('./hoodie-help-tour', () => ({
  HoodieHelpTrigger: ({ title }: { title?: string }) => (
    <button type="button" aria-label={title || 'Open onboarding video'}>?</button>
  ),
}));

vi.mock('jspdf', () => ({
  jsPDF: vi.fn(() => ({
    addPage: vi.fn(),
    save: vi.fn(),
    setFontSize: vi.fn(),
    text: vi.fn(),
    splitTextToSize: vi.fn((text: string) => [text]),
  })),
}));

type MountedComponent = {
  container: HTMLDivElement;
  root: Root;
};

const mountedComponents: MountedComponent[] = [];

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location-display">{location.pathname}</div>;
}

async function flushAsync() {
  for (let index = 0; index < 8; index += 1) {
    await act(async () => {
      await Promise.resolve();
    });
  }
}

async function renderLegalCenter() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  mountedComponents.push({ container, root });

  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={['/legal?section=legal']}>
        <LocationDisplay />
        <Routes>
          <Route path="/legal" element={<LegalCenter evidence={[]} listings={[]} />} />
          <Route path="/arrival" element={<div>Arrival section</div>} />
        </Routes>
      </MemoryRouter>,
    );
  });
  await flushAsync();

  return container;
}

function getButtonByText(container: ParentNode, label: string) {
  return Array.from(container.querySelectorAll('button')).find(
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

beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  Object.assign(appConfigState.config, {
    variant: 'burb_mate',
    experienceMode: 'hoodie',
    displayName: 'Hoodie',
    assistantName: 'Hoodienie',
    resourcesLabel: 'Hoodienie',
    resourcesRoute: '/arrival',
    useSharedResourcesShell: true,
    showSetuFeatures: false,
  });
  window.localStorage.clear();
  window.localStorage.setItem('ghar_email', 'rushi@hoodie.app');
  vi.mocked(fetchLegalCases).mockResolvedValue([]);
  vi.mocked(fetchRentalHistory).mockResolvedValue([]);
  vi.mocked(fetchProfile).mockResolvedValue({ australian_state: 'NSW' } as any);
});

afterEach(() => {
  for (const mounted of mountedComponents.splice(0)) {
    act(() => mounted.root.unmount());
    mounted.container.remove();
  }
  vi.clearAllMocks();
  window.localStorage.clear();
});

describe('LegalCenter assistant route card', () => {
  it('opens the real Hoodienie section instead of the stale modal', async () => {
    const container = await renderLegalCenter();

    await clickButtonByText(container, 'Ask Hoodienie');

    expect(container.querySelector('[data-testid="location-display"]')?.textContent).toBe('/arrival');
    expect(container.querySelector('[data-testid="stale-triage-modal"]')).toBeFalsy();
  });

  it('opens the real Gendu section instead of the stale modal', async () => {
    Object.assign(appConfigState.config, {
      variant: 'ghar',
      displayName: 'SETU India AU',
      assistantName: 'Gendu',
      resourcesLabel: 'Resources',
      resourcesRoute: '/legal?section=legal',
      showSetuFeatures: true,
    });
    const container = await renderLegalCenter();

    await clickButtonByText(container, 'Ask Gendu');

    expect(container.querySelector('[data-testid="location-display"]')?.textContent).toBe('/arrival');
    expect(container.querySelector('[data-testid="stale-triage-modal"]')).toBeFalsy();
  });
});
