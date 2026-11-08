import React from 'react';
import Link from 'next/link';
import { UtensilsCrossed } from 'lucide-react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen bg-slate-950 flex flex-col justify-between p-4 sm:p-6 selection:bg-indigo-500 selection:text-white">
      {/* Background ambient lighting */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-tr from-indigo-600/20 via-purple-600/15 to-transparent rounded-full blur-[120px] pointer-events-none" />

      {/* Brand logo at top */}
      <div className="relative z-10 max-w-7xl mx-auto w-full pt-4 flex justify-center">
        <Link href="/" className="inline-flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-amber-500 flex items-center justify-center shadow-lg shadow-indigo-600/30 group-hover:scale-105 transition-transform">
            <UtensilsCrossed className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-black tracking-tight text-white">
            Campus<span className="text-amber-400">Eats</span>
          </span>
        </Link>
      </div>

      {/* Centered card content */}
      <div className="relative z-10 w-full flex-1 flex items-center justify-center py-8">
        {children}
      </div>

      {/* Footer copyright */}
      <footer className="relative z-10 text-center py-4 text-xs text-slate-500">
        CampusEats Smart Canteen System • Secure Student & Staff Portal
      </footer>
    </div>
  );
}
