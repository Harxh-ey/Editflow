'use client';

import { useEffect, useState } from 'react';
import { TaskList } from '@/components/tasks/TaskList';
import type { Task, TaskStatus } from '@/types';

export default function TasksPage() {
  const [tasks, setTasks] = useState<(Task & { projectName?: string })[]>([]);

  const load = () => {
    fetch('/api/tasks')
      .then((r) => r.json())
      .then((d) => setTasks(d.tasks || []));
  };

  useEffect(() => {
    load();
  }, []);

  const onStatusChange = async (taskId: string, status: TaskStatus) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    await fetch(`/api/projects/${task.projectId}/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    load();
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight mb-1">Tasks</h1>
      <p className="text-sm text-muted mb-8">Work generated from client requirements. Keep this list short on purpose.</p>
      <TaskList tasks={tasks} onStatusChange={onStatusChange} showProject />
    </div>
  );
}
