// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createNetworkingCard,
  deleteNetworkingCard,
  fetchMyLinkedInProfile,
  fetchNetworkingCards,
  saveMyLinkedInProfile,
  updateNetworkingCard,
} from '../lib/api';
import { NetworkingCardsPanel } from './networking-cards-panel';

vi.mock('@capacitor/browser', () => ({
  Browser: {
    open: vi.fn(() => Promise.resolve()),
  },
}));

vi.mock('../lib/api', () => ({
  createNetworkingCard: vi.fn(),
  deleteNetworkingCard: vi.fn(),
  fetchMyLinkedInProfile: vi.fn(),
  fetchNetworkingCards: vi.fn(),
  saveMyLinkedInProfile: vi.fn(),
  updateNetworkingCard: vi.fn(),
}));

vi.mock('qrcode', () => ({
  default: {
    toDataURL: vi.fn(() => Promise.resolve('data:image/png;base64,qr')),
  },
}));

type MountedComponent = {
  container: HTMLDivElement;
  root: Root;
};

const mountedComponents: MountedComponent[] = [];
const scrollIntoViewMock = vi.fn();

const savedCard = {
  id: 'card-1',
  owner_email: 'rushi@hoodie.app',
  linkedin_url: 'https://www.linkedin.com/in/priya-founder',
  display_name: 'Priya Founder',
  headline: 'Angel investor and startup mentor',
  company: 'Founders Studio',
  role: 'Mentor',
  location: 'Sydney',
  met_at: 'June 2026',
  met_context: 'Networking night',
  met_event_title: 'Founder Demo Night',
  notes: 'Can help with investor intros and pitch review.',
  display_tags: ['Angel', 'Pitch', 'Investor', 'Referral'],
  tags: ['Raw Hidden', 'angel', 'pitch', 'investor', 'referral'],
  search_terms: ['angel investor', 'pitch review'],
  created_at: '2026-06-07T00:00:00.000Z',
  updated_at: '2026-06-07T00:00:00.000Z',
  created_app_variant: 'burb_mate',
  archived_at: '',
};

function responseWith(data: unknown[]) {
  return {
    data,
    meta: {
      returned_count: data.length,
      total_count: data.length,
      has_more: false,
      next_offset: null,
    },
  };
}

async function flushTimers() {
  await act(async () => {
    vi.runOnlyPendingTimers();
    await Promise.resolve();
  });
  await act(async () => {
    await Promise.resolve();
  });
}

async function renderPanel() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  mountedComponents.push({ container, root });

  await act(async () => {
    root.render(<NetworkingCardsPanel email="Rushi@Hoodie.App" />);
  });
  await flushTimers();

  return container;
}

function setValue(element: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const descriptor = Object.getOwnPropertyDescriptor(
    element instanceof HTMLTextAreaElement
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype,
    'value',
  );
  act(() => {
    descriptor?.set?.call(element, value);
    element.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

function getInput(container: ParentNode, placeholder: string) {
  const element = Array.from(container.querySelectorAll('input, textarea')).find(
    (input) => input.getAttribute('placeholder') === placeholder,
  ) as HTMLInputElement | HTMLTextAreaElement | undefined;
  expect(element).toBeTruthy();
  return element!;
}

function getButton(container: ParentNode, label: string) {
  const button = Array.from(container.querySelectorAll('button')).find(
    (candidate) => candidate.textContent?.trim() === label,
  ) as HTMLButtonElement | undefined;
  expect(button).toBeTruthy();
  return button!;
}

describe('NetworkingCardsPanel', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    scrollIntoViewMock.mockClear();
    Object.defineProperty(window.HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoViewMock,
    });
    vi.mocked(fetchMyLinkedInProfile).mockResolvedValue(null);
    vi.mocked(fetchNetworkingCards).mockResolvedValue(responseWith([]) as any);
    vi.mocked(createNetworkingCard).mockResolvedValue(savedCard as any);
    vi.mocked(saveMyLinkedInProfile).mockResolvedValue({
      owner_email: 'rushi@hoodie.app',
      linkedin_url: 'https://www.linkedin.com/in/rushi-shah',
      display_name: 'Rushi Shah',
      created_at: '2026-06-07T00:00:00.000Z',
      updated_at: '2026-06-07T00:00:00.000Z',
      created_app_variant: 'burb_mate',
    } as any);
    vi.mocked(updateNetworkingCard).mockResolvedValue(savedCard as any);
    vi.mocked(deleteNetworkingCard).mockResolvedValue(undefined);
  });

  afterEach(() => {
    for (const mounted of mountedComponents.splice(0)) {
      act(() => mounted.root.unmount());
      mounted.container.remove();
    }
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('saves a manual LinkedIn card and searches notes/tags', async () => {
    vi.mocked(fetchNetworkingCards)
      .mockResolvedValueOnce(responseWith([]) as any)
      .mockResolvedValueOnce(responseWith([savedCard]) as any)
      .mockResolvedValueOnce(responseWith([savedCard]) as any);
    const container = await renderPanel();

    await act(async () => {
      getButton(container, 'Add manually').click();
      await Promise.resolve();
    });

    expect(container.textContent).not.toContain('Company');
    expect(container.textContent).not.toContain('Where did you meet?');
    expect(container.textContent).toContain('Name');
    await flushTimers();
    expect(scrollIntoViewMock).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'start',
    });

    const quickNote = 'Met at Founders event, introduced by Nina. Is a super connector, goes by "Dan". Said he might know someone for GTM interns.';
    const linkedInInput = getInput(container, 'https://www.linkedin.com/in/their-name');
    const nameInput = getInput(container, 'Account name');
    setValue(linkedInInput, 'linkedin.com/in/liam-davies-2b3781197?trk=qr');
    expect((nameInput as HTMLInputElement).value).toBe('Liam Davies');
    setValue(nameInput, 'Manual Liam');
    setValue(linkedInInput, 'linkedin.com/in/other-founder');
    expect((nameInput as HTMLInputElement).value).toBe('Manual Liam');
    setValue(nameInput, '');
    setValue(linkedInInput, 'linkedin.com/in/liam-davies-2b3781197?trk=qr');
    expect((nameInput as HTMLInputElement).value).toBe('Liam Davies');
    setValue(nameInput, 'Liam Davies');
    setValue(getInput(container, quickNote), quickNote);

    await act(async () => {
      getButton(container, 'Save My Network').click();
      await Promise.resolve();
    });
    await flushTimers();

    expect(createNetworkingCard).toHaveBeenCalledWith(expect.objectContaining({
      email: 'rushi@hoodie.app',
      linkedin_url: 'https://www.linkedin.com/in/liam-davies-2b3781197',
      display_name: 'Liam Davies',
      notes: quickNote,
    }));
    expect(container.textContent).toContain('Priya Founder');
    expect(container.textContent).toContain('Can help with investor intros and pitch review.');
    expect(container.textContent).toContain('Angel');
    expect(container.textContent).toContain('Pitch');
    expect(container.textContent).toContain('+2');
    expect(container.textContent).not.toContain('Raw Hidden');
    expect(container.textContent).not.toContain('Investor');
    const summary = Array.from(container.querySelectorAll('p')).find(
      (paragraph) => paragraph.textContent === 'Can help with investor intros and pitch review.',
    );
    expect(summary?.className).toContain('line-clamp-2');

    await act(async () => {
      getButton(container, '+2').click();
      await Promise.resolve();
    });
    expect(container.textContent).toContain('Investor');
    expect(container.textContent).toContain('Referral');
    expect(container.textContent).toContain('Show less');

    await act(async () => {
      getButton(container, 'Show less').click();
      await Promise.resolve();
    });
    expect(container.textContent).not.toContain('Investor');

    setValue(getInput(container, 'Search names, companies, notes, tags'), 'angel');
    await flushTimers();

    expect(fetchNetworkingCards).toHaveBeenLastCalledWith({
      email: 'rushi@hoodie.app',
      q: 'angel',
      limit: 50,
    });
    expect(container.textContent).toContain('Priya Founder');
  });

  it('saves the owner LinkedIn URL and renders a QR', async () => {
    const container = await renderPanel();

    await act(async () => {
      getButton(container, 'Add my LinkedIn').click();
      await Promise.resolve();
    });

    setValue(getInput(container, 'https://www.linkedin.com/in/your-name'), 'linkedin.com/in/rushi-shah?trk=qr');

    await act(async () => {
      getButton(container, 'Save my LinkedIn QR').click();
      await Promise.resolve();
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(saveMyLinkedInProfile).toHaveBeenCalledWith({
      email: 'rushi@hoodie.app',
      linkedin_url: 'https://www.linkedin.com/in/rushi-shah',
      display_name: 'Rushi Shah',
    });
    expect(container.querySelector('img[alt="My LinkedIn QR code"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="my-linkedin-qr-frame"]')?.className).toContain('aspect-square');
    expect(container.textContent).toContain('Open my LinkedIn');
  });
});
