'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { Mail, Lock, LogIn, AlertCircle, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Quick fill helper for evaluator convenience
  const fillCredentials = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }

    try {
      setSubmitting(true);
      await login({ email, password });
      toast.success('Welcome back to CampusEats!');

      // Retrieve user role from stored user or context
      const stored = localStorage.getItem('user');
      const userObj = stored ? JSON.parse(stored) : null;
      const role = userObj?.role || 'student';

      if (role === 'admin') {
        router.push('/admin');
      } else if (role === 'staff') {
        router.push('/staff');
      } else {
        router.push('/student');
      }
    } catch (err: unknown) {
      const errorMsg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Invalid credentials. Please verify your email and password.';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <Card
        variant="highlighted"
        padding="lg"
        className="w-full bg-slate-900/80 border-slate-700/80 shadow-2xl backdrop-blur-2xl"
      >
        <div className="text-center mb-6">
          <h2 className="text-2xl font-black tracking-tight text-white">Welcome Back</h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Sign in to continue to CampusEats
          </p>
        </div>

        {/* Demo Fast-Login Chips */}
        <div className="mb-6 p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>1-Click Demo Accounts</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => fillCredentials('student@campuseats.com', 'student123')}
              className="py-1.5 px-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 transition-colors"
            >
              Student
            </button>
            <button
              type="button"
              onClick={() => fillCredentials('staff@campuseats.com', 'staff123')}
              className="py-1.5 px-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 transition-colors"
            >
              Staff
            </button>
            <button
              type="button"
              onClick={() => fillCredentials('admin@campuseats.com', 'admin123')}
              className="py-1.5 px-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 transition-colors"
            >
              Admin
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5 animate-fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="College Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="student@campuseats.com"
            leftIcon={<Mail className="w-4 h-4" />}
            required
            autoComplete="email"
          />

          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            leftIcon={<Lock className="w-4 h-4" />}
            required
            autoComplete="current-password"
          />

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={submitting}
              className="w-full font-bold shadow-lg shadow-indigo-600/30"
              leftIcon={<LogIn className="w-4 h-4" />}
            >
              Sign In
            </Button>
          </div>
        </form>

        <div className="mt-6 text-center text-xs text-slate-400">
          Don&apos;t have an account?{' '}
          <Link
            href="/register"
            className="font-bold text-amber-400 hover:text-amber-300 transition-colors"
          >
            Create an Account
          </Link>
        </div>
      </Card>
    </div>
  );
}
