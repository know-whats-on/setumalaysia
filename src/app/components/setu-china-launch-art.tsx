import setuChinaLandingBackground from '../../assets/setu-china-landing-background.png';
import setuChinaLoadingBackground from '../../assets/setu-china-loading-background.png';
import setuChinaWordmark from '../../assets/setu-china-wordmark.svg';
import setuIndiaLandingBackground from '../../assets/setu-india-landing-background.png';
import setuIndiaLoadingBackground from '../../assets/setu-india-loading-background.png';

export {
  setuChinaLandingBackground,
  setuChinaLoadingBackground,
  setuIndiaLandingBackground,
  setuIndiaLoadingBackground,
};

interface SetuChinaGoldBrandPillProps {
  compact?: boolean;
  hero?: boolean;
  secondary?: boolean;
  className?: string;
  title?: string;
  secondaryText?: string;
}

export function SetuChinaWordmarkLogo({
  compact = false,
  hero = false,
  className = '',
}: {
  compact?: boolean;
  hero?: boolean;
  className?: string;
}) {
  const widthClass = compact
    ? 'w-[min(78vw,18rem)]'
    : hero
      ? 'w-[min(90vw,30rem)]'
      : 'w-[min(82vw,22rem)]';

  return (
    <img
      src={setuChinaWordmark}
      alt="留澳助手 AU"
      className={`h-auto object-contain drop-shadow-[0_12px_24px_rgba(121,64,7,0.16)] ${widthClass} ${className}`}
      loading="eager"
    />
  );
}

export function SetuChinaGoldBrandPill({
  compact = false,
  hero = false,
  secondary = true,
  className = '',
  title = '留澳助手 AU',
  secondaryText = '智能助手',
}: SetuChinaGoldBrandPillProps) {
  const usesLatinBrandTitle = /[A-Za-z]/.test(title);
  const shellSizeClass = compact
    ? 'px-5 py-3'
    : hero
      ? 'w-[min(88vw,30rem)] px-8 py-5 sm:px-10 sm:py-6'
      : 'px-6 py-4 sm:px-8 sm:py-5';
  const titleSizeClass = compact
    ? 'text-2xl tracking-[0.04em]'
    : hero
      ? usesLatinBrandTitle
        ? 'whitespace-nowrap text-[2.15rem] leading-none tracking-[0.015em] sm:text-[2.75rem]'
        : 'text-[2.65rem] leading-none tracking-[0.025em] sm:text-[3.25rem]'
      : 'text-[2.1rem] tracking-[0.035em] sm:text-[2.8rem]';
  const secondarySizeClass = compact
    ? 'text-[0.7rem] tracking-[0.28em]'
    : hero
      ? 'mt-2 text-sm tracking-[0.42em] sm:text-base'
      : 'text-xs tracking-[0.34em] sm:text-sm';

  return (
    <div
      className={`relative overflow-hidden rounded-[1.75rem] border border-[#F7D476]/80 bg-white/70 shadow-[0_18px_48px_rgba(121,64,7,0.18)] backdrop-blur-md ${shellSizeClass} ${className}`}
      style={{
        background:
          'linear-gradient(145deg, rgba(255,252,232,0.92) 0%, rgba(255,230,151,0.88) 38%, rgba(255,248,221,0.9) 66%, rgba(231,157,49,0.82) 100%)',
      }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-3 top-1 h-1/3 rounded-full opacity-80"
        style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.82), rgba(255,255,255,0))',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            'linear-gradient(115deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.72) 44%, rgba(255,255,255,0) 58%)',
        }}
      />
      <div className="relative text-center">
        <p
          className={`bg-clip-text font-black text-transparent drop-shadow-[0_2px_0_rgba(255,255,255,0.4)] ${titleSizeClass}`}
          style={{
            backgroundImage:
              'linear-gradient(180deg, #FFF6BF 0%, #F7C74F 24%, #8C3F07 56%, #2E1607 72%, #FFD96B 100%)',
          }}
        >
          {title}
        </p>
        {secondary && (
          <p
            className={`mt-1 font-black text-[#8B4A0B] ${secondarySizeClass}`}
          >
            {secondaryText}
          </p>
        )}
      </div>
    </div>
  );
}
