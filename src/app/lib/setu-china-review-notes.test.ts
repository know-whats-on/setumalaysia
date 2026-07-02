import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { setuIndiaGames } from './setu-india-games';

describe('SETU China App Review notes', () => {
  it('include the App Store 4.7.4 index for every available CrazyGames title', () => {
    const notes = readFileSync(resolve(process.cwd(), 'mobile/review-notes/setu-china.md'), 'utf8');

    expect(notes).toContain('Guideline 4.7.4 Game / Software Index');
    for (const game of setuIndiaGames) {
      expect(notes).toContain(`| ${game.title} | CrazyGames | ${game.sourceUrl} |`);
    }
  });
});
