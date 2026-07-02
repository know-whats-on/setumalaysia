// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HoodieLaunchSplash } from './hoodie-launch-splash';

const appConfigState = vi.hoisted(() => ({
  config: {
    variant: 'burb_mate',
    loadingLabel: 'Loading Hoodie',
    assistantName: 'Hoodienie',
    launchArt: undefined as { wordmark?: string } | undefined,
    splashArt: undefined as { backgroundImage?: string; wordmark?: string } | undefined,
    webIcon: '/setu-icon.png',
    onboardingMarker: '/setu-marker.svg',
    onboardingMarkerAlt: 'SETU marker',
  },
}));

vi.mock('../lib/app-config', () => ({
  APP_CONFIG: appConfigState.config,
}));

vi.mock('motion/react', () => {
  const Svg = ({ children, animate: _animate, transition: _transition, ...props }: any) => (
    <svg {...props}>{children}</svg>
  );
  const Path = ({ animate: _animate, transition: _transition, ...props }: any) => <path {...props} />;
  return {
    motion: {
      svg: Svg,
      path: Path,
    },
  };
});

type MountedComponent = {
  container: HTMLDivElement;
  root: Root;
};

const mountedComponents: MountedComponent[] = [];

function renderSplash() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  mountedComponents.push({ container, root });

  act(() => {
    root.render(<HoodieLaunchSplash />);
  });

  return container;
}

describe('HoodieLaunchSplash', () => {
  beforeEach(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    Object.assign(appConfigState.config, {
      variant: 'burb_mate',
      loadingLabel: 'Loading Hoodie',
      assistantName: 'Hoodienie',
      launchArt: undefined,
      splashArt: undefined,
      webIcon: '/setu-icon.png',
      onboardingMarker: '/setu-marker.svg',
      onboardingMarkerAlt: 'SETU marker',
    });
  });

  afterEach(() => {
    for (const mounted of mountedComponents.splice(0)) {
      act(() => mounted.root.unmount());
      mounted.container.remove();
    }
    vi.clearAllMocks();
  });

  it('keeps the Hoodie logo loop for the Hoodie startup splash', () => {
    const container = renderSplash();

    const logoLoop = container.querySelector('svg[aria-label="Loading Hoodie"]');

    expect(logoLoop).toBeTruthy();
    expect(container.querySelector('[data-testid="hoodienie-startup-float"]')).toBeNull();
    expect(container.querySelector('img[src="/hoodienie.svg"]')).toBeNull();
  });

  it('keeps the existing marker path for non-Hoodie startup splash variants', () => {
    appConfigState.config.variant = 'ghar';
    appConfigState.config.loadingLabel = 'Loading SETU';

    const container = renderSplash();
    const markerImage = container.querySelector('img[src="/setu-marker.svg"]') as HTMLImageElement | null;

    expect(container.querySelector('[data-testid="hoodienie-startup-float"]')).toBeNull();
    expect(markerImage).toBeTruthy();
    expect(markerImage?.alt).toBe('SETU marker');
    expect(container.textContent).toContain('Loading SETU');
  });

  it('renders Wolli startup as a large standalone wordmark', () => {
    Object.assign(appConfigState.config, {
      variant: 'wheres_wolli',
      loadingLabel: 'Loading Wolli',
      launchArt: { wordmark: '/wolli-wordmark.png' },
      webIcon: '/wolli-icon.png',
      onboardingMarker: '/wolli-marker.png',
      onboardingMarkerAlt: "Where's Wolli marker",
    });

    const container = renderSplash();
    const wordmark = container.querySelector('img[src="/wolli-wordmark.png"]') as HTMLImageElement | null;

    expect(wordmark).toBeTruthy();
    expect(wordmark?.alt).toBe("Where's Wolli");
    expect(wordmark?.className).toContain('w-[min(78vw,24rem)]');
    expect(wordmark?.parentElement?.className).not.toContain('rounded-full');
    expect(wordmark?.parentElement?.className).not.toContain('bg-white');
    expect(container.textContent).not.toContain('Loading Wolli');
  });

  it('anchors the Senang AU wordmark above the Malaysia startup loading pill', () => {
    Object.assign(appConfigState.config, {
      variant: 'jom_settle',
      loadingLabel: 'Loading Senang AU',
      splashArt: { backgroundImage: '/malaysia-splash.png', wordmark: '/senang-wordmark.png' },
      webIcon: '/senang-icon.png',
      onboardingMarker: '/senang-marker.png',
      onboardingMarkerAlt: 'Senang AU marker',
    });

    const container = renderSplash();
    const background = container.querySelector('img[src="/malaysia-splash.png"]') as HTMLImageElement | null;
    const wordmark = container.querySelector('img[src="/senang-wordmark.png"]') as HTMLImageElement | null;
    const partnership = container.querySelector('[data-testid="masca-partnership-lockup"]') as HTMLImageElement | null;
    const loadingPill = Array.from(container.querySelectorAll('div')).find((node) =>
      node.className.includes('mt-auto') && node.textContent?.includes('Senang AU'),
    );

    expect(background).toBeTruthy();
    expect(wordmark).toBeTruthy();
    expect(wordmark?.alt).toBe('Senang AU');
    expect(wordmark?.className).toContain('w-[min(76vw,24rem)]');
    expect(partnership).toBeTruthy();
    expect(partnership?.alt).toBe("In strategic partnership with MASCA, Malaysian Students' Council of Australia");
    expect(partnership?.closest('a')).toBeNull();
    expect(wordmark?.compareDocumentPosition(partnership!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(partnership?.compareDocumentPosition(loadingPill!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(loadingPill).toBeTruthy();
    expect(container.textContent).toContain('Loading...');
  });
});
