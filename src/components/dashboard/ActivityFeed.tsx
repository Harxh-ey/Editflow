import { formatRelativeTime } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { FileText, GitBranch, AlertTriangle, CheckCircle, Plus, Clock } from 'lucide-react';
import type { Activity } from '@/types';

interface ActivityFeedProps {
  activities: Activity[];
}

const activityIcons: Record<Activity['type'], React.ElementType> = {
  requirement_added: Plus,
  revision_detected: GitBranch,
  conflict_detected: AlertTriangle,
  task_created: CheckCircle,
  status_changed: Clock,
  project_created: FileText,
};

const activityColors: Record<Activity['type'], string> = {
  requirement_added: 'text-accent',
  revision_detected: 'text-accent',
  conflict_detected: 'text-warning',
  task_created: 'text-success',
  status_changed: 'text-muted',
  project_created: 'text-muted',
};

export function ActivityFeed({ activities }: ActivityFeedProps) {
  return (
    <div className="space-y-0">
      {activities.map((activity, i) => {
        const Icon = activityIcons[activity.type] || FileText;
        const color = activityColors[activity.type] || 'text-muted';

        return (
          <div
            key={activity.id}
            className={cn(
              'flex items-start gap-3 py-3',
              i < activities.length - 1 && 'border-b border-border'
            )}
          >
            <div className={cn('mt-0.5 flex-shrink-0', color)}>
              <Icon className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground">{activity.description}</p>
            </div>
            <span className="text-xs text-muted-light flex-shrink-0">
              {formatRelativeTime(activity.timestamp)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
