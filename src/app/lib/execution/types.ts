export const EXECUTION_STORAGE_VERSION = 2;
export const EXECUTION_STORAGE_KEY = 'hoodie_execution_command_centre:v1';

export const WORKSTREAMS = [
  'Organic GTM',
  'LinkedIn content',
  'Public-sector outreach',
  'Councils/LGAs and government contacts',
  'Indian Student Transition and Wellbeing Forum',
  'Conference partner/sponsor/resource outreach',
  'University and admissions outreach',
  'Partner outreach',
  'Paid ads setup',
  'ASO / app store optimisation',
  'Product roadmap and feature research',
  'UX simplification / Codex product tasks',
  'Investor and pitch deck',
  'Community events and workshops',
  'Website / landing pages / analytics setup',
  'Admin, proof assets, CRM, reporting, and follow-ups',
] as const;

export type Workstream = typeof WORKSTREAMS[number];

export const TASK_STATUSES = [
  'Not started',
  'In progress',
  'Done',
  'Not done',
  'Skipped',
  'Deferred',
  'Blocked',
  'Waiting for reply',
  'Needs review',
  'Recurring',
  'Cancelled',
] as const;

export type TaskStatus = typeof TASK_STATUSES[number];

export const ACTIVE_PROGRESS_STATUSES: TaskStatus[] = [
  'Not started',
  'In progress',
  'Done',
  'Not done',
  'Skipped',
  'Deferred',
  'Blocked',
  'Waiting for reply',
  'Needs review',
  'Recurring',
];

export const PLANNABLE_STATUSES: TaskStatus[] = [
  'Not started',
  'In progress',
  'Not done',
  'Skipped',
  'Deferred',
];

export const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'] as const;
export type TaskPriority = typeof PRIORITIES[number];

export const IMPACT_LEVELS = ['Low', 'Medium', 'High'] as const;
export type TaskImpact = typeof IMPACT_LEVELS[number];

export const URGENCY_LEVELS = ['Low', 'Medium', 'High'] as const;
export type TaskUrgency = typeof URGENCY_LEVELS[number];

export const TASK_CATEGORIES = [
  'setup',
  'deep-work',
  'quick-win',
  'outreach',
  'follow-up',
  'content',
  'research',
  'admin',
  'analytics',
  'review',
  'asset',
] as const;

export type TaskCategory = typeof TASK_CATEGORIES[number];

export interface ExecutionTask {
  id: string;
  title: string;
  description: string;
  source_document: string;
  source_section: string;
  source_excerpt: string;
  workstream: Workstream;
  category: TaskCategory;
  project: string;
  priority: TaskPriority;
  impact: TaskImpact;
  effort_minutes: number;
  urgency: TaskUrgency;
  status: TaskStatus;
  due_date?: string;
  scheduled_date?: string;
  dependencies: string[];
  prerequisite_of: string[];
  sequence_order: number;
  owner?: string;
  related_partner?: string;
  related_campaign?: string;
  related_event?: string;
  related_platform?: string;
  related_city?: string;
  link?: string;
  notes?: string;
  evidence_required?: string;
  completion_proof?: string;
  ai_generated: boolean;
  manually_added: boolean;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface SourceSection {
  id: string;
  title: string;
  excerpt: string;
  line_start?: number;
  workstreams: Workstream[];
}

export interface SourceDocument {
  id: string;
  name: string;
  path: string;
  type: 'uploaded-markdown' | 'discovered-markdown' | 'store-metadata' | 'missing-source-placeholder';
  source_needed?: boolean;
  notes?: string;
  sections: SourceSection[];
  imported_at: string;
  last_reviewed_at?: string;
}

export interface ExtractedTaskCandidate extends ExecutionTask {
  candidate_status: 'pending' | 'accepted' | 'rejected' | 'deferred' | 'merged';
  review_reason?: string;
  suggested_duplicate_ids?: string[];
  accepted_task_id?: string;
}

export interface DailyPlan {
  id: string;
  date: string;
  task_ids: string[];
  target_minutes: number;
  locked_task_ids: string[];
  generated_at: string;
  planner_version: string;
}

export interface ExecutionAnalyticsEvent {
  id: string;
  event:
    | 'document_imported'
    | 'tasks_extracted'
    | 'task_accepted'
    | 'task_rejected'
    | 'task_created'
    | 'task_completed'
    | 'task_not_done'
    | 'task_deferred'
    | 'task_blocked'
    | 'daily_plan_generated'
    | 'daily_plan_completed'
    | 'workstream_viewed'
    | 'source_document_opened'
    | 'progress_card_clicked'
    | 'blocker_added'
    | 'followup_scheduled';
  timestamp: string;
  payload: Record<string, unknown>;
}

export interface ExecutionSettings {
  target_daily_minutes: number;
  min_daily_minutes: number;
  max_daily_minutes: number;
  founder_name: string;
}

export interface ExecutionState {
  version: number;
  source_documents: SourceDocument[];
  tasks: ExecutionTask[];
  candidate_tasks: ExtractedTaskCandidate[];
  daily_plans: DailyPlan[];
  analytics_events: ExecutionAnalyticsEvent[];
  settings: ExecutionSettings;
  created_at: string;
  updated_at: string;
}

export type ExecutionView =
  | 'today'
  | 'week'
  | 'workstreams'
  | 'backlog'
  | 'calendar'
  | 'kanban'
  | 'sources'
  | 'review'
  | 'follow-ups'
  | 'blockers'
  | 'completed'
  | 'analytics';

export const READINESS_KEYS = [
  'Conference readiness',
  'LinkedIn content readiness',
  'Ads setup readiness',
  'Outreach readiness',
  'ASO readiness',
  'Pitch deck readiness',
] as const;

export type ReadinessKey = typeof READINESS_KEYS[number];

export interface ProgressBucket {
  id: string;
  label: string;
  completed_minutes: number;
  active_minutes: number;
  completed_count: number;
  active_count: number;
  percent: number;
}

export interface ExecutionProgress {
  overall: ProgressBucket;
  by_workstream: ProgressBucket[];
  by_epic: ProgressBucket[];
  by_document: ProgressBucket[];
  by_status: Array<{ status: TaskStatus; count: number; minutes: number }>;
  readiness: Record<ReadinessKey, number>;
  weekly_velocity_minutes: number;
  overdue_count: number;
  blocked_count: number;
}

export interface PlannerResult {
  plan: DailyPlan;
  tasks: ExecutionTask[];
  warnings: string[];
}
