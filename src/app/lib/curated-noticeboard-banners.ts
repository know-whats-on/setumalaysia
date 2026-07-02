import type { BannerRecord } from './api';
import { APP_VARIANT, type AppVariant } from './app-variant';
import { FREE_ELECTRICITY_GUIDE_ROUTE } from './free-electricity-guide';

const SYDNEY_TIME_ZONE = 'Australia/Sydney';
const FLOWER_MARKET_END_DAY = '2026-05-17';
const NATIONAL_DONUT_DAY_END_DAY = '2026-06-05';
const HENDRYS_TURNING_2_CUTOFF_MS = Date.parse('2026-06-14T06:00:00.000Z');
const SETU_EVERGREEN_NOTICEBOARD_BANNER_ID = 'setu-official-advisory-2026';

export const FLOWER_MARKET_EVENT_ROUTE =
  '/events/botanicgardens/flower-market-cj-hendry';
export const FLOWER_MARKET_BANNER_URL =
  'https://www.botanicgardens.org.au/sites/default/files/2026-02/events-flower-market-1024x676.jpg';
export const HENDRYS_TURNING_2_EVENT_ROUTE =
  '/events/cityofsydney/hendrys-turning-2';
export const HENDRYS_TURNING_2_NOTICEBOARD_BANNER_URL =
  '/noticeboard/hendrys-turning-2-alerts-banner.png';
export const FREE_ELECTRICITY_BANNER_URL =
  '/noticeboard/free-electricity-australia-2026.png';
export const NATIONAL_DONUT_DAY_BROOKLYN_BANNER_URL =
  '/noticeboard/national-donut-day-2026-brooklyn-donuts.png';
export const NATIONAL_DONUT_DAY_DONUT_KING_BANNER_URL =
  '/noticeboard/national-donut-day-2026-donut-king.png';
export const NATIONAL_DONUT_DAY_KRISPY_KREME_BANNER_URL =
  '/noticeboard/national-donut-day-2026-krispy-kreme.png';
export const NATIONAL_DONUT_DAY_BROOKLYN_LINK =
  'https://www.broadwaysydney.com.au/experience/events/free-donut';
export const NATIONAL_DONUT_DAY_DONUT_KING_LINK =
  'https://www.donutking.com.au/nationaldonutday2026';
export const NATIONAL_DONUT_DAY_KRISPY_KREME_LINK =
  'https://www.facebook.com/KrispyAustralia/posts/were-officially-counting-down-to-our-favourite-day-of-the-year-save-the-date-fri/1458361192987045/';

function getSydneyDayKey(date: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: SYDNEY_TIME_ZONE,
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
}

function getNationalDonutDayBanners(now: Date): BannerRecord[] {
  if (getSydneyDayKey(now) > NATIONAL_DONUT_DAY_END_DAY) return [];

  return [
    {
      id: 'curated-national-donut-day-2026-brooklyn-donuts',
      url: NATIONAL_DONUT_DAY_BROOKLYN_BANNER_URL,
      link: NATIONAL_DONUT_DAY_BROOKLYN_LINK,
      app_variant: 'all',
      placement: 'noticeboard',
      position: -10300,
    },
    {
      id: 'curated-national-donut-day-2026-donut-king',
      url: NATIONAL_DONUT_DAY_DONUT_KING_BANNER_URL,
      link: NATIONAL_DONUT_DAY_DONUT_KING_LINK,
      app_variant: 'all',
      placement: 'noticeboard',
      position: -10200,
    },
    {
      id: 'curated-national-donut-day-2026-krispy-kreme',
      url: NATIONAL_DONUT_DAY_KRISPY_KREME_BANNER_URL,
      link: NATIONAL_DONUT_DAY_KRISPY_KREME_LINK,
      app_variant: 'all',
      placement: 'noticeboard',
      position: -10100,
    },
  ];
}

export function getCuratedNoticeboardBanners(now = new Date()): BannerRecord[] {
  const banners: BannerRecord[] = [
    ...getNationalDonutDayBanners(now),
    ...(now.getTime() <= HENDRYS_TURNING_2_CUTOFF_MS
      ? [
          {
            id: 'curated-hendrys-turning-2-2026',
            url: HENDRYS_TURNING_2_NOTICEBOARD_BANNER_URL,
            link: HENDRYS_TURNING_2_EVENT_ROUTE,
            app_variant: 'all' as const,
            placement: 'noticeboard' as const,
            position: -10500,
          },
        ]
      : []),
    {
      id: 'curated-free-electricity-australia-2026',
      url: FREE_ELECTRICITY_BANNER_URL,
      link: FREE_ELECTRICITY_GUIDE_ROUTE,
      app_variant: 'all',
      placement: 'noticeboard',
      position: -10000,
    },
  ];

  if (getSydneyDayKey(now) > FLOWER_MARKET_END_DAY) return banners;

  return [
    ...banners,
    {
      id: 'curated-flower-market-cj-hendry',
      url: FLOWER_MARKET_BANNER_URL,
      link: FLOWER_MARKET_EVENT_ROUTE,
      app_variant: 'all',
      placement: 'noticeboard',
      position: -100,
    },
  ];
}

function getNoticeboardBannerRank(banner: BannerRecord, appVariant: AppVariant) {
  if (
    appVariant === 'ghar' &&
    banner.id === SETU_EVERGREEN_NOTICEBOARD_BANNER_ID
  ) {
    return Number.NEGATIVE_INFINITY;
  }

  return banner.position ?? 0;
}

export function getNoticeboardBannerSequence(
  banners: BannerRecord[] = [],
  options: { now?: Date; appVariant?: AppVariant } = {},
): BannerRecord[] {
  const appVariant = options.appVariant ?? APP_VARIANT;

  return [
    ...getCuratedNoticeboardBanners(options.now),
    ...banners.filter(
      (banner) => (banner.placement || 'noticeboard') === 'noticeboard',
    ),
  ].sort((left, right) => {
    const rankDifference =
      getNoticeboardBannerRank(left, appVariant) -
      getNoticeboardBannerRank(right, appVariant);
    if (rankDifference !== 0) return rankDifference;
    return (left.position ?? 0) - (right.position ?? 0);
  });
}
