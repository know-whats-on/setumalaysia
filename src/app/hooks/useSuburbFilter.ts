import { useState, useMemo } from 'react';
import { hasBrokenSuburbDemographics } from '../lib/demographics-data';

interface Demographic {
  name: string;
  total: number;
  students: number;
}

interface SuburbData {
  suburb: string;
  state: string;
  totalStudents: number;
  demographics: Demographic[];
  score?: 'High' | 'Medium' | 'Low';
}

export function useSuburbFilter(
  allSuburbs: SuburbData[],
  uniMappings: Record<string, string[]>,
) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUni, setSelectedUni] = useState<string | 'All'>('All');
  const [selectedBadge, setSelectedBadge] = useState<string | 'All'>('All');
  const [selectedScore, setSelectedScore] = useState<string | 'All'>('All');
  const [selectedState, setSelectedState] = useState<string | 'All'>('All');

  const getVibeBadge = (suburb: SuburbData) => {
    if (!suburb.demographics || suburb.demographics.length === 0) return 'Quiet Residential';
    const primaryDemographic = [...suburb.demographics].sort((a, b) => b.total - a.total)[0];
    if (!primaryDemographic || primaryDemographic.total === 0) return 'Quiet Residential';
    const studentRatio = primaryDemographic.students / primaryDemographic.total;
    if (studentRatio > 0.5) return 'Strong Student Hub';
    if (primaryDemographic.total > 500 && studentRatio < 0.2) return 'Cultural Infrastructure';
    if (suburb.totalStudents > 1000) return 'Active Campus Vibe';
    return 'Quiet Residential';
  };

  const getMatchScore = (suburb: SuburbData) => {
    if (suburb.totalStudents > 2000) return 'High';
    if (suburb.totalStudents > 500) return 'Medium';
    return 'Low';
  };

  const availableStates = useMemo(() => {
    return [...new Set(allSuburbs.map((suburb) => suburb.state))].sort();
  }, [allSuburbs]);

  const filteredSuburbs = useMemo(() => {
    return allSuburbs
      .filter((suburb) => !hasBrokenSuburbDemographics(suburb))
      .filter((suburb) => {
        const matchesSearch = suburb.suburb.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesUni = selectedUni === 'All' ||
          (uniMappings[selectedUni] && uniMappings[selectedUni].includes(suburb.suburb));
        const currentScore = suburb.score || getMatchScore(suburb);
        const matchesScore = selectedScore === 'All' || currentScore === selectedScore;
        const currentBadge = getVibeBadge(suburb);
        const matchesBadge = selectedBadge === 'All' || currentBadge.includes(selectedBadge);
        const matchesState = selectedState === 'All' || suburb.state === selectedState;
        return matchesSearch && matchesUni && matchesScore && matchesBadge && matchesState;
      })
      .map((suburb) => ({
        ...suburb,
        score: suburb.score || getMatchScore(suburb),
        badge: getVibeBadge(suburb),
      }));
  }, [allSuburbs, searchQuery, selectedUni, selectedScore, selectedBadge, selectedState, uniMappings]);

  return {
    searchQuery, setSearchQuery,
    selectedUni, setSelectedUni,
    selectedBadge, setSelectedBadge,
    selectedScore, setSelectedScore,
    selectedState, setSelectedState,
    availableStates,
    filteredSuburbs,
  };
}
