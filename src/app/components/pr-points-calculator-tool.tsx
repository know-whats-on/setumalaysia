import { Fragment, useEffect, useState } from 'react';
import {
  AlertTriangle,
  Calculator,
  CheckCircle2,
  ExternalLink,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import {
  calculatePrPoints,
  fetchPrPointsSchema,
} from '../lib/api';
import {
  PR_POINTS_OFFICIAL_CALCULATOR_URL,
  countAnsweredPrPointsQuestions,
  getDefaultPrPointsSubclassId,
  type PrPointsAnswers,
  type PrPointsCalculationResult,
  type PrPointsHelpSegment,
  type PrPointsSchema,
} from '../lib/pr-points-calculator';
import { APP_CONFIG } from '../lib/app-config';

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

function getFriendlyPrPointsError(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : '';
  if (!message || /string did not match the expected pattern/i.test(message)) return fallback;
  return message;
}

function PrPointsQuestionHelp({ segments }: { segments: PrPointsHelpSegment[] }) {
  if (!segments.length) return null;

  return (
    <p className="mt-2 text-xs font-medium leading-relaxed text-[#64748B]">
      {segments.map((segment, index) => (
        <Fragment key={`${segment.type}-${segment.text}-${index}`}>
          {index > 0 ? ' ' : ''}
          {segment.type === 'link' && segment.href ? (
            <a
              href={segment.href}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-[#1D4ED8] underline decoration-[#93C5FD] underline-offset-2"
            >
              {segment.text}
            </a>
          ) : (
            <span>{segment.text}</span>
          )}
        </Fragment>
      ))}
    </p>
  );
}

export function PrPointsCalculatorTool() {
  const [schema, setSchema] = useState<PrPointsSchema | null>(null);
  const [selectedSubclassId, setSelectedSubclassId] = useState('');
  const [answers, setAnswers] = useState<PrPointsAnswers>({});
  const [result, setResult] = useState<PrPointsCalculationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const selectedSubclass = schema?.subclasses.find((subclass) => subclass.id === selectedSubclassId) || null;
  const answeredCount = selectedSubclass ? countAnsweredPrPointsQuestions(selectedSubclass.questions, answers) : 0;
  const questionCount = selectedSubclass?.questions.length || 0;

  const loadSchema = async () => {
    setLoading(true);
    setError('');
    setNotice('');

    try {
      const nextSchema = await fetchPrPointsSchema();
      const nextSubclassId = selectedSubclassId && nextSchema.subclasses.some((subclass) => subclass.id === selectedSubclassId)
        ? selectedSubclassId
        : getDefaultPrPointsSubclassId(nextSchema);

      setSchema(nextSchema);
      setSelectedSubclassId(nextSubclassId);
      setAnswers({});
      setResult(null);
      if (nextSchema.source.cacheStatus === 'stale') {
        setNotice('Using the latest cached Home Affairs calculator rules while the official page is temporarily unavailable.');
      }
    } catch (loadError) {
      console.error(`${APP_CONFIG.displayName} PR points schema load failed:`, loadError);
      setError(getFriendlyPrPointsError(loadError, 'PR Points could not load right now.'));
      setSchema(null);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSchema();
    // Load once on mount; manual reload handles refreshes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubclassChange = (nextSubclassId: string) => {
    setSelectedSubclassId(nextSubclassId);
    setAnswers({});
    setResult(null);
    setError('');
    setNotice('');
  };

  const handleAnswerChange = (questionKey: string, optionId: string) => {
    setAnswers((currentAnswers) => ({
      ...currentAnswers,
      [questionKey]: optionId,
    }));
    setResult(null);
    setError('');
  };

  const handleCalculate = async () => {
    if (!selectedSubclassId) return;
    setCalculating(true);
    setError('');

    try {
      const nextResult = await calculatePrPoints({
        subclassId: selectedSubclassId,
        answers,
      });
      setResult(nextResult);
      if (nextResult.source.cacheStatus === 'stale') {
        setNotice('Calculated with cached Home Affairs rules because the official page is temporarily unavailable.');
      }
    } catch (calculateError) {
      console.error(`${APP_CONFIG.displayName} PR points calculation failed:`, calculateError);
      setError(getFriendlyPrPointsError(calculateError, 'PR Points could not calculate right now.'));
      setResult(null);
    } finally {
      setCalculating(false);
    }
  };

  return (
    <div className="px-4 pb-6 pt-2">
      <div className="overflow-hidden rounded-[28px] border border-[#D7E2F1] bg-white shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
        <div className="relative overflow-hidden bg-[linear-gradient(135deg,#0F172A_0%,#1E3A8A_58%,#FACC15_160%)] px-5 py-5 text-white">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[#FACC15]/20 blur-2xl" />
          <div className="relative z-10 flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[20px] bg-white/12 ring-1 ring-white/20">
              <Calculator className="h-5 w-5" strokeWidth={1.7} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#FDE68A]">
                PR points
              </p>
              <h2 className="mt-1 text-xl font-bold leading-tight">Estimate your points</h2>
              <p className="mt-2 text-sm leading-relaxed text-blue-50">
                Uses the Home Affairs points calculator schema and calculates inside {APP_CONFIG.displayName}.
              </p>
            </div>
          </div>
        </div>

        <div className="border-b border-[#E2E8F0] bg-[#F8FAFC] px-5 py-4">
          <div className="flex items-start gap-3 rounded-[22px] border border-[#DBEAFE] bg-white px-4 py-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#1D4ED8]" strokeWidth={1.8} />
            <p className="text-xs leading-relaxed text-[#475569]">
              This is a guide only, not migration advice. Always check your circumstances against the official
              calculator or a registered migration professional before making decisions.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[360px] flex-col items-center justify-center gap-3 px-6 py-10 text-center">
            <LoaderCircle className="h-8 w-8 animate-spin text-[#1E40AF]" strokeWidth={1.8} />
            <p className="text-sm font-semibold text-[#0F172A]">Loading Home Affairs calculator rules...</p>
            <p className="max-w-xs text-sm leading-relaxed text-[#64748B]">
              We are fetching the official schema through the backend proxy.
            </p>
          </div>
        ) : error && !schema ? (
          <div className="flex min-h-[360px] flex-col items-center justify-center gap-4 px-6 py-10 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-[22px] border border-[#FCA5A5] bg-[#FEF2F2] text-[#B91C1C]">
              <AlertTriangle className="h-6 w-6" strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-base font-bold text-[#0F172A]">PR Points is unavailable</p>
              <p className="mt-2 text-sm leading-relaxed text-[#64748B]">{error}</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={() => void loadSchema()}
                className="inline-flex items-center gap-2 rounded-[18px] bg-[#0F172A] px-4 py-3 text-sm font-semibold text-white"
              >
                <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.8} />
                Try again
              </button>
              <a
                href={PR_POINTS_OFFICIAL_CALCULATOR_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-[18px] border border-[#D7E2F1] bg-white px-4 py-3 text-sm font-semibold text-[#1E40AF]"
              >
                <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.8} />
                Open official calculator
              </a>
            </div>
          </div>
        ) : schema && selectedSubclass ? (
          <div className="space-y-4 bg-[#F8FAFC] px-4 py-4">
            {notice && (
              <div className="rounded-[20px] border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3 text-xs leading-relaxed text-[#92400E]">
                {notice}
              </div>
            )}

            {error && (
              <div className="rounded-[20px] border border-[#FCA5A5] bg-[#FEF2F2] px-4 py-3 text-xs leading-relaxed text-[#991B1B]">
                {error}
              </div>
            )}

            <div className="rounded-[24px] border border-[#E2E8F0] bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#94A3B8]">Visa subclass</p>
                  <p className="mt-1 text-sm font-semibold text-[#0F172A]">Choose the calculator path</p>
                </div>
                <button
                  type="button"
                  onClick={() => void loadSchema()}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 rounded-[16px] border border-[#D7E2F1] bg-white px-3 py-2 text-xs font-semibold text-[#64748B] disabled:opacity-60"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} strokeWidth={1.7} />
                  Refresh
                </button>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                {schema.subclasses.map((subclass) => {
                  const active = subclass.id === selectedSubclass.id;
                  return (
                    <button
                      key={subclass.id}
                      type="button"
                      onClick={() => handleSubclassChange(subclass.id)}
                      className={`rounded-[18px] border px-3 py-3 text-left transition ${
                        active
                          ? 'border-[#1D4ED8] bg-[#EFF6FF] text-[#0F172A] shadow-[0_8px_18px_rgba(29,78,216,0.10)]'
                          : 'border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B]'
                      }`}
                    >
                      <span className="block text-sm font-bold">Subclass {subclass.id}</span>
                      <span className="mt-1 block line-clamp-2 text-[11px] leading-snug">{subclass.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-[24px] border border-[#E2E8F0] bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#94A3B8]">Progress</p>
                  <p className="mt-1 text-sm font-semibold text-[#0F172A]">
                    {answeredCount} of {questionCount} answered
                  </p>
                </div>
                <div className="rounded-full bg-[#EEF2FF] px-3 py-1 text-xs font-bold text-[#1D4ED8]">
                  {questionCount ? Math.round((answeredCount / questionCount) * 100) : 0}%
                </div>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#E2E8F0]">
                <div
                  className="h-full rounded-full bg-[#1D4ED8] transition-all"
                  style={{ width: `${questionCount ? Math.round((answeredCount / questionCount) * 100) : 0}%` }}
                />
              </div>
            </div>

            {selectedSubclass.questions.map((question, index) => (
              <section key={question.key} className="rounded-[24px] border border-[#E2E8F0] bg-white p-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F1F5F9] text-xs font-bold text-[#475569]">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold leading-relaxed text-[#0F172A]">{question.label}</h3>
                    <PrPointsQuestionHelp segments={question.helpSegments} />
                    <div className="mt-3 grid gap-2">
                      {question.options.map((option) => {
                        const active = answers[question.key] === option.id;
                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => handleAnswerChange(question.key, option.id)}
                            className={`flex items-start justify-between gap-3 rounded-[18px] border px-3 py-3 text-left transition ${
                              active
                                ? 'border-[#1D4ED8] bg-[#EFF6FF] shadow-[0_8px_18px_rgba(29,78,216,0.08)]'
                                : 'border-[#E2E8F0] bg-[#F8FAFC]'
                            }`}
                          >
                            <span className={`text-sm leading-relaxed ${active ? 'font-semibold text-[#0F172A]' : 'text-[#475569]'}`}>
                              {option.label}
                            </span>
                            <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${
                              active ? 'bg-[#DBEAFE] text-[#1D4ED8]' : 'bg-white text-[#64748B]'
                            }`}>
                              +{option.points}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </section>
            ))}

            <div className="sticky bottom-3 z-10 rounded-[24px] border border-[#CBD5E1] bg-white/95 p-3 shadow-[0_16px_38px_rgba(15,23,42,0.12)] backdrop-blur">
              <button
                type="button"
                onClick={() => void handleCalculate()}
                disabled={calculating || !selectedSubclassId}
                className="flex w-full items-center justify-center gap-2 rounded-[20px] bg-[#0F172A] px-4 py-4 text-sm font-bold text-white transition active:scale-[0.99] disabled:cursor-wait disabled:opacity-60"
              >
                {calculating ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={1.8} />
                ) : (
                  <Calculator className="h-4 w-4" strokeWidth={1.8} />
                )}
                Calculate points
              </button>
            </div>

            {result && (
              <div className="rounded-[28px] border border-[#BBF7D0] bg-[linear-gradient(180deg,#F7FFF9_0%,#ECFDF5_100%)] p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#15803D]">Estimated score</p>
                    <p className="mt-2 text-5xl font-black tracking-tight text-[#064E3B]">{result.totalPoints}</p>
                    <p className="mt-1 text-sm font-semibold text-[#166534]">points for {result.subclassLabel}</p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-[20px] bg-white text-[#16A34A] shadow-sm">
                    <CheckCircle2 className="h-6 w-6" strokeWidth={1.8} />
                  </div>
                </div>

                {result.missingAnswers.length > 0 && (
                  <div className="mt-4 rounded-[20px] border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3">
                    <p className="text-sm font-bold text-[#92400E]">
                      Answer {result.missingAnswers.length} more {result.missingAnswers.length === 1 ? 'section' : 'sections'} for a complete estimate.
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-[#B45309]">
                      Missing: {result.missingAnswers.slice(0, 3).map((item) => item.questionLabel).join(', ')}
                      {result.missingAnswers.length > 3 ? '...' : ''}
                    </p>
                  </div>
                )}

                {result.breakdown.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {result.breakdown.map((item) => (
                      <div key={item.questionKey} className="flex items-start justify-between gap-3 rounded-[18px] bg-white px-3 py-3">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#0F172A]">{item.questionLabel}</p>
                          <p className="mt-1 text-xs leading-relaxed text-[#64748B]">{item.optionLabel}</p>
                        </div>
                        <span className="shrink-0 rounded-full bg-[#DCFCE7] px-2.5 py-1 text-xs font-bold text-[#15803D]">
                          +{item.points}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="rounded-[22px] border border-[#E2E8F0] bg-white px-4 py-4">
              <p className="text-xs leading-relaxed text-[#64748B]">
                Source: {schema.source.name}. {schema.source.lastUpdated ? `Official page last updated ${schema.source.lastUpdated}. ` : ''}
                Rules fetched {formatSourceDate(schema.source.fetchedAt) || 'recently'}.
              </p>
              <a
                href={PR_POINTS_OFFICIAL_CALCULATOR_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-[#1D4ED8]"
              >
                <ExternalLink className="h-4 w-4" strokeWidth={1.8} />
                Open official calculator
              </a>
            </div>
          </div>
        ) : (
          <div className="px-6 py-10 text-center text-sm text-[#64748B]">
            No supported visa subclasses are available right now.
          </div>
        )}
      </div>
    </div>
  );
}
