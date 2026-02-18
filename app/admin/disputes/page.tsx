'use client';

import React, { useState, useEffect } from 'react';
import {
  MessageCircle, Clock, CheckCircle2, AlertTriangle, Search,
  ChevronDown, Loader2, AlertCircle, User, Car, Calendar,
  Filter, X, ShieldCheck, Eye,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

type Priority = 'low' | 'medium' | 'high';
type DisputeStatus = 'open' | 'pending' | 'resolved';

type Dispute = {
  id: string;
  title: string;
  description: string | null;
  priority: Priority;
  status: DisputeStatus;
  created_at: string;
  resolved_at: string | null;
  submitted_by_user: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  } | null;
  resolved_by_user: {
    first_name: string;
    last_name: string;
  } | null;
  booking: {
    id: string;
    pickup_date: string;
    dropoff_date: string;
    pickup_location: string;
    dropoff_location: string;
    total_price: number;
    status: string;
    vehicle: { make: string; model: string; year: number } | null;
  } | null;
};

const PRIORITY_CONFIG: Record<Priority, { label: string; textColor: string; bgColor: string; borderColor: string; dot: string }> = {
  low:    { label: 'Low',    textColor: 'text-blue-700',   bgColor: 'bg-blue-50',   borderColor: 'border-blue-200',   dot: 'bg-blue-400' },
  medium: { label: 'Medium', textColor: 'text-sky-700',    bgColor: 'bg-sky-50',    borderColor: 'border-sky-200',    dot: 'bg-sky-400' },
  high:   { label: 'High',   textColor: 'text-indigo-700', bgColor: 'bg-indigo-50', borderColor: 'border-indigo-200', dot: 'bg-indigo-500' },
};

const STATUS_CONFIG: Record<DisputeStatus, { label: string; textColor: string; bgColor: string; borderColor: string }> = {
  open:     { label: 'Open',         textColor: 'text-blue-700',   bgColor: 'bg-blue-50',   borderColor: 'border-blue-200' },
  pending:  { label: 'Under Review', textColor: 'text-sky-700',    bgColor: 'bg-sky-50',    borderColor: 'border-sky-200' },
  resolved: { label: 'Resolved',     textColor: 'text-indigo-700', bgColor: 'bg-indigo-50', borderColor: 'border-indigo-200' },
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return 'Just now';
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(d);
}

// ─── Dispute Detail Panel ──────────────────────────────────────────────────────
function DisputePanel({
  dispute,
  adminId,
  onClose,
  onUpdate,
}: {
  dispute: Dispute;
  adminId: string;
  onClose: () => void;
  onUpdate: (id: string, changes: Partial<Dispute>) => void;
}) {
  const [status, setStatus] = useState<DisputeStatus>(dispute.status);
  const [priority, setPriority] = useState<Priority>(dispute.priority);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const hasChanges = status !== dispute.status || priority !== dispute.priority;

  const handleSave = async () => {
    setLoading(true);
    setError(null);

    const updates: Record<string, any> = { priority, status };
    if (status === 'resolved' && dispute.status !== 'resolved') {
      updates.resolved_by = adminId;
      updates.resolved_at = new Date().toISOString();
    }

    const { error: err } = await supabase
      .from('disputes')
      .update(updates)
      .eq('id', dispute.id);

    setLoading(false);
    if (err) {
      setError(err.message);
    } else {
      setSaved(true);
      onUpdate(dispute.id, {
        status,
        priority,
        resolved_at: updates.resolved_at ?? dispute.resolved_at,
      });
      setTimeout(() => setSaved(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      {/* Backdrop */}
      <div className="flex-1 bg-black/50 backdrop-blur-sm" />
      {/* Panel */}
      <div
        className="w-full max-w-lg bg-white shadow-2xl overflow-y-auto flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${PRIORITY_CONFIG[priority].dot}`} />
            <h3 className="font-bold text-gray-900">Ticket Details</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6 flex-1">
          {/* Title & Meta */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">{dispute.title}</h2>
            <div className="flex flex-wrap gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${STATUS_CONFIG[status].bgColor} ${STATUS_CONFIG[status].textColor} ${STATUS_CONFIG[status].borderColor}`}>
                {STATUS_CONFIG[status].label}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${PRIORITY_CONFIG[priority].bgColor} ${PRIORITY_CONFIG[priority].textColor} ${PRIORITY_CONFIG[priority].borderColor}`}>
                {PRIORITY_CONFIG[priority].label} Priority
              </span>
              <span className="text-xs text-gray-400 self-center">{timeAgo(dispute.created_at)}</span>
            </div>
          </div>

          {/* Customer */}
          {dispute.submitted_by_user && (
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <User size={12} /> Submitted by
              </p>
              <p className="font-semibold text-gray-900">
                {dispute.submitted_by_user.first_name} {dispute.submitted_by_user.last_name}
              </p>
              <p className="text-sm text-gray-500">{dispute.submitted_by_user.email}</p>
            </div>
          )}

          {/* Booking */}
          {dispute.booking && (
            <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <Car size={12} /> Related Booking
              </p>
              <div className="space-y-2 text-sm">
                {dispute.booking.vehicle && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Vehicle</span>
                    <span className="font-medium text-gray-900">
                      {dispute.booking.vehicle.make} {dispute.booking.vehicle.model} · {dispute.booking.vehicle.year}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Dates</span>
                  <span className="font-medium text-gray-900">
                    {formatDate(dispute.booking.pickup_date)} → {formatDate(dispute.booking.dropoff_date)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Pick-up</span>
                  <span className="font-medium text-gray-900 text-right max-w-[60%]">{dispute.booking.pickup_location}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Total paid</span>
                  <span className="font-bold text-blue-800">${dispute.booking.total_price?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Booking status</span>
                  <span className="font-medium text-gray-900 capitalize">{dispute.booking.status}</span>
                </div>
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Customer's Description</p>
            {dispute.description ? (
              <p className="text-sm text-gray-700 leading-relaxed bg-white border border-gray-200 rounded-xl p-4">
                {dispute.description}
              </p>
            ) : (
              <p className="text-sm text-gray-400 italic">No description provided.</p>
            )}
          </div>

          {/* Admin Controls */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-5 border border-blue-200 space-y-4">
            <p className="text-xs font-bold text-blue-700 uppercase tracking-wide flex items-center gap-1.5">
              <ShieldCheck size={13} /> Admin Actions
            </p>

            <div>
              <label className="block text-xs text-blue-600 mb-1.5">Update Status</label>
              <div className="grid grid-cols-3 gap-2">
                {(['open', 'pending', 'resolved'] as DisputeStatus[]).map(s => {
                  const cfg = STATUS_CONFIG[s];
                  return (
                    <button
                      key={s}
                      onClick={() => setStatus(s)}
                      className={`py-2 rounded-lg text-xs font-semibold border transition-all ${
                        status === s
                          ? `${cfg.bgColor} ${cfg.textColor} ${cfg.borderColor}`
                          : 'bg-white border-blue-200 text-blue-600 hover:border-blue-300'
                      }`}
                    >
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs text-blue-600 mb-1.5">Priority Level</label>
              <div className="grid grid-cols-3 gap-2">
                {(['low', 'medium', 'high'] as Priority[]).map(p => {
                  const cfg = PRIORITY_CONFIG[p];
                  return (
                    <button
                      key={p}
                      onClick={() => setPriority(p)}
                      className={`py-2 rounded-lg text-xs font-semibold border transition-all ${
                        priority === p
                          ? `${cfg.bgColor} ${cfg.textColor} ${cfg.borderColor}`
                          : 'bg-white border-blue-200 text-blue-600 hover:border-blue-300'
                      }`}
                    >
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {error && (
              <p className="flex items-center gap-2 text-xs text-blue-700 bg-blue-50 p-2.5 rounded-lg border border-blue-100">
                <AlertCircle size={13} /> {error}
              </p>
            )}

            <button
              onClick={handleSave}
              disabled={loading || !hasChanges}
              className={`w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                saved
                  ? 'bg-blue-600 text-white'
                  : hasChanges
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                  : 'bg-blue-50 text-blue-300 cursor-not-allowed'
              }`}
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> :
               saved    ? <><CheckCircle2 size={15} /> Saved!</> :
               <><ShieldCheck size={15} /> Save Changes</>}
            </button>
          </div>

          {dispute.resolved_at && dispute.resolved_by_user && (
            <p className="text-xs text-gray-400 text-center">
              Resolved on {formatDate(dispute.resolved_at)} by{' '}
              {dispute.resolved_by_user.first_name} {dispute.resolved_by_user.last_name}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Admin Disputes Management Page ───────────────────────────────────────────
export default function AdminDisputesPage() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [adminId, setAdminId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | DisputeStatus>('all');
  const [filterPriority, setFilterPriority] = useState<'all' | Priority>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const init = async () => {
      const email = localStorage.getItem('user_email');
      if (!email) { window.location.href = '/sign-in'; return; }

      const { data: user } = await supabase
        .from('users').select('id, role').eq('email', email.trim().toLowerCase()).single();

      if (!user || user.role !== 'admin') {
        window.location.href = '/';
        return;
      }
      setAdminId(user.id);

      const { data, error: err } = await supabase
        .from('disputes')
        .select(`
          id, title, description, priority, status, created_at, resolved_at,
          submitted_by_user:submitted_by ( id, first_name, last_name, email ),
          resolved_by_user:resolved_by ( first_name, last_name ),
          booking:booking_id (
            id, pickup_date, dropoff_date, pickup_location, dropoff_location, total_price, status,
            vehicle:vehicle_id ( make, model, year )
          )
        `)
        .order('created_at', { ascending: false });

      if (err) setError(err.message);
      else {
        setDisputes(
          (data ?? []).map((d: any) => ({
            ...d,
            submitted_by_user: Array.isArray(d.submitted_by_user) ? (d.submitted_by_user[0] ?? null) : (d.submitted_by_user ?? null),
            resolved_by_user:  Array.isArray(d.resolved_by_user)  ? (d.resolved_by_user[0]  ?? null) : (d.resolved_by_user  ?? null),
            booking: Array.isArray(d.booking) ? (d.booking[0] ?? null) : (d.booking ?? null),
          }))
        );
      }
      setLoading(false);
    };
    init();
  }, []);

  const filtered = disputes.filter(d => {
    if (filterStatus !== 'all' && d.status !== filterStatus) return false;
    if (filterPriority !== 'all' && d.priority !== filterPriority) return false;
    const s = searchTerm.toLowerCase();
    return (
      d.title.toLowerCase().includes(s) ||
      (d.submitted_by_user?.email?.toLowerCase() ?? '').includes(s) ||
      (`${d.submitted_by_user?.first_name} ${d.submitted_by_user?.last_name}`).toLowerCase().includes(s)
    );
  });

  const stats = {
    open:     disputes.filter(d => d.status === 'open').length,
    pending:  disputes.filter(d => d.status === 'pending').length,
    resolved: disputes.filter(d => d.status === 'resolved').length,
    high:     disputes.filter(d => d.priority === 'high' && d.status !== 'resolved').length,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-blue-700 font-medium">Loading disputes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl shadow-sm p-8 max-w-md text-center">
          <AlertCircle className="mx-auto text-blue-500 mb-4" size={48} />
          <p className="text-gray-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-800 to-blue-900 text-white px-6 py-10 shadow-lg">
        <div className="max-w-6xl mx-auto">
          <p className="text-blue-200 text-sm font-medium uppercase tracking-wide mb-2">Admin Panel</p>
          <h1 className="text-4xl font-bold mb-8">Dispute Management</h1>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Open',          value: stats.open,     color: 'text-blue-200' },
              { label: 'Under Review',  value: stats.pending,  color: 'text-sky-200' },
              { label: 'Resolved',      value: stats.resolved, color: 'text-indigo-200' },
              { label: 'High Priority', value: stats.high,     color: 'text-blue-300' },
            ].map(s => (
              <div key={s.label} className="bg-white/10 border border-white/10 rounded-xl p-4 text-center">
                <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-blue-200 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-gray-200 shadow-sm px-6 py-4 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
            <input
              type="text"
              placeholder="Search by name, email, or title..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            {(['all', 'open', 'pending', 'resolved'] as const).map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
                  filterStatus === s ? 'bg-blue-700 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {s === 'all' ? 'All Status' : STATUS_CONFIG[s as DisputeStatus].label}
              </button>
            ))}
            <div className="w-px bg-gray-200 self-stretch mx-1" />
            {(['all', 'high', 'medium', 'low'] as const).map(p => (
              <button
                key={p}
                onClick={() => setFilterPriority(p)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
                  filterPriority === p
                    ? p === 'all' ? 'bg-blue-700 text-white' :
                      `${PRIORITY_CONFIG[p as Priority].bgColor} ${PRIORITY_CONFIG[p as Priority].textColor} border ${PRIORITY_CONFIG[p as Priority].borderColor}`
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {p === 'all' ? 'All Priority' : p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Disputes Table */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
            <MessageCircle className="mx-auto text-gray-300 mb-5" size={56} strokeWidth={1.2} />
            <h3 className="text-lg font-semibold text-gray-700">No disputes match your filters</h3>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(dispute => {
              const pCfg = PRIORITY_CONFIG[dispute.priority];
              const sCfg = STATUS_CONFIG[dispute.status];

              return (
                <div
                  key={dispute.id}
                  onClick={() => setSelectedDispute(dispute)}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex items-center gap-5 cursor-pointer hover:shadow-md hover:border-blue-200 transition-all group"
                >
                  {/* Priority dot */}
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${pCfg.dot}`} />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-3 justify-between">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 truncate group-hover:text-blue-700 transition-colors">
                          {dispute.title}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 flex-wrap">
                          {dispute.submitted_by_user && (
                            <span className="flex items-center gap-1">
                              <User size={12} />
                              {dispute.submitted_by_user.first_name} {dispute.submitted_by_user.last_name}
                            </span>
                          )}
                          {dispute.booking?.vehicle && (
                            <span className="flex items-center gap-1">
                              <Car size={12} />
                              {dispute.booking.vehicle.make} {dispute.booking.vehicle.model}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Calendar size={12} />
                            {timeAgo(dispute.created_at)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${pCfg.bgColor} ${pCfg.textColor} ${pCfg.borderColor}`}>
                          {pCfg.label}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${sCfg.bgColor} ${sCfg.textColor}`}>
                          {sCfg.label}
                        </span>
                        <Eye size={16} className="text-gray-400 group-hover:text-blue-500 transition-colors ml-1" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedDispute && adminId && (
        <DisputePanel
          dispute={selectedDispute}
          adminId={adminId}
          onClose={() => setSelectedDispute(null)}
          onUpdate={(id, changes) => {
            setDisputes(prev => prev.map(d => d.id === id ? { ...d, ...changes } : d));
            setSelectedDispute(prev => prev ? { ...prev, ...changes } : null);
          }}
        />
      )}
    </div>
  );
}
