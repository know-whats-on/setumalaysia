// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { JomSettleChecklistPage, JomSettleVibePage } from './jom-settle-pages';

vi.mock('../components/layout', () => ({
  useGharData: () => ({
    banners: [],
    bulletins: [],
  }),
}));

vi.mock('../components/vibe-suburb-score-tab', () => ({
  VibeSuburbScoreTab: ({ selectedSuburbParam, embedded }: { selectedSuburbParam?: string; embedded?: boolean }) => (
    <div
      data-embedded={embedded ? 'true' : 'false'}
      data-selected-suburb={selectedSuburbParam || ''}
      data-testid="mock-vibe-suburb-score-tab"
    />
  ),
}));

type MountedComponent = {
  container: HTMLDivElement;
  root: Root;
};

const mountedComponents: MountedComponent[] = [];

async function renderChecklistPage() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  mountedComponents.push({ container, root });

  await act(async () => {
    root.render(
      <MemoryRouter>
        <JomSettleChecklistPage />
      </MemoryRouter>,
    );
    await Promise.resolve();
  });

  return container;
}

async function renderVibePage(initialEntry = '/vibe?section=vibe&vibe_tab=suburb-score&suburb=birmingham-gardens') {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  mountedComponents.push({ container, root });

  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={[initialEntry]}>
        <JomSettleVibePage />
      </MemoryRouter>,
    );
    await Promise.resolve();
  });

  return container;
}

function clickChecklistGuide(container: ParentNode, title: string) {
  const button = Array.from(container.querySelectorAll('button')).find((item) => item.textContent?.includes(title));
  expect(button).toBeTruthy();
  act(() => {
    button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

describe('JomSettleChecklistPage', () => {
  beforeEach(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    window.localStorage.clear();
    document.body.innerHTML = '';
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
  });

  it('renders guide modals above the bottom nav with nav-aware clearance', async () => {
    const container = await renderChecklistPage();
    clickChecklistGuide(container, 'Aktifkan campus systems');

    const overlay = container.querySelector('[role="dialog"]');
    const sheet = overlay?.querySelector('section');

    expect(overlay?.className).toContain('z-[5000]');
    expect(overlay?.className).toContain('pb-[calc(var(--app-bottom-nav-clearance)+0.75rem)]');
    expect(sheet?.className).toContain('max-h-[calc(100dvh_-_var(--app-bottom-nav-clearance)_-_var(--native-safe-area-top)_-_2rem)]');
    expect(sheet?.className).toContain('overflow-y-auto');
  });

  it('keeps embedded suburb stats scrollable above the bottom nav', async () => {
    const container = await renderVibePage();
    const shell = container.querySelector('[data-testid="jom-settle-suburb-stats-scroll-shell"]');
    const suburbStats = container.querySelector('[data-testid="mock-vibe-suburb-score-tab"]');

    expect(shell).toBeInstanceOf(HTMLElement);
    expect(shell?.className).toContain('setu-malaysia-vibe-scroll');
    expect(shell?.className).toContain('min-h-0 flex-1 overflow-y-auto overflow-x-hidden');
    expect(shell?.className).toContain('pb-[calc(var(--app-bottom-nav-clearance)+2.5rem)]');
    expect((shell as HTMLElement | null)?.getAttribute('style')).toContain('app-bottom-nav-clearance');
    expect(suburbStats?.getAttribute('data-embedded')).toBe('true');
    expect(shell?.contains(suburbStats)).toBe(true);
  });
});
