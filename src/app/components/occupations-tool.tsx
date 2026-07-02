import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Briefcase,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Filter,
  LoaderCircle,
  RefreshCw,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { fetchSkilledOccupations } from '../lib/api';
import {
  isSkilledOccupationVisaFacet,
  SKILLED_OCCUPATIONS_OFFICIAL_URL,
  type SkilledOccupation,
  type SkilledOccupationFacetValue,
  type SkilledOccupationSort,
  type SkilledOccupationsResult,
} from '../lib/occupations';
import { APP_CONFIG } from '../lib/app-config';

const OCCUPATIONS_PAGE_SIZE = 20;

function formatSourceDate(value: string) {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('en-AU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function getFriendlyOccupationsError(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : '';
  if (!message || /string did not match the expected pattern/i.test(message)) return fallback;
  return message;
}

function OccupationListBadge({ value }: { value: string }) {
  const className = value === 'CSOL'
    ? 'border-[#BBF7D0] bg-[#ECFDF5] text-[#047857]'
    : value === 'MLTSSL'
      ? 'border-[#BFDBFE] bg-[#EFF6FF] text-[#1D4ED8]'
      : value === 'STSOL'
        ? 'border-[#FED7AA] bg-[#FFF7ED] text-[#C2410C]'
        : 'border-[#E2E8F0] bg-[#F8FAFC] text-[#475569]';

  return (
    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black tracking-[0.08em] ${className}`}>
      {value}
    </span>
  );
}

function FacetSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: SkilledOccupationFacetValue[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.16em] text-[#94A3B8]">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
        className="w-full rounded-[18px] border border-[#D7E2F1] bg-white px-3 py-3 text-sm font-semibold text-[#0F172A] outline-none focus:border-[#1D4ED8]"
      >
        <option value="">All {label.toLowerCase()}</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label} ({option.count})
          </option>
        ))}
      </select>
    </label>
  );
}

function OccupationCard({
  occupation,
  expanded,
  onToggle,
}: {
  occupation: SkilledOccupation;
  expanded: boolean;
  onToggle: () => void;
}) {
  const caveatCount = occupation.visas.reduce((sum, visa) => sum + visa.caveats.length, 0);

  return (
    <article className="overflow-hidden rounded-[24px] border border-[#E2E8F0] bg-white shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start justify-between gap-3 px-4 py-4 text-left"
      >
        <div className="min-w-0">
          <h3 className="text-base font-black leading-snug text-[#0F172A]">{occupation.occupation}</h3>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {occupation.lists.map((list) => (
              <OccupationListBadge key={list} value={list} />
            ))}
          </div>
          <p className="mt-3 text-xs font-semibold leading-relaxed text-[#64748B]">
            {occupation.visas.length} visa {occupation.visas.length === 1 ? 'pathway' : 'pathways'}
            {occupation.assessingAuthorities.length ? ` · ${occupation.assessingAuthorities.map((authority) => authority.code).join(', ')}` : ''}
          </p>
          {caveatCount > 0 && (
            <span className="mt-3 inline-flex rounded-full border border-[#FDE68A] bg-[#FFFBEB] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#B45309]">
              Caveats apply
            </span>
          )}
        </div>
        <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F1F5F9] text-[#475569]">
          {expanded ? <ChevronUp className="h-4 w-4" strokeWidth={1.8} /> : <ChevronDown className="h-4 w-4" strokeWidth={1.8} />}
        </span>
      </button>

      {expanded && (
        <div className="space-y-4 border-t border-[#E2E8F0] bg-[#F8FAFC] px-4 py-4">
          {occupation.anzscoLinks.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#94A3B8]">ANZSCO</p>
              <div className="mt-2 grid gap-2">
                {occupation.anzscoLinks.map((link) => (
                  <a
                    key={`${link.href}-${link.text}`}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-start gap-2 rounded-[16px] border border-[#D7E2F1] bg-white px-3 py-3 text-xs font-bold leading-relaxed text-[#1D4ED8]"
                  >
                    <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.8} />
                    <span>{link.text}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#94A3B8]">Eligible visas</p>
            <div className="mt-2 grid gap-2">
              {occupation.visas.map((visa) => (
                <div key={visa.id} className="rounded-[18px] border border-[#E2E8F0] bg-white px-3 py-3 shadow-[0_8px_22px_rgba(15,23,42,0.03)]">
                  <div className="flex items-start gap-2">
                    {visa.subclass && (
                      <span className="mt-0.5 shrink-0 rounded-full bg-[#EFF6FF] px-2 py-1 text-[10px] font-black text-[#1D4ED8]">
                        {visa.subclass}
                      </span>
                    )}
                    <p className="text-xs font-bold leading-relaxed text-[#0F172A]">{visa.label}</p>
                  </div>
                  {visa.caveats.length > 0 && (
                    <div className="mt-3 rounded-[18px] border border-[#FDE68A] bg-[#FFFCF2] px-3 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#92400E]">Caveats apply</p>
                        <span className="rounded-full border border-[#FDE68A] bg-white px-2 py-1 text-[10px] font-bold text-[#B45309]">
                          {visa.caveats.length}
                        </span>
                      </div>
                      <div className="mt-3 grid gap-2.5">
                        {visa.caveats.map((caveat, index) => (
                          <div key={`${visa.id}-${caveat.title}-${index}`} className="rounded-[15px] border border-[#FCE7B2] bg-white px-3 py-3">
                            <div className="flex items-start gap-2.5">
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#FFF7ED] text-[10px] font-black text-[#B45309]">
                                {index + 1}
                              </span>
                              <div className="min-w-0">
                                <p className="text-[12px] font-black leading-snug text-[#92400E]">{caveat.title}</p>
                                {caveat.description && (
                                  <p className="mt-1.5 whitespace-pre-line text-[12px] font-normal leading-[1.65] text-[#7C2D12]">{caveat.description}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {occupation.assessingAuthorities.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#94A3B8]">Assessing authority</p>
              <div className="mt-2 grid gap-2">
                {occupation.assessingAuthorities.map((authority) => (
                  <div key={`${authority.id}-${authority.name}`} className="rounded-[18px] border border-[#E2E8F0] bg-white px-3 py-3">
                    <p className="text-sm font-black text-[#0F172A]">{authority.code}</p>
                    <p className="mt-1 text-xs leading-relaxed text-[#64748B]">{authority.name}</p>
                    {authority.url && (
                      <a
                        href={authority.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-[#1D4ED8]"
                      >
                        <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.8} />
                        Open authority
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

export function OccupationsTool() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedList, setSelectedList] = useState('');
  const [selectedVisa, setSelectedVisa] = useState('');
  const [selectedAuthority, setSelectedAuthority] = useState('');
  const [sort, setSort] = useState<SkilledOccupationSort>('occupation_asc');
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [result, setResult] = useState<SkilledOccupationsResult | null>(null);
  const [expandedId, setExpandedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    setNotice('');

    fetchSkilledOccupations({
      q: debouncedQuery,
      list: selectedList,
      visa: selectedVisa,
      authority: selectedAuthority,
      sort,
      page,
      pageSize: OCCUPATIONS_PAGE_SIZE,
    })
      .then((nextResult) => {
        if (cancelled) return;
        setResult(nextResult);
        if (nextResult.source.cacheStatus === 'stale') {
          setNotice('Using the latest cached Home Affairs occupation list while the official page is temporarily unavailable.');
        }
      })
      .catch((loadError) => {
        if (cancelled) return;
        console.error(`${APP_CONFIG.displayName} occupations load failed:`, loadError);
        setError(getFriendlyOccupationsError(loadError, 'Occupations could not load right now.'));
        if (!result) setResult(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // `result` is intentionally not a dependency; stale data should remain visible during refresh failures.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, selectedList, selectedVisa, selectedAuthority, sort, page, refreshKey]);

  const resetToFirstPage = () => {
    setPage(1);
    setExpandedId('');
  };

  const handleQueryChange = (value: string) => {
    setQuery(value);
    resetToFirstPage();
  };

  const handleListChange = (value: string) => {
    setSelectedList(value);
    resetToFirstPage();
  };

  const handleVisaChange = (value: string) => {
    setSelectedVisa(value);
    resetToFirstPage();
  };

  const handleAuthorityChange = (value: string) => {
    setSelectedAuthority(value);
    resetToFirstPage();
  };

  const handleSortChange = (value: string) => {
    setSort(value === 'occupation_desc' ? 'occupation_desc' : 'occupation_asc');
    resetToFirstPage();
  };

  const clearFilters = () => {
    setQuery('');
    setDebouncedQuery('');
    setSelectedList('');
    setSelectedVisa('');
    setSelectedAuthority('');
    setSort('occupation_asc');
    resetToFirstPage();
  };

  const listFacets = result?.facets.lists || [];
  const visaFacets = (result?.facets.visas || []).filter(isSkilledOccupationVisaFacet);
  const items = result?.items || [];
  const hasFilters = Boolean(query || selectedList || selectedVisa || selectedAuthority || sort === 'occupation_desc');

  return (
    <div className="px-4 pb-6 pt-2">
      <div className="overflow-hidden rounded-[28px] border border-[#D7E2F1] bg-white shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
        <div className="relative overflow-hidden bg-[linear-gradient(135deg,#0F172A_0%,#155E75_62%,#FACC15_160%)] px-5 py-5 text-white">
          <div className="absolute -right-10 -top-12 h-36 w-36 rounded-full bg-[#67E8F9]/20 blur-2xl" />
          <div className="relative z-10 flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[20px] bg-white/12 ring-1 ring-white/20">
              <Briefcase className="h-5 w-5" strokeWidth={1.7} />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-bold leading-tight">Home Affairs Skilled Occupation List</h2>
            </div>
          </div>
        </div>

        <div className="border-b border-[#E2E8F0] bg-[#F8FAFC] px-5 py-4">
          <div className="flex items-start gap-3 rounded-[22px] border border-[#DBEAFE] bg-white px-4 py-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#1D4ED8]" strokeWidth={1.8} />
            <p className="text-xs leading-relaxed text-[#475569]">
              This is a guide only, not migration advice. Always confirm your pathway against the official list or a registered migration professional.
            </p>
          </div>
        </div>

        <div className="space-y-4 bg-[#F8FAFC] px-4 py-4">
          <div className="rounded-[24px] border border-[#E2E8F0] bg-white p-4">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" strokeWidth={1.8} />
              <input
                value={query}
                onChange={(event) => handleQueryChange(event.currentTarget.value)}
                placeholder="Search accountant, nurse, 261312, ACS..."
                className="w-full rounded-[20px] border border-[#D7E2F1] bg-[#F8FAFC] py-3 pl-11 pr-4 text-sm font-semibold text-[#0F172A] outline-none placeholder:text-[#94A3B8] focus:border-[#1D4ED8] focus:bg-white"
              />
            </label>

            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => handleListChange('')}
                className={`shrink-0 rounded-full border px-3 py-2 text-xs font-bold ${!selectedList ? 'border-[#1D4ED8] bg-[#EFF6FF] text-[#1D4ED8]' : 'border-[#E2E8F0] bg-white text-[#64748B]'}`}
              >
                All lists
              </button>
              {listFacets.map((facet) => (
                <button
                  key={facet.id}
                  type="button"
                  onClick={() => handleListChange(facet.id)}
                  className={`shrink-0 rounded-full border px-3 py-2 text-xs font-bold ${selectedList === facet.id ? 'border-[#1D4ED8] bg-[#EFF6FF] text-[#1D4ED8]' : 'border-[#E2E8F0] bg-white text-[#64748B]'}`}
                >
                  {facet.label} · {facet.count}
                </button>
              ))}
            </div>

            <div className="mt-4 grid gap-3">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#94A3B8]">
                <Filter className="h-3.5 w-3.5" strokeWidth={1.8} />
                Filters
              </div>
              <FacetSelect label="Visa" value={selectedVisa} options={visaFacets} onChange={handleVisaChange} />
              <FacetSelect label="Authority" value={selectedAuthority} options={result?.facets.authorities || []} onChange={handleAuthorityChange} />
              <label className="block">
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.16em] text-[#94A3B8]">Sort</span>
                <select
                  value={sort}
                  onChange={(event) => handleSortChange(event.currentTarget.value)}
                  className="w-full rounded-[18px] border border-[#D7E2F1] bg-white px-3 py-3 text-sm font-semibold text-[#0F172A] outline-none focus:border-[#1D4ED8]"
                >
                  <option value="occupation_asc">Occupation A-Z</option>
                  <option value="occupation_desc">Occupation Z-A</option>
                </select>
              </label>
            </div>

            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-4 w-full rounded-[18px] border border-[#D7E2F1] bg-white px-4 py-3 text-sm font-bold text-[#475569]"
              >
                Clear search and filters
              </button>
            )}
          </div>

          {notice && (
            <div className="rounded-[20px] border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3 text-xs leading-relaxed text-[#92400E]">
              {notice}
            </div>
          )}

          {error && result && (
            <div className="rounded-[20px] border border-[#FCA5A5] bg-[#FEF2F2] px-4 py-3 text-xs leading-relaxed text-[#991B1B]">
              {error}
            </div>
          )}

          {loading && !result ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 rounded-[24px] border border-[#E2E8F0] bg-white px-6 py-10 text-center">
              <LoaderCircle className="h-8 w-8 animate-spin text-[#0E7490]" strokeWidth={1.8} />
              <p className="text-sm font-semibold text-[#0F172A]">Loading Home Affairs occupations...</p>
              <p className="max-w-xs text-sm leading-relaxed text-[#64748B]">
                We are fetching the official skilled occupation list through the backend proxy.
              </p>
            </div>
          ) : error && !result ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center gap-4 rounded-[24px] border border-[#E2E8F0] bg-white px-6 py-10 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-[22px] border border-[#FCA5A5] bg-[#FEF2F2] text-[#B91C1C]">
                <AlertTriangle className="h-6 w-6" strokeWidth={1.8} />
              </div>
              <div>
                <p className="text-base font-bold text-[#0F172A]">Occupations are unavailable</p>
                <p className="mt-2 text-sm leading-relaxed text-[#64748B]">{error}</p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setRefreshKey((current) => current + 1)}
                  className="inline-flex items-center gap-2 rounded-[18px] bg-[#0F172A] px-4 py-3 text-sm font-semibold text-white"
                >
                  <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.8} />
                  Try again
                </button>
                <a
                  href={SKILLED_OCCUPATIONS_OFFICIAL_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-[18px] border border-[#D7E2F1] bg-white px-4 py-3 text-sm font-semibold text-[#1E40AF]"
                >
                  <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.8} />
                  Open official list
                </a>
              </div>
            </div>
          ) : result ? (
            <>
              <div className="flex items-center justify-between gap-3 rounded-[22px] border border-[#E2E8F0] bg-white px-4 py-3">
                <div>
                  <p className="text-sm font-black text-[#0F172A]">{result.total.toLocaleString('en-AU')} occupations</p>
                  <p className="mt-1 text-xs text-[#64748B]">
                    Page {result.page} of {result.totalPages}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setRefreshKey((current) => current + 1)}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 rounded-[16px] border border-[#D7E2F1] bg-white px-3 py-2 text-xs font-semibold text-[#64748B] disabled:opacity-60"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} strokeWidth={1.7} />
                  Refresh
                </button>
              </div>

              {items.length > 0 ? (
                <div className="space-y-3">
                  {items.map((occupation) => (
                    <OccupationCard
                      key={occupation.id}
                      occupation={occupation}
                      expanded={expandedId === occupation.id}
                      onToggle={() => setExpandedId((current) => current === occupation.id ? '' : occupation.id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-[24px] border border-dashed border-[#CBD5E1] bg-white px-6 py-8 text-center">
                  <p className="text-base font-bold text-[#0F172A]">No occupations found</p>
                  <p className="mt-2 text-sm leading-relaxed text-[#64748B]">
                    Try a broader search term or clear one of the filters.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between gap-3 rounded-[22px] border border-[#E2E8F0] bg-white px-3 py-3">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={result.page <= 1 || loading}
                  className="rounded-[16px] border border-[#D7E2F1] px-4 py-3 text-sm font-bold text-[#475569] disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="text-xs font-bold text-[#64748B]">
                  {result.page} / {result.totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.min(result.totalPages, current + 1))}
                  disabled={result.page >= result.totalPages || loading}
                  className="rounded-[16px] bg-[#0F172A] px-4 py-3 text-sm font-bold text-white disabled:opacity-40"
                >
                  Next
                </button>
              </div>

              <div className="rounded-[22px] border border-[#E2E8F0] bg-white px-4 py-4">
                <p className="text-xs leading-relaxed text-[#64748B]">
                  Source: {result.source.name}. {result.source.lastUpdated ? `Official page last updated ${result.source.lastUpdated}. ` : ''}
                  Rules fetched {formatSourceDate(result.source.fetchedAt) || 'recently'}.
                </p>
                <a
                  href={SKILLED_OCCUPATIONS_OFFICIAL_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-[#1D4ED8]"
                >
                  <ExternalLink className="h-4 w-4" strokeWidth={1.8} />
                  Open official list
                </a>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
