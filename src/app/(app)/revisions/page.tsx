'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatRelativeTime } from '@/lib/utils';
import { EmptyState } from '@/components/ui/EmptyState';
import { GitBranch } from 'lucide-react';
import type { Revision } from '@/types';

export default function RevisionsPage() {
  const [revisions, setRevisions] = useState<(Revision & { projectName?: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/revisions')
      .then((r) => r.json())
      .then((d) => setRevisions(d.revisions || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight mb-1">Revisions</h1>
      <p className="text-sm text-muted mb-8">What clients changed, without overwriting the original request.</p>
      {loading && <div className="h-32 bg-surface-tertiary animate-pulse rounded" />}
      {!loading && revisions.length === 0 && (
        <EmptyState icon={GitBranch} title="No revisions yet" description="Changes show up here once a later message updates an earlier ask." />
      )}
      <ul>
        {revisions.map((rev) => (
          <li key={rev.id} className="py-4 border-b border-border">
            <div className="flex justify-between gap-4">
              <div>
                <Link href={`/projects/${rev.projectId}?tab=revisions`} className="text-xs text-accent hover:underline">
                  {rev.projectName}
                </Link>
                <p className="text-sm mt-1">
                  {rev.type === 'changed' ? (
                    <>
                      {rev.field}: <span className="line-through text-muted">{rev.oldValue}</span> → <span className="font-medium">{rev.newValue}</span>
                    </>
                  ) : (
                    <>
                      {rev.field} {rev.type}
                    </>
                  )}
                </p>
              </div>
              <span className="text-xs text-muted-light whitespace-nowrap">{formatRelativeTime(rev.timestamp)}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
