import { buildHouseholdRoute } from './household-route';
import {
  HOODIE_OCCUPATIONS_ROUTE,
  HOODIE_PR_POINTS_ROUTE,
  getApplicationKitRoute,
  getLegalTabRoute,
  getResourcesJobsRoute,
  getScamCheckerRoute,
} from './resources-routes';
import { APP_CONFIG } from './app-config';

export type AssistantNavMenuId = 'explore' | 'vibe' | 'resources' | 'household';

export type AssistantNavActionId =
  | 'explore.fuel'
  | 'explore.groceries'
  | 'explore.transport'
  | 'vibe.guides'
  | 'vibe.stats'
  | 'vibe.events'
  | 'vibe.plans'
  | 'vibe.alerts'
  | 'resources.scam-checker'
  | 'resources.application-kit'
  | 'resources.sponsor-companies'
  | 'resources.pr-calculator'
  | 'resources.skilled-occupation-list'
  | 'resources.legal'
  | 'household.bills'
  | 'household.chores'
  | 'household.timeline'
  | 'household.profile';

export type AssistantNavActionTarget = {
  route: string;
  openTransportMenu?: boolean;
};

function withNextParam(route: string, next: string) {
  const parsed = new URL(route, 'https://hoodie.local');
  parsed.searchParams.set('next', next);
  return `${parsed.pathname}${parsed.search}`;
}

export function getAssistantNavActionTarget(action: AssistantNavActionId): AssistantNavActionTarget {
  const useHoodieResourcesShell = APP_CONFIG.useSharedResourcesShell;

  switch (action) {
    case 'explore.fuel':
      return { route: '/fuel' };
    case 'explore.groceries':
      return { route: '/shopping?retailer=compare' };
    case 'explore.transport':
      return { route: '/dashboard', openTransportMenu: true };
    case 'vibe.guides':
      return { route: '/vibe?section=vibe&vibe_tab=my-hood' };
    case 'vibe.stats':
      return { route: '/vibe?section=vibe&vibe_tab=suburb-score' };
    case 'vibe.events':
      return { route: '/vibe?section=events&events_tab=whatson' };
    case 'vibe.plans':
      return { route: '/vibe?section=events&events_tab=plans' };
    case 'vibe.alerts':
      return { route: '/vibe?section=alerts' };
    case 'resources.scam-checker':
      return { route: getScamCheckerRoute(useHoodieResourcesShell) };
    case 'resources.application-kit':
      return { route: getApplicationKitRoute(useHoodieResourcesShell) };
    case 'resources.sponsor-companies':
      return { route: getResourcesJobsRoute(useHoodieResourcesShell) };
    case 'resources.pr-calculator':
      return { route: useHoodieResourcesShell ? HOODIE_PR_POINTS_ROUTE : getLegalTabRoute(false) };
    case 'resources.skilled-occupation-list':
      return { route: useHoodieResourcesShell ? HOODIE_OCCUPATIONS_ROUTE : getLegalTabRoute(false) };
    case 'resources.legal':
      return { route: getLegalTabRoute(useHoodieResourcesShell) };
    case 'household.bills':
      return {
        route: withNextParam(buildHouseholdRoute({ sectionTab: 'bills' }), 'household-bills'),
      };
    case 'household.chores':
      return {
        route: withNextParam(buildHouseholdRoute({ sectionTab: 'chores' }), 'household-chores'),
      };
    case 'household.timeline':
      return { route: '/profile?tab=timeline' };
    case 'household.profile':
      return { route: '/profile?tab=overview' };
    default:
      return { route: '/arrival' };
  }
}
