import type {
  NswRentCheckAddress,
  NswRentCheckBedrooms,
  NswRentCheckPropertyType,
  NswRentCheckResultState,
  NswRentCheckSavedRecord,
} from './prepare-types';

export interface NswRentCheckComparison {
  result_state: NswRentCheckResultState;
  percent_difference: number | null;
  percent_label: string;
  headline: string;
  summary: string;
}

export const NSW_RENT_CHECK_BEDROOM_OPTIONS: Array<{ value: NswRentCheckBedrooms; label: string }> = [
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4', label: '4' },
  { value: '5', label: '5+' },
];

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function toMoneyRangeNumber(value: unknown): number | null {
  const numeric = toNullableNumber(value);
  return numeric !== null && numeric > 0 ? numeric : null;
}

function roundPercentage(value: number) {
  return Math.round(value * 10) / 10;
}

export function formatNswRentCurrency(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return 'No data';
  return `$${Math.round(value).toLocaleString('en-AU')}`;
}

export function formatNswRentCheckBedrooms(value: NswRentCheckBedrooms | string) {
  return value === '5' ? '5+' : value;
}

export function getNswRentCheckPropertyLabel(value: NswRentCheckPropertyType | string) {
  return value === 'house' ? 'House' : 'Unit';
}

export function mapNswRentCheckPropertyToDwellingCode(value: NswRentCheckPropertyType) {
  return value === 'house' ? 'H' : 'F';
}

export function normalizeNswRentCheckState(value: string) {
  const normalized = value.trim().toLowerCase().replace(/\./g, '');
  if (normalized === 'nsw' || normalized === 'new south wales') return 'NSW';
  return value.trim().toUpperCase();
}

export function isVerifiedNswAddress(address: NswRentCheckAddress | null | undefined) {
  return Boolean(address?.display_address && address?.postcode && normalizeNswRentCheckState(address.state) === 'NSW');
}

export function formatNswRentPercentMessage(percentDifference: number | null, direction: 'higher' | 'lower') {
  if (percentDifference === null || !Number.isFinite(percentDifference)) return '';
  const rounded = roundPercentage(Math.abs(percentDifference));
  const label = rounded > 0 && rounded < 1 ? '<1%' : `${Math.round(rounded).toLocaleString('en-AU')}%`;
  return `${label} ${direction}`;
}

export function calculateNswRentCheckComparison(
  weeklyRent: number,
  medianLower: number | null | undefined,
  medianUpper: number | null | undefined,
): NswRentCheckComparison {
  const lower = toMoneyRangeNumber(medianLower);
  const upper = toMoneyRangeNumber(medianUpper);
  const rent = Number(weeklyRent);

  if (!Number.isFinite(rent) || rent <= 0 || lower === null || upper === null || lower > upper) {
    return {
      result_state: 'noResult',
      percent_difference: null,
      percent_label: '',
      headline: 'No median range found',
      summary: 'There is not enough NSW rental bond data for this postcode, home type, and bedroom count yet.',
    };
  }

  if (rent < lower) {
    const percent = roundPercentage(((lower - rent) / lower) * 100);
    return {
      result_state: 'belowMedian',
      percent_difference: percent,
      percent_label: formatNswRentPercentMessage(percent, 'lower'),
      headline: 'Below the median range',
      summary: `This rent is ${formatNswRentPercentMessage(percent, 'lower')} than the lower end of the median range.`,
    };
  }

  if (rent > upper) {
    const percent = roundPercentage(((rent - upper) / upper) * 100);
    return {
      result_state: 'aboveMedian',
      percent_difference: percent,
      percent_label: formatNswRentPercentMessage(percent, 'higher'),
      headline: 'Above the median range',
      summary: `This rent is ${formatNswRentPercentMessage(percent, 'higher')} than the upper end of the median range.`,
    };
  }

  return {
    result_state: 'withinMedian',
    percent_difference: null,
    percent_label: '',
    headline: 'Within the median range',
    summary: 'This rent sits within the current NSW median rent range for the selected property.',
  };
}

export function normalizeNswRentCheckRecord(raw: Partial<NswRentCheckSavedRecord> | null | undefined, fallbackEmail = ''): NswRentCheckSavedRecord {
  const sourceRaw = (raw || {}) as Partial<NswRentCheckSavedRecord> & Record<string, unknown>;
  const addressSource = (sourceRaw.address && typeof sourceRaw.address === 'object' ? sourceRaw.address : sourceRaw) as Record<string, unknown>;
  const address: NswRentCheckAddress = {
    formatted_address: String(addressSource.formatted_address || ''),
    display_address: String(addressSource.display_address || addressSource.formatted_address || ''),
    suburb: String(addressSource.suburb || ''),
    postcode: String(addressSource.postcode || sourceRaw.postcode || ''),
    state: normalizeNswRentCheckState(String(addressSource.state || '')),
    lat: toNullableNumber(addressSource.lat),
    lng: toNullableNumber(addressSource.lng),
    building_id: String(addressSource.building_id || ''),
    unit_number: String(addressSource.unit_number || ''),
  };

  const propertyType = sourceRaw.property_type === 'house' ? 'house' : 'unit';
  const bedroomValue = String(sourceRaw.bedrooms || '1');
  const bedrooms = (['1', '2', '3', '4', '5'].includes(bedroomValue) ? bedroomValue : '1') as NswRentCheckBedrooms;
  const weeklyRent = toNullableNumber(sourceRaw.weekly_rent) ?? 0;
  const medianLower = toNullableNumber(sourceRaw.median_rent_lower);
  const medianUpper = toNullableNumber(sourceRaw.median_rent_upper);
  const comparison = calculateNswRentCheckComparison(weeklyRent, medianLower, medianUpper);
  const resultState = ['withinMedian', 'aboveMedian', 'belowMedian', 'noResult', 'error'].includes(String(sourceRaw.result_state))
    ? sourceRaw.result_state as NswRentCheckResultState
    : comparison.result_state;

  return {
    id: String(sourceRaw.id || ''),
    check_number: String(sourceRaw.check_number || ''),
    email: String(sourceRaw.email || fallbackEmail),
    address,
    postcode: String(sourceRaw.postcode || address.postcode),
    property_type: propertyType,
    bedrooms,
    weekly_rent: weeklyRent,
    median_rent_lower: medianLower,
    median_rent_upper: medianUpper,
    source_extraction_date: String(sourceRaw.source_extraction_date || ''),
    result_state: resultState,
    percent_difference: toNullableNumber(sourceRaw.percent_difference) ?? comparison.percent_difference,
    result_message: String(sourceRaw.result_message || comparison.summary),
    created_at: String(sourceRaw.created_at || new Date().toISOString()),
    updated_at: String(sourceRaw.updated_at || sourceRaw.created_at || new Date().toISOString()),
  };
}
