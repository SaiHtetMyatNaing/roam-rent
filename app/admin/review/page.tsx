'use client';

import React, { useState, useEffect } from 'react';
import {
  Star, Search, Trash2, Eye, User, Car, Calendar,
  AlertCircle, Loader2, X, ChevronDown, MessageSquare,
  CheckCircle2, Filter,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer: { id: string; first_name: string; last_name: string; email: string; avatar_url: string | null } | null;
  reviewee: { id: string; first_name: string; last_name: string; email: string } | null;
  vehicle: { make: string; model: string; year: number } | null;
  booking: { pickup_date: string; dropoff_date: string } | null;
};

const RATING_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: 'Terrible',  color: 'text-blue-700' },
  2: { label: 'Poor',      color: 'text-sky-700' },
  3: { label: 'Average',   color: 'text-blue-600' },
  4: { label: 'Good',      color: 'text-indigo-600' },
  5: { label: 'Excellent', color: 'text-blue-800' },
};

function StarDisplay({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={size}
          className={i <= rating ? 'fill-blue-400 text-blue-400' : 'fill-gray-100 text-gray-300'} />
      ))}
    </div>
  );
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function timeAgo(d: string) {
  const h = Math.floor((Date.now() - new Date(d).getTime()) / 3_600_000);
  if (h < 1) return 'Just now';
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  return days < 30 ? `${days}d ago` : formatDate(d);
}

// ─── Delete Confirmation Modal ─────────────────────────────────────────────────
function DeleteModal({
  review,
  onClose,
  onSuccess,
}: {
  review: Review;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setLoading(true);
    const { error: err } = await supabase.from('reviews').delete().eq('id', review.id);
    setLoading(false);
    if (err) setError(err.message);
    else onSuccess();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 text-center" onClick={e => e.stopPropagation()}>
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <Trash2 size={28} className="text-blue-600" />
        </div>
        <h3 className="font-bold text-gray-900 text-xl mb-2">Delete this review?</h3>
        <p className="text-sm text-gray-500 mb-1">
          By {review.reviewer?.first_name} {review.reviewer?.last_name}
        </p>
        <div className="flex items-center justify-center gap-2 mb-4">
          <StarDisplay rating={review.rating} />
          <span className={`text-sm font-medium ${RATING_LABELS[review.rating]?.color}`}>
            {RATING_LABELS[review.rating]?.label}
          </span>
        </div>
        {review.comment && (
          <p className="text-sm text-gray-600 italic bg-gray-50 rounded-xl p-3 mb-5 text-left">
            "{review.comment}"
          </p>
        )}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-5 text-sm text-blue-700 text-left">
          This action is permanent and cannot be undone.
        </div>
        {error && (
          <p className="text-sm text-blue-700 mb-4 flex items-center justify-center gap-2">
            <AlertCircle size={15} /> {error}
          </p>
        )}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors text-sm">
            Keep Review
          </button>
          <button onClick={handleDelete} disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-3 rounded-xl font-medium text-sm transition-colors shadow-sm">
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
            {loading ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Review Detail Panel ───────────────────────────────────────────────────────
function ReviewPanel({
  review,
  onClose,
  onDelete,
}: {
  review: Review;
  onClose: () => void;
  onDelete: () => void;
}) {
  const [showDelete, setShowDelete] = useState(false);

  return (
    <>
      <div className="fixed inset-0 z-50 flex" onClick={onClose}>
        <div className="flex-1 bg-black/50 backdrop-blur-sm" />
        <div className="w-full max-w-md bg-white shadow-2xl overflow-y-auto flex flex-col" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 sticky top-0 bg-white z-10">
            <h3 className="font-bold text-gray-900">Review Details</h3>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <X size={18} className="text-gray-500" />
            </button>
          </div>

          <div className="p-6 space-y-5 flex-1">
            {/* Rating */}
            <div className="text-center bg-blue-50/60 rounded-2xl border border-blue-100 py-6">
              <StarDisplay rating={review.rating} size={32} />
              <p className={`text-2xl font-bold mt-2 ${RATING_LABELS[review.rating]?.color}`}>
                {RATING_LABELS[review.rating]?.label}
              </p>
              <p className="text-sm text-gray-500 mt-1">{timeAgo(review.created_at)}</p>
            </div>

            {/* Comment */}
            {review.comment ? (
              <div className="bg-gray-50 rounded-xl border border-gray-100 p-4">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <MessageSquare size={12} /> Review Comment
                </p>
                <p className="text-gray-800 text-sm leading-relaxed">{review.comment}</p>
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic text-center">No written comment.</p>
            )}

            {/* Reviewer */}
            {review.reviewer && (
              <div className="bg-blue-50/50 rounded-xl border border-blue-100 p-4">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Reviewer</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden">
                    {review.reviewer.avatar_url
                      ? <img src={review.reviewer.avatar_url} alt="" className="w-full h-full object-cover" />
                      : <User size={18} className="text-blue-500" />
                    }
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">
                      {review.reviewer.first_name} {review.reviewer.last_name}
                    </p>
                    <p className="text-xs text-gray-500">{review.reviewer.email}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Reviewee */}
            {review.reviewee && (
              <div className="bg-blue-50 rounded-xl border border-blue-100 p-4">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">About (Owner)</p>
                <p className="font-semibold text-gray-900 text-sm">
                  {review.reviewee.first_name} {review.reviewee.last_name}
                </p>
                <p className="text-xs text-gray-500">{review.reviewee.email}</p>
              </div>
            )}

            {/* Vehicle & Booking */}
            {(review.vehicle || review.booking) && (
              <div className="bg-gray-50 rounded-xl border border-gray-100 p-4 space-y-2 text-sm">
                {review.vehicle && (
                  <div className="flex justify-between">
                    <span className="text-gray-500 flex items-center gap-1.5"><Car size={13} /> Vehicle</span>
                    <span className="font-medium text-gray-900">
                      {review.vehicle.make} {review.vehicle.model} · {review.vehicle.year}
                    </span>
                  </div>
                )}
                {review.booking && (
                  <div className="flex justify-between">
                    <span className="text-gray-500 flex items-center gap-1.5"><Calendar size={13} /> Rental Period</span>
                    <span className="font-medium text-gray-900">
                      {formatDate(review.booking.pickup_date)} → {formatDate(review.booking.dropoff_date)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Delete button */}
            <button onClick={() => setShowDelete(true)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-blue-300 text-blue-700 hover:bg-blue-50 font-medium text-sm transition-colors">
              <Trash2 size={15} /> Remove Review
            </button>
          </div>
        </div>
      </div>

      {showDelete && (
        <DeleteModal
          review={review}
          onClose={() => setShowDelete(false)}
          onSuccess={() => { setShowDelete(false); onDelete(); onClose(); }}
        />
      )}
    </>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Review | null>(null);
  const [filterRating, setFilterRating] = useState<0 | 1 | 2 | 3 | 4 | 5>(0);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const init = async () => {
      const email = localStorage.getItem('user_email');
      if (!email) { window.location.href = '/sign-in'; return; }

      const { data: admin } = await supabase.from('users').select('id, role').eq('email', email.trim().toLowerCase()).single();
      if (!admin || admin.role !== 'admin') { window.location.href = '/'; return; }

      const { data, error: err } = await supabase
        .from('reviews')
        .select(`
          id, rating, comment, created_at,
          reviewer:reviewer_id ( id, first_name, last_name, email, avatar_url ),
          reviewee:reviewee_id ( id, first_name, last_name, email ),
          vehicle:vehicle_id ( make, model, year ),
          booking:booking_id ( pickup_date, dropoff_date )
        `)
        .order('created_at', { ascending: false });

      if (err) setError(err.message);
      else setReviews((data ?? []).map((d: any) => ({
        ...d,
        reviewer: Array.isArray(d.reviewer) ? (d.reviewer[0] ?? null) : (d.reviewer ?? null),
        reviewee: Array.isArray(d.reviewee) ? (d.reviewee[0] ?? null) : (d.reviewee ?? null),
        vehicle:  Array.isArray(d.vehicle)  ? (d.vehicle[0]  ?? null) : (d.vehicle  ?? null),
        booking:  Array.isArray(d.booking)  ? (d.booking[0]  ?? null) : (d.booking  ?? null),
      })));
      setLoading(false);
    };
    init();
  }, []);

  const filtered = reviews.filter(r => {
    if (filterRating !== 0 && r.rating !== filterRating) return false;
    const s = searchTerm.toLowerCase();
    return (
      `${r.reviewer?.first_name} ${r.reviewer?.last_name}`.toLowerCase().includes(s) ||
      (r.comment?.toLowerCase() ?? '').includes(s) ||
      `${r.vehicle?.make} ${r.vehicle?.model}`.toLowerCase().includes(s)
    );
  });

  const avgRating = reviews.length
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '—';

  const ratingCounts = [5, 4, 3, 2, 1].map(r => ({
    rating: r,
    count: reviews.filter(rev => rev.rating === r).length,
    pct: reviews.length ? Math.round((reviews.filter(rev => rev.rating === r).length / reviews.length) * 100) : 0,
  }));

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-blue-700 font-medium">Loading reviews...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-800 to-blue-900 text-white px-6 py-10 shadow-lg">
        <div className="max-w-6xl mx-auto">
          <p className="text-blue-200 text-sm font-medium uppercase tracking-wide mb-2">Admin Panel</p>
          <h1 className="text-4xl font-bold mb-8">Review Management</h1>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="bg-white/10 border border-white/10 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-blue-200">{avgRating}</p>
              <p className="text-xs text-blue-200 mt-1">Platform Avg Rating</p>
            </div>
            <div className="bg-white/10 border border-white/10 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-white">{reviews.length}</p>
              <p className="text-xs text-blue-200 mt-1">Total Reviews</p>
            </div>
            <div className="sm:block hidden bg-white/10 border border-white/10 rounded-xl p-4">
              <div className="space-y-1.5">
                {ratingCounts.map(({ rating, count, pct }) => (
                  <div key={rating} className="flex items-center gap-2">
                    <span className="text-xs text-blue-200 w-4">{rating}★</span>
                    <div className="flex-1 bg-white/10 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-blue-400 h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-blue-200 w-6 text-right">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white border-b border-gray-200 shadow-sm px-6 py-4 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
            <input type="text" placeholder="Search by reviewer, vehicle, or comment..." value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all" />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setFilterRating(0)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filterRating === 0 ? 'bg-blue-700 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
              All
            </button>
            {[5, 4, 3, 2, 1].map(r => (
              <button key={r} onClick={() => setFilterRating(r as any)}
                className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  filterRating === r ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}>
                {r}<Star size={13} className={filterRating === r ? 'fill-white text-white' : 'fill-blue-400 text-blue-400'} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Reviews List */}
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-3">
        {error && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-blue-700 flex items-center gap-2">
            <AlertCircle size={16} /> {error}
          </div>
        )}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Star className="mx-auto text-gray-300 mb-4" size={56} strokeWidth={1.2} />
            <p className="text-gray-500">No reviews found.</p>
          </div>
        ) : filtered.map(review => {
          const rInfo = RATING_LABELS[review.rating];
          return (
            <div key={review.id} onClick={() => setSelected(review)}
              className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex items-start gap-4 cursor-pointer hover:shadow-md hover:border-blue-200 transition-all group">
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0 overflow-hidden border border-blue-100">
                {review.reviewer?.avatar_url
                  ? <img src={review.reviewer.avatar_url} alt="" className="w-full h-full object-cover" />
                  : <User size={16} className="text-blue-400" />
                }
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-3 justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors text-sm">
                      {review.reviewer?.first_name} {review.reviewer?.last_name}
                      <span className="text-gray-400 font-normal ml-2">→ {review.reviewee?.first_name} {review.reviewee?.last_name}</span>
                    </p>
                    {review.vehicle && (
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <Car size={11} /> {review.vehicle.make} {review.vehicle.model} · {review.vehicle.year}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <StarDisplay rating={review.rating} size={13} />
                    <span className={`text-xs font-semibold ${rInfo.color}`}>{rInfo.label}</span>
                  </div>
                </div>
                {review.comment && (
                  <p className="text-sm text-gray-600 mt-2 line-clamp-2 italic">"{review.comment}"</p>
                )}
                <p className="text-xs text-gray-400 mt-1.5">{timeAgo(review.created_at)}</p>
              </div>

              <button
                onClick={e => { e.stopPropagation(); setSelected(review); }}
                className="flex-shrink-0 p-1.5 text-gray-400 group-hover:text-blue-500 transition-colors"
              >
                <Eye size={16} />
              </button>
            </div>
          );
        })}
      </div>

      {selected && (
        <ReviewPanel
          review={selected}
          onClose={() => setSelected(null)}
          onDelete={() => {
            setReviews(prev => prev.filter(r => r.id !== selected.id));
            setSelected(null);
          }}
        />
      )}
    </div>
  );
}
