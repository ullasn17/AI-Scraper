import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { Feedback } from '@/models/Feedback';
import { getCurrentUser } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { schemeId, feedbackType, comment, rating, contactEmail } = body;

    if (!comment || typeof comment !== 'string' || comment.trim().length === 0) {
      return NextResponse.json({ error: 'Comment is required' }, { status: 400 });
    }

    await connectDB();
    const user = await getCurrentUser(req);

    const feedback = await Feedback.create({
      userId: user?.userId,
      schemeId: schemeId || undefined,
      feedbackType: feedbackType || 'GENERAL',
      comment: comment.trim(),
      rating: rating ? Number(rating) : undefined,
      contactEmail: contactEmail || user?.email,
      status: 'PENDING',
    });

    return NextResponse.json({ success: true, feedbackId: feedback._id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
