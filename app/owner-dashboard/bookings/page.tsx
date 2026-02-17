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
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

type Booking = {
  id: string;
  pickup_date: string;
  dropoff_date: string;
  pickup_location: string;
  dropoff_location: string;
  total_price: number;
  status: 'pending' | 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  created_at: string;
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

const STATUS_TABS = ['All', 'Pending', 'Upcoming', 'Ongoing', 'Completed', 'Cancelled'];

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  pending:   { label: 'Pending',   color: 'text-amber-700',     bg: 'bg-amber-50 border-amber-200',    icon: <Clock size={13} /> },
  upcoming:  { label: 'Upcoming',  color: 'text-blue-700',      bg: 'bg-blue-50 border-blue-200',      icon: <Calendar size={13} /> },
  ongoing:   { label: 'Ongoing',   color: 'text-emerald-700',   bg: 'bg-emerald-50 border-emerald-200', icon: <RefreshCw size={13} /> },
  completed: { label: 'Completed', color: 'text-slate-700',     bg: 'bg-slate-100 border-slate-200',   icon: <CheckCircle2 size={13} /> },
  cancelled: { label: 'Cancelled', color: 'text-red-700',       bg: 'bg-red-50 border-red-200',        icon: <XCircle size={13} /> },
};

const NEXT_STATUSES: Partial<Record<Booking['status'], Booking['status'][]>> = {
  pending:  ['upcoming', 'cancelled'],
  upcoming: ['ongoing',  'cancelled'],
  ongoing:  ['completed'],
};

export default function OwnerBookingsPage() {
  const [bookings, setBookings]   = useState<Booking[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [expanded, setExpanded]   = useState<string | null>(null);

  const fetchBookings = async () => {
    setLoading(true);
    const email = localStorage.getItem('user_email');
    if (!email) { window.location.href = '/sign-in'; return; }

    const { data: owner } = await supabase
      .from('users').select('id').eq('email', email.trim().toLowerCase()).single();

    if (!owner) { setError('Owner not found'); setLoading(false); return; }

    const { data: ownerVehicles } = await supabase
      .from('vehicles').select('id').eq('owner_id', owner.id);

    const vehicleIds = (ownerVehicles ?? []).map((v: any) => v.id);

    if (vehicleIds.length === 0) {
      setBookings([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('bookings')
      .select(`
        id, pickup_date, dropoff_date, pickup_location, dropoff_location,
        total_price, status, created_at,
        customer:customer_id (first_name, last_name, email, phone, avatar_url),
        vehicle:vehicle_id (id, make, model, year, license_plate,
          vehicle_images (url, is_primary))
      `)
      .in('vehicle_id', vehicleIds)
      .order('created_at', { ascending: false });

    if (error) setError(error.message);
    else setBookings((data ?? []) as Booking[]);
    setLoading(false);
  };

  useEffect(() => { fetchBookings(); }, []);

  const updateStatus = async (bookingId: string, newStatus: Booking['status']) => {
    setUpdatingId(bookingId);
    const { error } = await supabase
      .from('bookings')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', bookingId);

    if (!error) {
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: newStatus } : b));
    }
    setUpdatingId(null);
  };

  const filtered = bookings.filter(b => {
    const s = searchTerm.toLowerCase();
    const matchSearch =
      (b.customer?.first_name?.toLowerCase() ?? '').includes(s) ||
      (b.customer?.last_name?.toLowerCase() ?? '').includes(s) ||
      (b.customer?.email?.toLowerCase() ?? '').includes(s) ||
      (b.vehicle?.make?.toLowerCase() ?? '').includes(s) ||
      (b.vehicle?.model?.toLowerCase() ?? '').includes(s);
    const matchTab = activeTab === 'All' || b.status === activeTab.toLowerCase();
    return matchSearch && matchTab;
  });

  const stats = {
    total:   bookings.length,
    pending: bookings.filter(b => b.status === 'pending').length,
    ongoing: bookings.filter(b => b.status === 'ongoing').length,
    revenue: bookings.filter(b => b.status === 'completed').reduce((s, b) => s + b.total_price, 0),
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const getVehicleImg = (v: Booking['vehicle']) => {
    if (!v?.vehicle_images?.length) return null;
    const primary = v.vehicle_images.find(i => i.is_primary);
    return primary?.url ?? v.vehicle_images[0]?.url ?? null;
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-blue-700 font-medium">Loading bookings...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-red-600 flex items-center gap-2"><AlertCircle size={20} /> {error}</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-700 to-blue-900 text-white px-6 py-10 shadow-lg">
        <div className="max-w-6xl mx-auto">
          <p className="text-blue-200 text-sm font-medium tracking-wide uppercase mb-2">Owner Dashboard</p>
          <h1 className="text-4xl md:text-5xl font-bold mb-6">Manage Your Bookings</h1>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total Bookings', value: stats.total, icon: <Calendar size={18} /> },
              { label: 'Pending',        value: stats.pending, icon: <Clock size={18} />, alert: stats.pending > 0 },
              { label: 'Active Rentals', value: stats.ongoing, icon: <RefreshCw size={18} /> },
              { label: 'Total Revenue',  value: `$${stats.revenue.toFixed(0)}`, icon: <DollarSign size={18} /> },
            ].map((s) => (
              <div
                key={s.label}
                className={`bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 text-center transition-all hover:bg-white/20 ${
                  s.alert ? 'ring-2 ring-blue-300 ring-offset-2 ring-offset-blue-800' : ''
                }`}
              >
                <div className="mb-2 text-blue-200">{s.icon}</div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-blue-200 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white border-b border-gray-200 shadow-sm px-6 py-4 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search customer or vehicle..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200/50 outline-none transition-all"
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
                {tab === 'Pending' && stats.pending > 0 && (
                  <span className="ml-1.5 bg-blue-100 text-blue-800 text-xs font-bold px-2 py-0.5 rounded-full">
                    {stats.pending}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bookings List */}
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-5">
        {filtered.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-gray-200 shadow-sm">
            <Calendar className="mx-auto text-gray-400 mb-4" size={64} strokeWidth={1.2} />
            <h3 className="text-xl font-semibold text-gray-800 mb-2">No bookings found</h3>
            <p className="text-gray-500 max-w-md mx-auto">
              {activeTab === 'All'
                ? "You haven't received any bookings yet."
                : `No ${activeTab.toLowerCase()} bookings at the moment.`}
            </p>
          </div>
        ) : (
          filtered.map(booking => {
            const cfg = STATUS_CONFIG[booking.status];
            const imgUrl = getVehicleImg(booking.vehicle);
            const isExpanded = expanded === booking.id;
            const nextStatuses = NEXT_STATUSES[booking.status] ?? [];
            const customer = booking.customer;
            const vehicle = booking.vehicle;

            return (
              <div
                key={booking.id}
                className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Header row – clickable */}
                <div
                  className="flex items-center gap-5 p-5 cursor-pointer hover:bg-blue-50/40 transition-colors"
                  onClick={() => setExpanded(isExpanded ? null : booking.id)}
                >
                  {/* Thumbnail */}
                  <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200">
                    {imgUrl ? (
                      <img src={imgUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-blue-50">
                        <Car size={28} className="text-blue-400" />
                      </div>
                    )}
                  </div>

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-gray-900 truncate text-lg">
                          {vehicle ? `${vehicle.make} ${vehicle.model} · ${vehicle.year}` : 'Vehicle not found'}
                        </p>
                        <p className="text-sm text-gray-600 mt-0.5">
                          {customer ? `${customer.first_name} ${customer.last_name}` : '—'}
                        </p>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${cfg.bg} ${cfg.color}`}
                      >
                        {cfg.icon} {cfg.label}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mt-2 text-sm text-gray-600">
                      <span className="flex items-center gap-1.5">
                        <Calendar size={14} className="text-gray-400" />
                        {formatDate(booking.pickup_date)} → {formatDate(booking.dropoff_date)}
                      </span>
                      <span className="font-medium text-blue-700">
                        ${booking.total_price.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <ChevronDown
                    size={20}
                    className={`text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  />
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="border-t border-gray-100 px-5 pb-6 pt-5 bg-gray-50/40">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                      {/* Customer */}
                      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                          <User size={14} /> Customer Info
                        </p>
                        {customer ? (
                          <div className="space-y-1.5 text-sm">
                            <p className="font-medium text-gray-900">
                              {customer.first_name} {customer.last_name}
                            </p>
                            <p className="text-gray-600">{customer.email}</p>
                            {customer.phone && <p className="text-gray-600">{customer.phone}</p>}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 italic">No customer details available</p>
                        )}
                      </div>

                      {/* Trip */}
                      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                          <MapPin size={14} /> Trip Details
                        </p>
                        <div className="space-y-2 text-sm">
                          <p><span className="text-gray-500">Pick-up:</span> <span className="font-medium">{booking.pickup_location}</span></p>
                          <p><span className="text-gray-500">Drop-off:</span> <span className="font-medium">{booking.dropoff_location}</span></p>
                          <p><span className="text-gray-500">Booked on:</span> <span className="font-medium">{formatDate(booking.created_at)}</span></p>
                        </div>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="flex items-center justify-between bg-blue-50/70 rounded-lg p-4 mb-6 border border-blue-100">
                      <span className="text-gray-700 font-medium">Total Value</span>
                      <span className="text-xl font-bold text-blue-800">
                        ${booking.total_price.toFixed(2)}
                      </span>
                    </div>

                    {/* Actions */}
                    {nextStatuses.length > 0 ? (
                      <div className="flex flex-wrap gap-3">
                        {nextStatuses.map(ns => {
                          const nsCfg = STATUS_CONFIG[ns];
                          const isPositive = ns !== 'cancelled';
                          return (
                            <button
                              key={ns}
                              disabled={updatingId === booking.id}
                              onClick={() => updateStatus(booking.id, ns)}
                              className={`
                                flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-60
                                ${isPositive
                                  ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                                  : 'bg-white text-red-600 border border-red-300 hover:bg-red-50'}
                              `}
                            >
                              {updatingId === booking.id ? (
                                <RefreshCw size={14} className="animate-spin" />
                              ) : (
                                nsCfg.icon
                              )}
                              {isPositive ? 'Confirm as' : 'Cancel – '} {nsCfg.label}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 italic bg-gray-100 rounded-lg p-4 text-center">
                        Booking is {booking.status} — no further actions available.
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}