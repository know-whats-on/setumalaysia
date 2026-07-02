import { describe, expect, it } from 'vitest';
import type { PublicToiletLocation } from './api';
import {
  formatPublicToiletAddress,
  isPublicToilet24Hours,
  isPublicToiletOpenNow,
  publicToiletMatchesFilters,
  sortPublicToiletsForResults,
} from './public-toilets';

function toilet(overrides: Partial<PublicToiletLocation>): PublicToiletLocation {
  return {
    id: overrides.id || 'toilet-1',
    objectId: null,
    facilityId: null,
    name: overrides.name || 'Public toilet',
    facilityType: '',
    address: '',
    town: '',
    state: '',
    lat: -33.86,
    lng: 151.2,
    openingHours: '',
    openingHoursNote: '',
    accessible: null,
    ambulant: null,
    unisex: null,
    allGender: null,
    babyChange: null,
    babyCareRoom: null,
    adultChange: null,
    changingPlaces: null,
    drinkingWater: null,
    shower: null,
    dumpPoint: null,
    sharpsDisposal: null,
    sanitaryDisposal: null,
    parkingAccessible: null,
    keyRequired: null,
    mlak24: null,
    mlakAfterHours: null,
    paymentRequired: null,
    accessNote: '',
    addressNote: '',
    toiletNote: '',
    url: '',
    ...overrides,
  };
}

describe('public toilet helpers', () => {
  it('formats addresses from facility parts', () => {
    expect(formatPublicToiletAddress(toilet({
      address: 'Balls Head Drive',
      town: 'Waverton',
      state: 'NSW',
    }))).toBe('Balls Head Drive, Waverton, NSW');
  });

  it('detects 24-hour and parseable open-now hours', () => {
    expect(isPublicToilet24Hours(toilet({ openingHours: 'OPEN: 24 hours' }))).toBe(true);
    expect(isPublicToiletOpenNow(
      toilet({ openingHours: 'Open: 6:00am - 10:00pm' }),
      new Date(2026, 5, 10, 12, 0),
    )).toBe(true);
    expect(isPublicToiletOpenNow(
      toilet({ openingHours: 'Open: 6:00am - 10:00pm' }),
      new Date(2026, 5, 10, 23, 0),
    )).toBe(false);
  });

  it('applies toiletmap-style quick filters', () => {
    const candidate = toilet({
      accessible: true,
      babyCareRoom: true,
      drinkingWater: false,
      keyRequired: true,
      openingHours: 'OPEN: 24 hours',
    });

    expect(publicToiletMatchesFilters(candidate, new Set(['accessible', 'baby-change', '24-hour', 'mlak-key']))).toBe(true);
    expect(publicToiletMatchesFilters(candidate, new Set(['drinking-water']))).toBe(false);
  });

  it('sorts results nearest-first when an origin is available', () => {
    const results = sortPublicToiletsForResults([
      toilet({ id: 'far', name: 'Far', lat: -33.9, lng: 151.2 }),
      toilet({ id: 'near', name: 'Near', lat: -33.861, lng: 151.2 }),
    ], {
      origin: { lat: -33.86, lng: 151.2 },
    });

    expect(results.map((item) => item.toilet.id)).toEqual(['near', 'far']);
    expect(results[0].distance?.walkMin).toBeGreaterThan(0);
  });
});
