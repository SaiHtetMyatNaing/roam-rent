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
  Shield,
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
  status: string;
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
  const s = (status || '').trim().toLowerCase() as BookingStatus;

  if (s in STATUS_CONFIG) {
    return STATUS_CONFIG[s];
  }

  // Safe fallback when status is invalid / missing / unexpected
  return {
    label: status ? status.charAt(0).toUpperCase() + status.slice(1).toLowerCase() : 'Unknown',
    color: 'text-gray-700',
    bg: 'bg-gray-100 border-gray-300',
    icon: <AlertCircle size={16} />,
  };
}

// ─── Dispute Modal ───────────────────────────────────────────────────────────

function DisputeModal({
  booking,
  onClose,
  onSuccess,
}: {
  booking: Booking;
  onClose: () => void;
  onSuccess: () => void;
}) {
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

  const vehicle = booking.vehicle;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <Flag size={20} />
              </div>
              <div>
                <h2 className="font-bold text-base">File a Dispute</h2>
                <p className="text-xs text-red-100">
                  {vehicle ? `${vehicle.make} ${vehicle.model} · ${vehicle.year}` : 'Unknown vehicle'}
                </p>
              </div>
            </div>
            <button onClick={onClose}>
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="px-6 py-6 space-y-5">
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">
              Booking Info
            </p>
            <p className="text-sm">
              <span className="text-gray-500">Customer:</span>{' '}
              {booking.customer ? `${booking.customer.first_name} ${booking.customer.last_name}` : '—'}
            </p>
            <p className="text-sm mt-1 font-mono text-xs text-gray-600">
              ID: {booking.id.slice(0, 8)}…
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
                  onClick={() => setCategory(cat)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                    category === cat
                      ? 'bg-red-600 text-white border-red-600 shadow-sm'
                      : 'bg-white border-gray-200 hover:border-red-300 hover:bg-red-50'
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
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief issue summary…"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none"
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
              placeholder="Explain the issue in detail…"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Priority</label>
            <div className="flex gap-2">
              {(['low', 'medium', 'high', 'critical'] as DisputePriority[]).map((p) => {
                const cfg = PRIORITY_CONFIG[p];
                return (
                  <button
                    key={p}
                    onClick={() => setPriority(p)}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all ${
                      priority === p
                        ? `${cfg.bg} ${cfg.color} ${cfg.border} shadow-sm ring-2 ring-red-300`
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700 flex items-center gap-2">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 shadow-sm"
            >
              {submitting ? <RefreshCw size={16} className="animate-spin" /> : <Flag size={16} />}
              {submitting ? 'Submitting…' : 'Submit Dispute'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Admin Bookings Page ─────────────────────────────────────────────────────

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | BookingStatus>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [disputeBooking, setDisputeBooking] = useState<Booking | null>(null);
  const [updatingBookingId, setUpdatingBookingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchBookings = async () => {
      setLoading(true);
      setError(null);

      const { data, error: err } = await supabase
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
        .order('created_at', { ascending: false });

      if (err) {
        setError(err.message);
      } else {
        const normalized = (data ?? []).map((row: any) => ({
          ...row,
          status: row.status || '',
          customer: Array.isArray(row.customer) ? row.customer[0] ?? null : row.customer ?? null,
          vehicle: Array.isArray(row.vehicle) ? row.vehicle[0] ?? null : row.vehicle ?? null,
        }));
        setBookings(normalized);
      }

      setLoading(false);
    };

    fetchBookings();
  }, []);

  const updateBookingStatus = async (bookingId: string, newStatus: BookingStatus) => {
    setUpdatingBookingId(bookingId);

    // Optimistic update
    setBookings((prev) =>
      prev.map((b) =>
        b.id === bookingId ? { ...b, status: newStatus } : b
      )
    );

    const { error } = await supabase
      .from('bookings')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId);

    if (error) {
      console.error('Failed to update status:', error);
      setError('Failed to update booking status. Please try again.');
      // Revert optimistic update on error
      setBookings((prev) =>
        prev.map((b) =>
          b.id === bookingId ? { ...b, status: bookings.find((bb) => bb.id === bookingId)?.status || '' } : b
        )
      );
    } else {
      // Success → keep the optimistic change
      // Optional: show success message / toast
    }

    setUpdatingBookingId(null);
  };

  const filtered = bookings.filter((b) => {
    const s = searchTerm.toLowerCase();
    const match =
      (b.customer?.first_name?.toLowerCase() ?? '').includes(s) ||
      (b.customer?.last_name?.toLowerCase() ?? '').includes(s) ||
      (b.customer?.email?.toLowerCase() ?? '').includes(s) ||
      (b.vehicle?.make?.toLowerCase() ?? '').includes(s) ||
      (b.vehicle?.model?.toLowerCase() ?? '').includes(s) ||
      (b.vehicle?.license_plate?.toLowerCase() ?? '').includes(s);
    return match && (activeTab === 'all' || b.status === activeTab);
  });

  const stats = {
    total: bookings.length,
    pending: bookings.filter((b) => b.status === 'pending').length,
    confirmed: bookings.filter((b) => b.status === 'confirmed').length,
    completed: bookings.filter((b) => b.status === 'completed').length,
    cancelled: bookings.filter((b) => b.status === 'cancelled').length,
    revenue: bookings
      .filter((b) => b.status === 'completed')
      .reduce((sum, b) => sum + b.total_price, 0),
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const getVehicleImg = (v: Booking['vehicle']) => {
    if (!v?.vehicle_images?.length) return null;
    const primary = v.vehicle_images.find((i) => i.is_primary);
    return primary?.url ?? v.vehicle_images[0]?.url ?? null;
  };

  const daysBetween = (start: string, end: string) =>
    Math.max(0, Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / 86400000));

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-blue-700 font-semibold text-lg">Loading all bookings...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <AlertCircle className="text-red-600 mx-auto mb-4" size={48} />
          <h3 className="text-xl font-semibold mb-2">Error Loading Bookings</h3>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {disputeBooking && (
        <DisputeModal
          booking={disputeBooking}
          onClose={() => setDisputeBooking(null)}
          onSuccess={() => {
            setDisputeBooking(null);
            // Optional: refresh after dispute
            // fetchBookings();
          }}
        />
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white px-6 py-10 shadow-lg">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="text-blue-200 text-sm font-semibold tracking-wide uppercase mb-2 flex items-center gap-2">
                <Shield size={16} />
                Admin Portal
              </p>
              <h1 className="text-4xl md:text-5xl font-bold">All Bookings</h1>
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
              { label: 'Platform Revenue', value: `$${stats.revenue.toFixed(0)}`, icon: <DollarSign size={16} />, bg: 'bg-green-500/20' },
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

      {/* Controls */}
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search customer, vehicle, plate…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200/50 outline-none transition-all"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 w-full sm:w-auto">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  activeTab === 'all' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                All {stats.total > 0 && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-400">{stats.total}</span>}
              </button>
              {STATUS_TABS.map((tab) => {
                const count = stats[tab as keyof typeof stats] ?? 0;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 capitalize ${
                      activeTab === tab ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)} {count > 0 && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-400">{count}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Bookings List */}
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-5">
        {filtered.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-xl border border-gray-200 shadow-sm">
            <Car size={48} className="text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-800 mb-2">No bookings found</h3>
            <p className="text-gray-500 max-w-md mx-auto">
              {activeTab === 'all' ? 'No bookings exist in the system yet.' : `No ${activeTab} bookings at the moment.`}
            </p>
          </div>
        ) : (
          filtered.map((booking) => {
            const cfg = getStatusConfig(booking.status);
            const imgUrl = getVehicleImg(booking.vehicle);
            const isExpanded = expanded === booking.id;
            const days = daysBetween(booking.pickup_date, booking.dropoff_date);
            const isUpdating = updatingBookingId === booking.id;

            return (
              <div
                key={booking.id}
                className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-lg transition-all"
              >
                <div
                  className="flex items-center gap-5 p-5 cursor-pointer hover:bg-blue-50/50 transition-colors group"
                  onClick={() => setExpanded(isExpanded ? null : booking.id)}
                >
                  <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200 group-hover:border-blue-300 transition-colors">
                    {imgUrl ? (
                      <img src={imgUrl} alt="vehicle" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
                        <Car size={28} className="text-blue-400" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div>
                        <p className="font-semibold text-gray-900 text-lg truncate">
                          {booking.vehicle ? `${booking.vehicle.make} ${booking.vehicle.model}` : 'Vehicle not found'}
                        </p>
                        <p className="text-sm text-gray-600">
                          {booking.customer ? `${booking.customer.first_name} ${booking.customer.last_name}` : 'Unknown customer'}
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border whitespace-nowrap ${cfg.bg} ${cfg.color}`}
                      >
                        {cfg.icon}
                        {cfg.label}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-gray-600">
                      <span className="flex items-center gap-1.5">
                        <MapPin size={13} className="text-gray-400" />
                        {booking.pickup_location}
                      </span>
                      <span className="text-gray-400">→</span>
                      <span className="flex items-center gap-1.5">
                        <MapPin size={13} className="text-gray-400" />
                        {booking.dropoff_location}
                      </span>
                      <span className="font-semibold text-blue-700 ml-auto">
                        ${booking.total_price.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <ChevronDown
                    size={20}
                    className={`text-gray-500 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
                  />
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-100 px-6 py-6 bg-gray-50/50 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-4 flex items-center gap-2">
                          <User size={14} /> Customer
                        </p>
                        {booking.customer ? (
                          <div className="space-y-3 text-sm">
                            <p className="font-medium">
                              {booking.customer.first_name} {booking.customer.last_name}
                            </p>
                            <div className="flex items-center gap-2">
                              <Mail size={14} className="text-gray-400" />
                              {booking.customer.email}
                            </div>
                            {booking.customer.phone && (
                              <div className="flex items-center gap-2">
                                <Phone size={14} className="text-gray-400" />
                                {booking.customer.phone}
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-gray-500">No customer details available</p>
                        )}
                      </div>

                      <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-4 flex items-center gap-2">
                          <Calendar size={14} /> Trip Details
                        </p>
                        <div className="space-y-3 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Duration</span>
                            <span className="font-medium">{days} day{days !== 1 ? 's' : ''}</span>
                          </div>
                          <div className="flex justify-between pt-2 border-t border-gray-200">
                            <span className="font-bold">Total</span>
                            <span className="font-bold text-blue-800 text-lg">
                              ${booking.total_price.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {booking.vehicle && (
                      <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-4 flex items-center gap-2">
                          <Car size={14} /> Vehicle
                        </p>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500">Make & Model</p>
                            <p className="font-medium">{booking.vehicle.make} {booking.vehicle.model}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Year</p>
                            <p className="font-medium">{booking.vehicle.year}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">License Plate</p>
                            <p className="font-mono font-semibold">{booking.vehicle.license_plate}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    <p className="text-xs text-gray-500">
                      Created on {formatDate(booking.created_at)}
                      {booking.updated_at !== booking.created_at &&
                        ` · Updated ${formatDate(booking.updated_at)}`}
                    </p>

                    <div className="space-y-4">
                      {/* Status Update Buttons - Admin can change any status */}
                      <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3 flex items-center gap-2">
                          <RefreshCw size={14} /> Update Booking Status
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {STATUS_TABS.map((status) => {
                            const isCurrent = booking.status === status;
                            const cfg = STATUS_CONFIG[status];
                            return (
                              <button
                                key={status}
                                disabled={isCurrent || isUpdating}
                                onClick={() => updateBookingStatus(booking.id, status)}
                                className={`py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 capitalize transition-all ${
                                  isCurrent
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    : isUpdating
                                    ? 'bg-gray-300 text-gray-600 cursor-wait'
                                    : status === 'confirmed'
                                    ? 'bg-green-600 hover:bg-green-700 text-white'
                                    : status === 'completed'
                                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                    : status === 'cancelled'
                                    ? 'bg-red-600 hover:bg-red-700 text-white'
                                    : 'bg-amber-600 hover:bg-amber-700 text-white'
                                }`}
                              >
                                {isUpdating && updatingBookingId === booking.id ? (
                                  <RefreshCw size={14} className="animate-spin" />
                                ) : (
                                  cfg.icon
                                )}
                                {status.charAt(0).toUpperCase() + status.slice(1)}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <button
                          onClick={() => setDisputeBooking(booking)}
                          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-white text-red-600 border border-red-300 hover:bg-red-50 transition-all"
                        >
                          <Flag size={14} />
                          File Dispute
                        </button>

                        <a
                          href="/support"
                          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 transition-all ml-auto"
                        >
                          <Mail size={14} />
                          Contact Support
                        </a>
                      </div>
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