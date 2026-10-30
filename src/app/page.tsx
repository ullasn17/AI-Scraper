import Link from 'next/link';
import connectDB from '@/lib/mongodb';
import { Scheme } from '@/models/Scheme';
import { Source } from '@/models/Source';
import { 
  Search, 
  Sparkles, 
  GraduationCap, 
  Sprout, 
  HeartPulse, 
  Home, 
  Banknote, 
  Users, 
  Briefcase, 
  Store, 
  ShieldCheck, 
  ArrowRight, 
  CheckCircle2, 
  MapPin
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  let popularSchemes: any[] = [];
  let totalVerifiedCount = 0;

  try {
    await connectDB();

    // Get all enabled source IDs
    const enabledSources = await Source.find({ isEnabled: true }, { _id: 1 }).lean();
    const enabledSourceIds = enabledSources.map((s) => s._id);

    // Fetch popular / verified schemes from enabled sources
    popularSchemes = await Scheme.find({
      verificationStatus: 'VERIFIED',
      sourceId: { $in: enabledSourceIds },
    })
      .sort({ version: -1, createdAt: -1 })
      .limit(6)
      .lean();

    // Total verified count for enabled sources
    totalVerifiedCount = await Scheme.countDocuments({
      verificationStatus: 'VERIFIED',
      sourceId: { $in: enabledSourceIds },
    });
  } catch (error) {
    console.error('[HomePage] Error loading schemes from MongoDB:', error);
  }

  const categories = [
    { id: 'EDUCATION', label: 'Education & Scholarships', icon: GraduationCap, color: 'text-blue-600', bg: 'bg-blue-50' },
    { id: 'AGRICULTURE', label: 'Agriculture & Farmers', icon: Sprout, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { id: 'HEALTHCARE', label: 'Healthcare & Wellness', icon: HeartPulse, color: 'text-rose-600', bg: 'bg-rose-50' },
    { id: 'HOUSING', label: 'Housing & Urban Shelter', icon: Home, color: 'text-amber-600', bg: 'bg-amber-50' },
    { id: 'FINANCIAL_SERVICES', label: 'Financial Assistance', icon: Banknote, color: 'text-teal-600', bg: 'bg-teal-50' },
    { id: 'WOMEN_AND_CHILD', label: 'Women & Child Welfare', icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
    { id: 'EMPLOYMENT', label: 'Employment & Skills', icon: Briefcase, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { id: 'BUSINESS_MSME', label: 'Business & MSMEs', icon: Store, color: 'text-orange-600', bg: 'bg-orange-50' },
    { id: 'SOCIAL_WELFARE', label: 'Social Welfare & Pensions', icon: ShieldCheck, color: 'text-cyan-600', bg: 'bg-cyan-50' },
  ];

  return (
    <div className="space-y-16 pb-16">
      {/* Hero Section */}
      <section className="bg-white border-b border-slate-200 pt-16 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-teal-600" />
            <span>AI-Assisted Citizen Benefit Discovery Platform</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#0b2545] tracking-tight leading-tight">
            Find Government Schemes <br className="hidden sm:inline" />
            <span className="text-[#0d9488]">That Work for You</span>
          </h1>

          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Explore verified Central and State welfare programmes, educational scholarships, and farmer subsidies indexed directly from official government sources using Groq AI.
          </p>

          {/* Search Box Form */}
          <div className="pt-4 max-w-2xl mx-auto">
            <form action="/schemes" method="GET" className="relative flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  name="q"
                  placeholder="Tell us about yourself or search for a government scheme..."
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-transparent text-sm text-slate-900 shadow-sm"
                />
              </div>
              <button
                type="submit"
                className="px-6 py-3.5 bg-[#0b2545] hover:bg-[#0d9488] text-white font-medium text-sm rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2"
              >
                <span>Search</span>
              </button>
              <Link
                href="/assistant"
                className="px-5 py-3.5 bg-teal-600 hover:bg-teal-700 text-white font-medium text-sm rounded-xl shadow-sm transition-colors flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-4 h-4" />
                <span>AI Assistant</span>
              </Link>
            </form>

            <div className="mt-3 flex items-center justify-center gap-4 text-xs text-slate-600">
              <span>Popular searches:</span>
              <Link href="/schemes?q=kisan" className="underline hover:text-slate-900">PM Kisan</Link>
              <Link href="/schemes?category=EDUCATION" className="underline hover:text-slate-900">Scholarships</Link>
              <Link href="/schemes?state=Karnataka" className="underline hover:text-slate-900">Karnataka Yuva Nidhi</Link>
              <Link href="/schemes?q=ayushman" className="underline hover:text-slate-900">Ayushman Bharat</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Key Metric Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-md">
          <div className="space-y-1 text-center md:text-left">
            <h3 className="text-xl font-bold tracking-tight">Real-Time Verified Scheme Repository</h3>
            <p className="text-xs text-slate-300">
              Continuously audited against official ministries, India.gov.in, and Karnataka portals.
            </p>
          </div>
          <div className="flex items-center gap-6 sm:gap-10">
            <div className="text-center">
              <span className="block text-2xl sm:text-3xl font-extrabold text-[#14b8a6]">
                {totalVerifiedCount}
              </span>
              <span className="text-[11px] text-slate-300 uppercase tracking-wider">Verified Schemes</span>
            </div>
            <div className="text-center">
              <span className="block text-2xl sm:text-3xl font-extrabold text-white">100%</span>
              <span className="text-[11px] text-slate-300 uppercase tracking-wider">Official Sources</span>
            </div>
            <div className="text-center">
              <span className="block text-2xl sm:text-3xl font-extrabold text-emerald-400">0</span>
              <span className="text-[11px] text-slate-300 uppercase tracking-wider">Sensitve Data Stored</span>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-[#0b2545] tracking-tight">Explore by Category</h2>
            <p className="text-xs text-slate-600">Discover benefits categorized by sector and target beneficiary</p>
          </div>
          <Link
            href="/schemes"
            className="text-xs font-semibold text-[#0d9488] hover:underline flex items-center gap-1"
          >
            All Schemes <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-4">
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <Link
                key={cat.id}
                href={`/schemes?category=${cat.id}`}
                className="p-4 bg-white border border-slate-200 rounded-xl hover:border-[#0d9488] hover:shadow-sm transition-all group flex items-start gap-3.5"
              >
                <div className={`p-2.5 rounded-lg ${cat.bg} ${cat.color} shrink-0`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-[#0b2545] group-hover:text-[#0d9488] transition-colors">
                    {cat.label}
                  </h3>
                  <span className="text-xs text-slate-600 flex items-center gap-1 mt-1">
                    Explore welfare <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Popular Schemes from MongoDB */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-[#0b2545] tracking-tight">Featured Government Schemes</h2>
            <p className="text-xs text-slate-600">Flagship national and state assistance programmes</p>
          </div>
          <Link
            href="/schemes"
            className="text-xs font-semibold text-[#0d9488] hover:underline flex items-center gap-1"
          >
            View More <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {popularSchemes.map((scheme) => (
            <div
              key={String(scheme._id)}
              className="bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 bg-slate-100 text-slate-700 rounded">
                    {scheme.category.replace('_', ' ')}
                  </span>
                  <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Verified
                  </span>
                </div>

                <Link href={`/schemes/${scheme.slug}`}>
                  <h3 className="font-bold text-base text-[#0b2545] hover:text-[#0d9488] transition-colors line-clamp-2">
                    {scheme.name}
                  </h3>
                </Link>

                <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                  {scheme.summary}
                </p>

                <div className="flex flex-wrap items-center gap-2 pt-2 text-xs text-slate-600 border-t border-slate-100">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {scheme.governmentLevel === 'CENTRAL' ? 'All India (Central)' : scheme.state}
                  </span>
                  {scheme.ministry && (
                    <span className="truncate max-w-[180px] text-slate-400">
                      • {scheme.ministry}
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                <Link
                  href={`/schemes/${scheme.slug}`}
                  className="text-xs font-semibold text-[#0d9488] hover:underline flex items-center gap-1"
                >
                  View Details & Eligibility <ArrowRight className="w-3 h-3" />
                </Link>
                {scheme.applicationUrl && (
                  <a
                    href={scheme.applicationUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-slate-600 hover:text-[#0b2545] underline"
                  >
                    Portal
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
