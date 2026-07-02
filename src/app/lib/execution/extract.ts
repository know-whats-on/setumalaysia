import {
  type ExecutionTask,
  type ExtractedTaskCandidate,
  type SourceDocument,
  type TaskCategory,
  type Workstream,
} from './types';

const ACTION_RE = /\b(create|build|draft|prepare|send|schedule|finalise|finalize|confirm|review|audit|launch|set up|setup|collect|identify|map|write|publish|import|verify|track|define|outline|assemble|generate)\b/i;

const workstreamHints: Array<{ match: RegExp; workstream: Workstream }> = [
  { match: /linkedin|post|content|carousel|video|quote/i, workstream: 'LinkedIn content' },
  { match: /conference|high commission|speaker|registration|resource pack|pilot eoi/i, workstream: 'Indian Student Transition and Wellbeing Forum' },
  { match: /council|lga|mayor|local government/i, workstream: 'Councils/LGAs and government contacts' },
  { match: /minister|public-sector|public sector|agency|briefing/i, workstream: 'Public-sector outreach' },
  { match: /university|admissions|student office|international team/i, workstream: 'University and admissions outreach' },
  { match: /partner|sponsor|pbsa|settlement|legal centre/i, workstream: 'Partner outreach' },
  { match: /ads|meta|pixel|conversion|audience/i, workstream: 'Paid ads setup' },
  { match: /app store|play store|aso|metadata|keyword|screenshot/i, workstream: 'ASO / app store optimisation' },
  { match: /roadmap|feature|prototype|move-in|scam triage|application kit/i, workstream: 'Product roadmap and feature research' },
  { match: /ux|codex|simplification|onboarding/i, workstream: 'UX simplification / Codex product tasks' },
  { match: /investor|pitch|deck|metrics|proof/i, workstream: 'Investor and pitch deck' },
  { match: /workshop|event|webinar|clinic|pop-up/i, workstream: 'Community events and workshops' },
  { match: /landing page|analytics|utm|homepage|website/i, workstream: 'Website / landing pages / analytics setup' },
  { match: /crm|follow-up|report|admin|tracker/i, workstream: 'Admin, proof assets, CRM, reporting, and follow-ups' },
];

function inferWorkstream(text: string): Workstream {
  return workstreamHints.find((hint) => hint.match.test(text))?.workstream || 'Organic GTM';
}

function inferCategory(text: string): TaskCategory {
  if (/follow-up|reply|waiting|respond/i.test(text)) return 'follow-up';
  if (/send|email|message|call|outreach|invite/i.test(text)) return 'outreach';
  if (/post|content|carousel|video|copy|caption/i.test(text)) return 'content';
  if (/review|audit|verify|check/i.test(text)) return 'review';
  if (/metric|analytics|utm|track|conversion/i.test(text)) return 'analytics';
  if (/asset|screenshot|visual|brief|one-pager|template|resource/i.test(text)) return 'asset';
  if (/research|identify|map|interview/i.test(text)) return 'research';
  if (/create|build|set up|setup|define|confirm|prepare/i.test(text)) return 'setup';
  return 'quick-win';
}

function effortFor(text: string) {
  if (/\b(brief|landing page|prototype|deck|resource pack|100-name|first 25|first 30)\b/i.test(text)) return 45;
  if (/\b(draft|outline|audit|map|assemble|prepare)\b/i.test(text)) return 35;
  if (/\b(send|schedule|verify|list|confirm)\b/i.test(text)) return 25;
  return 20;
}

function cleanTaskTitle(line: string) {
  return line
    .replace(/^[-*]\s+/, '')
    .replace(/^\d+\.\s+/, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.|;:]$/, '');
}

function splitHugeTask(title: string) {
  const parts = title.split(/\s+(?:and|, then| then)\s+/i).map((part) => part.trim()).filter(Boolean);
  return parts.length > 1 && title.length > 90 ? parts : [title];
}

function normalizeKey(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function parseMarkdownSections(markdown: string) {
  const lines = markdown.split(/\r?\n/);
  const sections: Array<{ title: string; lineStart: number; lines: string[] }> = [];
  let current: { title: string; lineStart: number; lines: string[] } | null = null;

  lines.forEach((line, index) => {
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      if (current) sections.push(current);
      current = { title: heading[2].trim(), lineStart: index + 1, lines: [] };
      return;
    }
    if (!current) {
      current = { title: 'Document start', lineStart: 1, lines: [] };
    }
    current.lines.push(line);
  });

  if (current) sections.push(current);
  return sections;
}

export function extractTaskCandidatesFromMarkdown(params: {
  markdown: string;
  document: SourceDocument;
  existingTasks: ExecutionTask[];
}): ExtractedTaskCandidate[] {
  const existingKeys = new Map(params.existingTasks.map((task) => [normalizeKey(`${task.workstream} ${task.title}`), task.id]));
  const seen = new Set<string>();
  const createdAt = new Date().toISOString();
  const candidates: ExtractedTaskCandidate[] = [];

  parseMarkdownSections(params.markdown).forEach((section, sectionIndex) => {
    section.lines.forEach((line, lineIndex) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('|---') || !ACTION_RE.test(trimmed)) return;
      const looksLikeList = /^[-*]\s+/.test(trimmed) || /^\d+\.\s+/.test(trimmed) || /^\|/.test(trimmed);
      if (!looksLikeList && trimmed.length > 180) return;

      const rawTitle = cleanTaskTitle(trimmed.replace(/\|/g, ' ').replace(/\s+/g, ' '));
      for (const title of splitHugeTask(rawTitle)) {
        const workstream = inferWorkstream(`${section.title} ${title}`);
        const key = normalizeKey(`${workstream} ${title}`);
        if (seen.has(key)) continue;
        seen.add(key);
        const duplicateId = existingKeys.get(key);
        const effort = Math.min(45, Math.max(15, effortFor(title)));
        const id = `candidate-${params.document.id}-${sectionIndex + 1}-${lineIndex + 1}-${candidates.length + 1}`;

        candidates.push({
          id,
          title,
          description: `Review this extracted action from ${params.document.name}.`,
          source_document: params.document.name,
          source_section: section.title,
          source_excerpt: trimmed.slice(0, 240),
          workstream,
          category: inferCategory(title),
          project: section.title,
          priority: /approval|tracking|crm|launch|speaker|first/i.test(title) ? 'High' : 'Medium',
          impact: /launch|approval|crm|partner|conversion|speaker|pilot/i.test(title) ? 'High' : 'Medium',
          effort_minutes: effort,
          urgency: /now|first|approval|launch|before/i.test(title) ? 'High' : 'Medium',
          status: duplicateId ? 'Needs review' : 'Not started',
          dependencies: [],
          prerequisite_of: [],
          sequence_order: 5000 + candidates.length,
          owner: 'Founder',
          notes: duplicateId ? 'Possible duplicate found during import.' : '',
          evidence_required: 'Accepted, edited, merged, rejected or deferred in the review queue.',
          completion_proof: '',
          ai_generated: true,
          manually_added: false,
          created_at: createdAt,
          updated_at: createdAt,
          candidate_status: 'pending',
          review_reason: duplicateId ? 'Possible duplicate.' : title.length > 80 ? 'Long task may need splitting.' : undefined,
          suggested_duplicate_ids: duplicateId ? [duplicateId] : [],
        });
      }
    });
  });

  return candidates;
}
