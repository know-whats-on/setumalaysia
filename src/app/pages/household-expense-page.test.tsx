// @vitest-environment jsdom

import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HouseholdExpensePage } from './household-expense-page';
import {
  fetchHouseholdExpenseGoals,
  fetchMyHousehold,
  generateHouseholdExpenseInsights,
  updateHouseholdExpenseGoals,
} from '../lib/api';
import { generateHouseholdExpenseReportPdf } from '../lib/household-expense-report-pdf';
import { downloadSetuPdf } from '../lib/setu-pdf';
import type { HouseholdRecord } from '../lib/household';

vi.mock('recharts', () => ({
  Bar: () => null,
  BarChart: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  CartesianGrid: () => null,
  Cell: () => null,
  ComposedChart: ({ children }: { children?: ReactNode }) => <div data-testid="expense-composed-chart">{children}</div>,
  Line: () => <div data-testid="expense-trend-line" />,
  Pie: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  PieChart: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  ResponsiveContainer: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  Tooltip: () => null,
  XAxis: () => null,
  YAxis: () => null,
}));

vi.mock('../lib/api', () => ({
  fetchHouseholdExpenseGoals: vi.fn(),
  fetchMyHousehold: vi.fn(),
  generateHouseholdExpenseInsights: vi.fn(),
  updateHouseholdExpenseGoals: vi.fn(),
}));

vi.mock('../lib/household-expense-report-pdf', () => ({
  generateHouseholdExpenseReportPdf: vi.fn(),
}));

vi.mock('../lib/setu-pdf', () => ({
  downloadSetuPdf: vi.fn(),
}));

type MountedComponent = {
  container: HTMLDivElement;
  root: Root;
};

const mountedComponents: MountedComponent[] = [];

function normalizeText(value: string | null | undefined) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function getButtonByText(container: HTMLElement, fragment: string) {
  return Array.from(container.querySelectorAll('button')).find((button) =>
    normalizeText(button.textContent).includes(fragment),
  );
}

async function clickElement(element: Element | null | undefined) {
  expect(element).toBeTruthy();
  await act(async () => {
    element?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await Promise.resolve();
  });
}

async function setInputValue(input: HTMLInputElement, value: string) {
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value',
  )?.set;
  await act(async () => {
    nativeInputValueSetter?.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await Promise.resolve();
  });
}

async function flushAsync() {
  for (let index = 0; index < 8; index += 1) {
    await act(async () => {
      await Promise.resolve();
    });
  }
}

function makeHousehold(): HouseholdRecord {
  return {
    id: 'household-1',
    name: 'Campus House',
    status: 'active',
    app_variant: 'ghar',
    created_by_email: 'rushi@hoodie.app',
    created_at: '2026-04-01T00:00:00.000Z',
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
        id: 'member-rushi',
        email_normalized: 'rushi@hoodie.app',
        display_name: 'Rushi Vyas',
        role: 'owner',
        status: 'active',
      },
    ],
    invites: [],
    chores: [],
    notifications: [],
    email_notifications: [],
    activity: [],
    bills: [
      {
        id: 'rent',
        household_id: 'household-1',
        bill_scope: 'household',
        app_variant: 'ghar',
        title: 'April Rent',
        category: 'Rent',
        amount_total: 3000,
        due_at: '2026-04-30T00:00:00.000Z',
        created_by_email: 'rushi@hoodie.app',
        paid_by_email: 'rushi@hoodie.app',
        split_type: 'equal',
        notes: '',
        status: 'open',
        email_members: true,
        created_at: '2026-04-20T00:00:00.000Z',
        splits: [
          {
            id: 'rent-rushi',
            member_email: 'rushi@hoodie.app',
            participant_type: 'household_member',
            participant_display_name: 'Rushi Vyas',
            amount_owed: 1000,
            amount_paid: 1000,
            shares: 1,
            status: 'settled',
          },
          {
            id: 'rent-roomie',
            member_email: 'roomie@hoodie.app',
            participant_type: 'household_member',
            participant_display_name: 'Roomie',
            amount_owed: 2000,
            amount_paid: 0,
            shares: 2,
            status: 'open',
          },
        ],
        payments: [],
      },
      {
        id: 'internet',
        household_id: 'household-1',
        bill_scope: 'household',
        app_variant: 'ghar',
        title: 'NBN Internet',
        category: 'Internet',
        amount_total: 90,
        due_at: '2026-04-28T00:00:00.000Z',
        created_by_email: 'rushi@hoodie.app',
        paid_by_email: 'rushi@hoodie.app',
        split_type: 'equal',
        notes: '',
        status: 'open',
        email_members: true,
        created_at: '2026-04-25T00:00:00.000Z',
        splits: [
          {
            id: 'internet-rushi',
            member_email: 'rushi@hoodie.app',
            participant_type: 'household_member',
            participant_display_name: 'Rushi Vyas',
            amount_owed: 25,
            amount_paid: 25,
            shares: 1,
            status: 'settled',
          },
          {
            id: 'internet-roomie',
            member_email: 'roomie@hoodie.app',
            participant_type: 'household_member',
            participant_display_name: 'Roomie',
            amount_owed: 65,
            amount_paid: 0,
            shares: 1,
            status: 'open',
          },
        ],
        payments: [],
      },
    ],
  };
}

async function renderExpensePage() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  mountedComponents.push({ container, root });

  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={['/household/expenses']}>
        <HouseholdExpensePage />
      </MemoryRouter>,
    );
    await Promise.resolve();
  });
  await flushAsync();

  return container;
}

describe('HouseholdExpensePage', () => {
  beforeEach(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 3, 26, 12, 0, 0));
    document.body.innerHTML = '';
    window.localStorage.clear();
    window.localStorage.setItem('ghar_email', 'rushi@hoodie.app');
    vi.mocked(fetchMyHousehold).mockResolvedValue({
      household: makeHousehold(),
      pending_invites: [],
      shared_bills: [],
      bill_contacts: [],
    });
    vi.mocked(fetchHouseholdExpenseGoals).mockImplementation(async ({ month }) => ({
      month,
      total_monthly_cap: 1500,
      category_goals: {
        Rent: 1100,
        Internet: 100,
      },
      updated_at: '2026-04-26T00:00:00.000Z',
    }));
    vi.mocked(updateHouseholdExpenseGoals).mockImplementation(async ({ month, goals }) => ({
      month,
      total_monthly_cap: goals.total_monthly_cap,
      category_goals: goals.category_goals,
      updated_at: '2026-04-26T00:00:00.000Z',
    }));
    vi.mocked(generateHouseholdExpenseInsights).mockResolvedValue({
      headline: 'Spending report ready',
      executive_summary: 'Professional summary.',
      key_observations: ['Rent is the largest category.'],
      advice: ['Review recurring costs.'],
      goal_notes: ['Rent is on track.'],
      generated_at: '2026-04-26T00:00:00.000Z',
    });
    vi.mocked(generateHouseholdExpenseReportPdf).mockResolvedValue(new Blob(['pdf'], { type: 'application/pdf' }));
    vi.mocked(downloadSetuPdf).mockResolvedValue(undefined);
  });

  afterEach(async () => {
    while (mountedComponents.length > 0) {
      const mounted = mountedComponents.pop();
      if (!mounted) break;
      await act(async () => {
        mounted.root.unmount();
        await Promise.resolve();
      });
      mounted.container.remove();
    }
    vi.useRealTimers();
    vi.clearAllMocks();
    vi.restoreAllMocks();
    document.body.innerHTML = '';
    window.localStorage.clear();
  });

  it('renders self and household summaries with scope switching', async () => {
    const container = await renderExpensePage();

    expect(container.textContent).toContain('Expense Tracker');
    expect(container.textContent).toContain('Campus House');
    expect(container.textContent).toContain('$1,025.00');
    expect(container.textContent).toContain('Personal goals');
    expect(container.textContent).toContain('Based on due dates');

    await clickElement(getButtonByText(container, 'Household'));

    expect(container.textContent).toContain('$3,090.00');
    expect(container.textContent).toContain('Household month breakdown');
  });

  it('renders the six-month trend with a line and a neutral year comparison state', async () => {
    const container = await renderExpensePage();

    expect(container.querySelector('[data-testid="expense-composed-chart"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="expense-trend-line"]')).toBeTruthy();
    expect(container.textContent).toContain('vs Apr 2025');
    expect(container.textContent).toContain('No Apr 2025 comparison yet.');
  });

  it('shows same-month-last-year comparison with positive change', async () => {
    const household = makeHousehold();
    household.bills.push({
      ...household.bills[0],
      id: 'april-2025-electricity',
      title: 'April 2025 Electricity',
      category: 'Utilities',
      amount_total: 50,
      due_at: '2025-04-15T00:00:00.000Z',
      created_at: '2026-04-26T00:00:00.000Z',
      splits: [
        {
          id: 'april-2025-electricity-rushi',
          member_email: 'rushi@hoodie.app',
          participant_type: 'household_member',
          participant_display_name: 'Rushi Vyas',
          amount_owed: 50,
          amount_paid: 50,
          shares: 1,
          status: 'settled',
        },
      ],
      payments: [],
    });
    vi.mocked(fetchMyHousehold).mockResolvedValue({
      household,
      pending_invites: [],
      shared_bills: [],
      bill_contacts: [],
    });

    const container = await renderExpensePage();

    expect(container.textContent).toContain('vs Apr 2025');
    expect(container.textContent).toContain('+$975.00');
    expect(container.textContent).toContain('Spending increased by $975.00');
  });

  it('shows the transaction tab for the selected scope', async () => {
    const container = await renderExpensePage();

    await clickElement(getButtonByText(container, 'Transactions'));

    expect(container.textContent).toContain('Self transactions');
    expect(container.textContent).toContain('April Rent');
    expect(container.textContent).toContain('NBN Internet');
    expect(container.textContent).toContain('$1,025.00');
    expect(container.textContent).toContain('Due 30 Apr');
  });

  it('uses the selected due month so backfilled bills appear in their original month', async () => {
    const household = makeHousehold();
    household.bills.push({
      ...household.bills[0],
      id: 'march-water',
      title: 'March Water',
      category: 'Water',
      amount_total: 120,
      due_at: '2026-03-15T00:00:00.000Z',
      created_at: '2026-04-26T00:00:00.000Z',
      splits: [
        {
          id: 'march-water-rushi',
          member_email: 'rushi@hoodie.app',
          participant_type: 'household_member',
          participant_display_name: 'Rushi Vyas',
          amount_owed: 60,
          amount_paid: 0,
          shares: 1,
          status: 'open',
        },
      ],
      payments: [],
    });
    vi.mocked(fetchMyHousehold).mockResolvedValue({
      household,
      pending_invites: [],
      shared_bills: [],
      bill_contacts: [],
    });

    const container = await renderExpensePage();

    expect(container.textContent).toContain('April 2026');
    expect(container.textContent).toContain('$1,025.00');

    await clickElement(container.querySelector('button[aria-label="Previous expense month"]'));
    await flushAsync();
    await clickElement(getButtonByText(container, 'Transactions'));

    expect(fetchHouseholdExpenseGoals).toHaveBeenCalledWith(expect.objectContaining({
      month: '2026-03',
    }));
    expect(container.textContent).toContain('March 2026');
    expect(container.textContent).toContain('March Water');
    expect(container.textContent).toContain('$60.00');
    expect(container.textContent).not.toContain('April Rent');
  });

  it('saves personal monthly goals', async () => {
    const container = await renderExpensePage();

    await clickElement(getButtonByText(container, 'Goals'));
    expect(container.textContent).not.toContain('Range');
    expect(container.textContent).not.toContain('This week');
    expect(container.textContent).toContain('≈ $350.00 / week');

    const numberInputs = Array.from(container.querySelectorAll('input[type="number"]')) as HTMLInputElement[];
    await setInputValue(numberInputs[0], '1800');
    await setInputValue(numberInputs[1], '1200');
    expect(container.textContent).toContain('≈ $420.00 / week');
    expect(container.textContent).toContain('≈ $280.00 / week');
    await clickElement(getButtonByText(container, 'Save Personal Goals'));
    await flushAsync();

    expect(updateHouseholdExpenseGoals).toHaveBeenCalledWith(expect.objectContaining({
      householdId: 'household-1',
      actorEmail: 'rushi@hoodie.app',
      month: '2026-04',
      goals: expect.objectContaining({
        total_monthly_cap: 1800,
        category_goals: expect.objectContaining({
          Rent: 1200,
        }),
      }),
    }));
    expect(container.textContent).toContain('Personal spending goals saved.');
  });

  it('validates goal inputs before saving', async () => {
    const container = await renderExpensePage();

    await clickElement(getButtonByText(container, 'Goals'));
    const numberInputs = Array.from(container.querySelectorAll('input[type="number"]')) as HTMLInputElement[];
    await setInputValue(numberInputs[0], '-1');
    await clickElement(getButtonByText(container, 'Save Personal Goals'));

    expect(updateHouseholdExpenseGoals).not.toHaveBeenCalled();
    expect(container.textContent).toContain('Overall monthly cap must be a valid amount of $0 or more.');
  });

  it('keeps the goals screen usable when cloud goal fetch is unavailable', async () => {
    vi.mocked(fetchHouseholdExpenseGoals).mockRejectedValueOnce(new Error('Failed to fetch expense goals'));

    const container = await renderExpensePage();

    await clickElement(getButtonByText(container, 'Goals'));

    expect(container.textContent).toContain('Set your personal spending caps');
    expect(container.textContent).not.toContain('Failed to fetch expense goals');
  });

  it('falls back to device-local goal saves when cloud sync is unavailable', async () => {
    vi.mocked(updateHouseholdExpenseGoals).mockRejectedValueOnce(new Error('Failed to update expense goals'));
    const container = await renderExpensePage();

    await clickElement(getButtonByText(container, 'Goals'));
    const numberInputs = Array.from(container.querySelectorAll('input[type="number"]')) as HTMLInputElement[];
    await setInputValue(numberInputs[0], '1800');
    await setInputValue(numberInputs[1], '1200');
    await clickElement(getButtonByText(container, 'Save Personal Goals'));
    await flushAsync();

    expect(container.textContent).toContain('Personal spending goals saved on this device');
    expect(window.localStorage.getItem('hoodie_expense_goals:household-1:rushi@hoodie.app:2026-04')).toContain('"total_monthly_cap":1800');
  });

  it('exports the spending PDF report from the report tab', async () => {
    const container = await renderExpensePage();

    await clickElement(getButtonByText(container, 'Report'));
    await clickElement(getButtonByText(container, 'Export Spending PDF'));
    await flushAsync();

    expect(generateHouseholdExpenseInsights).toHaveBeenCalledWith(expect.objectContaining({
      householdId: 'household-1',
      actorEmail: 'rushi@hoodie.app',
    }));
    expect(generateHouseholdExpenseReportPdf).toHaveBeenCalled();
    expect(downloadSetuPdf).toHaveBeenCalledWith(expect.objectContaining({
      fileName: 'hoodie-spending-report-2026-04.pdf',
    }));
  });

  it('exports the spending PDF for the selected due month', async () => {
    const container = await renderExpensePage();

    await clickElement(container.querySelector('button[aria-label="Previous expense month"]'));
    await flushAsync();
    await clickElement(getButtonByText(container, 'Report'));
    await clickElement(getButtonByText(container, 'Export Spending PDF'));
    await flushAsync();

    expect(generateHouseholdExpenseReportPdf).toHaveBeenCalledWith(expect.objectContaining({
      reportData: expect.objectContaining({
        report_month: '2026-03',
      }),
    }));
    expect(downloadSetuPdf).toHaveBeenCalledWith(expect.objectContaining({
      fileName: 'hoodie-spending-report-2026-03.pdf',
    }));
  });
});
