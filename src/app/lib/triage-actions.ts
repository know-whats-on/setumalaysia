import { APP_CONFIG } from './app-config';
import { FREE_ELECTRICITY_GUIDE_ROUTE } from './free-electricity-guide';
import {
  getApplicationKitRoute,
  getLegalNavRoute,
  getLegalTabRoute,
  getResourcesJobsRoute,
  getScamCheckerRoute,
  HOODIE_OCCUPATIONS_ROUTE,
  HOODIE_PR_POINTS_ROUTE,
} from './resources-routes';

const useHoodieResourcesShell = APP_CONFIG.useSharedResourcesShell;
const isWolliVariant = APP_CONFIG.variant === 'wheres_wolli';
const genericResourcesRoute = APP_CONFIG.showSetuFeatures
  ? APP_CONFIG.resourcesRoute
  : getLegalNavRoute(useHoodieResourcesShell);
const primaryResourcesRoute = APP_CONFIG.showSetuFeatures
  ? APP_CONFIG.resourcesRoute
  : getResourcesJobsRoute(useHoodieResourcesShell);

type TriageActionConfig = {
  label: string;
  route: string;
  icon:
    | 'address'
    | 'evidence'
    | 'legal'
    | 'scam'
    | 'maintenance'
    | 'health'
    | 'map'
    | 'toilet'
    | 'vibe'
    | 'events'
    | 'networking'
    | 'plans'
    | 'profile'
    | 'timeline'
    | 'evidence-library'
    | 'arrival'
    | 'alerts'
    | 'fuel'
    | 'groceries'
    | 'games'
    | 'free-power'
    | 'application-kit'
    | 'scam-checker'
    | 'sponsor-companies'
    | 'pr-points'
    | 'visa-occupations'
    | 'household'
    | 'expenses';
  color: string;
};

export const TRIAGE_ACTIONS = {
  ADD_ADDRESS: {
    label: 'Add Address',
    route: '/profile?action=add-address',
    icon: 'address',
    color: '#16A34A',
  },
  UPLOAD_EVIDENCE: {
    label: 'Upload Evidence',
    route: '/profile?action=add-evidence',
    icon: 'evidence',
    color: '#1E40AF',
  },
  VIEW_RESOURCES: {
    label: isWolliVariant ? 'Open Resources' : APP_CONFIG.experienceMode === 'hoodie' ? 'Open Jobs' : 'View Legal Resources',
    route: primaryResourcesRoute,
    icon: 'legal',
    color: isWolliVariant ? '#008A8C' : '#1E40AF',
  },
  OPEN_RESOURCES: {
    label: 'Open Resources',
    route: genericResourcesRoute,
    icon: 'legal',
    color: isWolliVariant ? '#008A8C' : '#1E40AF',
  },
  REPORT_SCAM: {
    label: 'Report Scam',
    route: '/dashboard?action=report&category=scam',
    icon: 'scam',
    color: '#B91C1C',
  },
  REPORT_MAINTENANCE: {
    label: 'Report Maintenance',
    route: '/dashboard?action=report&category=maintenance',
    icon: 'maintenance',
    color: '#EA580C',
  },
  TAKE_HEALTH_CHECK: {
    label: 'Take Health Check',
    route: '/profile?action=health-check',
    icon: 'health',
    color: '#1E40AF',
  },
  OPEN_MAP: {
    label: 'Open Map',
    route: '/dashboard',
    icon: 'map',
    color: '#0F766E',
  },
  FIND_NEARBY_TOILET: {
    label: 'Find Toilet Nearby',
    route: '/dashboard',
    icon: 'toilet',
    color: '#0F766E',
  },
  OPEN_VIBE: {
    label: isWolliVariant ? 'Open Explore' : 'Open Vibe',
    route: '/vibe',
    icon: 'vibe',
    color: isWolliVariant ? '#0D3B66' : '#7C3AED',
  },
  OPEN_EVENTS: {
    label: isWolliVariant ? 'Open What’s On' : 'Open Events',
    route: '/vibe?section=events&events_tab=whatson',
    icon: 'events',
    color: '#0F766E',
  },
  OPEN_PLANS: {
    label: 'Open Plans',
    route: '/vibe?section=events&events_tab=plans',
    icon: 'plans',
    color: '#4338CA',
  },
  OPEN_NETWORKING_CARDS: {
    label: 'Open My Network',
    route: '/vibe?section=events&events_tab=networking&networking_view=cards',
    icon: 'networking',
    color: '#0F766E',
  },
  OPEN_PROFILE: {
    label: isWolliVariant ? 'Open Me' : 'Open Profile',
    route: '/profile',
    icon: 'profile',
    color: '#0F172A',
  },
  OPEN_HOUSEHOLD: {
    label: 'Open Household',
    route: '/profile?tab=household',
    icon: 'household',
    color: '#1E40AF',
  },
  OPEN_HOUSEHOLD_BILLS: {
    label: 'Open Bills',
    route: '/profile?tab=household&household_tab=bills',
    icon: 'household',
    color: '#1E40AF',
  },
  OPEN_EXPENSE_TRACKER: {
    label: 'Open Expense Tracker',
    route: '/household/expenses',
    icon: 'expenses',
    color: '#0F766E',
  },
  OPEN_HOUSEHOLD_CHORES: {
    label: 'Open Chores',
    route: '/profile?tab=household&household_tab=chores',
    icon: 'household',
    color: '#0F766E',
  },
  OPEN_HOUSEHOLD_MEMBERS: {
    label: 'Open Members',
    route: '/profile?tab=household&household_tab=members',
    icon: 'household',
    color: '#475569',
  },
  OPEN_HOUSEHOLD_ACTIVITY: {
    label: 'Open Household Activity',
    route: '/profile?tab=household&household_tab=activity',
    icon: 'household',
    color: '#7C3AED',
  },
  OPEN_MY_PLANS: {
    label: 'Open My Plans',
    route: '/profile?tab=plans',
    icon: 'plans',
    color: '#4338CA',
  },
  OPEN_MY_ITINERARY: {
    label: 'Open My Itinerary',
    route: '/vibe?section=events&events_tab=plans&plans_view=itinerary',
    icon: 'plans',
    color: '#0F766E',
  },
  OPEN_TIMELINE: {
    label: 'Open Timeline',
    route: '/profile?tab=timeline',
    icon: 'timeline',
    color: '#1D4ED8',
  },
  OPEN_EVIDENCE: {
    label: 'Open Evidence',
    route: '/profile?tab=evidence',
    icon: 'evidence-library',
    color: '#1E40AF',
  },
  OPEN_LEGAL: {
    label: 'Open Legal',
    route: getLegalTabRoute(useHoodieResourcesShell),
    icon: 'legal',
    color: '#1E40AF',
  },
  OPEN_APPLICATION_KIT: {
    label: 'Open Application Kit',
    route: getApplicationKitRoute(useHoodieResourcesShell),
    icon: 'application-kit',
    color: '#1E40AF',
  },
  OPEN_SPONSOR_COMPANIES: {
    label: 'Open Sponsor Companies',
    route: getResourcesJobsRoute(useHoodieResourcesShell),
    icon: 'sponsor-companies',
    color: '#0F766E',
  },
  OPEN_PR_CALCULATOR: {
    label: 'Open PR Calculator',
    route: useHoodieResourcesShell ? HOODIE_PR_POINTS_ROUTE : getLegalTabRoute(false),
    icon: 'pr-points',
    color: '#4338CA',
  },
  OPEN_VISA_OCCUPATIONS: {
    label: 'Open Visa Occupations',
    route: useHoodieResourcesShell ? HOODIE_OCCUPATIONS_ROUTE : getLegalTabRoute(false),
    icon: 'visa-occupations',
    color: '#475569',
  },
  OPEN_SCAM_CHECKER: {
    label: 'Open Scam Checker',
    route: getScamCheckerRoute(useHoodieResourcesShell),
    icon: 'scam-checker',
    color: '#B91C1C',
  },
  OPEN_ARRIVAL: {
    label: `Open ${APP_CONFIG.assistantName}`,
    route: '/arrival',
    icon: 'arrival',
    color: '#CA8A04',
  },
  OPEN_ALERTS: {
    label: isWolliVariant ? 'Open News' : 'Open Alerts',
    route: '/vibe?section=alerts',
    icon: 'alerts',
    color: '#DC2626',
  },
  OPEN_FUEL: {
    label: 'Open Fuel Prices',
    route: '/fuel',
    icon: 'fuel',
    color: '#CA8A04',
  },
  OPEN_GROCERIES: {
    label: 'Open Price Compare',
    route: '/shopping?retailer=compare',
    icon: 'groceries',
    color: '#16A34A',
  },
  OPEN_GAMES: {
    label: 'Play Games',
    route: '/games',
    icon: 'games',
    color: '#F04444',
  },
  OPEN_FREE_ELECTRICITY_GUIDE: {
    label: 'Free electricity guide',
    route: FREE_ELECTRICITY_GUIDE_ROUTE,
    icon: 'free-power',
    color: '#CA8A04',
  },
} as const satisfies Record<string, TriageActionConfig>;

export type TriageActionType = keyof typeof TRIAGE_ACTIONS;

const triggerPattern = Object.keys(TRIAGE_ACTIONS).join('|');
export const TRIAGE_TRIGGER_REGEX = new RegExp(`\\[TRIGGER:(${triggerPattern})\\]`, 'g');

export function parseTriageTriggers(text: string): { cleanText: string; triggers: TriageActionType[] } {
  const triggers: TriageActionType[] = [];
  let match: RegExpExecArray | null;
  const regex = new RegExp(TRIAGE_TRIGGER_REGEX.source, 'g');
  while ((match = regex.exec(text)) !== null) {
    const trigger = match[1] as TriageActionType;
    if (!triggers.includes(trigger)) {
      triggers.push(trigger);
    }
  }
  const cleanText = text.replace(TRIAGE_TRIGGER_REGEX, '').trim();
  return { cleanText, triggers };
}
