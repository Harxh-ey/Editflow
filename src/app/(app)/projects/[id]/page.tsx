'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { ProjectHeader } from '@/components/projects/ProjectHeader';
import { OverviewTab } from '@/components/projects/OverviewTab';
import { RequirementsTable } from '@/components/requirements/RequirementsTable';
import { RevisionTimeline } from '@/components/revisions/RevisionTimeline';
import { MessagesView } from '@/components/projects/MessagesView';
import { ConversationInput } from '@/components/projects/ConversationInput';
import { TaskList } from '@/components/tasks/TaskList';
import { AlertCircle } from 'lucide-react';
import type { Project, Message, Requirement, Revision, Conflict, Task, Deliverable, Activity } from '@/types';
import type { TaskStatus } from '@/types';

interface FullProject extends Project {
  messages: Message[];
  requirements: Requirement[];
  revisions: Revision[];
  conflicts: Conflict[];
  tasks: Task[];
  deliverables: Deliverable[];
  activities: Activity[];
}

export default function ProjectPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const projectId = params.id as string;
  const activeTab = searchParams.get('tab') || 'overview';
  const highlightMessage = searchParams.get('msg') || undefined;

  const [project, setProject] = useState<FullProject | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProject = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/projects/${projectId}`);
      if (!res.ok) throw new Error('Failed to load project');
      const data = await res.json();
      setProject(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  const handleTabChange = (tab: string) => {
    router.push(`/projects/${projectId}?tab=${tab}`);
  };

  const handleSourceClick = (messageId: string) => {
    router.push(`/projects/${projectId}?tab=messages&msg=${messageId}`);
  };

  const handleTaskStatusChange = async (taskId: string, status: TaskStatus) => {
    try {
      await fetch(`/api/projects/${projectId}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      fetchProject();
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="h-16 bg-surface-tertiary rounded animate-pulse mb-6" />
        <div className="h-96 bg-surface-tertiary rounded animate-pulse" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 p-4 text-sm text-error bg-error-light rounded border border-error/20">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error || 'Project not found'}
        </div>
      </div>
    );
  }

  const hasConversation = project.messages && project.messages.length > 0;

  return (
    <div className="max-w-5xl mx-auto">
      <ProjectHeader
        project={project}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />

      <div className="mt-6">
        {/* Show conversation input if no messages yet */}
        {!hasConversation && activeTab === 'overview' && (
          <ConversationInput
            projectId={projectId}
            onAnalysisComplete={fetchProject}
          />
        )}

        {/* Overview Tab */}
        {activeTab === 'overview' && hasConversation && (
          <OverviewTab
            project={project}
            onSourceClick={handleSourceClick}
          />
        )}

        {/* Requirements Tab */}
        {activeTab === 'requirements' && (
          <RequirementsTable
            requirements={project.requirements || []}
            messages={project.messages || []}
            onSourceClick={handleSourceClick}
          />
        )}

        {/* Revisions Tab */}
        {activeTab === 'revisions' && (
          <RevisionTimeline
            revisions={project.revisions || []}
            messages={project.messages || []}
            onSourceClick={handleSourceClick}
          />
        )}

        {/* Messages Tab */}
        {activeTab === 'messages' && (
          <MessagesView
            messages={project.messages || []}
            highlightMessageId={highlightMessage}
            projectId={projectId}
            onRefresh={fetchProject}
          />
        )}

        {/* Tasks Tab */}
        {activeTab === 'tasks' && (
          <TaskList
            tasks={project.tasks || []}
            onStatusChange={handleTaskStatusChange}
          />
        )}
      </div>

    </div>
  );
}
