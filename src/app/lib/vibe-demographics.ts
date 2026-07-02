export type VibeDemographic = {
  name: string;
  total: number;
  students: number;
};

export type VibeDemographicView = 'population_vs_students' | 'student_residents';

export function getVibeDemographicView(input: { demographicView?: string | null | undefined }): VibeDemographicView {
  return input.demographicView === 'student_residents' ? 'student_residents' : 'population_vs_students';
}

export function sortVibeDemographics(
  demographics: VibeDemographic[],
  view: VibeDemographicView,
) {
  const source = Array.isArray(demographics) ? demographics : [];
  return [...source].sort((left, right) => {
    const leftValue = view === 'student_residents' ? left.students : left.total;
    const rightValue = view === 'student_residents' ? right.students : right.total;
    return rightValue - leftValue;
  });
}

export function getVibeDemographicBarWidth(
  demographic: VibeDemographic,
  demographics: VibeDemographic[],
  view: VibeDemographicView,
) {
  if (view === 'student_residents') {
    const maxStudents = Math.max(...demographics.map((item) => Number(item.students || 0)), 0);
    if (maxStudents <= 0) return 0;
    return Math.max(0, Math.min(100, (Number(demographic.students || 0) / maxStudents) * 100));
  }

  const total = Number(demographic.total || 0);
  const students = Number(demographic.students || 0);
  if (total <= 0 || students <= 0) return 0;
  return Math.max(0, Math.min(100, (students / total) * 100));
}

