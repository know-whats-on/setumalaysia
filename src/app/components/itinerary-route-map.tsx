import { Minus, Plus } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import MapGL, { Layer, Marker, Source } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";

export const ITINERARY_MAP_STYLE_URL =
  "https://api.maptiler.com/maps/dataviz-light/style.json?key=KUC6giLOTNJZVNNb8YoO";

type MapTarget = {
  resize?: () => void;
  fitBounds?: (
    bounds: [[number, number], [number, number]],
    options?: Record<string, unknown>,
  ) => void;
  zoomIn?: (options?: Record<string, unknown>) => void;
  zoomOut?: (options?: Record<string, unknown>) => void;
};

type MapRefLike = {
  getMap?: () => MapTarget;
} & MapTarget;

export type ItineraryRouteMapStop = {
  id: string;
  stopNumber: number;
  title: string;
  lat: number;
  lng: number;
};

export function getItineraryRouteMapBounds(stops: ItineraryRouteMapStop[]) {
  return {
    minLat: Math.min(...stops.map((stop) => stop.lat)),
    maxLat: Math.max(...stops.map((stop) => stop.lat)),
    minLng: Math.min(...stops.map((stop) => stop.lng)),
    maxLng: Math.max(...stops.map((stop) => stop.lng)),
  };
}

export function ItineraryRouteMap({
  stops,
  routeGeoJson,
  initialViewState,
  mapStyle,
  isSetuChina,
  sourceId = "itinerary-route-line",
  layerId = "itinerary-route-line-layer",
  deferUntilVisible = false,
}: {
  stops: ItineraryRouteMapStop[];
  routeGeoJson: unknown;
  initialViewState: {
    longitude: number;
    latitude: number;
    zoom: number;
  };
  mapStyle: string;
  isSetuChina: boolean;
  sourceId?: string;
  layerId?: string;
  deferUntilVisible?: boolean;
}) {
  const mapRef = useRef<MapRefLike | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const userAdjustedMapRef = useRef(false);
  const refreshTimersRef = useRef<number[]>([]);
  const refreshAnimationRef = useRef<number | null>(null);
  const didRefreshOnIdleRef = useRef(false);
  const [shouldMountMap, setShouldMountMap] = useState(!deferUntilVisible);
  const [mapError, setMapError] = useState("");

  const getMapTarget = useCallback(() => {
    return mapRef.current?.getMap?.() || mapRef.current;
  }, []);

  const fitRoute = useCallback(
    (mapTarget: MapTarget | null | undefined, options: { fit?: boolean } = {}) => {
      if (!mapTarget) return;
      mapTarget.resize?.();
      if (options.fit === false || userAdjustedMapRef.current || stops.length <= 1 || !mapTarget.fitBounds) {
        return;
      }
      const bounds = getItineraryRouteMapBounds(stops);
      mapTarget.fitBounds(
        [
          [bounds.minLng, bounds.minLat],
          [bounds.maxLng, bounds.maxLat],
        ],
        { padding: 46, maxZoom: 14, duration: 0 },
      );
    },
    [stops],
  );

  const clearScheduledRefresh = useCallback(() => {
    refreshTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    refreshTimersRef.current = [];
    if (refreshAnimationRef.current !== null) {
      window.cancelAnimationFrame(refreshAnimationRef.current);
      refreshAnimationRef.current = null;
    }
  }, []);

  const scheduleMapRefresh = useCallback(
    (options: { fit?: boolean } = {}) => {
      if (typeof window === "undefined") return;
      clearScheduledRefresh();
      const run = () => fitRoute(getMapTarget(), options);
      refreshAnimationRef.current = window.requestAnimationFrame(() => {
        refreshAnimationRef.current = null;
        run();
      });
      [80, 220, 520].forEach((delay) => {
        refreshTimersRef.current.push(window.setTimeout(run, delay));
      });
    },
    [clearScheduledRefresh, fitRoute, getMapTarget],
  );

  const handleMapLoad = useCallback(
    (mapEvent: { target: MapTarget }) => {
      setMapError("");
      fitRoute(mapEvent.target);
      scheduleMapRefresh();
    },
    [fitRoute, scheduleMapRefresh],
  );

  const handleMapError = useCallback((event: { error?: Error; target?: MapTarget }) => {
    console.warn("GHAR itinerary route map load error:", event.error || event);
    event.target?.resize?.();
    setMapError("Map tiles unavailable");
  }, []);

  const handleMapIdle = useCallback(() => {
    if (didRefreshOnIdleRef.current) return;
    didRefreshOnIdleRef.current = true;
    scheduleMapRefresh({ fit: false });
  }, [scheduleMapRefresh]);

  useEffect(() => {
    if (!deferUntilVisible) {
      setShouldMountMap(true);
      return undefined;
    }
    const element = containerRef.current;
    if (!element) {
      setShouldMountMap(true);
      return undefined;
    }
    if (typeof IntersectionObserver === "undefined") {
      setShouldMountMap(true);
      return undefined;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldMountMap(true);
          observer.disconnect();
        }
      },
      { rootMargin: "280px 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [deferUntilVisible]);

  useEffect(() => {
    if (!shouldMountMap) return clearScheduledRefresh;
    didRefreshOnIdleRef.current = false;
    scheduleMapRefresh();
    return clearScheduledRefresh;
  }, [clearScheduledRefresh, routeGeoJson, scheduleMapRefresh, shouldMountMap]);

  useEffect(() => {
    if (typeof ResizeObserver === "undefined" || !containerRef.current) return;
    const observer = new ResizeObserver(() => scheduleMapRefresh());
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [scheduleMapRefresh]);

  const handleZoomIn = useCallback(() => {
    userAdjustedMapRef.current = true;
    getMapTarget()?.zoomIn?.({ duration: 180 });
    scheduleMapRefresh({ fit: false });
  }, [getMapTarget, scheduleMapRefresh]);

  const handleZoomOut = useCallback(() => {
    userAdjustedMapRef.current = true;
    getMapTarget()?.zoomOut?.({ duration: 180 });
    scheduleMapRefresh({ fit: false });
  }, [getMapTarget, scheduleMapRefresh]);

  return (
    <div ref={containerRef} className="relative h-[230px] overflow-hidden bg-[#F8FAFC]">
      {shouldMountMap ? (
        <MapGL
          ref={mapRef as never}
          initialViewState={initialViewState}
          mapStyle={mapStyle}
          style={{ width: "100%", height: "100%" }}
          reuseMaps
          attributionControl={false}
          dragPan={false}
          scrollZoom={false}
          touchZoomRotate={false}
          doubleClickZoom={false}
          keyboard={false}
          onLoad={handleMapLoad}
          onError={handleMapError}
          onIdle={handleMapIdle}
        >
          {stops.length > 1 ? (
            <Source id={sourceId} type="geojson" data={routeGeoJson as never}>
              <Layer
                id={layerId}
                type="line"
                layout={{ "line-cap": "round", "line-join": "round" }}
                paint={{
                  "line-color": "#0F766E",
                  "line-width": 4,
                  "line-opacity": 0.76,
                }}
              />
            </Source>
          ) : null}
          {stops.map((stop) => (
            <Marker
              key={stop.id}
              longitude={stop.lng}
              latitude={stop.lat}
              anchor="bottom"
            >
              <div
                aria-label={`${isSetuChina ? "站点" : "Stop"} ${stop.stopNumber}: ${stop.title}`}
                className="grid h-9 w-9 place-items-center rounded-full border-4 border-white bg-[#111827] text-sm font-black text-white shadow-[0_10px_20px_rgba(15,23,42,0.25)]"
              >
                {stop.stopNumber}
              </div>
            </Marker>
          ))}
        </MapGL>
      ) : (
        <div
          data-testid="itinerary-map-deferred-placeholder"
          className="grid h-full place-items-center bg-[#F8FAFC] text-center"
        >
          <div>
            <div className="mx-auto h-8 w-8 rounded-full border-4 border-[#CCFBF1] border-t-[#0F766E]" />
            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#64748B]">
              {isSetuChina ? "地图加载中" : "Loading map"}
            </p>
          </div>
        </div>
      )}
      {mapError ? (
        <div className="absolute left-3 top-3 z-10 max-w-[calc(100%-5.5rem)] rounded-full bg-white/95 px-3 py-1 text-[11px] font-semibold text-[#92400E] shadow-sm">
          {isSetuChina ? "地图暂时无法加载" : mapError}
        </div>
      ) : null}
      <div className="absolute right-3 top-3 z-10 overflow-hidden rounded-xl border border-[#D7DEE8] bg-white/95 shadow-sm">
        <button
          type="button"
          aria-label={isSetuChina ? "放大地图" : "Zoom in"}
          data-testid="itinerary-map-zoom-in"
          onClick={handleZoomIn}
          className="grid h-10 w-10 place-items-center text-[#111827] transition hover:bg-[#F8FAFC] active:bg-[#E2E8F0]"
        >
          <Plus className="h-5 w-5" strokeWidth={2.4} />
        </button>
        <div className="h-px bg-[#D7DEE8]" />
        <button
          type="button"
          aria-label={isSetuChina ? "缩小地图" : "Zoom out"}
          data-testid="itinerary-map-zoom-out"
          onClick={handleZoomOut}
          className="grid h-10 w-10 place-items-center text-[#111827] transition hover:bg-[#F8FAFC] active:bg-[#E2E8F0]"
        >
          <Minus className="h-5 w-5" strokeWidth={2.4} />
        </button>
      </div>
    </div>
  );
}
