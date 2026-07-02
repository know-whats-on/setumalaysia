import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  ArrowLeft,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Download,
  Goal,
  Loader2,
  PieChart as PieChartIcon,
  Receipt,
  Sparkles,
  WalletCards,
} from 'lucide-react';
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  fetchHouseholdExpenseGoals,
  fetchMyHousehold,
  generateHouseholdExpenseInsights,
  updateHouseholdExpenseGoals,
} from '../lib/api';
import {
  buildHouseholdExpenseReportData,
  formatHouseholdMoney,
  getFallbackHouseholdExpenseInsights,
  getHouseholdAddressLabel,
  getHouseholdExpenseCategoryColor,
  getHouseholdExpenseWeeklyEquivalent,
  HOUSEHOLD_BILL_CATEGORY_OPTIONS,
  normalizeHouseholdExpenseGoals,
  type HouseholdDashboardResponse,
  type HouseholdExpenseGoals,
  type HouseholdExpenseMonthlyTrendPoint,
  type HouseholdExpenseReportData,
  type HouseholdExpenseTransaction,
  type HouseholdExpenseYearComparison,
  type HouseholdSpendRange,
  type HouseholdSpendScope,
  type HouseholdSpendSummary,
} from '../lib/household';
import { generateHouseholdExpenseReportPdf } from '../lib/household-expense-report-pdf';
import { downloadSetuPdf } from '../lib/setu-pdf';

type ExpenseTrackerTab = 'overview' | 'transactions' | 'goals' | 'report';

const expenseTabs: Array<{ id: ExpenseTrackerTab; label: string; icon: typeof PieChartIcon }> = [
  { id: 'overview', label: 'Overview', icon: PieChartIcon },
  { id: 'transactions', label: 'Transactions', icon: Receipt },
  { id: 'goals', label: 'Goals', icon: Goal },
  { id: 'report', label: 'Report', icon: Download },
];

const scopeOptions: Array<{ id: HouseholdSpendScope; label: string }> = [
  { id: 'personal', label: 'Self' },
  { id: 'household', label: 'Household' },
];

const rangeOptions: Array<{ id: HouseholdSpendRange; label: string }> = [
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
];

function getCurrentMonthKey(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function shiftMonthKey(month: string, offset: number) {
  const [year, monthNumber] = month.split('-').map(Number);
  const parsed = new Date(year, Math.max(0, monthNumber - 1) + offset, 1);
  return getCurrentMonthKey(parsed);
}

function getExpenseGoalsCacheKey(householdId: string, actorEmail: string, month: string) {
  return `hoodie_expense_goals:${String(householdId || '').trim()}:${String(actorEmail || '').trim().toLowerCase()}:${month}`;
}

function readCachedExpenseGoals(householdId: string, actorEmail: string, month: string) {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(getExpenseGoalsCacheKey(householdId, actorEmail, month));
    if (!raw) return null;
    return normalizeHouseholdExpenseGoals(JSON.parse(raw), month);
  } catch {
    return null;
  }
}

function writeCachedExpenseGoals(householdId: string, actorEmail: string, goals: HouseholdExpenseGoals) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      getExpenseGoalsCacheKey(householdId, actorEmail, goals.month),
      JSON.stringify(goals),
    );
  } catch {
    // Private goals should still work in-memory if storage is unavailable.
  }
}

function formatExpenseDate(value: string) {
  const parsed = new Date(value || '');
  if (!Number.isFinite(parsed.getTime())) return 'No date';
  return new Intl.DateTimeFormat('en-AU', {
    day: '2-digit',
    month: 'short',
  }).format(parsed);
}

function formatMonthLabel(month: string) {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Intl.DateTimeFormat('en-AU', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, Math.max(0, monthNumber - 1), 1));
}

function getSummary(reportData: HouseholdExpenseReportData, scope: HouseholdSpendScope, range: HouseholdSpendRange) {
  if (scope === 'household') return range === 'week' ? reportData.household_week : reportData.household_month;
  return range === 'week' ? reportData.personal_week : reportData.personal_month;
}

function getTransactions(reportData: HouseholdExpenseReportData, scope: HouseholdSpendScope) {
  return scope === 'household' ? reportData.household_transactions : reportData.personal_transactions;
}

function getTrend(reportData: HouseholdExpenseReportData, scope: HouseholdSpendScope) {
  return scope === 'household' ? reportData.household_mom_trend : reportData.personal_mom_trend;
}

function getYearComparison(reportData: HouseholdExpenseReportData, scope: HouseholdSpendScope) {
  return scope === 'household' ? reportData.household_yoy_comparison : reportData.personal_yoy_comparison;
}

function getChartData(summary: HouseholdSpendSummary) {
  return summary.categories.map((entry) => ({
    ...entry,
    fill: getHouseholdExpenseCategoryColor(entry.category),
  }));
}

function calculateTrendDelta(points: HouseholdExpenseMonthlyTrendPoint[]) {
  const latest = points[points.length - 1]?.total || 0;
  const previous = points[points.length - 2]?.total || 0;
  return Number((latest - previous).toFixed(2));
}

function formatShortMonthLabel(month: string) {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Intl.DateTimeFormat('en-AU', {
    month: 'short',
    year: 'numeric',
  }).format(new Date(year, Math.max(0, monthNumber - 1), 1));
}

function parseGoalDraftAmount(value: string, label: string) {
  const normalized = String(value || '').trim();
  if (!normalized) return { amount: 0, error: '' };
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount < 0) {
    return { amount: 0, error: `${label} must be a valid amount of $0 or more.` };
  }
  return { amount: Math.round(amount * 100) / 100, error: '' };
}

function WeeklyGoalHint({ value, month }: { value: string; month: string }) {
  const parsed = parseGoalDraftAmount(value, 'Goal');
  if (parsed.error || parsed.amount <= 0) {
    return <p className="mt-1 text-xs font-semibold text-[#94A3B8]">No weekly cap set</p>;
  }
  return (
    <p className="mt-1 text-xs font-semibold text-[#15803D]">
      {`≈ ${formatHouseholdMoney(getHouseholdExpenseWeeklyEquivalent(parsed.amount, month))} / week`}
    </p>
  );
}

function ExpenseToggleGroup<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<{ id: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <div className="rounded-[22px] border border-white/70 bg-white/75 p-2 shadow-sm">
      <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#64748B]">{label}</p>
      <div className="flex gap-2">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={`flex-1 rounded-2xl px-3 py-2 text-xs font-bold transition ${
              value === option.id
                ? 'bg-[#15803D] text-white shadow-lg shadow-[#15803D]/20'
                : 'bg-[#F8FAFC] text-[#475569]'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function DonutSummaryCard({
  title,
  summary,
  emptyCopy,
}: {
  title: string;
  summary: HouseholdSpendSummary;
  emptyCopy: string;
}) {
  const chartData = getChartData(summary);

  return (
    <div className="rounded-[30px] border border-[#E2E8F0] bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#94A3B8]">{title}</p>
          <p className="mt-2 text-3xl font-black tracking-tight text-[#07111F]">{formatHouseholdMoney(summary.total)}</p>
          <p className="mt-1 text-xs text-[#64748B]">
            {summary.billCount === 1 ? '1 logged transaction' : `${summary.billCount} logged transactions`}
          </p>
        </div>
        <div className="rounded-2xl bg-[#F0FDF4] p-3 text-[#15803D]">
          <PieChartIcon className="h-5 w-5" strokeWidth={1.9} />
        </div>
      </div>

      {chartData.length === 0 ? (
        <div className="mt-5 rounded-3xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-4 py-8 text-center text-sm text-[#64748B]">
          {emptyCopy}
        </div>
      ) : (
        <>
          <div className="relative mt-5 h-[235px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="amount"
                  nameKey="category"
                  innerRadius="62%"
                  outerRadius="86%"
                  paddingAngle={2}
                  strokeWidth={0}
                  isAnimationActive={false}
                >
                  {chartData.map((entry) => (
                    <Cell key={`${entry.category}:${entry.amount}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, _name, item) => [
                    formatHouseholdMoney(Number(value) || 0),
                    String(item.payload?.category || 'Category'),
                  ]}
                  contentStyle={{
                    borderRadius: '18px',
                    borderColor: '#E2E8F0',
                    boxShadow: '0 16px 34px rgba(15,23,42,0.14)',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
              <p className="text-2xl font-black tracking-tight text-[#07111F]">{formatHouseholdMoney(summary.total)}</p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#94A3B8]">
                {summary.range === 'week' ? 'This week' : 'This month'}
              </p>
            </div>
          </div>
          <div className="mt-3 space-y-2">
            {chartData.map((entry) => (
              <div key={`${entry.category}:${entry.amount}`} className="flex items-center justify-between gap-3 rounded-2xl bg-[#F8FAFC] px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: entry.fill }} />
                  <p className="truncate text-sm font-bold text-[#0F172A]">{entry.category}</p>
                </div>
                <p className="text-sm font-black text-[#0F172A]">{formatHouseholdMoney(entry.amount)}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function TrendCard({ points }: { points: HouseholdExpenseMonthlyTrendPoint[] }) {
  const hasSpend = points.some((point) => point.total > 0 || point.transactionCount > 0);
  return (
    <div className="rounded-[30px] border border-[#E2E8F0] bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#94A3B8]">MoM trend</p>
          <p className="mt-2 text-lg font-black text-[#0F172A]">Six-month spending rhythm</p>
        </div>
        <BarChart3 className="h-5 w-5 text-[#15803D]" strokeWidth={1.9} />
      </div>
      {hasSpend ? (
      <div className="mt-4 h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={points}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748B', fontSize: 11 }}
              tickFormatter={(value) => String(value).split(' ')[0]}
            />
            <YAxis hide domain={[0, 'dataMax']} />
            <Tooltip
              formatter={(value) => formatHouseholdMoney(Number(value) || 0)}
              labelFormatter={(label) => String(label)}
              contentStyle={{
                borderRadius: '18px',
                borderColor: '#E2E8F0',
                boxShadow: '0 16px 34px rgba(15,23,42,0.14)',
              }}
            />
            <Bar dataKey="total" fill="#15803D" radius={[12, 12, 0, 0]} />
            <Line
              type="monotone"
              dataKey="total"
              stroke="#0F172A"
              strokeWidth={2.5}
              dot={{ r: 4, fill: '#FFFFFF', stroke: '#0F172A', strokeWidth: 2 }}
              activeDot={{ r: 5, fill: '#0F172A', stroke: '#FFFFFF', strokeWidth: 2 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      ) : (
        <div className="mt-4 rounded-3xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-4 py-8 text-center text-sm text-[#64748B]">
          No monthly trend yet. Add bills with due dates and Hoodie will build the rhythm from due dates.
        </div>
      )}
    </div>
  );
}

function YearComparisonCard({ comparison }: { comparison: HouseholdExpenseYearComparison }) {
  const comparisonLabel = formatShortMonthLabel(comparison.comparison_month);
  const isIncrease = comparison.delta > 0;
  const isDecrease = comparison.delta < 0;
  const toneClassName = isIncrease
    ? 'border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]'
    : isDecrease
      ? 'border-[#BBF7D0] bg-[#F0FDF4] text-[#166534]'
      : 'border-[#D7E2F1] bg-[#F8FAFC] text-[#475569]';
  const deltaLabel = comparison.delta === 0
    ? '$0.00'
    : `${comparison.delta > 0 ? '+' : '-'}${formatHouseholdMoney(Math.abs(comparison.delta))}`;
  const percentLabel = comparison.percent_delta === null
    ? ''
    : ` (${comparison.percent_delta > 0 ? '+' : ''}${comparison.percent_delta}%)`;

  return (
    <div className="rounded-[30px] border border-[#E2E8F0] bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#94A3B8]">Year comparison</p>
          <p className="mt-2 text-lg font-black text-[#0F172A]">vs {comparisonLabel}</p>
        </div>
        <span className={`rounded-full border px-3 py-1.5 text-xs font-black ${toneClassName}`}>
          {comparison.has_comparison ? `${deltaLabel}${percentLabel}` : 'No data'}
        </span>
      </div>
      {comparison.has_comparison ? (
        <p className="mt-4 text-sm leading-relaxed text-[#64748B]">
          {isIncrease
            ? `Spending increased by ${formatHouseholdMoney(Math.abs(comparison.delta))}${percentLabel} compared with ${comparisonLabel}.`
            : isDecrease
              ? `Spending decreased by ${formatHouseholdMoney(Math.abs(comparison.delta))}${percentLabel.replace('+', '')} compared with ${comparisonLabel}.`
              : `Spending is unchanged compared with ${comparisonLabel}.`}
        </p>
      ) : (
        <p className="mt-4 text-sm leading-relaxed text-[#64748B]">
          No {comparisonLabel} comparison yet. Add old bills with due dates and Hoodie will include them here.
        </p>
      )}
    </div>
  );
}

function TransactionList({
  transactions,
  emptyCopy,
}: {
  transactions: HouseholdExpenseTransaction[];
  emptyCopy: string;
}) {
  if (!transactions.length) {
    return (
      <div className="rounded-[30px] border border-dashed border-[#CBD5E1] bg-white px-5 py-10 text-center text-sm text-[#64748B]">
        {emptyCopy}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[30px] border border-[#E2E8F0] bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
      {transactions.map((transaction, index) => (
        <div
          key={transaction.id}
          className={`flex items-center justify-between gap-4 px-5 py-4 ${
            index === transactions.length - 1 ? '' : 'border-b border-[#F1F5F9]'
          }`}
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F0FDF4] text-[#15803D]">
              <Receipt className="h-5 w-5" strokeWidth={1.8} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-[#0F172A]">{transaction.title}</p>
              <p className="mt-1 text-xs text-[#64748B]">
                {transaction.category} · Due {formatExpenseDate(transaction.due_at)}
              </p>
            </div>
          </div>
          <p className="shrink-0 text-sm font-black text-[#0F172A]">{formatHouseholdMoney(transaction.amount)}</p>
        </div>
      ))}
    </div>
  );
}

function GoalProgressCard({ reportData }: { reportData: HouseholdExpenseReportData }) {
  const progress = reportData.personal_goal_progress;
  const percent = Math.min(100, progress.totalPercent);

  return (
    <div className="rounded-[30px] border border-[#BBF7D0] bg-[#F0FDF4] p-5 shadow-[0_18px_50px_rgba(21,128,61,0.12)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#15803D]">Personal goals</p>
          <p className="mt-2 text-2xl font-black text-[#052E16]">
            {progress.totalGoal > 0 ? `${progress.totalPercent}% used` : 'No cap set'}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-[#166534]">
            {progress.totalGoal > 0
              ? `${formatHouseholdMoney(progress.totalSpent)} spent against ${formatHouseholdMoney(progress.totalGoal)}.`
              : 'Set a monthly cap and category goals to turn bills into a budget tracker.'}
          </p>
        </div>
        <WalletCards className="h-6 w-6 text-[#15803D]" strokeWidth={1.8} />
      </div>
      <div className="mt-4 h-3 overflow-hidden rounded-full bg-white">
        <div
          className="h-full rounded-full bg-[#15803D] transition-all"
          style={{ width: `${progress.totalGoal > 0 ? percent : 0}%` }}
        />
      </div>
      {progress.categories.length ? (
        <div className="mt-4 grid gap-2">
          {progress.categories.slice(0, 4).map((entry) => (
            <div key={entry.category} className="flex items-center justify-between gap-3 rounded-2xl bg-white/80 px-3 py-2 text-xs">
              <span className="font-bold text-[#0F172A]">{entry.category}</span>
              <span className="font-semibold text-[#166534]">
                {entry.goal > 0 ? `${entry.percent}%` : formatHouseholdMoney(entry.spent)}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function HouseholdExpensePage() {
  const navigate = useNavigate();
  const email = useMemo(() => (localStorage.getItem('ghar_email') || '').trim().toLowerCase(), []);
  const now = useMemo(() => new Date(), []);
  const currentMonth = useMemo(() => getCurrentMonthKey(now), [now]);
  const [reportMonth, setReportMonth] = useState(() => currentMonth);
  const [dashboard, setDashboard] = useState<HouseholdDashboardResponse | null>(null);
  const [goals, setGoals] = useState<HouseholdExpenseGoals>(() => normalizeHouseholdExpenseGoals(null, reportMonth));
  const [activeTab, setActiveTab] = useState<ExpenseTrackerTab>('overview');
  const [scope, setScope] = useState<HouseholdSpendScope>('personal');
  const [range, setRange] = useState<HouseholdSpendRange>('month');
  const [goalTotalDraft, setGoalTotalDraft] = useState('');
  const [categoryGoalDrafts, setCategoryGoalDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingGoals, setSavingGoals] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const applyGoalsToDrafts = (nextGoals: HouseholdExpenseGoals) => {
    setGoals(nextGoals);
    setGoalTotalDraft(nextGoals.total_monthly_cap > 0 ? String(nextGoals.total_monthly_cap) : '');
    setCategoryGoalDrafts(
      Object.fromEntries(
        Object.entries(nextGoals.category_goals).map(([category, value]) => [category, String(value)]),
      ),
    );
  };

  useEffect(() => {
    let cancelled = false;
    async function loadExpenseTracker() {
      if (!email) {
        setLoading(false);
        setError('Sign in again to use the expense tracker.');
        return;
      }
      setLoading(true);
      setError('');
      try {
        const nextDashboard = await fetchMyHousehold(email);
        if (cancelled) return;
        setDashboard(nextDashboard);
        const householdId = nextDashboard.household?.id || '';
        if (householdId) {
          const cachedGoals = readCachedExpenseGoals(householdId, email, reportMonth);
          if (cachedGoals) {
            applyGoalsToDrafts(cachedGoals);
          }

          try {
            const nextGoals = await fetchHouseholdExpenseGoals({
              householdId,
              actorEmail: email,
              month: reportMonth,
            });
            if (cancelled) return;
            const normalizedGoals = normalizeHouseholdExpenseGoals(nextGoals, reportMonth);
            applyGoalsToDrafts(normalizedGoals);
            writeCachedExpenseGoals(householdId, email, normalizedGoals);
          } catch (goalsErr) {
            console.warn('Hoodie expense goals unavailable, using local fallback:', goalsErr);
            if (!cachedGoals && !cancelled) {
              applyGoalsToDrafts(normalizeHouseholdExpenseGoals(null, reportMonth));
            }
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Expense tracker could not be loaded.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadExpenseTracker();
    return () => {
      cancelled = true;
    };
  }, [email, reportMonth]);

  const reportData = useMemo(
    () => buildHouseholdExpenseReportData({
      household: dashboard?.household || null,
      viewerEmail: email,
      sharedBills: dashboard?.shared_bills || [],
      goals,
      month: reportMonth,
      now,
    }),
    [dashboard?.household, dashboard?.shared_bills, email, goals, now, reportMonth],
  );

  const householdLabel = dashboard?.household?.name
    || getHouseholdAddressLabel(dashboard?.household?.address_snapshot)
    || 'Household';
  const visibleScope = activeTab === 'goals' ? 'personal' : scope;
  const visibleSummary = getSummary(reportData, visibleScope, range);
  const visibleTransactions = getTransactions(reportData, visibleScope);
  const visibleTrend = getTrend(reportData, visibleScope);
  const visibleYearComparison = getYearComparison(reportData, visibleScope);
  const visibleTrendDelta = calculateTrendDelta(visibleTrend);

  const moveReportMonth = (offset: number) => {
    setError('');
    setSuccess('');
    setReportMonth((current) => shiftMonthKey(current, offset));
  };

  const handleSaveGoals = async () => {
    if (!dashboard?.household?.id) {
      setError('Create or join a household before saving expense goals.');
      return;
    }
    const parsedTotal = parseGoalDraftAmount(goalTotalDraft, 'Overall monthly cap');
    if (parsedTotal.error) {
      setError(parsedTotal.error);
      return;
    }
    const category_goals: Record<string, number> = {};
    for (const category of HOUSEHOLD_BILL_CATEGORY_OPTIONS) {
      const parsedCategory = parseGoalDraftAmount(categoryGoalDrafts[category] || '', category);
      if (parsedCategory.error) {
        setError(parsedCategory.error);
        return;
      }
      if (parsedCategory.amount > 0) {
        category_goals[category] = parsedCategory.amount;
      }
    }

    setSavingGoals(true);
    setError('');
    setSuccess('');
    try {
      const savedGoals = await updateHouseholdExpenseGoals({
        householdId: dashboard.household.id,
        actorEmail: email,
        month: reportMonth,
        goals: {
          total_monthly_cap: parsedTotal.amount,
          category_goals,
        },
      });
      const normalizedGoals = normalizeHouseholdExpenseGoals(savedGoals, reportMonth);
      applyGoalsToDrafts(normalizedGoals);
      writeCachedExpenseGoals(dashboard.household.id, email, normalizedGoals);
      setSuccess('Personal spending goals saved.');
    } catch (err) {
      const fallbackGoals = normalizeHouseholdExpenseGoals({
        month: reportMonth,
        total_monthly_cap: parsedTotal.amount,
        category_goals,
        updated_at: new Date().toISOString(),
      }, reportMonth);
      applyGoalsToDrafts(fallbackGoals);
      writeCachedExpenseGoals(dashboard.household.id, email, fallbackGoals);
      console.warn('Hoodie expense goals save unavailable, saved locally:', err);
      setSuccess('Personal spending goals saved on this device. Hoodie will keep them available here until cloud sync is reachable.');
    } finally {
      setSavingGoals(false);
    }
  };

  const handleExportPdf = async () => {
    if (!dashboard?.household?.id) return;
    setExporting(true);
    setError('');
    setSuccess('');
    try {
      const insights = await generateHouseholdExpenseInsights({
        householdId: dashboard.household.id,
        actorEmail: email,
        reportData,
      }).catch(() => getFallbackHouseholdExpenseInsights(reportData));
      const blob = await generateHouseholdExpenseReportPdf({ reportData, insights });
      await downloadSetuPdf({
        blob,
        fileName: `hoodie-spending-report-${reportData.report_month}.pdf`,
        title: `Hoodie spending report - ${formatMonthLabel(reportData.report_month)}`,
      });
      setSuccess('Spending PDF report generated.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not export the spending report.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-[#F3F7F0] text-[#0F172A]">
      <div className="mx-auto min-h-full max-w-3xl px-4 pb-[calc(var(--native-safe-area-bottom)+7rem)] pt-[calc(var(--native-safe-area-top)+1rem)]">
        <div className="sticky top-0 z-20 -mx-4 border-b border-[#DDE8D5]/80 bg-[#F3F7F0]/92 px-4 py-3 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => navigate('/profile?tab=household')}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[#DDE8D5] bg-white text-[#0F172A] shadow-sm"
              aria-label="Back to household"
            >
              <ArrowLeft className="h-5 w-5" strokeWidth={1.8} />
            </button>
            <div className="min-w-0 flex-1 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#15803D]">Household</p>
              <h1 className="truncate text-lg font-black tracking-tight text-[#07111F]">Expense Tracker</h1>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#DCFCE7] text-[#15803D]">
              <Sparkles className="h-5 w-5" strokeWidth={1.8} />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[60dvh] flex-col items-center justify-center text-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#15803D]" strokeWidth={1.8} />
            <p className="mt-4 text-sm font-semibold text-[#475569]">Loading your spending dashboard...</p>
          </div>
        ) : !dashboard?.household ? (
          <div className="mt-6 rounded-[32px] border border-[#E2E8F0] bg-white p-6 text-center shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
            <p className="text-xl font-black text-[#0F172A]">No household yet</p>
            <p className="mt-2 text-sm leading-relaxed text-[#64748B]">
              Create or join a household first, then Hoodie can build a full expense tracker from your bills.
            </p>
            <button
              type="button"
              onClick={() => navigate('/profile?tab=household')}
              className="mt-5 rounded-2xl bg-[#15803D] px-5 py-3 text-sm font-bold text-white"
            >
              Back to Household
            </button>
          </div>
        ) : (
          <div className="space-y-4 pt-4">
            <section className="overflow-hidden rounded-[34px] bg-[#07111F] p-5 text-white shadow-[0_26px_70px_rgba(7,17,31,0.26)]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#86EFAC]">
                    {formatMonthLabel(reportMonth)}
                  </p>
                  <h2 className="mt-2 truncate text-2xl font-black tracking-tight">{householdLabel}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-white/70">
                    Professional household and personal budgeting from logged bills, split responsibilities, receipt uploads, and goals.
                  </p>
                </div>
                <div className="rounded-[24px] bg-white/10 p-3 text-[#86EFAC]">
                  <WalletCards className="h-6 w-6" strokeWidth={1.8} />
                </div>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-[24px] bg-white p-4 text-[#07111F]">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#64748B]">
                    {visibleScope === 'personal' ? 'Your spend' : 'Household spend'}
                  </p>
                  <p className="mt-2 text-3xl font-black tracking-tight">{formatHouseholdMoney(visibleSummary.total)}</p>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-white/10 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/60">vs last month</p>
                  <p className={`mt-2 text-2xl font-black ${visibleTrendDelta <= 0 ? 'text-[#86EFAC]' : 'text-[#FCA5A5]'}`}>
                    {visibleTrendDelta === 0 ? '$0.00' : `${visibleTrendDelta > 0 ? '+' : '-'}${formatHouseholdMoney(Math.abs(visibleTrendDelta))}`}
                  </p>
                  <p className="mt-1 text-xs text-white/60">Based on due dates</p>
                </div>
              </div>
            </section>

            <div className="grid grid-cols-2 gap-2 rounded-[26px] border border-[#DDE8D5] bg-white/75 p-2 shadow-sm">
              {expenseTabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center justify-center gap-2 rounded-2xl px-3 py-3 text-xs font-black transition ${
                      activeTab === tab.id
                        ? 'bg-[#15803D] text-white shadow-lg shadow-[#15803D]/20'
                        : 'text-[#475569]'
                    }`}
                  >
                    <Icon className="h-4 w-4" strokeWidth={1.8} />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2 rounded-[26px] border border-[#DDE8D5] bg-white/80 p-2 shadow-sm">
              <button
                type="button"
                onClick={() => moveReportMonth(-1)}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#DDE8D5] bg-[#F8FAFC] text-[#0F172A]"
                aria-label="Previous expense month"
              >
                <ChevronLeft className="h-5 w-5" strokeWidth={1.8} />
              </button>
              <div className="min-w-0 flex-1 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#94A3B8]">Due month</p>
                <p className="truncate text-sm font-black text-[#0F172A]">{formatMonthLabel(reportMonth)}</p>
              </div>
              <button
                type="button"
                onClick={() => moveReportMonth(1)}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#DDE8D5] bg-[#F8FAFC] text-[#0F172A]"
                aria-label="Next expense month"
              >
                <ChevronRight className="h-5 w-5" strokeWidth={1.8} />
              </button>
            </div>

            {error ? (
              <div className="rounded-2xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#991B1B]">{error}</div>
            ) : null}
            {success ? (
              <div className="rounded-2xl border border-[#BBF7D0] bg-[#F0FDF4] px-4 py-3 text-sm text-[#166534]">{success}</div>
            ) : null}

            {activeTab === 'overview' || activeTab === 'report' ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <ExpenseToggleGroup label="View" value={scope} options={scopeOptions} onChange={setScope} />
                <ExpenseToggleGroup label="Range" value={range} options={rangeOptions} onChange={setRange} />
              </div>
            ) : null}

            {activeTab === 'transactions' ? (
              <ExpenseToggleGroup label="View" value={scope} options={scopeOptions} onChange={setScope} />
            ) : null}

            {activeTab === 'overview' ? (
              <div className="space-y-4">
                <DonutSummaryCard
                  title={`${visibleScope === 'personal' ? 'Self' : 'Household'} ${range === 'week' ? 'week' : 'month'} breakdown`}
                  summary={visibleSummary}
                  emptyCopy={`No ${visibleScope === 'personal' ? 'personal' : 'household'} bills are due ${range === 'week' ? 'this week' : `in ${formatMonthLabel(reportMonth)}`}.`}
                />
                {visibleScope === 'personal' ? <GoalProgressCard reportData={reportData} /> : null}
                <TrendCard points={visibleTrend} />
                <YearComparisonCard comparison={visibleYearComparison} />
              </div>
            ) : null}

            {activeTab === 'transactions' ? (
              <div className="space-y-4">
                <div className="rounded-[30px] bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#94A3B8]">
                    {visibleScope === 'personal' ? 'Self' : 'Household'} transactions
                  </p>
                  <p className="mt-2 text-2xl font-black text-[#0F172A]">{formatHouseholdMoney(visibleTransactions.reduce((sum, item) => sum + item.amount, 0))}</p>
                  <p className="mt-1 text-xs text-[#64748B]">{formatMonthLabel(reportMonth)}, sorted by newest due date first.</p>
                </div>
                <TransactionList
                  transactions={visibleTransactions}
                  emptyCopy={`No ${visibleScope === 'personal' ? 'personal' : 'household'} bills are due in ${formatMonthLabel(reportMonth)}.`}
                />
              </div>
            ) : null}

            {activeTab === 'goals' ? (
              <div className="space-y-4">
                <GoalProgressCard reportData={reportData} />
                <div className="rounded-[30px] border border-[#E2E8F0] bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#94A3B8]">Private monthly goals</p>
                  <p className="mt-2 text-lg font-black text-[#0F172A]">Set your personal spending caps</p>
                  <label className="mt-4 block">
                    <span className="text-xs font-bold text-[#475569]">Overall monthly cap</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={goalTotalDraft}
                      onChange={(event) => setGoalTotalDraft(event.target.value)}
                      disabled={savingGoals}
                      placeholder="e.g. 1800"
                      className="mt-2 w-full rounded-2xl border border-[#D1D5DB] bg-[#F8FAFC] px-4 py-3 text-sm font-semibold text-[#0F172A] disabled:opacity-60"
                    />
                    <WeeklyGoalHint value={goalTotalDraft} month={reportMonth} />
                  </label>
                  <div className="mt-4 grid gap-3">
                    {HOUSEHOLD_BILL_CATEGORY_OPTIONS.map((category) => (
                      <label key={category} className="block">
                        <span className="text-xs font-bold text-[#475569]">{category}</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={categoryGoalDrafts[category] || ''}
                          onChange={(event) => {
                            const nextValue = event.target.value;
                            setCategoryGoalDrafts((current) => ({
                              ...current,
                              [category]: nextValue,
                            }));
                          }}
                          disabled={savingGoals}
                          placeholder="No goal set"
                          className="mt-2 w-full rounded-2xl border border-[#D1D5DB] bg-[#F8FAFC] px-4 py-3 text-sm font-semibold text-[#0F172A] disabled:opacity-60"
                        />
                        <WeeklyGoalHint value={categoryGoalDrafts[category] || ''} month={reportMonth} />
                      </label>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleSaveGoals()}
                    disabled={savingGoals}
                    className="mt-5 w-full rounded-2xl bg-[#15803D] px-4 py-3 text-sm font-black text-white shadow-lg shadow-[#15803D]/20 disabled:opacity-60"
                  >
                    {savingGoals ? 'Saving goals...' : 'Save Personal Goals'}
                  </button>
                </div>
              </div>
            ) : null}

            {activeTab === 'report' ? (
              <div className="space-y-4">
                <div className="rounded-[30px] border border-[#E2E8F0] bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#94A3B8]">PDF report</p>
                      <p className="mt-2 text-2xl font-black text-[#0F172A]">Professional spending report</p>
                      <p className="mt-2 text-sm leading-relaxed text-[#64748B]">
                        Exports seven ordered report sections with household and self analytics, transaction pages, month-over-month trends, and AI budgeting advice.
                      </p>
                    </div>
                    <Download className="h-6 w-6 shrink-0 text-[#15803D]" strokeWidth={1.8} />
                  </div>
                  <div className="mt-5 grid gap-2 text-sm text-[#334155]">
                    {[
                      'Household week and month donut charts',
                      'Household transaction list',
                      'Household MoM spending trend',
                      'Personal week and month donut charts',
                      'Personal transaction list',
                      'Personal MoM spending trend',
                      'AI-generated insights and advice',
                    ].map((label, index) => (
                      <div key={label} className="flex items-center gap-3 rounded-2xl bg-[#F8FAFC] px-3 py-3">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#DCFCE7] text-xs font-black text-[#15803D]">
                          {index + 1}
                        </span>
                        <span className="font-semibold">{label}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleExportPdf()}
                    disabled={exporting}
                    className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#07111F] px-4 py-3 text-sm font-black text-white shadow-lg shadow-[#07111F]/20 disabled:opacity-60"
                  >
                    {exporting ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.8} /> : <Download className="h-4 w-4" strokeWidth={1.8} />}
                    {exporting ? 'Generating PDF...' : 'Export Spending PDF'}
                  </button>
                </div>
                <DonutSummaryCard
                  title="Report preview"
                  summary={visibleSummary}
                  emptyCopy={`No ${visibleScope === 'personal' ? 'personal' : 'household'} bills are due ${range === 'week' ? 'this week' : `in ${formatMonthLabel(reportMonth)}`}.`}
                />
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
