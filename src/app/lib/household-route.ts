export type HouseholdRouteSectionTab = 'overview' | 'rules' | 'bills' | 'chores' | 'members' | 'activity';
export type HouseholdRouteSource = 'push' | 'imessage' | null;
export type HouseholdInviteIntent = 'accept' | 'decline' | null;

export interface HouseholdRouteState {
  inviteToken: string | null;
  inviteIntent: HouseholdInviteIntent;
  sectionTab: HouseholdRouteSectionTab;
  billId: string;
  paymentId: string;
  choreId: string;
  notificationId: string;
  source: HouseholdRouteSource;
}

const householdSectionTabs: HouseholdRouteSectionTab[] = ['overview', 'rules', 'bills', 'chores', 'members', 'activity'];

function normalizeRouteValue(value: string | null | undefined) {
  return String(value || '').trim();
}

function normalizeInviteIntent(value: string | null | undefined): HouseholdInviteIntent {
  return value === 'accept' || value === 'decline' ? value : null;
}

function normalizeRouteSource(value: string | null | undefined): HouseholdRouteSource {
  return value === 'push' || value === 'imessage' ? value : null;
}

function inferSectionTab(params: {
  rawSectionTab: string;
  billId: string;
  paymentId: string;
  choreId: string;
  notificationId: string;
}) {
  if (householdSectionTabs.includes(params.rawSectionTab as HouseholdRouteSectionTab)) {
    return params.rawSectionTab as HouseholdRouteSectionTab;
  }
  if (params.billId || params.paymentId) return 'bills';
  if (params.choreId) return 'chores';
  if (params.notificationId) return 'activity';
  return 'overview';
}

export function parseHouseholdRouteParams(searchParams: URLSearchParams): HouseholdRouteState {
  const billId = normalizeRouteValue(searchParams.get('bill_id'));
  const paymentId = normalizeRouteValue(searchParams.get('payment_id'));
  const choreId = normalizeRouteValue(searchParams.get('chore_id'));
  const notificationId = normalizeRouteValue(searchParams.get('notification_id'));

  return {
    inviteToken: normalizeRouteValue(searchParams.get('invite')) || null,
    inviteIntent: normalizeInviteIntent(searchParams.get('invite_intent')),
    sectionTab: inferSectionTab({
      rawSectionTab: normalizeRouteValue(searchParams.get('household_tab')),
      billId,
      paymentId,
      choreId,
      notificationId,
    }),
    billId,
    paymentId,
    choreId,
    notificationId,
    source: normalizeRouteSource(searchParams.get('household_source')),
  };
}

export function parseHouseholdRoute(route: string): HouseholdRouteState {
  try {
    const parsed = new URL(route, 'https://hoodie.local');
    return parseHouseholdRouteParams(parsed.searchParams);
  } catch {
    return {
      inviteToken: null,
      inviteIntent: null,
      sectionTab: 'overview',
      billId: '',
      paymentId: '',
      choreId: '',
      notificationId: '',
      source: null,
    };
  }
}

export function buildHouseholdRoute(params?: {
  sectionTab?: HouseholdRouteSectionTab;
  inviteToken?: string | null;
  inviteIntent?: HouseholdInviteIntent;
  billId?: string | null;
  paymentId?: string | null;
  choreId?: string | null;
  notificationId?: string | null;
  source?: HouseholdRouteSource;
}) {
  const searchParams = new URLSearchParams();
  searchParams.set('tab', 'household');

  const billId = normalizeRouteValue(params?.billId);
  const paymentId = normalizeRouteValue(params?.paymentId);
  const choreId = normalizeRouteValue(params?.choreId);
  const notificationId = normalizeRouteValue(params?.notificationId);
  const sectionTab = inferSectionTab({
    rawSectionTab: normalizeRouteValue(params?.sectionTab),
    billId,
    paymentId,
    choreId,
    notificationId,
  });

  if (sectionTab !== 'overview') {
    searchParams.set('household_tab', sectionTab);
  }

  const inviteToken = normalizeRouteValue(params?.inviteToken);
  if (inviteToken) {
    searchParams.set('invite', inviteToken);
  }

  if (params?.inviteIntent) {
    searchParams.set('invite_intent', params.inviteIntent);
  }

  if (billId) {
    searchParams.set('bill_id', billId);
  }

  if (paymentId) {
    searchParams.set('payment_id', paymentId);
  }

  if (choreId) {
    searchParams.set('chore_id', choreId);
  }

  if (notificationId) {
    searchParams.set('notification_id', notificationId);
  }

  if (params?.source) {
    searchParams.set('household_source', params.source);
  }

  return `/profile?${searchParams.toString()}`;
}

export function getHouseholdFocusTargetId(state: Pick<HouseholdRouteState, 'billId' | 'paymentId' | 'choreId' | 'notificationId'>) {
  if (state.notificationId) return `notification:${state.notificationId}`;
  if (state.paymentId) return `payment:${state.paymentId}`;
  if (state.billId) return `bill:${state.billId}`;
  if (state.choreId) return `chore:${state.choreId}`;
  return '';
}
