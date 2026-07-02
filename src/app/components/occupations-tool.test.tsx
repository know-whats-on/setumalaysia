// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SkilledOccupationsResult } from '../lib/occupations';

const { fetchSkilledOccupationsMock } = vi.hoisted(() => ({
  fetchSkilledOccupationsMock: vi.fn(),
}));

vi.mock('../lib/api', () => ({
  fetchSkilledOccupations: fetchSkilledOccupationsMock,
}));

import { OccupationsTool } from './occupations-tool';

type MountedComponent = {
  container: HTMLDivElement;
  root: Root;
};

const mountedComponents: MountedComponent[] = [];

const baseResult: SkilledOccupationsResult = {
  items: [{
    id: 'accountant-general-221111',
    occupation: 'Accountant (General)',
    lists: ['MLTSSL', 'CSOL'],
    anzscoLinks: [{
      text: 'ANZSCO 2022 - 221111',
      href: 'https://www.abs.gov.au/221111',
    }],
    visas: [{
      id: '482-skills-in-demand',
      subclass: '482',
      label: '482 - Skills in Demand (subclass 482) - Core Skills stream',
      caveats: [{
        title: 'Business size',
        description: 'Excludes some businesses.',
      }],
    }],
    assessingAuthorities: [{
      id: 'caanz',
      code: 'CAANZ',
      name: 'Chartered Accountants Australia and New Zealand',
      url: 'https://www.charteredaccountantsanz.com/',
    }],
  }],
  total: 1,
  page: 1,
  pageSize: 20,
  totalPages: 1,
  sort: 'occupation_asc',
  query: {
    q: '',
    visa: '',
    list: '',
    authority: '',
  },
  facets: {
    lists: [{ id: 'MLTSSL', label: 'MLTSSL', count: 1 }],
    visas: [
      { id: '482-skills-in-demand', label: '482 - Skills in Demand', count: 1 },
      { id: 'visa-the-position-is-in-a-business', label: 'the position is in a business that has an annual turnover of less than AUD1,000,000', count: 1 },
    ],
    authorities: [{ id: 'caanz', label: 'CAANZ', count: 1 }],
  },
  source: {
    name: 'Australian Government Department of Home Affairs',
    url: 'https://immi.homeaffairs.gov.au/visas/working-in-australia/skill-occupation-list',
    lastUpdated: '6/08/2025 13:33',
    fetchedAt: '2026-04-26T00:00:00.000Z',
    cacheStatus: 'refreshed',
  },
};

async function flushEffects() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

async function renderTool() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  mountedComponents.push({ container, root });

  await act(async () => {
    root.render(<OccupationsTool />);
    await Promise.resolve();
  });
  await flushEffects();

  return container;
}

function getButtonContaining(container: HTMLElement, text: string) {
  return Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find((button) =>
    button.textContent?.includes(text),
  );
}

async function clickButton(container: HTMLElement, text: string) {
  const button = getButtonContaining(container, text);
  expect(button).toBeTruthy();
  await act(async () => {
    button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await Promise.resolve();
  });
  await flushEffects();
}

describe('OccupationsTool', () => {
  beforeEach(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    fetchSkilledOccupationsMock.mockResolvedValue(baseResult);
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
    vi.clearAllMocks();
  });

  it('renders official occupation results and expandable details', async () => {
    const container = await renderTool();

    expect(container.textContent).toContain('Home Affairs Skilled Occupation List');
    expect(container.textContent).not.toContain('Find skilled visa occupations');
    expect(container.textContent).not.toContain('Search the Home Affairs Skilled occupation list inside Hoodie.');
    expect(container.textContent).toContain('1 occupations');
    expect(container.textContent).toContain('Accountant (General)');
    expect(container.textContent).toContain('Source: Australian Government Department of Home Affairs');
    expect(container.textContent).not.toContain('annual turnover of less than AUD1,000,000');

    await clickButton(container, 'Accountant (General)');

    expect(container.textContent).toContain('ANZSCO 2022 - 221111');
    expect(container.textContent).toContain('482 - Skills in Demand');
    expect(container.textContent).toContain('Caveats apply');
    expect(container.textContent).toContain('Business size');
    expect(container.textContent).toContain('CAANZ');
  });

  it('refetches when a list filter chip is selected', async () => {
    const container = await renderTool();

    await clickButton(container, 'MLTSSL');

    expect(fetchSkilledOccupationsMock).toHaveBeenLastCalledWith(expect.objectContaining({
      list: 'MLTSSL',
      page: 1,
      pageSize: 20,
    }));
  });

  it('shows an empty state when no occupations match', async () => {
    fetchSkilledOccupationsMock.mockResolvedValue({
      ...baseResult,
      items: [],
      total: 0,
    });

    const container = await renderTool();

    expect(container.textContent).toContain('No occupations found');
  });

  it('shows a friendly unavailable state when the backend fails without cache', async () => {
    fetchSkilledOccupationsMock.mockRejectedValue(new Error('Skilled occupation list is unavailable right now.'));

    const container = await renderTool();

    expect(container.textContent).toContain('Occupations are unavailable');
    expect(container.textContent).toContain('Skilled occupation list is unavailable right now.');
    expect(container.textContent).toContain('Open official list');
  });
});
