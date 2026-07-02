import { describe, expect, it } from 'vitest';
import { setuIndiaQuickActions } from './setu-india-content';
import { CRAZYGAMES_EMBED_BASE_URL, getSetuIndiaGameBySlug, setuIndiaGames } from './setu-india-games';

const approvedGameSlugs = [
  'paper-io-2',
  'fruit-stab-challenge',
  '2048',
  'word-search-lyg',
  'find-the-difference',
  'parking-jam-dqq',
  'tentrix',
  '2048-balls',
  'categories',
  'cubes-2048-io',
  'math-push',
  'flow-mania',
];

describe('SETU India games catalog', () => {
  it('uses Play Games as the SETU India home shortcut instead of Ask Gendu', () => {
    const labels = setuIndiaQuickActions.map((action) => action.label);
    const playGamesAction = setuIndiaQuickActions.find((action) => action.label === 'Play Games');

    expect(labels).toContain('Play Games');
    expect(labels).not.toContain('Ask Gendu');
    expect(playGamesAction).toMatchObject({
      zh: 'Mini games',
      route: '/games',
    });
  });

  it('contains the approved static CrazyGames embed allowlist', () => {
    const slugs = setuIndiaGames.map((game) => game.slug);
    const uniqueSlugs = new Set(slugs);

    expect(slugs).toEqual(approvedGameSlugs);
    expect(uniqueSlugs.size).toBe(slugs.length);
    expect(slugs).not.toContain('battle-brigade');

    for (const game of setuIndiaGames) {
      expect(game.embedUrl).toBe(`${CRAZYGAMES_EMBED_BASE_URL}/${game.slug}`);
      expect(game.sourceUrl).toBe(`https://www.crazygames.com/game/${game.slug}`);
      expect(game.imageUrl).toMatch(/^https:\/\/imgs\.crazygames\.com\//);
    }
  });

  it('resolves known games by slug and rejects unknown games', () => {
    expect(getSetuIndiaGameBySlug('paper-io-2')?.title).toBe('Paper.io 2');
    expect(getSetuIndiaGameBySlug('battle-brigade')).toBeNull();
    expect(getSetuIndiaGameBySlug(null)).toBeNull();
  });
});
