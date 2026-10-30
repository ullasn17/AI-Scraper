import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import ChatWidget from '@/components/chatbot/ChatWidget';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'SchemeSathi AI — Indian Government Scheme Discovery Platform',
  description:
    'Discover Indian central and state government schemes, scholarships, and welfare benefits using verified data and Groq AI.',
  keywords: [
    'Government Schemes',
    'Scholarships',
    'Karnataka Schemes',
    'Welfare Schemes',
    'Eligibility Checker',
    'SchemeSathi AI',
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen flex flex-col bg-[#f8fafc] text-slate-900 font-sans antialiased">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
        <ChatWidget />
      </body>
    </html>
  );
}
