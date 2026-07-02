import { describe, expect, it } from "vitest";
import {
  FLAGSHIP_EVENT_GUIDES,
  getFlagshipEventGuideMeta,
  getFlagshipEventStatus,
  getVisibleFlagshipEventGuides,
  isValidFlagshipImageUrl,
  toFlagshipCityGuide,
} from "./flagship-event-guides";

const launchNow = new Date("2026-05-30T12:00:00+10:00");
const kingsBirthdayWeekend = new Date("2026-06-07T12:00:00+10:00");

const kingBirthdayGuideSlugs = [
  "kings-birthday-sydney-2026",
  "kings-birthday-melbourne-2026",
  "kings-birthday-adelaide-2026",
  "kings-birthday-canberra-2026",
  "kings-birthday-hobart-2026",
  "kings-birthday-darwin-2026",
  "kings-birthday-newcastle-2026",
  "kings-birthday-wollongong-2026",
  "national-celtic-folk-festival-geelong-2026",
  "kings-birthday-armidale-2026",
];

function entry(slug: string) {
  const match = FLAGSHIP_EVENT_GUIDES.find((guide) => guide.slug === slug);
  if (!match) throw new Error(`Missing flagship guide ${slug}`);
  return match;
}

describe("flagship event guides", () => {
  it("uses direct public image URLs for every static event image", () => {
    expect(FLAGSHIP_EVENT_GUIDES).toHaveLength(27);

    for (const guide of FLAGSHIP_EVENT_GUIDES) {
      expect(isValidFlagshipImageUrl(guide.coverImageUrl)).toBe(true);
      expect(isValidFlagshipImageUrl(guide.bannerImageUrl)).toBe(true);

      for (const imageUrl of [guide.coverImageUrl, guide.bannerImageUrl]) {
        const parsed = new URL(imageUrl);
        expect(["http:", "https:"]).toContain(parsed.protocol);
        expect(imageUrl).not.toMatch(/^(?:data|blob):/i);
        expect(imageUrl).not.toMatch(/^\//);
      }

      for (const section of guide.liveSections || []) {
        if (section.imageUrl) {
          expect(isValidFlagshipImageUrl(section.imageUrl)).toBe(true);
        }
      }
    }
  });

  it("rejects generated, local, and ordinary page URLs for flagship images", () => {
    expect(isValidFlagshipImageUrl("data:image/svg+xml;base64,AAAA")).toBe(
      false,
    );
    expect(isValidFlagshipImageUrl("blob:https://example.com/image")).toBe(
      false,
    );
    expect(isValidFlagshipImageUrl("/assets/event-banner.png")).toBe(false);
    expect(isValidFlagshipImageUrl("https://example.com/event-page")).toBe(
      false,
    );
  });

  it("classifies live and countdown events on 30 May 2026", () => {
    expect(getFlagshipEventStatus(entry("vivid-sydney-2026"), launchNow)).toBe(
      "live",
    );
    expect(
      getFlagshipEventStatus(entry("rising-melbourne-2026"), launchNow),
    ).toBe("live");
    expect(
      getFlagshipEventStatus(
        entry("mindil-beach-sunset-market-2026"),
        launchNow,
      ),
    ).toBe("live");
    expect(
      getFlagshipEventStatus(entry("armidale-eisteddfod-2026"), launchNow),
    ).toBe("live");
    expect(
      getFlagshipEventStatus(entry("illuminate-adelaide-2026"), launchNow),
    ).toBe("countdown");
    expect(
      getFlagshipEventStatus(entry("sydney-nye-2026"), launchNow),
    ).toBe("countdown");
  });

  it("hides static events after their confirmed 2026 date range passes", () => {
    const afterEisteddfod = new Date("2026-06-04T12:00:00+10:00");
    const visibleArmidaleGuides = getVisibleFlagshipEventGuides(
      "armidale",
      afterEisteddfod,
    );

    expect(
      visibleArmidaleGuides.some(
        (guide) => guide.slug === "armidale-eisteddfod-2026",
      ),
    ).toBe(false);
    expect(
      visibleArmidaleGuides.some(
        (guide) => guide.slug === "kings-birthday-armidale-2026",
      ),
    ).toBe(true);
  });

  it("returns countdown shell places for future events and live sections for live events", () => {
    const futureGuides = getVisibleFlagshipEventGuides("sydney", launchNow);
    const nye = futureGuides.find((guide) => guide.slug === "sydney-nye-2026");
    const vivid = toFlagshipCityGuide(entry("vivid-sydney-2026"), launchNow);

    expect(nye?.places).toHaveLength(1);
    expect(nye?.places[0]?.name).toBe("Event info and countdown");
    expect(vivid?.places.length).toBeGreaterThan(1);
    expect(vivid?.places[0]?.name).toContain("Light Walk");
  });

  it("does not surface the duplicate static Vivid guide in Sydney", () => {
    const visibleSydneyGuides = getVisibleFlagshipEventGuides(
      "sydney",
      launchNow,
    );

    expect(
      visibleSydneyGuides.some((guide) => guide.slug === "vivid-sydney-2026"),
    ).toBe(false);
    expect(
      visibleSydneyGuides.some((guide) => guide.slug === "sydney-nye-2026"),
    ).toBe(true);
  });

  it("surfaces June King's Birthday weekend guides and skips QLD and WA cities", () => {
    for (const slug of kingBirthdayGuideSlugs) {
      const guideEntry = entry(slug);
      expect(getFlagshipEventStatus(guideEntry, kingsBirthdayWeekend)).toBe(
        "live",
      );
      expect(guideEntry.pinInGuideFeed).toBe(true);
      expect(guideEntry.position).toBe(-2000);
      expect(toFlagshipCityGuide(guideEntry, kingsBirthdayWeekend).app_variant).toBe(
        "all",
      );
    }

    const sydneyGuides = getVisibleFlagshipEventGuides(
      "sydney",
      kingsBirthdayWeekend,
    );
    expect(sydneyGuides[0]?.slug).toBe("kings-birthday-sydney-2026");

    for (const skippedCitySlug of ["brisbane", "gold-coast", "perth"]) {
      expect(
        FLAGSHIP_EVENT_GUIDES.some(
          (guide) =>
            guide.citySlug === skippedCitySlug &&
            guide.slug.includes("kings-birthday"),
        ),
      ).toBe(false);
    }
  });

  it("uses activity-level coordinates and navigation links for live guide sections", () => {
    const melbourne = toFlagshipCityGuide(
      entry("kings-birthday-melbourne-2026"),
      kingsBirthdayWeekend,
    );
    const market = melbourne.places.find((place) =>
      place.name.includes("Taste of Portugal"),
    );

    expect(market?.lat).toBe(-37.8076);
    expect(market?.lng).toBe(144.9568);
    expect(market?.navigation_link).toBe(
      "https://www.google.com/maps/dir/?api=1&destination=-37.8076,144.9568&travelmode=driving",
    );
    expect(melbourne.places[1]?.lat).toBe(-37.819967);
    expect(melbourne.places[1]?.navigation_link).toContain(
      "destination=-37.819967,144.983449",
    );
  });

  it("keeps legacy Vivid guide slugs themed", () => {
    expect(
      getFlagshipEventGuideMeta({
        slug: "vivid-sydney-2026-light-walk",
        city: "Sydney",
        city_slug: "sydney",
      })?.slug,
    ).toBe("vivid-sydney-2026");
  });
});
