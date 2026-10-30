import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { Scheme } from '@/models/Scheme';
import { requireAdmin } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    await connectDB();

    const pendingSchemes = await Scheme.find({ verificationStatus: 'PENDING' })
      .sort({ updatedAt: -1 })
      .lean();

    return NextResponse.json({ schemes: pendingSchemes });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    const status = message === 'FORBIDDEN' ? 403 : message === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
