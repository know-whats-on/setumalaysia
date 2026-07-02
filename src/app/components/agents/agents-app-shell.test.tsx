// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AgentsAppShell } from './agents-app-shell';

type MountedComponent = {
  container: HTMLDivElement;
  root: Root;
};

const mountedComponents: MountedComponent[] = [];

function renderAgentsShell(initialPath = '/agents') {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  mountedComponents.push({ container, root });

  act(() => {
    root.render(
      <MemoryRouter initialEntries={[initialPath]}>
        <AgentsAppShell />
      </MemoryRouter>,
    );
  });

  return container;
}

function findButton(container: HTMLElement, label: string) {
  return Array.from(container.querySelectorAll('button')).find((button) =>
    button.textContent?.replace(/\s+/g, ' ').trim().includes(label),
  );
}

beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal('fetch', vi.fn());
  window.localStorage.clear();
});

afterEach(() => {
  for (const mounted of mountedComponents.splice(0)) {
    act(() => mounted.root.unmount());
    mounted.container.remove();
  }
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('AgentsAppShell', () => {
  it('renders the auth gate when Firebase web config is absent', () => {
    const container = renderAgentsShell();

    expect(container.textContent).toContain('Hoodie for Agents');
    expect(container.textContent).toContain('Live sign-in is not configured');
    expect(findButton(container, 'Open workspace')).toBeTruthy();
  });

  it('opens a separate B2B command centre with approval guardrails in demo mode', () => {
    const container = renderAgentsShell('/agents');

    act(() => {
      findButton(container, 'Open workspace')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(container.textContent).toContain('Command Centre');
    expect(container.textContent).toContain('Human approval on');
    expect(container.textContent).toContain('AI Approval Queue');
    expect(container.textContent).toContain('0 sent automatically');
    expect(container.textContent).toContain('No applicant scoring');
    expect(container.textContent).toContain('auto-rejection');
  });

  it('updates the local approval queue and audit log when a draft is approved', () => {
    const container = renderAgentsShell('/agents/privacy-centre');

    act(() => {
      findButton(container, 'Open workspace')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(container.textContent).toContain('Privacy Centre');

    act(() => {
      findButton(container, 'Approve')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(container.textContent).toContain('ai_draft_approved');
    expect(container.textContent).toContain('approved');
  });
});
