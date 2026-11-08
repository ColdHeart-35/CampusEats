'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import {
  UtensilsCrossed,
  Sparkles,
  Zap,
  Clock,
  ShieldCheck,
  ChevronRight,
  QrCode,
  ChefHat,
} from 'lucide-react';

export default function LandingPage() {
  const { isAuthenticated, role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && isAuthenticated && role) {
      if (role === 'admin') router.replace('/admin');
      else if (role === 'staff') router.replace('/staff');
      else router.replace('/student');
    }
  }, [isAuthenticated, role, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
        <Spinner size="lg" text="Loading CampusEats..." />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-slate-950 overflow-hidden flex flex-col justify-between selection:bg-indigo-500 selection:text-white">
      {/* Background glowing ambient orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/15 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[450px] h-[450px] bg-amber-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Top Navigation Bar */}
      <header className="relative z-20 max-w-7xl mx-auto w-full px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-amber-500 flex items-center justify-center shadow-lg shadow-indigo-600/30">
            <UtensilsCrossed className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-black tracking-tight text-white">
            Campus<span className="text-amber-400">Eats</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" size="sm" className="text-xs font-semibold">
              Sign In
            </Button>
          </Link>
          <Link href="/register">
            <Button variant="accent" size="sm" className="text-xs font-bold shadow-md shadow-amber-500/20">
              Sign Up
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 max-w-6xl mx-auto px-6 py-12 sm:py-20 flex flex-col items-center text-center">
        {/* Subtle Pill Tag */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-bold mb-8 animate-fade-in shadow-inner">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Next-Gen Smart Campus Canteen</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-white tracking-tight leading-[1.1] mb-6 max-w-4xl">
          Skip The Canteen Line. <br />
          <span className="bg-gradient-to-r from-indigo-400 via-indigo-200 to-amber-400 bg-clip-text text-transparent">
            Order Ahead. Eat Fresh.
          </span>
        </h1>

        {/* Hero Tagline */}
        <p className="text-base sm:text-xl text-slate-400 max-w-2xl mb-10 leading-relaxed font-normal">
          Browse today’s fresh menu, customize your order, pay seamlessly via Razorpay,
          and collect your hot meal at the counter with an instant QR pass.
        </p>

        {/* Hero Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto mb-16">
          <Link href="/login" className="w-full sm:w-auto">
            <Button
              variant="primary"
              size="lg"
              className="w-full sm:w-auto px-8 text-base shadow-xl shadow-indigo-600/30"
              rightIcon={<ChevronRight className="w-5 h-5" />}
            >
              Order Your Food Now
            </Button>
          </Link>
          <Link href="/register" className="w-full sm:w-auto">
            <Button
              variant="secondary"
              size="lg"
              className="w-full sm:w-auto px-8 text-base"
            >
              Create Account
            </Button>
          </Link>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 w-full text-left">
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md hover:border-indigo-500/40 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center mb-3">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-sm mb-1">Pickup Slots</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Choose your break time interval and pick up your hot food without standing in line.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md hover:border-indigo-500/40 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-3">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-sm mb-1">AI Semantic Search</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Find foods naturally by cravings like &quot;spicy breakfast&quot; or &quot;healthy refreshment&quot;.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md hover:border-indigo-500/40 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3">
              <QrCode className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-sm mb-1">Instant QR Pass</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Show your unique digital verification pass at the canteen counter for fast pickup.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md hover:border-indigo-500/40 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center mb-3">
              <ChefHat className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-sm mb-1">Live Kitchen Queue</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Real-time updates as your food moves from kitchen prep to counter readiness.
            </p>
          </div>
        </div>
      </main>

      {/* Footer Branding */}
      <footer className="relative z-10 max-w-7xl mx-auto w-full px-6 py-8 border-t border-slate-900 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-4">
        <span>© {new Date().getFullYear()} CampusEats Smart Canteen System. All rights reserved.</span>
        <div className="flex items-center gap-6">
          <Link href="/login" className="hover:text-slate-300">Student Portal</Link>
          <Link href="/login" className="hover:text-slate-300">Staff Portal</Link>
          <Link href="/login" className="hover:text-slate-300">Admin Portal</Link>
        </div>
      </footer>
    </div>
  );
}
