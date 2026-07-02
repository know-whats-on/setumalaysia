import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Search, MapPin, AlertTriangle, Wrench, ArrowRight, Loader2, Check, Train, Bus, TramFront, Shield, ShieldAlert } from 'lucide-react';
import { searchAddress, createListing } from '../lib/api';
import type { NominatimResult } from '../lib/api';
import type { Listing } from '../lib/mock-data';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ─── Transit types (mirrors dashboard-map) ───────────────────────
interface NearestTransit {
  name: string;
  type: 'train' | 'light_rail' | 'bus';
  distance_m: number;
  walk_min: number;
}

function classifyTransitType(tags: Record<string, string>): NearestTransit['type'] {
  if (tags?.railway === 'station' || tags?.railway === 'halt') return 'train';
  if (tags?.railway === 'tram_stop') return 'light_rail';
  return 'bus';
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── DUAL-PATH TRANSIT LOGIC (Pedestrian Priority) ───────────────
// Finds the closest Train/Light Rail AND closest Bus separately.
// Uses 1.3× Manhattan factor over haversine for realistic walking estimate.
async function fetchDualPathTransit(lat: number, lng: number): Promise<NearestTransit[]> {
  try {
    const radius = 2000; // 2km search radius
    const query = `[out:json][timeout:10];(node["railway"="station"](around:${radius},${lat},${lng});node["railway"="halt"](around:${radius},${lat},${lng});node["railway"="tram_stop"](around:${radius},${lat},${lng});node["amenity"="bus_station"](around:${radius},${lat},${lng});node["highway"="bus_stop"](around:${radius},${lat},${lng}););out body 30;`;
    const resp = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    if (!resp.ok) return [];
    const data = await resp.json();
    if (!data.elements || data.elements.length === 0) return [];

    // Compute walking distances with 1.3× Manhattan factor
    const WALK_FACTOR = 1.3;
    const stops = data.elements.map((el: any) => {
      const straightLine = haversineDistance(lat, lng, el.lat, el.lon);
      const walkDist = Math.round(straightLine * WALK_FACTOR);
      return {
        name: el.tags?.name || el.tags?.description || 'Transit Stop',
        type: classifyTransitType(el.tags || {}),
        distance_m: walkDist,
        walk_min: Math.max(1, Math.round(walkDist / 80)), // ~80m/min walking speed
      };
    }).sort((a: NearestTransit, b: NearestTransit) => a.distance_m - b.distance_m);

    // Dual-Path Selection: closest rail (train/light_rail) + closest bus
    const MAX_WALK_MIN = 15;
    const result: NearestTransit[] = [];

    // Find closest Train/Light Rail
    const closestRail = stops.find((s: NearestTransit) => (s.type === 'train' || s.type === 'light_rail') && s.walk_min <= MAX_WALK_MIN);
    // Find closest Bus
    const closestBus = stops.find((s: NearestTransit) => s.type === 'bus' && s.walk_min <= MAX_WALK_MIN);

    if (closestRail) result.push(closestRail);
    if (closestBus) result.push(closestBus);

    // Sort by walk time so CLOSEST badge goes to the fastest
    result.sort((a, b) => a.walk_min - b.walk_min);

    return result;
  } catch (err) {
    console.error('GHAR report transit lookup error:', err);
    return [];
  }
}

// ─── 5KM SAFETY SHIELD SCANNER ──────────────────────────────────
interface SafetyShield {
  totalAlerts: number;
  scamCount: number;
  maintenanceCount: number;
}

function scan5kmSafetyShield(lat: number, lng: number, listings: Listing[]): SafetyShield {
  const RADIUS_M = 5000;
  const nearby = listings.filter(l => {
    const d = haversineDistance(lat, lng, l.lat, l.lng);
    return d <= RADIUS_M;
  });
  return {
    totalAlerts: nearby.length,
    scamCount: nearby.filter(l => l.category === 'scam').length,
    maintenanceCount: nearby.filter(l => l.category === 'maintenance').length,
  };
}

// ─── CUSTOM MAP PIN (fixes broken default Leaflet marker icon) ───
function createPinIcon(): L.DivIcon {
  return L.divIcon({
    html: `<div style="width:36px;height:36px;display:flex;align-items:center;justify-content:center">
      <div style="width:14px;height:14px;background:#1E40AF;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(30,64,175,0.45)"></div>
      <div style="position:absolute;width:28px;height:28px;border:2px solid #1E40AF;border-radius:50%;opacity:0.25;animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite"></div>
    </div>`,
    className: '',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

interface ReportModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  listings?: Listing[];
}

const categories = [
  { value: 'scam', label: 'Report a Scam', icon: ShieldAlert, color: '#B91C1C', bg: '#FEF2F2', desc: 'Suspicious listing, fake agent, or payment fraud' },
  { value: 'maintenance', label: 'Report Maintenance Issue', icon: Wrench, color: '#EA580C', bg: '#FFF7ED', desc: 'Repair issues, safety hazards, landlord negligence' },
];

export function ReportModal({ open, onClose, onCreated, listings = [] }: ReportModalProps) {
  const [step, setStep] = useState<'address' | 'category' | 'details'>('address');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<NominatimResult | null>(null);
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Commuter context transit data (dual-path)
  const [transitData, setTransitData] = useState<NearestTransit[]>([]);
  const [transitLoading, setTransitLoading] = useState(false);

  // 5km Safety Shield
  const [safetyShield, setSafetyShield] = useState<SafetyShield | null>(null);

  const miniMapRef = useRef<L.Map | null>(null);
  const miniMapContainer = useRef<HTMLDivElement>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const radiusRef = useRef<L.Circle | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced search
  const handleSearch = useCallback((q: string) => {
    setQuery(q);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (q.length < 3) { setResults([]); return; }
    searchTimerRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await searchAddress(q);
        setResults(res);
      } catch { setResults([]); }
      setSearching(false);
    }, 400);
  }, []);

  // Init mini map
  useEffect(() => {
    if (!open || !miniMapContainer.current || miniMapRef.current) return;
    const map = L.map(miniMapContainer.current, {
      center: [-28, 134],
      zoom: 4,
      zoomControl: false,
      attributionControl: false,
    });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20,
    }).addTo(map);
    miniMapRef.current = map;
    // Force tile re-render after modal animation settles
    setTimeout(() => map.invalidateSize(), 350);
    return () => {
      map.remove();
      miniMapRef.current = null;
      markerRef.current = null;
    };
  }, [open]);

  // Move marker, draw 5km radius, fetch dual-path transit, scan safety shield
  useEffect(() => {
    const map = miniMapRef.current;
    if (!map || !selectedAddress) return;
    const lat = parseFloat(selectedAddress.lat);
    const lng = parseFloat(selectedAddress.lon);

    // Clean up previous
    if (markerRef.current) markerRef.current.remove();
    if (radiusRef.current) radiusRef.current.remove();

    // Drop custom pin marker (no broken icon!)
    markerRef.current = L.marker([lat, lng], { icon: createPinIcon() }).addTo(map);

    // Draw 5km safety radius
    radiusRef.current = L.circle([lat, lng], {
      radius: 5000,
      color: '#1E40AF',
      fillColor: '#1E40AF',
      fillOpacity: 0.06,
      weight: 1.5,
      dashArray: '6 4',
      interactive: false,
    }).addTo(map);

    map.flyTo([lat, lng], 14, { duration: 0.8 });

    // 5km Safety Shield scan
    const shield = scan5kmSafetyShield(lat, lng, listings);
    setSafetyShield(shield);

    // Dual-path transit fetch
    setTransitData([]);
    setTransitLoading(true);
    fetchDualPathTransit(lat, lng)
      .then(results => setTransitData(results))
      .catch(() => setTransitData([]))
      .finally(() => setTransitLoading(false));
  }, [selectedAddress, listings]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setStep('address');
      setQuery('');
      setResults([]);
      setSelectedAddress(null);
      setCategory('');
      setDescription('');
      setSubmitting(false);
      setSubmitted(false);
      setTransitData([]);
      setTransitLoading(false);
      setSafetyShield(null);
    }
  }, [open]);

  const handleSelectResult = (r: NominatimResult) => {
    setSelectedAddress(r);
    setResults([]);
    setQuery(r.display_name);
  };

  const handleSubmit = async () => {
    if (!selectedAddress || !category || !description.trim()) return;
    setSubmitting(true);
    try {
      const reporterName = localStorage.getItem('ghar_first_name') || 'Anonymous';
      const reporterLast = localStorage.getItem('ghar_last_name') || '';
      await createListing({
        address: selectedAddress.display_name,
        suburb: selectedAddress.address?.suburb || selectedAddress.address?.city || selectedAddress.address?.town || '',
        postcode: selectedAddress.address?.postcode || '',
        lat: parseFloat(selectedAddress.lat),
        lng: parseFloat(selectedAddress.lon),
        category,
        confidence_score: Math.floor(Math.random() * 30) + 50,
        description: description.trim(),
        reported_by: localStorage.getItem('ghar_email') || `${reporterName} ${reporterLast}`.trim(),
        nearest_transit: transitData.length > 0 ? transitData.map(t => ({
          name: t.name,
          type: t.type,
          distance_m: t.distance_m,
          walk_min: t.walk_min,
        })) : undefined,
      });
      setSubmitted(true);
      setTimeout(() => {
        onCreated();
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Failed to create report:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[2105] flex items-end justify-center sm:items-center"
      style={{
        fontFamily: 'Inter, sans-serif',
        paddingTop: 'var(--native-safe-area-top)',
        paddingBottom: 'max(0px, calc(var(--app-keyboard-inset) - var(--native-safe-area-bottom)))',
      }}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="relative flex w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-w-lg sm:rounded-2xl"
        style={{
          maxHeight: 'calc(100dvh - var(--native-safe-area-top) - 12px)',
        }}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
          <h3 className="text-lg text-[#0F172A] font-bold">
            {submitted ? 'Report Submitted' : step === 'address' ? 'Report Location' : step === 'category' ? 'Select Category' : 'Add Details'}
          </h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-[#F8FAFC] flex items-center justify-center hover:bg-[#E2E8F0] transition-colors cursor-pointer">
            <X className="w-4 h-4 text-[#64748B]" />
          </button>
        </div>

        {submitted ? (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <div className="w-16 h-16 bg-[#16A34A]/10 rounded-2xl flex items-center justify-center">
              <Check className="w-8 h-8 text-[#16A34A]" />
            </div>
            <p className="text-lg font-bold text-[#0F172A]">Report submitted!</p>
            <p className="text-sm text-[#64748B]">Your alert has been added to the map.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {/* Mini Map */}
            <div ref={miniMapContainer} className="h-40 w-full bg-[#F8FAFC]" />

            <div
              className="space-y-4 px-5 py-4"
              style={{ paddingBottom: 'calc(var(--native-safe-area-bottom) + 16px)' }}
            >
              {step === 'address' && (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
                    <input
                      value={query}
                      onChange={(e) => handleSearch(e.target.value)}
                      placeholder="Type an Australian address..."
                      className="w-full pl-10 pr-4 py-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#1E40AF] focus:ring-2 focus:ring-[#1E40AF]/10"
                      autoFocus
                    />
                    {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1E40AF] animate-spin" />}
                  </div>

                  {results.length > 0 && (
                    <div className="border border-[#E2E8F0] rounded-xl overflow-hidden divide-y divide-[#E2E8F0]">
                      {results.map((r) => (
                        <button
                          key={r.place_id}
                          onClick={() => handleSelectResult(r)}
                          className="w-full text-left px-4 py-3 hover:bg-[#F8FAFC] flex items-start gap-3 transition-colors cursor-pointer"
                        >
                          <MapPin className="w-4 h-4 text-[#EE811A] mt-0.5 shrink-0" strokeWidth={1.5} />
                          <span className="text-sm text-[#0F172A] leading-snug">{r.display_name}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {selectedAddress && (
                    <div className="bg-[#1E40AF]/5 border border-[#1E40AF]/20 rounded-xl p-4">
                      <p className="text-xs text-[#1E40AF] font-medium mb-1">Selected Location</p>
                      <p className="text-sm text-[#0F172A]">{selectedAddress.display_name}</p>
                    </div>
                  )}

                  {/* ─── 5KM SAFETY SHIELD (appears after address selection) ─── */}
                  {selectedAddress && safetyShield && (
                    <div className={`rounded-xl p-3 ${
                      safetyShield.totalAlerts > 0
                        ? 'bg-[#FEF2F2] border border-[#FECACA]'
                        : 'bg-[#F0FDF4] border border-[#BBF7D0]'
                    }`}>
                      <div className="flex items-center gap-2 mb-1">
                        <Shield className={`w-4 h-4 shrink-0 ${
                          safetyShield.totalAlerts > 0 ? 'text-[#B91C1C]' : 'text-[#16A34A]'
                        }`} strokeWidth={1.5} />
                        <span className="text-xs font-bold text-[#0F172A]">
                          {safetyShield.totalAlerts === 0
                            ? 'No safety alerts within 5km'
                            : `${safetyShield.totalAlerts} safety alert${safetyShield.totalAlerts !== 1 ? 's' : ''} within 5km`
                          }
                        </span>
                      </div>
                      {safetyShield.totalAlerts > 0 && (
                        <div className="flex items-center gap-1.5 ml-6 flex-wrap">
                          {safetyShield.scamCount > 0 && (
                            <span className="text-[8px] tracking-wide uppercase px-1.5 py-0.5 bg-[#B91C1C] text-white rounded font-medium flex items-center gap-1">
                              <ShieldAlert className="w-2.5 h-2.5" strokeWidth={2} />
                              {safetyShield.scamCount} Scam
                            </span>
                          )}
                          {safetyShield.maintenanceCount > 0 && (
                            <span className="text-[8px] tracking-wide uppercase px-1.5 py-0.5 bg-[#EA580C] text-white rounded font-medium flex items-center gap-1">
                              <Wrench className="w-2.5 h-2.5" strokeWidth={2} />
                              {safetyShield.maintenanceCount} Maint.
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    onClick={() => selectedAddress && setStep('category')}
                    disabled={!selectedAddress}
                    className="w-full py-3.5 bg-[#1E40AF] text-white rounded-xl flex items-center justify-center gap-2 hover:bg-[#1E3A8A] transition-all shadow-lg shadow-[#1E40AF]/20 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed font-medium"
                  >
                    Continue <ArrowRight className="w-4 h-4" />
                  </button>
                </>
              )}

              {step === 'category' && (
                <>
                  <div className="divide-y divide-[#F1F5F9]">
                    {categories.map((cat) => (
                      <button
                        key={cat.value}
                        onClick={() => setCategory(cat.value)}
                        className={`w-full py-4 flex items-center gap-4 transition-all cursor-pointer ${
                          category === cat.value ? 'opacity-100' : 'opacity-80 hover:opacity-100'
                        }`}
                      >
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all ${
                            category === cat.value ? 'ring-2 ring-offset-2 scale-105' : ''
                          }`}
                          style={{
                            backgroundColor: cat.bg,
                            ...(category === cat.value ? { ringColor: cat.color } as any : {}),
                          }}
                        >
                          <cat.icon className="w-5 h-5" style={{ color: cat.color }} strokeWidth={1.5} />
                        </div>
                        <div className="text-left flex-1 min-w-0">
                          <p className={`text-sm text-[#0F172A] ${category === cat.value ? 'font-bold' : 'font-semibold'}`}>{cat.label}</p>
                          <p className="text-xs text-[#64748B] font-normal leading-relaxed">{cat.desc}</p>
                        </div>
                        {category === cat.value && (
                          <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: cat.color }}>
                            <Check className="w-3 h-3 text-white" strokeWidth={2.5} />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => category && setStep('details')}
                    disabled={!category}
                    className="w-full py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed font-medium text-white"
                    style={{ backgroundColor: category ? '#6366F1' : '#A5B4CB' }}
                  >
                    Continue <ArrowRight className="w-4 h-4" />
                  </button>
                </>
              )}

              {step === 'details' && (
                <>
                  <div>
                    <label className="text-xs tracking-wide text-[#64748B] mb-1.5 block font-medium">Description</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe the issue in detail. Include dates, names, and any relevant context..."
                      rows={4}
                      className="w-full px-4 py-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#1E40AF] focus:ring-2 focus:ring-[#1E40AF]/10 resize-none"
                    />
                  </div>

                  {/* ─── COMMUTER CONTEXT (Dual-Path Transit) ─── */}
                  <div className="bg-[#F0F9FF] border border-[#BFDBFE]/40 rounded-xl p-3.5">
                    <div className="flex items-center gap-2 mb-2.5">
                      <Shield className="w-3.5 h-3.5 text-[#1E40AF]" strokeWidth={2} />
                      <span className="text-[9px] tracking-wider uppercase text-[#1E40AF] font-bold">COMMUTER CONTEXT</span>
                      <span className="text-[9px] text-[#94A3B8] font-normal ml-auto">Auto-detected</span>
                    </div>

                    {transitLoading ? (
                      <div className="flex items-center gap-2 py-1.5">
                        <div className="w-3 h-3 border-2 border-[#1E40AF] border-t-transparent rounded-full animate-spin" />
                        <span className="text-[10px] text-[#64748B] font-normal">Finding nearby stations & stops...</span>
                      </div>
                    ) : transitData.length === 0 ? (
                      <div className="flex items-center gap-2 py-1">
                        <MapPin className="w-3.5 h-3.5 text-[#94A3B8]" strokeWidth={1.5} />
                        <span className="text-[10px] text-[#94A3B8] font-normal">No transit stops found within 15 min walk</span>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {transitData.map((t, i) => {
                          const isClosest = i === 0;
                          const typeIcon = t.type === 'train'
                            ? <Train className="w-3.5 h-3.5 text-[#1E40AF]" strokeWidth={2} />
                            : t.type === 'light_rail'
                              ? <TramFront className="w-3.5 h-3.5 text-[#7C3AED]" strokeWidth={2} />
                              : <Bus className="w-3.5 h-3.5 text-[#EA580C]" strokeWidth={2} />;
                          const typeLabel = t.type === 'train' ? 'Train' : t.type === 'light_rail' ? 'Light Rail' : 'Bus';

                          return (
                            <div key={`${t.type}-${t.name}-${i}`} className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg ${isClosest ? 'bg-white border border-[#BFDBFE]/50' : 'bg-white/60'}`}>
                              <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${
                                t.type === 'train' ? 'bg-[#1E40AF]/10' : t.type === 'light_rail' ? 'bg-[#7C3AED]/10' : 'bg-[#EA580C]/10'
                              }`}>
                                {typeIcon}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-[10px] text-[#0F172A] font-medium truncate">{t.name}</p>
                                <p className="text-[8px] text-[#94A3B8] font-normal">{typeLabel} · {t.distance_m < 1000 ? `${t.distance_m}m` : `${(t.distance_m / 1000).toFixed(1)}km`}</p>
                              </div>
                              <span className="text-[10px] text-[#1E40AF] font-bold whitespace-nowrap">
                                {t.walk_min} min
                              </span>
                              {isClosest && (
                                <span className="text-[7px] tracking-wider uppercase px-1.5 py-0.5 bg-[#16A34A]/10 text-[#16A34A] rounded font-bold shrink-0">
                                  CLOSEST
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <p className="text-[8px] text-[#94A3B8] font-normal mt-2 text-center">This data will be saved with your report</p>
                  </div>

                  {/* ─── 5KM SAFETY SHIELD SUMMARY (on details step) ─── */}
                  {safetyShield && (
                    <div className={`rounded-xl p-2.5 flex items-center gap-2 ${
                      safetyShield.totalAlerts > 0
                        ? 'bg-[#FEF2F2] border border-[#FECACA]'
                        : 'bg-[#F0FDF4] border border-[#BBF7D0]'
                    }`}>
                      <Shield className={`w-3.5 h-3.5 shrink-0 ${
                        safetyShield.totalAlerts > 0 ? 'text-[#B91C1C]' : 'text-[#16A34A]'
                      }`} strokeWidth={1.5} />
                      <span className="text-[10px] font-medium text-[#0F172A]">
                        {safetyShield.totalAlerts === 0
                          ? 'No safety alerts within 5km'
                          : `${safetyShield.scamCount > 0 ? `${safetyShield.scamCount} Scam${safetyShield.scamCount > 1 ? 's' : ''}` : ''}${safetyShield.scamCount > 0 && safetyShield.maintenanceCount > 0 ? ' & ' : ''}${safetyShield.maintenanceCount > 0 ? `${safetyShield.maintenanceCount} Maintenance` : ''}`
                        }
                      </span>
                    </div>
                  )}

                  <button
                    onClick={handleSubmit}
                    disabled={submitting || !description.trim()}
                    className="w-full py-3.5 bg-[#EE811A] text-white rounded-xl flex items-center justify-center gap-2 hover:bg-[#D97316] transition-all shadow-lg shadow-[#EE811A]/20 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed font-medium"
                  >
                    {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Submit Report'}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
