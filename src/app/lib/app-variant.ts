export type AppVariant = 'ghar' | 'burb_mate' | 'setu_china' | 'jom_settle' | 'wheres_wolli';
export type TargetableAppVariant = AppVariant | 'all';

export const APP_VARIANTS: AppVariant[] = ['ghar', 'burb_mate', 'setu_china', 'jom_settle', 'wheres_wolli'];

function normalizeVariant(value: string | undefined): AppVariant {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'burb_mate' || normalized === 'burb-mate' || normalized === 'burbmate') return 'burb_mate';
  if (normalized === 'setu_china' || normalized === 'setu-china' || normalized === 'setuchina' || normalized === 'china') {
    return 'setu_china';
  }
  if (normalized === 'jom_settle' || normalized === 'jom-settle' || normalized === 'jomsettle' || normalized === 'malaysia') {
    return 'jom_settle';
  }
  if (
    normalized === 'wheres_wolli'
    || normalized === 'wheres-wolli'
    || normalized === 'where-s-wolli'
    || normalized === 'where_wolli'
    || normalized === 'whereswolli'
    || normalized === 'wolli'
  ) {
    return 'wheres_wolli';
  }
  return 'ghar';
}

export const APP_VARIANT = normalizeVariant(import.meta.env.VITE_APP_VARIANT);

export function isBurbMateVariant() {
  return APP_VARIANT === 'burb_mate';
}

export function isSetuChinaVariant() {
  return APP_VARIANT === 'setu_china';
}

export function isJomSettleVariant() {
  return APP_VARIANT === 'jom_settle';
}

export function isWheresWolliVariant() {
  return APP_VARIANT === 'wheres_wolli';
}

export function normalizeTargetableVariant(value: unknown, fallback: TargetableAppVariant = 'all'): TargetableAppVariant {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'all') return 'all';
  if (normalized === 'burb_mate' || normalized === 'burb-mate' || normalized === 'burbmate') {
    return 'burb_mate';
  }
  if (normalized === 'setu_china' || normalized === 'setu-china' || normalized === 'setuchina' || normalized === 'china') {
    return 'setu_china';
  }
  if (normalized === 'jom_settle' || normalized === 'jom-settle' || normalized === 'jomsettle' || normalized === 'malaysia') {
    return 'jom_settle';
  }
  if (
    normalized === 'wheres_wolli'
    || normalized === 'wheres-wolli'
    || normalized === 'where-s-wolli'
    || normalized === 'where_wolli'
    || normalized === 'whereswolli'
    || normalized === 'wolli'
  ) {
    return 'wheres_wolli';
  }
  if (normalized === 'ghar') return 'ghar';
  return fallback;
}

export function getAppVariantLabel(variant: TargetableAppVariant) {
  switch (variant) {
    case 'burb_mate':
      return "Hoodie";
    case 'setu_china':
      return '留澳助手 AU';
    case 'jom_settle':
      return 'Senang AU';
    case 'wheres_wolli':
      return "Where's Wolli";
    case 'all':
      return 'All Apps';
    default:
      return 'SETU India AU';
  }
}

export function getOtherAppVariant(variant: AppVariant): AppVariant {
  return variant === 'ghar' ? 'burb_mate' : 'ghar';
}

export function getSiblingAppVariants(variant: AppVariant): AppVariant[] {
  return APP_VARIANTS.filter((candidate) => candidate !== variant);
}
