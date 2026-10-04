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
  temperature?: number;
  maxOutputTokens?: number;
}

/**
 * Robust extractJSON function:
 * - trim response
 * - remove ```json / ``` fences if present
 * - find the first {
 * - find the matching final }
 * - parse that substring with JSON.parse
 */
export function extractJSON<T = unknown>(rawText: string): T {
  if (!rawText || typeof rawText !== 'string') {
    throw new Error("Couldn't parse Gemma model response as JSON. Please try again.");
  }

  // 1. trim response
  let cleaned = rawText.replace(/^\uFEFF/, '').trim();

  // 2. remove ```json / ``` fences if present
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  } else {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  }

  // 3. find the first {
  const firstBrace = cleaned.indexOf('{');
  // 4. find the matching final }
  const lastBrace = cleaned.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
    throw new Error("Couldn't parse Gemma model response as JSON. Please try again.");
  }

  // 5. parse that substring with JSON.parse
  const jsonSubstring = cleaned.slice(firstBrace, lastBrace + 1).trim();

  try {
    return JSON.parse(jsonSubstring) as T;
  } catch {
    // Defensive cleanup for trailing commas if model generated them
    try {
      const withoutTrailingCommas = jsonSubstring.replace(/,\s*([\]}])/g, '$1');
      return JSON.parse(withoutTrailingCommas) as T;
    } catch {
      throw new Error("Couldn't parse Gemma model response as JSON. Please try again.");
    }
  }
}

/**
 * Strips markdown code fences (```json ... ```) and extracts the outermost
 * JSON object or array from text emitted by instruction-tuned Gemma models.
 */
export function extractCleanJson(rawText: string): string {
  if (!rawText) return '';
  let cleaned = rawText.trim();
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  } else {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  }
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace >= firstBrace) {
    return cleaned.slice(firstBrace, lastBrace + 1).trim();
  }
  return cleaned;
}

/**
 * Safely parses JSON emitted by Gemma using extractJSON.
 */
export function safeParseJSON<T = unknown>(
  rawText: string
): { success: true; data: T } | { success: false; error: Error; raw: string } {
  try {
    const data = extractJSON<T>(rawText);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error("Couldn't parse Gemma model response as JSON. Please try again."),
      raw: rawText || '',
    };
  }
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

  const generationConfig: Record<string, unknown> = {
    temperature: options?.temperature ?? 0.2,
    maxOutputTokens: options?.maxOutputTokens ?? 4096,
  };

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
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Gemma API error:', response.status, errorData);
      throw new Error(`Gemma request failed (${response.status}) using model "${model}". Check your GEMMA_API_KEY and GEMMA_MODEL.`);
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error('Gemma returned an empty response.');
    }

    return text;
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

    return content;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Gemma')) {
      throw error;
    }
    console.error('Gemma call failed:', error);
    throw new Error("Couldn't reach the Gemma inference endpoint. Check your network and configuration.");
  }
}
