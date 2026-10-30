import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { Scheme } from '@/models/Scheme';
import { AuditLog } from '@/models/AuditLog';
import { requireAdmin } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin(req);
    const { id } = await params;
    const body = await req.json();
    const action = body.action || 'VERIFY'; // 'VERIFY' | 'REJECT'

    await connectDB();
    const scheme = await Scheme.findById(id);
    if (!scheme) {
      return NextResponse.json({ error: 'Scheme not found' }, { status: 404 });
    }

    scheme.verificationStatus = action === 'REJECT' ? 'REJECTED' : 'VERIFIED';
    await scheme.save();

    await AuditLog.create({
      action: action === 'REJECT' ? 'REJECT_SCHEME' : 'VERIFY_SCHEME',
      actorId: admin.userId,
      actorEmail: admin.email,
      targetType: 'SCHEME',
      targetId: id,
      details: { schemeName: scheme.name, newStatus: scheme.verificationStatus },
    });

    return NextResponse.json({ success: true, scheme });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    const status = message === 'FORBIDDEN' ? 403 : message === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
