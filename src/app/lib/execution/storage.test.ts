// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';
import { createInitialExecutionState } from './seed-data';
import {
  ensureExecutionState,
  exportExecutionState,
  importExecutionState,
  loadExecutionState,
  saveExecutionState,
} from './storage';
import { EXECUTION_STORAGE_KEY, EXECUTION_STORAGE_VERSION, type ExecutionTask } from './types';

describe('execution storage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('seeds local storage when no dashboard state exists', () => {
    const state = loadExecutionState(window.localStorage);

    expect(state.version).toBe(EXECUTION_STORAGE_VERSION);
    expect(state.tasks.length).toBeGreaterThan(0);
    expect(state.source_documents.map((document) => document.name)).toEqual(expect.arrayContaining([
      'Conference Proposal.md',
      'hoodie-llm-product-context.md',
      'Public Sector Outreach for Hoodie.md',
      'Product Opportunity Study for Hoodie.md',
      'Organic GTM for Hoodie.md',
      'LinkedIn for Hoodie.md',
    ]));
    expect(window.localStorage.getItem(EXECUTION_STORAGE_KEY)).toBeTruthy();
  });

  it('falls back to seeded state after corrupt JSON', () => {
    window.localStorage.setItem(EXECUTION_STORAGE_KEY, '{not-json');

    const state = loadExecutionState(window.localStorage);

    expect(state.tasks.length).toBeGreaterThan(0);
    expect(state.source_documents.length).toBeGreaterThan(0);
  });

  it('round-trips saved and exported state', () => {
    const state = createInitialExecutionState(new Date('2026-04-30T00:00:00.000Z'));
    const edited = {
      ...state,
      tasks: state.tasks.map((task, index) =>
        index === 0
          ? { ...task, status: 'Done' as const, completed_at: '2026-04-30T03:00:00.000Z' }
          : task,
      ),
    };

    const saved = saveExecutionState(edited, window.localStorage);
    const loaded = loadExecutionState(window.localStorage);
    const imported = importExecutionState(exportExecutionState(saved));

    expect(loaded.tasks[0].status).toBe('Done');
    expect(imported.tasks[0].status).toBe('Done');
  });

  it('migrates placeholder and discovered seeded sources out of old local state', () => {
    const state = createInitialExecutionState(new Date('2026-04-30T00:00:00.000Z'));
    const badGeneratedTask: ExecutionTask = {
      ...state.tasks[0],
      id: 'legacy-paid-placeholder',
      title: 'Create Meta Business Manager',
      source_document: 'Missing source: Paid ads plan',
      source_section: 'Prerequisite-only paid ads setup',
      source_excerpt: 'No separate paid ads markdown was found.',
      dependencies: [state.tasks[0].id],
      prerequisite_of: [],
    };
    const manualTask: ExecutionTask = {
      ...state.tasks[0],
      id: 'manual-unsourced-task',
      title: 'Manual founder note',
      source_document: 'Missing source: UX simplification plan',
      source_section: '',
      source_excerpt: '',
      ai_generated: false,
      manually_added: true,
    };

    const migrated = ensureExecutionState({
      ...state,
      version: 1,
      source_documents: [
        ...state.source_documents,
        {
          id: 'doc-missing-paid-ads',
          name: 'Missing source: Paid ads plan',
          path: '[To be added]',
          type: 'missing-source-placeholder',
          source_needed: true,
          imported_at: '2026-04-30T00:00:00.000Z',
          sections: [],
        },
        {
          id: 'doc-store-metadata',
          name: 'Fastlane Hoodie store metadata',
          path: '/Users/rushi/Downloads/GHAR/fastlane/metadata',
          type: 'store-metadata',
          imported_at: '2026-04-30T00:00:00.000Z',
          sections: [],
        },
      ],
      tasks: [...state.tasks, badGeneratedTask, manualTask],
      candidate_tasks: [
        {
          ...badGeneratedTask,
          id: 'candidate-ai-import-paid-ads-plan',
          status: 'Needs review',
          candidate_status: 'pending',
          review_reason: 'Legacy missing-source placeholder.',
        },
      ],
      daily_plans: [
        {
          id: 'plan-legacy',
          date: '2026-04-30',
          task_ids: [state.tasks[0].id, badGeneratedTask.id, manualTask.id],
          locked_task_ids: [badGeneratedTask.id],
          target_minutes: 120,
          generated_at: '2026-04-30T00:00:00.000Z',
          planner_version: 'seed-v1',
        },
      ],
    });

    expect(migrated.version).toBe(EXECUTION_STORAGE_VERSION);
    expect(migrated.source_documents.map((document) => document.name)).not.toEqual(expect.arrayContaining([
      'Missing source: Paid ads plan',
      'Fastlane Hoodie store metadata',
    ]));
    expect(migrated.tasks.map((task) => task.id)).not.toContain('legacy-paid-placeholder');
    expect(migrated.candidate_tasks).toHaveLength(0);
    expect(migrated.daily_plans[0].task_ids).not.toContain('legacy-paid-placeholder');
    expect(migrated.daily_plans[0].locked_task_ids).not.toContain('legacy-paid-placeholder');
    expect(migrated.tasks.find((task) => task.id === 'manual-unsourced-task')?.source_document).toBe('Manual task');
  });
});
