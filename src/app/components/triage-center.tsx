import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Browser } from '@capacitor/browser';
import { ArrowLeft, Bell, BookOpen, BriefcaseBusiness, Building2, CalendarDays, Camera, Calculator, CheckSquare, ChevronDown, ChevronRight, ClipboardList, Clock3, ExternalLink, FileText, FolderOpen, Fuel, Gamepad2, Home, Info, Landmark, Map, MapPin, Navigation, ReceiptText, Scale, Search, Send, Shield, ShieldAlert, ShoppingBasket, Sparkles, Toilet, Train, Upload, User, Users, Volume2, VolumeX, WalletCards, Wrench, Zap } from 'lucide-react';
import { sendTriageMessage, speakBrowser, fetchRentalHistory, fetchProfile, fetchEvidence, fetchOfficialEvents, fetchPropertyPedigree, searchAddress, fetchMyHousehold, fetchNetworkingCards, fetchPublicToilets, fetchMyItinerary, type ItineraryEvent, type NetworkingCard, type NominatimResult, type OfficialEvent, type PublicToiletBounds, type PublicToiletLocation } from '../lib/api';
import type { VoiceHandle } from '../lib/api';
import { Link, useLocation, useNavigate } from 'react-router';
import { APP_CONFIG } from '../lib/app-config';
import { HoodieHelpTrigger } from './hoodie-help-tour';
import { HoodieShareActions } from './share/hoodie-share-actions';
import { TRIAGE_ACTIONS, parseTriageTriggers, type TriageActionType } from '../lib/triage-actions';
import { buildAddressCheckShareDescriptor } from '../lib/hoodie-share';
import type { RentalEntry } from '../lib/mock-data';
import {
  buildHouseholdExpenseReportData,
  formatHouseholdMoney,
  getHouseholdAttentionSummary,
  getHouseholdBillParticipantDisplayName,
  getHouseholdEmailHandle,
  normalizeHouseholdEmail,
  type HouseholdDashboardResponse,
  type HouseholdExpenseReportData,
} from '../lib/household';
import hoodieniMascotUrl from '../assets/hoodienie.svg';
import { useHoodienieLaunchContext } from '../lib/hoodienie-launch-context';
import { getLegalTabRoute, SETU_CHINA_RESOURCES_DEFAULT_ROUTE, SETU_INDIA_RESOURCES_DEFAULT_ROUTE } from '../lib/resources-routes';
import type { AssistantNavMenuId } from '../lib/assistant-nav';
import { buildIndianStudentWelfareReply } from '../lib/indian-student-welfare';
import { FREE_ELECTRICITY_GUIDE_ROUTE } from '../lib/free-electricity-guide';
import { buildFreeElectricityAssistantReply, looksLikeFreeElectricityQuestion } from '../lib/free-electricity-assistant';
import { getCurrentAppPosition } from '../lib/geolocation';
import { isNativeShell } from '../lib/platform';
import { buildMapDirectionsUrl, buildNearbyToiletsMapState, hasValidFocusedMapCoordinatePair, type FocusedTargetDirectionsApp, type MapDirectionsTarget } from '../lib/focused-map-targets';
import { setuChinaShortcutIcons } from '../lib/setu-china-icons';
import { setuIndiaShortcutIcons } from '../lib/setu-india-icons';
import { setuMalaysiaShortcutIcons } from '../lib/setu-malaysia-icons';
import {
  BAYSIDE_CONTACT_URL,
  BAYSIDE_EVENTS_URL,
  BAYSIDE_HOME_URL,
  BAYSIDE_NEWS_URL,
  BAYSIDE_REPORT_ISSUE_URL,
  wolliServices,
} from '../lib/wolli-content';
import { wolliShortcutIcons } from '../lib/wolli-icons';

/** Strip any residual markdown that slips through (bold, headers) */
function sanitizeMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')  // **bold** -> bold
    .replace(/\*(.*?)\*/g, '$1')      // *italic* -> italic
    .replace(/^#{1,6}\s+/gm, '')      // ## Header -> Header
    .replace(/`([^`]+)`/g, '$1');     // `code` -> code
}

type TriageInlineEventCard = {
  type: 'event';
  event: Pick<OfficialEvent, 'id' | 'source' | 'slug' | 'title' | 'venue_name' | 'suburb' | 'address' | 'source_url' | 'image_url' | 'hero_image_url' | 'dates_humanized' | 'upcoming_date' | 'upcoming_time'>;
};

type TriageInlineAddressCard = {
  type: 'address';
  query: string;
  matchedAddress: string;
  suburb?: string;
  state?: string;
  lat?: number;
  lng?: number;
  totalFlags: number;
  summary: string;
};

type TriageInlineExpenseCard = {
  type: 'expense-summary';
  monthLabel: string;
  householdName: string;
  personalTotal: string;
  householdTotal: string;
  personalBillCount: number;
  householdBillCount: number;
  youOwe: string;
  youreOwed: string;
  topPersonalCategory?: {
    label: string;
    amount: string;
  };
  topHouseholdCategory?: {
    label: string;
    amount: string;
  };
  goalPercent?: number;
  recentTransactions: Array<{
    title: string;
    category: string;
    amount: string;
    dueLabel: string;
    scope: 'Self' | 'Household';
  }>;
};

type TriageInlineTimelineCard = {
  type: 'timeline-summary';
  currentHome?: string;
  currentSince?: string;
  currentState?: string;
  timelineCount: number;
  evidenceCount: number;
  recentHomes: Array<{
    label: string;
    period: string;
    isCurrent: boolean;
  }>;
};

type TriageInlinePublicToiletCard = {
  type: 'public-toilet';
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  openingHours?: string;
  distanceM: number;
  walkMin: number;
  flags: string[];
};

type TriageInlineCard =
  | TriageInlineEventCard
  | TriageInlineAddressCard
  | TriageInlineExpenseCard
  | TriageInlineTimelineCard
  | TriageInlinePublicToiletCard;

type TriageSourcePill = {
  label: string;
  url?: string;
  trigger?: TriageActionType;
};

interface TriageMessage {
  role: 'user' | 'assistant';
  text: string;
  triggers?: TriageActionType[];
  sources?: TriageSourcePill[];
  confidence?: number;
  cards?: TriageInlineCard[];
}

interface TriageCenterProps {
  onBack?: () => void;
  initialCategory?: string;
  surface?: 'default' | 'legal' | 'arrival';
  focusLandingToken?: number;
}

type ArrivalAssistantContext = {
  official_events?: Array<{
    title: string;
    humanized_date: string;
    venue_name: string;
    address: string;
    source_url: string;
  }>;
  address_lookup?: {
    query: string;
    matched_address: string;
    lat: number;
    lng: number;
    summary: string;
  };
};

type AcademicProfileContext = {
  university?: string;
  course_name?: string;
  graduation_year?: number | string | null;
  visa_status?: string;
};

type TriageItineraryContextSpot = {
  number: number;
  event_key: string;
  kind: 'event' | 'custom_stop';
  title: string;
  time: string;
  venue_name: string;
  suburb: string;
  address: string;
  summary: string;
  maps_url: string;
  source_url: string;
  lat: number | null;
  lng: number | null;
};

type TriageItineraryContextDay = {
  day: string;
  label: string;
  spot_count: number;
  route_summary: string;
  spots: TriageItineraryContextSpot[];
};

type TriageItineraryContext = {
  active: boolean;
  signed_in: boolean;
  data_scope: string;
  today: string;
  total_spots: number;
  present: TriageItineraryContextDay[];
  past: TriageItineraryContextDay[];
  error?: string;
};

const triggerIconMap = {
  address: MapPin,
  evidence: Camera,
  legal: Scale,
  scam: ShieldAlert,
  maintenance: Wrench,
  health: Shield,
  map: Map,
  toilet: Toilet,
  vibe: Sparkles,
  events: CalendarDays,
  networking: WalletCards,
  plans: CalendarDays,
  profile: User,
  household: Users,
  timeline: Home,
  'evidence-library': FolderOpen,
  arrival: MapPin,
  alerts: Bell,
  fuel: Fuel,
  groceries: ShoppingBasket,
  games: Gamepad2,
  'free-power': Zap,
  'application-kit': FileText,
  'scam-checker': ShieldAlert,
  'sponsor-companies': BriefcaseBusiness,
  'pr-points': Calculator,
  'visa-occupations': ClipboardList,
  expenses: ReceiptText,
} as const;

const OFFICIAL_EVENTS_TIMEZONE = 'Australia/Sydney';
const ARRIVAL_DEFAULT_CENTER = { lat: -33.8688, lng: 151.2093 };
const ARRIVAL_LANDING_QUESTIONS = [
  { label: 'Where should I start today?' },
  { label: `What can ${APP_CONFIG.displayName} help me do?` },
  { label: "Show me what's nearby this weekend" },
  { label: 'Find a public toilet nearby' },
  { label: 'Check my current home or timeline' },
  { label: 'Help me manage bills, chores, or expenses' },
  { label: 'Where do I upload my lease or screenshots?' },
  { label: 'Is this rental listing or address risky?' },
] as const;
const SETU_CHINA_ARRIVAL_LANDING_QUESTIONS = [
  { label: '我怎么避免租房诈骗？' },
  { label: 'TFN 是什么，怎么申请？' },
  { label: 'OSHC 怎么使用？' },
  { label: '哪里可以找到会说中文的 GP？' },
  { label: '学生签证打工时间有什么规定？' },
  { label: '收到可疑短信或微信消息怎么办？' },
  { label: '租房 bond 押金要注意什么？' },
  { label: '帮我找近期活动' },
] as const;
const SETU_INDIA_ARRIVAL_LANDING_QUESTIONS = [
  { label: 'What should I sort first after landing?' },
  { label: 'How do I avoid rental scams?' },
  { label: 'How do I apply for TFN?' },
  { label: 'How do I use OSHC and find a GP?' },
  { label: 'What should I check before paying bond?' },
  { label: 'What are student visa work rules?' },
  { label: 'Find Indian student events near me' },
  { label: 'Open mini games for a study break' },
  { label: 'Help me compare suburbs before renting' },
] as const;
const JOM_SETTLE_ARRIVAL_LANDING_QUESTIONS = [
  { label: 'Macam mana apply TFN?' },
  { label: 'Apa perlu settle minggu pertama?' },
  { label: 'Bantu check OSHC, GP, dan emergency contacts' },
  { label: 'Cari makan plans atau Malaysian student events' },
  { label: 'Rental listing ini sus ke?' },
  { label: 'Mana nak simpan lease screenshots?' },
  { label: 'Macam mana set up Opal, Myki, atau Go Card?' },
  { label: 'Bantu cari geng dekat campus' },
] as const;
const WOLLI_ARRIVAL_LANDING_QUESTIONS = [
  { label: 'What is happening in Bayside this week?' },
  { label: 'Any Bayside Council news or alerts?' },
  { label: 'Which council service do I need for bins?' },
  { label: 'How do I report a local issue?' },
  { label: 'Where do I check parking or permits?' },
  { label: 'How do I find pet registration info?' },
  { label: 'Show me Bayside parks, libraries, or facilities' },
  { label: 'Who do I contact in an emergency?' },
] as const;
const ARRIVAL_INPUT_PLACEHOLDER_TOPICS = [
  'fuel prices',
  'suburb crime ratings',
  'nearby transport',
  'public toilets',
  'grocery prices',
  'living costs',
  'rental scams',
  'weekend events',
  'lease screenshots',
] as const;
const SETU_CHINA_INPUT_PLACEHOLDER_TOPICS = [
  '租房安全',
  'TFN',
  'OSHC',
  'bond 押金',
  '学生签证打工时间',
  '中文 GP',
  '诈骗短信',
  '近期活动',
] as const;
const SETU_INDIA_INPUT_PLACEHOLDER_TOPICS = [
  'arrival checklist',
  'TFN',
  'OSHC',
  'bond checks',
  'student visa work rules',
  'Indian student events',
  'mini games',
  'rental scams',
  'safe suburbs',
] as const;
const JOM_SETTLE_INPUT_PLACEHOLDER_TOPICS = [
  'TFN',
  'OSHC',
  'makan plans',
  'rental scams',
  'Opal or Myki',
  'bank account',
  'campus systems',
  'cari geng',
] as const;
const WOLLI_INPUT_PLACEHOLDER_TOPICS = [
  'Bayside events',
  'latest council news',
  'bins and recycling',
  'parking permits',
  'pet registration',
  'report an issue',
  'parks and libraries',
  'public toilets',
] as const;
type ArrivalLandingIcon = typeof Map;

type ArrivalLandingSection = {
  id: AssistantNavMenuId;
  label: string;
  icon: ArrivalLandingIcon;
  image?: string;
  iconClassName: string;
  buttonClassName: string;
};

type ArrivalLandingMenuItem = {
  id: string;
  icon: ArrivalLandingIcon;
  image?: string;
  label: string;
  colorClassName: string;
  prompt: string;
  route?: string;
  trigger?: TriageActionType;
};

type ArrivalLandingMenuConfig = {
  id: AssistantNavMenuId;
  title: string;
  prompts: readonly { label: string }[];
  items: ArrivalLandingMenuItem[];
};

const ARRIVAL_LANDING_SECTIONS: ArrivalLandingSection[] = [
  {
    id: 'explore',
    label: 'Explore',
    icon: Search,
    iconClassName: 'text-[#CA8A04]',
    buttonClassName: 'border-[#FDE68A] bg-[#FFFBEB] text-[#92400E] hover:border-[#FACC15] hover:bg-[#FEF3C7]',
  },
  {
    id: 'vibe',
    label: 'Vibe',
    icon: Sparkles,
    iconClassName: 'text-[#7C3AED]',
    buttonClassName: 'border-[#DDD6FE] bg-[#F5F3FF] text-[#5B21B6] hover:border-[#C4B5FD] hover:bg-[#EDE9FE]',
  },
  {
    id: 'resources',
    label: 'Resources',
    icon: Landmark,
    iconClassName: 'text-[#1D4ED8]',
    buttonClassName: 'border-[#BFDBFE] bg-[#EFF6FF] text-[#1E40AF] hover:border-[#93C5FD] hover:bg-[#DBEAFE]',
  },
  {
    id: 'household',
    label: 'Household',
    icon: Building2,
    iconClassName: 'text-[#0F766E]',
    buttonClassName: 'border-[#99F6E4] bg-[#F0FDFA] text-[#115E59] hover:border-[#5EEAD4] hover:bg-[#CCFBF1]',
  },
];

const SETU_CHINA_ARRIVAL_LANDING_SECTIONS: ArrivalLandingSection[] = [
  {
    id: 'explore',
    label: '生活',
    icon: Search,
    image: setuChinaShortcutIcons.map,
    iconClassName: 'text-[#F04444]',
    buttonClassName: 'border-[#F5D1CB] bg-[#FFF7F5] text-[#B91C1C] hover:border-[#FCA5A5] hover:bg-[#FEE2E2]',
  },
  {
    id: 'vibe',
    label: '发现',
    icon: Sparkles,
    image: setuChinaShortcutIcons.vibe,
    iconClassName: 'text-[#E11D48]',
    buttonClassName: 'border-[#FFE4E6] bg-[#FFF1F2] text-[#BE123C] hover:border-[#FDA4AF] hover:bg-[#FFE4E6]',
  },
  {
    id: 'resources',
    label: '清单',
    icon: CheckSquare,
    image: setuChinaShortcutIcons.arrival,
    iconClassName: 'text-[#DC2626]',
    buttonClassName: 'border-[#FECACA] bg-[#FEF2F2] text-[#991B1B] hover:border-[#FCA5A5] hover:bg-[#FEE2E2]',
  },
  {
    id: 'household',
    label: '求助',
    icon: Shield,
    image: setuChinaShortcutIcons.alerts,
    iconClassName: 'text-[#0F766E]',
    buttonClassName: 'border-[#99F6E4] bg-[#F0FDFA] text-[#115E59] hover:border-[#5EEAD4] hover:bg-[#CCFBF1]',
  },
];

const SETU_INDIA_ARRIVAL_LANDING_SECTIONS: ArrivalLandingSection[] = [
  {
    id: 'explore',
    label: 'Life',
    icon: Search,
    image: setuIndiaShortcutIcons.map,
    iconClassName: 'text-[#F04444]',
    buttonClassName: 'border-[#F5D1CB] bg-[#FFF7F5] text-[#B91C1C] hover:border-[#FCA5A5] hover:bg-[#FEE2E2]',
  },
  {
    id: 'vibe',
    label: 'Vibe',
    icon: Sparkles,
    image: setuIndiaShortcutIcons.vibe,
    iconClassName: 'text-[#E11D48]',
    buttonClassName: 'border-[#FFE4E6] bg-[#FFF1F2] text-[#BE123C] hover:border-[#FDA4AF] hover:bg-[#FFE4E6]',
  },
  {
    id: 'resources',
    label: 'Checklist',
    icon: CheckSquare,
    image: setuIndiaShortcutIcons.arrival,
    iconClassName: 'text-[#DC2626]',
    buttonClassName: 'border-[#FECACA] bg-[#FEF2F2] text-[#991B1B] hover:border-[#FCA5A5] hover:bg-[#FEE2E2]',
  },
  {
    id: 'household',
    label: 'Help',
    icon: Shield,
    image: setuIndiaShortcutIcons.alerts,
    iconClassName: 'text-[#0F766E]',
    buttonClassName: 'border-[#99F6E4] bg-[#F0FDFA] text-[#115E59] hover:border-[#5EEAD4] hover:bg-[#CCFBF1]',
  },
];

const JOM_SETTLE_ARRIVAL_LANDING_SECTIONS: ArrivalLandingSection[] = [
  {
    id: 'explore',
    label: 'Makan',
    icon: ShoppingBasket,
    image: setuMalaysiaShortcutIcons.events,
    iconClassName: 'text-[#E53935]',
    buttonClassName: 'border-[#F5D1CB] bg-[#FFF7F5] text-[#B91C1C] hover:border-[#FCA5A5] hover:bg-[#FEE2E2]',
  },
  {
    id: 'vibe',
    label: 'Geng',
    icon: Users,
    image: setuMalaysiaShortcutIcons.vibe,
    iconClassName: 'text-[#E11D48]',
    buttonClassName: 'border-[#FFE4E6] bg-[#FFF1F2] text-[#BE123C] hover:border-[#FDA4AF] hover:bg-[#FFE4E6]',
  },
  {
    id: 'resources',
    label: 'Senarai',
    icon: CheckSquare,
    image: setuMalaysiaShortcutIcons.arrival,
    iconClassName: 'text-[#DC2626]',
    buttonClassName: 'border-[#FECACA] bg-[#FEF2F2] text-[#991B1B] hover:border-[#FCA5A5] hover:bg-[#FEE2E2]',
  },
  {
    id: 'household',
    label: 'Safe',
    icon: Shield,
    image: setuMalaysiaShortcutIcons.alerts,
    iconClassName: 'text-[#0F766E]',
    buttonClassName: 'border-[#99F6E4] bg-[#F0FDFA] text-[#115E59] hover:border-[#5EEAD4] hover:bg-[#CCFBF1]',
  },
];

const WOLLI_ARRIVAL_LANDING_SECTIONS: ArrivalLandingSection[] = [
  {
    id: 'explore',
    label: 'Explore',
    icon: Search,
    image: wolliShortcutIcons.info,
    iconClassName: 'text-[#008A8C]',
    buttonClassName: 'border-[#C9E8E4] bg-[#F3FAF7] text-[#006C72] hover:border-[#97D7CF] hover:bg-[#E8F7F4]',
  },
  {
    id: 'vibe',
    label: "What's On",
    icon: CalendarDays,
    image: wolliShortcutIcons.events,
    iconClassName: 'text-[#0D3B66]',
    buttonClassName: 'border-[#CDE3F5] bg-[#F3F9FE] text-[#0D3B66] hover:border-[#9CC9EC] hover:bg-[#E7F4FF]',
  },
  {
    id: 'resources',
    label: 'Resources',
    icon: ClipboardList,
    image: wolliShortcutIcons.resources,
    iconClassName: 'text-[#C7552B]',
    buttonClassName: 'border-[#F4D5C7] bg-[#FFF7F3] text-[#9B3E20] hover:border-[#E8AA8B] hover:bg-[#FFF0E8]',
  },
  {
    id: 'household',
    label: 'Help',
    icon: Shield,
    image: wolliShortcutIcons.alerts,
    iconClassName: 'text-[#6C7A3E]',
    buttonClassName: 'border-[#DDE8C6] bg-[#F8FBF0] text-[#56662D] hover:border-[#C5D99A] hover:bg-[#F0F7DE]',
  },
];

const ARRIVAL_LANDING_MENUS: ArrivalLandingMenuConfig[] = [
  {
    id: 'explore',
    title: 'Explore',
    prompts: [
      { label: 'Compare nearby fuel and grocery options' },
      { label: 'Find transport that fits my routine' },
      { label: 'What should I check around this suburb?' },
    ],
    items: [
      { id: 'explore.fuel', icon: Fuel, label: 'Fuel', colorClassName: 'text-[#CA8A04]', prompt: 'Help me compare nearby fuel prices and what details I should check before I drive.' },
      { id: 'explore.groceries', icon: ShoppingBasket, label: 'Groceries', colorClassName: 'text-[#15803D]', prompt: 'Help me compare nearby grocery options and where I might save on essentials.' },
      { id: 'explore.toilet', icon: Toilet, label: 'Toilet', colorClassName: 'text-[#0F766E]', prompt: 'Find a public toilet nearby using my current location.', trigger: 'FIND_NEARBY_TOILET' },
      { id: 'explore.transport', icon: Train, label: 'Transport', colorClassName: 'text-[#0F766E]', prompt: 'Help me understand nearby public transport options and what network or route I should check.' },
    ],
  },
  {
    id: 'vibe',
    title: 'Vibe',
    prompts: [
      { label: 'Show me local guides and weekend ideas' },
      { label: 'What does this suburb feel like?' },
      { label: 'Any events or alerts I should know?' },
    ],
    items: [
      { id: 'vibe.guides', icon: BookOpen, label: 'Guides', colorClassName: 'text-[#7C3AED]', prompt: 'Show me practical local guides for my suburb and what I should explore first.' },
      { id: 'vibe.stats', icon: Sparkles, label: 'Stats', colorClassName: 'text-[#1D4ED8]', prompt: 'Help me understand suburb stats and what they mean before I choose where to live.' },
      { id: 'vibe.events', icon: CalendarDays, label: 'Events', colorClassName: 'text-[#0F766E]', prompt: "Show me what's nearby this weekend and how to decide what is worth going to." },
      { id: 'vibe.plans', icon: ClipboardList, label: 'Plans', colorClassName: 'text-[#4338CA]', prompt: 'Help me find or make local plans I can join around my area.' },
      { id: 'vibe.alerts', icon: Bell, label: 'Alerts', colorClassName: 'text-[#DC2626]', prompt: 'What alerts or local updates should I watch near my current home?' },
    ],
  },
  {
    id: 'resources',
    title: 'Resources',
    prompts: [
      { label: 'Check scams, visas, PR points, and legal help' },
      { label: 'What visa occupations match my field?' },
      { label: 'Where should I verify this officially?' },
    ],
    items: [
      { id: 'resources.scam-checker', icon: ShieldAlert, label: 'Scam Checker', colorClassName: 'text-[#B91C1C]', prompt: 'Help me check a rental listing, screenshot, or message for scam warning signs.' },
      { id: 'resources.free-power', icon: Zap, label: 'Free Power', colorClassName: 'text-[#CA8A04]', prompt: 'Open the 2026 free electricity guide.', route: FREE_ELECTRICITY_GUIDE_ROUTE },
      { id: 'resources.sponsor-companies', icon: BriefcaseBusiness, label: 'Sponsor Companies', colorClassName: 'text-[#0F766E]', prompt: 'Help me understand sponsor companies and what I should verify before applying.' },
      { id: 'resources.pr-calculator', icon: Calculator, label: 'PR Calculator', colorClassName: 'text-[#4338CA]', prompt: 'Help me understand PR points at a high level and what official calculator details I should check.' },
      { id: 'resources.visa-occupations', icon: ClipboardList, label: 'Visa Occupations', colorClassName: 'text-[#475569]', prompt: 'What skilled visa occupations could connect to my degree or field, and what should I verify on Home Affairs?' },
      { id: 'resources.legal', icon: Scale, label: 'Legal', colorClassName: 'text-[#1E40AF]', prompt: 'Help me understand which tenancy or legal resource I should read first.' },
    ],
  },
  {
    id: 'household',
    title: 'Household',
    prompts: [
      { label: 'Organise bills, chores, and rental records' },
      { label: 'What should my household set up first?' },
      { label: 'Help me keep my rental timeline tidy' },
    ],
    items: [
      { id: 'household.bills', icon: ReceiptText, label: 'Bills', colorClassName: 'text-[#1D4ED8]', prompt: 'Help me set up or manage household bills with my housemates.' },
      { id: 'household.chores', icon: CheckSquare, label: 'Chores', colorClassName: 'text-[#0F766E]', prompt: 'Help me set up chores or a fair cleaning routine for my household.' },
      { id: 'household.timeline', icon: Map, label: 'Timeline', colorClassName: 'text-[#7C3AED]', prompt: 'Help me review my rental timeline and what evidence I should keep.' },
      { id: 'household.profile', icon: User, label: 'Profile', colorClassName: 'text-[#0F172A]', prompt: `Help me update my profile so ${APP_CONFIG.displayName} can personalize my housing and local support.` },
    ],
  },
];

const SETU_CHINA_ARRIVAL_LANDING_MENUS: ArrivalLandingMenuConfig[] = [
  {
    id: 'explore',
    title: '生活支持',
    prompts: [
      { label: '怎么避免租房诈骗？' },
      { label: '租房 bond 押金怎么保护？' },
      { label: '哪里可以找到会说中文的 GP？' },
    ],
    items: [
      { id: 'china.explore.scam', icon: ShieldAlert, image: setuChinaShortcutIcons.alerts, label: '租房防骗', colorClassName: 'text-[#DC2626]', prompt: '请用中文解释在澳洲怎么避免租房诈骗，包括看房、押金、bond 和合同注意事项。', trigger: 'OPEN_SCAM_CHECKER' },
      { id: 'china.explore.map', icon: Map, image: setuChinaShortcutIcons.map, label: '地图', colorClassName: 'text-[#F04444]', prompt: '请用中文说明在澳洲租房前，如何用地图查看周边交通、学校距离、生活设施和安全提醒。', route: '/dashboard?view=map' },
      { id: 'china.explore.health', icon: Shield, image: setuChinaShortcutIcons.health, label: 'GP / OSHC', colorClassName: 'text-[#0F766E]', prompt: 'OSHC 怎么使用？哪里可以找会说中文的 GP？' },
      { id: 'china.explore.toilet', icon: Toilet, image: setuChinaShortcutIcons.toilet, label: '厕所', colorClassName: 'text-[#0F766E]', prompt: '请用中文说明在澳洲如何查找附近公共厕所，以及什么时候需要开启定位。', trigger: 'FIND_NEARBY_TOILET' },
    ],
  },
  {
    id: 'vibe',
    title: '发现',
    prompts: [
      { label: '本周有什么适合留学生的活动？' },
      { label: '帮我找社交或 networking 活动' },
      { label: '租房前怎么了解地区情况？' },
    ],
    items: [
      { id: 'china.vibe.events', icon: CalendarDays, image: setuChinaShortcutIcons.events, label: '活动', colorClassName: 'text-[#F04444]', prompt: '帮我找近期适合中国留学生的活动。', trigger: 'OPEN_EVENTS' },
      { id: 'china.vibe.network', icon: WalletCards, image: setuChinaShortcutIcons.vibe, label: '社交', colorClassName: 'text-[#7C3AED]', prompt: '帮我找近期 networking 或社交活动。', trigger: 'OPEN_NETWORKING_CARDS' },
      { id: 'china.vibe.plans', icon: CalendarDays, image: setuChinaShortcutIcons.events, label: '计划', colorClassName: 'text-[#EA580C]', prompt: '帮我查看可以加入的公开计划。', trigger: 'OPEN_PLANS' },
      { id: 'china.vibe.suburbs', icon: MapPin, image: setuChinaShortcutIcons.suburbs, label: '地区', colorClassName: 'text-[#0F766E]', prompt: '租房前怎么了解一个地区是否适合学生生活？', route: '/vibe?section=vibe&vibe_tab=suburb-score' },
    ],
  },
  {
    id: 'resources',
    title: '到达清单',
    prompts: [
      { label: '抵澳后 48 小时要做什么？' },
      { label: 'TFN 是什么，怎么申请？' },
      { label: '学生签证打工时间有什么规定？' },
    ],
    items: [
      { id: 'china.resources.checklist', icon: CheckSquare, image: setuChinaShortcutIcons.arrival, label: '清单', colorClassName: 'text-[#DC2626]', prompt: '请用中文说明中国留学生抵澳后应该先做哪些事，以及到达清单可以怎么使用。', route: SETU_CHINA_RESOURCES_DEFAULT_ROUTE },
      { id: 'china.resources.tfn', icon: FileText, image: setuChinaShortcutIcons.tfn, label: 'TFN', colorClassName: 'text-[#1D4ED8]', prompt: 'TFN 是什么？中国留学生在澳洲怎么申请？' },
      { id: 'china.resources.work', icon: BriefcaseBusiness, image: setuChinaShortcutIcons.jobs, label: '打工', colorClassName: 'text-[#0F766E]', prompt: '学生签证打工时间有什么规定？Fair Work 有哪些基本权益？' },
      { id: 'china.resources.alerts', icon: Bell, image: setuChinaShortcutIcons.alerts, label: '提醒', colorClassName: 'text-[#F04444]', prompt: '请用中文说明中国留学生在澳洲应该关注哪些官方提醒、安全更新和诈骗预警。', route: '/vibe?section=alerts' },
    ],
  },
  {
    id: 'household',
    title: '求助渠道',
    prompts: [
      { label: '收到疑似诈骗短信怎么办？' },
      { label: '如何联系学校 international student support？' },
      { label: '遇到紧急情况应该联系谁？' },
    ],
    items: [
      { id: 'china.support.scamwatch', icon: ShieldAlert, image: setuChinaShortcutIcons.alerts, label: 'Scamwatch', colorClassName: 'text-[#DC2626]', prompt: '收到疑似诈骗短信或微信消息怎么办？什么时候应该联系 Scamwatch？', trigger: 'OPEN_SCAM_CHECKER' },
      { id: 'china.support.evidence', icon: FolderOpen, image: setuChinaShortcutIcons.resources, label: '证据', colorClassName: 'text-[#1D4ED8]', prompt: '我应该保存哪些租房、诈骗或纠纷证据？', trigger: 'OPEN_EVIDENCE' },
      { id: 'china.support.profile', icon: User, image: setuChinaShortcutIcons.profile, label: '我的', colorClassName: 'text-[#7C3AED]', prompt: '请用中文说明个人资料和偏好设置如何帮助我获得更相关的活动、清单和安全提醒。', route: '/profile' },
      { id: 'china.support.help', icon: Info, image: setuChinaShortcutIcons.info, label: '求助', colorClassName: 'text-[#0F766E]', prompt: '请列出中国留学生在澳洲遇到租房、诈骗、医疗或签证问题时可以联系的官方求助渠道。' },
    ],
  },
];

const SETU_INDIA_ARRIVAL_LANDING_MENUS: ArrivalLandingMenuConfig[] = [
  {
    id: 'explore',
    title: 'Life Support',
    prompts: [
      { label: 'How do I avoid rental scams?' },
      { label: 'What should I check before paying bond?' },
      { label: 'How do I use OSHC and find a GP?' },
    ],
    items: [
      { id: 'india.explore.scam', icon: ShieldAlert, image: setuIndiaShortcutIcons.alerts, label: 'Scams', colorClassName: 'text-[#DC2626]', prompt: 'Help me avoid rental scams in Australia. Cover inspections, deposits, bond, lease checks, and warning signs.', trigger: 'OPEN_SCAM_CHECKER' },
      { id: 'india.explore.map', icon: Map, image: setuIndiaShortcutIcons.map, label: 'Map', colorClassName: 'text-[#F04444]', prompt: 'Help me check transport, campus distance, groceries, safety notes, and useful places before choosing a suburb.', route: '/dashboard?view=map' },
      { id: 'india.explore.health', icon: Shield, image: setuIndiaShortcutIcons.health, label: 'OSHC / GP', colorClassName: 'text-[#0F766E]', prompt: 'Explain how Indian students can use OSHC, find a GP, and save emergency health contacts.' },
      { id: 'india.explore.toilet', icon: Toilet, image: setuIndiaShortcutIcons.toilet, label: 'Toilet', colorClassName: 'text-[#0F766E]', prompt: 'Find a public toilet nearby using my current location.', trigger: 'FIND_NEARBY_TOILET' },
    ],
  },
  {
    id: 'vibe',
    title: 'Vibe',
    prompts: [
      { label: 'Find Indian student events near me' },
      { label: 'Help me find networking or social events' },
      { label: 'How do I compare suburbs before renting?' },
    ],
    items: [
      { id: 'india.vibe.events', icon: CalendarDays, image: setuIndiaShortcutIcons.events, label: 'Find Events', colorClassName: 'text-[#F04444]', prompt: 'Show me student-friendly events and Indian community activities nearby.', trigger: 'OPEN_EVENTS' },
      { id: 'india.vibe.games', icon: Gamepad2, image: setuIndiaShortcutIcons.games, label: 'Games', colorClassName: 'text-[#F04444]', prompt: 'Open Play Games for mini games.', trigger: 'OPEN_GAMES' },
      { id: 'india.vibe.network', icon: WalletCards, image: setuIndiaShortcutIcons.vibe, label: 'Network', colorClassName: 'text-[#7C3AED]', prompt: 'Help me find networking, career, or social events worth joining.', trigger: 'OPEN_NETWORKING_CARDS' },
      { id: 'india.vibe.plans', icon: CalendarDays, image: setuIndiaShortcutIcons.events, label: 'Plans', colorClassName: 'text-[#EA580C]', prompt: 'Help me find plans I can join and share with friends.', trigger: 'OPEN_PLANS' },
      { id: 'india.vibe.suburbs', icon: MapPin, image: setuIndiaShortcutIcons.suburbs, label: 'Compare Suburbs', colorClassName: 'text-[#0F766E]', prompt: 'Help me compare suburbs for student housing, transport, rent, safety, and campus access.', route: '/vibe?section=vibe&vibe_tab=suburb-score' },
    ],
  },
  {
    id: 'resources',
    title: 'Tasks',
    prompts: [
      { label: 'What should I sort in the first 48 hours?' },
      { label: 'How do I apply for TFN?' },
      { label: 'What are student visa work rules?' },
    ],
    items: [
      { id: 'india.resources.checklist', icon: CheckSquare, image: setuIndiaShortcutIcons.arrival, label: 'Settle Checklist', colorClassName: 'text-[#DC2626]', prompt: 'Give me a first-week arrival checklist for Indian students arriving in Australia.', route: SETU_INDIA_RESOURCES_DEFAULT_ROUTE },
      { id: 'india.resources.tfn', icon: FileText, image: setuIndiaShortcutIcons.tfn, label: 'TFN', colorClassName: 'text-[#1D4ED8]', prompt: 'Explain how Indian students can apply for a TFN after arriving in Australia and what to keep safe.' },
      { id: 'india.resources.work', icon: BriefcaseBusiness, image: setuIndiaShortcutIcons.jobs, label: 'Work Basics', colorClassName: 'text-[#0F766E]', prompt: 'Explain student visa work limits, Fair Work basics, payslips, and warning signs in job offers.' },
      { id: 'india.resources.alerts', icon: Bell, image: setuIndiaShortcutIcons.alerts, label: 'Safety Alerts', colorClassName: 'text-[#F04444]', prompt: 'What official safety, scam, tenancy, and student alerts should Indian students in Australia watch?', route: '/vibe?section=alerts' },
    ],
  },
  {
    id: 'household',
    title: 'Support',
    prompts: [
      { label: 'What should I do if a message looks like a scam?' },
      { label: 'What evidence should I save?' },
      { label: 'Who do I contact in an emergency?' },
    ],
    items: [
      { id: 'india.support.scamwatch', icon: ShieldAlert, image: setuIndiaShortcutIcons.alerts, label: 'Scamwatch', colorClassName: 'text-[#DC2626]', prompt: 'What should I do if I receive a suspicious rental, job, visa, or bank message?', trigger: 'OPEN_SCAM_CHECKER' },
      { id: 'india.support.evidence', icon: FolderOpen, image: setuIndiaShortcutIcons.resources, label: 'Evidence', colorClassName: 'text-[#1D4ED8]', prompt: 'What rental, bond, scam, receipt, and lease evidence should I save?', trigger: 'OPEN_EVIDENCE' },
      { id: 'india.support.profile', icon: User, image: setuIndiaShortcutIcons.profile, label: 'Me', colorClassName: 'text-[#7C3AED]', prompt: 'Help me update my profile so SETU India AU gives better arrival, suburb, event, and safety support.', route: '/profile' },
      { id: 'india.support.help', icon: Info, image: setuIndiaShortcutIcons.info, label: 'Help', colorClassName: 'text-[#0F766E]', prompt: 'List official Australian support channels for tenancy, scams, health, work rights, university support, and emergencies.' },
    ],
  },
];

const JOM_SETTLE_ARRIVAL_LANDING_MENUS: ArrivalLandingMenuConfig[] = [
  {
    id: 'explore',
    title: 'Makan & Move',
    prompts: [
      { label: 'Cari makan plans minggu ini' },
      { label: 'Macam mana nak sort transport?' },
      { label: 'Apa perlu check dekat suburb?' },
    ],
    items: [
      { id: 'jom.explore.makan', icon: ShoppingBasket, image: setuMalaysiaShortcutIcons.events, label: 'Makan', colorClassName: 'text-[#E53935]', prompt: 'Tolong cari makan plans, halal options, dan student-friendly events dekat saya.', trigger: 'OPEN_EVENTS' },
      { id: 'jom.explore.transport', icon: Train, image: setuMalaysiaShortcutIcons.arrival, label: 'Transport', colorClassName: 'text-[#03B8C6]', prompt: 'Terangkan transport card atau app yang saya perlukan ikut city, dan student concession yang patut saya verify.', trigger: 'OPEN_RESOURCES' },
      { id: 'jom.explore.map', icon: Map, image: setuMalaysiaShortcutIcons.map, label: 'Map', colorClassName: 'text-[#0D1B2A]', prompt: 'Tolong check transport, groceries, safety notes, dan campus distance sekitar area ini.', route: '/dashboard?view=map' },
      { id: 'jom.explore.toilet', icon: Toilet, image: setuMalaysiaShortcutIcons.toilet, label: 'Toilet', colorClassName: 'text-[#27C18C]', prompt: 'Cari public toilet berdekatan guna current location saya.', trigger: 'FIND_NEARBY_TOILET' },
    ],
  },
  {
    id: 'vibe',
    title: 'Geng & Campus Life',
    prompts: [
      { label: 'Cari geng atau events Malaysia' },
      { label: 'Suburb mana student-friendly?' },
      { label: 'Bantu buat plan dengan kawan' },
    ],
    items: [
      { id: 'jom.vibe.events', icon: CalendarDays, image: setuMalaysiaShortcutIcons.events, label: 'Events', colorClassName: 'text-[#E53935]', prompt: 'Show me student-friendly events, makan nights, dan community plans yang berbaloi join.', trigger: 'OPEN_EVENTS' },
      { id: 'jom.vibe.network', icon: WalletCards, image: setuMalaysiaShortcutIcons.jobs, label: 'Network', colorClassName: 'text-[#03B8C6]', prompt: 'Bantu saya organise networking contacts dan cari orang yang saya jumpa di campus atau community events.', trigger: 'OPEN_NETWORKING_CARDS' },
      { id: 'jom.vibe.suburbs', icon: MapPin, image: setuMalaysiaShortcutIcons.suburbs, label: 'Suburbs', colorClassName: 'text-[#27C18C]', prompt: 'Bantu compare suburbs untuk Malaysian student life, transport, food, safety, dan rent.', route: '/vibe?section=vibe&vibe_tab=suburb-score' },
      { id: 'jom.vibe.plans', icon: ClipboardList, image: setuMalaysiaShortcutIcons.vibe, label: 'Plans', colorClassName: 'text-[#FFC107]', prompt: 'Bantu saya cari atau buat plan yang boleh share dengan kawan.', trigger: 'OPEN_PLANS' },
    ],
  },
  {
    id: 'resources',
    title: 'Senarai Settle',
    prompts: [
      { label: 'Apa nak sort minggu pertama?' },
      { label: 'Macam mana apply TFN?' },
      { label: 'Apa perlu tahu pasal OSHC?' },
    ],
    items: [
      { id: 'jom.resources.checklist', icon: CheckSquare, image: setuMalaysiaShortcutIcons.arrival, label: 'Senarai', colorClassName: 'text-[#27C18C]', prompt: 'Beri saya first-week arrival checklist untuk pelajar Malaysia yang baru tiba di Australia.', route: SETU_CHINA_RESOURCES_DEFAULT_ROUTE },
      { id: 'jom.resources.tfn', icon: FileText, image: setuMalaysiaShortcutIcons.tfn, label: 'TFN', colorClassName: 'text-[#1D4ED8]', prompt: 'TFN itu apa, macam mana pelajar Malaysia apply selepas tiba di Australia, dan apa yang perlu disimpan selamat?', trigger: 'OPEN_RESOURCES' },
      { id: 'jom.resources.oshc', icon: Shield, image: setuMalaysiaShortcutIcons.health, label: 'OSHC / GP', colorClassName: 'text-[#0F766E]', prompt: 'Terangkan cara guna OSHC, cari GP, dan simpan emergency health contacts.', trigger: 'OPEN_RESOURCES' },
      { id: 'jom.resources.scam', icon: ShieldAlert, image: setuMalaysiaShortcutIcons.alerts, label: 'Scam Check', colorClassName: 'text-[#E53935]', prompt: 'Bantu saya check rental listing, job offer, atau message untuk scam warning signs.', trigger: 'OPEN_SCAM_CHECKER' },
    ],
  },
  {
    id: 'household',
    title: 'Safe Settle',
    prompts: [
      { label: 'Rental listing ini sus ke?' },
      { label: 'Evidence apa perlu simpan?' },
      { label: 'Siapa perlu contact masa emergency?' },
    ],
    items: [
      { id: 'jom.safe.alerts', icon: Bell, image: setuMalaysiaShortcutIcons.alerts, label: 'Alerts', colorClassName: 'text-[#E53935]', prompt: 'Rental, kerja, atau student safety alerts apa yang patut saya tengok sekarang?', route: '/vibe?section=alerts' },
      { id: 'jom.safe.evidence', icon: FolderOpen, image: setuMalaysiaShortcutIcons.resources, label: 'Evidence', colorClassName: 'text-[#1D4ED8]', prompt: 'Beritahu lease, bond, inspection, receipt, dan screenshot evidence yang perlu saya simpan.', trigger: 'OPEN_EVIDENCE' },
      { id: 'jom.safe.profile', icon: User, image: setuMalaysiaShortcutIcons.profile, label: 'Profil', colorClassName: 'text-[#0D1B2A]', prompt: 'Bantu saya update profile supaya Senang AU boleh beri arrival, event, dan suburb support yang lebih sesuai.', route: '/profile' },
      { id: 'jom.safe.help', icon: Info, image: setuMalaysiaShortcutIcons.info, label: 'Help', colorClassName: 'text-[#27C18C]', prompt: 'Senaraikan official Australian support channels untuk tenancy, scams, health, work rights, dan student support.' },
    ],
  },
];

const WOLLI_ARRIVAL_LANDING_MENUS: ArrivalLandingMenuConfig[] = [
  {
    id: 'explore',
    title: 'Explore Bayside',
    prompts: [
      { label: 'What should I know if I am new to Bayside?' },
      { label: 'Find local places and services near me' },
      { label: 'Where should I check official council info?' },
    ],
    items: [
      { id: 'wolli.local.map', icon: Map, image: wolliShortcutIcons.maps, label: 'Map', colorClassName: 'text-[#008A8C]', prompt: 'Open the Bayside map and help me find nearby places, transport, toilets, and useful local spots.', route: '/dashboard?view=map' },
      { id: 'wolli.local.suburbs', icon: MapPin, image: wolliShortcutIcons.suburbs, label: 'Guides', colorClassName: 'text-[#0D3B66]', prompt: 'Help me understand Sydney and Bayside local guides, and what official council pages I should check.', route: '/vibe?section=guides&city=sydney' },
      { id: 'wolli.local.toilets', icon: Toilet, image: wolliShortcutIcons.toilet, label: 'Toilets', colorClassName: 'text-[#008A8C]', prompt: 'Find a public toilet nearby using my current location.', trigger: 'FIND_NEARBY_TOILET' },
      { id: 'wolli.local.arrival', icon: MapPin, image: wolliShortcutIcons.arrival, label: 'New Here', colorClassName: 'text-[#C7552B]', prompt: 'Give me a Bayside newcomer checklist and link me to official council pages for each task.', trigger: 'OPEN_RESOURCES' },
    ],
  },
  {
    id: 'vibe',
    title: "What's On",
    prompts: [
      { label: 'What is happening in Bayside this week?' },
      { label: 'Any free or family-friendly events nearby?' },
      { label: 'Show me the official Bayside events page' },
    ],
    items: [
      { id: 'wolli.vibe.events', icon: CalendarDays, image: wolliShortcutIcons.events, label: 'Events', colorClassName: 'text-[#008A8C]', prompt: 'Show me Bayside Council events and activities from the official What\'s On source.', trigger: 'OPEN_EVENTS' },
      { id: 'wolli.vibe.alerts', icon: Bell, image: wolliShortcutIcons.alerts, label: 'News', colorClassName: 'text-[#C7552B]', prompt: 'Show me Bayside Council latest news and alerts from the official source.', trigger: 'OPEN_ALERTS' },
      { id: 'wolli.vibe.vibe', icon: Sparkles, image: wolliShortcutIcons.vibe, label: 'Guides', colorClassName: 'text-[#0D3B66]', prompt: 'What Sydney local guides and Bayside council pages should I check first?', route: '/vibe?section=guides&city=sydney' },
      { id: 'wolli.vibe.calendar', icon: CalendarDays, image: wolliShortcutIcons.checklist, label: 'Plan', colorClassName: 'text-[#6C7A3E]', prompt: 'Help me plan a Bayside day out and point me to official event details.', trigger: 'OPEN_EVENTS' },
    ],
  },
  {
    id: 'resources',
    title: 'Resources',
    prompts: [
      { label: 'Which page handles bins and recycling?' },
      { label: 'Where do I check parking, pets, or rates?' },
      { label: 'How do I report a council issue?' },
    ],
    items: [
      { id: 'wolli.services.waste', icon: CheckSquare, image: wolliShortcutIcons.checklist, label: 'Bins', colorClassName: 'text-[#008A8C]', prompt: 'Point me to Bayside Council waste and recycling information and explain what I should check.', trigger: 'OPEN_RESOURCES' },
      { id: 'wolli.services.report', icon: ShieldAlert, image: wolliShortcutIcons.alerts, label: 'Report', colorClassName: 'text-[#C7552B]', prompt: 'Help me report a local Bayside issue and point me to the official Report It page.', trigger: 'OPEN_RESOURCES' },
      { id: 'wolli.services.info', icon: Info, image: wolliShortcutIcons.info, label: 'Info', colorClassName: 'text-[#0D3B66]', prompt: 'Which Bayside Council service page should I use for rates, parking, pets, permits, libraries, parks, or facilities?', trigger: 'OPEN_RESOURCES' },
      { id: 'wolli.services.jobs', icon: BriefcaseBusiness, image: wolliShortcutIcons.jobs, label: 'Jobs', colorClassName: 'text-[#6C7A3E]', prompt: 'Where can I find Bayside Council jobs and careers information?', trigger: 'VIEW_RESOURCES' },
    ],
  },
  {
    id: 'household',
    title: 'Help',
    prompts: [
      { label: 'Who do I contact for urgent danger?' },
      { label: 'What should I do for non-emergency council issues?' },
      { label: 'Show official contact pages' },
    ],
    items: [
      { id: 'wolli.help.emergency', icon: ShieldAlert, image: wolliShortcutIcons.health, label: 'Emergency', colorClassName: 'text-[#B91C1C]', prompt: 'Who should I contact for emergencies in Bayside, and what should be handled by council later?' },
      { id: 'wolli.help.contact', icon: Info, image: wolliShortcutIcons.info, label: 'Contact', colorClassName: 'text-[#008A8C]', prompt: 'Point me to Bayside Council contact information and explain when to use it.', trigger: 'OPEN_RESOURCES' },
      { id: 'wolli.help.profile', icon: User, image: wolliShortcutIcons.profile, label: 'Me', colorClassName: 'text-[#0D3B66]', prompt: 'Help me update my Where\'s Wolli profile for local Bayside support.', route: '/profile' },
      { id: 'wolli.help.chat', icon: Info, image: wolliShortcutIcons.chat, label: 'Ask', colorClassName: 'text-[#C7552B]', prompt: 'Help me choose the right Where\'s Wolli section and official Bayside Council page for my question.' },
    ],
  },
];

function getArrivalLandingMenuPosition(index: number, total: number) {
  const radius = total >= 5 ? 90 : total === 4 ? 84 : 78;
  const angle = (-90 + index * (360 / Math.max(total, 1))) * (Math.PI / 180);
  return {
    x: Math.round(Math.cos(angle) * radius),
    y: Math.round(Math.sin(angle) * radius),
  };
}

const ASSISTANT_PUBLIC_TOILET_NEARBY_LIMIT = 1000;
const ASSISTANT_PUBLIC_TOILET_CARD_LIMIT = 3;

type AssistantDirectionsOption = {
  id: Exclude<FocusedTargetDirectionsApp, 'android-system'>;
  label: string;
  subtitle: string;
};

const ASSISTANT_DIRECTIONS_OPTIONS: AssistantDirectionsOption[] = [
  {
    id: 'apple',
    label: 'Apple Maps',
    subtitle: 'Open turn-by-turn directions in Apple Maps',
  },
  {
    id: 'google',
    label: 'Google Maps',
    subtitle: 'Open directions in Google Maps',
  },
  {
    id: 'waze',
    label: 'Waze',
    subtitle: 'Open community-powered directions in Waze',
  },
];

function clampNumber(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function buildAssistantPublicToiletNearbyBounds(lat: number, lng: number, radiusKm = 6): PublicToiletBounds {
  const latitude = clampNumber(lat, -89.9, 89.9);
  const latDelta = radiusKm / 110.574;
  const lngDelta = radiusKm / (111.32 * Math.max(Math.cos(latitude * Math.PI / 180), 0.12));
  return {
    west: clampNumber(lng - lngDelta, -180, 180),
    south: clampNumber(latitude - latDelta, -90, 90),
    east: clampNumber(lng + lngDelta, -180, 180),
    north: clampNumber(latitude + latDelta, -90, 90),
  };
}

function measureDistanceMeters(fromLat: number, fromLng: number, toLat: number, toLng: number) {
  const earthRadiusMeters = 6371e3;
  const toRadians = (value: number) => value * Math.PI / 180;
  const deltaLat = toRadians(toLat - fromLat);
  const deltaLng = toRadians(toLng - fromLng);
  const a = Math.sin(deltaLat / 2) ** 2
    + Math.cos(toRadians(fromLat)) * Math.cos(toRadians(toLat)) * Math.sin(deltaLng / 2) ** 2;
  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatAssistantDistance(distanceM: number) {
  return distanceM < 1000
    ? `${Math.round(distanceM)} m`
    : `${(distanceM / 1000).toFixed(1)} km`;
}

function formatAssistantToiletAddress(toilet: PublicToiletLocation) {
  return [toilet.address, toilet.town, toilet.state]
    .map((part) => String(part || '').trim())
    .filter(Boolean)
    .join(', ');
}

function buildAssistantToiletFlags(toilet: PublicToiletLocation) {
  return [
    toilet.accessible === true ? 'Accessible' : '',
    toilet.babyChange === true || toilet.babyCareRoom === true ? 'Baby change' : '',
    toilet.shower === true ? 'Shower' : '',
    toilet.drinkingWater === true ? 'Drinking water' : '',
    toilet.keyRequired === true || toilet.mlak24 === true || toilet.mlakAfterHours === true ? 'Key access' : '',
    toilet.paymentRequired === true ? 'Paid access' : '',
  ].filter(Boolean);
}

function buildAssistantToiletCards(userLat: number, userLng: number, toilets: PublicToiletLocation[]): TriageInlinePublicToiletCard[] {
  return toilets
    .filter((toilet) => hasValidFocusedMapCoordinatePair(toilet.lat, toilet.lng))
    .map((toilet) => {
      const directDistanceM = measureDistanceMeters(userLat, userLng, toilet.lat, toilet.lng);
      const distanceM = Math.round(directDistanceM * 1.3);
      return {
        type: 'public-toilet' as const,
        id: toilet.id,
        name: toilet.name || 'Public toilet',
        address: formatAssistantToiletAddress(toilet),
        lat: toilet.lat,
        lng: toilet.lng,
        openingHours: toilet.openingHours || undefined,
        distanceM,
        walkMin: Math.max(1, Math.round(distanceM / 80)),
        flags: buildAssistantToiletFlags(toilet),
      };
    })
    .sort((left, right) => left.distanceM - right.distanceM)
    .slice(0, ASSISTANT_PUBLIC_TOILET_CARD_LIMIT);
}

function getAssistantToiletLocationErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || '');
  if (/permission|denied/i.test(message)) {
    return 'I need location permission to find public toilets nearby. Allow location access and try again.';
  }
  if (/timeout/i.test(message)) {
    return 'I could not get your current location quickly enough. Check location services and try again.';
  }
  return 'I could not get your current location right now. Check location services and try again.';
}

function getAssistantToiletDataErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || '');
  if (/timeout|timed out/i.test(message)) {
    return 'I found your location, but public toilet data took too long to load. Try again in a moment.';
  }
  return 'I found your location, but could not load public toilet data right now. Try again in a moment.';
}

const HOODIENI_ROUTE_TRIGGER_PRIORITY: TriageActionType[] = [
  'OPEN_TIMELINE',
  'ADD_ADDRESS',
  'OPEN_NETWORKING_CARDS',
  'OPEN_FUEL',
  'FIND_NEARBY_TOILET',
  'OPEN_FREE_ELECTRICITY_GUIDE',
  'OPEN_GROCERIES',
  'OPEN_EVENTS',
  'OPEN_MY_ITINERARY',
  'OPEN_MY_PLANS',
  'OPEN_PLANS',
  'OPEN_APPLICATION_KIT',
  'OPEN_SCAM_CHECKER',
  'OPEN_SPONSOR_COMPANIES',
  'OPEN_PR_CALCULATOR',
  'OPEN_VISA_OCCUPATIONS',
  'OPEN_EVIDENCE',
  'UPLOAD_EVIDENCE',
  'OPEN_LEGAL',
  'OPEN_RESOURCES',
  'VIEW_RESOURCES',
  'OPEN_ALERTS',
  'OPEN_PROFILE',
  'OPEN_EXPENSE_TRACKER',
  'OPEN_HOUSEHOLD_BILLS',
  'OPEN_HOUSEHOLD_CHORES',
  'OPEN_HOUSEHOLD_MEMBERS',
  'OPEN_HOUSEHOLD_ACTIVITY',
  'OPEN_HOUSEHOLD',
  'OPEN_VIBE',
  'OPEN_MAP',
  'OPEN_ARRIVAL',
];

function formatSydneyDayKey(date: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: OFFICIAL_EVENTS_TIMEZONE,
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
}

function parseSydneyDayKey(dayKey: string) {
  const [year, month, day] = String(dayKey || '').split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

function getSydneyTodayDate() {
  return parseSydneyDayKey(formatSydneyDayKey(new Date())) || new Date();
}

function addCalendarDays(baseDate: Date, days: number) {
  const nextDate = new Date(baseDate);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function getWeekendEventRange() {
  const today = getSydneyTodayDate();
  const weekday = today.getDay();
  if (weekday === 6) {
    return { startDay: formatSydneyDayKey(today), endDay: formatSydneyDayKey(addCalendarDays(today, 1)) };
  }
  if (weekday === 0) {
    return { startDay: formatSydneyDayKey(today), endDay: formatSydneyDayKey(today) };
  }
  const saturday = addCalendarDays(today, 6 - weekday);
  return { startDay: formatSydneyDayKey(saturday), endDay: formatSydneyDayKey(addCalendarDays(saturday, 1)) };
}

function getWeekEventRange() {
  const today = getSydneyTodayDate();
  const weekday = today.getDay();
  const remainingDays = weekday === 0 ? 0 : 7 - weekday;
  return { startDay: formatSydneyDayKey(today), endDay: formatSydneyDayKey(addCalendarDays(today, remainingDays)) };
}

function getUpcomingEventRange() {
  const today = getSydneyTodayDate();
  return { startDay: formatSydneyDayKey(today), endDay: formatSydneyDayKey(addCalendarDays(today, 6)) };
}

function formatArrivalEventDate(event: Pick<OfficialEvent, 'dates_humanized' | 'upcoming_date' | 'upcoming_time'>) {
  if (event.upcoming_date) {
    const parsedDate = new Date(`${event.upcoming_date}T12:00:00`);
    if (!Number.isNaN(parsedDate.getTime())) {
      const formattedDate = new Intl.DateTimeFormat('en-AU', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      }).format(parsedDate);
      return [formattedDate, event.upcoming_time].filter(Boolean).join(' • ');
    }
  }
  return event.dates_humanized || 'Upcoming';
}

function formatArrivalEventLocation(event: Pick<OfficialEvent, 'venue_name' | 'suburb' | 'address'>) {
  return [event.venue_name || event.suburb || '', event.address || event.suburb || ''].filter(Boolean).join(' • ');
}

function normalizeAustralianStateLabel(value?: string) {
  const normalized = String(value || '').trim().toLowerCase();
  const map: Record<string, string> = {
    'new south wales': 'NSW',
    victoria: 'VIC',
    queensland: 'QLD',
    'south australia': 'SA',
    'western australia': 'WA',
    tasmania: 'TAS',
    'northern territory': 'NT',
    'australian capital territory': 'ACT',
  };
  return map[normalized] || String(value || '').trim();
}

function buildShortAddress(result: NominatimResult) {
  const address = result.address || {};
  const street = [address.house_number, address.road].filter(Boolean).join(' ');
  return [
    street,
    address.suburb || address.town || address.city || address.neighbourhood || '',
    normalizeAustralianStateLabel(address.state),
    address.postcode || '',
  ].filter(Boolean).join(', ') || result.display_name;
}

function looksLikeWeekendIntent(text: string) {
  return /\b(weekend|weeknend|this weekend)\b/i.test(text)
    || /周末|这个周末|本周末/.test(text);
}

function looksLikeWeekIntent(text: string) {
  return /\b(this week|nearby|upcoming|recent|soon)\b/i.test(text)
    || /本周|这周|这一周|近期|最近|即将|这几天/.test(text);
}

function looksLikeEventIntent(text: string) {
  return /\b(what'?s on|what is on|events?|things to do|happening|meetups?|workshops?|seminars?|networking night)\b/i.test(text)
    || /活动|社交|聚会|讲座|工作坊|宣讲|招聘会|电影夜|留学生.*活动|适合.*留学生/.test(text);
}

function looksLikeSetuIndiaGamesIntent(text: string) {
  return /\b(play|open|launch|start|show|find)\b/i.test(text)
    && /\b(games?|mini games?|paper\.?io|2048|word search|fruit stab|crazygames?|study break|break game)\b/i.test(text);
}

function looksLikeMyAddressIntent(text: string) {
  return /\b(my address|current address|this address|my place|my home)\b/i.test(text);
}

function looksLikeExpenseTrackerIntent(text: string) {
  return /\b(expense tracker|expenses?|spending|spend|spent|budget|monthly spend|monthly spending|transactions?|receipts?|shared bills?|personal bills?|household bills?|what do i owe|owe|owed|split|splits|utilities|rent)\b/i.test(text);
}

function looksLikeTimelineInsightIntent(text: string) {
  return /\b(timeline|address history|rental history|current home|current address|where do i live|where am i living|my homes?|previous homes?|lease history)\b/i.test(text);
}

function looksLikeItineraryIntent(text: string) {
  return /\b(itinerar(?:y|ies)|my itinerary|trip route|travel plan|route stops?|spots? in (?:my )?itinerary|attending events?|events i'?m attending|what am i attending|show my stops?)\b/i.test(text)
    || /行程|路线|站点/.test(text);
}

function looksLikeDrivingLicenceIntent(text: string) {
  return /\b(drive|driving|driver'?s?|drivers|licen[cs]e|learner'?s?|provisional|overseas licen[cs]e|international licen[cs]e|road rules?)\b/i.test(text);
}

function looksLikeTypedAddressIntent(text: string) {
  const hasStreetNumber = /\b\d+[a-z]?\s+(?:[a-z0-9'-]+\s+){0,5}(unit|suite|apartment|apt|street|st|road|rd|avenue|ave|drive|dr|lane|ln|place|pl|crescent|cct|circuit|way|parade|boulevard|blvd|terrace|court|ct|close)\b/i.test(text);
  if (hasStreetNumber) return true;
  if (looksLikeDrivingLicenceIntent(text)) return false;

  const hasStreetType = /\b(unit|suite|apartment|apt|street|st|road|rd|avenue|ave|lane|ln|place|pl|crescent|cct|circuit|way|parade|boulevard|blvd|terrace|court|ct|close)\b/i.test(text);
  const hasAddressContext = /\b(address|property|rental|home|place|postcode|suburb|nsw|vic|qld|wa|sa|tas|act|nt)\b/i.test(text);
  return hasStreetType || (/\d/.test(text) && hasAddressContext);
}

function extractTypedAddressQuery(text: string) {
  return String(text || '')
    .replace(/\b(tell me about|show me|what do you know about|what's the vibe at|what is the vibe at|check|look up)\b/gi, '')
    .replace(/\baddress\b/gi, '')
    .trim();
}

function buildArrivalAddressSummary(matchedAddress: string, totalFlags: number) {
  if (totalFlags <= 0) {
    return `No scam or maintenance flags are attached to ${matchedAddress} right now.`;
  }
  if (totalFlags === 1) {
    return `There is 1 reported scam or maintenance flag linked to ${matchedAddress}.`;
  }
  return `There are ${totalFlags} reported scam or maintenance flags linked to ${matchedAddress}.`;
}

function dedupeTriggers(triggers: TriageActionType[]) {
  return triggers.filter((trigger, index) => triggers.indexOf(trigger) === index);
}

function normalizeFuelIntentTriggers(triggers: TriageActionType[]) {
  return dedupeTriggers([
    'OPEN_FUEL',
    ...triggers.filter((trigger) => trigger !== 'OPEN_EVENTS' && trigger !== 'OPEN_PLANS'),
  ]).slice(0, 2);
}

function normalizeTriggersForSurface(triggers: TriageActionType[], surface?: TriageCenterProps['surface']) {
  const sanitized = surface === 'arrival'
    ? triggers.filter((trigger) => trigger !== 'OPEN_ARRIVAL')
    : triggers;
  return dedupeTriggers(sanitized);
}

function getVisibleActionTriggers(message: TriageMessage, surface?: TriageCenterProps['surface']) {
  const sourceTriggers = new Set(
    (message.sources || [])
      .map((source) => source.trigger)
      .filter(Boolean) as TriageActionType[],
  );
  return normalizeTriggersForSurface(message.triggers || [], surface).filter((trigger) => !sourceTriggers.has(trigger));
}

function normalizeSourceLabel(label: string) {
  return String(label || '')
    .replace(/^\s*(?:source|sources|and)\s*:?\s*/i, '')
    .replace(/^[\s\-–—:,(]+|[\s\-–—:.)]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function guessSourceLabelFromUrl(url: string) {
  try {
    const { hostname } = new URL(url);
    const host = hostname.replace(/^www\./, '').toLowerCase();
    if (host.includes('fairwork.gov.au')) return 'Fair Work';
    if (host.includes('homeaffairs.gov.au')) return 'Home Affairs';
    if (host.includes('ato.gov.au')) return 'ATO';
    if (host.includes('scamwatch.gov.au')) return 'Scamwatch';
    if (host.includes('cyber.gov.au')) return 'Cyber Security Centre';
    if (host.includes('triplezero.gov.au')) return 'Triple Zero';
    if (host.includes('nsw.gov.au')) return 'NSW Roads';
    if (host.includes('vicroads.vic.gov.au')) return 'VicRoads';
    if (host.includes('qld.gov.au')) return 'Queensland Transport';
    if (host.includes('transport.wa.gov.au')) return 'WA Transport';
    if (host.includes('sa.gov.au')) return 'SA Government';
    if (host.includes('transport.tas.gov.au')) return 'Tasmania Transport';
    if (host.includes('accesscanberra.act.gov.au')) return 'Access Canberra';
    if (host.includes('nt.gov.au')) return 'NT Government';
    if (host.includes('studyaustralia.gov.au')) return 'Study Australia';
    if (host.includes('health.gov.au')) return 'Health.gov.au';
    return hostname.replace(/^www\./, '');
  } catch {
    return 'Official Source';
  }
}

function inferSourceTrigger(label: string): TriageActionType | undefined {
  const normalized = label.toLowerCase();
  if (/\b(free electricity|free power|solar sharer|midday power saver)\b/.test(normalized)) return 'OPEN_FREE_ELECTRICITY_GUIDE';
  if (/\b(application|rental application|cover letter|reference)\b/.test(normalized)) return 'OPEN_APPLICATION_KIT';
  if (/\b(scam checker|listing safety|rental scam)\b/.test(normalized)) return 'OPEN_SCAM_CHECKER';
  if (/\b(sponsor companies|sponsor company|sponsor employer|sponsor employers|sponsorship|482 sponsor)\b/.test(normalized)) return 'OPEN_SPONSOR_COMPANIES';
  if (/\b(pr calculator|pr points|points calculator|points test|permanent residency points)\b/.test(normalized)) return 'OPEN_PR_CALCULATOR';
  if (/\b(visa occupations|skilled occupation|skilled occupations|occupation list|anzsco)\b/.test(normalized)) return 'OPEN_VISA_OCCUPATIONS';
  if (/\b(my network|my card|saved card|linkedin contact|linkedin contacts|networking card|networking contacts)\b/.test(normalized)) return 'OPEN_NETWORKING_CARDS';
  if (/\b(legal|tenancy|bond|tribunal|housing help)\b/.test(normalized)) return 'OPEN_LEGAL';
  if (/\b(evidence|document|docs|screenshot|receipt|lease)\b/.test(normalized)) return 'OPEN_EVIDENCE';
  if (/\b(timeline|address history|current home)\b/.test(normalized)) return 'OPEN_TIMELINE';
  if (/\b(profile|add address|property)\b/.test(normalized)) return 'OPEN_PROFILE';
  if (/\b(job|jobs|sponsor)\b/.test(normalized)) return 'OPEN_SPONSOR_COMPANIES';
  if (/\b(resources|transport|migration|visa|health|education|government)\b/.test(normalized)) return 'OPEN_RESOURCES';
  if (/\b(vibe|suburb|local area)\b/.test(normalized)) return 'OPEN_VIBE';
  if (/\b(public toilets?|toilets?|bathrooms?|restrooms?|loo)\b/.test(normalized)) return 'FIND_NEARBY_TOILET';
  if (/\b(map|neighbourhood|neighborhood)\b/.test(normalized)) return 'OPEN_MAP';
  if (/\b(my itinerary|itinerary|itineraries|trip route|route stops?|spots?)\b/.test(normalized) || /行程|路线|站点/.test(label)) return 'OPEN_MY_ITINERARY';
  if (/\b(event|events|things to do)\b/.test(normalized)) return 'OPEN_EVENTS';
  if (/\b(fuel|petrol|diesel)\b/.test(normalized)) return 'OPEN_FUEL';
  if (/\b(electricity|power|energy)\b/.test(normalized) && /\b(free|solar sharer|midday)\b/.test(normalized)) return 'OPEN_FREE_ELECTRICITY_GUIDE';
  if (/\b(grocer|grocery|groceries|supermarket|woolworths|woolies|coles|aldi|price compare)\b/.test(normalized)) return 'OPEN_GROCERIES';
  if (/\b(expense|spending|budget|transaction|receipt|monthly spend)\b/.test(normalized)) return 'OPEN_EXPENSE_TRACKER';
  if (/\b(household|housemate|bill|chore|invite)\b/.test(normalized)) return 'OPEN_HOUSEHOLD';
  if (/\b(play games?|mini games?|game shelf|crazygames?|paper\.?io|2048|word search|fruit stab)\b/.test(normalized)) return 'OPEN_GAMES';
  return undefined;
}

function dedupeSourcePills(sources: TriageSourcePill[]) {
  const seen = new Set<string>();
  return sources.filter((source) => {
    const key = (source.trigger || source.url || source.label).toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function parseSourcePills(sourceLines: string[]) {
  const pills: TriageSourcePill[] = [];
  for (const sourceLine of sourceLines) {
    const segments = sourceLine
      .replace(/^\s*sources?:\s*/i, '')
      .split(';')
      .map((segment) => segment.trim())
      .filter(Boolean);

    for (const segment of segments) {
      const urls = Array.from(segment.matchAll(/https?:\/\/[^\s),;]+/gi));
      if (urls.length === 0) {
        const label = normalizeSourceLabel(segment);
        if (label) {
          pills.push({ label, trigger: inferSourceTrigger(label) });
        }
        continue;
      }

      let cursor = 0;
      for (const urlMatch of urls) {
        const url = urlMatch[0].replace(/[.)]+$/g, '');
        const startIndex = urlMatch.index ?? 0;
        const labelCandidate = normalizeSourceLabel(segment.slice(cursor, startIndex));
        pills.push({
          label: labelCandidate || guessSourceLabelFromUrl(url),
          url,
        });
        cursor = startIndex + urlMatch[0].length;
      }
    }
  }
  return dedupeSourcePills(pills);
}

function parseTriageDisplayText(rawText: string) {
  const sourceLines: string[] = [];
  let confidence: number | undefined;
  const bodyLines: string[] = [];

  for (const line of String(rawText || '').replace(/\r\n/g, '\n').split('\n')) {
    const confidenceMatch = line.match(/^\s*Confidence(?: score)?:\s*(\d{1,3})%\s*$/i);
    if (confidenceMatch) {
      confidence = Math.max(0, Math.min(95, Number(confidenceMatch[1])));
      continue;
    }

    const sourceMatch = line.match(/^\s*Sources?:\s*(.+)$/i);
    if (sourceMatch) {
      sourceLines.push(sourceMatch[1]);
      continue;
    }

    bodyLines.push(line);
  }

  return {
    text: sanitizeMarkdown(bodyLines.join('\n').replace(/\n{3,}/g, '\n\n').trim()),
    sources: parseSourcePills(sourceLines),
    confidence,
  };
}

function looksLikeFuelIntent(text: string) {
  return /\b(fuel|petrol|diesel|servo|gas price|gas prices|fuel price|fuel prices|unleaded)\b/i.test(text);
}

function looksLikeGroceryIntent(text: string) {
  return /\b(grocer|grocery|groceries|supermarket|shopping|woolworths|woolies|coles|aldi|price compare|price comparison)\b/i.test(text);
}

function looksLikePublicToiletIntent(text: string) {
  return /\b(public\s+)?toilets?\b|\bbathrooms?\b|\brestrooms?\b|\bloo\b/i.test(text)
    || /厕所|洗手间|卫生间|公共厕所/.test(text);
}

function looksLikeNetworkingCardIntent(text: string) {
  const normalized = String(text || '').toLowerCase();
  const directContactSignal = /\b(my network|my card|linkedin|linked in|networking card|business card|contact|contacts|connection|connections|intro|introduction|referral|refer me|someone i met|person i met|people i met|who do i know|do i know|know someone|met at|met them|follow up|ping them)\b/.test(normalized);
  const peopleHelpSignal = /\b(who|someone|anyone|person|people|contact|connection)\b/.test(normalized)
    && /\b(help|apply|application|prepare|prep|interview|job|role|company|startup|founder|investor|vc|mentor|referral|refer|intro|introduction)\b/.test(normalized);
  const companyRecallSignal = /\b(do i know|know someone|someone from|anyone from|contact at|connection at|people from)\b/.test(normalized);
  const chineseContactSignal = /人脉|联系人|认识谁|认识.*人|谁可以帮|内推|推荐人|介绍.*认识|LinkedIn/.test(text);
  return directContactSignal || peopleHelpSignal || companyRecallSignal || chineseContactSignal;
}

function buildNetworkingCardsContext(cards: NetworkingCard[]) {
  return cards.slice(0, 5).map((card) => ({
    display_name: card.display_name,
    headline: card.headline || undefined,
    company: card.company || undefined,
    role: card.role || undefined,
    location: card.location || undefined,
    met_at: card.met_at || undefined,
    met_context: card.met_context || undefined,
    met_event_title: card.met_event_title || undefined,
    notes: card.notes ? card.notes.slice(0, 900) : undefined,
    display_tags: Array.isArray(card.display_tags) ? card.display_tags.slice(0, 8) : [],
    tags: Array.isArray(card.tags) ? card.tags.slice(0, 8) : [],
    search_terms: Array.isArray(card.search_terms) ? card.search_terms.slice(0, 20) : [],
    linkedin_url: card.linkedin_url || undefined,
  }));
}

function isGrocerySourcePill(source: TriageSourcePill) {
  return source.trigger === 'OPEN_GROCERIES'
    || /\b(grocer|grocery|groceries|supermarket|woolworths|woolies|coles|aldi|price compare|price comparison)\b/i.test(source.label);
}

function isPublicToiletSourcePill(source: TriageSourcePill) {
  return source.trigger === 'FIND_NEARBY_TOILET'
    || /\b(public\s+)?toilets?\b|\bbathrooms?\b|\brestrooms?\b|\bloo\b/i.test(source.label);
}

function shouldUseArrivalEventEnhancement(text: string) {
  if (looksLikeFuelIntent(text)) return false;
  return looksLikeEventIntent(text) || looksLikeWeekendIntent(text) || looksLikeWeekIntent(text);
}

function looksLikeFuelRefusal(text: string) {
  return /\b(can'?t|cannot|can not|unable|not able)\b.{0,30}\b(help|assist|support)\b.{0,30}\b(fuel|petrol|diesel|price)/i.test(text)
    || /\bguide for housing\b/i.test(text);
}

function buildFriendlyFuelReply(suburb?: string | null) {
  if (suburb) {
    return `Yep — I can point you to today’s nearby fuel prices around ${suburb}. Open Fuel Prices and ${APP_CONFIG.displayName} will take you straight there.`;
  }
  return `Yep — I can point you to today’s nearby fuel prices. Open Fuel Prices and ${APP_CONFIG.displayName} will take you straight there.`;
}

function looksLikeDegreeOccupationIntent(text: string) {
  const normalized = String(text || '').toLowerCase();
  const degreeSignal = /\b(degree|course|major|field|qualification|program|programme|study|studied|studying|university|uni|college|bachelor|master|masters|diploma)\b/.test(normalized);
  const migrationSignal = /\b(skilled occupation|skilled occupations|occupation list|visa occupation|visa occupations|anzsco|pr|permanent residency|migration|visa|skills assessment|assessing authority)\b/.test(normalized);
  const chineseDegreeSignal = /学位|课程|专业|学历|大学|本科|硕士|研究生|文凭|读.*专业/.test(text);
  const chineseMigrationSignal = /技术职业|职业清单|签证职业|ANZSCO|PR|永居|移民|签证|技术评估|评估机构/.test(text);
  return (degreeSignal || chineseDegreeSignal) && (migrationSignal || chineseMigrationSignal);
}

function buildAcademicProfileContext(profile: any): AcademicProfileContext | null {
  if (!profile) return null;
  const context: AcademicProfileContext = {};
  if (typeof profile.university === 'string' && profile.university.trim()) {
    context.university = profile.university.trim();
  }
  if (typeof profile.course_name === 'string' && profile.course_name.trim()) {
    context.course_name = profile.course_name.trim();
  }
  if (profile.graduation_year !== undefined && profile.graduation_year !== null && String(profile.graduation_year).trim()) {
    context.graduation_year = profile.graduation_year;
  }
  if (typeof profile.visa_status === 'string' && profile.visa_status.trim()) {
    context.visa_status = profile.visa_status.trim();
  }
  return Object.keys(context).length > 0 ? context : null;
}

function wantsPrPointsContext(text: string) {
  return /\b(pr|permanent residency|points?|calculator|189|190|491)\b/i.test(text)
    || /移民分|打分|分数|分数计算|永居/.test(text);
}

function looksLikeSponsorCompaniesIntent(text: string) {
  return /\b(sponsor companies|sponsor company|sponsor list|sponsor employer|sponsor employers|accredited sponsor|approved sponsor|approved sponsors|standard business sponsor|standard business sponsors|482 sponsor|482 sponsors|482 visa sponsor|482 visa sponsors)\b/i.test(text)
    || /担保公司|担保雇主|雇主担保|担保名单|认可担保|482/.test(text);
}

function looksLikePrCalculatorIntent(text: string) {
  return /\b(pr calculator|pr points|points calculator|points test|permanent residency points|calculate pr|calculate points)\b/i.test(text)
    || /PR.*分|移民分|移民打分|分数计算|打分表|永居.*分/.test(text);
}

function looksLikeVisaOccupationIntent(text: string) {
  return /\b(skilled occupation|skilled occupations|occupation list|visa occupation|visa occupations|anzsco|assessing authority|skills assessment)\b/i.test(text)
    || /职业清单|技术职业|签证职业|ANZSCO|技术评估|评估机构/.test(text);
}

function buildDegreeOccupationGuidance(academicProfile?: AcademicProfileContext | null) {
  const courseName = academicProfile?.course_name?.trim();
  const university = academicProfile?.university?.trim();
  const savedCourse = courseName
    ? `Using your saved course (${courseName}${university ? ` at ${university}` : ''}), I’d treat any occupation matches as areas to investigate, not proof that you are eligible for PR.`
    : 'Tell me your degree, major, and the kind of work you want to do before relying on any occupation suggestions. Without the course/major, I can only give broad areas to investigate.';

  return [
    savedCourse,
    'Degree-to-occupation mapping is exploratory. It depends on the ANZSCO duties, assessing authority rules, skills assessment, visa subclass, current occupation list, work experience, English, points, and state or territory criteria.',
    'Also check with your university, course coordinator, or careers team about program outcomes, accreditation, placements, and typical graduate occupation pathways.',
    'For decisions, verify everything on the official Home Affairs/immi skilled occupation list and points calculator, or speak with a registered migration professional.',
  ].join('\n\n');
}

function applyDegreeOccupationGuardrails(
  text: string,
  academicProfile?: AcademicProfileContext | null,
) {
  const baseText = text.trim();
  const guidance = buildDegreeOccupationGuidance(academicProfile);
  if (!baseText) return guidance;
  return `${baseText}\n\n${guidance}`;
}

function inferHoodieniRouteTriggers(
  text: string,
  hasKnownAddresses: boolean,
  surface?: TriageCenterProps['surface'],
): TriageActionType[] {
  const normalized = text.toLowerCase();
  const inferred: TriageActionType[] = [];

  const add = (...triggers: TriageActionType[]) => {
    for (const trigger of triggers) {
      if (!inferred.includes(trigger)) {
        inferred.push(trigger);
      }
    }
  };

  if (/\b(change|update|edit|fix)\b/.test(normalized) && /\b(address|home|timeline)\b/.test(normalized)) {
    add(hasKnownAddresses ? 'OPEN_TIMELINE' : 'ADD_ADDRESS');
  } else if (/\b(address|home|where do i live|my place)\b/.test(normalized)) {
    add(hasKnownAddresses ? 'OPEN_TIMELINE' : 'ADD_ADDRESS');
  }

  if (looksLikeFreeElectricityQuestion(normalized)) {
    add('OPEN_FREE_ELECTRICITY_GUIDE');
  }

  if (looksLikeNetworkingCardIntent(normalized)) {
    add('OPEN_NETWORKING_CARDS');
  }

  if (looksLikeFuelIntent(normalized)) {
    add('OPEN_FUEL');
  }

  if (looksLikePublicToiletIntent(normalized)) {
    add('FIND_NEARBY_TOILET');
  }

  if (/\b(grocer|grocery|groceries|supermarket|shopping|woolies|coles|aldi)\b/.test(normalized)) {
    add('OPEN_GROCERIES');
  }

  if (/\b(what'?s on|what is on|weekend|things to do|events?|happening)\b/.test(normalized)) {
    add('OPEN_EVENTS');
  }

  if (looksLikeItineraryIntent(normalized)) {
    add('OPEN_MY_ITINERARY');
  }

  if (/\b(my plans|plans i joined|plans i created|show my plans)\b/.test(normalized)) {
    add('OPEN_MY_PLANS');
  } else if (/\b(plan|plans|meetup|meet up)\b/.test(normalized)) {
    add('OPEN_PLANS');
  }

  if (/\b(upload|doc|docs|document|documents|evidence|receipt|receipts|lease|screenshot|screenshots)\b/.test(normalized)) {
    add('OPEN_EVIDENCE');
  }

  if (/\b(application kit|rental application|rent application|apply for a rental|apply for rental|cover letter|application letter|support letter|reference letter|teacher reference|lecturer reference|employer reference|supporting reference|rental references|no rental history|new to australia|guarantor|rental profile)\b/.test(normalized)) {
    add('OPEN_APPLICATION_KIT');
  }

  if (/\b(is this legit|is this real|is this a scam|fake listing|listing scam|rental scam|suspicious listing|red flags|can you check this listing|check this listing)\b/.test(normalized)) {
    add('OPEN_SCAM_CHECKER');
  }

  if (looksLikeSponsorCompaniesIntent(normalized)) {
    add('OPEN_SPONSOR_COMPANIES');
  }

  if (looksLikePrCalculatorIntent(normalized)) {
    add('OPEN_PR_CALCULATOR');
  }

  if (looksLikeVisaOccupationIntent(normalized) || looksLikeDegreeOccupationIntent(normalized)) {
    add('OPEN_VISA_OCCUPATIONS');
    if (wantsPrPointsContext(normalized)) {
      add('OPEN_PR_CALCULATOR');
    }
  }

  if (/\b(drive|driving|driver'?s?|licen[cs]e|learner'?s?|provisional|overseas licen[cs]e|international licen[cs]e|road rules?|transport|opal|train|bus|metro|tram|ferry)\b/.test(normalized)) {
    add('OPEN_RESOURCES');
  }

  if (/\b(visa|migration|immigration|home affairs|immiaccount|vevo|student visa|work rights|tfn|tax file number|ato|medicare|doctor|health|medical|hospital|education|study australia|university|college|school)\b/.test(normalized)) {
    add('OPEN_RESOURCES');
  }

  if (/\b(legal|tribunal|rights|bond|lease dispute|ncat|vcat|tenancy)\b/.test(normalized)) {
    add('OPEN_LEGAL');
  }

  if (/\b(alert|alerts|noticeboard|maintenance|scam|scams)\b/.test(normalized)) {
    add('OPEN_ALERTS');
  }

  if (/\b(profile|account)\b/.test(normalized)) {
    add('OPEN_PROFILE');
  }

  if (/\b(household|shared home|share house|housemate|flatmate)\b/.test(normalized)) {
    add('OPEN_HOUSEHOLD');
  }
  if (looksLikeExpenseTrackerIntent(normalized)) {
    add('OPEN_EXPENSE_TRACKER');
  }
  if (/\b(bill|bills|owe|owed|payment|payments|split|rent split|utilities)\b/.test(normalized)) {
    add('OPEN_HOUSEHOLD_BILLS');
  }
  if (/\b(chore|chores|task|tasks|assigned|rotation|cleaning|clean)\b/.test(normalized)) {
    add('OPEN_HOUSEHOLD_CHORES');
  }
  if (/\b(invite|invites|member|members|housemate|join household)\b/.test(normalized)) {
    add('OPEN_HOUSEHOLD_MEMBERS');
  }
  if (/\b(notification|notifications|alert|alerts|history|activity)\b/.test(normalized) && /\b(household|bill|chore|invite)\b/.test(normalized)) {
    add('OPEN_HOUSEHOLD_ACTIVITY');
  }

  if (new RegExp(`\\b(${APP_CONFIG.assistantName.toLowerCase()}|assistant|guide)\\b`).test(normalized) && surface !== 'arrival') {
    add('OPEN_ARRIVAL');
  }

  if (/\b(arrival|settle|checklist|new here|newcomer)\b/.test(normalized)) {
    add('OPEN_VIBE');
    add(hasKnownAddresses ? 'OPEN_EVIDENCE' : 'OPEN_PROFILE');
  }

  return normalizeTriggersForSurface(
    HOODIENI_ROUTE_TRIGGER_PRIORITY.filter((trigger) => inferred.includes(trigger)).slice(0, 2),
    surface,
  );
}

const SETU_CHINA_ROUTE_TRIGGER_PRIORITY: TriageActionType[] = [
  'OPEN_FREE_ELECTRICITY_GUIDE',
  'OPEN_EVENTS',
  'OPEN_MY_ITINERARY',
  'OPEN_PLANS',
  'OPEN_NETWORKING_CARDS',
  'OPEN_MAP',
  'FIND_NEARBY_TOILET',
  'OPEN_SCAM_CHECKER',
  'OPEN_ALERTS',
  'OPEN_RESOURCES',
  'OPEN_LEGAL',
  'OPEN_SPONSOR_COMPANIES',
  'OPEN_PR_CALCULATOR',
  'OPEN_VISA_OCCUPATIONS',
  'OPEN_PROFILE',
];

const SETU_CHINA_TRIGGER_SOURCE_LABELS: Partial<Record<TriageActionType, string>> = {
  OPEN_FREE_ELECTRICITY_GUIDE: '免费用电指南 / Free electricity guide',
  OPEN_EVENTS: '活动 / Events',
  OPEN_MY_ITINERARY: '我的行程 / My Itinerary',
  OPEN_PLANS: '计划 / Plans',
  OPEN_NETWORKING_CARDS: '人脉 / Networking',
  OPEN_MAP: '地图 / Map',
  FIND_NEARBY_TOILET: '附近厕所 / Toilets',
  OPEN_SCAM_CHECKER: '防诈骗检查 / Scam Checker',
  OPEN_ALERTS: '通知 / Alerts',
  OPEN_RESOURCES: '资源 / Resources',
  VIEW_RESOURCES: '资源 / Resources',
  OPEN_LEGAL: '租房与法律 / Legal',
  OPEN_SPONSOR_COMPANIES: '担保公司 / Sponsor companies',
  OPEN_PR_CALCULATOR: '移民分数 / PR points',
  OPEN_VISA_OCCUPATIONS: '职业清单 / Occupations',
  OPEN_PROFILE: '我的 / Profile',
};

function inferSetuChinaRouteTriggers(
  text: string,
  surface?: TriageCenterProps['surface'],
): TriageActionType[] {
  const normalized = text.toLowerCase();
  const compact = normalized.replace(/\s+/g, '');
  const inferred: TriageActionType[] = [];
  const add = (...triggers: TriageActionType[]) => {
    for (const trigger of triggers) {
      if (!inferred.includes(trigger)) inferred.push(trigger);
    }
  };
  const has = (...patterns: RegExp[]) =>
    patterns.some((pattern) => pattern.test(normalized) || pattern.test(compact));

  if (looksLikeFreeElectricityQuestion(normalized) || has(/免费用电|电费|省电|freeelectricity|freepower/)) {
    add('OPEN_FREE_ELECTRICITY_GUIDE');
  }
  if (looksLikePublicToiletIntent(normalized) || has(/厕所|洗手间|卫生间|公共厕所|toilet|bathroom|restroom|loo/i)) {
    add('FIND_NEARBY_TOILET');
  }
  if (looksLikeNetworkingCardIntent(normalized) || has(/人脉|networking|network|linkedin|内推|推荐人|介绍|认识谁/i)) {
    add('OPEN_NETWORKING_CARDS');
  }
  if (has(/活动|本周|周末|近期|社交|聚会|欢迎会|讲座|工作坊|电影|festival|events?|things to do|what'?s on|weekend|workshop|mixer/i)) {
    add('OPEN_EVENTS');
  }
  if (looksLikeItineraryIntent(normalized) || has(/我的行程|行程|路线|站点|itinerary|itineraries|trip route|route stops?|spots/i)) {
    add('OPEN_MY_ITINERARY');
  }
  if (has(/计划|组局|一起|约|meetup|meet up|\bplans?\b/i)) {
    add('OPEN_PLANS');
  }
  if (has(/地图|附近|地区|郊区|租房|交通|周边|生活地点|suburb|suburbs|map|transport|neighbou?rhood|area/i)) {
    add('OPEN_MAP');
  }
  if (has(/诈骗|骗局|可疑|钓鱼|押金|bond|scam|scams|scamwatch|phishing|fake listing|rental scam/i)) {
    add('OPEN_SCAM_CHECKER', 'OPEN_ALERTS');
  }
  if (has(/通知|提醒|公告|使馆|领事|embassy|alert|alerts|notice|noticeboard/i)) {
    add('OPEN_ALERTS');
  }
  if (has(/担保公司|雇主担保|sponsor companies|sponsor company|sponsor list|482/i)) {
    add('OPEN_SPONSOR_COMPANIES');
  }
  if (has(/移民分数|pr points|pr calculator|points test/i)) {
    add('OPEN_PR_CALCULATOR');
  }
  if (has(/职业清单|职业列表|occupation list|skilled occupation|anzsco/i)) {
    add('OPEN_VISA_OCCUPATIONS');
  }
  if (has(/tfn|税号|oshc|gp|医生|医疗|医保|fair work|打工|兼职|简历|求职|签证|visa|tax file number|work rights|student visa|home affairs|ato|medicare/i)) {
    add('OPEN_RESOURCES');
  }
  if (has(/租约|租房合同|合同|退押金|legal|tribunal|rights|lease|tenancy|ncat|vcat/i)) {
    add('OPEN_LEGAL');
  }
  if (has(/清单|抵澳|到达|刚到|新生|arrival|checklist|settle|settling/i)) {
    add('OPEN_RESOURCES');
  }
  if (has(/个人|账户|资料|我的|profile|account|preferences/i)) {
    add('OPEN_PROFILE');
  }

  return normalizeTriggersForSurface(
    SETU_CHINA_ROUTE_TRIGGER_PRIORITY.filter((trigger) => inferred.includes(trigger)).slice(0, 2),
    surface,
  );
}

function buildSetuChinaIntentHint(text: string) {
  const triggers = inferSetuChinaRouteTriggers(text, 'arrival');
  const labels = triggers
    .map((trigger) => SETU_CHINA_TRIGGER_SOURCE_LABELS[trigger])
    .filter(Boolean);
  if (labels.length === 0) {
    return 'General Australia student life support for a Chinese international student.';
  }
  return `Likely needs ${labels.join(', ')}. Answer in simplified Chinese first, explain official Australian terms briefly, and suggest relevant in-app sections only after the answer.`;
}

function buildSetuChinaSourcePillsForTriggers(triggers: TriageActionType[]): TriageSourcePill[] {
  return dedupeSourcePills(
    triggers
      .map((trigger) => {
        const label = SETU_CHINA_TRIGGER_SOURCE_LABELS[trigger];
        return label ? { label, trigger } : null;
      })
      .filter((source): source is TriageSourcePill => Boolean(source)),
  );
}

function buildSetuChinaFallbackReply(text: string, triggers: TriageActionType[]) {
  const normalized = text.toLowerCase();
  if (triggers.includes('OPEN_EVENTS') || triggers.includes('OPEN_PLANS') || triggers.includes('OPEN_NETWORKING_CARDS')) {
    return '我现在连接智能助手不稳定。先给你一个实用方向：可以在活动、计划或人脉页面筛选近期活动、社交机会和同学计划；如果你告诉我城市、学校和兴趣，我恢复连接后可以帮你更精确地筛选。';
  }
  if (triggers.includes('OPEN_SCAM_CHECKER') || /诈骗|scam|bond|押金|可疑|phishing/i.test(normalized)) {
    return '我现在连接智能助手不稳定。先不要转账或发送证件；租房前尽量实地或视频看房，确认房东/中介身份，bond 尽量通过官方租房押金渠道处理。可疑情况可以查看防诈骗检查、Scamwatch 和安全通知。';
  }
  if (triggers.includes('OPEN_MAP') || triggers.includes('FIND_NEARBY_TOILET')) {
    return '我现在连接智能助手不稳定。你可以先打开地图查看周边交通、租房区域和生活地点；如果是找厕所或附近设施，使用地图里的附近功能会更准确。';
  }
  if (triggers.includes('OPEN_FREE_ELECTRICITY_GUIDE')) {
    return '我现在连接智能助手不稳定。你可以先查看免费用电指南，确认所在州/城市是否适用、时间窗口和电力零售商条件；不要只根据社交媒体信息更换计划。';
  }
  if (triggers.includes('OPEN_SPONSOR_COMPANIES') || triggers.includes('OPEN_PR_CALCULATOR') || triggers.includes('OPEN_VISA_OCCUPATIONS')) {
    return '我现在连接智能助手不稳定。签证、职业清单、担保公司和 PR 分数会随政策变化，请先查看资源页里的官方来源；这类内容只能作为信息参考，不构成移民建议。';
  }
  if (triggers.includes('OPEN_RESOURCES') || /tfn|税号|oshc|gp|fair work|打工|签证|visa/i.test(normalized)) {
    return '我现在连接智能助手不稳定。你可以先查看资源页里的 TFN、OSHC、GP、Fair Work、学生签证和到达清单内容；这些信息只作参考，重要事项请以官方渠道为准。';
  }
  return '我现在连接智能助手不稳定。你可以再试一次，或先查看资源、活动、地图和安全通知；恢复连接后我会继续用中文帮你整理下一步。';
}

const SETU_MALAYSIA_ROUTE_TRIGGER_PRIORITY: TriageActionType[] = [
  'OPEN_FREE_ELECTRICITY_GUIDE',
  'FIND_NEARBY_TOILET',
  'OPEN_EVENTS',
  'OPEN_MY_ITINERARY',
  'OPEN_PLANS',
  'OPEN_NETWORKING_CARDS',
  'OPEN_VIBE',
  'OPEN_MAP',
  'OPEN_SCAM_CHECKER',
  'OPEN_ALERTS',
  'OPEN_EVIDENCE',
  'UPLOAD_EVIDENCE',
  'OPEN_LEGAL',
  'OPEN_RESOURCES',
  'VIEW_RESOURCES',
  'OPEN_SPONSOR_COMPANIES',
  'OPEN_PR_CALCULATOR',
  'OPEN_VISA_OCCUPATIONS',
  'OPEN_PROFILE',
];

const SETU_MALAYSIA_TRIGGER_SOURCE_LABELS: Partial<Record<TriageActionType, string>> = {
  OPEN_FREE_ELECTRICITY_GUIDE: 'Panduan elektrik percuma / Free electricity guide',
  FIND_NEARBY_TOILET: 'Toilet berdekatan / Public toilets',
  OPEN_EVENTS: 'Makan & events',
  OPEN_MY_ITINERARY: 'My Itinerary',
  OPEN_PLANS: 'Plans',
  OPEN_NETWORKING_CARDS: 'My Network',
  OPEN_VIBE: 'Suburbs & vibe',
  OPEN_MAP: 'Map',
  OPEN_SCAM_CHECKER: 'Scam Checker',
  OPEN_ALERTS: 'Alerts',
  OPEN_EVIDENCE: 'Evidence',
  UPLOAD_EVIDENCE: 'Upload evidence',
  OPEN_LEGAL: 'Rental & tenancy help',
  OPEN_RESOURCES: 'Senarai & resources',
  VIEW_RESOURCES: 'Jobs resources',
  OPEN_SPONSOR_COMPANIES: 'Sponsor companies',
  OPEN_PR_CALCULATOR: 'PR points',
  OPEN_VISA_OCCUPATIONS: 'Occupations',
  OPEN_PROFILE: 'Profil',
};

function inferSetuMalaysiaRouteTriggers(
  text: string,
  surface?: TriageCenterProps['surface'],
): TriageActionType[] {
  const normalized = text.toLowerCase();
  const compact = normalized.replace(/\s+/g, '');
  const inferred: TriageActionType[] = [];
  const add = (...triggers: TriageActionType[]) => {
    for (const trigger of triggers) {
      if (!inferred.includes(trigger)) inferred.push(trigger);
    }
  };
  const has = (...patterns: RegExp[]) =>
    patterns.some((pattern) => pattern.test(normalized) || pattern.test(compact));

  if (looksLikeFreeElectricityQuestion(normalized) || has(/free electricity|free power|elektrik percuma|bil elektrik|jimat elektrik/i)) {
    add('OPEN_FREE_ELECTRICITY_GUIDE');
  }
  if (looksLikePublicToiletIntent(normalized) || has(/toilet|bathroom|restroom|loo|tandas|bilik air|public toilet/i)) {
    add('FIND_NEARBY_TOILET');
  }
  if (looksLikeNetworkingCardIntent(normalized) || has(/networking|linkedin|contact|kenalan|orang yang saya jumpa|referral|intro|introduce/i)) {
    add('OPEN_NETWORKING_CARDS');
  }
  if (has(/makan|halal|food|restaurant|events?|what'?s on|things to do|weekend|minggu ini|hujung minggu|campus event|malaysian student|geng|meetup|orientation|festival|community/i)) {
    add('OPEN_EVENTS');
  }
  if (looksLikeItineraryIntent(normalized) || has(/itinerary|trip route|route stops?|saved stops?|jadual|rancangan perjalanan/i)) {
    add('OPEN_MY_ITINERARY');
  }
  if (has(/plan|plans|buat plan|ajak|join|share dengan kawan|lepak/i)) {
    add('OPEN_PLANS');
  }
  if (has(/suburb|suburbs|where to live|neighbou?rhood|area|vibe|rent area|dekat campus|student-friendly|geng dekat/i)) {
    add('OPEN_VIBE');
  }
  if (has(/map|maps|nearby|berdekatan|transport|train|bus|campus distance|grocer|supermarket|opal|myki|go card/i)) {
    add('OPEN_MAP');
  }
  if (has(/scam|sus|suspicious|phishing|fake listing|rental scam|job scam|scamwatch|kena tipu|penipuan/i)) {
    add('OPEN_SCAM_CHECKER', 'OPEN_ALERTS');
  }
  if (has(/alert|alerts|warning|amaran|notice|safety update|community watch|emergency/i)) {
    add('OPEN_ALERTS');
  }
  if (has(/evidence|screenshot|receipt|receipts|documents?|docs|lease screenshot|proof|bukti|gambar|upload/i)) {
    add('OPEN_EVIDENCE');
  }
  if (has(/bond|lease|tenancy|tenant|landlord|agent|rent dispute|tribunal|ncat|vcat|condition report|legal|rental agreement|hak penyewa/i)) {
    add('OPEN_LEGAL');
  }
  if (has(/tfn|tax file number|ato|oshc|gp|clinic|doctor|fair work|work rights|student visa|home affairs|visa|bank account|sim|esim|campus systems|arrival|checklist|senarai|minggu pertama|settle/i)) {
    add('OPEN_RESOURCES');
  }
  if (has(/job|jobs|work|part[- ]?time|kerja|resume|cv|fair work|payslip|wages|gaji/i)) {
    add('VIEW_RESOURCES');
  }
  if (has(/sponsor companies|sponsor company|sponsorship|482|employer sponsor|accredited sponsor|majikan sponsor/i)) {
    add('OPEN_SPONSOR_COMPANIES');
  }
  if (has(/pr points|pr calculator|points test|migration points|kira points/i)) {
    add('OPEN_PR_CALCULATOR');
  }
  if (has(/occupation list|skilled occupation|anzsco|occupations|visa occupation|career list/i)) {
    add('OPEN_VISA_OCCUPATIONS');
  }
  if (has(/profile|profil|account|preferences|personal details/i)) {
    add('OPEN_PROFILE');
  }

  return normalizeTriggersForSurface(
    SETU_MALAYSIA_ROUTE_TRIGGER_PRIORITY.filter((trigger) => inferred.includes(trigger)).slice(0, 2),
    surface,
  );
}

function buildSetuMalaysiaIntentHint(text: string) {
  const triggers = inferSetuMalaysiaRouteTriggers(text, 'arrival');
  const labels = triggers
    .map((trigger) => SETU_MALAYSIA_TRIGGER_SOURCE_LABELS[trigger])
    .filter(Boolean);
  if (labels.length === 0) {
    return 'General Australia student life support for a Malaysian student or newcomer.';
  }
  return `Likely needs ${labels.join(', ')}. Answer Bahasa Malaysia first with concise English where useful, explain official Australian terms, then suggest relevant in-app sections only after the answer.`;
}

function buildSetuMalaysiaSourcePillsForTriggers(triggers: TriageActionType[]): TriageSourcePill[] {
  return dedupeSourcePills(
    triggers
      .map((trigger) => {
        const label = SETU_MALAYSIA_TRIGGER_SOURCE_LABELS[trigger];
        return label ? { label, trigger } : null;
      })
      .filter((source): source is TriageSourcePill => Boolean(source)),
  );
}

function buildSetuMalaysiaFallbackReply(text: string, triggers: TriageActionType[]) {
  const normalized = text.toLowerCase();
  if (triggers.includes('OPEN_EVENTS') || triggers.includes('OPEN_PLANS') || triggers.includes('OPEN_NETWORKING_CARDS')) {
    return 'Sang Kancil tengah susah connect. Buat masa ini, buka Makan & Events, Plans, atau My Network untuk cari events, makan nights, geng, dan contacts. Beritahu city, uni, dan minat anda bila sambungan pulih.';
  }
  if (triggers.includes('OPEN_SCAM_CHECKER') || /scam|sus|bond|deposit|phishing|tipu/i.test(normalized)) {
    return 'Sang Kancil tengah susah connect. Jangan transfer duit atau hantar ID dulu. Verify listing, landlord atau agent, lease, dan bond process. Guna Scam Checker, Alerts, dan official Scamwatch/state tenancy sources.';
  }
  if (triggers.includes('OPEN_EVIDENCE') || triggers.includes('UPLOAD_EVIDENCE')) {
    return 'Sang Kancil tengah susah connect. Simpan lease, bond receipt, condition report, inspection photos, messages, payment receipts, dan screenshots. Buka Evidence untuk upload atau review bukti.';
  }
  if (triggers.includes('OPEN_LEGAL')) {
    return 'Sang Kancil tengah susah connect. Untuk lease, bond, tenancy, atau landlord issue, semak rental resources ikut state dan jangan anggap ini legal advice. Buka Rental & tenancy help untuk next step.';
  }
  if (triggers.includes('OPEN_MAP') || triggers.includes('OPEN_VIBE') || triggers.includes('FIND_NEARBY_TOILET')) {
    return 'Sang Kancil tengah susah connect. Buka Map atau Suburbs & vibe untuk check transport, campus distance, groceries, public toilets, dan suburb feel sebelum pilih tempat.';
  }
  if (triggers.includes('OPEN_SPONSOR_COMPANIES') || triggers.includes('OPEN_PR_CALCULATOR') || triggers.includes('OPEN_VISA_OCCUPATIONS')) {
    return 'Sang Kancil tengah susah connect. Untuk visa, PR points, occupations, atau sponsor companies, semak official Home Affairs/Fair Work info. Maklumat ini hanya general guidance, bukan migration advice.';
  }
  if (triggers.includes('OPEN_RESOURCES') || triggers.includes('VIEW_RESOURCES') || /tfn|oshc|gp|fair work|visa|kerja|student visa|bank|sim/i.test(normalized)) {
    return 'Sang Kancil tengah susah connect. Buka Senarai & resources untuk TFN, OSHC, GP, Fair Work, student visa, bank, SIM, transport, dan arrival checklist. Verify perkara penting di official source.';
  }
  return 'Sang Kancil tengah susah connect. Cuba lagi sebentar, atau buka Senarai, Map, Vibe, Events, Alerts, dan Evidence untuk teruskan.';
}

const WOLLI_ROUTE_TRIGGER_PRIORITY: TriageActionType[] = [
  'OPEN_EVENTS',
  'OPEN_ALERTS',
  'OPEN_RESOURCES',
  'VIEW_RESOURCES',
  'OPEN_MAP',
  'FIND_NEARBY_TOILET',
  'OPEN_PROFILE',
  'OPEN_VIBE',
  'OPEN_ARRIVAL',
];

const WOLLI_TRIGGER_SOURCE_PILLS: Partial<Record<TriageActionType, TriageSourcePill>> = {
  OPEN_EVENTS: { label: "Bayside Council What's On", url: BAYSIDE_EVENTS_URL },
  OPEN_ALERTS: { label: 'Bayside Council Latest News', url: BAYSIDE_NEWS_URL },
  OPEN_RESOURCES: { label: 'Bayside Council Services', url: BAYSIDE_HOME_URL },
  VIEW_RESOURCES: { label: 'Bayside Council Careers', url: 'https://www.bayside.nsw.gov.au/jobsatbayside' },
  OPEN_MAP: { label: 'Bayside Council', url: BAYSIDE_HOME_URL },
  FIND_NEARBY_TOILET: { label: 'Bayside Council places', url: 'https://www.bayside.nsw.gov.au/recreation/places' },
  OPEN_PROFILE: { label: "Where's Wolli profile", trigger: 'OPEN_PROFILE' },
  OPEN_VIBE: { label: 'Where\'s Wolli Explore', trigger: 'OPEN_VIBE' },
  OPEN_ARRIVAL: { label: 'Ask Wolli', trigger: 'OPEN_ARRIVAL' },
};

function looksLikeWolliEmergencyIntent(text: string) {
  return /\b(emergency|urgent danger|danger|crime in progress|fire|ambulance|police now|life threatening|threatening|injured|injury|assault|break in|break-in|accident|crash)\b/i.test(text);
}

function buildWolliServiceSourcePills(text: string): TriageSourcePill[] {
  const normalized = String(text || '').toLowerCase();
  if (!normalized) return [];
  return wolliServices
    .filter((service) =>
      service.keywords.some((keyword) => normalized.includes(keyword.toLowerCase())) ||
      normalized.includes(service.title.toLowerCase()),
    )
    .map((service) => ({
      label: service.url === BAYSIDE_REPORT_ISSUE_URL
        ? 'Bayside Council Report It'
        : `Bayside Council ${service.title}`,
      url: service.url,
    }));
}

function inferWolliRouteTriggers(text: string, surface?: TriageCenterProps['surface']): TriageActionType[] {
  const normalized = text.toLowerCase();
  const inferred: TriageActionType[] = [];
  const add = (...triggers: TriageActionType[]) => {
    for (const trigger of triggers) {
      if (!inferred.includes(trigger)) inferred.push(trigger);
    }
  };

  if (/\b(what'?s on|what is on|events?|activities|workshops?|classes|school holidays|market|festival|community event|this week|weekend|things to do|happening)\b/.test(normalized)) {
    add('OPEN_EVENTS');
  }
  if (/\b(news|latest|alerts?|updates?|announcement|council notice|media release|road closure|closure|changed hours|disruption)\b/.test(normalized)) {
    add('OPEN_ALERTS');
  }
  if (/\b(bin|bins|rubbish|garbage|waste|recycling|clean[ -]?up|collection|tip|drop[ -]?off|parking|permit|rates?|payment|pet|pets|dog|cat|animal|registration|da|development application|planning|building|library|libraries|park|parks|facility|facilities|venue|beach|pool|report it|report an issue|graffiti|pothole|tree|noise|food safety|council service|services)\b/.test(normalized)) {
    add('OPEN_RESOURCES');
  }
  if (/\b(job|jobs|career|careers|vacancy|vacancies|work for council|employment)\b/.test(normalized)) {
    add('VIEW_RESOURCES');
  }
  if (looksLikePublicToiletIntent(normalized)) {
    add('FIND_NEARBY_TOILET');
  }
  if (/\b(map|nearby|near me|where is|directions|suburb|suburbs|place|places|amenities|transport|train|bus|station)\b/.test(normalized)) {
    add('OPEN_MAP');
  }
  if (/\b(profile|account|my details|settings)\b/.test(normalized)) {
    add('OPEN_PROFILE');
  }
  if (/\b(local|area|bayside|wolli|guide|parks|libraries|things around)\b/.test(normalized) && inferred.length === 0) {
    add('OPEN_VIBE');
  }
  if (new RegExp(`\\b(${APP_CONFIG.assistantName.toLowerCase()}|assistant|ask)\\b`).test(normalized) && surface !== 'arrival') {
    add('OPEN_ARRIVAL');
  }

  return normalizeTriggersForSurface(
    WOLLI_ROUTE_TRIGGER_PRIORITY.filter((trigger) => inferred.includes(trigger)).slice(0, 2),
    surface,
  );
}

function buildWolliIntentHint(text: string) {
  const triggers = inferWolliRouteTriggers(text, 'arrival');
  if (looksLikeWolliEmergencyIntent(text)) {
    return 'Likely emergency or safety intent. Tell the user to call 000 for immediate danger, then point to official follow-up channels only after immediate safety.';
  }
  if (triggers.includes('OPEN_EVENTS')) {
    return "Likely events intent. Answer briefly, mention the app's Events section, and include Bayside Council What's On as the official source.";
  }
  if (triggers.includes('OPEN_ALERTS')) {
    return "Likely news or alerts intent. Answer briefly, mention the app's News section, and include Bayside Council Latest News as the official source.";
  }
  if (triggers.includes('OPEN_RESOURCES') || triggers.includes('VIEW_RESOURCES')) {
    return 'Likely council services intent. Point to the Resources section first, then the relevant official Bayside Council page. Do not act as the council.';
  }
  return 'General Bayside local support. Answer as Wolli, a local companion, then direct the user to the most relevant app section and official Bayside Council page.';
}

function buildWolliSourcePillsForTriggers(triggers: TriageActionType[], text?: string): TriageSourcePill[] {
  const sources = triggers
    .map((trigger) => WOLLI_TRIGGER_SOURCE_PILLS[trigger])
    .filter((source): source is TriageSourcePill => Boolean(source));

  const normalized = String(text || '').toLowerCase();
  sources.push(...buildWolliServiceSourcePills(normalized));
  if (looksLikeWolliEmergencyIntent(text || '')) {
    sources.unshift({ label: 'Triple Zero 000', url: 'https://www.triplezero.gov.au/' });
  }
  if (/\b(report it|report an issue|graffiti|pothole|tree|noise|maintenance)\b/.test(normalized)) {
    sources.push({ label: 'Bayside Council Report It', url: BAYSIDE_REPORT_ISSUE_URL });
  }
  if (/\b(contact|phone|call|email|customer service)\b/.test(normalized)) {
    sources.push({ label: 'Bayside Council contact', url: BAYSIDE_CONTACT_URL });
  }
  return dedupeSourcePills(sources);
}

function buildWolliFallbackReply(text: string, triggers: TriageActionType[]) {
  if (looksLikeWolliEmergencyIntent(text)) {
    return 'If there is immediate danger, call 000 now for police, fire, or ambulance. Where\'s Wolli can help with council follow-up after you are safe.';
  }
  if (triggers.includes('OPEN_EVENTS')) {
    return 'I could not reach Wolli fully just now. Open Events for Bayside activities, then check the official Bayside Council What\'s On page for the final details.';
  }
  if (triggers.includes('OPEN_ALERTS')) {
    return 'I could not reach Wolli fully just now. Open News & alerts for local updates, then check Bayside Council Latest News for the official source.';
  }
  if (triggers.includes('OPEN_RESOURCES') || triggers.includes('VIEW_RESOURCES')) {
    return 'I could not reach Wolli fully just now. Open Resources and choose the closest task, then use the linked Bayside Council page for applications, payments, reports, or rules.';
  }
  if (triggers.includes('OPEN_MAP') || triggers.includes('FIND_NEARBY_TOILET')) {
    return 'I could not reach Wolli fully just now. Open the map for nearby places or public toilets, and check Bayside Council pages for official facility details.';
  }
  return 'I could not reach Wolli fully just now. Try again in a moment, or start with News, What\'s On, Resources, or the official Bayside Council website.';
}

function ArrivalLandingHero({
  questions,
  sections,
  menus,
  showMascot,
  isSetuChina,
  isSetuIndia,
  isJomSettle,
  isWolli,
  onMenuPrompt,
  onMenuRoute,
  onMenuTrigger,
  resetKey,
  disabled,
}: {
  questions: readonly { label: string }[];
  sections: readonly ArrivalLandingSection[];
  menus: readonly ArrivalLandingMenuConfig[];
  showMascot: boolean;
  isSetuChina: boolean;
  isSetuIndia: boolean;
  isJomSettle: boolean;
  isWolli: boolean;
  onMenuPrompt: (prompt: string) => void;
  onMenuRoute: (route: string) => void;
  onMenuTrigger: (trigger: TriageActionType) => void;
  resetKey: string;
  disabled: boolean;
}) {
  const sectionRootRef = useRef<HTMLDivElement>(null);
  const [activeSectionMenuId, setActiveSectionMenuId] = useState<AssistantNavMenuId | null>(null);
  const activeMenu = useMemo(
    () => menus.find((menu) => menu.id === activeSectionMenuId) || null,
    [activeSectionMenuId, menus],
  );
  const promptTexts = useMemo(
    () => (activeMenu?.prompts || questions).map((prompt) => prompt.label.trim()).filter(Boolean),
    [activeMenu, questions],
  );
  const promptKey = promptTexts.join('|');
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [promptIndex, setPromptIndex] = useState(0);
  const [renderedPrompt, setRenderedPrompt] = useState(promptTexts[0] || '');
  const [phase, setPhase] = useState<'typing' | 'holding' | 'deleting'>('typing');
  const usesRhinoLanding = isSetuChina || isSetuIndia;
  const usesImageLanding = usesRhinoLanding || isWolli || isJomSettle;

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncPreference = () => setPrefersReducedMotion(mediaQuery.matches);
    syncPreference();
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', syncPreference);
      return () => mediaQuery.removeEventListener('change', syncPreference);
    }
    mediaQuery.addListener(syncPreference);
    return () => mediaQuery.removeListener(syncPreference);
  }, []);

  useEffect(() => {
    const firstPrompt = promptTexts[0] || '';
    setPromptIndex(0);
    setPhase('typing');
    setRenderedPrompt(prefersReducedMotion ? firstPrompt : '');
  }, [prefersReducedMotion, promptKey]);

  useEffect(() => {
    if (promptTexts.length === 0) return undefined;

    if (prefersReducedMotion) {
      const fullPrompt = promptTexts[promptIndex] || '';
      setRenderedPrompt(fullPrompt);
      const timer = window.setTimeout(() => {
        setPromptIndex((currentIndex) => (currentIndex + 1) % promptTexts.length);
      }, 2600);
      return () => window.clearTimeout(timer);
    }

    const fullPrompt = promptTexts[promptIndex] || '';
    let timer: number;

    if (phase === 'typing') {
      if (renderedPrompt.length < fullPrompt.length) {
        timer = window.setTimeout(() => {
          setRenderedPrompt(fullPrompt.slice(0, renderedPrompt.length + 1));
        }, 36);
      } else {
        timer = window.setTimeout(() => {
          setPhase('holding');
        }, 1050);
      }
    } else if (phase === 'holding') {
      timer = window.setTimeout(() => {
        setPhase('deleting');
      }, 520);
    } else if (renderedPrompt.length > 0) {
      timer = window.setTimeout(() => {
        setRenderedPrompt(fullPrompt.slice(0, renderedPrompt.length - 1));
      }, 18);
    } else {
      timer = window.setTimeout(() => {
        setPromptIndex((currentIndex) => (currentIndex + 1) % promptTexts.length);
        setPhase('typing');
      }, 180);
    }

    return () => window.clearTimeout(timer);
  }, [phase, prefersReducedMotion, promptIndex, promptTexts, renderedPrompt]);

  useEffect(() => {
    setActiveSectionMenuId(null);
  }, [resetKey]);

  useEffect(() => {
    if (!activeSectionMenuId || typeof document === 'undefined') return undefined;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (sectionRootRef.current?.contains(target)) return;
      setActiveSectionMenuId(null);
    };

    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.closest('[data-testid="arrival-landing-sections"]')) return;
      const tagName = target.tagName.toLowerCase();
      if (tagName === 'input' || tagName === 'textarea' || tagName === 'select' || target.isContentEditable) {
        setActiveSectionMenuId(null);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('focusin', handleFocusIn);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('focusin', handleFocusIn);
    };
  }, [activeSectionMenuId]);

  return (
    <>
      <style>
        {`
          @keyframes hoodienieLandingFloat {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-9px); }
          }

          @keyframes hoodienieCaretPulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.2; }
          }

          @keyframes assistantLandingMenuIn {
            from {
              opacity: 0;
              transform: translate(-50%, -50%) scale(0.35);
            }
            to {
              opacity: 1;
            }
          }

          @media (prefers-reduced-motion: reduce) {
            .hoodienie-landing-float,
            .hoodienie-landing-caret,
            .assistant-landing-menu-option {
              animation: none !important;
            }
          }
        `}
      </style>
      <div className={`overflow-visible rounded-[28px] border px-5 py-5 shadow-sm ${
        isSetuChina
          ? 'border-[#F5D1CB] bg-[linear-gradient(135deg,#FFF7F5_0%,#FFFFFF_100%)]'
          : isSetuIndia
            ? 'border-[#F5D1CB] bg-[linear-gradient(135deg,#FFF7F5_0%,#FFFFFF_100%)]'
          : isWolli
            ? 'border-[#C9E8E4] bg-[linear-gradient(135deg,#F3FAF7_0%,#FFFFFF_100%)]'
          : isJomSettle
            ? 'border-[#F5D1CB] bg-[linear-gradient(135deg,#FFF7F5_0%,#FFFFFF_100%)]'
          : 'border-[#FDE68A] bg-[linear-gradient(135deg,#FFFBEB_0%,#FFFFFF_100%)]'
      }`}>
        <div className="flex flex-col items-center justify-center gap-4 text-center">
          {showMascot ? (
            <div
              data-hoodienie-landing-mascot-slot="true"
              className="relative flex h-24 w-24 items-center justify-center sm:h-28 sm:w-28"
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-2 rounded-full bg-[#FACC15]/30 blur-2xl"
              />
              <img
                src={hoodieniMascotUrl}
                alt={APP_CONFIG.assistantName}
                className="hoodienie-landing-float relative h-24 w-24 object-contain drop-shadow-[0_18px_32px_rgba(250,204,21,0.24)] sm:h-28 sm:w-28"
                style={{ animation: prefersReducedMotion ? 'none' : 'hoodienieLandingFloat 3.4s ease-in-out infinite' }}
              />
            </div>
          ) : isWolli ? (
            <div className="relative flex h-24 w-24 items-center justify-center sm:h-28 sm:w-28">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-2 rounded-full bg-[#008A8C]/25 blur-2xl"
              />
              <img
                src={APP_CONFIG.launchArt?.mascot || wolliShortcutIcons.chat}
                alt=""
                aria-hidden="true"
                className="hoodienie-landing-float relative h-24 w-28 object-contain drop-shadow-[0_18px_32px_rgba(0,106,114,0.18)] sm:h-28 sm:w-32"
                style={{ animation: prefersReducedMotion ? 'none' : 'hoodienieLandingFloat 3.4s ease-in-out infinite' }}
              />
            </div>
          ) : isJomSettle ? (
            <img
              src={setuMalaysiaShortcutIcons.chat}
              alt=""
              aria-hidden="true"
              className="h-24 w-24 object-contain sm:h-28 sm:w-28"
              loading="lazy"
            />
          ) : isSetuChina ? (
            <img
              src={setuChinaShortcutIcons.chat}
              alt=""
              aria-hidden="true"
              className="h-24 w-24 object-contain sm:h-28 sm:w-28"
              loading="lazy"
            />
          ) : isSetuIndia ? (
            <img
              src={setuIndiaShortcutIcons.chat}
              alt=""
              aria-hidden="true"
              className="h-24 w-24 object-contain sm:h-28 sm:w-28"
              loading="lazy"
            />
          ) : null}
          <div className="min-h-[3.75rem] max-w-[18rem] flex items-center justify-center sm:max-w-[22rem]">
            <p className="text-lg font-semibold leading-snug text-[#0F172A] sm:text-[1.35rem]">
              {renderedPrompt}
              <span
                aria-hidden="true"
                className={`hoodienie-landing-caret ml-0.5 inline-block h-[1.05em] w-[2px] rounded-full align-[-0.12em] ${usesRhinoLanding || isJomSettle ? 'bg-[#F04444]' : isWolli ? 'bg-[#008A8C]' : 'bg-[#CA8A04]'}`}
                style={{ animation: prefersReducedMotion ? 'none' : 'hoodienieCaretPulse 1s ease-in-out infinite' }}
              />
            </p>
          </div>
          <div
            ref={sectionRootRef}
            className={`relative w-full overflow-visible transition-[min-height] duration-300 ${activeMenu ? 'min-h-[18rem]' : 'min-h-[5.75rem]'}`}
            data-testid="arrival-landing-sections"
          >
            <div
              data-testid="arrival-landing-section-buttons"
              className={`relative grid w-full grid-cols-4 gap-2 transition-opacity duration-200 ${activeMenu ? 'z-20 opacity-25' : 'z-30 opacity-100'}`}
            >
              {sections.map((section) => {
                const Icon = section.icon;
                const isActive = activeSectionMenuId === section.id;
                return (
                  <button
                    key={section.id}
                    type="button"
                    aria-haspopup="menu"
                    aria-expanded={isActive}
                    onClick={() => setActiveSectionMenuId((current) => (current === section.id ? null : section.id))}
                    disabled={disabled}
                    className={`group flex min-h-[5.45rem] flex-col items-center justify-center gap-2 rounded-[18px] px-1.5 py-2 text-center text-[10px] font-bold leading-tight transition-all disabled:cursor-wait disabled:opacity-60 ${
                      usesImageLanding
                        ? 'border border-transparent bg-transparent text-[#0F172A] hover:bg-transparent'
                        : section.buttonClassName
                    }`}
                  >
                    <span className={`flex items-center justify-center ${
                      usesImageLanding
                        ? 'h-16 w-16'
                        : 'h-11 w-11 rounded-2xl bg-white/80 shadow-sm ring-1 ring-current/10'
                    }`}>
                      {usesImageLanding && section.image ? (
                        <img
                          src={section.image}
                          alt=""
                          aria-hidden="true"
                          className="h-16 w-16 object-contain"
                          loading="lazy"
                        />
                      ) : (
                        <Icon className={`h-5 w-5 ${section.iconClassName}`} strokeWidth={1.9} />
                      )}
                    </span>
                    <span>{section.label}</span>
                  </button>
                );
              })}
            </div>

            {activeMenu ? (
              <>
                <button
                  type="button"
                  aria-label={`Close ${activeMenu.title} menu`}
                  onClick={() => setActiveSectionMenuId(null)}
                  className="absolute inset-[-0.35rem] z-10 cursor-default rounded-[24px] bg-white/28"
                  style={{
                    backdropFilter: 'blur(18px) saturate(1.08)',
                    WebkitBackdropFilter: 'blur(18px) saturate(1.08)',
                  }}
                />
                <div
                  role="menu"
                  aria-label={`${activeMenu.title} options`}
                  className="pointer-events-none absolute inset-x-0 top-36 z-40 h-0"
                >
                  {activeMenu.items.map((item, index) => {
                    const Icon = item.icon;
                    const position = getArrivalLandingMenuPosition(index, activeMenu.items.length);
                    const optionClassName = 'assistant-landing-menu-option pointer-events-auto absolute left-1/2 top-1/2 flex w-[5.8rem] flex-col items-center gap-2 text-center transition hover:scale-[1.03] active:scale-[0.97]';
                    const optionStyle = {
                      transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px)) scale(1)`,
                      animation: `assistantLandingMenuIn 260ms ease-out both`,
                      animationDelay: `${index * 34}ms`,
                    };
                    const optionContent = (
                      <>
                        <span className="flex h-16 w-16 items-center justify-center rounded-full border border-white/90 bg-white/95 shadow-[0_22px_46px_rgba(148,163,184,0.28)] backdrop-blur-xl">
                          {usesImageLanding && item.image ? (
                            <img
                              src={item.image}
                              alt=""
                              aria-hidden="true"
                              className="h-12 w-12 object-contain"
                              loading="lazy"
                            />
                          ) : (
                            <Icon className={`h-6 w-6 ${item.colorClassName}`} strokeWidth={1.85} />
                          )}
                        </span>
                        <span className="text-[10px] font-bold leading-tight text-[#0F172A] drop-shadow-[0_1px_0_rgba(255,255,255,0.86)]">
                          {item.label}
                        </span>
                      </>
                    );

                    if (isSetuChina || isWolli || isJomSettle) {
                      return (
                        <button
                          key={item.id}
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setActiveSectionMenuId(null);
                            onMenuPrompt(item.prompt);
                          }}
                          disabled={disabled}
                          className={optionClassName}
                          style={optionStyle}
                        >
                          {optionContent}
                        </button>
                      );
                    }

                    if (item.route) {
                      return (
                        <Link
                          key={item.id}
                          to={item.route}
                          role="menuitem"
                          aria-disabled={disabled || undefined}
                          tabIndex={disabled ? -1 : undefined}
                          onClick={(event) => {
                            if (disabled) {
                              event.preventDefault();
                              return;
                            }
                            setActiveSectionMenuId(null);
                            onMenuRoute(item.route);
                          }}
                          className={optionClassName}
                          style={optionStyle}
                        >
                          {optionContent}
                        </Link>
                      );
                    }

                    if (item.trigger) {
                      return (
                        <button
                          key={item.id}
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setActiveSectionMenuId(null);
                            onMenuTrigger(item.trigger!);
                          }}
                          disabled={disabled}
                          className={optionClassName}
                          style={optionStyle}
                        >
                          {optionContent}
                        </button>
                      );
                    }

                    return (
                      <button
                        key={item.id}
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setActiveSectionMenuId(null);
                          onMenuPrompt(item.prompt);
                        }}
                        disabled={disabled}
                        className={optionClassName}
                        style={optionStyle}
                      >
                        {optionContent}
                      </button>
                    );
                  })}
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}

function TriageEventResultCard({
  card,
  onOpenEvent,
  onOpenEvents,
}: {
  card: TriageInlineEventCard;
  onOpenEvent: () => void;
  onOpenEvents: () => void;
}) {
  const imageUrl = card.event.hero_image_url || card.event.image_url;
  return (
    <div className="rounded-[22px] border border-[#E2E8F0] bg-white p-3 shadow-sm">
      <div className="flex items-start gap-3">
        {imageUrl ? (
          <img src={imageUrl} alt={card.event.title} className="h-20 w-20 shrink-0 rounded-[18px] object-cover" loading="lazy" />
        ) : (
          <div className="h-20 w-20 shrink-0 rounded-[18px] bg-[#F1F5F9]" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#0F766E]">What&apos;s On</p>
          <h4 className="mt-1 line-clamp-2 text-base font-bold leading-5 text-[#0F172A]">{card.event.title}</h4>
          <p className="mt-2 text-sm font-medium text-[#475569]">{formatArrivalEventDate(card.event)}</p>
          <div className="mt-2 flex items-start gap-2 text-sm text-[#64748B]">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#0F766E]" strokeWidth={1.7} />
            <span className="line-clamp-2">{formatArrivalEventLocation(card.event)}</span>
          </div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onOpenEvent}
          className="rounded-2xl border border-[#CBD5E1] px-3 py-2 text-sm font-semibold text-[#0F172A] transition hover:bg-[#F8FAFC]"
        >
          Open Event
        </button>
        <button
          type="button"
          onClick={onOpenEvents}
          className="rounded-2xl border border-[#99F6E4] bg-[#F0FDFA] px-3 py-2 text-sm font-semibold text-[#0F766E] transition hover:bg-[#CCFBF1]"
        >
          Open Events
        </button>
      </div>
    </div>
  );
}

function TriageAddressInsightCard({
  card,
  onOpenMap,
  onOpenLegal,
  shareEnabled,
}: {
  card: TriageInlineAddressCard;
  onOpenMap: () => void;
  onOpenLegal: () => void;
  shareEnabled: boolean;
}) {
  return (
    <div className="rounded-[22px] border border-[#E2E8F0] bg-white p-4 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#CA8A04]">Address Insight</p>
      <h4 className="mt-2 text-base font-bold text-[#0F172A]">{card.matchedAddress}</h4>
      {(card.suburb || card.state) ? (
        <p className="mt-1 text-sm text-[#64748B]">{[card.suburb, card.state].filter(Boolean).join(' • ')}</p>
      ) : null}
      <p className="mt-3 text-sm leading-6 text-[#475569]">{card.summary}</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onOpenMap}
          className="rounded-2xl border border-[#99F6E4] bg-[#F0FDFA] px-3 py-2 text-sm font-semibold text-[#0F766E] transition hover:bg-[#CCFBF1]"
        >
          Open Map
        </button>
        <button
          type="button"
          onClick={onOpenLegal}
          className="rounded-2xl border border-[#CBD5E1] px-3 py-2 text-sm font-semibold text-[#0F172A] transition hover:bg-[#F8FAFC]"
        >
          Open Legal
        </button>
      </div>
      {shareEnabled ? (
        <HoodieShareActions
          descriptor={buildAddressCheckShareDescriptor({
            suburb: card.suburb,
            state: card.state,
            totalFlags: card.totalFlags,
          })}
          confirmation={{
            title: 'Share a redacted area snapshot?',
            description: 'This share keeps the location at suburb level only. It will not include the exact street address or your private conversation.',
          }}
          className="mt-3"
        />
      ) : null}
    </div>
  );
}

function TriagePublicToiletCard({
  card,
  onOpenDirections,
  onOpenMap,
}: {
  card: TriageInlinePublicToiletCard;
  onOpenDirections: () => void;
  onOpenMap: () => void;
}) {
  return (
    <div className="rounded-[22px] border border-[#CCFBF1] bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#0F766E] text-white">
          <Toilet className="h-5 w-5" strokeWidth={1.9} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#0F766E]">Public Toilet</p>
          <h4 className="mt-1 text-base font-bold leading-5 text-[#0F172A]">{card.name}</h4>
          {card.address ? (
            <p className="mt-1 text-sm leading-5 text-[#64748B]">{card.address}</p>
          ) : null}
          <p className="mt-2 text-xs font-bold uppercase tracking-wide text-[#0F766E]">
            {formatAssistantDistance(card.distanceM)} - about {card.walkMin} min walk
          </p>
        </div>
      </div>

      <div className="mt-3 rounded-2xl border border-[#CCFBF1] bg-[#F0FDFA] px-3 py-2">
        <div className="flex items-start gap-2">
          <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-[#0F766E]" strokeWidth={1.8} />
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#0F766E]">Hours</p>
            <p className="text-sm leading-5 text-[#0F172A]">{card.openingHours || 'Hours not listed'}</p>
          </div>
        </div>
      </div>

      {card.flags.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {card.flags.map((flag) => (
            <span key={flag} className="rounded-full border border-[#CCFBF1] bg-[#F8FAFC] px-2 py-1 text-[10px] font-bold text-[#115E59]">
              {flag}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onOpenDirections}
          className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-[#0F766E] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#115E59]"
        >
          <Navigation className="h-4 w-4" strokeWidth={1.8} />
          Directions
        </button>
        <button
          type="button"
          onClick={onOpenMap}
          className="inline-flex items-center justify-center gap-1.5 rounded-2xl border border-[#99F6E4] bg-[#F0FDFA] px-3 py-2 text-sm font-semibold text-[#0F766E] transition hover:bg-[#CCFBF1]"
        >
          <MapPin className="h-4 w-4" strokeWidth={1.8} />
          Open Map
        </button>
      </div>
    </div>
  );
}

function formatTriageMonthLabel(month: string) {
  const [yearValue, monthValue] = String(month || '').split('-').map(Number);
  const date = Number.isFinite(yearValue) && Number.isFinite(monthValue)
    ? new Date(yearValue, Math.max(0, monthValue - 1), 1)
    : new Date();
  return new Intl.DateTimeFormat('en-AU', {
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function formatTriageDateLabel(value?: string | null) {
  const parsed = new Date(String(value || ''));
  if (!Number.isFinite(parsed.getTime())) return '';
  return new Intl.DateTimeFormat('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(parsed);
}

function buildTimelineAddressLabel(entry: RentalEntry) {
  return [
    entry.unit_number ? `Unit ${entry.unit_number}` : '',
    entry.display_address || entry.address,
    entry.suburb,
    entry.state,
    entry.postcode,
  ].filter(Boolean).join(', ');
}

function buildTimelinePeriodLabel(entry: RentalEntry) {
  const start = formatTriageDateLabel(entry.start_date);
  const end = entry.is_current ? 'Now' : formatTriageDateLabel(entry.end_date);
  if (start && end) return `${start} - ${end}`;
  return start || end || 'Dates not added';
}

function getSortedTimelineEntries(entries: RentalEntry[]) {
  return [...entries].sort((left, right) => {
    if (left.is_current !== right.is_current) return left.is_current ? -1 : 1;
    return new Date(right.start_date || right.created_at || 0).getTime() - new Date(left.start_date || left.created_at || 0).getTime();
  });
}

function getSydneyDayKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: OFFICIAL_EVENTS_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function isIsoDayKey(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function formatItineraryContextDayLabel(dayKey: string) {
  if (!isIsoDayKey(dayKey)) return dayKey || 'Date TBC';
  const [year, month, day] = dayKey.split('-').map(Number);
  return new Intl.DateTimeFormat('en-AU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: OFFICIAL_EVENTS_TIMEZONE,
  }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}

function compareItineraryContextEvents(left: ItineraryEvent, right: ItineraryEvent) {
  const dayCompare = String(left.event_day || 'undated').localeCompare(String(right.event_day || 'undated'));
  if (dayCompare !== 0) return dayCompare;
  const leftOrder = Number.isFinite(Number(left.order)) ? Number(left.order) : Number.MAX_SAFE_INTEGER;
  const rightOrder = Number.isFinite(Number(right.order)) ? Number(right.order) : Number.MAX_SAFE_INTEGER;
  if (leftOrder !== rightOrder) return leftOrder - rightOrder;
  const timeCompare = String(left.upcoming_time || '').localeCompare(String(right.upcoming_time || ''));
  if (timeCompare !== 0) return timeCompare;
  return String(left.title || '').localeCompare(String(right.title || ''));
}

function buildItineraryContextRouteSummary(items: ItineraryEvent[]) {
  const seen = new Set<string>();
  const chips = items
    .map((item) => item.suburb || item.venue_name || item.address)
    .filter((value): value is string => Boolean(value?.trim()))
    .filter((value) => {
      const key = value.trim().toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 5);
  const countLabel = `${items.length} spot${items.length === 1 ? '' : 's'}`;
  return chips.length ? `${countLabel} - ${chips.join(' -> ')}` : countLabel;
}

function buildItineraryAssistantContext(
  records: ItineraryEvent[],
  signedIn: boolean,
  error?: string,
): TriageItineraryContext {
  const today = getSydneyDayKey();
  const groups = new globalThis.Map<string, ItineraryEvent[]>();
  for (const record of [...records].sort(compareItineraryContextEvents)) {
    const day = isIsoDayKey(record.event_day) ? record.event_day : 'undated';
    const group = groups.get(day) || [];
    group.push(record);
    groups.set(day, group);
  }

  const days = Array.from(groups.entries()).map(([day, items]) => {
    const orderedItems = [...items].sort(compareItineraryContextEvents);
    return {
      day,
      label: formatItineraryContextDayLabel(day),
      spot_count: orderedItems.length,
      route_summary: buildItineraryContextRouteSummary(orderedItems),
      spots: orderedItems.slice(0, 16).map((item, index) => ({
        number: index + 1,
        event_key: item.event_key,
        kind: item.kind === 'custom_stop' ? 'custom_stop' as const : 'event' as const,
        title: item.title || 'Untitled stop',
        time: item.upcoming_time || item.dates_humanized || '',
        venue_name: item.venue_name || '',
        suburb: item.suburb || '',
        address: item.address || '',
        summary: item.summary ? item.summary.slice(0, 700) : '',
        maps_url: item.maps_url || '',
        source_url: item.source_url || '',
        lat: Number.isFinite(Number(item.lat)) ? Number(item.lat) : null,
        lng: Number.isFinite(Number(item.lng)) ? Number(item.lng) : null,
      })),
    };
  });

  return {
    active: records.length > 0,
    signed_in: signedIn,
    data_scope: `${APP_CONFIG.displayName} My Itinerary records for this normalized email, shared across SETU India, SETU China, and Hoodie.`,
    today,
    total_spots: records.length,
    present: days.filter((group) => !isIsoDayKey(group.day) || group.day >= today).slice(0, 8),
    past: days.filter((group) => isIsoDayKey(group.day) && group.day < today).reverse().slice(0, 8),
    error,
  };
}

function buildExpenseTrackerContext(reportData: HouseholdExpenseReportData | null) {
  if (!reportData) {
    return {
      active: false,
      data_scope: `${APP_CONFIG.displayName} expense tracker only. No bank, card, or external transaction feed is connected.`,
    };
  }

  const simplifyTransactions = (transactions: HouseholdExpenseReportData['personal_transactions']) =>
    transactions.slice(0, 6).map((transaction) => ({
      title: transaction.title,
      category: transaction.category,
      amount: transaction.amount,
      due_at: transaction.due_at,
      status: transaction.status,
      source: transaction.source,
    }));

  return {
    active: true,
    data_scope: `${APP_CONFIG.displayName} expense tracker only: self split amounts, personal bills, shared receipts, and household bill totals visible to this account. No bank, card, or external transaction feed is connected.`,
    report_month: reportData.report_month,
    report_month_label: formatTriageMonthLabel(reportData.report_month),
    household_name: reportData.household_name,
    currency: 'AUD',
    personal_week: reportData.personal_week,
    personal_month: reportData.personal_month,
    personal_goal_progress: reportData.personal_goal_progress,
    personal_mom_trend: reportData.personal_mom_trend,
    personal_yoy_comparison: reportData.personal_yoy_comparison,
    recent_personal_transactions: simplifyTransactions(reportData.personal_transactions),
    household_week: reportData.household_week,
    household_month: reportData.household_month,
    household_mom_trend: reportData.household_mom_trend,
    household_yoy_comparison: reportData.household_yoy_comparison,
    recent_household_transactions: simplifyTransactions(reportData.household_transactions),
  };
}

function buildTimelineContext(entries: RentalEntry[]) {
  const sortedEntries = getSortedTimelineEntries(entries);
  const currentEntry = sortedEntries.find((entry) => entry.is_current) || null;
  return {
    active: sortedEntries.length > 0,
    data_scope: `${APP_CONFIG.displayName} Timeline entries saved by this signed-in account only.`,
    current_home: currentEntry
      ? {
          address: buildTimelineAddressLabel(currentEntry),
          suburb: currentEntry.suburb,
          state: currentEntry.state,
          postcode: currentEntry.postcode,
          start_date: currentEntry.start_date,
          is_current: currentEntry.is_current,
        }
      : null,
    known_address_count: sortedEntries.length,
    recent_homes: sortedEntries.slice(0, 5).map((entry) => ({
      address: buildTimelineAddressLabel(entry),
      suburb: entry.suburb,
      state: entry.state,
      start_date: entry.start_date,
      end_date: entry.end_date,
      is_current: entry.is_current,
    })),
  };
}

function buildExpenseInsightCard(
  reportData: HouseholdExpenseReportData | null,
  householdContext: { you_owe?: number; youre_owed?: number } | null,
): TriageInlineExpenseCard | null {
  if (!reportData) return null;
  const topPersonalCategory = reportData.personal_month.categories[0];
  const topHouseholdCategory = reportData.household_month.categories[0];
  const personalRecent = reportData.personal_transactions.slice(0, 3).map((transaction) => ({
    title: transaction.title,
    category: transaction.category,
    amount: formatHouseholdMoney(transaction.amount),
    dueLabel: formatTriageDateLabel(transaction.due_at) || 'No due date',
    scope: 'Self' as const,
  }));
  const householdRecent = reportData.household_transactions.slice(0, Math.max(0, 4 - personalRecent.length)).map((transaction) => ({
    title: transaction.title,
    category: transaction.category,
    amount: formatHouseholdMoney(transaction.amount),
    dueLabel: formatTriageDateLabel(transaction.due_at) || 'No due date',
    scope: 'Household' as const,
  }));

  return {
    type: 'expense-summary',
    monthLabel: formatTriageMonthLabel(reportData.report_month),
    householdName: reportData.household_name,
    personalTotal: formatHouseholdMoney(reportData.personal_month.total),
    householdTotal: formatHouseholdMoney(reportData.household_month.total),
    personalBillCount: reportData.personal_month.billCount,
    householdBillCount: reportData.household_month.billCount,
    youOwe: formatHouseholdMoney(Number(householdContext?.you_owe || 0)),
    youreOwed: formatHouseholdMoney(Number(householdContext?.youre_owed || 0)),
    topPersonalCategory: topPersonalCategory
      ? {
          label: topPersonalCategory.category,
          amount: formatHouseholdMoney(topPersonalCategory.amount),
        }
      : undefined,
    topHouseholdCategory: topHouseholdCategory
      ? {
          label: topHouseholdCategory.category,
          amount: formatHouseholdMoney(topHouseholdCategory.amount),
        }
      : undefined,
    goalPercent: reportData.personal_goal_progress.totalGoal > 0
      ? reportData.personal_goal_progress.totalPercent
      : undefined,
    recentTransactions: [...personalRecent, ...householdRecent],
  };
}

function buildTimelineInsightCard(entries: RentalEntry[], evidenceCount: number): TriageInlineTimelineCard | null {
  const sortedEntries = getSortedTimelineEntries(entries);
  if (sortedEntries.length === 0) return null;
  const currentEntry = sortedEntries.find((entry) => entry.is_current) || null;
  return {
    type: 'timeline-summary',
    currentHome: currentEntry ? buildTimelineAddressLabel(currentEntry) : undefined,
    currentSince: currentEntry ? formatTriageDateLabel(currentEntry.start_date) : undefined,
    currentState: currentEntry?.state,
    timelineCount: sortedEntries.length,
    evidenceCount,
    recentHomes: sortedEntries.slice(0, 4).map((entry) => ({
      label: buildTimelineAddressLabel(entry),
      period: buildTimelinePeriodLabel(entry),
      isCurrent: entry.is_current,
    })),
  };
}

function TriageExpenseInsightCard({
  card,
  onOpenExpenseTracker,
}: {
  card: TriageInlineExpenseCard;
  onOpenExpenseTracker: () => void;
}) {
  return (
    <div
      data-testid="triage-expense-card"
      className="max-w-[92%] overflow-hidden rounded-[26px] border border-[#BFDBFE] bg-[linear-gradient(135deg,#FFFFFF_0%,#F8FBFF_48%,#ECFDF5_100%)] shadow-[0_18px_44px_rgba(15,23,42,0.08)]"
    >
      <div className="border-b border-white/80 px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#0F172A] text-white shadow-lg shadow-[#0F172A]/15">
              <WalletCards className="h-5 w-5" strokeWidth={1.8} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#0F766E]">Expense Tracker</p>
              <h4 className="mt-1 truncate text-lg font-black text-[#0F172A]">{card.monthLabel}</h4>
              <p className="truncate text-xs font-semibold text-[#64748B]">{card.householdName}</p>
            </div>
          </div>
          <span className="shrink-0 rounded-full border border-[#BBF7D0] bg-[#F0FDF4] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#047857]">
            Self + household only
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-px bg-[#DBEAFE]/70">
        <div className="bg-white/86 px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#64748B]">Your spend</p>
          <p className="mt-1 text-2xl font-black tracking-tight text-[#0F172A]">{card.personalTotal}</p>
          <p className="mt-1 text-xs font-semibold text-[#64748B]">{card.personalBillCount} tracked item{card.personalBillCount === 1 ? '' : 's'}</p>
        </div>
        <div className="bg-white/86 px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#64748B]">Household</p>
          <p className="mt-1 text-2xl font-black tracking-tight text-[#0F172A]">{card.householdTotal}</p>
          <p className="mt-1 text-xs font-semibold text-[#64748B]">{card.householdBillCount} shared item{card.householdBillCount === 1 ? '' : 's'}</p>
        </div>
      </div>

      <div className="space-y-3 px-4 py-4">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-2xl border border-[#E2E8F0] bg-white/78 px-3 py-2">
            <p className="font-bold text-[#94A3B8]">You owe</p>
            <p className="mt-1 text-base font-black text-[#0F172A]">{card.youOwe}</p>
          </div>
          <div className="rounded-2xl border border-[#E2E8F0] bg-white/78 px-3 py-2">
            <p className="font-bold text-[#94A3B8]">You&apos;re owed</p>
            <p className="mt-1 text-base font-black text-[#0F172A]">{card.youreOwed}</p>
          </div>
        </div>

        {(card.topPersonalCategory || card.topHouseholdCategory || typeof card.goalPercent === 'number') ? (
          <div className="rounded-2xl border border-[#E0F2FE] bg-white/72 px-3 py-3">
            {card.topPersonalCategory ? (
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-bold text-[#475569]">Top self category</span>
                <span className="truncate text-right text-xs font-black text-[#0F766E]">{card.topPersonalCategory.label} · {card.topPersonalCategory.amount}</span>
              </div>
            ) : null}
            {card.topHouseholdCategory ? (
              <div className="mt-2 flex items-center justify-between gap-3">
                <span className="text-xs font-bold text-[#475569]">Top household category</span>
                <span className="truncate text-right text-xs font-black text-[#1D4ED8]">{card.topHouseholdCategory.label} · {card.topHouseholdCategory.amount}</span>
              </div>
            ) : null}
            {typeof card.goalPercent === 'number' ? (
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs font-bold text-[#475569]">
                  <span>Monthly goal used</span>
                  <span>{card.goalPercent}%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#E2E8F0]">
                  <div className="h-full rounded-full bg-[#0F766E]" style={{ width: `${Math.min(100, Math.max(0, card.goalPercent))}%` }} />
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {card.recentTransactions.length > 0 ? (
          <div className="space-y-2">
            {card.recentTransactions.map((transaction, index) => (
              <div key={`${transaction.scope}-${transaction.title}-${index}`} className="flex items-center gap-3 rounded-2xl bg-white/76 px-3 py-2">
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${transaction.scope === 'Self' ? 'bg-[#10B981]' : 'bg-[#3B82F6]'}`} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-[#0F172A]">{transaction.title}</p>
                  <p className="truncate text-[11px] font-semibold text-[#64748B]">{transaction.scope} · {transaction.category} · {transaction.dueLabel}</p>
                </div>
                <span className="shrink-0 text-sm font-black text-[#0F172A]">{transaction.amount}</span>
              </div>
            ))}
          </div>
        ) : null}

        <div className="flex items-center gap-2 rounded-2xl border border-[#CBD5E1] bg-white/72 px-3 py-2">
          <Info className="h-4 w-4 shrink-0 text-[#64748B]" strokeWidth={1.7} />
          <p className="text-[11px] font-semibold leading-5 text-[#64748B]">Uses saved bills, splits, goals, and receipts in {APP_CONFIG.displayName}. It does not include bank or card transactions.</p>
        </div>

        <button
          type="button"
          onClick={onOpenExpenseTracker}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0F172A] px-4 py-3 text-sm font-black text-white shadow-lg shadow-[#0F172A]/15 transition hover:bg-[#111827]"
        >
          <ReceiptText className="h-4 w-4" strokeWidth={1.8} />
          Open expense tracker
        </button>
      </div>
    </div>
  );
}

function TriageTimelineInsightCard({
  card,
  onOpenTimeline,
}: {
  card: TriageInlineTimelineCard;
  onOpenTimeline: () => void;
}) {
  return (
    <div
      data-testid="triage-timeline-card"
      className="max-w-[92%] overflow-hidden rounded-[26px] border border-[#DDD6FE] bg-[linear-gradient(135deg,#FFFFFF_0%,#F8FAFC_52%,#F5F3FF_100%)] shadow-[0_18px_44px_rgba(15,23,42,0.08)]"
    >
      <div className="px-4 py-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#4338CA] text-white shadow-lg shadow-[#4338CA]/15">
            <Home className="h-5 w-5" strokeWidth={1.8} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#4338CA]">Timeline snapshot</p>
            <h4 className="mt-1 text-lg font-black text-[#0F172A]">{card.currentHome ? 'Current home' : 'Saved homes'}</h4>
            {card.currentHome ? (
              <p className="mt-1 text-sm font-semibold leading-5 text-[#475569]">{card.currentHome}</p>
            ) : null}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-2xl border border-[#E2E8F0] bg-white/78 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#94A3B8]">Homes</p>
            <p className="mt-1 text-xl font-black text-[#0F172A]">{card.timelineCount}</p>
          </div>
          <div className="rounded-2xl border border-[#E2E8F0] bg-white/78 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#94A3B8]">Evidence</p>
            <p className="mt-1 text-xl font-black text-[#0F172A]">{card.evidenceCount}</p>
          </div>
          <div className="rounded-2xl border border-[#E2E8F0] bg-white/78 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#94A3B8]">State</p>
            <p className="mt-1 truncate text-xl font-black text-[#0F172A]">{card.currentState || '-'}</p>
          </div>
        </div>

        {card.currentSince ? (
          <p className="mt-3 rounded-2xl bg-white/70 px-3 py-2 text-xs font-bold text-[#475569]">Current since {card.currentSince}</p>
        ) : null}

        <div className="mt-3 space-y-2">
          {card.recentHomes.map((home, index) => (
            <div key={`${home.label}-${index}`} className="flex items-start gap-3 rounded-2xl bg-white/76 px-3 py-2">
              <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${home.isCurrent ? 'bg-[#10B981]' : 'bg-[#A78BFA]'}`} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-[#0F172A]">{home.label}</p>
                <p className="truncate text-[11px] font-semibold text-[#64748B]">{home.period}</p>
              </div>
              {home.isCurrent ? (
                <span className="shrink-0 rounded-full bg-[#DCFCE7] px-2 py-0.5 text-[10px] font-black text-[#047857]">Current</span>
              ) : null}
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={onOpenTimeline}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#4338CA] px-4 py-3 text-sm font-black text-white shadow-lg shadow-[#4338CA]/15 transition hover:bg-[#3730A3]"
        >
          <Home className="h-4 w-4" strokeWidth={1.8} />
          Open timeline
        </button>
      </div>
    </div>
  );
}

export function TriageCenter({ onBack, initialCategory, surface = 'default', focusLandingToken }: TriageCenterProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { launchActive: isHoodienieLaunchActive } = useHoodienieLaunchContext();
  const userName = localStorage.getItem('ghar_first_name') || '';
  const email = localStorage.getItem('ghar_email') || '';
  const isHoodieExperience = APP_CONFIG.experienceMode === 'hoodie';
  const isSetuChina = APP_CONFIG.variant === 'setu_china';
  const isSetuIndia = APP_CONFIG.variant === 'ghar';
  const isJomSettle = APP_CONFIG.variant === 'jom_settle';
  const isWolli = APP_CONFIG.variant === 'wheres_wolli';
  const opensDashboardHome = isSetuChina || isSetuIndia || isJomSettle || isWolli;
  const isSetuGenduExperience = APP_CONFIG.variant === 'ghar' && APP_CONFIG.assistantName === 'Gendu';
  const isArrivalSurface = surface === 'arrival';
  const isLegalSurface = surface === 'legal';

  // ─── User context state ──────────────────────────────────────
  const [knownAddresses, setKnownAddresses] = useState<string[]>([]);
  const [evidenceCount, setEvidenceCount] = useState(0);
  const [userState, setUserState] = useState<string | null>(null);
  const [riskAssessment, setRiskAssessment] = useState<any>(null);
  const [riskScore, setRiskScore] = useState<string | null>(null);
  const [rentalEntries, setRentalEntries] = useState<RentalEntry[]>([]);
  const [householdDashboard, setHouseholdDashboard] = useState<HouseholdDashboardResponse | null>(null);
  const [academicProfile, setAcademicProfile] = useState<AcademicProfileContext | null>(null);

  // Load user context on mount
  useEffect(() => {
    if (!email) return;
    (async () => {
      let profile: any = null;
      try {
        profile = await fetchProfile(email);
        setAcademicProfile(buildAcademicProfileContext(profile));
      } catch (err) {
        console.error('GHAR triage context load error (profile):', err);
      }

      try {
        // Fetch rental history for addresses
        const history = await fetchRentalHistory(email);
        setRentalEntries(history);
        const addresses = history.map((r: any) =>
          [r.unit_number ? `Unit ${r.unit_number}` : '', r.display_address || r.address, r.suburb, r.state, r.postcode]
            .filter(Boolean).join(', ')
        );
        setKnownAddresses(addresses);

        // Detect state and risk assessment from current address
        const current = history.find((r: any) => r.is_current);
        if (current?.state) {
          setUserState(current.state);
        } else if (profile?.australian_state) {
          setUserState(profile.australian_state);
        }

        // Load risk assessment from current property
        if (current?.risk_assessment) {
          setRiskAssessment(current.risk_assessment);
          setRiskScore(current.risk_score || null);
        }
      } catch (err) {
        console.error('GHAR triage context load error (rental):', err);
      }

      try {
        const email = localStorage.getItem('ghar_email') || '';
        const ev = email ? await fetchEvidence(email) : [];
        setEvidenceCount(ev.length);
      } catch (err) {
        console.error('GHAR triage context load error (evidence):', err);
      }

      try {
        const household = await fetchMyHousehold(email);
        setHouseholdDashboard(household);
      } catch (err) {
        console.error('GHAR triage context load error (household):', err);
      }
    })();
  }, [email]);

  const currentRentalEntry = useMemo(
    () => rentalEntries.find((entry) => entry.is_current) || rentalEntries[0] || null,
    [rentalEntries],
  );

  const currentRentalMapSearchState = useMemo(() => {
    if (!currentRentalEntry) return null;
    const query = [
      currentRentalEntry.unit_number ? `Unit ${currentRentalEntry.unit_number}` : '',
      currentRentalEntry.display_address || currentRentalEntry.address,
      currentRentalEntry.suburb,
      currentRentalEntry.state,
      currentRentalEntry.postcode,
    ].filter(Boolean).join(', ');
    return {
      hoodienieMapSearch: {
        query,
        displayName: query,
        suburb: currentRentalEntry.suburb || '',
        state: currentRentalEntry.state || '',
        lat: currentRentalEntry.lat ?? undefined,
        lng: currentRentalEntry.lng ?? undefined,
      },
    };
  }, [currentRentalEntry]);

  const fuelNavigationState = useMemo(() => {
    if (!currentRentalEntry) return undefined;
    if (currentRentalEntry.lat && currentRentalEntry.lng) {
      return {
        initialFuelTarget: {
          label: currentRentalEntry.display_address || currentRentalEntry.address,
          state: currentRentalEntry.state || undefined,
          lat: currentRentalEntry.lat,
          lng: currentRentalEntry.lng,
        },
      };
    }
    const fallbackQuery = [
      currentRentalEntry.suburb,
      currentRentalEntry.state,
      currentRentalEntry.postcode,
    ].filter(Boolean).join(' ');
    return fallbackQuery
      ? {
          initialFuelSearchQuery: fallbackQuery,
          initialSearchMode: 'list' as const,
        }
      : undefined;
  }, [currentRentalEntry]);

  const buildAddressMapState = useCallback((card: TriageInlineAddressCard) => ({
    hoodienieMapSearch: {
      query: card.query || card.matchedAddress,
      displayName: card.matchedAddress,
      suburb: card.suburb || '',
      state: card.state || '',
      lat: card.lat,
      lng: card.lng,
    },
  }), []);

  const householdContext = useMemo(() => {
    const household = householdDashboard?.household || null;
    const pendingInvites = householdDashboard?.pending_invites || [];
    const sharedBills = householdDashboard?.shared_bills || [];
    const householdBills = household?.bills || [];
    const householdBillIds = new Set(householdBills.map((bill) => bill.id));
    const allBills = [
      ...householdBills,
      ...sharedBills.filter((bill) => !householdBillIds.has(bill.id)),
    ];
    const normalizedViewerEmail = normalizeHouseholdEmail(email);
    const viewerMember = household?.members?.find((member) => member.email_normalized === normalizedViewerEmail) || null;
    const attention = getHouseholdAttentionSummary(household, email, pendingInvites, sharedBills);
    const openBills = allBills
      .map((bill) => {
        const split = bill.splits.find((entry) => normalizeHouseholdEmail(entry.member_email) === normalizedViewerEmail);
        if (!split) return null;
        const remaining = Math.max(0, Number(split.amount_owed || 0) - Number(split.amount_paid || 0));
        if (remaining <= 0 || normalizeHouseholdEmail(bill.paid_by_email) === normalizedViewerEmail) return null;
        return {
          title: bill.title,
          amount_owed: remaining,
          due_at: bill.due_at,
          payer_name: getHouseholdBillParticipantDisplayName(household, bill, bill.paid_by_email),
          status: bill.status,
        };
      })
      .filter(Boolean)
      .slice(0, 5) as Array<{
        title: string;
        amount_owed: number;
        due_at: string;
        payer_name: string;
        status: string;
      }>;
    const assignedChores = (household?.chores || [])
      .filter((chore) => normalizeHouseholdEmail(chore.assigned_to_email) === normalizedViewerEmail && chore.status !== 'completed')
      .slice(0, 5)
      .map((chore) => ({
        title: chore.title,
        due_at: chore.due_at,
        status: chore.status,
        cadence: chore.cadence,
      }));
    const pendingConfirmations = allBills
      .flatMap((bill) =>
        bill.payments
          .filter((payment) => normalizeHouseholdEmail(payment.payee_email) === normalizedViewerEmail && payment.status === 'pending_confirmation')
          .map((payment) => ({
            bill_title: bill.title,
            payer_name: getHouseholdBillParticipantDisplayName(household, bill, payment.payer_email),
            amount: payment.amount,
          })),
      )
      .slice(0, 5);
    const recentNotifications = [...(household?.notifications || [])]
      .sort((a, b) => new Date(b.sent_at || 0).getTime() - new Date(a.sent_at || 0).getTime())
      .slice(0, 4)
      .map((notification) => ({
        title: notification.title,
        body: notification.body,
        sent_at: notification.sent_at,
        deep_link: notification.deep_link,
      }));

    return {
      active: Boolean(household || sharedBills.length),
      household_name: household?.name,
      household_address: household
        ? household.address_snapshot?.display_address || household.address_snapshot?.address || household.name
        : undefined,
      viewer_role: viewerMember?.role,
      you_owe: attention.youOwe,
      youre_owed: attention.youreOwed,
      open_bills: openBills,
      assigned_chores: assignedChores,
      pending_invites: pendingInvites.map((invite) => ({
        household_name: invite.household_name,
        address_label: invite.household_address_label,
        invited_by: invite.sender_display_name || getHouseholdEmailHandle(invite.sender_email),
      })),
      pending_confirmations: pendingConfirmations,
      recent_notifications: recentNotifications,
    };
  }, [currentRentalEntry, email, householdDashboard]);

  const expenseReportData = useMemo(() => {
    const household = householdDashboard?.household || null;
    const sharedBills = householdDashboard?.shared_bills || [];
    if (!email || (!household && sharedBills.length === 0)) return null;
    return buildHouseholdExpenseReportData({
      household,
      sharedBills,
      viewerEmail: email,
    });
  }, [email, householdDashboard]);

  const expenseTrackerContext = useMemo(
    () => buildExpenseTrackerContext(expenseReportData),
    [expenseReportData],
  );

  const timelineContext = useMemo(
    () => buildTimelineContext(rentalEntries),
    [rentalEntries],
  );

  const baseUserContext = useMemo(() => ({
    known_addresses: knownAddresses,
    uploaded_evidence: evidenceCount,
    state: userState,
    user_name: userName,
    risk_assessment: riskAssessment,
    risk_score: riskScore,
    academic_context: academicProfile || undefined,
    household_context: householdContext,
    expense_tracker_context: expenseTrackerContext,
    timeline_context: timelineContext,
  }), [knownAddresses, evidenceCount, userState, userName, riskAssessment, riskScore, academicProfile, householdContext, expenseTrackerContext, timelineContext]);

  // ─── Chat state ──────────────────────────────────────────────
  const assistantLabel = APP_CONFIG.assistantName;
  const shareEnabled = Boolean(APP_CONFIG.shareBaseUrl);
  const [messages, setMessages] = useState<TriageMessage[]>([]);
  const [input, setInput] = useState('');
  const [arrivalPlaceholderIndex, setArrivalPlaceholderIndex] = useState(0);
  const [confidenceScore, setConfidenceScore] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [waveformBars, setWaveformBars] = useState<number[]>(Array(24).fill(4));
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const voiceAvailable = !isWolli;
  const voiceEnabledForAssistant = voiceAvailable && voiceEnabled;
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const messagesScrollerRef = useRef<HTMLDivElement>(null);
  const landingAnchorRef = useRef<HTMLDivElement>(null);
  const waveformIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const voiceHandleRef = useRef<VoiceHandle | null>(null);
  const arrivalAutoScrollUnlockedRef = useRef(!isArrivalSurface);
  const toiletLookupRequestRef = useRef(0);
  const [assistantDirectionsTarget, setAssistantDirectionsTarget] = useState<MapDirectionsTarget | null>(null);
  const arrivalPlaceholderTopics = isSetuChina
    ? SETU_CHINA_INPUT_PLACEHOLDER_TOPICS
    : isSetuIndia
      ? SETU_INDIA_INPUT_PLACEHOLDER_TOPICS
    : isJomSettle
      ? JOM_SETTLE_INPUT_PLACEHOLDER_TOPICS
    : isWolli
      ? WOLLI_INPUT_PLACEHOLDER_TOPICS
      : ARRIVAL_INPUT_PLACEHOLDER_TOPICS;
  const arrivalInputPlaceholder = isSetuChina
    ? `中英双语提问：${arrivalPlaceholderTopics[arrivalPlaceholderIndex]}`
    : isJomSettle
      ? `Tanya Sang Kancil: ${arrivalPlaceholderTopics[arrivalPlaceholderIndex]}`
    : isWolli
      ? `Ask Wolli about ${arrivalPlaceholderTopics[arrivalPlaceholderIndex]}`
    : `Ask me about ${arrivalPlaceholderTopics[arrivalPlaceholderIndex]}`;

  useEffect(() => {
    if (!isArrivalSurface || input.length > 0) return;
    const interval = window.setInterval(() => {
      setArrivalPlaceholderIndex((currentIndex) => (currentIndex + 1) % arrivalPlaceholderTopics.length);
    }, 2200);
    return () => window.clearInterval(interval);
  }, [arrivalPlaceholderTopics.length, input.length, isArrivalSurface]);

  const scrollToLandingAnchor = useCallback((behavior: ScrollBehavior = 'auto') => {
    const scroller = messagesScrollerRef.current;
    if (!scroller) return;
    const landingTop = landingAnchorRef.current ? Math.max(0, landingAnchorRef.current.offsetTop - 8) : 0;
    scroller.scrollTo({ top: landingTop, behavior });
  }, []);

  const updateScrollToBottomVisibility = useCallback(() => {
    const scroller = messagesScrollerRef.current;
    if (!scroller || messages.length === 0) {
      setShowScrollToBottom(false);
      return;
    }
    const distanceToBottom = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight;
    const shouldShow = distanceToBottom > 96;
    setShowScrollToBottom((current) => (current === shouldShow ? current : shouldShow));
  }, [messages.length]);

  const scrollToConversationBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const scroller = messagesScrollerRef.current;
    if (!scroller) return;
    if (isArrivalSurface) {
      arrivalAutoScrollUnlockedRef.current = true;
    }
    scroller.scrollTo({ top: scroller.scrollHeight, behavior });
    setShowScrollToBottom(false);
  }, [isArrivalSurface]);

  useEffect(() => {
    if (!isArrivalSurface) return;
    arrivalAutoScrollUnlockedRef.current = false;
    const frame = window.requestAnimationFrame(() => {
      scrollToLandingAnchor('auto');
    });
    const settleTimer = window.setTimeout(() => {
      scrollToLandingAnchor('auto');
    }, 120);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(settleTimer);
    };
  }, [focusLandingToken, isArrivalSurface, scrollToLandingAnchor]);

  useEffect(() => {
    const scroller = messagesScrollerRef.current;
    if (!scroller) return;
    if (isArrivalSurface && !arrivalAutoScrollUnlockedRef.current) {
      scrollToLandingAnchor('auto');
      updateScrollToBottomVisibility();
      return;
    }
    scroller.scrollTo({ top: scroller.scrollHeight, behavior: 'smooth' });
    setShowScrollToBottom(false);
  }, [messages, isTyping, isArrivalSurface, scrollToLandingAnchor, updateScrollToBottomVisibility]);

  useEffect(() => {
    const scroller = messagesScrollerRef.current;
    if (!scroller) return undefined;
    const handleScroll = () => updateScrollToBottomVisibility();
    scroller.addEventListener('scroll', handleScroll, { passive: true });
    updateScrollToBottomVisibility();
    return () => {
      scroller.removeEventListener('scroll', handleScroll);
    };
  }, [updateScrollToBottomVisibility]);

  const animateWaveform = useCallback((active: boolean) => {
    if (waveformIntervalRef.current) clearInterval(waveformIntervalRef.current);
    if (active) {
      waveformIntervalRef.current = setInterval(() => {
        setWaveformBars(Array(24).fill(0).map(() => Math.random() * 28 + 4));
      }, 100);
    } else {
      setWaveformBars(Array(24).fill(4));
    }
  }, []);

  useEffect(() => {
    return () => {
      if (waveformIntervalRef.current) clearInterval(waveformIntervalRef.current);
      voiceHandleRef.current?.stop();
    };
  }, []);

  const stopCurrentVoice = useCallback(() => {
    voiceHandleRef.current?.stop();
    voiceHandleRef.current = null;
    setIsSpeaking(false);
    animateWaveform(false);
  }, [animateWaveform]);

  const playVoice = useCallback(async (text: string) => {
    if (!voiceAvailable) return;
    stopCurrentVoice();
    const handle = speakBrowser(text);
    if (!handle) return;

    voiceHandleRef.current = handle;
    setIsSpeaking(true);
    animateWaveform(true);

    await handle.finished;

    if (voiceHandleRef.current === handle) {
      setIsSpeaking(false);
      animateWaveform(false);
      voiceHandleRef.current = null;
    }
  }, [animateWaveform, stopCurrentVoice, voiceAvailable]);

  const toggleVoice = useCallback(() => {
    if (!voiceAvailable) {
      stopCurrentVoice();
      setVoiceEnabled(false);
      return;
    }
    if (voiceEnabledForAssistant) {
      stopCurrentVoice();
      setVoiceEnabled(false);
    } else {
      setVoiceEnabled(true);
    }
  }, [stopCurrentVoice, voiceAvailable, voiceEnabledForAssistant]);

  const buildArrivalEnhancement = useCallback(async (text: string): Promise<{
    context: ArrivalAssistantContext;
    cards: TriageInlineCard[];
  }> => {
    if (!isArrivalSurface || (!isHoodieExperience && !isSetuChina)) {
      return { context: {}, cards: [] };
    }

    const cleanText = text.trim();
    const context: ArrivalAssistantContext = {};
    const cards: TriageInlineCard[] = [];

    try {
      if (shouldUseArrivalEventEnhancement(cleanText)) {
        const range = looksLikeWeekendIntent(cleanText)
          ? getWeekendEventRange()
          : looksLikeWeekIntent(cleanText)
            ? getWeekEventRange()
            : getUpcomingEventRange();
        const centerLat = currentRentalEntry?.lat ?? ARRIVAL_DEFAULT_CENTER.lat;
        const centerLng = currentRentalEntry?.lng ?? ARRIVAL_DEFAULT_CENTER.lng;
        const { data: officialEvents } = await fetchOfficialEvents({
          appVariant: isWolli ? 'wheres_wolli' : undefined,
          councilSlug: isWolli ? APP_CONFIG.defaultCouncilSlug || 'bayside-council' : undefined,
          startDay: range.startDay,
          endDay: range.endDay,
          centerLat,
          centerLng,
          limit: 4,
        });
        const trimmedEvents = officialEvents.slice(0, 4);
        if (trimmedEvents.length > 0) {
          context.official_events = trimmedEvents.map((event) => ({
            title: event.title,
            humanized_date: formatArrivalEventDate(event),
            venue_name: event.venue_name || '',
            address: event.address || event.suburb || '',
            source_url: event.source_url,
          }));
          cards.push(
            ...trimmedEvents.map((event) => ({
              type: 'event' as const,
              event,
            })),
          );
        }
      }

      if (!looksLikeDrivingLicenceIntent(cleanText) && (looksLikeMyAddressIntent(cleanText) || looksLikeTypedAddressIntent(cleanText))) {
        let query = '';
        let matchedAddress = '';
        let suburb = '';
        let state = '';
        let lat: number | null = null;
        let lng: number | null = null;

        if (looksLikeMyAddressIntent(cleanText) && currentRentalEntry) {
          query = [
            currentRentalEntry.unit_number ? `Unit ${currentRentalEntry.unit_number}` : '',
            currentRentalEntry.display_address || currentRentalEntry.address,
            currentRentalEntry.suburb,
            currentRentalEntry.state,
            currentRentalEntry.postcode,
          ].filter(Boolean).join(', ');
          matchedAddress = query || currentRentalEntry.display_address || currentRentalEntry.address;
          suburb = currentRentalEntry.suburb || '';
          state = currentRentalEntry.state || '';
          lat = currentRentalEntry.lat ?? null;
          lng = currentRentalEntry.lng ?? null;
        } else {
          query = extractTypedAddressQuery(cleanText);
        }

        if ((!lat || !lng) && query) {
          const results = await searchAddress(query);
          const bestMatch = results[0];
          if (bestMatch) {
            matchedAddress = matchedAddress || buildShortAddress(bestMatch);
            suburb = suburb || bestMatch.address?.suburb || bestMatch.address?.town || bestMatch.address?.city || '';
            state = state || normalizeAustralianStateLabel(bestMatch.address?.state);
            lat = Number(bestMatch.lat);
            lng = Number(bestMatch.lon);
          }
        }

        if (matchedAddress && Number.isFinite(lat) && Number.isFinite(lng)) {
          const pedigree = await fetchPropertyPedigree(lat as number, lng as number);
          const totalFlags = Number(pedigree?.total_flags || 0);
          const summary = buildArrivalAddressSummary(matchedAddress, totalFlags);
          context.address_lookup = {
            query: query || matchedAddress,
            matched_address: matchedAddress,
            lat: lat as number,
            lng: lng as number,
            summary,
          };
          cards.push({
            type: 'address',
            query: query || matchedAddress,
            matchedAddress,
            suburb,
            state,
            lat: lat as number,
            lng: lng as number,
            totalFlags,
            summary,
          });
        } else if (query) {
          cards.push({
            type: 'address',
            query,
            matchedAddress: query,
            suburb,
            state,
            totalFlags: 0,
            summary: `I couldn't match ${query} cleanly yet. Open the map and search there for the best result.`,
          });
        }
      }
    } catch (error) {
      console.error('GHAR arrival enhancement error:', error);
      return { context: {}, cards: [] };
    }

    return { context, cards };
  }, [currentRentalEntry, isArrivalSurface, isHoodieExperience, isSetuChina, isWolli]);

  const submitUserText = useCallback(async (rawText: string) => {
    const trimmedText = rawText.trim();
    if (!trimmedText) return;

    if (isArrivalSurface) {
      arrivalAutoScrollUnlockedRef.current = true;
    }
    const userMessage: TriageMessage = { role: 'user', text: trimmedText };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsTyping(true);
    if (voiceAvailable) {
      animateWaveform(true);
    }

    const indianStudentWelfareReply = isSetuGenduExperience
      ? buildIndianStudentWelfareReply(trimmedText, userState)
      : null;

    if (indianStudentWelfareReply) {
      const assistantMessage: TriageMessage = {
        role: 'assistant',
        text: indianStudentWelfareReply.text,
        sources: indianStudentWelfareReply.sources,
        confidence: indianStudentWelfareReply.mission ? 92 : 80,
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setConfidenceScore((prev) => Math.min(95, prev + (indianStudentWelfareReply.mission ? 22 : 12)));
      if (voiceEnabledForAssistant) {
        setTimeout(() => playVoice(indianStudentWelfareReply.text), 200);
      } else {
        animateWaveform(false);
      }
      setIsTyping(false);
      return;
    }

    const freeElectricityReply = buildFreeElectricityAssistantReply(trimmedText);
    if (freeElectricityReply) {
      const assistantMessage: TriageMessage = {
        role: 'assistant',
        text: freeElectricityReply.text,
        sources: freeElectricityReply.sources as TriageSourcePill[],
        confidence: freeElectricityReply.confidence,
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setConfidenceScore((prev) => Math.min(95, prev + 18));
      if (voiceEnabledForAssistant) {
        setTimeout(() => playVoice(freeElectricityReply.text), 200);
      } else {
        animateWaveform(false);
      }
      setIsTyping(false);
      return;
    }

    if (isSetuIndia && looksLikeSetuIndiaGamesIntent(trimmedText)) {
      const assistantText = 'Open Play Games to pick a quick mini game for a study break.';
      const assistantMessage: TriageMessage = {
        role: 'assistant',
        text: assistantText,
        triggers: ['OPEN_GAMES'],
        confidence: 94,
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setConfidenceScore((prev) => Math.min(95, prev + 16));
      if (voiceEnabledForAssistant) {
        setTimeout(() => playVoice(assistantText), 200);
      } else {
        animateWaveform(false);
      }
      setIsTyping(false);
      return;
    }

    if (isWolli && looksLikeWolliEmergencyIntent(trimmedText)) {
      const emergencyTriggers: TriageActionType[] = ['OPEN_RESOURCES'];
      const directReply =
        'If there is immediate danger, call 000 now for police, fire, or ambulance. Once you are safe, Wolli can point you to the right council follow-up page.';
      const assistantMessage: TriageMessage = {
        role: 'assistant',
        text: directReply,
        triggers: emergencyTriggers,
        sources: buildWolliSourcePillsForTriggers(emergencyTriggers, trimmedText),
        confidence: 98,
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setConfidenceScore((prev) => Math.min(95, prev + 18));
      if (voiceEnabledForAssistant) {
        setTimeout(() => playVoice(directReply), 200);
      } else {
        animateWaveform(false);
      }
      setIsTyping(false);
      return;
    }

    const triageRouteExperience = isHoodieExperience || isSetuChina || isWolli;
    const networkingCardsIntent = looksLikeNetworkingCardIntent(trimmedText);
    const recentConversationText = [...messages.slice(-4), userMessage]
      .map((message) => message.text)
      .join('\n');
    const itineraryIntent = triageRouteExperience && looksLikeItineraryIntent(recentConversationText);
    const chinaAssistantContext = isSetuChina
      ? {
          preferred_language: 'zh-CN',
          locale: 'zh-CN',
          audience: 'Chinese international students living, studying, or settling in Australia',
          app_variant: 'setu_china',
          intent_hint: buildSetuChinaIntentHint(trimmedText),
          support_context: 'Answer in simplified Chinese by default. Keep official Australian terms such as TFN, OSHC, Fair Work, Scamwatch, Student visa, bond, and lease agreement in English when useful. Answer the exact latest question with practical next steps, one or two relevant in-app sections, source metadata, trigger metadata, and confidence. Do not produce generic connection-error fallback copy unless the network/API call has actually failed. Do not present legal, migration, financial, tax, or medical advice as definitive.',
        }
      : {};
    const malaysiaAssistantContext = isJomSettle
      ? {
          preferred_language: 'ms-MY',
          locale: 'ms-MY',
          audience: 'Malaysian students and young newcomers living, studying, or settling in Australia',
          app_variant: 'jom_settle',
          assistant_name: 'Sang Kancil',
          intent_hint: buildSetuMalaysiaIntentHint(trimmedText),
          support_context: 'Answer as Sang Kancil for Senang AU. Use Bahasa Malaysia first by default, with concise English support where useful. Keep official Australian terms such as TFN, OSHC, Fair Work, Scamwatch, Student visa, bond, lease agreement, ATO, Home Affairs, Opal, Myki, and Go Card in English when useful. Answer the exact latest question first, then suggest one or two relevant in-app sections with source metadata, trigger metadata, and confidence. Do not present legal, migration, financial, tax, or medical advice as definitive.',
        }
      : {};
    const wolliAssistantContext = isWolli
      ? {
          preferred_language: 'en-AU',
          locale: 'en-AU',
          audience: 'Bayside Council locals, newcomers, and residents staying in the area',
          app_variant: 'wheres_wolli',
          default_council_slug: APP_CONFIG.defaultCouncilSlug || 'bayside-council',
          official_source_urls: APP_CONFIG.localSourceUrls,
          assistant_profile: APP_CONFIG.assistantProfile,
          intent_hint: buildWolliIntentHint(trimmedText),
          support_context: 'Answer as Wolli, a grey-headed flying fox local companion for Bayside Council locals. Use AI to answer the user\'s exact question, not only route them. Start with the relevant Where\'s Wolli section, summarize any provided official_events when the user asks about events or activities, then provide official Bayside Council links. Do not present as an official council representative. For immediate danger, tell users to call 000 before council follow-up. Do not provide definitive legal, planning, financial, health, or emergency advice.',
        }
      : {};

    try {
      const arrivalEnhancement = await buildArrivalEnhancement(trimmedText);
      let networkingCardsContext: ReturnType<typeof buildNetworkingCardsContext> = [];
      if (networkingCardsIntent && email) {
        try {
          const cardsResponse = await fetchNetworkingCards({
            email,
            q: trimmedText,
            limit: 10,
          });
          networkingCardsContext = buildNetworkingCardsContext(cardsResponse.data);
        } catch (error) {
          console.error('GHAR networking cards context error:', error);
        }
      }
      let itineraryContext: TriageItineraryContext | undefined;
      if (itineraryIntent) {
        if (!email) {
          itineraryContext = buildItineraryAssistantContext([], false);
        } else {
          try {
            const itineraryRecords = await fetchMyItinerary({
              email,
              appVariant: APP_CONFIG.variant,
            });
            itineraryContext = buildItineraryAssistantContext(itineraryRecords, true);
          } catch (error) {
            console.error('GHAR itinerary assistant context error:', error);
            itineraryContext = buildItineraryAssistantContext([], true, 'failed_to_fetch');
          }
        }
      }
      const apiMessages = newMessages.map((message) => ({
        role: message.role,
        text: message.text,
      }));
      const rawResponse = await sendTriageMessage(
        apiMessages,
        initialCategory || (isArrivalSurface ? 'arrival' : undefined),
        {
          ...baseUserContext,
          ...chinaAssistantContext,
          ...malaysiaAssistantContext,
          ...wolliAssistantContext,
          surface: isLegalSurface ? 'legal' : isArrivalSurface ? 'arrival' : undefined,
          ...arrivalEnhancement.context,
          networking_cards_context: networkingCardsIntent ? networkingCardsContext : undefined,
          itinerary_context: itineraryContext,
        },
      );

      const { cleanText, triggers } = parseTriageTriggers(rawResponse);
      const modelTriggers = normalizeTriggersForSurface(triggers, surface);
      const fuelIntent = isHoodieExperience && looksLikeFuelIntent(trimmedText);
      const groceryIntent = isHoodieExperience && looksLikeGroceryIntent(trimmedText);
      const publicToiletIntent = triageRouteExperience && looksLikePublicToiletIntent(trimmedText);
      const expenseIntent = isHoodieExperience && looksLikeExpenseTrackerIntent(trimmedText);
      const timelineIntent = isHoodieExperience && looksLikeTimelineInsightIntent(trimmedText);
      const sponsorCompaniesIntent = triageRouteExperience && looksLikeSponsorCompaniesIntent(trimmedText);
      const prCalculatorIntent = triageRouteExperience && looksLikePrCalculatorIntent(trimmedText);
      const visaOccupationIntent = triageRouteExperience && looksLikeVisaOccupationIntent(trimmedText);
      const degreeOccupationIntent = triageRouteExperience && looksLikeDegreeOccupationIntent(trimmedText);
      let finalTriggers = modelTriggers.length > 0
        ? modelTriggers
        : isWolli
          ? inferWolliRouteTriggers(trimmedText, surface)
          : isJomSettle
            ? inferSetuMalaysiaRouteTriggers(trimmedText, surface)
          : isSetuChina
            ? inferSetuChinaRouteTriggers(trimmedText, surface)
          : isHoodieExperience
            ? inferHoodieniRouteTriggers(trimmedText, knownAddresses.length > 0, surface)
            : [];
      if (fuelIntent) {
        finalTriggers = normalizeFuelIntentTriggers(finalTriggers);
      }
      if (groceryIntent && !finalTriggers.includes('OPEN_GROCERIES')) {
        finalTriggers = dedupeTriggers(['OPEN_GROCERIES', ...finalTriggers]).slice(0, 2);
      }
      if (publicToiletIntent && !finalTriggers.includes('FIND_NEARBY_TOILET')) {
        finalTriggers = dedupeTriggers(['FIND_NEARBY_TOILET', ...finalTriggers]).slice(0, 2);
      }
      if (expenseIntent && !finalTriggers.includes('OPEN_EXPENSE_TRACKER')) {
        finalTriggers = dedupeTriggers(['OPEN_EXPENSE_TRACKER', ...finalTriggers]).slice(0, 2);
      }
      if (timelineIntent && knownAddresses.length > 0 && !finalTriggers.includes('OPEN_TIMELINE')) {
        finalTriggers = dedupeTriggers(['OPEN_TIMELINE', ...finalTriggers]).slice(0, 2);
      }
      if (sponsorCompaniesIntent) {
        finalTriggers = dedupeTriggers([
          'OPEN_SPONSOR_COMPANIES',
          ...finalTriggers.filter((trigger) => trigger !== 'VIEW_RESOURCES'),
        ]).slice(0, 2);
      }
      if (prCalculatorIntent) {
        finalTriggers = dedupeTriggers([
          'OPEN_PR_CALCULATOR',
          ...finalTriggers.filter((trigger) => trigger !== 'OPEN_RESOURCES' && trigger !== 'VIEW_RESOURCES'),
        ]).slice(0, 2);
      }
      if (visaOccupationIntent) {
        finalTriggers = dedupeTriggers([
          'OPEN_VISA_OCCUPATIONS',
          ...finalTriggers.filter((trigger) => trigger !== 'OPEN_RESOURCES' && trigger !== 'VIEW_RESOURCES'),
        ]).slice(0, 2);
      }
      if (degreeOccupationIntent) {
        const degreeTriggers: TriageActionType[] = wantsPrPointsContext(trimmedText)
          ? ['OPEN_VISA_OCCUPATIONS', 'OPEN_PR_CALCULATOR']
          : ['OPEN_VISA_OCCUPATIONS'];
        finalTriggers = dedupeTriggers([...degreeTriggers, ...finalTriggers]).slice(0, 2);
      }
      if (networkingCardsIntent) {
        finalTriggers = dedupeTriggers(['OPEN_NETWORKING_CARDS', ...finalTriggers]).slice(0, 2);
      }
      if (itineraryIntent && !finalTriggers.includes('OPEN_MY_ITINERARY')) {
        finalTriggers = dedupeTriggers(['OPEN_MY_ITINERARY', ...finalTriggers]).slice(0, 2);
      }
      if (isWolli) {
        const inferredWolliTriggers = inferWolliRouteTriggers(trimmedText, surface);
        if (looksLikeWolliEmergencyIntent(trimmedText)) {
          finalTriggers = dedupeTriggers(['OPEN_RESOURCES', ...finalTriggers]).slice(0, 2);
        } else if (inferredWolliTriggers.length > 0) {
          finalTriggers = dedupeTriggers([...inferredWolliTriggers, ...finalTriggers]).slice(0, 2);
        }
      }
      const parsedDisplay = parseTriageDisplayText(cleanText);
      let displayText = parsedDisplay.text;
      if (fuelIntent && looksLikeFuelRefusal(displayText)) {
        displayText = buildFriendlyFuelReply(currentRentalEntry?.suburb || null);
      }
      if (degreeOccupationIntent) {
        displayText = applyDegreeOccupationGuardrails(displayText, academicProfile);
      }
      if (triageRouteExperience && finalTriggers.length === 0 && parsedDisplay.sources.length > 0) {
        finalTriggers = ['OPEN_RESOURCES'];
      }
      let displaySources = parsedDisplay.sources.filter((source) => !isPublicToiletSourcePill(source));
      if (fuelIntent) {
        displaySources = displaySources.filter((source) => source.trigger !== 'OPEN_EVENTS' && !/\bevents?\b/i.test(source.label));
        if (!displaySources.some((source) => source.trigger === 'OPEN_FUEL' || /\b(fuel|petrol|diesel)\b/i.test(source.label))) {
          displaySources = dedupeSourcePills([
            ...displaySources,
            { label: `${APP_CONFIG.displayName} Fuel Prices`, trigger: 'OPEN_FUEL' },
          ]);
        }
      }
      if (groceryIntent) {
        displaySources = dedupeSourcePills([
          ...displaySources.filter((source) => !isGrocerySourcePill(source)),
          { label: `${APP_CONFIG.displayName} Price Compare`, trigger: 'OPEN_GROCERIES' },
        ]);
      }
      if (sponsorCompaniesIntent) {
        displaySources = dedupeSourcePills([
          ...displaySources,
          { label: 'Sponsor Companies', trigger: 'OPEN_SPONSOR_COMPANIES' },
        ]);
      }
      if (prCalculatorIntent) {
        displaySources = dedupeSourcePills([
          ...displaySources,
          { label: 'PR Calculator', trigger: 'OPEN_PR_CALCULATOR' },
        ]);
      }
      if (visaOccupationIntent) {
        displaySources = dedupeSourcePills([
          ...displaySources,
          { label: 'Visa Occupations', trigger: 'OPEN_VISA_OCCUPATIONS' },
        ]);
      }
      if (degreeOccupationIntent) {
        const degreeSources: TriageSourcePill[] = [
          { label: 'Visa Occupations', trigger: 'OPEN_VISA_OCCUPATIONS' },
        ];
        if (wantsPrPointsContext(trimmedText)) {
          degreeSources.push({ label: 'PR Calculator', trigger: 'OPEN_PR_CALCULATOR' });
        }
        displaySources = dedupeSourcePills([...displaySources, ...degreeSources]);
      }
      if (networkingCardsIntent) {
        displaySources = dedupeSourcePills([
          ...displaySources,
          { label: isSetuChina ? '人脉 / Networking' : 'My Network', trigger: 'OPEN_NETWORKING_CARDS' },
        ]);
      }
      if (itineraryIntent) {
        displaySources = dedupeSourcePills([
          ...displaySources,
          { label: isSetuChina ? '我的行程 / My Itinerary' : 'My Itinerary', trigger: 'OPEN_MY_ITINERARY' },
        ]);
      }
      if (isSetuChina) {
        const chinaSources = buildSetuChinaSourcePillsForTriggers(finalTriggers);
        displaySources = dedupeSourcePills([...displaySources, ...chinaSources]);
      }
      if (isJomSettle) {
        const malaysiaSources = buildSetuMalaysiaSourcePillsForTriggers(finalTriggers);
        displaySources = dedupeSourcePills([...displaySources, ...malaysiaSources]);
      }
      if (isWolli) {
        const wolliSources = buildWolliSourcePillsForTriggers(finalTriggers, trimmedText);
        displaySources = dedupeSourcePills([...displaySources, ...wolliSources]);
      }

      const assistantCards = fuelIntent
        ? arrivalEnhancement.cards.filter((card) => card.type !== 'event')
        : [...arrivalEnhancement.cards];
      if (expenseIntent) {
        const expenseCard = buildExpenseInsightCard(expenseReportData, householdContext);
        if (expenseCard) assistantCards.push(expenseCard);
      }
      if (timelineIntent) {
        const timelineCard = buildTimelineInsightCard(rentalEntries, evidenceCount);
        if (timelineCard) assistantCards.push(timelineCard);
      }

      const assistantMessage: TriageMessage = {
        role: 'assistant',
        text: displayText,
        triggers: dedupeTriggers(finalTriggers),
        sources: displaySources,
        confidence: parsedDisplay.confidence,
        cards: assistantCards,
      };
      setMessages((prev) => [...prev, assistantMessage]);

      const hasAddr = knownAddresses.length > 0;
      const hasEvidence = evidenceCount > 0;
      const boost = (hasAddr ? 15 : 5) + (hasEvidence ? 10 : 5) + Math.floor(Math.random() * 10);
      setConfidenceScore((prev) => Math.min(95, prev + boost));

      if (voiceEnabledForAssistant) {
        setTimeout(() => playVoice(displayText), 200);
      } else {
        animateWaveform(false);
      }
    } catch (err) {
      console.error('GHAR triage error:', err);
      const fuelIntent = isHoodieExperience && looksLikeFuelIntent(trimmedText);
      const groceryIntent = isHoodieExperience && looksLikeGroceryIntent(trimmedText);
      const publicToiletIntent = triageRouteExperience && looksLikePublicToiletIntent(trimmedText);
      const expenseIntent = isHoodieExperience && looksLikeExpenseTrackerIntent(trimmedText);
      const itineraryIntent = triageRouteExperience && looksLikeItineraryIntent(
        [...messages.slice(-4), { role: 'user' as const, text: trimmedText }]
          .map((message) => message.text)
          .join('\n'),
      );
      const sponsorCompaniesIntent = triageRouteExperience && looksLikeSponsorCompaniesIntent(trimmedText);
      const prCalculatorIntent = triageRouteExperience && looksLikePrCalculatorIntent(trimmedText);
      const visaOccupationIntent = triageRouteExperience && looksLikeVisaOccupationIntent(trimmedText);
      const degreeOccupationIntent = triageRouteExperience && looksLikeDegreeOccupationIntent(trimmedText);
      let fallbackTriggers = isWolli
        ? inferWolliRouteTriggers(trimmedText, surface)
        : isJomSettle
          ? inferSetuMalaysiaRouteTriggers(trimmedText, surface)
        : isSetuChina
          ? inferSetuChinaRouteTriggers(trimmedText, surface)
        : isHoodieExperience
          ? inferHoodieniRouteTriggers(trimmedText, knownAddresses.length > 0, surface)
          : [];
      if (fuelIntent) {
        fallbackTriggers = normalizeFuelIntentTriggers(fallbackTriggers);
      }
      if (groceryIntent && !fallbackTriggers.includes('OPEN_GROCERIES')) {
        fallbackTriggers = dedupeTriggers(['OPEN_GROCERIES', ...fallbackTriggers]).slice(0, 2);
      }
      if (publicToiletIntent && !fallbackTriggers.includes('FIND_NEARBY_TOILET')) {
        fallbackTriggers = dedupeTriggers(['FIND_NEARBY_TOILET', ...fallbackTriggers]).slice(0, 2);
      }
      if (expenseIntent && !fallbackTriggers.includes('OPEN_EXPENSE_TRACKER')) {
        fallbackTriggers = dedupeTriggers(['OPEN_EXPENSE_TRACKER', ...fallbackTriggers]).slice(0, 2);
      }
      if (sponsorCompaniesIntent) {
        fallbackTriggers = dedupeTriggers([
          'OPEN_SPONSOR_COMPANIES',
          ...fallbackTriggers.filter((trigger) => trigger !== 'VIEW_RESOURCES'),
        ]).slice(0, 2);
      }
      if (prCalculatorIntent) {
        fallbackTriggers = dedupeTriggers([
          'OPEN_PR_CALCULATOR',
          ...fallbackTriggers.filter((trigger) => trigger !== 'OPEN_RESOURCES' && trigger !== 'VIEW_RESOURCES'),
        ]).slice(0, 2);
      }
      if (visaOccupationIntent) {
        fallbackTriggers = dedupeTriggers([
          'OPEN_VISA_OCCUPATIONS',
          ...fallbackTriggers.filter((trigger) => trigger !== 'OPEN_RESOURCES' && trigger !== 'VIEW_RESOURCES'),
        ]).slice(0, 2);
      }
      if (degreeOccupationIntent) {
        const degreeTriggers: TriageActionType[] = wantsPrPointsContext(trimmedText)
          ? ['OPEN_VISA_OCCUPATIONS', 'OPEN_PR_CALCULATOR']
          : ['OPEN_VISA_OCCUPATIONS'];
        fallbackTriggers = dedupeTriggers([...degreeTriggers, ...fallbackTriggers]).slice(0, 2);
      }
      if (networkingCardsIntent) {
        fallbackTriggers = dedupeTriggers(['OPEN_NETWORKING_CARDS', ...fallbackTriggers]).slice(0, 2);
      }
      if (itineraryIntent) {
        fallbackTriggers = dedupeTriggers(['OPEN_MY_ITINERARY', ...fallbackTriggers]).slice(0, 2);
      }
      if (isSetuChina && fallbackTriggers.length === 0) {
        fallbackTriggers = ['OPEN_RESOURCES'];
      }
      if (isJomSettle && fallbackTriggers.length === 0) {
        fallbackTriggers = ['OPEN_RESOURCES'];
      }
      if (isWolli && fallbackTriggers.length === 0) {
        fallbackTriggers = ['OPEN_RESOURCES'];
      }
      const fallbackText = fuelIntent
        ? buildFriendlyFuelReply(currentRentalEntry?.suburb || null)
        : itineraryIntent
          ? isSetuChina
            ? '我暂时无法完整读取行程详情。你可以先打开“我的行程”查看已保存的日期和站点；连接恢复后我可以按日期列出行程、站点和具体地点详情。'
            : isJomSettle
              ? 'Saya tak dapat baca itinerary details sepenuhnya sekarang. Buka My Itinerary untuk lihat tarikh dan spots yang sudah disimpan; bila sambungan pulih, Sang Kancil boleh senaraikan itinerary, spots, dan details di sini.'
              : 'I could not fully read itinerary details just now. Open My Itinerary to view saved dates and spots; once the assistant connection recovers I can list itineraries, spots, and spot details here.'
        : isSetuChina
          ? buildSetuChinaFallbackReply(trimmedText, fallbackTriggers)
        : isJomSettle
          ? buildSetuMalaysiaFallbackReply(trimmedText, fallbackTriggers)
        : isWolli
          ? buildWolliFallbackReply(trimmedText, fallbackTriggers)
        : degreeOccupationIntent
          ? applyDegreeOccupationGuardrails('I can still help you frame the right checks.', academicProfile)
          : 'I hit a snag there. Try again in a sec, or I can still point you to the right section.';
      const fallbackSources: TriageSourcePill[] | undefined = publicToiletIntent
        ? isSetuChina
          ? buildSetuChinaSourcePillsForTriggers(fallbackTriggers)
          : isJomSettle
            ? buildSetuMalaysiaSourcePillsForTriggers(fallbackTriggers)
          : isWolli
            ? buildWolliSourcePillsForTriggers(fallbackTriggers, trimmedText)
          : undefined
        : itineraryIntent
        ? [{ label: isSetuChina ? '我的行程 / My Itinerary' : 'My Itinerary', trigger: 'OPEN_MY_ITINERARY' }]
        : networkingCardsIntent
        ? [{ label: isSetuChina ? '人脉 / Networking' : 'My Network', trigger: 'OPEN_NETWORKING_CARDS' }]
        : isSetuChina
          ? buildSetuChinaSourcePillsForTriggers(fallbackTriggers)
        : isJomSettle
          ? buildSetuMalaysiaSourcePillsForTriggers(fallbackTriggers)
        : isWolli
          ? buildWolliSourcePillsForTriggers(fallbackTriggers, trimmedText)
        : isHoodieExperience
          ? [{
            label: fuelIntent
              ? `${APP_CONFIG.displayName} Fuel Prices`
              : groceryIntent
                ? `${APP_CONFIG.displayName} Price Compare`
                : sponsorCompaniesIntent
                  ? 'Sponsor Companies'
                  : prCalculatorIntent
                    ? 'PR Calculator'
                    : visaOccupationIntent
                      ? 'Visa Occupations'
                : degreeOccupationIntent
                  ? 'Visa Occupations'
                : isSetuChina
                  ? '到达清单 / 官方资源'
                  : `${APP_CONFIG.displayName} Resources`,
            trigger: fuelIntent
              ? 'OPEN_FUEL'
              : groceryIntent
                ? 'OPEN_GROCERIES'
                : sponsorCompaniesIntent
                  ? 'OPEN_SPONSOR_COMPANIES'
                  : prCalculatorIntent
                    ? 'OPEN_PR_CALCULATOR'
                    : visaOccupationIntent
                      ? 'OPEN_VISA_OCCUPATIONS'
                : degreeOccupationIntent
                  ? 'OPEN_VISA_OCCUPATIONS'
                  : 'VIEW_RESOURCES',
          }]
          : undefined;
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: fallbackText,
          triggers: fallbackTriggers,
          sources: fallbackSources,
          confidence: isSetuChina || isJomSettle ? 68 : 55,
        },
      ]);
      if (voiceEnabledForAssistant) {
        setTimeout(() => playVoice(fallbackText), 200);
      } else {
        animateWaveform(false);
      }
    } finally {
      setIsTyping(false);
    }
  }, [
    animateWaveform,
    baseUserContext,
    buildArrivalEnhancement,
    currentRentalEntry,
    email,
    evidenceCount,
    expenseReportData,
    academicProfile,
    householdContext,
    initialCategory,
    isArrivalSurface,
    isHoodieExperience,
    isSetuChina,
    isSetuGenduExperience,
    isSetuIndia,
    isWolli,
    isLegalSurface,
    knownAddresses.length,
    messages,
    playVoice,
    rentalEntries,
    surface,
    userState,
    voiceAvailable,
    voiceEnabledForAssistant,
  ]);

  // ─── Send message ───────────────────────────────────────────
  const handleSend = async () => {
    await submitUserText(input);
  };

  const requestNearbyToiletsForAssistant = useCallback(async () => {
    const requestId = toiletLookupRequestRef.current + 1;
    toiletLookupRequestRef.current = requestId;
    setIsTyping(true);
    animateWaveform(true);

    try {
      const position = await getCurrentAppPosition({ timeout: 10000, maximumAge: 60000 });
      if (toiletLookupRequestRef.current !== requestId) return;
      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;
      const bounds = buildAssistantPublicToiletNearbyBounds(latitude, longitude);
      let response;
      try {
        response = await fetchPublicToilets(bounds, { limit: ASSISTANT_PUBLIC_TOILET_NEARBY_LIMIT });
      } catch (error) {
        if (toiletLookupRequestRef.current !== requestId) return;
        const text = getAssistantToiletDataErrorMessage(error);
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            text,
            confidence: 55,
          },
        ]);
        animateWaveform(false);
        return;
      }
      if (toiletLookupRequestRef.current !== requestId) return;
      const cards = buildAssistantToiletCards(latitude, longitude, response.data);
      const text = cards.length > 0
        ? `I found ${cards.length} nearby public toilet${cards.length === 1 ? '' : 's'}. Choose Directions for Apple Maps, Google Maps, or Waze, or see all nearby toilets on the map.`
        : 'I could not find public toilets nearby from the current map data. Open the map and zoom out to search a wider area.';
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text,
          cards,
          confidence: cards.length > 0 ? 90 : 65,
        },
      ]);
      setConfidenceScore((prev) => Math.min(95, prev + (cards.length > 0 ? 18 : 6)));
      if (voiceEnabledForAssistant) {
        setTimeout(() => playVoice(text), 200);
      } else {
        animateWaveform(false);
      }
    } catch (error) {
      if (toiletLookupRequestRef.current !== requestId) return;
      const text = getAssistantToiletLocationErrorMessage(error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text,
          confidence: 55,
        },
      ]);
      animateWaveform(false);
    } finally {
      if (toiletLookupRequestRef.current === requestId) {
        setIsTyping(false);
      }
    }
  }, [animateWaveform, playVoice, voiceEnabledForAssistant]);

  const openAssistantDirectionsUrl = useCallback((url: string) => {
    if (!url) return;
    if (isNativeShell()) {
      window.location.href = url;
      return;
    }
    const openedWindow = window.open(url, '_blank', 'noopener,noreferrer');
    if (!openedWindow) {
      window.location.assign(url);
    }
  }, []);

  const handleOpenAssistantDirectionsApp = useCallback((app: Exclude<FocusedTargetDirectionsApp, 'android-system'>) => {
    if (!assistantDirectionsTarget || !hasValidFocusedMapCoordinatePair(assistantDirectionsTarget.lat, assistantDirectionsTarget.lng)) {
      return;
    }
    openAssistantDirectionsUrl(buildMapDirectionsUrl(assistantDirectionsTarget, app));
    setAssistantDirectionsTarget(null);
  }, [assistantDirectionsTarget, openAssistantDirectionsUrl]);

  // ─── Handle trigger button click ─────────────────────────────
  const handleTriggerClick = (trigger: TriageActionType) => {
    if (isArrivalSurface && trigger === 'OPEN_ARRIVAL') {
      return;
    }
    const config = TRIAGE_ACTIONS[trigger];
    if (trigger === 'FIND_NEARBY_TOILET') {
      void requestNearbyToiletsForAssistant();
      return;
    }
    if (trigger === 'OPEN_MAP' && currentRentalMapSearchState) {
      navigate(opensDashboardHome ? '/dashboard?view=map' : config.route, { state: currentRentalMapSearchState });
      return;
    }
    if (trigger === 'OPEN_FUEL') {
      navigate(config.route, fuelNavigationState ? { state: fuelNavigationState } : undefined);
      return;
    }
    navigate(opensDashboardHome && trigger === 'OPEN_MAP' ? '/dashboard?view=map' : config.route);
  };

  const handleAssistantLandingMenuPrompt = useCallback((prompt: string) => {
    void submitUserText(prompt);
  }, [submitUserText]);

  const handleAssistantLandingMenuRoute = useCallback((route: string) => {
    navigate(route);
  }, [navigate]);

  const handleSourcePillClick = (source: TriageSourcePill) => {
    if (source.url) {
      void Browser.open({ url: source.url }).catch(() => {
        window.open(source.url, '_blank', 'noopener,noreferrer');
      });
      return;
    }
    if (source.trigger) {
      handleTriggerClick(source.trigger);
    }
  };

  // ─── Dynamic Starter Prompts ("Vanishing Pills") ─────────────
  // Waveform status
  const waveformStatus = isSpeaking
    ? isSetuChina ? '正在朗读' : `${assistantLabel} Speaking`
    : isTyping
    ? isSetuChina ? '正在思考' : `${assistantLabel} Thinking`
    : isSetuChina ? '可以提问' : 'Awaiting Input';

  const isWaveformActive = isSpeaking || isTyping;

  return (
    <div className="relative size-full overflow-hidden bg-white flex flex-col" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      {!isArrivalSurface ? (
        <div className="border-b border-[#E2E8F0] px-4 py-3 native-safe-area-top flex items-center justify-between">
          {onBack ? (
            <button onClick={onBack} className="flex items-center gap-2 text-[#64748B] hover:text-[#0F172A] transition-colors cursor-pointer">
              <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
              <span className="text-xs tracking-wide font-medium">Back</span>
            </button>
          ) : (
            <div className="w-[68px]" />
          )}
            <span className="text-xs tracking-wide text-[#64748B] font-medium">
            {isHoodieExperience ? assistantLabel : 'Triage Center'}
          </span>
          <div className="text-right">
            <span className="text-3xl text-[#0F172A]" style={{ fontWeight: 100 }}>{confidenceScore}</span>
            <p className="text-[9px] tracking-wide uppercase text-[#94A3B8] font-medium">Confidence</p>
          </div>
        </div>
      ) : null}

      {/* Waveform + Voice Toggle */}
      {voiceAvailable ? (
        <div
          className="px-4 py-3 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center gap-3 shrink-0"
          style={isArrivalSurface ? { paddingTop: 'calc(var(--native-safe-area-top, 0px) + 0.75rem)' } : undefined}
        >
          <button
            onClick={toggleVoice}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer shrink-0 ${
              voiceEnabledForAssistant
                ? 'bg-[#1E40AF] text-white shadow-md shadow-[#1E40AF]/20'
                : 'bg-white border border-[#E2E8F0] text-[#94A3B8] hover:text-[#64748B] hover:border-[#CBD5E1]'
            }`}
            title={voiceEnabledForAssistant ? `Disable ${assistantLabel} voice` : `Enable ${assistantLabel} voice`}
          >
            {voiceEnabledForAssistant ? (
              <Volume2 className="w-4 h-4" strokeWidth={1.5} />
            ) : (
              <VolumeX className="w-4 h-4" strokeWidth={1.5} />
            )}
          </button>

          <div className="flex-1 flex items-center justify-center gap-[2px] h-8">
            {waveformBars.map((height, i) => (
              <div
                key={i}
                className={`w-1 rounded-full transition-all duration-100 ${
                  isSpeaking ? 'bg-[#EE811A]' : 'bg-[#1E40AF]'
                }`}
                style={{ height: `${height}px`, opacity: isWaveformActive ? 0.8 : 0.2 }}
              />
            ))}
          </div>
          <span className="text-[9px] tracking-wide uppercase text-[#94A3B8] whitespace-nowrap font-medium">
            {waveformStatus}
          </span>
          {isArrivalSurface && !isSetuChina && !isSetuIndia && !isJomSettle ? (
            <HoodieHelpTrigger
              stepId="hoodienie"
              className="shrink-0"
              title={`Open ${APP_CONFIG.assistantName} onboarding video`}
            />
          ) : null}
        </div>
      ) : null}

      {/* Messages */}
      <div
        ref={messagesScrollerRef}
        data-testid="triage-messages-scroller"
        className={`flex-1 min-h-0 overflow-y-auto px-4 space-y-4 ${
          isWolli && isArrivalSurface ? 'pb-4 pt-[calc(var(--native-safe-area-top)+1rem)]' : 'py-4'
        }`}
      >
        {isArrivalSurface ? (
          <div ref={landingAnchorRef}>
            <ArrivalLandingHero
              questions={isSetuChina ? SETU_CHINA_ARRIVAL_LANDING_QUESTIONS : isSetuIndia ? SETU_INDIA_ARRIVAL_LANDING_QUESTIONS : isJomSettle ? JOM_SETTLE_ARRIVAL_LANDING_QUESTIONS : isWolli ? WOLLI_ARRIVAL_LANDING_QUESTIONS : ARRIVAL_LANDING_QUESTIONS}
              sections={isSetuChina ? SETU_CHINA_ARRIVAL_LANDING_SECTIONS : isSetuIndia ? SETU_INDIA_ARRIVAL_LANDING_SECTIONS : isJomSettle ? JOM_SETTLE_ARRIVAL_LANDING_SECTIONS : isWolli ? WOLLI_ARRIVAL_LANDING_SECTIONS : ARRIVAL_LANDING_SECTIONS}
              menus={isSetuChina ? SETU_CHINA_ARRIVAL_LANDING_MENUS : isSetuIndia ? SETU_INDIA_ARRIVAL_LANDING_MENUS : isJomSettle ? JOM_SETTLE_ARRIVAL_LANDING_MENUS : isWolli ? WOLLI_ARRIVAL_LANDING_MENUS : ARRIVAL_LANDING_MENUS}
              showMascot={!isSetuChina && !isSetuIndia && !isJomSettle && !isWolli && (!isHoodieExperience || !isHoodienieLaunchActive)}
              isSetuChina={isSetuChina}
              isSetuIndia={isSetuIndia}
              isJomSettle={isJomSettle}
              isWolli={isWolli}
              onMenuPrompt={handleAssistantLandingMenuPrompt}
              onMenuRoute={handleAssistantLandingMenuRoute}
              onMenuTrigger={handleTriggerClick}
              resetKey={`${location.pathname}${location.search}${location.hash}`}
              disabled={isTyping}
            />
          </div>
        ) : null}

        {messages.map((msg, i) => (
          <div key={i}>
            <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-[#0F172A] text-white rounded-2xl rounded-br-md'
                    : 'bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] rounded-2xl rounded-bl-md'
                }`}
              >
                {msg.role === 'assistant' && (
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[9px] tracking-wide uppercase text-[#1E40AF] font-medium">
                      {assistantLabel}
                    </p>
                    {voiceEnabledForAssistant && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          playVoice(msg.text);
                        }}
                        disabled={isSpeaking}
                        className="text-[#94A3B8] hover:text-[#1E40AF] transition-colors cursor-pointer disabled:opacity-50 ml-2"
                        title="Replay this message"
                      >
                        <Volume2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                      </button>
                    )}
                  </div>
                )}
                <p className="text-sm font-normal leading-relaxed whitespace-pre-line">{msg.text}</p>
                {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 ? (() => {
                  const visibleSources = msg.sources.filter((source) => !isPublicToiletSourcePill(source));
                  if (visibleSources.length === 0) return null;
                  return (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {visibleSources.map((source) => {
                        const triggerConfig = source.trigger ? TRIAGE_ACTIONS[source.trigger] : null;
                        const SourceIcon = source.url
                          ? ExternalLink
                          : triggerConfig
                            ? triggerIconMap[triggerConfig.icon as keyof typeof triggerIconMap] || Info
                            : Info;
                        const sourcePillClassName = 'inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-xl border border-[#CBD5E1] bg-white px-2.5 py-1.5 text-[11px] font-medium text-[#334155] transition-all hover:border-[#1E40AF]/35 hover:bg-[#EFF6FF] disabled:cursor-default disabled:hover:border-[#CBD5E1] disabled:hover:bg-white';
                        return (
                          <button
                            key={`${source.url || source.trigger || source.label}`}
                            type="button"
                            onClick={() => handleSourcePillClick(source)}
                            disabled={!source.url && !source.trigger}
                            className={sourcePillClassName}
                            title={source.url ? `Open ${source.label}` : source.label}
                          >
                            <SourceIcon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.7} />
                            <span className="truncate">{source.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  );
                })() : null}
                {msg.role === 'assistant' && typeof msg.confidence === 'number' ? (
                  <p className="mt-2 text-[10px] font-medium leading-none text-[#64748B]">
                    Confidence score: {msg.confidence}%
                  </p>
                ) : null}
              </div>
            </div>

            {msg.role === 'assistant' && msg.cards && msg.cards.length > 0 ? (
              <div className="ml-1 mt-3 space-y-3">
                {msg.cards.map((card, index) => {
                  if (card.type === 'event') {
                    return (
                      <TriageEventResultCard
                        key={`${card.event.id || card.event.slug}-${index}`}
                        card={card}
                        onOpenEvent={() => navigate(`/events/${card.event.source}/${card.event.slug}`)}
                        onOpenEvents={() => navigate('/vibe?section=events&events_tab=whatson')}
                      />
                    );
                  }
                  if (card.type === 'address') {
                    return (
                      <TriageAddressInsightCard
                        key={`${card.matchedAddress}-${index}`}
                        card={card}
                        onOpenMap={() => navigate(opensDashboardHome ? '/dashboard?view=map' : '/dashboard', { state: buildAddressMapState(card) })}
                        onOpenLegal={() => navigate(getLegalTabRoute(APP_CONFIG.useSharedResourcesShell))}
                        shareEnabled={shareEnabled}
                      />
                    );
                  }
                  if (card.type === 'expense-summary') {
                    return (
                      <TriageExpenseInsightCard
                        key={`expense-${card.monthLabel}-${index}`}
                        card={card}
                        onOpenExpenseTracker={() => navigate('/household/expenses')}
                      />
                    );
                  }
                  if (card.type === 'public-toilet') {
                    return (
                      <TriagePublicToiletCard
                        key={`${card.id}-${index}`}
                        card={card}
                        onOpenDirections={() => setAssistantDirectionsTarget({
                          label: card.name,
                          lat: card.lat,
                          lng: card.lng,
                        })}
                        onOpenMap={() => navigate(opensDashboardHome ? '/dashboard?view=map' : '/dashboard', { state: buildNearbyToiletsMapState() })}
                      />
                    );
                  }
                  if (card.type === 'timeline-summary') {
                    return (
                      <TriageTimelineInsightCard
                        key={`timeline-${card.currentHome || card.timelineCount}-${index}`}
                        card={card}
                        onOpenTimeline={() => navigate('/profile?tab=timeline')}
                      />
                    );
                  }
                  return null;
                })}
              </div>
            ) : null}

            {msg.role === 'assistant' && msg.cards?.some((card) => card.type === 'public-toilet') ? (
              <button
                type="button"
                onClick={() => navigate(opensDashboardHome ? '/dashboard?view=map' : '/dashboard', { state: buildNearbyToiletsMapState() })}
                className="ml-1 mt-3 inline-flex w-[calc(100%-0.25rem)] items-center justify-center gap-2 rounded-2xl border border-[#99F6E4] bg-[#F0FDFA] px-4 py-3 text-sm font-bold text-[#0F766E] transition hover:bg-[#CCFBF1]"
              >
                <Toilet className="h-4 w-4" strokeWidth={1.8} />
                See all nearby toilets
              </button>
            ) : null}

            {/* Render trigger action buttons below assistant messages */}
            {msg.role === 'assistant' && getVisibleActionTriggers(msg, surface).length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2 ml-1">
                {getVisibleActionTriggers(msg, surface).map((trigger) => {
                  const config = TRIAGE_ACTIONS[trigger];
                  const Icon = triggerIconMap[config.icon];
                  return (
                    <button
                      key={trigger}
                      onClick={() => handleTriggerClick(trigger)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl border transition-all cursor-pointer hover:shadow-sm active:scale-[0.98]"
                      style={{
                        borderColor: `${config.color}30`,
                        backgroundColor: `${config.color}08`,
                        color: config.color,
                      }}
                    >
                      <Icon className="w-3.5 h-3.5" strokeWidth={1.5} />
                      <span className="text-[11px] tracking-wide font-medium">{config.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}

        {assistantDirectionsTarget ? (
          <div className="fixed inset-x-0 bottom-0 z-[2200] border-t border-[#E2E8F0] bg-white px-4 pb-[calc(var(--native-safe-area-bottom)+16px)] pt-4 shadow-2xl shadow-[#0F172A]/20">
            <div className="mx-auto max-w-md">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-bold text-[#0F172A]">Open directions</p>
                  <p className="mt-1 text-sm text-[#64748B]">Choose an app for {assistantDirectionsTarget.label || 'this public toilet'}.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setAssistantDirectionsTarget(null)}
                  className="shrink-0 rounded-full border border-[#E2E8F0] p-2 text-[#64748B] transition hover:bg-[#F8FAFC]"
                  aria-label="Close directions options"
                >
                  <ChevronDown className="h-4 w-4" strokeWidth={1.8} />
                </button>
              </div>
              <div className="space-y-2">
                {ASSISTANT_DIRECTIONS_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => handleOpenAssistantDirectionsApp(option.id)}
                    className="flex w-full items-center justify-between gap-3 rounded-[22px] border border-[#E2E8F0] bg-white px-4 py-3 text-left transition hover:bg-[#F8FAFC]"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#0F172A]">{option.label}</p>
                      <p className="mt-1 text-xs text-[#64748B]">{option.subtitle}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-[#94A3B8]" strokeWidth={1.8} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] px-4 py-3 rounded-2xl rounded-bl-md">
              <p className="text-[9px] tracking-wide uppercase text-[#1E40AF] mb-1 font-medium">
                {assistantLabel}
              </p>
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-[#94A3B8] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-[#94A3B8] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-[#94A3B8] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {showScrollToBottom ? (
        <button
          type="button"
          aria-label="Jump to latest assistant message"
          onClick={() => scrollToConversationBottom('smooth')}
          className={`absolute right-4 z-40 flex h-10 w-10 items-center justify-center rounded-full border border-[#CBD5E1] bg-white/95 text-[#1E40AF] shadow-[0_16px_42px_rgba(15,23,42,0.18)] backdrop-blur-xl transition hover:border-[#1E40AF]/40 hover:bg-[#EFF6FF] active:scale-95 ${
            isArrivalSurface ? 'bottom-[calc(var(--app-keyboard-inset,0px)+5.65rem)]' : 'bottom-24'
          }`}
          title="Jump to latest"
        >
          <ChevronDown className="h-5 w-5" strokeWidth={2.1} />
        </button>
      ) : null}

      {/* Voice-enabled banner */}
      {voiceEnabledForAssistant && (
        <div className="px-4 py-2 bg-[#EE811A]/5 border-t border-[#EE811A]/10">
          <p className="text-[10px] text-center text-[#EE811A] font-medium tracking-wide">
            {`${assistantLabel.toUpperCase()} VOICE ACTIVE — Responses will be spoken aloud`}
          </p>
        </div>
      )}

      {!isArrivalSurface && (
        <>
          {/* Evidence Upload Box */}
          <div className="px-4 py-2 border-t border-[#E2E8F0] bg-[#F8FAFC]">
            <button
              onClick={() => navigate('/profile?action=add-evidence')}
              className="w-full py-2.5 border border-dashed border-[#CBD5E1] rounded-xl text-[#64748B] flex items-center justify-center gap-2 hover:border-[#1E40AF] hover:text-[#1E40AF] transition-colors cursor-pointer"
            >
              <Upload className="w-4 h-4" strokeWidth={1.5} />
              <span className="text-[10px] tracking-wide font-medium">
                Upload Evidence — Screenshots, Documents
              </span>
            </button>
          </div>
        </>
      )}

      {/* Disclaimer */}
      <div className="px-4 pt-1.5 pb-0.5 bg-white">
        <div className="flex items-center justify-center gap-1">
          <Info className="w-3 h-3 text-[#94A3B8] shrink-0" strokeWidth={1.5} />
          <p className="text-[8px] text-[#94A3B8] text-center font-normal leading-tight">
            {isArrivalSurface
              ? isSetuChina
                ? 'AI 内容仅供参考，不构成法律、移民、财务或医疗建议。'
                : `${assistantLabel}'s job is to help you find the right resource.`
              : `${assistantLabel} provides informational guidance and is not a replacement for professional legal advice.`}
          </p>
        </div>
      </div>

      {/* Input */}
      <div
        data-testid="triage-input-bar"
        className={`px-4 py-3 flex items-center gap-3 shrink-0 ${isArrivalSurface ? '' : 'border-t border-[#E2E8F0]'}`}
        style={isArrivalSurface ? { paddingBottom: 'calc(0.75rem + var(--app-keyboard-inset, 0px))' } : undefined}
      >
        <input
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
          }}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder={
            isArrivalSurface
              ? arrivalInputPlaceholder
              : isHoodieExperience
                ? `Ask ${assistantLabel} what's best for your area...`
                : 'Describe your situation...'
          }
          className="flex-1 px-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#1E40AF] focus:ring-2 focus:ring-[#1E40AF]/10 text-sm font-normal"
        />
        <button
          onClick={handleSend}
          disabled={isTyping}
          className="w-10 h-10 bg-[#1E40AF] text-white rounded-xl flex items-center justify-center hover:bg-[#1E3A8A] transition-all shadow-md shadow-[#1E40AF]/20 cursor-pointer disabled:opacity-50"
        >
          <Send className="w-4 h-4" strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}
