import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router';
import {
  AlertTriangle,
  Bell,
  Bot,
  Building2,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  ClipboardCheck,
  FileCheck2,
  FileText,
  GitBranch,
  Home,
  Inbox,
  KeyRound,
  LayoutDashboard,
  Library,
  LineChart,
  ListChecks,
  Lock,
  Mail,
  MessageSquare,
  RotateCcw,
  PanelRightOpen,
  Plug,
  Plus,
  Search,
  Send,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  Wrench,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Progress } from '../ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { cn } from '../ui/utils';
import {
  approveAgentDraft,
  connectAgentIntegration,
  fetchAgentsDashboard,
  runAgentDraft,
} from '../../lib/agents/api';
import {
  completeAgentEmailLinkIfPresent,
  getAgentFirebaseToken,
  isAgentsFirebaseConfigured,
  sendAgentEmailLink,
  signInAgentWithPassword,
  signOutAgent,
  subscribeAgentsAuth,
} from '../../lib/agents/firebase';
import {
  addAgentsAiRun,
  addAgentsNotification,
  loadAgentsDemoState,
  mergeAgentsDashboard,
  nextAgentsDemoId,
  resetAgentsDemoState,
  saveAgentsDemoState,
  withAgentsDemoEvent,
} from '../../lib/agents/demo-store';
import type {
  AgentAiRun,
  AgentApplication,
  AgentAuditLog,
  AgentMaintenanceIssue,
  AgentMetric,
  AgentQueueItem,
  AgentsDemoState,
} from '../../lib/agents/types';

type AgentsSection =
  | 'command-centre'
  | 'inbox'
  | 'leads'
  | 'contacts'
  | 'properties'
  | 'applications'
  | 'inspections'
  | 'maintenance'
  | 'move-in-audits'
  | 'documents'
  | 'tasks'
  | 'knowledge-base'
  | 'workflows'
  | 'ai-agents'
  | 'reports'
  | 'integrations'
  | 'privacy-centre'
  | 'settings';

type AgentsAuthContext = {
  token: string;
  email: string;
  demoMode: boolean;
  onSignOut: () => Promise<void>;
};

type DetailPanel =
  | { kind: 'queue' | 'thread' | 'lead' | 'contact' | 'property' | 'application' | 'inspection' | 'maintenance' | 'document' | 'audit' | 'workflow' | 'agent' | 'task'; id: string }
  | { kind: 'quick-add' | 'notifications' | 'settings-reset' | 'global-search' }
  | null;

type DemoActions = {
  openDetail: (panel: DetailPanel) => void;
  runAction: (action: string, objectType: string, objectId: string, message?: string) => void;
  startMaintenanceWorkflow: () => void;
  confirmMaintenanceUrgency: (id: string) => void;
  assignMaintenanceVendor: (id: string) => void;
  draftOwnerUpdate: (id: string) => void;
  resolveMaintenanceIssue: (id: string) => void;
  addRecord: (kind: 'lead' | 'contact' | 'property' | 'task' | 'maintenance') => void;
  advanceApplication: (id: string) => void;
  runReadinessCheck: (id: string) => void;
  requestMissingDocs: (id: string) => void;
  qualifyLead: (id: string) => void;
  bookInspectionFromLead: (id: string) => void;
  convertLead: (id: string) => void;
  updateInspection: (id: string, status: 'confirmed' | 'completed' | 'no_show') => void;
  completeTask: (id: string) => void;
  deferTask: (id: string) => void;
  simulateSend: (objectType: string, objectId: string, recipient: string, subject: string) => void;
  simulateExport: (objectType: string, objectId: string, subject: string) => void;
  resetWorkspace: () => void;
};

const sectionLabels: Record<AgentsSection, string> = {
  'command-centre': 'Command Centre',
  inbox: 'Inbox',
  leads: 'Leads',
  contacts: 'Contacts',
  properties: 'Properties',
  applications: 'Applications',
  inspections: 'Inspections',
  maintenance: 'Maintenance',
  'move-in-audits': 'Move-in Audits',
  documents: 'Documents',
  tasks: 'Tasks',
  'knowledge-base': 'Knowledge Base',
  workflows: 'Workflows',
  'ai-agents': 'AI Agents',
  reports: 'Reports',
  integrations: 'Integrations',
  'privacy-centre': 'Privacy Centre',
  settings: 'Settings',
};

const navGroups: Array<{
  label: string;
  items: Array<{ id: AgentsSection; label: string; icon: LucideIcon }>;
}> = [
  {
    label: 'Operate',
    items: [
      { id: 'command-centre', label: 'Command Centre', icon: LayoutDashboard },
      { id: 'inbox', label: 'Inbox', icon: Inbox },
      { id: 'leads', label: 'Leads', icon: Mail },
      { id: 'contacts', label: 'Contacts', icon: Users },
      { id: 'properties', label: 'Properties', icon: Building2 },
    ],
  },
  {
    label: 'Workflows',
    items: [
      { id: 'applications', label: 'Applications', icon: ClipboardCheck },
      { id: 'inspections', label: 'Inspections', icon: CalendarClock },
      { id: 'maintenance', label: 'Maintenance', icon: Wrench },
      { id: 'move-in-audits', label: 'Move-in Audits', icon: Home },
      { id: 'documents', label: 'Documents', icon: FileText },
      { id: 'tasks', label: 'Tasks', icon: ListChecks },
      { id: 'knowledge-base', label: 'Knowledge Base', icon: Library },
      { id: 'workflows', label: 'Workflows', icon: GitBranch },
    ],
  },
  {
    label: 'Control',
    items: [
      { id: 'ai-agents', label: 'AI Agents', icon: Bot },
      { id: 'reports', label: 'Reports', icon: LineChart },
      { id: 'integrations', label: 'Integrations', icon: Plug },
      { id: 'privacy-centre', label: 'Privacy Centre', icon: ShieldCheck },
      { id: 'settings', label: 'Settings', icon: Settings },
    ],
  },
];

const allNavItems = navGroups.flatMap((group) => group.items);

const priorityTone: Record<AgentQueueItem['priority'], string> = {
  low: 'border-agents-steel/35 bg-agents-steel/10 text-[#C9D0D3]',
  medium: 'border-agents-champagne/30 bg-agents-champagne/10 text-[#E7D7B8]',
  high: 'border-agents-amber/40 bg-agents-amber/12 text-[#E5C891]',
  urgent: 'border-agents-oxblood/55 bg-agents-oxblood/15 text-[#E2AAA6]',
};

const metricTone: Record<AgentMetric['tone'], string> = {
  neutral: 'border-agents-border-soft',
  good: 'border-agents-sage/35',
  warn: 'border-agents-amber/38',
  risk: 'border-agents-oxblood/45',
};

const statusTone: Record<string, string> = {
  approved: 'border-agents-sage/40 bg-agents-sage/10 text-[#C7D1BE]',
  drafted: 'border-agents-champagne/35 bg-agents-champagne/10 text-[#E7D7B8]',
  rejected: 'border-agents-oxblood/45 bg-agents-oxblood/12 text-[#E2AAA6]',
  escalated: 'border-agents-amber/40 bg-agents-amber/12 text-[#E5C891]',
  open: 'border-agents-champagne/30 bg-agents-champagne/8 text-[#DDD2BA]',
  waiting: 'border-agents-steel/35 bg-agents-steel/10 text-[#C9D0D3]',
  blocked: 'border-agents-oxblood/45 bg-agents-oxblood/12 text-[#E2AAA6]',
  done: 'border-agents-sage/40 bg-agents-sage/10 text-[#C7D1BE]',
  ready_for_review: 'border-agents-sage/40 bg-agents-sage/10 text-[#C7D1BE]',
  missing_info: 'border-agents-amber/40 bg-agents-amber/12 text-[#E5C891]',
  not_checked: 'border-agents-steel/35 bg-agents-steel/10 text-[#C9D0D3]',
  urgent: 'border-agents-oxblood/45 bg-agents-oxblood/12 text-[#E2AAA6]',
  emergency: 'border-agents-oxblood/55 bg-agents-oxblood/15 text-[#E2AAA6]',
  routine: 'border-agents-steel/35 bg-agents-steel/10 text-[#C9D0D3]',
  soon: 'border-agents-amber/38 bg-agents-amber/12 text-[#E5C891]',
  mock: 'border-agents-steel/35 bg-agents-steel/10 text-[#C9D0D3]',
  connected: 'border-agents-sage/40 bg-agents-sage/10 text-[#C7D1BE]',
  qualified: 'border-agents-sage/40 bg-agents-sage/10 text-[#C7D1BE]',
  inspection_booked: 'border-agents-champagne/35 bg-agents-champagne/10 text-[#E7D7B8]',
  converted: 'border-agents-sage/40 bg-agents-sage/10 text-[#C7D1BE]',
  scheduled: 'border-agents-champagne/35 bg-agents-champagne/10 text-[#E7D7B8]',
  confirmed: 'border-agents-sage/40 bg-agents-sage/10 text-[#C7D1BE]',
  completed: 'border-agents-sage/40 bg-agents-sage/10 text-[#C7D1BE]',
  no_show: 'border-agents-amber/40 bg-agents-amber/12 text-[#E5C891]',
  active: 'border-agents-sage/40 bg-agents-sage/10 text-[#C7D1BE]',
  approval_required: 'border-agents-amber/40 bg-agents-amber/12 text-[#E5C891]',
  enabled: 'border-agents-sage/40 bg-agents-sage/10 text-[#C7D1BE]',
  review: 'border-agents-amber/40 bg-agents-amber/12 text-[#E5C891]',
  extracted: 'border-agents-sage/40 bg-agents-sage/10 text-[#C7D1BE]',
  review_required: 'border-agents-amber/40 bg-agents-amber/12 text-[#E5C891]',
  uploaded: 'border-agents-steel/35 bg-agents-steel/10 text-[#C9D0D3]',
  sent_simulated: 'border-agents-sage/40 bg-agents-sage/10 text-[#C7D1BE]',
  exported_simulated: 'border-agents-sage/40 bg-agents-sage/10 text-[#C7D1BE]',
  error: 'border-agents-oxblood/45 bg-agents-oxblood/12 text-[#E2AAA6]',
  disabled: 'border-agents-border-soft bg-agents-surface-3 text-agents-text-faint',
};

function getSectionFromPath(pathname: string): AgentsSection {
  const [, afterAgents = ''] = pathname.split('/agents/');
  const candidate = (afterAgents.split('/')[0] || 'command-centre') as AgentsSection;
  return sectionLabels[candidate] ? candidate : 'command-centre';
}

function formatShortTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-AU', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function sentenceCase(value: string) {
  return value.replace(/_/g, ' ');
}

function SectionHeader({
  title,
  subtitle,
  action,
  eyebrow,
}: {
  title: string;
  subtitle: string;
  action?: ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="border-b border-agents-border-soft px-5 py-5 lg:px-7">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          {eyebrow && <p className="agents-label mb-2">{eyebrow}</p>}
          <h1 className="text-[26px] font-semibold leading-tight tracking-[0] text-agents-text md:text-[30px]">
            {title}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-agents-text-muted">{subtitle}</p>
        </div>
        {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
      </div>
    </div>
  );
}

function CrmSurface({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section className={cn('agents-surface overflow-hidden', className)}>
      {children}
    </section>
  );
}

function SurfaceHeader({
  title,
  subtitle,
  meta,
}: {
  title: string;
  subtitle?: string;
  meta?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-agents-border-soft px-4 py-3">
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold tracking-[0] text-agents-text">{title}</h2>
        {subtitle && <p className="mt-1 text-xs leading-5 text-agents-text-muted">{subtitle}</p>}
      </div>
      {meta}
    </div>
  );
}

function StatusBadge({ value, className }: { value: string; className?: string }) {
  const normalized = value.toLowerCase().replace(/\s+/g, '_');
  return (
    <Badge
      variant="outline"
      className={cn('capitalize', statusTone[normalized] || 'border-agents-border-soft bg-agents-surface-3 text-agents-text-muted', className)}
    >
      {sentenceCase(value)}
    </Badge>
  );
}

function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex min-h-[210px] flex-col justify-center px-6 py-10 text-left">
      <div className="mb-5 h-px w-12 bg-agents-border" />
      <h3 className="text-base font-semibold tracking-[0] text-agents-text">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-agents-text-muted">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

function AgentsAuthGate({ children }: { children: (auth: AgentsAuthContext) => ReactNode }) {
  const [firebaseReady] = useState(() => isAgentsFirebaseConfigured());
  const [status, setStatus] = useState<'checking' | 'signed-out' | 'signed-in' | 'demo' | 'error'>('checking');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!firebaseReady) {
      setStatus('signed-out');
      return () => undefined;
    }

    let active = true;
    void completeAgentEmailLinkIfPresent().catch((err) => {
      if (!active) return;
      setMessage(err?.message || 'Email link sign-in could not be completed.');
    });

    return subscribeAgentsAuth((user) => {
      if (!active) return;
      if (!user) {
        setToken('');
        setStatus('signed-out');
        return;
      }
      void getAgentFirebaseToken(user)
        .then((nextToken) => {
          if (!active) return;
          setToken(nextToken);
          setEmail(user.email || '');
          setStatus('signed-in');
        })
        .catch((err) => {
          if (!active) return;
          setMessage(err?.message || 'Could not read Firebase session.');
          setStatus('error');
        });
    });
  }, [firebaseReady]);

  const handlePasswordSignIn = async () => {
    setBusy(true);
    setMessage('');
    try {
      await signInAgentWithPassword(email, password);
    } catch (err: any) {
      setMessage(err?.message || 'Sign-in failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleEmailLink = async () => {
    setBusy(true);
    setMessage('');
    try {
      await sendAgentEmailLink(email);
      setMessage('Check your email for the sign-in link.');
    } catch (err: any) {
      setMessage(err?.message || 'Could not send sign-in link.');
    } finally {
      setBusy(false);
    }
  };

  if (status === 'signed-in' || status === 'demo') {
    return (
      <>
        {children({
          token,
          email: email || loadAgentsDemoState().session.user.email,
          demoMode: status === 'demo',
          onSignOut: async () => {
            if (status === 'demo') {
              setStatus('signed-out');
              return;
            }
            await signOutAgent();
          },
        })}
      </>
    );
  }

  return (
    <div className="agents-shell flex min-h-screen items-center justify-center px-4 py-8">
      <div className="w-full max-w-[500px] rounded-[12px] border border-agents-border bg-agents-surface p-6">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-lg border border-agents-border bg-agents-surface-2 text-agents-text">
            <Building2 className="size-5" />
          </div>
          <div>
            <p className="agents-label">Hoodie for Agents</p>
            <h1 className="mt-1 text-2xl font-semibold leading-tight tracking-[0] text-agents-text">Agency command centre</h1>
          </div>
        </div>

        <div className="mt-6 rounded-lg border border-agents-amber/35 bg-agents-amber/10 px-4 py-3 text-sm leading-6 text-[#E5C891]">
          <div className="flex gap-2">
            <Lock className="mt-0.5 size-4 shrink-0" />
            <p>
              Firebase Auth is used for agency identity. External AI sends stay locked behind approval, audit logs,
              consent records, and role permissions.
            </p>
          </div>
        </div>

        {!firebaseReady && (
          <div className="mt-4 rounded-lg border border-agents-border-soft bg-agents-surface-2 px-4 py-3 text-sm leading-6 text-agents-text-muted">
            Live sign-in is not configured in this build. Use workspace access for this presentation.
          </div>
        )}

        {firebaseReady && (
          <div className="mt-5 flex flex-col gap-3">
            <label className="agents-label" htmlFor="agents-email">
              Work email
            </label>
            <Input
              id="agents-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="pm@agency.com.au"
            />
            <label className="agents-label" htmlFor="agents-password">
              Password
            </label>
            <Input
              id="agents-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Firebase Auth password"
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <Button onClick={handlePasswordSignIn} disabled={busy || !email || !password}>
                <KeyRound />
                Sign in
              </Button>
              <Button variant="outline" onClick={handleEmailLink} disabled={busy || !email}>
                Send email link
              </Button>
            </div>
          </div>
        )}

        <Button
          className="mt-4 w-full"
          variant={firebaseReady ? 'secondary' : 'default'}
          onClick={() => setStatus('demo')}
        >
          Open workspace
        </Button>

        {message && (
          <p className={cn('mt-4 text-sm leading-6', status === 'error' ? 'text-[#E2AAA6]' : 'text-agents-text-muted')}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
}

export function AgentsAppShell() {
  return (
    <AgentsAuthGate>
      {(auth) => <AgentsWorkspace auth={auth} />}
    </AgentsAuthGate>
  );
}

function AgentsWorkspace({ auth }: { auth: AgentsAuthContext }) {
  const location = useLocation();
  const navigate = useNavigate();
  const activeSection = getSectionFromPath(location.pathname);
  const [dashboard, setDashboard] = useState<AgentsDemoState>(() => loadAgentsDemoState());
  const [approvalQueue, setApprovalQueue] = useState<AgentAiRun[]>(() => loadAgentsDemoState().approval_queue);
  const [search, setSearch] = useState('');
  const [apiNotice, setApiNotice] = useState('');
  const [working, setWorking] = useState(false);
  const [detailPanel, setDetailPanel] = useState<DetailPanel>(null);

  useEffect(() => {
    setApprovalQueue(dashboard.approval_queue);
    saveAgentsDemoState(dashboard);
  }, [dashboard]);

  useEffect(() => {
    if (!auth.token) return;
    let active = true;
    setApiNotice('');
    void fetchAgentsDashboard(auth.token)
      .then((data) => {
        if (!active) return;
        const merged = mergeAgentsDashboard(loadAgentsDemoState(), data);
        setDashboard(merged);
        setApprovalQueue(data.approval_queue);
      })
      .catch((err) => {
        if (!active) return;
        setApiNotice(`${err?.message || 'Live API is unavailable.'} Continuing in offline sales workspace.`);
        const fallback = loadAgentsDemoState();
        setDashboard(fallback);
        setApprovalQueue(fallback.approval_queue);
      });
    return () => {
      active = false;
    };
  }, [auth.token]);

  const mutateDemo = useCallback((producer: (current: AgentsDemoState) => AgentsDemoState) => {
    setDashboard((current) => {
      const next = producer(current);
      saveAgentsDemoState(next);
      return next;
    });
  }, []);

  const filteredQueue = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return dashboard.priority_queue;
    return dashboard.priority_queue.filter((item) =>
      [item.title, item.entity, item.owner, item.status].some((value) => value.toLowerCase().includes(q)),
    );
  }, [dashboard.priority_queue, search]);

  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    const resultRows: Array<{ label: string; meta: string; panel: DetailPanel }> = [];
    dashboard.contacts.forEach((item) => {
      if ([item.name, item.email, item.role].some((value) => value.toLowerCase().includes(q))) {
        resultRows.push({ label: item.name, meta: `${item.role} · ${item.email}`, panel: { kind: 'contact', id: item.id } });
      }
    });
    dashboard.properties.forEach((item) => {
      if ([item.address, item.owner, item.manager].some((value) => value.toLowerCase().includes(q))) {
        resultRows.push({ label: item.address, meta: `${item.manager} · ${item.status}`, panel: { kind: 'property', id: item.id } });
      }
    });
    dashboard.maintenance_issues.forEach((item) => {
      if ([item.title, item.property, item.tenant].some((value) => value.toLowerCase().includes(q))) {
        resultRows.push({ label: item.title, meta: `${item.property} · ${item.status}`, panel: { kind: 'maintenance', id: item.id } });
      }
    });
    dashboard.leads.forEach((item) => {
      if ([item.name, item.property, item.status].some((value) => value.toLowerCase().includes(q))) {
        resultRows.push({ label: item.name, meta: `${item.property} · ${item.status}`, panel: { kind: 'lead', id: item.id } });
      }
    });
    return resultRows.slice(0, 8);
  }, [dashboard, search]);

  const runAction = useCallback((action: string, objectType: string, objectId: string, message?: string) => {
    mutateDemo((current) => {
      const next = withAgentsDemoEvent(current, action, objectType, objectId, auth.email);
      return message ? addAgentsNotification(next, sentenceCase(action), message) : next;
    });
  }, [auth.email, mutateDemo]);

  const handleApproval = async (run: AgentAiRun, decision: AgentAiRun['status']) => {
    mutateDemo((current) => {
      let next: AgentsDemoState = {
        ...current,
        approval_queue: current.approval_queue.map((item) => (item.id === run.id ? { ...item, status: decision } : item)),
      };
      if (decision === 'approved') {
        next = {
          ...next,
          communications: [
            {
              id: nextAgentsDemoId(next, 'communication'),
              channel: 'email',
              recipient: run.object_type === 'maintenance_issue' ? 'owner@example.com' : 'tenant@example.com',
              subject: `${run.agent} approved output`,
              status: 'sent_simulated',
              linked_object: run.object_id,
              created_at: new Date().toISOString(),
            },
            ...next.communications,
          ],
          sequence: next.sequence + 1,
        };
      }
      next = withAgentsDemoEvent(next, `ai_draft_${decision}`, 'ai_agent_run', run.id, auth.email);
      return addAgentsNotification(next, `Draft ${decision}`, `${run.agent} was ${decision} and logged.`);
    });
    if (!auth.token || decision === 'drafted') return;
    try {
      await approveAgentDraft(auth.token, run.id, decision);
    } catch (err: any) {
      setApiNotice(`${err?.message || 'Approval could not be synced.'} Local approval state is visible only here.`);
    }
  };

  const handleMockDraft = async () => {
    setWorking(true);
    const localRun = {
      agent: 'PM Inbox Agent',
      object_type: 'conversation_thread',
      object_id: 'thread-001',
      output:
        'Draft reply: We have logged your update and will confirm the next action once a property manager reviews the linked record. This draft is not sent until approved.',
      confidence: 0.8,
      sources: ['Thread TH-001', 'Agency template: maintenance acknowledgement'],
      status: 'drafted',
      requires_approval: true,
    } satisfies Omit<AgentAiRun, 'id' | 'created_at'>;
    try {
      const run = auth.token
        ? await runAgentDraft(auth.token, {
            agent: localRun.agent,
            object_type: localRun.object_type,
            object_id: localRun.object_id,
            prompt: 'Draft a source-grounded acknowledgement for the selected maintenance thread.',
          })
        : null;
      mutateDemo((current) => {
        const next = run
          ? { ...current, approval_queue: [run, ...current.approval_queue] }
          : addAgentsAiRun(current, localRun);
        return addAgentsNotification(next, 'Draft ready for review', 'Assistant created a sourced draft and placed it in the approval queue.');
      });
    } catch (err: any) {
      mutateDemo((current) => addAgentsNotification(addAgentsAiRun(current, localRun), 'Draft ready for review', 'Assistant created a sourced draft and placed it in the approval queue.'));
      setApiNotice(`${err?.message || 'AI draft could not be synced.'} Added a local draft for review.`);
    } finally {
      setWorking(false);
    }
  };

  const handleMockConnector = async () => {
    setWorking(true);
    try {
      if (auth.token) {
        const integration = await connectAgentIntegration(auth.token, 'mock_property_manager');
        const visibleIntegration = {
          ...integration,
          provider: integration.provider.replace('mock_property_manager', 'property_management_system').replace('mock_application_platform', 'application_platform'),
          label: integration.label.replace('Mock PM system', 'Property management system').replace('Mock application platform', 'Application platform'),
          status: integration.status === 'mock' ? 'connected' : integration.status,
        };
        mutateDemo((current) => ({
          ...current,
          integrations: [visibleIntegration, ...current.integrations.filter((item) => item.id !== visibleIntegration.id)],
        }));
      }
      runAction('integration_synced', 'integration_connection', 'property_management_system', 'Integration sync completed and field mapping was logged.');
    } catch (err: any) {
      setApiNotice(`${err?.message || 'Connector could not be synced.'} Check agency permissions.`);
    } finally {
      setWorking(false);
    }
  };

  const startMaintenanceWorkflow = useCallback(() => {
    navigate('/agents/maintenance');
    mutateDemo((current) => {
      const issueId = 'mnt-882';
      let next: AgentsDemoState = {
        ...current,
        maintenance_issues: current.maintenance_issues.map((issue) =>
          issue.id === issueId ? { ...issue, status: 'triage', urgency: 'urgent', timeline_count: issue.timeline_count + 1 } : issue,
        ),
        priority_queue: current.priority_queue.map((item) =>
          item.id === 'queue-maint-1' ? { ...item, status: 'PM confirmation required', priority: 'urgent' } : item,
        ),
        timeline_events: [
          {
            id: nextAgentsDemoId(current, 'timeline'),
            object_type: 'maintenance',
            object_id: issueId,
            title: 'Guided maintenance workflow started',
            body: 'Hoodie grouped the tenant report, evidence, vendor handoff, owner update, and approval queue.',
            created_at: 'Just now',
          },
          ...current.timeline_events,
        ],
        sequence: current.sequence + 1,
      };
      next = addAgentsAiRun(next, {
        agent: 'Maintenance Triage Agent',
        object_type: 'maintenance_issue',
        object_id: issueId,
        output: 'Suggested next step: confirm urgency, assign preferred plumber, and draft an owner-safe update using the linked evidence. This is a suggestion only.',
        confidence: 0.88,
        sources: ['Maintenance issue MNT-882', 'Email thread TH-001', 'Agency SOP: urgent repairs'],
        status: 'drafted',
        requires_approval: true,
      });
      return addAgentsNotification(next, 'Maintenance workflow started', 'MNT-882 is ready for PM confirmation and owner update review.');
    });
    setDetailPanel({ kind: 'maintenance', id: 'mnt-882' });
  }, [mutateDemo, navigate]);

  const confirmMaintenanceUrgency = useCallback((id: string) => {
    mutateDemo((current) => {
      const next = withAgentsDemoEvent({
        ...current,
        maintenance_issues: current.maintenance_issues.map((issue) =>
          issue.id === id ? { ...issue, urgency: 'urgent', status: 'owner_update_due', timeline_count: issue.timeline_count + 1 } : issue,
        ),
        tasks: current.tasks.map((task) =>
          task.linked_object === 'MNT-882' ? { ...task, status: 'open', due: 'Today 15:00' } : task,
        ),
      }, 'maintenance_urgency_confirmed', 'maintenance_issue', id, auth.email);
      return addAgentsNotification(next, 'Urgency confirmed', 'Owner update and vendor handoff are ready for review.');
    });
  }, [auth.email, mutateDemo]);

  const assignMaintenanceVendor = useCallback((id: string) => {
    mutateDemo((current) => addAgentsNotification(withAgentsDemoEvent({
      ...current,
      maintenance_issues: current.maintenance_issues.map((issue) =>
        issue.id === id ? { ...issue, status: 'vendor_assigned', timeline_count: issue.timeline_count + 1 } : issue,
      ),
      timeline_events: [
        {
          id: nextAgentsDemoId(current, 'timeline'),
          object_type: 'maintenance',
          object_id: id,
          title: 'Vendor assigned',
          body: 'Preferred plumber assigned with tenant access window and evidence pack.',
          created_at: 'Just now',
        },
        ...current.timeline_events,
      ],
      sequence: current.sequence + 1,
    }, 'vendor_assigned', 'maintenance_issue', id, auth.email), 'Vendor assigned', 'Vendor handoff was simulated and logged.'));
  }, [auth.email, mutateDemo]);

  const draftOwnerUpdate = useCallback((id: string) => {
    mutateDemo((current) => addAgentsNotification(addAgentsAiRun(current, {
      agent: 'Landlord Update Agent',
      object_type: 'maintenance_issue',
      object_id: id,
      output: 'Owner update draft: The tenant has reported a kitchen leak with photo evidence. We have assigned a plumber and will confirm the attendance window before any further action. Renter-originated evidence will not be shared without consent.',
      confidence: 0.86,
      sources: ['Maintenance timeline MNT-882', 'Vendor handoff note', 'Privacy rule: renter-originated evidence'],
      status: 'drafted',
      requires_approval: true,
    }), 'Owner update drafted', 'Draft is waiting in Assistant Review.'));
  }, [mutateDemo]);

  const resolveMaintenanceIssue = useCallback((id: string) => {
    mutateDemo((current) => addAgentsNotification(withAgentsDemoEvent({
      ...current,
      maintenance_issues: current.maintenance_issues.map((issue) =>
        issue.id === id ? { ...issue, status: 'resolved', timeline_count: issue.timeline_count + 1 } : issue,
      ),
      tasks: current.tasks.map((task) => task.linked_object === 'MNT-882' ? { ...task, status: 'done' } : task),
      metrics: current.metrics.map((metric) =>
        metric.id === 'maintenance_speed' ? { ...metric, value: '9m', trend: 'workflow completed' } : metric,
      ),
    }, 'maintenance_issue_resolved', 'maintenance_issue', id, auth.email), 'Issue resolved', 'Maintenance timeline and reporting metrics were updated.'));
  }, [auth.email, mutateDemo]);

  const addRecord = useCallback((kind: 'lead' | 'contact' | 'property' | 'task' | 'maintenance') => {
    mutateDemo((current) => {
      let next: AgentsDemoState = current;
      const id = nextAgentsDemoId(current, kind);
      if (kind === 'lead') {
        next = { ...current, sequence: current.sequence + 1, leads: [{ id, name: 'Grace Ellis', email: 'grace.ellis@example.com', phone: '+61 422 610 991', property: '8 Market Lane', source: 'Agency website', status: 'new', owner: 'Leasing Queue', sla: '29m remaining', last_touch: 'Asked for move-in date' }, ...current.leads] };
      }
      if (kind === 'contact') {
        next = { ...current, sequence: current.sequence + 1, contacts: [{ id, name: 'Grace Ellis', email: 'grace.ellis@example.com', phone: '+61 422 610 991', role: 'applicant', consent_status: 'pending', last_touch: 'Created from quick add' }, ...current.contacts] };
      }
      if (kind === 'property') {
        next = { ...current, sequence: current.sequence + 1, properties: [{ id, address: '8 Market Lane, Newcastle NSW', owner: 'Harper Stone', manager: 'Maya Chen', status: 'listed', open_items: 2 }, ...current.properties] };
      }
      if (kind === 'task') {
        next = { ...current, sequence: current.sequence + 1, tasks: [{ id, title: 'Call owner with maintenance update', owner: 'Maya Chen', due: 'Today', status: 'open', linked_object: 'MNT-882' }, ...current.tasks] };
      }
      if (kind === 'maintenance') {
        next = { ...current, sequence: current.sequence + 1, maintenance_issues: [{ id, title: 'Air conditioner not cooling', property: '8 Market Lane', tenant: 'Grace Ellis', urgency: 'soon', status: 'new', timeline_count: 1 }, ...current.maintenance_issues] };
      }
      return addAgentsNotification(withAgentsDemoEvent(next, `${kind}_created`, kind, id, auth.email), `${sentenceCase(kind)} created`, 'New record is visible and persisted for this sales workspace.');
    });
    setDetailPanel(null);
  }, [auth.email, mutateDemo]);

  const advanceApplication = useCallback((id: string) => {
    const stages: AgentApplication['stage'][] = ['New', 'Incomplete', 'Awaiting Applicant', 'Under Review', 'Ready for PM', 'Approved'];
    mutateDemo((current) => addAgentsNotification(withAgentsDemoEvent({
      ...current,
      applications: current.applications.map((application) => {
        if (application.id !== id) return application;
        const nextIndex = Math.min(stages.indexOf(application.stage) + 1, stages.length - 1);
        return { ...application, stage: stages[nextIndex] };
      }),
    }, 'application_stage_changed', 'application', id, auth.email), 'Application advanced', 'Pipeline stage updated and logged.'));
  }, [auth.email, mutateDemo]);

  const runReadinessCheck = useCallback((id: string) => {
    mutateDemo((current) => addAgentsNotification(withAgentsDemoEvent({
      ...current,
      applications: current.applications.map((application) =>
        application.id === id ? { ...application, readiness_status: application.missing_items.length ? 'missing_info' : 'ready_for_review' } : application,
      ),
    }, 'applicant_readiness_completed', 'application', id, auth.email), 'Readiness check complete', 'Completeness only. No suitability scoring was created.'));
  }, [auth.email, mutateDemo]);

  const requestMissingDocs = useCallback((id: string) => {
    mutateDemo((current) => addAgentsNotification(withAgentsDemoEvent({
      ...current,
      applications: current.applications.map((application) =>
        application.id === id ? { ...application, stage: 'Awaiting Applicant', readiness_status: 'missing_info' } : application,
      ),
      communications: [{
        id: nextAgentsDemoId(current, 'communication'),
        channel: 'email',
        recipient: 'applicant@example.com',
        subject: 'Missing document request',
        status: 'sent_simulated',
        linked_object: id,
        created_at: new Date().toISOString(),
      }, ...current.communications],
      sequence: current.sequence + 1,
    }, 'missing_doc_requested', 'application', id, auth.email), 'Missing document request sent', 'Outbound message was simulated and audited.'));
  }, [auth.email, mutateDemo]);

  const qualifyLead = useCallback((id: string) => {
    mutateDemo((current) => addAgentsNotification(withAgentsDemoEvent({
      ...current,
      leads: current.leads.map((lead) => lead.id === id ? { ...lead, status: 'qualified', last_touch: 'Qualified by leasing team' } : lead),
    }, 'lead_qualified', 'lead', id, auth.email), 'Lead qualified', 'Lead moved to inspection-ready status.'));
  }, [auth.email, mutateDemo]);

  const bookInspectionFromLead = useCallback((id: string) => {
    mutateDemo((current) => {
      const lead = current.leads.find((item) => item.id === id);
      const inspectionId = nextAgentsDemoId(current, 'inspection');
      return addAgentsNotification(withAgentsDemoEvent({
        ...current,
        sequence: current.sequence + 1,
        leads: current.leads.map((item) => item.id === id ? { ...item, status: 'inspection_booked', last_touch: 'Inspection booked for tomorrow' } : item),
        inspections: [{ id: inspectionId, property: lead?.property || '12 Harbour Road', attendee: lead?.name || 'Prospect', scheduled_at: 'Tomorrow 10:30', status: 'scheduled', type: 'private' }, ...current.inspections],
      }, 'inspection_scheduled', 'lead', id, auth.email), 'Inspection booked', 'Calendar invite and reminder were simulated.');
    });
  }, [auth.email, mutateDemo]);

  const convertLead = useCallback((id: string) => {
    mutateDemo((current) => {
      const lead = current.leads.find((item) => item.id === id);
      const appId = nextAgentsDemoId(current, 'app');
      return addAgentsNotification(withAgentsDemoEvent({
        ...current,
        sequence: current.sequence + 1,
        leads: current.leads.map((item) => item.id === id ? { ...item, status: 'converted' } : item),
        applications: lead ? [{ id: appId, applicant: lead.name, property: lead.property, stage: 'New', readiness_status: 'not_checked', missing_items: ['Proof of income'], source: 'Portal enquiry' }, ...current.applications] : current.applications,
      }, 'lead_converted', 'lead', id, auth.email), 'Lead converted', 'Application shell was created from the lead.');
    });
  }, [auth.email, mutateDemo]);

  const updateInspection = useCallback((id: string, status: 'confirmed' | 'completed' | 'no_show') => {
    mutateDemo((current) => addAgentsNotification(withAgentsDemoEvent({
      ...current,
      inspections: current.inspections.map((inspection) => inspection.id === id ? { ...inspection, status } : inspection),
    }, `inspection_${status}`, 'inspection', id, auth.email), 'Inspection updated', `Inspection marked ${sentenceCase(status)}.`));
  }, [auth.email, mutateDemo]);

  const completeTask = useCallback((id: string) => {
    mutateDemo((current) => addAgentsNotification(withAgentsDemoEvent({
      ...current,
      tasks: current.tasks.map((task) => task.id === id ? { ...task, status: 'done' } : task),
    }, 'task_completed', 'task', id, auth.email), 'Task complete', 'Task was completed and logged.'));
  }, [auth.email, mutateDemo]);

  const deferTask = useCallback((id: string) => {
    mutateDemo((current) => addAgentsNotification(withAgentsDemoEvent({
      ...current,
      tasks: current.tasks.map((task) => task.id === id ? { ...task, status: 'waiting', due: 'Tomorrow' } : task),
    }, 'task_deferred', 'task', id, auth.email), 'Task deferred', 'Task due date moved to tomorrow.'));
  }, [auth.email, mutateDemo]);

  const simulateSend = useCallback((objectType: string, objectId: string, recipient: string, subject: string) => {
    mutateDemo((current) => addAgentsNotification(withAgentsDemoEvent({
      ...current,
      sequence: current.sequence + 1,
      communications: [{
        id: nextAgentsDemoId(current, 'communication'),
        channel: 'email',
        recipient,
        subject,
        status: 'sent_simulated',
        linked_object: objectId,
        created_at: new Date().toISOString(),
      }, ...current.communications],
    }, 'simulated_external_send', objectType, objectId, auth.email), 'Message sent', 'External send was simulated and audited.'));
  }, [auth.email, mutateDemo]);

  const simulateExport = useCallback((objectType: string, objectId: string, subject: string) => {
    mutateDemo((current) => addAgentsNotification(withAgentsDemoEvent({
      ...current,
      sequence: current.sequence + 1,
      communications: [{
        id: nextAgentsDemoId(current, 'export'),
        channel: 'export',
        recipient: 'Internal review',
        subject,
        status: 'exported_simulated',
        linked_object: objectId,
        created_at: new Date().toISOString(),
      }, ...current.communications],
    }, 'simulated_export_created', objectType, objectId, auth.email), 'Export created', 'Export was simulated and audit logged.'));
  }, [auth.email, mutateDemo]);

  const resetWorkspace = useCallback(() => {
    const reset = resetAgentsDemoState();
    setDashboard(reset);
    setApprovalQueue(reset.approval_queue);
    setDetailPanel(null);
    setApiNotice('');
  }, []);

  const demoActions: DemoActions = {
    openDetail: setDetailPanel,
    runAction,
    startMaintenanceWorkflow,
    confirmMaintenanceUrgency,
    assignMaintenanceVendor,
    draftOwnerUpdate,
    resolveMaintenanceIssue,
    addRecord,
    advanceApplication,
    runReadinessCheck,
    requestMissingDocs,
    qualifyLead,
    bookInspectionFromLead,
    convertLead,
    updateInspection,
    completeTask,
    deferTask,
    simulateSend,
    simulateExport,
    resetWorkspace,
  };

  const activeLabel = sectionLabels[activeSection];

  return (
    <div className="agents-shell flex h-screen overflow-hidden text-agents-text">
      <aside className="hidden w-[268px] shrink-0 border-r border-agents-border-soft bg-agents-rail lg:flex lg:flex-col">
        <div className="border-b border-agents-border-soft px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg border border-agents-border bg-agents-surface-2 text-agents-text">
              <Building2 className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-[0] text-agents-text">Hoodie for Agents</p>
              <p className="truncate text-xs text-agents-text-muted">{dashboard.session.agency.name}</p>
            </div>
          </div>
        </div>
        <nav className="agents-scrollbar min-h-0 flex-1 overflow-y-auto px-2 py-3">
          {navGroups.map((group) => (
            <div key={group.label} className="mb-4">
              <p className="agents-label px-3 pb-2">{group.label}</p>
              <div className="flex flex-col gap-1">
                {group.items.map(({ id, label, icon: Icon }) => {
                  const active = activeSection === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      className={cn(
                        'group flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left text-sm transition duration-150',
                        active
                          ? 'border-agents-border bg-agents-surface-2 text-agents-text'
                          : 'border-transparent text-agents-text-muted hover:border-agents-border-soft hover:bg-agents-surface hover:text-agents-text',
                      )}
                      onClick={() => navigate(id === 'command-centre' ? '/agents' : `/agents/${id}`)}
                    >
                      <Icon className={cn('size-4 shrink-0', active ? 'text-agents-text' : 'text-agents-text-faint group-hover:text-agents-text-muted')} />
                      <span className="truncate">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="border-t border-agents-border-soft p-3">
          <div className="rounded-lg border border-agents-border-soft bg-agents-surface px-3 py-3">
            <p className="agents-label">{dashboard.session.user.role}</p>
            <p className="mt-1 truncate text-sm font-medium text-agents-text">{auth.email}</p>
            <Button className="mt-3 w-full" size="sm" variant="outline" onClick={auth.onSignOut}>
              Sign out
            </Button>
          </div>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="shrink-0 border-b border-agents-border-soft bg-agents-surface/95 px-4 py-3 lg:px-5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-3 lg:hidden">
                <Building2 className="size-5" />
                <span className="text-sm font-semibold">Hoodie for Agents</span>
              </div>
              <div className="hidden items-center gap-2 text-sm text-agents-text-muted xl:flex">
                <span>{dashboard.session.agency.name}</span>
                <ChevronRight className="size-4 text-agents-text-faint" />
                <span className="text-agents-text">{activeLabel}</span>
              </div>
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-2 md:flex-row md:items-center md:justify-end">
              <div className="relative w-full max-w-xl">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-agents-text-faint" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="border-agents-border-soft bg-agents-surface-2 pl-9 text-agents-text placeholder:text-agents-text-faint"
                  placeholder="Search queues, people, properties, issues"
                />
                {searchResults.length > 0 && (
                  <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 overflow-hidden rounded-lg border border-agents-border bg-agents-surface">
                    {searchResults.map((result) => (
                      <button
                        key={`${result.label}-${result.meta}`}
                        type="button"
                        className="block w-full px-3 py-2 text-left hover:bg-agents-surface-2"
                        onClick={() => {
                          setDetailPanel(result.panel);
                          setSearch('');
                        }}
                      >
                        <p className="truncate text-sm font-medium text-agents-text">{result.label}</p>
                        <p className="mt-1 truncate text-xs text-agents-text-muted">{result.meta}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-agents-sage/35 bg-agents-sage/10 text-[#C7D1BE]">
                  Human approval on
                </Badge>
                <Button size="sm" variant="outline" onClick={() => setDetailPanel({ kind: 'quick-add' })}>
                  <Plus />
                  Add
                </Button>
                <Button onClick={handleMockDraft} disabled={working} size="sm">
                  <MessageSquare />
                  Draft
                </Button>
                <Button size="icon" variant="outline" aria-label="Notifications" onClick={() => setDetailPanel({ kind: 'notifications' })}>
                  <Bell />
                </Button>
              </div>
            </div>
          </div>
          <div className="agents-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1 lg:hidden">
            {allNavItems.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                className={cn(
                  'shrink-0 rounded-md border px-3 py-1.5 text-xs transition',
                  activeSection === id
                    ? 'border-agents-border bg-agents-surface-2 text-agents-text'
                    : 'border-agents-border-soft text-agents-text-muted',
                )}
                onClick={() => navigate(id === 'command-centre' ? '/agents' : `/agents/${id}`)}
              >
                {label}
              </button>
            ))}
          </div>
        </header>

        {apiNotice && (
          <div className="border-b border-agents-amber/25 bg-agents-amber/10 px-5 py-2 text-sm text-[#E5C891]">
            {apiNotice}
          </div>
        )}

        <div className="flex min-h-0 flex-1">
          <section className="agents-scrollbar min-w-0 flex-1 overflow-y-auto">
            {renderSection(activeSection, {
              dashboard,
              filteredQueue,
              approvalQueue,
              handleApproval,
              handleMockConnector,
              working,
              actions: demoActions,
            })}
          </section>
          <AssistantPanel approvalQueue={approvalQueue} onApproval={handleApproval} />
        </div>
      </main>
      <AgentsDetailPanel panel={detailPanel} state={dashboard} actions={demoActions} onClose={() => setDetailPanel(null)} />
    </div>
  );
}

function renderSection(
  section: AgentsSection,
  props: {
    dashboard: AgentsDemoState;
    filteredQueue: AgentQueueItem[];
    approvalQueue: AgentAiRun[];
    handleApproval: (run: AgentAiRun, decision: AgentAiRun['status']) => void;
    handleMockConnector: () => void;
    working: boolean;
    actions: DemoActions;
  },
) {
  const { dashboard, filteredQueue, approvalQueue, handleApproval, handleMockConnector, working, actions } = props;

  if (section === 'command-centre') {
    return (
      <>
        <SectionHeader
          title="Command Centre"
          eyebrow="Operations"
          subtitle="A single operating view for queues, approvals, applications, maintenance, audit activity, and integration health."
          action={
            <>
              <Button size="sm" onClick={actions.startMaintenanceWorkflow}>
                <Wrench />
                Start maintenance workflow
              </Button>
              <StatusBadge value="0 sent automatically" />
            </>
          }
        />
        <div className="grid gap-5 p-5 lg:p-7">
          <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
            {dashboard.metrics.map((metric) => (
              <MetricCard key={metric.id} metric={metric} />
            ))}
          </div>

          <div className="grid gap-5 2xl:grid-cols-[1.45fr_0.95fr]">
            <CrmSurface>
              <SurfaceHeader
                title="Today's Priority Queue"
                subtitle="Decision-ready work across applications, maintenance, inspections, and approvals."
                meta={<span className="text-xs text-agents-text-muted">{filteredQueue.length} open</span>}
              />
              <QueueTable items={filteredQueue} onOpen={(item) => actions.openDetail({ kind: 'queue', id: item.id })} />
            </CrmSurface>

            <CrmSurface>
              <SurfaceHeader
                title="AI Approval Queue"
                subtitle="External drafts cannot send automatically."
                meta={<StatusBadge value="drafted" />}
              />
              <ApprovalList runs={approvalQueue} onApproval={handleApproval} compact />
            </CrmSurface>
          </div>

          <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
            <CrmSurface>
              <SurfaceHeader title="Recent Audit Activity" subtitle="Sensitive actions remain traceable." />
              <AuditList logs={dashboard.audit_logs} />
            </CrmSurface>
            <CrmSurface>
              <SurfaceHeader title="Operating Guardrails" subtitle="The workspace remains approval-first by design." />
              <GuardrailList />
            </CrmSurface>
          </div>
        </div>
      </>
    );
  }

  if (section === 'inbox') {
    const selected = dashboard.threads[0];
    return (
      <>
        <SectionHeader
          title="Unified Inbox"
          eyebrow="Communications"
          subtitle="Thread summaries, linked records, source context, and approval-gated reply drafts."
        />
        <div className="grid gap-5 p-5 lg:p-7 2xl:grid-cols-[360px_1fr]">
          <CrmSurface>
            <SurfaceHeader title="Threads" meta={<StatusBadge value="open" />} />
            <div className="divide-y divide-agents-border-soft">
              {dashboard.threads.map((thread, index) => (
                <button
                  key={thread.id}
                  className={cn(
                    'block w-full px-4 py-4 text-left transition duration-150 hover:bg-agents-surface-2',
                    index === 0 && 'bg-agents-surface-2/70',
                  )}
                  onClick={() => actions.openDetail({ kind: 'thread', id: thread.id })}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-medium text-agents-text">{thread.subject}</p>
                    <StatusBadge value={thread.channel} />
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-agents-text-muted">{thread.summary}</p>
                  <p className="mt-3 text-[11px] uppercase tracking-[0.12em] text-agents-text-faint">{thread.linked_object}</p>
                </button>
              ))}
            </div>
          </CrmSurface>
          <CrmSurface className="min-h-[500px]">
            <SurfaceHeader
              title={selected?.subject || 'Thread Detail'}
              subtitle="Messages, attachments, linked objects, tasks, and approval controls."
              meta={<StatusBadge value={selected?.status || 'open'} />}
            />
            <div className="grid gap-4 p-4 xl:grid-cols-[1fr_300px]">
              <div className="rounded-lg border border-agents-border-soft bg-agents-surface-2 p-4">
                <p className="agents-label">Summary</p>
                <p className="mt-3 text-sm leading-6 text-agents-text-muted">
                  {selected?.summary} Assistant drafts cite linked source records and remain blocked until reviewed by a staff member.
                </p>
              </div>
              <div className="rounded-lg border border-agents-border-soft bg-agents-surface-2 p-4">
                <p className="agents-label">Linked context</p>
                <div className="mt-3 flex flex-col gap-2 text-sm text-agents-text-muted">
                  <span>Object: {selected?.linked_object}</span>
                  <span>Channel: {selected?.channel}</span>
                  <span>Approval: required for outbound send</span>
                </div>
                <div className="mt-4 grid gap-2">
                  <Button size="sm" onClick={() => actions.simulateSend('conversation_thread', selected?.id || 'thread-001', 'priya@example.com', 'Maintenance acknowledgement')}>
                    <Send />
                    Send approved reply
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => actions.addRecord('task')}>
                    <ListChecks />
                    Create task
                  </Button>
                </div>
              </div>
            </div>
          </CrmSurface>
        </div>
      </>
    );
  }

  if (section === 'leads') {
    return (
      <ListSection
        title="Leads"
        eyebrow="Leasing"
        subtitle="Portal enquiries and leasing follow-ups, ready to convert into contacts, inspections, or applications."
        headers={['Lead', 'Property', 'Owner', 'Status']}
        rows={dashboard.leads.map((lead) => [`${lead.name} · ${lead.source}`, lead.property, lead.owner, lead.status])}
        onRow={(index) => actions.openDetail({ kind: 'lead', id: dashboard.leads[index]?.id || '' })}
        primaryAction={<Button size="sm" onClick={() => actions.addRecord('lead')}><Plus />Add lead</Button>}
        onFilter={() => actions.runAction('lead_filter_applied', 'lead', 'all', 'Lead queue filtered by status and SLA.')}
      />
    );
  }

  if (section === 'contacts') {
    return (
      <ListSection
        title="Contacts"
        eyebrow="CRM"
        subtitle="Unified CRM for applicants, tenants, landlords, vendors, and partners."
        headers={['Name', 'Role', 'Consent', 'Last touch']}
        rows={dashboard.contacts.map((contact) => [
          `${contact.name} · ${contact.email}`,
          contact.role,
          sentenceCase(contact.consent_status),
          contact.last_touch,
        ])}
        onRow={(index) => actions.openDetail({ kind: 'contact', id: dashboard.contacts[index]?.id || '' })}
        primaryAction={<Button size="sm" onClick={() => actions.addRecord('contact')}><Plus />Add contact</Button>}
        onFilter={() => actions.runAction('contact_filter_applied', 'contact', 'all', 'Contact list filtered by role and consent status.')}
      />
    );
  }

  if (section === 'properties') {
    return (
      <ListSection
        title="Properties"
        eyebrow="Portfolio"
        subtitle="Property context without replacing the agency's property-management system."
        headers={['Address', 'Owner', 'Manager', 'Status']}
        rows={dashboard.properties.map((property) => [
          property.address,
          property.owner,
          property.manager,
          `${property.status} · ${property.open_items} open`,
        ])}
        onRow={(index) => actions.openDetail({ kind: 'property', id: dashboard.properties[index]?.id || '' })}
        primaryAction={<Button size="sm" onClick={() => actions.addRecord('property')}><Plus />Add property</Button>}
        onFilter={() => actions.runAction('property_filter_applied', 'property', 'all', 'Property list filtered by status and manager.')}
      />
    );
  }

  if (section === 'applications') {
    return <ApplicationsSection applications={dashboard.applications} actions={actions} />;
  }

  if (section === 'inspections') {
    return (
      <ListSection
        title="Inspections"
        eyebrow="Calendar"
        subtitle="Inspection slots, attendance follow-up, reminders, and linked listing context."
        headers={['Inspection', 'Property', 'Time', 'Status']}
        rows={dashboard.inspections.map((inspection) => [inspection.attendee, inspection.property, inspection.scheduled_at, inspection.status])}
        onRow={(index) => actions.openDetail({ kind: 'inspection', id: dashboard.inspections[index]?.id || '' })}
        primaryAction={<Button size="sm" onClick={() => actions.bookInspectionFromLead(dashboard.leads[0]?.id || 'lead-204')}><Plus />Schedule inspection</Button>}
        onFilter={() => actions.runAction('inspection_filter_applied', 'inspection', 'all', 'Inspection calendar filtered by attendance status.')}
      />
    );
  }

  if (section === 'maintenance') {
    return <MaintenanceSection issues={dashboard.maintenance_issues} state={dashboard} actions={actions} />;
  }

  if (section === 'integrations') {
    return (
      <>
        <SectionHeader
          title="Integrations"
          eyebrow="Data"
          subtitle="Connected systems, field mapping, sync health, and approval-safe writeback controls."
          action={
            <Button onClick={handleMockConnector} disabled={working} size="sm">
              <Plus />
              Sync integration
            </Button>
          }
        />
        <div className="grid gap-4 p-5 md:grid-cols-2 lg:p-7 2xl:grid-cols-3">
          {dashboard.integrations.map((integration) => (
            <CrmSurface key={integration.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-agents-text">{integration.label}</h2>
                  <p className="mt-1 text-xs text-agents-text-muted">{integration.provider}</p>
                </div>
                <StatusBadge value={integration.status} />
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {integration.scopes.map((scope) => (
                  <span key={scope} className="rounded-md border border-agents-border-soft bg-agents-surface-2 px-2 py-1 text-xs text-agents-text-muted">
                    {scope}
                  </span>
                ))}
              </div>
              <p className="mt-5 text-xs text-agents-text-faint">
                Last sync: {integration.last_sync_at ? formatShortTime(integration.last_sync_at) : 'Not synced yet'}
              </p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <Button size="sm" variant="outline" onClick={() => actions.runAction('integration_sync_now', 'integration_connection', integration.id, `${integration.label} sync completed.`)}>
                  Sync now
                </Button>
                <Button size="sm" variant="secondary" onClick={() => actions.openDetail({ kind: 'workflow', id: integration.id })}>
                  Mapping
                </Button>
              </div>
            </CrmSurface>
          ))}
        </div>
      </>
    );
  }

  if (section === 'privacy-centre') {
    return (
      <>
        <SectionHeader
          title="Privacy Centre"
          eyebrow="Governance"
          subtitle="Consent, retention, claims guardrails, audit logs, and AI approval controls."
        />
        <div className="grid gap-5 p-5 lg:p-7 xl:grid-cols-[1fr_1fr]">
          <CrmSurface>
            <SurfaceHeader title="Non-negotiable guardrails" subtitle="No sensitive workflow bypasses human review." />
            <GuardrailList />
          </CrmSurface>
          <CrmSurface>
            <SurfaceHeader title="Recent audit logs" subtitle="Immutable record of sensitive actions." />
            <AuditList logs={dashboard.audit_logs} />
          </CrmSurface>
          <CrmSurface>
            <SurfaceHeader
              title="Consent records"
              subtitle="Renter-originated evidence sharing stays explicit."
              meta={<Button size="sm" variant="outline" onClick={() => actions.simulateExport('audit_log', 'privacy-centre', 'Privacy and audit export')}>Export audit</Button>}
            />
            <div className="divide-y divide-agents-border-soft">
              {dashboard.consent_records.map((record) => (
                <button key={record.id} type="button" className="block w-full px-4 py-4 text-left hover:bg-agents-surface-2" onClick={() => actions.runAction('consent_record_reviewed', 'consent_record', record.id, 'Consent record opened for review.')}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-agents-text">{record.contact}</p>
                      <p className="mt-1 text-xs leading-5 text-agents-text-muted">{record.purpose}</p>
                    </div>
                    <StatusBadge value={record.status} />
                  </div>
                </button>
              ))}
            </div>
          </CrmSurface>
        </div>
      </>
    );
  }

  if (section === 'tasks') {
    return (
      <ListSection
        title="Tasks"
        eyebrow="Follow-up"
        subtitle="Follow-ups and workflow tasks, linked back to operational objects."
        headers={['Task', 'Owner', 'Due', 'Status']}
        rows={dashboard.tasks.map((task) => [task.title, task.owner, task.due, `${task.status} · ${task.linked_object}`])}
        onRow={(index) => actions.openDetail({ kind: 'task', id: dashboard.tasks[index]?.id || '' })}
        primaryAction={<Button size="sm" onClick={() => actions.addRecord('task')}><Plus />Add task</Button>}
        onFilter={() => actions.runAction('task_filter_applied', 'task', 'all', 'Task list filtered by owner and due date.')}
      />
    );
  }

  if (section === 'move-in-audits') {
    return (
      <WorkflowFoundation
        title="Move-in Audits"
        eyebrow="Evidence"
        subtitle="Room checklists, timestamped evidence, export packs, and missing-item prompts."
        rows={dashboard.move_in_audits.map((audit) => `${audit.property} · ${audit.tenant} · ${audit.checklist_done}/${audit.checklist_total} items`)}
        actions={actions}
        primaryAction={<Button size="sm" onClick={() => actions.simulateExport('move_in_audit', dashboard.move_in_audits[0]?.id || 'audit-pack-220', 'Move-in audit pack')}><FileCheck2 />Export pack</Button>}
      />
    );
  }

  if (section === 'documents') {
    return (
      <WorkflowFoundation
        title="Documents"
        eyebrow="Vault"
        subtitle="Secure document and evidence vault with retention dates, consent-aware exports, and extraction review."
        rows={dashboard.documents.map((document) => `${document.name} · ${document.linked_object} · ${sentenceCase(document.status)}`)}
        actions={actions}
        primaryAction={<Button size="sm" onClick={() => actions.simulateExport('document', dashboard.documents[0]?.id || 'doc-501', 'Document evidence export')}><FileText />Export selected</Button>}
      />
    );
  }

  if (section === 'knowledge-base') {
    return (
      <WorkflowFoundation
        title="Knowledge Base"
        eyebrow="SOPs"
        subtitle="Approved SOPs and templates. Assistant answers must cite sources or say when no source is available."
        rows={['Repairs intake SOP', 'Application readiness checklist', 'Owner update template']}
        actions={actions}
        primaryAction={<Button size="sm" onClick={() => actions.runAction('kb_answer_generated', 'knowledge_base', 'repairs-intake-sop', 'Sourced SOP answer returned from approved knowledge base.')}><Bot />Ask Assistant</Button>}
      />
    );
  }

  if (section === 'workflows') {
    return (
      <WorkflowFoundation
        title="Workflows"
        eyebrow="Automation"
        subtitle="Approval-first workflow templates for tasks, reminders, handoffs, and review queues."
        rows={dashboard.workflows.map((workflow) => `${workflow.name} · ${sentenceCase(workflow.status)} · ${workflow.last_run}`)}
        actions={actions}
        primaryAction={<Button size="sm" onClick={() => actions.runAction('workflow_simulated', 'workflow', dashboard.workflows[0]?.id || 'workflow-101', 'Workflow simulation passed and is waiting for admin approval.')}><GitBranch />Simulate workflow</Button>}
      />
    );
  }

  if (section === 'ai-agents') {
    return (
      <WorkflowFoundation
        title="AI Agents"
        eyebrow="Assistant control"
        subtitle="Agent registry and run history. Drafts are logged, sourced, and held for approval."
        rows={dashboard.ai_agents.map((agent) => `${agent.name} · ${sentenceCase(agent.status)} · ${agent.runs} runs`)}
        actions={actions}
        primaryAction={<Button size="sm" onClick={() => actions.draftOwnerUpdate('mnt-882')}><MessageSquare />Create review draft</Button>}
      />
    );
  }

  if (section === 'reports') {
    return (
      <ReportsSection metrics={dashboard.metrics} actions={actions} />
    );
  }

  return (
    <WorkflowFoundation
      title={sectionLabels[section]}
      eyebrow="Workspace"
      subtitle="Agency setup, offices, users, roles, retention settings, and approval defaults."
      rows={['Agency profile', 'Roles and permissions', 'Approval defaults']}
      actions={actions}
      primaryAction={<Button size="sm" variant="outline" onClick={() => actions.openDetail({ kind: 'settings-reset' })}><RotateCcw />Reset workspace</Button>}
    />
  );
}

function MetricCard({ metric }: { metric: AgentMetric }) {
  return (
    <CrmSurface className={cn('p-4', metricTone[metric.tone])}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs text-agents-text-muted">{metric.label}</p>
        <CircleDot className="size-4 text-agents-text-faint" />
      </div>
      <div className="mt-5 flex items-end justify-between gap-3">
        <span className="text-[32px] font-semibold leading-none tracking-[0] text-agents-text">{metric.value}</span>
        <span className="max-w-[120px] text-right text-xs leading-5 text-agents-text-muted">{metric.trend}</span>
      </div>
    </CrmSurface>
  );
}

function QueueTable({ items, onOpen }: { items: AgentQueueItem[]; onOpen?: (item: AgentQueueItem) => void }) {
  if (!items.length) {
    return <EmptyState title="No queue items match the search" body="Clear the command search to return to the full operating queue." />;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Work item</TableHead>
          <TableHead>Entity</TableHead>
          <TableHead>Owner</TableHead>
          <TableHead>Priority</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow
            key={item.id}
            className={cn(onOpen && 'cursor-pointer')}
            onClick={() => onOpen?.(item)}
          >
            <TableCell className="min-w-[240px] font-medium text-agents-text">{item.title}</TableCell>
            <TableCell>{item.entity}</TableCell>
            <TableCell>{item.owner}</TableCell>
            <TableCell>
              <Badge variant="outline" className={cn('capitalize', priorityTone[item.priority])}>
                {item.priority}
              </Badge>
            </TableCell>
            <TableCell>
              <span className="text-xs text-agents-text-muted">{item.status}</span>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function ListSection({
  title,
  eyebrow,
  subtitle,
  headers,
  rows,
  fallbackRows,
  onRow,
  primaryAction,
  onFilter,
}: {
  title: string;
  eyebrow: string;
  subtitle: string;
  headers: string[];
  rows: string[][];
  fallbackRows?: string[][];
  onRow?: (index: number) => void;
  primaryAction?: ReactNode;
  onFilter?: () => void;
}) {
  const resolvedRows = rows.length ? rows : fallbackRows || [];
  return (
    <>
      <SectionHeader
        title={title}
        eyebrow={eyebrow}
        subtitle={subtitle}
        action={
          <>
            <Button variant="outline" size="sm" onClick={onFilter}>
              <SlidersHorizontal />
              Filter
            </Button>
            {primaryAction}
          </>
        }
      />
      <div className="p-5 lg:p-7">
        <CrmSurface>
          <Table>
            <TableHeader>
              <TableRow>
                {headers.map((header) => (
                  <TableHead key={header}>{header}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {resolvedRows.map((row, index) => (
                <TableRow
                  key={`${row[0]}-${index}`}
                  className={cn(onRow && 'cursor-pointer')}
                  onClick={() => onRow?.(index)}
                >
                  {row.map((cell, cellIndex) => (
                    <TableCell key={`${cell}-${cellIndex}`} className={cn(cellIndex === 0 && 'min-w-[240px] font-medium text-agents-text')}>
                      {cellIndex === row.length - 1 ? <StatusBadge value={cell} /> : cell}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CrmSurface>
      </div>
    </>
  );
}

function ApplicationsSection({ applications, actions }: { applications: AgentApplication[]; actions: DemoActions }) {
  const columns: AgentApplication['stage'][] = ['New', 'Incomplete', 'Awaiting Applicant', 'Under Review', 'Ready for PM', 'Approved'];
  return (
    <>
      <SectionHeader
        title="Applications"
        eyebrow="Pipeline"
        subtitle="Applicant readiness tracks completeness only. There is no suitability score and no auto-rejection."
        action={<StatusBadge value="No auto-rejection" />}
      />
      <div className="agents-scrollbar overflow-x-auto p-5 lg:p-7">
        <div className="grid min-w-[980px] grid-cols-6 gap-3">
          {columns.map((column) => {
            const items = applications.filter((application) => application.stage === column);
            return (
              <div key={column} className="rounded-lg border border-agents-border-soft bg-agents-surface p-3">
                <div className="flex items-center justify-between gap-2 pb-3">
                  <h2 className="text-sm font-semibold text-agents-text">{column}</h2>
                  <span className="text-xs text-agents-text-faint">{items.length}</span>
                </div>
                <div className="flex flex-col gap-3">
                  {items.map((application) => (
                    <div key={application.id} className="rounded-md border border-agents-border-soft bg-agents-surface-2 p-3">
                      <button
                        type="button"
                        className="block w-full text-left"
                        onClick={() => actions.openDetail({ kind: 'application', id: application.id })}
                      >
                        <p className="text-sm font-medium text-agents-text">{application.applicant}</p>
                        <p className="mt-1 text-xs leading-5 text-agents-text-muted">{application.property}</p>
                      </button>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <StatusBadge value={application.readiness_status} />
                        <StatusBadge value="connected" />
                      </div>
                      <p className="mt-3 text-xs leading-5 text-agents-text-muted">
                        {application.missing_items.length ? application.missing_items.join(', ') : 'Ready for human review'}
                      </p>
                      <div className="mt-3 grid gap-2">
                        <Button size="sm" variant="outline" onClick={() => actions.runReadinessCheck(application.id)}>
                          <FileCheck2 />
                          Readiness
                        </Button>
                        {application.missing_items.length > 0 && (
                          <Button size="sm" variant="secondary" onClick={() => actions.requestMissingDocs(application.id)}>
                            <Mail />
                            Request docs
                          </Button>
                        )}
                        <Button size="sm" onClick={() => actions.advanceApplication(application.id)}>
                          <ChevronRight />
                          Move stage
                        </Button>
                      </div>
                    </div>
                  ))}
                  {!items.length && (
                    <div className="rounded-md border border-dashed border-agents-border-soft px-3 py-6 text-center text-xs text-agents-text-faint">
                      No records
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

function MaintenanceSection({
  issues,
  state,
  actions,
}: {
  issues: AgentMaintenanceIssue[];
  state: AgentsDemoState;
  actions: DemoActions;
}) {
  const selected = issues[0];
  const timeline = state.timeline_events.filter((event) => event.object_id.toLowerCase() === (selected?.id || '').toLowerCase());

  return (
    <>
      <SectionHeader
        title="Maintenance"
        eyebrow="Issue timelines"
        subtitle="Structured issue timelines with PM-confirmed urgency and owner-safe updates."
      />
      <div className="grid gap-5 p-5 lg:p-7 xl:grid-cols-[0.9fr_1.1fr]">
        <CrmSurface>
          <SurfaceHeader title="Open issues" subtitle="Urgency remains a suggestion until a PM confirms it." />
          <div className="divide-y divide-agents-border-soft">
            {issues.map((issue) => (
              <div key={issue.id} className="px-4 py-4">
                <button
                  type="button"
                  className="block w-full text-left"
                  onClick={() => actions.openDetail({ kind: 'maintenance', id: issue.id })}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-agents-text">{issue.title}</p>
                      <p className="mt-1 text-xs text-agents-text-muted">{issue.property} · {issue.tenant}</p>
                    </div>
                    <StatusBadge value={issue.urgency} />
                  </div>
                  <p className="mt-3 text-xs text-agents-text-faint">{issue.timeline_count} timeline events · {sentenceCase(issue.status)}</p>
                </button>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <Button size="sm" variant="outline" onClick={() => actions.confirmMaintenanceUrgency(issue.id)}>
                    <CheckCircle2 />
                    Confirm urgency
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => actions.assignMaintenanceVendor(issue.id)}>
                    <Wrench />
                    Assign vendor
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => actions.draftOwnerUpdate(issue.id)}>
                    <MessageSquare />
                    Draft owner update
                  </Button>
                  <Button size="sm" onClick={() => actions.resolveMaintenanceIssue(issue.id)}>
                    <Check />
                    Resolve
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CrmSurface>
        <CrmSurface>
          <SurfaceHeader
            title={selected ? `${selected.title} timeline` : 'Timeline'}
            subtitle="A traceable record from intake to owner update."
            meta={<StatusBadge value={selected?.status || 'needs review'} />}
          />
          <TimelineEvents
            events={(timeline.length ? timeline : [
              { title: 'Report received', body: 'Tenant submitted photos and access notes via email thread.' },
              { title: 'Evidence attached', body: 'Photos linked to the maintenance issue.' },
              { title: 'Triage suggested', body: 'Assistant suggested urgent review. PM confirmation required.' },
              { title: 'Owner update draft', body: 'Draft prepared but blocked until approval.' },
            ]).map((event) => [event.title, event.body])}
          />
          <div className="border-t border-agents-border-soft p-4">
            <div className="grid gap-2 sm:grid-cols-2">
              <Button size="sm" onClick={() => selected && actions.draftOwnerUpdate(selected.id)} disabled={!selected}>
                <MessageSquare />
                Prepare update
              </Button>
              <Button size="sm" variant="outline" onClick={() => selected && actions.simulateExport('maintenance_issue', selected.id, 'Maintenance issue timeline')} disabled={!selected}>
                <FileText />
                Export timeline
              </Button>
            </div>
          </div>
        </CrmSurface>
      </div>
    </>
  );
}

function ReportsSection({ metrics, actions }: { metrics: AgentMetric[]; actions: DemoActions }) {
  return (
    <>
      <SectionHeader
        title="Reports"
        eyebrow="Analytics"
        subtitle="Restrained operational reporting for workload, approvals, readiness, maintenance, and audit posture."
        action={
          <Button size="sm" variant="outline" onClick={() => actions.simulateExport('report', 'operations', 'Operations report')}>
            <FileText />
            Export report
          </Button>
        }
      />
      <div className="grid gap-5 p-5 lg:p-7 xl:grid-cols-[1fr_1fr]">
        <CrmSurface>
          <SurfaceHeader title="Operating snapshot" subtitle="Monochrome trend preview." />
          <div className="grid gap-3 p-4 sm:grid-cols-2">
            {metrics.map((metric) => <MetricCard key={metric.id} metric={metric} />)}
          </div>
        </CrmSurface>
        <CrmSurface>
          <SurfaceHeader title="Approval trend" subtitle="Thin-line chart placeholder for pilot analytics." />
          <div className="p-5">
            <div className="flex h-[240px] items-end gap-3 border-b border-l border-agents-border-soft px-3">
              {[42, 66, 54, 72, 61, 84, 76].map((value, index) => (
                <div key={value + index} className="flex flex-1 flex-col items-center gap-2">
                  <div className="w-full rounded-t-sm border border-agents-border bg-agents-champagne/18" style={{ height: `${value}%` }} />
                  <span className="text-[10px] text-agents-text-faint">D{index + 1}</span>
                </div>
              ))}
            </div>
          </div>
        </CrmSurface>
      </div>
    </>
  );
}

function WorkflowFoundation({
  title,
  eyebrow,
  subtitle,
  rows,
  actions,
  primaryAction,
}: {
  title: string;
  eyebrow: string;
  subtitle: string;
  rows: string[];
  actions?: DemoActions;
  primaryAction?: ReactNode;
}) {
  return (
    <>
      <SectionHeader title={title} eyebrow={eyebrow} subtitle={subtitle} action={primaryAction} />
      <div className="grid gap-5 p-5 lg:p-7 xl:grid-cols-[1fr_360px]">
        <CrmSurface>
          <SurfaceHeader title={`${title} workspace`} subtitle="Records, workflow state, and review actions stay inside the agency boundary." />
          <div className="divide-y divide-agents-border-soft">
            {rows.map((row, index) => (
              <div key={row} className="flex items-center justify-between gap-3 px-4 py-4">
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  onClick={() => actions?.runAction(`${title.toLowerCase().replace(/\s+/g, '_')}_record_opened`, title.toLowerCase(), `${title}-${index}`, `${title} record opened.`)}
                >
                  <FileCheck2 className="size-4 shrink-0 text-agents-text-faint" />
                  <span className="truncate text-sm text-agents-text-muted">{row}</span>
                </button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => actions?.runAction(`${title.toLowerCase().replace(/\s+/g, '_')}_reviewed`, title.toLowerCase(), `${title}-${index}`, `${title} review action completed.`)}
                >
                  Review
                </Button>
              </div>
            ))}
          </div>
        </CrmSurface>
        <CrmSurface>
          <EmptyState
            title="Approval-first workflow"
            body="Actions update the local workspace, create audit records where needed, and never perform real external sends."
            action={
              <Button size="sm" onClick={() => actions?.runAction(`${title.toLowerCase().replace(/\s+/g, '_')}_action`, title.toLowerCase(), title, `${title} action completed.`)}>
                <CheckCircle2 />
                Run action
              </Button>
            }
          />
        </CrmSurface>
      </div>
    </>
  );
}

function AgentsDetailPanel({
  panel,
  state,
  actions,
  onClose,
}: {
  panel: DetailPanel;
  state: AgentsDemoState;
  actions: DemoActions;
  onClose: () => void;
}) {
  if (!panel) return null;

  const hasId = 'id' in panel;
  const queueItem = hasId ? state.priority_queue.find((item) => item.id === panel.id) : undefined;
  const thread = hasId ? state.threads.find((item) => item.id === panel.id) : undefined;
  const lead = hasId ? state.leads.find((item) => item.id === panel.id) : undefined;
  const contact = hasId ? state.contacts.find((item) => item.id === panel.id) : undefined;
  const property = hasId ? state.properties.find((item) => item.id === panel.id) : undefined;
  const application = hasId ? state.applications.find((item) => item.id === panel.id) : undefined;
  const inspection = hasId ? state.inspections.find((item) => item.id === panel.id) : undefined;
  const issue = hasId ? state.maintenance_issues.find((item) => item.id === panel.id) : undefined;
  const document = hasId ? state.documents.find((item) => item.id === panel.id) : undefined;
  const workflow = hasId ? state.workflows.find((item) => item.id === panel.id) || state.integrations.find((item) => item.id === panel.id) : undefined;
  const agent = hasId ? state.ai_agents.find((item) => item.id === panel.id) : undefined;
  const task = hasId ? state.tasks.find((item) => item.id === panel.id) : undefined;
  const workflowTitle = workflow ? ('name' in workflow ? workflow.name : workflow.label) : undefined;

  const title =
    panel.kind === 'quick-add' ? 'Create Record'
    : panel.kind === 'notifications' ? 'Notifications'
    : panel.kind === 'settings-reset' ? 'Workspace Controls'
    : queueItem?.title || thread?.subject || lead?.name || contact?.name || property?.address || application?.applicant ||
      inspection?.attendee || issue?.title || document?.name || workflowTitle || agent?.name || task?.title || 'Record detail';

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/55" role="dialog" aria-modal="true">
      <button type="button" className="hidden flex-1 md:block" aria-label="Close detail panel" onClick={onClose} />
      <aside className="agents-scrollbar h-full w-full max-w-[520px] overflow-y-auto border-l border-agents-border bg-agents-surface">
        <div className="sticky top-0 z-10 border-b border-agents-border-soft bg-agents-surface px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="agents-label">{sentenceCase(panel.kind)}</p>
              <h2 className="mt-1 truncate text-xl font-semibold tracking-[0] text-agents-text">{title}</h2>
            </div>
            <Button size="icon" variant="outline" aria-label="Close" onClick={onClose}>
              <X />
            </Button>
          </div>
        </div>

        <div className="grid gap-4 p-5">
          {panel.kind === 'quick-add' && (
            <CrmSurface className="p-4">
              <SurfaceHeader title="Quick add" subtitle="Create a connected operational record." />
              <div className="grid gap-2 p-4 sm:grid-cols-2">
                <Button onClick={() => actions.addRecord('lead')}><Mail />Lead</Button>
                <Button onClick={() => actions.addRecord('contact')} variant="outline"><Users />Contact</Button>
                <Button onClick={() => actions.addRecord('property')} variant="outline"><Building2 />Property</Button>
                <Button onClick={() => actions.addRecord('maintenance')} variant="outline"><Wrench />Maintenance</Button>
                <Button onClick={() => actions.addRecord('task')} variant="secondary"><ListChecks />Task</Button>
              </div>
            </CrmSurface>
          )}

          {panel.kind === 'notifications' && (
            <CrmSurface>
              <SurfaceHeader
                title="Notification centre"
                subtitle={`${state.notifications.filter((item) => !item.read).length} unread operational alerts.`}
                meta={<Button size="sm" variant="outline" onClick={() => actions.runAction('notifications_reviewed', 'notification', 'all', 'Notification centre reviewed.')}>Mark reviewed</Button>}
              />
              <div className="divide-y divide-agents-border-soft">
                {state.notifications.map((notification) => (
                  <button
                    key={notification.id}
                    type="button"
                    className="block w-full px-4 py-4 text-left hover:bg-agents-surface-2"
                    onClick={() => actions.runAction('notification_opened', 'notification', notification.id, notification.title)}
                  >
                    <p className="text-sm font-medium text-agents-text">{notification.title}</p>
                    <p className="mt-1 text-sm leading-6 text-agents-text-muted">{notification.body}</p>
                    <p className="mt-2 text-xs text-agents-text-faint">{notification.created_at}</p>
                  </button>
                ))}
              </div>
            </CrmSurface>
          )}

          {panel.kind === 'settings-reset' && (
            <CrmSurface className="p-4">
              <SurfaceHeader title="Reset sales workspace" subtitle="Restore the pristine connected-agency dataset." />
              <div className="p-4">
                <p className="text-sm leading-6 text-agents-text-muted">
                  Reset clears local changes, approvals, simulated sends, and generated audit events for this browser only.
                </p>
                <Button className="mt-4" variant="destructive" onClick={actions.resetWorkspace}>
                  <RotateCcw />
                  Reset workspace
                </Button>
              </div>
            </CrmSurface>
          )}

          {queueItem && (
            <RecordCard
              title={queueItem.title}
              rows={[
                ['Entity', queueItem.entity],
                ['Owner', queueItem.owner],
                ['Due', queueItem.due],
                ['Status', queueItem.status],
              ]}
              badge={queueItem.priority}
              actions={
                <>
                  {queueItem.type === 'maintenance' && <Button onClick={actions.startMaintenanceWorkflow}><Wrench />Start workflow</Button>}
                  <Button variant="outline" onClick={() => actions.runAction('queue_item_opened', 'queue_item', queueItem.id, 'Queue item opened and acknowledged.')}>Acknowledge</Button>
                </>
              }
            />
          )}

          {thread && (
            <RecordCard
              title={thread.subject}
              rows={[
                ['Linked object', thread.linked_object],
                ['Channel', thread.channel],
                ['Status', thread.status],
                ['Summary', thread.summary],
              ]}
              badge={thread.status}
              actions={
                <>
                  <Button onClick={() => actions.simulateSend('conversation_thread', thread.id, 'recipient@example.com', thread.subject)}><Send />Send approved reply</Button>
                  <Button variant="outline" onClick={() => actions.addRecord('task')}><ListChecks />Create task</Button>
                </>
              }
            />
          )}

          {lead && (
            <RecordCard
              title={lead.name}
              rows={[
                ['Email', lead.email],
                ['Phone', lead.phone],
                ['Property', lead.property],
                ['SLA', lead.sla],
                ['Last touch', lead.last_touch],
              ]}
              badge={lead.status}
              actions={
                <>
                  <Button onClick={() => actions.qualifyLead(lead.id)}><Check />Qualify</Button>
                  <Button variant="outline" onClick={() => actions.bookInspectionFromLead(lead.id)}><CalendarClock />Book inspection</Button>
                  <Button variant="secondary" onClick={() => actions.convertLead(lead.id)}><ChevronRight />Convert</Button>
                </>
              }
            />
          )}

          {contact && (
            <RecordCard
              title={contact.name}
              rows={[
                ['Email', contact.email],
                ['Phone', contact.phone],
                ['Role', contact.role],
                ['Consent', sentenceCase(contact.consent_status)],
                ['Last touch', contact.last_touch],
              ]}
              badge={contact.consent_status}
              actions={
                <>
                  <Button onClick={() => actions.simulateSend('contact', contact.id, contact.email, 'Agency update')}><Send />Send approved update</Button>
                  <Button variant="outline" onClick={() => actions.runAction('contact_note_added', 'contact', contact.id, 'Contact note saved.')}>Add note</Button>
                </>
              }
            />
          )}

          {property && (
            <RecordCard
              title={property.address}
              rows={[
                ['Owner', property.owner],
                ['Manager', property.manager],
                ['Status', property.status],
                ['Open items', String(property.open_items)],
              ]}
              badge={property.status}
              actions={
                <>
                  <Button onClick={() => actions.addRecord('maintenance')}><Wrench />New issue</Button>
                  <Button variant="outline" onClick={() => actions.addRecord('task')}><ListChecks />Create task</Button>
                </>
              }
            />
          )}

          {application && (
            <RecordCard
              title={application.applicant}
              rows={[
                ['Property', application.property],
                ['Stage', application.stage],
                ['Readiness', sentenceCase(application.readiness_status)],
                ['Missing items', application.missing_items.length ? application.missing_items.join(', ') : 'None'],
              ]}
              badge={application.readiness_status}
              actions={
                <>
                  <Button onClick={() => actions.runReadinessCheck(application.id)}><FileCheck2 />Run readiness</Button>
                  <Button variant="outline" onClick={() => actions.requestMissingDocs(application.id)}><Mail />Request docs</Button>
                  <Button variant="secondary" onClick={() => actions.advanceApplication(application.id)}><ChevronRight />Move stage</Button>
                </>
              }
            />
          )}

          {inspection && (
            <RecordCard
              title={inspection.attendee}
              rows={[
                ['Property', inspection.property],
                ['Time', inspection.scheduled_at],
                ['Type', sentenceCase(inspection.type)],
                ['Status', sentenceCase(inspection.status)],
              ]}
              badge={inspection.status}
              actions={
                <>
                  <Button onClick={() => actions.updateInspection(inspection.id, 'confirmed')}><Check />Confirm</Button>
                  <Button variant="outline" onClick={() => actions.updateInspection(inspection.id, 'completed')}><CheckCircle2 />Attended</Button>
                  <Button variant="secondary" onClick={() => actions.updateInspection(inspection.id, 'no_show')}><X />No-show</Button>
                </>
              }
            />
          )}

          {issue && (
            <>
              <RecordCard
                title={issue.title}
                rows={[
                  ['Property', issue.property],
                  ['Tenant', issue.tenant],
                  ['Urgency', sentenceCase(issue.urgency)],
                  ['Status', sentenceCase(issue.status)],
                  ['Timeline events', String(issue.timeline_count)],
                ]}
                badge={issue.urgency}
                actions={
                  <>
                    <Button onClick={() => actions.confirmMaintenanceUrgency(issue.id)}><CheckCircle2 />Confirm urgency</Button>
                    <Button variant="outline" onClick={() => actions.assignMaintenanceVendor(issue.id)}><Wrench />Assign vendor</Button>
                    <Button variant="secondary" onClick={() => actions.draftOwnerUpdate(issue.id)}><MessageSquare />Draft owner update</Button>
                    <Button onClick={() => actions.resolveMaintenanceIssue(issue.id)}><Check />Resolve issue</Button>
                  </>
                }
              />
              <CrmSurface>
                <SurfaceHeader title="Linked evidence" subtitle="Renter-originated evidence requires explicit consent before sharing." />
                <div className="divide-y divide-agents-border-soft">
                  {state.evidence_items.filter((item) => item.linked_object.toLowerCase() === issue.id.toLowerCase()).map((evidence) => (
                    <div key={evidence.id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-agents-text">{evidence.title}</p>
                        <p className="mt-1 text-xs text-agents-text-muted">{sentenceCase(evidence.source)} source</p>
                      </div>
                      <StatusBadge value={evidence.consent_required ? 'waiting' : 'approved'} />
                    </div>
                  ))}
                </div>
              </CrmSurface>
            </>
          )}

          {document && (
            <RecordCard
              title={document.name}
              rows={[
                ['Type', sentenceCase(document.type)],
                ['Linked object', document.linked_object],
                ['Status', sentenceCase(document.status)],
                ['Retention', document.retention],
              ]}
              badge={document.status}
              actions={
                <>
                  <Button onClick={() => actions.runAction('document_extracted', 'document', document.id, 'Extraction review completed.') }><FileCheck2 />Review extraction</Button>
                  <Button variant="outline" onClick={() => actions.simulateExport('document', document.id, document.name)}><FileText />Export</Button>
                </>
              }
            />
          )}

          {workflow && (
            <RecordCard
              title={'name' in workflow ? workflow.name : workflow.label}
              rows={'name' in workflow ? [
                ['Trigger', workflow.trigger],
                ['Status', sentenceCase(workflow.status)],
                ['Last run', workflow.last_run],
              ] : [
                ['Provider', workflow.provider],
                ['Status', sentenceCase(workflow.status)],
                ['Scopes', workflow.scopes.join(', ')],
              ]}
              badge={workflow.status}
              actions={
                <>
                  <Button onClick={() => actions.runAction('workflow_simulated', 'workflow', panel.kind === 'workflow' && hasId ? panel.id : 'workflow', 'Workflow simulation completed.') }><GitBranch />Simulate</Button>
                  <Button variant="outline" onClick={() => actions.runAction('field_mapping_reviewed', 'integration_connection', panel.kind === 'workflow' && hasId ? panel.id : 'integration', 'Field mapping opened and logged.')}>Review mapping</Button>
                </>
              }
            />
          )}

          {agent && (
            <RecordCard
              title={agent.name}
              rows={[
                ['Purpose', agent.purpose],
                ['Status', sentenceCase(agent.status)],
                ['Runs', String(agent.runs)],
                ['Approval required', agent.approval_required ? 'Yes' : 'No'],
              ]}
              badge={agent.status}
              actions={
                <>
                  <Button onClick={() => actions.draftOwnerUpdate('mnt-882')}><MessageSquare />Create review draft</Button>
                  <Button variant="outline" onClick={() => actions.runAction('ai_agent_reviewed', 'ai_agent', agent.id, 'Agent configuration reviewed.')}>Review settings</Button>
                </>
              }
            />
          )}

          {task && (
            <RecordCard
              title={task.title}
              rows={[
                ['Owner', task.owner],
                ['Due', task.due],
                ['Status', sentenceCase(task.status)],
                ['Linked object', task.linked_object],
              ]}
              badge={task.status}
              actions={
                <>
                  <Button onClick={() => actions.completeTask(task.id)}><Check />Complete</Button>
                  <Button variant="outline" onClick={() => actions.deferTask(task.id)}><CalendarClock />Defer</Button>
                </>
              }
            />
          )}

          <CrmSurface>
            <SurfaceHeader title="Recent communications and exports" subtitle="Simulated outbound activity is visible and auditable." />
            <div className="divide-y divide-agents-border-soft">
              {state.communications.slice(0, 5).map((communication) => (
                <div key={communication.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-agents-text">{communication.subject}</p>
                      <p className="mt-1 text-xs text-agents-text-muted">{communication.recipient} · {formatShortTime(communication.created_at)}</p>
                    </div>
                    <StatusBadge value={communication.status} />
                  </div>
                </div>
              ))}
              {!state.communications.length && (
                <div className="px-4 py-6 text-sm text-agents-text-muted">No outbound activity has been simulated yet.</div>
              )}
            </div>
          </CrmSurface>
        </div>
      </aside>
    </div>
  );
}

function RecordCard({
  title,
  rows,
  badge,
  actions,
}: {
  title: string;
  rows: Array<[string, string]>;
  badge?: string;
  actions?: ReactNode;
}) {
  return (
    <CrmSurface>
      <SurfaceHeader title={title} meta={badge ? <StatusBadge value={badge} /> : undefined} />
      <div className="divide-y divide-agents-border-soft">
        {rows.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[140px_1fr] gap-3 px-4 py-3 text-sm">
            <span className="text-agents-text-faint">{label}</span>
            <span className="min-w-0 text-agents-text-muted">{value}</span>
          </div>
        ))}
      </div>
      {actions && <div className="grid gap-2 border-t border-agents-border-soft p-4 sm:grid-cols-2">{actions}</div>}
    </CrmSurface>
  );
}

function ApprovalList({
  runs,
  onApproval,
  compact,
}: {
  runs: AgentAiRun[];
  onApproval: (run: AgentAiRun, decision: AgentAiRun['status']) => void;
  compact?: boolean;
}) {
  if (!runs.length) {
    return <EmptyState title="No drafts waiting" body="Assistant drafts appear here only after they are logged and marked for human review." />;
  }

  return (
    <div className="divide-y divide-agents-border-soft">
      {runs.map((run) => (
        <div key={run.id} className="px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-agents-text">{run.agent}</p>
              <p className="mt-1 text-xs text-agents-text-muted">
                {run.object_type} · confidence {Math.round(run.confidence * 100)}%
              </p>
            </div>
            <StatusBadge value={run.status} />
          </div>
          <p className={cn('mt-3 text-sm leading-6 text-agents-text-muted', compact && 'line-clamp-3')}>{run.output}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {run.sources.map((source) => (
              <span key={source} className="rounded-md border border-agents-border-soft bg-agents-surface-2 px-2 py-1 text-xs text-agents-text-muted">
                {source}
              </span>
            ))}
          </div>
          {run.status === 'drafted' && (
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <Button size="sm" onClick={() => onApproval(run, 'approved')}>
                <Check />
                Approve
              </Button>
              <Button size="sm" variant="outline" onClick={() => onApproval(run, 'rejected')}>
                <X />
                Reject
              </Button>
              <Button size="sm" variant="secondary" onClick={() => onApproval(run, 'escalated')}>
                Escalate
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function AuditList({ logs }: { logs: AgentAuditLog[] }) {
  return (
    <div className="divide-y divide-agents-border-soft">
      {logs.map((log) => (
        <div key={log.id} className="flex items-center gap-3 px-4 py-4">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-agents-border-soft bg-agents-surface-2 text-agents-text-faint">
            <ChevronRight className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-agents-text">{log.action}</p>
            <p className="mt-1 truncate text-xs text-agents-text-muted">
              {log.object_type} · {log.actor} · {formatShortTime(log.created_at)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function TimelineEvents({ events }: { events: Array<[string, string]> }) {
  return (
    <div className="p-4">
      {events.map(([title, body], index) => (
        <div key={title} className="relative grid grid-cols-[22px_1fr] gap-3 pb-5 last:pb-0">
          {index !== events.length - 1 && <div className="absolute left-[7px] top-5 h-[calc(100%-1rem)] w-px bg-agents-border-soft" />}
          <div className="relative z-10 mt-1 size-3 rounded-full border border-agents-border bg-agents-champagne/35" />
          <div>
            <p className="text-sm font-medium text-agents-text">{title}</p>
            <p className="mt-1 text-sm leading-6 text-agents-text-muted">{body}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function GuardrailList() {
  const items = [
    'No hidden applicant or tenant scoring.',
    'No auto-rejection or autonomous suitability decisions.',
    'No renter-originated evidence sharing without explicit consent.',
    'All consequential AI outputs require human approval.',
    'All sensitive actions are written to immutable audit logs.',
  ];

  return (
    <div className="grid gap-3 p-4 text-sm text-agents-text-muted">
      {items.map((item) => (
        <div key={item} className="flex gap-3 rounded-md border border-agents-border-soft bg-agents-surface-2 px-3 py-3">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-agents-sage" />
          <span>{item}</span>
        </div>
      ))}
    </div>
  );
}

function AssistantPanel({
  approvalQueue,
  onApproval,
}: {
  approvalQueue: AgentAiRun[];
  onApproval: (run: AgentAiRun, decision: AgentAiRun['status']) => void;
}) {
  const pending = approvalQueue.filter((run) => run.status === 'drafted');
  const approvalRatio = approvalQueue.length ? ((approvalQueue.length - pending.length) / approvalQueue.length) * 100 : 0;

  return (
    <aside className="agents-scrollbar hidden w-[380px] shrink-0 overflow-y-auto border-l border-agents-border-soft bg-agents-surface xl:block">
      <div className="sticky top-0 z-10 border-b border-agents-border-soft bg-agents-surface px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <PanelRightOpen className="size-4 text-agents-text-muted" />
            <h2 className="text-sm font-semibold tracking-[0] text-agents-text">Assistant Review</h2>
          </div>
          <StatusBadge value="drafted" />
        </div>
        <p className="mt-2 text-xs leading-5 text-agents-text-muted">Drafts are grounded, logged, and blocked from external send until reviewed.</p>
      </div>
      <div className="flex flex-col gap-4 p-4">
        <CrmSurface className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-agents-text">Approval progress</span>
            <span className="text-xs text-agents-text-muted">{pending.length} pending</span>
          </div>
          <Progress className="mt-3" value={approvalRatio} />
        </CrmSurface>
        <div className="rounded-lg border border-agents-oxblood/40 bg-agents-oxblood/12 p-4 text-sm leading-6 text-[#E2AAA6]">
          <div className="flex gap-2">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <p>No applicant scoring, auto-rejection, landlord surveillance, or personal renter data resale exists in this workspace.</p>
          </div>
        </div>
        <CrmSurface>
          <SurfaceHeader title="Pending drafts" subtitle="Review cards with sources and confidence." />
          <ApprovalList runs={pending} onApproval={onApproval} compact />
        </CrmSurface>
      </div>
    </aside>
  );
}
