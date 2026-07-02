import { Navigate } from 'react-router';
import { APP_CONFIG } from '../lib/app-config';
import { APP_VARIANT } from '../lib/app-variant';
import { SetuPage } from './setu-page';
import { WolliResourcesPage } from './wolli-pages';

export function ResourcePage() {
  if (APP_VARIANT === 'wheres_wolli') {
    return <WolliResourcesPage />;
  }

  if (APP_VARIANT === 'setu_china' || APP_VARIANT === 'ghar') {
    return <Navigate to={APP_CONFIG.resourcesRoute} replace />;
  }

  if (!APP_CONFIG.showSetuFeatures || APP_CONFIG.resourcesRoute !== '/setu') {
    return <Navigate to={APP_CONFIG.resourcesRoute} replace />;
  }

  return <SetuPage />;
}
