'use client';

import React, { useState, useEffect } from 'react';
import {
  Car, Calendar, MapPin, CheckCircle2, XCircle, Clock,
  AlertCircle, ChevronDown, RefreshCw, Search, Star,
  ArrowRight, X, Pencil, Loader2, CreditCard, Ban,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

type BookingStatus = 'pending' | 'upcoming' | 'ongoing' | 'completed' | 'cancelled';

type Booking = {
  id: string;
  pickup_date: string;
  dropoff_date: string;
  pickup_location: string;
  dropoff_location: string;
  total_price: number;
  status: BookingStatus;
  created_at: string;
  updated_at: string;
  vehicle: {
    id: string;
    make: string;
    model: string;
    year: number;
    type: string;
    color: string | null;
    price_per_day: number;
    location_city: string | null;
    location_state: string | null;
    vehicle_images: { url: string; is_primary: boolean }[];
  } | null;
};

type RescheduleForm = {
  pickup_date: string;
  dropoff_date: string;
  pickup_location: string;
  dropoff_location: string;
};

const STATUS_TABS = ['All', 'Pending', 'Upcoming', 'Ongoing', 'Completed', 'Cancelled'];

const STATUS_CONFIG: Record<BookingStatus, {
  label: string; textColor: string; bgColor: string; borderColor: string; icon: React.ReactNode;
}> = {
  pending:   { label: 'Pending',   textColor: 'text-amber-700',     bgColor: 'bg-amber-50',     borderColor: 'border-amber-200',   icon: <Clock size={12} /> },
  upcoming:  { label: 'Upcoming',  textColor: 'text-blue-700',      bgColor: 'bg-blue-50',      borderColor: 'border-blue-200',    icon: <Calendar size={12} /> },
  ongoing:   { label: 'Ongoing',   textColor: 'text-emerald-700',   bgColor: 'bg-emerald-50',   borderColor: 'border-emerald-200', icon: <RefreshCw size={12} /> },
  completed: { label: 'Completed', textColor: 'text-slate-700',     bgColor: 'bg-slate-100',    borderColor: 'border-slate-200',   icon: <CheckCircle2 size={12} /> },
  cancelled: { label: 'Cancelled', textColor: 'text-red-700',       bgColor: 'bg-red-50',       borderColor: 'border-red-200',     icon: <XCircle size={12} /> },
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function daysBetween(a: string, b: string) {
  return Math.max(0, Math.ceil((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000));
}

function getVehicleImg(v: Booking['vehicle']): string | null {
  if (!v?.vehicle_images?.length) return null;
  const primary = v.vehicle_images.find(i => i.is_primary);
  return primary?.url ?? v.vehicle_images[0]?.url ?? null;
}

// ─── Reschedule Modal ─────────────────────────────────────────────────────────
function RescheduleModal({
  booking,
  onClose,
  onSuccess,
}: {
  booking: Booking;
  onClose: () => void;
  onSuccess: (updated: Partial<Booking>) => void;
}) {
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState<RescheduleForm>({
    pickup_date: booking.pickup_date.split('T')[0],
    dropoff_date: booking.dropoff_date.split('T')[0],
    pickup_location: booking.pickup_location,
    dropoff_location: booking.dropoff_location,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof RescheduleForm>(k: K, v: string) => setForm(p => ({ ...p, [k]: v }));

  const days = form.pickup_date && form.dropoff_date
    ? daysBetween(form.pickup_date, form.dropoff_date) : 0;
  const newTotal = days * (booking.vehicle?.price_per_day ?? 0);

  const handleSave = async () => {
    if (!form.pickup_date || !form.dropoff_date) return setError('Please select both dates.');
    if (days <= 0) return setError('Drop-off must be after pick-up.');
    if (!form.pickup_location.trim() || !form.dropoff_location.trim()) return setError('Please fill in all location fields.');

    setLoading(true);
    setError(null);

    const { error: err } = await supabase
      .from('bookings')
      .update({
        pickup_date: new Date(form.pickup_date).toISOString(),
        dropoff_date: new Date(form.dropoff_date).toISOString(),
        pickup_location: form.pickup_location,
        dropoff_location: form.dropoff_location,
        total_price: newTotal,
        updated_at: new Date().toISOString(),
      })
      .eq('id', booking.id);

    setLoading(false);

    if (err) {
      setError(err.message);
    } else {
      onSuccess({
        pickup_date: new Date(form.pickup_date).toISOString(),
        dropoff_date: new Date(form.dropoff_date).toISOString(),
        pickup_location: form.pickup_location,
        dropoff_location: form.dropoff_location,
        total_price: newTotal,
      });
    }
  };

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="font-bold text-gray-900 text-xl">Reschedule Booking</h2>
            <p className="text-sm text-gray-600 mt-0.5">
              {booking.vehicle?.make} {booking.vehicle?.model} · {booking.vehicle?.year}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} className="text-gray-600" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Current summary */}
          <div className="bg-blue-50/40 rounded-lg p-4 text-sm border border-blue-100">
            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-3">Current Booking</p>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-gray-600 text-xs">Pick-up</p>
                <p className="font-semibold text-gray-900">{formatDate(booking.pickup_date)}</p>
              </div>
              <div>
                <p className="text-gray-600 text-xs">Drop-off</p>
                <p className="font-semibold text-gray-900">{formatDate(booking.dropoff_date)}</p>
              </div>
              <div>
                <p className="text-gray-600 text-xs">Total</p>
                <p className="font-semibold text-gray-900">${booking.total_price.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* New dates */}
          <div>
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">New Dates</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Pick-up Date</label>
                <input
                  type="date"
                  min={today}
                  value={form.pickup_date}
                  onChange={e => {
                    set('pickup_date', e.target.value);
                    if (form.dropoff_date && e.target.value >= form.dropoff_date) set('dropoff_date', '');
                  }}
                  className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200/40 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Drop-off Date</label>
                <input
                  type="date"
                  min={form.pickup_date || today}
                  value={form.dropoff_date}
                  onChange={e => set('dropoff_date', e.target.value)}
                  className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200/40 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          {/* Price preview */}
          {days > 0 && (
            <div className="flex items-center justify-between bg-blue-50 rounded-lg px-5 py-4 border border-blue-100">
              <span className="text-sm text-gray-700">{days} day{days !== 1 ? 's' : ''} × ${booking.vehicle?.price_per_day ?? 0}/day</span>
              <span className="font-bold text-blue-800 text-lg">${newTotal.toFixed(2)}</span>
            </div>
          )}

          {/* Locations */}
          <div>
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">Locations</p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Pick-up Location</label>
                <input
                  type="text"
                  placeholder="e.g. Noi Bai Airport, Hanoi"
                  value={form.pickup_location}
                  onChange={e => set('pickup_location', e.target.value)}
                  className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200/40 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Drop-off Location</label>
                <input
                  type="text"
                  placeholder="e.g. Hoan Kiem Lake area"
                  value={form.dropoff_location}
                  onChange={e => set('dropoff_location', e.target.value)}
                  className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200/40 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          {error && (
            <p className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">
              <AlertCircle size={16} /> {error}
            </p>
          )}

          <div className="flex gap-4 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white py-3 rounded-lg font-medium transition-colors shadow-sm"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              {loading ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Cancel Modal ─────────────────────────────────────────────────────────────
function CancelModal({
  booking,
  onClose,
  onSuccess,
}: {
  booking: Booking;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCancel = async () => {
    setLoading(true);
    const { error: err } = await supabase
      .from('bookings')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', booking.id);
    setLoading(false);
    if (err) setError(err.message);
    else onSuccess();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white w-full max-w-md rounded-xl shadow-2xl p-6 text-center" onClick={e => e.stopPropagation()}>
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <Ban size={32} className="text-red-500" />
        </div>
        <h3 className="font-bold text-gray-900 text-xl mb-2">Cancel this booking?</h3>
        <p className="text-sm text-gray-600 mb-2">
          {booking.vehicle?.make} {booking.vehicle?.model} · {booking.vehicle?.year}
        </p>
        <p className="text-sm text-gray-600 mb-6">
          {formatDate(booking.pickup_date)} → {formatDate(booking.dropoff_date)}
        </p>

        <div className="bg-red-50 border border-red-100 rounded-lg p-4 mb-6 text-left text-sm">
          <p className="text-red-700 flex items-start gap-2">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
            This action cannot be undone. Cancellation policies may apply.
          </p>
        </div>

        {error && (
          <p className="text-sm text-red-600 mb-4 flex items-center justify-center gap-2">
            <AlertCircle size={16} /> {error}
          </p>
        )}

        <div className="flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            Keep Booking
          </button>
          <button
            onClick={handleCancel}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white py-3 rounded-lg font-medium transition-colors shadow-sm"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
            {loading ? 'Cancelling…' : 'Yes, Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function MyBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<Booking | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);

  useEffect(() => {
    const fetchBookings = async () => {
      const email = localStorage.getItem('user_email');
      if (!email) {
        window.location.href = '/sign-in';
        return;
      }

      const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('email', email.trim().toLowerCase())
        .single();

      if (!user) {
        setError('User not found.');
        setLoading(false);
        return;
      }

      const { data, error: err } = await supabase
        .from('bookings')
        .select(`
          id, pickup_date, dropoff_date, pickup_location, dropoff_location,
          total_price, status, created_at, updated_at,
          vehicle:vehicle_id (
            id, make, model, year, type, color, price_per_day,
            location_city, location_state,
            vehicle_images (url, is_primary)
          )
        `)
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false });

      if (err) setError(err.message);
      else setBookings((data ?? []) as Booking[]);
      setLoading(false);
    };

    fetchBookings();
  }, []);

  const filtered = bookings.filter(b => {
    const s = searchTerm.toLowerCase();
    const matchSearch =
      (b.vehicle?.make?.toLowerCase() ?? '').includes(s) ||
      (b.vehicle?.model?.toLowerCase() ?? '').includes(s) ||
      (b.pickup_location?.toLowerCase() ?? '').includes(s);
    const matchTab = activeTab === 'All' || b.status === activeTab.toLowerCase();
    return matchSearch && matchTab;
  });

  const stats = {
    total:   bookings.length,
    upcoming: bookings.filter(b => b.status === 'upcoming').length,
    ongoing: bookings.filter(b => b.status === 'ongoing').length,
    spent:   bookings.filter(b => b.status === 'completed').reduce((s, b) => s + b.total_price, 0),
  };

  const canReschedule = (status: BookingStatus) => status === 'pending' || status === 'upcoming';
  const canCancel    = (status: BookingStatus) => status === 'pending' || status === 'upcoming';

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-blue-700 font-medium text-lg">Loading your bookings...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl shadow-sm p-8 max-w-md w-full text-center">
          <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Error</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-700 to-blue-900 text-white px-6 py-10 shadow-lg">
        <div className="max-w-5xl mx-auto">
          <p className="text-blue-200 text-sm font-medium uppercase tracking-wide mb-2">My Account</p>
          <h1 className="text-4xl md:text-5xl font-bold mb-8">My Bookings</h1>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total Bookings', value: stats.total },
              { label: 'Upcoming',       value: stats.upcoming },
              { label: 'Active Now',     value: stats.ongoing },
              { label: 'Total Spent',    value: `$${stats.spent.toFixed(0)}` },
            ].map(s => (
              <div
                key={s.label}
                className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 text-center hover:bg-white/15 transition-all"
              >
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-blue-200 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white border-b border-gray-200 shadow-sm px-6 py-4 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search by vehicle or location..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200/40 outline-none transition-all"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {STATUS_TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-shrink-0 px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bookings */}
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-5">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
            <Calendar className="mx-auto text-gray-400 mb-5" size={64} strokeWidth={1.3} />
            <h3 className="text-xl font-semibold text-gray-800 mb-3">No bookings found</h3>
            <p className="text-gray-500 max-w-md mx-auto">
              {activeTab === 'All' ? "You haven't made any bookings yet." : `No ${activeTab.toLowerCase()} bookings.`}
            </p>
            {activeTab === 'All' && (
              <a
                href="/vehicles"
                className="inline-flex items-center gap-2 mt-6 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors shadow-sm"
              >
                Browse Vehicles <ArrowRight size={16} />
              </a>
            )}
          </div>
        ) : (
          filtered.map(booking => {
            const cfg = STATUS_CONFIG[booking.status];
            const imgUrl = getVehicleImg(booking.vehicle);
            const isExpanded = expanded === booking.id;
            const days = daysBetween(booking.pickup_date, booking.dropoff_date);

            return (
              <div
                key={booking.id}
                className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
              >
                <div
                  className="flex items-center gap-5 p-5 cursor-pointer hover:bg-blue-50/30 transition-colors"
                  onClick={() => setExpanded(isExpanded ? null : booking.id)}
                >
                  <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200">
                    {imgUrl ? (
                      <img src={imgUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-blue-50">
                        <Car size={28} className="text-blue-400" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-gray-900 text-lg truncate">
                          {booking.vehicle ? `${booking.vehicle.make} ${booking.vehicle.model} · ${booking.vehicle.year}` : 'Vehicle unavailable'}
                        </p>
                        <p className="text-sm text-gray-600 mt-0.5">
                          {booking.pickup_location} → {booking.dropoff_location}
                        </p>
                      </div>

                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${cfg.bgColor} ${cfg.textColor} ${cfg.borderColor}`}>
                        {cfg.icon} {cfg.label}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-6 gap-y-1 mt-2 text-sm text-gray-600">
                      <span className="flex items-center gap-1.5">
                        <Calendar size={14} className="text-gray-400" />
                        {formatDate(booking.pickup_date)} → {formatDate(booking.dropoff_date)}
                      </span>
                      <span className="font-medium text-blue-700">
                        ${booking.total_price.toFixed(2)}
                      </span>
                      <span className="text-gray-500">· {days} day{days !== 1 ? 's' : ''}</span>
                    </div>
                  </div>

                  <ChevronDown
                    size={20}
                    className={`text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  />
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-100 px-5 pb-6 pt-5 bg-gray-50/40">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                      <div className="bg-white rounded-lg border border-gray-200 p-4">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                          <MapPin size={14} /> Trip Details
                        </p>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Pick-up</span>
                            <span className="font-medium text-gray-900">{booking.pickup_location}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Drop-off</span>
                            <span className="font-medium text-gray-900">{booking.dropoff_location}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Pick-up date</span>
                            <span className="font-medium text-gray-900">{formatDate(booking.pickup_date)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Drop-off date</span>
                            <span className="font-medium text-gray-900">{formatDate(booking.dropoff_date)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white rounded-lg border border-gray-200 p-4">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                          <CreditCard size={14} /> Payment Breakdown
                        </p>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-500">{days} days × ${booking.vehicle?.price_per_day ?? '—'}</span>
                            <span className="font-medium text-gray-900">
                              ${((booking.vehicle?.price_per_day ?? 0) * days).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Service fee</span>
                            <span className="font-medium text-gray-900">
                              ${(booking.total_price - (booking.vehicle?.price_per_day ?? 0) * days).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between pt-2 border-t border-gray-200 mt-1">
                            <span className="font-bold text-gray-900">Total</span>
                            <span className="font-bold text-blue-800 text-lg">
                              ${booking.total_price.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-gray-500 mb-5">
                      Booked on {new Date(booking.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                      {booking.updated_at !== booking.created_at && ` · Updated ${new Date(booking.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                    </p>

                    <div className="flex flex-wrap gap-3">
                      {canReschedule(booking.status) && (
                        <button
                          onClick={() => setRescheduleTarget(booking)}
                          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
                        >
                          <Pencil size={14} /> Reschedule
                        </button>
                      )}

                      {canCancel(booking.status) && (
                        <button
                          onClick={() => setCancelTarget(booking)}
                          className="flex items-center gap-2 px-5 py-2.5 bg-white text-red-600 border border-red-300 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors"
                        >
                          <XCircle size={14} /> Cancel Booking
                        </button>
                      )}

                      {booking.status === 'completed' && (
                        <a
                          href="/vehicles"
                          className="flex items-center gap-2 px-5 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-sm font-medium transition-colors"
                        >
                          <Star size={14} /> Book Again
                        </a>
                      )}

                      {(booking.status === 'cancelled' || booking.status === 'completed') && (
                        <p className="text-sm text-gray-500 italic self-center">
                          {booking.status === 'cancelled' ? 'This booking was cancelled.' : 'This rental has been completed.'}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {rescheduleTarget && (
        <RescheduleModal
          booking={rescheduleTarget}
          onClose={() => setRescheduleTarget(null)}
          onSuccess={updated => {
            setBookings(prev =>
              prev.map(b => (b.id === rescheduleTarget.id ? { ...b, ...updated } : b))
            );
            setRescheduleTarget(null);
          }}
        />
      )}

      {cancelTarget && (
        <CancelModal
          booking={cancelTarget}
          onClose={() => setCancelTarget(null)}
          onSuccess={() => {
            setBookings(prev =>
              prev.map(b => (b.id === cancelTarget.id ? { ...b, status: 'cancelled' } : b))
            );
            setCancelTarget(null);
          }}
        />
      )}
    </div>
  );
}