import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router';
import {
  ArrowLeft,
  ExternalLink,
  Loader2,
  MapPin,
  Minus,
  Navigation,
  Plus,
  Search,
  ShoppingBasket,
  Trash2,
} from 'lucide-react';
import { Checkbox } from '../components/ui/checkbox';
import { HoodieHelpTrigger } from '../components/hoodie-help-tour';
import {
  fetchNearbyRetailerStores,
  fetchRetailerShoppingSearch,
  fetchShoppingSearch,
  searchRetailerStores,
  type ShoppingListCategory,
  type ShoppingListItem,
  type ShoppingProductResult,
  type ShoppingRetailer,
  type ShoppingRetailerResults,
  type ShoppingStoreSearchResult,
  type ShoppingStoreSummary,
} from '../lib/api';
import { GEO_ERROR_CODES, getCurrentAppPosition } from '../lib/geolocation';

const SHOPPING_TRANSPORT_TARGET_STORAGE_KEY = 'ghar_shopping_transport_target';
const SHOPPING_COMPARE_STORES_STORAGE_KEY = 'ghar_shopping_compare_selected_stores_v2';
const SHOPPING_LAST_LOCATION_STORAGE_KEY = 'ghar_shopping_last_location_v1';
const ALL_SHOPPING_RETAILERS: ShoppingRetailer[] = ['woolworths', 'coles', 'aldi'];
const SHOPPING_LOCATION_CACHE_MAX_AGE_MS = 15 * 60 * 1000;
const SHOPPING_LOCATION_STALE_MAX_AGE_MS = 2 * 60 * 60 * 1000;
const SHOPPING_LOCATION_QUICK_TIMEOUT_MS = 3500;
const SHOPPING_LOCATION_PRECISE_TIMEOUT_MS = 7000;
type GroceryRetailer = ShoppingRetailer | 'compare';
type CompareStoreMap = Record<ShoppingRetailer, ShoppingStoreSummary | null>;
type ShoppingPageLocationState = {
  initialProductQuery?: string;
};
const DEFAULT_GROCERY_RETAILER: GroceryRetailer = 'woolworths';
const GROCERY_RETAILER_CONFIG: Record<
  GroceryRetailer,
  {
    label: string;
    supportsLiveStoreSearch: boolean;
    supportsLiveProductSearch: boolean;
  }
> = {
  woolworths: {
    label: 'Woolworths',
    supportsLiveStoreSearch: true,
    supportsLiveProductSearch: true,
  },
  coles: {
    label: 'Coles',
    supportsLiveStoreSearch: true,
    supportsLiveProductSearch: true,
  },
  aldi: {
    label: 'ALDI',
    supportsLiveStoreSearch: true,
    supportsLiveProductSearch: true,
  },
  compare: {
    label: 'Price Compare',
    supportsLiveStoreSearch: false,
    supportsLiveProductSearch: true,
  },
};
const RETAILER_BADGE_STYLES: Record<ShoppingRetailer, string> = {
  woolworths: 'bg-[#ECFDF5] text-[#166534]',
  coles: 'bg-[#FEF2F2] text-[#B91C1C]',
  aldi: 'bg-[#EFF6FF] text-[#1D4ED8]',
};
const STORE_BADGE_STYLE = 'bg-[#F8F5EE] text-[#6B7280]';
const RECEIPT_CATEGORIES: ShoppingListCategory[] = [
  'Fresh Produce',
  'Dairy & Eggs',
  'Bakery',
  'Meat & Seafood',
  'Pantry',
  'Frozen',
  'Fridge',
  'Snacks',
  'Drinks',
  'Health & Beauty',
  'Household',
  'Baby',
  'Other',
];

function formatCurrency(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return 'N/A';
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
  }).format(value);
}

function formatDistance(distanceKm: number | null | undefined) {
  if (distanceKm == null || !Number.isFinite(distanceKm)) return null;
  if (distanceKm < 1) return `${Math.round(distanceKm * 1000)}m away`;
  return `${distanceKm.toFixed(1)}km away`;
}

type ShoppingLocationOrigin = {
  lat: number;
  lng: number;
};

type StoredShoppingLocation = ShoppingLocationOrigin & {
  accuracy: number | null;
  timestamp: number;
};

function normalizeGroceryRetailer(value: string | null | undefined): GroceryRetailer {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'coles') return 'coles';
  if (normalized === 'aldi') return 'aldi';
  if (normalized === 'compare') return 'compare';
  return DEFAULT_GROCERY_RETAILER;
}

function buildShoppingStoreStorageKey(retailer: GroceryRetailer) {
  return `ghar_shopping_selected_store_${retailer}`;
}

function buildShoppingListStorageKey(retailer: GroceryRetailer) {
  return `ghar_shopping_list_v1_${retailer}`;
}

function getRetailerLabel(retailer: ShoppingRetailer) {
  return GROCERY_RETAILER_CONFIG[retailer].label;
}

function isShoppingLocationOrigin(value: unknown): value is ShoppingLocationOrigin {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<ShoppingLocationOrigin>;
  return Number.isFinite(Number(candidate.lat)) && Number.isFinite(Number(candidate.lng));
}

function readStoredShoppingLocation(maxAgeMs: number): ShoppingLocationOrigin | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(SHOPPING_LAST_LOCATION_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<StoredShoppingLocation> | null;
    const lat = Number(parsed?.lat);
    const lng = Number(parsed?.lng);
    const timestamp = Number(parsed?.timestamp);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(timestamp)) {
      return null;
    }

    if (Date.now() - timestamp > maxAgeMs) {
      return null;
    }

    return { lat, lng };
  } catch {
    return null;
  }
}

function persistStoredShoppingLocation(origin: ShoppingLocationOrigin, accuracy?: number | null) {
  if (typeof window === 'undefined') return;

  try {
    const nextValue: StoredShoppingLocation = {
      lat: origin.lat,
      lng: origin.lng,
      accuracy: Number.isFinite(Number(accuracy)) ? Number(accuracy) : null,
      timestamp: Date.now(),
    };
    localStorage.setItem(SHOPPING_LAST_LOCATION_STORAGE_KEY, JSON.stringify(nextValue));
  } catch {
    // Ignore localStorage write failures and continue with the live location.
  }
}

async function resolveShoppingLookupOrigin(existingOrigin: ShoppingLocationOrigin | null) {
  if (isShoppingLocationOrigin(existingOrigin)) {
    return existingOrigin;
  }

  const cachedOrigin = readStoredShoppingLocation(SHOPPING_LOCATION_CACHE_MAX_AGE_MS);
  if (cachedOrigin) {
    return cachedOrigin;
  }

  try {
    const quickPosition = await getCurrentAppPosition({
      timeout: SHOPPING_LOCATION_QUICK_TIMEOUT_MS,
      maximumAge: SHOPPING_LOCATION_CACHE_MAX_AGE_MS,
      enableHighAccuracy: false,
    });
    const quickOrigin = {
      lat: quickPosition.coords.latitude,
      lng: quickPosition.coords.longitude,
    };
    persistStoredShoppingLocation(quickOrigin, quickPosition.coords.accuracy);
    return quickOrigin;
  } catch (quickError) {
    try {
      const precisePosition = await getCurrentAppPosition({
        timeout: SHOPPING_LOCATION_PRECISE_TIMEOUT_MS,
        maximumAge: 0,
        enableHighAccuracy: true,
      });
      const preciseOrigin = {
        lat: precisePosition.coords.latitude,
        lng: precisePosition.coords.longitude,
      };
      persistStoredShoppingLocation(preciseOrigin, precisePosition.coords.accuracy);
      return preciseOrigin;
    } catch (preciseError) {
      const staleOrigin = readStoredShoppingLocation(SHOPPING_LOCATION_STALE_MAX_AGE_MS);
      if (staleOrigin) {
        return staleOrigin;
      }
      throw preciseError instanceof Error ? preciseError : quickError;
    }
  }
}

function formatStoreLookupError(error: unknown, fallbackMessage: string) {
  const code =
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as { code?: unknown }).code === 'number'
      ? Number((error as { code: number }).code)
      : null;
  const message = error instanceof Error ? error.message : fallbackMessage;

  if (code === GEO_ERROR_CODES.PERMISSION_DENIED || /permission|denied/i.test(message)) {
    return 'Allow location access or search by suburb or postcode instead.';
  }
  if (code === GEO_ERROR_CODES.TIMEOUT) {
    return 'Finding your location took too long. Search by suburb or postcode instead.';
  }
  if (/nearby store search took too long|store lookup timed out|place search timed out/i.test(message)) {
    return 'Finding nearby stores took too long. Search by suburb or postcode instead.';
  }
  if (/timed out|timeout/i.test(message)) {
    return 'Finding nearby stores took too long. Search by suburb or postcode instead.';
  }

  return message || fallbackMessage;
}

function isShoppingRetailer(retailer: GroceryRetailer): retailer is ShoppingRetailer {
  return retailer === 'woolworths' || retailer === 'coles' || retailer === 'aldi';
}

function isDiscountedProduct(product: ShoppingProductResult) {
  return product.price != null && product.wasPrice != null && product.wasPrice > product.price;
}

function safeReadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function getStoreRefKind(retailer: ShoppingRetailer): ShoppingStoreSummary['storeRefKind'] {
  if (retailer === 'woolworths') return 'woolworths_store';
  if (retailer === 'coles') return 'coles_store';
  return 'aldi_merchant';
}

function buildEmptyCompareStoreMap(): CompareStoreMap {
  return {
    woolworths: null,
    coles: null,
    aldi: null,
  };
}

function normalizeStoredStore(retailer: ShoppingRetailer, value: unknown): ShoppingStoreSummary | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<ShoppingStoreSummary>;
  const id = String(candidate.id || '').trim();
  const name = String(candidate.name || '').trim();
  const address = String(candidate.address || '').trim();
  const lat = Number(candidate.lat);
  const lng = Number(candidate.lng);
  if (!id || !name || !address || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  const distanceKm = Number(candidate.distanceKm);
  const storeRefKind = candidate.storeRefKind || getStoreRefKind(retailer);
  const source = candidate.source === 'official' ? 'official' : 'osm_fallback';

  return {
    id,
    name,
    address,
    suburb: String(candidate.suburb || '').trim() || undefined,
    state: String(candidate.state || '').trim() || undefined,
    postcode: String(candidate.postcode || '').trim() || undefined,
    lat,
    lng,
    distanceKm: Number.isFinite(distanceKm) ? distanceKm : null,
    storeRef: String(candidate.storeRef || '').trim() || null,
    storeRefKind,
    source,
  };
}

function normalizeStoredCompareStores(value: unknown): CompareStoreMap {
  const next = buildEmptyCompareStoreMap();
  if (!value || typeof value !== 'object') return next;
  const candidate = value as Partial<Record<ShoppingRetailer, unknown>>;
  ALL_SHOPPING_RETAILERS.forEach((retailer) => {
    next[retailer] = normalizeStoredStore(retailer, candidate[retailer]);
  });
  return next;
}

function hydrateCompareStoresFromStorage(value: unknown): CompareStoreMap {
  const next = normalizeStoredCompareStores(value);
  ALL_SHOPPING_RETAILERS.forEach((retailer) => {
    if (next[retailer]) return;
    next[retailer] = normalizeStoredStore(
      retailer,
      safeReadJson<ShoppingStoreSummary | null>(buildShoppingStoreStorageKey(retailer), null),
    );
  });
  return next;
}

function readStoredRetailerStore(retailer: ShoppingRetailer): ShoppingStoreSummary | null {
  return normalizeStoredStore(
    retailer,
    safeReadJson<ShoppingStoreSummary | null>(buildShoppingStoreStorageKey(retailer), null),
  );
}

function getFirstMissingCompareRetailer(stores: CompareStoreMap): ShoppingRetailer {
  return ALL_SHOPPING_RETAILERS.find((retailer) => !stores[retailer]) || 'woolworths';
}

function classifyShoppingCategory(product: ShoppingProductResult): ShoppingListCategory {
  const haystack = `${product.sourceDepartment || ''} ${product.sourceCategory || ''} ${product.name}`.toLowerCase();

  if (/(produce|fruit|vegetable|salad|herb)/i.test(haystack)) return 'Fresh Produce';
  if (/(dairy|milk|egg|yoghurt|yogurt|cheese|butter)/i.test(haystack)) return 'Dairy & Eggs';
  if (/(bakery|bread|cake|pastry|muffin)/i.test(haystack)) return 'Bakery';
  if (/(meat|chicken|beef|lamb|pork|seafood|fish)/i.test(haystack)) return 'Meat & Seafood';
  if (/(pantry|pasta|rice|cereal|baking|sauce|canned|condiment)/i.test(haystack)) return 'Pantry';
  if (/(frozen|ice cream)/i.test(haystack)) return 'Frozen';
  if (/(fridge|deli|ready meal|smallgoods|dip)/i.test(haystack)) return 'Fridge';
  if (/(snack|chips|biscuit|cookie|chocolate|confectionery)/i.test(haystack)) return 'Snacks';
  if (/(drink|beverage|juice|soft drink|water|coffee|tea)/i.test(haystack)) return 'Drinks';
  if (/(health|beauty|toiletries|skin|hair|pharmacy)/i.test(haystack)) return 'Health & Beauty';
  if (/(household|cleaning|laundry|paper towel|toilet paper|pet)/i.test(haystack)) return 'Household';
  if (/(baby|nappy|diaper|formula)/i.test(haystack)) return 'Baby';
  return 'Other';
}

function makeProductKey(product: ShoppingProductResult) {
  return [product.productUrl || product.name, product.packageSize || '', product.unit || ''].join('|').toLowerCase();
}

function mapProductToListItem(product: ShoppingProductResult, store: ShoppingStoreSummary): ShoppingListItem {
  return {
    id: `${store.id}-${makeProductKey(product)}`,
    productKey: makeProductKey(product),
    storeId: store.id,
    storeName: store.name,
    retailer: product.retailer,
    name: product.name,
    brand: product.brand,
    price: product.price,
    wasPrice: product.wasPrice,
    quantity: 1,
    checked: false,
    category: classifyShoppingCategory(product),
    packageSize: product.packageSize,
    unit: product.unit,
    imageUrl: product.imageUrl,
    productUrl: product.productUrl,
    inStock: product.inStock,
    aisleLocation: product.aisleLocation,
    sourceCategory: product.sourceCategory,
    sourceDepartment: product.sourceDepartment,
    addedAt: new Date().toISOString(),
  };
}

function buildVirtualStoreForProduct(product: ShoppingProductResult): ShoppingStoreSummary {
  const retailerLabel = getRetailerLabel(product.retailer);
  return {
    id: `retailer-${product.retailer}`,
    name: retailerLabel,
    address: `${retailerLabel} comparison list`,
    lat: 0,
    lng: 0,
    storeRef: null,
    storeRefKind: getStoreRefKind(product.retailer),
    source: 'osm_fallback',
  };
}

function ResultLine({
  product,
  storeLabel,
  onAdd,
}: {
  product: ShoppingProductResult;
  storeLabel?: string | null;
  onAdd: (product: ShoppingProductResult) => void;
}) {
  const category = classifyShoppingCategory(product);
  const retailerLabel = getRetailerLabel(product.retailer);
  const discounted = isDiscountedProduct(product);

  return (
    <div className="rounded-[22px] border border-[#E8E0CF] bg-white px-4 py-3 shadow-sm shadow-[#0F172A]/[0.03]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#E8E0CF] bg-[#F8F5EE] text-[#0F766E]">
              <ShoppingBasket className="h-5 w-5" strokeWidth={1.8} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-tight text-[#111827]">{product.name}</p>
              <p className="mt-1 text-xs text-[#6B7280]">
                {[product.brand, product.packageSize, category].filter(Boolean).join(' • ')}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${RETAILER_BADGE_STYLES[product.retailer]}`}>
                  {retailerLabel}
                </span>
                {storeLabel && (
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${STORE_BADGE_STYLE}`}>
                    {storeLabel}
                  </span>
                )}
                {discounted && (
                  <span className="inline-flex rounded-full bg-[#FEF3C7] px-2.5 py-1 text-[10px] font-semibold text-[#92400E]">
                    On special
                  </span>
                )}
                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                    product.inStock === false ? 'bg-[#FEF2F2] text-[#B91C1C]' : 'bg-[#ECFDF5] text-[#166534]'
                  }`}
                >
                  {product.inStock === false ? 'Out of stock' : product.inStock === true ? 'In stock' : 'Stock unknown'}
                </span>
                {product.aisleLocation && (
                  <span className="inline-flex rounded-full bg-[#EFF6FF] px-2.5 py-1 text-[10px] font-semibold text-[#1D4ED8]">
                    {product.aisleLocation}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-sm font-bold text-[#111827]">{formatCurrency(product.price)}</p>
          {product.wasPrice != null && product.price != null && product.wasPrice > product.price && (
            <p className="mt-1 text-[11px] text-[#9CA3AF] line-through">{formatCurrency(product.wasPrice)}</p>
          )}
          <button
            type="button"
            onClick={() => onAdd(product)}
            className="mt-3 inline-flex items-center gap-1 rounded-full bg-[#0F766E] px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm shadow-[#0F766E]/20"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2} />
            Add
          </button>
          {product.productUrl && (
            <a
              href={product.productUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-[#1D4ED8]"
            >
              Open
              <ExternalLink className="h-3 w-3" strokeWidth={2} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function ReceiptLineItem({
  item,
  onToggle,
  onIncrease,
  onDecrease,
  onRemove,
}: {
  item: ShoppingListItem;
  onToggle: (itemId: string, checked: boolean) => void;
  onIncrease: (itemId: string) => void;
  onDecrease: (itemId: string) => void;
  onRemove: (itemId: string) => void;
}) {
  const itemTotal = item.price == null ? null : item.price * item.quantity;
  const retailer = item.retailer;
  const retailerLabel = retailer ? getRetailerLabel(retailer) : null;

  return (
    <div className={`grid grid-cols-[auto_1fr_auto] gap-3 border-b border-dashed border-[#E8E0CF] py-3 last:border-b-0 ${item.checked ? 'opacity-60' : ''}`}>
      <div className="pt-1">
        <Checkbox
          checked={item.checked}
          onCheckedChange={(value) => onToggle(item.id, value === true)}
          className="size-5 rounded-md border-[#0F766E]/40 data-[state=checked]:border-[#0F766E] data-[state=checked]:bg-[#0F766E]"
        />
      </div>

      <div className="min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className={`text-sm font-semibold text-[#111827] ${item.checked ? 'line-through' : ''}`}>{item.name}</p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-[#9CA3AF]">
              {item.category}
            </p>
            <p className="mt-1 text-xs text-[#6B7280]">
              {[item.brand, item.packageSize, item.unit].filter(Boolean).join(' • ') || 'General grocery'}
            </p>
            {(retailerLabel || item.aisleLocation || item.inStock === false) && (
              <div className="mt-2 flex flex-wrap gap-2">
                {retailer && (
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${RETAILER_BADGE_STYLES[retailer]}`}>
                    {retailerLabel}
                  </span>
                )}
                {item.storeName && (
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${STORE_BADGE_STYLE}`}>
                    {item.storeName}
                  </span>
                )}
                {item.wasPrice != null && item.price != null && item.wasPrice > item.price && (
                  <span className="inline-flex rounded-full bg-[#FEF3C7] px-2.5 py-1 text-[10px] font-semibold text-[#92400E]">
                    On special
                  </span>
                )}
                {item.aisleLocation && (
                  <span className="inline-flex rounded-full bg-[#EFF6FF] px-2.5 py-1 text-[10px] font-semibold text-[#1D4ED8]">
                    {item.aisleLocation}
                  </span>
                )}
                {item.inStock === false && (
                  <span className="inline-flex rounded-full bg-[#FEF2F2] px-2.5 py-1 text-[10px] font-semibold text-[#B91C1C]">
                    Out of stock
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="shrink-0 text-right">
            <p className="text-sm font-bold text-[#111827]">{itemTotal == null ? 'N/A' : formatCurrency(itemTotal)}</p>
            <p className="mt-1 text-[11px] text-[#9CA3AF]">{item.price == null ? 'No live price' : `${formatCurrency(item.price)} each`}</p>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="inline-flex items-center rounded-full border border-[#E8E0CF] bg-[#FAF8F3] p-1">
            <button
              type="button"
              onClick={() => onDecrease(item.id)}
              className="flex h-7 w-7 items-center justify-center rounded-full text-[#6B7280]"
            >
              <Minus className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
            <span className="min-w-8 text-center text-sm font-semibold text-[#111827]">{item.quantity}</span>
            <button
              type="button"
              onClick={() => onIncrease(item.id)}
              className="flex h-7 w-7 items-center justify-center rounded-full text-[#0F766E]"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
          </div>

          <button
            type="button"
            onClick={() => onRemove(item.id)}
            className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#B91C1C]"
          >
            <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
            Remove
          </button>
        </div>
      </div>

      <div className="pt-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9CA3AF]">
        {item.checked ? 'Done' : 'Open'}
      </div>
    </div>
  );
}

export function ShoppingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = (location.state as ShoppingPageLocationState | null) || null;
  const retailer = useMemo(
    () => normalizeGroceryRetailer(new URLSearchParams(location.search).get('retailer')),
    [location.search],
  );
  const retailerConfig = GROCERY_RETAILER_CONFIG[retailer];
  const shoppingStoreStorageKey = useMemo(() => buildShoppingStoreStorageKey(retailer), [retailer]);
  const shoppingListStorageKey = useMemo(() => buildShoppingListStorageKey(retailer), [retailer]);
  const supportsLiveStoreSearch = retailerConfig.supportsLiveStoreSearch;
  const supportsLiveProductSearch = retailerConfig.supportsLiveProductSearch;
  const isComparePage = retailer === 'compare';
  const [selectedStore, setSelectedStore] = useState<ShoppingStoreSummary | null>(null);
  const [compareStores, setCompareStores] = useState<CompareStoreMap>(buildEmptyCompareStoreMap());
  const [comparePickerRetailer, setComparePickerRetailer] = useState<ShoppingRetailer>('woolworths');
  const [storePickerOpen, setStorePickerOpen] = useState(true);
  const [storeQuery, setStoreQuery] = useState('');
  const [storeResults, setStoreResults] = useState<ShoppingStoreSearchResult[]>([]);
  const [storeLoading, setStoreLoading] = useState(false);
  const [storeError, setStoreError] = useState<string | null>(null);
  const [storeNotice, setStoreNotice] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [results, setResults] = useState<ShoppingProductResult[]>([]);
  const [searchNotices, setSearchNotices] = useState<ShoppingRetailerResults[]>([]);
  const [loading, setLoading] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [showDiscountedOnly, setShowDiscountedOnly] = useState(true);
  const [listItems, setListItems] = useState<ShoppingListItem[]>([]);
  const searchRequestRef = useRef(0);
  const storeRequestRef = useRef(0);
  const deviceLocationRef = useRef<{ lat: number; lng: number } | null>(null);
  const compareLocationAttemptRef = useRef(false);
  const singleRetailerLocationAttemptRef = useRef(false);
  const consumedInitialProductKeyRef = useRef<string | null>(null);
  const [pendingInitialProductQuery, setPendingInitialProductQuery] = useState<string | null>(null);

  useEffect(() => {
    const storedItems = safeReadJson<ShoppingListItem[]>(shoppingListStorageKey, []);
    compareLocationAttemptRef.current = false;
    singleRetailerLocationAttemptRef.current = false;

    if (isComparePage) {
      const storedCompareStores = hydrateCompareStoresFromStorage(
        safeReadJson<Record<string, unknown> | null>(SHOPPING_COMPARE_STORES_STORAGE_KEY, null),
      );
      setCompareStores(storedCompareStores);
      setComparePickerRetailer(getFirstMissingCompareRetailer(storedCompareStores));
      setSelectedStore(null);
      setStorePickerOpen(ALL_SHOPPING_RETAILERS.some((retailerId) => !storedCompareStores[retailerId]));
    } else {
      const storedStore =
        supportsLiveStoreSearch && isShoppingRetailer(retailer)
          ? normalizeStoredStore(retailer, safeReadJson<ShoppingStoreSummary | null>(shoppingStoreStorageKey, null))
          : null;
      setSelectedStore(storedStore);
      setCompareStores(buildEmptyCompareStoreMap());
      setComparePickerRetailer(isShoppingRetailer(retailer) ? retailer : 'woolworths');
      setStorePickerOpen(supportsLiveStoreSearch ? !storedStore : false);
    }

    setListItems(Array.isArray(storedItems) ? storedItems : []);
    setStoreQuery('');
    setStoreResults([]);
    setStoreLoading(false);
    setStoreError(null);
    setStoreNotice(null);
    setQuery('');
    setSubmittedQuery('');
    setResults([]);
    setSearchNotices([]);
    setPageError(null);
    setPendingInitialProductQuery(null);
  }, [isComparePage, retailer, shoppingListStorageKey, shoppingStoreStorageKey, supportsLiveStoreSearch]);

  useEffect(() => {
    if (consumedInitialProductKeyRef.current === location.key) return;
    consumedInitialProductKeyRef.current = location.key;

    const initialProductQuery = String(locationState?.initialProductQuery || '').trim();
    if (!initialProductQuery) {
      setPendingInitialProductQuery(null);
      return;
    }

    setQuery(initialProductQuery);
    setSubmittedQuery('');
    setResults([]);
    setSearchNotices([]);
    setPageError(null);
    setPendingInitialProductQuery(initialProductQuery);
  }, [location.key, locationState?.initialProductQuery]);

  useEffect(() => {
    if (isComparePage || !supportsLiveStoreSearch) return;
    if (selectedStore) {
      localStorage.setItem(shoppingStoreStorageKey, JSON.stringify(selectedStore));
    } else {
      localStorage.removeItem(shoppingStoreStorageKey);
    }
  }, [isComparePage, selectedStore, shoppingStoreStorageKey, supportsLiveStoreSearch]);

  useEffect(() => {
    if (!isComparePage) return;
    const hasAnyStore = ALL_SHOPPING_RETAILERS.some((retailerId) => compareStores[retailerId]);
    if (hasAnyStore) {
      localStorage.setItem(SHOPPING_COMPARE_STORES_STORAGE_KEY, JSON.stringify(compareStores));
    } else {
      localStorage.removeItem(SHOPPING_COMPARE_STORES_STORAGE_KEY);
    }
  }, [compareStores, isComparePage]);

  useEffect(() => {
    localStorage.setItem(shoppingListStorageKey, JSON.stringify(listItems));
  }, [listItems, shoppingListStorageKey]);

  useEffect(() => {
    deviceLocationRef.current = readStoredShoppingLocation(SHOPPING_LOCATION_CACHE_MAX_AGE_MS);
  }, [retailer]);

  const activePickerRetailer = isComparePage
    ? comparePickerRetailer
    : isShoppingRetailer(retailer)
      ? retailer
      : null;
  const activePickerLabel = activePickerRetailer ? getRetailerLabel(activePickerRetailer) : retailerConfig.label;
  const activePickerStore = activePickerRetailer
    ? isComparePage
      ? compareStores[activePickerRetailer]
      : selectedStore
    : null;
  const showStorePicker = isComparePage ? storePickerOpen : supportsLiveStoreSearch && (!selectedStore || storePickerOpen);
  const compareSelectedStoreCount = ALL_SHOPPING_RETAILERS.filter((retailerId) => compareStores[retailerId]).length;

  const activeStoreItems = useMemo(() => {
    if (isComparePage) {
      return listItems.filter((item) => {
        if (!item.retailer) return true;
        const compareStore = compareStores[item.retailer];
        return compareStore ? item.storeId === compareStore.id : false;
      });
    }

    if (supportsLiveStoreSearch) {
      return selectedStore ? listItems.filter((item) => item.storeId === selectedStore.id) : [];
    }

    return listItems;
  }, [compareStores, isComparePage, listItems, selectedStore, supportsLiveStoreSearch]);

  const compareRetailerSubtotals = useMemo(() => {
    if (!isComparePage) return [];
    return ALL_SHOPPING_RETAILERS.map((retailerId) => {
      const compareStore = compareStores[retailerId];
      const items = compareStore
        ? listItems.filter((item) => item.retailer === retailerId && item.storeId === compareStore.id)
        : [];
      const subtotal = items.reduce((sum, item) => {
        if (item.price == null) return sum;
        return sum + item.price * item.quantity;
      }, 0);
      const saved = items.reduce((sum, item) => {
        if (item.price == null || item.wasPrice == null || item.wasPrice <= item.price) return sum;
        return sum + (item.wasPrice - item.price) * item.quantity;
      }, 0);
      return {
        retailer: retailerId,
        store: compareStore,
        count: items.length,
        subtotal,
        saved,
      };
    }).filter((entry) => entry.store || entry.count > 0);
  }, [compareStores, isComparePage, listItems]);

  const pickedCount = activeStoreItems.filter((item) => item.checked).length;
  const openCount = activeStoreItems.length - pickedCount;
  const openSubtotal = activeStoreItems.reduce((sum, item) => {
    if (item.checked || item.price == null) return sum;
    return sum + item.price * item.quantity;
  }, 0);
  const totalSubtotal = activeStoreItems.reduce((sum, item) => {
    if (item.price == null) return sum;
    return sum + item.price * item.quantity;
  }, 0);
  const savedSubtotal = activeStoreItems.reduce((sum, item) => {
    if (item.price == null || item.wasPrice == null || item.wasPrice <= item.price) return sum;
    return sum + (item.wasPrice - item.price) * item.quantity;
  }, 0);
  const groupedItems: Record<ShoppingListCategory, ShoppingListItem[]> = RECEIPT_CATEGORIES.reduce(
    (acc, category) => ({ ...acc, [category]: [] }),
    {} as Record<ShoppingListCategory, ShoppingListItem[]>,
  );

  activeStoreItems.forEach((item) => {
    groupedItems[item.category] = [...groupedItems[item.category], item];
  });

  const sortedResults = useMemo(
    () =>
      [...results].sort((left, right) => {
        const discountDiff = Number(isDiscountedProduct(right)) - Number(isDiscountedProduct(left));
        if (discountDiff !== 0) return discountDiff;
        const stockDiff = Number(right.inStock === true) - Number(left.inStock === true);
        if (stockDiff !== 0) return stockDiff;
        const leftPrice = left.price ?? Number.POSITIVE_INFINITY;
        const rightPrice = right.price ?? Number.POSITIVE_INFINITY;
        if (leftPrice !== rightPrice) return leftPrice - rightPrice;
        return left.name.localeCompare(right.name);
      }),
    [results],
  );
  const discountedResults = useMemo(
    () => sortedResults.filter((product) => isDiscountedProduct(product)),
    [sortedResults],
  );
  const showingDiscountFallback = showDiscountedOnly && sortedResults.length > 0 && discountedResults.length === 0;
  const visibleResults = showDiscountedOnly && discountedResults.length > 0 ? discountedResults : sortedResults;

  const resetSearchState = () => {
    setSubmittedQuery('');
    setResults([]);
    setSearchNotices([]);
    setPageError(null);
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/dashboard');
    }
  };

  const handleOpenStorePicker = (targetRetailer?: ShoppingRetailer) => {
    if (isComparePage) {
      setComparePickerRetailer(targetRetailer || comparePickerRetailer);
      setStorePickerOpen(true);
      setStoreLoading(false);
      setStoreError(null);
      setStoreNotice(null);
      setStoreResults([]);
      return;
    }

    if (!supportsLiveStoreSearch) return;
    setStorePickerOpen(true);
    setStoreLoading(false);
    setStoreError(null);
    setStoreNotice(null);
    setStoreResults([]);
  };

  const handleTravelToStore = () => {
    if (!selectedStore) {
      handleOpenStorePicker();
      return;
    }

    try {
      sessionStorage.setItem(
        SHOPPING_TRANSPORT_TARGET_STORAGE_KEY,
        JSON.stringify({
          name: selectedStore.name,
          address: selectedStore.address,
          state: selectedStore.state || '',
          lat: selectedStore.lat,
          lng: selectedStore.lng,
        }),
      );
    } catch (error) {
      console.error('GHAR shopping transport handoff error:', error);
    }

    navigate('/dashboard');
  };

  const applyLastStoreFallback = (targetRetailer: ShoppingRetailer) => {
    if (isComparePage) {
      const fallbackStore = compareStores[targetRetailer] || readStoredRetailerStore(targetRetailer);
      if (!fallbackStore) return null;

      if (!compareStores[targetRetailer]) {
        const nextStores = {
          ...compareStores,
          [targetRetailer]: fallbackStore,
        };
        setCompareStores(nextStores);
        setComparePickerRetailer(getFirstMissingCompareRetailer(nextStores));
        setStorePickerOpen(ALL_SHOPPING_RETAILERS.some((retailerId) => !nextStores[retailerId]));
      }

      setStoreError(null);
      setStoreNotice(`Using your last ${getRetailerLabel(targetRetailer)} store while nearby lookup refreshes.`);
      return fallbackStore;
    }

    const fallbackStore = selectedStore || readStoredRetailerStore(targetRetailer);
    if (!fallbackStore) return null;

    if (!selectedStore) {
      setSelectedStore(fallbackStore);
      setStorePickerOpen(false);
    }

    setStoreError(null);
    setStoreNotice(`Using your last ${getRetailerLabel(targetRetailer)} store while nearby lookup refreshes.`);
    return fallbackStore;
  };

  const restoreCompareFallbackStores = (retailers: ShoppingRetailer[] = ALL_SHOPPING_RETAILERS) => {
    const nextStores = { ...compareStores };
    const restoredRetailers: ShoppingRetailer[] = [];

    retailers.forEach((retailerId) => {
      const fallbackStore = nextStores[retailerId] || readStoredRetailerStore(retailerId);
      if (!fallbackStore) return;
      nextStores[retailerId] = fallbackStore;
      restoredRetailers.push(retailerId);
    });

    if (!restoredRetailers.length) return restoredRetailers;

    setCompareStores(nextStores);
    setComparePickerRetailer(getFirstMissingCompareRetailer(nextStores));
    setStorePickerOpen(ALL_SHOPPING_RETAILERS.some((retailerId) => !nextStores[retailerId]));
    setStoreError(null);
    setStoreNotice(
      `Using your last ${restoredRetailers.map((retailerId) => getRetailerLabel(retailerId)).join(', ')} store${restoredRetailers.length > 1 ? 's' : ''} while nearby lookup refreshes.`,
    );
    return restoredRetailers;
  };

  const selectStore = (store: ShoppingStoreSummary, targetRetailer?: ShoppingRetailer) => {
    if (isComparePage) {
      const nextRetailer = targetRetailer || comparePickerRetailer;
      const currentStore = compareStores[nextRetailer];
      const currentStoreItems = currentStore
        ? listItems.filter((item) => item.retailer === nextRetailer && item.storeId === currentStore.id)
        : [];

      if (currentStore?.id !== store.id && currentStoreItems.length > 0) {
        const confirmed = window.confirm(
          `Switch ${getRetailerLabel(nextRetailer)} to ${store.name}? Your current ${getRetailerLabel(nextRetailer)} items will stay saved on this device, but this receipt will move to the new store.`,
        );
        if (!confirmed) return;
      }

      const nextStores = {
        ...compareStores,
        [nextRetailer]: store,
      };
      setCompareStores(nextStores);
      setComparePickerRetailer(getFirstMissingCompareRetailer(nextStores));
      setStorePickerOpen(ALL_SHOPPING_RETAILERS.some((retailerId) => !nextStores[retailerId]));
      setStoreQuery('');
      setStoreResults([]);
      setStoreLoading(false);
      setStoreError(null);
      setStoreNotice(null);
      resetSearchState();
      return;
    }

    if (selectedStore?.id !== store.id && activeStoreItems.length > 0) {
      const confirmed = window.confirm(
        `Switch to ${store.name}? Your ${selectedStore?.name || 'current'} shopping list will stay saved on this device, but this receipt will move to a different store.`,
      );
      if (!confirmed) return;
    }

    setSelectedStore(store);
    setStoreQuery('');
    setStoreResults([]);
    setStoreLoading(false);
    setStoreError(null);
    setStoreNotice(null);
    setStorePickerOpen(false);
    resetSearchState();
  };

  const handleFindNearestStore = async () => {
    const targetRetailer = isComparePage
      ? comparePickerRetailer
      : isShoppingRetailer(retailer)
        ? retailer
        : null;

    if (!targetRetailer) return;
    if (!isComparePage && !supportsLiveStoreSearch) return;

    const requestId = ++storeRequestRef.current;
    setStoreLoading(true);
    setStoreError(null);
    setStoreNotice(null);

    try {
      const origin = await resolveShoppingLookupOrigin(deviceLocationRef.current);
      deviceLocationRef.current = origin;

      const stores = await fetchNearbyRetailerStores({
        retailer: targetRetailer,
        lat: origin.lat,
        lng: origin.lng,
        limit: 6,
      });
      if (storeRequestRef.current !== requestId) return;

      setStoreResults(stores);
      if (stores.length === 0) {
        if (!applyLastStoreFallback(targetRetailer)) {
          setStoreError(`No nearby ${getRetailerLabel(targetRetailer)} stores were found. Try manual store search instead.`);
        }
        return;
      }

      selectStore(stores[0], targetRetailer);
    } catch (error) {
      if (storeRequestRef.current !== requestId) return;
      if (!applyLastStoreFallback(targetRetailer)) {
        setStoreError(formatStoreLookupError(error, `Unable to find your nearest ${getRetailerLabel(targetRetailer)} store.`));
      }
    } finally {
      if (storeRequestRef.current === requestId) {
        setStoreLoading(false);
      }
    }
  };

  const handleFindNearestCompareStores = async () => {
    const requestId = ++storeRequestRef.current;
    setStoreLoading(true);
    setStoreError(null);
    setStoreNotice(null);

    try {
      const origin = await resolveShoppingLookupOrigin(deviceLocationRef.current);
      deviceLocationRef.current = origin;

      const settledLookups = await Promise.allSettled(
        ALL_SHOPPING_RETAILERS.map((retailerId) =>
          fetchNearbyRetailerStores({
            retailer: retailerId,
            lat: origin.lat,
            lng: origin.lng,
            limit: 4,
          }),
        ),
      );
      if (storeRequestRef.current !== requestId) return;

      const nextStores = { ...compareStores };
      settledLookups.forEach((lookup, index) => {
        const retailerId = ALL_SHOPPING_RETAILERS[index];
        if (lookup.status === 'fulfilled') {
          const store = lookup.value[0] || null;
          if (store) {
            nextStores[retailerId] = store;
          }
          return;
        }

        console.warn(`GHAR compare nearest store lookup failed for ${retailerId}:`, lookup.reason);
      });

      setCompareStores(nextStores);
      setComparePickerRetailer(getFirstMissingCompareRetailer(nextStores));
      setStorePickerOpen(ALL_SHOPPING_RETAILERS.some((retailerId) => !nextStores[retailerId]));
      setStoreResults([]);
      resetSearchState();

      const foundRetailers = ALL_SHOPPING_RETAILERS.filter((retailerId) => nextStores[retailerId]);
      const missingRetailers = ALL_SHOPPING_RETAILERS.filter((retailerId) => !nextStores[retailerId]);

      if (foundRetailers.length === 0) {
        const restoredRetailers = restoreCompareFallbackStores();
        if (restoredRetailers.length === 0) {
          setStoreError('No nearby Woolworths, Coles, or ALDI stores were matched from your location. Search by suburb or postcode instead.');
        }
      } else if (missingRetailers.length > 0) {
        setStoreError(null);
        setStoreNotice(
          `Nearby stores were found for ${foundRetailers.map((retailerId) => getRetailerLabel(retailerId)).join(', ')}. Search manually only if you want to change the rest.`,
        );
      }
    } catch (error) {
      if (storeRequestRef.current !== requestId) return;
      const restoredRetailers = restoreCompareFallbackStores();
      if (restoredRetailers.length === 0) {
        setStoreError(formatStoreLookupError(error, 'Unable to find nearby stores right now.'));
      }
    } finally {
      if (storeRequestRef.current === requestId) {
        setStoreLoading(false);
      }
    }
  };

  useEffect(() => {
    if (!isComparePage) return;
    if (compareLocationAttemptRef.current) return;
    if (ALL_SHOPPING_RETAILERS.some((retailerId) => compareStores[retailerId])) return;

    compareLocationAttemptRef.current = true;
    void handleFindNearestCompareStores();
  }, [compareStores, isComparePage]);

  useEffect(() => {
    if (isComparePage || !supportsLiveStoreSearch || !isShoppingRetailer(retailer)) return;
    if (singleRetailerLocationAttemptRef.current) return;
    if (selectedStore || storeQuery.trim()) return;

    singleRetailerLocationAttemptRef.current = true;
    void handleFindNearestStore();
  }, [isComparePage, retailer, selectedStore, storeQuery, supportsLiveStoreSearch]);

  useEffect(() => {
    const targetRetailer = isComparePage
      ? comparePickerRetailer
      : isShoppingRetailer(retailer)
        ? retailer
        : null;

    if ((!supportsLiveStoreSearch && !isComparePage) || !targetRetailer) {
      setStoreResults([]);
      setStoreLoading(false);
      setStoreError(null);
      return;
    }

    const nextQuery = storeQuery.trim();
    if (nextQuery.length < 2) {
      setStoreResults([]);
      setStoreLoading(false);
      setStoreError(null);
      return;
    }

    const requestId = ++storeRequestRef.current;
    const timeout = window.setTimeout(async () => {
      setStoreLoading(false);
      setStoreError(null);
      setStoreNotice(null);

      try {
        const stores = await searchRetailerStores({
          retailer: targetRetailer,
          q: nextQuery,
          limit: 8,
          originLat: deviceLocationRef.current?.lat,
          originLng: deviceLocationRef.current?.lng,
        });
        if (storeRequestRef.current !== requestId) return;
        setStoreResults(stores);
        if (stores.length === 0) {
          setStoreError(`No ${getRetailerLabel(targetRetailer)} stores found for "${nextQuery}".`);
        }
      } catch (error) {
        if (storeRequestRef.current !== requestId) return;
        setStoreError(
          error instanceof Error
            ? error.message
            : `Unable to search for ${getRetailerLabel(targetRetailer)} stores.`,
        );
      }
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [comparePickerRetailer, isComparePage, retailer, storeQuery, supportsLiveStoreSearch]);

  const runProductSearch = async (queryOverride?: string) => {
    if (!supportsLiveProductSearch) return;

    if (!isComparePage && supportsLiveStoreSearch && !selectedStore) {
      setPageError(`Select a ${retailerConfig.label} store first.`);
      return;
    }

    if (isComparePage && !ALL_SHOPPING_RETAILERS.some((retailerId) => compareStores[retailerId])) {
      setPageError('Choose at least one store to start comparing prices.');
      return;
    }

    const nextQuery = String(queryOverride ?? query).trim();
    if (nextQuery.length < 2) {
      setPageError('Enter at least 2 characters to search groceries.');
      setSubmittedQuery('');
      setResults([]);
      setSearchNotices([]);
      return;
    }

    const requestId = ++searchRequestRef.current;
    setLoading(true);
    setPageError(null);
    setSubmittedQuery(nextQuery);
    setResults([]);
    setSearchNotices([]);

    try {
      if (searchRequestRef.current !== requestId) return;

      if (isComparePage) {
        const selectedRetailers = ALL_SHOPPING_RETAILERS.filter((retailerId) => compareStores[retailerId]);
        const response = await fetchShoppingSearch({
          q: nextQuery,
          limit: 12,
          retailers: selectedRetailers,
          mode: 'compare',
          storesByRetailer: compareStores,
        });
        if (searchRequestRef.current !== requestId) return;

        const retailerResults = ALL_SHOPPING_RETAILERS.map((retailerId) => response.retailers[retailerId]);
        const readyResults = selectedRetailers.flatMap((retailerId) => {
          const result = response.retailers[retailerId];
          return result?.status === 'ready' ? result.results : [];
        });
        const missingStoreNotices = ALL_SHOPPING_RETAILERS.filter((retailerId) => !compareStores[retailerId]).map(
          (retailerId) => ({
            retailer: retailerId,
            status: 'unavailable',
            message: `Choose a ${getRetailerLabel(retailerId)} store to include it in compare.`,
            results: [],
          }),
        ) as ShoppingRetailerResults[];
        const notices = [
          ...missingStoreNotices,
          ...retailerResults.filter((result) => result && result.status !== 'ready' && result.message),
        ];

        setSearchNotices(notices);
        setResults(readyResults);
        if (readyResults.length === 0) {
          setPageError(notices[0]?.message || `No comparable products found for "${nextQuery}".`);
        }
        return;
      }

      if (!isShoppingRetailer(retailer)) return;

      const response = await fetchRetailerShoppingSearch(retailer, {
        q: nextQuery,
        limit: 12,
        store: selectedStore,
      });
      if (searchRequestRef.current !== requestId) return;

      if (response.status !== 'ready') {
        setPageError(response.message || `${retailerConfig.label} search is unavailable right now.`);
        setResults([]);
        return;
      }

      setResults(response.results);
      if (response.results.length === 0) {
        setPageError(response.message || `No ${retailerConfig.label} products found for "${nextQuery}".`);
      }
    } catch (error) {
      if (searchRequestRef.current !== requestId) return;
      setPageError(error instanceof Error ? error.message : `Failed to search ${retailerConfig.label}.`);
    } finally {
      if (searchRequestRef.current === requestId) {
        setLoading(false);
      }
    }
  };

  const handleSearch = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    setPendingInitialProductQuery(null);
    await runProductSearch();
  };

  useEffect(() => {
    const nextQuery = String(pendingInitialProductQuery || '').trim();
    if (!isComparePage || nextQuery.length < 2) return;
    const allCompareStoresReady = ALL_SHOPPING_RETAILERS.every((retailerId) => Boolean(compareStores[retailerId]));
    if (!allCompareStoresReady) return;

    setPendingInitialProductQuery(null);
    void runProductSearch(nextQuery);
  }, [compareStores, isComparePage, pendingInitialProductQuery]);

  const handleAddToList = (product: ShoppingProductResult) => {
    if (!isComparePage && supportsLiveStoreSearch && !selectedStore) return;
    if (isComparePage && !compareStores[product.retailer]) return;

    const targetStore = isComparePage
      ? compareStores[product.retailer] || buildVirtualStoreForProduct(product)
      : selectedStore || buildVirtualStoreForProduct(product);

    setListItems((current) => {
      const existingIndex = current.findIndex(
        (item) => item.storeId === targetStore.id && item.productKey === makeProductKey(product),
      );

      if (existingIndex >= 0) {
        return current.map((item, index) =>
          index === existingIndex ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }

      return [...current, mapProductToListItem(product, targetStore)];
    });

    setQuery('');
    resetSearchState();
  };

  const handleToggleItem = (itemId: string, checked: boolean) => {
    setListItems((current) => current.map((item) => (item.id === itemId ? { ...item, checked } : item)));
  };

  const handleIncreaseQuantity = (itemId: string) => {
    setListItems((current) =>
      current.map((item) => (item.id === itemId ? { ...item, quantity: item.quantity + 1 } : item)),
    );
  };

  const handleDecreaseQuantity = (itemId: string) => {
    setListItems((current) =>
      current
        .map((item) => (item.id === itemId ? { ...item, quantity: Math.max(1, item.quantity - 1) } : item))
        .filter(Boolean),
    );
  };

  const handleRemoveItem = (itemId: string) => {
    setListItems((current) => current.filter((item) => item.id !== itemId));
  };

  const handleClearCurrentStoreList = () => {
    if (activeStoreItems.length === 0) return;
    const scopeLabel = isComparePage
      ? 'combined compare receipt'
      : supportsLiveStoreSearch && selectedStore
        ? selectedStore.name
        : retailerConfig.label;
    const confirmed = window.confirm(`Clear your ${scopeLabel} shopping list?`);
    if (!confirmed) return;

    setListItems((current) => {
      if (isComparePage) {
        const activeIds = new Set(activeStoreItems.map((item) => item.id));
        return current.filter((item) => !activeIds.has(item.id));
      }

      return supportsLiveStoreSearch && selectedStore
        ? current.filter((item) => item.storeId !== selectedStore.id)
        : [];
    });
  };

  return (
    <div
      className="size-full bg-[linear-gradient(180deg,#F7F3EA_0%,#FAFCF8_48%,#EEF8F3_100%)] flex flex-col"
      style={{ fontFamily: 'Inter, sans-serif' }}
    >
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-5xl px-4 py-5 pb-10 native-safe-area-top">
          <div className="mb-4 flex items-center gap-3">
            <button
              onClick={handleBack}
              className="shrink-0 inline-flex items-center gap-2 rounded-full border border-[#E2E8F0] bg-white/90 px-4 py-2 text-sm font-medium text-[#64748B] shadow-sm backdrop-blur-sm transition-colors hover:text-[#0F172A]"
            >
              <ArrowLeft className="w-4 h-4" strokeWidth={1.8} />
              <span>Map</span>
            </button>
            {supportsLiveStoreSearch ? (
              <div className="ml-auto flex min-w-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenStorePicker()}
                  className="min-w-0 max-w-[15rem] rounded-full border border-[#E2E8F0] bg-white/90 px-3 py-2 shadow-sm backdrop-blur-sm transition-colors hover:border-[#0F766E]/35"
                >
                  <div className="flex items-center gap-2">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F8F5EE] text-[#0F766E]">
                      <MapPin className="h-4.5 w-4.5" strokeWidth={1.9} />
                    </span>
                    <span className="min-w-0 text-left">
                      <span className="block truncate text-sm font-semibold text-[#111827]">
                        {selectedStore ? selectedStore.name : 'Choose store'}
                      </span>
                      <span className="block truncate text-[11px] text-[#6B7280]">
                        {selectedStore
                          ? [selectedStore.suburb || selectedStore.state || 'Tap to change', formatDistance(selectedStore.distanceKm)]
                              .filter(Boolean)
                              .join(' • ')
                          : `Tap to pick a ${retailerConfig.label} store`}
                      </span>
                    </span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={handleTravelToStore}
                  disabled={!selectedStore}
                  className="inline-flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full border border-[#D6ECDD] bg-[#ECFDF5] text-[#0F766E] shadow-sm shadow-[#0F766E]/10 transition-all hover:border-[#0F766E]/45 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                  title="Plan travel to this store"
                >
                  <Navigation className="h-5 w-5" strokeWidth={1.9} />
                </button>
              </div>
            ) : (
              <div className="ml-auto rounded-full border border-[#E2E8F0] bg-white/90 px-4 py-2 text-sm font-semibold text-[#111827] shadow-sm backdrop-blur-sm">
                {retailerConfig.label}
              </div>
            )}
          </div>

          <section className="overflow-hidden rounded-[32px] border border-[#E7D9BE] bg-white shadow-[0_25px_70px_-45px_rgba(15,23,42,0.5)]">
            <div className="px-5 py-5">
              <div
                className="rounded-[26px] border border-dashed border-[#E6D9C0] bg-[#FFFDF8] px-4 py-4"
                style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}
              >
                {isComparePage && (
                  <div className="pb-5">
                    <div className="min-w-0 rounded-[24px] border border-dashed border-[#E6D9C0] bg-[#FFFCF6] px-3 py-4 sm:px-4 sm:py-5">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-[#9CA3AF] sm:tracking-[0.25em]">{retailerConfig.label}</p>
                        <HoodieHelpTrigger
                          stepId="price-compare"
                          title="Open price compare onboarding video"
                        />
                      </div>
                      <p className="mt-2 text-sm font-semibold text-[#111827]">
                        Build one grocery list and compare prices across Woolworths, Coles, and ALDI.
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-[#6B7280]">
                        Pick one store for each retailer, then compare whichever stores are ready. Unavailable retailers stay as notice cards instead of blocking the page.
                      </p>

                      <div className="mt-4 grid min-w-0 max-w-full gap-3 lg:grid-cols-3">
                        {ALL_SHOPPING_RETAILERS.map((retailerId) => {
                          const compareStore = compareStores[retailerId];
                          const isActive = comparePickerRetailer === retailerId && storePickerOpen;

                          return (
                            <button
                              key={retailerId}
                              type="button"
                              onClick={() => handleOpenStorePicker(retailerId)}
                              className={`w-full min-w-0 max-w-full overflow-hidden rounded-[22px] border px-3 py-3 text-left transition-all sm:px-4 ${
                                isActive
                                  ? 'border-[#0F766E] bg-[#ECFDF5] shadow-sm shadow-[#0F766E]/10'
                                  : 'border-[#E8E0CF] bg-white hover:border-[#C6E6D5]'
                              }`}
                            >
                              <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                                <div className="min-w-0 max-w-full">
                                  <p className="text-[11px] uppercase tracking-[0.16em] text-[#9CA3AF] sm:tracking-[0.22em]">
                                    {getRetailerLabel(retailerId)}
                                  </p>
                                  <p className="mt-2 max-w-full truncate text-sm font-semibold text-[#111827]">
                                    {compareStore ? compareStore.name : 'Choose store'}
                                  </p>
                                  <p className="mt-1 max-w-full truncate text-xs text-[#6B7280]">
                                    {compareStore
                                      ? [compareStore.suburb || compareStore.state || compareStore.address, formatDistance(compareStore.distanceKm)]
                                          .filter(Boolean)
                                          .join(' • ')
                                      : `Tap to pick a ${getRetailerLabel(retailerId)} store`}
                                  </p>
                                </div>
                                <span className={`inline-flex w-fit max-w-full shrink-0 self-start whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-semibold ${RETAILER_BADGE_STYLES[retailerId]}`}>
                                  {compareStore ? 'Ready' : 'Pending'}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <button
                          type="button"
                          onClick={handleFindNearestCompareStores}
                          disabled={storeLoading}
                          className="inline-flex h-[50px] w-full max-w-full items-center justify-center gap-2 rounded-2xl bg-[#0F766E] px-4 text-center text-sm font-semibold text-white shadow-lg shadow-[#0F766E]/20 disabled:cursor-not-allowed disabled:opacity-70 md:w-auto md:px-5"
                        >
                          {storeLoading ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} /> : null}
                          {storeLoading ? 'Finding nearby stores...' : 'Use location for all three'}
                        </button>
                        <p className="text-sm text-[#6B7280]">{compareSelectedStoreCount}/3 stores selected</p>
                      </div>
                    </div>
                  </div>
                )}

                {showStorePicker && activePickerRetailer && (
                  <div className="pb-5">
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.25em] text-[#9CA3AF]">Choose Store</p>
                        <p className="mt-2 text-sm font-semibold text-[#111827]">
                          {isComparePage
                            ? `Pick the ${activePickerLabel} store you want included in compare.`
                            : `Pick the ${retailerConfig.label} store you want this list tied to.`}
                        </p>
                      </div>
                      {activePickerStore && (
                        <button
                          type="button"
                          onClick={() => setStorePickerOpen(false)}
                          className="inline-flex items-center rounded-full border border-[#D8CCB5] bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#0F766E]"
                        >
                          Done
                        </button>
                      )}
                    </div>

                    <div className="flex flex-col gap-3 md:flex-row">
                      <div className="relative flex-1">
                        <Search
                          className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]"
                          strokeWidth={1.8}
                        />
                        <input
                          value={storeQuery}
                          onChange={(event) => setStoreQuery(event.target.value)}
                          placeholder="Search by suburb or postcode"
                          className="h-[50px] w-full rounded-2xl border border-[#E6D9C0] bg-white pl-11 pr-4 text-sm text-[#111827] outline-none transition-all placeholder:text-[#9CA3AF] focus:border-[#0F766E] focus:ring-4 focus:ring-[#0F766E]/10"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleFindNearestStore}
                        disabled={storeLoading}
                        className="inline-flex h-[50px] items-center justify-center gap-2 rounded-2xl bg-[#0F766E] px-5 text-sm font-semibold text-white shadow-lg shadow-[#0F766E]/20 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {storeLoading ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} /> : null}
                        {storeLoading ? 'Finding nearest store...' : 'Use location'}
                      </button>
                    </div>

                    {storeError && (
                      <div className="mt-4 rounded-2xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3">
                        <p className="text-sm font-semibold text-[#991B1B]">{storeError}</p>
                      </div>
                    )}

                    {!storeError && storeNotice && (
                      <div className="mt-4 rounded-2xl border border-[#C6E6D5] bg-[#ECFDF5] px-4 py-3">
                        <p className="text-sm font-semibold text-[#166534]">{storeNotice}</p>
                      </div>
                    )}

                    {storeResults.length > 0 && (
                      <div className="mt-4 grid gap-3">
                        {storeResults.map((store) => (
                          <button
                            key={store.id}
                            type="button"
                            onClick={() => selectStore(store, activePickerRetailer)}
                            className={`w-full min-w-0 max-w-full overflow-hidden rounded-[22px] border px-3 py-3 text-left transition-all sm:px-4 ${
                              activePickerStore?.id === store.id
                                ? 'border-[#0F766E] bg-[#ECFDF5] shadow-sm shadow-[#0F766E]/10'
                                : 'border-[#E8E0CF] bg-white hover:border-[#C6E6D5]'
                            }`}
                          >
                            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                              <div className="min-w-0 max-w-full">
                                <p className="truncate text-sm font-semibold text-[#111827]">{store.name}</p>
                                <p className="mt-1 truncate text-xs leading-relaxed text-[#6B7280]">{store.address}</p>
                              </div>
                              <div className="shrink-0 self-start text-left sm:text-right">
                                {formatDistance(store.distanceKm) && (
                                  <p className="whitespace-nowrap text-[11px] font-semibold text-[#0F766E]">
                                    {formatDistance(store.distanceKm)}
                                  </p>
                                )}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className={`${showStorePicker ? 'border-t border-dashed border-[#E6D9C0] pt-5' : ''}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h1 className="text-[2rem] font-semibold leading-tight text-[#111827]">Shopping List</h1>
                    </div>
                    {((supportsLiveStoreSearch && selectedStore) || isComparePage || !supportsLiveStoreSearch) && activeStoreItems.length > 0 && (
                      <button
                        type="button"
                        onClick={handleClearCurrentStoreList}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#B91C1C]"
                      >
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                        Clear
                      </button>
                    )}
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-3 rounded-[22px] border border-[#E8E0CF] bg-[#FAF8F3] p-3 text-center">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.22em] text-[#9CA3AF]">Picked</p>
                      <p className="mt-1 text-lg font-semibold text-[#0F766E]">{pickedCount}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.22em] text-[#9CA3AF]">Open</p>
                      <p className="mt-1 text-lg font-semibold text-[#111827]">{openCount}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.22em] text-[#9CA3AF]">Open Total</p>
                      <p className="mt-1 text-lg font-semibold text-[#111827]">{formatCurrency(openSubtotal)}</p>
                    </div>
                  </div>

                  {supportsLiveStoreSearch && !selectedStore ? (
                    <div className="mt-5 rounded-[24px] border border-dashed border-[#E6D9C0] bg-[#FFFCF6] px-4 py-8 text-center">
                      <p className="text-sm font-semibold text-[#111827]">Select a store to start this receipt</p>
                    </div>
                  ) : (
                    <div className="mt-5">
                      {supportsLiveProductSearch ? (
                        <form
                          onSubmit={handleSearch}
                          className="rounded-[24px] border border-[#E8E0CF] bg-white p-3 shadow-sm shadow-[#0F172A]/[0.03]"
                        >
                          <div className="relative">
                            <Search
                              className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]"
                              strokeWidth={1.8}
                            />
                            <input
                              value={query}
                              onChange={(event) => {
                                const nextValue = event.target.value;
                                setQuery(nextValue);
                                if (isComparePage && pendingInitialProductQuery !== null) {
                                  const nextPendingQuery = nextValue.trim();
                                  setPendingInitialProductQuery(nextPendingQuery || null);
                                }
                              }}
                              placeholder={
                                retailer === 'compare'
                                  ? 'Compare milk, bread, yoghurt, detergent...'
                                  : `Search ${retailerConfig.label} items`
                              }
                              className="h-[52px] w-full rounded-2xl border border-[#E6D9C0] bg-[#FFFCF8] pl-11 pr-4 text-sm text-[#111827] outline-none transition-all placeholder:text-[#9CA3AF] focus:border-[#0F766E] focus:ring-4 focus:ring-[#0F766E]/10"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowDiscountedOnly((current) => !current)}
                            className={`mt-3 inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] transition-colors ${
                              showDiscountedOnly
                                ? 'border-[#0F766E]/25 bg-[#ECFDF5] text-[#0F766E]'
                                : 'border-[#E6D9C0] bg-[#FFFCF8] text-[#6B7280]'
                            }`}
                          >
                            <span>{showDiscountedOnly ? 'Discounted only' : 'All items'}</span>
                            <span className="rounded-full bg-white/90 px-2 py-0.5 text-[10px]">
                              {showDiscountedOnly ? 'On' : 'Off'}
                            </span>
                          </button>
                          <button
                            type="submit"
                            disabled={loading}
                            className="mt-3 inline-flex h-[50px] w-full items-center justify-center gap-2 rounded-2xl bg-[#111827] px-5 text-sm font-semibold text-white shadow-lg shadow-[#111827]/10 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {loading ? (
                              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
                            ) : (
                              <Search className="h-4 w-4" strokeWidth={2} />
                            )}
                            Search
                          </button>
                        </form>
                      ) : null}

                      {pageError && (
                        <div className="mt-4 rounded-2xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3">
                          <p className="text-sm font-semibold text-[#991B1B]">{pageError}</p>
                        </div>
                      )}

                      {!pageError && searchNotices.length > 0 && (
                        <div className="mt-4 space-y-3">
                          {searchNotices.map((notice) => (
                            <div
                              key={`${notice.retailer}-${notice.status}-${notice.message}`}
                              className="rounded-2xl border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3"
                            >
                              <p className="text-sm font-semibold text-[#92400E]">{notice.message}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {!loading && !pageError && showingDiscountFallback && (
                        <div className="mt-4 rounded-2xl border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3">
                          <p className="text-sm font-semibold text-[#92400E]">
                            No discounted items found for "{submittedQuery}". Showing other matches instead.
                          </p>
                        </div>
                      )}

                      {loading ? (
                        <div className="mt-4 rounded-[24px] border border-dashed border-[#E6D9C0] bg-white px-4 py-8">
                          <div className="flex items-center justify-center gap-2 text-sm font-medium text-[#475569]">
                            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
                            {retailer === 'compare' ? 'Comparing grocery prices...' : `Loading ${retailerConfig.label} products...`}
                          </div>
                        </div>
                      ) : visibleResults.length > 0 ? (
                        <div className="mt-4 space-y-3">
                          {visibleResults.map((product, index) => (
                            <ResultLine
                              key={`${product.retailer}-${product.productUrl || product.name}-${product.packageSize || index}`}
                              product={product}
                              storeLabel={
                                isComparePage
                                  ? compareStores[product.retailer]?.name || null
                                  : selectedStore?.name || null
                              }
                              onAdd={handleAddToList}
                            />
                          ))}
                        </div>
                      ) : submittedQuery ? (
                        <div className="mt-4 rounded-[24px] border border-dashed border-[#E6D9C0] bg-white px-4 py-8 text-center">
                          <p className="text-sm font-semibold text-[#111827]">
                            {retailer === 'compare'
                              ? `No comparable products found for "${submittedQuery}"`
                              : `No products found for "${submittedQuery}"`}
                          </p>
                        </div>
                      ) : (
                        <div className="mt-4 rounded-[24px] border border-dashed border-[#E6D9C0] bg-[#FFFCF6] px-4 py-6 text-center">
                          <p className="text-sm font-semibold text-[#111827]">
                            {activeStoreItems.length === 0
                              ? retailer === 'compare'
                                ? 'Choose stores and search to start comparing grocery prices'
                                : 'Search to add your first item'
                              : 'Search to add more items to this receipt'}
                          </p>
                        </div>
                      )}

                      {RECEIPT_CATEGORIES.map((category) => {
                        const items = groupedItems[category];
                        if (!items || items.length === 0) return null;

                        return (
                          <div key={category} className="mb-5 mt-5 last:mb-0">
                            <div className="mb-2 flex items-center justify-between gap-3 border-b border-dashed border-[#E6D9C0] pb-2">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9CA3AF]">
                                {category}
                              </p>
                              <p className="text-[11px] font-semibold text-[#6B7280]">
                                {items.length} item{items.length === 1 ? '' : 's'}
                              </p>
                            </div>
                            <div>
                              {items.map((item) => (
                                <ReceiptLineItem
                                  key={item.id}
                                  item={item}
                                  onToggle={handleToggleItem}
                                  onIncrease={handleIncreaseQuantity}
                                  onDecrease={handleDecreaseQuantity}
                                  onRemove={handleRemoveItem}
                                />
                              ))}
                            </div>
                          </div>
                        );
                      })}

                      {isComparePage && compareRetailerSubtotals.length > 0 && (
                        <div className="mt-4 grid gap-3">
                          {compareRetailerSubtotals.map((entry) => (
                            <div
                              key={entry.retailer}
                              className="rounded-[22px] border border-[#E8E0CF] bg-white px-4 py-3"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${RETAILER_BADGE_STYLES[entry.retailer]}`}>
                                      {getRetailerLabel(entry.retailer)}
                                    </span>
                                    {entry.store && (
                                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${STORE_BADGE_STYLE}`}>
                                        {entry.store.name}
                                      </span>
                                    )}
                                  </div>
                                  <p className="mt-2 text-sm text-[#6B7280]">
                                    {entry.count} item{entry.count === 1 ? '' : 's'}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-semibold text-[#111827]">{formatCurrency(entry.subtotal)}</p>
                                  <p className="mt-1 text-[11px] text-[#92400E]">
                                    Saved {formatCurrency(entry.saved)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="mt-4 rounded-[24px] border border-[#E8E0CF] bg-[#FAF8F3] px-4 py-4">
                        <div className="flex items-center justify-between gap-3 text-sm text-[#6B7280]">
                          <span>Unchecked subtotal</span>
                          <span className="font-semibold text-[#111827]">{formatCurrency(openSubtotal)}</span>
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-3 text-sm">
                          <span className="relative font-semibold text-[#92400E]">
                            <span className="absolute inset-x-[-0.28rem] top-[54%] h-[0.82em] -translate-y-1/2 rounded-sm bg-[#FDE68A]/80" />
                            <span className="relative">Saved</span>
                          </span>
                          <span className="relative font-semibold text-[#92400E]">
                            <span className="absolute inset-x-[-0.28rem] top-[54%] h-[0.82em] -translate-y-1/2 rounded-sm bg-[#FDE68A]/80" />
                            <span className="relative">{formatCurrency(savedSubtotal)}</span>
                          </span>
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-3 text-sm text-[#6B7280]">
                          <span>All items subtotal</span>
                          <span className="font-semibold text-[#111827]">{formatCurrency(totalSubtotal)}</span>
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-3 border-t border-dashed border-[#D8CCB5] pt-3">
                          <span className="text-[11px] uppercase tracking-[0.24em] text-[#9CA3AF]">
                            {isComparePage
                              ? 'Combined compare list'
                              : supportsLiveStoreSearch && selectedStore
                                ? selectedStore.name
                                : retailerConfig.label}
                          </span>
                          <span className="text-sm font-semibold text-[#0F766E]">
                            {pickedCount}/{activeStoreItems.length} complete
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
