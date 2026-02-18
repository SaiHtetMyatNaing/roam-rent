'use client';

import React, { useState, useEffect } from 'react';
import {
  MessageCircle, AlertTriangle, Clock, CheckCircle2, ChevronDown,
  X, Plus, Loader2, AlertCircle, ArrowRight, Car, Search,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

type Priority = 'low' | 'medium' | 'high';
type DisputeStatus = 'open' | 'pending' | 'resolved';

type Booking = {
  id: string;
  pickup_date: string;
  dropoff_date: string;
  pickup_location: string;
  status: string;
  vehicle: { make: string; model: string; year: number } | null;
};

type Dispute = {
  id: string;
  title: string;
  description: string | null;
  priority: Priority;
  status: DisputeStatus;
  created_at: string;
  resolved_at: string | null;
  booking: {
    pickup_date: string;
    dropoff_date: string;
    vehicle: { make: string; model: string; year: number } | null;
  } | null;
};

const PRIORITY_CONFIG: Record<Priority, { label: string; textColor: string; bgColor: string; borderColor: string }> = {
  low:    { label: 'Low',    textColor: 'text-slate-700',   bgColor: 'bg-slate-50',   borderColor: 'border-slate-200' },
  medium: { label: 'Medium', textColor: 'text-amber-700',   bgColor: 'bg-amber-50',   borderColor: 'border-amber-200' },
  high:   { label: 'High',   textColor: 'text-red-700',     bgColor: 'bg-red-50',     borderColor: 'border-red-200' },
};

const STATUS_CONFIG: Record<DisputeStatus, { label: string; textColor: string; bgColor: string; icon: React.ReactNode }> = {
  open:     { label: 'Open',     textColor: 'text-blue-700',    bgColor: 'bg-blue-50',    icon: <MessageCircle size={11} /> },
  pending:  { label: 'Pending',  textColor: 'text-amber-700',   bgColor: 'bg-amber-50',   icon: <Clock size={11} /> },
  resolved: { label: 'Resolved', textColor: 'text-emerald-700', bgColor: 'bg-emerald-50', icon: <CheckCircle2 size={11} /> },
};

const DISPUTE_TOPICS = [
  'Vehicle condition issue',
  'Billing / overcharge',
  'Pickup / dropoff problem',
  'Owner no-show',
  'Vehicle not as described',
  'Damage claim dispute',
  'Refund request',
  'Safety concern',
  'Other',
];

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function normalizeDispute(data: any): Dispute {
  const booking = Array.isArray(data?.booking) ? (data.booking[0] ?? null) : (data?.booking ?? null);
  const vehicle = booking
    ? (Array.isArray(booking.vehicle) ? (booking.vehicle[0] ?? null) : (booking.vehicle ?? null))
    : null;

  return {
    id: data.id,
    title: data.title,
    description: data.description ?? null,
    priority: data.priority,
    status: data.status,
    created_at: data.created_at,
    resolved_at: data.resolved_at ?? null,
    booking: booking
      ? {
        pickup_date: booking.pickup_date,
        dropoff_date: booking.dropoff_date,
        vehicle,
      }
      : null,
  };
}

// ─── New Dispute Modal ─────────────────────────────────────────────────────────
function NewDisputeModal({
  bookings,
  customerId,
  onClose,
  onSuccess,
}: {
  bookings: Booking[];
  customerId: string;
  onClose: () => void;
  onSuccess: (dispute: Dispute) => void;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedBookingId, setSelectedBookingId] = useState('');
  const [topic, setTopic] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const eligibleBookings = bookings.filter(b => b.status !== 'cancelled');
  const title = topic === 'Other' ? customTitle : topic;

  const handleSubmit = async () => {
    if (!selectedBookingId) return setError('Please select a booking.');
    if (!title.trim()) return setError('Please provide a title for your dispute.');

    setLoading(true);
    setError(null);

    const { data, error: err } = await supabase
      .from('disputes')
      .insert({
        booking_id: selectedBookingId,
        submitted_by: customerId,
        title: title.trim(),
        description: description.trim() || null,
        priority,
      })
      .select(`
        id, title, description, priority, status, created_at, resolved_at,
        booking:booking_id (
          pickup_date, dropoff_date,
          vehicle:vehicle_id ( make, model, year )
        )
      `)
      .single();

    setLoading(false);

    if (err) {
      setError(err.message);
    } else {
      const normalized = normalizeDispute(data);
      onSuccess(normalized);
      onClose();
    }
  };

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-gray-900 text-xl">Open a Support Ticket</h2>
            <p className="text-sm text-gray-500 mt-0.5">Our team typically responds within 24 hours</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Step 1: Select Booking */}
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
              Related Booking *
            </label>
            {eligibleBookings.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No bookings found to attach to this ticket.</p>
            ) : (
              <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                {eligibleBookings.map(b => (
                  <label
                    key={b.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      selectedBookingId === b.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="booking"
                      value={b.id}
                      checked={selectedBookingId === b.id}
                      onChange={() => setSelectedBookingId(b.id)}
                      className="accent-blue-600"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">
                        {b.vehicle ? `${b.vehicle.make} ${b.vehicle.model} · ${b.vehicle.year}` : 'Unknown vehicle'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDate(b.pickup_date)} → {formatDate(b.dropoff_date)} · {b.pickup_location}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      b.status === 'completed' ? 'bg-slate-100 text-slate-700' :
                      b.status === 'ongoing'   ? 'bg-emerald-50 text-emerald-700' :
                      'bg-blue-50 text-blue-700'
                    }`}>{b.status}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Topic */}
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
              Issue Topic *
            </label>
            <div className="grid grid-cols-2 gap-2">
              {DISPUTE_TOPICS.map(t => (
                <button
                  key={t}
                  onClick={() => setTopic(t)}
                  className={`px-3 py-2 rounded-lg text-sm text-left border transition-all ${
                    topic === t
                      ? 'border-blue-500 bg-blue-50 text-blue-800 font-medium'
                      : 'border-gray-200 text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            {topic === 'Other' && (
              <input
                type="text"
                placeholder="Describe your issue briefly..."
                value={customTitle}
                onChange={e => setCustomTitle(e.target.value)}
                className="mt-3 w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
              />
            )}
          </div>

          {/* Priority */}
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
              Priority
            </label>
            <div className="flex gap-3">
              {(['low', 'medium', 'high'] as Priority[]).map(p => {
                const cfg = PRIORITY_CONFIG[p];
                return (
                  <button
                    key={p}
                    onClick={() => setPriority(p)}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${
                      priority === p
                        ? `${cfg.bgColor} ${cfg.textColor} ${cfg.borderColor}`
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
              Description <span className="font-normal normal-case text-gray-400">(optional)</span>
            </label>
            <textarea
              rows={4}
              placeholder="Please describe the issue in detail. Include any relevant dates, amounts, or circumstances..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              maxLength={1000}
              className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all resize-none"
            />
            <p className="text-right text-xs text-gray-400 mt-1">{description.length}/1000</p>
          </div>

          {error && (
            <p className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-xl border border-red-100">
              <AlertCircle size={15} /> {error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 py-3 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors text-sm">
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-3 rounded-xl font-medium transition-colors text-sm shadow-sm"
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : <MessageCircle size={15} />}
              {loading ? 'Submitting…' : 'Submit Ticket'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Customer Support Page ────────────────────────────────────────────────
export default function CustomerSupportPage() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | DisputeStatus>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const init = async () => {
      const email = localStorage.getItem('user_email');
      if (!email) { window.location.href = '/sign-in'; return; }

      const { data: user } = await supabase
        .from('users').select('id').eq('email', email.trim().toLowerCase()).single();

      if (!user) { setError('User not found.'); setLoading(false); return; }
      setCustomerId(user.id);

      // Fetch bookings for new dispute form
      const { data: bData } = await supabase
        .from('bookings')
        .select(`
          id, pickup_date, dropoff_date, pickup_location, status,
          vehicle:vehicle_id ( make, model, year )
        `)
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false });

      setBookings(
        (bData ?? []).map((b: any) => ({
          ...b,
          vehicle: Array.isArray(b.vehicle) ? (b.vehicle[0] ?? null) : (b.vehicle ?? null),
        }))
      );

      // Fetch disputes
      const { data: dData, error: dErr } = await supabase
        .from('disputes')
        .select(`
          id, title, description, priority, status, created_at, resolved_at,
          booking:booking_id (
            pickup_date, dropoff_date,
            vehicle:vehicle_id ( make, model, year )
          )
        `)
        .eq('submitted_by', user.id)
        .order('created_at', { ascending: false });

      if (dErr) setError(dErr.message);
      else {
        setDisputes((dData ?? []).map(normalizeDispute));
      }

      setLoading(false);
    };
    init();
  }, []);

  const filtered = disputes.filter(d => {
    const matchStatus = filterStatus === 'all' || d.status === filterStatus;
    const s = searchTerm.toLowerCase();
    const matchSearch = d.title.toLowerCase().includes(s) ||
      (d.description?.toLowerCase() ?? '').includes(s);
    return matchStatus && matchSearch;
  });

  const stats = {
    open:     disputes.filter(d => d.status === 'open').length,
    pending:  disputes.filter(d => d.status === 'pending').length,
    resolved: disputes.filter(d => d.status === 'resolved').length,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-blue-700 font-medium">Loading support tickets...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl shadow-sm p-8 max-w-md w-full text-center">
          <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
          <p className="text-gray-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-700 to-blue-900 text-white px-6 py-10 shadow-lg">
        <div className="max-w-4xl mx-auto">
          <p className="text-blue-200 text-sm font-medium uppercase tracking-wide mb-2">My Account</p>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold mb-2">Customer Support</h1>
              <p className="text-blue-200">Our team is here to help resolve any issues with your rentals.</p>
            </div>
            <button
              onClick={() => setShowNew(true)}
              className="flex-shrink-0 flex items-center gap-2 bg-white text-blue-700 hover:bg-blue-50 px-5 py-3 rounded-xl font-semibold text-sm transition-colors shadow-sm mt-1"
            >
              <Plus size={16} /> New Ticket
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-8">
            {[
              { label: 'Open',     value: stats.open,     color: 'text-blue-200' },
              { label: 'Pending',  value: stats.pending,  color: 'text-amber-200' },
              { label: 'Resolved', value: stats.resolved, color: 'text-emerald-200' },
            ].map(s => (
              <div key={s.label} className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 text-center">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-blue-200 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white border-b border-gray-200 shadow-sm px-6 py-4 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
            <input
              type="text"
              placeholder="Search tickets..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
            />
          </div>
          <div className="flex gap-2">
            {(['all', 'open', 'pending', 'resolved'] as const).map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
                  filterStatus === s
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {s === 'all' ? 'All' : s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tickets */}
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-4">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
            <MessageCircle className="mx-auto text-gray-300 mb-5" size={64} strokeWidth={1.2} />
            <h3 className="text-xl font-semibold text-gray-800 mb-2">No tickets found</h3>
            <p className="text-gray-500 mb-6 max-w-sm mx-auto">
              {disputes.length === 0
                ? "You haven't opened any support tickets yet. If you're experiencing an issue, we're here to help."
                : 'No tickets match your current filter.'}
            </p>
            <button
              onClick={() => setShowNew(true)}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium transition-colors shadow-sm"
            >
              <Plus size={16} /> Open a Ticket <ArrowRight size={15} />
            </button>
          </div>
        ) : (
          filtered.map(dispute => {
            const pCfg = PRIORITY_CONFIG[dispute.priority];
            const sCfg = STATUS_CONFIG[dispute.status];
            const isExpanded = expanded === dispute.id;

            return (
              <div
                key={dispute.id}
                className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
              >
                <div
                  className="flex items-start gap-4 p-5 cursor-pointer hover:bg-blue-50/20 transition-colors"
                  onClick={() => setExpanded(isExpanded ? null : dispute.id)}
                >
                  <div className={`mt-0.5 flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${sCfg.bgColor}`}>
                    <span className={sCfg.textColor}>{sCfg.icon}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-semibold text-gray-900 text-base">{dispute.title}</p>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${pCfg.bgColor} ${pCfg.textColor} ${pCfg.borderColor}`}>
                          {pCfg.label}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${sCfg.bgColor} ${sCfg.textColor}`}>
                          {sCfg.label}
                        </span>
                      </div>
                    </div>

                    {dispute.booking?.vehicle && (
                      <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                        <Car size={13} />
                        {dispute.booking.vehicle.make} {dispute.booking.vehicle.model} · {dispute.booking.vehicle.year}
                        {' · '}{formatDate(dispute.booking.pickup_date)} → {formatDate(dispute.booking.dropoff_date)}
                      </p>
                    )}

                    <p className="text-xs text-gray-400 mt-1.5">
                      Opened {formatDate(dispute.created_at)}
                      {dispute.resolved_at && ` · Resolved ${formatDate(dispute.resolved_at)}`}
                    </p>
                  </div>

                  <ChevronDown
                    size={18}
                    className={`text-gray-400 flex-shrink-0 mt-1 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  />
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-100 px-5 py-5 bg-gray-50/40">
                    {dispute.description ? (
                      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Description</p>
                        <p className="text-sm text-gray-700 leading-relaxed">{dispute.description}</p>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 italic mb-4">No description provided.</p>
                    )}

                    {dispute.status === 'resolved' ? (
                      <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-4 py-3">
                        <CheckCircle2 size={16} />
                        This ticket has been resolved. Thank you for your patience.
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-4 py-3">
                        <Clock size={15} />
                        {dispute.status === 'pending'
                          ? 'Our team is reviewing your ticket and will respond shortly.'
                          : 'Ticket submitted. Our support team will review it within 24 hours.'}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Help Banner */}
      <div className="max-w-4xl mx-auto px-6 pb-12">
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-2xl p-6 flex items-center gap-5">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <MessageCircle size={22} className="text-white" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-blue-900">Need urgent assistance?</p>
            <p className="text-sm text-blue-700 mt-0.5">
              For safety emergencies or critical issues, you can also reach us directly at{' '}
              <a href="mailto:support@yourapp.com" className="underline font-medium">support@yourapp.com</a>
            </p>
          </div>
          <button
            onClick={() => setShowNew(true)}
            className="flex-shrink-0 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm flex items-center gap-2"
          >
            Open Ticket <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {showNew && customerId && (
        <NewDisputeModal
          bookings={bookings}
          customerId={customerId}
          onClose={() => setShowNew(false)}
          onSuccess={newDispute => setDisputes(prev => [newDispute, ...prev])}
        />
      )}
    </div>
  );
}   
