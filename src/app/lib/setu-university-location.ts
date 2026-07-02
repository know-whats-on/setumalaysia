import type { SetuLocationInfo } from './setu-types';

export const UNIVERSITY_LOCATION_MAP: Record<number, SetuLocationInfo> = {
  1: { city: 'Sydney', state: 'New South Wales', stateCode: 'NSW', climate: 'temperate', majorCity: true },
  2: { city: 'Sydney', state: 'New South Wales', stateCode: 'NSW', climate: 'temperate', majorCity: true },
  3: { city: 'Sydney', state: 'New South Wales', stateCode: 'NSW', climate: 'temperate', majorCity: true },
  4: { city: 'Sydney', state: 'New South Wales', stateCode: 'NSW', climate: 'temperate', majorCity: true },
  5: { city: 'Sydney', state: 'New South Wales', stateCode: 'NSW', climate: 'temperate', majorCity: true },
  6: { city: 'Sydney', state: 'New South Wales', stateCode: 'NSW', climate: 'temperate', majorCity: true },
  7: { city: 'Sydney', state: 'New South Wales', stateCode: 'NSW', climate: 'temperate', majorCity: true },
  8: { city: 'Sydney', state: 'New South Wales', stateCode: 'NSW', climate: 'temperate', majorCity: true },
  43: { city: 'Wollongong', state: 'New South Wales', stateCode: 'NSW', climate: 'temperate', majorCity: false },
  45: { city: 'Newcastle', state: 'New South Wales', stateCode: 'NSW', climate: 'temperate', majorCity: false },
  9: { city: 'Melbourne', state: 'Victoria', stateCode: 'VIC', climate: 'temperate', majorCity: true },
  10: { city: 'Melbourne', state: 'Victoria', stateCode: 'VIC', climate: 'temperate', majorCity: true },
  11: { city: 'Melbourne', state: 'Victoria', stateCode: 'VIC', climate: 'temperate', majorCity: true },
  12: { city: 'Melbourne', state: 'Victoria', stateCode: 'VIC', climate: 'temperate', majorCity: true },
  13: { city: 'Melbourne', state: 'Victoria', stateCode: 'VIC', climate: 'temperate', majorCity: true },
  14: { city: 'Melbourne', state: 'Victoria', stateCode: 'VIC', climate: 'temperate', majorCity: true },
  16: { city: 'Melbourne', state: 'Victoria', stateCode: 'VIC', climate: 'temperate', majorCity: true },
  17: { city: 'Melbourne', state: 'Victoria', stateCode: 'VIC', climate: 'temperate', majorCity: true },
  18: { city: 'Melbourne', state: 'Victoria', stateCode: 'VIC', climate: 'temperate', majorCity: true },
  22: { city: 'Brisbane', state: 'Queensland', stateCode: 'QLD', climate: 'tropical', majorCity: true },
  28: { city: 'Brisbane', state: 'Queensland', stateCode: 'QLD', climate: 'tropical', majorCity: true },
  31: { city: 'Brisbane', state: 'Queensland', stateCode: 'QLD', climate: 'tropical', majorCity: true },
  33: { city: 'Brisbane', state: 'Queensland', stateCode: 'QLD', climate: 'tropical', majorCity: true },
  37: { city: 'Brisbane', state: 'Queensland', stateCode: 'QLD', climate: 'tropical', majorCity: true },
  39: { city: 'Brisbane', state: 'Queensland', stateCode: 'QLD', climate: 'tropical', majorCity: true },
  19: { city: 'Brisbane', state: 'Queensland', stateCode: 'QLD', climate: 'tropical', majorCity: true },
  21: { city: 'Gold Coast', state: 'Queensland', stateCode: 'QLD', climate: 'tropical', majorCity: false },
  29: { city: 'Cairns', state: 'Queensland', stateCode: 'QLD', climate: 'tropical', majorCity: false },
  41: { city: 'Sunshine Coast', state: 'Queensland', stateCode: 'QLD', climate: 'tropical', majorCity: false },
  27: { city: 'Adelaide', state: 'South Australia', stateCode: 'SA', climate: 'mediterranean', majorCity: true },
  32: { city: 'Adelaide', state: 'South Australia', stateCode: 'SA', climate: 'mediterranean', majorCity: true },
  34: { city: 'Adelaide', state: 'South Australia', stateCode: 'SA', climate: 'mediterranean', majorCity: true },
  38: { city: 'Adelaide', state: 'South Australia', stateCode: 'SA', climate: 'mediterranean', majorCity: true },
  24: { city: 'Perth', state: 'Western Australia', stateCode: 'WA', climate: 'mediterranean', majorCity: true },
  25: { city: 'Perth', state: 'Western Australia', stateCode: 'WA', climate: 'mediterranean', majorCity: true },
  30: { city: 'Perth', state: 'Western Australia', stateCode: 'WA', climate: 'mediterranean', majorCity: true },
  42: { city: 'Perth', state: 'Western Australia', stateCode: 'WA', climate: 'mediterranean', majorCity: true },
  20: { city: 'Canberra', state: 'Australian Capital Territory', stateCode: 'ACT', climate: 'temperate', majorCity: true },
  44: { city: 'Canberra', state: 'Australian Capital Territory', stateCode: 'ACT', climate: 'temperate', majorCity: true },
  50: { city: 'Canberra', state: 'Australian Capital Territory', stateCode: 'ACT', climate: 'temperate', majorCity: true },
  23: { city: 'Darwin', state: 'Northern Territory', stateCode: 'NT', climate: 'tropical', majorCity: true },
  40: { city: 'Hobart', state: 'Tasmania', stateCode: 'TAS', climate: 'temperate', majorCity: true },
};

const STATE_CODE_MAP: Record<string, string> = {
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
  act: 'ACT',
  'australian capital territory': 'ACT',
  nt: 'NT',
  'northern territory': 'NT',
  tas: 'TAS',
  tasmania: 'TAS',
};

export function getUniversityLocation(universityId: number | null | undefined): SetuLocationInfo | null {
  if (!Number.isFinite(universityId)) return null;
  return UNIVERSITY_LOCATION_MAP[Number(universityId)] || null;
}

export function normalizeAustralianStateCode(value: string | null | undefined): string {
  const normalized = String(value || '').trim().toLowerCase().replace(/\./g, '');
  return STATE_CODE_MAP[normalized] || String(value || '').trim().toUpperCase();
}
