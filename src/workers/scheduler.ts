import connectDB from '../lib/mongodb';
import { Source } from '../models/Source';
import { executeCrawl } from '../scraper/crawler';

let isRunning = false;
let shouldStop = false;

async function runScheduledCycle() {
  if (isRunning || shouldStop) return;
  isRunning = true;

  try {
    await connectDB();
    const enabledSources = await Source.find({ isEnabled: true });

    for (const source of enabledSources) {
      if (shouldStop) break;

      const now = Date.now();
      const lastCrawled = source.lastCrawledAt ? new Date(source.lastCrawledAt).getTime() : 0;
      const intervalMs = (source.crawlFrequencyHours || 24) * 60 * 60 * 1000;

      if (now - lastCrawled >= intervalMs) {
        console.log(`[Scheduler] Crawling source: ${source.name} (${source.baseUrl})`);
        try {
          const job = await executeCrawl({ sourceId: String(source._id) });
          console.log(`[Scheduler] Job ${job._id} finished with status: ${job.status}`);
        } catch (err) {
          console.error(`[Scheduler] Error crawling ${source.name}:`, err);
        }
      }
    }
  } catch (error) {
    console.error('[Scheduler] Error in crawl cycle:', error);
  } finally {
    isRunning = false;
  }
}

export function startScheduler(intervalMinutes = 30) {
  console.log(`[Scheduler] SchemeSathi AI Background Worker started (interval: ${intervalMinutes}m)`);
  
  // Initial run
  runScheduledCycle();

  const intervalId = setInterval(runScheduledCycle, intervalMinutes * 60 * 1000);

  const shutdown = () => {
    console.log('[Scheduler] Shutting down background worker gracefully...');
    shouldStop = true;
    clearInterval(intervalId);
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

// Allow direct CLI invocation: tsx src/workers/scheduler.ts
if (require.main === module) {
  startScheduler(15);
}
