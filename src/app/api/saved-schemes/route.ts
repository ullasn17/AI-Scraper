import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { SavedScheme } from '@/models/SavedScheme';
import { Scheme } from '@/models/Scheme';
import { requireAuth } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    await connectDB();

    const bookmarks = await SavedScheme.find({ userId: user.userId })
      .populate({
        path: 'schemeId',
        model: Scheme,
        select: 'name slug summary category governmentLevel state benefits applicationUrl officialSourceUrl',
      })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ bookmarks });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    const status = message === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const body = await req.json();
    const { schemeId, notes } = body;

    if (!schemeId) {
      return NextResponse.json({ error: 'schemeId is required' }, { status: 400 });
    }

    await connectDB();

    const existing = await SavedScheme.findOne({
      userId: user.userId,
      schemeId,
    });

    if (existing) {
      return NextResponse.json({ success: true, message: 'Scheme already bookmarked', bookmark: existing });
    }

    const bookmark = await SavedScheme.create({
      userId: user.userId,
      schemeId,
      notes: notes || '',
    });

    return NextResponse.json({ success: true, bookmark });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    const status = message === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
