export type AgentRoleName =
  | 'Agency Admin'
  | 'Principal'
  | 'Head of PM'
  | 'Property Manager'
  | 'Leasing Agent'
  | 'Admin/Support'
  | 'Compliance Viewer';

export type AgentPermissionAction = 'read' | 'create' | 'update' | 'approve' | 'export' | 'admin';

export interface AgentAgency {
  id: string;
  name: string;
  timezone: string;
  plan: string;
}

export interface AgentUser {
  id: string;
  agency_id: string;
  office_id?: string | null;
  role_id: string;
  firebase_uid?: string | null;
  email: string;
  name: string;
  status: 'invited' | 'active' | 'suspended';
  role: AgentRoleName;
}

export interface AgentSession {
  agency: AgentAgency;
  user: AgentUser;
  permissions: string[];
}

export interface AgentMetric {
  id: string;
  label: string;
  value: string;
  trend: string;
  tone: 'neutral' | 'good' | 'warn' | 'risk';
}

export interface AgentQueueItem {
  id: string;
  type: 'lead' | 'application' | 'maintenance' | 'inspection' | 'ai_approval' | 'task';
  title: string;
  entity: string;
  owner: string;
  due: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: string;
}

export interface AgentContact {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'applicant' | 'tenant' | 'landlord' | 'vendor' | 'partner';
  consent_status: 'not_required' | 'granted' | 'revoked' | 'pending';
  last_touch: string;
}

export interface AgentProperty {
  id: string;
  address: string;
  owner: string;
  manager: string;
  status: 'listed' | 'leased' | 'maintenance' | 'vacant';
  open_items: number;
}

export interface AgentApplication {
  id: string;
  applicant: string;
  property: string;
  stage: 'New' | 'Incomplete' | 'Awaiting Applicant' | 'Under Review' | 'Ready for PM' | 'Approved' | 'Declined' | 'Archived';
  readiness_status: 'not_checked' | 'missing_info' | 'ready_for_review';
  missing_items: string[];
  source: string;
}

export interface AgentMaintenanceIssue {
  id: string;
  title: string;
  property: string;
  tenant: string;
  urgency: 'routine' | 'soon' | 'urgent' | 'emergency';
  status: 'new' | 'triage' | 'vendor_assigned' | 'owner_update_due' | 'resolved';
  timeline_count: number;
}

export interface AgentAiRun {
  id: string;
  agent: string;
  object_type: string;
  object_id: string;
  output: string;
  confidence: number;
  sources: string[];
  status: 'drafted' | 'approved' | 'rejected' | 'escalated';
  requires_approval: boolean;
  created_at: string;
}

export interface AgentIntegrationConnection {
  id: string;
  provider: string;
  label: string;
  status: 'mock' | 'connected' | 'error' | 'disabled';
  scopes: string[];
  last_sync_at?: string;
}

export interface AgentAuditLog {
  id: string;
  action: string;
  object_type: string;
  object_id: string;
  actor: string;
  created_at: string;
}

export interface AgentConversationThread {
  id: string;
  subject: string;
  linked_object: string;
  channel: 'email' | 'sms' | 'portal';
  status: 'open' | 'waiting' | 'resolved';
  summary: string;
}

export interface AgentTask {
  id: string;
  title: string;
  owner: string;
  due: string;
  status: 'open' | 'blocked' | 'done' | 'waiting';
  linked_object: string;
}

export interface AgentLead {
  id: string;
  name: string;
  email: string;
  phone: string;
  property: string;
  source: string;
  status: 'new' | 'qualified' | 'inspection_booked' | 'converted' | 'nurture';
  owner: string;
  sla: string;
  last_touch: string;
}

export interface AgentInspection {
  id: string;
  property: string;
  attendee: string;
  scheduled_at: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  type: 'open_home' | 'private' | 'routine';
}

export interface AgentDocument {
  id: string;
  name: string;
  type: 'application' | 'maintenance' | 'lease' | 'audit' | 'compliance';
  linked_object: string;
  status: 'uploaded' | 'extracted' | 'review_required' | 'exported_simulated';
  retention: string;
}

export interface AgentEvidenceItem {
  id: string;
  title: string;
  linked_object: string;
  source: 'agency' | 'renter' | 'vendor' | 'integration';
  consent_required: boolean;
  shared: boolean;
}

export interface AgentMoveInAudit {
  id: string;
  property: string;
  tenant: string;
  status: 'draft' | 'review' | 'completed' | 'exported';
  checklist_total: number;
  checklist_done: number;
  evidence_count: number;
}

export interface AgentWorkflow {
  id: string;
  name: string;
  trigger: string;
  status: 'draft' | 'simulated' | 'approval_required' | 'active';
  last_run: string;
}

export interface AgentAiAgent {
  id: string;
  name: string;
  purpose: string;
  status: 'enabled' | 'disabled' | 'review_required';
  approval_required: boolean;
  runs: number;
}

export interface AgentConsentRecord {
  id: string;
  contact: string;
  purpose: string;
  status: 'granted' | 'pending' | 'revoked';
  updated_at: string;
}

export interface AgentNotification {
  id: string;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
}

export interface AgentTimelineEvent {
  id: string;
  object_type: string;
  object_id: string;
  title: string;
  body: string;
  created_at: string;
}

export interface AgentAnalyticsEvent {
  id: string;
  event: string;
  object_type: string;
  object_id: string;
  created_at: string;
}

export interface AgentCommunicationRecord {
  id: string;
  channel: 'email' | 'sms' | 'portal' | 'export';
  recipient: string;
  subject: string;
  status: 'queued' | 'sent_simulated' | 'exported_simulated';
  linked_object: string;
  created_at: string;
}

export interface AgentsDashboardData {
  session: AgentSession;
  metrics: AgentMetric[];
  priority_queue: AgentQueueItem[];
  approval_queue: AgentAiRun[];
  contacts: AgentContact[];
  properties: AgentProperty[];
  applications: AgentApplication[];
  maintenance_issues: AgentMaintenanceIssue[];
  integrations: AgentIntegrationConnection[];
  audit_logs: AgentAuditLog[];
  threads: AgentConversationThread[];
  tasks: AgentTask[];
}

export interface AgentsDemoState extends AgentsDashboardData {
  leads: AgentLead[];
  inspections: AgentInspection[];
  documents: AgentDocument[];
  evidence_items: AgentEvidenceItem[];
  move_in_audits: AgentMoveInAudit[];
  workflows: AgentWorkflow[];
  ai_agents: AgentAiAgent[];
  consent_records: AgentConsentRecord[];
  notifications: AgentNotification[];
  timeline_events: AgentTimelineEvent[];
  analytics_events: AgentAnalyticsEvent[];
  communications: AgentCommunicationRecord[];
  sequence: number;
}
