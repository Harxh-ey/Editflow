import { getMessages, getRequirements, getRevisions, getConflicts, getProjects } from '@/lib/store';
import { getDb } from './client';
import type { Message, Requirement, Revision, Conflict } from '@/types';

export interface MemoryQueryResult {
  answer: string;
  sources: { messageId: string; snippet: string }[];
  relatedRequirements: string[];
  revisions: Revision[];
  conflicts: Conflict[];
}

export interface ClientProfileMemory {
  clientName: string;
  projectCount: number;
  projectNames: string[];
  preferredAspectRatios: string[];
  preferredFormats: string[];
  frequentDeliverables: string[];
  pastRevisionsCount: number;
  lastActive: string;
}

/**
 * Searches historical project memory (messages, requirements, revisions, conflicts).
 * If MongoDB Atlas is active and has a text index, leverages text matching;
 * otherwise runs structured keyword & semantic scanning across documents.
 */
export async function searchProjectMemory(
  projectId: string,
  query: string
): Promise<MemoryQueryResult> {
  const normalizedQuery = query.toLowerCase().trim();
  const db = await getDb();

  let messages: Message[] = [];
  let requirements: Requirement[] = [];
  let revisions: Revision[] = [];
  let conflicts: Conflict[] = [];

  if (db) {
    try {
      // Query MongoDB collections with projection and sorting
      const [msgDocs, reqDocs, revDocs, confDocs] = await Promise.all([
        db.collection<Message>('messages')
          .find({ projectId, $text: { $search: query } })
          .project<Message>({ score: { $meta: 'textScore' } })
          .sort({ score: { $meta: 'textScore' } })
          .limit(10)
          .toArray()
          .catch(() =>
            // Fallback if text index is not yet built on Atlas
            db.collection<Message>('messages')
              .find({ projectId, content: { $regex: query, $options: 'i' } })
              .limit(10)
              .toArray()
          ),
        db.collection<Requirement>('requirements')
          .find({
            projectId,
            $or: [
              { title: { $regex: query, $options: 'i' } },
              { description: { $regex: query, $options: 'i' } },
              { value: { $regex: query, $options: 'i' } },
            ],
          })
          .toArray(),
        db.collection<Revision>('revisions')
          .find({
            projectId,
            $or: [
              { field: { $regex: query, $options: 'i' } },
              { oldValue: { $regex: query, $options: 'i' } },
              { newValue: { $regex: query, $options: 'i' } },
            ],
          })
          .toArray(),
        db.collection<Conflict>('conflicts')
          .find({
            projectId,
            $or: [
              { description: { $regex: query, $options: 'i' } },
              { suggestedAction: { $regex: query, $options: 'i' } },
            ],
          })
          .toArray(),
      ]);

      messages = msgDocs;
      requirements = reqDocs;
      revisions = revDocs;
      conflicts = confDocs;
    } catch {
      // Fallback to local store
      messages = await getMessages(projectId);
      requirements = await getRequirements(projectId);
      revisions = await getRevisions(projectId);
      conflicts = await getConflicts(projectId);
    }
  } else {
    // In-memory store fallback
    messages = await getMessages(projectId);
    requirements = await getRequirements(projectId);
    revisions = await getRevisions(projectId);
    conflicts = await getConflicts(projectId);
  }

  // Filter in-memory items if not filtered by DB
  const matchingMessages = messages.filter((m) =>
    m.content.toLowerCase().includes(normalizedQuery)
  );
  const matchingReqs = requirements.filter(
    (r) =>
      r.title.toLowerCase().includes(normalizedQuery) ||
      r.description.toLowerCase().includes(normalizedQuery) ||
      (r.value && r.value.toLowerCase().includes(normalizedQuery))
  );
  const matchingRevs = revisions.filter(
    (r) =>
      r.field.toLowerCase().includes(normalizedQuery) ||
      (r.oldValue && r.oldValue.toLowerCase().includes(normalizedQuery)) ||
      (r.newValue && r.newValue.toLowerCase().includes(normalizedQuery))
  );
  const matchingConfs = conflicts.filter(
    (c) =>
      c.description.toLowerCase().includes(normalizedQuery) ||
      c.suggestedAction.toLowerCase().includes(normalizedQuery)
  );

  const sources: { messageId: string; snippet: string }[] = [];
  for (const m of matchingMessages) {
    sources.push({ messageId: m.id, snippet: m.content });
  }
  for (const r of matchingReqs) {
    for (const sid of r.sourceMessageIds) {
      if (!sources.some((s) => s.messageId === sid)) {
        sources.push({ messageId: sid, snippet: r.title });
      }
    }
  }

  let answer = '';
  if (sources.length > 0 || matchingReqs.length > 0 || matchingRevs.length > 0) {
    const parts: string[] = [];
    if (matchingReqs.length > 0) {
      parts.push(`Found ${matchingReqs.length} requirement(s): ${matchingReqs.map((r) => r.title + (r.value ? ` (${r.value})` : '')).join(', ')}.`);
    }
    if (matchingRevs.length > 0) {
      parts.push(`Recorded change(s): ${matchingRevs.map((r) => `${r.field}: ${r.oldValue} → ${r.newValue}`).join(', ')}.`);
    }
    if (matchingConfs.length > 0) {
      parts.push(`Open conflict(s): ${matchingConfs.map((c) => c.description).join('; ')}.`);
    }
    answer = parts.join(' ');
  } else {
    answer = `No direct record found for "${query}" in this project's history.`;
  }

  return {
    answer,
    sources,
    relatedRequirements: matchingReqs.map((r) => r.id),
    revisions: matchingRevs,
    conflicts: matchingConfs,
  };
}

/**
 * Aggregates client-level memory across projects.
 * Answers: "What does this client typically request or prefer?"
 */
export async function getClientMemory(clientName: string): Promise<ClientProfileMemory | null> {
  const normName = clientName.toLowerCase().trim();
  const allProjects = await getProjects();
  const clientProjects = allProjects.filter((p) => p.clientName.toLowerCase().includes(normName));

  if (clientProjects.length === 0) return null;

  const aspectRatios = new Set<string>();
  const formats = new Set<string>();
  const deliverables = new Set<string>();
  let totalRevisions = 0;
  let latestTimestamp = clientProjects[0].updatedAt;

  for (const proj of clientProjects) {
    const [reqs, revs] = await Promise.all([
      getRequirements(proj.id),
      getRevisions(proj.id),
    ]);

    totalRevisions += revs.length;

    for (const r of reqs) {
      if (r.category === 'aspect_ratio' && r.value) aspectRatios.add(r.value);
      if (r.category === 'format' && r.value) formats.add(r.value);
      if (r.category === 'deliverable') deliverables.add(r.title);
    }

    if (new Date(proj.updatedAt).getTime() > new Date(latestTimestamp).getTime()) {
      latestTimestamp = proj.updatedAt;
    }
  }

  return {
    clientName,
    projectCount: clientProjects.length,
    projectNames: clientProjects.map((p) => p.name),
    preferredAspectRatios: Array.from(aspectRatios),
    preferredFormats: Array.from(formats),
    frequentDeliverables: Array.from(deliverables),
    pastRevisionsCount: totalRevisions,
    lastActive: latestTimestamp,
  };
}
