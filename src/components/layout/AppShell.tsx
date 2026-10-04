'use client';

import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { CommandBar } from './CommandBar';
import { Menu, X } from 'lucide-react';

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-surface border-b border-border flex items-center px-4 z-30">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded hover:bg-surface-tertiary text-foreground"
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
        <span className="ml-3 font-semibold text-foreground">EditFlow</span>
        <div className="ml-auto">
          <CommandBar />
        </div>
      </div>

      {mobileMenuOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 bg-black/20 z-30"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="lg:hidden fixed left-0 top-0 bottom-0 z-40">
            <Sidebar />
          </div>
        </>
      )}

      <main className="lg:ml-60 min-h-screen">
        <div className="hidden lg:flex justify-end px-10 pt-6">
          <CommandBar />
        </div>
        <div className="pt-6 lg:pt-2 px-6 lg:px-10 pb-16 mt-14 lg:mt-0">{children}</div>
      </main>
    </div>
  );
}
