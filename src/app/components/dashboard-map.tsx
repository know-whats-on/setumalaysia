import { Browser } from '@capacitor/browser';
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Plus, X, AlertTriangle, Wrench, Search, MapPin, Navigation, Home, CheckCircle, ChevronRight, ChevronDown, ChevronLeft, Crosshair, ShieldAlert, Train, Bus, Trash2, TramFront, Shield, CircleDot, Layers, Globe, GraduationCap, Landmark, Map as MapIcon, Building, Minus, ShoppingBasket, Anchor, Briefcase, TrendingUp, Plane, Hospital, Info, BarChart3, Fuel, Accessibility, Clock3, Toilet, Baby, Droplets, KeyRound, CircleDollarSign } from 'lucide-react';
import { categoryLabels, categoryColors } from '../lib/mock-data';
import type { Listing, RentalEntry } from '../lib/mock-data';
import { searchAddress, searchOpenMapLocations, fetchRentalHistory, fetchProfile, fetchPropertyPedigree, deleteListing, fetchNearbyFuelStations, fetchTransportEligibility, fetchTransportTrips, fetchTransportDepartures, fetchTransportRetailers, fetchTransportStatus, warmTransportProvider, fetchOverpassData as overpassFetch, fetchPublicToilets } from '../lib/api';
import type { NominatimResult, PropertyPedigree, FuelStationResult, TransportAlert, TransportDeparture, TransportEligibility, TransportLocationReference, TransportProvider, TransportRetailer, TransportStatusItem, TransportTripOption, PublicToiletLocation, PublicToiletBounds } from '../lib/api';
import { GEO_ERROR_CODES, getCurrentAppPosition } from '../lib/geolocation';
import { airportData } from '../lib/geo-data';
import policeLocations from '../../imports/ghar_police_locations.json';
import hospitalLocations from '../../imports/ghar_hospital_locations.json';
import { lookupCrimeFromAddress, getCautionStyle, type GenericCrimeRecord } from '../lib/suburb-crime-map';
import { HOODIE_FEATURED_NAV_GEOMETRY } from '../lib/hoodie-nav-geometry';
import { isNativeShell } from '../lib/platform';
import * as turf from '@turf/turf';
import { universityCoordinates } from '../lib/au-universities';
import { indianConsulates } from '../lib/au-consulates';
import { APP_CONFIG } from '../lib/app-config';
import { BAYSIDE_WARD_BOUNDARY_URL } from '../lib/wolli-content';
import { createAsyncRequestCache } from '../lib/async-request-cache';
import { resolveGlobeJobHubVenues } from '../lib/dashboard-job-hubs';
import { resolveDashboardMapSearchResults } from '../lib/dashboard-map-search';
import {
  buildEmploymentZoneQuery,
  buildJobHeatmapGeoJSON,
  calculateEmploymentScore,
  formatEmploymentVenueCountLabel,
  type EmploymentAnalysis,
  type JobVenue,
  normalizeEmploymentVenues,
} from '../lib/employment-zones';
import {
  buildFocusedMapTargetDirectionsUrl,
  buildMapDirectionsUrl,
  buildFocusedMapTargetReturnRoute,
  getFocusedMapTargetBadge,
  getFocusedMapTargetBodyText,
  getFocusedMapTargetContextState,
  getFocusedMapTargetContextSuburb,
  getFocusedMapTargetLocationText,
  getFocusedMapTargetReturnLabel,
  hasValidFocusedMapCoordinatePair,
  type DashboardFocusedMapTarget,
  type DashboardInitialMapSearch,
  type MapDirectionsTarget,
} from '../lib/focused-map-targets';
import {
  PUBLIC_TOILET_FILTERS,
  formatPublicToiletDistance,
  sortPublicToiletsForResults,
  type PublicToiletFilterId,
} from '../lib/public-toilets';
import { format } from 'date-fns';
import MapGL, { Marker, Popup, NavigationControl, Source, Layer } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from './ui/drawer';
import { HoodieHelpTrigger, useHoodieHelpTour } from './hoodie-help-tour';
import wooliesButtonIcon from "../woolies-button.svg";
import colesButtonIcon from "../coles-button.svg";
import aldiButtonIcon from "../aldi-button.svg";
import saveButtonIcon from "../save-button.svg";
import opalButtonIcon from "../assets-opal-button.svg";
import actTransportButtonIcon from "../act-transport-button.svg";
import adelaideMetroButtonIcon from "../adelaide-metro-button.svg";
import metroTasmaniaButtonIcon from "../metrotasmania-button.svg";
import ntButtonIcon from "../nt-button.svg";
import ptvButtonIcon from "../ptv-button.svg";
import transPerthButtonIcon from "../transperth-button.svg";
import translinkButtonIcon from "../translink-button.svg";
import suburbsGeometryDataRaw from '../../imports/pasted_text/suburb-boundaries.json';
import suburbBoundaries1 from '../../imports/pasted_text/suburb-boundaries-1.json';
import actonBoundary from '../../imports/pasted_text/acton-boundary.json';
import adelaideCity from '../../imports/pasted_text/adelaide-city.json';
import northSydneyCouncil from '../../imports/pasted_text/north-sydney-council.json';
import robinaBoundary from '../../imports/pasted_text/robina-boundary.json';
import uniData0 from '../../imports/pasted_text/university-locations.json';
import uniData1 from '../../imports/pasted_text/university-locations-1.json';
import uniData2 from '../../imports/pasted_text/university-locations-2.json';
import uniData3 from '../../imports/pasted_text/university-locations-3.json';
import uniData4 from '../../imports/pasted_text/university-locations-4.json';

const suburbsGeometryData: Record<string, any> = { 
  ...suburbsGeometryDataRaw,
  ...suburbBoundaries1,
  ...actonBoundary,
  ...adelaideCity,
  ...northSydneyCouncil,
  ...robinaBoundary
};

[uniData0, uniData1, uniData2, uniData3, uniData4].forEach(data => {
  Object.values(data).forEach((suburbs) => {
    Object.assign(suburbsGeometryData, suburbs);
  });
});

interface DashboardMapProps {
  onNewReport: () => void;
  onSelectListing: (listing: Listing) => void;
  onDeleteListing?: (listingId: string) => Promise<void>;
  listings: Listing[];
  initialSearch?: DashboardInitialMapSearch | null;
  onInitialSearchConsumed?: () => void;
  initialTransportMenuOpenToken?: number | null;
  onInitialTransportMenuOpenConsumed?: () => void;
}

interface BuildingCluster {
  key: string;
  lat: number;
  lng: number;
  address: string;
  listings: Listing[];
}

type MapInitSource = 'gps' | 'home' | 'university' | 'default';
type PlannerLocationSuggestion = NominatimResult;
type DashboardSearchMode = 'address' | 'transport' | 'fuel' | 'groceries';
type DashboardInitialTransportTarget = {
  name: string;
  address?: string;
  state?: string;
  lat: number;
  lng: number;
};
const SHOPPING_TRANSPORT_TARGET_STORAGE_KEY = 'ghar_shopping_transport_target';
type FocusedMapPanelView = 'place' | 'context';
type DashboardSearchOpenOptions = {
  openCommuterContext?: boolean;
  preserveFocusedTarget?: boolean;
};

function normalizeAustralianStateLabel(value: string) {
  const normalized = String(value || '').trim().toLowerCase().replace(/\./g, '');
  const map: Record<string, string> = {
    nsw: 'NSW',
    'new south wales': 'NSW',
    vic: 'VIC',
    victoria: 'VIC',
    qld: 'QLD',
    queensland: 'QLD',
    wa: 'WA',
    'western australia': 'WA',
    sa: 'SA',
    'south australia': 'SA',
    tas: 'TAS',
    tasmania: 'TAS',
    act: 'ACT',
    'australian capital territory': 'ACT',
    nt: 'NT',
    'northern territory': 'NT',
  };
  return map[normalized] || '';
}

type FocusedTargetDirectionsOption = {
  id: 'apple' | 'google' | 'waze';
  label: string;
  subtitle: string;
};

const FOCUSED_TARGET_DIRECTIONS_OPTIONS: FocusedTargetDirectionsOption[] = [
  {
    id: 'apple',
    label: 'Apple Maps',
    subtitle: 'Open turn-by-turn directions in Apple Maps',
  },
  {
    id: 'google',
    label: 'Google Maps',
    subtitle: 'Open directions in Google Maps',
  },
  {
    id: 'waze',
    label: 'Waze',
    subtitle: 'Open community-powered directions in Waze',
  },
];

function getClientPlatform() {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent.toLowerCase() : '';
  return {
    isAndroid: /android/.test(ua),
    isIos: /iphone|ipad|ipod/.test(ua),
  };
}

const FUEL_SUPPORTED_STATES = new Set(['NSW', 'VIC', 'QLD', 'TAS', 'WA', 'SA']);
const FUEL_SUPPORTED_STATE_COPY = 'NSW, Victoria, Queensland, Tasmania, South Australia, or WA';
const FUEL_PRODUCT_FILTERS = [
  { id: 'unleaded_up', label: 'UP' },
  { id: 'premium_up', label: 'Premium UP' },
  { id: 'diesel', label: 'Diesel' },
  { id: 'brand_diesel', label: 'Brand Diesel' },
  { id: 'lpg', label: 'LPG' },
  { id: 'e85', label: 'E85' },
] as const;
const ALL_FUEL_PRODUCT_IDS = FUEL_PRODUCT_FILTERS.map((option) => option.id);
const FUEL_PRODUCT_LABELS = Object.fromEntries(
  FUEL_PRODUCT_FILTERS.map((option) => [option.id, option.label]),
) as Record<(typeof FUEL_PRODUCT_FILTERS)[number]['id'], string>;
const OPAL_MODE_OPTIONS = [
  { id: 'train', label: 'Train' },
  { id: 'metro', label: 'Metro' },
  { id: 'light_rail', label: 'Light Rail' },
  { id: 'bus', label: 'Bus' },
  { id: 'coach', label: 'Coach' },
  { id: 'ferry', label: 'Ferry' },
  { id: 'school_bus', label: 'School' },
] as const;
const ALL_OPAL_MODE_IDS = OPAL_MODE_OPTIONS.map((option) => option.id);
const QLD_OPAL_MODE_IDS = ['train', 'light_rail', 'bus', 'ferry'] as const;
const SA_OPAL_MODE_IDS = ['train', 'light_rail', 'bus'] as const;
const TAS_OPAL_MODE_IDS = ['bus', 'ferry'] as const;
const WA_OPAL_MODE_IDS = ['train', 'bus', 'ferry'] as const;
const ACT_OPAL_MODE_IDS = ['light_rail', 'bus'] as const;
const NT_OPAL_MODE_IDS = ['bus'] as const;

type TransportNetworkId = 'nsw' | 'qld' | 'vic' | 'wa' | 'sa' | 'tas' | 'nt' | 'act';
type GroceryRetailerId = 'woolworths' | 'coles' | 'aldi' | 'compare';

type TransportNetworkConfig = {
  id: TransportNetworkId;
  state: string;
  label: string;
  subtitle: string;
  provider?: TransportProvider;
  support: 'in_app' | 'maps';
  logo: string;
};

const TRANSPORT_NETWORKS: TransportNetworkConfig[] = [
  {
    id: 'nsw',
    state: 'NSW',
    label: 'Transport for NSW',
    subtitle: 'Opal trip planning in app',
    provider: 'tfnsw',
    support: 'in_app',
    logo: opalButtonIcon,
  },
  {
    id: 'qld',
    state: 'QLD',
    label: 'Translink',
    subtitle: 'Translink trip planning in app',
    provider: 'transport_qld',
    support: 'in_app',
    logo: translinkButtonIcon,
  },
  {
    id: 'vic',
    state: 'VIC',
    label: 'Public Transport Victoria',
    subtitle: 'PTV trip planning in app',
    provider: 'transport_vic',
    support: 'in_app',
    logo: ptvButtonIcon,
  },
  {
    id: 'wa',
    state: 'WA',
    label: 'Public Transport WA',
    subtitle: 'WA trip planning in app',
    provider: 'transport_wa',
    support: 'in_app',
    logo: transPerthButtonIcon,
  },
  {
    id: 'sa',
    state: 'SA',
    label: 'Adelaide Metro',
    subtitle: 'Adelaide Metro trip planning in app',
    provider: 'transport_sa',
    support: 'in_app',
    logo: adelaideMetroButtonIcon,
  },
  {
    id: 'tas',
    state: 'TAS',
    label: 'Public Transport Tasmania',
    subtitle: 'Tasmania trip planning in app',
    provider: 'transport_tas',
    support: 'in_app',
    logo: metroTasmaniaButtonIcon,
  },
  {
    id: 'nt',
    state: 'NT',
    label: 'Public Transport NT',
    subtitle: 'NT trip planning in app',
    provider: 'transport_nt',
    support: 'in_app',
    logo: ntButtonIcon,
  },
  {
    id: 'act',
    state: 'ACT',
    label: 'Transport Canberra',
    subtitle: 'Transport Canberra trip planning in app',
    provider: 'transport_act',
    support: 'in_app',
    logo: actTransportButtonIcon,
  },
];

const TRANSPORT_NETWORK_BURST_POSITIONS: Record<TransportNetworkId, { x: number; y: number }> = {
  nsw: { x: 0, y: -140 },
  qld: { x: 99, y: -99 },
  vic: { x: 140, y: 0 },
  wa: { x: 99, y: 99 },
  sa: { x: 0, y: 140 },
  tas: { x: -99, y: 99 },
  nt: { x: -140, y: 0 },
  act: { x: -99, y: -99 },
};

const SYDNEY_TIMEZONE = 'Australia/Sydney';
const sydneyCalendarFormatter = new Intl.DateTimeFormat('en-AU', {
  timeZone: SYDNEY_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

type SydneyCalendarParts = {
  year: number;
  month: number;
  day: number;
};

function getSydneyCalendarParts(value: Date): SydneyCalendarParts | null {
  if (Number.isNaN(value.getTime())) return null;

  const parsed = sydneyCalendarFormatter.formatToParts(value).reduce<Record<string, string>>((acc, part) => {
    if (part.type === 'year' || part.type === 'month' || part.type === 'day') {
      acc[part.type] = part.value;
    }
    return acc;
  }, {});

  const year = Number(parsed.year);
  const month = Number(parsed.month);
  const day = Number(parsed.day);

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }

  return { year, month, day };
}

function getSydneyCalendarDayIndex(parts: SydneyCalendarParts) {
  return Math.floor(Date.UTC(parts.year, parts.month - 1, parts.day) / 86400000);
}

function formatElapsedAge(value: number, unit: 'day' | 'week' | 'month') {
  return `${value} ${unit}${value === 1 ? '' : 's'} ago`;
}

function getScamAlertRecencyLabel(isoStr?: string) {
  if (!isoStr) return 'Recent';

  try {
    const createdAt = new Date(isoStr);
    const createdParts = getSydneyCalendarParts(createdAt);
    const nowParts = getSydneyCalendarParts(new Date());

    if (!createdParts || !nowParts) return 'Recent';

    const dayDiff = getSydneyCalendarDayIndex(nowParts) - getSydneyCalendarDayIndex(createdParts);

    if (dayDiff <= 0) return 'Today';
    if (dayDiff === 1) return '1 day ago';
    if (dayDiff < 7) return formatElapsedAge(dayDiff, 'day');
    if (dayDiff < 30) return formatElapsedAge(Math.max(1, Math.floor(dayDiff / 7)), 'week');
    return formatElapsedAge(Math.max(1, Math.floor(dayDiff / 30)), 'month');
  } catch {
    return 'Recent';
  }
}

function applyMapProjectionWhenReady(map: any, projection: 'globe' | 'mercator') {
  let animationFrame: number | null = null;

  const tryApplyProjection = () => {
    try {
      if (typeof map?.isStyleLoaded === 'function' && !map.isStyleLoaded()) {
        return false;
      }
      const currentProjection = map?.getProjection?.()?.type;
      if (currentProjection !== projection) {
        map?.setProjection?.({ type: projection });
      }
      return true;
    } catch (error) {
      console.warn('GHAR projection update deferred:', error);
      return false;
    }
  };

  if (tryApplyProjection()) {
    return () => {
      if (animationFrame !== null && typeof window !== 'undefined') {
        window.cancelAnimationFrame(animationFrame);
      }
    };
  }

  const handleStyleData = () => {
    if (!tryApplyProjection()) return;
    map?.off?.('styledata', handleStyleData);
  };

  map?.on?.('styledata', handleStyleData);

  if (typeof window !== 'undefined') {
    animationFrame = window.requestAnimationFrame(handleStyleData);
  }

  return () => {
    map?.off?.('styledata', handleStyleData);
    if (animationFrame !== null && typeof window !== 'undefined') {
      window.cancelAnimationFrame(animationFrame);
    }
  };
}
const TRANSPORT_BURST_STAGGER_MS = 26;
const TRANSPORT_BURST_TRANSITION_MS = 500;
const TRANSPORT_BURST_CLOSE_MS = TRANSPORT_BURST_TRANSITION_MS + (TRANSPORT_NETWORKS.length - 1) * TRANSPORT_BURST_STAGGER_MS + 40;
const GROCERY_RETAILERS: Array<{ id: GroceryRetailerId; label: string; logo: string }> = [
  { id: 'woolworths', label: 'Woolworths', logo: wooliesButtonIcon },
  { id: 'coles', label: 'Coles', logo: colesButtonIcon },
  { id: 'aldi', label: 'ALDI', logo: aldiButtonIcon },
  { id: 'compare', label: 'Compare', logo: saveButtonIcon },
];
const GROCERY_BURST_POSITIONS: Record<GroceryRetailerId, { x: number; y: number }> = {
  woolworths: { x: -94, y: -94 },
  compare: { x: 94, y: -94 },
  coles: { x: 94, y: 54 },
  aldi: { x: -94, y: 54 },
};
const GROCERY_BURST_STAGGER_MS = 34;
const GROCERY_BURST_TRANSITION_MS = 420;
const GROCERY_BURST_CLOSE_MS = GROCERY_BURST_TRANSITION_MS + (GROCERY_RETAILERS.length - 1) * GROCERY_BURST_STAGGER_MS + 40;
const VICTORIA_PREVIEW_TRIP_PREFIX = 'transport-vic-preview';
const VICTORIA_PREVIEW_ORIGIN = {
  lat: -37.72118,
  lng: 145.04817,
  name: 'La Trobe University (Bundoora Campus)',
  subtitle: 'Kingsbury Dr, Bundoora VIC',
};
const VICTORIA_PREVIEW_DESTINATION = {
  lat: -37.81025,
  lng: 144.96274,
  name: 'Melbourne Central',
  subtitle: 'Swanston St, Melbourne VIC',
};

function CreativeCommonsMark({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 ${className}`} aria-label="Creative Commons">
      <span className="flex h-4 w-4 items-center justify-center rounded-full border border-current text-[8px] font-bold leading-none">C</span>
      <span className="flex h-4 w-4 items-center justify-center rounded-full border border-current text-[8px] font-bold leading-none">C</span>
    </span>
  );
}

function getTransportProviderName(provider?: TransportEligibility['provider']) {
  if (provider === 'transport_act') return 'Transport Canberra';
  if (provider === 'transport_vic') return 'Public Transport Victoria';
  if (provider === 'transport_qld') return 'Translink';
  if (provider === 'transport_sa') return 'Adelaide Metro';
  if (provider === 'transport_tas') return 'Public Transport Tasmania';
  if (provider === 'transport_wa') return 'Public Transport WA';
  if (provider === 'transport_nt') return 'Public Transport NT';
  return 'Transport for NSW';
}

function shouldUseVictoriaPreviewFallback(message: string) {
  const cleanMessage = String(message || '').trim().toLowerCase();
  if (!cleanMessage) return true;
  return /transport victoria gtfs source is missing|transport victoria gtfs cache is missing|failed to fetch transport trips|failed to search transport locations|request failed|load failed|network request failed|the internet connection appears to be offline|could not connect to the server|timed out|timeout/.test(cleanMessage);
}

function shouldUseTfnswMapsFallback(message: string) {
  const cleanMessage = String(message || '').trim().toLowerCase();
  if (!cleanMessage) return false;
  return /http 429|quota or rate limit|temporarily rate-limiting ghar live trip data|transport for nsw is temporarily rate-limiting/i.test(cleanMessage);
}

function sanitizeTransportPreviewLabel(value: string | undefined, fallback: string) {
  const clean = String(value || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)[0];
  return clean || fallback;
}

function addMinutesToDate(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

function buildVictoriaPreviewBaseTime(whenMode: 'leave_now' | 'depart_at' | 'arrive_by', date: string, time: string) {
  if (whenMode !== 'leave_now' && date && time) {
    const explicit = new Date(`${date}T${time}:00`);
    if (!Number.isNaN(explicit.getTime())) return explicit;
  }
  const now = new Date();
  const rounded = new Date(now);
  rounded.setSeconds(0, 0);
  const remainder = rounded.getMinutes() % 5;
  if (remainder !== 0) rounded.setMinutes(rounded.getMinutes() + (5 - remainder));
  return rounded;
}

function createVictoriaPreviewAlert(id: string, title: string): TransportAlert {
  return {
    id,
    title,
    priority: 'medium',
    provider: 'transport_vic',
    lineIds: [],
    stopIds: [],
    tripIds: [],
  };
}

function buildVictoriaPreviewTrips(params: {
  origin: TransportLocationReference;
  destination: TransportLocationReference;
  whenMode: 'leave_now' | 'depart_at' | 'arrive_by';
  date: string;
  time: string;
  modes: string[];
  wheelchairOnly: boolean;
}): TransportTripOption[] {
  const originName = sanitizeTransportPreviewLabel(params.origin.name || params.origin.subtitle, 'Origin');
  const destinationName = sanitizeTransportPreviewLabel(params.destination.name || params.destination.subtitle, 'Destination');
  const originSubtitle = params.origin.subtitle || `${originName}, Victoria`;
  const destinationSubtitle = params.destination.subtitle || `${destinationName}, Victoria`;
  const originLat = Number.isFinite(params.origin.lat) ? Number(params.origin.lat) : VICTORIA_PREVIEW_ORIGIN.lat;
  const originLng = Number.isFinite(params.origin.lng) ? Number(params.origin.lng) : VICTORIA_PREVIEW_ORIGIN.lng;
  const destinationLat = Number.isFinite(params.destination.lat) ? Number(params.destination.lat) : VICTORIA_PREVIEW_DESTINATION.lat;
  const destinationLng = Number.isFinite(params.destination.lng) ? Number(params.destination.lng) : VICTORIA_PREVIEW_DESTINATION.lng;
  const useMelbournePreset = /la trobe/i.test(originName) || /melbourne|city/i.test(destinationName);
  const base = buildVictoriaPreviewBaseTime(params.whenMode, params.date, params.time);
  const allowedModes = new Set(params.modes.length > 0 ? params.modes : ALL_OPAL_MODE_IDS);

  const midpoint = (fraction: number) => ({
    lat: originLat + ((destinationLat - originLat) * fraction),
    lng: originLng + ((destinationLng - originLng) * fraction),
  });

  const cbdExchange = midpoint(0.74);
  const northernExchange = midpoint(0.3);
  const tramStop = midpoint(0.08);
  const trainPlatform = midpoint(0.82);

  const walkLeg = (
    id: string,
    departure: Date,
    arrival: Date,
    destinationStopName: string,
    destinationStopSubtitle: string,
    destinationCoord: { lat: number; lng: number },
    pathDescriptions: string[],
    originNameValue = originName,
    originSubtitleValue = originSubtitle,
    originCoord = { lat: originLat, lng: originLng },
  ): TransportTripOption['legs'][number] => ({
    id,
    mode: 'walk',
    modeLabel: 'Walk',
    lineName: '',
    lineNumber: '',
    destinationLabel: destinationStopName,
    operator: '',
    originName: originNameValue,
    originSubtitle: originSubtitleValue,
    originStopId: '',
    originPlatform: '',
    originLat: originCoord.lat,
    originLng: originCoord.lng,
    destinationName: destinationStopName,
    destinationSubtitle: destinationStopSubtitle,
    destinationStopId: '',
    destinationPlatform: '',
    destinationLat: destinationCoord.lat,
    destinationLng: destinationCoord.lng,
    departureTimePlanned: departure.toISOString(),
    arrivalTimePlanned: arrival.toISOString(),
    durationMinutes: Math.max(1, Math.round((arrival.getTime() - departure.getTime()) / 60_000)),
    distanceKm: Math.max(0.2, Number((Math.abs(arrival.getTime() - departure.getTime()) / 60_000 / 12).toFixed(1))),
    realtime: false,
    accessible: true,
    alerts: [],
    pathDescriptions,
    provider: 'transport_vic',
  });

  const transitLeg = (
    id: string,
    mode: TransportTripOption['legs'][number]['mode'],
    modeLabel: string,
    lineNumber: string,
    lineName: string,
    destinationLabel: string,
    departure: Date,
    arrival: Date,
    originStopName: string,
    originStopSubtitle: string,
    destinationStopName: string,
    destinationStopSubtitle: string,
    originCoord: { lat: number; lng: number },
    destinationCoord: { lat: number; lng: number },
    options: {
      realtime?: boolean;
      accessible?: boolean;
      routeId?: string;
      tripId?: string;
      shapeId?: string;
      alerts?: TransportAlert[];
      serviceDate?: string;
    } = {},
  ): TransportTripOption['legs'][number] => ({
    id,
    mode,
    modeLabel,
    lineName,
    lineNumber,
    destinationLabel,
    operator: 'Public Transport Victoria',
    originName: originStopName,
    originSubtitle: originStopSubtitle,
    originStopId: `${id}-origin`,
    originPlatform: mode === 'train' ? 'Platform 1' : '',
    originLat: originCoord.lat,
    originLng: originCoord.lng,
    destinationName: destinationStopName,
    destinationSubtitle: destinationStopSubtitle,
    destinationStopId: `${id}-destination`,
    destinationPlatform: mode === 'train' ? 'Platform 2' : '',
    destinationLat: destinationCoord.lat,
    destinationLng: destinationCoord.lng,
    departureTimePlanned: departure.toISOString(),
    departureTimeEstimated: options.realtime ? addMinutesToDate(departure, 1).toISOString() : departure.toISOString(),
    arrivalTimePlanned: arrival.toISOString(),
    arrivalTimeEstimated: options.realtime ? addMinutesToDate(arrival, 2).toISOString() : arrival.toISOString(),
    durationMinutes: Math.max(1, Math.round((arrival.getTime() - departure.getTime()) / 60_000)),
    distanceKm: Number(Math.max(1.2, Math.abs(destinationCoord.lat - originCoord.lat) * 111).toFixed(1)),
    realtime: Boolean(options.realtime),
    accessible: options.accessible ?? true,
    alerts: options.alerts || [],
    pathDescriptions: [],
    provider: 'transport_vic',
    serviceDate: options.serviceDate || format(departure, 'yyyy-MM-dd'),
    tripId: options.tripId || `${id}-trip`,
    routeId: options.routeId || `${id}-route`,
    shapeId: options.shapeId || `${id}-shape`,
    vehiclePosition: options.realtime
      ? {
          lat: originCoord.lat + ((destinationCoord.lat - originCoord.lat) * 0.36),
          lng: originCoord.lng + ((destinationCoord.lng - originCoord.lng) * 0.36),
          bearing: 182,
        }
      : undefined,
  });

  const tripTemplates = [
    {
      key: 'direct-tram',
      legs: () => {
        const walkStart = base;
        const walkEnd = addMinutesToDate(walkStart, 6);
        const tramEnd = addMinutesToDate(walkEnd, 35);
        const finalEnd = addMinutesToDate(tramEnd, 7);
        const alert = createVictoriaPreviewAlert('vic-preview-alert-86', 'Minor crowding reported on Route 86 through the CBD.');
        const tramOriginName = useMelbournePreset ? 'Plenty Rd / La Trobe University' : `${originName} tram stop`;
        const tramDestinationName = useMelbournePreset ? 'Parliament Station / Bourke St' : `${destinationName} city stop`;
        return [
          walkLeg(
            `${VICTORIA_PREVIEW_TRIP_PREFIX}-direct-walk-1`,
            walkStart,
            walkEnd,
            tramOriginName,
            'Tram stop',
            tramStop,
            ['Head to the nearest tram stop on Plenty Road.'],
          ),
          transitLeg(
            `${VICTORIA_PREVIEW_TRIP_PREFIX}-direct-tram`,
            'light_rail',
            'Tram',
            '86',
            'Route 86',
            destinationName,
            walkEnd,
            tramEnd,
            tramOriginName,
            'Stop 56',
            tramDestinationName,
            'CBD interchange',
            tramStop,
            cbdExchange,
            {
              realtime: true,
              accessible: true,
              alerts: [alert],
              routeId: 'tram-86',
              tripId: 'tram-86-preview',
              shapeId: 'tram-86-shape',
            },
          ),
          walkLeg(
            `${VICTORIA_PREVIEW_TRIP_PREFIX}-direct-walk-2`,
            tramEnd,
            finalEnd,
            destinationName,
            destinationSubtitle,
            { lat: destinationLat, lng: destinationLng },
            ['Walk the final stretch into the city centre.'],
            useMelbournePreset ? 'Parliament Station / Bourke St' : `${destinationName} city stop`,
            'CBD interchange',
            cbdExchange,
          ),
        ];
      },
      summary: `Walk to the tram, ride Route 86, then finish on foot to ${destinationName}.`,
      fareText: '$5.50 myki 2 hr fare',
      hasRealtime: true,
    },
    {
      key: 'bus-train',
      legs: () => {
        const walkStart = addMinutesToDate(base, 3);
        const walkEnd = addMinutesToDate(walkStart, 4);
        const busEnd = addMinutesToDate(walkEnd, 14);
        const trainEnd = addMinutesToDate(busEnd, 23);
        const finalEnd = addMinutesToDate(trainEnd, 6);
        const busOriginName = useMelbournePreset ? 'La Trobe University Bus Interchange' : `${originName} interchange`;
        const busDestinationName = useMelbournePreset ? 'Reservoir Station' : 'Northern interchange';
        const trainDestinationName = useMelbournePreset ? 'Melbourne Central Station' : `${destinationName} interchange`;
        return [
          walkLeg(
            `${VICTORIA_PREVIEW_TRIP_PREFIX}-bus-train-walk-1`,
            walkStart,
            walkEnd,
            busOriginName,
            'Bus bay',
            northernExchange,
            ['Walk to the bus interchange closest to your origin.'],
          ),
          transitLeg(
            `${VICTORIA_PREVIEW_TRIP_PREFIX}-bus-train-bus`,
            'bus',
            'Bus',
            useMelbournePreset ? '561' : '250',
            useMelbournePreset ? 'Route 561' : 'PTV Connector',
            trainDestinationName,
            walkEnd,
            busEnd,
            busOriginName,
            'Bay 3',
            busDestinationName,
            'Rail interchange',
            northernExchange,
            midpoint(0.5),
            {
              accessible: true,
              routeId: 'bus-preview',
              tripId: 'bus-preview-trip',
              shapeId: 'bus-preview-shape',
            },
          ),
          transitLeg(
            `${VICTORIA_PREVIEW_TRIP_PREFIX}-bus-train-rail`,
            'train',
            'Train',
            useMelbournePreset ? 'Mernda' : 'City Loop',
            useMelbournePreset ? 'Mernda Line' : 'City Loop',
            destinationName,
            busEnd,
            trainEnd,
            busDestinationName,
            'Platform 1',
            trainDestinationName,
            'City loop platform',
            midpoint(0.5),
            trainPlatform,
            {
              realtime: true,
              accessible: true,
              routeId: 'train-preview',
              tripId: 'train-preview-trip',
              shapeId: 'train-preview-shape',
            },
          ),
          walkLeg(
            `${VICTORIA_PREVIEW_TRIP_PREFIX}-bus-train-walk-2`,
            trainEnd,
            finalEnd,
            destinationName,
            destinationSubtitle,
            { lat: destinationLat, lng: destinationLng },
            ['Exit the station and continue to your destination.'],
            trainDestinationName,
            'City loop platform',
            trainPlatform,
          ),
        ];
      },
      summary: `Bus to the rail interchange, then continue by train toward ${destinationName}.`,
      fareText: '$5.50 myki 2 hr fare',
      hasRealtime: true,
    },
    {
      key: 'bus-only',
      legs: () => {
        const walkStart = addMinutesToDate(base, 8);
        const walkEnd = addMinutesToDate(walkStart, 5);
        const busEnd = addMinutesToDate(walkEnd, 48);
        const finalEnd = addMinutesToDate(busEnd, 5);
        const busOriginName = `${originName} bus stop`;
        const busDestinationName = `${destinationName} bus stop`;
        return [
          walkLeg(
            `${VICTORIA_PREVIEW_TRIP_PREFIX}-bus-only-walk-1`,
            walkStart,
            walkEnd,
            busOriginName,
            'Stop A',
            midpoint(0.12),
            ['Walk to the nearest frequent bus corridor.'],
          ),
          transitLeg(
            `${VICTORIA_PREVIEW_TRIP_PREFIX}-bus-only-transit`,
            'bus',
            'Bus',
            '250',
            'PTV Connector',
            destinationName,
            walkEnd,
            busEnd,
            busOriginName,
            'Stop A',
            busDestinationName,
            'CBD bus interchange',
            midpoint(0.12),
            midpoint(0.88),
            {
              accessible: false,
              routeId: 'bus-only-preview',
              tripId: 'bus-only-preview-trip',
              shapeId: 'bus-only-preview-shape',
            },
          ),
          walkLeg(
            `${VICTORIA_PREVIEW_TRIP_PREFIX}-bus-only-walk-2`,
            busEnd,
            finalEnd,
            destinationName,
            destinationSubtitle,
            { lat: destinationLat, lng: destinationLng },
            ['Walk from the bus stop to your destination entrance.'],
            busDestinationName,
            'CBD bus interchange',
            midpoint(0.88),
          ),
        ];
      },
      summary: `Stay on a single frequent bus service into ${destinationName}.`,
      fareText: '$5.50 myki 2 hr fare',
      hasRealtime: false,
    },
  ];

  return tripTemplates
    .map((template, index) => {
      const legs = template.legs();
      const transitLegs = legs.filter((leg) => leg.mode !== 'walk');
      const legModes = [...new Set(legs.map((leg) => leg.mode))];
      const tripAccessible = transitLegs.every((leg) => leg.accessible);
      return {
        id: `${VICTORIA_PREVIEW_TRIP_PREFIX}-${template.key}`,
        provider: 'transport_vic' as const,
        durationMinutes: getMinutesBetweenIsoTimes(
          legs[0]?.departureTimeEstimated || legs[0]?.departureTimePlanned,
          legs[legs.length - 1]?.arrivalTimeEstimated || legs[legs.length - 1]?.arrivalTimePlanned,
        ) || 0,
        departureTime: legs[0]?.departureTimeEstimated || legs[0]?.departureTimePlanned,
        arrivalTime: legs[legs.length - 1]?.arrivalTimeEstimated || legs[legs.length - 1]?.arrivalTimePlanned,
        transferCount: Math.max(0, transitLegs.length - 1),
        fareText: template.fareText,
        hasRealtime: template.hasRealtime,
        summary: template.summary,
        legModes,
        alerts: transitLegs.flatMap((leg) => leg.alerts).slice(0, 2),
        legs,
      } satisfies TransportTripOption;
    })
    .filter((trip) => {
      const nonWalkModes = trip.legModes.filter((mode) => mode !== 'walk');
      if (nonWalkModes.some((mode) => !allowedModes.has(mode))) return false;
      if (params.wheelchairOnly && trip.legs.some((leg) => leg.mode !== 'walk' && !leg.accessible)) return false;
      return true;
    })
    .sort((left, right) => {
      const leftTime = new Date(left.departureTime || '').getTime();
      const rightTime = new Date(right.departureTime || '').getTime();
      if (Number.isFinite(leftTime) && Number.isFinite(rightTime) && leftTime !== rightTime) {
        return leftTime - rightTime;
      }
      return left.durationMinutes - right.durationMinutes || left.summary.localeCompare(right.summary);
    });
}

function isVictoriaPreviewTrip(trip: TransportTripOption | null | undefined) {
  return Boolean(trip && trip.provider === 'transport_vic' && trip.id.startsWith(VICTORIA_PREVIEW_TRIP_PREFIX));
}

function buildVictoriaPreviewDepartures(trip: TransportTripOption): TransportDeparture[] {
  const anchor = trip.legs.find((leg) => leg.mode !== 'walk' && leg.originStopId);
  if (!anchor) return [];
  const baseDeparture = anchor.departureTimeEstimated || anchor.departureTimePlanned || new Date().toISOString();
  const baseTime = new Date(baseDeparture);
  if (Number.isNaN(baseTime.getTime())) return [];
  return [0, 7, 13].map((offset, index) => ({
    id: `${trip.id}-departure-${index}`,
    provider: 'transport_vic',
    stopName: anchor.originName,
    platformName: anchor.originPlatform || anchor.originSubtitle || 'Upcoming service',
    stopId: anchor.originStopId,
    lineName: anchor.lineName,
    lineNumber: anchor.lineNumber,
    destination: anchor.destinationLabel || anchor.destinationName,
    mode: anchor.mode,
    modeLabel: anchor.modeLabel,
    departureTimePlanned: addMinutesToDate(baseTime, offset).toISOString(),
    departureTimeEstimated: anchor.realtime ? addMinutesToDate(baseTime, offset + 1).toISOString() : addMinutesToDate(baseTime, offset).toISOString(),
    realtime: anchor.realtime,
    wheelchair: anchor.accessible,
    alerts: anchor.alerts,
  }));
}

function getTransportNetworkById(networkId: TransportNetworkId | null | undefined) {
  return TRANSPORT_NETWORKS.find((network) => network.id === networkId) || null;
}

function buildDashboardTransportRequestKey(target: DashboardInitialTransportTarget) {
  const networkId = getTransportNetworkIdForState(target.state || target.address || '') || 'unknown';
  return [
    networkId,
    Number(target.lat).toFixed(6),
    Number(target.lng).toFixed(6),
    String(target.name || '').trim(),
  ].join(':');
}

function getTransportNetworkIdForState(state: string): TransportNetworkId | null {
  switch (normalizeAustralianStateLabel(state)) {
    case 'NSW':
      return 'nsw';
    case 'QLD':
      return 'qld';
    case 'VIC':
      return 'vic';
    case 'WA':
      return 'wa';
    case 'SA':
      return 'sa';
    case 'TAS':
      return 'tas';
    case 'ACT':
      return 'act';
    case 'NT':
      return 'nt';
    default:
      return null;
  }
}

function supportsInAppTransportPlanning(network: TransportNetworkConfig | null | undefined) {
  return Boolean(network?.provider);
}

function getTransportModeOptions(provider?: TransportProvider | '') {
  if (provider === 'transport_act') {
    return OPAL_MODE_OPTIONS.filter((option) => ACT_OPAL_MODE_IDS.includes(option.id as (typeof ACT_OPAL_MODE_IDS)[number]));
  }
  if (provider === 'transport_qld') {
    return OPAL_MODE_OPTIONS.filter((option) => QLD_OPAL_MODE_IDS.includes(option.id as (typeof QLD_OPAL_MODE_IDS)[number]));
  }
  if (provider === 'transport_sa') {
    return OPAL_MODE_OPTIONS.filter((option) => SA_OPAL_MODE_IDS.includes(option.id as (typeof SA_OPAL_MODE_IDS)[number]));
  }
  if (provider === 'transport_tas') {
    return OPAL_MODE_OPTIONS.filter((option) => TAS_OPAL_MODE_IDS.includes(option.id as (typeof TAS_OPAL_MODE_IDS)[number]));
  }
  if (provider === 'transport_wa') {
    return OPAL_MODE_OPTIONS.filter((option) => WA_OPAL_MODE_IDS.includes(option.id as (typeof WA_OPAL_MODE_IDS)[number]));
  }
  if (provider === 'transport_nt') {
    return OPAL_MODE_OPTIONS.filter((option) => NT_OPAL_MODE_IDS.includes(option.id as (typeof NT_OPAL_MODE_IDS)[number]));
  }
  return OPAL_MODE_OPTIONS;
}

function formatOpalTimeLabel(value?: string) {
  const raw = String(value || '').trim();
  if (!raw) return 'TBD';
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return format(parsed, 'h:mm aaa');
}

function buildOpalCoordReference(
  lat: number,
  lng: number,
  name: string,
  subtitle = '',
): TransportLocationReference {
  return {
    ref: `${Number(lng).toFixed(6)}:${Number(lat).toFixed(6)}:EPSG:4326`,
    requestType: 'coord',
    name,
    subtitle,
    lat,
    lng,
  };
}

function getAddressSearchTitle(result: NominatimResult) {
  return String(result.display_name || '').split(',')[0]?.trim() || 'Selected location';
}

function getAddressSearchSubtitle(result: NominatimResult) {
  return String(result.display_name || '').split(',').slice(1, 4).join(',').trim();
}

function getAddressSearchDisplay(result: NominatimResult) {
  return String(result.display_name || '').trim() || getAddressSearchTitle(result);
}

function getAddressSearchState(result: NominatimResult) {
  return normalizeAustralianStateLabel(result.address?.state || result.address?.territory || '');
}

function filterTransportAddressResults(
  results: NominatimResult[],
  networkState: string,
  query: string,
) {
  const cleanQuery = String(query || '').trim().toLowerCase();
  const candidates = results.filter((result) => Number.isFinite(Number(result.lat)) && Number.isFinite(Number(result.lon)));
  const inState = networkState
    ? candidates.filter((result) => getAddressSearchState(result) === networkState)
    : candidates;
  const pool = inState.length > 0 ? inState : candidates;
  const isBroadAdministrativeResult = (result: NominatimResult) => {
    const category = String(result.category || '').trim().toLowerCase();
    const type = String(result.type || '').trim().toLowerCase();
    const addresstype = String((result as any).addresstype || '').trim().toLowerCase();
    if (category === 'boundary' || type === 'administrative') return true;
    return ['municipality', 'state', 'country', 'county', 'region', 'district'].includes(addresstype);
  };
  const rankedPool = pool.some((result) => !isBroadAdministrativeResult(result))
    ? pool.filter((result) => !isBroadAdministrativeResult(result))
    : pool;
  return [...rankedPool].sort((a, b) => {
    const aTitle = getAddressSearchTitle(a).toLowerCase();
    const bTitle = getAddressSearchTitle(b).toLowerCase();
    const aDisplay = String(a.display_name || '').toLowerCase();
    const bDisplay = String(b.display_name || '').toLowerCase();
    const aStarts = cleanQuery && (aTitle.startsWith(cleanQuery) || aDisplay.startsWith(cleanQuery)) ? 1 : 0;
    const bStarts = cleanQuery && (bTitle.startsWith(cleanQuery) || bDisplay.startsWith(cleanQuery)) ? 1 : 0;
    if (aStarts !== bStarts) return bStarts - aStarts;
    const aContains = cleanQuery && (aTitle.includes(cleanQuery) || aDisplay.includes(cleanQuery)) ? 1 : 0;
    const bContains = cleanQuery && (bTitle.includes(cleanQuery) || bDisplay.includes(cleanQuery)) ? 1 : 0;
    if (aContains !== bContains) return bContains - aContains;
    return aTitle.localeCompare(bTitle);
  });
}

function buildOpalReferenceFromAddressResult(
  result: NominatimResult,
  preferredName?: string,
  preferredSubtitle?: string,
): TransportLocationReference {
  return buildOpalCoordReference(
    Number(result.lat),
    Number(result.lon),
    preferredName || getAddressSearchTitle(result),
    preferredSubtitle || getAddressSearchSubtitle(result) || result.display_name,
  );
}

function getPlannerSuggestionKey(suggestion: PlannerLocationSuggestion) {
  return `address-${suggestion.place_id}-${suggestion.display_name}`;
}

function getPlannerSuggestionTitle(suggestion: PlannerLocationSuggestion) {
  return getAddressSearchTitle(suggestion);
}

function getPlannerSuggestionSubtitle(suggestion: PlannerLocationSuggestion) {
  return getAddressSearchSubtitle(suggestion);
}

function getPlannerSuggestionDisplayQuery(suggestion: PlannerLocationSuggestion) {
  return getAddressSearchDisplay(suggestion);
}

function getPlannerSuggestionDedupeKey(suggestion: PlannerLocationSuggestion) {
  return [
    'map',
    Number(suggestion.lat || 0).toFixed(5),
    Number(suggestion.lon || 0).toFixed(5),
    String(suggestion.display_name || '').trim().toLowerCase(),
  ].join('|');
}

function mergePlannerSuggestions(...groups: PlannerLocationSuggestion[][]) {
  const merged: PlannerLocationSuggestion[] = [];
  const seen = new Set<string>();
  groups.forEach((group) => {
    group.forEach((suggestion) => {
      const key = getPlannerSuggestionDedupeKey(suggestion);
      if (seen.has(key)) return;
      seen.add(key);
      merged.push(suggestion);
    });
  });
  return merged;
}

function hasTransportReferenceCoords(reference: TransportLocationReference | null | undefined) {
  return Number.isFinite(reference?.lat) && Number.isFinite(reference?.lng);
}

function getTransportReferenceDisplayQuery(reference: TransportLocationReference | null | undefined) {
  if (!reference) return '';
  const name = String(reference.name || '').trim();
  const subtitle = String(reference.subtitle || '').trim();
  if (!subtitle) return name;
  if (name === 'Current location' || name === 'Home' || name === 'Work') return name;
  return `${name}, ${subtitle}`;
}

function isSameTransportEndpoint(
  left: TransportLocationReference | null | undefined,
  right: TransportLocationReference | null | undefined,
) {
  if (!left || !right) return false;
  if (left.ref && right.ref && left.ref === right.ref) return true;
  if (hasTransportReferenceCoords(left) && hasTransportReferenceCoords(right)) {
    const latDiff = Math.abs(Number(left.lat) - Number(right.lat));
    const lngDiff = Math.abs(Number(left.lng) - Number(right.lng));
    if (latDiff <= 0.0001 && lngDiff <= 0.0001) return true;
  }
  const leftDisplay = getTransportReferenceDisplayQuery(left).trim().toLowerCase();
  const rightDisplay = getTransportReferenceDisplayQuery(right).trim().toLowerCase();
  return !!leftDisplay && leftDisplay === rightDisplay;
}

function buildPlanningTransportReference(reference: TransportLocationReference): TransportLocationReference {
  if (!hasTransportReferenceCoords(reference)) return reference;
  return buildOpalCoordReference(
    Number(reference.lat),
    Number(reference.lng),
    reference.name || 'Selected location',
    reference.subtitle || '',
  );
}

function matchesTransportReferenceQuery(reference: TransportLocationReference | null | undefined, query: string) {
  const cleanQuery = String(query || '').trim().toLowerCase();
  if (!reference) return false;
  if (!cleanQuery) return true;
  const comparableValues = [reference.name, reference.subtitle, getTransportReferenceDisplayQuery(reference)]
    .map((value) => String(value || '').trim().toLowerCase())
    .filter(Boolean);
  return comparableValues.includes(cleanQuery);
}

function getMinutesBetweenIsoTimes(start?: string, end?: string) {
  if (!start || !end) return null;
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return null;
  const diff = Math.round((endDate.getTime() - startDate.getTime()) / 60000);
  return diff >= 0 ? diff : null;
}

function getOpalTripDurationMinutes(trip: TransportTripOption) {
  return (
    getMinutesBetweenIsoTimes(trip.departureTime, trip.arrivalTime) ??
    (Number.isFinite(trip.durationMinutes) ? trip.durationMinutes : null) ??
    0
  );
}

function getOpalLegDurationMinutes(leg: TransportTripOption['legs'][number]) {
  return (
    getMinutesBetweenIsoTimes(
      leg.departureTimeEstimated || leg.departureTimePlanned,
      leg.arrivalTimeEstimated || leg.arrivalTimePlanned,
    ) ??
    (Number.isFinite(leg.durationMinutes) ? leg.durationMinutes : null) ??
    0
  );
}

function formatOpalDistanceLabel(distanceKm: number | null) {
  if (distanceKm == null || !Number.isFinite(distanceKm)) return '';
  if (distanceKm < 1) return `${Math.round(distanceKm * 1000)} m`;
  return `${distanceKm.toFixed(1)} km`;
}

const OPAL_GENERIC_STEP_PATTERNS = [
  /^origin$/i,
  /^destination$/i,
  /^keep$/i,
  /^continue$/i,
  /^head$/i,
  /^proceed$/i,
  /^straight$/i,
  /^slight left$/i,
  /^slight right$/i,
  /^turn left$/i,
  /^turn right$/i,
];

function getReadableOpalPathSteps(pathDescriptions: string[]) {
  const seen = new Set<string>();
  return pathDescriptions
    .map((step) => String(step || '').replace(/^\s*(?:\d+[\.\)]\s*)?/, '').replace(/\s+/g, ' ').trim())
    .filter((step) => {
      if (!step) return false;
      if (OPAL_GENERIC_STEP_PATTERNS.some((pattern) => pattern.test(step))) return false;
      const comparable = step.toLowerCase();
      if (seen.has(comparable)) return false;
      seen.add(comparable);
      return true;
    })
    .slice(0, 4);
}

function getOpalModePresentation(mode: string) {
  switch (mode) {
    case 'train':
    case 'metro':
      return { label: mode === 'metro' ? 'Metro' : 'Train', tint: 'bg-[#EFF6FF] text-[#1E40AF]', icon: Train };
    case 'light_rail':
      return { label: 'Light Rail', tint: 'bg-[#ECFDF5] text-[#15803D]', icon: TramFront };
    case 'bus':
    case 'coach':
    case 'school_bus':
      return { label: mode === 'coach' ? 'Coach' : mode === 'school_bus' ? 'School Bus' : 'Bus', tint: 'bg-[#FFF7ED] text-[#C2410C]', icon: Bus };
    case 'ferry':
      return { label: 'Ferry', tint: 'bg-[#F5F3FF] text-[#6D28D9]', icon: Anchor };
    case 'walk':
      return { label: 'Walk', tint: 'bg-[#F8FAFC] text-[#475569]', icon: Navigation };
    default:
      return { label: 'Transit', tint: 'bg-[#F8FAFC] text-[#475569]', icon: CircleDot };
  }
}

function renderOpalModeIcon(mode: string, className = 'w-3.5 h-3.5') {
  const { icon: Icon } = getOpalModePresentation(mode);
  return <Icon className={className} strokeWidth={1.8} />;
}

function buildFuelQueryKey(
  target: { lat: number; lng: number; state?: string; suburb?: string; label: string } | null,
  products: string[],
) {
  if (!target) return `none|${products.join(',')}`;
  return [
    target.lat.toFixed(5),
    target.lng.toFixed(5),
    target.state || '',
    target.suburb || '',
    target.label || '',
    products.join(','),
  ].join('|');
}

function normalizeFuelCategoryForDisplay(
  rawCategory: string | undefined,
  rawFuelType: string | undefined,
): keyof typeof FUEL_PRODUCT_LABELS {
  const value = String(rawCategory || rawFuelType || '').trim().toLowerCase();
  if (!value) return 'unleaded_up';
  if (/e85/i.test(value)) return 'e85';
  if (/(premium|pulp|u95|u98|98|95)/i.test(value)) return 'premium_up';
  if (/(brand diesel|vortex diesel|supreme diesel|premium diesel|pdl|pdsl)/i.test(value)) return 'brand_diesel';
  if (/(diesel|b20|b5)/i.test(value)) return 'diesel';
  if (/lpg/i.test(value)) return 'lpg';
  if (/(^|[^a-z])(u91|e10|unleaded|regular)/i.test(value)) return 'unleaded_up';
  return 'unleaded_up';
}

function extractFuelLocalityFromDisplayName(label: string) {
  const parts = String(label || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  const roadPattern = /\b(street|st|road|rd|avenue|ave|highway|hwy|drive|dr|boulevard|blvd|lane|ln|way|circuit|crescent|place|pl|parade|close|terrace|court|ct)\b/i;
  const genericPattern = /^(western australia|new south wales|victoria|queensland|tasmania|australia|city of .+|shire of .+|town of .+|regional .+)$/i;

  for (const part of parts) {
    if (/\d/.test(part)) continue;
    if (genericPattern.test(part)) continue;
    if (roadPattern.test(part)) continue;
    return part;
  }

  return '';
}

function rankFuelSearchResult(result: NominatimResult, query: string) {
  const state = normalizeAustralianStateLabel(result.address?.state || '');
  const label = String(result.display_name || '').toLowerCase();
  const normalizedQuery = query.trim().toLowerCase();
  const primaryName = label.split(',')[0] || label;
  let score = 0;

  if (FUEL_SUPPORTED_STATES.has(state)) score += 100;
  if (primaryName.startsWith(normalizedQuery)) score += 40;
  else if (label.includes(normalizedQuery)) score += 20;
  if (result.type === 'university' || result.class === 'amenity') score += 10;
  if (result.type === 'suburb' || result.type === 'city' || result.type === 'town' || result.type === 'village') score += 8;

  return score;
}

function filterFuelSearchResults(results: NominatimResult[], query: string) {
  return results
    .filter((result) => {
      const state = normalizeAustralianStateLabel(result.address?.state || '');
      if (!FUEL_SUPPORTED_STATES.has(state)) return false;
      return Boolean(
        result.address?.suburb ||
        result.address?.city ||
        result.address?.town ||
        result.address?.road ||
        result.address?.postcode,
      );
    })
    .sort((a, b) => rankFuelSearchResult(b, query) - rankFuelSearchResult(a, query))
    .slice(0, 6);
}

// ──�� TWO-TIER ACCESSIBLE MARKER SYSTEM ───────────────────────────
function buildDualBlipMarkerHtml(category: string, size: number = 34): string {
  const icons: Record<string, string> = {
    scam: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
    maintenance: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`,
  };
  const icon = icons[category] || icons.maintenance;
  const color = category === 'scam' ? '#B91C1C' : '#EA580C';
  if (category === 'scam') {
    return `<div style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;filter:drop-shadow(0 2px 4px rgba(185,28,28,0.4))">
      <div style="width:0;height:0;border-left:${size / 2}px solid transparent;border-right:${size / 2}px solid transparent;border-bottom:${size - 4}px solid ${color};position:absolute"></div>
      <div style="position:absolute;top:${size * 0.38}px;display:flex;align-items:center;justify-content:center">${icon}</div>
    </div>`;
  }
  return `<div style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;filter:drop-shadow(0 2px 4px rgba(234,88,12,0.4))">
    <div style="width:${size - 4}px;height:${size - 4}px;background:${color};border-radius:5px;display:flex;align-items:center;justify-content:center">${icon}</div>
  </div>`;
}

// ─── DUAL-PATH TRANSIT LOOKUP ─────────────────────────────────────
interface NearestTransit {
  name: string;
  type: 'train' | 'light_rail' | 'bus' | 'ferry';
  distance_m: number;
  walk_min: number;
}

function classifyTransitType(tags: Record<string, string>): 'train' | 'light_rail' | 'bus' | 'ferry' {
  if (tags?.railway === 'station' || tags?.railway === 'halt') return 'train';
  if (tags?.railway === 'tram_stop') return 'light_rail';
  if (tags?.amenity === 'ferry_terminal' || tags?.waterway === 'ferry_terminal') return 'ferry';
  return 'bus';
}

async function fetchNearbyTransit(lat: number, lng: number): Promise<NearestTransit[]> {
  try {
    const radius = 2000;
    const r = radius;
    // Build Overpass query with ferry_terminal support
    const overpassQuery = [
      '[out:json][timeout:10];(',
      `node["railway"="station"](around:${radius},${lat},${lng});`,
      `node["railway"="halt"](around:${radius},${lat},${lng});`,
      `node["railway"="tram_stop"](around:${radius},${lat},${lng});`,
      `node["amenity"="bus_station"](around:${radius},${lat},${lng});`,
      `node["highway"="bus_stop"](around:${radius},${lat},${lng});`,
      `node["amenity"="ferry_terminal"](around:${radius},${lat},${lng});`,
      ');out body 30;',
    ].join('');
    // overpassQuery replaces the old `query` template literal below; suppress unused
    void r;
    const query = `[out:json][timeout:10];(node["railway"="station"](around:${radius},${lat},${lng});node["railway"="halt"](around:${radius},${lat},${lng});node["railway"="tram_stop"](around:${radius},${lat},${lng});node["amenity"="bus_station"](around:${radius},${lat},${lng});node["highway"="bus_stop"](around:${radius},${lat},${lng}););out body 30;`;
    void (typeof query !== 'undefined' ? query : null); // consume old var
    const data = await overpassFetch(overpassQuery);
    if (!data.elements || data.elements.length === 0) return [];
    const WALK_FACTOR = 1.3;
    const stops: NearestTransit[] = data.elements.map((el: any) => {
      const straightLine = haversineDistance(lat, lng, el.lat, el.lon);
      const walkDist = Math.round(straightLine * WALK_FACTOR);
      return {
        name: el.tags?.name || el.tags?.description || 'Transit Stop',
        type: classifyTransitType(el.tags || {}),
        distance_m: walkDist,
        walk_min: Math.max(1, Math.round(walkDist / 80)),
      };
    }).sort((a: NearestTransit, b: NearestTransit) => a.distance_m - b.distance_m);
    const MAX_WALK_MIN = 15;
    const result: NearestTransit[] = [];
    const closestRail = stops.find(s => (s.type === 'train' || s.type === 'light_rail') && s.walk_min <= MAX_WALK_MIN);
    const closestBus = stops.find(s => s.type === 'bus' && s.walk_min <= MAX_WALK_MIN);
    const closestFerry = stops.find(s => s.type === 'ferry' && s.walk_min <= MAX_WALK_MIN);
    if (closestRail) result.push(closestRail);
    if (closestBus) result.push(closestBus);
    if (closestFerry) result.push(closestFerry);
    result.sort((a, b) => a.walk_min - b.walk_min);
    return result;
  } catch (err) {
    console.error('GHAR transit lookup error:', err);
    return [];
  }
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── TRANSIT STOP MARKER ────────────────────────────────────────
interface TransitStop {
  id: number;
  lat: number;
  lng: number;
  name: string;
  type: 'train' | 'light_rail' | 'bus' | 'ferry';
}

const transitCache = new Map<string, TransitStop[]>();
const transitFetching = new Set<string>();
const TRANSIT_RADIUS_M = 2000;

async function fetchTransitAroundUniversities(
  unis: { key: string; lat: number; lng: number }[]
): Promise<boolean> {
  const toFetch = unis.filter(u => !transitCache.has(u.key) && !transitFetching.has(u.key));
  if (toFetch.length === 0) return false;
  toFetch.forEach(u => transitFetching.add(u.key));
  let fetched = false;
  const BATCH_SIZE = 8;
  for (let i = 0; i < toFetch.length; i += BATCH_SIZE) {
    const batch = toFetch.slice(i, i + BATCH_SIZE);
    try {
      const aroundClauses = batch.map(u => {
        const r = TRANSIT_RADIUS_M;
        return [
          `node["railway"="station"](around:${r},${u.lat},${u.lng});`,
          `node["railway"="halt"](around:${r},${u.lat},${u.lng});`,
          `node["railway"="tram_stop"](around:${r},${u.lat},${u.lng});`,
          `node["amenity"="bus_station"](around:${r},${u.lat},${u.lng});`,
          `node["highway"="bus_stop"](around:${r},${u.lat},${u.lng});`,
          `node["amenity"="ferry_terminal"](around:${r},${u.lat},${u.lng});`,
        ].join('');
      }).join('');
      const query = `[out:json][timeout:25];(${aroundClauses});out body 500;`;
      {
        const data = await overpassFetch(query);
        const allStops: TransitStop[] = (data.elements || []).map((el: any) => ({
          id: el.id,
          lat: el.lat,
          lng: el.lon,
          name: el.tags?.name || el.tags?.description || 'Stop',
          type: classifyTransitType(el.tags || {}),
        }));
        batch.forEach(u => {
          const nearby = allStops.filter(s =>
            haversineDistance(u.lat, u.lng, s.lat, s.lng) <= TRANSIT_RADIUS_M
          );
          transitCache.set(u.key, nearby);
          transitFetching.delete(u.key);
        });
        fetched = true;
      }
    } catch (err) {
      console.warn('GHAR transit batch fetch error (Overpass API may be blocked):', err);
      batch.forEach(u => { transitCache.set(u.key, []); transitFetching.delete(u.key); });
    }
  }
  return fetched;
}

function getVisibleTransitStops(bounds: any): TransitStop[] {
  const seen = new Set<number>();
  const result: TransitStop[] = [];
  transitCache.forEach(stops => {
    stops.forEach(s => {
      if (!seen.has(s.id) && bounds.contains([s.lng, s.lat])) {
        seen.add(s.id);
        result.push(s);
      }
    });
  });
  return result;
}

// ─── STUDENT SURVIVAL STORES ─────────────────────────────────────
interface SurvivalStore {
  id: number;
  lat: number;
  lng: number;
  name: string;
  storeType: 'supermarket' | 'convenience' | 'grocery';
  opening_hours?: string;
}

const survivalStoreCache = createAsyncRequestCache<SurvivalStore[]>();

async function fetchSurvivalStores(south: number, west: number, north: number, east: number): Promise<SurvivalStore[]> {
  // Cap bbox to ~0.55° (~55 km) per side — broad enough for pre-fetch hubs
  const MAX_SPAN = 0.55;
  const latMid = (south + north) / 2;
  const lngMid = (west + east) / 2;
  const s = latMid - Math.min((north - south) / 2, MAX_SPAN / 2);
  const n = latMid + Math.min((north - south) / 2, MAX_SPAN / 2);
  const w = lngMid - Math.min((east - west) / 2, MAX_SPAN / 2);
  const e = lngMid + Math.min((east - west) / 2, MAX_SPAN / 2);

  const cacheKey = `${s.toFixed(2)},${w.toFixed(2)},${n.toFixed(2)},${e.toFixed(2)}`;
  const cachedStores = survivalStoreCache.get(cacheKey);
  if (cachedStores) return cachedStores;

  return survivalStoreCache
    .getOrCreate(cacheKey, async () => {
      const bbox = `${s},${w},${n},${e}`;
      // Broad query — ALL supermarkets, groceries and convenience stores (no name filter)
      // This ensures Woolworths, Coles, IGA, ALDI all appear
      const query = `[out:json][timeout:20];(node["shop"="supermarket"](${bbox});way["shop"="supermarket"](${bbox});node["shop"="grocery"](${bbox});way["shop"="grocery"](${bbox});node["shop"="convenience"](${bbox});way["shop"="convenience"](${bbox});node["shop"="asian_grocery"](${bbox});way["shop"="asian_grocery"](${bbox});node["shop"="deli"](${bbox});way["shop"="deli"](${bbox}););out center 120;`;
      const data = await overpassFetch(query);
      return (data.elements || [])
        .map((el: any) => {
          const lat = el.lat ?? el.center?.lat;
          const lng = el.lon ?? el.center?.lon;
          if (!lat || !lng) return null;
          const shop = el.tags?.shop ?? '';
          return {
            id: el.id,
            lat,
            lng,
            name: el.tags?.name || el.tags?.['name:en'] || 'Store',
            storeType: (shop === 'supermarket' ? 'supermarket' : shop === 'grocery' || shop === 'asian_grocery' || shop === 'deli' ? 'grocery' : 'convenience') as SurvivalStore['storeType'],
            opening_hours: el.tags?.opening_hours,
          };
        })
        .filter(Boolean) as SurvivalStore[];
    })
    .catch((err) => {
      console.warn('GHAR survival stores fetch error:', err);
      return [];
    });
}

function findNearestSurvivalStore(lat: number, lng: number, stores: SurvivalStore[]): (SurvivalStore & { distance_m: number; walk_min: number }) | null {
  if (stores.length === 0) return null;
  let nearest: SurvivalStore | null = null;
  let minDist = Infinity;
  for (const s of stores) {
    const d = haversineDistance(lat, lng, s.lat, s.lng);
    if (d < minDist) { minDist = d; nearest = s; }
  }
  if (!nearest) return null;
  const walkDist = Math.round(minDist * 1.3);
  return { ...nearest, distance_m: walkDist, walk_min: Math.max(1, Math.round(walkDist / 80)) };
}

const PUBLIC_TOILET_AUSTRALIA_BOUNDS: PublicToiletBounds = {
  west: 112,
  south: -44.8,
  east: 154.5,
  north: -9.1,
};
const PUBLIC_TOILET_VIEWPORT_LIMIT = 30000;
const PUBLIC_TOILET_NEARBY_LIMIT = 1000;
const PUBLIC_TOILET_NEARBY_RADIUS_KM = 12;
const PUBLIC_TOILET_INTERACTIVE_LAYER_IDS = ['public-toilet-clusters', 'public-toilet-unclustered'];
const publicToiletCache = createAsyncRequestCache<PublicToiletLocation[]>();

function clampCoordinate(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function normalizePublicToiletBounds(bounds: PublicToiletBounds): PublicToiletBounds {
  const west = clampCoordinate(Number(bounds.west), -180, 180);
  const south = clampCoordinate(Number(bounds.south), -90, 90);
  const east = clampCoordinate(Number(bounds.east), -180, 180);
  const north = clampCoordinate(Number(bounds.north), -90, 90);
  if (!Number.isFinite(west + south + east + north) || west >= east || south >= north) {
    return PUBLIC_TOILET_AUSTRALIA_BOUNDS;
  }
  return { west, south, east, north };
}

function getPublicToiletBoundsKey(bounds: PublicToiletBounds) {
  const normalized = normalizePublicToiletBounds(bounds);
  return [
    normalized.west.toFixed(3),
    normalized.south.toFixed(3),
    normalized.east.toFixed(3),
    normalized.north.toFixed(3),
  ].join(',');
}

function getPublicToiletViewportBounds(map: any, isGlobe: boolean): PublicToiletBounds {
  if (isGlobe || !map?.getBounds) return PUBLIC_TOILET_AUSTRALIA_BOUNDS;
  const bounds = map.getBounds();
  return normalizePublicToiletBounds({
    west: Number(bounds.getWest()),
    south: Number(bounds.getSouth()),
    east: Number(bounds.getEast()),
    north: Number(bounds.getNorth()),
  });
}

function buildPublicToiletNearbyBounds(lat: number, lng: number, radiusKm = PUBLIC_TOILET_NEARBY_RADIUS_KM): PublicToiletBounds {
  const latitude = clampCoordinate(lat, -89.9, 89.9);
  const latDelta = radiusKm / 110.574;
  const lngDelta = radiusKm / (111.32 * Math.max(Math.cos(latitude * Math.PI / 180), 0.12));
  return normalizePublicToiletBounds({
    west: lng - lngDelta,
    south: lat - latDelta,
    east: lng + lngDelta,
    north: lat + latDelta,
  });
}

function buildPublicToiletFeatureCollection(toilets: PublicToiletLocation[]) {
  return {
    type: 'FeatureCollection',
    features: toilets
      .filter((toilet) => Number.isFinite(toilet.lat) && Number.isFinite(toilet.lng))
      .map((toilet) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [toilet.lng, toilet.lat],
        },
        properties: {
          toiletId: toilet.id,
          name: toilet.name,
          address: formatPublicToiletAddress(toilet),
        },
      })),
  };
}

function formatPublicToiletAddress(toilet: PublicToiletLocation) {
  return [toilet.address, toilet.town, toilet.state].map((part) => String(part || '').trim()).filter(Boolean).join(', ');
}

function findNearestPublicToilet(
  lat: number,
  lng: number,
  toilets: PublicToiletLocation[],
): (PublicToiletLocation & { distance_m: number; walk_min: number }) | null {
  let nearest: PublicToiletLocation | null = null;
  let minDist = Infinity;
  for (const toilet of toilets) {
    if (!Number.isFinite(toilet.lat) || !Number.isFinite(toilet.lng)) continue;
    const distance = haversineDistance(lat, lng, toilet.lat, toilet.lng);
    if (distance < minDist) {
      minDist = distance;
      nearest = toilet;
    }
  }
  if (!nearest) return null;
  const walkDist = Math.round(minDist * 1.3);
  return { ...nearest, distance_m: walkDist, walk_min: Math.max(1, Math.round(walkDist / 80)) };
}

function buildPublicToiletFlags(toilet: PublicToiletLocation) {
  return [
    toilet.accessible === true ? { label: 'Accessible', icon: Accessibility } : null,
    toilet.babyChange === true || toilet.babyCareRoom === true ? { label: 'Baby change', icon: Baby } : null,
    toilet.shower === true ? { label: 'Shower', icon: Droplets } : null,
    toilet.drinkingWater === true ? { label: 'Drinking water', icon: Droplets } : null,
    toilet.keyRequired === true || toilet.mlak24 === true || toilet.mlakAfterHours === true ? { label: 'Key access', icon: KeyRound } : null,
    toilet.paymentRequired === true ? { label: 'Paid access', icon: CircleDollarSign } : null,
  ].filter(Boolean) as Array<{ label: string; icon: typeof Accessibility }>;
}

// ─── EMPLOYMENT OPPORTUNITY ZONES ────────────���────────────────────
const jobZoneCache = createAsyncRequestCache<JobVenue[]>();

async function fetchEmploymentZones(south: number, west: number, north: number, east: number): Promise<JobVenue[]> {
  const MAX_SPAN = 0.8;
  const latMid = (south + north) / 2;
  const lngMid = (west + east) / 2;
  const s = latMid - Math.min((north - south) / 2, MAX_SPAN / 2);
  const n = latMid + Math.min((north - south) / 2, MAX_SPAN / 2);
  const w = lngMid - Math.min((east - west) / 2, MAX_SPAN / 2);
  const e = lngMid + Math.min((east - west) / 2, MAX_SPAN / 2);
  const cacheKey = `jobs:${s.toFixed(2)},${w.toFixed(2)},${n.toFixed(2)},${e.toFixed(2)}`;
  const cachedVenues = jobZoneCache.get(cacheKey);
  if (cachedVenues) return cachedVenues;

  return jobZoneCache
    .getOrCreate(cacheKey, async () => {
      const bbox = `${s},${w},${n},${e}`;
      const data = await overpassFetch(buildEmploymentZoneQuery(bbox));
      return normalizeEmploymentVenues(data.elements || []);
    })
    .catch((err) => {
      console.warn('GHAR job zones fetch error:', err);
      return [];
    });
}

// ─── OSM OPENING HOURS PARSER ─────────────────────────────────────
function parseOpeningHours(raw: string): Array<{ days: string; hours: string }> {
  if (!raw) return [];
  if (raw.trim() === '24/7') return [{ days: 'Every day', hours: '24 hours' }];
  const dayAbbr: Record<string, string> = {
    Mo: 'Mon', Tu: 'Tue', We: 'Wed', Th: 'Thu', Fr: 'Fri', Sa: 'Sat', Su: 'Sun',
  };
  const expandDay = (s: string) => dayAbbr[s] ?? s;
  const expandRange = (range: string) => {
    return range
      .replace(/([A-Z][a-z])-([A-Z][a-z])/g, (_, a, b) => `${expandDay(a)}–${expandDay(b)}`)
      .replace(/([A-Z][a-z]),([A-Z][a-z])/g, (_, a, b) => `${expandDay(a)}, ${expandDay(b)}`)
      .replace(/\b([A-Z][a-z])\b/g, (_, a) => expandDay(a));
  };
  return raw.split(';').map(part => {
    const trimmed = part.trim();
    const match = trimmed.match(/^([A-Z][a-zA-Z,\- ]+?)\s+(\d{2}:\d{2}-\d{2}:\d{2}.*)$/);
    if (match) return { days: expandRange(match[1].trim()), hours: match[2].trim() };
    const parts = trimmed.split(/\s+/);
    const timeIdx = parts.findIndex(p => /^\d{2}:\d{2}/.test(p));
    if (timeIdx > 0) return { days: expandRange(parts.slice(0, timeIdx).join(' ')), hours: parts.slice(timeIdx).join(' ') };
    return { days: '—', hours: trimmed };
  }).filter(r => r.days || r.hours);
}

// ─── GLOBE ZOOM HELPER ────────────────────────────────────────────
// Returns a zoom low enough that the ENTIRE sphere is visible on screen.
function getGlobeZoom(): number {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const shortest = Math.min(w, h);
  if (shortest < 380) return 0.3;
  if (shortest < 500) return 0.4;
  if (w < 640) return 0.5;
  if (w < 900) return 0.6;
  if (w < 1200) return 0.7;
  return 0.8;
}

const AUSTRALIAN_STATES: Record<string, {lat: number, lng: number}> = {
  'NSW': { lat: -33.8688, lng: 151.2093 },
  'VIC': { lat: -37.8136, lng: 144.9631 },
  'QLD': { lat: -27.4705, lng: 153.0260 },
  'WA': { lat: -31.9505, lng: 115.8605 },
  'SA': { lat: -34.9285, lng: 138.6007 },
  'TAS': { lat: -42.8821, lng: 147.3272 },
  'ACT': { lat: -35.2809, lng: 149.1300 },
  'NT': { lat: -12.4634, lng: 130.8456 },
};
const WOLLI_CREEK_MAP_CENTER = { lat: -33.9318, lng: 151.1527 };
const WOLLI_PUBLIC_SOURCE_MARQUEE_TEXT = `This website is publicly available on ${BAYSIDE_WARD_BOUNDARY_URL}`;

function openMapExternalUrl(url: string) {
  void Browser.open({ url }).catch(() => {
    if (typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  });
}

// ─── AUSTRALIA-WIDE PRE-FETCH HUBS ───────────────────────────────
const AUSTRALIA_MAJOR_HUBS = [
  // State & territory capitals
  { key: 'sydney-cbd',     lat: -33.8688, lng: 151.2093 },
  { key: 'melbourne-cbd',  lat: -37.8136, lng: 144.9631 },
  { key: 'brisbane-cbd',   lat: -27.4705, lng: 153.0260 },
  { key: 'perth-cbd',      lat: -31.9505, lng: 115.8605 },
  { key: 'adelaide-cbd',   lat: -34.9285, lng: 138.6007 },
  { key: 'hobart-cbd',     lat: -42.8821, lng: 147.3272 },
  { key: 'canberra-cbd',   lat: -35.2809, lng: 149.1300 },
  { key: 'darwin-cbd',     lat: -12.4634, lng: 130.8456 },
  // Major regional / student cities
  { key: 'gold-coast',     lat: -28.0167, lng: 153.4000 },
  { key: 'newcastle',      lat: -32.9267, lng: 151.7789 },
  { key: 'wollongong',     lat: -34.4278, lng: 150.8931 },
  { key: 'geelong',        lat: -38.1499, lng: 144.3617 },
  { key: 'sunshine-coast', lat: -26.6500, lng: 153.0667 },
  { key: 'townsville',     lat: -19.2590, lng: 146.8169 },
  { key: 'cairns',         lat: -16.9186, lng: 145.7781 },
  { key: 'toowoomba',      lat: -27.5598, lng: 151.9507 },
  { key: 'ballarat',       lat: -37.5622, lng: 143.8503 },
  { key: 'rockhampton',    lat: -23.3791, lng: 150.5100 },
];

async function prefetchAustraliaWideStores(): Promise<void> {
  const PAD = 0.05; // ~5 km radius per hub
  for (const hub of AUSTRALIA_MAJOR_HUBS) {
    fetchSurvivalStores(hub.lat - PAD, hub.lng - PAD, hub.lat + PAD, hub.lng + PAD).catch(() => {});
    await new Promise(r => setTimeout(r, 500));
  }
}

let australiaWideJobsPrefetched = false;
let australiaWideJobsPrefetchPromise: Promise<void> | null = null;

async function prefetchAustraliaWideJobs(): Promise<void> {
  const PAD = 0.04; // ~4 km radius per hub
  for (const hub of AUSTRALIA_MAJOR_HUBS) {
    await fetchEmploymentZones(hub.lat - PAD, hub.lng - PAD, hub.lat + PAD, hub.lng + PAD).catch(() => []);
    await new Promise(r => setTimeout(r, 600));
  }
}

function ensureAustraliaWideJobsPrefetched(): Promise<void> {
  if (australiaWideJobsPrefetched) {
    return Promise.resolve();
  }
  if (!australiaWideJobsPrefetchPromise) {
    australiaWideJobsPrefetchPromise = prefetchAustraliaWideJobs()
      .then(() => {
        australiaWideJobsPrefetched = true;
      })
      .finally(() => {
        australiaWideJobsPrefetchPromise = null;
      });
  }
  return australiaWideJobsPrefetchPromise;
}

function getCachedJobVenueBatches() {
  return jobZoneCache.cache.values();
}

const UNIVERSITY_SUBURBS: Record<string, string[]> = {
  "Australian Catholic University": ["North Sydney", "Strathfield", "Fitzroy", "Banyo", "Ballarat"],
  "Australian National University": ["Acton", "Braddon", "O'Connor", "Turner", "Lyneham"],
  "Bond University": ["Robina", "Varsity Lakes", "Mermaid Beach", "Miami"],
  "Carnegie Mellon University Australia": ["Adelaide City", "North Adelaide", "Kent Town", "Brompton"],
  "Central Queensland University": ["Rockhampton", "Norman Gardens", "Frenchville", "Berserker", "Parkhurst"],
  "Charles Darwin University": ["Alawa", "Brinkin", "Nakara", "Lyons", "Tiwi"],
  "Charles Sturt University": ["Bathurst", "Wagga Wagga", "Estella", "Boorooma", "Kooringal"],
  "Curtin University": ["Bentley", "St James", "Victoria Park", "Waterford", "Karawara"],
  "Deakin University": ["Burwood", "Box Hill", "Highton", "Waurn Ponds", "Grovedale"],
  "Edith Cowan University": ["Joondalup", "Connolly", "Currambine", "Mount Lawley", "Menora"],
  "Federation University Australia": ["Mount Helen", "Buninyong", "Mount Clear", "Canadian"],
  "Flinders University": ["Bedford Park", "Clovelly Park", "Sturt", "Pasadena", "Mitchell Park"],
  "Griffith University": ["Southport", "Ashmore", "Nathan", "Mount Gravatt", "Upper Mount Gravatt"],
  "James Cook University": ["Douglas", "Annandale", "Smithfield", "Trinity Park"],
  "La Trobe University": ["Bundoora", "Kingsbury", "Macleod", "Reservoir", "Heidelberg West"],
  "Macquarie University": ["Marsfield", "North Ryde", "Macquarie Park", "Epping", "Eastwood"],
  "Monash University": ["Clayton", "Mulgrave", "Notting Hill", "Caulfield East", "Malvern East"],
  "Murdoch University": ["Murdoch", "Leeming", "Kardinya", "Winthrop", "Bull Creek"],
  "Queensland University of Technology": ["Kelvin Grove", "Herston", "Red Hill", "Brisbane City", "South Bank"],
  "RMIT University": ["Carlton", "Melbourne CBD", "North Melbourne", "Bundoora", "Mill Park"],
  "Southern Cross University": ["Bilinga", "Tugun", "Coolangatta", "Goonellabah", "Girards Hill"],
  "Swinburne University of Technology": ["Hawthorn", "Hawthorn East", "Richmond", "Kew", "Kooyong"],
  "Torrens University Australia": ["Adelaide CBD", "Surry Hills", "Pyrmont", "Fortitude Valley"],
  "University of Adelaide": ["North Adelaide", "Prospect", "Norwood", "Stepney", "Hackney"],
  "University of Canberra": ["Bruce", "Belconnen", "Aranda", "Lawson", "Kaleen"],
  "University of Divinity": ["Kew", "Box Hill", "Parkville", "Brighton", "Wantirna"],
  "University of Melbourne": ["Parkville", "Carlton", "North Melbourne", "Brunswick", "Fitzroy"],
  "University of New England": ["Armidale CBD", "Uralla", "Guyra", "Kellys Plains"],
  "University of New South Wales": ["Kensington", "Kingsford", "Randwick", "Maroubra", "Zetland"],
  "University of Newcastle": ["Jesmond", "Warabrook", "Birmingham Gardens", "Mayfield", "Wallsend"],
  "University of Notre Dame Australia": ["Fremantle", "East Fremantle", "Chippendale", "Broadway", "Ultimo"],
  "University of Queensland": ["St Lucia", "Toowong", "Taringa", "Indooroopilly", "Dutton Park"],
  "University of South Australia": ["Mawson Lakes", "Magill", "Pooraka", "Salisbury", "Adelaide CBD"],
  "University of Southern Queensland": ["Darling Heights", "Kearneys Spring", "Springfield Central", "Ipswich"],
  "University of Sydney": ["Darlington", "Newtown", "Glebe", "Forest Lodge", "Redfern"],
  "University of Tasmania": ["Sandy Bay", "Dynnyrne", "Newnham", "Mowbray", "Invermay"],
  "University of Technology Sydney": ["Ultimo", "Haymarket", "Chippendale", "Surry Hills", "Glebe"],
  "University of the Sunshine Coast": ["Sippy Downs", "Buderim", "Mountain Creek", "Palmview"],
  "University of Western Australia": ["Nedlands", "Subiaco", "Shenton Park", "Dalkeith", "Claremont"],
  "University of Wollongong": ["Keiraville", "Gwynneville", "North Wollongong", "Mount Ousley"],
  "Victoria University": ["Footscray", "Maribyrnong", "Maidstone", "Sunshine", "St Albans"],
  "Western Sydney University": ["Rydalmere", "Parramatta", "Kingswood", "Werrington", "Campbelltown"]
};

export function DashboardMap({
  onNewReport,
  onSelectListing,
  onDeleteListing,
  listings,
  initialSearch,
  onInitialSearchConsumed,
  initialTransportMenuOpenToken,
  onInitialTransportMenuOpenConsumed,
}: DashboardMapProps) {
  const isHoodieExperience = APP_CONFIG.experienceMode === 'hoodie';
  const isWolliExperience = APP_CONFIG.variant === 'wheres_wolli';
  const navigate = useNavigate();
  const location = useLocation();
  const { reportTripPlannerOpen, shouldAutoOpenTripPlanner } = useHoodieHelpTour();
  const mapGLRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const allMarkersRef = useRef<any[]>([]);

  // Globe States
  const [isGlobe, setIsGlobe] = useState(!isWolliExperience);
  const [isInteracting, setIsInteracting] = useState(false);
  const [isFlying, setIsFlying] = useState(false);
  const [globeAutoSpinEnabled, setGlobeAutoSpinEnabled] = useState(true);
  const spinAnimationRef = useRef<number | null>(null);

  // Explorer States
  const [isSuburbExplorerOpen, setIsSuburbExplorerOpen] = useState(false);
  const [isSuburbExplorerMinimized, setIsSuburbExplorerMinimized] = useState(false);
  const [selectedUni, setSelectedUni] = useState(Object.keys(UNIVERSITY_SUBURBS)[0]);
  const [highlightedSuburb, setHighlightedSuburb] = useState<string | null>(null);
  const [suburbGeoJSON, setSuburbGeoJSON] = useState<any>(null);
  const [isLoadingSuburb, setIsLoadingSuburb] = useState(false);
  const [isUniDropdownOpen, setIsUniDropdownOpen] = useState(false);
  const [uniSearchTerm, setUniSearchTerm] = useState('');

  // Layer toggles
  const [layerScams, setLayerScams] = useState(true);
  const [layerMaintenance, setLayerMaintenance] = useState(true);
  const [layerUniversities, setLayerUniversities] = useState(!isWolliExperience);
  const showsConsulateLayer = APP_CONFIG.showHciAlerts;
  const [layerConsulates, setLayerConsulates] = useState(showsConsulateLayer);
  const [layerTrain, setLayerTrain] = useState(false);
  const [layerLightRail, setLayerLightRail] = useState(false);
  const [layerBus, setLayerBus] = useState(false);
  const [layerSurvival, setLayerSurvival] = useState(false);
  const [layerJobHubs, setLayerJobHubs] = useState(true);
  const [layerAirports, setLayerAirports] = useState(false);
  const [layerPolice, setLayerPolice] = useState(false);
  const [layerHospital, setLayerHospital] = useState(false);
  const [layerToilets, setLayerToilets] = useState(false);
  const [showWolliWardLookup, setShowWolliWardLookup] = useState(false);
  const [showLayers, setShowLayers] = useState(false);
  const [activeAirportPopup, setActiveAirportPopup] = useState<any>(null);
  const [activePolicePopup, setActivePolicePopup] = useState<any>(null);
  const [activeHospitalPopup, setActiveHospitalPopup] = useState<any>(null);
  const [activeToiletPopup, setActiveToiletPopup] = useState<PublicToiletLocation | null>(null);
  const [publicToiletInfo, setPublicToiletInfo] = useState<string | null>(null);
  const [showPublicToiletPanel, setShowPublicToiletPanel] = useState(false);
  const [isPublicToiletPanelMinimized, setIsPublicToiletPanelMinimized] = useState(false);
  const [publicToiletMapLoading, setPublicToiletMapLoading] = useState(false);
  const [publicToiletSearchQuery, setPublicToiletSearchQuery] = useState('');
  const [publicToiletSearchLoading, setPublicToiletSearchLoading] = useState(false);
  const [publicToiletSearchError, setPublicToiletSearchError] = useState<string | null>(null);
  const [activePublicToiletFilters, setActivePublicToiletFilters] = useState<PublicToiletFilterId[]>([]);
  const [publicToiletResultOrigin, setPublicToiletResultOrigin] = useState<{ lat: number; lng: number; label: string } | null>(null);
  // Accordion state for Layer Panel — derived: open only when ≥1 layer in that category is active
  const layerAccordionHasActive = {
    alerts: layerScams || layerMaintenance,
    poi: layerPolice || layerHospital || layerUniversities || (showsConsulateLayer && layerConsulates),
    transit: layerTrain || layerLightRail || layerBus || layerAirports,
    survival: layerSurvival,
    employment: layerJobHubs,
  };
  const [layerAccordionOverrides, setLayerAccordionOverrides] = useState<Record<string, boolean | undefined>>({});
  const layerAccordions = {
    alerts: layerAccordionOverrides.alerts ?? layerAccordionHasActive.alerts,
    poi: layerAccordionOverrides.poi ?? layerAccordionHasActive.poi,
    transit: layerAccordionOverrides.transit ?? layerAccordionHasActive.transit,
    survival: layerAccordionOverrides.survival ?? layerAccordionHasActive.survival,
    employment: layerAccordionOverrides.employment ?? layerAccordionHasActive.employment,
  };
  const toggleLayerAccordion = (key: string) => {
    setLayerAccordionOverrides(prev => ({ ...prev, [key]: !layerAccordions[key as keyof typeof layerAccordions] }));
  };

  // Survival store state
  const [visibleSurvivalStores, setVisibleSurvivalStores] = useState<SurvivalStore[]>([]);
  const [activeSurvivalPopup, setActiveSurvivalPopup] = useState<SurvivalStore | null>(null);
  const [visiblePublicToilets, setVisiblePublicToilets] = useState<PublicToiletLocation[]>([]);
  const publicToiletRequestRef = useRef(0);

  // Employment / Job Hub state
  const [jobHubGeoJSON, setJobHubGeoJSON] = useState<any>(null);
  const [jobVenues, setJobVenues] = useState<JobVenue[]>([]);
  const [employmentAnalysis, setEmploymentAnalysis] = useState<EmploymentAnalysis | null>(null);
  const jobHubRequestRef = useRef(0);
  const employmentContextRequestRef = useRef(0);

  const TOTAL_LAYERS = showsConsulateLayer ? 12 : 11;
  const activeLayerCount = [
    layerScams,
    layerMaintenance,
    layerPolice,
    layerHospital,
    layerUniversities,
    showsConsulateLayer && layerConsulates,
    layerTrain,
    layerLightRail,
    layerBus,
    layerSurvival,
    layerJobHubs,
    layerAirports,
  ].filter(Boolean).length;

  // Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isDashboardSearchActive, setIsDashboardSearchActive] = useState(false);
  const [dashboardSearchMode, setDashboardSearchMode] = useState<DashboardSearchMode>('address');
  const [dashboardSearchError, setDashboardSearchError] = useState<string | null>(null);
  const [searchPin, setSearchPin] = useState<{lat: number, lng: number} | null>(null);
  const [searchTargetState, setSearchTargetState] = useState('');
  const [searchTargetSuburb, setSearchTargetSuburb] = useState('');
  const [searchTargetLabel, setSearchTargetLabel] = useState('');
  const [focusedMapTarget, setFocusedMapTarget] = useState<DashboardFocusedMapTarget | null>(null);
  const [focusedMapPanelView, setFocusedMapPanelView] = useState<FocusedMapPanelView>('place');
  const [isFocusedMapTargetMinimized, setIsFocusedMapTargetMinimized] = useState(false);
  const [showFocusedDirectionsChooser, setShowFocusedDirectionsChooser] = useState(false);
  const [directionsTarget, setDirectionsTarget] = useState<(MapDirectionsTarget | DashboardFocusedMapTarget) | null>(null);
  const [activePopupListing, setActivePopupListing] = useState<Listing | null>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSelectingRef = useRef(false);
  const dashboardSearchRef = useRef<HTMLDivElement | null>(null);
  const consumedInitialSearchRef = useRef<string | null>(null);
  const focusedMapCameraTargetRef = useRef<{ lat: number; lng: number } | null>(null);

  // Geolocation error toast
  const [geoError, setGeoError] = useState<string | null>(null);
  const geoErrorMessage = (err: GeolocationPositionError): string => {
    switch (err.code) {
      case GEO_ERROR_CODES.PERMISSION_DENIED: return 'Location permission denied. Use the search bar to find your area.';
      case GEO_ERROR_CODES.POSITION_UNAVAILABLE: return 'Location unavailable. Use the search bar to find your area.';
      case GEO_ERROR_CODES.TIMEOUT: return 'Location request timed out. Tap the crosshair to try again.';
      default: return 'Could not determine your location. Use the search bar instead.';
    }
  };

  useEffect(() => {
    if (!geoError) return;
    const t = setTimeout(() => setGeoError(null), 5000);
    return () => clearTimeout(t);
  }, [geoError]);

  // Transit state
  const [pedigreeTransit, setPedigreeTransit] = useState<NearestTransit[]>([]);
  const [transitLoading, setTransitLoading] = useState(false);

  // ─── COMMUTER CONTEXT DRAWER ─────────────────────────────────────
  const [commuterContext, setCommuterContext] = useState<{
    address: string;
    lat: number;
    lng: number;
    alertsInRadius: number;
    scamCount: number;
    maintenanceCount: number;
    transit: NearestTransit[];
    transitLoading: boolean;
    nearestStore: (SurvivalStore & { distance_m: number; walk_min: number }) | null;
    storeLoading: boolean;
    employment: EmploymentAnalysis | null;
    employmentLoading: boolean;
    nearestAirport: { name: string; iata: string; type: string; distance_km: number } | null;
    nearestPolice: { name: string; address: string; distance_m: number; walk_min: number } | null;
    nearestHospital: { name: string; state: string; isPrivate: boolean; distance_m: number; walk_min: number } | null;
    crimeContext: GenericCrimeRecord | null;
  } | null>(null);
  const [commuterTab, setCommuterTab] = useState<'safety' | 'transit' | 'employment'>('safety');
  const [radiusCircleCenter, setRadiusCircleCenter] = useState<{lat: number, lng: number} | null>(null);

  // Bottom sheet / Property Pedigree state
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingCluster | null>(null);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [pedigreeData, setPedigreeData] = useState<PropertyPedigree | null>(null);
  const [pedigreeLoading, setPedigreeLoading] = useState(false);
  const [pedigreeTab, setPedigreeTab] = useState<'alerts' | 'units'>('alerts');

  // Init state
  const [initSource, setInitSource] = useState<MapInitSource | null>(null);
  const [gpsPromptDismissed, setGpsPromptDismissed] = useState(false);
  const [showGpsPrompt, setShowGpsPrompt] = useState(false);
  const initDone = useRef(false);
  const [firstSymbolLayer, setFirstSymbolLayer] = useState<string | undefined>(undefined);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Current user's rental address
  const [currentHome, setCurrentHome] = useState<RentalEntry | null>(null);
  const [sameAddressAlert, setSameAddressAlert] = useState<string | null>(null);

  // User location state
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [deviceLocation, setDeviceLocation] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [profileContextLoading, setProfileContextLoading] = useState(
    () => typeof window !== 'undefined' && Boolean(window.localStorage.getItem('ghar_email') || ''),
  );
  const [showOpalPanel, setShowOpalPanel] = useState(false);
  const [showTransportNetworkBurst, setShowTransportNetworkBurst] = useState(false);
  const [transportBurstExpanded, setTransportBurstExpanded] = useState(false);
  const [showGroceryRetailerBurst, setShowGroceryRetailerBurst] = useState(false);
  const [groceryBurstExpanded, setGroceryBurstExpanded] = useState(false);
  const [pendingInitialTransportTarget, setPendingInitialTransportTarget] = useState<DashboardInitialTransportTarget | null>(null);
  const [selectedTransportNetworkId, setSelectedTransportNetworkId] = useState<TransportNetworkId | null>(null);
  const [opalEligibility, setOpalEligibility] = useState<TransportEligibility | null>(null);
  const [opalEligibilityLoading, setOpalEligibilityLoading] = useState(false);
  const [opalOrigin, setOpalOrigin] = useState<TransportLocationReference | null>(null);
  const [opalDestination, setOpalDestination] = useState<TransportLocationReference | null>(null);
  const [opalOriginQuery, setOpalOriginQuery] = useState('');
  const [opalDestinationQuery, setOpalDestinationQuery] = useState('');
  const [opalActiveField, setOpalActiveField] = useState<'origin' | 'destination' | null>(null);
  const [opalSuggestions, setOpalSuggestions] = useState<PlannerLocationSuggestion[]>([]);
  const [opalSearchLoading, setOpalSearchLoading] = useState(false);
  const [opalTripsLoading, setOpalTripsLoading] = useState(false);
  const [opalTrips, setOpalTrips] = useState<TransportTripOption[]>([]);
  const [opalTripError, setOpalTripError] = useState<string | null>(null);
  const [opalInfoMessage, setOpalInfoMessage] = useState<string | null>(null);
  const [opalSelectedTrip, setOpalSelectedTrip] = useState<TransportTripOption | null>(null);
  const [opalDepartures, setOpalDepartures] = useState<TransportDeparture[]>([]);
  const [opalDeparturesLoading, setOpalDeparturesLoading] = useState(false);
  const [qldStatusItems, setQldStatusItems] = useState<TransportStatusItem[]>([]);
  const [qldStatusLoading, setQldStatusLoading] = useState(false);
  const [qldRetailers, setQldRetailers] = useState<TransportRetailer[]>([]);
  const [qldRetailersLoading, setQldRetailersLoading] = useState(false);
  const [opalHomeLoading, setOpalHomeLoading] = useState(false);
  const [opalWorkLoading, setOpalWorkLoading] = useState(false);
  const [opalWhenMode, setOpalWhenMode] = useState<'leave_now' | 'depart_at' | 'arrive_by'>('leave_now');
  const [opalDate, setOpalDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [opalTime, setOpalTime] = useState(format(new Date(), 'HH:mm'));
  const [opalSelectedModes, setOpalSelectedModes] = useState<string[]>(ALL_OPAL_MODE_IDS);
  const [opalWheelchairOnly, setOpalWheelchairOnly] = useState(false);
  const [showFuelPanel, setShowFuelPanel] = useState(false);
  const [fuelLoading, setFuelLoading] = useState(false);
  const [fuelResults, setFuelResults] = useState<FuelStationResult[]>([]);
  const [fuelSelectedProducts, setFuelSelectedProducts] = useState<string[]>(ALL_FUEL_PRODUCT_IDS);
  const [fuelError, setFuelError] = useState<string | null>(null);
  const [fuelSupported, setFuelSupported] = useState(true);
  const [fuelState, setFuelState] = useState('');
  const [fuelTargetLabel, setFuelTargetLabel] = useState('');
  const [fuelSearchQuery, setFuelSearchQuery] = useState('');
  const [fuelSearchResults, setFuelSearchResults] = useState<NominatimResult[]>([]);
  const [fuelSearchLoading, setFuelSearchLoading] = useState(false);
  const [showFuelSearchResults, setShowFuelSearchResults] = useState(false);
  const [fuelTarget, setFuelTarget] = useState<{
    lat: number;
    lng: number;
    state?: string;
    suburb?: string;
    label: string;
  } | null>(null);
  const [fuelResolvedQueryKey, setFuelResolvedQueryKey] = useState('');
  const [fuelResultsStale, setFuelResultsStale] = useState(false);
  const previousFuelProductsRef = useRef(fuelSelectedProducts.join(','));
  const fuelLookupRequestRef = useRef(0);
  const opalScrollContainerRef = useRef<HTMLDivElement | null>(null);
  const opalResultsRef = useRef<HTMLDivElement | null>(null);
  const opalPendingResultsScrollRef = useRef(false);
  const consumedTransportMenuTokenRef = useRef<number | null>(null);
  const transportBurstCloseTimeoutRef = useRef<number | null>(null);
  const groceryBurstCloseTimeoutRef = useRef<number | null>(null);
  const pendingInitialTransportKeyRef = useRef<string | null>(null);
  const runningInitialTransportKeyRef = useRef<string | null>(null);
  const transportPreviewAppliedRef = useRef<string | null>(null);
  const hasSavedWorkDestination = Boolean(String(userProfile?.work_display_address || userProfile?.work_address || '').trim());
  const hoodieHelpDefaultTransportNetworkId = useMemo<TransportNetworkId>(() => {
    if (isWolliExperience) return 'nsw';
    const storedState = typeof window !== 'undefined' ? window.localStorage.getItem('ghar_au_state') || '' : '';
    return getTransportNetworkIdForState(userProfile?.australian_state || storedState) || 'nsw';
  }, [isWolliExperience, userProfile]);

  useEffect(() => {
    reportTripPlannerOpen(showOpalPanel);
    return () => {
      reportTripPlannerOpen(false);
    };
  }, [reportTripPlannerOpen, showOpalPanel]);

  const visibleFuelResults = useMemo(() => {
    const selected = new Set(fuelSelectedProducts);
    const filtered = fuelResults.filter((station) =>
      selected.has(normalizeFuelCategoryForDisplay(station.fuel_category, station.fuel_type)),
    );
    const grouped = new Map<string, FuelStationResult>();
    filtered.forEach((station) => {
      const normalizedCategory = normalizeFuelCategoryForDisplay(station.fuel_category, station.fuel_type);
      const key = `${station.brand}|${station.name}|${station.address}|${station.lat.toFixed(5)}|${station.lng.toFixed(5)}|${normalizedCategory}`;
      const normalizedStation = {
        ...station,
        fuel_category: normalizedCategory,
      } as FuelStationResult;
      const existing = grouped.get(key);
      if (!existing) {
        grouped.set(key, normalizedStation);
        return;
      }
      const existingPrice = existing.price_cpl ?? Infinity;
      const nextPrice = normalizedStation.price_cpl ?? Infinity;
      if (nextPrice < existingPrice) grouped.set(key, normalizedStation);
    });
    return Array.from(grouped.values()).sort((a, b) => {
      const distanceA = a.drive_distance_km ?? a.straight_distance_km ?? Infinity;
      const distanceB = b.drive_distance_km ?? b.straight_distance_km ?? Infinity;
      if (distanceA !== distanceB) return distanceA - distanceB;
      const priceA = a.price_cpl ?? Infinity;
      const priceB = b.price_cpl ?? Infinity;
      return priceA - priceB;
    });
  }, [fuelResults, fuelSelectedProducts]);
  const activeFuelQueryKey = useMemo(
    () => buildFuelQueryKey(fuelTarget, fuelSelectedProducts),
    [fuelTarget, fuelSelectedProducts],
  );
  const hasFreshFuelResults = !fuelResultsStale && fuelResolvedQueryKey === activeFuelQueryKey;
  const publicToiletGeoJSON = useMemo(
    () => buildPublicToiletFeatureCollection(visiblePublicToilets),
    [visiblePublicToilets],
  );
  const publicToiletFilterSet = useMemo(
    () => new Set(activePublicToiletFilters),
    [activePublicToiletFilters],
  );
  const publicToiletResultOriginForSort = publicToiletResultOrigin || deviceLocation || userLocation || searchPin;
  const publicToiletResultItems = useMemo(
    () => sortPublicToiletsForResults(visiblePublicToilets, {
      origin: publicToiletResultOriginForSort,
      filters: publicToiletFilterSet,
    }),
    [publicToiletFilterSet, publicToiletResultOriginForSort, searchPin, userLocation, deviceLocation, visiblePublicToilets],
  );
  const opalCurrentLocationRef = useMemo(() => {
    if (!deviceLocation) return null;
    return buildOpalCoordReference(
      deviceLocation.lat,
      deviceLocation.lng,
      'Current location',
      opalEligibility?.label || '',
    );
  }, [deviceLocation, opalEligibility?.label]);
  const activeTransportNetwork = useMemo(
    () => getTransportNetworkById(selectedTransportNetworkId),
    [selectedTransportNetworkId],
  );
  const activeTransportProvider = activeTransportNetwork?.provider || '';
  const activeTransportState = activeTransportNetwork?.state || '';
  const transportPreviewMode = useMemo(() => {
    const value = new URLSearchParams(location.search).get('transportPreview');
    if (value === 'vic' || value === 'vic-results' || value === 'vic-trip') return value;
    return null;
  }, [location.search]);
  const availableOpalModeOptions = useMemo(
    () => getTransportModeOptions(activeTransportProvider),
    [activeTransportProvider],
  );
  const availableOpalModeIds = useMemo(
    () => availableOpalModeOptions.map((option) => option.id),
    [availableOpalModeOptions],
  );
  const inAppTransportPlanning = supportsInAppTransportPlanning(activeTransportNetwork);
  const transportSupportsWheelchairFilter = activeTransportProvider !== 'transport_wa' && activeTransportProvider !== 'transport_tas' && activeTransportProvider !== 'transport_nt';
  const opalProviderNotice = useMemo(
    () => opalSelectedTrip?.providerNotice || opalTrips.find((trip) => Boolean(trip.providerNotice))?.providerNotice || opalDepartures.find((departure) => Boolean(departure.providerNotice))?.providerNotice || null,
    [opalDepartures, opalSelectedTrip, opalTrips],
  );
  const dashboardSearchUsesAddressResults = dashboardSearchMode === 'address' || dashboardSearchMode === 'transport';
  const dashboardVisibleSearchResults = useMemo(() => {
    if (!dashboardSearchUsesAddressResults) return [];
    if (dashboardSearchMode === 'transport') {
      return filterTransportAddressResults(searchResults, activeTransportState, searchQuery).slice(0, 6);
    }
    return searchResults.slice(0, 6);
  }, [activeTransportState, dashboardSearchMode, dashboardSearchUsesAddressResults, searchQuery, searchResults]);
  const getDashboardSearchBias = useCallback(() => {
    const mapCenter = mapGLRef.current?.getMap()?.getCenter();
    const lat = Number(mapCenter?.lat);
    const lng = Number(mapCenter?.lng);
    const state = dashboardSearchMode === 'transport'
      ? activeTransportState
      : normalizeAustralianStateLabel(
        searchTargetState ||
        (currentHome as any)?.state ||
        userProfile?.australian_state ||
        '',
      );

    return {
      state,
      lat: Number.isFinite(lat) ? lat : undefined,
      lng: Number.isFinite(lng) ? lng : undefined,
    };
  }, [activeTransportState, currentHome, dashboardSearchMode, searchTargetState, userProfile?.australian_state]);
  const qldRetailerTarget = useMemo(() => {
    const finalLeg = opalSelectedTrip?.legs[opalSelectedTrip.legs.length - 1];
    if (finalLeg && finalLeg.destinationLat != null && finalLeg.destinationLng != null) {
      return { lat: finalLeg.destinationLat, lng: finalLeg.destinationLng };
    }
    if (opalDestination && opalDestination.lat != null && opalDestination.lng != null) {
      return { lat: opalDestination.lat, lng: opalDestination.lng };
    }
    if (deviceLocation) return { lat: deviceLocation.lat, lng: deviceLocation.lng };
    return null;
  }, [deviceLocation, opalDestination, opalSelectedTrip]);
  useEffect(() => {
    setOpalSelectedModes((current) => {
      const supported = new Set(availableOpalModeIds);
      const filtered = current.filter((id) => supported.has(id));
      if (filtered.length === 0) return availableOpalModeIds;
      if (filtered.length === current.length) return current;
      return filtered;
    });
  }, [availableOpalModeIds]);

  useEffect(() => {
    if (!transportPreviewMode) {
      transportPreviewAppliedRef.current = null;
      return;
    }
    if (transportPreviewAppliedRef.current === transportPreviewMode) return;
    transportPreviewAppliedRef.current = transportPreviewMode;

    const previewOrigin = buildOpalCoordReference(
      VICTORIA_PREVIEW_ORIGIN.lat,
      VICTORIA_PREVIEW_ORIGIN.lng,
      VICTORIA_PREVIEW_ORIGIN.name,
      VICTORIA_PREVIEW_ORIGIN.subtitle,
    );
    const previewDestination = buildOpalCoordReference(
      VICTORIA_PREVIEW_DESTINATION.lat,
      VICTORIA_PREVIEW_DESTINATION.lng,
      VICTORIA_PREVIEW_DESTINATION.name,
      VICTORIA_PREVIEW_DESTINATION.subtitle,
    );
    const previewTrips = buildVictoriaPreviewTrips({
      origin: previewOrigin,
      destination: previewDestination,
      whenMode: 'leave_now',
      date: format(new Date(), 'yyyy-MM-dd'),
      time: format(new Date(), 'HH:mm'),
      modes: ALL_OPAL_MODE_IDS,
      wheelchairOnly: false,
    });
    const previewSelectedTrip = transportPreviewMode === 'vic-trip' ? previewTrips[0] || null : null;

    setSelectedTransportNetworkId('vic');
    setShowOpalPanel(true);
    setShowTransportNetworkBurst(false);
    setTransportBurstExpanded(false);
    setShowFuelPanel(false);
    setShowLayers(false);
    setOpalActiveField(null);
    setOpalSuggestions([]);
    setOpalWhenMode('leave_now');
    setOpalDate(format(new Date(), 'yyyy-MM-dd'));
    setOpalTime(format(new Date(), 'HH:mm'));
    setOpalSelectedModes(ALL_OPAL_MODE_IDS);
    setOpalWheelchairOnly(false);
    setOpalOrigin(previewOrigin);
    setOpalOriginQuery(VICTORIA_PREVIEW_ORIGIN.name);
    setOpalDestination(previewDestination);
    setOpalDestinationQuery(VICTORIA_PREVIEW_DESTINATION.name);
    setOpalTrips(previewTrips);
    setOpalSelectedTrip(previewSelectedTrip);
    setOpalDepartures(previewSelectedTrip ? buildVictoriaPreviewDepartures(previewSelectedTrip) : []);
    setOpalDeparturesLoading(false);
    setOpalTripError(null);
    setOpalInfoMessage('Previewing in-app Victoria trip planning with mock data.');
    opalPendingResultsScrollRef.current = false;
  }, [transportPreviewMode]);

  useEffect(() => {
    if (!showTransportNetworkBurst) {
      setTransportBurstExpanded(false);
      return;
    }
    if (transportBurstCloseTimeoutRef.current != null) {
      window.clearTimeout(transportBurstCloseTimeoutRef.current);
      transportBurstCloseTimeoutRef.current = null;
    }
    setTransportBurstExpanded(false);
    let frameOne = 0;
    let frameTwo = 0;
    frameOne = window.requestAnimationFrame(() => {
      frameTwo = window.requestAnimationFrame(() => {
        setTransportBurstExpanded(true);
      });
    });
    return () => {
      window.cancelAnimationFrame(frameOne);
      window.cancelAnimationFrame(frameTwo);
    };
  }, [showTransportNetworkBurst]);

  useEffect(() => {
    if (!showGroceryRetailerBurst) {
      setGroceryBurstExpanded(false);
      return;
    }
    if (groceryBurstCloseTimeoutRef.current != null) {
      window.clearTimeout(groceryBurstCloseTimeoutRef.current);
      groceryBurstCloseTimeoutRef.current = null;
    }
    setGroceryBurstExpanded(false);
    let frameOne = 0;
    let frameTwo = 0;
    frameOne = window.requestAnimationFrame(() => {
      frameTwo = window.requestAnimationFrame(() => {
        setGroceryBurstExpanded(true);
      });
    });
    return () => {
      window.cancelAnimationFrame(frameOne);
      window.cancelAnimationFrame(frameTwo);
    };
  }, [showGroceryRetailerBurst]);

  useEffect(() => () => {
    if (transportBurstCloseTimeoutRef.current != null) {
      window.clearTimeout(transportBurstCloseTimeoutRef.current);
    }
    if (groceryBurstCloseTimeoutRef.current != null) {
      window.clearTimeout(groceryBurstCloseTimeoutRef.current);
    }
  }, []);

  const email = localStorage.getItem('ghar_email') || '';

  // ─── EARLY USER LOCATION FETCH ────────────────────────────────
  useEffect(() => {
    const prevGps = localStorage.getItem('ghar_gps_granted');
    if (prevGps === 'denied') return;

    void getCurrentAppPosition({ timeout: 10000, maximumAge: 60000 })
      .then((pos) => {
        if (prevGps !== 'true') {
          localStorage.setItem('ghar_gps_granted', 'true');
        }
        const { latitude, longitude, accuracy } = pos.coords;
        setUserLocation({ lat: latitude, lng: longitude, accuracy: accuracy ?? undefined });
        setDeviceLocation({ lat: latitude, lng: longitude, accuracy: accuracy ?? undefined });
      })
      .catch((err) => {
        if (err.code === GEO_ERROR_CODES.PERMISSION_DENIED) {
          localStorage.setItem('ghar_gps_granted', 'denied');
        }
      });
  }, []);

  useEffect(() => {
    if (!deviceLocation) {
      setOpalEligibility(null);
      setOpalEligibilityLoading(false);
      return;
    }
    let cancelled = false;
    setOpalEligibilityLoading(true);
    fetchTransportEligibility(deviceLocation.lat, deviceLocation.lng)
      .then((result) => {
        if (!cancelled) setOpalEligibility(result);
      })
      .catch((error) => {
        console.error('GHAR Opal eligibility error:', error);
        if (!cancelled) {
          setOpalEligibility({
            eligible: false,
            state: '',
            suburb: '',
            label: '',
            provider: '',
          });
        }
      })
      .finally(() => {
        if (!cancelled) setOpalEligibilityLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [deviceLocation]);

  useEffect(() => {
    if (!showOpalPanel || activeTransportProvider !== 'transport_qld') {
      setQldStatusItems([]);
      setQldStatusLoading(false);
      return;
    }
    let cancelled = false;
    setQldStatusLoading(true);
    fetchTransportStatus('transport_qld')
      .then((items) => {
        if (!cancelled) setQldStatusItems(items.slice(0, 4));
      })
      .catch((error) => {
        console.error('GHAR QLD status error:', error);
        if (!cancelled) setQldStatusItems([]);
      })
      .finally(() => {
        if (!cancelled) setQldStatusLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeTransportProvider, showOpalPanel]);

  useEffect(() => {
    if (!showOpalPanel || activeTransportProvider !== 'transport_qld') {
      setQldRetailers([]);
      setQldRetailersLoading(false);
      return;
    }
    let cancelled = false;
    setQldRetailersLoading(true);
    fetchTransportRetailers({
      provider: 'transport_qld',
      lat: qldRetailerTarget?.lat,
      lng: qldRetailerTarget?.lng,
      limit: 4,
    })
      .then((items) => {
        if (!cancelled) setQldRetailers(items);
      })
      .catch((error) => {
        console.error('GHAR QLD retailers error:', error);
        if (!cancelled) setQldRetailers([]);
      })
      .finally(() => {
        if (!cancelled) setQldRetailersLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeTransportProvider, qldRetailerTarget, showOpalPanel]);

  // ─── EXPLORER DEFAULT UNI ───────────────────────────────────────
  useEffect(() => {
    const rawUniName = userProfile?.university || localStorage.getItem('ghar_university');
    if (rawUniName && rawUniName.trim().length > 3) {
      const searchName = rawUniName.trim().toLowerCase();
      if (UNIVERSITY_SUBURBS[rawUniName]) {
        setSelectedUni(rawUniName);
      } else {
        const match = Object.keys(UNIVERSITY_SUBURBS).find(u => u.toLowerCase().includes(searchName) || searchName.includes(u.toLowerCase()));
        if (match) setSelectedUni(match);
      }
    }
  }, [userProfile]);

  // ─── GLOBE SPIN ─────────────────────────────────────────────────
  const startSpin = useCallback(() => {
    const map = mapGLRef.current?.getMap();
    if (!map || !isGlobe || !globeAutoSpinEnabled) return;
    const spin = () => {
      if (!isGlobe || !globeAutoSpinEnabled) return;
      if (isInteracting || isFlying) {
        spinAnimationRef.current = requestAnimationFrame(spin);
        return;
      }
      const center = map.getCenter();
      map.setCenter([(center.lng + 0.08) % 360, center.lat]);
      spinAnimationRef.current = requestAnimationFrame(spin);
    };
    spinAnimationRef.current = requestAnimationFrame(spin);
  }, [globeAutoSpinEnabled, isGlobe, isInteracting, isFlying]);

  useEffect(() => {
    if (isGlobe && mapLoaded && globeAutoSpinEnabled) {
      startSpin();
    } else if (spinAnimationRef.current) {
      cancelAnimationFrame(spinAnimationRef.current);
      spinAnimationRef.current = null;
    }

    return () => {
      if (spinAnimationRef.current) {
        cancelAnimationFrame(spinAnimationRef.current);
        spinAnimationRef.current = null;
      }
    };
  }, [globeAutoSpinEnabled, isGlobe, mapLoaded, startSpin]);

  useEffect(() => {
    if (isGlobe) {
      setGlobeAutoSpinEnabled(true);
    }
    setIsInteracting(false);
  }, [isGlobe]);

  const toggleProjection = useCallback(() => {
    // Just flip the state — the isGlobe useEffect is the sole driver for
    // flying to globe / flat positions, avoiding double-flyTo races.
    setIsGlobe(prev => !prev);
  }, []);

  // ─── FETCH SUBURB BOUNDARY ───────────────────────────────────
  const fetchSuburbBoundary = useCallback(async (suburb: string) => {
    setIsLoadingSuburb(true);
    try {
      if (suburbsGeometryData[suburb]) {
        const geom = suburbsGeometryData[suburb];
        setSuburbGeoJSON(geom);
        const map = mapGLRef.current?.getMap();
        if (map && geom) {
          if (geom.type === 'Point' || (geom.type === 'Feature' && geom.geometry?.type === 'Point')) {
            const coords = geom.type === 'Point' ? geom.coordinates : geom.geometry.coordinates;
            map.flyTo({ center: [coords[0], coords[1]], zoom: 14, pitch: 0, bearing: 0, duration: 1800, essential: true });
          } else {
            const coords: number[][] = [];
            const extractCoords = (c: any) => {
              if (Array.isArray(c[0])) c.forEach(extractCoords);
              else coords.push(c);
            };
            const geometry = geom.type === 'Feature' ? geom.geometry : geom;
            if (geometry?.coordinates) extractCoords(geometry.coordinates);
            if (coords.length > 0) {
              const lngs = coords.map(c => c[0]);
              const lats = coords.map(c => c[1]);
              const bounds: [[number, number], [number, number]] = [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]];
              map.fitBounds(bounds, { padding: 80, maxZoom: 14, pitch: 0, bearing: 0, duration: 1800, essential: true });
            }
          }
        }
      } else {
        // Nominatim fallback
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(suburb + ', Australia')}&format=json&limit=1&polygon_geojson=1`);
        const results = await res.json();
        if (results[0]?.geojson) {
          setSuburbGeoJSON(results[0].geojson);
          const map = mapGLRef.current?.getMap();
          if (map) {
            const lat = parseFloat(results[0].lat);
            const lon = parseFloat(results[0].lon);
            map.flyTo({ center: [lon, lat], zoom: 13, pitch: 0, bearing: 0, duration: 1800, essential: true });
          }
        }
      }
    } catch (err) {
      console.error('GHAR suburb boundary error:', err);
    } finally {
      setIsLoadingSuburb(false);
    }
  }, []);

  // ─── MAP INITIALIZATION HIERARCHY ───────────────────────────────
  useEffect(() => {}, []);

  const [mapZoom, setMapZoom] = useState(13);

  // ─── TRANSIT STOP OVERLAY MARKERS ───────────────────────────────
  const [visibleTransit, setVisibleTransit] = useState<TransitStop[]>([]);
  const [visiblePolice, setVisiblePolice] = useState<any[]>([]);
  const [visibleHospitals, setVisibleHospitals] = useState<any[]>([]);

  const clearJobHubLayer = useCallback(() => {
    jobHubRequestRef.current += 1;
    setJobVenues([]);
    setJobHubGeoJSON(null);
  }, []);

  const loadJobHubsForMap = useCallback(async (map: any) => {
    const requestId = ++jobHubRequestRef.current;

    if (!layerJobHubs) {
      setJobVenues([]);
      setJobHubGeoJSON(null);
      return;
    }

    try {
      if (isGlobe) {
        const { venues } = await resolveGlobeJobHubVenues(
          getCachedJobVenueBatches,
          ensureAustraliaWideJobsPrefetched,
        );
        if (jobHubRequestRef.current !== requestId || !layerJobHubs) return;
        setJobVenues(venues);
        setJobHubGeoJSON(buildJobHeatmapGeoJSON(venues));
        return;
      }

      const bounds = map.getBounds();
      const sw = bounds.getSouthWest();
      const ne = bounds.getNorthEast();
      const venues = await fetchEmploymentZones(sw.lat, sw.lng, ne.lat, ne.lng);
      if (jobHubRequestRef.current !== requestId || !layerJobHubs) return;
      setJobVenues(venues);
      setJobHubGeoJSON(buildJobHeatmapGeoJSON(venues));
    } catch (error) {
      if (jobHubRequestRef.current !== requestId || !layerJobHubs) return;
      console.error('GHAR job hubs map load error:', error);
      setJobVenues([]);
      setJobHubGeoJSON(buildJobHeatmapGeoJSON([]));
    }
  }, [isGlobe, layerJobHubs]);

  const loadPublicToiletsForMap = useCallback(async (map: any, options: { forceEnabled?: boolean } = {}) => {
    const requestId = ++publicToiletRequestRef.current;
    const shouldLoadToilets = options.forceEnabled || layerToilets;

    if (!shouldLoadToilets) {
      setVisiblePublicToilets([]);
      setActiveToiletPopup(null);
      setPublicToiletInfo(null);
      setPublicToiletMapLoading(false);
      return;
    }

    try {
      setPublicToiletMapLoading(true);
      const bounds = getPublicToiletViewportBounds(map, isGlobe);
      const cacheKey = `toilets:${getPublicToiletBoundsKey(bounds)}`;
      const toilets = await publicToiletCache.getOrCreate(cacheKey, async () => {
        const response = await fetchPublicToilets(bounds, { limit: PUBLIC_TOILET_VIEWPORT_LIMIT });
        return response.data;
      });
      if (publicToiletRequestRef.current !== requestId || (!options.forceEnabled && !layerToilets)) return;
      setVisiblePublicToilets(toilets);
      setPublicToiletInfo(null);
      setPublicToiletMapLoading(false);
    } catch (error) {
      if (publicToiletRequestRef.current !== requestId || (!options.forceEnabled && !layerToilets)) return;
      console.error('GHAR public toilet map load error:', error);
      setVisiblePublicToilets([]);
      setPublicToiletInfo('Could not load public toilets for this map area yet.');
      setPublicToiletMapLoading(false);
    }
  }, [isGlobe, layerToilets]);

  const updateTransitMarkers = useCallback(async (map: any) => {
    try {
      const zoom = map.getZoom();
      setMapZoom(zoom);

      // ── GLOBE MODE: show all cached data without firing new viewport fetches ──
      // (The spin fires onMoveEnd continuously; we rely on the pre-fetch cache.)
      if (isGlobe) {
        const anyTransitOn = layerTrain || layerLightRail || layerBus;
        if (anyTransitOn) {
          const allStops: TransitStop[] = [];
          const seen = new Set<number>();
          transitCache.forEach(stops => {
            stops.forEach(s => { if (!seen.has(s.id)) { seen.add(s.id); allStops.push(s); } });
          });
          setVisibleTransit(allStops);
        }
        if (layerSurvival) {
          const allStores: SurvivalStore[] = [];
          const seen = new Set<number>();
          survivalStoreCache.cache.forEach(stores => {
            stores.forEach(s => { if (!seen.has(s.id)) { seen.add(s.id); allStores.push(s); } });
          });
          setVisibleSurvivalStores(allStores);
        }
        void loadJobHubsForMap(map);
        if (layerPolice) {
          setVisiblePolice(policeLocations.filter((ps: any) => ps.status === 'OPERATIONAL' && ps.coordinates?.lat && ps.coordinates?.lng));
        }
        if (layerHospital) {
          setVisibleHospitals(hospitalLocations.filter((h: any) => !h.closed && h.lat && h.lng));
        }
        if (layerToilets) {
          void loadPublicToiletsForMap(map);
        }
        return;
      }

      const bounds = map.getBounds();

      // ── TRANSIT — all zoom levels, no minimum zoom constraint ──
      const anyTransitOn = layerTrain || layerLightRail || layerBus;
      if (anyTransitOn) {
        const uniEntries = Object.entries(universityCoordinates);
        const centre = map.getCenter();

        const visibleUnis = uniEntries
          .filter(([, c]) => bounds.contains([c.lng, c.lat]))
          .map(([name, c]) => ({ key: name, lat: c.lat, lng: c.lng }));

        const nearestReal = uniEntries.reduce<{ key: string; lat: number; lng: number } | null>((best, [name, c]) => {
          const d = haversineDistance(centre.lat, centre.lng, c.lat, c.lng);
          if (!best) return { key: name, lat: c.lat, lng: c.lng };
          return d < haversineDistance(centre.lat, centre.lng, best.lat, best.lng)
            ? { key: name, lat: c.lat, lng: c.lng } : best;
        }, null);

        const centrePseudoKey = `__centre__${centre.lat.toFixed(2)}_${centre.lng.toFixed(2)}`;
        const toFetch: { key: string; lat: number; lng: number }[] = [...visibleUnis];
        if (nearestReal && !toFetch.find(u => u.key === nearestReal.key)) toFetch.push(nearestReal);
        if (!toFetch.find(u => u.key === centrePseudoKey)) toFetch.push({ key: centrePseudoKey, lat: centre.lat, lng: centre.lng });

        await fetchTransitAroundUniversities(toFetch);
        const stops = getVisibleTransitStops(bounds);
        setVisibleTransit(stops);
      }

      // ── Survival stores — ALL zoom levels ──
      if (layerSurvival) {
        const sw = bounds.getSouthWest();
        const ne = bounds.getNorthEast();
        const stores = await fetchSurvivalStores(sw.lat, sw.lng, ne.lat, ne.lng);
        setVisibleSurvivalStores(stores.filter((s: SurvivalStore) => bounds.contains([s.lng, s.lat])));
      }

      // ── Job Hub heatmap — ALL zoom levels, no minimum zoom constraint ──
      void loadJobHubsForMap(map);

      // ── Police stations ──
      if (layerPolice) {
        setVisiblePolice(policeLocations.filter((ps: any) =>
          ps.status === 'OPERATIONAL' && ps.coordinates?.lat && ps.coordinates?.lng &&
          bounds.contains([ps.coordinates.lng, ps.coordinates.lat])
        ));
      }

      // ── Hospitals ──
      if (layerHospital) {
        setVisibleHospitals(hospitalLocations.filter((h: any) =>
          !h.closed && h.lat && h.lng &&
          bounds.contains([h.lng, h.lat])
        ));
      }
      if (layerToilets) {
        void loadPublicToiletsForMap(map);
      }
    } catch (err) {
      console.error(err);
    }
  }, [isGlobe, layerTrain, layerLightRail, layerBus, layerSurvival, layerPolice, layerHospital, layerToilets, loadJobHubsForMap, loadPublicToiletsForMap]);

  // Clear markers when layers are turned off
  useEffect(() => {
    if (!layerSurvival) setVisibleSurvivalStores([]);
  }, [layerSurvival]);
  useEffect(() => {
    if (!layerPolice) { setVisiblePolice([]); setActivePolicePopup(null); }
  }, [layerPolice]);
  useEffect(() => {
    if (!layerHospital) { setVisibleHospitals([]); setActiveHospitalPopup(null); }
  }, [layerHospital]);
  useEffect(() => {
    if (!layerToilets) {
      publicToiletRequestRef.current += 1;
      setVisiblePublicToilets([]);
      setActiveToiletPopup(null);
      setPublicToiletInfo(null);
      setPublicToiletMapLoading(false);
      setShowPublicToiletPanel(false);
      setIsPublicToiletPanelMinimized(false);
    }
  }, [layerToilets]);

  // Clear job hubs when toggled off
  useEffect(() => {
    if (!layerJobHubs) { clearJobHubLayer(); }
  }, [clearJobHubLayer, layerJobHubs]);

  // ─── PRE-FETCH: all Australian universities for transit ─────────
  useEffect(() => {
    const anyTransitOn = layerTrain || layerLightRail || layerBus;
    if (!anyTransitOn || !mapLoaded) return;
    const allUnis = Object.entries(universityCoordinates).map(([name, c]) => ({
      key: name, lat: c.lat, lng: c.lng,
    }));
    fetchTransitAroundUniversities(allUnis).then(() => {
      const map = mapGLRef.current?.getMap();
      if (map) updateTransitMarkers(map);
    });
  }, [layerTrain, layerLightRail, layerBus, mapLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── PRE-FETCH: grocery stores for all major Australian hubs ────
  useEffect(() => {
    if (!layerSurvival || !mapLoaded) return;
    prefetchAustraliaWideStores().then(() => {
      const map = mapGLRef.current?.getMap();
      if (map) updateTransitMarkers(map);
    });
  }, [layerSurvival, mapLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── PRE-FETCH: employment venues for all major Australian hubs ──
  useEffect(() => {
    if (!layerJobHubs || !mapLoaded) return;
    ensureAustraliaWideJobsPrefetched().then(() => {
      const map = mapGLRef.current?.getMap();
      if (map) updateTransitMarkers(map);
    });
  }, [layerJobHubs, mapLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-run when transit/survival/job layers toggle
  useEffect(() => {
    const map = mapGLRef.current?.getMap();
    if (map) updateTransitMarkers(map);
  }, [layerTrain, layerLightRail, layerBus, layerSurvival, layerJobHubs, layerPolice, layerHospital, layerToilets, updateTransitMarkers]);

  // Trigger initial fetch when map first loads (both globe and flat modes)
  useEffect(() => {
    if (!mapLoaded) return;
    const map = mapGLRef.current?.getMap();
    if (map) updateTransitMarkers(map);
  }, [mapLoaded, isGlobe, updateTransitMarkers]);

  // Smart zoom-in after map is created
  useEffect(() => {
    if (!mapGLRef.current || initDone.current || !email) return;
    initDone.current = true;
    setProfileContextLoading(true);

    const runInit = async () => {
      let universityCoords: { lat: number; lng: number } | null = null;
      let fetchedProfile: any = null;
      try {
        fetchedProfile = await fetchProfile(email);
        setUserProfile(fetchedProfile);
        if (fetchedProfile?.university) {
          const coords = universityCoordinates[fetchedProfile.university];
          if (coords) {
            localStorage.setItem('ghar_university', fetchedProfile.university);
            universityCoords = coords;
          }
        }
      } catch (err) {
        console.error('GHAR profile fetch error:', err);
      }

      try {
        const rentalHistory = await fetchRentalHistory(email);
        if (rentalHistory && rentalHistory.length > 0) {
          // Priority 1: the entry explicitly flagged as current
          const currentEntry = rentalHistory.find((r: any) => r.is_current === true);
          // Priority 2: entry with no end_date (still living there)
          const openEntry = rentalHistory.find((r: any) => !r.end_date || r.end_date === null || r.end_date === '');
          // Priority 3: most recent by start_date
          const sortedByStart = [...rentalHistory].sort((a: any, b: any) => {
            const da = a.start_date ? new Date(a.start_date).getTime() : 0;
            const db = b.start_date ? new Date(b.start_date).getTime() : 0;
            return db - da;
          });
          const best = currentEntry || openEntry || sortedByStart[0];
          if (best?.address) {
            console.log('GHAR current home resolved to:', best.address, '| is_current:', best.is_current);
            setCurrentHome(best);
          }
        }
      } catch (err) {
        console.error('GHAR rental history error:', err);
      }

      const map = mapGLRef.current?.getMap();
      if (!map) return;

      // ── Save the user's location for when they manually switch to flat map ──
      // Do NOT call setIsGlobe(false) here — initial screen must stay as globe.
      const saveLocationState = () => {
        if (fetchedProfile?.lat && fetchedProfile?.lng) {
          setUserLocation({ lat: fetchedProfile.lat, lng: fetchedProfile.lng });
          setInitSource('home');
        } else if (universityCoords) {
          setUserLocation({ lat: universityCoords.lat, lng: universityCoords.lng });
          setInitSource('university');
	        } else {
	          const userState = fetchedProfile?.australian_state;
	          if (userState && AUSTRALIAN_STATES[userState]) {
	            const stateCoords = AUSTRALIAN_STATES[userState];
	            setUserLocation({ lat: stateCoords.lat, lng: stateCoords.lng });
	          } else if (isWolliExperience) {
	            setUserLocation(WOLLI_CREEK_MAP_CENTER);
	          }
	          setInitSource('default');
	        }
        // Globe stays — user presses the toggle to switch to flat view
      };

      const prevGps = localStorage.getItem('ghar_gps_granted');
      if (prevGps !== 'denied') {
        void getCurrentAppPosition({ timeout: 8000, maximumAge: 60000 })
          .then((pos) => {
            const { latitude, longitude, accuracy } = pos.coords;
            localStorage.setItem('ghar_gps_granted', 'true');
            setUserLocation({ lat: latitude, lng: longitude, accuracy: accuracy ?? undefined });
            setInitSource('gps');
          })
          .catch((err) => {
            if (err.code === GEO_ERROR_CODES.PERMISSION_DENIED) {
              localStorage.setItem('ghar_gps_granted', 'denied');
            }
            saveLocationState();
          });
      } else {
        saveLocationState();
        setShowGpsPrompt(false);
      }
    };

    void runInit().finally(() => {
      setProfileContextLoading(false);
    });
	  }, [email, isWolliExperience, mapLoaded]);

  useEffect(() => {
    if (email) return;
    setProfileContextLoading(false);
  }, [email]);

  useEffect(() => {}, [userLocation]);

  // ─── FALLBACK LOCATION: current address → uni → state → Melbourne ──
  const handleLocateFallback = useCallback(() => {
    const map = mapGLRef.current?.getMap();
    if (!map) return;
    // Priority 1: CURRENT home address
    if (currentHome && currentHome.lat && currentHome.lng) {
      const lat = Number(currentHome.lat), lng = Number(currentHome.lng);
      map.flyTo({ center: [lng, lat], zoom: 15, duration: 2500 });
      setUserLocation({ lat, lng });
      setInitSource('home');
      return;
    }
    // Priority 2: Profile address
    if (userProfile?.lat && userProfile?.lng) {
      map.flyTo({ center: [userProfile.lng, userProfile.lat], zoom: 15, duration: 2500 });
      setUserLocation({ lat: userProfile.lat, lng: userProfile.lng });
      setInitSource('home');
      return;
    }
    // Priority 3: University
    const cachedUni = userProfile?.university || localStorage.getItem('ghar_university');
    const uniCoords = cachedUni ? universityCoordinates[cachedUni] : null;
    if (uniCoords) {
      map.flyTo({ center: [uniCoords.lng, uniCoords.lat], zoom: 14, duration: 2500 });
      setUserLocation({ lat: uniCoords.lat, lng: uniCoords.lng });
      setInitSource('university');
      return;
    }
    // Priority 4: State
    const userState = userProfile?.australian_state;
    if (userState && AUSTRALIAN_STATES[userState]) {
      const stateCoords = AUSTRALIAN_STATES[userState];
      map.flyTo({ center: [stateCoords.lng, stateCoords.lat], zoom: 10, duration: 2500 });
      setUserLocation({ lat: stateCoords.lat, lng: stateCoords.lng });
      setInitSource('default');
      return;
    }
    const fallbackCenter = isWolliExperience ? WOLLI_CREEK_MAP_CENTER : { lat: -37.8136, lng: 144.9631 };
    map.flyTo({ center: [fallbackCenter.lng, fallbackCenter.lat], zoom: isWolliExperience ? 14 : 13, duration: 2500 });
    setUserLocation(fallbackCenter);
    setInitSource('default');
  }, [currentHome, isWolliExperience, userProfile]);

  // ─── CROSSHAIR: GPS first, current address fallback ──────────────
  const handleLocateMe = useCallback(() => {
    void getCurrentAppPosition({ timeout: 10000, maximumAge: 0 })
      .then((pos) => {
        localStorage.setItem('ghar_gps_granted', 'true');
        const { latitude, longitude, accuracy } = pos.coords;
        if (isGlobe) setIsGlobe(false);
        setTimeout(() => {
          mapGLRef.current?.getMap()?.flyTo({ center: [longitude, latitude], zoom: 15, pitch: 0, bearing: 0, duration: 2500 });
        }, isGlobe ? 350 : 0);
        setUserLocation({ lat: latitude, lng: longitude, accuracy: accuracy ?? undefined });
        setDeviceLocation({ lat: latitude, lng: longitude, accuracy: accuracy ?? undefined });
        setInitSource('gps');
        setGeoError(null);
      })
      .catch((err) => {
        console.log('GHAR geolocation denied/unavailable:', geoErrorMessage(err), `(code: ${err.code})`);
        if (err.code === GEO_ERROR_CODES.PERMISSION_DENIED) localStorage.setItem('ghar_gps_granted', 'denied');
        setGeoError(geoErrorMessage(err));
        handleLocateFallback();
      });
  }, [isGlobe, handleLocateFallback]);

  const handleGpsDeny = () => {
    setShowGpsPrompt(false);
    setGpsPromptDismissed(true);
    localStorage.setItem('ghar_gps_granted', 'denied');
  };

  useEffect(() => {
    if (!mapLoaded) return;
    const map = mapGLRef.current?.getMap();
    if (!map) return;
    return applyMapProjectionWhenReady(map, isGlobe ? 'globe' : 'mercator');
  }, [isGlobe, mapLoaded]);

  // ─── PROJECTION TRANSITION EFFECTS ──────────────────────────────
  useEffect(() => {
    if (!mapLoaded) return;
    const map = mapGLRef.current?.getMap();
    if (!map) return;

    if (isGlobe) {
      // Give the map a beat to finish the globe projection switch before flying out.
      setIsFlying(true);
      const tid = setTimeout(() => {
        const m = mapGLRef.current?.getMap();
        if (!m) return;
        m.flyTo({
          center: [133.7751, -25.2744],
          zoom: getGlobeZoom(),
          pitch: 0,
          bearing: 0,
          duration: 2000,
          essential: true,
        });
        setTimeout(() => setIsFlying(false), 2000);
      }, 120);
      return () => clearTimeout(tid);
    } else {
      // Give MapLibre time to finish the mercator switch before the focused flyTo.
      setIsFlying(true);
      const tid = setTimeout(() => {
        const m = mapGLRef.current?.getMap();
        if (!m) return;
        let targetLat = isWolliExperience ? WOLLI_CREEK_MAP_CENTER.lat : -37.8136;
        let targetLng = isWolliExperience ? WOLLI_CREEK_MAP_CENTER.lng : 144.9631;
        const focusedMapCameraTarget = focusedMapCameraTargetRef.current;
        if (focusedMapCameraTarget && hasValidFocusedMapCoordinatePair(focusedMapCameraTarget.lat, focusedMapCameraTarget.lng)) {
          targetLat = focusedMapCameraTarget.lat;
          targetLng = focusedMapCameraTarget.lng;
        } else if (userLocation?.lat && userLocation?.lng) {
          targetLat = userLocation.lat; targetLng = userLocation.lng;
        } else if (currentHome?.lat && currentHome?.lng) {
          targetLat = Number(currentHome.lat); targetLng = Number(currentHome.lng);
        } else if (userProfile?.lat && userProfile?.lng) {
          targetLat = userProfile.lat; targetLng = userProfile.lng;
        } else if (userProfile?.university && universityCoordinates[userProfile.university]) {
          targetLat = universityCoordinates[userProfile.university].lat;
          targetLng = universityCoordinates[userProfile.university].lng;
        } else if (userProfile?.australian_state && AUSTRALIAN_STATES[userProfile.australian_state]) {
          targetLat = AUSTRALIAN_STATES[userProfile.australian_state].lat;
          targetLng = AUSTRALIAN_STATES[userProfile.australian_state].lng;
        }
        m.flyTo({ center: [targetLng, targetLat], zoom: 14, pitch: 0, bearing: 0, duration: 2500, essential: true });
        setTimeout(() => setIsFlying(false), 2500);
      }, 250);
      return () => clearTimeout(tid);
    }
  }, [isGlobe, isWolliExperience, mapLoaded]);

  // ─── DELETE STATE ─────────────────────────────────────────────
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleDeleteListing = useCallback(async (listingId: string) => {
    if (!email) return;
    setDeleteLoading(true);
    try {
      await deleteListing(listingId, email);
      setActivePopupListing(null);
      setDeleteConfirmId(null);
      if (onDeleteListing) await onDeleteListing(listingId);
    } catch (err) {
      console.error('GHAR delete listing error:', err);
      alert(err instanceof Error ? err.message : 'Failed to delete listing');
    } finally {
      setDeleteLoading(false);
    }
  }, [email, onDeleteListing]);

  const validListings = useMemo(() =>
    listings.filter(l => l.category === 'scam' || l.category === 'maintenance'),
    [listings]
  );

  const filteredListings = useMemo(() => validListings.filter((l) => {
    if (l.category === 'scam' && !layerScams) return false;
    if (l.category === 'maintenance' && !layerMaintenance) return false;
    return true;
  }), [validListings, layerScams, layerMaintenance]);

  const buildingClusters = useMemo(() => {
    const groups: Record<string, BuildingCluster> = {};
    filteredListings.forEach(l => {
      const key = `${l.lat.toFixed(4)}_${l.lng.toFixed(4)}`;
      if (!groups[key]) groups[key] = { key, lat: l.lat, lng: l.lng, address: l.address, listings: [] };
      groups[key].listings.push(l);
    });
    return Object.values(groups);
  }, [filteredListings]);

  const scamCount = validListings.filter(l => l.category === 'scam').length;
  const maintenanceCount = validListings.filter(l => l.category === 'maintenance').length;

  // ─── SEARCH ──────────────────────────────────────────────────
  function clearDashboardSearchState() {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }
    isSelectingRef.current = false;
    setSearchLoading(false);
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchResults(false);
    setDashboardSearchError(null);
    setDashboardSearchMode('address');
    setIsDashboardSearchActive(false);
  }

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (dashboardSearchRef.current && target && dashboardSearchRef.current.contains(target)) return;
      clearDashboardSearchState();
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, []);

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (!isDashboardSearchActive) {
      setSearchLoading(false);
      setShowSearchResults(false);
      return;
    }
    if (!dashboardSearchUsesAddressResults) {
      setSearchLoading(false);
      setSearchResults([]);
      setShowSearchResults(false);
      setDashboardSearchError(null);
      return;
    }
    if (!searchQuery || searchQuery.length < 3) {
      setSearchResults([]);
      setShowSearchResults(false);
      setDashboardSearchError(null);
      return;
    }
    if (isSelectingRef.current) { isSelectingRef.current = false; return; }
    let cancelled = false;
    setSearchLoading(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const bias = getDashboardSearchBias();
        const results = await resolveDashboardMapSearchResults(searchQuery, {
          state: bias.state,
          lat: bias.lat,
          lng: bias.lng,
          limit: 6,
        });
        if (cancelled) return;
        setSearchResults(results);
        const visibleResults = dashboardSearchMode === 'transport'
          ? filterTransportAddressResults(results, activeTransportState, searchQuery).slice(0, 6)
          : results.slice(0, 6);
        setShowSearchResults(visibleResults.length > 0);
        setDashboardSearchError(
          visibleResults.length === 0
            ? 'No matching Australian places found yet. Try a suburb, building, campus, or street.'
            : null,
        );
      } catch (err) {
        if (cancelled) return;
        console.error('GHAR search error:', err);
        setSearchResults([]);
        setShowSearchResults(false);
        setDashboardSearchError('We could not load map search results yet. Try again in a moment.');
      } finally {
        if (!cancelled) setSearchLoading(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [activeTransportState, dashboardSearchMode, dashboardSearchUsesAddressResults, getDashboardSearchBias, isDashboardSearchActive, searchQuery]);

  const handleSelectSearchResult = (result: NominatimResult, options: DashboardSearchOpenOptions = {}) => {
    const { openCommuterContext = true, preserveFocusedTarget = false } = options;
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setDashboardSearchError('We could not map that location yet.');
      return;
    }
    const resolvedState = normalizeAustralianStateLabel(result.address?.state || '');
    const resolvedSuburb = result.address?.suburb || result.address?.city || result.address?.town || '';
    focusedMapCameraTargetRef.current = preserveFocusedTarget ? { lat, lng } : null;
    setIsGlobe(false);
    // 350ms delay: gives MapLibre time to process the mercator projection switch
    // before the flyTo fires, preventing "Easing around a point is not supported
    // under globe projection". pitch: 0 is required — globe rejects non-zero pitch.
    setTimeout(() => {
      mapGLRef.current?.getMap()?.flyTo({ center: [lng, lat], zoom: 16, pitch: 0, bearing: 0, duration: 3500, essential: true });
    }, 350);
    isSelectingRef.current = true;
    setSearchQuery(result.display_name);
    setSearchTargetState(resolvedState);
    setSearchTargetSuburb(resolvedSuburb);
    setSearchTargetLabel(result.display_name);
    setShowSearchResults(false);
    setSearchResults([]);
    if (!preserveFocusedTarget) {
      focusedMapCameraTargetRef.current = null;
      setFocusedMapTarget(null);
      setFocusedMapPanelView('place');
      setIsFocusedMapTargetMinimized(false);
      setShowFocusedDirectionsChooser(false);
    }
    if (currentHome && currentHome.lat && currentHome.lng) {
      const dist = Math.sqrt(Math.pow(lat - currentHome.lat, 2) + Math.pow(lng - currentHome.lng, 2));
      if (dist < 0.001) {
        if (!sessionStorage.getItem('ghar_same_address_alert_shown')) {
          setSameAddressAlert('You are currently living here.');
          sessionStorage.setItem('ghar_same_address_alert_shown', 'true');
        }
      }
    }
    setRadiusCircleCenter(openCommuterContext ? {lat, lng} : null);
    setSearchPin({lat, lng});
    setShowBottomSheet(false);
    setSelectedBuilding(null);
    setCommuterTab('safety');

    if (!openCommuterContext) {
      setCommuterContext(null);
      return;
    }

    const RADIUS_M = 5000;
    const alertsInRadius = validListings.filter(l => haversineDistance(lat, lng, l.lat, l.lng) <= RADIUS_M);
    const scamInRadius = alertsInRadius.filter(l => l.category === 'scam').length;
    const maintInRadius = alertsInRadius.filter(l => l.category === 'maintenance').length;

    const targetPoint = turf.point([lng, lat]);
    let nearestAirport: any = null;
    let minAirportDist = Infinity;
    if (airportData && airportData.features) {
      airportData.features.forEach((feature) => {
        const dist = turf.distance(targetPoint, feature as any, { units: 'kilometers' });
        if (dist < minAirportDist) {
          minAirportDist = dist;
          nearestAirport = feature;
        }
      });
    }
    const nearestAirportData = nearestAirport ? {
      name: nearestAirport.properties.name,
      iata: nearestAirport.properties.iata_code || nearestAirport.properties.iata,
      type: nearestAirport.properties.type,
      distance_km: minAirportDist
    } : null;

    // Find nearest police station
    let nearestPoliceData: { name: string; address: string; distance_m: number; walk_min: number } | null = null;
    let minPoliceDist = Infinity;
    for (const ps of policeLocations) {
      if (ps.status !== 'OPERATIONAL' || !ps.coordinates?.lat || !ps.coordinates?.lng) continue;
      const d = haversineDistance(lat, lng, ps.coordinates.lat, ps.coordinates.lng);
      if (d < minPoliceDist) {
        minPoliceDist = d;
        nearestPoliceData = {
          name: ps.name,
          address: `${ps.address || ''}, ${ps.suburb || ''} ${ps.postcode || ''}`.trim().replace(/^,\s*/, ''),
          distance_m: Math.round(d * 1.3),
          walk_min: Math.max(1, Math.round((d * 1.3) / 80)),
        };
      }
    }

    // Look up NSW LGA crime context
    const crimeContext = lookupCrimeFromAddress(result.display_name);

    // Find nearest hospital
    let nearestHospitalData: { name: string; state: string; isPrivate: boolean; distance_m: number; walk_min: number } | null = null;
    let minHospitalDist = Infinity;
    for (const h of hospitalLocations) {
      if (h.closed || !h.lat || !h.lng) continue;
      const d = haversineDistance(lat, lng, h.lat, h.lng);
      if (d < minHospitalDist) {
        minHospitalDist = d;
        nearestHospitalData = {
          name: h.name,
          state: h.state || '',
          isPrivate: h.private ?? false,
          distance_m: Math.round(d * 1.3),
          walk_min: Math.max(1, Math.round((d * 1.3) / 80)),
        };
      }
    }

    setCommuterContext({
      address: result.display_name,
      lat, lng,
      alertsInRadius: alertsInRadius.length,
      scamCount: scamInRadius,
      maintenanceCount: maintInRadius,
      transit: [],
      transitLoading: true,
      nearestStore: null,
      storeLoading: true,
      employment: null,
      employmentLoading: true,
      nearestAirport: nearestAirportData,
      nearestPolice: nearestPoliceData,
      nearestHospital: nearestHospitalData,
      crimeContext,
    });
    const employmentRequestId = ++employmentContextRequestRef.current;
    const selectedJobHubRequestId = layerJobHubs ? ++jobHubRequestRef.current : jobHubRequestRef.current;
    fetchNearbyTransit(lat, lng).then(transitResults => {
      setCommuterContext(prev => prev ? { ...prev, transit: transitResults, transitLoading: false } : null);
    }).catch(() => {
      setCommuterContext(prev => prev ? { ...prev, transitLoading: false } : null);
    });
    // Fetch nearest student survival store (~4km radius)
    const pad = 0.04;
    fetchSurvivalStores(lat - pad, lng - pad, lat + pad, lng + pad).then(stores => {
      const nearest = findNearestSurvivalStore(lat, lng, stores);
      setCommuterContext(prev => prev ? { ...prev, nearestStore: nearest, storeLoading: false } : null);
    }).catch(() => {
      setCommuterContext(prev => prev ? { ...prev, storeLoading: false } : null);
    });
    // Fetch employment opportunity zones (tighter ~2.5km radius for accurate local density scoring)
    const jobPad = 0.025;
    fetchEmploymentZones(lat - jobPad, lng - jobPad, lat + jobPad, lng + jobPad).then(venues => {
      if (employmentContextRequestRef.current !== employmentRequestId) return;
      const uniCoord = userProfile?.university && universityCoordinates[userProfile.university]
        ? universityCoordinates[userProfile.university] : undefined;
      const analysis = calculateEmploymentScore(lat, lng, venues, uniCoord);
      setEmploymentAnalysis(analysis);
      setJobVenues(venues);
      if (layerJobHubs && jobHubRequestRef.current === selectedJobHubRequestId) {
        setJobHubGeoJSON(buildJobHeatmapGeoJSON(venues));
      }
      setCommuterContext(prev => prev ? { ...prev, employment: analysis, employmentLoading: false } : null);
    }).catch(() => {
      if (employmentContextRequestRef.current !== employmentRequestId) return;
      setCommuterContext(prev => prev ? { ...prev, employmentLoading: false } : null);
    });
  };

  const closeFocusedMapTarget = useCallback(() => {
    employmentContextRequestRef.current += 1;
    focusedMapCameraTargetRef.current = null;
    setFocusedMapTarget(null);
    setFocusedMapPanelView('place');
    setIsFocusedMapTargetMinimized(false);
    setShowFocusedDirectionsChooser(false);
    setDirectionsTarget(null);
    setCommuterContext(null);
    setRadiusCircleCenter(null);
  }, []);

  const openFocusedDirectionsUrl = useCallback((url: string) => {
    if (!url) return;
    if (isNativeShell()) {
      window.location.href = url;
      return;
    }
    const openedWindow = window.open(url, '_blank', 'noopener,noreferrer');
    if (!openedWindow) {
      window.location.assign(url);
    }
  }, []);

  const handleOpenFocusedDirections = useCallback(() => {
    if (!focusedMapTarget || !hasValidFocusedMapCoordinatePair(focusedMapTarget.lat, focusedMapTarget.lng)) {
      setDashboardSearchError('Could not open directions for this place yet.');
      return;
    }
    const { isAndroid, isIos } = getClientPlatform();
    if (isNativeShell() && isAndroid) {
      try {
        openFocusedDirectionsUrl(buildFocusedMapTargetDirectionsUrl(focusedMapTarget, 'android-system'));
        return;
      } catch (error) {
        console.error('GHAR android focused directions handoff error:', error);
      }
    }
    if (isIos || !isNativeShell() || isAndroid) {
      setDirectionsTarget(focusedMapTarget);
      setShowFocusedDirectionsChooser(true);
    }
  }, [focusedMapTarget, openFocusedDirectionsUrl]);

  const handleOpenFocusedDirectionsApp = useCallback((app: 'apple' | 'google' | 'waze') => {
    const target = directionsTarget || focusedMapTarget;
    if (!target || !hasValidFocusedMapCoordinatePair(target.lat, target.lng)) {
      setDashboardSearchError('Could not open directions for this place yet.');
      return;
    }
    try {
      const url = focusedMapTarget && target === focusedMapTarget
        ? buildFocusedMapTargetDirectionsUrl(focusedMapTarget, app)
        : buildMapDirectionsUrl(target, app);
      openFocusedDirectionsUrl(url);
      setShowFocusedDirectionsChooser(false);
      setDirectionsTarget(null);
    } catch (error) {
      console.error('GHAR focused directions chooser open error:', error);
      setDashboardSearchError('Could not open directions right now. Try again in a moment.');
    }
  }, [directionsTarget, focusedMapTarget, openFocusedDirectionsUrl]);

  const handleOpenToiletDirections = useCallback((toilet: PublicToiletLocation) => {
    if (!hasValidFocusedMapCoordinatePair(toilet.lat, toilet.lng)) {
      setPublicToiletInfo('Could not open directions for this toilet yet.');
      return;
    }
    setDirectionsTarget({
      label: toilet.name || 'Public toilet',
      lat: toilet.lat,
      lng: toilet.lng,
    });
    setShowFocusedDirectionsChooser(true);
  }, []);

  const closePublicToiletLayer = useCallback(() => {
    publicToiletRequestRef.current += 1;
    setLayerToilets(false);
    setShowPublicToiletPanel(false);
    setIsPublicToiletPanelMinimized(false);
    setVisiblePublicToilets([]);
    setActiveToiletPopup(null);
    setPublicToiletInfo(null);
    setPublicToiletMapLoading(false);
    setPublicToiletSearchError(null);
  }, []);

  const togglePublicToiletFilter = useCallback((filterId: PublicToiletFilterId) => {
    setActivePublicToiletFilters((prev) =>
      prev.includes(filterId)
        ? prev.filter((item) => item !== filterId)
        : [...prev, filterId],
    );
  }, []);

  const handleOpenPublicToiletResult = useCallback((toilet: PublicToiletLocation, distance?: { distanceM: number; walkMin: number } | null) => {
    setShowBottomSheet(false);
    setSelectedBuilding(null);
    setActivePopupListing(null);
    setActiveSurvivalPopup(null);
    setActiveAirportPopup(null);
    setActivePolicePopup(null);
    setActiveHospitalPopup(null);
    setActiveToiletPopup({
      ...toilet,
      ...(distance ? { distance_m: distance.distanceM, walk_min: distance.walkMin } : {}),
    } as PublicToiletLocation);
    setShowPublicToiletPanel(true);
    setIsPublicToiletPanelMinimized(false);
    setPublicToiletInfo(null);
    mapGLRef.current?.getMap()?.easeTo({
      center: [toilet.lng, toilet.lat],
      zoom: Math.max(mapGLRef.current?.getMap()?.getZoom?.() || 14, 16),
      offset: [0, -120],
      duration: 500,
      essential: true,
    });
  }, []);

  const loadPublicToiletsAroundPoint = useCallback(async (
    target: { lat: number; lng: number; label: string },
    options: { openNearest?: boolean; radiusKm?: number } = {},
  ) => {
    setLayerToilets(true);
    setShowPublicToiletPanel(true);
    setIsPublicToiletPanelMinimized(false);
    setIsGlobe(false);
    setPublicToiletResultOrigin(target);
    setSearchPin({ lat: target.lat, lng: target.lng });
    setSearchQuery(target.label);
    setSearchTargetLabel(target.label);
    setPublicToiletInfo('Finding public toilets nearby...');
    setPublicToiletSearchError(null);

    window.setTimeout(() => {
      const map = mapGLRef.current?.getMap();
      const currentZoom = Number(map?.getZoom?.());
      const gentleZoom = Number.isFinite(currentZoom)
        ? Math.min(Math.max(currentZoom, 12), 13)
        : 12;
      map?.flyTo({
        center: [target.lng, target.lat],
        zoom: gentleZoom,
        pitch: 0,
        bearing: 0,
        duration: 700,
        essential: true,
      });
    }, isGlobe ? 380 : 0);

    const bounds = buildPublicToiletNearbyBounds(target.lat, target.lng, options.radiusKm);
    const cacheKey = `toilets-nearby:${getPublicToiletBoundsKey(bounds)}`;
    setPublicToiletMapLoading(true);
    try {
      const toilets = await publicToiletCache.getOrCreate(cacheKey, async () => {
        const response = await fetchPublicToilets(bounds, { limit: PUBLIC_TOILET_NEARBY_LIMIT });
        return response.data;
      });
      setVisiblePublicToilets(toilets);
      setPublicToiletInfo(toilets.length ? null : 'No public toilets found nearby yet. Try zooming out or panning the map.');
      if (options.openNearest) {
        const nearest = findNearestPublicToilet(target.lat, target.lng, toilets);
        if (nearest) setActiveToiletPopup(nearest);
      }
    } catch (error) {
      console.error('GHAR public toilet nearby load error:', error);
      setVisiblePublicToilets([]);
      setPublicToiletInfo('Could not load public toilets right now. Try again in a moment.');
      setPublicToiletSearchError('Could not load public toilets right now. Try again in a moment.');
    } finally {
      setPublicToiletMapLoading(false);
    }
  }, [isGlobe]);

  const handlePublicToiletSearchSubmit = useCallback(async (event?: React.FormEvent) => {
    event?.preventDefault();
    const cleanQuery = publicToiletSearchQuery.trim();
    if (!cleanQuery) {
      setPublicToiletSearchError('Enter a place, landmark, or suburb, or tap Current location.');
      return;
    }
    setPublicToiletSearchLoading(true);
    setPublicToiletSearchError(null);
    try {
      const results = await searchOpenMapLocations(cleanQuery, { limit: 1 });
      const result = results[0];
      const lat = Number(result?.lat);
      const lng = Number(result?.lon);
      if (!result || !Number.isFinite(lat) || !Number.isFinite(lng)) {
        setPublicToiletSearchError('Could not find that place. Try a suburb, landmark, or nearby station.');
        return;
      }
      await loadPublicToiletsAroundPoint({
        lat,
        lng,
        label: getAddressSearchTitle(result) || cleanQuery,
      });
    } catch (error) {
      console.error('GHAR public toilet place search error:', error);
      setPublicToiletSearchError('Could not search that place right now.');
    } finally {
      setPublicToiletSearchLoading(false);
    }
  }, [loadPublicToiletsAroundPoint, publicToiletSearchQuery]);

  const handleReturnToFocusedMapSource = useCallback(() => {
    const route = buildFocusedMapTargetReturnRoute(focusedMapTarget);
    if (!route) return;
    navigate(route);
  }, [focusedMapTarget, navigate]);

  const openNearbyToiletFromCurrentLocation = useCallback(async (options: { fallbackToMapArea?: boolean; openNearest?: boolean } = {}) => {
    setPublicToiletInfo('Use your current location to find public toilets nearby.');
    setDashboardSearchError(null);
    setGeoError(null);
    setShowLayers(false);
    setShowBottomSheet(false);
    setSelectedBuilding(null);
    setActivePopupListing(null);
    setActiveSurvivalPopup(null);
    setActiveAirportPopup(null);
    setActivePolicePopup(null);
    setActiveHospitalPopup(null);
    setActiveToiletPopup(null);
    setShowFuelPanel(false);
    setShowOpalPanel(false);
    setFocusedMapTarget(null);
    setFocusedMapPanelView('place');
    setIsFocusedMapTargetMinimized(false);
    setShowFocusedDirectionsChooser(false);
    setCommuterContext(null);
    setRadiusCircleCenter(null);

    try {
      const position = await getCurrentAppPosition({ timeout: 10000, maximumAge: 60000 });
      const { latitude, longitude, accuracy } = position.coords;
      localStorage.setItem('ghar_gps_granted', 'true');
      const currentLocation = { lat: latitude, lng: longitude, accuracy: accuracy ?? undefined };
      focusedMapCameraTargetRef.current = { lat: latitude, lng: longitude };
      setUserLocation(currentLocation);
      setDeviceLocation(currentLocation);
      setInitSource('gps');
      setSearchTargetState('');
      setSearchTargetSuburb('');
      setIsDashboardSearchActive(false);
      setShowSearchResults(false);
      setSearchResults([]);
      await loadPublicToiletsAroundPoint({
        lat: latitude,
        lng: longitude,
        label: 'Nearby public toilets',
      }, {
        openNearest: options.openNearest ?? false,
        radiusKm: PUBLIC_TOILET_NEARBY_RADIUS_KM,
      });
    } catch (error) {
      console.log('GHAR nearby toilet location error:', error);
      const err = error as GeolocationPositionError;
      if (err?.code === GEO_ERROR_CODES.PERMISSION_DENIED) {
        localStorage.setItem('ghar_gps_granted', 'denied');
      }
      setPublicToiletInfo(null);
      setGeoError(geoErrorMessage(err));
      if (options.fallbackToMapArea) {
        const map = mapGLRef.current?.getMap();
        if (map) {
          setPublicToiletInfo('Loading public toilets for this map area...');
          await loadPublicToiletsForMap(map, { forceEnabled: true });
        }
      }
    }
  }, [loadPublicToiletsAroundPoint, loadPublicToiletsForMap]);

  const handleTogglePublicToiletLayer = useCallback(() => {
    if (layerToilets) {
      if (showPublicToiletPanel && !isPublicToiletPanelMinimized) {
        setShowPublicToiletPanel(false);
        setIsPublicToiletPanelMinimized(true);
        setPublicToiletInfo(null);
        return;
      }
      setShowPublicToiletPanel(true);
      setIsPublicToiletPanelMinimized(false);
      setPublicToiletInfo(null);
      return;
    }

    setLayerToilets(true);
    setShowPublicToiletPanel(true);
    setIsPublicToiletPanelMinimized(false);
    setPublicToiletSearchError(null);
    setShowLayers(false);
    void openNearbyToiletFromCurrentLocation({ fallbackToMapArea: true });
  }, [isPublicToiletPanelMinimized, layerToilets, openNearbyToiletFromCurrentLocation, showPublicToiletPanel]);

  useEffect(() => {
    if (!initialSearch?.query && initialSearch?.initialAction !== 'find-nearby-toilet') return;
    const searchKey = JSON.stringify(initialSearch);
    if (consumedInitialSearchRef.current === searchKey) return;
    consumedInitialSearchRef.current = searchKey;

    let cancelled = false;

    const runInitialSearch = async () => {
      if (initialSearch.initialAction === 'find-nearby-toilet') {
        await openNearbyToiletFromCurrentLocation();
        if (!cancelled) onInitialSearchConsumed?.();
        return;
      }

      const trimmedQuery = initialSearch.query.trim();
      if (!trimmedQuery) {
        onInitialSearchConsumed?.();
        return;
      }

      setIsDashboardSearchActive(true);
      setDashboardSearchMode('address');
      setDashboardSearchError(null);
      setSearchTargetState(initialSearch.state || '');
      setSearchTargetSuburb(initialSearch.suburb || '');
      setSearchTargetLabel(initialSearch.displayName || trimmedQuery);
      setSearchQuery(initialSearch.displayName || trimmedQuery);
      const isGuidePlaceSearch = initialSearch.source === 'guide-place' && Boolean(initialSearch.placeTarget);
      const isEventPlaceSearch = initialSearch.source === 'event-place' && Boolean(initialSearch.eventTarget);
      const nextFocusedMapTarget: DashboardFocusedMapTarget | null = isGuidePlaceSearch && initialSearch.placeTarget
        ? {
            ...initialSearch.placeTarget,
            kind: 'guide-place',
            returnGuide: initialSearch.placeTarget.returnGuide || initialSearch.returnGuide,
          }
        : isEventPlaceSearch && initialSearch.eventTarget
          ? {
              ...initialSearch.eventTarget,
              kind: 'event-place',
              returnEvent: initialSearch.eventTarget.returnEvent || initialSearch.returnEvent,
            }
          : null;
      setFocusedMapTarget(nextFocusedMapTarget);
      setFocusedMapPanelView('place');
      setIsFocusedMapTargetMinimized(false);
      setShowFocusedDirectionsChooser(false);

      if (hasValidFocusedMapCoordinatePair(initialSearch.lat, initialSearch.lng)) {
        if (nextFocusedMapTarget) {
          setCommuterContext(null);
          setShowBottomSheet(false);
          setSelectedBuilding(null);
          setActivePopupListing(null);
          setActiveSurvivalPopup(null);
          setActiveAirportPopup(null);
          setActivePolicePopup(null);
          setActiveHospitalPopup(null);
          setShowLayers(false);
          setShowTransportNetworkBurst(false);
          setShowGroceryRetailerBurst(false);
          setShowFuelPanel(false);
          setShowOpalPanel(false);
        }
        handleSelectSearchResult({
          place_id: Date.now(),
          display_name: initialSearch.displayName || trimmedQuery,
          lat: String(initialSearch.lat),
          lon: String(initialSearch.lng),
          address: {
            suburb: initialSearch.suburb || undefined,
            state: initialSearch.state || undefined,
          },
        }, {
          openCommuterContext: !nextFocusedMapTarget,
          preserveFocusedTarget: Boolean(nextFocusedMapTarget),
        });
        onInitialSearchConsumed?.();
        return;
      }

      setSearchLoading(true);
      try {
        const bias = getDashboardSearchBias();
        const results = await resolveDashboardMapSearchResults(trimmedQuery, {
          state: initialSearch.state || bias.state,
          lat: bias.lat,
          lng: bias.lng,
          limit: 6,
        });
        if (cancelled) return;
        setSearchResults(results);
        setShowSearchResults(results.length > 0);
        if (results.length === 0) {
          setDashboardSearchError('No matching Australian places found yet.');
        }
      } catch (error) {
        if (cancelled) return;
        console.error('GHAR initial dashboard search failed:', error);
        setDashboardSearchError('Could not load that map search yet.');
      } finally {
        if (!cancelled) {
          setSearchLoading(false);
          onInitialSearchConsumed?.();
        }
      }
    };

    void runInitialSearch();
    return () => {
      cancelled = true;
    };
  }, [getDashboardSearchBias, handleSelectSearchResult, initialSearch, onInitialSearchConsumed, openNearbyToiletFromCurrentLocation]);

  function closeDashboardSearchSurface(resetMode: boolean = true) {
    setIsDashboardSearchActive(false);
    setShowSearchResults(false);
    setSearchResults([]);
    setDashboardSearchError(null);
    if (resetMode) {
      setDashboardSearchMode('address');
    }
  }

  function handleDashboardFuelSearchHandoff(queryOverride?: string) {
    const trimmed = String(queryOverride ?? searchQuery).trim();
    closeDashboardSearchSurface();
    navigate('/fuel', {
      state: trimmed
        ? {
            initialFuelSearchQuery: trimmed,
            initialSearchMode: /^\d{4}$/.test(trimmed) ? 'postcode' : 'list',
          }
        : undefined,
    });
  }

  function handleDashboardGroceriesSearchHandoff(queryOverride?: string) {
    const trimmed = String(queryOverride ?? searchQuery).trim();
    closeDashboardSearchSurface();
    navigate('/shopping?retailer=compare', {
      state: trimmed
        ? {
            initialProductQuery: trimmed,
          }
        : undefined,
    });
  }

  function queueDashboardTransportTarget(target: DashboardInitialTransportTarget) {
    const networkId = getTransportNetworkIdForState(target.state || target.address || '');
    if (!networkId) {
      setDashboardSearchError('Search an Australian destination to open public transport planning.');
      return;
    }

    const requestKey = buildDashboardTransportRequestKey(target);
    pendingInitialTransportKeyRef.current = requestKey;
    runningInitialTransportKeyRef.current = null;
    setPendingInitialTransportTarget(target);
    setDashboardSearchError(null);
    handleOpenOpalPanel(networkId);
    closeDashboardSearchSurface();
  }

  function handleDashboardTransportSearchResult(result: NominatimResult) {
    const lat = Number(result.lat);
    const lng = Number(result.lon);
    const resolvedState = getAddressSearchState(result);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setDashboardSearchError('Pick a valid Australian destination to open public transport planning.');
      return;
    }
    if (!getTransportNetworkIdForState(resolvedState)) {
      setDashboardSearchError('Search an Australian destination to open public transport planning.');
      return;
    }

    const destinationDisplay = getAddressSearchDisplay(result);
    isSelectingRef.current = true;
    focusedMapCameraTargetRef.current = null;
    setFocusedMapTarget(null);
    setFocusedMapPanelView('place');
    setIsFocusedMapTargetMinimized(false);
    setShowFocusedDirectionsChooser(false);
    setSearchQuery(destinationDisplay);
    queueDashboardTransportTarget({
      name: getAddressSearchTitle(result),
      address: destinationDisplay,
      state: resolvedState,
      lat,
      lng,
    });
  }

  async function handleDashboardTransportSubmit() {
    const query = searchQuery.trim();
    if (query.length < 2) {
      setDashboardSearchError('Enter an Australian destination to plan a public transport trip.');
      return;
    }

    setSearchLoading(true);
    setDashboardSearchError(null);
    try {
      const bias = getDashboardSearchBias();
      const results = await resolveDashboardMapSearchResults(query, {
        state: activeTransportState || bias.state,
        lat: bias.lat,
        lng: bias.lng,
        limit: 6,
      });
      const rankedResults = filterTransportAddressResults(results, activeTransportState, query);
      setSearchResults(rankedResults);
      setShowSearchResults(rankedResults.length > 0);
      const bestResult = rankedResults[0];
      if (!bestResult) {
        setDashboardSearchError('Search an Australian destination to open public transport planning.');
        return;
      }
      handleDashboardTransportSearchResult(bestResult);
    } catch (error) {
      console.error('GHAR dashboard transport search submit error:', error);
      setDashboardSearchError('We could not resolve that destination yet. Try a clearer building, station, suburb, or postcode.');
    } finally {
      setSearchLoading(false);
    }
  }

  function handleDashboardSearchModeSelect(mode: DashboardSearchMode) {
    setDashboardSearchMode(mode);
    setDashboardSearchError(null);

    if (mode === 'fuel') {
      handleDashboardFuelSearchHandoff();
      return;
    }

    if (mode === 'groceries') {
      handleDashboardGroceriesSearchHandoff();
      return;
    }

    setIsDashboardSearchActive(true);
    setShowSearchResults(mode === 'address' || mode === 'transport' ? dashboardVisibleSearchResults.length > 0 : false);
  }

  function handleDashboardSearchResultSelection(result: NominatimResult) {
    if (dashboardSearchMode === 'transport') {
      handleDashboardTransportSearchResult(result);
      return;
    }

    handleSelectSearchResult(result);
    closeDashboardSearchSurface();
  }

  function handleDashboardSearchInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      clearDashboardSearchState();
      return;
    }

    if (event.key !== 'Enter') return;

    if (dashboardSearchMode === 'transport') {
      event.preventDefault();
      void handleDashboardTransportSubmit();
      return;
    }

    if (dashboardSearchMode === 'fuel') {
      event.preventDefault();
      handleDashboardFuelSearchHandoff();
      return;
    }

    if (dashboardSearchMode === 'groceries') {
      event.preventDefault();
      handleDashboardGroceriesSearchHandoff();
    }
  }

  const runFuelLookup = useCallback(async (
    target: {
    lat: number;
    lng: number;
    state?: string;
    suburb?: string;
    label: string;
  },
    requestedProducts: string[] = fuelSelectedProducts,
  ) => {
    const requestId = ++fuelLookupRequestRef.current;
    const requestedProductsKey = requestedProducts.join(',');
    const queryKey = buildFuelQueryKey(target, requestedProducts);
    setFuelTarget(target);
    setFuelTargetLabel(target.label);
    setFuelState(target.state || '');
    setFuelLoading(true);
    setFuelError(null);
    setFuelResults([]);
    setFuelResolvedQueryKey('');
    setFuelResultsStale(true);
    setFuelSupported(true);
    try {
      const response = await fetchNearbyFuelStations({
        lat: target.lat,
        lng: target.lng,
        state: target.state,
        suburb: target.suburb,
        targetLabel: target.label,
        products: requestedProducts,
      });
      if (fuelLookupRequestRef.current !== requestId) return;
      if (requestedProductsKey !== fuelSelectedProducts.join(',')) return;
      setFuelSupported(response.supported);
      setFuelState(response.state || target.state || '');
      setFuelTargetLabel(response.targetLabel || target.label);
      setFuelResults(response.results || []);
      setFuelResolvedQueryKey(queryKey);
      setFuelResultsStale(false);
      setFuelError(response.supported ? null : (response.message || 'Fuel support is coming soon in this state.'));
    } catch (err) {
      if (fuelLookupRequestRef.current !== requestId) return;
      if (requestedProductsKey !== fuelSelectedProducts.join(',')) return;
      console.error('GHAR fuel lookup error:', err);
      setFuelSupported(false);
      setFuelState(target.state || '');
      setFuelResults([]);
      setFuelResolvedQueryKey(queryKey);
      setFuelResultsStale(false);
      setFuelError(err instanceof Error ? err.message : 'Failed to load nearby fuel stations');
    } finally {
      if (fuelLookupRequestRef.current === requestId) {
        setFuelLoading(false);
      }
    }
  }, [fuelSelectedProducts]);

  const handleUseCurrentLocationFuel = useCallback(async () => {
    setFuelLoading(true);
    setFuelError(null);
    try {
      const position = await getCurrentAppPosition({ timeout: 10000, maximumAge: 0 });
      const target = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        state: '',
        suburb: '',
        label: 'Current location',
      };
      await runFuelLookup(target);
    } catch (error) {
      console.error('GHAR fuel current-location error:', error);
      setFuelResults([]);
      setFuelSupported(false);
      setFuelLoading(false);
      setFuelTarget(null);
      setFuelTargetLabel('Current location');
      setFuelState('');
      setFuelError(`Allow location access or search a ${FUEL_SUPPORTED_STATE_COPY} address to compare fuel prices.`);
    }
  }, [runFuelLookup]);

  const handleOpenFuelPanel = useCallback(async () => {
    setShowFuelPanel(true);
    setShowLayers(false);
    setFuelSearchQuery('');
    setFuelSearchResults([]);
    setShowFuelSearchResults(false);
    setFuelError(null);
    setFuelResults([]);
    setFuelResolvedQueryKey('');
    setFuelResultsStale(true);
    fuelLookupRequestRef.current += 1;
    setFuelSupported(true);
    setFuelLoading(false);
    setFuelTarget(null);
    setFuelTargetLabel('');
    setFuelState('');
    if (userLocation) {
      void runFuelLookup({
        lat: userLocation.lat,
        lng: userLocation.lng,
        label: 'Current location',
      });
      return;
    }
    void handleUseCurrentLocationFuel();
  }, [handleUseCurrentLocationFuel, runFuelLookup, userLocation]);

  const toggleFuelProduct = useCallback((productId: string) => {
    setFuelSelectedProducts((current) => {
      fuelLookupRequestRef.current += 1;
      setFuelResults([]);
      setFuelResolvedQueryKey('');
      setFuelResultsStale(true);
      setFuelError(null);
      if (showFuelPanel && fuelTarget) {
        setFuelLoading(true);
      }
      if (current.length === ALL_FUEL_PRODUCT_IDS.length) {
        return [productId];
      }
      if (current.includes(productId)) {
        return current.length === 1 ? ALL_FUEL_PRODUCT_IDS : current.filter((id) => id !== productId);
      }
      return [...current, productId];
    });
  }, [fuelTarget, showFuelPanel]);

  const handleFuelSearchQueryChange = useCallback((value: string) => {
    fuelLookupRequestRef.current += 1;
    setFuelSearchQuery(value);
    setFuelResults([]);
    setFuelResolvedQueryKey('');
    setFuelResultsStale(true);
    setFuelError(null);
    setFuelLoading(false);
    setFuelSupported(true);
    setFuelTarget(null);
    setFuelTargetLabel('');
    setFuelState('');
  }, []);

  const handleFuelSearchSubmit = useCallback(async () => {
    const query = fuelSearchQuery.trim();
    if (query.length < 2) return;
    fuelLookupRequestRef.current += 1;
    setFuelSearchLoading(true);
    setShowFuelSearchResults(false);
    setFuelResults([]);
    setFuelResolvedQueryKey('');
    setFuelResultsStale(true);
    setFuelError(null);
    setFuelLoading(false);
    setFuelSupported(true);
    setFuelTarget(null);
    setFuelTargetLabel('');
    setFuelState('');
    try {
      const results = await searchAddress(query);
      const filtered = filterFuelSearchResults(results, query);
      setFuelSearchResults(filtered);
      if (filtered.length === 0) {
        setFuelError(`Search a ${FUEL_SUPPORTED_STATE_COPY} address to compare fuel prices.`);
        return;
      }
      const best = filtered[0];
      const fallbackLocality = extractFuelLocalityFromDisplayName(best.display_name);
      const target = {
        lat: Number(best.lat),
        lng: Number(best.lon),
        state: normalizeAustralianStateLabel(best.address?.state || ''),
        suburb: best.address?.suburb || best.address?.city || best.address?.town || fallbackLocality || '',
        label: best.display_name,
      };
      setFuelSearchQuery(best.display_name);
      await runFuelLookup(target);
    } catch (err) {
      console.error('GHAR fuel search submit error:', err);
      setFuelError('Failed to resolve that address. Please try another nearby suburb or postcode.');
    } finally {
      setFuelSearchLoading(false);
    }
  }, [fuelSearchQuery, runFuelLookup]);

  const handleDriveToFuelStation = useCallback((station: FuelStationResult) => {
    const label = encodeURIComponent(station.name || station.brand || 'Fuel station');
    const lat = station.lat;
    const lng = station.lng;
    const isAndroid = /Android/i.test(navigator.userAgent);
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isAndroid) {
      window.location.href = `geo:${lat},${lng}?q=${lat},${lng}(${label})`;
      return;
    }
    if (isIOS) {
      window.location.href = `https://maps.apple.com/?daddr=${lat},${lng}&q=${label}`;
      return;
    }
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`, '_blank', 'noopener,noreferrer');
  }, []);

  useEffect(() => {
    if (!showFuelPanel) return;
    const query = fuelSearchQuery.trim();
    if (query.length < 2) {
      setFuelSearchResults([]);
      setShowFuelSearchResults(false);
      setFuelSearchLoading(false);
      return;
    }
    let cancelled = false;
    const timeout = setTimeout(async () => {
      try {
        setFuelSearchLoading(true);
        const results = await searchAddress(query);
        if (cancelled) return;
        const filtered = filterFuelSearchResults(results, query);
        setFuelSearchResults(filtered);
        setShowFuelSearchResults(filtered.length > 0);
      } catch (err) {
        if (cancelled) return;
        setFuelSearchResults([]);
        setShowFuelSearchResults(false);
      } finally {
        if (!cancelled) setFuelSearchLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [fuelSearchQuery, showFuelPanel]);

  const handleSelectFuelSearchResult = useCallback(async (result: NominatimResult) => {
    const fallbackLocality = extractFuelLocalityFromDisplayName(result.display_name);
    const target = {
      lat: Number(result.lat),
      lng: Number(result.lon),
      state: normalizeAustralianStateLabel(result.address?.state || ''),
      suburb: result.address?.suburb || result.address?.city || result.address?.town || fallbackLocality || '',
      label: result.display_name,
    };
    setFuelSearchQuery(result.display_name);
    setFuelSearchResults([]);
    setShowFuelSearchResults(false);
    fuelLookupRequestRef.current += 1;
    setFuelResults([]);
    setFuelResolvedQueryKey('');
    setFuelResultsStale(true);
    await runFuelLookup(target);
  }, [runFuelLookup]);

  useEffect(() => {
    const nextProducts = fuelSelectedProducts.join(',');
    if (previousFuelProductsRef.current === nextProducts) return;
    previousFuelProductsRef.current = nextProducts;
    if (!showFuelPanel || !fuelTarget) return;
    const timeout = setTimeout(() => {
      void runFuelLookup(fuelTarget, fuelSelectedProducts);
    }, 0);
    return () => clearTimeout(timeout);
  }, [fuelSelectedProducts, fuelTarget, runFuelLookup, showFuelPanel]);

  const resetOpalPlanner = useCallback(() => {
    setOpalTripError(null);
    setOpalInfoMessage(null);
    setOpalTrips([]);
    setOpalSelectedTrip(null);
    setOpalDepartures([]);
    setOpalDeparturesLoading(false);
  }, []);

  const handleUseCurrentLocationOpal = useCallback(async () => {
    setOpalTripError(null);
    setOpalInfoMessage(null);
    try {
      const nextDeviceLocation = deviceLocation || await getCurrentAppPosition({ timeout: 10000, maximumAge: 0 }).then((pos) => ({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy ?? undefined,
      }));
      setDeviceLocation(nextDeviceLocation);
      setUserLocation((current) => current || nextDeviceLocation);
      const locationRef = buildOpalCoordReference(
        nextDeviceLocation.lat,
        nextDeviceLocation.lng,
        'Current location',
        opalEligibility?.label || '',
      );
      setOpalOrigin(locationRef);
      setOpalOriginQuery('Current location');
      return locationRef;
    } catch (error) {
      console.error('GHAR transport current-location error:', error);
      setOpalTripError('Allow location access to plan a public transport trip from your current location.');
      return null;
    }
  }, [deviceLocation, opalEligibility?.label]);

  const resolveCurrentHomeOpalDestination = useCallback(async () => {
    if (profileContextLoading) {
      setOpalInfoMessage('Loading your saved home address. Try again in a moment.');
      return null;
    }
    const homeAddress = String((currentHome as any)?.display_address || currentHome?.address || '').trim();
    if (!homeAddress) {
      setOpalInfoMessage('Add your current home in Profile to use the Home quick action.');
      return null;
    }
    const homeLat = Number((currentHome as any)?.lat);
    const homeLng = Number((currentHome as any)?.lng);
    if (Number.isFinite(homeLat) && Number.isFinite(homeLng)) {
      return buildOpalCoordReference(homeLat, homeLng, 'Home', homeAddress);
    }
    setOpalHomeLoading(true);
    try {
      const results = await searchOpenMapLocations(homeAddress, {
        state: activeTransportState,
        limit: 6,
      }).catch(() => searchAddress(homeAddress));
      const bestMatch = results.find((result) => Number.isFinite(Number(result.lat)) && Number.isFinite(Number(result.lon))) || results[0];
      if (bestMatch) {
        return buildOpalReferenceFromAddressResult(bestMatch, 'Home', homeAddress);
      }
      throw new Error('No result');
    } catch (error) {
      console.error('GHAR Opal home resolve error:', error);
      setOpalTripError('We could not resolve your saved home address yet. Please check it in Profile.');
      return null;
    } finally {
      setOpalHomeLoading(false);
    }
  }, [activeTransportState, currentHome, profileContextLoading]);

  const resolveWorkOpalDestination = useCallback(async () => {
    if (profileContextLoading) {
      setOpalInfoMessage('Loading your saved work destination. Try again in a moment.');
      return null;
    }
    const workLabel = String(userProfile?.work_display_address || userProfile?.work_address || '').trim();
    if (!workLabel) {
      setOpalInfoMessage('Add a saved work destination in Profile to use the Work quick action.');
      return null;
    }
    const workLat = Number(userProfile?.work_lat);
    const workLng = Number(userProfile?.work_lng);
    if (Number.isFinite(workLat) && Number.isFinite(workLng)) {
      return buildOpalCoordReference(workLat, workLng, 'Work', workLabel);
    }
    setOpalWorkLoading(true);
    try {
      const results = await searchOpenMapLocations(workLabel, {
        state: activeTransportState,
        limit: 6,
      }).catch(() => searchAddress(workLabel));
      const bestMatch = results.find((result) => Number.isFinite(Number(result.lat)) && Number.isFinite(Number(result.lon))) || results[0];
      if (bestMatch) {
        return buildOpalReferenceFromAddressResult(bestMatch, 'Work', workLabel);
      }
      throw new Error('No result');
    } catch (error) {
      console.error('GHAR Opal work resolve error:', error);
      setOpalTripError('We could not resolve your saved work destination yet. Please check your Profile.');
      return null;
    } finally {
      setOpalWorkLoading(false);
    }
  }, [activeTransportState, profileContextLoading, userProfile]);

  const scrollOpalResultsIntoView = useCallback(() => {
    const scrollContainer = opalScrollContainerRef.current;
    const resultsAnchor = opalResultsRef.current;
    if (!scrollContainer || !resultsAnchor) return;
    const containerBounds = scrollContainer.getBoundingClientRect();
    const targetBounds = resultsAnchor.getBoundingClientRect();
    const nextTop = scrollContainer.scrollTop + (targetBounds.top - containerBounds.top) - 12;
    scrollContainer.scrollTo({ top: Math.max(0, nextTop), behavior: 'smooth' });
  }, []);

  const openExternalTransitDirections = useCallback((
    nextOrigin: TransportLocationReference | null = opalOrigin,
    nextDestination: TransportLocationReference | null = opalDestination,
  ) => {
    const originLat = nextOrigin?.lat ?? null;
    const originLng = nextOrigin?.lng ?? null;
    const destinationLat = nextDestination?.lat ?? null;
    const destinationLng = nextDestination?.lng ?? null;
    if (originLat == null || originLng == null || destinationLat == null || destinationLng == null) {
      setOpalTripError('Choose locations from search results or quick actions so we can open transit directions.');
      return false;
    }
    const originParam = `${originLat},${originLng}`;
    const destinationParam = `${destinationLat},${destinationLng}`;
    const destinationLabel = encodeURIComponent(nextDestination?.name || 'Destination');
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isIOS) {
      window.location.href = `https://maps.apple.com/?saddr=${originParam}&daddr=${destinationParam}&q=${destinationLabel}&dirflg=r`;
      return true;
    }
    window.open(
      `https://www.google.com/maps/dir/?api=1&origin=${originParam}&destination=${destinationParam}&travelmode=transit`,
      '_blank',
      'noopener,noreferrer',
    );
    return true;
  }, [opalDestination, opalOrigin]);

  const runOpalPlanner = useCallback(async (
    nextOrigin: TransportLocationReference | null = opalOrigin,
    nextDestination: TransportLocationReference | null = opalDestination,
    options?: {
      allowExternalFallback?: boolean;
    },
  ) => {
    const allowExternalFallback = options?.allowExternalFallback !== false;
    if (!activeTransportNetwork) {
      setOpalTripError('Choose a state transport network first.');
      return;
    }
    const resolvePlannerReference = async (
      field: 'origin' | 'destination',
      reference: TransportLocationReference | null,
      query: string,
    ) => {
      const cleanQuery = query.trim();
      if (reference && matchesTransportReferenceQuery(reference, cleanQuery)) {
        return {
          reference,
          displayQuery: cleanQuery || getTransportReferenceDisplayQuery(reference),
        };
      }
      if (!cleanQuery) {
        return reference
          ? {
              reference,
              displayQuery: getTransportReferenceDisplayQuery(reference),
            }
          : null;
      }
      if (field === 'origin' && /^current location$/i.test(cleanQuery)) {
        const currentLocationRef = opalCurrentLocationRef || await handleUseCurrentLocationOpal();
        return currentLocationRef
          ? {
              reference: currentLocationRef,
              displayQuery: 'Current location',
            }
          : null;
      }
      if (field === 'destination' && /^home$/i.test(cleanQuery)) {
        const homeRef = await resolveCurrentHomeOpalDestination();
        return homeRef
          ? {
              reference: homeRef,
              displayQuery: 'Home',
            }
          : null;
      }
      if (field === 'destination' && /^work$/i.test(cleanQuery)) {
        const workRef = await resolveWorkOpalDestination();
        return workRef
          ? {
              reference: workRef,
              displayQuery: 'Work',
            }
          : null;
      }
      const openMapResults = await searchOpenMapLocations(cleanQuery, {
        state: activeTransportState,
        limit: 6,
      }).catch((openMapError) => {
        console.error('GHAR open map reference resolve error:', openMapError);
        return [];
      });
      const bestOpenMapMatch = openMapResults[0];
      if (bestOpenMapMatch) {
        return {
          reference: buildOpalReferenceFromAddressResult(bestOpenMapMatch),
          displayQuery: getAddressSearchDisplay(bestOpenMapMatch),
        };
      }
      const results = await searchAddress(cleanQuery);
      const rankedResults = filterTransportAddressResults(results, activeTransportState, cleanQuery);
      const bestMatch = rankedResults[0];
      if (!bestMatch) return null;
      return {
        reference: buildOpalReferenceFromAddressResult(bestMatch),
        displayQuery: getAddressSearchDisplay(bestMatch),
      };
    };

    let resolvedPlannerOrigin: TransportLocationReference | null = nextOrigin;
    let resolvedPlannerDestination: TransportLocationReference | null = nextDestination;

    if (!inAppTransportPlanning || !activeTransportProvider) {
      const resolvedOrigin = await resolvePlannerReference('origin', nextOrigin, opalOriginQuery);
      const resolvedDestination = await resolvePlannerReference('destination', nextDestination, opalDestinationQuery);
      if (!resolvedOrigin || !resolvedDestination) {
        setOpalTripError('Pick a valid From and To place, then try again.');
        return;
      }
      setOpalOrigin(resolvedOrigin.reference);
      setOpalOriginQuery(resolvedOrigin.displayQuery);
      setOpalDestination(resolvedDestination.reference);
      setOpalDestinationQuery(resolvedDestination.displayQuery);
      setOpalSuggestions([]);
      setOpalActiveField(null);
      const requestOrigin = buildPlanningTransportReference(resolvedOrigin.reference);
      const requestDestination = buildPlanningTransportReference(resolvedDestination.reference);
      if (isSameTransportEndpoint(requestOrigin, requestDestination)) {
        setOpalTrips([]);
        setOpalSelectedTrip(null);
        setOpalDepartures([]);
        setOpalTripError('From and To are the same place. Pick a different destination to plan a trip.');
        setOpalInfoMessage(null);
        return;
      }
      setOpalTrips([]);
      setOpalSelectedTrip(null);
      setOpalDepartures([]);
      setOpalTripError(null);
      if (!allowExternalFallback) {
        setOpalInfoMessage(null);
        setOpalTripError(`We could not open ${activeTransportNetwork.label} transit directions automatically. Use Open in Maps to continue.`);
        return;
      }
      setOpalInfoMessage(`Opening transit directions in Maps for ${activeTransportNetwork.label}.`);
      openExternalTransitDirections(requestOrigin, requestDestination);
      return;
    }
    opalPendingResultsScrollRef.current = true;
    setOpalTripsLoading(true);
    setOpalTripError(null);
    setOpalInfoMessage(null);
    setOpalSelectedTrip(null);
    setOpalDepartures([]);
    try {
      const resolvedOrigin = await resolvePlannerReference('origin', nextOrigin, opalOriginQuery);
      const resolvedDestination = await resolvePlannerReference('destination', nextDestination, opalDestinationQuery);
      if (!resolvedOrigin || !resolvedDestination) {
        setOpalTrips([]);
        setOpalTripError('Pick a valid From and To place, then try again.');
        return;
      }
      resolvedPlannerOrigin = resolvedOrigin.reference;
      resolvedPlannerDestination = resolvedDestination.reference;
      setOpalOrigin(resolvedOrigin.reference);
      setOpalOriginQuery(resolvedOrigin.displayQuery);
      setOpalDestination(resolvedDestination.reference);
      setOpalDestinationQuery(resolvedDestination.displayQuery);
      setOpalSuggestions([]);
      setOpalActiveField(null);
      const requestOrigin = buildPlanningTransportReference(resolvedOrigin.reference);
      const requestDestination = buildPlanningTransportReference(resolvedDestination.reference);
      if (isSameTransportEndpoint(requestOrigin, requestDestination)) {
        setOpalTrips([]);
        setOpalTripError('From and To are the same place. Pick a different destination to plan a trip.');
        return;
      }
      const results = await fetchTransportTrips({
        provider: activeTransportProvider,
        origin: requestOrigin,
        destination: requestDestination,
        when: opalWhenMode,
        date: opalWhenMode === 'leave_now' ? undefined : opalDate,
        time: opalWhenMode === 'leave_now' ? undefined : opalTime,
        modes: opalSelectedModes,
        wheelchair: transportSupportsWheelchairFilter ? opalWheelchairOnly : false,
        maxTrips: 5,
      });
      setOpalTrips(results);
      if (results.length === 0) {
        setOpalTripError(
          activeTransportProvider === 'transport_tas' && opalWhenMode === 'leave_now'
            ? 'No scheduled Tasmania trips are running right now. Try Depart at for the next service.'
            : activeTransportProvider === 'transport_qld'
            ? 'Translink could not find a trip for those places yet. Try a stop, station, terminal, or suburb from the Translink list.'
            : 'No transport trips were found for that combination yet. Try another time or transport mix.',
        );
      }
    } catch (error) {
      console.error('GHAR transport trip error:', error);
      setOpalTrips([]);
      const rawMessage = error instanceof Error ? error.message : '';
      if (activeTransportProvider === 'tfnsw' && resolvedPlannerOrigin && resolvedPlannerDestination && shouldUseTfnswMapsFallback(rawMessage)) {
        if (!allowExternalFallback) {
          setOpalTripError('Transport for NSW is temporarily rate-limiting live trip results. The planner is open with your route ready, so try Find trips again in a moment.');
          setOpalInfoMessage(null);
          return;
        }
        setOpalTripError(null);
        setOpalSelectedTrip(null);
        setOpalDepartures([]);
        setOpalInfoMessage('Transport for NSW is temporarily rate-limiting live trip results. Opening transit directions in Maps while live routing reconnects.');
        openExternalTransitDirections(
          buildPlanningTransportReference(resolvedPlannerOrigin),
          buildPlanningTransportReference(resolvedPlannerDestination),
        );
        return;
      }
      if (activeTransportProvider === 'transport_vic' && shouldUseVictoriaPreviewFallback(rawMessage) && resolvedPlannerOrigin && resolvedPlannerDestination) {
        const previewTrips = buildVictoriaPreviewTrips({
          origin: resolvedPlannerOrigin,
          destination: resolvedPlannerDestination,
          whenMode: opalWhenMode,
          date: opalDate,
          time: opalTime,
          modes: opalSelectedModes,
          wheelchairOnly: opalWheelchairOnly,
        });
        setOpalTripError(null);
        setOpalTrips(previewTrips);
        setOpalSelectedTrip(null);
        setOpalDepartures([]);
        setOpalInfoMessage(
          previewTrips.length > 0
            ? 'Showing an in-app Victoria trip preview while live PTV routing reconnects.'
            : 'Victoria routing is reconnecting. Try a different time or transport mix in a moment.',
        );
        return;
      }
      setOpalTripError(
        /expected pattern/i.test(rawMessage)
          ? 'We could not resolve those places yet. Try a clearer building, station, suburb, or postcode.'
          : rawMessage || (
            activeTransportProvider === 'transport_qld'
              ? 'Translink trip planning is having trouble with those places. Try a stop, station, terminal, or suburb from the Translink results.'
              : 'Failed to load transport trips'
          ),
      );
    } finally {
      setOpalTripsLoading(false);
    }
  }, [activeTransportNetwork, activeTransportProvider, activeTransportState, handleUseCurrentLocationOpal, inAppTransportPlanning, opalCurrentLocationRef, opalDate, opalDestination, opalDestinationQuery, opalOrigin, opalOriginQuery, opalSelectedModes, opalTime, opalWhenMode, opalWheelchairOnly, openExternalTransitDirections, resolveCurrentHomeOpalDestination, resolveWorkOpalDestination, transportSupportsWheelchairFilter]);

  useEffect(() => {
    if (!pendingInitialTransportTarget) return;
    const networkId = getTransportNetworkIdForState(pendingInitialTransportTarget.state || pendingInitialTransportTarget.address || '');
    if (!networkId || selectedTransportNetworkId !== networkId || !showOpalPanel) return;
    const requestKey = buildDashboardTransportRequestKey(pendingInitialTransportTarget);
    if (pendingInitialTransportKeyRef.current && pendingInitialTransportKeyRef.current !== requestKey) return;
    if (runningInitialTransportKeyRef.current === requestKey) return;
    pendingInitialTransportKeyRef.current = requestKey;
    runningInitialTransportKeyRef.current = requestKey;
    let cancelled = false;
    const destinationLabel = String(
      pendingInitialTransportTarget.address || pendingInitialTransportTarget.name || '',
    ).trim() || pendingInitialTransportTarget.name;
    const destinationName = String(pendingInitialTransportTarget.name || '').trim() || destinationLabel;
    const destinationSubtitle = destinationLabel !== destinationName ? destinationLabel : '';

    const destinationRef = buildOpalCoordReference(
      pendingInitialTransportTarget.lat,
      pendingInitialTransportTarget.lng,
      destinationName,
      destinationSubtitle,
    );

    const runInitialStoreTrip = async () => {
      setOpalDestination(destinationRef);
      setOpalDestinationQuery(destinationLabel);
      const originRef = opalCurrentLocationRef || await handleUseCurrentLocationOpal();
      if (cancelled) return;
      if (!originRef) {
        setPendingInitialTransportTarget(null);
        if (pendingInitialTransportKeyRef.current === requestKey) {
          pendingInitialTransportKeyRef.current = null;
        }
        if (runningInitialTransportKeyRef.current === requestKey) {
          runningInitialTransportKeyRef.current = null;
        }
        return;
      }
      setOpalOrigin(originRef);
      setOpalOriginQuery('Current location');
      await runOpalPlanner(originRef, destinationRef, { allowExternalFallback: false });
      if (!cancelled) {
        setPendingInitialTransportTarget(null);
        if (pendingInitialTransportKeyRef.current === requestKey) {
          pendingInitialTransportKeyRef.current = null;
        }
        if (runningInitialTransportKeyRef.current === requestKey) {
          runningInitialTransportKeyRef.current = null;
        }
      }
    };

    void runInitialStoreTrip();
    return () => {
      cancelled = true;
    };
  }, [handleUseCurrentLocationOpal, opalCurrentLocationRef, pendingInitialTransportTarget, runOpalPlanner, selectedTransportNetworkId, showOpalPanel]);

  const handleUseHomeQuickAction = useCallback(async () => {
    if (profileContextLoading) {
      setOpalTripError(null);
      setOpalInfoMessage('Loading your saved home address. Try again in a moment.');
      return;
    }
    setOpalTripError(null);
    setOpalInfoMessage(null);
    const destinationRef = await resolveCurrentHomeOpalDestination();
    if (!destinationRef) return;
    setOpalDestination(destinationRef);
    setOpalDestinationQuery(destinationRef.name === 'Home' ? 'Home' : destinationRef.name || 'Home');
    const originRef = opalOrigin || opalCurrentLocationRef || await handleUseCurrentLocationOpal();
    if (originRef) {
      setOpalOrigin(originRef);
      setOpalOriginQuery(originRef.name || 'Current location');
      void runOpalPlanner(originRef, destinationRef);
    }
  }, [handleUseCurrentLocationOpal, opalCurrentLocationRef, opalOrigin, profileContextLoading, resolveCurrentHomeOpalDestination, runOpalPlanner]);

  const handleUseWorkQuickAction = useCallback(async () => {
    if (profileContextLoading) {
      setOpalTripError(null);
      setOpalInfoMessage('Loading your saved work destination. Try again in a moment.');
      return;
    }
    if (!hasSavedWorkDestination) {
      navigate('/profile?action=add-work');
      return;
    }
    setOpalTripError(null);
    setOpalInfoMessage(null);
    const destinationRef = await resolveWorkOpalDestination();
    if (!destinationRef) return;
    setOpalDestination(destinationRef);
    setOpalDestinationQuery(destinationRef.subtitle || destinationRef.name || 'Work');
    const originRef = opalOrigin || opalCurrentLocationRef || await handleUseCurrentLocationOpal();
    if (originRef) {
      setOpalOrigin(originRef);
      setOpalOriginQuery(originRef.name || 'Current location');
      void runOpalPlanner(originRef, destinationRef);
    }
  }, [handleUseCurrentLocationOpal, hasSavedWorkDestination, navigate, opalCurrentLocationRef, opalOrigin, profileContextLoading, resolveWorkOpalDestination, runOpalPlanner]);

  useEffect(() => {
    if (!showOpalPanel || opalSelectedTrip || opalTripsLoading || !opalPendingResultsScrollRef.current) return;
    if (opalTrips.length === 0 && !opalTripError && !opalInfoMessage) return;
    opalPendingResultsScrollRef.current = false;
    const timeout = window.setTimeout(() => {
      scrollOpalResultsIntoView();
    }, 120);
    return () => window.clearTimeout(timeout);
  }, [opalInfoMessage, opalSelectedTrip, opalTripError, opalTrips.length, opalTripsLoading, scrollOpalResultsIntoView, showOpalPanel]);

  const toggleOpalMode = useCallback((modeId: string) => {
    resetOpalPlanner();
    setOpalSelectedModes((current) => {
      if (current.length === availableOpalModeIds.length) return [modeId];
      if (current.includes(modeId)) {
        return current.length === 1 ? availableOpalModeIds : current.filter((id) => id !== modeId);
      }
      return [...current, modeId];
    });
  }, [availableOpalModeIds, resetOpalPlanner]);

  const handleOpenOpalPanel = useCallback((networkId: TransportNetworkId) => {
    setSelectedTransportNetworkId(networkId);
    setShowTransportNetworkBurst(false);
    setShowOpalPanel(true);
    setShowFuelPanel(false);
    setShowLayers(false);
    resetOpalPlanner();
    setOpalSuggestions([]);
    setOpalActiveField(null);
    setOpalDestination(null);
    setOpalDestinationQuery('');
    if (opalCurrentLocationRef) {
      setOpalOrigin(opalCurrentLocationRef);
      setOpalOriginQuery('Current location');
    } else {
      setOpalOrigin(null);
      setOpalOriginQuery('');
    }
  }, [opalCurrentLocationRef, resetOpalPlanner]);

  useEffect(() => {
    if (!shouldAutoOpenTripPlanner || showOpalPanel) return;
    handleOpenOpalPanel(selectedTransportNetworkId || hoodieHelpDefaultTransportNetworkId);
  }, [
    handleOpenOpalPanel,
    hoodieHelpDefaultTransportNetworkId,
    selectedTransportNetworkId,
    shouldAutoOpenTripPlanner,
    showOpalPanel,
  ]);

  useEffect(() => {
    let initialTransportTarget: DashboardInitialTransportTarget | null = null;
    try {
      const raw = sessionStorage.getItem(SHOPPING_TRANSPORT_TARGET_STORAGE_KEY);
      if (raw) {
        sessionStorage.removeItem(SHOPPING_TRANSPORT_TARGET_STORAGE_KEY);
        const parsed = JSON.parse(raw) as Partial<DashboardInitialTransportTarget> | null;
        if (
          parsed &&
          Number.isFinite(Number(parsed.lat)) &&
          Number.isFinite(Number(parsed.lng)) &&
          String(parsed.name || '').trim()
        ) {
          initialTransportTarget = {
            name: String(parsed.name || '').trim(),
            address: String(parsed.address || '').trim(),
            state: String(parsed.state || '').trim(),
            lat: Number(parsed.lat),
            lng: Number(parsed.lng),
          };
        }
      }
    } catch (error) {
      console.error('GHAR shopping transport consume error:', error);
      sessionStorage.removeItem(SHOPPING_TRANSPORT_TARGET_STORAGE_KEY);
    }
    if (!initialTransportTarget) return;
      queueDashboardTransportTarget(initialTransportTarget);
  }, [handleOpenOpalPanel]);

  const handleToggleTransportNetworkBurst = useCallback(() => {
    setShowFuelPanel(false);
    setShowLayers(false);
    if (groceryBurstCloseTimeoutRef.current != null) {
      window.clearTimeout(groceryBurstCloseTimeoutRef.current);
      groceryBurstCloseTimeoutRef.current = null;
    }
    setShowGroceryRetailerBurst(false);
    setGroceryBurstExpanded(false);
    if (showTransportNetworkBurst) {
      setTransportBurstExpanded(false);
      if (transportBurstCloseTimeoutRef.current != null) {
        window.clearTimeout(transportBurstCloseTimeoutRef.current);
      }
      transportBurstCloseTimeoutRef.current = window.setTimeout(() => {
        setShowTransportNetworkBurst(false);
        transportBurstCloseTimeoutRef.current = null;
      }, TRANSPORT_BURST_CLOSE_MS);
      return;
    }
    if (transportBurstCloseTimeoutRef.current != null) {
      window.clearTimeout(transportBurstCloseTimeoutRef.current);
      transportBurstCloseTimeoutRef.current = null;
    }
    setShowTransportNetworkBurst(true);
  }, [showTransportNetworkBurst]);

  useEffect(() => {
    if (!initialTransportMenuOpenToken) {
      consumedTransportMenuTokenRef.current = null;
      return;
    }
    if (consumedTransportMenuTokenRef.current === initialTransportMenuOpenToken) return;
    consumedTransportMenuTokenRef.current = initialTransportMenuOpenToken;
    handleToggleTransportNetworkBurst();
    onInitialTransportMenuOpenConsumed?.();
  }, [handleToggleTransportNetworkBurst, initialTransportMenuOpenToken, onInitialTransportMenuOpenConsumed]);

  const handleToggleGroceryRetailerBurst = useCallback(() => {
    setShowFuelPanel(false);
    setShowLayers(false);
    if (transportBurstCloseTimeoutRef.current != null) {
      window.clearTimeout(transportBurstCloseTimeoutRef.current);
      transportBurstCloseTimeoutRef.current = null;
    }
    setShowTransportNetworkBurst(false);
    setTransportBurstExpanded(false);
    if (showGroceryRetailerBurst) {
      setGroceryBurstExpanded(false);
      if (groceryBurstCloseTimeoutRef.current != null) {
        window.clearTimeout(groceryBurstCloseTimeoutRef.current);
      }
      groceryBurstCloseTimeoutRef.current = window.setTimeout(() => {
        setShowGroceryRetailerBurst(false);
        groceryBurstCloseTimeoutRef.current = null;
      }, GROCERY_BURST_CLOSE_MS);
      return;
    }
    if (groceryBurstCloseTimeoutRef.current != null) {
      window.clearTimeout(groceryBurstCloseTimeoutRef.current);
      groceryBurstCloseTimeoutRef.current = null;
    }
    setShowGroceryRetailerBurst(true);
  }, [showGroceryRetailerBurst]);

  const handleSelectGroceryRetailer = useCallback((retailerId: GroceryRetailerId) => {
    if (groceryBurstCloseTimeoutRef.current != null) {
      window.clearTimeout(groceryBurstCloseTimeoutRef.current);
      groceryBurstCloseTimeoutRef.current = null;
    }
    setShowGroceryRetailerBurst(false);
    setGroceryBurstExpanded(false);
    setShowTransportNetworkBurst(false);
    navigate(`/shopping?retailer=${retailerId}`);
  }, [navigate]);

  const groceryFab = (
    <button
      onClick={() => handleToggleGroceryRetailerBurst()}
      className={`relative w-12 h-12 backdrop-blur-md border rounded-2xl flex items-center justify-center shadow-lg active:scale-95 transition-all cursor-pointer group ${
        showGroceryRetailerBurst
          ? 'bg-[#0F766E] border-[#0F766E] text-white shadow-[#0F766E]/25'
          : 'bg-white/95 border-[#D7EEE5] text-[#64748B] shadow-[#94A3B8]/15 hover:bg-white hover:border-[#0F766E]/30 hover:shadow-xl'
      }`}
      title="Groceries"
    >
      <ShoppingBasket className={`h-5 w-5 transition-transform ${showGroceryRetailerBurst ? 'scale-105' : 'group-hover:scale-105'}`} strokeWidth={1.8} />
    </button>
  );

  const handleCloseOpalPanel = useCallback(() => {
    setShowOpalPanel(false);
    setShowTransportNetworkBurst(false);
    setPendingInitialTransportTarget(null);
    pendingInitialTransportKeyRef.current = null;
    runningInitialTransportKeyRef.current = null;
    setSelectedTransportNetworkId(null);
    setOpalActiveField(null);
    setOpalSuggestions([]);
  }, []);

  const handleSelectTransportNetwork = useCallback((networkId: TransportNetworkId) => {
    handleOpenOpalPanel(networkId);
  }, [handleOpenOpalPanel]);

  const handleDashboardSearchSuggestionActivate = useCallback((
    event: React.PointerEvent<HTMLButtonElement> | React.KeyboardEvent<HTMLButtonElement>,
    result: NominatimResult,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    handleDashboardSearchResultSelection(result);
  }, [handleDashboardSearchResultSelection]);

  useEffect(() => {
    if (!showOpalPanel || activeTransportProvider !== 'transport_sa') return;
    warmTransportProvider('transport_sa');
  }, [activeTransportProvider, showOpalPanel]);

  const handleSelectOpalSuggestion = useCallback((suggestion: PlannerLocationSuggestion) => {
    resetOpalPlanner();
    const reference = buildOpalReferenceFromAddressResult(suggestion);
    const displayQuery = getPlannerSuggestionDisplayQuery(suggestion);
    if (opalActiveField === 'origin') {
      setOpalOrigin(reference);
      setOpalOriginQuery(displayQuery);
    } else if (opalActiveField === 'destination') {
      setOpalDestination(reference);
      setOpalDestinationQuery(displayQuery);
    }
    setOpalSuggestions([]);
    setOpalActiveField(null);
  }, [opalActiveField, resetOpalPlanner]);

  useEffect(() => {
    if (!showOpalPanel || !opalActiveField) {
      setOpalSuggestions([]);
      setOpalSearchLoading(false);
      return;
    }
    const query = (opalActiveField === 'origin' ? opalOriginQuery : opalDestinationQuery).trim();
    const selectedReference = opalActiveField === 'origin' ? opalOrigin : opalDestination;
    if (selectedReference && query && query === getTransportReferenceDisplayQuery(selectedReference)) {
      setOpalSuggestions([]);
      setOpalSearchLoading(false);
      return;
    }
    if (query.length < 2) {
      setOpalSuggestions([]);
      setOpalSearchLoading(false);
      return;
    }
    let cancelled = false;
    const timeout = setTimeout(async () => {
      try {
        setOpalSearchLoading(true);
        const openMapSuggestions = await searchOpenMapLocations(query, {
          state: activeTransportState,
          limit: 6,
        }).catch((openMapError) => {
          console.error('GHAR open map suggestion error:', openMapError);
          return [];
        });
        let nextSuggestions = mergePlannerSuggestions(openMapSuggestions.slice(0, 6)).slice(0, 6);
        if (nextSuggestions.length === 0) {
          const results = await searchAddress(query);
          nextSuggestions = filterTransportAddressResults(results, activeTransportState, query).slice(0, 6);
        }
        if (!cancelled) setOpalSuggestions(nextSuggestions);
      } catch (error) {
        console.error('GHAR Opal suggestion error:', error);
        if (!cancelled) setOpalSuggestions([]);
      } finally {
        if (!cancelled) setOpalSearchLoading(false);
      }
    }, 220);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [activeTransportState, opalActiveField, opalDestination, opalDestinationQuery, opalOrigin, opalOriginQuery, showOpalPanel]);

  const handleSelectOpalTrip = useCallback(async (trip: TransportTripOption) => {
    opalScrollContainerRef.current?.scrollTo({ top: 0, behavior: 'auto' });
    setOpalSelectedTrip(trip);
    setOpalDepartures([]);
    if (isVictoriaPreviewTrip(trip)) {
      setOpalDepartures(buildVictoriaPreviewDepartures(trip));
      setOpalDeparturesLoading(false);
      return;
    }
    const departureAnchor = trip.legs.find((leg) => leg.mode !== 'walk' && leg.originStopId);
    if (!departureAnchor?.originStopId) return;
    setOpalDeparturesLoading(true);
    try {
      const departures = await fetchTransportDepartures({
        provider: activeTransportProvider || 'tfnsw',
        stopId: departureAnchor.originStopId,
        type: departureAnchor.originPlatform ? 'platform' : 'stop',
        usePlatformKey: Boolean(departureAnchor.originPlatform),
        modes: opalSelectedModes,
      });
      setOpalDepartures(departures.slice(0, 5));
    } catch (error) {
      console.error('GHAR transport departures error:', error);
      setOpalDepartures([]);
    } finally {
      setOpalDeparturesLoading(false);
    }
  }, [activeTransportProvider, opalSelectedModes]);

  const handleOpenOpalInMaps = useCallback(async () => {
    const activeDestination = opalSelectedTrip?.legs[opalSelectedTrip.legs.length - 1] || null;
    const lat = activeDestination?.destinationLat ?? opalDestination?.lat ?? null;
    const lng = activeDestination?.destinationLng ?? opalDestination?.lng ?? null;
    const label = encodeURIComponent(activeDestination?.destinationName || opalDestination?.name || 'Destination');
    if (lat == null || lng == null) return;
    const isAndroid = /Android/i.test(navigator.userAgent);
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isAndroid) {
      window.location.href = `google.navigation:q=${lat},${lng}&mode=r`;
      return;
    }
    if (isIOS) {
      window.location.href = `https://maps.apple.com/?daddr=${lat},${lng}&q=${label}&dirflg=r`;
      return;
    }
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=transit`, '_blank', 'noopener,noreferrer');
  }, [opalDestination, opalSelectedTrip]);

  const closeCommuterContext = useCallback(() => {
    employmentContextRequestRef.current += 1;
    setCommuterContext(null);
    setRadiusCircleCenter(null);
    if (focusedMapTarget && focusedMapPanelView === 'context') {
      setFocusedMapPanelView('place');
      setIsFocusedMapTargetMinimized(false);
      return;
    }
    setSearchPin(null);
  }, [focusedMapPanelView, focusedMapTarget]);

  const closeListingSurface = useCallback(() => {
    setActivePopupListing(null);
  }, []);

  const closePropertyPedigreeSurface = useCallback(() => {
    setShowBottomSheet(false);
    setSelectedBuilding(null);
    setPedigreeData(null);
    setPedigreeLoading(false);
  }, []);

  const closeSupplementaryMapPopups = useCallback(() => {
    setActiveSurvivalPopup(null);
    setActiveAirportPopup(null);
    setActivePolicePopup(null);
    setActiveHospitalPopup(null);
    setActiveToiletPopup(null);
  }, []);

  const handleMapBackgroundClick = useCallback((event?: any) => {
    const feature = event?.features?.find((candidate: any) =>
      PUBLIC_TOILET_INTERACTIVE_LAYER_IDS.includes(candidate?.layer?.id),
    );
    if (feature?.layer?.id === 'public-toilet-clusters') {
      const coordinates = feature.geometry?.coordinates;
      if (Array.isArray(coordinates) && coordinates.length >= 2) {
        mapGLRef.current?.getMap()?.easeTo({
          center: coordinates,
          zoom: Math.min((mapGLRef.current?.getMap()?.getZoom?.() || 12) + 2, 16),
          duration: 450,
          essential: true,
        });
      }
      return;
    }
    if (feature?.layer?.id === 'public-toilet-unclustered') {
      const toiletId = String(feature.properties?.toiletId || '').trim();
      const toilet = visiblePublicToilets.find((candidate) => candidate.id === toiletId);
      if (toilet) {
        closeListingSurface();
        closeSupplementaryMapPopups();
        setActiveToiletPopup(toilet);
        setPublicToiletInfo(null);
      }
      return;
    }
    closeListingSurface();
    closeSupplementaryMapPopups();
  }, [closeListingSurface, closeSupplementaryMapPopups, visiblePublicToilets]);

  const focusListingSurface = useCallback((listing: Listing) => {
    closePropertyPedigreeSurface();
    closeSupplementaryMapPopups();
    closeCommuterContext();
    focusedMapCameraTargetRef.current = null;
    setFocusedMapTarget(null);
    setFocusedMapPanelView('place');
    setIsFocusedMapTargetMinimized(false);
    setShowFocusedDirectionsChooser(false);
    const map = mapGLRef.current?.getMap();
    if (map) {
      try {
        map.easeTo({
          center: [listing.lng, listing.lat],
          offset: [0, -185],
          duration: 450,
          essential: true,
        });
      } catch (error) {
        console.warn('GHAR popup viewport bias failed:', error);
      }
    }
    setActivePopupListing(listing);
  }, [
    closeCommuterContext,
    closePropertyPedigreeSurface,
    closeSupplementaryMapPopups,
  ]);

  // ─── TOUCH / ZOOM INTERACTION HELPERS ───────────────────────────
  // Manual globe navigation disables auto-spin for the current globe session.
  const handleInteractionStart = useCallback(() => {
    if (isGlobe) setGlobeAutoSpinEnabled(false);
    setIsInteracting(true);
  }, [isGlobe]);

  // Gesture end only clears the transient interaction state.
  const handleInteractionEnd = useCallback(() => {
    setIsInteracting(false);
  }, []);

  // ─── OPEN PROPERTY PEDIGREE ─────────────────────────────────
  const openPropertyPedigree = useCallback(async (cluster: BuildingCluster) => {
    closeListingSurface();
    closeSupplementaryMapPopups();
    closeCommuterContext();
    focusedMapCameraTargetRef.current = null;
    setFocusedMapTarget(null);
    setFocusedMapPanelView('place');
    setIsFocusedMapTargetMinimized(false);
    setShowFocusedDirectionsChooser(false);
    setSelectedBuilding(cluster);
    setShowBottomSheet(true);
    setPedigreeTab('alerts');
    setPedigreeLoading(true);
    setPedigreeData(null);
    setPedigreeTransit([]);
    setTransitLoading(true);
    const [pedigreeResult] = await Promise.allSettled([
      fetchPropertyPedigree(cluster.lat, cluster.lng),
      fetchNearbyTransit(cluster.lat, cluster.lng).then(results => {
        setPedigreeTransit(results);
        setTransitLoading(false);
      }).catch(() => setTransitLoading(false)),
    ]);
    if (pedigreeResult.status === 'fulfilled') setPedigreeData(pedigreeResult.value);
    else console.error('GHAR property pedigree error:', pedigreeResult.reason);
    setPedigreeLoading(false);
  }, [closeCommuterContext, closeListingSurface, closeSupplementaryMapPopups]);

  const isFocusedMapContextActive = Boolean(focusedMapTarget && focusedMapPanelView === 'context');
  const isFocusedMapExpandedActive = Boolean(
    focusedMapTarget && focusedMapPanelView === 'place' && !isFocusedMapTargetMinimized,
  );
  const isFocusedMapMinimizedActive = Boolean(
    focusedMapTarget && focusedMapPanelView === 'place' && isFocusedMapTargetMinimized,
  );
  const focusedMapReturnRoute = buildFocusedMapTargetReturnRoute(focusedMapTarget);
  const focusedMapReturnLabel = getFocusedMapTargetReturnLabel(focusedMapTarget);
  const focusedMapBadge = getFocusedMapTargetBadge(focusedMapTarget);
  const focusedMapLocationText = getFocusedMapTargetLocationText(focusedMapTarget);
  const focusedMapBodyText = getFocusedMapTargetBodyText(focusedMapTarget);
  const focusedMapDateLine = focusedMapTarget?.kind === 'event-place'
    ? String(focusedMapTarget.dateLine || '').trim()
    : '';
  const canOpenFocusedDirections = Boolean(
    focusedMapTarget && hasValidFocusedMapCoordinatePair(focusedMapTarget.lat, focusedMapTarget.lng),
  );
  const isPublicToiletPanelExpanded = layerToilets && showPublicToiletPanel && !isPublicToiletPanelMinimized;
  const hasActivePublicToiletFilters = activePublicToiletFilters.length > 0;
  const isPublicToiletFilteredEmpty =
    visiblePublicToilets.length > 0 &&
    publicToiletResultItems.length === 0 &&
    hasActivePublicToiletFilters;
  const hideFloatingMapControls =
    showWolliWardLookup ||
    isPublicToiletPanelExpanded ||
    Boolean(isFocusedMapContextActive || isFocusedMapExpandedActive) ||
    showTransportNetworkBurst ||
    showGroceryRetailerBurst;
  const publicToiletFabLabel = !layerToilets
    ? 'Show public toilets'
    : showPublicToiletPanel && !isPublicToiletPanelMinimized
      ? 'Minimize public toilet results'
      : 'Open public toilet results';
  const handleOpenWolliWardBoundaries = useCallback(() => {
    setShowWolliWardLookup(true);
  }, []);
  const handleCloseWolliWardBoundaries = useCallback(() => {
    setShowWolliWardLookup(false);
    navigate('/dashboard', { replace: true });
  }, [navigate]);

  useEffect(() => {
    if (!isWolliExperience) return;
    const params = new URLSearchParams(location.search);
    if (params.get('panel') === 'wards') {
      setShowWolliWardLookup(true);
    }
  }, [isWolliExperience, location.search]);

  return (
    <div className="size-full relative" style={{ fontFamily: 'Inter, sans-serif' }}>
      <MapGL
        ref={mapGLRef}
	        initialViewState={{
	          longitude: isWolliExperience ? WOLLI_CREEK_MAP_CENTER.lng : 133.7751,
	          latitude: isWolliExperience ? WOLLI_CREEK_MAP_CENTER.lat : -25.2744,
	          zoom: isWolliExperience ? 13.5 : getGlobeZoom(),
	          pitch: 0,
	        }}
        mapStyle="https://api.maptiler.com/maps/dataviz-light/style.json?key=KUC6giLOTNJZVNNb8YoO"
        style={{ width: '100%', height: '100%', position: 'absolute', inset: 0, background: '#F8FAFC' }}
        onLoad={(e) => {
          e.target.resize();
          setTimeout(() => e.target.resize(), 200);
          const styleData = e.target.getStyle();
          const firstSym = styleData?.layers?.find((l: any) => l.type === 'symbol');
          if (firstSym) setFirstSymbolLayer(firstSym.id);
          setMapLoaded(true);
        }}
        onMoveEnd={(e) => {
          updateTransitMarkers(e.target);
        }}
        onDragStart={handleInteractionStart}
        onDragEnd={handleInteractionEnd}
        onTouchStart={handleInteractionStart}
        onTouchEnd={handleInteractionEnd}
        onZoomStart={handleInteractionStart}
        onZoomEnd={handleInteractionEnd}
        onRotateStart={handleInteractionStart}
        onRotateEnd={handleInteractionEnd}
        onClick={handleMapBackgroundClick}
        interactiveLayerIds={layerToilets ? PUBLIC_TOILET_INTERACTIVE_LAYER_IDS : undefined}
      >
        {/* Radius Circle (5km) */}
        {radiusCircleCenter && (() => {
          const points = 64;
          const coords = [];
          const km = 5;
          const distanceX = km / (111.320 * Math.cos((radiusCircleCenter.lat * Math.PI) / 180));
          const distanceY = km / 110.574;
          for (let i = 0; i < points; i++) {
            const theta = (i / points) * (2 * Math.PI);
            coords.push([radiusCircleCenter.lng + distanceX * Math.cos(theta), radiusCircleCenter.lat + distanceY * Math.sin(theta)]);
          }
          coords.push(coords[0]);
          const geojson: any = { type: 'Feature', geometry: { type: 'Polygon', coordinates: [coords] } };
          return React.createElement(Source, { id: "radius-circle", type: "geojson", data: geojson },
            React.createElement(Layer, { id: "radius-circle-fill", source: "radius-circle", type: "fill", beforeId: firstSymbolLayer, paint: { 'fill-color': '#EE811A', 'fill-opacity': 0.05 } }),
            React.createElement(Layer, { id: "radius-circle-outline", source: "radius-circle", type: "line", beforeId: firstSymbolLayer, paint: { 'line-color': '#EE811A', 'line-width': 2, 'line-dasharray': [2, 2] } })
          );
        })()}

        {/* ── Employment Opportunity Heatmap ── */}
        {layerJobHubs && jobHubGeoJSON && React.createElement(Source, { id: 'job-hubs', type: 'geojson', data: jobHubGeoJSON },
          React.createElement(Layer, {
            id: 'job-hubs-heat',
            source: 'job-hubs',
            type: 'heatmap',
            paint: {
              'heatmap-weight': ['interpolate', ['linear'], ['get', 'weight'], 0, 0, 3, 1],
              'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 0.3, 5, 0.5, 10, 0.8, 13, 1.6, 16, 2.5],
              'heatmap-color': [
                'interpolate', ['linear'], ['heatmap-density'],
                0, 'rgba(245,158,11,0)',
                0.2, 'rgba(245,158,11,0.15)',
                0.4, 'rgba(245,158,11,0.35)',
                0.6, 'rgba(245,158,11,0.6)',
                0.8, 'rgba(251,191,36,0.75)',
                1, 'rgba(252,211,77,0.9)',
              ],
              'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 6, 5, 12, 9, 20, 12, 36, 15, 55],
              'heatmap-opacity': 0.85,
            },
          })
        )}

        {/* Public Toilets - clustered MapLibre source */}
        {layerToilets && visiblePublicToilets.length > 0 && React.createElement(Source, {
          id: 'public-toilets',
          type: 'geojson',
          data: publicToiletGeoJSON as any,
          cluster: true,
          clusterMaxZoom: 14,
          clusterRadius: 44,
        },
          React.createElement(Layer, {
            id: 'public-toilet-clusters',
            source: 'public-toilets',
            type: 'circle',
            beforeId: firstSymbolLayer,
            filter: ['has', 'point_count'],
            paint: {
              'circle-color': ['step', ['get', 'point_count'], '#0F766E', 25, '#0D9488', 100, '#115E59'],
              'circle-radius': ['step', ['get', 'point_count'], 15, 25, 19, 100, 24],
              'circle-stroke-width': 2,
              'circle-stroke-color': '#FFFFFF',
              'circle-opacity': 0.92,
            },
          }),
          React.createElement(Layer, {
            id: 'public-toilet-cluster-count',
            source: 'public-toilets',
            type: 'symbol',
            filter: ['has', 'point_count'],
            layout: {
              'text-field': ['get', 'point_count_abbreviated'],
              'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
              'text-size': 11,
            },
            paint: {
              'text-color': '#FFFFFF',
            },
          }),
          React.createElement(Layer, {
            id: 'public-toilet-unclustered',
            source: 'public-toilets',
            type: 'circle',
            beforeId: firstSymbolLayer,
            filter: ['!', ['has', 'point_count']],
            paint: {
              'circle-color': '#0F766E',
              'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 4, 13, 7, 16, 9],
              'circle-stroke-width': 2,
              'circle-stroke-color': '#FFFFFF',
              'circle-opacity': 0.95,
            },
          })
        )}

        {/* Suburb Explorer Highlight */}
        {suburbGeoJSON && React.createElement(Source, { id: "suburb-highlight", type: "geojson", data: suburbGeoJSON },
          React.createElement(Layer, { id: "suburb-fill", source: "suburb-highlight", type: "fill", beforeId: firstSymbolLayer, paint: { 'fill-color': '#007AFF', 'fill-opacity': 0.08 }, filter: ['!=', '$type', 'Point'] }),
          React.createElement(Layer, { id: "suburb-glow", source: "suburb-highlight", type: "line", beforeId: firstSymbolLayer, paint: { 'line-color': '#007AFF', 'line-width': 10, 'line-blur': 8, 'line-opacity': 0.22 }, filter: ['!=', '$type', 'Point'] }),
          React.createElement(Layer, { id: "suburb-outline", source: "suburb-highlight", type: "line", paint: { 'line-color': '#007AFF', 'line-width': 2.5, 'line-blur': 0, 'line-opacity': 1 }, filter: ['!=', '$type', 'Point'] }),
          React.createElement(Layer, { id: "suburb-point", source: "suburb-highlight", type: "circle", paint: { 'circle-color': '#007AFF', 'circle-radius': 10, 'circle-opacity': 0.15, 'circle-stroke-width': 3, 'circle-stroke-color': '#007AFF', 'circle-stroke-opacity': 1 }, filter: ['==', '$type', 'Point'] })
        )}

        {/* University Markers */}
        {layerUniversities && Object.entries(universityCoordinates).map(([name, coords]) => (
          <Marker key={`uni-${name}`} longitude={coords.lng} latitude={coords.lat} anchor="center">
            <div className="flex flex-col items-center group cursor-pointer">
              <div className="w-8 h-8 bg-[#1E3A8A] rounded-full flex items-center justify-center border-2 border-white shadow-lg shadow-blue-900/30 group-hover:scale-110 transition-transform">
                <GraduationCap className="w-4 h-4 text-white" />
              </div>
              <div className="mt-1 px-2 py-0.5 bg-white/90 backdrop-blur-sm rounded text-[10px] font-bold text-[#1E3A8A] shadow-sm opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                {name}
              </div>
            </div>
          </Marker>
        ))}

        {/* Consulate Markers */}
        {showsConsulateLayer && layerConsulates && indianConsulates.map((consulate, idx) => (
          <Marker key={`consulate-${idx}`} longitude={consulate.lng} latitude={consulate.lat} anchor="center">
            <div className="flex flex-col items-center group cursor-pointer relative z-10">
              <div className="w-9 h-9 bg-[#F97316] rounded-full flex items-center justify-center border-2 border-white shadow-xl shadow-orange-900/30 group-hover:scale-110 transition-transform">
                <Landmark className="w-5 h-5 text-white" />
              </div>
              <div className="mt-1 px-3 py-1 bg-white/95 backdrop-blur-sm rounded-md border border-[#F97316]/20 flex flex-col items-center text-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none absolute top-full">
                <span className="text-[11px] font-bold text-[#F97316]">{consulate.name}</span>
                <span className="text-[9px] text-[#64748B]">{consulate.jurisdiction}</span>
                {consulate.website && <span className="text-[9px] text-[#1E40AF] font-medium">{consulate.website}</span>}
              </div>
            </div>
          </Marker>
        ))}

        {/* Airport Markers */}
        {layerAirports && airportData && airportData.features && airportData.features.map((feature: any, idx: number) => (
          <Marker 
            key={`airport-${idx}`} 
            longitude={feature.geometry.coordinates[0]} 
            latitude={feature.geometry.coordinates[1]} 
            anchor="center"
          >
            <AirportMarker 
              feature={feature} 
              onClick={() => {
                setActiveAirportPopup(feature);
                // Center the map slightly above the marker to make room for popup
                mapGLRef.current?.getMap()?.flyTo({
                  center: [feature.geometry.coordinates[0], feature.geometry.coordinates[1]],
                  zoom: 13,
                  duration: 800
                });
              }} 
            />
          </Marker>
        ))}

        {/* Police Station Markers */}
        {layerPolice && visiblePolice.map((ps: any) => (
            <Marker key={`police-${ps.id}`} longitude={ps.coordinates.lng} latitude={ps.coordinates.lat} anchor="center">
              <div className="relative group cursor-pointer" onClick={(event) => {
                event.stopPropagation();
                setActivePolicePopup(ps);
                mapGLRef.current?.getMap()?.flyTo({ center: [ps.coordinates.lng, ps.coordinates.lat], zoom: 14, duration: 800 });
              }}>
                <div style={{ width: 24, height: 24, borderRadius: 6, background: '#1E40AF', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid white', boxShadow: '0 1px 4px rgba(0,0,0,0.2)', color: 'white' }}>
                  <Shield className="w-3 h-3" strokeWidth={2.5} />
                </div>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-white rounded-lg shadow-lg text-[9px] font-semibold text-[#0F172A] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-[#E2E8F0] z-50">
                  {ps.name.split(' ').map((w: string) => w.charAt(0) + w.slice(1).toLowerCase()).join(' ')}
                  <div className="text-[8px] font-normal text-[#64748B]">Police Station</div>
                </div>
              </div>
            </Marker>
          ))}

        {/* Police Station Popup */}
        {activePolicePopup && (
          <Popup
            longitude={activePolicePopup.coordinates.lng}
            latitude={activePolicePopup.coordinates.lat}
            anchor="bottom"
            onClose={() => setActivePolicePopup(null)}
            closeButton={false}
            className="maplibregl-popup-content-none"
            offset={15}
          >
            <div
              onClick={(event) => event.stopPropagation()}
              className="w-[min(72vw,240px)] rounded-xl border border-[#E2E8F0] bg-white p-3 shadow-xl"
            >
              <div className="flex items-start gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#1E40AF] flex items-center justify-center shrink-0 mt-0.5">
                  <Shield className="w-3.5 h-3.5 text-white" strokeWidth={2} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold text-[#0F172A] leading-tight">
                    {activePolicePopup.name.split(' ').map((w: string) => w.charAt(0) + w.slice(1).toLowerCase()).join(' ')}
                  </p>
                  <p className="text-[9px] text-[#64748B] mt-0.5 font-normal">
                    {(activePolicePopup.address || '').split(' ').map((w: string) => w.charAt(0) + w.slice(1).toLowerCase()).join(' ')}, {(activePolicePopup.suburb || '').charAt(0) + (activePolicePopup.suburb || '').slice(1).toLowerCase()} {activePolicePopup.postcode}
                  </p>
                  <p className="text-[8px] text-[#1E40AF] font-semibold mt-1 uppercase tracking-wider">{(activePolicePopup.state || '').charAt(0) + (activePolicePopup.state || '').slice(1).toLowerCase()}</p>
                </div>
                <button onClick={() => setActivePolicePopup(null)} className="text-[#94A3B8] hover:text-[#0F172A] cursor-pointer"><X className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          </Popup>
        )}

        {/* Hospital Markers */}
        {layerHospital && visibleHospitals.map((h: any) => (
            <Marker key={`hospital-${h.id}`} longitude={h.lng} latitude={h.lat} anchor="center">
              <div className="relative group cursor-pointer" onClick={(event) => {
                event.stopPropagation();
                setActiveHospitalPopup(h);
                mapGLRef.current?.getMap()?.flyTo({ center: [h.lng, h.lat], zoom: 14, duration: 800 });
              }}>
                <div style={{ width: 24, height: 24, borderRadius: 6, background: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid white', boxShadow: '0 1px 4px rgba(0,0,0,0.2)', color: 'white' }}>
                  <Hospital className="w-3 h-3" strokeWidth={2.5} />
                </div>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-white rounded-lg shadow-lg text-[9px] font-semibold text-[#0F172A] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-[#E2E8F0] z-50">
                  {h.name}
                  <div className="text-[8px] font-normal text-[#64748B]">{h.private ? 'Private' : 'Public'} Hospital</div>
                </div>
              </div>
            </Marker>
          ))}

        {/* Hospital Popup */}
        {activeHospitalPopup && (
          <Popup
            longitude={activeHospitalPopup.lng}
            latitude={activeHospitalPopup.lat}
            anchor="bottom"
            onClose={() => setActiveHospitalPopup(null)}
            closeButton={false}
            className="maplibregl-popup-content-none"
            offset={15}
          >
            <div
              onClick={(event) => event.stopPropagation()}
              className="w-[min(72vw,240px)] rounded-xl border border-[#E2E8F0] bg-white p-3 shadow-xl"
            >
              <div className="flex items-start gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#DC2626] flex items-center justify-center shrink-0 mt-0.5">
                  <Hospital className="w-3.5 h-3.5 text-white" strokeWidth={2} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold text-[#0F172A] leading-tight">{activeHospitalPopup.name}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className={`text-[8px] tracking-wider uppercase font-semibold px-1.5 py-0.5 rounded ${activeHospitalPopup.private ? 'bg-[#FEF3C7] text-[#92400E]' : 'bg-[#DCFCE7] text-[#166534]'}`}>
                      {activeHospitalPopup.private ? 'Private' : 'Public'}
                    </span>
                    <span className="text-[8px] text-[#64748B] font-medium uppercase tracking-wider">{activeHospitalPopup.state}</span>
                  </div>
                </div>
                <button onClick={() => setActiveHospitalPopup(null)} className="text-[#94A3B8] hover:text-[#0F172A] cursor-pointer"><X className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          </Popup>
        )}

        {/* Public Toilet Popup */}
        {activeToiletPopup && (() => {
          const flags = buildPublicToiletFlags(activeToiletPopup);
          const address = formatPublicToiletAddress(activeToiletPopup);
          const distanceM = Number((activeToiletPopup as any).distance_m);
          const walkMin = Number((activeToiletPopup as any).walk_min);
          return (
            <Popup
              longitude={activeToiletPopup.lng}
              latitude={activeToiletPopup.lat}
              anchor="bottom"
              onClose={() => setActiveToiletPopup(null)}
              closeButton={false}
              closeOnClick={false}
              className="maplibregl-popup-content-none"
              offset={16}
            >
              <div
                onClick={(event) => event.stopPropagation()}
                className="w-[min(82vw,300px)] rounded-xl border border-[#CCFBF1] bg-white p-3 shadow-xl"
              >
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0F766E]">
                    <Toilet className="h-4 w-4 text-white" strokeWidth={2} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-bold leading-tight text-[#0F172A]">{activeToiletPopup.name || 'Public toilet'}</p>
                    {address ? (
                      <p className="mt-1 text-[10px] leading-snug text-[#64748B]">{address}</p>
                    ) : null}
                    {Number.isFinite(distanceM) ? (
                      <p className="mt-1 text-[9px] font-semibold uppercase tracking-wide text-[#0F766E]">
                        {distanceM < 1000 ? `${Math.round(distanceM)} m` : `${(distanceM / 1000).toFixed(1)} km`}
                        {Number.isFinite(walkMin) ? ` - about ${walkMin} min walk` : ''}
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveToiletPopup(null)}
                    className="shrink-0 cursor-pointer text-[#94A3B8] hover:text-[#0F172A]"
                    aria-label="Close public toilet details"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="mt-3 rounded-lg border border-[#CCFBF1] bg-[#F0FDFA] px-3 py-2">
                  <div className="flex items-start gap-2">
                    <Clock3 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#0F766E]" strokeWidth={1.8} />
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-[#0F766E]">Hours</p>
                      <p className="text-[11px] leading-snug text-[#0F172A]">
                        {activeToiletPopup.openingHours || 'Hours not listed'}
                      </p>
                      {activeToiletPopup.openingHoursNote ? (
                        <p className="mt-1 text-[9px] leading-snug text-[#64748B]">{activeToiletPopup.openingHoursNote}</p>
                      ) : null}
                    </div>
                  </div>
                </div>

                {flags.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {flags.map((flag) => {
                      const FlagIcon = flag.icon;
                      return (
                        <span key={flag.label} className="inline-flex items-center gap-1 rounded-full border border-[#CCFBF1] bg-[#F8FAFC] px-2 py-1 text-[9px] font-semibold text-[#115E59]">
                          <FlagIcon className="h-3 w-3" strokeWidth={1.8} />
                          {flag.label}
                        </span>
                      );
                    })}
                  </div>
                ) : null}

                {[activeToiletPopup.accessNote, activeToiletPopup.addressNote, activeToiletPopup.toiletNote].some(Boolean) ? (
                  <p className="mt-2 text-[10px] leading-snug text-[#64748B]">
                    {[activeToiletPopup.accessNote, activeToiletPopup.addressNote, activeToiletPopup.toiletNote].filter(Boolean).join(' ')}
                  </p>
                ) : null}

                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => handleOpenToiletDirections(activeToiletPopup)}
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#0F766E] px-3 py-2 text-[10px] font-bold text-white shadow-sm shadow-[#0F766E]/20 transition hover:bg-[#115E59]"
                  >
                    <Navigation className="h-3 w-3" strokeWidth={2} />
                    Directions
                  </button>
                </div>
              </div>
            </Popup>
          );
        })()}

        {/* Transit Markers — Train / Light Rail / Tram / Bus / Ferry */}
        {visibleTransit.filter(t =>
          (t.type === 'train' && layerTrain) ||
          (t.type === 'light_rail' && layerLightRail) ||
          (t.type === 'bus' && layerBus) ||
          (t.type === 'ferry' && (layerTrain || layerLightRail || layerBus))
        ).map(t => {
          const bg =
            t.type === 'train' ? '#1E40AF' :
            t.type === 'light_rail' ? '#7C3AED' :
            t.type === 'ferry' ? '#0EA5E9' :
            '#EA580C';
          const icon =
            t.type === 'train' ? <Train className="w-3 h-3" /> :
            t.type === 'light_rail' ? <TramFront className="w-3 h-3" /> :
            t.type === 'ferry' ? <Anchor className="w-3 h-3" /> :
            <Bus className="w-3 h-3" />;
          return (
            <Marker key={`transit-${t.id}`} longitude={t.lng} latitude={t.lat} anchor="center">
              <div className="relative group cursor-pointer">
                <div style={{ width: 22, height: 22, borderRadius: 6, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid white', boxShadow: '0 1px 4px rgba(0,0,0,0.2)', color: 'white' }}>
                  {icon}
                </div>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-white rounded-lg shadow-lg text-[9px] font-semibold text-[#0F172A] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-[#E2E8F0] z-50">
                  {t.name}
                  <div className="text-[8px] font-normal text-[#64748B] capitalize">{t.type === 'light_rail' ? 'light rail' : t.type}</div>
                </div>
              </div>
            </Marker>
          );
        })}

        {/* Student Survival Store Markers */}
        {layerSurvival && visibleSurvivalStores.map(store => (
          <Marker
            key={`survival-${store.id}`}
            longitude={store.lng}
            latitude={store.lat}
            anchor="center"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              setActiveSurvivalPopup(store);
            }}
          >
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
                border: '2.5px solid white',
                boxShadow: '0 2px 8px rgba(5,150,105,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <path d="M16 10a4 4 0 0 1-8 0"/>
              </svg>
            </div>
          </Marker>
        ))}

        {/* Airport Popup */}
        {activeAirportPopup && (
          <Popup
            longitude={activeAirportPopup.geometry.coordinates[0]}
            latitude={activeAirportPopup.geometry.coordinates[1]}
            anchor="bottom"
            onClose={() => setActiveAirportPopup(null)}
            closeOnClick={false}
            className="z-50"
          >
            <div
              onClick={(event) => event.stopPropagation()}
              className="min-w-[120px] p-2 text-center"
            >
              <div className="w-8 h-8 mx-auto bg-[#F0F9FF] rounded-full flex items-center justify-center mb-2">
                <Plane className="w-4 h-4 text-[#0EA5E9]" />
              </div>
              <p className="text-xs font-bold text-[#0F172A]">{activeAirportPopup.properties.name}</p>
              <p className="text-[10px] text-[#64748B] font-medium">{activeAirportPopup.properties.type} · {activeAirportPopup.properties.iata_code || activeAirportPopup.properties.iata}</p>
            </div>
          </Popup>
        )}

        {/* Survival Store Popup */}
        {activeSurvivalPopup && (
          <Popup
            longitude={activeSurvivalPopup.lng}
            latitude={activeSurvivalPopup.lat}
            anchor="bottom"
            onClose={() => setActiveSurvivalPopup(null)}
            closeButton={true}
            closeOnClick={false}
            className="ghar-popup z-50"
            offset={20}
          >
            <div
              onClick={(event) => event.stopPropagation()}
              style={{ width: 'min(76vw, 280px)', maxHeight: '60vh', overflowY: 'auto', overflowX: 'hidden', fontFamily: 'Inter, sans-serif', padding: '2px 0' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,#059669,#10B981)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
                  </svg>
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', margin: 0, lineHeight: 1.2 }}>{activeSurvivalPopup.name}</p>
                  <p style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#059669', fontWeight: 600, margin: 0 }}>
                    {activeSurvivalPopup.storeType === 'convenience' ? '24/7 Convenience' : activeSurvivalPopup.storeType === 'grocery' ? 'Grocery' : 'Supermarket'}
                  </p>
                </div>
              </div>
              {activeSurvivalPopup.opening_hours ? (() => {
                const rows = parseOpeningHours(activeSurvivalPopup.opening_hours);
                return (
                  <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, padding: '7px 10px' }}>
                    <p style={{ fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#059669', fontWeight: 700, margin: '0 0 6px 0' }}>OPENING HOURS</p>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                      <tbody>
                        {rows.map((row, i) => (
                          <tr key={i} style={{ borderTop: i > 0 ? '1px solid #D1FAE5' : 'none' }}>
                            <td style={{ padding: '3px 0', color: '#374151', fontWeight: 600, whiteSpace: 'nowrap', paddingRight: 10, verticalAlign: 'top' }}>{row.days}</td>
                            <td style={{ padding: '3px 0', color: '#059669', fontWeight: 500, textAlign: 'right', verticalAlign: 'top' }}>{row.hours}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })() : (
                <p style={{ fontSize: 10, color: '#94A3B8', margin: 0, fontStyle: 'italic' }}>Hours not listed on OpenStreetMap</p>
              )}
            </div>
          </Popup>
        )}

        {/* Building Clusters */}
        {buildingClusters.map((cluster) => {
          if (cluster.listings.length === 1) {
            const listing = cluster.listings[0];
            const isScamActive = listing.category === 'scam';
            const markerSize = isScamActive ? 38 : 34;
            return (
              <Marker
                key={listing.id}
                longitude={listing.lng}
                latitude={listing.lat}
                anchor="center"
                onClick={(e) => {
                  e.originalEvent.stopPropagation();
                  focusListingSurface(listing);
                }}
              >
                <div dangerouslySetInnerHTML={{ __html: buildDualBlipMarkerHtml(listing.category, markerSize) }} />
              </Marker>
            );
          } else {
            const hasScam = cluster.listings.some(l => l.category === 'scam');
            const clusterColor = hasScam ? '#B91C1C' : '#EA580C';
            return (
              <Marker
                key={cluster.key}
                longitude={cluster.lng}
                latitude={cluster.lat}
                anchor="center"
                onClick={(e) => { e.originalEvent.stopPropagation(); openPropertyPedigree(cluster); }}
              >
                <div style={{ position: 'relative', width: 32, height: 32 }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: clusterColor, opacity: 0.85, borderRadius: '50%', border: '3px solid ' + clusterColor }} />
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 700, color: 'white', pointerEvents: 'none', lineHeight: 1 }}>
                    {cluster.listings.length}
                  </div>
                </div>
              </Marker>
            );
          }
        })}

        {/* User Location Marker */}
        {userLocation && (
          <Marker longitude={userLocation.lng} latitude={userLocation.lat} anchor="center">
            <div className="w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-lg shadow-blue-600/50 relative">
              {userLocation.accuracy && (
                <div
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600/20"
                  style={{ width: `${Math.min(userLocation.accuracy, 200)}px`, height: `${Math.min(userLocation.accuracy, 200)}px`, pointerEvents: 'none' }}
                />
              )}
            </div>
          </Marker>
        )}

        {/* Search Pin */}
        {searchPin && (
          <Marker longitude={searchPin.lng} latitude={searchPin.lat} anchor="bottom">
            <div className="text-[#EE811A] filter drop-shadow-md">
              <MapPin size={32} fill="white" />
            </div>
          </Marker>
        )}

        {/* Active Listing Popup */}
        {activePopupListing && (
          <Popup
            longitude={activePopupListing.lng}
            latitude={activePopupListing.lat}
            anchor="bottom"
            onClose={() => setActivePopupListing(null)}
            closeButton={false}
            closeOnClick={false}
            className="ghar-popup z-50"
            offset={20}
          >
            {(() => {
              const recencyLabel = getScamAlertRecencyLabel(activePopupListing.created_at);
              return (
            <div
              onClick={(event) => event.stopPropagation()}
              style={{ width: 'min(calc(100vw - 24px), 336px)' }}
              className="flex min-w-0 max-w-full max-h-[min(68vh,520px)] flex-col overflow-hidden rounded-[28px] bg-white font-sans"
            >
              <div className="shrink-0 border-b border-[#E2E8F0] px-4 pb-3 pt-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className="rounded-[14px] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white" style={{ background: categoryColors[activePopupListing.category] || '#94A3B8' }}>
                      {categoryLabels[activePopupListing.category] || activePopupListing.category}
                    </span>
                    <span className="rounded-[14px] bg-[#F0FDF4] px-3 py-1 text-[11px] font-semibold text-[#16A34A]">
                      {recencyLabel}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setActivePopupListing(null);
                    }}
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F8FAFC] text-[#94A3B8] transition hover:text-[#0F172A]"
                    aria-label="Close scam alert"
                  >
                    <X className="h-4 w-4" strokeWidth={1.8} />
                  </button>
                </div>

                <p className="mt-3 min-w-0 break-words text-[15px] font-bold text-[#0F172A] [overflow-wrap:anywhere]">{activePopupListing.listing_id_public}</p>
                {activePopupListing.unit_number ? (
                  <p className="mt-2 break-words text-[11px] font-semibold uppercase tracking-[0.18em] text-[#1E40AF] [overflow-wrap:anywhere]">
                    {activePopupListing.unit_number}
                  </p>
                ) : null}
                <p className="mt-2 min-w-0 break-words text-sm leading-6 text-[#64748B] [overflow-wrap:anywhere]">{activePopupListing.address}</p>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-4">
                <div className="rounded-[20px] bg-[#F8FAFC] p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#94A3B8]">Report summary</p>
                  <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-[#475569] [overflow-wrap:anywhere]">
                    {activePopupListing.description}
                  </p>
                </div>
                {activePopupListing.nearest_transit && activePopupListing.nearest_transit.length > 0 && (
                  <div className="mt-3 rounded-[20px] border border-[#BFDBFE]/40 bg-[#F0F9FF] p-3">
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#1E40AF]">Commuter context</p>
                    {activePopupListing.nearest_transit.map((t: any, i: number) => {
                      const emoji = t.type === 'train' ? '🚆' : t.type === 'light_rail' ? '🚊' : '🚌';
                      return (
                        <div key={i} className={`flex min-w-0 items-center gap-2 ${i < activePopupListing.nearest_transit!.length - 1 ? 'mb-1.5' : ''}`}>
                          <span className="text-xs">{emoji}</span>
                          <span className="min-w-0 flex-1 break-words text-[11px] font-medium text-[#0F172A] [overflow-wrap:anywhere]">{t.name}</span>
                          <span className="shrink-0 whitespace-nowrap text-[11px] font-bold text-[#1E40AF]">{t.walk_min} min</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="shrink-0 border-t border-[#E2E8F0] bg-white px-4 py-3">
                <p className="mb-3 text-[11px] leading-relaxed text-[#64748B]">
                  Opens this listing in the Legal workflow so you can review the alert in context.
                </p>
                <div className="grid gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); onSelectListing(activePopupListing); }}
                    className="w-full rounded-[18px] bg-[#0F172A] px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-white transition-colors hover:bg-[#1E293B] cursor-pointer"
                  >
                    {APP_CONFIG.variant === 'burb_mate' ? 'Open in Legal' : 'Open in Legal Center'}
                  </button>
                  {(activePopupListing.reported_by || '').toLowerCase() === email.toLowerCase() && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteListing(activePopupListing.id); }}
                      disabled={deleteLoading}
                      className="flex w-full items-center justify-center gap-1.5 rounded-[18px] border border-[#FECACA] bg-transparent px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#B91C1C] transition-colors hover:bg-[#FEF2F2] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {deleteLoading ? (
                        <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#B91C1C]/30 border-t-[#B91C1C]" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                      {deleteLoading ? 'Deleting...' : 'Delete My Alert'}
                    </button>
                  )}
                </div>
              </div>
            </div>
              );
            })()}
          </Popup>
        )}
      </MapGL>

      {isWolliExperience && showWolliWardLookup && (
        <div className="fixed inset-0 z-[1200] bg-white">
          <div
            className="flex h-[100dvh] flex-col bg-white"
            style={{ paddingTop: 'var(--native-safe-area-top)', paddingBottom: 'var(--native-safe-area-bottom)' }}
          >
            <div className="flex shrink-0 items-center gap-3 border-b border-[#DCEBE5] bg-white/96 px-4 py-3 shadow-sm">
              <button
                type="button"
                onClick={handleCloseWolliWardBoundaries}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#DCEBE5] bg-white text-[#64748B]"
                aria-label="Close Bayside Council Wards and LGA"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-[#0F172A]">Bayside Council Wards &amp; LGA</p>
                <p className="truncate text-[11px] font-semibold text-[#64748B]">Official Bayside Council ArcGIS lookup</p>
              </div>
              <button
                type="button"
                onClick={() => openMapExternalUrl(BAYSIDE_WARD_BOUNDARY_URL)}
                className="shrink-0 rounded-xl bg-[#008A8C] px-3 py-2 text-[11px] font-black text-white"
              >
                Open official
              </button>
            </div>
            <iframe
              title="Bayside Council Wards and LGA map"
              src={BAYSIDE_WARD_BOUNDARY_URL}
              className="min-h-0 flex-1 border-0"
              loading="lazy"
            />
          </div>
        </div>
      )}

      {/* ─── SEARCH BAR ──────────────────────────────────────────── */}
      <div className={`absolute top-0 left-0 right-0 px-4 native-safe-area-top-compact pt-2 ${showTransportNetworkBurst || showGroceryRetailerBurst ? 'z-[999]' : 'z-[1000]'}`}>
        <div className="max-w-md mx-auto">
          <div ref={dashboardSearchRef} className="relative">
            <div className="relative group">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <Search className="text-[#94A3B8] group-focus-within:text-[#EE811A] transition-colors" size={18} />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setDashboardSearchError(null);
                }}
                onFocus={() => {
                  setIsDashboardSearchActive(true);
                  setDashboardSearchError(null);
                  if (dashboardSearchUsesAddressResults && dashboardVisibleSearchResults.length > 0) {
                    setShowSearchResults(true);
                  }
                }}
                onKeyDown={handleDashboardSearchInputKeyDown}
                placeholder="Search for a building or suburb..."
                className="w-full h-11 pl-12 pr-4 bg-white/95 backdrop-blur-md border border-[#E2E8F0] rounded-2xl shadow-xl shadow-[#94A3B8]/10 focus:ring-2 focus:ring-[#EE811A]/20 focus:border-[#EE811A]/40 outline-none transition-all text-sm text-[#0F172A] placeholder-[#94A3B8] font-normal"
              />
              {searchLoading && (
                <div className="absolute inset-y-0 right-4 flex items-center">
                  <div className="w-4 h-4 border-2 border-[#EE811A] border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>

            {isDashboardSearchActive && (
              <div className="mt-2 flex flex-wrap gap-2">
                {([
                  { id: 'address', label: 'Address', icon: MapPin },
                  { id: 'transport', label: 'Public Transport', icon: Train },
                  { id: 'fuel', label: 'Fuel Prices', icon: Fuel },
                  { id: 'groceries', label: 'Groceries', icon: ShoppingBasket },
                ] as const).map((option) => {
                  const Icon = option.icon;
                  const active = dashboardSearchMode === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => handleDashboardSearchModeSelect(option.id)}
                      className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-[12px] font-semibold transition-all cursor-pointer ${
                        active
                          ? 'border-[#EE811A] bg-[#EE811A] text-white shadow-lg shadow-[#EE811A]/20'
                          : 'border-white/70 bg-white/92 text-[#475569] shadow-sm hover:border-[#EE811A]/30 hover:text-[#EE811A]'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" strokeWidth={1.9} />
                      <span>{option.label}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {isDashboardSearchActive && dashboardSearchError && (
              <div className="mt-2 rounded-2xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-[12px] text-[#991B1B] shadow-sm">
                {dashboardSearchError}
              </div>
            )}

            {showSearchResults && dashboardVisibleSearchResults.length > 0 && (
              <ul className="absolute mt-1.5 w-full bg-white/95 backdrop-blur-xl border border-[#E2E8F0] rounded-2xl shadow-2xl shadow-[#94A3B8]/20 max-h-64 overflow-hidden overflow-y-auto">
                {dashboardVisibleSearchResults.map((r) => (
                  <li key={r.place_id}>
                    <button
                      type="button"
                      onPointerDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                      }}
                      onPointerUp={(event) => handleDashboardSearchSuggestionActivate(event, r)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          handleDashboardSearchSuggestionActivate(event, r);
                        }
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-[#F8FAFC] transition-colors cursor-pointer flex items-start gap-3 border-b border-[#F1F5F9] last:border-none"
                    >
                      <MapPin className="w-4 h-4 text-[#EE811A] mt-0.5 shrink-0" strokeWidth={1.5} />
                      <div className="min-w-0">
                        <p className="text-sm text-[#0F172A] font-medium truncate">{getAddressSearchTitle(r)}</p>
                        <p className="text-[11px] text-[#94A3B8] truncate font-normal">{getAddressSearchSubtitle(r) || getAddressSearchDisplay(r)}</p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {layerToilets && showPublicToiletPanel && (
        <div className="absolute bottom-[calc(var(--native-safe-area-bottom)+112px)] left-3 right-3 z-[1001] mx-auto flex max-h-[min(58dvh,560px)] max-w-md flex-col overflow-hidden rounded-[28px] border border-[#99F6E4] bg-white/98 shadow-2xl shadow-[#0F172A]/16 backdrop-blur-xl">
          <div className="border-b border-[#CCFBF1] bg-[#F0FDFA] px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-[#0F766E] text-white">
                    <Toilet className="h-4 w-4" strokeWidth={2} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#0F766E]">Public Toilets</p>
                    <p className="truncate text-sm font-bold text-[#0F172A]">
                      {publicToiletMapLoading
                        ? 'Loading facilities...'
                        : `${publicToiletResultItems.length} of ${visiblePublicToilets.length} facilities shown`}
                    </p>
                  </div>
                </div>
                <p className="mt-2 text-[11px] leading-4 text-[#115E59]">
                  Search a place, use your location, or filter nearby facilities.
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowPublicToiletPanel(false);
                    setIsPublicToiletPanelMinimized(true);
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#64748B] shadow-sm transition hover:bg-[#ECFEFF] hover:text-[#0F172A]"
                  aria-label="Minimize public toilet results"
                >
                  <Minus className="h-4 w-4" strokeWidth={1.8} />
                </button>
                <button
                  type="button"
                  onClick={closePublicToiletLayer}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#64748B] shadow-sm transition hover:bg-[#ECFEFF] hover:text-[#0F172A]"
                  aria-label="Close public toilet results"
                >
                  <X className="h-4 w-4" strokeWidth={1.8} />
                </button>
              </div>
            </div>

            <form onSubmit={handlePublicToiletSearchSubmit} className="mt-3 flex gap-2">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" strokeWidth={1.8} />
                <input
                  type="text"
                  value={publicToiletSearchQuery}
                  onChange={(event) => setPublicToiletSearchQuery(event.target.value)}
                  placeholder="Place, suburb, or landmark"
                  className="h-11 w-full rounded-2xl border border-[#CCFBF1] bg-white pl-9 pr-3 text-sm text-[#0F172A] outline-none transition placeholder:text-[#94A3B8] focus:border-[#0F766E]/40 focus:ring-2 focus:ring-[#0F766E]/15"
                />
              </div>
              <button
                type="submit"
                disabled={publicToiletSearchLoading}
                className="inline-flex h-11 items-center justify-center rounded-2xl bg-[#0F766E] px-4 text-sm font-bold text-white transition hover:bg-[#115E59] disabled:cursor-wait disabled:bg-[#94A3B8]"
              >
                {publicToiletSearchLoading ? '...' : 'Go'}
              </button>
            </form>

            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void openNearbyToiletFromCurrentLocation()}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#99F6E4] bg-white px-3 py-2 text-[12px] font-bold text-[#0F766E] transition hover:bg-[#CCFBF1]"
              >
                <Crosshair className="h-3.5 w-3.5" strokeWidth={1.8} />
                Current location
              </button>
              {PUBLIC_TOILET_FILTERS.map((filter) => {
                const active = activePublicToiletFilters.includes(filter.id);
                return (
                  <button
                    key={filter.id}
                    type="button"
                    onClick={() => togglePublicToiletFilter(filter.id)}
                    className={`rounded-full border px-3 py-2 text-[12px] font-bold transition ${
                      active
                        ? 'border-[#0F766E] bg-[#0F766E] text-white shadow-sm shadow-[#0F766E]/20'
                        : 'border-[#CCFBF1] bg-white text-[#115E59] hover:bg-[#F0FDFA]'
                    }`}
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>

            {publicToiletSearchError ? (
              <div className="mt-2 rounded-2xl border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-[12px] font-semibold text-[#991B1B]">
                {publicToiletSearchError}
              </div>
            ) : null}
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3">
            {publicToiletMapLoading && visiblePublicToilets.length === 0 ? (
              <div className="rounded-2xl border border-[#CCFBF1] bg-[#F8FAFC] px-4 py-5 text-center text-sm font-semibold text-[#64748B]">
                Loading public toilet facilities...
              </div>
            ) : publicToiletResultItems.length === 0 ? (
              <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-5 text-center">
                <p className="text-sm font-bold text-[#0F172A]">
                  {isPublicToiletFilteredEmpty ? 'No facilities match these filters' : 'No matching facilities shown'}
                </p>
                <p className="mt-1 text-xs leading-5 text-[#64748B]">
                  {isPublicToiletFilteredEmpty
                    ? `${visiblePublicToilets.length} nearby ${visiblePublicToilets.length === 1 ? 'facility is' : 'facilities are'} loaded, but hidden by the selected filters.`
                    : 'Zoom out, search another place, or try current location.'}
                </p>
                {isPublicToiletFilteredEmpty ? (
                  <button
                    type="button"
                    onClick={() => setActivePublicToiletFilters([])}
                    className="mt-3 inline-flex items-center justify-center rounded-full border border-[#99F6E4] bg-white px-4 py-2 text-[12px] font-bold text-[#0F766E] transition hover:bg-[#CCFBF1]"
                  >
                    Clear filters
                  </button>
                ) : null}
              </div>
            ) : (
              <div className="space-y-2">
                {publicToiletResultItems.slice(0, 8).map(({ toilet, distance }) => {
                  const address = formatPublicToiletAddress(toilet);
                  const flags = buildPublicToiletFlags(toilet).slice(0, 4);
                  return (
                    <div key={toilet.id} className="rounded-[22px] border border-[#E2E8F0] bg-white p-3 shadow-sm">
                      <button
                        type="button"
                        onClick={() => handleOpenPublicToiletResult(toilet, distance)}
                        className="flex w-full items-start gap-3 text-left"
                      >
                        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[#0F766E] text-white">
                          <Toilet className="h-4 w-4" strokeWidth={2} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold text-[#0F172A]">{toilet.name || 'Public toilet'}</span>
                          {address ? (
                            <span className="mt-1 block truncate text-[12px] text-[#64748B]">{address}</span>
                          ) : null}
                          {distance ? (
                            <span className="mt-1 block text-[11px] font-bold uppercase tracking-wide text-[#0F766E]">
                              {formatPublicToiletDistance(distance.distanceM)} - about {distance.walkMin} min walk
                            </span>
                          ) : null}
                        </span>
                        <ChevronRight className="mt-2 h-4 w-4 shrink-0 text-[#94A3B8]" strokeWidth={1.8} />
                      </button>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {toilet.openingHours ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#F0FDFA] px-2 py-1 text-[10px] font-bold text-[#115E59]">
                            <Clock3 className="h-3 w-3" strokeWidth={1.8} />
                            {toilet.openingHours}
                          </span>
                        ) : null}
                        {flags.map((flag) => {
                          const FlagIcon = flag.icon;
                          return (
                            <span key={flag.label} className="inline-flex items-center gap-1 rounded-full border border-[#CCFBF1] bg-white px-2 py-1 text-[10px] font-bold text-[#115E59]">
                              <FlagIcon className="h-3 w-3" strokeWidth={1.8} />
                              {flag.label}
                            </span>
                          );
                        })}
                      </div>
                      <div className="mt-2">
                        <button
                          type="button"
                          onClick={() => handleOpenToiletDirections(toilet)}
                          className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#0F766E] px-3 py-2 text-[12px] font-bold text-white transition hover:bg-[#115E59]"
                        >
                          <Navigation className="h-3.5 w-3.5" strokeWidth={2} />
                          Directions
                        </button>
                      </div>
                    </div>
                  );
                })}
                {publicToiletResultItems.length > 8 ? (
                  <p className="px-2 py-1 text-center text-[11px] font-semibold text-[#64748B]">
                    Showing nearest 8. Pan or search to refine this map area.
                  </p>
                ) : null}
              </div>
            )}
          </div>
        </div>
      )}

      {layerToilets && isPublicToiletPanelMinimized && (
        <div className="absolute bottom-[calc(var(--native-safe-area-bottom)+112px)] left-3 right-3 z-[1001] mx-auto max-w-md animate-[slideUp_0.2s_ease-out]">
          <button
            type="button"
            onClick={() => {
              setShowPublicToiletPanel(true);
              setIsPublicToiletPanelMinimized(false);
              setPublicToiletInfo(null);
            }}
            className="flex w-full items-center justify-between gap-3 rounded-[22px] border border-[#99F6E4] bg-white/98 px-4 py-3 text-left shadow-xl shadow-[#0F172A]/14 backdrop-blur-xl"
            aria-label="Open public toilet results"
          >
            <span className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#0F766E] text-white">
                <Toilet className="h-5 w-5" strokeWidth={2} />
              </span>
              <span className="min-w-0">
                <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-[#0F766E]">Public Toilets</span>
                <span className="mt-0.5 block truncate text-sm font-bold text-[#0F172A]">
                  {publicToiletMapLoading
                    ? 'Loading facilities...'
                    : `${publicToiletResultItems.length} of ${visiblePublicToilets.length} facilities shown`}
                </span>
              </span>
            </span>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#0F766E] px-3 py-2 text-xs font-semibold text-white">
              Open
              <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.8} />
            </span>
          </button>
        </div>
      )}

      {isFocusedMapExpandedActive && focusedMapTarget && (
        <div className="absolute bottom-[88px] left-0 right-0 z-[1001] px-3 animate-[slideUp_0.3s_ease-out]">
          <div className="mx-auto max-w-md overflow-hidden rounded-[28px] border border-[#E2E8F0] bg-white/98 shadow-2xl shadow-[#0F172A]/18 backdrop-blur-xl">
            <div className="flex justify-center pt-2">
              <div className="h-1 w-12 rounded-full bg-[#E2E8F0]" />
            </div>
            <div className="max-h-[min(70dvh,36rem)] overflow-y-auto overscroll-contain px-5 pb-5 pt-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                {focusedMapReturnRoute ? (
                  <button
                    type="button"
                    onClick={handleReturnToFocusedMapSource}
                    className="inline-flex items-center gap-2 rounded-full border border-[#D8E3F0] bg-white px-3 py-2 text-xs font-semibold text-[#0F172A] transition-colors hover:border-[#CBD5E1] hover:bg-[#F8FAFC]"
                  >
                    <ChevronLeft className="h-4 w-4" strokeWidth={1.8} />
                    {focusedMapReturnLabel}
                  </button>
                ) : (
                  <span className="inline-flex h-9" aria-hidden="true" />
                )}

                <div className="ml-auto flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsFocusedMapTargetMinimized(true)}
                    className="inline-flex items-center gap-2 rounded-full border border-[#D8E3F0] bg-white px-3 py-2 text-xs font-semibold text-[#0F172A] transition-colors hover:border-[#CBD5E1] hover:bg-[#F8FAFC]"
                  >
                    <Minus className="h-4 w-4" strokeWidth={1.8} />
                    Minimize
                  </button>
                  <button
                    type="button"
                    onClick={closeFocusedMapTarget}
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F8FAFC] text-[#94A3B8] transition hover:bg-[#EEF2FF] hover:text-[#0F172A]"
                    aria-label="Close focused map target"
                  >
                    <X className="h-4 w-4" strokeWidth={1.8} />
                  </button>
                </div>
              </div>

              <div className="mt-3 min-w-0">
                <span className="inline-flex rounded-full bg-[#EEF2FF] px-3 py-1 text-[11px] font-semibold text-[#1E40AF]">
                  {focusedMapBadge}
                </span>
                <p className="mt-3 break-words text-[28px] font-bold leading-tight text-[#0F172A]">{focusedMapTarget.label}</p>
                {focusedMapDateLine ? (
                  <p className="mt-2 text-sm font-medium text-[#1E40AF]">{focusedMapDateLine}</p>
                ) : null}
                {focusedMapLocationText ? (
                  <p className="mt-2 text-sm text-[#64748B]">
                    {focusedMapLocationText}
                  </p>
                ) : null}
              </div>

              {focusedMapTarget.imageUrl ? (
                <img
                  src={focusedMapTarget.imageUrl}
                  alt={focusedMapTarget.label}
                  className="mt-4 aspect-[16/9] w-full rounded-[24px] object-cover"
                />
              ) : null}

              {focusedMapBodyText ? (
                <p className="mt-4 break-words text-base leading-8 text-[#475569]">{focusedMapBodyText}</p>
              ) : null}

              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={handleOpenFocusedDirections}
                  disabled={!canOpenFocusedDirections}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#0F172A] px-4 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#1E293B] disabled:cursor-not-allowed disabled:bg-[#CBD5E1] disabled:text-white/90"
                >
                  <Navigation className="h-4 w-4" strokeWidth={1.8} />
                  Directions
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsFocusedMapTargetMinimized(false);
                    setShowFocusedDirectionsChooser(false);
                    setFocusedMapPanelView('context');
                    handleSelectSearchResult({
                      place_id: Date.now(),
                      display_name: focusedMapTarget.kind === 'event-place'
                        ? [focusedMapTarget.label, focusedMapLocationText].filter(Boolean).join(', ')
                        : focusedMapTarget.label,
                      lat: String(focusedMapTarget.lat),
                      lon: String(focusedMapTarget.lng),
                      address: {
                        suburb: getFocusedMapTargetContextSuburb(focusedMapTarget) || undefined,
                        state: getFocusedMapTargetContextState(focusedMapTarget) || undefined,
                      },
                    }, {
                      openCommuterContext: true,
                      preserveFocusedTarget: true,
                    });
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#D8E3F0] bg-[#F8FAFC] px-4 py-3.5 text-sm font-semibold text-[#1E40AF] transition-colors hover:border-[#1E40AF]/30 hover:bg-[#EEF2FF]"
                >
                  <Shield className="h-4 w-4" strokeWidth={1.8} />
                  Nearby Safety & Essentials
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isFocusedMapMinimizedActive && focusedMapTarget && (
        <div className="absolute bottom-[88px] left-0 right-0 z-[1001] px-3 animate-[slideUp_0.2s_ease-out]">
          <button
            type="button"
            onClick={() => setIsFocusedMapTargetMinimized(false)}
            className="mx-auto flex w-full max-w-md items-center justify-between gap-3 rounded-[24px] border border-[#E2E8F0] bg-white/98 px-4 py-3 text-left shadow-xl shadow-[#0F172A]/14 backdrop-blur-xl"
          >
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#94A3B8]">{focusedMapBadge}</p>
              <p className="mt-1 truncate text-sm font-bold text-[#0F172A]">{focusedMapTarget.label}</p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#0F172A] px-3 py-2 text-xs font-semibold text-white">
              Open
              <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.8} />
            </span>
          </button>
        </div>
      )}

      <Drawer
        open={showFocusedDirectionsChooser && Boolean(directionsTarget || focusedMapTarget)}
        onOpenChange={(open) => {
          setShowFocusedDirectionsChooser(open);
          if (!open) setDirectionsTarget(null);
        }}
      >
        <DrawerContent
          overlayClassName="z-[2200]"
          className="z-[2201] rounded-t-[28px] border-[#E2E8F0] bg-white"
        >
          <DrawerHeader className="border-b border-[#E2E8F0]">
            <DrawerTitle className="text-lg font-bold text-[#0F172A]">Open directions</DrawerTitle>
            {(directionsTarget || focusedMapTarget) ? (
              <p className="mt-1 text-sm text-[#64748B]">
                Choose an app for {(directionsTarget || focusedMapTarget)?.label || 'this place'}.
              </p>
            ) : null}
          </DrawerHeader>
          <div className="space-y-2 px-4 pb-[calc(var(--native-safe-area-bottom)+16px)] pt-4">
            {FOCUSED_TARGET_DIRECTIONS_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => handleOpenFocusedDirectionsApp(option.id)}
                className="flex w-full items-center justify-between gap-3 rounded-[22px] border border-[#E2E8F0] bg-white px-4 py-3 text-left transition hover:bg-[#F8FAFC]"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#0F172A]">{option.label}</p>
                  <p className="mt-1 text-xs text-[#64748B]">{option.subtitle}</p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-[#94A3B8]" strokeWidth={1.8} />
              </button>
            ))}
          </div>
        </DrawerContent>
      </Drawer>

      {/* ─── GPS PERMISSION PROMPT ──────────────────────────────── */}
      {showGpsPrompt && !gpsPromptDismissed && (
        <div
          className="absolute left-0 right-0 z-[1001] px-4"
          style={{ top: 'calc(var(--native-safe-area-top) + 3.5rem)' }}
        >
          <div className="max-w-md mx-auto bg-white/98 backdrop-blur-md border border-[#E2E8F0] rounded-2xl shadow-2xl shadow-[#94A3B8]/20 p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-[#1E40AF]/10 rounded-xl flex items-center justify-center shrink-0">
                <Navigation className="w-5 h-5 text-[#1E40AF]" strokeWidth={1.5} />
              </div>
              <div className="flex-1">
                <p className="text-sm text-[#0F172A] font-bold">{APP_CONFIG.displayName} would like to use your location</p>
                <p className="text-xs text-[#64748B] mt-1 font-normal">To show nearby alerts and help you find reports in your area.</p>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => { setShowGpsPrompt(false); setGpsPromptDismissed(true); handleLocateMe(); }}
                    className="flex-1 py-2.5 bg-[#1E40AF] text-white rounded-xl text-xs tracking-wide font-medium cursor-pointer hover:bg-[#1E3A8A] transition-all"
                  >Allow</button>
                  <button
                    onClick={handleGpsDeny}
                    className="flex-1 py-2.5 bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0] rounded-xl text-xs tracking-wide font-medium cursor-pointer hover:bg-[#E2E8F0] transition-all"
                  >Not Now</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── CAMPUS SUBURBS EXPLORER PANEL ──────────────────────── */}
      {isSuburbExplorerOpen && (
        <div className="absolute top-[88px] left-4 z-[1001] w-72 bg-white/95 backdrop-blur-xl border border-[#E2E8F0] rounded-2xl shadow-xl shadow-[#94A3B8]/20 overflow-hidden flex flex-col animate-[fadeIn_0.2s_ease-out]">
          <div className={`px-4 py-3 border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]/50 ${isSuburbExplorerMinimized ? '' : 'border-b'}`}>
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 text-[#1E40AF]" strokeWidth={1.5} />
              <span className="text-sm font-bold text-[#0F172A]">Explore Suburbs</span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setIsSuburbExplorerMinimized(!isSuburbExplorerMinimized)} className="text-[#94A3B8] hover:text-[#0F172A] transition-colors cursor-pointer p-1">
                {isSuburbExplorerMinimized ? <Plus className="w-4 h-4" strokeWidth={1.5} /> : <Minus className="w-4 h-4" strokeWidth={1.5} />}
              </button>
              <button
                onClick={() => {
                  setIsSuburbExplorerOpen(false);
                  setHighlightedSuburb(null);
                  setSuburbGeoJSON(null);
                  setIsGlobe(true);
                  setVisibleSurvivalStores([]);
                  setTimeout(() => {
                    mapGLRef.current?.getMap()?.flyTo({ center: [133.7751, -25.2744], zoom: getGlobeZoom(), pitch: 0, duration: 2500, essential: true });
                  }, 100);
                }}
                className="text-[#94A3B8] hover:text-[#0F172A] transition-colors cursor-pointer p-1"
              >
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>
          </div>

          {!isSuburbExplorerMinimized && (
            <>
              <div className="p-3 border-b border-[#E2E8F0] relative">
                <button
                  onClick={() => setIsUniDropdownOpen(!isUniDropdownOpen)}
                  className="w-full flex items-center justify-between bg-[#F1F5F9] border border-[#E2E8F0] text-sm text-[#0F172A] rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-[#1E40AF]/20 focus:border-[#1E40AF]/40 font-medium cursor-pointer transition-colors hover:bg-[#E2E8F0]/50"
                >
                  <span className="truncate pr-4">{selectedUni}</span>
                  <ChevronDown className={`w-4 h-4 shrink-0 text-[#64748B] transition-transform duration-200 ${isUniDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                {isUniDropdownOpen && (
                  <div className="absolute z-50 left-3 right-3 top-full mt-1 bg-white border border-[#E2E8F0] rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] overflow-hidden flex flex-col max-h-[240px]">
                    <div className="p-2.5 border-b border-[#F1F5F9] flex items-center gap-2 text-[#64748B] bg-white">
                      <Search className="w-4 h-4 shrink-0" />
                      <input
                        type="text"
                        placeholder="Search universities..."
                        value={uniSearchTerm}
                        onChange={(e) => setUniSearchTerm(e.target.value)}
                        className="w-full text-sm outline-none text-[#0F172A] placeholder:text-[#94A3B8] bg-transparent"
                        autoFocus
                      />
                    </div>
                    <div className="overflow-y-auto flex-1 p-1.5 space-y-0.5 bg-white">
                      {Object.keys(UNIVERSITY_SUBURBS)
                        .filter(uni => uni.toLowerCase().includes(uniSearchTerm.toLowerCase()))
                        .map((uni) => (
                          <button
                            key={uni}
                            onClick={() => { setSelectedUni(uni); setIsUniDropdownOpen(false); setUniSearchTerm(""); setHighlightedSuburb(null); setSuburbGeoJSON(null); }}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${selectedUni === uni ? 'bg-[#1E40AF]/10 text-[#1E40AF] font-medium' : 'text-[#334155] hover:bg-[#F8FAFC]'}`}
                          >{uni}</button>
                        ))}
                      {Object.keys(UNIVERSITY_SUBURBS).filter(uni => uni.toLowerCase().includes(uniSearchTerm.toLowerCase())).length === 0 && (
                        <div className="text-center py-4 text-sm text-[#64748B]">No universities found</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-y-auto max-h-[40vh] p-2 space-y-1 relative">
                {isLoadingSuburb && (
                  <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-10 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-[#1E40AF] border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                {UNIVERSITY_SUBURBS[selectedUni]?.map((suburb) => (
                  <button
                    key={suburb}
                    onClick={() => {
                      setHighlightedSuburb(suburb);
                      setIsGlobe(false);
                      fetchSuburbBoundary(suburb);
                    }}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all cursor-pointer flex items-center gap-2 ${
                      highlightedSuburb === suburb
                        ? 'bg-[#1E40AF]/10 text-[#1E40AF] font-semibold'
                        : 'text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A] font-medium'
                    }`}
                  >
                    <MapPin className={`w-3.5 h-3.5 shrink-0 ${highlightedSuburb === suburb ? 'text-[#1E40AF]' : 'text-[#94A3B8]'}`} strokeWidth={1.5} />
                    {suburb}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {sameAddressAlert && (
        <div className="absolute top-[110px] left-0 right-0 z-[1001] px-4">
          <div className="max-w-md mx-auto bg-[#FFF3E0] border border-[#EE811A] rounded-2xl p-3.5 flex items-center gap-3 shadow-lg">
            <Home className="w-5 h-5 text-[#EE811A] shrink-0" strokeWidth={1.5} />
            <div className="flex-1"><p className="text-xs text-[#0F172A] font-bold">{sameAddressAlert}</p></div>
            <button onClick={() => setSameAddressAlert(null)} className="text-[#94A3B8] hover:text-[#0F172A] cursor-pointer"><X className="w-4 h-4" strokeWidth={1.5} /></button>
          </div>
        </div>
      )}

      {geoError && (
        <div className="absolute top-[110px] left-0 right-0 z-[1001] px-4 animate-[fadeIn_0.3s_ease-out]">
          <div className="max-w-md mx-auto bg-[#B91C1C]/10 border border-[#B91C1C]/20 rounded-2xl p-3.5 flex items-center gap-3">
            <Crosshair className="w-5 h-5 text-[#B91C1C] shrink-0" strokeWidth={1.5} />
            <p className="text-xs text-[#0F172A] font-medium flex-1">{geoError}</p>
            <button onClick={() => setGeoError(null)} className="text-[#94A3B8] hover:text-[#0F172A] cursor-pointer shrink-0"><X className="w-4 h-4" strokeWidth={1.5} /></button>
          </div>
        </div>
      )}

      {publicToiletInfo && (
        <div className="absolute top-[110px] left-0 right-0 z-[1001] px-4 animate-[fadeIn_0.3s_ease-out]">
          <div className="mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-[#99F6E4] bg-[#F0FDFA] p-3.5">
            <Toilet className="h-5 w-5 shrink-0 text-[#0F766E]" strokeWidth={1.7} />
            <p className="flex-1 text-xs font-medium text-[#0F172A]">{publicToiletInfo}</p>
            <button onClick={() => setPublicToiletInfo(null)} className="shrink-0 cursor-pointer text-[#94A3B8] hover:text-[#0F172A]"><X className="h-4 w-4" strokeWidth={1.5} /></button>
          </div>
        </div>
      )}

      {/* ─── FLOATING ACTION BUTTONS ──────────────────────────────── */}
      <div
        className={`absolute bottom-[110px] left-4 z-[1000] flex flex-col gap-3 transition-opacity duration-200 ${hideFloatingMapControls ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
        aria-hidden={hideFloatingMapControls}
      >
        {/* ── Zoom +/− (thumb-reachable on mobile, supplement pinch-to-zoom) ── */}
        <button
          onClick={() => { const map = mapGLRef.current?.getMap(); if (map) map.zoomIn({ duration: 300 }); }}
          className="w-12 h-12 bg-white/95 backdrop-blur-md border border-[#E2E8F0] rounded-2xl flex items-center justify-center shadow-lg shadow-[#94A3B8]/15 hover:bg-white hover:border-[#1E40AF]/30 hover:shadow-xl active:scale-95 transition-all cursor-pointer group"
          title="Zoom in"
          aria-label="Zoom in"
        >
          <Plus className="w-5 h-5 text-[#64748B] group-hover:text-[#1E40AF] transition-colors" strokeWidth={2} />
        </button>
        <button
          onClick={() => { const map = mapGLRef.current?.getMap(); if (map) map.zoomOut({ duration: 300 }); }}
          className="w-12 h-12 bg-white/95 backdrop-blur-md border border-[#E2E8F0] rounded-2xl flex items-center justify-center shadow-lg shadow-[#94A3B8]/15 hover:bg-white hover:border-[#1E40AF]/30 hover:shadow-xl active:scale-95 transition-all cursor-pointer group"
          title="Zoom out"
          aria-label="Zoom out"
        >
          <Minus className="w-5 h-5 text-[#64748B] group-hover:text-[#1E40AF] transition-colors" strokeWidth={2} />
        </button>
        <button
          onClick={() => setIsSuburbExplorerOpen(!isSuburbExplorerOpen)}
          className={`w-12 h-12 backdrop-blur-md border rounded-2xl flex items-center justify-center shadow-lg active:scale-95 transition-all cursor-pointer group ${
            isSuburbExplorerOpen
              ? 'bg-[#1E40AF] border-[#1E40AF] text-white shadow-[#1E40AF]/25'
              : 'bg-white/95 border-[#E2E8F0] text-[#64748B] shadow-[#94A3B8]/15 hover:bg-white hover:border-[#1E40AF]/30 hover:shadow-xl'
          }`}
          title="Campus Suburbs Explorer"
        >
          <Building className={`w-5 h-5 transition-colors ${isSuburbExplorerOpen ? 'text-white' : 'group-hover:text-[#1E40AF]'}`} strokeWidth={1.5} />
        </button>
        <button
          onClick={toggleProjection}
          className="w-12 h-12 bg-white/95 backdrop-blur-md border border-[#E2E8F0] rounded-2xl flex items-center justify-center shadow-lg shadow-[#94A3B8]/15 hover:bg-white hover:border-[#1E40AF]/30 hover:shadow-xl active:scale-95 transition-all cursor-pointer group"
          title={isGlobe ? "Switch to Flat Map" : "Switch to Globe View"}
        >
          {isGlobe ? <MapIcon className="w-5 h-5 text-[#64748B] group-hover:text-[#1E40AF] transition-colors" strokeWidth={1.5} /> : <Globe className="w-5 h-5 text-[#64748B] group-hover:text-[#1E40AF] transition-colors" strokeWidth={1.5} />}
        </button>
        <button
          onClick={handleTogglePublicToiletLayer}
          className={`w-12 h-12 backdrop-blur-md border rounded-2xl flex items-center justify-center shadow-lg active:scale-95 transition-all cursor-pointer group ${
            layerToilets
              ? 'bg-[#0F766E] border-[#0F766E] text-white shadow-[#0F766E]/25 hover:bg-[#115E59]'
              : 'bg-white/95 border-[#99F6E4] text-[#0F766E] shadow-[#94A3B8]/15 hover:bg-[#F0FDFA] hover:border-[#0F766E]/40 hover:shadow-xl'
          }`}
          title={publicToiletFabLabel}
          aria-label={publicToiletFabLabel}
        >
          <Toilet className={`w-5 h-5 transition-colors ${layerToilets ? 'text-white' : 'text-[#0F766E]'}`} strokeWidth={1.7} />
        </button>
        {isWolliExperience && (
          <button
            onClick={handleOpenWolliWardBoundaries}
            className="min-h-12 w-[156px] rounded-2xl border border-[#99F6E4] bg-white/95 px-3 py-2 text-left shadow-lg shadow-[#94A3B8]/15 backdrop-blur-md transition-all hover:border-[#0F766E]/40 hover:bg-[#F0FDFA] hover:shadow-xl active:scale-95"
            title="Bayside Council Wards & LGA"
            aria-label="Bayside Council Wards & LGA"
          >
            <span className="flex items-center gap-2">
              <Landmark className="h-5 w-5 shrink-0 text-[#0F766E]" strokeWidth={1.7} />
              <span className="min-w-0 text-[11px] font-black leading-tight text-[#0F172A]">
                Wards &amp; LGA
              </span>
            </span>
          </button>
        )}
        <button
          onClick={handleLocateMe}
          className="w-12 h-12 bg-white/95 backdrop-blur-md border border-[#E2E8F0] rounded-2xl flex items-center justify-center shadow-lg shadow-[#94A3B8]/15 hover:bg-white hover:border-[#1E40AF]/30 hover:shadow-xl active:scale-95 transition-all cursor-pointer group"
          title="Go to current location"
        >
          <Crosshair className="w-5 h-5 text-[#64748B] group-hover:text-[#1E40AF] transition-colors" strokeWidth={1.5} />
        </button>
      </div>

      {showTransportNetworkBurst && !showOpalPanel && (
        <>
          <button
            onClick={handleToggleTransportNetworkBurst}
            className="fixed inset-0 z-[1001] cursor-default bg-[rgba(255,255,255,0.28)]"
            style={{
              backdropFilter: 'blur(26px) saturate(1.08)',
              WebkitBackdropFilter: 'blur(26px) saturate(1.08)',
            }}
            aria-label="Close transport network menu"
          />
          <div
            className="pointer-events-none fixed inset-0 z-[1002] flex items-center justify-center px-6"
          >
            <div className="relative h-[420px] w-[420px] max-w-[92vw] max-h-[64vh]">
              {TRANSPORT_NETWORKS.map((network, index) => {
                const position = TRANSPORT_NETWORK_BURST_POSITIONS[network.id];
                return (
                  <button
                    key={network.id}
                    onClick={() => handleSelectTransportNetwork(network.id)}
                    className={`pointer-events-auto absolute left-1/2 top-1/2 z-[1003] flex w-20 flex-col items-center transition-[transform,opacity] duration-500 ${
                      transportBurstExpanded ? 'opacity-100' : 'opacity-0'
                    }`}
                    style={{
                      transform: transportBurstExpanded
                        ? `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px)) scale(1)`
                        : 'translate(-50%, -50%) scale(0.28)',
                      transitionDelay: transportBurstExpanded
                        ? `${index * TRANSPORT_BURST_STAGGER_MS}ms`
                        : `${(TRANSPORT_NETWORKS.length - 1 - index) * TRANSPORT_BURST_STAGGER_MS}ms`,
                    }}
                    title={network.label}
                  >
                    <span className="flex h-[4.6rem] w-[4.6rem] items-center justify-center rounded-full border border-white/90 bg-white/94 px-2.5 shadow-[0_22px_46px_rgba(148,163,184,0.28)] backdrop-blur-xl">
                      <img src={network.logo} alt={network.label} className="max-h-11 max-w-[3.6rem] object-contain" />
                    </span>
                    <span className="mt-2.5 text-xs font-bold uppercase tracking-[0.2em] text-[#0B5E3C] drop-shadow-[0_1px_0_rgba(255,255,255,0.82)]">
                      {network.state}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {showGroceryRetailerBurst && !showOpalPanel && (
        <>
          <button
            onClick={handleToggleGroceryRetailerBurst}
            className="fixed inset-0 z-[1001] cursor-default bg-[rgba(255,255,255,0.28)]"
            style={{
              backdropFilter: 'blur(26px) saturate(1.08)',
              WebkitBackdropFilter: 'blur(26px) saturate(1.08)',
            }}
            aria-label="Close grocery retailer menu"
          />
          <div className="pointer-events-none fixed inset-0 z-[1002] flex items-center justify-center px-6">
            <div className="relative h-[320px] w-[320px] max-w-[86vw] max-h-[48vh]">
              {GROCERY_RETAILERS.map((retailer, index) => {
                const position = GROCERY_BURST_POSITIONS[retailer.id];
                return (
                  <div
                    key={retailer.id}
                    onClick={() => handleSelectGroceryRetailer(retailer.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        handleSelectGroceryRetailer(retailer.id);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    className={`pointer-events-auto absolute left-1/2 top-1/2 z-[1003] m-0 flex w-24 cursor-pointer flex-col items-center bg-transparent p-0 outline-none transition-[transform,opacity] duration-[420ms] ${
                      groceryBurstExpanded ? 'opacity-100' : 'opacity-0'
                    }`}
                    style={{
                      transform: groceryBurstExpanded
                        ? `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px)) scale(1)`
                        : 'translate(-50%, -50%) scale(0.28)',
                      transitionDelay: groceryBurstExpanded
                        ? `${index * GROCERY_BURST_STAGGER_MS}ms`
                        : `${(GROCERY_RETAILERS.length - 1 - index) * GROCERY_BURST_STAGGER_MS}ms`,
                    }}
                    title={retailer.label}
                  >
                    <span className="flex h-[4.8rem] w-[4.8rem] items-center justify-center overflow-hidden rounded-full bg-transparent drop-shadow-[0_20px_38px_rgba(15,23,42,0.18)] transition-transform duration-200 hover:scale-105">
                      <img
                        src={retailer.logo}
                        alt={retailer.label}
                        className="block h-full w-full rounded-full bg-transparent object-cover"
                        style={{
                          clipPath: 'circle(50% at 50% 50%)',
                          WebkitClipPath: 'circle(50% at 50% 50%)',
                        }}
                      />
                    </span>
                    <span className="mt-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#0B5E3C] drop-shadow-[0_1px_0_rgba(255,255,255,0.82)]">
                      {retailer.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* ─── RIGHT SIDE FABs ──────────────────────────────────────── */}
      <div
        className={`absolute bottom-[110px] right-4 z-[1000] flex flex-col items-center gap-3 transition-opacity duration-200 ${hideFloatingMapControls ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
        aria-hidden={hideFloatingMapControls}
      >
        <HoodieHelpTrigger
          stepId="map"
          fab
          title="Open map onboarding video"
        />
        {groceryFab}
        <div className="relative h-12 w-12 overflow-visible">
          <button
            onClick={handleToggleTransportNetworkBurst}
            className={`relative z-[1001] h-12 w-12 backdrop-blur-md border rounded-2xl flex items-center justify-center shadow-lg active:scale-95 transition-all cursor-pointer group overflow-hidden ${
              showTransportNetworkBurst || showOpalPanel
                ? 'bg-[#0B5E3C] border-[#0B5E3C] text-white shadow-[#0B5E3C]/25'
                : 'bg-white/95 border-[#D9F0E0] text-[#64748B] shadow-[#94A3B8]/15 hover:bg-white hover:border-[#71BE45]/40 hover:shadow-xl'
            }`}
            title="Public Transport Planner"
          >
            <Train className={`w-6 h-6 transition-transform ${showTransportNetworkBurst || showOpalPanel ? 'scale-105' : 'group-hover:scale-105'}`} strokeWidth={1.8} />
          </button>
        </div>
        <button
          onClick={() => {
            setShowTransportNetworkBurst(false);
            navigate('/fuel', {
              state: userLocation
                ? {
                    initialFuelTarget: {
                      lat: userLocation.lat,
                      lng: userLocation.lng,
                      label: 'Current location',
                    },
                  }
                : undefined,
            });
          }}
          className="relative w-12 h-12 backdrop-blur-md border rounded-2xl flex items-center justify-center shadow-lg active:scale-95 transition-all cursor-pointer group bg-white/95 border-[#E2E8F0] text-[#64748B] shadow-[#94A3B8]/15 hover:bg-white hover:border-[#EE811A]/30 hover:shadow-xl"
          title="Fuel Finder"
        >
          <Fuel className="w-5 h-5 transition-colors text-[#64748B] group-hover:text-[#EE811A]" strokeWidth={1.5} />
        </button>
        <button
          onClick={() => {
            setShowTransportNetworkBurst(false);
            setShowLayers(!showLayers);
          }}
          className={`relative w-12 h-12 backdrop-blur-md border rounded-2xl flex items-center justify-center shadow-lg active:scale-95 transition-all cursor-pointer group ${
            showLayers
              ? 'bg-[#0F172A] border-[#0F172A] text-white shadow-[#0F172A]/25'
              : 'bg-white/95 border-[#E2E8F0] text-[#64748B] shadow-[#94A3B8]/15 hover:bg-white hover:border-[#1E40AF]/30 hover:shadow-xl'
          }`}
          title="Map Layers"
        >
          <Layers className={`w-5 h-5 transition-colors ${showLayers ? 'text-white' : 'text-[#64748B] group-hover:text-[#1E40AF]'}`} strokeWidth={1.5} />
          {activeLayerCount < TOTAL_LAYERS && (
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#EE811A] text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-sm">
              {activeLayerCount}
            </span>
          )}
        </button>
        <button
          onClick={() => {
            setShowTransportNetworkBurst(false);
            onNewReport();
          }}
          className="w-12 h-12 bg-[#EE811A] text-white rounded-2xl flex items-center justify-center shadow-lg shadow-[#EE811A]/30 hover:bg-[#D97316] hover:shadow-xl active:scale-95 transition-all hover:scale-105 cursor-pointer"
          title="Report an issue"
        >
          <Plus className="w-6 h-6" strokeWidth={2} />
        </button>
      </div>

      {showOpalPanel && (
        <div className="fixed inset-0 z-[1002] bg-[#F1F7F3]">
          <div className="mx-auto flex h-[100dvh] w-full max-w-md flex-col overflow-hidden bg-[#F6FBF7] md:border-x md:border-[#D9F0E0] md:shadow-2xl md:shadow-[#0F172A]/20">
            <div
              className="shrink-0 border-b border-[#D9E4DC] bg-white/96 px-4 py-3 backdrop-blur-md"
              style={{ paddingTop: 'calc(var(--native-safe-area-top) + 12px)' }}
            >
              <div className="flex items-center justify-between gap-3">
                {opalSelectedTrip ? (
                  <button
                    onClick={() => {
                      setOpalSelectedTrip(null);
                      opalScrollContainerRef.current?.scrollTo({ top: 0, behavior: 'auto' });
                    }}
                    className="flex items-center gap-2 text-[#64748B] hover:text-[#0F172A] transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4" strokeWidth={1.6} />
                    <span className="text-xs tracking-wide font-medium">Trips</span>
                  </button>
                ) : (
                  <div className="flex min-w-0 items-center gap-2">
                    <Train className="h-4.5 w-4.5 shrink-0 text-[#0B5E3C]" strokeWidth={1.7} />
                    <span className="truncate text-xs font-bold tracking-wide text-[#0F172A]">
                      {inAppTransportPlanning ? 'Public Transport' : 'Transit Directions'}
                    </span>
                  </div>
                )}
                <span className="min-w-0 flex-1 truncate text-center text-[11px] font-medium tracking-wide text-[#64748B]">
                  {activeTransportNetwork?.label || getTransportProviderName(opalEligibility?.provider)}
                </span>
                <HoodieHelpTrigger
                  stepId="trip-planner"
                  className="h-9 w-9 shrink-0 rounded-xl border-[#D9E4DC] bg-white/96"
                  title="Open trip planner onboarding video"
                />
                <button
                  onClick={handleCloseOpalPanel}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[#94A3B8] hover:bg-[#F8FAFC] hover:text-[#64748B] cursor-pointer"
                >
                  <X className="h-4.5 w-4.5" strokeWidth={1.8} />
                </button>
              </div>
            </div>

            <div ref={opalScrollContainerRef} className="flex-1 overflow-y-auto px-4">
              {!opalSelectedTrip ? (
                <div className="space-y-4 py-4">
                  <section className="rounded-[30px] border border-[#D9F0E0] bg-[#F7FBF8] p-4 shadow-sm shadow-[#D9F0E0]/40">
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <p className="text-[10px] tracking-[0.24em] uppercase text-[#8AA394] font-bold">From</p>
                        <div className="relative group">
                          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                            <MapPin className="text-[#8AA394] group-focus-within:text-[#0B5E3C] transition-colors" size={18} />
                          </div>
                          <input
                            type="text"
                            value={opalOriginQuery}
                            onChange={(e) => {
                              setOpalOriginQuery(e.target.value);
                              setOpalOrigin(null);
                              setOpalActiveField('origin');
                              resetOpalPlanner();
                            }}
                            onFocus={() => setOpalActiveField('origin')}
                            placeholder="Search for a building or suburb..."
                            className="h-14 w-full rounded-[22px] border border-[#D9F0E0] bg-white pl-12 pr-4 text-[16px] text-[#0F172A] shadow-sm outline-none transition-all placeholder:text-[#94A3B8] focus:border-[#71BE45]/40 focus:ring-2 focus:ring-[#71BE45]/20"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <p className="text-[10px] tracking-[0.24em] uppercase text-[#8AA394] font-bold">To</p>
                        <div className="relative group">
                          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                            <Search className="text-[#8AA394] group-focus-within:text-[#0B5E3C] transition-colors" size={18} />
                          </div>
                          <input
                            type="text"
                            value={opalDestinationQuery}
                            onChange={(e) => {
                              setOpalDestinationQuery(e.target.value);
                              setOpalDestination(null);
                              setOpalActiveField('destination');
                              resetOpalPlanner();
                            }}
                            onFocus={() => setOpalActiveField('destination')}
                            placeholder="Search for a building or suburb..."
                            className="h-14 w-full rounded-[22px] border border-[#D9F0E0] bg-white pl-12 pr-4 text-[16px] text-[#0F172A] shadow-sm outline-none transition-all placeholder:text-[#94A3B8] focus:border-[#71BE45]/40 focus:ring-2 focus:ring-[#71BE45]/20"
                          />
                        </div>
                      </div>

                      {opalSearchLoading && (
                        <div className="rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3 text-[12px] text-[#64748B]">
                          Searching places and transport stops...
                        </div>
                      )}

                      {opalSuggestions.length > 0 && (
                        <ul className="max-h-[38vh] overflow-y-auto rounded-[24px] border border-[#E2E8F0] bg-white shadow-sm">
                          {opalSuggestions.map((suggestion) => (
                            <li key={getPlannerSuggestionKey(suggestion)}>
                              <button
                                onClick={() => handleSelectOpalSuggestion(suggestion)}
                                className="flex w-full items-start gap-3 border-b border-[#F1F5F9] px-4 py-3 text-left transition-colors last:border-none hover:bg-[#F8FAFC] cursor-pointer"
                              >
                                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#1D9A49]" strokeWidth={1.5} />
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium text-[#0F172A]">{getPlannerSuggestionTitle(suggestion)}</p>
                                  <p className="truncate text-[11px] text-[#94A3B8]">{getPlannerSuggestionSubtitle(suggestion)}</p>
                                </div>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}

                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => void handleUseCurrentLocationOpal()}
                          className="inline-flex items-center gap-2 rounded-full border border-[#D9F0E0] bg-white px-4 py-2.5 text-[13px] font-medium text-[#0B5E3C] hover:bg-[#F2FBF5] cursor-pointer"
                        >
                          <Crosshair className="h-4 w-4" strokeWidth={1.8} />
                          Current location
                        </button>
                        <button
                          onClick={() => void handleUseHomeQuickAction()}
                          disabled={opalHomeLoading || profileContextLoading}
                          className="inline-flex items-center gap-2 rounded-full border border-[#D9F0E0] bg-white px-4 py-2.5 text-[13px] font-medium text-[#0B5E3C] hover:bg-[#F2FBF5] disabled:opacity-50 cursor-pointer"
                        >
                          <Home className="h-4 w-4" strokeWidth={1.8} />
                          {profileContextLoading ? 'Loading home...' : opalHomeLoading ? 'Resolving home...' : 'Home'}
                        </button>
                        <button
                          onClick={() => void handleUseWorkQuickAction()}
                          disabled={opalWorkLoading || profileContextLoading}
                          className="inline-flex items-center gap-2 rounded-full border border-[#D9F0E0] bg-white px-4 py-2.5 text-[13px] font-medium text-[#0B5E3C] hover:bg-[#F2FBF5] disabled:opacity-50 cursor-pointer"
                        >
                          <Briefcase className="h-4 w-4" strokeWidth={1.8} />
                          {profileContextLoading ? 'Loading work...' : opalWorkLoading ? 'Resolving work...' : 'Work'}
                        </button>
                        {!profileContextLoading && !currentHome && (
                          <button
                            onClick={() => { navigate('/profile?action=add-address'); }}
                            className="inline-flex items-center gap-2 rounded-full border border-dashed border-[#CBD5E1] bg-white px-4 py-2.5 text-[13px] font-medium text-[#64748B] hover:bg-[#F8FAFC] cursor-pointer"
                          >
                            <ChevronRight className="h-4 w-4" strokeWidth={1.8} />
                            Add Home in Profile
                          </button>
                        )}
                        {!profileContextLoading && !hasSavedWorkDestination && (
                          <button
                            onClick={() => { navigate('/profile?action=add-work'); }}
                            className="inline-flex items-center gap-2 rounded-full border border-dashed border-[#CBD5E1] bg-white px-4 py-2.5 text-[13px] font-medium text-[#64748B] hover:bg-[#F8FAFC] cursor-pointer"
                          >
                            <ChevronRight className="h-4 w-4" strokeWidth={1.8} />
                            Add Work in Profile
                          </button>
                        )}
                      </div>
                    </div>
                  </section>

                  <section className="rounded-[30px] border border-[#E2E8F0] bg-white p-4 shadow-sm">
                    <div className="flex flex-wrap gap-2">
                      {[
                        { id: 'leave_now', label: 'Leave now' },
                        { id: 'depart_at', label: 'Depart at' },
                        { id: 'arrive_by', label: 'Arrive by' },
                      ].map((option) => {
                        const active = opalWhenMode === option.id;
                        return (
                          <button
                            key={option.id}
                            onClick={() => {
                              setOpalWhenMode(option.id as 'leave_now' | 'depart_at' | 'arrive_by');
                              resetOpalPlanner();
                            }}
                            className={`rounded-full border px-4 py-2 text-[13px] font-medium transition-colors cursor-pointer ${
                              active
                                ? 'border-[#0B5E3C] bg-[#F2FBF5] text-[#0B5E3C]'
                                : 'border-[#E2E8F0] bg-white text-[#64748B] hover:bg-[#F8FAFC]'
                            }`}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>

                    {opalWhenMode !== 'leave_now' && (
                      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <label className="space-y-1.5">
                          <span className="text-[10px] tracking-[0.24em] uppercase text-[#8AA394] font-bold">Date</span>
                          <input
                            type="date"
                            value={opalDate}
                            onChange={(e) => {
                              setOpalDate(e.target.value);
                              resetOpalPlanner();
                            }}
                            className="h-12 w-full rounded-[20px] border border-[#E2E8F0] bg-[#F8FAFC] px-3 text-sm text-[#0F172A] outline-none"
                          />
                        </label>
                        <label className="space-y-1.5">
                          <span className="text-[10px] tracking-[0.24em] uppercase text-[#8AA394] font-bold">Time</span>
                          <input
                            type="time"
                            value={opalTime}
                            onChange={(e) => {
                              setOpalTime(e.target.value);
                              resetOpalPlanner();
                            }}
                            className="h-12 w-full rounded-[20px] border border-[#E2E8F0] bg-[#F8FAFC] px-3 text-sm text-[#0F172A] outline-none"
                          />
                        </label>
                      </div>
                    )}

                    <div className="mt-4">
                      <p className="mb-2 text-[10px] tracking-[0.24em] uppercase text-[#8AA394] font-bold">Transport filters</p>
                      <div className="flex flex-wrap gap-2">
                        {availableOpalModeOptions.map((option) => {
                          const active = opalSelectedModes.includes(option.id);
                          return (
                            <button
                              key={option.id}
                              onClick={() => toggleOpalMode(option.id)}
                              className={`rounded-full border px-4 py-2 text-[13px] font-medium transition-colors cursor-pointer ${
                                active
                                  ? 'border-[#0B5E3C] bg-[#F2FBF5] text-[#0B5E3C]'
                                  : 'border-[#E2E8F0] bg-white text-[#64748B] hover:bg-[#F8FAFC]'
                              }`}
                            >
                              {option.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        if (!transportSupportsWheelchairFilter) return;
                        setOpalWheelchairOnly((current) => !current);
                        resetOpalPlanner();
                      }}
                      disabled={!transportSupportsWheelchairFilter}
                      className={`mt-4 flex w-full items-center justify-between rounded-[22px] border px-4 py-3 text-left transition-colors ${
                        opalWheelchairOnly ? 'border-[#0B5E3C] bg-[#F2FBF5]' : 'border-[#E2E8F0] bg-[#F8FAFC]'
                      } ${transportSupportsWheelchairFilter ? 'cursor-pointer' : 'cursor-not-allowed opacity-70'}`}
                    >
                      <span className="flex items-center gap-2 text-[14px] font-medium text-[#0F172A]">
                        <Accessibility className="h-4 w-4 text-[#0B5E3C]" strokeWidth={1.8} />
                        Wheelchair accessible only
                      </span>
                      <span className={`text-[13px] font-semibold ${opalWheelchairOnly ? 'text-[#0B5E3C]' : 'text-[#94A3B8]'}`}>
                        {transportSupportsWheelchairFilter ? (opalWheelchairOnly ? 'On' : 'Off') : 'Unavailable'}
                      </span>
                    </button>

                    {!transportSupportsWheelchairFilter && (
                      <p className="mt-2 text-[12px] leading-relaxed text-[#64748B]">
                        Accessibility filtering is not available for this schedule-only network yet.
                      </p>
                    )}

                    {!inAppTransportPlanning && (
                      <p className="mt-4 rounded-[20px] bg-[#F8FAFC] px-4 py-3 text-[12px] leading-relaxed text-[#64748B]">
                        {`${activeTransportNetwork?.label} currently opens transit directions in Maps from your chosen origin to destination.`}
                      </p>
                    )}

                    <button
                      onClick={() => void runOpalPlanner()}
                      disabled={opalTripsLoading}
                      className="mt-4 h-14 w-full rounded-[24px] bg-[#0B5E3C] text-[18px] font-semibold text-white shadow-xl shadow-[#0B5E3C]/20 hover:bg-[#0A5134] disabled:opacity-60 cursor-pointer"
                    >
                      {opalTripsLoading
                        ? 'Planning trip...'
                        : inAppTransportPlanning
                          ? 'Find trips'
                          : 'Open transit directions'}
                    </button>
                  </section>

                  <div ref={opalResultsRef} />
                  {opalInfoMessage && (
                    <div className="rounded-[24px] border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-4 text-sm leading-relaxed text-[#64748B]">
                      {opalInfoMessage}
                    </div>
                  )}
                  {opalTripError && (
                    <div className="rounded-[24px] border border-[#FECACA] bg-[#FEF2F2] px-4 py-4 text-sm leading-relaxed text-[#991B1B]">
                      {opalTripError}
                    </div>
                  )}
                  {opalProviderNotice && (
                    <div className="rounded-[24px] border border-[#FDE68A] bg-[#FFFBEB] px-4 py-4 text-sm leading-relaxed text-[#92400E]">
                      {opalProviderNotice}
                    </div>
                  )}

                  {!opalTripError && !opalTripsLoading && opalTrips.length === 0 && (
                    <div className="rounded-[24px] border border-dashed border-[#CBD5E1] bg-white px-4 py-5 text-[15px] leading-relaxed text-[#64748B]">
                      {inAppTransportPlanning
                        ? `Plan routes with ${activeTransportNetwork?.label || 'public transport'} data, then drill into a leg-by-leg timeline before you head out.`
                        : `Use ${activeTransportNetwork?.label || 'your selected network'} to open transit directions in Maps anywhere in Australia.`}
                    </div>
                  )}

                  {opalTrips.map((trip) => {
                    const tripDuration = getOpalTripDurationMinutes(trip);
                    const primaryTransitLeg = trip.legs.find((leg) => leg.mode !== 'walk');
                    return (
                      <button
                        key={trip.id}
                        onClick={() => void handleSelectOpalTrip(trip)}
                        className="w-full rounded-[30px] border border-[#D9F0E0] bg-white px-4 py-4 text-left shadow-sm transition-all hover:shadow-md cursor-pointer"
                      >
                        <div className="grid grid-cols-[68px,1fr] gap-4 sm:grid-cols-[76px,1fr]">
                          <div className="shrink-0 text-[#0F172A]">
                            <p className="text-[40px] font-semibold leading-none">{tripDuration}</p>
                            <p className="mt-1 text-[13px] uppercase tracking-[0.16em] text-[#64748B]">min</p>
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-[20px] font-semibold text-[#0F172A]">
                                  {formatOpalTimeLabel(trip.departureTime)} <span className="px-1 text-[#94A3B8]">-</span> {formatOpalTimeLabel(trip.arrivalTime)}
                                </p>
                                <p className="mt-1 text-[13px] leading-relaxed text-[#64748B]">
                                  {trip.summary || 'Multi-leg public transport route'}
                                </p>
                              </div>
                              <div className="shrink-0 text-right">
                                <p className="text-[12px] font-semibold text-[#0B5E3C]">
                                  {trip.transferCount === 0 ? 'Direct' : `${trip.transferCount} transfer${trip.transferCount === 1 ? '' : 's'}`}
                                </p>
                                {trip.fareText && <p className="mt-1 text-[12px] text-[#64748B]">{trip.fareText}</p>}
                              </div>
                            </div>

                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              {trip.legModes.map((mode) => {
                                const presentation = getOpalModePresentation(mode);
                                return (
                                  <span key={`${trip.id}-${mode}`} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${presentation.tint}`}>
                                    {renderOpalModeIcon(mode)}
                                    {presentation.label}
                                  </span>
                                );
                              })}
                              {trip.hasRealtime && (
                                <span className="inline-flex items-center rounded-full bg-[#EFF6FF] px-2.5 py-1 text-[11px] font-medium text-[#1E40AF]">
                                  Live
                                </span>
                              )}
                            </div>

                            {primaryTransitLeg && (
                              <p className="mt-3 text-[12px] leading-relaxed text-[#64748B]">
                                {primaryTransitLeg.realtime ? 'Live timing' : 'Scheduled'} from {primaryTransitLeg.originPlatform || primaryTransitLeg.originName}
                              </p>
                            )}

                            {trip.alerts[0] && (
                              <div className="mt-3 rounded-2xl border border-[#FDE68A] bg-[#FFFBEB] px-3 py-2 text-[11px] leading-relaxed text-[#92400E]">
                                {trip.alerts[0].title}
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}

                  {activeTransportProvider === 'transport_qld' && (
                    <>
                      <section className="rounded-[30px] border border-[#E2E8F0] bg-white px-4 py-4 shadow-sm">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-[10px] tracking-[0.24em] uppercase text-[#8AA394] font-bold">Queensland service updates</p>
                            <p className="mt-1 text-[12px] text-[#64748B]">Live RSS updates from Translink across bus, train, ferry, and tram.</p>
                          </div>
                          <Info className="h-4 w-4 text-[#8AA394]" strokeWidth={1.8} />
                        </div>
                        <div className="mt-3 space-y-2.5">
                          {qldStatusLoading && <p className="text-[12px] text-[#64748B]">Loading service updates...</p>}
                          {!qldStatusLoading && qldStatusItems.length === 0 && (
                            <p className="text-[12px] text-[#64748B]">No Translink service updates are available right now.</p>
                          )}
                          {qldStatusItems.map((item) => (
                            <a
                              key={item.id}
                              href={item.url || undefined}
                              target={item.url ? '_blank' : undefined}
                              rel={item.url ? 'noopener noreferrer' : undefined}
                              className="block rounded-[22px] bg-[#F8FAFC] px-3 py-3 transition-colors hover:bg-[#F1F5F9]"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-[13px] font-semibold text-[#0F172A]">{item.title}</p>
                                  <p className="mt-1 text-[12px] text-[#64748B]">
                                    {[getOpalModePresentation(item.mode).label, item.region].filter(Boolean).join(' · ') || 'Service update'}
                                  </p>
                                </div>
                                <span className="shrink-0 rounded-full bg-[#FFF7ED] px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#C2410C]">
                                  {item.priority}
                                </span>
                              </div>
                              {item.description && <p className="mt-2 text-[12px] leading-relaxed text-[#64748B]">{item.description}</p>}
                            </a>
                          ))}
                        </div>
                      </section>

                      <section className="rounded-[30px] border border-[#E2E8F0] bg-white px-4 py-4 shadow-sm">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-[10px] tracking-[0.24em] uppercase text-[#8AA394] font-bold">Nearby go card retailers</p>
                            <p className="mt-1 text-[12px] text-[#64748B]">Closest top up and purchase points near your trip.</p>
                          </div>
                          <ShoppingBasket className="h-4 w-4 text-[#8AA394]" strokeWidth={1.8} />
                        </div>
                        <div className="mt-3 space-y-2.5">
                          {qldRetailersLoading && <p className="text-[12px] text-[#64748B]">Loading retailers...</p>}
                          {!qldRetailersLoading && qldRetailers.length === 0 && (
                            <p className="text-[12px] text-[#64748B]">No nearby go card retailers were found right now.</p>
                          )}
                          {qldRetailers.map((retailer) => (
                            <a
                              key={retailer.id}
                              href={retailer.url || undefined}
                              target={retailer.url ? '_blank' : undefined}
                              rel={retailer.url ? 'noopener noreferrer' : undefined}
                              className="block rounded-[22px] bg-[#F8FAFC] px-3 py-3 transition-colors hover:bg-[#F1F5F9]"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-[13px] font-semibold text-[#0F172A]">{retailer.name}</p>
                                  <p className="mt-1 text-[12px] leading-relaxed text-[#64748B]">{retailer.address}</p>
                                </div>
                                <span className="shrink-0 text-[11px] font-semibold text-[#0B5E3C]">
                                  {formatOpalDistanceLabel(retailer.distanceKm ?? null) || 'Retailer'}
                                </span>
                              </div>
                              {retailer.capabilities.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {retailer.capabilities.slice(0, 3).map((capability) => (
                                    <span key={`${retailer.id}-${capability}`} className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-[#475569]">
                                      {capability}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </a>
                          ))}
                        </div>
                      </section>
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-4 py-4">
                  <section className="rounded-[30px] border border-[#D9F0E0] bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 text-[#0F172A]">
                          {renderOpalModeIcon(opalSelectedTrip.legs.find((leg) => leg.mode !== 'walk')?.mode || 'train', 'h-5 w-5')}
                          <p className="text-[42px] font-semibold leading-none">{getOpalTripDurationMinutes(opalSelectedTrip)} min</p>
                        </div>
                        <p className="mt-1 text-[18px] font-medium text-[#64748B]">
                          Arrive {formatOpalTimeLabel(opalSelectedTrip.arrivalTime)}
                        </p>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          {opalSelectedTrip.legs.map((leg) => {
                            const presentation = getOpalModePresentation(leg.mode);
                            const legDuration = getOpalLegDurationMinutes(leg);
                            if (leg.mode === 'walk') {
                              return (
                                <span
                                  key={`selected-walk-${leg.id}`}
                                  className="inline-flex items-center gap-1 rounded-[12px] bg-[#F8FAFC] px-2.5 py-1 text-[12px] font-medium text-[#475569]"
                                >
                                  {renderOpalModeIcon(leg.mode)}
                                  {legDuration}
                                </span>
                              );
                            }
                            return (
                              <span
                                key={`selected-line-${leg.id}`}
                                className={`inline-flex items-center gap-1 rounded-[12px] px-2.5 py-1 text-[12px] font-medium ${presentation.tint}`}
                              >
                                {renderOpalModeIcon(leg.mode)}
                                {leg.lineNumber || leg.lineName || presentation.label}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-[16px] font-semibold text-[#0F172A]">
                          {formatOpalTimeLabel(opalSelectedTrip.departureTime)}
                        </p>
                        <p className="mt-1 text-[12px] text-[#64748B]">
                          {opalSelectedTrip.transferCount === 0 ? 'Direct' : `${opalSelectedTrip.transferCount} transfer${opalSelectedTrip.transferCount === 1 ? '' : 's'}`}
                        </p>
                        {opalSelectedTrip.fareText && <p className="mt-1 text-[12px] text-[#64748B]">{opalSelectedTrip.fareText}</p>}
                      </div>
                    </div>
                    <p className="mt-3 text-[14px] leading-relaxed text-[#64748B]">
                      {opalSelectedTrip.summary || 'Scheduled multi-leg public transport route'}
                    </p>
                  </section>

                  <section className="rounded-[30px] border border-[#E2E8F0] bg-white p-4 shadow-sm">
                    <div className="relative pl-9">
                      <div className="absolute bottom-3 left-[15px] top-3 w-px bg-[#D8E3DC]" />
                      <div className="space-y-4">
                        <div className="relative">
                          <div className="absolute left-[-32px] top-2 h-4 w-4 rounded-full border-[3px] border-[#2563EB] bg-white" />
                          <div className="rounded-[22px] bg-[#F8FAFC] px-4 py-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-[#8AA394]">Start</p>
                                <p className="mt-1 text-[18px] font-semibold text-[#0F172A]">{opalOrigin?.name || 'Current location'}</p>
                                <p className="mt-1 text-[12px] text-[#64748B]">{opalOrigin?.subtitle || opalOriginQuery}</p>
                              </div>
                              <p className="shrink-0 text-[16px] font-semibold text-[#0F172A]">{formatOpalTimeLabel(opalSelectedTrip.departureTime)}</p>
                            </div>
                          </div>
                        </div>

                        {opalSelectedTrip.legs.map((leg) => {
                          const presentation = getOpalModePresentation(leg.mode);
                          const legDuration = getOpalLegDurationMinutes(leg);
                          const readableLegSteps = leg.mode === 'walk' ? [] : getReadableOpalPathSteps(leg.pathDescriptions);
                          const walkDistance = formatOpalDistanceLabel(leg.distanceKm);
                          return (
                            <div key={leg.id} className="relative">
                              <div className={`absolute left-[-39px] top-4 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white shadow-sm ${presentation.tint}`}>
                                {renderOpalModeIcon(leg.mode, 'w-4 h-4')}
                              </div>
                              {leg.mode === 'walk' ? (
                                <div className="py-1">
                                  <div className="flex items-start justify-between gap-3 px-1">
                                    <div className="min-w-0">
                                      <p className="text-[24px] leading-tight font-semibold text-[#0F172A]">
                                        Walk {legDuration} min{walkDistance ? ` (${walkDistance})` : ''}
                                      </p>
                                      <p className="mt-1 text-[13px] leading-relaxed text-[#64748B]">
                                        To {leg.destinationName}
                                      </p>
                                      {readableLegSteps[0] && (
                                        <p className="mt-1 text-[12px] text-[#94A3B8]">{readableLegSteps[0]}</p>
                                      )}
                                    </div>
                                    <p className="shrink-0 text-[16px] font-semibold text-[#0F172A]">
                                      {formatOpalTimeLabel(leg.departureTimeEstimated || leg.departureTimePlanned)}
                                    </p>
                                  </div>
                                </div>
                              ) : (
                                <div className="rounded-[26px] border border-[#E2E8F0] bg-white px-4 py-4 shadow-sm">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${presentation.tint}`}>
                                        {renderOpalModeIcon(leg.mode)}
                                        {presentation.label}
                                      </span>
                                      <div className="mt-2 flex flex-wrap items-baseline gap-2">
                                        <p className="text-[30px] leading-none font-semibold text-[#0F172A]">
                                          {leg.lineNumber || leg.modeLabel}
                                        </p>
                                        <p className="text-[14px] text-[#64748B]">{leg.destinationLabel || leg.destinationName}</p>
                                      </div>
                                    </div>
                                    <div className="shrink-0 text-right">
                                      <p className="text-[16px] font-semibold text-[#0F172A]">
                                        {formatOpalTimeLabel(leg.departureTimeEstimated || leg.departureTimePlanned)}
                                      </p>
                                      <p className="mt-1 text-[12px] text-[#64748B]">{legDuration} min</p>
                                    </div>
                                  </div>

                                  <div className="mt-4 space-y-3">
                                    <div className="flex items-start justify-between gap-3 rounded-[22px] bg-[#F8FAFC] px-3 py-3">
                                      <div className="min-w-0">
                                        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#94A3B8]">From</p>
                                        <p className="mt-1 text-[15px] font-medium text-[#0F172A]">{leg.originName}</p>
                                        <p className="mt-0.5 text-[12px] text-[#64748B]">{leg.originPlatform || leg.originSubtitle || 'Origin stop'}</p>
                                      </div>
                                      <p className="shrink-0 text-[14px] font-semibold text-[#0F172A]">
                                        {formatOpalTimeLabel(leg.departureTimeEstimated || leg.departureTimePlanned)}
                                      </p>
                                    </div>

                                    <div className="flex items-start justify-between gap-3 rounded-[22px] bg-[#F8FAFC] px-3 py-3">
                                      <div className="min-w-0">
                                        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#94A3B8]">To</p>
                                        <p className="mt-1 text-[15px] font-medium text-[#0F172A]">{leg.destinationName}</p>
                                        <p className="mt-0.5 text-[12px] text-[#64748B]">{leg.destinationPlatform || leg.destinationSubtitle || 'Destination stop'}</p>
                                      </div>
                                      <p className="shrink-0 text-[14px] font-semibold text-[#0F172A]">
                                        {formatOpalTimeLabel(leg.arrivalTimeEstimated || leg.arrivalTimePlanned)}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="mt-3 flex flex-wrap gap-2">
                                    {leg.realtime && (
                                      <span className="inline-flex items-center rounded-full bg-[#EFF6FF] px-2.5 py-1 text-[11px] font-medium text-[#1E40AF]">
                                        Live timing
                                      </span>
                                    )}
                                    {leg.accessible && (
                                      <span className="inline-flex items-center rounded-full bg-[#F2FBF5] px-2.5 py-1 text-[11px] font-medium text-[#0B5E3C]">
                                        Accessible
                                      </span>
                                    )}
                                    {walkDistance && (
                                      <span className="inline-flex items-center rounded-full bg-[#F8FAFC] px-2.5 py-1 text-[11px] font-medium text-[#64748B]">
                                        {walkDistance}
                                      </span>
                                    )}
                                  </div>

                                  {readableLegSteps.length > 0 && (
                                    <div className="mt-3 rounded-[22px] bg-[#F8FAFC] px-3 py-3">
                                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#94A3B8]">Steps</p>
                                      <div className="mt-2 space-y-1.5">
                                        {readableLegSteps.map((step, index) => (
                                          <p key={`${leg.id}-step-${index}`} className="text-[12px] leading-relaxed text-[#64748B]">
                                            {index + 1}. {step}
                                          </p>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {leg.alerts[0] && (
                                    <div className="mt-3 rounded-[22px] border border-[#FDE68A] bg-[#FFFBEB] px-3 py-3 text-[12px] leading-relaxed text-[#92400E]">
                                      {leg.alerts[0].title}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}

                        <div className="relative">
                          <div className="absolute left-[-35px] top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#DC2626] text-white shadow-sm">
                            <MapPin className="h-3.5 w-3.5" strokeWidth={2} />
                          </div>
                          <div className="rounded-[22px] bg-[#F8FAFC] px-4 py-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-[#8AA394]">Arrive</p>
                                <p className="mt-1 text-[18px] font-semibold text-[#0F172A]">{opalDestination?.name || 'Destination'}</p>
                                <p className="mt-1 text-[12px] text-[#64748B]">{opalDestination?.subtitle || opalDestinationQuery}</p>
                              </div>
                              <p className="shrink-0 text-[16px] font-semibold text-[#0F172A]">{formatOpalTimeLabel(opalSelectedTrip.arrivalTime)}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="rounded-[30px] border border-[#E2E8F0] bg-white px-4 py-4 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] tracking-[0.24em] uppercase text-[#8AA394] font-bold">
                          {activeTransportProvider === 'transport_wa' || activeTransportProvider === 'transport_tas' || activeTransportProvider === 'transport_nt'
                            ? 'Scheduled departures'
                            : 'Live departures'}
                        </p>
                        <p className="mt-1 text-[12px] text-[#64748B]">
                          {activeTransportProvider === 'transport_wa' || activeTransportProvider === 'transport_tas' || activeTransportProvider === 'transport_nt'
                            ? 'Scheduled upcoming services for the first transit leg.'
                            : 'Upcoming services for the first transit leg.'}
                        </p>
                      </div>
                      <Clock3 className="h-4 w-4 text-[#8AA394]" strokeWidth={1.8} />
                    </div>
                    <div className="mt-3 space-y-2.5">
                      {opalDeparturesLoading && <p className="text-[12px] text-[#64748B]">Loading departures...</p>}
                      {!opalDeparturesLoading && opalDepartures.length === 0 && (
                        <p className="text-[12px] text-[#64748B]">
                          {activeTransportProvider === 'transport_wa' || activeTransportProvider === 'transport_tas' || activeTransportProvider === 'transport_nt'
                            ? 'No scheduled departures are available for this stop right now.'
                            : 'No live departures are available for this stop right now.'}
                        </p>
                      )}
                      {opalDepartures.map((departure) => (
                        <div key={departure.id} className="rounded-[22px] bg-[#F8FAFC] px-3 py-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-[14px] font-semibold text-[#0F172A]">{departure.lineNumber || departure.lineName || departure.modeLabel}</p>
                              <p className="mt-1 text-[12px] text-[#64748B]">{departure.destination}</p>
                            </div>
                            <div className="shrink-0 text-right">
                              <p className="text-[13px] font-semibold text-[#0F172A]">
                                {formatOpalTimeLabel(departure.departureTimeEstimated || departure.departureTimePlanned)}
                              </p>
                              <p className="mt-1 text-[11px] text-[#94A3B8]">{departure.platformName || departure.stopName}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  {opalSelectedTrip.alerts.length > 0 && (
                    <section className="rounded-[30px] border border-[#FDE68A] bg-[#FFFBEB] px-4 py-4 shadow-sm">
                      <p className="text-[10px] tracking-[0.24em] uppercase text-[#A16207] font-bold">Service alerts</p>
                      <div className="mt-2 space-y-2">
                        {opalSelectedTrip.alerts.slice(0, 3).map((alert: TransportAlert) => (
                          <div key={alert.id} className="text-[12px] leading-relaxed text-[#92400E]">
                            <span className="font-semibold">{alert.title}</span>
                            {alert.content ? ` ${alert.content}` : ''}
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {activeTransportProvider === 'transport_qld' && qldStatusItems.length > 0 && (
                    <section className="rounded-[30px] border border-[#E2E8F0] bg-white px-4 py-4 shadow-sm">
                      <p className="text-[10px] tracking-[0.24em] uppercase text-[#8AA394] font-bold">Queensland service updates</p>
                      <div className="mt-2 space-y-2">
                        {qldStatusItems.slice(0, 3).map((item) => (
                          <div key={item.id} className="rounded-[22px] bg-[#F8FAFC] px-3 py-3">
                            <p className="text-[12px] font-semibold text-[#0F172A]">{item.title}</p>
                            <p className="mt-1 text-[12px] leading-relaxed text-[#64748B]">{item.description || [getOpalModePresentation(item.mode).label, item.region].filter(Boolean).join(' · ')}</p>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {activeTransportProvider === 'transport_qld' && qldRetailers.length > 0 && (
                    <section className="rounded-[30px] border border-[#E2E8F0] bg-white px-4 py-4 shadow-sm">
                      <p className="text-[10px] tracking-[0.24em] uppercase text-[#8AA394] font-bold">Nearby go card retailers</p>
                      <div className="mt-2 space-y-2">
                        {qldRetailers.slice(0, 3).map((retailer) => (
                          <div key={retailer.id} className="rounded-[22px] bg-[#F8FAFC] px-3 py-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-[12px] font-semibold text-[#0F172A]">{retailer.name}</p>
                                <p className="mt-1 text-[12px] leading-relaxed text-[#64748B]">{retailer.address}</p>
                              </div>
                              <span className="shrink-0 text-[11px] font-semibold text-[#0B5E3C]">
                                {formatOpalDistanceLabel(retailer.distanceKm ?? null) || 'Retailer'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}
                </div>
              )}
            </div>

            <div
              className="shrink-0 border-t border-[#D9E4DC] bg-white/96 px-4 pt-3 backdrop-blur-md"
              style={{ paddingBottom: 'calc(var(--native-safe-area-bottom) + 12px)' }}
            >
              {opalSelectedTrip && (
                <button
                  onClick={handleOpenOpalInMaps}
                  className="mb-3 h-12 w-full rounded-[22px] bg-[#0B5E3C] text-sm font-semibold text-white shadow-lg shadow-[#0B5E3C]/20 hover:bg-[#0A5134] cursor-pointer"
                >
                  Open final destination in Maps
                </button>
              )}
              {inAppTransportPlanning ? (
                <div className="flex items-center justify-between gap-3 rounded-[22px] border border-[#D9F0E0] bg-[#F7FBF8] px-4 py-3 text-[12px] text-[#4B5563]">
                  <div className="flex min-w-0 items-center gap-2">
                    <CreativeCommonsMark className="shrink-0 text-[#0B5E3C]" />
                    <span className="truncate">
                      {`Trip data by ${activeTransportNetwork?.label || getTransportProviderName(opalEligibility?.provider)}`}
                    </span>
                  </div>
                  <span className="shrink-0 text-[#8AA394]">CC</span>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3 rounded-[22px] border border-[#E2E8F0] bg-white px-4 py-3 text-[12px] text-[#64748B]">
                  <div className="flex min-w-0 items-center gap-2">
                    <Navigation className="h-4 w-4 shrink-0 text-[#0B5E3C]" strokeWidth={1.8} />
                    <span className="truncate">
                      Transit directions open in Maps for this network.
                    </span>
                  </div>
                  <span className="shrink-0 text-[#94A3B8]">Maps</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showFuelPanel && (
        <>
          <div className="fixed inset-0 z-[1001] bg-[#0F172A]/20 backdrop-blur-[1px]" onClick={() => setShowFuelPanel(false)} />
          <div className="fixed inset-x-0 bottom-[84px] z-[1002] flex justify-center px-3">
            <div className="w-full max-w-md bg-white/98 backdrop-blur-xl border border-[#E2E8F0] rounded-[28px] shadow-2xl shadow-[#0F172A]/20 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
              <div className="flex justify-center pt-2.5">
                <div className="w-10 h-1 bg-[#CBD5E1] rounded-full" />
              </div>
              <div className="flex items-start justify-between px-5 pt-3 pb-4 border-b border-[#E2E8F0] bg-white shrink-0">
                <div className="min-w-0">
                  <p className="text-[10px] tracking-[0.24em] uppercase text-[#94A3B8] font-bold">Fuel Finder</p>
                  <p className="text-lg text-[#0F172A] font-semibold mt-1">Nearby fuel prices</p>
                </div>
                <button onClick={() => setShowFuelPanel(false)} className="w-10 h-10 flex items-center justify-center rounded-2xl hover:bg-[#F8FAFC] cursor-pointer shrink-0 ml-3">
                  <X className="w-4.5 h-4.5 text-[#94A3B8]" strokeWidth={1.7} />
                </button>
              </div>
              <div className="overflow-y-auto max-h-[68vh] px-5 py-4 space-y-4">
                <div className="space-y-2.5">
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                      <Search className="text-[#94A3B8] group-focus-within:text-[#EE811A] transition-colors" size={16} />
                    </div>
                    <input
                      type="text"
                      value={fuelSearchQuery}
                      onChange={(e) => handleFuelSearchQueryChange(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          void handleFuelSearchSubmit();
                        }
                      }}
                      onFocus={() => { if (fuelSearchResults.length > 0) setShowFuelSearchResults(true); }}
                      placeholder={`Search a ${FUEL_SUPPORTED_STATE_COPY} address...`}
                      className="w-full h-12 pl-11 pr-10 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl focus:ring-2 focus:ring-[#EE811A]/20 focus:border-[#EE811A]/40 outline-none transition-all text-sm text-[#0F172A] placeholder-[#94A3B8]"
                    />
                    {fuelSearchLoading && (
                      <div className="absolute inset-y-0 right-4 flex items-center">
                        <div className="w-4 h-4 border-2 border-[#EE811A] border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                    {showFuelSearchResults && fuelSearchResults.length > 0 && (
                      <ul className="absolute z-10 mt-1.5 w-full bg-white border border-[#E2E8F0] rounded-2xl shadow-2xl shadow-[#94A3B8]/15 max-h-56 overflow-y-auto">
                        {fuelSearchResults.map((r) => (
                          <li key={r.place_id}>
                            <button
                              onClick={() => void handleSelectFuelSearchResult(r)}
                              className="w-full text-left px-4 py-3 hover:bg-[#F8FAFC] transition-colors cursor-pointer flex items-start gap-3 border-b border-[#F1F5F9] last:border-none"
                            >
                              <MapPin className="w-4 h-4 text-[#EE811A] mt-0.5 shrink-0" strokeWidth={1.5} />
                              <div className="min-w-0">
                                <p className="text-sm text-[#0F172A] font-medium truncate">{r.display_name.split(',')[0]}</p>
                                <p className="text-[11px] text-[#94A3B8] truncate">{r.display_name.split(',').slice(1, 4).join(',')}</p>
                              </div>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <button
                    onClick={() => void handleUseCurrentLocationFuel()}
                    className="inline-flex items-center gap-2 rounded-full border border-[#E2E8F0] bg-white px-3.5 py-2 text-[12px] font-medium text-[#1E40AF] hover:bg-[#EFF6FF] cursor-pointer"
                  >
                    <Crosshair className="w-3.5 h-3.5" strokeWidth={1.7} />
                    Use current location
                  </button>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {FUEL_PRODUCT_FILTERS.map((product) => {
                      const active = fuelSelectedProducts.includes(product.id);
                      return (
                        <button
                          key={product.id}
                          onClick={() => toggleFuelProduct(product.id)}
                          className={`inline-flex items-center rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors cursor-pointer ${
                            active
                              ? 'border-[#1E40AF] bg-[#EFF6FF] text-[#1E40AF]'
                              : 'border-[#E2E8F0] bg-white text-[#64748B] hover:bg-[#F8FAFC]'
                          }`}
                        >
                          {product.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {fuelTargetLabel && (
                  <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3">
                    <p className="text-[10px] tracking-[0.2em] uppercase text-[#94A3B8] font-bold">Searching around</p>
                    <p className="text-[13px] font-semibold text-[#0F172A] mt-1 leading-snug">
                      {fuelTargetLabel}
                    </p>
                  </div>
                )}

                {!fuelLoading && !fuelTarget && (
                  <div className="rounded-2xl border border-dashed border-[#CBD5E1] bg-white px-4 py-5 text-sm text-[#64748B] leading-relaxed">
                    {`Start typing to search a ${FUEL_SUPPORTED_STATE_COPY} address here, press Enter, or use your current location to compare the 5 nearest stations by price and driving distance.`}
                  </div>
                )}
                {fuelLoading && (
                  <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-5 text-sm text-[#64748B]">
                    Loading nearby fuel prices...
                  </div>
                )}
                {!fuelLoading && fuelTarget && !fuelSupported && (
                  <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-5">
                    <p className="text-sm font-semibold text-[#0F172A]">{fuelState || 'Coming soon'}</p>
                    <p className="text-sm text-[#64748B] mt-1">
                      {fuelState ? (fuelError || 'Fuel price support is not live in this state yet.') : `Search a ${FUEL_SUPPORTED_STATE_COPY} address, or allow location access to compare fuel prices.`}
                    </p>
                  </div>
                )}
                {!fuelLoading && fuelTarget && fuelSupported && hasFreshFuelResults && visibleFuelResults.length === 0 && (
                  <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-5 text-sm text-[#64748B]">
                    No nearby fuel stations were found for this area yet.
                  </div>
                )}
                {!fuelLoading && fuelSupported && hasFreshFuelResults && visibleFuelResults.map((station, index) => (
                  <div key={station.id} className="rounded-2xl border border-[#E2E8F0] bg-white px-4 py-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[10px] tracking-widest uppercase text-[#94A3B8] font-bold">{index + 1}. {station.brand || station.name}</p>
                        <p className="text-[13px] font-semibold text-[#0F172A] mt-1 leading-snug">{station.name}</p>
                        <p className="text-[11px] text-[#64748B] mt-1 leading-snug">{station.address}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[10px] tracking-widest uppercase text-[#94A3B8] font-bold">Price</p>
                        <p className="text-[16px] font-bold text-[#EE811A] mt-1">
                          {station.price_cpl != null ? `${station.price_cpl.toFixed(1)}c` : 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center rounded-full bg-[#EFF6FF] px-2.5 py-1 text-[11px] font-medium text-[#1E40AF]">
                        {station.drive_distance_km != null ? `${station.drive_distance_km.toFixed(1)} km drive` : 'Distance unavailable'}
                      </span>
                      {station.drive_minutes != null && (
                        <span className="inline-flex items-center rounded-full bg-[#FFF7ED] px-2.5 py-1 text-[11px] font-medium text-[#C2410C]">
                          ~{Math.max(1, Math.round(station.drive_minutes))} min
                        </span>
                      )}
                      <span className="inline-flex items-center rounded-full bg-[#F8FAFC] px-2.5 py-1 text-[11px] font-medium text-[#64748B]">
                        {station.state} · {FUEL_PRODUCT_LABELS[station.fuel_category as keyof typeof FUEL_PRODUCT_LABELS] || station.fuel_type}
                      </span>
                    </div>
                    <div className="mt-3">
                      <button
                        onClick={() => handleDriveToFuelStation(station)}
                        className="inline-flex items-center gap-2 rounded-full border border-[#E2E8F0] bg-white px-3.5 py-2 text-[12px] font-medium text-[#0F172A] hover:bg-[#F8FAFC] cursor-pointer"
                      >
                        <Navigation className="w-3.5 h-3.5" strokeWidth={1.8} />
                        Drive
                      </button>
                    </div>
                  </div>
                ))}
                {!fuelLoading && <p className="px-1 text-[11px] leading-relaxed text-[#94A3B8]">ACT and NT are the remaining fuel rollout states for now.</p>}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ─── COMMUTER CONTEXT DRAWER ────────────────────────────────── */}
      {commuterContext && (!focusedMapTarget || isFocusedMapContextActive) && (
        <div className="absolute bottom-[88px] left-0 right-0 z-[1001] px-3 animate-[slideUp_0.3s_ease-out]">
          <div className="max-w-md mx-auto bg-white/98 backdrop-blur-xl border border-[#E2E8F0] rounded-t-2xl shadow-2xl shadow-[#0F172A]/20 overflow-hidden">
            <div className="flex justify-center py-2">
              <div className="w-10 h-1 bg-[#E2E8F0] rounded-full" />
            </div>
            {/* Address header */}
            <div className="px-4 pb-2">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  {isFocusedMapContextActive ? (
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#94A3B8]">Nearby Safety & Essentials</p>
                  ) : null}
                  <p className="text-xs text-[#0F172A] font-bold truncate">{commuterContext.address.split(',')[0]}</p>
                  <p className="text-[10px] text-[#94A3B8] font-normal truncate">{commuterContext.address.split(',').slice(1, 3).join(',')}</p>
                </div>
                {isFocusedMapContextActive ? (
                  <button
                    onClick={closeCommuterContext}
                    className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full bg-[#F8FAFC] px-3 text-[11px] font-semibold text-[#1E40AF] transition hover:bg-[#EEF2FF] ml-2"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.8} />
                    Back
                  </button>
                ) : (
                  <button onClick={closeCommuterContext} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F8FAFC] cursor-pointer shrink-0 ml-2">
                    <X className="w-4 h-4 text-[#94A3B8]" strokeWidth={1.5} />
                  </button>
                )}
              </div>
            </div>

            {/* Tab nav */}
            <div className="flex border-b border-[#F1F5F9] px-3 mb-0">
              {([
                { id: 'safety' as const, label: 'Safety', icon: <Shield className="w-3 h-3" strokeWidth={2} />, color: commuterContext.alertsInRadius > 0 ? '#B91C1C' : '#16A34A' },
                { id: 'transit' as const, label: 'Transit', icon: <Train className="w-3 h-3" strokeWidth={2} />, color: '#1E40AF' },
                { id: 'employment' as const, label: 'Employment', icon: <Briefcase className="w-3 h-3" strokeWidth={2} />, color: '#D97316' },
              ] as const).map(tab => (
                <button key={tab.id} onClick={() => setCommuterTab(tab.id)}
                  className={`flex-1 py-2 flex items-center justify-center gap-1 transition-all cursor-pointer relative ${commuterTab === tab.id ? 'text-[#0F172A]' : 'text-[#94A3B8]'}`}>
                  <span style={{ color: commuterTab === tab.id ? tab.color : undefined }}>{tab.icon}</span>
                  <span className="text-[9px] tracking-wide uppercase font-semibold">{tab.label}</span>
                  {commuterTab === tab.id && <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 rounded-full" style={{ background: tab.color }} />}
                </button>
              ))}
            </div>

            <div className="px-4 pb-4 pt-3">
              {/* ── SAFETY TAB ── */}
              {commuterTab === 'safety' && (
                <div className="space-y-3">
                  <div className={`rounded-xl p-3 ${commuterContext.alertsInRadius > 0 ? 'bg-[#FEF2F2] border border-[#FECACA]' : 'bg-[#F0FDF4] border border-[#BBF7D0]'}`}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <Shield className={`w-4 h-4 shrink-0 ${commuterContext.alertsInRadius > 0 ? 'text-[#B91C1C]' : 'text-[#16A34A]'}`} strokeWidth={1.5} />
                      <span className="text-xs font-bold text-[#0F172A]">
                        {commuterContext.alertsInRadius === 0 ? 'No safety alerts within 5km' : `${commuterContext.alertsInRadius} alert${commuterContext.alertsInRadius !== 1 ? 's' : ''} within 5km`}
                      </span>
                    </div>
                    {commuterContext.alertsInRadius > 0 && (
                      <div className="flex items-center gap-2 ml-6">
                        {commuterContext.scamCount > 0 && <span className="text-[9px] tracking-wide uppercase px-2 py-0.5 bg-[#B91C1C] text-white rounded font-medium flex items-center gap-1"><ShieldAlert className="w-2.5 h-2.5" strokeWidth={2} />{commuterContext.scamCount} Scam</span>}
                        {commuterContext.maintenanceCount > 0 && <span className="text-[9px] tracking-wide uppercase px-2 py-0.5 bg-[#EA580C] text-white rounded font-medium flex items-center gap-1"><Wrench className="w-2.5 h-2.5" strokeWidth={2} />{commuterContext.maintenanceCount} Maint.</span>}
                      </div>
                    )}
                  </div>
                  {/* Nearest Store */}
                  <div>
                    <p className="text-[9px] tracking-wider uppercase text-[#94A3B8] font-medium mb-1.5">Nearest Groceries</p>
                    {commuterContext.storeLoading ? (
                      <div className="flex items-center gap-2 px-3 py-2.5 bg-[#F0FDF4] rounded-xl border border-[#BBF7D0]/50">
                        <div className="w-3.5 h-3.5 border-2 border-[#059669] border-t-transparent rounded-full animate-spin" />
                        <span className="text-[10px] text-[#64748B] font-normal">Finding nearest grocery stores...</span>
                      </div>
                    ) : commuterContext.nearestStore ? (
                      <div className="flex items-center gap-3 px-3 py-2.5 bg-[#F0FDF4] border border-[#BBF7D0]/60 rounded-xl">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg,#059669,#10B981)' }}>
                          <ShoppingBasket className="w-4 h-4 text-white" strokeWidth={2} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] text-[#0F172A] font-semibold truncate">{commuterContext.nearestStore.name}</p>
                          <p className="text-[9px] text-[#64748B] font-normal">
                            {commuterContext.nearestStore.storeType === 'convenience' ? '24/7 Convenience' : 'Supermarket'} · {commuterContext.nearestStore.distance_m < 1000 ? `${commuterContext.nearestStore.distance_m}m` : `${(commuterContext.nearestStore.distance_m / 1000).toFixed(1)}km`}
                          </p>
                          {commuterContext.nearestStore.opening_hours && (() => {
                            const rows = parseOpeningHours(commuterContext.nearestStore!.opening_hours!);
                            if (rows.length === 1 && rows[0].days === 'Every day') return <p className="text-[8px] text-[#059669] font-semibold mt-0.5">Open 24/7</p>;
                            return <p className="text-[8px] text-[#059669] font-medium truncate mt-0.5">{rows.map(r => `${r.days}: ${r.hours}`).join(' · ')}</p>;
                          })()}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-bold text-[#059669]">{commuterContext.nearestStore.walk_min}</p>
                          <p className="text-[8px] tracking-wider uppercase text-[#94A3B8] font-medium">min walk</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 px-3 py-2.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                        <ShoppingBasket className="w-3.5 h-3.5 text-[#94A3B8]" strokeWidth={1.5} />
                        <span className="text-[10px] text-[#94A3B8] font-normal">No student stores found nearby</span>
                      </div>
                    )}
                  </div>
                  {/* Nearest Hospital */}
                  <div>
                    <p className="text-[9px] tracking-wider uppercase text-[#94A3B8] font-medium mb-1.5">Nearest Hospital</p>
                    {commuterContext.nearestHospital ? (
                      <div className="flex items-center gap-3 px-3 py-2.5 bg-[#FEF2F2] border border-[#FECACA]/60 rounded-xl">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-[#DC2626]">
                          <Hospital className="w-4 h-4 text-white" strokeWidth={2} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] text-[#0F172A] font-semibold truncate">{commuterContext.nearestHospital.name}</p>
                          <p className="text-[9px] text-[#64748B] font-normal">
                            {commuterContext.nearestHospital.isPrivate ? 'Private' : 'Public'} · {commuterContext.nearestHospital.state}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-bold text-[#DC2626]">{commuterContext.nearestHospital.walk_min}</p>
                          <p className="text-[8px] tracking-wider uppercase text-[#94A3B8] font-medium">min walk</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 px-3 py-2.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                        <Hospital className="w-3.5 h-3.5 text-[#94A3B8]" strokeWidth={1.5} />
                        <span className="text-[10px] text-[#94A3B8] font-normal">No hospitals found nearby</span>
                      </div>
                    )}
                  </div>
                  {/* Nearest Police Station */}
                  <div>
                    <p className="text-[9px] tracking-wider uppercase text-[#94A3B8] font-medium mb-1.5">Nearest Police Station</p>
                    {commuterContext.nearestPolice ? (
                      <div className="flex items-center gap-3 px-3 py-2.5 bg-[#EFF6FF] border border-[#BFDBFE]/60 rounded-xl">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-[#1E40AF]">
                          <Shield className="w-4 h-4 text-white" strokeWidth={2} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] text-[#0F172A] font-semibold truncate">
                            {commuterContext.nearestPolice.name.split(' ').map((w: string) => w.charAt(0) + w.slice(1).toLowerCase()).join(' ')}
                          </p>
                          <p className="text-[9px] text-[#64748B] font-normal truncate">{commuterContext.nearestPolice.address}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-bold text-[#1E40AF]">{commuterContext.nearestPolice.walk_min}</p>
                          <p className="text-[8px] tracking-wider uppercase text-[#94A3B8] font-medium">min walk</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 px-3 py-2.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                        <Shield className="w-3.5 h-3.5 text-[#94A3B8]" strokeWidth={1.5} />
                        <span className="text-[10px] text-[#94A3B8] font-normal">No police stations found nearby</span>
                      </div>
                    )}
                  </div>
                  {/* Area Crime Context */}
                  {commuterContext.crimeContext && (() => {
                    const crime = commuterContext.crimeContext!;
                    const style = getCautionStyle(crime.scores?.overall_caution_band || 'Statewide context');
                    return (
                      <div>
                        <p className="text-[9px] tracking-wider uppercase text-[#94A3B8] font-medium mb-1.5">Area Crime Context</p>
                        <div className={`rounded-xl border p-3 ${style.bg} ${style.border}`}>
                          <div className="flex items-start gap-2.5 mb-2.5">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: style.dotColor }}>
                              <BarChart3 className="w-4 h-4 text-white" strokeWidth={2} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-0.5">
                                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: style.dotColor }} />
                                <p className={`text-[11px] font-bold ${style.text}`}>{style.label}</p>
                              </div>
                              <p className="text-[10px] text-[#64748B] font-normal leading-snug">{crime.display.summary}</p>
                            </div>
                          </div>
                          {crime.scores && (
                            <div className="grid grid-cols-3 gap-2 mb-2.5">
                              <div className="bg-white/60 rounded-lg p-2 text-center">
                                <p className="text-sm font-bold text-[#0F172A]">{crime.scores.overall_caution_score_0_100}</p>
                                <p className="text-[7px] tracking-wider uppercase text-[#94A3B8] font-bold mt-0.5">Overall</p>
                              </div>
                              <div className="bg-white/60 rounded-lg p-2 text-center">
                                <p className="text-sm font-bold text-[#0F172A]">{crime.scores.personal_safety_score_0_100}</p>
                                <p className="text-[7px] tracking-wider uppercase text-[#94A3B8] font-bold mt-0.5">Personal</p>
                              </div>
                              <div className="bg-white/60 rounded-lg p-2 text-center">
                                <p className="text-sm font-bold text-[#0F172A]">{crime.scores.property_crime_score_0_100}</p>
                                <p className="text-[7px] tracking-wider uppercase text-[#94A3B8] font-bold mt-0.5">Property</p>
                              </div>
                            </div>
                          )}
                          <div className="flex items-start gap-1.5 px-2 py-1.5 bg-white/50 rounded-lg">
                            <Info className="w-3 h-3 text-[#94A3B8] shrink-0 mt-0.5" strokeWidth={2} />
                            <p className="text-[8px] text-[#94A3B8] font-normal leading-relaxed">
                              {crime.geo_type === 'LGA' ? 'LGA-level' : crime.geo_type === 'SA2' ? 'SA2-level' : crime.geo_type === 'state' ? 'State-level' : 'District-level'} context for <span className="font-semibold text-[#64748B]">{crime.lga_or_district}</span>
                              {crime.reporting_region && ` (${crime.reporting_region})`} — not suburb-specific. Source: {crime.period}.
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                  <div className="flex items-center justify-center gap-1.5 pt-1">
                    <CircleDot className="w-3 h-3 text-[#1E40AF]" strokeWidth={1.5} />
                    <span className="text-[9px] tracking-wide text-[#94A3B8] font-normal">5km Safety Radius active</span>
                  </div>
                </div>
              )}

              {/* ── TRANSIT TAB ── */}
              {commuterTab === 'transit' && (
                <div className="space-y-4">
                  {commuterContext.nearestAirport && (
                    <div>
                      <p className="text-[9px] tracking-wider uppercase text-[#94A3B8] font-medium mb-2">TRAVEL</p>
                      <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl border bg-[#F0F9FF] border-[#BFDBFE]/50">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-[#0EA5E9]/10">
                          <Plane className="w-4 h-4 text-[#0EA5E9]" strokeWidth={2} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] text-[#0F172A] font-medium truncate">{commuterContext.nearestAirport.name}</p>
                          <p className="text-[9px] text-[#94A3B8] font-normal">{commuterContext.nearestAirport.type || 'Airport'} · IATA: {commuterContext.nearestAirport.iata}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-bold text-[#0EA5E9]">{commuterContext.nearestAirport.distance_km < 1 ? '< 1' : Math.round(commuterContext.nearestAirport.distance_km)}</p>
                          <p className="text-[8px] tracking-wider uppercase text-[#94A3B8] font-medium">km away</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <p className="text-[9px] tracking-wider uppercase text-[#94A3B8] font-medium mb-2">COMMUTER CONTEXT</p>
                    {commuterContext.transitLoading ? (
                      <div className="flex items-center gap-2 px-3 py-2.5 bg-[#F0F9FF] rounded-xl">
                        <div className="w-3.5 h-3.5 border-2 border-[#1E40AF] border-t-transparent rounded-full animate-spin" />
                        <span className="text-[10px] text-[#64748B] font-normal">Finding nearest transit stops...</span>
                      </div>
                    ) : commuterContext.transit.length === 0 ? (
                      <div className="flex items-center gap-2 px-3 py-2.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                        <MapPin className="w-3.5 h-3.5 text-[#94A3B8]" strokeWidth={1.5} />
                        <span className="text-[10px] text-[#94A3B8] font-normal">No transit stops found within 15 min walk</span>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {commuterContext.transit.map((t, i) => {
                        const isClosest = i === 0;
                        const typeIcon =
                          t.type === 'train' ? <Train className="w-4 h-4 text-[#1E40AF]" strokeWidth={2} /> :
                          t.type === 'light_rail' ? <TramFront className="w-4 h-4 text-[#7C3AED]" strokeWidth={2} /> :
                          t.type === 'ferry' ? <Anchor className="w-4 h-4 text-[#0EA5E9]" strokeWidth={2} /> :
                          <Bus className="w-4 h-4 text-[#EA580C]" strokeWidth={2} />;
                        const typeLabel = t.type === 'train' ? 'Train' : t.type === 'light_rail' ? 'Light Rail' : t.type === 'ferry' ? 'Ferry' : 'Bus';
                        const bg = isClosest ? 'bg-[#F0F9FF] border-[#BFDBFE]/50' : 'bg-[#F8FAFC] border-[#E2E8F0]';
                        const iconBg = t.type === 'train' ? 'bg-[#1E40AF]/10' : t.type === 'light_rail' ? 'bg-[#7C3AED]/10' : t.type === 'ferry' ? 'bg-[#0EA5E9]/10' : 'bg-[#EA580C]/10';
                        return (
                          <div key={`${t.type}-${t.name}-${i}`} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border ${bg}`}>
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}>{typeIcon}</div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] text-[#0F172A] font-medium truncate">{t.name}</p>
                              <p className="text-[9px] text-[#94A3B8] font-normal">{typeLabel} · {t.distance_m < 1000 ? `${t.distance_m}m` : `${(t.distance_m / 1000).toFixed(1)}km`}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-xs font-bold text-[#1E40AF]">{t.walk_min}</p>
                              <p className="text-[8px] tracking-wider uppercase text-[#94A3B8] font-medium">min walk</p>
                            </div>
                            {isClosest && <span className="text-[7px] tracking-wider uppercase px-1.5 py-0.5 bg-[#16A34A]/10 text-[#16A34A] rounded font-bold shrink-0">CLOSEST</span>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  </div>
                </div>
              )}

              {/* ── EMPLOYMENT TAB ── */}
              {commuterTab === 'employment' && (
                <div className="space-y-3">
                  {commuterContext.employmentLoading ? (
                    <div className="flex items-center gap-2 px-3 py-3 bg-[#FFFBEB] rounded-xl border border-[#FDE68A]/60">
                      <div className="w-3.5 h-3.5 border-2 border-[#D97316] border-t-transparent rounded-full animate-spin" />
                      <span className="text-[10px] text-[#92400E] font-normal">Analysing employment zones nearby...</span>
                    </div>
                  ) : commuterContext.employment ? (() => {
                    const emp = commuterContext.employment!;
                    const scoreColor = emp.score >= 7 ? '#16A34A' : emp.score >= 4 ? '#D97316' : '#94A3B8';
                    const scoreLabel = emp.score >= 7 ? 'HIGH' : emp.score >= 4 ? 'MODERATE' : 'LOW';
                    return (
                      <>
                        {/* Score card */}
                        <div className="flex items-center gap-3 px-3 py-3 rounded-xl border" style={{ background: '#FFFBEB', borderColor: '#FDE68A' }}>
                          <div className="w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg,#D97316,#F59E0B)' }}>
                            <span className="text-lg font-black text-white leading-none">{emp.score}</span>
                            <span className="text-[7px] text-amber-100 font-bold uppercase tracking-wide">/10</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="text-[9px] font-bold tracking-wider uppercase" style={{ color: scoreColor }}>{scoreLabel} POTENTIAL</span>
                              {emp.isHighPotential && <span className="text-[7px] px-1.5 py-0.5 bg-[#16A34A]/10 text-[#16A34A] rounded font-bold tracking-wide uppercase">JOB HUB</span>}
                              {emp.isMidpoint && <span className="text-[7px] px-1.5 py-0.5 bg-[#1E40AF]/10 text-[#1E40AF] rounded font-bold tracking-wide uppercase">MIDPOINT</span>}
                            </div>
                            <p className="text-[10px] text-[#0F172A] font-medium">Job Opportunity Score</p>
                            <p className="text-[9px] text-[#64748B]">{formatEmploymentVenueCountLabel(emp.venueCount)}</p>
                          </div>
                        </div>
                        {/* Summary */}
                        <div className="flex items-start gap-2 px-3 py-2.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                          <TrendingUp className="w-3.5 h-3.5 text-[#D97316] shrink-0 mt-0.5" strokeWidth={2} />
                          <p className="text-[10px] text-[#334155] leading-relaxed">{emp.summary}</p>
                        </div>
                        {/* Job Hub toggle nudge */}
                        {!layerJobHubs && (
                          <button
                            onClick={() => setLayerJobHubs(true)}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-[#FDE68A] bg-[#FFFBEB] text-[#92400E] cursor-pointer hover:bg-[#FEF3C7] transition-colors"
                          >
                            <Briefcase className="w-3.5 h-3.5" strokeWidth={2} />
                            <span className="text-[10px] font-semibold">Enable Job Hubs Heatmap</span>
                          </button>
                        )}
                      </>
                    );
                  })() : (
                    <div className="flex items-center gap-2 px-3 py-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                      <Briefcase className="w-3.5 h-3.5 text-[#94A3B8]" strokeWidth={1.5} />
                      <span className="text-[10px] text-[#94A3B8] font-normal">Search an address to see employment analysis</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── PROPERTY PEDIGREE DRAWER ──────────────────────────────── */}
      {showBottomSheet && selectedBuilding && (
        <div className="absolute bottom-[60px] left-0 right-0 z-[1001] px-3">
          <div className="max-w-md mx-auto bg-white border border-[#E2E8F0] rounded-t-2xl shadow-2xl shadow-[#0F172A]/20 max-h-[60vh] flex flex-col">
            <div className="flex justify-center py-2">
              <div className="w-10 h-1 bg-[#E2E8F0] rounded-full" />
            </div>
            <div className="px-4 pb-3 border-b border-[#E2E8F0]">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-[#0F172A] font-bold truncate">{selectedBuilding.address.split(',')[0]}</p>
                  <p className="text-[10px] text-[#94A3B8] mt-0.5 font-normal truncate">{selectedBuilding.address}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className="text-[8px] tracking-wider uppercase px-2 py-1 bg-[#1E40AF]/10 rounded-lg text-[#1E40AF] font-bold">BUILDING ALERTS</span>
                  <button onClick={() => { setShowBottomSheet(false); setSelectedBuilding(null); setPedigreeData(null); }} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F8FAFC] cursor-pointer">
                    <X className="w-4 h-4 text-[#94A3B8]" strokeWidth={1.5} />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-3 mt-2.5">
                {(() => {
                  const scams = selectedBuilding.listings.filter(l => l.category === 'scam').length;
                  const maints = selectedBuilding.listings.filter(l => l.category === 'maintenance').length;
                  return (
                    <>
                      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#FEF2F2] rounded-lg">
                        <ShieldAlert className="w-3 h-3 text-[#B91C1C]" strokeWidth={2} />
                        <span className="text-[9px] tracking-wide uppercase text-[#B91C1C] font-medium">{scams} Scam{scams !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#FFF7ED] rounded-lg">
                        <Wrench className="w-3 h-3 text-[#EA580C]" strokeWidth={2} />
                        <span className="text-[9px] tracking-wide uppercase text-[#EA580C] font-medium">{maints} Maint.</span>
                      </div>
                    </>
                  );
                })()}
              </div>
              <div className="mt-2.5 space-y-1">
                {transitLoading ? (
                  <div className="flex items-center gap-2 px-2.5 py-1.5 bg-[#F0F9FF] rounded-lg">
                    <div className="w-3 h-3 border border-[#1E40AF] border-t-transparent rounded-full animate-spin" />
                    <span className="text-[9px] tracking-wide text-[#64748B] font-normal">Finding nearby transit...</span>
                  </div>
                ) : pedigreeTransit.length > 0 ? (
                  pedigreeTransit.map((t, i) => (
                    <div key={`${t.type}-${t.name}-${i}`} className={`flex items-center gap-2 px-2.5 py-1.5 bg-[#F0F9FF] border border-[#BFDBFE]/40 rounded-lg ${i === 0 ? '' : 'opacity-80'}`}>
                      {t.type === 'train' ? <Train className="w-3.5 h-3.5 text-[#1E40AF]" strokeWidth={2} /> : t.type === 'light_rail' ? <TramFront className="w-3.5 h-3.5 text-[#7C3AED]" strokeWidth={2} /> : t.type === 'ferry' ? <Anchor className="w-3.5 h-3.5 text-[#0EA5E9]" strokeWidth={2} /> : <Bus className="w-3.5 h-3.5 text-[#EA580C]" strokeWidth={2} />}
                      <span className="text-[9px] text-[#0F172A] font-medium truncate flex-1">{t.name}</span>
                      <span className="text-[9px] text-[#1E40AF] font-bold whitespace-nowrap">{t.walk_min} min walk</span>
                      {i === 0 && <span className="text-[7px] tracking-wider uppercase px-1.5 py-0.5 bg-[#16A34A]/10 text-[#16A34A] rounded font-bold shrink-0">CLOSEST</span>}
                    </div>
                  ))
                ) : null}
              </div>
            </div>

            {currentHome && currentHome.lat && currentHome.lng && (
              Math.sqrt(Math.pow(selectedBuilding.lat - currentHome.lat, 2) + Math.pow(selectedBuilding.lng - currentHome.lng, 2)) < 0.001
            ) && (
              <div className="mx-4 mt-2 px-3 py-2 bg-[#EE811A]/10 border border-[#EE811A]/20 rounded-xl flex items-center gap-2">
                <Home className="w-4 h-4 text-[#EE811A] shrink-0" strokeWidth={1.5} />
                <p className="text-[10px] text-[#0F172A] font-medium">You are currently living here.</p>
              </div>
            )}

            <div className="flex border-b border-[#E2E8F0] px-4">
              {([{ id: 'alerts' as const, label: 'Active Alerts' }, { id: 'units' as const, label: 'By Unit' }]).map(tab => (
                <button key={tab.id} onClick={() => setPedigreeTab(tab.id)} className={`flex-1 py-2.5 text-center transition-all cursor-pointer relative ${pedigreeTab === tab.id ? 'text-[#1E40AF]' : 'text-[#94A3B8]'}`}>
                  <span className="text-[9px] tracking-wide uppercase font-medium">{tab.label}</span>
                  {pedigreeTab === tab.id && <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-[#1E40AF] rounded-full" />}
                </button>
              ))}
            </div>

            <div className="overflow-y-auto flex-1 p-4 space-y-2">
              {pedigreeLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-[#1E40AF] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <>
                  {pedigreeTab === 'alerts' && (() => {
                    if (selectedBuilding.listings.length === 0) {
                      return <div className="text-center py-8 text-sm text-[#94A3B8]">No alerts for this building.</div>;
                    }
                    return selectedBuilding.listings.map(listing => (
                      <PedigreeAlertCard key={listing.id} listing={listing} onSelect={() => { onSelectListing(listing); setShowBottomSheet(false); }} />
                    ));
                  })()}
                  {pedigreeTab === 'units' && (() => {
                    const byUnit: Record<string, Listing[]> = {};
                    selectedBuilding.listings.forEach(l => {
                      const unit = l.unit_number || 'Building-wide';
                      if (!byUnit[unit]) byUnit[unit] = [];
                      byUnit[unit].push(l);
                    });
                    if (Object.keys(byUnit).length === 0) return <div className="text-center py-8 text-sm text-[#94A3B8]">No unit data available.</div>;
                    return Object.entries(byUnit).map(([unit, unitListings]) => (
                      <div key={unit} className="mb-3">
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className="w-5 h-5 bg-[#1E40AF]/10 rounded flex items-center justify-center"><Home className="w-3 h-3 text-[#1E40AF]" strokeWidth={2} /></div>
                          <span className="text-[10px] tracking-wider uppercase text-[#1E40AF] font-bold">{unit}</span>
                          <span className="text-[9px] text-[#94A3B8]">({unitListings.length} alert{unitListings.length !== 1 ? 's' : ''})</span>
                        </div>
                        {unitListings.map(listing => (
                          <PedigreeAlertCard key={listing.id} listing={listing} onSelect={() => { onSelectListing(listing); setShowBottomSheet(false); }} />
                        ))}
                      </div>
                    ));
                  })()}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── LAYERS PANEL ───────────────────��──────────────────────── */}
      {showLayers && (
        <>
          <div className="fixed inset-0 z-[1001]" onClick={() => setShowLayers(false)} />
          <div className="absolute z-[1002] right-4" style={{ bottom: '180px' }}>
            <div className="bg-white/95 backdrop-blur-xl border border-[#E2E8F0] rounded-2xl shadow-2xl shadow-[#0F172A]/15 w-64 max-h-[60vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between p-4 pb-3 border-b border-[#E2E8F0] bg-white shrink-0">
                <p className="text-[9px] tracking-widest uppercase text-[#94A3B8] font-bold">MAP LAYERS</p>
                <span className="text-[9px] text-[#94A3B8] font-normal">{activeLayerCount}/{TOTAL_LAYERS} active</span>
              </div>
              
              <div className="overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent p-4">
                
                {/* Alerts Accordion */}
                <button onClick={() => toggleLayerAccordion('alerts')} className="flex items-center justify-between w-full mb-2 group outline-none cursor-pointer">
                  <p className="text-[8px] tracking-widest uppercase text-[#CBD5E1] group-hover:text-[#94A3B8] font-bold transition-colors">ALERTS</p>
                  <ChevronDown className={`w-3 h-3 text-[#CBD5E1] transition-transform ${layerAccordions.alerts ? 'rotate-180' : ''}`} />
                </button>
                {layerAccordions.alerts && (
                  <div className="space-y-1.5 mb-4 animate-in fade-in slide-in-from-top-1">
                    <button onClick={() => setLayerScams(!layerScams)} className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-[#F8FAFC] transition-colors cursor-pointer">
                      <div className="w-6 h-6 flex items-center justify-center shrink-0">
                        <div className="w-0 h-0" style={{ borderLeft: '7px solid transparent', borderRight: '7px solid transparent', borderBottom: '13px solid #B91C1C', opacity: layerScams ? 1 : 0.25 }} />
                      </div>
                      <span className={`text-[11px] flex-1 text-left font-medium transition-colors ${layerScams ? 'text-[#0F172A]' : 'text-[#94A3B8]'}`}>Scam Alerts</span>
                      <div className={`w-8 h-[18px] rounded-full flex items-center transition-all ${layerScams ? 'bg-[#B91C1C] justify-end' : 'bg-[#E2E8F0] justify-start'}`}>
                        <div className="w-3.5 h-3.5 bg-white rounded-full mx-0.5 shadow-sm" />
                      </div>
                    </button>
                    <button onClick={() => setLayerMaintenance(!layerMaintenance)} className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-[#F8FAFC] transition-colors cursor-pointer">
                      <div className="w-6 h-6 flex items-center justify-center shrink-0">
                        <div className="w-3.5 h-3.5 rounded-[2px]" style={{ backgroundColor: '#EA580C', opacity: layerMaintenance ? 1 : 0.25 }} />
                      </div>
                      <span className={`text-[11px] flex-1 text-left font-medium transition-colors ${layerMaintenance ? 'text-[#0F172A]' : 'text-[#94A3B8]'}`}>Maintenance</span>
                      <div className={`w-8 h-[18px] rounded-full flex items-center transition-all ${layerMaintenance ? 'bg-[#EA580C] justify-end' : 'bg-[#E2E8F0] justify-start'}`}>
                        <div className="w-3.5 h-3.5 bg-white rounded-full mx-0.5 shadow-sm" />
                      </div>
                    </button>
                  </div>
                )}

                {/* Points of Interest Accordion */}
                <button onClick={() => toggleLayerAccordion('poi')} className="flex items-center justify-between w-full mb-2 group outline-none cursor-pointer">
                  <p className="text-[8px] tracking-widest uppercase text-[#CBD5E1] group-hover:text-[#94A3B8] font-bold transition-colors">Public amenities</p>
                  <ChevronDown className={`w-3 h-3 text-[#CBD5E1] transition-transform ${layerAccordions.poi ? 'rotate-180' : ''}`} />
                </button>
                {layerAccordions.poi && (
                  <div className="space-y-1.5 mb-4 animate-in fade-in slide-in-from-top-1">
                    <button onClick={() => setLayerPolice(!layerPolice)} className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-[#F8FAFC] transition-colors cursor-pointer">
                      <div className="w-6 h-6 flex items-center justify-center shrink-0">
                        <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ backgroundColor: '#1E40AF', opacity: layerPolice ? 1 : 0.25 }}>
                          <Shield className="w-2 h-2 text-white" strokeWidth={3} />
                        </div>
                      </div>
                      <span className={`text-[11px] flex-1 text-left font-medium transition-colors ${layerPolice ? 'text-[#0F172A]' : 'text-[#94A3B8]'}`}>Police Stations</span>
                      <div className={`w-8 h-[18px] rounded-full flex items-center transition-all ${layerPolice ? 'bg-[#1E40AF] justify-end' : 'bg-[#E2E8F0] justify-start'}`}>
                        <div className="w-3.5 h-3.5 bg-white rounded-full mx-0.5 shadow-sm" />
                      </div>
                    </button>
                    <button onClick={() => setLayerHospital(!layerHospital)} className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-[#F8FAFC] transition-colors cursor-pointer">
                      <div className="w-6 h-6 flex items-center justify-center shrink-0">
                        <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ backgroundColor: '#DC2626', opacity: layerHospital ? 1 : 0.25 }}>
                          <Hospital className="w-2 h-2 text-white" strokeWidth={3} />
                        </div>
                      </div>
                      <span className={`text-[11px] flex-1 text-left font-medium transition-colors ${layerHospital ? 'text-[#0F172A]' : 'text-[#94A3B8]'}`}>Hospitals</span>
                      <div className={`w-8 h-[18px] rounded-full flex items-center transition-all ${layerHospital ? 'bg-[#DC2626] justify-end' : 'bg-[#E2E8F0] justify-start'}`}>
                        <div className="w-3.5 h-3.5 bg-white rounded-full mx-0.5 shadow-sm" />
                      </div>
                    </button>
                    <button onClick={() => setLayerUniversities(!layerUniversities)} className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-[#F8FAFC] transition-colors cursor-pointer">
                      <div className="w-6 h-6 flex items-center justify-center shrink-0">
                        <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ backgroundColor: '#1E3A8A', opacity: layerUniversities ? 1 : 0.25 }}>
                          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 12 3 12 0v-5"/></svg>
                        </div>
                      </div>
                      <span className={`text-[11px] flex-1 text-left font-medium transition-colors ${layerUniversities ? 'text-[#0F172A]' : 'text-[#94A3B8]'}`}>Universities</span>
                      <div className={`w-8 h-[18px] rounded-full flex items-center transition-all ${layerUniversities ? 'bg-[#1E3A8A] justify-end' : 'bg-[#E2E8F0] justify-start'}`}>
                        <div className="w-3.5 h-3.5 bg-white rounded-full mx-0.5 shadow-sm" />
                      </div>
                    </button>
                    {showsConsulateLayer && (
                      <button onClick={() => setLayerConsulates(!layerConsulates)} className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-[#F8FAFC] transition-colors cursor-pointer">
                        <div className="w-6 h-6 flex items-center justify-center shrink-0">
                          <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ backgroundColor: '#F97316', opacity: layerConsulates ? 1 : 0.25 }}>
                            <Landmark className="w-2.5 h-2.5 text-white" strokeWidth={2.5} />
                          </div>
                        </div>
                        <span className={`text-[11px] flex-1 text-left font-medium transition-colors ${layerConsulates ? 'text-[#0F172A]' : 'text-[#94A3B8]'}`}>Consulates & HCI</span>
                        <div className={`w-8 h-[18px] rounded-full flex items-center transition-all ${layerConsulates ? 'bg-[#F97316] justify-end' : 'bg-[#E2E8F0] justify-start'}`}>
                          <div className="w-3.5 h-3.5 bg-white rounded-full mx-0.5 shadow-sm" />
                        </div>
                      </button>
                    )}
                  </div>
                )}

                {/* Transit Accordion */}
                <button onClick={() => toggleLayerAccordion('transit')} className="flex items-center justify-between w-full mb-2 group outline-none cursor-pointer">
                  <p className="text-[8px] tracking-widest uppercase text-[#CBD5E1] group-hover:text-[#94A3B8] font-bold transition-colors">Public transport and transit</p>
                  <ChevronDown className={`w-3 h-3 text-[#CBD5E1] transition-transform ${layerAccordions.transit ? 'rotate-180' : ''}`} />
                </button>
                {layerAccordions.transit && (
                  <div className="space-y-1.5 mb-4 animate-in fade-in slide-in-from-top-1">
                    <button onClick={() => setLayerTrain(!layerTrain)} className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-[#F8FAFC] transition-colors cursor-pointer">
                      <div className="w-6 h-6 flex items-center justify-center shrink-0">
                        <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ backgroundColor: '#1E40AF', opacity: layerTrain ? 1 : 0.25 }}>
                          <Train className="w-2 h-2 text-white" strokeWidth={3} />
                        </div>
                      </div>
                      <span className={`text-[11px] flex-1 text-left font-medium transition-colors ${layerTrain ? 'text-[#0F172A]' : 'text-[#94A3B8]'}`}>Train Stations</span>
                      <div className={`w-8 h-[18px] rounded-full flex items-center transition-all ${layerTrain ? 'bg-[#1E40AF] justify-end' : 'bg-[#E2E8F0] justify-start'}`}>
                        <div className="w-3.5 h-3.5 bg-white rounded-full mx-0.5 shadow-sm" />
                      </div>
                    </button>
                    <button onClick={() => setLayerLightRail(!layerLightRail)} className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-[#F8FAFC] transition-colors cursor-pointer">
                      <div className="w-6 h-6 flex items-center justify-center shrink-0">
                        <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ backgroundColor: '#7C3AED', opacity: layerLightRail ? 1 : 0.25 }}>
                          <TramFront className="w-2 h-2 text-white" strokeWidth={3} />
                        </div>
                      </div>
                      <span className={`text-[11px] flex-1 text-left font-medium transition-colors ${layerLightRail ? 'text-[#0F172A]' : 'text-[#94A3B8]'}`}>Light Rail</span>
                      <div className={`w-8 h-[18px] rounded-full flex items-center transition-all ${layerLightRail ? 'bg-[#7C3AED] justify-end' : 'bg-[#E2E8F0] justify-start'}`}>
                        <div className="w-3.5 h-3.5 bg-white rounded-full mx-0.5 shadow-sm" />
                      </div>
                    </button>
                    <button onClick={() => setLayerBus(!layerBus)} className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-[#F8FAFC] transition-colors cursor-pointer">
                      <div className="w-6 h-6 flex items-center justify-center shrink-0">
                        <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ backgroundColor: '#059669', opacity: layerBus ? 1 : 0.25 }}>
                          <Bus className="w-2 h-2 text-white" strokeWidth={3} />
                        </div>
                      </div>
                      <span className={`text-[11px] flex-1 text-left font-medium transition-colors ${layerBus ? 'text-[#0F172A]' : 'text-[#94A3B8]'}`}>Bus Stops</span>
                      <div className={`w-8 h-[18px] rounded-full flex items-center transition-all ${layerBus ? 'bg-[#059669] justify-end' : 'bg-[#E2E8F0] justify-start'}`}>
                        <div className="w-3.5 h-3.5 bg-white rounded-full mx-0.5 shadow-sm" />
                      </div>
                    </button>
                    <button onClick={() => setLayerAirports(!layerAirports)} className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-[#F8FAFC] transition-colors cursor-pointer">
                      <div className="w-6 h-6 flex items-center justify-center shrink-0">
                        <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ backgroundColor: '#0EA5E9', opacity: layerAirports ? 1 : 0.25 }}>
                          <Plane className="w-2.5 h-2.5 text-white" strokeWidth={2.5} />
                        </div>
                      </div>
                      <span className={`text-[11px] flex-1 text-left font-medium transition-colors ${layerAirports ? 'text-[#0F172A]' : 'text-[#94A3B8]'}`}>Airports</span>
                      <div className={`w-8 h-[18px] rounded-full flex items-center transition-all ${layerAirports ? 'bg-[#0EA5E9] justify-end' : 'bg-[#E2E8F0] justify-start'}`}>
                        <div className="w-3.5 h-3.5 bg-white rounded-full mx-0.5 shadow-sm" />
                      </div>
                    </button>
                  </div>
                )}

                {/* Student Survival Accordion */}
                <button onClick={() => toggleLayerAccordion('survival')} className="flex items-center justify-between w-full mb-2 group outline-none cursor-pointer">
                  <p className="text-[8px] tracking-widest uppercase text-[#CBD5E1] group-hover:text-[#94A3B8] font-bold transition-colors">Supplies and Groceries</p>
                  <ChevronDown className={`w-3 h-3 text-[#CBD5E1] transition-transform ${layerAccordions.survival ? 'rotate-180' : ''}`} />
                </button>
                {layerAccordions.survival && (
                  <div className="space-y-1.5 mb-4 animate-in fade-in slide-in-from-top-1">
                    <button onClick={() => setLayerSurvival(!layerSurvival)} className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-[#F8FAFC] transition-colors cursor-pointer">
                      <div className="w-6 h-6 flex items-center justify-center shrink-0">
                        <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ background: layerSurvival ? 'linear-gradient(135deg,#059669,#10B981)' : '#E2E8F0' }}>
                          <ShoppingBasket className="w-2.5 h-2.5 text-white" strokeWidth={2.5} />
                        </div>
                      </div>
                      <span className={`text-[11px] flex-1 text-left font-medium transition-colors ${layerSurvival ? 'text-[#0F172A]' : 'text-[#94A3B8]'}`}>Grocery & 24/7 Stores</span>
                      <div className={`w-8 h-[18px] rounded-full flex items-center transition-all ${layerSurvival ? 'bg-[#059669] justify-end' : 'bg-[#E2E8F0] justify-start'}`}>
                        <div className="w-3.5 h-3.5 bg-white rounded-full mx-0.5 shadow-sm" />
                      </div>
                    </button>
                  </div>
                )}

                {/* Employment Accordion */}
                <button onClick={() => toggleLayerAccordion('employment')} className="flex items-center justify-between w-full mb-2 group outline-none cursor-pointer">
                  <p className="text-[8px] tracking-widest uppercase text-[#CBD5E1] group-hover:text-[#94A3B8] font-bold transition-colors">CASUAL EMPLOYMENT OPPORTUNITIES</p>
                  <ChevronDown className={`w-3 h-3 text-[#CBD5E1] transition-transform ${layerAccordions.employment ? 'rotate-180' : ''}`} />
                </button>
                {layerAccordions.employment && (
                  <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1">
                    <button onClick={() => setLayerJobHubs(!layerJobHubs)} className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-[#F8FAFC] transition-colors cursor-pointer">
                      <div className="w-6 h-6 flex items-center justify-center shrink-0">
                        <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ background: layerJobHubs ? 'linear-gradient(135deg,#D97316,#F59E0B)' : '#E2E8F0' }}>
                          <Briefcase className="w-2.5 h-2.5 text-white" strokeWidth={2.5} />
                        </div>
                      </div>
                      <span className={`text-[11px] flex-1 text-left font-medium transition-colors ${layerJobHubs ? 'text-[#0F172A]' : 'text-[#94A3B8]'}`}>Casual Jobs Heatmap</span>
                      <div className={`w-8 h-[18px] rounded-full flex items-center transition-all ${layerJobHubs ? 'bg-[#F59E0B] justify-end' : 'bg-[#E2E8F0] justify-start'}`}>
                        <div className="w-3.5 h-3.5 bg-white rounded-full mx-0.5 shadow-sm" />
                      </div>
                    </button>
                  </div>
                )}

                <p className="text-[8px] text-[#94A3B8] font-normal mt-5 text-center">Transit · Stores · Police · Hospitals · Job Hubs load as you pan the map</p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Stats Bar */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-[920]">
        <div className="bg-amber-50 border-t border-amber-200 py-1.5 overflow-hidden whitespace-nowrap">
          <div className="animate-marquee inline-block">
            {isWolliExperience ? (
              <>
                {[0, 1].map((item) => (
                  <span key={item} className="text-xs text-amber-900">
                    This website is publicly available on{' '}
                    <a
                      href={BAYSIDE_WARD_BOUNDARY_URL}
                      aria-label={WOLLI_PUBLIC_SOURCE_MARQUEE_TEXT}
                      onClick={(event) => {
                        event.preventDefault();
                        openMapExternalUrl(BAYSIDE_WARD_BOUNDARY_URL);
                      }}
                      className="pointer-events-auto font-semibold underline decoration-amber-700/50 underline-offset-2"
                    >
                      {BAYSIDE_WARD_BOUNDARY_URL}
                    </a>
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                  </span>
                ))}
              </>
            ) : (
              <>
                <span className="text-xs text-amber-900">⚠️ All alerts and scams are marked by verified students and alumni based on their personal past experiences. What's On! Campus Pty Ltd acts as a neutral intermediary and assumes no liability or responsibility for user-generated listings. Every map flag contains a unique Listing ID. To dispute any listing or request its removal, please contact ghar@knowwhatson.com with your Listing ID clearly mentioned in the email subject line. We will process your request within a reasonable timeframe, usually 14 to 28 days.&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
                <span className="text-xs text-amber-900">⚠️ All alerts and scams are marked by verified students and alumni based on their personal past experiences. What's On! Campus Pty Ltd acts as a neutral intermediary and assumes no liability or responsibility for user-generated listings. Every map flag contains a unique Listing ID. To dispute any listing or request its removal, please contact ghar@knowwhatson.com with your Listing ID clearly mentioned in the email subject line. We will process your request within a reasonable timeframe, usually 14 to 28 days.&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
              </>
            )}
          </div>
        </div>
        <div
          className={`bg-white/90 backdrop-blur-sm border-t border-[#E2E8F0] px-4 py-2 ${isHoodieExperience ? 'grid items-center gap-2' : 'flex items-center justify-around'}`}
          style={isHoodieExperience ? { gridTemplateColumns: `minmax(0,1fr) ${HOODIE_FEATURED_NAV_GEOMETRY.mapFooterCenterGapPx}px minmax(0,1fr)` } : undefined}
        >
          <div className="text-center">
            <p className="text-2xl text-[#B91C1C]" style={{ fontWeight: 100 }}>{scamCount}</p>
            <p className="text-[9px] tracking-wide uppercase text-[#94A3B8] font-medium">Reported Scams</p>
          </div>
          {isHoodieExperience ? (
            <div aria-hidden="true" className="h-10" />
          ) : (
            <div className="w-px h-7 bg-[#E2E8F0]" />
          )}
          <div className="text-center">
            <p className="text-2xl text-[#EA580C]" style={{ fontWeight: 100 }}>{maintenanceCount}</p>
            <p className="text-[9px] tracking-wide uppercase text-[#94A3B8] font-medium">Maintenance</p>
          </div>
        </div>
      </div>

      {/* Click-away for search */}
      {showSearchResults && (
        <div className="absolute inset-0 z-[999]" onClick={() => setShowSearchResults(false)} />
      )}
    </div>
  );
}

// ─── AIRPORT MARKER ─────────────────────────────────────────
function AirportMarker({ feature, onClick }: { feature: any; onClick: () => void }) {
  return (
    <div
      className="relative z-10 flex cursor-pointer flex-col items-center group"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
    >
      <div className="relative w-8 h-8 rounded-full flex items-center justify-center bg-[#0EA5E9] border-2 border-white shadow-lg shadow-sky-900/30 group-hover:scale-110 transition-transform">
        <div className="absolute inset-0 rounded-full border-2 border-[#0EA5E9] animate-ping opacity-50" />
        <Plane className="w-4 h-4 text-white" />
      </div>
      <div className="mt-1 px-2 py-0.5 bg-white/95 backdrop-blur-sm rounded text-[10px] font-bold text-[#0369A1] shadow-sm opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none absolute top-full">
        {feature.properties.iata_code || feature.properties.iata}
      </div>
    </div>
  );
}

// ─── PEDIGREE ALERT CARD ─────────────────────────────────────────
function PedigreeAlertCard({ listing, onSelect }: { listing: Listing; onSelect: () => void }) {
  const catColor = categoryColors[listing.category] || '#94A3B8';
  const catLabel = categoryLabels[listing.category] || listing.category;
  const recencyLabel = getScamAlertRecencyLabel(listing.created_at);

  return (
    <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3 cursor-pointer hover:border-[#1E40AF]/30 hover:bg-white transition-all" onClick={onSelect}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[9px] tracking-widest uppercase px-2 py-0.5 text-white rounded font-medium" style={{ background: catColor }}>{catLabel}</span>
        <span className="rounded-full bg-[#F0FDF4] px-2.5 py-1 text-[9px] font-semibold text-[#16A34A]">{recencyLabel}</span>
      </div>
      <p className="text-xs text-[#0F172A] font-bold mb-0.5">{listing.listing_id_public}</p>
      {listing.unit_number && <p className="text-[9px] text-[#1E40AF] font-medium tracking-wider uppercase mb-0.5">{listing.unit_number}</p>}
      <p className="text-[10px] text-[#64748B] mt-2 line-clamp-2 font-normal">{listing.description}</p>
      <div className="flex items-center gap-1 mt-2 text-[#1E40AF]">
        <span className="text-[9px] tracking-wider uppercase font-medium">View Case</span>
        <ChevronRight className="w-3 h-3" strokeWidth={2} />
      </div>
    </div>
  );
}
