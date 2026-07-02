import type { RentalEntry } from './mock-data';

export type HouseholdStatus = 'active' | 'archived';
export type HouseholdMemberRole = 'owner' | 'member';
export type HouseholdMemberStatus = 'pending' | 'active' | 'declined' | 'left' | 'removed';
export type HouseholdBillStatus = 'open' | 'partial' | 'pending_confirmation' | 'settled' | 'overdue';
export type HouseholdSplitType = 'equal' | 'custom' | 'shares';
export type HouseholdBillParticipantType = 'household_member' | 'hoodie_friend';
export type HouseholdBillScope = 'household' | 'shared' | 'personal';
export type HouseholdPaymentStatus = 'pending_confirmation' | 'confirmed';
export type HouseholdAssignmentMode = 'assigned' | 'rotation' | 'claimable';
export type HouseholdCadence = 'one_off' | 'daily' | 'weekly' | 'fortnightly' | 'monthly';
export type HouseholdChoreStatus = 'open' | 'completed' | 'overdue';
export type HouseholdNotificationTemplateType = 'custom' | 'bill_reminder' | 'chore_reminder' | 'house_update' | 'need_response' | 'gratitude';
export type HouseholdEmailTemplateType = HouseholdNotificationTemplateType;
export type HouseholdRulesSignatureMethod = 'typed_initials' | 'drawn_signature';
export type HouseholdNotificationOriginType =
  | 'manual'
  | 'invite_received'
  | 'house_rules_changed'
  | 'bill_created'
  | 'bill_updated'
  | 'payment_marked'
  | 'payment_confirmed'
  | 'chore_created'
  | 'chore_updated'
  | 'chore_completed';

export interface HouseholdMediaAttachment {
  storage_path: string;
  file_url: string;
  file_type: string;
  file_size: number;
  original_name: string;
}

export interface HouseholdAddressSnapshot {
  timeline_entry_id: string;
  address: string;
  display_address: string;
  unit_number: string;
  suburb: string;
  state: string;
  postcode: string;
  is_current: boolean;
}

export interface HouseholdMember {
  id: string;
  email_normalized: string;
  display_name: string;
  role: HouseholdMemberRole;
  status: HouseholdMemberStatus;
  invited_by_email?: string;
  invited_at?: string;
  responded_at?: string;
  joined_at?: string;
  removed_at?: string;
  invite_token?: string;
}

export interface HouseholdInvite {
  id: string;
  token: string;
  household_id: string;
  household_name: string;
  household_address_label: string;
  recipient_email?: string;
  recipient_label?: string;
  sender_email: string;
  sender_display_name: string;
  transport?: 'share_link' | 'hoodie_account';
  share_path?: string;
  share_url?: string;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled' | 'expired';
  expires_at: string;
  created_at: string;
  house_rules_version?: HouseholdRulesVersion;
}

export interface HouseholdRulesSignaturePoint {
  x: number;
  y: number;
}

export interface HouseholdRulesSignatureStroke {
  points: HouseholdRulesSignaturePoint[];
}

export interface HouseholdRulesSignature {
  method: HouseholdRulesSignatureMethod;
  typed_value?: string;
  strokes?: HouseholdRulesSignatureStroke[];
}

export interface HouseholdRuleItem {
  id: string;
  text: string;
  enabled: boolean;
  order: number;
}

export interface HouseholdRuleSection {
  id: string;
  title: string;
  description: string;
  order: number;
  items: HouseholdRuleItem[];
}

export interface HouseholdRulesVersion {
  id: string;
  version_number: number;
  title: string;
  description: string;
  sections: HouseholdRuleSection[];
  created_at: string;
  created_by_email: string;
  rules_hash: string;
  change_note?: string;
}

export interface HouseholdRulesAcknowledgement {
  id: string;
  household_id: string;
  version_id: string;
  member_email: string;
  member_display_name: string;
  checked_item_ids: string[];
  signature: HouseholdRulesSignature;
  signed_at: string;
  invite_token?: string;
  item_count: number;
  rules_hash: string;
}

export interface HouseholdRulesState {
  current_version_id: string;
  versions: HouseholdRulesVersion[];
  acknowledgements: HouseholdRulesAcknowledgement[];
  owner_setup_completed_version_id?: string;
}

export interface HouseholdRulesDraft {
  title: string;
  description: string;
  sections: HouseholdRuleSection[];
  change_note?: string;
}

export interface HouseholdRulesAcknowledgementInput {
  version_id: string;
  checked_item_ids: string[];
  signature: HouseholdRulesSignature;
}

export interface HouseholdBillSplit {
  id: string;
  member_email: string;
  participant_type?: HouseholdBillParticipantType;
  participant_display_name?: string;
  amount_owed: number;
  amount_paid: number;
  shares: number;
  status: HouseholdBillStatus;
  last_payment_at?: string;
}

export interface HouseholdPayment {
  id: string;
  split_id: string;
  payer_email: string;
  payee_email: string;
  recorded_by_email?: string;
  amount: number;
  note: string;
  status: HouseholdPaymentStatus;
  created_at: string;
  confirmed_at?: string;
  attachments?: HouseholdMediaAttachment[];
}

export interface HouseholdBill {
  id: string;
  household_id?: string;
  bill_scope?: HouseholdBillScope;
  app_variant?: 'ghar' | 'burb_mate';
  title: string;
  category: string;
  amount_total: number;
  due_at: string;
  created_by_email: string;
  paid_by_email: string;
  split_type: HouseholdSplitType;
  notes: string;
  status: HouseholdBillStatus;
  email_members: boolean;
  created_at: string;
  updated_at?: string;
  splits: HouseholdBillSplit[];
  payments: HouseholdPayment[];
  attachments?: HouseholdMediaAttachment[];
}

export interface HouseholdBillContact {
  email_normalized: string;
  display_name: string;
  last_used_at: string;
  last_bill_id?: string;
  use_count?: number;
}

export interface HouseholdChore {
  id: string;
  title: string;
  cadence: HouseholdCadence;
  assignment_mode: HouseholdAssignmentMode;
  assigned_to_email: string;
  rotation_order: string[];
  current_rotation_index: number;
  due_at: string;
  proof_required?: boolean;
  status: HouseholdChoreStatus;
  notes: string;
  created_by_email: string;
  created_at: string;
  last_completed_by_email?: string;
  last_completed_at?: string;
  completion_note?: string;
  attachments?: HouseholdMediaAttachment[];
  completion_attachments?: HouseholdMediaAttachment[];
}

export interface HouseholdNotification {
  id: string;
  sender_email: string;
  recipient_emails: string[];
  title: string;
  body: string;
  template_type: HouseholdNotificationTemplateType;
  origin_type?: HouseholdNotificationOriginType;
  entity_type?: string;
  entity_id?: string;
  sent_at: string;
  delivery_channel?: 'push';
  deep_link?: string;
  targeted_recipient_count?: number;
  delivered_recipient_count?: number;
  delivered_device_count?: number;
  delivery_status?: 'queued' | 'no_devices' | 'dispatched' | 'partial';
  delivery_mode?: 'webhook' | 'fcm' | 'none';
  delivery_error?: string;
  metadata?: Record<string, unknown>;
}

export type HouseholdEmailNotification = HouseholdNotification;

export interface HouseholdActivityEvent {
  id: string;
  actor_email: string;
  event_type: string;
  entity_type: string;
  entity_id: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface HouseholdRecord {
  id: string;
  name: string;
  status: HouseholdStatus;
  app_variant: 'ghar' | 'burb_mate';
  created_by_email: string;
  created_at: string;
  updated_at?: string;
  address_snapshot: HouseholdAddressSnapshot;
  members: HouseholdMember[];
  invites?: HouseholdInvite[];
  bills: HouseholdBill[];
  chores: HouseholdChore[];
  house_rules?: HouseholdRulesState;
  notifications?: HouseholdNotification[];
  email_notifications?: HouseholdNotification[];
  activity: HouseholdActivityEvent[];
}

export interface HouseholdDashboardResponse {
  household: HouseholdRecord | null;
  pending_invites: HouseholdInvite[];
  shared_bills?: HouseholdBill[];
  bill_contacts?: HouseholdBillContact[];
}

export interface HouseholdCreateResponse {
  household: HouseholdRecord;
  invite?: HouseholdInvite;
  share_url?: string;
  share_path?: string;
}

export interface HouseholdAttentionSummary {
  youOwe: number;
  youreOwed: number;
  billsDue: number;
  choresDue: number;
  choresToday: number;
  pendingInvites: number;
  totalAttentionCount: number;
}

export type HouseholdSpendScope = 'personal' | 'household';
export type HouseholdSpendRange = 'week' | 'month';

export interface HouseholdSpendCategoryTotal {
  category: string;
  amount: number;
}

export interface HouseholdSpendSummary {
  scope: HouseholdSpendScope;
  range: HouseholdSpendRange;
  total: number;
  billCount: number;
  categories: HouseholdSpendCategoryTotal[];
}

export interface HouseholdExpenseTransaction {
  id: string;
  bill_id: string;
  source: HouseholdBillScope;
  title: string;
  category: string;
  amount: number;
  amount_total: number;
  expense_date: string;
  due_at: string;
  created_at: string;
  paid_by_email: string;
  created_by_email: string;
  status: HouseholdBillStatus;
}

export interface HouseholdExpenseMonthlyTrendPoint {
  month: string;
  label: string;
  total: number;
  transactionCount: number;
}

export interface HouseholdExpenseYearComparison {
  month: string;
  comparison_month: string;
  current_total: number;
  comparison_total: number;
  delta: number;
  percent_delta: number | null;
  has_comparison: boolean;
}

export interface HouseholdExpenseGoals {
  month: string;
  total_monthly_cap: number;
  category_goals: Record<string, number>;
  updated_at?: string;
}

export interface HouseholdExpenseGoalProgressItem {
  category: string;
  spent: number;
  goal: number;
  remaining: number;
  percent: number;
}

export interface HouseholdExpenseGoalProgress {
  month: string;
  totalSpent: number;
  totalGoal: number;
  totalRemaining: number;
  totalPercent: number;
  categories: HouseholdExpenseGoalProgressItem[];
}

export interface HouseholdExpenseReportData {
  generated_at: string;
  report_month: string;
  viewer_email: string;
  household_name: string;
  household_week: HouseholdSpendSummary;
  household_month: HouseholdSpendSummary;
  household_transactions: HouseholdExpenseTransaction[];
  household_mom_trend: HouseholdExpenseMonthlyTrendPoint[];
  household_yoy_comparison: HouseholdExpenseYearComparison;
  personal_week: HouseholdSpendSummary;
  personal_month: HouseholdSpendSummary;
  personal_transactions: HouseholdExpenseTransaction[];
  personal_mom_trend: HouseholdExpenseMonthlyTrendPoint[];
  personal_yoy_comparison: HouseholdExpenseYearComparison;
  personal_goal_progress: HouseholdExpenseGoalProgress;
}

export interface HouseholdExpenseInsights {
  headline: string;
  executive_summary: string;
  key_observations: string[];
  advice: string[];
  goal_notes: string[];
  generated_at: string;
  fallback?: boolean;
}

export interface GetHouseholdSpendSummaryParams {
  household: HouseholdRecord | null;
  viewerEmail: string;
  sharedBills?: HouseholdBill[];
  scope: HouseholdSpendScope;
  range: HouseholdSpendRange;
  now?: Date;
  startDate?: Date;
  endDateExclusive?: Date;
}

export const DEFAULT_HOUSEHOLD_RULE_SECTIONS: HouseholdRuleSection[] = [
  {
    id: 'cleaning-chores',
    title: 'Cleaning and chores',
    description: 'Everyone keeps the home livable by following agreed cleaning duties and schedules.',
    order: 0,
    items: [
      { id: 'cleaning-follow-schedule', text: 'I will complete each assigned chore by the scheduled date and time recorded in the household roster.', enabled: true, order: 0 },
      { id: 'cleaning-reset-messes', text: 'I will clean personal messes in kitchens, bathrooms, and shared spaces immediately after use, or by the end of the same day if immediate cleaning is not possible.', enabled: true, order: 1 },
      { id: 'cleaning-rubbish-roster', text: 'I will take out rubbish and recycling on my rostered day, or within 12 hours when a shared bin is full and I am the rostered person.', enabled: true, order: 2 },
    ],
  },
  {
    id: 'bills-payments',
    title: 'Bills and shared payments',
    description: 'Everyone pays agreed shared costs clearly and on time.',
    order: 1,
    items: [
      { id: 'bills-pay-on-time', text: 'I will pay rent, bills, and approved shared expenses by the due date shown in Hoodie or in the written household record.', enabled: true, order: 0 },
      { id: 'bills-review-splits', text: 'I will raise any dispute about a bill split within 48 hours of the bill being posted and before the payment due date.', enabled: true, order: 1 },
      { id: 'bills-share-evidence', text: 'When asked, I will attach receipts or payment evidence for shared expenses within 24 hours of the request.', enabled: true, order: 2 },
    ],
  },
  {
    id: 'shared-spaces',
    title: 'Shared spaces',
    description: 'Shared spaces stay usable, safe, and respectful for everyone.',
    order: 2,
    items: [
      { id: 'spaces-restore-after-use', text: 'I will leave shared spaces ready for the next person before I leave the space, or by the end of the same day if extra cleaning is needed.', enabled: true, order: 0 },
      { id: 'spaces-store-belongings', text: 'I will not leave personal belongings in shared spaces overnight unless the household agrees in writing.', enabled: true, order: 1 },
      { id: 'spaces-report-damage', text: 'I will report damage, hazards, or maintenance issues within 24 hours of noticing them, and urgent safety issues immediately.', enabled: true, order: 2 },
    ],
  },
  {
    id: 'guests-noise',
    title: 'Guests and noise',
    description: 'Guests and noise are handled with notice, consent, and care.',
    order: 3,
    items: [
      { id: 'guests-give-notice', text: 'I will give at least 24 hours notice before bringing a guest into the household, unless all affected housemates agree to shorter notice.', enabled: true, order: 0 },
      { id: 'guests-overnight-consent', text: 'I will get prior household agreement before any guest stays overnight.', enabled: true, order: 1 },
      { id: 'guests-respect-quiet', text: 'I will keep quiet hours from 10 PM to 7 AM Sunday to Thursday, and from 11 PM to 8 AM Friday to Saturday.', enabled: true, order: 2 },
      { id: 'guests-responsible', text: 'I am responsible for my guests, including their cleanup, noise, and any damage they cause before they leave.', enabled: true, order: 3 },
    ],
  },
  {
    id: 'belongings-appliances',
    title: 'Belongings and appliances',
    description: 'Personal items and shared appliances are used only with respect and consent.',
    order: 4,
    items: [
      { id: 'belongings-ask-first', text: 'I will ask permission each time before using another housemate\'s personal belongings, food, appliances, or supplies.', enabled: true, order: 0 },
      { id: 'belongings-return-clean', text: 'I will return borrowed items clean and in the same condition within 24 hours, unless a different return time is agreed in writing.', enabled: true, order: 1 },
      { id: 'belongings-repair-replace', text: 'If I damage or lose something, I will tell the owner on the same day and repair, replace, or reimburse it within 7 days unless another written plan is agreed.', enabled: true, order: 2 },
    ],
  },
  {
    id: 'safety-access',
    title: 'Safety and access',
    description: 'The household stays secure, private, and safe.',
    order: 5,
    items: [
      { id: 'safety-locks-keys', text: 'I will lock entry points when I leave the home and before sleeping, unless another housemate is actively using that entry.', enabled: true, order: 0 },
      { id: 'safety-no-unauthorised-access', text: 'I will not share, copy, or lend keys, access cards, remotes, or access codes without written household agreement.', enabled: true, order: 1 },
      { id: 'safety-emergency-respect', text: 'I will keep smoke alarms, emergency exits, utilities, and safety equipment unobstructed and report faults immediately.', enabled: true, order: 2 },
    ],
  },
  {
    id: 'communication-conflict',
    title: 'Communication and conflict',
    description: 'Issues are raised early and handled respectfully.',
    order: 6,
    items: [
      { id: 'communication-raise-early', text: 'I will raise household issues within 48 hours of noticing them, unless there is an urgent safety issue that must be raised immediately.', enabled: true, order: 0 },
      { id: 'communication-respectful', text: 'I will communicate respectfully and respond to direct household messages within 24 hours where practical.', enabled: true, order: 1 },
      { id: 'communication-use-records', text: 'I understand signed rules, bills, chores, receipts, activity records, and household messages may be used to clarify future disputes.', enabled: true, order: 2 },
    ],
  },
  {
    id: 'moving-out',
    title: 'Moving out',
    description: 'Leaving the household is handled with notice and shared responsibilities settled.',
    order: 7,
    items: [
      { id: 'moveout-give-notice', text: 'I will give at least 14 days written notice before moving out, unless the lease, law, or a written household agreement requires a longer notice period.', enabled: true, order: 0 },
      { id: 'moveout-settle-balances', text: 'I will settle due bills, assigned chores, keys, and shared responsibilities before my last day in the household.', enabled: true, order: 1 },
      { id: 'moveout-leave-clean', text: 'I will clean my room and affected shared areas, remove my belongings, and return keys or access devices by my move-out day unless otherwise agreed in writing.', enabled: true, order: 2 },
    ],
  },
];

export const HOUSEHOLD_BILL_CATEGORY_OPTIONS = [
  'Rent',
  'Utilities',
  'Internet',
  'Groceries',
  'Food',
  'Entertainment',
] as const;

export type HouseholdBillCategoryOption = (typeof HOUSEHOLD_BILL_CATEGORY_OPTIONS)[number];

const householdBillCategoryMap = new Map<string, HouseholdBillCategoryOption>(
  HOUSEHOLD_BILL_CATEGORY_OPTIONS.map((category) => [category.toLowerCase(), category] as const),
);

const householdExpenseCategoryColorMap = new Map<string, string>([
  ['rent', '#4F46E5'],
  ['utilities', '#F59E0B'],
  ['internet', '#06B6D4'],
  ['groceries', '#22C55E'],
  ['food', '#F97316'],
  ['entertainment', '#EC4899'],
  ['transport', '#14B8A6'],
  ['other', '#8B5CF6'],
  ['uncategorized', '#64748B'],
]);

const householdExpenseFallbackColors = [
  '#2563EB',
  '#DC2626',
  '#16A34A',
  '#9333EA',
  '#EA580C',
  '#0891B2',
  '#BE123C',
  '#0F766E',
];

function getStableColorIndex(value: string) {
  let hash = 0;
  String(value || '').split('').forEach((char) => {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  });
  return hash % householdExpenseFallbackColors.length;
}

export function normalizeHouseholdEmail(value: string) {
  return String(value || '').trim().toLowerCase();
}

export function normalizeHouseholdSignerName(value: string) {
  return String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function cloneHouseholdRuleSections(sections: HouseholdRuleSection[]) {
  return sections.map((section, sectionIndex) => ({
    id: String(section.id || `section-${sectionIndex + 1}`).trim(),
    title: String(section.title || '').trim() || `Section ${sectionIndex + 1}`,
    description: String(section.description || '').trim(),
    order: Number.isFinite(Number(section.order)) ? Number(section.order) : sectionIndex,
    items: (section.items || []).map((item, itemIndex) => ({
      id: String(item.id || `${section.id || `section-${sectionIndex + 1}`}-item-${itemIndex + 1}`).trim(),
      text: String(item.text || '').trim(),
      enabled: item.enabled !== false,
      order: Number.isFinite(Number(item.order)) ? Number(item.order) : itemIndex,
    })).filter((item) => item.id && item.text),
  })).filter((section) => section.id && section.title && section.items.length > 0);
}

export function normalizeHouseholdRuleSections(sections: HouseholdRuleSection[]) {
  return cloneHouseholdRuleSections(sections)
    .sort((left, right) => left.order - right.order)
    .map((section, sectionIndex) => ({
      ...section,
      order: sectionIndex,
      items: [...section.items]
        .sort((left, right) => left.order - right.order)
        .map((item, itemIndex) => ({
          ...item,
          order: itemIndex,
        })),
    }));
}

function stableStringifyHouseholdRules(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringifyHouseholdRules(entry)).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    return `{${Object.keys(value as Record<string, unknown>)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringifyHouseholdRules((value as Record<string, unknown>)[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

export function getHouseholdRulesHash(version: Pick<HouseholdRulesVersion, 'title' | 'description' | 'sections'>) {
  const stable = stableStringifyHouseholdRules({
    title: String(version.title || '').trim(),
    description: String(version.description || '').trim(),
    sections: normalizeHouseholdRuleSections(version.sections || []),
  });
  let hash = 2166136261;
  for (let index = 0; index < stable.length; index += 1) {
    hash ^= stable.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `hr_${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

export function createDefaultHouseholdRulesVersion(params?: {
  id?: string;
  createdAt?: string;
  createdByEmail?: string;
  versionNumber?: number;
}): HouseholdRulesVersion {
  const version: HouseholdRulesVersion = {
    id: params?.id || 'rules-default-v1',
    version_number: params?.versionNumber || 1,
    title: 'House Rules Declaration',
    description: 'A signed, dated record of the household rules each member acknowledged. It is designed to support accountability and may be kept as evidence if a dispute needs to be discussed, mediated, or raised with a tenancy body or tribunal. It does not replace a lease or independent legal advice.',
    sections: normalizeHouseholdRuleSections(DEFAULT_HOUSEHOLD_RULE_SECTIONS),
    created_at: params?.createdAt || new Date().toISOString(),
    created_by_email: normalizeHouseholdEmail(params?.createdByEmail || ''),
    rules_hash: '',
  };
  return {
    ...version,
    rules_hash: getHouseholdRulesHash(version),
  };
}

export function getLatestHouseholdRulesVersion(household?: HouseholdRecord | null) {
  const rules = household?.house_rules;
  if (household && !rules?.versions?.length) {
    return createDefaultHouseholdRulesVersion({
      createdAt: household.created_at,
      createdByEmail: household.created_by_email,
    });
  }
  if (!rules?.versions?.length) return null;
  return rules.versions.find((version) => version.id === rules.current_version_id)
    || [...rules.versions].sort((left, right) => right.version_number - left.version_number)[0]
    || null;
}

export function getEnabledHouseholdRuleItems(version?: HouseholdRulesVersion | null) {
  return normalizeHouseholdRuleSections(version?.sections || [])
    .flatMap((section) => section.items.filter((item) => item.enabled));
}

export function getHouseholdRulesAcknowledgement(
  household: HouseholdRecord | null | undefined,
  memberEmail: string,
  versionId?: string | null,
) {
  const normalizedEmail = normalizeHouseholdEmail(memberEmail);
  const targetVersionId = versionId || getLatestHouseholdRulesVersion(household)?.id || '';
  if (!normalizedEmail || !targetVersionId) return null;
  return (household?.house_rules?.acknowledgements || []).find((acknowledgement) =>
    normalizeHouseholdEmail(acknowledgement.member_email) === normalizedEmail
    && acknowledgement.version_id === targetVersionId,
  ) || null;
}

export function isHouseholdRulesAcknowledgementComplete(params: {
  acknowledgement?: HouseholdRulesAcknowledgement | null;
  version?: HouseholdRulesVersion | null;
  expectedSignerName?: string;
}) {
  const acknowledgement = params.acknowledgement;
  if (!acknowledgement) return false;
  if (params.version && acknowledgement.version_id !== params.version.id) return false;

  const enabledItemIds = getEnabledHouseholdRuleItems(params.version).map((item) => item.id);
  const checkedSet = new Set((acknowledgement.checked_item_ids || []).map((itemId) => String(itemId || '').trim()));
  const missingItem = enabledItemIds.some((itemId) => !checkedSet.has(itemId));
  const signature = acknowledgement.signature;
  const typedName = normalizeHouseholdSignerName(signature?.typed_value || '');
  const expectedName = normalizeHouseholdSignerName(params.expectedSignerName || '');
  const hasTypedName = typedName.length >= 2;
  const nameMatches = expectedName ? typedName === expectedName : hasTypedName;
  const hasDrawnSignature = signature?.method === 'drawn_signature'
    && (signature.strokes || []).some((stroke) => (stroke.points || []).length >= 2);

  return !missingItem && hasTypedName && nameMatches && hasDrawnSignature;
}

export function hasAcknowledgedLatestHouseholdRules(
  household: HouseholdRecord | null | undefined,
  memberEmail: string,
  expectedSignerName?: string,
) {
  const latestVersion = getLatestHouseholdRulesVersion(household);
  return isHouseholdRulesAcknowledgementComplete({
    acknowledgement: getHouseholdRulesAcknowledgement(household, memberEmail, latestVersion?.id),
    version: latestVersion,
    expectedSignerName,
  });
}

export function isHouseholdRulesOwnerSetupComplete(household: HouseholdRecord | null | undefined) {
  if (!household) return false;
  const latestVersion = getLatestHouseholdRulesVersion(household);
  if (!latestVersion) return false;

  const setupVersionId = String(household.house_rules?.owner_setup_completed_version_id || '').trim();
  if (setupVersionId && setupVersionId === latestVersion.id) return true;

  const ownerMember = getActiveHouseholdMembers(household).find((member) => member.role === 'owner')
    || household.members?.find((member) => member.role === 'owner')
    || null;
  const ownerEmail = normalizeHouseholdEmail(ownerMember?.email_normalized || household.created_by_email || '');
  if (!ownerEmail) return false;
  if (normalizeHouseholdEmail(latestVersion.created_by_email) !== ownerEmail) return false;

  return isHouseholdRulesAcknowledgementComplete({
    acknowledgement: getHouseholdRulesAcknowledgement(household, ownerEmail, latestVersion.id),
    version: latestVersion,
    expectedSignerName: ownerMember?.display_name || getHouseholdEmailHandle(ownerEmail),
  });
}

export function getHouseholdRulesAcknowledgementStatus(household: HouseholdRecord | null | undefined) {
  const latestVersion = getLatestHouseholdRulesVersion(household);
  const activeMembers = getActiveHouseholdMembers(household);
  return activeMembers.map((member) => {
    const acknowledgement = getHouseholdRulesAcknowledgement(household, member.email_normalized, latestVersion?.id);
    return {
      member,
      acknowledgement,
      acknowledged: isHouseholdRulesAcknowledgementComplete({
        acknowledgement,
        version: latestVersion,
        expectedSignerName: member.display_name,
      }),
    };
  });
}

export function validateHouseholdRulesAcknowledgementDraft(params: {
  version?: HouseholdRulesVersion | null;
  checkedItemIds: string[];
  signature: HouseholdRulesSignature;
  expectedSignerName?: string;
}) {
  const enabledItemIds = getEnabledHouseholdRuleItems(params.version).map((item) => item.id);
  const checkedSet = new Set(params.checkedItemIds);
  const missingItemIds = enabledItemIds.filter((itemId) => !checkedSet.has(itemId));
  const signature = params.signature;
  const typedValue = normalizeHouseholdSignerName(signature?.typed_value || '');
  const expectedSignerName = normalizeHouseholdSignerName(params.expectedSignerName || '');
  const shouldMatchExpectedName = params.expectedSignerName !== undefined;
  const hasTypedName = typedValue.length >= 2;
  const hasExpectedSignerName = expectedSignerName.length >= 2;
  const typedNameMatches = shouldMatchExpectedName ? typedValue === expectedSignerName : hasTypedName;
  const hasDrawnSignature = (signature?.strokes || []).some((stroke) => (stroke.points || []).length >= 2);
  let signatureError = '';
  if (shouldMatchExpectedName && !hasExpectedSignerName) {
    signatureError = 'Update your profile full name first before signing house rules.';
  } else if (!hasTypedName) {
    signatureError = 'Type your profile full name before continuing.';
  } else if (!typedNameMatches) {
    signatureError = 'Typed name must match your profile full name.';
  } else if (!hasDrawnSignature) {
    signatureError = 'Draw your signature before continuing.';
  }

  return {
    valid: Boolean(params.version && missingItemIds.length === 0 && hasTypedName && typedNameMatches && hasDrawnSignature),
    missingItemIds,
    signatureError,
  };
}

export function getHouseholdEmailHandle(value: string) {
  const normalized = normalizeHouseholdEmail(value);
  if (!normalized) return 'Housemate';
  return normalized.split('@')[0] || normalized;
}

function getLocalDateKey(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isHouseholdDueOnOrBeforeToday(value?: string | null) {
  if (!value) return false;
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return false;
  return getLocalDateKey(parsed) <= getLocalDateKey(new Date());
}

export function formatHouseholdMoney(value: number) {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

function roundHouseholdMoney(value: number) {
  return Number(Number(value || 0).toFixed(2));
}

function getStartOfLocalDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function getStartOfLocalWeek(value: Date) {
  const start = getStartOfLocalDay(value);
  const day = start.getDay();
  const daysSinceMonday = day === 0 ? 6 : day - 1;
  start.setDate(start.getDate() - daysSinceMonday);
  return start;
}

function getStartOfLocalMonth(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

function getNextLocalMonth(value: Date) {
  return new Date(value.getFullYear(), value.getMonth() + 1, 1);
}

function addLocalDays(value: Date, days: number) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate() + days);
}

function getLocalMonthKey(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function parseHouseholdExpenseMonth(value?: string | null, now = new Date()) {
  const normalized = String(value || '').trim();
  if (/^\d{4}-\d{2}$/.test(normalized)) return normalized;
  return getLocalMonthKey(now);
}

function getHouseholdExpenseMonthRange(month: string) {
  const [yearValue, monthValue] = month.split('-').map(Number);
  const start = new Date(yearValue, Math.max(0, monthValue - 1), 1);
  return {
    start,
    endExclusive: getNextLocalMonth(start),
  };
}

function getHouseholdExpenseRange({
  range,
  now,
  startDate,
  endDateExclusive,
}: {
  range: HouseholdSpendRange;
  now: Date;
  startDate?: Date;
  endDateExclusive?: Date;
}) {
  if (
    startDate instanceof Date &&
    Number.isFinite(startDate.getTime()) &&
    endDateExclusive instanceof Date &&
    Number.isFinite(endDateExclusive.getTime())
  ) {
    return { start: startDate, endExclusive: endDateExclusive };
  }

  const start = range === 'week' ? getStartOfLocalWeek(now) : getStartOfLocalMonth(now);
  return {
    start,
    endExclusive: range === 'week' ? addLocalDays(start, 7) : getNextLocalMonth(start),
  };
}

function getHouseholdExpenseBillDate(bill: HouseholdBill) {
  const parsed = new Date(bill.due_at || '');
  if (!Number.isFinite(parsed.getTime())) return null;
  return parsed;
}

function getLocalMonthLabel(month: string) {
  const { start } = getHouseholdExpenseMonthRange(month);
  return new Intl.DateTimeFormat('en-AU', {
    month: 'short',
    year: 'numeric',
  }).format(start);
}

function shiftLocalMonth(value: Date, offset: number) {
  return new Date(value.getFullYear(), value.getMonth() + offset, 1);
}

export function getCanonicalHouseholdBillCategory(value?: string | null) {
  const normalizedValue = String(value || '').trim();
  if (!normalizedValue) return '';
  return householdBillCategoryMap.get(normalizedValue.toLowerCase()) || normalizedValue;
}

export function getHouseholdBillCategoryLabel(value?: string | null) {
  return getCanonicalHouseholdBillCategory(value) || 'Uncategorized';
}

export function getHouseholdExpenseCategoryColor(category?: string | null) {
  const label = getHouseholdBillCategoryLabel(category);
  const normalized = label.trim().toLowerCase();
  return householdExpenseCategoryColorMap.get(normalized) || householdExpenseFallbackColors[getStableColorIndex(normalized || 'other')];
}

export function getHouseholdExpenseMonthDayCount(month = getLocalMonthKey(new Date())) {
  const [year, monthNumber] = parseHouseholdExpenseMonth(month).split('-').map(Number);
  return new Date(year, monthNumber, 0).getDate();
}

export function getHouseholdExpenseWeeklyEquivalent(monthlyAmount: unknown, month = getLocalMonthKey(new Date())) {
  const amount = roundHouseholdMoney(Number(monthlyAmount || 0));
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return roundHouseholdMoney((amount / getHouseholdExpenseMonthDayCount(month)) * 7);
}

export function getHouseholdAddressLabel(snapshot?: HouseholdAddressSnapshot | null) {
  if (!snapshot) return '';
  return snapshot.display_address || snapshot.address || [snapshot.suburb, snapshot.state, snapshot.postcode].filter(Boolean).join(', ');
}

function normalizeHouseholdDisplayLabel(value?: string | null) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getHouseholdHeaderDisplay(name?: string | null, snapshot?: HouseholdAddressSnapshot | null) {
  const householdName = String(name || '').trim();
  const addressLabel = getHouseholdAddressLabel(snapshot);
  const normalizedName = normalizeHouseholdDisplayLabel(householdName);
  const normalizedAddress = normalizeHouseholdDisplayLabel(addressLabel);
  const hasDistinctName = Boolean(normalizedName && normalizedAddress && normalizedName !== normalizedAddress);

  return {
    title: hasDistinctName
      ? householdName || addressLabel || 'Household'
      : addressLabel || householdName || 'Household',
    subtitle: hasDistinctName ? addressLabel : '',
  };
}

export function sortTimelineEntriesForHousehold(entries: RentalEntry[]) {
  return [...entries].sort((a, b) => {
    if (a.is_current !== b.is_current) return a.is_current ? -1 : 1;
    return new Date(b.start_date || b.created_at || 0).getTime() - new Date(a.start_date || a.created_at || 0).getTime();
  });
}

export function getActiveHouseholdMembers(household?: HouseholdRecord | null) {
  return (household?.members || []).filter((member) => member.status === 'active');
}

export function getPendingHouseholdMembers(household?: HouseholdRecord | null) {
  return (household?.members || []).filter((member) => member.status === 'pending');
}

export function getPastHouseholdMembers(household?: HouseholdRecord | null) {
  return (household?.members || []).filter((member) => member.status === 'left' || member.status === 'removed' || member.status === 'declined');
}

export function getLatestPendingHouseholdShareInvite(household?: HouseholdRecord | null) {
  return (
    [...(household?.invites || [])]
      .filter((invite) => invite.status === 'pending' && invite.transport === 'share_link')
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())[0] || null
  );
}

export function getHouseholdAttentionSummary(
  household: HouseholdRecord | null,
  viewerEmail: string,
  pendingInvites: HouseholdInvite[] = [],
  sharedBills: HouseholdBill[] = [],
): HouseholdAttentionSummary {
  const normalizedViewerEmail = normalizeHouseholdEmail(viewerEmail);

  let youOwe = 0;
  let youreOwed = 0;
  let billsDue = 0;

  const allBills = [
    ...(household?.bills || []),
    ...sharedBills.filter((sharedBill) => !(household?.bills || []).some((bill) => bill.id === sharedBill.id)),
  ];

  allBills.forEach((bill) => {
    if (bill.status !== 'settled' && isHouseholdDueOnOrBeforeToday(bill.due_at)) {
      billsDue += 1;
    }
    bill.splits.forEach((split) => {
      if (normalizeHouseholdEmail(split.member_email) !== normalizedViewerEmail) return;
      if (normalizeHouseholdEmail(bill.paid_by_email) === normalizedViewerEmail) return;
      const remaining = Math.max(0, Number(split.amount_owed || 0) - Number(split.amount_paid || 0));
      if (remaining > 0) {
        youOwe += remaining;
      }
    });

    if (normalizeHouseholdEmail(bill.paid_by_email) === normalizedViewerEmail) {
      bill.splits.forEach((split) => {
        const remaining = Math.max(0, Number(split.amount_owed || 0) - Number(split.amount_paid || 0));
        if (remaining > 0 && normalizeHouseholdEmail(split.member_email) !== normalizedViewerEmail) {
          youreOwed += remaining;
        }
      });
    }
  });

  const choresDue = (household?.chores || []).filter((chore) => {
    if (chore.status === 'completed') return false;
    return isHouseholdDueOnOrBeforeToday(chore.due_at);
  }).length;

  const inviteCount =
    pendingInvites.filter((invite) => invite.status === 'pending').length +
    (household?.invites || []).filter((invite) => invite.status === 'pending').length;

  return {
    youOwe,
    youreOwed,
    billsDue,
    choresDue,
    choresToday: choresDue,
    pendingInvites: inviteCount,
    totalAttentionCount: [billsDue, choresDue, inviteCount].reduce((sum, value) => sum + value, 0),
  };
}

export function getHouseholdSpendSummary({
  household,
  viewerEmail,
  sharedBills = [],
  scope,
  range,
  now = new Date(),
  startDate,
  endDateExclusive,
}: GetHouseholdSpendSummaryParams): HouseholdSpendSummary {
  const normalizedViewerEmail = normalizeHouseholdEmail(viewerEmail);
  const currentTime = now instanceof Date && Number.isFinite(now.getTime()) ? now : new Date();
  const expenseRange = getHouseholdExpenseRange({
    range,
    now: currentTime,
    startDate,
    endDateExclusive,
  });
  const householdBills = household?.bills || [];
  const mergedBills = [
    ...householdBills,
    ...sharedBills.filter((sharedBill) => !householdBills.some((bill) => bill.id === sharedBill.id)),
  ];
  const sourceBills = scope === 'household' ? householdBills : mergedBills;
  const categoryTotals = new Map<string, number>();

  let total = 0;
  let billCount = 0;

  sourceBills.forEach((bill) => {
    const expenseDate = getHouseholdExpenseBillDate(bill);
    if (!expenseDate || expenseDate < expenseRange.start || expenseDate >= expenseRange.endExclusive) {
      return;
    }

    const amount = scope === 'household'
      ? Math.max(0, Number(bill.amount_total || 0))
      : Math.max(
          0,
          Number(
            bill.splits.find((split) => normalizeHouseholdEmail(split.member_email) === normalizedViewerEmail)?.amount_owed || 0,
          ),
        );
    const roundedAmount = roundHouseholdMoney(amount);
    if (roundedAmount <= 0) return;

    const category = getHouseholdBillCategoryLabel(bill.category);
    total += roundedAmount;
    billCount += 1;
    categoryTotals.set(category, roundHouseholdMoney((categoryTotals.get(category) || 0) + roundedAmount));
  });

  const categories = Array.from(categoryTotals.entries())
    .map(([category, amount]) => ({
      category,
      amount: roundHouseholdMoney(amount),
    }))
    .sort((left, right) => (
      right.amount === left.amount
        ? left.category.localeCompare(right.category)
        : right.amount - left.amount
    ));

  return {
    scope,
    range,
    total: roundHouseholdMoney(total),
    billCount,
    categories,
  };
}

function getHouseholdExpenseSourceBills(
  household: HouseholdRecord | null,
  sharedBills: HouseholdBill[],
  scope: HouseholdSpendScope,
) {
  const householdBills = household?.bills || [];
  if (scope === 'household') return householdBills;
  return [
    ...householdBills,
    ...sharedBills.filter((sharedBill) => !householdBills.some((bill) => bill.id === sharedBill.id)),
  ];
}

function getHouseholdExpenseBillAmount(
  bill: HouseholdBill,
  scope: HouseholdSpendScope,
  normalizedViewerEmail: string,
) {
  if (scope === 'household') {
    return Math.max(0, Number(bill.amount_total || 0));
  }
  return Math.max(
    0,
    Number(
      bill.splits.find((split) => normalizeHouseholdEmail(split.member_email) === normalizedViewerEmail)?.amount_owed || 0,
    ),
  );
}

export function getHouseholdExpenseTransactions({
  household,
  viewerEmail,
  sharedBills = [],
  scope,
  startDate,
  endDateExclusive,
}: GetHouseholdSpendSummaryParams & {
  startDate?: Date;
  endDateExclusive?: Date;
}): HouseholdExpenseTransaction[] {
  const normalizedViewerEmail = normalizeHouseholdEmail(viewerEmail);
  const sourceBills = getHouseholdExpenseSourceBills(household, sharedBills, scope);

  return sourceBills
    .flatMap((bill): HouseholdExpenseTransaction[] => {
      const expenseDate = getHouseholdExpenseBillDate(bill);
      if (!expenseDate) return [];
      if (startDate && expenseDate < startDate) return [];
      if (endDateExclusive && expenseDate >= endDateExclusive) return [];

      const amount = roundHouseholdMoney(getHouseholdExpenseBillAmount(bill, scope, normalizedViewerEmail));
      if (amount <= 0) return [];

      const source: HouseholdBillScope = scope === 'household' ? 'household' : (bill.bill_scope || (bill.household_id ? 'household' : 'shared'));
      return [{
        id: `${source}:${bill.id}`,
        bill_id: bill.id,
        source,
        title: bill.title || 'Untitled expense',
        category: getHouseholdBillCategoryLabel(bill.category),
        amount,
        amount_total: roundHouseholdMoney(Number(bill.amount_total || 0)),
        expense_date: bill.due_at,
        due_at: bill.due_at,
        created_at: bill.created_at,
        paid_by_email: normalizeHouseholdEmail(bill.paid_by_email),
        created_by_email: normalizeHouseholdEmail(bill.created_by_email),
        status: bill.status,
      }];
    })
    .sort((left, right) => new Date(right.due_at || 0).getTime() - new Date(left.due_at || 0).getTime());
}

export function getHouseholdExpenseMonthlyTrend({
  household,
  viewerEmail,
  sharedBills = [],
  scope,
  now = new Date(),
  months = 6,
}: GetHouseholdSpendSummaryParams & {
  months?: number;
}): HouseholdExpenseMonthlyTrendPoint[] {
  const currentMonthStart = getStartOfLocalMonth(now);
  const monthCount = Math.max(1, Math.round(months || 1));

  const points = Array.from({ length: monthCount }, (_value, index) => {
    const monthStart = shiftLocalMonth(currentMonthStart, index - monthCount + 1);
    const month = getLocalMonthKey(monthStart);
    const { start, endExclusive } = getHouseholdExpenseMonthRange(month);
    const transactions = getHouseholdExpenseTransactions({
      household,
      viewerEmail,
      sharedBills,
      scope,
      range: 'month',
      startDate: start,
      endDateExclusive: endExclusive,
      now,
    });
    return {
      month,
      label: getLocalMonthLabel(month),
      total: roundHouseholdMoney(transactions.reduce((sum, transaction) => sum + transaction.amount, 0)),
      transactionCount: transactions.length,
    };
  });

  const hasPreviousMonthData = points.slice(0, -1).some((point) => point.transactionCount > 0 || point.total > 0);
  return hasPreviousMonthData ? points : points.slice(-1);
}

export function getHouseholdExpenseYearComparison({
  household,
  viewerEmail,
  sharedBills = [],
  scope,
  month,
  now = new Date(),
}: {
  household: HouseholdRecord | null;
  viewerEmail: string;
  sharedBills?: HouseholdBill[];
  scope: HouseholdSpendScope;
  month?: string;
  now?: Date;
}): HouseholdExpenseYearComparison {
  const currentTime = now instanceof Date && Number.isFinite(now.getTime()) ? now : new Date();
  const reportMonth = parseHouseholdExpenseMonth(month || getLocalMonthKey(currentTime), currentTime);
  const { start, endExclusive } = getHouseholdExpenseMonthRange(reportMonth);
  const comparisonStart = shiftLocalMonth(start, -12);
  const comparisonMonth = getLocalMonthKey(comparisonStart);
  const comparisonEndExclusive = getNextLocalMonth(comparisonStart);
  const currentTransactions = getHouseholdExpenseTransactions({
    household,
    viewerEmail,
    sharedBills,
    scope,
    range: 'month',
    startDate: start,
    endDateExclusive: endExclusive,
    now: currentTime,
  });
  const comparisonTransactions = getHouseholdExpenseTransactions({
    household,
    viewerEmail,
    sharedBills,
    scope,
    range: 'month',
    startDate: comparisonStart,
    endDateExclusive: comparisonEndExclusive,
    now: comparisonStart,
  });
  const currentTotal = roundHouseholdMoney(currentTransactions.reduce((sum, transaction) => sum + transaction.amount, 0));
  const comparisonTotal = roundHouseholdMoney(comparisonTransactions.reduce((sum, transaction) => sum + transaction.amount, 0));
  const delta = roundHouseholdMoney(currentTotal - comparisonTotal);

  return {
    month: reportMonth,
    comparison_month: comparisonMonth,
    current_total: currentTotal,
    comparison_total: comparisonTotal,
    delta,
    percent_delta: comparisonTotal > 0 ? Number(((delta / comparisonTotal) * 100).toFixed(1)) : null,
    has_comparison: comparisonTransactions.length > 0,
  };
}

export function normalizeHouseholdExpenseGoals(
  value: Partial<HouseholdExpenseGoals> | null | undefined,
  month = getLocalMonthKey(new Date()),
): HouseholdExpenseGoals {
  const categoryGoals: Record<string, number> = {};
  Object.entries(value?.category_goals || {}).forEach(([category, amount]) => {
    const label = getHouseholdBillCategoryLabel(category);
    const roundedAmount = roundHouseholdMoney(Number(amount || 0));
    if (roundedAmount > 0) {
      categoryGoals[label] = roundedAmount;
    }
  });

  return {
    month: parseHouseholdExpenseMonth(value?.month || month),
    total_monthly_cap: roundHouseholdMoney(Number(value?.total_monthly_cap || 0)),
    category_goals: categoryGoals,
    updated_at: value?.updated_at,
  };
}

export function getHouseholdExpenseGoalProgress({
  goals,
  transactions,
}: {
  goals: HouseholdExpenseGoals;
  transactions: HouseholdExpenseTransaction[];
}): HouseholdExpenseGoalProgress {
  const spentByCategory = new Map<string, number>();
  transactions.forEach((transaction) => {
    const category = getHouseholdBillCategoryLabel(transaction.category);
    spentByCategory.set(category, roundHouseholdMoney((spentByCategory.get(category) || 0) + transaction.amount));
  });

  const categories = Array.from(new Set([
    ...HOUSEHOLD_BILL_CATEGORY_OPTIONS,
    ...Object.keys(goals.category_goals || {}),
    ...Array.from(spentByCategory.keys()),
  ]))
    .map((category) => {
      const spent = roundHouseholdMoney(spentByCategory.get(category) || 0);
      const goal = roundHouseholdMoney(goals.category_goals[category] || 0);
      return {
        category,
        spent,
        goal,
        remaining: roundHouseholdMoney(goal - spent),
        percent: goal > 0 ? Math.min(999, Math.round((spent / goal) * 100)) : 0,
      };
    })
    .filter((entry) => entry.goal > 0 || entry.spent > 0)
    .sort((left, right) => {
      if ((right.goal || right.spent) === (left.goal || left.spent)) return left.category.localeCompare(right.category);
      return (right.goal || right.spent) - (left.goal || left.spent);
    });

  const totalSpent = roundHouseholdMoney(transactions.reduce((sum, transaction) => sum + transaction.amount, 0));
  const categoryGoalTotal = roundHouseholdMoney(Object.values(goals.category_goals || {}).reduce((sum, amount) => sum + Number(amount || 0), 0));
  const totalGoal = goals.total_monthly_cap > 0 ? goals.total_monthly_cap : categoryGoalTotal;

  return {
    month: goals.month,
    totalSpent,
    totalGoal,
    totalRemaining: roundHouseholdMoney(totalGoal - totalSpent),
    totalPercent: totalGoal > 0 ? Math.min(999, Math.round((totalSpent / totalGoal) * 100)) : 0,
    categories,
  };
}

export function buildHouseholdExpenseReportData({
  household,
  viewerEmail,
  sharedBills = [],
  goals,
  month,
  now = new Date(),
}: {
  household: HouseholdRecord | null;
  viewerEmail: string;
  sharedBills?: HouseholdBill[];
  goals?: Partial<HouseholdExpenseGoals> | null;
  month?: string;
  now?: Date;
}): HouseholdExpenseReportData {
  const currentTime = now instanceof Date && Number.isFinite(now.getTime()) ? now : new Date();
  const reportMonth = parseHouseholdExpenseMonth(month || getLocalMonthKey(currentTime), currentTime);
  const { start, endExclusive } = getHouseholdExpenseMonthRange(reportMonth);
  const weekAnchorDate = reportMonth === getLocalMonthKey(currentTime) ? currentTime : start;
  const weekStart = getStartOfLocalWeek(weekAnchorDate);
  const weekEndExclusive = addLocalDays(weekStart, 7);
  const normalizedGoals = normalizeHouseholdExpenseGoals(goals, reportMonth);
  const personalTransactions = getHouseholdExpenseTransactions({
    household,
    viewerEmail,
    sharedBills,
    scope: 'personal',
    range: 'month',
    startDate: start,
    endDateExclusive: endExclusive,
    now: currentTime,
  });

  return {
    generated_at: currentTime.toISOString(),
    report_month: reportMonth,
    viewer_email: normalizeHouseholdEmail(viewerEmail),
    household_name: household?.name || getHouseholdAddressLabel(household?.address_snapshot) || 'Household',
    household_week: getHouseholdSpendSummary({
      household,
      viewerEmail,
      sharedBills,
      scope: 'household',
      range: 'week',
      now: weekAnchorDate,
      startDate: weekStart,
      endDateExclusive: weekEndExclusive,
    }),
    household_month: getHouseholdSpendSummary({
      household,
      viewerEmail,
      sharedBills,
      scope: 'household',
      range: 'month',
      now: currentTime,
      startDate: start,
      endDateExclusive: endExclusive,
    }),
    household_transactions: getHouseholdExpenseTransactions({
      household,
      viewerEmail,
      sharedBills,
      scope: 'household',
      range: 'month',
      startDate: start,
      endDateExclusive: endExclusive,
      now: currentTime,
    }),
    household_mom_trend: getHouseholdExpenseMonthlyTrend({ household, viewerEmail, sharedBills, scope: 'household', range: 'month', now: start }),
    household_yoy_comparison: getHouseholdExpenseYearComparison({
      household,
      viewerEmail,
      sharedBills,
      scope: 'household',
      month: reportMonth,
      now: currentTime,
    }),
    personal_week: getHouseholdSpendSummary({
      household,
      viewerEmail,
      sharedBills,
      scope: 'personal',
      range: 'week',
      now: weekAnchorDate,
      startDate: weekStart,
      endDateExclusive: weekEndExclusive,
    }),
    personal_month: getHouseholdSpendSummary({
      household,
      viewerEmail,
      sharedBills,
      scope: 'personal',
      range: 'month',
      now: currentTime,
      startDate: start,
      endDateExclusive: endExclusive,
    }),
    personal_transactions: personalTransactions,
    personal_mom_trend: getHouseholdExpenseMonthlyTrend({ household, viewerEmail, sharedBills, scope: 'personal', range: 'month', now: start }),
    personal_yoy_comparison: getHouseholdExpenseYearComparison({
      household,
      viewerEmail,
      sharedBills,
      scope: 'personal',
      month: reportMonth,
      now: currentTime,
    }),
    personal_goal_progress: getHouseholdExpenseGoalProgress({
      goals: normalizedGoals,
      transactions: personalTransactions,
    }),
  };
}

export function getFallbackHouseholdExpenseInsights(reportData: HouseholdExpenseReportData): HouseholdExpenseInsights {
  const topPersonalCategory = reportData.personal_month.categories[0];
  const topHouseholdCategory = reportData.household_month.categories[0];
  const latestPersonalTrend = reportData.personal_mom_trend.at(-1)?.total || 0;
  const previousPersonalTrend = reportData.personal_mom_trend.at(-2)?.total || 0;
  const trendDelta = roundHouseholdMoney(latestPersonalTrend - previousPersonalTrend);
  const goalProgress = reportData.personal_goal_progress;
  const yearComparison = reportData.personal_yoy_comparison;
  const yearComparisonLabel = getLocalMonthLabel(yearComparison.comparison_month);

  const keyObservations = [
    topPersonalCategory
      ? `${topPersonalCategory.category} is your largest personal category due this month at ${formatHouseholdMoney(topPersonalCategory.amount)}.`
      : 'No personal bills are due this month yet.',
    topHouseholdCategory
      ? `${topHouseholdCategory.category} is the household's largest category due this month at ${formatHouseholdMoney(topHouseholdCategory.amount)}.`
      : 'No household bills are due this month yet.',
    trendDelta === 0
      ? 'Personal spending is flat compared with last month based on bill due dates.'
      : `Personal spending is ${trendDelta > 0 ? 'up' : 'down'} ${formatHouseholdMoney(Math.abs(trendDelta))} compared with last month.`,
    yearComparison.has_comparison
      ? `Personal spending is ${yearComparison.delta === 0 ? 'unchanged' : yearComparison.delta > 0 ? 'up' : 'down'} ${formatHouseholdMoney(Math.abs(yearComparison.delta))} compared with ${yearComparisonLabel}.`
      : `No personal ${yearComparisonLabel} bills are available for year-over-year comparison yet.`,
  ];

  if (goalProgress.totalGoal > 0) {
    keyObservations.push(`You have used ${goalProgress.totalPercent}% of your monthly personal goal.`);
  }

  return {
    headline: 'Spending report ready',
    executive_summary: `This report summarises ${reportData.household_name} spending for ${getLocalMonthLabel(reportData.report_month)} using bill due dates and your personal split amounts.`,
    key_observations: keyObservations,
    advice: [
      'Review the top two categories before adding new discretionary expenses due this month.',
      'Keep receipt uploads attached to bills so totals and categories stay auditable.',
      'Set category goals for recurring areas such as rent, groceries, utilities, and entertainment.',
      'Use the personal view for budgeting decisions because it excludes money other people owe you back.',
    ],
    goal_notes: goalProgress.categories.slice(0, 4).map((entry) => (
      entry.goal > 0
        ? `${entry.category}: ${formatHouseholdMoney(entry.spent)} spent against ${formatHouseholdMoney(entry.goal)}.`
        : `${entry.category}: ${formatHouseholdMoney(entry.spent)} spent with no goal set.`
    )),
    generated_at: new Date().toISOString(),
    fallback: true,
  };
}

export function getHouseholdMemberDisplayName(household: HouseholdRecord | null, email: string) {
  const normalizedEmail = normalizeHouseholdEmail(email);
  const match = household?.members.find((member) => normalizeHouseholdEmail(member.email_normalized) === normalizedEmail);
  return match?.display_name || getHouseholdEmailHandle(normalizedEmail);
}

export function getHouseholdBillParticipantDisplayName(household: HouseholdRecord | null, bill: HouseholdBill | null | undefined, email: string) {
  const normalizedEmail = normalizeHouseholdEmail(email);
  const split = bill?.splits?.find((entry) => normalizeHouseholdEmail(entry.member_email) === normalizedEmail);
  return String(split?.participant_display_name || '').trim()
    || getHouseholdMemberDisplayName(household, normalizedEmail);
}

export function getHouseholdNotificationSenderDisplayName(
  household: HouseholdRecord | null,
  email: string,
  fallbackName?: {
    firstName?: string | null;
    lastName?: string | null;
  },
) {
  const normalizedEmail = normalizeHouseholdEmail(email);
  const activeMemberName = String(
    household?.members.find((member) =>
      normalizeHouseholdEmail(member.email_normalized) === normalizedEmail
      && member.status === 'active',
    )?.display_name || '',
  ).trim();
  if (activeMemberName) return activeMemberName;

  const localName = [fallbackName?.firstName, fallbackName?.lastName]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .join(' ');
  if (localName) return localName;

  return getHouseholdEmailHandle(normalizedEmail);
}

function getHouseholdNotificationFirstName(displayName: string, fallback: string) {
  const normalizedDisplayName = String(displayName || '').trim();
  if (!normalizedDisplayName) return fallback;
  return normalizedDisplayName.split(/\s+/)[0] || fallback;
}

export function buildHouseholdGratitudeNotification(senderName: string, recipientName: string) {
  const normalizedSenderName = getHouseholdNotificationFirstName(senderName, 'Someone');
  const normalizedRecipientName = getHouseholdNotificationFirstName(recipientName, 'a housemate');

  return {
    title: `${normalizedSenderName} thanked ${normalizedRecipientName}! 🎉`,
    body: 'For ',
  };
}
