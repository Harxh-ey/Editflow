'use client';

import { useEffect, useState } from 'react';
import { SAMPLE_WEDDING_CONVERSATION } from '@/lib/demo/sample-conversation';
import { AlertCircle, FileText, Loader2, Mic, Upload } from 'lucide-react';

interface ConversationInputProps {
  projectId: string;
  onAnalysisComplete: () => void;
  compact?: boolean;
}

export function ConversationInput({ projectId, onAnalysisComplete, compact }: ConversationInputProps) {
  const [mode, setMode] = useState<'paste' | 'message' | 'file'>('paste');
  const [rawText, setRawText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/config')
      .then((r) => r.json())
      .then((c) => {
        setDemoMode(Boolean(c.demoMode) || !c.ai);
        setVoiceEnabled(Boolean(c.voice));
      })
      .catch(() => setDemoMode(true));
  }, []);

  const analyze = async (text: string) => {
    setIsSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't analyze this conversation.");
      setNotice(data.message);
      setRawText('');
      setFileName(null);
      onAnalysisComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't analyze this conversation.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setFileName(file.name);
    const text = await file.text();
    setRawText(text);
    setMode('paste');
  };

  const onVoice = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.start();
      setNotice('Recording… tap again isn’t needed — this captures 8 seconds.');
      await new Promise((r) => setTimeout(r, 8000));
      recorder.stop();
      await new Promise((r) => {
        recorder.onstop = r;
      });
      stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
      const form = new FormData();
      form.append('file', blob, 'note.webm');
      const res = await fetch('/api/voice?mode=transcribe', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRawText((prev) => (prev ? `${prev}\n${data.text}` : data.text));
      setNotice('Voice note transcribed. Review it, then analyze.');
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't capture that voice note.");
    }
  };

  return (
    <section className={compact ? '' : 'max-w-2xl'}>
      {!compact && (
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-foreground">Source material</h2>
          <p className="text-sm text-muted mt-1">
            Paste the client thread. EditFlow will pull requirements, changes, and anything that doesn’t line up.
          </p>
        </div>
      )}

      {demoMode && (
        <div className="mb-4 px-3 py-2 text-xs text-muted bg-surface-tertiary border border-border rounded">
          Demo mode — no live model key is configured. Extraction uses a labeled, deterministic path. It will not pretend a live call succeeded.
        </div>
      )}

      <div className="flex gap-1 mb-3" role="tablist" aria-label="Input type">
        {[
          { id: 'paste', label: 'Paste conversation' },
          { id: 'message', label: 'Text message' },
          { id: 'file', label: 'File' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setMode(tab.id as typeof mode)}
            className={`px-3 py-1.5 text-xs font-medium rounded ${
              mode === tab.id ? 'bg-foreground text-white' : 'text-muted hover:bg-surface-tertiary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {mode === 'file' ? (
        <label className="flex flex-col items-center justify-center gap-2 h-36 border border-dashed border-border-strong rounded bg-surface text-sm text-muted cursor-pointer hover:bg-surface-secondary">
          <Upload className="w-4 h-4" />
          {fileName || 'Drop a .txt export, or click to browse'}
          <input
            type="file"
            accept=".txt,.md,.csv"
            className="sr-only"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
        </label>
      ) : (
        <textarea
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          rows={mode === 'message' ? 4 : 12}
          placeholder={
            mode === 'message'
              ? 'Client: Need the final tonight.'
              : 'Client: Bro make this cinematic.\nClient: Use clip 12 for the opening.'
          }
          className="w-full px-3 py-2.5 text-sm bg-surface border border-border rounded text-foreground placeholder:text-muted-light focus:border-accent"
        />
      )}

      {error && (
        <div className="flex items-start gap-2 mt-3 text-sm text-error">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          {error}
        </div>
      )}
      {notice && <p className="mt-3 text-sm text-muted">{notice}</p>}

      <div className="flex flex-wrap items-center gap-3 mt-4">
        <button
          type="button"
          disabled={isSubmitting || !rawText.trim()}
          onClick={() => analyze(rawText)}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-accent hover:bg-accent-dark rounded disabled:opacity-50"
        >
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
          Analyze conversation
        </button>
        <button
          type="button"
          className="text-sm text-muted hover:text-foreground"
          onClick={() => {
            setRawText(SAMPLE_WEDDING_CONVERSATION);
            setMode('paste');
          }}
        >
          Load sample thread
        </button>
        {voiceEnabled && (
          <button type="button" onClick={onVoice} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
            <Mic className="w-3.5 h-3.5" />
            Voice note
          </button>
        )}
      </div>
    </section>
  );
}
