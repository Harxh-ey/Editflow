import { runEditFlowWorkflow } from '@/lib/mastra/workflow';
import type { Message, ExtractionResult, Requirement, MessageSender } from '@/types';

/**
 * Parse raw conversation text into Message objects.
 * Supports formats like:
 *   "Client: message"
 *   "Rahul: message"
 *   Plain lines (attributed to "Client")
 */
export function parseRawConversation(rawText: string, projectId: string): Message[] {
  const lines = rawText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const messages: Message[] = [];
  let index = 1;

  for (const line of lines) {
    // Try to extract sender: message pattern
    const match = line.match(/^([A-Za-z\s]+?):\s*["""]?(.+?)["""]?\s*$/);

    let sender: MessageSender = 'client';
    let senderName = 'Client';
    let content = line;

    if (match) {
      senderName = match[1].trim();
      content = match[2].trim();
      // Detect if it's the editor
      const editorKeywords = ['me', 'editor', 'you', 'i'];
      sender = editorKeywords.includes(senderName.toLowerCase()) ? 'editor' : 'client';
    }

    // Remove surrounding quotes
    content = content.replace(/^["""]|["""]$/g, '').trim();

    if (content) {
      messages.push({
        id: `msg_${index}`,
        projectId,
        sender,
        senderName,
        content,
        timestamp: new Date(Date.now() - (lines.length - index) * 5 * 60000).toISOString(),
        index,
      });
      index++;
    }
  }

  return messages;
}

/**
 * Run the full extraction pipeline on a conversation.
 * Returns null if AI is not configured (caller should fall back to demo).
 */
export async function extractFromConversation(
  messages: Message[],
  existingRequirements: Requirement[] = [],
  options?: { projectId?: string }
): Promise<{ result: ExtractionResult; mode: 'live' | 'demo' } | { error: string }> {
  try {
    const { result, mode } = await runEditFlowWorkflow(messages, existingRequirements, options);
    return { result, mode };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Couldn't analyze this conversation. Check your AI configuration and try again.";
    return { error: message };
  }
}
