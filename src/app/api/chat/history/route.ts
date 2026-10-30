import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { ChatSession } from '@/models/ChatSession';
import { getCurrentUser } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');

    await connectDB();

    // If sessionId requested, retrieve that single session
    if (sessionId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const query: any = { sessionId };
      if (user) {
        query.$or = [{ userId: user.userId }, { sessionId }];
      }
      const session = await ChatSession.findOne(query).lean();
      if (!session) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }

      // Security check: if session is owned by a different user, block access
      if (session.userId && (!user || String(session.userId) !== user.userId)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      return NextResponse.json({ session });
    }

    // List all sessions for authenticated user
    if (!user) {
      return NextResponse.json({ sessions: [] });
    }

    const sessions = await ChatSession.find({ userId: user.userId })
      .select('sessionId title createdAt updatedAt')
      .sort({ updatedAt: -1 })
      .limit(20)
      .lean();

    return NextResponse.json({ sessions });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
