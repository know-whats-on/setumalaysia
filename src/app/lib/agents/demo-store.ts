import { mockAgentsDashboard } from './mock-data';
import type {
  AgentAiRun,
  AgentAnalyticsEvent,
  AgentAuditLog,
  AgentNotification,
  AgentsDashboardData,
  AgentsDemoState,
} from './types';

export const AGENTS_DEMO_STORAGE_KEY = 'hoodie_agents_demo_state_v1';

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function createInitialAgentsDemoState(): AgentsDemoState {
  const base = clone(mockAgentsDashboard);
  base.session.agency.name = 'Northline Property Group';
  base.session.agency.plan = 'Enterprise';
  base.session.user.name = 'Maya Chen';
  base.session.user.email = 'maya.chen@northline.example';
  base.applications = base.applications.map((application) => ({
    ...application,
    source: application.source.includes('2Apply') ? 'Application platform' : 'Applicant portal',
  }));
  base.audit_logs = base.audit_logs.map((log) => ({
    ...log,
    actor: log.actor.includes('pilot.admin') ? base.session.user.email : log.actor,
    object_id: log.object_id.includes('integration-mock')
      ? log.object_id.replace('integration-mock-pm', 'integration-propertyme')
      : log.object_id,
  }));
  base.metrics = [
    { id: 'maintenance_speed', label: 'Maintenance triage time', value: '14m', trend: 'was 2h 40m before Hoodie', tone: 'good' },
    { id: 'owner_updates', label: 'Owner updates due', value: '2', trend: '4 drafted this week', tone: 'warn' },
    { id: 'approvals', label: 'Approval queue', value: '5', trend: '0 sent automatically', tone: 'neutral' },
    { id: 'audit', label: 'Sensitive actions logged', value: '38', trend: '100% coverage', tone: 'good' },
  ];
  base.integrations = [
    {
      id: 'integration-propertyme',
      provider: 'property_management_system',
      label: 'Property management system',
      status: 'connected',
      scopes: ['properties:read', 'contacts:read', 'maintenance:read', 'tasks:write'],
      last_sync_at: '2026-05-03T01:10:00.000Z',
    },
    {
      id: 'integration-applications',
      provider: 'application_platform',
      label: 'Application platform',
      status: 'connected',
      scopes: ['applications:read', 'documents:read', 'status:write'],
      last_sync_at: '2026-05-03T01:18:00.000Z',
    },
    {
      id: 'integration-email',
      provider: 'office_365_mail',
      label: 'Agency shared inbox',
      status: 'connected',
      scopes: ['messages:read', 'approved_sends:write'],
      last_sync_at: '2026-05-03T01:24:00.000Z',
    },
  ];

  return {
    ...base,
    sequence: 100,
    leads: [
      {
        id: 'lead-204',
        name: 'Olivia Martin',
        email: 'olivia.martin@example.com',
        phone: '+61 433 120 441',
        property: '12 Harbour Road',
        source: 'Portal enquiry',
        status: 'new',
        owner: 'Leasing Queue',
        sla: '18m remaining',
        last_touch: 'Asked for Saturday viewing',
      },
      {
        id: 'lead-205',
        name: 'Samir Rao',
        email: 'samir.rao@example.com',
        phone: '+61 421 335 109',
        property: '8 Market Lane',
        source: 'Agency website',
        status: 'qualified',
        owner: 'Sofia Nguyen',
        sla: 'On track',
        last_touch: 'Budget and move date confirmed',
      },
    ],
    inspections: [
      {
        id: 'inspection-301',
        property: '12 Harbour Road',
        attendee: 'Olivia Martin',
        scheduled_at: 'Tomorrow 9:00',
        status: 'scheduled',
        type: 'open_home',
      },
      {
        id: 'inspection-302',
        property: 'Unit 4, 18 Park Street',
        attendee: 'Priya Shah',
        scheduled_at: 'Friday 14:30',
        status: 'confirmed',
        type: 'routine',
      },
    ],
    documents: [
      {
        id: 'doc-501',
        name: 'Leak photos and access note.pdf',
        type: 'maintenance',
        linked_object: 'MNT-882',
        status: 'extracted',
        retention: '7 years',
      },
      {
        id: 'doc-502',
        name: 'APP-1042 income evidence.pdf',
        type: 'application',
        linked_object: 'APP-1042',
        status: 'review_required',
        retention: '90 days after decision',
      },
      {
        id: 'doc-503',
        name: 'Move-in condition pack - Park Street.zip',
        type: 'audit',
        linked_object: 'AUD-220',
        status: 'uploaded',
        retention: 'tenancy + 7 years',
      },
    ],
    evidence_items: [
      {
        id: 'evidence-701',
        title: 'Kitchen leak photos',
        linked_object: 'MNT-882',
        source: 'renter',
        consent_required: true,
        shared: false,
      },
      {
        id: 'evidence-702',
        title: 'Vendor attendance note',
        linked_object: 'MNT-882',
        source: 'vendor',
        consent_required: false,
        shared: false,
      },
    ],
    move_in_audits: [
      {
        id: 'audit-pack-220',
        property: 'Unit 4, 18 Park Street',
        tenant: 'Priya Shah',
        status: 'review',
        checklist_total: 24,
        checklist_done: 19,
        evidence_count: 18,
      },
    ],
    workflows: [
      {
        id: 'workflow-101',
        name: 'Maintenance owner update review',
        trigger: 'Issue status changes to owner_update_due',
        status: 'active',
        last_run: 'Today 10:42',
      },
      {
        id: 'workflow-102',
        name: 'Application missing-doc follow-up',
        trigger: 'Readiness check finds missing required item',
        status: 'approval_required',
        last_run: 'Today 09:16',
      },
    ],
    ai_agents: [
      {
        id: 'agent-maintenance',
        name: 'Maintenance Triage Agent',
        purpose: 'Structures repair requests and drafts next steps.',
        status: 'enabled',
        approval_required: true,
        runs: 18,
      },
      {
        id: 'agent-inbox',
        name: 'PM Inbox Agent',
        purpose: 'Summarises threads and drafts replies from approved sources.',
        status: 'enabled',
        approval_required: true,
        runs: 31,
      },
      {
        id: 'agent-guardrail',
        name: 'Compliance Guardrail Agent',
        purpose: 'Flags risky claims and privacy exposure.',
        status: 'enabled',
        approval_required: false,
        runs: 44,
      },
    ],
    consent_records: [
      {
        id: 'consent-801',
        contact: 'Priya Shah',
        purpose: 'Share renter-originated leak photos with owner for maintenance approval',
        status: 'pending',
        updated_at: 'Today 10:18',
      },
      {
        id: 'consent-802',
        contact: 'Noah Williams',
        purpose: 'Application evidence review by leasing team',
        status: 'granted',
        updated_at: 'Today 09:20',
      },
    ],
    notifications: [
      {
        id: 'notification-1',
        title: 'Owner update ready for review',
        body: 'MNT-882 has a sourced owner update draft waiting for approval.',
        read: false,
        created_at: 'Today 10:42',
      },
      {
        id: 'notification-2',
        title: 'Consent pending',
        body: 'Renter-originated evidence for MNT-882 has not been shared.',
        read: false,
        created_at: 'Today 10:18',
      },
    ],
    timeline_events: [
      {
        id: 'timeline-1',
        object_type: 'maintenance',
        object_id: 'mnt-882',
        title: 'Tenant report received',
        body: 'Priya sent leak photos and access notes through the shared inbox.',
        created_at: 'Today 09:44',
      },
      {
        id: 'timeline-2',
        object_type: 'maintenance',
        object_id: 'mnt-882',
        title: 'Evidence extracted',
        body: 'Document extraction linked three photos and the preferred access window.',
        created_at: 'Today 09:48',
      },
      {
        id: 'timeline-3',
        object_type: 'maintenance',
        object_id: 'mnt-882',
        title: 'Urgency suggested',
        body: 'Assistant suggested urgent review. PM confirmation required before owner update.',
        created_at: 'Today 09:52',
      },
    ],
    analytics_events: [
      {
        id: 'event-1',
        event: 'dashboard_viewed',
        object_type: 'dashboard',
        object_id: 'command-centre',
        created_at: 'Today 09:30',
      },
    ],
    communications: [],
  };
}

export function mergeAgentsDashboard(base: AgentsDemoState, data: AgentsDashboardData): AgentsDemoState {
  return {
    ...base,
    ...data,
    leads: base.leads,
    inspections: base.inspections,
    documents: base.documents,
    evidence_items: base.evidence_items,
    move_in_audits: base.move_in_audits,
    workflows: base.workflows,
    ai_agents: base.ai_agents,
    consent_records: base.consent_records,
    notifications: base.notifications,
    timeline_events: base.timeline_events,
    analytics_events: base.analytics_events,
    communications: base.communications,
    sequence: base.sequence,
  };
}

export function loadAgentsDemoState(): AgentsDemoState {
  const fallback = createInitialAgentsDemoState();
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(AGENTS_DEMO_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<AgentsDemoState>;
    const merged = { ...fallback, ...parsed };
    return {
      ...merged,
      applications: merged.applications.map((application) => ({
        ...application,
        source: application.source.includes('Mock') ? 'Application platform' : application.source,
      })),
      integrations: merged.integrations.map((integration) =>
        integration.label.includes('Mock') || integration.provider.includes('mock')
          ? {
              ...integration,
              label: integration.label.replace('Mock PM system', 'Property management system').replace('Mock application platform', 'Application platform'),
              provider: integration.provider.replace('mock_property_manager', 'property_management_system').replace('mock_application_platform', 'application_platform'),
              status: integration.status === 'mock' ? 'connected' : integration.status,
            }
          : integration,
      ),
      audit_logs: merged.audit_logs.map((log) => ({
        ...log,
        actor: log.actor.includes('pilot.admin') ? fallback.session.user.email : log.actor,
        object_id: log.object_id.includes('integration-mock')
          ? log.object_id.replace('integration-mock-pm', 'integration-propertyme')
          : log.object_id,
      })),
    };
  } catch {
    return fallback;
  }
}

export function saveAgentsDemoState(state: AgentsDemoState) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(AGENTS_DEMO_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Demo should keep working even when storage is unavailable.
  }
}

export function resetAgentsDemoState() {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(AGENTS_DEMO_STORAGE_KEY);
  }
  return createInitialAgentsDemoState();
}

export function nextAgentsDemoId(state: AgentsDemoState, prefix: string) {
  return `${prefix}-${state.sequence + 1}`;
}

export function withAgentsDemoEvent(
  state: AgentsDemoState,
  event: string,
  objectType: string,
  objectId: string,
  actor = state.session.user.email,
): AgentsDemoState {
  const id = nextAgentsDemoId(state, 'event');
  const created_at = new Date().toISOString();
  const analyticsEvent: AgentAnalyticsEvent = {
    id,
    event,
    object_type: objectType,
    object_id: objectId,
    created_at,
  };
  const auditLog: AgentAuditLog = {
    id: nextAgentsDemoId({ ...state, sequence: state.sequence + 1 }, 'audit'),
    action: event,
    object_type: objectType,
    object_id: objectId,
    actor,
    created_at,
  };
  return {
    ...state,
    sequence: state.sequence + 2,
    analytics_events: [analyticsEvent, ...state.analytics_events].slice(0, 80),
    audit_logs: [auditLog, ...state.audit_logs].slice(0, 80),
  };
}

export function addAgentsNotification(state: AgentsDemoState, title: string, body: string): AgentsDemoState {
  const notification: AgentNotification = {
    id: nextAgentsDemoId(state, 'notification'),
    title,
    body,
    read: false,
    created_at: 'Just now',
  };
  return {
    ...state,
    sequence: state.sequence + 1,
    notifications: [notification, ...state.notifications].slice(0, 20),
  };
}

export function addAgentsAiRun(state: AgentsDemoState, run: Omit<AgentAiRun, 'id' | 'created_at'>): AgentsDemoState {
  const aiRun: AgentAiRun = {
    ...run,
    id: nextAgentsDemoId(state, 'ai-run'),
    created_at: new Date().toISOString(),
  };
  return withAgentsDemoEvent(
    {
      ...state,
      sequence: state.sequence + 1,
      approval_queue: [aiRun, ...state.approval_queue],
    },
    'ai_run_created',
    aiRun.object_type,
    aiRun.object_id,
  );
}
