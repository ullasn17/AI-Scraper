'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Bookmark, ArrowRight, Trash2, ExternalLink } from 'lucide-react';

interface BookmarkedItem {
  _id: string;
  schemeId: {
    _id: string;
    name: string;
    slug: string;
    summary: string;
    category: string;
    governmentLevel: string;
    state?: string;
    applicationUrl?: string;
    officialSourceUrl?: string;
  };
  notes?: string;
  createdAt: string;
}

export default function BookmarksPage() {
  const [bookmarks, setBookmarks] = useState<BookmarkedItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadBookmarks = async () => {
    try {
      const res = await fetch('/api/saved-schemes');
      const data = await res.json();
      if (data?.bookmarks) {
        setBookmarks(data.bookmarks);
      }
    } catch {
      // error handling
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookmarks();
  }, []);

  const handleRemove = async (bookmarkId: string) => {
    try {
      await fetch(`/api/saved-schemes/${bookmarkId}`, { method: 'DELETE' });
      setBookmarks((prev) => prev.filter((b) => b._id !== bookmarkId));
    } catch {
      // error handling
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-bold text-[#0b2545] tracking-tight">Saved Government Schemes</h1>
        <p className="text-xs text-slate-500">
          Your personal bookmarked schemes for quick reference and application tracking
        </p>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <div className="w-8 h-8 border-2 border-[#0d9488] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500 mt-2">Loading bookmarks...</p>
        </div>
      ) : bookmarks.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <Bookmark className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-base text-[#0b2545]">No Saved Schemes Yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Browse our scheme explorer and click the bookmark icon to save schemes you want to apply for.
          </p>
          <Link
            href="/schemes"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#0b2545] hover:bg-[#0d9488] text-white text-xs font-semibold rounded-lg transition-colors"
          >
            <span>Explore Schemes</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {bookmarks.map((b) => {
            if (!b.schemeId) return null;
            return (
              <div
                key={b._id}
                className="bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 bg-slate-100 text-slate-700 rounded">
                      {b.schemeId.category.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-slate-500">
                      {b.schemeId.governmentLevel === 'CENTRAL' ? 'Central' : b.schemeId.state}
                    </span>
                  </div>
                  <Link href={`/schemes/${b.schemeId.slug}`}>
                    <h3 className="font-bold text-base text-[#0b2545] hover:text-[#0d9488] transition-colors">
                      {b.schemeId.name}
                    </h3>
                  </Link>
                  <p className="text-xs text-slate-600 line-clamp-2">{b.schemeId.summary}</p>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                  {b.schemeId.applicationUrl && (
                    <a
                      href={b.schemeId.applicationUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg flex items-center gap-1"
                    >
                      <span>Portal</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  <Link
                    href={`/schemes/${b.schemeId.slug}`}
                    className="px-3.5 py-1.5 bg-[#0b2545] hover:bg-[#0d9488] text-white text-xs font-semibold rounded-lg transition-colors"
                  >
                    Details
                  </Link>
                  <button
                    onClick={() => handleRemove(b._id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                    title="Remove Bookmark"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
