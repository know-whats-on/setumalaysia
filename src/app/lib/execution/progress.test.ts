import { describe, expect, it } from 'vitest';
import { calculateExecutionProgress } from './progress';
import type { ExecutionTask, SourceDocument } from './types';

function task(overrides: Partial<ExecutionTask> & { id: string; title: string }): ExecutionTask {
  return {
    id: overrides.id,
    title: overrides.title,
    description: overrides.description || overrides.title,
    source_document: overrides.source_document || 'Conference Proposal.md',
    source_section: overrides.source_section || 'First actions',
    source_excerpt: overrides.source_excerpt || overrides.title,
    workstream: overrides.workstream || 'Indian Student Transition and Wellbeing Forum',
    category: overrides.category || 'setup',
    project: overrides.project || 'Conference approval',
    priority: overrides.priority || 'Medium',
    impact: overrides.impact || 'Medium',
    effort_minutes: overrides.effort_minutes || 30,
    urgency: overrides.urgency || 'Medium',
    status: overrides.status || 'Not started',
    due_date: overrides.due_date,
    scheduled_date: overrides.scheduled_date,
    dependencies: overrides.dependencies || [],
    prerequisite_of: overrides.prerequisite_of || [],
    sequence_order: overrides.sequence_order || 1,
    owner: 'Founder',
    notes: '',
    evidence_required: '',
    completion_proof: '',
    ai_generated: true,
    manually_added: false,
    created_at: '2026-04-27T00:00:00.000Z',
    updated_at: '2026-04-27T00:00:00.000Z',
    completed_at: overrides.completed_at,
  };
}

const sourceDocuments: SourceDocument[] = [
  {
    id: 'doc-conference',
    name: 'Conference Proposal.md',
    path: '/Users/rushi/Downloads/Conference Proposal.md',
    type: 'uploaded-markdown',
    imported_at: '2026-04-27T00:00:00.000Z',
    last_reviewed_at: '2026-04-27T00:00:00.000Z',
    sections: [
      {
        id: 'first-actions',
        title: 'First actions',
        excerpt: 'Approval, title, invite list and resource pack.',
        workstreams: ['Indian Student Transition and Wellbeing Forum'],
      },
    ],
  },
];

describe('execution progress', () => {
  it('calculates effort-weighted progress and excludes cancelled tasks from denominators', () => {
    const progress = calculateExecutionProgress([
      task({
        id: 'done',
        title: 'Confirm conference approval pathway',
        status: 'Done',
        effort_minutes: 30,
        completed_at: '2026-04-29T10:00:00.000Z',
      }),
      task({
        id: 'open',
        title: 'Draft conference registration fields',
        status: 'Not started',
        effort_minutes: 30,
        due_date: '2026-04-29',
      }),
      task({
        id: 'cancelled',
        title: 'Cancelled campaign branch',
        status: 'Cancelled',
        effort_minutes: 120,
      }),
    ], sourceDocuments, new Date('2026-04-30T12:00:00.000Z'));

    expect(progress.overall.active_minutes).toBe(60);
    expect(progress.overall.completed_minutes).toBe(30);
    expect(progress.overall.percent).toBe(50);
    expect(progress.by_document[0].percent).toBe(50);
    expect(progress.weekly_velocity_minutes).toBe(30);
    expect(progress.overdue_count).toBe(1);
  });

  it('tracks blocked counts and readiness from matching setup epics', () => {
    const progress = calculateExecutionProgress([
      task({
        id: 'speaker',
        title: 'Identify conference speakers',
        project: 'Conference speaker setup',
        status: 'Done',
        effort_minutes: 25,
        completed_at: '2026-04-30T02:00:00.000Z',
      }),
      task({
        id: 'registration',
        title: 'Draft conference registration form',
        project: 'Conference registration setup',
        status: 'Not started',
        effort_minutes: 25,
      }),
      task({
        id: 'blocked',
        title: 'Publish conference invite wording',
        project: 'Conference invite setup',
        status: 'Blocked',
        effort_minutes: 25,
      }),
    ], sourceDocuments, new Date('2026-04-30T12:00:00.000Z'));

    expect(progress.blocked_count).toBe(1);
    expect(progress.readiness['Conference readiness']).toBe(33);
  });
});
