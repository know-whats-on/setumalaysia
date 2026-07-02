import { describe, expect, it } from 'vitest';
import {
  buildHouseholdGratitudeNotification,
  buildHouseholdExpenseReportData,
  createDefaultHouseholdRulesVersion,
  getEnabledHouseholdRuleItems,
  getHouseholdAttentionSummary,
  getHouseholdBillParticipantDisplayName,
  getHouseholdExpenseCategoryColor,
  getHouseholdExpenseGoalProgress,
  getHouseholdExpenseMonthlyTrend,
  getHouseholdExpenseTransactions,
  getHouseholdExpenseWeeklyEquivalent,
  getHouseholdExpenseYearComparison,
  getHouseholdNotificationSenderDisplayName,
  getLatestHouseholdRulesVersion,
  getHouseholdRulesAcknowledgementStatus,
  getHouseholdSpendSummary,
  isHouseholdRulesOwnerSetupComplete,
  hasAcknowledgedLatestHouseholdRules,
  normalizeHouseholdExpenseGoals,
  validateHouseholdRulesAcknowledgementDraft,
  type HouseholdBill,
  type HouseholdRulesAcknowledgement,
  type HouseholdRecord,
} from './household';

function makeBill(overrides: Partial<HouseholdBill> = {}): HouseholdBill {
  const dueAt = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  return {
    id: 'bill-1',
    household_id: undefined,
    bill_scope: 'shared',
    app_variant: 'ghar',
    title: 'Cafe',
    category: 'Food',
    amount_total: 30,
    due_at: dueAt,
    created_by_email: 'rushi@hoodie.app',
    paid_by_email: 'rushi@hoodie.app',
    split_type: 'equal',
    notes: '',
    status: 'open',
    email_members: true,
    created_at: dueAt,
    splits: [
      {
        id: 'split-rushi',
        member_email: 'rushi@hoodie.app',
        participant_type: 'hoodie_friend',
        participant_display_name: 'Rushi',
        amount_owed: 15,
        amount_paid: 15,
        shares: 1,
        status: 'settled',
      },
      {
        id: 'split-friend',
        member_email: 'friend@hoodie.app',
        participant_type: 'hoodie_friend',
        participant_display_name: 'Cafe Friend',
        amount_owed: 15,
        amount_paid: 5,
        shares: 1,
        status: 'partial',
      },
    ],
    payments: [],
    ...overrides,
  };
}

function makeRulesHousehold(acknowledgements: HouseholdRulesAcknowledgement[] = []): HouseholdRecord {
  const version = createDefaultHouseholdRulesVersion({
    id: 'rules-v1',
    createdAt: '2026-04-26T00:00:00.000Z',
    createdByEmail: 'owner@hoodie.app',
  });
  return {
    id: 'household-1',
    name: 'Campus House',
    status: 'active',
    app_variant: 'ghar',
    created_by_email: 'owner@hoodie.app',
    created_at: '2026-04-26T00:00:00.000Z',
    address_snapshot: {
      timeline_entry_id: 'timeline-1',
      address: '12 Hoodie Street',
      display_address: '12 Hoodie Street, Sydney NSW 2000',
      unit_number: '',
      suburb: 'Sydney',
      state: 'NSW',
      postcode: '2000',
      is_current: true,
    },
    members: [
      {
        id: 'member-owner',
        email_normalized: 'owner@hoodie.app',
        display_name: 'Owner',
        role: 'owner',
        status: 'active',
      },
      {
        id: 'member-housemate',
        email_normalized: 'housemate@hoodie.app',
        display_name: 'Housemate',
        role: 'member',
        status: 'active',
      },
    ],
    invites: [],
    bills: [],
    chores: [],
    house_rules: {
      current_version_id: version.id,
      versions: [version],
      acknowledgements,
    },
    notifications: [],
    email_notifications: [],
    activity: [],
  };
}

describe('household shared bills', () => {
  it('includes shared bill balances in attention summaries', () => {
    const bill = makeBill();

    expect(getHouseholdAttentionSummary(null, 'friend@hoodie.app', [], [bill])).toMatchObject({
      youOwe: 10,
      youreOwed: 0,
      billsDue: 1,
    });
    expect(getHouseholdAttentionSummary(null, 'rushi@hoodie.app', [], [bill])).toMatchObject({
      youOwe: 0,
      youreOwed: 10,
      billsDue: 1,
    });
  });

  it('uses bill participant display names for non-household friends', () => {
    const household = {
      members: [],
    } as unknown as HouseholdRecord;

    expect(getHouseholdBillParticipantDisplayName(household, makeBill(), 'friend@hoodie.app')).toBe('Cafe Friend');
  });

  it('calculates personal spend from the viewer split instead of the full bill total', () => {
    const now = new Date(2026, 3, 26, 12, 0, 0);
    const bill = makeBill({
      amount_total: 100,
      paid_by_email: 'rushi@hoodie.app',
      due_at: now.toISOString(),
      created_at: now.toISOString(),
      splits: [
        {
          id: 'split-rushi',
          member_email: 'rushi@hoodie.app',
          participant_type: 'hoodie_friend',
          participant_display_name: 'Rushi',
          amount_owed: 40,
          amount_paid: 40,
          shares: 1,
          status: 'settled',
        },
        {
          id: 'split-friend',
          member_email: 'friend@hoodie.app',
          participant_type: 'hoodie_friend',
          participant_display_name: 'Cafe Friend',
          amount_owed: 60,
          amount_paid: 0,
          shares: 1,
          status: 'open',
        },
      ],
    });

    expect(getHouseholdSpendSummary({
      household: {
        bills: [bill],
      } as HouseholdRecord,
      viewerEmail: 'rushi@hoodie.app',
      scope: 'personal',
      range: 'week',
      now,
    })).toMatchObject({
      total: 40,
      billCount: 1,
      categories: [{ category: 'Food', amount: 40 }],
    });
  });

  it('uses bill totals for household spend and excludes shared bills from that view', () => {
    const now = new Date(2026, 3, 26, 12, 0, 0);
    const householdBill = makeBill({
      amount_total: 120,
      due_at: now.toISOString(),
      created_at: now.toISOString(),
      splits: [
        {
          id: 'split-rushi',
          member_email: 'rushi@hoodie.app',
          participant_type: 'hoodie_friend',
          participant_display_name: 'Rushi',
          amount_owed: 40,
          amount_paid: 40,
          shares: 1,
          status: 'settled',
        },
        {
          id: 'split-friend',
          member_email: 'friend@hoodie.app',
          participant_type: 'hoodie_friend',
          participant_display_name: 'Cafe Friend',
          amount_owed: 80,
          amount_paid: 0,
          shares: 1,
          status: 'open',
        },
      ],
    });
    const sharedBill = makeBill({
      id: 'shared-only',
      title: 'Movies',
      category: 'Entertainment',
      amount_total: 30,
      due_at: now.toISOString(),
      created_at: now.toISOString(),
      splits: [
        {
          id: 'split-rushi-shared',
          member_email: 'rushi@hoodie.app',
          participant_type: 'hoodie_friend',
          participant_display_name: 'Rushi',
          amount_owed: 15,
          amount_paid: 0,
          shares: 1,
          status: 'open',
        },
        {
          id: 'split-friend-shared',
          member_email: 'friend@hoodie.app',
          participant_type: 'hoodie_friend',
          participant_display_name: 'Cafe Friend',
          amount_owed: 15,
          amount_paid: 0,
          shares: 1,
          status: 'open',
        },
      ],
    });

    expect(getHouseholdSpendSummary({
      household: {
        bills: [householdBill],
      } as HouseholdRecord,
      viewerEmail: 'rushi@hoodie.app',
      sharedBills: [sharedBill],
      scope: 'household',
      range: 'week',
      now,
    })).toMatchObject({
      total: 120,
      billCount: 1,
      categories: [{ category: 'Food', amount: 120 }],
    });
  });

  it('filters spend by due_at for week and month ranges with monday week starts', () => {
    const now = new Date(2026, 3, 26, 12, 0, 0);
    const weekBill = makeBill({
      id: 'week-bill',
      title: 'Internet',
      category: 'utilities',
      amount_total: 70,
      due_at: new Date(2026, 3, 21, 12, 0, 0).toISOString(),
      created_at: new Date(2026, 4, 2, 12, 0, 0).toISOString(),
      splits: [
        {
          id: 'split-rushi-week',
          member_email: 'rushi@hoodie.app',
          participant_type: 'hoodie_friend',
          participant_display_name: 'Rushi',
          amount_owed: 35,
          amount_paid: 0,
          shares: 1,
          status: 'open',
        },
        {
          id: 'split-friend-week',
          member_email: 'friend@hoodie.app',
          participant_type: 'hoodie_friend',
          participant_display_name: 'Cafe Friend',
          amount_owed: 35,
          amount_paid: 0,
          shares: 1,
          status: 'open',
        },
      ],
    });
    const monthBill = makeBill({
      id: 'month-bill',
      title: 'Groceries',
      category: 'Groceries',
      amount_total: 80,
      due_at: new Date(2026, 3, 6, 12, 0, 0).toISOString(),
      created_at: new Date(2026, 4, 2, 12, 0, 0).toISOString(),
      splits: [
        {
          id: 'split-rushi-month',
          member_email: 'rushi@hoodie.app',
          participant_type: 'hoodie_friend',
          participant_display_name: 'Rushi',
          amount_owed: 20,
          amount_paid: 0,
          shares: 1,
          status: 'open',
        },
        {
          id: 'split-friend-month',
          member_email: 'friend@hoodie.app',
          participant_type: 'hoodie_friend',
          participant_display_name: 'Cafe Friend',
          amount_owed: 60,
          amount_paid: 0,
          shares: 1,
          status: 'open',
        },
      ],
    });
    const oldBill = makeBill({
      id: 'old-bill',
      title: 'March Rent',
      category: 'Rent',
      amount_total: 300,
      due_at: new Date(2026, 2, 31, 12, 0, 0).toISOString(),
      created_at: new Date(2026, 4, 2, 12, 0, 0).toISOString(),
      splits: [
        {
          id: 'split-rushi-old',
          member_email: 'rushi@hoodie.app',
          participant_type: 'hoodie_friend',
          participant_display_name: 'Rushi',
          amount_owed: 100,
          amount_paid: 0,
          shares: 1,
          status: 'open',
        },
        {
          id: 'split-friend-old',
          member_email: 'friend@hoodie.app',
          participant_type: 'hoodie_friend',
          participant_display_name: 'Cafe Friend',
          amount_owed: 200,
          amount_paid: 0,
          shares: 1,
          status: 'open',
        },
      ],
    });

    expect(getHouseholdSpendSummary({
      household: {
        bills: [weekBill, monthBill, oldBill],
      } as HouseholdRecord,
      viewerEmail: 'rushi@hoodie.app',
      scope: 'personal',
      range: 'week',
      now,
    })).toMatchObject({
      total: 35,
      billCount: 1,
      categories: [{ category: 'Utilities', amount: 35 }],
    });

    expect(getHouseholdSpendSummary({
      household: {
        bills: [weekBill, monthBill, oldBill],
      } as HouseholdRecord,
      viewerEmail: 'rushi@hoodie.app',
      scope: 'personal',
      range: 'month',
      now,
    })).toMatchObject({
      total: 55,
      billCount: 2,
      categories: [
        { category: 'Utilities', amount: 35 },
        { category: 'Groceries', amount: 20 },
      ],
    });
  });

  it('includes shared bills in personal spend and falls back blank categories to Uncategorized', () => {
    const now = new Date(2026, 3, 26, 12, 0, 0);
    const sharedBill = makeBill({
      id: 'shared-bill',
      title: 'One-off split',
      category: '   ',
      amount_total: 25,
      due_at: now.toISOString(),
      created_at: now.toISOString(),
      splits: [
        {
          id: 'split-rushi-shared',
          member_email: 'rushi@hoodie.app',
          participant_type: 'hoodie_friend',
          participant_display_name: 'Rushi',
          amount_owed: 25,
          amount_paid: 0,
          shares: 1,
          status: 'open',
        },
      ],
    });

    expect(getHouseholdSpendSummary({
      household: {
        bills: [],
      } as HouseholdRecord,
      viewerEmail: 'rushi@hoodie.app',
      sharedBills: [sharedBill],
      scope: 'personal',
      range: 'week',
      now,
    })).toMatchObject({
      total: 25,
      billCount: 1,
      categories: [{ category: 'Uncategorized', amount: 25 }],
    });
  });

  it('extracts expense tracker transactions with household totals and personal split-only totals', () => {
    const now = new Date(2026, 3, 26, 12, 0, 0);
    const householdBill = makeBill({
      id: 'rent',
      title: 'April Rent',
      category: 'Rent',
      amount_total: 3000,
      created_at: now.toISOString(),
      paid_by_email: 'rushi@hoodie.app',
      splits: [
        {
          id: 'split-rushi-rent',
          member_email: 'rushi@hoodie.app',
          participant_type: 'household_member',
          participant_display_name: 'Rushi',
          amount_owed: 1000,
          amount_paid: 1000,
          shares: 1,
          status: 'settled',
        },
        {
          id: 'split-roomie-rent',
          member_email: 'roomie@hoodie.app',
          participant_type: 'household_member',
          participant_display_name: 'Roomie',
          amount_owed: 2000,
          amount_paid: 0,
          shares: 2,
          status: 'open',
        },
      ],
    });

    expect(getHouseholdExpenseTransactions({
      household: { bills: [householdBill] } as HouseholdRecord,
      viewerEmail: 'rushi@hoodie.app',
      scope: 'household',
      range: 'month',
    })).toMatchObject([
      {
        title: 'April Rent',
        category: 'Rent',
        amount: 3000,
      },
    ]);

    expect(getHouseholdExpenseTransactions({
      household: { bills: [householdBill] } as HouseholdRecord,
      viewerEmail: 'rushi@hoodie.app',
      scope: 'personal',
      range: 'month',
    })).toMatchObject([
      {
        title: 'April Rent',
        category: 'Rent',
        amount: 1000,
      },
    ]);
  });

  it('includes shared bills only for personal expense tracker transactions', () => {
    const now = new Date(2026, 3, 26, 12, 0, 0);
    const sharedBill = makeBill({
      id: 'internet-friend-split',
      title: 'Internet setup',
      category: 'Internet',
      amount_total: 90,
      bill_scope: 'shared',
      household_id: undefined,
      created_at: now.toISOString(),
      splits: [
        {
          id: 'split-rushi-internet',
          member_email: 'rushi@hoodie.app',
          participant_type: 'hoodie_friend',
          participant_display_name: 'Rushi',
          amount_owed: 45,
          amount_paid: 0,
          shares: 1,
          status: 'open',
        },
      ],
    });

    expect(getHouseholdExpenseTransactions({
      household: { bills: [] } as unknown as HouseholdRecord,
      viewerEmail: 'rushi@hoodie.app',
      sharedBills: [sharedBill],
      scope: 'personal',
      range: 'month',
    })).toMatchObject([
      {
        category: 'Internet',
        amount: 45,
        source: 'shared',
      },
    ]);

    expect(getHouseholdExpenseTransactions({
      household: { bills: [] } as unknown as HouseholdRecord,
      viewerEmail: 'rushi@hoodie.app',
      sharedBills: [sharedBill],
      scope: 'household',
      range: 'month',
    })).toEqual([]);
  });

  it('counts personal standalone bills only in personal expense tracking', () => {
    const now = new Date(2026, 3, 26, 12, 0, 0);
    const personalBill = makeBill({
      id: 'personal-phone',
      title: 'Personal phone',
      bill_scope: 'personal',
      household_id: undefined,
      amount_total: 75,
      due_at: new Date(2026, 3, 20, 12, 0, 0).toISOString(),
      created_at: new Date(2026, 3, 26, 12, 0, 0).toISOString(),
      splits: [
        {
          id: 'split-rushi-phone',
          member_email: 'rushi@hoodie.app',
          participant_type: 'hoodie_friend',
          participant_display_name: 'Rushi',
          amount_owed: 75,
          amount_paid: 75,
          shares: 1,
          status: 'settled',
        },
      ],
    });

    expect(getHouseholdSpendSummary({
      household: { bills: [] } as HouseholdRecord,
      viewerEmail: 'rushi@hoodie.app',
      sharedBills: [personalBill],
      scope: 'personal',
      range: 'month',
      now,
    })).toMatchObject({
      total: 75,
      billCount: 1,
    });

    expect(getHouseholdSpendSummary({
      household: { bills: [] } as HouseholdRecord,
      viewerEmail: 'rushi@hoodie.app',
      sharedBills: [personalBill],
      scope: 'household',
      range: 'month',
      now,
    })).toMatchObject({
      total: 0,
      billCount: 0,
    });

    expect(getHouseholdExpenseTransactions({
      household: { bills: [] } as HouseholdRecord,
      viewerEmail: 'rushi@hoodie.app',
      sharedBills: [personalBill],
      scope: 'personal',
      range: 'month',
    })).toMatchObject([
      {
        title: 'Personal phone',
        source: 'personal',
        amount: 75,
      },
    ]);
  });

  it('sorts expense transactions by due date and excludes invalid due dates', () => {
    const aprilStart = new Date(2026, 3, 1);
    const mayStart = new Date(2026, 4, 1);
    const earlyDueBill = makeBill({
      id: 'early-due',
      title: 'Early due',
      amount_total: 40,
      due_at: new Date(2026, 3, 5, 12, 0, 0).toISOString(),
      created_at: new Date(2026, 3, 28, 12, 0, 0).toISOString(),
    });
    const lateDueBill = makeBill({
      id: 'late-due',
      title: 'Late due',
      amount_total: 60,
      due_at: new Date(2026, 3, 25, 12, 0, 0).toISOString(),
      created_at: new Date(2026, 3, 2, 12, 0, 0).toISOString(),
    });
    const invalidDueBill = makeBill({
      id: 'invalid-due',
      title: 'Invalid due',
      amount_total: 70,
      due_at: '',
      created_at: new Date(2026, 3, 10, 12, 0, 0).toISOString(),
    });

    expect(getHouseholdExpenseTransactions({
      household: { bills: [earlyDueBill, invalidDueBill, lateDueBill] } as HouseholdRecord,
      viewerEmail: 'rushi@hoodie.app',
      scope: 'household',
      range: 'month',
      startDate: aprilStart,
      endDateExclusive: mayStart,
    }).map((transaction) => transaction.title)).toEqual(['Late due', 'Early due']);
  });

  it('builds six-month MoM trend buckets from due_at dates', () => {
    const now = new Date(2026, 3, 26, 12, 0, 0);
    const marchBill = makeBill({
      id: 'march-groceries',
      title: 'March groceries',
      category: 'Groceries',
      amount_total: 120,
      due_at: new Date(2026, 2, 10, 12, 0, 0).toISOString(),
      created_at: new Date(2026, 3, 10, 12, 0, 0).toISOString(),
    });
    const aprilBill = makeBill({
      id: 'april-groceries',
      title: 'April groceries',
      category: 'Groceries',
      amount_total: 180,
      due_at: new Date(2026, 3, 10, 12, 0, 0).toISOString(),
      created_at: new Date(2026, 4, 10, 12, 0, 0).toISOString(),
    });

    expect(getHouseholdExpenseMonthlyTrend({
      household: { bills: [marchBill, aprilBill] } as HouseholdRecord,
      viewerEmail: 'rushi@hoodie.app',
      scope: 'household',
      range: 'month',
      now,
      months: 2,
    })).toMatchObject([
      { month: '2026-03', total: 120, transactionCount: 1 },
      { month: '2026-04', total: 180, transactionCount: 1 },
    ]);
  });

  it('uses the current month as the first MoM bucket when previous months have no data', () => {
    const now = new Date(2026, 3, 26, 12, 0, 0);
    const aprilBill = makeBill({
      id: 'april-only',
      title: 'April only',
      category: 'Food',
      amount_total: 50,
      due_at: new Date(2026, 3, 10, 12, 0, 0).toISOString(),
      created_at: new Date(2026, 4, 10, 12, 0, 0).toISOString(),
    });

    expect(getHouseholdExpenseMonthlyTrend({
      household: { bills: [aprilBill] } as HouseholdRecord,
      viewerEmail: 'rushi@hoodie.app',
      scope: 'household',
      range: 'month',
      now,
      months: 6,
    })).toMatchObject([
      { month: '2026-04', total: 50, transactionCount: 1 },
    ]);
  });

  it('compares the selected due month with the same month last year', () => {
    const now = new Date(2026, 3, 26, 12, 0, 0);
    const aprilBill = makeBill({
      id: 'april-2026',
      title: 'April 2026 utilities',
      amount_total: 180,
      due_at: new Date(2026, 3, 10, 12, 0, 0).toISOString(),
    });
    const priorYearBill = makeBill({
      id: 'april-2025',
      title: 'April 2025 utilities',
      amount_total: 120,
      due_at: new Date(2025, 3, 10, 12, 0, 0).toISOString(),
    });

    expect(getHouseholdExpenseYearComparison({
      household: { bills: [aprilBill, priorYearBill] } as HouseholdRecord,
      viewerEmail: 'rushi@hoodie.app',
      scope: 'household',
      month: '2026-04',
      now,
    })).toMatchObject({
      month: '2026-04',
      comparison_month: '2025-04',
      current_total: 180,
      comparison_total: 120,
      delta: 60,
      percent_delta: 50,
      has_comparison: true,
    });
  });

  it('calculates weekly equivalents and deterministic category colours', () => {
    expect(getHouseholdExpenseWeeklyEquivalent(2000, '2026-04')).toBe(466.67);
    expect(getHouseholdExpenseWeeklyEquivalent(2000, '2026-02')).toBe(500);
    expect(getHouseholdExpenseCategoryColor('Rent')).toBe('#4F46E5');
    expect(getHouseholdExpenseCategoryColor('rent')).toBe('#4F46E5');
    expect(getHouseholdExpenseCategoryColor('Custom category')).toBe(getHouseholdExpenseCategoryColor('Custom category'));
  });

  it('calculates personal monthly goal progress by category and total cap', () => {
    const goals = normalizeHouseholdExpenseGoals({
      month: '2026-04',
      total_monthly_cap: 500,
      category_goals: {
        Food: 120,
        Utilities: 80,
      },
    }, '2026-04');
    const progress = getHouseholdExpenseGoalProgress({
      goals,
      transactions: [
        {
          id: 'personal:food',
          bill_id: 'food',
          source: 'household',
          title: 'Dinner',
          category: 'Food',
          amount: 60,
          amount_total: 120,
          expense_date: new Date(2026, 3, 20, 12, 0, 0).toISOString(),
          due_at: '',
          created_at: new Date(2026, 3, 20, 12, 0, 0).toISOString(),
          paid_by_email: 'rushi@hoodie.app',
          created_by_email: 'rushi@hoodie.app',
          status: 'open',
        },
      ],
    });

    expect(progress).toMatchObject({
      month: '2026-04',
      totalSpent: 60,
      totalGoal: 500,
      totalRemaining: 440,
      totalPercent: 12,
    });
    expect(progress.categories).toContainEqual(expect.objectContaining({
      category: 'Food',
      spent: 60,
      goal: 120,
      remaining: 60,
      percent: 50,
    }));
  });

  it('builds spending PDF report data with current month personal and household sections', () => {
    const now = new Date(2026, 3, 26, 12, 0, 0);
    const householdBill = makeBill({
      id: 'april-rent-report',
      title: 'April Rent',
      category: 'Rent',
      amount_total: 3000,
      due_at: now.toISOString(),
      created_at: now.toISOString(),
      splits: [
        {
          id: 'split-rushi-report',
          member_email: 'rushi@hoodie.app',
          participant_type: 'household_member',
          participant_display_name: 'Rushi',
          amount_owed: 1000,
          amount_paid: 1000,
          shares: 1,
          status: 'settled',
        },
      ],
    });

    const reportData = buildHouseholdExpenseReportData({
      household: {
        name: 'Unit 171',
        bills: [householdBill],
      } as HouseholdRecord,
      viewerEmail: 'rushi@hoodie.app',
      goals: {
        month: '2026-04',
        total_monthly_cap: 1500,
        category_goals: { Rent: 1100 },
      },
      now,
    });

    expect(reportData).toMatchObject({
      report_month: '2026-04',
      household_month: { total: 3000 },
      personal_month: { total: 1000 },
      personal_goal_progress: {
        totalSpent: 1000,
        totalGoal: 1500,
      },
    });
    expect(reportData.household_transactions).toHaveLength(1);
    expect(reportData.personal_transactions).toHaveLength(1);
  });

  it('builds report data for the selected due month instead of the bill creation month', () => {
    const now = new Date(2026, 3, 26, 12, 0, 0);
    const backfilledBill = makeBill({
      id: 'march-water-report',
      title: 'March Water',
      category: 'Water',
      amount_total: 150,
      due_at: new Date(2026, 2, 15, 12, 0, 0).toISOString(),
      created_at: new Date(2026, 3, 26, 12, 0, 0).toISOString(),
      splits: [
        {
          id: 'split-rushi-march-water',
          member_email: 'rushi@hoodie.app',
          participant_type: 'household_member',
          participant_display_name: 'Rushi',
          amount_owed: 75,
          amount_paid: 0,
          shares: 1,
          status: 'open',
        },
      ],
    });

    const marchReportData = buildHouseholdExpenseReportData({
      household: {
        name: 'Unit 171',
        bills: [backfilledBill],
      } as HouseholdRecord,
      viewerEmail: 'rushi@hoodie.app',
      month: '2026-03',
      now,
    });
    const aprilReportData = buildHouseholdExpenseReportData({
      household: {
        name: 'Unit 171',
        bills: [backfilledBill],
      } as HouseholdRecord,
      viewerEmail: 'rushi@hoodie.app',
      month: '2026-04',
      now,
    });

    expect(marchReportData).toMatchObject({
      report_month: '2026-03',
      household_month: { total: 150, billCount: 1 },
      personal_month: { total: 75, billCount: 1 },
    });
    expect(aprilReportData.household_month.total).toBe(0);
    expect(aprilReportData.personal_month.total).toBe(0);
  });

  it('builds gratitude notification copy using first names and celebratory copy', () => {
    expect(buildHouseholdGratitudeNotification('Rushi Vyas', 'Liam Davies')).toEqual({
      title: 'Rushi thanked Liam! 🎉',
      body: 'For ',
    });
    expect(buildHouseholdGratitudeNotification('Account Owner', 'fallback')).toEqual({
      title: 'Account thanked fallback! 🎉',
      body: 'For ',
    });
  });

  it('prefers active household member names before local profile names and email handles', () => {
    const household = {
      members: [
        {
          id: 'member-1',
          email_normalized: 'rushi@hoodie.app',
          display_name: 'Rushi Vyas',
          role: 'owner',
          status: 'active',
        },
        {
          id: 'member-2',
          email_normalized: 'former@hoodie.app',
          display_name: 'Former Roomie',
          role: 'member',
          status: 'left',
        },
      ],
    } as unknown as HouseholdRecord;

    expect(getHouseholdNotificationSenderDisplayName(household, 'rushi@hoodie.app', {
      firstName: 'Account',
      lastName: 'Owner',
    })).toBe('Rushi Vyas');
    expect(getHouseholdNotificationSenderDisplayName(household, 'new@hoodie.app', {
      firstName: 'Account',
      lastName: 'Owner',
    })).toBe('Account Owner');
    expect(getHouseholdNotificationSenderDisplayName(household, 'fallback@hoodie.app', {
      firstName: '',
      lastName: '',
    })).toBe('fallback');
    expect(
      buildHouseholdGratitudeNotification(
        getHouseholdNotificationSenderDisplayName(household, 'new@hoodie.app', {
          firstName: 'Account',
          lastName: 'Owner',
        }),
        'Fay Aurelian',
      ).title,
    ).toBe('Account thanked Fay! 🎉');
    expect(
      buildHouseholdGratitudeNotification(
        getHouseholdNotificationSenderDisplayName(household, 'fallback@hoodie.app', {
          firstName: '',
          lastName: '',
        }),
        'Liam Davies',
      ).title,
    ).toBe('fallback thanked Liam! 🎉');
  });
});

describe('household rules', () => {
  it('uses concrete default rule language for evidence-ready records', () => {
    const version = createDefaultHouseholdRulesVersion();
    const defaultText = version.sections.flatMap((section) => section.items.map((item) => item.text)).join(' ');

    expect(defaultText).toContain('at least 14 days written notice');
    expect(defaultText).toContain('within 48 hours');
    expect(defaultText).toContain('24 hours');
    expect(defaultText).toContain('10 PM to 7 AM');
    expect(defaultText).not.toContain('as much notice as reasonably possible');
    expect(defaultText).not.toContain('reasonable notice');
  });

  it('treats default house rules as the current published version', () => {
    const household = makeRulesHousehold([]);

    expect(getLatestHouseholdRulesVersion(household)).toMatchObject({
      id: 'rules-v1',
      version_number: 1,
      title: 'House Rules Declaration',
    });
    expect(household.house_rules?.current_version_id).toBe('rules-v1');
  });

  it('falls back to default published rules for legacy households without rules', () => {
    const household = makeRulesHousehold([]);
    household.house_rules = undefined;

    expect(getLatestHouseholdRulesVersion(household)).toMatchObject({
      id: 'rules-default-v1',
      version_number: 1,
      title: 'House Rules Declaration',
    });
    expect(hasAcknowledgedLatestHouseholdRules(household, 'owner@hoodie.app', 'Owner')).toBe(false);
  });

  it('requires owner setup unless the latest owner-published version is owner-signed', () => {
    const household = makeRulesHousehold([]);

    expect(isHouseholdRulesOwnerSetupComplete(household)).toBe(false);

    const version = getLatestHouseholdRulesVersion(household);
    expect(version).toBeTruthy();
    if (!version) return;
    household.house_rules = {
      ...household.house_rules!,
      acknowledgements: [{
        id: 'ack-owner',
        household_id: household.id,
        version_id: version.id,
        member_email: 'owner@hoodie.app',
        member_display_name: 'Owner',
        checked_item_ids: getEnabledHouseholdRuleItems(version).map((item) => item.id),
        signature: {
          method: 'drawn_signature',
          typed_value: 'Owner',
          strokes: [{ points: [{ x: 0.1, y: 0.2 }, { x: 0.7, y: 0.6 }] }],
        },
        signed_at: '2026-04-26T01:00:00.000Z',
        item_count: getEnabledHouseholdRuleItems(version).length,
        rules_hash: version.rules_hash,
      }],
    };

    expect(isHouseholdRulesOwnerSetupComplete(household)).toBe(true);

    household.house_rules = {
      ...household.house_rules,
      owner_setup_completed_version_id: version.id,
    };
    expect(isHouseholdRulesOwnerSetupComplete(household)).toBe(true);
  });

  it('validates that every enabled item is checked and signed', () => {
    const version = createDefaultHouseholdRulesVersion({
      id: 'rules-v1',
      createdAt: '2026-04-26T00:00:00.000Z',
      createdByEmail: 'owner@hoodie.app',
    });
    const enabledItems = getEnabledHouseholdRuleItems(version);

    expect(validateHouseholdRulesAcknowledgementDraft({
      version,
      checkedItemIds: enabledItems.slice(1).map((item) => item.id),
      signature: {
        method: 'drawn_signature',
        typed_value: 'Rushi Vyas',
        strokes: [{ points: [{ x: 0.1, y: 0.2 }, { x: 0.7, y: 0.6 }] }],
      },
      expectedSignerName: 'Rushi Vyas',
    })).toMatchObject({
      valid: false,
      missingItemIds: [enabledItems[0].id],
    });

    expect(validateHouseholdRulesAcknowledgementDraft({
      version,
      checkedItemIds: enabledItems.map((item) => item.id),
      signature: {
        method: 'drawn_signature',
        typed_value: 'Rushi Vyas',
        strokes: [{ points: [{ x: 0.1, y: 0.2 }, { x: 0.7, y: 0.6 }] }],
      },
      expectedSignerName: 'Rushi Vyas',
    })).toMatchObject({
      valid: true,
      missingItemIds: [],
    });

    expect(validateHouseholdRulesAcknowledgementDraft({
      version,
      checkedItemIds: enabledItems.map((item) => item.id),
      signature: {
        method: 'drawn_signature',
        typed_value: 'Wrong Name',
        strokes: [{ points: [{ x: 0.1, y: 0.2 }, { x: 0.7, y: 0.6 }] }],
      },
      expectedSignerName: 'Rushi Vyas',
    })).toMatchObject({
      valid: false,
      signatureError: 'Typed name must match your profile full name.',
    });
  });

  it('reports latest version acknowledgement status per active member', () => {
    const version = createDefaultHouseholdRulesVersion({
      id: 'rules-v1',
      createdAt: '2026-04-26T00:00:00.000Z',
      createdByEmail: 'owner@hoodie.app',
    });
    const acknowledgement: HouseholdRulesAcknowledgement = {
      id: 'ack-1',
      household_id: 'household-1',
      version_id: version.id,
      member_email: 'owner@hoodie.app',
      member_display_name: 'Owner',
      checked_item_ids: getEnabledHouseholdRuleItems(version).map((item) => item.id),
      signature: {
        method: 'drawn_signature',
        typed_value: 'Owner',
        strokes: [{ points: [{ x: 0.1, y: 0.2 }, { x: 0.7, y: 0.6 }] }],
      },
      signed_at: '2026-04-26T01:00:00.000Z',
      item_count: getEnabledHouseholdRuleItems(version).length,
      rules_hash: version.rules_hash,
    };
    const household = makeRulesHousehold([acknowledgement]);

    expect(hasAcknowledgedLatestHouseholdRules(household, 'owner@hoodie.app', 'Owner')).toBe(true);
    expect(hasAcknowledgedLatestHouseholdRules(household, 'housemate@hoodie.app', 'Housemate')).toBe(false);
    expect(getHouseholdRulesAcknowledgementStatus(household).map((entry) => ({
      email: entry.member.email_normalized,
      acknowledged: entry.acknowledged,
    }))).toEqual([
      { email: 'owner@hoodie.app', acknowledged: true },
      { email: 'housemate@hoodie.app', acknowledged: false },
    ]);
  });

  it('does not count old typed-initial acknowledgements as latest completion', () => {
    const version = createDefaultHouseholdRulesVersion({
      id: 'rules-v1',
      createdAt: '2026-04-26T00:00:00.000Z',
      createdByEmail: 'owner@hoodie.app',
    });
    const acknowledgement: HouseholdRulesAcknowledgement = {
      id: 'ack-typed-initials',
      household_id: 'household-1',
      version_id: version.id,
      member_email: 'owner@hoodie.app',
      member_display_name: 'Owner',
      checked_item_ids: getEnabledHouseholdRuleItems(version).map((item) => item.id),
      signature: { method: 'typed_initials', typed_value: 'OV', strokes: [] },
      signed_at: '2026-04-26T01:00:00.000Z',
      item_count: getEnabledHouseholdRuleItems(version).length,
      rules_hash: version.rules_hash,
    };
    const household = makeRulesHousehold([acknowledgement]);

    expect(hasAcknowledgedLatestHouseholdRules(household, 'owner@hoodie.app', 'Owner')).toBe(false);
    expect(getHouseholdRulesAcknowledgementStatus(household)[0]).toMatchObject({
      acknowledged: false,
      acknowledgement: expect.objectContaining({ id: 'ack-typed-initials' }),
    });
  });

  it('keeps rule versions immutable by tracking acknowledgements against specific versions', () => {
    const firstVersion = createDefaultHouseholdRulesVersion({
      id: 'rules-v1',
      createdAt: '2026-04-26T00:00:00.000Z',
      createdByEmail: 'owner@hoodie.app',
    });
    const secondVersion = {
      ...firstVersion,
      id: 'rules-v2',
      version_number: 2,
      created_at: '2026-04-27T00:00:00.000Z',
      sections: firstVersion.sections.map((section) => (
        section.id === 'cleaning-chores'
          ? {
              ...section,
              items: [
                ...section.items,
                { id: 'cleaning-bin-night', text: 'I will help with bin night.', enabled: true, order: section.items.length },
              ],
            }
          : section
      )),
      rules_hash: 'hr_second',
    };
    const oldAcknowledgement: HouseholdRulesAcknowledgement = {
      id: 'ack-v1',
      household_id: 'household-1',
      version_id: firstVersion.id,
      member_email: 'housemate@hoodie.app',
      member_display_name: 'Housemate',
      checked_item_ids: getEnabledHouseholdRuleItems(firstVersion).map((item) => item.id),
      signature: { method: 'typed_initials', typed_value: 'HM', strokes: [] },
      signed_at: '2026-04-26T01:00:00.000Z',
      item_count: getEnabledHouseholdRuleItems(firstVersion).length,
      rules_hash: firstVersion.rules_hash,
    };
    const household = makeRulesHousehold([oldAcknowledgement]);
    household.house_rules = {
      current_version_id: secondVersion.id,
      versions: [secondVersion, firstVersion],
      acknowledgements: [oldAcknowledgement],
    };

    expect(hasAcknowledgedLatestHouseholdRules(household, 'housemate@hoodie.app', 'Housemate')).toBe(false);
    expect(household.house_rules.acknowledgements[0]).toMatchObject({
      version_id: 'rules-v1',
      rules_hash: firstVersion.rules_hash,
    });
  });
});
