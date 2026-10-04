'use client';

import Link from 'next/link';
import { cn, formatRelativeTime } from '@/lib/utils';
import { ArrowLeft } from 'lucide-react';
import type { Project } from '@/types';

interface ProjectHeaderProps {
  project: Project;
  activeTab: string;
  onTabChange: (_tab: string) => void;
}

const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'requirements', label: 'Requirements' },
  { id: 'revisions', label: 'Revisions' },
  { id: 'messages', label: 'Messages' },
  { id: 'tasks', label: 'Tasks' },
];

export function ProjectHeader({ project, activeTab, onTabChange }: ProjectHeaderProps) {
  return (
    <div>
      {/* Back + Title */}
      <div className="mb-4">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Projects
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground tracking-tight">
              {project.name}
            </h1>
            <p className="text-sm text-muted mt-0.5">
              {project.clientName}
              <span className="mx-2 text-border-strong">·</span>
              Updated {formatRelativeTime(project.updatedAt)}
              {project.isDemo && (
                <>
                  <span className="mx-2 text-border-strong">·</span>
                  <span className="text-xs bg-surface-tertiary text-muted-light px-1.5 py-0.5 rounded">Demo</span>
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <nav className="flex gap-0 border-b border-border" aria-label="Project sections">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
              activeTab === tab.id
                ? 'border-accent text-accent'
                : 'border-transparent text-muted hover:text-foreground hover:border-border-strong'
            )}
            aria-current={activeTab === tab.id ? 'page' : undefined}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
