// app/owner-dashboard/vehicles/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Car, Plus, Search, MapPin, AlertCircle, CheckCircle2,
  Wrench, Clock, Pencil, Calendar, X, CalendarOff,
  ChevronDown, ChevronUp, Loader2, Trash2, CalendarCheck,
  CalendarX, Info, Save,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

// ─── Types ────────────────────────────────────────────────────────────────────
type VehicleImage = { url: string; is_primary: boolean };

type Vehicle = {
  id: string;
  make: string;
  model: string;
  type?: string | null;
  year?: number | null;
  license_plate: string;
  price_per_day?: number | null;
  status: 'available' | 'rented' | 'maintenance' | 'pending_approval';
  location_city?: string | null;
  location_state?: string | null;
  vehicle_images?: VehicleImage[] | null;
};

type AvailabilityWindow = {
  id: string;
  available_from: string;
  available_to: string;
  note: string | null;
};

type BlockedDate = {
  id: string;
  blocked_date: string;
  reason: string | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const today = new Date().toISOString().split('T')[0];

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

// ─── Availability Panel ───────────────────────────────────────────────────────
function AvailabilityPanel({ vehicleId, onClose }: { vehicleId: string; onClose: () => void }) {
  const [windows, setWindows] = useState<AvailabilityWindow[]>([]);
  const [blocked, setBlocked] = useState<BlockedDate[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // New window form
  const [newFrom, setNewFrom] = useState('');
  const [newTo, setNewTo] = useState('');
  const [newNote, setNewNote] = useState('');
  const [savingWindow, setSavingWindow] = useState(false);
  const [windowError, setWindowError] = useState<string | null>(null);

  // New blocked date form
  const [newBlockDate, setNewBlockDate] = useState('');
  const [newBlockReason, setNewBlockReason] = useState('');
  const [savingBlock, setSavingBlock] = useState(false);
  const [blockError, setBlockError] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadingData(true);
    const [{ data: w }, { data: b }] = await Promise.all([
      supabase
        .from('vehicle_availability')
        .select('id, available_from, available_to, note')
        .eq('vehicle_id', vehicleId)
        .order('available_from'),
      supabase
        .from('vehicle_blocked_dates')
        .select('id, blocked_date, reason')
        .eq('vehicle_id', vehicleId)
        .order('blocked_date'),
    ]);
    setWindows(w ?? []);
    setBlocked(b ?? []);
    setLoadingData(false);
  }, [vehicleId]);

  useEffect(() => { load(); }, [load]);

  const addWindow = async () => {
    setWindowError(null);
    if (!newFrom) return setWindowError('Please set a start date.');
    if (!newTo) return setWindowError('Please set an end date.');
    if (newTo < newFrom) return setWindowError('End date must be after start date.');
    setSavingWindow(true);
    const { error } = await supabase.from('vehicle_availability').insert({
      vehicle_id: vehicleId,
      available_from: newFrom,
      available_to: newTo,
      note: newNote.trim() || null,
    });
    setSavingWindow(false);
    if (error) return setWindowError(error.message);
    setNewFrom(''); setNewTo(''); setNewNote('');
    load();
  };

  const deleteWindow = async (id: string) => {
    setDeletingId(id);
    await supabase.from('vehicle_availability').delete().eq('id', id);
    setDeletingId(null);
    load();
  };

  const addBlocked = async () => {
    setBlockError(null);
    if (!newBlockDate) return setBlockError('Please select a date.');
    setSavingBlock(true);
    const { error } = await supabase.from('vehicle_blocked_dates').insert({
      vehicle_id: vehicleId,
      blocked_date: newBlockDate,
      reason: newBlockReason.trim() || null,
    });
    setSavingBlock(false);
    if (error) return setBlockError(error.message === 'duplicate key value violates unique constraint "idx_vehicle_blocked_dates_unique"'
      ? 'That date is already blocked.' : error.message);
    setNewBlockDate(''); setNewBlockReason('');
    load();
  };

  const deleteBlocked = async (id: string) => {
    setDeletingId(id);
    await supabase.from('vehicle_blocked_dates').delete().eq('id', id);
    setDeletingId(null);
    load();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white z-50 shadow-2xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
              <CalendarCheck size={18} className="text-blue-600" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-base leading-tight">Manage Availability</h2>
              <p className="text-xs text-slate-400 mt-0.5">Set when customers can book this vehicle</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">

          {/* ── Availability Windows ── */}
          <div className="px-6 py-6 border-b border-slate-100">
            <div className="flex items-center gap-2 mb-1">
              <CalendarCheck size={15} className="text-green-600" />
              <h3 className="font-bold text-slate-800 text-sm">Available Date Ranges</h3>
            </div>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Define specific periods when your vehicle is open for booking. If no ranges are set, the vehicle is considered always available.
            </p>

            {loadingData ? (
              <div className="flex justify-center py-6">
                <Loader2 size={20} className="animate-spin text-slate-300" />
              </div>
            ) : windows.length === 0 ? (
              <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl mb-4">
                <Info size={14} className="text-amber-500 flex-shrink-0" />
                <p className="text-xs text-amber-700">No availability windows set — vehicle is bookable any time.</p>
              </div>
            ) : (
              <div className="space-y-2 mb-4">
                {windows.map((w) => (
                  <div key={w.id} className="flex items-center justify-between gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0 mt-1.5" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800">
                          {fmt(w.available_from)} <span className="text-slate-400 font-normal">→</span> {fmt(w.available_to)}
                        </p>
                        {w.note && (
                          <p className="text-xs text-slate-500 truncate mt-0.5">{w.note}</p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteWindow(w.id)}
                      disabled={deletingId === w.id}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
                    >
                      {deletingId === w.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add window form */}
            <div className="bg-slate-50 rounded-xl p-4 space-y-3 border border-slate-200">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Add New Range</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">From</label>
                  <input
                    type="date" min={today} value={newFrom}
                    onChange={(e) => { setNewFrom(e.target.value); if (newTo && e.target.value > newTo) setNewTo(''); }}
                    className="w-full px-3 py-2 text-sm font-medium bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">To</label>
                  <input
                    type="date" min={newFrom || today} value={newTo}
                    onChange={(e) => setNewTo(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-medium bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Note <span className="font-normal normal-case">(optional)</span></label>
                <input
                  type="text" placeholder='e.g. "Summer season", "After renovation"'
                  value={newNote} onChange={(e) => setNewNote(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-medium bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                />
              </div>
              {windowError && (
                <p className="text-xs text-red-600 flex items-center gap-1.5">
                  <AlertCircle size={12} /> {windowError}
                </p>
              )}
              <button
                onClick={addWindow}
                disabled={savingWindow}
                className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white py-2.5 rounded-lg text-sm font-semibold transition-colors"
              >
                {savingWindow ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Add Range
              </button>
            </div>
          </div>

          {/* ── Blocked Dates ── */}
          <div className="px-6 py-6">
            <div className="flex items-center gap-2 mb-1">
              <CalendarX size={15} className="text-red-500" />
              <h3 className="font-bold text-slate-800 text-sm">Blocked Dates</h3>
            </div>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Block specific days for maintenance, personal use, or holidays. Customers cannot book on these dates.
            </p>

            {loadingData ? (
              <div className="flex justify-center py-6">
                <Loader2 size={20} className="animate-spin text-slate-300" />
              </div>
            ) : blocked.length === 0 ? (
              <p className="text-xs text-slate-400 italic mb-4">No blocked dates — all days within availability are open.</p>
            ) : (
              <div className="space-y-2 mb-4">
                {blocked.map((b) => (
                  <div key={b.id} className="flex items-center justify-between gap-3 p-3 bg-red-50 border border-red-200 rounded-xl">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0 mt-1.5" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800">{fmt(b.blocked_date)}</p>
                        {b.reason && (
                          <p className="text-xs text-slate-500 truncate mt-0.5">{b.reason}</p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteBlocked(b.id)}
                      disabled={deletingId === b.id}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-100 transition-colors flex-shrink-0"
                    >
                      {deletingId === b.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add blocked date form */}
            <div className="bg-slate-50 rounded-xl p-4 space-y-3 border border-slate-200">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Block a Date</p>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Date</label>
                <input
                  type="date" min={today} value={newBlockDate}
                  onChange={(e) => setNewBlockDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-medium bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Reason <span className="font-normal normal-case">(optional)</span></label>
                <input
                  type="text" placeholder='e.g. "Maintenance", "Personal use"'
                  value={newBlockReason} onChange={(e) => setNewBlockReason(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-medium bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                />
              </div>
              {blockError && (
                <p className="text-xs text-red-600 flex items-center gap-1.5">
                  <AlertCircle size={12} /> {blockError}
                </p>
              )}
              <button
                onClick={addBlocked}
                disabled={savingBlock}
                className="w-full flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white py-2.5 rounded-lg text-sm font-semibold transition-colors"
              >
                {savingBlock ? <Loader2 size={14} className="animate-spin" /> : <CalendarOff size={14} />}
                Block This Date
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50">
          <button
            onClick={onClose}
            className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-xl text-sm font-bold transition-colors"
          >
            <Save size={14} /> Done
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Availability Summary Badge ───────────────────────────────────────────────
function AvailabilitySummary({ vehicleId }: { vehicleId: string }) {
  const [windows, setWindows] = useState<AvailabilityWindow[]>([]);
  const [blockedCount, setBlockedCount] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function fetch() {
      const [{ data: w }, { data: b }] = await Promise.all([
        supabase.from('vehicle_availability').select('id, available_from, available_to, note').eq('vehicle_id', vehicleId).order('available_from').limit(2),
        supabase.from('vehicle_blocked_dates').select('id', { count: 'exact', head: true }).eq('vehicle_id', vehicleId),
      ]);
      setWindows(w ?? []);
      setBlockedCount((b as any)?.length ?? 0);
      setLoaded(true);
    }
    fetch();
  }, [vehicleId]);

  if (!loaded) return <div className="h-5 w-24 bg-slate-100 rounded animate-pulse" />;

  return (
    <div className="flex flex-wrap items-center gap-2 mt-2">
      {windows.length === 0 ? (
        <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
          <Info size={11} /> Always available
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full font-medium">
          <Calendar size={11} /> {windows.length} window{windows.length !== 1 ? 's' : ''} set
        </span>
      )}
      {blockedCount > 0 && (
        <span className="inline-flex items-center gap-1 text-xs text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full font-medium">
          <CalendarOff size={11} /> {blockedCount} blocked
        </span>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function MyVehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('All Vehicles');
  const [brokenImages, setBrokenImages] = useState<Set<string>>(new Set());
  const [availabilityVehicleId, setAvailabilityVehicleId] = useState<string | null>(null);

  useEffect(() => {
    const fetchVehicles = async () => {
      const storedEmail = localStorage.getItem('user_email');
      if (!storedEmail) { window.location.href = '/sign-in'; return; }

      try {
        const { data: owner, error: ownerErr } = await supabase
          .from('users').select('id').eq('email', storedEmail.trim().toLowerCase()).single();

        if (ownerErr || !owner) throw new Error('User not found');

        const { data, error } = await supabase
          .from('vehicles')
          .select(`id, make, model, type, year, license_plate, price_per_day, status, location_city, location_state, vehicle_images (url, is_primary)`)
          .eq('owner_id', owner.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        setVehicles((data ?? []).map((v: any) => ({
          ...v,
          vehicle_images: Array.isArray(v.vehicle_images) ? v.vehicle_images : [],
        })) as Vehicle[]);
      } catch (err: any) {
        setError(err.message || 'Failed to load vehicles');
      } finally {
        setLoading(false);
      }
    };

    fetchVehicles();
  }, []);

  const filteredVehicles = vehicles.filter((v) => {
    const s = searchTerm.toLowerCase();
    const matchesSearch =
      (v.make?.toLowerCase() ?? '').includes(s) ||
      (v.model?.toLowerCase() ?? '').includes(s) ||
      (v.license_plate?.toLowerCase() ?? '').includes(s);
    if (!matchesSearch) return false;
    switch (activeTab) {
      case 'Available':   return v.status === 'available';
      case 'Rented':      return v.status === 'rented';
      case 'Maintenance': return v.status === 'maintenance';
      case 'Pending':     return v.status === 'pending_approval';
      default:            return true;
    }
  });

  const getStatusBadge = (status: string) => {
    const map: Record<string, { icon: React.ReactNode; label: string; cls: string }> = {
      available:        { icon: <CheckCircle2 size={13} />, label: 'Available',    cls: 'bg-green-100 text-green-800 border-green-200' },
      maintenance:      { icon: <Wrench size={13} />,       label: 'Maintenance',  cls: 'bg-orange-100 text-orange-800 border-orange-200' },
      pending_approval: { icon: <Clock size={13} />,        label: 'Pending',      cls: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
      rented:           { icon: <Car size={13} />,          label: 'Rented',       cls: 'bg-blue-100 text-blue-800 border-blue-200' },
    };
    const { icon, label, cls } = map[status] ?? { icon: null, label: status, cls: 'bg-slate-100 text-slate-700 border-slate-200' };
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${cls}`}>
        {icon} {label}
      </span>
    );
  };

  const getBestImageUrl = (images?: VehicleImage[] | null): string | null => {
    if (!images?.length) return null;
    const valid = images.filter((img) => img.url && !brokenImages.has(img.url));
    return valid.find((i) => i.is_primary)?.url ?? valid[0]?.url ?? null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500">
          <Loader2 size={22} className="animate-spin" /> Loading your vehicles…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-red-600 flex items-center gap-2"><AlertCircle size={20} /> {error}</div>
      </div>
    );
  }

  const tabs = ['All Vehicles', 'Available', 'Rented', 'Maintenance', 'Pending'];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">My Vehicles</h1>
            <p className="text-slate-500 mt-1 text-sm">Manage your fleet, set availability, and update details.</p>
          </div>
          <Link
            href="/owner-dashboard/add-vehicles"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors shadow-sm shadow-blue-500/20"
          >
            <Plus size={16} /> Add New Vehicle
          </Link>
        </div>

        {/* Search & Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search by make, model or plate…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none bg-white"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors border ${
                  activeTab === tab
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Empty state */}
        {filteredVehicles.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-14 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Car className="text-slate-300" size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">No vehicles found</h3>
            <p className="text-slate-500 text-sm mb-6">
              {activeTab === 'All Vehicles'
                ? "You haven't added any vehicles yet or none match your search."
                : `No vehicles with "${activeTab}" status match your search.`}
            </p>
            {activeTab === 'All Vehicles' && (
              <Link
                href="/owner-dashboard/add-vehicles"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors"
              >
                <Plus size={16} /> Add Your First Vehicle
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredVehicles.map((vehicle) => {
              const imageUrl = getBestImageUrl(vehicle.vehicle_images);
              return (
                <div
                  key={vehicle.id}
                  className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:border-slate-300 hover:shadow-sm transition-all duration-200"
                >
                  <div className="flex flex-col sm:flex-row">
                    {/* Image */}
                    <div className="sm:w-44 h-44 relative flex-shrink-0 bg-slate-50">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={`${vehicle.make} ${vehicle.model}`}
                          className="absolute inset-0 w-full h-full object-cover"
                          onError={() => setBrokenImages((prev) => new Set(prev).add(imageUrl))}
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Car size={40} className="text-slate-200" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="p-5 flex-1 flex flex-col min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-1">
                        <div className="min-w-0">
                          <h3 className="font-bold text-lg text-slate-900 truncate leading-tight">
                            {vehicle.year && <span className="text-slate-400 font-medium">{vehicle.year} · </span>}
                            {vehicle.make} {vehicle.model}
                          </h3>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            {vehicle.type && (
                              <span className="text-xs text-slate-400 font-medium">{vehicle.type}</span>
                            )}
                            <span className="text-xs text-slate-400">#{vehicle.license_plate}</span>
                          </div>
                        </div>
                        <div className="flex-shrink-0">{getStatusBadge(vehicle.status)}</div>
                      </div>

                      {/* Location */}
                      {(vehicle.location_city || vehicle.location_state) && (
                        <div className="flex items-center gap-1 text-xs text-slate-500 mt-1 mb-1">
                          <MapPin size={12} className="flex-shrink-0" />
                          <span className="truncate">
                            {vehicle.location_city || ''}{vehicle.location_state ? `, ${vehicle.location_state}` : ''}
                          </span>
                        </div>
                      )}

                      {/* Availability summary */}
                      <AvailabilitySummary vehicleId={vehicle.id} />

                      {/* Footer row */}
                      <div className="mt-auto pt-3 flex items-center justify-between gap-3 flex-wrap">
                        <div className="text-xl font-bold text-slate-900">
                          {vehicle.price_per_day ? `$${vehicle.price_per_day.toFixed(2)}` : '—'}
                          <span className="text-sm font-normal text-slate-400 ml-1">/ day</span>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Manage Availability */}
                          <button
                            onClick={() => setAvailabilityVehicleId(vehicle.id)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold transition-colors border border-blue-200 hover:border-blue-300"
                          >
                            <Calendar size={13} /> Availability
                          </button>

                          {/* Edit */}
                          <Link
                            href={`/owner-dashboard/edit-vehicles/${vehicle.id}`}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors border border-slate-200"
                          >
                            <Pencil size={13} /> Edit
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Availability side panel */}
      {availabilityVehicleId && (
        <AvailabilityPanel
          vehicleId={availabilityVehicleId}
          onClose={() => setAvailabilityVehicleId(null)}
        />
      )}
    </div>
  );
}