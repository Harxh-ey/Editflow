'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="max-w-md">
        <h1 className="text-lg font-semibold mb-2">Something went wrong</h1>
        <p className="text-sm text-muted mb-4">The workspace hit an unexpected error. You can try again without losing your projects.</p>
        <button
          type="button"
          onClick={reset}
          className="px-4 py-2 text-sm font-medium text-white bg-accent rounded"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
