import { APP_VARIANT, type AppVariant, type TargetableAppVariant, normalizeTargetableVariant } from './app-variant';
import type { InAppPopupCampaignRecord } from './api';

const IN_APP_POPUP_STORAGE_PREFIX = 'ghar_iam_popup_seen_';
const SUPPORTED_IN_APP_POPUP_VARIANTS = new Set<AppVariant>(['ghar', 'burb_mate', 'setu_china']);
const runtimeSeenCampaigns = new Set<string>();

function getDefaultStorage(): Storage | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.localStorage;
}

function safeGetStorageValue(storage: Storage | undefined, key: string) {
  if (!storage) return '';
  try {
    return storage.getItem(key) || '';
  } catch {
    return '';
  }
}

function safeSetStorageValue(storage: Storage | undefined, key: string, value: string) {
  if (!storage) return;
  try {
    storage.setItem(key, value);
  } catch {
    // Storage can be unavailable in private browsing or locked-down WebViews.
  }
}

export function getInAppPopupLocalDayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isSupportedInAppPopupAppVariant(value: unknown) {
  return SUPPORTED_IN_APP_POPUP_VARIANTS.has(normalizeTargetableVariant(value, APP_VARIANT) as AppVariant);
}

export function buildInAppPopupSeenKey(
  campaignId: string,
  frequency: InAppPopupCampaignRecord['frequency'] = 'once',
  now = new Date(),
) {
  const cleanId = String(campaignId || '').trim();
  if (frequency === 'daily') {
    return `${IN_APP_POPUP_STORAGE_PREFIX}${cleanId}_${getInAppPopupLocalDayKey(now)}`;
  }
  return `${IN_APP_POPUP_STORAGE_PREFIX}${cleanId}`;
}

function buildRuntimeSeenKey(campaignId: string) {
  return `runtime:${String(campaignId || '').trim()}`;
}

export function hasSeenInAppPopupCampaign(
  campaign: Pick<InAppPopupCampaignRecord, 'id' | 'frequency'>,
  {
    storage = getDefaultStorage(),
    now = new Date(),
  }: {
    storage?: Storage;
    now?: Date;
  } = {},
) {
  if (!campaign?.id) return true;
  if (campaign.frequency === 'every_open') {
    return runtimeSeenCampaigns.has(buildRuntimeSeenKey(campaign.id));
  }
  return safeGetStorageValue(storage, buildInAppPopupSeenKey(campaign.id, campaign.frequency, now)) === 'true';
}

export function markInAppPopupCampaignSeen(
  campaign: Pick<InAppPopupCampaignRecord, 'id' | 'frequency'>,
  {
    storage = getDefaultStorage(),
    now = new Date(),
  }: {
    storage?: Storage;
    now?: Date;
  } = {},
) {
  if (!campaign?.id) return;
  if (campaign.frequency === 'every_open') {
    runtimeSeenCampaigns.add(buildRuntimeSeenKey(campaign.id));
    return;
  }
  safeSetStorageValue(storage, buildInAppPopupSeenKey(campaign.id, campaign.frequency, now), 'true');
}

export function selectInAppPopupCampaign(
  campaigns: InAppPopupCampaignRecord[],
  {
    appVariant = APP_VARIANT,
    storage = getDefaultStorage(),
    now = new Date(),
  }: {
    appVariant?: TargetableAppVariant;
    storage?: Storage;
    now?: Date;
  } = {},
) {
  if (!isSupportedInAppPopupAppVariant(appVariant)) return null;
  const normalizedAppVariant = normalizeTargetableVariant(appVariant, APP_VARIANT);
  return (
    campaigns.find((campaign) => {
      const campaignVariant = normalizeTargetableVariant(campaign.app_variant, 'all');
      if (campaignVariant !== 'all' && campaignVariant !== normalizedAppVariant) return false;
      if (!campaign.image_url || !campaign.click_url) return false;
      return !hasSeenInAppPopupCampaign(campaign, { storage, now });
    }) || null
  );
}

export function resetInAppPopupRuntimeSessionForTests() {
  runtimeSeenCampaigns.clear();
}
