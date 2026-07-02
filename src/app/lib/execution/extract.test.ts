import { describe, expect, it } from 'vitest';
import { extractTaskCandidatesFromMarkdown, parseMarkdownSections } from './extract';
import type { ExecutionTask, SourceDocument } from './types';

function existingTask(title: string): ExecutionTask {
  return {
    id: 'existing-crm-fields',
    title,
    description: title,
    source_document: 'Public Sector Outreach for Hoodie.md',
    source_section: 'Outreach sequencing plan',
    source_excerpt: title,
    workstream: 'Admin, proof assets, CRM, reporting, and follow-ups',
    category: 'setup',
    project: 'CRM operating system',
    priority: 'High',
    impact: 'High',
    effort_minutes: 35,
    urgency: 'High',
    status: 'Not started',
    dependencies: [],
    prerequisite_of: [],
    sequence_order: 1,
    owner: 'Founder',
    notes: '',
    evidence_required: '',
    completion_proof: '',
    ai_generated: true,
    manually_added: false,
    created_at: '2026-04-30T00:00:00.000Z',
    updated_at: '2026-04-30T00:00:00.000Z',
  };
}

const document: SourceDocument = {
  id: 'doc-import-test',
  name: 'Imported plan.md',
  path: '[Imported]',
  type: 'uploaded-markdown',
  imported_at: '2026-04-30T00:00:00.000Z',
  sections: [],
};

describe('execution markdown extraction', () => {
  it('parses markdown sections from headings', () => {
    const sections = parseMarkdownSections('# First\n- Create thing\n## Second\n- Draft thing');

    expect(sections.map((section) => section.title)).toEqual(['First', 'Second']);
    expect(sections[1].lineStart).toBe(3);
  });

  it('extracts source-linked candidate tasks and duplicate review flags', () => {
    const markdown = [
      '# CRM setup',
      '- Create CRM fields',
      '- Draft council one-pager',
      '',
      '# Paid ads setup',
      '| Task | Set up Meta Business Manager |',
      '- Create Meta Business Manager and connect Facebook page and define conversion event for first paid ads setup launch path',
    ].join('\n');

    const candidates = extractTaskCandidatesFromMarkdown({
      markdown,
      document,
      existingTasks: [existingTask('Create CRM fields')],
    });

    expect(candidates.length).toBeGreaterThanOrEqual(5);
    expect(candidates.map((candidate) => candidate.source_document)).toEqual(
      expect.arrayContaining(['Imported plan.md']),
    );
    expect(candidates.find((candidate) => candidate.title === 'Create CRM fields')?.status).toBe('Needs review');
    expect(candidates.find((candidate) => candidate.title.includes('Meta Business Manager'))?.workstream).toBe('Paid ads setup');
    expect(candidates.every((candidate) => candidate.candidate_status === 'pending')).toBe(true);
  });
});
