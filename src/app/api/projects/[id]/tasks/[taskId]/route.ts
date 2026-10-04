import { NextResponse } from 'next/server';
import { updateTaskStatus } from '@/lib/store';
import { TaskStatusSchema } from '@/lib/validation/schemas';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string; taskId: string } }
) {
  try {
    const body = await request.json();
    const statusParse = TaskStatusSchema.safeParse(body.status);

    if (!statusParse.success) {
      return NextResponse.json(
        { error: 'Invalid task status' },
        { status: 400 }
      );
    }

    await updateTaskStatus(params.taskId, statusParse.data);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`PATCH /api/projects/${params.id}/tasks/${params.taskId} error:`, error);
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    );
  }
}
