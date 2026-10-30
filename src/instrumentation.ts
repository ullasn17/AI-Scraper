export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initAutoTracker } = await import('./lib/services/autoTracker');
    initAutoTracker(15);
  }
}

