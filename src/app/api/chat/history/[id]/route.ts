import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { ChatSession } from '@/models/ChatSession';
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

    const session = await ChatSession.findOne({
      $or: [{ sessionId: id }, { _id: id }],
      userId: user.userId,
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found or not owned by you' }, { status: 404 });
    }

    await ChatSession.deleteOne({ _id: session._id });

    return NextResponse.json({ success: true, message: 'Chat session deleted' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    const status = message === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
