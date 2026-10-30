import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { Scheme } from '@/models/Scheme';
import { SchemeVersion } from '@/models/SchemeVersion';
import { AuditLog } from '@/models/AuditLog';
import { requireAdmin } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin(req);
    const { id } = await params;
    const body = await req.json();

    await connectDB();
    const scheme = await Scheme.findById(id);
    if (!scheme) {
      return NextResponse.json({ error: 'Scheme not found' }, { status: 404 });
    }

    // Snapshot version before modification
    await SchemeVersion.create({
      schemeId: scheme._id,
      version: scheme.version,
      snapshot: scheme.toObject() as unknown as Record<string, unknown>,
      changedBy: admin.userId,
      changeReason: body.changeReason || 'Manual administrator edit',
    });

    // Update allowable fields
    if (body.name) scheme.name = body.name;
    if (body.summary) scheme.summary = body.summary;
    if (body.description) scheme.description = body.description;
    if (body.category) scheme.category = body.category;
    if (body.governmentLevel) scheme.governmentLevel = body.governmentLevel;
    if (body.state !== undefined) scheme.state = body.state;
    if (body.ministry !== undefined) scheme.ministry = body.ministry;
    if (body.benefits) scheme.benefits = body.benefits;
    if (body.eligibility) scheme.eligibility = body.eligibility;
    if (body.requiredDocuments) scheme.requiredDocuments = body.requiredDocuments;
    if (body.applicationSteps) scheme.applicationSteps = body.applicationSteps;
    if (body.applicationUrl !== undefined) scheme.applicationUrl = body.applicationUrl;
    if (body.verificationStatus) scheme.verificationStatus = body.verificationStatus;

    scheme.version += 1;
    await scheme.save();

    await AuditLog.create({
      action: 'EDIT_SCHEME',
      actorId: admin.userId,
      actorEmail: admin.email,
      targetType: 'SCHEME',
      targetId: id,
      details: { version: scheme.version, updatedFields: Object.keys(body) },
    });

    return NextResponse.json({ success: true, scheme });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    const status = message === 'FORBIDDEN' ? 403 : message === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
