import { notFound } from 'next/navigation';
import Link from 'next/link';
import connectDB from '@/lib/mongodb';
import { Scheme } from '@/models/Scheme';
import { Source } from '@/models/Source';
import { 
  CheckCircle2, 
  MapPin, 
  Building2, 
  FileText, 
  Calendar, 
  ExternalLink, 
  ArrowLeft, 
  Clock
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function SchemeDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  await connectDB();

  const scheme = await Scheme.findOne({ slug }).lean();
  if (!scheme) {
    notFound();
  }

  // If scheme's source is disabled or deleted, hide it from public users
  if (scheme.sourceId) {
    const source = await Source.findById(scheme.sourceId, { isEnabled: 1 }).lean();
    if (!source || !source.isEnabled) {
      notFound();
    }
  }

  // Related schemes
  const relatedSchemes = await Scheme.find({
    _id: { $ne: scheme._id },
    $or: [{ category: scheme.category }, { state: scheme.state }],
    verificationStatus: 'VERIFIED',
  })
    .limit(3)
    .select('name slug summary category governmentLevel state')
    .lean();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/schemes"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-[#0b2545] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Scheme Directory
        </Link>
        <span className="text-xs text-slate-400">
          Last Checked: {new Date(scheme.lastCheckedAt || scheme.updatedAt).toLocaleDateString()}
        </span>
      </div>

      {/* Main Header Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-2.5 py-1 text-xs font-semibold uppercase tracking-wider bg-slate-100 text-slate-700 rounded-md">
            {scheme.category.replace('_', ' ')}
          </span>
          <span className="px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {scheme.verificationStatus}
          </span>
          <span className="px-2.5 py-1 text-xs font-semibold bg-slate-100 text-slate-600 rounded-md">
            v{scheme.version}.0
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0b2545] tracking-tight leading-snug">
          {scheme.name}
        </h1>

        <p className="text-sm text-slate-600 leading-relaxed font-normal">
          {scheme.summary}
        </p>

        {/* Ministry & State Metadata */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t border-slate-100 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#0d9488] shrink-0" />
            <div>
              <span className="block text-[11px] text-slate-400 uppercase font-semibold">Jurisdiction</span>
              <span className="font-medium text-slate-800">
                {scheme.governmentLevel === 'CENTRAL' ? 'All India (Central Government)' : scheme.state}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#0d9488] shrink-0" />
            <div>
              <span className="block text-[11px] text-slate-400 uppercase font-semibold">Nodal Ministry</span>
              <span className="font-medium text-slate-800 truncate block max-w-[220px]">
                {scheme.ministry || 'Not specified in available source'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#0d9488] shrink-0" />
            <div>
              <span className="block text-[11px] text-slate-400 uppercase font-semibold">Application Mode</span>
              <span className="font-medium text-slate-800">
                {scheme.applicationUrl ? 'Online via Government Portal' : 'Offline / Common Service Centres (CSC)'}
              </span>
            </div>
          </div>
        </div>

        {/* Application Window & Timeline Banner */}
        {(() => {
          const isExpired = scheme.applicationEndDate ? new Date(scheme.applicationEndDate) < new Date() : false;
          const isEmployment = scheme.category === 'EMPLOYMENT';
          const summaryIndicatesClosed = /applications (are )?closed|exam(ination)? concluded|provisional|past cycle/i.test(scheme.summary || '');
          const isClosed = isExpired || summaryIndicatesClosed;

          let statusBadgeText = 'Applications Open';
          let statusBadgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-300';
          let iconBg = 'bg-emerald-100 text-emerald-800';

          if (isClosed) {
            statusBadgeText = 'Applications Closed';
            statusBadgeClass = 'bg-rose-100 text-rose-800 border-rose-200';
            iconBg = 'bg-rose-100 text-rose-700';
          } else if (isEmployment && !scheme.applicationEndDate) {
            statusBadgeText = 'Check Official Notice';
            statusBadgeClass = 'bg-slate-100 text-slate-800 border-slate-300';
            iconBg = 'bg-slate-100 text-slate-700';
          }

          return (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Application Timeline & Status
                  </span>
                  <div className="flex flex-wrap items-center gap-2 mt-0.5">
                    {scheme.applicationStartDate && (
                      <span className="text-xs font-semibold text-slate-700">
                        Starts: {new Date(scheme.applicationStartDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    )}
                    {scheme.applicationStartDate && scheme.applicationEndDate && (
                      <span className="text-xs text-slate-400">•</span>
                    )}
                    {scheme.applicationEndDate ? (
                      <span className={`text-xs font-bold ${isExpired ? 'text-rose-600' : 'text-amber-800'}`}>
                        {isExpired ? 'Application Window Closed: ' : 'Closing Deadline: '}
                        {new Date(scheme.applicationEndDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    ) : isClosed ? (
                      <span className="text-xs font-bold text-rose-600">
                        Application registration has concluded for this notification cycle.
                      </span>
                    ) : isEmployment ? (
                      <span className="text-xs font-medium text-slate-600">
                        Registration schedule specified in official departmental notification.
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-emerald-700">
                        Continuous / Ongoing Citizen Entitlement (Open All Year)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase border ${statusBadgeClass}`}>
                  {statusBadgeText}
                </span>
              </div>
            </div>
          );
        })()}

        {/* Action Buttons */}
        <div className="pt-2 flex flex-wrap items-center gap-3">
          {scheme.applicationUrl && (
            <a
              href={scheme.applicationUrl}
              target="_blank"
              rel="noreferrer"
              className="px-5 py-2.5 bg-[#0b2545] hover:bg-[#0d9488] text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-2"
            >
              <span>Apply on Official Portal</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
          {scheme.officialSourceUrl && (
            <a
              href={scheme.officialSourceUrl}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5"
            >
              <span>Visit Official Source</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </a>
          )}
          <Link
            href={`/assistant?q=Explain+eligibility+for+${encodeURIComponent(scheme.name)}`}
            className="px-4 py-2.5 border border-teal-300 bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5"
          >
            <span>Ask AI About This Scheme</span>
          </Link>
        </div>
      </div>

      {/* Grid of Scheme Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column (2 cols) */}
        <div className="md:col-span-2 space-y-6">
          {/* Detailed Overview */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
            <h2 className="text-base font-bold text-[#0b2545]">Scheme Description & Scope</h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line">
              {scheme.description || scheme.summary}
            </p>
          </div>

          {/* Key Benefits */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h2 className="text-base font-bold text-[#0b2545]">Key Financial & Welfare Benefits</h2>
            {scheme.benefits && scheme.benefits.length > 0 ? (
              <ul className="space-y-2.5">
                {scheme.benefits.map((b, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-400">Not specified in the available source.</p>
            )}
          </div>

          {/* Eligibility Criteria */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h2 className="text-base font-bold text-[#0b2545]">Published Eligibility Criteria</h2>
            {scheme.eligibility && Array.isArray(scheme.eligibility) && scheme.eligibility.length > 0 ? (
              <ul className="space-y-2.5">
                {scheme.eligibility.map((e: string, i: number) => (
                  <li key={i} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0d9488] shrink-0 mt-2" />
                    <span>{e}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-400">Not specified in the available source.</p>
            )}

            {/* Age & Income Specific Limits */}
            {(scheme.ageCriteria?.minAge || scheme.ageCriteria?.maxAge || scheme.incomeCriteria?.maxAnnualIncome) && (
              <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-lg grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="font-semibold text-slate-700 block mb-0.5">Age Limits:</span>
                  <span className="text-slate-600">
                    {scheme.ageCriteria?.minAge ? `Min: ${scheme.ageCriteria.minAge} yrs` : 'No minimum'}
                    {' • '}
                    {scheme.ageCriteria?.maxAge ? `Max: ${scheme.ageCriteria.maxAge} yrs` : 'No maximum'}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-slate-700 block mb-0.5">Family Income Ceiling:</span>
                  <span className="text-slate-600">
                    {scheme.incomeCriteria?.maxAnnualIncome
                      ? `Up to ₹${scheme.incomeCriteria.maxAnnualIncome.toLocaleString('en-IN')}/year`
                      : 'Not specified'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Application Process */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h2 className="text-base font-bold text-[#0b2545]">Application Process & Guidelines</h2>
            {scheme.applicationSteps && scheme.applicationSteps.length > 0 ? (
              <ol className="space-y-3">
                {scheme.applicationSteps.map((step, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-xs sm:text-sm text-slate-700">
                    <span className="w-6 h-6 rounded-full bg-slate-100 text-[#0b2545] font-bold text-xs flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="pt-0.5">{step}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-xs text-slate-400">Not specified in the available source.</p>
            )}
          </div>
        </div>

        {/* Right Sidebar (1 col) */}
        <div className="space-y-6">
          {/* Required Documents Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
            <h3 className="font-bold text-sm text-[#0b2545] flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#0d9488]" />
              Required Documents
            </h3>
            {scheme.requiredDocuments && scheme.requiredDocuments.length > 0 ? (
              <ul className="space-y-2 pt-1">
                {scheme.requiredDocuments.map((doc, idx) => (
                  <li key={idx} className="text-xs text-slate-600 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                    <span>{doc}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-400">Not specified in the available source.</p>
            )}
          </div>

          {/* Official Verification Audit Details */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3 text-xs">
            <h3 className="font-bold text-[#0b2545]">Source Verification Audit</h3>
            <div className="space-y-2 text-slate-600">
              <div>
                <span className="block text-[11px] text-slate-400">Official Source:</span>
                <a
                  href={scheme.officialSourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#0d9488] hover:underline truncate block"
                >
                  {scheme.officialSourceUrl}
                </a>
              </div>
              <div>
                <span className="block text-[11px] text-slate-400">Audit Status:</span>
                <span className="font-medium text-slate-800">{scheme.verificationStatus}</span>
              </div>
              <div>
                <span className="block text-[11px] text-slate-400">Content Hash (SHA-256):</span>
                <span className="font-mono text-[10px] text-slate-500 truncate block">
                  {scheme.contentHash || 'Auto-generated on crawl'}
                </span>
              </div>
            </div>
          </div>

          {/* Related Schemes */}
          {relatedSchemes.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500">
                Related Schemes
              </h3>
              <div className="space-y-3">
                {relatedSchemes.map((rel) => (
                  <div key={String(rel._id)} className="border-b border-slate-100 pb-2 last:border-none">
                    <Link
                      href={`/schemes/${rel.slug}`}
                      className="font-bold text-xs text-[#0b2545] hover:text-[#0d9488] block"
                    >
                      {rel.name}
                    </Link>
                    <span className="text-[11px] text-slate-400">
                      {rel.governmentLevel === 'CENTRAL' ? 'Central' : rel.state}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
