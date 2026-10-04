import { NextResponse } from 'next/server';
import { queryProject } from '@/lib/ai/intelligence';
import { getFullProject } from '@/lib/store';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const query = body.query;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Please enter a question.' },
        { status: 400 }
      );
    }

    const projectData = await getFullProject(params.id);
    if (!projectData) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    const response = await queryProject(params.id, query, {
      project: projectData,
      messages: projectData.messages,
      requirements: projectData.requirements,
      revisions: projectData.revisions,
      conflicts: projectData.conflicts,
      tasks: projectData.tasks,
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error(`POST /api/projects/${params.id}/intelligence error:`, error);
    return NextResponse.json(
      { error: 'Couldn\'t process your question. Please try again.' },
      { status: 500 }
    );
  }
}
