import { useState, useEffect, useMemo, useCallback } from 'react';
import { Scale, Plus, FileText, Shield, ExternalLink, Check, Clock, ChevronRight, AlertTriangle, X, Home, MapPin, FolderOpen, Pencil, Trash2, BookOpen, Landmark, ShieldCheck, Gavel, Download, MessageSquare, Zap } from 'lucide-react';
import { format } from 'date-fns';
import { jsPDF } from 'jspdf';
import { fetchLegalCases, createLegalCase, updateLegalCase, deleteLegalCase, fetchRentalHistory, fetchProfile } from '../lib/api';
import type { Evidence, Listing, LegalCase, RentalEntry } from '../lib/mock-data';
import { categoryLabels, categoryColors } from '../lib/mock-data';
import { useLocation, useNavigate, useSearchParams } from 'react-router';
import { TriageCenter } from './triage-center';
import { APP_CONFIG } from '../lib/app-config';
import { downloadSetuPdf } from '../lib/setu-pdf';
import hoodieniMascotUrl from '../assets/hoodienie.svg';
import { SponsorCompaniesDirectory } from './sponsor-companies-directory';
import { PrPointsCalculatorTool } from './pr-points-calculator-tool';
import { OccupationsTool } from './occupations-tool';
import { ApplicationKitTool } from './application-kit-tool';
import { ScamCheckerTool } from './scam-checker-tool';
import { NswRentCheckTool } from './nsw-rent-check-tool';
import { HoodieHelpTrigger } from './hoodie-help-tour';
import { HOODIE_FEATURED_NAV_GEOMETRY } from '../lib/hoodie-nav-geometry';
import { SetuChinaChecklistPage } from '../pages/setu-china-pages';
import { SetuIndiaChecklistPage } from '../pages/setu-india-pages';
import { JomSettleChecklistPage } from '../pages/jom-settle-pages';
import {
  parseJobsTab,
  parsePrepareTab,
  parseLegalSection,
  type JobsTab,
  type LegalSection,
} from '../lib/resources-routes';
import type { PrepareTab } from '../lib/prepare-types';
import { FREE_ELECTRICITY_GUIDE_ROUTE } from '../lib/free-electricity-guide';

interface LegalCenterProps {
  evidence: Evidence[];
  listings: Listing[];
  preSelectedListing?: Listing | null;
}

type View = 'dashboard' | 'builder' | 'detail';

function getPrepareSubtitleLabel(tab: PrepareTab, isSetuChina = false) {
  if (isSetuChina) {
    if (tab === 'checklist') return 'Checklist 清单';
    if (tab === 'application-kit') return 'Application Kit 申请材料';
    if (tab === 'scam-checker') return 'Scam Checker 防骗检查';
    return 'NSW Rent Check 租金检查';
  }
  if (tab === 'checklist') return 'Checklist';
  if (tab === 'application-kit') return 'Application Kit';
  if (tab === 'scam-checker') return 'Scam Checker';
  return 'NSW Rent Check';
}

function getJobsSubtitleLabel(tab: JobsTab, isSetuChina = false) {
  if (isSetuChina) {
    if (tab === 'occupations') return 'Occupations 职业';
    if (tab === 'pr-points') return 'PR Points 移民分数';
    return 'Sponsor Companies 担保公司';
  }
  if (tab === 'occupations') return 'Occupations';
  if (tab === 'pr-points') return 'PR Points';
  return 'Sponsor Companies';
}

// ─── TENANT RIGHTS DIRECTORY (2026 Compilation) ─────────────────
interface StateResource {
  code: string;
  name: string;
  tribunal: string;
  tribunalAbbrev: string;
  tribunalUrl: string;
  advocacy: string;
  advocacyUrl: string;
  tenancyActLabel: string;
  tenancyActUrl: string;
  bondDisputeLabel: string;
  bondDisputeUrl: string;
}

const stateDirectory: Record<string, StateResource> = {
  NSW: {
    code: 'NSW',
    name: 'New South Wales',
    tribunal: 'NSW Civil & Administrative Tribunal',
    tribunalAbbrev: 'NCAT',
    tribunalUrl: 'https://ncat.nsw.gov.au',
    advocacy: 'Tenants\' Union of NSW',
    advocacyUrl: 'https://tenants.org.au',
    tenancyActLabel: 'Residential Tenancies Act 2010 (NSW)',
    tenancyActUrl: 'https://legislation.nsw.gov.au/view/html/inforce/current/act-2010-042',
    bondDisputeLabel: 'Bond Refund Application',
    bondDisputeUrl: 'https://www.fairtrading.nsw.gov.au/housing-and-property/renting/rental-bonds',
  },
  VIC: {
    code: 'VIC',
    name: 'Victoria',
    tribunal: 'Victorian Civil & Administrative Tribunal',
    tribunalAbbrev: 'VCAT',
    tribunalUrl: 'https://vcat.vic.gov.au',
    advocacy: 'Tenants Victoria',
    advocacyUrl: 'https://tenantsvic.org.au',
    tenancyActLabel: 'Residential Tenancies Act 1997 (VIC)',
    tenancyActUrl: 'https://www.legislation.vic.gov.au/in-force/acts/residential-tenancies-act-1997',
    bondDisputeLabel: 'Bond Claim via RTBA',
    bondDisputeUrl: 'https://www.consumer.vic.gov.au/housing/renting',
  },
  QLD: {
    code: 'QLD',
    name: 'Queensland',
    tribunal: 'Queensland Civil & Administrative Tribunal',
    tribunalAbbrev: 'QCAT',
    tribunalUrl: 'https://qcat.qld.gov.au',
    advocacy: 'Tenants Queensland',
    advocacyUrl: 'https://tenantsqld.org.au',
    tenancyActLabel: 'Residential Tenancies Act 1994 (QLD)',
    tenancyActUrl: 'https://www.legislation.qld.gov.au/view/html/inforce/current/act-2008-073',
    bondDisputeLabel: 'RTA Bond Dispute',
    bondDisputeUrl: 'https://www.rta.qld.gov.au/refund',
  },
  WA: {
    code: 'WA',
    name: 'Western Australia',
    tribunal: 'Magistrates Court of WA',
    tribunalAbbrev: 'Magistrates Court',
    tribunalUrl: 'https://www.magistratescourt.wa.gov.au',
    advocacy: 'Circle Green Community Legal',
    advocacyUrl: 'https://circlegreen.org.au',
    tenancyActLabel: 'Residential Tenancies Act 1987 (WA)',
    tenancyActUrl: 'https://www.legislation.wa.gov.au/legislation/statutes.nsf/main_mrtitle_821_homepage.html',
    bondDisputeLabel: 'Bond Disposal Form',
    bondDisputeUrl: 'https://www.commerce.wa.gov.au/consumer-protection/bonds',
  },
  SA: {
    code: 'SA',
    name: 'South Australia',
    tribunal: 'SA Civil & Administrative Tribunal',
    tribunalAbbrev: 'SACAT',
    tribunalUrl: 'https://sacat.sa.gov.au',
    advocacy: 'SYC RentRight SA',
    advocacyUrl: 'https://sacat.sa.gov.au',
    tenancyActLabel: 'Residential Tenancies Act 1995 (SA)',
    tenancyActUrl: 'https://www.legislation.sa.gov.au/lz?path=/c/a/residential%20tenancies%20act%201995',
    bondDisputeLabel: 'Bond Dispute Application',
    bondDisputeUrl: 'https://www.sa.gov.au/topics/housing',
  },
  TAS: {
    code: 'TAS',
    name: 'Tasmania',
    tribunal: 'Tasmanian Civil & Administrative Tribunal',
    tribunalAbbrev: 'TASCAT',
    tribunalUrl: 'https://tascat.tas.gov.au',
    advocacy: 'Tenants\' Union of Tasmania',
    advocacyUrl: 'https://tutenants.org.au',
    tenancyActLabel: 'Residential Tenancy Act 1997 (TAS)',
    tenancyActUrl: 'https://www.legislation.tas.gov.au/view/html/inforce/current/act-1997-082',
    bondDisputeLabel: 'Bond Claim Application',
    bondDisputeUrl: 'https://www.cbos.tas.gov.au/topics/housing/renting/bonds',
  },
  ACT: {
    code: 'ACT',
    name: 'Australian Capital Territory',
    tribunal: 'ACT Civil & Administrative Tribunal',
    tribunalAbbrev: 'ACAT',
    tribunalUrl: 'https://acat.act.gov.au',
    advocacy: 'Legal Aid ACT (Tenancy)',
    advocacyUrl: 'https://acat.act.gov.au',
    tenancyActLabel: 'Residential Tenancies Act 1997 (ACT)',
    tenancyActUrl: 'https://www.legislation.act.gov.au/a/1997-84',
    bondDisputeLabel: 'Bond Dispute via ACAT',
    bondDisputeUrl: 'https://www.acat.act.gov.au/case-types/rental-disputes',
  },
  NT: {
    code: 'NT',
    name: 'Northern Territory',
    tribunal: 'NT Civil & Administrative Tribunal',
    tribunalAbbrev: 'NTCAT',
    tribunalUrl: 'https://ntcat.nt.gov.au',
    advocacy: 'Darwin Community Legal Service',
    advocacyUrl: 'https://ntcat.nt.gov.au',
    tenancyActLabel: 'Residential Tenancies Act 1999 (NT)',
    tenancyActUrl: 'https://legislation.nt.gov.au/en/Legislation/RESIDENTIAL-TENANCIES-ACT-1999',
    bondDisputeLabel: 'Bond Recovery Application',
    bondDisputeUrl: 'https://nt.gov.au/property/private-renters',
  },
};

const allStates = Object.values(stateDirectory);

export function LegalCenter({ evidence, listings, preSelectedListing }: LegalCenterProps) {
  const email = localStorage.getItem('ghar_email') || '';
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isHoodieExperience = APP_CONFIG.experienceMode === 'hoodie';
  const isSetuChina = APP_CONFIG.variant === 'setu_china';
  const isSetuIndia = APP_CONFIG.variant === 'ghar';
  const isJomSettle = APP_CONFIG.variant === 'jom_settle';
  const hasArrivalChecklist = isSetuChina || isSetuIndia || isJomSettle;
  const useHoodieResourcesShell = APP_CONFIG.useSharedResourcesShell;
  const parsedSection = parseLegalSection(searchParams.get('section'));
  const parsedPrepareTab = parsePrepareTab(searchParams.get('prepare_tab'));
  const parsedJobsTab = parseJobsTab(searchParams.get('jobs_tab'));
  const defaultPrepareTab: PrepareTab = hasArrivalChecklist ? 'checklist' : 'application-kit';
  const normalizePrepareTabForVariant = useCallback((tab: PrepareTab | null): PrepareTab | null => {
    if (!hasArrivalChecklist && tab === 'checklist') return null;
    return tab;
  }, [hasArrivalChecklist]);
  const legalAssistantTitle = isHoodieExperience ? `Ask ${APP_CONFIG.assistantName}` : `Ask ${APP_CONFIG.displayName} AI`;
  const legalAssistantBody = isHoodieExperience
    ? 'Sort your evidence, prep a dispute, upload what matters, and take the next smart step.'
    : 'Prepare for disputes and gather relevant information';
  const legalConsultTitle = isHoodieExperience ? `${APP_CONFIG.assistantName} Legal Prep` : `${APP_CONFIG.displayName} Legal Consult`;
  const legalConsultBody = isHoodieExperience
    ? 'Organise your evidence and get pointed toward the right tenancy next step.'
    : 'Quick consults before you sign a lease';

  const [view, setView] = useState<View>(preSelectedListing ? 'builder' : 'dashboard');
  const [cases, setCases] = useState<LegalCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCase, setSelectedCase] = useState<LegalCase | null>(null);
  const [isTriageOpen, setIsTriageOpen] = useState(false);

  // Case builder state
  const [caseTitle, setCaseTitle] = useState('');
  const [selectedListing, setSelectedListing] = useState<Listing | null>(preSelectedListing || null);
  const [selectedRentalAddress, setSelectedRentalAddress] = useState<RentalEntry | null>(null);
  const [selectedEvidence, setSelectedEvidence] = useState<string[]>([]);
  const [caseNotes, setCaseNotes] = useState('');
  const [building, setBuilding] = useState(false);
  const [buildError, setBuildError] = useState('');
  const [showListingPicker, setShowListingPicker] = useState(false);
  const [showEvidencePicker, setShowEvidencePicker] = useState(false);
  const [rentalHistory, setRentalHistory] = useState<RentalEntry[]>([]);
  const [profileData, setProfileData] = useState<Record<string, any> | null>(null);

  // User's detected Australian state
  const [userState, setUserState] = useState<string | null>(null);
  const [showAllStates, setShowAllStates] = useState(false);
  const [prepareSubtitle, setPrepareSubtitle] = useState(() => getPrepareSubtitleLabel(defaultPrepareTab, isSetuChina));
  const [resourcesSectionState, setResourcesSectionState] = useState<LegalSection>(parsedSection || 'legal');
  const [prepareTabState, setPrepareTabState] = useState<PrepareTab>(normalizePrepareTabForVariant(parsedPrepareTab) || defaultPrepareTab);
  const [jobsTabState, setJobsTabState] = useState<JobsTab>(parsedJobsTab || 'sponsor-companies');

  const activeSection: LegalSection = useHoodieResourcesShell
    ? view === 'dashboard'
      ? resourcesSectionState
      : 'legal'
    : 'legal';
  const activePrepareTab: PrepareTab = prepareTabState;
  const activeJobsTab: JobsTab = jobsTabState;

  useEffect(() => {
    loadCases();
    loadRentalHistory();
    detectUserState();
  }, []);

  useEffect(() => {
    if (!useHoodieResourcesShell || view !== 'dashboard') return;

    const urlParams = new URLSearchParams(location.search);
    const nextSection = parseLegalSection(urlParams.get('section')) || 'legal';
    const nextPrepareTab = normalizePrepareTabForVariant(parsePrepareTab(urlParams.get('prepare_tab'))) || defaultPrepareTab;
    const nextJobsTab = parseJobsTab(urlParams.get('jobs_tab')) || 'sponsor-companies';

    setResourcesSectionState((currentSection) => (
      currentSection === nextSection ? currentSection : nextSection
    ));
    setPrepareTabState((currentPrepareTab) => (
      currentPrepareTab === nextPrepareTab ? currentPrepareTab : nextPrepareTab
    ));
    setJobsTabState((currentJobsTab) => (
      currentJobsTab === nextJobsTab ? currentJobsTab : nextJobsTab
    ));
  }, [defaultPrepareTab, location.search, normalizePrepareTabForVariant, useHoodieResourcesShell, view]);

  useEffect(() => {
    if (!useHoodieResourcesShell) return;

    const nextParams = new URLSearchParams(location.search);
    let changed = false;

    if (view !== 'dashboard') {
      if (nextParams.get('section') !== 'legal') {
        nextParams.set('section', 'legal');
        changed = true;
      }
      if (nextParams.has('jobs_tab')) {
        nextParams.delete('jobs_tab');
        changed = true;
      }
      if (nextParams.has('prepare_tab')) {
        nextParams.delete('prepare_tab');
        changed = true;
      }
    } else {
      const section = resourcesSectionState;
      if (nextParams.get('section') !== section) {
        nextParams.set('section', section);
        changed = true;
      }

      if (section === 'prepare') {
        const prepareTab = prepareTabState;
        if (nextParams.get('prepare_tab') !== prepareTab) {
          nextParams.set('prepare_tab', prepareTab);
          changed = true;
        }
        if (nextParams.has('jobs_tab')) {
          nextParams.delete('jobs_tab');
          changed = true;
        }
      } else if (section === 'jobs') {
        const jobsTab = jobsTabState;
        if (nextParams.get('jobs_tab') !== jobsTab) {
          nextParams.set('jobs_tab', jobsTab);
          changed = true;
        }
        if (nextParams.has('prepare_tab')) {
          nextParams.delete('prepare_tab');
          changed = true;
        }
      } else {
        if (nextParams.has('jobs_tab')) {
          nextParams.delete('jobs_tab');
          changed = true;
        }
        if (nextParams.has('prepare_tab')) {
          nextParams.delete('prepare_tab');
          changed = true;
        }
      }
    }

    if (changed) {
      setSearchParams(nextParams, { replace: true });
    }
  }, [jobsTabState, location.search, prepareTabState, resourcesSectionState, setSearchParams, useHoodieResourcesShell, view]);

  const loadRentalHistory = async () => {
    try {
      const history = await fetchRentalHistory(email);
      setRentalHistory(history);
    } catch (err) {
      console.error('GHAR rental history load error in legal center:', err);
    }
  };

  const loadCases = async () => {
    setLoading(true);
    try {
      const data = await fetchLegalCases(email);
      setCases(data);
    } catch (err) {
      console.error('GHAR legal cases load error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Detect user's Australian state from profile or rental history
  const detectUserState = async () => {
    try {
      const profile = await fetchProfile(email);
      setProfileData(profile);
      if (profile?.australian_state) {
        setUserState(profile.australian_state);
        return;
      }
    } catch { /* fall through */ }
    try {
      const history = await fetchRentalHistory(email);
      const current = history.find((r: RentalEntry) => r.is_current);
      if (current?.state) {
        setUserState(current.state);
        return;
      }
      // fallback: most recent entry
      if (history.length > 0) {
        const sorted = [...history].sort((a: RentalEntry, b: RentalEntry) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        if (sorted[0]?.state) setUserState(sorted[0].state);
      }
    } catch { /* ignore */ }
  };

  const scamCount = listings.filter(l => l.category === 'scam').length;
  const maintenanceCount = listings.filter(l => l.category === 'maintenance').length;

  const formatRentalAddressLabel = (entry: RentalEntry) =>
    `${entry.unit_number ? `Unit ${entry.unit_number}, ` : ''}${entry.display_address || entry.address}`;

  const formatListingAddressLabel = (listing: Listing) =>
    `${listing.unit_number ? `Unit ${listing.unit_number}, ` : ''}${listing.address}`;

  const normalizeLabel = (value: string) => value.trim().toLowerCase();

  const resolveEvidenceGroupLabel = (item: Evidence) => {
    if (item.associated_address_label?.trim()) {
      return item.associated_address_label.trim();
    }

    if (item.associated_address?.trim()) {
      const rentalMatch = rentalHistory.find(entry => entry.id === item.associated_address);
      if (rentalMatch) {
        return formatRentalAddressLabel(rentalMatch);
      }

      const listingMatch = listings.find(listing => listing.id === item.associated_address);
      if (listingMatch) {
        return formatListingAddressLabel(listingMatch);
      }
    }

    if (item.listing_id?.trim() && item.listing_id !== 'unlinked') {
      const linkedListing = listings.find(listing => listing.id === item.listing_id);
      if (linkedListing?.rental_entry_id) {
        const rentalMatch = rentalHistory.find(entry => entry.id === linkedListing.rental_entry_id);
        if (rentalMatch) {
          return formatRentalAddressLabel(rentalMatch);
        }
      }

      if (linkedListing) {
        return formatListingAddressLabel(linkedListing);
      }
    }

    return 'Unlinked evidence';
  };

  const selectedRentalAddressLabel = selectedRentalAddress ? formatRentalAddressLabel(selectedRentalAddress) : null;
  const selectedListingAddressLabel = selectedListing ? formatListingAddressLabel(selectedListing) : null;

  const selectedEvidenceItems = useMemo(
    () => selectedEvidence
      .map(id => evidence.find(item => item.id === id))
      .filter(Boolean) as Evidence[],
    [evidence, selectedEvidence]
  );

  const selectedEvidenceSummary = useMemo(() => {
    if (selectedEvidenceItems.length === 0) {
      return 'Select evidence from your vault (optional)';
    }

    if (selectedEvidenceItems.length === 1) {
      return selectedEvidenceItems[0].filename;
    }

    return `${selectedEvidenceItems.length} evidence files selected`;
  }, [selectedEvidenceItems]);

  const evidenceSections = useMemo(() => {
    const groupedEvidence = new Map<string, {
      key: string;
      label: string;
      items: Evidence[];
      latestCreatedAt: number;
      timelineIndex: number | null;
      isSelectedRental: boolean;
      matchesSelectedListing: boolean;
      isUnlinked: boolean;
    }>();

    evidence.forEach(item => {
      const label = resolveEvidenceGroupLabel(item);
      const isUnlinked = label === 'Unlinked evidence';
      const key = isUnlinked ? '__unlinked__' : normalizeLabel(label);
      const createdAt = new Date(item.created_at).getTime() || 0;

      if (!groupedEvidence.has(key)) {
        const timelineIndex = rentalHistory.findIndex(entry => normalizeLabel(formatRentalAddressLabel(entry)) === key);
        groupedEvidence.set(key, {
          key,
          label,
          items: [],
          latestCreatedAt: createdAt,
          timelineIndex: timelineIndex === -1 ? null : timelineIndex,
          isSelectedRental: selectedRentalAddressLabel ? normalizeLabel(selectedRentalAddressLabel) === key : false,
          matchesSelectedListing: Boolean(selectedListing && item.listing_id === selectedListing.id) ||
            Boolean(selectedListingAddressLabel && normalizeLabel(selectedListingAddressLabel) === key),
          isUnlinked,
        });
      }

      const group = groupedEvidence.get(key);
      if (!group) return;

      group.items.push(item);
      group.latestCreatedAt = Math.max(group.latestCreatedAt, createdAt);

      if (selectedListing && item.listing_id === selectedListing.id) {
        group.matchesSelectedListing = true;
      }
    });

    return Array.from(groupedEvidence.values())
      .map(group => ({
        ...group,
        items: [...group.items].sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ),
      }))
      .sort((a, b) => {
        if (a.isUnlinked !== b.isUnlinked) return a.isUnlinked ? 1 : -1;
        if (a.isSelectedRental !== b.isSelectedRental) return a.isSelectedRental ? -1 : 1;
        if (!selectedRentalAddressLabel && a.matchesSelectedListing !== b.matchesSelectedListing) {
          return a.matchesSelectedListing ? -1 : 1;
        }
        if (a.timelineIndex !== null && b.timelineIndex !== null) {
          return a.timelineIndex - b.timelineIndex;
        }
        if (a.timelineIndex !== null) return -1;
        if (b.timelineIndex !== null) return 1;
        return b.latestCreatedAt - a.latestCreatedAt;
      });
  }, [evidence, listings, rentalHistory, selectedListing, selectedListingAddressLabel, selectedRentalAddressLabel]);

  const getApplicableLaw = (listing: Listing | null): string => {
    if (!listing) return 'Residential Tenancies Act 2026 (amended)';
    const addr = listing.address;
    if (addr.includes('VIC')) return 'Residential Tenancies Act 2026 (VIC) — Fixed-Heater Standards';
    if (addr.includes('SA')) return 'Residential Tenancies Act 2026 (SA) — Form A1 Mandates';
    if (addr.includes('NSW')) return 'Residential Tenancies Act 2026 (NSW) — 90-day Rent Increase Notice';
    if (addr.includes('QLD')) return 'Residential Tenancies Act 2026 (QLD)';
    if (addr.includes('WA')) return 'Residential Tenancies Act 2026 (WA)';
    return 'Residential Tenancies Act 2026 (amended) — Federal Renter Protection Standards';
  };

  const handleBuildCase = async () => {
    if (!caseTitle.trim()) { setBuildError('Case title is required'); return; }
    setBuildError('');
    setBuilding(true);
    try {
      const rentalAddr = selectedRentalAddress;

      if (editingCaseId) {
        // Update existing case
        const updated = await updateLegalCase(editingCaseId, {
          email,
          case_title: caseTitle.trim(),
          associated_listing_id: selectedListing?.id || null,
          associated_listing_public_id: selectedListing?.listing_id_public || (rentalAddr ? (rentalAddr.display_address || rentalAddr.address) : null),
          vault_item_ids: selectedEvidence,
          case_notes: caseNotes,
          applicable_law: getApplicableLaw(selectedListing),
        });
        setCases(prev => prev.map(c => c.id === editingCaseId ? updated : c));
        setSelectedCase(updated);
        setView('detail');
        resetBuilder();
      } else {
        // Create new case
        const newCase = await createLegalCase({
          email,
          case_title: caseTitle.trim(),
          associated_listing_id: selectedListing?.id || null,
          associated_listing_public_id: selectedListing?.listing_id_public || (rentalAddr ? (rentalAddr.display_address || rentalAddr.address) : null),
          vault_item_ids: selectedEvidence,
          case_notes: caseNotes,
          applicable_law: getApplicableLaw(selectedListing),
        });
        setCases(prev => [...prev, newCase]);
        setSelectedCase(newCase);
        setView('detail');
        resetBuilder();
      }
    } catch (err) {
      console.error('GHAR build case error:', err);
      setBuildError('Failed to save case. Please try again.');
    } finally {
      setBuilding(false);
    }
  };



  const handleDeleteCase = async (caseId: string) => {
    try {
      await deleteLegalCase(caseId, email);
      setCases(prev => prev.filter(c => c.id !== caseId));
      if (selectedCase?.id === caseId) {
        setSelectedCase(null);
        setView('dashboard');
      }
    } catch (err) {
      console.error('GHAR delete case error:', err);
    }
  };

  const handleEditCase = (c: LegalCase) => {
    setCaseTitle(c.case_title);
    setCaseNotes(c.case_notes || '');
    setSelectedEvidence(c.vault_item_ids || []);
    setSelectedListing(null);
    setSelectedRentalAddress(null);
    setShowListingPicker(false);
    setShowEvidencePicker(false);
    // Find the associated listing if exists
    if (c.associated_listing_id) {
      const listing = listings.find(l => l.id === c.associated_listing_id);
      if (listing) setSelectedListing(listing);
    } else if (c.associated_listing_public_id) {
      // Try to match via rental history
      const rental = rentalHistory.find(r => 
        (r.display_address || r.address) === c.associated_listing_public_id
      );
      if (rental) setSelectedRentalAddress(rental);
    }
    setEditingCaseId(c.id);
    setView('builder');
  };

  const [editingCaseId, setEditingCaseId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const resetBuilder = () => {
    setCaseTitle('');
    setSelectedListing(null);
    setSelectedRentalAddress(null);
    setSelectedEvidence([]);
    setCaseNotes('');
    setBuildError('');
    setEditingCaseId(null);
    setShowListingPicker(false);
    setShowEvidencePicker(false);
  };

  const toggleEvidence = (id: string) => {
    setSelectedEvidence(prev =>
      prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
    );
  };

  const inputClass = "w-full px-3 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#1E40AF] focus:ring-2 focus:ring-[#1E40AF]/10 font-normal";
  const labelClass = "text-[10px] tracking-wide uppercase text-[#94A3B8] mb-1.5 block font-medium";

  const userStateResource = userState ? stateDirectory[userState] || null : null;

  // ─── PDF GENERATION ───────────���───────────────────────────────
  const [pdfGenerating, setPdfGenerating] = useState(false);

  const loadImageAsDataUrl = (url: string): Promise<string | null> => {
    return new Promise(resolve => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(null); return; }
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });
  };

  const loadSvgAsDataUrl = (svgUrl: string, width: number, height: number): Promise<string | null> => {
    return new Promise(resolve => {
      fetch(svgUrl)
        .then(r => r.text())
        .then(svgText => {
          const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) { URL.revokeObjectURL(url); resolve(null); return; }
            ctx.drawImage(img, 0, 0, width, height);
            URL.revokeObjectURL(url);
            resolve(canvas.toDataURL('image/png'));
          };
          img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
          img.src = url;
        })
        .catch(() => resolve(null));
    });
  };

  const generateDossierPdf = useCallback(async (c: LegalCase) => {
    setPdfGenerating(true);
    try {
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 20;
      const contentW = pageW - margin * 2;
      let y = margin;

      const addPageIfNeeded = (needed: number) => {
        if (y + needed > pageH - 25) {
          doc.addPage();
          y = margin;
        }
      };

      // ── Load profile for address & name ──
      let profileName = '';
      let profileEmail = email;
      let profileAddress = '';
      try {
        const profile = await fetchProfile(email);
        if (profile) {
          profileName = [profile.first_name, profile.last_name].filter(Boolean).join(' ');
          profileEmail = profile.email || email;
          const parts = [profile.postcode, profile.australian_state].filter(Boolean);
          if (parts.length > 0) profileAddress = parts.join(', ');
        }
      } catch { /* ignore */ }

      // ── Resolve rental entry for unit details ──
      let fullAddress = c.associated_listing_public_id || '';
      let unitNumber = '';
      if (c.associated_listing_public_id) {
        const rental = rentalHistory.find(r =>
          (r.display_address || r.address) === c.associated_listing_public_id
        );
        if (rental) {
          unitNumber = rental.unit_number || '';
          const addrParts = [
            unitNumber ? `Unit ${unitNumber}` : '',
            rental.display_address || rental.address,
            rental.suburb,
            rental.state,
            rental.postcode,
          ].filter(Boolean);
          fullAddress = addrParts.join(', ');
          if (!profileAddress) profileAddress = fullAddress;
        }
      }

      // ── Load logo SVG ──
      let logoDataUrl: string | null = null;
      if (APP_CONFIG.variant === 'ghar') {
        try {
          const svgModule = await import('../../imports/GHAR_Full-3.svg');
          const svgUrl = typeof svgModule === 'string' ? svgModule : svgModule.default;
          logoDataUrl = await loadSvgAsDataUrl(svgUrl, 700, 216);
        } catch { /* ignore */ }
      }

      // ── Header band ──
      doc.setFillColor(30, 64, 175);
      doc.rect(0, 0, pageW, 38, 'F');

      if (logoDataUrl) {
        doc.addImage(logoDataUrl, 'PNG', margin, 6, 50, 15.4);
      } else {
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text(APP_CONFIG.displayName, margin, 16);
      }

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`${APP_CONFIG.displayName} — Incident Dossier`, margin, 27);
      doc.setFontSize(8);
      doc.text(`Generated ${format(new Date(), 'dd MMM yyyy, HH:mm')}`, margin, 33);

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(c.case_number, pageW - margin, 16, { align: 'right' });
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`Filed ${format(new Date(c.created_at), 'dd MMM yyyy')}`, pageW - margin, 23, { align: 'right' });

      y = 48;

      // ── Case Title ──
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      const titleLines = doc.splitTextToSize(c.case_title, contentW);
      doc.text(titleLines, margin, y);
      y += titleLines.length * 7 + 4;

      // ── Associated Address (from profile + unit details) ──
      if (fullAddress) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text('ASSOCIATED ADDRESS', margin, y);
        y += 5;
        doc.setTextColor(15, 23, 42);
        doc.setFontSize(10);
        const addrLines = doc.splitTextToSize(fullAddress, contentW);
        doc.text(addrLines, margin, y);
        y += addrLines.length * 5 + 4;
        if (unitNumber) {
          doc.setFontSize(8);
          doc.setTextColor(100, 116, 139);
          doc.text(`Unit / Apartment: ${unitNumber}`, margin, y);
          y += 5;
        }
        y += 3;
      }

      // ── Applicable Law ──
      if (c.applicable_law) {
        addPageIfNeeded(18);
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(margin, y, contentW, 14, 2, 2, 'F');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text('APPLICABLE LAW', margin + 4, y + 5);
        doc.setFontSize(9);
        doc.setTextColor(15, 23, 42);
        doc.setFont('helvetica', 'normal');
        doc.text(c.applicable_law, margin + 4, y + 11);
        y += 20;
      }

      // ── Initial Tenancy Health Check ──
      // Find the rental entry matching this case's address and include its risk assessment
      const matchedRental = c.associated_listing_public_id
        ? rentalHistory.find(r => (r.display_address || r.address) === c.associated_listing_public_id)
        : null;

      if (matchedRental?.risk_assessment) {
        const ra = matchedRental.risk_assessment as any;
        const rScore = matchedRental.risk_score || 'Pending';
        const raItems = [
          { label: 'Written Lease Agreement', value: ra.written_lease },
          { label: 'Bond Officially Lodged', value: ra.bond_lodged },
          { label: 'Condition Report Received', value: ra.condition_report_received },
          { label: 'Pre-Existing Damage Noted', value: ra.pre_existing_damage },
          { label: 'Formal Rent Receipts', value: ra.rent_receipts },
        ];

        const blockH = 14 + raItems.length * 7 + 6;
        addPageIfNeeded(blockH + 10);

        // Section header with risk badge
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text('INITIAL TENANCY HEALTH CHECK', margin, y);
        const badgeX = margin + doc.getTextWidth('INITIAL TENANCY HEALTH CHECK') + 4;
        const badgeColor = rScore === 'High Risk' ? [185, 28, 28] :
          rScore === 'Medium Risk' ? [234, 88, 12] : [22, 163, 74];
        doc.setFillColor(badgeColor[0], badgeColor[1], badgeColor[2]);
        doc.roundedRect(badgeX, y - 3.5, doc.getTextWidth(rScore) + 6, 5, 1, 1, 'F');
        doc.setFontSize(6);
        doc.setTextColor(255, 255, 255);
        doc.text(rScore, badgeX + 3, y - 0.5);
        y += 6;

        doc.setFillColor(248, 250, 252);
        doc.roundedRect(margin, y, contentW, blockH - 10, 2, 2, 'F');

        let ry = y + 4;
        raItems.forEach(item => {
          const statusText = item.value === true ? 'YES' : item.value === false ? 'NO' : 'UNSURE';
          const isRisk = item.label === 'Pre-Existing Damage Noted'
            ? item.value === true
            : item.value === false;

          doc.setFontSize(8);
          doc.setTextColor(15, 23, 42);
          doc.setFont('helvetica', 'normal');
          doc.text(item.label, margin + 4, ry);

          if (isRisk) {
            doc.setTextColor(185, 28, 28);
            doc.setFont('helvetica', 'bold');
          } else {
            doc.setTextColor(22, 163, 74);
            doc.setFont('helvetica', 'normal');
          }
          doc.text(statusText, pageW - margin - 4, ry, { align: 'right' });
          ry += 7;
        });

        y += blockH - 6;

        // Note about landlord negligence
        const hasLandlordIssues = ra.bond_lodged === false || ra.condition_report_received === false;
        if (hasLandlordIssues) {
          doc.setFontSize(7);
          doc.setFont('helvetica', 'italic');
          doc.setTextColor(185, 28, 28);
          const noteLines = doc.splitTextToSize(
            'Note: The above assessment indicates potential non-compliance by the landlord/agent with standard tenancy obligations. This may establish a pattern of negligence relevant to the tribunal.',
            contentW
          );
          doc.text(noteLines, margin, y);
          y += noteLines.length * 4 + 4;
        }
        y += 4;
      }

      // ── Evidence index ──
      const caseEvidence = c.vault_item_ids
        .map(eid => evidence.find(e => e.id === eid))
        .filter(Boolean) as Evidence[];

      const isImageFile = (ft: string) => ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'].some(t => ft.toLowerCase().startsWith(t)) || /\.(png|jpg|jpeg|gif|webp)$/i.test(ft);
      const isAudioVideo = (ft: string) => ['audio/', 'video/'].some(t => ft.toLowerCase().startsWith(t)) || /\.(mp3|mp4|wav|m4a|ogg|webm|mov|avi)$/i.test(ft);

      if (caseEvidence.length > 0) {
        addPageIfNeeded(12 + caseEvidence.length * 8);
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text(`EVIDENCE INDEX (${caseEvidence.length} items)`, margin, y);
        y += 6;

        caseEvidence.forEach((item, i) => {
          addPageIfNeeded(10);
          const fileType = item.file_type || item.filename;

          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(15, 23, 42);
          doc.text(`Exhibit ${i + 1}: ${item.filename}`, margin + 2, y);
          y += 4;

          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');

          if (isImageFile(fileType)) {
            doc.setTextColor(30, 64, 175);
            doc.text('[Photo — see attached page below]', margin + 6, y);
          } else if (isAudioVideo(fileType)) {
            doc.setTextColor(234, 88, 12);
            if (item.file_url) {
              doc.textWithLink('[Audio/Video — click to download file]', margin + 6, y, { url: item.file_url });
            } else {
              doc.text('[Audio/Video file]', margin + 6, y);
            }
          } else {
            doc.setTextColor(100, 116, 139);
            if (item.file_url) {
              doc.textWithLink('[Document — click to download]', margin + 6, y, { url: item.file_url });
            } else {
              doc.text('[Document file]', margin + 6, y);
            }
          }
          y += 4;

          if (item.notes) {
            doc.setFontSize(7.5);
            doc.setTextColor(148, 163, 184);
            const noteLines = doc.splitTextToSize(`Note: ${item.notes}`, contentW - 10);
            doc.text(noteLines, margin + 6, y);
            y += noteLines.length * 3.5;
          }
          y += 4;
        });
        y += 2;
      }

      // ── Case Notes ──
      if (c.case_notes) {
        addPageIfNeeded(20);
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text('CASE NOTES', margin, y);
        y += 5;
        doc.setFontSize(9);
        doc.setTextColor(15, 23, 42);
        doc.setFont('helvetica', 'normal');
        const noteLines = doc.splitTextToSize(c.case_notes, contentW);
        noteLines.forEach((line: string) => {
          addPageIfNeeded(6);
          doc.text(line, margin, y);
          y += 5;
        });
        y += 6;
      }

      // ── App Seal ──
      const disclaimerText = `Disclaimer: ${APP_CONFIG.displayName} is a documentation tool only. ${APP_CONFIG.displayName} is not responsible for verifying the accuracy, completeness, or authenticity of any information, evidence, records, or claims contained in this document. All content has been provided by the account holder listed above. This file is generated as-is and does not constitute legal advice.`;
      addPageIfNeeded(65);
      const sealY = y + 4;
      doc.setDrawColor(30, 64, 175);
      doc.setLineWidth(0.5);

      const sealAddr = profileAddress || fullAddress || 'Address not on file';
      const compiledLine = `Evidence, Records and Information provided by the owner of this file and account holder ${profileName || 'N/A'} (${profileEmail}) at ${sealAddr}`;
      const compiledLines = doc.splitTextToSize(compiledLine, contentW - 16);
      const disclaimerLines = doc.splitTextToSize(disclaimerText, contentW - 16);
      const sealBoxH = 14 + compiledLines.length * 4 + 6 + disclaimerLines.length * 3.5 + 8;

      doc.roundedRect(margin, sealY, contentW, sealBoxH, 2, 2, 'S');
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 64, 175);
      doc.text('INCIDENT DOSSIER', pageW / 2, sealY + 8, { align: 'center' });

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(`Compiled using ${APP_CONFIG.displayName} by What's On!`, pageW / 2, sealY + 14, { align: 'center' });

      let sealTextY = sealY + 20;
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);
      doc.text(compiledLines, margin + 8, sealTextY);
      sealTextY += compiledLines.length * 4 + 4;

      doc.setFontSize(6.5);
      doc.setTextColor(148, 163, 184);
      doc.text(disclaimerLines, margin + 8, sealTextY);

      // ── Photo Evidence Pages (each on a new page) ──
      const photoEvidence = caseEvidence.filter(item => isImageFile(item.file_type || item.filename) && item.file_url);
      for (let i = 0; i < photoEvidence.length; i++) {
        const item = photoEvidence[i];
        const globalIdx = caseEvidence.indexOf(item);
        doc.addPage();
        y = margin;

        doc.setFillColor(248, 250, 252);
        doc.rect(0, 0, pageW, 18, 'F');
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 64, 175);
        doc.text(`Exhibit ${globalIdx + 1}`, margin, 12);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(item.filename, pageW - margin, 12, { align: 'right' });

        y = 24;
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text(`Photo Evidence — ${c.case_number}`, margin, y);
        y += 6;
        if (item.notes) {
          doc.setFontSize(7.5);
          doc.setTextColor(148, 163, 184);
          const nLines = doc.splitTextToSize(`Note: ${item.notes}`, contentW);
          doc.text(nLines, margin, y);
          y += nLines.length * 3.5 + 4;
        }

        try {
          const imgData = await loadImageAsDataUrl(item.file_url);
          if (imgData) {
            const maxW = contentW;
            const maxH = pageH - y - 30;
            const tempImg = new Image();
            await new Promise<void>((res) => {
              tempImg.onload = () => res();
              tempImg.onerror = () => res();
              tempImg.src = item.file_url;
            });
            const aspect = tempImg.naturalWidth / (tempImg.naturalHeight || 1);
            let imgW = maxW;
            let imgH = imgW / aspect;
            if (imgH > maxH) {
              imgH = maxH;
              imgW = imgH * aspect;
            }
            const xOffset = margin + (contentW - imgW) / 2;
            doc.addImage(imgData, 'PNG', xOffset, y, imgW, imgH);
          } else {
            doc.setFontSize(9);
            doc.setTextColor(185, 28, 28);
            doc.text('[Image could not be loaded — access file directly via Evidence Vault]', margin, y + 10);
          }
        } catch {
          doc.setFontSize(9);
          doc.setTextColor(185, 28, 28);
          doc.text('[Image could not be loaded]', margin, y + 10);
        }
      }

      // ── Footer on every page ──
      const totalPages = doc.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text(`${APP_CONFIG.displayName} • Confidential`, margin, pageH - 10);
        doc.text(`Page ${p} of ${totalPages}`, pageW - margin, pageH - 10, { align: 'right' });
      }

      const fileName = `${c.case_number}_Dossier.pdf`;
      const blob = doc.output('blob');

      await downloadSetuPdf({
        blob,
        fileName,
        title: `${APP_CONFIG.displayName} Incident Dossier`,
      });
    } catch (err) {
      console.error('GHAR PDF generation error:', err);
    } finally {
      setPdfGenerating(false);
    }
  }, [evidence, email, rentalHistory]);

  const handleResourcesSectionChange = (section: LegalSection) => {
    if (!useHoodieResourcesShell) return;
    setResourcesSectionState(section);
  };

  const handlePrepareTabChange = (prepareTab: PrepareTab) => {
    if (!useHoodieResourcesShell) return;
    setResourcesSectionState('prepare');
    setPrepareTabState(prepareTab);
    setPrepareSubtitle(getPrepareSubtitleLabel(prepareTab, isSetuChina));
  };

  const handleJobsTabChange = (jobsTab: JobsTab) => {
    if (!useHoodieResourcesShell) return;
    setResourcesSectionState('jobs');
    setJobsTabState(jobsTab);
  };

  const hoodieJobsSegmentedControlClass = 'grid grid-cols-3 gap-2 rounded-[24px] border border-[#E2E8F0] bg-[#F8FAFC] p-1 shadow-sm';
  const hoodiePrepareSegmentedControlClass = hasArrivalChecklist
    ? 'grid grid-cols-2 gap-2 rounded-[24px] border border-[#E2E8F0] bg-[#F8FAFC] p-1 shadow-sm min-[560px]:grid-cols-4'
    : 'grid grid-cols-3 gap-2 rounded-[24px] border border-[#E2E8F0] bg-[#F8FAFC] p-1 shadow-sm';
  const hoodieResourcesSegmentedControlClass = 'grid grid-cols-3 gap-2 rounded-[24px] border border-[#E2E8F0] bg-[#F8FAFC] p-1 shadow-sm';
  const getHoodieSegmentButtonClass = (active: boolean) => (
    `min-w-0 rounded-[18px] px-2 py-3 text-center text-sm font-semibold leading-tight transition cursor-pointer ${
      active
        ? 'bg-white text-[#0F172A] shadow-[0_8px_18px_rgba(15,23,42,0.08)]'
        : 'text-[#64748B] hover:text-[#0F172A]'
    }`
  );

  const dashboardSubtitle = view === 'builder'
    ? (editingCaseId ? 'Edit Case' : 'Case Builder')
    : view === 'detail'
      ? selectedCase?.case_number
      : useHoodieResourcesShell
        ? activeSection === 'prepare'
          ? (prepareSubtitle || getPrepareSubtitleLabel(activePrepareTab, isSetuChina))
          : activeSection === 'jobs'
            ? getJobsSubtitleLabel(activeJobsTab, isSetuChina)
            : 'Legal'
        : isHoodieExperience
          ? 'Legal'
          : 'Case Engine';

  const openLegalAssistant = useCallback(() => {
    if (isHoodieExperience) {
      navigate('/arrival', {
        state: { hoodienieLandingToken: Date.now() },
      });
      return;
    }
    setIsTriageOpen(true);
  }, [isHoodieExperience, navigate]);

  const legalDashboardContent = (
    <>
      <div className="px-4 py-4 border-b border-[#E2E8F0]">
        <button
          onClick={openLegalAssistant}
          className={`w-full relative overflow-hidden rounded-xl p-4 shadow-sm transition-transform active:scale-[0.98] cursor-pointer ${
            isHoodieExperience
              ? 'border border-[#FDE68A] bg-[linear-gradient(135deg,#111827_0%,#0F172A_58%,#453105_100%)]'
              : 'bg-gradient-to-r from-[#1E40AF] to-[#3B82F6] flex flex-col items-center justify-center gap-2'
          }`}
        >
          {isHoodieExperience ? (
            <>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.24),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.08),transparent_38%)]" />
              <div className="relative z-10 flex items-center gap-3 text-left">
                <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#FACC15] shadow-[0_12px_30px_rgba(250,204,21,0.28)]">
                  <img
                    src={hoodieniMascotUrl}
                    alt={APP_CONFIG.assistantName}
                    className="h-11 w-11 object-contain drop-shadow-[0_10px_20px_rgba(15,23,42,0.18)]"
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#FCD34D]">Legal guide</p>
                  <h3 className="mt-1 text-base font-bold tracking-wide text-white">{legalAssistantTitle}</h3>
                  <p className="mt-1 text-[11px] leading-relaxed text-white/75">{legalAssistantBody}</p>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay" />
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mb-1 relative z-10">
                <MessageSquare className="w-5 h-5 text-white" strokeWidth={2} />
              </div>
              <div className="text-center relative z-10">
                <h3 className="text-white text-sm font-bold tracking-wide">{legalAssistantTitle}</h3>
                <p className="text-white/80 text-[10px] font-medium mt-0.5">{legalAssistantBody}</p>
              </div>
            </>
          )}
        </button>
      </div>

      <div className="px-4 py-4 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center justify-around">
        <div className="text-center">
          <p className="text-3xl text-[#B91C1C]" style={{ fontWeight: 100 }}>{scamCount}</p>
          <p className="text-[9px] tracking-wide uppercase text-[#94A3B8] font-medium">Reported Scams</p>
        </div>
        <div className="text-[#E2E8F0] text-2xl font-thin">|</div>
        <div className="text-center">
          <p className="text-3xl text-[#EA580C]" style={{ fontWeight: 100 }}>{maintenanceCount}</p>
          <p className="text-[9px] tracking-wide uppercase text-[#94A3B8] font-medium">Maintenance</p>
        </div>
        <div className="text-[#E2E8F0] text-2xl font-thin">|</div>
        <div className="text-center">
          <p className="text-3xl text-[#1E40AF]" style={{ fontWeight: 100 }}>{cases.length}</p>
          <p className="text-[9px] tracking-wide uppercase text-[#94A3B8] font-medium">Disputes Raised</p>
        </div>
      </div>

      <div className="px-4 pt-4">
        <button
          type="button"
          onClick={() => navigate(FREE_ELECTRICITY_GUIDE_ROUTE)}
          className="flex w-full items-center justify-between gap-3 rounded-xl border border-[#DBEAFE] bg-white p-3.5 text-left shadow-sm transition-colors hover:bg-[#EFF6FF]"
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#EFF6FF] text-[#1D4ED8]">
              <Zap className="h-5 w-5" strokeWidth={1.8} />
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-bold text-[#0F172A]">Free electricity guide</span>
              <span className="mt-1 block text-[10px] leading-4 text-[#64748B]">
                2026 city windows, smart meter rules, and plan watch-outs.
              </span>
            </span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-[#1D4ED8]" strokeWidth={1.8} />
        </button>
      </div>

      <div className="px-4 pt-4">
        <div className="border border-dashed border-[#1E40AF]/30 bg-[#F8FAFC] rounded-xl p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-[#1E40AF]/10 rounded-lg flex items-center justify-center">
              <Shield className="w-4.5 h-4.5 text-[#1E40AF]" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-xs text-[#0F172A] font-bold">{legalConsultTitle}</p>
              <p className="text-[10px] text-[#64748B] font-normal">{legalConsultBody}</p>
            </div>
          </div>
          <span className="text-[9px] tracking-wider uppercase text-[#1E40AF] bg-[#1E40AF]/10 px-2.5 py-1 rounded-full font-semibold whitespace-nowrap">
            Coming Soon
          </span>
        </div>
      </div>

      {userStateResource && (
        <div className="px-4 pt-4">
          <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2.5">
              <ShieldCheck className="w-5 h-5 text-[#1E40AF]" strokeWidth={1.5} />
              <div>
                <p className="text-xs text-[#0F172A] font-bold">Know Your Rights: <span className="text-[#1E40AF]">{userStateResource.name}</span></p>
                <p className="text-[9px] tracking-wide uppercase text-[#64748B] font-medium mt-0.5">Detected from your profile</p>
              </div>
            </div>
            <div className="space-y-2">
              <a
                href={userStateResource.tribunalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 p-2.5 bg-white/70 rounded-lg hover:bg-white transition-colors group"
              >
                <Landmark className="w-4 h-4 text-[#1E40AF] shrink-0" strokeWidth={1.5} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-[#0F172A] font-medium">{userStateResource.tribunalAbbrev}</p>
                  <p className="text-[10px] text-[#64748B] font-normal truncate">{userStateResource.tribunal}</p>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-[#94A3B8] group-hover:text-[#1E40AF] transition-colors shrink-0" strokeWidth={1.5} />
              </a>
              <a
                href={userStateResource.advocacyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 p-2.5 bg-white/70 rounded-lg hover:bg-white transition-colors group"
              >
                <Scale className="w-4 h-4 text-[#16A34A] shrink-0" strokeWidth={1.5} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-[#0F172A] font-medium">{userStateResource.advocacy}</p>
                  <p className="text-[10px] text-[#64748B] font-normal">Free tenancy advice & advocacy</p>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-[#94A3B8] group-hover:text-[#16A34A] transition-colors shrink-0" strokeWidth={1.5} />
              </a>
            </div>
          </div>
        </div>
      )}

      <div className="px-4 pt-4">
        <button
          onClick={() => setView('builder')}
          className="w-full py-3.5 bg-[#0F172A] text-white rounded-xl flex items-center justify-center gap-2 hover:bg-[#1E293B] transition-all shadow-lg cursor-pointer"
        >
          <Plus className="w-4 h-4" strokeWidth={2} />
          <span className="text-xs tracking-wide font-medium">Prepare for a Formal Dispute</span>
        </button>
      </div>

      <div className="px-4 py-4 space-y-3">
        {cases.length === 0 ? (
          <div className="text-center py-10">
            <Scale className="w-10 h-10 text-[#E2E8F0] mx-auto mb-3" strokeWidth={1.5} />
            <p className="text-sm text-[#94A3B8] font-normal">No cases yet</p>
            <p className="text-xs text-[#CBD5E1] mt-1 font-normal">
              Start a case to compile evidence into an Incident Dossier
            </p>
          </div>
        ) : (
          <>
            <p className="text-[10px] tracking-wide uppercase text-[#94A3B8] font-medium">
              All Cases ({cases.length})
            </p>
            {[...cases].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map(c => (
              <div
                key={c.id}
                className="w-full text-left border border-[#E2E8F0] rounded-xl p-3.5 hover:shadow-sm hover:border-[#CBD5E1] transition-all relative"
              >
                {showDeleteConfirm === c.id && (
                  <div className="absolute inset-0 bg-white/95 rounded-xl z-10 flex flex-col items-center justify-center gap-3 p-4">
                    <AlertTriangle className="w-6 h-6 text-[#B91C1C]" strokeWidth={1.5} />
                    <p className="text-xs text-[#0F172A] text-center font-medium">Delete this case permanently?</p>
                    <div className="flex gap-2 w-full">
                      <button
                        onClick={() => setShowDeleteConfirm(null)}
                        className="flex-1 py-2 border border-[#E2E8F0] rounded-xl text-xs text-[#64748B] hover:bg-[#F8FAFC] transition-colors cursor-pointer font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => { handleDeleteCase(c.id); setShowDeleteConfirm(null); }}
                        className="flex-1 py-2 bg-[#B91C1C] text-white rounded-xl text-xs hover:bg-[#991B1B] transition-colors cursor-pointer font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => { setSelectedCase(c); setView('detail'); }}
                  className="w-full text-left cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-[#0F172A] font-bold">{c.case_number}</span>
                  </div>
                  <p className="text-sm text-[#0F172A] font-normal truncate">{c.case_title}</p>
                  <div className="flex items-center gap-3 mt-2 text-[9px] text-[#94A3B8] tracking-wide font-medium">
                    {c.associated_listing_public_id && (
                      <span>Listing: {c.associated_listing_public_id}</span>
                    )}
                    <span>{c.vault_item_ids.length} evidence items</span>
                    <span className="ml-auto">{format(new Date(c.created_at), 'dd MMM yyyy')}</span>
                  </div>
                </button>

                <div className="flex items-center gap-1 mt-2.5 pt-2.5 border-t border-[#F1F5F9]">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleEditCase(c); }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 text-[10px] tracking-wide text-[#64748B] hover:text-[#1E40AF] hover:bg-[#1E40AF]/5 rounded-lg transition-all cursor-pointer font-medium"
                  >
                    <Pencil className="w-3 h-3" strokeWidth={1.5} />
                    Edit
                  </button>
                  <div className="w-px h-4 bg-[#E2E8F0]" />
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(c.id); }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 text-[10px] tracking-wide text-[#64748B] hover:text-[#B91C1C] hover:bg-[#B91C1C]/5 rounded-lg transition-all cursor-pointer font-medium"
                  >
                    <Trash2 className="w-3 h-3" strokeWidth={1.5} />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      <div className="px-4 py-4 border-t border-[#E2E8F0]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#1E40AF]" strokeWidth={1.5} />
            <span className="text-[10px] tracking-wide uppercase text-[#0F172A] font-bold">Help & Advocacy</span>
          </div>
          <button
            onClick={() => setShowAllStates(!showAllStates)}
            className="text-[10px] tracking-wide text-[#1E40AF] hover:text-[#1E3A8A] cursor-pointer font-medium"
          >
            {showAllStates ? 'Show My State' : 'All States'}
          </button>
        </div>

        <div className="space-y-2.5">
          {(showAllStates ? allStates : userStateResource ? [userStateResource] : allStates.slice(0, 3)).map(res => (
            <div key={res.code} className="bg-[#EFF6FF] border border-[#DBEAFE] rounded-xl overflow-hidden">
              <div className="px-3.5 py-2.5 flex items-center gap-2 border-b border-[#DBEAFE]">
                <Gavel className="w-4 h-4 text-[#1E40AF]" strokeWidth={1.5} />
                <span className="text-xs text-[#0F172A] font-bold">{res.name}</span>
                <span className="text-[8px] tracking-wider uppercase text-[#1E40AF] bg-[#1E40AF]/10 px-1.5 py-0.5 rounded font-medium ml-auto">{res.code}</span>
              </div>
              <div className="p-2 space-y-1">
                <a
                  href={res.tenancyActUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-white/60 transition-colors group"
                >
                  <BookOpen className="w-3.5 h-3.5 text-[#64748B] shrink-0" strokeWidth={1.5} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-[#0F172A] font-medium truncate">{res.tenancyActLabel}</p>
                    <p className="text-[9px] text-[#94A3B8] font-normal">Tenancy legislation</p>
                  </div>
                  <ExternalLink className="w-3 h-3 text-[#CBD5E1] group-hover:text-[#1E40AF] transition-colors shrink-0" strokeWidth={1.5} />
                </a>
                <a
                  href={res.tribunalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-white/60 transition-colors group"
                >
                  <Landmark className="w-3.5 h-3.5 text-[#64748B] shrink-0" strokeWidth={1.5} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-[#0F172A] font-medium truncate">{res.tribunalAbbrev} — {res.tribunal}</p>
                    <p className="text-[9px] text-[#94A3B8] font-normal">File disputes & applications</p>
                  </div>
                  <ExternalLink className="w-3 h-3 text-[#CBD5E1] group-hover:text-[#1E40AF] transition-colors shrink-0" strokeWidth={1.5} />
                </a>
                <a
                  href={res.bondDisputeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-white/60 transition-colors group"
                >
                  <FileText className="w-3.5 h-3.5 text-[#64748B] shrink-0" strokeWidth={1.5} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-[#0F172A] font-medium truncate">{res.bondDisputeLabel}</p>
                    <p className="text-[9px] text-[#94A3B8] font-normal">Bond recovery & refund forms</p>
                  </div>
                  <ExternalLink className="w-3 h-3 text-[#CBD5E1] group-hover:text-[#1E40AF] transition-colors shrink-0" strokeWidth={1.5} />
                </a>
                <a
                  href={res.advocacyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-white/60 transition-colors group"
                >
                  <Scale className="w-3.5 h-3.5 text-[#16A34A] shrink-0" strokeWidth={1.5} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-[#0F172A] font-medium truncate">{res.advocacy}</p>
                    <p className="text-[9px] text-[#94A3B8] font-normal">Book a free advocacy session</p>
                  </div>
                  <ExternalLink className="w-3 h-3 text-[#CBD5E1] group-hover:text-[#16A34A] transition-colors shrink-0" strokeWidth={1.5} />
                </a>
              </div>
            </div>
          ))}
        </div>

        {!showAllStates && !userStateResource && (
          <button
            onClick={() => setShowAllStates(true)}
            className="w-full mt-3 py-2.5 text-xs text-[#1E40AF] bg-[#EFF6FF] border border-[#DBEAFE] rounded-xl flex items-center justify-center gap-2 hover:bg-[#DBEAFE] transition-colors cursor-pointer font-medium"
          >
            <ChevronRight className="w-3.5 h-3.5" strokeWidth={2} />
            <span>View All 8 States & Territories</span>
          </button>
        )}

        <p className="text-[9px] tracking-wide uppercase text-[#94A3B8] text-center mt-3 font-medium">
          {APP_CONFIG.displayName} Tenant Rights Directory — 2026 Compilation
        </p>
      </div>
    </>
  );

  const prepareDashboardContent = (
    <>
      <div className="relative z-10 px-4 pb-2 pt-4">
        <div className={hoodiePrepareSegmentedControlClass}>
          {hasArrivalChecklist ? (
            <button
              type="button"
              onClick={() => handlePrepareTabChange('checklist')}
              className={getHoodieSegmentButtonClass(activePrepareTab === 'checklist')}
            >
              {isSetuIndia ? 'Settle Checklist' : 'Checklist'}
              {isSetuChina ? <span className="block text-xs font-semibold">清单</span> : <span className="block text-xs font-semibold">First week</span>}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => handlePrepareTabChange('application-kit')}
            className={getHoodieSegmentButtonClass(activePrepareTab === 'application-kit')}
          >
            Application Kit
            {isSetuChina ? <span className="block text-xs font-semibold">申请材料</span> : null}
          </button>
          <button
            type="button"
            onClick={() => handlePrepareTabChange('scam-checker')}
            className={getHoodieSegmentButtonClass(activePrepareTab === 'scam-checker')}
          >
            Scam Checker
            {isSetuChina ? <span className="block text-xs font-semibold">防骗检查</span> : null}
          </button>
          <button
            type="button"
            onClick={() => handlePrepareTabChange('nsw-rent-check')}
            className={getHoodieSegmentButtonClass(activePrepareTab === 'nsw-rent-check')}
          >
            NSW Rent Check
            {isSetuChina ? <span className="block text-xs font-semibold">租金检查</span> : null}
          </button>
        </div>
      </div>

      {hasArrivalChecklist && activePrepareTab === 'checklist' ? (
        isJomSettle ? <JomSettleChecklistPage embedded /> : isSetuIndia ? <SetuIndiaChecklistPage embedded /> : <SetuChinaChecklistPage embedded />
      ) : activePrepareTab === 'application-kit' ? (
        <ApplicationKitTool
          evidence={evidence}
          rentalHistory={rentalHistory}
          profile={profileData}
          onFocusChange={(_active, subtitle = 'Application Kit') => {
            setPrepareSubtitle(subtitle);
          }}
        />
      ) : activePrepareTab === 'scam-checker' ? (
        <ScamCheckerTool
          evidence={evidence}
          onFocusChange={(_active, subtitle = 'Scam Checker') => {
            setPrepareSubtitle(subtitle);
          }}
        />
      ) : (
        <NswRentCheckTool
          onFocusChange={(_active, subtitle = 'NSW Rent Check') => {
            setPrepareSubtitle(subtitle);
          }}
        />
      )}
    </>
  );

  const jobsDashboardContent = (
    <>
      <div className="relative z-10 px-4 pb-2 pt-4">
        <div className={hoodieJobsSegmentedControlClass}>
          <button
            type="button"
            onClick={() => handleJobsTabChange('occupations')}
            className={getHoodieSegmentButtonClass(activeJobsTab === 'occupations')}
          >
            {isSetuChina ? (
              <span className="block text-[12px] leading-[1.15] sm:text-sm">
                Occupations <span className="block text-xs font-semibold">职业</span>
              </span>
            ) : 'Occupations'}
          </button>
          <button
            type="button"
            onClick={() => handleJobsTabChange('sponsor-companies')}
            className={getHoodieSegmentButtonClass(activeJobsTab === 'sponsor-companies')}
          >
            <span className="block text-[12px] leading-[1.15] sm:text-sm">
              {isSetuChina ? (
                <>
                  Sponsor Companies <span className="block text-xs font-semibold">担保公司</span>
                </>
              ) : 'Sponsor Companies List'}
            </span>
          </button>
          <button
            type="button"
            onClick={() => handleJobsTabChange('pr-points')}
            className={getHoodieSegmentButtonClass(activeJobsTab === 'pr-points')}
          >
            {isSetuChina ? (
              <span className="block text-[12px] leading-[1.15] sm:text-sm">
                PR Points <span className="block text-xs font-semibold">移民分数</span>
              </span>
            ) : 'PR Points'}
          </button>
        </div>
      </div>

      {activeJobsTab === 'occupations' ? (
        <OccupationsTool />
      ) : activeJobsTab === 'pr-points' ? (
        <PrPointsCalculatorTool />
      ) : (
        <SponsorCompaniesDirectory />
      )}
    </>
  );

  return (
    <div className="size-full min-h-0 overflow-hidden bg-white flex flex-col" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div className="border-b border-[#E2E8F0] px-4 py-3 native-safe-area-top flex items-center justify-between">
        {view !== 'dashboard' ? (
          <button
            onClick={() => { setView('dashboard'); setSelectedCase(null); }}
            className="flex items-center gap-2 text-[#64748B] hover:text-[#0F172A] transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4 rotate-180" strokeWidth={1.5} />
            <span className="text-xs tracking-wide font-medium">Cases</span>
          </button>
        ) : (
          <div className="flex items-center gap-2">
            {useHoodieResourcesShell ? (
              <BookOpen className="w-5 h-5 text-[#1E40AF]" strokeWidth={1.5} />
            ) : (
              <Scale className="w-5 h-5 text-[#1E40AF]" strokeWidth={1.5} />
            )}
            <span className="text-xs tracking-wide text-[#0F172A] font-bold">{useHoodieResourcesShell ? (isSetuIndia ? 'Tasks' : 'Resources') : 'Legal Center'}</span>
          </div>
        )}
        <span className="text-xs tracking-wide text-[#64748B] font-medium">
          {dashboardSubtitle}
        </span>
        <HoodieHelpTrigger
          stepId="resources"
          title="Open resources onboarding video"
        />
      </div>

      {loading ? (
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <div className="w-8 h-8 border-2 border-[#1E40AF] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* ─── DASHBOARD VIEW ─────────────────────────────── */}
          {view === 'dashboard' && (
            <div
              className="relative isolate flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto bg-[#FCFDFE]"
              style={useHoodieResourcesShell ? { paddingBottom: `${HOODIE_FEATURED_NAV_GEOMETRY.overhangPx + 12}px` } : undefined}
            >
              {useHoodieResourcesShell && (
                <div className="relative z-20 px-4 pb-2 pt-4">
                  <div className={hoodieResourcesSegmentedControlClass}>
                    <button
                      type="button"
                      onClick={() => handleResourcesSectionChange('prepare')}
                      className={getHoodieSegmentButtonClass(activeSection === 'prepare')}
                    >
                      {isSetuChina ? (
                        <>
                          Prepare
                          <span className="block text-xs font-semibold">准备</span>
                        </>
                      ) : isSetuIndia ? 'Tasks' : 'Prepare'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleResourcesSectionChange('jobs')}
                      className={getHoodieSegmentButtonClass(activeSection === 'jobs')}
                    >
                      {isSetuChina ? (
                        <>
                          Jobs
                          <span className="block text-xs font-semibold">求职</span>
                        </>
                      ) : 'Jobs'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleResourcesSectionChange('legal')}
                      className={getHoodieSegmentButtonClass(activeSection === 'legal')}
                    >
                      {isSetuChina ? (
                        <>
                          Legal
                          <span className="block text-xs font-semibold">法律</span>
                        </>
                      ) : 'Legal'}
                    </button>
                  </div>
                </div>
              )}

              {!useHoodieResourcesShell
                ? legalDashboardContent
                : activeSection === 'prepare'
                  ? prepareDashboardContent
                  : activeSection === 'jobs'
                    ? jobsDashboardContent
                    : legalDashboardContent}
            </div>
          )}

          {/* ─── CASE BUILDER VIEW ──────────────────────────── */}
          {view === 'builder' && (
            <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
              <div className="text-center mb-2">
                <p className="text-xs text-[#64748B] font-normal">
                  {editingCaseId
                    ? 'Update the details of your Incident Dossier'
                    : `Compile vault evidence into an Incident Dossier with the ${APP_CONFIG.displayName} seal`}
                </p>
              </div>

              {/* Case Title */}
              <div>
                <label className={labelClass}>dispute Title *</label>
                <input
                  value={caseTitle}
                  onChange={e => { setCaseTitle(e.target.value); setBuildError(''); }}
                  placeholder="e.g. Bond deposit dispute at 42 Swanston St"
                  className={inputClass}
                />
              </div>

              {/* Associated Listing / Address */}
              <div className="relative">
                <label className={labelClass}>Associated Address</label>
                {selectedListing ? (
                  <div className="flex items-center gap-2 p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl">
                    <span
                      className="text-[8px] tracking-wider uppercase px-2 py-0.5 rounded-md text-white font-medium"
                      style={{ backgroundColor: categoryColors[selectedListing.category] }}
                    >
                      {categoryLabels[selectedListing.category]}
                    </span>
                    <span className="text-xs text-[#0F172A] font-bold">{selectedListing.listing_id_public}</span>
                    <span className="text-xs text-[#64748B] font-normal truncate flex-1">{selectedListing.address}</span>
                    <button
                      onClick={() => {
                        setSelectedListing(null);
                        setSelectedEvidence([]);
                        setShowEvidencePicker(false);
                      }}
                      className="text-[#94A3B8] hover:text-[#B91C1C] cursor-pointer"
                    >
                      <X className="w-4 h-4" strokeWidth={1.5} />
                    </button>
                  </div>
                ) : selectedRentalAddress ? (
                  <div className="flex items-center gap-2 p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl">
                    <Home className="w-3.5 h-3.5 text-[#16A34A] shrink-0" strokeWidth={1.5} />
                    <span className="text-[8px] tracking-wider uppercase px-2 py-0.5 rounded-md bg-[#16A34A] text-white font-medium">
                      Timeline
                    </span>
                    <span className="text-xs text-[#0F172A] font-normal truncate flex-1">
                      {selectedRentalAddress.display_address || selectedRentalAddress.address}
                      {selectedRentalAddress.unit_number ? ` (${selectedRentalAddress.unit_number})` : ''}
                    </span>
                    <button
                      onClick={() => {
                        setSelectedRentalAddress(null);
                        setSelectedEvidence([]);
                        setShowEvidencePicker(false);
                      }}
                      className="text-[#94A3B8] hover:text-[#B91C1C] cursor-pointer"
                    >
                      <X className="w-4 h-4" strokeWidth={1.5} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setShowEvidencePicker(false);
                      setShowListingPicker(prev => !prev);
                    }}
                    className="w-full text-left p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm text-[#94A3B8] hover:border-[#CBD5E1] transition-colors cursor-pointer font-normal"
                  >
                    Select an address from your timeline (optional)
                  </button>
                )}
                {showListingPicker && !selectedListing && !selectedRentalAddress && (
                  <div className="absolute z-50 mt-1 w-full bg-white border border-[#E2E8F0] rounded-xl shadow-xl max-h-80 overflow-hidden">
                    <div className="overflow-y-auto max-h-52">
                      {rentalHistory.length > 0 ? (
                        <>
                          <div className="px-4 py-1.5 bg-[#F8FAFC] border-b border-[#E2E8F0]">
                            <span className="text-[9px] tracking-wider uppercase text-[#94A3B8] font-medium">Timeline Addresses</span>
                          </div>
                          {rentalHistory.map(r => (
                            <button
                              key={`rental-${r.id}`}
                              onClick={() => {
                                setSelectedRentalAddress(r);
                                setSelectedEvidence([]);
                                setShowListingPicker(false);
                                setShowEvidencePicker(false);
                              }}
                              className="w-full text-left px-4 py-2.5 hover:bg-[#F8FAFC] transition-colors cursor-pointer flex items-center gap-2"
                            >
                              <Home className="w-3.5 h-3.5 text-[#16A34A] shrink-0" strokeWidth={1.5} />
                              <span className="text-xs text-[#0F172A] font-normal truncate flex-1">
                                {r.display_address || r.address}
                                {r.unit_number ? ` (${r.unit_number})` : ''}
                              </span>
                              <span className="text-[9px] text-[#94A3B8] shrink-0 font-medium">
                                {r.is_current ? 'Current' : r.state || ''}
                              </span>
                            </button>
                          ))}
                        </>
                      ) : (
                        <div className="text-center py-5 px-4">
                          <MapPin className="w-6 h-6 text-[#E2E8F0] mx-auto mb-2" strokeWidth={1.5} />
                          <p className="text-xs text-[#94A3B8] font-normal">
                            No addresses in your timeline yet
                          </p>
                        </div>
                      )}
                    </div>
                    {/* Add Address button — navigates to Profile Timeline */}
                    <div className="border-t border-[#E2E8F0] p-2">
                      <button
                        onClick={() => {
                          setShowListingPicker(false);
                          navigate('/profile?action=add-address');
                        }}
                        className="w-full py-2.5 text-xs text-[#1E40AF] bg-[#1E40AF]/5 border border-[#1E40AF]/20 rounded-xl flex items-center justify-center gap-2 hover:bg-[#1E40AF]/10 transition-colors cursor-pointer font-medium"
                      >
                        <Plus className="w-3.5 h-3.5" strokeWidth={2} />
                        <span>Add a New Address</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Evidence Selection */}
              <div className="relative">
                <label className={labelClass}>
                  Select Evidence ({selectedEvidence.length} selected)
                </label>
                <button
                  onClick={() => {
                    setShowListingPicker(false);
                    setShowEvidencePicker(prev => !prev);
                  }}
                  className={`w-full text-left p-3 bg-[#F8FAFC] border rounded-xl transition-colors cursor-pointer ${
                    showEvidencePicker ? 'border-[#CBD5E1]' : 'border-[#E2E8F0] hover:border-[#CBD5E1]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <FolderOpen className="w-4 h-4 text-[#94A3B8] shrink-0" strokeWidth={1.5} />
                    <span className={`text-sm truncate flex-1 font-normal ${selectedEvidenceItems.length > 0 ? 'text-[#0F172A]' : 'text-[#94A3B8]'}`}>
                      {selectedEvidenceSummary}
                    </span>
                    <ChevronRight
                      className={`w-4 h-4 text-[#94A3B8] shrink-0 transition-transform ${showEvidencePicker ? 'rotate-90' : ''}`}
                      strokeWidth={1.5}
                    />
                  </div>
                </button>

                {showEvidencePicker && (
                  <div className="absolute z-50 mt-1 w-full bg-white border border-[#E2E8F0] rounded-xl shadow-xl max-h-96 overflow-hidden">
                    <div className="overflow-y-auto max-h-72">
                      {evidenceSections.length > 0 ? (
                        evidenceSections.map(section => (
                          <div key={section.key} className="border-b border-[#E2E8F0] last:border-b-0">
                            <div className="px-4 py-1.5 bg-[#F8FAFC]">
                              <span className="text-[9px] tracking-wider uppercase text-[#94A3B8] font-medium">
                                {section.label}
                              </span>
                            </div>
                            {section.items.map(item => {
                              const isSelected = selectedEvidence.includes(item.id);
                              return (
                                <button
                                  key={item.id}
                                  onClick={() => toggleEvidence(item.id)}
                                  className="w-full text-left px-4 py-2.5 hover:bg-[#F8FAFC] transition-colors cursor-pointer flex items-center gap-3"
                                >
                                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                                    isSelected ? 'bg-[#1E40AF] border-[#1E40AF]' : 'border-[#CBD5E1]'
                                  }`}>
                                    {isSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs text-[#0F172A] truncate font-normal">{item.filename}</p>
                                    {(item.notes || item.external_link) && (
                                      <p className="text-[10px] text-[#94A3B8] truncate font-normal">
                                        {item.notes || item.external_link}
                                      </p>
                                    )}
                                  </div>
                                  <span className="text-[9px] text-[#94A3B8] shrink-0 font-medium">
                                    {format(new Date(item.created_at), 'dd MMM')}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        ))
                      ) : (
                        <div className="py-5 px-4 text-center">
                          <FolderOpen className="w-8 h-8 text-[#E2E8F0] mx-auto mb-2" strokeWidth={1.5} />
                          <p className="text-xs text-[#94A3B8] font-normal">No evidence items available</p>
                          <p className="text-[10px] text-[#CBD5E1] mt-0.5 font-normal">Add evidence in your Profile first</p>
                        </div>
                      )}
                    </div>
                    <div className="border-t border-[#E2E8F0] p-2">
                      <button
                        onClick={() => {
                          setShowEvidencePicker(false);
                          navigate('/profile?action=add-evidence');
                        }}
                        className="w-full py-2.5 text-xs text-[#1E40AF] bg-[#1E40AF]/5 border border-[#1E40AF]/20 rounded-xl flex items-center justify-center gap-2 hover:bg-[#1E40AF]/10 transition-colors cursor-pointer font-medium"
                      >
                        <Plus className="w-3.5 h-3.5" strokeWidth={2} />
                        <span>Add Evidence</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Case Notes */}
              <div>
                <label className={labelClass}>Case Notes</label>
                <textarea
                  value={caseNotes}
                  onChange={e => setCaseNotes(e.target.value)}
                  placeholder="Additional context for this case..."
                  rows={3}
                  className={`${inputClass} resize-none`}
                />
              </div>

              {buildError && <p className="text-xs text-[#B91C1C] font-normal">{buildError}</p>}

              {/* Dossier Submission Notice */}
              {!editingCaseId && userStateResource && (
                <div className="bg-[#EFF6FF] border border-[#DBEAFE] rounded-xl p-3 flex items-start gap-2.5">
                  <Gavel className="w-4 h-4 text-[#1E40AF] shrink-0 mt-0.5" strokeWidth={1.5} />
                  <div>
                    <p className="text-[11px] text-[#0F172A] font-medium leading-relaxed">
                      {APP_CONFIG.displayName} will generate your dossier. You can submit this PDF directly to <span className="font-bold text-[#1E40AF]">{userStateResource.tribunalAbbrev}</span> as supporting evidence.
                    </p>
                    <a
                      href={userStateResource.tribunalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-1.5 text-[10px] text-[#1E40AF] hover:text-[#1E3A8A] font-medium transition-colors"
                    >
                      Visit {userStateResource.tribunalAbbrev}
                      <ExternalLink className="w-3 h-3" strokeWidth={1.5} />
                    </a>
                  </div>
                </div>
              )}

              {/* Build Button */}
              <button
                onClick={handleBuildCase}
                disabled={building}
                className="w-full py-3.5 bg-[#EE811A] text-white rounded-xl flex items-center justify-center gap-2 hover:bg-[#D97316] transition-all shadow-lg shadow-[#EE811A]/20 cursor-pointer disabled:opacity-50"
              >
                <Shield className="w-4 h-4" strokeWidth={2} />
                <span className="text-xs tracking-wide font-medium">
                  {building
                    ? (editingCaseId ? 'Updating Dossier...' : 'Compiling Dossier...')
                    : (editingCaseId ? 'Update Incident Dossier' : 'Compile Incident Dossier')}
                </span>
              </button>
              
            </div>
          )}

          {/* ─── CASE DETAIL VIEW ───────────────────���───────── */}
          {view === 'detail' && selectedCase && (
            <div className="flex-1 min-h-0 overflow-y-auto">
              {/* Case Header */}
              <div className="px-4 py-5 border-b border-[#E2E8F0]">
                {selectedCase.associated_listing_public_id && (
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[9px] tracking-wide uppercase text-[#94A3B8] font-medium">
                      Listing: {selectedCase.associated_listing_public_id}
                    </span>
                  </div>
                )}
                <h2 className="text-lg text-[#0F172A] font-bold">{selectedCase.case_number}</h2>
                <p className="text-sm text-[#64748B] font-normal mt-1">{selectedCase.case_title}</p>
                <div className="flex items-center gap-2 mt-2 text-[9px] text-[#94A3B8] tracking-wide font-medium">
                  <Clock className="w-3 h-3" strokeWidth={1.5} />
                  <span>Filed {format(new Date(selectedCase.created_at), 'dd MMM yyyy')}</span>
                  {selectedCase.updated_at !== selectedCase.created_at && (
                    <span>— Updated {format(new Date(selectedCase.updated_at), 'dd MMM yyyy')}</span>
                  )}
                </div>
              </div>

              {/* Dossier Content */}
              <div className="px-4 py-4 space-y-4">
                {/* Applicable Law */}
                <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4">
                  <p className="text-[9px] tracking-wide uppercase text-[#94A3B8] mb-1 font-medium">Applicable Law</p>
                  <p className="text-sm text-[#0F172A] font-normal">
                    {selectedCase.applicable_law || 'Residential Tenancies Act 2026 (amended)'}
                  </p>
                </div>

                {/* Evidence Attached */}
                <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4">
                  <p className="text-[9px] tracking-wide uppercase text-[#94A3B8] mb-2 font-medium">
                    Evidence Attached ({selectedCase.vault_item_ids.length})
                  </p>
                  {selectedCase.vault_item_ids.length === 0 ? (
                    <p className="text-xs text-[#CBD5E1] font-normal">No evidence items attached</p>
                  ) : (
                    <div className="space-y-1.5">
                      {selectedCase.vault_item_ids.map(eid => {
                        const item = evidence.find(e => e.id === eid);
                        if (!item) return null;
                        return (
                          <div key={eid} className="flex items-center gap-2 text-xs text-[#0F172A]">
                            <FileText className="w-3.5 h-3.5 text-[#64748B] shrink-0" strokeWidth={1.5} />
                            <span className="font-normal truncate flex-1">{item.filename}</span>
                            {item.file_url && (
                              <a
                                href={item.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                download={item.filename}
                                className="shrink-0 p-1 rounded-md text-[#1E40AF] hover:bg-[#1E40AF]/10 transition-colors"
                                title="Download"
                              >
                                <Download className="w-3.5 h-3.5" strokeWidth={1.5} />
                              </a>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Case Notes */}
                {selectedCase.case_notes && (
                  <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4">
                    <p className="text-[9px] tracking-wide uppercase text-[#94A3B8] mb-1 font-medium">Case Notes</p>
                    <p className="text-sm text-[#0F172A] font-normal">{selectedCase.case_notes}</p>
                  </div>
                )}



                {/* App Seal */}
                <div className="border border-[#1E40AF]/20 rounded-xl p-5 text-center bg-[#1E40AF]/3 mt-4">
                  <Shield className="w-10 h-10 text-[#1E40AF] mx-auto mb-2" strokeWidth={1.5} />
                  <p className="text-[10px] tracking-[0.15em] uppercase text-[#1E40AF] font-medium">
                    Incident Dossier
                  </p>
                  <p className="text-[9px] text-[#64748B] mt-1 font-normal">
                    Compiled using {APP_CONFIG.displayName} by What's On!
                  </p>
                  <p className="text-[8px] text-[#94A3B8] mt-1 font-normal leading-relaxed px-2">
                    Evidence, Records and Information provided by the owner of this file and account holder.
                  </p>
                </div>

                {/* Generate PDF */}
                <button
                  onClick={() => generateDossierPdf(selectedCase)}
                  disabled={pdfGenerating}
                  className="w-full py-3.5 bg-[#0F172A] text-white rounded-xl flex items-center justify-center gap-2 hover:bg-[#1E293B] transition-all shadow-lg cursor-pointer disabled:opacity-60 disabled:cursor-wait"
                >
                  {pdfGenerating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span className="text-xs tracking-wide font-medium">Compiling Dossier…</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" strokeWidth={1.5} />
                      <span className="text-xs tracking-wide font-medium">Download Dossier PDF</span>
                    </>
                  )}
                </button>
                <p className="text-[9px] tracking-wide uppercase text-[#94A3B8] text-center font-medium">
                  Includes Timestamps • Evidence • Legal Framework • {APP_CONFIG.displayName} Seal
                </p>

                {/* Tribunal Submission Guide */}
                {userStateResource && (
                  <div className="bg-[#EFF6FF] border border-[#DBEAFE] rounded-xl p-3.5">
                    <div className="flex items-center gap-2 mb-2">
                      <Gavel className="w-4 h-4 text-[#1E40AF]" strokeWidth={1.5} />
                      <p className="text-[10px] tracking-wide uppercase text-[#1E40AF] font-bold">Submit to {userStateResource.tribunalAbbrev}</p>
                    </div>
                    <p className="text-[11px] text-[#0F172A] font-normal leading-relaxed mb-2">
                      This dossier can be submitted directly to <span className="font-bold">{userStateResource.tribunal}</span> as supporting evidence for your tenancy dispute.
                    </p>
                    <div className="flex gap-2">
                      <a
                        href={userStateResource.tribunalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-2 bg-[#1E40AF] text-white rounded-lg text-[10px] tracking-wide flex items-center justify-center gap-1.5 hover:bg-[#1E3A8A] transition-colors font-medium"
                      >
                        <Landmark className="w-3.5 h-3.5" strokeWidth={1.5} />
                        {userStateResource.tribunalAbbrev} Portal
                        <ExternalLink className="w-3 h-3" strokeWidth={1.5} />
                      </a>
                      <a
                        href={userStateResource.advocacyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-2 border border-[#DBEAFE] text-[#1E40AF] rounded-lg text-[10px] tracking-wide flex items-center justify-center gap-1.5 hover:bg-white transition-colors font-medium"
                      >
                        <Scale className="w-3.5 h-3.5" strokeWidth={1.5} />
                        Get Help
                        <ExternalLink className="w-3 h-3" strokeWidth={1.5} />
                      </a>
                    </div>
                  </div>
                )}

                {/* Edit / Delete Case Actions */}
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => handleEditCase(selectedCase)}
                    className="flex-1 py-2.5 border border-[#E2E8F0] rounded-xl text-xs tracking-wide text-[#64748B] hover:text-[#1E40AF] hover:border-[#1E40AF]/30 hover:bg-[#1E40AF]/5 transition-all cursor-pointer flex items-center justify-center gap-1.5 font-medium"
                  >
                    <Pencil className="w-3.5 h-3.5" strokeWidth={1.5} />
                    Edit Case
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(selectedCase.id)}
                    className="flex-1 py-2.5 border border-[#E2E8F0] rounded-xl text-xs tracking-wide text-[#64748B] hover:text-[#B91C1C] hover:border-[#B91C1C]/30 hover:bg-[#B91C1C]/5 transition-all cursor-pointer flex items-center justify-center gap-1.5 font-medium"
                  >
                    <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                    Delete Case
                  </button>
                </div>

                {/* Delete confirmation in detail view */}
                {showDeleteConfirm === selectedCase.id && (
                  <div className="border border-[#B91C1C]/20 bg-[#FEF2F2] rounded-xl p-4 flex flex-col items-center gap-3">
                    <AlertTriangle className="w-6 h-6 text-[#B91C1C]" strokeWidth={1.5} />
                    <p className="text-xs text-[#0F172A] text-center font-medium">
                      Permanently delete {selectedCase.case_number}?
                    </p>
                    <div className="flex gap-2 w-full">
                      <button
                        onClick={() => setShowDeleteConfirm(null)}
                        className="flex-1 py-2 border border-[#E2E8F0] rounded-xl text-xs text-[#64748B] hover:bg-white transition-colors cursor-pointer font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => { handleDeleteCase(selectedCase.id); setShowDeleteConfirm(null); }}
                        className="flex-1 py-2 bg-[#B91C1C] text-white rounded-xl text-xs hover:bg-[#991B1B] transition-colors cursor-pointer font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {isTriageOpen && (
        <div className="fixed inset-0 z-[100] bg-white flex flex-col">
          <TriageCenter onBack={() => setIsTriageOpen(false)} surface="legal" />
        </div>
      )}
    </div>
  );
}
