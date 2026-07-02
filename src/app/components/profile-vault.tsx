import { useState, useEffect, useMemo, useRef } from 'react';
import { User, GraduationCap, MapPin, Shield, Clock, Home, Plus, Star, ChevronDown, ChevronUp, FileText, Calendar, FolderOpen, Search, LogOut, X, Check, AlertTriangle, ShieldAlert, Wrench, Pencil, ArrowLeft, Scale, Upload, Paperclip, Link2, Trash2, KeyRound, Briefcase, UserPlus, Users, RotateCcw, MailPlus, ChartPie } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { fetchRentalHistory, createRentalEntry, updateRentalEntry, deleteRentalEntry, fetchProfile, updateProfile, createEvidence, uploadEvidenceFile, deleteEvidence, deleteProfile, adminInit, adminCheck, adminSendOtp, adminVerifyOtp, deletePublicPlan, fetchPublicPlans, joinPublicPlan, leavePublicPlan, fetchMyHousehold, createHousehold, type PublicPlan } from '../lib/api';
import type { Evidence, Listing, RentalEntry } from '../lib/mock-data';
import { getHouseholdAttentionSummary, getHouseholdAddressLabel, hasAcknowledgedLatestHouseholdRules, sortTimelineEntriesForHousehold, type HouseholdDashboardResponse, type HouseholdInvite } from '../lib/household';
import { VerifiedAddressInput } from './address-search-field';
import type { CanonicalAddress } from './address-search-field';
import { SetuPartnershipBadge } from './setu-partnership-badge';
import { useNavigate, useSearchParams } from 'react-router';
import { RiskAssessmentModal } from './risk-assessment-modal';
import { AdminPanel } from './admin-panel';
import { UsersPanel } from './users-panel';
import { ReferralInvitesPanel } from './referral-invites-panel';
import { isNativeShell } from '../lib/platform';
import { captureEvidencePhoto } from '../lib/native-media';
import { APP_CONFIG } from '../lib/app-config';
import setuIndiaHero from '../../assets/setu-india-hero.png';
import { buildPublicPlanRoute } from '../lib/public-plan-links';
import { getPublicPlanActionGridClass } from '../lib/public-plan-ui';
import { buildHouseholdRoute, parseHouseholdRoute, parseHouseholdRouteParams } from '../lib/household-route';
import { getLegalTabRoute } from '../lib/resources-routes';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from './ui/drawer';
import { HoodieHelpTrigger, useHoodieHelpTour } from './hoodie-help-tour';
import { HouseholdPanel, type HouseholdSectionTab } from './household-panel';
import setuChinaHero from '../../assets/setu-china-hero.png';
import setuMalaysiaHomeBackground from '../../assets/setu-malaysia-home-background.png';
import mascaPartnership from '../../assets/masca-partnership.svg';
import { setuChinaShortcutIcons } from '../lib/setu-china-icons';
import { setuIndiaShortcutIcons } from '../lib/setu-india-icons';
import { setuMalaysiaShortcutIcons } from '../lib/setu-malaysia-icons';
import {
  codeFieldProps,
  decimalFieldProps,
  getKeyboardAwareSheetStyle,
  keyboardAwareInlineScrollStyle,
  keyboardAwareModalPaddingStyle,
  keyboardAwareNestedScrollStyle,
  urlFieldProps,
} from '../lib/keyboard-ui';

interface ProfileVaultProps {
  evidence: Evidence[];
  listings: Listing[];
  onLogout: () => void;
  initialTab?: ProfileVaultTab;
  autoAddAddress?: boolean;
  autoAddWork?: boolean;
  autoAddEvidence?: boolean;
  autoHealthCheck?: boolean;
  shellVariant?: 'default' | 'setu-china' | 'setu-india' | 'setu-malaysia';
}

export type ProfileVaultTab = 'overview' | 'timeline' | 'household' | 'evidence' | 'plans' | 'invites' | 'admin' | 'users';
type Tab = ProfileVaultTab;
type HouseholdSetupContinuation = 'household-expenses' | 'household-bills' | 'household-chores' | null;

function parseHouseholdSetupContinuation(value: string | null): HouseholdSetupContinuation {
  if (value === 'household-expenses' || value === 'household-bills' || value === 'household-chores') {
    return value;
  }
  return null;
}

function getHouseholdSetupContinuationRoute(continuation: HouseholdSetupContinuation) {
  if (continuation === 'household-expenses') return '/household/expenses';
  if (continuation === 'household-bills') return buildHouseholdRoute({ sectionTab: 'bills' });
  if (continuation === 'household-chores') return buildHouseholdRoute({ sectionTab: 'chores' });
  return '';
}

function getHouseholdSetupContinuationLabel(continuation: HouseholdSetupContinuation) {
  if (continuation === 'household-bills') return 'Bills';
  if (continuation === 'household-chores') return 'Chores';
  return 'Expense Tracker';
}

export function ProfileVault({ evidence, listings, onLogout, initialTab, autoAddAddress, autoAddWork, autoAddEvidence, autoHealthCheck, shellVariant = 'default' }: ProfileVaultProps) {
  const email = (localStorage.getItem('ghar_email') || '').trim().toLowerCase();
  const firstName = localStorage.getItem('ghar_first_name') || '';
  const lastName = localStorage.getItem('ghar_last_name') || '';
  const displayName = [firstName, lastName].filter(Boolean).join(' ') || 'Student';
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const householdSetupContinuation = parseHouseholdSetupContinuation(searchParams.get('next'));
  const householdSetupContinuationRoute = getHouseholdSetupContinuationRoute(householdSetupContinuation);
  const householdSetupContinuationLabel = getHouseholdSetupContinuationLabel(householdSetupContinuation);
  const shouldContinueToHouseholdSetup = Boolean(householdSetupContinuationRoute);
  const {
    enabled: helpTourEnabled,
    restartTour,
    activeMode: helpTourMode,
    activeStepId: helpTourStepId,
  } = useHoodieHelpTour();
  const householdRouteState = parseHouseholdRouteParams(searchParams);
  const householdInviteToken = householdRouteState.inviteToken;
  const householdInviteIntent = householdRouteState.inviteIntent;
  const householdSectionTab = householdRouteState.sectionTab as HouseholdSectionTab;

  const [activeTab, setActiveTab] = useState<Tab>(initialTab || 'timeline');
  const [profile, setProfile] = useState<any>(null);
  const [rentalHistory, setRentalHistory] = useState<RentalEntry[]>([]);
  const [householdDashboard, setHouseholdDashboard] = useState<HouseholdDashboardResponse>({
    household: null,
    pending_invites: [],
    shared_bills: [],
    bill_contacts: [],
  });
  const [householdLoadError, setHouseholdLoadError] = useState('');
  const [myPlans, setMyPlans] = useState<PublicPlan[]>([]);
  const [myPlansError, setMyPlansError] = useState('');
  const [myPlanActionId, setMyPlanActionId] = useState<string | null>(null);
  const [myPlanDeleteId, setMyPlanDeleteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddRental, setShowAddRental] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showReturnBanner, setShowReturnBanner] = useState(false);
  const [showWorkForm, setShowWorkForm] = useState(false);
  const [workAddress, setWorkAddress] = useState('');
  const [workDisplayAddress, setWorkDisplayAddress] = useState('');
  const [workState, setWorkState] = useState('');
  const [workPostcode, setWorkPostcode] = useState('');
  const [workLat, setWorkLat] = useState<number | null>(null);
  const [workLng, setWorkLng] = useState<number | null>(null);
  const [workAddressVerified, setWorkAddressVerified] = useState(false);
  const [workSaving, setWorkSaving] = useState(false);
  const [workError, setWorkError] = useState('');
  const [workSavedMessage, setWorkSavedMessage] = useState('');

  // Add evidence modal state
  const [showAddEvidence, setShowAddEvidence] = useState(false);
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [evidenceNotes, setEvidenceNotes] = useState('');
  const [evidenceAssociatedAddress, setEvidenceAssociatedAddress] = useState('');
  const [evidenceAssociatedLabel, setEvidenceAssociatedLabel] = useState('');
  const [evidenceExternalLink, setEvidenceExternalLink] = useState('');
  const [evidenceAddressSearch, setEvidenceAddressSearch] = useState('');
  const [evidenceSaving, setEvidenceSaving] = useState(false);
  const [evidenceUploading, setEvidenceUploading] = useState(false);
  const [evidenceError, setEvidenceError] = useState('');
  const [showEvidenceReturnBanner, setShowEvidenceReturnBanner] = useState(false);
  const [showAddressDropdown, setShowAddressDropdown] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [accountDeleteError, setAccountDeleteError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nativeShell = isNativeShell();

  // Add rental form state
  const [newAddress, setNewAddress] = useState('');
  const [newDisplayAddress, setNewDisplayAddress] = useState('');
  const [newUnitNumber, setNewUnitNumber] = useState('');
  const [newBuildingId, setNewBuildingId] = useState('');
  const [newState, setNewState] = useState('');
  const [newPostcode, setNewPostcode] = useState('');
  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');
  const [newIsCurrent, setNewIsCurrent] = useState(false);
  const [newLandlord, setNewLandlord] = useState('');
  const [newRent, setNewRent] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [newLat, setNewLat] = useState<number | null>(null);
  const [newLng, setNewLng] = useState<number | null>(null);
  const [newAddressVerified, setNewAddressVerified] = useState(false);

  // Review form state
  const [reviewCategory, setReviewCategory] = useState<string>('');
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(0);

  // Edit timeline entry state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAddress, setEditAddress] = useState('');
  const [editDisplayAddress, setEditDisplayAddress] = useState('');
  const [editUnitNumber, setEditUnitNumber] = useState('');
  const [editBuildingId, setEditBuildingId] = useState('');
  const [editState, setEditState] = useState('');
  const [editPostcode, setEditPostcode] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editIsCurrent, setEditIsCurrent] = useState(false);
  const [editLandlord, setEditLandlord] = useState('');
  const [editRent, setEditRent] = useState('');
  const [editError, setEditError] = useState('');
  const [editLat, setEditLat] = useState<number | null>(null);
  const [editLng, setEditLng] = useState<number | null>(null);
  const [editAddressVerified, setEditAddressVerified] = useState(false);
  const [editReviewCategory, setEditReviewCategory] = useState<string>('');
  const [editReviewText, setEditReviewText] = useState('');
  const [editReviewRating, setEditReviewRating] = useState(0);

  // Risk Assessment Modal state
  const [showRiskAssessment, setShowRiskAssessment] = useState(false);
  const [riskAssessmentEntry, setRiskAssessmentEntry] = useState<RentalEntry | null>(null);

  // Admin Easter Egg state
  const [setuTapCount, setSetuTapCount] = useState(0);
  const setuTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminStep, setAdminStep] = useState<'checking' | 'not-admin' | 'sending' | 'verify' | 'success'>('checking');
  const [adminOtp, setAdminOtp] = useState('');
  const [adminError, setAdminError] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(() => localStorage.getItem('ghar_admin') === '1');
  const [showCurrentAddressPrompt, setShowCurrentAddressPrompt] = useState(false);
  const [showProfileDrawer, setShowProfileDrawer] = useState(false);
  const [showCreateHouseholdModal, setShowCreateHouseholdModal] = useState(false);
  const [selectedHouseholdTimelineId, setSelectedHouseholdTimelineId] = useState('');
  const [createHouseholdSaving, setCreateHouseholdSaving] = useState(false);
  const [createHouseholdError, setCreateHouseholdError] = useState('');
  const [postCreateHouseholdRoute, setPostCreateHouseholdRoute] = useState<string | null>(null);
  const [pendingOwnerInviteLaunch, setPendingOwnerInviteLaunch] = useState<{
    householdId: string;
    invite: HouseholdInvite | null;
    shareUrl: string;
  } | null>(null);
  const pendingHouseRulesProfilePromptRef = useRef('');
  const handledHouseholdSetupContinuationRef = useRef('');
  const [suspendHouseholdResumeRefresh, setSuspendHouseholdResumeRefresh] = useState(false);
  const suspendHouseholdResumeRefreshRef = useRef(false);
  const profileCacheKey = email ? `ghar_profile_cache:${email}` : '';
  const rentalHistoryCacheKey = email ? `ghar_rental_history_cache:${email}` : '';
  const usesHoodieProfileNav = APP_CONFIG.experienceMode === 'hoodie';
  const isSetuChinaProfileShell = shellVariant === 'setu-china';
  const isSetuIndiaProfileShell = shellVariant === 'setu-india';
  const isSetuMalaysiaProfileShell = shellVariant === 'setu-malaysia';
  const isStudentProfileShell = isSetuChinaProfileShell || isSetuIndiaProfileShell || isSetuMalaysiaProfileShell;
  const studentProfileTitle = isSetuChinaProfileShell ? 'Profile 我的' : isSetuMalaysiaProfileShell ? 'Profil Profile' : 'Profile';
  const studentProfileHero = isSetuChinaProfileShell
    ? setuChinaHero
    : isSetuMalaysiaProfileShell
      ? setuMalaysiaHomeBackground
      : setuIndiaHero;
  const studentProfileIcon = isSetuChinaProfileShell
    ? setuChinaShortcutIcons.profile
    : isSetuMalaysiaProfileShell
      ? setuMalaysiaShortcutIcons.profile
      : setuIndiaShortcutIcons.profile;
  const isProfileOnboardingStep = helpTourMode === 'first_run' && helpTourStepId === 'profile';
  const isHouseholdOnboardingStep = helpTourMode === 'first_run' && helpTourStepId === 'household';

  const readCachedState = <T,>(key: string): T | null => {
    if (!key) return null;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  };

  const writeCachedState = (key: string, value: unknown) => {
    if (!key) return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // ignore storage quota / private mode issues
    }
  };

  useEffect(() => {
    if (!email) {
      setLoading(false);
      return;
    }
    void loadData();
  }, [email]);

  useEffect(() => {
    if (loading || !email) return;

    const hasCurrentAddress = rentalHistory.some((entry) => entry.is_current);
    if (hasCurrentAddress) {
      setShowCurrentAddressPrompt(false);
      return;
    }

    const dismissedKey = `ghar_current_address_prompt_dismissed:${email}`;
    if (sessionStorage.getItem(dismissedKey) === '1') return;

    const timer = window.setTimeout(() => setShowCurrentAddressPrompt(true), 600);
    return () => window.clearTimeout(timer);
  }, [loading, rentalHistory, email]);

  // Auto-open "Add Address" form when navigated from Legal Center
  useEffect(() => {
    if (autoAddAddress && !loading) {
      setActiveTab('timeline');
      setShowAddRental(true);
    }
  }, [autoAddAddress, loading]);

  useEffect(() => {
    if (autoAddWork && !loading) {
      setActiveTab('overview');
      setShowWorkForm(true);
    }
  }, [autoAddWork, loading]);

  // Auto-open "Add Evidence" form when navigated from Legal Center
  useEffect(() => {
    if (autoAddEvidence && !loading) {
      setActiveTab('evidence');
      setShowAddEvidence(true);
    }
  }, [autoAddEvidence, loading]);

  // Auto-open Health Check modal when navigated from triage trigger or notification
  useEffect(() => {
    if (autoHealthCheck && !loading && rentalHistory.length > 0) {
      const currentEntry = rentalHistory.find(r => r.is_current);
      if (currentEntry) {
        setActiveTab('timeline');
        setRiskAssessmentEntry(currentEntry);
        setShowRiskAssessment(true);
      }
    }
  }, [autoHealthCheck, loading, rentalHistory]);

  useEffect(() => {
    if (loading || autoAddAddress || autoAddWork || autoAddEvidence || autoHealthCheck || !initialTab) {
      return;
    }
    setActiveTab(initialTab);
  }, [autoAddAddress, autoAddEvidence, autoAddWork, autoHealthCheck, initialTab, loading]);

  useEffect(() => {
    if (loading || !usesHoodieProfileNav) return;
    if (isProfileOnboardingStep) {
      setShowProfileDrawer(true);
    }
  }, [isProfileOnboardingStep, loading, usesHoodieProfileNav]);

  useEffect(() => {
    if (loading) return;
    if (!isHouseholdOnboardingStep) return;
    setShowProfileDrawer(false);
    setActiveTab('household');
    const nextParams = new URLSearchParams();
    nextParams.set('tab', 'household');
    if (householdInviteToken) {
      nextParams.set('invite', householdInviteToken);
    }
    if (householdInviteIntent) {
      nextParams.set('invite_intent', householdInviteIntent);
    }
    navigate(`/profile?${nextParams.toString()}`, { replace: true });
  }, [householdInviteIntent, householdInviteToken, isHouseholdOnboardingStep, loading, navigate]);

  const loadData = async () => {
    if (!email) {
      setProfile(null);
      setRentalHistory([]);
      setHouseholdDashboard({ household: null, pending_invites: [], shared_bills: [], bill_contacts: [] });
      setMyPlans([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setMyPlansError('');
    setHouseholdLoadError('');
    const cachedProfile = readCachedState<any>(profileCacheKey);
    const cachedRentalHistory = readCachedState<RentalEntry[]>(rentalHistoryCacheKey);
    try {
      const [profileResult, historyResult, plansResult, householdResult] = await Promise.allSettled([
        fetchProfile(email),
        fetchRentalHistory(email),
        fetchPublicPlans({ viewerEmail: email, scope: 'my' }),
        fetchMyHousehold(email),
      ]);

      if (profileResult.status === 'fulfilled') {
        setProfile(profileResult.value);
        if (profileResult.value) {
          writeCachedState(profileCacheKey, profileResult.value);
        }
      } else {
        console.error('GHAR profile load error:', profileResult.reason);
        if (cachedProfile) {
          setProfile(cachedProfile);
        }
      }

      if (historyResult.status === 'fulfilled') {
        setRentalHistory(historyResult.value);
        writeCachedState(rentalHistoryCacheKey, historyResult.value);
      } else {
        console.error('GHAR rental history load error:', historyResult.reason);
        if (cachedRentalHistory) {
          setRentalHistory(cachedRentalHistory);
        }
      }

      if (plansResult.status === 'fulfilled') {
        setMyPlans(plansResult.value);
      } else {
        console.error('GHAR my plans load error:', plansResult.reason);
        setMyPlansError('My Plans could not be refreshed just now.');
      }

      if (householdResult.status === 'fulfilled') {
        setHouseholdDashboard(householdResult.value);
      } else {
        console.error('GHAR household load error:', householdResult.reason);
        setHouseholdLoadError('Household could not be refreshed just now.');
      }
    } catch (err) {
      console.error('GHAR profile data load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!email) return;

    const handleResumeRefresh = () => {
      if (suspendHouseholdResumeRefreshRef.current) return;
      if (document.visibilityState === 'visible') {
        void loadData();
      }
    };

    window.addEventListener('focus', handleResumeRefresh);
    document.addEventListener('visibilitychange', handleResumeRefresh);
    return () => {
      window.removeEventListener('focus', handleResumeRefresh);
      document.removeEventListener('visibilitychange', handleResumeRefresh);
    };
  }, [email]);

  useEffect(() => {
    if (!email) return;

    const handleMutationRefresh = () => {
      if (suspendHouseholdResumeRefreshRef.current) return;
      void loadData();
    };

    window.addEventListener('ghar-household-mutation', handleMutationRefresh);
    return () => {
      window.removeEventListener('ghar-household-mutation', handleMutationRefresh);
    };
  }, [email]);

  useEffect(() => {
    suspendHouseholdResumeRefreshRef.current = suspendHouseholdResumeRefresh;
  }, [suspendHouseholdResumeRefresh]);

  const formatPlanMeetup = (value?: string) => {
    if (!value) return 'TBA';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return format(date, 'EEE d MMM • h:mm a');
  };

  const openPlanInvite = (plan: PublicPlan) => {
    navigate(buildPublicPlanRoute(plan.event_source, plan.event_slug, plan.id, { invite: true }));
  };

  const handleMyPlanJoinLeave = async (plan: PublicPlan) => {
    if (!email) return;
    setMyPlanActionId(plan.id);
    setMyPlansError('');
    try {
      if (plan.viewer_joined && plan.can_leave) {
        await leavePublicPlan(plan.id, email);
      } else {
        await joinPublicPlan(plan.id, email);
      }
      await loadData();
    } catch (err) {
      console.error('GHAR my plans join/leave error:', err);
      setMyPlansError(err instanceof Error ? err.message : 'My Plans could not be updated just now.');
    } finally {
      setMyPlanActionId(null);
    }
  };

  const handleMyPlanDelete = async (plan: PublicPlan) => {
    if (!email || !window.confirm('Delete this plan permanently? This removes the plan, attendees, and comments.')) {
      return;
    }
    setMyPlanDeleteId(plan.id);
    setMyPlansError('');
    try {
      await deletePublicPlan(plan.id, email);
      await loadData();
    } catch (err) {
      console.error('GHAR my plans delete error:', err);
      setMyPlansError(err instanceof Error ? err.message : 'My Plans could not be updated just now.');
    } finally {
      setMyPlanDeleteId(null);
    }
  };

  const resetWorkForm = (nextProfile: any = profile) => {
    setShowWorkForm(false);
    setWorkAddress(String(nextProfile?.work_address || ''));
    setWorkDisplayAddress(String(nextProfile?.work_display_address || ''));
    setWorkState(String(nextProfile?.work_state || ''));
    setWorkPostcode(String(nextProfile?.work_postcode || ''));
    setWorkLat(nextProfile?.work_lat ?? null);
    setWorkLng(nextProfile?.work_lng ?? null);
    setWorkAddressVerified(Boolean(nextProfile?.work_address_verified));
    setWorkError('');
  };

  const openWorkForm = () => {
    setShowWorkForm(true);
    setWorkSavedMessage('');
    setWorkAddress(String(profile?.work_address || ''));
    setWorkDisplayAddress(String(profile?.work_display_address || ''));
    setWorkState(String(profile?.work_state || ''));
    setWorkPostcode(String(profile?.work_postcode || ''));
    setWorkLat(profile?.work_lat ?? null);
    setWorkLng(profile?.work_lng ?? null);
    setWorkAddressVerified(Boolean(profile?.work_address_verified));
    setWorkError('');
  };

  const handleSaveWork = async () => {
    if (!workAddress.trim()) {
      setWorkError('Work address is required');
      return;
    }
    setWorkError('');
    setWorkSaving(true);
    setWorkSavedMessage('');
    try {
      const updated = await updateProfile(email, {
        work_address: workAddress.trim(),
        work_display_address: workDisplayAddress || workAddress.trim(),
        work_state: workState,
        work_postcode: workPostcode,
        work_lat: workLat,
        work_lng: workLng,
        work_address_verified: workAddressVerified,
      });
      setProfile(updated);
      resetWorkForm(updated);
      setWorkSavedMessage('Work destination saved. The transport planner can use it now.');
    } catch (err) {
      console.error('GHAR work address save error:', err);
      setWorkError('Failed to save work destination. Please try again.');
    } finally {
      setWorkSaving(false);
    }
  };

  // Auto-init current user as admin if no admins exist
  useEffect(() => {
    if (email) {
      adminInit(email).catch(() => {});
    }
  }, [email]);

  // 7-tap Easter egg handler
  const handleSetuTap = () => {
    if (setuTapTimer.current) clearTimeout(setuTapTimer.current);
    const newCount = setuTapCount + 1;
    setSetuTapCount(newCount);
    if (newCount >= 7) {
      setSetuTapCount(0);
      openAdminModal();
    } else {
      setuTapTimer.current = setTimeout(() => setSetuTapCount(0), 2000);
    }
  };

  const openAdminModal = async () => {
    setShowAdminModal(true);
    setAdminStep('checking');
    setAdminOtp('');
    setAdminError('');
    try {
      const result = await adminCheck(email);
      if (result.is_admin) {
        setAdminStep('sending');
        await adminSendOtp(email);
        setAdminStep('verify');
      } else {
        setAdminStep('not-admin');
      }
    } catch (err: any) {
      setAdminError(err.message || 'Failed to check admin status');
      setAdminStep('not-admin');
    }
  };

  useEffect(() => {
    if (!isStudentProfileShell) return;
    const handleAdminUnlock = () => {
      void openAdminModal();
    };
    window.addEventListener('setu-india-admin-unlock', handleAdminUnlock);
    return () => {
      window.removeEventListener('setu-india-admin-unlock', handleAdminUnlock);
    };
  }, [email, isStudentProfileShell]);

  const handleAdminVerify = async () => {
    if (adminOtp.length !== 6) { setAdminError('Enter the 6-character code'); return; }
    setAdminLoading(true);
    setAdminError('');
    try {
      await adminVerifyOtp(email, adminOtp);
      localStorage.setItem('ghar_admin', '1');
      setIsAdmin(true);
      setAdminStep('success');
      setTimeout(() => {
        setShowAdminModal(false);
        setActiveTab('admin');
      }, 1000);
    } catch (err: any) {
      setAdminError(err.message || 'Verification failed');
    } finally {
      setAdminLoading(false);
    }
  };

  const handleAdminResend = async () => {
    setAdminLoading(true);
    setAdminError('');
    try {
      await adminSendOtp(email);
      setAdminError('');
    } catch (err: any) {
      setAdminError(err.message || 'Failed to resend code');
    } finally {
      setAdminLoading(false);
    }
  };

  const handleCurrentAddressPromptDismiss = () => {
    if (email) {
      sessionStorage.setItem(`ghar_current_address_prompt_dismissed:${email}`, '1');
    }
    setShowCurrentAddressPrompt(false);
  };

  const handleStartCurrentAddressAssessment = () => {
    setShowCurrentAddressPrompt(false);
    setActiveTab('timeline');
    setShowAddRental(true);
  };

  const sortedHistory = useMemo(() =>
    [...rentalHistory].sort((a, b) => {
      if (a.is_current && !b.is_current) return -1;
      if (!a.is_current && b.is_current) return 1;
      return new Date(b.start_date).getTime() - new Date(a.start_date).getTime();
    }),
    [rentalHistory]
  );
  const household = householdDashboard.household;
  const householdPendingInvites = householdDashboard.pending_invites;
  const householdSharedBills = householdDashboard.shared_bills || [];
  const householdBillContacts = householdDashboard.bill_contacts || [];
  const profileFullName = useMemo(
    () => [
      String(profile?.first_name || firstName || '').trim(),
      String(profile?.last_name || lastName || '').trim(),
    ].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim(),
    [firstName, lastName, profile?.first_name, profile?.last_name],
  );
  const householdTimelineOptions = useMemo(() => sortTimelineEntriesForHousehold(rentalHistory), [rentalHistory]);
  const selectedHouseholdTimelineEntry = useMemo(
    () => householdTimelineOptions.find((entry) => entry.id === selectedHouseholdTimelineId) || null,
    [householdTimelineOptions, selectedHouseholdTimelineId],
  );
  const householdAttentionSummary = useMemo(
    () => getHouseholdAttentionSummary(household, email, householdPendingInvites, householdSharedBills),
    [email, household, householdPendingInvites, householdSharedBills],
  );
  const householdBadgeCount = household || householdSharedBills.length > 0
    ? householdAttentionSummary.billsDue + householdAttentionSummary.choresDue
    : householdPendingInvites.filter((invite) => invite.status === 'pending').length;

  const hasExplicitHouseholdRouteTarget = Boolean(
    householdInviteToken
    || householdRouteState.billId
    || householdRouteState.paymentId
    || householdRouteState.choreId
    || householdRouteState.notificationId
    || householdRouteState.source
    || shouldContinueToHouseholdSetup,
  );

  useEffect(() => {
    if (loading || !email || !household || hasExplicitHouseholdRouteTarget) return;
    if (hasAcknowledgedLatestHouseholdRules(household, email, profileFullName)) return;

    const promptKey = [
      household.id,
      email,
      household.house_rules?.current_version_id || 'latest',
    ].join(':');
    if (pendingHouseRulesProfilePromptRef.current === promptKey) return;

    pendingHouseRulesProfilePromptRef.current = promptKey;
    setActiveTab('household');
    navigate(buildHouseholdRoute({ sectionTab: 'rules' }), { replace: true });
  }, [email, hasExplicitHouseholdRouteTarget, household, loading, navigate, profileFullName]);

  const buildProfileTabRoute = (
    tab: Tab,
    options?: { replace?: boolean; keepInviteQuery?: boolean; householdSection?: HouseholdSectionTab },
  ) => {
    if (tab === 'household') {
      navigate(buildHouseholdRoute({
        sectionTab: options?.householdSection || householdSectionTab,
        inviteToken: options?.keepInviteQuery !== false ? householdInviteToken : null,
        inviteIntent: options?.keepInviteQuery !== false ? householdInviteIntent : null,
      }), { replace: options?.replace });
      return;
    }

    const nextParams = new URLSearchParams();
    nextParams.set('tab', tab);
    navigate(`/profile?${nextParams.toString()}`, { replace: options?.replace });
  };

  const openProfileTab = (
    tab: Tab,
    options?: { replace?: boolean; closeDrawer?: boolean; keepInviteQuery?: boolean; householdSection?: HouseholdSectionTab },
  ) => {
    setActiveTab(tab);
    if (options?.closeDrawer) {
      setShowProfileDrawer(false);
    }
    buildProfileTabRoute(tab, {
      replace: options?.replace,
      keepInviteQuery: options?.keepInviteQuery,
      householdSection: options?.householdSection,
    });
  };

  const openCreateHouseholdModal = (options?: { postCreateRoute?: string | null }) => {
    if (household) {
      if (options?.postCreateRoute) {
        navigate(options.postCreateRoute);
        return;
      }
      openProfileTab('household');
      return;
    }
    const defaultTimelineEntry = householdTimelineOptions.find((entry) => entry.is_current) || householdTimelineOptions[0];
    if (!defaultTimelineEntry) {
      setActiveTab('timeline');
      setShowCreateHouseholdModal(false);
      setPostCreateHouseholdRoute(null);
      return;
    }
    setPostCreateHouseholdRoute(options?.postCreateRoute || null);
    setSelectedHouseholdTimelineId(defaultTimelineEntry.id);
    setCreateHouseholdError('');
    setShowCreateHouseholdModal(true);
  };

  const closeCreateHouseholdModal = () => {
    setShowCreateHouseholdModal(false);
    setCreateHouseholdError('');
    setPostCreateHouseholdRoute(null);
  };

  useEffect(() => {
    if (!householdSetupContinuation || !householdSetupContinuationRoute) {
      handledHouseholdSetupContinuationRef.current = '';
      return;
    }
    if (loading || autoAddAddress) return;

    const continuationKey = [
      householdSetupContinuation,
      household?.id || 'no-household',
      householdTimelineOptions.length,
    ].join(':');
    if (handledHouseholdSetupContinuationRef.current === continuationKey) return;

    handledHouseholdSetupContinuationRef.current = continuationKey;

    if (household) {
      navigate(householdSetupContinuationRoute, { replace: true });
      return;
    }

    if (householdTimelineOptions.length > 0) {
      const defaultTimelineEntry = householdTimelineOptions.find((entry) => entry.is_current) || householdTimelineOptions[0];
      if (!defaultTimelineEntry) {
        navigate(`/profile?action=add-address&next=${householdSetupContinuation}`, { replace: true });
        return;
      }
      setActiveTab('household');
      setSelectedHouseholdTimelineId(defaultTimelineEntry.id);
      setPostCreateHouseholdRoute(householdSetupContinuationRoute);
      setCreateHouseholdError('');
      setShowCreateHouseholdModal(true);
      return;
    }

    navigate(`/profile?action=add-address&next=${householdSetupContinuation}`, { replace: true });
  }, [
    autoAddAddress,
    household,
    householdSetupContinuation,
    householdSetupContinuationRoute,
    householdTimelineOptions,
    loading,
    navigate,
  ]);

  const openExpenseTrackerFromProfileDrawer = () => {
    setShowProfileDrawer(false);
    if (household) {
      navigate('/household/expenses');
      return;
    }
    if (householdTimelineOptions.length > 0) {
      openCreateHouseholdModal({ postCreateRoute: '/household/expenses' });
      return;
    }
    navigate('/profile?action=add-address&next=household-expenses');
  };

  const clearHouseholdInviteQuery = () => {
    navigate(buildHouseholdRoute({
      sectionTab: householdSectionTab,
    }), { replace: true });
  };

  const handleHouseholdSectionTabChange = (nextSectionTab: HouseholdSectionTab) => {
    buildProfileTabRoute('household', {
      replace: true,
      keepInviteQuery: true,
      householdSection: nextSectionTab,
    });
  };

  const handleOpenHouseholdRoute = (route: string) => {
    if (route.startsWith('/household/expenses')) {
      navigate(route);
      return;
    }
    const nextRoute = parseHouseholdRoute(route);
    navigate(buildHouseholdRoute({
      sectionTab: nextRoute.sectionTab,
      inviteToken: nextRoute.inviteToken,
      inviteIntent: nextRoute.inviteIntent,
      billId: nextRoute.billId,
      paymentId: nextRoute.paymentId,
      choreId: nextRoute.choreId,
      notificationId: nextRoute.notificationId,
      source: nextRoute.source,
    }));
  };

  const handleAddRental = async () => {
    if (!newAddress.trim()) { setFormError('Address is required'); return; }
    if (!newStartDate) { setFormError('Start date is required'); return; }
    setFormError('');
    setSaving(true);
    try {
      const entry = await createRentalEntry({
        email,
        address: newAddress.trim(),
        display_address: newDisplayAddress,
        unit_number: newUnitNumber,
        building_id: newBuildingId,
        state: newState,
        postcode: newPostcode,
        start_date: newStartDate,
        end_date: newIsCurrent ? '' : newEndDate,
        is_current: newIsCurrent,
        landlord_name: newLandlord,
        monthly_rent: newRent ? parseFloat(newRent) : null,
        lat: newLat,
        lng: newLng,
        address_verified: newAddressVerified,
      });
      setRentalHistory(prev => [...prev, entry]);
      const wasCurrent = newIsCurrent;
      resetAddForm();
      // Trigger global data refresh in case entry has coordinates for map
      window.dispatchEvent(new CustomEvent('ghar-review-changed'));
      // Show return banner if user came from Legal Center
      if (autoAddAddress) {
        setShowReturnBanner(true);
      }
      if (autoAddAddress && shouldContinueToHouseholdSetup) {
        setSelectedHouseholdTimelineId(entry.id);
        setPostCreateHouseholdRoute(householdSetupContinuationRoute);
        setCreateHouseholdError('');
        setShowCreateHouseholdModal(true);
      }
      // Trigger Move-In Risk Assessment for current addresses
      if (wasCurrent && !entry.risk_assessment && !shouldContinueToHouseholdSetup) {
        setRiskAssessmentEntry(entry);
        setShowRiskAssessment(true);
      }
    } catch (err) {
      console.error('GHAR add rental error:', err);
      setFormError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddReview = async (entryId: string) => {
    if (!reviewCategory) return;
    setSaving(true);
    try {
      const updated = await updateRentalEntry(entryId, {
        email,
        review_category: reviewCategory,
        review_text: reviewText,
        review_rating: reviewRating,
      });
      setRentalHistory(prev => prev.map(r => r.id === entryId ? updated : r));
      setReviewingId(null);
      setReviewCategory('');
      setReviewText('');
      setReviewRating(0);
      // Trigger global data refresh so public map blip syncs
      window.dispatchEvent(new CustomEvent('ghar-review-changed'));
    } catch (err) {
      console.error('GHAR review error:', err);
    } finally {
      setSaving(false);
    }
  };

  const resetAddForm = () => {
    setShowAddRental(false);
    setNewAddress('');
    setNewDisplayAddress('');
    setNewUnitNumber('');
    setNewBuildingId('');
    setNewState('');
    setNewPostcode('');
    setNewStartDate('');
    setNewEndDate('');
    setNewIsCurrent(false);
    setNewLandlord('');
    setNewRent('');
    setFormError('');
    setNewLat(null);
    setNewLng(null);
    setNewAddressVerified(false);
  };

  const startEditing = (entry: RentalEntry) => {
    setEditingId(entry.id);
    setEditAddress(entry.address);
    setEditDisplayAddress(entry.display_address || '');
    setEditUnitNumber(entry.unit_number || '');
    setEditBuildingId(entry.building_id || '');
    setEditState(entry.state || '');
    setEditPostcode(entry.postcode || '');
    setEditStartDate(entry.start_date || '');
    setEditEndDate(entry.end_date || '');
    setEditIsCurrent(entry.is_current);
    setEditLandlord(entry.landlord_name || '');
    setEditRent(entry.monthly_rent ? String(entry.monthly_rent) : '');
    setEditError('');
    setEditLat(entry.lat ?? null);
    setEditLng(entry.lng ?? null);
    setEditAddressVerified(entry.address_verified ?? false);
    setEditReviewCategory(entry.review_category || '');
    setEditReviewText(entry.review_text || '');
    setEditReviewRating(entry.review_rating || 0);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditError('');
  };

  const handleSaveEdit = async (entryId: string) => {
    if (!editAddress.trim()) { setEditError('Address is required'); return; }
    if (!editStartDate) { setEditError('Start date is required'); return; }
    setEditError('');
    setSaving(true);
    try {
      const updated = await updateRentalEntry(entryId, {
        email,
        address: editAddress.trim(),
        display_address: editDisplayAddress,
        unit_number: editUnitNumber,
        building_id: editBuildingId,
        state: editState,
        postcode: editPostcode,
        start_date: editStartDate,
        end_date: editIsCurrent ? '' : editEndDate,
        is_current: editIsCurrent,
        landlord_name: editLandlord,
        monthly_rent: editRent ? parseFloat(editRent) : null,
        lat: editLat,
        lng: editLng,
        address_verified: editAddressVerified,
        review_category: editReviewCategory,
        review_text: editReviewText,
        review_rating: editReviewRating,
      });
      setRentalHistory(prev => prev.map(r => r.id === entryId ? updated : r));
      setEditingId(null);
      // Trigger global data refresh so map blip syncs
      window.dispatchEvent(new CustomEvent('ghar-review-changed'));
    } catch (err) {
      console.error('GHAR edit rental error:', err);
      setEditError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEntry = async (entryId: string, entryEmail: string) => {
    setSaving(true);
    try {
      await deleteRentalEntry(entryEmail, entryId);
      setRentalHistory(prev => prev.filter(r => r.id !== entryId));
      setEditingId(null);
      // Trigger global data refresh to remove map blip
      window.dispatchEvent(new CustomEvent('ghar-review-changed'));
    } catch (err) {
      console.error('GHAR delete rental error:', err);
    } finally {
      setSaving(false);
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType?.startsWith('image/')) return <Paperclip className="w-4 h-4" strokeWidth={1.5} />;
    if (fileType?.startsWith('audio/')) return <Paperclip className="w-4 h-4" strokeWidth={1.5} />;
    return <Paperclip className="w-4 h-4" strokeWidth={1.5} />;
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const filteredEvidence = evidence.filter(
    e => (e.filename || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
         (e.notes || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
         (e.associated_address_label || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group by associated_address_label (or listing_id as fallback)
  const groupedEvidence = filteredEvidence.reduce((acc, e) => {
    const key = e.associated_address_label || e.associated_address || e.listing_id || 'unlinked';
    if (!acc[key]) acc[key] = [];
    acc[key].push(e);
    return acc;
  }, {} as Record<string, Evidence[]>);

  // Build address options for the dropdown from rental history + listings
  const addressOptions = useMemo(() => {
    const options: { id: string; label: string; source: 'timeline' | 'alert' }[] = [];
    // From rental history
    rentalHistory.forEach(r => {
      const label = r.display_address || r.address;
      if (label) {
        options.push({
          id: r.id,
          label: `${r.unit_number ? `Unit ${r.unit_number}, ` : ''}${label}`,
          source: 'timeline',
        });
      }
    });
    // From listings/alerts
    listings.forEach(l => {
      const label = l.address;
      if (label && !options.some(o => o.label === label)) {
        options.push({
          id: l.id,
          label: `${l.unit_number ? `Unit ${l.unit_number}, ` : ''}${label}`,
          source: 'alert',
        });
      }
    });
    return options;
  }, [rentalHistory, listings]);

  const filteredAddressOptions = evidenceAddressSearch
    ? addressOptions.filter(o => o.label.toLowerCase().includes(evidenceAddressSearch.toLowerCase()))
    : addressOptions;

  // Count scams/maintenance from BOTH listings AND rental history reviews
  const listingScams = listings.filter(l => l.category === 'scam').length;
  const listingMaint = listings.filter(l => l.category === 'maintenance').length;
  const rentalScams = rentalHistory.filter(r => r.review_category === 'scam').length;
  const rentalMaint = rentalHistory.filter(r => r.review_category === 'maintenance').length;
  // Use the higher count (rental reviews are source of truth if blip sync is pending)
  const scamCount = Math.max(listingScams, rentalScams);
  const maintCount = Math.max(listingMaint, rentalMaint);
  const inputClass = "w-full px-3 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#1E40AF] focus:ring-2 focus:ring-[#1E40AF]/10 font-normal";
  const dateInputClass = "w-full min-w-0 max-w-full h-11 px-2.5 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-[13px] leading-tight text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#1E40AF] focus:ring-2 focus:ring-[#1E40AF]/10 font-normal [color-scheme:light]";
  const labelClass = "text-[10px] tracking-wide uppercase text-[#94A3B8] mb-1 block font-medium";

  const resetEvidenceForm = () => {
    setShowAddEvidence(false);
    setEvidenceFile(null);
    setEvidenceNotes('');
    setEvidenceAssociatedAddress('');
    setEvidenceAssociatedLabel('');
    setEvidenceExternalLink('');
    setEvidenceAddressSearch('');
    setEvidenceError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleNativePhotoCapture = async () => {
    try {
      const file = await captureEvidencePhoto();
      if (file) {
        setEvidenceFile(file);
        setEvidenceError('');
      }
    } catch (err) {
      console.error('GHAR native evidence capture error:', err);
      setEvidenceError('Could not access camera or photo library. Please try again.');
    }
  };

  const handleDeleteAccount = async () => {
    if (!email) return;

    const confirmed = window.confirm(
      `Delete your ${APP_CONFIG.displayName} account and all associated data? This removes your profile, rental history, legal cases, evidence, and linked public timeline alerts.`,
    );
    if (!confirmed) return;

    setDeletingAccount(true);
    setAccountDeleteError('');
    try {
      const deleteResult = await deleteProfile(email);
      const successMessage = deleteResult?.demo_reset
        ? 'Demo account deleted successfully. Sign in again with delete-demo@ghar.app to repeat the demo.'
        : `Your ${APP_CONFIG.displayName} account was deleted successfully.`;
      sessionStorage.setItem('ghar_post_logout_message', successMessage);
      onLogout();
    } catch (err) {
      console.error('GHAR delete account error:', err);
      setAccountDeleteError(`Failed to delete your account. Please email ${APP_CONFIG.supportEmail} for help.`);
    } finally {
      setDeletingAccount(false);
    }
  };

  const handleCreateHousehold = async () => {
    if (!email) return;
    if (!selectedHouseholdTimelineId) {
      setCreateHouseholdError('Choose one of your Timeline homes first.');
      return;
    }
    if (!selectedHouseholdTimelineEntry) {
      setCreateHouseholdError('Selected Timeline home could not be found.');
      return;
    }

    setCreateHouseholdSaving(true);
    setCreateHouseholdError('');
    try {
      const result = await createHousehold({
        email,
        timelineEntryId: selectedHouseholdTimelineId,
      });
      setPendingOwnerInviteLaunch({
        householdId: result.household.id,
        invite: result.invite || null,
        shareUrl: result.share_url || result.invite?.share_url || '',
      });
      setShowCreateHouseholdModal(false);
      setSelectedHouseholdTimelineId('');
      await loadData();
      if (postCreateHouseholdRoute) {
        const route = postCreateHouseholdRoute;
        setPostCreateHouseholdRoute(null);
        navigate(route, { replace: true });
        return;
      }
      openProfileTab('household', { replace: true, keepInviteQuery: true });
    } catch (err) {
      console.error('GHAR create household error:', err);
      setCreateHouseholdError(err instanceof Error ? err.message : 'Failed to create household.');
    } finally {
      setCreateHouseholdSaving(false);
    }
  };

  const tabs: { id: Tab; label: string; count?: number; icon: any }[] = [
    { id: 'overview', label: 'Profile', icon: User },
    { id: 'timeline', label: 'Timeline', count: rentalHistory.length, icon: Home },
    { id: 'household', label: 'Household', count: householdBadgeCount, icon: Users },
    { id: 'evidence', label: 'Evidence', count: evidence.length, icon: FolderOpen },
    { id: 'plans', label: 'My Plans', count: myPlans.length, icon: Calendar },
    { id: 'invites', label: 'Invites', icon: MailPlus },
    ...(isAdmin
      ? [
          { id: 'admin' as Tab, label: 'Admin', icon: ShieldAlert },
          { id: 'users' as Tab, label: 'Users', icon: Users },
        ]
      : []),
  ];
  const activeProfileTab = tabs.find((item) => item.id === activeTab) || tabs[0];
  const ActiveProfileTabIcon = activeProfileTab.icon;
  const hasUsersProfileTab = tabs.some((item) => item.id === 'users');
  const profileDrawerItems = tabs.reduce<Array<{ type: 'tab'; tab: (typeof tabs)[number] } | { type: 'expense' }>>((items, tab) => {
    items.push({ type: 'tab', tab });
    if (tab.id === (hasUsersProfileTab ? 'users' : 'household')) {
      items.push({ type: 'expense' });
    }
    return items;
  }, []);

  return (
    <div className="flex size-full min-h-0 flex-col overflow-x-hidden bg-white" style={{ fontFamily: 'Inter, sans-serif' }}>
      {isStudentProfileShell ? (
        <div className="bg-white px-4 pb-3 pt-5 native-safe-area-top">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h1 className="text-[2rem] font-black leading-tight text-[#080B12]">{studentProfileTitle}</h1>
            <HoodieHelpTrigger
              stepId={activeTab === 'household' ? 'household' : 'profile'}
              className="shrink-0"
              title={activeTab === 'household' ? 'Open household onboarding video' : 'Open profile onboarding video'}
            />
          </div>
          <div className="relative overflow-hidden rounded-[22px] border border-[#F5D1CB] bg-[#FFF7F5] p-5 shadow-[0_14px_30px_rgba(240,68,68,0.07)]">
            <img
              src={studentProfileHero}
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 h-full w-full object-cover object-right opacity-40"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/95 via-white/70 to-white/10" />
            <div className="relative z-10 flex items-center gap-4">
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[18px] bg-[#FFF1EE]">
                <img
                  src={studentProfileIcon}
                  alt=""
                  aria-hidden="true"
                  className="h-14 w-14 object-contain"
                  loading="lazy"
                />
              </span>
              <h2 className="min-w-0 break-words text-[1.75rem] font-black leading-tight text-[#080B12] [overflow-wrap:anywhere]">
                👋 {displayName}
              </h2>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-b from-[#1E40AF]/5 to-white px-4 pt-5 pb-3 native-safe-area-top border-b border-[#E2E8F0]">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 bg-[#1E40AF] rounded-2xl flex items-center justify-center shadow-lg shadow-[#1E40AF]/20">
              <span className="text-white text-xl font-bold">
                {firstName.charAt(0)}{lastName.charAt(0)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg text-[#0F172A] font-bold truncate">
                {firstName} {lastName}
              </h2>
              <p className="text-xs text-[#64748B] truncate font-normal">{email}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <Shield className="w-3 h-3 text-[#16A34A]" strokeWidth={2} />
                <span className="text-[9px] tracking-wide uppercase text-[#16A34A] font-medium">
                  Verified Member
                </span>
              </div>
            </div>
            <HoodieHelpTrigger
              stepId={activeTab === 'household' ? 'household' : 'profile'}
              className="shrink-0"
              title={activeTab === 'household' ? 'Open household onboarding video' : 'Open profile onboarding video'}
            />
          </div>

          {/* Quick Stats */}
          <div className="flex items-center justify-around bg-white/80 rounded-xl border border-[#E2E8F0] py-2.5 px-2">
            <div className="text-center">
              <p className="text-xl text-[#0F172A]" style={{ fontWeight: 100 }}>{rentalHistory.length}</p>
              <p className="text-[8px] tracking-wide uppercase text-[#94A3B8] font-medium">Homes</p>
            </div>
            <div className="w-px h-7 bg-[#E2E8F0]" />
            <div className="text-center">
              <p className="text-xl text-[#B91C1C]" style={{ fontWeight: 100 }}>{scamCount}</p>
              <p className="text-[8px] tracking-wide uppercase text-[#94A3B8] font-medium">Reported Scams</p>
            </div>
            <div className="w-px h-7 bg-[#E2E8F0]" />
            <div className="text-center">
              <p className="text-xl text-[#EA580C]" style={{ fontWeight: 100 }}>{maintCount}</p>
              <p className="text-[8px] tracking-wide uppercase text-[#94A3B8] font-medium">Maintenance</p>
            </div>
          </div>
        </div>
      )}

      {usesHoodieProfileNav ? (
        <>
          <div className={`border-b bg-white px-4 py-3 ${isStudentProfileShell ? 'border-[#F5D1CB]' : 'border-[#E2E8F0]'}`}>
            <button
              type="button"
              onClick={() => setShowProfileDrawer(true)}
              className={`flex w-full items-center justify-between gap-3 rounded-[20px] border px-4 py-3 text-left shadow-sm ${
                isStudentProfileShell
                  ? 'border-[#F5D1CB] bg-[#FFF7F5]'
                  : 'border-[#E2E8F0] bg-[#F8FAFC]'
              }`}
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                  activeProfileTab.id === 'admin' || activeProfileTab.id === 'users'
                    ? 'bg-[#FEF2F2] text-[#B91C1C]'
                    : isStudentProfileShell
                      ? 'bg-white text-[#F04444]'
                      : 'bg-[#EEF2FF] text-[#1E40AF]'
                }`}>
                  <ActiveProfileTabIcon className="h-5 w-5" strokeWidth={1.8} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#94A3B8]">{isStudentProfileShell ? 'Profile tool' : 'Profile section'}</p>
                  <div className="flex min-w-0 items-center gap-2">
                    <p className="truncate text-sm font-bold text-[#0F172A]">{activeProfileTab.label}</p>
                    {activeProfileTab.count !== undefined ? (
                      <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-[#64748B]">
                        {activeProfileTab.count}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
              <ChevronDown className="h-4 w-4 shrink-0 text-[#64748B]" strokeWidth={1.8} />
            </button>
          </div>

          <Drawer open={showProfileDrawer} onOpenChange={setShowProfileDrawer}>
            <DrawerContent className={`overflow-hidden rounded-t-[28px] bg-white data-[vaul-drawer-direction=bottom]:mt-2 data-[vaul-drawer-direction=bottom]:h-[min(94dvh,860px)] data-[vaul-drawer-direction=bottom]:max-h-[95dvh] ${isStudentProfileShell ? 'border-[#F5D1CB]' : 'border-[#E2E8F0]'}`}>
              <DrawerHeader className="pb-2">
                <DrawerTitle className="text-base font-bold text-[#0F172A]">{isStudentProfileShell ? 'Profile tools' : 'Profile sections'}</DrawerTitle>
              </DrawerHeader>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[calc(var(--native-safe-area-bottom)+1.25rem)]">
                <div className="grid grid-cols-3 gap-2 pb-2">
                  {profileDrawerItems.map((item) => {
                    if (item.type === 'expense') {
                      return (
                        <button
                          key="expense-tracker"
                          type="button"
                          onClick={openExpenseTrackerFromProfileDrawer}
                          title={
                            household
                              ? 'Track spend, goals, receipt scans, and PDF reports.'
                              : householdTimelineOptions.length > 0
                                ? 'Create a household from your Timeline address to unlock budgets.'
                                : 'Add your home address first to create a household budget.'
                          }
                          className="min-h-[96px] rounded-[18px] border border-[#BBF7D0] bg-[#F0FDF4] px-2.5 py-3 text-left text-[#15803D] transition hover:bg-[#DCFCE7]"
                        >
                          <div className="flex items-start justify-between gap-1.5">
                            <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-white">
                              <ChartPie className="h-4 w-4" strokeWidth={1.8} />
                            </div>
                            <ArrowLeft className="mt-1 h-3.5 w-3.5 rotate-180 shrink-0" strokeWidth={1.8} />
                          </div>
                          <p className="mt-2 text-[11px] font-black leading-tight">Expense Tracker</p>
                        </button>
                      );
                    }

                    const tab = item.tab;
                    const Icon = tab.icon;
                    const active = activeTab === tab.id;
                    const isAdminTab = tab.id === 'admin' || tab.id === 'users';
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => {
                          openProfileTab(tab.id, {
                            closeDrawer: true,
                            keepInviteQuery: tab.id === 'household',
                          });
                        }}
                        className={`min-h-[96px] rounded-[18px] border px-2.5 py-3 text-left transition ${
                          active
                            ? isAdminTab
                              ? 'border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]'
                              : isStudentProfileShell
                                ? 'border-[#F5D1CB] bg-[#FFF1EE] text-[#F04444]'
                                : 'border-[#BFDBFE] bg-[#EFF6FF] text-[#1E40AF]'
                            : 'border-[#E2E8F0] bg-[#F8FAFC] text-[#475569]'
                        } ${tab.id === 'household' && isProfileOnboardingStep ? 'ring-4 ring-[#DBEAFE] shadow-lg shadow-[#1E40AF]/10' : ''}`}
                      >
                        <div className="flex items-start justify-between gap-1.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-white">
                            <Icon className="h-4 w-4" strokeWidth={1.8} />
                          </div>
                          {tab.count !== undefined ? (
                            <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${active ? 'bg-white text-current' : 'bg-white text-[#64748B]'}`}>
                              {tab.count}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-2 text-[11px] font-black leading-tight">{tab.label}</p>
                      </button>
                    );
                  })}
                </div>
                {helpTourEnabled ? (
                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileDrawer(false);
                      restartTour();
                    }}
                    className="mt-3 flex w-full items-center justify-between gap-3 rounded-[20px] border border-[#BFDBFE] bg-[#EFF6FF] px-4 py-3.5 text-left text-[#1E40AF] transition hover:border-[#93C5FD] hover:bg-[#DBEAFE]"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white">
                        <RotateCcw className="h-[18px] w-[18px]" strokeWidth={1.8} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-bold">Restart onboarding</p>
                        <p className="mt-0.5 text-[11px] text-[#1D4ED8]">
                          Replay the full walkthrough from Map
                        </p>
                      </div>
                    </div>
                    <ArrowLeft className="h-4 w-4 shrink-0" strokeWidth={1.8} />
                  </button>
                ) : null}
              </div>
            </DrawerContent>
          </Drawer>

        </>
      ) : (
        <div className="flex border-b border-[#E2E8F0]">
          {tabs.map(tab => {
            const isAdminTab = tab.id === 'admin' || tab.id === 'users';
            const activeColor = isAdminTab ? 'text-[#B91C1C]' : 'text-[#1E40AF]';
            const barColor = isAdminTab ? 'bg-[#B91C1C]' : 'bg-[#1E40AF]';
            return (
              <button
                key={tab.id}
                onClick={() => openProfileTab(tab.id)}
                className={`flex-1 py-2.5 text-center transition-all cursor-pointer relative ${
                  activeTab === tab.id ? activeColor : 'text-[#94A3B8]'
                }`}
              >
                <span className="text-[10px] tracking-wide uppercase font-medium">
                  {tab.label}
                  {tab.count !== undefined && (
                    <span className="ml-1 text-[9px]">({tab.count})</span>
                  )}
                </span>
                {activeTab === tab.id && (
                  <div className={`absolute bottom-0 left-1/4 right-1/4 h-0.5 ${barColor} rounded-full`} />
                )}
              </button>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {showCreateHouseholdModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10020] flex items-center justify-center bg-black/40 px-4 py-4 sm:p-6"
            style={{
              ...keyboardAwareModalPaddingStyle,
              paddingTop: 'max(calc(var(--native-safe-area-top) + 1rem), 1rem)',
              paddingBottom: 'max(calc(var(--app-bottom-nav-clearance) + 1rem), calc(var(--app-keyboard-inset) + 1rem))',
            }}
            onClick={() => !createHouseholdSaving && closeCreateHouseholdModal()}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 12 }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              onClick={(event) => event.stopPropagation()}
              className="flex max-h-full min-h-0 w-full max-w-lg flex-col overflow-hidden rounded-[28px] border border-[#E2E8F0] bg-white shadow-2xl"
              style={{
                maxHeight:
                  'calc(100dvh - max(calc(var(--native-safe-area-top) + 2rem), calc(var(--app-bottom-nav-clearance) + 2rem), calc(var(--app-keyboard-inset) + 2rem)))',
              }}
            >
              <div className="flex items-center justify-between gap-3 border-b border-[#E2E8F0] px-5 py-5">
                <div>
                  <p className="text-base font-bold text-[#0F172A]">Create household</p>
                  <p className="mt-1 text-sm text-[#475569]">
                    Choose one of your saved Timeline homes. This address will stay locked after creation.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeCreateHouseholdModal}
                  disabled={createHouseholdSaving}
                  className="shrink-0 rounded-full p-2 text-[#94A3B8] transition hover:bg-[#F8FAFC] hover:text-[#0F172A] disabled:opacity-50"
                  aria-label="Close create household modal"
                >
                  <X className="h-4 w-4" strokeWidth={1.8} />
                </button>
              </div>

              <div
                className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4"
                data-keyboard-aware-scroll
                style={keyboardAwareNestedScrollStyle}
              >
                <div>
                  <label className={labelClass}>Timeline address</label>
                  <select
                    value={selectedHouseholdTimelineId}
                    onChange={(event) => setSelectedHouseholdTimelineId(event.target.value)}
                    className={inputClass}
                  >
                    {householdTimelineOptions.map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.is_current ? 'Current • ' : ''}
                        {entry.display_address || entry.address}
                      </option>
                    ))}
                  </select>
                </div>

                {createHouseholdError ? (
                  <p className="text-sm text-[#B91C1C]">{createHouseholdError}</p>
                ) : null}
              </div>

              <div
                className="flex gap-2 border-t border-[#E2E8F0] bg-white px-5 py-4"
                style={{ paddingBottom: 'max(1rem, calc(var(--app-keyboard-inset) + 0.75rem))' }}
              >
                <button
                  type="button"
                  onClick={closeCreateHouseholdModal}
                  disabled={createHouseholdSaving}
                  className="flex-1 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-sm font-semibold text-[#475569] disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleCreateHousehold()}
                  disabled={createHouseholdSaving || householdTimelineOptions.length === 0}
                  className="flex-1 rounded-2xl bg-[#1E40AF] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {createHouseholdSaving ? 'Creating...' : 'Create Household'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tab Content */}
      <div
        className={
          activeTab === 'household' || activeTab === 'evidence'
            ? 'min-h-0 flex-1 overflow-hidden overflow-x-hidden'
            : 'min-h-0 flex-1 overflow-y-auto overflow-x-hidden pb-4'
        }
        data-keyboard-aware-scroll={activeTab === 'household' || activeTab === 'evidence' ? undefined : true}
        style={activeTab === 'household' || activeTab === 'evidence' ? undefined : keyboardAwareInlineScrollStyle}
      >
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-[#1E40AF] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* ─── OVERVIEW TAB ─────────────────────────────── */}
            {activeTab === 'overview' && (
              <div className="p-4 space-y-4">
                {/* Personal Details */}
                <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                    <User className="w-4 h-4 text-[#1E40AF]" strokeWidth={1.5} />
                    <span className="text-xs text-[#0F172A] font-bold">Personal Details</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className={labelClass}>Full Name</p>
                      <p className="text-sm text-[#0F172A] font-normal">{firstName} {lastName}</p>
                    </div>
                    <div>
                      <p className={labelClass}>Phone</p>
                      <p className="text-sm text-[#0F172A] font-normal">{profile?.phone || '—'}</p>
                    </div>
                    <div>
                      <p className={labelClass}>Date of Birth</p>
                      <p className="text-sm text-[#0F172A] font-normal">
                        {profile?.dob ? format(new Date(profile.dob), 'dd MMM yyyy') : '—'}
                      </p>
                    </div>
                    <div>
                      <p className={labelClass}>Email</p>
                      <p className="text-sm text-[#0F172A] font-normal truncate">{email}</p>
                    </div>
                  </div>
                </div>

                {/* Location */}
                <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin className="w-4 h-4 text-[#EE811A]" strokeWidth={1.5} />
                    <span className="text-xs text-[#0F172A] font-bold">Location</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className={labelClass}>Citizenship</p>
                      <p className="text-sm text-[#0F172A] font-normal">{profile?.citizenship || '—'}</p>
                    </div>
                    <div>
                      <p className={labelClass}>Home State</p>
                      <p className="text-sm text-[#0F172A] font-normal">{profile?.home_state || '—'}</p>
                    </div>
                    <div>
                      <p className={labelClass}>AU State</p>
                      <p className="text-sm text-[#0F172A] font-normal">{profile?.australian_state || '—'}</p>
                    </div>
                  </div>
                </div>

                {/* Academic */}
                <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                    <GraduationCap className="w-4 h-4 text-[#7C3AED]" strokeWidth={1.5} />
                    <span className="text-xs text-[#0F172A] font-bold">Academic Details</span>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <p className={labelClass}>University</p>
                      <p className="text-sm text-[#0F172A] font-normal">{profile?.university || '—'}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className={labelClass}>Course</p>
                        <p className="text-sm text-[#0F172A] font-normal">{profile?.course_name || '—'}</p>
                      </div>
                      <div>
                        <p className={labelClass}>Graduation</p>
                        <p className="text-sm text-[#0F172A] font-normal">{profile?.graduation_year || '—'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-[#0B5E3C]" strokeWidth={1.5} />
                      <span className="text-xs text-[#0F172A] font-bold">Work Destination</span>
                    </div>
                    <button
                      onClick={openWorkForm}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#D9F0E0] bg-white px-3 py-1.5 text-[10px] font-medium text-[#0B5E3C] hover:bg-[#F2FBF5] transition-colors cursor-pointer"
                    >
                      <Pencil className="w-3 h-3" strokeWidth={1.8} />
                      {profile?.work_address ? 'Edit' : 'Add'}
                    </button>
                  </div>

                  {profile?.work_display_address || profile?.work_address ? (
                    <div className="rounded-xl bg-white px-3 py-3 border border-[#E2E8F0]">
                      <p className="text-sm text-[#0F172A] font-medium">{profile?.work_display_address || profile?.work_address}</p>
                      <p className="mt-1 text-[11px] text-[#64748B]">Used by the transport planner `Work` quick action.</p>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-[#CBD5E1] bg-white px-3 py-3">
                      <p className="text-sm text-[#0F172A] font-medium">No saved work destination yet</p>
                      <p className="mt-1 text-[11px] leading-relaxed text-[#64748B]">
                        Add a verified work or campus destination here so the transport planner can plan one-tap trips from your current location.
                      </p>
                    </div>
                  )}

                  {workSavedMessage && (
                    <p className="text-[11px] text-[#0B5E3C] font-medium">{workSavedMessage}</p>
                  )}

                  {showWorkForm && (
                    <div className="rounded-xl border border-[#D9F0E0] bg-white p-3 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[11px] font-bold text-[#0F172A]">Save Work Destination</p>
                        <button onClick={() => resetWorkForm()} className="text-[#94A3B8] hover:text-[#0F172A] cursor-pointer">
                          <X className="w-4 h-4" strokeWidth={1.5} />
                        </button>
                      </div>

                      <VerifiedAddressInput
                        value={workAddress}
                        onChange={(address: CanonicalAddress) => {
                          setWorkAddress(address.formatted_address);
                          setWorkDisplayAddress(address.display_address);
                          setWorkState(address.state);
                          setWorkPostcode(address.postcode);
                          setWorkLat(address.lat);
                          setWorkLng(address.lng);
                          setWorkAddressVerified(true);
                          setWorkError('');
                        }}
                        placeholder="Search your work or campus destination..."
                        className={inputClass}
                      />

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={labelClass}>State</label>
                        <input value={workState} readOnly className={`${inputClass} bg-[#F1F5F9] cursor-default`} placeholder="Auto-filled" />
                        </div>
                        <div>
                          <label className={labelClass}>Postcode</label>
                        <input value={workPostcode} readOnly className={`${inputClass} bg-[#F1F5F9] cursor-default`} placeholder="Auto-filled" />
                        </div>
                      </div>

                      {workError && <p className="text-[11px] text-[#B91C1C]">{workError}</p>}

                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveWork}
                          disabled={workSaving}
                          className="flex-1 py-2.5 bg-[#0B5E3C] text-white rounded-xl text-[11px] tracking-wide font-medium hover:bg-[#0A5134] transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {workSaving ? 'Saving...' : 'Save Work Destination'}
                        </button>
                        <button
                          onClick={() => resetWorkForm()}
                          className="px-4 py-2.5 border border-[#E2E8F0] rounded-xl text-[11px] text-[#64748B] hover:bg-[#F8FAFC] transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {!isStudentProfileShell && APP_CONFIG.showPartnershipBadge ? (
                  <div className="p-4 text-center">
                    <div
                      className="flex justify-center mt-2 cursor-pointer select-none"
                      onClick={handleSetuTap}
                    >
                      <SetuPartnershipBadge maxWidth={200} />
                    </div>
                    {setuTapCount > 0 && setuTapCount < 7 && (
                      <p className="text-[9px] text-[#CBD5E1] mt-1 font-normal">{7 - setuTapCount} more...</p>
                    )}
                  </div>
                ) : !isStudentProfileShell && APP_CONFIG.experienceMode === 'hoodie' ? (
                  <div className="p-4 text-center">
                    <button
                      type="button"
                      onClick={handleSetuTap}
                      className="mx-auto mt-2 flex cursor-pointer select-none items-center justify-center rounded-[22px] border border-[#E2E8F0] bg-white p-1.5 shadow-sm transition-transform hover:scale-[1.02]"
                      aria-label="Hidden admin access trigger"
                    >
                      <img
                        src={APP_CONFIG.webIcon}
                        alt={APP_CONFIG.displayName}
                        className="h-16 w-16 rounded-[18px] object-cover"
                      />
                    </button>
                    {setuTapCount > 0 && setuTapCount < 7 && (
                      <p className="text-[9px] text-[#CBD5E1] mt-1 font-normal">{7 - setuTapCount} more...</p>
                    )}
                  </div>
                ) : null}

                {/* Admin badge when logged in */}
                {isAdmin && (
                  <button
                    onClick={() => setActiveTab('admin')}
                    className="mx-auto mb-2 px-6 py-2.5 bg-[#B91C1C]/5 border border-[#B91C1C]/20 rounded-xl flex items-center justify-center gap-2 text-[#B91C1C] hover:bg-[#B91C1C]/10 transition-colors cursor-pointer"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" strokeWidth={2} />
                    <span className="text-[10px] tracking-wide uppercase font-medium">Open Admin Panel</span>
                  </button>
                )}

                {accountDeleteError && (
                  <p className="px-4 text-center text-[10px] text-[#B91C1C] font-normal">
                    {accountDeleteError}
                  </p>
                )}

                {/* Logout */}
                <button
                  onClick={onLogout}
                  className="w-full py-3 text-[#94A3B8] flex items-center justify-center gap-2 hover:text-[#B91C1C] transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" strokeWidth={1.5} />
                  <span className="text-xs tracking-wide font-medium">Sign Out</span>
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deletingAccount}
                  className="w-full py-2 text-[#B91C1C] flex items-center justify-center gap-2 hover:text-[#991B1B] transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                  <span className="text-[11px] tracking-wide font-medium">
                    {deletingAccount ? 'Deleting Account...' : 'Delete Account'}
                  </span>
                </button>
                {isSetuMalaysiaProfileShell && (
                  <div
                    data-testid="masca-acknowledgement"
                    className="mt-8 px-6"
                  >
                    <a
                      href="https://www.ema.org.au/masca"
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Learn more about MASCA"
                      className="mx-auto block w-full max-w-[21rem]"
                    >
                      <img
                        data-testid="masca-partnership-lockup"
                        src={mascaPartnership}
                        alt="In strategic partnership with MASCA, Malaysian Students' Council of Australia"
                        className="h-auto w-full object-contain"
                      />
                    </a>
                  </div>
                )}
                <div className="mt-4 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
                  <p className="text-[10px] tracking-wide uppercase text-[#94A3B8] font-medium">Data &amp; API Sources</p>
                  <div className="mt-2 space-y-1.5 text-[11px] leading-relaxed text-[#64748B]">
                    <p>OpenStreetMap, Nominatim, and Overpass API for maps, places, and geospatial context.</p>
                    <p>MapTiler for map tiles and visual rendering.</p>
                    <p>Firebase Cloud Messaging for notification delivery.</p>
                    <p>Resend for verification and operational email delivery.</p>
                    <p>
                      {APP_CONFIG.showHciAlerts
                        ? `AFP, Indian High Commission, and state and territory police, legal, tenancy, public-safety, and open-data sources support ${APP_CONFIG.displayName} guidance, alerts, and crime context.`
                        : 'State and territory police, legal, tenancy, public-safety, and open-data sources support local housing guidance, alerts, and neighbourhood context.'}
                    </p>
                    <p>Fuel data is sourced from official NSW, Victoria, Queensland, Tasmania, South Australia, and Western Australia government fuel-price sources.</p>
                    <p className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 shrink-0" aria-label="Creative Commons">
                        <span className="flex h-4 w-4 items-center justify-center rounded-full border border-[#94A3B8] text-[8px] font-bold leading-none text-[#64748B]">C</span>
                        <span className="flex h-4 w-4 items-center justify-center rounded-full border border-[#94A3B8] text-[8px] font-bold leading-none text-[#64748B]">C</span>
                      </span>
                      <span>Public transport trip-planning data is displayed under provider attribution requirements, including Creative Commons requirements where applicable.</span>
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ─── TIMELINE TAB ─────────────────────────────── */}
            {activeTab === 'timeline' && (
              <div className="p-4">
                {/* Return to Case Builder banner */}
                {showReturnBanner && (
                  <button
                    onClick={() => navigate(getLegalTabRoute(APP_CONFIG.useSharedResourcesShell))}
                    className="w-full mb-4 p-3.5 bg-[#1E40AF]/5 border border-[#1E40AF]/20 rounded-xl flex items-center gap-3 hover:bg-[#1E40AF]/10 transition-colors cursor-pointer group"
                  >
                    <div className="w-9 h-9 bg-[#1E40AF]/10 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-[#1E40AF]/20 transition-colors">
                      <ArrowLeft className="w-4 h-4 text-[#1E40AF]" strokeWidth={2} />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-xs text-[#0F172A] font-bold">Address saved successfully</p>
                      <p className="text-[10px] text-[#64748B] font-normal mt-0.5">
                        Return to the Case Builder to select it
                      </p>
                    </div>
                    <Scale className="w-4 h-4 text-[#1E40AF] shrink-0" strokeWidth={1.5} />
                  </button>
                )}

                {/* Add Home Button */}
                <button
                  onClick={() => setShowAddRental(true)}
                  className="w-full py-3 mb-4 border border-dashed border-[#CBD5E1] rounded-xl text-[#64748B] flex items-center justify-center gap-2 hover:border-[#1E40AF] hover:text-[#1E40AF] transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" strokeWidth={1.5} />
                  <span className="text-xs tracking-wide font-medium">Add Past or Current Home</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (household) {
                      openProfileTab('household');
                      return;
                    }
                    if (householdTimelineOptions.length === 0) {
                      setCreateHouseholdError('Add a current or past home to Timeline first.');
                      return;
                    }
                    setCreateHouseholdError('');
                    openCreateHouseholdModal();
                  }}
                  className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                    household
                      ? 'mb-4 border-[#BFDBFE] bg-[#EFF6FF] text-[#1E40AF]'
                      : householdTimelineOptions.length > 0
                        ? 'mb-4 border-[#D1FAE5] bg-[#ECFDF5] text-[#0F766E] hover:border-[#A7F3D0]'
                        : 'mb-4 cursor-not-allowed border-[#E2E8F0] bg-[#F8FAFC] text-[#94A3B8]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white">
                        <Users className="h-5 w-5" strokeWidth={1.8} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold">
                          {household ? 'Open Household' : 'Create household'}
                        </p>
                        <p className="mt-0.5 text-[10px] leading-relaxed">
                          {household
                            ? `${household.name} • ${getHouseholdAddressLabel(household.address_snapshot)}`
                            : householdTimelineOptions.length > 0
                              ? 'Choose one of your saved Timeline homes to set up a share house.'
                              : 'Add a current or past home to Timeline first'}
                        </p>
                      </div>
                    </div>
                    <ArrowLeft className="h-4 w-4 rotate-180 shrink-0" strokeWidth={1.8} />
                  </div>
                </button>

                {/* Add Rental Form */}
                {showAddRental && (
                  <div className="mb-6 border border-[#E2E8F0] rounded-xl p-4 bg-[#F8FAFC] space-y-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-[#0F172A] font-bold">New Residence</span>
                      <button onClick={resetAddForm} className="text-[#94A3B8] hover:text-[#0F172A] cursor-pointer">
                        <X className="w-4 h-4" strokeWidth={1.5} />
                      </button>
                    </div>
                    {shouldContinueToHouseholdSetup ? (
                      <p className="rounded-2xl border border-[#BBF7D0] bg-[#F0FDF4] px-3 py-2 text-xs font-semibold leading-relaxed text-[#166534]">
                        Add your home address first so Hoodie can create your household and unlock {householdSetupContinuationLabel}.
                      </p>
                    ) : null}
                    <div>
                      <VerifiedAddressInput
                        value={newAddress}
                        onChange={(address: CanonicalAddress) => {
                          setNewAddress(address.formatted_address);
                          setNewDisplayAddress(address.display_address);
                          setNewUnitNumber(address.unit_number);
                          setNewBuildingId(address.building_id);
                          setNewState(address.state);
                          setNewPostcode(address.postcode);
                          setNewLat(address.lat);
                          setNewLng(address.lng);
                          setNewAddressVerified(true);
                        }}
                        placeholder="Start typing your Australian address..."
                        className={inputClass}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelClass}>State</label>
                        <input value={newState} readOnly className={`${inputClass} bg-[#F1F5F9] cursor-default`} placeholder="Auto-filled" />
                      </div>
                      <div>
                        <label className={labelClass}>Postcode</label>
                        <input value={newPostcode} readOnly className={`${inputClass} bg-[#F1F5F9] cursor-default`} placeholder="Auto-filled" />
                      </div>
                    </div>
                    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3">
                      <div>
                        <label className={labelClass}>Move-in Date *</label>
                        <input type="date" value={newStartDate} onChange={e => setNewStartDate(e.target.value)} className={dateInputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>Move-out Date</label>
                        <input type="date" value={newEndDate} onChange={e => setNewEndDate(e.target.value)} disabled={newIsCurrent} className={`${dateInputClass} ${newIsCurrent ? 'opacity-50' : ''}`} />
                      </div>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={newIsCurrent} onChange={e => setNewIsCurrent(e.target.checked)} className="rounded" />
                      <span className="text-xs text-[#64748B] font-normal">This is my current residence</span>
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelClass}>Landlord Name</label>
                        <input value={newLandlord} onChange={e => setNewLandlord(e.target.value)} placeholder="Optional" className={inputClass} enterKeyHint="next" />
                      </div>
                      <div>
                        <label className={labelClass}>Monthly Rent ($)</label>
                        <input type="number" value={newRent} onChange={e => setNewRent(e.target.value)} placeholder="350" className={inputClass} enterKeyHint="done" {...decimalFieldProps} />
                      </div>
                    </div>
                    {formError && <p className="text-xs text-[#B91C1C] font-normal">{formError}</p>}
                    <button onClick={handleAddRental} disabled={saving} className="w-full py-3 bg-[#1E40AF] text-white rounded-xl text-xs tracking-wide font-medium hover:bg-[#1E3A8A] transition-all shadow-lg shadow-[#1E40AF]/20 cursor-pointer disabled:opacity-50">
                      {saving ? 'Saving...' : 'Save Residence'}
                    </button>
                  </div>
                )}

                {/* Timeline */}
                {sortedHistory.length === 0 && !showAddRental ? (
                  <div className="text-center py-12">
                    <Home className="w-10 h-10 text-[#E2E8F0] mx-auto mb-3" strokeWidth={1.5} />
                    <p className="text-sm text-[#94A3B8] font-normal">No rental history yet</p>
                    <p className="text-xs text-[#CBD5E1] mt-1 font-normal">Add your first Australian home to start your timeline</p>
                  </div>
                ) : (
                  <div className="relative">
                    {/* Saffron vertical line */}
                    <div className="absolute left-[17px] top-2 bottom-2 w-0.5 bg-[#EE811A]/30 rounded-full" />

                    <div className="space-y-4">
                      {sortedHistory.map((entry) => (
                        <div key={entry.id} className="relative pl-10">
                          {/* Timeline dot */}
                          <div className={`absolute left-2.5 top-4 w-3 h-3 rounded-full border-2 ${
                            entry.is_current
                              ? 'bg-[#EE811A] border-[#EE811A] shadow-md shadow-[#EE811A]/30'
                              : 'bg-white border-[#EE811A]/50'
                          }`} />

                          <div className="border border-[#E2E8F0] rounded-xl p-3.5 bg-white hover:shadow-sm transition-shadow">
                            {/* Edit Mode */}
                            {editingId === entry.id ? (
                              <div className="space-y-3">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs text-[#0F172A] font-bold">Edit Residence</span>
                                  <button onClick={cancelEditing} className="text-[#94A3B8] hover:text-[#0F172A] cursor-pointer">
                                    <X className="w-4 h-4" strokeWidth={1.5} />
                                  </button>
                                </div>
                                <div>
                                  <label className={labelClass}>Address *</label>
                                  <VerifiedAddressInput
                                    value={editAddress}
                                    unitValue={editUnitNumber}
                                    onChange={(address: CanonicalAddress) => {
                                      setEditAddress(address.formatted_address);
                                      setEditDisplayAddress(address.display_address);
                                      setEditUnitNumber(address.unit_number);
                                      setEditBuildingId(address.building_id);
                                      setEditState(address.state);
                                      setEditPostcode(address.postcode);
                                      setEditLat(address.lat);
                                      setEditLng(address.lng);
                                      setEditAddressVerified(true);
                                    }}
                                    className={inputClass}
                                  />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className={labelClass}>State</label>
                                    <input value={editState} readOnly className={`${inputClass} bg-[#F1F5F9] cursor-default`} placeholder="Auto-filled" />
                                  </div>
                                  <div>
                                    <label className={labelClass}>Postcode</label>
                                    <input value={editPostcode} readOnly className={`${inputClass} bg-[#F1F5F9] cursor-default`} placeholder="Auto-filled" />
                                  </div>
                                </div>
                                <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3">
                                  <div>
                                    <label className={labelClass}>Move-in Date *</label>
                                    <input type="date" value={editStartDate} onChange={e => setEditStartDate(e.target.value)} className={dateInputClass} />
                                  </div>
                                  <div>
                                    <label className={labelClass}>Move-out Date</label>
                                    <input type="date" value={editEndDate} onChange={e => setEditEndDate(e.target.value)} disabled={editIsCurrent} className={`${dateInputClass} ${editIsCurrent ? 'opacity-50' : ''}`} />
                                  </div>
                                </div>
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input type="checkbox" checked={editIsCurrent} onChange={e => setEditIsCurrent(e.target.checked)} className="rounded" />
                                  <span className="text-xs text-[#64748B] font-normal">This is my current residence</span>
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className={labelClass}>Landlord Name</label>
                                    <input value={editLandlord} onChange={e => setEditLandlord(e.target.value)} className={inputClass} enterKeyHint="next" />
                                  </div>
                                  <div>
                                    <label className={labelClass}>Weekly Rent ($)</label>
                                    <input type="number" value={editRent} onChange={e => setEditRent(e.target.value)} className={inputClass} enterKeyHint="done" {...decimalFieldProps} />
                                  </div>
                                </div>

                                {/* Edit Review Section */}
                                {(entry.review_category || editReviewCategory) && (
                                  <div className="border-t border-[#E2E8F0] pt-3 space-y-2">
                                    <div className="flex items-center justify-between">
                                      <label className={labelClass}>Review</label>
                                      {editReviewCategory && (
                                        <button
                                          onClick={() => { setEditReviewCategory(''); setEditReviewText(''); setEditReviewRating(0); }}
                                          className="text-[9px] tracking-wide text-[#B91C1C] hover:underline cursor-pointer font-medium"
                                        >
                                          Remove Review
                                        </button>
                                      )}
                                    </div>
                                    <div className="flex gap-2">
                                      {[
                                        { value: 'scam', label: 'Scam', color: '#B91C1C' },
                                        { value: 'maintenance', label: 'Maint.', color: '#EA580C' },
                                      ].map(cat => (
                                        <button
                                          key={cat.value}
                                          onClick={() => setEditReviewCategory(cat.value)}
                                          className={`flex-1 py-1.5 text-[9px] tracking-wide uppercase rounded-lg border transition-all cursor-pointer font-medium ${
                                            editReviewCategory === cat.value
                                              ? 'text-white border-transparent'
                                              : 'text-[#64748B] border-[#E2E8F0] hover:border-[#CBD5E1]'
                                          }`}
                                          style={editReviewCategory === cat.value ? { backgroundColor: cat.color } : {}}
                                        >
                                          {cat.label}
                                        </button>
                                      ))}
                                    </div>
                                    <div className="flex items-center gap-1 justify-center">
                                      {Array.from({ length: 5 }).map((_, i) => (
                                        <button
                                          key={i}
                                          onClick={() => setEditReviewRating(i + 1)}
                                          className="cursor-pointer"
                                        >
                                          <Star className={`w-5 h-5 transition-colors ${i < editReviewRating ? 'text-[#EE811A] fill-[#EE811A]' : 'text-[#E2E8F0]'}`} strokeWidth={1.5} />
                                        </button>
                                      ))}
                                    </div>
                                    <textarea
                                      value={editReviewText}
                                      onChange={e => setEditReviewText(e.target.value)}
                                      placeholder="Your experience at this address..."
                                      rows={2}
                                      className={`${inputClass} resize-none`}
                                    />
                                  </div>
                                )}

                                {editError && <p className="text-xs text-[#B91C1C] font-normal">{editError}</p>}
                                <div className="flex gap-2">
                                  <button onClick={() => { if (window.confirm('Permanently delete this rental entry? This cannot be undone.')) handleDeleteEntry(entry.id, entry.email); }} className="flex-1 py-2.5 text-xs text-[#B91C1C] border border-[#B91C1C]/30 rounded-xl cursor-pointer font-medium hover:bg-[#FEF2F2] transition-colors">
                                    Delete
                                  </button>
                                  <button onClick={() => handleSaveEdit(entry.id)} disabled={saving} className="flex-1 py-2.5 text-xs text-white bg-[#1E40AF] rounded-xl cursor-pointer disabled:opacity-50 font-medium">
                                    {saving ? 'Saving...' : 'Save Changes'}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="flex items-start justify-between mb-1">
                                  <div className="flex-1 min-w-0 pr-2">
                                    <p className="text-sm text-[#0F172A] font-bold leading-snug">{entry.display_address || entry.address}</p>
                                    {entry.unit_number && (
                                      <span className="inline-block text-[8px] tracking-wider uppercase bg-[#1E40AF]/8 text-[#1E40AF] px-1.5 py-0.5 rounded-md font-medium mt-0.5">
                                        {entry.unit_number}
                                      </span>
                                    )}
                                    <p className="text-[10px] text-[#64748B] font-light mt-0.5">
                                      {entry.start_date ? format(new Date(entry.start_date), 'MMM yyyy') : '—'}
                                      {' — '}
                                      {entry.is_current ? (
                                        <span className="text-[#16A34A] font-medium">Present</span>
                                      ) : entry.end_date ? format(new Date(entry.end_date), 'MMM yyyy') : '—'}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    {entry.is_current && (
                                      <span className="text-[8px] tracking-wider uppercase bg-[#16A34A]/10 text-[#16A34A] px-2 py-0.5 rounded-md font-medium">
                                        Current
                                      </span>
                                    )}
                                    <button
                                      onClick={() => startEditing(entry)}
                                      className="w-7 h-7 flex items-center justify-center rounded-lg text-[#94A3B8] hover:text-[#1E40AF] hover:bg-[#1E40AF]/5 transition-colors cursor-pointer"
                                      title="Edit residence"
                                    >
                                      <Pencil className="w-3.5 h-3.5" strokeWidth={1.5} />
                                    </button>
                                  </div>
                                </div>

                                {/* Details row */}
                                <div className="flex items-center gap-3 mt-2 text-[9px] text-[#94A3B8] tracking-wide font-medium flex-wrap">
                                  {entry.state && <span>{entry.state}</span>}
                                  {entry.postcode && <span>{entry.postcode}</span>}
                                  {entry.monthly_rent && <span>${entry.monthly_rent}/mo</span>}
                                  {entry.landlord_name && <span>Landlord: {entry.landlord_name}</span>}
                                </div>

                                {/* Existing Review */}
                                {entry.review_category && (
                                  <div className="mt-2.5 pt-2.5 border-t border-[#E2E8F0]">
                                    <div className="flex items-center gap-2 mb-1">
                                      {entry.review_category === 'scam' && <ShieldAlert className="w-3.5 h-3.5 text-[#B91C1C]" strokeWidth={1.5} />}
                                      {entry.review_category === 'maintenance' && <Wrench className="w-3.5 h-3.5 text-[#EA580C]" strokeWidth={1.5} />}
                                      <span className="text-[9px] tracking-wide uppercase text-[#64748B] font-medium">
                                        {entry.review_category === 'scam' ? 'Scam Alert' : 'Maintenance Flag'}
                                      </span>
                                      {entry.review_rating ? (
                                        <div className="flex items-center gap-0.5 ml-auto">
                                          {Array.from({ length: 5 }).map((_, i) => (
                                            <Star key={i} className={`w-3 h-3 ${i < entry.review_rating! ? 'text-[#EE811A] fill-[#EE811A]' : 'text-[#E2E8F0]'}`} strokeWidth={1.5} />
                                          ))}
                                        </div>
                                      ) : null}
                                    </div>
                                    {entry.review_text && (
                                      <p className="text-xs text-[#64748B] font-normal">{entry.review_text}</p>
                                    )}
                                  </div>
                                )}

                                {/* Risk Assessment Badge (current addresses) */}
                                {entry.is_current && (
                                  <div className="mt-2.5 pt-2.5 border-t border-[#E2E8F0]">
                                    {entry.risk_assessment ? (
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <Shield className="w-3.5 h-3.5 text-[#1E40AF]" strokeWidth={1.5} />
                                          <span className="text-[9px] tracking-wide uppercase text-[#64748B] font-medium">Health Check</span>
                                          <span className={`text-[8px] tracking-wider uppercase px-2 py-0.5 rounded-md font-medium ${
                                            entry.risk_score === 'Low Risk' ? 'bg-[#16A34A]/10 text-[#16A34A]' :
                                            entry.risk_score === 'Medium Risk' ? 'bg-[#EA580C]/10 text-[#EA580C]' :
                                            entry.risk_score === 'High Risk' ? 'bg-[#B91C1C]/10 text-[#B91C1C]' :
                                            'bg-[#94A3B8]/10 text-[#94A3B8]'
                                          }`}>
                                            {entry.risk_score || 'Pending'}
                                          </span>
                                        </div>
                                        <button
                                          onClick={() => { setRiskAssessmentEntry(entry); setShowRiskAssessment(true); }}
                                          className="text-[9px] tracking-wide text-[#1E40AF] hover:underline cursor-pointer font-medium"
                                        >
                                          Retake
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() => { setRiskAssessmentEntry(entry); setShowRiskAssessment(true); }}
                                        className="w-full py-2 border border-dashed border-[#1E40AF]/30 rounded-lg text-[#1E40AF] flex items-center justify-center gap-1.5 hover:bg-[#1E40AF]/5 transition-colors cursor-pointer"
                                      >
                                        <Shield className="w-3.5 h-3.5" strokeWidth={1.5} />
                                        <span className="text-[10px] tracking-wide font-medium">Take Tenancy Health Check</span>
                                      </button>
                                    )}
                                  </div>
                                )}

                                {/* Add Review Button */}
                                {!entry.review_category && reviewingId !== entry.id && editingId !== entry.id && (
                                  <button
                                    onClick={() => setReviewingId(entry.id)}
                                    className="mt-2 text-[10px] tracking-wide text-[#1E40AF] hover:underline cursor-pointer font-medium"
                                  >
                                    + Add Review
                                  </button>
                                )}

                                {/* Review Form */}
                                {reviewingId === entry.id && (
                                  <div className="mt-2.5 pt-2.5 border-t border-[#E2E8F0] space-y-2">
                                    <div className="flex gap-2">
                                      {[
                                        { value: 'scam', label: 'Scam', color: '#B91C1C' },
                                        { value: 'maintenance', label: 'Maint.', color: '#EA580C' },
                                      ].map(cat => (
                                        <button
                                          key={cat.value}
                                          onClick={() => setReviewCategory(cat.value)}
                                          className={`flex-1 py-1.5 text-[9px] tracking-wide uppercase rounded-lg border transition-all cursor-pointer font-medium ${
                                            reviewCategory === cat.value
                                              ? 'text-white border-transparent'
                                              : 'text-[#64748B] border-[#E2E8F0] hover:border-[#CBD5E1]'
                                          }`}
                                          style={reviewCategory === cat.value ? { backgroundColor: cat.color } : {}}
                                        >
                                          {cat.label}
                                        </button>
                                      ))}
                                    </div>
                                    <div className="flex items-center gap-1 justify-center">
                                      {Array.from({ length: 5 }).map((_, i) => (
                                        <button
                                          key={i}
                                          onClick={() => setReviewRating(i + 1)}
                                          className="cursor-pointer"
                                        >
                                          <Star className={`w-5 h-5 transition-colors ${i < reviewRating ? 'text-[#EE811A] fill-[#EE811A]' : 'text-[#E2E8F0]'}`} strokeWidth={1.5} />
                                        </button>
                                      ))}
                                    </div>
                                    <textarea
                                      value={reviewText}
                                      onChange={e => setReviewText(e.target.value)}
                                      placeholder="Your experience at this address..."
                                      rows={2}
                                      className={`${inputClass} resize-none`}
                                    />
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => { setReviewingId(null); setReviewCategory(''); setReviewText(''); setReviewRating(0); }}
                                        className="flex-1 py-2 text-xs text-[#64748B] border border-[#E2E8F0] rounded-lg cursor-pointer font-medium"
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        onClick={() => handleAddReview(entry.id)}
                                        disabled={!reviewCategory || saving}
                                        className="flex-1 py-2 text-xs text-white bg-[#1E40AF] rounded-lg cursor-pointer disabled:opacity-50 font-medium"
                                      >
                                        {saving ? 'Saving...' : 'Save Review'}
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'household' && (
              <div className="flex h-full flex-col">
                {householdLoadError ? (
                  <div className="px-4 pt-4">
                    <div className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#991B1B]">
                      {householdLoadError}
                    </div>
                  </div>
                ) : null}
                <HouseholdPanel
                  email={email}
                  profileFullName={profileFullName}
                  rentalHistory={rentalHistory}
                  household={household}
                  pendingInvites={householdPendingInvites}
                  sharedBills={householdSharedBills}
                  billContacts={householdBillContacts}
                  onRefresh={loadData}
                  onOpenTimeline={() => openProfileTab('timeline')}
                  onStartCreateHousehold={() => {
                    if (!household) {
                      openCreateHouseholdModal();
                    }
                  }}
                  incomingInviteToken={householdInviteToken}
                  incomingInviteIntent={householdInviteIntent}
                  onClearIncomingInvite={clearHouseholdInviteQuery}
                  initialSectionTab={householdSectionTab}
                  onSectionTabChange={handleHouseholdSectionTabChange}
                  focusedBillId={householdRouteState.billId}
                  focusedPaymentId={householdRouteState.paymentId}
                  focusedChoreId={householdRouteState.choreId}
                  focusedNotificationId={householdRouteState.notificationId}
                  routeSource={householdRouteState.source}
                  onRefreshSuspendedChange={setSuspendHouseholdResumeRefresh}
                  onOpenRoute={handleOpenHouseholdRoute}
                  initialOwnerInviteLaunch={pendingOwnerInviteLaunch}
                  onConsumeInitialOwnerInviteLaunch={() => setPendingOwnerInviteLaunch(null)}
                />
              </div>
            )}

            {/* ─── EVIDENCE TAB (Universal Evidence Engine) ──── */}
            {activeTab === 'evidence' && (
              <div className="flex h-full min-h-0 flex-col">
                {/* Search */}
                <div className="shrink-0 px-4 py-3 border-b border-[#E2E8F0]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" strokeWidth={1.5} />
                    <input
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Search evidence..."
                      className="w-full pl-10 pr-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#1E40AF] focus:ring-2 focus:ring-[#1E40AF]/10 font-normal"
                    />
                  </div>
                </div>

                {/* Evidence List */}
                <div
                  data-testid="evidence-list-scroll"
                  className="min-h-0 flex-1 overflow-y-auto px-4 pt-4 space-y-4"
                  data-keyboard-aware-scroll
                  style={keyboardAwareInlineScrollStyle}
                >
                  {/* Return to Case Builder banner */}
                  {showEvidenceReturnBanner && (
                    <button
                      onClick={() => navigate(getLegalTabRoute(APP_CONFIG.useSharedResourcesShell))}
                      className="w-full p-3.5 bg-[#1E40AF]/5 border border-[#1E40AF]/20 rounded-xl flex items-center gap-3 hover:bg-[#1E40AF]/10 transition-colors cursor-pointer group"
                    >
                      <div className="w-9 h-9 bg-[#1E40AF]/10 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-[#1E40AF]/20 transition-colors">
                        <ArrowLeft className="w-4 h-4 text-[#1E40AF]" strokeWidth={2} />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-xs text-[#0F172A] font-bold">Evidence saved successfully</p>
                        <p className="text-[10px] text-[#64748B] font-normal mt-0.5">
                          Return to the Case Builder to select it
                        </p>
                      </div>
                      <Scale className="w-4 h-4 text-[#1E40AF] shrink-0" strokeWidth={1.5} />
                    </button>
                  )}

                  {/* Add Evidence Button */}
                  <button
                    onClick={() => setShowAddEvidence(true)}
                    className="w-full py-3 border border-dashed border-[#CBD5E1] rounded-xl text-[#64748B] flex items-center justify-center gap-2 hover:border-[#1E40AF] hover:text-[#1E40AF] transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" strokeWidth={1.5} />
                    <span className="text-xs tracking-wide font-medium">Add New Evidence</span>
                  </button>

                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.mp3,.wav,.webp,.heic"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setEvidenceFile(file);
                        setEvidenceError('');
                      }
                    }}
                  />

                  {/* Add Evidence Form — Slide-up animation */}
                  <AnimatePresence>
                    {showAddEvidence && (
                      <motion.div
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 24 }}
                        transition={{ type: 'spring', damping: 26, stiffness: 300 }}
                        className="border border-[#E2E8F0] rounded-xl p-3.5 bg-[#F8FAFC] space-y-3"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-[#0F172A] font-bold">New Evidence Item</span>
                          <button
                            onClick={() => {
                              resetEvidenceForm();
                            }}
                            className="text-[#94A3B8] hover:text-[#0F172A] cursor-pointer"
                          >
                            <X className="w-4 h-4" strokeWidth={1.5} />
                          </button>
                        </div>

                        {/* Upload File Button */}
                        <div>
                          <label className={labelClass}>Upload File *</label>
                          <div
                            data-testid="evidence-upload-options"
                            className={`grid gap-2 ${nativeShell ? 'grid-cols-[minmax(0,1fr)_minmax(0,1fr)]' : 'grid-cols-1'}`}
                          >
                            <button
                              onClick={() => fileInputRef.current?.click()}
                              disabled={evidenceUploading}
                              className={`min-h-[64px] min-w-0 w-full px-2 py-2.5 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-1.5 text-center transition-all cursor-pointer ${
                                evidenceFile
                                  ? 'border-[#16A34A] bg-[#16A34A]/5'
                                  : 'border-[#CBD5E1] hover:border-[#1E40AF] hover:bg-[#1E40AF]/5'
                              }`}
                            >
                              {evidenceUploading ? (
                                <div className="w-5 h-5 border-2 border-[#1E40AF] border-t-transparent rounded-full animate-spin" />
                              ) : evidenceFile ? (
                                <>
                                  <Check className="w-4 h-4 text-[#16A34A]" strokeWidth={2} />
                                  <span className="max-w-full truncate text-xs text-[#0F172A] font-medium">
                                    {evidenceFile.name}
                                  </span>
                                  <span className="text-[9px] text-[#94A3B8] font-medium">
                                    ({formatFileSize(evidenceFile.size)})
                                  </span>
                                </>
                              ) : (
                                <>
                                  <Upload className="w-4 h-4 text-[#64748B]" strokeWidth={1.5} />
                                  <span className="text-xs text-[#64748B] font-medium">
                                    Upload File
                                  </span>
                                  <span className="text-[9px] text-[#94A3B8] font-medium">
                                    PDF, PNG, JPG, MP3, WAV
                                  </span>
                                </>
                              )}
                            </button>
                            {nativeShell && (
                              <button
                                onClick={handleNativePhotoCapture}
                                disabled={evidenceUploading}
                                className="min-h-[64px] min-w-0 w-full px-2 py-2.5 border-2 border-dashed border-[#CBD5E1] rounded-xl flex flex-col items-center justify-center gap-1.5 text-center transition-all cursor-pointer hover:border-[#1E40AF] hover:bg-[#1E40AF]/5"
                              >
                                <Upload className="w-4 h-4 text-[#64748B]" strokeWidth={1.5} />
                                <span className="text-xs text-[#64748B] font-medium">
                                  Camera / Photos
                                </span>
                              </button>
                            )}
                          </div>
                          {evidenceFile && (
                            <button
                              onClick={() => { setEvidenceFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                              className="mt-1 text-[10px] text-[#94A3B8] hover:text-[#B91C1C] cursor-pointer font-medium"
                            >
                              Remove file
                            </button>
                          )}
                        </div>

                        {/* Associated Listing — Searchable Dropdown */}
                        <div className="relative">
                          <label className={labelClass}>Associated Listing</label>
                          <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94A3B8]" strokeWidth={1.5} />
                            <input
                              value={evidenceAssociatedLabel || evidenceAddressSearch}
                              onChange={e => {
                                setEvidenceAddressSearch(e.target.value);
                                setEvidenceAssociatedAddress('');
                                setEvidenceAssociatedLabel('');
                                setShowAddressDropdown(true);
                              }}
                              onFocus={() => setShowAddressDropdown(true)}
                              placeholder="Search your addresses..."
                              className={`${inputClass} pl-9`}
                            />
                            {evidenceAssociatedLabel && (
                              <button
                                onClick={() => {
                                  setEvidenceAssociatedAddress('');
                                  setEvidenceAssociatedLabel('');
                                  setEvidenceAddressSearch('');
                                }}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#0F172A] cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" strokeWidth={1.5} />
                              </button>
                            )}
                          </div>
                          {showAddressDropdown && filteredAddressOptions.length > 0 && !evidenceAssociatedLabel && (
                            <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-[#E2E8F0] rounded-xl shadow-lg max-h-40 overflow-y-auto">
                              {filteredAddressOptions.map(opt => (
                                <button
                                  key={opt.id}
                                  onClick={() => {
                                    setEvidenceAssociatedAddress(opt.id);
                                    setEvidenceAssociatedLabel(opt.label);
                                    setEvidenceAddressSearch('');
                                    setShowAddressDropdown(false);
                                  }}
                                  className="w-full px-3 py-2.5 text-left hover:bg-[#F8FAFC] transition-colors cursor-pointer flex items-center gap-2 border-b border-[#F1F5F9] last:border-b-0"
                                >
                                  <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${
                                    opt.source === 'timeline' ? 'bg-[#1E40AF]/10' : 'bg-[#EA580C]/10'
                                  }`}>
                                    {opt.source === 'timeline'
                                      ? <Home className="w-3 h-3 text-[#1E40AF]" strokeWidth={1.5} />
                                      : <ShieldAlert className="w-3 h-3 text-[#EA580C]" strokeWidth={1.5} />
                                    }
                                  </div>
                                  <span className="text-xs text-[#0F172A] font-normal truncate">{opt.label}</span>
                                  <span className="text-[8px] tracking-wider uppercase text-[#94A3B8] ml-auto shrink-0 font-medium">
                                    {opt.source === 'timeline' ? 'History' : 'Alert'}
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Evidence Link — for pasting URLs */}
                        <div>
                          <label className={labelClass}>Evidence Link (optional)</label>
                          <div className="relative">
                            <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94A3B8]" strokeWidth={1.5} />
                            <input
                              value={evidenceExternalLink}
                              onChange={e => setEvidenceExternalLink(e.target.value)}
                              placeholder="e.g. Facebook Marketplace link, Google Drive..."
                              className={`${inputClass} pl-9`}
                              enterKeyHint="next"
                              {...urlFieldProps}
                            />
                          </div>
                        </div>

                        {/* Notes */}
                        <div>
                          <label className={labelClass}>Notes</label>
                          <textarea
                            value={evidenceNotes}
                            onChange={e => setEvidenceNotes(e.target.value)}
                            placeholder="Describe what this evidence shows..."
                            rows={2}
                            className={`${inputClass} resize-none`}
                          />
                        </div>

                        {evidenceError && <p className="text-xs text-[#B91C1C] font-normal">{evidenceError}</p>}

                        <button
                          onClick={async () => {
                            if (!evidenceFile && !evidenceExternalLink.trim()) {
                              setEvidenceError('Please upload a file or provide an evidence link');
                              return;
                            }
                            setEvidenceError('');
                            setEvidenceSaving(true);

                            try {
                              let fileData: {
                                storage_path: string;
                                file_url: string;
                                file_type: string;
                                file_size: number;
                                original_name: string;
                              } | null = null;

                              // Upload file if present
                              if (evidenceFile) {
                                setEvidenceUploading(true);
                                fileData = await uploadEvidenceFile(evidenceFile);
                                setEvidenceUploading(false);
                              }

                              await createEvidence({
                                email,
                                listing_id: evidenceAssociatedAddress || 'unlinked',
                                filename: fileData?.original_name || evidenceExternalLink.trim().split('/').pop() || 'link',
                                file_url: fileData?.file_url || '',
                                file_type: fileData?.file_type || '',
                                file_size: fileData?.file_size || 0,
                                storage_path: fileData?.storage_path || '',
                                associated_address: evidenceAssociatedAddress,
                                associated_address_label: evidenceAssociatedLabel,
                                external_link: evidenceExternalLink.trim(),
                                notes: evidenceNotes.trim(),
                              });

                              resetEvidenceForm();
                              if (autoAddEvidence) {
                                setShowEvidenceReturnBanner(true);
                              }
                              window.dispatchEvent(new CustomEvent('ghar-evidence-added'));
                            } catch (err) {
                              console.error('GHAR add evidence error:', err);
                              setEvidenceError('Failed to save evidence. Please try again.');
                              setEvidenceUploading(false);
                            } finally {
                              setEvidenceSaving(false);
                            }
                          }}
                          disabled={evidenceSaving || evidenceUploading}
                          className="w-full py-3 bg-[#1E40AF] text-white rounded-xl text-xs tracking-wide font-medium hover:bg-[#1E3A8A] transition-all shadow-lg shadow-[#1E40AF]/20 cursor-pointer disabled:opacity-50"
                        >
                          {evidenceUploading ? 'Uploading...' : evidenceSaving ? 'Saving...' : 'Save Evidence'}
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Evidence items */}
                  <div className="space-y-6">
                    {Object.keys(groupedEvidence).length === 0 && !showAddEvidence ? (
                      <div className="text-center py-12">
                        <FolderOpen className="w-10 h-10 text-[#E2E8F0] mx-auto mb-3" strokeWidth={1.5} />
                        <p className="text-sm text-[#94A3B8] font-normal">No evidence items yet</p>
                        <p className="text-xs text-[#CBD5E1] mt-1 font-normal">
                          Upload files or paste links to build your evidence vault
                        </p>
                      </div>
                    ) : (
                      Object.entries(groupedEvidence).map(([groupKey, items]) => (
                        <div key={groupKey}>
                          <div className="flex items-center gap-2 mb-3">
                            <FolderOpen className="w-4 h-4 text-[#1E40AF]" strokeWidth={1.5} />
                            <span className="text-xs text-[#0F172A] font-bold truncate">
                              {groupKey === 'unlinked' ? 'General Evidence' : groupKey}
                            </span>
                          </div>
                          <div className="space-y-2 ml-6">
                            {items.map(item => (
                              <div key={item.id} className="border border-[#E2E8F0] rounded-xl p-3 flex items-center gap-3 hover:bg-[#F8FAFC] hover:shadow-sm transition-all group">
                                <div className="w-9 h-9 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg flex items-center justify-center text-[#64748B]">
                                  {getFileIcon(item.file_type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-[#0F172A] truncate font-normal">{item.filename}</p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    {item.notes && (
                                      <p className="text-xs text-[#94A3B8] font-normal truncate">{item.notes}</p>
                                    )}
                                    {item.external_link && (
                                      <a
                                        href={item.external_link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1 text-[10px] text-[#1E40AF] hover:underline font-medium shrink-0"
                                        onClick={e => e.stopPropagation()}
                                      >
                                        <Link2 className="w-3 h-3" strokeWidth={1.5} />
                                        Link
                                      </a>
                                    )}
                                  </div>
                                  {item.file_size > 0 && (
                                    <p className="text-[9px] text-[#CBD5E1] font-medium mt-0.5">
                                      {formatFileSize(item.file_size)}
                                    </p>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="flex items-center gap-1 text-[#94A3B8]">
                                    <Calendar className="w-3 h-3" strokeWidth={1.5} />
                                    <span className="text-[9px] tracking-wide font-medium">
                                      {format(new Date(item.created_at), 'dd MMM')}
                                    </span>
                                  </div>
                                  <button
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      try {
                                        await deleteEvidence(item.id, email);
                                        window.dispatchEvent(new CustomEvent('ghar-evidence-added'));
                                      } catch (err) {
                                        console.error('GHAR delete evidence error:', err);
                                      }
                                    }}
                                    className="opacity-0 group-hover:opacity-100 text-[#94A3B8] hover:text-[#B91C1C] transition-all cursor-pointer"
                                    title="Delete evidence"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'plans' && (
              <div className="flex flex-col h-full">
                <div className="px-4 py-4 border-b border-[#E2E8F0] bg-white">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#EEF2FF] flex items-center justify-center shrink-0">
                      <Users className="w-5 h-5 text-[#4338CA]" strokeWidth={1.7} />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-[#0F172A]">My Plans</p>
                      <p className="text-sm text-[#64748B]">
                        Keep track of the plans you created or joined.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                  {myPlansError ? (
                    <div className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#991B1B]">
                      {myPlansError}
                    </div>
                  ) : null}

                  {myPlans.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-4 py-6 text-center">
                      <p className="text-sm font-medium text-[#0F172A]">No live plans yet</p>
                      <p className="mt-1 text-xs leading-relaxed text-[#64748B]">
                        Your created and joined plans will appear here as soon as you start making moves.
                      </p>
                    </div>
                  ) : (
                    myPlans.map((plan) => (
                      <article
                        key={plan.id}
                        className="w-full rounded-2xl border border-[#E2E8F0] bg-white p-3 text-left transition-all hover:bg-[#F8FAFC] hover:shadow-sm"
                      >
                        <div className="flex items-start gap-3">
                          {plan.source_event.image_url || plan.source_event.hero_image_url ? (
                            <img
                              src={plan.source_event.hero_image_url || plan.source_event.image_url}
                              alt={plan.source_event.title}
                              className="w-20 h-20 rounded-2xl object-cover shrink-0"
                            />
                          ) : (
                            <div className="w-20 h-20 rounded-2xl bg-[#F1F5F9] shrink-0" />
                          )}

                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-bold text-[#0F172A] truncate">{plan.title}</p>
                              <span className={`rounded-full px-2 py-1 text-[9px] tracking-wide uppercase font-semibold ${
                                plan.is_creator ? 'bg-[#EEF2FF] text-[#4338CA]' : 'bg-[#F1F5F9] text-[#475569]'
                              }`}>
                                {plan.is_creator ? 'Creator' : 'Joined'}
                              </span>
                              <span className={`rounded-full px-2 py-1 text-[9px] tracking-wide uppercase font-semibold ${
                                plan.status === 'active'
                                  ? 'bg-[#DCFCE7] text-[#166534]'
                                  : plan.status === 'full'
                                    ? 'bg-[#DBEAFE] text-[#1D4ED8]'
                                    : plan.status === 'ended'
                                      ? 'bg-[#F1F5F9] text-[#475569]'
                                      : 'bg-[#FEE2E2] text-[#B91C1C]'
                              }`}>
                                {plan.status.replace('_', ' ')}
                              </span>
                            </div>

                            <p className="mt-1 text-xs font-medium text-[#475569] truncate">{plan.source_event.title}</p>

                            <div className="mt-3 space-y-2 text-[11px] text-[#64748B]">
                              <div className="flex items-start gap-2">
                                <Calendar className="w-3.5 h-3.5 mt-0.5 text-[#1E40AF] shrink-0" strokeWidth={1.7} />
                                <span>{formatPlanMeetup(plan.meetup_at)}</span>
                              </div>
                              <div className="flex items-start gap-2">
                                <MapPin className="w-3.5 h-3.5 mt-0.5 text-[#0F766E] shrink-0" strokeWidth={1.7} />
                                <span className="line-clamp-2">{plan.meeting_point || 'Meeting point coming soon'}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Users className="w-3.5 h-3.5 text-[#9333EA]" strokeWidth={1.7} />
                                <span>
                                  {plan.attendee_count} attending{plan.attendee_cap != null ? ` / ${plan.attendee_cap}` : ''}
                                </span>
                              </div>
                            </div>

                            <div
                              className={`mt-3 grid gap-2 ${
                                getPublicPlanActionGridClass(
                                  1 +
                                  (plan.is_creator ? 1 : 0) +
                                  ((plan.can_leave || plan.can_join) ? 1 : 0) +
                                  (plan.can_delete ? 1 : 0),
                                )
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => navigate(buildPublicPlanRoute(plan.event_source, plan.event_slug, plan.id))}
                                className="inline-flex w-full items-center justify-center gap-1 rounded-lg border border-[#CBD5E1] px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-[#1E40AF] transition hover:bg-[#F8FAFC]"
                              >
                                <span>Open Event</span>
                                <ArrowLeft className="w-3 h-3 rotate-180" strokeWidth={1.9} />
                              </button>
                              {plan.is_creator ? (
                                <button
                                  type="button"
                                  onClick={() => openPlanInvite(plan)}
                                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#0F766E] px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-[#0F766E] transition hover:bg-[#F0FDFA]"
                                >
                                  <UserPlus className="w-3 h-3" strokeWidth={1.8} />
                                  Invite Friends
                                </button>
                              ) : null}
                              {(plan.can_leave || plan.can_join) ? (
                                <button
                                  type="button"
                                  onClick={() => handleMyPlanJoinLeave(plan)}
                                  disabled={myPlanActionId === plan.id || myPlanDeleteId === plan.id}
                                  className={`inline-flex w-full items-center justify-center gap-1 rounded-lg px-3 py-2 text-[10px] font-semibold uppercase tracking-wide transition disabled:cursor-not-allowed disabled:opacity-50 ${
                                    plan.viewer_joined && plan.can_leave
                                      ? 'border border-[#CBD5E1] text-[#475569] hover:bg-[#F8FAFC]'
                                      : 'bg-[#0F766E] text-white hover:bg-[#115E59]'
                                  }`}
                                >
                                  {myPlanActionId === plan.id
                                    ? 'Saving...'
                                    : plan.viewer_joined
                                      ? 'Leave Plan'
                                      : plan.can_join
                                        ? 'Join Plan'
                                        : 'Unavailable'}
                                </button>
                              ) : null}
                              {plan.can_delete ? (
                                <button
                                  type="button"
                                  onClick={() => handleMyPlanDelete(plan)}
                                  disabled={myPlanDeleteId === plan.id || myPlanActionId === plan.id}
                                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#FECACA] px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-[#B91C1C] transition hover:bg-[#FEF2F2] disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  <Trash2 className="w-3 h-3" strokeWidth={1.8} />
                                  {myPlanDeleteId === plan.id ? 'Deleting...' : 'Delete Plan'}
                                </button>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </div>
            )}
            {/* ─── INVITES TAB ─────────────────────────────── */}
            {activeTab === 'invites' && (
              <ReferralInvitesPanel email={email} />
            )}
            {/* ─── ADMIN TAB ─────────────────────────────── */}
            {activeTab === 'admin' && isAdmin && (
              <AdminPanel email={email} />
            )}
            {/* ─── USERS TAB ─────────────────────────────── */}
            {activeTab === 'users' && isAdmin && (
              <UsersPanel email={email} />
            )}
          </>
        )}
      </div>

      {/* ─── Admin Verification Modal ─── */}
      <AnimatePresence>
        {showCurrentAddressPrompt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[998] bg-black/35 flex items-center justify-center p-6"
            onClick={handleCurrentAddressPromptDismiss}
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              transition={{ type: 'spring', damping: 26, stiffness: 280 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4"
            >
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 bg-[#1E40AF]/10 rounded-2xl flex items-center justify-center shrink-0">
                  <Shield className="w-6 h-6 text-[#1E40AF]" strokeWidth={1.7} />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-[#0F172A] font-bold">Current Rental Health Assessment</p>
                  <p className="text-[11px] text-[#64748B] font-normal mt-1 leading-relaxed">
                    Add your current address so {APP_CONFIG.displayName} can match police alerts, tenancy health checks, and local safety updates to where you are living right now.
                  </p>
                </div>
                <button
                  onClick={handleCurrentAddressPromptDismiss}
                  className="text-[#94A3B8] hover:text-[#0F172A] cursor-pointer"
                >
                  <X className="w-4 h-4" strokeWidth={1.5} />
                </button>
              </div>

              <div className="rounded-2xl border border-[#DBEAFE] bg-[#F8FBFF] p-4">
                <p className="text-[10px] tracking-wide uppercase text-[#1E40AF] font-semibold">Why this matters</p>
                <p className="mt-2 text-xs text-[#475569] leading-relaxed font-normal">
                  Without a current address, {APP_CONFIG.displayName} cannot tailor rental risk checks, suburb-specific safety signals, or police updates to your actual area.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleCurrentAddressPromptDismiss}
                  className="flex-1 py-3 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] text-xs font-semibold text-[#64748B] cursor-pointer"
                >
                  Later
                </button>
                <button
                  onClick={handleStartCurrentAddressAssessment}
                  className="flex-1 py-3 rounded-2xl bg-[#1E40AF] text-white text-xs font-semibold shadow-lg shadow-[#1E40AF]/20 cursor-pointer"
                >
                  Add Current Address
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
        {showAdminModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10020] flex items-end justify-center bg-black/40 px-4 pt-8 sm:items-center sm:p-6"
            data-testid="admin-access-modal-overlay"
            style={{
              ...keyboardAwareModalPaddingStyle,
              paddingBottom: 'max(calc(var(--app-bottom-nav-clearance) + 1rem), calc(var(--app-keyboard-inset) + 1rem))',
            }}
            onClick={() => adminStep !== 'checking' && adminStep !== 'sending' && setShowAdminModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="max-h-[calc(100dvh-1rem)] w-full max-w-sm space-y-4 overflow-y-auto rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl"
              data-testid="admin-access-modal"
              data-keyboard-aware-scroll
              style={{
                ...getKeyboardAwareSheetStyle(420),
                paddingBottom: 'max(1.5rem, calc(var(--app-bottom-nav-clearance) + 1rem), calc(var(--app-keyboard-inset) + 1rem))',
                scrollPaddingBottom: 'max(1.5rem, calc(var(--app-bottom-nav-clearance) + 1rem), calc(var(--app-keyboard-inset) + 1rem))',
              }}
            >
              {/* Header */}
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-[#B91C1C] rounded-xl flex items-center justify-center">
                  <KeyRound className="w-5 h-5 text-white" strokeWidth={2} />
                </div>
                <div>
                  <p className="text-sm text-[#0F172A] font-bold">Admin Access</p>
                  <p className="text-[10px] text-[#64748B] font-normal">{APP_CONFIG.displayName} Administration Panel</p>
                </div>
                <button
                  onClick={() => setShowAdminModal(false)}
                  className="ml-auto text-[#94A3B8] hover:text-[#0F172A] cursor-pointer"
                >
                  <X className="w-4 h-4" strokeWidth={1.5} />
                </button>
              </div>

              {/* Checking */}
              {adminStep === 'checking' && (
                <div className="flex flex-col items-center py-6 gap-3">
                  <div className="w-8 h-8 border-2 border-[#B91C1C] border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-[#64748B] font-normal">Checking admin eligibility...</p>
                </div>
              )}

              {/* Sending */}
              {adminStep === 'sending' && (
                <div className="flex flex-col items-center py-6 gap-3">
                  <div className="w-8 h-8 border-2 border-[#B91C1C] border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-[#64748B] font-normal">Sending verification code to {email}...</p>
                </div>
              )}

              {/* Not Admin */}
              {adminStep === 'not-admin' && (
                <div className="text-center py-4 space-y-2">
                  <div className="w-12 h-12 bg-[#FEF2F2] rounded-xl flex items-center justify-center mx-auto">
                    <ShieldAlert className="w-6 h-6 text-[#B91C1C]" strokeWidth={1.5} />
                  </div>
                  <p className="text-sm text-[#0F172A] font-bold">Access Denied</p>
                  <p className="text-xs text-[#64748B] font-normal">
                    {adminError || 'This email is not authorized for admin access.'}
                  </p>
                  <button
                    onClick={() => setShowAdminModal(false)}
                    className="mt-2 px-6 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#64748B] font-medium cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              )}

              {/* Verify OTP */}
              {adminStep === 'verify' && (
                <div className="space-y-3">
                  <div className="bg-[#F8FAFC] rounded-xl p-3 text-center">
                    <p className="text-xs text-[#64748B] font-normal">
                      A 6-character code was sent to
                    </p>
                    <p className="text-xs text-[#0F172A] font-bold mt-1">{email}</p>
                  </div>
                  <div>
                    <label className="text-[10px] tracking-wide uppercase text-[#94A3B8] mb-1 block font-medium">
                      Verification Code
                    </label>
                    <input
                      type="text"
                      {...codeFieldProps}
                      autoComplete="off"
                      maxLength={6}
                      value={adminOtp}
                      onChange={e => setAdminOtp(e.target.value.replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 6))}
                      placeholder="AAAAAA"
                      className="w-full px-4 py-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-center text-2xl tracking-[0.5em] text-[#0F172A] font-bold focus:outline-none focus:border-[#B91C1C] focus:ring-2 focus:ring-[#B91C1C]/10"
                      enterKeyHint="done"
                    />
                  </div>
                  {adminError && (
                    <p className="text-[10px] text-[#B91C1C] text-center font-normal">{adminError}</p>
                  )}
                  <button
                    onClick={handleAdminVerify}
                    disabled={adminLoading || adminOtp.length !== 6}
                    className="w-full py-2.5 bg-[#B91C1C] text-white rounded-xl text-xs font-bold hover:bg-[#991B1B] transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {adminLoading ? 'Verifying...' : 'Verify & Access Admin'}
                  </button>
                  <button
                    onClick={handleAdminResend}
                    disabled={adminLoading}
                    className="w-full py-2 text-xs text-[#64748B] hover:text-[#B91C1C] cursor-pointer font-medium transition-colors disabled:opacity-50"
                  >
                    Resend Code
                  </button>
                </div>
              )}

              {/* Success */}
              {adminStep === 'success' && (
                <div className="flex flex-col items-center py-6 gap-3">
                  <div className="w-12 h-12 bg-[#16A34A] rounded-xl flex items-center justify-center">
                    <Check className="w-6 h-6 text-white" strokeWidth={2} />
                  </div>
                  <p className="text-sm text-[#0F172A] font-bold">Admin Access Granted</p>
                  <p className="text-xs text-[#64748B] font-normal">Redirecting to Admin Panel...</p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Risk Assessment Modal */}
      {riskAssessmentEntry && (
        <RiskAssessmentModal
          open={showRiskAssessment}
          onClose={() => {
            setShowRiskAssessment(false);
            setRiskAssessmentEntry(null);
          }}
          rentalEntry={riskAssessmentEntry}
          onComplete={(updated) => {
            setRentalHistory(prev => prev.map(r => r.id === updated.id ? updated : r));
          }}
        />
      )}
    </div>
  );
}
