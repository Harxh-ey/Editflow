import { cn } from '@/lib/utils';

interface StatusDotProps {
  variant: 'active' | 'completed' | 'warning' | 'error' | 'neutral';
  className?: string;
}

const dotStyles = {
  active: 'bg-accent',
  completed: 'bg-success',
  warning: 'bg-warning',
  error: 'bg-error',
  neutral: 'bg-muted-light',
};

export function StatusDot({ variant, className }: StatusDotProps) {
  return (
    <span
      className={cn('inline-block w-2 h-2 rounded-full', dotStyles[variant], className)}
      aria-hidden="true"
    />
  );
}
