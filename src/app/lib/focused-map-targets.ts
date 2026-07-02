export type DashboardInitialMapSearchSource = 'guide-place' | 'event-place' | 'search' | 'nearby-toilets';

export type DashboardInitialMapAction = 'find-nearby-toilet';

export type DashboardGuideReturnTarget = {
  citySlug: string;
  guideSlug: string;
  guidesView?: 'carousel' | 'list';
};

export type DashboardEventReturnTarget = {
  route: string;
};

export type DashboardGuidePlaceTarget = {
  kind: 'guide-place';
  label: string;
  city?: string;
  state?: string;
  description?: string;
  imageUrl?: string;
  navigationLink?: string;
  returnGuide?: DashboardGuideReturnTarget;
  lat: number;
  lng: number;
};

export type DashboardEventPlaceTarget = {
  kind: 'event-place';
  label: string;
  sourceLabel?: string;
  dateLine?: string;
  locationLine?: string;
  summary?: string;
  imageUrl?: string;
  address?: string;
  suburb?: string;
  state?: string;
  returnEvent?: DashboardEventReturnTarget;
  lat: number;
  lng: number;
};

export type DashboardFocusedMapTarget =
  | DashboardGuidePlaceTarget
  | DashboardEventPlaceTarget;

export type DashboardInitialMapSearch = {
  query: string;
  displayName?: string;
  suburb?: string;
  state?: string;
  lat?: number;
  lng?: number;
  source?: DashboardInitialMapSearchSource;
  initialAction?: DashboardInitialMapAction;
  returnGuide?: DashboardGuideReturnTarget;
  returnEvent?: DashboardEventReturnTarget;
  placeTarget?: DashboardGuidePlaceTarget;
  eventTarget?: DashboardEventPlaceTarget;
};

export type DashboardMapNavigationState = {
  hoodienieMapSearch: DashboardInitialMapSearch;
};

export function buildNearbyToiletsMapState(): DashboardMapNavigationState {
  return {
    hoodienieMapSearch: {
      query: 'Nearby public toilets',
      displayName: 'Nearby public toilets',
      source: 'nearby-toilets',
      initialAction: 'find-nearby-toilet',
    },
  };
}

export type FocusedTargetDirectionsApp = 'apple' | 'google' | 'waze' | 'android-system';

export type MapDirectionsTarget = {
  label?: string;
  lat: number;
  lng: number;
};

function encodeLabel(value: string) {
  return encodeURIComponent(String(value || '').trim());
}

export function hasValidFocusedMapCoordinatePair(lat: unknown, lng: unknown) {
  const latitude = Number(lat);
  const longitude = Number(lng);
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180 &&
    !(latitude === 0 && longitude === 0)
  );
}

export function buildMapDirectionsUrl(
  target: MapDirectionsTarget,
  app: FocusedTargetDirectionsApp,
) {
  const lat = Number(target.lat);
  const lng = Number(target.lng);
  const label = encodeLabel(target.label || 'Destination');

  if (app === 'android-system') {
    return `geo:${lat},${lng}?q=${lat},${lng}(${label})`;
  }

  if (app === 'apple') {
    return `https://maps.apple.com/?daddr=${lat},${lng}&q=${label}`;
  }

  if (app === 'waze') {
    return `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
  }

  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
}

export function buildGuideReturnRoute(target?: DashboardGuideReturnTarget | null) {
  if (!target?.citySlug || !target?.guideSlug) return null;
  const params = new URLSearchParams({
    section: 'vibe',
    vibe_tab: 'my-hood',
    city: target.citySlug,
    guide: target.guideSlug,
  });
  if (target.guidesView) {
    params.set('guides_view', target.guidesView);
  }
  return `/vibe?${params.toString()}`;
}

export function buildEventReturnRoute(target?: DashboardEventReturnTarget | null) {
  const route = String(target?.route || '').trim();
  return route || null;
}

export function buildFocusedMapTargetReturnRoute(
  target?: DashboardFocusedMapTarget | null,
) {
  if (!target) return null;
  if (target.kind === 'guide-place') {
    return buildGuideReturnRoute(target.returnGuide);
  }
  return buildEventReturnRoute(target.returnEvent);
}

export function getFocusedMapTargetReturnLabel(
  target?: DashboardFocusedMapTarget | null,
) {
  if (!target) return '';
  return target.kind === 'guide-place' ? 'Back to Guide' : 'Back to Event';
}

export function getFocusedMapTargetBadge(
  target?: DashboardFocusedMapTarget | null,
) {
  if (!target) return '';
  if (target.kind === 'guide-place') return 'Guide Place';
  return String(target.sourceLabel || 'Official Event').trim() || 'Official Event';
}

export function getFocusedMapTargetLocationText(
  target?: DashboardFocusedMapTarget | null,
) {
  if (!target) return '';
  if (target.kind === 'guide-place') {
    return [target.city, target.state].filter(Boolean).join(', ');
  }
  return String(target.locationLine || '').trim();
}

export function getFocusedMapTargetBodyText(
  target?: DashboardFocusedMapTarget | null,
) {
  if (!target) return '';
  if (target.kind === 'guide-place') {
    return String(target.description || '').trim();
  }
  return String(target.summary || '').trim();
}

export function getFocusedMapTargetContextSuburb(
  target?: DashboardFocusedMapTarget | null,
) {
  if (!target) return '';
  if (target.kind === 'guide-place') return String(target.city || '').trim();
  return String(target.suburb || '').trim();
}

export function getFocusedMapTargetContextState(
  target?: DashboardFocusedMapTarget | null,
) {
  if (!target) return '';
  return String(target.state || '').trim();
}

export function buildFocusedMapTargetDirectionsUrl(
  target: DashboardFocusedMapTarget,
  app: FocusedTargetDirectionsApp,
) {
  if (app === 'google' && target.kind === 'guide-place' && target.navigationLink?.trim()) {
    return target.navigationLink.trim();
  }

  return buildMapDirectionsUrl(target, app);
}
