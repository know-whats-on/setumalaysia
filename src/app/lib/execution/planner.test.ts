import { describe, expect, it } from 'vitest';
import { generateDailyPlan, getEligibleTasks } from './planner';
import type { ExecutionTask, TaskStatus } from './types';

function task(overrides: Partial<ExecutionTask> & { id: string; title: string }): ExecutionTask {
  return {
    id: overrides.id,
    title: overrides.title,
    description: overrides.description || overrides.title,
    source_document: overrides.source_document || 'Test source.md',
    source_section: overrides.source_section || 'Test section',
    source_excerpt: overrides.source_excerpt || overrides.title,
    workstream: overrides.workstream || 'Organic GTM',
    category: overrides.category || 'setup',
    project: overrides.project || 'Test epic',
    priority: overrides.priority || 'Medium',
    impact: overrides.impact || 'Medium',
    effort_minutes: overrides.effort_minutes || 25,
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
    created_at: '2026-04-30T00:00:00.000Z',
    updated_at: '2026-04-30T00:00:00.000Z',
    completed_at: overrides.completed_at,
  };
}

describe('execution planner', () => {
  it('excludes tasks until their prerequisites are done', () => {
    const tasks = [
      task({ id: 'setup-meta', title: 'Create Meta Business Manager', status: 'Not started' }),
      task({
        id: 'run-meta',
        title: 'Draft first Meta campaign',
        workstream: 'Paid ads setup',
        category: 'deep-work',
        dependencies: ['setup-meta'],
      }),
    ];

    expect(getEligibleTasks(tasks, '2026-04-30').map((item) => item.id)).toEqual(['setup-meta']);

    const withSetupDone = tasks.map((item) =>
      item.id === 'setup-meta' ? { ...item, status: 'Done' as TaskStatus } : item,
    );

    expect(getEligibleTasks(withSetupDone, '2026-04-30').map((item) => item.id)).toContain('run-meta');
  });

  it('builds a 90-135 minute daily plan from bucketed eligible work', () => {
    const planTasks = [
      task({
        id: 'deep',
        title: 'Draft public-sector briefing note',
        workstream: 'Public-sector outreach',
        category: 'deep-work',
        effort_minutes: 45,
        priority: 'High',
        impact: 'High',
        sequence_order: 1,
      }),
      task({
        id: 'quick',
        title: 'Verify store support URL',
        workstream: 'ASO / app store optimisation',
        category: 'quick-win',
        effort_minutes: 20,
        sequence_order: 2,
      }),
      task({
        id: 'follow',
        title: 'Log first five follow-ups',
        workstream: 'Admin, proof assets, CRM, reporting, and follow-ups',
        category: 'follow-up',
        effort_minutes: 25,
        sequence_order: 3,
      }),
      task({
        id: 'setup',
        title: 'Define conversion event',
        workstream: 'Paid ads setup',
        category: 'setup',
        effort_minutes: 30,
        sequence_order: 4,
      }),
      task({
        id: 'blocked',
        title: 'Send approved High Commission invite',
        workstream: 'Indian Student Transition and Wellbeing Forum',
        status: 'Blocked',
        effort_minutes: 30,
        sequence_order: 5,
      }),
      task({
        id: 'waiting',
        title: 'Follow up sponsor reply',
        workstream: 'Conference partner/sponsor/resource outreach',
        status: 'Waiting for reply',
        effort_minutes: 20,
        sequence_order: 6,
      }),
    ];

    const result = generateDailyPlan(planTasks, '2026-04-30');
    const plannedMinutes = result.tasks.reduce((sum, item) => sum + item.effort_minutes, 0);

    expect(plannedMinutes).toBeGreaterThanOrEqual(90);
    expect(plannedMinutes).toBeLessThanOrEqual(135);
    expect(result.plan.task_ids).toEqual(expect.arrayContaining(['deep', 'quick', 'follow', 'setup']));
    expect(result.plan.task_ids).not.toEqual(expect.arrayContaining(['blocked', 'waiting']));
  });

  it('respects scheduled dates and manual locks', () => {
    const tasks = [
      task({ id: 'today', title: 'Create partner one-pager outline', effort_minutes: 45, sequence_order: 1 }),
      task({
        id: 'future',
        title: 'Send first cold outreach wave',
        workstream: 'Partner outreach',
        category: 'outreach',
        scheduled_date: '2026-05-10',
        effort_minutes: 25,
        sequence_order: 2,
      }),
      task({
        id: 'locked',
        title: 'Prepare first seven LinkedIn assets',
        workstream: 'LinkedIn content',
        category: 'content',
        effort_minutes: 35,
        sequence_order: 3,
      }),
      task({
        id: 'setup',
        title: 'Create CRM fields',
        workstream: 'Admin, proof assets, CRM, reporting, and follow-ups',
        category: 'setup',
        effort_minutes: 25,
        sequence_order: 4,
      }),
    ];

    const result = generateDailyPlan(tasks, '2026-04-30', { lockedTaskIds: ['locked'] });

    expect(result.plan.task_ids).toContain('locked');
    expect(result.plan.task_ids).not.toContain('future');
  });
});
