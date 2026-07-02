import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  ChevronDown,
  RefreshCw,
  Scale,
  Zap,
} from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../components/ui/accordion';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../components/ui/collapsible';
import { Link, useNavigate } from 'react-router';
import { SetuChecklistGenerator } from '../components/setu/setu-checklist-generator';
import { SetuPersonalizedChecklist } from '../components/setu/setu-personalized-checklist';
import { SetuDisclaimerCard } from '../components/setu/setu-disclaimer-card';
import { SetuFaqPdfButton } from '../components/setu/setu-faq-pdf-button';
import { SetuMarkdown } from '../components/setu/setu-markdown';
import { useSetuChecklistProgress } from '../hooks/use-setu-checklist-progress';
import { fetchProfile } from '../lib/api';
import { APP_CONFIG } from '../lib/app-config';
import {
  fetchSetuFaqCategories,
  fetchSetuFaqs,
  fetchSetuUniversities,
  generateSetuChecklist,
} from '../lib/setu-api';
import { getLegalTabRoute } from '../lib/resources-routes';
import { FREE_ELECTRICITY_GUIDE_ROUTE } from '../lib/free-electricity-guide';
import { getUniversityLocation, normalizeAustralianStateCode } from '../lib/setu-university-location';
import type {
  SetuCategory,
  SetuFaq,
  SetuGeneratedChecklist,
  SetuUniversity,
} from '../lib/setu-types';

function normalizeComparable(value: string | null | undefined) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function buildChecklistId(universityName: string) {
  return `${universityName.replace(/\s+/g, '_').toLowerCase()}_checklist`;
}

export function SetuPage() {
  const navigate = useNavigate();
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [sessionEmail, setSessionEmail] = useState('');
  const [categories, setCategories] = useState<SetuCategory[]>([]);
  const [faqs, setFaqs] = useState<SetuFaq[]>([]);
  const [universities, setUniversities] = useState<SetuUniversity[]>([]);
  const [profile, setProfile] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [faqError, setFaqError] = useState<string | null>(null);
  const [checklistLoadError, setChecklistLoadError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedUniversityId, setSelectedUniversityId] = useState<number | null>(null);
  const [generatedChecklist, setGeneratedChecklist] = useState<SetuGeneratedChecklist | null>(null);
  const [checklistUniversity, setChecklistUniversity] = useState('');
  const [checklistLocation, setChecklistLocation] = useState<ReturnType<typeof getUniversityLocation>>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [isGeneratingChecklist, setIsGeneratingChecklist] = useState(false);
  const [isQuickNavOpen, setIsQuickNavOpen] = useState(false);
  const autoLoadedChecklistRef = useRef(false);

  useEffect(() => {
    const email = localStorage.getItem('ghar_email') || '';
    setSessionEmail(email.trim().toLowerCase());
  }, []);

  const {
    progress,
    isLoading: isProgressLoading,
    initializeProgress,
    toggleItem,
    clearProgress,
    getCompletionPercentage,
    isItemCompleted,
    getCompletedCount,
  } = useSetuChecklistProgress(sessionEmail);

  const loadData = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (mode === 'refresh') {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }

      setFaqError(null);
      setChecklistLoadError(null);

      try {
        const [categoriesResult, faqsResult, universitiesResult, profileResult] = await Promise.allSettled([
          fetchSetuFaqCategories(),
          fetchSetuFaqs(),
          fetchSetuUniversities(),
          sessionEmail ? fetchProfile(sessionEmail) : Promise.resolve(null),
        ]);

        if (categoriesResult.status === 'fulfilled') {
          setCategories(categoriesResult.value);
        } else {
          console.error('GHAR SETU category load error:', categoriesResult.reason);
          setCategories([]);
          setFaqError('SETU FAQ categories could not be loaded right now.');
        }

        if (faqsResult.status === 'fulfilled') {
          setFaqs(faqsResult.value);
        } else {
          console.error('GHAR SETU FAQ load error:', faqsResult.reason);
          setFaqs([]);
          setFaqError(
            faqsResult.reason instanceof Error
              ? faqsResult.reason.message
              : 'SETU FAQs could not be loaded right now.',
          );
        }

        if (universitiesResult.status === 'fulfilled') {
          setUniversities(universitiesResult.value);
        } else {
          console.error('GHAR SETU university load error:', universitiesResult.reason);
          setUniversities([]);
          setChecklistLoadError(
            universitiesResult.reason instanceof Error
              ? universitiesResult.reason.message
              : 'SETU university data could not be loaded right now.',
          );
        }

        if (profileResult.status === 'fulfilled') {
          setProfile(profileResult.value);
        } else {
          console.error('GHAR SETU profile load error:', profileResult.reason);
          setProfile(null);
        }
      } catch (loadError) {
        console.error('GHAR SETU page load error:', loadError);
        const message = loadError instanceof Error ? loadError.message : 'Failed to load SETU data.';
        setFaqError(message);
        setChecklistLoadError(message);
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [sessionEmail],
  );

  useEffect(() => {
    void loadData('initial');
  }, [loadData]);

  const resolvedProfileUniversityId = useMemo(() => {
    if (!profile || universities.length === 0) return null;

    const profileUniversityId = Number(profile.university_id);
    if (Number.isFinite(profileUniversityId) && universities.some((item) => item.id === profileUniversityId)) {
      return profileUniversityId;
    }

    const profileUniversityName = normalizeComparable(profile.university);
    if (!profileUniversityName) return null;

    return universities.find((item) => normalizeComparable(item.name) === profileUniversityName)?.id || null;
  }, [profile, universities]);

  useEffect(() => {
    if (!selectedUniversityId && resolvedProfileUniversityId) {
      setSelectedUniversityId(resolvedProfileUniversityId);
    }
  }, [resolvedProfileUniversityId, selectedUniversityId]);

  const selectedUniversity = useMemo(
    () => universities.find((item) => item.id === selectedUniversityId) || null,
    [selectedUniversityId, universities],
  );
  const selectedLocation = useMemo(
    () => getUniversityLocation(selectedUniversityId),
    [selectedUniversityId],
  );
  const profileMatched = Boolean(resolvedProfileUniversityId && selectedUniversityId === resolvedProfileUniversityId);
  const citizenship = String(profile?.citizenship || '').trim() || (APP_CONFIG.variant === 'setu_china' ? 'China' : APP_CONFIG.variant === 'jom_settle' ? 'Malaysia' : 'India');

  const allFaqsByCategory = useMemo(() => {
    return [...categories]
      .sort((a, b) => a.category_order - b.category_order)
      .map((category) => ({
        category,
        faqs: faqs.filter((faq) => faq.category_id === category.id),
      }));
  }, [categories, faqs]);

  const filterLocationSpecificFaqs = useCallback(
    (categoryName: string, categoryFaqs: SetuFaq[]) => {
      if (!generatedChecklist || !checklistLocation) return categoryFaqs;

      const normalizedCategory = normalizeComparable(categoryName);
      if (!normalizedCategory.includes('climate') && !normalizedCategory.includes('life in australia')) {
        return categoryFaqs;
      }

      const locationKeywords = [checklistLocation.city.toLowerCase()];
      if (checklistLocation.stateCode === 'TAS') {
        locationKeywords.push('tasmania');
      }

      return categoryFaqs.filter((faq) => {
        const title = faq.title.toLowerCase();
        if (!title.includes('life in ')) return true;
        return locationKeywords.some((keyword) => title.includes(keyword));
      });
    },
    [generatedChecklist, checklistLocation],
  );

  const displayFaqsByCategory = useMemo(() => {
    return allFaqsByCategory.map(({ category, faqs: categoryFaqs }) => ({
      category,
      faqs: filterLocationSpecificFaqs(category.name, categoryFaqs),
    }));
  }, [allFaqsByCategory, filterLocationSpecificFaqs]);

  const generateChecklistForUniversity = useCallback(
    async (university: SetuUniversity, options?: { scroll?: boolean }) => {
      setGenerateError(null);
      setIsGeneratingChecklist(true);

      try {
        const location = getUniversityLocation(university.id);
        const state = location?.stateCode || normalizeAustralianStateCode(profile?.australian_state);
        const checklist = await generateSetuChecklist({
          university_id: university.id,
          state: state || undefined,
          citizenship,
        });

        setGeneratedChecklist(checklist);
        setChecklistUniversity(university.name);
        setChecklistLocation(location);

        const totalItems = checklist.checklist_items?.length || 0;
        if (totalItems > 0) {
          await initializeProgress(
            buildChecklistId(university.name),
            university.id,
            totalItems,
            university.name,
            location ? `${location.city}, ${location.state}` : '',
          );
        }

        if (options?.scroll !== false) {
          window.setTimeout(() => {
            document.getElementById('personalized-checklist')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 120);
        }
      } catch (checklistError) {
        console.error('GHAR SETU checklist generation error:', checklistError);
        setGenerateError(
          checklistError instanceof Error
            ? checklistError.message
            : 'Unable to generate your SETU checklist right now.',
        );
      } finally {
        setIsGeneratingChecklist(false);
      }
    },
    [citizenship, initializeProgress, profile?.australian_state],
  );

  useEffect(() => {
    if (autoLoadedChecklistRef.current) return;
    if (loading || isProgressLoading || universities.length === 0) return;

    if (!progress || progress.completedItems.length === 0) {
      autoLoadedChecklistRef.current = true;
      return;
    }

    const fallbackUniversityId = resolvedProfileUniversityId || selectedUniversityId;
    const matchedUniversity =
      universities.find((item) => item.id === progress.universityId) ||
      universities.find((item) => normalizeComparable(item.name) === normalizeComparable(progress.universityName)) ||
      universities.find((item) => item.id === fallbackUniversityId) ||
      null;

    autoLoadedChecklistRef.current = true;

    if (matchedUniversity) {
      setSelectedUniversityId(matchedUniversity.id);
      void generateChecklistForUniversity(matchedUniversity, { scroll: false });
    }
  }, [
    generateChecklistForUniversity,
    isProgressLoading,
    loading,
    progress,
    resolvedProfileUniversityId,
    selectedUniversityId,
    universities,
  ]);

  const handleResetChecklist = useCallback(async () => {
    await clearProgress();
    setGeneratedChecklist(null);
    setChecklistUniversity('');
    setChecklistLocation(null);
    window.setTimeout(() => {
      document.getElementById('checklist-generator')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  }, [clearProgress]);

  const scrollToCategory = useCallback(
    (categoryId: number) => {
      const targetId = `setu-category-${categoryId}`;

      const performScroll = () => {
        const target = document.getElementById(targetId);
        const scrollContainer = scrollContainerRef.current;

        if (!target) return;

        if (scrollContainer) {
          const containerRect = scrollContainer.getBoundingClientRect();
          const targetRect = target.getBoundingClientRect();
          const nextTop = scrollContainer.scrollTop + targetRect.top - containerRect.top - 16;

          scrollContainer.scrollTo({
            top: Math.max(nextTop, 0),
            behavior: 'smooth',
          });
          return;
        }

        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      };

      if (isQuickNavOpen) {
        setIsQuickNavOpen(false);
        window.setTimeout(performScroll, 220);
        return;
      }

      performScroll();
    },
    [isQuickNavOpen],
  );

  if (loading) {
    return (
      <div className="size-full overflow-y-auto bg-[#F8FAFC]" style={{ fontFamily: 'Inter, sans-serif' }}>
        <div className="flex min-h-full items-center justify-center px-4 py-10 native-safe-area-top">
          <div className="flex flex-col items-center gap-4">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#1D4ED8] border-t-transparent" />
            <p className="text-sm text-[#64748B]">Loading your SETU checklist...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={scrollContainerRef} className="size-full overflow-y-auto bg-[#F8FAFC]" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-5 pb-10 native-safe-area-top">
        <section id="checklist-generator" className="space-y-4">
          <SetuChecklistGenerator
            universities={universities}
            selectedUniversityId={selectedUniversityId}
            onSelectUniversity={setSelectedUniversityId}
            selectedUniversityName={selectedUniversity?.name || 'Selected university'}
            location={selectedLocation}
            profileMatched={profileMatched}
            citizenship={citizenship}
            onGenerate={() => {
              if (selectedUniversity) {
                void generateChecklistForUniversity(selectedUniversity);
              }
            }}
            isGenerating={isGeneratingChecklist}
          />
          {checklistLoadError && (
            <Card className="rounded-[24px] border-[#FECACA] bg-[#FEF2F2] shadow-sm">
              <CardContent className="flex items-start gap-3 pt-5 text-sm text-[#991B1B]">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{checklistLoadError}</p>
              </CardContent>
            </Card>
          )}
          {generateError && (
            <Card className="rounded-[24px] border-[#FECACA] bg-[#FEF2F2] shadow-sm">
              <CardContent className="pt-5 text-sm text-[#991B1B]">{generateError}</CardContent>
            </Card>
          )}
        </section>

        <section className="rounded-lg border border-[#DBEAFE] bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#EFF6FF] text-[#1D4ED8]">
                <Zap className="h-5 w-5" strokeWidth={1.8} />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#1D4ED8]">Australia 2026 update</p>
                <h2 className="mt-1 text-xl font-bold text-[#0F172A]">Free electricity guide</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#64748B]">
                  Check the confirmed 3-hour daily free power windows by city, plus smart meter, opt-in, and plan comparison watch-outs.
                </p>
              </div>
            </div>
            <Link
              to={FREE_ELECTRICITY_GUIDE_ROUTE}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[#1D4ED8] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#1E40AF]"
            >
              Open guide
              <ArrowRight className="h-4 w-4" strokeWidth={1.8} />
            </Link>
          </div>
        </section>

        <section className="rounded-[28px] border border-[#E2E8F0] bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#1D4ED8]">More support</p>
              <h2 className="mt-2 text-xl font-bold text-[#0F172A]">Legal help stays one tap away</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#64748B]">
                Stay in the SETU resources hub for checklists and FAQs, then jump into legal support when you need
                evidence, scam checks, or dispute-ready records.
              </p>
            </div>
            <Button
              type="button"
              onClick={() => navigate(getLegalTabRoute(false))}
              className="h-12 rounded-2xl bg-[#0F172A] px-5 text-white hover:bg-[#1E293B]"
            >
              <Scale className="h-4 w-4" />
              Open legal support
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </section>

        {generatedChecklist && (
          <section id="personalized-checklist">
            <SetuPersonalizedChecklist
              checklist={generatedChecklist}
              universityName={checklistUniversity}
              location={checklistLocation}
              progress={progress}
              onToggleItem={toggleItem}
              onReset={handleResetChecklist}
              getCompletionPercentage={getCompletionPercentage}
              isItemCompleted={isItemCompleted}
              getCompletedCount={getCompletedCount}
            />
          </section>
        )}

        <SetuDisclaimerCard />

        <section className="space-y-5 pb-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#1D4ED8]">SETU FAQs</p>
              <h2 className="mt-2 text-2xl font-bold text-[#0F172A]">Frequently asked questions</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#64748B]">
                Live answers from the SETU source database, grouped by topic for quick scanning.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {allFaqsByCategory.some(({ faqs: items }) => items.length > 0) && (
                <SetuFaqPdfButton faqsByCategory={allFaqsByCategory.filter(({ faqs: items }) => items.length > 0)} />
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  void (async () => {
                    await loadData('refresh');
                    if (selectedUniversity && generatedChecklist) {
                      await generateChecklistForUniversity(selectedUniversity, { scroll: false });
                    }
                  })();
                }}
                disabled={isRefreshing}
                className="border-[#DBEAFE] bg-white text-[#1D4ED8] hover:bg-[#EFF6FF]"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>

          {faqError && (
            <Card className="rounded-[28px] border-[#FECACA] bg-[#FEF2F2] shadow-sm">
              <CardContent className="flex flex-col gap-4 pt-6 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-5 w-5 text-[#B91C1C]" />
                  <div>
                    <p className="font-semibold text-[#7F1D1D]">SETU FAQs could not be loaded</p>
                    <p className="mt-1 text-sm text-[#991B1B]">{faqError}</p>
                  </div>
                </div>
                <Button type="button" onClick={() => void loadData('refresh')} className="bg-[#B91C1C] text-white hover:bg-[#991B1B]">
                  Retry
                </Button>
              </CardContent>
            </Card>
          )}

          {allFaqsByCategory.length > 0 && (
            <section className="space-y-4">
              <div className="md:hidden">
                <Collapsible open={isQuickNavOpen} onOpenChange={setIsQuickNavOpen}>
                  <CollapsibleTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-12 w-full justify-between rounded-2xl border-[#CBD5E1] bg-white text-[#0F172A] hover:bg-[#F8FAFC]"
                    >
                      <span className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-[#1D4ED8]" />
                        Quick Navigation
                      </span>
                      <ChevronDown className={`h-4 w-4 transition-transform ${isQuickNavOpen ? 'rotate-180' : ''}`} />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-3">
                    <div className="grid gap-2 rounded-[22px] border border-[#E2E8F0] bg-white p-3">
                      {categories
                        .slice()
                        .sort((a, b) => a.category_order - b.category_order)
                        .map((category) => (
                          <button
                            key={category.id}
                            type="button"
                            onClick={() => scrollToCategory(category.id)}
                            className="rounded-2xl border border-[#E2E8F0] px-4 py-3 text-left text-sm font-medium text-[#334155] transition-colors hover:border-[#BFDBFE] hover:bg-[#F8FBFF]"
                          >
                            {category.name}
                          </button>
                        ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>

              <div className="hidden flex-wrap gap-2 md:flex">
                {categories
                  .slice()
                  .sort((a, b) => a.category_order - b.category_order)
                  .map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => scrollToCategory(category.id)}
                      className="rounded-full border border-[#DBEAFE] bg-white px-4 py-2 text-sm font-medium text-[#1D4ED8] transition-colors hover:bg-[#EFF6FF]"
                    >
                      {category.name}
                    </button>
                  ))}
              </div>
            </section>
          )}

          {displayFaqsByCategory.map(({ category, faqs: categoryFaqs }) => {
            if (categoryFaqs.length === 0) return null;

            return (
              <section
                key={category.id}
                id={`setu-category-${category.id}`}
                className="scroll-mt-24 rounded-[28px] border border-[#E2E8F0] bg-white p-4 shadow-sm md:p-5"
              >
                <div className="mb-4 flex flex-col gap-2 border-b border-[#F1F5F9] pb-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-xl font-semibold text-[#0F172A]">{category.name}</h3>
                    <Badge variant="outline" className="border-[#DBEAFE] bg-[#F8FBFF] text-[#1D4ED8]">
                      {categoryFaqs.length} FAQs
                    </Badge>
                  </div>
                </div>

                <Accordion type="single" collapsible className="w-full">
                  {categoryFaqs.map((faq) => (
                    <AccordionItem key={faq.id} value={faq.id} className="border-b border-[#F1F5F9] last:border-b-0">
                      <AccordionTrigger className="py-5 text-left text-base font-semibold text-[#0F172A] hover:no-underline">
                        <span className="pr-4">{faq.title}</span>
                      </AccordionTrigger>
                      <AccordionContent className="pb-5">
                        <SetuMarkdown content={faq.content} />
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </section>
            );
          })}
        </section>
      </div>
    </div>
  );
}
