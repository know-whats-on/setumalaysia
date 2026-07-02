import { useState, useCallback, useEffect, useMemo } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router';
import { DashboardMap } from '../components/dashboard-map';
import { ReportModal } from '../components/report-modal';
import { useGharData } from '../components/layout';
import type { DashboardInitialMapSearch } from '../lib/focused-map-targets';
import { APP_VARIANT } from '../lib/app-variant';
import { SetuChinaHomePage } from './setu-china-pages';
import { SetuIndiaHomePage } from './setu-india-pages';
import { JomSettleHomePage } from './jom-settle-pages';
import { WolliHomePage } from './wolli-pages';

export function DashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { listings, refreshData } = useGharData();
  const [showReport, setShowReport] = useState(false);
  const locationState = location.state as {
    hoodienieMapSearch?: DashboardInitialMapSearch | null;
    hoodienieOpenTransportMenuToken?: number | null;
  } | null;
  const initialMapSearch = useMemo(
    () => locationState?.hoodienieMapSearch || null,
    [locationState],
  );
  const initialTransportMenuOpenToken = locationState?.hoodienieOpenTransportMenuToken || null;

  // Auto-open report modal if navigated with ?action=report
  useEffect(() => {
    if (searchParams.get('action') === 'report') {
      setShowReport(true);
      // Clean up URL params
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleDeleteListing = useCallback(async (_listingId: string) => {
    await refreshData();
  }, [refreshData]);

  const handleInitialMapSearchConsumed = useCallback(() => {
    if (!locationState?.hoodienieMapSearch) return;
    navigate(`${location.pathname}${location.search}`, {
      replace: true,
      state: {
        ...locationState,
        hoodienieMapSearch: undefined,
      },
    });
  }, [location.pathname, location.search, locationState, navigate]);

  const handleInitialTransportMenuOpenConsumed = useCallback(() => {
    if (!locationState?.hoodienieOpenTransportMenuToken) return;
    navigate(`${location.pathname}${location.search}`, {
      replace: true,
      state: {
        ...locationState,
        hoodienieOpenTransportMenuToken: undefined,
      },
    });
  }, [location.pathname, location.search, locationState, navigate]);

  if (APP_VARIANT === 'setu_china' && searchParams.get('view') !== 'map') {
    return <SetuChinaHomePage />;
  }

  if (APP_VARIANT === 'ghar' && searchParams.get('view') !== 'map') {
    return <SetuIndiaHomePage />;
  }

  if (APP_VARIANT === 'jom_settle' && searchParams.get('view') !== 'map') {
    return <JomSettleHomePage />;
  }

  if (APP_VARIANT === 'wheres_wolli' && searchParams.get('view') !== 'map') {
    return <WolliHomePage />;
  }

  return (
    <>
      <DashboardMap
        listings={listings}
        initialSearch={initialMapSearch}
        onInitialSearchConsumed={handleInitialMapSearchConsumed}
        initialTransportMenuOpenToken={initialTransportMenuOpenToken}
        onInitialTransportMenuOpenConsumed={handleInitialTransportMenuOpenConsumed}
        onNewReport={() => setShowReport(true)}
        onSelectListing={(listing) => navigate(`/legal/${listing.id}`)}
        onDeleteListing={handleDeleteListing}
      />
      <ReportModal
        open={showReport}
        onClose={() => setShowReport(false)}
        onCreated={() => refreshData()}
        listings={listings}
      />
    </>
  );
}
