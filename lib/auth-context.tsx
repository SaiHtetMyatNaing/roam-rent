// lib/AuthContext.tsx (create this file)
'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type User = {
  id: string;
  role: 'customer' | 'car-owner' | 'admin' | null;
  avatar_url?: string | null;
  first_name?: string;
} | null;

type AuthContextType = {
  user: User;
  setUser: (user: User) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User>(null);

  useEffect(() => {
    // Load from localStorage on mount
    const storedEmail = localStorage.getItem('user_email');
    if (storedEmail) {
      // We don't fetch here — we rely on login to set correct data
      // If you want to re-validate, do it in a separate protected route
      // For now we trust localStorage (common pattern for fast UI)
    }

    // Listen for changes
    const handleStorage = () => {
      const email = localStorage.getItem('user_email');
      if (!email) {
        setUser(null);
      } else {
        // Optional: re-fetch if you want to be extra sure
        // But for speed we can just keep the previous user object
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const logout = () => {
    localStorage.removeItem('user_email');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}