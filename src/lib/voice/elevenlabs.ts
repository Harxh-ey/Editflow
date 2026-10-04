const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'JBFqnCBsd6RMkjVDRZzb';
const ELEVENLABS_BASE = process.env.ELEVENLABS_BASE_URL || 'https://api.elevenlabs.io';

export function isVoiceConfigured(): boolean {
  return Boolean(ELEVENLABS_API_KEY);
}

export async function transcribeAudio(file: Blob, filename = 'note.webm'): Promise<string> {
  if (!ELEVENLABS_API_KEY) {
    throw new Error('Voice input is not configured.');
  }

  const form = new FormData();
  form.append('file', file, filename);
  form.append('model_id', 'scribe_v1');

  const response = await fetch(`${ELEVENLABS_BASE}/v1/speech-to-text`, {
    method: 'POST',
    headers: { 'xi-api-key': ELEVENLABS_API_KEY },
    body: form,
  });

  if (!response.ok) {
    throw new Error("Couldn't transcribe that voice note. Try pasting the conversation instead.");
  }

  const data = await response.json();
  const text = data?.text;
  if (!text || typeof text !== 'string') {
    throw new Error('No speech was detected in that recording.');
  }
  return text;
}

export async function speakText(text: string): Promise<ArrayBuffer> {
  if (!ELEVENLABS_API_KEY) {
    throw new Error('Spoken replies are not configured.');
  }

  const response = await fetch(
    `${ELEVENLABS_BASE}/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text: text.slice(0, 800),
        model_id: 'eleven_turbo_v2_5',
      }),
    }
  );

  if (!response.ok) {
    throw new Error("Couldn't generate a spoken reply.");
  }

  return response.arrayBuffer();
}
