import { NextResponse } from 'next/server';
import { getProjects, createProject, getActivities, getTasks, getRequirements } from '@/lib/store';
import { CreateProjectSchema } from '@/lib/validation/schemas';

export async function GET() {
  try {
    const [projects, activities] = await Promise.all([
      getProjects(),
      getActivities(),
    ]);

    // Enrich projects with task counts and requirement status
    const enrichedProjects = await Promise.all(
      projects.map(async (project) => {
        const [tasks, requirements] = await Promise.all([
          getTasks(project.id),
          getRequirements(project.id),
        ]);
        return {
          ...project,
          tasks,
          requirementCount: requirements.length,
          unresolvedCount: requirements.filter((r) => r.status === 'unresolved').length,
        };
      })
    );

    return NextResponse.json({ projects: enrichedProjects, activities });
  } catch (error) {
    console.error('GET /api/projects error:', error);
    return NextResponse.json(
      { error: 'Failed to load projects. Please try again.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = CreateProjectSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }

    const project = await createProject(parsed.data);
    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error('POST /api/projects error:', error);
    return NextResponse.json(
      { error: 'Failed to create project. Please try again.' },
      { status: 500 }
    );
  }
}
