import { BookOpen, MapPin, Sparkles } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { APP_CONFIG } from '../../lib/app-config';
import type { SetuLocationInfo, SetuUniversity } from '../../lib/setu-types';

interface SetuChecklistGeneratorProps {
  universities: SetuUniversity[];
  selectedUniversityId: number | null;
  onSelectUniversity: (value: number) => void;
  selectedUniversityName: string;
  location: SetuLocationInfo | null;
  profileMatched: boolean;
  citizenship: string;
  onGenerate: () => void;
  isGenerating: boolean;
}

export function SetuChecklistGenerator({
  universities,
  selectedUniversityId,
  onSelectUniversity,
  selectedUniversityName,
  location,
  profileMatched,
  citizenship,
  onGenerate,
  isGenerating,
}: SetuChecklistGeneratorProps) {
  const appName = APP_CONFIG.displayName;

  return (
    <Card className="overflow-hidden rounded-[28px] border-[#DBEAFE] bg-white shadow-sm">
      <CardHeader className="border-b border-[#EFF6FF] bg-[#F8FBFF]">
        <CardTitle className="flex items-center gap-3 text-[#0F172A]">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#DBEAFE] text-[#1D4ED8]">
            <BookOpen className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-lg font-semibold">Get Your Personalized Student Checklist</span>
            <span className="block text-sm font-normal text-[#64748B]">
              Live SETU logic, tailored to your university and location.
            </span>
          </span>
        </CardTitle>
        <CardDescription className="text-sm leading-6 text-[#475569]">
          Select your university and {appName} will pull the latest checklist content from SETU&apos;s
          source data, then save your progress back into {appName}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 pt-6">
        <div className="space-y-2">
          <label className="text-sm font-medium text-[#334155]">University</label>
          <Select
            value={selectedUniversityId ? String(selectedUniversityId) : ''}
            onValueChange={(value) => onSelectUniversity(Number(value))}
          >
            <SelectTrigger className="h-12 rounded-2xl border-[#CBD5E1] bg-white">
              <SelectValue placeholder="Choose your university" />
            </SelectTrigger>
            <SelectContent>
              {universities.map((university) => (
                <SelectItem key={university.id} value={String(university.id)}>
                  {university.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-[#64748B]">
            {profileMatched
              ? `Matched from your ${appName} profile. You can change it here if needed.`
              : `If ${appName} could not resolve your university automatically, choose it manually here.`}
          </p>
        </div>

        {selectedUniversityId && location && (
          <div className="rounded-[24px] border border-[#BFDBFE] bg-[#EFF6FF] p-5">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-[#1D4ED8]">
                <MapPin className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-base font-semibold text-[#0F172A]">{selectedUniversityName}</p>
                <p className="mt-1 text-sm text-[#1E3A8A]">
                  {location.city}, {location.state}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant="outline" className="border-[#93C5FD] bg-white text-[#1D4ED8]">
                    University
                  </Badge>
                  <Badge variant="outline" className="border-[#93C5FD] bg-white text-[#1D4ED8]">
                    State: {location.stateCode}
                  </Badge>
                  <Badge variant="outline" className="border-[#93C5FD] bg-white text-[#1D4ED8]">
                    Climate: {location.climate}
                  </Badge>
                  <Badge variant="outline" className="border-[#93C5FD] bg-white text-[#1D4ED8]">
                    Citizenship: {citizenship}
                  </Badge>
                </div>
                <p className="mt-3 text-sm leading-6 text-[#334155]">
                  Your checklist will prioritise location-specific setup tasks, documents, and first-weeks-in-Australia steps for this destination.
                </p>
              </div>
            </div>
          </div>
        )}

        <Button
          type="button"
          onClick={onGenerate}
          disabled={!selectedUniversityId || isGenerating}
          className="h-12 w-full rounded-2xl bg-[#1D4ED8] text-white hover:bg-[#1E40AF]"
        >
          {isGenerating ? <Sparkles className="h-4 w-4 animate-pulse" /> : <BookOpen className="h-4 w-4" />}
          {isGenerating ? 'Generating your live checklist...' : 'Generate My Personalized Checklist'}
        </Button>
      </CardContent>
    </Card>
  );
}
