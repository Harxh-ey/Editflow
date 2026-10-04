// ============================================================
// EditFlow Core Domain Types
// ============================================================

export type RequirementStatus = 'confirmed' | 'unresolved' | 'changed' | 'removed';
export type ConflictSeverity = 'low' | 'medium' | 'high';
export type ConflictStatus = 'open' | 'resolved' | 'dismissed';
export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'blocked';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type ProjectStatus = 'active' | 'completed' | 'archived';
export type MessageSender = 'client' | 'editor';

// ---- Message ----
export interface Message {
  id: string;
  projectId: string;
  sender: MessageSender;
  senderName: string;
  content: string;
  timestamp: string;
  index: number; // 1-based display index
}

// ---- Requirement ----
export interface Requirement {
  id: string;
  projectId: string;
  title: string;
  description: string;
  value: string | null;
  category: RequirementCategory;
  status: RequirementStatus;
  confidence: number; // 0.0 – 1.0
  sourceMessageIds: string[];
  createdAt: string;
  updatedAt: string;
}

export type RequirementCategory =
  | 'deliverable'
  | 'format'
  | 'duration'
  | 'aspect_ratio'
  | 'style'
  | 'effect'
  | 'footage'
  | 'subtitle'
  | 'music'
  | 'color_grading'
  | 'deadline'
  | 'preference'
  | 'asset'
  | 'approval'
  | 'other';

// ---- Revision ----
export interface Revision {
  id: string;
  projectId: string;
  requirementId: string | null;
  type: 'changed' | 'added' | 'removed';
  field: string;
  oldValue: string | null;
  newValue: string | null;
  sourceMessageId: string;
  timestamp: string;
}

// ---- Conflict ----
export interface Conflict {
  id: string;
  projectId: string;
  description: string;
  requirementIds: string[];
  severity: ConflictSeverity;
  status: ConflictStatus;
  suggestedAction: string;
  sourceMessageIds: string[];
  createdAt: string;
  resolvedAt: string | null;
}

// ---- Task ----
export interface Task {
  id: string;
  projectId: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  sourceRequirementId: string | null;
  deadline: string | null;
  createdAt: string;
  completedAt: string | null;
}

// ---- Deliverable ----
export interface Deliverable {
  id: string;
  projectId: string;
  title: string;
  format: string | null;
  duration: string | null;
  aspectRatio: string | null;
  sourceMessageIds: string[];
}

// ---- Project ----
export interface Project {
  id: string;
  name: string;
  clientName: string;
  description: string;
  status: ProjectStatus;
  deadline: string | null;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
  // Computed / populated
  messages?: Message[];
  requirements?: Requirement[];
  revisions?: Revision[];
  conflicts?: Conflict[];
  tasks?: Task[];
  deliverables?: Deliverable[];
}

// ---- Activity ----
export interface Activity {
  id: string;
  projectId: string;
  type: 'requirement_added' | 'revision_detected' | 'conflict_detected' | 'task_created' | 'status_changed' | 'project_created';
  description: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

// ---- AI Extraction Result ----
export interface ExtractionResult {
  requirements: Omit<Requirement, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>[];
  revisions: Omit<Revision, 'id' | 'projectId'>[];
  conflicts: Omit<Conflict, 'id' | 'projectId' | 'createdAt' | 'resolvedAt'>[];
  deliverables: Omit<Deliverable, 'id' | 'projectId'>[];
  tasks: Omit<Task, 'id' | 'projectId' | 'createdAt' | 'completedAt'>[];
  deadline: string | null;
  summary: string;
}

// ---- Command Bar Query Result ----
export interface IntelligenceResponse {
  answer: string;
  sources: { messageId: string; snippet: string }[];
  relatedRequirements: string[];
}
