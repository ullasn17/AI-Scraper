import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { Scheme } from '@/models/Scheme';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await connectDB();

    const stateAgg = await Scheme.aggregate([
      { $match: { verificationStatus: 'VERIFIED', state: { $exists: true, $ne: null } } },
      { $group: { _id: '$state', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const centralCount = await Scheme.countDocuments({
      verificationStatus: 'VERIFIED',
      governmentLevel: 'CENTRAL',
    });

    const states = stateAgg.map((s) => ({
      name: s._id,
      count: s.count,
    }));

    return NextResponse.json({
      centralCount,
      states,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
