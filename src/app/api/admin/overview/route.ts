import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { Scheme } from '@/models/Scheme';
import { Source } from '@/models/Source';
import { CrawlJob } from '@/models/CrawlJob';
import { SchemeVersion } from '@/models/SchemeVersion';
import { requireAdmin } from '@/lib/auth/session';
import { initAutoTracker, getAutoTrackerStatus } from '@/lib/services/autoTracker';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    await connectDB();
    initAutoTracker(15);

    const [
      totalSchemes,
      verifiedSchemes,
      pendingSchemes,
      totalSources,
      enabledSources,
      totalJobs,
      failedJobs,
      recentJobs,
      recentChanges,
    ] = await Promise.all([
      Scheme.countDocuments(),
      Scheme.countDocuments({ verificationStatus: 'VERIFIED' }),
      Scheme.countDocuments({ verificationStatus: 'PENDING' }),
      Source.countDocuments(),
      Source.countDocuments({ isEnabled: true }),
      CrawlJob.countDocuments(),
      CrawlJob.countDocuments({ status: 'FAILED' }),
      CrawlJob.find().sort({ createdAt: -1 }).limit(5).lean(),
      SchemeVersion.find().sort({ createdAt: -1 }).limit(5).lean(),
    ]);

    return NextResponse.json({
      metrics: {
        totalSchemes,
        verifiedSchemes,
        pendingSchemes,
        totalSources,
        enabledSources,
        totalJobs,
        failedJobs,
      },
      recentJobs,
      recentChanges,
      autoTrackerStatus: getAutoTrackerStatus(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    const status = message === 'FORBIDDEN' ? 403 : message === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
