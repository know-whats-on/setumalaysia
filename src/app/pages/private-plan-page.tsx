import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router';
import { ArrowLeft, Clock3, ExternalLink, MapPin, MessageCircle, Route, Share2, Users } from 'lucide-react';
import {
  createPublicPlanComment,
  fetchItineraryWalkingRoute,
  fetchPublicPlan,
  fetchPublicPlanComments,
  joinPublicPlan,
  leavePublicPlan,
  rejectPublicPlan,
  type PublicPlan,
  type PublicPlanComment,
  type ItineraryPlanStop,
  type ItineraryWalkingRoute,
} from '../lib/api';
import { APP_CONFIG } from '../lib/app-config';
import { clearNativeOpenRoute, consumeNativeOpenRouteIfCurrent, isExternalRouteSource } from '../lib/native-open-route';
import { getPublicPlanPersonInitials } from '../lib/public-plan-ui';
import { buildPublicPlanShareDescriptor, buildStandalonePublicPlanShareDescriptor } from '../lib/hoodie-share';
import { shareHoodieDescriptorGeneric } from '../lib/instagram-story-share';
import { ItineraryRouteMap, ITINERARY_MAP_STYLE_URL } from '../components/itinerary-route-map';
import { formatItinerarySpotSummary, shouldShowItineraryPlanNote } from '../lib/itinerary-plan-display';

function formatDateTime(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

const SYDNEY_CENTER = { lat: -33.8688, lng: 151.2093 };

function buildStopMapUrl(stop: { maps_url?: string; lat?: number | null; lng?: number | null; venue_name?: string; address?: string; suburb?: string }) {
  if (stop.maps_url) return stop.maps_url;
  const lat = Number(stop.lat);
  const lng = Number(stop.lng);
  const query = Number.isFinite(lat) && Number.isFinite(lng)
    ? `${lat},${lng}`
    : [stop.venue_name, stop.address, stop.suburb].filter(Boolean).join(', ');
  return query ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}` : '';
}

function hasStopCoordinates(stop: ItineraryPlanStop) {
  const lat = Number(stop.lat);
  const lng = Number(stop.lng);
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 && !(lat === 0 && lng === 0);
}

function getPlanMapStops(stops: ItineraryPlanStop[]) {
  return stops.flatMap((stop, index) =>
    hasStopCoordinates(stop)
      ? [{ stop, stopNumber: index + 1, lat: Number(stop.lat), lng: Number(stop.lng) }]
      : [],
  );
}

function getPlanMapView(stops: ReturnType<typeof getPlanMapStops>) {
  if (stops.length === 0) return { longitude: SYDNEY_CENTER.lng, latitude: SYDNEY_CENTER.lat, zoom: 10 };
  const minLat = Math.min(...stops.map((stop) => stop.lat));
  const maxLat = Math.max(...stops.map((stop) => stop.lat));
  const minLng = Math.min(...stops.map((stop) => stop.lng));
  const maxLng = Math.max(...stops.map((stop) => stop.lng));
  const span = Math.max(maxLat - minLat, maxLng - minLng);
  return {
    longitude: (minLng + maxLng) / 2,
    latitude: (minLat + maxLat) / 2,
    zoom: stops.length === 1 ? 13 : span < 0.02 ? 13 : span < 0.08 ? 11.5 : 10,
  };
}

function buildPlanRouteGeoJson(route: ItineraryWalkingRoute | null, stops: ReturnType<typeof getPlanMapStops>) {
  if (route?.geometry?.type === 'FeatureCollection') return route.geometry;
  return {
    type: 'FeatureCollection',
    features: stops.length > 1
      ? [{
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: stops.map((stop) => [stop.lng, stop.lat]),
          },
        }]
      : [],
  };
}

function formatPlanRouteMetric(route: ItineraryWalkingRoute | null, plan: PublicPlan, isSetuChina: boolean) {
  const distance = Number(route?.distance_m ?? plan.itinerary_route_distance_m);
  const duration = Number(route?.duration_s ?? plan.itinerary_route_duration_s);
  const parts: string[] = [];
  if (Number.isFinite(distance) && distance > 0) {
    parts.push(distance >= 1000 ? `${(distance / 1000).toFixed(1)} km` : `${Math.round(distance)} m`);
  }
  if (Number.isFinite(duration) && duration > 0) {
    const minutes = Math.max(1, Math.round(duration / 60));
    parts.push(isSetuChina ? `约 ${minutes} 分钟步行` : `${minutes} min walk`);
  }
  return parts.join(' · ');
}

function ItineraryPlanRouteSection({
  plan,
  email,
  isSetuChina,
}: {
  plan: PublicPlan;
  email: string;
  isSetuChina: boolean;
}) {
  const stops = plan.itinerary_stops || [];
  const mapStops = useMemo(() => getPlanMapStops(stops), [stops]);
  const routeStops = useMemo(
    () => mapStops.map((stop) => ({ event_key: stop.stop.event_key, lat: stop.lat, lng: stop.lng })),
    [mapStops],
  );
  const [route, setRoute] = useState<ItineraryWalkingRoute | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const routeGeoJson = useMemo(() => buildPlanRouteGeoJson(route, mapStops), [mapStops, route]);
  const initialViewState = useMemo(() => getPlanMapView(mapStops), [mapStops]);
  const routeMetric = formatPlanRouteMetric(route, plan, isSetuChina);
  const routeEmail = plan.itinerary_owner_email || email;

  useEffect(() => {
    let cancelled = false;
    if (!routeEmail || !plan.itinerary_day || routeStops.length < 2) {
      setRoute(null);
      return;
    }
    setRouteLoading(true);
    fetchItineraryWalkingRoute({
      email: routeEmail,
      eventDay: plan.itinerary_day,
      stops: routeStops,
      appVariant: APP_CONFIG.variant,
    })
      .then((nextRoute) => {
        if (!cancelled) setRoute(nextRoute);
      })
      .catch((error) => {
        console.error('GHAR private plan itinerary route error:', error);
        if (!cancelled) setRoute(null);
      })
      .finally(() => {
        if (!cancelled) setRouteLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [plan.itinerary_day, routeEmail, routeStops]);

  if (stops.length === 0) return null;

  return (
    <section className="mt-5 overflow-hidden rounded-[26px] border border-[#DDE7F0] bg-[#F8FAFC] shadow-sm">
      <div className="border-b border-[#E2E8F0] bg-white px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#ECFDF5] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0F766E]">
              <Route className="h-3.5 w-3.5" strokeWidth={1.8} />
              {isSetuChina ? '路线行程' : 'Trip Route'}
            </div>
            <h2 className="mt-2 text-base font-bold text-[#0F172A]">
              {isSetuChina ? '行程站点' : 'Itinerary Stops'}
            </h2>
            <p className="mt-1 text-xs font-medium text-[#64748B]">
              {routeMetric || `${stops.length} stop${stops.length === 1 ? '' : 's'} in route order`}
            </p>
          </div>
          <span className="rounded-2xl bg-[#0F172A] px-3 py-2 text-center text-white">
            <span className="block text-lg font-black leading-none">{stops.length}</span>
            <span className="mt-1 block text-[10px] font-semibold uppercase tracking-wide text-white/70">
              {isSetuChina ? '站' : 'Stops'}
            </span>
          </span>
        </div>
        {plan.itinerary_sync_status === 'snapshot_stale' ? (
          <p className="mt-3 rounded-xl bg-[#FEF3C7] px-3 py-2 text-xs font-semibold text-[#92400E]">
            {isSetuChina ? '源行程目前为空，显示最近保存的计划路线。' : 'Source itinerary is currently empty; showing the last saved route.'}
          </p>
        ) : null}
      </div>
      <div className="border-b border-[#E2E8F0] bg-[#F8FAFC] p-3">
        <div className="overflow-hidden rounded-[24px] border border-[#DDE7F0] bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-[#E2E8F0] px-4 py-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0F766E]">
                {isSetuChina ? '路线地图' : 'Route map'}
              </p>
              <p className="text-xs font-medium text-[#64748B]">
                {routeMetric || (isSetuChina ? '按计划顺序显示地图站点。' : 'Numbered by plan order.')}
              </p>
            </div>
            <span className="rounded-full bg-[#ECFDF5] px-3 py-1 text-xs font-bold text-[#0F766E]">
              {routeLoading ? (isSetuChina ? '路线中' : 'Routing') : mapStops.length ? `${mapStops.length} mapped` : (isSetuChina ? '无坐标' : 'No coordinates')}
            </span>
          </div>
          <ItineraryRouteMap
            stops={mapStops.map((stop) => ({
              id: stop.stop.event_key,
              stopNumber: stop.stopNumber,
              title: stop.stop.title,
              lat: stop.lat,
              lng: stop.lng,
            }))}
            routeGeoJson={routeGeoJson}
            initialViewState={initialViewState}
            mapStyle={ITINERARY_MAP_STYLE_URL}
            isSetuChina={isSetuChina}
            sourceId="plan-itinerary-route-line"
            layerId="plan-itinerary-route-line-layer"
            deferUntilVisible
          />
        </div>
      </div>
      <div className="relative px-4 py-4">
        <div className="absolute bottom-5 left-[2.15rem] top-5 w-px bg-[#CBD5E1]" aria-hidden="true" />
        <div className="space-y-4">
          {stops.map((stop, index) => {
            const mapUrl = buildStopMapUrl(stop);
            const location = [stop.venue_name, stop.address || stop.suburb].filter(Boolean).join(' · ');
            return (
              <article key={stop.event_key} className="relative pl-12">
                <span className="absolute left-0 top-3 z-10 grid h-11 w-11 place-items-center rounded-full border-4 border-[#F8FAFC] bg-[#111827] text-sm font-black text-white shadow-sm">
                  #{index + 1}
                </span>
                <div className="rounded-[22px] border border-[#E2E8F0] bg-white p-3 shadow-sm">
                  <div className="flex gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0F766E]">
                        {stop.upcoming_time || stop.dates_humanized}
                      </p>
                      <p className="mt-1 break-words text-base font-bold leading-5 text-[#0F172A] [overflow-wrap:anywhere]">{stop.title}</p>
                      {location ? <p className="mt-2 text-sm leading-5 text-[#64748B]">{location}</p> : null}
                    </div>
                    {stop.hero_image_url || stop.image_url ? (
                      <img src={stop.hero_image_url || stop.image_url} alt={stop.title} className="h-20 w-20 shrink-0 rounded-[18px] object-cover" loading="lazy" />
                    ) : null}
                  </div>
                  {stop.summary ? <p className="mt-3 line-clamp-2 text-sm leading-6 text-[#475569]">{stop.summary}</p> : null}
                  {mapUrl ? (
                    <a
                      href={mapUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex min-h-10 items-center justify-center gap-1 rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-[#166534]"
                    >
                      <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.7} />
                      {isSetuChina ? '导航' : 'Directions'}
                    </a>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function PrivatePlanPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const [searchParams] = useSearchParams();
  const isSetuChina = APP_CONFIG.variant === 'setu_china';
  const usesDashboardHome = isSetuChina || APP_CONFIG.variant === 'jom_settle';
  const planId = params.planId || '';
  const inviteToken = searchParams.get('invite_token') || '';
  const email = (localStorage.getItem('ghar_email') || '').trim().toLowerCase();
  const [plan, setPlan] = useState<PublicPlan | null>(null);
  const [comments, setComments] = useState<PublicPlanComment[]>([]);
  const [commentDraft, setCommentDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareStatus, setShareStatus] = useState('');
  const canUsePlan = Boolean(email);

  const handleBack = () => {
    const currentRoute = `${location.pathname}${location.search}${location.hash}`;
    if (isExternalRouteSource(searchParams.get('source')) || consumeNativeOpenRouteIfCurrent(currentRoute)) {
      clearNativeOpenRoute();
      navigate('/dashboard', { replace: true });
      return;
    }
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/dashboard');
    }
  };

  const loadPlan = useCallback(async () => {
    if (!planId) return;
    setLoading(true);
    setError(null);
    try {
      const nextPlan = await fetchPublicPlan({
        id: planId,
        viewerEmail: email,
        inviteToken,
      });
      setPlan(nextPlan);
      if (nextPlan.viewer_joined || nextPlan.is_creator) {
        setComments(await fetchPublicPlanComments(planId, email, inviteToken));
      } else {
        setComments([]);
      }
    } catch (loadError) {
      console.error('GHAR PrivatePlanPage load error:', loadError);
      setError(loadError instanceof Error ? loadError.message : 'Failed to load plan');
    } finally {
      setLoading(false);
    }
  }, [email, inviteToken, planId]);

  useEffect(() => {
    void loadPlan();
  }, [loadPlan]);

  const sourceEventLabel = useMemo(() => {
    if (!plan) return '';
    if (plan.source_type === 'custom') return 'Private plan';
    return plan.source_event?.title || 'Event plan';
  }, [plan]);
  const isPendingInvite = Boolean(plan?.viewer_invited && !plan.viewer_joined && !plan.is_creator);

  const handleJoinLeave = async () => {
    if (!plan || !email) return;
    setSubmitting(true);
    setError(null);
    try {
      if (plan.viewer_joined && plan.can_leave) {
        await leavePublicPlan(plan.id, email);
      } else {
        await joinPublicPlan(plan.id, email, inviteToken);
      }
      await loadPlan();
    } catch (actionError) {
      console.error('GHAR PrivatePlanPage join error:', actionError);
      setError(actionError instanceof Error ? actionError.message : 'Failed to update attendance');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!plan || !email || !plan.can_reject) return;
    setSubmitting(true);
    setError(null);
    try {
      await rejectPublicPlan(plan.id, email);
      clearNativeOpenRoute();
      navigate('/dashboard', { replace: true });
    } catch (actionError) {
      console.error('GHAR PrivatePlanPage reject error:', actionError);
      setError(actionError instanceof Error ? actionError.message : 'Failed to reject plan');
    } finally {
      setSubmitting(false);
    }
  };

  const handleComment = async () => {
    if (!plan || !email) return;
    const body = commentDraft.trim();
    if (!body) return;
    setSubmitting(true);
    setError(null);
    try {
      await createPublicPlanComment(plan.id, { email, body });
      setCommentDraft('');
      setComments(await fetchPublicPlanComments(plan.id, email, inviteToken));
    } catch (commentError) {
      console.error('GHAR PrivatePlanPage comment error:', commentError);
      setError(commentError instanceof Error ? commentError.message : 'Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSharePlan = async () => {
    if (!plan) return;
    setShareStatus('');
    try {
      const descriptor =
        plan.source_type === 'custom' || plan.source_type === 'itinerary' || plan.event_source === 'custom'
          ? buildStandalonePublicPlanShareDescriptor(plan)
          : buildPublicPlanShareDescriptor(plan);
      const result = await shareHoodieDescriptorGeneric(descriptor);
      if (result.status !== 'cancelled') setShareStatus(result.message);
    } catch (shareError) {
      console.error('GHAR PrivatePlanPage share error:', shareError);
      setShareStatus('Could not share this plan right now.');
    }
  };
  const itinerarySpotSummary = plan?.source_type === 'itinerary'
    ? formatItinerarySpotSummary(plan.itinerary_stops?.length || 0, isSetuChina)
    : '';
  const visiblePlanNote = plan
    ? plan.source_type === 'itinerary'
      ? shouldShowItineraryPlanNote(plan.note) ? plan.note : ''
      : plan.note
    : '';

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white">
      <div className={`${usesDashboardHome ? 'w-full max-w-none' : 'mx-auto w-full max-w-3xl'} shrink-0 px-4 pb-3 pt-4 md:px-6`}>
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[#475569] transition hover:bg-[#F8FAFC]"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.7} />
          Back
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <main className={`${usesDashboardHome ? 'w-full max-w-none' : 'mx-auto w-full max-w-3xl'} px-4 pb-[calc(var(--native-safe-area-bottom)+6rem)] md:px-6 md:pb-14`}>
          {loading ? (
            <div className="rounded-lg border border-[#E2E8F0] bg-white p-6 text-sm text-[#64748B]">
              Loading plan...
            </div>
          ) : error && !plan ? (
            <div className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] p-4 text-sm text-[#991B1B]">
              {error}
            </div>
          ) : plan ? (
            <article className="rounded-lg border border-[#E2E8F0] bg-white p-5 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0F766E]">
                {sourceEventLabel}
              </p>
              <h1 className="mt-2 text-2xl font-bold text-[#0F172A]">{plan.title}</h1>
              <p className="mt-1 text-sm text-[#64748B]">
                Created by {plan.creator_name || APP_CONFIG.displayName}
              </p>
              <button
                type="button"
                onClick={() => void handleSharePlan()}
                className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg border border-[#CBD5E1] px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-[#475569] transition hover:bg-[#F8FAFC]"
              >
                <Share2 className="h-3.5 w-3.5" strokeWidth={1.7} />
                Share Plan
              </button>
              {shareStatus ? (
                <div className="mt-4 rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] p-3 text-sm text-[#1D4ED8]">
                  {shareStatus}
                </div>
              ) : null}

              <div className="mt-5 grid gap-3 text-sm text-[#475569]">
                <div className="flex items-start gap-2">
                  <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-[#0F766E]" strokeWidth={1.7} />
                  <span>{formatDateTime(plan.meetup_at)}</span>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#0F766E]" strokeWidth={1.7} />
                  <span>{plan.meeting_point}</span>
                </div>
                {itinerarySpotSummary ? (
                  <p className="text-sm font-semibold leading-6 text-[#334155]">{itinerarySpotSummary}</p>
                ) : null}
                {visiblePlanNote ? <p className="text-sm leading-6 text-[#334155]">{visiblePlanNote}</p> : null}
              </div>

              <div className="mt-5 rounded-lg bg-[#F8FAFC] p-3">
                <div className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-[#0F172A]">
                  <Users className="h-4 w-4 text-[#0F766E]" strokeWidth={1.7} />
                  {plan.attendee_count} attending{plan.attendee_cap != null ? ` / ${plan.attendee_cap}` : ''}
                </div>
                <div className="flex flex-wrap gap-2">
                  {plan.attendees.map((attendee) => (
                    <span key={attendee.id} className="rounded-md bg-white px-2 py-1 text-[11px] font-medium text-[#334155]">
                      {getPublicPlanPersonInitials(attendee.display_name)}
                    </span>
                  ))}
                </div>
              </div>

              {plan.source_type === 'itinerary' && plan.itinerary_stops?.length ? (
                <ItineraryPlanRouteSection plan={plan} email={email} isSetuChina={isSetuChina} />
              ) : null}

              {!canUsePlan ? (
                <div className="mt-5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-4 text-sm text-[#475569]">
                  Sign in with your {APP_CONFIG.displayName} profile to join this plan.
                </div>
              ) : isPendingInvite ? (
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={handleJoinLeave}
                    disabled={submitting || !plan.can_join}
                    className="w-full rounded-lg bg-[#0F766E] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#115E59] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitting ? 'Saving...' : 'Accept plan'}
                  </button>
                  <button
                    type="button"
                    onClick={handleReject}
                    disabled={submitting || !plan.can_reject}
                    className="w-full rounded-lg border border-[#FECACA] px-4 py-3 text-sm font-semibold text-[#B91C1C] transition hover:bg-[#FEF2F2] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitting ? 'Saving...' : 'Reject plan'}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleJoinLeave}
                  disabled={submitting || (!plan.can_join && !plan.can_leave)}
                  className="mt-5 w-full rounded-lg bg-[#0F766E] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#115E59] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {plan.viewer_joined ? 'Leave plan' : plan.can_join ? 'Join plan' : 'Unavailable'}
                </button>
              )}

              {error ? (
                <div className="mt-4 rounded-lg border border-[#FECACA] bg-[#FEF2F2] p-4 text-sm text-[#991B1B]">
                  {error}
                </div>
              ) : null}

              <section className="mt-6 border-t border-[#E2E8F0] pt-5">
                <h2 className="inline-flex items-center gap-2 text-sm font-bold text-[#0F172A]">
                  <MessageCircle className="h-4 w-4" strokeWidth={1.7} />
                  Plan thread
                </h2>
                {isPendingInvite ? (
                  <div className="mt-4 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-4 text-sm text-[#475569]">
                    Accept this invite to join the plan thread.
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    {comments.length === 0 ? (
                      <p className="text-sm text-[#64748B]">No comments yet.</p>
                    ) : (
                      comments.map((comment) => (
                        <div key={comment.id} className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                          <p className="text-sm font-semibold text-[#0F172A]">{comment.author_name}</p>
                          <p className="mt-1 text-sm leading-6 text-[#334155]">{comment.body}</p>
                        </div>
                      ))
                    )}
                    {plan.can_comment ? (
                      <div className="rounded-lg border border-[#CBD5E1] bg-white p-3">
                        <textarea
                          value={commentDraft}
                          onChange={(event) => setCommentDraft(event.target.value)}
                          rows={3}
                          className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-sm text-[#0F172A] outline-none focus:border-[#0F766E]"
                          placeholder="Add a quick update for the plan."
                        />
                        <button
                          type="button"
                          onClick={handleComment}
                          disabled={submitting || !commentDraft.trim()}
                          className="mt-3 rounded-lg bg-[#0F766E] px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-white transition hover:bg-[#115E59] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Post comment
                        </button>
                      </div>
                    ) : null}
                  </div>
                )}
              </section>
            </article>
          ) : null}
        </main>
      </div>
    </div>
  );
}
