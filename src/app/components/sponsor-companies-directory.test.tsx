// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SponsorCompaniesDirectory } from './sponsor-companies-directory';

const sponsorPdfMocks = vi.hoisted(() => ({
  createSponsorCompaniesPdf: vi.fn(),
  downloadSetuPdf: vi.fn(),
}));

vi.mock('../lib/sponsor-companies-pdf', () => ({
  createSponsorCompaniesPdf: sponsorPdfMocks.createSponsorCompaniesPdf,
}));

vi.mock('../lib/setu-pdf', () => ({
  downloadSetuPdf: sponsorPdfMocks.downloadSetuPdf,
}));

type MountedComponent = {
  container: HTMLDivElement;
  root: Root;
};

const mountedComponents: MountedComponent[] = [];

async function flushAsync() {
  await act(async () => {
    await Promise.resolve();
  });
}

async function renderDirectory() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  mountedComponents.push({ container, root });

  await act(async () => {
    root.render(<SponsorCompaniesDirectory />);
    await Promise.resolve();
  });
  await flushAsync();

  return container;
}

async function setInputValue(input: HTMLInputElement, value: string) {
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
  await act(async () => {
    nativeInputValueSetter?.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await Promise.resolve();
  });
}

async function clickElement(element: Element | null | undefined) {
  expect(element).toBeTruthy();
  await act(async () => {
    element?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await Promise.resolve();
  });
  await flushAsync();
}

function visibleInitials(container: HTMLElement) {
  return Array.from(container.querySelectorAll('[data-testid="sponsor-companies-list"] li'))
    .map((row) => row.querySelector('span:last-child')?.textContent || '');
}

beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  document.body.innerHTML = '';
  sponsorPdfMocks.createSponsorCompaniesPdf.mockReset();
  sponsorPdfMocks.downloadSetuPdf.mockReset();
  sponsorPdfMocks.createSponsorCompaniesPdf.mockResolvedValue({
    blob: new Blob(['pdf'], { type: 'application/pdf' }),
    fileName: 'setu-india-au-sponsor-companies-directory.pdf',
    title: 'SETU India AU Sponsor Companies Directory',
    companyCount: 3578,
  });
  sponsorPdfMocks.downloadSetuPdf.mockResolvedValue(undefined);
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

describe('SponsorCompaniesDirectory', () => {
  it('renders the A-Z browser without source wording or links', async () => {
    const container = await renderDirectory();
    const directory = container.querySelector('[data-testid="sponsor-companies-directory"]');
    const firstPanel = directory?.querySelector('section')?.firstElementChild;

    expect(firstPanel?.querySelector('[data-testid="sponsor-companies-search"]')).toBeTruthy();
    expect(container.textContent).not.toContain('Find an accredited sponsor');
    expect(container.textContent).not.toContain('15 Jan 2025 snapshot');
    expect(container.textContent).toContain('Browse A-Z');
    expect(container.textContent).toContain('Download PDF');
    expect(container.textContent).not.toContain('Zoom In');
    expect(container.querySelectorAll('a')).toHaveLength(0);
    expect(container.textContent?.toLocaleLowerCase('en-AU')).not.toMatch(/home affairs|racc|official|\bsource\b/);

    expect(container.querySelector('[data-testid="sponsor-companies-alpha-0-9"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="sponsor-companies-alpha-A"]')?.getAttribute('aria-pressed')).toBe('true');
    expect(container.textContent).toContain('A companies');
    expect(visibleInitials(container).every((initial) => initial === 'A')).toBe(true);
  });

  it('filters by initial and keeps search global across initials', async () => {
    const container = await renderDirectory();
    const searchInput = container.querySelector<HTMLInputElement>('[data-testid="sponsor-companies-search"]');

    await clickElement(container.querySelector('[data-testid="sponsor-companies-alpha-B"]'));

    expect(container.querySelector('[data-testid="sponsor-companies-alpha-B"]')?.getAttribute('aria-pressed')).toBe('true');
    expect(container.textContent).toContain('B companies');
    expect(container.textContent).toContain('BMW Australia Ltd.');
    expect(visibleInitials(container).every((initial) => initial === 'B')).toBe(true);

    await setInputValue(searchInput!, 'zurich');

    expect(container.textContent).toContain('Search results');
    expect(container.textContent).toContain('ZURICH FINANCIAL SERVICES AUSTRALIA LIMITED');
    expect(container.textContent).toContain('All letters');

    await clickElement(container.querySelector('[data-testid="sponsor-companies-clear-search"]'));

    expect(searchInput?.value).toBe('');
    expect(container.textContent).toContain('B companies');
  });

  it('shows an empty state for unmatched searches', async () => {
    const container = await renderDirectory();
    const searchInput = container.querySelector<HTMLInputElement>('[data-testid="sponsor-companies-search"]');

    await setInputValue(searchInput!, 'zzzzzz-nope');

    expect(container.querySelector('[data-testid="sponsor-companies-empty"]')?.textContent).toContain('No matches found');
  });

  it('downloads the full sponsor company PDF export', async () => {
    const container = await renderDirectory();

    await clickElement(container.querySelector('[data-testid="sponsor-companies-download-pdf"]'));

    expect(sponsorPdfMocks.createSponsorCompaniesPdf).toHaveBeenCalledTimes(1);
    expect(sponsorPdfMocks.createSponsorCompaniesPdf).toHaveBeenCalledWith();
    expect(sponsorPdfMocks.downloadSetuPdf).toHaveBeenCalledWith({
      blob: expect.any(Blob),
      fileName: 'setu-india-au-sponsor-companies-directory.pdf',
      title: 'SETU India AU Sponsor Companies Directory',
    });
  });
});
