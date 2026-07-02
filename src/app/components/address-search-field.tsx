import { useState, useRef, useCallback, useEffect } from 'react';
import { Search, MapPin, Loader2, X, Check, Building2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { searchAddress } from '../lib/api';
import type { NominatimResult } from '../lib/api';

export interface CanonicalAddress {
  formatted_address: string;
  display_address: string;
  suburb: string;
  postcode: string;
  state: string;
  lat: number;
  lng: number;
  building_id: string;
  unit_number: string;
}

interface VerifiedAddressInputProps {
  /** Called when user selects/updates a verified address (fires on building select AND unit change) */
  onChange: (address: CanonicalAddress) => void;
  /** Current building address string (for edit mode pre-population) */
  value?: string;
  /** Current unit number (for edit mode pre-population) */
  unitValue?: string;
  /** Custom class for the search input */
  className?: string;
  placeholder?: string;
}

/** Map full Australian state name to abbreviation */
function mapStateAbbrev(state: string): string {
  const map: Record<string, string> = {
    'new south wales': 'NSW',
    'victoria': 'VIC',
    'queensland': 'QLD',
    'south australia': 'SA',
    'western australia': 'WA',
    'tasmania': 'TAS',
    'northern territory': 'NT',
    'australian capital territory': 'ACT',
  };
  return map[state.toLowerCase()] || state;
}

/** Build a short road-level address from Nominatim address parts */
function buildShortAddress(addr: NominatimResult['address']): string {
  if (!addr) return '';
  const parts: string[] = [];
  const houseNumber = (addr as any).house_number;
  const road = (addr as any).road;
  if (houseNumber) parts.push(houseNumber);
  if (road) parts.push(road);
  const suburb = addr.suburb || addr.town || addr.city || '';
  if (suburb) parts.push(suburb);
  const state = mapStateAbbrev(addr.state || '');
  if (state) parts.push(state);
  const postcode = addr.postcode || '';
  if (postcode) parts.push(postcode);
  return parts.join(', ') || '';
}

/** Compose a display address with optional unit prefix */
function composeDisplayAddress(unit: string, shortAddr: string): string {
  const trimmed = unit.trim();
  return trimmed ? `${trimmed}, ${shortAddr}` : shortAddr;
}

export function VerifiedAddressInput({
  onChange,
  value = '',
  unitValue = '',
  className = '',
  placeholder = 'Search your building address in Australia...',
}: VerifiedAddressInputProps) {
  // Building search state
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Selected building state
  const [selectedBuilding, setSelectedBuilding] = useState<{
    display_name: string;
    short_address: string;
    suburb: string;
    postcode: string;
    state: string;
    lat: number;
    lng: number;
    building_id: string;
  } | null>(null);

  // Unit field
  const [unitNumber, setUnitNumber] = useState(unitValue);

  // Pre-populate on edit (when value is already set)
  useEffect(() => {
    if (value && !selectedBuilding) {
      setSelectedBuilding({
        display_name: value,
        short_address: value,
        suburb: '',
        postcode: '',
        state: '',
        lat: 0,
        lng: 0,
        building_id: '',
      });
      setUnitNumber(unitValue);
    }
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleInputChange = useCallback((val: string) => {
    setQuery(val);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (val.length < 3) {
      setResults([]);
      setShowDropdown(false);
      return;
    }
    timerRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await searchAddress(val);
        setResults(res);
        setShowDropdown(res.length > 0);
      } catch {
        setResults([]);
        setShowDropdown(false);
      }
      setSearching(false);
    }, 350);
  }, []);

  const emitChange = useCallback((building: typeof selectedBuilding, unit: string) => {
    if (!building) return;
    const displayAddr = composeDisplayAddress(unit, building.short_address);
    onChange({
      formatted_address: building.display_name,
      display_address: displayAddr,
      suburb: building.suburb,
      postcode: building.postcode,
      state: building.state,
      lat: building.lat,
      lng: building.lng,
      building_id: building.building_id,
      unit_number: unit.trim(),
    });
  }, [onChange]);

  const handleSelect = (item: NominatimResult) => {
    const addr = item.address || {};
    const shortAddr = buildShortAddress(addr);
    const building = {
      display_name: item.display_name,
      short_address: shortAddr || item.display_name,
      suburb: addr.suburb || addr.town || addr.city || '',
      postcode: addr.postcode || '',
      state: mapStateAbbrev(addr.state || ''),
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      building_id: String(item.place_id),
    };
    setSelectedBuilding(building);
    setQuery('');
    setResults([]);
    setShowDropdown(false);
    // Emit with current unit
    emitChange(building, unitNumber);
  };

  const handleUnitChange = (val: string) => {
    setUnitNumber(val);
    if (selectedBuilding) {
      emitChange(selectedBuilding, val);
    }
  };

  const handleChangeBuilding = () => {
    setSelectedBuilding(null);
    setQuery('');
    setUnitNumber('');
    setResults([]);
  };

  // Step 1: Building search
  if (!selectedBuilding) {
    return (
      <div ref={containerRef} className="relative space-y-1.5">
        <label className="text-[10px] uppercase tracking-widest text-[#94A3B8] ml-1 font-medium">
          Search Building Address
        </label>
        <div className="relative">
          <input
            value={query}
            onChange={e => handleInputChange(e.target.value)}
            onFocus={() => {
              if (results.length > 0) setShowDropdown(true);
            }}
            placeholder={placeholder}
            className={`${className} pr-8`}
            autoComplete="off"
            autoCapitalize="words"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="search"
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
            {searching ? (
              <Loader2 className="w-3.5 h-3.5 text-[#94A3B8] animate-spin" strokeWidth={1.5} />
            ) : query.length > 0 ? (
              <Search className="w-3.5 h-3.5 text-[#94A3B8]" strokeWidth={1.5} />
            ) : (
              <Building2 className="w-3.5 h-3.5 text-[#CBD5E1]" strokeWidth={1.5} />
            )}
          </div>
        </div>

        {/* Hint */}
        {!searching && query.length >= 3 && results.length === 0 && !showDropdown && (
          <p className="text-[9px] text-[#EE811A] mt-1 font-medium ml-1">
            No results found. Try a different address.
          </p>
        )}
        {!searching && query.length >= 3 && results.length > 0 && (
          <p className="text-[9px] text-[#EE811A] mt-0.5 font-medium ml-1">
            Select a verified building from the suggestions
          </p>
        )}

        {/* Dropdown */}
        {showDropdown && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-[#E2E8F0] rounded-xl shadow-xl overflow-hidden max-h-52 overflow-y-auto">
            {results.map(item => (
              <button
                key={item.place_id}
                type="button"
                onClick={() => handleSelect(item)}
                className="w-full text-left px-3 py-2.5 hover:bg-[#F8FAFC] flex items-start gap-2.5 border-b border-[#F1F5F9] last:border-0 transition-colors cursor-pointer"
              >
                <MapPin className="w-3.5 h-3.5 text-[#EE811A] mt-0.5 shrink-0" strokeWidth={1.5} />
                <span className="text-xs text-[#334155] leading-snug font-normal">
                  {item.display_name}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Step 2: Building confirmed + Unit entry
  const finalAddress = composeDisplayAddress(unitNumber, selectedBuilding.short_address);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="space-y-3"
    >
      {/* Verified Building Card */}
      <div className="p-3.5 bg-[#1E40AF]/5 border border-[#1E40AF]/15 rounded-xl flex items-start gap-3">
        <div className="bg-[#1E40AF] p-1.5 rounded-full mt-0.5 shrink-0">
          <Check size={10} className="text-white" strokeWidth={3} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[9px] uppercase tracking-widest text-[#1E40AF] font-bold mb-0.5">
            Verified Building
          </p>
          <p className="text-xs text-[#334155] leading-snug break-words">
            {selectedBuilding.short_address || selectedBuilding.display_name}
          </p>
          <button
            type="button"
            onClick={handleChangeBuilding}
            className="text-[10px] text-[#1E40AF] underline underline-offset-2 mt-1 cursor-pointer hover:text-[#1E3A8A] font-medium"
          >
            Change building
          </button>
        </div>
      </div>

      {/* Unit / Suite / Level */}
      <div className="space-y-1.5">
        <label className="text-[10px] uppercase tracking-widest text-[#94A3B8] ml-1 font-medium">
          Unit / Suite / Level <span className="normal-case tracking-normal text-[#CBD5E1]">(Optional)</span>
        </label>
        <input
          value={unitNumber}
          onChange={e => handleUnitChange(e.target.value)}
          placeholder="e.g. Unit 402 or Level 2, Suite 5"
          className={className}
          autoComplete="off"
          enterKeyHint="next"
        />
      </div>

      {/* Final Canonical Address Preview */}
      <div className="p-3 bg-[#F8FAFC] border border-dashed border-[#E2E8F0] rounded-xl">
        <p className="text-[9px] uppercase tracking-widest text-[#94A3B8] mb-0.5 font-medium">
          Final Canonical Address
        </p>
        <p className="text-xs font-semibold text-[#0F172A] leading-snug">
          {finalAddress}
        </p>
      </div>
    </motion.div>
  );
}

// Keep legacy export for backward compatibility
export { VerifiedAddressInput as AddressSearchField };
