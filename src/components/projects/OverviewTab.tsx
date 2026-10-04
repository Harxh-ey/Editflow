import { cn, formatDeadlineLabel, formatRelativeTime } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Check, AlertTriangle, Clock, ArrowRight, ExternalLink, Monitor } from 'lucide-react';
import type { Project, Requirement, Revision, Conflict, Task, Deliverable, Activity } from '@/types';

interface OverviewTabProps {
  project: Project & {
    requirements: Requirement[];
    revisions: Revision[];
    conflicts: Conflict[];
    tasks: Task[];
    deliverables: Deliverable[];
    activities: Activity[];
  };
  onSourceClick: (_messageId: string) => void;
}

export function OverviewTab({ project, onSourceClick }: OverviewTabProps) {
  const confirmed = project.requirements.filter((r) => r.status === 'confirmed');
  const unresolved = project.requirements.filter((r) => r.status === 'unresolved' || r.status === 'changed');
  const openConflicts = project.conflicts.filter((c) => c.status === 'open');
  const latestRevisions = [...project.revisions]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 3);
  const doneTasks = project.tasks.filter((t) => t.status === 'done').length;

  return (
    <div className="space-y-8">
      {/* Deliverable + Deadline row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Deliverable */}
        {project.deliverables.length > 0 && (
          <section>
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Deliverable</h3>
            {project.deliverables.map((d) => (
              <div key={d.id} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-accent-light flex items-center justify-center">
                  <Monitor className="w-4 h-4 text-accent" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{d.title}</p>
                  <p className="text-xs text-muted">
                    {[d.duration, d.aspectRatio, d.format].filter(Boolean).join(' · ')}
                  </p>
                </div>
              </div>
            ))}
          </section>
        )}

        {/* Deadline */}
        <section>
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Deadline</h3>
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-8 h-8 rounded flex items-center justify-center',
              formatDeadlineLabel(project.deadline) === 'No deadline' ? 'bg-surface-tertiary' : 'bg-warning-light'
            )}>
              <Clock className="w-4 h-4 text-warning" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{formatDeadlineLabel(project.deadline)}</p>
              {project.deadline && (
                <p className="text-xs text-muted">
                  {new Date(project.deadline).toLocaleString('en-US', {
                    weekday: 'short', month: 'short', day: 'numeric',
                    hour: 'numeric', minute: '2-digit', hour12: true,
                  })}
                </p>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Task Progress */}
      <section>
        <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Progress</h3>
        <div className="flex items-center gap-4">
          <div className="flex-1 h-2 bg-surface-tertiary rounded-full">
            <div
              className="h-full bg-accent rounded-full transition-all"
              style={{ width: `${project.tasks.length > 0 ? (doneTasks / project.tasks.length) * 100 : 0}%` }}
            />
          </div>
          <span className="text-sm font-medium text-foreground">
            {doneTasks} / {project.tasks.length} tasks
          </span>
        </div>
      </section>

      {/* Requirements Summary */}
      <section>
        <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Requirements</h3>
        <div className="space-y-2">
          {confirmed.map((req) => (
            <div key={req.id} className="flex items-start gap-2.5 py-1.5">
              <Check className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
              <span className="text-sm text-foreground">{req.title}</span>
              {req.value && <span className="text-xs text-muted ml-auto">{req.value}</span>}
            </div>
          ))}
          {unresolved.map((req) => (
            <div key={req.id} className="flex items-start gap-2.5 py-1.5">
              <AlertTriangle className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
              <span className="text-sm text-foreground">{req.title}</span>
              <Badge variant="warning" className="ml-auto">
                {req.status === 'changed' ? 'Changed' : 'Needs clarification'}
              </Badge>
            </div>
          ))}
        </div>
      </section>

      {/* Conflicts */}
      {openConflicts.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Issues</h3>
          {openConflicts.map((conflict) => (
            <div
              key={conflict.id}
              className="border-l-2 border-warning bg-warning-light/30 rounded-r px-4 py-3 mb-3"
            >
              <p className="text-sm font-medium text-foreground mb-1">Something doesn&apos;t line up</p>
              <p className="text-sm text-muted mb-2">{conflict.description}</p>
              <p className="text-xs text-muted">
                <span className="font-medium">Recommended:</span> {conflict.suggestedAction}
              </p>
              {conflict.sourceMessageIds.length > 0 && (
                <div className="flex gap-2 mt-2">
                  {conflict.sourceMessageIds.map((id) => (
                    <button
                      key={id}
                      onClick={() => onSourceClick(id)}
                      className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Message {id.replace('msg_', '#')}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </section>
      )}

      {/* Recent Changes */}
      {latestRevisions.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Recent Changes</h3>
          <div className="space-y-3">
            {latestRevisions.map((rev) => (
              <div key={rev.id} className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
                <div className="flex-1">
                  {rev.type === 'changed' ? (
                    <p className="text-sm text-foreground">
                      <span className="font-medium">{rev.field}:</span>{' '}
                      <span className="text-muted line-through">{rev.oldValue}</span>{' '}
                      <ArrowRight className="w-3 h-3 inline text-muted mx-1" />
                      <span className="font-medium">{rev.newValue}</span>
                    </p>
                  ) : (
                    <p className="text-sm text-foreground">
                      <span className="font-medium">{rev.field}</span> {rev.type === 'added' ? 'added' : 'removed'}
                      {rev.newValue && `: ${rev.newValue}`}
                    </p>
                  )}
                  <button
                    onClick={() => onSourceClick(rev.sourceMessageId)}
                    className="text-xs text-accent hover:underline mt-0.5 inline-flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    View conversation
                  </button>
                </div>
                <span className="text-xs text-muted-light flex-shrink-0">
                  {formatRelativeTime(rev.timestamp)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
