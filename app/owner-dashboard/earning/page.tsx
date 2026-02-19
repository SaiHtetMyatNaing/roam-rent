'use client';

import React, { useState, useEffect } from 'react';
import {
  DollarSign, TrendingUp, Car, Calendar, Clock,
  CheckCircle2, XCircle, AlertCircle, ArrowUpRight,
  ArrowDownRight, ChevronDown, Loader2, Star,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

const supabase = createClient();

type Booking = {
  id: string;
  pickup_date: string;
  dropoff_date: string;
  total_price: number;
  status: 'pending' | 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  created_at: string;
  customer: { first_name: string; last_name: string; avatar_url: string | null } | null;
  vehicle: { id: string; make: string; model: string; year: number; vehicle_images: { url: string; is_primary: boolean }[] } | null;
};

type Vehicle = {
  id: string;
  make: string;
  model: string;
  year: number;
  status: string;
  price_per_day: number;
  vehicle_images: { url: string; is_primary: boolean }[];
};

type DateRange = '7d' | '30d' | '90d' | '12m' | 'all';

const DATE_RANGES: { label: string; value: DateRange }[] = [
  { label: 'Last 7 days',   value: '7d'  },
  { label: 'Last 30 days',  value: '30d' },
  { label: 'Last 90 days',  value: '90d' },
  { label: 'Last 12 months',value: '12m' },
  { label: 'All time',      value: 'all' },
];

const BOOKING_STATUS_CONFIG = {
  completed: { label: 'Completed', textColor: 'text-emerald-700', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200' },
  ongoing:   { label: 'Active',    textColor: 'text-blue-700',    bgColor: 'bg-blue-50',    borderColor: 'border-blue-200' },
  upcoming:  { label: 'Upcoming',  textColor: 'text-violet-700',  bgColor: 'bg-violet-50',  borderColor: 'border-violet-200' },
  pending:   { label: 'Pending',   textColor: 'text-amber-700',   bgColor: 'bg-amber-50',   borderColor: 'border-amber-200' },
  cancelled: { label: 'Cancelled', textColor: 'text-red-700',     bgColor: 'bg-red-50',     borderColor: 'border-red-200' },
};

const FALLBACK_BOOKING_STATUS = { label: 'Unknown', textColor: 'text-slate-700', bgColor: 'bg-slate-100', borderColor: 'border-slate-200' };

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}
function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function daysBetween(a: string, b: string) {
  return Math.max(1, Math.ceil((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000));
}
function getVehicleImg(images: { url: string; is_primary: boolean }[]) {
  return images?.find(i => i.is_primary)?.url ?? images?.[0]?.url ?? null;
}
function getRangeStart(range: DateRange): Date | null {
  const now = new Date();
  if (range === 'all') return null;
  const map: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90, '12m': 365 };
  const d = new Date(now);
  d.setDate(d.getDate() - map[range]);
  return d;
}

// ─── Mini bar chart ────────────────────────────────────────────────────────────
function EarningsChart({ bookings }: { bookings: Booking[] }) {
  const completed = bookings.filter(b => b.status === 'completed');
  if (completed.length === 0) return null;

  // Group by month (last 6 months)
  const months: { label: string; earnings: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-US', { month: 'short' });
    const earnings = completed
      .filter(b => b.created_at.startsWith(key))
      .reduce((sum, b) => sum + b.total_price, 0);
    months.push({ label, earnings });
  }

  const max = Math.max(...months.map(m => m.earnings), 1);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-5">Monthly Earnings (last 6 months)</p>
      <div className="flex items-end gap-2 h-32">
        {months.map((m, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
            <div className="w-full relative flex items-end" style={{ height: '96px' }}>
              <div
                className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-md transition-all duration-500"
                style={{ height: `${Math.max((m.earnings / max) * 96, m.earnings > 0 ? 4 : 0)}px` }}
              />
              {m.earnings > 0 && (
                <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-bold text-blue-700 whitespace-nowrap">
                  {formatCurrency(m.earnings)}
                </span>
              )}
            </div>
            <span className="text-[11px] text-gray-400 font-medium">{m.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function OwnerEarningsPage() {
  const [bookings, setBookings]     = useState<Booking[]>([]);
  const [vehicles, setVehicles]     = useState<Vehicle[]>([]);
  const [ownerId, setOwnerId]       = useState<string | null>(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [dateRange, setDateRange]   = useState<DateRange>('30d');
  const [vehicleFilter, setVehicleFilter] = useState<string>('all');
  const [expanded, setExpanded]     = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const email = localStorage.getItem('user_email');
      if (!email) { window.location.href = '/sign-in'; return; }

      const { data: user } = await supabase
        .from('users').select('id, role').eq('email', email.trim().toLowerCase()).single();

      if (!user || user.role !== 'vehicle-owner') { window.location.href = '/'; return; }
      setOwnerId(user.id);

      // Fetch all owner's vehicles
      const { data: vData } = await supabase
        .from('vehicles')
        .select('id, make, model, year, status, price_per_day, vehicle_images(url, is_primary)')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      const normalizedVehicles: Vehicle[] = (vData ?? []).map((v: any) => ({
        ...v,
        vehicle_images: Array.isArray(v.vehicle_images) ? v.vehicle_images : [],
      }));
      setVehicles(normalizedVehicles);

      if (normalizedVehicles.length === 0) { setLoading(false); return; }

      // Fetch all bookings for owner's vehicles
      const vehicleIds = normalizedVehicles.map(v => v.id);
      const { data: bData, error: bErr } = await supabase
        .from('bookings')
        .select(`
          id, pickup_date, dropoff_date, total_price, status, created_at,
          customer:customer_id ( first_name, last_name, avatar_url ),
          vehicle:vehicle_id ( id, make, model, year, vehicle_images(url, is_primary) )
        `)
        .in('vehicle_id', vehicleIds)
        .order('created_at', { ascending: false });

      if (bErr) { setError(bErr.message); setLoading(false); return; }

      setBookings((bData ?? []).map((b: any) => ({
        ...b,
        customer: Array.isArray(b.customer) ? (b.customer[0] ?? null) : (b.customer ?? null),
        vehicle:  Array.isArray(b.vehicle)  ? (b.vehicle[0]  ?? null) : (b.vehicle  ?? null),
      })));

      setLoading(false);
    };
    init();
  }, []);

  // ── Filtered bookings ───────────────────────────────────────────────────────
  const filtered = bookings.filter(b => {
    if (vehicleFilter !== 'all' && b.vehicle?.id !== vehicleFilter) return false;
    const rangeStart = getRangeStart(dateRange);
    if (rangeStart && new Date(b.created_at) < rangeStart) return false;
    return true;
  });

  const completedBookings  = filtered.filter(b => b.status === 'completed');
  const activeBookings     = filtered.filter(b => b.status === 'ongoing');
  const upcomingBookings   = filtered.filter(b => b.status === 'upcoming' || b.status === 'pending');
  const cancelledBookings  = filtered.filter(b => b.status === 'cancelled');

  const totalEarned        = completedBookings.reduce((s, b) => s + b.total_price, 0);
  const pendingEarnings    = upcomingBookings.reduce((s, b) => s + b.total_price, 0);
  const activeEarnings     = activeBookings.reduce((s, b) => s + b.total_price, 0);
  const avgPerBooking      = completedBookings.length ? totalEarned / completedBookings.length : 0;

  // Previous period comparison (for 30d only)
  const prev30Start = new Date(); prev30Start.setDate(prev30Start.getDate() - 60);
  const prev30End   = new Date(); prev30End.setDate(prev30End.getDate() - 30);
  const prevEarned  = bookings
    .filter(b => b.status === 'completed' && new Date(b.created_at) >= prev30Start && new Date(b.created_at) < prev30End)
    .reduce((s, b) => s + b.total_price, 0);
  const earningsChange = prevEarned > 0 ? ((totalEarned - prevEarned) / prevEarned) * 100 : null;

  // Per-vehicle breakdown
  const vehicleBreakdown = vehicles.map(v => {
    const vBookings   = completedBookings.filter(b => b.vehicle?.id === v.id);
    const vEarnings   = vBookings.reduce((s, b) => s + b.total_price, 0);
    const vDays       = vBookings.reduce((s, b) => s + daysBetween(b.pickup_date, b.dropoff_date), 0);
    return { vehicle: v, earnings: vEarnings, bookings: vBookings.length, days: vDays };
  }).sort((a, b) => b.earnings - a.earnings);

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-blue-700 font-medium">Loading your earnings...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-xl shadow-sm p-8 max-w-md text-center">
        <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
        <p className="text-gray-700">{error}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Header ── */}
      <div className="bg-gradient-to-r from-blue-700 to-blue-900 text-white px-6 py-10 shadow-lg">
        <div className="max-w-5xl mx-auto">
          <p className="text-blue-200 text-sm font-medium uppercase tracking-wide mb-2">Owner Dashboard</p>
          <h1 className="text-4xl md:text-5xl font-bold mb-2">Earnings</h1>
          <p className="text-blue-300 text-sm">Track income across all your listed vehicles</p>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="bg-white border-b border-gray-200 shadow-sm px-6 py-4 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto flex flex-wrap gap-3 items-center">
          {/* Date range */}
          <div className="flex gap-1.5 flex-wrap">
            {DATE_RANGES.map(r => (
              <button key={r.value} onClick={() => setDateRange(r.value)}
                className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                  dateRange === r.value ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>
                {r.label}
              </button>
            ))}
          </div>

          {/* Vehicle filter */}
          {vehicles.length > 1 && (
            <select value={vehicleFilter} onChange={e => setVehicleFilter(e.target.value)}
              className="ml-auto px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 focus:border-blue-500 outline-none bg-white">
              <option value="all">All vehicles</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>{v.year} {v.make} {v.model}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total earned */}
          <div className="lg:col-span-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <DollarSign size={20} className="text-blue-600" />
              </div>
              {dateRange === '30d' && earningsChange !== null && (
                <span className={`flex items-center gap-0.5 text-xs font-semibold ${earningsChange >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {earningsChange >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                  {Math.abs(earningsChange).toFixed(0)}%
                </span>
              )}
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalEarned)}</p>
            <p className="text-xs text-gray-500 mt-1">Total earned</p>
          </div>

          {/* Active now */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center mb-3">
              <TrendingUp size={20} className="text-emerald-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(activeEarnings)}</p>
            <p className="text-xs text-gray-500 mt-1">Active rentals ({activeBookings.length})</p>
          </div>

          {/* Upcoming */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center mb-3">
              <Calendar size={20} className="text-violet-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(pendingEarnings)}</p>
            <p className="text-xs text-gray-500 mt-1">Upcoming ({upcomingBookings.length})</p>
          </div>

          {/* Avg per booking */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center mb-3">
              <Star size={20} className="text-amber-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(avgPerBooking)}</p>
            <p className="text-xs text-gray-500 mt-1">Avg per booking</p>
          </div>
        </div>

        {/* ── Chart ── */}
        <EarningsChart bookings={bookings} />

        {/* ── Per-vehicle breakdown ── */}
        {vehicleBreakdown.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-5">Earnings by Vehicle</p>
            <div className="space-y-4">
              {vehicleBreakdown.map(({ vehicle: v, earnings, bookings: bCount, days }) => {
                const img = getVehicleImg(v.vehicle_images);
                const pct = totalEarned > 0 ? (earnings / totalEarned) * 100 : 0;
                return (
                  <div key={v.id} className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 flex-shrink-0">
                      {img
                        ? <img src={img} alt="" className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center"><Car size={18} className="text-gray-400" /></div>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-semibold text-gray-900 text-sm truncate">
                          {v.year} {v.make} {v.model}
                        </p>
                        <p className="font-bold text-blue-700 text-sm flex-shrink-0 ml-3">
                          {formatCurrency(earnings)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                          <div className="bg-blue-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-gray-400 flex-shrink-0">
                          {bCount} booking{bCount !== 1 ? 's' : ''} · {days} day{days !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Booking history ── */}
        <div>
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Booking History
            <span className="ml-2 text-gray-400 font-normal normal-case">({filtered.length} records)</span>
          </p>

          {filtered.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
              <Calendar className="mx-auto text-gray-300 mb-4" size={48} strokeWidth={1.2} />
              <p className="text-gray-500 font-medium">No bookings in this period</p>
              <p className="text-gray-400 text-sm mt-1">Try expanding the date range or selecting all vehicles.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(booking => {
                const cfg = BOOKING_STATUS_CONFIG[booking.status] ?? FALLBACK_BOOKING_STATUS;
                const isExpanded = expanded === booking.id;
                const days = daysBetween(booking.pickup_date, booking.dropoff_date);
                const img = booking.vehicle ? getVehicleImg(booking.vehicle.vehicle_images) : null;

                return (
                  <div key={booking.id}
                    className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                    <div
                      className="flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50/50"
                      onClick={() => setExpanded(isExpanded ? null : booking.id)}
                    >
                      {/* Vehicle thumbnail */}
                      <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-100 border border-gray-200 flex-shrink-0">
                        {img
                          ? <img src={img} alt="" className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center"><Car size={20} className="text-gray-400" /></div>
                        }
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 text-sm truncate">
                              {booking.vehicle
                                ? `${booking.vehicle.make} ${booking.vehicle.model} · ${booking.vehicle.year}`
                                : 'Unknown vehicle'}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {booking.customer
                                ? `${booking.customer.first_name} ${booking.customer.last_name}`
                                : 'Unknown customer'}
                              {' · '}
                              {formatDate(booking.pickup_date)} → {formatDate(booking.dropoff_date)}
                              {' · '}{days} day{days !== 1 ? 's' : ''}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.bgColor} ${cfg.textColor} ${cfg.borderColor}`}>
                              {cfg.label}
                            </span>
                            {/* Show earnings only for non-cancelled */}
                            {booking.status !== 'cancelled' && (
                              <span className="font-bold text-blue-700 text-sm">
                                {formatCurrency(booking.total_price)}
                              </span>
                            )}
                            {booking.status === 'cancelled' && (
                              <span className="text-sm text-red-400 line-through">
                                {formatCurrency(booking.total_price)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <ChevronDown size={16}
                        className={`text-gray-400 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </div>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="border-t border-gray-100 px-4 py-4 bg-gray-50/40">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-xs text-gray-400 mb-0.5">Pick-up</p>
                            <p className="font-medium text-gray-900">{formatDate(booking.pickup_date)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 mb-0.5">Drop-off</p>
                            <p className="font-medium text-gray-900">{formatDate(booking.dropoff_date)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 mb-0.5">Duration</p>
                            <p className="font-medium text-gray-900">{days} day{days !== 1 ? 's' : ''}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 mb-0.5">
                              {booking.status === 'completed' ? 'Earned' : booking.status === 'cancelled' ? 'Lost' : 'Expected'}
                            </p>
                            <p className={`font-bold text-base ${
                              booking.status === 'cancelled' ? 'text-red-400' :
                              booking.status === 'completed' ? 'text-emerald-600' : 'text-blue-600'
                            }`}>
                              {formatCurrency(booking.total_price)}
                            </p>
                          </div>
                        </div>
                        <p className="text-xs text-gray-400 mt-3">
                          Booked on {formatDate(booking.created_at)}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Empty state: no vehicles ── */}
        {vehicles.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
            <Car className="mx-auto text-gray-300 mb-5" size={64} strokeWidth={1.2} />
            <h3 className="text-xl font-semibold text-gray-800 mb-2">No vehicles listed yet</h3>
            <p className="text-gray-500 mb-6 max-w-sm mx-auto">
              Add your first vehicle to start earning. Once approved, it will appear here with earnings data.
            </p>
            <Link href="/owner-dashboard/vehicles/add"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium transition-colors shadow-sm">
              <Car size={16} /> List a Vehicle
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}
