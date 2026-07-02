import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { ShieldAlert, Wrench, Users, MapPin, Megaphone, Plus, Trash2, RotateCcw, X, Pencil, AlertTriangle, Clock, Check, ChevronDown, ChevronUp, Mail, BellRing, Eye, ArrowLeft, Loader2, Copy, RotateCw, Image as ImageIcon, BookOpen, Sparkles, Upload, Download, FileSpreadsheet, Trophy } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import {
  fetchAdmins, addAdmin, removeAdmin,
  fetchListings, adminDeleteMarker, adminRestoreMarker, fetchDeletedMarkers,
  fetchBulletins, fetchBanners, createBulletin, updateBulletin, deleteBulletin, updateBanners,
  adminUpdateMarker,
  adminEmailSendOtp, adminEmailSend, fetchEmailLogs, deleteEmailLog,
  uploadEmailHeaderSvg, getEmailHeaderUrl,
  fetchCityGuides, createCityGuide, updateCityGuide, deleteCityGuide, generateCityGuideBlog, previewCityGuideCsvImport, commitCityGuideCsvImport,
  type BannerPlacement,
  type BannerRecord,
  type CityGuide,
  type CityGuideCsvImportPreview,
} from '../lib/api';
import { buildEmailHeaderSvg, HEADER_SVG_VERSION } from '../lib/email-header-svg';
import { downloadAppFile } from '../lib/file-download';
import { useGharData } from './layout';
import { EmailHeaderPreview } from './email-header-preview';
import { ReferralLeaderboardPanel } from './referral-leaderboard-panel';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from './ui/drawer';
import { APP_CONFIG } from '../lib/app-config';
import { APP_VARIANTS, APP_VARIANT, getAppVariantLabel, type TargetableAppVariant } from '../lib/app-variant';
import {
  codeFieldProps,
  emailFieldProps,
  getKeyboardAwareSheetStyle,
  keyboardAwareModalPaddingStyle,
  numericFieldProps,
  urlFieldProps,
} from '../lib/keyboard-ui';

type AdminTab = 'markers' | 'announcements' | 'city-guides' | 'campaigns' | 'referrals' | 'admins' | 'deleted' | 'email';
type ContentAppVariant = TargetableAppVariant;
type AdminSectionKey = 'admins' | 'markers' | 'deleted' | 'bulletins' | 'banners' | 'cityGuides';

interface AdminPanelProps {
  email: string;
}

type GuidePlaceForm = {
  id: string;
  name: string;
  description: string;
  image_url: string;
  navigation_link: string;
  lat: string;
  lng: string;
  position: string;
};

const DEFAULT_CITY_GUIDE_VARIANT: ContentAppVariant = 'all';

function createEmptyGuidePlace(index: number): GuidePlaceForm {
  return {
    id: `draft-place-${Date.now()}-${index}`,
    name: '',
    description: '',
    image_url: '',
    navigation_link: '',
    lat: '',
    lng: '',
    position: String(index),
  };
}

function parseCoordinatesFromNavigationInput(input: string) {
  const raw = String(input || '').trim();
  if (!raw) return null;

  const directPair = raw.match(/(-?\d{1,3}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/);
  if (directPair) {
    return { lat: Number(directPair[1]), lng: Number(directPair[2]) };
  }

  const patterns = [
    /@(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/,
    /[?&]q=(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/,
    /[?&]ll=(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/,
    /[?&]destination=(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/,
    /\/(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)(?:[,/]|$)/,
  ];

  for (const pattern of patterns) {
    const match = raw.match(pattern);
    if (match) {
      return { lat: Number(match[1]), lng: Number(match[2]) };
    }
  }

  return null;
}

const CITY_GUIDE_TEMPLATE_COLUMNS = [
  'city',
  'state',
  'guide_title',
  'guide_slug',
  'cover_image_url',
  'manual_intro',
  'position',
  'app_variant',
  'place_position',
  'place_name',
  'place_description',
  'place_image_url',
  'navigation_link',
  'lat',
  'lng',
] as const;

function escapeCsvValue(value: unknown) {
  const raw = String(value ?? '');
  return `"${raw.replace(/"/g, '""')}"`;
}

function buildCityGuideCsvTemplate() {
  const rows = [
    {
      city: 'Sydney',
      state: 'NSW',
      guide_title: "Top 3 Sydney first-day stops",
      guide_slug: 'sydney-first-day-stops',
      cover_image_url: 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?auto=format&fit=crop&w=1200&q=80',
      manual_intro: '',
      position: '0',
      app_variant: 'all',
      place_position: '0',
      place_name: 'Sydney Opera House',
      place_description: 'Iconic harbour landmark with easy foreshore access and a strong first look at central Sydney.',
      place_image_url: 'https://images.unsplash.com/photo-1528072164453-f4e8ef0d475a?auto=format&fit=crop&w=1200&q=80',
      navigation_link: 'https://maps.google.com/?q=-33.8567844,151.213108',
      lat: '-33.8567844',
      lng: '151.213108',
    },
    {
      city: 'Sydney',
      state: 'NSW',
      guide_title: "Top 3 Sydney first-day stops",
      guide_slug: 'sydney-first-day-stops',
      cover_image_url: 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?auto=format&fit=crop&w=1200&q=80',
      manual_intro: '',
      position: '0',
      app_variant: 'all',
      place_position: '1',
      place_name: 'Royal Botanic Garden Sydney',
      place_description: 'Large harbour-side garden with walking paths, open lawns, and quick access from the CBD.',
      place_image_url: 'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=1200&q=80',
      navigation_link: 'https://maps.google.com/?q=-33.864167,151.216387',
      lat: '-33.864167',
      lng: '151.216387',
    },
    {
      city: 'Sydney',
      state: 'NSW',
      guide_title: "Top 3 Sydney first-day stops",
      guide_slug: 'sydney-first-day-stops',
      cover_image_url: 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?auto=format&fit=crop&w=1200&q=80',
      manual_intro: '',
      position: '0',
      app_variant: 'all',
      place_position: '2',
      place_name: 'Museum of Contemporary Art Australia',
      place_description: 'Circular Quay museum stop with harbour views and an easy pairing with surrounding city walks.',
      place_image_url: 'https://images.unsplash.com/photo-1514395462725-fb4566210144?auto=format&fit=crop&w=1200&q=80',
      navigation_link: 'https://maps.google.com/?q=-33.8599358,151.2090295',
      lat: '-33.8599358',
      lng: '151.2090295',
    },
  ];

  return [
    CITY_GUIDE_TEMPLATE_COLUMNS.join(','),
    ...rows.map((row) =>
      CITY_GUIDE_TEMPLATE_COLUMNS.map((column) => escapeCsvValue(row[column])).join(','),
    ),
  ].join('\n');
}

export function AdminPanel({ email }: AdminPanelProps) {
  const navigate = useNavigate();
  const { refreshData } = useGharData();
  const [tab, setTab] = useState<AdminTab>('markers');
  const [loading, setLoading] = useState(true);
  const [sectionErrors, setSectionErrors] = useState<Partial<Record<AdminSectionKey, string>>>({});

  // Data
  const [admins, setAdmins] = useState<any[]>([]);
  const [markers, setMarkers] = useState<any[]>([]);
  const [deletedMarkers, setDeletedMarkers] = useState<any[]>([]);
  const [bulletins, setBulletins] = useState<any[]>([]);
  const [banners, setBanners] = useState<BannerRecord[]>([]);
  const [cityGuides, setCityGuides] = useState<CityGuide[]>([]);

  // Admin add form
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [adminError, setAdminError] = useState('');
  const [adminSaving, setAdminSaving] = useState(false);

  // Bulletin form
  const [showBulletinForm, setShowBulletinForm] = useState(false);
  const [editingBulletin, setEditingBulletin] = useState<any>(null);
  const [bulletinTitle, setBulletinTitle] = useState('');
  const [bulletinBody, setBulletinBody] = useState('');
  const [bulletinPostcode, setBulletinPostcode] = useState('ALL');
  const [bulletinUrgent, setBulletinUrgent] = useState(false);
  const [bulletinVariant, setBulletinVariant] = useState<ContentAppVariant>(APP_VARIANT);
  const [bulletinSaving, setBulletinSaving] = useState(false);
  const [bulletinError, setBulletinError] = useState('');
  const [showBannerForm, setShowBannerForm] = useState(false);
  const [newBannerUrl, setNewBannerUrl] = useState('');
  const [newBannerLink, setNewBannerLink] = useState('');
  const [bannerVariant, setBannerVariant] = useState<ContentAppVariant>(APP_VARIANT);
  const [bannerPlacement, setBannerPlacement] = useState<BannerPlacement>('noticeboard');
  const [bannersSaving, setBannersSaving] = useState(false);
  const [bannerError, setBannerError] = useState('');
  const [showCityGuideForm, setShowCityGuideForm] = useState(false);
  const [editingCityGuide, setEditingCityGuide] = useState<CityGuide | null>(null);
  const [showCityGuideImport, setShowCityGuideImport] = useState(false);
  const [cityGuideCsvText, setCityGuideCsvText] = useState('');
  const [cityGuideCsvFileName, setCityGuideCsvFileName] = useState('');
  const [cityGuideCsvPreview, setCityGuideCsvPreview] = useState<CityGuideCsvImportPreview | null>(null);
  const [cityGuideCsvLoading, setCityGuideCsvLoading] = useState(false);
  const [cityGuideCsvError, setCityGuideCsvError] = useState('');
  const [cityGuideCsvSuccess, setCityGuideCsvSuccess] = useState('');
  const [cityGuideCsvVariant, setCityGuideCsvVariant] = useState<ContentAppVariant>(DEFAULT_CITY_GUIDE_VARIANT);
  const [cityGuideCity, setCityGuideCity] = useState('');
  const [cityGuideState, setCityGuideState] = useState('');
  const [cityGuideTitle, setCityGuideTitle] = useState('');
  const [cityGuideCoverImageUrl, setCityGuideCoverImageUrl] = useState('');
  const [cityGuideIntro, setCityGuideIntro] = useState('');
  const [cityGuideVariant, setCityGuideVariant] = useState<ContentAppVariant>(DEFAULT_CITY_GUIDE_VARIANT);
  const [cityGuidePosition, setCityGuidePosition] = useState('0');
  const [cityGuidePlaces, setCityGuidePlaces] = useState<GuidePlaceForm[]>([createEmptyGuidePlace(0)]);
  const [cityGuideSaving, setCityGuideSaving] = useState(false);
  const [cityGuideGenerating, setCityGuideGenerating] = useState(false);
  const [cityGuideError, setCityGuideError] = useState('');
  const [showAdminDrawer, setShowAdminDrawer] = useState(false);

  // Confirm modal
  const [confirmAction, setConfirmAction] = useState<{ type: string; id: string; label: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Marker edit form
  const [showMarkerEdit, setShowMarkerEdit] = useState(false);
  const [editingMarker, setEditingMarker] = useState<any>(null);
  const [markerAddress, setMarkerAddress] = useState('');
  const [markerSuburb, setMarkerSuburb] = useState('');
  const [markerPostcode, setMarkerPostcode] = useState('');
  const [markerCategory, setMarkerCategory] = useState<'scam' | 'maintenance'>('scam');
  const [markerDescription, setMarkerDescription] = useState('');
  const [markerSaving, setMarkerSaving] = useState(false);
  const [markerError, setMarkerError] = useState('');

  // Email compose state
  const [emailTo, setEmailTo] = useState('');
  const [emailCc, setEmailCc] = useState('');
  const [emailBcc, setEmailBcc] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailError, setEmailError] = useState('');
  const [emailSending, setEmailSending] = useState(false);
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [showEmailOtp, setShowEmailOtp] = useState(false);
  const [emailOtpCode, setEmailOtpCode] = useState('');
  const [emailOtpSending, setEmailOtpSending] = useState(false);
  const [emailOtpError, setEmailOtpError] = useState('');
  const [emailSentSuccess, setEmailSentSuccess] = useState(false);
  const [emailLogs, setEmailLogs] = useState<any[]>([]);
  const [emailLogsLoading, setEmailLogsLoading] = useState(false);
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [mailMerge, setMailMerge] = useState(false);
  const [viewingLog, setViewingLog] = useState<any>(null);
  const [headerImageUrl, setHeaderImageUrl] = useState('');
  const [headerImageUrlDark, setHeaderImageUrlDark] = useState('');
  const senderDisplay = APP_CONFIG.supportEmail;
  const usesSharedSupportMailbox = APP_CONFIG.variant === 'burb_mate' || APP_CONFIG.variant === 'setu_china' || APP_CONFIG.variant === 'jom_settle';
  const mailMergeRecipient = usesSharedSupportMailbox
    ? 'ghar@knowwhatson.com'
    : 'IndiaComms@knowwhatson.com';
  const cityGuideVariantOptions: Array<{ value: ContentAppVariant; label: string }> = [
    { value: 'all', label: 'All Apps' },
    ...APP_VARIANTS.map((variant) => ({
      value: variant,
      label: variant === APP_VARIANT ? 'This App Only' : `${getAppVariantLabel(variant)} Only`,
    })),
  ];

  const getBannerPlacementLabel = (placement?: BannerPlacement) =>
    placement === 'official_events' ? "What's On Panel" : 'Noticeboard';

  useEffect(() => { loadAll(); }, []);

  // When email tab is selected, ensure both header SVGs (light + dark) are uploaded
  // Checks version to force re-upload when SVG content changes
  useEffect(() => {
    if (tab !== 'email') return;
    const HEADER_VERSION_KEY = 'ghar_header_svg_version';
    (async () => {
      try {
        const storedVersion = Number(localStorage.getItem(HEADER_VERSION_KEY) || '0');

        // If version matches and we have cached URLs, skip
        if (storedVersion === HEADER_SVG_VERSION && headerImageUrl && headerImageUrlDark) return;

        // If version matches but no local URLs, fetch from server
        if (storedVersion === HEADER_SVG_VERSION && (!headerImageUrl || !headerImageUrlDark)) {
          const urls = await getEmailHeaderUrl();
          if (urls.light && urls.dark) {
            setHeaderImageUrl(urls.light);
            setHeaderImageUrlDark(urls.dark);
            return;
          }
        }

        // Version mismatch or missing URLs — rebuild and re-upload both variants
        console.log(`GHAR: Uploading email header SVGs v${HEADER_SVG_VERSION} (was v${storedVersion})`);
        const [lightUrl, darkUrl] = await Promise.all([
          uploadEmailHeaderSvg(buildEmailHeaderSvg('light'), 'light'),
          uploadEmailHeaderSvg(buildEmailHeaderSvg('dark'), 'dark'),
        ]);
        if (lightUrl) setHeaderImageUrl(lightUrl);
        if (darkUrl) setHeaderImageUrlDark(darkUrl);
        if (lightUrl && darkUrl) {
          localStorage.setItem(HEADER_VERSION_KEY, String(HEADER_SVG_VERSION));
        }
      } catch (err) {
        console.error('GHAR: Error ensuring email header SVGs:', err);
      }
    })();
  }, [tab]);

  const loadAll = async () => {
    setLoading(true);
    const nextErrors: Partial<Record<AdminSectionKey, string>> = {};
    const [
      adminsResult,
      markersResult,
      deletedResult,
      bulletinsResult,
      bannersResult,
      guidesResult,
    ] = await Promise.allSettled([
      fetchAdmins(),
      fetchListings(),
      fetchDeletedMarkers(),
      fetchBulletins(),
      fetchBanners(),
      fetchCityGuides(),
    ]);

    if (adminsResult.status === 'fulfilled') {
      setAdmins(adminsResult.value);
    } else {
      console.error('Admin admins load error:', adminsResult.reason);
      nextErrors.admins = 'Admins could not be loaded right now.';
    }

    if (markersResult.status === 'fulfilled') {
      setMarkers(markersResult.value.filter((listing: any) => listing.category === 'scam' || listing.category === 'maintenance'));
    } else {
      console.error('Admin markers load error:', markersResult.reason);
      nextErrors.markers = 'Markers could not be loaded right now.';
    }

    if (deletedResult.status === 'fulfilled') {
      setDeletedMarkers(deletedResult.value);
    } else {
      console.error('Admin deleted markers load error:', deletedResult.reason);
      nextErrors.deleted = 'Deleted markers could not be loaded right now.';
    }

    if (bulletinsResult.status === 'fulfilled') {
      setBulletins(bulletinsResult.value);
    } else {
      console.error('Admin bulletins load error:', bulletinsResult.reason);
      nextErrors.bulletins = 'Announcements could not be loaded right now.';
    }

    if (bannersResult.status === 'fulfilled') {
      setBanners(bannersResult.value);
    } else {
      console.error('Admin banners load error:', bannersResult.reason);
      nextErrors.banners = 'Banners could not be loaded right now.';
    }

    if (guidesResult.status === 'fulfilled') {
      setCityGuides(guidesResult.value);
    } else {
      console.error('Admin city guides load error:', guidesResult.reason);
      nextErrors.cityGuides = 'Guides could not be loaded right now.';
    }

    setSectionErrors(nextErrors);
    setLoading(false);
  };

  const handleAddAdmin = async () => {
    if (!newAdminEmail.trim() || !newAdminEmail.includes('@')) {
      setAdminError('Enter a valid email');
      return;
    }
    setAdminError('');
    setAdminSaving(true);
    try {
      await addAdmin(newAdminEmail.trim().toLowerCase(), email);
      setNewAdminEmail('');
      setShowAddAdmin(false);
      await loadAll();
    } catch (err: any) {
      setAdminError(err.message || 'Failed to add admin');
    } finally {
      setAdminSaving(false);
    }
  };

  const handleRemoveAdmin = async (targetEmail: string) => {
    setActionLoading(true);
    try {
      await removeAdmin(targetEmail, email);
      setConfirmAction(null);
      await loadAll();
    } catch (err: any) {
      alert(err.message || 'Failed to remove admin');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteMarker = async (id: string) => {
    setActionLoading(true);
    try {
      await adminDeleteMarker(id, email);
      setConfirmAction(null);
      await loadAll();
      refreshData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete marker');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddBanner = async () => {
    if (!newBannerUrl.trim()) {
      setBannerError('Image URL is required');
      return;
    }
    setBannersSaving(true);
    setBannerError('');
    try {
      const updated = [
        ...banners,
        {
          id: Date.now().toString(),
          url: newBannerUrl.trim(),
          link: newBannerLink.trim() || undefined,
          app_variant: bannerVariant,
          placement: bannerPlacement,
        },
      ];
      const saved = await updateBanners(email, updated);
      setBanners(saved);
      setNewBannerUrl('');
      setNewBannerLink('');
      setBannerVariant(APP_VARIANT);
      setBannerPlacement('noticeboard');
      setShowBannerForm(false);
      refreshData();
    } catch (err: any) {
      setBannerError(err.message || 'Failed to add banner');
    } finally {
      setBannersSaving(false);
    }
  };

  const handleDeleteBanner = async (id: string) => {
    setBannersSaving(true);
    setBannerError('');
    try {
      const saved = await updateBanners(
        email,
        banners.filter((banner) => banner.id !== id),
      );
      setBanners(saved);
      refreshData();
    } catch (err: any) {
      setBannerError(err.message || 'Failed to delete banner');
    } finally {
      setBannersSaving(false);
    }
  };

  const handleRestoreMarker = async (id: string) => {
    setActionLoading(true);
    try {
      await adminRestoreMarker(id, email);
      setConfirmAction(null);
      await loadAll();
      refreshData();
    } catch (err: any) {
      alert(err.message || 'Failed to restore marker');
    } finally {
      setActionLoading(false);
    }
  };

  const openBulletinForm = (bulletin?: any) => {
    if (bulletin) {
      setEditingBulletin(bulletin);
      setBulletinTitle(bulletin.title);
      setBulletinBody(bulletin.body);
      setBulletinPostcode(bulletin.postcode_target || 'ALL');
      setBulletinUrgent(bulletin.is_urgent || false);
      setBulletinVariant(bulletin.app_variant || 'all');
    } else {
      setEditingBulletin(null);
      setBulletinTitle('');
      setBulletinBody('');
      setBulletinPostcode('ALL');
      setBulletinUrgent(false);
      setBulletinVariant(APP_VARIANT);
    }
    setBulletinError('');
    setShowBulletinForm(true);
  };

  const openMarkerEdit = (marker: any) => {
    setEditingMarker(marker);
    setMarkerAddress(marker.address || '');
    setMarkerSuburb(marker.suburb || '');
    setMarkerPostcode(marker.postcode || '');
    setMarkerCategory(marker.category || 'scam');
    setMarkerDescription(marker.description || '');
    setMarkerError('');
    setShowMarkerEdit(true);
  };

  const handleSaveMarker = async () => {
    if (!markerAddress.trim()) { setMarkerError('Address is required'); return; }
    setMarkerError('');
    setMarkerSaving(true);
    try {
      await adminUpdateMarker(editingMarker.id, email, {
        address: markerAddress.trim(),
        suburb: markerSuburb.trim(),
        postcode: markerPostcode.trim(),
        category: markerCategory,
        description: markerDescription.trim(),
      });
      setShowMarkerEdit(false);
      setEditingMarker(null);
      await loadAll();
      refreshData();
    } catch (err: any) {
      setMarkerError(err.message || 'Failed to update marker');
    } finally {
      setMarkerSaving(false);
    }
  };

  const handleSaveBulletin = async () => {
    if (!bulletinTitle.trim()) { setBulletinError('Title is required'); return; }
    if (!bulletinBody.trim()) { setBulletinError('Body is required'); return; }
    setBulletinError('');
    setBulletinSaving(true);
    try {
      if (editingBulletin) {
        await updateBulletin(editingBulletin.id, {
          title: bulletinTitle.trim(),
          body: bulletinBody.trim(),
          postcode_target: bulletinPostcode,
          is_urgent: bulletinUrgent,
          app_variant: bulletinVariant,
          admin_email: email,
        });
      } else {
        await createBulletin({
          title: bulletinTitle.trim(),
          body: bulletinBody.trim(),
          postcode_target: bulletinPostcode,
          is_urgent: bulletinUrgent,
          app_variant: bulletinVariant,
        });
      }
      setShowBulletinForm(false);
      await loadAll();
      refreshData();
    } catch (err: any) {
      setBulletinError(err.message || 'Failed to save');
    } finally {
      setBulletinSaving(false);
    }
  };

  const handleDeleteBulletin = async (id: string) => {
    setActionLoading(true);
    try {
      await deleteBulletin(id, email);
      setConfirmAction(null);
      await loadAll();
      refreshData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete bulletin');
    } finally {
      setActionLoading(false);
    }
  };

  const openCityGuideForm = (guide?: CityGuide) => {
    if (guide) {
      setEditingCityGuide(guide);
      setCityGuideCity(guide.city);
      setCityGuideState(guide.state);
      setCityGuideTitle(guide.title);
      setCityGuideCoverImageUrl(guide.cover_image_url || '');
      setCityGuideIntro(guide.intro || '');
      setCityGuideVariant((guide.app_variant || DEFAULT_CITY_GUIDE_VARIANT) as ContentAppVariant);
      setCityGuidePosition(String(guide.position ?? 0));
      setCityGuidePlaces(
        guide.places.length > 0
          ? guide.places.map((place, index) => ({
              id: place.id || `draft-place-${index}`,
              name: place.name || '',
              description: place.description || '',
              image_url: place.image_url || '',
              navigation_link: place.navigation_link || '',
              lat: Number.isFinite(place.lat) ? String(place.lat) : '',
              lng: Number.isFinite(place.lng) ? String(place.lng) : '',
              position: String(place.position ?? index),
            }))
          : [createEmptyGuidePlace(0)],
      );
    } else {
      setEditingCityGuide(null);
      setCityGuideCity('');
      setCityGuideState('');
      setCityGuideTitle('');
      setCityGuideCoverImageUrl('');
      setCityGuideIntro('');
      setCityGuideVariant(DEFAULT_CITY_GUIDE_VARIANT);
      setCityGuidePosition(String(cityGuides.length));
      setCityGuidePlaces([createEmptyGuidePlace(0)]);
    }
    setCityGuideError('');
    setShowCityGuideForm(true);
  };

  const normalizeGuidePlacesPayload = () => {
    return cityGuidePlaces
      .filter((place) =>
        place.name.trim() ||
        place.description.trim() ||
        place.navigation_link.trim() ||
        place.lat.trim() ||
        place.lng.trim(),
      )
      .map((place, index) => {
        const parsedFromLink = parseCoordinatesFromNavigationInput(place.navigation_link);
        const lat = place.lat.trim() ? Number(place.lat) : parsedFromLink?.lat;
        const lng = place.lng.trim() ? Number(place.lng) : parsedFromLink?.lng;

        if (!place.name.trim()) {
          throw new Error(`Place ${index + 1} needs a name.`);
        }

        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          throw new Error(`Place ${index + 1} needs valid coordinates or a map link we can read.`);
        }

        return {
          id: place.id,
          name: place.name.trim(),
          description: place.description.trim(),
          image_url: place.image_url.trim(),
          navigation_link: place.navigation_link.trim(),
          lat,
          lng,
          position: Number.isFinite(Number(place.position)) ? Number(place.position) : index,
        };
      })
      .sort((left, right) => left.position - right.position);
  };

  const updateGuidePlaceField = (index: number, field: keyof GuidePlaceForm, value: string) => {
    setCityGuidePlaces((current) =>
      current.map((place, placeIndex) => {
        if (placeIndex !== index) return place;
        const nextPlace = { ...place, [field]: value };
        if (field === 'navigation_link' && value.trim()) {
          const parsed = parseCoordinatesFromNavigationInput(value);
          if (parsed) {
            nextPlace.lat = String(parsed.lat);
            nextPlace.lng = String(parsed.lng);
          }
        }
        return nextPlace;
      }),
    );
  };

  const handleSaveCityGuide = async () => {
    if (!cityGuideCity.trim()) {
      setCityGuideError('City is required.');
      return;
    }
    if (!cityGuideState.trim()) {
      setCityGuideError('State is required.');
      return;
    }
    if (!cityGuideTitle.trim()) {
      setCityGuideError('Guide title is required.');
      return;
    }

    let placesPayload: ReturnType<typeof normalizeGuidePlacesPayload> = [];
    try {
      placesPayload = normalizeGuidePlacesPayload();
    } catch (err: any) {
      setCityGuideError(err?.message || 'Check your place rows and try again.');
      return;
    }

    setCityGuideSaving(true);
    setCityGuideError('');
    try {
      if (editingCityGuide) {
        await updateCityGuide(editingCityGuide.id, {
          admin_email: email,
          city: cityGuideCity.trim(),
          state: cityGuideState.trim(),
          title: cityGuideTitle.trim(),
          cover_image_url: cityGuideCoverImageUrl.trim(),
          intro: cityGuideIntro.trim(),
          app_variant: cityGuideVariant,
          position: Number.isFinite(Number(cityGuidePosition)) ? Number(cityGuidePosition) : 0,
          places: placesPayload,
        });
      } else {
        await createCityGuide({
          admin_email: email,
          city: cityGuideCity.trim(),
          state: cityGuideState.trim(),
          title: cityGuideTitle.trim(),
          cover_image_url: cityGuideCoverImageUrl.trim(),
          intro: cityGuideIntro.trim(),
          app_variant: cityGuideVariant,
          position: Number.isFinite(Number(cityGuidePosition)) ? Number(cityGuidePosition) : 0,
          places: placesPayload,
        });
      }
      setShowCityGuideForm(false);
      await loadAll();
    } catch (err: any) {
      setCityGuideError(err?.message || 'Failed to save city guide.');
    } finally {
      setCityGuideSaving(false);
    }
  };

  const handleGenerateCityGuideIntro = async () => {
    if (!cityGuideCity.trim() || !cityGuideState.trim() || !cityGuideTitle.trim()) {
      setCityGuideError('Add city, state, and title before generating the blog intro.');
      return;
    }

    let placesPayload: ReturnType<typeof normalizeGuidePlacesPayload> = [];
    try {
      placesPayload = normalizeGuidePlacesPayload();
    } catch (err: any) {
      setCityGuideError(err?.message || 'Fix your place rows before generating the blog intro.');
      return;
    }

    setCityGuideGenerating(true);
    setCityGuideError('');
    try {
      const generated = await generateCityGuideBlog({
        admin_email: email,
        city: cityGuideCity.trim(),
        state: cityGuideState.trim(),
        title: cityGuideTitle.trim(),
        places: placesPayload,
      });
      setCityGuideIntro(generated.intro);
    } catch (err: any) {
      setCityGuideError(err?.message || 'Failed to generate city guide intro.');
    } finally {
      setCityGuideGenerating(false);
    }
  };

  const handleDeleteCityGuide = async (id: string) => {
    setActionLoading(true);
    try {
      await deleteCityGuide(id, email);
      setConfirmAction(null);
      await loadAll();
    } catch (err: any) {
      alert(err.message || 'Failed to delete city guide');
    } finally {
      setActionLoading(false);
    }
  };

  const downloadCityGuideTemplate = async () => {
    setCityGuideCsvError('');
    setCityGuideCsvSuccess('');
    try {
      const blob = new Blob([buildCityGuideCsvTemplate()], { type: 'text/csv;charset=utf-8' });
      await downloadAppFile({
        blob,
        fileName: 'hoodie-city-guide-template.csv',
        title: "Hoodie city guide CSV template",
        directoryName: 'hoodie-guides',
      });
      setCityGuideCsvSuccess('Template is ready to save or share.');
    } catch (error) {
      console.error('GHAR city guide template export error:', error);
      setCityGuideCsvError('Template could not be downloaded right now.');
    }
  };

  const handleCityGuideCsvFile = async (file?: File | null) => {
    if (!file) return;

    try {
      const text = await file.text();
      setShowCityGuideImport(true);
      setCityGuideCsvFileName(file.name);
      setCityGuideCsvText(text);
      setCityGuideCsvSuccess('');
      setCityGuideCsvError('');
      setCityGuideCsvPreview(null);
    } catch (err: any) {
      setCityGuideCsvError(err?.message || 'That CSV could not be read.');
    }
  };

  const handlePreviewCityGuideCsv = async (introOverride?: string) => {
    if (!cityGuideCsvText.trim()) {
      setCityGuideCsvError('Upload a guide CSV first.');
      return null;
    }

    setCityGuideCsvLoading(true);
    setCityGuideCsvError('');
    setCityGuideCsvSuccess('');
    try {
      const preview = await previewCityGuideCsvImport({
        admin_email: email,
        csv_text: cityGuideCsvText,
        intro_override: introOverride ?? cityGuideCsvPreview?.guide.intro ?? '',
        app_variant: cityGuideCsvVariant,
      });
      setCityGuideCsvPreview(preview);
      return preview;
    } catch (err: any) {
      setCityGuideCsvPreview(null);
      setCityGuideCsvError(err?.message || 'Guide CSV preview failed.');
      return null;
    } finally {
      setCityGuideCsvLoading(false);
    }
  };

  const handleGenerateImportedGuideIntro = async () => {
    const preview = cityGuideCsvPreview ?? (await handlePreviewCityGuideCsv());
    if (!preview) return;

    setCityGuideCsvLoading(true);
    setCityGuideCsvError('');
    setCityGuideCsvSuccess('');
    try {
      const generated = await generateCityGuideBlog({
        admin_email: email,
        city: preview.guide.city,
        state: preview.guide.state,
        title: preview.guide.title,
        places: preview.guide.places,
      });
      const nextPreview = await handlePreviewCityGuideCsv(generated.intro);
      if (nextPreview) {
        setCityGuideCsvSuccess('Guide intro generated from the uploaded place data.');
      }
    } catch (err: any) {
      setCityGuideCsvError(err?.message || 'Guide intro generation failed.');
    } finally {
      setCityGuideCsvLoading(false);
    }
  };

  const handleCommitCityGuideCsv = async () => {
    if (!cityGuideCsvText.trim()) {
      setCityGuideCsvError('Upload a guide CSV first.');
      return;
    }

    setCityGuideCsvLoading(true);
    setCityGuideCsvError('');
    setCityGuideCsvSuccess('');
    try {
      await commitCityGuideCsvImport({
        admin_email: email,
        csv_text: cityGuideCsvText,
        guide_id: cityGuideCsvPreview?.matched_guide?.id,
        intro_override: cityGuideCsvPreview?.guide.intro ?? '',
        app_variant: cityGuideCsvVariant,
      });
      setCityGuideCsvSuccess('Guide saved. It is now available in My \'hood.');
      await loadAll();
    } catch (err: any) {
      setCityGuideCsvError(err?.message || 'Guide CSV could not be saved.');
    } finally {
      setCityGuideCsvLoading(false);
    }
  };

  const clearCityGuideImport = () => {
    setShowCityGuideImport(false);
    setCityGuideCsvText('');
    setCityGuideCsvFileName('');
    setCityGuideCsvPreview(null);
    setCityGuideCsvError('');
    setCityGuideCsvSuccess('');
    setCityGuideCsvVariant(DEFAULT_CITY_GUIDE_VARIANT);
  };

  const executeConfirm = () => {
    if (!confirmAction) return;
    switch (confirmAction.type) {
      case 'delete-marker': handleDeleteMarker(confirmAction.id); break;
      case 'restore-marker': handleRestoreMarker(confirmAction.id); break;
      case 'remove-admin': handleRemoveAdmin(confirmAction.id); break;
      case 'delete-bulletin': handleDeleteBulletin(confirmAction.id); break;
      case 'delete-city-guide': handleDeleteCityGuide(confirmAction.id); break;
    }
  };

  // ─── EMAIL HANDLERS ─────────────────────────────────────────────
  const parseRecipients = (input: string): string[] => {
    return input.split(/[,;\n]+/).map(e => e.trim().toLowerCase()).filter(e => e.includes('@') && e.includes('.'));
  };

  const getEmailBodyHtml = (): string => {
    // Convert plain text to styled HTML paragraphs
    return emailBody.split('\n').map(line =>
      line.trim()
        ? `<p style="font-family:Inter,Arial,sans-serif;font-size:14px;color:#0F172A;margin:0 0 12px;line-height:1.6;">${line}</p>`
        : `<br/>`
    ).join('');
  };

  const handleEmailPreview = () => {
    const recipients = parseRecipients(emailTo);
    const ccList = parseRecipients(emailCc);
    const bccList = parseRecipients(emailBcc);
    const allRecipients = [...recipients, ...ccList, ...bccList];
    if (!allRecipients.length) { setEmailError('Enter at least one valid recipient email'); return; }
    if (!emailSubject.trim()) { setEmailError('Subject is required'); return; }
    if (!emailBody.trim()) { setEmailError('Email body is required'); return; }
    setEmailError('');
    setShowEmailPreview(true);
  };

  const handleRequestEmailOtp = async () => {
    setEmailOtpSending(true);
    setEmailOtpError('');
    try {
      await adminEmailSendOtp(email);
      setShowEmailPreview(false);
      setShowEmailOtp(true);
      setEmailOtpCode('');
    } catch (err: any) {
      setEmailOtpError(err.message || 'Failed to send verification code');
    } finally {
      setEmailOtpSending(false);
    }
  };

  const handleVerifyAndSend = async () => {
    if (!emailOtpCode.trim() || emailOtpCode.length !== 6) {
      setEmailOtpError('Enter the 6-character code');
      return;
    }
    setEmailSending(true);
    setEmailOtpError('');
    try {
      const recipients = parseRecipients(emailTo);
      const ccList = parseRecipients(emailCc);
      let bccList = parseRecipients(emailBcc);

      // Mail merge: move all To recipients to BCC
      let finalTo = recipients;
      if (mailMerge && recipients.length > 0) {
        bccList = [...bccList, ...recipients];
        finalTo = [mailMergeRecipient];
      }

      await adminEmailSend({
        adminEmail: email,
        code: emailOtpCode.trim(),
        to: finalTo,
        cc: ccList,
        bcc: bccList,
        subject: emailSubject.trim(),
        bodyHtml: getEmailBodyHtml(),
        bodyPlain: emailBody,
        headerImageUrl: headerImageUrl,
        headerImageUrlDark: headerImageUrlDark,
        isMailMerge: mailMerge,
      });
      setShowEmailOtp(false);
      setEmailSentSuccess(true);
      // Reset form
      setEmailTo('');
      setEmailCc('');
      setEmailBcc('');
      setEmailSubject('');
      setEmailBody('');
      setEmailOtpCode('');
      setMailMerge(false);
      // Auto-dismiss success after 3s
      setTimeout(() => setEmailSentSuccess(false), 3000);
      // Reload logs
      loadEmailLogs();
    } catch (err: any) {
      setEmailOtpError(err.message || 'Failed to send email');
    } finally {
      setEmailSending(false);
    }
  };

  const handleResendEmail = (log: any) => {
    setEmailTo(Array.isArray(log.to) ? log.to.join(', ') : '');
    setEmailCc(Array.isArray(log.cc) && log.cc.length ? log.cc.join(', ') : '');
    setEmailBcc(Array.isArray(log.bcc) && log.bcc.length ? log.bcc.join(', ') : '');
    setEmailSubject(log.subject || '');
    setEmailBody(log.body_plain || '');
    setMailMerge(log.is_mail_merge || false);
    setViewingLog(null);
    setTab('email');
    window.scrollTo(0, 0);
  };

  const handleDeleteEmailLog = async (logId: string) => {
    setActionLoading(true);
    try {
      await deleteEmailLog(logId, email);
      setConfirmAction(null);
      setViewingLog(null);
      loadEmailLogs();
    } catch (err: any) {
      alert(err.message || 'Failed to delete email log');
    } finally {
      setActionLoading(false);
    }
  };

  const loadEmailLogs = async () => {
    setEmailLogsLoading(true);
    try {
      const logs = await fetchEmailLogs();
      setEmailLogs(logs);
    } catch (err) {
      console.error('Failed to load email logs:', err);
    } finally {
      setEmailLogsLoading(false);
    }
  };

  // Load email logs when switching to email tab
  useEffect(() => {
    if (tab === 'email') loadEmailLogs();
  }, [tab]);

  const tabs: { id: AdminTab; label: string; icon: any; count?: number }[] = [
    { id: 'markers', label: 'Markers', icon: MapPin, count: markers.length },
    { id: 'announcements', label: 'Alerts', icon: Megaphone, count: bulletins.length + banners.length },
    ...(APP_VARIANT === 'burb_mate' || APP_VARIANT === 'setu_china' || APP_VARIANT === 'jom_settle'
      ? [{ id: 'city-guides' as const, label: 'Guides', icon: BookOpen, count: cityGuides.length }]
      : []),
    { id: 'campaigns', label: 'Campaigns', icon: BellRing },
    { id: 'referrals', label: 'Referrals', icon: Trophy },
    { id: 'admins', label: 'Admins', icon: Users, count: admins.length },
    { id: 'deleted', label: 'Deleted', icon: RotateCcw, count: deletedMarkers.length },
    { id: 'email', label: 'Email', icon: Mail },
  ];

  const inputClass = "w-full px-3 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#B91C1C] focus:ring-2 focus:ring-[#B91C1C]/10 font-normal";
  const labelClass = "text-[10px] tracking-wide uppercase text-[#94A3B8] mb-1 block font-medium";
  const activeAdminTab = tabs.find((item) => item.id === tab) || tabs[0];
  const ActiveAdminTabIcon = activeAdminTab.icon;
  const activeTabErrors = (() => {
    switch (tab) {
      case 'markers':
        return [sectionErrors.markers];
      case 'announcements':
        return [sectionErrors.bulletins, sectionErrors.banners];
      case 'city-guides':
        return [sectionErrors.cityGuides];
      case 'admins':
        return [sectionErrors.admins];
      case 'deleted':
        return [sectionErrors.deleted];
      default:
        return [];
    }
  })().filter(Boolean) as string[];
  const emailHeaderPreview = APP_CONFIG.variant === 'jom_settle' ? (
    <div className="bg-gradient-to-br from-[#FFF6E6] via-[#FFE6E6] to-[#E7FBF5] px-6 py-7 text-center">
      <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/85 shadow-sm">
        <span className="text-xl font-black text-[#E53935]">JS</span>
      </div>
      <p className="text-lg font-black text-[#0D1B2A]">{APP_CONFIG.displayName}</p>
      <p className="mt-1 text-[11px] leading-relaxed text-[#475569]">
        Your Malaysian student life in Australia, sorted lah.
      </p>
    </div>
  ) : APP_CONFIG.variant === 'burb_mate' ? (
    <div className="bg-gradient-to-br from-[#E8F2FF] to-[#F0FFF7] px-6 py-7 text-center">
      <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/80 shadow-sm">
        <span className="text-xl font-black text-[#2563EB]">'B</span>
      </div>
      <p className="text-lg font-black text-[#0F172A]">{APP_CONFIG.displayName}</p>
      <p className="mt-1 text-[11px] leading-relaxed text-[#475569]">
        Your Australia suburb mate for safer housing decisions and arrival support.
      </p>
    </div>
  ) : (
    <EmailHeaderPreview />
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-2 border-[#B91C1C] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 overflow-x-hidden p-4">
      {/* Admin Badge */}
      <div className="bg-[#B91C1C]/5 border border-[#B91C1C]/20 rounded-xl p-3 flex items-center gap-3">
        <div className="w-9 h-9 bg-[#B91C1C] rounded-xl flex items-center justify-center shrink-0">
          <ShieldAlert className="w-4 h-4 text-white" strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-[#0F172A] font-bold">Admin Panel</p>
          <p className="text-[10px] text-[#64748B] truncate font-normal">{email}</p>
        </div>
      </div>

      <div className="rounded-[24px] border border-[#E2E8F0] bg-[#F8FAFC] p-2 shadow-sm">
        <button
          type="button"
          onClick={() => setShowAdminDrawer(true)}
          className="flex w-full items-center justify-between gap-3 rounded-[18px] bg-white px-4 py-3 text-left shadow-[0_8px_18px_rgba(15,23,42,0.06)]"
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#FEE2E2] text-[#B91C1C]">
              <ActiveAdminTabIcon className="h-5 w-5" strokeWidth={1.8} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#94A3B8]">Admin section</p>
              <div className="flex min-w-0 items-center gap-2">
                <p className="truncate text-sm font-bold text-[#0F172A]">{activeAdminTab.label}</p>
                {activeAdminTab.count !== undefined ? (
                  <span className="rounded-full bg-[#FEF2F2] px-2 py-0.5 text-[10px] font-semibold text-[#B91C1C]">
                    {activeAdminTab.count}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 text-[#64748B]" strokeWidth={1.8} />
        </button>
      </div>

      <Drawer open={showAdminDrawer} onOpenChange={setShowAdminDrawer}>
        <DrawerContent className="overflow-hidden rounded-t-[28px] border-[#E2E8F0] bg-white data-[vaul-drawer-direction=bottom]:mt-2 data-[vaul-drawer-direction=bottom]:h-[min(94dvh,860px)] data-[vaul-drawer-direction=bottom]:max-h-[95dvh]">
          <DrawerHeader className="pb-2">
            <DrawerTitle className="text-base font-bold text-[#0F172A]">Admin tools</DrawerTitle>
          </DrawerHeader>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[calc(var(--native-safe-area-bottom)+1.25rem)]">
            <div className="grid grid-cols-2 gap-3 pb-2">
              {tabs.map((item) => {
                const Icon = item.icon;
                const active = tab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setShowAdminDrawer(false);
                      if (item.id === 'campaigns') {
                        navigate('/notifications');
                        return;
                      }
                      setTab(item.id);
                    }}
                    className={`rounded-[20px] border px-4 py-3.5 text-left transition ${
                      active
                        ? 'border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]'
                        : 'border-[#E2E8F0] bg-[#F8FAFC] text-[#475569]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white">
                        <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
                      </div>
                      {item.count !== undefined ? (
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${active ? 'bg-white text-[#B91C1C]' : 'bg-white text-[#64748B]'}`}>
                          {item.count}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-3 text-[13px] font-bold">{item.label}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {activeTabErrors.length > 0 && (
        <div className="space-y-2">
          {activeTabErrors.map((message, index) => (
            <div key={`${message}-${index}`} className="rounded-xl border border-[#FDE68A] bg-[#FFFBEB] px-3 py-2 text-[11px] text-[#B45309]">
              {message}
            </div>
          ))}
        </div>
      )}

      {/* ─── MARKERS TAB ─── */}
      {tab === 'markers' && (
        <div className="space-y-2">
          <p className="text-[10px] text-[#94A3B8] uppercase tracking-wide font-medium">
            Active Map Markers — edit or remove
          </p>
          {markers.length === 0 && (
            <p className="text-sm text-[#94A3B8] text-center py-8 font-normal">No active markers</p>
          )}
          {markers.map(m => (
            <div
              key={m.id}
              className="border border-[#E2E8F0] rounded-xl p-3 flex items-center gap-3"
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                m.category === 'scam' ? 'bg-[#B91C1C]' : 'bg-[#EA580C]'
              }`}>
                {m.category === 'scam'
                  ? <ShieldAlert className="w-4 h-4 text-white" strokeWidth={2} />
                  : <Wrench className="w-4 h-4 text-white" strokeWidth={2} />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[#0F172A] font-bold truncate">{m.address || 'Unknown address'}</p>
                <p className="text-[10px] text-[#94A3B8] font-normal">
                  {m.listing_id_public} · {m.category === 'scam' ? 'Scam' : 'Maintenance'}
                  {m.reported_by && ` · by ${m.reported_by}`}
                </p>
              </div>
              <button
                onClick={() => openMarkerEdit(m)}
                className="p-2 text-[#94A3B8] hover:text-[#1E40AF] transition-colors cursor-pointer"
              >
                <Pencil className="w-4 h-4" strokeWidth={1.5} />
              </button>
              <button
                onClick={() => setConfirmAction({
                  type: 'delete-marker',
                  id: m.id,
                  label: `Remove marker "${m.address || m.listing_id_public}" from the map?`,
                })}
                className="p-2 text-[#94A3B8] hover:text-[#B91C1C] transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ─── ANNOUNCEMENTS TAB ─── */}
      {tab === 'announcements' && (
        <div className="space-y-4">
          <div className="border border-[#E2E8F0] rounded-xl p-3 bg-white">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-[#0F172A] flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-[#64748B]" />
                Banners
              </h3>
              {!showBannerForm && (
                <button onClick={() => setShowBannerForm(true)} className="p-1 text-[#64748B] hover:text-[#1E40AF] transition-colors">
                  <Plus className="w-4 h-4" />
                </button>
              )}
            </div>

            {showBannerForm && (
              <div className="bg-[#F8FAFC] p-3 rounded-xl mb-3 space-y-2 border border-[#E2E8F0]">
                <input
                  type="text"
                  placeholder="Image URL (required)"
                  value={newBannerUrl}
                  onChange={(e) => setNewBannerUrl(e.target.value)}
                  className="w-full bg-white border border-[#E2E8F0] rounded-lg px-3 py-1.5 text-[11px] text-[#0F172A] placeholder:text-[#94A3B8] outline-none focus:border-[#1E40AF] transition-colors"
                />
                <input
                  type="text"
                  placeholder="Link URL (optional)"
                  value={newBannerLink}
                  onChange={(e) => setNewBannerLink(e.target.value)}
                  className="w-full bg-white border border-[#E2E8F0] rounded-lg px-3 py-1.5 text-[11px] text-[#0F172A] placeholder:text-[#94A3B8] outline-none focus:border-[#1E40AF] transition-colors"
                />
                <select
                  value={bannerVariant}
                  onChange={(e) => setBannerVariant(e.target.value as ContentAppVariant)}
                  className="w-full bg-white border border-[#E2E8F0] rounded-lg px-3 py-1.5 text-[11px] text-[#0F172A] outline-none focus:border-[#1E40AF] transition-colors"
                >
                  {cityGuideVariantOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <select
                  value={bannerPlacement}
                  onChange={(e) => setBannerPlacement(e.target.value as BannerPlacement)}
                  className="w-full bg-white border border-[#E2E8F0] rounded-lg px-3 py-1.5 text-[11px] text-[#0F172A] outline-none focus:border-[#1E40AF] transition-colors"
                >
                  <option value="noticeboard">Noticeboard</option>
                  <option value="official_events">What's On Panel</option>
                </select>
                {bannerError && <p className="text-[10px] text-[#B91C1C]">{bannerError}</p>}
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    onClick={() => {
                      setShowBannerForm(false);
                      setBannerError('');
                      setNewBannerUrl('');
                      setNewBannerLink('');
                      setBannerVariant(APP_VARIANT);
                      setBannerPlacement('noticeboard');
                    }}
                    className="text-[11px] px-3 py-1.5 text-[#64748B] hover:text-[#0F172A] font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddBanner}
                    disabled={bannersSaving}
                    className="text-[11px] px-3 py-1.5 bg-[#1E40AF] text-white rounded-lg font-medium hover:bg-[#1E3A8A] transition-colors disabled:opacity-50"
                  >
                    {bannersSaving ? 'Saving...' : 'Add Banner'}
                  </button>
                </div>
              </div>
            )}

            {banners.length === 0 && !showBannerForm && (
              <p className="text-[11px] text-[#94A3B8] text-center py-2">No banners added</p>
            )}

            <div className="space-y-2">
              {banners.map((banner) => (
                <div key={banner.id} className="flex items-center gap-3 bg-[#F8FAFC] p-2 rounded-lg border border-[#E2E8F0]">
                  <div className="w-12 h-8 rounded bg-gray-200 overflow-hidden shrink-0 border border-[#E2E8F0]">
                    <img src={banner.url} alt="Banner" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-[#64748B] truncate">{banner.link || 'No link'}</p>
                    <p className="text-[9px] uppercase tracking-wide text-[#94A3B8] mt-0.5">
                      {getAppVariantLabel(banner.app_variant || 'all')} · {getBannerPlacementLabel(banner.placement)}
                    </p>
                  </div>
                  <button onClick={() => handleDeleteBanner(banner.id)} className="p-1.5 text-[#94A3B8] hover:text-[#B91C1C] hover:bg-[#FEE2E2] rounded transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => openBulletinForm()}
            className="w-full py-2.5 border border-dashed border-[#CBD5E1] rounded-xl text-[#64748B] flex items-center justify-center gap-2 hover:border-[#B91C1C] hover:text-[#B91C1C] transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" strokeWidth={1.5} />
            <span className="text-xs tracking-wide font-medium">New Announcement</span>
          </button>
          {bulletins.length === 0 && (
            <p className="text-sm text-[#94A3B8] text-center py-8 font-normal">No announcements yet</p>
          )}
          {bulletins.map(b => (
            <div
              key={b.id}
              className={`border rounded-xl p-3 ${
                b.is_urgent ? 'border-[#B91C1C] bg-[#FEF2F2]' : 'border-[#E2E8F0]'
              }`}
            >
              <div className="flex items-start justify-between mb-1">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    {b.is_urgent && (
                      <span className="bg-[#B91C1C] text-white text-[8px] tracking-wide uppercase px-1.5 py-0.5 rounded font-medium">
                        Urgent
                      </span>
                    )}
                    <span className="text-[9px] text-[#94A3B8] uppercase tracking-wide font-medium">
                      {getAppVariantLabel(b.app_variant || 'all')}
                    </span>
                    <span className="text-[9px] text-[#94A3B8] uppercase tracking-wide font-medium">
                      {b.postcode_target === 'ALL' ? 'National' : `PC ${b.postcode_target}`}
                    </span>
                  </div>
                  <p className="text-xs text-[#0F172A] font-bold">{b.title}</p>
                  <p className="text-[10px] text-[#64748B] mt-1 line-clamp-2 font-normal">{b.body}</p>
                </div>
                <div className="flex items-center gap-1 ml-2 shrink-0">
                  <button
                    onClick={() => openBulletinForm(b)}
                    className="p-1.5 text-[#94A3B8] hover:text-[#1E40AF] transition-colors cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" strokeWidth={1.5} />
                  </button>
                  <button
                    onClick={() => setConfirmAction({
                      type: 'delete-bulletin',
                      id: b.id,
                      label: `Delete announcement "${b.title}"?`,
                    })}
                    className="p-1.5 text-[#94A3B8] hover:text-[#B91C1C] transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                  </button>
                </div>
              </div>
              <p className="text-[9px] text-[#94A3B8] font-normal mt-1">
                {format(new Date(b.created_at), 'dd MMM yyyy')}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* ─── CITY GUIDES TAB ─── */}
      {tab === 'city-guides' && (
        <div className="space-y-4">
          <div className="rounded-[24px] border border-[#E2E8F0] bg-white p-4 shadow-sm">
            <div className="space-y-4">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#94A3B8]">Guides</p>
                <p className="mt-2 text-base font-bold text-[#0F172A]">My 'hood city guides</p>
                <p className="mt-2 text-[13px] leading-6 text-[#64748B]">
                  Import one guide per CSV, preview the parsed places, then generate and save the guide from those facts.
                </p>
              </div>
              <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  onClick={() => void downloadCityGuideTemplate()}
                  className="inline-flex min-w-0 w-full items-center justify-center gap-2 rounded-xl border border-[#D8E3F0] bg-white px-3 py-2.5 text-[12px] font-semibold text-[#1E40AF] transition-colors hover:bg-[#EEF2FF]"
                >
                  <Download className="h-4 w-4 shrink-0" strokeWidth={1.8} />
                  <span className="truncate">Download Template</span>
                </button>
                <label className="inline-flex min-w-0 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#1E40AF] px-3 py-2.5 text-[12px] font-semibold text-white transition-colors hover:bg-[#1E3A8A]">
                  <Upload className="h-4 w-4 shrink-0" strokeWidth={1.8} />
                  <span className="truncate">Upload CSV</span>
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={(event) => {
                      void handleCityGuideCsvFile(event.target.files?.[0] || null);
                      event.currentTarget.value = '';
                    }}
                  />
                </label>
                <button
                  onClick={() => openCityGuideForm()}
                  className="inline-flex min-w-0 w-full items-center justify-center gap-2 rounded-xl border border-[#E2E8F0] bg-white px-3 py-2.5 text-[12px] font-semibold text-[#64748B] transition-colors hover:bg-[#F8FAFC] sm:col-span-2"
                >
                  <Plus className="h-4 w-4 shrink-0" strokeWidth={1.8} />
                  <span className="truncate">Manual Guide</span>
                </button>
              </div>
            </div>
          </div>

          {(cityGuideCsvError || cityGuideCsvSuccess) && (
            <div className={`rounded-xl px-3 py-2 text-[11px] ${
              cityGuideCsvError
                ? 'border border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]'
                : 'border border-[#BBF7D0] bg-[#F0FDF4] text-[#166534]'
            }`}>
              {cityGuideCsvError || cityGuideCsvSuccess}
            </div>
          )}

          {(showCityGuideImport || cityGuideCsvPreview || cityGuideCsvText) && (
            <div className="space-y-4 rounded-xl border border-[#E2E8F0] bg-white p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#0F172A]">CSV import</p>
                  <p className="mt-1 text-[11px] leading-5 text-[#64748B]">
                    Keep one guide per upload. Repeat the guide metadata on every row and add one place per row.
                  </p>
                </div>
                <button
                  onClick={clearCityGuideImport}
                  className="self-start rounded-xl border border-[#E2E8F0] px-3 py-2 text-[11px] font-semibold text-[#64748B] transition-colors hover:bg-[#F8FAFC]"
                >
                  Clear
                </button>
              </div>

                <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                  <div className="flex items-center gap-2 text-[11px] font-semibold text-[#0F172A]">
                    <FileSpreadsheet className="h-4 w-4 text-[#1E40AF]" strokeWidth={1.8} />
                    {cityGuideCsvFileName || 'Paste or upload a guide CSV'}
                  </div>
                  <div className="mt-3 max-w-[220px]">
                    <label className={labelClass}>App Variant</label>
                    <select
                      value={cityGuideCsvVariant}
                      onChange={(event) => {
                        setCityGuideCsvVariant(event.target.value as ContentAppVariant);
                        setCityGuideCsvPreview(null);
                        setCityGuideCsvError('');
                        setCityGuideCsvSuccess('');
                      }}
                      className={inputClass}
                    >
                      {cityGuideVariantOptions.map((option) => (
                        <option key={`csv-guide-variant-${option.value}`} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <textarea
                    value={cityGuideCsvText}
                    onChange={(event) => {
                    setShowCityGuideImport(true);
                    setCityGuideCsvText(event.target.value);
                    setCityGuideCsvPreview(null);
                    setCityGuideCsvError('');
                    setCityGuideCsvSuccess('');
                  }}
                  rows={8}
                  spellCheck={false}
                  placeholder="Paste one-guide CSV rows here..."
                  className="mt-3 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2.5 font-mono text-[11px] text-[#0F172A] placeholder-[#94A3B8] outline-none focus:border-[#1E40AF]"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => void handlePreviewCityGuideCsv()}
                  disabled={cityGuideCsvLoading}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#D8E3F0] bg-white px-3 py-2 text-[11px] font-semibold text-[#1E40AF] transition-colors hover:bg-[#EEF2FF] disabled:opacity-50"
                >
                  {cityGuideCsvLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" strokeWidth={1.8} />}
                  Preview Import
                </button>
                <button
                  onClick={() => void handleGenerateImportedGuideIntro()}
                  disabled={cityGuideCsvLoading}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#D8E3F0] bg-white px-3 py-2 text-[11px] font-semibold text-[#1E40AF] transition-colors hover:bg-[#EEF2FF] disabled:opacity-50"
                >
                  {cityGuideCsvLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" strokeWidth={1.8} />}
                  Generate Blog
                </button>
                <button
                  onClick={() => void handleCommitCityGuideCsv()}
                  disabled={cityGuideCsvLoading}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#1E40AF] px-3 py-2 text-[11px] font-semibold text-white transition-colors hover:bg-[#1E3A8A] disabled:opacity-50"
                >
                  {cityGuideCsvLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" strokeWidth={1.8} />}
                  Save Guide
                </button>
              </div>

              {cityGuideCsvPreview && (
                <div className="space-y-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[#EEF2FF] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[#1E40AF]">
                      {cityGuideCsvPreview.guide.city}, {cityGuideCsvPreview.guide.state}
                    </span>
                    <span className="rounded-full bg-white px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[#64748B]">
                      {cityGuideCsvPreview.row_count} places
                    </span>
                    <span className="rounded-full bg-white px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[#64748B]">
                      {getAppVariantLabel(cityGuideCsvPreview.guide.app_variant || APP_VARIANT)}
                    </span>
                    {cityGuideCsvPreview.matched_guide && (
                      <span className="rounded-full bg-[#FEF3C7] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[#B45309]">
                        Updates existing guide
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#0F172A]">{cityGuideCsvPreview.guide.title}</p>
                    <p className="mt-1 text-[11px] leading-5 text-[#64748B]">
                      {cityGuideCsvPreview.guide.intro || 'No intro yet. Generate the blog intro from the uploaded place facts or keep the CSV manual_intro.'}
                    </p>
                  </div>
                  {cityGuideCsvPreview.warnings.length > 0 && (
                    <div className="space-y-2 rounded-xl border border-[#FDE68A] bg-[#FFFBEB] p-3">
                      {cityGuideCsvPreview.warnings.map((warning) => (
                        <p key={warning} className="text-[11px] text-[#B45309]">{warning}</p>
                      ))}
                    </div>
                  )}
                  <div className="space-y-2">
                    {cityGuideCsvPreview.guide.places.slice(0, 5).map((place) => (
                      <div key={place.id} className="rounded-xl border border-[#E2E8F0] bg-white p-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-[#0F172A]">{place.position + 1}. {place.name}</p>
                            <p className="mt-1 text-[11px] leading-5 text-[#64748B]">{place.description}</p>
                          </div>
                          <span className="w-fit rounded-full bg-[#F8FAFC] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[#64748B]">
                            {place.lat.toFixed(4)}, {place.lng.toFixed(4)}
                          </span>
                        </div>
                      </div>
                    ))}
                    {cityGuideCsvPreview.guide.places.length > 5 && (
                      <p className="text-[11px] text-[#64748B]">
                        {cityGuideCsvPreview.guide.places.length - 5} more places will be saved from this CSV.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {cityGuides.length === 0 && (
            <div className="rounded-xl border border-dashed border-[#CBD5E1] bg-white px-4 py-8 text-center text-sm text-[#94A3B8]">
              No city guides yet.
            </div>
          )}

          {cityGuides
            .slice()
            .sort((left, right) => left.position - right.position || left.title.localeCompare(right.title))
            .map((guide) => (
              <div key={guide.id} className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white">
                <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start">
                  <div className="h-16 w-20 overflow-hidden rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] shrink-0">
                    {guide.cover_image_url ? (
                      <img src={guide.cover_image_url} alt={guide.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[#94A3B8]">
                        <BookOpen className="h-4 w-4" strokeWidth={1.7} />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[#EEF2FF] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[#1E40AF]">
                        {guide.city}, {guide.state}
                      </span>
                      <span className="rounded-full bg-[#F8FAFC] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[#64748B]">
                        {getAppVariantLabel(guide.app_variant || APP_VARIANT)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-bold text-[#0F172A]">{guide.title}</p>
                    <p className="mt-1 text-[11px] text-[#64748B]">
                      {guide.places.length} places · position {guide.position}
                    </p>
                    <p className="mt-2 line-clamp-3 text-[11px] leading-5 text-[#64748B]">{guide.intro}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1 self-end sm:self-start">
                    <button
                      onClick={() => openCityGuideForm(guide)}
                      className="p-2 text-[#94A3B8] hover:text-[#1E40AF] transition-colors cursor-pointer"
                    >
                      <Pencil className="w-4 h-4" strokeWidth={1.5} />
                    </button>
                    <button
                      onClick={() => setConfirmAction({
                        type: 'delete-city-guide',
                        id: guide.id,
                        label: `Delete guide "${guide.title}"?`,
                      })}
                      className="p-2 text-[#94A3B8] hover:text-[#B91C1C] transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Campaigns route to /notifications via tab click handler */}

      {/* ─── REFERRALS TAB ─── */}
      {tab === 'referrals' && (
        <ReferralLeaderboardPanel email={email} />
      )}

      {/* ─── ADMINS TAB ─── */}
      {tab === 'admins' && (
        <div className="space-y-2">
          <button
            onClick={() => { setShowAddAdmin(true); setAdminError(''); setNewAdminEmail(''); }}
            className="w-full py-2.5 border border-dashed border-[#CBD5E1] rounded-xl text-[#64748B] flex items-center justify-center gap-2 hover:border-[#B91C1C] hover:text-[#B91C1C] transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" strokeWidth={1.5} />
            <span className="text-xs tracking-wide font-medium">Add Admin</span>
          </button>

          {showAddAdmin && (
            <div className="border border-[#E2E8F0] rounded-xl p-3 bg-[#F8FAFC] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#0F172A] font-bold">New Admin</span>
                <button onClick={() => setShowAddAdmin(false)} className="text-[#94A3B8] cursor-pointer">
                  <X className="w-4 h-4" strokeWidth={1.5} />
                </button>
              </div>
              <input
                type="email"
                value={newAdminEmail}
                onChange={e => setNewAdminEmail(e.target.value)}
                placeholder="admin@example.com"
                className={inputClass}
                enterKeyHint="done"
                {...emailFieldProps}
              />
              {adminError && <p className="text-[10px] text-[#B91C1C] font-normal">{adminError}</p>}
              <button
                onClick={handleAddAdmin}
                disabled={adminSaving}
                className="w-full py-2.5 bg-[#B91C1C] text-white rounded-xl text-xs font-bold hover:bg-[#991B1B] transition-colors cursor-pointer disabled:opacity-50"
              >
                {adminSaving ? 'Adding...' : 'Add Admin'}
              </button>
            </div>
          )}

          {admins.map(a => {
            const isSelf = a.email === email.toLowerCase();
            return (
              <div
                key={a.email}
                className="border border-[#E2E8F0] rounded-xl p-3 flex items-center gap-3"
              >
                <div className="w-8 h-8 bg-[#1E40AF] rounded-lg flex items-center justify-center shrink-0">
                  <span className="text-white text-xs font-bold">
                    {a.email?.charAt(0)?.toUpperCase() || '?'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-[#0F172A] font-bold truncate">
                    {a.email}
                    {isSelf && (
                      <span className="ml-1.5 text-[8px] tracking-wide bg-[#1E40AF] text-white px-1.5 py-0.5 rounded uppercase">
                        You
                      </span>
                    )}
                  </p>
                  <p className="text-[10px] text-[#94A3B8] font-normal">
                    {a.is_founder ? 'Founder' : `Added by ${a.added_by}`}
                    {a.added_at && ` · ${format(new Date(a.added_at), 'dd MMM yyyy')}`}
                  </p>
                </div>
                {!isSelf && (
                  <button
                    onClick={() => setConfirmAction({
                      type: 'remove-admin',
                      id: a.email,
                      label: `Remove ${a.email} from admin list?`,
                    })}
                    className="p-2 text-[#94A3B8] hover:text-[#B91C1C] transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ─── DELETED MARKERS TAB ─── */}
      {tab === 'deleted' && (
        <div className="space-y-2">
          <p className="text-[10px] text-[#94A3B8] uppercase tracking-wide font-medium">
            Admin-Deleted Markers — tap to restore
          </p>
          {deletedMarkers.length === 0 && (
            <p className="text-sm text-[#94A3B8] text-center py-8 font-normal">No deleted markers</p>
          )}
          {deletedMarkers.map(m => (
            <div
              key={m.id}
              className="border border-dashed border-[#E2E8F0] rounded-xl p-3 flex items-center gap-3 opacity-60"
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                m.category === 'scam' ? 'bg-[#B91C1C]' : 'bg-[#EA580C]'
              }`}>
                {m.category === 'scam'
                  ? <ShieldAlert className="w-4 h-4 text-white" strokeWidth={2} />
                  : <Wrench className="w-4 h-4 text-white" strokeWidth={2} />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[#0F172A] font-bold truncate">{m.address || 'Unknown'}</p>
                <p className="text-[10px] text-[#94A3B8] font-normal">
                  Deleted by {m.admin_deleted_by}
                  {m.admin_deleted_at && ` · ${format(new Date(m.admin_deleted_at), 'dd MMM')}`}
                </p>
              </div>
              <button
                onClick={() => setConfirmAction({
                  type: 'restore-marker',
                  id: m.id,
                  label: `Restore marker "${m.address || m.listing_id_public}" back to the map?`,
                })}
                className="p-2 text-[#94A3B8] hover:text-[#16A34A] transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ─── EMAIL TAB ─── */}
      {tab === 'email' && (
        <div className="space-y-3">
          {/* Sender badge */}
          <div className="bg-[#1E40AF]/5 border border-[#1E40AF]/20 rounded-xl p-3 flex items-center gap-3">
            <div className="w-8 h-8 bg-[#1E40AF] rounded-lg flex items-center justify-center shrink-0">
              <Mail className="w-4 h-4 text-white" strokeWidth={2} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-[#94A3B8] uppercase tracking-wide font-medium">Sending from</p>
              <p className="text-xs text-[#0F172A] font-bold">{senderDisplay}</p>
            </div>
          </div>

          {/* Success banner */}
          <AnimatePresence>
            {emailSentSuccess && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="bg-[#16A34A]/10 border border-[#16A34A]/30 rounded-xl p-3 flex items-center gap-3"
              >
                <Check className="w-5 h-5 text-[#16A34A] shrink-0" strokeWidth={2.5} />
                <p className="text-xs text-[#16A34A] font-bold">Email sent successfully!</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Compose form */}
          <div className="space-y-2">
            <div>
              <label className={labelClass}>To (comma-separated)</label>
              <textarea
                value={emailTo}
                onChange={e => setEmailTo(e.target.value)}
                placeholder="recipient@email.com, another@email.com"
                rows={2}
                className={`${inputClass} resize-none`}
                enterKeyHint="next"
                {...emailFieldProps}
              />
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className={labelClass}>CC (optional)</label>
                <textarea
                  value={emailCc}
                  onChange={e => setEmailCc(e.target.value)}
                  placeholder="cc@email.com, another@email.com"
                  rows={2}
                  className={`${inputClass} resize-none`}
                  enterKeyHint="next"
                  {...emailFieldProps}
                />
              </div>
              <div className="flex-1">
                <label className={labelClass}>BCC (optional)</label>
                <textarea
                  value={emailBcc}
                  onChange={e => setEmailBcc(e.target.value)}
                  placeholder="bcc@email.com, another@email.com"
                  rows={2}
                  className={`${inputClass} resize-none`}
                  enterKeyHint="next"
                  {...emailFieldProps}
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>Subject</label>
              <input
                type="text"
                value={emailSubject}
                onChange={e => setEmailSubject(e.target.value)}
                placeholder="Email subject line"
                className={inputClass}
                enterKeyHint="next"
              />
            </div>
            <div>
              <label className={labelClass}>Body</label>
              <textarea
                value={emailBody}
                onChange={e => setEmailBody(e.target.value)}
                placeholder="Write your email content here..."
                rows={6}
                className={`${inputClass} resize-none`}
              />
            </div>
            {emailError && <p className="text-[10px] text-[#B91C1C] font-normal">{emailError}</p>}
            {/* Mail merge toggle */}
            <label className="flex items-center gap-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3 cursor-pointer">
              <input
                type="checkbox"
                checked={mailMerge}
                onChange={e => setMailMerge(e.target.checked)}
                className="w-4 h-4 rounded accent-[#1E40AF]"
              />
              <div>
                <span className="text-xs text-[#0F172A] font-bold block">Mail Merge Mode</span>
                <span className="text-[9px] text-[#64748B] font-normal">All "To" recipients moved to BCC — each person won't see other recipients</span>
              </div>
            </label>
            {mailMerge && parseRecipients(emailTo).length > 0 && (
              <div className="flex items-center gap-2 bg-[#EFF6FF] border border-[#1E40AF]/20 rounded-lg p-2">
                <Copy className="w-3 h-3 text-[#1E40AF] shrink-0" strokeWidth={2} />
                <p className="text-[9px] text-[#1E40AF] font-normal">
                  {parseRecipients(emailTo).length} recipient{parseRecipients(emailTo).length > 1 ? 's' : ''} will be BCC'd. "To" field will show {mailMergeRecipient}.
                </p>
              </div>
            )}
            <button
              onClick={handleEmailPreview}
              className="w-full py-2.5 bg-[#1E40AF] text-white rounded-xl text-xs font-bold hover:bg-[#1E3A8A] transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <Eye className="w-4 h-4" strokeWidth={1.5} />
              Preview & Send
            </button>
          </div>

          {/* Sent email logs */}
          {emailLogs.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-[#E2E8F0]">
              <p className="text-[10px] text-[#94A3B8] uppercase tracking-wide font-medium">
                Recently Sent ({emailLogs.length})
              </p>
              {emailLogsLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 text-[#94A3B8] animate-spin" />
                </div>
              ) : (
                emailLogs.slice(0, 5).map(log => (
                  <div
                    key={log.id}
                    className="border border-[#E2E8F0] rounded-xl p-3"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Mail className="w-3 h-3 text-[#94A3B8]" strokeWidth={1.5} />
                      <p className="text-xs text-[#0F172A] font-bold truncate flex-1">{log.subject}</p>
                    </div>
                    <p className="text-[10px] text-[#64748B] font-normal truncate">
                      To: {Array.isArray(log.to) ? log.to.join(', ') : log.to}
                    </p>
                    <p className="text-[9px] text-[#94A3B8] font-normal mt-1">
                      {format(new Date(log.sent_at), 'dd MMM yyyy · HH:mm')} · by {log.sent_by}
                    </p>
                    <div className="flex gap-1.5 mt-2 pt-2 border-t border-[#F1F5F9]">
                      <button
                        onClick={() => setViewingLog(log)}
                        className="flex-1 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[9px] text-[#64748B] font-medium hover:bg-[#EFF6FF] hover:text-[#1E40AF] hover:border-[#1E40AF]/20 transition-colors cursor-pointer flex items-center justify-center gap-1"
                      >
                        <Eye className="w-3 h-3" strokeWidth={1.5} /> View
                      </button>
                      <button
                        onClick={() => handleResendEmail(log)}
                        className="flex-1 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[9px] text-[#64748B] font-medium hover:bg-[#EFF6FF] hover:text-[#1E40AF] hover:border-[#1E40AF]/20 transition-colors cursor-pointer flex items-center justify-center gap-1"
                      >
                        <RotateCw className="w-3 h-3" strokeWidth={1.5} /> Resend
                      </button>
                      <button
                        onClick={() => handleDeleteEmailLog(log.id)}
                        className="py-1.5 px-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[9px] text-[#94A3B8] font-medium hover:bg-[#FEF2F2] hover:text-[#B91C1C] hover:border-[#B91C1C]/20 transition-colors cursor-pointer flex items-center justify-center"
                      >
                        <Trash2 className="w-3 h-3" strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── EMAIL PREVIEW MODAL ─── */}
      <AnimatePresence>
        {showEmailPreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[999] bg-black/40 flex items-end justify-center"
            onClick={() => !emailOtpSending && setShowEmailPreview(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-t-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="sticky top-0 bg-white border-b border-[#E2E8F0] p-4 flex items-center justify-between z-10">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-[#1E40AF]" strokeWidth={2} />
                  <span className="text-xs text-[#0F172A] font-bold">Email Preview</span>
                </div>
                <button onClick={() => setShowEmailPreview(false)} className="text-[#94A3B8] cursor-pointer">
                  <X className="w-4 h-4" strokeWidth={1.5} />
                </button>
              </div>

              {/* Meta */}
              <div className="p-4 border-b border-[#E2E8F0] space-y-1.5">
                <div className="flex items-start gap-2">
                  <span className="text-[10px] text-[#94A3B8] uppercase tracking-wide font-medium w-12 shrink-0 pt-0.5">From</span>
                  <span className="text-xs text-[#0F172A] font-medium">{senderDisplay}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[10px] text-[#94A3B8] uppercase tracking-wide font-medium w-12 shrink-0 pt-0.5">To</span>
                  <span className="text-xs text-[#0F172A] font-normal break-all">
                    {mailMerge ? `${mailMergeRecipient} (mail merge)` : parseRecipients(emailTo).join(', ')}
                  </span>
                </div>
                {parseRecipients(emailCc).length > 0 && (
                  <div className="flex items-start gap-2">
                    <span className="text-[10px] text-[#94A3B8] uppercase tracking-wide font-medium w-12 shrink-0 pt-0.5">CC</span>
                    <span className="text-xs text-[#0F172A] font-normal break-all">{parseRecipients(emailCc).join(', ')}</span>
                  </div>
                )}
                {(parseRecipients(emailBcc).length > 0 || (mailMerge && parseRecipients(emailTo).length > 0)) && (
                  <div className="flex items-start gap-2">
                    <span className="text-[10px] text-[#94A3B8] uppercase tracking-wide font-medium w-12 shrink-0 pt-0.5">BCC</span>
                    <span className="text-xs text-[#0F172A] font-normal break-all">
                      {[...(mailMerge ? parseRecipients(emailTo) : []), ...parseRecipients(emailBcc)].join(', ')}
                    </span>
                  </div>
                )}
                <div className="flex items-start gap-2">
                  <span className="text-[10px] text-[#94A3B8] uppercase tracking-wide font-medium w-12 shrink-0 pt-0.5">Subj</span>
                  <span className="text-xs text-[#0F172A] font-bold">{emailSubject}</span>
                </div>
                {mailMerge && (
                  <div className="flex items-center gap-1 mt-1">
                    <Copy className="w-3 h-3 text-[#1E40AF]" strokeWidth={2} />
                    <span className="text-[9px] text-[#1E40AF] font-medium">Mail Merge — recipients won't see each other</span>
                  </div>
                )}
              </div>

              {/* Email body preview with simulated header */}
              <div className="p-4">
                <div className="border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
                  {/* SETU/GHAR/HCI header — exact Figma SVGs */}
                  {emailHeaderPreview}

                  {/* Body content */}
                  <div className="p-5">
                    {emailBody.split('\n').map((line, i) => (
                      <p key={i} className="text-sm text-[#0F172A] mb-2 leading-relaxed font-normal">
                        {line || '\u00A0'}
                      </p>
                    ))}
                  </div>

                  {/* Footer */}
                  <div className="border-t border-[#E2E8F0] p-4 text-center">
                    <p className="text-[8px] text-[#CBD5E1] font-normal">
                      Sent from {senderDisplay} on behalf of {APP_CONFIG.displayName}
                    </p>
                  </div>
                </div>
              </div>

              {/* Warning + Send */}
              <div className="sticky bottom-0 bg-white border-t border-[#E2E8F0] p-4 space-y-2">
                <div className="flex items-center gap-2 bg-[#FEF3C7] border border-[#F59E0B]/30 rounded-lg p-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-[#D97706] shrink-0" strokeWidth={2} />
                  <p className="text-[9px] text-[#92400E] font-normal">
                    A one-time verification code will be sent to <strong>{email}</strong> before this email is dispatched.
                  </p>
                </div>
                {emailOtpError && <p className="text-[10px] text-[#B91C1C] font-normal">{emailOtpError}</p>}
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowEmailPreview(false)}
                    className="flex-1 py-2.5 border border-[#E2E8F0] rounded-xl text-xs text-[#64748B] font-medium cursor-pointer hover:bg-[#F8FAFC] transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={handleRequestEmailOtp}
                    disabled={emailOtpSending}
                    className="flex-1 py-2.5 bg-[#B91C1C] text-white rounded-xl text-xs font-bold hover:bg-[#991B1B] transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {emailOtpSending ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Requesting Code...</>
                    ) : (
                      <><Mail className="w-3.5 h-3.5" strokeWidth={1.5} /> Authorize & Send</>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── EMAIL OTP VERIFICATION MODAL ─── */}
      <AnimatePresence>
        {showEmailOtp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[999] flex items-end justify-center bg-black/40 px-4 pt-8 sm:items-center sm:p-6"
            style={keyboardAwareModalPaddingStyle}
            onClick={() => !emailSending && setShowEmailOtp(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="max-h-[calc(100dvh-1rem)] w-full max-w-sm space-y-4 overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl"
              data-keyboard-aware-scroll
              style={getKeyboardAwareSheetStyle(420)}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#FEF2F2] rounded-xl flex items-center justify-center">
                  <Mail className="w-5 h-5 text-[#B91C1C]" strokeWidth={2} />
                </div>
                <div>
                  <p className="text-sm text-[#0F172A] font-bold">Email Send Verification</p>
                  <p className="text-[10px] text-[#64748B] font-normal">Critical account protection</p>
                </div>
              </div>

              <p className="text-xs text-[#64748B] font-normal">
                A 6-character verification code has been sent to <strong className="text-[#0F172A]">{email}</strong>. Enter it below to authorize sending from <strong className="text-[#0F172A]">{senderDisplay}</strong>.
              </p>

              <div>
                <label className={labelClass}>Verification Code</label>
                <input
                  type="text"
                  {...codeFieldProps}
                  value={emailOtpCode}
                  onChange={e => {
                    const val = e.target.value.replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 6);
                    setEmailOtpCode(val);
                  }}
                  placeholder="AAAAAA"
                  maxLength={6}
                  className={`${inputClass} text-center text-lg tracking-[0.5em] font-bold`}
                  enterKeyHint="done"
                />
              </div>

              {emailOtpError && <p className="text-[10px] text-[#B91C1C] font-normal">{emailOtpError}</p>}

              <div className="flex gap-3">
                <button
                  onClick={() => { setShowEmailOtp(false); setShowEmailPreview(true); }}
                  disabled={emailSending}
                  className="flex-1 py-2.5 border border-[#E2E8F0] rounded-xl text-xs text-[#64748B] font-medium cursor-pointer hover:bg-[#F8FAFC] transition-colors disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  onClick={handleVerifyAndSend}
                  disabled={emailSending || emailOtpCode.length !== 6}
                  className="flex-1 py-2.5 bg-[#B91C1C] text-white rounded-xl text-xs font-bold hover:bg-[#991B1B] transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {emailSending ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending...</>
                  ) : (
                    <><Mail className="w-3.5 h-3.5" strokeWidth={1.5} /> Verify & Send</>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── CITY GUIDE FORM MODAL ─── */}
      <AnimatePresence>
        {showCityGuideForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[999] flex items-end justify-center bg-black/40 px-4 pt-6"
            style={keyboardAwareModalPaddingStyle}
            onClick={() => !cityGuideSaving && !cityGuideGenerating && setShowCityGuideForm(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              onClick={(event) => event.stopPropagation()}
              className="w-full max-w-3xl space-y-4 overflow-y-auto rounded-t-2xl bg-white p-5"
              data-keyboard-aware-scroll
              style={getKeyboardAwareSheetStyle(860)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#0F172A] font-bold">
                    {editingCityGuide ? 'Edit City Guide' : 'New City Guide'}
                  </p>
                  <p className="text-[11px] text-[#64748B] mt-1">
                    Add places first, then generate a clean guide intro from those facts only.
                  </p>
                </div>
                <button onClick={() => setShowCityGuideForm(false)} className="text-[#94A3B8] cursor-pointer">
                  <X className="w-4 h-4" strokeWidth={1.5} />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <label className={labelClass}>City</label>
                  <input value={cityGuideCity} onChange={(e) => setCityGuideCity(e.target.value)} placeholder="Sydney" className={inputClass} enterKeyHint="next" />
                </div>
                <div>
                  <label className={labelClass}>State</label>
                  <input value={cityGuideState} onChange={(e) => setCityGuideState(e.target.value)} placeholder="NSW" className={inputClass} enterKeyHint="next" />
                </div>
                <div className="md:col-span-2">
                  <label className={labelClass}>Guide Title</label>
                  <input value={cityGuideTitle} onChange={(e) => setCityGuideTitle(e.target.value)} placeholder="Top 10 Cafes in Sydney" className={inputClass} enterKeyHint="next" />
                </div>
                <div className="md:col-span-2">
                  <label className={labelClass}>Cover Image URL</label>
                  <input value={cityGuideCoverImageUrl} onChange={(e) => setCityGuideCoverImageUrl(e.target.value)} placeholder="https://..." className={inputClass} enterKeyHint="next" {...urlFieldProps} />
                </div>
                <div>
                  <label className={labelClass}>App Variant</label>
                  <select
                    value={cityGuideVariant}
                    onChange={(e) => setCityGuideVariant(e.target.value as ContentAppVariant)}
                    className={inputClass}
                  >
                    {cityGuideVariantOptions.map((option) => (
                      <option key={`manual-guide-variant-${option.value}`} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Position</label>
                  <input value={cityGuidePosition} onChange={(e) => setCityGuidePosition(e.target.value)} placeholder="0" className={inputClass} enterKeyHint="next" {...numericFieldProps} />
                </div>
              </div>

              <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-[#0F172A]">Guide intro</p>
                    <p className="text-[11px] text-[#64748B] mt-1">
                      Use the structured places below, then let AI draft the intro. Place descriptions stay your source of truth.
                    </p>
                  </div>
                  <button
                    onClick={handleGenerateCityGuideIntro}
                    disabled={cityGuideGenerating}
                    className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-[#D8E3F0] bg-white px-3 py-2 text-[11px] font-semibold text-[#1E40AF] hover:bg-[#EEF2FF] disabled:opacity-50"
                  >
                    {cityGuideGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" strokeWidth={1.8} />}
                    {cityGuideGenerating ? 'Generating...' : 'Generate Blog'}
                  </button>
                </div>
                <textarea
                  value={cityGuideIntro}
                  onChange={(e) => setCityGuideIntro(e.target.value)}
                  placeholder="Intro copy for the guide"
                  rows={5}
                  className={inputClass}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-[#0F172A]">Places</p>
                    <p className="text-[11px] text-[#64748B] mt-1">
                      Add a map URL or direct coordinates. Saving is blocked until each place has coordinates we can open in Hoodie Map.
                    </p>
                  </div>
                  <button
                    onClick={() => setCityGuidePlaces((current) => [...current, createEmptyGuidePlace(current.length)])}
                    className="inline-flex items-center gap-2 rounded-xl border border-[#D8E3F0] bg-white px-3 py-2 text-[11px] font-semibold text-[#1E40AF] hover:bg-[#EEF2FF]"
                  >
                    <Plus className="w-3.5 h-3.5" strokeWidth={1.8} />
                    Add Place
                  </button>
                </div>

                {cityGuidePlaces.map((place, index) => (
                  <div key={place.id} className="rounded-2xl border border-[#E2E8F0] bg-white p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-[#0F172A]">Place {index + 1}</p>
                      {cityGuidePlaces.length > 1 && (
                        <button
                          onClick={() => setCityGuidePlaces((current) => current.filter((_, currentIndex) => currentIndex !== index))}
                          className="text-[11px] font-semibold text-[#B91C1C] hover:text-[#991B1B]"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div>
                        <label className={labelClass}>Name</label>
                        <input value={place.name} onChange={(e) => updateGuidePlaceField(index, 'name', e.target.value)} placeholder="Cafe name" className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>Position</label>
                        <input value={place.position} onChange={(e) => updateGuidePlaceField(index, 'position', e.target.value)} placeholder="0" className={inputClass} />
                      </div>
                      <div className="md:col-span-2">
                        <label className={labelClass}>Description</label>
                        <textarea value={place.description} onChange={(e) => updateGuidePlaceField(index, 'description', e.target.value)} rows={3} placeholder="Short editorial description" className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>Image URL</label>
                        <input value={place.image_url} onChange={(e) => updateGuidePlaceField(index, 'image_url', e.target.value)} placeholder="https://..." className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>Navigation Link</label>
                        <input value={place.navigation_link} onChange={(e) => updateGuidePlaceField(index, 'navigation_link', e.target.value)} placeholder="Google Maps, Apple Maps, or lat,lng" className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>Latitude</label>
                        <input value={place.lat} onChange={(e) => updateGuidePlaceField(index, 'lat', e.target.value)} placeholder="-33.8688" className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>Longitude</label>
                        <input value={place.lng} onChange={(e) => updateGuidePlaceField(index, 'lng', e.target.value)} placeholder="151.2093" className={inputClass} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {cityGuideError && <p className="text-[11px] text-[#B91C1C]">{cityGuideError}</p>}

              <div className="flex items-center justify-end gap-3 border-t border-[#E2E8F0] pt-4">
                <button
                  onClick={() => setShowCityGuideForm(false)}
                  className="rounded-xl border border-[#E2E8F0] px-4 py-2.5 text-[11px] font-semibold text-[#64748B] hover:bg-[#F8FAFC]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveCityGuide}
                  disabled={cityGuideSaving}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#1E40AF] px-4 py-2.5 text-[11px] font-semibold text-white hover:bg-[#1E3A8A] disabled:opacity-50"
                >
                  {cityGuideSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  {cityGuideSaving ? 'Saving...' : editingCityGuide ? 'Save Guide' : 'Create Guide'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── CONFIRM MODAL ─── */}
      <AnimatePresence>
        {confirmAction && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[999] bg-black/40 flex items-center justify-center p-6"
            onClick={() => !actionLoading && setConfirmAction(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-xl space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#FEF2F2] rounded-xl flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-[#B91C1C]" strokeWidth={2} />
                </div>
                <p className="text-sm text-[#0F172A] font-bold">Confirm Action</p>
              </div>
              <p className="text-xs text-[#64748B] font-normal">{confirmAction.label}</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmAction(null)}
                  disabled={actionLoading}
                  className="flex-1 py-2.5 border border-[#E2E8F0] rounded-xl text-xs text-[#64748B] font-medium cursor-pointer hover:bg-[#F8FAFC] transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={executeConfirm}
                  disabled={actionLoading}
                  className={`flex-1 py-2.5 rounded-xl text-xs text-white font-bold cursor-pointer transition-colors disabled:opacity-50 ${
                    confirmAction.type === 'restore-marker'
                      ? 'bg-[#16A34A] hover:bg-[#15803D]'
                      : 'bg-[#B91C1C] hover:bg-[#991B1B]'
                  }`}
                >
                  {actionLoading ? 'Processing...' : confirmAction.type === 'restore-marker' ? 'Restore' : 'Confirm'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── BULLETIN FORM MODAL ─── */}
      <AnimatePresence>
        {showBulletinForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[999] flex items-end justify-center bg-black/40 px-4 pt-6"
            style={keyboardAwareModalPaddingStyle}
            onClick={() => !bulletinSaving && setShowBulletinForm(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-lg space-y-3 overflow-y-auto rounded-t-2xl bg-white p-5"
              data-keyboard-aware-scroll
              style={getKeyboardAwareSheetStyle(620)}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-[#0F172A] font-bold">
                  {editingBulletin ? 'Edit Announcement' : 'New Announcement'}
                </span>
                <button onClick={() => setShowBulletinForm(false)} className="text-[#94A3B8] cursor-pointer">
                  <X className="w-4 h-4" strokeWidth={1.5} />
                </button>
              </div>
              <div>
                <label className={labelClass}>Title</label>
                <input
                  value={bulletinTitle}
                  onChange={e => setBulletinTitle(e.target.value)}
                  placeholder="Announcement title"
                  className={inputClass}
                  enterKeyHint="next"
                />
              </div>
              <div>
                <label className={labelClass}>Body</label>
                <textarea
                  value={bulletinBody}
                  onChange={e => setBulletinBody(e.target.value)}
                  placeholder="Announcement message..."
                  rows={3}
                  className={`${inputClass} resize-none`}
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className={labelClass}>Target Postcode</label>
                  <input
                    value={bulletinPostcode}
                    onChange={e => setBulletinPostcode(e.target.value)}
                    placeholder="ALL or specific postcode"
                    className={inputClass}
                    enterKeyHint="next"
                  />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={bulletinUrgent}
                      onChange={e => setBulletinUrgent(e.target.checked)}
                      className="w-4 h-4 rounded accent-[#B91C1C]"
                    />
                    <span className="text-[10px] text-[#B91C1C] font-medium uppercase tracking-wide">Urgent</span>
                  </label>
                </div>
              </div>
              <div>
                <label className={labelClass}>Target App</label>
                <select
                  value={bulletinVariant}
                  onChange={e => setBulletinVariant(e.target.value as ContentAppVariant)}
                  className={inputClass}
                >
                  {cityGuideVariantOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              {bulletinError && <p className="text-[10px] text-[#B91C1C] font-normal">{bulletinError}</p>}
              <button
                onClick={handleSaveBulletin}
                disabled={bulletinSaving}
                className="w-full py-2.5 bg-[#B91C1C] text-white rounded-xl text-xs font-bold hover:bg-[#991B1B] transition-colors cursor-pointer disabled:opacity-50"
              >
                {bulletinSaving ? 'Saving...' : editingBulletin ? 'Update Announcement' : 'Publish Announcement'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── MARKER EDIT FORM MODAL ─── */}
      <AnimatePresence>
        {showMarkerEdit && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[999] flex items-end justify-center bg-black/40 px-4 pt-6"
            style={keyboardAwareModalPaddingStyle}
            onClick={() => !markerSaving && setShowMarkerEdit(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-lg space-y-3 overflow-y-auto rounded-t-2xl bg-white p-5"
              data-keyboard-aware-scroll
              style={getKeyboardAwareSheetStyle(620)}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-[#0F172A] font-bold">
                  Edit Marker
                </span>
                <button onClick={() => setShowMarkerEdit(false)} className="text-[#94A3B8] cursor-pointer">
                  <X className="w-4 h-4" strokeWidth={1.5} />
                </button>
              </div>
              <div>
                <label className={labelClass}>Address</label>
                <input
                  value={markerAddress}
                  onChange={e => setMarkerAddress(e.target.value)}
                  placeholder="Marker address"
                  className={inputClass}
                  enterKeyHint="next"
                />
              </div>
              <div>
                <label className={labelClass}>Suburb</label>
                <input
                  value={markerSuburb}
                  onChange={e => setMarkerSuburb(e.target.value)}
                  placeholder="Marker suburb"
                  className={inputClass}
                  enterKeyHint="next"
                />
              </div>
              <div>
                <label className={labelClass}>Postcode</label>
                <input
                  value={markerPostcode}
                  onChange={e => setMarkerPostcode(e.target.value)}
                  placeholder="Marker postcode"
                  className={inputClass}
                  enterKeyHint="next"
                  {...numericFieldProps}
                />
              </div>
              <div>
                <label className={labelClass}>Category</label>
                <select
                  value={markerCategory}
                  onChange={e => setMarkerCategory(e.target.value as 'scam' | 'maintenance')}
                  className={inputClass}
                >
                  <option value="scam">Scam</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Description</label>
                <textarea
                  value={markerDescription}
                  onChange={e => setMarkerDescription(e.target.value)}
                  placeholder="Marker description..."
                  rows={3}
                  className={`${inputClass} resize-none`}
                />
              </div>
              {markerError && <p className="text-[10px] text-[#B91C1C] font-normal">{markerError}</p>}
              <button
                onClick={handleSaveMarker}
                disabled={markerSaving}
                className="w-full py-2.5 bg-[#B91C1C] text-white rounded-xl text-xs font-bold hover:bg-[#991B1B] transition-colors cursor-pointer disabled:opacity-50"
              >
                {markerSaving ? 'Saving...' : 'Update Marker'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── EMAIL LOG PREVIEW MODAL ─── */}
      <AnimatePresence>
        {viewingLog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[999] bg-black/40 flex items-end justify-center"
            onClick={() => setViewingLog(null)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-t-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="sticky top-0 bg-white border-b border-[#E2E8F0] p-4 flex items-center justify-between z-10">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[#1E40AF]" strokeWidth={2} />
                  <span className="text-xs text-[#0F172A] font-bold">Sent Email</span>
                  <span className="text-[8px] text-[#94A3B8] font-normal">
                    {format(new Date(viewingLog.sent_at), 'dd MMM yyyy · HH:mm')}
                  </span>
                </div>
                <button onClick={() => setViewingLog(null)} className="text-[#94A3B8] cursor-pointer">
                  <X className="w-4 h-4" strokeWidth={1.5} />
                </button>
              </div>

              {/* Meta */}
              <div className="p-4 border-b border-[#E2E8F0] space-y-1.5">
                <div className="flex items-start gap-2">
                  <span className="text-[10px] text-[#94A3B8] uppercase tracking-wide font-medium w-12 shrink-0 pt-0.5">From</span>
                  <span className="text-xs text-[#0F172A] font-medium">{senderDisplay}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[10px] text-[#94A3B8] uppercase tracking-wide font-medium w-12 shrink-0 pt-0.5">To</span>
                  <span className="text-xs text-[#0F172A] font-normal break-all">
                    {Array.isArray(viewingLog.to) ? viewingLog.to.join(', ') : viewingLog.to || '—'}
                  </span>
                </div>
                {Array.isArray(viewingLog.cc) && viewingLog.cc.length > 0 && (
                  <div className="flex items-start gap-2">
                    <span className="text-[10px] text-[#94A3B8] uppercase tracking-wide font-medium w-12 shrink-0 pt-0.5">CC</span>
                    <span className="text-xs text-[#0F172A] font-normal break-all">{viewingLog.cc.join(', ')}</span>
                  </div>
                )}
                {Array.isArray(viewingLog.bcc) && viewingLog.bcc.length > 0 && (
                  <div className="flex items-start gap-2">
                    <span className="text-[10px] text-[#94A3B8] uppercase tracking-wide font-medium w-12 shrink-0 pt-0.5">BCC</span>
                    <span className="text-xs text-[#0F172A] font-normal break-all">{viewingLog.bcc.join(', ')}</span>
                  </div>
                )}
                <div className="flex items-start gap-2">
                  <span className="text-[10px] text-[#94A3B8] uppercase tracking-wide font-medium w-12 shrink-0 pt-0.5">Subj</span>
                  <span className="text-xs text-[#0F172A] font-bold">{viewingLog.subject}</span>
                </div>
                {viewingLog.is_mail_merge && (
                  <div className="flex items-center gap-1 mt-1">
                    <Copy className="w-3 h-3 text-[#1E40AF]" strokeWidth={2} />
                    <span className="text-[9px] text-[#1E40AF] font-medium">Sent as Mail Merge</span>
                  </div>
                )}
                <p className="text-[9px] text-[#94A3B8] font-normal">
                  Sent by {viewingLog.sent_by}
                </p>
              </div>

              {/* Body preview */}
              <div className="p-4">
                <div className="border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
                  {/* Header — exact Figma SVGs */}
                  {emailHeaderPreview}

                  {/* Body content */}
                  <div className="p-5">
                    {viewingLog.body_plain ? (
                      viewingLog.body_plain.split('\n').map((line: string, i: number) => (
                        <p key={i} className="text-sm text-[#0F172A] mb-2 leading-relaxed font-normal">
                          {line || '\u00A0'}
                        </p>
                      ))
                    ) : viewingLog.body_html ? (
                      <div dangerouslySetInnerHTML={{ __html: viewingLog.body_html }} />
                    ) : (
                      <p className="text-sm text-[#94A3B8] italic font-normal">Email body not stored in this log.</p>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="border-t border-[#E2E8F0] p-4 text-center">
                    <p className="text-[8px] text-[#CBD5E1] font-normal">
                      Sent from {senderDisplay} on behalf of {APP_CONFIG.displayName}
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="sticky bottom-0 bg-white border-t border-[#E2E8F0] p-4">
                <div className="flex gap-3">
                  <button
                    onClick={() => handleResendEmail(viewingLog)}
                    className="flex-1 py-2.5 bg-[#1E40AF] text-white rounded-xl text-xs font-bold hover:bg-[#1E3A8A] transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    <RotateCw className="w-3.5 h-3.5" strokeWidth={1.5} /> Resend
                  </button>
                  <button
                    onClick={() => handleDeleteEmailLog(viewingLog.id)}
                    className="py-2.5 px-4 border border-[#E2E8F0] rounded-xl text-xs text-[#B91C1C] font-medium cursor-pointer hover:bg-[#FEF2F2] hover:border-[#B91C1C]/20 transition-colors flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} /> Delete
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
