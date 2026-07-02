// @vitest-environment jsdom

import { act, type ElementType, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const appConfigState = vi.hoisted(() => ({
  config: {
    variant: 'jom_settle',
    experienceMode: 'hoodie',
    displayName: 'Senang AU',
    supportEmail: 'ghar@example.com',
    webIcon: '/senang-icon.png',
    onboardingMarker: '/senang-marker.png',
    onboardingMarkerAlt: 'Senang AU marker',
    onboardingDescriptor: '',
    onboardingWordmark: 'Senang AU',
    newcomerModeDefault: 'student' as const,
    showPartnershipBadge: false,
    splashArt: {
      backgroundImage: '/malaysia-splash.png',
      wordmark: '/senang-wordmark.png',
    },
    splashMessages: [
      {
        icon: 'user' as const,
        body: 'Panduan student Malaysia di Australia.',
        cta: 'Tanya Sang Kancil',
      },
    ],
  },
}));

vi.mock('../lib/app-config', () => ({
  APP_CONFIG: appConfigState.config,
}));

vi.mock('../lib/api', () => ({
  isReviewerAccessConfigured: () => false,
  isReviewerBypassEmail: () => false,
}));

vi.mock('../lib/geo-data', () => ({
  allCountries: [],
  getCountryName: () => '',
  getStatesForCountry: () => [],
}));

vi.mock('../lib/au-universities', () => ({
  australianStates: [],
  australianUniversities: [],
}));

vi.mock('./hoodie-launch-splash', () => ({
  HoodieLogoLoop: () => <svg aria-label="Hoodie logo" />,
}));

vi.mock('./setu-partnership-badge', () => ({
  SetuPartnershipBadge: () => null,
}));

vi.mock('./setu-china-launch-art', () => ({
  SetuChinaGoldBrandPill: () => null,
  SetuChinaWordmarkLogo: () => null,
  setuChinaLandingBackground: '/setu-china-landing.png',
  setuIndiaLandingBackground: '/setu-india-landing.png',
}));

vi.mock('../lib/email-header-svg', () => ({
  buildHciLogoDataUri: () => '',
}));

vi.mock('motion/react', () => {
  const motionComponent = (Tag: ElementType) =>
    ({ children, animate: _animate, initial: _initial, transition: _transition, ...props }: any) => (
      <Tag {...props}>{children}</Tag>
    );

  return {
    AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
    motion: {
      button: motionComponent('button'),
      div: motionComponent('div'),
      img: motionComponent('img'),
      p: motionComponent('p'),
    },
  };
});

import { Onboarding } from './onboarding';

type MountedComponent = {
  container: HTMLDivElement;
  root: Root;
};

const mountedComponents: MountedComponent[] = [];

async function renderOnboarding() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  mountedComponents.push({ container, root });

  await act(async () => {
    root.render(
      <MemoryRouter>
        <Onboarding
          onSendOtp={vi.fn()}
          onVerifyOtp={vi.fn()}
          onComplete={vi.fn()}
        />
      </MemoryRouter>,
    );
    await Promise.resolve();
  });

  return container;
}

describe('Onboarding Malaysia splash', () => {
  beforeEach(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    vi.useFakeTimers();
  });

  afterEach(async () => {
    for (const mounted of mountedComponents.splice(0)) {
      await act(async () => {
        mounted.root.unmount();
        await Promise.resolve();
      });
      mounted.container.remove();
    }

    vi.clearAllTimers();
    vi.useRealTimers();
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  it('renders the MASCA partnership lockup below the Senang AU wordmark', async () => {
    const container = await renderOnboarding();

    const wordmark = container.querySelector('img[alt="Senang AU"]') as HTMLImageElement | null;
    const partnership = container.querySelector('[data-testid="masca-partnership-lockup"]') as HTMLImageElement | null;

    expect(wordmark).toBeTruthy();
    expect(wordmark?.getAttribute('src')).toBe('/senang-wordmark.png');
    expect(partnership).toBeTruthy();
    expect(partnership?.alt).toBe("In strategic partnership with MASCA, Malaysian Students' Council of Australia");
    expect(partnership?.closest('a')).toBeNull();
    expect(wordmark?.compareDocumentPosition(partnership!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(container.textContent).toContain('Panduan student Malaysia di Australia.');
    expect(container.textContent).toContain('Tanya Sang Kancil');
  });
});
