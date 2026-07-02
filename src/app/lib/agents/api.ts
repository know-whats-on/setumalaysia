import { projectId, publicAnonKey } from '/utils/supabase/info';
import type {
  AgentAiRun,
  AgentContact,
  AgentIntegrationConnection,
  AgentMaintenanceIssue,
  AgentProperty,
  AgentSession,
  AgentsDashboardData,
} from './types';

const AGENTS_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-1d591b90/agents`;

export class AgentsApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'AgentsApiError';
    this.status = status;
  }
}

async function readJson(res: Response) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function buildAgentsHeaders(firebaseToken?: string, includeContentType = true) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${publicAnonKey}`,
  };
  if (includeContentType) headers['Content-Type'] = 'application/json';
  if (firebaseToken) headers['x-firebase-token'] = firebaseToken;
  return headers;
}

async function agentsRequest<T>(
  path: string,
  options: RequestInit & { firebaseToken?: string } = {},
): Promise<T> {
  const { firebaseToken, ...init } = options;
  const res = await fetch(`${AGENTS_BASE}${path}`, {
    ...init,
    headers: {
      ...buildAgentsHeaders(firebaseToken, !(init.body instanceof FormData)),
      ...(init.headers || {}),
    },
  });
  const json = await readJson(res);
  if (!res.ok) {
    throw new AgentsApiError(
      String(json.error || json.message || json.raw || `Agents API failed with ${res.status}`),
      res.status,
    );
  }
  return (json.data ?? json) as T;
}

export function fetchAgentsSession(firebaseToken: string) {
  return agentsRequest<AgentSession>('/session', { firebaseToken });
}

export function fetchAgentsDashboard(firebaseToken: string) {
  return agentsRequest<AgentsDashboardData>('/dashboard', { firebaseToken });
}

export function createAgentContact(firebaseToken: string, contact: Partial<AgentContact>) {
  return agentsRequest<AgentContact>('/contacts', {
    method: 'POST',
    firebaseToken,
    body: JSON.stringify(contact),
  });
}

export function createAgentProperty(firebaseToken: string, property: Partial<AgentProperty>) {
  return agentsRequest<AgentProperty>('/properties', {
    method: 'POST',
    firebaseToken,
    body: JSON.stringify(property),
  });
}

export function createAgentMaintenanceIssue(firebaseToken: string, issue: Partial<AgentMaintenanceIssue>) {
  return agentsRequest<AgentMaintenanceIssue>('/maintenance/issues', {
    method: 'POST',
    firebaseToken,
    body: JSON.stringify(issue),
  });
}

export function runAgentDraft(firebaseToken: string, payload: {
  agent: string;
  object_type: string;
  object_id: string;
  prompt: string;
}) {
  return agentsRequest<AgentAiRun>('/ai/runs', {
    method: 'POST',
    firebaseToken,
    body: JSON.stringify(payload),
  });
}

export function approveAgentDraft(firebaseToken: string, id: string, decision: 'approved' | 'rejected' | 'escalated') {
  return agentsRequest<AgentAiRun>(`/ai/runs/${encodeURIComponent(id)}/approve`, {
    method: 'POST',
    firebaseToken,
    body: JSON.stringify({ decision }),
  });
}

export function connectAgentIntegration(firebaseToken: string, provider: string) {
  return agentsRequest<AgentIntegrationConnection>('/integrations', {
    method: 'POST',
    firebaseToken,
    body: JSON.stringify({ provider }),
  });
}
