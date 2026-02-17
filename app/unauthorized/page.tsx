// app/unauthorized/page.tsx
'use client';

import React from 'react';
import { AlertCircle, ArrowLeft, Home } from 'lucide-react';
import Link from 'next/link';

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-lg w-full bg-white border border-slate-200 rounded-lg p-8 md:p-12 text-center shadow-sm">
        {/* Icon */}
        <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
          <AlertCircle className="text-red-600" size={40} />
        </div>

        {/* Title */}
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
          Access Denied
        </h1>

        {/* Message */}
        <p className="text-lg text-slate-600 mb-8 leading-relaxed">
          You don't have permission to access this page.
          <br />
          This area is restricted to authorized users only.
        </p>

        {/* Possible reasons */}
        <div className="bg-slate-50 border border-slate-200 rounded-md p-6 mb-10 text-left">
          <h3 className="font-semibold text-slate-800 mb-3">Possible reasons:</h3>
          <ul className="space-y-2 text-slate-600">
            <li>• You are not logged in</li>
            <li>• Your account doesn't have the required role</li>
            <li>• The page is only for car owners or administrators</li>
          </ul>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/"
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-slate-800 text-white rounded-md font-medium hover:bg-slate-900 transition-colors"
          >
            <ArrowLeft size={18} />
            Back to Home
          </Link>

          <Link
            href="/sign-in"
            className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors"
          >
            Sign In
          </Link>
        </div>

        {/* Support text */}
        <p className="mt-10 text-sm text-slate-500">
          If you believe this is an error, please contact support.
        </p>
      </div>
    </div>
  );
}