'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Search, 
  MapPin, 
  Bookmark, 
  Share2, 
  ArrowRight, 
  LayoutGrid, 
  List as ListIcon, 
  Check, 
  AlertCircle,
  ExternalLink,
  Calendar,
  Clock,
  X
} from 'lucide-react';

interface SchemeItem {
  _id: string;
  name: string;
  slug: string;
  summary: string;
  category: string;
  governmentLevel: 'CENTRAL' | 'STATE';
  state?: string;
  ministry?: string;
  benefits?: string[];
  eligibility?: string[];
  beneficiaryGroups?: string[];
  officialSourceUrl?: string;
  applicationUrl?: string;
  applicationStartDate?: string | null;
  applicationEndDate?: string | null;
  lastCheckedAt?: string;
}

const CATEGORIES = [
  'ALL',
  'EDUCATION',
  'AGRICULTURE',
  'HEALTHCARE',
  'HOUSING',
  'FINANCIAL_SERVICES',
  'WOMEN_AND_CHILD',
  'EMPLOYMENT',
  'BUSINESS_MSME',
  'SOCIAL_WELFARE',
  'OTHER',
];

const STATES = [
  'All States',
  'Central',
  'Karnataka',
  'Maharashtra',
  'Tamil Nadu',
  'Uttar Pradesh',
  'Gujarat',
  'Rajasthan',
  'Kerala',
  'Madhya Pradesh',
  'Telangana',
  'Andhra Pradesh',
  'Delhi',
];

function SchemeExplorerContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [schemes, setSchemes] = useState<SchemeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 12, totalPages: 1 });
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [savedSchemeIds, setSavedSchemeIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filters state
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [category, setCategory] = useState(searchParams.get('category') || 'ALL');
  const [state, setState] = useState(searchParams.get('state') || 'All States');
  const [governmentLevel, setGovernmentLevel] = useState(searchParams.get('level') || 'ALL');
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || 'recent');
  const [ongoingOnly, setOngoingOnly] = useState(searchParams.get('ongoing') === 'true');
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1', 10));

  // Load existing bookmarks
  useEffect(() => {
    fetch('/api/saved-schemes')
      .then((res) => res.json())
      .then((data) => {
        if (data?.bookmarks) {
          const ids = new Set<string>(
            data.bookmarks.map((b: { schemeId: { _id?: string } | string }) =>
              typeof b.schemeId === 'object' && b.schemeId?._id ? b.schemeId._id : String(b.schemeId)
            )
          );
          setSavedSchemeIds(ids);
        }
      })
      .catch(() => {});
  }, []);

  const fetchSchemes = async () => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (category !== 'ALL') params.set('category', category);
    if (state !== 'All States') {
      if (state === 'Central') {
        params.set('governmentLevel', 'CENTRAL');
      } else {
        params.set('state', state);
      }
    }
    if (governmentLevel !== 'ALL') params.set('governmentLevel', governmentLevel);
    if (sortBy) params.set('sortBy', sortBy);
    if (ongoingOnly) params.set('ongoing', 'true');
    params.set('page', String(page));
    params.set('limit', '12');

    try {
      const res = await fetch(`/api/schemes?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch schemes');
      setSchemes(data.schemes || []);
      setPagination(data.pagination || { total: 0, page: 1, limit: 12, totalPages: 1 });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error loading schemes';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchemes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, state, governmentLevel, sortBy, ongoingOnly, page]);

  // When user clears the search bar completely, automatically refresh the list
  useEffect(() => {
    if (query === '') {
      fetchSchemes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchSchemes();
  };

  const handleClearQuery = () => {
    setQuery('');
    setPage(1);
  };

  const handleBookmarkToggle = async (schemeId: string) => {
    const isBookmarked = savedSchemeIds.has(schemeId);
    try {
      if (isBookmarked) {
        await fetch(`/api/saved-schemes/${schemeId}`, { method: 'DELETE' });
        setSavedSchemeIds((prev) => {
          const next = new Set(prev);
          next.delete(schemeId);
          return next;
        });
      } else {
        const res = await fetch('/api/saved-schemes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ schemeId }),
        });
        if (res.status === 401) {
          router.push('/login');
          return;
        }
        setSavedSchemeIds((prev) => new Set(prev).add(schemeId));
      }
    } catch {
      // error handling
    }
  };

  const handleShare = (slug: string, schemeId: string) => {
    const url = `${window.location.origin}/schemes/${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedId(schemeId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Title & Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-[#0b2545] tracking-tight">
            Explore Government Schemes
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Search across {pagination.total} officially indexed welfare benefits, subsidies, and scholarships
          </p>
        </div>

        {/* View toggles & Sort */}
        <div className="flex items-center gap-3">
          <div className="flex items-center border border-slate-200 rounded-lg p-0.5 bg-white">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-slate-100 text-[#0b2545]' : 'text-slate-400'}`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-slate-100 text-[#0b2545]' : 'text-slate-400'}`}
              title="List View"
            >
              <ListIcon className="w-4 h-4" />
            </button>
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#0d9488]"
          >
            <option value="recent">Recently Added</option>
            <option value="verified">Recently Verified</option>
            <option value="name">Alphabetical (A-Z)</option>
          </select>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search scheme name, ministry, benefits, or keywords..."
              className="w-full pl-10 pr-9 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d9488] text-slate-900"
            />
            {query && (
              <button
                type="button"
                onClick={handleClearQuery}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
                title="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            type="submit"
            className="px-5 py-2 bg-[#0b2545] hover:bg-[#0d9488] text-white font-medium text-sm rounded-lg transition-colors"
          >
            Search
          </button>
        </form>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              State / Region
            </label>
            <select
              value={state}
              onChange={(e) => {
                setState(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
            >
              {STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Government Level
            </label>
            <select
              value={governmentLevel}
              onChange={(e) => {
                setGovernmentLevel(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
            >
              <option value="ALL">All Levels (Central & State)</option>
              <option value="CENTRAL">Central Government</option>
              <option value="STATE">State Government</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Application Status
            </label>
            <button
              type="button"
              onClick={() => {
                setOngoingOnly(!ongoingOnly);
                setPage(1);
              }}
              className={`w-full px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all flex items-center justify-center gap-1.5 ${
                ongoingOnly
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{ongoingOnly ? 'Active / Ongoing Only' : 'All Schemes'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Results Container */}
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-[#0d9488] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500">Querying verified MongoDB scheme database...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      ) : schemes.length === 0 ? (
        <div className="py-16 text-center bg-white border border-slate-200 rounded-xl p-8 space-y-4">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-base text-[#0b2545]">No Matching Schemes Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Try adjusting your search keywords, clearing specific state filters, or ask our AI Assistant in the chat widget for personalized discovery.
          </p>
          <button
            onClick={() => {
              setQuery('');
              setCategory('ALL');
              setState('All States');
              setGovernmentLevel('ALL');
            }}
            className="px-4 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 transition-colors"
          >
            Reset Filters
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {schemes.map((scheme) => (
            <div
              key={scheme._id}
              className="bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 bg-slate-100 text-slate-700 rounded">
                    {scheme.category.replace('_', ' ')}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleBookmarkToggle(scheme._id)}
                      className={`p-1 rounded hover:bg-slate-100 transition-colors ${
                        savedSchemeIds.has(scheme._id) ? 'text-amber-500 fill-amber-500' : 'text-slate-400'
                      }`}
                      title="Bookmark Scheme"
                    >
                      <Bookmark className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleShare(scheme.slug, scheme._id)}
                      className="p-1 rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                      title="Share Link"
                    >
                      {copiedId === scheme._id ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Share2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <Link href={`/schemes/${scheme.slug}`}>
                  <h3 className="font-bold text-base text-[#0b2545] hover:text-[#0d9488] transition-colors line-clamp-2">
                    {scheme.name}
                  </h3>
                </Link>

                <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                  {scheme.summary}
                </p>

                <div className="flex items-center gap-2 pt-2 text-xs text-slate-500 border-t border-slate-100">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">
                    {scheme.governmentLevel === 'CENTRAL' ? 'Central' : scheme.state}
                    {scheme.ministry ? ` • ${scheme.ministry}` : ''}
                  </span>
                </div>

                {/* Application Window & Deadlines */}
                <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-1 text-[11px]">
                  {scheme.applicationEndDate ? (
                    (() => {
                      const isExpired = new Date(scheme.applicationEndDate) < new Date();
                      return (
                        <span className={`inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded ${
                          isExpired 
                            ? 'bg-rose-50 text-rose-800 border border-rose-200' 
                            : 'bg-amber-50 text-amber-900 border border-amber-200'
                        }`}>
                          <Calendar className={`w-3.5 h-3.5 shrink-0 ${isExpired ? 'text-rose-600' : 'text-amber-600'}`} />
                          <span>{isExpired ? 'Applications Closed: ' : 'Last Date: '}{new Date(scheme.applicationEndDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        </span>
                      );
                    })()
                  ) : (() => {
                    const isEmployment = scheme.category === 'EMPLOYMENT';
                    const summaryIndicatesClosed = /applications (are )?closed|exam(ination)? concluded|provisional|past cycle/i.test(scheme.summary || '');
                    if (isEmployment || summaryIndicatesClosed) {
                      return (
                        <span className="inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                          <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span>{summaryIndicatesClosed ? 'Applications Closed' : 'Check Official Notice'}</span>
                        </span>
                      );
                    }
                    return (
                      <span className="inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Ongoing Citizen Benefit</span>
                      </span>
                    );
                  })()}

                  {scheme.applicationStartDate && (
                    <span className="text-[10px] text-slate-400">
                      From: {new Date(scheme.applicationStartDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                <Link
                  href={`/schemes/${scheme.slug}`}
                  className="text-xs font-semibold text-[#0d9488] hover:underline flex items-center gap-1"
                >
                  View Details <ArrowRight className="w-3 h-3" />
                </Link>
                {scheme.applicationUrl && (
                  <a
                    href={scheme.applicationUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-slate-500 hover:text-[#0b2545] flex items-center gap-1"
                  >
                    Official Portal <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="space-y-3">
          {schemes.map((scheme) => (
            <div
              key={scheme._id}
              className="bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 bg-slate-100 text-slate-700 rounded">
                    {scheme.category.replace('_', ' ')}
                  </span>
                  <span className="text-xs text-slate-500">
                    {scheme.governmentLevel === 'CENTRAL' ? 'Central' : scheme.state}
                  </span>
                  {scheme.applicationEndDate ? (
                    (() => {
                      const isExpired = new Date(scheme.applicationEndDate) < new Date();
                      return (
                        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded ${
                          isExpired 
                            ? 'bg-rose-50 text-rose-800 border border-rose-200' 
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}>
                          <Calendar className={`w-3 h-3 shrink-0 ${isExpired ? 'text-rose-600' : 'text-amber-600'}`} />
                          <span>{isExpired ? 'Closed: ' : 'Last Date: '}{new Date(scheme.applicationEndDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                        </span>
                      );
                    })()
                  ) : (() => {
                    const isEmployment = scheme.category === 'EMPLOYMENT';
                    const summaryIndicatesClosed = /applications (are )?closed|exam(ination)? concluded|provisional|past cycle/i.test(scheme.summary || '');
                    if (isEmployment || summaryIndicatesClosed) {
                      return (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                          <Clock className="w-3 h-3 text-slate-500 shrink-0" />
                          <span>{summaryIndicatesClosed ? 'Closed' : 'Notice TBA'}</span>
                        </span>
                      );
                    }
                    return (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <Clock className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span>Ongoing</span>
                      </span>
                    );
                  })()}
                </div>
                <Link href={`/schemes/${scheme.slug}`}>
                  <h3 className="font-bold text-base text-[#0b2545] hover:text-[#0d9488] transition-colors">
                    {scheme.name}
                  </h3>
                </Link>
                <p className="text-xs text-slate-600 line-clamp-2">{scheme.summary}</p>
              </div>

              <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                <button
                  onClick={() => handleBookmarkToggle(scheme._id)}
                  className={`p-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors ${
                    savedSchemeIds.has(scheme._id) ? 'text-amber-500 fill-amber-500' : 'text-slate-500'
                  }`}
                >
                  <Bookmark className="w-4 h-4" />
                </button>
                <Link
                  href={`/schemes/${scheme.slug}`}
                  className="px-4 py-2 bg-[#0b2545] hover:bg-[#0d9488] text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
                >
                  Details <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="pt-6 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <span>
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} schemes total)
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={pagination.page <= 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg disabled:opacity-40"
            >
              Previous
            </button>
            <button
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPage((prev) => Math.min(pagination.totalPages, prev + 1))}
              className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SchemeExplorerPage() {
  return (
    <Suspense
      fallback={
        <div className="py-20 text-center">
          <div className="w-8 h-8 border-2 border-[#0d9488] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500 mt-3">Loading scheme explorer...</p>
        </div>
      }
    >
      <SchemeExplorerContent />
    </Suspense>
  );
}
