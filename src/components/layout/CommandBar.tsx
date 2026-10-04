'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { Search, ArrowRight, MessageSquare, Loader2 } from 'lucide-react';
import type { IntelligenceResponse } from '@/types';

const suggestions = [
  'What changed since yesterday?',
  'What still needs client confirmation?',
  'Show unresolved requirements',
  'What should I finish before the deadline?',
];

export function CommandBar() {
  const pathname = usePathname();
  const projectMatch = pathname.match(/\/projects\/([^/]+)/);
  const projectId = projectMatch?.[1];

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<IntelligenceResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [voice, setVoice] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/config')
      .then((r) => r.json())
      .then((c) => setVoice(Boolean(c.voice)))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
        setQuery('');
        setResult(null);
        setError(null);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const speak = useCallback(async (text: string) => {
    if (!voice) return;
    try {
      const res = await fetch('/api/voice?mode=speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) return;
      const buf = await res.arrayBuffer();
      const url = URL.createObjectURL(new Blob([buf], { type: 'audio/mpeg' }));
      const audio = new Audio(url);
      audio.play().catch(() => undefined);
    } catch {
      /* optional */
    }
  }, [voice]);

  const handleSubmit = useCallback(async (q: string) => {
    if (!q.trim()) return;
    if (!projectId) {
      setError('Open a project to search its requirements and conversation.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/intelligence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, query: q }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
      if (voice) speak(data.answer);
    } catch {
      setError("Couldn't process your question. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [projectId, voice, speak]);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="hidden md:flex items-center gap-2 px-3 py-1.5 text-xs text-muted border border-border rounded hover:border-border-strong bg-surface"
        aria-label="Search this project"
      >
        <Search className="w-3.5 h-3.5" />
        Search this project...
        <kbd className="ml-2 px-1.5 py-0.5 text-[10px] border border-border rounded">⌘ K</kbd>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]" role="dialog" aria-label="Search this project">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => {
              setIsOpen(false);
              setQuery('');
              setResult(null);
              setError(null);
            }}
          />
          <div className="relative w-full max-w-lg bg-surface rounded-lg shadow-command border border-border animate-slide-down">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
              <Search className="w-4 h-4 text-muted-light flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSubmit(query);
                }}
                placeholder="Search this project..."
                className="flex-1 bg-transparent text-foreground text-sm placeholder:text-muted-light outline-none"
                aria-label="Search this project"
              />
              {isLoading && <Loader2 className="w-4 h-4 text-muted-light animate-spin" />}
              <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-xs text-muted-light bg-surface-tertiary rounded border border-border">
                Esc
              </kbd>
            </div>
            <div className="max-h-80 overflow-y-auto p-2">
              {error && <div className="px-3 py-2 text-sm text-error">{error}</div>}
              {result && (
                <div className="px-3 py-3">
                  <p className="text-sm text-foreground leading-relaxed">{result.answer}</p>
                  {result.sources.length > 0 && (
                    <div className="mt-3 space-y-1">
                      {result.sources.map((s, i) => (
                        <div key={`${s.messageId}-${i}`} className="flex items-center gap-2 text-xs text-muted">
                          <MessageSquare className="w-3 h-3" />
                          <span>
                            Message {s.messageId.replace('msg_', '#')}: {s.snippet}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {!result && !error && !isLoading && (
                <div>
                  <div className="px-3 py-1.5 text-xs text-muted-light uppercase tracking-wider">Suggestions</div>
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => {
                        setQuery(suggestion);
                        handleSubmit(suggestion);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-muted hover:text-foreground hover:bg-surface-tertiary rounded transition-colors text-left"
                    >
                      <ArrowRight className="w-3 h-3 flex-shrink-0" />
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
