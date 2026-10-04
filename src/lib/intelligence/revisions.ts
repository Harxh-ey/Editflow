import type { Message, Requirement, Revision } from '@/types';

type RevDraft = Omit<Revision, 'id' | 'projectId'>;

/**
 * Compare sequential messages against existing requirements and
 * record changes without overwriting history.
 */
export function detectRevisions(
  messages: Message[],
  existing: Requirement[],
  incoming: Omit<Requirement, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>[]
): RevDraft[] {
  const revisions: RevDraft[] = [];
  const byCategory = new Map<string, Requirement>();
  for (const req of existing) {
    byCategory.set(req.category, req);
  }

  for (const next of incoming) {
    const prev = byCategory.get(next.category);
    if (prev && prev.value && next.value && prev.value !== next.value) {
      const source = next.sourceMessageIds[next.sourceMessageIds.length - 1] || messages[messages.length - 1]?.id || '';
      const msg = messages.find((m) => m.id === source);
      revisions.push({
        requirementId: prev.id,
        type: 'changed',
        field: next.title || prev.title,
        oldValue: prev.value,
        newValue: next.value,
        sourceMessageId: source,
        timestamp: msg?.timestamp || new Date().toISOString(),
      });
    } else if (!prev && next.sourceMessageIds.length) {
      const source = next.sourceMessageIds[next.sourceMessageIds.length - 1];
      const msg = messages.find((m) => m.id === source);
      revisions.push({
        requirementId: null,
        type: 'added',
        field: next.title,
        oldValue: null,
        newValue: next.value,
        sourceMessageId: source,
        timestamp: msg?.timestamp || new Date().toISOString(),
      });
    }
  }

  return revisions;
}
