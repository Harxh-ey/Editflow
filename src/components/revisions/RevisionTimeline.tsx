'use client';

import { formatTime, messageLabel } from '@/lib/utils';
import { EmptyState } from '@/components/ui/EmptyState';
import { GitBranch } from 'lucide-react';
import type { Message, Revision } from '@/types';

interface RevisionTimelineProps {
  revisions: Revision[];
  messages: Message[];
  onSourceClick: (_messageId: string) => void;
}

export function RevisionTimeline({ revisions, messages, onSourceClick }: RevisionTimelineProps) {
  if (revisions.length === 0) {
    return (
      <EmptyState
        icon={GitBranch}
        title="No changes yet"
        description="When the client revises a request, it shows up here with the original still visible."
      />
    );
  }

  const byId = new Map(messages.map((m) => [m.id, m]));
  const ordered = [...revisions].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  return (
    <ol className="relative border-l border-border ml-2">
      {ordered.map((rev) => {
        const msg = byId.get(rev.sourceMessageId);
        return (
          <li key={rev.id} className="mb-8 ml-6">
            <span className="absolute -left-1.5 mt-1.5 w-3 h-3 rounded-full border border-surface bg-accent" />
            <time className="text-xs text-muted-light">{formatTime(rev.timestamp)}</time>
            {rev.type === 'changed' ? (
              <p className="text-sm text-foreground mt-1">
                Client changed {rev.field.toLowerCase()}
                <span className="block mt-1">
                  <span className="text-muted line-through">{rev.oldValue}</span>
                  <span className="mx-2 text-muted">→</span>
                  <span className="font-medium">{rev.newValue}</span>
                </span>
              </p>
            ) : (
              <p className="text-sm text-foreground mt-1">
                {rev.type === 'added' ? 'Client requested' : 'Client removed'} {rev.field.toLowerCase()}
                {rev.newValue ? `: ${rev.newValue}` : ''}
              </p>
            )}
            <button
              type="button"
              onClick={() => onSourceClick(rev.sourceMessageId)}
              className="mt-1 text-xs text-accent hover:underline"
            >
              {messageLabel(rev.sourceMessageId, msg?.index)}
            </button>
          </li>
        );
      })}
    </ol>
  );
}
