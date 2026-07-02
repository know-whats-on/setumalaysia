import { describe, expect, it } from 'vitest';
import {
  buildEmploymentZoneQuery,
  buildJobHeatmapGeoJSON,
  calculateEmploymentScore,
  formatEmploymentVenueCountLabel,
  normalizeEmploymentVenues,
  type JobVenue,
} from './employment-zones';

describe('employment zone helpers', () => {
  it('builds an Overpass query with node and way clauses for supported venue types', () => {
    const bbox = '-33.95,151.13,-33.90,151.18';
    const query = buildEmploymentZoneQuery(bbox);

    expect(query).toContain(`node["amenity"="restaurant"](${bbox});`);
    expect(query).toContain(`way["amenity"="restaurant"](${bbox});`);
    expect(query).toContain(`node["shop"="clothes"](${bbox});`);
    expect(query).toContain(`way["shop"="clothes"](${bbox});`);
    expect(query).toContain(`node["shop"="superstore"](${bbox});`);
    expect(query).toContain(`way["shop"="superstore"](${bbox});`);
  });

  it('normalizes Overpass elements into stable venue ids and categories', () => {
    const venues = normalizeEmploymentVenues([
      {
        id: 1,
        type: 'node',
        lat: -33.93,
        lon: 151.15,
        tags: { amenity: 'restaurant', name: 'Sampa' },
      },
      {
        id: 1,
        type: 'way',
        center: { lat: -33.94, lon: 151.16 },
        tags: { shop: 'clothes', name: 'Retail Hub' },
      },
    ]);

    expect(venues).toEqual([
      { id: 'node-1', lat: -33.93, lng: 151.15, name: 'Sampa', category: 'restaurant' },
      { id: 'way-1', lat: -33.94, lng: 151.16, name: 'Retail Hub', category: 'retail' },
    ]);
  });

  it('keeps the heatmap and score in sync with a populated venue list', () => {
    const venues: JobVenue[] = [
      { id: 'node-1', lat: -33.9299, lng: 151.151, name: 'Mall 1', category: 'mall' },
      { id: 'node-2', lat: -33.9302, lng: 151.152, name: 'Restaurant 1', category: 'restaurant' },
      { id: 'way-3', lat: -33.931, lng: 151.153, name: 'Cafe 1', category: 'cafe' },
    ];

    const geoJson = buildJobHeatmapGeoJSON(venues);
    const analysis = calculateEmploymentScore(-33.9293, 151.1503, venues);

    expect(geoJson.features).toHaveLength(3);
    expect(analysis.venueCount).toBe(3);
    expect(analysis.score).toBeGreaterThan(1);
    expect(analysis.summary).toContain('High potential');
    expect(formatEmploymentVenueCountLabel(analysis.venueCount)).toBe('3 venues within 20-min walk');
  });

  it('builds a safe empty heatmap and low-score analysis when no venues resolve', () => {
    const geoJson = buildJobHeatmapGeoJSON([]);
    const analysis = calculateEmploymentScore(-33.9293, 151.1503, []);

    expect(geoJson).toEqual({
      type: 'FeatureCollection',
      features: [],
    });
    expect(analysis.venueCount).toBe(0);
    expect(analysis.score).toBe(1);
    expect(analysis.summary).toContain('0 hospitality/retail venues');
  });
});
