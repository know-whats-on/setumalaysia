import { createInitialExecutionState, isApprovedSeedSourceDocumentName } from './seed-data';
import {
  EXECUTION_STORAGE_KEY,
  EXECUTION_STORAGE_VERSION,
  type ExecutionAnalyticsEvent,
  type DailyPlan,
  type ExecutionState,
  type ExecutionTask,
  type ExtractedTaskCandidate,
  type SourceDocument,
} from './types';

function cloneState(state: ExecutionState): ExecutionState {
  return JSON.parse(JSON.stringify(state)) as ExecutionState;
}

function safeNow() {
  return new Date().toISOString();
}

function isUserImportedDocument(document: SourceDocument) {
  return document.id.startsWith('doc-import-') || document.path === '[Imported in dashboard]';
}

function isRetainedSourceDocument(document: SourceDocument) {
  return isApprovedSeedSourceDocumentName(document.name) || isUserImportedDocument(document);
}

function normaliseManualTask(task: ExecutionTask, retainedSourceNames: Set<string>): ExecutionTask {
  if (retainedSourceNames.has(task.source_document)) return task;

  return {
    ...task,
    source_document: 'Manual task',
    source_section: task.source_section || 'Manual entry',
    source_excerpt: task.source_excerpt || 'Created manually in the dashboard.',
    ai_generated: false,
    manually_added: true,
  };
}

function reconcileTaskLinks(tasks: ExecutionTask[]): ExecutionTask[] {
  const taskIds = new Set(tasks.map((task) => task.id));
  const cleaned = tasks.map((task) => ({
    ...task,
    dependencies: task.dependencies.filter((dependencyId) => taskIds.has(dependencyId)),
    prerequisite_of: [],
  }));
  const byId = new Map(cleaned.map((task) => [task.id, task]));

  for (const task of cleaned) {
    for (const dependencyId of task.dependencies) {
      const dependency = byId.get(dependencyId);
      if (dependency && !dependency.prerequisite_of.includes(task.id)) {
        dependency.prerequisite_of.push(task.id);
      }
    }
  }

  return cleaned;
}

function cleanDailyPlans(plans: DailyPlan[], retainedTaskIds: Set<string>) {
  return plans.map((plan) => ({
    ...plan,
    task_ids: plan.task_ids.filter((taskId) => retainedTaskIds.has(taskId)),
    locked_task_ids: plan.locked_task_ids.filter((taskId) => retainedTaskIds.has(taskId)),
  }));
}

function cleanExecutionState(state: ExecutionState): ExecutionState {
  const sourceDocuments = state.source_documents.filter(isRetainedSourceDocument);
  const retainedSourceNames = new Set(sourceDocuments.map((document) => document.name));

  const retainedTasks = reconcileTaskLinks(state.tasks
    .filter((task) => retainedSourceNames.has(task.source_document) || task.manually_added)
    .map((task) => task.manually_added ? normaliseManualTask(task, retainedSourceNames) : task));
  const retainedTaskIds = new Set(retainedTasks.map((task) => task.id));
  const retainedCandidates = state.candidate_tasks.filter((candidate) =>
    retainedSourceNames.has(candidate.source_document),
  ) as ExtractedTaskCandidate[];

  return {
    ...state,
    version: EXECUTION_STORAGE_VERSION,
    source_documents: sourceDocuments,
    tasks: retainedTasks,
    candidate_tasks: retainedCandidates,
    daily_plans: cleanDailyPlans(state.daily_plans, retainedTaskIds),
  };
}

export function ensureExecutionState(value: unknown): ExecutionState {
  if (!value || typeof value !== 'object') {
    return createInitialExecutionState();
  }

  const maybe = value as Partial<ExecutionState>;
  if (!Array.isArray(maybe.tasks) || !Array.isArray(maybe.source_documents)) {
    return createInitialExecutionState();
  }

  const migrated: ExecutionState = {
    version: EXECUTION_STORAGE_VERSION,
    source_documents: maybe.source_documents || [],
    tasks: maybe.tasks || [],
    candidate_tasks: maybe.candidate_tasks || [],
    daily_plans: maybe.daily_plans || [],
    analytics_events: maybe.analytics_events || [],
    settings: {
      target_daily_minutes: maybe.settings?.target_daily_minutes || 120,
      min_daily_minutes: maybe.settings?.min_daily_minutes || 90,
      max_daily_minutes: maybe.settings?.max_daily_minutes || 135,
      founder_name: maybe.settings?.founder_name || 'Founder',
    },
    created_at: maybe.created_at || safeNow(),
    updated_at: maybe.updated_at || safeNow(),
  };

  return cleanExecutionState(migrated);
}

export function loadExecutionState(storage: Storage | undefined = typeof window === 'undefined' ? undefined : window.localStorage): ExecutionState {
  if (!storage) return createInitialExecutionState();
  const raw = storage.getItem(EXECUTION_STORAGE_KEY);
  if (!raw) {
    const initial = createInitialExecutionState();
    saveExecutionState(initial, storage);
    return initial;
  }

  try {
    return ensureExecutionState(JSON.parse(raw));
  } catch {
    const fallback = createInitialExecutionState();
    saveExecutionState(fallback, storage);
    return fallback;
  }
}

export function saveExecutionState(
  state: ExecutionState,
  storage: Storage | undefined = typeof window === 'undefined' ? undefined : window.localStorage,
) {
  const next = cloneState({
    ...state,
    version: EXECUTION_STORAGE_VERSION,
    updated_at: safeNow(),
  });
  if (storage) {
    storage.setItem(EXECUTION_STORAGE_KEY, JSON.stringify(next));
  }
  return next;
}

export function resetExecutionState(storage: Storage | undefined = typeof window === 'undefined' ? undefined : window.localStorage) {
  const state = createInitialExecutionState();
  return saveExecutionState(state, storage);
}

export function exportExecutionState(state: ExecutionState) {
  return JSON.stringify(
    {
      ...state,
      exported_at: safeNow(),
    },
    null,
    2,
  );
}

export function importExecutionState(raw: string): ExecutionState {
  const parsed = JSON.parse(raw);
  return ensureExecutionState(parsed);
}

export function createTaskId(title: string, existingTasks: ExecutionTask[]) {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 56) || 'task';
  let candidate = `manual-${base}`;
  let index = 2;
  const ids = new Set(existingTasks.map((task) => task.id));
  while (ids.has(candidate)) {
    candidate = `manual-${base}-${index}`;
    index += 1;
  }
  return candidate;
}

export function createAnalyticsEvent(
  event: ExecutionAnalyticsEvent['event'],
  payload: Record<string, unknown>,
): ExecutionAnalyticsEvent {
  return {
    id: `event-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    event,
    timestamp: safeNow(),
    payload,
  };
}
