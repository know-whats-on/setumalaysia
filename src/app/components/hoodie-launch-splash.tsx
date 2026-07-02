import { motion } from 'motion/react';
import { APP_CONFIG } from '../lib/app-config';
import mascaPartnership from '../../assets/masca-partnership.svg';

const FRAME_DURATION_MS = 800;
const LOOP_DURATION_SECONDS = (FRAME_DURATION_MS * 2) / 1000;

const DARK_BODY_PATH =
  'M244 302.578C314 302.578 245.101 303.156 419.891 302.58C420.517 579.666 420.542 562.454 420.517 579.666C420.492 557.458 420.542 601.874 420.517 579.666C423.182 578.811 430.013 576.437 432.427 576.083C490.19 561.527 562.142 564.309 614 595.003C661 622.821 710.183 673.316 731.839 722.366C745 754.003 751.033 798.127 751.033 826.295H749.404C733.5 826.503 706.59 826.281 690 826.295H577C577 757.503 509.144 719.769 451.331 757.749L450.443 758.432C425.421 778.051 418.427 798.503 418.427 826.649C361.528 826.611 301 826.863 244.213 826.863C244.213 797.503 244.626 764.423 244.601 736.426L244.594 656.577L244.588 616.503V574.503L244.588 404.503C244.6 371.862 244.588 336.003 244 302.578Z';
const DARK_TOP_BAR_SHORT_PATH = 'M548 198H780L754 620H574L548 198Z';
const DARK_TOP_BAR_TALL_PATH = 'M548 108H780L754 620H574L548 108Z';

const LIGHT_BODY_PATH =
  'M0 194.578C70 194.578 1.10081 195.156 175.891 194.58C176.517 471.666 176.542 454.454 176.517 471.666C176.492 449.458 176.542 493.874 176.517 471.666C179.182 470.811 186.013 468.437 188.427 468.083C246.19 453.527 318.142 456.309 370 487.003C417 514.821 466.183 565.316 487.839 614.366C501 646.003 507.033 690.127 507.033 718.295H505.404C489.5 718.503 462.59 718.281 446 718.295H333C333 649.503 265.144 611.769 207.331 649.749L206.443 650.432C181.421 670.051 174.427 690.503 174.427 718.649C117.528 718.611 57 718.863 0.212741 718.863C0.212741 689.503 0.625522 656.423 0.600501 628.426L0.594239 548.577L0.587977 508.503V466.503L0.587977 296.503C0.600488 263.862 0.587973 228.003 0 194.578Z';
const LIGHT_TOP_BAR_SHORT_PATH = 'M304 90H536L510 512H330L304 90Z';
const LIGHT_TOP_BAR_TALL_PATH = 'M304 0H536L510 512H330L304 0Z';

type HoodieLogoLoopProps = {
  className?: string;
  label?: string;
  animate?: boolean;
  backdrop?: 'transparent' | 'black';
  tone?: 'dark' | 'light';
};

export function HoodieLogoLoop({
  className,
  label = APP_CONFIG.loadingLabel,
  animate = true,
  backdrop = 'transparent',
  tone = 'dark',
}: HoodieLogoLoopProps) {
  const isLightTone = tone === 'light';
  const viewBox = isLightTone ? '0 0 536 719' : '0 0 1024 1024';
  const bodyPath = isLightTone ? LIGHT_BODY_PATH : DARK_BODY_PATH;
  const topBarShortPath = isLightTone ? LIGHT_TOP_BAR_SHORT_PATH : DARK_TOP_BAR_SHORT_PATH;
  const topBarTallPath = isLightTone ? LIGHT_TOP_BAR_TALL_PATH : DARK_TOP_BAR_TALL_PATH;
  const bodyFill = isLightTone ? '#050505' : '#FFFFFF';

  return (
    <motion.svg
      viewBox={viewBox}
      aria-label={label}
      role="img"
      focusable="false"
      className={className}
      preserveAspectRatio="xMidYMid meet"
    >
      {backdrop === 'black' ? <rect width="1024" height="1024" fill="#050505" /> : null}
      <motion.path
        d={topBarShortPath}
        fill="#FBD433"
        animate={animate ? { d: [topBarShortPath, topBarTallPath, topBarShortPath] } : undefined}
        transition={animate ? {
          duration: LOOP_DURATION_SECONDS,
          ease: 'linear',
          repeat: Infinity,
          times: [0, 0.5, 1],
        } : undefined}
      />
      <path d={bodyPath} fill={bodyFill} />
      {isLightTone ? (
        <rect x="333" y="558" width="174" height="161" fill="#FBD433" />
      ) : (
        <rect x="577" y="666" width="174" height="161" fill="#FBD433" />
      )}
    </motion.svg>
  );
}

export function ExperienceLaunchMark({ className }: { className?: string }) {
  if (APP_CONFIG.variant === 'burb_mate') {
    return <HoodieLogoLoop className={className} />;
  }

  return (
    <img
      src={APP_CONFIG.onboardingMarker}
      alt={APP_CONFIG.onboardingMarkerAlt}
      className={className}
    />
  );
}

export function HoodieLaunchSplash() {
  if (APP_CONFIG.variant === 'jom_settle' && APP_CONFIG.splashArt?.backgroundImage) {
    return (
      <div className="relative h-full w-full overflow-hidden bg-[#DCEFFC] px-6">
        <img
          src={APP_CONFIG.splashArt.backgroundImage}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="absolute inset-x-0 top-0 h-[32%] bg-gradient-to-b from-white/42 via-white/12 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-[42%] bg-gradient-to-t from-[#07101F]/60 via-[#07101F]/16 to-transparent" />
        <div
          className="relative z-10 flex h-full flex-col items-center text-center"
          style={{
            paddingTop: 'calc(var(--native-safe-area-top) + clamp(4.25rem, 8vh, 6rem))',
            paddingBottom: 'calc(var(--native-safe-area-bottom) + 1.75rem)',
          }}
        >
          <img
            src={APP_CONFIG.splashArt.wordmark || APP_CONFIG.webIcon}
            alt="Senang AU"
            className="h-auto w-[min(76vw,24rem)] object-contain drop-shadow-[0_14px_28px_rgba(7,16,31,0.24)] sm:w-[min(52vw,28rem)]"
          />
          <img
            data-testid="masca-partnership-lockup"
            src={mascaPartnership}
            alt="In strategic partnership with MASCA, Malaysian Students' Council of Australia"
            className="mt-5 h-auto w-[min(70vw,18rem)] object-contain sm:w-[min(44vw,22rem)]"
          />
          <div className="mb-[9vh] mt-auto rounded-full border border-white/70 bg-white/86 px-6 py-3 shadow-[0_18px_48px_rgba(7,16,31,0.22)] backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full border-[4px] border-[#E53935]/20 border-t-[#E53935] animate-spin" />
              <div className="text-left">
                <p className="text-base font-black tracking-[0.08em] text-[#081427]">Loading...</p>
                <p className="mt-0.5 text-xs font-black uppercase tracking-[0.24em] text-[#E53935]">Senang AU</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (APP_CONFIG.variant === 'wheres_wolli') {
    const wordmark = APP_CONFIG.launchArt?.wordmark || APP_CONFIG.webIcon || APP_CONFIG.onboardingMarker;

    return (
      <div className="flex h-full w-full items-center justify-center overflow-hidden bg-[#FFF1DD] px-6">
        <img
          src={wordmark}
          alt="Where's Wolli"
          className="h-auto w-[min(78vw,24rem)] object-contain drop-shadow-[0_18px_34px_rgba(54,38,24,0.18)] sm:w-[min(58vw,30rem)]"
        />
      </div>
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center overflow-hidden bg-black px-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <ExperienceLaunchMark className="h-28 w-28 object-contain drop-shadow-[0_20px_50px_rgba(251,212,51,0.2)] sm:h-32 sm:w-32" />
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/70">
          {APP_CONFIG.loadingLabel}
        </p>
      </div>
    </div>
  );
}
