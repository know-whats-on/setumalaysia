import { describe, expect, it } from "vitest";
import { sanitizeOfficialEventsPayload } from "./official-events-feed";

describe("sanitizeOfficialEventsPayload", () => {
  it("keeps canonical City of Sydney records and preserves provided facets", () => {
    const response = sanitizeOfficialEventsPayload(
      [
        {
          source: "cityofsydney",
          source_url:
            "https://whatson.cityofsydney.nsw.gov.au/events/laneway-festival",
          title: "Laneway Festival",
          categories: ["Indoor"],
          tags: ["Music", "Festivals"],
        },
      ],
      {
        available_categories: [{ id: "indoor", label: "Indoor", count: 1 }],
        available_tags: [{ id: "music", label: "Music", count: 1 }],
        total_candidates: 1,
      },
    );

    expect(response.data).toHaveLength(1);
    expect(response.data[0]?.source).toBe("cityofsydney");
    expect(response.meta.available_categories).toEqual([
      { id: "indoor", label: "Indoor", count: 1 },
    ]);
    expect(response.meta.available_tags).toEqual([
      { id: "music", label: "Music", count: 1 },
    ]);
    expect(response.meta.total_candidates).toBe(1);
  });

  it("rebuilds facets from canonical What’s On records when meta is missing", () => {
    const response = sanitizeOfficialEventsPayload([
      {
        source: "cityofsydney",
        source_url:
          "https://whatson.cityofsydney.nsw.gov.au/events/canonical-event",
        title: "Canonical Event",
        categories: ["Indoor"],
        tags: ["Talks, courses & workshops", "Arts"],
      },
      {
        source: "sydneycom",
        source_url: "https://www.sydney.com/events/retired-event",
        title: "Retired Event",
        categories: ["Outdoor"],
        tags: ["Retired"],
      },
    ]);

    expect(response.data).toHaveLength(1);
    expect(response.data[0]?.source).toBe("cityofsydney");
    expect(response.meta.available_categories).toEqual([
      { id: "indoor", label: "Indoor", count: 1 },
    ]);
    expect(response.meta.available_tags).toEqual([
      { id: "arts", label: "Arts", count: 1 },
      {
        id: "talks-courses-workshops",
        label: "Talks, courses & workshops",
        count: 1,
      },
    ]);
    expect(response.meta.total_candidates).toBe(1);
  });

  it("keeps SWF records and rebuilds facets after filtering unsupported sources", () => {
    const response = sanitizeOfficialEventsPayload(
      [
        {
          source: "swf",
          source_url:
            "https://www.swf.org.au/program/out-of-season-2026/proudfoot-friends/",
          title: "Proudfoot & Friends",
          categories: ["Family Program"],
          tags: ["Sydney Writers' Festival", "Lucas Proudfoot"],
        },
        {
          source: "external",
          source_url: "https://events.example.com/unsupported",
          title: "Unsupported Event",
          categories: ["Outdoor"],
          tags: ["Unsupported"],
        },
      ],
      {
        available_categories: [{ id: "outdoor", label: "Outdoor", count: 1 }],
        available_tags: [{ id: "unsupported", label: "Unsupported", count: 1 }],
        total_candidates: 2,
      },
    );

    expect(response.data).toHaveLength(1);
    expect(response.data[0]?.source).toBe("swf");
    expect(response.meta.available_categories).toEqual([
      { id: "family-program", label: "Family Program", count: 1 },
    ]);
    expect(response.meta.available_tags).toEqual([
      { id: "lucas-proudfoot", label: "Lucas Proudfoot", count: 1 },
      {
        id: "sydney-writers-festival",
        label: "Sydney Writers' Festival",
        count: 1,
      },
    ]);
    expect(response.meta.total_candidates).toBe(1);
  });

  it("keeps University Events records and rebuilds facets from supported sources only", () => {
    const response = sanitizeOfficialEventsPayload(
      [
        {
          source: "arcunsw",
          source_url: "https://campus.hellorubric.com/?eid=66103",
          title: "Tea Tasting Night",
          categories: ["Workshop"],
          tags: ["UNSW", "Sydney", "Student", "Arc Clubs"],
        },
        {
          source: "universityevents",
          source_url: "https://campus.hellorubric.com/search?eid=90001",
          title: "Campus Market Day",
          categories: ["Market"],
          tags: ["University", "Student", "Victoria"],
        },
        {
          source: "sydneycom",
          source_url: "https://www.sydney.com/events/retired-event",
          title: "Retired Event",
          categories: ["Outdoor"],
          tags: ["Retired"],
        },
      ],
      {
        available_categories: [{ id: "outdoor", label: "Outdoor", count: 1 }],
        available_tags: [{ id: "retired", label: "Retired", count: 1 }],
        total_candidates: 2,
      },
    );

    expect(response.data).toHaveLength(2);
    expect(response.data[0]?.source).toBe("arcunsw");
    expect(response.data[1]?.source).toBe("universityevents");
    expect(response.meta.available_categories).toEqual([
      { id: "market", label: "Market", count: 1 },
      { id: "workshop", label: "Workshop", count: 1 },
    ]);
    expect(response.meta.available_tags).toEqual([
      { id: "student", label: "Student", count: 2 },
      { id: "arc-clubs", label: "Arc Clubs", count: 1 },
      { id: "sydney", label: "Sydney", count: 1 },
      { id: "university", label: "University", count: 1 },
      { id: "unsw", label: "UNSW", count: 1 },
      { id: "victoria", label: "Victoria", count: 1 },
    ]);
    expect(response.meta.total_candidates).toBe(2);
  });

  it("allows Bayside Council What's On records and rejects unrelated council URLs", () => {
    const response = sanitizeOfficialEventsPayload(
      [
        {
          source: "bayside",
          source_url: "https://www.bayside.nsw.gov.au/whats-on/wolli-creek-walk",
          title: "Wolli Creek Walk",
          categories: ["Bayside Council"],
          tags: ["Bayside", "What's On"],
        },
        {
          source: "external",
          source_url: "https://www.bayside.nsw.gov.au/services/waste-recycling",
          title: "Waste page",
          categories: ["Services"],
          tags: ["Waste"],
        },
      ],
      {
        available_categories: [{ id: "services", label: "Services", count: 1 }],
        available_tags: [{ id: "waste", label: "Waste", count: 1 }],
        total_candidates: 2,
      },
    );

    expect(response.data).toHaveLength(1);
    expect(response.data[0]?.source).toBe("bayside");
    expect(response.meta.available_categories).toEqual([
      { id: "bayside-council", label: "Bayside Council", count: 1 },
    ]);
    expect(response.meta.available_tags).toEqual([
      { id: "bayside", label: "Bayside", count: 1 },
      { id: "what-s-on", label: "What's On", count: 1 },
    ]);
    expect(response.meta.total_candidates).toBe(1);
  });

  it("allows Inner West Council What's On records and rebuilds scraped category facets", () => {
    const response = sanitizeOfficialEventsPayload(
      [
        {
          source: "innerwest",
          source_url:
            "https://www.innerwest.nsw.gov.au/whats-on/grounded-growing-country",
          title: "Grounded: Growing Country",
          categories: ["Exhibitions", "First Nations"],
          tags: ["Inner West", "Leichhardt", "Wheelchair accessible"],
        },
        {
          source: "innerwest",
          source_url:
            "https://www.innerwest.nsw.gov.au/explore/libraries/library-events",
          title: "Library landing page",
          categories: ["Libraries"],
          tags: ["Inner West"],
        },
      ],
      {
        available_categories: [{ id: "libraries", label: "Libraries", count: 1 }],
        available_tags: [{ id: "inner-west", label: "Inner West", count: 1 }],
        total_candidates: 2,
      },
    );

    expect(response.data).toHaveLength(1);
    expect(response.data[0]?.source).toBe("innerwest");
    expect(response.meta.available_categories).toEqual([
      { id: "exhibitions", label: "Exhibitions", count: 1 },
      { id: "first-nations", label: "First Nations", count: 1 },
    ]);
    expect(response.meta.available_tags).toEqual([
      { id: "inner-west", label: "Inner West", count: 1 },
      { id: "leichhardt", label: "Leichhardt", count: 1 },
      {
        id: "wheelchair-accessible",
        label: "Wheelchair accessible",
        count: 1,
      },
    ]);
    expect(response.meta.total_candidates).toBe(1);
  });

  it("keeps supported venue source records returned by the backend", () => {
    const response = sanitizeOfficialEventsPayload(
      [
        {
          source: "artgallerynsw",
          source_url:
            "https://www.artgallery.nsw.gov.au/whats-on/events/auslan-tour-archibald-prize-2026",
          title: "Auslan tour",
          categories: ["NSW Art Gallery"],
          tags: ["Art Gallery of NSW"],
        },
        {
          source: "iccsydney",
          source_url: "https://tiktokentcent.com/event/fastlove/",
          title: "Fastlove",
          categories: ["ICC Sydney", "TikTok Entertainment Center"],
          tags: ["TikTok Entertainment Centre"],
        },
        {
          source: "barangaroo",
          source_url: "https://www.barangaroo.com/whats-on/events/winter-market",
          title: "Winter Market",
          categories: ["Barangaroo"],
          tags: ["Sydney"],
        },
        {
          source: "mcasydney",
          source_url:
            "https://www.mca.com.au/events-programs/calendar/mca-late-2025-26/",
          title: "MCA Late",
          categories: ["MCA Sydney"],
          tags: ["Museum of Contemporary Art Australia"],
        },
        {
          source: "atparramatta",
          source_url: "https://atparramatta.com/whats-on/harry-potter-exhibition",
          title: "Harry Potter: The Exhibition",
          categories: ["Parramatta", "Western Sydney"],
          tags: ["At Parramatta"],
        },
        {
          source: "canterburybankstown",
          source_url:
            "https://whereinterestinghappens.com.au/event/loveearlwood2026/",
          title: "Love Earlwood",
          categories: ["Canterbury Events"],
          tags: ["Where Interesting Happens"],
        },
        {
          source: "external",
          source_url: "https://events.example.com/unsupported",
          title: "Unsupported",
          categories: ["Unsupported"],
          tags: ["Unsupported"],
        },
      ],
      {
        available_categories: [{ id: "unsupported", label: "Unsupported", count: 1 }],
        available_tags: [{ id: "unsupported", label: "Unsupported", count: 1 }],
        total_candidates: 7,
      },
    );

    expect(response.data.map((event) => event.source)).toEqual([
      "artgallerynsw",
      "iccsydney",
      "barangaroo",
      "mcasydney",
      "atparramatta",
      "canterburybankstown",
    ]);
    expect(response.meta.available_categories).toEqual([
      { id: "barangaroo", label: "Barangaroo", count: 1 },
      { id: "canterbury-events", label: "Canterbury Events", count: 1 },
      { id: "icc-sydney", label: "ICC Sydney", count: 1 },
      { id: "mca-sydney", label: "MCA Sydney", count: 1 },
      { id: "nsw-art-gallery", label: "NSW Art Gallery", count: 1 },
      { id: "parramatta", label: "Parramatta", count: 1 },
      {
        id: "tiktok-entertainment-center",
        label: "TikTok Entertainment Center",
        count: 1,
      },
      { id: "western-sydney", label: "Western Sydney", count: 1 },
    ]);
    expect(response.meta.total_candidates).toBe(6);
  });
});
