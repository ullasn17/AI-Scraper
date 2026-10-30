import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/session';
import { runAutoTrackCycle, getAutoTrackerStatus } from '@/lib/services/autoTracker';
import { AuditLog } from '@/models/AuditLog';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const status = getAutoTrackerStatus();
    return NextResponse.json({ success: true, status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    const status = message === 'FORBIDDEN' ? 403 : message === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    const body = await req.json().catch(() => ({}));
    const forceAll = Boolean(body.forceAll);

    // Run the tracking cycle
    const trackResult = await runAutoTrackCycle({ forceAll });

    await AuditLog.create({
      action: 'TRIGGER_AUTO_TRACK',
      actorId: admin.userId,
      actorEmail: admin.email,
      targetType: 'SOURCE',
      details: {
        forceAll,
        trackedCount: trackResult.trackedCount,
        results: trackResult.results,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Automatic website tracking completed for ${trackResult.trackedCount} active sites.`,
      ...trackResult,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    const status = message === 'FORBIDDEN' ? 403 : message === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

