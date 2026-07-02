// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { createMemoryRouter, Outlet, RouterProvider, useLocation } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppRouteErrorBoundary, reloadAppFromDashboard } from './app-route-error-boundary';

type MountedComponent = {
  container: HTMLDivElement;
  root: Root;
};

const mountedComponents: MountedComponent[] = [];

function Shell() {
  return <Outlet />;
}

function DashboardProbe() {
  const location = useLocation();
  return <div data-testid="location-probe">{location.pathname}</div>;
}

async function renderRouter(initialEntry = '/campaigns/latte') {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  mountedComponents.push({ container, root });

  const router = createMemoryRouter(
    [
      {
        path: '/',
        Component: Shell,
        ErrorBoundary: AppRouteErrorBoundary,
        children: [
          { path: 'dashboard', Component: DashboardProbe },
        ],
      },
    ],
    { initialEntries: [initialEntry] },
  );

  await act(async () => {
    root.render(<RouterProvider router={router} />);
    await Promise.resolve();
  });

  return container;
}

function getButtonByText(container: HTMLElement, text: string) {
  const normalizedText = text.trim().toLowerCase();
  const button = Array.from(container.querySelectorAll('button')).find((candidate) => {
    const candidateText = candidate.textContent?.replace(/\s+/g, ' ').trim().toLowerCase() || '';
    return candidateText.includes(normalizedText);
  });
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Button not found for text: ${text}`);
  }
  return button;
}

describe('AppRouteErrorBoundary', () => {
  beforeEach(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    document.body.innerHTML = '';
  });

  afterEach(() => {
    for (const mounted of mountedComponents.splice(0)) {
      act(() => {
        mounted.root.unmount();
      });
      mounted.container.remove();
    }
    vi.restoreAllMocks();
  });

  it('shows the not-found recovery page for unknown routes', async () => {
    const container = await renderRouter('/campaigns/latte');

    expect(container.textContent).toContain('That page wandered off');
    expect(container.textContent).toContain('Reload app');
    expect(container.textContent).toContain('Go to dashboard');
  });

  it('navigates to dashboard without reloading the broken route', async () => {
    const container = await renderRouter('/campaigns/latte');
    const dashboardButton = getButtonByText(container, 'Go to dashboard');

    await act(async () => {
      dashboardButton.click();
      await Promise.resolve();
    });

    expect(container.querySelector('[data-testid="location-probe"]')?.textContent).toBe('/dashboard');
  });

  it('prepares dashboard before reloading the app', () => {
    window.history.pushState({}, '', '/campaigns/latte');
    const reload = vi.fn();

    reloadAppFromDashboard(reload);

    expect(window.location.pathname).toBe('/dashboard');
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
