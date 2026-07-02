// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OfficialEventPage } from "./official-event-page";

const {
  addEventToItineraryMock,
  createPublicPlanMock,
  fetchOfficialEventMock,
  fetchMyItineraryMock,
  fetchPublicPlansForEventMock,
  removeEventFromItineraryMock,
} = vi.hoisted(() => ({
  addEventToItineraryMock: vi.fn(),
  createPublicPlanMock: vi.fn(),
  fetchOfficialEventMock: vi.fn(),
  fetchMyItineraryMock: vi.fn(),
  fetchPublicPlansForEventMock: vi.fn(),
  removeEventFromItineraryMock: vi.fn(),
}));

vi.mock("../lib/api", () => ({
  addEventToItinerary: addEventToItineraryMock,
  createPublicPlan: createPublicPlanMock,
  createPublicPlanComment: vi.fn(),
  deletePublicPlan: vi.fn(),
  deletePublicPlanComment: vi.fn(),
  fetchOfficialEvent: fetchOfficialEventMock,
  fetchMyItinerary: fetchMyItineraryMock,
  fetchPublicPlanComments: vi.fn(),
  fetchPublicPlansForEvent: fetchPublicPlansForEventMock,
  joinPublicPlan: vi.fn(),
  leavePublicPlan: vi.fn(),
  reportPublicPlanContent: vi.fn(),
  removeEventFromItinerary: removeEventFromItineraryMock,
  updatePublicPlan: vi.fn(),
}));

vi.mock("../lib/app-config", () => ({
  APP_CONFIG: {
    displayName: "Hoodie",
    shareBaseUrl: "https://share.example.com",
    showOfficialEventsFeature: true,
    variant: "ghar",
  },
}));

vi.mock("../lib/official-event-map", () => ({
  buildOfficialEventMapSearch: vi.fn(() => null),
}));

vi.mock("../lib/platform", () => ({
  isNativeShell: () => false,
}));

vi.mock("../lib/contacts", () => ({
  checkInviteContactsPermission: vi.fn(),
  loadInviteContactPhoneEntries: vi.fn(),
  requestInviteContactsPermission: vi.fn(),
}));

vi.mock("../components/share/hoodie-share-actions", () => ({
  HoodieShareActions: ({
    variant,
    showGenericAction,
    descriptor,
  }: {
    variant?: string;
    showGenericAction?: boolean;
    descriptor?: {
      storyCardData?: { title?: string; eyebrowText?: string };
    };
  }) => (
    <div
      data-testid="event-share-actions"
      data-variant={variant || "default"}
      data-show-generic={String(showGenericAction !== false)}
      data-title={descriptor?.storyCardData?.title || ""}
      data-eyebrow={descriptor?.storyCardData?.eyebrowText || ""}
    >
      {variant === "invite" ? "Share as Invite" : "Share"}
    </div>
  ),
}));

type MountedComponent = {
  container: HTMLDivElement;
  root: Root;
};

const mountedComponents: MountedComponent[] = [];

const eventRecord = {
  id: "cityofsydney:hot-club",
  source: "cityofsydney",
  slug: "hot-club",
  title: "Hot Club Gypsy Swing with The Anna Weaving",
  summary: "A live swing night.",
  description: "A live swing night with friends.",
  source_label: "City of Sydney What's On",
  source_url: "https://whatson.cityofsydney.nsw.gov.au/events/hot-club",
  image_url: "https://images.example.com/event.jpg",
  hero_image_url: "https://images.example.com/event-hero.jpg",
  categories: ["music"],
  tags: ["live-music"],
  dates: ["2026-04-23"],
  venue_name: "Camelot Lounge",
  suburb: "Marrickville",
  free_event: false,
  upcoming_date: "2026-04-23",
  upcoming_time: "7:00 PM",
  event_type: ["Indoor"],
  lat: -33.911,
  lng: 151.154,
  address: "103 Railway Parade, Marrickville NSW 2204, Australia",
  location_additional_information: "",
  booking_url: "",
  website_url: "",
  contact_email: "",
  contact_phone: "",
  organiser: "",
  dates_humanized: "Apr 23, 2026 at 7:00 PM",
  accessibilities: [],
};

const createdPlan = {
  id: "plan-123",
  event_source: "cityofsydney",
  event_slug: "hot-club",
  title: "Hot Club Gypsy Swing with The Anna Weaving",
  note: "",
  meeting_point: "103 Railway Parade, Marrickville NSW 2204, Australia",
  meetup_at: "2026-04-23T19:00",
  attendee_cap: null,
  attendee_count: 1,
  attendees: [],
  status: "active",
  is_full: false,
  creator_name: "Rushi",
  viewer_joined: true,
  is_creator: true,
  can_join: false,
  can_leave: true,
  can_delete: true,
  can_comment: true,
  comment_count: 0,
  source_event: {
    id: "cityofsydney:hot-club",
    title: "Hot Club Gypsy Swing with The Anna Weaving",
    summary: "A live swing night.",
    url: "https://whatson.cityofsydney.nsw.gov.au/events/hot-club",
    image_url: "https://images.example.com/event.jpg",
    booking_url: "",
    venue_name: "Camelot Lounge",
    suburb: "Marrickville",
    dates_humanized: "Apr 23, 2026 at 7:00 PM",
  },
  created_at: "2026-04-22T01:00:00.000Z",
  updated_at: "2026-04-22T01:00:00.000Z",
};

async function flushEffects() {
  await act(async () => {
    await Promise.resolve();
  });
}

async function renderPage(
  initialEntry = "/events/cityofsydney/hot-club?compose=1",
) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  mountedComponents.push({ container, root });

  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/events/:source/:slug" element={<OfficialEventPage />} />
        </Routes>
      </MemoryRouter>,
    );
    await Promise.resolve();
  });

  await flushEffects();
  await flushEffects();
  return container;
}

function getButtonByText(container: HTMLElement, text: string) {
  const normalizedText = text.toLowerCase();
  const button = Array.from(container.querySelectorAll("button")).find((candidate) =>
    candidate.textContent?.replace(/\s+/g, " ").trim().toLowerCase().includes(normalizedText),
  );
  if (!button) throw new Error(`Could not find button containing "${text}".`);
  return button as HTMLButtonElement;
}

describe("OfficialEventPage plan sheets", () => {
  beforeEach(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    document.body.innerHTML = "";
    localStorage.clear();
    localStorage.setItem("ghar_email", "rushi@example.com");
    localStorage.setItem("ghar_first_name", "Rushi");

    addEventToItineraryMock.mockReset();
    fetchOfficialEventMock.mockReset();
    fetchMyItineraryMock.mockReset();
    fetchPublicPlansForEventMock.mockReset();
    createPublicPlanMock.mockReset();
    removeEventFromItineraryMock.mockReset();

    fetchOfficialEventMock.mockResolvedValue(eventRecord);
    fetchMyItineraryMock.mockResolvedValue([]);
    fetchPublicPlansForEventMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([createdPlan]);
    createPublicPlanMock.mockResolvedValue(createdPlan);
    addEventToItineraryMock.mockResolvedValue({
      id: "itinerary:cityofsydney:hot-club",
      app_variant: "ghar",
      email: "rushi@example.com",
      event_source: "cityofsydney",
      event_slug: "hot-club",
      event_key: "cityofsydney:hot-club",
      source_label: "City of Sydney What's On",
      title: eventRecord.title,
      summary: eventRecord.summary,
      image_url: eventRecord.image_url,
      hero_image_url: eventRecord.hero_image_url,
      booking_url: eventRecord.booking_url,
      source_url: eventRecord.source_url,
      venue_name: eventRecord.venue_name,
      suburb: eventRecord.suburb,
      address: eventRecord.address,
      dates_humanized: eventRecord.dates_humanized,
      event_day: eventRecord.upcoming_date,
      upcoming_time: eventRecord.upcoming_time,
      lat: eventRecord.lat,
      lng: eventRecord.lng,
      order: 0,
      attended_at: "2026-04-22T00:00:00.000Z",
      updated_at: "2026-04-22T00:00:00.000Z",
    });
    removeEventFromItineraryMock.mockResolvedValue(undefined);
  });

  afterEach(async () => {
    while (mountedComponents.length > 0) {
      const mounted = mountedComponents.pop();
      if (!mounted) break;
      await act(async () => {
        mounted.root.unmount();
        await Promise.resolve();
      });
      mounted.container.remove();
    }

    document.body.innerHTML = "";
    localStorage.clear();
  });

  it("keeps the compose sheet above the nav and advances into the invite sheet", async () => {
    const container = await renderPage();

    const eventShareActions = container.querySelector(
      '[data-testid="event-share-actions"]',
    );
    expect(eventShareActions?.getAttribute("data-variant")).toBe("invite");

    const composerSheet = container.querySelector(
      '[data-testid="plan-composer-sheet"]',
    );
    expect(composerSheet).toBeTruthy();
    expect(composerSheet?.className).toContain(
      "max-h-[var(--plan-sheet-mobile-max-height)]",
    );

    const overlayWrapper = composerSheet?.parentElement;
    expect(overlayWrapper?.className).toContain("z-[2101]");
    expect(overlayWrapper?.className).toContain(
      "pb-[var(--plan-sheet-bottom-clearance)]",
    );
    expect(container.textContent).toContain("Plan Details");

    const nextButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("Next"),
    );
    expect(nextButton).toBeTruthy();

    await act(async () => {
      nextButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });
    await flushEffects();
    await flushEffects();

    const inviteSheet = container.querySelector(
      '[data-testid="plan-invite-sheet"]',
    );
    expect(inviteSheet).toBeTruthy();
    expect(inviteSheet?.className).toContain(
      "max-h-[var(--plan-sheet-mobile-max-height)]",
    );
    expect(inviteSheet?.parentElement?.className).toContain("z-[2101]");
    expect(container.textContent).toContain("Invite Friends");

    const shareActions = Array.from(
      container.querySelectorAll('[data-testid="event-share-actions"]'),
    );
    expect(shareActions.length).toBeGreaterThanOrEqual(2);
    expect(
      shareActions.every(
        (node) => node.getAttribute("data-variant") === "invite",
      ),
    ).toBe(true);

    const inviteSheetShareAction = shareActions.find(
      (node) => node.getAttribute("data-show-generic") === "false",
    );
    expect(inviteSheetShareAction).toBeTruthy();
    expect(inviteSheetShareAction?.getAttribute("data-title")).toBe(
      "Hot Club Gypsy Swing with The Anna Weaving",
    );
    expect(inviteSheetShareAction?.getAttribute("data-eyebrow")).toBe(
      "Join me for",
    );
    expect(container.textContent).toContain("Share as Invite");
    expect(container.textContent).toContain("System Share");
  });

  it("suppresses plan UI for external event listings even with compose in the URL", async () => {
    fetchOfficialEventMock.mockResolvedValueOnce({
      ...eventRecord,
      id: "eventbrite:omni-sydney-genai-film-festival",
      source: "eventbrite",
      source_label: "Eventbrite",
      slug: "omni-sydney-genai-film-festival",
      title: "OMNI Sydney – GenAI Film Festival",
    });
    fetchPublicPlansForEventMock.mockResolvedValueOnce([]);

    const container = await renderPage(
      "/events/eventbrite/omni-sydney-genai-film-festival?compose=1",
    );

    expect(
      container.querySelector('[data-testid="plan-composer-sheet"]'),
    ).toBeNull();
    expect(container.textContent).toContain(
      "Public plans are not available for this external event listing yet.",
    );
    expect(container.textContent).not.toContain("Plans");
    expect(container.textContent).not.toContain("Make plan");
  });

  it("toggles Attend and Attending through the synced itinerary API", async () => {
    const container = await renderPage("/events/cityofsydney/hot-club");

    const attendButton = getButtonByText(container, "Attend");
    expect(fetchMyItineraryMock).toHaveBeenCalledWith({
      email: "rushi@example.com",
      appVariant: "ghar",
    });

    await act(async () => {
      attendButton.click();
      await Promise.resolve();
    });
    await flushEffects();

    expect(addEventToItineraryMock).toHaveBeenCalledWith({
      email: "rushi@example.com",
      event: eventRecord,
      appVariant: "ghar",
    });
    expect(getButtonByText(container, "Attending")).toBeTruthy();

    await act(async () => {
      getButtonByText(container, "Attending").click();
      await Promise.resolve();
    });
    await flushEffects();

    expect(removeEventFromItineraryMock).toHaveBeenCalledWith({
      email: "rushi@example.com",
      eventSource: "cityofsydney",
      eventSlug: "hot-club",
      appVariant: "ghar",
    });
    expect(getButtonByText(container, "Attend")).toBeTruthy();
  });
});
