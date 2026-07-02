// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';
import {
  AGENTS_DEMO_STORAGE_KEY,
  addAgentsAiRun,
  createInitialAgentsDemoState,
  loadAgentsDemoState,
  resetAgentsDemoState,
  saveAgentsDemoState,
  withAgentsDemoEvent,
} from './demo-store';

describe('agents demo store', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('seeds a connected sales workspace without visible mock connector labels', () => {
    const state = createInitialAgentsDemoState();

    expect(state.session.agency.name).toBe('Northline Property Group');
    expect(state.applications.map((application) => application.source).join(' ')).not.toContain('Mock');
    expect(state.integrations.map((integration) => integration.label).join(' ')).not.toContain('Mock');
    expect(state.evidence_items.some((item) => item.source === 'renter' && item.consent_required)).toBe(true);
  });

  it('persists and resets workspace state through localStorage', () => {
    const state = createInitialAgentsDemoState();
    const edited = {
      ...state,
      leads: [{ ...state.leads[0], status: 'qualified' as const }, ...state.leads.slice(1)],
    };

    saveAgentsDemoState(edited);

    expect(window.localStorage.getItem(AGENTS_DEMO_STORAGE_KEY)).toBeTruthy();
    expect(loadAgentsDemoState().leads[0].status).toBe('qualified');
    expect(resetAgentsDemoState().leads[0].status).toBe('new');
  });

  it('creates analytics and audit records for state-changing actions', () => {
    const state = createInitialAgentsDemoState();
    const next = withAgentsDemoEvent(state, 'maintenance_urgency_confirmed', 'maintenance_issue', 'mnt-882', 'maya@example.com');

    expect(next.analytics_events[0].event).toBe('maintenance_urgency_confirmed');
    expect(next.audit_logs[0]).toMatchObject({
      action: 'maintenance_urgency_confirmed',
      object_type: 'maintenance_issue',
      object_id: 'mnt-882',
      actor: 'maya@example.com',
    });
  });

  it('routes assistant drafts into the approval queue before external use', () => {
    const state = createInitialAgentsDemoState();
    const next = addAgentsAiRun(state, {
      agent: 'Landlord Update Agent',
      object_type: 'maintenance_issue',
      object_id: 'mnt-882',
      output: 'Owner update draft awaiting review.',
      confidence: 0.86,
      sources: ['Maintenance timeline'],
      status: 'drafted',
      requires_approval: true,
    });

    expect(next.approval_queue[0]).toMatchObject({
      agent: 'Landlord Update Agent',
      status: 'drafted',
      requires_approval: true,
    });
    expect(next.audit_logs[0].action).toBe('ai_run_created');
  });
});
