import { NextResponse } from 'next/server';
import { isVoiceConfigured, transcribeAudio, speakText } from '@/lib/voice/elevenlabs';

export async function POST(request: Request) {
  if (!isVoiceConfigured()) {
    return NextResponse.json(
      { error: 'Voice is turned off. Add ElevenLabs credentials to enable it.' },
      { status: 501 }
    );
  }

  const url = new URL(request.url);
  const mode = url.searchParams.get('mode') || 'transcribe';

  try {
    if (mode === 'speak') {
      const body = await request.json();
      const text = typeof body.text === 'string' ? body.text : '';
      if (!text.trim()) {
        return NextResponse.json({ error: 'Nothing to read aloud.' }, { status: 400 });
      }
      const audio = await speakText(text);
      return new NextResponse(Buffer.from(audio), {
        headers: { 'Content-Type': 'audio/mpeg' },
      });
    }

    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: 'Attach a voice note to transcribe.' }, { status: 400 });
    }
    const text = await transcribeAudio(file, 'note.webm');
    return NextResponse.json({ text });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Couldn't process that voice note.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
