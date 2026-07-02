import { describe, expect, it } from 'vitest';
import { getDateLoad } from './directory';
import {
  cascadeScheduleFromDate,
  enforceDependencyDates,
  moveTaskToNextDay,
  scheduleUndatedTasks,
} from './schedule';
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
    notes: overrides.notes || '',
    evidence_required: '',
    completion_proof: '',
    ai_generated: true,
    manually_added: false,
    created_at: '2026-04-30T00:00:00.000Z',
    updated_at: '2026-04-30T00:00:00.000Z',
    completed_at: overrides.completed_at,
  };
}

describe('execution cascade scheduling', () => {
  it('moves a not-completed task to tomorrow and cascades lower priority overflow', () => {
    const tasks = [
      task({
        id: 'missed',
        title: 'Missed task',
        scheduled_date: '2026-04-30',
        due_date: '2026-04-30',
        effort_minutes: 45,
        priority: 'High',
        impact: 'High',
      }),
      task({
        id: 'keep',
        title: 'Keep tomorrow',
        scheduled_date: '2026-05-01',
        due_date: '2026-05-01',
        effort_minutes: 80,
        priority: 'Critical',
        impact: 'High',
      }),
      task({
        id: 'cascade',
        title: 'Cascade lower priority',
        scheduled_date: '2026-05-01',
        due_date: '2026-05-01',
        effort_minutes: 60,
        priority: 'Low',
        impact: 'Low',
      }),
    ];

    const result = moveTaskToNextDay(tasks, 'missed', '2026-04-30');

    expect(result.find((item) => item.id === 'missed')?.scheduled_date).toBe('2026-05-01');
    expect(result.find((item) => item.id === 'cascade')?.scheduled_date).toBe('2026-05-02');
    expect(getDateLoad(result, '2026-05-01')).toBeLessThanOrEqual(135);
    expect(result.find((item) => item.id === 'missed')?.notes).toContain('Moved because previous day was not completed.');
  });

  it('does not move done, blocked, waiting, cancelled or locked tasks during cascade', () => {
    const tasks = [
      task({ id: 'locked', title: 'Locked', scheduled_date: '2026-05-01', effort_minutes: 80, priority: 'Low' }),
      task({ id: 'done', title: 'Done', scheduled_date: '2026-05-01', effort_minutes: 60, status: 'Done' }),
      task({ id: 'blocked', title: 'Blocked', scheduled_date: '2026-05-01', effort_minutes: 60, status: 'Blocked' }),
      task({ id: 'waiting', title: 'Waiting', scheduled_date: '2026-05-01', effort_minutes: 60, status: 'Waiting for reply' }),
      task({ id: 'open', title: 'Open', scheduled_date: '2026-05-01', effort_minutes: 80, priority: 'Medium' }),
    ];

    const result = cascadeScheduleFromDate(tasks, '2026-05-01', { lockedTaskIds: ['locked'] });

    expect(result.find((item) => item.id === 'locked')?.scheduled_date).toBe('2026-05-01');
    expect(result.find((item) => item.id === 'done')?.scheduled_date).toBe('2026-05-01');
    expect(result.find((item) => item.id === 'blocked')?.scheduled_date).toBe('2026-05-01');
    expect(result.find((item) => item.id === 'waiting')?.scheduled_date).toBe('2026-05-01');
    expect(result.find((item) => item.id === 'open')?.scheduled_date).toBe('2026-05-02');
  });

  it('preserves dependency order and gives undated tasks usable dates', () => {
    const dependency = task({
      id: 'setup',
      title: 'Setup prerequisite',
      scheduled_date: '2026-05-03',
      due_date: '2026-05-03',
    });
    const dependent = task({
      id: 'launch',
      title: 'Dependent launch',
      scheduled_date: '2026-05-01',
      due_date: '2026-05-01',
      dependencies: ['setup'],
    });

    const ordered = enforceDependencyDates([dependency, dependent]);
    expect(ordered.find((item) => item.id === 'launch')?.scheduled_date).toBe('2026-05-03');

    const scheduled = scheduleUndatedTasks([
      task({ id: 'undated-1', title: 'Undated one' }),
      task({ id: 'undated-2', title: 'Undated two' }),
    ], '2026-04-30');
    expect(scheduled.every((item) => Boolean(item.scheduled_date && item.due_date))).toBe(true);
  });
});
