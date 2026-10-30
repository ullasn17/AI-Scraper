import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { SavedScheme } from '@/models/SavedScheme';
import { requireAuth } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(req);
    const { id } = await params;

    await connectDB();

    const result = await SavedScheme.findOneAndDelete({
      $or: [{ _id: id }, { schemeId: id }],
      userId: user.userId,
    });

    if (!result) {
      return NextResponse.json({ error: 'Bookmark not found or not owned by you' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Bookmark removed' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    const status = message === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
