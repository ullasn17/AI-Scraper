import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { CrawlJob } from '@/models/CrawlJob';
import { executeCrawl } from '@/scraper/crawler';
import { requireAdmin } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin(req);
    const { id } = await params;

    await connectDB();
    const oldJob = await CrawlJob.findById(id);
    if (!oldJob) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const newJob = await executeCrawl({
      sourceId: oldJob.sourceId ? String(oldJob.sourceId) : undefined,
      targetUrl: oldJob.targetUrl,
      forceAI: true,
    });

    return NextResponse.json({ success: true, job: newJob });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    const status = message === 'FORBIDDEN' ? 403 : message === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
