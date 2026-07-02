import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  AlertCircle,
  ArrowLeft,
  Bell,
  Check,
  ChevronDown,
  Globe,
  GraduationCap,
  History,
  Image,
  Loader2,
  Mail,
  MapPin,
  MousePointerClick,
  PauseCircle,
  PlayCircle,
  Smartphone,
  Users,
  X,
} from 'lucide-react';
import { format } from 'date-fns';
import {
  adminSendCampaign,
  createInAppPopupCampaign,
  deleteInAppPopupCampaign,
  fetchAdminCampaigns,
  fetchAdminInAppPopupCampaigns,
  fetchAdminPushStats,
  updateInAppPopupCampaign,
  type InAppPopupCampaignFrequency,
  type InAppPopupCampaignRecord,
} from '../lib/api';
import { australianStates, australianUniversities } from '../lib/au-universities';
import { APP_CONFIG } from '../lib/app-config';
import { APP_VARIANTS, APP_VARIANT, getAppVariantLabel, type TargetableAppVariant } from '../lib/app-variant';
import policeLocations from '../../imports/ghar_police_locations.json';
import hospitalLocations from '../../imports/ghar_hospital_locations.json';

function MultiSelectDropdown({
  options,
  selected,
  onChange,
  placeholder,
  icon,
}: {
  options: { label: string; value: string }[];
  selected: string[];
  onChange: (vals: string[]) => void;
  placeholder: string;
  icon: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase()) ||
    o.value.toLowerCase().includes(search.toLowerCase()),
  );

  const toggle = (val: string) => {
    onChange(selected.includes(val) ? selected.filter((v) => v !== val) : [...selected, val]);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 cursor-pointer text-left"
      >
        <span className="shrink-0">{icon}</span>
        <span className={`flex-1 text-sm truncate ${selected.length > 0 ? 'text-[#0F172A] font-medium' : 'text-[#94A3B8]'}`}>
          {selected.length > 0 ? selected.join(', ') : placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-[#94A3B8] transition-transform shrink-0 ${open ? 'rotate-180' : ''}`} strokeWidth={1.5} />
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-white border border-[#E2E8F0] rounded-xl shadow-xl shadow-[#0F172A]/10 max-h-52 flex flex-col overflow-hidden">
          <div className="p-2 border-b border-[#E2E8F0]">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-full text-xs px-2 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#1E40AF] text-[#0F172A] placeholder-[#94A3B8]"
              autoFocus
            />
          </div>
          <div className="overflow-y-auto flex-1">
            {filtered.length === 0 ? (
              <p className="text-xs text-[#94A3B8] p-3 text-center">No results</p>
            ) : (
              filtered.map((o) => {
                const isSelected = selected.includes(o.value);
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => toggle(o.value)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs cursor-pointer transition-colors ${
                      isSelected ? 'bg-[#EFF6FF] text-[#1E40AF] font-semibold' : 'text-[#0F172A] hover:bg-[#F8FAFC]'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                      isSelected ? 'bg-[#1E40AF] border-[#1E40AF]' : 'border-[#E2E8F0]'
                    }`}>
                      {isSelected && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                    </div>
                    <span className="truncate">{o.label}</span>
                    {o.value !== o.label && <span className="text-[10px] text-[#94A3B8] ml-auto shrink-0">{o.value}</span>}
                  </button>
                );
              })
            )}
          </div>
          {selected.length > 0 && (
            <button
              type="button"
              onClick={() => {
                onChange([]);
                setSearch('');
              }}
              className="w-full text-[10px] text-[#B91C1C] font-semibold py-2 border-t border-[#E2E8F0] hover:bg-[#FEF2F2] cursor-pointer transition-colors"
            >
              Clear all
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const STATE_OPTIONS = australianStates;
const UNIVERSITY_OPTIONS = australianUniversities.map((u) => ({ label: u, value: u }));
const POPUP_APP_VARIANTS = APP_VARIANTS.filter((variant) => variant !== 'jom_settle');
const POPUP_FREQUENCY_OPTIONS: { label: string; value: InAppPopupCampaignFrequency }[] = [
  { label: 'Once', value: 'once' },
  { label: 'Daily', value: 'daily' },
  { label: 'Every open', value: 'every_open' },
];

type CampaignChannel = 'push' | 'popup';

type LocationRecord = {
  postcode?: string | null;
  suburb?: string | null;
  gnaf?: {
    postcode?: string | null;
    suburb?: string | null;
  } | null;
};

function buildPostcodeLabelMap(records: LocationRecord[]) {
  const postcodeToLabels = new Map<string, Map<string, number>>();

  records.forEach((record) => {
    const postcode = String(record.postcode || record.gnaf?.postcode || '').trim();
    const suburb = String(record.suburb || record.gnaf?.suburb || '').trim();
    if (!/^\d{4}$/.test(postcode) || !suburb) return;

    const normalizedSuburb = suburb
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');

    const labelCounts = postcodeToLabels.get(postcode) ?? new Map<string, number>();
    labelCounts.set(normalizedSuburb, (labelCounts.get(normalizedSuburb) ?? 0) + 1);
    postcodeToLabels.set(postcode, labelCounts);
  });

  return Object.fromEntries(
    [...postcodeToLabels.entries()].map(([postcode, labelCounts]) => {
      const bestLabel = [...labelCounts.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? '';
      return [postcode, bestLabel];
    }),
  );
}

const POSTCODE_LABELS = buildPostcodeLabelMap([
  ...(policeLocations as LocationRecord[]),
  ...(hospitalLocations as LocationRecord[]),
]);

function parsePostcodeTargets(value: string) {
  const rawItems = value.split(',').map((item) => item.trim()).filter(Boolean);
  const postcodes = new Set<string>();
  const invalidItems = new Set<string>();

  rawItems.forEach((item) => {
    const normalized = item.replace(/\s+/g, ' ');
    if (/^\d{4}$/.test(normalized)) {
      postcodes.add(normalized);
      return;
    }
    invalidItems.add(normalized);
  });

  return {
    rawItems,
    postcodes: [...postcodes],
    invalidItems: [...invalidItems],
  };
}

function parseEmailTargets(value: string) {
  const rawItems = value.split(',').map((item) => item.trim()).filter(Boolean);
  const emails = new Set<string>();
  const invalidItems = new Set<string>();

  rawItems.forEach((item) => {
    const normalized = item.toLowerCase();
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      emails.add(normalized);
      return;
    }
    invalidItems.add(item);
  });

  return {
    rawItems,
    emails: [...emails],
    invalidItems: [...invalidItems],
  };
}

function toDateTimeLocalValue(value: string | undefined) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function fromDateTimeLocalValue(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString();
}

function getDefaultPopupVariant(): TargetableAppVariant {
  return APP_VARIANT === 'jom_settle' ? 'all' : APP_VARIANT;
}

export function NotificationsPage() {
  const navigate = useNavigate();
  const isAdmin = localStorage.getItem('ghar_admin') === '1';
  const adminEmail = localStorage.getItem('ghar_email') || '';

  const [activeChannel, setActiveChannel] = useState<CampaignChannel>('push');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [link, setLink] = useState('');
  const [campaignVariant, setCampaignVariant] = useState<TargetableAppVariant>(APP_VARIANT);
  const [states, setStates] = useState<string[]>([]);
  const [universities, setUniversities] = useState<string[]>([]);
  const [postcodeInput, setPostcodeInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [dataError, setDataError] = useState('');
  const [success, setSuccess] = useState('');
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [popupCampaigns, setPopupCampaigns] = useState<InAppPopupCampaignRecord[]>([]);
  const [editingPopupId, setEditingPopupId] = useState<string | null>(null);
  const [popupTitle, setPopupTitle] = useState('');
  const [popupImageUrl, setPopupImageUrl] = useState('');
  const [popupClickUrl, setPopupClickUrl] = useState('');
  const [popupAltText, setPopupAltText] = useState('');
  const [popupFrequency, setPopupFrequency] = useState<InAppPopupCampaignFrequency>('once');
  const [popupVariant, setPopupVariant] = useState<TargetableAppVariant>(getDefaultPopupVariant());
  const [popupStartsAt, setPopupStartsAt] = useState('');
  const [popupEndsAt, setPopupEndsAt] = useState('');
  const [popupPriority, setPopupPriority] = useState('0');
  const [popupPaused, setPopupPaused] = useState(false);
  const [popupStates, setPopupStates] = useState<string[]>([]);
  const [popupUniversities, setPopupUniversities] = useState<string[]>([]);
  const [popupPostcodeInput, setPopupPostcodeInput] = useState('');
  const [popupEmailInput, setPopupEmailInput] = useState('');
  const [popupSaving, setPopupSaving] = useState(false);
  const [popupError, setPopupError] = useState('');
  const [popupSuccess, setPopupSuccess] = useState('');
  const [pushStats, setPushStats] = useState<{
    total_devices: number;
    unique_users: number;
    by_platform: Record<string, number>;
    by_app_variant: Record<TargetableAppVariant, number>;
  }>({
    total_devices: 0,
    unique_users: 0,
    by_platform: {},
    by_app_variant: { all: 0, ghar: 0, burb_mate: 0, setu_china: 0, jom_settle: 0 },
  });
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!isAdmin) {
      navigate('/dashboard', { replace: true });
      return;
    }
    void loadAdminData();
  }, [isAdmin, navigate]);

  const postcodeTargets = useMemo(
    () => parsePostcodeTargets(postcodeInput),
    [postcodeInput],
  );
  const emailTargets = useMemo(
    () => parseEmailTargets(emailInput),
    [emailInput],
  );
  const popupPostcodeTargets = useMemo(
    () => parsePostcodeTargets(popupPostcodeInput),
    [popupPostcodeInput],
  );
  const popupEmailTargets = useMemo(
    () => parseEmailTargets(popupEmailInput),
    [popupEmailInput],
  );

  const loadAdminData = async () => {
    setLoadingData(true);
    setDataError('');
    const [campaignData, popupCampaignData, statsData] = await Promise.allSettled([
      fetchAdminCampaigns(adminEmail),
      fetchAdminInAppPopupCampaigns(adminEmail),
      fetchAdminPushStats(adminEmail, 'all'),
    ]);

    if (campaignData.status === 'fulfilled') {
      setCampaigns(campaignData.value);
    } else {
      console.error('GHAR notification campaigns load error:', campaignData.reason);
      setDataError('Campaign history could not be refreshed right now.');
    }

    if (popupCampaignData.status === 'fulfilled') {
      setPopupCampaigns(popupCampaignData.value);
    } else {
      console.error('GHAR popup campaigns load error:', popupCampaignData.reason);
      setDataError((current) => current || 'Popup campaign history could not be refreshed right now.');
    }

    if (statsData.status === 'fulfilled') {
      setPushStats(statsData.value);
    } else {
      console.error('GHAR notification push stats load error:', statsData.reason);
      setDataError((current) => current || 'Push device stats could not be refreshed right now.');
    }

    setLoadingData(false);
  };

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      setError('Title and body are required.');
      return;
    }
    if (postcodeTargets.invalidItems.length > 0) {
      setError('Use 4-digit Australian postcodes only.');
      return;
    }
    if (emailTargets.invalidItems.length > 0) {
      setError('Use valid email addresses only.');
      return;
    }

    setSending(true);
    setError('');
    setSuccess('');

    try {
      const result = await adminSendCampaign({
        title: title.trim(),
        message: body.trim(),
        link: link.trim() || undefined,
        admin_email: adminEmail,
        app_variant: campaignVariant,
        filters: {
          states,
          universities,
          suburbs: [],
          postcodes: postcodeTargets.postcodes,
          emails: emailTargets.emails,
        },
      });

      const targetDevices = result.target_devices || 0;
      const targetUsers = result.target_users || 0;
      const deliveredTokens = result.delivered_token_count || 0;
      const deliveryStatus = result.delivery_status || result.status || 'queued';

      if (deliveryStatus === 'dispatched') {
        setSuccess(`Campaign sent to ${deliveredTokens || targetDevices} devices across ${targetUsers} users.`);
      } else if (deliveryStatus === 'partial') {
        setSuccess(`Campaign partially sent to ${deliveredTokens} of ${targetDevices} devices across ${targetUsers} users.`);
      } else if (deliveryStatus === 'failed') {
        setSuccess(`Campaign created, but delivery failed for ${targetDevices} devices across ${targetUsers} users.`);
      } else {
        setSuccess(`Campaign queued for ${targetDevices} devices across ${targetUsers} users.`);
      }
      setTitle('');
      setBody('');
      setLink('');
      setCampaignVariant(APP_VARIANT);
      setStates([]);
      setUniversities([]);
      setPostcodeInput('');
      setEmailInput('');
      void loadAdminData();
      window.setTimeout(() => setSuccess(''), 5000);
    } catch (err: any) {
      setError(err.message || 'Failed to send notification.');
    } finally {
      setSending(false);
    }
  };

  const resetPopupForm = () => {
    setEditingPopupId(null);
    setPopupTitle('');
    setPopupImageUrl('');
    setPopupClickUrl('');
    setPopupAltText('');
    setPopupFrequency('once');
    setPopupVariant(getDefaultPopupVariant());
    setPopupStartsAt('');
    setPopupEndsAt('');
    setPopupPriority('0');
    setPopupPaused(false);
    setPopupStates([]);
    setPopupUniversities([]);
    setPopupPostcodeInput('');
    setPopupEmailInput('');
  };

  const handleSavePopup = async () => {
    if (!popupTitle.trim() || !popupImageUrl.trim() || !popupClickUrl.trim()) {
      setPopupError('Title, image URL, and click URL are required.');
      return;
    }
    if (popupPostcodeTargets.invalidItems.length > 0) {
      setPopupError('Use 4-digit Australian postcodes only.');
      return;
    }
    if (popupEmailTargets.invalidItems.length > 0) {
      setPopupError('Use valid email addresses only.');
      return;
    }

    const startsAt = fromDateTimeLocalValue(popupStartsAt);
    const endsAt = fromDateTimeLocalValue(popupEndsAt);
    if (popupStartsAt.trim() && !startsAt) {
      setPopupError('Start time is invalid.');
      return;
    }
    if (popupEndsAt.trim() && !endsAt) {
      setPopupError('End time is invalid.');
      return;
    }
    if (startsAt && endsAt && new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
      setPopupError('End time must be after start time.');
      return;
    }

    setPopupSaving(true);
    setPopupError('');
    setPopupSuccess('');

    try {
      const payload = {
        adminEmail,
        title: popupTitle.trim(),
        imageUrl: popupImageUrl.trim(),
        clickUrl: popupClickUrl.trim(),
        altText: popupAltText.trim() || popupTitle.trim(),
        frequency: popupFrequency,
        appVariant: popupVariant,
        startsAt,
        endsAt,
        priority: Number.parseInt(popupPriority, 10) || 0,
        isPaused: popupPaused,
        filters: {
          states: popupStates,
          universities: popupUniversities,
          suburbs: [],
          postcodes: popupPostcodeTargets.postcodes,
          emails: popupEmailTargets.emails,
        },
      };

      if (editingPopupId) {
        await updateInAppPopupCampaign(editingPopupId, payload);
        setPopupSuccess('Popup campaign updated.');
      } else {
        await createInAppPopupCampaign(payload);
        setPopupSuccess('Popup campaign created.');
      }
      resetPopupForm();
      void loadAdminData();
      window.setTimeout(() => setPopupSuccess(''), 5000);
    } catch (err: any) {
      setPopupError(err.message || 'Failed to save popup campaign.');
    } finally {
      setPopupSaving(false);
    }
  };

  const handleEditPopup = (campaign: InAppPopupCampaignRecord) => {
    setActiveChannel('popup');
    setEditingPopupId(campaign.id);
    setPopupTitle(campaign.title || '');
    setPopupImageUrl(campaign.image_url || '');
    setPopupClickUrl(campaign.click_url || '');
    setPopupAltText(campaign.alt_text || '');
    setPopupFrequency(campaign.frequency || 'once');
    setPopupVariant(campaign.app_variant === 'jom_settle' ? 'all' : campaign.app_variant || getDefaultPopupVariant());
    setPopupStartsAt(toDateTimeLocalValue(campaign.starts_at));
    setPopupEndsAt(toDateTimeLocalValue(campaign.ends_at));
    setPopupPriority(String(campaign.priority ?? 0));
    setPopupPaused(Boolean(campaign.is_paused));
    setPopupStates(campaign.target_states || []);
    setPopupUniversities(campaign.target_universities || []);
    setPopupPostcodeInput((campaign.target_postcodes || []).join(', '));
    setPopupEmailInput((campaign.target_emails || []).join(', '));
    setPopupError('');
    setPopupSuccess('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleTogglePopupPaused = async (campaign: InAppPopupCampaignRecord) => {
    setPopupError('');
    setPopupSuccess('');
    try {
      await updateInAppPopupCampaign(campaign.id, {
        adminEmail,
        title: campaign.title,
        imageUrl: campaign.image_url,
        clickUrl: campaign.click_url,
        altText: campaign.alt_text,
        frequency: campaign.frequency,
        appVariant: campaign.app_variant,
        startsAt: campaign.starts_at || '',
        endsAt: campaign.ends_at || '',
        priority: campaign.priority || 0,
        isPaused: !campaign.is_paused,
        filters: {
          states: campaign.target_states || [],
          universities: campaign.target_universities || [],
          suburbs: campaign.target_suburbs || [],
          postcodes: campaign.target_postcodes || [],
          emails: campaign.target_emails || [],
        },
      });
      setPopupSuccess(campaign.is_paused ? 'Popup campaign resumed.' : 'Popup campaign paused.');
      void loadAdminData();
      window.setTimeout(() => setPopupSuccess(''), 5000);
    } catch (err: any) {
      setPopupError(err.message || 'Failed to update popup campaign.');
    }
  };

  const handleDeletePopup = async (campaign: InAppPopupCampaignRecord) => {
    const confirmed = window.confirm(`Delete popup campaign "${campaign.title}"?`);
    if (!confirmed) return;
    setPopupError('');
    setPopupSuccess('');
    try {
      await deleteInAppPopupCampaign(campaign.id, adminEmail);
      setPopupSuccess('Popup campaign deleted.');
      if (editingPopupId === campaign.id) resetPopupForm();
      void loadAdminData();
      window.setTimeout(() => setPopupSuccess(''), 5000);
    } catch (err: any) {
      setPopupError(err.message || 'Failed to delete popup campaign.');
    }
  };

  if (!isAdmin) return null;
  const totalFilters =
    states.length +
    universities.length +
    postcodeTargets.postcodes.length +
    emailTargets.emails.length;
  const popupTotalFilters =
    popupStates.length +
    popupUniversities.length +
    popupPostcodeTargets.postcodes.length +
    popupEmailTargets.emails.length;
  const currentAppDevices = Number(pushStats.by_app_variant?.[APP_VARIANT] ?? 0);
  const appDeviceSummary = APP_VARIANTS
    .map((variant) => `${getAppVariantLabel(variant)}: ${Number(pushStats.by_app_variant?.[variant] ?? 0)}`)
    .join(' | ');
  const allAppDevices = Number(pushStats.total_devices || 0);

  const campaignBadgeClass = (status: string) => {
    switch (status) {
      case 'dispatched':
        return 'bg-[#F0FDF4] text-[#166534] border-[#BBF7D0]';
      case 'failed':
      case 'partial':
        return 'bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]';
      default:
        return 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]';
    }
  };

  const popupCampaignBadgeClass = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-[#F0FDF4] text-[#166534] border-[#BBF7D0]';
      case 'paused':
      case 'expired':
        return 'bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]';
      default:
        return 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]';
    }
  };

  return (
    <div className="size-full bg-white flex flex-col" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="border-b border-[#E2E8F0] px-4 py-3 native-safe-area-top flex items-center justify-between z-10 bg-white">
        <button onClick={() => navigate('/profile')} className="flex items-center gap-2 text-[#64748B] hover:text-[#0F172A] transition-colors cursor-pointer">
          <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
          <span className="text-xs tracking-wide font-medium">Admin</span>
        </button>
        <span className="text-xs tracking-wide text-[#64748B] font-medium">Campaign Manager</span>
        <div className="w-16" />
      </div>

      <div className="flex-1 overflow-y-auto pb-6">
        <div className="mx-4 mt-4 bg-[#B91C1C]/5 border border-[#B91C1C]/20 rounded-xl p-3 flex items-center gap-3">
          <div className="w-9 h-9 bg-[#B91C1C] rounded-xl flex items-center justify-center shrink-0">
            {activeChannel === 'push' ? (
              <Bell className="w-4 h-4 text-white" strokeWidth={2} />
            ) : (
              <Image className="w-4 h-4 text-white" strokeWidth={2} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-[#0F172A] font-bold">
              {activeChannel === 'push' ? 'Push Notifications' : 'In-App Popups'}
            </p>
            <p className="text-[10px] text-[#64748B] font-normal">
              {activeChannel === 'push'
                ? `Send targeted campaigns to ${APP_CONFIG.displayName}, another app, or all apps`
                : 'Create poster popups for SETU India AU, Hoodie, and SETU China'}
            </p>
          </div>
        </div>

        {dataError && (
          <div className="mx-4 mt-4 rounded-xl border border-[#FDE68A] bg-[#FFFBEB] px-3 py-2 text-[11px] text-[#B45309]">
            {dataError}
          </div>
        )}

        <div className="mx-4 mt-4 grid grid-cols-2 gap-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-1">
          <button
            type="button"
            onClick={() => setActiveChannel('push')}
            className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
              activeChannel === 'push'
                ? 'bg-white text-[#B91C1C] shadow-sm'
                : 'text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            <Bell className="w-4 h-4" strokeWidth={1.8} />
            Push
          </button>
          <button
            type="button"
            onClick={() => setActiveChannel('popup')}
            className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
              activeChannel === 'popup'
                ? 'bg-white text-[#B91C1C] shadow-sm'
                : 'text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            <Image className="w-4 h-4" strokeWidth={1.8} />
            Popups
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 px-4 mt-4">
          <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-sm flex flex-col items-center justify-center text-center">
            <div className="w-8 h-8 rounded-full bg-[#1E40AF]/10 flex items-center justify-center mb-2">
              <Smartphone className="w-4 h-4 text-[#1E40AF]" strokeWidth={2} />
            </div>
            <p className="text-2xl font-bold text-[#0F172A]">
              {loadingData ? <Loader2 className="w-5 h-5 animate-spin text-[#94A3B8]" /> : currentAppDevices}
            </p>
            <p className="text-[10px] text-[#94A3B8] uppercase tracking-wide font-medium mt-1">{APP_CONFIG.displayName} Devices</p>
            {!loadingData && (
              <p className="text-[10px] text-[#94A3B8] mt-1">
                {appDeviceSummary} | All apps: {allAppDevices}
              </p>
            )}
          </div>

          <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-sm flex flex-col items-center justify-center text-center">
            <div className="w-8 h-8 rounded-full bg-[#B91C1C]/10 flex items-center justify-center mb-2">
              <History className="w-4 h-4 text-[#B91C1C]" strokeWidth={2} />
            </div>
            <p className="text-2xl font-bold text-[#0F172A]">
              {loadingData ? <Loader2 className="w-5 h-5 animate-spin text-[#94A3B8]" /> : activeChannel === 'push' ? campaigns.length : popupCampaigns.length}
            </p>
            <p className="text-[10px] text-[#94A3B8] uppercase tracking-wide font-medium mt-1">
              {activeChannel === 'push' ? 'Campaigns Sent' : 'Popup Campaigns'}
            </p>
          </div>
        </div>

        <div className={activeChannel === 'push' ? 'block' : 'hidden'}>
        <div className="mx-4 mt-4 bg-white border border-[#E2E8F0] rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-[#E2E8F0]">
            <p className="text-xs font-bold text-[#0F172A]">New Campaign</p>
            <p className="text-[10px] text-[#94A3B8] mt-0.5">Create a targeted push notification and queue it for delivery.</p>
          </div>

          <div className="p-4 space-y-3">
            <div>
              <label className="text-[10px] tracking-wide uppercase text-[#94A3B8] mb-1 block font-medium">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Rental scam alert near UNSW"
                className="w-full px-3 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#B91C1C] focus:ring-2 focus:ring-[#B91C1C]/10 font-normal"
              />
            </div>

            <div>
              <label className="text-[10px] tracking-wide uppercase text-[#94A3B8] mb-1 block font-medium">Body</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Tell affected users what changed and where to look next."
                rows={4}
                className="w-full px-3 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#B91C1C] focus:ring-2 focus:ring-[#B91C1C]/10 font-normal resize-none"
              />
            </div>

            <div>
              <label className="text-[10px] tracking-wide uppercase text-[#94A3B8] mb-1 block font-medium">Target Audience</label>
              <div className="space-y-2 border border-[#E2E8F0] rounded-xl bg-[#F8FAFC] p-3">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-[#B91C1C] shrink-0" strokeWidth={1.8} />
                  <select
                    value={campaignVariant}
                    onChange={(e) => setCampaignVariant(e.target.value as TargetableAppVariant)}
                    className="w-full bg-transparent text-sm text-[#0F172A] focus:outline-none"
                  >
                    {APP_VARIANTS.map((variant) => (
                      <option key={variant} value={variant}>
                        {getAppVariantLabel(variant)} only
                      </option>
                    ))}
                    <option value="all">All apps</option>
                  </select>
                </div>

                <div className="h-px bg-[#E2E8F0]" />

                <MultiSelectDropdown
                  options={STATE_OPTIONS}
                  selected={states}
                  onChange={setStates}
                  placeholder="Target states"
                  icon={<MapPin className="w-4 h-4 text-[#1E40AF]" strokeWidth={1.8} />}
                />

                <div className="h-px bg-[#E2E8F0]" />

                <MultiSelectDropdown
                  options={UNIVERSITY_OPTIONS}
                  selected={universities}
                  onChange={setUniversities}
                  placeholder="Target universities"
                  icon={<GraduationCap className="w-4 h-4 text-[#7C3AED]" strokeWidth={1.8} />}
                />

                <div className="h-px bg-[#E2E8F0]" />

                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-[#D97706] shrink-0" strokeWidth={1.8} />
                  <input
                    type="text"
                    value={postcodeInput}
                    onChange={(e) => setPostcodeInput(e.target.value)}
                    placeholder="Postcodes only (comma-separated)"
                    className="w-full bg-transparent text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none"
                  />
                </div>

                <div className="h-px bg-[#E2E8F0]" />

                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[#B91C1C] shrink-0" strokeWidth={1.8} />
                  <input
                    type="text"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="Specific user emails (comma-separated)"
                    className="w-full bg-transparent text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none"
                  />
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full bg-[#FCE7F3] border border-[#F9A8D4] text-[#9D174D]">
                    App target: {getAppVariantLabel(campaignVariant)}
                  </span>
                  {states.map((state) => (
                    <span key={state} className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full bg-[#EFF6FF] border border-[#BFDBFE] text-[#1E40AF]">
                      {state}
                      <button type="button" onClick={() => setStates(states.filter((v) => v !== state))}>
                        <X className="w-3 h-3" strokeWidth={2} />
                      </button>
                    </span>
                  ))}
                  {universities.map((uni) => (
                    <span key={uni} className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full bg-[#F5F3FF] border border-[#DDD6FE] text-[#7C3AED]">
                      {uni}
                      <button type="button" onClick={() => setUniversities(universities.filter((v) => v !== uni))}>
                        <X className="w-3 h-3" strokeWidth={2} />
                      </button>
                    </span>
                  ))}
                  {postcodeTargets.postcodes.map((postcode) => (
                    <span key={postcode} className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full bg-[#FFFBEB] border border-[#FDE68A] text-[#B45309]">
                      {POSTCODE_LABELS[postcode]
                        ? `${postcode} (${POSTCODE_LABELS[postcode]})`
                        : postcode}
                    </span>
                  ))}
                  {postcodeTargets.invalidItems.map((invalidItem) => (
                    <span key={invalidItem} className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C]">
                      Invalid: {invalidItem}
                    </span>
                  ))}
                  {emailTargets.emails.map((email) => (
                    <span key={email} className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C]">
                      {email}
                    </span>
                  ))}
                  {emailTargets.invalidItems.map((invalidItem) => (
                    <span key={invalidItem} className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C]">
                      Invalid email: {invalidItem}
                    </span>
                  ))}
                  {totalFilters === 0 && (
                    <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C]">
                      Sending to all users
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="text-[10px] tracking-wide uppercase text-[#94A3B8] mb-1 block font-medium">Deep Link (optional)</label>
              <input
                type="text"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="/legal or /dashboard"
                className="w-full px-3 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#B91C1C] focus:ring-2 focus:ring-[#B91C1C]/10 font-normal"
              />
            </div>

            {error && (
              <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-xl p-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[#B91C1C] shrink-0" strokeWidth={2} />
                <p className="text-xs text-[#B91C1C] font-medium">{error}</p>
              </div>
            )}

            {success && (
              <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl p-3 flex items-center gap-2">
                <Check className="w-4 h-4 text-[#16A34A] shrink-0" strokeWidth={2.5} />
                <p className="text-xs text-[#166534] font-medium">{success}</p>
              </div>
            )}

            <button
              onClick={handleSend}
              disabled={sending}
              className="w-full py-3 rounded-xl bg-[#B91C1C] text-white flex items-center justify-center gap-2 hover:bg-[#991B1B] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {sending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />
                  <span className="text-xs tracking-wide font-medium">Queuing Campaign...</span>
                </>
              ) : (
                <>
                  <Bell className="w-4 h-4" strokeWidth={1.8} />
                  <span className="text-xs tracking-wide font-medium">Send Campaign</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="mx-4 mt-4 bg-white border border-[#E2E8F0] rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-[#E2E8F0] flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-[#0F172A]">Campaign History</p>
              <p className="text-[10px] text-[#94A3B8] mt-0.5">Recent queued and delivered notification campaigns.</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center">
              <Users className="w-4 h-4 text-[#64748B]" strokeWidth={1.8} />
            </div>
          </div>

          <div className="divide-y divide-[#E2E8F0]">
            {loadingData ? (
              <div className="p-6 flex justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-[#94A3B8]" strokeWidth={2} />
              </div>
            ) : campaigns.length === 0 ? (
              <div className="p-6 text-center text-sm text-[#94A3B8]">No campaigns yet.</div>
            ) : (
              campaigns.map((campaign) => (
                <div key={campaign.id} className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#0F172A]">{campaign.title}</p>
                      <p className="text-xs text-[#64748B] mt-1 line-clamp-2">{campaign.body}</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-[#FCE7F3] border border-[#F9A8D4] text-[#9D174D]">
                          {getAppVariantLabel(campaign.app_variant || 'ghar')}
                        </span>
                      </div>
                    </div>
                    <span className={`shrink-0 inline-flex items-center px-2 py-1 text-[10px] font-semibold rounded-full border ${campaignBadgeClass(campaign.delivery_status || campaign.status || 'queued')}`}>
                      {(campaign.delivery_status || campaign.status || 'queued').toUpperCase()}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {(campaign.target_states || []).map((state: string) => (
                      <span key={state} className="text-[10px] font-medium px-2 py-1 rounded-full bg-[#EFF6FF] border border-[#BFDBFE] text-[#1E40AF]">
                        {state}
                      </span>
                    ))}
                    {(campaign.target_universities || []).map((uni: string) => (
                      <span key={uni} className="text-[10px] font-medium px-2 py-1 rounded-full bg-[#F5F3FF] border border-[#DDD6FE] text-[#7C3AED]">
                        {uni}
                      </span>
                    ))}
                    {(campaign.target_postcodes || []).map((postcode: string) => (
                      <span key={postcode} className="text-[10px] font-medium px-2 py-1 rounded-full bg-[#FFFBEB] border border-[#FDE68A] text-[#B45309]">
                        {POSTCODE_LABELS[postcode]
                          ? `${postcode} (${POSTCODE_LABELS[postcode]})`
                          : postcode}
                      </span>
                    ))}
                    {(campaign.target_emails || []).map((email: string) => (
                      <span key={email} className="text-[10px] font-medium px-2 py-1 rounded-full bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C]">
                        {email}
                      </span>
                    ))}
                    {!(campaign.target_states?.length || campaign.target_universities?.length || campaign.target_postcodes?.length || campaign.target_emails?.length) && (
                      <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C]">
                        All users
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-3 text-[10px] text-[#94A3B8]">
                    <span>{campaign.recipient_token_count || campaign.target_devices || 0} devices</span>
                    <span>{campaign.recipient_count || campaign.target_users || 0} users</span>
                    <span>{format(new Date(campaign.created_at), 'dd MMM yyyy, h:mm a')}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        </div>

        <div className={activeChannel === 'popup' ? 'block' : 'hidden'}>
          <div className="mx-4 mt-4 bg-white border border-[#E2E8F0] rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-[#E2E8F0] flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-[#0F172A]">
                  {editingPopupId ? 'Edit Popup Campaign' : 'New Popup Campaign'}
                </p>
                <p className="text-[10px] text-[#94A3B8] mt-0.5">Show a poster popup when eligible users open the app.</p>
              </div>
              {editingPopupId && (
                <button
                  type="button"
                  onClick={resetPopupForm}
                  className="text-[10px] font-semibold text-[#64748B] hover:text-[#0F172A]"
                >
                  Cancel edit
                </button>
              )}
            </div>

            <div className="p-4 space-y-3">
              <div>
                <label className="text-[10px] tracking-wide uppercase text-[#94A3B8] mb-1 block font-medium">Campaign Title</label>
                <input
                  type="text"
                  value={popupTitle}
                  onChange={(e) => setPopupTitle(e.target.value)}
                  placeholder="Starbucks Matcha BOGO"
                  className="w-full px-3 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#B91C1C] focus:ring-2 focus:ring-[#B91C1C]/10 font-normal"
                />
              </div>

              <div>
                <label className="text-[10px] tracking-wide uppercase text-[#94A3B8] mb-1 block font-medium">Poster Image URL</label>
                <input
                  type="url"
                  value={popupImageUrl}
                  onChange={(e) => setPopupImageUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#B91C1C] focus:ring-2 focus:ring-[#B91C1C]/10 font-normal"
                />
              </div>

              <div>
                <label className="text-[10px] tracking-wide uppercase text-[#94A3B8] mb-1 block font-medium">Click URL</label>
                <input
                  type="text"
                  value={popupClickUrl}
                  onChange={(e) => setPopupClickUrl(e.target.value)}
                  placeholder="/events/cityofsydney/event-slug or https://..."
                  className="w-full px-3 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#B91C1C] focus:ring-2 focus:ring-[#B91C1C]/10 font-normal"
                />
              </div>

              <div>
                <label className="text-[10px] tracking-wide uppercase text-[#94A3B8] mb-1 block font-medium">Alt Text</label>
                <input
                  type="text"
                  value={popupAltText}
                  onChange={(e) => setPopupAltText(e.target.value)}
                  placeholder="Short poster description"
                  className="w-full px-3 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#B91C1C] focus:ring-2 focus:ring-[#B91C1C]/10 font-normal"
                />
              </div>

              {popupImageUrl.trim() && (
                <div className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]">
                  <img src={popupImageUrl.trim()} alt={popupAltText.trim() || popupTitle.trim() || 'Popup preview'} className="max-h-64 w-full object-contain" />
                </div>
              )}

              <div>
                <label className="text-[10px] tracking-wide uppercase text-[#94A3B8] mb-1 block font-medium">Delivery Rules</label>
                <div className="space-y-2 border border-[#E2E8F0] rounded-xl bg-[#F8FAFC] p-3">
                  <div className="flex items-center gap-2">
                    <Image className="w-4 h-4 text-[#B91C1C] shrink-0" strokeWidth={1.8} />
                    <select
                      value={popupVariant}
                      onChange={(e) => setPopupVariant(e.target.value as TargetableAppVariant)}
                      className="w-full bg-transparent text-sm text-[#0F172A] focus:outline-none"
                    >
                      {POPUP_APP_VARIANTS.map((variant) => (
                        <option key={variant} value={variant}>
                          {getAppVariantLabel(variant)} only
                        </option>
                      ))}
                      <option value="all">All 3 popup apps</option>
                    </select>
                  </div>

                  <div className="h-px bg-[#E2E8F0]" />

                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={popupFrequency}
                      onChange={(e) => setPopupFrequency(e.target.value as InAppPopupCampaignFrequency)}
                      className="w-full bg-white border border-[#E2E8F0] rounded-lg px-2 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#B91C1C]"
                    >
                      {POPUP_FREQUENCY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={popupPriority}
                      onChange={(e) => setPopupPriority(e.target.value)}
                      placeholder="Priority"
                      className="w-full bg-white border border-[#E2E8F0] rounded-lg px-2 py-2 text-xs text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#B91C1C]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="datetime-local"
                      value={popupStartsAt}
                      onChange={(e) => setPopupStartsAt(e.target.value)}
                      className="w-full bg-white border border-[#E2E8F0] rounded-lg px-2 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#B91C1C]"
                    />
                    <input
                      type="datetime-local"
                      value={popupEndsAt}
                      onChange={(e) => setPopupEndsAt(e.target.value)}
                      className="w-full bg-white border border-[#E2E8F0] rounded-lg px-2 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#B91C1C]"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => setPopupPaused((value) => !value)}
                    className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-xs font-semibold ${
                      popupPaused
                        ? 'border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]'
                        : 'border-[#BBF7D0] bg-[#F0FDF4] text-[#166534]'
                    }`}
                  >
                    <span>{popupPaused ? 'Paused' : 'Active when schedule matches'}</span>
                    {popupPaused ? <PauseCircle className="w-4 h-4" /> : <PlayCircle className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] tracking-wide uppercase text-[#94A3B8] mb-1 block font-medium">Target Audience</label>
                <div className="space-y-2 border border-[#E2E8F0] rounded-xl bg-[#F8FAFC] p-3">
                  <MultiSelectDropdown
                    options={STATE_OPTIONS}
                    selected={popupStates}
                    onChange={setPopupStates}
                    placeholder="Target states"
                    icon={<MapPin className="w-4 h-4 text-[#1E40AF]" strokeWidth={1.8} />}
                  />

                  <div className="h-px bg-[#E2E8F0]" />

                  <MultiSelectDropdown
                    options={UNIVERSITY_OPTIONS}
                    selected={popupUniversities}
                    onChange={setPopupUniversities}
                    placeholder="Target universities"
                    icon={<GraduationCap className="w-4 h-4 text-[#7C3AED]" strokeWidth={1.8} />}
                  />

                  <div className="h-px bg-[#E2E8F0]" />

                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-[#D97706] shrink-0" strokeWidth={1.8} />
                    <input
                      type="text"
                      value={popupPostcodeInput}
                      onChange={(e) => setPopupPostcodeInput(e.target.value)}
                      placeholder="Postcodes only (comma-separated)"
                      className="w-full bg-transparent text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none"
                    />
                  </div>

                  <div className="h-px bg-[#E2E8F0]" />

                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-[#B91C1C] shrink-0" strokeWidth={1.8} />
                    <input
                      type="text"
                      value={popupEmailInput}
                      onChange={(e) => setPopupEmailInput(e.target.value)}
                      placeholder="Specific user emails (comma-separated)"
                      className="w-full bg-transparent text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none"
                    />
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full bg-[#FCE7F3] border border-[#F9A8D4] text-[#9D174D]">
                      App target: {getAppVariantLabel(popupVariant)}
                    </span>
                    {popupStates.map((state) => (
                      <span key={state} className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full bg-[#EFF6FF] border border-[#BFDBFE] text-[#1E40AF]">
                        {state}
                      </span>
                    ))}
                    {popupUniversities.map((uni) => (
                      <span key={uni} className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full bg-[#F5F3FF] border border-[#DDD6FE] text-[#7C3AED]">
                        {uni}
                      </span>
                    ))}
                    {popupPostcodeTargets.postcodes.map((postcode) => (
                      <span key={postcode} className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full bg-[#FFFBEB] border border-[#FDE68A] text-[#B45309]">
                        {POSTCODE_LABELS[postcode] ? `${postcode} (${POSTCODE_LABELS[postcode]})` : postcode}
                      </span>
                    ))}
                    {popupPostcodeTargets.invalidItems.map((invalidItem) => (
                      <span key={invalidItem} className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C]">
                        Invalid: {invalidItem}
                      </span>
                    ))}
                    {popupEmailTargets.emails.map((email) => (
                      <span key={email} className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C]">
                        {email}
                      </span>
                    ))}
                    {popupEmailTargets.invalidItems.map((invalidItem) => (
                      <span key={invalidItem} className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C]">
                        Invalid email: {invalidItem}
                      </span>
                    ))}
                    {popupTotalFilters === 0 && (
                      <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C]">
                        All users
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {popupError && (
                <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-xl p-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-[#B91C1C] shrink-0" strokeWidth={2} />
                  <p className="text-xs text-[#B91C1C] font-medium">{popupError}</p>
                </div>
              )}

              {popupSuccess && (
                <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl p-3 flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#16A34A] shrink-0" strokeWidth={2.5} />
                  <p className="text-xs text-[#166534] font-medium">{popupSuccess}</p>
                </div>
              )}

              <button
                onClick={handleSavePopup}
                disabled={popupSaving}
                className="w-full py-3 rounded-xl bg-[#B91C1C] text-white flex items-center justify-center gap-2 hover:bg-[#991B1B] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {popupSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />
                    <span className="text-xs tracking-wide font-medium">Saving Popup...</span>
                  </>
                ) : (
                  <>
                    <Image className="w-4 h-4" strokeWidth={1.8} />
                    <span className="text-xs tracking-wide font-medium">{editingPopupId ? 'Update Popup' : 'Create Popup'}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="mx-4 mt-4 bg-white border border-[#E2E8F0] rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-[#E2E8F0] flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-[#0F172A]">Popup Campaign History</p>
                <p className="text-[10px] text-[#94A3B8] mt-0.5">Active, scheduled, paused, and expired poster popups.</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center">
                <MousePointerClick className="w-4 h-4 text-[#64748B]" strokeWidth={1.8} />
              </div>
            </div>

            <div className="divide-y divide-[#E2E8F0]">
              {loadingData ? (
                <div className="p-6 flex justify-center">
                  <Loader2 className="w-5 h-5 animate-spin text-[#94A3B8]" strokeWidth={2} />
                </div>
              ) : popupCampaigns.length === 0 ? (
                <div className="p-6 text-center text-sm text-[#94A3B8]">No popup campaigns yet.</div>
              ) : (
                popupCampaigns.map((campaign) => {
                  const status = campaign.status || 'scheduled';
                  return (
                    <div key={campaign.id} className="p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="w-16 h-20 overflow-hidden rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] shrink-0">
                          <img src={campaign.image_url} alt="" className="h-full w-full object-cover" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-[#0F172A] truncate">{campaign.title}</p>
                              <p className="text-xs text-[#64748B] mt-1 truncate">{campaign.click_url}</p>
                            </div>
                            <span className={`shrink-0 inline-flex items-center px-2 py-1 text-[10px] font-semibold rounded-full border ${popupCampaignBadgeClass(status)}`}>
                              {status.toUpperCase()}
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-2 mt-2">
                            <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-[#FCE7F3] border border-[#F9A8D4] text-[#9D174D]">
                              {getAppVariantLabel(campaign.app_variant)}
                            </span>
                            <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-[#EFF6FF] border border-[#BFDBFE] text-[#1E40AF]">
                              {campaign.frequency.replace('_', ' ')}
                            </span>
                            <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-[#FFFBEB] border border-[#FDE68A] text-[#B45309]">
                              Priority {campaign.priority || 0}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {(campaign.target_states || []).map((state) => (
                          <span key={state} className="text-[10px] font-medium px-2 py-1 rounded-full bg-[#EFF6FF] border border-[#BFDBFE] text-[#1E40AF]">
                            {state}
                          </span>
                        ))}
                        {(campaign.target_universities || []).map((uni) => (
                          <span key={uni} className="text-[10px] font-medium px-2 py-1 rounded-full bg-[#F5F3FF] border border-[#DDD6FE] text-[#7C3AED]">
                            {uni}
                          </span>
                        ))}
                        {(campaign.target_postcodes || []).map((postcode) => (
                          <span key={postcode} className="text-[10px] font-medium px-2 py-1 rounded-full bg-[#FFFBEB] border border-[#FDE68A] text-[#B45309]">
                            {POSTCODE_LABELS[postcode] ? `${postcode} (${POSTCODE_LABELS[postcode]})` : postcode}
                          </span>
                        ))}
                        {(campaign.target_emails || []).map((email) => (
                          <span key={email} className="text-[10px] font-medium px-2 py-1 rounded-full bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C]">
                            {email}
                          </span>
                        ))}
                        {!(campaign.target_states?.length || campaign.target_universities?.length || campaign.target_postcodes?.length || campaign.target_emails?.length) && (
                          <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C]">
                            All users
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[10px] text-[#64748B]">
                        <span>{campaign.impression_count || 0} impressions</span>
                        <span>{campaign.click_count || 0} clicks</span>
                        <span>{campaign.starts_at ? `Starts ${format(new Date(campaign.starts_at), 'dd MMM, h:mm a')}` : 'Starts immediately'}</span>
                        <span>{campaign.ends_at ? `Ends ${format(new Date(campaign.ends_at), 'dd MMM, h:mm a')}` : 'No end time'}</span>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleEditPopup(campaign)}
                          className="flex-1 rounded-lg border border-[#E2E8F0] px-3 py-2 text-xs font-semibold text-[#0F172A] hover:bg-[#F8FAFC]"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTogglePopupPaused(campaign)}
                          className="flex-1 rounded-lg border border-[#E2E8F0] px-3 py-2 text-xs font-semibold text-[#0F172A] hover:bg-[#F8FAFC]"
                        >
                          {campaign.is_paused ? 'Resume' : 'Pause'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePopup(campaign)}
                          className="flex-1 rounded-lg border border-[#FECACA] px-3 py-2 text-xs font-semibold text-[#B91C1C] hover:bg-[#FEF2F2]"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
