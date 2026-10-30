import connectDB from '@/lib/mongodb';
import { Source } from '@/models/Source';
import { executeCrawl } from '@/scraper/crawler';

let isTrackingRunning = false;
let autoTrackerTimer: NodeJS.Timeout | null = null;
let lastCycleTime: Date | null = null;

export async function runAutoTrackCycle(options?: { forceAll?: boolean }): Promise<{
  trackedCount: number;
  results: Array<{ sourceName: string; status: string; created: number; updated: number }>;
}> {
  if (isTrackingRunning) {
    return { trackedCount: 0, results: [] };
  }

  isTrackingRunning = true;
  const results: Array<{ sourceName: string; status: string; created: number; updated: number }> = [];

  try {
    await connectDB();
    const enabledSources = await Source.find({ isEnabled: true });
    const now = Date.now();

    for (const source of enabledSources) {
      const lastCrawled = source.lastCrawledAt ? new Date(source.lastCrawledAt).getTime() : 0;
      const intervalMs = (source.crawlFrequencyHours || 24) * 60 * 60 * 1000;
      const isDue = options?.forceAll || !source.lastCrawledAt || now - lastCrawled >= intervalMs;

      if (isDue) {
        console.log(`[AutoTracker] Tracking website: ${source.name} (${source.baseUrl})`);
        try {
          const job = await executeCrawl({
            sourceId: String(source._id),
            targetUrl: source.baseUrl,
            forceAI: options?.forceAll,
          });

          results.push({
            sourceName: source.name,
            status: job.status,
            created: job.schemesCreated,
            updated: job.schemesUpdated,
          });
        } catch (err) {
          console.error(`[AutoTracker] Failed tracking ${source.name}:`, err);
          results.push({
            sourceName: source.name,
            status: 'FAILED',
            created: 0,
            updated: 0,
          });
        }
      }
    }

    lastCycleTime = new Date();
  } catch (error) {
    console.error('[AutoTracker] Cycle error:', error);
  } finally {
    isTrackingRunning = false;
  }

  return { trackedCount: results.length, results };
}

export function initAutoTracker(intervalMinutes = 15) {
  if (autoTrackerTimer) return;

  console.log(`[AutoTracker] Auto website tracking initialized (checks every ${intervalMinutes}m)`);
  // Delay first cycle by 5 seconds to let server settle
  setTimeout(() => {
    runAutoTrackCycle();
  }, 5000);

  autoTrackerTimer = setInterval(() => {
    runAutoTrackCycle();
  }, intervalMinutes * 60 * 1000);
}

export function getAutoTrackerStatus() {
  return {
    isTrackingRunning,
    lastCycleTime,
    hasActiveTimer: Boolean(autoTrackerTimer),
  };
}

