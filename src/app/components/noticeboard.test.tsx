// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Noticeboard } from './noticeboard';

const {
  appConfigMock,
  fetchHciAlertsMock,
  fetchMalaysianHighCommissionAlertsMock,
  fetchPoliceFeedMock,
} = vi.hoisted(() => ({
  appConfigMock: {
    variant: 'jom_settle',
    showVibeHciAlerts: false,
  },
  fetchHciAlertsMock: vi.fn(),
  fetchMalaysianHighCommissionAlertsMock: vi.fn(),
  fetchPoliceFeedMock: vi.fn(),
}));

vi.mock('../lib/app-config', () => ({
  APP_CONFIG: appConfigMock,
}));

vi.mock('../lib/api', () => ({
  fetchHciAlerts: fetchHciAlertsMock,
  fetchMalaysianHighCommissionAlerts: fetchMalaysianHighCommissionAlertsMock,
  fetchPoliceFeed: fetchPoliceFeedMock,
}));

type MountedComponent = {
  container: HTMLDivElement;
  root: Root;
};

const mountedComponents: MountedComponent[] = [];

async function flushEffects() {
  for (let index = 0; index < 6; index += 1) {
    await act(async () => {
      await Promise.resolve();
    });
  }
}

function getElementByExactText(container: ParentNode, text: string) {
  const element = Array.from(container.querySelectorAll('*')).find((item) => item.textContent === text);
  if (!(element instanceof HTMLElement)) {
    throw new Error(`Could not find element with exact text: ${text}`);
  }
  return element;
}

async function renderNoticeboard() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  mountedComponents.push({ container, root });

  await act(async () => {
    root.render(
      <MemoryRouter>
        <Noticeboard
          embedded
          banners={[{ id: 'banner-one', url: 'https://images.example.com/banner.jpg' }]}
          bulletins={[
            {
              id: 'bulletin-one',
              title: 'Extra app bulletin',
              body: 'This should not appear in Malaysia alerts.',
              postcode_target: 'ALL',
              is_urgent: false,
              created_at: '2026-06-01T00:00:00.000Z',
            } as any,
          ]}
        />
      </MemoryRouter>,
    );
    await Promise.resolve();
  });
  await flushEffects();
  return container;
}

describe('Noticeboard Malaysia alerts', () => {
  beforeEach(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    appConfigMock.variant = 'jom_settle';
    appConfigMock.showVibeHciAlerts = false;
    fetchHciAlertsMock.mockReset();
    fetchMalaysianHighCommissionAlertsMock.mockReset();
    fetchPoliceFeedMock.mockReset();
    Object.defineProperty(globalThis, 'Image', {
      writable: true,
      value: class {
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;

        set src(_value: string) {
          queueMicrotask(() => this.onload?.());
        }
      },
    });
    fetchMalaysianHighCommissionAlertsMock.mockResolvedValue([
      {
        id: 'kln-update',
        title: 'Permohonan undi pos kategori 1B',
        link: 'https://www.kln.gov.my/web/aus_canberra/news-from-mission/-/blogs/update',
        published_at: '2026-06-29T00:00:00.000Z',
        source: 'High Commission of Malaysia, Canberra',
        scraped_at: '2026-07-01T00:00:00.000Z',
        summary: 'Official Malaysian mission update.',
      },
    ]);
    fetchPoliceFeedMock.mockResolvedValue([
      {
        id: 'afp-update',
        title: 'AFP scam alert',
        body: 'AFP scam alert',
        link: 'https://www.afp.gov.au/news-centre/afp-scam-alert',
        published_at: '2026-06-30T00:00:00.000Z',
      },
    ]);
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

  it('renders noticeboard carousel, Malaysian High Commission updates, then AFP without extra Malaysia cards or bulletins', async () => {
    const container = await renderNoticeboard();
    const banner = container.querySelector('img[alt="Noticeboard Highlight"]');
    const malaysiaHeading = getElementByExactText(container, 'High Commission of Malaysia, Canberra');
    const afpHeading = getElementByExactText(container, 'Australian Federal Police');

    expect(banner).toBeInstanceOf(HTMLImageElement);
    expect(fetchMalaysianHighCommissionAlertsMock).toHaveBeenCalledTimes(1);
    expect(fetchPoliceFeedMock).toHaveBeenCalledWith('afpnews');
    expect(fetchHciAlertsMock).not.toHaveBeenCalled();
    expect(banner?.compareDocumentPosition(malaysiaHeading)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(malaysiaHeading.compareDocumentPosition(afpHeading)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(container.textContent).toContain('Permohonan undi pos kategori 1B');
    expect(container.textContent).toContain('AFP scam alert');
    expect(container.textContent).not.toContain('Arrival Alerts');
    expect(container.textContent).not.toContain('Extra app bulletin');
    expect(container.textContent).not.toContain('Pressure bayar bond cepat');
  });

  it('labels the Malaysia official section as EMA when the fallback feed is returned', async () => {
    fetchMalaysianHighCommissionAlertsMock.mockResolvedValueOnce([
      {
        id: 'ema-update',
        title: 'TENDER ADVERTISEMENT : Appointment of Insurance Broker',
        link: 'https://www.ema.org.au/post/tender-notis',
        published_at: '2024-09-03T03:49:50.000Z',
        source: 'Education Malaysia Australia',
        scraped_at: '2026-07-01T00:00:00.000Z',
      },
    ]);

    const container = await renderNoticeboard();
    const emaHeading = getElementByExactText(container, 'Education Malaysia Australia');
    const afpHeading = getElementByExactText(container, 'Australian Federal Police');
    const emaAction = Array.from(container.querySelectorAll('a')).find((link) => link.textContent?.includes('EMA'));

    expect(emaHeading.compareDocumentPosition(afpHeading)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(container.textContent).toContain('EMA Blog');
    expect(container.textContent).toContain('TENDER ADVERTISEMENT : Appointment of Insurance Broker');
    expect(container.textContent).not.toContain('High Commission of Malaysia, Canberra');
    expect(emaAction).toBeInstanceOf(HTMLAnchorElement);
    expect((emaAction as HTMLAnchorElement | undefined)?.href).toBe('https://www.ema.org.au/blog');
  });
});
