import * as Sentry from '@sentry/nextjs';

export interface SpanAttributes {
  projectId?: string;
  workflowId?: string;
  step?: string;
  model?: string;
  op?: string;
  [key: string]: string | number | boolean | undefined;
}

export function isSentryConfigured(): boolean {
  return Boolean(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN);
}

export async function withSpan<T>(
  name: string,
  fn: (_span?: unknown) => Promise<T>,
  attributes?: SpanAttributes
): Promise<T> {
  if (!isSentryConfigured()) {
    return fn();
  }

  const startTime = Date.now();
  return Sentry.startSpan(
    {
      name,
      op: attributes?.op || 'editflow.pipeline',
      attributes: {
        ...attributes,
      },
    },
    async (span) => {
      try {
        if (attributes && span) {
          for (const [k, v] of Object.entries(attributes)) {
            if (v !== undefined) {
              span.setAttribute?.(k, v);
            }
          }
        }
        const result = await fn(span);
        const duration = Date.now() - startTime;
        span?.setAttribute?.('duration_ms', duration);
        return result;
      } catch (error) {
        Sentry.captureException(error, {
          extra: {
            ...attributes,
            spanName: name,
            duration_ms: Date.now() - startTime,
          },
        });
        throw error;
      }
    }
  );
}
