'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, AlertCircle } from 'lucide-react';
import { ProjectCard } from '@/components/dashboard/ProjectCard';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { NewProjectDialog } from '@/components/projects/NewProjectDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import type { Project, Task, Activity } from '@/types';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

interface DashboardProject extends Project {
  tasks: Task[];
  requirementCount: number;
  unresolvedCount: number;
}

export default function DashboardPage() {
  const [projects, setProjects] = useState<DashboardProject[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewProject, setShowNewProject] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/projects');
      if (!res.ok) throw new Error('Failed to load projects');
      const data = await res.json();
      setProjects(data.projects || []);
      setActivities(data.activities || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateProject = async (data: { name: string; clientName: string; description?: string; deadline?: string | null }) => {
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create project');
      }
      const project = await res.json();
      setShowNewProject(false);
      window.location.href = `/projects/${project.id}`;
    } catch (err) {
      throw err;
    }
  };

  const activeProjects = projects.filter((p) => p.status === 'active');
  const needsAttention = activeProjects.filter(
    (p) => p.unresolvedCount > 0 || (p.deadline && new Date(p.deadline) <= new Date(Date.now() + 24 * 60 * 60 * 1000))
  );

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-foreground tracking-tight">
            {getGreeting()}.
          </h1>
          {!isLoading && activeProjects.length > 0 && (
            <p className="text-muted mt-1">
              {needsAttention.length > 0
                ? `${needsAttention.length} project${needsAttention.length === 1 ? '' : 's'} need${needsAttention.length === 1 ? 's' : ''} your attention.`
                : 'All projects are on track.'}
            </p>
          )}
        </div>
        <button
          onClick={() => setShowNewProject(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-accent hover:bg-accent-dark rounded transition-colors"
          aria-label="Create new project"
        >
          <Plus className="w-4 h-4" />
          New Project
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 mb-6 text-sm text-error bg-error-light rounded border border-error/20">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-24 bg-surface-tertiary rounded animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && projects.length === 0 && (
        <EmptyState
          icon={AlertCircle}
          title="No projects yet"
          description="Create your first project and paste a client conversation to get started."
          action={
            <button
              onClick={() => setShowNewProject(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-accent hover:bg-accent-dark rounded transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Project
            </button>
          }
        />
      )}

      {/* Active Projects */}
      {!isLoading && activeProjects.length > 0 && (
        <section className="mb-10">
          <h2 className="text-xs font-semibold text-muted uppercase tracking-wider mb-4">
            Active Projects
          </h2>
          <div className="space-y-3">
            {activeProjects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        </section>
      )}

      {/* Recent Activity */}
      {!isLoading && activities.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-muted uppercase tracking-wider mb-4">
            Recent Activity
          </h2>
          <ActivityFeed activities={activities} />
        </section>
      )}

      {/* New Project Dialog */}
      <NewProjectDialog
        isOpen={showNewProject}
        onClose={() => setShowNewProject(false)}
        onSubmit={handleCreateProject}
      />
    </div>
  );
}
