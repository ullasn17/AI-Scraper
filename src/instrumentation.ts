export async function register() {
  // Never run long-running background crawler intervals inside serverless runtimes (Vercel)
  if (process.env.NEXT_RUNTIME === 'nodejs' && !process.env.VERCEL && process.env.CRAWLER_ENABLED === 'true') {
    try {
      const { initAutoTracker } = await import('./lib/services/autoTracker');
      initAutoTracker(15);
    } catch (err) {
      console.error('[Instrumentation] AutoTracker initialization skipped:', err);
    }
  }
}

