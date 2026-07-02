import { APP_VARIANT, type AppVariant } from './app-variant';
import { HOODIE_RESOURCES_DEFAULT_ROUTE } from './resources-routes';

export type HoodieHelpTourStepId =
  | 'map'
  | 'price-compare'
  | 'trip-planner'
  | 'fuel'
  | 'vibe'
  | 'hoodienie'
  | 'resources'
  | 'profile'
  | 'household';

export type HoodieHelpTourMode = 'first_run' | 'manual';
export type HoodieHelpGroupLabel = 'Map' | 'Vibe' | 'Hoodienie' | 'Gendu' | '智能助手' | 'Sang Kancil' | 'Wolli' | 'Resources' | 'Profile';
export type HoodieHelpBubblePlacement = 'top-right' | 'upper-center';
export type HoodieHelpVideoFormat = 'short' | 'standard';

export interface HoodieHelpTourStep {
  id: HoodieHelpTourStepId;
  title: string;
  groupLabel: HoodieHelpGroupLabel;
  route: string;
  surface?: 'trip-planner';
  isMapSubsection: boolean;
  triggerStyle: 'fab' | 'inline';
  placement: HoodieHelpBubblePlacement;
  videoSrc?: string;
  videoFormat: HoodieHelpVideoFormat;
}

type HelpVideoSrcMap = Record<HoodieHelpTourStepId, string | undefined>;
type HelpTourVariantConfig = {
  assistantLabel: Extract<HoodieHelpGroupLabel, 'Hoodienie' | 'Gendu' | '智能助手' | 'Sang Kancil' | 'Wolli'>;
  storageKeyPrefix: string;
  videoSources: HelpVideoSrcMap;
};

const DEFAULT_BUNDLED_VIDEO_SRCS: HelpVideoSrcMap = {
  map: '/onboarding-videos/map.mp4',
  'price-compare': '/onboarding-videos/price-compare.mp4',
  'trip-planner': '/onboarding-videos/trip-planner.mp4',
  fuel: '/onboarding-videos/fuel.mp4',
  vibe: '/onboarding-videos/vibe.mp4',
  hoodienie: '/onboarding-videos/assistant.mp4',
  resources: '/onboarding-videos/resources.mp4',
  profile: '/onboarding-videos/profile.mp4',
  household: '/onboarding-videos/household.mp4',
};

const HELP_TOUR_VARIANT_CONFIGS: Record<AppVariant, HelpTourVariantConfig> = {
  ghar: {
    assistantLabel: 'Gendu',
    storageKeyPrefix: 'setu_help_tour_completed_v1',
    videoSources: DEFAULT_BUNDLED_VIDEO_SRCS,
  },
  burb_mate: {
    assistantLabel: 'Hoodienie',
    storageKeyPrefix: 'hoodie_help_tour_completed_v1',
    videoSources: DEFAULT_BUNDLED_VIDEO_SRCS,
  },
  setu_china: {
    assistantLabel: '智能助手',
    storageKeyPrefix: 'setu_china_help_tour_completed_v1',
    videoSources: DEFAULT_BUNDLED_VIDEO_SRCS,
  },
  jom_settle: {
    assistantLabel: 'Sang Kancil',
    storageKeyPrefix: 'jom_settle_help_tour_completed_v1',
    videoSources: DEFAULT_BUNDLED_VIDEO_SRCS,
  },
  wheres_wolli: {
    assistantLabel: 'Wolli',
    storageKeyPrefix: 'wheres_wolli_help_tour_completed_v1',
    videoSources: DEFAULT_BUNDLED_VIDEO_SRCS,
  },
};

export const HOODIE_HELP_TOUR_SEQUENCE: HoodieHelpTourStepId[] = [
  'hoodienie',
  'map',
  'price-compare',
  'trip-planner',
  'fuel',
  'vibe',
  'resources',
  'profile',
  'household',
];

function buildVariantSteps(variant: AppVariant): Record<HoodieHelpTourStepId, HoodieHelpTourStep> {
  const config = HELP_TOUR_VARIANT_CONFIGS[variant];
  return {
    map: {
      id: 'map',
      title: 'Map',
      groupLabel: 'Map',
      route: '/dashboard',
      isMapSubsection: false,
      triggerStyle: 'fab',
      placement: 'top-right',
      videoSrc: config.videoSources.map,
      videoFormat: 'short',
    },
    'price-compare': {
      id: 'price-compare',
      title: 'Price Compare',
      groupLabel: 'Map',
      route: '/shopping?retailer=compare',
      isMapSubsection: true,
      triggerStyle: 'inline',
      placement: 'upper-center',
      videoSrc: config.videoSources['price-compare'],
      videoFormat: 'short',
    },
    'trip-planner': {
      id: 'trip-planner',
      title: 'Trip Planner',
      groupLabel: 'Map',
      route: '/dashboard',
      surface: 'trip-planner',
      isMapSubsection: true,
      triggerStyle: 'inline',
      placement: 'top-right',
      videoSrc: config.videoSources['trip-planner'],
      videoFormat: 'short',
    },
    fuel: {
      id: 'fuel',
      title: 'Fuel Finder',
      groupLabel: 'Map',
      route: '/fuel',
      isMapSubsection: true,
      triggerStyle: 'inline',
      placement: 'upper-center',
      videoSrc: config.videoSources.fuel,
      videoFormat: 'short',
    },
    vibe: {
      id: 'vibe',
      title: 'Vibe',
      groupLabel: 'Vibe',
      route: '/vibe',
      isMapSubsection: false,
      triggerStyle: 'inline',
      placement: 'upper-center',
      videoSrc: config.videoSources.vibe,
      videoFormat: 'short',
    },
    hoodienie: {
      id: 'hoodienie',
      title: config.assistantLabel,
      groupLabel: config.assistantLabel,
      route: '/arrival',
      isMapSubsection: false,
      triggerStyle: 'inline',
      placement: 'upper-center',
      videoSrc: config.videoSources.hoodienie,
      videoFormat: 'short',
    },
    resources: {
      id: 'resources',
      title: 'Resources',
      groupLabel: 'Resources',
      route: HOODIE_RESOURCES_DEFAULT_ROUTE,
      isMapSubsection: false,
      triggerStyle: 'inline',
      placement: 'upper-center',
      videoSrc: config.videoSources.resources,
      videoFormat: 'short',
    },
    profile: {
      id: 'profile',
      title: 'Profile',
      groupLabel: 'Profile',
      route: '/profile',
      isMapSubsection: false,
      triggerStyle: 'inline',
      placement: 'upper-center',
      videoSrc: config.videoSources.profile,
      videoFormat: 'short',
    },
    household: {
      id: 'household',
      title: 'Household',
      groupLabel: 'Profile',
      route: '/profile?tab=household',
      isMapSubsection: false,
      triggerStyle: 'inline',
      placement: 'upper-center',
      videoSrc: config.videoSources.household,
      videoFormat: 'short',
    },
  };
}

export const HOODIE_HELP_TOUR_STEPS_BY_VARIANT: Record<
  AppVariant,
  Record<HoodieHelpTourStepId, HoodieHelpTourStep>
> = {
  ghar: buildVariantSteps('ghar'),
  burb_mate: buildVariantSteps('burb_mate'),
  setu_china: buildVariantSteps('setu_china'),
  jom_settle: buildVariantSteps('jom_settle'),
  wheres_wolli: buildVariantSteps('wheres_wolli'),
};

export const HOODIE_HELP_TOUR_STEPS = HOODIE_HELP_TOUR_STEPS_BY_VARIANT[APP_VARIANT];

export function getHoodieHelpTourSteps(variant: AppVariant = APP_VARIANT) {
  return HOODIE_HELP_TOUR_STEPS_BY_VARIANT[variant];
}

export function getHoodieHelpTourStep(
  stepId: HoodieHelpTourStepId,
  variant: AppVariant = APP_VARIANT,
) {
  return HOODIE_HELP_TOUR_STEPS_BY_VARIANT[variant][stepId];
}

export function getNextHoodieHelpTourStepId(stepId: HoodieHelpTourStepId) {
  const currentIndex = HOODIE_HELP_TOUR_SEQUENCE.indexOf(stepId);
  if (currentIndex < 0 || currentIndex === HOODIE_HELP_TOUR_SEQUENCE.length - 1) {
    return null;
  }
  return HOODIE_HELP_TOUR_SEQUENCE[currentIndex + 1];
}

export function buildHoodieHelpCompletionStorageKey(
  email: string,
  variant: AppVariant = APP_VARIANT,
) {
  return `${HELP_TOUR_VARIANT_CONFIGS[variant].storageKeyPrefix}_${String(email || '').trim().toLowerCase()}`;
}

export function isHoodieHelpStepVisibleOnRoute(
  stepId: HoodieHelpTourStepId,
  pathname: string,
  search: string,
) {
  if (stepId === 'map' || stepId === 'trip-planner') {
    return pathname.startsWith('/dashboard');
  }
  if (stepId === 'price-compare') {
    const searchParams = new URLSearchParams(search);
    return pathname.startsWith('/shopping') && searchParams.get('retailer') === 'compare';
  }
  if (stepId === 'fuel') return pathname.startsWith('/fuel');
  if (stepId === 'vibe') return pathname.startsWith('/vibe');
  if (stepId === 'hoodienie') return pathname.startsWith('/arrival');
  if (stepId === 'resources') return pathname.startsWith('/legal');
  if (stepId === 'household') {
    const searchParams = new URLSearchParams(search);
    return pathname.startsWith('/profile') && searchParams.get('tab') === 'household';
  }
  if (stepId === 'profile') return pathname.startsWith('/profile');
  return false;
}

export function getHoodieHelpBubbleSize(viewportWidth: number) {
  return Math.max(176, Math.min(224, Math.round(viewportWidth * 0.46)));
}

export function getHoodieHelpDefaultBubblePosition(
  stepId: HoodieHelpTourStepId,
  viewportWidth: number,
  viewportHeight: number,
  variant: AppVariant = APP_VARIANT,
) {
  const bubbleSize = getHoodieHelpBubbleSize(viewportWidth);
  const step = getHoodieHelpTourStep(stepId, variant);
  const rightAlignedX = Math.max(16, viewportWidth - bubbleSize - 20);
  const centeredX = Math.max(16, Math.round((viewportWidth - bubbleSize) / 2));
  const maxY = Math.max(24, viewportHeight - bubbleSize - 120);
  const desiredY = step.placement === 'top-right' ? 92 : 184;

  return {
    x: step.placement === 'top-right' ? rightAlignedX : centeredX,
    y: Math.min(maxY, desiredY),
  };
}

export function clampHoodieHelpBubblePosition(
  position: { x: number; y: number },
  viewportWidth: number,
  viewportHeight: number,
) {
  const bubbleSize = getHoodieHelpBubbleSize(viewportWidth);
  return {
    x: Math.min(Math.max(16, position.x), Math.max(16, viewportWidth - bubbleSize - 16)),
    y: Math.min(Math.max(16, position.y), Math.max(16, viewportHeight - bubbleSize - 96)),
  };
}
