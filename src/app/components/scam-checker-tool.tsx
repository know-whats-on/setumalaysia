import { useCallback, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { jsPDF } from 'jspdf';
import { AlertTriangle, ArrowLeft, ChevronRight, Download, LoaderCircle, Plus, ShieldAlert, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router';
import {
  analyzeScamCheck,
  createScamCheck,
  deleteScamCheck,
  fetchScamChecks,
  updateScamCheck,
} from '../lib/api';
import { APP_CONFIG } from '../lib/app-config';
import { HoodieShareActions } from './share/hoodie-share-actions';
import { buildScamCheckShareDescriptor } from '../lib/hoodie-share';
import { buildFallbackScamAiReport, evaluateScamCheck, normalizeScamCheckDraft } from '../lib/scam-checker';
import { downloadSetuPdf } from '../lib/setu-pdf';
import type { Evidence } from '../lib/mock-data';
import type {
  ScamCheckAiReport,
  ScamCheckDraft,
  ScamContactType,
  ScamContractStatus,
  ScamInspectionType,
  ScamPaymentMethod,
  ScamPaymentTiming,
  ScamPressureSignal,
  ScamProofStatus,
} from '../lib/prepare-types';

interface ScamCheckerToolProps {
  evidence: Evidence[];
  onFocusChange: (active: boolean, subtitle?: string) => void;
}

const SCAM_CHECK_STEPS = [
  { id: 'listing', label: 'Listing' },
  { id: 'inspection', label: 'Inspection' },
  { id: 'payment', label: 'Money' },
  { id: 'evidence', label: 'Evidence' },
] as const;

const PRESSURE_SIGNAL_OPTIONS: Array<{ value: ScamPressureSignal; label: string }> = [
  { value: 'urgent-payment', label: 'Pushes for immediate payment' },
  { value: 'many-people-waiting', label: 'Says many applicants are waiting' },
  { value: 'limited-time-discount', label: 'Offers a discount if you pay now' },
  { value: 'won-t-answer-questions', label: 'Avoids direct questions' },
  { value: 'pushes-off-platform', label: 'Pushes you off the listing platform quickly' },
];

function parseNumberInput(value: string) {
  if (!value.trim()) return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function formatRecordDate(value: string, fallback = 'Recently') {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return fallback;
  return format(parsed, 'dd MMM yyyy');
}

function getFriendlyPrepareError(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  if (/string did not match the expected pattern/i.test(message)) {
    return fallback;
  }
  return message || fallback;
}

function createEmptyScamCheck(email: string): ScamCheckDraft {
  return {
    id: '',
    check_number: '',
    email,
    listing_url: '',
    listing_platform: '',
    contact_name: '',
    weekly_rent: null,
    bond_amount: null,
    upfront_payment_amount: null,
    payment_timing: 'none',
    inspection_type: 'unclear',
    contact_type: 'unknown',
    payment_method: 'not-specified',
    proof_status: 'unclear',
    contract_status: 'unclear',
    pressure_signals: [],
    notes: '',
    external_link: '',
    document_item_ids: [],
    ai_analysis: null,
    created_at: '',
    updated_at: '',
  };
}

function getScamCheckTitle(draft: ScamCheckDraft) {
  if (draft.listing_platform) return draft.listing_platform;
  if (draft.listing_url) return draft.listing_url;
  return 'Untitled scam check';
}

function getScamRiskStyles(riskBand: 'low' | 'medium' | 'high') {
  if (riskBand === 'high') {
    return {
      card: 'border-[#FECACA] bg-[linear-gradient(180deg,#FFF7F7_0%,#FEF2F2_100%)]',
      badge: 'bg-[#B91C1C] text-white',
      subtle: 'bg-[#FEF2F2] text-[#B91C1C]',
    };
  }
  if (riskBand === 'medium') {
    return {
      card: 'border-[#FDE68A] bg-[linear-gradient(180deg,#FFFDF5_0%,#FFF7ED_100%)]',
      badge: 'bg-[#C2410C] text-white',
      subtle: 'bg-[#FFF7ED] text-[#C2410C]',
    };
  }
  return {
    card: 'border-[#BFDBFE] bg-[linear-gradient(180deg,#F8FBFF_0%,#EFF6FF_100%)]',
    badge: 'bg-[#1D4ED8] text-white',
    subtle: 'bg-[#EFF6FF] text-[#1D4ED8]',
  };
}

function hasSavedScamReport(draft: ScamCheckDraft) {
  return Boolean(draft.ai_analysis);
}

export function ScamCheckerTool({ evidence, onFocusChange }: ScamCheckerToolProps) {
  const navigate = useNavigate();
  const email = localStorage.getItem('ghar_email') || '';
  const [checks, setChecks] = useState<ScamCheckDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'list' | 'edit' | 'result'>('list');
  const [stepIndex, setStepIndex] = useState(0);
  const [draft, setDraft] = useState<ScamCheckDraft>(() => createEmptyScamCheck(email));
  const [saving, setSaving] = useState(false);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [exportError, setExportError] = useState('');
  const [notice, setNotice] = useState('');

  const evaluation = useMemo(() => evaluateScamCheck(draft), [draft]);
  const report = useMemo(() => {
    const fallbackReport = buildFallbackScamAiReport(draft, evaluation);
    if (!draft.ai_analysis) return fallbackReport;
    return {
      ...fallbackReport,
      ...draft.ai_analysis,
      safety_score: evaluation.safety_score,
      overall_assessment: draft.ai_analysis.overall_assessment || fallbackReport.overall_assessment,
      positive_signals: draft.ai_analysis.positive_signals.length > 0 ? draft.ai_analysis.positive_signals : fallbackReport.positive_signals,
      watchouts: draft.ai_analysis.watchouts.length > 0 ? draft.ai_analysis.watchouts : fallbackReport.watchouts,
      rubric_breakdown: draft.ai_analysis.rubric_breakdown.length > 0 ? draft.ai_analysis.rubric_breakdown : fallbackReport.rubric_breakdown,
      verification_steps: draft.ai_analysis.verification_steps.length > 0 ? draft.ai_analysis.verification_steps : fallbackReport.verification_steps,
      recommended_actions: draft.ai_analysis.recommended_actions.length > 0 ? draft.ai_analysis.recommended_actions : fallbackReport.recommended_actions,
    };
  }, [draft, evaluation]);
  const reportStyles = useMemo(() => getScamRiskStyles(evaluation.risk_band), [evaluation.risk_band]);
  const sortedChecks = useMemo(
    () => [...checks].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()),
    [checks],
  );
  const shareEnabled = Boolean(APP_CONFIG.shareBaseUrl);

  const loadChecks = useCallback(async () => {
    if (!email) {
      setChecks([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      setChecks(await fetchScamChecks(email));
      setError('');
      setExportError('');
      setNotice('');
    } catch (loadError) {
      console.error('Hoodie scam checks load failed:', loadError);
      setError('');
      setExportError('');
      setNotice('Saved Scam Checker drafts are unavailable right now. You can still start a new check.');
    } finally {
      setLoading(false);
    }
  }, [email]);

  useEffect(() => {
    void loadChecks();
  }, [loadChecks]);

  useEffect(() => {
    onFocusChange(false, 'Scam Checker');
    return () => onFocusChange(false, 'Scam Checker');
  }, [onFocusChange]);

  const patchDraft = <K extends keyof ScamCheckDraft>(key: K, value: ScamCheckDraft[K]) => {
    setDraft((currentDraft) => ({ ...currentDraft, [key]: value }));
    setError('');
    setExportError('');
  };

  const handleStartNew = () => {
    setDraft(createEmptyScamCheck(email));
    setMode('edit');
    setStepIndex(0);
    setNotice('');
    setError('');
    setExportError('');
  };

  const handleOpenCheck = (check: ScamCheckDraft) => {
    const normalizedCheck = normalizeScamCheckDraft(check, email);
    setDraft(normalizedCheck);
    setMode(hasSavedScamReport(normalizedCheck) ? 'result' : 'edit');
    setStepIndex(0);
    setNotice('');
    setError('');
    setExportError('');
  };

  const persistDraft = useCallback(async (nextDraft?: ScamCheckDraft) => {
    const candidate = nextDraft || draft;
    if (!email) throw new Error('No signed-in email found.');

    const payload = {
      email,
      listing_url: candidate.listing_url,
      listing_platform: candidate.listing_platform,
      contact_name: candidate.contact_name,
      weekly_rent: candidate.weekly_rent,
      bond_amount: candidate.bond_amount,
      upfront_payment_amount: candidate.upfront_payment_amount,
      payment_timing: candidate.payment_timing,
      inspection_type: candidate.inspection_type,
      contact_type: candidate.contact_type,
      payment_method: candidate.payment_method,
      proof_status: candidate.proof_status,
      contract_status: candidate.contract_status,
      pressure_signals: candidate.pressure_signals,
      notes: candidate.notes,
      external_link: candidate.external_link,
      document_item_ids: candidate.document_item_ids,
      ai_analysis: candidate.ai_analysis,
    };

    if (candidate.id) {
      const updated = await updateScamCheck(candidate.id, payload);
      setDraft(updated);
      setChecks((currentChecks) => currentChecks.map((item) => (item.id === updated.id ? updated : item)));
      return updated;
    }

    const created = await createScamCheck(payload);
    setDraft(created);
    setChecks((currentChecks) => [created, ...currentChecks]);
    return created;
  }, [draft, email]);

  const handleSave = async () => {
    setSaving(true);
    setNotice('');
    setError('');
    setExportError('');
    try {
      await persistDraft();
      setNotice('Scam Checker saved.');
    } catch (saveError) {
      console.error('Hoodie scam check save failed:', saveError);
      setError(getFriendlyPrepareError(saveError, 'Scam Checker could not be saved right now.'));
    } finally {
      setSaving(false);
    }
  };

  const exportScamCheckPdf = useCallback(async (record: ScamCheckDraft) => {
    const result = evaluateScamCheck(record);
    const narrative = {
      ...buildFallbackScamAiReport(record, result),
      ...(record.ai_analysis || {}),
      safety_score: result.safety_score,
      rubric_breakdown: (record.ai_analysis?.rubric_breakdown?.length ? record.ai_analysis.rubric_breakdown : result.rubric_breakdown),
    };
    const selectedDocuments = record.document_item_ids
      .map((itemId) => evidence.find((item) => item.id === itemId))
      .filter(Boolean) as Evidence[];

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const margin = 18;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const contentWidth = pageWidth - margin * 2;
    let y = margin;

    const addPageIfNeeded = (needed: number) => {
      if (y + needed > pageHeight - 16) {
        doc.addPage();
        y = margin;
      }
    };

    const drawBlock = (label: string, value: string) => {
      addPageIfNeeded(10);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(label.toUpperCase(), margin, y);
      y += 4;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      const lines = doc.splitTextToSize(value || 'Not provided', contentWidth);
      doc.text(lines, margin, y);
      y += lines.length * 5 + 3;
    };

    doc.setFillColor(30, 64, 175);
    doc.rect(0, 0, pageWidth, 32, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(19);
    doc.setTextColor(255, 255, 255);
    doc.text('Scam Checker Report', margin, 16);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Prepared ${format(new Date(), 'dd MMM yyyy')}`, pageWidth - margin, 16, { align: 'right' });

    y = 42;
    drawBlock('Listing', [record.listing_platform, record.listing_url].filter(Boolean).join(' • '));
    drawBlock('Contact', [record.contact_name, record.contact_type].filter(Boolean).join(' • '));
    drawBlock('Inspection', [record.inspection_type, record.proof_status].filter(Boolean).join(' • '));
    drawBlock('Money and payment', [
      record.weekly_rent !== null ? `$${record.weekly_rent}/week` : '',
      record.bond_amount !== null ? `Bond $${record.bond_amount}` : '',
      record.upfront_payment_amount !== null ? `Upfront $${record.upfront_payment_amount}` : '',
      record.payment_timing,
      record.payment_method,
    ].filter(Boolean).join(' • '));

    addPageIfNeeded(14);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('REPORT SUMMARY', margin, y);
    y += 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text(narrative.headline || `${result.risk_band.toUpperCase()} RISK`, margin, y);
    y += 7;

    drawBlock('Safety score', `${result.safety_score}/100`);
    drawBlock('Risk result', `${result.risk_band.toUpperCase()} RISK${result.hard_stop ? ' • HARD STOP' : ''}`);
    drawBlock('Executive summary', narrative.executive_summary);
    drawBlock('Overall assessment', narrative.overall_assessment);
    drawBlock('What looks okay', narrative.positive_signals.join(' • ') || 'No strong positive signals were recorded yet.');
    drawBlock('What needs checking', narrative.watchouts.join(' • ') || 'No major watchouts were triggered.');
    drawBlock('Why this matters', narrative.risk_explanation);
    narrative.rubric_breakdown.forEach((section) => {
      drawBlock(`${section.label} (${section.score}/${section.max_score})`, section.summary);
    });
    drawBlock('What to verify next', narrative.verification_steps.join(' • '));
    drawBlock('Recommended actions', narrative.recommended_actions.join(' • '));
    drawBlock('Triggered flags', result.flags.length > 0 ? result.flags.map((flag) => flag.label).join(', ') : 'No major red flags were triggered.');
    drawBlock('Notes', record.notes || record.external_link || 'Not provided');

    addPageIfNeeded(12);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('ATTACHED DOCUMENTS', margin, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    if (selectedDocuments.length === 0) {
      doc.text('No evidence items selected.', margin, y);
      y += 6;
    } else {
      selectedDocuments.forEach((item) => {
        addPageIfNeeded(8);
        const lines = doc.splitTextToSize(item.filename, contentWidth);
        doc.text(lines, margin, y);
        y += lines.length * 5 + 1;
      });
    }

    const totalPages = doc.getNumberOfPages();
    for (let page = 1; page <= totalPages; page += 1) {
      doc.setPage(page);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(`${APP_CONFIG.displayName} • Scam Checker`, margin, pageHeight - 8);
      doc.text(`Page ${page} of ${totalPages}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
    }

    await downloadSetuPdf({
      blob: doc.output('blob'),
      fileName: `${(record.check_number || 'scam-check').replace(/\s+/g, '-').toLowerCase()}.pdf`,
      title: `${APP_CONFIG.displayName} Scam Checker`,
    });
  }, [evidence]);

  const handleExport = async (record?: ScamCheckDraft) => {
    let candidate = normalizeScamCheckDraft(record || draft, email);
    const exportId = candidate.id || 'draft';
    setExportingId(exportId);
    setNotice('');
    setExportError('');
    try {
      candidate = await persistDraft(candidate);
      await exportScamCheckPdf(candidate);
      setNotice('Scam Checker saved.');
    } catch (exportError) {
      console.error('Hoodie scam check export failed:', exportError);
      setExportError(getFriendlyPrepareError(exportError, 'Scam Checker could not be exported right now.'));
    } finally {
      setExportingId(null);
    }
  };

  const handleRunCheck = async () => {
    setSaving(true);
    setError('');
    setExportError('');
    setNotice('');
    try {
      const baseDraft = normalizeScamCheckDraft(draft, email);
      let savedDraft = baseDraft;
      let saveFailed = false;

      try {
        savedDraft = await persistDraft(baseDraft);
      } catch (runError) {
        console.error('Hoodie scam check save failed before analysis:', runError);
        saveFailed = true;
        setNotice('Scam Checker could not be saved right now. Showing your report from the answers currently on screen.');
      }

      let nextReport: ScamCheckAiReport;
      try {
        nextReport = await analyzeScamCheck(savedDraft, evaluateScamCheck(savedDraft));
      } catch (analysisError) {
        console.error('Hoodie scam check AI analysis failed:', analysisError);
        nextReport = buildFallbackScamAiReport(savedDraft, evaluateScamCheck(savedDraft));
        setNotice(saveFailed
          ? 'Draft saving and AI analysis are unavailable right now. Showing a rule-based safety report from your answers.'
          : 'AI analysis is unavailable right now. Showing a rule-based safety report from your answers.');
      }

      const analyzedDraft = normalizeScamCheckDraft({
        ...savedDraft,
        ai_analysis: nextReport,
      }, email);
      setDraft(analyzedDraft);

      if (savedDraft.id) {
        try {
          const updated = await updateScamCheck(savedDraft.id, {
            email,
            ai_analysis: nextReport,
          });
          setDraft(updated);
          setChecks((currentChecks) => currentChecks.map((item) => (item.id === updated.id ? updated : item)));
          setNotice(saveFailed ? 'Report updated, but your earlier answers could not be fully saved.' : 'Scam report saved.');
        } catch (analysisSaveError) {
          console.error('Hoodie scam check analysis save failed:', analysisSaveError);
          setNotice('Report updated on screen, but saving the latest analysis did not finish.');
        }
      } else {
        setNotice(saveFailed ? 'Showing the report from your current answers. Save it when you can.' : 'Scam report ready.');
      }
    } catch (runError) {
      console.error('Hoodie scam check run failed:', runError);
      setError(getFriendlyPrepareError(runError, 'Scam Checker could not be analyzed right now.'));
    } finally {
      setMode('result');
      setSaving(false);
    }
  };

  const handleDelete = async (check: ScamCheckDraft) => {
    if (!window.confirm('Delete this scam check draft?')) return;
    setDeletingId(check.id);
    setNotice('');
    setError('');
    setExportError('');
    try {
      await deleteScamCheck(check.id, email);
      setChecks((currentChecks) => currentChecks.filter((item) => item.id !== check.id));
      if (draft.id === check.id) {
        setMode('list');
      }
      setNotice('Scam check deleted.');
    } catch (deleteError) {
      console.error('Hoodie scam check delete failed:', deleteError);
      setError(getFriendlyPrepareError(deleteError, 'Scam Checker could not be deleted right now.'));
    } finally {
      setDeletingId(null);
    }
  };

  const inputClass = 'w-full min-w-0 max-w-full rounded-[18px] border border-[#E2E8F0] bg-white px-4 py-3 text-sm text-[#0F172A] outline-none transition focus:border-[#1E40AF] focus:ring-2 focus:ring-[#1E40AF]/10';
  const textareaClass = `${inputClass} min-h-[128px] resize-none`;
  const labelClass = 'mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[#94A3B8]';
  const panelClass = 'min-w-0 max-w-full overflow-x-hidden rounded-[28px] border border-[#E2E8F0] bg-white p-4 shadow-sm';

  if (loading) {
    return (
      <div className="flex min-h-[280px] items-center justify-center">
        <LoaderCircle className="h-6 w-6 animate-spin text-[#1E40AF]" />
      </div>
    );
  }

  if (mode === 'list') {
    return (
      <div className="min-h-0 min-w-0 space-y-4 overflow-x-hidden px-4 pb-4 pt-2">
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[#0F172A]">Scam Checker</p>
            <p className="text-xs text-[#64748B]">Run a professional-looking check before you send money, ID, or trust.</p>
          </div>
          <button
            type="button"
            onClick={handleStartNew}
            className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-[18px] bg-[#0F172A] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1E293B]"
          >
            <Plus className="h-4 w-4" strokeWidth={2} />
            Start New
          </button>
        </div>

        {notice ? (
          <div className="rounded-[20px] border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3 text-sm text-[#92400E]">
            {notice}
          </div>
        ) : null}
        {error ? <p className="text-sm text-[#B91C1C]">{error}</p> : null}
        {exportError ? <p className="text-sm text-[#B91C1C]">{exportError}</p> : null}

        {sortedChecks.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-[#CBD5E1] bg-white px-6 py-10 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[20px] border border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B]">
              <ShieldAlert className="h-5 w-5" strokeWidth={1.5} />
            </div>
            <p className="mt-4 text-base font-semibold text-[#0F172A]">No scam checks yet</p>
            <p className="mt-2 text-sm leading-relaxed text-[#64748B]">
              Run a quick listing check before sharing money, ID, or trust.
            </p>
          </div>
        ) : (
          sortedChecks.map((check) => {
            const result = evaluateScamCheck(check);
            return (
              <div key={check.id} className="rounded-[28px] border border-[#E2E8F0] bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-[#0F172A]">{getScamCheckTitle(check)}</p>
                  <p className="mt-1 text-sm text-[#64748B]">{check.listing_url || 'Saved listing review'}</p>
                  <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.16em] text-[#94A3B8]">
                    {hasSavedScamReport(check) ? 'Latest report saved' : 'Draft answers saved'}
                  </p>
                </div>
                <span
                    className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${
                      result.risk_band === 'high'
                        ? 'bg-[#FEF2F2] text-[#B91C1C]'
                        : result.risk_band === 'medium'
                          ? 'bg-[#FFF7ED] text-[#C2410C]'
                          : 'bg-[#ECFDF5] text-[#16A34A]'
                    }`}
                  >
                    {result.risk_band}
                  </span>
                </div>

                <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.16em] text-[#94A3B8]">
                  Updated {formatRecordDate(check.updated_at)}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenCheck(check)}
                    className="inline-flex items-center gap-2 rounded-[18px] bg-[#F8FAFC] px-4 py-3 text-sm font-semibold text-[#0F172A] transition hover:bg-[#EEF2FF]"
                  >
                    {hasSavedScamReport(check) ? 'Open Report' : 'Resume Check'}
                    <ChevronRight className="h-4 w-4" strokeWidth={2} />
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleExport(check)}
                    className="inline-flex items-center gap-2 rounded-[18px] border border-[#DBEAFE] px-4 py-3 text-sm font-semibold text-[#1E40AF] transition hover:bg-[#EFF6FF]"
                  >
                    {exportingId === check.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" strokeWidth={1.8} />}
                    Export PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(check)}
                    className="inline-flex items-center gap-2 rounded-[18px] border border-[#FECACA] px-4 py-3 text-sm font-semibold text-[#B91C1C] transition hover:bg-[#FEF2F2]"
                  >
                    {deletingId === check.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" strokeWidth={1.8} />}
                    Delete
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    );
  }

  if (mode === 'result') {
    return (
      <div className="min-h-0 min-w-0 space-y-4 overflow-x-hidden px-4 pb-4 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setMode('edit')}
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#64748B] transition hover:text-[#0F172A]"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.8} />
            Edit Answers
          </button>
          <button
            type="button"
            onClick={() => setMode('list')}
            className="text-sm font-semibold text-[#64748B] transition hover:text-[#0F172A]"
          >
            Back to Checks
          </button>
        </div>

        {notice ? (
          <div className="rounded-[20px] border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3 text-sm text-[#92400E]">
            {notice}
          </div>
        ) : null}
        {error ? <p className="text-sm text-[#B91C1C]">{error}</p> : null}
        {exportError ? <p className="text-sm text-[#B91C1C]">{exportError}</p> : null}

        <div className={`rounded-[28px] border p-5 shadow-sm ${reportStyles.card}`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#64748B]">Scam Report</p>
              <div className="mt-4 flex items-end gap-3">
                <p className="text-4xl font-semibold leading-none text-[#0F172A]">{evaluation.safety_score}</p>
                <p className="pb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#64748B]">Safety score / 100</p>
              </div>
              <p className="mt-4 text-2xl font-semibold text-[#0F172A]">{report.headline}</p>
              <p className="mt-3 text-sm leading-relaxed text-[#334155]">{report.executive_summary}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${reportStyles.badge}`}>
                {evaluation.risk_band} risk
              </span>
              {evaluation.hard_stop ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-[#0F172A] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white">
                  <AlertTriangle className="h-3.5 w-3.5" strokeWidth={1.8} />
                  Hard stop
                </span>
              ) : null}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${reportStyles.subtle}`}>
              {evaluation.flags.length} flag{evaluation.flags.length === 1 ? '' : 's'} triggered
            </span>
            <span className="rounded-full bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#475569]">
              Generated {formatRecordDate(report.generated_at, 'Today')}
            </span>
          </div>
        </div>
        {shareEnabled ? (
          <HoodieShareActions
            descriptor={buildScamCheckShareDescriptor({
              riskBand: evaluation.risk_band,
              flagCount: evaluation.flags.length,
            })}
            confirmation={{
              title: 'Share a redacted scam summary?',
              description: 'This share keeps the result generic. It will not include the listing URL, contact name, notes, or attached files.',
            }}
          />
        ) : null}

        <div className={panelClass}>
          <p className="text-sm font-semibold text-[#0F172A]">Overall assessment</p>
          <p className="mt-3 text-sm leading-relaxed text-[#475569]">{report.overall_assessment}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className={panelClass}>
            <p className="text-sm font-semibold text-[#0F172A]">What looks okay</p>
            <div className="mt-3 space-y-2">
              {report.positive_signals.map((item) => (
                <div key={item} className="rounded-[18px] bg-[#F8FAFC] px-4 py-3 text-sm text-[#334155]">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className={panelClass}>
            <p className="text-sm font-semibold text-[#0F172A]">What needs checking</p>
            <div className="mt-3 space-y-2">
              {report.watchouts.map((item) => (
                <div key={item} className="rounded-[18px] bg-[#F8FAFC] px-4 py-3 text-sm text-[#334155]">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={panelClass}>
          <p className="text-sm font-semibold text-[#0F172A]">Score breakdown</p>
          <div className="mt-3 space-y-3">
            {report.rubric_breakdown.map((section) => (
              <div key={section.key} className="rounded-[20px] border border-[#E2E8F0] bg-[#F8FAFC] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#0F172A]">{section.label}</p>
                    <p className="mt-2 text-sm leading-relaxed text-[#475569]">{section.summary}</p>
                  </div>
                  <div className="shrink-0 rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#475569]">
                    {section.score}/{section.max_score}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={panelClass}>
          <p className="text-sm font-semibold text-[#0F172A]">Why this score landed here</p>
          <p className="mt-3 text-sm leading-relaxed text-[#475569]">{report.risk_explanation}</p>
        </div>

        <div className={panelClass}>
          <p className="text-sm font-semibold text-[#0F172A]">What to verify next</p>
          <div className="mt-3 space-y-2">
            {report.verification_steps.map((step) => (
              <p key={step} className="text-sm leading-relaxed text-[#475569]">{step}</p>
            ))}
          </div>
        </div>

        <div className={panelClass}>
          <p className="text-sm font-semibold text-[#0F172A]">Recommended next steps</p>
          <div className="mt-3 space-y-2">
            {report.recommended_actions.map((step) => (
              <p key={step} className="text-sm leading-relaxed text-[#475569]">{step}</p>
            ))}
          </div>
        </div>

        <div className={panelClass}>
          <p className="text-sm font-semibold text-[#0F172A]">Triggered signals</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {evaluation.flags.length > 0 ? evaluation.flags.map((flag) => (
              <span
                key={flag.key}
                className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${
                  flag.hard_stop ? 'bg-[#FEE2E2] text-[#B91C1C]' : 'bg-[#F8FAFC] text-[#475569]'
                }`}
              >
                {flag.label}
              </span>
            )) : (
              <span className="text-sm text-[#64748B]">No major red flags were triggered.</span>
            )}
          </div>
        </div>

        <div className="mb-4 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => navigate('/dashboard?action=report&category=scam')}
            className="rounded-[18px] bg-[#0F172A] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1E293B]"
          >
            Report Scam
          </button>
          <button
            type="button"
            onClick={() => navigate('/profile?tab=evidence')}
            className="rounded-[18px] border border-[#DBEAFE] px-4 py-3 text-sm font-semibold text-[#1E40AF] transition hover:bg-[#EFF6FF]"
          >
            Open Evidence
          </button>
          <button
            type="button"
            onClick={() => navigate('/arrival', { state: { hoodienieLandingToken: Date.now() } })}
            className="rounded-[18px] border border-[#E2E8F0] bg-white px-4 py-3 text-sm font-semibold text-[#0F172A] transition hover:bg-[#F8FAFC]"
          >
            Talk to Hoodienie
          </button>
          <button
            type="button"
            onClick={() => void handleExport()}
            className="inline-flex items-center justify-center gap-2 rounded-[18px] border border-[#DBEAFE] px-4 py-3 text-sm font-semibold text-[#1E40AF] transition hover:bg-[#EFF6FF]"
          >
            {exportingId === (draft.id || 'draft') ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" strokeWidth={1.8} />}
            Export PDF
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-0 min-h-0 min-w-0 max-w-full overflow-x-hidden pb-4">
      <div className="border-b border-[#E2E8F0] px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              setError('');
              setExportError('');
              setMode('list');
            }}
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#64748B] transition hover:text-[#0F172A]"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.8} />
            Back
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-[18px] border border-[#DBEAFE] px-4 py-3 text-sm font-semibold text-[#1E40AF] transition hover:bg-[#EFF6FF] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
            Save Draft
          </button>
        </div>
      </div>

      <div className="px-4 pb-1 pt-4">
        <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-4 [&>*]:min-w-0">
          {SCAM_CHECK_STEPS.map((step, index) => {
            const active = index === stepIndex;
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => setStepIndex(index)}
                className={`flex min-w-0 items-center justify-center rounded-[18px] px-2 py-3 text-center text-[13px] font-semibold leading-tight transition ${
                  active
                    ? 'bg-[#0F172A] text-white'
                    : 'border border-[#E2E8F0] bg-white text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                {step.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-w-0 max-w-full space-y-4 overflow-x-hidden px-4 pt-4">
        {notice ? (
          <div className="rounded-[20px] border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3 text-sm text-[#92400E]">
            {notice}
          </div>
        ) : null}
        {error ? <p className="text-sm text-[#B91C1C]">{error}</p> : null}
        {exportError ? <p className="text-sm text-[#B91C1C]">{exportError}</p> : null}

        {stepIndex === 0 ? (
          <div className={panelClass}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={labelClass}>Listing URL</label>
                <input className={inputClass} value={draft.listing_url} onChange={(event) => patchDraft('listing_url', event.target.value)} placeholder="Paste the listing URL or shared link" />
              </div>
              <div>
                <label className={labelClass}>Where did you find it?</label>
                <input className={inputClass} value={draft.listing_platform} onChange={(event) => patchDraft('listing_platform', event.target.value)} placeholder="e.g. Flatmates, Facebook, Domain" />
              </div>
              <div>
                <label className={labelClass}>Contact Name</label>
                <input className={inputClass} value={draft.contact_name} onChange={(event) => patchDraft('contact_name', event.target.value)} placeholder="Agent, landlord, or tenant name" />
              </div>
              <div>
                <label className={labelClass}>Weekly Rent (AUD)</label>
                <input className={inputClass} inputMode="decimal" value={draft.weekly_rent ?? ''} onChange={(event) => patchDraft('weekly_rent', parseNumberInput(event.target.value))} />
              </div>
            </div>
          </div>
        ) : null}

        {stepIndex === 1 ? (
          <div className={panelClass}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Can you inspect it?</label>
                <select className={inputClass} value={draft.inspection_type} onChange={(event) => patchDraft('inspection_type', event.target.value as ScamInspectionType)}>
                  <option value="unclear">Unclear</option>
                  <option value="in-person-available">In person available</option>
                  <option value="video-only">Video only</option>
                  <option value="not-offered">No inspection offered</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Who are you speaking to?</label>
                <select className={inputClass} value={draft.contact_type} onChange={(event) => patchDraft('contact_type', event.target.value as ScamContactType)}>
                  <option value="unknown">Unknown</option>
                  <option value="agent">Agent</option>
                  <option value="landlord">Landlord</option>
                  <option value="current-tenant">Current tenant</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Can they prove they manage this place?</label>
                <select className={inputClass} value={draft.proof_status} onChange={(event) => patchDraft('proof_status', event.target.value as ScamProofStatus)}>
                  <option value="unclear">Still unclear</option>
                  <option value="verified-agency">Verified agency profile</option>
                  <option value="owner-proof-shown">Owner proof shown</option>
                  <option value="refused">Refused to show proof</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Have they shared lease paperwork?</label>
                <select className={inputClass} value={draft.contract_status} onChange={(event) => patchDraft('contract_status', event.target.value as ScamContractStatus)}>
                  <option value="lease-shared">Lease or paperwork shared</option>
                  <option value="promised-after-approval">Promised after approval</option>
                  <option value="unclear">Still unclear</option>
                  <option value="refused">Refused or avoided it</option>
                </select>
              </div>
            </div>
          </div>
        ) : null}

        {stepIndex === 2 ? (
          <div className={panelClass}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Bond Amount (AUD)</label>
                <input className={inputClass} inputMode="decimal" value={draft.bond_amount ?? ''} onChange={(event) => patchDraft('bond_amount', parseNumberInput(event.target.value))} />
              </div>
              <div>
                <label className={labelClass}>Upfront Payment Ask (AUD)</label>
                <input className={inputClass} inputMode="decimal" value={draft.upfront_payment_amount ?? ''} onChange={(event) => patchDraft('upfront_payment_amount', parseNumberInput(event.target.value))} />
              </div>
              <div>
                <label className={labelClass}>When are they asking for money?</label>
                <select className={inputClass} value={draft.payment_timing} onChange={(event) => patchDraft('payment_timing', event.target.value as ScamPaymentTiming)}>
                  <option value="none">No payment asked yet</option>
                  <option value="before-inspection">Before inspection</option>
                  <option value="after-inspection">After inspection</option>
                  <option value="unclear">Unclear</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>How do they want to be paid?</label>
                <select className={inputClass} value={draft.payment_method} onChange={(event) => patchDraft('payment_method', event.target.value as ScamPaymentMethod)}>
                  <option value="not-specified">Not specified</option>
                  <option value="bank-transfer">Bank transfer</option>
                  <option value="cash">Cash</option>
                  <option value="crypto">Crypto</option>
                  <option value="gift-card">Gift card</option>
                  <option value="deposit-app">Deposit / escrow app</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Pressure signs</label>
                <div className="space-y-2">
                  {PRESSURE_SIGNAL_OPTIONS.map((option) => {
                    const checked = draft.pressure_signals.includes(option.value);
                    return (
                      <label
                        key={option.value}
                        className={`flex cursor-pointer items-center gap-3 rounded-[18px] border px-4 py-3 transition ${
                          checked ? 'border-[#BFDBFE] bg-[#EFF6FF]' : 'border-[#E2E8F0] bg-white'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(event) => {
                            const nextSignals = event.target.checked
                              ? [...draft.pressure_signals, option.value]
                              : draft.pressure_signals.filter((signal) => signal !== option.value);
                            patchDraft('pressure_signals', nextSignals);
                          }}
                          className="h-4 w-4 rounded border-[#CBD5E1] text-[#1E40AF]"
                        />
                        <span className="text-sm text-[#0F172A]">{option.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {stepIndex === 3 ? (
          <div className={panelClass}>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Extra Link (optional)</label>
                <input className={inputClass} value={draft.external_link} onChange={(event) => patchDraft('external_link', event.target.value)} placeholder="Chat thread, drive folder, or supporting link" />
              </div>
              <div>
                <label className={labelClass}>Notes</label>
                <textarea className={textareaClass} value={draft.notes} onChange={(event) => patchDraft('notes', event.target.value)} placeholder="Anything odd about the listing or conversation?" />
              </div>
              <div>
                <label className={labelClass}>Attach Evidence</label>
                {evidence.length === 0 ? (
                  <div className="rounded-[20px] border border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-5 py-6 text-center">
                    <p className="text-sm text-[#64748B]">No evidence items yet. You can still save this check now and add evidence later.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {evidence.map((item) => {
                      const checked = draft.document_item_ids.includes(item.id);
                      return (
                        <label
                          key={item.id}
                          className={`flex cursor-pointer items-start gap-3 rounded-[18px] border px-4 py-3 transition ${
                            checked ? 'border-[#BFDBFE] bg-[#EFF6FF]' : 'border-[#E2E8F0] bg-white'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(event) => {
                              const nextIds = event.target.checked
                                ? [...draft.document_item_ids, item.id]
                                : draft.document_item_ids.filter((itemId) => itemId !== item.id);
                              patchDraft('document_item_ids', nextIds);
                            }}
                            className="mt-1 h-4 w-4 rounded border-[#CBD5E1] text-[#1E40AF]"
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[#0F172A]">{item.filename}</p>
                            {item.notes ? <p className="mt-1 text-sm text-[#64748B]">{item.notes}</p> : null}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}

        <div className="mb-4 rounded-[28px] border border-[#E2E8F0] bg-[#F8FAFC] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setStepIndex((currentStep) => Math.max(0, currentStep - 1))}
              disabled={stepIndex === 0}
              className="rounded-[18px] border border-[#E2E8F0] bg-white px-4 py-3 text-sm font-semibold text-[#64748B] transition hover:text-[#0F172A] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Back
            </button>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void handleRunCheck()}
                className="rounded-[18px] bg-[#0F172A] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1E293B]"
              >
                Run Check
              </button>
              <button
                type="button"
                onClick={() => setStepIndex((currentStep) => Math.min(SCAM_CHECK_STEPS.length - 1, currentStep + 1))}
                disabled={stepIndex === SCAM_CHECK_STEPS.length - 1}
                className="inline-flex items-center gap-2 rounded-[18px] border border-[#DBEAFE] px-4 py-3 text-sm font-semibold text-[#1E40AF] transition hover:bg-[#EFF6FF] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Next
                <ChevronRight className="h-4 w-4" strokeWidth={1.8} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
