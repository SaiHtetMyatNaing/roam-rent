'use client';

import React, { useState } from 'react';
import { X, Star, Loader2, CheckCircle2, AlertCircle, MessageSquare } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

type Booking = {
  id: string;
  pickup_date: string;
  dropoff_date: string;
  vehicle: {
    id: string;
    make: string;
    model: string;
    year: number;
    owner_id: string;
    vehicle_images?: { url: string; is_primary: boolean }[];
  } | null;
};

type ReviewModalProps = {
  booking: Booking;
  customerId: string;
  onClose: () => void;
  onSuccess: () => void;
};

const RATING_LABELS = ['', 'Terrible', 'Poor', 'Average', 'Good', 'Excellent'];

export function ReviewModal({ booking, customerId, onClose, onSuccess }: ReviewModalProps) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) return setError('Please select a star rating.');
    if (!booking.vehicle) return setError('Vehicle data missing.');

    setLoading(true);
    setError(null);

    const { error: err } = await supabase.from('reviews').insert({
      booking_id: booking.id,
      reviewer_id: customerId,
      reviewee_id: booking.vehicle.owner_id,
      vehicle_id: booking.vehicle.id,
      rating,
      comment: comment.trim() || null,
    });

    setLoading(false);
    if (err) {
      setError(err.message);
    } else {
      setDone(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1800);
    }
  };

  const displayRating = hovered || rating;
  const imgUrl = booking.vehicle?.vehicle_images?.find(i => i.is_primary)?.url
    ?? booking.vehicle?.vehicle_images?.[0]?.url;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative bg-gradient-to-br from-blue-700 to-blue-900 px-6 pt-6 pb-8 text-white">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 hover:bg-white/20 rounded-full transition-colors"
          >
            <X size={18} />
          </button>
          <p className="text-blue-200 text-xs font-semibold uppercase tracking-widest mb-1">Rate your experience</p>
          <h2 className="text-2xl font-bold">Leave a Review</h2>

          {booking.vehicle && (
            <div className="flex items-center gap-3 mt-4 bg-white/10 rounded-xl p-3 border border-white/20">
              <div className="w-12 h-12 rounded-lg overflow-hidden bg-white/20 flex-shrink-0">
                {imgUrl
                  ? <img src={imgUrl} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-white/60 text-xl">🚗</div>
                }
              </div>
              <div>
                <p className="font-semibold text-white">
                  {booking.vehicle.make} {booking.vehicle.model}
                </p>
                <p className="text-blue-200 text-sm">{booking.vehicle.year}</p>
              </div>
            </div>
          )}
        </div>

        {/* Star strip overlapping header */}
        <div className="-mt-6 mx-6">
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 px-6 py-5 text-center">
            {done ? (
              <div className="flex flex-col items-center gap-2 py-2">
                <CheckCircle2 size={48} className="text-emerald-500" />
                <p className="font-bold text-gray-900 text-lg">Review submitted!</p>
                <p className="text-gray-500 text-sm">Thank you for your feedback.</p>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-500 mb-3">How was your rental?</p>
                <div className="flex items-center justify-center gap-1.5 mb-2">
                  {[1, 2, 3, 4, 5].map(i => (
                    <button
                      key={i}
                      onMouseEnter={() => setHovered(i)}
                      onMouseLeave={() => setHovered(0)}
                      onClick={() => setRating(i)}
                      className="transition-transform hover:scale-110 active:scale-95"
                    >
                      <Star
                        size={36}
                        className={`transition-colors ${
                          i <= displayRating
                            ? 'fill-amber-400 text-amber-400'
                            : 'fill-gray-100 text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                {displayRating > 0 && (
                  <p className="text-sm font-semibold text-amber-600">{RATING_LABELS[displayRating]}</p>
                )}
              </>
            )}
          </div>
        </div>

        {!done && (
          <div className="px-6 pb-6 pt-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                Your review <span className="font-normal text-gray-400 normal-case">(optional)</span>
              </label>
              <div className="relative">
                <MessageSquare size={16} className="absolute top-3 left-3 text-gray-400" />
                <textarea
                  rows={4}
                  placeholder="Tell others about your experience with this vehicle and owner..."
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  maxLength={500}
                  className="w-full pl-9 pr-4 py-3 text-sm border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all resize-none"
                />
              </div>
              <p className="text-right text-xs text-gray-400 mt-1">{comment.length}/500</p>
            </div>

            {error && (
              <p className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">
                <AlertCircle size={15} /> {error}
              </p>
            )}

            <div className="flex gap-3 pt-1">
              <button
                onClick={onClose}
                className="flex-1 py-3 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors text-sm"
              >
                Maybe later
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading || rating === 0}
                className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl font-medium transition-colors text-sm shadow-sm"
              >
                {loading ? <Loader2 size={15} className="animate-spin" /> : <Star size={15} />}
                {loading ? 'Submitting…' : 'Submit Review'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}