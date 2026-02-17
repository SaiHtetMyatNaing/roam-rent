// lib/auth/role-check.ts
'use client'; // ← must be client component to read localStorage

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

type UserRole = 'customer' | 'car-owner' | 'admin' | null;

type UserData = {
  id: string;
  email: string;
  role: UserRole;
  status: string;
  first_name?: string;
  avatar_url?: string | null;
} | null;

/**
 * Client-side role check hook
 * - Reads user_email from localStorage
 * - Queries public.users table
 * - Returns user data if authorized, redirects otherwise
 */
export function useUserRole(
  allowedRoles: UserRole[] = ['customer', 'car-owner', 'admin'],
  redirectToLogin = '/sign-in',
  redirectToUnauthorized = '/unauthorized'
) {
  const router = useRouter();
  const [user, setUser] = useState<UserData>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkRole = async () => {
      const storedEmail = localStorage.getItem('user_email');
      if (!storedEmail) {
        router.replace(redirectToLogin);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, email, role, status, first_name, avatar_url')
          .eq('email', storedEmail.trim().toLowerCase())
          .single();

        if (error || !data) {
          console.error('Role check failed:', error?.message || 'User not found');
          localStorage.removeItem('user_email');
          router.replace(redirectToLogin);
          return;
        }

        // Account not active
        if (data.status !== 'active') {
          router.replace('/account-inactive');
          return;
        }

        // Role not allowed
        if (!allowedRoles.includes(data.role as UserRole)) {
          router.replace(redirectToUnauthorized);
          return;
        }

        setUser(data);
      } catch (err: any) {
        console.error('Unexpected role check error:', err);
        setError(err.message || 'Failed to verify access');
        router.replace(redirectToLogin);
      } finally {
        setLoading(false);
      }
    };

    checkRole();
  }, [router, allowedRoles, redirectToLogin, redirectToUnauthorized]);

  return { user, loading, error };
}