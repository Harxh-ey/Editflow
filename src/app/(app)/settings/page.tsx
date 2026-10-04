'use client';

import { useEffect, useState } from 'react';

interface Config {
  demoMode: boolean;
  ai: boolean;
  model?: string;
  mastra?: boolean;
  mongodb: boolean;
  sentry: boolean;
  voice: boolean;
}

interface IntegrationItem {
  label: string;
  ok: boolean;
  statusText?: string;
  hint: string;
}

interface IntegrationGroup {
  category: string;
  items: IntegrationItem[];
}

export default function SettingsPage() {
  const [config, setConfig] = useState<Config | null>(null);

  useEffect(() => {
    fetch('/api/config')
      .then((r) => r.json())
      .then(setConfig);
  }, []);

  const groups: IntegrationGroup[] = config
    ? [
        {
          category: 'AI Intelligence Layer',
          items: [
            {
              label: 'Google Gemma',
              ok: config.ai,
              hint: config.ai
                ? `Configured: ${config.model || 'gemma-2-9b-it'}`
                : 'Missing GEMMA_API_KEY — running deterministic heuristic demo mode',
            },
            {
              label: 'Mastra Workflow Orchestrator',
              ok: Boolean(config.mastra),
              statusText: 'Active',
              hint: 'Orchestrates Extraction → Revisions → Conflicts → Structured Project',
            },
          ],
        },
        {
          category: 'Data & Memory',
          items: [
            {
              label: 'MongoDB Atlas',
              ok: config.mongodb,
              hint: config.mongodb
                ? 'Persistent storage & cross-project client memory search'
                : 'Using in-memory store until MONGODB_URI is provided',
            },
          ],
        },
        {
          category: 'Observability & Tracing',
          items: [
            {
              label: 'Sentry Agent Tracing',
              ok: config.sentry,
              hint: config.sentry
                ? 'Captures workflow spans with projectId, model, step & duration metadata'
                : 'Optional. Pass SENTRY_DSN to trace workflow runs.',
            },
          ],
        },
        {
          category: 'Voice Audio',
          items: [
            {
              label: 'ElevenLabs',
              ok: config.voice,
              hint: config.voice
                ? 'Voice note transcription and audio brief generation active'
                : 'Hidden until ELEVENLABS_API_KEY is configured',
            },
          ],
        },
      ]
    : [];

  return (
    <div className="max-w-xl pb-12">
      <h1 className="text-2xl font-semibold tracking-tight mb-1">Settings</h1>
      <p className="text-sm text-muted mb-8">Workspace configuration and integration health. Secrets stay on the server.</p>

      <section className="mb-8">
        <h2 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Profile</h2>
        <div className="flex items-center gap-3 py-2">
          <div className="w-9 h-9 rounded bg-foreground text-white text-sm flex items-center justify-center font-medium">VE</div>
          <div>
            <p className="text-sm font-medium">Video Editor Workspace</p>
            <p className="text-xs text-muted">Local / Production environment</p>
          </div>
        </div>
      </section>

      <div className="space-y-8">
        {groups.map((group) => (
          <section key={group.category}>
            <h2 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
              {group.category}
            </h2>
            <ul className="divide-y divide-border border-y border-border">
              {group.items.map((item) => (
                <li key={item.label} className="py-3 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted mt-0.5">{item.hint}</p>
                  </div>
                  <span
                    className={`text-xs shrink-0 font-medium ${
                      item.ok ? 'text-success' : 'text-muted'
                    }`}
                  >
                    {item.statusText || (item.ok ? 'Connected' : 'Not set')}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
