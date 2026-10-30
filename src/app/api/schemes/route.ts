import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { Scheme } from '@/models/Scheme';
import { Source } from '@/models/Source';
import { buildSmartSearchFilter } from '@/lib/search/smartSearch';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);

    const query = searchParams.get('q') || '';
    const category = searchParams.get('category');
    const state = searchParams.get('state');
    const governmentLevel = searchParams.get('governmentLevel');
    const beneficiary = searchParams.get('beneficiary');
    const verificationStatus = searchParams.get('status') || 'VERIFIED';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '12', 10)));
    const sortBy = searchParams.get('sortBy') || 'recent';
    const ongoingOnly = searchParams.get('ongoing') === 'true';

    // Only display schemes from active enabled sources
    const enabledSources = await Source.find({ isEnabled: true }, { _id: 1 }).lean();
    const enabledSourceIds = enabledSources.map((s) => s._id);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const conditions: any[] = [
      { sourceId: { $in: enabledSourceIds } }
    ];

    if (verificationStatus !== 'ALL') {
      conditions.push({ verificationStatus });
    }

    if (category) {
      conditions.push({ category: category.toUpperCase() });
    }

    if (governmentLevel) {
      conditions.push({ governmentLevel: governmentLevel.toUpperCase() });
    }

    if (state && state !== 'All States' && state !== 'Central') {
      conditions.push({ state: new RegExp(`^${state}$`, 'i') });
    }

    if (beneficiary) {
      conditions.push({ beneficiaryGroups: { $in: [new RegExp(beneficiary, 'i')] } });
    }

    if (query) {
      const smartFilter = buildSmartSearchFilter(query);
      if (smartFilter && Object.keys(smartFilter).length > 0) {
        conditions.push(smartFilter);
      }
    }

    if (ongoingOnly) {
      conditions.push({
        $or: [
          { applicationEndDate: null },
          { applicationEndDate: { $gte: new Date() } }
        ]
      });
    }

    const filter = conditions.length > 0 ? { $and: conditions } : {};

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let sortOptions: any = { createdAt: -1 };
    if (sortBy === 'verified') {
      sortOptions = { lastCheckedAt: -1 };
    } else if (sortBy === 'name') {
      sortOptions = { name: 1 };
    }

    const total = await Scheme.countDocuments(filter);
    const schemes = await Scheme.find(filter)
      .sort(sortOptions)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return NextResponse.json({
      schemes,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
