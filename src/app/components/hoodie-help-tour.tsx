import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { ArrowRight, Check, Play, RotateCcw, Volume2, VolumeX, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';
import { APP_CONFIG } from '../lib/app-config';
import type { AppVariant } from '../lib/app-variant';
import {
  buildHoodieHelpCompletionStorageKey,
  clampHoodieHelpBubblePosition,
  getHoodieHelpBubbleSize,
  getHoodieHelpDefaultBubblePosition,
  getHoodieHelpTourStep,
  getNextHoodieHelpTourStepId,
  isHoodieHelpStepVisibleOnRoute,
  type HoodieHelpTourMode,
  type HoodieHelpTourStepId,
} from '../lib/hoodie-help-tour';

type ActiveHoodieHelpSession = {
  mode: HoodieHelpTourMode;
  stepId: HoodieHelpTourStepId;
  pendingStepId: HoodieHelpTourStepId | null;
  token: number;
};

type HoodieHelpTourContextValue = {
  enabled: boolean;
  activeStepId: HoodieHelpTourStepId | null;
  activeMode: HoodieHelpTourMode | null;
  isStepActive: (stepId: HoodieHelpTourStepId) => boolean;
  isFirstRunStepActive: (stepId: HoodieHelpTourStepId) => boolean;
  openReplay: (stepId: HoodieHelpTourStepId) => void;
  closeReplay: () => void;
  restartTour: () => void;
  reportTripPlannerOpen: (open: boolean) => void;
  shouldAutoOpenTripPlanner: boolean;
};

const HoodieHelpTourContext = createContext<HoodieHelpTourContextValue>({
  enabled: false,
  activeStepId: null,
  activeMode: null,
  isStepActive: () => false,
  isFirstRunStepActive: () => false,
  openReplay: () => {},
  closeReplay: () => {},
  restartTour: () => {},
  reportTripPlannerOpen: () => {},
  shouldAutoOpenTripPlanner: false,
});

type HoodieHelpVideoPlayerStatus = 'idle' | 'loading' | 'ready' | 'blocked' | 'error';

function getViewportSize() {
  if (typeof window === 'undefined') {
    return { width: 390, height: 844 };
  }
  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
}

function HoodieHelpVideoBubble({
  appVariant,
  session,
  onDismiss,
  onNext,
  onFinish,
  disableAdvance,
}: {
  appVariant: AppVariant;
  session: ActiveHoodieHelpSession;
  onDismiss: () => void;
  onNext: () => void;
  onFinish: () => void;
  disableAdvance: boolean;
}) {
  const { width, height } = getViewportSize();
  const bubbleSize = getHoodieHelpBubbleSize(width);
  const step = getHoodieHelpTourStep(session.stepId, appVariant);
  const videoSrc = step.videoSrc;
  const [muted, setMuted] = useState(false);
  const [videoEnded, setVideoEnded] = useState(false);
  const [playerStatus, setPlayerStatus] = useState<HoodieHelpVideoPlayerStatus>(() =>
    videoSrc ? 'loading' : 'idle',
  );
  const [position, setPosition] = useState(() =>
    getHoodieHelpDefaultBubblePosition(step.id, width, height, appVariant),
  );
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const dragActiveRef = useRef(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mutedRef = useRef(false);
  const isLastStep = getNextHoodieHelpTourStepId(step.id) === null;

  const playVideo = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = mutedRef.current;
    const playPromise = video.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      void playPromise
        .then(() => {
          if (videoRef.current === video) {
            setPlayerStatus('ready');
          }
        })
        .catch(() => {
          if (videoRef.current === video) {
            setPlayerStatus('blocked');
          }
        });
    }
  }, []);

  const replayVideo = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    setVideoEnded(false);
    setPlayerStatus('loading');
    video.currentTime = 0;
    playVideo();
  }, [playVideo]);

  useEffect(() => {
    const viewport = getViewportSize();
    setMuted(false);
    mutedRef.current = false;
    setVideoEnded(false);
    setPlayerStatus(videoSrc ? 'loading' : 'idle');
    setPosition(getHoodieHelpDefaultBubblePosition(step.id, viewport.width, viewport.height, appVariant));
  }, [appVariant, session.token, step.id, videoSrc]);

  useEffect(() => {
    const handleResize = () => {
      const viewport = getViewportSize();
      setPosition((current) =>
        clampHoodieHelpBubblePosition(current, viewport.width, viewport.height),
      );
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    mutedRef.current = muted;
    const video = videoRef.current;
    if (!video) return;
    video.muted = muted;
    playVideo();
  }, [muted, playVideo]);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      if (!dragActiveRef.current) return;
      const viewport = getViewportSize();
      setPosition(
        clampHoodieHelpBubblePosition(
          {
            x: event.clientX - dragOffsetRef.current.x,
            y: event.clientY - dragOffsetRef.current.y,
          },
          viewport.width,
          viewport.height,
        ),
      );
    };

    const handlePointerUp = () => {
      dragActiveRef.current = false;
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, []);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    dragActiveRef.current = true;
    dragOffsetRef.current = {
      x: event.clientX - position.x,
      y: event.clientY - position.y,
    };
  };

  const videoClassName =
    step.videoFormat === 'short'
      ? 'pointer-events-none absolute inset-0 h-full w-full object-cover object-center scale-[1.08]'
      : 'pointer-events-none absolute inset-0 h-full w-full object-cover object-center';
  const showMuteButton = Boolean(videoSrc);
  const showReplayOverlay = Boolean(videoSrc) && (videoEnded || playerStatus === 'blocked');

  return (
    <div className="pointer-events-none fixed inset-0 z-[2150]">
      <div
        data-testid="hoodie-help-bubble"
        className="pointer-events-auto absolute"
        style={{
          width: `${bubbleSize}px`,
          height: `${bubbleSize}px`,
          transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
        }}
      >
        <div
          role="dialog"
          aria-label={`${step.title} onboarding video`}
          data-video-format={step.videoFormat}
          onPointerDown={handlePointerDown}
          className="relative h-full w-full touch-none select-none overflow-hidden rounded-full border border-white/85 bg-white shadow-[0_28px_55px_rgba(15,23,42,0.2)]"
        >
          {videoSrc ? (
            <>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#ffffff_0%,#f8fafc_62%,#dbeafe_100%)]" />
              <video
                ref={videoRef}
                data-testid="hoodie-help-video"
                key={`${step.id}:${session.token}`}
                src={videoSrc}
                autoPlay
                muted={muted}
                playsInline
                preload="auto"
                disablePictureInPicture
                controlsList="nodownload nofullscreen noplaybackrate noremoteplayback"
                className={videoClassName}
                onLoadedData={() => {
                  setPlayerStatus('ready');
                  playVideo();
                }}
                onPlay={() => {
                  setVideoEnded(false);
                  setPlayerStatus('ready');
                }}
                onEnded={() => {
                  setVideoEnded(true);
                  setPlayerStatus('ready');
                }}
                onError={() => {
                  setPlayerStatus('error');
                }}
              />
              {playerStatus === 'loading' ? (
                <div className="pointer-events-none absolute inset-0 bg-white/18" />
              ) : null}
              {showReplayOverlay ? (
                <button
                  type="button"
                  onClick={replayVideo}
                  onPointerDown={(event) => event.stopPropagation()}
                  aria-label={videoEnded ? 'Replay onboarding video' : 'Play onboarding video'}
                  className="absolute left-1/2 top-1/2 z-10 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/80 bg-white/90 text-[#0F172A] shadow-[0_18px_36px_rgba(15,23,42,0.24)] backdrop-blur transition hover:scale-105"
                >
                  {videoEnded ? (
                    <RotateCcw className="h-7 w-7" strokeWidth={2.4} />
                  ) : (
                    <Play className="h-7 w-7 translate-x-0.5" strokeWidth={2.4} />
                  )}
                </button>
              ) : null}
            </>
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top,#ffffff_0%,#f8fafc_62%,#e2e8f0_100%)] p-8 text-center">
              <div>
                <p className="text-base font-bold text-[#0F172A]">{step.title}</p>
                <p className="mt-2 text-xs leading-relaxed text-[#64748B]">
                  Add the bundled onboarding video for this step to enable local playback.
                </p>
              </div>
            </div>
          )}
          {playerStatus === 'error' ? (
            <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.94)_0%,rgba(248,250,252,0.98)_62%,rgba(226,232,240,1)_100%)] p-8 text-center">
              <div>
                <p className="text-base font-bold text-[#0F172A]">{step.title}</p>
                <p className="mt-2 text-xs leading-relaxed text-[#64748B]">
                  This onboarding video could not be loaded on this device.
                </p>
              </div>
            </div>
          ) : null}
        </div>

        <div className="absolute left-1/2 top-full flex -translate-x-1/2 -translate-y-5 items-center gap-2">
          {showMuteButton ? (
            <button
              type="button"
              onClick={() => {
                setMuted((current) => !current);
              }}
              aria-label={muted ? 'Unmute video' : 'Mute video'}
              className={`flex h-12 w-12 items-center justify-center rounded-full border border-[#D1D5DB] bg-white text-[#111827] shadow-[0_12px_26px_rgba(15,23,42,0.18)] transition ${
                muted ? 'animate-[hoodieHelpMutedPulse_1.2s_ease-in-out_infinite]' : ''
              }`}
            >
              {muted ? <VolumeX className="h-5 w-5" strokeWidth={2.2} /> : <Volume2 className="h-5 w-5" strokeWidth={2.2} />}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onDismiss}
            aria-label={session.mode === 'first_run' ? 'Skip onboarding' : 'Close video'}
            className="flex h-12 w-12 items-center justify-center rounded-full border border-[#D1D5DB] bg-white text-[#111827] shadow-[0_12px_26px_rgba(15,23,42,0.18)]"
          >
            <X className="h-5 w-5" strokeWidth={2.2} />
          </button>
          {session.mode === 'first_run' ? (
            <button
              type="button"
              onClick={isLastStep ? onFinish : onNext}
              disabled={disableAdvance}
              aria-label={isLastStep ? 'Finish onboarding' : 'Next onboarding step'}
              className={`flex h-12 w-12 items-center justify-center rounded-full border border-[#D1D5DB] bg-white text-[#111827] shadow-[0_12px_26px_rgba(15,23,42,0.18)] transition ${
                disableAdvance ? 'cursor-wait opacity-60' : ''
              }`}
            >
              {isLastStep ? <Check className="h-5 w-5" strokeWidth={2.2} /> : <ArrowRight className="h-5 w-5" strokeWidth={2.2} />}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function HoodieHelpTourProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const appVariant = APP_CONFIG.variant;
  const enabled = APP_CONFIG.experienceMode === 'hoodie' && APP_CONFIG.showVideoOnboarding;
  const [sessionEmail, setSessionEmail] = useState('');
  const [hasCompletedFirstRun, setHasCompletedFirstRun] = useState(false);
  const [activeSession, setActiveSession] = useState<ActiveHoodieHelpSession | null>(null);
  const [tripPlannerOpen, setTripPlannerOpen] = useState(false);
  const getStepVisibleOnCurrentRoute = useCallback((stepId: HoodieHelpTourStepId) => {
    if (stepId === 'trip-planner') {
      return location.pathname.startsWith('/dashboard') && tripPlannerOpen;
    }
    return isHoodieHelpStepVisibleOnRoute(stepId, location.pathname, location.search);
  }, [location.pathname, location.search, tripPlannerOpen]);
  const displayStepId =
    activeSession?.mode === 'first_run' &&
    activeSession.pendingStepId &&
    getStepVisibleOnCurrentRoute(activeSession.pendingStepId)
      ? activeSession.pendingStepId
      : activeSession?.stepId || null;
  const displaySession = activeSession && displayStepId
    ? {
        ...activeSession,
        stepId: displayStepId,
      }
    : null;
  const exposedActiveStepId =
    activeSession?.mode === 'first_run'
      ? activeSession.pendingStepId || activeSession.stepId
      : activeSession?.stepId || null;
  const firstRunTransitionPending = Boolean(
    activeSession?.mode === 'first_run' && activeSession.pendingStepId,
  );

  useEffect(() => {
    const email = String(localStorage.getItem('ghar_email') || '').trim().toLowerCase();
    setSessionEmail(email);
    if (!email) {
      setHasCompletedFirstRun(false);
      return;
    }
    setHasCompletedFirstRun(
      localStorage.getItem(buildHoodieHelpCompletionStorageKey(email, appVariant)) === 'true',
    );
  }, [appVariant, location.pathname]);

  useEffect(() => {
    if (!enabled) {
      setActiveSession(null);
      return;
    }
    if (!sessionEmail || hasCompletedFirstRun || activeSession) return;
    if (!location.pathname.startsWith('/arrival')) return;

    startFirstRunSession('hoodienie');
  }, [activeSession, enabled, hasCompletedFirstRun, location.pathname, sessionEmail]);

  const navigateToStep = useCallback((stepId: HoodieHelpTourStepId) => {
    const step = getHoodieHelpTourStep(stepId, appVariant);
    const currentRoute = `${location.pathname}${location.search}`;
    if (stepId === 'trip-planner') {
      if (!location.pathname.startsWith('/dashboard')) {
        navigate('/dashboard', { replace: true });
      }
      return;
    }
    if (currentRoute !== step.route) {
      navigate(step.route, { replace: true });
    }
  }, [appVariant, location.pathname, location.search, navigate]);

  useEffect(() => {
    if (!activeSession || activeSession.mode !== 'first_run') return;
    const targetStepId = activeSession.pendingStepId || activeSession.stepId;
    navigateToStep(targetStepId);
  }, [activeSession, navigateToStep]);

  useEffect(() => {
    if (!activeSession || activeSession.mode !== 'first_run' || !activeSession.pendingStepId) return;
    if (getStepVisibleOnCurrentRoute(activeSession.pendingStepId)) return;
    const retryPendingStepId = activeSession.pendingStepId;
    const retryInterval = window.setInterval(() => {
      if (getStepVisibleOnCurrentRoute(retryPendingStepId)) return;
      navigateToStep(retryPendingStepId);
    }, 180);
    return () => {
      window.clearInterval(retryInterval);
    };
  }, [activeSession, getStepVisibleOnCurrentRoute, navigateToStep]);

  useEffect(() => {
    if (!activeSession || activeSession.mode !== 'first_run' || !activeSession.pendingStepId) return;
    if (!getStepVisibleOnCurrentRoute(activeSession.pendingStepId)) return;
    setActiveSession((current) => {
      if (!current || current.mode !== 'first_run' || !current.pendingStepId) return current;
      return {
        ...current,
        stepId: current.pendingStepId,
        pendingStepId: null,
      };
    });
  }, [activeSession, getStepVisibleOnCurrentRoute]);

  const persistCompletion = () => {
    if (!sessionEmail) return;
    localStorage.setItem(buildHoodieHelpCompletionStorageKey(sessionEmail, appVariant), 'true');
    setHasCompletedFirstRun(true);
  };

  const startFirstRunSession = (stepId: HoodieHelpTourStepId = 'hoodienie') => {
    setTripPlannerOpen(false);
    setActiveSession({
      mode: 'first_run',
      stepId,
      pendingStepId: null,
      token: Date.now(),
    });
  };

  const closeReplay = () => {
    setActiveSession((current) => (current?.mode === 'manual' ? null : current));
  };

  const dismissSession = () => {
    if (!activeSession) return;
    if (activeSession.mode === 'first_run') {
      persistCompletion();
    }
    setActiveSession(null);
  };

  const advanceSession = () => {
    if (!activeSession) return;
    if (activeSession.mode === 'first_run' && activeSession.pendingStepId) return;
    const nextStepId = getNextHoodieHelpTourStepId(activeSession.stepId);
    if (!nextStepId) {
      persistCompletion();
      setActiveSession(null);
      return;
    }
    setActiveSession((current) => {
      if (!current) return current;
      return {
        ...current,
        pendingStepId: nextStepId,
      };
    });
    navigateToStep(nextStepId);
  };

  const openReplay = (stepId: HoodieHelpTourStepId) => {
    if (!enabled) return;
    setActiveSession({
      mode: 'manual',
      stepId,
      pendingStepId: null,
      token: Date.now(),
    });
  };

  const restartTour = () => {
    if (!enabled) return;
    startFirstRunSession('hoodienie');
    navigateToStep('hoodienie');
  };

  const stepVisible = Boolean(
    displaySession &&
      (
        displaySession.mode === 'first_run'
          ? getStepVisibleOnCurrentRoute(displaySession.stepId)
          : isHoodieHelpStepVisibleOnRoute(displaySession.stepId, location.pathname, location.search)
      ),
  );

  const contextValue = useMemo<HoodieHelpTourContextValue>(
    () => ({
      enabled,
      activeStepId: exposedActiveStepId,
      activeMode: activeSession?.mode || null,
      isStepActive: (stepId) => exposedActiveStepId === stepId,
      isFirstRunStepActive: (stepId) => activeSession?.mode === 'first_run' && exposedActiveStepId === stepId,
      openReplay,
      closeReplay,
      restartTour,
      reportTripPlannerOpen: setTripPlannerOpen,
      shouldAutoOpenTripPlanner:
        activeSession?.mode === 'first_run' &&
        (activeSession.pendingStepId || activeSession.stepId) === 'trip-planner',
    }),
    [activeSession, enabled, exposedActiveStepId],
  );

  return (
    <HoodieHelpTourContext.Provider value={contextValue}>
      <style>{`
        @keyframes hoodieHelpMutedPulse {
          0%, 100% {
            box-shadow: 0 10px 24px rgba(15, 23, 42, 0.16);
            transform: scale(1);
          }
          50% {
            box-shadow: 0 14px 28px rgba(30, 64, 175, 0.22);
            transform: scale(1.05);
          }
        }
      `}</style>
      {children}
      {displaySession && stepVisible ? (
        <HoodieHelpVideoBubble
          appVariant={appVariant}
          session={displaySession}
          onDismiss={dismissSession}
          onNext={advanceSession}
          onFinish={advanceSession}
          disableAdvance={firstRunTransitionPending}
        />
      ) : null}
    </HoodieHelpTourContext.Provider>
  );
}

export function useHoodieHelpTour() {
  return useContext(HoodieHelpTourContext);
}

export function HoodieHelpTrigger({
  stepId,
  className = '',
  fab = false,
  title,
}: {
  stepId: HoodieHelpTourStepId;
  className?: string;
  fab?: boolean;
  title?: string;
}) {
  const { enabled, openReplay } = useHoodieHelpTour();
  const step = getHoodieHelpTourStep(stepId, APP_CONFIG.variant);
  const triggerLabel = title || `Open ${step.title} onboarding video`;

  if (!enabled) return null;

  return (
    <button
      type="button"
      onClick={() => openReplay(stepId)}
      aria-label={triggerLabel}
      title={triggerLabel}
      className={[
        fab
          ? 'flex h-12 w-12 items-center justify-center rounded-2xl border border-[#D7E5F3] bg-white/95 text-[#64748B] shadow-lg shadow-[#94A3B8]/15 backdrop-blur-md transition hover:border-[#1E40AF]/30 hover:text-[#1E40AF]'
          : 'flex h-10 w-10 items-center justify-center rounded-full border border-[#CAD8EB] bg-white text-[#64748B] shadow-sm transition hover:border-[#1E40AF]/30 hover:text-[#1E40AF]',
        className,
      ].join(' ')}
    >
      <span className={`font-semibold leading-none ${fab ? 'text-xl' : 'text-lg'}`}>?</span>
    </button>
  );
}
