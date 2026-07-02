import { describe, expect, it } from 'vitest';
import { groupTasksByDate, getTodayTasks, getWeekGroups } from './directory';
import { projectTypeCoverageIsComplete } from './project-types';
import type { ExecutionTask } from './types';

function task(overrides: Partial<ExecutionTask> & { id: string; title: string }): ExecutionTask {
  return {
    id: overrides.id,
    title: overrides.title,
    description: overrides.description || overrides.title,
    source_document: 'Test source.md',
    source_section: 'Test section',
    source_excerpt: overrides.title,
    workstream: overrides.workstream || 'Organic GTM',
    category: overrides.category || 'setup',
    project: overrides.project || 'Test epic',
    priority: overrides.priority || 'Medium',
    impact: overrides.impact || 'Medium',
    effort_minutes: overrides.effort_minutes || 25,
    urgency: overrides.urgency || 'Medium',
    status: overrides.status || 'Not started',
    scheduled_date: overrides.scheduled_date,
    due_date: overrides.due_date,
    dependencies: overrides.dependencies || [],
    prerequisite_of: overrides.prerequisite_of || [],
    sequence_order: overrides.sequence_order || 1,
    owner: 'Founder',
    notes: '',
    evidence_required: '',
    completion_proof: '',
    ai_generated: true,
    manually_added: false,
    created_at: overrides.created_at || '2026-04-30T00:00:00.000Z',
    updated_at: '2026-04-30T00:00:00.000Z',
    completed_at: overrides.completed_at,
  };
}

describe('execution directory helpers', () => {
  it('groups all tasks into dated sections and sorts overdue, today, upcoming, completed', () => {
    const groups = groupTasksByDate([
      task({ id: 'upcoming', title: 'Upcoming', scheduled_date: '2026-05-02' }),
      task({ id: 'today', title: 'Today', scheduled_date: '2026-04-30' }),
      task({ id: 'overdue', title: 'Overdue', scheduled_date: '2026-04-29' }),
      task({ id: 'done', title: 'Done', scheduled_date: '2026-04-28', status: 'Done' }),
      task({ id: 'fallback', title: 'Fallback date only' }),
    ], '2026-04-30');

    expect(groups.map((group) => group.kind)).toEqual(['overdue', 'today', 'upcoming', 'completed']);
    expect(groups.flatMap((group) => group.tasks.map((item) => item.id))).toEqual(expect.arrayContaining([
      'upcoming',
      'today',
      'overdue',
      'done',
      'fallback',
    ]));
  });

  it('returns only today tasks for the daily view and seven days for the week view', () => {
    const tasks = [
      task({ id: 'today', title: 'Today', scheduled_date: '2026-04-30', effort_minutes: 45 }),
      task({ id: 'tomorrow', title: 'Tomorrow', scheduled_date: '2026-05-01', effort_minutes: 35 }),
    ];

    expect(getTodayTasks(tasks, '2026-04-30').map((item) => item.id)).toEqual(['today']);
    expect(getWeekGroups(tasks, new Date('2026-04-30T00:00:00')).length).toBe(7);
    expect(getWeekGroups(tasks, new Date('2026-04-30T00:00:00'))[0].open_minutes).toBe(45);
  });

  it('has project type metadata for every task category', () => {
    expect(projectTypeCoverageIsComplete()).toBe(true);
  });
});
