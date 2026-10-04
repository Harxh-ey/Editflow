'use client';

import { useEffect, useRef } from 'react';
import { cn, formatTime } from '@/lib/utils';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConversationInput } from '@/components/projects/ConversationInput';
import { MessageSquare } from 'lucide-react';
import type { Message } from '@/types';

interface MessagesViewProps {
  messages: Message[];
  highlightMessageId?: string;
  projectId: string;
  onRefresh: () => void;
}

export function MessagesView({ messages, highlightMessageId, projectId, onRefresh }: MessagesViewProps) {
  const refs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    if (!highlightMessageId) return;
    const el = refs.current[highlightMessageId];
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [highlightMessageId, messages]);

  if (messages.length === 0) {
    return (
      <EmptyState
        icon={MessageSquare}
        title="No messages yet"
        description="Paste the client conversation to start a project record."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-10">
      <ol className="space-y-0">
        {messages.map((msg) => (
          <li
            key={msg.id}
            ref={(node) => {
              refs.current[msg.id] = node;
            }}
            id={msg.id}
            className={cn(
              'py-4 border-b border-border',
              highlightMessageId === msg.id && 'bg-accent-light/60 -mx-3 px-3 rounded'
            )}
          >
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-xs font-medium text-muted-light">#{msg.index}</span>
              <span className="text-sm font-medium text-foreground">{msg.senderName}</span>
              <span className="text-xs text-muted-light">{formatTime(msg.timestamp)}</span>
            </div>
            <p className="text-sm text-foreground leading-relaxed">“{msg.content}”</p>
          </li>
        ))}
      </ol>
      <aside>
        <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Add more</h3>
        <ConversationInput projectId={projectId} onAnalysisComplete={onRefresh} compact />
      </aside>
    </div>
  );
}
