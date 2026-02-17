// components/Navbar.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, X, User, LayoutDashboard } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

type UserRole = 'customer' | 'car-owner' | 'admin' | null;

export default function Navbar() {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    role: UserRole;
    avatar_url?: string | null;
    first_name?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const toggleMobileMenu = () => setIsMobileOpen(!isMobileOpen);

  const checkUser = async () => {
    const storedEmail = localStorage.getItem('user_email');
    console.log('Navbar checking localStorage:', storedEmail); // ← debug

    if (!storedEmail) {
      setCurrentUser(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, role, avatar_url, first_name')
        .eq('email', storedEmail.trim().toLowerCase())
        .single();

      console.log('Supabase user fetch result:', { data, error }); // ← debug

      if (error || !data) {
        localStorage.removeItem('user_email');
        setCurrentUser(null);
      } else {
        setCurrentUser({
          id: data.id,
          role: data.role as UserRole,
          avatar_url: data.avatar_url,
          first_name: data.first_name,
        });
      }
    } catch (err) {
      console.error('Navbar user check error:', err);
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkUser();

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'user_email') {
        console.log('Storage event triggered - re-checking user');
        checkUser();
      }
    };

    window.addEventListener('storage', handleStorage);
    const interval = setInterval(checkUser, 5000); // check every 5s as fallback

    return () => {
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
    };
  }, []);

  if (loading) {
    return (
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 h-16" />
    );
  }

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">

          {/* Logo */}
          <div className="flex-shrink-0">
            <Link href="/" className="text-2xl font-bold text-blue-600">
              RoamRent
            </Link>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            <Link href="/" className="text-slate-700 hover:text-blue-600 font-medium transition-colors">
              Home
            </Link>
            <Link href="/vehicles" className="text-slate-700 hover:text-blue-600 font-medium transition-colors">
              Vehicles
            </Link>
            <Link href="/bookings" className="text-slate-700 hover:text-blue-600 font-medium transition-colors">
              Bookings
            </Link>
            <Link href="/support" className="text-slate-700 hover:text-blue-600 font-medium transition-colors">
              Support
            </Link>

            {/* User area */}
            {currentUser ? (
              <Link 
                href="/profile" 
                className="flex items-center gap-3 hover:opacity-90 transition-opacity cursor-pointer"
              >
                <div className="w-10 h-10 rounded-md overflow-hidden border-2 border-blue-500/30 hover:border-blue-500 transition-all duration-200 flex-shrink-0">
                  {currentUser.avatar_url ? (
                    <Image
                      src={currentUser.avatar_url}
                      alt="User avatar"
                      width={40}
                      height={40}
                      className="object-cover w-full h-full"
                      unoptimized // Required for external Supabase URLs
                      priority
                    />
                  ) : (
                    <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                      <User size={24} className="text-slate-500" />
                    </div>
                  )}
                </div>
                <span className="font-medium text-slate-800 hover:text-blue-600 transition-colors">
                  {currentUser.first_name || 'Profile'}
                </span>
              </Link>
            ) : (
              <div className="flex items-center gap-4">
                <Link
                  href="/sign-in"
                  className="text-slate-700 hover:text-blue-600 font-medium transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="px-5 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={toggleMobileMenu}
              className="text-slate-700 hover:text-blue-600 focus:outline-none"
            >
              {isMobileOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white">
          <div className="px-4 pt-2 pb-4 space-y-3">
            <Link
              href="/"
              className="block py-2 text-slate-700 hover:text-blue-600 font-medium"
              onClick={() => setIsMobileOpen(false)}
            >
              Home
            </Link>
            <Link
              href="/vehicles"
              className="block py-2 text-slate-700 hover:text-blue-600 font-medium"
              onClick={() => setIsMobileOpen(false)}
            >
              Vehicles
            </Link>
            <Link
              href="/bookings"
              className="block py-2 text-slate-700 hover:text-blue-600 font-medium"
              onClick={() => setIsMobileOpen(false)}
            >
              Bookings
            </Link>
            <Link
              href="/support"
              className="block py-2 text-slate-700 hover:text-blue-600 font-medium"
              onClick={() => setIsMobileOpen(false)}
            >
              Support
            </Link>

            {currentUser ? (
              <Link
                href="/profile"
                className="block py-3 flex items-center gap-3 border-t border-slate-100 hover:bg-slate-50 transition-colors"
                onClick={() => setIsMobileOpen(false)}
              >
                <div className="w-10 h-10 rounded-md overflow-hidden border border-slate-300 bg-slate-100 flex items-center justify-center flex-shrink-0">
                  {currentUser.avatar_url ? (
                    <Image
                      src={currentUser.avatar_url}
                      alt="Avatar"
                      width={40}
                      height={40}
                      className="object-cover w-full h-full"
                      unoptimized
                    />
                  ) : (
                    <User size={22} className="text-slate-500" />
                  )}
                </div>
                <span className="font-medium text-slate-800">
                  {currentUser.first_name || 'Profile'}
                </span>
              </Link>
            ) : (
              <div className="pt-4 flex flex-col gap-3 border-t border-slate-100">
                <Link
                  href="/sign-in"
                  className="block py-2.5 text-center text-slate-700 hover:text-blue-600 font-medium"
                  onClick={() => setIsMobileOpen(false)}
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="block py-2.5 text-center bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700"
                  onClick={() => setIsMobileOpen(false)}
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}