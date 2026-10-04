import { NextResponse } from 'next/server';
import { getAllRevisions } from '@/lib/store';

export async function GET() {
  try {
    const revisions = await getAllRevisions();
    return NextResponse.json({ revisions });
  } catch {
    return NextResponse.json({ error: 'Failed to load revisions.' }, { status: 500 });
  }
}
