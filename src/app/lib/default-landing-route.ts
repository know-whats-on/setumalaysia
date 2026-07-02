import { APP_VARIANT } from './app-variant';

const DASHBOARD_ROUTE = '/dashboard';
const ASSISTANT_ROUTE = '/arrival';

export async function resolveAuthenticatedDefaultLandingRoute(email: string) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail) return DASHBOARD_ROUTE;

  if (APP_VARIANT === 'setu_china' || APP_VARIANT === 'jom_settle' || APP_VARIANT === 'wheres_wolli') return DASHBOARD_ROUTE;

  return ASSISTANT_ROUTE;
}
