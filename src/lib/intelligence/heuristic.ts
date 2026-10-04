import type {
  Conflict,
  Deliverable,
  ExtractionResult,
  Message,
  Requirement,
  RequirementCategory,
  RequirementStatus,
  Revision,
  Task,
  TaskPriority,
} from '@/types';

type ReqDraft = Omit<Requirement, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>;
type RevDraft = Omit<Revision, 'id' | 'projectId'>;
type ConfDraft = Omit<Conflict, 'id' | 'projectId' | 'createdAt' | 'resolvedAt'>;
type TaskDraft = Omit<Task, 'id' | 'projectId' | 'createdAt' | 'completedAt'>;
type DelDraft = Omit<Deliverable, 'id' | 'projectId'>;

function findMessage(messages: Message[], pattern: RegExp): Message | undefined {
  return messages.find((m) => pattern.test(m.content));
}

function req(partial: {
  title: string;
  description: string;
  value: string | null;
  category: RequirementCategory;
  status: RequirementStatus;
  confidence: number;
  sourceMessageIds: string[];
}): ReqDraft {
  return partial;
}

export function heuristicExtract(messages: Message[]): ExtractionResult {
  const requirements: ReqDraft[] = [];
  const revisions: RevDraft[] = [];
  const conflicts: ConfDraft[] = [];
  const tasks: TaskDraft[] = [];
  const deliverables: DelDraft[] = [];
  let deadline: string | null = null;

  const cinematic = findMessage(messages, /cinematic/i);
  if (cinematic) {
    requirements.push(req({
      title: 'Cinematic style',
      description: 'Client wants cinematic color grade and editing style',
      value: 'Cinematic',
      category: 'style',
      status: 'confirmed',
      confidence: 0.95,
      sourceMessageIds: [cinematic.id],
    }));
  }

  const clipMentions = messages
    .map((m) => {
      const match = m.content.match(/clip\s*(\d+)/i);
      return match ? { message: m, clip: match[1], instead: /instead of/i.test(m.content) } : null;
    })
    .filter((x): x is { message: Message; clip: string; instead: boolean } => Boolean(x));

  if (clipMentions.length > 0) {
    const first = clipMentions[0];
    const last = clipMentions[clipMentions.length - 1];
    const changed = first.clip !== last.clip;
    requirements.push(req({
      title: 'Opening footage',
      description: changed
        ? `Opening clip changed from Clip ${first.clip} to Clip ${last.clip}`
        : `Use clip ${last.clip} for the opening`,
      value: `Clip ${last.clip}`,
      category: 'footage',
      status: changed ? 'changed' : 'confirmed',
      confidence: 1,
      sourceMessageIds: clipMentions.map((c) => c.message.id),
    }));
    if (changed) {
      revisions.push({
        requirementId: null,
        type: 'changed',
        field: 'Opening footage',
        oldValue: `Clip ${first.clip}`,
        newValue: `Clip ${last.clip}`,
        sourceMessageId: last.message.id,
        timestamp: last.message.timestamp,
      });
    }
  }

  const ig = findMessage(messages, /instagram|reel/i);
  const aspect = findMessage(messages, /9\s*[:x]\s*16|16\s*[:x]\s*9|vertical|horizontal/i);
  if (ig || aspect) {
    const aspectValue = aspect
      ? /16\s*[:x]\s*9/i.test(aspect.content) ? '16:9' : '9:16'
      : ig ? '9:16' : null;
    requirements.push(req({
      title: ig ? 'Instagram Reel' : 'Aspect ratio',
      description: ig ? 'Deliverable is for Instagram' : 'Requested aspect ratio',
      value: aspectValue,
      category: aspectValue ? 'aspect_ratio' : 'deliverable',
      status: 'confirmed',
      confidence: 1,
      sourceMessageIds: [ig?.id, aspect?.id].filter(Boolean) as string[],
    }));
  }

  const around60 = findMessage(messages, /around\s*60|60\s*seconds|one minute/i);
  const under30 = findMessage(messages, /under\s*30|less than\s*30|30\s*seconds/i);
  if (around60 || under30) {
    const changed = Boolean(around60 && under30);
    requirements.push(req({
      title: 'Duration',
      description: changed
        ? 'Client initially asked for about 60 seconds, then asked to keep it under 30 seconds'
        : `Requested duration: ${under30 ? 'under 30 seconds' : 'around 60 seconds'}`,
      value: under30 ? 'Under 30 seconds' : 'Around 60 seconds',
      category: 'duration',
      status: changed ? 'changed' : 'confirmed',
      confidence: 0.9,
      sourceMessageIds: [around60?.id, under30?.id].filter(Boolean) as string[],
    }));
    if (changed && around60 && under30) {
      revisions.push({
        requirementId: null,
        type: 'changed',
        field: 'Duration',
        oldValue: '60 seconds',
        newValue: 'Under 30 seconds',
        sourceMessageId: under30.id,
        timestamp: under30.timestamp,
      });
      conflicts.push({
        description: 'Duration does not line up: 60 seconds vs under 30 seconds',
        requirementIds: [],
        severity: 'high',
        status: 'open',
        suggestedAction: 'Ask the client to confirm the final duration.',
        sourceMessageIds: [around60.id, under30.id],
      });
    }
  }

  const music = findMessage(messages, /music|piano|song|soundtrack/i);
  if (music) {
    const confirmed = /confirm|final|use this track|this song/i.test(music.content);
    requirements.push(req({
      title: 'Background music',
      description: music.content,
      value: /piano/i.test(music.content) ? 'Soft piano, romantic' : 'Music requested',
      category: 'music',
      status: confirmed ? 'confirmed' : 'unresolved',
      confidence: confirmed ? 0.9 : 0.7,
      sourceMessageIds: [music.id],
    }));
  }

  const subs = findMessage(messages, /subtitle|caption/i);
  if (subs) {
    requirements.push(req({
      title: 'Subtitles',
      description: subs.content,
      value: /minimal|elegant/i.test(subs.content) ? 'Minimal and elegant, vows only' : 'Subtitles required',
      category: 'subtitle',
      status: 'confirmed',
      confidence: 0.95,
      sourceMessageIds: [subs.id],
    }));
    revisions.push({
      requirementId: null,
      type: 'added',
      field: 'Subtitles',
      oldValue: null,
      newValue: requirements[requirements.length - 1].value,
      sourceMessageId: subs.id,
      timestamp: subs.timestamp,
    });
  }

  const removal = findMessage(messages, /remove|background person|bg removal/i);
  if (removal) {
    requirements.push(req({
      title: 'Background removal',
      description: removal.content,
      value: 'Remove unwanted person/object from shot',
      category: 'effect',
      status: 'confirmed',
      confidence: 0.9,
      sourceMessageIds: [removal.id],
    }));
    revisions.push({
      requirementId: null,
      type: 'added',
      field: 'Background removal',
      oldValue: null,
      newValue: 'Remove person from garden shot',
      sourceMessageId: removal.id,
      timestamp: removal.timestamp,
    });
  }

  const deadlineMsg = findMessage(messages, /tonight|today|deadline|before\s*\d|8\s*pm|asap/i);
  if (deadlineMsg) {
    const d = new Date();
    d.setHours(20, 0, 0, 0);
    deadline = d.toISOString();
    requirements.push(req({
      title: 'Deadline',
      description: deadlineMsg.content,
      value: 'Today, 8:00 PM',
      category: 'deadline',
      status: 'confirmed',
      confidence: 0.85,
      sourceMessageIds: [deadlineMsg.id],
    }));
  }

  const yt = findMessage(messages, /youtube/i);
  if (yt && !ig) {
    requirements.push(req({
      title: 'YouTube video',
      description: 'Deliverable is for YouTube',
      value: 'YouTube',
      category: 'deliverable',
      status: 'confirmed',
      confidence: 0.9,
      sourceMessageIds: [yt.id],
    }));
  }

  const color = findMessage(messages, /color.?grad|lut|teal.?orange/i);
  if (color && !cinematic) {
    requirements.push(req({
      title: 'Color grading',
      description: color.content,
      value: 'Color grade requested',
      category: 'color_grading',
      status: 'confirmed',
      confidence: 0.85,
      sourceMessageIds: [color.id],
    }));
  }

  const platformTitle = ig ? 'Instagram Reel' : yt ? 'YouTube video' : requirements.find((r) => r.category === 'deliverable')?.title;
  const durationValue = requirements.find((r) => r.category === 'duration')?.value ?? null;
  const aspectValue = requirements.find((r) => r.category === 'aspect_ratio')?.value ?? null;
  if (platformTitle || aspectValue || durationValue) {
    deliverables.push({
      title: platformTitle || 'Video',
      format: 'MP4 / H.264',
      duration: durationValue,
      aspectRatio: aspectValue,
      sourceMessageIds: messages.slice(0, 3).map((m) => m.id),
    });
  }

  const priorityFor = (r: ReqDraft): TaskPriority => {
    if (r.category === 'deadline' || r.category === 'duration') return 'urgent';
    if (r.status === 'unresolved' || r.status === 'changed') return 'high';
    if (r.category === 'style' || r.category === 'footage') return 'high';
    return 'medium';
  };

  for (const r of requirements) {
    if (r.category === 'deadline') continue;
    const title =
      r.category === 'music' && r.status === 'unresolved'
        ? 'Confirm music choice with client'
        : r.category === 'duration' && r.status === 'changed'
          ? 'Confirm duration with client'
          : r.title.startsWith('Add') || r.title.startsWith('Use') || r.title.startsWith('Export')
            ? r.title
            : r.category === 'subtitle'
              ? 'Add subtitles'
              : r.category === 'effect'
                ? 'Fix background person'
                : r.category === 'style'
                  ? 'Color grade'
                  : r.category === 'footage'
                    ? `Use ${r.value || 'requested footage'}`
                    : r.category === 'aspect_ratio' || r.category === 'deliverable'
                      ? 'Export final'
                      : r.title;
    tasks.push({
      title,
      status: 'todo',
      priority: priorityFor(r),
      sourceRequirementId: null,
      deadline,
    });
  }

  if (tasks.length > 0 && !tasks.some((t) => /export/i.test(t.title))) {
    tasks.push({
      title: 'Export final',
      status: 'todo',
      priority: deadline ? 'urgent' : 'medium',
      sourceRequirementId: null,
      deadline,
    });
  }

  const summaryParts = [
    `${requirements.length} requirement${requirements.length === 1 ? '' : 's'}`,
    revisions.filter((r) => r.type === 'changed').length
      ? `${revisions.filter((r) => r.type === 'changed').length} change${revisions.filter((r) => r.type === 'changed').length === 1 ? '' : 's'}`
      : null,
    conflicts.length ? `${conflicts.length} item${conflicts.length === 1 ? '' : 's'} that don't line up` : null,
  ].filter(Boolean);

  return {
    requirements,
    revisions,
    conflicts,
    deliverables,
    tasks,
    deadline,
    summary: summaryParts.join(', ') || 'No requirements found in this conversation.',
  };
}

export function looksLikeWeddingDemo(text: string): boolean {
  const t = text.toLowerCase();
  return t.includes('cinematic') && t.includes('clip 12') && t.includes('clip 18');
}
