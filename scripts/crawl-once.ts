import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.substring(0, idx).trim();
        let val = trimmed.substring(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.substring(1, val.length - 1);
        }
        process.env[key] = val;
      }
    }
  }
}

import connectDB from '../src/lib/mongodb';
import { executeCrawl } from '../src/scraper/crawler';

async function main() {
  const targetUrl = process.argv[2] || 'https://www.myscheme.gov.in/';
  console.log(`[CrawlOnce] Starting single crawl run for: ${targetUrl}`);

  await connectDB();
  try {
    const job = await executeCrawl({
      targetUrl,
      forceAI: true,
    });
    console.log(`[CrawlOnce] Crawl completed with status: ${job.status}`);
    console.log(`[CrawlOnce] Schemes discovered: ${job.schemesFound}, Created: ${job.schemesCreated}, Updated: ${job.schemesUpdated}`);
    console.log('[CrawlOnce] Logs:\n' + job.logs.join('\n'));
    process.exit(0);
  } catch (err) {
    console.error('[CrawlOnce] Error during crawl execution:', err);
    process.exit(1);
  }
}

main();
