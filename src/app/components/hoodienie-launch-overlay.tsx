import { useEffect, useState } from 'react';
import hoodienieMascotUrl from '../assets/hoodienie.svg';

type LaunchFrame = {
  token: number;
  from: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
};

interface HoodienieLaunchOverlayProps {
  launch: LaunchFrame | null;
  onDone: () => void;
}

export function HoodienieLaunchOverlay({ launch, onDone }: HoodienieLaunchOverlayProps) {
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!launch) return;
    setTargetRect(null);
    const timeout = window.setTimeout(onDone, 1280);
    return () => window.clearTimeout(timeout);
  }, [launch, onDone]);

  useEffect(() => {
    if (!launch) return;

    let frameId = 0;
    let cancelled = false;
    const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();

    const syncTarget = () => {
      if (cancelled) return;
      const target = document.querySelector<HTMLElement>('[data-hoodienie-landing-mascot-slot="true"]');
      if (target) {
        const rect = target.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setTargetRect(rect);
        }
      }
      const elapsed = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startedAt;
      if (elapsed < 420) {
        frameId = window.requestAnimationFrame(syncTarget);
      }
    };

    frameId = window.requestAnimationFrame(syncTarget);

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frameId);
    };
  }, [launch]);

  if (!launch) return null;

  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 390;
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 844;
  const bigSize = Math.max(176, Math.min(viewportWidth * 0.54, 272));
  const fallbackSmallSize = Math.max(72, Math.min(viewportWidth * 0.18, 96));
  const startCenterX = launch.from.left + launch.from.width / 2;
  const startCenterY = launch.from.top + launch.from.height / 2;
  const startX = startCenterX - bigSize / 2;
  const startY = startCenterY - bigSize / 2;
  const midX = viewportWidth / 2 - bigSize / 2;
  const midY = viewportHeight * 0.4 - bigSize / 2;
  const finalSize = targetRect
    ? Math.max(72, Math.min(targetRect.width, targetRect.height) * 0.92)
    : fallbackSmallSize;
  const endX = targetRect
    ? targetRect.left + Math.max(0, (targetRect.width - finalSize) / 2)
    : viewportWidth / 2 - finalSize / 2;
  const endY = targetRect
    ? targetRect.top + Math.max(0, (targetRect.height - finalSize) / 2)
    : Math.min(viewportHeight * 0.17, 132);

  return (
    <>
      <style>{`
        @keyframes hoodienieSmokeRise {
          0% {
            opacity: 0;
            transform: translate3d(0, 0, 0) scale(0.3);
          }
          16% {
            opacity: 0.58;
          }
          100% {
            opacity: 0;
            transform: translate3d(var(--hoodienie-smoke-x), var(--hoodienie-smoke-y), 0) scale(1.55);
          }
        }

        @keyframes hoodienieLaunchFlight {
          0% {
            opacity: 0;
            transform: translate3d(var(--hoodienie-start-x), var(--hoodienie-start-y), 0) scale(0.2) rotate(-8deg);
          }
          12% {
            opacity: 1;
          }
          46% {
            opacity: 1;
            transform: translate3d(var(--hoodienie-mid-x), var(--hoodienie-mid-y), 0) scale(1.06) rotate(0deg);
          }
          74% {
            opacity: 1;
            transform: translate3d(var(--hoodienie-mid-x), var(--hoodienie-mid-y), 0) scale(1) rotate(-2deg);
          }
          100% {
            opacity: 0.96;
            transform: translate3d(var(--hoodienie-end-x), var(--hoodienie-end-y), 0) scale(var(--hoodienie-end-scale)) rotate(0deg);
          }
        }

        @keyframes hoodienieLaunchGlow {
          0% {
            opacity: 0;
            transform: scale(0.4);
          }
          38% {
            opacity: 0.95;
            transform: scale(1);
          }
          100% {
            opacity: 0;
            transform: scale(0.72);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          @keyframes hoodienieSmokeRise {
            from {
              opacity: 0;
              transform: scale(0.8);
            }
            to {
              opacity: 0;
              transform: scale(1.05);
            }
          }

          @keyframes hoodienieLaunchFlight {
            from {
              opacity: 0;
              transform: translate3d(var(--hoodienie-mid-x), var(--hoodienie-mid-y), 0) scale(0.84);
            }
            to {
              opacity: 0.92;
              transform: translate3d(var(--hoodienie-end-x), var(--hoodienie-end-y), 0) scale(var(--hoodienie-end-scale));
            }
          }
        }
      `}</style>

      <div className="pointer-events-none fixed inset-0 z-[10020] overflow-hidden">
        {[0, 1, 2, 3].map((index) => {
          const smokeSize = bigSize * (0.22 + index * 0.06);
          const smokeLeft = startCenterX - smokeSize / 2;
          const smokeTop = startCenterY - smokeSize / 2;
          const smokeX = `${(index - 1.5) * 18}px`;
          const smokeY = `${-36 - index * 22}px`;
          return (
            <span
              key={index}
              aria-hidden="true"
              className="absolute rounded-full bg-[radial-gradient(circle,rgba(254,240,138,0.5)_0%,rgba(255,255,255,0.36)_44%,rgba(255,255,255,0)_72%)] blur-[4px]"
              style={{
                width: `${smokeSize}px`,
                height: `${smokeSize}px`,
                left: `${smokeLeft}px`,
                top: `${smokeTop}px`,
                ['--hoodienie-smoke-x' as string]: smokeX,
                ['--hoodienie-smoke-y' as string]: smokeY,
                animation: `hoodienieSmokeRise 0.7s ease-out ${index * 90}ms forwards`,
              }}
            />
          );
        })}
        <div
          aria-hidden="true"
          className="absolute rounded-full bg-[#FACC15]/35 blur-[32px]"
          style={{
            width: `${bigSize * 0.92}px`,
            height: `${bigSize * 0.92}px`,
            left: `${midX + bigSize * 0.04}px`,
            top: `${midY + bigSize * 0.04}px`,
            animation: 'hoodienieLaunchGlow 1.22s ease-out forwards',
          }}
        />
        <img
          src={hoodienieMascotUrl}
          alt=""
          aria-hidden="true"
          className="absolute object-contain drop-shadow-[0_24px_40px_rgba(250,204,21,0.28)]"
          style={{
            width: `${bigSize}px`,
            height: `${bigSize}px`,
            transformOrigin: 'top left',
            ['--hoodienie-start-x' as string]: `${startX}px`,
            ['--hoodienie-start-y' as string]: `${startY}px`,
            ['--hoodienie-mid-x' as string]: `${midX}px`,
            ['--hoodienie-mid-y' as string]: `${midY}px`,
            ['--hoodienie-end-x' as string]: `${endX}px`,
            ['--hoodienie-end-y' as string]: `${endY}px`,
            ['--hoodienie-end-scale' as string]: `${finalSize / bigSize}`,
            animation: 'hoodienieLaunchFlight 1.22s cubic-bezier(0.2, 0.9, 0.22, 1) forwards',
          }}
        />
      </div>
    </>
  );
}
