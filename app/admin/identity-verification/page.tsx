'use client';

import React, { useState, useEffect } from 'react';
import {
  Shield, Search, CheckCircle2, XCircle, Clock, Eye,
  User, FileText, AlertCircle, Loader2, X, ChevronDown,
  CreditCard, RefreshCw, Filter,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

type VerificationStatus = 'pending' | 'verified' | 'rejected';
type DocumentType = 'driver_license' | 'passport' | 'id_card';

type Verification = {
  id: string;
  document_type: DocumentType;
  document_url: string | null;
  status: VerificationStatus;
  created_at: string;
  verified_at: string | null;
  user: { id: string; first_name: string; last_name: string; email: string; avatar_url: string | null } | null;
  verified_by_user: { first_name: string; last_name: string } | null;
};

const STATUS_CONFIG: Record<VerificationStatus, { label: string; textColor: string; bgColor: string; borderColor: string; icon: React.ReactNode }> = {
  pending:  { label: 'Pending',  textColor: 'text-blue-700',   bgColor: 'bg-blue-50',   borderColor: 'border-blue-200',   icon: <Clock size={12} /> },
  verified: { label: 'Verified', textColor: 'text-sky-700',    bgColor: 'bg-sky-50',    borderColor: 'border-sky-200',    icon: <CheckCircle2 size={12} /> },
  rejected: { label: 'Rejected', textColor: 'text-indigo-700', bgColor: 'bg-indigo-50', borderColor: 'border-indigo-200', icon: <XCircle size={12} /> },
};

const DOC_LABELS: Record<DocumentType, string> = {
  driver_license: "Driver's License",
  passport:       'Passport',
  id_card:        'ID Card',
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function timeAgo(d: string) {
  const h = Math.floor((Date.now() - new Date(d).getTime()) / 3_600_000);
  if (h < 1) return 'Just now';
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  return days < 30 ? `${days}d ago` : formatDate(d);
}

// ─── Detail Panel ──────────────────────────────────────────────────────────────
function VerificationPanel({
  item,
  adminId,
  onClose,
  onUpdate,
}: {
  item: Verification;
  adminId: string;
  onClose: () => void;
  onUpdate: (id: string, status: VerificationStatus) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDecision = async (decision: 'verified' | 'rejected') => {
    setLoading(true);
    setError(null);
    const { error: err } = await supabase
      .from('identity_verifications')
      .update({
        status: decision,
        verified_by: adminId,
        verified_at: new Date().toISOString(),
      })
      .eq('id', item.id);
    setLoading(false);
    if (err) setError(err.message);
    else { onUpdate(item.id, decision); onClose(); }
  };

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="flex-1 bg-black/50 backdrop-blur-sm" />
      <div className="w-full max-w-md bg-white shadow-2xl overflow-y-auto flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h3 className="font-bold text-gray-900">Verification Details</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-5 flex-1">
          {/* Applicant */}
          <div className="flex items-center gap-4 bg-gray-50 rounded-xl p-4 border border-gray-100">
            <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {item.user?.avatar_url
                ? <img src={item.user.avatar_url} alt="" className="w-full h-full object-cover" />
                : <User size={24} className="text-blue-500" />
              }
            </div>
            <div>
              <p className="font-bold text-gray-900 text-lg">
                {item.user?.first_name} {item.user?.last_name}
              </p>
              <p className="text-sm text-gray-500">{item.user?.email}</p>
            </div>
          </div>

          {/* Doc Info */}
          <div className="bg-blue-50/50 rounded-xl border border-blue-100 p-4 space-y-3 text-sm">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Submission Details</p>
            <div className="flex justify-between">
              <span className="text-gray-500">Document Type</span>
              <span className="font-semibold text-gray-900">{DOC_LABELS[item.document_type]}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Submitted</span>
              <span className="font-medium text-gray-900">{formatDate(item.created_at)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Current Status</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_CONFIG[item.status].bgColor} ${STATUS_CONFIG[item.status].textColor}`}>
                {STATUS_CONFIG[item.status].label}
              </span>
            </div>
            {item.verified_at && (
              <div className="flex justify-between">
                <span className="text-gray-500">Reviewed</span>
                <span className="font-medium text-gray-900">{formatDate(item.verified_at)}</span>
              </div>
            )}
            {item.verified_by_user && (
              <div className="flex justify-between">
                <span className="text-gray-500">Reviewed by</span>
                <span className="font-medium text-gray-900">
                  {item.verified_by_user.first_name} {item.verified_by_user.last_name}
                </span>
              </div>
            )}
          </div>

          {/* Document Image */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Document</p>
            {item.document_url ? (
              <div className="rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                <img
                  src={item.document_url}
                  alt="Identity document"
                  className="w-full object-contain max-h-64"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <a
                  href={item.document_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 py-3 text-sm text-blue-600 hover:text-blue-700 font-medium border-t border-gray-200 transition-colors"
                >
                  <Eye size={15} /> View Full Document
                </a>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
                <FileText size={32} className="mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-500">No document uploaded</p>
              </div>
            )}
          </div>

          {error && (
            <p className="flex items-center gap-2 text-sm text-blue-700 bg-blue-50 p-3 rounded-xl border border-blue-100">
              <AlertCircle size={15} /> {error}
            </p>
          )}

          {/* Actions */}
          {item.status === 'pending' ? (
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => handleDecision('rejected')}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-blue-300 text-blue-700 hover:bg-blue-50 font-medium text-sm transition-colors disabled:opacity-50"
              >
                {loading ? <Loader2 size={15} className="animate-spin" /> : <XCircle size={15} />}
                Reject
              </button>
              <button
                onClick={() => handleDecision('verified')}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-colors shadow-sm disabled:opacity-50"
              >
                {loading ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                Verify
              </button>
            </div>
          ) : (
            <div className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium ${
              item.status === 'verified'
                ? 'bg-sky-50 text-sky-700 border border-sky-200'
                : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
            }`}>
              {item.status === 'verified' ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
              This document has been {item.status}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminIdentityVerificationsPage() {
  const [items, setItems] = useState<Verification[]>([]);
  const [adminId, setAdminId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Verification | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | VerificationStatus>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const init = async () => {
      const email = localStorage.getItem('user_email');
      if (!email) { window.location.href = '/sign-in'; return; }

      const { data: admin } = await supabase.from('users').select('id, role').eq('email', email.trim().toLowerCase()).single();
      if (!admin || admin.role !== 'admin') { window.location.href = '/'; return; }
      setAdminId(admin.id);

      const { data, error: err } = await supabase
        .from('identity_verifications')
        .select(`
          id, document_type, document_url, status, created_at, verified_at,
          user:user_id ( id, first_name, last_name, email, avatar_url ),
          verified_by_user:verified_by ( first_name, last_name )
        `)
        .order('created_at', { ascending: false });

      if (err) setError(err.message);
      else setItems((data ?? []).map((d: any) => ({
        ...d,
        user: Array.isArray(d.user) ? (d.user[0] ?? null) : (d.user ?? null),
        verified_by_user: Array.isArray(d.verified_by_user) ? (d.verified_by_user[0] ?? null) : (d.verified_by_user ?? null),
      })));
      setLoading(false);
    };
    init();
  }, []);

  const filtered = items.filter(i => {
    if (filterStatus !== 'all' && i.status !== filterStatus) return false;
    const s = searchTerm.toLowerCase();
    return (
      `${i.user?.first_name} ${i.user?.last_name}`.toLowerCase().includes(s) ||
      (i.user?.email?.toLowerCase() ?? '').includes(s)
    );
  });

  const stats = {
    pending:  items.filter(i => i.status === 'pending').length,
    verified: items.filter(i => i.status === 'verified').length,
    rejected: items.filter(i => i.status === 'rejected').length,
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-blue-700 font-medium">Loading verifications...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-800 to-blue-900 text-white px-6 py-10 shadow-lg">
        <div className="max-w-6xl mx-auto">
          <p className="text-blue-200 text-sm font-medium uppercase tracking-wide mb-2">Admin Panel</p>
          <h1 className="text-4xl font-bold mb-8">Identity Verification</h1>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Awaiting Review', value: stats.pending,  color: 'text-blue-200' },
              { label: 'Verified',        value: stats.verified, color: 'text-blue-300' },
              { label: 'Rejected',        value: stats.rejected, color: 'text-indigo-200' },
            ].map(s => (
              <div key={s.label} className="bg-white/10 border border-white/10 rounded-xl p-4 text-center">
                <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-blue-200 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white border-b border-gray-200 shadow-sm px-6 py-4 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
            <input type="text" placeholder="Search by name or email..." value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all" />
          </div>
          <div className="flex gap-2">
            {(['all', 'pending', 'verified', 'rejected'] as const).map(s => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
                  filterStatus === s ? 'bg-blue-700 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}>
                {s === 'all' ? 'All' : STATUS_CONFIG[s].label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* List */}
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-3">
        {error && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-blue-700 flex items-center gap-2">
            <AlertCircle size={16} /> {error}
          </div>
        )}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Shield className="mx-auto text-gray-300 mb-4" size={56} strokeWidth={1.2} />
            <p className="text-gray-500">No verification requests found.</p>
          </div>
        ) : filtered.map(item => {
          const sCfg = STATUS_CONFIG[item.status];
          return (
            <div key={item.id} onClick={() => setSelected(item)}
              className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex items-center gap-5 cursor-pointer hover:shadow-md hover:border-blue-200 transition-all group">
              <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0 overflow-hidden border border-blue-100">
                {item.user?.avatar_url
                  ? <img src={item.user.avatar_url} alt="" className="w-full h-full object-cover" />
                  : <User size={20} className="text-blue-400" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 justify-between">
                  <div>
                    <p className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
                      {item.user?.first_name} {item.user?.last_name}
                    </p>
                    <p className="text-sm text-gray-500">{item.user?.email}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                      {DOC_LABELS[item.document_type]}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${sCfg.bgColor} ${sCfg.textColor} ${sCfg.borderColor}`}>
                      {sCfg.icon} {sCfg.label}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-1">{timeAgo(item.created_at)}</p>
              </div>
              <Eye size={16} className="text-gray-400 group-hover:text-blue-500 transition-colors flex-shrink-0" />
            </div>
          );
        })}
      </div>

      {selected && adminId && (
        <VerificationPanel
          item={selected}
          adminId={adminId}
          onClose={() => setSelected(null)}
          onUpdate={(id, status) => {
            setItems(prev => prev.map(i => i.id === id ? { ...i, status } : i));
            setSelected(null);
          }}
        />
      )}
    </div>
  );
}
