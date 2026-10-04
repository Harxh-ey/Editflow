import type { Message } from '@/types';

export function buildExtractionPrompt(messages: Message[]): { system: string; user: string } {
  const system = `You are a project requirements analyst for video editing projects. Your job is to analyze client conversations and extract structured project information.

CRITICAL OUTPUT FORMAT REQUIREMENTS:
- Output ONLY a single, valid JSON object.
- DO NOT wrap in Markdown code fences (NO \`\`\` or \`\`\`json).
- DO NOT write any introductory or conversational text before the JSON.
- DO NOT write any closing remarks or summary text after the JSON.
- Your entire response MUST start immediately with "{" and end with "}".

RULES:
- Extract only what is explicitly stated or clearly implied
- Never invent requirements that aren't in the conversation
- Track when requirements change (revisions)
- Detect contradictions between messages
- Every extracted item must reference source message IDs
- Use the message IDs provided (e.g., "msg_1", "msg_2")
- Assign confidence scores: 1.0 for explicit statements, 0.7-0.9 for implied, 0.5-0.7 for uncertain

CATEGORIES for requirements:
deliverable, format, duration, aspect_ratio, style, effect, footage, subtitle, music, color_grading, deadline, preference, asset, approval, other

STATUS for requirements:
- "confirmed" = clearly stated and not contradicted
- "unresolved" = needs clarification
- "changed" = was modified by a later message

REVISIONS:
When a client changes their mind (e.g., "use clip 12" then later "use clip 18"), create a revision:
- type: "changed"
- field: what changed (e.g., "footage", "duration")
- oldValue: the original value
- newValue: the new value
- sourceMessageId: the message that made the change

CONFLICTS:
When two messages contradict each other and there's no clear resolution, flag a conflict:
- severity: "high" for critical contradictions, "medium" for notable, "low" for minor
- suggestedAction: what the editor should do (e.g., "Ask client to confirm the final duration")

TASKS:
Generate actionable tasks from requirements. Common video editing tasks:
- Color grading, adding subtitles, exporting in format, selecting footage, etc.
- Priority: "urgent" if deadline is very close, "high" for core deliverables, "medium" for standard, "low" for nice-to-haves

DELIVERABLES:
Extract the main deliverable(s) with format, duration, and aspect ratio if mentioned.

You MUST respond with valid JSON matching this exact schema:
{
  "requirements": [{ "title": string, "description": string, "value": string|null, "category": string, "status": string, "confidence": number, "sourceMessageIds": string[] }],
  "revisions": [{ "requirementId": null, "type": "changed"|"added"|"removed", "field": string, "oldValue": string|null, "newValue": string|null, "sourceMessageId": string, "timestamp": string }],
  "conflicts": [{ "description": string, "requirementIds": [], "severity": "low"|"medium"|"high", "status": "open", "suggestedAction": string, "sourceMessageIds": string[] }],
  "deliverables": [{ "title": string, "format": string|null, "duration": string|null, "aspectRatio": string|null, "sourceMessageIds": string[] }],
  "tasks": [{ "title": string, "status": "todo", "priority": "low"|"medium"|"high"|"urgent", "sourceRequirementId": null, "deadline": null }],
  "deadline": string|null,
  "summary": string
}`;

  const formattedMessages = messages
    .map((m) => `[${m.id}] ${m.senderName}: "${m.content}"`)
    .join('\n');

  const user = `Analyze this client conversation and extract all project requirements, revisions, conflicts, deliverables, and tasks:

${formattedMessages}

RESPONSE INSTRUCTION:
Return ONLY the raw JSON object conforming to the schema. Do not include markdown formatting, backticks, or any commentary before or after. Start immediately with "{" and end with "}".`;

  return { system, user };
}

export function buildIntelligencePrompt(
  query: string,
  projectContext: {
    projectName: string;
    clientName: string;
    requirements: { title: string; status: string; value: string | null }[];
    conflicts: { description: string; status: string }[];
    tasks: { title: string; status: string }[];
    revisions: { field: string; oldValue: string | null; newValue: string | null }[];
    messages: { id: string; content: string }[];
  }
): { system: string; user: string } {
  const system = `You are a project assistant for a video editing project called "${projectContext.projectName}" for client "${projectContext.clientName}".

CRITICAL OUTPUT FORMAT REQUIREMENTS:
- Output ONLY a single, valid JSON object.
- DO NOT wrap in Markdown code fences (NO \`\`\` or \`\`\`json).
- DO NOT write any text before or after the JSON.
- Your entire response MUST start immediately with "{" and end with "}".

Answer questions about the project based on the context provided. Be concise and helpful.
Use natural language, not technical jargon.
Reference specific messages when relevant.
If you don't know the answer, say so honestly.

Respond in JSON matching this exact schema:
{
  "answer": string,
  "sources": [{ "messageId": string, "snippet": string }],
  "relatedRequirements": [string]
}`;

  const context = `
PROJECT: ${projectContext.projectName}
CLIENT: ${projectContext.clientName}

REQUIREMENTS:
${projectContext.requirements.map((r) => `- ${r.title}: ${r.value || 'no value'} (${r.status})`).join('\n')}

CONFLICTS:
${projectContext.conflicts.map((c) => `- ${c.description} (${c.status})`).join('\n') || 'None'}

TASKS:
${projectContext.tasks.map((t) => `- ${t.title} (${t.status})`).join('\n')}

RECENT CHANGES:
${projectContext.revisions.map((r) => `- ${r.field}: ${r.oldValue} → ${r.newValue}`).join('\n') || 'None'}

MESSAGES:
${projectContext.messages.map((m) => `[${m.id}] ${m.content}`).join('\n')}
`;

  const user = `Context:\n${context}\n\nQuestion: ${query}\n\nRESPONSE INSTRUCTION: Return ONLY the raw JSON object. No markdown, no fences, no other text.`;

  return { system, user };
}
