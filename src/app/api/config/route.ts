import { NextResponse } from 'next/server';
import { isAIConfigured, getGemmaModel } from '@/lib/ai/provider';
import { isMongoConfigured } from '@/lib/mongodb/client';
import { isSentryConfigured } from '@/lib/observability/sentry';
import { isVoiceConfigured } from '@/lib/voice/elevenlabs';
import { isDemoMode } from '@/lib/utils';

export async function GET() {
  return NextResponse.json({
    demoMode: isDemoMode(),
    ai: isAIConfigured(),
    model: getGemmaModel(),
    mastra: true,
    mongodb: isMongoConfigured(),
    sentry: isSentryConfigured(),
    voice: isVoiceConfigured(),
  });
}
