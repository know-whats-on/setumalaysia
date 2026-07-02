import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, Loader2, Search, X } from 'lucide-react';
import {
  querySponsorCompanies,
  type SponsorCompaniesInitialFilter,
} from '../lib/sponsor-companies';
import { createSponsorCompaniesPdf } from '../lib/sponsor-companies-pdf';
import { downloadSetuPdf } from '../lib/setu-pdf';

const DEFAULT_INITIAL = 'A';
const PAGE_SIZE = 500;

type PaginationToken = number | `gap-${number}-${number}`;

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getPaginationTokens(page: number, totalPages: number): PaginationToken[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set([1, totalPages, page - 1, page, page + 1]);
  if (page <= 3) {
    pages.add(2);
    pages.add(3);
    pages.add(4);
  }
  if (page >= totalPages - 2) {
    pages.add(totalPages - 3);
    pages.add(totalPages - 2);
    pages.add(totalPages - 1);
  }

  const sortedPages = Array.from(pages)
    .filter((value) => value >= 1 && value <= totalPages)
    .sort((left, right) => left - right);

  const tokens: PaginationToken[] = [];
  sortedPages.forEach((currentPage, index) => {
    const previousPage = sortedPages[index - 1];
    if (previousPage && currentPage - previousPage > 1) {
      if (currentPage - previousPage === 2) {
        tokens.push(previousPage + 1);
      } else {
        tokens.push(`gap-${previousPage}-${currentPage}`);
      }
    }
    tokens.push(currentPage);
  });

  return tokens;
}

function HighlightedCompanyName({ name, search }: { name: string; search: string }) {
  const trimmedSearch = search.trim();
  if (!trimmedSearch) return <>{name}</>;

  const parts = name.split(new RegExp(`(${escapeRegExp(trimmedSearch)})`, 'ig'));
  const searchText = trimmedSearch.toLocaleLowerCase('en-AU');

  return (
    <>
      {parts.map((part, index) => (
        part.toLocaleLowerCase('en-AU') === searchText ? (
          <mark key={`${part}-${index}`} className="rounded bg-[#FEF3C7] px-0.5 text-[#92400E]">
            {part}
          </mark>
        ) : (
          <span key={`${part}-${index}`}>{part}</span>
        )
      ))}
    </>
  );
}

function InitialFilterButton({
  filter,
  active,
  disabled,
  onClick,
}: {
  filter: SponsorCompaniesInitialFilter;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-testid={`sponsor-companies-alpha-${filter.id}`}
      aria-pressed={active}
      className={`flex h-[52px] min-w-0 flex-col items-center justify-center rounded-[16px] border text-center transition ${
        active
          ? 'border-[#1D4ED8] bg-[#EFF6FF] text-[#1D4ED8] shadow-sm'
          : 'border-[#E2E8F0] bg-white text-[#64748B] hover:border-[#BFDBFE] hover:text-[#1D4ED8]'
      } ${disabled ? 'cursor-not-allowed opacity-70' : ''}`}
    >
      <span className="text-sm font-black leading-none">{filter.label}</span>
      <span className="mt-1 text-[10px] font-extrabold leading-none">{filter.count.toLocaleString('en-AU')}</span>
    </button>
  );
}

export function SponsorCompaniesDirectory() {
  const [search, setSearch] = useState('');
  const [selectedInitial, setSelectedInitial] = useState(DEFAULT_INITIAL);
  const [page, setPage] = useState(1);
  const [isPreparingPdf, setIsPreparingPdf] = useState(false);
  const [downloadError, setDownloadError] = useState('');

  const trimmedSearch = search.trim();
  const isSearching = trimmedSearch.length > 0;
  const result = useMemo(
    () => querySponsorCompanies({
      search,
      initial: isSearching ? undefined : selectedInitial,
      page,
      pageSize: PAGE_SIZE,
    }),
    [isSearching, page, search, selectedInitial],
  );

  const paginationTokens = useMemo(
    () => getPaginationTokens(result.page, result.totalPages),
    [result.page, result.totalPages],
  );

  const hasResults = result.total > 0;
  const resultRangeLabel = hasResults
    ? `${result.startIndex.toLocaleString('en-AU')}-${result.endIndex.toLocaleString('en-AU')} of ${result.total.toLocaleString('en-AU')}`
    : '0';
  const listHeading = isSearching ? 'Search results' : `${selectedInitial} companies`;
  const activeInitial = result.initials.find((filter) => filter.id === selectedInitial);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
    setDownloadError('');
  };

  const handleInitialChange = (initial: string) => {
    setSelectedInitial(initial);
    setPage(1);
    setDownloadError('');
  };

  const clearSearch = () => {
    setSearch('');
    setPage(1);
  };

  const handleDownloadPdf = async () => {
    setIsPreparingPdf(true);
    setDownloadError('');

    try {
      const pdfExport = await createSponsorCompaniesPdf();
      await downloadSetuPdf({
        blob: pdfExport.blob,
        fileName: pdfExport.fileName,
        title: pdfExport.title,
      });
    } catch (error) {
      console.error('Sponsor companies PDF export failed:', error);
      setDownloadError('PDF could not be prepared right now.');
    } finally {
      setIsPreparingPdf(false);
    }
  };

  return (
    <div className="px-4 pb-6 pt-2" data-testid="sponsor-companies-directory">
      <section className="space-y-4">
          <div className="rounded-[24px] border border-[#E2E8F0] bg-white p-3">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" strokeWidth={1.8} />
              <input
                value={search}
                onChange={(event) => handleSearchChange(event.currentTarget.value)}
                placeholder="Search company name..."
                aria-label="Search sponsor companies"
                data-testid="sponsor-companies-search"
                className="h-12 w-full rounded-[18px] border border-[#D7E2F1] bg-[#F8FAFC] pl-11 pr-12 text-sm font-semibold text-[#0F172A] outline-none placeholder:text-[#94A3B8] focus:border-[#1D4ED8] focus:bg-white"
              />
              {search && (
                <button
                  type="button"
                  onClick={clearSearch}
                  aria-label="Clear sponsor companies search"
                  data-testid="sponsor-companies-clear-search"
                  className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-[#64748B] transition hover:bg-[#E2E8F0] hover:text-[#0F172A]"
                >
                  <X className="h-4 w-4" strokeWidth={2} />
                </button>
              )}
            </label>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isPreparingPdf}
              data-testid="sponsor-companies-download-pdf"
              className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[18px] bg-[#0F172A] px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-[#111827] disabled:cursor-wait disabled:bg-[#475569]"
            >
              {isPreparingPdf ? (
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
              ) : (
                <Download className="h-4 w-4" strokeWidth={2} />
              )}
              {isPreparingPdf ? 'Preparing PDF...' : 'Download PDF'}
            </button>

            {downloadError && (
              <p className="mt-2 text-sm font-bold leading-snug text-[#B91C1C]" role="status">
                {downloadError}
              </p>
            )}
          </div>

          <div className="rounded-[24px] border border-[#E2E8F0] bg-white p-3">
            <div className="mb-3 flex items-end justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-black text-[#0F172A]">Browse A-Z</p>
                <p className="mt-0.5 text-xs font-bold text-[#64748B]">
                  {isSearching ? 'Search is showing matches across every letter' : `${activeInitial?.count.toLocaleString('en-AU') || 0} in ${selectedInitial}`}
                </p>
              </div>
              {isSearching && (
                <span className="rounded-full border border-[#DBEAFE] bg-[#EFF6FF] px-3 py-1.5 text-xs font-black text-[#1D4ED8]">
                  All letters
                </span>
              )}
            </div>
            <div className="grid grid-cols-6 gap-1.5 min-[390px]:grid-cols-7 min-[520px]:grid-cols-9" aria-label="Sponsor company initials">
              {result.initials.map((filter) => (
                <InitialFilterButton
                  key={filter.id}
                  filter={filter}
                  active={!isSearching && selectedInitial === filter.id}
                  disabled={filter.count === 0}
                  onClick={() => handleInitialChange(filter.id)}
                />
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-[24px] border border-[#E2E8F0] bg-white">
            <div className="flex items-start justify-between gap-3 border-b border-[#E2E8F0] px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-black text-[#0F172A]">{listHeading}</p>
                <p className="mt-0.5 text-xs font-bold text-[#64748B]" data-testid="sponsor-companies-count">
                  Showing {resultRangeLabel}
                </p>
              </div>
              <span className="shrink-0 rounded-full border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-1 text-[10px] font-black text-[#64748B]">
                {isSearching ? 'Match' : selectedInitial}
              </span>
            </div>

            {hasResults ? (
              <ol className="divide-y divide-[#E2E8F0]" data-testid="sponsor-companies-list">
                {result.items.map((company, index) => (
                  <li key={company.id} className="grid grid-cols-[2.75rem_1fr_auto] items-start gap-3 px-4 py-3">
                    <span className="flex h-8 min-w-8 items-center justify-center rounded-full bg-[#EFF6FF] text-xs font-black text-[#1D4ED8]">
                      {result.startIndex + index}
                    </span>
                    <span className="min-w-0 break-words pt-1 text-sm font-bold leading-snug text-[#0F172A] [overflow-wrap:anywhere]">
                      <HighlightedCompanyName name={company.name} search={result.search} />
                    </span>
                    <span className="mt-0.5 rounded-full border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-1 text-[10px] font-black text-[#64748B]">
                      {company.initial}
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <div
                className="flex min-h-[220px] flex-col items-center justify-center px-6 py-10 text-center"
                data-testid="sponsor-companies-empty"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-[#D7E2F1] bg-[#F8FAFC] text-[#64748B]">
                  <Search className="h-5 w-5" strokeWidth={1.8} />
                </div>
                <p className="mt-4 text-base font-black text-[#0F172A]">No matches found</p>
                <p className="mt-2 max-w-[260px] text-sm leading-relaxed text-[#64748B]">
                  Try another company name or choose a different letter.
                </p>
              </div>
            )}
          </div>

          {result.totalPages > 1 && (
            <nav className="rounded-[24px] border border-[#E2E8F0] bg-white px-3 py-3" aria-label="Sponsor companies pagination">
              <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={result.page <= 1}
                  className="inline-flex h-11 items-center gap-1.5 rounded-[18px] border border-[#D7E2F1] bg-white px-3 text-sm font-black text-[#0F172A] disabled:text-[#94A3B8]"
                >
                  <ChevronLeft className="h-4 w-4" strokeWidth={2} />
                  Prev
                </button>
                <div className="flex min-w-0 items-center justify-center gap-1 overflow-hidden">
                  {paginationTokens.map((token) => (
                    typeof token === 'number' ? (
                      <button
                        key={token}
                        type="button"
                        onClick={() => setPage(token)}
                        data-testid={`sponsor-companies-page-${token}`}
                        aria-current={token === result.page ? 'page' : undefined}
                        className={`hidden h-9 min-w-9 rounded-full px-2 text-xs font-black min-[380px]:inline-flex min-[380px]:items-center min-[380px]:justify-center ${
                          token === result.page
                            ? 'bg-[#0F172A] text-white'
                            : 'border border-[#E2E8F0] bg-white text-[#64748B]'
                        }`}
                      >
                        {token}
                      </button>
                    ) : (
                      <span key={token} className="hidden px-1 text-sm font-black text-[#94A3B8] min-[380px]:inline">
                        ...
                      </span>
                    )
                  ))}
                  <span className="text-sm font-black text-[#64748B] min-[380px]:hidden">
                    {result.page}/{result.totalPages}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.min(result.totalPages, current + 1))}
                  disabled={result.page >= result.totalPages}
                  className="inline-flex h-11 items-center gap-1.5 rounded-[18px] border border-[#D7E2F1] bg-white px-3 text-sm font-black text-[#0F172A] disabled:text-[#94A3B8]"
                >
                  Next
                  <ChevronRight className="h-4 w-4" strokeWidth={2} />
                </button>
              </div>
            </nav>
          )}
      </section>
    </div>
  );
}
