/**
 * Real Gemma AI Provider abstraction for EditFlow.
 * Supports:
 * 1. Google Generative Language API with genuine Gemma models (e.g., gemma-2-9b-it, gemma-2-27b-it, gemma-2-2b-it)
 * 2. OpenAI-compatible Gemma inference endpoints (Groq gemma2-9b-it, Ollama gemma2, vLLM, OpenRouter, Together AI)
 */

export function getGemmaModel(): string {
  return process.env.GEMMA_MODEL || 'gemma-2-9b-it';
}

export function getGemmaBaseUrl(): string {
  return process.env.GEMMA_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta';
}

export function isAIConfigured(): boolean {
  return Boolean(process.env.GEMMA_API_KEY);
}

export interface CallAIOptions {
  responseMimeType?: string;
  temperature?: number;
  maxOutputTokens?: number;
}

/**
 * Extracts generated text from a Google Generative Language API candidate.
 * Filters out internal reasoning/thought parts (e.g. from models with thought: true)
 * and concatenates all text parts to avoid truncating responses split across multiple parts.
 */
export function extractCandidateText(candidate?: {
  content?: {
    parts?: Array<{ text?: string; thought?: boolean }>;
  };
}): string {
  const parts = candidate?.content?.parts ?? [];

  // Filter out thought/scratchpad parts (models emitting reasoning with thought: true)
  const answerParts = parts.filter(
    (p) => !p.thought && typeof p.text === 'string' && p.text.trim().length > 0
  );

  if (answerParts.length > 0) {
    return answerParts.map((p) => p.text).join('').trim();
  }

  // Fallback to all text parts if no parts are unmarked
  const allTextParts = parts.filter(
    (p) => typeof p.text === 'string' && p.text.trim().length > 0
  );
  return allTextParts.map((p) => p.text).join('').trim();
}

/**
 * Strips markdown code fences (```json ... ```), reasoning tags, and extracts the outermost
 * JSON object or array from text emitted by instruction-tuned Gemma models.
 */
export function extractCleanJson(rawText: string): string {
  if (!rawText) return '';
  let cleaned = rawText.replace(/^\uFEFF/, '').trim();

  // Strip <thought>...</thought> or <think>...</think> reasoning blocks if present
  cleaned = cleaned.replace(/<(thought|think)>[\s\S]*?<\/\1>/gi, '').trim();

  // 1. If wrapped in markdown code fences, extract the fenced block (preferring ```json)
  const jsonFenceMatch = cleaned.match(/```json\s*([\s\S]*?)\s*```/i);
  const anyFenceMatch = cleaned.match(/```\s*([\s\S]*?)\s*```/i);
  const fenceContent = jsonFenceMatch?.[1] ?? anyFenceMatch?.[1];

  if (fenceContent && (fenceContent.includes('{') || fenceContent.includes('['))) {
    cleaned = fenceContent.trim();
  }

  // 2. If the text still has surrounding text, isolate the outermost JSON structure
  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');

  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    const lastBrace = cleaned.lastIndexOf('}');
    if (lastBrace > firstBrace) {
      cleaned = cleaned.slice(firstBrace, lastBrace + 1).trim();
    }
  } else if (firstBracket !== -1) {
    const lastBracket = cleaned.lastIndexOf(']');
    if (lastBracket > firstBracket) {
      cleaned = cleaned.slice(firstBracket, lastBracket + 1).trim();
    }
  }

  return cleaned;
}

/**
 * Safely parses JSON emitted by Gemma.
 * Employs defensive multi-stage fallback:
 * 1. Direct JSON.parse
 * 2. Code-fence, thought-tag, and boundary extraction
 * 3. Trailing comma cleanup (e.g. { "a": 1, })
 * 4. JS-style line comment cleanup
 */
export function safeParseJSON<T = unknown>(
  rawText: string
): { success: true; data: T } | { success: false; error: Error; raw: string } {
  if (!rawText || typeof rawText !== 'string' || !rawText.trim()) {
    return {
      success: false,
      error: new Error("Couldn't parse Gemma model response as JSON. Please try again."),
      raw: rawText || '',
    };
  }

  // Stage 1: Direct parse
  try {
    const data = JSON.parse(rawText) as T;
    return { success: true, data };
  } catch {
    // Continue
  }

  // Stage 2: Cleaned via extractCleanJson (fences & bounds)
  const cleaned = extractCleanJson(rawText);
  try {
    const data = JSON.parse(cleaned) as T;
    return { success: true, data };
  } catch {
    // Continue
  }

  // Stage 3: Clean trailing commas before closing braces/brackets
  try {
    const withoutTrailingCommas = cleaned.replace(/,\s*([\]}])/g, '$1');
    const data = JSON.parse(withoutTrailingCommas) as T;
    return { success: true, data };
  } catch {
    // Continue
  }

  // Stage 4: Strip JS-style line comments (// ...) outside strings if stage 3 fails
  try {
    const withoutTrailingCommas = cleaned.replace(/,\s*([\]}])/g, '$1');
    const withoutComments = withoutTrailingCommas.replace(/\/\/[^\n\r]*/g, '');
    const data = JSON.parse(withoutComments) as T;
    return { success: true, data };
  } catch {
    // Continue
  }

  return {
    success: false,
    error: new Error("Couldn't parse Gemma model response as JSON. Please try again."),
    raw: rawText,
  };
}

export async function callAI(
  systemPrompt: string,
  userPrompt: string,
  options?: CallAIOptions
): Promise<string> {
  const apiKey = process.env.GEMMA_API_KEY;
  if (!apiKey) {
    throw new Error('AI is not configured. Set GEMMA_API_KEY in your environment.');
  }

  const model = getGemmaModel();
  const baseUrl = getGemmaBaseUrl().replace(/\/$/, '');

  // Detect whether this is an OpenAI-compatible endpoint (e.g. /v1, Groq, Ollama, vLLM, OpenRouter)
  // vs Google Generative Language API
  const isOpenAICompatible = baseUrl.endsWith('/v1') || !baseUrl.includes('googleapis.com');

  if (isOpenAICompatible) {
    return callOpenAIGemma(baseUrl, model, apiKey, systemPrompt, userPrompt, options);
  }

  return callGoogleGemma(baseUrl, model, apiKey, systemPrompt, userPrompt, options);
}

async function callGoogleGemma(
  baseUrl: string,
  model: string,
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  options?: CallAIOptions
): Promise<string> {
  const url = `${baseUrl}/models/${model}:generateContent?key=${apiKey}`;

  // Gemma on Google AI Studio formats prompt turns in contents.
  // Passing system instructions within the initial user prompt context ensures compatibility across Gemma model variants.
  const combinedPrompt = `${systemPrompt}\n\n[USER INSTRUCTION]:\n${userPrompt}`;

  const mimeType = options?.responseMimeType ?? 'application/json';
  const generationConfig: Record<string, unknown> = {
    temperature: options?.temperature ?? 0.2,
    maxOutputTokens: options?.maxOutputTokens ?? 4096,
  };

  if (mimeType) {
    generationConfig.response_mime_type = mimeType;
    generationConfig.responseMimeType = mimeType;
  }

  const body = {
    contents: [
      {
        role: 'user',
        parts: [{ text: combinedPrompt }],
      },
    ],
    generationConfig,
  };

  try {
    let response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    // If endpoint rejects response_mime_type with 400, fall back to standard text generation
    if (!response.ok && response.status === 400 && mimeType) {
      console.warn('Gemma endpoint returned 400 with response_mime_type. Retrying with standard text generation...');
      const fallbackConfig: Record<string, unknown> = {
        temperature: options?.temperature ?? 0.2,
        maxOutputTokens: options?.maxOutputTokens ?? 4096,
      };
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: combinedPrompt }] }],
          generationConfig: fallbackConfig,
        }),
      });
    }

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Gemma API error:', response.status, errorData);
      throw new Error(`Gemma request failed (${response.status}) using model "${model}". Check your GEMMA_API_KEY and GEMMA_MODEL.`);
    }

    const data = await response.json();
    const candidate = data?.candidates?.[0];
    const text = extractCandidateText(candidate);
    if (!text) {
      throw new Error('Gemma returned an empty response.');
    }

    return extractCleanJson(text);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Gemma')) {
      throw error;
    }
    console.error('Gemma call failed:', error);
    throw new Error("Couldn't reach the Gemma AI service. Check your network and configuration.");
  }
}

async function callOpenAIGemma(
  baseUrl: string,
  model: string,
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  options?: CallAIOptions
): Promise<string> {
  const url = `${baseUrl}/chat/completions`;

  const body: Record<string, unknown> = {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: options?.temperature ?? 0.2,
    response_format: { type: 'json_object' },
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Gemma endpoint error:', response.status, errorData);
      throw new Error(`Gemma request failed (${response.status}) on endpoint ${baseUrl}.`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('Gemma endpoint returned an empty response.');
    }

    return extractCleanJson(content);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Gemma')) {
      throw error;
    }
    console.error('Gemma call failed:', error);
    throw new Error("Couldn't reach the Gemma inference endpoint. Check your network and configuration.");
  }
}
