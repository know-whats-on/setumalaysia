import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Shield, AlertTriangle, Clock, ExternalLink, Newspaper, Siren } from 'lucide-react';
import { format } from 'date-fns';
import type { Bulletin } from '../lib/mock-data';
import {
  fetchHciAlerts,
  fetchMalaysianHighCommissionAlerts,
  fetchPoliceFeed,
  type BannerRecord,
  type HciAlertPost,
  type MalaysianHighCommissionPost,
  type PoliceFeedPost,
} from '../lib/api';
import { getPoliceConfigForState } from '../lib/state-police-updates';
import { APP_CONFIG } from '../lib/app-config';
import { getNoticeboardBannerSequence } from '../lib/curated-noticeboard-banners';
import { SETU_CHINA_EMBASSY_NEWS_URL, setuChinaEmbassyAlerts } from '../lib/setu-china-embassy-alerts';

const MALAYSIA_HIGH_COMMISSION_URL = 'https://www.kln.gov.my/web/aus_canberra/news-from-mission';
const EDUCATION_MALAYSIA_AUSTRALIA_BLOG_URL = 'https://www.ema.org.au/blog';

interface NoticeboardProps {
  onBack?: () => void;
  bulletins: Bulletin[];
  banners?: BannerRecord[];
  embedded?: boolean;
}

interface NoticeboardBannerCarouselProps {
  banners?: BannerRecord[];
  className?: string;
  cardClassName?: string;
  imageClassName?: string;
  alt?: string;
  dotActiveClassName?: string;
  dotInactiveClassName?: string;
}

function normalizeBannerUrl(url: string) {
  const raw = String(url || '').trim();
  if (!raw) return raw;

  try {
    const parsed = new URL(raw);
    if (parsed.pathname === '/_next/image') {
      const embedded = parsed.searchParams.get('url');
      if (embedded) return decodeURIComponent(embedded);
    }
  } catch {
    return raw;
  }

  return raw;
}

function normalizeFeedImageUrl(url?: string) {
  const raw = String(url || '').trim();
  if (!raw) return raw;
  return raw.replace(/^http:\/\/(www\.)?afp\.gov\.au\//i, 'https://$1afp.gov.au/');
}

function isInternalAppLink(link?: string) {
  const raw = String(link || '').trim();
  return raw.startsWith('/') && !raw.startsWith('//');
}

export function NoticeboardBannerCarousel({
  banners = [],
  className = 'w-full mt-4 px-4',
  cardClassName = 'overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-sm',
  imageClassName = 'block h-auto w-full bg-white',
  alt = 'Noticeboard Highlight',
  dotActiveClassName = 'w-5 bg-[#1E40AF]',
  dotInactiveClassName = 'w-2 bg-[#CBD5E1]',
}: NoticeboardBannerCarouselProps) {
  const navigate = useNavigate();
  const [readyBanners, setReadyBanners] = useState<Array<{ id: string; url: string; link?: string }>>([]);
  const [activeBanner, setActiveBanner] = useState(0);
  const currentBanner = useMemo(() => readyBanners[activeBanner] ?? null, [readyBanners, activeBanner]);
  const noticeboardBanners = useMemo(
    () => getNoticeboardBannerSequence(banners),
    [banners],
  );

  useEffect(() => {
    let cancelled = false;

    if (noticeboardBanners.length === 0) {
      setReadyBanners([]);
      return;
    }

    Promise.all(
      noticeboardBanners.map(
        (banner) =>
          new Promise<{ id: string; url: string; link?: string } | null>((resolve) => {
            const img = new Image();
            img.onload = () => resolve(banner);
            img.onerror = () => resolve(null);
            img.src = normalizeBannerUrl(banner.url);
          }),
      ),
    ).then((results) => {
      if (cancelled) return;
      const valid = results.filter((banner): banner is { id: string; url: string; link?: string } => Boolean(banner));
      setReadyBanners(valid);
      setActiveBanner(0);
    });

    return () => {
      cancelled = true;
    };
  }, [noticeboardBanners]);

  useEffect(() => {
    if (readyBanners.length <= 1) return;
    const interval = window.setInterval(() => {
      setActiveBanner((current) => (current + 1) % readyBanners.length);
    }, 4000);
    return () => window.clearInterval(interval);
  }, [readyBanners.length]);

  if (!currentBanner) return null;

  return (
    <div className={className}>
      <div className={cardClassName}>
        {currentBanner.link ? (
          isInternalAppLink(currentBanner.link) ? (
            <button
              type="button"
              onClick={() => navigate(currentBanner.link || '/')}
              className="block w-full cursor-pointer text-left"
            >
              <img src={normalizeBannerUrl(currentBanner.url)} alt={alt} className={imageClassName} />
            </button>
          ) : (
            <a href={currentBanner.link} target="_blank" rel="noopener noreferrer" className="block">
              <img src={normalizeBannerUrl(currentBanner.url)} alt={alt} className={imageClassName} />
            </a>
          )
        ) : (
          <img src={normalizeBannerUrl(currentBanner.url)} alt={alt} className={imageClassName} />
        )}
      </div>
      {readyBanners.length > 1 && (
        <div className="mt-3 flex items-center justify-center gap-2">
          {readyBanners.map((banner, index) => (
            <button
              key={banner.id}
              type="button"
              aria-label={`Show banner ${index + 1}`}
              onClick={() => setActiveBanner(index)}
              className={`h-2 rounded-full transition-all ${index === activeBanner ? dotActiveClassName : dotInactiveClassName}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function Noticeboard({ onBack, bulletins, banners = [], embedded = false }: NoticeboardProps) {
  const isSetuChina = APP_CONFIG.variant === 'setu_china';
  const isJomSettle = APP_CONFIG.variant === 'jom_settle';
  const [feedPosts, setFeedPosts] = useState<PoliceFeedPost[]>([]);
  const [hciAlerts, setHciAlerts] = useState<HciAlertPost[]>([]);
  const [malaysianHighCommissionPosts, setMalaysianHighCommissionPosts] = useState<MalaysianHighCommissionPost[]>([]);
  const [visibleHciAlertCount, setVisibleHciAlertCount] = useState(5);
  const [visibleMalaysianHighCommissionCount, setVisibleMalaysianHighCommissionCount] = useState(5);
  const [visibleFeedCount, setVisibleFeedCount] = useState(10);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedFailed, setFeedFailed] = useState(false);
  const [hciLoading, setHciLoading] = useState(false);
  const [hciFailed, setHciFailed] = useState(false);
  const [malaysianHighCommissionLoading, setMalaysianHighCommissionLoading] = useState(false);
  const [malaysianHighCommissionFailed, setMalaysianHighCommissionFailed] = useState(false);

  const afpConfig = useMemo(() => getPoliceConfigForState('AUS'), []);
  const feedActionPills = useMemo(
    () => (afpConfig?.channels ?? []).filter((channel) => channel.id !== 'x-feed'),
    [afpConfig],
  );
  const visibleFeedPosts = useMemo(() => feedPosts.slice(0, visibleFeedCount), [feedPosts, visibleFeedCount]);
  const visibleHciAlerts = useMemo(() => hciAlerts.slice(0, visibleHciAlertCount), [hciAlerts, visibleHciAlertCount]);
  const visibleMalaysianHighCommissionPosts = useMemo(
    () => malaysianHighCommissionPosts.slice(0, visibleMalaysianHighCommissionCount),
    [malaysianHighCommissionPosts, visibleMalaysianHighCommissionCount],
  );
  const showVibeHciAlerts = APP_CONFIG.showVibeHciAlerts;
  const malaysiaOfficialSource = useMemo(() => {
    const sourceText = malaysianHighCommissionPosts.map((post) => post.source).join(' ').toLowerCase();
    const usesEducationMalaysiaAustralia =
      sourceText.includes('education malaysia') || sourceText.includes('emaustralia') || sourceText.includes('ema australia');
    return usesEducationMalaysiaAustralia
      ? {
          eyebrow: 'EMA Blog',
          title: 'Education Malaysia Australia',
          body: 'Official Education Malaysia Australia updates for Malaysian students.',
          url: EDUCATION_MALAYSIA_AUSTRALIA_BLOG_URL,
          actionLabel: 'EMA',
          unavailableLabel: 'Open EMA Blog',
        }
      : {
          eyebrow: 'News From Mission',
          title: 'High Commission of Malaysia, Canberra',
          body: 'Official updates from the Malaysian mission in Canberra.',
          url: MALAYSIA_HIGH_COMMISSION_URL,
          actionLabel: 'KLN',
          unavailableLabel: 'Open KLN News From Mission',
        };
  }, [malaysianHighCommissionPosts]);

  const formatFeedDate = (publishedAt: string) => {
    const value = String(publishedAt || '').trim();
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
  };

  useEffect(() => {
    if (!showVibeHciAlerts) {
      setHciAlerts([]);
      setVisibleHciAlertCount(5);
      setHciLoading(false);
      setHciFailed(false);
      return;
    }

    let cancelled = false;
    setHciLoading(true);
    setHciFailed(false);

    void fetchHciAlerts()
      .then((alerts) => {
        if (cancelled) return;
        setHciAlerts(alerts);
        setVisibleHciAlertCount(5);
      })
      .catch((err) => {
        console.error('GHAR HCI alerts fetch failed:', err);
        if (cancelled) return;
        setHciAlerts([]);
        setHciFailed(true);
      })
      .finally(() => {
        if (cancelled) return;
        setHciLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [showVibeHciAlerts]);

  useEffect(() => {
    if (!isJomSettle) {
      setMalaysianHighCommissionPosts([]);
      setVisibleMalaysianHighCommissionCount(5);
      setMalaysianHighCommissionLoading(false);
      setMalaysianHighCommissionFailed(false);
      return;
    }

    let cancelled = false;
    setMalaysianHighCommissionLoading(true);
    setMalaysianHighCommissionFailed(false);

    void fetchMalaysianHighCommissionAlerts()
      .then((posts) => {
        if (cancelled) return;
        setMalaysianHighCommissionPosts(posts);
        setVisibleMalaysianHighCommissionCount(5);
      })
      .catch((err) => {
        console.error('GHAR Malaysian High Commission alerts fetch failed:', err);
        if (cancelled) return;
        setMalaysianHighCommissionPosts([]);
        setMalaysianHighCommissionFailed(true);
      })
      .finally(() => {
        if (cancelled) return;
        setMalaysianHighCommissionLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isJomSettle]);

  useEffect(() => {
    let cancelled = false;
    setFeedLoading(true);
    setFeedFailed(false);

    void fetchPoliceFeed(afpConfig?.accountHandle || 'afpnews')
      .then((posts) => {
        if (cancelled) return;
        setFeedPosts(posts);
        setVisibleFeedCount(10);
      })
      .catch((err) => {
        console.error('GHAR AFP feed fetch failed:', err);
        if (cancelled) return;
        setFeedPosts([]);
        setFeedFailed(true);
      })
      .finally(() => {
        if (cancelled) return;
        setFeedLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [afpConfig?.accountHandle]);

  return (
    <div className="size-full bg-white flex flex-col" style={{ fontFamily: 'Inter, sans-serif' }}>
      {!embedded && (
        <div className="border-b border-[#E2E8F0] px-4 py-3 native-safe-area-top flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-2 text-[#64748B] hover:text-[#0F172A] transition-colors cursor-pointer">
            <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
            <span className="text-xs tracking-wide font-medium">Back</span>
          </button>
          <span className="text-xs tracking-wide text-[#64748B] font-medium">Noticeboard</span>
          <div className="w-16" />
        </div>
      )}

      <div className={`min-w-0 flex-1 overflow-y-auto ${isSetuChina ? 'pb-[calc(var(--native-safe-area-bottom)+1rem)]' : 'pb-6'}`}>
        <NoticeboardBannerCarousel banners={banners} />

        {showVibeHciAlerts ? (
          <div className="mx-4 mt-4 bg-[#1E40AF] px-4 py-4 rounded-2xl flex items-center gap-3 shadow-lg shadow-[#1E40AF]/20">
            <div className="w-12 h-12 border-2 border-[#D4AF37] rounded-xl flex items-center justify-center flex-shrink-0">
              <Shield className="w-6 h-6 text-[#D4AF37]" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-[10px] tracking-wide uppercase text-[#D4AF37] font-medium">Official Channel</p>
              <p className="text-white text-sm font-bold">
                {isSetuChina ? '官方安全公告' : 'Indian High Commission Bulletins'}
              </p>
              <p className="text-[#93C5FD] text-xs font-normal">
                {isSetuChina ? 'Verified student safety updates' : 'Verified communications for student safety'}
              </p>
            </div>
          </div>
        ) : !isJomSettle ? (
          <div className="mx-4 mt-4 flex items-center gap-3 rounded-2xl bg-[#0F172A] px-4 py-4 shadow-lg shadow-[#0F172A]/20">
            <div className="w-12 h-12 rounded-xl border border-white/15 bg-white/10 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-6 h-6 text-white" strokeWidth={1.5} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] tracking-wide uppercase text-[#93C5FD] font-medium">
                {isSetuChina ? 'Safety Alerts 安全提醒' : 'Arrival Alerts'}
              </p>
              <p className="break-words text-sm font-bold text-white [overflow-wrap:anywhere]">
                {isSetuChina ? '官方公告、社区和安全更新' : 'Community, police, and safety updates'}
              </p>
              <p className="break-words text-xs font-normal text-slate-300 [overflow-wrap:anywhere]">
                {isSetuChina ? '租房、诈骗、交通和本地公告会显示在这里。' : 'Keep an eye on suburb alerts while you settle in.'}
              </p>
            </div>
          </div>
        ) : null}

        {isSetuChina ? (
          <section className="mx-4 mt-4 rounded-2xl border border-[#FBD4CE] bg-[#FFF8F7] p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#F04444]">
                  Embassy updates 使馆动态
                </p>
                <h3 className="mt-1 break-words text-base font-bold leading-snug text-[#0F172A] [overflow-wrap:anywhere]">
                  中国驻澳使馆动态
                </h3>
                <p className="mt-1 break-words text-xs leading-5 text-[#64748B] [overflow-wrap:anywhere]">
                  官方动态来自中国驻澳大利亚使馆官网。紧急情况请优先联系 000、本地警方或学校支持团队。
                </p>
              </div>
              <a
                href={SETU_CHINA_EMBASSY_NEWS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 rounded-full border border-[#FBD4CE] bg-white px-3 py-1.5 text-[10px] font-bold text-[#F04444]"
              >
                官网
              </a>
            </div>

            <div className="mt-4 space-y-2">
              {setuChinaEmbassyAlerts.map((alert) => (
                <a
                  key={alert.id}
                  href={alert.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-xl border border-[#FBD4CE] bg-white px-3 py-3 transition hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#F04444]">{alert.date}</p>
                      <h4 className="mt-1 break-words text-sm font-bold leading-snug text-[#111827] [overflow-wrap:anywhere]">
                        {alert.zhTitle}
                      </h4>
                      <p className="mt-1 break-words text-xs font-medium leading-5 text-[#64748B] [overflow-wrap:anywhere]">
                        {alert.title}
                      </p>
                      <p className="mt-1 break-words text-xs leading-5 text-[#64748B] [overflow-wrap:anywhere]">
                        {alert.summary}
                      </p>
                    </div>
                    <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-[#F04444]" strokeWidth={1.8} />
                  </div>
                </a>
              ))}
            </div>
          </section>
        ) : null}

        {showVibeHciAlerts && (
          <div className="px-4 py-4 space-y-3">
          {hciLoading && (
            <div className="rounded-xl border border-[#E2E8F0] bg-white px-4 py-5 text-sm text-[#64748B] font-normal">
              {isSetuChina ? '正在加载安全提醒...' : 'Loading Indian High Commission alerts...'}
            </div>
          )}

          {!hciLoading && visibleHciAlerts.map((alert) => (
            <a
              key={alert.id}
              href={alert.link}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-xl border border-[#E2E8F0] bg-white p-4 transition-all hover:shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] tracking-wide uppercase text-[#1E40AF] font-semibold">
                    {isSetuChina ? 'Official Update' : 'Indian High Commission'}
                  </p>
                  <h3 className="mt-1 text-sm text-[#0F172A] font-bold leading-snug">{alert.title}</h3>
                </div>
                <ExternalLink className="w-4 h-4 text-[#94A3B8] shrink-0 mt-0.5" strokeWidth={1.8} />
              </div>
            </a>
          ))}

          {!hciLoading && hciAlerts.length > visibleHciAlertCount && (
            <button
              type="button"
              onClick={() => setVisibleHciAlertCount((count) => count + 5)}
              className="w-full rounded-xl border border-[#DBEAFE] bg-white px-4 py-3 text-sm font-semibold text-[#1D4ED8] transition-colors hover:bg-[#EEF4FF]"
            >
              Show more
            </button>
          )}

          {!hciLoading && (hciFailed || hciAlerts.length === 0) && (
            <div className="rounded-xl border border-[#E2E8F0] bg-white px-4 py-5 text-sm text-[#64748B] font-normal">
              High Commission bulletins are unavailable right now.
            </div>
          )}
          </div>
        )}

        {isJomSettle && (
          <section className="mx-4 mt-4 rounded-2xl border border-[#F5D1CB] bg-[#FFF7F5] p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#E53935]">
                  {malaysiaOfficialSource.eyebrow}
                </p>
                <h3 className="mt-1 break-words text-base font-black leading-snug text-[#0F172A] [overflow-wrap:anywhere]">
                  {malaysiaOfficialSource.title}
                </h3>
                <p className="mt-1 break-words text-xs font-semibold leading-5 text-[#64748B] [overflow-wrap:anywhere]">
                  {malaysiaOfficialSource.body}
                </p>
              </div>
              <a
                href={malaysiaOfficialSource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[#F5D1CB] bg-white px-3 py-1.5 text-[10px] font-black text-[#E53935]"
              >
                {malaysiaOfficialSource.actionLabel}
                <ExternalLink className="h-3 w-3" strokeWidth={1.8} />
              </a>
            </div>

            <div className="mt-4 space-y-2">
              {malaysianHighCommissionLoading && (
                <div className="rounded-xl border border-[#F5D1CB] bg-white px-4 py-5 text-sm font-semibold text-[#64748B]">
                  Loading Malaysian High Commission updates...
                </div>
              )}

              {!malaysianHighCommissionLoading && visibleMalaysianHighCommissionPosts.map((post) => (
                <a
                  key={post.id}
                  href={post.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-xl border border-[#F5D1CB] bg-white px-3 py-3 transition hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      {formatFeedDate(post.published_at) ? (
                        <p className="text-[10px] font-black uppercase tracking-wide text-[#E53935]">
                          {formatFeedDate(post.published_at)}
                        </p>
                      ) : null}
                      <h4 className="mt-1 break-words text-sm font-black leading-snug text-[#111827] [overflow-wrap:anywhere]">
                        {post.title}
                      </h4>
                      {post.summary ? (
                        <p className="mt-1 line-clamp-2 break-words text-xs font-semibold leading-5 text-[#64748B] [overflow-wrap:anywhere]">
                          {post.summary}
                        </p>
                      ) : null}
                    </div>
                    <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-[#E53935]" strokeWidth={1.8} />
                  </div>
                </a>
              ))}

              {!malaysianHighCommissionLoading && malaysianHighCommissionPosts.length > visibleMalaysianHighCommissionCount && (
                <button
                  type="button"
                  onClick={() => setVisibleMalaysianHighCommissionCount((count) => count + 5)}
                  className="w-full rounded-xl border border-[#F5D1CB] bg-white px-4 py-3 text-sm font-black text-[#E53935] transition-colors hover:bg-[#FFF7F5]"
                >
                  Show more
                </button>
              )}

              {!malaysianHighCommissionLoading && (malaysianHighCommissionFailed || malaysianHighCommissionPosts.length === 0) && (
                <div className="rounded-xl border border-[#F5D1CB] bg-white px-4 py-5 text-sm font-semibold text-[#64748B]">
                  Malaysian High Commission updates are unavailable right now.
                  <a
                    href={malaysiaOfficialSource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-xs font-black text-[#E53935]"
                  >
                    {malaysiaOfficialSource.unavailableLabel}
                    <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.8} />
                  </a>
                </div>
              )}
            </div>
          </section>
        )}

        {afpConfig && (
          <div className="mx-4 mt-4 rounded-2xl border border-[#DBEAFE] bg-[#F8FBFF] shadow-sm overflow-hidden">
            <div className="flex items-start justify-between gap-3 px-4 pb-3 pt-4">
              <div className="min-w-0">
                <p className="text-[10px] tracking-wide uppercase text-[#1D4ED8] font-semibold">AFP News Centre</p>
                <h3 className="mt-1 break-words text-sm font-bold text-[#0F172A] [overflow-wrap:anywhere]">Australian Federal Police</h3>
                <p className="mt-1 break-words text-xs font-normal text-[#64748B] [overflow-wrap:anywhere]">
                  National investigations, scam alerts, and federal crime updates from the AFP.
                </p>
              </div>
              <a
                href={afpConfig.accountUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 rounded-full bg-white border border-[#DBEAFE] px-3 py-1.5 text-[10px] font-semibold text-[#1D4ED8] flex items-center gap-1.5"
              >
                <Newspaper className="w-3.5 h-3.5" strokeWidth={1.8} />
                AFP
              </a>
            </div>

            <div className="px-4 pb-4">
              {feedActionPills.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {feedActionPills.map((channel) => (
                    <a
                      key={channel.id}
                      href={channel.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full bg-white border border-[#DBEAFE] px-3 py-1.5 text-[10px] font-semibold text-[#1D4ED8]"
                    >
                      {channel.id === 'news' ? (
                        <Newspaper className="w-3.5 h-3.5" strokeWidth={1.8} />
                      ) : (
                        <Siren className="w-3.5 h-3.5" strokeWidth={1.8} />
                      )}
                      {channel.label}
                      <ExternalLink className="w-3 h-3" strokeWidth={1.8} />
                    </a>
                  ))}
                </div>
              )}

              <div className="space-y-4">
                {feedLoading && (
                  <div className="rounded-2xl bg-white border border-[#E2E8F0] px-4 py-6 text-xs text-[#64748B] font-normal shadow-sm">
                    Loading AFP updates...
                  </div>
                )}

                {!feedLoading &&
                  visibleFeedPosts.map((post) => (
                    <a
                      key={post.id}
                      href={post.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-sm transition-transform hover:-translate-y-0.5"
                    >
                      {post.image_url && (
                        <img src={normalizeFeedImageUrl(post.image_url)} alt={post.title || 'AFP update'} className="block w-full h-auto bg-[#F8FAFC]" />
                      )}
                      <div className="px-4 py-4">
                        <div className="flex items-start justify-between gap-3">
                          <h4 className="min-w-0 break-words text-sm font-bold leading-snug text-[#0F172A] [overflow-wrap:anywhere]">{post.title}</h4>
                          {formatFeedDate(post.published_at) && (
                            <span className="shrink-0 rounded-full bg-[#F8FBFF] px-2.5 py-1 text-[10px] font-semibold text-[#64748B]">
                              {formatFeedDate(post.published_at)}
                            </span>
                          )}
                        </div>
                        <p className="mt-2 text-[9px] leading-relaxed text-[#94A3B8] font-normal">
                          &copy; Commonwealth of Australia 2024.
                        </p>
                      </div>
                    </a>
                  ))}

                {!feedLoading && feedPosts.length > visibleFeedCount && (
                  <button
                    type="button"
                    onClick={() => setVisibleFeedCount((count) => count + 10)}
                    className="w-full rounded-xl border border-[#DBEAFE] bg-white px-4 py-3 text-sm font-semibold text-[#1D4ED8] transition-colors hover:bg-[#EEF4FF]"
                  >
                    Show more
                  </button>
                )}

                {!feedLoading && (feedFailed || feedPosts.length === 0) && (
                  <div className="rounded-2xl bg-white border border-[#E2E8F0] p-4 shadow-sm">
                    <p className="text-sm text-[#0F172A] font-semibold">AFP feed unavailable right now.</p>
                    <p className="mt-1 text-xs text-[#64748B] font-normal">Open the AFP News Centre for the latest updates.</p>
                    <a
                      href={afpConfig.accountUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-1.5 text-xs text-[#1D4ED8] font-semibold"
                    >
                      Open AFP News Centre
                      <ExternalLink className="w-3.5 h-3.5" strokeWidth={1.8} />
                    </a>
                  </div>
                )}

                {!feedLoading && feedPosts.length > 0 && (
                  <p className="px-1 text-[10px] leading-relaxed text-[#94A3B8] font-normal">
                    Material obtained from this website is to be attributed to the AFP as:
                    {' '}
                    &copy; Commonwealth of Australia 2024.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {!isJomSettle && bulletins.length > 0 && (
          <div className="px-4 py-4 space-y-3">
            {bulletins.map((bulletin) => (
            <div
              key={bulletin.id}
              className={`border p-4 rounded-xl transition-all ${
                bulletin.is_urgent ? 'border-[#B91C1C] bg-[#FEF2F2] shadow-sm' : 'border-[#E2E8F0] bg-white hover:shadow-sm'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {bulletin.is_urgent && (
                    <span className="bg-[#B91C1C] text-white text-[9px] tracking-wide uppercase px-2.5 py-1 rounded-md flex items-center gap-1 font-medium">
                      <AlertTriangle className="w-3 h-3" strokeWidth={2} />
                      {isSetuChina ? '紧急' : 'Urgent'}
                    </span>
                  )}
                  <span className="text-[9px] tracking-wide uppercase text-[#94A3B8] font-medium">
                    {bulletin.postcode_target === 'ALL'
                      ? isSetuChina ? '全国' : 'National'
                      : `${isSetuChina ? '邮编' : 'Postcode'} ${bulletin.postcode_target}`}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[#94A3B8]">
                  <Clock className="w-3 h-3" strokeWidth={1.5} />
                  <span className="text-[9px] tracking-wide font-medium">{format(new Date(bulletin.created_at), 'dd MMM')}</span>
                </div>
              </div>
                  <h3 className="mb-2 break-words text-sm font-bold text-[#0F172A] [overflow-wrap:anywhere]">{bulletin.title}</h3>
                  <p className="break-words text-xs font-normal leading-relaxed text-[#64748B] [overflow-wrap:anywhere]">{bulletin.body}</p>
            </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
