import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { format } from 'date-fns';
import MapGL, { Marker, NavigationControl } from 'react-map-gl/maplibre';
import {
  ArrowLeft,
  BrainCircuit,
  Calculator,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Crosshair,
  ExternalLink,
  Flame,
  Fuel,
  LineChart as LineChartIcon,
  List,
  Loader2,
  Map as MapIcon,
  MapPin,
  Navigation,
  Newspaper,
  Search,
  TrendingUp,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { HoodieHelpTrigger } from '../components/hoodie-help-tour';
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from '../components/ui/carousel';
import {
  fetchFuelInsights,
  fetchFuelNews,
  fetchNearbyFuelStations,
  searchAddress,
  type CanonicalFuelCategory,
  type FuelInsightTool,
  type FuelInsightsResponse,
  type FuelNewsItem,
  type FuelStateCode,
  type FuelStationResult,
  type NominatimResult,
} from '../lib/api';
import { APP_CONFIG } from '../lib/app-config';
import { getCurrentAppPosition } from '../lib/geolocation';

type FuelTarget = {
  lat: number;
  lng: number;
  state?: string;
  suburb?: string;
  label: string;
};

type FuelPageLocationState = {
  initialFuelTarget?: FuelTarget;
  initialFuelSearchQuery?: string;
  initialSearchMode?: 'list' | 'postcode';
};

type SearchMode = 'list' | 'map' | 'postcode';
type StationSort = 'best' | 'price' | 'distance';
type DistanceBand = 'all' | 'lt2' | 'lt5' | 'lt10';

const MAP_STYLE_URL = 'https://api.maptiler.com/maps/dataviz-light/style.json?key=KUC6giLOTNJZVNNb8YoO';
const SUPPORTED_SEARCH_STATES = new Set(['NSW', 'VIC', 'QLD', 'TAS', 'WA', 'SA']);
const SUPPORTED_INSIGHT_STATES: FuelStateCode[] = ['NSW', 'VIC', 'QLD', 'TAS', 'WA', 'SA'];
const COMING_SOON_INSIGHT_STATES: FuelStateCode[] = ['ACT', 'NT'];
const DAY_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TOOL_OPTIONS: Array<{ id: FuelInsightTool; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'forecast', label: 'AI Forecast' },
  { id: 'trends', label: 'Trends' },
  { id: 'timing', label: 'Best Time' },
  { id: 'savings', label: 'Savings' },
];
const STATE_OPTIONS: Array<{ id: FuelStateCode; label: string; supported: boolean }> = [
  { id: 'NSW', label: 'New South Wales', supported: true },
  { id: 'VIC', label: 'Victoria', supported: true },
  { id: 'QLD', label: 'Queensland', supported: true },
  { id: 'TAS', label: 'Tasmania', supported: true },
  { id: 'WA', label: 'Western Australia', supported: true },
  { id: 'SA', label: 'South Australia', supported: true },
  { id: 'ACT', label: 'ACT (Soon)', supported: false },
  { id: 'NT', label: 'Northern Territory (Soon)', supported: false },
];
const FUEL_PRODUCT_OPTIONS: Array<{ id: CanonicalFuelCategory; label: string; searchLabel: string }> = [
  { id: 'unleaded_up', label: 'Unleaded Petrol', searchLabel: 'Unleaded' },
  { id: 'premium_up', label: 'Premium Unleaded', searchLabel: 'Premium UP' },
  { id: 'diesel', label: 'Diesel', searchLabel: 'Diesel' },
  { id: 'brand_diesel', label: 'Brand Diesel', searchLabel: 'Brand Diesel' },
  { id: 'lpg', label: 'LPG', searchLabel: 'LPG' },
  { id: 'e85', label: 'E85', searchLabel: 'E85' },
];
const TREND_WINDOWS = [
  { id: 7, label: '7D' },
  { id: 30, label: '30D' },
  { id: 60, label: '60D' },
];
const DISTANCE_OPTIONS: Array<{ id: DistanceBand; label: string }> = [
  { id: 'all', label: 'All distances' },
  { id: 'lt2', label: '< 2 km' },
  { id: 'lt5', label: '< 5 km' },
  { id: 'lt10', label: '< 10 km' },
];
const SORT_OPTIONS: Array<{ id: StationSort; label: string }> = [
  { id: 'best', label: 'Best' },
  { id: 'price', label: 'Price' },
  { id: 'distance', label: 'Distance' },
];
const FUEL_LABELS = Object.fromEntries(
  FUEL_PRODUCT_OPTIONS.map((option) => [option.id, option.label]),
) as Record<CanonicalFuelCategory, string>;

function normalizeAustralianStateLabel(value: string) {
  const normalized = String(value || '').trim().toLowerCase().replace(/\./g, '');
  const map: Record<string, FuelStateCode> = {
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

  if (SUPPORTED_SEARCH_STATES.has(state)) score += 100;
  if (primaryName.startsWith(normalizedQuery)) score += 40;
  else if (label.includes(normalizedQuery)) score += 20;
  if (result.type === 'suburb' || result.type === 'city' || result.type === 'town' || result.type === 'village') score += 8;
  if (/^\d{4}$/.test(normalizedQuery) && result.address?.postcode === normalizedQuery) score += 30;

  return score;
}

function filterFuelSearchResults(results: NominatimResult[], query: string) {
  return results
    .filter((result) => {
      const state = normalizeAustralianStateLabel(result.address?.state || '');
      return Boolean(
        result.address?.suburb ||
        result.address?.city ||
        result.address?.town ||
        result.address?.road ||
        result.address?.postcode,
      ) && (SUPPORTED_SEARCH_STATES.has(state) || COMING_SOON_INSIGHT_STATES.includes(state));
    })
    .sort((a, b) => rankFuelSearchResult(b, query) - rankFuelSearchResult(a, query))
    .slice(0, 8);
}

function normalizeFuelCategoryForDisplay(
  rawCategory: string | undefined,
  rawFuelType: string | undefined,
): CanonicalFuelCategory {
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

function formatPrice(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return 'N/A';
  return `${value.toFixed(1)}c`;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 0,
  }).format(value);
}

function buildLocationTarget(result: NominatimResult): FuelTarget {
  const fallbackLocality = extractFuelLocalityFromDisplayName(result.display_name);
  return {
    lat: Number(result.lat),
    lng: Number(result.lon),
    state: normalizeAustralianStateLabel(result.address?.state || ''),
    suburb: result.address?.suburb || result.address?.city || result.address?.town || fallbackLocality || '',
    label: result.display_name,
  };
}

function buildFuelQueryKey(target: FuelTarget | null, fuel: CanonicalFuelCategory) {
  if (!target) return `none|${fuel}`;
  return [
    target.lat.toFixed(5),
    target.lng.toFixed(5),
    target.state || '',
    target.suburb || '',
    target.label || '',
    fuel,
  ].join('|');
}

function getBrandName(station: FuelStationResult) {
  return (station.brand || station.name || 'Unbranded').trim();
}

function getDistanceValue(station: FuelStationResult) {
  return station.drive_distance_km ?? station.straight_distance_km ?? Infinity;
}

function getDistanceBandMax(distanceBand: DistanceBand) {
  if (distanceBand === 'lt2') return 2;
  if (distanceBand === 'lt5') return 5;
  if (distanceBand === 'lt10') return 10;
  return Infinity;
}

function getErrorHeading(message: string | null) {
  if (!message) return 'Fuel Finder';
  if (/coming soon/i.test(message)) return 'Coming soon';
  if (/timed out/i.test(message)) return 'Request timed out';
  if (/location access/i.test(message)) return 'Location needed';
  return 'Try again';
}

function getFriendlyFuelErrorMessage(error: unknown, fallback: string) {
  const message = String(error instanceof Error ? error.message : error || '').trim();
  if (!message || /load failed|request failed|failed to fetch|networkerror|string did not match the expected pattern/i.test(message)) {
    return fallback;
  }
  return message;
}

function getCoverageTone(status: FuelInsightsResponse['coverage']['historyStatus']) {
  if (status === 'ready') return 'bg-[#ECFDF5] border-[#BBF7D0] text-[#166534]';
  if (status === 'partial') return 'bg-[#EFF6FF] border-[#BFDBFE] text-[#1D4ED8]';
  return 'bg-[#FFF7ED] border-[#FED7AA] text-[#C2410C]';
}

function getForecastLineData(insights: FuelInsightsResponse | null) {
  if (!insights) return [];
  return insights.forecast.points.map((point) => ({
    ...point,
    predictedLabel: point.predictedCpl != null ? `${point.predictedCpl.toFixed(1)}c` : 'N/A',
  }));
}

function StationCard({
  station,
  rank,
  onDrive,
}: {
  station: FuelStationResult;
  rank?: number;
  onDrive: (station: FuelStationResult) => void;
}) {
  return (
    <div className="rounded-[28px] border border-[#E2E8F0] bg-white px-4 py-4 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {rank != null && (
            <p className="text-[10px] tracking-[0.24em] uppercase text-[#94A3B8] font-bold">#{rank + 1}</p>
          )}
          <div className="flex items-center gap-2 mt-1">
            <span className="inline-flex size-9 items-center justify-center rounded-2xl bg-[#FFF7ED] text-[#EE811A]">
              <Fuel className="w-4 h-4" strokeWidth={1.8} />
            </span>
            <div className="min-w-0">
              <p className="text-[15px] font-semibold text-[#0F172A] truncate">{station.name}</p>
              <p className="text-[11px] text-[#64748B] truncate">{getBrandName(station)}</p>
            </div>
          </div>
          <p className="text-[12px] text-[#64748B] mt-3 leading-snug">{station.address}</p>
        </div>
        <div className="shrink-0 rounded-2xl bg-[#FEF3C7] px-3 py-2 text-right min-w-[88px]">
          <p className="text-[10px] tracking-[0.18em] uppercase text-[#A16207] font-bold">Price</p>
          <p className="text-[20px] font-bold text-[#D97706] mt-1">{formatPrice(station.price_cpl)}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="rounded-full bg-[#F8FAFC] px-3 py-1.5 text-[11px] font-medium text-[#475569]">
          {getDistanceValue(station) !== Infinity ? `${getDistanceValue(station).toFixed(2)} km` : 'Distance N/A'}
        </span>
        {station.drive_minutes != null && (
          <span className="rounded-full bg-[#EFF6FF] px-3 py-1.5 text-[11px] font-medium text-[#1D4ED8]">
            ~{Math.max(1, Math.round(station.drive_minutes))} min drive
          </span>
        )}
        <span className="rounded-full bg-[#F8FAFC] px-3 py-1.5 text-[11px] font-medium text-[#64748B]">
          {station.state} · {FUEL_LABELS[normalizeFuelCategoryForDisplay(station.fuel_category, station.fuel_type)]}
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <button
          onClick={() => onDrive(station)}
          className="inline-flex items-center gap-2 rounded-full border border-[#D7E3F4] bg-white px-4 py-2.5 text-[13px] font-semibold text-[#0F172A] hover:bg-[#F8FAFC] cursor-pointer"
        >
          <Navigation className="w-4 h-4" strokeWidth={1.8} />
          Drive
        </button>
      </div>
    </div>
  );
}

export function FuelPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = (location.state as FuelPageLocationState | null) || null;
  const initialTarget = locationState?.initialFuelTarget || null;
  const initialFuelSearchQuery = String(locationState?.initialFuelSearchQuery || '').trim();
  const initialSearchMode = locationState?.initialSearchMode;

  const [activeTab, setActiveTab] = useState<'search' | 'insights' | 'news'>('search');
  const [searchMode, setSearchMode] = useState<SearchMode>(initialTarget ? 'map' : 'list');
  const [searchFuel, setSearchFuel] = useState<CanonicalFuelCategory>('unleaded_up');
  const [selectedBrand, setSelectedBrand] = useState('all');
  const [selectedSort, setSelectedSort] = useState<StationSort>('best');
  const [selectedDistanceBand, setSelectedDistanceBand] = useState<DistanceBand>('all');
  const [postCodeQuery, setPostCodeQuery] = useState('');
  const [fuelLoading, setFuelLoading] = useState(false);
  const [fuelResults, setFuelResults] = useState<FuelStationResult[]>([]);
  const [fuelError, setFuelError] = useState<string | null>(null);
  const [fuelSupported, setFuelSupported] = useState(true);
  const [fuelState, setFuelState] = useState('');
  const [fuelTargetLabel, setFuelTargetLabel] = useState('');
  const [fuelSearchQuery, setFuelSearchQuery] = useState('');
  const [fuelSearchResults, setFuelSearchResults] = useState<NominatimResult[]>([]);
  const [fuelSearchLoading, setFuelSearchLoading] = useState(false);
  const [showFuelSearchResults, setShowFuelSearchResults] = useState(false);
  const [fuelTarget, setFuelTarget] = useState<FuelTarget | null>(null);
  const [fuelResolvedQueryKey, setFuelResolvedQueryKey] = useState('');
  const [fuelResultsStale, setFuelResultsStale] = useState(false);
  const [selectedMapStation, setSelectedMapStation] = useState<FuelStationResult | null>(null);
  const [mapViewState, setMapViewState] = useState({ longitude: 151.2093, latitude: -33.8688, zoom: 11.8 });

  const [insightState, setInsightState] = useState<FuelStateCode>('NSW');
  const [insightFuel, setInsightFuel] = useState<CanonicalFuelCategory>('unleaded_up');
  const [insightTool, setInsightTool] = useState<FuelInsightTool>('overview');
  const [trendWindow, setTrendWindow] = useState(30);
  const [insights, setInsights] = useState<FuelInsightsResponse | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);
  const [newsItems, setNewsItems] = useState<FuelNewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsError, setNewsError] = useState<string | null>(null);
  const [newsCarouselApi, setNewsCarouselApi] = useState<CarouselApi | null>(null);
  const [newsIndex, setNewsIndex] = useState(0);

  const [tankSize, setTankSize] = useState('50');
  const [fillUpsPerMonth, setFillUpsPerMonth] = useState('4');
  const [usualPrice, setUsualPrice] = useState('');
  const [cheaperPrice, setCheaperPrice] = useState('');
  const searchRequestRef = useRef(0);
  const consumedInitialStateKeyRef = useRef<string | null>(null);

  const normalizedResults = useMemo(() => {
    const grouped = new Map<string, FuelStationResult>();
    fuelResults.forEach((station) => {
      const normalizedCategory = normalizeFuelCategoryForDisplay(station.fuel_category, station.fuel_type);
      if (normalizedCategory !== searchFuel) return;
      const key = `${station.id}:${normalizedCategory}`;
      const normalizedStation: FuelStationResult = {
        ...station,
        fuel_category: normalizedCategory,
      };
      const existing = grouped.get(key);
      if (!existing || ((normalizedStation.price_cpl ?? Infinity) < (existing.price_cpl ?? Infinity))) {
        grouped.set(key, normalizedStation);
      }
    });
    return Array.from(grouped.values());
  }, [fuelResults, searchFuel]);

  const brandOptions = useMemo(() => {
    const brands = Array.from(new Set(normalizedResults.map((station) => getBrandName(station)).filter(Boolean)));
    return ['all', ...brands];
  }, [normalizedResults]);

  const filteredResults = useMemo(() => {
    const distanceLimit = getDistanceBandMax(selectedDistanceBand);
    return normalizedResults.filter((station) => {
      if (selectedBrand !== 'all' && getBrandName(station) !== selectedBrand) return false;
      return getDistanceValue(station) <= distanceLimit;
    });
  }, [normalizedResults, selectedBrand, selectedDistanceBand]);

  const visibleFuelResults = useMemo(() => {
    const items = [...filteredResults];
    if (selectedSort === 'price') {
      return items.sort((a, b) => (a.price_cpl ?? Infinity) - (b.price_cpl ?? Infinity));
    }
    if (selectedSort === 'distance') {
      return items.sort((a, b) => getDistanceValue(a) - getDistanceValue(b));
    }
    const priceRank = [...items].sort((a, b) => (a.price_cpl ?? Infinity) - (b.price_cpl ?? Infinity));
    const distanceRank = [...items].sort((a, b) => getDistanceValue(a) - getDistanceValue(b));
    const scoreById = new Map<string, number>();
    priceRank.forEach((station, index) => scoreById.set(station.id, (scoreById.get(station.id) || 0) + index * 0.65));
    distanceRank.forEach((station, index) => scoreById.set(station.id, (scoreById.get(station.id) || 0) + index * 0.35));
    return items.sort((a, b) => (scoreById.get(a.id) || 0) - (scoreById.get(b.id) || 0));
  }, [filteredResults, selectedSort]);

  const activeFuelQueryKey = useMemo(
    () => buildFuelQueryKey(fuelTarget, searchFuel),
    [fuelTarget, searchFuel],
  );
  const hasFreshFuelResults = !fuelResultsStale && fuelResolvedQueryKey === activeFuelQueryKey;

  const savings = useMemo(() => {
    const tank = Number(tankSize);
    const fills = Number(fillUpsPerMonth);
    const usual = Number(usualPrice);
    const cheaper = Number(cheaperPrice);
    if (![tank, fills, usual, cheaper].every((value) => Number.isFinite(value))) {
      return { perFill: 0, monthly: 0, annual: 0 };
    }
    const perFill = ((usual - cheaper) / 100) * tank;
    const monthly = perFill * fills;
    return {
      perFill,
      monthly,
      annual: monthly * 12,
    };
  }, [cheaperPrice, fillUpsPerMonth, tankSize, usualPrice]);

  const featuredNews = (insights?.featuredNews?.length ? insights.featuredNews : newsItems).slice(0, 6);
  const coveragePercent = Math.min(100, Math.round(((insights?.coverage.daysCollected || 0) / (insights?.coverage.daysNeeded || 30)) * 100));
  const comparisonChartData = useMemo(
    () => (insights?.comparison || []).map((entry) => ({
      ...entry,
      label: entry.state,
      averageCpl: entry.averagePriceCpl ?? 0,
      fill: entry.state === insightState ? '#EE811A' : '#CBD5E1',
    })),
    [insightState, insights?.comparison],
  );
  const trendPoints = useMemo(
    () => (insights?.trend.points || []).filter((point) => point.averageCpl != null).slice(-trendWindow),
    [insights?.trend.points, trendWindow],
  );
  const forecastChartData = useMemo(() => getForecastLineData(insights), [insights]);

  const runFuelLookup = async (target: FuelTarget) => {
    const requestId = ++searchRequestRef.current;
    const queryKey = buildFuelQueryKey(target, searchFuel);
    setFuelTarget(target);
    setFuelTargetLabel(target.label);
    setFuelState(target.state || '');
    setFuelLoading(true);
    setFuelError(null);
    setFuelResults([]);
    setFuelResolvedQueryKey('');
    setFuelResultsStale(true);
    setFuelSupported(true);
    setSelectedBrand('all');

    if (target.state && !SUPPORTED_SEARCH_STATES.has(target.state)) {
      setFuelSupported(false);
      setFuelLoading(false);
      setFuelResolvedQueryKey(queryKey);
      setFuelResultsStale(false);
      setFuelError(`${target.state} fuel search is coming soon in ${APP_CONFIG.displayName}.`);
      return;
    }

    try {
      const response = await fetchNearbyFuelStations({
        lat: target.lat,
        lng: target.lng,
        state: target.state,
        suburb: target.suburb,
        targetLabel: target.label,
        products: [searchFuel],
      });
      if (requestId !== searchRequestRef.current) return;
      setFuelSupported(response.supported);
      setFuelState(response.state || target.state || '');
      setFuelTargetLabel(response.targetLabel || target.label);
      setFuelResults(
        (response.results || []).map((station) => ({
          ...station,
          fuel_category: normalizeFuelCategoryForDisplay(station.fuel_category, station.fuel_type),
        })),
      );
      setFuelResolvedQueryKey(queryKey);
      setFuelResultsStale(false);
      setFuelError(response.supported ? null : (response.message || 'Fuel price support is coming soon in this state.'));
    } catch (err) {
      if (requestId !== searchRequestRef.current) return;
      console.error('GHAR fuel page lookup error:', err);
      setFuelSupported(false);
      setFuelState(target.state || '');
      setFuelResults([]);
      setFuelResolvedQueryKey(queryKey);
      setFuelResultsStale(false);
      setFuelError(err instanceof Error ? err.message : 'Failed to load nearby fuel stations');
    } finally {
      if (requestId === searchRequestRef.current) setFuelLoading(false);
    }
  };

  const handleUseCurrentLocation = async () => {
    searchRequestRef.current += 1;
    setFuelLoading(true);
    setFuelError(null);
    setFuelResults([]);
    setFuelResolvedQueryKey('');
    setFuelResultsStale(true);
    try {
      const position = await getCurrentAppPosition({ timeout: 10000, maximumAge: 0 });
      setSearchMode('map');
      await runFuelLookup({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        state: '',
        suburb: '',
        label: 'Current location',
      });
    } catch (error) {
      console.error('GHAR fuel current-location error:', error);
      setFuelResults([]);
      setFuelSupported(false);
      setFuelLoading(false);
      setFuelTarget(null);
      setFuelTargetLabel('Current location');
      setFuelState('');
      setFuelResolvedQueryKey('');
      setFuelResultsStale(false);
      setFuelError('Allow location access or search an address or postcode to compare nearby stations.');
    }
  };

  const resetSearchVisualState = () => {
    searchRequestRef.current += 1;
    setFuelResults([]);
    setFuelResolvedQueryKey('');
    setFuelResultsStale(true);
    setFuelError(null);
    setFuelLoading(false);
    setFuelSupported(true);
    setFuelTarget(null);
    setFuelTargetLabel('');
    setFuelState('');
    setSelectedMapStation(null);
  };

  const handleFuelSearchQueryChange = (value: string) => {
    setFuelSearchQuery(value);
    if (searchMode !== 'postcode') {
      resetSearchVisualState();
    }
  };

  const handleSearchSubmit = async (queryOverride?: string) => {
    const query = String(queryOverride ?? fuelSearchQuery).trim();
    if (query.length < 2) return;
    searchRequestRef.current += 1;
    setFuelSearchLoading(true);
    setShowFuelSearchResults(false);
    resetSearchVisualState();
    try {
      const results = await searchAddress(query);
      const filtered = filterFuelSearchResults(results, query);
      setFuelSearchResults(filtered);
      if (filtered.length === 0) {
        setFuelError('Search a nearby Australian address or postcode to compare fuel prices.');
        return;
      }
      const target = buildLocationTarget(filtered[0]);
      setFuelSearchQuery(filtered[0].display_name);
      await runFuelLookup(target);
    } catch (err) {
      console.error('GHAR fuel page search submit error:', err);
      setFuelError('Failed to resolve that address. Please try another nearby suburb or postcode.');
    } finally {
      setFuelSearchLoading(false);
    }
  };

  const handlePostcodeSubmit = async () => {
    const trimmed = postCodeQuery.trim();
    if (trimmed.length < 4) return;
    await handleSearchSubmit(trimmed);
  };

  const handleDriveToFuelStation = (station: FuelStationResult) => {
    const label = encodeURIComponent(station.name || station.brand || 'Fuel station');
    const isAndroid = /Android/i.test(navigator.userAgent);
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isAndroid) {
      window.location.href = `geo:${station.lat},${station.lng}?q=${station.lat},${station.lng}(${label})`;
      return;
    }
    if (isIOS) {
      window.location.href = `https://maps.apple.com/?daddr=${station.lat},${station.lng}&q=${label}`;
      return;
    }
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}&travelmode=driving`, '_blank', 'noopener,noreferrer');
  };

  useEffect(() => {
    if (consumedInitialStateKeyRef.current === location.key) return;
    consumedInitialStateKeyRef.current = location.key;

    if (initialTarget) {
      setActiveTab('search');
      setSearchMode('map');
      setFuelTarget(initialTarget);
      setFuelTargetLabel(initialTarget.label);
      setFuelState(initialTarget.state || '');
      setFuelSearchQuery(initialTarget.label);
      void runFuelLookup(initialTarget);
      return;
    }

    if (!initialFuelSearchQuery) return;

    setActiveTab('search');
    setFuelError(null);
    setFuelSearchResults([]);
    setShowFuelSearchResults(false);
    setSelectedMapStation(null);

    if (initialSearchMode === 'postcode') {
      setSearchMode('postcode');
      setPostCodeQuery(initialFuelSearchQuery);
      setFuelSearchQuery('');
      void handleSearchSubmit(initialFuelSearchQuery);
      return;
    }

    setSearchMode('list');
    setFuelSearchQuery(initialFuelSearchQuery);
    setPostCodeQuery('');
    void handleSearchSubmit(initialFuelSearchQuery);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFuelSearchQuery, initialSearchMode, initialTarget, location.key]);

  useEffect(() => {
    const query = fuelSearchQuery.trim();
    if (searchMode === 'postcode' || query.length < 2) {
      setFuelSearchResults([]);
      setShowFuelSearchResults(false);
      setFuelSearchLoading(false);
      return;
    }

    let cancelled = false;
    const timeout = window.setTimeout(async () => {
      try {
        setFuelSearchLoading(true);
        const results = await searchAddress(query);
        if (cancelled) return;
        const filtered = filterFuelSearchResults(results, query);
        setFuelSearchResults(filtered);
        setShowFuelSearchResults(filtered.length > 0);
      } catch {
        if (cancelled) return;
        setFuelSearchResults([]);
        setShowFuelSearchResults(false);
      } finally {
        if (!cancelled) setFuelSearchLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [fuelSearchQuery, searchMode]);

  useEffect(() => {
    if (!fuelTarget || !fuelTarget.state) return;
    const normalized = normalizeAustralianStateLabel(fuelTarget.state);
    if (SUPPORTED_INSIGHT_STATES.includes(normalized)) {
      setInsightState(normalized);
    }
  }, [fuelTarget]);

  useEffect(() => {
    if (!fuelTarget) return;
    if (!SUPPORTED_SEARCH_STATES.has(fuelTarget.state || '')) return;
    void runFuelLookup(fuelTarget);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchFuel]);

  useEffect(() => {
    if (!brandOptions.includes(selectedBrand)) {
      setSelectedBrand('all');
    }
  }, [brandOptions, selectedBrand]);

  useEffect(() => {
    if (visibleFuelResults.length === 0) {
      setSelectedMapStation(null);
      return;
    }
    if (!selectedMapStation || !visibleFuelResults.some((station) => station.id === selectedMapStation.id)) {
      setSelectedMapStation(visibleFuelResults[0]);
    }
  }, [selectedMapStation, visibleFuelResults]);

  useEffect(() => {
    const focus = selectedMapStation || fuelTarget;
    if (!focus) return;
    setMapViewState((current) => ({
      ...current,
      longitude: 'lng' in focus ? focus.lng : current.longitude,
      latitude: 'lat' in focus ? focus.lat : current.latitude,
      zoom: selectedMapStation ? Math.max(current.zoom, 12.8) : 12.2,
    }));
  }, [fuelTarget, selectedMapStation]);

  useEffect(() => {
    if (activeTab !== 'insights') return;
    if (!SUPPORTED_INSIGHT_STATES.includes(insightState)) {
      setInsights(null);
      setInsightsError(null);
      setInsightsLoading(false);
      return;
    }

    let cancelled = false;
    setInsightsLoading(true);
    setInsightsError(null);

    void fetchFuelInsights(insightState, insightFuel, insightTool)
      .then((response) => {
        if (cancelled) return;
        setInsights(response);
        setUsualPrice(response.savings.averagePriceCpl != null ? String(Math.round(response.savings.averagePriceCpl)) : '');
        setCheaperPrice(response.savings.cheapestPriceCpl != null ? String(Math.round(response.savings.cheapestPriceCpl)) : '');
      })
      .catch((err) => {
        console.error('GHAR fuel insights fetch failed:', err);
        if (cancelled) return;
        setInsightsError(getFriendlyFuelErrorMessage(err, 'Fuel insights are unavailable right now.'));
      })
      .finally(() => {
        if (!cancelled) setInsightsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeTab, insightFuel, insightState, insightTool]);

  useEffect(() => {
    let cancelled = false;
    setNewsLoading(true);
    setNewsError(null);

    void fetchFuelNews()
      .then((items) => {
        if (cancelled) return;
        setNewsItems(items);
      })
      .catch((err) => {
        console.error('GHAR fuel news fetch failed:', err);
        if (cancelled) return;
        setNewsError(getFriendlyFuelErrorMessage(err, 'Fuel news is unavailable right now.'));
      })
      .finally(() => {
        if (!cancelled) setNewsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!newsCarouselApi) return;
    const updateSelection = () => setNewsIndex(newsCarouselApi.selectedScrollSnap());
    updateSelection();
    newsCarouselApi.on('select', updateSelection);
    newsCarouselApi.on('reInit', updateSelection);
    return () => {
      newsCarouselApi.off('select', updateSelection);
    };
  }, [newsCarouselApi]);

  const renderSearchControls = () => (
    <>
      <div className="grid grid-cols-3 rounded-[22px] bg-[#F8FAFC] p-1">
        {([
          { id: 'list', label: 'List View', icon: List },
          { id: 'map', label: 'Map View', icon: MapIcon },
          { id: 'postcode', label: 'Postcode', icon: Search },
        ] as Array<{ id: SearchMode; label: string; icon: typeof List }>).map((mode) => {
          const active = searchMode === mode.id;
          const Icon = mode.icon;
          return (
            <button
              key={mode.id}
              onClick={() => setSearchMode(mode.id)}
              className={`rounded-[18px] px-3 py-3 text-[12px] font-semibold transition-colors cursor-pointer ${
                active
                  ? 'bg-white text-[#0F172A] shadow-[0_10px_24px_rgba(15,23,42,0.08)]'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              <span className="inline-flex items-center justify-center gap-1.5">
                <Icon className="w-3.5 h-3.5" strokeWidth={1.8} />
                {mode.label}
              </span>
            </button>
          );
        })}
      </div>

      {searchMode !== 'postcode' ? (
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
                void handleSearchSubmit();
              }
            }}
            onFocus={() => {
              if (fuelSearchResults.length > 0) setShowFuelSearchResults(true);
            }}
            placeholder="Search by address or postcode"
            className="w-full h-[52px] pl-11 pr-12 bg-[#F8FAFC] border border-[#D7E3F4] rounded-[24px] focus:ring-2 focus:ring-[#EE811A]/20 focus:border-[#EE811A]/40 outline-none transition-all text-[15px] text-[#0F172A] placeholder-[#94A3B8]"
          />
          {fuelSearchLoading && (
            <div className="absolute inset-y-0 right-4 flex items-center">
              <Loader2 className="w-4 h-4 text-[#EE811A] animate-spin" />
            </div>
          )}
          {showFuelSearchResults && fuelSearchResults.length > 0 && (
            <ul className="absolute z-20 mt-2 w-full bg-white border border-[#E2E8F0] rounded-[24px] shadow-[0_18px_48px_rgba(15,23,42,0.12)] max-h-64 overflow-y-auto">
              {fuelSearchResults.map((result) => (
                <li key={result.place_id}>
                  <button
                    onClick={() => {
                      setFuelSearchQuery(result.display_name);
                      setFuelSearchResults([]);
                      setShowFuelSearchResults(false);
                      void runFuelLookup(buildLocationTarget(result));
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-[#F8FAFC] transition-colors cursor-pointer flex items-start gap-3 border-b border-[#F1F5F9] last:border-none"
                  >
                    <MapPin className="w-4 h-4 text-[#EE811A] mt-0.5 shrink-0" strokeWidth={1.5} />
                    <div className="min-w-0">
                      <p className="text-sm text-[#0F172A] font-medium truncate">{result.display_name.split(',')[0]}</p>
                      <p className="text-[11px] text-[#94A3B8] truncate">{result.display_name.split(',').slice(1, 4).join(',')}</p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-[22px] bg-[#F8FAFC] p-1 inline-grid grid-cols-1 w-full">
            <div className="rounded-[18px] bg-white px-4 py-2.5 text-center text-[12px] font-semibold text-[#0F172A] shadow-sm">
              Australia postcode lookup
            </div>
          </div>
          <input
            value={postCodeQuery}
            onChange={(e) => setPostCodeQuery(e.target.value.replace(/[^\d]/g, '').slice(0, 4))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void handlePostcodeSubmit();
              }
            }}
            inputMode="numeric"
            placeholder="Enter postcode"
            className="w-full h-[52px] px-4 bg-[#F8FAFC] border border-[#D7E3F4] rounded-[24px] focus:ring-2 focus:ring-[#EE811A]/20 focus:border-[#EE811A]/40 outline-none transition-all text-[15px] text-[#0F172A] placeholder-[#94A3B8]"
          />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-[1.15fr_1fr_1fr] gap-3">
        <button
          onClick={() => void handleUseCurrentLocation()}
          className="inline-flex items-center justify-center gap-2 rounded-[20px] border border-[#D7E3F4] bg-white px-4 py-3 text-[13px] font-semibold text-[#1E40AF] hover:bg-[#EFF6FF] cursor-pointer"
        >
          <Crosshair className="w-4 h-4" strokeWidth={1.8} />
          Use current location
        </button>

        <Select value={searchFuel} onValueChange={(value) => setSearchFuel(value as CanonicalFuelCategory)}>
          <SelectTrigger className="h-12 rounded-[20px] border-[#D7E3F4] bg-[#F8FAFC] px-4 text-[13px]">
            <SelectValue placeholder="Fuel type" />
          </SelectTrigger>
          <SelectContent>
            {FUEL_PRODUCT_OPTIONS.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.searchLabel}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedBrand} onValueChange={setSelectedBrand}>
          <SelectTrigger className="h-12 rounded-[20px] border-[#D7E3F4] bg-[#F8FAFC] px-4 text-[13px]">
            <SelectValue placeholder="All brands" />
          </SelectTrigger>
          <SelectContent>
            {brandOptions.map((brand) => (
              <SelectItem key={brand} value={brand}>
                {brand === 'all' ? 'All brands' : brand}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {searchMode !== 'map' && (
        <div className="grid grid-cols-2 gap-3">
          <Select value={selectedDistanceBand} onValueChange={(value) => setSelectedDistanceBand(value as DistanceBand)}>
            <SelectTrigger className="h-11 rounded-[18px] border-[#D7E3F4] bg-white px-4 text-[12px]">
              <SelectValue placeholder="Distance" />
            </SelectTrigger>
            <SelectContent>
              {DISTANCE_OPTIONS.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedSort} onValueChange={(value) => setSelectedSort(value as StationSort)}>
            <SelectTrigger className="h-11 rounded-[18px] border-[#D7E3F4] bg-white px-4 text-[12px]">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <button
        onClick={() => {
          if (searchMode === 'postcode') {
            void handlePostcodeSubmit();
            return;
          }
          void handleSearchSubmit();
        }}
        className="w-full rounded-[22px] bg-[#F6B63C] px-4 py-3.5 text-[14px] font-semibold text-[#0F172A] shadow-[0_12px_30px_rgba(246,182,60,0.28)] cursor-pointer hover:brightness-[0.98]"
      >
        Find Stations
      </button>
    </>
  );

  const renderMapSearch = () => {
    if (fuelLoading) {
      return (
        <div className="rounded-[28px] border border-[#E2E8F0] bg-white px-4 py-5 text-sm text-[#64748B] flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-[#EE811A]" />
          Loading nearby fuel prices...
        </div>
      );
    }

    if (fuelError && !hasFreshFuelResults) {
      return (
        <div className="rounded-[28px] border border-[#E2E8F0] bg-white px-4 py-5">
          <p className="text-[18px] font-semibold text-[#0F172A]">{getErrorHeading(fuelError)}</p>
          <p className="text-sm text-[#64748B] mt-2">{fuelError}</p>
        </div>
      );
    }

    if (!fuelTarget || !hasFreshFuelResults || visibleFuelResults.length === 0) {
      return (
        <div className="rounded-[28px] border border-dashed border-[#CBD5E1] bg-white px-4 py-6 text-sm text-[#64748B] leading-relaxed">
          Search an address, suburb, or postcode to populate the map with live station prices for the selected fuel.
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="rounded-[30px] border border-[#E2E8F0] bg-white p-3 shadow-[0_14px_34px_rgba(15,23,42,0.08)]">
          <div className="relative overflow-hidden rounded-[24px] h-[360px]">
            <MapGL
              longitude={mapViewState.longitude}
              latitude={mapViewState.latitude}
              zoom={mapViewState.zoom}
              onMove={(event) => setMapViewState((current) => ({ ...current, ...event.viewState }))}
              mapStyle={MAP_STYLE_URL}
              reuseMaps
              attributionControl={false}
            >
              <NavigationControl position="top-right" showCompass={false} />
              {visibleFuelResults.map((station) => {
                const active = selectedMapStation?.id === station.id;
                return (
                  <Marker key={`${station.id}-${station.fuel_category}`} longitude={station.lng} latitude={station.lat} anchor="bottom">
                    <button
                      onClick={() => setSelectedMapStation(station)}
                      className={`rounded-2xl border px-2.5 py-1.5 shadow-lg cursor-pointer ${
                        active
                          ? 'bg-[#0F172A] border-[#0F172A] text-white'
                          : 'bg-white border-[#FDE68A] text-[#D97706]'
                      }`}
                    >
                      <span className="text-[11px] font-bold">{formatPrice(station.price_cpl)}</span>
                    </button>
                  </Marker>
                );
              })}
            </MapGL>
            <button
              onClick={() => void handleUseCurrentLocation()}
              className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-full bg-white/95 px-3 py-2 text-[12px] font-semibold text-[#0F172A] shadow-[0_10px_24px_rgba(15,23,42,0.12)] cursor-pointer"
            >
              <Crosshair className="w-3.5 h-3.5" strokeWidth={1.8} />
              Reset
            </button>
          </div>
        </div>

        {selectedMapStation && (
          <StationCard station={selectedMapStation} onDrive={handleDriveToFuelStation} />
        )}
      </div>
    );
  };

  const renderListSearch = () => {
    if (fuelLoading) {
      return (
        <div className="rounded-[28px] border border-[#E2E8F0] bg-white px-4 py-5 text-sm text-[#64748B] flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-[#EE811A]" />
          Loading nearby fuel prices...
        </div>
      );
    }

    if (fuelError && !hasFreshFuelResults) {
      return (
        <div className="rounded-[28px] border border-[#E2E8F0] bg-white px-4 py-5">
          <p className="text-[18px] font-semibold text-[#0F172A]">{getErrorHeading(fuelError)}</p>
          <p className="text-sm text-[#64748B] mt-2">{fuelError}</p>
        </div>
      );
    }

    if (!fuelTarget) {
      return (
        <div className="rounded-[28px] border border-dashed border-[#CBD5E1] bg-white px-4 py-6 text-sm text-[#64748B] leading-relaxed">
          Use list view to compare the best nearby stations by price, brand, and distance for the fuel type you actually want.
        </div>
      );
    }

    if (hasFreshFuelResults && visibleFuelResults.length === 0) {
      return (
        <div className="rounded-[28px] border border-[#E2E8F0] bg-white px-4 py-5 text-sm text-[#64748B]">
          No nearby fuel stations matched this filter set yet.
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {hasFreshFuelResults && (
          <div className="rounded-[26px] border border-[#E2E8F0] bg-white px-4 py-4">
            <p className="text-[10px] tracking-[0.24em] uppercase text-[#94A3B8] font-bold">Searching around</p>
            <p className="text-[15px] font-semibold text-[#0F172A] mt-2 leading-snug">{fuelTargetLabel}</p>
            <p className="text-[12px] text-[#64748B] mt-2">
              {visibleFuelResults.length} station{visibleFuelResults.length === 1 ? '' : 's'} shown • sorted by {SORT_OPTIONS.find((option) => option.id === selectedSort)?.label.toLowerCase()}
            </p>
          </div>
        )}

        {visibleFuelResults.map((station, index) => (
          <StationCard key={`${station.id}-${station.fuel_category}`} station={station} rank={index} onDrive={handleDriveToFuelStation} />
        ))}
      </div>
    );
  };

  const renderNewsCarousel = () => {
    if (newsLoading && featuredNews.length === 0) {
      return (
        <div className="rounded-[28px] border border-[#E2E8F0] bg-white p-5 text-sm text-[#64748B] flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-[#EE811A]" />
          Loading Australia fuel headlines...
        </div>
      );
    }

    if (featuredNews.length === 0) {
      return (
        <div className="rounded-[28px] border border-[#E2E8F0] bg-white p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] tracking-[0.22em] uppercase text-[#94A3B8] font-bold">Fuel News</p>
              <h2 className="text-lg font-semibold text-[#0F172A] mt-2">Australia fuel headlines</h2>
              <p className="text-sm text-[#64748B] mt-1">
                {newsError || 'Fresh fuel news is unavailable right now.'}
              </p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center shrink-0">
              <Newspaper className="w-5 h-5 text-[#64748B]" strokeWidth={1.8} />
            </div>
          </div>
        </div>
      );
    }

    return (
      <section className="rounded-[30px] border border-[#E2E8F0] bg-white p-5 shadow-[0_12px_32px_rgba(15,23,42,0.06)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] tracking-[0.22em] uppercase text-[#94A3B8] font-bold">Fuel News</p>
            <h2 className="text-lg font-semibold text-[#0F172A] mt-2">What is shaping the market</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => newsCarouselApi?.scrollPrev()}
              className="inline-flex size-9 items-center justify-center rounded-full border border-[#E2E8F0] bg-white text-[#475569] cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" strokeWidth={2} />
            </button>
            <button
              onClick={() => newsCarouselApi?.scrollNext()}
              className="inline-flex size-9 items-center justify-center rounded-full border border-[#E2E8F0] bg-white text-[#475569] cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" strokeWidth={2} />
            </button>
          </div>
        </div>

        <div className="mt-4">
          <Carousel setApi={setNewsCarouselApi}>
            <CarouselContent>
              {featuredNews.map((item) => (
                <CarouselItem key={item.id}>
                  <button
                    onClick={() => window.open(item.link, '_blank', 'noopener,noreferrer')}
                    className="w-full rounded-[24px] border border-[#E2E8F0] bg-[#F8FAFC] p-4 text-left cursor-pointer hover:border-[#EE811A]/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] tracking-[0.2em] uppercase text-[#94A3B8] font-bold">{item.source}</p>
                        <h3 className="text-[17px] leading-snug font-semibold text-[#0F172A] mt-2">{item.title}</h3>
                        <p className="text-[13px] text-[#64748B] mt-3 leading-relaxed">
                          {item.summary || 'Open the article for the latest coverage on Australian fuel prices, supply, and cost-of-living pressure.'}
                        </p>
                      </div>
                      <div className="shrink-0 rounded-2xl bg-white px-3 py-2 text-[#EE811A] border border-[#FDE68A]">
                        <ExternalLink className="w-4 h-4" strokeWidth={1.8} />
                      </div>
                    </div>
                    {item.publishedAt && (
                      <p className="text-[11px] text-[#94A3B8] mt-4">
                        {format(new Date(item.publishedAt), 'dd MMM yyyy, h:mm a')}
                      </p>
                    )}
                  </button>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        </div>

        <div className="mt-4 flex items-center justify-center gap-2">
          {featuredNews.map((item, index) => (
            <button
              key={item.id}
              onClick={() => newsCarouselApi?.scrollTo(index)}
              className={`h-2.5 rounded-full transition-all cursor-pointer ${
                newsIndex === index ? 'w-7 bg-[#EE811A]' : 'w-2.5 bg-[#CBD5E1]'
              }`}
            />
          ))}
        </div>
      </section>
    );
  };

  const renderOverviewTool = () => {
    if (!insights) return null;
    return (
      <div className="space-y-4">
        <section className="rounded-[30px] border border-[#E2E8F0] bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] tracking-[0.22em] uppercase text-[#94A3B8] font-bold">Overview</p>
              <h2 className="text-xl font-semibold text-[#0F172A] mt-2">{insightState} market snapshot</h2>
              <p className="text-sm text-[#64748B] mt-2">{insights.overview.summary}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-[#FFF7ED] border border-[#FED7AA] flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5 text-[#EE811A]" strokeWidth={1.8} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-5">
            {[
              { label: 'Average', value: formatPrice(insights.overview.currentAverageCpl), tone: 'text-[#EE811A]' },
              { label: 'Cheapest', value: formatPrice(insights.overview.cheapestPriceCpl), tone: 'text-[#16A34A]' },
              { label: 'Spread', value: insights.overview.spreadCpl != null ? `${insights.overview.spreadCpl.toFixed(1)}c/L` : 'N/A', tone: 'text-[#0F172A]' },
              { label: 'Volatility', value: insights.overview.volatilityLabel, tone: 'text-[#1D4ED8]' },
            ].map((card) => (
              <div key={card.label} className="rounded-[24px] bg-[#F8FAFC] px-4 py-4">
                <p className="text-[10px] tracking-[0.18em] uppercase text-[#94A3B8] font-bold">{card.label}</p>
                <p className={`text-[24px] font-bold mt-2 ${card.tone}`}>{card.value}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[30px] border border-[#E2E8F0] bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] tracking-[0.22em] uppercase text-[#94A3B8] font-bold">State Comparison</p>
              <h2 className="text-lg font-semibold text-[#0F172A] mt-2">Where {insightState} sits today</h2>
              <p className="text-sm text-[#64748B] mt-2">
                Rank {insights.overview.stateRank ?? 'N/A'} of {insights.overview.statesCompared || 0} covered states for {FUEL_LABELS[insightFuel].toLowerCase()}.
              </p>
            </div>
          </div>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonChartData}>
                <CartesianGrid stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#64748B', fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: '#64748B', fontSize: 11 }} tickLine={false} axisLine={false} width={42} />
                <Tooltip formatter={(value: number) => `${value.toFixed(1)}c`} />
                <Bar dataKey="averageCpl" radius={[8, 8, 0, 0]} fill="#CBD5E1" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
    );
  };

  const renderForecastTool = () => {
    if (!insights) return null;
    const ready = insights.forecast.status === 'ready';
    return (
      <div className="space-y-4">
        <section className="rounded-[30px] border border-[#E2E8F0] bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] tracking-[0.22em] uppercase text-[#94A3B8] font-bold">AI Forecast</p>
              <h2 className="text-xl font-semibold text-[#0F172A] mt-2">7-day outlook for {insightState}</h2>
              <p className="text-sm text-[#64748B] mt-2">{insights.forecast.summary.explanation}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-[#EEF2FF] border border-[#C7D2FE] flex items-center justify-center shrink-0">
              <BrainCircuit className="w-5 h-5 text-[#4338CA]" strokeWidth={1.8} />
            </div>
          </div>

          <div className="mt-4 rounded-[24px] border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-4">
            <p className="text-[11px] font-semibold text-[#0F172A]">Forecast disclaimer</p>
            <p className="text-[12px] text-[#64748B] mt-1 leading-relaxed">{insights.forecast.summary.disclaimer}</p>
            <p className="text-[12px] text-[#64748B] mt-2 leading-relaxed">{insights.forecast.summary.methodologySummary}</p>
            <p className="text-[12px] text-[#64748B] mt-2 leading-relaxed">
              Trained on {insights.forecast.summary.trainedOnDays || 0} real daily snapshots from the last {insights.forecast.summary.trainingWindowDays || 60} days.
              {insights.forecast.summary.trainedAt ? ` Refreshed ${format(new Date(insights.forecast.summary.trainedAt), 'dd MMM yyyy, h:mm a')}.` : ''}
            </p>
            {insights.forecast.summary.retentionNote && (
              <p className="text-[11px] text-[#94A3B8] mt-2 leading-relaxed">{insights.forecast.summary.retentionNote}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="rounded-[24px] bg-[#F8FAFC] px-4 py-4">
              <p className="text-[10px] tracking-[0.18em] uppercase text-[#94A3B8] font-bold">Model confidence</p>
              <p className="text-[24px] font-bold text-[#4338CA] mt-2">{insights.forecast.accuracy.confidenceScore}%</p>
              <p className="text-[12px] text-[#64748B] mt-1">{insights.forecast.accuracy.confidenceLabel}</p>
            </div>
            <div className="rounded-[24px] bg-[#F8FAFC] px-4 py-4">
              <p className="text-[10px] tracking-[0.18em] uppercase text-[#94A3B8] font-bold">Historical accuracy</p>
              <p className="text-[24px] font-bold text-[#0F172A] mt-2">
                {insights.forecast.accuracy.accuracyPercent != null ? `${insights.forecast.accuracy.accuracyPercent.toFixed(1)}%` : 'Building'}
              </p>
              <p className="text-[12px] text-[#64748B] mt-1">{insights.forecast.accuracy.evaluatedPoints} evaluated points</p>
            </div>
          </div>

          <div className="mt-5 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={forecastChartData}>
                <CartesianGrid stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#64748B', fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: '#64748B', fontSize: 11 }} tickLine={false} axisLine={false} width={42} />
                <Tooltip formatter={(value: number | null) => value == null ? 'N/A' : `${value.toFixed(1)}c`} />
                <Line type="monotone" dataKey="lowerCpl" stroke="#BFDBFE" strokeDasharray="4 4" dot={false} />
                <Line type="monotone" dataKey="upperCpl" stroke="#BFDBFE" strokeDasharray="4 4" dot={false} />
                <Line type="monotone" dataKey="predictedCpl" stroke="#4338CA" strokeWidth={3} dot={{ r: 3, fill: '#4338CA' }} />
                <Line type="monotone" dataKey="actualCpl" stroke="#EE811A" strokeWidth={2} dot={{ r: 3, fill: '#EE811A' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 grid gap-2">
            {insights.forecast.summary.drivers.map((driver) => (
              <div key={driver} className="rounded-2xl bg-[#F8FAFC] px-4 py-3 text-[13px] text-[#475569]">
                {driver}
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  };

  const renderTrendsTool = () => {
    if (!insights) return null;
    return (
      <div className="space-y-4">
        <section className="rounded-[30px] border border-[#E2E8F0] bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] tracking-[0.22em] uppercase text-[#94A3B8] font-bold">Trends</p>
              <h2 className="text-xl font-semibold text-[#0F172A] mt-2">Real price history for {FUEL_LABELS[insightFuel]}</h2>
              <p className="text-sm text-[#64748B] mt-2">{insights.trend.message || 'Built from real statewide daily snapshots only.'}</p>
            </div>
            <div className="flex items-center gap-2">
              {TREND_WINDOWS.map((window) => (
                <button
                  key={window.id}
                  onClick={() => setTrendWindow(window.id)}
                  className={`rounded-full px-3 py-1.5 text-[11px] font-semibold cursor-pointer ${
                    trendWindow === window.id ? 'bg-[#0F172A] text-white' : 'bg-[#F8FAFC] text-[#64748B]'
                  }`}
                >
                  {window.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-5">
            <div className="rounded-[24px] bg-[#F8FAFC] px-4 py-4">
              <p className="text-[10px] tracking-[0.18em] uppercase text-[#94A3B8] font-bold">Current</p>
              <p className="text-[22px] font-bold text-[#EE811A] mt-2">{formatPrice(insights.trend.currentAverageCpl)}</p>
            </div>
            <div className="rounded-[24px] bg-[#F8FAFC] px-4 py-4">
              <p className="text-[10px] tracking-[0.18em] uppercase text-[#94A3B8] font-bold">Delta</p>
              <p className={`text-[22px] font-bold mt-2 ${(insights.trend.deltaCpl || 0) >= 0 ? 'text-[#DC2626]' : 'text-[#16A34A]'}`}>
                {insights.trend.deltaCpl == null ? 'N/A' : `${insights.trend.deltaCpl > 0 ? '+' : ''}${insights.trend.deltaCpl.toFixed(1)}c`}
              </p>
            </div>
            <div className="rounded-[24px] bg-[#F8FAFC] px-4 py-4">
              <p className="text-[10px] tracking-[0.18em] uppercase text-[#94A3B8] font-bold">Coverage</p>
              <p className="text-[22px] font-bold text-[#0F172A] mt-2">{insights.coverage.daysCollected}d</p>
            </div>
          </div>

          <div className="mt-5 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendPoints}>
                <CartesianGrid stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#64748B', fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: '#64748B', fontSize: 11 }} tickLine={false} axisLine={false} width={42} />
                <Tooltip formatter={(value: number | null) => value == null ? 'N/A' : `${value.toFixed(1)}c`} />
                <Line type="monotone" dataKey="minCpl" stroke="#C7D2FE" strokeDasharray="3 4" dot={false} />
                <Line type="monotone" dataKey="maxCpl" stroke="#FCA5A5" strokeDasharray="3 4" dot={false} />
                <Line type="monotone" dataKey="averageCpl" stroke="#EE811A" strokeWidth={3} dot={{ r: 3, fill: '#EE811A' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
    );
  };

  const renderTimingTool = () => {
    if (!insights) return null;
    return (
      <div className="space-y-4">
        <section className="rounded-[30px] border border-[#E2E8F0] bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] tracking-[0.22em] uppercase text-[#94A3B8] font-bold">Timing</p>
              <h2 className="text-xl font-semibold text-[#0F172A] mt-2">Best day to fill up in {insightState}</h2>
              <p className="text-sm text-[#64748B] mt-2">{insights.bestTime.message || `${insights.bestTime.bestDay} is currently the cheapest weekday pattern.`}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-[#ECFDF5] border border-[#BBF7D0] flex items-center justify-center shrink-0">
              <Clock3 className="w-5 h-5 text-[#16A34A]" strokeWidth={1.8} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-5">
            <div className="rounded-[24px] bg-[#F8FAFC] px-4 py-4">
              <p className="text-[10px] tracking-[0.18em] uppercase text-[#94A3B8] font-bold">Best day</p>
              <p className="text-[22px] font-bold text-[#16A34A] mt-2">{insights.bestTime.bestDay || 'Building'}</p>
            </div>
            <div className="rounded-[24px] bg-[#F8FAFC] px-4 py-4">
              <p className="text-[10px] tracking-[0.18em] uppercase text-[#94A3B8] font-bold">Avoid</p>
              <p className="text-[22px] font-bold text-[#DC2626] mt-2">{insights.bestTime.worstDay || 'Building'}</p>
            </div>
            <div className="rounded-[24px] bg-[#F8FAFC] px-4 py-4">
              <p className="text-[10px] tracking-[0.18em] uppercase text-[#94A3B8] font-bold">Potential save</p>
              <p className="text-[22px] font-bold text-[#0F172A] mt-2">
                {insights.bestTime.estimatedSaveCpl != null ? `${insights.bestTime.estimatedSaveCpl.toFixed(1)}c/L` : 'TBD'}
              </p>
            </div>
          </div>

          <div className="mt-5 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={insights.bestTime.weekdaySeries}>
                <CartesianGrid stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: '#64748B', fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: '#64748B', fontSize: 11 }} tickLine={false} axisLine={false} width={42} />
                <Tooltip formatter={(value: number | null) => value == null ? 'N/A' : `${value.toFixed(1)}c`} />
                <Bar dataKey="averageCpl" fill="#16A34A" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
    );
  };

  const renderSavingsTool = () => {
    if (!insights) return null;
    return (
      <div className="space-y-4">
        <section className="rounded-[30px] border border-[#E2E8F0] bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] tracking-[0.22em] uppercase text-[#94A3B8] font-bold">Savings</p>
              <h2 className="text-xl font-semibold text-[#0F172A] mt-2">What cheaper fuel means over time</h2>
              <p className="text-sm text-[#64748B] mt-2">
                Defaults come from the latest {insightState} snapshot for {FUEL_LABELS[insightFuel].toLowerCase()}.
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center shrink-0">
              <Calculator className="w-5 h-5 text-[#1D4ED8]" strokeWidth={1.8} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-[#0F172A]">Tank size (litres)</span>
              <input
                value={tankSize}
                onChange={(e) => setTankSize(e.target.value)}
                inputMode="decimal"
                className="w-full h-12 px-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[20px] outline-none focus:border-[#1D4ED8] text-sm"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-[#0F172A]">Fill-ups per month</span>
              <input
                value={fillUpsPerMonth}
                onChange={(e) => setFillUpsPerMonth(e.target.value)}
                inputMode="decimal"
                className="w-full h-12 px-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[20px] outline-none focus:border-[#1D4ED8] text-sm"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-[#0F172A]">Your usual price (c/L)</span>
              <input
                value={usualPrice}
                onChange={(e) => setUsualPrice(e.target.value)}
                inputMode="decimal"
                className="w-full h-12 px-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[20px] outline-none focus:border-[#1D4ED8] text-sm"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-[#0F172A]">Cheaper station price (c/L)</span>
              <input
                value={cheaperPrice}
                onChange={(e) => setCheaperPrice(e.target.value)}
                inputMode="decimal"
                className="w-full h-12 px-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[20px] outline-none focus:border-[#1D4ED8] text-sm"
              />
            </label>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-5">
            <div className="rounded-[24px] bg-[#F8FAFC] px-4 py-4">
              <p className="text-[10px] tracking-[0.18em] uppercase text-[#94A3B8] font-bold">Per fill</p>
              <p className="text-[20px] font-bold text-[#16A34A] mt-2">{formatMoney(savings.perFill)}</p>
            </div>
            <div className="rounded-[24px] bg-[#F8FAFC] px-4 py-4">
              <p className="text-[10px] tracking-[0.18em] uppercase text-[#94A3B8] font-bold">Monthly</p>
              <p className="text-[20px] font-bold text-[#0F172A] mt-2">{formatMoney(savings.monthly)}</p>
            </div>
            <div className="rounded-[24px] bg-[#F8FAFC] px-4 py-4">
              <p className="text-[10px] tracking-[0.18em] uppercase text-[#94A3B8] font-bold">Annual</p>
              <p className="text-[20px] font-bold text-[#1D4ED8] mt-2">{formatMoney(savings.annual)}</p>
            </div>
          </div>
        </section>
      </div>
    );
  };

  const renderNewsTool = () => (
    <div className="space-y-3">
      {featuredNews.map((item) => (
        <button
          key={item.id}
          onClick={() => window.open(item.link, '_blank', 'noopener,noreferrer')}
          className="w-full rounded-[28px] border border-[#E2E8F0] bg-white p-5 text-left shadow-[0_12px_30px_rgba(15,23,42,0.06)] cursor-pointer"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] tracking-[0.2em] uppercase text-[#94A3B8] font-bold">{item.source}</p>
              <h3 className="text-[17px] font-semibold text-[#0F172A] mt-2 leading-snug">{item.title}</h3>
              <p className="text-[13px] text-[#64748B] mt-3 leading-relaxed">{item.summary || 'Open this article for the full story.'}</p>
              {item.publishedAt && (
                <p className="text-[11px] text-[#94A3B8] mt-3">{format(new Date(item.publishedAt), 'dd MMM yyyy, h:mm a')}</p>
              )}
            </div>
            <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-[#F8FAFC] text-[#475569] border border-[#E2E8F0] shrink-0">
              <ExternalLink className="w-4 h-4" strokeWidth={1.8} />
            </span>
          </div>
        </button>
      ))}
    </div>
  );

  const renderInsightPulse = () => {
    if (!insights) return null;
    const cards = [
      {
        label: 'Average',
        value: formatPrice(insights.overview.currentAverageCpl),
        tone: 'text-[#EE811A]',
      },
      {
        label: 'Spread',
        value: insights.overview.spreadCpl != null ? `${insights.overview.spreadCpl.toFixed(1)}c` : 'N/A',
        tone: 'text-[#0F172A]',
      },
      {
        label: insightTool === 'forecast' ? 'Confidence' : 'Cheapest',
        value:
          insightTool === 'forecast'
            ? `${insights.forecast.accuracy.confidenceScore}%`
            : formatPrice(insights.overview.cheapestPriceCpl),
        tone: insightTool === 'forecast' ? 'text-[#4338CA]' : 'text-[#16A34A]',
      },
      {
        label: insightTool === 'forecast' ? 'Accuracy' : 'Rank',
        value:
          insightTool === 'forecast'
            ? insights.forecast.accuracy.accuracyPercent != null
              ? `${insights.forecast.accuracy.accuracyPercent.toFixed(0)}%`
              : 'Building'
            : insights.overview.stateRank != null
              ? `#${insights.overview.stateRank}`
              : 'N/A',
        tone: 'text-[#0F172A]',
      },
    ];

    return (
      <section className="rounded-[28px] border border-[#E2E8F0] bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] tracking-[0.2em] uppercase text-[#94A3B8] font-bold">Market Pulse</p>
            <h2 className="text-[18px] font-semibold text-[#0F172A] mt-1">{STATE_OPTIONS.find((option) => option.id === insightState)?.label} · {FUEL_LABELS[insightFuel]}</h2>
          </div>
          <div className={`rounded-full px-3 py-1.5 text-[11px] font-semibold ${getCoverageTone(insights.coverage.historyStatus)}`}>
            {insights.coverage.daysCollected}d captured
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-4">
          {cards.map((card) => (
            <div key={card.label} className="rounded-[22px] bg-[#F8FAFC] px-4 py-3">
              <p className="text-[10px] tracking-[0.16em] uppercase text-[#94A3B8] font-bold">{card.label}</p>
              <p className={`text-[20px] font-bold mt-2 ${card.tone}`}>{card.value}</p>
            </div>
          ))}
        </div>
      </section>
    );
  };

  const renderNewsTab = () => (
    <div className="h-full overflow-y-auto px-4 py-4 space-y-4">
      <section className="rounded-[28px] border border-[#E2E8F0] bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] tracking-[0.22em] uppercase text-[#94A3B8] font-bold">Fuel News</p>
            <h2 className="text-[20px] font-semibold text-[#0F172A] mt-2">Australian market headlines</h2>
            <p className="text-sm text-[#64748B] mt-2">
              One story at a time up top, then the full feed below for deeper reading.
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#FFF7ED] border border-[#FED7AA] flex items-center justify-center shrink-0">
            <Newspaper className="w-5 h-5 text-[#EE811A]" strokeWidth={1.8} />
          </div>
        </div>
      </section>

      {renderNewsCarousel()}

      {newsError && featuredNews.length === 0 && (
        <div className="rounded-[28px] border border-[#FECACA] bg-[#FEF2F2] p-5">
          <p className="text-sm font-semibold text-[#7F1D1D]">Fuel news is unavailable right now.</p>
          <p className="text-sm text-[#991B1B] mt-1">{newsError}</p>
        </div>
      )}

      {featuredNews.length > 0 && renderNewsTool()}
    </div>
  );

  const renderInsightTool = () => {
    if (!insights) return null;
    if (insightTool === 'forecast') return renderForecastTool();
    if (insightTool === 'trends') return renderTrendsTool();
    if (insightTool === 'timing') return renderTimingTool();
    if (insightTool === 'savings') return renderSavingsTool();
    if (insightTool === 'news') return renderNewsTool();
    return renderOverviewTool();
  };

  return (
    <div className="size-full bg-white flex flex-col" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="border-b border-[#E2E8F0] px-4 py-3 native-safe-area-top flex items-center justify-between bg-white">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-[#64748B] hover:text-[#0F172A] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
          <span className="text-xs tracking-wide font-medium">Dashboard</span>
        </button>
        <span className="text-xs tracking-wide text-[#64748B] font-medium">Fuel Finder</span>
        <HoodieHelpTrigger
          stepId="fuel"
          title="Open fuel onboarding video"
        />
      </div>

      <div className="px-4 pt-4 pb-3 bg-white border-b border-[#F1F5F9]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#0F172A]">Fuel Finder</h1>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#FFF7ED] border border-[#FCD9BD] flex items-center justify-center shrink-0">
            <Fuel className="w-5 h-5 text-[#EE811A]" strokeWidth={1.8} />
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'search' | 'insights' | 'news')} className="flex-1 min-h-0 flex flex-col">
        <div className="px-4 pt-3 bg-white">
          <TabsList className="w-full grid grid-cols-3 bg-[#F8FAFC] rounded-[24px] p-1 h-auto">
            <TabsTrigger value="search" className="rounded-[18px] py-3 text-[15px] font-semibold data-[state=active]:bg-white data-[state=active]:text-[#0F172A] data-[state=active]:shadow-sm">
              Search
            </TabsTrigger>
            <TabsTrigger value="insights" className="rounded-[18px] py-3 text-[15px] font-semibold data-[state=active]:bg-white data-[state=active]:text-[#0F172A] data-[state=active]:shadow-sm">
              Insights
            </TabsTrigger>
            <TabsTrigger value="news" className="rounded-[18px] py-3 text-[15px] font-semibold data-[state=active]:bg-white data-[state=active]:text-[#0F172A] data-[state=active]:shadow-sm">
              News
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="search" className="flex-1 min-h-0 mt-0">
          <div className="h-full overflow-y-auto px-4 py-4 space-y-4">
            {renderSearchControls()}

            {searchMode === 'map' ? renderMapSearch() : renderListSearch()}

            {!fuelLoading && (
              <p className="px-1 text-[11px] leading-relaxed text-[#94A3B8]">
                Search support is live for NSW, VIC, QLD, TAS, SA, and WA. ACT and NT remain on the roadmap.
              </p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="insights" className="flex-1 min-h-0 mt-0">
          <div className="h-full overflow-y-auto">
            <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-[#F1F5F9] px-4 py-3 space-y-2">
              <div className="grid grid-cols-3 gap-2">
                <Select value={insightState} onValueChange={(value) => setInsightState(value as FuelStateCode)}>
                  <SelectTrigger className="h-10 rounded-[18px] border-[#D7E3F4] bg-[#F8FAFC] px-2.5 text-[12px]">
                    <SelectValue placeholder="State" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATE_OPTIONS.map((option) => (
                      <SelectItem key={option.id} value={option.id} disabled={!option.supported}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={insightFuel} onValueChange={(value) => setInsightFuel(value as CanonicalFuelCategory)}>
                  <SelectTrigger className="h-10 rounded-[18px] border-[#D7E3F4] bg-[#F8FAFC] px-2.5 text-[12px]">
                    <SelectValue placeholder="Fuel type" />
                  </SelectTrigger>
                  <SelectContent>
                    {FUEL_PRODUCT_OPTIONS.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={insightTool} onValueChange={(value) => setInsightTool(value as FuelInsightTool)}>
                  <SelectTrigger className="h-10 rounded-[18px] border-[#D7E3F4] bg-[#F8FAFC] px-2.5 text-[12px]">
                    <SelectValue placeholder="Tool" />
                  </SelectTrigger>
                  <SelectContent>
                    {TOOL_OPTIONS.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between gap-3 px-1">
                <p className="text-[11px] text-[#64748B]">
                  {insights?.coverage.daysCollected || 0} real days captured for {STATE_OPTIONS.find((option) => option.id === insightState)?.label}.
                </p>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${getCoverageTone(insights?.coverage.historyStatus || 'building')}`}>
                  {coveragePercent}% coverage
                </span>
              </div>
            </div>

            <div className="px-4 py-4 space-y-4">
              {COMING_SOON_INSIGHT_STATES.includes(insightState) && (
                <div className="rounded-[30px] border border-[#FDE68A] bg-[#FFFBEB] p-5">
                  <p className="text-[10px] tracking-[0.22em] uppercase text-[#A16207] font-bold">Coming soon</p>
                  <h2 className="text-lg font-semibold text-[#0F172A] mt-2">{STATE_OPTIONS.find((option) => option.id === insightState)?.label.replace(' (Soon)', '')} fuel insights are on the roadmap.</h2>
                  <p className="text-sm text-[#64748B] mt-2">
                    Search support and analytics are still being expanded for ACT and NT.
                  </p>
                </div>
              )}

              {!COMING_SOON_INSIGHT_STATES.includes(insightState) && insightsLoading && (
                <div className="rounded-[30px] border border-[#E2E8F0] bg-white p-5 text-sm text-[#64748B] flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading fuel analytics...
                </div>
              )}

              {!COMING_SOON_INSIGHT_STATES.includes(insightState) && insightsError && (
                <div className="rounded-[30px] border border-[#FECACA] bg-[#FEF2F2] p-5">
                  <p className="text-sm font-semibold text-[#7F1D1D]">Fuel insights are unavailable right now.</p>
                  <p className="text-sm text-[#991B1B] mt-1">{insightsError}</p>
                </div>
              )}

              {!COMING_SOON_INSIGHT_STATES.includes(insightState) && !insightsLoading && insights && (
                <>
                  {renderInsightPulse()}
                  {renderInsightTool()}
                </>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="news" className="flex-1 min-h-0 mt-0">
          {renderNewsTab()}
        </TabsContent>
      </Tabs>
    </div>
  );
}
