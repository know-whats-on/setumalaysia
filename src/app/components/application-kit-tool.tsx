import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import { jsPDF } from 'jspdf';
import {
  ArrowLeft,
  Building2,
  ChevronRight,
  Download,
  FileText,
  FolderOpen,
  LoaderCircle,
  MapPin,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import {
  createApplicationKit,
  createProfile,
  deleteApplicationKit,
  fetchApplicationKits,
  generateApplicationLetter,
  updateApplicationKit,
  updateProfile,
} from '../lib/api';
import {
  APPLICATION_KIT_REFERENCE_SUGGESTIONS,
  APPLICATION_KIT_REFERENCE_TYPE_LABELS,
  HOODIE_SUPPORT_LETTER_DEFAULTS,
  applyApplicationLetterAddress,
  buildApplicationLetterSourceSignature,
  buildApplicationKitReferenceSummary,
  createApplicationKitReference,
  isEduEmail,
  getApplicationKitAddressLabel,
  normalizeApplicationKitDraft,
  normalizeDateInputValue,
} from '../lib/application-kit';
import { APP_CONFIG } from '../lib/app-config';
import { downloadSetuPdf } from '../lib/setu-pdf';
import { CanonicalAddress, VerifiedAddressInput } from './address-search-field';
import type { Evidence, RentalEntry } from '../lib/mock-data';
import type {
  ApplicationKitDraft,
  ApplicationKitReference,
  ApplicationKitReferenceType,
  ApplicationWorkStatus,
} from '../lib/prepare-types';

interface ApplicationKitToolProps {
  evidence: Evidence[];
  rentalHistory: RentalEntry[];
  profile: Record<string, any> | null;
  onFocusChange: (active: boolean, subtitle?: string) => void;
}

const APPLICATION_KIT_STEPS = [
  { id: 'applicant', label: 'Applicant' },
  { id: 'home', label: 'Home' },
  { id: 'support', label: 'Support' },
  { id: 'documents', label: 'Documents' },
  { id: 'letter', label: 'Letter' },
] as const;

const WORK_STATUS_OPTIONS: Array<{ value: ApplicationWorkStatus; label: string }> = [
  { value: 'student', label: 'Student' },
  { value: 'part-time', label: 'Part-time' },
  { value: 'full-time', label: 'Full-time' },
  { value: 'casual', label: 'Casual' },
  { value: 'seeking-work', label: 'Looking for work' },
  { value: 'other', label: 'Other' },
];

const NO_HISTORY_SUPPORT_SIGNALS = [
  'Previous landlord or host family',
  'Employer or manager letter',
  'Teacher or lecturer reference',
  'University support staff contact',
  'Scholarship or sponsor letter',
  'Guarantor details',
  'Savings or bank balance proof',
  'Visa grant notice',
  'Enrolment confirmation',
  'Payslips or work contract',
] as const;

function parseNumberInput(value: string) {
  if (!value.trim()) return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function formatCurrency(value: number | null) {
  if (value === null || Number.isNaN(value)) return 'Not provided';
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatRecordDate(value: string, fallback = 'Recently') {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return fallback;
  return format(parsed, 'dd MMM yyyy');
}

function formatMoveInDate(value: string) {
  const normalized = normalizeDateInputValue(value);
  if (!normalized) return 'Not provided';
  return format(new Date(`${normalized}T00:00:00`), 'dd MMM yyyy');
}

function getFriendlyPrepareError(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  if (/string did not match the expected pattern/i.test(message)) {
    return fallback;
  }
  return message || fallback;
}

function buildApplicantProfilePayload(kit: ApplicationKitDraft) {
  return {
    first_name: kit.applicant.first_name.trim(),
    last_name: kit.applicant.last_name.trim(),
    phone: kit.applicant.phone.trim(),
    citizenship: kit.applicant.citizenship.trim(),
    university: kit.applicant.university.trim(),
    course_name: kit.applicant.course_name.trim(),
    student_id: kit.applicant.student_id.trim(),
    visa_status: kit.applicant.visa_status.trim(),
    work_status: kit.applicant.work_status,
    employer_name: kit.applicant.employer_name.trim(),
    weekly_income: kit.applicant.weekly_income,
    work_address: kit.applicant.work_address.trim(),
    work_display_address: kit.applicant.work_address.trim(),
    email_type: isEduEmail(kit.applicant.email) ? 'edu_au' : 'standard',
  };
}

function createEmptyApplicationKit(email: string, profile: Record<string, any> | null, rentalHistory: RentalEntry[]): ApplicationKitDraft {
  return normalizeApplicationKitDraft({
    email,
    applicant: {
      first_name: profile?.first_name || '',
      last_name: profile?.last_name || '',
      phone: profile?.phone || '',
      email: profile?.email || email,
      citizenship: profile?.citizenship || '',
      visa_status: profile?.visa_status || '',
      university: profile?.university || '',
      course_name: profile?.course_name || '',
      student_id: profile?.student_id || '',
      work_status: profile?.work_status || 'student',
      employer_name: profile?.employer_name || '',
      work_address: profile?.work_display_address || profile?.work_address || '',
      weekly_income: typeof profile?.weekly_income === 'number' ? profile.weekly_income : null,
    },
    housing: {
      target_suburb: '',
      target_address: '',
      target_display_address: '',
      target_unit_number: '',
      target_building_id: '',
      target_postcode: '',
      target_state: '',
      target_lat: null,
      target_lng: null,
      target_address_verified: false,
      move_in_date: '',
      weekly_budget: null,
      occupants: 1,
      pets: 'none',
      smoking: 'no',
      lease_length: '12 months',
    },
    strengths: {
      no_australian_rental_history: rentalHistory.length === 0,
      savings_amount: null,
      guarantor_name: '',
      guarantor_contact: '',
      supporting_references: [],
      additional_support: rentalHistory.length === 0
        ? 'I can share enrolment proof, visa details, savings, work details, and trusted references to support my application.'
        : 'I can share references, supporting documents, and clear information to make the application easy to review.',
    },
    document_item_ids: [],
    application_letter: '',
    application_letter_template: '',
    application_letter_generated_at: '',
    application_letter_source_signature: '',
    application_letter_customized: false,
    personal_note: '',
    hoodie_support_letter: HOODIE_SUPPORT_LETTER_DEFAULTS,
  }, email);
}

function getApplicationKitTitle(kit: ApplicationKitDraft) {
  const fullName = [kit.applicant.first_name, kit.applicant.last_name].filter(Boolean).join(' ').trim();
  if (fullName) return fullName;
  if (getApplicationKitAddressLabel(kit)) return `Application Kit for ${getApplicationKitAddressLabel(kit)}`;
  return 'Untitled Application Kit';
}

function getEvidenceLabel(item: Evidence) {
  if (item.associated_address_label?.trim()) return item.associated_address_label.trim();
  if (item.listing_id && item.listing_id !== 'unlinked') return 'Linked to a property';
  return 'Unlinked document';
}

function getSelectedDocumentLabels(kit: ApplicationKitDraft, evidence: Evidence[]) {
  return kit.document_item_ids
    .map((itemId) => evidence.find((item) => item.id === itemId))
    .filter(Boolean)
    .map((item) => (item as Evidence).filename.trim())
    .filter(Boolean);
}

function getApplicationLetterDisplayValue(kit: ApplicationKitDraft) {
  if (kit.application_letter_customized && kit.application_letter.trim()) {
    return kit.application_letter.trim();
  }
  if (kit.application_letter_template.trim()) {
    return applyApplicationLetterAddress(kit.application_letter_template, kit).trim();
  }
  return kit.application_letter.trim();
}

function buildApplicationKitPersistSignature(kit: ApplicationKitDraft, email: string) {
  const candidate = normalizeApplicationKitDraft(kit, email);
  return JSON.stringify({
    applicant: candidate.applicant,
    housing: candidate.housing,
    strengths: candidate.strengths,
    document_item_ids: candidate.document_item_ids,
    application_letter: candidate.application_letter,
    application_letter_template: candidate.application_letter_template,
    application_letter_generated_at: candidate.application_letter_generated_at,
    application_letter_source_signature: candidate.application_letter_source_signature,
    application_letter_customized: candidate.application_letter_customized,
    personal_note: candidate.personal_note,
    hoodie_support_letter: candidate.hoodie_support_letter,
  });
}

export function ApplicationKitTool({ evidence, rentalHistory, profile, onFocusChange }: ApplicationKitToolProps) {
  const navigate = useNavigate();
  const email = localStorage.getItem('ghar_email') || '';
  const [kits, setKits] = useState<ApplicationKitDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'list' | 'edit'>('list');
  const [stepIndex, setStepIndex] = useState(0);
  const [draft, setDraft] = useState<ApplicationKitDraft>(() => createEmptyApplicationKit(email, profile, rentalHistory));
  const [profileSnapshot, setProfileSnapshot] = useState<Record<string, any> | null>(profile);
  const [saving, setSaving] = useState(false);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [letterGenerating, setLetterGenerating] = useState(false);
  const [error, setError] = useState('');
  const [exportError, setExportError] = useState('');
  const [notice, setNotice] = useState('');
  const [loadNotice, setLoadNotice] = useState('');
  const [letterNotice, setLetterNotice] = useState('');
  const lastProfileSyncSignatureRef = useRef('');
  const lastSavedSignatureRef = useRef(buildApplicationKitPersistSignature(createEmptyApplicationKit(email, profile, rentalHistory), email));

  const sortedKits = useMemo(
    () => [...kits].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()),
    [kits],
  );

  const sortedEvidence = useMemo(
    () => [...evidence].sort((a, b) => {
      const aPriority = a.listing_id === 'unlinked' ? 0 : 1;
      const bPriority = b.listing_id === 'unlinked' ? 0 : 1;
      if (aPriority !== bPriority) return aPriority - bPriority;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }),
    [evidence],
  );

  useEffect(() => {
    setProfileSnapshot((currentProfile) => currentProfile ?? profile);
  }, [profile]);

  const loadKits = useCallback(async () => {
    if (!email) {
      setKits([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      setKits(await fetchApplicationKits(email));
      setLoadNotice('');
      setNotice('');
      setError('');
      setExportError('');
    } catch (loadError) {
      console.error('Hoodie application kits load failed:', loadError);
      setLoadNotice('Saved Application Kits are unavailable right now. You can still start a new one.');
    } finally {
      setLoading(false);
    }
  }, [email]);

  useEffect(() => {
    void loadKits();
  }, [loadKits]);

  useEffect(() => {
    onFocusChange(false, 'Application Kit');
    return () => onFocusChange(false, 'Application Kit');
  }, [onFocusChange]);

  const currentLetterSourceSignature = useMemo(
    () => buildApplicationLetterSourceSignature(draft),
    [draft],
  );

  const letterNeedsRegeneration = Boolean(
    draft.application_letter_template.trim()
      && draft.application_letter_source_signature
      && draft.application_letter_source_signature !== currentLetterSourceSignature,
  );

  const syncApplicantProfile = useCallback(async (candidateDraft: ApplicationKitDraft) => {
    if (!email) return;

    const payload = buildApplicantProfilePayload(candidateDraft);
    const signature = JSON.stringify(payload);
    if (signature === lastProfileSyncSignatureRef.current) return;

    try {
      const updatedProfile = await updateProfile(email, payload);
      lastProfileSyncSignatureRef.current = signature;
      setProfileSnapshot((currentProfile) => ({ ...(currentProfile || {}), ...updatedProfile }));
      return;
    } catch (profileError) {
      const message = profileError instanceof Error ? profileError.message : '';
      if (!/profile not found/i.test(message)) {
        console.error('Hoodie application kit profile sync failed:', profileError);
        return;
      }
    }

    try {
      const createdProfile = await createProfile({
        first_name: payload.first_name || '',
        last_name: payload.last_name || '',
        dob: profileSnapshot?.dob || '',
        phone: payload.phone || '',
        email,
        citizenship: payload.citizenship || '',
        home_state: profileSnapshot?.home_state || '',
        australian_state: profileSnapshot?.australian_state || '',
        audience_mode: profileSnapshot?.audience_mode || 'student',
        university: payload.university || '',
        university_id: profileSnapshot?.university_id || '',
        email_type: payload.email_type,
        course_name: payload.course_name || '',
        student_id: payload.student_id || '',
        visa_status: payload.visa_status || '',
        work_status: payload.work_status || 'student',
        employer_name: payload.employer_name || '',
        weekly_income: payload.weekly_income ?? null,
        graduation_year: profileSnapshot?.graduation_year ?? null,
        postcode: profileSnapshot?.postcode || '',
        work_address: payload.work_address || '',
        work_display_address: payload.work_display_address || payload.work_address || '',
        work_state: profileSnapshot?.work_state || '',
        work_postcode: profileSnapshot?.work_postcode || '',
        work_lat: profileSnapshot?.work_lat ?? null,
        work_lng: profileSnapshot?.work_lng ?? null,
        work_address_verified: Boolean(profileSnapshot?.work_address_verified),
      });
      lastProfileSyncSignatureRef.current = signature;
      setProfileSnapshot((currentProfile) => ({ ...(currentProfile || {}), ...createdProfile }));
    } catch (profileCreateError) {
      console.error('Hoodie application kit profile create failed:', profileCreateError);
    }
  }, [email, profileSnapshot]);

  const generateLetterForDraft = useCallback(async (
    candidateDraft: ApplicationKitDraft,
    options?: { force?: boolean },
  ) => {
    const normalizedDraft = normalizeApplicationKitDraft(candidateDraft, email);
    const sourceSignature = buildApplicationLetterSourceSignature(normalizedDraft);
    const hasGeneratedTemplate = Boolean(normalizedDraft.application_letter_template.trim());
    const hasVisibleLetter = Boolean(getApplicationLetterDisplayValue(normalizedDraft));

    if (
      !options?.force
      && hasGeneratedTemplate
      && normalizedDraft.application_letter_source_signature === sourceSignature
    ) {
      const nextDraft = normalizeApplicationKitDraft({
        ...normalizedDraft,
        application_letter: getApplicationLetterDisplayValue(normalizedDraft),
        personal_note: getApplicationLetterDisplayValue(normalizedDraft),
      }, email);
      setDraft(nextDraft);
      return nextDraft;
    }

    setLetterGenerating(true);
    setLetterNotice('');

    try {
      const response = await generateApplicationLetter({
        email,
        applicant: normalizedDraft.applicant,
        housing: normalizedDraft.housing,
        strengths: normalizedDraft.strengths,
        supporting_document_labels: getSelectedDocumentLabels(normalizedDraft, evidence),
        reference_summaries: normalizedDraft.strengths.supporting_references
          .map((reference) => buildApplicationKitReferenceSummary(reference))
          .filter(Boolean),
        source_signature: sourceSignature,
      });

      const template = (response.letter_template || response.letter || '').trim();
      if (!template) {
        throw new Error('No letter content returned');
      }

      const letter = applyApplicationLetterAddress(template, normalizedDraft).trim();
      const nextDraft = normalizeApplicationKitDraft({
        ...normalizedDraft,
        application_letter: letter,
        application_letter_template: template,
        application_letter_generated_at: response.generated_at,
        application_letter_source_signature: response.source_signature || sourceSignature,
        application_letter_customized: false,
        personal_note: letter,
      }, email);

      setDraft(nextDraft);
      return nextDraft;
    } catch (generationError) {
      console.error('Hoodie application letter generation failed:', generationError);
      setLetterNotice(hasVisibleLetter
        ? 'Letter refresh is unavailable right now. You can keep editing the version already on screen.'
        : 'Letter generation is unavailable right now. Please try again in a moment.');
      throw generationError;
    } finally {
      setLetterGenerating(false);
    }
  }, [email, evidence]);

  useEffect(() => {
    if (mode !== 'edit' || !email) return;
    const candidate = normalizeApplicationKitDraft(draft, email);
    const timer = window.setTimeout(() => {
      void syncApplicantProfile(candidate);
    }, 900);
    return () => window.clearTimeout(timer);
  }, [draft, email, mode, syncApplicantProfile]);

  useEffect(() => {
    if (mode !== 'edit' || stepIndex !== 4) return;
    if (letterGenerating) return;
    if (draft.application_letter_template.trim() || draft.application_letter.trim()) return;

    void generateLetterForDraft(draft).catch(() => {
      // handled with non-blocking notice
    });
  }, [draft, generateLetterForDraft, letterGenerating, mode, stepIndex]);

  useEffect(() => {
    if (!draft.application_letter_template.trim()) return;
    if (draft.application_letter_customized) return;
    if (draft.application_letter_source_signature !== currentLetterSourceSignature) return;

    const addressedLetter = getApplicationLetterDisplayValue(draft);
    if (!addressedLetter || addressedLetter === draft.application_letter.trim()) return;

    setDraft((currentDraft) => ({
      ...currentDraft,
      application_letter: addressedLetter,
      personal_note: addressedLetter,
    }));
  }, [
    currentLetterSourceSignature,
    draft,
  ]);

  const patchDraft = <K extends keyof ApplicationKitDraft>(key: K, value: ApplicationKitDraft[K]) => {
    setDraft((currentDraft) => ({
      ...currentDraft,
      [key]: value,
      ...(key === 'application_letter'
        ? {
            personal_note: value as string,
            application_letter_customized: true,
          }
        : {}),
    }));
    setNotice('');
    setError('');
    setExportError('');
    setLetterNotice('');
  };

  const patchApplicant = <K extends keyof ApplicationKitDraft['applicant']>(key: K, value: ApplicationKitDraft['applicant'][K]) => {
    setDraft((currentDraft) => ({
      ...currentDraft,
      applicant: {
        ...currentDraft.applicant,
        [key]: value,
      },
    }));
    setNotice('');
    setError('');
    setExportError('');
    setLetterNotice('');
  };

  const patchHousing = <K extends keyof ApplicationKitDraft['housing']>(key: K, value: ApplicationKitDraft['housing'][K]) => {
    setDraft((currentDraft) => ({
      ...currentDraft,
      housing: {
        ...currentDraft.housing,
        [key]: key === 'move_in_date' ? normalizeDateInputValue(value as string) : value,
      },
    }));
    setNotice('');
    setError('');
    setExportError('');
    setLetterNotice('');
  };

  const patchStrengths = <K extends keyof ApplicationKitDraft['strengths']>(key: K, value: ApplicationKitDraft['strengths'][K]) => {
    setDraft((currentDraft) => ({
      ...currentDraft,
      strengths: {
        ...currentDraft.strengths,
        [key]: value,
      },
    }));
    setNotice('');
    setError('');
    setExportError('');
    setLetterNotice('');
  };

  const patchReference = <K extends keyof ApplicationKitReference>(
    referenceId: string,
    key: K,
    value: ApplicationKitReference[K],
  ) => {
    setDraft((currentDraft) => ({
      ...currentDraft,
      strengths: {
        ...currentDraft.strengths,
        supporting_references: currentDraft.strengths.supporting_references.map((reference) => (
          reference.id === referenceId
            ? { ...reference, [key]: value }
            : reference
        )),
      },
    }));
    setNotice('');
    setError('');
    setExportError('');
    setLetterNotice('');
  };

  const addReference = (type: ApplicationKitReferenceType) => {
    setDraft((currentDraft) => ({
      ...currentDraft,
      strengths: {
        ...currentDraft.strengths,
        supporting_references: [...currentDraft.strengths.supporting_references, createApplicationKitReference(type)],
      },
    }));
    setNotice('');
    setError('');
    setExportError('');
    setLetterNotice('');
  };

  const removeReference = (referenceId: string) => {
    setDraft((currentDraft) => ({
      ...currentDraft,
      strengths: {
        ...currentDraft.strengths,
        supporting_references: currentDraft.strengths.supporting_references.filter((reference) => reference.id !== referenceId),
      },
    }));
    setError('');
    setExportError('');
  };

  const handleStartNew = () => {
    const nextDraft = createEmptyApplicationKit(email, profileSnapshot, rentalHistory);
    setDraft(nextDraft);
    lastSavedSignatureRef.current = buildApplicationKitPersistSignature(nextDraft, email);
    setStepIndex(0);
    setMode('edit');
    setNotice('');
    setLoadNotice('');
    setError('');
    setExportError('');
    setLetterNotice('');
  };

  const handleOpenKit = (kit: ApplicationKitDraft) => {
    const normalizedKit = normalizeApplicationKitDraft(kit, email);
    setDraft(normalizedKit);
    lastSavedSignatureRef.current = buildApplicationKitPersistSignature(normalizedKit, email);
    setStepIndex(0);
    setMode('edit');
    setNotice('');
    setLoadNotice('');
    setError('');
    setExportError('');
    setLetterNotice('');
  };

  const persistDraft = useCallback(async (nextDraft?: ApplicationKitDraft) => {
    const candidate = normalizeApplicationKitDraft(nextDraft || draft, email);
    if (!email) throw new Error('No signed-in email found.');

    const payload = {
      email,
      applicant: candidate.applicant,
      housing: candidate.housing,
      strengths: {
        no_australian_rental_history: candidate.strengths.no_australian_rental_history,
        savings_amount: candidate.strengths.savings_amount,
        guarantor_name: candidate.strengths.guarantor_name,
        guarantor_contact: candidate.strengths.guarantor_contact,
        supporting_references: candidate.strengths.supporting_references,
        additional_support: candidate.strengths.additional_support,
      },
      document_item_ids: candidate.document_item_ids,
      application_letter: candidate.application_letter,
      application_letter_template: candidate.application_letter_template,
      application_letter_generated_at: candidate.application_letter_generated_at,
      application_letter_source_signature: candidate.application_letter_source_signature,
      application_letter_customized: candidate.application_letter_customized,
      personal_note: candidate.personal_note,
      hoodie_support_letter: candidate.hoodie_support_letter,
    };

    if (candidate.id) {
      const updated = await updateApplicationKit(candidate.id, payload);
      setDraft(updated);
      setKits((currentKits) => currentKits.map((item) => (item.id === updated.id ? updated : item)));
      lastSavedSignatureRef.current = buildApplicationKitPersistSignature(updated, email);
      return updated;
    }

    const created = await createApplicationKit(payload);
    setDraft(created);
    setKits((currentKits) => [created, ...currentKits]);
    lastSavedSignatureRef.current = buildApplicationKitPersistSignature(created, email);
    return created;
  }, [draft, email]);

  const handleSave = async () => {
    setSaving(true);
    setNotice('');
    setError('');
    setExportError('');
    try {
      const savedDraft = await persistDraft();
      await syncApplicantProfile(normalizeApplicationKitDraft(savedDraft, email));
      setLoadNotice('');
      setNotice('Application Kit saved.');
    } catch (saveError) {
      console.error('Hoodie application kit save failed:', saveError);
      setError(getFriendlyPrepareError(saveError, 'Application Kit could not be saved right now.'));
    } finally {
      setSaving(false);
    }
  };

  const exportKitPdf = useCallback(async (kit: ApplicationKitDraft) => {
    const supportingDocuments = kit.document_item_ids
      .map((itemId) => evidence.find((item) => item.id === itemId))
      .filter(Boolean) as Evidence[];
    const applicationLetter = getApplicationLetterDisplayValue(kit);
    const applicantName = getApplicationKitTitle(kit);
    const addressLabel = getApplicationKitAddressLabel(kit) || 'Not provided';

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const margin = 18;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const contentWidth = pageWidth - margin * 2;
    const headerHeight = 38;
    const brandBlue: [number, number, number] = [30, 64, 175];
    const generatedAt = new Date();
    const kitNumber = kit.kit_number.trim();
    const savedDate = kit.created_at && !Number.isNaN(new Date(kit.created_at).getTime())
      ? format(new Date(kit.created_at), 'dd MMM yyyy')
      : '';
    let y = 48;

    const drawPageHeader = (pageTitle: string) => {
      doc.setFillColor(brandBlue[0], brandBlue[1], brandBlue[2]);
      doc.rect(0, 0, pageWidth, headerHeight, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.text(APP_CONFIG.displayName, margin, 16);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`${APP_CONFIG.displayName} — ${pageTitle}`, margin, 27);
      doc.setFontSize(8);
      doc.text(`Generated ${format(generatedAt, 'dd MMM yyyy, HH:mm')}`, margin, 33);
      if (kitNumber) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text(kitNumber, pageWidth - margin, 16, { align: 'right' });
      }
      if (savedDate) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text(`Saved ${savedDate}`, pageWidth - margin, 23, { align: 'right' });
      }
      y = 48;
    };

    const addPageIfNeeded = (needed: number, pageTitle = 'Application Kit') => {
      if (y + needed > pageHeight - 20) {
        doc.addPage();
        drawPageHeader(pageTitle);
      }
    };

    const drawLabelValue = (label: string, value: string) => {
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

    const drawParagraphs = (heading: string, paragraphs: string[]) => {
      doc.addPage();
      drawPageHeader(heading);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text(heading, margin, y);
      y += 8;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10.5);
      paragraphs.filter(Boolean).forEach((paragraph) => {
        addPageIfNeeded(20, heading);
        const lines = doc.splitTextToSize(paragraph, contentWidth);
        doc.text(lines, margin, y);
        y += lines.length * 5 + 6;
      });
    };

    drawPageHeader('Application Kit');
    drawLabelValue('Applicant', applicantName);
    drawLabelValue('Contact', [kit.applicant.email, kit.applicant.phone].filter(Boolean).join(' • '));
    drawLabelValue('Citizenship and visa', [kit.applicant.citizenship, kit.applicant.visa_status].filter(Boolean).join(' • '));
    drawLabelValue('Study details', [
      kit.applicant.university,
      kit.applicant.course_name,
      kit.applicant.student_id ? `Student ID ${kit.applicant.student_id}` : '',
    ].filter(Boolean).join(' • '));
    drawLabelValue('Work or income source', [
      WORK_STATUS_OPTIONS.find((option) => option.value === kit.applicant.work_status)?.label || kit.applicant.work_status,
      kit.applicant.employer_name,
      kit.applicant.work_address,
      kit.applicant.weekly_income !== null ? `${formatCurrency(kit.applicant.weekly_income)} / week` : '',
    ].filter(Boolean).join(' • '));

    addPageIfNeeded(8);
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    drawLabelValue('Home plan', [
      addressLabel,
      kit.housing.move_in_date ? `Move-in ${formatMoveInDate(kit.housing.move_in_date)}` : '',
      kit.housing.weekly_budget !== null ? `Budget ${formatCurrency(kit.housing.weekly_budget)} / week` : '',
      kit.housing.occupants ? `${kit.housing.occupants} occupant${kit.housing.occupants === 1 ? '' : 's'}` : '',
      kit.housing.lease_length,
      kit.housing.pets === 'yes' ? 'Pets: yes' : 'Pets: none',
      kit.housing.smoking === 'yes' ? 'Smoking: yes' : 'Smoking: no',
    ].filter(Boolean).join(' • '));

    drawLabelValue('Support summary', [
      kit.strengths.no_australian_rental_history ? 'No Australian rental history yet' : 'Australian rental history available',
      kit.strengths.savings_amount !== null ? `Savings ${formatCurrency(kit.strengths.savings_amount)}` : '',
      kit.strengths.guarantor_name ? `Guarantor: ${kit.strengths.guarantor_name}` : '',
      kit.strengths.guarantor_contact ? `Guarantor contact: ${kit.strengths.guarantor_contact}` : '',
    ].filter(Boolean).join(' • '));

    drawLabelValue('Extra things that support this application', kit.strengths.additional_support || 'Not provided');

    addPageIfNeeded(12);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('REFERENCES', margin, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    if (kit.strengths.supporting_references.length === 0) {
      doc.text('No references added.', margin, y);
      y += 6;
    } else {
      kit.strengths.supporting_references.forEach((reference) => {
        addPageIfNeeded(10);
        const label = APPLICATION_KIT_REFERENCE_TYPE_LABELS[reference.type] || 'Reference';
        const lines = doc.splitTextToSize(`${label}: ${buildApplicationKitReferenceSummary(reference) || 'Not provided'}`, contentWidth);
        doc.text(lines, margin, y);
        y += lines.length * 5 + 1;
      });
    }

    addPageIfNeeded(12);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('SUPPORTING DOCUMENTS', margin, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    if (supportingDocuments.length === 0) {
      doc.text('No supporting documents selected.', margin, y);
      y += 6;
    } else {
      supportingDocuments.forEach((item) => {
        addPageIfNeeded(8);
        const lines = doc.splitTextToSize(`${item.filename} • ${getEvidenceLabel(item)}`, contentWidth);
        doc.text(lines, margin, y);
        y += lines.length * 5 + 1;
      });
    }

    drawParagraphs('Application Letter', applicationLetter.split(/\n\s*\n/));

    const totalPages = doc.getNumberOfPages();
    for (let page = 1; page <= totalPages; page += 1) {
      doc.setPage(page);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(`${APP_CONFIG.displayName} • Confidential`, margin, pageHeight - 8);
      doc.text(`Page ${page} of ${totalPages}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
    }

    await downloadSetuPdf({
      blob: doc.output('blob'),
      fileName: `${(kit.kit_number || getApplicationKitTitle(kit)).replace(/\s+/g, '-').toLowerCase()}-application-kit.pdf`,
      title: `${APP_CONFIG.displayName} Application Kit`,
    });
  }, [evidence]);

  const handleExport = async (kit?: ApplicationKitDraft) => {
    let currentKit = normalizeApplicationKitDraft(kit || draft, email);
    const exportId = currentKit.id || 'draft';
    setExportingId(exportId);
    setNotice('');
    setExportError('');
    try {
      currentKit = await persistDraft(currentKit);
      await syncApplicantProfile(currentKit);
      if (!getApplicationLetterDisplayValue(currentKit)) {
        currentKit = await generateLetterForDraft(currentKit, { force: true });
        currentKit = await persistDraft(currentKit);
      }
      await exportKitPdf(currentKit);
      setLoadNotice('');
      setNotice('Application Kit saved and ready in your draft history.');
    } catch (exportError) {
      console.error('Hoodie application kit export failed:', exportError);
      setExportError(getFriendlyPrepareError(exportError, 'Application Kit could not be exported right now.'));
    } finally {
      setExportingId(null);
    }
  };

  const handleDelete = async (kit: ApplicationKitDraft) => {
    if (!window.confirm('Delete this Application Kit draft?')) return;
    setDeletingId(kit.id);
    setNotice('');
    setError('');
    setExportError('');
    try {
      await deleteApplicationKit(kit.id, email);
      setKits((currentKits) => currentKits.filter((item) => item.id !== kit.id));
      if (draft.id === kit.id) {
        setMode('list');
      }
      setLoadNotice('');
      setNotice('Application Kit deleted.');
    } catch (deleteError) {
      console.error('Hoodie application kit delete failed:', deleteError);
      setError(getFriendlyPrepareError(deleteError, 'Application Kit could not be deleted right now.'));
    } finally {
      setDeletingId(null);
    }
  };

  const inputClass = 'w-full min-w-0 max-w-full rounded-[18px] border border-[#E2E8F0] bg-white px-4 py-3 text-sm text-[#0F172A] outline-none transition focus:border-[#1E40AF] focus:ring-2 focus:ring-[#1E40AF]/10';
  const textareaClass = `${inputClass} min-h-[132px] resize-none`;
  const labelClass = 'mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[#94A3B8]';
  const panelClass = 'min-w-0 max-w-full overflow-x-hidden rounded-[28px] border border-[#E2E8F0] bg-white p-4 shadow-sm';
  const hasUnsavedChanges = buildApplicationKitPersistSignature(draft, email) !== lastSavedSignatureRef.current;

  const handleBackToList = async () => {
    setError('');
    setExportError('');
    setLetterNotice('');

    if (!hasUnsavedChanges) {
      setMode('list');
      return;
    }

    const shouldSave = window.confirm('Save your Application Kit changes before leaving? Press OK to save or Cancel to discard.');
    if (shouldSave) {
      setSaving(true);
      try {
        const savedDraft = await persistDraft();
        await syncApplicantProfile(normalizeApplicationKitDraft(savedDraft, email));
        setLoadNotice('');
        setNotice('Application Kit saved.');
        setMode('list');
        return;
      } catch (saveError) {
        console.error('Hoodie application kit save failed while leaving editor:', saveError);
        setError(getFriendlyPrepareError(saveError, 'Application Kit could not be saved right now.'));
        return;
      } finally {
        setSaving(false);
      }
    }

    setNotice('');
    setMode('list');
  };

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
            <p className="text-sm font-semibold text-[#0F172A]">Application Kit</p>
            <p className="text-xs text-[#64748B]">Saved drafts with a ready-to-submit letter and PDF export.</p>
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

        {loadNotice ? (
          <div className="rounded-[20px] border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3 text-sm text-[#92400E]">
            {loadNotice}
          </div>
        ) : null}
        {notice ? (
          <div className="rounded-[20px] border border-[#DBEAFE] bg-[#EFF6FF] px-4 py-3 text-sm text-[#1E40AF]">
            {notice}
          </div>
        ) : null}
        {error ? <p className="text-sm text-[#B91C1C]">{error}</p> : null}
        {exportError ? <p className="text-sm text-[#B91C1C]">{exportError}</p> : null}

        {sortedKits.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-[#CBD5E1] bg-white px-6 py-10 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[20px] border border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B]">
              <FileText className="h-5 w-5" strokeWidth={1.5} />
            </div>
            <p className="mt-4 text-base font-semibold text-[#0F172A]">No Application Kits yet</p>
            <p className="mt-2 text-sm leading-relaxed text-[#64748B]">
              Build one reusable rental application and export it whenever you need it.
            </p>
          </div>
        ) : (
          sortedKits.map((kit) => (
            <div key={kit.id} className="rounded-[28px] border border-[#E2E8F0] bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-[#0F172A]">{getApplicationKitTitle(kit)}</p>
                  <p className="mt-1 text-sm text-[#64748B]">
                    {[getApplicationKitAddressLabel(kit), kit.housing.weekly_budget !== null ? `${formatCurrency(kit.housing.weekly_budget)} / week` : ''].filter(Boolean).join(' • ') || 'Draft renter profile'}
                  </p>
                </div>
                <span className="rounded-full bg-[#F8FAFC] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#64748B]">
                  {kit.kit_number}
                </span>
              </div>

              <p className="mt-4 text-[11px] font-medium uppercase tracking-[0.16em] text-[#94A3B8]">
                Updated {formatRecordDate(kit.updated_at)}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenKit(kit)}
                  className="inline-flex items-center gap-2 rounded-[18px] bg-[#F8FAFC] px-4 py-3 text-sm font-semibold text-[#0F172A] transition hover:bg-[#EEF2FF]"
                >
                  Open
                  <ChevronRight className="h-4 w-4" strokeWidth={2} />
                </button>
                <button
                  type="button"
                  onClick={() => void handleExport(kit)}
                  className="inline-flex items-center gap-2 rounded-[18px] border border-[#DBEAFE] px-4 py-3 text-sm font-semibold text-[#1E40AF] transition hover:bg-[#EFF6FF]"
                >
                  {exportingId === kit.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" strokeWidth={1.8} />}
                  Export PDF
                </button>
                <button
                  type="button"
                  onClick={() => void handleDelete(kit)}
                  className="inline-flex items-center gap-2 rounded-[18px] border border-[#FECACA] px-4 py-3 text-sm font-semibold text-[#B91C1C] transition hover:bg-[#FEF2F2]"
                >
                  {deletingId === kit.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" strokeWidth={1.8} />}
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    );
  }

  return (
    <div className="relative z-0 min-h-0 min-w-0 max-w-full overflow-x-hidden pb-4">
      <div className="border-b border-[#E2E8F0] px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => void handleBackToList()}
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
        <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-5 [&>*]:min-w-0">
          {APPLICATION_KIT_STEPS.map((step, index) => {
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
          <div className="rounded-[20px] border border-[#DBEAFE] bg-[#EFF6FF] px-4 py-3 text-sm text-[#1E40AF]">
            {notice}
          </div>
        ) : null}
        {error ? <p className="text-sm text-[#B91C1C]">{error}</p> : null}
        {exportError ? <p className="text-sm text-[#B91C1C]">{exportError}</p> : null}
        {letterNotice ? (
          <div className="rounded-[20px] border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3 text-sm text-[#92400E]">
            {letterNotice}
          </div>
        ) : null}

        {stepIndex === 0 ? (
          <div className="space-y-4">
            <div className={panelClass}>
              <div className="grid gap-4 sm:grid-cols-2 [&>*]:min-w-0">
                <div>
                  <label className={labelClass}>First Name</label>
                  <input className={inputClass} value={draft.applicant.first_name} onChange={(event) => patchApplicant('first_name', event.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Last Name</label>
                  <input className={inputClass} value={draft.applicant.last_name} onChange={(event) => patchApplicant('last_name', event.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Phone</label>
                  <input className={inputClass} value={draft.applicant.phone} onChange={(event) => patchApplicant('phone', event.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Email</label>
                  <input className={inputClass} value={draft.applicant.email} onChange={(event) => patchApplicant('email', event.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Citizenship</label>
                  <input className={inputClass} value={draft.applicant.citizenship} onChange={(event) => patchApplicant('citizenship', event.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Visa Status</label>
                  <input className={inputClass} value={draft.applicant.visa_status} onChange={(event) => patchApplicant('visa_status', event.target.value)} placeholder="e.g. Student visa 500" />
                </div>
                <div>
                  <label className={labelClass}>University</label>
                  <input className={inputClass} value={draft.applicant.university} onChange={(event) => patchApplicant('university', event.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Course</label>
                  <input className={inputClass} value={draft.applicant.course_name} onChange={(event) => patchApplicant('course_name', event.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Student ID</label>
                  <input className={inputClass} value={draft.applicant.student_id} onChange={(event) => patchApplicant('student_id', event.target.value)} placeholder="Enter your real student ID" />
                </div>
                <div>
                  <label className={labelClass}>Work Status</label>
                  <select className={inputClass} value={draft.applicant.work_status} onChange={(event) => patchApplicant('work_status', event.target.value as ApplicationWorkStatus)}>
                    {WORK_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Work or Income Source</label>
                  <input className={inputClass} value={draft.applicant.employer_name} onChange={(event) => patchApplicant('employer_name', event.target.value)} placeholder="Employer, scholarship, sponsor, or savings" />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Work Address</label>
                  <input className={inputClass} value={draft.applicant.work_address} onChange={(event) => patchApplicant('work_address', event.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Weekly Income (AUD)</label>
                  <input className={inputClass} inputMode="decimal" value={draft.applicant.weekly_income ?? ''} onChange={(event) => patchApplicant('weekly_income', parseNumberInput(event.target.value))} />
                </div>
              </div>
            </div>

            <div className={panelClass}>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-[16px] bg-[#F8FAFC] text-[#1E40AF]">
                  <FileText className="h-5 w-5" strokeWidth={1.8} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[#0F172A]">Letter setup</p>
                  <p className="mt-1 text-sm text-[#64748B]">
                    These details shape your first-person application letter and stay ready for future kits.
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {draft.applicant.university ? (
                  <span className="rounded-full border border-[#DBEAFE] bg-[#F8FAFC] px-3 py-1 text-[11px] font-semibold text-[#1E40AF]">
                    {draft.applicant.university}
                  </span>
                ) : null}
                {draft.applicant.course_name ? (
                  <span className="rounded-full border border-[#DBEAFE] bg-[#F8FAFC] px-3 py-1 text-[11px] font-semibold text-[#1E40AF]">
                    {draft.applicant.course_name}
                  </span>
                ) : null}
                {draft.applicant.student_id ? (
                  <span className="rounded-full border border-[#DBEAFE] bg-[#F8FAFC] px-3 py-1 text-[11px] font-semibold text-[#1E40AF]">
                    Student ID {draft.applicant.student_id}
                  </span>
                ) : null}
                {draft.applicant.visa_status ? (
                  <span className="rounded-full border border-[#DBEAFE] bg-[#F8FAFC] px-3 py-1 text-[11px] font-semibold text-[#1E40AF]">
                    {draft.applicant.visa_status}
                  </span>
                ) : null}
              </div>

              {!draft.applicant.student_id.trim() ? (
                <p className="mt-3 text-sm text-[#64748B]">
                  Add your real student ID here so it is saved for future kits and used when it helps your letter.
                </p>
              ) : null}
              {!draft.applicant.university.trim() || !draft.applicant.course_name.trim() ? (
                <p className="mt-2 text-sm text-[#64748B]">
                  University and course details help the letter sound complete and personal.
                </p>
              ) : null}
              {draft.applicant.email && !isEduEmail(draft.applicant.email) ? (
                <p className="mt-2 text-sm text-[#64748B]">
                  A student email is helpful if you have one, but it is not required.
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        {stepIndex === 1 ? (
          <div className={panelClass}>
            <div className="grid gap-4 sm:grid-cols-2 [&>*]:min-w-0">
              <div className="sm:col-span-2">
                <VerifiedAddressInput
                  value={draft.housing.target_address}
                  unitValue={draft.housing.target_unit_number}
                  onChange={(address: CanonicalAddress) => {
                    setDraft((currentDraft) => ({
                      ...currentDraft,
                      housing: {
                        ...currentDraft.housing,
                        target_address: address.formatted_address,
                        target_display_address: address.display_address,
                        target_unit_number: address.unit_number,
                        target_building_id: address.building_id,
                        target_suburb: address.suburb,
                        target_postcode: address.postcode,
                        target_state: address.state,
                        target_lat: address.lat,
                        target_lng: address.lng,
                        target_address_verified: true,
                      },
                    }));
                    setError('');
                    setExportError('');
                  }}
                  placeholder="Search the address you are applying for..."
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>State</label>
                <div className={`${inputClass} flex items-center gap-2 bg-[#F8FAFC] text-[#64748B]`}>
                  <MapPin className="h-4 w-4 text-[#94A3B8]" strokeWidth={1.8} />
                  <span>{draft.housing.target_state || 'Auto-filled after address selection'}</span>
                </div>
              </div>
              <div>
                <label className={labelClass}>Postcode</label>
                <div className={`${inputClass} flex items-center gap-2 bg-[#F8FAFC] text-[#64748B]`}>
                  <Building2 className="h-4 w-4 text-[#94A3B8]" strokeWidth={1.8} />
                  <span>{draft.housing.target_postcode || 'Auto-filled after address selection'}</span>
                </div>
              </div>
              <div>
                <label className={labelClass}>Move-in Date</label>
                <input className={inputClass} type="date" value={normalizeDateInputValue(draft.housing.move_in_date)} onChange={(event) => patchHousing('move_in_date', event.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Weekly Budget (AUD)</label>
                <input className={inputClass} inputMode="decimal" value={draft.housing.weekly_budget ?? ''} onChange={(event) => patchHousing('weekly_budget', parseNumberInput(event.target.value))} />
              </div>
              <div>
                <label className={labelClass}>Occupants</label>
                <input className={inputClass} inputMode="numeric" value={draft.housing.occupants ?? ''} onChange={(event) => patchHousing('occupants', parseNumberInput(event.target.value))} />
              </div>
              <div>
                <label className={labelClass}>Pets</label>
                <select className={inputClass} value={draft.housing.pets} onChange={(event) => patchHousing('pets', event.target.value as 'none' | 'yes')}>
                  <option value="none">No pets</option>
                  <option value="yes">Has pets</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Smoking</label>
                <select className={inputClass} value={draft.housing.smoking} onChange={(event) => patchHousing('smoking', event.target.value as 'no' | 'yes')}>
                  <option value="no">Non-smoking</option>
                  <option value="yes">Smoking</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Preferred Lease Length</label>
                <input className={inputClass} value={draft.housing.lease_length} onChange={(event) => patchHousing('lease_length', event.target.value)} placeholder="e.g. 6 months, 12 months" />
              </div>
            </div>
          </div>
        ) : null}

        {stepIndex === 2 ? (
          <div className="space-y-4">
            <div className={panelClass}>
              <div className="space-y-4">
                <label className="flex items-start gap-3 rounded-[20px] border border-[#DBEAFE] bg-[#EFF6FF] p-4">
                  <input
                    type="checkbox"
                    checked={draft.strengths.no_australian_rental_history}
                    onChange={(event) => patchStrengths('no_australian_rental_history', event.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-[#BFDBFE] text-[#1E40AF]"
                  />
                  <div>
                    <p className="text-sm font-semibold text-[#0F172A]">No previous rental history in Australia yet</p>
                    <p className="mt-1 text-sm text-[#64748B]">
                      That is okay. You can still build a strong application with study details, work details, savings, references, and supporting documents.
                    </p>
                  </div>
                </label>

                {draft.strengths.no_australian_rental_history ? (
                  <div className="rounded-[20px] border border-[#E2E8F0] bg-[#F8FAFC] p-4">
                    <p className="text-sm font-semibold text-[#0F172A]">What you can use instead</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {NO_HISTORY_SUPPORT_SIGNALS.map((signal) => (
                        <span key={signal} className="rounded-full border border-[#DBEAFE] bg-white px-3 py-1 text-[11px] font-semibold text-[#1E40AF]">
                          {signal}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="grid gap-4 sm:grid-cols-2 [&>*]:min-w-0">
                  <div>
                    <label className={labelClass}>Savings Amount (AUD)</label>
                    <input className={inputClass} inputMode="decimal" value={draft.strengths.savings_amount ?? ''} onChange={(event) => patchStrengths('savings_amount', parseNumberInput(event.target.value))} />
                  </div>
                  <div>
                    <label className={labelClass}>Guarantor Name</label>
                    <input className={inputClass} value={draft.strengths.guarantor_name} onChange={(event) => patchStrengths('guarantor_name', event.target.value)} />
                  </div>
                  <div>
                    <label className={labelClass}>Guarantor Contact</label>
                    <input className={inputClass} value={draft.strengths.guarantor_contact} onChange={(event) => patchStrengths('guarantor_contact', event.target.value)} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Extra things that support your application</label>
                    <textarea className={textareaClass} value={draft.strengths.additional_support} onChange={(event) => patchStrengths('additional_support', event.target.value)} />
                  </div>
                </div>
              </div>
            </div>

            <div className={panelClass}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#0F172A]">References</p>
                  <p className="mt-1 text-sm text-[#64748B]">
                    Add the people who can speak to your reliability, study, work, or past housing.
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {APPLICATION_KIT_REFERENCE_SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion.type}
                    type="button"
                    onClick={() => addReference(suggestion.type)}
                    className="rounded-full border border-[#DBEAFE] bg-white px-3 py-2 text-xs font-semibold text-[#1E40AF] transition hover:bg-[#EFF6FF]"
                  >
                    + {suggestion.label}
                  </button>
                ))}
              </div>

              {draft.strengths.supporting_references.length === 0 ? (
                <div className="mt-4 rounded-[20px] border border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-5 py-6 text-center">
                  <p className="text-sm font-semibold text-[#0F172A]">No references added yet</p>
                  <p className="mt-2 text-sm text-[#64748B]">Employer, teacher, lecturer, landlord, or university staff references all help.</p>
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  {draft.strengths.supporting_references.map((reference) => (
                    <div key={reference.id} className="rounded-[22px] border border-[#E2E8F0] bg-[#F8FAFC] p-4">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-[#0F172A]">
                          {APPLICATION_KIT_REFERENCE_TYPE_LABELS[reference.type]}
                        </p>
                        <button
                          type="button"
                          onClick={() => removeReference(reference.id)}
                          className="inline-flex items-center gap-1 text-sm font-semibold text-[#B91C1C] transition hover:text-[#991B1B]"
                        >
                          <X className="h-4 w-4" strokeWidth={1.8} />
                          Remove
                        </button>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2 [&>*]:min-w-0">
                        <div>
                          <label className={labelClass}>Reference Type</label>
                          <select className={inputClass} value={reference.type} onChange={(event) => patchReference(reference.id, 'type', event.target.value as ApplicationKitReferenceType)}>
                            {Object.entries(APPLICATION_KIT_REFERENCE_TYPE_LABELS).map(([value, label]) => (
                              <option key={value} value={value}>{label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className={labelClass}>Name</label>
                          <input className={inputClass} value={reference.name} onChange={(event) => patchReference(reference.id, 'name', event.target.value)} />
                        </div>
                        <div>
                          <label className={labelClass}>Role or Relationship</label>
                          <input className={inputClass} value={reference.role} onChange={(event) => patchReference(reference.id, 'role', event.target.value)} placeholder="e.g. Lecturer, Store manager, Previous landlord" />
                        </div>
                        <div>
                          <label className={labelClass}>Contact</label>
                          <input className={inputClass} value={reference.contact} onChange={(event) => patchReference(reference.id, 'contact', event.target.value)} placeholder="Phone, email, or both" />
                        </div>
                        <div className="sm:col-span-2">
                          <label className={labelClass}>Note</label>
                          <textarea className={textareaClass} value={reference.note} onChange={(event) => patchReference(reference.id, 'note', event.target.value)} placeholder="Add context the landlord should know" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}

        {stepIndex === 3 ? (
          <div className="space-y-4">
            <div className={panelClass}>
              <p className="text-sm font-semibold text-[#0F172A]">Before you submit, attach documents that make your application stronger</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  'Student ID or enrolment letter',
                  'Visa grant notice',
                  'Payslips or work contract',
                  'Savings or bank balance proof',
                  'Reference letters',
                  'Passport ID page',
                ].map((item) => (
                  <span key={item} className="rounded-full border border-[#DBEAFE] bg-[#F8FAFC] px-3 py-1 text-[11px] font-semibold text-[#1E40AF]">
                    {item}
                  </span>
                ))}
              </div>
              <p className="mt-3 text-sm text-[#64748B]">
                Add anything that supports your identity, study, income, savings, or trusted references.
              </p>
            </div>

            <div className={panelClass}>
              {sortedEvidence.length === 0 ? (
                <div className="rounded-[20px] border border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-5 py-8 text-center">
                  <FolderOpen className="mx-auto h-5 w-5 text-[#64748B]" strokeWidth={1.6} />
                  <p className="mt-3 text-sm font-semibold text-[#0F172A]">No evidence items yet</p>
                  <p className="mt-2 text-sm text-[#64748B]">Add supporting documents in Profile to attach them here.</p>
                  <button
                    type="button"
                    onClick={() => navigate('/profile?tab=evidence')}
                    className="mt-4 inline-flex items-center gap-2 rounded-[18px] border border-[#DBEAFE] px-4 py-3 text-sm font-semibold text-[#1E40AF] transition hover:bg-[#EFF6FF]"
                  >
                    Open Evidence
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {sortedEvidence.map((item) => {
                    const selected = draft.document_item_ids.includes(item.id);
                    return (
                      <label
                        key={item.id}
                        className={`flex cursor-pointer items-start gap-3 rounded-[20px] border p-4 transition ${
                          selected ? 'border-[#BFDBFE] bg-[#EFF6FF]' : 'border-[#E2E8F0] bg-white'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
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
                          <p className="mt-1 text-sm text-[#64748B]">{getEvidenceLabel(item)}</p>
                          {item.notes ? <p className="mt-2 text-sm text-[#94A3B8]">{item.notes}</p> : null}
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : null}

        {stepIndex === 4 ? (
          <div className={panelClass}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <label className={labelClass}>Application Letter</label>
                <p className="text-sm text-[#64748B]">
                  This letter is written in your voice, ready for you to tailor and submit with the rest of your application.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  void generateLetterForDraft(draft, { force: true }).catch(() => {
                    // handled with banner
                  });
                }}
                disabled={letterGenerating}
                className="inline-flex items-center gap-2 rounded-[18px] border border-[#DBEAFE] px-4 py-3 text-sm font-semibold text-[#1E40AF] transition hover:bg-[#EFF6FF] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {letterGenerating ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" strokeWidth={1.8} />}
                {draft.application_letter_template.trim() ? 'Regenerate from details' : 'Generate Letter'}
              </button>
            </div>
            {letterNeedsRegeneration ? (
              <div className="mt-4 rounded-[20px] border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3 text-sm text-[#92400E]">
                Some details changed after the last draft. Regenerate when you want the letter wording refreshed.
              </div>
            ) : null}
            <textarea
              className={`${textareaClass} mt-4 min-h-[260px]`}
              value={draft.application_letter}
              onChange={(event) => patchDraft('application_letter', event.target.value)}
              placeholder={letterGenerating ? 'Generating your letter from the details you entered...' : 'Your application letter will appear here.'}
            />
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
                onClick={() => void handleExport()}
                disabled={exportingId === (draft.id || 'draft')}
                className="inline-flex items-center gap-2 rounded-[18px] border border-[#DBEAFE] px-4 py-3 text-sm font-semibold text-[#1E40AF] transition hover:bg-[#EFF6FF] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {exportingId === (draft.id || 'draft') ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" strokeWidth={1.8} />}
                Export PDF
              </button>
              <button
                type="button"
                onClick={() => setStepIndex((currentStep) => Math.min(APPLICATION_KIT_STEPS.length - 1, currentStep + 1))}
                disabled={stepIndex === APPLICATION_KIT_STEPS.length - 1}
                className="inline-flex items-center gap-2 rounded-[18px] bg-[#0F172A] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1E293B] disabled:cursor-not-allowed disabled:opacity-60"
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
