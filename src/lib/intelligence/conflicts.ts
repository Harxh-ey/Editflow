import type { Conflict, Message, Requirement, Revision } from '@/types';

type ConfDraft = Omit<Conflict, 'id' | 'projectId' | 'createdAt' | 'resolvedAt'>;

const CONFLICT_CATEGORIES = new Set(['duration', 'footage', 'aspect_ratio', 'deadline', 'format']);

/**
 * Preserve uncertainty. Do not auto-resolve ambiguous contradictions.
 */
export function detectConflicts(
  messages: Message[],
  requirements: Array<
    Pick<Requirement, 'title' | 'value' | 'category' | 'sourceMessageIds' | 'status'> & { id?: string }
  >,
  revisions: Array<Pick<Revision, 'field' | 'oldValue' | 'newValue' | 'sourceMessageId'>>
): ConfDraft[] {
  const conflicts: ConfDraft[] = [];

  for (const rev of revisions) {
    if (!rev.oldValue || !rev.newValue || rev.oldValue === rev.newValue) continue;

    const related = requirements.find(
      (r) => r.title === rev.field || r.category === categoryFromField(rev.field)
    );
    const isStructural = related ? CONFLICT_CATEGORIES.has(related.category) : /duration|seconds|ratio|deadline/i.test(rev.field);

    if (!isStructural) continue;

    const earlier = messages.find((m) => related?.sourceMessageIds.includes(m.id) && m.id !== rev.sourceMessageId);
    conflicts.push({
      description: `${rev.field} does not line up. Earlier: ${rev.oldValue}. Later: ${rev.newValue}.`,
      requirementIds: related?.id ? [related.id] : [],
      severity: related?.category === 'duration' || related?.category === 'deadline' ? 'high' : 'medium',
      status: 'open',
      suggestedAction: `Ask the client to confirm the final ${rev.field.toLowerCase()}.`,
      sourceMessageIds: [earlier?.id, rev.sourceMessageId].filter(Boolean) as string[],
    });
  }

  return conflicts;
}

function categoryFromField(field: string): Requirement['category'] | null {
  const f = field.toLowerCase();
  if (f.includes('duration') || f.includes('second')) return 'duration';
  if (f.includes('clip') || f.includes('footage')) return 'footage';
  if (f.includes('ratio') || f.includes('9:16') || f.includes('16:9')) return 'aspect_ratio';
  if (f.includes('deadline')) return 'deadline';
  return null;
}
