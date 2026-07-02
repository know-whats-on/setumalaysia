// @vitest-environment jsdom

import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PrivatePlanPage } from "./private-plan-page";

const {
  fetchItineraryWalkingRouteMock,
  fetchPublicPlanMock,
  fetchPublicPlanCommentsMock,
} = vi.hoisted(() => ({
  fetchItineraryWalkingRouteMock: vi.fn(),
  fetchPublicPlanMock: vi.fn(),
  fetchPublicPlanCommentsMock: vi.fn(),
}));

vi.mock("../lib/api", () => ({
  createPublicPlanComment: vi.fn(),
  fetchItineraryWalkingRoute: fetchItineraryWalkingRouteMock,
  fetchPublicPlan: fetchPublicPlanMock,
  fetchPublicPlanComments: fetchPublicPlanCommentsMock,
  joinPublicPlan: vi.fn(),
  leavePublicPlan: vi.fn(),
  rejectPublicPlan: vi.fn(),
}));

vi.mock("../lib/app-config", () => ({
  APP_CONFIG: {
    displayName: "Hoodie",
    variant: "ghar",
  },
}));

vi.mock("react-map-gl/maplibre", async () => {
  const React = await import("react");
  const mapTarget = {
    fitBounds: vi.fn(),
    resize: vi.fn(),
    zoomIn: vi.fn(),
    zoomOut: vi.fn(),
  };
  const MapGL = React.forwardRef(function MockMapGL(
    props: React.PropsWithChildren<{
      mapStyle?: string;
      onLoad?: (event: { target: typeof mapTarget }) => void;
    }>,
    ref,
  ) {
    React.useImperativeHandle(ref, () => ({
      getMap: () => mapTarget,
    }));
    React.useEffect(() => {
      props.onLoad?.({ target: mapTarget });
    }, [props]);
    return <div data-testid="plan-route-map" data-map-style={props.mapStyle || ""}>{props.children}</div>;
  });
  const Source = ({ children }: React.PropsWithChildren) => <div>{children}</div>;
  const Layer = () => <div />;
  const Marker = ({ children }: React.PropsWithChildren) => <div>{children}</div>;
  return { default: MapGL, Layer, Marker, Source };
});

function buildItineraryPlan() {
  const stops = Array.from({ length: 4 }, (_, index) => ({
    kind: "event",
    event_key: `cityofsydney:event-${index + 1}`,
    event_source: "cityofsydney",
    event_slug: `event-${index + 1}`,
    title: `Event ${index + 1}`,
    summary: "",
    image_url: "",
    hero_image_url: "",
    booking_url: "",
    source_url: "",
    venue_name: "Town Hall",
    suburb: "Sydney",
    address: "",
    dates_humanized: "21 Jun 2026",
    event_day: "2026-06-21",
    upcoming_time: "10am",
    lat: -33.87 + index * 0.001,
    lng: 151.2 + index * 0.001,
  }));
  return {
    id: "plan-itinerary",
    visibility: "public",
    source_type: "itinerary",
    invite_token: "",
    event_source: "itinerary",
    event_slug: "plan-itinerary",
    title: "21 Jun 2026 itinerary",
    note: "4 stop route from my itinerary.",
    meeting_point: "Town Hall",
    meetup_at: "2099-06-21T09:00:00.000Z",
    attendee_cap: null,
    attendee_count: 1,
    attendees: [{ id: "attendee-1", display_name: "Rushi V.", joined_at: "", is_creator: true }],
    status: "active",
    is_full: false,
    creator_name: "Rushi V.",
    viewer_joined: true,
    viewer_invited: false,
    is_creator: true,
    can_join: false,
    can_leave: true,
    can_delete: true,
    can_reject: false,
    can_comment: true,
    comment_count: 0,
    invitee_count: 0,
    source_event: {
      id: "itinerary:plan-itinerary",
      title: "21 Jun 2026 itinerary",
      summary: "",
      url: "",
      image_url: "",
      booking_url: "",
      venue_name: "Town Hall",
      suburb: "Sydney",
      dates_humanized: "2026-06-21",
    },
    itinerary_owner_email: "receiver@example.com",
    itinerary_day: "2026-06-21",
    itinerary_sync_status: "live",
    itinerary_stops: stops,
    itinerary_route_distance_m: null,
    itinerary_route_duration_s: null,
    itinerary_route_geometry_status: "unavailable",
    created_at: "",
    updated_at: "",
  };
}

describe("PrivatePlanPage", () => {
  let root: Root | null = null;
  let host: HTMLDivElement | null = null;

  beforeEach(() => {
    window.localStorage.setItem("ghar_email", "receiver@example.com");
    fetchPublicPlanMock.mockResolvedValue(buildItineraryPlan());
    fetchPublicPlanCommentsMock.mockResolvedValue([]);
    fetchItineraryWalkingRouteMock.mockResolvedValue({
      status: "walking",
      distance_m: 1200,
      duration_s: 600,
      stop_count: 4,
      geometry: { type: "FeatureCollection", features: [] },
    });
  });

  afterEach(() => {
    if (root) {
      act(() => root?.unmount());
    }
    host?.remove();
    root = null;
    host = null;
    window.localStorage.clear();
    fetchPublicPlanMock.mockReset();
    fetchPublicPlanCommentsMock.mockReset();
    fetchItineraryWalkingRouteMock.mockReset();
  });

  it("shows itinerary spot count instead of the legacy generated route note", async () => {
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);

    await act(async () => {
      root?.render(
        <MemoryRouter initialEntries={["/plans/plan-itinerary"]}>
          <Routes>
            <Route path="/plans/:planId" element={<PrivatePlanPage />} />
          </Routes>
        </MemoryRouter>,
      );
      await Promise.resolve();
    });

    expect(host.textContent).toContain("4 spots");
    expect(host.textContent).not.toContain("4 stop route from my itinerary.");
    const planRouteMap = host.querySelector<HTMLElement>('[data-testid="plan-route-map"]');
    expect(planRouteMap).toBeTruthy();
    expect(planRouteMap?.dataset.mapStyle).toContain("dataviz-light");
    expect(planRouteMap?.dataset.mapStyle).not.toContain("R7jI4ATui5CXwNCS2s2v");
  });
});
