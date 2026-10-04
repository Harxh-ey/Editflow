'use client';

import { useState } from 'react';
import { Loader2, X } from 'lucide-react';

interface NewProjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (_data: {
    name: string;
    clientName: string;
    description?: string;
    deadline?: string | null;
  }) => Promise<void>;
}

export function NewProjectDialog({ isOpen, onClose, onSubmit }: NewProjectDialogProps) {
  const [name, setName] = useState('Wedding Reel');
  const [clientName, setClientName] = useState('Rahul Sharma');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await onSubmit({
        name: name.trim(),
        clientName: clientName.trim(),
        description: description.trim(),
        deadline: deadline ? new Date(deadline).toISOString() : null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Couldn’t create the project.');
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh]" role="dialog" aria-labelledby="new-project-title">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-md bg-surface border border-border rounded-lg shadow-elevated p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 id="new-project-title" className="text-base font-semibold text-foreground">
              New project
            </h2>
            <p className="text-sm text-muted mt-0.5">You’ll paste the client thread on the next screen.</p>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-muted hover:text-foreground" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block">
            <span className="text-xs font-medium text-muted">Project name</span>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full px-3 py-2 text-sm border border-border rounded bg-surface"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-muted">Client name</span>
            <input
              required
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="mt-1 w-full px-3 py-2 text-sm border border-border rounded bg-surface"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-muted">Deadline</span>
            <input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="mt-1 w-full px-3 py-2 text-sm border border-border rounded bg-surface"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-muted">Description (optional)</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="mt-1 w-full px-3 py-2 text-sm border border-border rounded bg-surface"
            />
          </label>
          {error && <p className="text-sm text-error">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-3 py-2 text-sm text-muted">
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-accent rounded disabled:opacity-50"
            >
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}
              Create project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
