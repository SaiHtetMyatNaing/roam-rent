'use client'
import { useState, useEffect, useCallback, JSX } from "react";
import {
  MapPin, Heart, Users, Zap, Fuel, Bike,
  ChevronLeft, ChevronRight, Sparkles,
  X, Star, Gauge, Car, Wind,
  Calendar, CheckCircle2, AlertCircle,
  ArrowRight, CreditCard, Loader2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────
type VehicleType = "Car" | "SUV" | "Motorbike" | "Van" | "Luxury";
type FuelType = "Petrol" | "Diesel" | "Electric" | "Hybrid";

interface VehicleImage { url: string; is_primary: boolean; publicUrl?: string; }
interface VehicleFeature { name: string; }

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  type: VehicleType;
  color: string | null;
  seating_capacity: number | null;
  drivetrain: string | null;
  fuel_type: FuelType | null;
  top_speed_mph: number | null;
  range_efficiency: string | null;
  description: string | null;
  price_per_day: number;
  location_city: string | null;
  location_state: string | null;
  vehicle_images: VehicleImage[] | null;
  vehicle_features: VehicleFeature[] | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const PLACEHOLDER_IMAGES: Record<VehicleType, string> = {
  Car: "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&q=80&w=800",
  SUV: "https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&q=80&w=800",
  Motorbike: "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&q=80&w=800",
  Van: "https://images.unsplash.com/photo-1559416523-140ddc3d238c?auto=format&fit=crop&q=80&w=800",
  Luxury: "https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&q=80&w=800",
};
const TYPE_COLORS: Record<VehicleType, string> = {
  Car: "bg-sky-500", SUV: "bg-emerald-600", Motorbike: "bg-orange-500",
  Van: "bg-violet-600", Luxury: "bg-amber-400 !text-amber-900",
};

const placeholderImage = (type: VehicleType) => PLACEHOLDER_IMAGES[type] ?? PLACEHOLDER_IMAGES.Car;

const fuelIcon = (ft: FuelType): JSX.Element => {
  switch (ft) {
    case "Electric": return <Zap size={14} />;
    case "Hybrid": return <Wind size={14} />;
    default: return <Fuel size={14} />;
  }
};
const typeIcon = (vt: VehicleType): JSX.Element => {
  switch (vt) {
    case "Motorbike": return <Bike size={14} />;
    case "Luxury": return <Gauge size={14} />;
    case "Van": return <Gauge size={14} />;
    default: return <Car size={14} />;
  }
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function daysBetween(a: string, b: string) {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

// ─── Step indicators ──────────────────────────────────────────────────────────
type Step = "details" | "booking" | "confirm" | "success";

function StepBar({ step }: { step: Step }) {
  const steps: { id: Step; label: string }[] = [
    { id: "details",  label: "Details"  },
    { id: "booking",  label: "Dates"    },
    { id: "confirm",  label: "Confirm"  },
    { id: "success",  label: "Done"     },
  ];
  const idx = steps.findIndex((s) => s.id === step);

  return (
    <div className="flex items-center justify-center gap-0 mb-6">
      {steps.map((s, i) => (
        <div key={s.id} className="flex items-center">
          <div className="flex flex-col items-center">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all
              ${i < idx ? "bg-blue-600 text-white" : i === idx ? "bg-blue-600 text-white ring-4 ring-blue-100" : "bg-gray-100 text-gray-400"}`}>
              {i < idx ? <CheckCircle2 size={14} /> : i + 1}
            </div>
            <span className={`text-[10px] font-semibold mt-1 ${i === idx ? "text-blue-600" : "text-gray-400"}`}>
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`w-10 h-0.5 mb-3 mx-1 ${i < idx ? "bg-blue-600" : "bg-gray-200"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Image Gallery ─────────────────────────────────────────────────────────────
function ImageGallery({ car, onClose }: { car: Vehicle; onClose: () => void }) {
  const images = car.vehicle_images ?? [];
  const urls = images.map((i) => i.publicUrl ?? i.url ?? placeholderImage(car.type));
  const [activeIdx, setActiveIdx] = useState(Math.max(0, images.findIndex((i) => i.is_primary)));
  const prev = () => setActiveIdx((i) => (i - 1 + urls.length) % urls.length);
  const next = () => setActiveIdx((i) => (i + 1) % urls.length);

  return (
    <div className="relative h-64 sm:h-72 bg-gray-100 rounded-t-2xl overflow-hidden">
      <img
        src={urls[activeIdx] ?? placeholderImage(car.type)}
        alt={`${car.year} ${car.make} ${car.model}`}
        className="w-full h-full object-cover"
        onError={(e) => { e.currentTarget.src = placeholderImage(car.type); }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
      {urls.length > 1 && (
        <>
          <button onClick={prev} className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"><ChevronLeft size={18} /></button>
          <button onClick={next} className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"><ChevronRight size={18} /></button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {urls.map((_, i) => (
              <button key={i} onClick={() => setActiveIdx(i)}
                className={`rounded-full transition-all ${i === activeIdx ? "w-5 h-2 bg-white" : "w-2 h-2 bg-white/60"}`} />
            ))}
          </div>
        </>
      )}
      <div className="absolute top-3 left-3 flex gap-2">
        <span className={`${TYPE_COLORS[car.type]} text-white text-[10px] font-black px-2.5 py-1 rounded-md uppercase tracking-widest`}>{car.type}</span>
        <span className="bg-green-600 text-white text-[10px] font-black px-2.5 py-1 rounded-md uppercase tracking-widest">Available</span>
      </div>
      <button onClick={onClose} className="absolute top-3 right-3 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"><X size={16} /></button>
    </div>
  );
}

// ─── Step 1: Details ──────────────────────────────────────────────────────────
function DetailsStep({ car, isWishlisted, onToggleWishlist, onNext }: {
  car: Vehicle; isWishlisted: boolean;
  onToggleWishlist: (id: string) => void; onNext: () => void;
}) {
  const features = (car.vehicle_features ?? []).map((f) => f.name);
  const location = [car.location_city, car.location_state].filter(Boolean).join(", ");
  const stats = [
    car.seating_capacity != null && { icon: <Users size={16} />, label: "Seats", value: `${car.seating_capacity}` },
    car.fuel_type && { icon: fuelIcon(car.fuel_type), label: "Fuel", value: car.fuel_type },
    car.drivetrain && { icon: typeIcon(car.type), label: "Drive", value: car.drivetrain },
    car.top_speed_mph != null && { icon: <Gauge size={16} />, label: "Top Speed", value: `${car.top_speed_mph} mph` },
    car.range_efficiency && { icon: <Sparkles size={16} />, label: "Range", value: car.range_efficiency },
  ].filter(Boolean) as { icon: JSX.Element; label: string; value: string }[];

  return (
    <div className="p-5 sm:p-6">
      <div className="flex justify-between items-start gap-3 mb-5">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{car.year} {car.make} {car.model}</h2>
          <div className="flex flex-wrap items-center gap-3 mt-1.5">
            {car.color && <span className="text-sm text-gray-500 capitalize">{car.color}</span>}
            {location && <span className="flex items-center gap-1 text-sm text-gray-500"><MapPin size={12} />{location}</span>}
            <span className="flex items-center gap-1 text-sm text-amber-600 font-medium"><Star size={12} className="fill-amber-400 text-amber-400" />4.9 <span className="text-gray-400">(42)</span></span>
          </div>
        </div>
        <button onClick={() => onToggleWishlist(car.id)}
          className={`p-2.5 rounded-full border transition-colors flex-shrink-0 ${isWishlisted ? "bg-red-50 border-red-200 text-red-500" : "border-gray-200 text-gray-400 hover:border-red-200 hover:text-red-500"}`}>
          <Heart size={18} className={isWishlisted ? "fill-red-500" : ""} />
        </button>
      </div>

      {stats.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
          {stats.map((s, i) => (
            <div key={i} className="bg-gray-50 rounded-xl p-3">
              <div className="text-gray-400 mb-1">{s.icon}</div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{s.label}</p>
              <p className="text-sm font-bold text-slate-900 mt-0.5">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {car.description && (
        <div className="mb-5">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">About</p>
          <p className="text-sm text-gray-600 leading-relaxed">{car.description}</p>
        </div>
      )}

      {features.length > 0 && (
        <div className="mb-5">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Features</p>
          <div className="flex flex-wrap gap-1.5">
            {features.map((f, i) => (
              <span key={i} className="bg-blue-50 text-blue-700 text-xs font-semibold px-2.5 py-1 rounded-lg">{f}</span>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Daily Rate</p>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-extrabold text-slate-900">${Number(car.price_per_day).toFixed(0)}</span>
            <span className="text-sm text-gray-500 font-medium">/ day</span>
          </div>
        </div>
        <button onClick={onNext}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold text-sm tracking-wide transition-all active:scale-95 shadow-lg shadow-blue-500/20">
          Book Now <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}

// ─── Step 2: Date & Location Booking ─────────────────────────────────────────
interface BookingData {
  pickup_date: string;
  dropoff_date: string;
  pickup_location: string;
  dropoff_location: string;
}

function BookingStep({ car, onBack, onNext }: {
  car: Vehicle;
  onBack: () => void;
  onNext: (data: BookingData) => void;
}) {
  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState<BookingData>({
    pickup_date: "", dropoff_date: "",
    pickup_location: "", dropoff_location: "",
  });
  const [fieldError, setFieldError] = useState<string | null>(null);

  const set = <K extends keyof BookingData>(k: K, v: string) =>
    setForm((p) => ({ ...p, [k]: v }));

  const days = form.pickup_date && form.dropoff_date
    ? daysBetween(form.pickup_date, form.dropoff_date) : 0;
  const total = days * car.price_per_day;

  const handleNext = () => {
    if (!form.pickup_date) return setFieldError("Please select a pick-up date.");
    if (!form.dropoff_date) return setFieldError("Please select a drop-off date.");
    if (days <= 0) return setFieldError("Drop-off must be after pick-up.");
    if (!form.pickup_location.trim()) return setFieldError("Please enter a pick-up location.");
    if (!form.dropoff_location.trim()) return setFieldError("Please enter a drop-off location.");
    setFieldError(null);
    onNext(form);
  };

  return (
    <div className="p-5 sm:p-6">
      {/* Mini car header */}
      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl mb-5">
        <div className="w-12 h-12 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
          {(() => {
            const imgs = car.vehicle_images ?? [];
            const u = imgs.find((i) => i.is_primary)?.publicUrl ?? imgs[0]?.publicUrl ?? imgs[0]?.url;
            return u ? <img src={u} className="w-full h-full object-cover" alt="" onError={(e) => { e.currentTarget.src = placeholderImage(car.type); }} />
              : <div className="w-full h-full flex items-center justify-center"><Car size={20} className="text-gray-300" /></div>;
          })()}
        </div>
        <div>
          <p className="font-bold text-slate-900 text-sm">{car.year} {car.make} {car.model}</p>
          <p className="text-xs text-gray-500">${car.price_per_day}/day</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Dates */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              Pick-up Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400" size={14} />
              <input type="date" min={today} value={form.pickup_date}
                onChange={(e) => { set("pickup_date", e.target.value); if (form.dropoff_date && e.target.value >= form.dropoff_date) set("dropoff_date", ""); }}
                className="w-full pl-9 pr-3 py-2.5 text-sm font-medium bg-gray-50 border border-gray-200 rounded-xl
                  focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              Drop-off Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400" size={14} />
              <input type="date" min={form.pickup_date || today} value={form.dropoff_date}
                onChange={(e) => set("dropoff_date", e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 text-sm font-medium bg-gray-50 border border-gray-200 rounded-xl
                  focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
            </div>
          </div>
        </div>

        {/* Duration badge */}
        {days > 0 && (
          <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
            <span className="text-sm font-semibold text-blue-700">{days} day{days !== 1 ? "s" : ""}</span>
            <span className="text-lg font-extrabold text-blue-700">${total.toFixed(2)}</span>
          </div>
        )}

        {/* Locations */}
        <div>
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
            Pick-up Location
          </label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400" size={14} />
            <input type="text" placeholder="e.g. Downtown, Airport Terminal 2..."
              value={form.pickup_location} onChange={(e) => set("pickup_location", e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 text-sm font-medium bg-gray-50 border border-gray-200 rounded-xl
                focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
          </div>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
            Drop-off Location
          </label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400" size={14} />
            <input type="text" placeholder="e.g. Hotel lobby, Airport..."
              value={form.dropoff_location} onChange={(e) => set("dropoff_location", e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 text-sm font-medium bg-gray-50 border border-gray-200 rounded-xl
                focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
          </div>
        </div>

        {fieldError && (
          <p className="flex items-center gap-1.5 text-sm text-red-600 font-medium">
            <AlertCircle size={14} /> {fieldError}
          </p>
        )}
      </div>

      <div className="flex gap-3 mt-6">
        <button onClick={onBack}
          className="flex items-center gap-1.5 px-4 py-3 border border-gray-200 text-gray-600 font-semibold text-sm rounded-xl hover:bg-gray-50 transition-colors">
          <ChevronLeft size={15} /> Back
        </button>
        <button onClick={handleNext}
          className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold text-sm tracking-wide transition-all active:scale-95 shadow-lg shadow-blue-500/20">
          Review Booking <ArrowRight size={15} />
        </button>
      </div>
    </div>
  );
}

// ─── Step 3: Confirm ──────────────────────────────────────────────────────────
function ConfirmStep({ car, booking, onBack, onConfirm, submitting, submitError }: {
  car: Vehicle; booking: BookingData;
  onBack: () => void; onConfirm: () => void;
  submitting: boolean; submitError: string | null;
}) {
  const days = daysBetween(booking.pickup_date, booking.dropoff_date);
  const subtotal = days * car.price_per_day;
  const serviceFee = parseFloat((subtotal * 0.1).toFixed(2));
  const total = subtotal + serviceFee;

  const Row = ({ label, value, bold }: { label: string; value: string; bold?: boolean }) => (
    <div className={`flex justify-between items-center py-2 ${bold ? "border-t border-gray-200 pt-3 mt-1" : ""}`}>
      <span className={`text-sm ${bold ? "font-bold text-slate-900" : "text-gray-600"}`}>{label}</span>
      <span className={`text-sm ${bold ? "font-extrabold text-slate-900 text-base" : "font-semibold text-slate-800"}`}>{value}</span>
    </div>
  );

  return (
    <div className="p-5 sm:p-6">
      <h3 className="font-bold text-slate-900 text-lg mb-4">Review Your Booking</h3>

      {/* Car summary */}
      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl mb-5">
        <div className="w-14 h-14 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
          {(() => {
            const imgs = car.vehicle_images ?? [];
            const u = imgs.find((i) => i.is_primary)?.publicUrl ?? imgs[0]?.publicUrl ?? imgs[0]?.url;
            return u ? <img src={u} className="w-full h-full object-cover" alt="" onError={(e) => { e.currentTarget.src = placeholderImage(car.type); }} />
              : <div className="w-full h-full flex items-center justify-center"><Car size={20} className="text-gray-300" /></div>;
          })()}
        </div>
        <div>
          <p className="font-bold text-slate-900">{car.year} {car.make} {car.model}</p>
          <p className="text-xs text-gray-500">{car.type}{car.color ? ` · ${car.color}` : ""}</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-sm font-bold text-slate-900">${car.price_per_day}/day</p>
          <p className="text-xs text-gray-500">{days} day{days !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {/* Trip details */}
      <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-2.5">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Pick-up</p>
            <p className="text-sm font-semibold text-slate-900">{formatDate(booking.pickup_date)}</p>
            <p className="text-xs text-gray-500 mt-0.5">{booking.pickup_location}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Drop-off</p>
            <p className="text-sm font-semibold text-slate-900">{formatDate(booking.dropoff_date)}</p>
            <p className="text-xs text-gray-500 mt-0.5">{booking.dropoff_location}</p>
          </div>
        </div>
      </div>

      {/* Price breakdown */}
      <div className="bg-gray-50 rounded-xl p-4 mb-4">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Price Breakdown</p>
        <Row label={`$${car.price_per_day} × ${days} day${days !== 1 ? "s" : ""}`} value={`$${subtotal.toFixed(2)}`} />
        <Row label="Service fee (10%)" value={`$${serviceFee.toFixed(2)}`} />
        <Row label="Total" value={`$${total.toFixed(2)}`} bold />
      </div>

      {/* "Payment" notice */}
      <div className="flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-xl mb-4">
        <CreditCard size={15} className="text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700 font-medium leading-relaxed">
          Payment is collected securely after the owner confirms your booking. No charge until approved.
        </p>
      </div>

      {submitError && (
        <p className="flex items-center gap-1.5 text-sm text-red-600 font-medium mb-3">
          <AlertCircle size={14} /> {submitError}
        </p>
      )}

      <div className="flex gap-3">
        <button onClick={onBack} disabled={submitting}
          className="flex items-center gap-1.5 px-4 py-3 border border-gray-200 text-gray-600 font-semibold text-sm rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50">
          <ChevronLeft size={15} /> Back
        </button>
        <button onClick={onConfirm} disabled={submitting}
          className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-3 rounded-xl font-bold text-sm tracking-wide transition-all active:scale-95 shadow-lg shadow-blue-500/20">
          {submitting ? <><Loader2 size={15} className="animate-spin" /> Confirming…</> : <><CheckCircle2 size={15} /> Confirm Booking · ${total.toFixed(2)}</>}
        </button>
      </div>
    </div>
  );
}

// ─── Step 4: Success ──────────────────────────────────────────────────────────
function SuccessStep({ car, booking, onClose }: {
  car: Vehicle; booking: BookingData; onClose: () => void;
}) {
  const days = daysBetween(booking.pickup_date, booking.dropoff_date);
  const total = (days * car.price_per_day * 1.1).toFixed(2);

  return (
    <div className="p-6 text-center">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <CheckCircle2 size={32} className="text-green-600" />
      </div>
      <h3 className="text-xl font-extrabold text-slate-900 mb-1">Booking Submitted!</h3>
      <p className="text-sm text-gray-500 mb-6">Your request is pending owner approval. You'll be notified once confirmed.</p>

      <div className="bg-gray-50 rounded-2xl p-4 text-left mb-6">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Booking Summary</p>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Vehicle</span>
            <span className="font-semibold text-slate-900">{car.year} {car.make} {car.model}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Duration</span>
            <span className="font-semibold text-slate-900">{days} day{days !== 1 ? "s" : ""}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Pick-up</span>
            <span className="font-semibold text-slate-900">{formatDate(booking.pickup_date)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Drop-off</span>
            <span className="font-semibold text-slate-900">{formatDate(booking.dropoff_date)}</span>
          </div>
          <div className="flex justify-between text-sm border-t border-gray-200 pt-2 mt-2">
            <span className="font-bold text-slate-900">Total</span>
            <span className="font-extrabold text-slate-900">${total}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl mb-5 text-left">
        <Calendar size={14} className="text-blue-500 flex-shrink-0" />
        <p className="text-xs text-blue-700 font-medium">Check your bookings dashboard to track status updates.</p>
      </div>

      <button onClick={onClose}
        className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-xl font-bold text-sm tracking-wide transition-colors">
        Done
      </button>
    </div>
  );
}

// ─── Main DetailDialog ────────────────────────────────────────────────────────
interface DetailDialogProps {
  car: Vehicle;
  isWishlisted: boolean;
  onToggleWishlist: (id: string) => void;
  onClose: () => void;
}

export default function DetailDialog({ car, isWishlisted, onToggleWishlist, onClose }: DetailDialogProps) {
  const supabase = createClient();
  const [step, setStep] = useState<Step>("details");
  const [bookingData, setBookingData] = useState<BookingData | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!bookingData) return;

    const email = localStorage.getItem("user_email");
    if (!email) { setSubmitError("You must be logged in to book."); return; }

    setSubmitting(true);
    setSubmitError(null);

    const { data: user, error: userErr } = await supabase
      .from("users").select("id").eq("email", email.trim().toLowerCase()).single();

    if (userErr || !user) {
      setSubmitting(false);
      setSubmitError("Could not find your account. Please sign in again.");
      return;
    }

    const days = daysBetween(bookingData.pickup_date, bookingData.dropoff_date);
    const subtotal = days * car.price_per_day;
    const total = parseFloat((subtotal * 1.1).toFixed(2));

    const { error } = await supabase.from("bookings").insert({
      customer_id: user.id,
      vehicle_id: car.id,
      pickup_date: new Date(bookingData.pickup_date).toISOString(),
      dropoff_date: new Date(bookingData.dropoff_date).toISOString(),
      pickup_location: bookingData.pickup_location,
      dropoff_location: bookingData.dropoff_location,
      total_price: total,
      status: "pending",
    });

    setSubmitting(false);
    if (error) {
      setSubmitError(error.message);
    } else {
      setStep("success");
    }
  }, [bookingData, car, supabase]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={step !== "success" ? onClose : undefined}
    >
      <div
        className="relative bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Image gallery (hidden on success) */}
        {step !== "success" && (
          <ImageGallery car={car} onClose={onClose} />
        )}

        {/* Step bar */}
        {step !== "details" && (
          <div className="px-5 pt-5">
            <StepBar step={step} />
          </div>
        )}

        {/* Steps */}
        {step === "details" && (
          <DetailsStep
            car={car}
            isWishlisted={isWishlisted}
            onToggleWishlist={onToggleWishlist}
            onNext={() => setStep("booking")}
          />
        )}
        {step === "booking" && (
          <BookingStep
            car={car}
            onBack={() => setStep("details")}
            onNext={(data) => { setBookingData(data); setStep("confirm"); }}
          />
        )}
        {step === "confirm" && bookingData && (
          <ConfirmStep
            car={car}
            booking={bookingData}
            onBack={() => setStep("booking")}
            onConfirm={handleConfirm}
            submitting={submitting}
            submitError={submitError}
          />
        )}
        {step === "success" && bookingData && (
          <SuccessStep car={car} booking={bookingData} onClose={onClose} />
        )}
      </div>
    </div>
  );
}