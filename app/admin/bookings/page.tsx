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
  Shield,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

type UserRole = 'admin' | 'car-owner' | 'customer';

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
    // only present for admin view
    owner?: {
      first_name: string;
      last_name: string;
      email: string;
    } | null;
  } | null;
};

const STATUS_TABS = ['All', 'Pending', 'Upcoming', 'Ongoing', 'Completed', 'Cancelled'];

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  pending:   { label: 'Pending',   color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-200',   icon: <Clock size={13} /> },
  upcoming:  { label: 'Upcoming',  color: 'text-sky-700',    bg: 'bg-sky-50 border-sky-200',     icon: <Calendar size={13} /> },
  ongoing:   { label: 'Ongoing',   color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-200', icon: <RefreshCw size={13} /> },
  completed: { label: 'Completed', color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-200',   icon: <CheckCircle2 size={13} /> },
  cancelled: { label: 'Cancelled', color: 'text-blue-800',   bg: 'bg-blue-100 border-blue-200',  icon: <XCircle size={13} /> },
};

const NEXT_STATUSES: Partial<Record<Booking['status'], Booking['status'][]>> = {
  pending:  ['upcoming', 'cancelled'],
  upcoming: ['ongoing',  'cancelled'],
  ongoing:  ['completed'],
};

export default function BookingsPage() {
  const [bookings, setBookings]     = useState<Booking[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [activeTab, setActiveTab]   = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [expanded, setExpanded]     = useState<string | null>(null);
  const [viewerRole, setViewerRole] = useState<UserRole | null>(null);

  // ─── Fetch ────────────────────────────────────────────────────────────────
  const fetchBookings = async () => {
    setLoading(true);
    setError(null);

    const email = localStorage.getItem('user_email');
    if (!email) { window.location.href = '/sign-in'; return; }

    // 1. Resolve the current user + role
    const { data: currentUser, error: userErr } = await supabase
      .from('users')
      .select('id, role')
      .eq('email', email.trim().toLowerCase())
      .single();

    if (userErr || !currentUser) {
      setError('Could not load your account. Please sign in again.');
      setLoading(false);
      return;
    }

    setViewerRole(currentUser.role as UserRole);
    const isAdmin = currentUser.role === 'admin';

    // 2a. ADMIN — fetch every booking with owner info on the vehicle
    if (isAdmin) {
      const { data, error: fetchErr } = await supabase
        .from('bookings')
        .select(`
          id, pickup_date, dropoff_date, pickup_location, dropoff_location,
          total_price, status, created_at,
          customer:customer_id (first_name, last_name, email, phone, avatar_url),
          vehicle:vehicle_id (
            id, make, model, year, license_plate,
            vehicle_images (url, is_primary),
            owner:owner_id (first_name, last_name, email)
          )
        `)
        .order('created_at', { ascending: false });

      if (fetchErr) { setError(fetchErr.message); setLoading(false); return; }

      setBookings(normalise(data ?? []));
      setLoading(false);
      return;
    }

    // 2b. CAR-OWNER — fetch only bookings for their vehicles
    const { data: ownerVehicles } = await supabase
      .from('vehicles')
      .select('id')
      .eq('owner_id', currentUser.id);

    const vehicleIds = (ownerVehicles ?? []).map((v: any) => v.id);

    if (vehicleIds.length === 0) {
      setBookings([]);
      setLoading(false);
      return;
    }

    const { data, error: fetchErr } = await supabase
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

    if (fetchErr) setError(fetchErr.message);
    else setBookings(normalise(data ?? []));

    setLoading(false);
  };

  useEffect(() => { fetchBookings(); }, []);

  // ─── Helpers ──────────────────────────────────────────────────────────────
  /** Supabase sometimes returns joins as arrays; unwrap them. */
  function normalise(rows: any[]): Booking[] {
    return rows.map((item) => ({
      ...item,
      customer: Array.isArray(item.customer) ? (item.customer[0] ?? null) : (item.customer ?? null),
      vehicle: item.vehicle
        ? {
            ...(Array.isArray(item.vehicle) ? item.vehicle[0] : item.vehicle),
            owner: (() => {
              const raw = (Array.isArray(item.vehicle) ? item.vehicle[0] : item.vehicle)?.owner;
              return Array.isArray(raw) ? (raw[0] ?? null) : (raw ?? null);
            })(),
          }
        : null,
    }));
  }

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

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const getVehicleImg = (v: Booking['vehicle']) => {
    if (!v?.vehicle_images?.length) return null;
    return (v.vehicle_images.find(i => i.is_primary) ?? v.vehicle_images[0])?.url ?? null;
  };

  // ─── Filter ───────────────────────────────────────────────────────────────
  const filtered = bookings.filter(b => {
    const s = searchTerm.toLowerCase();
    const matchSearch =
      (b.customer?.first_name?.toLowerCase() ?? '').includes(s) ||
      (b.customer?.last_name?.toLowerCase() ?? '').includes(s) ||
      (b.customer?.email?.toLowerCase() ?? '').includes(s) ||
      (b.vehicle?.make?.toLowerCase() ?? '').includes(s) ||
      (b.vehicle?.model?.toLowerCase() ?? '').includes(s) ||
      // admin can also search by owner name
      (b.vehicle?.owner?.first_name?.toLowerCase() ?? '').includes(s) ||
      (b.vehicle?.owner?.last_name?.toLowerCase() ?? '').includes(s);
    const matchTab = activeTab === 'All' || b.status === activeTab.toLowerCase();
    return matchSearch && matchTab;
  });

  const stats = {
    total:   bookings.length,
    pending: bookings.filter(b => b.status === 'pending').length,
    ongoing: bookings.filter(b => b.status === 'ongoing').length,
    revenue: bookings.filter(b => b.status === 'completed').reduce((s, b) => s + b.total_price, 0),
  };

  const isAdmin = viewerRole === 'admin';

  // ─── Loading / Error ──────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-blue-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-blue-700 font-medium">Loading bookings…</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-blue-50 flex items-center justify-center">
      <div className="text-blue-700 flex items-center gap-2"><AlertCircle size={20} /> {error}</div>
    </div>
  );

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-blue-50">

      {/* Header */}
      <div className="text-white px-6 py-10 shadow-lg bg-gradient-to-r from-blue-800 to-blue-900">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2 mb-1">
            {isAdmin && <Shield size={14} className="text-blue-200" />}
            <p className="text-sm font-medium tracking-wide uppercase text-blue-200">
              {isAdmin ? 'Admin — All Bookings' : 'Owner Dashboard'}
            </p>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            {isAdmin ? 'All Bookings' : 'Manage Your Bookings'}
          </h1>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total Bookings', value: stats.total,                         icon: <Calendar size={18} /> },
              { label: 'Pending',        value: stats.pending,                        icon: <Clock size={18} />,        alert: stats.pending > 0 },
              { label: 'Active Rentals', value: stats.ongoing,                        icon: <RefreshCw size={18} /> },
              { label: isAdmin ? 'Platform Revenue' : 'Total Revenue',
                                         value: `$${stats.revenue.toFixed(0)}`,       icon: <DollarSign size={18} /> },
            ].map((s) => (
              <div
                key={s.label}
                className={`bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 text-center transition-all hover:bg-white/20 ${
                  s.alert ? 'ring-2 ring-blue-200 ring-offset-2 ring-offset-blue-900' : ''
                }`}
              >
                <div className="mb-2 text-white/60">{s.icon}</div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs mt-1 text-blue-200">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white border-b border-blue-200 shadow-sm px-6 py-4 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-300" size={16} />
            <input
              type="text"
              placeholder={isAdmin ? 'Search customer, vehicle, or owner…' : 'Search customer or vehicle…'}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-blue-200 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200/50 outline-none transition-all"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {STATUS_TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-shrink-0 px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab ? 'bg-blue-600 text-white shadow-sm' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
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

      {/* Bookings list */}
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-5">
        {filtered.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-blue-200 shadow-sm">
            <Calendar className="mx-auto text-blue-300 mb-4" size={64} strokeWidth={1.2} />
            <h3 className="text-xl font-semibold text-blue-900 mb-2">No bookings found</h3>
            <p className="text-blue-700 max-w-md mx-auto">
              {activeTab === 'All'
                ? "No bookings exist yet."
                : `No ${activeTab.toLowerCase()} bookings at the moment.`}
            </p>
          </div>
        ) : (
          filtered.map(booking => {
            const cfg         = STATUS_CONFIG[booking.status];
            const imgUrl      = getVehicleImg(booking.vehicle);
            const isExpanded  = expanded === booking.id;
            const nextStatuses = NEXT_STATUSES[booking.status] ?? [];
            const { customer, vehicle } = booking;

            return (
              <div
                key={booking.id}
                className="bg-white rounded-xl border border-blue-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Summary row */}
                <div
                  className="flex items-center gap-5 p-5 cursor-pointer hover:bg-blue-50/40 transition-colors"
                  onClick={() => setExpanded(isExpanded ? null : booking.id)}
                >
                  {/* Thumbnail */}
                  <div className="w-20 h-20 bg-blue-50 rounded-lg overflow-hidden flex-shrink-0 border border-blue-200">
                    {imgUrl ? (
                      <img src={imgUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-blue-50">
                        <Car size={28} className="text-blue-400" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-blue-900 text-lg truncate">
                          {vehicle ? `${vehicle.make} ${vehicle.model} · ${vehicle.year}` : 'Vehicle not found'}
                        </p>
                        <p className="text-sm text-blue-600 mt-0.5">
                          Customer: {customer ? `${customer.first_name} ${customer.last_name}` : '—'}
                          {/* Admin-only: show vehicle owner */}
                          {isAdmin && vehicle?.owner && (
                            <span className="ml-3 inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-medium">
                              <Shield size={10} /> Owner: {vehicle.owner.first_name} {vehicle.owner.last_name}
                            </span>
                          )}
                        </p>
                      </div>
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${cfg.bg} ${cfg.color}`}>
                        {cfg.icon} {cfg.label}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mt-2 text-sm text-blue-700">
                      <span className="flex items-center gap-1.5">
                        <Calendar size={14} className="text-blue-300" />
                        {formatDate(booking.pickup_date)} → {formatDate(booking.dropoff_date)}
                      </span>
                      <span className="font-semibold text-blue-700">${booking.total_price.toFixed(2)}</span>
                    </div>
                  </div>

                  <ChevronDown size={20} className={`text-blue-500 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`} />
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-blue-100 px-5 pb-6 pt-5 bg-blue-50/40">
                    <div className={`grid grid-cols-1 gap-5 mb-6 ${isAdmin ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>

                      {/* Customer */}
                      <div className="bg-white rounded-lg border border-blue-200 p-4 shadow-sm">
                        <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                          <User size={14} /> Customer
                        </p>
                        {customer ? (
                          <div className="space-y-1 text-sm">
                            <p className="font-semibold text-blue-900">{customer.first_name} {customer.last_name}</p>
                            <p className="text-blue-600">{customer.email}</p>
                            {customer.phone && <p className="text-blue-600">{customer.phone}</p>}
                          </div>
                        ) : (
                          <p className="text-sm text-blue-400 italic">No customer details</p>
                        )}
                      </div>

                      {/* Trip */}
                      <div className="bg-white rounded-lg border border-blue-200 p-4 shadow-sm">
                        <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                          <MapPin size={14} /> Trip Details
                        </p>
                        <div className="space-y-1.5 text-sm">
                          <p><span className="text-blue-400">Pick-up:</span> <span className="font-medium text-blue-900">{booking.pickup_location}</span></p>
                          <p><span className="text-blue-400">Drop-off:</span> <span className="font-medium text-blue-900">{booking.dropoff_location}</span></p>
                          <p><span className="text-blue-400">Booked:</span> <span className="font-medium text-blue-900">{formatDate(booking.created_at)}</span></p>
                        </div>
                      </div>

                      {/* Admin-only: Vehicle owner card */}
                      {isAdmin && (
                      <div className="bg-white rounded-lg border border-blue-200 p-4 shadow-sm">
                        <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                            <Shield size={14} /> Vehicle Owner
                          </p>
                          {vehicle?.owner ? (
                            <div className="space-y-1 text-sm">
                              <p className="font-semibold text-blue-900">{vehicle.owner.first_name} {vehicle.owner.last_name}</p>
                              <p className="text-blue-600">{vehicle.owner.email}</p>
                              <p className="text-xs text-blue-400 mt-1">
                                Vehicle: {vehicle.make} {vehicle.model} · #{vehicle.license_plate}
                              </p>
                            </div>
                          ) : (
                              <p className="text-sm text-blue-400 italic">Owner info unavailable</p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Price */}
                    <div className="flex items-center justify-between bg-blue-50/70 rounded-lg p-4 mb-6 border border-blue-100">
                      <span className="text-blue-700 font-medium">Total Value</span>
                      <span className="text-xl font-bold text-blue-800">${booking.total_price.toFixed(2)}</span>
                    </div>

                    {/* Status actions */}
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
                              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-60 ${
                                isPositive
                                  ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                                  : 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
                              }`}
                            >
                              {updatingId === booking.id
                                ? <RefreshCw size={14} className="animate-spin" />
                                : nsCfg.icon}
                              {isPositive ? `Mark as ${nsCfg.label}` : `Cancel Booking`}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-blue-700 italic bg-blue-50 rounded-lg p-4 text-center">
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
