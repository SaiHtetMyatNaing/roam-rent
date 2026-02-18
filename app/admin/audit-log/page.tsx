'use client';

import React, { useState, useEffect } from 'react';
import {
  ClipboardList, Search, User, Calendar, ChevronDown,
  AlertCircle, Eye, Filter, RefreshCw, Shield,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

type AuditLog = {
  id: string;
  action_type: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, any> | null;
  ip_address: string | null;
  created_at: string;
  admin: { first_name: string; last_name: string; email: string; avatar_url: string | null } | null;
};

const ACTION_COLORS: Record<string, { textColor: string; bgColor: string; borderColor: string }> = {
  CREATE:   { textColor: 'text-blue-700',   bgColor: 'bg-blue-50',   borderColor: 'border-blue-200' },
  UPDATE:   { textColor: 'text-sky-700',    bgColor: 'bg-sky-50',    borderColor: 'border-sky-200' },
  DELETE:   { textColor: 'text-indigo-700', bgColor: 'bg-indigo-50', borderColor: 'border-indigo-200' },
  APPROVE:  { textColor: 'text-blue-800',   bgColor: 'bg-blue-100',  borderColor: 'border-blue-200' },
  REJECT:   { textColor: 'text-blue-700',   bgColor: 'bg-blue-50',   borderColor: 'border-blue-200' },
  SUSPEND:  { textColor: 'text-blue-700',   bgColor: 'bg-blue-50',   borderColor: 'border-blue-200' },
  VERIFY:   { textColor: 'text-sky-700',    bgColor: 'bg-sky-50',    borderColor: 'border-sky-200' },
  LOGIN:    { textColor: 'text-blue-700',   bgColor: 'bg-blue-50',   borderColor: 'border-blue-200' },
  RESOLVE:  { textColor: 'text-indigo-700', bgColor: 'bg-indigo-50', borderColor: 'border-indigo-200' },
};

const ENTITY_ICONS: Record<string, string> = {
  user: '👤', vehicle: '🚗', booking: '📅', dispute: '⚠️',
  review: '⭐', identity_verification: '🪪', system: '⚙️',
};

function formatDate(d: string) {
  return new Date(d).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}
function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function getActionColor(action: string) {
  const key = Object.keys(ACTION_COLORS).find(k => action.toUpperCase().includes(k));
  return key ? ACTION_COLORS[key] : { textColor: 'text-gray-700', bgColor: 'bg-gray-100', borderColor: 'border-gray-200' };
}

export default function AdminAuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEntity, setFilterEntity] = useState('all');
  const [filterAction, setFilterAction] = useState('all');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  useEffect(() => {
    const init = async () => {
      const email = localStorage.getItem('user_email');
      if (!email) { window.location.href = '/sign-in'; return; }

      const { data: admin } = await supabase.from('users').select('id, role').eq('email', email.trim().toLowerCase()).single();
      if (!admin || admin.role !== 'admin') { window.location.href = '/'; return; }

      fetchLogs(0);
    };
    init();
  }, []);

  const fetchLogs = async (pageNum: number) => {
    setLoading(true);
    const { data, error: err } = await supabase
      .from('audit_logs')
      .select(`
        id, action_type, entity_type, entity_id, details, ip_address, created_at,
        admin:admin_id ( first_name, last_name, email, avatar_url )
      `)
      .order('created_at', { ascending: false })
      .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

    if (err) setError(err.message);
    else {
      const normalized = (data ?? []).map((d: any) => ({
        ...d,
        admin: Array.isArray(d.admin) ? (d.admin[0] ?? null) : (d.admin ?? null),
      }));
      if (pageNum === 0) setLogs(normalized);
      else setLogs(prev => [...prev, ...normalized]);
      setPage(pageNum);
    }
    setLoading(false);
  };

  const entityTypes = ['all', ...Array.from(new Set(logs.map(l => l.entity_type)))];
  const actionTypes = ['all', ...Array.from(new Set(logs.map(l => l.action_type)))];

  const filtered = logs.filter(l => {
    if (filterEntity !== 'all' && l.entity_type !== filterEntity) return false;
    if (filterAction !== 'all' && l.action_type !== filterAction) return false;
    const s = searchTerm.toLowerCase();
    return (
      l.action_type.toLowerCase().includes(s) ||
      l.entity_type.toLowerCase().includes(s) ||
      `${l.admin?.first_name} ${l.admin?.last_name}`.toLowerCase().includes(s) ||
      (l.entity_id?.toLowerCase() ?? '').includes(s)
    );
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-800 to-blue-900 text-white px-6 py-10 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-start justify-between">
          <div>
            <p className="text-blue-200 text-sm font-medium uppercase tracking-wide mb-2">Admin Panel</p>
            <h1 className="text-4xl font-bold mb-2">Audit Log</h1>
            <p className="text-blue-200 text-sm">{logs.length} total actions recorded</p>
          </div>
          <button onClick={() => fetchLogs(0)}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/10 px-4 py-2.5 rounded-xl text-sm font-medium transition-all mt-1">
            <RefreshCw size={15} /> Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-gray-200 shadow-sm px-6 py-4 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
            <input type="text" placeholder="Search actions, entities, admins..." value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all" />
          </div>
          <div className="flex gap-2 flex-wrap">
            <select value={filterEntity} onChange={e => setFilterEntity(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 focus:border-blue-500 outline-none bg-white capitalize">
              {entityTypes.map(e => <option key={e} value={e}>{e === 'all' ? 'All Entities' : e.replace('_', ' ')}</option>)}
            </select>
            <select value={filterAction} onChange={e => setFilterAction(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 focus:border-blue-500 outline-none bg-white">
              {actionTypes.map(a => <option key={a} value={a}>{a === 'all' ? 'All Actions' : a}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Log Table */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {error && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-blue-700 flex items-center gap-2 mb-6">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {filtered.length === 0 && !loading ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <ClipboardList className="mx-auto text-gray-300 mb-4" size={56} strokeWidth={1.2} />
            <p className="text-gray-500">No audit logs found.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(log => {
              const color = getActionColor(log.action_type);
              const isExpanded = expanded === log.id;
              const entityIcon = ENTITY_ICONS[log.entity_type] ?? '📋';

              return (
                <div key={log.id}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                  <div
                    className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50/50"
                    onClick={() => setExpanded(isExpanded ? null : log.id)}
                  >
                    {/* Time */}
                    <div className="text-right flex-shrink-0 w-24 hidden sm:block">
                      <p className="text-xs font-medium text-gray-700">{timeAgo(log.created_at)}</p>
                    </div>

                    {/* Action badge */}
                    <span className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-xs font-bold border ${color.bgColor} ${color.textColor} ${color.borderColor}`}>
                      {log.action_type}
                    </span>

                    {/* Entity */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-base">{entityIcon}</span>
                      <span className="text-sm text-gray-600 capitalize">{log.entity_type.replace('_', ' ')}</span>
                    </div>

                    {/* Admin */}
                    <div className="flex-1 min-w-0 flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {log.admin?.avatar_url
                          ? <img src={log.admin.avatar_url} alt="" className="w-full h-full object-cover" />
                          : <User size={12} className="text-blue-500" />
                        }
                      </div>
                      <span className="text-sm text-gray-700 truncate">
                        {log.admin ? `${log.admin.first_name} ${log.admin.last_name}` : 'Unknown admin'}
                      </span>
                    </div>

                    {/* IP */}
                    {log.ip_address && (
                      <span className="text-xs text-gray-400 hidden lg:block font-mono">{log.ip_address}</span>
                    )}

                    <ChevronDown size={16} className={`text-gray-400 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>

                  {isExpanded && (
                    <div className="border-t border-gray-100 px-5 py-4 bg-gray-50/50 space-y-3">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Timestamp</p>
                          <p className="font-medium text-gray-900">{formatDate(log.created_at)}</p>
                        </div>
                        {log.entity_id && (
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Entity ID</p>
                            <p className="font-mono text-xs text-gray-700 truncate">{log.entity_id}</p>
                          </div>
                        )}
                        {log.admin?.email && (
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Admin Email</p>
                            <p className="font-medium text-gray-900">{log.admin.email}</p>
                          </div>
                        )}
                        {log.ip_address && (
                          <div>
                            <p className="text-xs text-gray-500 mb-1">IP Address</p>
                            <p className="font-mono text-sm text-gray-700">{log.ip_address}</p>
                          </div>
                        )}
                      </div>
                      {log.details && (
                        <div>
                          <p className="text-xs text-gray-500 mb-1.5">Details</p>
                          <pre className="bg-blue-950 text-blue-300 rounded-lg p-4 text-xs overflow-x-auto font-mono leading-relaxed">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Load More */}
        {filtered.length >= PAGE_SIZE && (
          <div className="text-center mt-8">
            <button
              onClick={() => fetchLogs(page + 1)}
              disabled={loading}
              className="inline-flex items-center gap-2 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 px-6 py-3 rounded-xl font-medium text-sm transition-all shadow-sm disabled:opacity-50"
            >
              {loading ? <RefreshCw size={15} className="animate-spin" /> : <ChevronDown size={15} />}
              {loading ? 'Loading…' : 'Load More'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
