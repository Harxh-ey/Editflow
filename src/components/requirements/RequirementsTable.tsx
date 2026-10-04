'use client';

import { formatRelativeTime, messageLabel } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListChecks } from 'lucide-react';
import type { Message, Requirement } from '@/types';

interface RequirementsTableProps {
  requirements: Requirement[];
  messages: Message[];
  onSourceClick: (_messageId: string) => void;
}

const statusLabel: Record<Requirement['status'], string> = {
  confirmed: 'Confirmed',
  unresolved: 'Needs clarification',
  changed: 'Changed',
  removed: 'Removed',
};

const statusVariant: Record<Requirement['status'], 'success' | 'warning' | 'default' | 'error'> = {
  confirmed: 'success',
  unresolved: 'warning',
  changed: 'warning',
  removed: 'default',
};

export function RequirementsTable({ requirements, messages, onSourceClick }: RequirementsTableProps) {
  if (requirements.length === 0) {
    return (
      <EmptyState
        icon={ListChecks}
        title="No requirements yet"
        description="Paste a client conversation and analyze it to fill this list."
      />
    );
  }

  const byId = new Map(messages.map((m) => [m.id, m]));

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wider text-muted border-b border-border">
            <th className="py-2 pr-4 font-medium">Title</th>
            <th className="py-2 pr-4 font-medium">Value</th>
            <th className="py-2 pr-4 font-medium">Status</th>
            <th className="py-2 pr-4 font-medium">Evidence</th>
            <th className="py-2 font-medium">Last changed</th>
          </tr>
        </thead>
        <tbody>
          {requirements.map((req) => (
            <tr key={req.id} className="border-b border-border last:border-0">
              <td className="py-3 pr-4 font-medium text-foreground align-top">{req.title}</td>
              <td className="py-3 pr-4 text-muted align-top">{req.value || '—'}</td>
              <td className="py-3 pr-4 align-top">
                <Badge variant={statusVariant[req.status]}>{statusLabel[req.status]}</Badge>
              </td>
              <td className="py-3 pr-4 align-top">
                <div className="flex flex-wrap gap-1.5">
                  {req.sourceMessageIds.map((id) => {
                    const msg = byId.get(id);
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => onSourceClick(id)}
                        className="text-xs text-accent hover:underline"
                      >
                        {messageLabel(id, msg?.index)}
                      </button>
                    );
                  })}
                </div>
              </td>
              <td className="py-3 text-muted align-top whitespace-nowrap">{formatRelativeTime(req.updatedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
