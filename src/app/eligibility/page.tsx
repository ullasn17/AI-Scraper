'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  CheckCircle2, 
  HelpCircle, 
  Sparkles, 
  ArrowRight, 
  ShieldCheck
} from 'lucide-react';

interface MatchItem {
  scheme: {
    _id: string;
    name: string;
    slug: string;
    summary: string;
    category: string;
    governmentLevel: string;
    state?: string;
    benefits?: string[];
    eligibility?: string[];
    requiredDocuments?: string[];
    applicationUrl?: string;
    officialSourceUrl?: string;
  };
  classification: 'LIKELY_MATCH' | 'POTENTIAL_MATCH' | 'UNLIKELY_MATCH';
  matchScore: number;
  reasons: string[];
  missingInfo: string[];
}

export default function EligibilityCheckerPage() {
  const [formData, setFormData] = useState({
    state: 'Karnataka',
    age: '22',
    education: 'Undergraduate / College',
    occupation: 'Student',
    annualIncome: '180000',
    category: 'General',
  });

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{
    matches: MatchItem[];
    totalEvaluated: number;
    topExplanation: string;
    disclaimer: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/eligibility/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          state: formData.state,
          age: parseInt(formData.age, 10),
          education: formData.education,
          occupation: formData.occupation,
          annualIncome: parseInt(formData.annualIncome, 10),
          category: formData.category,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to match eligibility');
      setResults(data);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error evaluating eligibility');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-teal-50 border border-teal-200 text-teal-800 rounded-full text-xs font-semibold">
          <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
          Zero-Knowledge Privacy • No Aadhaar or Bank Details Required
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0b2545] tracking-tight">
          Citizen Eligibility Checker
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
          Provide your general demographic background to instantly match published rules for Central, State, and Karnataka government schemes.
        </p>
      </div>

      {/* Questionnaire Form */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {/* State */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                State of Residence
              </label>
              <select
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0d9488]"
              >
                <option value="Karnataka">Karnataka</option>
                <option value="Maharashtra">Maharashtra</option>
                <option value="Tamil Nadu">Tamil Nadu</option>
                <option value="Uttar Pradesh">Uttar Pradesh</option>
                <option value="Gujarat">Gujarat</option>
                <option value="Rajasthan">Rajasthan</option>
                <option value="Kerala">Kerala</option>
                <option value="Madhya Pradesh">Madhya Pradesh</option>
                <option value="All States">Other / Central Only</option>
              </select>
            </div>

            {/* Age */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Age (in years)
              </label>
              <input
                type="number"
                min="0"
                max="120"
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0d9488]"
                required
              />
            </div>

            {/* Occupation */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Primary Occupation / Status
              </label>
              <select
                value={formData.occupation}
                onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0d9488]"
              >
                <option value="Student">Student</option>
                <option value="Farmer">Farmer / Agricultural Worker</option>
                <option value="Entrepreneur">Small Business / MSME Owner</option>
                <option value="Salaried">Employed / Salaried</option>
                <option value="Unemployed">Unemployed Youth / Job Seeker</option>
                <option value="Homemaker">Homemaker</option>
                <option value="Senior Citizen">Retired / Senior Citizen</option>
              </select>
            </div>

            {/* Annual Income */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Approx. Annual Family Income (₹)
              </label>
              <input
                type="number"
                min="0"
                step="10000"
                value={formData.annualIncome}
                onChange={(e) => setFormData({ ...formData, annualIncome: e.target.value })}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0d9488]"
                required
              />
            </div>

            {/* Education Level */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Highest Education Completed
              </label>
              <select
                value={formData.education}
                onChange={(e) => setFormData({ ...formData, education: e.target.value })}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0d9488]"
              >
                <option value="Undergraduate / College">Undergraduate / College</option>
                <option value="10th Pass / Secondary">10th Standard / Matriculation</option>
                <option value="12th Pass / Higher Secondary">12th Standard / Pre-University</option>
                <option value="Postgraduate / PhD">Postgraduate / Professional</option>
                <option value="Primary School">Primary School</option>
              </select>
            </div>

            {/* Social Category */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Category (Voluntary)
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0d9488]"
              >
                <option value="General">General</option>
                <option value="OBC">Other Backward Classes (OBC)</option>
                <option value="SC">Scheduled Castes (SC)</option>
                <option value="ST">Scheduled Tribes (ST)</option>
                <option value="Minority">Minority Communities</option>
                <option value="EWS">Economically Weaker Section (EWS)</option>
              </select>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <span className="text-[11px] text-slate-600">
              * Details are processed securely in-session and never stored permanently.
            </span>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-[#0b2545] hover:bg-[#0d9488] text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-2"
            >
              {loading ? (
                <>Evaluating...</>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-[#14b8a6]" />
                  <span>Check Eligibility</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Results View */}
      {results && (
        <div className="space-y-6">
          {/* AI Explanation Banner */}
          {results.topExplanation && (
            <div className="bg-teal-50 border border-teal-200 rounded-xl p-5 space-y-2">
              <div className="flex items-center gap-2 text-teal-900 font-bold text-sm">
                <Sparkles className="w-4 h-4 text-[#0d9488]" />
                SchemeSathi AI Assessment Summary
              </div>
              <p className="text-xs sm:text-sm text-teal-950 leading-relaxed">
                {results.topExplanation}
              </p>
            </div>
          )}

          {/* Matches List */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-[#0b2545]">
              Matching Results ({results.matches.length} Schemes)
            </h2>

            {results.matches.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">
                No published schemes matched your current profile criteria.
              </p>
            ) : (
              <div className="space-y-4">
                {results.matches.map((item, idx) => {
                  const isLikely = item.classification === 'LIKELY_MATCH';
                  const isPotential = item.classification === 'POTENTIAL_MATCH';

                  return (
                    <div
                      key={idx}
                      className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 hover:border-slate-300 transition-all"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full inline-block mb-1.5 ${
                              isLikely
                                ? 'bg-emerald-100 text-emerald-800'
                                : isPotential
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {item.classification.replace('_', ' ')}
                          </span>
                          <Link href={`/schemes/${item.scheme.slug}`}>
                            <h3 className="font-bold text-base text-[#0b2545] hover:text-[#0d9488] transition-colors">
                              {item.scheme.name}
                            </h3>
                          </Link>
                        </div>

                        <Link
                          href={`/schemes/${item.scheme.slug}`}
                          className="px-4 py-1.5 bg-[#0b2545] hover:bg-[#0d9488] text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 shrink-0 self-start sm:self-center"
                        >
                          View Scheme <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed">
                        {item.scheme.summary}
                      </p>

                      {/* Reasons */}
                      <div className="pt-2 border-t border-slate-100 space-y-1">
                        <span className="text-[11px] font-semibold text-slate-700 block">
                          Why this matches your profile:
                        </span>
                        {item.reasons.map((r, rIdx) => (
                          <div key={rIdx} className="flex items-center gap-1.5 text-xs text-emerald-700">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            <span>{r}</span>
                          </div>
                        ))}
                      </div>

                      {/* Missing info */}
                      {item.missingInfo.length > 0 && (
                        <div className="pt-1 flex items-center gap-2 text-[11px] text-amber-700">
                          <HelpCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>Additional verification needed: {item.missingInfo.join(', ')}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Legal Disclaimer */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500">
            <p className="font-semibold text-slate-700 mb-1">Official Disclaimer</p>
            <p>{results.disclaimer}</p>
          </div>
        </div>
      )}
    </div>
  );
}
