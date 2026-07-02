import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildHoodieShareDeepLinkForMatch,
  buildCityGuideShareDescriptor,
  buildAddressCheckShareDescriptor,
  buildOfficialEventShareDescriptor,
  buildPublicPlanInviteShareDescriptor,
  buildPublicPlanShareDescriptor,
  buildScamCheckShareDescriptor,
  buildSuburbSnapshotShareDescriptor,
  isApprovedHoodieShareUrl,
  matchHoodieSharePath,
  resolveHoodieShareAppRouteFromPath,
} from "./hoodie-share";

const { mockAppConfig } = vi.hoisted(() => ({
  mockAppConfig: {
    displayName: "Hoodie",
    shareBaseUrl: "https://suburb.knowwhatson.com",
    urlScheme: "com.burbmate.app",
  },
}));

vi.mock("./app-config", () => ({
  APP_CONFIG: mockAppConfig,
}));

describe("hoodie share descriptors", () => {
  beforeEach(() => {
    mockAppConfig.displayName = "Hoodie";
    mockAppConfig.shareBaseUrl = "https://suburb.knowwhatson.com";
    mockAppConfig.urlScheme = "com.burbmate.app";
  });

  it("builds public-safe event descriptors with canonical share links", () => {
    const descriptor = buildOfficialEventShareDescriptor({
      source: "cityofsydney",
      slug: "laneway-festival",
      title: "Laneway Festival",
      summary: "A big night out.",
      source_label: "City of Sydney What's On",
      free_event: true,
      dates_humanized: "Sat 12 Jul",
      venue_name: "Town Hall",
      suburb: "Sydney",
      image_url: "https://images.example.com/laneway.jpg",
      hero_image_url: "https://images.example.com/laneway-hero.jpg",
    });

    expect(descriptor.kind).toBe("event");
    expect(descriptor.privacyClass).toBe("public_safe");
    expect(descriptor.canonicalShareUrl).toBe(
      "https://suburb.knowwhatson.com/share/event/cityofsydney/laneway-festival",
    );
    expect(descriptor.appRoute).toBe("/events/cityofsydney/laneway-festival");
    expect(descriptor.shareCaption).toBe(
      "Laneway Festival\nhttps://suburb.knowwhatson.com/share/event/cityofsydney/laneway-festival",
    );
    expect(
      descriptor.shareCaption.match(/https:\/\/suburb\.knowwhatson\.com/g),
    ).toHaveLength(1);
    expect(descriptor.renderStyle).toBe("photo");
    expect(descriptor.backgroundImageUrl).toBe(
      "https://images.example.com/laneway-hero.jpg",
    );
    expect(descriptor.storyCardData.backgroundPosition).toBe("center center");
    expect(descriptor.storyCardData.eyebrowText).toBe("Check out");
    expect(descriptor.feedCardData.eyebrowText).toBe("Check out");
  });

  it("uses dedicated Instagram post and story images when an event provides them", () => {
    const descriptor = buildOfficialEventShareDescriptor({
      source: "eventbrite",
      slug: "omni-sydney-genai-film-festival",
      title: "OMNI Sydney – GenAI Film Festival",
      summary: "A screening and panel.",
      source_label: "Eventbrite",
      free_event: false,
      dates_humanized: "Thu 30 Apr",
      venue_name: "Michael Crouch Innovation Centre",
      suburb: "Kensington",
      image_url: "https://images.example.com/omni-card.jpg",
      hero_image_url: "https://images.example.com/omni-hero.jpg",
      instagram_post_image_url: "https://images.example.com/omni-post.png",
      instagram_story_image_url: "https://images.example.com/omni-story.png",
    });

    expect(descriptor.backgroundImageUrl).toBe(
      "https://images.example.com/omni-post.png",
    );
    expect(descriptor.feedCardData.backgroundImageUrl).toBe(
      "https://images.example.com/omni-post.png",
    );
    expect(descriptor.storyCardData.backgroundImageUrl).toBe(
      "https://images.example.com/omni-story.png",
    );
    expect(descriptor.feedCardData.renderStyle).toBe("photo");
    expect(descriptor.storyCardData.renderStyle).toBe("photo");
  });

  it("builds SETU share URLs and deep links from the active app config", () => {
    mockAppConfig.displayName = "SETU India AU";
    mockAppConfig.shareBaseUrl = "https://ghar.knowwhatson.com";
    mockAppConfig.urlScheme = "com.ghar.mobile";

    const descriptor = buildOfficialEventShareDescriptor({
      source: "cityofsydney",
      slug: "laneway-festival",
      title: "Laneway Festival",
      summary: "A big night out.",
      source_label: "City of Sydney What's On",
      free_event: true,
      dates_humanized: "Sat 12 Jul",
      venue_name: "Town Hall",
      suburb: "Sydney",
      image_url: "https://images.example.com/laneway.jpg",
      hero_image_url: "https://images.example.com/laneway-hero.jpg",
    });

    expect(descriptor.canonicalShareUrl).toBe(
      "https://ghar.knowwhatson.com/share/event/cityofsydney/laneway-festival",
    );
    expect(descriptor.shareTitle).toBe("Laneway Festival on SETU India AU");
    expect(
      buildHoodieShareDeepLinkForMatch({
        kind: "event",
        source: "cityofsydney",
        slug: "laneway-festival",
      }),
    ).toBe("com.ghar.mobile://events/cityofsydney/laneway-festival");
    expect(
      isApprovedHoodieShareUrl(
        new URL(
          "https://ghar.knowwhatson.com/share/event/cityofsydney/laneway-festival",
        ),
      ),
    ).toBe(true);
    expect(
      isApprovedHoodieShareUrl(
        new URL(
          "https://suburb.knowwhatson.com/share/event/cityofsydney/laneway-festival",
        ),
      ),
    ).toBe(false);
  });

  it("builds public-safe plan descriptors that open the plan inside the event page", () => {
    const descriptor = buildPublicPlanShareDescriptor({
      id: "plan-42",
      event_source: "cityofsydney",
      event_slug: "laneway-festival",
      title: "Meet by the fountain",
      note: "Blue jackets only.",
      meeting_point: "Town Hall fountain",
      meetup_at: "2026-07-12T18:30:00Z",
      attendee_count: 5,
      source_event: {
        id: "event-1",
        title: "Laneway Festival",
        summary: "",
        url: "",
        image_url: "",
        booking_url: "",
        venue_name: "Town Hall",
        suburb: "Sydney",
        dates_humanized: "Sat 12 Jul",
      },
    });

    expect(descriptor.kind).toBe("public_plan");
    expect(descriptor.privacyClass).toBe("public_safe");
    expect(descriptor.canonicalShareUrl).toBe(
      "https://suburb.knowwhatson.com/share/plan/cityofsydney/laneway-festival/plan-42",
    );
    expect(descriptor.appRoute).toBe(
      "/events/cityofsydney/laneway-festival?plan=plan-42",
    );
    expect(descriptor.renderStyle).toBe("brand");
  });

  it("builds invite-banner plan descriptors with event-led copy and clipboard text", () => {
    const descriptor = buildPublicPlanInviteShareDescriptor({
      id: "plan-42",
      event_source: "cityofsydney",
      event_slug: "laneway-festival",
      title: "Meet by the fountain",
      note: "Blue jackets only.",
      meeting_point: "Town Hall fountain",
      meetup_at: "2026-07-12T18:30:00Z",
      attendee_count: 5,
      source_event: {
        id: "event-1",
        title: "Laneway Festival",
        summary: "",
        url: "",
        image_url: "https://images.example.com/laneway.jpg",
        instagram_post_image_url: "https://images.example.com/laneway-post.png",
        instagram_story_image_url: "https://images.example.com/laneway-story.png",
        booking_url: "",
        venue_name: "Town Hall",
        suburb: "Sydney",
        dates_humanized: "Sat 12 Jul",
      },
    });

    expect(descriptor.canonicalShareUrl).toBe(
      "https://suburb.knowwhatson.com/share/plan/cityofsydney/laneway-festival/plan-42",
    );
    expect(descriptor.appRoute).toBe(
      "/events/cityofsydney/laneway-festival?plan=plan-42",
    );
    expect(descriptor.storyCardData.eyebrowText).toBe("Join me for");
    expect(descriptor.feedCardData.eyebrowText).toBe("Join me for");
    expect(descriptor.storyCardData.title).toBe("Laneway Festival");
    expect(descriptor.feedCardData.title).toBe("Laneway Festival");
    expect(descriptor.feedCardData.backgroundImageUrl).toBe(
      "https://images.example.com/laneway-post.png",
    );
    expect(descriptor.storyCardData.backgroundImageUrl).toBe(
      "https://images.example.com/laneway-story.png",
    );
    expect(descriptor.clipboardFallbackText).toBe(
      [
        "Join me for",
        "Laneway Festival",
        "https://suburb.knowwhatson.com/share/plan/cityofsydney/laneway-festival/plan-42",
      ].join("\n"),
    );
  });

  it("uses media-led cards for guides and stat-driven suburb snapshots", () => {
    const guideDescriptor = buildCityGuideShareDescriptor({
      slug: "10-best-cafes-to-work-from-in-adelaide",
      city: "Adelaide",
      city_slug: "adelaide",
      state: "SA",
      title: "10 Best Cafes to Work From in Adelaide",
      cover_image_url: "https://images.example.com/adelaide-guide.jpg",
      intro: "A curated guide.",
      places: [],
    });
    const suburbDescriptor = buildSuburbSnapshotShareDescriptor({
      suburb: "Haymarket",
      state: "NSW",
      totalStudents: 1168,
      badge: "Active Campus Vibe",
      crimeScore: 61,
      personalSafetyScore: 58,
      propertyCrimeScore: 64,
      crimeBand: "Moderate",
    });
    const photoSuburbDescriptor = buildSuburbSnapshotShareDescriptor({
      suburb: "Campbelltown",
      state: "NSW",
      totalStudents: 786,
      badge: "Cultural Infrastructure",
      crimeScore: 67,
      personalSafetyScore: 59,
      propertyCrimeScore: 70,
      summaryText:
        "Campbelltown blends strong student momentum with a practical day-to-day rhythm.",
      backgroundImageUrl: "https://images.example.com/campbelltown.jpg",
    });

    expect(guideDescriptor.renderStyle).toBe("photo");
    expect(guideDescriptor.backgroundImageUrl).toBe(
      "https://images.example.com/adelaide-guide.jpg",
    );
    expect(guideDescriptor.storyCardData.title).toBe(
      "10 Best Cafes to Work From in Adelaide",
    );
    expect(guideDescriptor.storyCardData.backgroundPosition).toBe(
      "center center",
    );
    expect(guideDescriptor.storyCardData.eyebrowText).toBe("Check this out");
    expect(guideDescriptor.feedCardData.eyebrowText).toBe("Check this out");
    expect(suburbDescriptor.renderStyle).toBe("brand");
    expect(suburbDescriptor.backgroundImageUrl).toBeUndefined();
    expect(suburbDescriptor.storyCardData.eyebrowText).toBe("Explore");
    expect(suburbDescriptor.storyCardData.insightBadgeText).toBe(
      "Active Campus Vibe",
    );
    expect(suburbDescriptor.storyCardData.summaryText).toContain(
      "1,168 tertiary students",
    );
    expect(suburbDescriptor.storyCardData.summaryText).not.toContain("Match");
    expect(suburbDescriptor.storyCardData.statTiles).toEqual([
      { label: "Crime score", value: "61" },
      { label: "Personal safety", value: "58" },
      { label: "Property crime", value: "64" },
      { label: "Tertiary students", value: "1,168" },
    ]);
    expect(photoSuburbDescriptor.renderStyle).toBe("photo");
    expect(photoSuburbDescriptor.backgroundImageUrl).toBe(
      "https://images.example.com/campbelltown.jpg",
    );
    expect(photoSuburbDescriptor.storyCardData.summaryText).toBe(
      "Campbelltown blends strong student momentum with a practical day-to-day rhythm.",
    );
  });

  it("maps public Hoodie share routes back to safe in-app routes", () => {
    expect(matchHoodieSharePath("/share/suburb/haymarket")).toEqual({
      kind: "suburb_snapshot",
      suburbSlug: "haymarket",
    });
    expect(
      resolveHoodieShareAppRouteFromPath("/share/guide/sydney/best-brunch"),
    ).toBe("/guide/sydney/best-brunch");
    expect(resolveHoodieShareAppRouteFromPath("/share/scam-check")).toBe(
      "/arrival?shared=scam-check",
    );
  });

  it("redacts personalized address shares down to suburb-level copy", () => {
    const descriptor = buildAddressCheckShareDescriptor({
      suburb: "Haymarket",
      state: "NSW",
      totalFlags: 2,
      matchedAddress: "12 / 123 Fake Street, Haymarket NSW 2000",
      summary: "Private note with phone 0400 000 000 and exact address.",
      query: "123 Fake Street",
    });

    const combinedCopy = [
      descriptor.shareCaption,
      descriptor.storyCardData.title,
    ].join(" ");

    expect(descriptor.privacyClass).toBe("personalized_generic_link");
    expect(combinedCopy).toContain("Haymarket");
    expect(combinedCopy).not.toContain("123 Fake Street");
    expect(combinedCopy).not.toContain("0400 000 000");
  });

  it("redacts scam shares down to generic risk and flag summaries", () => {
    const descriptor = buildScamCheckShareDescriptor({
      riskBand: "high",
      flagCount: 3,
      headline: "This exact listing is fake",
      summary: "Contains private notes and listing link",
      listingUrl: "https://example.com/private-listing",
      contactName: "John Doe",
    });

    const combinedCopy = [
      descriptor.shareCaption,
      descriptor.storyCardData.title,
    ].join(" ");

    expect(descriptor.privacyClass).toBe("personalized_generic_link");
    expect(combinedCopy).toContain("High risk");
    expect(combinedCopy).not.toContain("example.com/private-listing");
    expect(combinedCopy).not.toContain("John Doe");
  });
});
