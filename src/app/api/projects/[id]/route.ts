import { NextResponse } from 'next/server';
import { getFullProject } from '@/lib/store';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const project = await getFullProject(params.id);

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error(`GET /api/projects/${params.id} error:`, error);
    return NextResponse.json(
      { error: 'Failed to load project. Please try again.' },
      { status: 500 }
    );
  }
}
