import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  AlertCircle,
  Archive,
  BarChart3,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Clock,
  Eye,
  FileText,
  Focus,
  Image,
  LayoutList,
  PenLine,
  Plus,
  Reply,
  Search,
  Send,
  Sparkles,
  Target,
  Upload,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Calendar } from '../ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Progress } from '../ui/progress';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '../ui/sheet';
import { Textarea } from '../ui/textarea';
import { useIsMobile } from '../ui/use-mobile';
import { cn } from '../ui/utils';
import {
  DAILY_MAX_MINUTES,
  DAILY_TARGET_MINUTES,
  type DirectoryGroup,
  formatDirectoryDate,
  getDateLoad,
  getTaskSortDate,
  getTodayTasks,
  getWeekGroups,
  groupTasksByDate,
  sortTasksByDirectoryDate,
} from '../../lib/execution/directory';
import { extractTaskCandidatesFromMarkdown } from '../../lib/execution/extract';
import {
  PROJECT_TYPE_META,
  getProjectTypeMeta,
  type ProjectTypeMeta,
} from '../../lib/execution/project-types';
import {
  assignTaskToNextAvailableDate,
  cascadeScheduleFromDate,
  moveTaskToNextDay,
  rebalanceDateRange,
  scheduleUndatedTasks,
} from '../../lib/execution/schedule';
import { toISODate } from '../../lib/execution/seed-data';
import {
  createAnalyticsEvent,
  createTaskId,
  exportExecutionState,
  importExecutionState,
  loadExecutionState,
  resetExecutionState,
  saveExecutionState,
} from '../../lib/execution/storage';
import {
  READINESS_KEYS,
  TASK_CATEGORIES,
  TASK_STATUSES,
  WORKSTREAMS,
  type ExecutionProgress,
  type ExecutionState,
  type ExecutionTask,
  type ExtractedTaskCandidate,
  type SourceDocument,
  type TaskCategory,
  type TaskImpact,
  type TaskPriority,
  type TaskStatus,
  type TaskUrgency,
  type Workstream,
} from '../../lib/execution/types';
import { calculateExecutionProgress } from '../../lib/execution/progress';

type PrimaryView = 'today' | 'week' | 'directory' | 'projects' | 'more';
type CommitOptions = {
  event?: Parameters<typeof createAnalyticsEvent>[0];
  payload?: Record<string, unknown>;
};

const primaryViews: Array<{ id: PrimaryView; label: string; icon: LucideIcon }> = [
  { id: 'today', label: 'Today', icon: Target },
  { id: 'week', label: 'Week', icon: CalendarDays },
  { id: 'directory', label: 'Directory', icon: LayoutList },
  { id: 'projects', label: 'Projects', icon: BarChart3 },
  { id: 'more', label: 'More', icon: Sparkles },
];

const statusTone: Record<TaskStatus, string> = {
  'Not started': 'border-slate-200 bg-slate-50 text-slate-700',
  'In progress': 'border-blue-200 bg-blue-50 text-blue-700',
  Done: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  'Not done': 'border-amber-200 bg-amber-50 text-amber-700',
  Skipped: 'border-stone-200 bg-stone-50 text-stone-700',
  Deferred: 'border-indigo-200 bg-indigo-50 text-indigo-700',
  Blocked: 'border-red-200 bg-red-50 text-red-700',
  'Waiting for reply': 'border-cyan-200 bg-cyan-50 text-cyan-700',
  'Needs review': 'border-violet-200 bg-violet-50 text-violet-700',
  Recurring: 'border-teal-200 bg-teal-50 text-teal-700',
  Cancelled: 'border-slate-200 bg-slate-100 text-slate-500',
};

const statusDescriptions: Record<TaskStatus, string> = {
  'Not started': 'Ready when its date arrives.',
  'In progress': 'Keep visible in today.',
  Done: 'Counts towards progress.',
  'Not done': 'Move to tomorrow and rebalance the week.',
  Skipped: 'Move to tomorrow without completion credit.',
  Deferred: 'Move out of today and rebalance.',
  Blocked: 'Remove from daily load until unblocked.',
  'Waiting for reply': 'Remove from daily load until follow-up.',
  'Needs review': 'Hold outside execution.',
  Recurring: 'Template or recurring work.',
  Cancelled: 'Remove from active progress.',
};

const projectIcons: Record<ProjectTypeMeta['icon'], LucideIcon> = {
  Wrench,
  Focus,
  Zap,
  Send,
  Reply,
  PenLine,
  Search,
  Clipboard: ClipboardList,
  Chart: BarChart3,
  Eye,
  Image,
};

function taskMinutes(tasks: ExecutionTask[]) {
  return tasks.reduce((sum, task) => sum + task.effort_minutes, 0);
}

function isOpenTask(task: ExecutionTask) {
  return task.status !== 'Done' && task.status !== 'Cancelled';
}

function taskMatchesSearch(task: ExecutionTask, search: string) {
  if (!search.trim()) return true;
  const q = search.toLowerCase();
  return [
    task.title,
    task.description,
    task.source_document,
    task.source_section,
    task.workstream,
    task.project,
    task.category,
    task.related_partner,
    task.related_campaign,
    task.related_city,
  ].some((value) => String(value || '').toLowerCase().includes(q));
}

function parseDate(date: string | undefined) {
  if (!date) return undefined;
  try {
    return parseISO(`${date.slice(0, 10)}T00:00:00`);
  } catch {
    return undefined;
  }
}

function displayDate(date: string | undefined) {
  if (!date) return 'No date';
  try {
    return format(parseISO(`${date.slice(0, 10)}T00:00:00`), 'd MMM');
  } catch {
    return date;
  }
}

function getLockedTaskIds(state: ExecutionState) {
  return state.daily_plans.flatMap((plan) => plan.locked_task_ids);
}

function loadDatedExecutionState() {
  const loaded = loadExecutionState();
  const datedTasks = scheduleUndatedTasks(loaded.tasks, toISODate(new Date()));
  const changed = JSON.stringify(loaded.tasks.map((task) => [task.id, task.scheduled_date, task.due_date]))
    !== JSON.stringify(datedTasks.map((task) => [task.id, task.scheduled_date, task.due_date]));
  if (!changed) return loaded;
  return saveExecutionState({
    ...loaded,
    tasks: datedTasks,
  });
}

export function ExecutionDashboard() {
  const [state, setState] = useState<ExecutionState>(() => loadDatedExecutionState());
  const [activeView, setActiveView] = useState<PrimaryView>('today');
  const [search, setSearch] = useState('');
  const [workstreamFilter, setWorkstreamFilter] = useState<Workstream | 'All'>('All');
  const [projectFilter, setProjectFilter] = useState<TaskCategory | 'All'>('All');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const today = toISODate(new Date());

  const progress = useMemo(
    () => calculateExecutionProgress(state.tasks, state.source_documents),
    [state.source_documents, state.tasks],
  );
  const tasksById = useMemo(() => new Map(state.tasks.map((task) => [task.id, task])), [state.tasks]);
  const selectedTask = selectedTaskId ? tasksById.get(selectedTaskId) || null : null;
  const lockedTaskIds = useMemo(() => getLockedTaskIds(state), [state]);

  const commit = (updater: (current: ExecutionState) => ExecutionState, options?: CommitOptions) => {
    setState((current) => {
      const nextBase = updater(current);
      const next = options?.event
        ? {
            ...nextBase,
            analytics_events: [
              createAnalyticsEvent(options.event, options.payload || {}),
              ...nextBase.analytics_events,
            ].slice(0, 300),
          }
        : nextBase;
      return saveExecutionState(next);
    });
  };

  const updateTask = (taskId: string, patch: Partial<ExecutionTask>, options?: CommitOptions) => {
    commit((current) => {
      const patchedTasks = current.tasks.map((task) =>
        task.id === taskId
          ? { ...task, ...patch, updated_at: new Date().toISOString() }
          : task,
      );
      const startDate = patch.scheduled_date || patch.due_date || today;
      return {
        ...current,
        tasks: rebalanceDateRange(patchedTasks, startDate, {
          lockedTaskIds: getLockedTaskIds(current),
        }),
      };
    }, options);
  };

  const handleStatusChange = (task: ExecutionTask, status: TaskStatus) => {
    const now = new Date();
    const nowIso = now.toISOString();
    const locked = lockedTaskIds;
    let event: CommitOptions['event'] | undefined;
    let payload: Record<string, unknown> = {
      task_id: task.id,
      workstream: task.workstream,
      status,
      effort_minutes: task.effort_minutes,
    };

    commit((current) => {
      let tasks = current.tasks.map((item) => {
        if (item.id !== task.id) return item;
        const base: ExecutionTask = {
          ...item,
          status,
          updated_at: nowIso,
          completed_at: status === 'Done' ? nowIso : undefined,
        };
        if (status === 'Done') {
          return {
            ...base,
            completion_proof: item.completion_proof || 'Marked complete in Hoodie Execution Command Centre.',
          };
        }
        if (status === 'Waiting for reply') {
          const followUpDate = toISODate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 4));
          payload = { ...payload, next_followup_date: followUpDate };
          return { ...base, scheduled_date: followUpDate, due_date: followUpDate };
        }
        return base;
      });

      if (status === 'Done') event = 'task_completed';
      if (status === 'Not done') {
        event = 'task_not_done';
        tasks = moveTaskToNextDay(tasks, task.id, today, { lockedTaskIds: locked });
      }
      if (status === 'Skipped') {
        tasks = moveTaskToNextDay(tasks, task.id, today, {
          lockedTaskIds: locked,
          auditNote: 'Moved because it was skipped.',
        });
      }
      if (status === 'Deferred') {
        event = 'task_deferred';
        tasks = moveTaskToNextDay(tasks, task.id, today, {
          lockedTaskIds: locked,
          auditNote: 'Deferred by founder.',
        });
      }
      if (status === 'Blocked') event = 'task_blocked';
      if (status === 'Waiting for reply') event = 'followup_scheduled';

      return {
        ...current,
        tasks: status === 'Done'
          ? tasks
          : cascadeScheduleFromDate(tasks, today, { lockedTaskIds: locked }),
      };
    }, event ? { event, payload } : undefined);
  };

  const addManualTask = (input: Omit<ExecutionTask, 'id' | 'created_at' | 'updated_at' | 'sequence_order' | 'prerequisite_of'>) => {
    const now = new Date().toISOString();
    commit((current) => {
      const id = createTaskId(input.title, current.tasks);
      const draft: ExecutionTask = {
        ...input,
        id,
        sequence_order: current.tasks.length + 1,
        prerequisite_of: [],
        created_at: now,
        updated_at: now,
      };
      const task = assignTaskToNextAvailableDate(current.tasks, draft, input.scheduled_date || today);
      return {
        ...current,
        tasks: rebalanceDateRange([...current.tasks, task], getTaskSortDate(task), {
          lockedTaskIds: getLockedTaskIds(current),
        }),
      };
    }, {
      event: 'task_created',
      payload: { workstream: input.workstream, manual: true },
    });
  };

  const deleteTask = (taskId: string) => {
    commit((current) => ({
      ...current,
      tasks: current.tasks
        .filter((task) => task.id !== taskId)
        .map((task) => ({
          ...task,
          dependencies: task.dependencies.filter((dependency) => dependency !== taskId),
          prerequisite_of: task.prerequisite_of.filter((child) => child !== taskId),
        })),
      daily_plans: current.daily_plans.map((plan) => ({
        ...plan,
        task_ids: plan.task_ids.filter((id) => id !== taskId),
        locked_task_ids: plan.locked_task_ids.filter((id) => id !== taskId),
      })),
    }));
    setSelectedTaskId(null);
  };

  const acceptCandidate = (candidate: ExtractedTaskCandidate) => {
    const now = new Date().toISOString();
    commit((current) => {
      const taskId = createTaskId(candidate.title, current.tasks);
      const draft: ExecutionTask = {
        id: taskId,
        title: candidate.title,
        description: candidate.description,
        source_document: candidate.source_document,
        source_section: candidate.source_section,
        source_excerpt: candidate.source_excerpt,
        workstream: candidate.workstream,
        category: candidate.category,
        project: candidate.project,
        priority: candidate.priority,
        impact: candidate.impact,
        effort_minutes: candidate.effort_minutes,
        urgency: candidate.urgency,
        status: 'Not started',
        due_date: candidate.due_date,
        scheduled_date: candidate.scheduled_date,
        dependencies: candidate.dependencies,
        prerequisite_of: candidate.prerequisite_of,
        sequence_order: current.tasks.length + 1,
        owner: candidate.owner,
        related_partner: candidate.related_partner,
        related_campaign: candidate.related_campaign,
        related_event: candidate.related_event,
        related_platform: candidate.related_platform,
        related_city: candidate.related_city,
        link: candidate.link,
        notes: candidate.notes,
        evidence_required: candidate.evidence_required,
        completion_proof: candidate.completion_proof,
        ai_generated: candidate.ai_generated,
        manually_added: false,
        created_at: now,
        updated_at: now,
      };
      const task = assignTaskToNextAvailableDate(current.tasks, draft, draft.scheduled_date || today);
      return {
        ...current,
        tasks: rebalanceDateRange([...current.tasks, task], getTaskSortDate(task), {
          lockedTaskIds: getLockedTaskIds(current),
        }),
        candidate_tasks: current.candidate_tasks.map((item) =>
          item.id === candidate.id
            ? { ...item, candidate_status: 'accepted', accepted_task_id: taskId, updated_at: now }
            : item,
        ),
      };
    }, {
      event: 'task_accepted',
      payload: { candidate_id: candidate.id, workstream: candidate.workstream },
    });
  };

  const updateCandidate = (candidateId: string, patch: Partial<ExtractedTaskCandidate>) => {
    commit((current) => ({
      ...current,
      candidate_tasks: current.candidate_tasks.map((candidate) =>
        candidate.id === candidateId
          ? { ...candidate, ...patch, updated_at: new Date().toISOString() }
          : candidate,
      ),
    }));
  };

  const setCandidateStatus = (candidate: ExtractedTaskCandidate, candidateStatus: ExtractedTaskCandidate['candidate_status']) => {
    commit((current) => ({
      ...current,
      candidate_tasks: current.candidate_tasks.map((item) =>
        item.id === candidate.id
          ? { ...item, candidate_status: candidateStatus, updated_at: new Date().toISOString() }
          : item,
      ),
    }), {
      event: candidateStatus === 'rejected' ? 'task_rejected' : 'tasks_extracted',
      payload: { candidate_id: candidate.id, status: candidateStatus },
    });
  };

  const addImportedCandidates = (document: SourceDocument, candidates: ExtractedTaskCandidate[]) => {
    commit((current) => ({
      ...current,
      source_documents: current.source_documents.some((item) => item.id === document.id)
        ? current.source_documents.map((item) => item.id === document.id ? document : item)
        : [document, ...current.source_documents],
      candidate_tasks: [...candidates, ...current.candidate_tasks],
    }), {
      event: 'document_imported',
      payload: { document_id: document.id, document_name: document.name, extracted_count: candidates.length },
    });
  };

  const filteredTasks = useMemo(() => sortTasksByDirectoryDate(state.tasks.filter((task) =>
    (workstreamFilter === 'All' || task.workstream === workstreamFilter)
    && (projectFilter === 'All' || task.category === projectFilter)
    && taskMatchesSearch(task, search),
  )), [projectFilter, search, state.tasks, workstreamFilter]);

  const todayTasks = useMemo(() => getTodayTasks(filteredTasks, today), [filteredTasks, today]);
  const weekGroups = useMemo(() => getWeekGroups(filteredTasks, new Date()), [filteredTasks]);
  const directoryGroups = useMemo(() => groupTasksByDate(filteredTasks, today), [filteredTasks, today]);
  const blockedTasks = state.tasks.filter((task) => task.status === 'Blocked');
  const waitingTasks = state.tasks.filter((task) => task.status === 'Waiting for reply');

  return (
    <div className="min-h-screen bg-[#F6F7F9] pb-24 text-[#111827] md:pb-0">
      <ExecutionHeader
        progress={progress}
        todayTasks={todayTasks}
        allTasks={state.tasks}
        onQuickAdd={() => setQuickAddOpen(true)}
        onImport={() => setImportOpen(true)}
        onExport={() => {
          const blob = new Blob([exportExecutionState(state)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `hoodie-execution-${today}.json`;
          link.click();
          URL.revokeObjectURL(url);
        }}
        onReset={() => {
          if (window.confirm('Reset the local Hoodie Execution Dashboard seed data?')) {
            setState(resetExecutionState());
          }
        }}
      />

      <div className="mx-auto grid max-w-[1340px] gap-4 px-3 py-4 md:grid-cols-[230px_minmax(0,1fr)] md:px-4">
        <aside className="hidden md:block">
          <DesktopNavigation
            activeView={activeView}
            onViewChange={setActiveView}
            search={search}
            onSearchChange={setSearch}
            workstreamFilter={workstreamFilter}
            projectFilter={projectFilter}
            onWorkstreamChange={setWorkstreamFilter}
            onProjectChange={setProjectFilter}
          />
        </aside>

        <main className="min-w-0 space-y-4">
          <MobileSearchAndFilters
            search={search}
            onSearchChange={setSearch}
            onOpenFilters={() => setFilterOpen(true)}
            projectFilter={projectFilter}
            workstreamFilter={workstreamFilter}
          />

          {quickAddOpen && (
            <QuickAddTask
              onAdd={addManualTask}
              onCancel={() => setQuickAddOpen(false)}
              defaultDate={today}
            />
          )}

          {activeView === 'today' && (
            <TodayView
              tasks={todayTasks}
              blockedTasks={blockedTasks}
              waitingTasks={waitingTasks}
              onStatusChange={handleStatusChange}
              onSelectTask={(task) => setSelectedTaskId(task.id)}
            />
          )}
          {activeView === 'week' && (
            <WeekView
              groups={weekGroups}
              onStatusChange={handleStatusChange}
              onSelectTask={(task) => setSelectedTaskId(task.id)}
            />
          )}
          {activeView === 'directory' && (
            <DirectoryView
              groups={directoryGroups}
              onStatusChange={handleStatusChange}
              onSelectTask={(task) => setSelectedTaskId(task.id)}
            />
          )}
          {activeView === 'projects' && (
            <ProjectsView
              tasks={filteredTasks}
              onProjectSelect={(project) => {
                setProjectFilter(project);
                setActiveView('directory');
              }}
            />
          )}
          {activeView === 'more' && (
            <MoreView
              state={state}
              progress={progress}
              onAccept={acceptCandidate}
              onReject={(candidate) => setCandidateStatus(candidate, 'rejected')}
              onDefer={(candidate) => setCandidateStatus(candidate, 'deferred')}
              onMerge={(candidate) => setCandidateStatus(candidate, 'merged')}
              onUpdateCandidate={updateCandidate}
              onSelectTask={(task) => setSelectedTaskId(task.id)}
              onStatusChange={handleStatusChange}
              onOpenSource={(document) => commit((current) => current, {
                event: 'source_document_opened',
                payload: { document_id: document.id },
              })}
            />
          )}
        </main>
      </div>

      <MobileExecutionTabs activeView={activeView} onViewChange={setActiveView} />

      <TaskEditSheet
        task={selectedTask}
        onOpenChange={(open) => !open && setSelectedTaskId(null)}
        onSave={(taskId, patch) => updateTask(taskId, patch)}
        onDelete={deleteTask}
        onStatusChange={handleStatusChange}
      />

      <FilterSheet
        open={filterOpen}
        onOpenChange={setFilterOpen}
        search={search}
        onSearchChange={setSearch}
        workstreamFilter={workstreamFilter}
        projectFilter={projectFilter}
        onWorkstreamChange={setWorkstreamFilter}
        onProjectChange={setProjectFilter}
      />

      <ImportDocumentsPanel
        open={importOpen}
        onOpenChange={setImportOpen}
        existingTasks={state.tasks}
        onImportJson={(raw) => {
          const imported = importExecutionState(raw);
          setState(saveExecutionState({
            ...imported,
            tasks: scheduleUndatedTasks(imported.tasks, today),
          }));
          setImportOpen(false);
        }}
        onImportMarkdown={addImportedCandidates}
      />
    </div>
  );
}

function ExecutionHeader({
  progress,
  todayTasks,
  allTasks,
  onQuickAdd,
  onImport,
  onExport,
  onReset,
}: {
  progress: ExecutionProgress;
  todayTasks: ExecutionTask[];
  allTasks: ExecutionTask[];
  onQuickAdd: () => void;
  onImport: () => void;
  onExport: () => void;
  onReset: () => void;
}) {
  const todayMinutes = taskMinutes(todayTasks.filter(isOpenTask));
  const overdueCount = allTasks.filter((task) => isOpenTask(task) && getTaskSortDate(task) < toISODate(new Date())).length;
  return (
    <header className="sticky top-0 z-30 border-b border-[#E5E7EB] bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1340px] flex-col gap-3 px-3 py-3 md:px-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#111827] text-[#FACC15]">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#6B7280]">Hoodie internal</p>
              <h1 className="text-xl font-bold leading-tight text-[#111827]">Execution Dashboard</h1>
            </div>
          </div>
          <p className="mt-1 max-w-2xl text-sm text-[#6B7280]">A dated task directory for calm daily founder execution.</p>
        </div>
        <div className="grid grid-cols-3 gap-2 lg:min-w-[520px]">
          <HeaderMetric label="Today" value={`${todayMinutes}m`} intent={todayMinutes > DAILY_MAX_MINUTES ? 'warn' : 'default'} />
          <HeaderMetric label="Overdue" value={overdueCount} intent={overdueCount > 0 ? 'warn' : 'default'} />
          <HeaderMetric label="Progress" value={`${progress.overall.percent}%`} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={onQuickAdd}><Plus className="h-4 w-4" />Add</Button>
          <Button size="sm" variant="outline" onClick={onImport}><Upload className="h-4 w-4" />Import</Button>
          <Button size="sm" variant="outline" onClick={onExport}><Archive className="h-4 w-4" />Export</Button>
          <Button size="sm" variant="ghost" onClick={onReset}>Reset</Button>
        </div>
      </div>
    </header>
  );
}

function HeaderMetric({ label, value, intent = 'default' }: { label: string; value: string | number; intent?: 'default' | 'warn' }) {
  return (
    <div className={cn('rounded-lg border p-3', intent === 'warn' ? 'border-amber-200 bg-amber-50' : 'border-[#E5E7EB] bg-[#F9FAFB]')}>
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#6B7280]">{label}</p>
      <p className={cn('mt-1 text-lg font-bold', intent === 'warn' ? 'text-[#B45309]' : 'text-[#111827]')}>{value}</p>
    </div>
  );
}

function DesktopNavigation({
  activeView,
  onViewChange,
  search,
  onSearchChange,
  workstreamFilter,
  projectFilter,
  onWorkstreamChange,
  onProjectChange,
}: {
  activeView: PrimaryView;
  onViewChange: (view: PrimaryView) => void;
  search: string;
  onSearchChange: (value: string) => void;
  workstreamFilter: Workstream | 'All';
  projectFilter: TaskCategory | 'All';
  onWorkstreamChange: (value: Workstream | 'All') => void;
  onProjectChange: (value: TaskCategory | 'All') => void;
}) {
  return (
    <div className="sticky top-[112px] space-y-3">
      <Card className="rounded-lg border-[#E5E7EB] bg-white shadow-sm">
        <CardContent className="space-y-1 p-2">
          {primaryViews.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => onViewChange(id)}
              className={cn(
                'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-semibold transition',
                activeView === id ? 'bg-[#111827] text-white' : 'text-[#4B5563] hover:bg-[#F3F4F6] hover:text-[#111827]',
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </CardContent>
      </Card>
      <Card className="rounded-lg border-[#E5E7EB] bg-white shadow-sm">
        <CardContent className="space-y-3 p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
            <Input value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Search tasks" className="pl-9" />
          </div>
          <ChoiceMenu
            label="Project type"
            value={projectFilter}
            options={[
              { value: 'All', label: 'All project types' },
              ...TASK_CATEGORIES.map((category) => ({ value: category, label: getProjectTypeMeta(category).label })),
            ]}
            onChange={(value) => onProjectChange(value as TaskCategory | 'All')}
          />
          <ChoiceMenu
            label="Workstream"
            value={workstreamFilter}
            options={[
              { value: 'All', label: 'All workstreams' },
              ...WORKSTREAMS.map((workstream) => ({ value: workstream, label: workstream })),
            ]}
            onChange={(value) => onWorkstreamChange(value as Workstream | 'All')}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function MobileSearchAndFilters({
  search,
  onSearchChange,
  onOpenFilters,
  projectFilter,
  workstreamFilter,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  onOpenFilters: () => void;
  projectFilter: TaskCategory | 'All';
  workstreamFilter: Workstream | 'All';
}) {
  return (
    <div className="space-y-2 md:hidden">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
        <Input value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Search execution tasks" className="h-11 rounded-lg bg-white pl-9" />
      </div>
      <Button className="w-full justify-between bg-white" variant="outline" onClick={onOpenFilters}>
        <span>Filters</span>
        <span className="text-xs text-[#6B7280]">
          {projectFilter === 'All' ? 'All types' : getProjectTypeMeta(projectFilter).label}
          {' · '}
          {workstreamFilter === 'All' ? 'All streams' : 'Filtered'}
        </span>
      </Button>
    </div>
  );
}

function MobileExecutionTabs({ activeView, onViewChange }: { activeView: PrimaryView; onViewChange: (view: PrimaryView) => void }) {
  return (
    <nav aria-label="Execution views" className="fixed inset-x-0 bottom-0 z-40 border-t border-[#E5E7EB] bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] pt-2 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur md:hidden">
      <div className="grid grid-cols-5 gap-1">
        {primaryViews.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onViewChange(id)}
            className={cn(
              'flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg text-[11px] font-bold transition',
              activeView === id ? 'bg-[#111827] text-white' : 'text-[#6B7280] hover:bg-[#F3F4F6]',
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>
    </nav>
  );
}

function TodayView({
  tasks,
  blockedTasks,
  waitingTasks,
  onStatusChange,
  onSelectTask,
}: {
  tasks: ExecutionTask[];
  blockedTasks: ExecutionTask[];
  waitingTasks: ExecutionTask[];
  onStatusChange: (task: ExecutionTask, status: TaskStatus) => void;
  onSelectTask: (task: ExecutionTask) => void;
}) {
  const openTasks = tasks.filter(isOpenTask);
  const openMinutes = taskMinutes(openTasks.filter((task) => !['Blocked', 'Waiting for reply', 'Needs review'].includes(task.status)));
  return (
    <div className="space-y-4">
      <SectionTitle
        icon={Target}
        title="Today"
        description="Only what is dated for today. If it does not get done, it moves forward and the week adjusts."
      />
      <DateLoadMeter minutes={openMinutes} taskCount={openTasks.length} />
      {tasks.length === 0 ? (
        <EmptyState icon={Target} title="No tasks dated today" description="Nothing is due today. Check Week or Directory for what is coming next." />
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <FounderTaskCard key={task.id} task={task} onStatusChange={onStatusChange} onSelect={onSelectTask} />
          ))}
        </div>
      )}
      {(blockedTasks.length > 0 || waitingTasks.length > 0) && (
        <Card className="rounded-lg border-[#E5E7EB] bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold">Attention</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 p-4 pt-0">
            {[...blockedTasks, ...waitingTasks].slice(0, 5).map((task) => (
              <MiniTaskRow key={task.id} task={task} onSelectTask={onSelectTask} />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function WeekView({
  groups,
  onStatusChange,
  onSelectTask,
}: {
  groups: DirectoryGroup[];
  onStatusChange: (task: ExecutionTask, status: TaskStatus) => void;
  onSelectTask: (task: ExecutionTask) => void;
}) {
  return (
    <div className="space-y-4">
      <SectionTitle icon={CalendarDays} title="Week" description="Seven days, sorted by date, with overload warnings before the week gets noisy." />
      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-7">
        {groups.map((group) => (
          <Card key={group.key} className={cn('rounded-lg border bg-white shadow-sm', group.overloaded ? 'border-amber-200' : 'border-[#E5E7EB]')}>
            <CardHeader className="space-y-2 pb-2">
              <div className="flex items-start justify-between gap-2 xl:block">
                <div>
                  <CardTitle className="text-sm font-bold">{group.label}</CardTitle>
                  <p className="text-xs text-[#6B7280]">{displayDate(group.date)}</p>
                </div>
                <Badge className={cn('border', group.overloaded ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-[#E5E7EB] bg-[#F9FAFB] text-[#4B5563]')} variant="outline">
                  {group.open_minutes}m
                </Badge>
              </div>
              <Progress value={Math.min(100, (group.open_minutes / DAILY_TARGET_MINUTES) * 100)} className="h-2 bg-[#E5E7EB]" />
            </CardHeader>
            <CardContent className="space-y-2 p-3 pt-0">
              {group.tasks.length === 0 ? (
                <p className="rounded-md bg-[#F9FAFB] p-3 text-xs text-[#9CA3AF]">No tasks.</p>
              ) : group.tasks.slice(0, 6).map((task) => (
                <MiniTaskRow key={task.id} task={task} onSelectTask={onSelectTask} onStatusChange={onStatusChange} />
              ))}
              {group.tasks.length > 6 && <p className="text-xs font-semibold text-[#6B7280]">+{group.tasks.length - 6} more in Directory</p>}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function DirectoryView({
  groups,
  onStatusChange,
  onSelectTask,
}: {
  groups: DirectoryGroup[];
  onStatusChange: (task: ExecutionTask, status: TaskStatus) => void;
  onSelectTask: (task: ExecutionTask) => void;
}) {
  if (groups.length === 0) {
    return <EmptyState icon={LayoutList} title="No tasks in the directory" description="Add a task or accept extracted work to build the dated directory." />;
  }
  return (
    <div className="space-y-4">
      <SectionTitle icon={LayoutList} title="Directory" description="Every task, sorted by date. Nothing important should float around unscheduled." />
      {groups.map((group) => (
        <DateGroup key={group.key} group={group} onStatusChange={onStatusChange} onSelectTask={onSelectTask} />
      ))}
    </div>
  );
}

function DateGroup({
  group,
  onStatusChange,
  onSelectTask,
}: {
  group: DirectoryGroup;
  onStatusChange: (task: ExecutionTask, status: TaskStatus) => void;
  onSelectTask: (task: ExecutionTask) => void;
}) {
  const firstProject = group.tasks[0]?.category;
  const meta = firstProject ? getProjectTypeMeta(firstProject) : undefined;
  return (
    <Card className={cn('overflow-hidden rounded-lg border bg-white shadow-sm', group.overloaded ? 'border-amber-200' : 'border-[#E5E7EB]')}>
      <div className="h-1" style={{ backgroundColor: meta?.colour || '#111827' }} />
      <CardHeader className="border-b border-[#EEF2F7] pb-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-base font-bold">{group.label}</CardTitle>
              <Badge variant="outline" className={cn(
                'border',
                group.kind === 'overdue' && 'border-red-200 bg-red-50 text-red-700',
                group.kind === 'today' && 'border-blue-200 bg-blue-50 text-blue-700',
                group.kind === 'upcoming' && 'border-slate-200 bg-slate-50 text-slate-700',
                group.kind === 'completed' && 'border-emerald-200 bg-emerald-50 text-emerald-700',
              )}>
                {group.kind}
              </Badge>
              {group.overloaded && <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">Overloaded</Badge>}
            </div>
            <p className="mt-1 text-sm text-[#6B7280]">{group.tasks.length} tasks · {group.open_minutes} open minutes</p>
          </div>
          <div className="min-w-[170px]">
            <Progress value={Math.min(100, (group.open_minutes / DAILY_TARGET_MINUTES) * 100)} className="h-2 bg-[#E5E7EB]" />
            <p className="mt-1 text-right text-xs text-[#6B7280]">{group.open_minutes}/{DAILY_TARGET_MINUTES}m target</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-3 md:p-4">
        {group.tasks.map((task) => (
          <FounderTaskCard key={task.id} task={task} onStatusChange={onStatusChange} onSelect={onSelectTask} />
        ))}
      </CardContent>
    </Card>
  );
}

function FounderTaskCard({
  task,
  onStatusChange,
  onSelect,
}: {
  task: ExecutionTask;
  onStatusChange: (task: ExecutionTask, status: TaskStatus) => void;
  onSelect: (task: ExecutionTask) => void;
}) {
  const meta = getProjectTypeMeta(task.category);
  return (
    <article data-testid="task-card" className="relative overflow-hidden rounded-lg border border-[#E5E7EB] bg-white shadow-sm transition hover:border-[#D1D5DB]">
      <div className="absolute inset-y-0 left-0 w-1.5" style={{ backgroundColor: meta.colour }} />
      <div className="space-y-3 p-3 pl-4 md:p-4 md:pl-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <button className="min-w-0 text-left" onClick={() => onSelect(task)}>
            <div className="flex flex-wrap items-center gap-2">
              <ProjectTypeChip category={task.category} />
              <Badge className={cn('border', statusTone[task.status])} variant="outline">{task.status}</Badge>
              <span className="text-xs font-semibold text-[#6B7280]">{displayDate(getTaskSortDate(task))}</span>
            </div>
            <h3 data-testid="task-card-title" className="mt-2 text-base font-bold leading-snug text-[#111827]">{task.title}</h3>
            <p className="mt-1 line-clamp-2 text-sm text-[#6B7280]">{task.description}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-[#6B7280]">
              <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{task.effort_minutes}m</span>
              <span>{task.workstream}</span>
              <span>{task.source_document}</span>
            </div>
          </button>
          <div className="flex shrink-0 items-center gap-2">
            <div data-testid="task-status-menu"><StatusMenu task={task} onChange={onStatusChange} /></div>
            <Button size="sm" variant="outline" onClick={() => onSelect(task)}>Edit</Button>
          </div>
        </div>
      </div>
    </article>
  );
}

function MiniTaskRow({
  task,
  onSelectTask,
  onStatusChange,
}: {
  task: ExecutionTask;
  onSelectTask: (task: ExecutionTask) => void;
  onStatusChange?: (task: ExecutionTask, status: TaskStatus) => void;
}) {
  const meta = getProjectTypeMeta(task.category);
  return (
    <div className="rounded-md border border-[#E5E7EB] bg-[#F9FAFB] p-2">
      <button className="block w-full text-left" onClick={() => onSelectTask(task)}>
        <span className="mb-1 block h-1 w-8 rounded-full" style={{ backgroundColor: meta.colour }} />
        <p className="line-clamp-2 text-sm font-semibold text-[#111827]">{task.title}</p>
        <p className="mt-1 text-xs text-[#6B7280]">{getProjectTypeMeta(task.category).label} · {task.effort_minutes}m</p>
      </button>
      {onStatusChange && <div className="mt-2"><StatusMenu task={task} onChange={onStatusChange} compact /></div>}
    </div>
  );
}

function ProjectTypeChip({ category }: { category: TaskCategory }) {
  const meta = getProjectTypeMeta(category);
  const Icon = projectIcons[meta.icon];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-bold"
      style={{ backgroundColor: meta.soft, borderColor: meta.border, color: meta.colour }}
    >
      <Icon className="h-3.5 w-3.5" />
      {meta.label}
    </span>
  );
}

function DateLoadMeter({ minutes, taskCount }: { minutes: number; taskCount: number }) {
  const overloaded = minutes > DAILY_MAX_MINUTES;
  return (
    <Card className={cn('rounded-lg border bg-white shadow-sm', overloaded ? 'border-amber-200' : 'border-[#E5E7EB]')}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-[#111827]">{minutes} minutes planned</p>
            <p className="text-sm text-[#6B7280]">{taskCount} tasks dated today</p>
          </div>
          <Badge variant="outline" className={cn('border', overloaded ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700')}>
            {overloaded ? 'Overloaded' : 'Reasonable'}
          </Badge>
        </div>
        <Progress value={Math.min(100, (minutes / DAILY_TARGET_MINUTES) * 100)} className="mt-3 h-2 bg-[#E5E7EB]" />
        {overloaded && <p className="mt-2 text-xs font-semibold text-[#B45309]">Today is over 135 minutes. Marking unfinished work will push it forward and rebalance the week.</p>}
      </CardContent>
    </Card>
  );
}

function ProjectsView({ tasks, onProjectSelect }: { tasks: ExecutionTask[]; onProjectSelect: (project: TaskCategory) => void }) {
  return (
    <div className="space-y-4">
      <SectionTitle icon={BarChart3} title="Projects" description="Project type is the colour system for scanning what kind of work each task needs." />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {TASK_CATEGORIES.map((category) => {
          const meta = getProjectTypeMeta(category);
          const projectTasks = tasks.filter((task) => task.category === category);
          const done = projectTasks.filter((task) => task.status === 'Done').length;
          const Icon = projectIcons[meta.icon];
          return (
            <button
              key={category}
              onClick={() => onProjectSelect(category)}
              className="rounded-lg border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              style={{ borderColor: meta.border }}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: meta.soft, color: meta.colour }}>
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-lg font-bold text-[#111827]">{projectTasks.length}</span>
              </div>
              <h3 className="mt-3 font-bold text-[#111827]">{meta.label}</h3>
              <p className="mt-1 text-sm text-[#6B7280]">{done} done · {taskMinutes(projectTasks.filter(isOpenTask))} open minutes</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MoreView({
  state,
  progress,
  onAccept,
  onReject,
  onDefer,
  onMerge,
  onUpdateCandidate,
  onSelectTask,
  onStatusChange,
  onOpenSource,
}: {
  state: ExecutionState;
  progress: ExecutionProgress;
  onAccept: (candidate: ExtractedTaskCandidate) => void;
  onReject: (candidate: ExtractedTaskCandidate) => void;
  onDefer: (candidate: ExtractedTaskCandidate) => void;
  onMerge: (candidate: ExtractedTaskCandidate) => void;
  onUpdateCandidate: (candidateId: string, patch: Partial<ExtractedTaskCandidate>) => void;
  onSelectTask: (task: ExecutionTask) => void;
  onStatusChange: (task: ExecutionTask, status: TaskStatus) => void;
  onOpenSource: (document: SourceDocument) => void;
}) {
  const completed = state.tasks.filter((task) => task.status === 'Done');
  return (
    <div className="space-y-5">
      <SectionTitle icon={Sparkles} title="More" description="Review extracted tasks, source documents, blockers and progress without crowding daily execution." />
      <ExtractedTaskReview candidates={state.candidate_tasks} onAccept={onAccept} onReject={onReject} onDefer={onDefer} onMerge={onMerge} onUpdate={onUpdateCandidate} />
      <SourceDocumentBrowser documents={state.source_documents} progress={progress} tasks={state.tasks} onOpenDocument={onOpenSource} />
      <AttentionList title="Blockers" tasks={state.tasks.filter((task) => task.status === 'Blocked')} empty="Nothing blocked." onSelectTask={onSelectTask} onStatusChange={onStatusChange} />
      <AttentionList title="Completed" tasks={completed.slice(0, 12)} empty="No completed work yet." onSelectTask={onSelectTask} />
      <ProgressAnalytics progress={progress} />
    </div>
  );
}

function AttentionList({
  title,
  tasks,
  empty,
  onSelectTask,
  onStatusChange,
}: {
  title: string;
  tasks: ExecutionTask[];
  empty: string;
  onSelectTask: (task: ExecutionTask) => void;
  onStatusChange?: (task: ExecutionTask, status: TaskStatus) => void;
}) {
  return (
    <Card className="rounded-lg border-[#E5E7EB] bg-white shadow-sm">
      <CardHeader className="pb-2"><CardTitle className="text-base font-bold">{title}</CardTitle></CardHeader>
      <CardContent className="space-y-2 p-4 pt-0">
        {tasks.length === 0 ? <p className="text-sm text-[#9CA3AF]">{empty}</p> : tasks.map((task) => (
          <MiniTaskRow key={task.id} task={task} onSelectTask={onSelectTask} onStatusChange={onStatusChange} />
        ))}
      </CardContent>
    </Card>
  );
}

function ChoiceMenu<T extends string>({
  label,
  value,
  options,
  onChange,
  buttonClassName,
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string; description?: string; tone?: string }>;
  onChange: (value: T) => void;
  buttonClassName?: string;
}) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);
  const trigger = (
    <Button
      type="button"
      variant="outline"
      className={cn('w-full justify-between bg-white text-left', buttonClassName)}
      onClick={() => setOpen(true)}
    >
      <span className="min-w-0 truncate">{selected?.label || label}</span>
      <ChevronDown className="h-4 w-4 opacity-60" />
    </Button>
  );
  const content = (
    <div className="space-y-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => {
            onChange(option.value);
            setOpen(false);
          }}
          className={cn(
            'flex w-full items-start justify-between gap-3 rounded-md px-3 py-2 text-left text-sm transition hover:bg-[#F3F4F6]',
            option.value === value && 'bg-[#111827] text-white hover:bg-[#111827]',
          )}
        >
          <span>
            <span className="block font-semibold">{option.label}</span>
            {option.description && <span className={cn('block text-xs', option.value === value ? 'text-slate-300' : 'text-[#6B7280]')}>{option.description}</span>}
          </span>
          {option.value === value && <Check className="h-4 w-4 shrink-0" />}
        </button>
      ))}
    </div>
  );

  if (isMobile) {
    return (
      <>
        {trigger}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="bottom" className="max-h-[82dvh] overflow-y-auto rounded-t-2xl">
            <SheetHeader>
              <SheetTitle>{label}</SheetTitle>
              <SheetDescription>Choose one option.</SheetDescription>
            </SheetHeader>
            <div className="px-4 pb-6">{content}</div>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-2">{content}</PopoverContent>
    </Popover>
  );
}

function StatusMenu({
  task,
  onChange,
  compact,
}: {
  task: ExecutionTask;
  onChange: (task: ExecutionTask, status: TaskStatus) => void;
  compact?: boolean;
}) {
  return (
    <ChoiceMenu
      label="Status"
      value={task.status}
      buttonClassName={cn('border px-2', compact ? 'h-8 text-xs' : 'h-9', statusTone[task.status])}
      options={TASK_STATUSES.map((status) => ({ value: status, label: status, description: statusDescriptions[status] }))}
      onChange={(status) => onChange(task, status)}
    />
  );
}

function DatePickerButton({ value, onChange, label = 'Date' }: { value?: string; onChange: (date: string) => void; label?: string }) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const selected = parseDate(value);
  const content = (
    <Calendar
      mode="single"
      selected={selected}
      onSelect={(date) => {
        if (!date) return;
        onChange(toISODate(date));
        setOpen(false);
      }}
      initialFocus
    />
  );
  const trigger = (
    <Button type="button" variant="outline" className="w-full justify-between bg-white" onClick={() => setOpen(true)}>
      <span>{value ? displayDate(value) : label}</span>
      <CalendarDays className="h-4 w-4 opacity-60" />
    </Button>
  );

  if (isMobile) {
    return (
      <>
        {trigger}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="bottom" className="rounded-t-2xl">
            <SheetHeader>
              <SheetTitle>{label}</SheetTitle>
              <SheetDescription>Pick a day for this task.</SheetDescription>
            </SheetHeader>
            <div className="px-4 pb-6">{content}</div>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">{content}</PopoverContent>
    </Popover>
  );
}

function EffortPicker({ value, onChange }: { value: number; onChange: (minutes: number) => void }) {
  const options = [15, 20, 25, 35, 45];
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((minutes) => (
        <button
          key={minutes}
          type="button"
          onClick={() => onChange(minutes)}
          className={cn(
            'rounded-full border px-3 py-1.5 text-sm font-bold transition',
            value === minutes ? 'border-[#111827] bg-[#111827] text-white' : 'border-[#E5E7EB] bg-white text-[#4B5563] hover:bg-[#F3F4F6]',
          )}
        >
          {minutes}m
        </button>
      ))}
      <button
        type="button"
        onClick={() => onChange(Math.min(90, value + 5))}
        className="rounded-full border border-[#E5E7EB] bg-white px-3 py-1.5 text-sm font-bold text-[#4B5563] hover:bg-[#F3F4F6]"
      >
        +5m
      </button>
      <button
        type="button"
        onClick={() => onChange(Math.max(5, value - 5))}
        className="rounded-full border border-[#E5E7EB] bg-white px-3 py-1.5 text-sm font-bold text-[#4B5563] hover:bg-[#F3F4F6]"
      >
        -5m
      </button>
    </div>
  );
}

function TaskEditSheet({
  task,
  onOpenChange,
  onSave,
  onDelete,
  onStatusChange,
}: {
  task: ExecutionTask | null;
  onOpenChange: (open: boolean) => void;
  onSave: (taskId: string, patch: Partial<ExecutionTask>) => void;
  onDelete: (taskId: string) => void;
  onStatusChange: (task: ExecutionTask, status: TaskStatus) => void;
}) {
  const isMobile = useIsMobile();
  const [draft, setDraft] = useState<ExecutionTask | null>(task);
  const editable = draft?.id === task?.id ? draft : task;

  useEffect(() => {
    setDraft(task);
  }, [task]);

  return (
    <Sheet open={Boolean(task)} onOpenChange={onOpenChange}>
      <SheetContent side={isMobile ? 'bottom' : 'right'} className={cn('overflow-y-auto', isMobile ? 'max-h-[92dvh] rounded-t-2xl' : 'w-full sm:max-w-xl')}>
        {editable && task && (
          <>
            <SheetHeader>
              <SheetTitle>{editable.title}</SheetTitle>
              <SheetDescription>Small enough to finish. Clear enough to prove.</SheetDescription>
            </SheetHeader>
            <div className="space-y-4 px-4 pb-6">
              <Field label="Title"><Input value={editable.title} onChange={(event) => setDraft({ ...editable, title: event.target.value })} /></Field>
              <Field label="Description"><Textarea value={editable.description} onChange={(event) => setDraft({ ...editable, description: event.target.value })} className="min-h-24" /></Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Status"><StatusMenu task={editable} onChange={(_task, status) => setDraft({ ...editable, status })} /></Field>
                <Field label="Project type">
                  <ChoiceMenu
                    label="Project type"
                    value={editable.category}
                    options={TASK_CATEGORIES.map((category) => ({ value: category, label: getProjectTypeMeta(category).label }))}
                    onChange={(category) => setDraft({ ...editable, category })}
                  />
                </Field>
                <Field label="Workstream">
                  <ChoiceMenu
                    label="Workstream"
                    value={editable.workstream}
                    options={WORKSTREAMS.map((workstream) => ({ value: workstream, label: workstream }))}
                    onChange={(workstream) => setDraft({ ...editable, workstream })}
                  />
                </Field>
                <Field label="Scheduled date">
                  <DatePickerButton value={editable.scheduled_date || editable.due_date} onChange={(date) => setDraft({ ...editable, scheduled_date: date, due_date: date })} />
                </Field>
              </div>
              <Field label={`Effort: ${editable.effort_minutes} minutes`}>
                <EffortPicker value={editable.effort_minutes} onChange={(effort) => setDraft({ ...editable, effort_minutes: effort })} />
              </Field>
              <Field label="Notes"><Textarea value={editable.notes || ''} onChange={(event) => setDraft({ ...editable, notes: event.target.value })} /></Field>
              <Field label="Completion proof"><Textarea value={editable.completion_proof || ''} onChange={(event) => setDraft({ ...editable, completion_proof: event.target.value })} placeholder="Link, CRM row, screenshot location, note..." /></Field>
              <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-3 text-sm text-[#4B5563]">
                <p className="font-bold text-[#111827]">Source</p>
                <p>{editable.source_document}</p>
                <p>{editable.source_section}</p>
                <p className="mt-2 italic">&quot;{editable.source_excerpt}&quot;</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => {
                  onSave(task.id, editable);
                  if (editable.status !== task.status) onStatusChange(task, editable.status);
                  onOpenChange(false);
                }}>Save task</Button>
                <Button variant="outline" onClick={() => onStatusChange(task, 'Done')}><CheckCircle2 className="h-4 w-4" />Done</Button>
                <Button variant="destructive" onClick={() => onDelete(task.id)}>Delete</Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-semibold text-[#374151]">{label}</span>
      {children}
    </label>
  );
}

function FilterSheet({
  open,
  onOpenChange,
  search,
  onSearchChange,
  workstreamFilter,
  projectFilter,
  onWorkstreamChange,
  onProjectChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  search: string;
  onSearchChange: (value: string) => void;
  workstreamFilter: Workstream | 'All';
  projectFilter: TaskCategory | 'All';
  onWorkstreamChange: (value: Workstream | 'All') => void;
  onProjectChange: (value: TaskCategory | 'All') => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[88dvh] overflow-y-auto rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>Filters</SheetTitle>
          <SheetDescription>Keep the task directory narrow enough to act on.</SheetDescription>
        </SheetHeader>
        <div className="space-y-3 px-4 pb-6">
          <Field label="Search"><Input value={search} onChange={(event) => onSearchChange(event.target.value)} /></Field>
          <Field label="Project type">
            <ChoiceMenu
              label="Project type"
              value={projectFilter}
              options={[
                { value: 'All', label: 'All project types' },
                ...TASK_CATEGORIES.map((category) => ({ value: category, label: getProjectTypeMeta(category).label })),
              ]}
              onChange={(value) => onProjectChange(value as TaskCategory | 'All')}
            />
          </Field>
          <Field label="Workstream">
            <ChoiceMenu
              label="Workstream"
              value={workstreamFilter}
              options={[
                { value: 'All', label: 'All workstreams' },
                ...WORKSTREAMS.map((workstream) => ({ value: workstream, label: workstream })),
              ]}
              onChange={(value) => onWorkstreamChange(value as Workstream | 'All')}
            />
          </Field>
          <Button className="w-full" onClick={() => onOpenChange(false)}>Apply filters</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function QuickAddTask({
  onAdd,
  onCancel,
  defaultDate,
}: {
  onAdd: (task: Omit<ExecutionTask, 'id' | 'created_at' | 'updated_at' | 'sequence_order' | 'prerequisite_of'>) => void;
  onCancel: () => void;
  defaultDate: string;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [workstream, setWorkstream] = useState<Workstream>('Admin, proof assets, CRM, reporting, and follow-ups');
  const [category, setCategory] = useState<TaskCategory>('quick-win');
  const [effort, setEffort] = useState(25);
  const [date, setDate] = useState(defaultDate);

  return (
    <Card className="rounded-lg border-[#E5E7EB] bg-white shadow-sm">
      <CardHeader className="pb-2"><CardTitle className="text-base font-bold">Quick add task</CardTitle></CardHeader>
      <CardContent className="grid gap-3 p-4 pt-0 md:grid-cols-2">
        <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Task title" />
        <DatePickerButton value={date} onChange={setDate} label="Task date" />
        <div className="md:col-span-2">
          <Textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Description" />
        </div>
        <ChoiceMenu label="Project type" value={category} options={TASK_CATEGORIES.map((item) => ({ value: item, label: getProjectTypeMeta(item).label }))} onChange={setCategory} />
        <ChoiceMenu label="Workstream" value={workstream} options={WORKSTREAMS.map((item) => ({ value: item, label: item }))} onChange={setWorkstream} />
        <div className="md:col-span-2">
          <p className="mb-2 text-sm font-semibold text-[#374151]">Effort: {effort} minutes</p>
          <EffortPicker value={effort} onChange={setEffort} />
        </div>
        <div className="flex gap-2 md:col-span-2">
          <Button
            disabled={!title.trim()}
            onClick={() => {
              onAdd({
                title: title.trim(),
                description: description.trim() || title.trim(),
                source_document: 'Manual task',
                source_section: 'Quick add',
                source_excerpt: 'Manually added by founder.',
                workstream,
                category,
                project: 'Manual founder task',
                priority: 'Medium',
                impact: 'Medium',
                effort_minutes: effort,
                urgency: 'Medium',
                status: 'Not started',
                scheduled_date: date,
                due_date: date,
                dependencies: [],
                owner: 'Founder',
                notes: '',
                evidence_required: '',
                completion_proof: '',
                ai_generated: false,
                manually_added: true,
              });
              setTitle('');
              setDescription('');
              onCancel();
            }}
          >Add task</Button>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ExtractedTaskReview({
  candidates,
  onAccept,
  onReject,
  onDefer,
  onMerge,
  onUpdate,
}: {
  candidates: ExtractedTaskCandidate[];
  onAccept: (candidate: ExtractedTaskCandidate) => void;
  onReject: (candidate: ExtractedTaskCandidate) => void;
  onDefer: (candidate: ExtractedTaskCandidate) => void;
  onMerge: (candidate: ExtractedTaskCandidate) => void;
  onUpdate: (candidateId: string, patch: Partial<ExtractedTaskCandidate>) => void;
}) {
  const pending = candidates.filter((candidate) => candidate.candidate_status === 'pending');
  return (
    <Card className="rounded-lg border-[#E5E7EB] bg-white shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-bold">Review extracted tasks</CardTitle>
        <p className="text-sm text-[#6B7280]">{pending.length} pending. Review before anything enters your directory.</p>
      </CardHeader>
      <CardContent className="space-y-3 p-4 pt-0">
        {candidates.length === 0 ? (
          <p className="text-sm text-[#9CA3AF]">No candidate tasks to review.</p>
        ) : candidates.map((candidate) => (
          <div key={candidate.id} className={cn('rounded-lg border border-[#E5E7EB] p-3', candidate.candidate_status !== 'pending' && 'opacity-60')}>
            <div className="flex flex-wrap gap-2">
              <Badge className="border-[#E5E7EB] bg-[#F9FAFB] text-[#4B5563]" variant="outline">{candidate.candidate_status}</Badge>
              <ProjectTypeChip category={candidate.category} />
              {candidate.suggested_duplicate_ids?.length ? <Badge className="border-amber-200 bg-amber-50 text-amber-700" variant="outline">possible duplicate</Badge> : null}
            </div>
            <Input className="mt-3 font-bold" value={candidate.title} onChange={(event) => onUpdate(candidate.id, { title: event.target.value })} />
            <Textarea className="mt-2" value={candidate.description} onChange={(event) => onUpdate(candidate.id, { description: event.target.value })} />
            <p className="mt-2 text-xs text-[#6B7280]">{candidate.source_document} / {candidate.source_section}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" disabled={candidate.candidate_status !== 'pending'} onClick={() => onAccept(candidate)}>Accept</Button>
              <Button size="sm" variant="outline" disabled={candidate.candidate_status !== 'pending'} onClick={() => onMerge(candidate)}>Merge</Button>
              <Button size="sm" variant="outline" disabled={candidate.candidate_status !== 'pending'} onClick={() => onDefer(candidate)}>Defer</Button>
              <Button size="sm" variant="ghost" disabled={candidate.candidate_status !== 'pending'} onClick={() => onReject(candidate)}>Reject</Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function SourceDocumentBrowser({
  documents,
  progress,
  tasks,
  onOpenDocument,
}: {
  documents: SourceDocument[];
  progress: ExecutionProgress;
  tasks: ExecutionTask[];
  onOpenDocument: (document: SourceDocument) => void;
}) {
  return (
    <Card className="rounded-lg border-[#E5E7EB] bg-white shadow-sm">
      <CardHeader className="pb-2"><CardTitle className="text-base font-bold">Source documents</CardTitle></CardHeader>
      <CardContent className="grid gap-3 p-4 pt-0 lg:grid-cols-2">
        {documents.map((document) => {
          const bucket = progress.by_document.find((item) => item.id === document.id);
          const docTasks = tasks.filter((task) => task.source_document === document.name);
          return (
            <button key={document.id} onClick={() => onOpenDocument(document)} className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-3 text-left">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-[#111827]">{document.name}</p>
                  <p className="mt-1 line-clamp-1 text-xs text-[#6B7280]">{document.path}</p>
                </div>
                {document.source_needed && <Badge className="border-amber-200 bg-amber-50 text-amber-700" variant="outline">needed</Badge>}
              </div>
              <Progress value={bucket?.percent || 0} className="mt-3 h-2 bg-[#E5E7EB]" />
              <p className="mt-2 text-xs text-[#6B7280]">{docTasks.length} tasks · {bucket?.percent || 0}% complete</p>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}

function ProgressAnalytics({ progress }: { progress: ExecutionProgress }) {
  return (
    <Card className="rounded-lg border-[#E5E7EB] bg-white shadow-sm">
      <CardHeader className="pb-2"><CardTitle className="text-base font-bold">Progress</CardTitle></CardHeader>
      <CardContent className="space-y-3 p-4 pt-0">
        <div className="grid gap-2 sm:grid-cols-4">
          <MiniMetric label="Overall" value={`${progress.overall.percent}%`} />
          <MiniMetric label="Velocity" value={`${progress.weekly_velocity_minutes}m`} />
          <MiniMetric label="Overdue" value={progress.overdue_count} />
          <MiniMetric label="Blocked" value={progress.blocked_count} />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {READINESS_KEYS.map((key) => (
            <div key={key}>
              <div className="mb-1 flex justify-between text-sm font-semibold">
                <span>{key}</span>
                <span>{progress.readiness[key]}%</span>
              </div>
              <Progress value={progress.readiness[key]} className="h-2 bg-[#E5E7EB]" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function MiniMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md bg-[#F9FAFB] p-3">
      <p className="text-lg font-bold text-[#111827]">{value}</p>
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B7280]">{label}</p>
    </div>
  );
}

function ImportDocumentsPanel({
  open,
  onOpenChange,
  existingTasks,
  onImportMarkdown,
  onImportJson,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingTasks: ExecutionTask[];
  onImportMarkdown: (document: SourceDocument, candidates: ExtractedTaskCandidate[]) => void;
  onImportJson: (raw: string) => void;
}) {
  const [name, setName] = useState('Imported Hoodie plan.md');
  const [markdown, setMarkdown] = useState('');
  const [jsonText, setJsonText] = useState('');
  const [error, setError] = useState('');
  const isMobile = useIsMobile();

  const importMarkdown = () => {
    setError('');
    if (!markdown.trim()) {
      setError('Paste markdown before importing.');
      return;
    }
    const now = new Date().toISOString();
    const document: SourceDocument = {
      id: `doc-import-${Date.now()}`,
      name: name.trim() || 'Imported Hoodie plan.md',
      path: '[Imported in dashboard]',
      type: 'uploaded-markdown',
      imported_at: now,
      last_reviewed_at: now,
      sections: [],
    };
    const candidates = extractTaskCandidatesFromMarkdown({ markdown, document, existingTasks });
    const workstreams = new Set(candidates.map((candidate) => candidate.workstream));
    document.sections = [{
      id: `${document.id}-extracted`,
      title: 'Imported extracted sections',
      excerpt: `${candidates.length} candidate tasks extracted from pasted markdown.`,
      workstreams: Array.from(workstreams),
    }];
    onImportMarkdown(document, candidates);
    setMarkdown('');
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={isMobile ? 'bottom' : 'right'} className={cn('overflow-y-auto', isMobile ? 'max-h-[92dvh] rounded-t-2xl' : 'w-full sm:max-w-2xl')}>
        <SheetHeader>
          <SheetTitle>Import documents</SheetTitle>
          <SheetDescription>Extract candidate tasks into review, or restore a local JSON export.</SheetDescription>
        </SheetHeader>
        <div className="space-y-4 px-4 pb-6">
          {error && <p className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
          <Card className="rounded-lg border-[#E5E7EB]">
            <CardHeader><CardTitle className="text-base font-bold">Markdown extraction</CardTitle></CardHeader>
            <CardContent className="space-y-3 p-4 pt-0">
              <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Document name" />
              <Textarea value={markdown} onChange={(event) => setMarkdown(event.target.value)} placeholder="Paste markdown here..." className="min-h-48" />
              <Button onClick={importMarkdown}>Extract to review</Button>
            </CardContent>
          </Card>
          <Card className="rounded-lg border-[#E5E7EB]">
            <CardHeader><CardTitle className="text-base font-bold">Restore JSON export</CardTitle></CardHeader>
            <CardContent className="space-y-3 p-4 pt-0">
              <Textarea value={jsonText} onChange={(event) => setJsonText(event.target.value)} placeholder="Paste exported JSON..." className="min-h-32" />
              <Button
                variant="outline"
                onClick={() => {
                  try {
                    onImportJson(jsonText);
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Invalid JSON export.');
                  }
                }}
              >
                Restore JSON
              </Button>
            </CardContent>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SectionTitle({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-[#111827] shadow-sm ring-1 ring-[#E5E7EB]">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <h2 className="text-xl font-bold text-[#111827]">{title}</h2>
        <p className="text-sm text-[#6B7280]">{description}</p>
      </div>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <Card className="rounded-lg border-dashed border-[#D1D5DB] bg-white shadow-sm">
      <CardContent className="flex min-h-[240px] flex-col items-center justify-center p-8 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#F9FAFB] text-[#6B7280]">
          <Icon className="h-7 w-7" />
        </span>
        <h2 className="mt-4 text-lg font-bold text-[#111827]">{title}</h2>
        <p className="mt-2 max-w-md text-sm text-[#6B7280]">{description}</p>
      </CardContent>
    </Card>
  );
}
