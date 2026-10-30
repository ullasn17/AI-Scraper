import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { Source } from '@/models/Source';
import { Scheme } from '@/models/Scheme';
import { CrawlJob } from '@/models/CrawlJob';
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
    const source = await Source.findById(id);
    if (!source) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }

    if (body.isEnabled !== undefined) source.isEnabled = Boolean(body.isEnabled);
    if (body.name) source.name = body.name;
    if (body.crawlFrequencyHours) source.crawlFrequencyHours = Number(body.crawlFrequencyHours);
    if (body.permissionNotes) source.permissionNotes = body.permissionNotes;

    await source.save();

    await AuditLog.create({
      action: 'UPDATE_SOURCE',
      actorId: admin.userId,
      actorEmail: admin.email,
      targetType: 'SOURCE',
      targetId: id,
      details: body,
    });

    return NextResponse.json({ success: true, source });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    const status = message === 'FORBIDDEN' ? 403 : message === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin(req);
    const { id } = await params;

    await connectDB();
    const source = await Source.findById(id);
    if (!source) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }

    let sourceHostname = '';
    try {
      sourceHostname = new URL(source.baseUrl).hostname.toLowerCase();
    } catch {}

    // Match all schemes associated with this source:
    // 1. By direct sourceId
    // 2. By matching officialSourceUrl containing the source's exact domain
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const schemeDeleteConditions: any[] = [{ sourceId: source._id }];
    if (sourceHostname) {
      schemeDeleteConditions.push({
        officialSourceUrl: { $regex: sourceHostname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' },
      });
    }

    const schemeDeleteRes = await Scheme.deleteMany({ $or: schemeDeleteConditions });

    // Also delete any associated crawl jobs
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const jobDeleteConditions: any[] = [{ sourceId: source._id }];
    if (sourceHostname) {
      jobDeleteConditions.push({ targetUrl: { $regex: sourceHostname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } });
    }
    await CrawlJob.deleteMany({ $or: jobDeleteConditions });

    // Delete the source document
    await Source.findByIdAndDelete(id);

    await AuditLog.create({
      action: 'DELETE_SOURCE',
      actorId: admin.userId,
      actorEmail: admin.email,
      targetType: 'SOURCE',
      targetId: id,
      details: {
        name: source.name,
        baseUrl: source.baseUrl,
        deletedSchemesCount: schemeDeleteRes.deletedCount,
        deletedAt: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Source "${source.name}" and ${schemeDeleteRes.deletedCount} associated schemes were deleted.`,
      deletedSchemesCount: schemeDeleteRes.deletedCount,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    const status = message === 'FORBIDDEN' ? 403 : message === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
