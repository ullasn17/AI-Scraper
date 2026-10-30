import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/mongodb';
import { Scheme } from '@/models/Scheme';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await connectDB();
    const { slug } = await params;

    // Search by slug first, or by ObjectId
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = { slug };
    if (mongoose.Types.ObjectId.isValid(slug)) {
      query.$or = [{ slug }, { _id: slug }];
      delete query.slug;
    }

    const scheme = await Scheme.findOne(query).lean();
    if (!scheme) {
      return NextResponse.json({ error: 'Scheme not found' }, { status: 404 });
    }

    // Retrieve up to 3 related schemes from the same category or state
    const relatedSchemes = await Scheme.find({
      _id: { $ne: scheme._id },
      $or: [
        { category: scheme.category },
        { state: scheme.state },
      ],
      verificationStatus: 'VERIFIED',
    })
      .limit(3)
      .select('name slug summary category governmentLevel state')
      .lean();

    return NextResponse.json({ scheme, relatedSchemes });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
