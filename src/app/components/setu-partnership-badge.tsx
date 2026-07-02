import SetuLogo from '../../imports/Group1142813808-26-3730';

interface SetuPartnershipBadgeProps {
  /** Max width in pixels for the badge container */
  maxWidth?: number;
  className?: string;
}

/**
 * Renders the SETU × High Commission of India partnership badge.
 * The imported Figma SVG is 1444×714px; we scale it into a responsive container.
 */
export function SetuPartnershipBadge({ maxWidth = 280, className = '' }: SetuPartnershipBadgeProps) {
  // Original design dimensions
  const originalW = 1444;
  const originalH = 714;
  const aspectRatio = originalH / originalW;

  return (
    <div
      className={`relative ${className}`}
      style={{
        width: '100%',
        maxWidth: `${maxWidth}px`,
        aspectRatio: `${originalW} / ${originalH}`,
      }}
    >
      <div
        className="absolute top-0 left-0 origin-top-left"
        style={{
          width: `${originalW}px`,
          height: `${originalH}px`,
          transform: `scale(var(--setu-scale, ${maxWidth / originalW}))`,
        }}
      >
        <SetuLogo />
      </div>
      {/* Invisible spacer to maintain container height */}
      <div style={{ paddingBottom: `${aspectRatio * 100}%` }} />
    </div>
  );
}