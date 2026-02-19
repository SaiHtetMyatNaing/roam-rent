'use client';

import React, { useState, useEffect } from 'react';
import {
  Car,
  Calendar,
  MapPin,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  ChevronDown,
  DollarSign,
  Search,
  RefreshCw,
  X,
  Loader2,
  CreditCard,
  Ban,
  MessageCircle,
  ArrowRight,
  Star,
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
  vehicle: {
    id: string;
    make: string;
    model: string;
    year: number;
    type: string;
    color: string | null;
    price_per_day: number;
    owner_id: string;
    location_city: string | null;
    location_state: string | null;
    license_plate: string;
    vehicle_images: { url: string; is_primary: boolean }[];
  } | null;
};

const STATUS_TABS: BookingStatus[] = ['pending', 'confirmed', 'completed', 'cancelled'];

const STATUS_CONFIG: Record<
  BookingStatus,
  {
    label: string;
    color: string;
    bg: string;
    icon: React.ReactNode;
    description: string;
  }
> = {
  pending: {
    label: 'Pending',
    color: 'text-amber-700',
    bg: 'bg-amber-50 border-amber-200',
    icon: <Clock size={16} />,
    description: 'Awaiting owner approval',
  },
  confirmed: {
    label: 'Confirmed',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50 border-emerald-200',
    icon: <CheckCircle2 size={16} />,
    description: 'Booking confirmed',
  },
  completed: {
    label: 'Completed',
    color: 'text-slate-700',
    bg: 'bg-slate-100 border-slate-200',
    icon: <CheckCircle2 size={16} />,
    description: 'Rental finished',
  },
  cancelled: {
    label: 'Cancelled',
    color: 'text-red-700',
    bg: 'bg-red-50 border-red-200',
    icon: <XCircle size={16} />,
    description: 'Booking cancelled',
  },
};

// ─── Cancel Modal ──────────────────────────────────────────────────────────

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
    setError(null);
    const { error: err } = await supabase
      .from('bookings')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', booking.id);

    setLoading(false);
    if (err) {
      setError(err.message);
    } else {
      onSuccess();
      onClose();
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <Ban size={20} />
            </div>
            <div>
              <h2 className="font-bold text-base">Cancel Booking</h2>
              <p className="text-xs text-red-100">
                {booking.vehicle?.make} {booking.vehicle?.model} · {booking.vehicle?.year}
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-6 space-y-4">
          {/* Booking Details */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">
              Dates
            </p>
            <p className="text-sm text-gray-900">
              {formatDate(booking.pickup_date)} → {formatDate(booking.dropoff_date)}
            </p>
          </div>

          {/* Warning */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-700 flex items-start gap-2">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              This action cannot be undone. Cancellation policies may apply.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-700 flex items-center gap-2">
                <AlertCircle size={16} />
                {error}
              </p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              Keep Booking
            </button>
            <button
              onClick={handleCancel}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white py-2.5 rounded-lg font-medium transition-colors text-sm shadow-sm"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <XCircle size={16} />
              )}
              {loading ? 'Cancelling…' : 'Cancel Booking'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────

export default function CustomerBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | BookingStatus>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
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

      setCustomerId(user.id);

      const { data, error: err } = await supabase
        .from('bookings')
        .select(
          `
          id, pickup_date, dropoff_date, pickup_location, dropoff_location,
          total_price, status, created_at, updated_at,
          vehicle:vehicle_id (
            id, make, model, year, type, color, price_per_day, owner_id,
            location_city, location_state, license_plate,
            vehicle_images (url, is_primary)
          )
        `
        )
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false });

      if (err) {
        setError(err.message);
      } else {
        const normalized: Booking[] = (data ?? []).map((row: any) => ({
          ...row,
          vehicle: Array.isArray(row.vehicle) ? row.vehicle[0] ?? null : row.vehicle ?? null,
        }));
        setBookings(normalized);
      }

      setLoading(false);
    };

    fetchBookings();
  }, []);

  const filtered = bookings.filter((b) => {
    const s = searchTerm.toLowerCase();
    const matchSearch =
      (b.vehicle?.make?.toLowerCase() ?? '').includes(s) ||
      (b.vehicle?.model?.toLowerCase() ?? '').includes(s) ||
      (b.pickup_location?.toLowerCase() ?? '').includes(s) ||
      (b.dropoff_location?.toLowerCase() ?? '').includes(s) ||
      (b.vehicle?.license_plate?.toLowerCase() ?? '').includes(s);
    const matchTab = activeTab === 'all' || b.status === activeTab;
    return matchSearch && matchTab;
  });

  const stats = {
    total: bookings.length,
    pending: bookings.filter((b) => b.status === 'pending').length,
    confirmed: bookings.filter((b) => b.status === 'confirmed').length,
    completed: bookings.filter((b) => b.status === 'completed').length,
    spent: bookings
      .filter((b) => b.status === 'completed')
      .reduce((s, b) => s + b.total_price, 0),
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

  const formatTime = (d: string) =>
    new Date(d).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

  const getVehicleImg = (v: Booking['vehicle']) => {
    if (!v?.vehicle_images?.length) return null;
    const primary = v.vehicle_images.find((i) => i.is_primary);
    return primary?.url ?? v.vehicle_images[0]?.url ?? null;
  };

  const daysBetween = (a: string, b: string) => {
    return Math.max(
      0,
      Math.ceil((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000)
    );
  };

  const canCancel = (status: BookingStatus) => status === 'pending' || status === 'confirmed';

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <div className="text-center">
            <p className="text-blue-700 font-semibold text-lg">Loading your bookings...</p>
            <p className="text-gray-500 text-sm mt-1">Fetching rental data</p>
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
            <AlertCircle className="text-red-600" size={24} />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Bookings</h3>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
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
      {/* Cancel Modal */}
      {cancelTarget && (
        <CancelModal
          booking={cancelTarget}
          onClose={() => setCancelTarget(null)}
          onSuccess={() => {
            setBookings((prev) =>
              prev.map((b) =>
                b.id === cancelTarget.id ? { ...b, status: 'cancelled' } : b
              )
            );
            setCancelTarget(null);
          }}
        />
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white px-6 py-10 shadow-lg">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="text-blue-200 text-sm font-semibold tracking-wide uppercase mb-2">
                Customer Portal
              </p>
              <h1 className="text-4xl md:text-5xl font-bold">My Bookings</h1>
            </div>
            <div className="w-16 h-16 bg-white/10 rounded-xl backdrop-blur-sm flex items-center justify-center">
              <Car size={32} className="text-blue-200" />
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              {
                label: 'Total Bookings',
                value: stats.total,
                icon: <Calendar size={16} />,
                bg: 'bg-white/10',
              },
              {
                label: 'Pending',
                value: stats.pending,
                icon: <Clock size={16} />,
                bg: 'bg-amber-500/20',
                alert: stats.pending > 0,
              },
              {
                label: 'Confirmed',
                value: stats.confirmed,
                icon: <CheckCircle2 size={16} />,
                bg: 'bg-emerald-500/20',
              },
              {
                label: 'Completed',
                value: stats.completed,
                icon: <CheckCircle2 size={16} />,
                bg: 'bg-slate-500/20',
              },
              {
                label: 'Total Spent',
                value: `$${stats.spent.toFixed(0)}`,
                icon: <DollarSign size={16} />,
                bg: 'bg-green-500/20',
              },
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
            {/* Search */}
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search vehicle, location…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200/50 outline-none transition-all"
              />
            </div>

            {/* Status Tabs */}
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
                const count = stats[tab as keyof typeof stats];
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 capitalize ${
                      activeTab === tab
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
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

      {/* Bookings List */}
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-5">
        {filtered.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-xl border border-gray-200 shadow-sm">
            <Car size={48} className="text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-800 mb-2">No bookings found</h3>
            <p className="text-gray-500 max-w-md mx-auto mb-6">
              {activeTab === 'all'
                ? "You haven't made any bookings yet. Start your journey today!"
                : `No ${activeTab} bookings at the moment.`}
            </p>
            {activeTab === 'all' && (
              <a
                href="/vehicles"
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors shadow-sm"
              >
                Browse Vehicles <ArrowRight size={16} />
              </a>
            )}
          </div>
        ) : (
          filtered.map((booking) => {
            const cfg = STATUS_CONFIG[booking.status];
            const imgUrl = getVehicleImg(booking.vehicle);
            const isExpanded = expanded === booking.id;
            const days = daysBetween(booking.pickup_date, booking.dropoff_date);

            return (
              <div
                key={booking.id}
                className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-lg transition-all"
              >
                {/* Header Row */}
                <div
                  className="flex items-center gap-5 p-5 cursor-pointer hover:bg-blue-50/50 transition-colors group"
                  onClick={() => setExpanded(isExpanded ? null : booking.id)}
                >
                  {/* Thumbnail */}
                  <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200 group-hover:border-blue-300 transition-colors">
                    {imgUrl ? (
                      <img src={imgUrl} alt="vehicle" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
                        <Car size={28} className="text-blue-400" />
                      </div>
                    )}
                  </div>

                  {/* Main Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div>
                        <p className="font-semibold text-gray-900 text-lg truncate">
                          {booking.vehicle
                            ? `${booking.vehicle.make} ${booking.vehicle.model}`
                            : 'Vehicle not found'}
                        </p>
                        {booking.vehicle && (
                          <p className="text-xs text-gray-500 font-medium">
                            {booking.vehicle.year} • {booking.vehicle.license_plate}
                          </p>
                        )}
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
                    className={`text-gray-500 transition-transform flex-shrink-0 ${
                      isExpanded ? 'rotate-180' : ''
                    }`}
                  />
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t border-gray-100 px-6 py-6 bg-gray-50/50 space-y-6">
                    {/* Dates & Trip */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {/* Trip Details */}
                      <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-4 flex items-center gap-2">
                          <Calendar size={14} /> Trip Details
                        </p>
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">
                              Pick-up
                            </p>
                            <p className="font-medium text-gray-900">{booking.pickup_location}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {formatDate(booking.pickup_date)} at {formatTime(booking.pickup_date)}
                            </p>
                          </div>
                          <div className="pt-2 border-t border-gray-100">
                            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">
                              Drop-off
                            </p>
                            <p className="font-medium text-gray-900">{booking.dropoff_location}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {formatDate(booking.dropoff_date)} at {formatTime(booking.dropoff_date)}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Payment Breakdown */}
                      <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-4 flex items-center gap-2">
                          <CreditCard size={14} /> Price Breakdown
                        </p>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-500">
                              {days} day{days !== 1 ? 's' : ''} × ${booking.vehicle?.price_per_day ?? '—'}
                            </span>
                            <span className="font-medium text-gray-900">
                              ${(
                                (booking.vehicle?.price_per_day ?? 0) * days
                              ).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Service fee</span>
                            <span className="font-medium text-gray-900">
                              ${(
                                booking.total_price -
                                (booking.vehicle?.price_per_day ?? 0) * days
                              ).toFixed(2)}
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

                    {/* Vehicle Details */}
                    {booking.vehicle && (
                      <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-4 flex items-center gap-2">
                          <Car size={14} /> Vehicle Information
                        </p>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">
                              Make & Model
                            </p>
                            <p className="font-medium text-gray-900">
                              {booking.vehicle.make} {booking.vehicle.model}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">
                              Year
                            </p>
                            <p className="font-medium text-gray-900">{booking.vehicle.year}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">
                              Type
                            </p>
                            <p className="font-medium text-gray-900">
                              {booking.vehicle.type}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">
                              License Plate
                            </p>
                            <p className="font-mono font-semibold text-gray-900">
                              {booking.vehicle.license_plate}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Metadata */}
                    <p className="text-xs text-gray-500">
                      Booked on{' '}
                      {new Date(booking.created_at).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                      {booking.updated_at !== booking.created_at &&
                        ` · Updated ${new Date(booking.updated_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}`}
                    </p>

                    {/* Action Buttons */}
                    <div className="space-y-4">
                      {/* Status Change Section */}
                      <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3 flex items-center gap-2">
                          <CheckCircle2 size={14} /> Booking Status
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {STATUS_TABS.map((status) => {
                            const isCurrentStatus = booking.status === status;
                            const statusCfg = STATUS_CONFIG[status];
                            
                            let buttonColor = 'bg-gray-200 text-gray-700 hover:bg-gray-300';
                            
                            if (!isCurrentStatus) {
                              if (status === 'confirmed') {
                                buttonColor = 'bg-green-600 hover:bg-green-700 text-white';
                              } else if (status === 'completed') {
                                buttonColor = 'bg-blue-600 hover:bg-blue-700 text-white';
                              } else if (status === 'cancelled') {
                                buttonColor = 'bg-red-600 hover:bg-red-700 text-white';
                              } else if (status === 'pending') {
                                buttonColor = 'bg-amber-600 hover:bg-amber-700 text-white';
                              }
                            }
                            
                            return (
                              <button
                                key={status}
                                disabled={isCurrentStatus}
                                className={`py-2 px-3 rounded-lg font-medium text-xs transition-all flex items-center justify-center gap-1.5 capitalize ${
                                  isCurrentStatus
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    : buttonColor
                                }`}
                              >
                                {statusCfg.icon}
                                {status}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Main Action Buttons */}
                      <div className="flex flex-wrap gap-3">
                        {canCancel(booking.status) && (
                          <button
                            onClick={() => setCancelTarget(booking)}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-white text-red-600 border border-red-300 hover:bg-red-50 transition-all"
                          >
                            <Ban size={14} />
                            Cancel Booking
                          </button>
                        )}

                        {booking.status === 'completed' && (
                          <>
                            <button className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-amber-500 hover:bg-amber-600 text-white transition-all shadow-sm">
                              <Star size={14} />
                              Leave a Review
                            </button>
                            <a
                              href="/vehicles"
                              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-all"
                            >
                              <Car size={14} />
                              Book Again
                            </a>
                          </>
                        )}

                        {booking.status !== 'cancelled' && (
                          <a
                            href="/support"
                            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 transition-all ml-auto"
                          >
                            <MessageCircle size={14} />
                            Get Support
                          </a>
                        )}

                        {booking.status === 'cancelled' && (
                          <p className="text-sm text-gray-500 italic self-center">
                            This booking was cancelled.
                          </p>
                        )}
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
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease both;
        }
      `}</style>
    </div>
  );
}