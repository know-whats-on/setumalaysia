// @vitest-environment jsdom

import { act, type ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Browser } from '@capacitor/browser';
import { SetuIndiaGamesPage } from './setu-india-games-page';
import { setuIndiaGames } from '../lib/setu-india-games';

vi.mock('@capacitor/browser', () => ({
  Browser: {
    open: vi.fn().mockResolvedValue(undefined),
  },
}));

type MountedComponent = {
  container: HTMLDivElement;
  root: Root;
};

const mountedComponents: MountedComponent[] = [];

function renderRoute(path: string, element: ReactElement) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  mountedComponents.push({ container, root });

  act(() => {
    root.render(
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/games" element={element} />
        </Routes>
      </MemoryRouter>,
    );
  });

  return container;
}

function getButtonByText(container: HTMLElement, text: string) {
  return Array.from(container.querySelectorAll('button')).find((button) =>
    button.textContent?.includes(text),
  );
}

beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  vi.mocked(Browser.open).mockClear();
});

afterEach(() => {
  for (const mounted of mountedComponents.splice(0)) {
    act(() => mounted.root.unmount());
    mounted.container.remove();
  }
  vi.clearAllMocks();
});

describe('SetuIndiaGamesPage', () => {
  it('renders the games chooser with the approved SETU copy and game list', () => {
    const container = renderRoute('/games', <SetuIndiaGamesPage />);

    expect(container.textContent).toContain('Play Games');
    expect(container.textContent).toContain('Mini games for a study break');
    expect(container.textContent).toContain('Paper.io 2');
    expect(container.textContent).toContain('Fruit Stab Challenge');
    expect(container.querySelectorAll('[data-game-card]').length).toBe(12);
    expect(container.querySelectorAll('[data-game-icon]').length).toBe(12);
    expect(container.querySelectorAll('[data-game-cover]').length).toBe(12);
    expect(container.querySelector('[data-game-icon="paper-io-2"]')).toBeTruthy();
    expect(container.querySelector('[data-game-icon="fruit-stab-challenge"]')).toBeTruthy();
    expect(container.querySelector('[data-game-cover="paper-io-2"]')?.getAttribute('src')).toContain('paper-io-2_1x1');
    expect(container.querySelector('[data-game-cover="fruit-stab-challenge"]')?.getAttribute('src')).toContain('fruit-stab-challenge_1x1');
    for (const game of setuIndiaGames) {
      const card = container.querySelector(`[data-game-card="${game.slug}"]`);
      expect(card?.textContent?.replace(/\s+/g, ' ').trim()).toBe(game.title);
    }
    expect(container.textContent).not.toContain('Mobile ready');
    expect(container.textContent).not.toContain('Portrait');
    expect(container.textContent).not.toContain('Landscape');
    expect(container.querySelector('iframe')).toBeNull();
  });

  it('selects a game from the chooser and renders the CrazyGames iframe', () => {
    const container = renderRoute('/games', <SetuIndiaGamesPage />);
    const gameButton = getButtonByText(container, 'Fruit Stab Challenge');

    expect(gameButton).toBeTruthy();
    act(() => {
      gameButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const iframe = container.querySelector('iframe') as HTMLIFrameElement | null;
    expect(iframe).toBeTruthy();
    expect(iframe?.title).toBe('Fruit Stab Challenge game');
    expect(iframe?.getAttribute('src')).toBe('https://www.crazygames.com/embed/fruit-stab-challenge');
  });

  it('renders a selected game from the game search param', () => {
    const container = renderRoute('/games?game=paper-io-2', <SetuIndiaGamesPage />);
    const iframe = container.querySelector('iframe') as HTMLIFrameElement | null;

    expect(container.textContent).toContain('Paper.io 2');
    expect(iframe).toBeTruthy();
    expect(iframe?.title).toBe('Paper.io 2 game');
    expect(iframe?.getAttribute('src')).toBe('https://www.crazygames.com/embed/paper-io-2');
  });

  it('falls back to the chooser for unknown game params', () => {
    const container = renderRoute('/games?game=battle-brigade', <SetuIndiaGamesPage />);

    expect(container.textContent).toContain('Choose a game');
    expect(container.querySelector('iframe')).toBeNull();
  });
});
