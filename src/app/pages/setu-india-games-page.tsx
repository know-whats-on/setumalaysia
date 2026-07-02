import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import {
  ArrowLeft,
  Blocks,
  Car,
  ChevronRight,
  CircleDot,
  ExternalLink,
  Gamepad2,
  Hash,
  ListTree,
  Map,
  Puzzle,
  ScanSearch,
  Search,
  Sigma,
  Swords,
  Waves,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import {
  getSetuIndiaGameBySlug,
  setuIndiaGames,
  type SetuIndiaGame,
} from '../lib/setu-india-games';
import { setuChinaShortcutIcons } from '../lib/setu-china-icons';
import { setuIndiaShortcutIcons } from '../lib/setu-india-icons';
import { APP_VARIANT } from '../lib/app-variant';
import { wolliShortcutIcons } from '../lib/wolli-icons';
import { setuMalaysiaShortcutIcons } from '../lib/setu-malaysia-icons';

type GameVisual = {
  Icon: LucideIcon;
  bgClass: string;
  textClass: string;
  ringClass: string;
};

type GamesPageTheme = {
  subtitle: string;
  introBody: string;
  icon: string;
  accent: string;
  softBg: string;
  border: string;
  shadow: string;
};

function getGamesPageTheme(): GamesPageTheme {
  if (APP_VARIANT === 'wheres_wolli') {
    return {
      subtitle: 'Mini games for a local break',
      introBody: 'Play a short casual, puzzle, or word game without leaving Wolli.',
      icon: wolliShortcutIcons.games,
      accent: '#008A8C',
      softBg: '#F3FAF7',
      border: '#CFE9E5',
      shadow: '0 16px 34px rgba(0, 138, 140, 0.1)',
    };
  }

  if (APP_VARIANT === 'setu_china') {
    return {
      subtitle: 'Mini games for a study break',
      introBody: 'Pick a quick casual, puzzle, or word game between classes.',
      icon: setuChinaShortcutIcons.games,
      accent: '#F04444',
      softBg: '#FFF7F5',
      border: '#F4D3CE',
      shadow: '0 16px 34px rgba(240, 68, 68, 0.08)',
    };
  }

  if (APP_VARIANT === 'jom_settle') {
    return {
      subtitle: 'Mini games for a study break',
      introBody: 'Pilih casual, puzzle, atau word games untuk rehat sekejap antara kelas.',
      icon: setuMalaysiaShortcutIcons.games,
      accent: '#F04444',
      softBg: '#FFF7F5',
      border: '#F4D3CE',
      shadow: '0 16px 34px rgba(240, 68, 68, 0.08)',
    };
  }

  return {
    subtitle: 'Mini games for a study break',
    introBody: 'Pick from casual, puzzle, and word games.',
    icon: setuIndiaShortcutIcons.games,
    accent: '#F04444',
    softBg: '#FFF7F5',
    border: '#F4D3CE',
    shadow: '0 16px 34px rgba(240, 68, 68, 0.08)',
  };
}

const defaultGameVisual: GameVisual = {
  Icon: Gamepad2,
  bgClass: 'bg-[#FFF4F2]',
  textClass: 'text-[#F04444]',
  ringClass: 'ring-[#FFD7D1]',
};

const gameVisuals: Record<string, GameVisual> = {
  'paper-io-2': {
    Icon: Map,
    bgClass: 'bg-[#EAF8F2]',
    textClass: 'text-[#047857]',
    ringClass: 'ring-[#B7E4CF]',
  },
  'fruit-stab-challenge': {
    Icon: Swords,
    bgClass: 'bg-[#FFF1F0]',
    textClass: 'text-[#DC2626]',
    ringClass: 'ring-[#FFD0C8]',
  },
  '2048': {
    Icon: Hash,
    bgClass: 'bg-[#FFF7ED]',
    textClass: 'text-[#C2410C]',
    ringClass: 'ring-[#FED7AA]',
  },
  'word-search-lyg': {
    Icon: Search,
    bgClass: 'bg-[#EEF8FF]',
    textClass: 'text-[#0369A1]',
    ringClass: 'ring-[#BAE6FD]',
  },
  'find-the-difference': {
    Icon: ScanSearch,
    bgClass: 'bg-[#FDF2F8]',
    textClass: 'text-[#BE185D]',
    ringClass: 'ring-[#FBCFE8]',
  },
  'parking-jam-dqq': {
    Icon: Car,
    bgClass: 'bg-[#F8FAFC]',
    textClass: 'text-[#334155]',
    ringClass: 'ring-[#CBD5E1]',
  },
  tentrix: {
    Icon: Puzzle,
    bgClass: 'bg-[#F3F0FF]',
    textClass: 'text-[#6D28D9]',
    ringClass: 'ring-[#DDD6FE]',
  },
  '2048-balls': {
    Icon: CircleDot,
    bgClass: 'bg-[#F0FDF4]',
    textClass: 'text-[#15803D]',
    ringClass: 'ring-[#BBF7D0]',
  },
  categories: {
    Icon: ListTree,
    bgClass: 'bg-[#EEF2FF]',
    textClass: 'text-[#4338CA]',
    ringClass: 'ring-[#C7D2FE]',
  },
  'cubes-2048-io': {
    Icon: Blocks,
    bgClass: 'bg-[#ECFEFF]',
    textClass: 'text-[#0E7490]',
    ringClass: 'ring-[#A5F3FC]',
  },
  'math-push': {
    Icon: Sigma,
    bgClass: 'bg-[#F7FEE7]',
    textClass: 'text-[#4D7C0F]',
    ringClass: 'ring-[#D9F99D]',
  },
  'flow-mania': {
    Icon: Waves,
    bgClass: 'bg-[#EFF6FF]',
    textClass: 'text-[#2563EB]',
    ringClass: 'ring-[#BFDBFE]',
  },
};

function getGameVisual(game: SetuIndiaGame) {
  return gameVisuals[game.slug] || defaultGameVisual;
}

function shouldUseNativeGameLauncher() {
  return Capacitor.isNativePlatform();
}

async function openCrazyGamesSource(game: SetuIndiaGame) {
  try {
    await Browser.open({ url: game.sourceUrl });
  } catch {
    window.open(game.sourceUrl, '_blank', 'noopener,noreferrer');
  }
}

function GameCover({ game, size = 'drawer' }: { game: SetuIndiaGame; size?: 'drawer' | 'hero' }) {
  const visual = getGameVisual(game);
  const Icon = visual.Icon;
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const dimensionClass = size === 'hero' ? 'h-28 w-28 rounded-[28px]' : 'h-[68px] w-[68px] rounded-[18px]';
  const iconClass = size === 'hero' ? 'h-11 w-11' : 'h-8 w-8';

  return (
    <span
      className={`relative flex shrink-0 items-center justify-center overflow-hidden shadow-[0_8px_18px_rgba(15,23,42,0.1)] ring-1 ${dimensionClass} ${visual.bgClass} ${visual.textClass} ${visual.ringClass}`}
      data-game-icon={game.slug}
      aria-hidden="true"
    >
      {(!imageLoaded || imageFailed) && <Icon className={iconClass} strokeWidth={2.35} />}
      {!imageFailed && (
        <img
          src={game.imageUrl}
          alt=""
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-200 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
          loading="eager"
          decoding="async"
          referrerPolicy="no-referrer"
          data-game-cover={game.slug}
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageFailed(true)}
        />
      )}
    </span>
  );
}

function GameDrawerItem({ game, onSelect }: { game: SetuIndiaGame; onSelect: (game: SetuIndiaGame) => void }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(game)}
      data-game-card={game.slug}
      className="group flex min-w-0 flex-col items-center gap-2 rounded-[18px] px-1 py-2 text-center transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F04444]/45"
    >
      <GameCover game={game} />
      <span className="block min-h-[2.15rem] w-full max-w-[5.25rem] overflow-hidden text-center text-[11px] font-black leading-tight text-[#111827] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] [overflow-wrap:anywhere]">
        {game.title}
      </span>
    </button>
  );
}

function GamesChooser({ onSelect }: { onSelect: (game: SetuIndiaGame) => void }) {
  const navigate = useNavigate();
  const featuredGame = setuIndiaGames[0];
  const theme = getGamesPageTheme();

  return (
    <div className="size-full overflow-y-auto bg-white" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="flex w-full max-w-none flex-col gap-5 px-4 pb-[calc(var(--app-bottom-nav-clearance)+1rem)] pt-[calc(var(--native-safe-area-top)+1rem)] sm:px-6">
        <header className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FFF4F2] text-[#0F172A]"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[1.65rem] font-black leading-tight text-[#080B12] sm:text-[2rem]">Play Games</h1>
            <p className="mt-0.5 truncate text-sm font-semibold text-[#64748B]">{theme.subtitle}</p>
          </div>
        </header>

        <section
          className="relative min-h-[196px] overflow-hidden rounded-[24px] border p-5"
          style={{ background: theme.softBg, borderColor: theme.border, boxShadow: theme.shadow }}
        >
          <div className="relative z-10 max-w-[62%]">
            <h2 className="break-words text-[1.8rem] font-black leading-none text-[#080B12] [overflow-wrap:anywhere]">
              Pick a quick game
            </h2>
            <p className="mt-3 max-w-[15rem] text-sm font-semibold leading-5 text-[#64748B]">
              {theme.introBody}
            </p>
            <button
              type="button"
              onClick={() => onSelect(featuredGame)}
              className="mt-5 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-black text-white shadow-[0_10px_20px_rgba(15,23,42,0.12)]"
              style={{ background: theme.accent }}
            >
              Start playing
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <img
            src={theme.icon}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-5 -right-10 h-[198px] w-[198px] object-contain drop-shadow-[0_18px_28px_rgba(180,70,36,0.14)] sm:-right-2 sm:h-[222px] sm:w-[222px]"
            loading="eager"
          />
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="min-w-0 text-xl font-black leading-tight text-[#080B12]">Choose a game</h2>
            <span className="shrink-0 text-xs font-black" style={{ color: theme.accent }}>{setuIndiaGames.length} games</span>
          </div>
          <div className="grid grid-cols-4 gap-x-3 gap-y-5 sm:grid-cols-5 md:grid-cols-6">
            {setuIndiaGames.map((game) => (
              <GameDrawerItem key={game.id} game={game} onSelect={onSelect} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function GamesPlayer({
  game,
  onClose,
}: {
  game: SetuIndiaGame;
  onClose: () => void;
}) {
  const theme = getGamesPageTheme();

  return (
    <div className="flex size-full flex-col bg-[#080B12]" style={{ fontFamily: 'Inter, sans-serif' }}>
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[#E2E8F0] bg-white px-4 py-3 native-safe-area-top sm:px-6">
        <button
          type="button"
          onClick={onClose}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FFF4F2] text-[#0F172A]"
          aria-label="Back to games"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-black text-[#080B12]">{game.title}</h1>
          <p className="truncate text-xs font-bold text-[#64748B]">{game.category} game</p>
        </div>
        <button
          type="button"
          onClick={() => void openCrazyGamesSource(game)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white"
          style={{ background: theme.accent }}
          aria-label="Open on CrazyGames"
        >
          <ExternalLink className="h-4 w-4" />
        </button>
      </header>
      <div className="min-h-0 flex-1 bg-[#080B12] sm:p-3">
        <iframe
          key={game.slug}
          title={`${game.title} game`}
          src={game.embedUrl}
          className="h-full w-full border-0 bg-[#080B12] sm:rounded-[18px]"
          allow="gamepad *; fullscreen; autoplay"
          allowFullScreen
          loading="eager"
        />
      </div>
    </div>
  );
}

function NativeGamesLauncher({
  game,
  onClose,
}: {
  game: SetuIndiaGame;
  onClose: () => void;
}) {
  const theme = getGamesPageTheme();
  const launchAttemptedRef = useRef(false);

  useEffect(() => {
    if (launchAttemptedRef.current) return;
    launchAttemptedRef.current = true;
    void openCrazyGamesSource(game);
  }, [game]);

  return (
    <div className="flex size-full flex-col bg-white" style={{ fontFamily: 'Inter, sans-serif' }}>
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[#FFE2DE] bg-white px-4 py-3 native-safe-area-top sm:px-6">
        <button
          type="button"
          onClick={onClose}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FFF4F2] text-[#0F172A]"
          aria-label="Back to games"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-black text-[#080B12]">{game.title}</h1>
          <p className="truncate text-xs font-bold text-[#64748B]">{game.category} game</p>
        </div>
      </header>
      <main className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 pb-[calc(var(--app-bottom-nav-clearance)+1.5rem)] pt-8 text-center">
        <GameCover game={game} size="hero" />
        <h2 className="mt-5 max-w-xs text-3xl font-black leading-tight text-[#080B12]">{game.title}</h2>
        <p className="mt-3 max-w-[19rem] text-sm font-semibold leading-5 text-[#64748B]">
          This opens on CrazyGames for reliable iPhone loading.
        </p>
        <button
          type="button"
          onClick={() => void openCrazyGamesSource(game)}
          className="mt-6 inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-black text-white shadow-[0_12px_24px_rgba(15,23,42,0.12)]"
          style={{ background: theme.accent }}
        >
          Open game
          <ExternalLink className="h-4 w-4" />
        </button>
      </main>
    </div>
  );
}

export function SetuIndiaGamesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedSlug = searchParams.get('game');
  const selectedGame = useMemo(() => getSetuIndiaGameBySlug(selectedSlug), [selectedSlug]);
  const useNativeLauncher = shouldUseNativeGameLauncher();

  const handleSelectGame = (game: SetuIndiaGame) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('game', game.slug);
    setSearchParams(nextParams);
  };

  const handleClosePlayer = () => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('game');
    setSearchParams(nextParams, { replace: true });
  };

  if (selectedGame) {
    if (useNativeLauncher) {
      return <NativeGamesLauncher game={selectedGame} onClose={handleClosePlayer} />;
    }

    return <GamesPlayer game={selectedGame} onClose={handleClosePlayer} />;
  }

  return <GamesChooser onSelect={handleSelectGame} />;
}
