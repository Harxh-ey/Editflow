import { createWorkflow, createStep } from '@mastra/core/workflows';
import { z } from 'zod';
import { callAI, isAIConfigured, getGemmaModel, safeParseJSON } from '@/lib/ai/provider';
import { buildExtractionPrompt } from '@/lib/ai/prompts';
import { ExtractionResultSchema, EXTRACTION_RESPONSE_SCHEMA } from '@/lib/validation/schemas';
import { heuristicExtract } from '@/lib/intelligence/heuristic';
import { detectRevisions } from '@/lib/intelligence/revisions';
import { detectConflicts } from '@/lib/intelligence/conflicts';
import { withSpan } from '@/lib/observability/sentry';
import type { ExtractionResult, Message, Requirement } from '@/types';

export type PipelineMode = 'live' | 'demo';

export interface PipelineOutput {
  result: ExtractionResult;
  mode: PipelineMode;
  steps: string[];
}

// Schemas for Mastra workflow steps
const WorkflowInputSchema = z.object({
  messages: z.array(z.any()),
  existingRequirements: z.array(z.any()),
});

const ExtractionStepOutputSchema = z.object({
  messages: z.array(z.any()),
  existingRequirements: z.array(z.any()),
  extracted: z.any(),
  mode: z.enum(['live', 'demo']),
});

const RevisionStepOutputSchema = ExtractionStepOutputSchema;
const ConflictStepOutputSchema = ExtractionStepOutputSchema;

const StructuredProjectOutputSchema = z.object({
  result: z.any(),
  mode: z.enum(['live', 'demo']),
  steps: z.array(z.string()),
});

/**
 * Step 1: Requirement Extraction
 * Calls Gemma to extract structured requirements with source evidence, or runs deterministic heuristic in Demo Mode.
 */
const requirementExtractionStep = createStep({
  id: 'requirement-extraction',
  inputSchema: WorkflowInputSchema,
  outputSchema: ExtractionStepOutputSchema,
  execute: async ({ inputData }) => {
    const messages = inputData.messages as Message[];
    const existingRequirements = inputData.existingRequirements as Requirement[];

    return withSpan(
      'ai.extraction',
      async () => {
        if (!isAIConfigured()) {
          const demoResult = heuristicExtract(messages);
          return {
            messages,
            existingRequirements,
            extracted: demoResult,
            mode: 'demo' as const,
          };
        }

        const { system, user } = buildExtractionPrompt(messages);
        let raw = await callAI(system, user, {
          responseMimeType: 'application/json',
          responseSchema: EXTRACTION_RESPONSE_SCHEMA,
        });

        let parseResult = safeParseJSON(raw);

        // If initial parse fails, retry once with a concise JSON-only instruction rather than crashing immediately
        if (!parseResult.success) {
          console.warn('Gemma initial JSON parsing failed. Retrying once with concise JSON-only instruction...');
          const retryUser = `${user}\n\n[RETRY INSTRUCTION]: Output ONLY a single, valid JSON object conforming to the schema. Do not enclose in markdown backticks or conversational text. Begin immediately with "{" and end with "}".`;
          try {
            raw = await callAI(system, retryUser, {
              responseMimeType: 'application/json',
              responseSchema: EXTRACTION_RESPONSE_SCHEMA,
              temperature: 0.1,
            });
            parseResult = safeParseJSON(raw);
          } catch (retryError) {
            console.error('Gemma retry extraction request failed:', retryError);
          }
        }

        if (!parseResult.success) {
          throw new Error("Couldn't parse Gemma model response as JSON. Please try again.");
        }

        const validated = ExtractionResultSchema.safeParse(parseResult.data);
        if (!validated.success) {
          throw new Error("Couldn't validate extraction from Gemma. The structured output was incomplete.");
        }

        return {
          messages,
          existingRequirements,
          extracted: validated.data,
          mode: 'live' as const,
        };
      },
      {
        step: 'requirement-extraction',
        model: isAIConfigured() ? getGemmaModel() : 'deterministic-heuristic',
        workflowId: 'mastra-editflow-pipeline',
        op: 'ai.extraction',
      }
    );
  },
});

/**
 * Step 2: Revision Analysis
 * Compares sequential messages against existing requirements and tracks diffs without overwriting history.
 */
const revisionAnalysisStep = createStep({
  id: 'revision-analysis',
  inputSchema: ExtractionStepOutputSchema,
  outputSchema: RevisionStepOutputSchema,
  execute: async ({ inputData }) => {
    const { messages, existingRequirements, extracted, mode } = inputData as {
      messages: Message[];
      existingRequirements: Requirement[];
      extracted: ExtractionResult;
      mode: 'live' | 'demo';
    };

    return withSpan(
      'revision.analysis',
      async () => {
        const extraRevisions = detectRevisions(messages, existingRequirements, extracted.requirements);
        const seen = new Set(
          extracted.revisions.map((r) => `${r.field}:${r.oldValue}:${r.newValue}:${r.sourceMessageId}`)
        );

        const revisions = [...extracted.revisions];
        for (const rev of extraRevisions) {
          const key = `${rev.field}:${rev.oldValue}:${rev.newValue}:${rev.sourceMessageId}`;
          if (!seen.has(key)) {
            revisions.push(rev);
            seen.add(key);
          }
        }

        return {
          messages,
          existingRequirements,
          extracted: { ...extracted, revisions },
          mode,
        };
      },
      {
        step: 'revision-analysis',
        workflowId: 'mastra-editflow-pipeline',
        op: 'pipeline.step',
      }
    );
  },
});

/**
 * Step 3: Conflict Detection
 * Flags contradictions between messages and preserves ambiguity without auto-resolving.
 */
const conflictDetectionStep = createStep({
  id: 'conflict-detection',
  inputSchema: RevisionStepOutputSchema,
  outputSchema: ConflictStepOutputSchema,
  execute: async ({ inputData }) => {
    const { messages, existingRequirements, extracted, mode } = inputData as {
      messages: Message[];
      existingRequirements: Requirement[];
      extracted: ExtractionResult;
      mode: 'live' | 'demo';
    };

    return withSpan(
      'conflict.detection',
      async () => {
        const extraConflicts = detectConflicts(messages, extracted.requirements, extracted.revisions);
        const seen = new Set(extracted.conflicts.map((c) => c.description));

        const conflicts = [...extracted.conflicts];
        for (const c of extraConflicts) {
          if (!seen.has(c.description)) {
            conflicts.push(c);
            seen.add(c.description);
          }
        }

        return {
          messages,
          existingRequirements,
          extracted: { ...extracted, conflicts },
          mode,
        };
      },
      {
        step: 'conflict-detection',
        workflowId: 'mastra-editflow-pipeline',
        op: 'pipeline.step',
      }
    );
  },
});

/**
 * Step 4: Structured Project Output
 * Finalizes the structured workspace project with auditable evidence citations.
 */
const structuredProjectStep = createStep({
  id: 'structured-project',
  inputSchema: ConflictStepOutputSchema,
  outputSchema: StructuredProjectOutputSchema,
  execute: async ({ inputData }) => {
    const { extracted, mode } = inputData as {
      extracted: ExtractionResult;
      mode: 'live' | 'demo';
    };

    return withSpan(
      'structured.project',
      async () => {
        return {
          result: extracted,
          mode,
          steps: [
            'conversation',
            'requirement-extraction',
            'revision-analysis',
            'conflict-detection',
            'structured-project',
          ],
        };
      },
      {
        step: 'structured-project',
        workflowId: 'mastra-editflow-pipeline',
        op: 'pipeline.step',
      }
    );
  },
});

/**
 * Mastra Workflow definition for EditFlow.
 * Pipeline: Conversation → Requirement Extraction → Revision Analysis → Conflict Detection → Structured Project
 */
export const editFlowMastraWorkflow = createWorkflow({
  id: 'editflow-workflow',
  inputSchema: WorkflowInputSchema,
  outputSchema: StructuredProjectOutputSchema,
})
  .then(requirementExtractionStep)
  .then(revisionAnalysisStep)
  .then(conflictDetectionStep)
  .then(structuredProjectStep)
  .commit();

/**
 * Execute the EditFlow sequential pipeline using Mastra orchestration.
 * Falls back deterministically to heuristic extraction if Mastra execution fails or in demo mode.
 */
export async function runEditFlowWorkflow(
  messages: Message[],
  existingRequirements: Requirement[] = [],
  options?: { projectId?: string }
): Promise<PipelineOutput> {
  return withSpan(
    'conversation.submission',
    async () => {
      // If AI is not configured, we run directly via deterministic path to keep demo fast and 100% reliable
      if (!isAIConfigured()) {
        const demoResult = heuristicExtract(messages);
        const extraRevs = detectRevisions(messages, existingRequirements, demoResult.requirements);
        const seenRevs = new Set(demoResult.revisions.map((r) => `${r.field}:${r.oldValue}:${r.newValue}:${r.sourceMessageId}`));
        const revisions = [...demoResult.revisions];
        for (const r of extraRevs) {
          const k = `${r.field}:${r.oldValue}:${r.newValue}:${r.sourceMessageId}`;
          if (!seenRevs.has(k)) revisions.push(r);
        }

        const extraConfs = detectConflicts(messages, demoResult.requirements, revisions);
        const seenConfs = new Set(demoResult.conflicts.map((c) => c.description));
        const conflicts = [...demoResult.conflicts];
        for (const c of extraConfs) {
          if (!seenConfs.has(c.description)) conflicts.push(c);
        }

        return {
          result: {
            ...demoResult,
            revisions,
            conflicts,
          },
          mode: 'demo',
          steps: [
            'conversation',
            'requirement-extraction',
            'revision-analysis',
            'conflict-detection',
            'structured-project',
          ],
        };
      }

      // Run Mastra workflow orchestration for live pipeline
      try {
        const run = await editFlowMastraWorkflow.createRun();
        const output = await run.start({
          inputData: {
            messages,
            existingRequirements,
          },
        });

        if (output.status === 'success') {
          const finalStep = output.steps['structured-project'];
          if (finalStep && finalStep.status === 'success' && finalStep.output) {
            return finalStep.output as PipelineOutput;
          }
          if (output.result) {
            return output.result as PipelineOutput;
          }
        }

        if (output.status === 'failed') {
          throw new Error(output.error?.message || 'Mastra workflow failed during execution.');
        }
        throw new Error('Mastra workflow did not produce structured output.');
      } catch (workflowErr) {
        console.error('Mastra workflow execution error:', workflowErr);
        throw workflowErr;
      }
    },
    {
      projectId: options?.projectId,
      workflowId: 'mastra-editflow-pipeline',
      model: isAIConfigured() ? getGemmaModel() : 'deterministic-heuristic',
      op: 'workflow.run',
    }
  );
}
