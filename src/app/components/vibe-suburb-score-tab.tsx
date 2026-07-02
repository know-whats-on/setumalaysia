import { useEffect, useMemo, useState } from 'react';
import { Search, MapPin, ArrowLeft, Filter, X, GraduationCap, Utensils, Users, Building } from 'lucide-react';
import { VibePanel } from './vibe-panel';
import { suburbDemographics } from '../lib/demographics-data';
import { universitySuburbs } from '../lib/au-universities';
import { useSuburbFilter } from '../hooks/useSuburbFilter';
import { HoodieShareActions } from './share/hoodie-share-actions';
import { CustomDropdown } from './ui/custom-dropdown';
import { APP_CONFIG } from '../lib/app-config';
import { buildSuburbSnapshotShareDescriptor, slugifyHoodieShareText } from '../lib/hoodie-share';
import { fetchSuburbShareEnrichment } from '../lib/api';
import { resolveHoodieShareBackgroundImage } from '../lib/hoodie-share-media';
import { lookupCrimeForSuburb } from '../lib/suburb-crime-map';
import {
  buildSuburbShareEnrichmentRequest,
  type SuburbShareEnrichmentResponse,
} from '../lib/suburb-share-enrichment';

function getBadgeIcon(badge: string) {
  if (badge.includes('Student Hub')) return <GraduationCap className="w-3.5 h-3.5" strokeWidth={1.5} />;
  if (badge.includes('Cultural Infrastructure')) return <Utensils className="w-3.5 h-3.5" strokeWidth={1.5} />;
  if (badge.includes('Campus Vibe')) return <Users className="w-3.5 h-3.5" strokeWidth={1.5} />;
  return <Building className="w-3.5 h-3.5" strokeWidth={1.5} />;
}

function getChinaBadgeLabel(badge: string) {
  if (badge.includes('Student Hub')) return '学生区';
  if (badge.includes('Cultural Infrastructure')) return '生活设施完善';
  if (badge.includes('Campus Vibe')) return '校园氛围活跃';
  if (badge.includes('Quiet Residential')) return '安静住宅区';
  return badge;
}

function getChinaScoreLabel(score: string) {
  if (score === 'High') return '高匹配';
  if (score === 'Medium') return '中等匹配';
  if (score === 'Low') return '低匹配';
  return score;
}

type SuburbShareEnrichmentState =
  | { status: 'idle' | 'loading' | 'failed' }
  | { status: 'ready'; data: SuburbShareEnrichmentResponse };

type SuburbShareInstagramAssetState =
  | { status: 'idle' | 'loading' }
  | { status: 'ready'; preparedBackgroundImageUrl?: string };

const suburbShareEnrichmentCache = new Map<
  string,
  | { status: 'ready'; data: SuburbShareEnrichmentResponse }
  | { status: 'failed' }
>();
const suburbShareEnrichmentPending = new Map<string, Promise<SuburbShareEnrichmentResponse>>();
const suburbShareInstagramAssetCache = new Map<string, { preparedBackgroundImageUrl?: string }>();
const suburbShareInstagramAssetPending = new Map<string, Promise<{ preparedBackgroundImageUrl?: string }>>();

function buildSuburbShareEnrichmentCacheKey(suburb: string, state: string) {
  return `${slugifyHoodieShareText(suburb)}:${String(state || '').trim().toUpperCase()}`;
}

function buildSuburbShareInstagramAssetCacheKey(suburb: string, state: string, backgroundImageUrl?: string) {
  return [
    slugifyHoodieShareText(suburb),
    String(state || '').trim().toUpperCase(),
    String(backgroundImageUrl || '').trim() || 'brand',
  ].join(':');
}

export function VibeSuburbScoreTab({
  selectedSuburbParam,
  onSuburbChange,
  embedded = false,
}: {
  selectedSuburbParam?: string;
  onSuburbChange?: (suburbSlug: string | null) => void;
  embedded?: boolean;
}) {
  const isSetuChina = APP_CONFIG.variant === 'setu_china';
  const usesStudentHubNavClearance = isSetuChina || APP_CONFIG.variant === 'jom_settle';
  const [selectedSuburb, setSelectedSuburb] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const {
    searchQuery, setSearchQuery,
    selectedUni, setSelectedUni,
    selectedBadge, setSelectedBadge,
    selectedScore, setSelectedScore,
    selectedState, setSelectedState,
    availableStates,
    filteredSuburbs,
  } = useSuburbFilter(suburbDemographics, universitySuburbs);

  const hasActiveFilters =
    selectedUni !== 'All' || selectedScore !== 'All' || selectedBadge !== 'All' || selectedState !== 'All';
  const shareEnabled = Boolean(APP_CONFIG.shareBaseUrl);
  const [shareEnrichmentState, setShareEnrichmentState] = useState<SuburbShareEnrichmentState>({ status: 'idle' });
  const [instagramAssetState, setInstagramAssetState] = useState<SuburbShareInstagramAssetState>({ status: 'idle' });
  const selectedShareData =
    filteredSuburbs.find((suburb) => slugifyHoodieShareText(suburb.suburb) === slugifyHoodieShareText(selectedSuburb || '')) || null;
  const selectedCrimeResult = useMemo(
    () => (selectedShareData ? lookupCrimeForSuburb(selectedShareData.suburb, selectedShareData.state) : null),
    [selectedShareData],
  );
  const selectedShareRequest = useMemo(
    () => (selectedShareData
      ? buildSuburbShareEnrichmentRequest({
          suburb: selectedShareData.suburb,
          state: selectedShareData.state,
          totalStudents: selectedShareData.totalStudents,
          vibeBadge: selectedShareData.badge,
          crimeResult: selectedCrimeResult,
        })
      : null),
    [selectedCrimeResult, selectedShareData],
  );
  const preparedInstagramBackgroundImageUrl =
    instagramAssetState.status === 'ready'
      ? instagramAssetState.preparedBackgroundImageUrl
      : shareEnrichmentState.status === 'ready'
        ? shareEnrichmentState.data.hostedBackgroundImageUrl
        : undefined;
  const selectedShareDescriptor = useMemo(
    () => (selectedShareData
      ? buildSuburbSnapshotShareDescriptor({
          suburb: selectedShareData.suburb,
          state: selectedShareData.state,
          totalStudents: selectedShareData.totalStudents,
          badge: selectedShareData.badge,
          crimeScore: selectedShareRequest?.crimeScore,
          personalSafetyScore: selectedShareRequest?.personalSafetyScore,
          propertyCrimeScore: selectedShareRequest?.propertyCrimeScore,
          crimeBand: selectedShareRequest?.crimeBand,
          summaryText: shareEnrichmentState.status === 'ready' ? shareEnrichmentState.data.summary : undefined,
          backgroundImageUrl: preparedInstagramBackgroundImageUrl,
        })
      : null),
    [preparedInstagramBackgroundImageUrl, selectedShareData, selectedShareRequest, shareEnrichmentState],
  );
  const instagramSharePreparing =
    shareEnrichmentState.status === 'idle' ||
    shareEnrichmentState.status === 'loading' ||
    instagramAssetState.status === 'loading';

  useEffect(() => {
    const normalizedSelected = slugifyHoodieShareText(selectedSuburbParam || '');
    if (!normalizedSelected) {
      setSelectedSuburb(null);
      setShareEnrichmentState({ status: 'idle' });
      setInstagramAssetState({ status: 'idle' });
      return;
    }

    const match = suburbDemographics.find((suburb) => slugifyHoodieShareText(suburb.suburb) === normalizedSelected);
    setShareEnrichmentState({ status: 'idle' });
    setInstagramAssetState({ status: 'idle' });
    setSelectedSuburb(match?.suburb || null);
  }, [selectedSuburbParam]);

  useEffect(() => {
    if (!shareEnabled || !selectedShareData || !selectedShareRequest) {
      setShareEnrichmentState({ status: 'idle' });
      setInstagramAssetState({ status: 'idle' });
      return;
    }

    const cacheKey = buildSuburbShareEnrichmentCacheKey(selectedShareData.suburb, selectedShareData.state);
    const cached = suburbShareEnrichmentCache.get(cacheKey);
    if (cached?.status === 'ready') {
      setShareEnrichmentState({ status: 'ready', data: cached.data });
      return;
    }
    if (cached?.status === 'failed') {
      setShareEnrichmentState({ status: 'failed' });
      return;
    }

    setShareEnrichmentState({ status: 'loading' });
    let cancelled = false;

    let pendingRequest = suburbShareEnrichmentPending.get(cacheKey);
    if (!pendingRequest) {
      pendingRequest = fetchSuburbShareEnrichment(selectedShareRequest)
        .then((response) => {
          suburbShareEnrichmentCache.set(cacheKey, { status: 'ready', data: response });
          return response;
        })
        .catch((error) => {
          suburbShareEnrichmentCache.set(cacheKey, { status: 'failed' });
          throw error;
        })
        .finally(() => {
          suburbShareEnrichmentPending.delete(cacheKey);
        });
      suburbShareEnrichmentPending.set(cacheKey, pendingRequest);
    }

    pendingRequest
      .then((response) => {
        if (!cancelled) {
          setShareEnrichmentState({ status: 'ready', data: response });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setShareEnrichmentState({ status: 'failed' });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [shareEnabled, selectedShareData, selectedShareRequest]);

  useEffect(() => {
    if (!shareEnabled || !selectedShareData) {
      setInstagramAssetState({ status: 'idle' });
      return;
    }

    if (shareEnrichmentState.status === 'loading' || shareEnrichmentState.status === 'idle') {
      setInstagramAssetState({ status: 'idle' });
      return;
    }

    const hostedBackgroundImageUrl =
      shareEnrichmentState.status === 'ready' ? shareEnrichmentState.data.hostedBackgroundImageUrl : undefined;
    const cacheKey = buildSuburbShareInstagramAssetCacheKey(
      selectedShareData.suburb,
      selectedShareData.state,
      hostedBackgroundImageUrl,
    );
    const cached = suburbShareInstagramAssetCache.get(cacheKey);
    if (cached) {
      setInstagramAssetState({ status: 'ready', preparedBackgroundImageUrl: cached.preparedBackgroundImageUrl });
      return;
    }

    if (!hostedBackgroundImageUrl) {
      const fallbackAsset = { preparedBackgroundImageUrl: undefined };
      suburbShareInstagramAssetCache.set(cacheKey, fallbackAsset);
      setInstagramAssetState({ status: 'ready', preparedBackgroundImageUrl: undefined });
      return;
    }

    setInstagramAssetState({ status: 'loading' });
    let cancelled = false;

    let pendingAsset = suburbShareInstagramAssetPending.get(cacheKey);
    if (!pendingAsset) {
      pendingAsset = (async () => {
        const resolvedBackground = await resolveHoodieShareBackgroundImage(hostedBackgroundImageUrl);
        try {
          return {
            preparedBackgroundImageUrl: resolvedBackground.resolvedUrl || undefined,
          };
        } finally {
          resolvedBackground.revoke();
        }
      })()
        .catch((error) => {
          console.warn('Hoodie suburb share image preloading fell back to the branded card:', error);
          return { preparedBackgroundImageUrl: undefined };
        })
        .then((preparedAsset) => {
          suburbShareInstagramAssetCache.set(cacheKey, preparedAsset);
          return preparedAsset;
        })
        .finally(() => {
          suburbShareInstagramAssetPending.delete(cacheKey);
        });
      suburbShareInstagramAssetPending.set(cacheKey, pendingAsset);
    }

    pendingAsset.then((preparedAsset) => {
      if (!cancelled) {
        setInstagramAssetState({
          status: 'ready',
          preparedBackgroundImageUrl: preparedAsset.preparedBackgroundImageUrl,
        });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [shareEnabled, selectedShareData, shareEnrichmentState]);

  const handleSelectSuburb = (suburb: string) => {
    setSelectedSuburb(suburb);
    setShareEnrichmentState({ status: 'idle' });
    setInstagramAssetState({ status: 'idle' });
    onSuburbChange?.(slugifyHoodieShareText(suburb));
    const scrollContainer = document.querySelector(
      embedded
        ? '.setu-china-vibe-scroll, .setu-malaysia-vibe-scroll'
        : '[data-testid="vibe-suburb-score-scroll"]',
    );
    if (scrollContainer instanceof HTMLElement) {
      scrollContainer.scrollTop = 0;
    } else {
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedState('All');
    setSelectedUni('All');
    setSelectedScore('All');
    setSelectedBadge('All');
  };

  if (selectedSuburb) {
    return (
      <div className={embedded ? 'w-full bg-white' : 'size-full bg-white flex flex-col'} style={{ fontFamily: 'Inter, sans-serif' }}>
        <div
          className="z-10 flex items-center justify-between gap-3 border-b border-[#E2E8F0] bg-white px-4 py-3"
          data-testid="vibe-suburb-detail-header"
        >
          <button
            onClick={() => {
              setSelectedSuburb(null);
              onSuburbChange?.(null);
            }}
            className="flex min-w-0 items-center gap-2 text-[#64748B] transition-colors hover:text-[#0F172A] cursor-pointer"
          >
            <ArrowLeft className="h-5 w-5 shrink-0" strokeWidth={1.5} />
            <span className="min-w-0 text-left text-xs font-medium leading-tight tracking-wide [overflow-wrap:anywhere]">{isSetuChina ? '返回地区数据' : 'Back to Suburb Stats'}</span>
          </button>
          <span className="hidden shrink-0 text-xs font-medium tracking-wide text-[#64748B] min-[390px]:block">{isSetuChina ? '地区分析' : 'Vibe Analysis'}</span>
          <div className="hidden w-10 shrink-0 min-[390px]:block sm:w-16" />
        </div>

        <div
          className={embedded ? 'bg-white' : `flex-1 min-h-0 overflow-y-auto bg-white ${usesStudentHubNavClearance ? 'pb-[calc(var(--app-bottom-nav-clearance)+2rem)]' : 'pb-6'}`}
          style={!embedded && usesStudentHubNavClearance ? { WebkitOverflowScrolling: 'touch', scrollPaddingBottom: 'calc(var(--app-bottom-nav-clearance) + 2rem)' } : undefined}
          data-testid="vibe-suburb-detail-scroll"
        >
          {shareEnabled && selectedShareData ? (
            <div className="border-b border-[#E2E8F0] px-4 py-3 bg-white">
              <HoodieShareActions
                descriptor={selectedShareDescriptor || buildSuburbSnapshotShareDescriptor({
                  suburb: selectedShareData.suburb,
                  state: selectedShareData.state,
                  totalStudents: selectedShareData.totalStudents,
                  badge: selectedShareData.badge,
                  crimeScore: selectedShareRequest?.crimeScore,
                  personalSafetyScore: selectedShareRequest?.personalSafetyScore,
                  propertyCrimeScore: selectedShareRequest?.propertyCrimeScore,
                  crimeBand: selectedShareRequest?.crimeBand,
                })}
                instagramDisabled={instagramSharePreparing}
                instagramDisabledReason={instagramSharePreparing ? 'Preparing Instagram image...' : ''}
              />
            </div>
          ) : null}
          <VibePanel suburbName={selectedSuburb} />
        </div>
      </div>
    );
  }

  return (
    <div className={embedded ? 'w-full bg-white' : 'size-full min-h-0 bg-white flex flex-col'} style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className={`${embedded ? 'relative z-10' : 'relative z-20'} px-4 pb-4 bg-white`}>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none">
              <Search className="text-[#94A3B8] w-[18px] h-[18px]" />
            </div>
            <input
              type="text"
              placeholder={isSetuChina ? '搜索地区名称...' : 'Search suburbs...'}
              className="w-full h-11 pl-11 pr-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl focus:ring-2 focus:ring-[#10B981]/20 focus:border-[#10B981]/40 outline-none transition-all text-sm text-[#0F172A] placeholder-[#94A3B8]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`w-11 h-11 flex items-center justify-center rounded-2xl border transition-all cursor-pointer ${
              showFilters || hasActiveFilters
                ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#059669]'
                : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#64748B] hover:bg-white'
            }`}
          >
            <Filter size={18} />
          </button>
        </div>

        {showFilters && (
          <div className="absolute top-full left-4 right-4 mt-2 bg-white border border-[#E2E8F0] rounded-2xl shadow-xl p-4 flex flex-col gap-4 z-50">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#0F172A]">{isSetuChina ? '筛选' : 'Filters'}</h3>
              <button onClick={() => setShowFilters(false)} className="p-1 text-[#94A3B8] hover:text-[#64748B] cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <CustomDropdown
                label={isSetuChina ? '州 / State' : 'State'}
                value={selectedState}
                onChange={setSelectedState}
                options={[
                  { label: isSetuChina ? '全部州' : 'All States', value: 'All' },
                  ...availableStates.map((state) => ({ label: state, value: state })),
                ]}
              />

              <CustomDropdown
                label={isSetuChina ? '大学 / University' : 'University'}
                value={selectedUni}
                onChange={setSelectedUni}
                options={[
                  { label: isSetuChina ? '全部大学' : 'All Universities', value: 'All' },
                  ...Object.keys(universitySuburbs).map((uni) => ({ label: uni, value: uni })),
                ]}
                searchable={true}
              />

              <CustomDropdown
                label={isSetuChina ? '匹配分数 / Match Score' : 'Match Score'}
                value={selectedScore}
                onChange={setSelectedScore}
                options={[
                  { label: isSetuChina ? '全部分数' : 'All Scores', value: 'All' },
                  { label: isSetuChina ? '高匹配' : 'High Match', value: 'High' },
                  { label: isSetuChina ? '中等匹配' : 'Medium Match', value: 'Medium' },
                  { label: isSetuChina ? '低匹配' : 'Low Match', value: 'Low' },
                ]}
              />

              <CustomDropdown
                label={isSetuChina ? '地区标签 / Vibe Badge' : 'Vibe Badge'}
                value={selectedBadge}
                onChange={setSelectedBadge}
                options={[
                  { label: isSetuChina ? '全部标签' : 'All Vibes', value: 'All' },
                  { label: isSetuChina ? '学生区' : 'Strong Student Hub', value: 'Student Hub' },
                  { label: isSetuChina ? '生活设施完善' : 'Cultural Infrastructure', value: 'Cultural Infrastructure' },
                  { label: isSetuChina ? '校园氛围活跃' : 'Active Campus Vibe', value: 'Campus Vibe' },
                  { label: isSetuChina ? '安静住宅区' : 'Quiet Residential', value: 'Quiet Residential' },
                ]}
              />
            </div>

            <div className={`items-center gap-2 border-t border-[#F1F5F9] pt-3 ${isSetuChina ? 'grid grid-cols-2' : 'flex justify-end'}`}>
              <button
                onClick={clearAllFilters}
                className="min-h-10 px-3 py-2 text-sm font-medium leading-tight text-[#64748B] hover:text-[#0F172A] cursor-pointer"
              >
                {isSetuChina ? '清除全部' : 'Clear All'}
              </button>
              <button
                onClick={() => setShowFilters(false)}
                className="min-h-10 rounded-xl bg-[#059669] px-3 py-2 text-sm font-bold leading-tight text-white transition-colors hover:bg-[#047857] cursor-pointer"
              >
                {isSetuChina ? '应用筛选' : 'Apply Filters'}
              </button>
            </div>
          </div>
        )}
      </div>

      <div
        className={embedded ? 'pb-3' : `min-h-0 flex-1 overflow-y-auto ${usesStudentHubNavClearance ? 'pb-[calc(var(--app-bottom-nav-clearance)+2rem)]' : 'pb-6'}`}
        style={!embedded && usesStudentHubNavClearance ? { WebkitOverflowScrolling: 'touch', scrollPaddingBottom: 'calc(var(--app-bottom-nav-clearance) + 2rem)' } : undefined}
        data-testid="vibe-suburb-score-scroll"
      >
        {filteredSuburbs.length > 0 ? (
          <div className="px-4 space-y-3">
            {filteredSuburbs.map((suburb) => (
              <div
                key={suburb.suburb}
                onClick={() => handleSelectSuburb(suburb.suburb)}
                className="cursor-pointer p-4 bg-white border border-[#E2E8F0] rounded-2xl hover:shadow-md transition-all active:scale-[0.99]"
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="break-words text-lg font-bold text-[#0F172A] [overflow-wrap:anywhere]">{suburb.suburb}</h3>
                    <p className="break-words text-sm font-medium text-[#94A3B8] [overflow-wrap:anywhere]">{suburb.state}</p>
                  </div>
                  <div className="shrink-0 rounded-xl bg-[#F8FAFC] p-2">
                    <MapPin className="h-5 w-5 text-[#94A3B8]" strokeWidth={1.5} />
                  </div>
                </div>

                <div className="pt-3 border-t border-[#F1F5F9] flex flex-col gap-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <span className="min-w-0 text-sm font-medium text-[#64748B]">{isSetuChina ? '学生人数' : 'Students'}</span>
                    <span className="shrink-0 text-sm font-bold text-[#0F172A]">{suburb.totalStudents.toLocaleString()}</span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="min-w-0 text-sm font-medium text-[#64748B]">{isSetuChina ? '匹配分数' : 'Match Score'}</span>
                    <span
                      className={`shrink-0 text-sm font-bold ${
                        suburb.score === 'High' ? 'text-[#059669]' :
                        suburb.score === 'Medium' ? 'text-[#D97706]' :
                        'text-[#94A3B8]'
                      }`}
                    >
                      {isSetuChina ? getChinaScoreLabel(suburb.score) : suburb.score}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {(suburb.badge ? [suburb.badge] : []).map((badge) => (
                      <div key={badge} className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-1">
                        <span className="shrink-0 text-[#64748B]">{getBadgeIcon(badge)}</span>
                        <span className="min-w-0 break-words text-[11px] font-medium leading-tight text-[#475569] [overflow-wrap:anywhere]">{isSetuChina ? getChinaBadgeLabel(badge) : badge}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-4 py-16 text-center">
            <div className="w-12 h-12 mx-auto bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] flex items-center justify-center mb-3">
              <Search className="w-5 h-5 text-[#94A3B8]" />
            </div>
            <p className="text-sm font-bold text-[#0F172A]">{isSetuChina ? '未找到地区' : 'No suburbs found'}</p>
            <p className="text-xs text-[#64748B] mt-1">{isSetuChina ? '请调整搜索词或筛选条件。' : 'Try adjusting your search or filters.'}</p>
            <button
              onClick={clearAllFilters}
              className="mt-4 px-4 py-2 bg-white border border-[#E2E8F0] text-[#0F172A] text-sm font-medium rounded-xl hover:bg-[#F8FAFC] transition-colors cursor-pointer"
            >
              {isSetuChina ? '清除筛选' : 'Clear Filters'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
