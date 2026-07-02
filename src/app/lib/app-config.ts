import hoodieIcon from '../../assets/burb-buddy-512.png';
import setuMalaysiaAppIcon from '../../assets/setu-malaysia-app-icon.png';
import setuMalaysiaSocial from '../../assets/setu-malaysia-social.png';
import setuMalaysiaSplashBackground from '../../assets/setu-malaysia-splash-background.png';
import setuMalaysiaWordmark from '../../assets/setu-malaysia-wordmark.png';
import setuIndiaAppIcon from '../../assets/setu-india-app-icon.png';
import setuAusBlip from '../../assets/setu-aus-blip.png';
import setuChinaAppIcon from '../../assets/setu-china-app-icon.png';
import setuChinaBlip from '../../assets/setu-china-blip.png';
import wolliAppIcon from '../../assets/wolli/wolli-app-icon.png';
import wolliEventsHero from '../../assets/wolli/wolli-events-hero.png';
import wolliFlyingMascot from '../../assets/wolli/wolli-flying-mascot.png';
import wolliHeaderBg from '../../assets/wolli/wolli-header-bg.png';
import wolliHomeHero from '../../assets/wolli/wolli-home-hero.png';
import wolliLoadingBlip from '../../assets/wolli/wolli-loading-blip.png';
import wolliWordmark from '../../assets/wolli/wolli-wordmark.png';
import { APP_VARIANT, type AppVariant } from './app-variant';
import { HOODIE_RESOURCES_DEFAULT_ROUTE, SETU_CHINA_RESOURCES_DEFAULT_ROUTE, SETU_INDIA_RESOURCES_DEFAULT_ROUTE } from './resources-routes';

export type AppExperienceMode = 'classic' | 'hoodie';
export type AppResourceRoute = '/setu' | '/arrival' | `/legal${string}`;
export type AppVibeNestedTab = 'my-hood' | 'suburb-score';

export interface AppConfig {
  variant: AppVariant;
  experienceMode: AppExperienceMode;
  showVideoOnboarding: boolean;
  displayName: string;
  legalName: string;
  assistantName: string;
  supportEmail: string;
  supportMailto: string;
  marketingUrl: string;
  inviteBaseUrl: string;
  shareBaseUrl: string;
  referralShareImagePath?: string;
  iosStoreUrl: string;
  androidStoreUrl: string;
  title: string;
  description: string;
  shortName: string;
  ogTitle: string;
  resourcesLabel: string;
  resourcesRoute: AppResourceRoute;
  healthCheckTitle: string;
  onboardingWordmark: string;
  onboardingDescriptor?: string;
  onboardingMarker: string;
  onboardingMarkerAlt: string;
  loadingLabel: string;
  webIcon: string;
  socialImageUrl: string;
  urlScheme: string;
  instagramStoriesAppId?: string;
  defaultCouncilSlug?: string;
  localSourceUrls?: {
    councilHome: string;
    news: string;
    events: string;
    waste?: string;
    reportIssue?: string;
    contact?: string;
  };
  assistantProfile?: {
    audience: string;
    persona: string;
    supportContext: string;
  };
  launchArt?: {
    homeHero: string;
    eventsHero: string;
    headerBg: string;
    mascot: string;
    loadingBlip?: string;
    wordmark?: string;
  };
  splashArt?: {
    backgroundImage: string;
    wordmark?: string;
  };
  showOfficialEventsFeature: boolean;
  showPublicPlansFeature: boolean;
  showSetuFeatures: boolean;
  showHciAlerts: boolean;
  showVibeHciAlerts: boolean;
  showPartnershipBadge: boolean;
  useSharedResourcesShell: boolean;
  showVibeGuides: boolean;
  defaultVibeTab: AppVibeNestedTab;
  vibeGuidesLabel: string;
  newcomerModeDefault: 'student' | 'newcomer';
  splashHeroTitle: string;
  splashHeroSubtitle: string;
  splashMessages: Array<{
    body: string;
    cta: string;
    icon: 'shield' | 'search' | 'user';
  }>;
}

function readOptionalEnv(value: unknown) {
  const normalized = String(value || '').trim();
  return normalized || undefined;
}

const setuInstagramStoriesAppId = readOptionalEnv(import.meta.env.VITE_SETU_INSTAGRAM_STORIES_APP_ID);
const hoodieInstagramStoriesAppId = String(import.meta.env.VITE_HOODIE_INSTAGRAM_STORIES_APP_ID || '').trim() || undefined;

const appConfigs: Record<AppVariant, AppConfig> = {
  ghar: {
    variant: 'ghar',
    experienceMode: 'hoodie',
    showVideoOnboarding: false,
    displayName: 'SETU India AU',
    legalName: 'SETU India AU',
    assistantName: 'Gendu',
    supportEmail: 'ghar@knowwhatson.com',
    supportMailto: 'mailto:ghar@knowwhatson.com',
    marketingUrl: 'https://ghar.knowwhatson.com',
    inviteBaseUrl: 'https://ghar.knowwhatson.com',
    shareBaseUrl: 'https://ghar.knowwhatson.com',
    referralShareImagePath: undefined,
    iosStoreUrl: 'https://apps.apple.com/au/search?term=SETU%20India%20AU',
    androidStoreUrl: 'https://play.google.com/store/apps/details?id=com.ghar.mobile',
    title: 'SETU India AU — Student Housing Safety',
    description: 'Student housing safety tools for Australia, including rental evidence support, community property reviews, and India-to-Australia tenancy guidance.',
    shortName: 'SETU India AU',
    ogTitle: 'SETU India AU: Student Housing Safety',
    resourcesLabel: 'Tasks',
    resourcesRoute: SETU_INDIA_RESOURCES_DEFAULT_ROUTE,
    healthCheckTitle: 'SETU India AU Tenancy Health Check',
    onboardingWordmark: 'SETU India AU',
    onboardingMarker: setuAusBlip,
    onboardingMarkerAlt: 'SETU India AU marker',
    loadingLabel: 'Loading SETU India AU',
    webIcon: setuIndiaAppIcon,
    socialImageUrl: setuIndiaAppIcon,
    urlScheme: 'com.ghar.mobile',
    instagramStoriesAppId: setuInstagramStoriesAppId,
    showOfficialEventsFeature: true,
    showPublicPlansFeature: true,
    showSetuFeatures: true,
    showHciAlerts: false,
    showVibeHciAlerts: true,
    showPartnershipBadge: false,
    useSharedResourcesShell: true,
    showVibeGuides: true,
    defaultVibeTab: 'suburb-score',
    vibeGuidesLabel: 'Guides',
    newcomerModeDefault: 'student',
    splashHeroTitle: 'SETU India AU',
    splashHeroSubtitle: 'Ask Gendu',
    splashMessages: [
      {
        body: 'Check a suburb before you move. Avoid costly mistakes, spot scams, assess rental risks, and read public-reported issues in one place.',
        cta: 'Check My Area',
        icon: 'shield',
      },
      {
        body: 'Compare nearby grocery prices, essentials, and local savings.',
        cta: 'Check Grocery Costs',
        icon: 'search',
      },
      {
        body: 'Join the clique. Find students and young renters near you.',
        cta: 'See Who Lives Here',
        icon: 'user',
      },
    ],
  },
  burb_mate: {
    variant: 'burb_mate',
    experienceMode: 'hoodie',
    showVideoOnboarding: true,
    displayName: "Hoodie",
    legalName: "Hoodie",
    assistantName: 'Hoodienie',
    supportEmail: 'ghar@knowwhatson.com',
    supportMailto: 'mailto:ghar@knowwhatson.com',
    marketingUrl: 'https://suburb.knowwhatson.com',
    inviteBaseUrl: 'https://suburb.knowwhatson.com',
    shareBaseUrl: 'https://suburb.knowwhatson.com',
    referralShareImagePath: '/social/hoodie-referral-invite-banner.png',
    iosStoreUrl: 'https://apps.apple.com/au/search?term=Hoodie',
    androidStoreUrl: 'https://play.google.com/store/apps/details?id=com.burbmate.app',
    title: "Hoodie - Your Australia Suburb Mate",
    description: 'Hoodie helps you explore suburbs, keep up with local updates, plan with friends, understand housing context, and settle into Australia with more confidence.',
    shortName: "Hoodie",
    ogTitle: "Hoodie: Your Australia Suburb Mate",
    resourcesLabel: 'Hoodienie',
    resourcesRoute: '/arrival',
    healthCheckTitle: "Hoodie Housing Check",
    onboardingWordmark: "Hoodie",
    onboardingMarker: hoodieIcon,
    onboardingMarkerAlt: "Hoodie logo",
    loadingLabel: "Loading Hoodie",
    webIcon: hoodieIcon,
    socialImageUrl: 'https://suburb.knowwhatson.com/social/hoodie-share-banner.png',
    urlScheme: 'com.burbmate.app',
    instagramStoriesAppId: hoodieInstagramStoriesAppId,
    showOfficialEventsFeature: true,
    showPublicPlansFeature: true,
    showSetuFeatures: false,
    showHciAlerts: false,
    showVibeHciAlerts: false,
    showPartnershipBadge: false,
    useSharedResourcesShell: true,
    showVibeGuides: true,
    defaultVibeTab: 'my-hood',
    vibeGuidesLabel: "My 'hood",
    newcomerModeDefault: 'newcomer',
    splashHeroTitle: 'hoodie!',
    splashHeroSubtitle: "Discover Your 'Hood!",
    splashMessages: [
      {
        body: "Know your 'hood before you move. Spot the good bits, dodge the red flags, and settle in smarter.",
        cta: "Check My 'Hood",
        icon: 'shield',
      },
      {
        body: "See what's on nearby, what to watch for, and what day-to-day life in your next suburb really feels like.",
        cta: 'See My Area',
        icon: 'search',
      },
      {
        body: "Keep plans, alerts, and local know-how in one place so settling in feels lighter from day one.",
        cta: "Let's Look Around",
        icon: 'user',
      },
    ],
  },
  setu_china: {
    variant: 'setu_china',
    experienceMode: 'hoodie',
    showVideoOnboarding: false,
    displayName: '留澳助手 AU',
    legalName: '留澳助手 AU',
    assistantName: '智能助手',
    supportEmail: 'ghar@knowwhatson.com',
    supportMailto: 'mailto:ghar@knowwhatson.com',
    marketingUrl: 'https://china.knowwhatson.com',
    inviteBaseUrl: 'https://china.knowwhatson.com',
    shareBaseUrl: 'https://china.knowwhatson.com',
    referralShareImagePath: undefined,
    iosStoreUrl: 'https://apps.apple.com/au/search?term=%E7%95%99%E6%BE%B3%E5%8A%A9%E6%89%8B%20AU',
    androidStoreUrl: 'https://play.google.com/store/apps/details?id=com.setuchina.mobile',
    title: '留澳助手 AU — Chinese Student Life in Australia',
    description: 'Chinese-first student arrival, events, housing safety, suburb guidance, and practical Australia support for Chinese international students.',
    shortName: '留澳助手 AU',
    ogTitle: '留澳助手 AU: Chinese Student Life in Australia',
    resourcesLabel: 'Resources',
    resourcesRoute: SETU_CHINA_RESOURCES_DEFAULT_ROUTE,
    healthCheckTitle: '留澳助手 AU 租房安全检查',
    onboardingWordmark: '留澳助手 AU',
    onboardingDescriptor: '中国留学生澳洲生活助手',
    onboardingMarker: setuChinaBlip,
    onboardingMarkerAlt: '留澳助手 AU marker',
    loadingLabel: 'Loading 留澳助手 AU',
    webIcon: setuChinaAppIcon,
    socialImageUrl: setuChinaAppIcon,
    urlScheme: 'com.setuchina.mobile',
    instagramStoriesAppId: setuInstagramStoriesAppId,
    showOfficialEventsFeature: true,
    showPublicPlansFeature: true,
    showSetuFeatures: true,
    showHciAlerts: false,
    showVibeHciAlerts: false,
    showPartnershipBadge: false,
    useSharedResourcesShell: true,
    showVibeGuides: true,
    defaultVibeTab: 'suburb-score',
    vibeGuidesLabel: '地区指南',
    newcomerModeDefault: 'student',
    splashHeroTitle: '留澳助手 AU',
    splashHeroSubtitle: '智能助手',
    splashMessages: [
      {
        body: '查看到达清单、租房安全、地区指南和留学生活支持。',
        cta: '开始使用',
        icon: 'shield',
      },
      {
        body: '发现中文友好的校园活动、求职讲座和社区支持。',
        cta: '查看活动',
        icon: 'search',
      },
      {
        body: '用中文或英文询问 TFN、OSHC、租房、交通和安全问题。',
        cta: '打开助手',
        icon: 'user',
      },
    ],
  },
  jom_settle: {
    variant: 'jom_settle',
    experienceMode: 'hoodie',
    showVideoOnboarding: false,
    displayName: 'Senang AU',
    legalName: 'Senang AU',
    assistantName: 'Sang Kancil',
    supportEmail: 'ghar@knowwhatson.com',
    supportMailto: 'mailto:ghar@knowwhatson.com',
    marketingUrl: 'https://malaysia.knowwhatson.com',
    inviteBaseUrl: 'https://malaysia.knowwhatson.com',
    shareBaseUrl: 'https://malaysia.knowwhatson.com',
    referralShareImagePath: undefined,
    iosStoreUrl: 'https://apps.apple.com/au/search?term=Senang%20AU',
    androidStoreUrl: 'https://play.google.com/store/apps/details?id=com.setumalaysia.mobile',
    title: 'Senang AU — Kehidupan Pelajar Malaysia di Australia',
    description: 'Senang AU membantu pelajar Malaysia di Australia menyusun arrival checklist, TFN, OSHC, kerja, makan, housing safety, suburbs, events, dan support harian.',
    shortName: 'Senang AU',
    ogTitle: 'Senang AU: Malaysian Student Life in Australia',
    resourcesLabel: 'Senarai',
    resourcesRoute: SETU_CHINA_RESOURCES_DEFAULT_ROUTE,
    healthCheckTitle: 'Senang AU Housing Check',
    onboardingWordmark: 'Senang AU',
    onboardingDescriptor: 'Kehidupan pelajar Malaysia di Australia, senang disusun.',
    onboardingMarker: setuMalaysiaAppIcon,
    onboardingMarkerAlt: 'Senang AU marker',
    loadingLabel: 'Loading Senang AU',
    webIcon: setuMalaysiaAppIcon,
    socialImageUrl: setuMalaysiaSocial,
    urlScheme: 'com.setumalaysia.mobile',
    instagramStoriesAppId: hoodieInstagramStoriesAppId,
    splashArt: {
      backgroundImage: setuMalaysiaSplashBackground,
      wordmark: setuMalaysiaWordmark,
    },
    showOfficialEventsFeature: true,
    showPublicPlansFeature: true,
    showSetuFeatures: true,
    showHciAlerts: false,
    showVibeHciAlerts: false,
    showPartnershipBadge: false,
    useSharedResourcesShell: true,
    showVibeGuides: true,
    defaultVibeTab: 'my-hood',
    vibeGuidesLabel: 'Panduan',
    newcomerModeDefault: 'student',
    splashHeroTitle: 'Senang AU',
    splashHeroSubtitle: 'Tanya Sang Kancil',
    splashMessages: [
      {
        body: 'Susun minggu pertama: SIM, bank, TFN, OSHC, transport, dan apa yang perlu simpan sebelum sign apa-apa.',
        cta: 'Buka Senarai',
        icon: 'shield',
      },
      {
        body: 'Cari geng, jumpa makan plans, dan faham vibe student life di city anda.',
        cta: 'Cari Geng',
        icon: 'search',
      },
      {
        body: 'Tanya Sang Kancil tentang arrival, housing, safety, suburbs, kerja, dan settling in Australia.',
        cta: 'Tanya Sang Kancil',
        icon: 'user',
      },
    ],
  },
  wheres_wolli: {
    variant: 'wheres_wolli',
    experienceMode: 'hoodie',
    showVideoOnboarding: false,
    displayName: "Where's Wolli",
    legalName: "Where's Wolli",
    assistantName: 'Wolli',
    supportEmail: 'ghar@knowwhatson.com',
    supportMailto: 'mailto:ghar@knowwhatson.com',
    marketingUrl: 'https://wolli.knowwhatson.com',
    inviteBaseUrl: 'https://wolli.knowwhatson.com',
    shareBaseUrl: 'https://wolli.knowwhatson.com',
    referralShareImagePath: undefined,
    iosStoreUrl: 'https://apps.apple.com/au/search?term=Where%27s%20Wolli',
    androidStoreUrl: 'https://play.google.com/store/apps/details?id=com.whereswolli.mobile',
    title: "Where's Wolli - Bayside Council Local Guide",
    description: "Where's Wolli helps Bayside Council locals, newcomers, and residents find council news, events, services, and official local links.",
    shortName: "Where's Wolli",
    ogTitle: "Where's Wolli: Bayside Council Local Guide",
    resourcesLabel: 'Services',
    resourcesRoute: '/setu',
    healthCheckTitle: "Where's Wolli Local Check",
    onboardingWordmark: "Where's Wolli",
    onboardingDescriptor: 'Bayside local guide',
    onboardingMarker: wolliAppIcon,
    onboardingMarkerAlt: 'Where\'s Wolli marker',
    loadingLabel: "Loading Where's Wolli",
    webIcon: wolliAppIcon,
    socialImageUrl: wolliAppIcon,
    urlScheme: 'com.whereswolli.mobile',
    instagramStoriesAppId: hoodieInstagramStoriesAppId,
    defaultCouncilSlug: 'bayside-council',
    localSourceUrls: {
      councilHome: 'https://www.bayside.nsw.gov.au/',
      news: 'https://www.bayside.nsw.gov.au/your-council/latest-news',
      events: 'https://www.bayside.nsw.gov.au/whats-on',
      waste: 'https://www.bayside.nsw.gov.au/services/waste-recycling',
      reportIssue: 'https://www.bayside.nsw.gov.au/report-it',
      contact: 'https://www.bayside.nsw.gov.au/your-council/contact-us',
    },
    assistantProfile: {
      audience: 'Bayside Council locals, newcomers, and residents staying in the area',
      persona: 'A grey-headed flying fox local companion called Wolli',
      supportContext: 'Answer inside the relevant app section first, then direct people to official Bayside Council pages. Do not present as an official council representative.',
    },
    launchArt: {
      homeHero: wolliHomeHero,
      eventsHero: wolliEventsHero,
      headerBg: wolliHeaderBg,
      mascot: wolliFlyingMascot,
      loadingBlip: wolliLoadingBlip,
      wordmark: wolliWordmark,
    },
    showOfficialEventsFeature: true,
    showPublicPlansFeature: true,
    showSetuFeatures: true,
    showHciAlerts: false,
    showVibeHciAlerts: false,
    showPartnershipBadge: false,
    useSharedResourcesShell: true,
    showVibeGuides: false,
    defaultVibeTab: 'my-hood',
    vibeGuidesLabel: 'Local',
    newcomerModeDefault: 'newcomer',
    splashHeroTitle: "Where's Wolli",
    splashHeroSubtitle: 'Ask Wolli',
    splashMessages: [
      {
        body: 'Find Bayside Council news, alerts, services, and official links without hunting through tabs.',
        cta: 'Check Local Updates',
        icon: 'shield',
      },
      {
        body: 'See what is on nearby and jump straight to official Bayside Council event details.',
        cta: 'See What\'s On',
        icon: 'search',
      },
      {
        body: 'Ask Wolli about waste, parking, pets, rates, permits, parks, libraries, and local tasks.',
        cta: 'Ask Wolli',
        icon: 'user',
      },
    ],
  },
};

export const APP_CONFIGS = appConfigs;

export function getAppConfig(variant: AppVariant) {
  return appConfigs[variant];
}

export const APP_CONFIG = appConfigs[APP_VARIANT];
