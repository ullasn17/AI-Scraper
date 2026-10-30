import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { Scheme } from '@/models/Scheme';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await connectDB();

    const counts = await Scheme.aggregate([
      { $match: { verificationStatus: 'VERIFIED' } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]);

    const countMap: Record<string, number> = {};
    counts.forEach((c) => {
      countMap[c._id] = c.count;
    });

    const categories = [
      { id: 'EDUCATION', label: 'Education & Scholarships', icon: 'GraduationCap', count: countMap['EDUCATION'] || 0 },
      { id: 'AGRICULTURE', label: 'Agriculture & Farming', icon: 'Sprout', count: countMap['AGRICULTURE'] || 0 },
      { id: 'HEALTHCARE', label: 'Healthcare & Wellness', icon: 'HeartPulse', count: countMap['HEALTHCARE'] || 0 },
      { id: 'HOUSING', label: 'Housing & Shelter', icon: 'Home', count: countMap['HOUSING'] || 0 },
      { id: 'FINANCIAL_SERVICES', label: 'Financial Services & Banking', icon: 'Banknote', count: countMap['FINANCIAL_SERVICES'] || 0 },
      { id: 'WOMEN_AND_CHILD', label: 'Women & Child Development', icon: 'Users', count: countMap['WOMEN_AND_CHILD'] || 0 },
      { id: 'EMPLOYMENT', label: 'Employment & Skills', icon: 'Briefcase', count: countMap['EMPLOYMENT'] || 0 },
      { id: 'BUSINESS_MSME', label: 'Business & MSME', icon: 'Store', count: countMap['BUSINESS_MSME'] || 0 },
      { id: 'SOCIAL_WELFARE', label: 'Social Welfare & Pensions', icon: 'ShieldCheck', count: countMap['SOCIAL_WELFARE'] || 0 },
      { id: 'OTHER', label: 'Other Public Benefits', icon: 'Layers', count: countMap['OTHER'] || 0 },
    ];

    return NextResponse.json({ categories });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
