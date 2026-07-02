import { Navigate } from 'react-router';
import { APP_VARIANT } from '../lib/app-variant';
import { SetuIndiaGamesPage } from './setu-india-games-page';

export function GamesPage() {
  if (APP_VARIANT !== 'ghar' && APP_VARIANT !== 'setu_china' && APP_VARIANT !== 'jom_settle' && APP_VARIANT !== 'wheres_wolli') {
    return <Navigate to="/dashboard" replace />;
  }

  return <SetuIndiaGamesPage />;
}
