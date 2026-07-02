import hoodieWatermarkUrl from '../../assets/watermark-hoodie.svg';
import type { HoodieShareCardData } from '../../lib/hoodie-share';

export type HoodieShareCardFormat = 'story' | 'feed';

export const HOODIE_SHARE_CARD_SPECS: Record<
  HoodieShareCardFormat,
  {
    width: number;
    height: number;
    contentInsetTop: number;
    contentInsetBottom: number;
    contentPaddingInline: number;
    titleBottomOffset: number;
  }
> = {
  story: {
    width: 1080,
    height: 1920,
    contentInsetTop: 155,
    contentInsetBottom: 155,
    contentPaddingInline: 72,
    titleBottomOffset: 56,
  },
  feed: {
    width: 1080,
    height: 1350,
    contentInsetTop: 135,
    contentInsetBottom: 135,
    contentPaddingInline: 88,
    titleBottomOffset: 52,
  },
};

const HOODIE_SHARE_CARD_WATERMARK_SPECS: Record<
  HoodieShareCardFormat,
  {
    top: number;
    right: number;
    width: number;
  }
> = {
  story: {
    top: 58,
    right: 54,
    width: 108,
  },
  feed: {
    top: 44,
    right: 42,
    width: 92,
  },
};

const CARD_TONES: Record<HoodieShareCardData['tone'], { background: string; overlay: string }> = {
  event: {
    background: 'linear-gradient(180deg, #07111F 0%, #102A43 44%, #0EA5E9 100%)',
    overlay: 'linear-gradient(180deg, rgba(4,11,20,0.06) 0%, rgba(4,11,20,0.14) 38%, rgba(4,11,20,0.68) 74%, rgba(4,11,20,0.9) 100%)',
  },
  plan: {
    background: 'linear-gradient(180deg, #031B16 0%, #0B3B31 44%, #14B8A6 100%)',
    overlay: 'linear-gradient(180deg, rgba(3,11,9,0.06) 0%, rgba(3,11,9,0.14) 38%, rgba(3,11,9,0.68) 74%, rgba(3,11,9,0.9) 100%)',
  },
  guide: {
    background: 'linear-gradient(180deg, #16092F 0%, #3B1E64 44%, #8B5CF6 100%)',
    overlay: 'linear-gradient(180deg, rgba(10,5,20,0.08) 0%, rgba(10,5,20,0.14) 38%, rgba(10,5,20,0.68) 74%, rgba(10,5,20,0.9) 100%)',
  },
  suburb: {
    background: 'linear-gradient(180deg, #0B1021 0%, #1F2A5A 48%, #6D28D9 100%)',
    overlay: 'linear-gradient(180deg, rgba(6,10,18,0.06) 0%, rgba(6,10,18,0.14) 38%, rgba(6,10,18,0.68) 74%, rgba(6,10,18,0.86) 100%)',
  },
  address: {
    background: 'linear-gradient(180deg, #241208 0%, #5B341B 48%, #D97706 100%)',
    overlay: 'linear-gradient(180deg, rgba(14,8,4,0.08) 0%, rgba(14,8,4,0.14) 38%, rgba(14,8,4,0.68) 74%, rgba(14,8,4,0.88) 100%)',
  },
  scam: {
    background: 'linear-gradient(180deg, #22090D 0%, #57131D 48%, #DC2626 100%)',
    overlay: 'linear-gradient(180deg, rgba(12,4,6,0.08) 0%, rgba(12,4,6,0.14) 38%, rgba(12,4,6,0.68) 74%, rgba(12,4,6,0.9) 100%)',
  },
};

function getTitleStyle(title: string, format: HoodieShareCardFormat) {
  const length = title.trim().length;

  if (format === 'story') {
    if (length <= 28) return { fontSize: 104, lineHeight: 0.94, maxWidth: 820 };
    if (length <= 56) return { fontSize: 86, lineHeight: 0.96, maxWidth: 820 };
    return { fontSize: 72, lineHeight: 0.98, maxWidth: 820 };
  }

  if (length <= 28) return { fontSize: 72, lineHeight: 0.94, maxWidth: 760 };
  if (length <= 56) return { fontSize: 62, lineHeight: 0.96, maxWidth: 760 };
  return { fontSize: 54, lineHeight: 0.98, maxWidth: 760 };
}

function getBackgroundCrossOrigin(url?: string) {
  const normalized = String(url || '').trim().toLowerCase();
  if (!normalized || normalized.startsWith('data:') || normalized.startsWith('blob:')) {
    return undefined;
  }
  return 'anonymous';
}

function getEyebrowStyle(format: HoodieShareCardFormat) {
  if (format === 'story') {
    return {
      fontSize: 34,
      letterSpacing: '0.01em',
      marginBottom: 18,
    };
  }

  return {
    fontSize: 28,
    letterSpacing: '0.01em',
    marginBottom: 14,
  };
}

function getInsightCardStyle(format: HoodieShareCardFormat) {
  if (format === 'story') {
    return {
      top: 356,
      width: 428,
      padding: 28,
      badgeFontSize: 20,
      labelFontSize: 18,
      valueFontSize: 56,
      captionFontSize: 22,
    };
  }

  return {
    top: 214,
    width: 386,
    padding: 24,
    badgeFontSize: 17,
    labelFontSize: 16,
    valueFontSize: 46,
    captionFontSize: 20,
  };
}

function getSuburbLayoutStyle(format: HoodieShareCardFormat) {
  if (format === 'story') {
    return {
      badgeTop: 182,
      badgePadding: '10px 18px',
      badgeFontSize: 20,
      dashboardTop: 342,
      dashboardWidth: 546,
      dashboardPadding: 24,
      dashboardGap: 14,
      tileRadius: 22,
      tilePadding: 22,
      tileLabelFontSize: 17,
      tileValueFontSize: 42,
      summaryMarginTop: 24,
      summaryFontSize: 26,
      summaryLineHeight: 1.34,
      summaryMaxWidth: 796,
    };
  }

  return {
    badgeTop: 128,
    badgePadding: '9px 16px',
    badgeFontSize: 17,
    dashboardTop: 192,
    dashboardWidth: 500,
    dashboardPadding: 20,
    dashboardGap: 12,
    tileRadius: 20,
    tilePadding: 18,
    tileLabelFontSize: 14,
    tileValueFontSize: 34,
    summaryMarginTop: 18,
    summaryFontSize: 20,
    summaryLineHeight: 1.34,
    summaryMaxWidth: 700,
  };
}

export function HoodieShareCard({
  data,
  format,
}: {
  data: HoodieShareCardData;
  format: HoodieShareCardFormat;
}) {
  const spec = HOODIE_SHARE_CARD_SPECS[format];
  const tone = CARD_TONES[data.tone];
  const titleStyle = getTitleStyle(data.title, format);
  const eyebrowStyle = getEyebrowStyle(format);
  const insightCardStyle = getInsightCardStyle(format);
  const suburbLayoutStyle = getSuburbLayoutStyle(format);
  const watermarkSpec = HOODIE_SHARE_CARD_WATERMARK_SPECS[format];
  const backgroundPosition = String(data.backgroundPosition || 'center center').trim() || 'center center';
  const photoBackgroundUrl = data.renderStyle === 'photo' && data.backgroundImageUrl
    ? String(data.backgroundImageUrl).trim()
    : '';
  const photoBackgroundCrossOrigin = getBackgroundCrossOrigin(photoBackgroundUrl);
  const showSuburbBackdrop = !photoBackgroundUrl && data.tone === 'suburb';
  const isSuburbCard = data.tone === 'suburb';
  const statTiles = Array.isArray(data.statTiles) ? data.statTiles.filter((tile) => tile?.label || tile?.value).slice(0, 4) : [];
  const hasInsightCard = !isSuburbCard && Boolean(
    data.insightLabel || data.insightValue || data.insightCaption || data.insightBadgeText,
  );
  const overlayBackground = isSuburbCard && photoBackgroundUrl
    ? 'linear-gradient(180deg, rgba(5,8,15,0.14) 0%, rgba(5,8,15,0.22) 22%, rgba(5,8,15,0.48) 54%, rgba(5,8,15,0.82) 100%)'
    : tone.overlay;

  return (
    <div
      style={{
        width: spec.width,
        height: spec.height,
        background: tone.background,
        color: '#FFFFFF',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: '"Helvetica Neue", "Arial", sans-serif',
      }}
    >
      {photoBackgroundUrl ? (
        <img
          src={photoBackgroundUrl}
          alt=""
          aria-hidden="true"
          crossOrigin={photoBackgroundCrossOrigin}
          decoding="sync"
          data-hoodie-share-background-image="true"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: backgroundPosition,
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        />
      ) : null}

      {showSuburbBackdrop ? (
        <>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'radial-gradient(circle at 18% 18%, rgba(45,212,191,0.22) 0%, rgba(45,212,191,0) 34%), radial-gradient(circle at 76% 28%, rgba(129,140,248,0.2) 0%, rgba(129,140,248,0) 30%), radial-gradient(circle at 74% 78%, rgba(251,191,36,0.14) 0%, rgba(251,191,36,0) 28%)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: format === 'story' ? 164 : 120,
              right: format === 'story' ? 146 : 128,
              width: format === 'story' ? 348 : 304,
              height: format === 'story' ? 348 : 304,
              borderRadius: 44,
              border: '1px solid rgba(255,255,255,0.14)',
              transform: 'rotate(14deg)',
              opacity: 0.72,
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: format === 'story' ? 226 : 178,
              right: format === 'story' ? 198 : 176,
              width: format === 'story' ? 208 : 186,
              height: format === 'story' ? 208 : 186,
              borderRadius: '999px',
              border: '1px solid rgba(255,255,255,0.12)',
              opacity: 0.68,
            }}
          />
        </>
      ) : null}

      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: overlayBackground,
        }}
      />

      {isSuburbCard && data.insightBadgeText ? (
        <div
          style={{
            position: 'absolute',
            top: suburbLayoutStyle.badgeTop,
            left: spec.contentPaddingInline,
            display: 'inline-flex',
            alignItems: 'center',
            maxWidth: spec.width - (spec.contentPaddingInline * 2) - watermarkSpec.width - 36,
            borderRadius: 999,
            border: '1px solid rgba(255,255,255,0.24)',
            background: 'rgba(9,14,26,0.32)',
            backdropFilter: 'blur(18px)',
            padding: suburbLayoutStyle.badgePadding,
            fontSize: suburbLayoutStyle.badgeFontSize,
            fontWeight: 700,
            lineHeight: 1.1,
            color: 'rgba(255,255,255,0.96)',
            boxShadow: '0 18px 38px rgba(0,0,0,0.2)',
          }}
        >
          {data.insightBadgeText}
        </div>
      ) : null}

      {isSuburbCard && statTiles.length > 0 ? (
        <div
          style={{
            position: 'absolute',
            top: suburbLayoutStyle.dashboardTop,
            left: spec.contentPaddingInline,
            width: suburbLayoutStyle.dashboardWidth,
            maxWidth: spec.width - (spec.contentPaddingInline * 2),
            padding: suburbLayoutStyle.dashboardPadding,
            borderRadius: 32,
            background: 'linear-gradient(180deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.08) 100%)',
            border: '1px solid rgba(255,255,255,0.18)',
            boxShadow: '0 28px 56px rgba(0,0,0,0.24)',
            backdropFilter: 'blur(22px)',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: suburbLayoutStyle.dashboardGap,
            }}
          >
            {statTiles.map((tile) => (
              <div
                key={`${tile.label}-${tile.value}`}
                style={{
                  borderRadius: suburbLayoutStyle.tileRadius,
                  background: 'rgba(7,11,21,0.24)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  padding: suburbLayoutStyle.tilePadding,
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: suburbLayoutStyle.tileLabelFontSize,
                    lineHeight: 1.15,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    fontWeight: 700,
                    color: 'rgba(226,232,240,0.88)',
                  }}
                >
                  {tile.label}
                </p>
                <p
                  style={{
                    margin: '12px 0 0',
                    fontSize: suburbLayoutStyle.tileValueFontSize,
                    lineHeight: 0.94,
                    letterSpacing: '-0.05em',
                    fontWeight: 800,
                    color: '#FFFFFF',
                    textShadow: '0 12px 30px rgba(0,0,0,0.22)',
                  }}
                >
                  {tile.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {hasInsightCard ? (
        <div
          style={{
            position: 'absolute',
            top: insightCardStyle.top,
            left: spec.contentPaddingInline,
            width: insightCardStyle.width,
            maxWidth: spec.width - (spec.contentPaddingInline * 2),
            padding: insightCardStyle.padding,
            borderRadius: 32,
            background: 'linear-gradient(180deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.08) 100%)',
            border: '1px solid rgba(255,255,255,0.18)',
            boxShadow: '0 24px 52px rgba(0,0,0,0.24)',
          }}
        >
          {data.insightBadgeText ? (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                marginBottom: 18,
                borderRadius: 999,
                border: '1px solid rgba(255,255,255,0.18)',
                background: 'rgba(8,14,28,0.24)',
                padding: '8px 14px',
                fontSize: insightCardStyle.badgeFontSize,
                fontWeight: 700,
                lineHeight: 1,
                color: 'rgba(255,255,255,0.92)',
              }}
            >
              {data.insightBadgeText}
            </div>
          ) : null}
          {data.insightLabel ? (
            <p
              style={{
                margin: 0,
                fontSize: insightCardStyle.labelFontSize,
                lineHeight: 1.1,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                fontWeight: 700,
                color: 'rgba(226,232,240,0.92)',
              }}
            >
              {data.insightLabel}
            </p>
          ) : null}
          {data.insightValue ? (
            <p
              style={{
                margin: '10px 0 0',
                fontSize: insightCardStyle.valueFontSize,
                lineHeight: 0.96,
                letterSpacing: '-0.05em',
                fontWeight: 800,
                color: '#FFFFFF',
                textShadow: '0 14px 38px rgba(0,0,0,0.28)',
              }}
            >
              {data.insightValue}
            </p>
          ) : null}
          {data.insightCaption ? (
            <p
              style={{
                margin: '14px 0 0',
                fontSize: insightCardStyle.captionFontSize,
                lineHeight: 1.25,
                fontWeight: 500,
                color: 'rgba(226,232,240,0.94)',
              }}
            >
              {data.insightCaption}
            </p>
          ) : null}
        </div>
      ) : null}

      <img
        src={hoodieWatermarkUrl}
        alt=""
        aria-hidden="true"
        decoding="sync"
        style={{
          position: 'absolute',
          top: watermarkSpec.top,
          right: watermarkSpec.right,
          width: watermarkSpec.width,
          height: 'auto',
          opacity: 0.96,
          filter: 'drop-shadow(0 10px 24px rgba(0,0,0,0.22))',
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      />

      <div
        style={{
          position: 'absolute',
          inset: `${spec.contentInsetTop}px 0 ${spec.contentInsetBottom}px 0`,
          padding: `0 ${spec.contentPaddingInline}px ${spec.titleBottomOffset}px`,
          display: 'flex',
          alignItems: 'flex-end',
        }}
      >
        <div
          style={{
            maxWidth: isSuburbCard ? suburbLayoutStyle.summaryMaxWidth : titleStyle.maxWidth,
          }}
        >
          {data.eyebrowText ? (
            <p
              style={{
                margin: `0 0 ${eyebrowStyle.marginBottom}px`,
                fontSize: eyebrowStyle.fontSize,
                lineHeight: 1.08,
                letterSpacing: eyebrowStyle.letterSpacing,
                fontWeight: 700,
                color: 'rgba(255,255,255,0.92)',
                textShadow: '0 12px 28px rgba(0,0,0,0.34)',
              }}
            >
              {data.eyebrowText}
            </p>
          ) : null}
          <h1
            style={{
              margin: 0,
              fontSize: titleStyle.fontSize,
              lineHeight: titleStyle.lineHeight,
              letterSpacing: '-0.045em',
              fontWeight: 800,
              overflowWrap: 'anywhere',
              textShadow: '0 14px 38px rgba(0,0,0,0.42)',
            }}
          >
              {data.title}
            </h1>
          {isSuburbCard && data.summaryText ? (
            <p
              style={{
                margin: `${suburbLayoutStyle.summaryMarginTop}px 0 0`,
                maxWidth: suburbLayoutStyle.summaryMaxWidth,
                fontSize: suburbLayoutStyle.summaryFontSize,
                lineHeight: suburbLayoutStyle.summaryLineHeight,
                fontWeight: 500,
                color: 'rgba(226,232,240,0.94)',
                textShadow: '0 12px 28px rgba(0,0,0,0.38)',
              }}
            >
              {data.summaryText}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
