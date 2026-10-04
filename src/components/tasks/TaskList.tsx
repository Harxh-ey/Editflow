'use client';

import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/ui/EmptyState';
import { CheckSquare } from 'lucide-react';
import type { Task, TaskStatus } from '@/types';

interface TaskListProps {
  tasks: Task[];
  onStatusChange: (_taskId: string, _status: TaskStatus) => void;
  showProject?: boolean;
}

const nextStatus: Record<TaskStatus, TaskStatus> = {
  todo: 'in_progress',
  in_progress: 'done',
  done: 'todo',
  blocked: 'todo',
};

export function TaskList({ tasks, onStatusChange, showProject }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <EmptyState
        icon={CheckSquare}
        title="No tasks yet"
        description="Tasks are created from requirements after a conversation is analyzed."
      />
    );
  }

  const groups: { key: string; label: string; items: Task[] }[] = [
    { key: 'todo', label: 'To do', items: tasks.filter((t) => t.status === 'todo' || t.status === 'blocked') },
    { key: 'in_progress', label: 'In progress', items: tasks.filter((t) => t.status === 'in_progress') },
    { key: 'done', label: 'Done', items: tasks.filter((t) => t.status === 'done') },
  ];

  return (
    <div className="space-y-8">
      {groups.map((group) => (
        <section key={group.key}>
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
            {group.label}
            <span className="ml-2 text-muted-light font-normal">{group.items.length}</span>
          </h3>
          <ul className="divide-y divide-border border-y border-border">
            {group.items.map((task) => (
              <li key={task.id} className="flex items-center gap-3 py-2.5">
                <button
                  type="button"
                  aria-label={`Mark ${task.title} as ${nextStatus[task.status]}`}
                  onClick={() => onStatusChange(task.id, nextStatus[task.status])}
                  className={cn(
                    'w-4 h-4 rounded-sm border flex-shrink-0',
                    task.status === 'done' ? 'bg-success border-success' : 'border-border-strong bg-surface'
                  )}
                />
                <span className={cn('flex-1 text-sm', task.status === 'done' && 'text-muted line-through')}>
                  {task.title}
                </span>
                {showProject && 'projectName' in task && (
                  <span className="text-xs text-muted">{String((task as Task & { projectName?: string }).projectName || '')}</span>
                )}
                <span className="text-xs text-muted-light capitalize">{task.priority}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
