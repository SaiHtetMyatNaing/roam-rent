'use client';

import React, { useState, useEffect } from 'react';
import {
  Car,
  Calendar,
  User,
  MapPin,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  ChevronDown,
  DollarSign,
  Search,
  RefreshCw,
  Flag,
  X,
  Phone,
  Mail,
  AlertTriangle,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

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
  customer: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string | null;
    avatar_url: string | null;
  } | null;
  vehicle: {
    id: string;
    make: string;
    model: string;
    year: number;
    license_plate: string;
    vehicle_images: { url: string; is_primary: boolean }[];
  } | null;
};

type DisputePriority = 'low' | 'medium' | 'high' | 'critical';

const STATUS_TABS: BookingStatus[] = ['pending', 'confirmed', 'completed', 'cancelled'];

const STATUS_CONFIG: Record<
  BookingStatus,
  {
    label: string;
    color: string;
    bg: string;
    icon: React.ReactNode;
  }
> = {
  pending: {
    label: 'Pending',
    color: 'text-amber-700',
    bg: 'bg-amber-50 border-amber-200',
    icon: <Clock size={16} />,
  },
  confirmed: {
    label: 'Confirmed',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50 border-emerald-200',
    icon: <CheckCircle2 size={16} />,
  },
  completed: {
    label: 'Completed',
    color: 'text-slate-700',
    bg: 'bg-slate-100 border-slate-200',
    icon: <CheckCircle2 size={16} />,
  },
  cancelled: {
    label: 'Cancelled',
    color: 'text-red-700',
    bg: 'bg-red-50 border-red-200',
    icon: <XCircle size={16} />,
  },
};

function getStatusConfig(status: string | null | undefined) {
  if (!status || status.trim() === '') {
    console.warn('Booking has missing or empty status', { status });
    return {
      label: 'Unknown',
      color: 'text-gray-600',
      bg: 'bg-gray-100 border-gray-300',
      icon: <AlertCircle size={16} className="text-gray-500" />,
    };
  }

  const normalized = status.toLowerCase() as BookingStatus;
  const cfg = STATUS_CONFIG[normalized];

  if (!cfg) {
    console.warn(`Unknown booking status: "${status}"`);
    return {
      label: status.charAt(0).toUpperCase() + status.slice(1).toLowerCase(),
      color: 'text-purple-700',
      bg: 'bg-purple-50 border-purple-200',
      icon: <AlertCircle size={16} className="text-purple-600" />,
    };
  }

  return cfg;
}

const PRIORITY_CONFIG: Record<
  DisputePriority,
  { label: string; color: string; bg: string; border: string }
> = {
  low: { label: 'Low', color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200' },
  medium: {
    label: 'Medium',
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
  },
  high: { label: 'High', color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200' },
  critical: {
    label: 'Critical',
    color: 'text-red-700',
    bg: 'bg-red-50',
    border: 'border-red-200',
  },
};

const DISPUTE_CATEGORIES = [
  'Vehicle Damage',
  'Late Return',
  'Unauthorized Use',
  'Missing Items',
  'Fuel Issue',
  'Payment Dispute',
  'No-Show',
  'Other',
];

// ─── Dispute Modal ───────────────────────────────────────────────────────────

type DisputeModalProps = {
  booking: Booking;
  submitterId: string;
  onClose: () => void;
  onSuccess: () => void;
};

function DisputeModal({ booking, submitterId, onClose, onSuccess }: DisputeModalProps) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<DisputePriority>('medium');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!title.trim() || !category || !description.trim()) {
      setError('Please fill in all required fields.');
      return;
    }
    setSubmitting(true);
    setError(null);

    const fullTitle = `[${category}] ${title.trim()}`;

    const { error: dbError } = await supabase.from('disputes').insert({
      booking_id: booking.id,
      submitted_by: submitterId,
      title: fullTitle,
      description: description.trim(),
      priority,
      status: 'open',
    });

    setSubmitting(false);

    if (dbError) {
      setError(dbError.message);
    } else {
      onSuccess();
      onClose();
    }
  };

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const vehicle = booking.vehicle;
  const customer = booking.customer;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-red-100 rounded-lg flex items-center justify-center">
              <Flag size={17} className="text-red-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-base">File a Dispute</h2>
              <p className="text-xs text-gray-500">
                {vehicle
                  ? `${vehicle.make} ${vehicle.model} · ${vehicle.year}`
                  : 'Unknown vehicle'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
          >
            <X size={15} className="text-gray-600" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 text-sm space-y-1">
            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-2">
              Booking Reference
            </p>
            <p>
              <span className="text-gray-500">Customer: </span>
              <span className="font-medium text-gray-800">
                {customer ? `${customer.first_name} ${customer.last_name}` : '—'}
              </span>
            </p>
            <p>
              <span className="text-gray-500">Booking ID: </span>
              <span className="font-mono text-xs text-gray-700">{booking.id.slice(0, 8)}…</span>
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Category <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {DISPUTE_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border text-left transition-all ${
                    category === cat
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief description of the issue…"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Provide as much detail as possible…"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Priority</label>
            <div className="flex gap-2">
              {(Object.keys(PRIORITY_CONFIG) as DisputePriority[]).map((p) => {
                const cfg = PRIORITY_CONFIG[p];
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${
                      priority === p
                        ? `${cfg.bg} ${cfg.color} ${cfg.border} shadow-sm ring-2 ring-offset-1 ring-blue-400`
                        : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              <AlertCircle size={15} className="flex-shrink-0" />
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm"
          >
            {submitting ? (
              <RefreshCw size={16} className="animate-spin" />
            ) : (
              <Flag size={16} />
            )}
            {submitting ? 'Submitting…' : 'Submit Dispute'}
          </button>

          <p className="text-center text-xs text-gray-400">
            Disputes are reviewed by our admin team within 24–48 hours.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Success Toast ────────────────────────────────────────────────────────────

function SuccessToast({ message, isError, onClose }: { message: string; isError?: boolean; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className={`fixed bottom-6 right-6 z-50 bg-white rounded-xl shadow-xl px-5 py-4 flex items-center gap-3 animate-slide-up ${
      isError ? 'border border-red-200' : 'border border-green-200'
    }`}>
      <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
        isError ? 'bg-red-100' : 'bg-green-100'
      }`}>
        {isError ? (
          <AlertCircle size={18} className="text-red-600" />
        ) : (
          <CheckCircle2 size={18} className="text-green-600" />
        )}
      </div>
      <div className="flex-1">
        <p className={`font-semibold text-sm ${isError ? 'text-red-900' : 'text-gray-900'}`}>
          {message}
        </p>
      </div>
      <button onClick={onClose} className="ml-2 text-gray-400 hover:text-gray-600">
        <X size={15} />
      </button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function OwnerBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | BookingStatus>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; isError?: boolean } | null>(null);
  const [disputeBooking, setDisputeBooking] = useState<Booking | null>(null);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const email = localStorage.getItem('user_email');
      if (!email) {
        window.location.href = '/sign-in';
        return;
      }

      const { data: owner, error: ownerError } = await supabase
        .from('users')
        .select('id')
        .eq('email', email.trim().toLowerCase())
        .single();

      if (ownerError || !owner) {
        setError('Owner not found');
        setLoading(false);
        return;
      }

      setOwnerId(owner.id);

      const { data: ownerVehicles, error: vehicleError } = await supabase
        .from('vehicles')
        .select('id')
        .eq('owner_id', owner.id);

      if (vehicleError) {
        setError(vehicleError.message);
        setLoading(false);
        return;
      }

      const vehicleIds = (ownerVehicles ?? []).map((v: any) => v.id);

      if (vehicleIds.length === 0) {
        setBookings([]);
        setLoading(false);
        return;
      }

      const { data, error: bookingError } = await supabase
        .from('bookings')
        .select(
          `
          id, pickup_date, dropoff_date, pickup_location, dropoff_location,
          total_price, status, created_at, updated_at,
          customer:customer_id (first_name, last_name, email, phone, avatar_url),
          vehicle:vehicle_id (id, make, model, year, license_plate,
            vehicle_images (url, is_primary))
        `
        )
        .in('vehicle_id', vehicleIds)
        .order('created_at', { ascending: false });

      if (bookingError) {
        setError(bookingError.message);
      } else {
        const transformedData = (data ?? []).map((item: any) => ({
          ...item,
          customer: Array.isArray(item.customer) ? item.customer[0] ?? null : item.customer ?? null,
          vehicle: Array.isArray(item.vehicle) ? item.vehicle[0] ?? null : item.vehicle ?? null,
        }));
        setBookings(transformedData as Booking[]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  useEffect(() => {
    if (bookings.length > 0) {
      const unknown = bookings.filter((b) => !(b.status in STATUS_CONFIG));
      if (unknown.length > 0) {
        console.warn('Bookings with unrecognized status:', unknown.map((b) => ({
          id: b.id.slice(0, 8),
          status: b.status,
        })));
      }
    }
  }, [bookings]);

  const updateStatus = async (bookingId: string, newStatus: BookingStatus) => {
    setUpdatingId(bookingId);
    try {
      const { data, error } = await supabase
        .from('bookings')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', bookingId)
        .select('id, status, updated_at')
        .single();

      console.log('[updateStatus] Supabase response:', { data, error });

      if (error) {
        console.error('[updateStatus] Error details:', error);
        setToast({
          message: `Failed to update: ${error.message || 'Unknown error'}`,
          isError: true,
        });
        return;
      }

      if (!data) {
        setToast({ message: 'No booking found with this ID', isError: true });
        return;
      }

      console.log('[updateStatus] Updated booking status to:', data.status);

      // Optimistic UI update
      setBookings((prev) =>
        prev.map((b) =>
          b.id === bookingId ? { ...b, status: newStatus as BookingStatus } : b
        )
      );

      const statusLabel = STATUS_CONFIG[newStatus]?.label || newStatus;
      setToast({
        message: `✓ Booking updated to ${statusLabel}`,
        isError: false,
      });
    } catch (err: any) {
      console.error('[updateStatus] Unexpected error:', err);
      setToast({
        message: `Unexpected error: ${err.message || 'Failed to update booking'}`,
        isError: true,
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = bookings.filter((b) => {
    const s = searchTerm.toLowerCase().trim();
    const matchSearch =
      (b.customer?.first_name?.toLowerCase() ?? '').includes(s) ||
      (b.customer?.last_name?.toLowerCase() ?? '').includes(s) ||
      (b.customer?.email?.toLowerCase() ?? '').includes(s) ||
      (b.vehicle?.make?.toLowerCase() ?? '').includes(s) ||
      (b.vehicle?.model?.toLowerCase() ?? '').includes(s) ||
      (b.vehicle?.license_plate?.toLowerCase() ?? '').includes(s);
    const matchTab = activeTab === 'all' || b.status === activeTab;
    return matchSearch && matchTab;
  });

  const stats = {
    total: bookings.length,
    pending: bookings.filter((b) => b.status === 'pending').length,
    confirmed: bookings.filter((b) => b.status === 'confirmed').length,
    completed: bookings.filter((b) => b.status === 'completed').length,
    cancelled: bookings.filter((b) => b.status === 'cancelled').length,
    revenue: bookings
      .filter((b) => b.status === 'completed')
      .reduce((s, b) => s + b.total_price, 0),
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const formatTime = (d: string) =>
    new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  const getVehicleImg = (v: Booking['vehicle']) => {
    if (!v?.vehicle_images?.length) return null;
    const primary = v.vehicle_images.find((i) => i.is_primary);
    return primary?.url ?? v.vehicle_images[0]?.url ?? null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <div className="text-center">
            <p className="text-blue-700 font-semibold text-lg">Loading bookings...</p>
            <p className="text-gray-500 text-sm mt-1">Fetching your rental data</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="text-red-600" size={24} />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Bookings</h3>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => fetchBookings()}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {disputeBooking && ownerId && (
        <DisputeModal
          booking={disputeBooking}
          submitterId={ownerId}
          onClose={() => setDisputeBooking(null)}
          onSuccess={() => {
            setToast({ message: 'Dispute submitted successfully' });
            fetchBookings();
          }}
        />
      )}

      {toast && <SuccessToast message={toast.message} isError={toast.isError} onClose={() => setToast(null)} />}

      {/* rest of your UI remains unchanged */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white px-6 py-10 shadow-lg">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="text-blue-200 text-sm font-semibold tracking-wide uppercase mb-2">Owner Dashboard</p>
              <h1 className="text-4xl md:text-5xl font-bold">Manage Your Bookings</h1>
            </div>
            <div className="w-16 h-16 bg-white/10 rounded-xl backdrop-blur-sm flex items-center justify-center">
              <Car size={32} className="text-blue-200" />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'Total', value: stats.total, icon: <Calendar size={16} />, bg: 'bg-white/10' },
              { label: 'Pending', value: stats.pending, icon: <Clock size={16} />, bg: 'bg-amber-500/20', alert: stats.pending > 0 },
              { label: 'Confirmed', value: stats.confirmed, icon: <CheckCircle2 size={16} />, bg: 'bg-emerald-500/20' },
              { label: 'Completed', value: stats.completed, icon: <CheckCircle2 size={16} />, bg: 'bg-slate-500/20' },
              { label: 'Cancelled', value: stats.cancelled, icon: <XCircle size={16} />, bg: 'bg-red-500/20' },
              { label: 'Revenue', value: `$${stats.revenue.toFixed(0)}`, icon: <DollarSign size={16} />, bg: 'bg-green-500/20' },
            ].map((s) => (
              <div
                key={s.label}
                className={`${s.bg} backdrop-blur-sm border border-white/20 rounded-lg p-3 text-center transition-all hover:bg-white/20 ${
                  s.alert ? 'ring-2 ring-amber-300 ring-offset-2 ring-offset-blue-700' : ''
                }`}
              >
                <div className="text-blue-100 mb-1.5">{s.icon}</div>
                <p className="text-xl font-bold text-white">{s.value}</p>
                <p className="text-xs text-blue-100 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search customer, email, vehicle…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200/50 outline-none transition-all"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 w-full sm:w-auto">
              <button
                onClick={() => setActiveTab('all')}
                className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  activeTab === 'all'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                All {stats.total > 0 && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-400">{stats.total}</span>}
              </button>

              {STATUS_TABS.map((tab) => {
                const count = stats[tab];
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 capitalize ${
                      activeTab === tab ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {tab} {count > 0 && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-400">{count}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-5">
        {filtered.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-xl border border-gray-200 shadow-sm">
            <Car size={32} className="text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-800 mb-2">No bookings found</h3>
            <p className="text-gray-500">
              {activeTab === 'all'
                ? "You haven't received any bookings yet."
                : `No ${activeTab} bookings at the moment.`}
            </p>
          </div>
        ) : (
          filtered.map((booking) => {
            const cfg = getStatusConfig(booking.status);
            const imgUrl = getVehicleImg(booking.vehicle);
            const isExpanded = expanded === booking.id;

            return (
              <div key={booking.id} className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-lg transition-all">
                <div
                  className="flex items-center gap-5 p-5 cursor-pointer hover:bg-blue-50/50 transition-colors group"
                  onClick={() => setExpanded(isExpanded ? null : booking.id)}
                >
                  <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200 group-hover:border-blue-300">
                    {imgUrl ? (
                      <img src={imgUrl} alt="vehicle" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
                        <Car size={28} className="text-blue-400" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div>
                        <p className="font-semibold text-gray-900 text-lg">
                          {booking.vehicle ? `${booking.vehicle.make} ${booking.vehicle.model}` : 'Vehicle not found'}
                        </p>
                        <p className="text-sm text-gray-600">
                          {booking.customer ? `${booking.customer.first_name} ${booking.customer.last_name}` : '—'}
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border whitespace-nowrap ${cfg.bg} ${cfg.color}`}
                      >
                        {cfg.icon} {cfg.label}
                      </span>
                    </div>
                    <div className="flex gap-4 text-xs text-gray-600">
                      <span>{formatDate(booking.pickup_date)}</span>
                      <span className="font-semibold text-blue-700">${booking.total_price.toFixed(2)}</span>
                    </div>
                  </div>

                  <ChevronDown
                    size={20}
                    className={`text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  />
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-100 px-6 py-6 bg-gray-50/50 space-y-6">
                    {/* Customer section */}
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                      <p className="text-xs font-semibold text-gray-600 uppercase mb-3 flex items-center gap-2">
                        <User size={14} /> Customer
                      </p>
                      {booking.customer ? (
                        <div className="space-y-2 text-sm">
                          <p className="font-medium">{booking.customer.first_name} {booking.customer.last_name}</p>
                          <div className="flex items-center gap-2">
                            <Mail size={14} className="text-gray-400" /> {booking.customer.email}
                          </div>
                          {booking.customer.phone && (
                            <div className="flex items-center gap-2">
                              <Phone size={14} className="text-gray-400" /> {booking.customer.phone}
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">No details available</p>
                      )}
                    </div>

                    {/* Trip section */}
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                      <p className="text-xs font-semibold text-gray-600 uppercase mb-3 flex items-center gap-2">
                        <MapPin size={14} /> Trip
                      </p>
                      <div className="space-y-2 text-sm">
                        <p>
                          <span className="text-gray-500">Pick-up:</span>{' '}
                          <span className="font-medium">{booking.pickup_location}</span>{' '}
                          <span className="text-xs text-gray-500">{formatTime(booking.pickup_date)}</span>
                        </p>
                        <p>
                          <span className="text-gray-500">Drop-off:</span>{' '}
                          <span className="font-medium">{booking.dropoff_location}</span>{' '}
                          <span className="text-xs text-gray-500">{formatTime(booking.dropoff_date)}</span>
                        </p>
                      </div>
                    </div>

                    {/* Vehicle section */}
                    {booking.vehicle && (
                      <div className="bg-white rounded-lg border border-gray-200 p-4">
                        <p className="text-xs font-semibold text-gray-600 uppercase mb-3 flex items-center gap-2">
                          <Car size={14} /> Vehicle
                        </p>
                        <div className="space-y-1 text-sm">
                          <p>
                            <span className="text-gray-500">Make/Model:</span>{' '}
                            <span className="font-medium">{booking.vehicle.make} {booking.vehicle.model}</span>
                          </p>
                          <p>
                            <span className="text-gray-500">Year:</span>{' '}
                            <span className="font-medium">{booking.vehicle.year}</span>
                          </p>
                          <p>
                            <span className="text-gray-500">Plate:</span>{' '}
                            <span className="font-mono font-semibold">{booking.vehicle.license_plate}</span>
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Total Value */}
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-gray-700">Total Value</span>
                        <span className="text-2xl font-bold text-blue-900">
                          ${booking.total_price.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Action buttons - ALL STATUS BUTTONS */}
                    <div className="space-y-3">
                      <p className="text-xs font-semibold text-gray-600 uppercase mb-2 flex items-center gap-2">
                        <AlertTriangle size={14} /> Change Status
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {STATUS_TABS.map((status) => {
                          const isCurrentStatus = booking.status === status;
                          const statusCfg = STATUS_CONFIG[status];
                          const isUpdating = updatingId === booking.id;
                          
                          let buttonColor = 'bg-gray-200 text-gray-700 hover:bg-gray-300';
                          
                          if (!isCurrentStatus) {
                            if (status === 'confirmed') {
                              buttonColor = 'bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white';
                            } else if (status === 'completed') {
                              buttonColor = 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white';
                            } else if (status === 'cancelled') {
                              buttonColor = 'bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white';
                            } else if (status === 'pending') {
                              buttonColor = 'bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300 text-white';
                            }
                          }
                          
                          return (
                            <button
                              key={status}
                              onClick={() => updateStatus(booking.id, status)}
                              disabled={isCurrentStatus || isUpdating}
                              className={`py-2 px-3 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 capitalize ${
                                isCurrentStatus
                                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                  : buttonColor
                              }`}
                            >
                              {isUpdating ? (
                                <RefreshCw size={14} className="animate-spin" />
                              ) : (
                                statusCfg.icon
                              )}
                              {isCurrentStatus ? (
                                <span>{status} ✓</span>
                              ) : (
                                status
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* File Dispute Button */}
                      <button
                        onClick={() => setDisputeBooking(booking)}
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-lg transition-all flex items-center justify-center gap-2 mt-4"
                      >
                        <AlertTriangle size={16} />
                        File a Dispute
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <style jsx global>{`
        @keyframes slide-up {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-up { animation: slide-up 0.3s ease both; }
      `}</style>
    </div>
  );
}