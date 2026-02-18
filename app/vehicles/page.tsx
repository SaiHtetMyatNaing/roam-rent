'use client'
import { useState, useEffect, useCallback, JSX } from "react";
import {
  MapPin, Calendar, Heart, Users, Zap, Fuel, Bike,
  ChevronDown, Gauge, Briefcase, Loader2, AlertCircle, Car,
  Wind, X, Star, ChevronLeft, ChevronRight, Sparkles,
  SlidersHorizontal, RotateCcw, ArrowRight, CreditCard,
  CheckCircle2, Lock, Info,
} from "lucide-react";
import { PostgrestError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

// ─── Types ───────────────────────────────────────────────────────────────────
type VehicleType = "Car" | "SUV" | "Motorbike" | "Van" | "Luxury";
type FuelType = "Petrol" | "Diesel" | "Electric" | "Hybrid";
type Drivetrain = "FWD" | "RWD" | "AWD" | "4WD";
type VehicleStatus = "available" | "rented" | "maintenance" | "pending_approval";
type SortOption = "recommended" | "price_asc" | "price_desc";
type Step = "details" | "booking" | "payment" | "confirm" | "success";

interface VehicleImage {
  url: string;
  is_primary: boolean;
  publicUrl?: string;
}

interface VehicleFeature {
  name: string;
}

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  type: VehicleType;
  color: string | null;
  seating_capacity: number | null;
  drivetrain: Drivetrain | null;
  fuel_type: FuelType | null;
  top_speed_mph: number | null;
  range_efficiency: string | null;
  description: string | null;
  price_per_day: number;
  location_city: string | null;
  location_state: string | null;
  status: VehicleStatus;
  vehicle_images: VehicleImage[] | null;
  vehicle_features: VehicleFeature[] | null;
}

interface BookingData {
  pickup_date: string;
  dropoff_date: string;
  pickup_location: string;
  dropoff_location: string;
}

interface PaymentData {
  card_name: string;
  card_number: string;
  expiry: string;
  cvv: string;
}

interface AvailabilityWindow {
  available_from: string;
  available_to: string;
  note: string | null;
}

interface TakenPeriod {
  from_date: string;
  to_date: string;
  reason: string;
}

// ─── Filter State ─────────────────────────────────────────────────────────────
interface Filters {
  type: VehicleType | "All";
  fuelTypes: FuelType[];
  drivetrains: Drivetrain[];
  minPrice: string;
  maxPrice: string;
  minSeats: string;
  locationCity: string;
}

const DEFAULT_FILTERS: Filters = {
  type: "All",
  fuelTypes: [],
  drivetrains: [],
  minPrice: "",
  maxPrice: "",
  minSeats: "",
  locationCity: "",
};

// ─── Constants ────────────────────────────────────────────────────────────────
const STORAGE_BUCKET = "vehicle-images";

const PLACEHOLDER_IMAGES: Record<VehicleType, string> = {
  Car: "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&q=80&w=800",
  SUV: "https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&q=80&w=800",
  Motorbike: "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&q=80&w=800",
  Van: "https://images.unsplash.com/photo-1559416523-140ddc3d238c?auto=format&fit=crop&q=80&w=800",
  Luxury: "https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&q=80&w=800",
};

const FUEL_OPTIONS: FuelType[] = ["Petrol", "Diesel", "Electric", "Hybrid"];
const DRIVETRAIN_OPTIONS: Drivetrain[] = ["FWD", "RWD", "AWD", "4WD"];
const VEHICLE_TYPES: Array<VehicleType | "All"> = ["All", "Car", "SUV", "Motorbike", "Van", "Luxury"];

const placeholderImage = (type: VehicleType) =>
  PLACEHOLDER_IMAGES[type] ?? PLACEHOLDER_IMAGES.Car;

// ─── Helpers ──────────────────────────────────────────────────────────────────
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
    case "Van": return <Briefcase size={14} />;
    default: return <Car size={14} />;
  }
};

const TYPE_COLORS: Record<VehicleType, string> = {
  Car: "bg-sky-500",
  SUV: "bg-emerald-600",
  Motorbike: "bg-orange-500",
  Van: "bg-violet-600",
  Luxury: "bg-amber-400 !text-amber-900",
};

function resolveImageUrl(rawUrl: string, getPublicUrl: (path: string) => string): string {
  if (!rawUrl) return "";
  if (rawUrl.startsWith("http://") || rawUrl.startsWith("https://")) return rawUrl;
  return getPublicUrl(rawUrl);
}

function countActiveFilters(f: Filters): number {
  let n = 0;
  if (f.type !== "All") n++;
  n += f.fuelTypes.length;
  n += f.drivetrains.length;
  if (f.minPrice) n++;
  if (f.maxPrice) n++;
  if (f.minSeats) n++;
  if (f.locationCity) n++;
  return n;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function daysBetween(a: string, b: string) {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

/** Returns true if [start,end] overlaps any taken period */
function overlapsAnyPeriod(start: string, end: string, taken: TakenPeriod[]): boolean {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  return taken.some(({ from_date, to_date }) => {
    const f = new Date(from_date).getTime();
    const t = new Date(to_date).getTime();
    return s <= t && e >= f;
  });
}

/** Returns true if date falls within at least one availability window */
function isWithinAvailability(date: string, windows: AvailabilityWindow[]): boolean {
  if (windows.length === 0) return true; // no windows = always available
  const d = new Date(date).getTime();
  return windows.some(w => {
    const from = new Date(w.available_from).getTime();
    const to = new Date(w.available_to).getTime();
    return d >= from && d <= to;
  });
}

/** Format card number with spaces every 4 digits */
function formatCardNumber(value: string): string {
  return value.replace(/\D/g, "").replace(/(.{4})/g, "$1 ").trim().slice(0, 19);
}

/** Format expiry as MM/YY */
function formatExpiry(value: string, prev: string): string {
  // If user is deleting and we had a slash, strip the slash + last digit
  if (prev.length > value.length && prev.endsWith("/")) {
    return value.slice(0, -1);
  }
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length === 0) return "";
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

// ─── StepBar ──────────────────────────────────────────────────────────────────
function StepBar({ step }: { step: Step }) {
  const steps: { id: Step; label: string }[] = [
    { id: "details", label: "Details" },
    { id: "booking", label: "Dates" },
    { id: "payment", label: "Payment" },
    { id: "confirm", label: "Confirm" },
    { id: "success", label: "Done" },
  ];
  const idx = steps.findIndex((s) => s.id === step);
  return (
    <div className="flex items-center justify-center gap-0 mb-6 pt-5 px-5">
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
            <div className={`w-8 h-0.5 mb-3 mx-1 ${i < idx ? "bg-blue-600" : "bg-gray-200"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── FilterPanel ──────────────────────────────────────────────────────────────
interface FilterPanelProps {
  filters: Filters;
  onChange: (f: Filters) => void;
  onReset: () => void;
  onClose: () => void;
}

function FilterPanel({ filters, onChange, onReset, onClose }: FilterPanelProps) {
  const set = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    onChange({ ...filters, [key]: value });

  const toggleFuel = (ft: FuelType) => {
    const next = filters.fuelTypes.includes(ft)
      ? filters.fuelTypes.filter((f) => f !== ft)
      : [...filters.fuelTypes, ft];
    set("fuelTypes", next);
  };

  const toggleDrive = (dt: Drivetrain) => {
    const next = filters.drivetrains.includes(dt)
      ? filters.drivetrains.filter((d) => d !== dt)
      : [...filters.drivetrains, dt];
    set("drivetrains", next);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-full max-w-sm bg-white z-50 shadow-2xl
        flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={18} className="text-blue-600" />
            <span className="font-bold text-slate-900 text-lg">Filters</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onReset}
              className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-blue-600 transition-colors">
              <RotateCcw size={13} /> Reset all
            </button>
            <button onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-500">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-7">
          <section>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Vehicle Type</p>
            <div className="grid grid-cols-3 gap-2">
              {VEHICLE_TYPES.map((t) => (
                <button key={t} onClick={() => set("type", t)}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                    filters.type === t
                      ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-400/20"
                      : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
                  }`}>
                  {t}
                </button>
              ))}
            </div>
          </section>

          <section>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Price per Day ($)</p>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-[10px] text-gray-400 font-semibold mb-1 block">Min</label>
                <input type="number" min={0} placeholder="0" value={filters.minPrice}
                  onChange={(e) => set("minPrice", e.target.value)}
                  className="w-full px-3 py-2.5 text-sm font-medium bg-gray-50 border border-gray-200
                    rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
              </div>
              <div className="flex-1">
                <label className="text-[10px] text-gray-400 font-semibold mb-1 block">Max</label>
                <input type="number" min={0} placeholder="Any" value={filters.maxPrice}
                  onChange={(e) => set("maxPrice", e.target.value)}
                  className="w-full px-3 py-2.5 text-sm font-medium bg-gray-50 border border-gray-200
                    rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
              </div>
            </div>
          </section>

          <section>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Fuel Type</p>
            <div className="grid grid-cols-2 gap-2">
              {FUEL_OPTIONS.map((ft) => {
                const active = filters.fuelTypes.includes(ft);
                return (
                  <button key={ft} onClick={() => toggleFuel(ft)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-semibold
                      border transition-all ${active
                        ? "bg-blue-50 text-blue-700 border-blue-300"
                        : "bg-white text-gray-600 border-gray-200 hover:border-blue-200"}`}>
                    <span className={active ? "text-blue-500" : "text-gray-400"}>{fuelIcon(ft)}</span>
                    {ft}
                  </button>
                );
              })}
            </div>
          </section>

          <section>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Drivetrain</p>
            <div className="grid grid-cols-4 gap-2">
              {DRIVETRAIN_OPTIONS.map((dt) => {
                const active = filters.drivetrains.includes(dt);
                return (
                  <button key={dt} onClick={() => toggleDrive(dt)}
                    className={`py-2 rounded-lg text-xs font-bold border transition-all ${
                      active ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
                    }`}>
                    {dt}
                  </button>
                );
              })}
            </div>
          </section>

          <section>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Minimum Seats</p>
            <div className="flex gap-2">
              {["2", "4", "5", "7", "8"].map((n) => (
                <button key={n} onClick={() => set("minSeats", filters.minSeats === n ? "" : n)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${
                    filters.minSeats === n ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
                  }`}>
                  {n}+
                </button>
              ))}
            </div>
          </section>

          <section>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">City</p>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400" size={15} />
              <input type="text" placeholder="e.g. San Francisco" value={filters.locationCity}
                onChange={(e) => set("locationCity", e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-sm font-medium bg-gray-50 border border-gray-200
                  rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
            </div>
          </section>
        </div>

        <div className="px-6 py-4 border-t border-gray-100">
          <button onClick={onClose}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold
              text-sm tracking-wide transition-colors shadow-lg shadow-blue-500/20">
            Apply Filters
          </button>
        </div>
      </div>
    </>
  );
}

// ─── VehicleCard ──────────────────────────────────────────────────────────────
interface VehicleCardProps {
  car: Vehicle;
  isWishlisted: boolean;
  onToggleWishlist: (id: string) => void;
  onViewDetails: (car: Vehicle) => void;
}

function VehicleCard({ car, isWishlisted, onToggleWishlist, onViewDetails }: VehicleCardProps) {
  const images = car.vehicle_images ?? [];
  const primaryImg =
    images.find((i) => i.is_primary)?.publicUrl ??
    images.find((i) => i.is_primary)?.url ??
    images[0]?.publicUrl ??
    images[0]?.url ??
    placeholderImage(car.type);

  const features = (car.vehicle_features ?? []).map((f) => f.name);
  const location = [car.location_city, car.location_state].filter(Boolean).join(", ");

  return (
    <div
      className="group bg-white rounded-2xl border border-gray-200 overflow-hidden cursor-pointer
        hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
      onClick={() => onViewDetails(car)}
    >
      <div className="relative h-52 overflow-hidden bg-gray-100">
        <img
          src={primaryImg}
          alt={`${car.year} ${car.make} ${car.model}`}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={(e) => { e.currentTarget.src = placeholderImage(car.type); }}
        />
        <div className="absolute top-3 left-3">
          <span className={`${TYPE_COLORS[car.type]} text-white text-[10px] font-black
            px-2.5 py-1 rounded-md tracking-widest uppercase backdrop-blur-sm`}>
            {car.type}
          </span>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onToggleWishlist(car.id); }}
          aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
          className={`absolute top-3 right-3 p-2 rounded-full backdrop-blur-sm transition-all
            ${isWishlisted ? "bg-red-500 text-white" : "bg-white/90 text-gray-500 hover:text-red-500"}`}
        >
          <Heart size={16} className={isWishlisted ? "fill-white" : ""} />
        </button>
        {location && (
          <div className="absolute bottom-3 left-3 flex items-center gap-1 bg-black/50 backdrop-blur-sm
            text-white text-[11px] font-semibold px-2.5 py-1 rounded-full">
            <MapPin size={10} /> {location}
          </div>
        )}
      </div>

      <div className="p-5">
        <h3 className="text-lg font-bold text-slate-900 leading-tight">
          {car.year} {car.make} {car.model}
        </h3>
        {car.color && (
          <p className="text-xs text-gray-500 font-medium capitalize mt-0.5">{car.color}</p>
        )}
        {car.description && (
          <p className="text-xs text-gray-600 leading-relaxed mt-2 mb-4 line-clamp-2">{car.description}</p>
        )}

        <div className="flex items-center gap-5 py-3 border-y border-gray-100 mb-4 flex-wrap">
          {car.seating_capacity != null && (
            <div className="flex items-center gap-1.5 text-slate-600 text-xs font-semibold">
              <Users size={14} className="text-gray-400" /> {car.seating_capacity} seats
            </div>
          )}
          {car.fuel_type && (
            <div className="flex items-center gap-1.5 text-slate-600 text-xs font-semibold">
              <span className="text-gray-400">{fuelIcon(car.fuel_type)}</span> {car.fuel_type}
            </div>
          )}
          {car.drivetrain && (
            <div className="flex items-center gap-1.5 text-slate-600 text-xs font-semibold">
              <span className="text-gray-400">{typeIcon(car.type)}</span> {car.drivetrain}
            </div>
          )}
          {car.top_speed_mph != null && (
            <div className="flex items-center gap-1.5 text-slate-600 text-xs font-semibold">
              <Gauge size={14} className="text-gray-400" /> {car.top_speed_mph} mph
            </div>
          )}
        </div>

        {features.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-5">
            {features.slice(0, 3).map((f, i) => (
              <span key={i} className="bg-blue-50 text-blue-700 text-[10px] font-semibold px-2.5 py-1 rounded">
                {f}
              </span>
            ))}
            {features.length > 3 && (
              <span className="bg-gray-100 text-gray-600 text-[10px] font-semibold px-2.5 py-1 rounded">
                +{features.length - 3}
              </span>
            )}
          </div>
        )}

        <div className="flex justify-between items-center">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-extrabold text-slate-900">
              ${Number(car.price_per_day).toFixed(0)}
            </span>
            <span className="text-xs font-semibold text-gray-500">/day</span>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onViewDetails(car); }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-md font-semibold
              text-sm transition-colors active:scale-95"
          >
            View Details
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Mini car thumbnail ───────────────────────────────────────────────────────
function CarThumb({ car }: { car: Vehicle }) {
  const imgs = car.vehicle_images ?? [];
  const u = imgs.find((i) => i.is_primary)?.publicUrl ?? imgs[0]?.publicUrl ?? imgs[0]?.url;
  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl mb-5">
      <div className="w-12 h-12 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
        {u
          ? <img src={u} className="w-full h-full object-cover" alt="" onError={(e) => { e.currentTarget.src = placeholderImage(car.type); }} />
          : <div className="w-full h-full flex items-center justify-center"><Car size={20} className="text-gray-300" /></div>
        }
      </div>
      <div>
        <p className="font-bold text-slate-900 text-sm">{car.year} {car.make} {car.model}</p>
        <p className="text-xs text-gray-500">${car.price_per_day}/day</p>
      </div>
    </div>
  );
}

// ─── Step 1: Details ──────────────────────────────────────────────────────────
function DetailsStep({ car, isWishlisted, onToggleWishlist, onNext, onClose, isAuthenticated, availabilityWindows }: {
  car: Vehicle; isWishlisted: boolean;
  onToggleWishlist: (id: string) => void;
  onNext: () => void; onClose: () => void;
  isAuthenticated: boolean;
  availabilityWindows: AvailabilityWindow[];
}) {
  const images = car.vehicle_images ?? [];
  const allImgUrls = images.map((i) => i.publicUrl ?? i.url ?? placeholderImage(car.type));
  const [activeIdx, setActiveIdx] = useState(Math.max(0, images.findIndex((i) => i.is_primary)));
  const features = (car.vehicle_features ?? []).map((f) => f.name);
  const location = [car.location_city, car.location_state].filter(Boolean).join(", ");
  const prev = () => setActiveIdx((i) => (i - 1 + allImgUrls.length) % allImgUrls.length);
  const next = () => setActiveIdx((i) => (i + 1) % allImgUrls.length);

  const stats = [
    car.seating_capacity != null && { icon: <Users size={18} />, label: "Seats", value: `${car.seating_capacity}` },
    car.fuel_type && { icon: fuelIcon(car.fuel_type), label: "Fuel", value: car.fuel_type },
    car.drivetrain && { icon: typeIcon(car.type), label: "Drive", value: car.drivetrain },
    car.top_speed_mph != null && { icon: <Gauge size={18} />, label: "Top Speed", value: `${car.top_speed_mph} mph` },
    car.range_efficiency && { icon: <Sparkles size={18} />, label: "Range", value: car.range_efficiency },
  ].filter(Boolean) as { icon: JSX.Element; label: string; value: string }[];

  return (
    <>
      {/* Image gallery */}
      <div className="relative h-72 sm:h-80 bg-gray-100 rounded-t-2xl overflow-hidden">
        <img
          src={allImgUrls[activeIdx] ?? placeholderImage(car.type)}
          alt={`${car.year} ${car.make} ${car.model}`}
          className="w-full h-full object-cover"
          onError={(e) => { e.currentTarget.src = placeholderImage(car.type); }}
        />
        {allImgUrls.length > 1 && (
          <>
            <button onClick={prev} className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2.5 transition-colors">
              <ChevronLeft size={20} />
            </button>
            <button onClick={next} className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2.5 transition-colors">
              <ChevronRight size={20} />
            </button>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {allImgUrls.map((_, i) => (
                <button key={i} onClick={() => setActiveIdx(i)}
                  className={`rounded-full transition-all ${i === activeIdx ? "w-6 h-2.5 bg-white" : "w-2.5 h-2.5 bg-white/60 hover:bg-white/90"}`} />
              ))}
            </div>
          </>
        )}
        <div className="absolute top-4 left-4 flex gap-2">
          <span className={`${TYPE_COLORS[car.type]} text-white text-xs font-bold px-3 py-1 rounded-md uppercase tracking-wide`}>{car.type}</span>
          <span className="bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-md uppercase tracking-wide">Available</span>
        </div>
        <button onClick={onClose} className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white rounded-full p-2.5 transition-colors">
          <X size={20} />
        </button>
      </div>

      <div className="p-6 sm:p-7">
        <div className="flex justify-between items-start gap-4 mb-6">
          <div>
            <h2 className="text-3xl font-bold text-slate-900">{car.year} {car.make} {car.model}</h2>
            <div className="flex flex-wrap items-center gap-3 mt-2">
              {car.color && <span className="text-sm text-gray-600">{car.color}</span>}
              {location && (
                <span className="flex items-center gap-1.5 text-sm text-gray-600">
                  <MapPin size={14} /> {location}
                </span>
              )}
              <span className="flex items-center gap-1.5 text-sm text-amber-600 font-medium">
                <Star size={14} className="fill-amber-400 text-amber-400" /> 4.9 (42)
              </span>
            </div>
          </div>
          <button
            onClick={() => onToggleWishlist(car.id)}
            className={`p-3 rounded-full border transition-colors flex-shrink-0 ${
              isWishlisted ? "bg-red-50 border-red-200 text-red-600" : "border-gray-200 text-gray-500 hover:bg-red-50 hover:border-red-200 hover:text-red-600"
            }`}
          >
            <Heart size={20} className={isWishlisted ? "fill-red-500" : ""} />
          </button>
        </div>

        {stats.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-7">
            {stats.map((s, i) => (
              <div key={i} className="bg-gray-50 rounded-xl p-4">
                <div className="text-gray-500 mb-1">{s.icon}</div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{s.label}</p>
                <p className="text-base font-bold text-slate-900 mt-0.5">{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {car.description && (
          <div className="mb-7">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">About</h3>
            <p className="text-gray-700 leading-relaxed">{car.description}</p>
          </div>
        )}

        {/* ── Availability windows ── */}
        {availabilityWindows.length > 0 && (
          <div className="mb-7">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
              <Calendar size={14} /> Owner Availability
            </h3>
            <div className="flex flex-wrap gap-2">
              {availabilityWindows.map((w, i) => (
                <div key={i} className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-800 text-xs font-semibold px-3 py-2 rounded-lg">
                  <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                  <span>{formatDate(w.available_from)} – {formatDate(w.available_to)}</span>
                  {w.note && <span className="text-green-600 font-normal">· {w.note}</span>}
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
              <Info size={11} /> Bookings can only be made within these dates.
            </p>
          </div>
        )}

        {features.length > 0 && (
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Features</h3>
            <div className="flex flex-wrap gap-2">
              {features.map((f, i) => (
                <span key={i} className="bg-blue-50 text-blue-700 text-sm px-3 py-1.5 rounded-lg font-medium">{f}</span>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pt-6 border-t">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Daily Rate</p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-4xl font-bold text-slate-900">${Number(car.price_per_day).toFixed(0)}</span>
              <span className="text-sm font-medium text-gray-600">/ day</span>
            </div>
          </div>
          <button
            onClick={() => {
              if (!isAuthenticated) {
                window.location.href = '/sign-in';
                return;
              }
              onNext();
            }}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white
              px-10 py-4 rounded-md font-bold text-sm tracking-wide transition-colors active:scale-95 shadow-lg shadow-blue-500/20"
          >
            {isAuthenticated ? (<>Book Now <ArrowRight size={16} /></>) : (<>Sign In to Book <ArrowRight size={16} /></>)}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Step 2: Dates & Locations ────────────────────────────────────────────────
function BookingStep({ car, availabilityWindows, takenPeriods, onBack, onNext }: {
  car: Vehicle;
  availabilityWindows: AvailabilityWindow[];
  takenPeriods: TakenPeriod[];
  onBack: () => void;
  onNext: (data: BookingData) => void;
}) {
  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState<BookingData>({ pickup_date: "", dropoff_date: "", pickup_location: "", dropoff_location: "" });
  const [fieldError, setFieldError] = useState<string | null>(null);

  const set = <K extends keyof BookingData>(k: K, v: string) => setForm((p) => ({ ...p, [k]: v }));
  const days = form.pickup_date && form.dropoff_date ? daysBetween(form.pickup_date, form.dropoff_date) : 0;
  const total = days * car.price_per_day;

  // Compute min/max dates from availability windows
  const minDate = availabilityWindows.length > 0
    ? availabilityWindows.reduce((min, w) => w.available_from < min ? w.available_from : min, availabilityWindows[0].available_from)
    : today;
  const maxDate = availabilityWindows.length > 0
    ? availabilityWindows.reduce((max, w) => w.available_to > max ? w.available_to : max, availabilityWindows[0].available_to)
    : undefined;

  const handleNext = () => {
    if (!form.pickup_date) return setFieldError("Please select a pick-up date.");
    if (!form.dropoff_date) return setFieldError("Please select a drop-off date.");
    if (days <= 0) return setFieldError("Drop-off must be after pick-up.");
    if (!form.pickup_location.trim()) return setFieldError("Please enter a pick-up location.");
    if (!form.dropoff_location.trim()) return setFieldError("Please enter a drop-off location.");

    // Check availability windows
    if (availabilityWindows.length > 0) {
      if (!isWithinAvailability(form.pickup_date, availabilityWindows) || !isWithinAvailability(form.dropoff_date, availabilityWindows)) {
        return setFieldError("Selected dates fall outside the owner's available periods.");
      }
    }

    // Check against taken periods
    if (overlapsAnyPeriod(form.pickup_date, form.dropoff_date, takenPeriods)) {
      return setFieldError("Those dates overlap with an existing booking or blocked period. Please choose different dates.");
    }

    setFieldError(null);
    onNext(form);
  };

  return (
    <div className="p-5 sm:p-6">
      <CarThumb car={car} />

      {/* Availability hint */}
      {availabilityWindows.length > 0 && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl">
          <p className="text-xs font-bold text-green-700 mb-1.5 flex items-center gap-1.5">
            <Calendar size={12} /> Available periods
          </p>
          <div className="flex flex-col gap-1">
            {availabilityWindows.map((w, i) => (
              <p key={i} className="text-xs text-green-700">
                {formatDate(w.available_from)} → {formatDate(w.available_to)}
                {w.note && <span className="text-green-600"> · {w.note}</span>}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Blocked dates hint */}
      {takenPeriods.length > 0 && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-xs font-bold text-red-700 mb-1.5 flex items-center gap-1.5">
            <X size={12} /> Unavailable periods
          </p>
          <div className="flex flex-col gap-1 max-h-24 overflow-y-auto">
            {takenPeriods.map((t, i) => (
              <p key={i} className="text-xs text-red-600">
                {formatDate(t.from_date)} → {formatDate(t.to_date)}
                <span className="text-red-400 ml-1 capitalize">· {t.reason}</span>
              </p>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Pick-up Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400" size={14} />
              <input type="date"
                min={minDate}
                max={maxDate}
                value={form.pickup_date}
                onChange={(e) => { set("pickup_date", e.target.value); if (form.dropoff_date && e.target.value >= form.dropoff_date) set("dropoff_date", ""); }}
                className="w-full pl-9 pr-3 py-2.5 text-sm font-medium bg-gray-50 border border-gray-200 rounded-xl
                  focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Drop-off Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400" size={14} />
              <input type="date"
                min={form.pickup_date || minDate}
                max={maxDate}
                value={form.dropoff_date}
                onChange={(e) => set("dropoff_date", e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 text-sm font-medium bg-gray-50 border border-gray-200 rounded-xl
                  focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
            </div>
          </div>
        </div>

        {days > 0 && (
          <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
            <span className="text-sm font-semibold text-blue-700">{days} day{days !== 1 ? "s" : ""}</span>
            <span className="text-lg font-extrabold text-blue-700">${total.toFixed(2)}</span>
          </div>
        )}

        <div>
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Pick-up Location</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400" size={14} />
            <input type="text" placeholder="e.g. Downtown, Airport Terminal 2..."
              value={form.pickup_location} onChange={(e) => set("pickup_location", e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 text-sm font-medium bg-gray-50 border border-gray-200 rounded-xl
                focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
          </div>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Drop-off Location</label>
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
          Add Payment <ArrowRight size={15} />
        </button>
      </div>
    </div>
  );
}

// ─── Step 3: Payment ──────────────────────────────────────────────────────────
function PaymentStep({ car, booking, onBack, onNext }: {
  car: Vehicle; booking: BookingData; onBack: () => void; onNext: (data: PaymentData) => void;
}) {
  const days = daysBetween(booking.pickup_date, booking.dropoff_date);
  const subtotal = days * car.price_per_day;
  const serviceFee = parseFloat((subtotal * 0.1).toFixed(2));
  const total = subtotal + serviceFee;

  const [payment, setPayment] = useState<PaymentData>({ card_name: "", card_number: "", expiry: "", cvv: "" });
  const [fieldError, setFieldError] = useState<string | null>(null);

  const setP = <K extends keyof PaymentData>(k: K, v: string) => setPayment(p => ({ ...p, [k]: v }));

  const handleNext = () => {
    if (!payment.card_name.trim()) return setFieldError("Please enter the cardholder name.");
    const digits = payment.card_number.replace(/\s/g, "");
    if (digits.length < 16) return setFieldError("Please enter a valid 16-digit card number.");
    if (payment.expiry.length < 5) return setFieldError("Please enter a valid expiry date (MM/YY).");
    if (payment.cvv.length < 3) return setFieldError("Please enter a valid CVV.");
    setFieldError(null);
    onNext(payment);
  };

  // Card brand detection
  const cardDigits = payment.card_number.replace(/\s/g, "");
  const cardBrand = cardDigits.startsWith("4") ? "Visa"
    : cardDigits.startsWith("5") ? "Mastercard"
    : cardDigits.startsWith("3") ? "Amex"
    : null;

  return (
    <div className="p-5 sm:p-6">
      <CarThumb car={car} />

      {/* Charge notice */}
      <div className="flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-xl mb-5">
        <Lock size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700 font-medium leading-relaxed">
          Your card will <strong>not</strong> be charged now. Payment of <strong>${total.toFixed(2)}</strong> is only collected after the owner approves your booking.
        </p>
      </div>

      <div className="space-y-4">
        {/* Card number */}
        <div>
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Card Number</label>
          <div className="relative">
            <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400" size={15} />
            <input
              type="text" inputMode="numeric" placeholder="1234 5678 9012 3456"
              value={payment.card_number}
              onChange={(e) => setP("card_number", formatCardNumber(e.target.value))}
              maxLength={19}
              className="w-full pl-9 pr-20 py-2.5 text-sm font-medium bg-gray-50 border border-gray-200 rounded-xl
                focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 tracking-widest"
            />
            {cardBrand && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500 bg-white border border-gray-200 px-2 py-0.5 rounded">
                {cardBrand}
              </span>
            )}
          </div>
        </div>

        {/* Name on card */}
        <div>
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Name on Card</label>
          <input
            type="text" placeholder="John Smith"
            value={payment.card_name}
            onChange={(e) => setP("card_name", e.target.value)}
            className="w-full px-3 py-2.5 text-sm font-medium bg-gray-50 border border-gray-200 rounded-xl
              focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Expiry */}
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Expiry</label>
            <input
              type="text" inputMode="numeric" placeholder="MM/YY"
              value={payment.expiry}
              onChange={(e) => setP("expiry", formatExpiry(e.target.value, payment.expiry))}
              maxLength={5}
              className="w-full px-3 py-2.5 text-sm font-medium bg-gray-50 border border-gray-200 rounded-xl
                focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 tracking-widest"
            />
          </div>
          {/* CVV */}
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">CVV</label>
            <div className="relative">
              <input
                type="password" inputMode="numeric" placeholder="•••"
                value={payment.cvv}
                onChange={(e) => setP("cvv", e.target.value.replace(/\D/g, "").slice(0, 4))}
                maxLength={4}
                className="w-full px-3 py-2.5 text-sm font-medium bg-gray-50 border border-gray-200 rounded-xl
                  focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              />
              <Lock size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300" />
            </div>
          </div>
        </div>

        {fieldError && (
          <p className="flex items-center gap-1.5 text-sm text-red-600 font-medium">
            <AlertCircle size={14} /> {fieldError}
          </p>
        )}

        {/* Price summary */}
        <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-1.5">
          <div className="flex justify-between text-gray-600">
            <span>${car.price_per_day} × {days} day{days !== 1 ? "s" : ""}</span>
            <span className="font-semibold text-slate-800">${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Service fee (10%)</span>
            <span className="font-semibold text-slate-800">${serviceFee.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-extrabold text-slate-900 border-t border-gray-200 pt-2 mt-1">
            <span>Total due on approval</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Lock size={11} /> <span>256-bit SSL encryption · PCI DSS compliant</span>
        </div>
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

// ─── Step 4: Confirm ──────────────────────────────────────────────────────────
function ConfirmStep({ car, booking, payment, onBack, onConfirm, submitting, submitError }: {
  car: Vehicle; booking: BookingData; payment: PaymentData;
  onBack: () => void; onConfirm: () => void;
  submitting: boolean; submitError: string | null;
}) {
  const days = daysBetween(booking.pickup_date, booking.dropoff_date);
  const subtotal = days * car.price_per_day;
  const serviceFee = parseFloat((subtotal * 0.1).toFixed(2));
  const total = subtotal + serviceFee;

  const maskedCard = `•••• •••• •••• ${payment.card_number.replace(/\s/g, "").slice(-4)}`;

  const Row = ({ label, value, bold }: { label: string; value: string; bold?: boolean }) => (
    <div className={`flex justify-between items-center py-2 ${bold ? "border-t border-gray-200 pt-3 mt-1" : ""}`}>
      <span className={`text-sm ${bold ? "font-bold text-slate-900" : "text-gray-600"}`}>{label}</span>
      <span className={`text-sm ${bold ? "font-extrabold text-slate-900 text-base" : "font-semibold text-slate-800"}`}>{value}</span>
    </div>
  );

  return (
    <div className="p-5 sm:p-6">
      <h3 className="font-bold text-slate-900 text-lg mb-4">Review Your Booking</h3>
      <CarThumb car={car} />

      <div className="bg-gray-50 rounded-xl p-4 mb-4">
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

      {/* Payment method summary */}
      <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 mb-4">
        <CreditCard size={18} className="text-blue-500 flex-shrink-0" />
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Payment Method</p>
          <p className="text-sm font-semibold text-slate-900">{maskedCard}</p>
          <p className="text-xs text-gray-400">{payment.card_name}</p>
        </div>
      </div>

      <div className="bg-gray-50 rounded-xl p-4 mb-4">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Price Breakdown</p>
        <Row label={`$${car.price_per_day} × ${days} day${days !== 1 ? "s" : ""}`} value={`$${subtotal.toFixed(2)}`} />
        <Row label="Service fee (10%)" value={`$${serviceFee.toFixed(2)}`} />
        <Row label="Total" value={`$${total.toFixed(2)}`} bold />
      </div>

      <div className="flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-xl mb-4">
        <Lock size={15} className="text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700 font-medium leading-relaxed">
          Your card will not be charged until the owner approves. You can cancel for free before approval.
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
          {submitting
            ? <><Loader2 size={15} className="animate-spin" /> Confirming…</>
            : <><CheckCircle2 size={15} /> Confirm Booking · ${total.toFixed(2)}</>}
        </button>
      </div>
    </div>
  );
}

// ─── Step 5: Success ──────────────────────────────────────────────────────────
function SuccessStep({ car, booking, onClose }: { car: Vehicle; booking: BookingData; onClose: () => void }) {
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
          {[
            ["Vehicle", `${car.year} ${car.make} ${car.model}`],
            ["Duration", `${days} day${days !== 1 ? "s" : ""}`],
            ["Pick-up", formatDate(booking.pickup_date)],
            ["Drop-off", formatDate(booking.dropoff_date)],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between text-sm">
              <span className="text-gray-500">{label}</span>
              <span className="font-semibold text-slate-900">{value}</span>
            </div>
          ))}
          <div className="flex justify-between text-sm border-t border-gray-200 pt-2 mt-2">
            <span className="font-bold text-slate-900">Total (on approval)</span>
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

// ─── Detail Dialog (with booking flow) ───────────────────────────────────────
interface DetailDialogProps {
  car: Vehicle;
  isWishlisted: boolean;
  onToggleWishlist: (id: string) => void;
  onClose: () => void;
  isAuthenticated: boolean;
}

function DetailDialog({ car, isWishlisted, onToggleWishlist, onClose, isAuthenticated }: DetailDialogProps) {
  const supabase = createClient();
  const [step, setStep] = useState<Step>("details");
  const [bookingData, setBookingData] = useState<BookingData | null>(null);
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Availability & blocked dates
  const [availabilityWindows, setAvailabilityWindows] = useState<AvailabilityWindow[]>([]);
  const [takenPeriods, setTakenPeriods] = useState<TakenPeriod[]>([]);
  const [loadingAvailability, setLoadingAvailability] = useState(true);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // Load availability windows + taken periods
  useEffect(() => {
    async function load() {
      setLoadingAvailability(true);
      const [{ data: windows }, { data: taken }] = await Promise.all([
        supabase.from("vehicle_availability").select("available_from, available_to, note").eq("vehicle_id", car.id).order("available_from"),
        supabase.from("vehicle_taken_periods").select("from_date, to_date, reason").eq("vehicle_id", car.id),
      ]);
      setAvailabilityWindows(windows ?? []);
      setTakenPeriods(taken ?? []);
      setLoadingAvailability(false);
    }
    load();
  }, [car.id, supabase]);

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
    const total = parseFloat((days * car.price_per_day * 1.1).toFixed(2));

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
    if (error) setSubmitError(error.message);
    else setStep("success");
  }, [bookingData, car, supabase]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={step !== "success" ? onClose : undefined}
    >
      <div
        className="relative bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl border border-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        {step !== "details" && step !== "success" && <StepBar step={step} />}

        {step === "details" && (
          loadingAvailability
            ? <div className="flex items-center justify-center py-24"><Loader2 className="text-blue-400 animate-spin" size={32} /></div>
            : <DetailsStep car={car} isWishlisted={isWishlisted} onToggleWishlist={onToggleWishlist}
                onNext={() => setStep("booking")} onClose={onClose} isAuthenticated={isAuthenticated}
                availabilityWindows={availabilityWindows} />
        )}
        {step === "booking" && (
          <BookingStep car={car} availabilityWindows={availabilityWindows} takenPeriods={takenPeriods}
            onBack={() => setStep("details")}
            onNext={(data) => { setBookingData(data); setStep("payment"); }} />
        )}
        {step === "payment" && bookingData && (
          <PaymentStep car={car} booking={bookingData}
            onBack={() => setStep("booking")}
            onNext={(data) => { setPaymentData(data); setStep("confirm"); }} />
        )}
        {step === "confirm" && bookingData && paymentData && (
          <ConfirmStep car={car} booking={bookingData} payment={paymentData}
            onBack={() => setStep("payment")}
            onConfirm={handleConfirm} submitting={submitting} submitError={submitError} />
        )}
        {step === "success" && bookingData && (
          <SuccessStep car={car} booking={bookingData} onClose={onClose} />
        )}
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App(): JSX.Element {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("recommended");
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());
  const [selectedCar, setSelectedCar] = useState<Vehicle | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [stagedFilters, setStagedFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  const supabase = createClient();

  useEffect(() => {
    const checkAuth = () => {
      const userEmail = localStorage.getItem('user_email');
      setIsAuthenticated(!!userEmail);
    };
    checkAuth();
    window.addEventListener('storage', checkAuth);
    return () => window.removeEventListener('storage', checkAuth);
  }, []);

  const getPublicUrl = useCallback((path: string): string => {
    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    return data.publicUrl;
  }, [supabase]);

  useEffect(() => {
    async function loadVehicles(): Promise<void> {
      setLoading(true);
      setError(null);
      try {
        let query = supabase
          .from("vehicles")
          .select(`
            id, make, model, year, type, color, seating_capacity,
            drivetrain, fuel_type, top_speed_mph, range_efficiency,
            description, price_per_day, location_city, location_state, status,
            vehicle_images ( url, is_primary ),
            vehicle_features ( name )
          `)
          .eq("status", "available");

        if (filters.type !== "All") query = query.eq("type", filters.type);
        if (filters.fuelTypes.length > 0) query = query.in("fuel_type", filters.fuelTypes);
        if (filters.drivetrains.length > 0) query = query.in("drivetrain", filters.drivetrains);
        if (filters.minPrice !== "") query = query.gte("price_per_day", Number(filters.minPrice));
        if (filters.maxPrice !== "") query = query.lte("price_per_day", Number(filters.maxPrice));
        if (filters.minSeats !== "") query = query.gte("seating_capacity", Number(filters.minSeats));
        if (filters.locationCity.trim() !== "") query = query.ilike("location_city", `%${filters.locationCity.trim()}%`);

        if (sortBy === "price_asc") query = query.order("price_per_day", { ascending: true });
        else if (sortBy === "price_desc") query = query.order("price_per_day", { ascending: false });
        else query = query.order("created_at", { ascending: false });

        const { data, error: fetchError } = await query;
        if (fetchError) throw fetchError;

        const enriched: Vehicle[] = (data ?? []).map((v) => ({
          ...v,
          vehicle_images: (v.vehicle_images ?? []).map((img: VehicleImage) => ({
            ...img,
            publicUrl: resolveImageUrl(img.url, getPublicUrl),
          })),
        }));

        setVehicles(enriched);
      } catch (err) {
        const pgErr = err as PostgrestError;
        setError(pgErr?.message ?? "Failed to load vehicles.");
      } finally {
        setLoading(false);
      }
    }
    loadVehicles();
  }, [filters, sortBy, getPublicUrl]);

  const toggleWishlist = (id: string): void => {
    setWishlist((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const openFilters = () => { setStagedFilters(filters); setShowFilters(true); };
  const applyFilters = () => { setFilters(stagedFilters); setShowFilters(false); };
  const resetFilters = () => { setStagedFilters(DEFAULT_FILTERS); };
  const activeCount = countActiveFilters(filters);

  return (
    <div
      className="min-h-screen text-[#1a1a1a] pb-24"
      style={{
        background: "radial-gradient(ellipse 80% 40% at 50% -10%, #dbeafe 0%, #f8fafc 60%)",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 pt-14">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <button onClick={openFilters}
            className={`relative flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold
              text-sm border transition-all ${activeCount > 0
                ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-400/20"
                : "bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600"}`}>
            <SlidersHorizontal size={15} />
            Filters
            {activeCount > 0 && (
              <span className="ml-1 bg-white text-blue-700 text-[10px] font-black w-5 h-5
                rounded-full flex items-center justify-center leading-none">
                {activeCount}
              </span>
            )}
          </button>

          {activeCount > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {filters.type !== "All" && <Chip label={filters.type} onRemove={() => setFilters((f) => ({ ...f, type: "All" }))} />}
              {filters.fuelTypes.map((ft) => <Chip key={ft} label={ft} onRemove={() => setFilters((f) => ({ ...f, fuelTypes: f.fuelTypes.filter((x) => x !== ft) }))} />)}
              {filters.drivetrains.map((dt) => <Chip key={dt} label={dt} onRemove={() => setFilters((f) => ({ ...f, drivetrains: f.drivetrains.filter((x) => x !== dt) }))} />)}
              {filters.minPrice && <Chip label={`≥ $${filters.minPrice}`} onRemove={() => setFilters((f) => ({ ...f, minPrice: "" }))} />}
              {filters.maxPrice && <Chip label={`≤ $${filters.maxPrice}`} onRemove={() => setFilters((f) => ({ ...f, maxPrice: "" }))} />}
              {filters.minSeats && <Chip label={`${filters.minSeats}+ seats`} onRemove={() => setFilters((f) => ({ ...f, minSeats: "" }))} />}
              {filters.locationCity && <Chip label={filters.locationCity} onRemove={() => setFilters((f) => ({ ...f, locationCity: "" }))} />}
              <button onClick={() => setFilters(DEFAULT_FILTERS)} className="text-xs text-gray-400 hover:text-red-500 font-semibold underline transition-colors">Clear all</button>
            </div>
          )}

          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Sort</span>
            <div className="relative">
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="appearance-none bg-white border border-gray-200 rounded-lg pl-3 pr-9 py-2
                  text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/10 cursor-pointer">
                <option value="recommended">Recommended</option>
                <option value="price_asc">Price: Low → High</option>
                <option value="price_desc">Price: High → Low</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={13} />
            </div>
          </div>
        </div>

        {loading && (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <Loader2 size={40} className="text-blue-500 animate-spin" />
            <p className="text-gray-400 font-medium">Loading available vehicles…</p>
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="p-4 bg-red-50 rounded-2xl"><AlertCircle size={36} className="text-red-400" /></div>
            <p className="text-gray-600 font-semibold">Couldn't load vehicles</p>
            <p className="text-sm text-gray-400 max-w-xs text-center">{error}</p>
          </div>
        )}

        {!loading && !error && vehicles.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Car size={48} className="text-gray-200" />
            <p className="text-gray-500 font-semibold">No vehicles found</p>
            <p className="text-sm text-gray-400">Try adjusting your filters or check back later.</p>
            {activeCount > 0 && (
              <button onClick={() => setFilters(DEFAULT_FILTERS)} className="mt-2 text-sm text-blue-600 font-semibold hover:underline">
                Clear all filters
              </button>
            )}
          </div>
        )}

        {!loading && !error && vehicles.length > 0 && (
          <>
            <p className="text-sm text-gray-400 mb-6 font-medium">
              {vehicles.length} vehicle{vehicles.length !== 1 ? "s" : ""} available
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
              {vehicles.map((car) => (
                <VehicleCard key={car.id} car={car}
                  isWishlisted={wishlist.has(car.id)}
                  onToggleWishlist={toggleWishlist}
                  onViewDetails={setSelectedCar} />
              ))}
            </div>
          </>
        )}
      </div>

      {showFilters && (
        <FilterPanel filters={stagedFilters} onChange={setStagedFilters}
          onReset={resetFilters} onClose={applyFilters} />
      )}

      {selectedCar && (
        <DetailDialog car={selectedCar}
          isWishlisted={wishlist.has(selectedCar.id)}
          onToggleWishlist={toggleWishlist}
          onClose={() => setSelectedCar(null)}
          isAuthenticated={isAuthenticated} />
      )}
    </div>
  );
}

// ─── Chip ─────────────────────────────────────────────────────────────────────
function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="flex items-center gap-1.5 bg-blue-50 text-blue-700 text-xs font-semibold
      px-3 py-1.5 rounded-full border border-blue-200">
      {label}
      <button onClick={onRemove} className="text-blue-400 hover:text-blue-700 transition-colors">
        <X size={11} />
      </button>
    </span>
  );
}