import { NextResponse } from 'next/server';
import { getAllTasks } from '@/lib/store';

export async function GET() {
  try {
    const tasks = await getAllTasks();
    return NextResponse.json({ tasks });
  } catch {
    return NextResponse.json({ error: 'Failed to load tasks.' }, { status: 500 });
  }
}
