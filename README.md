# EditFlow

> **"Turn messy client messages into a clear editing workflow."**

EditFlow is an AI workflow copilot designed specifically for freelance video editors.

Video editors receive project requirements scattered across WhatsApp chats, voice notes, emails, and screenshot threads. The video editing itself isn't what derails projects—the hard part is tracking what was originally asked, what changed later, what contradicts previous instructions, and what still needs client approval.

EditFlow transforms chaotic client communication into a structured, auditable project workspace.

---

## Operating Modes: Demo vs. Live

EditFlow is built with a dual-mode architecture:

### 1. Demo Mode (Default, Zero-Setup)
- **Status**: Active out-of-the-box with **no API keys** required.
- **Intelligence**: Runs a deterministic heuristic extraction engine.
- **Workflow & Audit**: Reliably extracts requirements, detects the `Clip 12 → Clip 18` revision, flags the `60s vs under 30s` contradiction (*"Something doesn't line up"*), and generates tasks with exact source evidence tags.
- **Storage**: Uses local in-memory persistence seeded with demo projects.
- **Transparency**: Clearly labeled in the UI as Demo Mode so mock responses are never faked as live model calls.

### 2. Live Mode (Configured)
- **Gemma Inference**: Genuinely powered by Google Gemma models (default: `gemma-2-9b-it` or `gemma-2-27b-it` via Google AI Studio, or OpenAI-compatible endpoints like Groq `gemma2-9b-it`, Ollama, vLLM, or OpenRouter).
- **Mastra Orchestration**: Real multi-step sequential workflow powered by `@mastra/core/workflows`:
  1. `requirement-extraction`: Gemma structured JSON generation + Zod schema validation.
  2. `revision-analysis`: Compares sequential conversation turns against requirements and computes diffs.
  3. `conflict-detection`: Identifies parameter discrepancies and preserves uncertainty.
  4. `structured-project`: Compiles the final workspace with evidence citations.
- **MongoDB Atlas**: Persists collections (`projects`, `messages`, `requirements`, `revisions`, `conflicts`, `tasks`, `deliverables`, `activities`) with indexes.
- **Sentry Observability**: Distributed tracing across workflow execution spans (`conversation.submission`, `ai.extraction`, `validation`, `revision.analysis`, `conflict.detection`, `database.persistence`).
- **ElevenLabs Voice (Optional)**: Audio transcription for voice notes and spoken audio replies in the Command Bar.

---

## Architectural Pipeline

```
Client Input
     ↓
   Gemma
     ↓
   Mastra
     ↓
Requirements
     ↓
  Revisions
     ↓
  Conflicts
     ↓
  MongoDB
     ↓
EditFlow UI
```

---

## Key Features

1. **Structured Project Dashboard**:
   - High-level progress tracking (`7 / 9 tasks`), deadlines, and active issues at a glance.
   - Live activity feed showing chronological project updates.

2. **Source Material Ingestion**:
   - Supports pasted WhatsApp/client threads, direct message typing, text file exports (`.txt`, `.md`), and optional voice note transcription.
   - One-click **"Load sample thread"** for testing the complete wedding reel workflow.

3. **Requirements Table**:
   - Categorized by deliverables, duration, aspect ratio, style, footage, subtitles, music, color grading, and deadlines.
   - Status indicators (`Confirmed`, `Needs clarification`, `Changed`).
   - Clickable source tags jump directly to and highlight the original client message.

4. **Revision Timeline**:
   - Displays sequential modifications over time (e.g. `Opening footage: Clip 12 → Clip 18`).
   - Preserves timestamps and source message references.

5. **Conflict & Contradiction Alerts**:
   - Detects clashing parameters (e.g. initial request for `60 seconds` followed by `under 30 seconds`).
   - Labeled with human language: *"Something doesn't line up"* with recommended actions.

6. **Generated Task Checklist**:
   - Actionable work generated directly from requirements (e.g. `Add subtitles`, `Color grade`, `Export final`).
   - Status toggling between `todo`, `in_progress`, and `done`.

7. **Project Command Bar (`⌘ K` / `Ctrl K`)**:
   - Fast natural-language query interface.
   - Answers editor queries like:
     - *"What still needs client confirmation?"*
     - *"What changed since yesterday?"*
     - *"Show unresolved requirements."*
     - *"What should I finish before the deadline?"*
   - Includes optional audio speech output via ElevenLabs if configured.

8. **Dual-Mode Persistence**:
   - Works immediately using local memory and seeded demo bundles.
   - Connects seamlessly to MongoDB Atlas for persistence and indexing.

9. **Observability**:
   - End-to-end Sentry span instrumentation tracking pipeline steps (`conversation.submission`, `ai.extraction`, `validation`, `revision.analysis`, `conflict.detection`, `database.persistence`).

---

## Getting Started

### Prerequisites

- Node.js 18.17+ or 20+
- npm or pnpm

### Installation

1. Clone or open the repository:
   ```bash
   git clone <repo-url>
   cd editflow
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment (optional):
   ```bash
   cp .env.example .env.local
   ```
   *Note: EditFlow runs in full Demo Mode with no API keys required.*

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Environment Variables

EditFlow uses environment variables defined in `.env.local`:

| Variable | Description | Default / Fallback |
| :--- | :--- | :--- |
| `DEMO_MODE` | Forces demo/heuristic mode when set to `true` | `true` |
| `GEMMA_API_KEY` | API key for Gemma model inference | Optional (runs Demo Mode when unset) |
| `GEMMA_MODEL` | Supported Gemma model | `gemma-2-9b-it` (also supports `gemma-2-27b-it`) |
| `GEMMA_BASE_URL` | Base API URL (Google AI Studio or OpenAI-compatible) | `https://generativelanguage.googleapis.com/v1beta` |
| `MONGODB_URI` | MongoDB Atlas connection string | Optional (falls back to in-memory store) |
| `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` | Sentry DSN for performance & error tracking | Optional |
| `ELEVENLABS_API_KEY` | ElevenLabs API key for voice notes & TTS | Optional (voice features hidden when unset) |
| `ELEVENLABS_VOICE_ID` | Voice ID for speech playback | `JBFqnCBsd6RMkjVDRZzb` |
| `NEXT_PUBLIC_APP_URL` | Base application URL | `http://localhost:3000` |

---

## Partner Integration Truth Matrix

| Partner / Technology | Status | Role in EditFlow | Technical Artifacts |
| :--- | :--- | :--- | :--- |
| **Gemma** | **ACTIVE** | Central Intelligence Layer (extracts requirements, links source IDs, detects contradictions) | `src/lib/ai/provider.ts`<br>`src/lib/ai/prompts.ts` |
| **Mastra** | **ACTIVE** | Multi-Step Workflow Engine (Extraction → Revisions → Conflicts → Structured Project) | `src/lib/mastra/workflow.ts` |
| **MongoDB Atlas** | **READY** | Production Document Persistence & Project Memory Layer | `src/lib/mongodb/client.ts`<br>`src/lib/mongodb/memory.ts` |
| **Sentry** | **ACTIVE** | Distributed Agent Tracing (Captures spans, step names, models, durations, project IDs) | `src/lib/observability/sentry.ts` |
| **Render** | **READY** | Cloud Hosting & Continuous Deployment Blueprint | `render.yaml` |
| **ElevenLabs** | **OPTIONAL** | Multimodal Audio Ingestion & Spoken Project Briefs | `src/lib/voice/elevenlabs.ts`<br>`src/app/api/voice/route.ts` |
| **DigitalOcean** | **DOCUMENTED** | Self-Hosted Gemma GPU Droplet Inference Architecture | `digitalocean/docker-compose.yml`<br>`digitalocean/README.md` |
| **Tiger Data** | **NOT USED** | Time-series indexing handled natively by MongoDB Atlas compound indexes | Native schema indexing |
| **Backboard** | **NOT USED** | Client preference memory handled natively in EditFlow's MongoDB memory module | `src/lib/mongodb/memory.ts` |
| **Entire** | **NOT USED** | Evaluated; non-essential for video editor client workflow problem space | N/A |
| **GitHub Copilot** | **NOT USED** | Developer workflow tool; not an architectural in-product runtime dependency | N/A |

---

## Verification & Scripts

- `npm run type-check`: Validates all TypeScript types with `tsc --noEmit`.
- `npm run lint`: Runs Next.js ESLint checks.
- `npm run build`: Generates an optimized production build.
- `npm run start`: Starts the Next.js production server.

---

## Deployment to Render

EditFlow is pre-configured for one-click deployment on [Render](https://render.com) using the included `render.yaml` blueprint.

### Deployment Steps

1. Push your repository to GitHub.
2. In the Render Dashboard, select **New +** → **Blueprint**.
3. Connect your GitHub repository.
4. Render will parse `render.yaml` and configure the web service:
   - **Environment**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start`
   - **Health Check Path**: `/api/config`
5. (Optional) In the Render Environment tab, add your live secrets:
   - `GEMMA_API_KEY`
   - `GEMMA_MODEL` (`gemma-2-9b-it`)
   - `MONGODB_URI`
   - `SENTRY_DSN`
   - `ELEVENLABS_API_KEY`
6. Click **Deploy**. EditFlow will build and deploy live.
