import { toISODate } from './seed-data';
import {
  PLANNABLE_STATUSES,
  type DailyPlan,
  type ExecutionTask,
  type PlannerResult,
  type TaskCategory,
  type TaskImpact,
  type TaskPriority,
  type TaskUrgency,
} from './types';

const PLANNER_VERSION = 'mvp-v1';

function numericPriority(priority: TaskPriority) {
  switch (priority) {
    case 'Critical':
      return 4;
    case 'High':
      return 3;
    case 'Medium':
      return 2;
    default:
      return 1;
  }
}

function numericImpact(impact: TaskImpact) {
  switch (impact) {
    case 'High':
      return 3;
    case 'Medium':
      return 2;
    default:
      return 1;
  }
}

function numericUrgency(urgency: TaskUrgency) {
  switch (urgency) {
    case 'High':
      return 3;
    case 'Medium':
      return 2;
    default:
      return 1;
  }
}

function taskIsDueOrReady(task: ExecutionTask, date: string) {
  if (!task.scheduled_date) return true;
  return task.scheduled_date <= date;
}

function dependenciesDone(task: ExecutionTask, tasksById: Map<string, ExecutionTask>) {
  return task.dependencies.every((dependencyId) => tasksById.get(dependencyId)?.status === 'Done');
}

function isOverdue(task: ExecutionTask, date: string) {
  return Boolean(task.due_date && task.due_date < date && task.status !== 'Done');
}

function categoryBucket(category: TaskCategory, effort: number) {
  if (effort <= 25) return 'quick';
  if (category === 'follow-up' || category === 'admin' || category === 'outreach') return 'follow-up';
  if (category === 'setup' || category === 'analytics' || category === 'review' || category === 'research') return 'setup';
  return 'deep';
}

function scoreTask(
  task: ExecutionTask,
  date: string,
  selectedWorkstreams: Set<string>,
  lastScheduledByWorkstream: Map<string, string>,
) {
  const overdue = isOverdue(task, date) ? 1 : 0;
  const lastScheduled = lastScheduledByWorkstream.get(task.workstream);
  const staleWorkstream = !lastScheduled || lastScheduled < date ? 1 : 0;
  const contextPenalty = selectedWorkstreams.size >= 4 && !selectedWorkstreams.has(task.workstream) ? 5 : 0;
  return (
    overdue * 5
    + numericImpact(task.impact) * 3
    + numericPriority(task.priority) * 2
    + numericUrgency(task.urgency) * 2
    + staleWorkstream * 2
    - contextPenalty
  );
}

function getLastScheduledByWorkstream(tasks: ExecutionTask[]) {
  const map = new Map<string, string>();
  for (const task of tasks) {
    if (!task.scheduled_date) continue;
    const current = map.get(task.workstream);
    if (!current || task.scheduled_date > current) {
      map.set(task.workstream, task.scheduled_date);
    }
  }
  return map;
}

function addTask(
  task: ExecutionTask | undefined,
  selected: ExecutionTask[],
  selectedIds: Set<string>,
  selectedWorkstreams: Set<string>,
  maxMinutes: number,
) {
  if (!task || selectedIds.has(task.id)) return false;
  const total = selected.reduce((sum, item) => sum + item.effort_minutes, 0);
  if (total + task.effort_minutes > maxMinutes) return false;
  selected.push(task);
  selectedIds.add(task.id);
  selectedWorkstreams.add(task.workstream);
  return true;
}

export function getEligibleTasks(tasks: ExecutionTask[], date: string) {
  const tasksById = new Map(tasks.map((task) => [task.id, task]));
  return tasks.filter((task) => {
    if (!PLANNABLE_STATUSES.includes(task.status)) return false;
    if (!taskIsDueOrReady(task, date)) return false;
    if (!dependenciesDone(task, tasksById)) return false;
    return true;
  });
}

export function generateDailyPlan(
  tasks: ExecutionTask[],
  date = toISODate(new Date()),
  options?: {
    targetMinutes?: number;
    minMinutes?: number;
    maxMinutes?: number;
    lockedTaskIds?: string[];
  },
): PlannerResult {
  const targetMinutes = options?.targetMinutes || 120;
  const minMinutes = options?.minMinutes || 90;
  const maxMinutes = options?.maxMinutes || 135;
  const lockedTaskIds = options?.lockedTaskIds || [];
  const selected: ExecutionTask[] = [];
  const selectedIds = new Set<string>();
  const selectedWorkstreams = new Set<string>();
  const warnings: string[] = [];
  const eligible = getEligibleTasks(tasks, date);
  const eligibleById = new Map(eligible.map((task) => [task.id, task]));
  const lastScheduledByWorkstream = getLastScheduledByWorkstream(tasks);

  for (const lockedId of lockedTaskIds) {
    const lockedTask = eligibleById.get(lockedId);
    if (!lockedTask) {
      warnings.push(`Locked task ${lockedId} is not eligible today.`);
      continue;
    }
    addTask(lockedTask, selected, selectedIds, selectedWorkstreams, maxMinutes);
  }

  const sortByScore = (items: ExecutionTask[]) =>
    [...items].sort((a, b) =>
      scoreTask(b, date, selectedWorkstreams, lastScheduledByWorkstream)
      - scoreTask(a, date, selectedWorkstreams, lastScheduledByWorkstream)
      || a.sequence_order - b.sequence_order,
    );

  const buckets = {
    deep: sortByScore(eligible.filter((task) => categoryBucket(task.category, task.effort_minutes) === 'deep' || task.effort_minutes >= 30)),
    quick: sortByScore(eligible.filter((task) => categoryBucket(task.category, task.effort_minutes) === 'quick')),
    followUp: sortByScore(eligible.filter((task) => categoryBucket(task.category, task.effort_minutes) === 'follow-up')),
    setup: sortByScore(eligible.filter((task) => categoryBucket(task.category, task.effort_minutes) === 'setup')),
  };

  addTask(buckets.deep[0], selected, selectedIds, selectedWorkstreams, maxMinutes);
  addTask(buckets.quick[0], selected, selectedIds, selectedWorkstreams, maxMinutes);
  addTask(buckets.followUp[0], selected, selectedIds, selectedWorkstreams, maxMinutes);
  addTask(buckets.setup[0], selected, selectedIds, selectedWorkstreams, maxMinutes);

  const ranked = sortByScore(eligible);
  while (selected.reduce((sum, task) => sum + task.effort_minutes, 0) < targetMinutes) {
    const next = ranked.find((task) => !selectedIds.has(task.id));
    if (!next) break;
    if (!addTask(next, selected, selectedIds, selectedWorkstreams, maxMinutes)) {
      selectedIds.add(next.id);
    }
  }

  let total = selected.reduce((sum, task) => sum + task.effort_minutes, 0);
  if (total < minMinutes && eligible.length > selected.length) {
    warnings.push('The plan is under 90 minutes because too few eligible tasks fit without breaking dependencies.');
  }

  if (total > maxMinutes) {
    selected.sort((a, b) => a.effort_minutes - b.effort_minutes);
    while (total > maxMinutes && selected.length > 1) {
      const removed = selected.pop();
      if (!removed) break;
      total -= removed.effort_minutes;
    }
  }

  const plan: DailyPlan = {
    id: `plan-${date}`,
    date,
    task_ids: selected.map((task) => task.id),
    target_minutes: targetMinutes,
    locked_task_ids: lockedTaskIds.filter((id) => selectedIds.has(id)),
    generated_at: new Date().toISOString(),
    planner_version: PLANNER_VERSION,
  };

  return { plan, tasks: selected, warnings };
}

export function generateWeekPlans(tasks: ExecutionTask[], startDate = new Date()) {
  const plans: PlannerResult[] = [];
  let workingTasks = tasks.map((task) => ({ ...task }));
  for (let index = 0; index < 7; index += 1) {
    const date = toISODate(new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + index));
    const result = generateDailyPlan(workingTasks, date);
    plans.push(result);
    workingTasks = workingTasks.map((task) =>
      result.plan.task_ids.includes(task.id)
        ? { ...task, scheduled_date: date }
        : task,
    );
  }
  return plans;
}
