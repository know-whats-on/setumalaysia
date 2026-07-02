import { APP_CONFIG } from './app-config';

function cleanSegment(value: string) {
  return encodeURIComponent(String(value || '').trim());
}

export function buildPublicPlanRoute(
  source: string,
  slug: string,
  planId?: string,
  options?: { invite?: boolean },
) {
  const params = new URLSearchParams();
  if (planId) params.set('plan', planId);
  if (options?.invite) params.set('invite', '1');
  const suffix = params.size ? `?${params.toString()}` : '';
  return `/events/${cleanSegment(source)}/${cleanSegment(slug)}${suffix}`;
}

export function buildStandalonePlanRoute(planId: string, options?: {
  inviteToken?: string;
  source?: string;
}) {
  const params = new URLSearchParams();
  if (options?.inviteToken) params.set('invite_token', options.inviteToken);
  if (options?.source) params.set('source', options.source);
  const suffix = params.size ? `?${params.toString()}` : '';
  return `/plans/${cleanSegment(planId)}${suffix}`;
}

export function buildStandalonePlanDeepLink(planId: string, options?: {
  inviteToken?: string;
  source?: string;
}) {
  const route = buildStandalonePlanRoute(planId, options);
  return `${APP_CONFIG.urlScheme}://${route.replace(/^\//, '')}`;
}

export function buildStandalonePlanInvitePath(planId: string, inviteToken: string) {
  const params = new URLSearchParams({ invite_token: inviteToken });
  return `/invite/private-plan/${cleanSegment(planId)}?${params.toString()}`;
}

export function buildPublicPlanDeepLink(
  source: string,
  slug: string,
  planId?: string,
  options?: { invite?: boolean },
) {
  const route = buildPublicPlanRoute(source, slug, planId, options);
  return `${APP_CONFIG.urlScheme}://${route.replace(/^\//, '')}`;
}

export function buildPublicPlanInvitePath(source: string, slug: string, planId: string) {
  return `/invite/plan/${cleanSegment(source)}/${cleanSegment(slug)}/${cleanSegment(planId)}`;
}

export function buildPublicPlanInviteLink(source: string, slug: string, planId: string) {
  return new URL(buildPublicPlanInvitePath(source, slug, planId), APP_CONFIG.inviteBaseUrl).toString();
}

export function getStoreFallbackUrl(userAgent?: string) {
  const ua = String(userAgent || '').toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return APP_CONFIG.iosStoreUrl;
  if (/android/.test(ua)) return APP_CONFIG.androidStoreUrl;
  return APP_CONFIG.marketingUrl || APP_CONFIG.iosStoreUrl || APP_CONFIG.androidStoreUrl;
}
