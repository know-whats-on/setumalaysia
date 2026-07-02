import { useMemo, useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  FileText,
  GraduationCap,
  Home,
  LifeBuoy,
  MapPin,
  Plane,
  RotateCcw,
  School,
  Users,
  Wallet,
} from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Checkbox } from '../ui/checkbox';
import { Progress } from '../ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import {
  categorizeSetuChecklistItems,
  convertSetuChecklistItems,
  SETU_CHECKLIST_CATEGORY_INFO,
  type SetuChecklistCategory,
} from '../../lib/setu-checklist';
import { SetuChecklistPdfButton } from './setu-checklist-pdf-button';
import type {
  SetuChecklistProgress,
  SetuGeneratedChecklist,
  SetuLocationInfo,
} from '../../lib/setu-types';

interface SetuPersonalizedChecklistProps {
  checklist: SetuGeneratedChecklist;
  universityName: string;
  location: SetuLocationInfo | null;
  progress: SetuChecklistProgress | null;
  onToggleItem: (itemId: string) => void;
  onReset: () => void | Promise<void>;
  getCompletionPercentage: () => number;
  isItemCompleted: (itemId: string) => boolean;
  getCompletedCount: () => number;
}

const defaultExpanded = new Set<SetuChecklistCategory>(['documents', 'pre-departure', 'university-arrival']);

function getCategoryIcon(category: SetuChecklistCategory) {
  switch (category) {
    case 'pre-departure':
      return Plane;
    case 'documents':
      return FileText;
    case 'accommodation':
      return Home;
    case 'university-arrival':
      return GraduationCap;
    case 'life-setup':
      return Wallet;
    case 'cultural-integration':
      return Users;
    default:
      return School;
  }
}

export function SetuPersonalizedChecklist({
  checklist,
  universityName,
  location,
  progress,
  onToggleItem,
  onReset,
  getCompletionPercentage,
  isItemCompleted,
  getCompletedCount,
}: SetuPersonalizedChecklistProps) {
  const checklistItems = useMemo(
    () => convertSetuChecklistItems(checklist.checklist_items || []),
    [checklist.checklist_items],
  );
  const categorized = useMemo(() => categorizeSetuChecklistItems(checklistItems), [checklistItems]);
  const [expandedCategories, setExpandedCategories] = useState<Set<SetuChecklistCategory>>(defaultExpanded);

  const completionPercentage = getCompletionPercentage();
  const completedCount = getCompletedCount();
  const totalItems = checklistItems.length;

  const toggleCategory = (category: SetuChecklistCategory) => {
    setExpandedCategories((current) => {
      const next = new Set(current);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden rounded-[28px] border-[#DBEAFE] shadow-sm">
        <CardHeader className="border-b border-[#EFF6FF] bg-[#F8FBFF]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <CardTitle className="flex items-center gap-3 text-[#0F172A]">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#DBEAFE] text-[#1D4ED8]">
                  <School className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-lg font-semibold">{universityName}</span>
                  <span className="block text-sm font-normal text-[#64748B]">
                    Live checklist generated from SETU content
                  </span>
                </span>
              </CardTitle>

              <div className="flex flex-wrap gap-2">
                {location && (
                  <>
                    <Badge variant="outline" className="border-[#BFDBFE] bg-white text-[#1D4ED8]">
                      <MapPin className="h-3 w-3" />
                      {location.city}, {location.stateCode}
                    </Badge>
                    <Badge variant="outline" className="border-[#BFDBFE] bg-white text-[#1D4ED8]">
                      {location.climate} climate
                    </Badge>
                  </>
                )}
                <Badge variant="outline" className="border-[#BFDBFE] bg-white text-[#1D4ED8]">
                  <CheckCircle2 className="h-3 w-3" />
                  {checklist.metadata.essential_items} essential items
                </Badge>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <SetuChecklistPdfButton
                checklistItems={checklistItems}
                universityName={universityName}
                location={location}
                progress={progress}
                isItemCompleted={isItemCompleted}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void onReset()}
                className="border-[#FECACA] bg-white text-[#B91C1C] hover:bg-[#FEF2F2]"
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#475569]">
                Progress: {completedCount} of {totalItems} completed
              </span>
              <span className="font-semibold text-[#1D4ED8]">{completionPercentage}%</span>
            </div>
            <Progress value={completionPercentage} className="h-2.5 bg-[#DBEAFE]" />
          </div>

          {progress?.lastUpdated && (
            <p className="flex items-center gap-2 text-xs text-[#64748B]">
              <Calendar className="h-3.5 w-3.5" />
              Last updated {new Date(progress.lastUpdated).toLocaleString()}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="space-y-4">
        {(Object.entries(categorized) as Array<[SetuChecklistCategory, typeof checklistItems]>).map(
          ([category, items]) => {
            if (items.length === 0) return null;

            const info = SETU_CHECKLIST_CATEGORY_INFO[category];
            const Icon = getCategoryIcon(category);
            const completed = items.filter((item) => isItemCompleted(item.id)).length;
            const percentage = items.length > 0 ? Math.round((completed / items.length) * 100) : 0;
            const isOpen = expandedCategories.has(category);

            return (
              <Card key={category} className="overflow-hidden rounded-[26px] border-[#E2E8F0] shadow-sm">
                <Collapsible open={isOpen} onOpenChange={() => toggleCategory(category)}>
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-4 bg-white px-5 py-5 text-left transition-colors hover:bg-[#F8FAFC]"
                    >
                      <span className="flex min-w-0 items-start gap-4">
                        <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#1D4ED8]">
                          <Icon className="h-5 w-5" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-base font-semibold text-[#0F172A]">{info.title}</span>
                          <span className="mt-1 block text-sm leading-6 text-[#64748B]">{info.description}</span>
                          <span className="mt-3 flex flex-wrap gap-2">
                            <Badge variant="outline" className="border-[#DBEAFE] bg-[#F8FBFF] text-[#1D4ED8]">
                              {completed}/{items.length} complete
                            </Badge>
                            <Badge variant="outline" className="border-[#DBEAFE] bg-[#F8FBFF] text-[#1D4ED8]">
                              {percentage}% done
                            </Badge>
                          </span>
                        </span>
                      </span>
                      {isOpen ? (
                        <ChevronDown className="h-5 w-5 shrink-0 text-[#64748B]" />
                      ) : (
                        <ChevronRight className="h-5 w-5 shrink-0 text-[#64748B]" />
                      )}
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="border-t border-[#F1F5F9] bg-[#FCFDFE] px-5 py-5">
                    <div className="space-y-3">
                      {items.map((item) => {
                        const completedItem = isItemCompleted(item.id);
                        return (
                          <label
                            key={item.id}
                            className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-colors ${
                              completedItem
                                ? 'border-[#86EFAC] bg-[#F0FDF4]'
                                : 'border-[#E2E8F0] bg-white hover:border-[#BFDBFE] hover:bg-[#F8FBFF]'
                            }`}
                          >
                            <Checkbox checked={completedItem} onCheckedChange={() => onToggleItem(item.id)} className="mt-0.5" />
                            <span className="min-w-0 flex-1">
                              <span className="flex flex-wrap items-center gap-2">
                                <span className={`text-sm font-medium ${completedItem ? 'text-[#166534]' : 'text-[#0F172A]'}`}>
                                  {item.text}
                                </span>
                                <Badge
                                  variant="outline"
                                  className={
                                    item.priority === 'high'
                                      ? 'border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]'
                                      : item.priority === 'medium'
                                      ? 'border-[#FDE68A] bg-[#FFFBEB] text-[#B45309]'
                                      : 'border-[#BBF7D0] bg-[#F0FDF4] text-[#15803D]'
                                  }
                                >
                                  {item.priority}
                                </Badge>
                              </span>
                              {item.description && (
                                <span className={`mt-1 block text-sm leading-6 ${completedItem ? 'text-[#15803D]' : 'text-[#64748B]'}`}>
                                  {item.description}
                                </span>
                              )}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          },
        )}
      </div>

      {(checklist.resource_links.length > 0 || checklist.tips.length > 0 || checklist.contacts.length > 0) && (
        <div className="grid gap-4 lg:grid-cols-3">
          {checklist.resource_links.length > 0 && (
            <Card className="rounded-[24px] border-[#E2E8F0] shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-[#0F172A]">Helpful links</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-[#334155]">
                {checklist.resource_links.slice(0, 6).map((item) => (
                  <a
                    key={item.id}
                    href={item.url || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-2 rounded-2xl border border-[#E2E8F0] p-3 transition-colors hover:border-[#BFDBFE] hover:bg-[#F8FBFF]"
                  >
                    <LifeBuoy className="mt-0.5 h-4 w-4 shrink-0 text-[#1D4ED8]" />
                    <span>
                      <span className="block font-medium text-[#0F172A]">{item.title}</span>
                      {item.description && <span className="mt-1 block text-[#64748B]">{item.description}</span>}
                    </span>
                  </a>
                ))}
              </CardContent>
            </Card>
          )}

          {checklist.tips.length > 0 && (
            <Card className="rounded-[24px] border-[#E2E8F0] shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-[#0F172A]">Quick tips</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-[#334155]">
                {checklist.tips.slice(0, 6).map((item) => (
                  <div key={item.id} className="rounded-2xl border border-[#E2E8F0] p-3">
                    <p className="font-medium text-[#0F172A]">{item.title}</p>
                    {item.description && <p className="mt-1 text-[#64748B]">{item.description}</p>}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {checklist.contacts.length > 0 && (
            <Card className="rounded-[24px] border-[#E2E8F0] shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-[#0F172A]">Key contacts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-[#334155]">
                {checklist.contacts.slice(0, 6).map((item) => (
                  <a
                    key={item.id}
                    href={item.url || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-2xl border border-[#E2E8F0] p-3 transition-colors hover:border-[#BFDBFE] hover:bg-[#F8FBFF]"
                  >
                    <p className="font-medium text-[#0F172A]">{item.title}</p>
                    {item.description && <p className="mt-1 text-[#64748B]">{item.description}</p>}
                  </a>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
