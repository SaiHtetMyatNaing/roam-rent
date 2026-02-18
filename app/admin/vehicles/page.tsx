'use client';
import React, { useState, useEffect } from 'react';
import {
  Car, Search, Eye, CheckCircle2, XCircle, Loader2, AlertCircle,
  User, MapPin, DollarSign, Calendar, Fuel, Gauge, Users, X,
  Image as ImageIcon, Filter,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

type Vehicle = {
  id: string;
  make: string;
  model: string;
  year: number;
  type: 'Car' | 'SUV' | 'Motorbike' | 'Van' | 'Luxury';
  license_plate: string;
  color?: string;
  seating_capacity?: number;
  drivetrain?: string;
  fuel_type?: string;
  top_speed_mph?: number;
  range_efficiency?: string;
  description?: string;
  price_per_day: number;
  location_city?: string;
  location_state?: string;
  status: string;
  created_at: string;
  owner: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    avatar_url?: string | null;
  } | null;
  images?: Array<{ url: string; is_primary: boolean }> | null;
  features?: Array<{ name: string }> | null;
  approved_by?: { first_name: string; last_name: string } | null;
};

const STATUS_COLORS: Record<string, string> = {
  pending_approval: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  available:        'bg-green-100 text-green-800 border-green-300',
  rented:           'bg-blue-100 text-blue-800 border-blue-300',
  maintenance:      'bg-orange-100 text-orange-800 border-orange-300',
  rejected:         'bg-red-100 text-red-800 border-red-300',
};

const STATUS_LABELS: Record<string, string> = {
  pending_approval: 'Pending',
  available:        'Approved',
  rented:           'Rented',
  maintenance:      'Maintenance',
  rejected:         'Rejected',
};

const TABS = ['All', 'Pending', 'Approved', 'Rejected'] as const;
type Tab = typeof TABS[number];

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function timeAgo(d: string) {
  const hours = Math.floor((Date.now() - new Date(d).getTime()) / 3600000);
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days < 30 ? `${days}d ago` : formatDate(d);
}

function normalizeVehicle(data: any): Vehicle {
  const owner = Array.isArray(data?.owner) ? (data.owner[0] ?? null) : (data?.owner ?? null);
  return {
    ...data,
    owner,
    images: Array.isArray(data?.images) ? data.images : (data?.images ?? null),
    features: Array.isArray(data?.features) ? data.features : (data?.features ?? null),
  };
}

function tabMatchesStatus(tab: Tab, status: string): boolean {
  switch (tab) {
    case 'All':      return true;
    case 'Pending':  return status === 'pending_approval';
    case 'Approved': return status === 'available';
    case 'Rejected': return status === 'rejected' || status === 'maintenance';
    default:         return true;
  }
}

// ─── Reject Confirmation Modal ────────────────────────────────────────────────
function RejectModal({
  vehicle,
  onClose,
  onSuccess,
}: {
  vehicle: Vehicle;
  onClose: () => void;
  onSuccess: (reason: string) => void;
}) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReject = async () => {
    if (!reason.trim()) { setError('Please provide a rejection reason'); return; }
    setLoading(true);
    // Store status as 'maintenance' or add a 'rejected' status to your schema
    const { error: err } = await supabase
      .from('vehicles')
      .update({ status: 'maintenance' })
      .eq('id', vehicle.id);
    setLoading(false);
    if (err) setError(err.message);
    else onSuccess(reason);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6" onClick={e => e.stopPropagation()}>
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <XCircle size={28} className="text-red-600" />
        </div>
        <h3 className="font-bold text-gray-900 text-xl mb-2 text-center">Reject Vehicle?</h3>
        <p className="text-sm text-gray-500 mb-4 text-center">
          {vehicle.make} {vehicle.model} ({vehicle.year}) by {vehicle.owner?.first_name} {vehicle.owner?.last_name}
        </p>
        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Rejection Reason <span className="text-red-600">*</span>
          </label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none resize-none text-sm"
            placeholder="e.g. Missing insurance documents, unclear photos, damaged vehicle..."
          />
        </div>
        {error && (
          <p className="text-sm text-red-600 mb-4 flex items-center justify-center gap-2">
            <AlertCircle size={15} /> {error}
          </p>
        )}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleReject}
            disabled={loading || !reason.trim()}
            className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white py-3 rounded-xl font-medium text-sm transition-colors shadow-sm"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <XCircle size={15} />}
            {loading ? 'Rejecting…' : 'Reject'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Vehicle Detail Panel ─────────────────────────────────────────────────────
function VehiclePanel({
  vehicle,
  adminId,
  onClose,
  onStatusChange,
}: {
  vehicle: Vehicle;
  adminId: string;
  onClose: () => void;
  onStatusChange: (id: string, newStatus: string) => void;
}) {
  const [showReject, setShowReject] = useState(false);
  const [approving, setApproving] = useState(false);

  const isPending  = vehicle.status === 'pending_approval';
  const isApproved = vehicle.status === 'available';
  const isRejected = vehicle.status === 'maintenance' || vehicle.status === 'rejected';

  const handleApprove = async () => {
    setApproving(true);
    const { error } = await supabase
      .from('vehicles')
      .update({ status: 'available', approved_by: adminId })
      .eq('id', vehicle.id);
    setApproving(false);
    if (!error) {
      onStatusChange(vehicle.id, 'available');
      onClose();
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex" onClick={onClose}>
        <div className="flex-1 bg-black/50 backdrop-blur-sm" />
        <div
          className="w-full max-w-lg bg-white shadow-2xl overflow-y-auto flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          {/* Panel header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 sticky top-0 bg-white z-10">
            <h3 className="font-bold text-gray-900 text-lg">Vehicle Details</h3>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
              <X size={18} className="text-gray-500" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Main info */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-5 border border-blue-100">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-xl font-bold text-gray-900">
                    {vehicle.make} {vehicle.model}
                  </h4>
                  <p className="text-sm text-gray-600">{vehicle.year} • {vehicle.type}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${STATUS_COLORS[vehicle.status]}`}>
                  {STATUS_LABELS[vehicle.status] ?? vehicle.status}
                </span>
              </div>
              <p className="mt-3 text-sm text-gray-700 font-medium">
                ${vehicle.price_per_day.toFixed(2)} <span className="text-gray-500">/ day</span>
              </p>
            </div>

            {/* Owner */}
            {vehicle.owner && (
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <p className="text-xs font-bold text-gray-500 uppercase mb-3">Owner</p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden border border-blue-200 flex-shrink-0">
                    {vehicle.owner.avatar_url ? (
                      <img src={vehicle.owner.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User size={20} className="text-blue-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">
                      {vehicle.owner.first_name} {vehicle.owner.last_name}
                    </p>
                    <p className="text-sm text-gray-600">{vehicle.owner.email}</p>
                    {vehicle.owner.phone && <p className="text-xs text-gray-500 mt-0.5">{vehicle.owner.phone}</p>}
                  </div>
                </div>
              </div>
            )}

            {/* Images */}
            {vehicle.images && vehicle.images.length > 0 && (
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1.5">
                  <ImageIcon size={13} /> Photos
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {vehicle.images.map((img, i) => (
                    <div
                      key={i}
                      className={`rounded-lg overflow-hidden border-2 ${img.is_primary ? 'border-blue-500 shadow-md' : 'border-gray-200'}`}
                    >
                      <img src={img.url} alt="" className="w-full h-28 object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Specs */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              {vehicle.color && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-gray-500 text-xs">Color</p>
                  <p className="font-medium mt-0.5">{vehicle.color}</p>
                </div>
              )}
              {vehicle.seating_capacity && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-gray-500 text-xs flex items-center gap-1"><Users size={12} /> Seats</p>
                  <p className="font-medium mt-0.5">{vehicle.seating_capacity}</p>
                </div>
              )}
              {vehicle.fuel_type && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-gray-500 text-xs flex items-center gap-1"><Fuel size={12} /> Fuel</p>
                  <p className="font-medium mt-0.5">{vehicle.fuel_type}</p>
                </div>
              )}
              {vehicle.drivetrain && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-gray-500 text-xs">Drivetrain</p>
                  <p className="font-medium mt-0.5">{vehicle.drivetrain}</p>
                </div>
              )}
              {vehicle.top_speed_mph && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-gray-500 text-xs flex items-center gap-1"><Gauge size={12} /> Top Speed</p>
                  <p className="font-medium mt-0.5">{vehicle.top_speed_mph} mph</p>
                </div>
              )}
            </div>

            {/* Location & description */}
            {(vehicle.location_city || vehicle.location_state || vehicle.description) && (
              <div className="space-y-3">
                {(vehicle.location_city || vehicle.location_state) && (
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <MapPin size={15} className="text-gray-400 flex-shrink-0" />
                    {vehicle.location_city}{vehicle.location_state && `, ${vehicle.location_state}`}
                  </div>
                )}
                {vehicle.description && (
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <p className="text-xs font-bold text-gray-500 uppercase mb-2">Description</p>
                    <p className="text-gray-700 whitespace-pre-line text-sm">{vehicle.description}</p>
                  </div>
                )}
              </div>
            )}

            {/* Features */}
            {vehicle.features && vehicle.features.length > 0 && (
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase mb-2">Features</p>
                <div className="flex flex-wrap gap-2">
                  {vehicle.features.map((f, i) => (
                    <span key={i} className="px-3 py-1 bg-blue-50 text-blue-700 text-xs rounded-full border border-blue-100">
                      {f.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* ── Actions: only shown for pending ── */}
            {isPending && (
              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button
                  onClick={() => setShowReject(true)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl font-semibold border border-red-200 transition-colors text-sm"
                >
                  <XCircle size={15} /> Reject
                </button>
                <button
                  onClick={handleApprove}
                  disabled={approving}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white rounded-xl font-semibold shadow-sm transition-colors text-sm"
                >
                  {approving ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                  {approving ? 'Approving…' : 'Approve'}
                </button>
              </div>
            )}

            {/* Status pill for already-actioned vehicles */}
            {(isApproved || isRejected) && (
              <div className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold border ${
                isApproved
                  ? 'bg-green-50 text-green-700 border-green-200'
                  : 'bg-red-50 text-red-700 border-red-200'
              }`}>
                {isApproved
                  ? <><CheckCircle2 size={15} /> This vehicle has been approved</>
                  : <><XCircle size={15} /> This vehicle has been rejected</>}
              </div>
            )}
          </div>
        </div>
      </div>

      {showReject && (
        <RejectModal
          vehicle={vehicle}
          onClose={() => setShowReject(false)}
          onSuccess={() => {
            setShowReject(false);
            onStatusChange(vehicle.id, 'maintenance');
            onClose();
          }}
        />
      )}
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminVehicleApprovalPage() {
  const [vehicles, setVehicles]   = useState<Vehicle[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [adminId, setAdminId]     = useState('');
  const [selected, setSelected]   = useState<Vehicle | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('Pending');

  useEffect(() => {
    const init = async () => {
      const email = localStorage.getItem('user_email');
      if (!email) { window.location.href = '/sign-in'; return; }

      const { data: admin } = await supabase
        .from('users').select('id, role').eq('email', email.trim().toLowerCase()).single();

      if (!admin || admin.role !== 'admin') { window.location.href = '/'; return; }
      setAdminId(admin.id);

      // Fetch ALL vehicles (not just pending) so admin can review history
      const { data, error: err } = await supabase
        .from('vehicles')
        .select(`
          id, make, model, year, type, license_plate, color, seating_capacity,
          drivetrain, fuel_type, top_speed_mph, range_efficiency, description,
          price_per_day, location_city, location_state, status, created_at,
          owner:owner_id ( id, first_name, last_name, email, phone, avatar_url ),
          images:vehicle_images ( url, is_primary ),
          features:vehicle_features ( name )
        `)
        .in('status', ['pending_approval', 'available', 'maintenance', 'rejected'])
        .order('created_at', { ascending: false });

      if (err) setError(err.message);
      else setVehicles((data ?? []).map(normalizeVehicle));
      setLoading(false);
    };

    init();
  }, []);

  /** Update a single vehicle's status in local state without removing it */
  const handleStatusChange = (id: string, newStatus: string) => {
    setVehicles(prev =>
      prev.map(v => v.id === id ? { ...v, status: newStatus } : v)
    );
    // Also update the selected vehicle if it's still open
    setSelected(prev => prev?.id === id ? { ...prev, status: newStatus } : prev);
  };

  const counts = {
    all:      vehicles.length,
    pending:  vehicles.filter(v => v.status === 'pending_approval').length,
    approved: vehicles.filter(v => v.status === 'available').length,
    rejected: vehicles.filter(v => v.status === 'maintenance' || v.status === 'rejected').length,
  };

  const filtered = vehicles.filter(v => {
    const s = searchTerm.toLowerCase();
    const matchSearch =
      `${v.make} ${v.model}`.toLowerCase().includes(s) ||
      v.license_plate.toLowerCase().includes(s) ||
      `${v.owner?.first_name} ${v.owner?.last_name}`.toLowerCase().includes(s) ||
      (v.owner?.email ?? '').toLowerCase().includes(s);
    const matchTab = tabMatchesStatus(activeTab, v.status);
    return matchSearch && matchTab;
  });

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-blue-700 font-medium">Loading vehicles…</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-800 to-blue-900 text-white px-6 py-10 shadow-lg">
        <div className="max-w-6xl mx-auto">
          <p className="text-indigo-200 text-sm font-medium uppercase tracking-wide mb-2">Admin Panel</p>
          <h1 className="text-4xl font-bold mb-6">Vehicle Approval</h1>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total Submitted', value: counts.all },
              { label: 'Pending Review',  value: counts.pending,  alert: counts.pending > 0 },
              { label: 'Approved',        value: counts.approved },
              { label: 'Rejected',        value: counts.rejected },
            ].map(s => (
              <div
                key={s.label}
                className={`bg-white/10 border border-white/20 backdrop-blur-sm rounded-xl p-4 text-center transition-all hover:bg-white/20 ${
                  s.alert ? 'ring-2 ring-amber-300 ring-offset-2 ring-offset-indigo-900' : ''
                }`}
              >
                <p className="text-3xl font-bold">{s.value}</p>
                <p className="text-xs text-indigo-200 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white border-b border-gray-200 shadow-sm px-6 py-4 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
            <input
              type="text"
              placeholder="Search make, model, plate, owner…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
            />
          </div>

          {/* Tabs */}
          <div className="flex gap-2 flex-wrap">
            {TABS.map(tab => {
              const count = tab === 'All' ? counts.all
                : tab === 'Pending'  ? counts.pending
                : tab === 'Approved' ? counts.approved
                : counts.rejected;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {tab}
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                    activeTab === tab ? 'bg-white/20 text-white' : 'bg-white text-gray-600 border border-gray-200'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* List */}
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 flex items-center gap-2 text-sm">
            <AlertCircle size={15} /> {error}
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-14 text-center">
            <Car className="mx-auto text-gray-200 mb-4" size={64} strokeWidth={1} />
            <p className="text-gray-500 text-lg font-medium">No vehicles found</p>
            <p className="text-gray-400 text-sm mt-1">
              {activeTab === 'Pending' ? 'All caught up — no pending vehicles.' : `No ${activeTab.toLowerCase()} vehicles match your search.`}
            </p>
          </div>
        ) : (
          filtered.map(vehicle => (
            <div
              key={vehicle.id}
              onClick={() => setSelected(vehicle)}
              className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex flex-col sm:flex-row sm:items-center gap-4 cursor-pointer hover:shadow-md hover:border-blue-200 transition-all group"
            >
              {/* Thumbnail */}
              <div className="w-24 h-20 sm:w-28 sm:h-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200">
                {vehicle.images?.length ? (
                  <img
                    src={vehicle.images.find(i => i.is_primary)?.url ?? vehicle.images[0].url}
                    alt={`${vehicle.make} ${vehicle.model}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Car size={28} className="text-gray-300" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors truncate">
                      {vehicle.make} {vehicle.model}{' '}
                      <span className="text-gray-400 font-normal">({vehicle.year})</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                      <User size={12} />
                      {vehicle.owner?.first_name} {vehicle.owner?.last_name} · {vehicle.owner?.email}
                    </p>
                  </div>

                  <span className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold border ${STATUS_COLORS[vehicle.status]}`}>
                    {STATUS_LABELS[vehicle.status] ?? vehicle.status}
                  </span>
                </div>

                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <DollarSign size={12} /> ${vehicle.price_per_day.toFixed(2)}/day
                  </span>
                  {vehicle.location_city && (
                    <span className="flex items-center gap-1">
                      <MapPin size={12} /> {vehicle.location_city}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar size={12} /> {timeAgo(vehicle.created_at)}
                  </span>
                </div>

                {vehicle.description && (
                  <p className="text-xs text-gray-500 mt-1.5 line-clamp-1">{vehicle.description}</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {selected && (
        <VehiclePanel
          vehicle={selected}
          adminId={adminId}
          onClose={() => setSelected(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
}