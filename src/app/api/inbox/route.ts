import { NextResponse } from 'next/server';
import { getAllMessages } from '@/lib/store';

export async function GET() {
  try {
    const messages = await getAllMessages();
    return NextResponse.json({ messages });
  } catch {
    return NextResponse.json({ error: 'Failed to load inbox.' }, { status: 500 });
  }
}
