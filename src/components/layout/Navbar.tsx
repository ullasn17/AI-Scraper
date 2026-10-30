'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { 
  Compass, 
  Bookmark, 
  ShieldCheck, 
  LogOut, 
  Menu, 
  X,
  Sparkles
} from 'lucide-react';

interface UserSession {
  id: string;
  name: string;
  email: string;
  role: 'USER' | 'ADMIN';
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<UserSession | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data?.user) setUser(data.user);
      })
      .catch(() => setUser(null));
  }, [pathname]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    router.push('/');
    router.refresh();
  };

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/schemes', label: 'Explore Schemes' },
    { href: '/eligibility', label: 'Eligibility Checker' },
    { href: '/assistant', label: 'AI Assistant', icon: Sparkles },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-lg bg-[#0b2545] flex items-center justify-center text-white shadow-sm group-hover:bg-[#0d9488] transition-colors">
              <Compass className="w-6 h-6 text-[#14b8a6]" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg leading-tight text-[#0b2545] tracking-tight">
                SchemeSathi <span className="text-[#0d9488]">AI</span>
              </span>
              <span className="text-[10px] text-slate-700 tracking-wider font-semibold uppercase">
                Citizen Portal
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3.5 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-slate-100 text-[#0b2545] font-semibold'
                      : 'text-slate-600 hover:text-[#0b2545] hover:bg-slate-50'
                  }`}
                >
                  {Icon && <Icon className="w-4 h-4 text-[#0d9488]" />}
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* User / Auth Controls */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-2">
                <Link
                  href="/bookmarks"
                  className="p-2 text-slate-600 hover:text-[#0b2545] hover:bg-slate-100 rounded-md transition-colors"
                  title="Saved Schemes"
                >
                  <Bookmark className="w-5 h-5" />
                </Link>

                {user.role === 'ADMIN' && (
                  <Link
                    href="/admin"
                    className="px-3 py-1.5 rounded-md text-xs font-semibold bg-[#0b2545] text-white hover:bg-[#0d9488] transition-colors flex items-center gap-1"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Admin
                  </Link>
                )}

                <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 font-medium text-xs">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs font-medium text-slate-700 max-w-[120px] truncate">
                    {user.name}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-slate-50 transition-colors"
                    title="Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="px-3.5 py-2 text-sm font-medium text-slate-700 hover:text-[#0b2545] transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-2 text-sm font-medium text-white bg-[#0b2545] hover:bg-[#0d9488] rounded-md shadow-sm transition-colors"
                >
                  Create Account
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-slate-600 hover:text-slate-900 rounded-md hover:bg-slate-100"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 bg-white px-4 pt-2 pb-4 space-y-2">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setIsMobileMenuOpen(false)}
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                pathname === link.href
                  ? 'bg-slate-100 text-[#0b2545] font-semibold'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {link.label}
            </Link>
          ))}
          {user ? (
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <Link
                href="/bookmarks"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:bg-slate-50 rounded-md"
              >
                <Bookmark className="w-4 h-4" />
                Saved Schemes
              </Link>
              {user.role === 'ADMIN' && (
                <Link
                  href="/admin"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-slate-900 font-semibold hover:bg-slate-50 rounded-md"
                >
                  <ShieldCheck className="w-4 h-4 text-[#0d9488]" />
                  Admin Dashboard
                </Link>
              )}
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  handleLogout();
                }}
                className="flex items-center gap-2 w-full text-left px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-md"
              >
                <LogOut className="w-4 h-4" />
                Sign Out ({user.name})
              </button>
            </div>
          ) : (
            <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
              <Link
                href="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="px-3 py-2 text-center text-sm font-medium text-slate-700 bg-slate-100 rounded-md"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                onClick={() => setIsMobileMenuOpen(false)}
                className="px-3 py-2 text-center text-sm font-medium text-white bg-[#0b2545] rounded-md"
              >
                Create Account
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
