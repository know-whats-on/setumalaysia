import { describe, expect, it } from "vitest";
import { buildOfficialEventMapSearch } from "../lib/official-event-map";

describe("buildOfficialEventMapSearch", () => {
  it("builds a dashboard map payload from exact event coordinates", () => {
    const payload = buildOfficialEventMapSearch(
      {
        title: "Ocean Photographer of the Year",
        summary: "See world-class ocean images.",
        description: "A deeper event description.",
        source_label: "City of Sydney What's On",
        venue_name: "Australian National Maritime Museum",
        address: "2 Murray Street, Sydney NSW 2000",
        suburb: "City Centre",
        dates_humanized: "Sat 26 Apr 2026",
        hero_image_url: "https://images.example.com/ocean-hero.jpg",
        image_url: "https://images.example.com/ocean.jpg",
        lat: -33.8691,
        lng: 151.1982,
      } as any,
      {
        returnRoute:
          "/events/cityofsydney/ocean-photographer-the-year-1?plan=plan-42&compose=1",
      },
    );

    expect(payload).toEqual({
      query: "Ocean Photographer of the Year, 2 Murray Street, Sydney NSW 2000",
      displayName: "Ocean Photographer of the Year",
      suburb: "City Centre",
      state: "NSW",
      lat: -33.8691,
      lng: 151.1982,
      source: "event-place",
      returnEvent: {
        route:
          "/events/cityofsydney/ocean-photographer-the-year-1?plan=plan-42&compose=1",
      },
      eventTarget: {
        kind: "event-place",
        label: "Ocean Photographer of the Year",
        sourceLabel: "City of Sydney What's On",
        dateLine: "Sat 26 Apr 2026",
        locationLine:
          "Australian National Maritime Museum • 2 Murray Street, Sydney NSW 2000",
        summary: "See world-class ocean images.",
        imageUrl: "https://images.example.com/ocean-hero.jpg",
        address: "2 Murray Street, Sydney NSW 2000",
        suburb: "City Centre",
        state: "NSW",
        returnEvent: {
          route:
            "/events/cityofsydney/ocean-photographer-the-year-1?plan=plan-42&compose=1",
        },
        lat: -33.8691,
        lng: 151.1982,
      },
    });
  });

  it("falls back to suburb text when exact coordinates are missing", () => {
    const payload = buildOfficialEventMapSearch({
      title: "Ocean Photographer of the Year",
      venue_name: "",
      address: "",
      suburb: "City Centre",
      lat: null,
      lng: null,
    } as any);

    expect(payload).toEqual({
      query: "Ocean Photographer of the Year, City Centre",
      displayName: "Ocean Photographer of the Year",
      suburb: "City Centre",
      state: "",
      lat: undefined,
      lng: undefined,
      source: "search",
    });
  });

  it("returns null when the event has neither map coordinates nor usable location text", () => {
    const payload = buildOfficialEventMapSearch({
      title: "Ocean Photographer of the Year",
      venue_name: "",
      address: "",
      suburb: "",
      lat: null,
      lng: null,
    } as any);

    expect(payload).toBeNull();
  });
});
