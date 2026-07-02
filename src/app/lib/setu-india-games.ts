export type SetuIndiaGameOrientation = 'portrait' | 'landscape' | 'both';

export type SetuIndiaGame = {
  id: string;
  title: string;
  slug: string;
  category: string;
  orientation: SetuIndiaGameOrientation;
  imageUrl: string;
  embedUrl: string;
  sourceUrl: string;
};

const CRAZYGAMES_GAME_BASE_URL = 'https://www.crazygames.com/game';
export const CRAZYGAMES_EMBED_BASE_URL = 'https://www.crazygames.com/embed';

function createCrazyGamesEntry(
  slug: string,
  title: string,
  category: string,
  orientation: SetuIndiaGameOrientation,
  imageUrl: string,
): SetuIndiaGame {
  return {
    id: slug,
    title,
    slug,
    category,
    orientation,
    imageUrl,
    embedUrl: `${CRAZYGAMES_EMBED_BASE_URL}/${slug}`,
    sourceUrl: `${CRAZYGAMES_GAME_BASE_URL}/${slug}`,
  };
}

export const setuIndiaGames = [
  createCrazyGamesEntry('paper-io-2', 'Paper.io 2', 'Arcade', 'both', 'https://imgs.crazygames.com/paper-io-2_1x1/20250214024144/paper-io-2_1x1-cover?format=auto&quality=85&metadata=none&width=360'),
  createCrazyGamesEntry('fruit-stab-challenge', 'Fruit Stab Challenge', 'Skill', 'both', 'https://imgs.crazygames.com/fruit-stab-challenge_1x1/20231009081707/fruit-stab-challenge_1x1-cover?format=auto&quality=85&metadata=none&width=360'),
  createCrazyGamesEntry('2048', '2048', 'Puzzle', 'portrait', 'https://imgs.crazygames.com/games/2048/cover_1x1-1707828857318.png?format=auto&quality=85&metadata=none&width=360'),
  createCrazyGamesEntry('word-search-lyg', 'Daily Word Search', 'Word', 'both', 'https://imgs.crazygames.com/word-search-lyg_1x1/20240306053555/word-search-lyg_1x1-cover?format=auto&quality=85&metadata=none&width=360'),
  createCrazyGamesEntry('find-the-difference', 'Find the Difference', 'Puzzle', 'portrait', 'https://imgs.crazygames.com/auto-covers/find-the-difference_1x1?format=auto&quality=85&metadata=none&width=360'),
  createCrazyGamesEntry('parking-jam-dqq', 'Parking Jam', 'Puzzle', 'portrait', 'https://imgs.crazygames.com/parking-jam-dqq_1x1/20250120063847/parking-jam-dqq_1x1-cover?format=auto&quality=85&metadata=none&width=360'),
  createCrazyGamesEntry('tentrix', 'TenTrix', 'Puzzle', 'portrait', 'https://imgs.crazygames.com/games/tentrix/cover_1x1-1722940216618.png?format=auto&quality=85&metadata=none&width=360'),
  createCrazyGamesEntry('2048-balls', 'Crazy 2048 Balls', 'Merge', 'both', 'https://imgs.crazygames.com/auto-covers2/2048-balls_1x1.png?format=auto&quality=85&metadata=none&width=360'),
  createCrazyGamesEntry('categories', 'Categories', 'Word', 'both', 'https://imgs.crazygames.com/categories_1x1/20240827025635/categories_1x1-cover?format=auto&quality=85&metadata=none&width=360'),
  createCrazyGamesEntry('cubes-2048-io', 'Cubes 2048.io', 'Arcade', 'both', 'https://imgs.crazygames.com/games/cubes-2048-io/cover_1x1-1693298929744.png?format=auto&quality=85&metadata=none&width=360'),
  createCrazyGamesEntry('math-push', 'Math Push', 'Logic', 'landscape', 'https://imgs.crazygames.com/auto-covers/math-push_1x1?format=auto&quality=85&metadata=none&width=360'),
  createCrazyGamesEntry('flow-mania', 'Flow Mania', 'Puzzle', 'landscape', 'https://imgs.crazygames.com/flowmania.png?metadata=none&quality=85&width=360&height=360&fit=crop'),
] as const satisfies readonly SetuIndiaGame[];

export function getSetuIndiaGameBySlug(slug?: string | null) {
  if (!slug) return null;
  return setuIndiaGames.find((game) => game.slug === slug) || null;
}
