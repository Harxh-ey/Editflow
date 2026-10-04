'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Film,
  FolderOpen,
  Inbox,
  CheckSquare,
  GitBranch,
  Settings,
  CircleUser,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Projects', icon: FolderOpen },
  { href: '/inbox', label: 'Inbox', icon: Inbox },
  { href: '/tasks', label: 'Tasks', icon: CheckSquare },
  { href: '/revisions', label: 'Revisions', icon: GitBranch },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-60 bg-surface border-r border-border flex flex-col z-30">
      {/* Logo */}
      <div className="px-5 py-5 flex items-center gap-2.5">
        <div className="w-7 h-7 rounded bg-foreground flex items-center justify-center">
          <Film className="w-4 h-4 text-white" />
        </div>
        <span className="text-lg font-semibold text-foreground tracking-tight">EditFlow</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 mt-2" aria-label="Main navigation">
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/') || (item.href === '/dashboard' && pathname.startsWith('/projects'));
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-accent-light text-accent'
                      : 'text-muted hover:text-foreground hover:bg-surface-tertiary'
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom section */}
      <div className="px-3 pb-2">
        <div className="border-t border-border pt-3 mb-2">
          <Link
            href="/settings"
            className="flex items-center gap-3 px-3 py-2 rounded text-sm text-muted hover:text-foreground hover:bg-surface-tertiary transition-colors"
          >
            <Settings className="w-4 h-4" />
            Settings
          </Link>
        </div>
        <div className="flex items-center gap-3 px-3 py-2 text-sm text-muted">
          <CircleUser className="w-5 h-5" />
          <span>Video Editor</span>
        </div>
      </div>
    </aside>
  );
}
