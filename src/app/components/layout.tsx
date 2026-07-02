import { useEffect, useState, useCallback, createContext, useContext, useRef } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router';
import { App as CapacitorApp } from '@capacitor/app';
import { NavBar } from './nav-bar';
import { HealthCheckReminder } from './health-check-reminder';
import { HoodienieLaunchOverlay } from './hoodienie-launch-overlay';
import { HoodieHelpTourProvider } from './hoodie-help-tour';
import { fetchListings, fetchBulletins, fetchBanners, fetchEvidence, fetchMyHousehold, syncBlips, type BannerRecord } from '../lib/api';
import { consumeHouseholdMutationHint, syncHouseholdSharedSession } from '../lib/household-native-sync';
import {
  consumePendingPushRoute,
  ensurePushNotificationsRegistered,
  normalizeIncomingRoute,
  setPushTapRouteHandler,
} from '../lib/push-notifications';
import { isNativeShell } from '../lib/platform';
import { clearNativeOpenRoute, rememberNativeOpenRoute } from '../lib/native-open-route';
import { hasAcknowledgedLatestHouseholdRules } from '../lib/household';
import type { Listing, Bulletin, Evidence } from '../lib/mock-data';
import { APP_CONFIG } from '../lib/app-config';
import { APP_VARIANT } from '../lib/app-variant';
import { HoodieLaunchSplash } from './hoodie-launch-splash';
import { SetuChinaGoldBrandPill, SetuChinaWordmarkLogo, setuChinaLoadingBackground, setuIndiaLoadingBackground } from './setu-china-launch-art';
import { HoodienieLaunchContext } from '../lib/hoodienie-launch-context';
import { getLegalNavRoute } from '../lib/resources-routes';
import { InAppPopupCampaignHost } from './in-app-popup-campaign';
import { getSetuIndiaGameBySlug } from '../lib/setu-india-games';

interface GharContextType {
  listings: Listing[];
  bulletins: Bulletin[];
  banners: BannerRecord[];
  evidence: Evidence[];
  loading: boolean;
  dataError: string | null;
  refreshData: () => Promise<void>;
}

const GharContext = createContext<GharContextType>({
  listings: [],
  bulletins: [],
  banners: [],
  evidence: [],
  loading: false,
  dataError: null,
  refreshData: async () => {},
});

let nativeLaunchUrlHandledForRuntime = false;

function isKeyboardEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable;
}

function getKeyboardInset() {
  const viewport = window.visualViewport;
  if (!viewport) return 0;
  return Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
}

function getKeyboardOpenThreshold() {
  return Math.max(56, Math.min(window.innerHeight * 0.1, 96));
}

function findNearestScrollContainer(target: HTMLElement | null) {
  let current = target?.parentElement ?? null;
  while (current) {
    const style = window.getComputedStyle(current);
    const canScrollY = (style.overflowY === 'auto' || style.overflowY === 'scroll')
      && current.scrollHeight > current.clientHeight + 1;
    if (canScrollY) {
      return current;
    }
    current = current.parentElement;
  }

  return document.scrollingElement instanceof HTMLElement ? document.scrollingElement : null;
}

function scrollKeyboardTargetIntoView(target: HTMLElement | null) {
  if (!target || !isKeyboardEditableTarget(target)) return;

  const scroller = findNearestScrollContainer(target);
  if (!scroller) return;

  const viewport = window.visualViewport;
  const viewportBottom = viewport ? viewport.height + viewport.offsetTop : window.innerHeight;
  const safeBottom = Number.parseFloat(
    window.getComputedStyle(document.documentElement).getPropertyValue('--native-safe-area-bottom'),
  ) || 0;
  const keyboardInset = getKeyboardInset();
  const targetRect = target.getBoundingClientRect();
  const scrollerRect = scroller.getBoundingClientRect();
  const visibleTop = scrollerRect.top + 12;
  const visibleBottom = Math.min(scrollerRect.bottom, viewportBottom - Math.max(safeBottom, 12) - 12);
  const bottomBuffer = Math.max(84, keyboardInset * 0.35);

  if (targetRect.bottom > visibleBottom - bottomBuffer) {
    scroller.scrollBy({
      top: targetRect.bottom - (visibleBottom - bottomBuffer),
      behavior: 'auto',
    });
    return;
  }

  if (targetRect.top < visibleTop + 12) {
    scroller.scrollBy({
      top: targetRect.top - (visibleTop + 12),
      behavior: 'auto',
    });
  }
}

export function getUnauthenticatedRedirectRoute(variant = APP_VARIANT) {
  return '/';
}

export function isAuthenticationRoute(pathname: string, variant = APP_VARIANT) {
  if (pathname === '/login') return true;
  return pathname === '/';
}

export function isPublicBrowserAccessibleRoute(pathname: string, search: string, variant = APP_VARIANT) {
  if (pathname.startsWith('/events/')) return true;
  if (pathname.startsWith('/guide/')) return true;
  if (pathname.startsWith('/guides/')) return true;
  if (pathname.startsWith('/share/')) return true;
  if (pathname.startsWith('/suburb/')) return true;

  if (pathname === '/vibe') {
    const searchParams = new URLSearchParams(search);
    const vibeTab = searchParams.get('vibe_tab');
    if (vibeTab === 'my-hood' && searchParams.get('guide')) return true;
    if (vibeTab === 'suburb-score' && searchParams.get('suburb')) return true;
  }

  if (pathname === '/arrival') {
    const shared = new URLSearchParams(search).get('shared');
    return shared === 'address-check' || shared === 'scam-check';
  }

  return false;
}

export function useGharData() {
  return useContext(GharContext);
}

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const isHoodieExperience = APP_CONFIG.experienceMode === 'hoodie';
  const isWolli = APP_VARIANT === 'wheres_wolli';
  const usesHoodieLaunchBranding = isHoodieExperience && APP_VARIANT !== 'ghar' && APP_VARIANT !== 'setu_china' && APP_VARIANT !== 'jom_settle' && !isWolli;
  const usesMalaysiaSplashArt = APP_VARIANT === 'jom_settle' && Boolean(APP_CONFIG.splashArt?.backgroundImage);
  const enableHoodienieLaunch = usesHoodieLaunchBranding;
  const useHoodieResourcesShell = APP_CONFIG.useSharedResourcesShell;
  const legalBelongsToResourcesTab = APP_CONFIG.showSetuFeatures;

  const [listings, setListings] = useState<Listing[]>([]);
  const [bulletins, setBulletins] = useState<Bulletin[]>([]);
  const [banners, setBanners] = useState<BannerRecord[]>([]);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const [sessionEmail, setSessionEmail] = useState('');
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [hoodienieLaunch, setHoodienieLaunch] = useState<{
    token: number;
    from: { left: number; top: number; width: number; height: number };
  } | null>(null);
  const startupHoodienieLaunchShownRef = useRef(false);
  const pendingHouseRulesCheckInFlightRef = useRef(false);
  const pendingHouseRulesPromptedForEmailRef = useRef('');
  const currentRouteRef = useRef('');
  const openPendingHouseRulesIfNeededRef = useRef<((options?: { force?: boolean }) => Promise<void>) | null>(null);

  const withTimeout = useCallback(async <T,>(promise: Promise<T>, label: string, timeoutMs = 12000): Promise<T> => {
    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
    try {
      return await Promise.race([
        promise,
        new Promise<T>((_, reject) => {
          timeoutHandle = setTimeout(() => reject(new Error(`${label} timed out`)), timeoutMs);
        }),
      ]);
    } finally {
      if (timeoutHandle) clearTimeout(timeoutHandle);
    }
  }, []);

  useEffect(() => {
    currentRouteRef.current = `${location.pathname}${location.search}${location.hash}`;
  }, [location.hash, location.pathname, location.search]);

  const navigateToIncomingRoute = useCallback((rawRoute: string) => {
    const route = normalizeIncomingRoute(rawRoute) || rawRoute;
    if (!route) return false;
    currentRouteRef.current = route;
    rememberNativeOpenRoute(route);
    navigate(route, { replace: true });
    return true;
  }, [navigate]);

  const openPendingPushRouteIfPresent = useCallback(() => {
    const pendingRoute = consumePendingPushRoute();
    if (!pendingRoute) return false;
    return navigateToIncomingRoute(pendingRoute);
  }, [navigateToIncomingRoute]);

  // Check onboarding status
  useEffect(() => {
    const onboarded = localStorage.getItem('ghar_onboarded');
    if (!onboarded && !isAuthenticationRoute(location.pathname) && !isPublicBrowserAccessibleRoute(location.pathname, location.search)) {
      sessionStorage.setItem('ghar_post_login_route', `${location.pathname}${location.search}${location.hash}`);
      navigate(getUnauthenticatedRedirectRoute(), { replace: true });
    }
  }, [location.hash, location.pathname, location.search, navigate]);

  useEffect(() => {
    const email = localStorage.getItem('ghar_email') || '';
    setSessionEmail(email);
  }, [location.pathname]);

  useEffect(() => {
    if (!sessionEmail) return;

    void ensurePushNotificationsRegistered(sessionEmail).catch((err) => {
      console.error('GHAR push bootstrap failed:', err);
    });
  }, [sessionEmail]);

  useEffect(() => {
    void syncHouseholdSharedSession(sessionEmail);
  }, [sessionEmail]);

  const shouldPreserveCurrentRouteForHouseRules = useCallback(() => {
    if (isAuthenticationRoute(location.pathname) || isPublicBrowserAccessibleRoute(location.pathname, location.search)) return true;
    if (location.pathname.startsWith('/plans/')) return true;
    if (location.pathname.startsWith('/notifications')) return true;
    if (location.pathname.startsWith('/household/expenses')) return true;

    const searchParams = new URLSearchParams(location.search);
    return Boolean(
      searchParams.get('invite')
      || searchParams.get('bill_id')
      || searchParams.get('payment_id')
      || searchParams.get('chore_id')
      || searchParams.get('notification_id')
      || searchParams.get('household_source')
      || searchParams.get('action')
      || searchParams.get('next'),
    );
  }, [location.pathname, location.search]);

  const openPendingHouseRulesIfNeeded = useCallback(async (options?: { force?: boolean }) => {
    const email = (localStorage.getItem('ghar_email') || '').trim().toLowerCase();
    const profileFullName = [
      localStorage.getItem('ghar_first_name') || '',
      localStorage.getItem('ghar_last_name') || '',
    ].map((part) => part.trim()).filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
    if (!email || pendingHouseRulesCheckInFlightRef.current) return;
    if (!options?.force && pendingHouseRulesPromptedForEmailRef.current === email) return;
    if (shouldPreserveCurrentRouteForHouseRules()) {
      pendingHouseRulesPromptedForEmailRef.current = email;
      return;
    }

    pendingHouseRulesCheckInFlightRef.current = true;
    try {
      const dashboard = await withTimeout(fetchMyHousehold(email), 'House rules', 8000);
      pendingHouseRulesPromptedForEmailRef.current = email;
      if (dashboard.household && !hasAcknowledgedLatestHouseholdRules(dashboard.household, email, profileFullName)) {
        const targetRoute = '/profile?tab=household&household_tab=rules';
        if (`${location.pathname}${location.search}` !== targetRoute) {
          navigate(targetRoute, { replace: true });
        }
      }
    } catch (err) {
      console.warn('GHAR pending house rules check failed:', err);
    } finally {
      pendingHouseRulesCheckInFlightRef.current = false;
    }
  }, [location.pathname, location.search, navigate, shouldPreserveCurrentRouteForHouseRules, withTimeout]);

  useEffect(() => {
    openPendingHouseRulesIfNeededRef.current = openPendingHouseRulesIfNeeded;
  }, [openPendingHouseRulesIfNeeded]);

  useEffect(() => {
    if (!sessionEmail) {
      pendingHouseRulesPromptedForEmailRef.current = '';
      return;
    }
    void openPendingHouseRulesIfNeeded();
  }, [openPendingHouseRulesIfNeeded, sessionEmail]);

  const loadData = useCallback(async () => {
    const email = localStorage.getItem('ghar_email') || '';
    setSessionEmail(email);
    setLoading(true);
    setDataError(null);
    try {
      const [listingsResult, bulletinsResult, bannersResult, evidenceResult] = await Promise.allSettled([
        withTimeout(fetchListings(), 'Listings'),
        withTimeout(fetchBulletins(), 'Bulletins'),
        withTimeout(fetchBanners(), 'Banners'),
        email ? withTimeout(fetchEvidence(email), 'Evidence') : Promise.resolve([]),
      ]);

      const errors: string[] = [];

      if (listingsResult.status === 'fulfilled') {
        setListings(listingsResult.value);
      } else {
        console.error('GHAR listings load error:', listingsResult.reason);
        errors.push('listings');
      }

      if (bulletinsResult.status === 'fulfilled') {
        setBulletins(bulletinsResult.value);
      } else {
        console.error('GHAR bulletins load error:', bulletinsResult.reason);
        errors.push('bulletins');
      }

      if (bannersResult.status === 'fulfilled') {
        setBanners(bannersResult.value);
      } else {
        console.error('GHAR banners load error:', bannersResult.reason);
        errors.push('banners');
      }

      if (evidenceResult.status === 'fulfilled') {
        setEvidence(evidenceResult.value);
      } else {
        console.error('GHAR evidence load error:', evidenceResult.reason);
        errors.push('evidence');
      }

      if (errors.length > 0) {
        setDataError(`Some ${APP_CONFIG.displayName} data could not be loaded (${errors.join(', ')})`);
      }
    } catch (err) {
      console.error('GHAR data load error:', err);
      setDataError(String(err));
    } finally {
      setLoading(false);
    }
  }, [withTimeout]);

  // Purge legacy demo data once (ever), then load real data
  useEffect(() => {
    // Always sync blips on startup to repair any missing ones
    (async () => {
      void withTimeout(syncBlips(), 'Sync blips', 8000).catch((e) => {
        console.error('GHAR sync-blips (non-fatal):', e);
      });
      await loadData();
    })();
  }, [loadData, withTimeout]);

  // Listen for data change events to refresh listings/evidence
  useEffect(() => {
    const handler = () => { loadData(); };
    window.addEventListener('ghar-evidence-added', handler);
    window.addEventListener('ghar-review-changed', handler);
    return () => {
      window.removeEventListener('ghar-evidence-added', handler);
      window.removeEventListener('ghar-review-changed', handler);
    };
  }, [loadData]);

  useEffect(() => {
    const openRoute = (event: Event) => {
      const route = (event as CustomEvent<{ route?: string }>).detail?.route;
      if (!route) return;
      navigateToIncomingRoute(route);
    };

    window.addEventListener('ghar-open-route', openRoute);
    return () => {
      window.removeEventListener('ghar-open-route', openRoute);
    };
  }, [navigateToIncomingRoute]);

  useEffect(() => {
    setPushTapRouteHandler(navigateToIncomingRoute);
    return () => {
      setPushTapRouteHandler(null);
    };
  }, [navigateToIncomingRoute]);

  useEffect(() => {
    openPendingPushRouteIfPresent();
  }, [openPendingPushRouteIfPresent]);

  useEffect(() => {
    if (!isNativeShell()) return;

    let removeListener: (() => void) | undefined;
    let removeResumeListener: (() => void) | undefined;
    let removeAppStateListener: (() => void) | undefined;
    const emitMutationHintIfPresent = async () => {
      const hint = await consumeHouseholdMutationHint();
      if (!hint || typeof window === 'undefined') return;
      window.dispatchEvent(new CustomEvent('ghar-household-mutation', { detail: hint }));
    };
    const openPendingNativeRoute = () => {
      openPendingPushRouteIfPresent();
    };
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        openPendingNativeRoute();
      }
    };
    const handleWindowFocus = () => {
      openPendingNativeRoute();
    };
    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    if (!nativeLaunchUrlHandledForRuntime) {
      nativeLaunchUrlHandledForRuntime = true;
      void CapacitorApp.getLaunchUrl().then(({ url }) => {
        const route = normalizeIncomingRoute(url);
        if (!route) return;
        navigateToIncomingRoute(route);
      }).catch((error) => {
        console.warn('GHAR launch URL lookup failed:', error);
      });
    }

    void CapacitorApp.addListener('appUrlOpen', ({ url }) => {
      const route = normalizeIncomingRoute(url);
      if (!route) return;
      navigateToIncomingRoute(route);
    }).then((listener) => {
      removeListener = () => {
        void listener.remove();
      };
    });

    void CapacitorApp.addListener('resume', () => {
      openPendingNativeRoute();
      void emitMutationHintIfPresent();
      void openPendingHouseRulesIfNeededRef.current?.({ force: true });
    }).then((listener) => {
      removeResumeListener = () => {
        void listener.remove();
      };
    });

    void CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        openPendingNativeRoute();
      }
    }).then((listener) => {
      removeAppStateListener = () => {
        void listener.remove();
      };
    });

    void emitMutationHintIfPresent();

    return () => {
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      removeListener?.();
      removeResumeListener?.();
      removeAppStateListener?.();
    };
  }, [navigateToIncomingRoute, openPendingPushRouteIfPresent]);

  useEffect(() => {
    const root = document.documentElement;
    let frameHandle = 0;
    let timerHandle: ReturnType<typeof setTimeout> | null = null;

    const applyKeyboardState = (open: boolean, inset: number) => {
      setKeyboardOpen(open);
      root.style.setProperty('--app-keyboard-inset', `${open ? Math.round(inset) : 0}px`);
      root.classList.toggle('app-keyboard-open', open);
    };

    const updateKeyboardState = () => {
      const inset = getKeyboardInset();
      const open = isKeyboardEditableTarget(document.activeElement) && inset > getKeyboardOpenThreshold();
      applyKeyboardState(open, inset);
      if (open) {
        scrollKeyboardTargetIntoView(document.activeElement instanceof HTMLElement ? document.activeElement : null);
      }
    };

    const scheduleKeyboardStateUpdate = (delay = 0) => {
      if (timerHandle) {
        window.clearTimeout(timerHandle);
      }
      timerHandle = window.setTimeout(() => {
        if (frameHandle) {
          window.cancelAnimationFrame(frameHandle);
        }
        frameHandle = window.requestAnimationFrame(updateKeyboardState);
      }, delay);
    };

    const handleFocusIn = (event: FocusEvent) => {
      scheduleKeyboardStateUpdate(36);
      if (event.target instanceof HTMLElement) {
        window.setTimeout(() => scrollKeyboardTargetIntoView(event.target as HTMLElement), 180);
      }
    };

    const handleFocusOut = () => {
      scheduleKeyboardStateUpdate(96);
    };

    const handleViewportChange = () => {
      scheduleKeyboardStateUpdate();
    };

    const viewport = window.visualViewport;
    viewport?.addEventListener('resize', handleViewportChange);
    viewport?.addEventListener('scroll', handleViewportChange);
    window.addEventListener('resize', handleViewportChange);
    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);
    scheduleKeyboardStateUpdate();

    return () => {
      if (timerHandle) {
        window.clearTimeout(timerHandle);
      }
      if (frameHandle) {
        window.cancelAnimationFrame(frameHandle);
      }
      viewport?.removeEventListener('resize', handleViewportChange);
      viewport?.removeEventListener('scroll', handleViewportChange);
      window.removeEventListener('resize', handleViewportChange);
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
      applyKeyboardState(false, 0);
    };
  }, []);

  // Derive active view from pathname
  const getActiveView = () => {
    const path = location.pathname;
    if (path.startsWith('/triage')) return legalBelongsToResourcesTab ? 'resources' : 'legal';
    if (path.startsWith('/vibe') || path.startsWith('/guide') || path.startsWith('/suburb')) {
      return 'vibe';
    }
    if (path.startsWith('/noticeboard')) return isHoodieExperience ? 'vibe' : 'noticeboard';
    if (path.startsWith('/profile') || path.startsWith('/household')) return 'profile';
    if (path.startsWith('/legal')) return legalBelongsToResourcesTab ? 'resources' : 'legal';
    if (path.startsWith('/arrival')) return isHoodieExperience ? 'arrival' : 'resources';
    if (path.startsWith('/setu')) return 'resources';
    if (path.startsWith('/fuel') || path.startsWith('/shopping')) return 'dashboard';
    return 'dashboard';
  };

  const isOnboarding = isAuthenticationRoute(location.pathname);
  const isNotifications = location.pathname.startsWith('/notifications');
  const isStudentGamesRoute = (APP_VARIANT === 'ghar' || APP_VARIANT === 'setu_china' || APP_VARIANT === 'wheres_wolli') && location.pathname.startsWith('/games');
  const selectedSetuGameSlug =
    isStudentGamesRoute
      ? new URLSearchParams(location.search).get('game')
      : null;
  const setuGameIframeVisible = Boolean(getSetuIndiaGameBySlug(selectedSetuGameSlug));

  useEffect(() => {
    if (!enableHoodienieLaunch || loading || isOnboarding || isNotifications || startupHoodienieLaunchShownRef.current) {
      return;
    }

    startupHoodienieLaunchShownRef.current = true;
    if (!location.pathname.startsWith('/arrival')) return;

    const timeout = window.setTimeout(() => {
      const navButton = document.querySelector<HTMLElement>('[data-hoodienie-featured-nav-button="true"]');
      const rect = navButton?.getBoundingClientRect();
      const from = rect && rect.width > 0 && rect.height > 0
        ? rect
        : {
            left: window.innerWidth / 2 - 44,
            top: Math.max(0, window.innerHeight - 132),
            width: 88,
            height: 88,
          };

      setHoodienieLaunch({
        token: Date.now(),
        from: {
          left: from.left,
          top: from.top,
          width: from.width,
          height: from.height,
        },
      });
    }, 140);

    return () => window.clearTimeout(timeout);
  }, [enableHoodienieLaunch, isNotifications, isOnboarding, loading, location.pathname]);

  return (
    <GharContext.Provider value={{ listings, bulletins, banners, evidence, loading, dataError, refreshData: loadData }}>
      <HoodienieLaunchContext.Provider value={{ launchActive: enableHoodienieLaunch && Boolean(hoodienieLaunch) }}>
        <HoodieHelpTourProvider>
          <div
            className={`size-full overflow-hidden flex flex-col bg-white ${
              !isOnboarding && APP_VARIANT !== 'ghar' && APP_VARIANT !== 'setu_china' ? 'native-safe-area-shell-horizontal' : ''
            }`}
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            <HoodienieLaunchOverlay
              launch={enableHoodienieLaunch ? hoodienieLaunch : null}
              onDone={() => setHoodienieLaunch(null)}
            />
            <InAppPopupCampaignHost
              disabled={loading || isOnboarding || isNotifications || setuGameIframeVisible}
              email={sessionEmail}
            />

          {/* Loading overlay — only on initial load */}
          {loading && listings.length === 0 && !isOnboarding && !isNotifications && !setuGameIframeVisible && !isStudentGamesRoute && (
            usesHoodieLaunchBranding || usesMalaysiaSplashArt ? (
              <div className="absolute inset-0 z-[9999] overflow-hidden">
                <HoodieLaunchSplash />
              </div>
            ) : isWolli ? (
              <div className="absolute inset-0 z-[9999] overflow-hidden bg-[#FFF1DD]">
                <img
                  src={APP_CONFIG.launchArt?.homeHero}
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 h-full w-full object-cover object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-[#FFF1DD]/10 to-[#FFF1DD]/70" />
                <div
                  className="relative z-10 flex h-full flex-col items-center px-6 text-center"
                  style={{
                    paddingTop: 'calc(var(--native-safe-area-top) + 3rem)',
                    paddingBottom: 'calc(var(--native-safe-area-bottom) + 2rem)',
                  }}
                >
                  <img
                    src={APP_CONFIG.launchArt?.wordmark || APP_CONFIG.webIcon}
                    alt="Where's Wolli"
                    className="h-auto w-[min(74vw,22rem)] object-contain drop-shadow-[0_12px_24px_rgba(54,38,24,0.18)] sm:w-[min(58vw,28rem)]"
                    loading="eager"
                  />
                  <div className="mb-[10vh] mt-auto flex items-center gap-3 text-left drop-shadow-[0_8px_20px_rgba(54,38,24,0.18)]">
                    <img
                      src={APP_CONFIG.launchArt?.loadingBlip || APP_CONFIG.webIcon}
                      alt=""
                      aria-hidden="true"
                      className="h-9 w-7 shrink-0 object-contain drop-shadow-[0_6px_12px_rgba(0,108,114,0.22)]"
                    />
                    <div>
                      <p className="text-sm font-black text-[#2E2A27]">
                        Loading Wolli
                      </p>
                      <p className="mt-0.5 text-[11px] font-bold tracking-[0.16em] text-[#8B6B43]">
                        BAYSIDE LOCAL GUIDE
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : APP_VARIANT === 'setu_china' || APP_VARIANT === 'ghar' ? (
              <div className="absolute inset-0 z-[9999] overflow-hidden bg-[#FFF0CC]">
                <img
                  src={APP_VARIANT === 'ghar' ? setuIndiaLoadingBackground : setuChinaLoadingBackground}
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 h-full w-full object-cover object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-white/5 via-transparent to-[#F4552D]/12" />
                <div
                  className="relative z-10 flex h-full flex-col items-center px-6 text-center"
                  style={{
                    paddingTop: 'calc(var(--native-safe-area-top) + 3rem)',
                    paddingBottom: 'calc(var(--native-safe-area-bottom) + 2rem)',
                  }}
                >
                  {APP_VARIANT === 'ghar' ? (
                    <SetuChinaGoldBrandPill
                      compact
                      title="SETU India AU"
                      secondaryText="Gendu"
                    />
                  ) : (
                    <SetuChinaWordmarkLogo compact />
                  )}
                  <div className={`${APP_VARIANT === 'setu_china' ? 'mb-[9vh]' : 'mb-[16vh]'} mt-auto rounded-full border border-[#F6DE9D]/90 bg-white/84 px-6 py-3 shadow-[0_18px_48px_rgba(120,58,7,0.18)] backdrop-blur-xl`}>
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full border-[4px] border-[#F04B37]/25 border-t-[#F04B37] animate-spin" />
                      <div className="text-left">
                        <p className="text-base font-black tracking-[0.08em] text-[#3B2312]">
                          {APP_VARIANT === 'ghar' ? 'Loading...' : '加载中...'}
                        </p>
                        <p className="mt-0.5 text-xs font-black tracking-[0.24em] text-[#A36B1E]">
                          {APP_VARIANT === 'ghar' ? 'SETU India AU' : '留澳助手 AU'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="absolute inset-0 z-[9999] overflow-hidden bg-[#F6F0E2]">
                <div
                  className="absolute inset-x-[-10%] top-[-18%] h-[46%] rounded-[45%] opacity-90 blur-[14px]"
                  style={{ background: 'linear-gradient(125deg, rgba(249, 205, 95, 0.96) 0%, rgba(238, 129, 49, 0.94) 56%, rgba(219, 113, 58, 0.9) 100%)' }}
                />
                <div
                  className="absolute inset-x-[-14%] top-[28%] h-[24%] rounded-[45%] bg-white/92 shadow-[0_0_80px_rgba(255,255,255,0.9)]"
                  style={{ transform: 'rotate(-7deg)' }}
                />
                <div
                  className="absolute inset-x-[-10%] bottom-[-16%] h-[52%] rounded-[46%] opacity-95 blur-[10px]"
                  style={{ background: 'linear-gradient(120deg, rgba(153, 194, 84, 0.96) 0%, rgba(127, 171, 66, 0.94) 42%, rgba(77, 128, 90, 0.96) 100%)' }}
                />
                <div className="absolute inset-0 bg-white/10 backdrop-blur-[18px]" />
                <div className="relative z-10 flex h-full flex-col items-center justify-center gap-5 px-6 text-center">
                  <img
                    src={APP_CONFIG.onboardingMarker}
                    alt={APP_CONFIG.onboardingMarkerAlt}
                    className="h-auto w-24 object-contain drop-shadow-[0_22px_35px_rgba(15,23,42,0.16)]"
                  />
                  <div className="rounded-full border border-white/70 bg-white/72 px-5 py-3 shadow-[0_14px_30px_rgba(15,23,42,0.12)] backdrop-blur-xl">
                    <div className="flex items-center gap-3">
                      <div className="h-5 w-5 rounded-full border-2 border-[#111827] border-t-transparent animate-spin" />
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#111827]">
                        {APP_CONFIG.loadingLabel}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )
          )}

            <div className="flex-1 min-h-0 overflow-hidden">
              <Outlet />
            </div>

            {!isOnboarding && !isNotifications && !keyboardOpen && (
              <>
                {!setuGameIframeVisible && <HealthCheckReminder />}
                <NavBar
                  activeView={getActiveView()}
                  onFeaturedNavigateStart={
                    enableHoodienieLaunch
                      ? (rect) => {
                          setHoodienieLaunch({
                            token: Date.now(),
                            from: {
                              left: rect.left,
                              top: rect.top,
                              width: rect.width,
                              height: rect.height,
                            },
                          });
                        }
                      : undefined
                  }
                  onNavigate={(view) => {
                    clearNativeOpenRoute();
                    const routes: Record<string, string> = {
                      dashboard: '/dashboard',
                      vibe: '/vibe',
                      noticeboard: APP_VARIANT === 'setu_china' || APP_VARIANT === 'jom_settle' ? '/vibe?section=alerts' : '/noticeboard',
                      profile: '/profile',
                      legal: getLegalNavRoute(useHoodieResourcesShell),
                      resources: APP_CONFIG.resourcesRoute,
                      arrival: '/arrival',
                    };
                    if (enableHoodienieLaunch && view === 'arrival') {
                      navigate('/arrival', {
                        state: { hoodienieLandingToken: Date.now() },
                      });
                      return;
                    }
                    navigate(routes[view] || '/dashboard');
                  }}
                />
              </>
            )}
          </div>
        </HoodieHelpTourProvider>
      </HoodienieLaunchContext.Provider>
    </GharContext.Provider>
  );
}
