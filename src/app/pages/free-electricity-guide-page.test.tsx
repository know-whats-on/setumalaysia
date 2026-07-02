// @vitest-environment jsdom

import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Browser } from '@capacitor/browser';
import { FreeElectricityGuidePage } from './free-electricity-guide-page';
import { SetuPage } from './setu-page';
import { fetchProfile } from '../lib/api';
import {
  fetchSetuFaqCategories,
  fetchSetuFaqs,
  fetchSetuUniversities,
} from '../lib/setu-api';
import {
  AER_DMO_FINAL_DETERMINATION_SOURCE_URL,
  AER_SOLAR_SHARER_SOURCE_URL,
  FREE_ELECTRICITY_GUIDE_ROUTE,
  VICTORIA_FREE_POWER_SOURCE_URL,
  freeElectricityGuideCities,
} from '../lib/free-electricity-guide';

vi.mock('@capacitor/browser', () => ({
  Browser: {
    open: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../lib/api', () => ({
  fetchProfile: vi.fn(),
}));

vi.mock('../lib/setu-api', () => ({
  fetchSetuFaqCategories: vi.fn(),
  fetchSetuFaqs: vi.fn(),
  fetchSetuUniversities: vi.fn(),
  generateSetuChecklist: vi.fn(),
}));

vi.mock('../hooks/use-setu-checklist-progress', () => ({
  useSetuChecklistProgress: () => ({
    progress: null,
    isLoading: false,
    initializeProgress: vi.fn(),
    toggleItem: vi.fn(),
    clearProgress: vi.fn(),
    getCompletionPercentage: () => 0,
    isItemCompleted: () => false,
    getCompletedCount: () => 0,
  }),
}));

vi.mock('../components/setu/setu-checklist-generator', () => ({
  SetuChecklistGenerator: () => <div data-testid="setu-checklist-generator" />,
}));

vi.mock('../components/setu/setu-personalized-checklist', () => ({
  SetuPersonalizedChecklist: () => <div data-testid="setu-personalized-checklist" />,
}));

vi.mock('../components/setu/setu-disclaimer-card', () => ({
  SetuDisclaimerCard: () => <div data-testid="setu-disclaimer-card" />,
}));

vi.mock('../components/setu/setu-faq-pdf-button', () => ({
  SetuFaqPdfButton: () => <button type="button">Download FAQ Guide</button>,
}));

vi.mock('../components/setu/setu-markdown', () => ({
  SetuMarkdown: ({ content }: { content: string }) => <div>{content}</div>,
}));

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

async function renderWithRouter(element: ReactNode, initialPath = FREE_ELECTRICITY_GUIDE_ROUTE) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  mountedComponents.push({ container, root });

  await act(async () => {
    root.render(<MemoryRouter initialEntries={[initialPath]}>{element}</MemoryRouter>);
  });
  await flushAsync();

  return container;
}

beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  window.localStorage.clear();
  window.localStorage.setItem('ghar_email', 'student@example.com');
  vi.mocked(fetchProfile).mockResolvedValue(null as any);
  vi.mocked(fetchSetuFaqCategories).mockResolvedValue([]);
  vi.mocked(fetchSetuFaqs).mockResolvedValue([]);
  vi.mocked(fetchSetuUniversities).mockResolvedValue([]);
});

afterEach(() => {
  for (const mounted of mountedComponents.splice(0)) {
    act(() => mounted.root.unmount());
    mounted.container.remove();
  }
  vi.clearAllMocks();
  window.localStorage.clear();
});

describe('FreeElectricityGuidePage', () => {
  it('renders the verified city guide, caveats, and official source links', async () => {
    const container = await renderWithRouter(<FreeElectricityGuidePage />);

    expect(container.textContent).toContain('3 Hours Daily Free Electricity in Australia: 2026 City Guide');
    expect(container.textContent).toContain('Updated: 30 May 2026');
    expect(container.textContent).toContain('Sydney / NSW');
    expect(container.textContent).toContain('Brisbane / QLD');
    expect(container.textContent).toContain('Adelaide / SA');
    expect(container.textContent).toContain('Melbourne / VIC');
    expect(container.textContent).toContain('Perth / WA');
    expect(container.textContent).toContain('24 kWh');
    expect(container.textContent).toContain('Embedded networks are excluded from the federal Solar Sharer offer.');
    expect(container.textContent).not.toContain('most states');

    expect(container.querySelector('#sydney')).toBeTruthy();
    expect(container.querySelector('#canberra')).toBeTruthy();
    expect(
      container.querySelector(
        'a[href="https://www.dcceew.gov.au/about/news/latest-default-market-offer-free-power-option"]',
      ),
    ).toBeTruthy();
    expect(
      container.querySelector(
        'a[href="https://www.aer.gov.au/documents/aer-solar-sharer-offer-fact-sheet-dmo-8-final-determination"]',
      ),
    ).toBeTruthy();
    expect(
      container.querySelector('a[href="https://www.premier.vic.gov.au/best-midday-power-offer-country"]'),
    ).toBeTruthy();
  });

  it('renders a compact clickable city table without duplicate city navigation or status column', async () => {
    const container = await renderWithRouter(<FreeElectricityGuidePage />);
    const headerLabels = Array.from(container.querySelectorAll('thead th')).map((header) =>
      header.textContent?.trim(),
    );

    expect(container.textContent).toContain('Confirmed');
    expect(container.textContent).toContain('Not confirmed / check retailer');
    expect(container.textContent).not.toContain('✅');
    expect(container.textContent).not.toContain('❓');
    expect(container.querySelectorAll('[data-testid="free-electricity-status-confirmed"]').length).toBeGreaterThan(1);
    expect(container.querySelectorAll('[data-testid="free-electricity-status-not-confirmed"]').length).toBeGreaterThan(1);
    expect(headerLabels).toEqual(['City', 'Starts', 'Free window']);
    expect(headerLabels).not.toContain('Status');
    expect(container.querySelector('nav[aria-label="City sections"]')).toBeNull();
    expect(container.textContent).not.toContain('city sections with confirmed 2026 windows');
    expect(container.textContent).not.toContain('federal Solar Sharer free-period cap');
    expect(container.querySelector('a[href="#sydney"]')?.textContent).toContain('Sydney');
    expect(container.querySelector('a[href="#perth"]')?.textContent).toContain('Perth');
  });

  it('opens official sources from every city Know more button', async () => {
    const container = await renderWithRouter(<FreeElectricityGuidePage />);
    const buttons = Array.from(container.querySelectorAll('article button')).filter((button) =>
      button.textContent?.includes('Know more'),
    );

    expect(buttons).toHaveLength(freeElectricityGuideCities.length);

    await act(async () => {
      buttons[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
      buttons[7].dispatchEvent(new MouseEvent('click', { bubbles: true }));
      buttons[9].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(Browser.open).toHaveBeenCalledWith({ url: AER_SOLAR_SHARER_SOURCE_URL });
    expect(Browser.open).toHaveBeenCalledWith({ url: VICTORIA_FREE_POWER_SOURCE_URL });
    expect(Browser.open).toHaveBeenCalledWith({ url: AER_DMO_FINAL_DETERMINATION_SOURCE_URL });
  });

  it('links to the guide from SETU resources', async () => {
    const container = await renderWithRouter(
      <Routes>
        <Route path="/setu" element={<SetuPage />} />
        <Route path={FREE_ELECTRICITY_GUIDE_ROUTE} element={<div>Free guide route</div>} />
      </Routes>,
      '/setu',
    );

    const guideLink = container.querySelector(`a[href="${FREE_ELECTRICITY_GUIDE_ROUTE}"]`);
    expect(guideLink).toBeTruthy();
    expect(guideLink?.textContent).toContain('Open guide');
    expect(container.textContent).toContain('Free electricity guide');
  });
});
