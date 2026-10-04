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

// Google Generative Language API OpenAPI/JSON response schema for Gemma structured extraction
export const EXTRACTION_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    requirements: {
      type: 'ARRAY',
      description: 'Extracted project requirements with source evidence',
      items: {
        type: 'OBJECT',
        properties: {
          title: { type: 'STRING' },
          description: { type: 'STRING' },
          value: { type: 'STRING', nullable: true },
          category: {
            type: 'STRING',
            enum: [
              'deliverable', 'format', 'duration', 'aspect_ratio', 'style', 'effect',
              'footage', 'subtitle', 'music', 'color_grading', 'deadline', 'preference',
              'asset', 'approval', 'other',
            ],
          },
          status: {
            type: 'STRING',
            enum: ['confirmed', 'unresolved', 'changed', 'removed'],
          },
          confidence: { type: 'NUMBER' },
          sourceMessageIds: {
            type: 'ARRAY',
            items: { type: 'STRING' },
          },
        },
        required: ['title', 'description', 'category', 'status', 'confidence', 'sourceMessageIds'],
      },
    },
    revisions: {
      type: 'ARRAY',
      description: 'Changes and modifications between messages',
      items: {
        type: 'OBJECT',
        properties: {
          requirementId: { type: 'STRING', nullable: true },
          type: { type: 'STRING', enum: ['changed', 'added', 'removed'] },
          field: { type: 'STRING' },
          oldValue: { type: 'STRING', nullable: true },
          newValue: { type: 'STRING', nullable: true },
          sourceMessageId: { type: 'STRING' },
          timestamp: { type: 'STRING' },
        },
        required: ['type', 'field', 'sourceMessageId'],
      },
    },
    conflicts: {
      type: 'ARRAY',
      description: 'Unresolved contradictions between client instructions',
      items: {
        type: 'OBJECT',
        properties: {
          description: { type: 'STRING' },
          requirementIds: {
            type: 'ARRAY',
            items: { type: 'STRING' },
          },
          severity: { type: 'STRING', enum: ['low', 'medium', 'high'] },
          status: { type: 'STRING', enum: ['open', 'resolved', 'dismissed'] },
          suggestedAction: { type: 'STRING' },
          sourceMessageIds: {
            type: 'ARRAY',
            items: { type: 'STRING' },
          },
        },
        required: ['description', 'requirementIds', 'severity', 'status', 'suggestedAction', 'sourceMessageIds'],
      },
    },
    deliverables: {
      type: 'ARRAY',
      description: 'Project deliverables with aspect ratio and duration specifications',
      items: {
        type: 'OBJECT',
        properties: {
          title: { type: 'STRING' },
          format: { type: 'STRING', nullable: true },
          duration: { type: 'STRING', nullable: true },
          aspectRatio: { type: 'STRING', nullable: true },
          sourceMessageIds: {
            type: 'ARRAY',
            items: { type: 'STRING' },
          },
        },
        required: ['title', 'sourceMessageIds'],
      },
    },
    tasks: {
      type: 'ARRAY',
      description: 'Actionable video editing checklist items',
      items: {
        type: 'OBJECT',
        properties: {
          title: { type: 'STRING' },
          status: { type: 'STRING', enum: ['todo', 'in_progress', 'done', 'blocked'] },
          priority: { type: 'STRING', enum: ['low', 'medium', 'high', 'urgent'] },
          sourceRequirementId: { type: 'STRING', nullable: true },
          deadline: { type: 'STRING', nullable: true },
        },
        required: ['title', 'status', 'priority'],
      },
    },
    deadline: { type: 'STRING', nullable: true },
    summary: { type: 'STRING' },
  },
  required: ['requirements', 'revisions', 'conflicts', 'deliverables', 'tasks', 'summary'],
};

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

// Google Generative Language API response schema for Command Bar Intelligence queries
export const INTELLIGENCE_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    answer: { type: 'STRING' },
    sources: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          messageId: { type: 'STRING' },
          snippet: { type: 'STRING' },
        },
        required: ['messageId', 'snippet'],
      },
    },
    relatedRequirements: {
      type: 'ARRAY',
      items: { type: 'STRING' },
    },
  },
  required: ['answer', 'sources', 'relatedRequirements'],
};
