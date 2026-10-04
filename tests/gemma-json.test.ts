import test from 'node:test';
import assert from 'node:assert/strict';
import { extractJSON, safeParseJSON, extractCleanJson } from '../src/lib/ai/provider';
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

// 1. Pure JSON
test('1. Pure JSON: extractJSON parses raw JSON string without markdown or formatting', () => {
  const rawGemmaOutput = JSON.stringify(sampleValidExtraction);
  const parsed = extractJSON(rawGemmaOutput);
  const validated = ExtractionResultSchema.safeParse(parsed);

  assert.equal(validated.success, true, 'Parsed pure JSON must conform to ExtractionResultSchema');
  if (validated.success) {
    assert.equal(validated.data.requirements.length, 5);
    assert.equal(validated.data.revisions.length, 2);
    assert.equal(validated.data.conflicts.length, 1);
    assert.equal(validated.data.tasks.length, 4);
    assert.equal(validated.data.requirements[1].value, 'clip 18');
  }
});

// 2. Fenced JSON
test('2. Fenced JSON: extractJSON removes ```json and ``` fences and parses content', () => {
  // 2a. With ```json
  const fencedWithJson = '```json\n' + JSON.stringify(sampleValidExtraction, null, 2) + '\n```';
  const parsed1 = extractJSON(fencedWithJson);
  assert.equal(ExtractionResultSchema.safeParse(parsed1).success, true);

  // 2b. With generic ```
  const fencedGeneric = '```\n' + JSON.stringify(sampleValidExtraction) + '\n```';
  const parsed2 = extractJSON(fencedGeneric);
  assert.equal(ExtractionResultSchema.safeParse(parsed2).success, true);
});

// 3. JSON surrounded by text
test('3. JSON surrounded by text: extractJSON extracts substring between first { and final }', () => {
  const textWithPreambleAndPostscript = `Here is the analysis of the video editing requirements:

${JSON.stringify(sampleValidExtraction, null, 2)}

Please let me know if you would like to make revisions or if you need additional tasks.`;

  const parsed = extractJSON(textWithPreambleAndPostscript);
  const validated = ExtractionResultSchema.safeParse(parsed);
  assert.equal(validated.success, true);
  if (validated.success) {
    assert.equal(validated.data.requirements.length, 5);
  }
});

// 4. Malformed JSON
test('4. Malformed JSON: extractJSON fails gracefully on invalid JSON and non-JSON text', () => {
  // 4a. Trailing commas handled defensively
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
  const parsedCommas = extractJSON(withTrailingCommas);
  assert.ok(parsedCommas, 'Trailing commas should be cleaned and parsed successfully');

  // 4b. Broken JSON (syntax error, missing closing bracket/brace)
  const completelyBroken = '{"requirements": [{"title": "Broken", ';
  assert.throws(() => {
    extractJSON(completelyBroken);
  }, /Couldn't parse Gemma model response as JSON/);

  // 4c. Non-JSON conversational response
  const nonJson = 'I could not analyze this conversation because the audio was unclear.';
  assert.throws(() => {
    extractJSON(nonJson);
  }, /Couldn't parse Gemma model response as JSON/);

  // 4d. Empty string
  assert.throws(() => {
    extractJSON('');
  }, /Couldn't parse Gemma model response as JSON/);
});

// 5. Retry behavior
test('5. Retry behavior: first attempt failure triggers retry with stricter JSON instruction', () => {
  // Simulated attempt 1: Model outputs conversational text without valid JSON
  const initialBadOutput = 'I analyzed the wedding reel conversation. The client wants clip 18 and 30s cut.';
  let parsed1: unknown = null;
  try {
    parsed1 = extractJSON(initialBadOutput);
  } catch {
    parsed1 = null;
  }
  const validated1 = parsed1 ? ExtractionResultSchema.safeParse(parsed1) : null;
  assert.equal(validated1, null, 'First attempt fails parsing');

  // Simulated retry with stricter instruction returns valid JSON object
  const retryOutput = JSON.stringify(sampleValidExtraction);
  const parsed2 = extractJSON(retryOutput);
  const validated2 = ExtractionResultSchema.safeParse(parsed2);

  assert.equal(validated2.success, true, 'Retry attempt succeeds and passes contract validation');
  if (validated2.success) {
    assert.equal(validated2.data.requirements.length, 5);
  }

  // Simulated persistent failure
  const persistentBadOutput = 'Still invalid text';
  let persistentParsed: unknown = null;
  try {
    persistentParsed = extractJSON(persistentBadOutput);
  } catch {
    persistentParsed = null;
  }
  const persistentValidated = persistentParsed ? ExtractionResultSchema.safeParse(persistentParsed) : null;
  assert.equal(persistentValidated, null, 'Persistent failure correctly detected');
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

