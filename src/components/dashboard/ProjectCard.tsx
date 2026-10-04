import Link from 'next/link';
import { cn, formatDeadline } from '@/lib/utils';
import { AlertTriangle, Clock } from 'lucide-react';
import type { Project, Task } from '@/types';

interface ProjectCardProps {
  project: Project & { tasks: Task[]; unresolvedCount: number };
}

export function ProjectCard({ project }: ProjectCardProps) {
  const totalTasks = project.tasks.length;
  const doneTasks = project.tasks.filter((t) => t.status === 'done').length;
  const deadlineText = formatDeadline(project.deadline);
  const isOverdue = deadlineText === 'Overdue';
  const isDueSoon = deadlineText === 'Due soon' || deadlineText.startsWith('Due in');

  return (
    <Link
      href={`/projects/${project.id}`}
      className="group block bg-surface border border-border rounded-md hover:border-border-strong hover:shadow-card transition-all"
    >
      <div className="flex items-center gap-4 px-5 py-4">
        {/* Left accent */}
        <div
          className={cn(
            'w-1 self-stretch rounded-full',
            isOverdue ? 'bg-error' : isDueSoon ? 'bg-warning' : 'bg-accent'
          )}
        />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-foreground truncate group-hover:text-accent transition-colors">
              {project.name}
            </h3>
            {project.isDemo && (
              <span className="text-xs text-muted-light bg-surface-tertiary px-1.5 py-0.5 rounded">Demo</span>
            )}
          </div>
          <p className="text-xs text-muted">{project.clientName}</p>
        </div>

        {/* Task progress */}
        <div className="text-right flex-shrink-0">
          <div className="text-sm font-medium text-foreground">
            {doneTasks} / {totalTasks} tasks
          </div>
          {totalTasks > 0 && (
            <div className="w-24 h-1.5 bg-surface-tertiary rounded-full mt-1.5">
              <div
                className="h-full bg-accent rounded-full transition-all"
                style={{ width: `${(doneTasks / totalTasks) * 100}%` }}
              />
            </div>
          )}
        </div>

        {/* Deadline */}
        <div className={cn(
          'flex items-center gap-1.5 text-xs flex-shrink-0',
          isOverdue ? 'text-error' : isDueSoon ? 'text-warning' : 'text-muted'
        )}>
          <Clock className="w-3.5 h-3.5" />
          {deadlineText}
        </div>

        {/* Warning count */}
        {project.unresolvedCount > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-warning flex-shrink-0">
            <AlertTriangle className="w-3.5 h-3.5" />
            {project.unresolvedCount}
          </div>
        )}
      </div>
    </Link>
  );
}
