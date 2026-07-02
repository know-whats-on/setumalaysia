// @vitest-environment jsdom

import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import { ItineraryRouteMap } from "./itinerary-route-map";

const mapMockState = vi.hoisted(() => ({
  fitBounds: vi.fn(),
  resize: vi.fn(),
  zoomIn: vi.fn(),
  zoomOut: vi.fn(),
}));

vi.mock("react-map-gl/maplibre", async () => {
  const React = await import("react");
  const MapGL = React.forwardRef(function MockMapGL(
    props: React.PropsWithChildren<{
      onLoad?: (event: { target: typeof mapMockState }) => void;
      mapStyle?: string;
    }>,
    ref,
  ) {
    React.useImperativeHandle(ref, () => ({
      getMap: () => mapMockState,
    }));
    React.useEffect(() => {
      props.onLoad?.({ target: mapMockState });
    }, [props]);
    return (
      <div data-testid="route-map" data-map-style={props.mapStyle || ""}>
        {props.children}
      </div>
    );
  });
  const Source = ({ id, children }: React.PropsWithChildren<{ id: string }>) => (
    <div data-testid={`source-${id}`}>{children}</div>
  );
  const Layer = ({ id }: { id: string }) => <div data-testid={`layer-${id}`} />;
  const Marker = ({ children }: React.PropsWithChildren) => <div data-testid="marker">{children}</div>;
  return { default: MapGL, Layer, Marker, Source };
});

describe("ItineraryRouteMap", () => {
  let root: Root | null = null;
  let host: HTMLDivElement | null = null;

  afterEach(() => {
    if (root) {
      act(() => root?.unmount());
    }
    host?.remove();
    root = null;
    host = null;
    mapMockState.fitBounds.mockClear();
    mapMockState.resize.mockClear();
    mapMockState.zoomIn.mockClear();
    mapMockState.zoomOut.mockClear();
  });

  it("fits stops and wires explicit zoom controls to the map", () => {
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);

    act(() => {
      root?.render(
        <ItineraryRouteMap
          stops={[
            { id: "one", stopNumber: 1, title: "One", lat: -33.87, lng: 151.2 },
            { id: "two", stopNumber: 2, title: "Two", lat: -33.86, lng: 151.22 },
          ]}
          routeGeoJson={{ type: "FeatureCollection", features: [] }}
          initialViewState={{ longitude: 151.2, latitude: -33.87, zoom: 12 }}
          mapStyle="map-style-url"
          isSetuChina={false}
        />,
      );
    });

    expect(host.querySelector('[data-testid="route-map"]')).toBeTruthy();
    expect(host.querySelectorAll('[data-testid="marker"]')).toHaveLength(2);
    expect(mapMockState.fitBounds).toHaveBeenCalled();

    act(() => {
      host?.querySelector<HTMLButtonElement>('[data-testid="itinerary-map-zoom-in"]')?.click();
      host?.querySelector<HTMLButtonElement>('[data-testid="itinerary-map-zoom-out"]')?.click();
    });

    expect(mapMockState.zoomIn).toHaveBeenCalledWith({ duration: 180 });
    expect(mapMockState.zoomOut).toHaveBeenCalledWith({ duration: 180 });
  });
});
