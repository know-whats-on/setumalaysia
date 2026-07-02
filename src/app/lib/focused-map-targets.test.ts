import { describe, expect, it } from "vitest";
import {
  buildFocusedMapTargetDirectionsUrl,
  buildFocusedMapTargetReturnRoute,
  buildMapDirectionsUrl,
  buildNearbyToiletsMapState,
  getFocusedMapTargetBadge,
  getFocusedMapTargetReturnLabel,
} from "./focused-map-targets";

describe("focused map target helpers", () => {
  it("builds guide and event return routes with the right labels", () => {
    const guideTarget = {
      kind: "guide-place" as const,
      label: "The Rocks Markets",
      city: "Sydney",
      state: "NSW",
      lat: -33.8599,
      lng: 151.209,
      returnGuide: {
        citySlug: "sydney",
        guideSlug: "best-weekend-markets",
        guidesView: "carousel" as const,
      },
    };
    const eventTarget = {
      kind: "event-place" as const,
      label: "Ocean Photographer of the Year",
      sourceLabel: "City of Sydney What's On",
      lat: -33.8691,
      lng: 151.1982,
      returnEvent: {
        route:
          "/events/cityofsydney/ocean-photographer-the-year-1?plan=plan-42&invite=1",
      },
    };

    expect(buildFocusedMapTargetReturnRoute(guideTarget)).toBe(
      "/vibe?section=vibe&vibe_tab=my-hood&city=sydney&guide=best-weekend-markets&guides_view=carousel",
    );
    expect(getFocusedMapTargetReturnLabel(guideTarget)).toBe("Back to Guide");
    expect(buildFocusedMapTargetReturnRoute(eventTarget)).toBe(
      "/events/cityofsydney/ocean-photographer-the-year-1?plan=plan-42&invite=1",
    );
    expect(getFocusedMapTargetReturnLabel(eventTarget)).toBe("Back to Event");
    expect(getFocusedMapTargetBadge(eventTarget)).toBe(
      "City of Sydney What's On",
    );
  });

  it("builds explicit external directions URLs for the focused target chooser", () => {
    const eventTarget = {
      kind: "event-place" as const,
      label: "Ocean Photographer of the Year",
      lat: -33.8691,
      lng: 151.1982,
    };

    expect(
      buildFocusedMapTargetDirectionsUrl(eventTarget, "android-system"),
    ).toBe(
      "geo:-33.8691,151.1982?q=-33.8691,151.1982(Ocean%20Photographer%20of%20the%20Year)",
    );
    expect(buildFocusedMapTargetDirectionsUrl(eventTarget, "apple")).toBe(
      "https://maps.apple.com/?daddr=-33.8691,151.1982&q=Ocean%20Photographer%20of%20the%20Year",
    );
    expect(buildFocusedMapTargetDirectionsUrl(eventTarget, "google")).toBe(
      "https://www.google.com/maps/dir/?api=1&destination=-33.8691,151.1982&travelmode=driving",
    );
    expect(buildFocusedMapTargetDirectionsUrl(eventTarget, "waze")).toBe(
      "https://waze.com/ul?ll=-33.8691,151.1982&navigate=yes",
    );
  });

  it("builds external directions URLs for plain map coordinate targets", () => {
    const toiletTarget = {
      label: "Town Hall amenities",
      lat: -33.8731,
      lng: 151.2062,
    };

    expect(buildMapDirectionsUrl(toiletTarget, "android-system")).toBe(
      "geo:-33.8731,151.2062?q=-33.8731,151.2062(Town%20Hall%20amenities)",
    );
    expect(buildMapDirectionsUrl(toiletTarget, "apple")).toBe(
      "https://maps.apple.com/?daddr=-33.8731,151.2062&q=Town%20Hall%20amenities",
    );
    expect(buildMapDirectionsUrl(toiletTarget, "google")).toBe(
      "https://www.google.com/maps/dir/?api=1&destination=-33.8731,151.2062&travelmode=driving",
    );
    expect(buildMapDirectionsUrl(toiletTarget, "waze")).toBe(
      "https://waze.com/ul?ll=-33.8731,151.2062&navigate=yes",
    );
  });

  it("preserves custom guide navigation links for Google-style guide handoffs", () => {
    const guideTarget = {
      kind: "guide-place" as const,
      label: "The Rocks Markets",
      city: "Sydney",
      state: "NSW",
      navigationLink: "https://maps.example.com/custom-guide-link",
      lat: -33.8599,
      lng: 151.209,
    };

    expect(buildFocusedMapTargetDirectionsUrl(guideTarget, "google")).toBe(
      "https://maps.example.com/custom-guide-link",
    );
  });

  it("builds the nearby public toilet initial map action state", () => {
    expect(buildNearbyToiletsMapState()).toEqual({
      hoodienieMapSearch: {
        query: "Nearby public toilets",
        displayName: "Nearby public toilets",
        source: "nearby-toilets",
        initialAction: "find-nearby-toilet",
      },
    });
  });
});
