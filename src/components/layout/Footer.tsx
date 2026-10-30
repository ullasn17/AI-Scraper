import Link from 'next/link';
import { Compass, ExternalLink, ShieldCheck } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-[#0b2545] text-slate-300 pt-12 pb-8 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Brand & Overview */}
          <div className="md:col-span-1 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#0d9488] flex items-center justify-center text-white">
                <Compass className="w-5 h-5" />
              </div>
              <span className="font-bold text-lg text-white tracking-tight">
                SchemeSathi <span className="text-[#14b8a6]">AI</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              An intelligent, transparent government benefit discovery platform collecting, indexing, and structuring official welfare schemes across India.
            </p>
            <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
              <ShieldCheck className="w-4 h-4" />
              Verified Official Data Sources Only
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="text-sm font-semibold text-white tracking-wider uppercase mb-3">
              Explore
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/schemes" className="hover:text-white transition-colors">
                  Central & State Schemes
                </Link>
              </li>
              <li>
                <Link href="/eligibility" className="hover:text-white transition-colors">
                  Eligibility Checker
                </Link>
              </li>
              <li>
                <Link href="/assistant" className="hover:text-white transition-colors">
                  SchemeSathi AI Assistant
                </Link>
              </li>
              <li>
                <Link href="/schemes?state=Karnataka" className="hover:text-white transition-colors">
                  Karnataka State Schemes
                </Link>
              </li>
              <li>
                <Link href="/bookmarks" className="hover:text-white transition-colors">
                  My Saved Schemes
                </Link>
              </li>
            </ul>
          </div>

          {/* Official Government Portals */}
          <div>
            <h4 className="text-sm font-semibold text-white tracking-wider uppercase mb-3">
              Official Portals
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <a
                  href="https://www.india.gov.in/"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-white transition-colors flex items-center gap-1"
                >
                  National Portal of India <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>
              </li>
              <li>
                <a
                  href="https://www.myscheme.gov.in/"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-white transition-colors flex items-center gap-1"
                >
                  myScheme Citizen Portal <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>
              </li>
              <li>
                <a
                  href="https://scholarships.gov.in/"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-white transition-colors flex items-center gap-1"
                >
                  National Scholarship Portal <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>
              </li>
              <li>
                <a
                  href="https://sevasindhu.karnataka.gov.in/"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-white transition-colors flex items-center gap-1"
                >
                  Seva Sindhu (Karnataka) <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>
              </li>
            </ul>
          </div>

          {/* Legal Disclaimer */}
          <div>
            <h4 className="text-sm font-semibold text-white tracking-wider uppercase mb-3">
              Notice & Disclaimer
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              SchemeSathi AI provides informational aggregation. We are not affiliated with any ministry. Final verification, terms, and approvals are executed solely by respective government departments. Never share bank passwords, Aadhaar OTPs, or financial secrets.
            </p>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-4">
          <p>© {new Date().getFullYear()} SchemeSathi AI. Built for citizen empowerment.</p>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-white transition-colors">
              Privacy Notice
            </Link>
            <Link href="/terms" className="hover:text-white transition-colors">
              Terms of Use
            </Link>
            <Link href="/admin" className="text-slate-400 hover:text-white transition-colors">
              Admin Gateway
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
