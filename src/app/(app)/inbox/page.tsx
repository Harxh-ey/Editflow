'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatRelativeTime } from '@/lib/utils';
import { EmptyState } from '@/components/ui/EmptyState';
import { Inbox } from 'lucide-react';
import type { Message } from '@/types';

export default function InboxPage() {
  const [messages, setMessages] = useState<(Message & { projectName?: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/inbox')
      .then((r) => r.json())
      .then((d) => setMessages(d.messages || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight mb-1">Inbox</h1>
      <p className="text-sm text-muted mb-8">Client messages across projects, with original numbering.</p>
      {loading && <div className="h-32 bg-surface-tertiary animate-pulse rounded" />}
      {!loading && messages.length === 0 && (
        <EmptyState icon={Inbox} title="Inbox is quiet" description="Messages appear here after you analyze a conversation." />
      )}
      <ul>
        {messages.map((m) => (
          <li key={`${m.projectId}-${m.id}`} className="py-4 border-b border-border">
            <div className="flex items-baseline gap-2 text-xs text-muted mb-1">
              <span>#{m.index}</span>
              <Link href={`/projects/${m.projectId}?tab=messages&msg=${m.id}`} className="text-accent hover:underline">
                {m.projectName || 'Project'}
              </Link>
              <span>{formatRelativeTime(m.timestamp)}</span>
            </div>
            <p className="text-sm">
              <span className="font-medium">{m.senderName}</span>
              <span className="text-muted"> — {m.content}</span>
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
