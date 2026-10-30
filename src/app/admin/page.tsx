'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ShieldCheck, 
  CheckCircle2, 
  Play, 
  RotateCw, 
  AlertCircle, 
  Eye, 
  Check, 
  X, 
  ExternalLink,
  Plus,
  Trash2
} from 'lucide-react';

interface AdminNotification {
  id: string;
  type: 'success' | 'error' | 'info' | 'crawl_triggered';
  title: string;
  message: string;
  jobId?: string;
  timestamp: string;
}

interface Metrics {
  totalSchemes: number;
  verifiedSchemes: number;
  pendingSchemes: number;
  totalSources: number;
  enabledSources: number;
  totalJobs: number;
  failedJobs: number;
}

interface SourceItem {
  _id: string;
  name: string;
  baseUrl: string;
  allowedDomains: string[];
  governmentLevel: string;
  state?: string;
  isEnabled: boolean;
  lastCrawledAt?: string;
  lastCrawlStatus?: string;
}

interface JobItem {
  _id: string;
  targetUrl: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  schemesFound: number;
  schemesCreated: number;
  schemesUpdated: number;
  errorMessage?: string;
  logs: string[];
  createdAt: string;
}

interface PendingScheme {
  _id: string;
  name: string;
  slug: string;
  summary: string;
  category: string;
  governmentLevel: string;
  state?: string;
  officialSourceUrl: string;
  verificationStatus: string;
}

export default function AdminDashboardPage() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'overview' | 'sources' | 'jobs' | 'review'>('overview');
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [sources, setSources] = useState<SourceItem[]>([]);
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [pendingSchemes, setPendingSchemes] = useState<PendingScheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New source form modal
  const [isAddingSource, setIsAddingSource] = useState(false);
  const [newSourceName, setNewSourceName] = useState('');
  const [newSourceUrl, setNewSourceUrl] = useState('');
  const [newSourceState, setNewSourceState] = useState('');

  // Selected job logs modal
  const [selectedJob, setSelectedJob] = useState<JobItem | null>(null);

  // Notifications Toast state
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);

  // Delete source modal state
  const [sourceToDelete, setSourceToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isDeletingSource, setIsDeletingSource] = useState(false);

  // Auto-tracking state
  const [isTrackingAll, setIsTrackingAll] = useState(false);

  // Crawling action state
  const [crawlInProgress, setCrawlInProgress] = useState(false);

  const addNotification = (
    type: 'success' | 'error' | 'info' | 'crawl_triggered',
    title: string,
    message: string,
    jobId?: string
  ) => {
    const id = 'notif_' + Math.random().toString(36).substring(2, 9);
    const newNotif: AdminNotification = {
      id,
      type,
      title,
      message,
      jobId,
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };
    setNotifications((prev) => [newNotif, ...prev.slice(0, 4)]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 6500);
  };

  const dismissNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const loadData = async () => {
    try {
      const [overviewRes, sourcesRes, jobsRes, reviewRes] = await Promise.all([
        fetch('/api/admin/overview'),
        fetch('/api/admin/sources'),
        fetch('/api/admin/jobs'),
        fetch('/api/admin/review'),
      ]);

      if (overviewRes.status === 401 || overviewRes.status === 403) {
        router.push('/login?redirect=/admin');
        return;
      }

      const overviewData = await overviewRes.json();
      const sourcesData = await sourcesRes.json();
      const jobsData = await jobsRes.json();
      const reviewData = await reviewRes.json();

      setMetrics(overviewData.metrics || null);
      setSources(sourcesData.sources || []);
      setJobs(jobsData.jobs || []);
      setPendingSchemes(reviewData.schemes || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error loading admin data';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggleSource = async (sourceId: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/admin/sources/${sourceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isEnabled: !currentStatus }),
      });
      if (res.ok) {
        setSources((prev) =>
          prev.map((s) => (s._id === sourceId ? { ...s, isEnabled: !currentStatus } : s))
        );
        addNotification('info', 'Source Updated', `Source status updated to ${!currentStatus ? 'Active' : 'Disabled'}.`);
      }
    } catch {
      addNotification('error', 'Update Failed', 'Could not toggle source status');
    }
  };

  const confirmDeleteSource = async () => {
    if (!sourceToDelete) return;
    setIsDeletingSource(true);
    try {
      const res = await fetch(`/api/admin/sources/${sourceToDelete.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete source');

      const deletedSchemes = data.deletedSchemesCount || 0;
      setSources((prev) => prev.filter((s) => s._id !== sourceToDelete.id));
      if (metrics) {
        setMetrics({
          ...metrics,
          totalSources: Math.max(0, metrics.totalSources - 1),
          totalSchemes: Math.max(0, metrics.totalSchemes - deletedSchemes),
          verifiedSchemes: Math.max(0, metrics.verifiedSchemes - deletedSchemes),
        });
      }
      setSourceToDelete(null);
      addNotification(
        'success',
        'Source & Associated Schemes Deleted',
        `Source "${sourceToDelete.name}" and ${deletedSchemes} associated schemes were permanently deleted from the database.`
      );
      loadData();
    } catch (err: unknown) {
      addNotification('error', 'Deletion Error', err instanceof Error ? err.message : 'Error deleting source');
    } finally {
      setIsDeletingSource(false);
    }
  };

  const handleTrackAllSources = async () => {
    setIsTrackingAll(true);
    try {
      const res = await fetch('/api/admin/track-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceAll: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Tracking cycle failed');
      addNotification('success', 'Auto-Tracking Complete', data.message || 'Auto-tracking cycle across official portals concluded successfully.');
      loadData();
    } catch (err: unknown) {
      addNotification('error', 'Tracking Error', err instanceof Error ? err.message : 'Tracking cycle error');
    } finally {
      setIsTrackingAll(false);
    }
  };

  const handleTriggerCrawl = async (sourceId?: string, targetUrl?: string) => {
    setCrawlInProgress(true);
    try {
      const res = await fetch('/api/admin/crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId, targetUrl, forceAI: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Crawl failed to execute');
      addNotification(
        'crawl_triggered',
        'Crawler Job Initiated',
        `Active background crawl process running for target portal. AI extraction is underway.`,
        data.job?._id
      );
      loadData();
    } catch (err: unknown) {
      addNotification('error', 'Crawl Error', err instanceof Error ? err.message : 'Crawl execution error');
    } finally {
      setCrawlInProgress(false);
    }
  };

  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newSourceName,
          baseUrl: newSourceUrl,
          state: newSourceState || undefined,
          governmentLevel: newSourceState ? 'STATE' : 'CENTRAL',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add source');
      setIsAddingSource(false);
      setNewSourceName('');
      setNewSourceUrl('');
      setNewSourceState('');
      addNotification('success', 'Source Added', `Official source "${newSourceName}" was added and queued for tracking.`);
      loadData();
    } catch (err: unknown) {
      addNotification('error', 'Error Adding Source', err instanceof Error ? err.message : 'Error adding source');
    }
  };

  const handleSchemeVerification = async (schemeId: string, action: 'VERIFY' | 'REJECT') => {
    try {
      const res = await fetch(`/api/admin/schemes/${schemeId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        setPendingSchemes((prev) => prev.filter((p) => p._id !== schemeId));
        if (metrics) {
          setMetrics({
            ...metrics,
            pendingSchemes: Math.max(0, metrics.pendingSchemes - 1),
            verifiedSchemes: action === 'VERIFY' ? metrics.verifiedSchemes + 1 : metrics.verifiedSchemes,
          });
        }
      }
    } catch {
      // error handling
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center space-y-3">
        <div className="w-8 h-8 border-2 border-[#0d9488] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-500">Checking admin authentication & live metrics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto my-12 p-6 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-center gap-3">
        <AlertCircle className="w-5 h-5 shrink-0" />
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 relative">
      {/* Sleek In-App Toast Notification Banner */}
      <div className="fixed top-6 right-6 z-50 flex flex-col gap-3 max-w-md w-full pointer-events-none">
        {notifications.map((notif) => (
          <div
            key={notif.id}
            className={`pointer-events-auto p-4 rounded-xl shadow-2xl border backdrop-blur-md transition-all duration-300 transform translate-y-0 animate-in slide-in-from-top-4 ${
              notif.type === 'crawl_triggered'
                ? 'bg-slate-900/95 text-white border-cyan-500/50 shadow-cyan-950/50 ring-1 ring-cyan-500/20'
                : notif.type === 'success'
                ? 'bg-slate-900/95 text-white border-emerald-500/50 shadow-emerald-950/50 ring-1 ring-emerald-500/20'
                : 'bg-slate-900/95 text-white border-rose-500/50 shadow-rose-950/50 ring-1 ring-rose-500/20'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg shrink-0 ${
                  notif.type === 'crawl_triggered'
                    ? 'bg-cyan-500/20 text-cyan-400'
                    : notif.type === 'success'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-rose-500/20 text-rose-400'
                }`}>
                  {notif.type === 'crawl_triggered' ? (
                    <RotateCw className="w-5 h-5 animate-spin" />
                  ) : notif.type === 'success' ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <AlertCircle className="w-5 h-5" />
                  )}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className={`text-xs font-bold tracking-wide uppercase ${
                      notif.type === 'crawl_triggered'
                        ? 'text-cyan-400'
                        : notif.type === 'success'
                        ? 'text-emerald-400'
                        : 'text-rose-400'
                    }`}>
                      {notif.title}
                    </h4>
                    <span className="text-[10px] text-slate-400">{notif.timestamp}</span>
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed font-normal">
                    {notif.message}
                  </p>
                  {notif.jobId && (
                    <div className="mt-2 pt-2 border-t border-slate-700/60 flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 font-mono text-[10px]">
                        Job ID: <span className="text-cyan-300 font-bold">{notif.jobId}</span>
                      </span>
                      <button
                        onClick={() => {
                          setActiveTab('jobs');
                          dismissNotification(notif.id);
                        }}
                        className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 underline"
                      >
                        View in Audit Log →
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => dismissNotification(notif.id)}
                className="text-slate-400 hover:text-white p-1 rounded transition-colors shrink-0"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0b2545] flex items-center justify-center text-white">
            <ShieldCheck className="w-6 h-6 text-[#14b8a6]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#0b2545] tracking-tight">Admin Operations Center</h1>
            <p className="text-xs text-slate-500">
              Manage approved sources, crawl jobs, AI extractions, and verification queues
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Auto-Tracking: Active (15m)</span>
          </div>
          <Link
            href="/schemes"
            className="px-3.5 py-2 border border-slate-200 hover:bg-white text-slate-700 text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Public Catalog</span>
          </Link>
          <button
            onClick={handleTrackAllSources}
            disabled={isTrackingAll || crawlInProgress}
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
            title="Automatically crawl & refresh all active websites"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isTrackingAll ? 'animate-spin' : ''}`} />
            <span>{isTrackingAll ? 'Tracking...' : 'Track All Sites'}</span>
          </button>
          <button
            onClick={() => handleTriggerCrawl()}
            disabled={crawlInProgress || isTrackingAll}
            className="px-4 py-2 bg-[#0b2545] hover:bg-[#0d9488] disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-2"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{crawlInProgress ? 'Crawling...' : 'Run Single Crawl'}</span>
          </button>
          <button
            onClick={loadData}
            className="p-2 border border-slate-200 hover:bg-white text-slate-600 rounded-lg transition-colors"
            title="Refresh Data"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-sm font-medium">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 border-b-2 transition-colors ${
            activeTab === 'overview'
              ? 'border-[#0d9488] text-[#0b2545] font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Overview & Metrics
        </button>
        <button
          onClick={() => setActiveTab('sources')}
          className={`pb-3 border-b-2 transition-colors ${
            activeTab === 'sources'
              ? 'border-[#0d9488] text-[#0b2545] font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Source Registry ({sources.length})
        </button>
        <button
          onClick={() => setActiveTab('jobs')}
          className={`pb-3 border-b-2 transition-colors ${
            activeTab === 'jobs'
              ? 'border-[#0d9488] text-[#0b2545] font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Crawl Jobs ({jobs.length})
        </button>
        <button
          onClick={() => setActiveTab('review')}
          className={`pb-3 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'review'
              ? 'border-[#0d9488] text-[#0b2545] font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Pending Review</span>
          {pendingSchemes.length > 0 && (
            <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 rounded-full">
              {pendingSchemes.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab: Overview */}
      {activeTab === 'overview' && metrics && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-1">
              <span className="text-xs text-slate-500 font-medium">Total Schemes</span>
              <p className="text-2xl font-extrabold text-[#0b2545]">{metrics.totalSchemes}</p>
              <span className="text-[11px] text-emerald-600 font-medium">
                {metrics.verifiedSchemes} verified active
              </span>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-1">
              <span className="text-xs text-slate-500 font-medium">Pending Review</span>
              <p className="text-2xl font-extrabold text-amber-600">{metrics.pendingSchemes}</p>
              <span className="text-[11px] text-slate-400">Awaiting admin sign-off</span>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-1">
              <span className="text-xs text-slate-500 font-medium">Approved Sources</span>
              <p className="text-2xl font-extrabold text-[#0d9488]">{metrics.totalSources}</p>
              <span className="text-[11px] text-slate-400">{metrics.enabledSources} active crawlers</span>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-1">
              <span className="text-xs text-slate-500 font-medium">Crawl Executions</span>
              <p className="text-2xl font-extrabold text-slate-700">{metrics.totalJobs}</p>
              <span className="text-[11px] text-rose-500">{metrics.failedJobs} failed attempts</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Sources */}
      {activeTab === 'sources' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#0b2545]">Official Source Registry</h2>
            <button
              onClick={() => setIsAddingSource(true)}
              className="px-3.5 py-1.5 bg-[#0b2545] hover:bg-[#0d9488] text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Add Source
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="p-3.5">Source Name</th>
                  <th className="p-3.5">Base URL</th>
                  <th className="p-3.5">Jurisdiction</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Last Crawled</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sources.map((s) => (
                  <tr key={s._id} className="hover:bg-slate-50">
                    <td className="p-3.5 font-bold text-[#0b2545]">{s.name}</td>
                    <td className="p-3.5 truncate max-w-[200px]">
                      <a href={s.baseUrl} target="_blank" rel="noreferrer" className="text-slate-600 hover:underline">
                        {s.baseUrl}
                      </a>
                    </td>
                    <td className="p-3.5">
                      {s.governmentLevel === 'CENTRAL' ? 'Central' : s.state}
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          s.isEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {s.isEnabled ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-400">
                      {s.lastCrawledAt ? new Date(s.lastCrawledAt).toLocaleString() : 'Never'}
                    </td>
                    <td className="p-3.5 text-right space-x-2">
                      <button
                        onClick={() => handleTriggerCrawl(s._id, s.baseUrl)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-[#0b2545] font-semibold rounded text-[11px]"
                      >
                        Crawl
                      </button>
                      <button
                        onClick={() => handleToggleSource(s._id, s.isEnabled)}
                        className="text-[11px] underline text-slate-400 hover:text-slate-700"
                      >
                        {s.isEnabled ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        onClick={() => setSourceToDelete({ id: s._id, name: s.name })}
                        className="px-2 py-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded text-[11px] font-semibold inline-flex items-center gap-1 transition-colors"
                        title="Delete Source Website"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Delete</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Jobs */}
      {activeTab === 'jobs' && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-[#0b2545]">Crawl Execution Logs</h2>
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="p-3.5">Job ID</th>
                  <th className="p-3.5">Target URL</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Discovered</th>
                  <th className="p-3.5">Timestamp</th>
                  <th className="p-3.5 text-right">Logs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {jobs.map((j) => (
                  <tr key={j._id} className="hover:bg-slate-50">
                    <td className="p-3.5 font-mono text-[11px]">{j._id.substring(j._id.length - 8)}</td>
                    <td className="p-3.5 truncate max-w-[250px]">{j.targetUrl}</td>
                    <td className="p-3.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          j.status === 'COMPLETED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : j.status === 'FAILED'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {j.status}
                      </span>
                    </td>
                    <td className="p-3.5">
                      +{j.schemesCreated} new / ~{j.schemesUpdated} upd
                    </td>
                    <td className="p-3.5 text-slate-400">
                      {new Date(j.createdAt).toLocaleTimeString()}
                    </td>
                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => setSelectedJob(j)}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded text-[11px]"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Review Queue */}
      {activeTab === 'review' && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-[#0b2545]">Pending Verification Queue</h2>
          {pendingSchemes.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-xs text-slate-400">
              No schemes currently flagged for manual verification.
            </div>
          ) : (
            <div className="space-y-3">
              {pendingSchemes.map((p) => (
                <div
                  key={p._id}
                  className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                      Needs Verification
                    </span>
                    <h3 className="font-bold text-sm text-[#0b2545]">{p.name}</h3>
                    <p className="text-xs text-slate-600 line-clamp-2">{p.summary}</p>
                    <a
                      href={p.officialSourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-[#0d9488] hover:underline flex items-center gap-1"
                    >
                      Official Source <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleSchemeVerification(p._id, 'VERIFY')}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" /> Approve
                    </button>
                    <button
                      onClick={() => handleSchemeVerification(p._id, 'REJECT')}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-medium rounded-lg flex items-center gap-1"
                    >
                      <X className="w-3.5 h-3.5" /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Job Log Inspection Modal */}
      {selectedJob && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-sm text-[#0b2545]">
                Crawl Job Audit #{selectedJob._id.substring(selectedJob._id.length - 8)}
              </h3>
              <button
                onClick={() => setSelectedJob(null)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto font-mono text-xs text-slate-800 space-y-1 bg-slate-900 text-slate-100">
              {selectedJob.logs.map((log, lIdx) => (
                <div key={lIdx} className="leading-relaxed">
                  {log}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add Source Modal */}
      {isAddingSource && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-[#0b2545]">Register Official Source</h3>
              <button onClick={() => setIsAddingSource(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddSource} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Source Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Karnataka Department of Agriculture"
                  value={newSourceName}
                  onChange={(e) => setNewSourceName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Base URL</label>
                <input
                  type="url"
                  required
                  placeholder="https://raitamitra.karnataka.gov.in"
                  value={newSourceUrl}
                  onChange={(e) => setNewSourceUrl(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">State (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Karnataka (leave empty if Central)"
                  value={newSourceState}
                  onChange={(e) => setNewSourceState(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg text-slate-900"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingSource(false)}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0b2545] hover:bg-[#0d9488] text-white text-xs font-semibold rounded-lg"
                >
                  Save Source
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Source Confirmation Modal */}
      {sourceToDelete && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-bold text-base text-[#0b2545]">Delete Source Website?</h3>
              <p className="text-xs text-slate-500">
                Are you sure you want to remove <span className="font-semibold text-slate-800">&ldquo;{sourceToDelete.name}&rdquo;</span> from the registry? Crawler operations for this domain will be discontinued.
              </p>
            </div>
            <div className="pt-2 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setSourceToDelete(null)}
                disabled={isDeletingSource}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteSource}
                disabled={isDeletingSource}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeletingSource ? 'Deleting...' : 'Yes, Delete Source'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
