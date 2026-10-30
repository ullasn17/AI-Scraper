import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { CrawlJob } from '@/models/CrawlJob';
import { requireAdmin } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    await connectDB();

    const jobs = await CrawlJob.find()
      .populate('sourceId', 'name baseUrl')
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();

    return NextResponse.json({ jobs });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    const status = message === 'FORBIDDEN' ? 403 : message === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
