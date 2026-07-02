import { useCallback, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import {
  AlertTriangle,
  ArrowLeft,
  BedDouble,
  Building2,
  CheckCircle2,
  ChevronRight,
  DollarSign,
  Home,
  LoaderCircle,
  MapPin,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import {
  createNswRentCheck,
  deleteNswRentCheck,
  fetchNswRentChecks,
} from '../lib/api';
import {
  NSW_RENT_CHECK_BEDROOM_OPTIONS,
  calculateNswRentCheckComparison,
  formatNswRentCheckBedrooms,
  formatNswRentCurrency,
  getNswRentCheckPropertyLabel,
  isVerifiedNswAddress,
  normalizeNswRentCheckRecord,
  normalizeNswRentCheckState,
} from '../lib/nsw-rent-check';
import type {
  NswRentCheckAddress,
  NswRentCheckBedrooms,
  NswRentCheckPropertyType,
  NswRentCheckSavedRecord,
} from '../lib/prepare-types';
import { VerifiedAddressInput, type CanonicalAddress } from './address-search-field';

interface NswRentCheckToolProps {
  onFocusChange: (active: boolean, subtitle?: string) => void;
}

const RENT_CHECK_STEPS = [
  { id: 'address', label: 'Address' },
  { id: 'home', label: 'Home' },
  { id: 'beds', label: 'Beds' },
  { id: 'rent', label: 'Rent' },
  { id: 'result', label: 'Result' },
] as const;

const PROPERTY_OPTIONS: Array<{
  value: NswRentCheckPropertyType;
  label: string;
  description: string;
  Icon: typeof Home;
}> = [
  {
    value: 'house',
    label: 'House',
    description: 'Detached, semi, terrace, townhouse, or similar.',
    Icon: Home,
  },
  {
    value: 'unit',
    label: 'Unit',
    description: 'Apartment, flat, studio, or unit in a building.',
    Icon: Building2,
  },
];

const EMPTY_ADDRESS: NswRentCheckAddress = {
  formatted_address: '',
  display_address: '',
  suburb: '',
  postcode: '',
  state: '',
  lat: null,
  lng: null,
  building_id: '',
  unit_number: '',
};

function formatRecordDate(value: string, fallback = 'Recently') {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return fallback;
  return format(parsed, 'dd MMM yyyy');
}

function parseWeeklyRentInput(value: string) {
  const numeric = Number(value.replace(/[^0-9.]/g, ''));
  return Number.isFinite(numeric) ? numeric : null;
}

function getFriendlyRentCheckError(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  if (/string did not match the expected pattern/i.test(message)) return fallback;
  return message || fallback;
}

function toRentCheckAddress(address: CanonicalAddress): NswRentCheckAddress {
  return {
    formatted_address: address.formatted_address || '',
    display_address: address.display_address || address.formatted_address || '',
    suburb: address.suburb || '',
    postcode: address.postcode || '',
    state: normalizeNswRentCheckState(address.state || ''),
    lat: Number.isFinite(address.lat) ? address.lat : null,
    lng: Number.isFinite(address.lng) ? address.lng : null,
    building_id: address.building_id || '',
    unit_number: address.unit_number || '',
  };
}

function getResultStyles(record: NswRentCheckSavedRecord | null) {
  const state = record?.result_state || 'noResult';
  if (state === 'withinMedian') {
    return {
      card: 'border-[#BBF7D0] bg-[linear-gradient(180deg,#F7FFF9_0%,#ECFDF5_100%)]',
      badge: 'bg-[#16A34A] text-white',
      chip: 'bg-[#DCFCE7] text-[#15803D]',
      icon: CheckCircle2,
      label: 'Within median',
    };
  }
  if (state === 'aboveMedian') {
    return {
      card: 'border-[#FDE68A] bg-[linear-gradient(180deg,#FFFDF5_0%,#FFF7ED_100%)]',
      badge: 'bg-[#C2410C] text-white',
      chip: 'bg-[#FFEDD5] text-[#C2410C]',
      icon: AlertTriangle,
      label: 'Above median',
    };
  }
  if (state === 'belowMedian') {
    return {
      card: 'border-[#BFDBFE] bg-[linear-gradient(180deg,#F8FBFF_0%,#EFF6FF_100%)]',
      badge: 'bg-[#1D4ED8] text-white',
      chip: 'bg-[#DBEAFE] text-[#1D4ED8]',
      icon: CheckCircle2,
      label: 'Below median',
    };
  }
  if (state === 'error') {
    return {
      card: 'border-[#FECACA] bg-[linear-gradient(180deg,#FFF7F7_0%,#FEF2F2_100%)]',
      badge: 'bg-[#B91C1C] text-white',
      chip: 'bg-[#FEE2E2] text-[#B91C1C]',
      icon: AlertTriangle,
      label: 'Try again',
    };
  }
  return {
    card: 'border-[#E2E8F0] bg-white',
    badge: 'bg-[#475569] text-white',
    chip: 'bg-[#F8FAFC] text-[#475569]',
    icon: AlertTriangle,
    label: 'No result',
  };
}

function buildTransientErrorRecord(params: {
  email: string;
  address: NswRentCheckAddress | null;
  propertyType: NswRentCheckPropertyType;
  bedrooms: NswRentCheckBedrooms;
  weeklyRent: number;
  message: string;
}): NswRentCheckSavedRecord {
  const now = new Date().toISOString();
  return normalizeNswRentCheckRecord({
    id: '',
    check_number: '',
    email: params.email,
    address: params.address || EMPTY_ADDRESS,
    postcode: params.address?.postcode || '',
    property_type: params.propertyType,
    bedrooms: params.bedrooms,
    weekly_rent: params.weeklyRent,
    median_rent_lower: null,
    median_rent_upper: null,
    source_extraction_date: '',
    result_state: 'error',
    percent_difference: null,
    result_message: params.message,
    created_at: now,
    updated_at: now,
  }, params.email);
}

export function NswRentCheckTool({ onFocusChange }: NswRentCheckToolProps) {
  const email = localStorage.getItem('ghar_email') || '';
  const [checks, setChecks] = useState<NswRentCheckSavedRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'list' | 'edit' | 'result'>('list');
  const [stepIndex, setStepIndex] = useState(0);
  const [address, setAddress] = useState<NswRentCheckAddress | null>(null);
  const [propertyType, setPropertyType] = useState<NswRentCheckPropertyType>('unit');
  const [bedrooms, setBedrooms] = useState<NswRentCheckBedrooms>('2');
  const [weeklyRent, setWeeklyRent] = useState('');
  const [currentRecord, setCurrentRecord] = useState<NswRentCheckSavedRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const sortedChecks = useMemo(
    () => [...checks].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()),
    [checks],
  );

  const loadChecks = useCallback(async () => {
    if (!email) {
      setChecks([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      setChecks(await fetchNswRentChecks(email));
      setNotice('');
      setError('');
    } catch (loadError) {
      console.error('Hoodie NSW rent checks load failed:', loadError);
      setNotice('Saved NSW Rent Checks are unavailable right now. You can still start a new check.');
    } finally {
      setLoading(false);
    }
  }, [email]);

  useEffect(() => {
    void loadChecks();
  }, [loadChecks]);

  useEffect(() => {
    onFocusChange(false, 'NSW Rent Check');
    return () => onFocusChange(false, 'NSW Rent Check');
  }, [onFocusChange]);

  const resetFlow = useCallback(() => {
    setAddress(null);
    setPropertyType('unit');
    setBedrooms('2');
    setWeeklyRent('');
    setCurrentRecord(null);
    setStepIndex(0);
    setNotice('');
    setError('');
  }, []);

  const handleStartNew = () => {
    resetFlow();
    setMode('edit');
  };

  const handleOpenRecord = (record: NswRentCheckSavedRecord) => {
    const normalized = normalizeNswRentCheckRecord(record, email);
    setCurrentRecord(normalized);
    setAddress(normalized.address);
    setPropertyType(normalized.property_type);
    setBedrooms(normalized.bedrooms);
    setWeeklyRent(String(normalized.weekly_rent || ''));
    setStepIndex(4);
    setMode('result');
    setNotice('');
    setError('');
  };

  const validateStep = useCallback((targetStep: number) => {
    if (targetStep === 0) {
      if (!address) return 'Select a verified NSW address first.';
      if (!isVerifiedNswAddress(address)) return 'NSW Rent Check needs a verified NSW address with postcode.';
    }

    if (targetStep === 3) {
      const rent = parseWeeklyRentInput(weeklyRent);
      if (rent === null) return 'Enter the weekly rent as a number.';
      if (rent < 100 || rent > 15000) return 'Weekly rent must be between $100 and $15,000.';
    }

    return '';
  }, [address, weeklyRent]);

  const canMoveToStep = useCallback((targetStep: number) => {
    for (let index = 0; index < Math.min(targetStep, 4); index += 1) {
      if (validateStep(index)) return false;
    }
    return true;
  }, [validateStep]);

  const handleNextStep = () => {
    const stepError = validateStep(stepIndex);
    if (stepError) {
      setError(stepError);
      return;
    }
    setError('');
    setStepIndex((currentStep) => Math.min(3, currentStep + 1));
  };

  const handleStepClick = (targetStep: number) => {
    if (targetStep === 4) {
      if (currentRecord) setMode('result');
      return;
    }
    if (!canMoveToStep(targetStep)) {
      setError('Finish the earlier answers first.');
      return;
    }
    setMode('edit');
    setStepIndex(targetStep);
    setError('');
  };

  const handleAddressChange = (nextAddress: CanonicalAddress) => {
    setAddress(toRentCheckAddress(nextAddress));
    setError('');
    setNotice('');
  };

  const handleRunCheck = async () => {
    const addressError = validateStep(0);
    const rentError = validateStep(3);
    if (addressError || rentError) {
      setError(addressError || rentError);
      setStepIndex(addressError ? 0 : 3);
      return;
    }

    const rent = parseWeeklyRentInput(weeklyRent);
    if (!address || rent === null) return;
    if (!email) {
      setError('Sign in with an email before saving a NSW Rent Check.');
      return;
    }

    setSaving(true);
    setError('');
    setNotice('');
    try {
      const created = await createNswRentCheck({
        email,
        address,
        postcode: address.postcode,
        property_type: propertyType,
        bedrooms,
        weekly_rent: rent,
      });
      setChecks((currentChecks) => [created, ...currentChecks.filter((item) => item.id !== created.id)]);
      setCurrentRecord(created);
      setStepIndex(4);
      setMode('result');
      setNotice('NSW Rent Check saved.');
    } catch (runError) {
      console.error('Hoodie NSW rent check failed:', runError);
      const message = getFriendlyRentCheckError(runError, 'NSW Rent Check could not run right now.');
      setCurrentRecord(buildTransientErrorRecord({
        email,
        address,
        propertyType,
        bedrooms,
        weeklyRent: rent,
        message,
      }));
      setStepIndex(4);
      setMode('result');
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (record: NswRentCheckSavedRecord) => {
    if (!record.id || !window.confirm('Delete this NSW Rent Check?')) return;
    setDeletingId(record.id);
    setNotice('');
    setError('');
    try {
      await deleteNswRentCheck(record.id, email);
      setChecks((currentChecks) => currentChecks.filter((item) => item.id !== record.id));
      if (currentRecord?.id === record.id) {
        setCurrentRecord(null);
        setMode('list');
      }
      setNotice('NSW Rent Check deleted.');
    } catch (deleteError) {
      console.error('Hoodie NSW rent check delete failed:', deleteError);
      setError(getFriendlyRentCheckError(deleteError, 'NSW Rent Check could not be deleted right now.'));
    } finally {
      setDeletingId(null);
    }
  };

  const inputClass = 'w-full min-w-0 max-w-full rounded-[18px] border border-[#E2E8F0] bg-white px-4 py-3 text-sm text-[#0F172A] outline-none transition focus:border-[#1E40AF] focus:ring-2 focus:ring-[#1E40AF]/10';
  const labelClass = 'mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[#94A3B8]';
  const panelClass = 'min-w-0 max-w-full overflow-x-hidden rounded-[28px] border border-[#E2E8F0] bg-white p-4 shadow-sm';
  const activeRecord = currentRecord;
  const activeComparison = activeRecord
    ? calculateNswRentCheckComparison(activeRecord.weekly_rent, activeRecord.median_rent_lower, activeRecord.median_rent_upper)
    : null;
  const resultStyles = getResultStyles(activeRecord);
  const ResultIcon = resultStyles.icon;

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
            <p className="text-sm font-semibold text-[#0F172A]">NSW Rent Check</p>
            <p className="text-xs leading-relaxed text-[#64748B]">Compare a NSW weekly rent with the median range for similar homes.</p>
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

        {sortedChecks.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-[#CBD5E1] bg-white px-6 py-10 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[20px] border border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B]">
              <DollarSign className="h-5 w-5" strokeWidth={1.7} />
            </div>
            <p className="mt-4 text-base font-semibold text-[#0F172A]">No rent checks yet</p>
            <p className="mt-2 text-sm leading-relaxed text-[#64748B]">
              Start with a verified NSW address, then add home type, bedrooms, and weekly rent.
            </p>
          </div>
        ) : (
          sortedChecks.map((record) => {
            const styles = getResultStyles(record);
            return (
              <div key={record.id} className="min-w-0 rounded-[28px] border border-[#E2E8F0] bg-white p-4 shadow-sm">
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-base font-semibold text-[#0F172A]">
                      {record.address.display_address || record.address.formatted_address || 'NSW address'}
                    </p>
                    <p className="mt-1 text-sm text-[#64748B]">
                      {formatNswRentCurrency(record.weekly_rent)}/week • {getNswRentCheckPropertyLabel(record.property_type)} • {formatNswRentCheckBedrooms(record.bedrooms)} bed
                    </p>
                    <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.16em] text-[#94A3B8]">
                      Checked {formatRecordDate(record.updated_at)}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${styles.chip}`}>
                    {styles.label}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenRecord(record)}
                    className="inline-flex items-center gap-2 rounded-[18px] bg-[#F8FAFC] px-4 py-3 text-sm font-semibold text-[#0F172A] transition hover:bg-[#EEF2FF]"
                  >
                    Open Result
                    <ChevronRight className="h-4 w-4" strokeWidth={2} />
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(record)}
                    className="inline-flex items-center gap-2 rounded-[18px] border border-[#FECACA] px-4 py-3 text-sm font-semibold text-[#B91C1C] transition hover:bg-[#FEF2F2]"
                  >
                    {deletingId === record.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" strokeWidth={1.8} />}
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

  if (mode === 'result' && activeRecord) {
    const resultMessage = activeRecord.result_state === 'error'
      ? activeRecord.result_message
      : activeRecord.result_message || activeComparison?.summary || '';

    return (
      <div className="min-h-0 min-w-0 space-y-4 overflow-x-hidden px-4 pb-4 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              setMode('edit');
              setStepIndex(3);
              setError('');
            }}
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
            Back to History
          </button>
        </div>

        {notice ? (
          <div className="rounded-[20px] border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3 text-sm text-[#92400E]">
            {notice}
          </div>
        ) : null}
        {error ? <p className="text-sm text-[#B91C1C]">{error}</p> : null}

        <div className={`min-w-0 overflow-hidden rounded-[30px] border p-5 shadow-sm ${resultStyles.card}`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#64748B]">Rent comparison</p>
              <p className="mt-3 text-2xl font-semibold leading-tight text-[#0F172A]">
                {activeRecord.result_state === 'error' ? 'Check could not run' : activeComparison?.headline || resultStyles.label}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-[#334155]">{resultMessage}</p>
            </div>
            <span className={`inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${resultStyles.badge}`}>
              <ResultIcon className="h-3.5 w-3.5" strokeWidth={1.8} />
              {resultStyles.label}
            </span>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="min-w-0 rounded-[24px] bg-white/80 p-4 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#94A3B8]">Median range</p>
              <p className="mt-2 text-2xl font-semibold text-[#0F172A]">
                {activeRecord.median_rent_lower !== null && activeRecord.median_rent_upper !== null
                  ? `${formatNswRentCurrency(activeRecord.median_rent_lower)} - ${formatNswRentCurrency(activeRecord.median_rent_upper)}`
                  : 'No range'}
              </p>
              <p className="mt-1 text-xs text-[#64748B]">Similar {getNswRentCheckPropertyLabel(activeRecord.property_type).toLowerCase()}s in {activeRecord.postcode}</p>
            </div>
            <div className="min-w-0 rounded-[24px] bg-white/80 p-4 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#94A3B8]">Your rent</p>
              <p className="mt-2 text-2xl font-semibold text-[#0F172A]">{formatNswRentCurrency(activeRecord.weekly_rent)}/week</p>
              <p className="mt-1 text-xs text-[#64748B]">
                {activeComparison?.percent_label ? activeComparison.percent_label : 'Compared with the median range'}
              </p>
            </div>
          </div>
        </div>

        <div className={panelClass}>
          <div className="flex items-start gap-3">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#1E40AF]" strokeWidth={1.8} />
            <div className="min-w-0">
              <p className="break-words text-sm font-semibold text-[#0F172A]">
                {activeRecord.address.display_address || activeRecord.address.formatted_address}
              </p>
              <p className="mt-1 text-sm text-[#64748B]">
                {getNswRentCheckPropertyLabel(activeRecord.property_type)} • {formatNswRentCheckBedrooms(activeRecord.bedrooms)} bed • {activeRecord.address.state} {activeRecord.postcode}
              </p>
              <p className="mt-3 text-xs leading-relaxed text-[#64748B]">
                Source extraction date: {activeRecord.source_extraction_date || 'latest available'}.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[24px] border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-xs leading-relaxed text-[#64748B]">
          Guide only. Rent medians are a comparison aid, not a decision about fairness, affordability, or legal rights.
          <span className="mt-1 block font-semibold text-[#475569]">Source: NSW Fair Trading rental bond lodgement data.</span>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={handleStartNew}
            className="inline-flex items-center justify-center gap-2 rounded-[18px] bg-[#0F172A] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1E293B]"
          >
            <RefreshCw className="h-4 w-4" strokeWidth={1.8} />
            Restart
          </button>
          {activeRecord.id ? (
            <button
              type="button"
              onClick={() => void handleDelete(activeRecord)}
              className="inline-flex items-center justify-center gap-2 rounded-[18px] border border-[#FECACA] px-4 py-3 text-sm font-semibold text-[#B91C1C] transition hover:bg-[#FEF2F2]"
            >
              {deletingId === activeRecord.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" strokeWidth={1.8} />}
              Delete Result
            </button>
          ) : null}
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
              setMode('list');
            }}
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#64748B] transition hover:text-[#0F172A]"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.8} />
            Back
          </button>
          <button
            type="button"
            onClick={resetFlow}
            className="inline-flex items-center gap-2 rounded-[18px] border border-[#E2E8F0] bg-white px-4 py-3 text-sm font-semibold text-[#64748B] transition hover:text-[#0F172A]"
          >
            <RefreshCw className="h-4 w-4" strokeWidth={1.8} />
            Reset
          </button>
        </div>
      </div>

      <div className="px-4 pb-1 pt-4">
        <div className="grid min-w-0 grid-cols-5 gap-1.5 [&>*]:min-w-0">
          {RENT_CHECK_STEPS.map((step, index) => {
            const active = index === stepIndex;
            const available = index < 4 ? canMoveToStep(index) || index <= stepIndex : Boolean(currentRecord);
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => handleStepClick(index)}
                disabled={!available && index !== stepIndex}
                className={`flex min-h-[42px] min-w-0 items-center justify-center rounded-[16px] px-1.5 py-2 text-center text-[11px] font-semibold leading-tight transition ${
                  active
                    ? 'bg-[#0F172A] text-white'
                    : 'border border-[#E2E8F0] bg-white text-[#64748B] hover:text-[#0F172A] disabled:cursor-not-allowed disabled:opacity-45'
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

        {stepIndex === 0 ? (
          <div className={panelClass}>
            <label className={labelClass}>NSW address</label>
            <VerifiedAddressInput
              onChange={handleAddressChange}
              className={inputClass}
              placeholder="Search a NSW rental address..."
            />

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label className={labelClass}>State</label>
                <input className={`${inputClass} bg-[#F8FAFC]`} readOnly value={address?.state || ''} placeholder="Auto-filled" />
              </div>
              <div>
                <label className={labelClass}>Postcode</label>
                <input className={`${inputClass} bg-[#F8FAFC]`} readOnly value={address?.postcode || ''} placeholder="Auto-filled" />
              </div>
            </div>

            {address && !isVerifiedNswAddress(address) ? (
              <div className="mt-4 rounded-[20px] border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#B91C1C]">
                This tool only checks NSW rental bond median data. Choose a verified NSW address to continue.
              </div>
            ) : null}
          </div>
        ) : null}

        {stepIndex === 1 ? (
          <div className={panelClass}>
            <p className="text-sm font-semibold text-[#0F172A]">Home type</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {PROPERTY_OPTIONS.map((option) => {
                const active = propertyType === option.value;
                const OptionIcon = option.Icon;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setPropertyType(option.value);
                      setError('');
                    }}
                    className={`min-w-0 rounded-[24px] border p-4 text-left transition ${
                      active ? 'border-[#1E40AF] bg-[#EFF6FF]' : 'border-[#E2E8F0] bg-white hover:bg-[#F8FAFC]'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] ${active ? 'bg-[#1E40AF] text-white' : 'bg-[#F8FAFC] text-[#64748B]'}`}>
                        <OptionIcon className="h-5 w-5" strokeWidth={1.8} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#0F172A]">{option.label}</p>
                        <p className="mt-1 text-xs leading-relaxed text-[#64748B]">{option.description}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {stepIndex === 2 ? (
          <div className={panelClass}>
            <p className="text-sm font-semibold text-[#0F172A]">Bedrooms</p>
            <div className="mt-4 grid grid-cols-5 gap-2">
              {NSW_RENT_CHECK_BEDROOM_OPTIONS.map((option) => {
                const active = bedrooms === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setBedrooms(option.value);
                      setError('');
                    }}
                    className={`flex aspect-square min-w-0 items-center justify-center rounded-[20px] border text-base font-semibold transition ${
                      active ? 'border-[#0F172A] bg-[#0F172A] text-white' : 'border-[#E2E8F0] bg-white text-[#64748B] hover:text-[#0F172A]'
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
            <div className="mt-4 flex items-center gap-2 rounded-[20px] bg-[#F8FAFC] px-4 py-3 text-sm text-[#64748B]">
              <BedDouble className="h-4 w-4 shrink-0 text-[#1E40AF]" strokeWidth={1.8} />
              <span>{formatNswRentCheckBedrooms(bedrooms)} bedroom{bedrooms === '1' ? '' : 's'} selected</span>
            </div>
          </div>
        ) : null}

        {stepIndex === 3 ? (
          <div className={panelClass}>
            <label className={labelClass}>Weekly rent</label>
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-[#64748B]">$</span>
              <input
                className={`${inputClass} pl-8`}
                inputMode="decimal"
                value={weeklyRent}
                onChange={(event) => {
                  setWeeklyRent(event.target.value);
                  setError('');
                }}
                placeholder="e.g. 780"
              />
            </div>
            <div className="mt-4 rounded-[20px] border border-[#DBEAFE] bg-[#EFF6FF] px-4 py-3 text-sm leading-relaxed text-[#1E40AF]">
              Accepted range: $100 to $15,000 per week.
            </div>
          </div>
        ) : null}

        <div className="mb-4 rounded-[28px] border border-[#E2E8F0] bg-[#F8FAFC] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                setError('');
                setStepIndex((currentStep) => Math.max(0, currentStep - 1));
              }}
              disabled={stepIndex === 0}
              className="rounded-[18px] border border-[#E2E8F0] bg-white px-4 py-3 text-sm font-semibold text-[#64748B] transition hover:text-[#0F172A] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Back
            </button>
            {stepIndex === 3 ? (
              <button
                type="button"
                onClick={() => void handleRunCheck()}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-[18px] bg-[#0F172A] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1E293B] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <DollarSign className="h-4 w-4" strokeWidth={1.8} />}
                Run Check
              </button>
            ) : (
              <button
                type="button"
                onClick={handleNextStep}
                className="inline-flex items-center gap-2 rounded-[18px] border border-[#DBEAFE] px-4 py-3 text-sm font-semibold text-[#1E40AF] transition hover:bg-[#EFF6FF]"
              >
                Next
                <ChevronRight className="h-4 w-4" strokeWidth={1.8} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
