import { addDays, format, isBefore, parseISO } from 'date-fns';
import { getProjectTypeMeta } from './project-types';
import { toISODate } from './seed-data';
import type { ExecutionTask, TaskStatus } from './types';

export const DAILY_TARGET_MINUTES = 120;
export const DAILY_MAX_MINUTES = 135;

export type DirectoryGroupKind = 'overdue' | 'today' | 'upcoming' | 'completed';

export type DirectoryGroup = {
  key: string;
  date: string;
  label: string;
  kind: DirectoryGroupKind;
  tasks: ExecutionTask[];
  open_minutes: number;
  total_minutes: number;
  overloaded: boolean;
};

const LOAD_EXCLUDED_STATUSES: TaskStatus[] = [
  'Done',
  'Cancelled',
  'Blocked',
  'Waiting for reply',
  'Needs review',
];

function safeDatePart(value: string | undefined) {
  return value?.slice(0, 10);
}

export function getTaskSortDate(task: ExecutionTask) {
  return safeDatePart(task.scheduled_date)
    || safeDatePart(task.due_date)
    || safeDatePart(task.created_at)
    || toISODate(new Date());
}

export function isDoneOrCancelled(task: ExecutionTask) {
  return task.status === 'Done' || task.status === 'Cancelled';
}

export function countsForDailyLoad(task: ExecutionTask) {
  return !LOAD_EXCLUDED_STATUSES.includes(task.status);
}

export function getDateLoad(tasks: ExecutionTask[], date: string) {
  return tasks
    .filter((task) => getTaskSortDate(task) === date && countsForDailyLoad(task))
    .reduce((sum, task) => sum + task.effort_minutes, 0);
}

export function compareTaskPriority(a: ExecutionTask, b: ExecutionTask) {
  const statusWeight = (task: ExecutionTask) => {
    if (task.status === 'In progress') return 0;
    if (task.status === 'Blocked' || task.status === 'Waiting for reply') return 4;
    if (task.status === 'Done') return 8;
    if (task.status === 'Cancelled') return 9;
    return 1;
  };

  return statusWeight(a) - statusWeight(b)
    || a.dependencies.length - b.dependencies.length
    || getProjectTypeMeta(a.category).sort_weight - getProjectTypeMeta(b.category).sort_weight
    || a.sequence_order - b.sequence_order
    || a.title.localeCompare(b.title);
}

export function sortTasksByDirectoryDate(tasks: ExecutionTask[]) {
  return [...tasks].sort((a, b) =>
    getTaskSortDate(a).localeCompare(getTaskSortDate(b))
    || compareTaskPriority(a, b),
  );
}

export function getDirectoryKind(date: string, today = toISODate(new Date()), tasks: ExecutionTask[]): DirectoryGroupKind {
  if (tasks.length > 0 && tasks.every(isDoneOrCancelled)) return 'completed';
  if (date < today) return 'overdue';
  if (date === today) return 'today';
  return 'upcoming';
}

export function formatDirectoryDate(date: string, today = toISODate(new Date())) {
  if (date === today) return 'Today';
  if (date === toISODate(addDays(parseISO(`${today}T00:00:00`), 1))) return 'Tomorrow';
  try {
    return format(parseISO(`${date}T00:00:00`), 'EEE d MMM');
  } catch {
    return date;
  }
}

export function groupTasksByDate(tasks: ExecutionTask[], today = toISODate(new Date())): DirectoryGroup[] {
  const map = new Map<string, ExecutionTask[]>();
  for (const task of tasks) {
    const date = getTaskSortDate(task);
    map.set(date, [...(map.get(date) || []), task]);
  }

  return Array.from(map.entries())
    .map(([date, items]) => {
      const sortedTasks = [...items].sort(compareTaskPriority);
      const openMinutes = sortedTasks
        .filter(countsForDailyLoad)
        .reduce((sum, task) => sum + task.effort_minutes, 0);
      const totalMinutes = sortedTasks.reduce((sum, task) => sum + task.effort_minutes, 0);
      return {
        key: date,
        date,
        label: formatDirectoryDate(date, today),
        kind: getDirectoryKind(date, today, sortedTasks),
        tasks: sortedTasks,
        open_minutes: openMinutes,
        total_minutes: totalMinutes,
        overloaded: openMinutes > DAILY_MAX_MINUTES,
      };
    })
    .sort((a, b) => {
      const kindWeight = (group: DirectoryGroup) => {
        if (group.kind === 'overdue') return 0;
        if (group.kind === 'today') return 1;
        if (group.kind === 'upcoming') return 2;
        return 3;
      };
      return kindWeight(a) - kindWeight(b) || a.date.localeCompare(b.date);
    });
}

export function getTasksForDate(tasks: ExecutionTask[], date: string) {
  return sortTasksByDirectoryDate(tasks.filter((task) => getTaskSortDate(task) === date));
}

export function getTodayTasks(tasks: ExecutionTask[], today = toISODate(new Date())) {
  return getTasksForDate(tasks, today).filter((task) => task.status !== 'Cancelled');
}

export function getWeekDates(startDate = new Date()) {
  return Array.from({ length: 7 }, (_item, index) => toISODate(addDays(startDate, index)));
}

export function getWeekGroups(tasks: ExecutionTask[], startDate = new Date()) {
  const today = toISODate(startDate);
  return getWeekDates(startDate).map((date) => {
    const groupTasks = getTasksForDate(tasks, date);
    const openMinutes = getDateLoad(tasks, date);
    return {
      key: date,
      date,
      label: formatDirectoryDate(date, today),
      kind: getDirectoryKind(date, today, groupTasks),
      tasks: groupTasks,
      open_minutes: openMinutes,
      total_minutes: groupTasks.reduce((sum, task) => sum + task.effort_minutes, 0),
      overloaded: openMinutes > DAILY_MAX_MINUTES,
    } satisfies DirectoryGroup;
  });
}

export function isBeforeDirectoryDate(left: string, right: string) {
  try {
    return isBefore(parseISO(`${left}T00:00:00`), parseISO(`${right}T00:00:00`));
  } catch {
    return left < right;
  }
}
