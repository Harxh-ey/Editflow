import { callAI, isAIConfigured, safeParseJSON } from './provider';
import { buildIntelligencePrompt } from './prompts';
import { IntelligenceResponseSchema, INTELLIGENCE_RESPONSE_SCHEMA } from '@/lib/validation/schemas';
import { searchProjectMemory, getClientMemory } from '@/lib/mongodb/memory';
import { withSpan } from '@/lib/observability/sentry';
import type { IntelligenceResponse, Project, Message, Requirement, Revision, Conflict, Task } from '@/types';

/**
 * Query a project using AI intelligence or memory retrieval.
 */
export async function queryProject(
  projectId: string,
  query: string,
  context: {
    project: Project;
    messages: Message[];
    requirements: Requirement[];
    revisions: Revision[];
    conflicts: Conflict[];
    tasks: Task[];
  }
): Promise<IntelligenceResponse> {
  return withSpan('ai.intelligence_query', async () => {
    // If asking about cross-project client preferences or past history
    const qLower = query.toLowerCase();
    if (qLower.includes('client preference') || qLower.includes('past project') || qLower.includes('client usually')) {
      const clientProfile = await getClientMemory(context.project.clientName);
      if (clientProfile) {
        const aspects = clientProfile.preferredAspectRatios.length > 0
          ? `Aspect ratios: ${clientProfile.preferredAspectRatios.join(', ')}.`
          : '';
        const formats = clientProfile.preferredFormats.length > 0
          ? `Formats: ${clientProfile.preferredFormats.join(', ')}.`
          : '';
        return {
          answer: `Client ${clientProfile.clientName} has worked on ${clientProfile.projectCount} project(s) with ${clientProfile.pastRevisionsCount} past revision(s). ${aspects} ${formats}`.trim(),
          sources: [],
          relatedRequirements: [],
        };
      }
    }

    if (!isAIConfigured()) {
      return queryProjectDemo(projectId, query, context);
    }

    try {
      const { system, user } = buildIntelligencePrompt(query, {
        projectName: context.project.name,
        clientName: context.project.clientName,
        requirements: context.requirements.map((r) => ({ title: r.title, status: r.status, value: r.value })),
        conflicts: context.conflicts.map((c) => ({ description: c.description, status: c.status })),
        tasks: context.tasks.map((t) => ({ title: t.title, status: t.status })),
        revisions: context.revisions.map((r) => ({ field: r.field, oldValue: r.oldValue, newValue: r.newValue })),
        messages: context.messages.map((m) => ({ id: m.id, content: m.content })),
      });

      let rawResponse = await callAI(system, user, {
        responseMimeType: 'application/json',
        responseSchema: INTELLIGENCE_RESPONSE_SCHEMA,
      });

      let parseResult = safeParseJSON(rawResponse);
      if (!parseResult.success) {
        const retryUser = `${user}\n\n[RETRY INSTRUCTION]: Return ONLY valid raw JSON conforming to the schema without markdown or commentary.`;
        try {
          rawResponse = await callAI(system, retryUser, {
            responseMimeType: 'application/json',
            responseSchema: INTELLIGENCE_RESPONSE_SCHEMA,
            temperature: 0.1,
          });
          parseResult = safeParseJSON(rawResponse);
        } catch {
          // Fall through
        }
      }

      if (parseResult.success) {
        const validated = IntelligenceResponseSchema.safeParse(parseResult.data);
        if (validated.success) {
          return validated.data;
        }

        const dataObj = parseResult.data as Record<string, unknown>;
        if (typeof dataObj?.answer === 'string') {
          return {
            answer: dataObj.answer,
            sources: [],
            relatedRequirements: [],
          };
        }
      }

      return queryProjectDemo(projectId, query, context);
    } catch {
      return queryProjectDemo(projectId, query, context);
    }
  }, { projectId, op: 'ai.query' });
}

/**
 * Deterministic demo intelligence that answers common queries and leverages project memory search.
 */
export async function queryProjectDemo(
  projectId: string,
  query: string,
  context: {
    project?: Project;
    messages?: Message[];
    requirements?: Requirement[];
    revisions?: Revision[];
    conflicts?: Conflict[];
    tasks?: Task[];
  }
): Promise<IntelligenceResponse> {
  const q = query.toLowerCase();
  const requirements = context.requirements || [];
  const tasks = context.tasks || [];
  const conflicts = context.conflicts || [];
  const revisions = context.revisions || [];

  // "What needs confirmation?"
  if (q.includes('confirm') || q.includes('unresolved') || q.includes('clarif')) {
    const unresolved = requirements.filter((r) => r.status === 'unresolved');
    const openConflicts = conflicts.filter((c) => c.status === 'open');
    const durationConflict = openConflicts.some((c) => /duration|seconds/i.test(c.description));
    const musicOpen = unresolved.some((r) => r.category === 'music' || /music/i.test(r.title));

    if (musicOpen && durationConflict) {
      return {
        answer: 'Final music and duration need confirmation.',
        sources: [...unresolved, ...openConflicts.flatMap((c) => ({ sourceMessageIds: c.sourceMessageIds, title: c.description }))].flatMap((r) =>
          ('sourceMessageIds' in r ? r.sourceMessageIds : []).map((id) => ({
            messageId: id,
            snippet: 'title' in r ? String(r.title) : '',
          }))
        ),
        relatedRequirements: unresolved.map((r) => r.id),
      };
    }

    if (unresolved.length === 0 && openConflicts.length === 0) {
      return { answer: 'All requirements are confirmed.', sources: [], relatedRequirements: [] };
    }

    const labels = [
      ...unresolved.map((r) => r.title),
      ...openConflicts.map((c) => c.description),
    ];
    return {
      answer: `${labels.length} item${labels.length > 1 ? 's' : ''} still need client confirmation: ${labels.join('; ')}.`,
      sources: unresolved.flatMap((r) => r.sourceMessageIds.map((id) => ({ messageId: id, snippet: r.title }))),
      relatedRequirements: unresolved.map((r) => r.id),
    };
  }

  // "What changed?"
  if (q.includes('change') || q.includes('revision') || q.includes('update')) {
    if (revisions.length === 0) {
      return { answer: 'No changes recorded yet.', sources: [], relatedRequirements: [] };
    }
    const descriptions = revisions.map((r) => `${r.field}: ${r.oldValue} → ${r.newValue}`);
    return {
      answer: `${revisions.length} change${revisions.length > 1 ? 's' : ''} recorded: ${descriptions.join('; ')}.`,
      sources: revisions.map((r) => ({ messageId: r.sourceMessageId, snippet: `${r.oldValue} → ${r.newValue}` })),
      relatedRequirements: revisions.filter((r) => r.requirementId).map((r) => r.requirementId!),
    };
  }

  // "What should I finish?" / "What's left?"
  if (q.includes('finish') || q.includes('todo') || q.includes('left') || q.includes('remaining') || q.includes('deadline')) {
    const todo = tasks.filter((t) => t.status === 'todo' || t.status === 'in_progress');
    if (todo.length === 0) {
      return { answer: 'All tasks are done!', sources: [], relatedRequirements: [] };
    }
    const urgent = todo.filter((t) => t.priority === 'urgent' || t.priority === 'high');
    let answer = `${todo.length} task${todo.length > 1 ? 's' : ''} remaining: ${todo.map((t) => t.title).join(', ')}.`;
    if (urgent.length > 0) {
      answer += ` Priority: ${urgent.map((t) => t.title).join(', ')}.`;
    }
    return { answer, sources: [], relatedRequirements: [] };
  }

  // "Conflicts" / "issues"
  if (q.includes('conflict') || q.includes('issue') || q.includes('problem') || q.includes('contradict')) {
    const open = conflicts.filter((c) => c.status === 'open');
    if (open.length === 0) {
      return { answer: 'No open conflicts right now.', sources: [], relatedRequirements: [] };
    }
    return {
      answer: `${open.length} open conflict${open.length > 1 ? 's' : ''}: ${open.map((c) => c.description).join('; ')}.`,
      sources: open.flatMap((c) => c.sourceMessageIds.map((id) => ({ messageId: id, snippet: c.description }))),
      relatedRequirements: open.flatMap((c) => c.requirementIds),
    };
  }

  // Try searching project memory (MongoDB Atlas or in-memory structured history)
  try {
    const memoryResult = await searchProjectMemory(projectId, query);
    if (memoryResult.sources.length > 0 || memoryResult.relatedRequirements.length > 0 || memoryResult.revisions.length > 0) {
      return {
        answer: memoryResult.answer,
        sources: memoryResult.sources,
        relatedRequirements: memoryResult.relatedRequirements,
      };
    }
  } catch (err) {
    console.warn('searchProjectMemory error:', err);
  }

  // Default summary if no specific matches
  return {
    answer: `This project has ${requirements.length} requirements, ${tasks.filter((t) => t.status !== 'done').length} open tasks, and ${conflicts.filter((c) => c.status === 'open').length} unresolved conflicts.`,
    sources: [],
    relatedRequirements: [],
  };
}
