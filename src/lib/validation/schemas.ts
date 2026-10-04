import { z } from 'zod';

// ============================================================
// Zod Schemas for EditFlow
// ============================================================

// ---- Enums ----
export const RequirementStatusSchema = z.enum(['confirmed', 'unresolved', 'changed', 'removed']);
export const ConflictSeveritySchema = z.enum(['low', 'medium', 'high']);
export const ConflictStatusSchema = z.enum(['open', 'resolved', 'dismissed']);
export const TaskStatusSchema = z.enum(['todo', 'in_progress', 'done', 'blocked']);
export const TaskPrioritySchema = z.enum(['low', 'medium', 'high', 'urgent']);
export const ProjectStatusSchema = z.enum(['active', 'completed', 'archived']);
export const MessageSenderSchema = z.enum(['client', 'editor']);
export const RequirementCategorySchema = z.enum([
  'deliverable', 'format', 'duration', 'aspect_ratio', 'style', 'effect',
  'footage', 'subtitle', 'music', 'color_grading', 'deadline', 'preference',
  'asset', 'approval', 'other',
]);

// ---- Message ----
export const MessageSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  sender: MessageSenderSchema,
  senderName: z.string(),
  content: z.string(),
  timestamp: z.string(),
  index: z.number().int().positive(),
});

// ---- Requirement ----
export const RequirementSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  title: z.string(),
  description: z.string(),
  value: z.string().nullable(),
  category: RequirementCategorySchema,
  status: RequirementStatusSchema,
  confidence: z.number().min(0).max(1),
  sourceMessageIds: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// ---- Revision ----
export const RevisionSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  requirementId: z.string().nullable(),
  type: z.enum(['changed', 'added', 'removed']),
  field: z.string(),
  oldValue: z.string().nullable(),
  newValue: z.string().nullable(),
  sourceMessageId: z.string(),
  timestamp: z.string(),
});

// ---- Conflict ----
export const ConflictSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  description: z.string(),
  requirementIds: z.array(z.string()),
  severity: ConflictSeveritySchema,
  status: ConflictStatusSchema,
  suggestedAction: z.string(),
  sourceMessageIds: z.array(z.string()),
  createdAt: z.string(),
  resolvedAt: z.string().nullable(),
});

// ---- Task ----
export const TaskSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  title: z.string(),
  status: TaskStatusSchema,
  priority: TaskPrioritySchema,
  sourceRequirementId: z.string().nullable(),
  deadline: z.string().nullable(),
  createdAt: z.string(),
  completedAt: z.string().nullable(),
});

// ---- Deliverable ----
export const DeliverableSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  title: z.string(),
  format: z.string().nullable(),
  duration: z.string().nullable(),
  aspectRatio: z.string().nullable(),
  sourceMessageIds: z.array(z.string()),
});

// ---- Project ----
export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Project name is required'),
  clientName: z.string().min(1, 'Client name is required'),
  description: z.string(),
  status: ProjectStatusSchema,
  deadline: z.string().nullable(),
  isDemo: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// ---- Create Project Input ----
export const CreateProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  clientName: z.string().min(1, 'Client name is required'),
  description: z.string().optional().default(''),
  deadline: z.string().nullable().optional().default(null),
});

// ---- Conversation Input ----
export const ConversationInputSchema = z.object({
  projectId: z.string(),
  rawText: z.string().min(1, 'Conversation text is required'),
});

// ---- AI Extraction (output from Gemma) ----
export const ExtractedRequirementSchema = z.object({
  title: z.string(),
  description: z.string(),
  value: z.string().nullable(),
  category: RequirementCategorySchema,
  status: RequirementStatusSchema,
  confidence: z.number().min(0).max(1),
  sourceMessageIds: z.array(z.string()),
});

export const ExtractedRevisionSchema = z.object({
  requirementId: z.string().nullable(),
  type: z.enum(['changed', 'added', 'removed']),
  field: z.string(),
  oldValue: z.string().nullable(),
  newValue: z.string().nullable(),
  sourceMessageId: z.string(),
  timestamp: z.string(),
});

export const ExtractedConflictSchema = z.object({
  description: z.string(),
  requirementIds: z.array(z.string()),
  severity: ConflictSeveritySchema,
  status: ConflictStatusSchema,
  suggestedAction: z.string(),
  sourceMessageIds: z.array(z.string()),
});

export const ExtractedDeliverableSchema = z.object({
  title: z.string(),
  format: z.string().nullable(),
  duration: z.string().nullable(),
  aspectRatio: z.string().nullable(),
  sourceMessageIds: z.array(z.string()),
});

export const ExtractedTaskSchema = z.object({
  title: z.string(),
  status: TaskStatusSchema,
  priority: TaskPrioritySchema,
  sourceRequirementId: z.string().nullable(),
  deadline: z.string().nullable(),
});

export const ExtractionResultSchema = z.object({
  requirements: z.array(ExtractedRequirementSchema),
  revisions: z.array(ExtractedRevisionSchema),
  conflicts: z.array(ExtractedConflictSchema),
  deliverables: z.array(ExtractedDeliverableSchema),
  tasks: z.array(ExtractedTaskSchema),
  deadline: z.string().nullable(),
  summary: z.string(),
});

// ---- Command query ----
export const CommandQuerySchema = z.object({
  projectId: z.string(),
  query: z.string().min(1),
});

export const IntelligenceResponseSchema = z.object({
  answer: z.string(),
  sources: z.array(z.object({
    messageId: z.string(),
    snippet: z.string(),
  })),
  relatedRequirements: z.array(z.string()),
});
