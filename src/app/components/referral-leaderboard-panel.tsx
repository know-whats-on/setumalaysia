import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { AlertTriangle, Medal, RefreshCw, Trophy, Users } from 'lucide-react';
import {
  fetchAdminReferralLeaderboard,
  type ReferralLeaderboardRow,
  type ReferralLeaderboardTotals,
} from '../lib/api';

interface ReferralLeaderboardPanelProps {
  email: string;
}

const EMPTY_TOTALS: ReferralLeaderboardTotals = {
  inviter_count: 0,
  points: 0,
  credited_count: 0,
  pending_count: 0,
  joined_count: 0,
  total_invites: 0,
};

function formatDate(value?: string | null) {
  if (!value) return 'None yet';
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return 'None yet';
  return format(parsed, 'd MMM yyyy');
}

export function ReferralLeaderboardPanel({ email }: ReferralLeaderboardPanelProps) {
  const [rows, setRows] = useState<ReferralLeaderboardRow[]>([]);
  const [totals, setTotals] = useState<ReferralLeaderboardTotals>(EMPTY_TOTALS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadLeaderboard = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await fetchAdminReferralLeaderboard(email);
      setRows(result.leaderboard);
      setTotals(result.totals);
    } catch (err) {
      console.error('GHAR referral leaderboard load error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load referral leaderboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadLeaderboard();
  }, [email]);

  return (
    <div className="space-y-4">
      <div className="rounded-[28px] border border-[#FDE68A] bg-gradient-to-br from-[#FFFBEB] via-white to-[#FEF2F2] p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#B45309] text-white shadow-lg shadow-amber-900/15">
              <Trophy className="h-5 w-5" strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#92400E]">Referrals</p>
              <h3 className="mt-1 text-base font-black text-[#0F172A]">Shared leaderboard</h3>
              <p className="mt-1 text-xs leading-relaxed text-[#64748B]">
                Combined across both app variants. Each credited joined account earns 1 point for the first referrer.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={loadLeaderboard}
            disabled={loading}
            className="rounded-xl border border-amber-200 bg-white/70 p-2 text-[#92400E] transition hover:bg-white disabled:opacity-50"
            aria-label="Refresh referral leaderboard"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} strokeWidth={1.8} />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2">
          <div className="rounded-2xl border border-white/80 bg-white/85 p-3 text-center shadow-sm">
            <p className="text-xl font-light text-[#B45309]">{totals.points}</p>
            <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-[#64748B]">Points</p>
          </div>
          <div className="rounded-2xl border border-white/80 bg-white/85 p-3 text-center shadow-sm">
            <p className="text-xl font-light text-[#1E40AF]">{totals.pending_count}</p>
            <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-[#64748B]">Waiting</p>
          </div>
          <div className="rounded-2xl border border-white/80 bg-white/85 p-3 text-center shadow-sm">
            <p className="text-xl font-light text-[#16A34A]">{totals.joined_count}</p>
            <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-[#64748B]">Joined</p>
          </div>
          <div className="rounded-2xl border border-white/80 bg-white/85 p-3 text-center shadow-sm">
            <p className="text-xl font-light text-[#0F172A]">{totals.inviter_count}</p>
            <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-[#64748B]">Inviters</p>
          </div>
        </div>
      </div>

      {error ? (
        <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertTriangle className="h-4 w-4 shrink-0" strokeWidth={1.8} />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="rounded-3xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#B45309] border-t-transparent" />
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-4 py-8 text-center">
            <Users className="mx-auto h-8 w-8 text-[#94A3B8]" strokeWidth={1.5} />
            <p className="mt-2 text-sm font-bold text-[#0F172A]">No referrals yet</p>
            <p className="mt-1 text-xs text-[#64748B]">The leaderboard will appear once users start recording referral emails.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {rows.map((row, index) => (
              <div key={row.inviter_email} className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                <div className="flex items-start gap-3">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-sm font-black ${
                    index === 0 ? 'bg-[#FBBF24] text-[#78350F]' : index === 1 ? 'bg-[#E2E8F0] text-[#334155]' : index === 2 ? 'bg-[#FED7AA] text-[#9A3412]' : 'bg-white text-[#64748B]'
                  }`}>
                    {index < 3 ? <Medal className="h-4 w-4" strokeWidth={1.8} /> : index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-[#0F172A]">{row.display_name}</p>
                        <p className="truncate text-[11px] text-[#64748B]">{row.inviter_email}</p>
                      </div>
                      <div className="rounded-full bg-[#FEF3C7] px-3 py-1 text-xs font-black text-[#92400E]">
                        {row.points} pt{row.points === 1 ? '' : 's'}
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-xl bg-white px-2 py-2">
                        <p className="text-sm font-bold text-[#0F172A]">{row.total_invites}</p>
                        <p className="text-[9px] uppercase tracking-wide text-[#94A3B8]">Total</p>
                      </div>
                      <div className="rounded-xl bg-white px-2 py-2">
                        <p className="text-sm font-bold text-emerald-600">{row.joined_count}</p>
                        <p className="text-[9px] uppercase tracking-wide text-[#94A3B8]">Joined</p>
                      </div>
                      <div className="rounded-xl bg-white px-2 py-2">
                        <p className="text-sm font-bold text-blue-600">{row.pending_count}</p>
                        <p className="text-[9px] uppercase tracking-wide text-[#94A3B8]">Waiting</p>
                      </div>
                    </div>
                    <p className="mt-2 text-[10px] text-[#94A3B8]">Latest invite: {formatDate(row.latest_invited_at)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
