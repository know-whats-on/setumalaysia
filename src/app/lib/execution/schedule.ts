import { addDays, parseISO } from 'date-fns';
import {
  DAILY_MAX_MINUTES,
  countsForDailyLoad,
  getDateLoad,
  getTaskSortDate,
  isBeforeDirectoryDate,
} from './directory';
import { toISODate } from './seed-data';
import type { ExecutionTask, TaskImpact, TaskPriority, TaskStatus, TaskUrgency } from './types';

type ScheduleOptions = {
  maxMinutes?: number;
  lockedTaskIds?: string[];
  pinnedTaskIds?: string[];
  auditNote?: string;
};

const UNMOVABLE_STATUSES: TaskStatus[] = [
  'Done',
  'Cancelled',
  'Blocked',
  'Waiting for reply',
  'Needs review',
];

function nextDay(date: string) {
  return toISODate(addDays(parseISO(`${date}T00:00:00`), 1));
}

function numericPriority(priority: TaskPriority) {
  if (priority === 'Critical') return 4;
  if (priority === 'High') return 3;
  if (priority === 'Medium') return 2;
  return 1;
}

function numericImpact(impact: TaskImpact) {
  if (impact === 'High') return 3;
  if (impact === 'Medium') return 2;
  return 1;
}

function numericUrgency(urgency: TaskUrgency) {
  if (urgency === 'High') return 3;
  if (urgency === 'Medium') return 2;
  return 1;
}

function appendAuditNote(task: ExecutionTask, note: string | undefined) {
  if (!note) return task.notes;
  const current = task.notes?.trim();
  if (current?.includes(note)) return current;
  return current ? `${current}\n${note}` : note;
}

function setTaskDate(task: ExecutionTask, date: string, note?: string): ExecutionTask {
  return {
    ...task,
    scheduled_date: date,
    due_date: date,
    notes: appendAuditNote(task, note),
    updated_at: new Date().toISOString(),
  };
}

function latestTaskDate(tasks: ExecutionTask[], fallback: string) {
  return tasks.reduce((latest, task) => {
    const date = getTaskSortDate(task);
    return date > latest ? date : latest;
  }, fallback);
}

function moveRank(task: ExecutionTask) {
  return numericPriority(task.priority) * 100
    + numericImpact(task.impact) * 20
    + numericUrgency(task.urgency) * 5
    - task.effort_minutes / 100;
}

export function getMovableTasksForDate(
  tasks: ExecutionTask[],
  date: string,
  options: ScheduleOptions = {},
) {
  const locked = new Set(options.lockedTaskIds || []);
  const pinned = new Set(options.pinnedTaskIds || []);
  return tasks
    .filter((task) =>
      getTaskSortDate(task) === date
      && countsForDailyLoad(task)
      && !UNMOVABLE_STATUSES.includes(task.status)
      && !locked.has(task.id)
      && !pinned.has(task.id),
    )
    .sort((a, b) =>
      moveRank(a) - moveRank(b)
      || b.effort_minutes - a.effort_minutes
      || b.sequence_order - a.sequence_order,
    );
}

export function enforceDependencyDates(tasks: ExecutionTask[], auditNote?: string) {
  let nextTasks = tasks;
  for (let guard = 0; guard < 40; guard += 1) {
    let changed = false;
    const byId = new Map(nextTasks.map((task) => [task.id, task]));
    nextTasks = nextTasks.map((task) => {
      let requiredDate = getTaskSortDate(task);
      for (const dependencyId of task.dependencies) {
        const dependency = byId.get(dependencyId);
        if (!dependency) continue;
        const dependencyDate = getTaskSortDate(dependency);
        if (isBeforeDirectoryDate(requiredDate, dependencyDate)) {
          requiredDate = dependencyDate;
        }
      }
      if (requiredDate === getTaskSortDate(task)) return task;
      changed = true;
      return setTaskDate(task, requiredDate, auditNote);
    });
    if (!changed) return nextTasks;
  }
  return nextTasks;
}

export function cascadeScheduleFromDate(
  tasks: ExecutionTask[],
  startDate: string,
  options: ScheduleOptions = {},
) {
  const maxMinutes = options.maxMinutes || DAILY_MAX_MINUTES;
  const auditNote = options.auditNote || 'Moved because previous day was not completed.';
  let nextTasks = enforceDependencyDates(tasks, auditNote);
  let cursor = startDate;
  let lastDate = latestTaskDate(nextTasks, startDate);

  for (let guard = 0; guard < 120; guard += 1) {
    const load = getDateLoad(nextTasks, cursor);
    if (load <= maxMinutes) {
      if (cursor >= lastDate) break;
      cursor = nextDay(cursor);
      continue;
    }

    const movable = getMovableTasksForDate(nextTasks, cursor, options);
    if (movable.length === 0) {
      if (cursor >= lastDate) break;
      cursor = nextDay(cursor);
      continue;
    }

    const taskToMove = movable[0];
    const targetDate = nextDay(cursor);
    nextTasks = nextTasks.map((task) =>
      task.id === taskToMove.id ? setTaskDate(task, targetDate, auditNote) : task,
    );
    nextTasks = enforceDependencyDates(nextTasks, auditNote);
    if (targetDate > lastDate) lastDate = targetDate;
  }

  return nextTasks;
}

export function moveTaskToNextDay(
  tasks: ExecutionTask[],
  taskId: string,
  fromDate = toISODate(new Date()),
  options: ScheduleOptions = {},
) {
  const task = tasks.find((item) => item.id === taskId);
  if (!task) return tasks;
  const currentDate = getTaskSortDate(task);
  const baseDate = currentDate > fromDate ? currentDate : fromDate;
  const targetDate = nextDay(baseDate);
  const auditNote = options.auditNote || 'Moved because previous day was not completed.';
  const moved = tasks.map((item) =>
    item.id === taskId ? setTaskDate(item, targetDate, auditNote) : item,
  );
  return cascadeScheduleFromDate(moved, targetDate, {
    ...options,
    auditNote,
    pinnedTaskIds: [...(options.pinnedTaskIds || []), taskId],
  });
}

export function assignTaskToNextAvailableDate(
  tasks: ExecutionTask[],
  task: ExecutionTask,
  startDate = toISODate(new Date()),
  options: ScheduleOptions = {},
) {
  const maxMinutes = options.maxMinutes || DAILY_MAX_MINUTES;
  const byId = new Map(tasks.map((item) => [item.id, item]));
  let cursor = getTaskSortDate({ ...task, scheduled_date: task.scheduled_date || startDate });

  if (isBeforeDirectoryDate(cursor, startDate)) {
    cursor = startDate;
  }

  for (const dependencyId of task.dependencies) {
    const dependency = byId.get(dependencyId);
    if (!dependency) continue;
    const dependencyDate = getTaskSortDate(dependency);
    if (isBeforeDirectoryDate(cursor, dependencyDate)) {
      cursor = dependencyDate;
    }
  }

  for (let guard = 0; guard < 120; guard += 1) {
    const load = getDateLoad(tasks, cursor);
    const dayHasNoLoad = load === 0;
    if (load + task.effort_minutes <= maxMinutes || dayHasNoLoad) {
      return setTaskDate(task, cursor);
    }
    cursor = nextDay(cursor);
  }

  return setTaskDate(task, cursor);
}

export function scheduleUndatedTasks(tasks: ExecutionTask[], startDate = toISODate(new Date())) {
  let scheduled: ExecutionTask[] = [];
  for (const task of tasks) {
    const hasDate = Boolean(task.scheduled_date || task.due_date);
    const normalised = hasDate
      ? {
          ...task,
          scheduled_date: task.scheduled_date || task.due_date,
          due_date: task.due_date || task.scheduled_date,
        }
      : assignTaskToNextAvailableDate(scheduled, task, startDate, {
          auditNote: 'Scheduled into the task directory.',
        });
    scheduled = [...scheduled, normalised];
  }
  return enforceDependencyDates(scheduled, 'Moved to keep prerequisites before dependent tasks.');
}

export function rebalanceDateRange(tasks: ExecutionTask[], startDate: string, options: ScheduleOptions = {}) {
  return cascadeScheduleFromDate(enforceDependencyDates(tasks), startDate, options);
}
