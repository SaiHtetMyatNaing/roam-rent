'use client';

import React, { useState, useEffect } from 'react';
import {
  Users, Search, CheckCircle2, XCircle, Clock, Eye,
  User, AlertCircle, Loader2, X, Shield, Car,
  Mail, Phone, MapPin, Calendar, Ban, UserCheck,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

type UserStatus = 'active' | 'suspended' | 'pending';
type UserRole = 'admin' | 'customer' | 'vehicle-owner';

type AppUser = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  status: UserStatus;
  avatar_url: string | null;
  bio: string | null;
  address_city: string | null;
  address_country: string | null;
  created_at: string;
};

const STATUS_CONFIG: Record<UserStatus, { label: string; textColor: string; bgColor: string; borderColor: string; icon: React.ReactNode }> = {
  active:    { label: 'Active',    textColor: 'text-blue-700',   bgColor: 'bg-blue-50',   borderColor: 'border-blue-200',   icon: <CheckCircle2 size={11} /> },
  suspended: { label: 'Suspended', textColor: 'text-indigo-700', bgColor: 'bg-indigo-50', borderColor: 'border-indigo-200', icon: <Ban size={11} /> },
  pending:   { label: 'Pending',   textColor: 'text-sky-700',    bgColor: 'bg-sky-50',    borderColor: 'border-sky-200',    icon: <Clock size={11} /> },
};

const ROLE_CONFIG: Record<UserRole, { label: string; textColor: string; bgColor: string }> = {
  admin:          { label: 'Admin',          textColor: 'text-blue-800', bgColor: 'bg-blue-100' },
  customer:       { label: 'Customer',       textColor: 'text-blue-700', bgColor: 'bg-blue-50' },
  'vehicle-owner':{ label: 'Vehicle Owner',  textColor: 'text-sky-700',  bgColor: 'bg-sky-50' },
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ─── User Detail Panel ─────────────────────────────────────────────────────────
function UserPanel({
  user,
  adminId,
  onClose,
  onUpdate,
}: {
  user: AppUser;
  adminId: string;
  onClose: () => void;
  onUpdate: (id: string, changes: Partial<AppUser>) => void;
}) {
  const [status, setStatus] = useState<UserStatus>(user.status);
  const [role, setRole] = useState<UserRole>(user.role);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [stats, setStats] = useState<{ bookings: number; vehicles: number } | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      const [{ count: bookings }, { count: vehicles }] = await Promise.all([
        supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('customer_id', user.id),
        supabase.from('vehicles').select('*', { count: 'exact', head: true }).eq('owner_id', user.id),
      ]);
      setStats({ bookings: bookings ?? 0, vehicles: vehicles ?? 0 });
    };
    fetchStats();
  }, [user.id]);

  const hasChanges = status !== user.status || role !== user.role;

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    const { error: err } = await supabase
      .from('users')
      .update({ status, role, updated_at: new Date().toISOString() })
      .eq('id', user.id);
    setLoading(false);
    if (err) { setError(err.message); }
    else {
      setSaved(true);
      onUpdate(user.id, { status, role });
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const sCfg = STATUS_CONFIG[status];
  const rCfg = ROLE_CONFIG[role];

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="flex-1 bg-black/50 backdrop-blur-sm" />
      <div className="w-full max-w-md bg-white shadow-2xl overflow-y-auto flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h3 className="font-bold text-gray-900">User Details</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-5 flex-1">
          {/* Avatar & name */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 overflow-hidden border-2 border-blue-200">
              {user.avatar_url
                ? <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                : <User size={28} className="text-blue-500" />
              }
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{user.first_name} {user.last_name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${rCfg.bgColor} ${rCfg.textColor}`}>{rCfg.label}</span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${sCfg.bgColor} ${sCfg.textColor} ${sCfg.borderColor}`}>
                  {sCfg.icon} {sCfg.label}
                </span>
              </div>
            </div>
          </div>

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-blue-50 rounded-xl p-3 text-center border border-blue-100">
                <p className="text-2xl font-bold text-blue-800">{stats.bookings}</p>
                <p className="text-xs text-blue-600 mt-0.5">Bookings</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-3 text-center border border-blue-200">
                <p className="text-2xl font-bold text-blue-800">{stats.vehicles}</p>
                <p className="text-xs text-blue-600 mt-0.5">Vehicles Listed</p>
              </div>
            </div>
          )}

          {/* Contact Info */}
          <div className="bg-gray-50 rounded-xl border border-gray-100 p-4 space-y-2.5 text-sm">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Contact</p>
            <div className="flex items-center gap-2.5 text-gray-700">
              <Mail size={14} className="text-gray-400 flex-shrink-0" />
              <span>{user.email}</span>
            </div>
            {user.phone && (
              <div className="flex items-center gap-2.5 text-gray-700">
                <Phone size={14} className="text-gray-400 flex-shrink-0" />
                <span>{user.phone}</span>
              </div>
            )}
            {(user.address_city || user.address_country) && (
              <div className="flex items-center gap-2.5 text-gray-700">
                <MapPin size={14} className="text-gray-400 flex-shrink-0" />
                <span>{[user.address_city, user.address_country].filter(Boolean).join(', ')}</span>
              </div>
            )}
            <div className="flex items-center gap-2.5 text-gray-700">
              <Calendar size={14} className="text-gray-400 flex-shrink-0" />
              <span>Joined {formatDate(user.created_at)}</span>
            </div>
          </div>

          {user.bio && (
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Bio</p>
              <p className="text-sm text-gray-700 bg-gray-50 rounded-xl border border-gray-100 p-4 leading-relaxed">{user.bio}</p>
            </div>
          )}

          {/* Admin Controls */}
          <div className="bg-blue-50 rounded-xl border border-blue-200 p-5 space-y-4">
            <p className="text-xs font-bold text-blue-700 uppercase tracking-wide flex items-center gap-1.5">
              <Shield size={13} /> Admin Controls
            </p>

            <div>
              <label className="block text-xs text-blue-600 mb-1.5">Account Status</label>
              <div className="grid grid-cols-3 gap-2">
                {(['active', 'pending', 'suspended'] as UserStatus[]).map(s => {
                  const cfg = STATUS_CONFIG[s];
                  return (
                    <button key={s} onClick={() => setStatus(s)}
                      className={`py-2 rounded-lg text-xs font-semibold border transition-all ${
                        status === s ? `${cfg.bgColor} ${cfg.textColor} ${cfg.borderColor}` : 'bg-white border-blue-200 text-blue-600 hover:border-blue-300'
                      }`}>
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs text-blue-600 mb-1.5">Role</label>
              <div className="grid grid-cols-3 gap-2">
                {(['customer', 'vehicle-owner', 'admin'] as UserRole[]).map(r => {
                  const cfg = ROLE_CONFIG[r];
                  return (
                    <button key={r} onClick={() => setRole(r)}
                      className={`py-2 rounded-lg text-xs font-semibold border transition-all ${
                        role === r ? `${cfg.bgColor} ${cfg.textColor} border-current` : 'bg-white border-blue-200 text-blue-600 hover:border-blue-300'
                      }`}>
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {error && (
              <p className="flex items-center gap-2 text-xs text-blue-700 bg-blue-50 p-2.5 rounded-lg border border-blue-100">
                <AlertCircle size={13} /> {error}
              </p>
            )}

            <button onClick={handleSave} disabled={loading || !hasChanges}
              className={`w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                saved ? 'bg-blue-600 text-white' :
                hasChanges ? 'bg-blue-700 hover:bg-blue-800 text-white shadow-sm' :
                'bg-blue-50 text-blue-300 cursor-not-allowed'
              }`}>
              {loading ? <Loader2 size={15} className="animate-spin" /> :
               saved    ? <><CheckCircle2 size={15} /> Saved!</> :
               <><UserCheck size={15} /> Save Changes</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminUsersPage() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [adminId, setAdminId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<AppUser | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | UserStatus>('all');
  const [filterRole, setFilterRole] = useState<'all' | UserRole>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const init = async () => {
      const email = localStorage.getItem('user_email');
      if (!email) { window.location.href = '/sign-in'; return; }

      const { data: admin } = await supabase.from('users').select('id, role').eq('email', email.trim().toLowerCase()).single();
      if (!admin || admin.role !== 'admin') { window.location.href = '/'; return; }
      setAdminId(admin.id);

      const { data, error: err } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, phone, role, status, avatar_url, bio, address_city, address_country, created_at')
        .order('created_at', { ascending: false });

      if (err) setError(err.message);
      else setUsers(data ?? []);
      setLoading(false);
    };
    init();
  }, []);

  const filtered = users.filter(u => {
    if (filterStatus !== 'all' && u.status !== filterStatus) return false;
    if (filterRole !== 'all' && u.role !== filterRole) return false;
    const s = searchTerm.toLowerCase();
    return (
      `${u.first_name} ${u.last_name}`.toLowerCase().includes(s) ||
      u.email.toLowerCase().includes(s)
    );
  });

  const stats = {
    total:    users.length,
    active:   users.filter(u => u.status === 'active').length,
    pending:  users.filter(u => u.status === 'pending').length,
    suspended:users.filter(u => u.status === 'suspended').length,
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-blue-700 font-medium">Loading users...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-800 to-blue-900 text-white px-6 py-10 shadow-lg">
        <div className="max-w-6xl mx-auto">
          <p className="text-blue-200 text-sm font-medium uppercase tracking-wide mb-2">Admin Panel</p>
          <h1 className="text-4xl font-bold mb-8">User Management</h1>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total Users', value: stats.total,     color: 'text-white' },
              { label: 'Active',      value: stats.active,    color: 'text-blue-200' },
              { label: 'Pending',     value: stats.pending,   color: 'text-sky-200' },
              { label: 'Suspended',   value: stats.suspended, color: 'text-indigo-200' },
            ].map(s => (
              <div key={s.label} className="bg-white/10 border border-white/10 rounded-xl p-4 text-center">
                <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-blue-200 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white border-b border-gray-200 shadow-sm px-6 py-4 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
            <input type="text" placeholder="Search by name or email..." value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all" />
          </div>
          <div className="flex gap-2 flex-wrap">
            {(['all', 'active', 'pending', 'suspended'] as const).map(s => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
                  filterStatus === s ? 'bg-blue-700 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}>
                {s === 'all' ? 'All Status' : s}
              </button>
            ))}
            <div className="w-px bg-gray-200 self-stretch mx-1" />
            {(['all', 'customer', 'vehicle-owner', 'admin'] as const).map(r => (
              <button key={r} onClick={() => setFilterRole(r)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filterRole === r ? 'bg-blue-700 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}>
                {r === 'all' ? 'All Roles' : ROLE_CONFIG[r as UserRole].label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* User List */}
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-3">
        {error && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-blue-700 flex items-center gap-2">
            <AlertCircle size={16} /> {error}
          </div>
        )}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Users className="mx-auto text-gray-300 mb-4" size={56} strokeWidth={1.2} />
            <p className="text-gray-500">No users match your filters.</p>
          </div>
        ) : filtered.map(u => {
          const sCfg = STATUS_CONFIG[u.status];
          const rCfg = ROLE_CONFIG[u.role] ?? { label: u.role, textColor: 'text-gray-700', bgColor: 'bg-gray-100' };
          return (
            <div key={u.id} onClick={() => setSelected(u)}
              className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex items-center gap-4 cursor-pointer hover:shadow-md hover:border-blue-200 transition-all group">
              <div className="w-11 h-11 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0 overflow-hidden border border-blue-100">
                {u.avatar_url
                  ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                  : <User size={18} className="text-blue-400" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors truncate">
                      {u.first_name} {u.last_name}
                    </p>
                    <p className="text-sm text-gray-500 truncate">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${rCfg.bgColor} ${rCfg.textColor}`}>
                      {rCfg.label}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${sCfg.bgColor} ${sCfg.textColor} ${sCfg.borderColor}`}>
                      {sCfg.icon} {sCfg.label}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-1">Joined {formatDate(u.created_at)}</p>
              </div>
              <Eye size={16} className="text-gray-400 group-hover:text-blue-500 transition-colors flex-shrink-0" />
            </div>
          );
        })}
      </div>

      {selected && adminId && (
        <UserPanel
          user={selected}
          adminId={adminId}
          onClose={() => setSelected(null)}
          onUpdate={(id, changes) => {
            setUsers(prev => prev.map(u => u.id === id ? { ...u, ...changes } : u));
            setSelected(prev => prev ? { ...prev, ...changes } : null);
          }}
        />
      )}
    </div>
  );
}
