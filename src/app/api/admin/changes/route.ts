import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { SchemeVersion } from '@/models/SchemeVersion';
import { requireAdmin } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    await connectDB();

    const { searchParams } = new URL(req.url);
    const schemeId = searchParams.get('schemeId');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: any = {};
    if (schemeId) filter.schemeId = schemeId;

    const changes = await SchemeVersion.find(filter)
      .populate('schemeId', 'name slug')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return NextResponse.json({ changes });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    const status = message === 'FORBIDDEN' ? 403 : message === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
