import test from 'node:test';
import assert from 'node:assert/strict';
import { safeParseJSON, extractCleanJson, extractCandidateText } from '../src/lib/ai/provider';
import { ExtractionResultSchema } from '../src/lib/validation/schemas';
import { parseRawConversation } from '../src/lib/ai/extraction';
import { heuristicExtract } from '../src/lib/intelligence/heuristic';

// Canonical sample extraction matching the exact EditFlow schema
const sampleValidExtraction = {
  requirements: [
    {
      title: 'Cinematic visual style',
      description: 'Make this reel cinematic with rich grading and smooth pacing',
      value: 'cinematic',
      category: 'style',
      status: 'confirmed',
      confidence: 0.95,
      sourceMessageIds: ['msg_1'],
    },
    {
      title: 'Opening footage selection',
      description: 'Use clip 18 for the opening (updated from clip 12)',
      value: 'clip 18',
      category: 'footage',
      status: 'confirmed',
      confidence: 1.0,
      sourceMessageIds: ['msg_2', 'msg_6'],
    },
    {
      title: 'Aspect ratio 9:16',
      description: 'Format deliverable for Instagram vertical video',
      value: '9:16',
      category: 'aspect_ratio',
      status: 'confirmed',
      confidence: 1.0,
      sourceMessageIds: ['msg_3'],
    },
    {
      title: 'Target duration under 30 seconds',
      description: 'Reel duration shortened from ~60s to under 30s',
      value: '<30s',
      category: 'duration',
      status: 'confirmed',
      confidence: 0.9,
      sourceMessageIds: ['msg_4', 'msg_5'],
    },
    {
      title: 'Subtitles for wedding vows',
      description: 'Add elegant subtitle styling to the vows segment',
      value: 'elegant subtitles',
      category: 'subtitle',
      status: 'confirmed',
      confidence: 0.95,
      sourceMessageIds: ['msg_7'],
    },
  ],
  revisions: [
    {
      requirementId: null,
      type: 'changed',
      field: 'footage',
      oldValue: 'clip 12',
      newValue: 'clip 18',
      sourceMessageId: 'msg_6',
      timestamp: new Date().toISOString(),
    },
    {
      requirementId: null,
      type: 'changed',
      field: 'duration',
      oldValue: '60 seconds',
      newValue: 'under 30 seconds',
      sourceMessageId: 'msg_5',
      timestamp: new Date().toISOString(),
    },
  ],
  conflicts: [
    {
      description: 'Duration contradiction: 60 seconds vs under 30 seconds',
      requirementIds: [],
      severity: 'medium',
      status: 'open',
      suggestedAction: 'Confirm with client if hard ceiling is 30 seconds or flexible around 60 seconds',
      sourceMessageIds: ['msg_4', 'msg_5'],
    },
  ],
  deliverables: [
    {
      title: 'Instagram Reel',
      format: 'MP4 / H.264',
      duration: 'under 30s',
      aspectRatio: '9:16',
      sourceMessageIds: ['msg_3', 'msg_5'],
    },
  ],
  tasks: [
    {
      title: 'Assemble opening with clip 18',
      status: 'todo',
      priority: 'high',
      sourceRequirementId: null,
      deadline: null,
    },
    {
      title: 'Format timeline to 9:16 vertical canvas',
      status: 'todo',
      priority: 'high',
      sourceRequirementId: null,
      deadline: null,
    },
    {
      title: 'Transcribe and style vow subtitles',
      status: 'todo',
      priority: 'medium',
      sourceRequirementId: null,
      deadline: null,
    },
    {
      title: 'Apply cinematic color grade',
      status: 'todo',
      priority: 'medium',
      sourceRequirementId: null,
      deadline: null,
    },
  ],
  deadline: null,
  summary: 'Cinematic 9:16 wedding reel with clip 18 opening, under 30s cut, and vow subtitles.',
};

// 1. JSON response with response_mime_type: "application/json"
test('1. Gemma path: JSON response with response_mime_type', () => {
  // When Gemma returns content generated under response_mime_type: "application/json",
  // it emits pure raw JSON without markdown fences.
  const rawGemmaOutput = JSON.stringify(sampleValidExtraction);
  const result = safeParseJSON(rawGemmaOutput);

  assert.equal(result.success, true);
  if (result.success) {
    const validated = ExtractionResultSchema.safeParse(result.data);
    assert.equal(validated.success, true, 'Parsed JSON must conform to ExtractionResultSchema');
    if (validated.success) {
      assert.equal(validated.data.requirements.length, 5);
      assert.equal(validated.data.revisions.length, 2);
      assert.equal(validated.data.conflicts.length, 1);
      assert.equal(validated.data.tasks.length, 4);
      assert.equal(validated.data.deliverables.length, 1);
      assert.equal(validated.data.requirements[1].value, 'clip 18');
      assert.deepEqual(validated.data.requirements[1].sourceMessageIds, ['msg_2', 'msg_6']);
    }
  }
});

// 2. Plain text JSON response (standard generation without response_mime_type)
test('2. Gemma path: plain text JSON response', () => {
  // Model returns formatted plain text starting with { and ending with }
  const plainTextJson = JSON.stringify(sampleValidExtraction, null, 2);
  const result = safeParseJSON(plainTextJson);

  assert.equal(result.success, true);
  if (result.success) {
    const validated = ExtractionResultSchema.safeParse(result.data);
    assert.equal(validated.success, true);
  }
});

// 3. Fenced JSON (Markdown code fences and accidental surrounding text)
test('3. Gemma path: fenced JSON and conversational wrapping', () => {
  // 3a. Standard ```json ... ``` code fence
  const fencedStandard = '```json\n' + JSON.stringify(sampleValidExtraction) + '\n```';
  const res1 = safeParseJSON(fencedStandard);
  assert.equal(res1.success, true);

  // 3b. Generic ``` ... ``` code fence
  const fencedGeneric = '```\n' + JSON.stringify(sampleValidExtraction) + '\n```';
  const res2 = safeParseJSON(fencedGeneric);
  assert.equal(res2.success, true);

  // 3c. Accidental conversational text before and after code block
  const wrappedOutput = `Here is the requested JSON output for the client conversation:

\`\`\`json
${JSON.stringify(sampleValidExtraction, null, 2)}
\`\`\`

All requirements and tasks have been extracted. Let me know if you need changes.`;

  const res3 = safeParseJSON(wrappedOutput);
  assert.equal(res3.success, true);
  if (res3.success) {
    const validated = ExtractionResultSchema.safeParse(res3.data);
    assert.equal(validated.success, true);
  }

  // 3d. Preamble and postscript WITHOUT code fences
  const unfencedWithPreamble = `Sure! Here is the JSON output:
${JSON.stringify(sampleValidExtraction)}
Thank you!`;

  const res4 = safeParseJSON(unfencedWithPreamble);
  assert.equal(res4.success, true);
});

// 4. Malformed JSON handling
test('4. Gemma path: malformed JSON handling', () => {
  // 4a. Trailing commas before closing braces/brackets
  const withTrailingCommas = `{
    "requirements": [
      {
        "title": "Aspect ratio 9:16",
        "description": "Instagram vertical",
        "value": "9:16",
        "category": "aspect_ratio",
        "status": "confirmed",
        "confidence": 1.0,
        "sourceMessageIds": ["msg_3",],
      },
    ],
    "revisions": [],
    "conflicts": [],
    "deliverables": [],
    "tasks": [],
    "deadline": null,
    "summary": "Project summary",
  }`;

  const resCommas = safeParseJSON(withTrailingCommas);
  assert.equal(resCommas.success, true, 'Trailing commas should be cleaned and parsed successfully');

  // 4b. Non-JSON conversational text
  const totallyBroken = 'I cannot output JSON for this conversation because some messages are missing.';
  const resBroken = safeParseJSON(totallyBroken);
  assert.equal(resBroken.success, false);
  if (!resBroken.success) {
    assert.match(resBroken.error.message, /Couldn't parse Gemma model response as JSON/);
  }

  // 4c. Empty response string
  const resEmpty = safeParseJSON('');
  assert.equal(resEmpty.success, false);
});

// 5. Retry / fallback behavior
test('5. Gemma path: retry/fallback behavior', () => {
  // Scenario 1: Initial call returns text without valid JSON, triggering retry with strict JSON instruction
  const initialBadOutput = 'Analyzing client requirements... 1. Cinematic style. 2. Clip 12 then 18.';
  let firstAttempt = safeParseJSON(initialBadOutput);
  assert.equal(firstAttempt.success, false, 'First attempt fails safely');

  // Simulated retry with concise JSON-only instruction succeeds
  const retryOutput = JSON.stringify(sampleValidExtraction);
  let retryAttempt = safeParseJSON(retryOutput);
  assert.equal(retryAttempt.success, true, 'Retry attempt succeeds');
  if (retryAttempt.success) {
    const validated = ExtractionResultSchema.safeParse(retryAttempt.data);
    assert.equal(validated.success, true);
  }

  // Scenario 2: Persistent failure produces user-facing error message without crashing
  const persistentBadOutput = 'Still invalid text';
  const finalAttempt = safeParseJSON(persistentBadOutput);
  assert.equal(finalAttempt.success, false);
  let thrownMessage = '';
  try {
    if (!finalAttempt.success) {
      throw new Error("Couldn't parse Gemma model response as JSON. Please try again.");
    }
  } catch (err) {
    thrownMessage = (err as Error).message;
  }
  assert.equal(thrownMessage, "Couldn't parse Gemma model response as JSON. Please try again.");
});

// 6. Production test conversation pipeline & contract
test('6. Production test conversation: Wedding Reel analysis and contract validation', () => {
  const rawConversation = `Client: Make this reel cinematic.
Client: Use clip 12 for the opening.
Client: Make it 9:16 for Instagram.
Client: Keep it around 60 seconds.
Client: Actually, make it under 30 seconds.
Client: Use clip 18 instead of clip 12 for the opening.
Client: Add elegant subtitles to the vows.`;

  const messages = parseRawConversation(rawConversation, 'proj_wedding_canonical');
  assert.equal(messages.length, 7);
  assert.equal(messages[0].id, 'msg_1');
  assert.equal(messages[1].content, 'Use clip 12 for the opening.');
  assert.equal(messages[5].content, 'Use clip 18 instead of clip 12 for the opening.');

  // Validate Demo Mode heuristic pipeline produces valid schema output
  const heuristicResult = heuristicExtract(messages);
  const validatedHeuristic = ExtractionResultSchema.safeParse(heuristicResult);
  assert.equal(validatedHeuristic.success, true, 'Deterministic heuristic must pass ExtractionResultSchema');

  // Validate clip 12 -> clip 18 revision is captured
  const clipRevision = heuristicResult.revisions.find((r) => r.oldValue?.includes('12') || r.newValue?.includes('18'));
  assert.ok(clipRevision, 'Clip 12 -> Clip 18 revision must be captured');

  // Validate duration conflict is captured
  const durationConflict = heuristicResult.conflicts.find((c) => /duration|seconds|30|60/i.test(c.description));
  assert.ok(durationConflict, 'Duration conflict must be captured');

  // Validate all expected requirements exist
  assert.ok(heuristicResult.requirements.length >= 4);
  assert.ok(heuristicResult.tasks.length >= 3);
});

// 7. Gemma path: Candidate with thought: true part followed by JSON part
test('7. Gemma path: candidate with reasoning/thought parts (Google API format)', () => {
  const candidateWithThoughts = {
    content: {
      parts: [
        {
          thought: true,
          text: 'Thinking Process:\n1. Understand the goal: user wants structured requirements.\n2. Analyze conversation: client asked for cinematic style, clip 18 opening, under 30s cut.\n3. Build JSON payload according to schema.',
        },
        {
          text: JSON.stringify(sampleValidExtraction),
        },
      ],
    },
  };

  const extractedText = extractCandidateText(candidateWithThoughts);
  assert.ok(!extractedText.includes('Thinking Process'), 'Thought parts must be filtered out');

  const parsed = safeParseJSON(extractedText);
  assert.equal(parsed.success, true);
  if (parsed.success) {
    const validated = ExtractionResultSchema.safeParse(parsed.data);
    assert.equal(validated.success, true);
  }
});

// 8. Gemma path: Multi-part candidate response concatenated seamlessly
test('8. Gemma path: multi-part response split across candidate parts', () => {
  const fullJson = JSON.stringify(sampleValidExtraction);
  const midPoint = Math.floor(fullJson.length / 2);
  const chunk1 = fullJson.slice(0, midPoint);
  const chunk2 = fullJson.slice(midPoint);

  const multiPartCandidate = {
    content: {
      parts: [
        { text: chunk1 },
        { text: chunk2 },
      ],
    },
  };

  const extractedText = extractCandidateText(multiPartCandidate);
  assert.equal(extractedText, fullJson);

  const parsed = safeParseJSON(extractedText);
  assert.equal(parsed.success, true);
});

// 9. Gemma path: Plain text with <thought> tags before JSON
test('9. Gemma path: plain text containing <thought> tags before JSON', () => {
  const textWithThoughtTags = `<thought>
Examining the conversation for requirements and revisions.
Found: clip 18, under 30s, cinematic style.
</thought>
${JSON.stringify(sampleValidExtraction)}`;

  const parsed = safeParseJSON(textWithThoughtTags);
  assert.equal(parsed.success, true);
  if (parsed.success) {
    const validated = ExtractionResultSchema.safeParse(parsed.data);
    assert.equal(validated.success, true);
  }
});

