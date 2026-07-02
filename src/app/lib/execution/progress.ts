import {
  ACTIVE_PROGRESS_STATUSES,
  READINESS_KEYS,
  TASK_STATUSES,
  type ExecutionProgress,
  type ExecutionTask,
  type ReadinessKey,
  type SourceDocument,
  type TaskStatus,
  type Workstream,
  WORKSTREAMS,
} from './types';

function percent(completed: number, active: number) {
  if (active <= 0) return 0;
  return Math.round((completed / active) * 100);
}

function isActiveForProgress(task: ExecutionTask) {
  return ACTIVE_PROGRESS_STATUSES.includes(task.status);
}

function isDone(task: ExecutionTask) {
  return task.status === 'Done';
}

function getMinutes(tasks: ExecutionTask[]) {
  const active = tasks.filter(isActiveForProgress);
  const done = active.filter(isDone);
  return {
    completed_minutes: done.reduce((sum, task) => sum + task.effort_minutes, 0),
    active_minutes: active.reduce((sum, task) => sum + task.effort_minutes, 0),
    completed_count: done.length,
    active_count: active.length,
  };
}

function bucket(id: string, label: string, tasks: ExecutionTask[]) {
  const minutes = getMinutes(tasks);
  return {
    id,
    label,
    ...minutes,
    percent: percent(minutes.completed_minutes, minutes.active_minutes),
  };
}

function startOfIsoWeek(date: Date) {
  const next = new Date(date);
  const day = next.getDay() || 7;
  next.setDate(next.getDate() - day + 1);
  next.setHours(0, 0, 0, 0);
  return next;
}

function readinessPercent(tasks: ExecutionTask[], matchers: string[]) {
  const matched = tasks.filter((task) => {
    const haystack = `${task.project} ${task.title} ${task.description}`.toLowerCase();
    return matchers.some((matcher) => haystack.includes(matcher));
  });
  return bucket('readiness', 'readiness', matched).percent;
}

export function calculateExecutionProgress(
  tasks: ExecutionTask[],
  sourceDocuments: SourceDocument[],
  now = new Date(),
): ExecutionProgress {
  const activeTasks = tasks.filter(isActiveForProgress);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const weekStart = startOfIsoWeek(now);

  const byWorkstream = WORKSTREAMS.map((workstream: Workstream) =>
    bucket(workstream, workstream, tasks.filter((task) => task.workstream === workstream)),
  );

  const epicNames = Array.from(new Set(activeTasks.map((task) => task.project))).sort();
  const byEpic = epicNames.map((project) =>
    bucket(project, project, tasks.filter((task) => task.project === project)),
  );

  const byDocument = sourceDocuments.map((document) =>
    bucket(
      document.id,
      document.name,
      tasks.filter((task) => task.source_document === document.name),
    ),
  );

  const byStatus = TASK_STATUSES.map((status: TaskStatus) => {
    const matching = tasks.filter((task) => task.status === status);
    return {
      status,
      count: matching.length,
      minutes: matching.reduce((sum, task) => sum + task.effort_minutes, 0),
    };
  });

  const weeklyVelocity = tasks
    .filter((task) => {
      if (task.status !== 'Done' || !task.completed_at) return false;
      const completed = new Date(task.completed_at);
      return completed >= weekStart && completed <= now;
    })
    .reduce((sum, task) => sum + task.effort_minutes, 0);

  const overdueCount = tasks.filter((task) => {
    if (!isActiveForProgress(task) || task.status === 'Done' || !task.due_date) return false;
    const due = new Date(`${task.due_date}T00:00:00`);
    return due < today;
  }).length;

  const readiness: Record<ReadinessKey, number> = {
    'Conference readiness': readinessPercent(tasks, [
      'conference approval',
      'conference invite',
      'conference speaker',
      'conference registration',
      'conference resources',
      'conference pilot',
    ]),
    'LinkedIn content readiness': readinessPercent(tasks, [
      'linkedin operating',
      'linkedin first',
      'linkedin metrics',
      'comment-response',
    ]),
    'Ads setup readiness': readinessPercent(tasks, [
      'meta ads',
      'paid ads',
      'business manager',
      'conversion event',
    ]),
    'Outreach readiness': readinessPercent(tasks, [
      'crm operating',
      'public-sector document',
      'first public-sector',
      'warm outreach',
      'partner asset',
      'university outreach',
    ]),
    'ASO readiness': readinessPercent(tasks, [
      'aso prerequisites',
      'store metadata',
      'keyword',
      'screenshot',
    ]),
    'Pitch deck readiness': readinessPercent(tasks, [
      'pitch proof',
      'investor',
      'narrative',
    ]),
  };

  for (const key of READINESS_KEYS) {
    readiness[key] = readiness[key] || 0;
  }

  return {
    overall: bucket('overall', 'Overall progress', tasks),
    by_workstream: byWorkstream,
    by_epic: byEpic,
    by_document: byDocument,
    by_status: byStatus,
    readiness,
    weekly_velocity_minutes: weeklyVelocity,
    overdue_count: overdueCount,
    blocked_count: tasks.filter((task) => task.status === 'Blocked').length,
  };
}
