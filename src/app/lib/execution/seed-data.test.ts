import { describe, expect, it } from 'vitest';
import {
  APPROVED_SEEDED_SOURCE_DOCUMENT_NAMES,
  createInitialExecutionState,
} from './seed-data';

const removedSourceFragments = [
  'Missing source',
  'Fastlane',
  'city-guide-csv',
];

describe('execution seed data', () => {
  it('uses only the six initially provided source documents', () => {
    const state = createInitialExecutionState(new Date('2026-04-30T00:00:00.000Z'));

    expect(state.source_documents.map((document) => document.name)).toEqual([
      ...APPROVED_SEEDED_SOURCE_DOCUMENT_NAMES,
    ]);
  });

  it('does not seed tasks or review candidates from invented sources', () => {
    const state = createInitialExecutionState(new Date('2026-04-30T00:00:00.000Z'));
    const allowedSources = new Set(APPROVED_SEEDED_SOURCE_DOCUMENT_NAMES);

    expect(state.candidate_tasks).toHaveLength(0);
    expect(state.tasks.length).toBeGreaterThan(0);
    expect(state.tasks.every((task) => allowedSources.has(task.source_document))).toBe(true);
    expect(state.tasks.flatMap((task) => [
      task.source_document,
      task.source_section,
      task.source_excerpt,
      task.title,
      task.description,
    ]).some((value) =>
      removedSourceFragments.some((fragment) => value.includes(fragment)),
    )).toBe(false);
  });

  it('keeps dependencies pointed only at retained seeded tasks', () => {
    const state = createInitialExecutionState(new Date('2026-04-30T00:00:00.000Z'));
    const taskIds = new Set(state.tasks.map((task) => task.id));

    expect(state.tasks.every((task) =>
      task.dependencies.every((dependencyId) => taskIds.has(dependencyId)),
    )).toBe(true);
    expect(state.tasks.every((task) =>
      task.prerequisite_of.every((dependentId) => taskIds.has(dependentId)),
    )).toBe(true);
  });
});
