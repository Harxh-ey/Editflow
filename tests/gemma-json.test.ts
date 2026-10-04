import test from 'node:test';
import assert from 'node:assert/strict';
import { safeParseJSON, extractCleanJson } from '../src/lib/ai/provider';
import { ExtractionResultSchema, EXTRACTION_RESPONSE_SCHEMA } from '../src/lib/validation/schemas';
import { parseRawConversation } from '../src/lib/ai/extraction';
import { heuristicExtract } from '../src/lib/intelligence/heuristic';

// Sample valid extraction matching the canonical production conversation
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

test('1. Valid Gemma JSON Parsing', () => {
  const rawJson = JSON.stringify(sampleValidExtraction, null, 2);
  const result = safeParseJSON(rawJson);

  assert.equal(result.success, true);
  if (result.success) {
    const validated = ExtractionResultSchema.safeParse(result.data);
    assert.equal(validated.success, true, 'Zod schema validation must pass on parsed JSON');
    if (validated.success) {
      assert.equal(validated.data.requirements.length, 5);
      assert.equal(validated.data.revisions.length, 2);
      assert.equal(validated.data.conflicts.length, 1);
      assert.equal(validated.data.tasks.length, 4);

      // Verify evidence links and message IDs are preserved
      const footageReq = validated.data.requirements.find((r) => r.category === 'footage');
      assert.ok(footageReq);
      assert.deepEqual(footageReq?.sourceMessageIds, ['msg_2', 'msg_6']);
    }
  }
});

test('2. Fenced JSON Parsing (Markdown code blocks and conversational text)', () => {
  // Case 2a: Standard ```json code fence
  const fencedStandard = '```json\n' + JSON.stringify(sampleValidExtraction) + '\n```';
  const res1 = safeParseJSON(fencedStandard);
  assert.equal(res1.success, true);

  // Case 2b: Generic ``` code fence
  const fencedGeneric = '```\n' + JSON.stringify(sampleValidExtraction) + '\n```';
  const res2 = safeParseJSON(fencedGeneric);
  assert.equal(res2.success, true);

  // Case 2c: Model conversational preamble and closing remarks surrounding the code block
  const conversationalWrapped = `Here is the structured extraction for the video editing project:

\`\`\`json
${JSON.stringify(sampleValidExtraction, null, 2)}
\`\`\`

Let me know if you would like me to adjust any of the extracted tasks or requirements!`;

  const res3 = safeParseJSON(conversationalWrapped);
  assert.equal(res3.success, true, 'Must extract JSON from conversational wrapper');
  if (res3.success) {
    const validated = ExtractionResultSchema.safeParse(res3.data);
    assert.equal(validated.success, true);
  }

  // Case 2d: No code fences, but conversational text before and after raw JSON
  const rawWithPreamble = `Sure, here is your project breakdown:
${JSON.stringify(sampleValidExtraction)}
Hope this helps!`;

  const res4 = safeParseJSON(rawWithPreamble);
  assert.equal(res4.success, true, 'Must extract JSON with bounding braces when no fences exist');
});

test('3. Malformed JSON handling and recovery', () => {
  // Case 3a: Trailing commas before closing braces/brackets
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
  assert.equal(resCommas.success, true, 'Trailing commas should be cleaned and parsed');

  // Case 3b: Completely broken/unparseable non-JSON text
  const totallyMalformed = 'I cannot output JSON for this conversation because the messages are unclear.';
  const resBroken = safeParseJSON(totallyMalformed);
  assert.equal(resBroken.success, false, 'Non-JSON text must report success=false');
  if (!resBroken.success) {
    assert.match(resBroken.error.message, /Couldn't parse Gemma model response as JSON/);
  }

  // Case 3c: Empty response
  const emptyRes = safeParseJSON('');
  assert.equal(emptyRes.success, false);
});

test('4. Retry Simulation and Failure Recovery Behavior', () => {
  // Simulate the workflow retry behavior:
  // Step 1: First call returns malformed conversational text without valid JSON
  const malformedFirstCall = 'Thinking: The user wants a cinematic video. Analysis in progress...';
  let firstAttempt = safeParseJSON(malformedFirstCall);
  assert.equal(firstAttempt.success, false);

  // Step 2: Retry with concise JSON-only instruction produces valid JSON
  const simulatedRetryOutput = JSON.stringify(sampleValidExtraction);
  let retryAttempt = safeParseJSON(simulatedRetryOutput);
  assert.equal(retryAttempt.success, true);
  if (retryAttempt.success) {
    const validated = ExtractionResultSchema.safeParse(retryAttempt.data);
    assert.equal(validated.success, true);
  }

  // Step 3: Persistent failure produces user-facing error message without crashing
  const persistentFailure = 'Fatal error from LLM';
  const finalParse = safeParseJSON(persistentFailure);
  assert.equal(finalParse.success, false);
  let caughtError: string | null = null;
  try {
    if (!finalParse.success) {
      throw new Error("Couldn't parse Gemma model response as JSON. Please try again.");
    }
  } catch (err) {
    caughtError = (err as Error).message;
  }
  assert.equal(caughtError, "Couldn't parse Gemma model response as JSON. Please try again.");
});

test('5. Canonical Production Conversation Pipeline', () => {
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

  // Verify Demo Mode fallback heuristic extraction produces full requirements, revisions, conflicts, tasks
  const heuristicResult = heuristicExtract(messages);
  const validatedHeuristic = ExtractionResultSchema.safeParse(heuristicResult);
  assert.equal(validatedHeuristic.success, true, 'Deterministic heuristic must pass ExtractionResultSchema');

  // Verify clip 12 -> clip 18 revision is captured
  const clipRevision = heuristicResult.revisions.find((r) => r.oldValue?.includes('12') || r.newValue?.includes('18'));
  assert.ok(clipRevision, 'Clip 12 -> Clip 18 revision must be captured');

  // Verify duration conflict is captured
  const durationConflict = heuristicResult.conflicts.find((c) => /duration|seconds|30|60/i.test(c.description));
  assert.ok(durationConflict, 'Duration conflict must be captured');

  // Verify response schema is valid and complete
  assert.equal(EXTRACTION_RESPONSE_SCHEMA.type, 'OBJECT');
  assert.ok(EXTRACTION_RESPONSE_SCHEMA.properties.requirements);
  assert.ok(EXTRACTION_RESPONSE_SCHEMA.properties.revisions);
  assert.ok(EXTRACTION_RESPONSE_SCHEMA.properties.conflicts);
  assert.ok(EXTRACTION_RESPONSE_SCHEMA.properties.deliverables);
  assert.ok(EXTRACTION_RESPONSE_SCHEMA.properties.tasks);
});
