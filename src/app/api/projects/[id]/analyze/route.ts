import { NextResponse } from 'next/server';
import { parseRawConversation, extractFromConversation } from '@/lib/ai/extraction';
import { withSpan } from '@/lib/observability/sentry';
import {
  getProject,
  getMessages,
  getRequirements,
  addMessages,
  addRequirements,
  addRevisions,
  addConflicts,
  addTasks,
  addDeliverables,
  updateProject,
  addActivity,
} from '@/lib/store';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    return await withSpan(
      'conversation.submission',
      async () => {
        const project = await getProject(params.id);
        if (!project) {
          return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        const body = await request.json();
        const rawText = body.rawText;

        if (!rawText || typeof rawText !== 'string' || rawText.trim().length === 0) {
          return NextResponse.json(
            { error: 'Please paste a conversation to analyze.' },
            { status: 400 }
          );
        }

        const existingMessages = await getMessages(params.id);
        const parsed = parseRawConversation(rawText, params.id);
        if (parsed.length === 0) {
          return NextResponse.json(
            { error: 'No messages found in the conversation. Check the format and try again.' },
            { status: 400 }
          );
        }

        const startIndex = existingMessages.length;
        const messages = parsed.map((m, i) => ({
          ...m,
          id: `msg_${startIndex + i + 1}`,
          index: startIndex + i + 1,
        }));

        await addMessages(params.id, messages);
        const allMessages = [...existingMessages, ...messages];
        const existingRequirements = await getRequirements(params.id);

        const extraction = await extractFromConversation(
          existingMessages.length === 0 ? allMessages : messages,
          existingRequirements,
          { projectId: params.id }
        );

        if ('error' in extraction) {
          return NextResponse.json(
            { error: extraction.error },
            { status: 422 }
          );
        }

        const { result, mode } = extraction;

        await withSpan(
          'database.persistence',
          async () => {
        await addRequirements(params.id, result.requirements);
        await addRevisions(params.id, result.revisions);
        await addConflicts(params.id, result.conflicts);
        await addTasks(params.id, result.tasks);
        await addDeliverables(params.id, result.deliverables);
        if (result.deadline) {
          await updateProject(params.id, { deadline: result.deadline });
        }
        await addActivity(
          params.id,
          'requirement_added',
          `${result.requirements.length} requirements extracted`
        );
        if (result.revisions.some((r) => r.type === 'changed')) {
          const change = result.revisions.find((r) => r.type === 'changed');
          await addActivity(
            params.id,
            'revision_detected',
            change
              ? `Client changed ${change.field.toLowerCase()}`
              : 'Client changed a requirement'
          );
        }
        if (result.conflicts.length > 0) {
          await addActivity(params.id, 'conflict_detected', "Something doesn't line up");
        }
      });

      return NextResponse.json({
        success: true,
        demoMode: mode === 'demo',
        messageCount: messages.length,
        requirementCount: result.requirements.length,
        revisionCount: result.revisions.length,
        conflictCount: result.conflicts.length,
        taskCount: result.tasks.length,
        message:
          mode === 'demo'
            ? `${result.requirements.length} requirements extracted. Running in demo mode — no live model call was made.`
            : `${result.requirements.length} requirements added.`,
      });
    });
  } catch (error) {
    console.error(`POST /api/projects/${params.id}/analyze error:`, error);
    return NextResponse.json(
      { error: "Couldn't analyze this conversation. Check your AI configuration and try again." },
      { status: 500 }
    );
  }
}
