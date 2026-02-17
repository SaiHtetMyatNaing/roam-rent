'use client';

import React, { useState } from 'react';
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  CheckCircle2, 
  CalendarCheck, 
  Star, 
  Repeat 
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

const supabase = createClient();

export default function SignInPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // Fetch user from 'users' table
      const { data: user, error: fetchError } = await supabase
        .from('users')
        .select('id, password_hash, status, first_name, avatar_url, role')
        .eq('email', email.trim().toLowerCase())
        .single();

      if (fetchError || !user) {
        throw new Error('Email not found');
      }

      if (user.status !== 'active') {
        throw new Error('Account is not active. Please contact support.');
      }

      if (user.password_hash !== password) {
        throw new Error('Incorrect password');
      }

      // ──────────────────────────────────────────────
      // CRITICAL: Save login state so Navbar detects it
      // ──────────────────────────────────────────────
      localStorage.setItem('user_email', email.trim().toLowerCase());

      // Force Navbar to refresh immediately (same tab)
      window.dispatchEvent(new Event('storage'));

      // Optional: also store basic user info for faster UI
      localStorage.setItem('user_data', JSON.stringify({
        first_name: user.first_name || '',
        avatar_url: user.avatar_url || null,
        role: user.role
      }));

      setSuccess(true);

      // Short delay to show success message
      setTimeout(() => {
        router.push('/vehicles');
      }, 1200);

    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-md p-10 text-center">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-md flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={32} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-3">Signed In Successfully</h2>
          <p className="text-slate-600 mb-8">Redirecting to vehicles page...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center py-12 px-6 lg:px-8">
      <div className="max-w-6xl w-full grid lg:grid-cols-2 gap-12 items-start">
        {/* LEFT SIDE - Welcome & Benefits */}
        <div className="flex flex-col justify-start space-y-10">
          <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 leading-tight">
            Welcome back to<br />
            <span className="text-blue-600">RoamRent</span>.
          </h1>

          <p className="text-lg text-slate-600 leading-relaxed">
            Log in to manage your bookings, view your rental history, and book your next adventure with ease.
          </p>

          <div className="space-y-8">
            <div className="flex items-start gap-5">
              <div className="p-3.5 bg-blue-100 rounded-md shrink-0">
                <CalendarCheck className="text-blue-600" size={28} />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 text-lg">Manage Bookings</h3>
                <p className="text-slate-600 mt-1.5">
                  View upcoming trips and modify reservations instantly.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-5">
              <div className="p-3.5 bg-blue-100 rounded-md shrink-0">
                <Star className="text-blue-600" size={28} />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 text-lg">Loyalty Rewards</h3>
                <p className="text-slate-600 mt-1.5">
                  Earn points on every mile and unlock premium upgrades.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-5">
              <div className="p-3.5 bg-blue-100 rounded-md shrink-0">
                <Repeat className="text-blue-600" size={28} />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 text-lg">Quick Re-booking</h3>
                <p className="text-slate-600 mt-1.5">
                  Book your favorite vehicles again in just a few clicks.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE - Sign In Form */}
        <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
          <div className="p-10 lg:p-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-2 text-center">Sign In</h2>
            <p className="text-slate-500 text-center mb-10">
              Welcome back! Please enter your details.
            </p>

            {error && (
              <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-md flex items-start gap-3 text-red-700 text-sm">
                <AlertCircle size={20} className="mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 block">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-300 rounded-md focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-slate-900 placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 block">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full pl-10 pr-12 py-3 bg-white border border-slate-300 rounded-md focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-slate-900 placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <a href="#" className="text-sm text-blue-600 hover:underline">
                  Forgot password?
                </a>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className={`
                  w-full py-3.5 px-6 bg-blue-600 text-white rounded-md font-semibold text-base transition-all
                  ${isLoading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-blue-700 active:scale-[0.98]'}
                `}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Signing in...
                  </span>
                ) : (
                  'Sign In'
                )}
              </button>

              <p className="text-center text-sm text-slate-600 mt-6">
                Don't have an account?{' '}
                <a href="/register" className="text-blue-600 font-semibold hover:underline">
                  Create one now
                </a>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}