import type { Project, Message, Requirement, Revision, Conflict, Task, Deliverable, Activity } from '@/types';

// ============================================================
// Demo: Wedding Reel — Rahul Sharma
// ============================================================

const PROJECT_ID = 'demo_wedding_reel';
const now = new Date();
const today = now.toISOString().split('T')[0];

function hoursAgo(h: number): string {
  return new Date(now.getTime() - h * 60 * 60 * 1000).toISOString();
}

function minutesAgo(m: number): string {
  return new Date(now.getTime() - m * 60 * 1000).toISOString();
}

// ---- Project ----
export function getDemoProject(): Project {
  return {
    id: PROJECT_ID,
    name: 'Wedding Reel',
    clientName: 'Rahul Sharma',
    description: 'Instagram wedding highlight reel with cinematic editing',
    status: 'active',
    deadline: `${today}T20:00:00.000Z`,
    isDemo: true,
    createdAt: hoursAgo(8),
    updatedAt: minutesAgo(4),
  };
}

// ---- Messages (the messy conversation) ----
export function getDemoMessages(): Message[] {
  return [
    {
      id: 'msg_1',
      projectId: PROJECT_ID,
      sender: 'client',
      senderName: 'Rahul',
      content: 'Bro make this cinematic. Like really cinematic vibes.',
      timestamp: hoursAgo(7),
      index: 1,
    },
    {
      id: 'msg_2',
      projectId: PROJECT_ID,
      sender: 'client',
      senderName: 'Rahul',
      content: 'Use clip 12 for the opening. That one where she walks in.',
      timestamp: hoursAgo(6.5),
      index: 2,
    },
    {
      id: 'msg_3',
      projectId: PROJECT_ID,
      sender: 'client',
      senderName: 'Rahul',
      content: 'Need it for Instagram, 9:16.',
      timestamp: hoursAgo(6),
      index: 3,
    },
    {
      id: 'msg_4',
      projectId: PROJECT_ID,
      sender: 'client',
      senderName: 'Rahul',
      content: 'Can you keep it around 60 seconds?',
      timestamp: hoursAgo(5.5),
      index: 4,
    },
    {
      id: 'msg_5',
      projectId: PROJECT_ID,
      sender: 'client',
      senderName: 'Rahul',
      content: 'I was thinking some soft piano music in the background. Maybe something romantic.',
      timestamp: hoursAgo(5),
      index: 5,
    },
    {
      id: 'msg_6',
      projectId: PROJECT_ID,
      sender: 'client',
      senderName: 'Rahul',
      content: 'Actually keep it under 30 seconds. Instagram reels work better short.',
      timestamp: hoursAgo(3),
      index: 6,
    },
    {
      id: 'msg_7',
      projectId: PROJECT_ID,
      sender: 'client',
      senderName: 'Rahul',
      content: 'Use clip 18 instead of 12. That angle is way better.',
      timestamp: hoursAgo(2.5),
      index: 7,
    },
    {
      id: 'msg_8',
      projectId: PROJECT_ID,
      sender: 'client',
      senderName: 'Rahul',
      content: 'Add subtitles for the vows part. Keep them minimal and elegant.',
      timestamp: hoursAgo(2),
      index: 8,
    },
    {
      id: 'msg_9',
      projectId: PROJECT_ID,
      sender: 'client',
      senderName: 'Rahul',
      content: 'Can you remove that person in the background of the garden shot? It looks weird.',
      timestamp: hoursAgo(1.5),
      index: 9,
    },
    {
      id: 'msg_10',
      projectId: PROJECT_ID,
      sender: 'client',
      senderName: 'Rahul',
      content: 'Need the final tonight btw. Like before 8pm.',
      timestamp: hoursAgo(1),
      index: 10,
    },
  ];
}

// ---- Requirements ----
export function getDemoRequirements(): Requirement[] {
  return [
    {
      id: 'req_1',
      projectId: PROJECT_ID,
      title: 'Cinematic style',
      description: 'Client wants cinematic vibes throughout the reel',
      value: 'Cinematic color grade and editing style',
      category: 'style',
      status: 'confirmed',
      confidence: 0.95,
      sourceMessageIds: ['msg_1'],
      createdAt: hoursAgo(7),
      updatedAt: hoursAgo(7),
    },
    {
      id: 'req_2',
      projectId: PROJECT_ID,
      title: 'Opening footage',
      description: 'Bride entrance footage for the opening',
      value: 'Clip 18 (bride walking in)',
      category: 'footage',
      status: 'changed',
      confidence: 1.0,
      sourceMessageIds: ['msg_2', 'msg_7'],
      createdAt: hoursAgo(6.5),
      updatedAt: hoursAgo(2.5),
    },
    {
      id: 'req_3',
      projectId: PROJECT_ID,
      title: 'Instagram Reel',
      description: 'Deliverable is for Instagram in vertical format',
      value: '9:16',
      category: 'aspect_ratio',
      status: 'confirmed',
      confidence: 1.0,
      sourceMessageIds: ['msg_3'],
      createdAt: hoursAgo(6),
      updatedAt: hoursAgo(6),
    },
    {
      id: 'req_4',
      projectId: PROJECT_ID,
      title: 'Duration',
      description: 'Client initially requested 60 seconds, then changed to under 30 seconds',
      value: 'Under 30 seconds',
      category: 'duration',
      status: 'changed',
      confidence: 0.9,
      sourceMessageIds: ['msg_4', 'msg_6'],
      createdAt: hoursAgo(5.5),
      updatedAt: hoursAgo(3),
    },
    {
      id: 'req_5',
      projectId: PROJECT_ID,
      title: 'Background music',
      description: 'Client mentioned soft piano, romantic mood — not yet confirmed',
      value: 'Soft piano, romantic',
      category: 'music',
      status: 'unresolved',
      confidence: 0.7,
      sourceMessageIds: ['msg_5'],
      createdAt: hoursAgo(5),
      updatedAt: hoursAgo(5),
    },
    {
      id: 'req_6',
      projectId: PROJECT_ID,
      title: 'Subtitles',
      description: 'Add minimal, elegant subtitles for the vows section',
      value: 'Minimal and elegant, vows only',
      category: 'subtitle',
      status: 'confirmed',
      confidence: 0.95,
      sourceMessageIds: ['msg_8'],
      createdAt: hoursAgo(2),
      updatedAt: hoursAgo(2),
    },
    {
      id: 'req_7',
      projectId: PROJECT_ID,
      title: 'Background removal',
      description: 'Remove a person visible in the garden shot background',
      value: 'Remove person from garden shot',
      category: 'effect',
      status: 'confirmed',
      confidence: 0.9,
      sourceMessageIds: ['msg_9'],
      createdAt: hoursAgo(1.5),
      updatedAt: hoursAgo(1.5),
    },
    {
      id: 'req_8',
      projectId: PROJECT_ID,
      title: 'Deadline',
      description: 'Final delivery needed tonight before 8 PM',
      value: 'Today, 8:00 PM',
      category: 'deadline',
      status: 'confirmed',
      confidence: 1.0,
      sourceMessageIds: ['msg_10'],
      createdAt: hoursAgo(1),
      updatedAt: hoursAgo(1),
    },
  ];
}

// ---- Revisions ----
export function getDemoRevisions(): Revision[] {
  return [
    {
      id: 'rev_1',
      projectId: PROJECT_ID,
      requirementId: 'req_2',
      type: 'changed',
      field: 'Opening footage',
      oldValue: 'Clip 12',
      newValue: 'Clip 18',
      sourceMessageId: 'msg_7',
      timestamp: hoursAgo(2.5),
    },
    {
      id: 'rev_2',
      projectId: PROJECT_ID,
      requirementId: 'req_4',
      type: 'changed',
      field: 'Duration',
      oldValue: '60 seconds',
      newValue: 'Under 30 seconds',
      sourceMessageId: 'msg_6',
      timestamp: hoursAgo(3),
    },
    {
      id: 'rev_3',
      projectId: PROJECT_ID,
      requirementId: 'req_6',
      type: 'added',
      field: 'Subtitles',
      oldValue: null,
      newValue: 'Minimal and elegant subtitles for vows',
      sourceMessageId: 'msg_8',
      timestamp: hoursAgo(2),
    },
    {
      id: 'rev_4',
      projectId: PROJECT_ID,
      requirementId: 'req_7',
      type: 'added',
      field: 'Background removal',
      oldValue: null,
      newValue: 'Remove person from garden shot',
      sourceMessageId: 'msg_9',
      timestamp: hoursAgo(1.5),
    },
  ];
}

// ---- Conflicts ----
export function getDemoConflicts(): Conflict[] {
  return [
    {
      id: 'conf_1',
      projectId: PROJECT_ID,
      description: 'Duration changed from 60 seconds to under 30 seconds',
      requirementIds: ['req_4'],
      severity: 'high',
      status: 'open',
      suggestedAction: 'Ask Rahul to confirm the final duration. 30 seconds is very different from 60 — the entire edit structure changes.',
      sourceMessageIds: ['msg_4', 'msg_6'],
      createdAt: hoursAgo(3),
      resolvedAt: null,
    },
  ];
}

// ---- Tasks ----
export function getDemoTasks(): Task[] {
  return [
    {
      id: 'task_1',
      projectId: PROJECT_ID,
      title: 'Apply cinematic color grade',
      status: 'todo',
      priority: 'high',
      sourceRequirementId: 'req_1',
      deadline: `${today}T20:00:00.000Z`,
      createdAt: hoursAgo(7),
      completedAt: null,
    },
    {
      id: 'task_2',
      projectId: PROJECT_ID,
      title: 'Replace clip 12 with clip 18 in opening',
      status: 'todo',
      priority: 'high',
      sourceRequirementId: 'req_2',
      deadline: `${today}T20:00:00.000Z`,
      createdAt: hoursAgo(2.5),
      completedAt: null,
    },
    {
      id: 'task_3',
      projectId: PROJECT_ID,
      title: 'Export in 9:16 for Instagram',
      status: 'todo',
      priority: 'medium',
      sourceRequirementId: 'req_3',
      deadline: `${today}T20:00:00.000Z`,
      createdAt: hoursAgo(6),
      completedAt: null,
    },
    {
      id: 'task_4',
      projectId: PROJECT_ID,
      title: 'Trim to under 30 seconds',
      status: 'todo',
      priority: 'urgent',
      sourceRequirementId: 'req_4',
      deadline: `${today}T20:00:00.000Z`,
      createdAt: hoursAgo(3),
      completedAt: null,
    },
    {
      id: 'task_5',
      projectId: PROJECT_ID,
      title: 'Confirm music choice with client',
      status: 'todo',
      priority: 'high',
      sourceRequirementId: 'req_5',
      deadline: null,
      createdAt: hoursAgo(5),
      completedAt: null,
    },
    {
      id: 'task_6',
      projectId: PROJECT_ID,
      title: 'Add subtitles to vows section',
      status: 'todo',
      priority: 'medium',
      sourceRequirementId: 'req_6',
      deadline: `${today}T20:00:00.000Z`,
      createdAt: hoursAgo(2),
      completedAt: null,
    },
    {
      id: 'task_7',
      projectId: PROJECT_ID,
      title: 'Remove person from garden shot',
      status: 'todo',
      priority: 'medium',
      sourceRequirementId: 'req_7',
      deadline: `${today}T20:00:00.000Z`,
      createdAt: hoursAgo(1.5),
      completedAt: null,
    },
    {
      id: 'task_8',
      projectId: PROJECT_ID,
      title: 'Final review and export',
      status: 'todo',
      priority: 'urgent',
      sourceRequirementId: null,
      deadline: `${today}T20:00:00.000Z`,
      createdAt: hoursAgo(1),
      completedAt: null,
    },
    {
      id: 'task_9',
      projectId: PROJECT_ID,
      title: 'Confirm duration with client',
      status: 'todo',
      priority: 'urgent',
      sourceRequirementId: 'req_4',
      deadline: null,
      createdAt: hoursAgo(3),
      completedAt: null,
    },
  ];
}

// ---- Deliverables ----
export function getDemoDeliverables(): Deliverable[] {
  return [
    {
      id: 'del_1',
      projectId: PROJECT_ID,
      title: 'Instagram Reel',
      format: 'MP4 / H.264',
      duration: 'Under 30 seconds',
      aspectRatio: '9:16',
      sourceMessageIds: ['msg_3', 'msg_6'],
    },
  ];
}

// ---- Activities ----
export function getDemoActivities(): Activity[] {
  return [
    {
      id: 'act_1',
      projectId: PROJECT_ID,
      type: 'project_created',
      description: 'Wedding Reel project created',
      timestamp: hoursAgo(8),
    },
    {
      id: 'act_2',
      projectId: PROJECT_ID,
      type: 'requirement_added',
      description: '8 requirements extracted from conversation',
      timestamp: hoursAgo(7),
    },
    {
      id: 'act_3',
      projectId: PROJECT_ID,
      type: 'revision_detected',
      description: 'Client changed duration: 60 seconds → Under 30 seconds',
      timestamp: hoursAgo(3),
    },
    {
      id: 'act_4',
      projectId: PROJECT_ID,
      type: 'conflict_detected',
      description: 'Duration conflict — 60 seconds vs under 30 seconds',
      timestamp: hoursAgo(3),
    },
    {
      id: 'act_5',
      projectId: PROJECT_ID,
      type: 'revision_detected',
      description: 'Client changed opening: Clip 12 → Clip 18',
      timestamp: hoursAgo(2.5),
    },
    {
      id: 'act_6',
      projectId: PROJECT_ID,
      type: 'requirement_added',
      description: 'Subtitles requirement added',
      timestamp: hoursAgo(2),
    },
    {
      id: 'act_7',
      projectId: PROJECT_ID,
      type: 'requirement_added',
      description: 'Background removal requirement added',
      timestamp: hoursAgo(1.5),
    },
    {
      id: 'act_8',
      projectId: PROJECT_ID,
      type: 'status_changed',
      description: 'Deadline set: Today, 8:00 PM',
      timestamp: hoursAgo(1),
    },
  ];
}

export function getAllDemoData() {
  return {
    project: getDemoProject(),
    messages: getDemoMessages(),
    requirements: getDemoRequirements(),
    revisions: getDemoRevisions(),
    conflicts: getDemoConflicts(),
    tasks: getDemoTasks(),
    deliverables: getDemoDeliverables(),
    activities: getDemoActivities(),
  };
}

const SECONDARY_ID = 'demo_youtube_review';

export function getSecondaryDemoBundle() {
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const deadline = tomorrow.toISOString();
  const project: Project = {
    id: SECONDARY_ID,
    name: 'YouTube Tech Review',
    clientName: 'Aman',
    description: 'Product review cutdowns for YouTube',
    status: 'active',
    deadline,
    isDemo: true,
    createdAt: hoursAgo(30),
    updatedAt: hoursAgo(6),
  };

  const messages: Message[] = [
    {
      id: 'yt_msg_1',
      projectId: SECONDARY_ID,
      sender: 'client',
      senderName: 'Aman',
      content: 'Keep the unboxing tight. First 10 seconds should hook.',
      timestamp: hoursAgo(28),
      index: 1,
    },
    {
      id: 'yt_msg_2',
      projectId: SECONDARY_ID,
      sender: 'client',
      senderName: 'Aman',
      content: '16:9 YouTube, around 8 minutes.',
      timestamp: hoursAgo(26),
      index: 2,
    },
    {
      id: 'yt_msg_3',
      projectId: SECONDARY_ID,
      sender: 'client',
      senderName: 'Aman',
      content: 'Add lower thirds for the spec callouts.',
      timestamp: hoursAgo(20),
      index: 3,
    },
  ];

  const requirements: Requirement[] = [
    {
      id: 'yt_req_1',
      projectId: SECONDARY_ID,
      title: 'YouTube review',
      description: 'Horizontal YouTube product review',
      value: '16:9',
      category: 'aspect_ratio',
      status: 'confirmed',
      confidence: 1,
      sourceMessageIds: ['yt_msg_2'],
      createdAt: hoursAgo(26),
      updatedAt: hoursAgo(26),
    },
    {
      id: 'yt_req_2',
      projectId: SECONDARY_ID,
      title: 'Duration',
      description: 'Around 8 minutes',
      value: 'Around 8 minutes',
      category: 'duration',
      status: 'confirmed',
      confidence: 0.9,
      sourceMessageIds: ['yt_msg_2'],
      createdAt: hoursAgo(26),
      updatedAt: hoursAgo(26),
    },
    {
      id: 'yt_req_3',
      projectId: SECONDARY_ID,
      title: 'Lower thirds',
      description: 'Spec callouts need lower thirds',
      value: 'Lower thirds for specs',
      category: 'effect',
      status: 'unresolved',
      confidence: 0.75,
      sourceMessageIds: ['yt_msg_3'],
      createdAt: hoursAgo(20),
      updatedAt: hoursAgo(20),
    },
  ];

  const revisions: Revision[] = [];
  const conflicts: Conflict[] = [];
  const tasks: Task[] = [
    {
      id: 'yt_task_1',
      projectId: SECONDARY_ID,
      title: 'Cut a 10-second hook',
      status: 'done',
      priority: 'high',
      sourceRequirementId: 'yt_req_1',
      deadline,
      createdAt: hoursAgo(28),
      completedAt: hoursAgo(10),
    },
    {
      id: 'yt_task_2',
      projectId: SECONDARY_ID,
      title: 'Assemble 8-minute review cut',
      status: 'in_progress',
      priority: 'high',
      sourceRequirementId: 'yt_req_2',
      deadline,
      createdAt: hoursAgo(26),
      completedAt: null,
    },
    {
      id: 'yt_task_3',
      projectId: SECONDARY_ID,
      title: 'Confirm lower-third style',
      status: 'todo',
      priority: 'medium',
      sourceRequirementId: 'yt_req_3',
      deadline: null,
      createdAt: hoursAgo(20),
      completedAt: null,
    },
    {
      id: 'yt_task_4',
      projectId: SECONDARY_ID,
      title: 'Export YouTube master',
      status: 'todo',
      priority: 'medium',
      sourceRequirementId: 'yt_req_1',
      deadline,
      createdAt: hoursAgo(20),
      completedAt: null,
    },
    {
      id: 'yt_task_5',
      projectId: SECONDARY_ID,
      title: 'Color pass on product shots',
      status: 'done',
      priority: 'medium',
      sourceRequirementId: null,
      deadline,
      createdAt: hoursAgo(18),
      completedAt: hoursAgo(8),
    },
    {
      id: 'yt_task_6',
      projectId: SECONDARY_ID,
      title: 'Clean up room tone',
      status: 'todo',
      priority: 'low',
      sourceRequirementId: null,
      deadline,
      createdAt: hoursAgo(16),
      completedAt: null,
    },
    {
      id: 'yt_task_7',
      projectId: SECONDARY_ID,
      title: 'Add end-screen chapters',
      status: 'todo',
      priority: 'low',
      sourceRequirementId: 'yt_req_1',
      deadline,
      createdAt: hoursAgo(14),
      completedAt: null,
    },
    {
      id: 'yt_task_8',
      projectId: SECONDARY_ID,
      title: 'Thumbnail stills',
      status: 'in_progress',
      priority: 'medium',
      sourceRequirementId: null,
      deadline,
      createdAt: hoursAgo(12),
      completedAt: null,
    },
    {
      id: 'yt_task_9',
      projectId: SECONDARY_ID,
      title: 'Client review link',
      status: 'todo',
      priority: 'high',
      sourceRequirementId: null,
      deadline,
      createdAt: hoursAgo(6),
      completedAt: null,
    },
  ];

  const deliverables: Deliverable[] = [
    {
      id: 'yt_del_1',
      projectId: SECONDARY_ID,
      title: 'YouTube Tech Review',
      format: 'MP4 / H.264',
      duration: 'Around 8 minutes',
      aspectRatio: '16:9',
      sourceMessageIds: ['yt_msg_2'],
    },
  ];

  const activities: Activity[] = [
    {
      id: 'yt_act_1',
      projectId: SECONDARY_ID,
      type: 'status_changed',
      description: 'Draft V2 marked as delivered',
      timestamp: hoursAgo(10),
    },
    {
      id: 'yt_act_2',
      projectId: SECONDARY_ID,
      type: 'requirement_added',
      description: '3 new requirements extracted',
      timestamp: hoursAgo(20),
    },
  ];

  return { project, messages, requirements, revisions, conflicts, tasks, deliverables, activities };
}
